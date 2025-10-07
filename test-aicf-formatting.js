#!/usr/bin/env node

/**
 * Test AICF Linting and Prettier with real edge case data
 */

const AICFLinting = require('./src/aicf-linting');
const AICFPrettier = require('./src/aicf-prettier');

async function testAICFFormatting() {
  console.log('🧪 Testing AICF Linting and Prettier with Real Data\n');

  const linter = new AICFLinting();
  const prettier = new AICFPrettier();

  try {
    // Phase 1: Lint current files to see inconsistencies
    console.log('📋 Phase 1: Linting Current AICF Files\n');
    
    const lintResults = await linter.lintDirectory('.aicf');
    
    console.log(`📊 Linting Summary:`);
    console.log(`   Total Files: ${lintResults.summary.totalFiles}`);
    console.log(`   Valid Files: ${lintResults.summary.validFiles}`);
    console.log(`   Total Errors: ${lintResults.summary.totalErrors}`);
    console.log(`   Total Warnings: ${lintResults.summary.totalWarnings}`);
    console.log(`   Total Suggestions: ${lintResults.summary.totalSuggestions}`);
    
    console.log('\n📋 Format Distribution:');
    Object.entries(lintResults.summary.formatDistribution).forEach(([format, count]) => {
      console.log(`   ${format}: ${count} files`);
    });

    console.log('\n🔍 Detailed File Analysis:');
    lintResults.results.forEach(result => {
      console.log(`\n📄 ${result.filePath}:`);
      console.log(`   Format: ${result.format}`);
      console.log(`   Valid: ${result.isValid ? '✅' : '❌'}`);
      
      if (result.errors.length > 0) {
        console.log(`   Errors:`);
        result.errors.slice(0, 3).forEach(error => {
          console.log(`     ${error.type}: ${error.message}`);
        });
        if (result.errors.length > 3) {
          console.log(`     ... and ${result.errors.length - 3} more errors`);
        }
      }
      
      if (result.warnings.length > 0) {
        console.log(`   Warnings:`);
        result.warnings.slice(0, 3).forEach(warning => {
          console.log(`     ${warning.type}: ${warning.message}`);
        });
        if (result.warnings.length > 3) {
          console.log(`     ... and ${result.warnings.length - 3} more warnings`);
        }
      }
      
      if (result.suggestions.length > 0) {
        console.log(`   Suggestions:`);
        result.suggestions.slice(0, 2).forEach(suggestion => {
          console.log(`     ${suggestion.type}: ${suggestion.message}`);
        });
      }
    });

    // Phase 2: Test prettifier on problematic files
    console.log('\n\n🎨 Phase 2: Testing Prettifier on Problem Files\n');

    const problematicFiles = lintResults.results.filter(r => 
      !r.isValid || r.format !== 'AICF_3.0'
    );

    if (problematicFiles.length === 0) {
      console.log('✅ No problematic files found! All files are already in AICF 3.0 format.');
    } else {
      console.log(`Found ${problematicFiles.length} files that need prettifying:`);
      
      for (const fileResult of problematicFiles) {
        const fileName = fileResult.filePath.split('/').pop();
        console.log(`\n🔧 Testing prettifier on ${fileName}:`);
        
        // Create backup
        const backupPath = fileResult.filePath + '.backup';
        const fs = require('fs');
        fs.copyFileSync(fileResult.filePath, backupPath);
        console.log(`   💾 Backup created: ${backupPath}`);
        
        // Test prettifier
        const prettifyResult = await prettier.prettifyFile(fileResult.filePath, fileResult.filePath + '.prettified');
        
        if (prettifyResult.success) {
          console.log(`   ✅ Prettified successfully:`);
          console.log(`      Original Format: ${prettifyResult.originalFormat}`);
          console.log(`      Sections Converted: ${prettifyResult.sectionsConverted}`);
          console.log(`      Entries Converted: ${prettifyResult.entriesConverted}`);
          
          // Validate the prettified version
          const validation = await prettier.validatePrettified(prettifyResult.outputPath);
          console.log(`   📋 Validation: ${validation.isValid ? '✅ Valid' : '❌ Invalid'}`);
          
          if (!validation.isValid && validation.errors) {
            console.log(`      Remaining errors: ${validation.errors.length}`);
            validation.errors.slice(0, 2).forEach(error => {
              console.log(`        ${error.type}: ${error.message}`);
            });
          }
        } else {
          console.log(`   ❌ Prettification failed: ${prettifyResult.error}`);
        }
      }
    }

    // Phase 3: Show what the ideal format should look like
    console.log('\n\n📚 Phase 3: AICF 3.0 Format Reference\n');
    
    console.log('✅ Ideal AICF 3.0 Format Example:');
    console.log(`
@DECISIONS
decision=Adopt microservices architecture
timestamp=2025-10-06T17:23:00Z
impact=HIGH
confidence=HIGH
rationale=Better scalability and maintainability

@TASKS  
task=Implement file organization agent
status=DONE
priority=HIGH
assignee=system
created=2025-10-06T15:00:00Z
completed=2025-10-06T17:00:00Z

@CONVERSATIONS
conversation=morning-standup
timestamp_start=2025-10-06T09:00:00Z
timestamp_end=2025-10-06T09:15:00Z
messages=12
participants=team
topic=sprint_planning
`);

  } catch (error) {
    console.error('❌ Testing failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run the test
testAICFFormatting().then(() => {
  console.log('\n🎉 AICF Formatting test complete!');
  console.log('\n💡 Next steps:');
  console.log('   1. Review backup files before applying changes');
  console.log('   2. Update .ai/README.md with format guidelines for AIs');
  console.log('   3. Create agents that use AICFLinting and AICFPrettier');
  console.log('   4. Force LLMs to write in AICF 3.0 format from the start');
}).catch(console.error);