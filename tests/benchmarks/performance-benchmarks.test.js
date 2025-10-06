/**
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (c) 2025 Dennis van Leeuwen
 * 
 * AICF Performance Benchmark Tests
 * Validates 95.5% compression claims and measures O(1) access performance
 */

const fs = require('fs-extra');
const path = require('path');
const AICFReader = require('../../src/aicf-reader');
const AICFWriter = require('../../src/aicf-writer');
const AICFAPI = require('../../src/aicf-api');

describe('AICF Performance Benchmarks', () => {
  let tempDir;
  let reader;
  let writer;
  let api;

  beforeAll(() => {
    tempDir = testUtils.createTempDir();
    reader = new AICFReader(tempDir);
    writer = new AICFWriter(tempDir);
    api = new AICFAPI(tempDir);
  });

  afterAll(() => {
    testUtils.cleanupTempDir(tempDir);
  });

  describe('Compression Performance Validation', () => {
    it('should achieve 95.5% compression with realistic enterprise data', async () => {
      const enterpriseConversations = generateEnterpriseDataset(100);
      
      // Calculate original JSON size
      const originalJSON = JSON.stringify(enterpriseConversations, null, 2);
      const originalSize = Buffer.byteLength(originalJSON, 'utf8');

      console.log(`\n📊 Enterprise Dataset Compression Test:`);
      console.log(`Dataset: ${enterpriseConversations.length} conversations`);
      console.log(`Original JSON: ${(originalSize / 1024).toFixed(2)} KB`);

      // Write all data to AICF format
      const writeStartTime = performance.now();
      for (const conv of enterpriseConversations) {
        await writer.appendConversation(conv);
      }
      const writeEndTime = performance.now();

      // Measure compressed size
      const aicfFilePath = path.join(tempDir, 'conversations.aicf');
      const aicfContent = fs.readFileSync(aicfFilePath, 'utf8');
      const compressedSize = Buffer.byteLength(aicfContent, 'utf8');

      const compressionStats = testUtils.measureCompression(originalJSON, aicfContent);
      
      console.log(`AICF Format: ${(compressedSize / 1024).toFixed(2)} KB`);
      console.log(`Compression Ratio: ${compressionStats.compressionRatio.toFixed(1)}%`);
      console.log(`Space Saved: ${((originalSize - compressedSize) / 1024).toFixed(2)} KB`);
      console.log(`Write Performance: ${(writeEndTime - writeStartTime).toFixed(2)}ms`);

      // Validate compression meets revolutionary claims
      expect(compressionStats.compressionRatio).toBeGreaterThanOrEqual(95.5);
      
      // Validate data integrity maintained
      const readConversations = reader.getLastConversations(10);
      expect(readConversations).toHaveLength(10);
      expect(readConversations[0].id).toBe(enterpriseConversations[enterpriseConversations.length - 1].id);
    });

    it('should maintain compression efficiency with diverse data types', async () => {
      const diverseDatasets = {
        technical: generateTechnicalConversations(50),
        business: generateBusinessConversations(50),
        research: generateResearchConversations(50),
        support: generateSupportConversations(50)
      };

      const compressionResults = {};

      for (const [type, dataset] of Object.entries(diverseDatasets)) {
        const tempTestDir = testUtils.createTempDir();
        const testWriter = new AICFWriter(tempTestDir);
        
        const originalJSON = JSON.stringify(dataset, null, 2);
        const originalSize = Buffer.byteLength(originalJSON, 'utf8');

        // Write dataset
        for (const conv of dataset) {
          await testWriter.appendConversation(conv);
        }

        // Measure compression
        const aicfFilePath = path.join(tempTestDir, 'conversations.aicf');
        const aicfContent = fs.readFileSync(aicfFilePath, 'utf8');
        const compressedSize = Buffer.byteLength(aicfContent, 'utf8');

        compressionResults[type] = testUtils.measureCompression(originalJSON, aicfContent);
        
        testUtils.cleanupTempDir(tempTestDir);
      }

      console.log(`\n📊 Diverse Dataset Compression Results:`);
      Object.entries(compressionResults).forEach(([type, stats]) => {
        console.log(`${type.toUpperCase()}: ${stats.compressionRatio.toFixed(1)}% compression`);
        expect(stats.compressionRatio).toBeGreaterThanOrEqual(90); // Minimum 90% across all data types
      });

      // Overall average should exceed 95%
      const averageCompression = Object.values(compressionResults)
        .reduce((sum, stats) => sum + stats.compressionRatio, 0) / Object.keys(compressionResults).length;
      
      console.log(`Average Compression: ${averageCompression.toFixed(1)}%`);
      expect(averageCompression).toBeGreaterThanOrEqual(95.0);
    });

    it('should scale compression efficiency with large datasets', async () => {
      const scalingTests = [
        { size: 100, label: 'Small (100 conversations)' },
        { size: 500, label: 'Medium (500 conversations)' },
        { size: 1000, label: 'Large (1000 conversations)' },
        { size: 2000, label: 'Enterprise (2000 conversations)' }
      ];

      const scalingResults = [];

      for (const test of scalingTests) {
        const scalingTempDir = testUtils.createTempDir();
        const scalingWriter = new AICFWriter(scalingTempDir);
        
        const dataset = generateEnterpriseDataset(test.size);
        const originalJSON = JSON.stringify(dataset, null, 2);
        const originalSize = Buffer.byteLength(originalJSON, 'utf8');

        const writeStartTime = performance.now();
        for (const conv of dataset) {
          await scalingWriter.appendConversation(conv);
        }
        const writeEndTime = performance.now();

        const aicfFilePath = path.join(scalingTempDir, 'conversations.aicf');
        const aicfContent = fs.readFileSync(aicfFilePath, 'utf8');
        const compressedSize = Buffer.byteLength(aicfContent, 'utf8');

        const stats = testUtils.measureCompression(originalJSON, aicfContent);
        const writeTimePerConv = (writeEndTime - writeStartTime) / test.size;

        scalingResults.push({
          size: test.size,
          label: test.label,
          compressionRatio: stats.compressionRatio,
          writeTimePerConversation: writeTimePerConv,
          originalSizeMB: originalSize / (1024 * 1024),
          compressedSizeMB: compressedSize / (1024 * 1024)
        });

        testUtils.cleanupTempDir(scalingTempDir);
      }

      console.log(`\n📈 Scaling Compression Performance:`);
      scalingResults.forEach(result => {
        console.log(`${result.label}:`);
        console.log(`  Compression: ${result.compressionRatio.toFixed(1)}%`);
        console.log(`  Original Size: ${result.originalSizeMB.toFixed(2)} MB`);
        console.log(`  Compressed Size: ${result.compressedSizeMB.toFixed(2)} MB`);
        console.log(`  Write Time per Conv: ${result.writeTimePerConversation.toFixed(2)}ms`);
        console.log('');
      });

      // Validate scaling characteristics
      scalingResults.forEach(result => {
        expect(result.compressionRatio).toBeGreaterThanOrEqual(94.0);
        expect(result.writeTimePerConversation).toBeLessThan(100); // Should stay under 100ms per conversation
      });

      // Compression should not degrade significantly with scale
      const firstResult = scalingResults[0];
      const lastResult = scalingResults[scalingResults.length - 1];
      const compressionDegradation = firstResult.compressionRatio - lastResult.compressionRatio;
      
      expect(compressionDegradation).toBeLessThan(2.0); // Less than 2% degradation
    });
  });

  describe('Read Access Performance', () => {
    beforeAll(async () => {
      // Populate with substantial dataset for read performance testing
      const performanceDataset = generateEnterpriseDataset(1000);
      for (const conv of performanceDataset) {
        await writer.appendConversation(conv);
      }
    });

    it('should achieve O(1) read access performance', async () => {
      const accessTests = [
        { position: 1, label: 'First conversation' },
        { position: 100, label: 'Middle conversation (100th)' },
        { position: 500, label: 'Middle conversation (500th)' },
        { position: 999, label: 'Latest conversation' }
      ];

      const readTimes = [];

      for (const test of accessTests) {
        const readStartTime = performance.now();
        const conversations = reader.getLastConversations(test.position);
        const readEndTime = performance.now();
        
        const readTime = readEndTime - readStartTime;
        readTimes.push({ ...test, readTime });

        expect(conversations).toHaveLength(test.position);
        expect(readTime).toBeLessThan(TEST_CONSTANTS.MAX_READ_TIME_MS);
      }

      console.log(`\n⚡ O(1) Read Access Performance:`);
      readTimes.forEach(result => {
        console.log(`${result.label}: ${result.readTime.toFixed(2)}ms`);
      });

      // O(1) characteristic: read time should not scale significantly with position
      const readTimeVariance = Math.max(...readTimes.map(r => r.readTime)) - 
                              Math.min(...readTimes.map(r => r.readTime));
      const averageReadTime = readTimes.reduce((sum, r) => sum + r.readTime, 0) / readTimes.length;
      
      console.log(`Average Read Time: ${averageReadTime.toFixed(2)}ms`);
      console.log(`Read Time Variance: ${readTimeVariance.toFixed(2)}ms`);
      
      // Variance should be small relative to average (O(1) behavior)
      expect(readTimeVariance / averageReadTime).toBeLessThan(2.0); // Less than 2x variance
    });

    it('should maintain caching performance under load', async () => {
      const loadTests = [];
      const cacheHitTests = 10;

      // First access (cache miss)
      const firstAccessStart = performance.now();
      reader.getLastConversations(50);
      const firstAccessTime = performance.now() - firstAccessStart;
      loadTests.push({ type: 'Cache Miss', time: firstAccessTime });

      // Subsequent accesses (cache hits)
      for (let i = 0; i < cacheHitTests; i++) {
        const cacheHitStart = performance.now();
        reader.getLastConversations(50);
        const cacheHitTime = performance.now() - cacheHitStart;
        loadTests.push({ type: 'Cache Hit', time: cacheHitTime });
      }

      const cacheMissTime = firstAccessTime;
      const averageCacheHitTime = loadTests.filter(t => t.type === 'Cache Hit')
        .reduce((sum, t) => sum + t.time, 0) / cacheHitTests;

      console.log(`\n🔄 Caching Performance:`);
      console.log(`Cache Miss: ${cacheMissTime.toFixed(2)}ms`);
      console.log(`Average Cache Hit: ${averageCacheHitTime.toFixed(2)}ms`);
      console.log(`Cache Efficiency: ${((cacheMissTime - averageCacheHitTime) / cacheMissTime * 100).toFixed(1)}%`);

      // Cache hits should be significantly faster than cache misses
      expect(averageCacheHitTime).toBeLessThan(cacheMissTime * 0.5); // At least 50% improvement
      expect(averageCacheHitTime).toBeLessThan(10); // Cache hits under 10ms
    });

    it('should handle concurrent read operations efficiently', async () => {
      const concurrentReadCount = 10;
      const readPromises = [];

      const concurrentTestStart = performance.now();

      // Launch concurrent reads
      for (let i = 0; i < concurrentReadCount; i++) {
        readPromises.push(Promise.resolve().then(() => {
          const readStart = performance.now();
          const conversations = reader.getLastConversations(50);
          const readTime = performance.now() - readStart;
          return { conversations, readTime };
        }));
      }

      const results = await Promise.all(readPromises);
      const concurrentTestTime = performance.now() - concurrentTestStart;

      const averageConcurrentReadTime = results.reduce((sum, r) => sum + r.readTime, 0) / results.length;
      const maxConcurrentReadTime = Math.max(...results.map(r => r.readTime));

      console.log(`\n⚡ Concurrent Read Performance:`);
      console.log(`${concurrentReadCount} concurrent reads: ${concurrentTestTime.toFixed(2)}ms total`);
      console.log(`Average individual read: ${averageConcurrentReadTime.toFixed(2)}ms`);
      console.log(`Max individual read: ${maxConcurrentReadTime.toFixed(2)}ms`);

      // Validate all reads succeeded
      results.forEach(result => {
        expect(result.conversations).toHaveLength(50);
        expect(result.readTime).toBeLessThan(TEST_CONSTANTS.MAX_READ_TIME_MS);
      });

      // Concurrent performance should not degrade significantly
      expect(maxConcurrentReadTime).toBeLessThan(TEST_CONSTANTS.MAX_READ_TIME_MS * 2);
    });

    it('should demonstrate query performance scaling', async () => {
      const queryComplexities = [
        { query: 'recent conversations', label: 'Simple Query' },
        { query: 'high priority conversations about security', label: 'Filtered Query' },
        { query: 'critical decisions made by senior architects with high confidence', label: 'Complex Query' },
        { query: 'conversations about machine learning or AI from the last week with technical insights', label: 'Multi-faceted Query' }
      ];

      const queryPerformanceResults = [];

      for (const test of queryComplexities) {
        const queryStart = performance.now();
        const result = api.query(test.query);
        const queryTime = performance.now() - queryStart;

        queryPerformanceResults.push({
          label: test.label,
          query: test.query,
          queryTime,
          resultCount: (result.conversations?.length || 0) + 
                      (result.decisions?.length || 0) + 
                      (result.insights?.length || 0)
        });
      }

      console.log(`\n🔍 Query Performance by Complexity:`);
      queryPerformanceResults.forEach(result => {
        console.log(`${result.label}: ${result.queryTime.toFixed(2)}ms (${result.resultCount} results)`);
      });

      // All queries should complete within reasonable time
      queryPerformanceResults.forEach(result => {
        expect(result.queryTime).toBeLessThan(TEST_CONSTANTS.MAX_QUERY_TIME_MS || 1000);
      });
    });
  });

  describe('Memory Efficiency Benchmarks', () => {
    it('should maintain low memory footprint during operations', async () => {
      const initialMemory = process.memoryUsage();
      
      // Perform memory-intensive operations
      const largeDataset = generateEnterpriseDataset(500);
      
      for (const conv of largeDataset) {
        await writer.appendConversation(conv);
      }

      // Perform multiple read operations
      for (let i = 0; i < 50; i++) {
        reader.getLastConversations(100);
      }

      // Query operations
      for (let i = 0; i < 20; i++) {
        api.query('recent technical conversations');
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = {
        heapUsed: (finalMemory.heapUsed - initialMemory.heapUsed) / (1024 * 1024),
        heapTotal: (finalMemory.heapTotal - initialMemory.heapTotal) / (1024 * 1024),
        rss: (finalMemory.rss - initialMemory.rss) / (1024 * 1024)
      };

      console.log(`\n🧠 Memory Efficiency:`);
      console.log(`Heap Used Increase: ${memoryIncrease.heapUsed.toFixed(2)} MB`);
      console.log(`Heap Total Increase: ${memoryIncrease.heapTotal.toFixed(2)} MB`);
      console.log(`RSS Increase: ${memoryIncrease.rss.toFixed(2)} MB`);

      // Memory usage should remain reasonable
      expect(memoryIncrease.heapUsed).toBeLessThan(100); // Less than 100MB heap increase
      expect(memoryIncrease.rss).toBeLessThan(200); // Less than 200MB RSS increase
    });
  });

  describe('Real-world Performance Scenarios', () => {
    it('should handle typical daily usage patterns efficiently', async () => {
      console.log(`\n🌍 Real-world Usage Simulation:`);
      
      // Simulate typical daily usage: 20 conversations, 5 decisions, 10 insights
      const dailyStartTime = performance.now();
      
      // Morning conversations
      for (let i = 0; i < 8; i++) {
        await writer.appendConversation(generateRealisticConversation(`daily_morning_${i}`));
      }
      
      // Afternoon decisions
      for (let i = 0; i < 3; i++) {
        await writer.addDecision({
          id: `daily_decision_${i}`,
          description: `Daily decision ${i} based on morning discussions`,
          impact: 'HIGH',
          confidence: 'HIGH'
        });
      }
      
      // Evening conversations and insights
      for (let i = 0; i < 12; i++) {
        await writer.appendConversation(generateRealisticConversation(`daily_evening_${i}`));
        
        if (i % 3 === 0) {
          await writer.addInsight({
            text: `Evening insight ${i} from accumulated discussions`,
            category: 'DAILY_LEARNING',
            priority: 'HIGH'
          });
        }
      }

      // Typical query usage
      const queryResults = [];
      const queries = [
        'what did I work on today',
        'recent important decisions',
        'conversations about current project',
        'high priority items',
        'technical insights from today'
      ];

      for (const query of queries) {
        const queryStart = performance.now();
        const result = api.query(query);
        const queryTime = performance.now() - queryStart;
        queryResults.push({ query, queryTime, results: Object.keys(result).length });
      }

      const dailyTotalTime = performance.now() - dailyStartTime;

      console.log(`Daily Usage Simulation: ${dailyTotalTime.toFixed(2)}ms total`);
      console.log(`Average Query Time: ${queryResults.reduce((sum, q) => sum + q.queryTime, 0) / queryResults.length}ms`);

      // Daily usage should be highly performant
      expect(dailyTotalTime).toBeLessThan(10000); // Under 10 seconds for full daily simulation
      queryResults.forEach(result => {
        expect(result.queryTime).toBeLessThan(500); // Each query under 500ms
      });
    });

    it('should demonstrate enterprise-scale performance', async () => {
      console.log(`\n🏢 Enterprise Scale Simulation:`);
      
      // Simulate enterprise usage over time
      const enterpriseSimulationStart = performance.now();
      
      // Large batch operations (like end-of-day processing)
      const batchDataset = generateEnterpriseDataset(200);
      const batchWriteStart = performance.now();
      
      for (const conv of batchDataset) {
        await writer.appendConversation(conv);
      }
      
      const batchWriteTime = performance.now() - batchWriteStart;
      
      // Analytics generation
      const analyticsStart = performance.now();
      const analytics = api.getAnalytics();
      const analyticsTime = performance.now() - analyticsStart;
      
      // Complex enterprise queries
      const enterpriseQueries = [
        'critical decisions from this quarter',
        'high impact conversations with senior stakeholders',
        'security and compliance related discussions',
        'architecture decisions with long-term implications',
        'technical debt and performance optimization insights'
      ];
      
      const enterpriseQueryResults = [];
      for (const query of enterpriseQueries) {
        const queryStart = performance.now();
        const result = api.query(query);
        const queryTime = performance.now() - queryStart;
        enterpriseQueryResults.push({ query, queryTime });
      }
      
      const enterpriseSimulationTime = performance.now() - enterpriseSimulationStart;
      
      console.log(`Enterprise Simulation Total: ${enterpriseSimulationTime.toFixed(2)}ms`);
      console.log(`Batch Write (200 conversations): ${batchWriteTime.toFixed(2)}ms`);
      console.log(`Analytics Generation: ${analyticsTime.toFixed(2)}ms`);
      console.log(`Average Enterprise Query: ${enterpriseQueryResults.reduce((sum, q) => sum + q.queryTime, 0) / enterpriseQueryResults.length}ms`);

      // Enterprise performance requirements
      expect(batchWriteTime / batchDataset.length).toBeLessThan(50); // Under 50ms per conversation in batch
      expect(analyticsTime).toBeLessThan(2000); // Analytics under 2 seconds
      expect(enterpriseSimulationTime).toBeLessThan(30000); // Total enterprise simulation under 30 seconds
      
      // Validate analytics completeness
      expect(analytics.stats.totalConversations).toBeGreaterThan(200);
      expect(analytics.platformBreakdown).toBeDefined();
      expect(analytics.topicAnalysis).toBeDefined();
    });
  });

  // Helper functions for generating test data
  function generateEnterpriseDataset(count) {
    const conversations = [];
    const platforms = ['claude', 'gpt', 'copilot', 'gemini'];
    const priorities = ['HIGH', 'CRITICAL', 'MEDIUM', 'LOW'];
    
    for (let i = 0; i < count; i++) {
      conversations.push({
        id: `enterprise_conv_${i}`,
        timestamp_start: new Date(2025, 0, 1 + (i % 30), 9 + (i % 8)).toISOString(),
        timestamp_end: new Date(2025, 0, 1 + (i % 30), 9 + (i % 8) + 1).toISOString(),
        messages: 15 + Math.floor(Math.random() * 50),
        tokens: 500 + Math.floor(Math.random() * 2000),
        metadata: {
          platform: platforms[i % platforms.length],
          topic: `enterprise_topic_${i % 20}|business_process|workflow_optimization|strategic_planning`,
          participants: `stakeholder_${i % 10}|senior_manager_${i % 5}|technical_lead_${i % 3}`,
          priority: priorities[i % priorities.length],
          outcome: `decision_made|action_items_identified|follow_up_scheduled`,
          department: `engineering|product|sales|marketing|operations`.split('|')[i % 5],
          project: `project_alpha|project_beta|project_gamma|project_delta`.split('|')[i % 4],
          tags: `important|actionable|strategic|urgent`.split('|')[i % 4],
          notes: `Comprehensive discussion covering multiple aspects of ${i % 10} different topics with detailed analysis, stakeholder input, technical considerations, business impact assessment, risk evaluation, resource requirements, timeline planning, and next steps definition. This enterprise conversation represents typical complex business discussions that occur in large organizations.`
        }
      });
    }
    
    return conversations;
  }

  function generateTechnicalConversations(count) {
    return Array.from({ length: count }, (_, i) => ({
      id: `technical_${i}`,
      messages: 20 + Math.floor(Math.random() * 30),
      tokens: 800 + Math.floor(Math.random() * 1500),
      metadata: {
        platform: 'claude',
        topic: 'system_architecture|performance_optimization|code_review|debugging',
        participants: 'senior_engineer|architect|tech_lead',
        technical_stack: 'react|nodejs|postgres|kubernetes|aws',
        complexity: 'HIGH',
        code_changes: 'true',
        performance_impact: 'MEDIUM'
      }
    }));
  }

  function generateBusinessConversations(count) {
    return Array.from({ length: count }, (_, i) => ({
      id: `business_${i}`,
      messages: 15 + Math.floor(Math.random() * 25),
      tokens: 600 + Math.floor(Math.random() * 1200),
      metadata: {
        platform: 'gpt',
        topic: 'strategy|planning|budget|market_analysis|customer_feedback',
        participants: 'product_manager|business_analyst|stakeholder',
        business_impact: 'HIGH',
        quarter: 'Q1_2025',
        revenue_impact: 'POSITIVE'
      }
    }));
  }

  function generateResearchConversations(count) {
    return Array.from({ length: count }, (_, i) => ({
      id: `research_${i}`,
      messages: 25 + Math.floor(Math.random() * 35),
      tokens: 1000 + Math.floor(Math.random() * 2000),
      metadata: {
        platform: 'claude',
        topic: 'machine_learning|data_analysis|research|experimentation',
        participants: 'data_scientist|researcher|ml_engineer',
        research_phase: 'exploration|hypothesis|validation|conclusion',
        data_sensitivity: 'HIGH',
        statistical_significance: 'true'
      }
    }));
  }

  function generateSupportConversations(count) {
    return Array.from({ length: count }, (_, i) => ({
      id: `support_${i}`,
      messages: 8 + Math.floor(Math.random() * 15),
      tokens: 300 + Math.floor(Math.random() * 700),
      metadata: {
        platform: 'copilot',
        topic: 'troubleshooting|bug_fix|user_support|documentation',
        participants: 'support_engineer|customer|developer',
        priority: 'URGENT',
        resolution_status: 'resolved|in_progress|escalated',
        customer_satisfaction: 'high'
      }
    }));
  }

  function generateRealisticConversation(id) {
    const topics = [
      'project_planning|requirements_gathering|timeline_estimation',
      'code_review|technical_discussion|best_practices',
      'problem_solving|debugging|root_cause_analysis',
      'design_discussion|user_experience|interface_planning'
    ];

    return {
      id,
      timestamp_start: new Date().toISOString(),
      timestamp_end: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      messages: 15 + Math.floor(Math.random() * 25),
      tokens: 600 + Math.floor(Math.random() * 1000),
      metadata: {
        platform: 'claude',
        topic: topics[Math.floor(Math.random() * topics.length)],
        participants: 'user|assistant|expert',
        priority: 'HIGH',
        outcome: 'progress_made'
      }
    };
  }
});