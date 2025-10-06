#!/usr/bin/env node

/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (c) 2025 Dennis van Leeuwen
 */

/**
 * AICF Simple Integration Tests
 * Focused on core security features that are actually implemented
 */

const fs = require('fs');
const path = require('path');
const AICFWriter = require('../src/aicf-writer');
const AICFReader = require('../src/aicf-reader');
const PIIDetector = require('../src/pii-detector');

const TEST_DIR = '.test-aicf-simple';
let passed = 0;
let failed = 0;

function log(msg, type = 'info') {
  const colors = { info: '\x1b[36m', success: '\x1b[32m', error: '\x1b[31m' };
  console.log(`${colors[type]}${msg}\x1b[0m`);
}

function assert(condition, name) {
  if (condition) {
    passed++;
    log(`✅ PASS: ${name}`, 'success');
  } else {
    failed++;
    log(`❌ FAIL: ${name}`, 'error');
  }
}

function cleanup() {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
}

async function runTests() {
  log('🧪 AICF Simple Integration Tests\n', 'info');
  
  cleanup();
  fs.mkdirSync(TEST_DIR, { recursive: true });
  
  try {
    // Test 1: Path Traversal Prevention
    log('\n🔒 Test 1: Path Traversal Prevention', 'info');
    try {
      new AICFWriter('../../../etc/passwd');
      assert(false, 'Should block directory traversal');
    } catch (e) {
      assert(e.message.includes('Security violation'), 'Blocks directory traversal');
    }
    
    try {
      new AICFWriter('/etc/passwd');
      assert(false, 'Should block absolute paths');
    } catch (e) {
      assert(e.message.includes('Security violation'), 'Blocks absolute paths');
    }
    
    try {
      new AICFWriter(TEST_DIR);
      assert(true, 'Allows valid relative paths');
    } catch (e) {
      assert(false, 'Allows valid relative paths');
    }
    
    // Test 2: Basic Write/Read Operations
    log('\n📝 Test 2: Basic Write/Read Operations', 'info');
    const writer = new AICFWriter(TEST_DIR);
    const reader = new AICFReader(TEST_DIR);
    
    await writer.appendConversation({
      id: 'test_conv_1',
      messages: 5,
      tokens: 100
    });
    
    const conversations = reader.getLastConversations(1);
    assert(conversations.length === 1, 'Writes and reads conversations');
    assert(conversations[0].id === 'test_conv_1', 'Preserves conversation ID');
    
    // Test 3: Concurrent Writes
    log('\n⚡ Test 3: Concurrent Writes', 'info');
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(writer.appendConversation({
        id: `concurrent_${i}`,
        messages: i,
        tokens: i * 10
      }));
    }
    
    await Promise.all(promises);
    const allConvs = reader.getLastConversations(20);
    assert(allConvs.length >= 10, 'Handles 10 concurrent writes');
    
    // Test 4: PII Detection
    log('\n🔒 Test 4: PII Detection', 'info');
    const detector = new PIIDetector();
    
    const ssnText = 'SSN: 123-45-6789';
    const ssnDetections = detector.detect(ssnText);
    assert(ssnDetections.length > 0, 'Detects SSN');
    
    const emailText = 'Email: test@example.com';
    const emailDetections = detector.detect(emailText);
    assert(emailDetections.length > 0, 'Detects email');
    
    const ccText = 'Card: 4532-1234-5678-9010';
    const ccDetections = detector.detect(ccText);
    assert(ccDetections.length > 0, 'Detects credit card');
    
    // Test 5: PII Redaction
    log('\n🔒 Test 5: PII Redaction', 'info');
    const multiPII = 'SSN: 123-45-6789, Email: test@example.com';
    const redacted = detector.redact(multiPII);
    assert(redacted.detections === 2, 'Detects multiple PII types');
    assert(!redacted.text.includes('123-45-6789'), 'Redacts SSN');
    assert(!redacted.text.includes('test@example.com'), 'Redacts email');
    
    // Test 6: Large File Handling (Memory Test)
    log('\n⚡ Test 6: Large File Handling', 'info');
    const memBefore = process.memoryUsage().heapUsed;
    
    // Write 1000 conversations
    for (let i = 0; i < 1000; i++) {
      await writer.appendConversation({
        id: `large_test_${i}`,
        messages: 10,
        tokens: 1000,
        metadata: { description: 'x'.repeat(1000) }
      });
    }
    
    const memAfter = process.memoryUsage().heapUsed;
    const memIncrease = (memAfter - memBefore) / (1024 * 1024);
    assert(memIncrease < 50, `Memory increase < 50MB (actual: ${memIncrease.toFixed(2)}MB)`);
    
    // Test 7: Input Validation
    log('\n🔒 Test 7: Input Validation', 'info');
    try {
      await writer.appendConversation({
        id: 'test_validation',
        messages: 'invalid', // Should be number
        tokens: 100
      });
      // Should not throw, should coerce
      assert(true, 'Handles invalid input types gracefully');
    } catch (e) {
      // Or throws validation error
      assert(e.message.includes('Validation'), 'Validates input types');
    }
    
    // Print Results
    log('\n📊 Test Results:', 'info');
    log(`✅ Passed: ${passed}`, 'success');
    log(`❌ Failed: ${failed}`, failed > 0 ? 'error' : 'success');
    log(`🎯 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%\n`, 'info');
    
    if (failed === 0) {
      log('🎉 All tests passed!', 'success');
    } else {
      log('⚠️  Some tests failed', 'error');
    }
    
  } catch (error) {
    log(`\n💥 Test error: ${error.message}`, 'error');
    console.error(error);
  } finally {
    cleanup();
  }
  
  process.exit(failed > 0 ? 1 : 0);
}

runTests();

