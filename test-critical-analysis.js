#!/usr/bin/env node

/**
 * AICF Critical Testing Suite
 * Comprehensive security, performance, and edge case testing
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { performance } = require('perf_hooks');

// Import AICF components (check if they exist, otherwise mock)
let AICFWriter, AICFReader;
try {
  AICFWriter = require('./src/aicf-writer');
  AICFReader = require('./src/aicf-reader');
} catch (error) {
  console.log('⚠️ AICF modules not found, creating mock implementations for testing...');
  
  // Mock AICFWriter for testing
  AICFWriter = class {
    constructor(dir = '.aicf') {
      this.aicfDir = dir;
    }
    
    async appendConversation(data) {
      const fs = require('fs');
      const path = require('path');
      
      if (!fs.existsSync(this.aicfDir)) {
        fs.mkdirSync(this.aicfDir, { recursive: true });
      }
      
      const content = `@CONVERSATION:${data.id}\nmessages=${data.messages}\ntokens=${data.tokens}\n\n`;
      fs.appendFileSync(path.join(this.aicfDir, 'conversations.aicf'), content);
      return { success: true };
    }
    
    async addInsight(data) {
      const fs = require('fs');
      const path = require('path');
      
      if (!fs.existsSync(this.aicfDir)) {
        fs.mkdirSync(this.aicfDir, { recursive: true });
      }
      
      const content = `@INSIGHTS ${data.text}|${data.category}\n`;
      fs.appendFileSync(path.join(this.aicfDir, 'technical-context.aicf'), content);
      return { success: true };
    }
  };
  
  // Mock AICFReader for testing
  AICFReader = class {
    constructor(dir = '.aicf') {
      this.aicfDir = dir;
    }
    
    getLastConversations(count = 5) {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(this.aicfDir, 'conversations.aicf');
      
      if (!fs.existsSync(filePath)) return [];
      
      const content = fs.readFileSync(filePath, 'utf8');
      const conversations = content.split('@CONVERSATION:').slice(1);
      return conversations.slice(-count).map((conv, i) => ({
        id: conv.split('\n')[0],
        metadata: { messages: 1, tokens: 100 }
      }));
    }
  };
}

class AICFSecurityTester {
  constructor() {
    this.testResults = [];
    this.setupTestEnvironment();
  }

  setupTestEnvironment() {
    // Create isolated test directory
    this.testDir = './test-aicf-security';
    if (fs.existsSync(this.testDir)) {
      fs.rmSync(this.testDir, { recursive: true });
    }
    fs.mkdirSync(this.testDir);
  }

  log(testName, status, details = '') {
    const result = {
      test: testName,
      status,
      details,
      timestamp: new Date().toISOString()
    };
    this.testResults.push(result);
    
    const statusEmoji = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${statusEmoji} ${testName}: ${status} ${details}`);
  }

  // =================== SECURITY TESTS ===================

  async testPathTraversal() {
    console.log('\n🔒 Testing Path Traversal Vulnerabilities...');
    
    const maliciousPaths = [
      '../../../etc/passwd',
      '/etc/shadow',
      '..\\..\\..\\windows\\system32\\config\\sam',
      '../sensitive-project/secrets.txt',
      '/tmp/malicious-write'
    ];

    for (const maliciousPath of maliciousPaths) {
      try {
        const writer = new AICFWriter(maliciousPath);
        await writer.appendConversation({
          id: 'path-traversal-test',
          messages: 1,
          tokens: 100
        });
        
        // If we reach here, the vulnerability exists
        this.log(
          `Path Traversal: ${maliciousPath}`,
          'FAIL',
          'CRITICAL: Path traversal vulnerability confirmed!'
        );
      } catch (error) {
        // Good - the path was rejected
        this.log(
          `Path Traversal: ${maliciousPath}`,
          'PASS',
          'Path properly rejected'
        );
      }
    }
  }

  async testPipeInjection() {
    console.log('\n🔒 Testing Pipe Injection Attacks...');
    
    const testWriter = new AICFWriter(this.testDir);
    
    const injectionPayloads = [
      {
        text: "Normal text|@ADMIN_OVERRIDE|CRITICAL|EXPLOIT",
        category: "SECURITY|TEST",
        expected: "Should escape pipes"
      },
      {
        text: "Test\n@CONVERSATION:fake-id\ntimestamp=malicious",
        category: "INJECTION",
        expected: "Should escape newlines and @ symbols"
      },
      {
        text: "Test|rm -rf /|dangerous command",
        category: "COMMAND|INJECTION",
        expected: "Should not allow command injection"
      }
    ];

    for (const payload of injectionPayloads) {
      try {
        await testWriter.addInsight(payload);
        
        // Check if injection was properly escaped
        const content = fs.readFileSync(
          path.join(this.testDir, 'technical-context.aicf'), 
          'utf8'
        );
        
        const hasUnescapedPipes = content.includes('|@ADMIN') || 
                                  content.includes('|rm -rf') ||
                                  content.includes('\n@CONVERSATION');
        
        if (hasUnescapedPipes) {
          this.log(
            'Pipe Injection',
            'FAIL',
            'CRITICAL: Injection vulnerability found!'
          );
        } else {
          this.log(
            'Pipe Injection',
            'PASS',
            'Input properly sanitized'
          );
        }
      } catch (error) {
        this.log(
          'Pipe Injection',
          'WARN',
          `Test error: ${error.message}`
        );
      }
    }
  }

  async testPIIDetection() {
    console.log('\n🔒 Testing PII Detection...');
    
    const testWriter = new AICFWriter(this.testDir);
    
    const piiData = [
      {
        text: "My credit card is 4532-1234-5678-9012",
        type: "Credit Card",
        shouldRedact: true
      },
      {
        text: "SSN: 123-45-6789",
        type: "Social Security Number", 
        shouldRedact: true
      },
      {
        text: "Email me at john.doe@example.com",
        type: "Email Address",
        shouldRedact: true
      },
      {
        text: "API key: sk-1234567890abcdef1234567890abcdef",
        type: "API Key",
        shouldRedact: true
      }
    ];

    for (const pii of piiData) {
      try {
        await testWriter.addInsight({
          text: pii.text,
          category: "PII-TEST"
        });
        
        const content = fs.readFileSync(
          path.join(this.testDir, 'technical-context.aicf'), 
          'utf8'
        );
        
        // Check if PII is still present (vulnerability)
        const containsPII = content.includes(pii.text);
        
        if (containsPII && pii.shouldRedact) {
          this.log(
            `PII Detection: ${pii.type}`,
            'FAIL',
            'PII not redacted - privacy violation!'
          );
        } else {
          this.log(
            `PII Detection: ${pii.type}`,
            'WARN',
            'No PII detection implemented yet'
          );
        }
      } catch (error) {
        this.log(
          `PII Detection: ${pii.type}`,
          'WARN',
          `Test error: ${error.message}`
        );
      }
    }
  }

  // =================== PERFORMANCE TESTS ===================

  async testMemoryExhaustion() {
    console.log('\n⚡ Testing Memory Exhaustion...');
    
    const testWriter = new AICFWriter(this.testDir);
    const startMemory = process.memoryUsage().heapUsed;
    
    try {
      // Create large conversation data
      const largeData = {
        id: 'memory-bomb',
        messages: 1000,
        tokens: 50000,
        metadata: {
          // 10MB of data
          payload: 'x'.repeat(10 * 1024 * 1024)
        }
      };
      
      const start = performance.now();
      await testWriter.appendConversation(largeData);
      const writeTime = performance.now() - start;
      
      const afterWriteMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = afterWriteMemory - startMemory;
      
      this.log(
        'Memory Exhaustion - Write',
        memoryIncrease < 50 * 1024 * 1024 ? 'PASS' : 'FAIL',
        `Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB, Time: ${writeTime.toFixed(2)}ms`
      );
      
      // Test reading the large file
      const reader = new AICFReader(this.testDir);
      const readStart = performance.now();
      const conversations = reader.getLastConversations(1);
      const readTime = performance.now() - readStart;
      
      const afterReadMemory = process.memoryUsage().heapUsed;
      const readMemoryIncrease = afterReadMemory - afterWriteMemory;
      
      this.log(
        'Memory Exhaustion - Read',
        readMemoryIncrease < 20 * 1024 * 1024 ? 'PASS' : 'FAIL',
        `Memory increase: ${(readMemoryIncrease / 1024 / 1024).toFixed(2)}MB, Time: ${readTime.toFixed(2)}ms`
      );
      
    } catch (error) {
      this.log(
        'Memory Exhaustion',
        'FAIL',
        `System crashed: ${error.message}`
      );
    }
  }

  async testConcurrentWrites() {
    console.log('\n⚡ Testing Concurrent Write Performance...');
    
    const testWriter = new AICFWriter(this.testDir);
    const concurrentCount = 20;
    
    try {
      const start = performance.now();
      
      const promises = Array.from({length: concurrentCount}, (_, i) => 
        testWriter.appendConversation({
          id: `concurrent-${i}`,
          messages: Math.floor(Math.random() * 50) + 1,
          tokens: Math.floor(Math.random() * 5000) + 100,
          metadata: { thread: i }
        })
      );
      
      await Promise.all(promises);
      const totalTime = performance.now() - start;
      
      // Verify data integrity
      const content = fs.readFileSync(
        path.join(this.testDir, 'conversations.aicf'), 
        'utf8'
      );
      const lines = content.split('\n').filter(Boolean);
      const expectedLines = concurrentCount * 7; // Each conversation = 7 lines
      
      const integrityCheck = lines.length === expectedLines;
      
      this.log(
        'Concurrent Writes - Performance',
        totalTime < 5000 ? 'PASS' : 'FAIL',
        `${concurrentCount} writes in ${totalTime.toFixed(2)}ms (${(totalTime/concurrentCount).toFixed(2)}ms avg)`
      );
      
      this.log(
        'Concurrent Writes - Data Integrity',
        integrityCheck ? 'PASS' : 'FAIL',
        `Expected ${expectedLines} lines, got ${lines.length}`
      );
      
    } catch (error) {
      this.log(
        'Concurrent Writes',
        'FAIL',
        `Race condition detected: ${error.message}`
      );
    }
  }

  async testLargeFilePerformance() {
    console.log('\n⚡ Testing Large File Performance...');
    
    const testWriter = new AICFWriter(this.testDir);
    const conversationCount = 1000;
    
    try {
      // Create large AICF file
      const start = performance.now();
      for (let i = 0; i < conversationCount; i++) {
        await testWriter.appendConversation({
          id: `perf-test-${i}`,
          messages: Math.floor(Math.random() * 20) + 1,
          tokens: Math.floor(Math.random() * 2000) + 100,
          metadata: {
            iteration: i,
            data: 'x'.repeat(Math.floor(Math.random() * 1000) + 100)
          }
        });
      }
      const writeTime = performance.now() - start;
      
      // Check file size
      const filePath = path.join(this.testDir, 'conversations.aicf');
      const fileSize = fs.statSync(filePath).size;
      
      this.log(
        'Large File Creation',
        'PASS',
        `${conversationCount} conversations, ${(fileSize/1024/1024).toFixed(2)}MB in ${writeTime.toFixed(2)}ms`
      );
      
      // Test read performance
      const reader = new AICFReader(this.testDir);
      const readStart = performance.now();
      const lastConversations = reader.getLastConversations(10);
      const readTime = performance.now() - readStart;
      
      this.log(
        'Large File Read',
        readTime < 1000 ? 'PASS' : 'FAIL',
        `Read 10 conversations from ${(fileSize/1024/1024).toFixed(2)}MB file in ${readTime.toFixed(2)}ms`
      );
      
    } catch (error) {
      this.log(
        'Large File Performance',
        'FAIL',
        `Performance issue: ${error.message}`
      );
    }
  }

  // =================== EDGE CASE TESTS ===================

  async testMalformedInput() {
    console.log('\n🔧 Testing Malformed Input Handling...');
    
    const testWriter = new AICFWriter(this.testDir);
    
    const malformedInputs = [
      { 
        input: { id: null, messages: undefined, tokens: NaN },
        name: "Null/Undefined/NaN values"
      },
      {
        input: { id: '', messages: -1, tokens: Infinity },
        name: "Empty/Negative/Infinite values"
      },
      {
        input: { id: 'test', messages: 'invalid', tokens: 'also-invalid' },
        name: "String values in numeric fields"
      },
      {
        input: { id: 'circular', metadata: {} },
        name: "Circular reference",
        setup: (input) => { input.metadata.self = input.metadata; }
      }
    ];

    for (const test of malformedInputs) {
      try {
        if (test.setup) test.setup(test.input);
        
        await testWriter.appendConversation(test.input);
        
        this.log(
          `Malformed Input: ${test.name}`,
          'PASS',
          'Handled gracefully'
        );
      } catch (error) {
        this.log(
          `Malformed Input: ${test.name}`,
          'WARN',
          `Error handling: ${error.message}`
        );
      }
    }
  }

  async testUnicodeHandling() {
    console.log('\n🔧 Testing Unicode and Special Characters...');
    
    const testWriter = new AICFWriter(this.testDir);
    
    const unicodeTests = [
      {
        text: "🚀 Emoji test with rocket",
        name: "Basic Emoji"
      },
      {
        text: "Test with unicode: \u0041\u0300\u0301 (A with accents)",
        name: "Unicode Combining Characters"
      },
      {
        text: "NULL byte test: \u0000 and control chars: \u001F\u007F",
        name: "Control Characters"
      },
      {
        text: "Right-to-left: עברית العربية",
        name: "RTL Languages"
      },
      {
        text: "Math symbols: ∑∫∂√π∞",
        name: "Mathematical Symbols"
      }
    ];

    for (const test of unicodeTests) {
      try {
        await testWriter.addInsight({
          text: test.text,
          category: "UNICODE-TEST"
        });
        
        // Verify content was preserved
        const content = fs.readFileSync(
          path.join(this.testDir, 'technical-context.aicf'), 
          'utf8'
        );
        
        const preserved = content.includes(test.text.replace(/\u0000|\u001F|\u007F/g, ''));
        
        this.log(
          `Unicode: ${test.name}`,
          preserved ? 'PASS' : 'FAIL',
          preserved ? 'Unicode preserved' : 'Unicode corrupted'
        );
      } catch (error) {
        this.log(
          `Unicode: ${test.name}`,
          'FAIL',
          `Unicode handling error: ${error.message}`
        );
      }
    }
  }

  async testFileSystemEdgeCases() {
    console.log('\n🔧 Testing File System Edge Cases...');
    
    // Test read-only directory
    try {
      const readOnlyDir = path.join(this.testDir, 'readonly');
      fs.mkdirSync(readOnlyDir);
      fs.chmodSync(readOnlyDir, 0o444);
      
      const writer = new AICFWriter(readOnlyDir);
      await writer.appendConversation({
        id: 'readonly-test',
        messages: 1,
        tokens: 100
      });
      
      this.log(
        'File System: Read-only directory',
        'FAIL',
        'Should have thrown permission error'
      );
    } catch (error) {
      this.log(
        'File System: Read-only directory',
        'PASS',
        'Permission error properly handled'
      );
    }

    // Test non-existent directory
    try {
      const writer = new AICFWriter('/non/existent/path');
      await writer.appendConversation({
        id: 'nonexistent-test',
        messages: 1,
        tokens: 100
      });
      
      this.log(
        'File System: Non-existent directory',
        'WARN',
        'Directory created automatically'
      );
    } catch (error) {
      this.log(
        'File System: Non-existent directory',
        'PASS',
        'Non-existent path properly rejected'
      );
    }
  }

  // =================== REPORT GENERATION ===================

  generateReport() {
    console.log('\n📊 GENERATING SECURITY ANALYSIS REPORT...\n');
    
    const summary = {
      total: this.testResults.length,
      passed: this.testResults.filter(r => r.status === 'PASS').length,
      failed: this.testResults.filter(r => r.status === 'FAIL').length,
      warnings: this.testResults.filter(r => r.status === 'WARN').length
    };

    console.log('='.repeat(60));
    console.log('🧪 AICF CRITICAL ANALYSIS RESULTS');
    console.log('='.repeat(60));
    console.log(`📊 Total Tests: ${summary.total}`);
    console.log(`✅ Passed: ${summary.passed}`);
    console.log(`❌ Failed: ${summary.failed}`);
    console.log(`⚠️  Warnings: ${summary.warnings}`);
    console.log(`📈 Success Rate: ${((summary.passed / summary.total) * 100).toFixed(1)}%`);
    console.log('='.repeat(60));

    // Show critical failures
    const criticalFailures = this.testResults.filter(r => 
      r.status === 'FAIL' && r.details.includes('CRITICAL')
    );

    if (criticalFailures.length > 0) {
      console.log('\n🚨 CRITICAL SECURITY VULNERABILITIES DETECTED:');
      criticalFailures.forEach(failure => {
        console.log(`❌ ${failure.test}: ${failure.details}`);
      });
    }

    // Show performance issues
    const performanceIssues = this.testResults.filter(r => 
      r.test.includes('Performance') && r.status === 'FAIL'
    );

    if (performanceIssues.length > 0) {
      console.log('\n⚡ PERFORMANCE ISSUES DETECTED:');
      performanceIssues.forEach(issue => {
        console.log(`⚠️ ${issue.test}: ${issue.details}`);
      });
    }

    // Recommendations
    console.log('\n🎯 IMMEDIATE ACTION REQUIRED:');
    if (summary.failed > 0) {
      console.log('1. 🔒 Fix security vulnerabilities before production');
      console.log('2. ⚡ Address performance bottlenecks');
      console.log('3. 🧪 Implement missing input validation');
      console.log('4. 📝 Add comprehensive error handling');
    } else {
      console.log('✅ No critical issues detected - system appears secure');
    }

    console.log('\n📁 Test environment created at:', this.testDir);
    console.log('🔍 Review generated files for detailed analysis');
    
    return summary;
  }

  cleanup() {
    try {
      if (fs.existsSync(this.testDir)) {
        // Reset permissions before cleanup
        fs.chmodSync(this.testDir, 0o755);
        fs.rmSync(this.testDir, { recursive: true });
      }
    } catch (error) {
      console.log('⚠️ Cleanup warning:', error.message);
    }
  }
}

// =================== MAIN EXECUTION ===================

async function runCriticalAnalysis() {
  const tester = new AICFSecurityTester();
  
  try {
    console.log('🧪 AICF CRITICAL ANALYSIS & TESTING SUITE');
    console.log('==========================================');
    
    // Security Tests
    await tester.testPathTraversal();
    await tester.testPipeInjection();
    await tester.testPIIDetection();
    
    // Performance Tests
    await tester.testMemoryExhaustion();
    await tester.testConcurrentWrites();
    await tester.testLargeFilePerformance();
    
    // Edge Case Tests
    await tester.testMalformedInput();
    await tester.testUnicodeHandling();
    await tester.testFileSystemEdgeCases();
    
    // Generate Report
    const summary = tester.generateReport();
    
    // Exit with appropriate code
    process.exit(summary.failed > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('❌ Critical testing suite failed:', error);
    process.exit(1);
  } finally {
    tester.cleanup();
  }
}

// Run if called directly
if (require.main === module) {
  runCriticalAnalysis();
}

module.exports = AICFSecurityTester;