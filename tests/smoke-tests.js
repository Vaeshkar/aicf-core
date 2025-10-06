#!/usr/bin/env node

/**
 * AICF v3.1.1 Smoke Tests
 * Basic functionality validation for staging and production deployments
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class AICFSmokeTests {
  constructor() {
    this.testResults = [];
    this.startTime = Date.now();
    this.testDir = path.join(process.cwd(), 'smoke-test-dir');
  }

  /**
   * Log test results with timestamps
   */
  log(level, message, details = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, level, message, details };
    
    console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`);
    if (Object.keys(details).length > 0) {
      console.log(`  Details:`, details);
    }
    
    this.testResults.push(logEntry);
  }

  /**
   * Run a single test with error handling
   */
  async runTest(testName, testFn) {
    this.log('info', `🧪 Running ${testName}...`);
    
    try {
      const startTime = Date.now();
      const result = await testFn();
      const duration = Date.now() - startTime;
      
      this.log('success', `✅ ${testName} PASSED`, { duration: `${duration}ms`, result });
      return true;
    } catch (error) {
      this.log('error', `❌ ${testName} FAILED`, { error: error.message, stack: error.stack });
      return false;
    }
  }

  /**
   * Test 1: Security files exist and are loadable
   */
  async testSecurityFilesExist() {
    const requiredFiles = [
      'src/aicf-stream-reader.js',
      'src/pii-detector.js',
      'src/aicf-secure-writer.js', 
      'src/security-fixes.js',
      'src/aicf-encryption.js'
    ];

    const results = {};
    
    for (const filePath of requiredFiles) {
      if (!fs.existsSync(filePath)) {
        throw new Error(`Required security file missing: ${filePath}`);
      }
      
      // Try to require the file to check for syntax errors
      try {
        delete require.cache[require.resolve(path.resolve(filePath))];
        require(path.resolve(filePath));
        results[filePath] = 'loaded successfully';
      } catch (error) {
        throw new Error(`Failed to load ${filePath}: ${error.message}`);
      }
    }
    
    return results;
  }

  /**
   * Test 2: Basic AICF operations work
   */
  async testBasicAICFOperations() {
    // Clean test environment
    if (fs.existsSync(this.testDir)) {
      fs.rmSync(this.testDir, { recursive: true, force: true });
    }
    fs.mkdirSync(this.testDir, { recursive: true });

    // Test basic reader/writer functionality
    const AICFSecure = require(path.resolve('src/aicf-secure.js'));
    const aicf = new AICFSecure(this.testDir);

    // Test conversation creation
    const testConversation = {
      id: 'smoke-test-conversation',
      messages: 10,
      tokens: 500,
      timestamp_start: new Date().toISOString(),
      metadata: { test: true }
    };

    await aicf.appendConversation(testConversation);

    // Test conversation reading
    const conversations = await aicf.getConversations();
    if (!conversations.some(c => c.id === 'smoke-test-conversation')) {
      throw new Error('Failed to read back written conversation');
    }

    // Test insight addition
    await aicf.addInsight({
      text: 'Test insight for smoke testing',
      category: 'TESTING',
      priority: 'MEDIUM',
      confidence: 'HIGH'
    });

    const insights = await aicf.getInsights();
    if (insights.length === 0) {
      throw new Error('Failed to read back written insights');
    }

    return { conversations: conversations.length, insights: insights.length };
  }

  /**
   * Test 3: PII detection works
   */
  async testPIIDetection() {
    const PIIDetector = require(path.resolve('src/pii-detector.js'));
    const detector = new PIIDetector();

    const testText = "Contact John Doe at john.doe@example.com or 555-123-4567. His SSN is 123-45-6789.";
    const result = detector.redact(testText);

    if (result.detections === 0) {
      throw new Error('PII detection did not find any PII in test text');
    }

    const expectedTypes = ['email', 'phone', 'ssn'];
    const foundTypes = result.types || [];
    
    for (const expectedType of expectedTypes) {
      if (!foundTypes.includes(expectedType)) {
        throw new Error(`PII detection missed ${expectedType} in test text`);
      }
    }

    return { detectedTypes: foundTypes, redactedText: result.text };
  }

  /**
   * Test 4: Path traversal protection works
   */
  async testPathTraversalProtection() {
    const AICFSecurityFixes = require(path.resolve('src/security-fixes.js'));

    const maliciousPaths = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32',
      '/etc/passwd',
      'C:\\Windows\\System32'
    ];

    const results = {};
    
    for (const maliciousPath of maliciousPaths) {
      try {
        AICFSecurityFixes.validatePath(maliciousPath);
        throw new Error(`Path validation should have rejected: ${maliciousPath}`);
      } catch (error) {
        if (error.message.includes('Security violation')) {
          results[maliciousPath] = 'correctly rejected';
        } else {
          throw error;
        }
      }
    }

    // Test valid path acceptance
    const validPath = path.join(this.testDir, 'valid-file.txt');
    const normalizedPath = AICFSecurityFixes.validatePath(validPath);
    if (!normalizedPath) {
      throw new Error('Valid path was incorrectly rejected');
    }

    return results;
  }

  /**
   * Test 5: Memory usage is reasonable
   */
  async testMemoryUsage() {
    const initialMemory = process.memoryUsage();
    
    // Create large test data
    const AICFSecure = require(path.resolve('src/aicf-secure.js'));
    const aicf = new AICFSecure(this.testDir);

    // Add multiple conversations
    for (let i = 0; i < 100; i++) {
      await aicf.appendConversation({
        id: `memory-test-${i}`,
        messages: 50,
        tokens: 2500,
        timestamp_start: new Date().toISOString(),
        metadata: { data: 'x'.repeat(1000) } // 1KB per conversation
      });
    }

    const finalMemory = process.memoryUsage();
    const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
    const memoryIncreaseMB = memoryIncrease / 1024 / 1024;

    // Memory increase should be reasonable (less than 50MB for 100 conversations)
    if (memoryIncreaseMB > 50) {
      throw new Error(`Memory usage too high: ${memoryIncreaseMB.toFixed(2)}MB increase`);
    }

    return { 
      memoryIncreaseMB: memoryIncreaseMB.toFixed(2),
      conversationsProcessed: 100 
    };
  }

  /**
   * Test 6: Performance is acceptable
   */
  async testPerformance() {
    const AICFSecure = require(path.resolve('src/aicf-secure.js'));
    const aicf = new AICFSecure(this.testDir);

    // Test write performance
    const writeStartTime = Date.now();
    for (let i = 0; i < 50; i++) {
      await aicf.appendConversation({
        id: `perf-test-${i}`,
        messages: 25,
        tokens: 1250,
        timestamp_start: new Date().toISOString()
      });
    }
    const writeTime = Date.now() - writeStartTime;

    // Test read performance
    const readStartTime = Date.now();
    const conversations = await aicf.getConversations();
    const readTime = Date.now() - readStartTime;

    // Performance targets: < 2 seconds for 50 writes, < 500ms for reads
    if (writeTime > 2000) {
      throw new Error(`Write performance too slow: ${writeTime}ms for 50 operations`);
    }

    if (readTime > 500) {
      throw new Error(`Read performance too slow: ${readTime}ms`);
    }

    return {
      writeTimeMs: writeTime,
      readTimeMs: readTime,
      conversationsRead: conversations.length,
      writeOpsPerSecond: Math.round(50000 / writeTime)
    };
  }

  /**
   * Test 7: Error handling works correctly
   */
  async testErrorHandling() {
    const AICFSecure = require(path.resolve('src/aicf-secure.js'));
    
    // Test invalid directory
    try {
      new AICFSecure('/invalid/directory/that/does/not/exist');
      throw new Error('Should have failed with invalid directory');
    } catch (error) {
      if (!error.message.includes('directory') && !error.message.includes('path')) {
        throw new Error('Wrong error type for invalid directory');
      }
    }

    // Test invalid conversation data
    const aicf = new AICFSecure(this.testDir);
    try {
      await aicf.appendConversation({ invalid: 'data' });
      throw new Error('Should have failed with invalid conversation data');
    } catch (error) {
      if (!error.message.includes('Required') && !error.message.includes('validation')) {
        throw new Error('Wrong error type for invalid data');
      }
    }

    return { errorHandlingWorking: true };
  }

  /**
   * Cleanup test environment
   */
  cleanup() {
    if (fs.existsSync(this.testDir)) {
      fs.rmSync(this.testDir, { recursive: true, force: true });
    }
  }

  /**
   * Generate test report
   */
  generateReport() {
    const duration = Date.now() - this.startTime;
    const passed = this.testResults.filter(r => r.level === 'success').length;
    const failed = this.testResults.filter(r => r.level === 'error').length;
    const total = passed + failed;

    const report = {
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      summary: {
        total,
        passed,
        failed,
        successRate: `${Math.round((passed / total) * 100)}%`
      },
      results: this.testResults
    };

    // Save report to file
    const reportFile = path.join(process.cwd(), 'smoke-test-report.json');
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

    return report;
  }

  /**
   * Run all smoke tests
   */
  async runAllTests() {
    this.log('info', '🚀 Starting AICF v3.1.1 Smoke Tests...');

    const tests = [
      ['Security Files Exist', () => this.testSecurityFilesExist()],
      ['Basic AICF Operations', () => this.testBasicAICFOperations()],
      ['PII Detection', () => this.testPIIDetection()],
      ['Path Traversal Protection', () => this.testPathTraversalProtection()],
      ['Memory Usage', () => this.testMemoryUsage()],
      ['Performance', () => this.testPerformance()],
      ['Error Handling', () => this.testErrorHandling()]
    ];

    let allPassed = true;

    for (const [testName, testFn] of tests) {
      const passed = await this.runTest(testName, testFn);
      if (!passed) {
        allPassed = false;
      }
    }

    // Cleanup
    this.cleanup();

    // Generate report
    const report = this.generateReport();

    if (allPassed) {
      this.log('success', '🎉 All smoke tests PASSED!', report.summary);
      console.log('\n✅ AICF v3.1.1 is ready for production deployment!');
    } else {
      this.log('error', '💥 Some smoke tests FAILED!', report.summary);
      console.log('\n❌ Do NOT deploy to production until all tests pass!');
      process.exit(1);
    }

    return report;
  }
}

// Run smoke tests if called directly
if (require.main === module) {
  const smokeTests = new AICFSmokeTests();
  smokeTests.runAllTests().catch(error => {
    console.error('Smoke tests crashed:', error);
    process.exit(1);
  });
}

module.exports = { AICFSmokeTests };