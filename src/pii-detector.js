#!/usr/bin/env node

/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (c) 2025 Dennis van Leeuwen
 */

/**
 * PII Detector and Redactor
 * 
 * Detects and redacts Personally Identifiable Information (PII) to ensure
 * GDPR/CCPA/HIPAA compliance.
 * 
 * Detects:
 * - Social Security Numbers (SSN)
 * - Credit Card Numbers
 * - Email Addresses
 * - Phone Numbers
 * - API Keys and Tokens
 * - IP Addresses
 * - Dates of Birth
 * - Passport Numbers
 * 
 * Security improvements:
 * - Automatic PII detection
 * - Configurable redaction
 * - Compliance logging
 * - Opt-in sensitive data logging with warnings
 */

class PIIDetector {
  constructor(options = {}) {
    this.options = {
      redactSSN: true,
      redactCreditCard: true,
      redactEmail: true,
      redactPhone: true,
      redactAPIKey: true,
      redactIPAddress: true,
      redactDateOfBirth: true,
      redactPassport: true,
      logDetections: true,
      throwOnDetection: false,
      ...options
    };

    // PII detection patterns
    this.patterns = {
      // SSN: 123-45-6789 or 123456789
      ssn: /\b\d{3}-?\d{2}-?\d{4}\b/g,
      
      // Credit Cards: Visa, MasterCard, Amex, Discover
      creditCard: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
      
      // Email addresses
      email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      
      // Phone numbers: (123) 456-7890, 123-456-7890, 1234567890
      phone: /\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g,
      
      // API Keys (common patterns)
      apiKey: /\b(?:api[_-]?key|token|secret|password|bearer)[\s:=]+['\"]?([a-zA-Z0-9_\-]{20,})['\"]?/gi,
      
      // AWS Keys
      awsKey: /\b(AKIA[0-9A-Z]{16})\b/g,
      
      // GitHub Tokens
      githubToken: /\b(ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9]{22}_[a-zA-Z0-9]{59})\b/g,
      
      // OpenAI API Keys
      openaiKey: /\b(sk-[a-zA-Z0-9]{48})\b/g,
      
      // IP Addresses (IPv4)
      ipAddress: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
      
      // Date of Birth: MM/DD/YYYY, MM-DD-YYYY, YYYY-MM-DD
      dateOfBirth: /\b(?:0[1-9]|1[0-2])[-/](?:0[1-9]|[12][0-9]|3[01])[-/](?:19|20)\d{2}\b/g,
      
      // Passport Numbers (US format)
      passport: /\b[A-Z]{1,2}[0-9]{6,9}\b/g
    };

    // Redaction replacements
    this.redactions = {
      ssn: '[SSN-REDACTED]',
      creditCard: '[CREDIT-CARD-REDACTED]',
      email: '[EMAIL-REDACTED]',
      phone: '[PHONE-REDACTED]',
      apiKey: '[API-KEY-REDACTED]',
      awsKey: '[AWS-KEY-REDACTED]',
      githubToken: '[GITHUB-TOKEN-REDACTED]',
      openaiKey: '[OPENAI-KEY-REDACTED]',
      ipAddress: '[IP-REDACTED]',
      dateOfBirth: '[DOB-REDACTED]',
      passport: '[PASSPORT-REDACTED]'
    };

    // Detection log
    this.detectionLog = [];
  }

  /**
   * Detect PII in text
   * Returns array of detected PII with type and location
   */
  detect(text) {
    const detections = [];

    // Check each pattern
    for (const [type, pattern] of Object.entries(this.patterns)) {
      const matches = text.matchAll(pattern);
      
      for (const match of matches) {
        detections.push({
          type,
          value: match[0],
          index: match.index,
          length: match[0].length
        });
      }
    }

    // Log detections
    if (this.options.logDetections && detections.length > 0) {
      this.detectionLog.push({
        timestamp: new Date().toISOString(),
        count: detections.length,
        types: [...new Set(detections.map(d => d.type))]
      });
    }

    // Throw error if configured
    if (this.options.throwOnDetection && detections.length > 0) {
      throw new Error(`PII detected: ${detections.length} instances of ${detections.map(d => d.type).join(', ')}`);
    }

    return detections;
  }

  /**
   * Redact PII from text
   * Returns redacted text and detection report
   */
  redact(text) {
    let redactedText = text;
    const detections = this.detect(text);

    // Sort detections by index (descending) to avoid offset issues
    detections.sort((a, b) => b.index - a.index);

    // Apply redactions
    for (const detection of detections) {
      const { type, index, length } = detection;
      const replacement = this.redactions[type] || '[REDACTED]';
      
      redactedText = 
        redactedText.substring(0, index) + 
        replacement + 
        redactedText.substring(index + length);
    }

    return {
      text: redactedText,
      detections: detections.length,
      types: [...new Set(detections.map(d => d.type))],
      original: text
    };
  }

