/**
 * AICF-Core Example 3: Advanced Queries
 * 
 * This example demonstrates advanced querying capabilities:
 * - Natural language queries
 * - Date range filtering
 * - Priority-based filtering
 * - Category-based filtering
 * - Full-text search
 */

const { AICF } = require('aicf-core');
const path = require('path');

async function advancedQueriesExample() {
  console.log('🚀 AICF-Core Advanced Queries Example\n');

  const aicfDir = path.join(__dirname, '.aicf-demo');
  const aicf = AICF.create(aicfDir);

  // ===== SETUP TEST DATA =====
  console.log('📝 Setting up test data...\n');

  // Add diverse conversations
  const topics = ['authentication', 'database', 'api_design', 'performance', 'security'];
  for (let i = 0; i < 5; i++) {
    await aicf.logConversation({
      id: `conv_query_${i}`,
      messages: 10 + i * 3,
      tokens: 500 + i * 150,
      metadata: {
        topic: topics[i],
        priority: i % 2 === 0 ? 'HIGH' : 'MEDIUM',
        timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString()
      }
    });
  }

  // Add diverse decisions
  await aicf.addDecision({
    description: 'Use JWT for authentication',
    impact: 'HIGH',
    confidence: 'HIGH',
    rationale: 'Industry standard, stateless, scalable'
  });

  await aicf.addDecision({
    description: 'Implement database connection pooling',
    impact: 'MEDIUM',
    confidence: 'HIGH',
    rationale: 'Improves performance under load'
  });

  // Add diverse insights
  await aicf.addInsight({
    description: 'API response time increased by 200ms',
    category: 'PERFORMANCE',
    priority: 'HIGH',
    confidence: 'HIGH'
  });

  await aicf.addInsight({
    description: 'Security headers missing in API responses',
    category: 'SECURITY',
    priority: 'CRITICAL',
    confidence: 'HIGH'
  });

  console.log('✅ Test data created\n');

  // ===== NATURAL LANGUAGE QUERIES =====
  console.log('🔍 Natural Language Queries\n');

  const queries = [
    'show me high-impact decisions',
    'what are the security insights',
    'recent performance issues',
    'authentication related conversations',
    'critical priority items'
  ];

  for (const query of queries) {
    const result = aicf.query(query);
    console.log(`Query: "${query}"`);
    console.log(`   Relevance: ${result.relevanceScore}`);
    console.log(`   Results: ${result.results.length} items`);
    console.log('');
  }

  // ===== DATE RANGE FILTERING =====
  console.log('📅 Date Range Filtering\n');

  // Last 24 hours
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recent = aicf.reader.getConversationsByDate(last24h);
  console.log(`Conversations in last 24 hours: ${recent.length}`);

  // Last 7 days
  const last7days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const lastWeek = aicf.reader.getConversationsByDate(last7days);
  console.log(`Conversations in last 7 days: ${lastWeek.length}`);

  // Last 30 days
  const last30days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const lastMonth = aicf.reader.getConversationsByDate(last30days);
  console.log(`Conversations in last 30 days: ${lastMonth.length}`);
  console.log('');

  // ===== PRIORITY-BASED FILTERING =====
  console.log('⭐ Priority-Based Filtering\n');

  // Get high priority insights
  const highPriorityInsights = aicf.reader.getInsightsByPriority('HIGH');
  console.log(`High priority insights: ${highPriorityInsights.length}`);
  highPriorityInsights.forEach((insight, idx) => {
    console.log(`   ${idx + 1}. ${insight.description}`);
  });
  console.log('');

  // Get critical priority insights
  const criticalInsights = aicf.reader.getInsightsByPriority('CRITICAL');
  console.log(`Critical priority insights: ${criticalInsights.length}`);
  criticalInsights.forEach((insight, idx) => {
    console.log(`   ${idx + 1}. ${insight.description}`);
  });
  console.log('');

  // ===== CATEGORY-BASED FILTERING =====
  console.log('🏷️  Category-Based Filtering\n');

  const categories = ['PERFORMANCE', 'SECURITY', 'ARCHITECTURE'];
  for (const category of categories) {
    const insights = aicf.reader.getInsightsByCategory(category);
    console.log(`${category} insights: ${insights.length}`);
    insights.forEach((insight, idx) => {
      console.log(`   ${idx + 1}. ${insight.description}`);
    });
    console.log('');
  }

  // ===== IMPACT-BASED FILTERING =====
  console.log('💥 Impact-Based Filtering\n');

  // High impact decisions
  const highImpact = aicf.reader.getDecisionsByImpact('HIGH');
  console.log(`High impact decisions: ${highImpact.length}`);
  highImpact.forEach((decision, idx) => {
    console.log(`   ${idx + 1}. ${decision.description}`);
    console.log(`      Confidence: ${decision.metadata.confidence}`);
  });
  console.log('');

  // ===== COMBINED FILTERING =====
  console.log('🔗 Combined Filtering\n');

  // Get high-impact decisions from last 7 days
  const recentHighImpact = aicf.reader.getDecisionsByDate(last7days)
    .filter(d => d.metadata.impact === 'HIGH');
  console.log(`High-impact decisions in last 7 days: ${recentHighImpact.length}`);
  console.log('');

  // Get critical security insights
  const criticalSecurity = aicf.reader.getInsightsByCategory('SECURITY')
    .filter(i => i.metadata.priority === 'CRITICAL');
  console.log(`Critical security insights: ${criticalSecurity.length}`);
  console.log('');

  // ===== ANALYTICS QUERIES =====
  console.log('📊 Analytics Queries\n');

  const analytics = aicf.generateAnalytics();
  console.log('Project Analytics:');
  console.log('   Total conversations:', analytics.overview.totalConversations);
  console.log('   Total decisions:', analytics.overview.totalDecisions);
  console.log('   High priority insights:', analytics.insights.highPriority);
  console.log('   Activity level:', analytics.overview.activityLevel);
  console.log('');

  // ===== SEARCH PATTERNS =====
  console.log('🔎 Search Patterns\n');

  // Search for specific keywords
  const authResults = aicf.query('authentication');
  console.log('Search "authentication":');
  console.log(`   Found ${authResults.results.length} results`);
  console.log('');

  const perfResults = aicf.query('performance');
  console.log('Search "performance":');
  console.log(`   Found ${perfResults.results.length} results`);
  console.log('');

  console.log('✨ Advanced queries example completed!');
}

// Run the example
if (require.main === module) {
  advancedQueriesExample().catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}

module.exports = advancedQueriesExample;

