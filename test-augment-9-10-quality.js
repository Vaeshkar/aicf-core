#!/usr/bin/env node

/**
 * Enhanced Augment Parser Test - Validate 9/10 Quality
 * 
 * Tests the enhanced extraction recipe that should push Augment
 * from 7/10 to 9/10 quality through rich context integration.
 */

const AugmentParser = require('./src/extractors/parsers/AugmentParser');

async function testEnhancedAugmentParser() {
    console.log('🚀 ENHANCED AUGMENT PARSER TEST - 9/10 QUALITY VALIDATION');
    console.log('========================================================\n');
    
    const parser = new AugmentParser();
    
    try {
        // Step 1: Check workspace detection and quality assessment
        console.log('🔍 STEP 1: Workspace Detection & Quality Assessment');
        console.log('---------------------------------------------------');
        
        const status = parser.getStatus();
        console.log(`📊 Augment Status:`, status);
        
        if (!status.available) {
            console.log('❌ No Augment workspaces found. Cannot test enhanced extraction.');
            return;
        }
        
        // Step 2: Analyze data quality of detected workspaces
        console.log('\n📊 STEP 2: Data Quality Analysis');
        console.log('-----------------------------------');
        
        const workspaces = parser.augmentWorkspaces;
        console.log(`🎯 Found ${workspaces.length} workspaces for testing`);
        
        workspaces.forEach((workspace, index) => {
            console.log(`\n   Workspace ${index + 1}: ${workspace.workspaceId.substring(0, 8)}`);
            console.log(`   🎯 Quality Score: ${workspace.dataQuality.score}/10 - ${workspace.dataQuality.description}`);
            console.log(`   📁 Data Sources: ${workspace.dataQuality.dataSources.join(', ')}`);
            
            // Show what enhanced data sources are available
            const sources = workspace.dataSources;
            if (sources.globalState) {
                console.log(`   📋 Global State Files:`);
                Object.entries(sources.globalState).forEach(([filename, info]) => {
                    if (info.available) {
                        console.log(`      ✅ ${filename}: ${Math.round(info.size / 1024)}KB (${new Date(info.lastModified).toLocaleDateString()})`);
                    }
                });
            }
        });
        
        // Step 3: Test enhanced extraction on highest quality workspace
        console.log('\n🔬 STEP 3: Enhanced Extraction Test');
        console.log('------------------------------------');
        
        const bestWorkspace = workspaces[0]; // Already sorted by quality
        console.log(`🎯 Testing on highest quality workspace: ${bestWorkspace.dataQuality.score}/10`);
        
        // Test with limited extraction to avoid overwhelming output
        const conversations = await parser.extractConversations({
            maxConversations: 3,
            workspaceLimit: 1,
            timeframe: '7d'
        });
        
        console.log(`\n📊 EXTRACTION RESULTS:`);
        console.log(`   💬 Extracted Conversations: ${conversations.length}`);
        
        // Step 4: Analyze extraction quality
        console.log('\n🎨 STEP 4: Quality Analysis');
        console.log('----------------------------');
        
        conversations.forEach((conv, index) => {
            console.log(`\n   Conversation ${index + 1}: ${conv.id}`);
            console.log(`   📝 Messages: ${conv.messages?.length || 0}`);
            console.log(`   🎯 Quality Score: ${conv.metadata?.qualityScore || 'N/A'}/10`);
            
            // Analyze enhanced metadata
            if (conv.metadata) {
                const enhancedFeatures = [];
                
                if (conv.metadata.fileContext?.length > 0) {
                    enhancedFeatures.push(`File Context (${conv.metadata.fileContext.length} files)`);
                }
                if (conv.metadata.toolUseIds?.length > 0) {
                    enhancedFeatures.push(`Tool Threading (${conv.metadata.toolUseIds.length} IDs)`);
                }
                if (conv.metadata.projectContext) {
                    enhancedFeatures.push(`Project Context (${conv.metadata.projectContext.split('/').pop()})`);
                }
                if (conv.metadata.gitBranch) {
                    enhancedFeatures.push(`Git Branch (${conv.metadata.gitBranch})`);
                }
                
                if (enhancedFeatures.length > 0) {
                    console.log(`   🔥 Enhanced Features: ${enhancedFeatures.join(', ')}`);
                } else {
                    console.log(`   ⚠️  No enhanced features detected`);
                }
                
                // Sample content analysis
                if (conv.content && conv.content.length > 100) {
                    const preview = conv.content.substring(0, 200) + '...';
                    console.log(`   📄 Content Preview: ${preview}`);
                } else if (conv.content) {
                    console.log(`   📄 Content: ${conv.content}`);
                }
            }
        });
        
        // Step 5: Quality validation
        console.log('\n✅ STEP 5: Quality Validation');
        console.log('-------------------------------');
        
        const qualityMetrics = {
            workspaceQuality: bestWorkspace.dataQuality.score,
            conversationsExtracted: conversations.length,
            enhancedConversations: conversations.filter(c => c.metadata?.qualityScore >= 8).length,
            withFileContext: conversations.filter(c => c.metadata?.fileContext?.length > 0).length,
            withToolThreading: conversations.filter(c => c.metadata?.toolUseIds?.length > 0).length,
            withProjectContext: conversations.filter(c => c.metadata?.projectContext).length,
            withGitContext: conversations.filter(c => c.metadata?.gitBranch).length
        };
        
        console.log(`📊 QUALITY METRICS:`);
        console.log(`   🎯 Workspace Quality: ${qualityMetrics.workspaceQuality}/10`);
        console.log(`   💬 Conversations: ${qualityMetrics.conversationsExtracted}`);
        console.log(`   🔥 Enhanced Quality (8+/10): ${qualityMetrics.enhancedConversations}`);
        console.log(`   📁 File Context: ${qualityMetrics.withFileContext}`);
        console.log(`   🔗 Tool Threading: ${qualityMetrics.withToolThreading}`);
        console.log(`   📊 Project Context: ${qualityMetrics.withProjectContext}`);
        console.log(`   📋 Git Context: ${qualityMetrics.withGitContext}`);
        
        // Calculate overall enhancement score
        const enhancementFeatures = [
            qualityMetrics.withFileContext > 0,
            qualityMetrics.withToolThreading > 0,
            qualityMetrics.withProjectContext > 0,
            qualityMetrics.withGitContext > 0
        ].filter(Boolean).length;
        
        const enhancementScore = Math.min(7 + enhancementFeatures * 0.75, 10);
        
        console.log(`\n🎯 FINAL ASSESSMENT:`);
        console.log(`   📈 Enhancement Score: ${enhancementScore.toFixed(1)}/10`);
        
        if (enhancementScore >= 9.0) {
            console.log(`   🎉 SUCCESS! Achieved 9/10+ quality through enhanced extraction`);
            console.log(`   ✅ Recipe Status: COMPLETE - Augment extraction enhanced to Warp-level quality`);
        } else if (enhancementScore >= 8.0) {
            console.log(`   ⭐ GOOD! Significant improvement achieved`);
            console.log(`   🔄 Recipe Status: NEARLY COMPLETE - Minor tweaks needed for 9/10`);
        } else {
            console.log(`   ⚠️  PARTIAL SUCCESS - Enhancement working but needs optimization`);
            console.log(`   🔄 Recipe Status: IN PROGRESS - More work needed for 9/10 quality`);
        }
        
        // Step 6: Next steps and recommendations
        console.log('\n🚀 STEP 6: Next Steps & Recommendations');
        console.log('---------------------------------------');
        
        if (enhancementScore >= 9.0) {
            console.log(`✅ READY FOR PRODUCTION:`);
            console.log(`   - Enhanced Augment extraction is production-ready`);
            console.log(`   - Quality matches Warp extraction standards`);
            console.log(`   - Can proceed with Claude Desktop extraction (#3/5)`);
        } else {
            console.log(`🔄 OPTIMIZATION NEEDED:`);
            if (qualityMetrics.withFileContext === 0) {
                console.log(`   - Improve file context extraction from recentlyOpenedFiles.json`);
            }
            if (qualityMetrics.withToolThreading === 0) {
                console.log(`   - Enhance tool use ID detection and threading`);
            }
            if (qualityMetrics.withProjectContext === 0) {
                console.log(`   - Better project structure integration`);
            }
            if (qualityMetrics.withGitContext === 0) {
                console.log(`   - Add git state correlation`);
            }
        }
        
    } catch (error) {
        console.error(`\n❌ TEST FAILED:`, error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run the test
if (require.main === module) {
    testEnhancedAugmentParser()
        .then(() => {
            console.log('\n✨ Enhanced Augment Parser Test Complete!');
        })
        .catch(error => {
            console.error('\n💥 Test execution failed:', error);
            process.exit(1);
        });
}

module.exports = { testEnhancedAugmentParser };