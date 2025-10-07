#!/usr/bin/env node

/**
 * Test script for File Organization Agent
 * Run this to see what files are out of place and need organizing
 */

const FileOrganizationAgent = require('./src/agents/file-organization-agent');

async function testFileOrganization() {
  console.log('🧪 Testing File Organization Agent\n');
  
  // Create agent in dry-run mode (won't actually move files)
  const agent = new FileOrganizationAgent({ 
    dryRun: true,
    projectRoot: process.cwd()
  });

  try {
    // First, validate current structure
    console.log('📋 Validating directory structure...');
    const issues = await agent.validateStructure();
    
    if (issues.length > 0) {
      console.log('⚠️  Structure issues found:');
      issues.forEach(issue => {
        console.log(`   ${issue.severity}: ${issue.type} - ${issue.directory}${issue.file ? '/' + issue.file : ''}`);
      });
      console.log();
    } else {
      console.log('✅ Directory structure is valid\n');
    }

    // Scan for rogue files
    console.log('🔍 Scanning for files that need organizing...');
    const rogueFiles = await agent.scanForRogueFiles();
    
    if (rogueFiles.length === 0) {
      console.log('✅ All files are properly organized!\n');
      return;
    }

    console.log(`📁 Found ${rogueFiles.length} files that need organizing:\n`);
    
    // Group by current directory for better display
    const byDirectory = {};
    rogueFiles.forEach(file => {
      if (!byDirectory[file.directory]) {
        byDirectory[file.directory] = [];
      }
      byDirectory[file.directory].push(file);
    });

    // Display results
    Object.entries(byDirectory).forEach(([directory, files]) => {
      console.log(`📂 ${directory}/`);
      files.forEach(file => {
        console.log(`   ${file.basename}`);
        console.log(`      → ${file.classification.suggestedTarget}`);
        console.log(`      → Reason: ${file.classification.rule}`);
        console.log(`      → Confidence: ${file.classification.confidence}`);
        console.log();
      });
    });

    // Show what would happen if we ran the organization
    console.log('🎯 Dry run results (what WOULD happen):');
    const results = await agent.organizeFiles();
    
    console.log(`   📊 Scanned: ${results.scanned} files`);
    console.log(`   ✅ Would organize: ${results.organized} files`);
    console.log(`   ⏭️  Would skip: ${results.skipped} files`);
    console.log(`   ❌ Errors: ${results.errors} files`);

    if (results.actions.length > 0) {
      console.log('\n📋 Planned actions:');
      results.actions.forEach(action => {
        if (action.success) {
          console.log(`   ✅ ${action.action}: ${action.file} → ${action.target}`);
        } else {
          console.log(`   ❌ ${action.action}: ${action.file} (${action.reason || action.error})`);
        }
      });
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testFileOrganization().then(() => {
  console.log('\n🎉 File organization test complete!');
  console.log('\n💡 To actually organize files, run:');
  console.log('   const agent = new FileOrganizationAgent({ dryRun: false });');
  console.log('   await agent.organizeFiles();');
}).catch(console.error);