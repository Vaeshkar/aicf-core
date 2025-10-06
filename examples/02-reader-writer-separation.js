/**
 * AICF-Core Example 2: Reader/Writer Separation
 * 
 * This example demonstrates the separation of concerns pattern:
 * - Using AICFReader for read-only operations
 * - Using AICFWriter for write-only operations
 * - Benefits of separation for concurrent access
 */

const { AICFReader, AICFWriter } = require('aicf-core');
const path = require('path');

async function readerWriterExample() {
  console.log('🚀 AICF-Core Reader/Writer Separation Example\n');

  const aicfDir = path.join(__dirname, '.aicf-demo');

  // ===== WRITER OPERATIONS =====
  console.log('✍️  Writer Operations (Write-Only)\n');

  const writer = new AICFWriter(aicfDir);

  // Write multiple conversations
  console.log('Writing conversations...');
  for (let i = 1; i <= 3; i++) {
    await writer.logConversation({
      id: `conv_rw_${i}`,
      messages: 10 + i * 5,
      tokens: 500 + i * 100,
      metadata: {
        topic: `topic_${i}`,
        session: 'reader_writer_demo'
      }
    });
    console.log(`✅ Logged conversation ${i}/3`);
  }
  console.log('');

  // Write decisions
  console.log('Writing decisions...');
  await writer.addDecision({
    description: 'Separate read and write operations for better concurrency',
    impact: 'MEDIUM',
    confidence: 'HIGH',
    rationale: 'Allows multiple readers without blocking'
  });
  console.log('✅ Decision logged');
  console.log('');

  // ===== READER OPERATIONS =====
  console.log('📖 Reader Operations (Read-Only)\n');

  const reader = new AICFReader(aicfDir);

  // Read statistics
  console.log('Reading statistics...');
  const stats = reader.getStats();
  console.log('📊 Statistics:');
  console.log('   - Conversations:', stats.counts.conversations || 0);
  console.log('   - Decisions:', stats.counts.decisions || 0);
  console.log('');

  // Read last conversations
  console.log('Reading last conversations...');
  const lastConvs = reader.getLastConversations(5);
  console.log(`📝 Found ${lastConvs.length} recent conversations:`);
  lastConvs.forEach((conv, idx) => {
    console.log(`   ${idx + 1}. ${conv.id} (${conv.messages} messages, ${conv.tokens} tokens)`);
  });
  console.log('');

  // Read by date range
  console.log('Reading by date range...');
  const lastHour = new Date(Date.now() - 60 * 60 * 1000);
  const recentConvs = reader.getConversationsByDate(lastHour);
  console.log(`📅 Found ${recentConvs.length} conversations in the last hour`);
  console.log('');

  // Read decisions
  console.log('Reading decisions...');
  const decisions = reader.getDecisionsByDate(lastHour);
  console.log(`📋 Found ${decisions.length} recent decisions`);
  decisions.forEach((decision, idx) => {
    console.log(`   ${idx + 1}. ${decision.description}`);
    console.log(`      Impact: ${decision.metadata.impact}, Confidence: ${decision.metadata.confidence}`);
  });
  console.log('');

  // ===== CONCURRENT ACCESS PATTERN =====
  console.log('🔄 Demonstrating Concurrent Access Pattern\n');

  // Simulate multiple readers (safe)
  console.log('Creating multiple reader instances...');
  const reader1 = new AICFReader(aicfDir);
  const reader2 = new AICFReader(aicfDir);
  const reader3 = new AICFReader(aicfDir);

  const [stats1, stats2, stats3] = await Promise.all([
    Promise.resolve(reader1.getStats()),
    Promise.resolve(reader2.getStats()),
    Promise.resolve(reader3.getStats())
  ]);

  console.log('✅ All readers accessed data concurrently');
  console.log('   Reader 1 conversations:', stats1.counts.conversations || 0);
  console.log('   Reader 2 conversations:', stats2.counts.conversations || 0);
  console.log('   Reader 3 conversations:', stats3.counts.conversations || 0);
  console.log('');

  // ===== BENEFITS SUMMARY =====
  console.log('💡 Benefits of Reader/Writer Separation:\n');
  console.log('1. ✅ Multiple readers can access data concurrently');
  console.log('2. ✅ Writers are isolated and thread-safe');
  console.log('3. ✅ Clear separation of concerns');
  console.log('4. ✅ Better performance for read-heavy workloads');
  console.log('5. ✅ Easier to reason about data access patterns');
  console.log('');

  console.log('✨ Reader/Writer separation example completed!');
}

// Run the example
if (require.main === module) {
  readerWriterExample().catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}

module.exports = readerWriterExample;

