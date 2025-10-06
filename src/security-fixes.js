#!/usr/bin/env node

/**
 * AICF Security Fixes Implementation
 * Addresses critical vulnerabilities identified in the security analysis
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class AICFSecurityFixes {
  /**
   * Path validation to prevent directory traversal attacks
   */
  static validatePath(inputPath, projectRoot = process.cwd()) {
    if (!inputPath || typeof inputPath !== 'string') {
      throw new Error('Invalid path: must be a non-empty string');
    }

    // Resolve the absolute path
    const normalizedPath = path.resolve(inputPath);
    const normalizedRoot = path.resolve(projectRoot);

    // Ensure the path is within the project root
    if (!normalizedPath.startsWith(normalizedRoot)) {
      throw new Error(`Security violation: Path '${inputPath}' is outside project root '${projectRoot}'`);
    }

    // Additional checks for common attack patterns
    const dangerousPatterns = [
      /\.\.[\/\\]/,           // Directory traversal
      /^[\/\\]/,              // Absolute paths
      /[<>:|"*?]/,            // Invalid filename characters
      /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i // Windows reserved names
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(inputPath)) {
        throw new Error(`Security violation: Path contains dangerous pattern: ${inputPath}`);
      }
    }

    return normalizedPath;
  }

  /**
   * Sanitize pipe-delimited data to prevent injection attacks
   */
  static sanitizePipeData(input) {
    if (input === null || input === undefined) {
      return '';
    }

    if (typeof input !== 'string') {
      input = String(input);
    }

    return input
      // Escape pipe characters
      .replace(/\|/g, '\\|')
      // Escape newlines and carriage returns
      .replace(/\r?\n/g, '\\n')
      .replace(/\r/g, '\\r')
      // Escape AICF section markers
      .replace(/@([A-Z_]+):/g, '\\@$1:')
      .replace(/@([A-Z_]+)$/g, '\\@$1')
      // Remove null bytes and other control characters
      .replace(/[\x00-\x1F\x7F]/g, '')
      // Limit length to prevent buffer overflow
      .slice(0, 10000);
  }

  /**
   * PII detection and redaction
   */
  static redactPII(text) {
    if (!text || typeof text !== 'string') {
      return text;
    }

    const piiPatterns = {
      creditCard: {
        pattern: /\b(?:\d{4}[\s-]?){3}\d{4}\b/g,
        replacement: '[REDACTED-CREDIT-CARD]'
      },
      ssn: {
        pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
        replacement: '[REDACTED-SSN]'
      },
      email: {
        pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        replacement: '[REDACTED-EMAIL]'
      },
      phone: {
        pattern: /\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g,
        replacement: '[REDACTED-PHONE]'
      },
      apiKey: {
        pattern: /\b[A-Za-z0-9]{20,}\b/g,
        replacement: '[REDACTED-API-KEY]'
      },
      ipAddress: {
        pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
        replacement: '[REDACTED-IP]'
      }
    };

    let redactedText = text;
    const redactionLog = [];

    for (const [type, {pattern, replacement}] of Object.entries(piiPatterns)) {
      const matches = text.match(pattern);
      if (matches) {
        redactionLog.push({ type, count: matches.length });
        redactedText = redactedText.replace(pattern, replacement);
      }
    }

    return {
      text: redactedText,
      redactions: redactionLog,
      originalLength: text.length,
      redactedLength: redactedText.length
    };
  }

  /**
   * Validate conversation data structure
   */
  static validateConversationData(data) {
    const schema = {
      id: { type: 'string', required: true, maxLength: 100 },
      messages: { type: 'number', min: 0, max: 100000 },
      tokens: { type: 'number', min: 0, max: 10000000 },
      timestamp_start: { type: 'string', pattern: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/ },
      timestamp_end: { type: 'string', pattern: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/ },
      metadata: { type: 'object', maxSize: 1000000 } // 1MB limit
    };

    const errors = [];

    for (const [field, rules] of Object.entries(schema)) {
      const value = data[field];

      if (rules.required && (value === undefined || value === null)) {
        errors.push(`Required field '${field}' is missing`);
        continue;
      }

      if (value !== undefined && value !== null) {
        // Type validation
        if (rules.type === 'string' && typeof value !== 'string') {
          errors.push(`Field '${field}' must be a string`);
        } else if (rules.type === 'number' && typeof value !== 'number') {
          errors.push(`Field '${field}' must be a number`);
        } else if (rules.type === 'object' && typeof value !== 'object') {
          errors.push(`Field '${field}' must be an object`);
        }

        // Range validation
        if (rules.min !== undefined && value < rules.min) {
          errors.push(`Field '${field}' must be >= ${rules.min}`);
        }
        if (rules.max !== undefined && value > rules.max) {
          errors.push(`Field '${field}' must be <= ${rules.max}`);
        }

        // Length validation
        if (rules.maxLength !== undefined && value.length > rules.maxLength) {
          errors.push(`Field '${field}' exceeds maximum length of ${rules.maxLength}`);
        }

        // Size validation for objects
        if (rules.maxSize !== undefined && typeof value === 'object') {
          const size = JSON.stringify(value).length;
          if (size > rules.maxSize) {
            errors.push(`Field '${field}' exceeds maximum size of ${rules.maxSize} bytes`);
          }
        }

        // Pattern validation
        if (rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
          errors.push(`Field '${field}' does not match required pattern`);
        }
      }
    }

    if (errors.length > 0) {
      throw new Error(`Validation errors: ${errors.join(', ')}`);
    }

    return true;
  }

  /**
   * Safe atomic file operations with proper locking
   */
  static async atomicFileOperation(filePath, operation) {
    const lockFile = `${filePath}.lock`;
    const tempFile = `${filePath}.tmp.${Date.now()}.${process.pid}`;
    
    // Implement proper file locking
    let lockfd;
    try {
      // Try to create lock file exclusively
      lockfd = fs.openSync(lockFile, 'wx');
      
      // Perform the operation with temp file
      const result = await operation(tempFile);
      
      // Atomically move temp file to target
      fs.renameSync(tempFile, filePath);
      
      return result;
      
    } catch (error) {
      // Clean up temp file if it exists
      try {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      
      throw error;
    } finally {
      // Release lock
      if (lockfd) {
        try {
          fs.closeSync(lockfd);
          fs.unlinkSync(lockFile);
        } catch (unlockError) {
          // Ignore unlock errors
        }
      }
    }
  }

  /**
   * Memory-efficient file reading for large files
   */
  static async readFileStream(filePath, callback) {
    return new Promise((resolve, reject) => {
      const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
      let buffer = '';
      let lineNumber = 0;
      const results = [];

      stream.on('data', (chunk) => {
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep incomplete line in buffer

        for (const line of lines) {
          lineNumber++;
          const result = callback(line, lineNumber);
          if (result) {
            results.push(result);
          }
        }
      });

      stream.on('end', () => {
        // Process final line if exists
        if (buffer.trim()) {
          lineNumber++;
          const result = callback(buffer, lineNumber);
          if (result) {
            results.push(result);
          }
        }
        resolve(results);
      });

      stream.on('error', reject);
    });
  }

  /**
   * Rate limiting for write operations
   */
  static createRateLimiter(maxOperations = 100, windowMs = 60000) {
    const operations = [];

    return function rateLimited(operation) {
      const now = Date.now();
      
      // Remove old operations outside the window
      while (operations.length > 0 && operations[0] < now - windowMs) {
        operations.shift();
      }

      // Check if we've exceeded the limit
      if (operations.length >= maxOperations) {
        throw new Error(`Rate limit exceeded: ${maxOperations} operations per ${windowMs}ms`);
      }

      // Record this operation
      operations.push(now);
      
      return operation();
    };
  }

  /**
   * Checksum validation for data integrity
   */
  static calculateChecksum(data) {
    return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
  }

  static verifyChecksum(data, expectedChecksum) {
    const actualChecksum = this.calculateChecksum(data);
    return actualChecksum === expectedChecksum;
  }

  /**
   * Secure configuration validation
   */
  static validateConfig(config) {
    const secureDefaults = {
      maxFileSize: 100 * 1024 * 1024,      // 100MB
      maxMemoryUsage: 500 * 1024 * 1024,   // 500MB
      enablePIIRedaction: true,
      enablePathValidation: true,
      enableRateLimit: true,
      rateLimitOperations: 100,
      rateLimitWindow: 60000,
      allowedExtensions: ['.aicf'],
      maxStringLength: 10000,
      maxObjectSize: 1000000
    };

    return { ...secureDefaults, ...config };
  }
}

// Export security utilities for use in main AICF classes
module.exports = AICFSecurityFixes;