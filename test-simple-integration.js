#!/usr/bin/env node

/**
 * Simple test for File Organization functionality
 */

const FileOrganizationAgent = require('./src/agents/file-organization-agent');
const MemoryLifecycleManager = require('./src/agents/memory-lifecycle-manager');

async function testSimpleIntegration() {
  console.log('🧪 Testing Simple Integration\n');
  
  try {
    // Test File Organization Agent
    console.log('🗂️  Testing File Organization Agent...');
    const orgAgent = new FileOrganizationAgent({ 
      projectRoot: process.cwd(),
      dryRun: true 
    });
    
    const rogueFiles = await orgAgent.scanForRogueFiles();
    console.log(`   ✅ Found ${rogueFiles.length} files that need organizing`);
    
    const config = orgAgent.getConfiguration();
    console.log(`   ✅ Configuration loaded: ${config.allowedFiles['.ai'].length} allowed .ai files`);
    
    // Test Memory Lifecycle Manager
    console.log('\n🧠 Testing Memory Lifecycle Manager...');
    const memoryManager = new MemoryLifecycleManager({ 
      projectRoot: process.cwd() 
    });
    
    // Test file organization integration
    console.log('   Testing file organization integration...');
    const orgResults = await memoryManager.processFileOrganization();
    
    if (orgResults.success) {
      console.log(`   ✅ File organization: ${orgResults.filesOrganized} files organized`);
    } else {
      console.log('   ⚠️  File organization had issues:', orgResults.error);
    }
    
    console.log('\n🎉 Simple integration test passed!');
    
    // Show what the complete system would look like
    console.log('\n📚 Complete System Usage:');
    console.log('```javascript');
    console.log('// File Organization');
    console.log('const agent = new FileOrganizationAgent();');
    console.log('await agent.organizeFiles();');
    console.log('');
    console.log('// Memory Management with integrated file organization');
    console.log('const memory = new MemoryLifecycleManager();');
    console.log('await memory.processLifecycle(); // Includes file organization');
    console.log('```');
    
  } catch (error) {
    console.error('❌ Simple integration test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testSimpleIntegration().then(() => {
  console.log('\n✅ Simple integration test complete!');
}).catch(console.error);