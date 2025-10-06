/**
 * AICF-Core Example 4: Memory Management
 * 
 * This example demonstrates memory lifecycle management:
 * - Memory lifecycle processing
 * - Memory dropoff (7/30/90 day cycles)
 * - Automatic cleanup
 * - Memory optimization strategies
 */

const { AICF, MemoryLifecycleManager, MemoryDropoff } = require('aicf-core');
const path = require('path');

async function memoryManagementExample() {
  console.log('🚀 AICF-Core Memory Management Example\n');

  const aicfDir = path.join(__dirname, '.aicf-demo');
  const aicf = AICF.create(aicfDir);

  // ===== SETUP TEST DATA WITH DIFFERENT AGES =====
  console.log('📝 Setting up test data with different ages...\n');

  const now = Date.now();
  const ages = [
    { days: 1, label: '1 day old' },
    { days: 10, label: '10 days old' },
    { days: 35, label: '35 days old' },
    { days: 100, label: '100 days old' }
  ];

  for (let i = 0; i < ages.length; i++) {
    const age = ages[i];
    const timestamp = new Date(now - age.days * 24 * 60 * 60 * 1000);
    
    await aicf.logConversation({
      id: `conv_age_${age.days}d`,
      messages: 10,
      tokens: 500,
      metadata: {
        topic: `conversation_${age.label}`,
        timestamp: timestamp.toISOString(),
        age_days: age.days
      }
    });
    console.log(`✅ Created conversation: ${age.label}`);
  }
  console.log('');

  // ===== MEMORY LIFECYCLE MANAGER =====
  console.log('🔄 Memory Lifecycle Manager\n');

  const lifecycleManager = new MemoryLifecycleManager();

  console.log('Processing memory lifecycle...');
  await lifecycleManager.processMemoryCycle();
  console.log('✅ Memory lifecycle processed');
  console.log('');

  // ===== MEMORY DROPOFF CYCLES =====
  console.log('📉 Memory Dropoff Cycles\n');

  const dropoff = new MemoryDropoff();

  // 7-day dropoff
  console.log('Executing 7-day memory dropoff...');
  const dropoff7 = await dropoff.executeDropoff('7-day');
  console.log(`✅ 7-day dropoff: ${dropoff7.itemsProcessed} items processed`);
  console.log(`   Archived: ${dropoff7.itemsArchived}`);
  console.log('');

  // 30-day dropoff
  console.log('Executing 30-day memory dropoff...');
  const dropoff30 = await dropoff.executeDropoff('30-day');
  console.log(`✅ 30-day dropoff: ${dropoff30.itemsProcessed} items processed`);
  console.log(`   Archived: ${dropoff30.itemsArchived}`);
  console.log('');

  // 90-day dropoff
  console.log('Executing 90-day memory dropoff...');
  const dropoff90 = await dropoff.executeDropoff('90-day');
  console.log(`✅ 90-day dropoff: ${dropoff90.itemsProcessed} items processed`);
  console.log(`   Archived: ${dropoff90.itemsArchived}`);
  console.log('');

  // ===== MEMORY STATISTICS =====
  console.log('📊 Memory Statistics\n');

  const stats = aicf.reader.getStats();
  console.log('Current Memory Usage:');
  console.log('   Total conversations:', stats.counts.conversations || 0);
  console.log('   Total decisions:', stats.counts.decisions || 0);
  console.log('   Total insights:', stats.counts.insights || 0);
  console.log('');

  // ===== MEMORY OPTIMIZATION STRATEGIES =====
  console.log('💡 Memory Optimization Strategies\n');

  console.log('1. Regular Dropoff Schedule:');
  console.log('   - Run 7-day dropoff: Weekly');
  console.log('   - Run 30-day dropoff: Monthly');
  console.log('   - Run 90-day dropoff: Quarterly');
  console.log('');

  console.log('2. Selective Archiving:');
  console.log('   - Archive low-priority conversations');
  console.log('   - Keep high-impact decisions');
  console.log('   - Preserve critical insights');
  console.log('');

  console.log('3. Compression Benefits:');
  console.log('   - AICF achieves 95.5% compression');
  console.log('   - No additional compression needed');
  console.log('   - Zero semantic loss maintained');
  console.log('');

  // ===== AUTOMATED MEMORY MANAGEMENT =====
  console.log('🤖 Automated Memory Management Pattern\n');

  console.log('Example: Scheduled memory management');
  console.log('');
  console.log('```javascript');
  console.log('// Run daily at midnight');
  console.log('const cron = require("node-cron");');
  console.log('');
  console.log('cron.schedule("0 0 * * *", async () => {');
  console.log('  const manager = new MemoryLifecycleManager();');
  console.log('  await manager.processMemoryCycle();');
  console.log('  console.log("Daily memory cycle completed");');
  console.log('});');
  console.log('');
  console.log('// Run weekly dropoff on Sundays');
  console.log('cron.schedule("0 2 * * 0", async () => {');
  console.log('  const dropoff = new MemoryDropoff();');
  console.log('  await dropoff.executeDropoff("7-day");');
  console.log('  console.log("Weekly dropoff completed");');
  console.log('});');
  console.log('```');
  console.log('');

  // ===== MEMORY HEALTH CHECK =====
  console.log('🏥 Memory Health Check\n');

  const health = aicf.healthCheck();
  console.log('Memory Health Status:', health.status);
  if (health.issues.length > 0) {
    console.log('Issues detected:');
    health.issues.forEach((issue, idx) => {
      console.log(`   ${idx + 1}. ${issue}`);
    });
  } else {
    console.log('✅ Memory system is healthy');
  }
  console.log('');

  // ===== BEST PRACTICES =====
  console.log('✨ Memory Management Best Practices\n');

  console.log('1. ✅ Regular Lifecycle Processing');
  console.log('   - Run daily or weekly depending on volume');
  console.log('   - Automate with cron jobs or schedulers');
  console.log('');

  console.log('2. ✅ Tiered Dropoff Strategy');
  console.log('   - 7-day: Archive routine conversations');
  console.log('   - 30-day: Archive completed projects');
  console.log('   - 90-day: Archive historical data');
  console.log('');

  console.log('3. ✅ Preserve Critical Data');
  console.log('   - Keep high-impact decisions indefinitely');
  console.log('   - Preserve critical insights');
  console.log('   - Archive but don\'t delete important context');
  console.log('');

  console.log('4. ✅ Monitor Memory Health');
  console.log('   - Run health checks regularly');
  console.log('   - Track memory growth over time');
  console.log('   - Alert on anomalies');
  console.log('');

  console.log('5. ✅ Optimize Query Patterns');
  console.log('   - Use date range filters');
  console.log('   - Query recent data first');
  console.log('   - Cache frequently accessed data');
  console.log('');

  console.log('✨ Memory management example completed!');
}

// Run the example
if (require.main === module) {
  memoryManagementExample().catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}

module.exports = memoryManagementExample;

