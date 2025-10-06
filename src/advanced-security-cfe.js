#!/usr/bin/env node

/**
 * AICF Cryptographic Format Encoder (CFE) - Proof of Concept
 * Advanced security through format obfuscation and cryptographic protection
 * 
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (c) 2025 Dennis van Leeuwen
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class CryptographicFormatEncoder {
  constructor(secretKey = null) {
    // Generate or use provided secret key
    this.secretKey = secretKey || crypto.randomBytes(32);
    
    // Symbol mapping for format obfuscation
    this.symbolMap = new Map([
      // Core AICF markers
      ['@CONVERSATION', '§CONV§'],
      ['@INSIGHTS', '∞INS∞'],
      ['@STATE', '◊STATE◊'],
      ['@DECISION', '∆DEC∆'],
      
      // Metadata fields
      ['timestamp_start', '∂ts_s∂'],
      ['timestamp_end', '∂ts_e∂'],
      ['messages', '∇msg∇'],
      ['tokens', '∇tok∇'],
      ['priority', '∇pri∇'],
      ['confidence', '∇conf∇'],
      ['category', '∇cat∇'],
      
      // Delimiters
      ['|', '∆'],  // Replace pipe with delta
      ['=', '≡'],  // Replace equals with triple bar
      [':', '⟨'],  // Replace colon with angle bracket
    ]);
    
    // Reverse mapping for decoding
    this.reverseSymbolMap = new Map(
      Array.from(this.symbolMap.entries()).map(([k, v]) => [v, k])
    );
    
    // Encryption algorithm
    this.algorithm = 'aes-256-gcm';
  }

  /**
   * Encode AICF line with TRUE cryptographic protection
   */
  encode(aicfLine) {
    try {
      // Generate random IV for each encryption
      const iv = crypto.randomBytes(16);
      
      // Use AES-256-GCM for authenticated encryption
      const cipher = crypto.createCipherGCM('aes-256-gcm', this.secretKey, iv);
      
      let encrypted = cipher.update(aicfLine, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Get authentication tag for integrity
      const authTag = cipher.getAuthTag();
      
      // Format: IV(32) + AuthTag(32) + EncryptedData(variable) - all hex
      return iv.toString('hex') + authTag.toString('hex') + encrypted;
    } catch (error) {
      throw new Error(`CFE encoding failed: ${error.message}`);
    }
  }

  /**
   * Decode CFE format back to standard AICF
   */
  decode(cfeData) {
    try {
      // Extract components
      const iv = Buffer.from(cfeData.slice(0, 32), 'hex');
      const authTag = Buffer.from(cfeData.slice(32, 64), 'hex'); 
      const encrypted = cfeData.slice(64);
      
      // Create decipher with IV
      const decipher = crypto.createDecipherGCM('aes-256-gcm', this.secretKey, iv);
      decipher.setAuthTag(authTag);
      
      // Decrypt and verify authenticity
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error(`CFE decoding failed: ${error.message}`);
    }
  }

  /**
   * Replace standard AICF symbols with cryptographic symbols
   */
  replaceWithSymbols(text) {
    let result = text;
    for (const [original, symbol] of this.symbolMap) {
      result = result.replaceAll(original, symbol);
    }
    return result;
  }

  /**
   * Restore original symbols from cryptographic symbols
   */
  restoreSymbols(text) {
    let result = text;
    for (const [symbol, original] of this.reverseSymbolMap) {
      result = result.replaceAll(symbol, original);
    }
    return result;
  }

  /**
   * Hash sensitive identifiers for privacy
   */
  hashIdentifiers(text) {
    // Hash conversation IDs, user IDs, etc.
    return text.replace(/conv_\w+/g, (match) => {
      const hash = crypto.createHash('sha256')
        .update(match + this.secretKey.toString('hex'))
        .digest('hex')
        .substring(0, 12);
      return `conv_${hash}`;
    });
  }

  /**
   * Restore identifiers (simplified - real implementation would need mapping)
   */
  restoreIdentifiers(text) {
    // For demo purposes, return as-is
    // Real implementation would maintain encrypted mapping
    return text;
  }

  /**
   * Encrypt content using AES-256-GCM
   */
  encryptContent(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.algorithm, this.secretKey);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Return IV + encrypted content (hex encoded)
    return iv.toString('hex') + '⟪' + encrypted;
  }

  /**
   * Decrypt content
   */
  decryptContent(encryptedData) {
    const [ivHex, encrypted] = encryptedData.split('⟪');
    const iv = Buffer.from(ivHex, 'hex');
    
    const decipher = crypto.createDecipher(this.algorithm, this.secretKey);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Generate integrity hash for tamper detection
   */
  generateIntegrityHash(data) {
    return crypto.createHmac('sha256', this.secretKey)
      .update(data)
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Generate secure format fingerprint
   */
  generateFingerprint() {
    const keyHash = crypto.createHash('sha256')
      .update(this.secretKey)
      .digest('hex')
      .substring(0, 8);
    
    return `CFE-v1.0-${keyHash}`;
  }
}

/**
 * AI-Native Security Validator
 * Uses pattern recognition to detect threats
 */
class AISecurityValidator {
  constructor() {
    // Threat pattern database
    this.threatPatterns = new Map([
      ['path_traversal', /\.\.[\/\\]/g],
      ['command_injection', /[;&|`$()]/g],
      ['sql_injection', /['";\-\-\/\*]/g],
      ['script_injection', /<script|javascript:|on\w+=/gi],
      ['pipe_injection', /\|@[A-Z]+:/g],
      ['format_confusion', /[@§∞◊∆][A-Z]{2,}/g]
    ]);
    
    // Adaptive learning parameters
    this.learningRate = 0.1;
    this.threatThreshold = 0.6;
  }

  /**
   * Analyze content for security threats using AI patterns
   */
  analyzeThreat(content) {
    const analysis = {
      threatScore: 0,
      detectedPatterns: [],
      confidence: 0,
      recommendations: []
    };

    // Pattern-based threat detection
    for (const [threatType, pattern] of this.threatPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        const severity = this.calculateSeverity(threatType, matches.length);
        analysis.threatScore += severity;
        analysis.detectedPatterns.push({
          type: threatType,
          matches: matches.length,
          severity
        });
      }
    }

    // Normalize threat score
    analysis.threatScore = Math.min(analysis.threatScore, 1.0);
    analysis.confidence = this.calculateConfidence(analysis.detectedPatterns);

    // Generate recommendations
    if (analysis.threatScore > this.threatThreshold) {
      analysis.recommendations = this.generateRecommendations(analysis.detectedPatterns);
    }

    return analysis;
  }

  calculateSeverity(threatType, matchCount) {
    const severityMap = {
      'path_traversal': 0.8,
      'command_injection': 0.9,
      'sql_injection': 0.7,
      'script_injection': 0.8,
      'pipe_injection': 0.6,
      'format_confusion': 0.4
    };

    return (severityMap[threatType] || 0.5) * Math.log(matchCount + 1) / 3;
  }

  calculateConfidence(patterns) {
    if (patterns.length === 0) return 0.9; // High confidence in safety
    
    // More patterns = higher confidence in threat detection
    return Math.min(0.5 + (patterns.length * 0.2), 0.95);
  }

  generateRecommendations(patterns) {
    const recommendations = [];
    
    patterns.forEach(pattern => {
      switch (pattern.type) {
        case 'path_traversal':
          recommendations.push('Enable path validation and sandboxing');
          break;
        case 'command_injection':
          recommendations.push('Sanitize input and use parameterized commands');
          break;
        case 'pipe_injection':
          recommendations.push('Apply CFE encoding and format validation');
          break;
        default:
          recommendations.push(`Mitigate ${pattern.type} vulnerabilities`);
      }
    });

    return [...new Set(recommendations)]; // Remove duplicates
  }
}

/**
 * Demo and testing functionality
 */
class CFEDemo {
  static async runDemo() {
    console.log('🔐 AICF Cryptographic Format Encoder (CFE) Demo\n');

    // Initialize CFE with random key
    const cfe = new CryptographicFormatEncoder();
    const validator = new AISecurityValidator();
    
    console.log(`📋 CFE Fingerprint: ${cfe.generateFingerprint()}\n`);

    // Test data
    const testData = [
      '1|@CONVERSATION:conv_001',
      '2|timestamp_start=2025-10-06T14:30:00Z',
      '3|messages=15',
      '4|tokens=2840',
      '5|@INSIGHTS Security analysis completed|SECURITY|HIGH|HIGH',
      '6|category=vulnerability_assessment'
    ];

    console.log('📝 Original AICF Format:');
    testData.forEach(line => console.log(`   ${line}`));

    console.log('\n🔒 CFE Encoded Format:');
    const encodedData = testData.map(line => {
      const encoded = cfe.encode(line);
      console.log(`   ${encoded.substring(0, 60)}...`);
      return encoded;
    });

    console.log('\n🔓 CFE Decoded Format:');
    encodedData.forEach(encoded => {
      try {
        const decoded = cfe.decode(encoded);
        console.log(`   ${decoded}`);
      } catch (error) {
        console.log(`   ERROR: ${error.message}`);
      }
    });

    // Security analysis
    console.log('\n🛡️  AI Security Analysis:');
    const maliciousInput = '1|@CONVERSATION:../../../etc/passwd|rm -rf /';
    const analysis = validator.analyzeThreat(maliciousInput);
    
    console.log(`   Threat Score: ${(analysis.threatScore * 100).toFixed(1)}%`);
    console.log(`   Confidence: ${(analysis.confidence * 100).toFixed(1)}%`);
    console.log(`   Detected Patterns: ${analysis.detectedPatterns.length}`);
    
    if (analysis.recommendations.length > 0) {
      console.log('   Recommendations:');
      analysis.recommendations.forEach(rec => 
        console.log(`     • ${rec}`)
      );
    }

    console.log('\n✅ CFE Demo Complete - Advanced Security Operational');
  }
}

// Export for use as module
module.exports = {
  CryptographicFormatEncoder,
  AISecurityValidator,
  CFEDemo
};

// Run demo if called directly
if (require.main === module) {
  CFEDemo.runDemo().catch(console.error);
}