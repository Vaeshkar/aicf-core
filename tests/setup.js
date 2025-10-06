/**
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (c) 2025 Dennis van Leeuwen
 * 
 * Jest Global Test Setup
 */

const fs = require('fs-extra');
const path = require('path');

// Global test utilities
global.testUtils = {
  // Create temporary test directory
  createTempDir: () => {
    const tempDir = path.join(__dirname, 'temp', `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
    fs.ensureDirSync(tempDir);
    return tempDir;
  },

  // Clean up temporary directory
  cleanupTempDir: (dirPath) => {
    if (fs.existsSync(dirPath)) {
      fs.removeSync(dirPath);
    }
  },

  // Create valid AICF v3.0 test data
  createValidAICF: (conversationId = 'test_001') => {
    return [
      '1|@AICF_VERSION',
      '2|version=3.0',
      '3|',
      `4|@CONVERSATION:${conversationId}`,
      '5|timestamp_start=2025-01-06T10:00:00Z',
      '6|timestamp_end=2025-01-06T10:05:00Z',
      '7|messages=3',
      '8|tokens=150',
      '9|platform=test',
      '10|',
      '11|@STATE',
      '12|status=completed',
      '13|actions=unit_testing',
      '14|flow=setup|execute|validate',
      '15|',
      '16|@INSIGHTS',
      '17|@INSIGHTS testing_framework_setup|TECHNICAL|HIGH|HIGH',
      '18|@INSIGHTS jest_configuration_complete|IMPLEMENTATION|MEDIUM|HIGH',
      '19|',
      '20|@DECISIONS',
      '21|@DECISIONS adopt_comprehensive_testing|HIGH|HIGH|quality_assurance_required',
      '22|'
    ].join('\n');
  },

  // Create malformed AICF data for testing
  createMalformedAICF: () => {
    return [
      '1|@AICF_VERSION',
      '2|version=3.0',
      '3|',
      '4|@CONVERSATION:malformed',
      '5|timestamp_start=invalid_timestamp',  // Invalid timestamp
      'invalid_line_format',  // Missing line number
      '7|messages=not_a_number',  // Invalid number
      '8|'
    ].join('\n');
  },

  // Create truncated AICF data
  createTruncatedAICF: () => {
    return [
      '1|@AICF_VERSION',
      '2|version=3.0',
      '3|',
      '4|@CONVERSATION:truncated'
      // Truncated - missing required fields
    ].join('\n');
  },

  // Measure compression ratio
  measureCompression: (original, compressed) => {
    const originalSize = Buffer.byteLength(original, 'utf8');
    const compressedSize = Buffer.byteLength(compressed, 'utf8');
    const ratio = ((originalSize - compressedSize) / originalSize) * 100;
    return {
      originalSize,
      compressedSize,
      compressionRatio: Math.round(ratio * 10) / 10,
      compressionBytes: originalSize - compressedSize
    };
  },

  // Performance timer
  performanceTimer: () => {
    const start = process.hrtime.bigint();
    return {
      stop: () => {
        const end = process.hrtime.bigint();
        return Number(end - start) / 1000000; // Convert to milliseconds
      }
    };
  },

  // Generate large test data
  generateLargeConversationData: (messageCount = 1000) => {
    const messages = [];
    for (let i = 1; i <= messageCount; i++) {
      messages.push({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Test message ${i} with some realistic content that would appear in an AI conversation. This includes technical discussions, code examples, and decision making processes.`,
        timestamp: new Date(Date.now() + i * 1000).toISOString()
      });
    }
    return messages;
  }
};

// Global test constants
global.TEST_CONSTANTS = {
  VALID_VERSION: '3.0',
  TARGET_COMPRESSION_RATIO: 95.5,
  MAX_READ_TIME_MS: 1,
  MAX_WRITE_TIME_MS: 3,
  TEST_TIMEOUT_MS: 5000
};

// Console setup for cleaner test output
const originalConsoleError = console.error;
console.error = (...args) => {
  // Suppress expected error messages during testing
  if (args[0] && typeof args[0] === 'string' && args[0].includes('AICF_TEST_EXPECTED_ERROR')) {
    return;
  }
  originalConsoleError.apply(console, args);
};

// Cleanup after all tests
afterAll(async () => {
  const tempTestDir = path.join(__dirname, 'temp');
  if (fs.existsSync(tempTestDir)) {
    await fs.remove(tempTestDir);
  }
});

console.log('🧪 AICF-Core Test Setup Complete - Enterprise-Grade Testing Infrastructure Ready!');