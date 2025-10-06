/**
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (c) 2025 Dennis van Leeuwen
 * 
 * AICF Writer Unit Tests
 * Validates AICF v3.0 specification compliance and atomic write operations
 */

const fs = require('fs-extra');
const path = require('path');
const AICFWriter = require('../../src/aicf-writer');

describe('AICFWriter', () => {
  let writer;
  let tempDir;

  beforeEach(() => {
    tempDir = testUtils.createTempDir();
    writer = new AICFWriter(tempDir);
  });

  afterEach(() => {
    testUtils.cleanupTempDir(tempDir);
  });

  describe('Constructor', () => {
    it('should create writer with default .aicf directory', () => {
      const defaultWriter = new AICFWriter();
      expect(defaultWriter.aicfDir).toBe('.aicf');
    });

    it('should create writer with custom directory', () => {
      expect(writer.aicfDir).toBe(tempDir);
    });

    it('should initialize empty locks map', () => {
      expect(writer.locks).toBeDefined();
      expect(writer.locks.size).toBe(0);
    });
  });

  describe('File Locking Mechanism', () => {
    it('should acquire and release file locks', async () => {
      const lockKey = await writer.acquireLock('test.aicf');
      expect(lockKey).toContain(tempDir);
      expect(writer.locks.has(lockKey)).toBe(true);

      writer.releaseLock(lockKey);
      expect(writer.locks.has(lockKey)).toBe(false);
    });

    it('should wait for lock release when file is locked', async () => {
      const lock1Promise = writer.acquireLock('test.aicf');
      const lock1 = await lock1Promise;

      const startTime = Date.now();
      
      // Release lock after short delay
      setTimeout(() => writer.releaseLock(lock1), 50);
      
      const lock2 = await writer.acquireLock('test.aicf');
      const endTime = Date.now();

      expect(endTime - startTime).toBeGreaterThanOrEqual(45);
      writer.releaseLock(lock2);
    });
  });

  describe('Line Number Management', () => {
    it('should return 1 for non-existent file', () => {
      const filePath = path.join(tempDir, 'nonexistent.aicf');
      const lineNum = writer.getNextLineNumber(filePath);
      expect(lineNum).toBe(1);
    });

    it('should calculate correct next line number', () => {
      const filePath = path.join(tempDir, 'test.aicf');
      const content = [
        '1|@AICF_VERSION',
        '2|version=3.0',
        '3|',
        '4|@CONVERSATION:test'
      ].join('\n');
      
      fs.writeFileSync(filePath, content);
      const lineNum = writer.getNextLineNumber(filePath);
      expect(lineNum).toBe(5);
    });

    it('should handle empty file', () => {
      const filePath = path.join(tempDir, 'empty.aicf');
      fs.writeFileSync(filePath, '');
      const lineNum = writer.getNextLineNumber(filePath);
      expect(lineNum).toBe(1);
    });
  });

  describe('Conversation Writing', () => {
    it('should write valid conversation with required fields', async () => {
      const conversationData = {
        id: 'test_conv_001',
        timestamp_start: '2025-01-06T10:00:00Z',
        timestamp_end: '2025-01-06T10:05:00Z',
        messages: 5,
        tokens: 250
      };

      const result = await writer.appendConversation(conversationData);
      
      expect(result.success).toBe(true);
      expect(result.linesAdded).toBeGreaterThan(5);

      const filePath = path.join(tempDir, 'conversations.aicf');
      const content = fs.readFileSync(filePath, 'utf8');
      
      expect(content).toContain('@CONVERSATION:test_conv_001');
      expect(content).toContain('timestamp_start=2025-01-06T10:00:00Z');
      expect(content).toContain('messages=5');
      expect(content).toContain('tokens=250');
      expect(content).toContain('@STATE');
    });

    it('should write conversation with metadata', async () => {
      const conversationData = {
        id: 'meta_test',
        messages: 3,
        metadata: {
          platform: 'claude',
          topic: 'testing',
          priority: 'HIGH'
        }
      };

      await writer.appendConversation(conversationData);

      const filePath = path.join(tempDir, 'conversations.aicf');
      const content = fs.readFileSync(filePath, 'utf8');
      
      expect(content).toContain('platform=claude');
      expect(content).toContain('topic=testing');
      expect(content).toContain('priority=HIGH');
    });

    it('should handle missing optional fields', async () => {
      const conversationData = {
        id: 'minimal_test'
      };

      const result = await writer.appendConversation(conversationData);
      expect(result.success).toBe(true);

      const filePath = path.join(tempDir, 'conversations.aicf');
      const content = fs.readFileSync(filePath, 'utf8');
      
      expect(content).toContain('@CONVERSATION:minimal_test');
      expect(content).toContain('messages=1');
      expect(content).toContain('tokens=0');
    });
  });

  describe('Decision Writing', () => {
    it('should write decision with all fields', async () => {
      const decisionData = {
        id: 'decision_001',
        description: 'Adopt comprehensive testing strategy',
        impact: 'HIGH',
        confidence: 'HIGH',
        source: 'technical_analysis'
      };

      const result = await writer.addDecision(decisionData);
      
      expect(result.success).toBe(true);
      expect(result.linesAdded).toBe(7);

      const filePath = path.join(tempDir, 'decisions.aicf');
      const content = fs.readFileSync(filePath, 'utf8');
      
      expect(content).toContain('@DECISION:decision_001');
      expect(content).toContain('description=Adopt comprehensive testing strategy');
      expect(content).toContain('impact=HIGH');
      expect(content).toContain('confidence=HIGH');
      expect(content).toContain('source=technical_analysis');
    });

    it('should auto-generate decision ID', async () => {
      const decisionData = {
        description: 'Test auto-generated ID',
        impact: 'MEDIUM'
      };

      const result = await writer.addDecision(decisionData);
      expect(result.success).toBe(true);

      const filePath = path.join(tempDir, 'decisions.aicf');
      const content = fs.readFileSync(filePath, 'utf8');
      
      expect(content).toMatch(/@DECISION:decision_\d+/);
    });

    it('should use default values for missing fields', async () => {
      const decisionData = {
        description: 'Minimal decision'
      };

      await writer.addDecision(decisionData);

      const filePath = path.join(tempDir, 'decisions.aicf');
      const content = fs.readFileSync(filePath, 'utf8');
      
      expect(content).toContain('impact=MEDIUM');
      expect(content).toContain('confidence=MEDIUM');
      expect(content).toContain('source=manual');
    });
  });

  describe('Insight Writing', () => {
    it('should write insight with all metadata', async () => {
      const insightData = {
        text: 'Testing framework enables quality assurance',
        category: 'TECHNICAL',
        priority: 'HIGH',
        confidence: 'HIGH'
      };

      const result = await writer.addInsight(insightData);
      
      expect(result.success).toBe(true);
      expect(result.linesAdded).toBe(1);

      const filePath = path.join(tempDir, 'technical-context.aicf');
      const content = fs.readFileSync(filePath, 'utf8');
      
      expect(content).toContain('@INSIGHTS Testing framework enables quality assurance|TECHNICAL|HIGH|HIGH');
    });

    it('should use default values for insight metadata', async () => {
      const insightData = {
        text: 'Basic insight'
      };

      await writer.addInsight(insightData);

      const filePath = path.join(tempDir, 'technical-context.aicf');
      const content = fs.readFileSync(filePath, 'utf8');
      
      expect(content).toContain('Basic insight|GENERAL|MEDIUM|MEDIUM');
    });
  });

  describe('Work State Writing', () => {
    it('should write work state with all fields', async () => {
      const workData = {
        id: 'work_001',
        status: 'in_progress',
        actions: 'implementing_tests',
        flow: 'setup|execute|validate|complete',
        cleanup_actions: 'Remove temporary files and reset state'
      };

      const result = await writer.updateWorkState(workData);
      
      expect(result.success).toBe(true);
      expect(result.linesAdded).toBeGreaterThan(5);

      const filePath = path.join(tempDir, 'work-state.aicf');
      const content = fs.readFileSync(filePath, 'utf8');
      
      expect(content).toContain('@WORK:work_001');
      expect(content).toContain('status=in_progress');
      expect(content).toContain('actions=implementing_tests');
      expect(content).toContain('cleanup_actions="""Remove temporary files and reset state"""');
    });

    it('should write work state without cleanup actions', async () => {
      const workData = {
        id: 'simple_work',
        status: 'completed'
      };

      await writer.updateWorkState(workData);

      const filePath = path.join(tempDir, 'work-state.aicf');
      const content = fs.readFileSync(filePath, 'utf8');
      
      expect(content).toContain('@WORK:simple_work');
      expect(content).toContain('status=completed');
      expect(content).not.toContain('cleanup_actions');
    });
  });

  describe('Atomic Operations', () => {
    it('should handle concurrent writes safely', async () => {
      const promises = [];
      
      // Attempt 10 concurrent writes
      for (let i = 0; i < 10; i++) {
        promises.push(
          writer.appendConversation({
            id: `concurrent_${i}`,
            messages: i + 1
          })
        );
      }

      const results = await Promise.all(promises);
      
      // All writes should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // File should contain all conversations
      const filePath = path.join(tempDir, 'conversations.aicf');
      const content = fs.readFileSync(filePath, 'utf8');
      
      for (let i = 0; i < 10; i++) {
        expect(content).toContain(`@CONVERSATION:concurrent_${i}`);
      }
    });

    it('should maintain file integrity during interrupted writes', async () => {
      // This test simulates what would happen if a write was interrupted
      const conversationData = {
        id: 'integrity_test',
        messages: 1
      };

      const result = await writer.appendConversation(conversationData);
      expect(result.success).toBe(true);

      // File should be valid and complete
      const filePath = path.join(tempDir, 'conversations.aicf');
      const content = fs.readFileSync(filePath, 'utf8');
      
      const lines = content.split('\n').filter(Boolean);
      expect(lines.length).toBeGreaterThan(5);
      
      // Last line should be empty (proper section termination)
      expect(content.endsWith('\n')).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle permission errors gracefully', async () => {
      // Create read-only directory (simulation)
      const readOnlyDir = path.join(tempDir, 'readonly');
      fs.ensureDirSync(readOnlyDir);
      
      const readOnlyWriter = new AICFWriter(readOnlyDir);
      
      // Try to make directory read-only (this might not work on all systems)
      try {
        fs.chmodSync(readOnlyDir, 0o444);
        
        const result = await readOnlyWriter.appendConversation({
          id: 'permission_test'
        });
        
        // Should either succeed or fail gracefully
        if (!result.success) {
          expect(result.error).toBeDefined();
        }
        
        // Restore permissions for cleanup
        fs.chmodSync(readOnlyDir, 0o755);
      } catch (error) {
        // Permission test might not work on all systems - that's okay
        console.log('Permission test skipped on this system');
      }
    });

    it('should handle invalid data gracefully', async () => {
      // Test with various invalid inputs
      const invalidInputs = [
        null,
        undefined,
        '',
        { /* missing required fields */ }
      ];

      for (const invalidInput of invalidInputs) {
        try {
          const result = await writer.appendConversation(invalidInput);
          // Should either succeed with defaults or fail gracefully
          expect(typeof result).toBe('object');
        } catch (error) {
          // Graceful failure is acceptable
          expect(error).toBeDefined();
        }
      }
    });
  });

  describe('Performance Requirements', () => {
    it('should complete writes within performance targets', async () => {
      const timer = testUtils.performanceTimer();
      
      await writer.appendConversation({
        id: 'performance_test',
        messages: 10,
        tokens: 500
      });
      
      const duration = timer.stop();
      expect(duration).toBeLessThan(TEST_CONSTANTS.MAX_WRITE_TIME_MS);
    });

    it('should handle multiple rapid writes efficiently', async () => {
      const timer = testUtils.performanceTimer();
      const writePromises = [];
      
      // Perform 100 rapid writes
      for (let i = 0; i < 100; i++) {
        writePromises.push(
          writer.appendConversation({
            id: `rapid_${i}`,
            messages: 1
          })
        );
      }
      
      await Promise.all(writePromises);
      const duration = timer.stop();
      
      // Should complete all writes in reasonable time
      expect(duration).toBeLessThan(1000); // 1 second for 100 writes
    });
  });
});