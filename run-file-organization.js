#!/usr/bin/env node

/**
 * Actually run file organization (not dry-run)
 * This will move files to their proper locations
 */

const FileOrganizationAgent = require('./src/agents/file-organization-agent');

async function runFileOrganization() {
  console.log('🚀 Running File Organization Agent (REAL MODE)\n');
  
  // Create agent in REAL mode (will actually move files)
  const agent = new FileOrganizationAgent({ 
    dryRun: false,  // REAL mode
    projectRoot: process.cwd()
  });

  // Override safety to be less conservative for this cleanup
  agent.safety.requireConfirmation = false; // Don't ask for each file
  agent.safety.maxBatchSize = 25; // Process all files at once

  try {
    console.log('📋 Pre-organization scan...');
    const rogueFiles = await agent.scanForRogueFiles();
    console.log(`Found ${rogueFiles.length} files to organize\n`);

    if (rogueFiles.length === 0) {
      console.log('✅ All files are already organized!\n');
      return;
    }

    // Show what will happen
    console.log('📁 Files that will be moved:');
    rogueFiles.forEach(file => {
      console.log(`   ${file.current} → ${file.classification.suggestedTarget}`);
    });
    console.log();

    // Actually run the organization
    console.log('🔄 Starting file organization...');
    const results = await agent.organizeFiles();
    
    console.log('\n📊 Organization Results:');
    console.log(`   📁 Files scanned: ${results.scanned}`);
    console.log(`   ✅ Files organized: ${results.organized}`);
    console.log(`   ⏭️  Files skipped: ${results.skipped}`);
    console.log(`   ❌ Errors: ${results.errors}`);

    if (results.actions.length > 0) {
      console.log('\n📋 Actions taken:');
      results.actions.forEach(action => {
        if (action.success) {
          console.log(`   ✅ ${action.action}: ${path.basename(action.file)}`);
        } else {
          console.log(`   ❌ ${action.action}: ${path.basename(action.file)} (${action.reason || action.error})`);
        }
      });
    }

    // Validate the cleanup worked
    console.log('\n🔍 Post-organization validation...');
    const remainingRogueFiles = await agent.scanForRogueFiles();
    
    if (remainingRogueFiles.length === 0) {
      console.log('🎉 Perfect! All files are now properly organized!\n');
    } else {
      console.log(`⚠️  ${remainingRogueFiles.length} files still need organization (run again)\n`);
    }

  } catch (error) {
    console.error('❌ Organization failed:', error.message);
    process.exit(1);
  }
}

const path = require('path');

// Run the organization
runFileOrganization().then(() => {
  console.log('🎯 File organization complete!');
  console.log('💾 Backups are stored in .backups/file-organization/ if you need to undo anything');
}).catch(console.error);