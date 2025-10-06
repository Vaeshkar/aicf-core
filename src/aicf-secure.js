#!/usr/bin/env node

/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (c) 2025 Dennis van Leeuwen
 */

/**
 * AICF Secure - Production-ready AICF reader/writer with comprehensive security fixes
 * 
 * SECURITY FIXES IMPLEMENTED:
 * ✅ Path traversal protection - prevents ../../../etc/passwd attacks
 * ✅ Pipe injection prevention - sanitizes all pipe-delimited data
 * ✅ PII detection and redaction - GDPR/CCPA/HIPAA compliance
 * ✅ Memory exhaustion prevention - streaming for large files
 * ✅ Race condition fixes - proper filesystem-based locking
 * ✅ Input validation - comprehensive data validation
 * ✅ Error handling - graceful degradation and recovery
 * 
 * Performance improvements:
 * ✅ Constant memory usage regardless of file size
 * ✅ Streaming I/O for 1GB+ files
 * ✅ Batch processing for large datasets
 * ✅ Intelligent caching with invalidation
 * ✅ Progress callbacks for monitoring
 */

const fs = require('fs');
const path = require('path');
const AICFStreamReader = require('./aicf-stream-reader');
const AICFStreamWriter = require('./aicf-stream-writer');
const SecurityFixes = require('./security-fixes');

class AICFSecure {
  constructor(aicfDir = '.aicf', config = {}) {
    // SECURITY FIX: Validate path to prevent traversal attacks
    this.aicfDir = SecurityFixes.validatePath(aicfDir);
    
    // Security configuration
    this.config = {
      // File size thresholds
      streamingThreshold: config.streamingThreshold || 1024 * 1024, // 1MB
      maxFileSize: config.maxFileSize || 100 * 1024 * 1024, // 100MB max
      
      // PII redaction settings
      enablePIIRedaction: config.enablePIIRedaction !== false, // Default enabled
      piiRedactionMode: config.piiRedactionMode || 'mask', // mask, hash, remove, flag
      
      // Performance settings
      enableCaching: config.enableCaching !== false, // Default enabled
      cacheTimeout: config.cacheTimeout || 5 * 60 * 1000, // 5 minutes
      batchSize: config.batchSize || 1000,
      
      // Validation settings
      strictValidation: config.strictValidation !== false, // Default enabled
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 100,
      
      // Audit settings
      enableAuditLog: config.enableAuditLog !== false,
      maxAuditLogSize: config.maxAuditLogSize || 1000,
      
      ...config
    };
    
    // Initialize secure reader and writer
    this.reader = new AICFStreamReader(this.aicfDir);
    this.writer = new AICFStreamWriter(this.aicfDir);
    
    // Cache management
    this.cache = new Map();
    this.cacheTimestamps = new Map();
    
    // Audit log for security events
    this.auditLog = [];
    
    // Initialize directory
    this.ensureDirectory();
  }

  /**
   * SECURITY FIX: Ensure directory exists with proper permissions
   */
  ensureDirectory() {
    if (!fs.existsSync(this.aicfDir)) {
      fs.mkdirSync(this.aicfDir, { 
        recursive: true, 
        mode: 0o755 // Secure permissions: owner read/write/execute, group/others read/execute
      });
      
      this.logSecurityEvent('directory_created', {
        path: this.aicfDir,
        permissions: '0755'
      });
    }
  }

  /**
   * SECURE READ OPERATIONS
   */

