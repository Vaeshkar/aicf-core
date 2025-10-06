#!/usr/bin/env node

/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (c) 2025 Dennis van Leeuwen
 */

/**
 * CFE Integration Test Suite
 * 
 * Comprehensive testing of the Cryptographic Format Encoding system
 * including security verification, performance benchmarks, and compatibility.
 */

const { CryptographicFormatEncoder, AICFCryptographic } = require('../src/aicf-cryptographic.js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class CFETestSuite {
  constructor() {
    this.testDir = './test-cfe-results';
    this.results = {
      passed: 0,
      failed: 0,
      total: 0,
      details: []
    };
  }

  /**
   * Run complete test suite
   */
  async runAllTests() {
    console.log('🔬 AICF CFE Integration Test Suite\n');
    
    // Ensure test directory exists
    if (!fs.existsSync(this.testDir)) {
      fs.mkdirSync(this.testDir, { recursive: true });
    }
    
    const tests = [
      () => this.testBasicEncoding(),
      () => this.testIntegrityVerification(),
      () => this.testObfuscationEffectiveness(),
      () => this.testSecurityResilience(),
      () => this.testPerformanceBenchmark(),
      () => this.testHybridMode(),
      () => this.testLargeDatasets(),
      () => this.testErrorHandling(),
      () => this.testCompatibility()
    ];
    
    for (const test of tests) {
      await test();
    }
    
    this.printSummary();
    this.cleanup();
    
    return this.results;
  }

  /**
   * TEST 1: Basic Encoding/Decoding
   */
  async testBasicEncoding() {
    const testName = 'Basic Encoding/Decoding';
    console.log(`🧪 ${testName}...`);
    
    try {
      const encoder = new CryptographicFormatEncoder();
      const testData = [
        '1|@CONVERSATION:test_session',
        '2|timestamp_start=2025-01-01T00:00:00Z',
        '3|messages=100',
        '4|@STATE',
        '5|status=active'
      ];
      
      const results = [];
      for (const line of testData) {
        const encoded = encoder.encode(line);
        const decoded = encoder.decode(encoded);
        
        // Verify structure preservation (ignoring hashed identifiers)
        const originalStructure = line.replace(/:([a-zA-Z0-9_-]+)/g, ':HASH');
        const decodedStructure = decoded.replace(/:([a-zA-Z0-9_-]+)/g, ':HASH');
        
        results.push({
          original: line,
          encoded,
          decoded,
          structureMatch: originalStructure === decodedStructure
        });
      }
      
      const allMatched = results.every(r => r.structureMatch);
      this.recordTest(testName, allMatched, { 
        results, 
        message: allMatched ? 'All lines encoded/decoded successfully' : 'Structure mismatch detected'
      });
      
    } catch (error) {
      this.recordTest(testName, false, { error: error.message });
    }
  }

  /**
   * TEST 2: Integrity Verification
   */
  async testIntegrityVerification() {
    const testName = 'Integrity Verification';
    console.log(`🛡️ ${testName}...`);
    
    try {
      const encoder = new CryptographicFormatEncoder();
      const testLine = '1|@CONVERSATION:integrity_test';
      const encoded = encoder.encode(testLine);
      
      // Test 1: Valid integrity
      const validDecode = encoder.decode(encoded);
      const validityTest = validDecode.includes('@CONVERSATION');
      
      // Test 2: Tampered data (should fail)
      const tamperedEncoded = encoded.replace(/[A-Z]/g, 'X'); // Corrupt the base64
      let tamperedFailed = false;
      try {
        encoder.decode(tamperedEncoded);
      } catch (error) {
        tamperedFailed = true; // Expected behavior
      }
      
      const passed = validityTest && tamperedFailed;
      this.recordTest(testName, passed, {
        validDecode: validityTest,
        tamperedRejected: tamperedFailed,
        message: passed ? 'Integrity verification working correctly' : 'Integrity check failed'
      });
      
    } catch (error) {
      this.recordTest(testName, false, { error: error.message });
    }
  }

  /**
   * TEST 3: Obfuscation Effectiveness
   */
  async testObfuscationEffectiveness() {
    const testName = 'Obfuscation Effectiveness';
    console.log(`🎭 ${testName}...`);
    
    try {
      const encoder = new CryptographicFormatEncoder();
      const testCases = [
        '1|@CONVERSATION:sensitive_data',
        '2|user:api_key=secret123',
        '3|@TECHNICAL',
        '4|database_url=postgresql://user:pass@localhost/db'
      ];
      
      const obfuscationResults = [];
      for (const line of testCases) {
        const encoded = encoder.encode(line);
        const stats = encoder.getFormatStats(line, encoded);
        
        // Check for visible sensitive data
        const hasSensitiveVisible = ['@', 'secret', 'api_key', 'postgresql', 'user', 'pass'].some(
          sensitive => encoded.toLowerCase().includes(sensitive.toLowerCase())
        );
        
        obfuscationResults.push({
          original: line,
          obfuscationLevel: stats.obfuscationLevel,
          sensitiveVisible: hasSensitiveVisible,
          compressionRatio: stats.compressionRatio
        });
      }
      
      const avgObfuscation = obfuscationResults.reduce((sum, r) => sum + r.obfuscationLevel, 0) / obfuscationResults.length;
      const noSensitiveVisible = obfuscationResults.every(r => !r.sensitiveVisible);
      
      const passed = avgObfuscation >= 95 && noSensitiveVisible; // Expect 95%+ obfuscation
      
      this.recordTest(testName, passed, {
        avgObfuscation: `${avgObfuscation.toFixed(1)}%`,
        noSensitiveVisible,
        results: obfuscationResults,
        message: passed ? 'High-level obfuscation achieved' : 'Obfuscation insufficient'
      });
      
    } catch (error) {
      this.recordTest(testName, false, { error: error.message });
    }
  }

  /**
   * TEST 4: Security Resilience
   */
  async testSecurityResilience() {
    const testName = 'Security Resilience';
    console.log(`🔐 ${testName}...`);
    
    try {
      const encoder = new CryptographicFormatEncoder();
      const sensitiveData = '1|@CONVERSATION:confidential_meeting|user:email=admin@company.com|password=secretPass123';
      const encoded = encoder.encode(sensitiveData);
      
      // Test regex attack resistance
      const commonPatterns = [
        /@[A-Z]+/g,           // AICF section markers
        /user:[a-zA-Z_]+=/g,  // User field patterns
        /password=/g,         // Password fields
        /\|/g,               // Pipe delimiters
        /=[^|]+/g            // Value patterns
      ];
      
      const patternMatches = commonPatterns.map(pattern => {
        const matches = encoded.match(pattern);
        return {
          pattern: pattern.toString(),
          matches: matches ? matches.length : 0
        };
      });
      
      const totalMatches = patternMatches.reduce((sum, pm) => sum + pm.matches, 0);
      const resilienceScore = Math.max(0, 100 - (totalMatches * 10)); // Penalty per match
      
      const passed = resilienceScore >= 90; // Expect 90%+ resilience
      
      this.recordTest(testName, passed, {
        resilienceScore: `${resilienceScore}%`,
        patternMatches,
        totalPatternHits: totalMatches,
        message: passed ? 'Strong regex attack resistance' : 'Vulnerable to pattern matching'
      });
      
    } catch (error) {
      this.recordTest(testName, false, { error: error.message });
    }
  }

  /**
   * TEST 5: Performance Benchmark
   */
  async testPerformanceBenchmark() {
    const testName = 'Performance Benchmark';
    console.log(`⚡ ${testName}...`);
    
    try {
      const encoder = new CryptographicFormatEncoder();
      const testData = [];
      
      // Generate 1000 test lines
      for (let i = 1; i <= 1000; i++) {
        testData.push(`${i}|@CONVERSATION:session_${i}|timestamp=${new Date().toISOString()}|messages=${Math.floor(Math.random() * 100)}`);
      }
      
      // Encoding benchmark
      const encodeStart = process.hrtime.bigint();
      const encodedData = testData.map(line => encoder.encode(line));
      const encodeEnd = process.hrtime.bigint();
      const encodeTimeMs = Number(encodeEnd - encodeStart) / 1_000_000;
      
      // Decoding benchmark
      const decodeStart = process.hrtime.bigint();
      const decodedData = encodedData.map(line => encoder.decode(line));
      const decodeEnd = process.hrtime.bigint();
      const decodeTimeMs = Number(decodeEnd - decodeStart) / 1_000_000;
      
      // Performance metrics
      const encodeRate = (testData.length / encodeTimeMs * 1000).toFixed(0); // lines/second
      const decodeRate = (encodedData.length / decodeTimeMs * 1000).toFixed(0); // lines/second
      
      // Performance targets: > 1000 lines/sec for both operations
      const passed = parseFloat(encodeRate) >= 1000 && parseFloat(decodeRate) >= 1000;
      
      this.recordTest(testName, passed, {
        linesProcessed: testData.length,
        encodeTimeMs: encodeTimeMs.toFixed(2),
        decodeTimeMs: decodeTimeMs.toFixed(2),
        encodeRate: `${encodeRate} lines/sec`,
        decodeRate: `${decodeRate} lines/sec`,
        message: passed ? 'Performance targets met' : 'Performance below targets'
      });
      
    } catch (error) {
      this.recordTest(testName, false, { error: error.message });
    }
  }

  /**
   * TEST 6: Hybrid Mode
   */
  async testHybridMode() {
    const testName = 'Hybrid Mode';
    console.log(`🔄 ${testName}...`);
    
    try {
      const cfe = new AICFCryptographic(this.testDir, { hybridMode: true });
      
      // Mixed data: CFE and plain text
      const encoder = new CryptographicFormatEncoder();
      const mixedData = [
        '1|@CONVERSATION:hybrid_test',
        encoder.encode('2|timestamp=2025-01-01T00:00:00Z'), // CFE encoded
        '3|messages=50',                                      // Plain text
        encoder.encode('4|@STATE'),                          // CFE encoded
        '5|status=active'                                    // Plain text
      ];
      
      const testFile = path.join(this.testDir, 'hybrid-test.aicf');
      fs.writeFileSync(testFile, mixedData.join('\n'), 'utf8');
      
      const result = await cfe.readCryptographic(testFile);
      
      // Verify all lines were read successfully
      const passed = result.lines.length === mixedData.length && 
                    result.stats.integrityFailures === 0;
      
      this.recordTest(testName, passed, {
        totalLines: result.lines.length,
        expectedLines: mixedData.length,
        cfeLines: result.stats.decodedLines,
        integrityFailures: result.stats.integrityFailures,
        message: passed ? 'Hybrid mode working correctly' : 'Hybrid mode failed'
      });
      
    } catch (error) {
      this.recordTest(testName, false, { error: error.message });
    }
  }

  /**
   * TEST 7: Large Dataset Handling
   */
  async testLargeDatasets() {
    const testName = 'Large Dataset Handling';
    console.log(`📊 ${testName}...`);
    
    try {
      const cfe = new AICFCryptographic(this.testDir);
      
      // Generate 10,000 lines of test data
      const largeDataset = [];
      for (let i = 1; i <= 10000; i++) {
        largeDataset.push(`${i}|@CONVERSATION:large_session_${i}|data=${crypto.randomBytes(32).toString('hex')}`);
      }
      
      const testFile = path.join(this.testDir, 'large-dataset.aicf');
      
      // Write large dataset
      const writeStart = Date.now();
      const writeResult = await cfe.writeCryptographic(testFile, largeDataset);
      const writeTime = Date.now() - writeStart;
      
      // Read large dataset
      const readStart = Date.now();
      const readResult = await cfe.readCryptographic(testFile);
      const readTime = Date.now() - readStart;
      
      const passed = writeResult.success && 
                    readResult.lines.length === largeDataset.length &&
                    writeTime < 10000 && // < 10 seconds
                    readTime < 5000;   // < 5 seconds
      
      this.recordTest(testName, passed, {
        linesWritten: writeResult.linesEncoded,
        linesRead: readResult.lines.length,
        writeTimeMs: writeTime,
        readTimeMs: readTime,
        avgObfuscation: writeResult.avgObfuscation,
        message: passed ? 'Large dataset handled efficiently' : 'Large dataset performance issues'
      });
      
    } catch (error) {
      this.recordTest(testName, false, { error: error.message });
    }
  }

  /**
   * TEST 8: Error Handling
   */
  async testErrorHandling() {
    const testName = 'Error Handling';
    console.log(`⚠️ ${testName}...`);
    
    try {
      const encoder = new CryptographicFormatEncoder();
      const errorTests = [];
      
      // Test 1: Invalid CFE format
      try {
        encoder.decode('invalid-cfe-format');
        errorTests.push({ test: 'invalid_format', handled: false });
      } catch (error) {
        errorTests.push({ test: 'invalid_format', handled: true, error: error.message });
      }
      
      // Test 2: Corrupted integrity hash
      try {
        const validEncoded = encoder.encode('test|data');
        const corruptedHash = validEncoded.replace(/CFE◈[A-Za-z0-9+/=]{6}/, 'CFE◈CORRUPT');
        encoder.decode(corruptedHash);
        errorTests.push({ test: 'corrupted_integrity', handled: false });
      } catch (error) {
        errorTests.push({ test: 'corrupted_integrity', handled: true, error: error.message });
      }
      
      // Test 3: Non-existent file
      const cfe = new AICFCryptographic(this.testDir);
      try {
        await cfe.readCryptographic('non-existent-file.aicf');
        errorTests.push({ test: 'missing_file', handled: false });
      } catch (error) {
        errorTests.push({ test: 'missing_file', handled: true, error: error.message });
      }
      
      const allErrorsHandled = errorTests.every(et => et.handled);
      
      this.recordTest(testName, allErrorsHandled, {
        errorTests,
        message: allErrorsHandled ? 'All errors handled gracefully' : 'Some errors not properly handled'
      });
      
    } catch (error) {
      this.recordTest(testName, false, { error: error.message });
    }
  }

  /**
   * TEST 9: Compatibility
   */
  async testCompatibility() {
    const testName = 'Compatibility';
    console.log(`🔗 ${testName}...`);
    
    try {
      // Test different key sizes
      const keys = [
        crypto.randomBytes(16), // 128-bit
        crypto.randomBytes(32), // 256-bit
        crypto.randomBytes(64)  // 512-bit
      ];
      
      const compatibilityTests = [];
      
      for (const [index, key] of keys.entries()) {
        const encoder = new CryptographicFormatEncoder(key);
        const testLine = `test|compatibility|key_size=${key.length * 8}`;
        
        try {
          const encoded = encoder.encode(testLine);
          const decoded = encoder.decode(encoded);
          const success = decoded.includes('compatibility');
          
          compatibilityTests.push({
            keySize: key.length * 8,
            success,
            encoded: encoded.substring(0, 50) + '...'
          });
        } catch (error) {
          compatibilityTests.push({
            keySize: key.length * 8,
            success: false,
            error: error.message
          });
        }
      }
      
      const allCompatible = compatibilityTests.every(ct => ct.success);
      
      this.recordTest(testName, allCompatible, {
        compatibilityTests,
        message: allCompatible ? 'All key sizes compatible' : 'Compatibility issues detected'
      });
      
    } catch (error) {
      this.recordTest(testName, false, { error: error.message });
    }
  }

  /**
   * Record test result
   */
  recordTest(name, passed, details) {
    this.results.total++;
    if (passed) {
      this.results.passed++;
      console.log(`  ✅ ${name} - PASSED`);
    } else {
      this.results.failed++;
      console.log(`  ❌ ${name} - FAILED`);
    }
    
    this.results.details.push({
      name,
      passed,
      ...details
    });
  }

  /**
   * Print test summary
   */
  printSummary() {
    console.log(`\n📊 Test Summary:`);
    console.log(`  Total Tests: ${this.results.total}`);
    console.log(`  Passed: ${this.results.passed} ✅`);
    console.log(`  Failed: ${this.results.failed} ❌`);
    console.log(`  Success Rate: ${((this.results.passed / this.results.total) * 100).toFixed(1)}%`);
    
    if (this.results.failed > 0) {
      console.log(`\n❌ Failed Tests:`);
      this.results.details.filter(d => !d.passed).forEach(detail => {
        console.log(`  - ${detail.name}: ${detail.message || detail.error || 'Unknown error'}`);
      });
    }
    
    // Save detailed results
    const resultFile = path.join(this.testDir, 'cfe-test-results.json');
    fs.writeFileSync(resultFile, JSON.stringify(this.results, null, 2), 'utf8');
    console.log(`\n📄 Detailed results saved to: ${resultFile}`);
  }

  /**
   * Cleanup test files
   */
  cleanup() {
    try {
      // Keep results but clean up test files
      const testFiles = fs.readdirSync(this.testDir).filter(f => f.includes('test') && !f.includes('results'));
      for (const file of testFiles) {
        fs.unlinkSync(path.join(this.testDir, file));
      }
      console.log(`\n🧹 Cleaned up ${testFiles.length} test files`);
    } catch (error) {
      console.log(`⚠️ Cleanup warning: ${error.message}`);
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const testSuite = new CFETestSuite();
  testSuite.runAllTests()
    .then(results => {
      process.exit(results.failed === 0 ? 0 : 1);
    })
    .catch(error => {
      console.error('Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = { CFETestSuite };