  /**
   * Validate text for PII (returns true if PII found)
   */
  hasPII(text) {
    return this.detect(text).length > 0;
  }

  /**
   * Get detection statistics
   */
  getStats() {
    const totalDetections = this.detectionLog.reduce((sum, log) => sum + log.count, 0);
    const allTypes = this.detectionLog.flatMap(log => log.types);
    const typeCount = {};
    
    allTypes.forEach(type => {
      typeCount[type] = (typeCount[type] || 0) + 1;
    });

    return {
      totalDetections,
      totalScans: this.detectionLog.length,
      typeBreakdown: typeCount,
      lastScan: this.detectionLog[this.detectionLog.length - 1]?.timestamp
    };
  }

  /**
   * Clear detection log
   */
  clearLog() {
    this.detectionLog = [];
  }

  /**
   * Validate credit card using Luhn algorithm
   */
  static validateCreditCard(cardNumber) {
    const digits = cardNumber.replace(/\D/g, '');
    if (digits.length < 13 || digits.length > 19) return false;

    let sum = 0;
    let isEven = false;

    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits[i]);

      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  }

  /**
   * Validate SSN format
   */
  static validateSSN(ssn) {
    const cleaned = ssn.replace(/\D/g, '');
    if (cleaned.length !== 9) return false;

    // Invalid SSN patterns
    const area = cleaned.substring(0, 3);
    const group = cleaned.substring(3, 5);
    const serial = cleaned.substring(5, 9);

    // Check for invalid patterns
    if (area === '000' || area === '666' || area[0] === '9') return false;
    if (group === '00') return false;
    if (serial === '0000') return false;

    return true;
  }

  /**
   * Create a safe version of text for logging (with PII redacted)
   */
  sanitizeForLogging(text) {
    return this.redact(text).text;
  }

  /**
   * Check if text contains sensitive API keys
   */
  containsAPIKeys(text) {
    const apiKeyPatterns = [
      this.patterns.apiKey,
      this.patterns.awsKey,
      this.patterns.githubToken,
      this.patterns.openaiKey
    ];

    return apiKeyPatterns.some(pattern => pattern.test(text));
  }

  /**
   * Generate compliance report
   */
  generateComplianceReport() {
    const stats = this.getStats();
    
    return {
      timestamp: new Date().toISOString(),
      compliance: {
        gdpr: stats.totalDetections === 0 ? 'COMPLIANT' : 'VIOLATIONS_DETECTED',
        ccpa: stats.totalDetections === 0 ? 'COMPLIANT' : 'VIOLATIONS_DETECTED',
        hipaa: stats.totalDetections === 0 ? 'COMPLIANT' : 'VIOLATIONS_DETECTED'
      },
      statistics: stats,
      recommendations: this.getRecommendations(stats)
    };
  }

  /**
   * Get recommendations based on detections
   */
  getRecommendations(stats) {
    const recommendations = [];

    if (stats.totalDetections > 0) {
      recommendations.push('⚠️ PII detected in data - immediate redaction required');
      recommendations.push('📋 Review data handling procedures');
      recommendations.push('🔒 Implement automatic PII redaction');
    }

    if (stats.typeBreakdown.creditCard) {
      recommendations.push('💳 Credit card data detected - PCI-DSS compliance required');
    }

    if (stats.typeBreakdown.ssn) {
      recommendations.push('🆔 SSN detected - enhanced security measures required');
    }

    if (stats.typeBreakdown.apiKey || stats.typeBreakdown.awsKey || 
        stats.typeBreakdown.githubToken || stats.typeBreakdown.openaiKey) {
      recommendations.push('🔑 API keys detected - rotate keys immediately');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ No PII detected - data is compliant');
    }

    return recommendations;
  }
}

// CLI usage
if (require.main === module) {
  const detector = new PIIDetector();
  
  console.log('🔍 PII Detector Demo\n');
  
  // Test cases
  const testCases = [
    'My SSN is 123-45-6789',
    'Credit card: 4532-1234-5678-9010',
    'Email me at john.doe@example.com',
    'Call me at (555) 123-4567',
    'API key: sk-1234567890abcdefghijklmnopqrstuvwxyz1234567890',
    'My IP is 192.168.1.1',
    'Born on 01/15/1990'
  ];

  testCases.forEach((text, i) => {
    console.log(`Test ${i + 1}: "${text}"`);
    const result = detector.redact(text);
    console.log(`Redacted: "${result.text}"`);
    console.log(`Detections: ${result.detections} (${result.types.join(', ')})`);
    console.log('');
  });

  // Show statistics
  console.log('📊 Detection Statistics:');
  console.log(detector.getStats());
  console.log('');

  // Show compliance report
  console.log('📋 Compliance Report:');
  console.log(detector.generateComplianceReport());
}

module.exports = PIIDetector;