  /**
   * Get index with security validations and caching
   */
  async getIndex() {
    const cacheKey = 'index';
    
    // Check cache first
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const index = await this.reader.getIndex();
      
      // Cache the result
      this.updateCache(cacheKey, index);
      
      return index;
    } catch (error) {
      this.logSecurityEvent('index_read_error', {
        error: error.message,
        path: this.aicfDir
      });
      throw new Error(`Failed to read index: ${error.message}`);
    }
  }

  /**
   * Get conversations with security and streaming
   */
  async getLastConversations(count = 5, options = {}) {
    // SECURITY: Validate input parameters
    if (!Number.isInteger(count) || count < 1 || count > 10000) {
      throw new Error('Invalid count: must be integer between 1 and 10000');
    }

    const {
      enablePIIFiltering = this.config.enablePIIRedaction,
      onProgress = null
    } = options;

    try {
      let conversations = await this.reader.getLastConversations(count);
      
      // SECURITY FIX: Apply PII redaction if enabled
      if (enablePIIFiltering) {
        conversations = await this.redactPIIFromConversations(conversations, { onProgress });
      }

      this.logSecurityEvent('conversations_read', {
        count: conversations.length,
        piiRedacted: enablePIIFiltering
      });

      return conversations;
    } catch (error) {
      this.logSecurityEvent('conversations_read_error', {
        error: error.message,
        count
      });
      throw new Error(`Failed to read conversations: ${error.message}`);
    }
  }

  /**
   * Search with security validations and streaming
   */
  async search(term, options = {}) {
    // SECURITY: Validate search term
    if (!term || typeof term !== 'string') {
      throw new Error('Invalid search term: must be non-empty string');
    }
    
    if (term.length < 2 || term.length > 1000) {
      throw new Error('Search term must be between 2 and 1000 characters');
    }

    // SECURITY: Sanitize search term to prevent injection
    const sanitizedTerm = SecurityFixes.sanitizePipeData(term);

    const {
      fileTypes = ['conversations', 'decisions', 'work-state', 'technical-context'],
      maxResults = 100,
      enablePIIFiltering = this.config.enablePIIRedaction,
      onProgress = null
    } = options;

    try {
      let results = await this.reader.search(sanitizedTerm, fileTypes, { 
        maxResults, 
        onProgress 
      });

      // SECURITY FIX: Apply PII redaction to results
      if (enablePIIFiltering) {
        results = await this.redactPIIFromResults(results);
      }

      this.logSecurityEvent('search_performed', {
        termLength: term.length,
        resultsCount: results.length,
        fileTypes,
        piiRedacted: enablePIIFiltering
      });

      return results;
    } catch (error) {
      this.logSecurityEvent('search_error', {
        error: error.message,
        termLength: term.length
      });
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  /**
   * SECURE WRITE OPERATIONS
   */

  /**
   * Append conversation with comprehensive security
   */
  async appendConversation(conversationData, options = {}) {
    // SECURITY: Validate input data structure
    SecurityFixes.validateConversationData(conversationData);

    const {
      enablePIIRedaction = this.config.enablePIIRedaction,
      onProgress = null,
      retries = this.config.maxRetries
    } = options;

    // SECURITY FIX: Apply PII redaction before storage
    let sanitizedData = { ...conversationData };
    if (enablePIIRedaction) {
      sanitizedData = await this.redactPIIFromConversation(sanitizedData);
    }

    // Retry logic for handling concurrent operations
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const result = await this.writer.appendConversation(sanitizedData, {
          onProgress,
          transaction: true // Ensure atomic operations
        });

        this.logSecurityEvent('conversation_added', {
          id: sanitizedData.id,
          attempt: attempt + 1,
          piiRedacted: enablePIIRedaction,
          linesWritten: result.linesWritten
        });

        // Invalidate relevant caches
        this.invalidateCache(['conversations', 'index']);

        return result;
      } catch (error) {
        if (attempt === retries - 1) {
          this.logSecurityEvent('conversation_add_failed', {
            id: conversationData.id,
            attempts: retries,
            error: error.message
          });
          throw new Error(`Failed to append conversation after ${retries} attempts: ${error.message}`);
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * (attempt + 1)));
      }
    }
  }

  /**
   * Batch append conversations with memory management
   */
  async batchAppendConversations(conversations, options = {}) {
    // SECURITY: Validate batch size
    if (!Array.isArray(conversations)) {
      throw new Error('Conversations must be an array');
    }

    if (conversations.length === 0) {
      return { success: true, processed: 0, errors: [] };
    }

    if (conversations.length > 10000) {
      throw new Error('Batch size cannot exceed 10,000 conversations');
    }

    const {
      enablePIIRedaction = this.config.enablePIIRedaction,
      batchSize = this.config.batchSize,
      onProgress = null
    } = options;

    const results = [];
    const errors = [];

    try {
      // Process in batches to prevent memory exhaustion
      for (let i = 0; i < conversations.length; i += batchSize) {
        const batch = conversations.slice(i, i + batchSize);
        
        for (const conversation of batch) {
          try {
            const result = await this.appendConversation(conversation, {
              enablePIIRedaction,
              retries: 1 // Reduced retries for batch operations
            });
            results.push(result);
          } catch (error) {
            errors.push({
              conversation: conversation.id,
              error: error.message
            });
          }
        }

        // Progress callback
        if (onProgress) {
          onProgress({
            processed: Math.min(i + batchSize, conversations.length),
            total: conversations.length,
            progress: (Math.min(i + batchSize, conversations.length) / conversations.length * 100).toFixed(2),
            errors: errors.length
          });
        }
      }

      this.logSecurityEvent('batch_append_completed', {
        total: conversations.length,
        successful: results.length,
        errors: errors.length,
        piiRedacted: enablePIIRedaction
      });

      return {
        success: true,
        processed: results.length,
        errors: errors,
        results: results
      };
    } catch (error) {
      this.logSecurityEvent('batch_append_failed', {
        total: conversations.length,
        processed: results.length,
        error: error.message
      });
      throw new Error(`Batch append failed: ${error.message}`);
    }
  }

  /**
   * PII REDACTION METHODS
   */

  /**
   * Redact PII from conversation data
   */
  async redactPIIFromConversation(conversation) {
    const redacted = { ...conversation };

    // Redact PII from messages field
    if (redacted.messages) {
      const piiResult = SecurityFixes.redactPII(redacted.messages);
      redacted.messages = piiResult.text || redacted.messages;
      
      if (piiResult.redactions && piiResult.redactions.length > 0) {
        this.logSecurityEvent('pii_redacted', {
          conversationId: conversation.id,
          redactions: piiResult.redactions,
          originalLength: piiResult.originalLength,
          redactedLength: piiResult.redactedLength
        });
      }
    }

    // Redact PII from metadata
    if (redacted.metadata && typeof redacted.metadata === 'object') {
      Object.keys(redacted.metadata).forEach(key => {
        const value = redacted.metadata[key];
        if (typeof value === 'string') {
          const piiResult = SecurityFixes.redactPII(value);
          redacted.metadata[key] = piiResult.text || value;
        }
      });
    }

    return redacted;
  }

  /**
   * Redact PII from conversations array
   */
  async redactPIIFromConversations(conversations, options = {}) {
    const { onProgress = null } = options;
    const redactedConversations = [];

    for (let i = 0; i < conversations.length; i++) {
      const redacted = await this.redactPIIFromConversation(conversations[i]);
      redactedConversations.push(redacted);

      if (onProgress && i % 10 === 0) {
        onProgress({
          processed: i + 1,
          total: conversations.length,
          progress: ((i + 1) / conversations.length * 100).toFixed(2)
        });
      }
    }

    return redactedConversations;
  }

  /**
   * Redact PII from search results
   */
  async redactPIIFromResults(results) {
    return results.map(result => {
      const redacted = { ...result };
      
      if (redacted.content) {
        const piiResult = SecurityFixes.redactPII(redacted.content);
        redacted.content = piiResult.text || redacted.content;
      }
      
      if (redacted.context) {
        const piiResult = SecurityFixes.redactPII(redacted.context);
        redacted.context = piiResult.text || redacted.context;
      }

      return redacted;
    });
  }

  /**
   * CACHE MANAGEMENT
   */

  /**
   * Check if cache is valid
   */
  isCacheValid(key) {
    if (!this.config.enableCaching) return false;
    
    const cached = this.cache.get(key);
    const timestamp = this.cacheTimestamps.get(key);
    
    if (!cached || !timestamp) return false;
    
    return (Date.now() - timestamp) < this.config.cacheTimeout;
  }

  /**
   * Update cache
   */
  updateCache(key, value) {
    if (!this.config.enableCaching) return;
    
    this.cache.set(key, value);
    this.cacheTimestamps.set(key, Date.now());
  }

  /**
   * Invalidate cache entries
   */
  invalidateCache(keys = []) {
    if (!this.config.enableCaching) return;
    
    keys.forEach(key => {
      this.cache.delete(key);
      this.cacheTimestamps.delete(key);
    });
  }

  /**
   * AUDIT AND MONITORING
   */

  /**
   * Log security event for audit purposes
   */
  logSecurityEvent(eventType, data = {}) {
    if (!this.config.enableAuditLog) return;

    const event = {
      timestamp: new Date().toISOString(),
      type: eventType,
      data: data,
      process: process.pid,
      user: process.env.USER || 'unknown'
    };

    this.auditLog.push(event);

    // Keep audit log manageable
    if (this.auditLog.length > this.config.maxAuditLogSize) {
      this.auditLog = this.auditLog.slice(-this.config.maxAuditLogSize);
    }

    // Log critical events to console
    if (['path_traversal_blocked', 'pii_detected', 'unauthorized_access'].includes(eventType)) {
      console.warn(`🔒 Security Event [${eventType}]:`, data);
    }
  }

  /**
   * Get audit log for compliance reporting
   */
  getAuditLog(limit = 100, eventTypes = []) {
    let logs = this.auditLog.slice(-limit);
    
    if (eventTypes.length > 0) {
      logs = logs.filter(log => eventTypes.includes(log.type));
    }
    
    return logs;
  }

  /**
   * Get security health check
   */
  getSecurityStatus() {
    const recentEvents = this.auditLog.slice(-100);
    const eventCounts = {};
    
    recentEvents.forEach(event => {
      eventCounts[event.type] = (eventCounts[event.type] || 0) + 1;
    });

    return {
      timestamp: new Date().toISOString(),
      auditLogSize: this.auditLog.length,
      recentEvents: eventCounts,
      cacheSize: this.cache.size,
      config: {
        piiRedactionEnabled: this.config.enablePIIRedaction,
        streamingThreshold: this.config.streamingThreshold,
        strictValidation: this.config.strictValidation,
        auditLogging: this.config.enableAuditLog
      },
      status: this.calculateSecurityScore(eventCounts)
    };
  }

  /**
   * Calculate security score based on recent events
   */
  calculateSecurityScore(eventCounts) {
    let score = 100;
    
    // Deduct points for security issues
    if (eventCounts.path_traversal_blocked) score -= 20;
    if (eventCounts.unauthorized_access) score -= 30;
    if (eventCounts.pii_detected) score -= 10;
    if (eventCounts.search_error) score -= 5;
    if (eventCounts.conversation_add_failed) score -= 5;

    // Add points for good security practices
    if (eventCounts.pii_redacted) score += 5;
    if (eventCounts.directory_created) score += 5;

    return {
      score: Math.max(0, Math.min(100, score)),
      level: score >= 80 ? 'GOOD' : score >= 60 ? 'FAIR' : 'POOR'
    };
  }

  /**
   * UTILITY METHODS
   */

  /**
   * Test security implementation
   */
  static async runSecurityTests() {
    console.log('🔒 Running AICF Security Tests...\n');

    const testDir = '.aicf-test';
    const aicf = new AICFSecure(testDir, {
      enablePIIRedaction: true,
      enableAuditLog: true
    });

    const tests = [
      {
        name: 'Path Traversal Protection',
        test: async () => {
          try {
            new AICFSecure('../../../etc/passwd');
            return { success: false, message: 'Path traversal not blocked' };
          } catch (error) {
            return { success: true, message: 'Path traversal blocked successfully' };
          }
        }
      },
      {
        name: 'PII Redaction',
        test: async () => {
          const testConversation = {
            id: 'test_001',
            messages: 'My SSN is 123-45-6789 and email is john@example.com',
            tokens: 20,
            timestamp_start: '2025-01-06T12:00:00Z',
            timestamp_end: '2025-01-06T12:01:00Z'
          };

          const redacted = await aicf.redactPIIFromConversation(testConversation);
          const hasPII = redacted.messages.includes('123-45-6789') || redacted.messages.includes('john@example.com');
          
          return {
            success: !hasPII,
            message: hasPII ? 'PII not properly redacted' : 'PII redacted successfully',
            before: testConversation.messages,
            after: redacted.messages
          };
        }
      },
      {
        name: 'Input Validation',
        test: async () => {
          try {
            await aicf.appendConversation({ invalid: 'data' });
            return { success: false, message: 'Invalid data accepted' };
          } catch (error) {
            return { success: true, message: 'Invalid data rejected successfully' };
          }
        }
      }
    ];

    for (const test of tests) {
      try {
        const result = await test.test();
        console.log(`${result.success ? '✅' : '❌'} ${test.name}: ${result.message}`);
        if (result.before && result.after) {
          console.log(`   Before: ${result.before}`);
          console.log(`   After:  ${result.after}`);
        }
      } catch (error) {
        console.log(`❌ ${test.name}: Error - ${error.message}`);
      }
      console.log();
    }

    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }

    const status = aicf.getSecurityStatus();
    console.log('🏆 Security Status:', status.status);
    console.log('📊 Recent Events:', status.recentEvents);

    return aicf;
  }
}

module.exports = AICFSecure;

// Export for command-line testing
if (require.main === module) {
  AICFSecure.runSecurityTests();
}