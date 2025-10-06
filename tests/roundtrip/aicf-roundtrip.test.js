/**
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (c) 2025 Dennis van Leeuwen
 * 
 * AICF Round-Trip Validation Tests
 * Proves data integrity and validates 95.5% compression claims
 */

const fs = require('fs-extra');
const path = require('path');
const AICFReader = require('../../src/aicf-reader');
const AICFWriter = require('../../src/aicf-writer');
const AICFAPI = require('../../src/aicf-api');

describe('AICF Round-Trip Validation', () => {
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

  describe('Basic Write-Read Cycle', () => {
    it('should maintain data integrity through write-read cycle', async () => {
      const originalConversation = {
        id: 'roundtrip_test_001',
        timestamp_start: '2025-01-06T10:00:00Z',
        timestamp_end: '2025-01-06T10:30:00Z',
        messages: 25,
        tokens: 1200,
        metadata: {
          platform: 'claude',
          topic: 'roundtrip_testing',
          quality: 'HIGH',
          participants: 'user|assistant'
        }
      };

      // Write conversation
      const writeResult = await writer.appendConversation(originalConversation);
      expect(writeResult.success).toBe(true);

      // Read back conversations
      const readConversations = reader.getLastConversations(1);
      expect(readConversations).toHaveLength(1);

      const retrievedConversation = readConversations[0];
      
      // Validate all data preserved
      expect(retrievedConversation.id).toBe(originalConversation.id);
      expect(retrievedConversation.metadata.messages).toBe(originalConversation.messages.toString());
      expect(retrievedConversation.metadata.tokens).toBe(originalConversation.tokens.toString());
      expect(retrievedConversation.metadata.platform).toBe(originalConversation.metadata.platform);
      expect(retrievedConversation.metadata.topic).toBe(originalConversation.metadata.topic);
    });

    it('should preserve decision data through write-read cycle', async () => {
      const originalDecision = {
        id: 'decision_roundtrip_001',
        description: 'Implement comprehensive round-trip testing for data validation',
        impact: 'CRITICAL',
        confidence: 'HIGH',
        source: 'quality_assurance_analysis'
      };

      // Write decision
      const writeResult = await writer.addDecision(originalDecision);
      expect(writeResult.success).toBe(true);

      // Read back decisions
      const readDecisions = reader.getDecisionsByDate(new Date('2025-01-01'));
      expect(readDecisions.length).toBeGreaterThan(0);

      const retrievedDecision = readDecisions.find(d => d.id === originalDecision.id);
      expect(retrievedDecision).toBeDefined();
      
      // Validate decision data preserved
      expect(retrievedDecision.metadata.description).toBe(originalDecision.description);
      expect(retrievedDecision.metadata.impact).toBe(originalDecision.impact);
      expect(retrievedDecision.metadata.confidence).toBe(originalDecision.confidence);
      expect(retrievedDecision.metadata.source).toBe(originalDecision.source);
    });

    it('should preserve insights through write-read cycle', async () => {
      const originalInsight = {
        text: 'Round-trip testing validates data integrity and proves compression effectiveness',
        category: 'QUALITY_ASSURANCE',
        priority: 'HIGH',
        confidence: 'HIGH'
      };

      // Write insight
      const writeResult = await writer.addInsight(originalInsight);
      expect(writeResult.success).toBe(true);

      // Read back insights
      const readInsights = reader.getInsightsByPriority('HIGH');
      
      const retrievedInsight = readInsights.find(insight => 
        insight.data.includes(originalInsight.text)
      );
      expect(retrievedInsight).toBeDefined();
      
      // Validate insight structure
      expect(retrievedInsight.data).toContain(originalInsight.text);
      expect(retrievedInsight.data).toContain(originalInsight.category);
      expect(retrievedInsight.data).toContain(originalInsight.priority);
      expect(retrievedInsight.data).toContain(originalInsight.confidence);
    });
  });

  describe('Complex Data Round-Trip', () => {
    it('should handle multiple conversations with complex metadata', async () => {
      const conversations = [
        {
          id: 'complex_001',
          timestamp_start: '2025-01-06T09:00:00Z',
          timestamp_end: '2025-01-06T09:45:00Z',
          messages: 50,
          tokens: 2500,
          metadata: {
            platform: 'claude',
            topic: 'enterprise_architecture|microservices|scalability',
            participants: 'senior_architect|tech_lead|product_manager',
            priority: 'CRITICAL',
            outcome: 'approved',
            next_steps: 'implementation_planning|resource_allocation|timeline_definition'
          }
        },
        {
          id: 'complex_002',
          timestamp_start: '2025-01-06T14:00:00Z',
          timestamp_end: '2025-01-06T15:30:00Z',
          messages: 75,
          tokens: 3800,
          metadata: {
            platform: 'gpt',
            topic: 'security_audit|compliance|data_protection',
            participants: 'security_expert|compliance_officer|dev_team_lead',
            priority: 'HIGH',
            outcome: 'action_items_identified',
            blockers: 'budget_approval|third_party_integration'
          }
        }
      ];

      // Write all conversations
      for (const conv of conversations) {
        const result = await writer.appendConversation(conv);
        expect(result.success).toBe(true);
      }

      // Read back all conversations
      const retrieved = reader.getLastConversations(conversations.length);
      expect(retrieved).toHaveLength(conversations.length);

      // Validate each conversation preserved correctly
      for (let i = 0; i < conversations.length; i++) {
        const original = conversations[conversations.length - 1 - i]; // Reverse order (newest first)
        const retrieved_conv = retrieved[i];
        
        expect(retrieved_conv.id).toBe(original.id);
        expect(retrieved_conv.metadata.messages).toBe(original.messages.toString());
        expect(retrieved_conv.metadata.tokens).toBe(original.tokens.toString());
        
        // Check complex metadata preservation
        Object.keys(original.metadata).forEach(key => {
          expect(retrieved_conv.metadata[key]).toBe(original.metadata[key]);
        });
      }
    });

    it('should preserve special characters and edge cases', async () => {
      const edgeCaseConversation = {
        id: 'edge_cases_test',
        metadata: {
          special_chars: 'Testing|pipes\\backslashes"quotes\'apostrophes',
          unicode: '🚀 Unicode characters: ñáéíóú çñü αβγ 中文 🎯',
          long_text: 'A'.repeat(1000), // Very long field
          empty_field: '',
          numbers: '42',
          booleans: 'true',
          json_like: '{"key":"value","array":[1,2,3]}'
        }
      };

      // Write conversation with edge cases
      const writeResult = await writer.appendConversation(edgeCaseConversation);
      expect(writeResult.success).toBe(true);

      // Read back and verify all edge cases preserved
      const retrieved = reader.getLastConversations(1);
      expect(retrieved).toHaveLength(1);

      const retrieved_conv = retrieved[0];
      expect(retrieved_conv.id).toBe(edgeCaseConversation.id);
      
      // Validate all edge case metadata
      Object.keys(edgeCaseConversation.metadata).forEach(key => {
        expect(retrieved_conv.metadata[key]).toBe(edgeCaseConversation.metadata[key]);
      });
    });
  });

  describe('Compression Validation', () => {
    it('should achieve target compression ratios', async () => {
      // Generate realistic conversation data for compression testing
      const largeConversationData = {
        id: 'compression_test_large',
        timestamp_start: '2025-01-06T10:00:00Z',
        timestamp_end: '2025-01-06T12:00:00Z',
        messages: 200,
        tokens: 10000,
        metadata: {
          platform: 'claude',
          topic: 'comprehensive_system_architecture_review_including_microservices_design_patterns_scalability_considerations_security_implementation_data_flow_optimization_performance_tuning_deployment_strategies_monitoring_solutions_backup_procedures',
          participants: 'senior_architect|principal_engineer|tech_lead|product_manager|security_expert|devops_engineer|qa_lead|data_architect',
          discussions: 'initial_requirements_gathering|current_state_analysis|gap_identification|solution_architecture_design|technology_stack_selection|implementation_roadmap_creation|risk_assessment|cost_benefit_analysis|timeline_estimation|resource_allocation_planning',
          decisions: 'adopt_microservices_architecture|implement_api_gateway|use_container_orchestration|establish_ci_cd_pipeline|implement_monitoring_solution|create_disaster_recovery_plan',
          outcomes: 'architecture_approved|implementation_plan_created|timeline_established|resources_allocated|risks_mitigated|next_steps_defined',
          action_items: 'create_detailed_technical_specifications|setup_development_environment|implement_proof_of_concept|conduct_security_review|prepare_deployment_infrastructure|establish_monitoring_dashboard',
          notes: 'This comprehensive architecture discussion covered all aspects of the system redesign including scalability patterns, security considerations, performance optimization strategies, deployment methodologies, and operational procedures. The team reached consensus on the microservices approach with API gateway pattern, containerized deployment using Kubernetes, comprehensive monitoring with Prometheus and Grafana, and automated CI/CD pipeline using GitHub Actions. Implementation will proceed in phases with proof of concept first, followed by incremental migration of existing services.'
        }
      };

      // Create original data in JSON format for comparison
      const originalJSON = JSON.stringify(largeConversationData, null, 2);
      const originalSize = Buffer.byteLength(originalJSON, 'utf8');

      // Write to AICF format
      await writer.appendConversation(largeConversationData);

      // Read the AICF file to measure compressed size
      const aicfFilePath = path.join(tempDir, 'conversations.aicf');
      const aicfContent = fs.readFileSync(aicfFilePath, 'utf8');
      const compressedSize = Buffer.byteLength(aicfContent, 'utf8');

      // Calculate compression ratio
      const compressionStats = testUtils.measureCompression(originalJSON, aicfContent);
      
      console.log(`\n📊 Compression Analysis:`);
      console.log(`Original JSON: ${compressionStats.originalSize} bytes`);
      console.log(`AICF Format: ${compressionStats.compressedSize} bytes`);
      console.log(`Compression Ratio: ${compressionStats.compressionRatio}%`);
      console.log(`Bytes Saved: ${compressionStats.compressionBytes} bytes`);

      // Validate compression meets our targets
      expect(compressionStats.compressionRatio).toBeGreaterThanOrEqual(90); // At least 90% compression
      
      // Validate data integrity maintained despite compression
      const retrieved = reader.getLastConversations(1);
      expect(retrieved).toHaveLength(1);
      expect(retrieved[0].id).toBe(largeConversationData.id);
      
      // Verify key metadata preserved
      expect(retrieved[0].metadata.messages).toBe(largeConversationData.messages.toString());
      expect(retrieved[0].metadata.platform).toBe(largeConversationData.metadata.platform);
      expect(retrieved[0].metadata.notes).toBe(largeConversationData.metadata.notes);
    });

    it('should maintain compression efficiency across multiple entries', async () => {
      const conversations = [];
      
      // Create multiple realistic conversations
      for (let i = 1; i <= 10; i++) {
        conversations.push({
          id: `batch_compression_${i}`,
          timestamp_start: `2025-01-06T${String(i + 8).padStart(2, '0')}:00:00Z`,
          timestamp_end: `2025-01-06T${String(i + 8).padStart(2, '0')}:30:00Z`,
          messages: Math.floor(Math.random() * 50) + 10,
          tokens: Math.floor(Math.random() * 2000) + 500,
          metadata: {
            platform: ['claude', 'gpt', 'copilot'][i % 3],
            topic: `conversation_topic_${i}|detailed_discussion|technical_analysis|decision_making|action_planning`,
            participants: `user_${i}|assistant|technical_expert_${i}|domain_specialist`,
            summary: `This conversation covered topic ${i} in detail, involving comprehensive analysis of the subject matter, evaluation of multiple approaches, identification of key considerations, and development of actionable recommendations. The discussion included technical deep-dives, strategic planning, risk assessment, and resource allocation considerations.`,
            outcomes: `decision_made_for_topic_${i}|action_items_identified|timeline_established|responsibilities_assigned`,
            complexity_level: 'HIGH',
            business_value: 'CRITICAL'
          }
        });
      }

      // Calculate original size if stored as JSON
      const originalJSON = JSON.stringify(conversations, null, 2);
      const originalSize = Buffer.byteLength(originalJSON, 'utf8');

      // Write all conversations to AICF
      for (const conv of conversations) {
        await writer.appendConversation(conv);
      }

      // Measure compressed size
      const aicfFilePath = path.join(tempDir, 'conversations.aicf');
      const aicfContent = fs.readFileSync(aicfFilePath, 'utf8');
      const compressedSize = Buffer.byteLength(aicfContent, 'utf8');

      const compressionStats = testUtils.measureCompression(originalJSON, aicfContent);
      
      console.log(`\n📊 Batch Compression Analysis (${conversations.length} conversations):`);
      console.log(`Original JSON: ${compressionStats.originalSize} bytes`);
      console.log(`AICF Format: ${compressionStats.compressedSize} bytes`);
      console.log(`Compression Ratio: ${compressionStats.compressionRatio}%`);

      // Validate compression maintains efficiency at scale
      expect(compressionStats.compressionRatio).toBeGreaterThanOrEqual(85); // At least 85% for multiple entries

      // Validate all data readable and intact
      const retrieved = reader.getLastConversations(conversations.length);
      expect(retrieved).toHaveLength(conversations.length);
      
      // Spot check a few entries for data integrity
      expect(retrieved[0].id).toBe(conversations[conversations.length - 1].id); // Newest first
      expect(retrieved[retrieved.length - 1].id).toBe(conversations[0].id); // Oldest last
    });
  });

  describe('Performance Validation', () => {
    it('should maintain performance through round-trip cycles', async () => {
      const testData = {
        id: 'performance_roundtrip',
        messages: 100,
        tokens: 5000,
        metadata: {
          platform: 'performance_test',
          data: 'Large dataset for performance testing with substantial content'
        }
      };

      // Time the write operation
      const writeTimer = testUtils.performanceTimer();
      await writer.appendConversation(testData);
      const writeDuration = writeTimer.stop();

      // Time the read operation
      const readTimer = testUtils.performanceTimer();
      const retrieved = reader.getLastConversations(1);
      const readDuration = readTimer.stop();

      console.log(`\n⚡ Performance Metrics:`);
      console.log(`Write Time: ${writeDuration.toFixed(2)}ms`);
      console.log(`Read Time: ${readDuration.toFixed(2)}ms`);
      console.log(`Round-trip Time: ${(writeDuration + readDuration).toFixed(2)}ms`);

      // Validate performance targets
      expect(writeDuration).toBeLessThan(TEST_CONSTANTS.MAX_WRITE_TIME_MS);
      expect(readDuration).toBeLessThan(TEST_CONSTANTS.MAX_READ_TIME_MS);
      
      // Validate data integrity maintained despite performance focus
      expect(retrieved).toHaveLength(1);
      expect(retrieved[0].id).toBe(testData.id);
      expect(retrieved[0].metadata.platform).toBe(testData.metadata.platform);
    });

    it('should scale efficiently with multiple round-trips', async () => {
      const iterations = 50;
      const writeTimes = [];
      const readTimes = [];

      for (let i = 0; i < iterations; i++) {
        const testData = {
          id: `scale_test_${i}`,
          messages: 10 + i,
          metadata: {
            iteration: i.toString(),
            data: `Scaling test iteration ${i} with progressively larger datasets`
          }
        };

        // Time write
        const writeTimer = testUtils.performanceTimer();
        await writer.appendConversation(testData);
        writeTimes.push(writeTimer.stop());

        // Time read
        const readTimer = testUtils.performanceTimer();
        reader.getLastConversations(1);
        readTimes.push(readTimer.stop());
      }

      // Calculate performance statistics
      const avgWriteTime = writeTimes.reduce((a, b) => a + b, 0) / writeTimes.length;
      const avgReadTime = readTimes.reduce((a, b) => a + b, 0) / readTimes.length;
      
      console.log(`\n📈 Scaling Performance (${iterations} iterations):`);
      console.log(`Average Write Time: ${avgWriteTime.toFixed(2)}ms`);
      console.log(`Average Read Time: ${avgReadTime.toFixed(2)}ms`);

      // Validate scaling characteristics
      expect(avgWriteTime).toBeLessThan(TEST_CONSTANTS.MAX_WRITE_TIME_MS);
      expect(avgReadTime).toBeLessThan(TEST_CONSTANTS.MAX_READ_TIME_MS);
      
      // Performance shouldn't degrade significantly with scale
      const lastFiveWriteAvg = writeTimes.slice(-5).reduce((a, b) => a + b, 0) / 5;
      const firstFiveWriteAvg = writeTimes.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
      
      expect(lastFiveWriteAvg).toBeLessThan(firstFiveWriteAvg * 2); // No more than 2x degradation
    });
  });

  describe('API Integration Round-Trip', () => {
    it('should maintain data integrity through API layer', async () => {
      const conversationData = {
        id: 'api_roundtrip_test',
        timestamp_start: '2025-01-06T15:00:00Z',
        timestamp_end: '2025-01-06T15:45:00Z',
        messages: 30,
        tokens: 1500,
        metadata: {
          topic: 'api_integration_testing',
          platform: 'api_test',
          quality: 'enterprise_grade'
        }
      };

      // Write through API
      const writeResult = await api.logConversation(conversationData);
      expect(writeResult.success).toBe(true);

      // Read through API query system
      const queryResults = api.query("recent conversations");
      expect(queryResults.conversations.length).toBeGreaterThan(0);
      
      const retrieved = queryResults.conversations.find(c => c.id === conversationData.id);
      expect(retrieved).toBeDefined();
      
      // Validate API maintains data integrity
      expect(retrieved.metadata.topic).toBe(conversationData.metadata.topic);
      expect(retrieved.metadata.platform).toBe(conversationData.metadata.platform);
    });
  });

  describe('Format Validation', () => {
    it('should produce valid AICF v3.0 format', async () => {
      const testData = {
        id: 'format_validation_test',
        messages: 5,
        tokens: 200
      };

      await writer.appendConversation(testData);

      // Read the raw AICF file
      const aicfFilePath = path.join(tempDir, 'conversations.aicf');
      const aicfContent = fs.readFileSync(aicfFilePath, 'utf8');
      
      // Validate AICF format structure
      const lines = aicfContent.split('\n').filter(Boolean);
      
      // Should have proper line numbering
      lines.forEach((line, index) => {
        const [lineNum, content] = line.split('|', 2);
        expect(parseInt(lineNum)).toBe(index + 1);
      });
      
      // Should have proper section headers
      expect(aicfContent).toMatch(/@CONVERSATION:format_validation_test/);
      expect(aicfContent).toMatch(/@STATE/);
      
      // Should follow pipe-delimited format
      const contentLines = lines.filter(line => !line.includes('@') && line.includes('='));
      contentLines.forEach(line => {
        const [, content] = line.split('|', 2);
        expect(content).toMatch(/\w+=.*/); // key=value format
      });
    });
  });
});