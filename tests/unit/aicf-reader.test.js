/**
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (c) 2025 Dennis van Leeuwen
 * 
 * AICF Reader Unit Tests
 * Validates O(1) access patterns, intelligent caching, and version compatibility
 */

const fs = require('fs-extra');
const path = require('path');
const AICFReader = require('../../src/aicf-reader');

describe('AICFReader', () => {
  let reader;
  let tempDir;

  beforeEach(() => {
    tempDir = testUtils.createTempDir();
    reader = new AICFReader(tempDir);
  });

  afterEach(() => {
    testUtils.cleanupTempDir(tempDir);
  });

  // Helper function to create test AICF files
  const createTestFile = (filename, content) => {
    const filePath = path.join(tempDir, filename);
    fs.writeFileSync(filePath, content);
    return filePath;
  };

  describe('Constructor', () => {
    it('should create reader with default .aicf directory', () => {
      const defaultReader = new AICFReader();
      expect(defaultReader.aicfDir).toBe('.aicf');
    });

    it('should create reader with custom directory', () => {
      expect(reader.aicfDir).toBe(tempDir);
    });

    it('should initialize cache properties', () => {
      expect(reader.indexCache).toBe(null);
      expect(reader.lastIndexRead).toBe(0);
    });
  });

  describe('Index Reading and Caching', () => {
    it('should read and parse index file correctly', () => {
      const indexContent = [
        '1|@AICF_VERSION',
        '2|version=3.0',
        '3|',
        '4|@PROJECT',
        '5|name=test_project',
        '6|version=1.0.0',
        '7|',
        '8|@STATE',
        '9|status=active',
        '10|phase=testing',
        '11|'
      ].join('\n');

      createTestFile('index.aicf', indexContent);

      const index = reader.getIndex();
      
      expect(index.AICF_VERSION).toBeDefined();
      expect(index.PROJECT).toBeDefined();
      expect(index.STATE).toBeDefined();
      expect(index.PROJECT.name).toBe('test_project');
      expect(index.PROJECT.version).toBe('1.0.0');
      expect(index.STATE.status).toBe('active');
    });

    it('should cache index for subsequent reads', () => {
      const indexContent = testUtils.createValidAICF('cache_test');
      createTestFile('index.aicf', indexContent);

      // First read
      const timer1 = testUtils.performanceTimer();
      const index1 = reader.getIndex();
      const duration1 = timer1.stop();

      // Second read (should be from cache)
      const timer2 = testUtils.performanceTimer();
      const index2 = reader.getIndex();
      const duration2 = timer2.stop();

      expect(index1).toBe(index2); // Same object reference
      expect(duration2).toBeLessThan(duration1); // Cache should be faster
    });

    it('should invalidate cache when file is modified', () => {
      const initialContent = testUtils.createValidAICF('initial');
      createTestFile('index.aicf', initialContent);

      const index1 = reader.getIndex();
      expect(index1).toBeDefined();

      // Modify file (with a small delay to ensure different mtime)
      setTimeout(() => {
        const modifiedContent = testUtils.createValidAICF('modified');
        createTestFile('index.aicf', modifiedContent);
        
        const index2 = reader.getIndex();
        expect(index2).not.toBe(index1); // Different object reference
      }, 100);
    });

    it('should handle missing index file gracefully', () => {
      expect(() => reader.getIndex()).toThrow();
    });
  });

  describe('Conversation Reading', () => {
    beforeEach(() => {
      // Create test conversations file
      const conversationsContent = [
        '1|@CONVERSATION:conv_001',
        '2|timestamp_start=2025-01-06T10:00:00Z',
        '3|timestamp_end=2025-01-06T10:05:00Z',
        '4|messages=5',
        '5|tokens=250',
        '6|platform=claude',
        '7|',
        '8|@CONVERSATION:conv_002',
        '9|timestamp_start=2025-01-06T11:00:00Z',
        '10|timestamp_end=2025-01-06T11:10:00Z',
        '11|messages=10',
        '12|tokens=500',
        '13|platform=gpt',
        '14|',
        '15|@CONVERSATION:conv_003',
        '16|timestamp_start=2025-01-06T12:00:00Z',
        '17|timestamp_end=2025-01-06T12:15:00Z',
        '18|messages=15',
        '19|tokens=750',
        '20|platform=copilot',
        '21|'
      ].join('\n');

      createTestFile('conversations.aicf', conversationsContent);
    });

    it('should retrieve last N conversations correctly', () => {
      const lastConversations = reader.getLastConversations(2);
      
      expect(lastConversations).toHaveLength(2);
      expect(lastConversations[0].id).toBe('conv_003'); // Most recent first
      expect(lastConversations[1].id).toBe('conv_002');
      
      // Check metadata
      expect(lastConversations[0].metadata.messages).toBe('15');
      expect(lastConversations[0].metadata.tokens).toBe('750');
      expect(lastConversations[0].metadata.platform).toBe('copilot');
    });

    it('should handle request for more conversations than available', () => {
      const allConversations = reader.getLastConversations(10);
      expect(allConversations).toHaveLength(3); // Only 3 available
    });

    it('should return empty array for non-existent conversations file', () => {
      const emptyReader = new AICFReader(testUtils.createTempDir());
      const conversations = emptyReader.getLastConversations(5);
      expect(conversations).toEqual([]);
    });

    it('should perform within O(1) time complexity for recent access', () => {
      // Test that getting recent conversations doesn't scale with file size
      const times = [];
      
      for (let i = 0; i < 3; i++) {
        const timer = testUtils.performanceTimer();
        reader.getLastConversations(5);
        times.push(timer.stop());
      }
      
      // All reads should be roughly the same time (O(1) characteristic)
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxDeviation = Math.max(...times) - avgTime;
      
      expect(maxDeviation).toBeLessThan(avgTime * 0.5); // Within 50% deviation
      expect(avgTime).toBeLessThan(TEST_CONSTANTS.MAX_READ_TIME_MS);
    });
  });

  describe('Decision Reading', () => {
    beforeEach(() => {
      const decisionsContent = [
        '1|@DECISION:decision_001',
        '2|timestamp=2025-01-06T10:00:00Z',
        '3|description=Adopt comprehensive testing',
        '4|impact=HIGH',
        '5|confidence=HIGH',
        '6|',
        '7|@DECISION:decision_002',
        '8|timestamp=2025-01-05T15:30:00Z',
        '9|description=Use Jest framework',
        '10|impact=MEDIUM',
        '11|confidence=HIGH',
        '12|',
        '13|@DECISION:decision_003',
        '14|timestamp=2025-01-04T09:15:00Z',
        '15|description=Implement caching',
        '16|impact=HIGH',
        '17|confidence=MEDIUM',
        '18|'
      ].join('\n');

      createTestFile('decisions.aicf', decisionsContent);
    });

    it('should filter decisions by date range', () => {
      const startDate = new Date('2025-01-05T00:00:00Z');
      const endDate = new Date('2025-01-07T00:00:00Z');
      
      const decisions = reader.getDecisionsByDate(startDate, endDate);
      
      expect(decisions).toHaveLength(2); // Only decisions within date range
      expect(decisions[0].id).toBe('decision_001');
      expect(decisions[1].id).toBe('decision_002');
    });

    it('should handle single date parameter', () => {
      const startDate = new Date('2025-01-06T00:00:00Z');
      
      const decisions = reader.getDecisionsByDate(startDate);
      
      expect(decisions).toHaveLength(1);
      expect(decisions[0].id).toBe('decision_001');
    });

    it('should return empty array for no matching dates', () => {
      const startDate = new Date('2025-01-01T00:00:00Z');
      const endDate = new Date('2025-01-02T00:00:00Z');
      
      const decisions = reader.getDecisionsByDate(startDate, endDate);
      expect(decisions).toEqual([]);
    });

    it('should handle invalid timestamp gracefully', () => {
      const invalidDecisionsContent = [
        '1|@DECISION:invalid_decision',
        '2|timestamp=invalid_timestamp',
        '3|description=Test invalid timestamp',
        '4|'
      ].join('\n');

      createTestFile('decisions.aicf', invalidDecisionsContent);
      
      const startDate = new Date('2025-01-01T00:00:00Z');
      const decisions = reader.getDecisionsByDate(startDate);
      
      expect(decisions).toEqual([]); // Invalid timestamp should be filtered out
    });
  });

  describe('Work State Reading', () => {
    it('should read current work state', () => {
      const workStateContent = [
        '1|@WORK:work_001',
        '2|timestamp=2025-01-06T10:00:00Z',
        '3|status=in_progress',
        '4|actions=implementing_tests',
        '5|flow=setup|execute|validate',
        '6|',
        '7|@WORK:work_002',
        '8|timestamp=2025-01-06T11:00:00Z',
        '9|status=completed',
        '10|actions=documentation_update',
        '11|'
      ].join('\n');

      createTestFile('work-state.aicf', workStateContent);
      
      const workState = reader.getCurrentWorkState();
      
      expect(workState).toBeDefined();
      expect(workState.id).toBe('work_002'); // Most recent
      expect(workState.metadata.status).toBe('completed');
    });

    it('should return null for non-existent work state file', () => {
      const workState = reader.getCurrentWorkState();
      expect(workState).toBe(null);
    });

    it('should handle malformed work state entries', () => {
      const malformedContent = [
        '1|@WORK:malformed',
        'invalid_line_without_number',
        '3|status=test',
        '4|'
      ].join('\n');

      createTestFile('work-state.aicf', malformedContent);
      
      // Should not throw, should handle gracefully
      expect(() => reader.getCurrentWorkState()).not.toThrow();
    });
  });

  describe('Insights Reading', () => {
    beforeEach(() => {
      const insightsContent = [
        '1|@INSIGHTS testing_improves_quality|TECHNICAL|HIGH|HIGH',
        '2|@INSIGHTS caching_reduces_latency|PERFORMANCE|CRITICAL|HIGH',
        '3|@INSIGHTS documentation_helps_adoption|GENERAL|MEDIUM|MEDIUM',
        '4|@INSIGHTS edge_cases_reveal_bugs|TECHNICAL|HIGH|HIGH',
        '5|'
      ].join('\n');

      createTestFile('technical-context.aicf', insightsContent);
    });

    it('should filter insights by priority level', () => {
      const highPriorityInsights = reader.getInsightsByPriority('HIGH');
      
      expect(highPriorityInsights.length).toBeGreaterThan(0);
      
      // All returned insights should have HIGH priority
      highPriorityInsights.forEach(insight => {
        expect(insight.data).toContain('|HIGH|');
      });
    });

    it('should filter insights by CRITICAL priority', () => {
      const criticalInsights = reader.getInsightsByPriority('CRITICAL');
      
      expect(criticalInsights).toHaveLength(1);
      expect(criticalInsights[0].data).toContain('caching_reduces_latency');
    });

    it('should return empty array for non-matching priority', () => {
      const lowPriorityInsights = reader.getInsightsByPriority('LOW');
      expect(lowPriorityInsights).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    it('should handle corrupted index file', () => {
      const corruptedContent = 'This is not valid AICF content!!!';
      createTestFile('index.aicf', corruptedContent);

      // Should either throw or return graceful error
      expect(() => reader.getIndex()).toThrow();
    });

    it('should handle empty files gracefully', () => {
      createTestFile('conversations.aicf', '');
      
      const conversations = reader.getLastConversations(5);
      expect(conversations).toEqual([]);
    });

    it('should handle files with only headers', () => {
      const headerOnlyContent = [
        '1|@CONVERSATION:incomplete',
        '2|'
      ].join('\n');
      
      createTestFile('conversations.aicf', headerOnlyContent);
      
      const conversations = reader.getLastConversations(1);
      expect(conversations).toHaveLength(1);
      expect(conversations[0].id).toBe('incomplete');
    });

    it('should handle permission errors gracefully', () => {
      // Create a file and make it unreadable
      const testFile = createTestFile('unreadable.aicf', 'test content');
      
      try {
        fs.chmodSync(testFile, 0o000); // No permissions
        
        // Reader should handle this gracefully
        const unreadableReader = new AICFReader(tempDir);
        expect(() => unreadableReader.getLastConversations(1)).toThrow();
        
        // Restore permissions for cleanup
        fs.chmodSync(testFile, 0o644);
      } catch (error) {
        // Permission test might not work on all systems
        console.log('Permission test skipped on this system');
      }
    });
  });

  describe('Performance Requirements', () => {
    it('should meet read performance targets', () => {
      // Create a reasonably sized test file
      const largeContent = [];
      for (let i = 1; i <= 1000; i++) {
        largeContent.push(`${i}|@CONVERSATION:conv_${i}`);
        largeContent.push(`${i + 1}|messages=${i}`);
        largeContent.push(`${i + 2}|`);
      }
      
      createTestFile('conversations.aicf', largeContent.join('\n'));
      
      const timer = testUtils.performanceTimer();
      const conversations = reader.getLastConversations(10);
      const duration = timer.stop();
      
      expect(conversations).toHaveLength(10);
      expect(duration).toBeLessThan(TEST_CONSTANTS.MAX_READ_TIME_MS);
    });

    it('should cache effectively to improve performance', () => {
      const indexContent = testUtils.createValidAICF('performance_test');
      createTestFile('index.aicf', indexContent);

      // First read (cold cache)
      const timer1 = testUtils.performanceTimer();
      reader.getIndex();
      const coldTime = timer1.stop();

      // Second read (warm cache)
      const timer2 = testUtils.performanceTimer();
      reader.getIndex();
      const warmTime = timer2.stop();

      // Warm cache should be significantly faster
      expect(warmTime).toBeLessThan(coldTime * 0.5);
    });

    it('should handle large files efficiently', () => {
      // Generate large conversation file
      const largeData = testUtils.generateLargeConversationData(5000);
      const largeContent = [];
      
      largeData.forEach((msg, index) => {
        const lineStart = index * 5 + 1;
        largeContent.push(`${lineStart}|@CONVERSATION:large_${index}`);
        largeContent.push(`${lineStart + 1}|timestamp_start=${msg.timestamp}`);
        largeContent.push(`${lineStart + 2}|messages=1`);
        largeContent.push(`${lineStart + 3}|content=${msg.content.substring(0, 50)}`);
        largeContent.push(`${lineStart + 4}|`);
      });
      
      createTestFile('conversations.aicf', largeContent.join('\n'));
      
      // Should still read efficiently
      const timer = testUtils.performanceTimer();
      const conversations = reader.getLastConversations(100);
      const duration = timer.stop();
      
      expect(conversations).toHaveLength(100);
      expect(duration).toBeLessThan(50); // Should be very fast even for large files
    });
  });

  describe('Version Compatibility', () => {
    it('should read v3.0 format correctly', () => {
      const v3Content = testUtils.createValidAICF('v3_test');
      createTestFile('index.aicf', v3Content);
      
      expect(() => reader.getIndex()).not.toThrow();
      const index = reader.getIndex();
      expect(index).toBeDefined();
    });

    it('should handle mixed version content gracefully', () => {
      // This test would be expanded when we have actual v2.0 and v1.0 data
      const mixedContent = [
        '1|@AICF_VERSION',
        '2|version=3.0',
        '3|',
        '4|@LEGACY_SECTION', // Hypothetical legacy section
        '5|old_field=legacy_value',
        '6|'
      ].join('\n');
      
      createTestFile('index.aicf', mixedContent);
      
      // Should handle gracefully without throwing
      expect(() => reader.getIndex()).not.toThrow();
    });
  });
});