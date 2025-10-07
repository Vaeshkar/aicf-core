#!/usr/bin/env node

/**
 * Test the complete integrated AICF system
 */

const { AICF } = require('./src/index');

async function testIntegratedSystem() {
  console.log('🧪 Testing Integrated AICF System\n');
  
  try {
    // Create AICF instance
    const aicf = AICF.create('.aicf');
    
    console.log('🏗️  AICF instance created');
    console.log('📦 Available agents:', Object.keys(aicf.agents));
    
    // Test version info
    console.log('\n📋 Version Info:');
    const version = AICF.getVersion();
    console.log(`   Version: ${version.version}`);
    console.log(`   Format: ${version.aicfFormat}`);
    console.log(`   Compression: ${version.compressionRatio}`);
    
    // Test file organization
    console.log('\n🗂️  Testing File Organization...');
    const orgResults = await aicf.organizeFiles();
    console.log(`   Files scanned: ${orgResults.scanned}`);
    console.log(`   Files organized: ${orgResults.organized}`);
    console.log(`   Errors: ${orgResults.errors}`);
    
    // Test memory lifecycle (if no files need organizing)
    if (orgResults.scanned === 0) {
      console.log('\n🧠 Testing Memory Lifecycle...');
      const memoryResults = await aicf.runMemoryLifecycle();
      
      if (memoryResults.success) {
        console.log('   ✅ Memory lifecycle completed');
        console.log('   Results:', JSON.stringify(memoryResults.results, null, 2));
      } else {
        console.log('   ❌ Memory lifecycle failed:', memoryResults.error);
      }
    }
    
    // Test basic AICF functionality
    console.log('\n💬 Testing Core AICF Functionality...');
    
    // Test project overview
    const overview = aicf.getProjectOverview();
    console.log(`   Project: ${overview.stats?.project?.name || 'Unknown'}`);
    console.log(`   Conversations: ${overview.stats?.counts?.conversations || 0}`);
    console.log(`   Decisions: ${overview.stats?.counts?.decisions || 0}`);
    
    // Test query system
    const recentQuery = aicf.query('show me recent activity');
    console.log(`   Recent activity query returned ${recentQuery.conversations?.length || 0} conversations`);
    
    console.log('\n🎉 All systems working correctly!');
    
  } catch (error) {
    console.error('❌ System test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
testIntegratedSystem().then(() => {
  console.log('\n✅ Integrated system test complete!');
  console.log('\n📚 Usage examples:');
  console.log('   const aicf = AICF.create(".aicf");');
  console.log('   await aicf.organizeFiles();');
  console.log('   await aicf.runMemoryLifecycle();');
  console.log('   const overview = aicf.getProjectOverview();');
}).catch(console.error);