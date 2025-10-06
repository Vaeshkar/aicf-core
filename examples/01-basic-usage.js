/**
 * AICF-Core Example 1: Basic Usage
 * 
 * This example demonstrates the fundamental operations of AICF-Core:
 * - Creating an AICF instance
 * - Logging conversations
 * - Reading context
 * - Basic queries
 */

const { AICF } = require('aicf-core');
const path = require('path');

async function basicUsageExample() {
  console.log('🚀 AICF-Core Basic Usage Example\n');

  // Create AICF instance pointing to a demo directory
  const aicfDir = path.join(__dirname, '.aicf-demo');
  const aicf = AICF.create(aicfDir);

  console.log('📁 AICF directory:', aicfDir);
  console.log('');

  // ===== WRITING DATA =====
  console.log('✍️  Writing data to AICF...\n');

  // Log a conversation
  await aicf.logConversation({
    id: 'conv_basic_001',
    messages: 15,
    tokens: 750,
    metadata: {
      topic: 'basic_usage_tutorial',
      user: 'developer',
      timestamp: new Date().toISOString()
    }
  });
  console.log('✅ Logged conversation: conv_basic_001');

  // Add a decision
  await aicf.addDecision({
    description: 'Use AICF for persistent AI memory',
    impact: 'HIGH',
    confidence: 'HIGH',
    rationale: '95.5% compression with zero semantic loss'
  });
  console.log('✅ Added decision about AICF adoption');

  // Add an insight
  await aicf.addInsight({
    description: 'AICF format is AI-native and requires no preprocessing',
    category: 'ARCHITECTURE',
    priority: 'HIGH',
    confidence: 'HIGH'
  });
  console.log('✅ Added insight about AICF format');
  console.log('');

  // ===== READING DATA =====
  console.log('📖 Reading data from AICF...\n');

  // Get project statistics
  const stats = aicf.reader.getStats();
  console.log('📊 Project Statistics:');
  console.log('   - Total conversations:', stats.counts.conversations || 0);
  console.log('   - Total decisions:', stats.counts.decisions || 0);
  console.log('   - Total insights:', stats.counts.insights || 0);
  console.log('   - Last update:', stats.project.last_update || 'N/A');
  console.log('');

  // Get last conversations
  const lastConversations = aicf.reader.getLastConversations(5);
  console.log('💬 Last 5 Conversations:');
  lastConversations.forEach((conv, idx) => {
    console.log(`   ${idx + 1}. ${conv.id} - ${conv.metadata?.topic || 'No topic'}`);
  });
  console.log('');

  // ===== QUERYING DATA =====
  console.log('🔍 Querying data with natural language...\n');

  // Natural language query
  const queryResult = aicf.query('show me decisions about AICF');
  console.log('Query: "show me decisions about AICF"');
  console.log('Relevance Score:', queryResult.relevanceScore);
  console.log('Results:', queryResult.results.length, 'items found');
  console.log('');

  // ===== PROJECT OVERVIEW =====
  console.log('📋 Getting project overview...\n');

  const overview = aicf.getProjectOverview();
  console.log('Project Summary:');
  console.log(overview.summary);
  console.log('');

  // ===== HEALTH CHECK =====
  console.log('🏥 Checking system health...\n');

  const health = aicf.healthCheck();
  console.log('Health Status:', health.status);
  if (health.issues.length > 0) {
    console.log('Issues:', health.issues);
  } else {
    console.log('✅ No issues detected');
  }
  console.log('');

  console.log('✨ Basic usage example completed successfully!');
}

// Run the example
if (require.main === module) {
  basicUsageExample().catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}

module.exports = basicUsageExample;

