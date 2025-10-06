/**
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (c) 2025 Dennis van Leeuwen
 * 
 * AICF API Integration Tests
 * Tests complete API functionality including natural language queries and analytics
 */

const fs = require('fs-extra');
const path = require('path');
const AICFAPI = require('../../src/aicf-api');
const AICFWriter = require('../../src/aicf-writer');

describe('AICF API Integration Tests', () => {
  let tempDir;
  let api;
  let writer;

  beforeEach(async () => {
    tempDir = testUtils.createTempDir();
    api = new AICFAPI(tempDir);
    writer = new AICFWriter(tempDir);
    
    // Populate with test data for comprehensive API testing
    await setupTestData();
  });

  afterEach(() => {
    testUtils.cleanupTempDir(tempDir);
  });

  async function setupTestData() {
    // Create diverse conversation history
    const conversations = [
      {
        id: 'api_test_conv_001',
        timestamp_start: '2025-01-01T10:00:00Z',
        timestamp_end: '2025-01-01T11:00:00Z',
        messages: 25,
        tokens: 1200,
        metadata: {
          platform: 'claude',
          topic: 'machine_learning|neural_networks|deep_learning',
          participants: 'data_scientist|ml_engineer',
          outcome: 'model_architecture_decided',
          priority: 'HIGH'
        }
      },
      {
        id: 'api_test_conv_002',
        timestamp_start: '2025-01-02T14:30:00Z',
        timestamp_end: '2025-01-02T15:45:00Z',
        messages: 42,
        tokens: 2100,
        metadata: {
          platform: 'gpt',
          topic: 'microservices_architecture|api_design|scalability',
          participants: 'senior_architect|backend_engineer|product_manager',
          outcome: 'design_approved',
          priority: 'CRITICAL'
        }
      },
      {
        id: 'api_test_conv_003',
        timestamp_start: '2025-01-03T09:15:00Z',
        timestamp_end: '2025-01-03T10:30:00Z',
        messages: 18,
        tokens: 850,
        metadata: {
          platform: 'copilot',
          topic: 'code_review|security_audit|best_practices',
          participants: 'security_expert|senior_developer',
          outcome: 'vulnerabilities_identified',
          priority: 'HIGH'
        }
      },
      {
        id: 'api_test_conv_004',
        timestamp_start: '2025-01-04T16:00:00Z',
        timestamp_end: '2025-01-04T17:15:00Z',
        messages: 33,
        tokens: 1650,
        metadata: {
          platform: 'claude',
          topic: 'database_optimization|performance_tuning|indexing',
          participants: 'database_admin|backend_engineer',
          outcome: 'optimization_plan_created',
          priority: 'MEDIUM'
        }
      },
      {
        id: 'api_test_conv_005',
        timestamp_start: '2025-01-05T11:30:00Z',
        timestamp_end: '2025-01-05T12:45:00Z',
        messages: 28,
        tokens: 1400,
        metadata: {
          platform: 'gpt',
          topic: 'user_interface_design|accessibility|user_experience',
          participants: 'ux_designer|frontend_engineer|product_manager',
          outcome: 'design_system_updated',
          priority: 'MEDIUM'
        }
      }
    ];

    for (const conv of conversations) {
      await writer.appendConversation(conv);
    }

    // Add decisions
    const decisions = [
      {
        id: 'api_decision_001',
        description: 'Adopt neural network architecture for ML project',
        impact: 'HIGH',
        confidence: 'HIGH',
        source: 'machine_learning_discussion'
      },
      {
        id: 'api_decision_002',
        description: 'Implement microservices with API gateway pattern',
        impact: 'CRITICAL',
        confidence: 'MEDIUM',
        source: 'architecture_review'
      },
      {
        id: 'api_decision_003',
        description: 'Address identified security vulnerabilities immediately',
        impact: 'CRITICAL',
        confidence: 'HIGH',
        source: 'security_audit'
      }
    ];

    for (const decision of decisions) {
      await writer.addDecision(decision);
    }

    // Add insights
    const insights = [
      {
        text: 'Machine learning models require careful validation to prevent overfitting',
        category: 'TECHNICAL',
        priority: 'HIGH',
        confidence: 'HIGH'
      },
      {
        text: 'Microservices architecture improves scalability but increases operational complexity',
        category: 'ARCHITECTURE',
        priority: 'HIGH',
        confidence: 'MEDIUM'
      },
      {
        text: 'Regular security audits are essential for maintaining system integrity',
        category: 'SECURITY',
        priority: 'CRITICAL',
        confidence: 'HIGH'
      },
      {
        text: 'Database performance optimization requires understanding of query patterns',
        category: 'PERFORMANCE',
        priority: 'MEDIUM',
        confidence: 'HIGH'
      },
      {
        text: 'User experience design should prioritize accessibility from the beginning',
        category: 'UX',
        priority: 'HIGH',
        confidence: 'MEDIUM'
      }
    ];

    for (const insight of insights) {
      await writer.addInsight(insight);
    }

    // Add work states
    const workStates = [
      {
        type: 'CURRENT_TASK',
        data: 'Implementing neural network architecture for ML project'
      },
      {
        type: 'BLOCKERS',
        data: 'Waiting for GPU cluster allocation|Need dataset validation'
      },
      {
        type: 'NEXT_ACTIONS',
        data: 'Complete security vulnerability fixes|Optimize database queries|Update design system'
      },
      {
        type: 'CONTEXT_SWITCH',
        data: 'Switching focus from ML project to security audit results'
      }
    ];

    for (const workState of workStates) {
      await writer.updateWorkState(workState.type, workState.data);
    }
  }

  describe('Natural Language Query Processing', () => {
    it('should handle basic conversation queries', () => {
      const queries = [
        'recent conversations',
        'what did we discuss yesterday',
        'show me all conversations about machine learning',
        'conversations with high priority',
        'discussions about security'
      ];

      queries.forEach(query => {
        const result = api.query(query);
        expect(result).toBeDefined();
        expect(result.conversations).toBeDefined();
        expect(Array.isArray(result.conversations)).toBe(true);
      });
    });

    it('should process topic-specific queries', () => {
      const topicQueries = [
        'machine learning discussions',
        'conversations about microservices',
        'security related talks',
        'database optimization topics',
        'user interface design conversations'
      ];

      topicQueries.forEach(query => {
        const result = api.query(query);
        expect(result.conversations).toBeDefined();
        
        // Validate that results contain relevant topics
        result.conversations.forEach(conv => {
          const hasRelevantTopic = Object.values(conv.metadata).some(value =>
            typeof value === 'string' && 
            (value.toLowerCase().includes('machine') ||
             value.toLowerCase().includes('microservices') ||
             value.toLowerCase().includes('security') ||
             value.toLowerCase().includes('database') ||
             value.toLowerCase().includes('interface'))
          );
          expect(hasRelevantTopic).toBe(true);
        });
      });
    });

    it('should handle temporal queries', () => {
      const temporalQueries = [
        'conversations from this week',
        'recent discussions',
        'what happened on January 2nd',
        'latest conversations',
        'conversations from the last 3 days'
      ];

      temporalQueries.forEach(query => {
        const result = api.query(query);
        expect(result.conversations).toBeDefined();
        expect(result.conversations.length).toBeGreaterThanOrEqual(0);
      });
    });

    it('should process participant-based queries', () => {
      const participantQueries = [
        'conversations with senior architect',
        'discussions involving data scientist',
        'talks with product manager',
        'security expert conversations'
      ];

      participantQueries.forEach(query => {
        const result = api.query(query);
        expect(result.conversations).toBeDefined();
        
        // Validate participants are included in results
        if (result.conversations.length > 0) {
          const hasRelevantParticipant = result.conversations.some(conv =>
            conv.metadata.participants && (
              conv.metadata.participants.includes('senior_architect') ||
              conv.metadata.participants.includes('data_scientist') ||
              conv.metadata.participants.includes('product_manager') ||
              conv.metadata.participants.includes('security_expert')
            )
          );
          expect(hasRelevantParticipant).toBe(true);
        }
      });
    });

    it('should handle priority and outcome queries', () => {
      const contextQueries = [
        'high priority conversations',
        'critical discussions',
        'conversations with decisions made',
        'talks that resulted in approvals',
        'medium priority topics'
      ];

      contextQueries.forEach(query => {
        const result = api.query(query);
        expect(result.conversations).toBeDefined();
        
        // Validate context matching
        if (result.conversations.length > 0) {
          result.conversations.forEach(conv => {
            const hasRelevantContext = 
              (conv.metadata.priority === 'HIGH' || conv.metadata.priority === 'CRITICAL' || conv.metadata.priority === 'MEDIUM') ||
              (conv.metadata.outcome && conv.metadata.outcome.includes('decided')) ||
              (conv.metadata.outcome && conv.metadata.outcome.includes('approved'));
            
            if (query.includes('high') || query.includes('critical') || query.includes('medium')) {
              expect(hasRelevantContext).toBe(true);
            }
          });
        }
      });
    });
  });

  describe('Decision and Insight Queries', () => {
    it('should retrieve decisions by impact and confidence', () => {
      const decisionQueries = [
        'high impact decisions',
        'critical decisions',
        'decisions with high confidence',
        'recent important decisions'
      ];

      decisionQueries.forEach(query => {
        const result = api.query(query);
        expect(result.decisions).toBeDefined();
        
        if (result.decisions.length > 0) {
          result.decisions.forEach(decision => {
            expect(['HIGH', 'CRITICAL', 'MEDIUM']).toContain(decision.metadata.impact);
            expect(['HIGH', 'MEDIUM', 'LOW']).toContain(decision.metadata.confidence);
          });
        }
      });
    });

    it('should find insights by category and priority', () => {
      const insightQueries = [
        'technical insights',
        'security insights',
        'high priority insights',
        'architecture related insights',
        'performance insights'
      ];

      insightQueries.forEach(query => {
        const result = api.query(query);
        expect(result.insights).toBeDefined();
        
        if (result.insights.length > 0) {
          result.insights.forEach(insight => {
            const hasRelevantCategory = insight.data.includes('TECHNICAL') ||
                                       insight.data.includes('SECURITY') ||
                                       insight.data.includes('ARCHITECTURE') ||
                                       insight.data.includes('PERFORMANCE') ||
                                       insight.data.includes('UX');
            expect(hasRelevantCategory).toBe(true);
          });
        }
      });
    });

    it('should correlate decisions with related conversations', () => {
      const result = api.query('decisions and their related conversations');
      
      expect(result.decisions).toBeDefined();
      expect(result.conversations).toBeDefined();
      
      // Validate correlation exists
      if (result.decisions.length > 0 && result.conversations.length > 0) {
        const decisionSources = result.decisions.map(d => d.metadata.source);
        const conversationTopics = result.conversations.map(c => c.metadata.topic);
        
        // Should have some thematic overlap
        const hasCorrelation = decisionSources.some(source =>
          conversationTopics.some(topic => 
            topic.includes('machine_learning') || 
            topic.includes('architecture') || 
            topic.includes('security')
          )
        );
        expect(hasCorrelation).toBe(true);
      }
    });
  });

  describe('Work State and Context Queries', () => {
    it('should retrieve current work state', () => {
      const workStateQueries = [
        'what am I working on',
        'current tasks',
        'active work',
        'what is the current context'
      ];

      workStateQueries.forEach(query => {
        const result = api.query(query);
        expect(result.workState).toBeDefined();
        
        if (result.workState.currentTask) {
          expect(result.workState.currentTask).toContain('neural network');
        }
      });
    });

    it('should identify blockers and next actions', () => {
      const actionQueries = [
        'what are my blockers',
        'what should I do next',
        'current blockers',
        'next actions'
      ];

      actionQueries.forEach(query => {
        const result = api.query(query);
        expect(result.workState).toBeDefined();
        
        if (query.includes('blocker')) {
          expect(result.workState.blockers).toBeDefined();
        }
        
        if (query.includes('next')) {
          expect(result.workState.nextActions).toBeDefined();
        }
      });
    });

    it('should track context switches', () => {
      const result = api.query('context switches');
      expect(result.workState).toBeDefined();
      
      if (result.workState.contextSwitches) {
        expect(result.workState.contextSwitches.length).toBeGreaterThan(0);
        expect(result.workState.contextSwitches[0]).toContain('Switching focus');
      }
    });
  });

  describe('Analytics and Aggregation', () => {
    it('should provide conversation statistics', () => {
      const result = api.getAnalytics();
      
      expect(result.stats).toBeDefined();
      expect(result.stats.totalConversations).toBeGreaterThan(0);
      expect(result.stats.totalMessages).toBeGreaterThan(0);
      expect(result.stats.totalTokens).toBeGreaterThan(0);
      expect(result.stats.averageMessagesPerConversation).toBeGreaterThan(0);
      expect(result.stats.averageTokensPerConversation).toBeGreaterThan(0);
    });

    it('should analyze conversation patterns by platform', () => {
      const result = api.getAnalytics();
      
      expect(result.platformBreakdown).toBeDefined();
      expect(result.platformBreakdown.claude).toBeGreaterThan(0);
      expect(result.platformBreakdown.gpt).toBeGreaterThan(0);
      expect(result.platformBreakdown.copilot).toBeGreaterThan(0);
    });

    it('should track topic frequency', () => {
      const result = api.getAnalytics();
      
      expect(result.topicAnalysis).toBeDefined();
      expect(result.topicAnalysis.topTopics).toBeDefined();
      expect(Array.isArray(result.topicAnalysis.topTopics)).toBe(true);
      
      const hasExpectedTopics = result.topicAnalysis.topTopics.some(topic =>
        topic.includes('machine_learning') || 
        topic.includes('microservices') ||
        topic.includes('security')
      );
      expect(hasExpectedTopics).toBe(true);
    });

    it('should analyze decision patterns', () => {
      const result = api.getAnalytics();
      
      expect(result.decisionAnalysis).toBeDefined();
      expect(result.decisionAnalysis.byImpact).toBeDefined();
      expect(result.decisionAnalysis.byConfidence).toBeDefined();
      
      expect(result.decisionAnalysis.byImpact.CRITICAL).toBeGreaterThan(0);
      expect(result.decisionAnalysis.byImpact.HIGH).toBeGreaterThan(0);
    });

    it('should provide temporal activity patterns', () => {
      const result = api.getAnalytics();
      
      expect(result.temporalPatterns).toBeDefined();
      expect(result.temporalPatterns.conversationsByDate).toBeDefined();
      expect(result.temporalPatterns.activityTrends).toBeDefined();
      
      // Should have activity for multiple days
      const dates = Object.keys(result.temporalPatterns.conversationsByDate);
      expect(dates.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Complex Multi-faceted Queries', () => {
    it('should handle compound queries', () => {
      const compoundQueries = [
        'high priority conversations about security from this week',
        'critical decisions made by senior architect',
        'machine learning insights with high confidence',
        'recent conversations that resulted in decisions'
      ];

      compoundQueries.forEach(query => {
        const result = api.query(query);
        expect(result).toBeDefined();
        
        // Should return structured results
        const hasResults = result.conversations?.length > 0 || 
                          result.decisions?.length > 0 || 
                          result.insights?.length > 0;
        expect(hasResults).toBe(true);
      });
    });

    it('should correlate insights with conversations and decisions', () => {
      const result = api.query('show me security insights and related conversations');
      
      expect(result.insights).toBeDefined();
      expect(result.conversations).toBeDefined();
      
      // Should find security-related content
      if (result.insights.length > 0) {
        const hasSecurityInsight = result.insights.some(insight =>
          insight.data.toLowerCase().includes('security')
        );
        expect(hasSecurityInsight).toBe(true);
      }
      
      if (result.conversations.length > 0) {
        const hasSecurityConversation = result.conversations.some(conv =>
          conv.metadata.topic?.includes('security')
        );
        expect(hasSecurityConversation).toBe(true);
      }
    });

    it('should provide contextual summaries', () => {
      const result = api.query('summarize recent technical discussions');
      
      expect(result.summary).toBeDefined();
      expect(result.conversations).toBeDefined();
      
      if (result.summary) {
        expect(result.summary.totalConversations).toBeGreaterThan(0);
        expect(result.summary.keyTopics).toBeDefined();
        expect(result.summary.keyParticipants).toBeDefined();
        expect(result.summary.majorOutcomes).toBeDefined();
      }
    });
  });

  describe('API Error Handling and Edge Cases', () => {
    it('should handle invalid queries gracefully', () => {
      const invalidQueries = [
        '',
        null,
        undefined,
        'asdfghjkl qwerty nonsense query',
        '!@#$%^&*()_+',
        'conversations from the year 3000'
      ];

      invalidQueries.forEach(query => {
        const result = api.query(query);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        
        // Should return empty but valid structure
        expect(result.conversations || []).toEqual(expect.any(Array));
        expect(result.decisions || []).toEqual(expect.any(Array));
        expect(result.insights || []).toEqual(expect.any(Array));
      });
    });

    it('should handle queries when no data matches', () => {
      const noMatchQueries = [
        'conversations about cryptocurrency',
        'discussions with aliens',
        'decisions about time travel',
        'insights about unicorns'
      ];

      noMatchQueries.forEach(query => {
        const result = api.query(query);
        expect(result).toBeDefined();
        expect(result.conversations || []).toEqual(expect.any(Array));
        expect(result.decisions || []).toEqual(expect.any(Array));
        expect(result.insights || []).toEqual(expect.any(Array));
      });
    });

    it('should maintain performance with complex queries', async () => {
      const complexQuery = 'find all high priority conversations about machine learning or security with critical decisions made by senior architects or data scientists from the last week with high confidence insights';
      
      const timer = testUtils.performanceTimer();
      const result = api.query(complexQuery);
      const duration = timer.stop();
      
      console.log(`\n⚡ Complex Query Performance: ${duration.toFixed(2)}ms`);
      
      expect(duration).toBeLessThan(TEST_CONSTANTS.MAX_QUERY_TIME_MS || 1000);
      expect(result).toBeDefined();
    });

    it('should handle concurrent API requests', async () => {
      const queries = [
        'recent conversations',
        'high priority decisions',
        'technical insights',
        'current work state',
        'analytics summary'
      ];

      const promises = queries.map(query => 
        Promise.resolve(api.query(query))
      );

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(queries.length);
      results.forEach(result => {
        expect(result).toBeDefined();
      });
    });
  });

  describe('Integration with Core Components', () => {
    it('should integrate seamlessly with AICF Writer', async () => {
      const newConversation = {
        id: 'integration_test_new',
        timestamp_start: '2025-01-06T20:00:00Z',
        timestamp_end: '2025-01-06T21:00:00Z',
        messages: 15,
        tokens: 750,
        metadata: {
          platform: 'api_integration_test',
          topic: 'real_time_integration_testing',
          priority: 'HIGH'
        }
      };

      // Write through API
      const writeResult = await api.logConversation(newConversation);
      expect(writeResult.success).toBe(true);

      // Query immediately to test real-time integration
      const queryResult = api.query('real time integration testing');
      expect(queryResult.conversations).toBeDefined();
      
      const foundConversation = queryResult.conversations.find(c => 
        c.id === newConversation.id
      );
      expect(foundConversation).toBeDefined();
      expect(foundConversation.metadata.topic).toBe(newConversation.metadata.topic);
    });

    it('should maintain data consistency across operations', async () => {
      const initialAnalytics = api.getAnalytics();
      const initialTotal = initialAnalytics.stats.totalConversations;

      // Add new data
      await api.logConversation({
        id: 'consistency_test',
        messages: 10,
        tokens: 500,
        metadata: { platform: 'consistency_test' }
      });

      // Verify analytics updated
      const updatedAnalytics = api.getAnalytics();
      expect(updatedAnalytics.stats.totalConversations).toBe(initialTotal + 1);
      
      // Verify query reflects new data
      const queryResult = api.query('consistency test');
      expect(queryResult.conversations.length).toBeGreaterThanOrEqual(1);
    });
  });
});