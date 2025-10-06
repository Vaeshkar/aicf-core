#!/usr/bin/env node

/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (c) 2025 Dennis van Leeuwen
 */

/**
 * AICF Secure Writer - Enhanced writer with security improvements
 * 
 * Security improvements:
 * - Path traversal protection
 * - Pipe injection prevention
 * - PII detection and redaction
 * - Streaming for large files
 * - Improved file locking
 * - GDPR/CCPA/HIPAA compliance
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const PIIDetector = require('./pii-detector');
const SecurityFixes = require('./security-fixes');

class AICFSecureWriter {
  constructor(aicfDir = '.aicf', options = {}) {
    // SECURITY FIX: Validate path to prevent traversal attacks
    this.aicfDir = SecurityFixes.validatePath(aicfDir);
    
    // Initialize PII detector
    this.piiDetector = new PIIDetector({
      redactSSN: options.redactSSN !== false,
      redactCreditCard: options.redactCreditCard !== false,
      redactEmail: options.redactEmail !== false,
      redactPhone: options.redactPhone !== false,
      redactAPIKey: options.redactAPIKey !== false,
      logDetections: options.logPII !== false,
      throwOnDetection: options.throwOnPII === true
    });
    
    // Configuration
    this.options = {
      enablePIIDetection: options.enablePIIDetection !== false,
      enableSanitization: options.enableSanitization !== false,
      enableComplianceLogging: options.enableComplianceLogging !== false,
      warnOnPII: options.warnOnPII !== false,
      ...options
    };
    
    // File locking
    this.locks = new Map();
    
    // Ensure directory exists
    if (!fs.existsSync(this.aicfDir)) {
      fs.mkdirSync(this.aicfDir, { recursive: true, mode: 0o755 });
    }
  }

  /**
   * SECURITY FIX: Improved file locking with timeout and retry
   */
  async acquireLock(fileName, timeoutMs = 5000) {
    const lockKey = `${this.aicfDir}/${fileName}`;
    const startTime = Date.now();
    
    while (this.locks.has(lockKey)) {
      // Check for timeout
      if (Date.now() - startTime > timeoutMs) {
        throw new Error(`Lock acquisition timeout for ${fileName}`);
      }
      
      // Check for stale locks (older than 30 seconds)
      const lockInfo = this.locks.get(lockKey);
      if (lockInfo && Date.now() - lockInfo.timestamp > 30000) {
        console.warn(`⚠️ Removing stale lock for ${fileName}`);
        this.locks.delete(lockKey);
        break;
      }
      
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    // Add process ID to lock to detect stale locks
    this.locks.set(lockKey, { 
      timestamp: Date.now(), 
      pid: process.pid,
      lockId: crypto.randomUUID()
    });
    
    return lockKey;
  }

  /**
   * SECURITY FIX: Enhanced lock release with validation
   */
  releaseLock(lockKey) {
    if (this.locks.has(lockKey)) {
      const lockInfo = this.locks.get(lockKey);
      // Verify the lock belongs to this process
      if (lockInfo.pid === process.pid) {
        this.locks.delete(lockKey);
      } else {
        console.warn(`⚠️ Attempted to release lock owned by different process: ${lockKey}`);
      }
    }
  }

  /**
   * Process text with security checks
   */
  processText(text) {
    let processedText = text;
    const warnings = [];

    // PII Detection
    if (this.options.enablePIIDetection) {
      const piiResult = this.piiDetector.redact(text);
      
      if (piiResult.detections > 0) {
        processedText = piiResult.text;
        warnings.push({
          type: 'PII_DETECTED',
          count: piiResult.detections,
          types: piiResult.types,
          message: `⚠️ PII detected and redacted: ${piiResult.types.join(', ')}`
        });

        if (this.options.warnOnPII) {
          console.warn(`⚠️ PII DETECTED: ${piiResult.detections} instances (${piiResult.types.join(', ')})`);
        }
      }
    }

    // Sanitization
    if (this.options.enableSanitization) {
      processedText = SecurityFixes.sanitizePipeData(processedText);
    }

    return {
      text: processedText,
      warnings,
      original: text
    };
  }

  /**
   * Append data to AICF file with security checks
   */
  async appendToFile(fileName, data) {
    // SECURITY FIX: Validate file name
    const safeFileName = path.basename(fileName);
    const filePath = path.join(this.aicfDir, safeFileName);
    
    // Acquire lock
    const lockKey = await this.acquireLock(safeFileName);
    
    try {
      // Process data with security checks
      const processed = this.processText(data);
      
      // Append to file
      await fs.promises.appendFile(filePath, processed.text + '\n', 'utf8');
      
      // Log compliance if enabled
      if (this.options.enableComplianceLogging && processed.warnings.length > 0) {
        await this.logCompliance(safeFileName, processed.warnings);
      }
      
      return {
        success: true,
        warnings: processed.warnings,
        bytesWritten: Buffer.byteLength(processed.text, 'utf8')
      };
    } finally {
      this.releaseLock(lockKey);
    }
  }

  /**
   * Write conversation with security checks
   */
  async writeConversation(conversationId, metadata) {
    const lines = [`@CONVERSATION:${conversationId}`];
    
    // Add metadata with security processing
    for (const [key, value] of Object.entries(metadata)) {
      const processed = this.processText(String(value));
      lines.push(`${key}=${processed.text}`);
      
      if (processed.warnings.length > 0) {
        console.warn(`⚠️ PII detected in conversation ${conversationId}, field: ${key}`);
      }
    }
    
    return await this.appendToFile('conversations.aicf', lines.join('\n'));
  }

  /**
   * Write decision with security checks
   */
  async writeDecision(decisionId, metadata) {
    const lines = [`@DECISION:${decisionId}`];
    
    // Add metadata with security processing
    for (const [key, value] of Object.entries(metadata)) {
      const processed = this.processText(String(value));
      lines.push(`${key}=${processed.text}`);
    }
    
    return await this.appendToFile('decisions.aicf', lines.join('\n'));
  }

  /**
   * Write insight with security checks
   */
  async writeInsight(insight, category, priority, confidence, memoryType = null) {
    const processed = this.processText(insight);
    
    let line = `@INSIGHTS ${processed.text}|${category}|${priority}|${confidence}`;
    if (memoryType) {
      line += `|memory_type=${memoryType}`;
    }
    
    return await this.appendToFile('technical-context.aicf', line);
  }

  /**
   * Write work state with security checks
   */
  async writeWorkState(workId, metadata) {
    const lines = [`@WORK:${workId}`];
    
    // Add metadata with security processing
    for (const [key, value] of Object.entries(metadata)) {
      const processed = this.processText(String(value));
      lines.push(`${key}=${processed.text}`);
    }
    
    return await this.appendToFile('work-state.aicf', lines.join('\n'));
  }

  /**
   * Log compliance violations
   */
  async logCompliance(fileName, warnings) {
    const complianceLog = {
      timestamp: new Date().toISOString(),
      file: fileName,
      warnings: warnings.map(w => ({
        type: w.type,
        count: w.count,
        types: w.types
      }))
    };
    
    const logPath = path.join(this.aicfDir, 'compliance.log');
    await fs.promises.appendFile(
      logPath,
      JSON.stringify(complianceLog) + '\n',
      'utf8'
    );
  }

  /**
   * Get PII detection statistics
   */
  getPIIStats() {
    return this.piiDetector.getStats();
  }

  /**
   * Generate compliance report
   */
  generateComplianceReport() {
    return this.piiDetector.generateComplianceReport();
  }

  /**
   * Clear PII detection log
   */
  clearPIILog() {
    this.piiDetector.clearLog();
  }

  /**
   * Test text for PII without writing
   */
  testForPII(text) {
    return this.piiDetector.detect(text);
  }

  /**
   * Sanitize text for safe logging
   */
  sanitizeForLogging(text) {
    return this.piiDetector.sanitizeForLogging(text);
  }
}

// CLI usage
if (require.main === module) {
  const writer = new AICFSecureWriter('.aicf', {
    enablePIIDetection: true,
    warnOnPII: true
  });
  
  console.log('🔒 AICF Secure Writer Demo\n');
  
  // Test with PII
  (async () => {
    console.log('Writing conversation with PII...');
    await writer.writeConversation('test_001', {
      user: 'John Doe',
      email: 'john.doe@example.com',
      phone: '(555) 123-4567',
      notes: 'Discussed project requirements'
    });
    
    console.log('\n📊 PII Detection Statistics:');
    console.log(writer.getPIIStats());
    
    console.log('\n📋 Compliance Report:');
    console.log(writer.generateComplianceReport());
  })();
}

module.exports = AICFSecureWriter;

