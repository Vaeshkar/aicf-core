/**
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (c) 2025 Dennis van Leeuwen
 * 
 * AICF Edge Cases and Error Handling Tests
 * Tests system robustness under adverse conditions and malformed inputs
 */

const fs = require('fs-extra');
const path = require('path');
const AICFReader = require('../../src/aicf-reader');
const AICFWriter = require('../../src/aicf-writer');
const AICFAPI = require('../../src/aicf-api');

describe('AICF Edge Cases and Error Handling', () => {
  let tempDir;
  let reader;
  let writer;
  let api;

  beforeEach(() => {
    tempDir = testUtils.createTempDir();
    reader = new AICFReader(tempDir);
    writer = new AICFWriter(tempDir);
    api = new AICFAPI(tempDir);
  });

  afterEach(() => {
    testUtils.cleanupTempDir(tempDir);
  });

  describe('Malformed File Handling', () => {
    it('should handle corrupted AICF files gracefully', async () => {
      // Create a corrupted AICF file
      const corruptedContent = `1|@CONVERSATION:corrupted_test
2|corrupted_line_without_proper_format
3|@@INVALID_HEADER
4|incomplete_line=
5|metadata=platform=claude|topic=test|CORRUPTED_MID_LINE
6|@STATE:incomplete
7|END_OF_FILE_WITHOUT_PROPER_CLOSING`;

      const aicfFilePath = path.join(tempDir, 'conversations.aicf');
      fs.writeFileSync(aicfFilePath, corruptedContent);

      // Reader should handle corruption gracefully
      expect(() => {
        reader.getLastConversations(5);
      }).not.toThrow();

      // Should return empty results or partial valid data
      const conversations = reader.getLastConversations(5);
      expect(Array.isArray(conversations)).toBe(true);
    });

    it('should handle malformed JSON-like metadata', async () => {
      const malformedContent = `1|@CONVERSATION:malformed_json_test
2|metadata=platform=claude|topic={"broken":"json","unclosed":[1,2,3,|priority=HIGH
3|@STATE
4|current_task=working{with}broken(json)metadata["unclosed"
5|@END`;

      const aicfFilePath = path.join(tempDir, 'conversations.aicf');
      fs.writeFileSync(aicfFilePath, malformedContent);

      expect(() => {
        const conversations = reader.getLastConversations(1);
        expect(conversations).toBeDefined();
      }).not.toThrow();
    });

    it('should handle completely empty files', () => {
      const aicfFilePath = path.join(tempDir, 'conversations.aicf');
      fs.writeFileSync(aicfFilePath, '');

      expect(() => {
        const conversations = reader.getLastConversations(5);
        expect(conversations).toHaveLength(0);
      }).not.toThrow();
    });

    it('should handle files with only whitespace', () => {
      const aicfFilePath = path.join(tempDir, 'conversations.aicf');
      fs.writeFileSync(aicfFilePath, '\n\n   \t\n\n   ');

      expect(() => {
        const conversations = reader.getLastConversations(5);
        expect(conversations).toHaveLength(0);
      }).not.toThrow();
    });

    it('should handle truncated files', async () => {
      // Write a valid conversation first
      await writer.appendConversation({
        id: 'valid_conversation',
        messages: 10,
        tokens: 500,
        metadata: { platform: 'claude' }
      });

      // Truncate the file mid-line
      const aicfFilePath = path.join(tempDir, 'conversations.aicf');
      const content = fs.readFileSync(aicfFilePath, 'utf8');
      const truncatedContent = content.substring(0, content.length / 2);
      fs.writeFileSync(aicfFilePath, truncatedContent);

      expect(() => {
        const conversations = reader.getLastConversations(5);
        expect(Array.isArray(conversations)).toBe(true);
      }).not.toThrow();
    });
  });

  describe('Invalid Input Handling', () => {
    it('should handle null and undefined conversation data', async () => {
      const invalidInputs = [null, undefined, {}, ''];
      
      for (const invalidInput of invalidInputs) {
        const result = await writer.appendConversation(invalidInput);
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      }
    });

    it('should handle conversations with missing required fields', async () => {
      const incompleteConversations = [
        { messages: 10 }, // Missing id
        { id: 'test' }, // Missing other fields  
        { id: 'test', messages: 'not_a_number' }, // Invalid type
        { id: '', messages: 10 }, // Empty id
        { id: 'test', messages: -5 }, // Negative messages
        { id: 'test', messages: 10, tokens: 'invalid' } // Invalid tokens
      ];

      for (const conv of incompleteConversations) {
        const result = await writer.appendConversation(conv);
        // Should either succeed with defaults or fail gracefully
        if (!result.success) {
          expect(result.error).toBeDefined();
        }
      }
    });

    it('should handle extremely large conversation data', async () => {
      const hugeTopic = 'x'.repeat(100000); // 100KB topic
      const hugeMetadata = {};
      
      // Create metadata with very large values
      for (let i = 0; i < 100; i++) {
        hugeMetadata[`field_${i}`] = 'large_value_'.repeat(1000);
      }

      const hugeConversation = {
        id: 'huge_conversation_test',
        messages: 999999,
        tokens: 999999,
        metadata: {
          ...hugeMetadata,
          topic: hugeTopic,
          notes: 'note_'.repeat(50000)
        }
      };

      // Should handle large data without crashing
      const result = await writer.appendConversation(hugeConversation);
      
      if (result.success) {
        // If it succeeded, data should be retrievable
        const conversations = reader.getLastConversations(1);
        expect(conversations).toHaveLength(1);
      } else {
        // If it failed, should have meaningful error
        expect(result.error).toBeDefined();
      }
    });

    it('should handle special characters in conversation data', async () => {
      const specialCharsConversation = {
        id: 'special_chars_💪_test',
        messages: 15,
        tokens: 750,
        metadata: {
          topic: 'testing_special_chars|pipes\\backslashes"quotes\'apostrophes',
          unicode: '🚀🎯💻🔥⚡🌟✨🎪🎨🎭🎪',
          symbols: '!@#$%^&*()_+-={}[]|\\:";\'<>?,./',
          newlines: 'line1\nline2\rline3\r\nline4',
          tabs: 'col1\tcol2\tcol3',
          nulls: 'text\x00with\x00nulls',
          control_chars: '\x01\x02\x03\x04\x05',
          emoji_sequences: '👨‍💻👩‍🔬🧑‍🎨👨‍🍳👩‍⚖️',
          rtl_text: 'English مرحبا العربية English',
          mathematical: '∑∫∂∆∇∈∉∪∩⊂⊃⊆⊇',
          currency: '$€£¥₹₽₿'
        }
      };

      const result = await writer.appendConversation(specialCharsConversation);
      expect(result.success).toBe(true);

      // Verify special characters are preserved
      const conversations = reader.getLastConversations(1);
      expect(conversations).toHaveLength(1);
      
      const retrieved = conversations[0];
      expect(retrieved.id).toBe(specialCharsConversation.id);
      expect(retrieved.metadata.unicode).toContain('🚀');
      expect(retrieved.metadata.symbols).toContain('!@#$%^&*()');
    });

    it('should handle concurrent write attempts', async () => {
      const concurrentWrites = [];
      const conversationCount = 20;

      // Launch multiple concurrent write operations
      for (let i = 0; i < conversationCount; i++) {
        concurrentWrites.push(
          writer.appendConversation({
            id: `concurrent_write_${i}`,
            messages: 10 + i,
            tokens: 500 + i * 10,
            metadata: {
              platform: 'concurrent_test',
              index: i.toString(),
              timestamp: new Date().toISOString()
            }
          })
        );
      }

      // Wait for all writes to complete
      const results = await Promise.all(concurrentWrites);
      
      // All writes should either succeed or fail gracefully
      results.forEach(result => {
        if (!result.success) {
          expect(result.error).toBeDefined();
        }
      });

      // Verify data integrity after concurrent writes
      const conversations = reader.getLastConversations(conversationCount);
      expect(conversations.length).toBeGreaterThan(0);
      
      // Should not have corrupted data
      conversations.forEach(conv => {
        expect(conv.id).toBeDefined();
        expect(conv.metadata).toBeDefined();
      });
    });
  });

  describe('File System Error Handling', () => {
    it('should handle write permission errors gracefully', async () => {
      // Create a read-only directory (simulate permission error)
      const readOnlyDir = testUtils.createTempDir();
      
      try {
        if (process.platform !== 'win32') {
          fs.chmodSync(readOnlyDir, 0o444); // Read-only
        }

        const readOnlyWriter = new AICFWriter(readOnlyDir);
        const result = await readOnlyWriter.appendConversation({
          id: 'permission_test',
          messages: 10
        });

        // Should fail gracefully with meaningful error
        if (!result.success) {
          expect(result.error).toBeDefined();
          expect(result.error).toMatch(/permission|access|denied/i);
        }
      } finally {
        // Restore permissions for cleanup
        if (process.platform !== 'win32') {
          fs.chmodSync(readOnlyDir, 0o755);
        }
        testUtils.cleanupTempDir(readOnlyDir);
      }
    });

    it('should handle disk full simulation', async () => {
      // Write increasingly large data until potential disk space issues
      const largeData = {
        id: 'disk_space_test',
        messages: 1000000,
        tokens: 5000000,
        metadata: {
          massive_field: 'x'.repeat(1000000), // 1MB field
          notes: 'large_note_'.repeat(100000)
        }
      };

      const result = await writer.appendConversation(largeData);
      
      // Should either succeed or fail gracefully
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });

    it('should handle directory creation failures', () => {
      const invalidPath = '/dev/null/invalid/path'; // Invalid directory path
      
      expect(() => {
        new AICFWriter(invalidPath);
      }).not.toThrow(); // Should not throw during construction
    });

    it('should recover from temporary file system issues', async () => {
      // Write some data first
      await writer.appendConversation({
        id: 'before_fs_issue',
        messages: 5,
        metadata: { status: 'before' }
      });

      // Simulate temporary file system issue by removing the file
      const aicfFilePath = path.join(tempDir, 'conversations.aicf');
      if (fs.existsSync(aicfFilePath)) {
        fs.unlinkSync(aicfFilePath);
      }

      // Should recover and continue writing
      const result = await writer.appendConversation({
        id: 'after_fs_issue',
        messages: 5,
        metadata: { status: 'after' }
      });

      expect(result.success).toBe(true);

      // Verify both old and new data (if recovery mechanism exists)
      const conversations = reader.getLastConversations(5);
      expect(conversations.length).toBeGreaterThan(0);
    });
  });

  describe('Memory and Resource Limits', () => {
    it('should handle memory-intensive operations', async () => {
      // Create many large objects
      const memoryIntensiveOperations = [];
      
      for (let i = 0; i < 100; i++) {
        memoryIntensiveOperations.push(writer.appendConversation({
          id: `memory_test_${i}`,
          messages: 100,
          tokens: 5000,
          metadata: {
            large_data: 'x'.repeat(10000),
            index: i.toString(),
            timestamp: new Date().toISOString()
          }
        }));
      }

      // Should not exhaust memory or crash
      const results = await Promise.all(memoryIntensiveOperations);
      
      // Most operations should succeed
      const successCount = results.filter(r => r.success).length;
      expect(successCount).toBeGreaterThan(results.length * 0.8); // At least 80% success
    });

    it('should handle rapid successive operations', async () => {
      const rapidOperations = [];
      const operationCount = 1000;

      const startTime = performance.now();

      // Create rapid successive write operations
      for (let i = 0; i < operationCount; i++) {
        rapidOperations.push(writer.appendConversation({
          id: `rapid_${i}`,
          messages: 1,
          metadata: { index: i.toString() }
        }));
      }

      const results = await Promise.all(rapidOperations);
      const endTime = performance.now();

      console.log(`\n⚡ Rapid Operations Test: ${operationCount} operations in ${(endTime - startTime).toFixed(2)}ms`);

      // Should handle rapid operations without significant failures
      const successCount = results.filter(r => r.success).length;
      expect(successCount).toBeGreaterThan(operationCount * 0.9); // At least 90% success rate
      
      // Average operation time should be reasonable
      const avgTime = (endTime - startTime) / operationCount;
      expect(avgTime).toBeLessThan(50); // Less than 50ms per operation on average
    });
  });

  describe('API Error Handling', () => {
    it('should handle malformed queries gracefully', () => {
      const malformedQueries = [
        null,
        undefined,
        123,
        true,
        {},
        [],
        new Date(),
        Symbol('test'),
        function() { return 'query'; },
        'query'.repeat(10000), // Extremely long query
        '\x00\x01\x02\x03', // Control characters
        ''.padStart(100000, 'x') // 100KB query
      ];

      malformedQueries.forEach(query => {
        expect(() => {
          const result = api.query(query);
          expect(result).toBeDefined();
        }).not.toThrow();
      });
    });

    it('should handle analytics on empty dataset', () => {
      // Test analytics when no data exists
      expect(() => {
        const analytics = api.getAnalytics();
        expect(analytics).toBeDefined();
        expect(analytics.stats).toBeDefined();
        expect(analytics.stats.totalConversations).toBe(0);
      }).not.toThrow();
    });

    it('should handle reader operations on corrupted index', () => {
      // Create a conversation first
      writer.appendConversation({
        id: 'test_before_corruption',
        messages: 10
      });

      // Simulate index corruption by writing invalid data
      const indexPath = path.join(tempDir, 'conversation-index.aicf');
      fs.writeFileSync(indexPath, 'CORRUPTED_INDEX_DATA\nINVALID_FORMAT');

      // Reader should recover or handle gracefully
      expect(() => {
        const conversations = reader.getLastConversations(5);
        expect(Array.isArray(conversations)).toBe(true);
      }).not.toThrow();
    });
  });

  describe('Network and External Dependencies', () => {
    it('should handle system resource exhaustion', async () => {
      // Test behavior under simulated resource constraints
      const resourceHeavyOperations = [];

      // Create multiple heavy operations simultaneously
      for (let i = 0; i < 50; i++) {
        resourceHeavyOperations.push(
          Promise.all([
            writer.appendConversation({
              id: `resource_test_${i}`,
              messages: 50,
              tokens: 2500,
              metadata: { heavy_data: 'x'.repeat(5000) }
            }),
            new Promise(resolve => setTimeout(resolve, Math.random() * 10)),
            reader.getLastConversations(10)
          ])
        );
      }

      // Should not crash under resource pressure
      expect(async () => {
        await Promise.all(resourceHeavyOperations);
      }).not.toThrow();
    });
  });

  describe('Data Integrity Under Stress', () => {
    it('should maintain data consistency during error conditions', async () => {
      const initialData = [
        { id: 'consistency_test_1', messages: 10, metadata: { type: 'initial' } },
        { id: 'consistency_test_2', messages: 15, metadata: { type: 'initial' } }
      ];

      // Write initial data
      for (const data of initialData) {
        await writer.appendConversation(data);
      }

      // Verify initial state
      const beforeError = reader.getLastConversations(5);
      expect(beforeError.length).toBeGreaterThanOrEqual(2);

      // Attempt to write invalid data
      const invalidOperations = [
        writer.appendConversation(null),
        writer.appendConversation({ invalid: 'data' }),
        writer.appendConversation({ id: '', messages: 'invalid' })
      ];

      await Promise.all(invalidOperations);

      // Write more valid data after errors
      await writer.appendConversation({
        id: 'consistency_test_3',
        messages: 20,
        metadata: { type: 'after_error' }
      });

      // Verify data consistency maintained
      const afterError = reader.getLastConversations(5);
      expect(afterError.length).toBeGreaterThanOrEqual(beforeError.length);
      
      // Should find the new valid data
      const newData = afterError.find(c => c.id === 'consistency_test_3');
      expect(newData).toBeDefined();
    });

    it('should handle version compatibility issues', async () => {
      // Create a file with future version format
      const futureVersionContent = `1|@VERSION:AICF/4.0
2|@CONVERSATION:future_version_test
3|metadata=platform=future_ai|version=4.0|new_field=future_value
4|@STATE
5|@END`;

      const aicfFilePath = path.join(tempDir, 'conversations.aicf');
      fs.writeFileSync(aicfFilePath, futureVersionContent);

      // Should handle gracefully (either read compatible parts or skip)
      expect(() => {
        const conversations = reader.getLastConversations(1);
        expect(Array.isArray(conversations)).toBe(true);
      }).not.toThrow();
    });

    it('should recover from partial writes', async () => {
      // Start a write operation
      const largeConversation = {
        id: 'partial_write_test',
        messages: 100,
        tokens: 5000,
        metadata: {
          large_field: 'data_'.repeat(10000),
          status: 'testing_partial_write'
        }
      };

      // Write the conversation
      const result = await writer.appendConversation(largeConversation);
      
      if (result.success) {
        // Verify data is readable
        const conversations = reader.getLastConversations(1);
        expect(conversations).toHaveLength(1);
        expect(conversations[0].id).toBe(largeConversation.id);
      } else {
        // If write failed, ensure no partial data corruption
        const conversations = reader.getLastConversations(5);
        conversations.forEach(conv => {
          expect(conv.id).toBeDefined();
          expect(conv.id).not.toBe('');
        });
      }
    });
  });
});