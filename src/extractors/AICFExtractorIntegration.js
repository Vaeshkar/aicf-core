const { UniversalExtractor } = require('./UniversalExtractor');
const { AICFPrettier } = require('../middleware/AICFPrettier');
const { FileOrganizationAgent } = require('../agents/FileOrganizationAgent');
const fs = require('fs');
const path = require('path');

/**
 * AICF Extractor Integration
 * 
 * Safely connects the Universal Extractor to existing AICF core systems
 * Key principles:
 * 1. PRESERVE ALL EXISTING DATA - Never overwrite without backup
 * 2. INCREMENTAL UPDATES - Only add new conversations, don't replace existing
 * 3. FORMAT NORMALIZATION - Convert all extracted data to clean AICF 3.0 format
 * 4. VALIDATION - Ensure data quality before storage
 */
class AICFExtractorIntegration {
    constructor(options = {}) {
        this.options = {
            preserveExisting: true,
            normalizeFormat: true,
            organizeFiles: true,
            maxExtractionAge: '7d',
            ...options
        };

        this.extractor = new UniversalExtractor({
            backupEnabled: true,
            validateContent: true,
            ...options
        });

        this.prettifier = new AICFPrettier();
        this.organizer = new FileOrganizationAgent();
        
        this.conversationFile = '.aicf/conversations.aicf';
        this.insightsFile = '.aicf/insights.aicf';
        this.processedTrackingFile = '.aicf/extracted-conversations.json';
    }

    /**
     * Full extraction and integration workflow
     * This is the main entry point for conversation extraction
     */
    async extractAndIntegrate(options = {}) {
        const workflowOptions = {
            platforms: 'all',
            maxConversations: 10,
            ...options
        };

        console.log('🚀 Starting AICF extraction and integration workflow...');

        const results = {
            extraction: null,
            processing: null,
            organization: null,
            integration: null,
            summary: {}
        };

        try {
            // Step 1: Extract conversations with automatic backup
            console.log('\n📊 Step 1: Extracting conversations from all platforms...');
            results.extraction = await this.extractor.extractConversations(workflowOptions);
            
            if (results.extraction.conversations.length === 0) {
                console.log('ℹ️  No new conversations found');
                return results;
            }

            // Step 2: Process and normalize conversations
            console.log('\n🔧 Step 2: Processing and normalizing conversation data...');
            results.processing = await this.processConversations(results.extraction.conversations);

            // Step 3: Safely integrate with existing AICF data
            console.log('\n💾 Step 3: Integrating with existing AICF data...');
            results.integration = await this.safelyIntegrateConversations(results.processing.processed);

            // Step 4: Organize files (optional)
            if (this.options.organizeFiles) {
                console.log('\n📁 Step 4: Organizing files...');
                try {
                    results.organization = await this.organizer.organizeFiles();
                } catch (error) {
                    console.warn('⚠️  File organization failed, but continuing:', error.message);
                    results.organization = { error: error.message };
                }
            }

            // Generate summary
            results.summary = this.generateWorkflowSummary(results);
            
            console.log('\n✅ AICF extraction workflow completed successfully!');
            this.printSummary(results.summary);

            return results;

        } catch (error) {
            console.error('\n❌ AICF extraction workflow failed:', error.message);
            
            // If we have a backup from the extraction step, offer rollback
            if (results.extraction && results.extraction.backupId) {
                console.log(`💾 Backup available: ${results.extraction.backupId}`);
                console.log('🔄 To rollback: await extractor.rollbackToBackup("' + results.extraction.backupId + '")');
            }
            
            throw error;
        }
    }

    /**
     * Process conversations through analysis and normalization
     */
    async processConversations(conversations) {
        const results = {
            processed: [],
            analyzed: [],
            normalized: [],
            errors: []
        };

        console.log(`🔍 Processing ${conversations.length} extracted conversations...`);

        for (const conversation of conversations) {
            try {
                // Analyze conversation for insights and structure
                const analyzed = await this.analyzeConversation(conversation);
                results.analyzed.push(analyzed);

                // Normalize to AICF 3.0 format
                const normalized = await this.normalizeToAICF(analyzed);
                results.normalized.push(normalized);

                // Combine analysis and normalization
                const processed = {
                    ...conversation,
                    analysis: analyzed,
                    aicf: normalized
                };

                results.processed.push(processed);

            } catch (error) {
                console.warn(`⚠️  Failed to process conversation ${conversation.id}:`, error.message);
                results.errors.push({
                    conversationId: conversation.id,
                    error: error.message
                });
            }
        }

        console.log(`✅ Successfully processed ${results.processed.length}/${conversations.length} conversations`);
        return results;
    }

    /**
     * Analyze conversation using Dennis's pattern recognition approach
     */
    async analyzeConversation(conversation) {
        // For now, create a simplified analysis structure
        // This would eventually use Dennis's ConversationAnalyzer
        const analysis = {
            id: conversation.id,
            platform: conversation.source,
            timestamp: conversation.timestamp,
            
            // Extract key insights
            summary: this.generateConversationSummary(conversation),
            insights: this.extractInsights(conversation),
            technologies: this.extractTechnologies(conversation),
            
            // Metadata
            messageCount: conversation.messages ? conversation.messages.length : 0,
            contentLength: conversation.content ? conversation.content.length : 0,
            workingDirectories: conversation.metadata?.workingDirectories || [],
            
            // Quality indicators
            quality: this.assessConversationQuality(conversation),
            confidence: this.calculateConfidence(conversation)
        };

        return analysis;
    }

    /**
     * Generate a concise summary of the conversation
     */
    generateConversationSummary(conversation) {
        const source = conversation.source;
        const messageCount = conversation.messages ? conversation.messages.length : 0;
        
        // Extract first few words of content for context
        let context = '';
        if (conversation.content && conversation.content.length > 50) {
            context = conversation.content.substring(0, 100) + '...';
        }

        return {
            platform: source,
            messageCount: messageCount,
            preview: context,
            duration: this.estimateDuration(conversation),
            type: this.classifyConversationType(conversation)
        };
    }

    /**
     * Extract key insights from conversation content
     */
    extractInsights(conversation) {
        const insights = [];
        const content = conversation.content || '';
        
        // Simple pattern matching for now - would use Dennis's analyzer later
        if (content.toLowerCase().includes('error') || content.toLowerCase().includes('fix')) {
            insights.push({
                type: 'problem_solving',
                confidence: 0.7,
                description: 'Conversation involved troubleshooting or error resolution'
            });
        }

        if (content.toLowerCase().includes('create') || content.toLowerCase().includes('implement')) {
            insights.push({
                type: 'development',
                confidence: 0.8,
                description: 'Conversation involved creating or implementing functionality'
            });
        }

        return insights;
    }

    /**
     * Extract technology mentions
     */
    extractTechnologies(conversation) {
        const content = conversation.content || '';
        const technologies = new Set();
        
        // Simple tech detection - would be enhanced with Dennis's patterns
        const techPatterns = [
            /\b(javascript|js|typescript|ts|python|node|react|vue|angular)\b/gi,
            /\b(git|npm|yarn|pip|cargo|go)\b/gi,
            /\.(js|ts|py|json|md|html|css|jsx|tsx)\b/gi
        ];

        for (const pattern of techPatterns) {
            const matches = content.match(pattern);
            if (matches) {
                matches.forEach(match => technologies.add(match.toLowerCase()));
            }
        }

        return Array.from(technologies);
    }

    /**
     * Normalize conversation to AICF 3.0 format
     */
    async normalizeToAICF(analyzed) {
        try {
            // Create AICF 3.0 compliant structure
            const aicfData = {
                version: "3.0",
                type: "conversation",
                id: analyzed.id,
                timestamp: analyzed.timestamp,
                source: analyzed.platform,
                
                content: {
                    summary: analyzed.summary.preview,
                    insights: analyzed.insights,
                    technologies: analyzed.technologies,
                    messageCount: analyzed.messageCount
                },
                
                metadata: {
                    confidence: analyzed.confidence,
                    quality: analyzed.quality,
                    extractedAt: new Date().toISOString(),
                    processingVersion: "1.0"
                }
            };

            // Use AICFPrettier to ensure format compliance
            const normalized = await this.prettifier.prettifyData(aicfData);
            return normalized;

        } catch (error) {
            console.warn(`⚠️  Failed to normalize conversation ${analyzed.id}:`, error.message);
            // Return basic structure as fallback
            return {
                version: "3.0",
                type: "conversation", 
                id: analyzed.id,
                timestamp: analyzed.timestamp,
                content: { error: "normalization_failed" }
            };
        }
    }

    /**
     * Safely integrate conversations with existing AICF data
     * CRITICAL: This must preserve all existing data
     */
    async safelyIntegrateConversations(processedConversations) {
        const results = {
            added: [],
            skipped: [],
            errors: [],
            backupId: null
        };

        if (processedConversations.length === 0) {
            console.log('ℹ️  No processed conversations to integrate');
            return results;
        }

        try {
            // Get list of already processed conversations to avoid duplicates
            const alreadyProcessed = await this.getAlreadyProcessedConversations();

            console.log(`📋 Checking ${processedConversations.length} conversations against ${alreadyProcessed.size} already processed`);

            // Filter out duplicates
            const newConversations = processedConversations.filter(conv => {
                if (alreadyProcessed.has(conv.id)) {
                    results.skipped.push({
                        id: conv.id,
                        reason: 'already_processed'
                    });
                    return false;
                }
                return true;
            });

            if (newConversations.length === 0) {
                console.log('ℹ️  All conversations already processed - no new data to add');
                return results;
            }

            console.log(`💾 Adding ${newConversations.length} new conversations to AICF files`);

            // Append to conversation file (preserving existing content)
            for (const conversation of newConversations) {
                try {
                    await this.appendToConversationFile(conversation);
                    results.added.push(conversation.id);
                    
                    // Track as processed
                    alreadyProcessed.add(conversation.id);
                    
                } catch (error) {
                    console.warn(`⚠️  Failed to add conversation ${conversation.id}:`, error.message);
                    results.errors.push({
                        id: conversation.id,
                        error: error.message
                    });
                }
            }

            // Update tracking file
            await this.updateProcessedTrackingFile(Array.from(alreadyProcessed));

            console.log(`✅ Successfully integrated ${results.added.length} new conversations`);
            return results;

        } catch (error) {
            console.error('❌ Failed to integrate conversations:', error.message);
            throw error;
        }
    }

    /**
     * Append conversation to AICF file without overwriting existing content
     */
    async appendToConversationFile(conversation) {
        const conversationEntry = this.formatConversationForAICF(conversation);
        
        // Read existing content to preserve it
        let existingContent = '';
        if (fs.existsSync(this.conversationFile)) {
            existingContent = fs.readFileSync(this.conversationFile, 'utf-8');
        }

        // Append new entry with proper separation
        const separator = existingContent.length > 0 ? '\n---\n\n' : '';
        const newContent = existingContent + separator + conversationEntry;

        // Write back with existing content preserved
        fs.writeFileSync(this.conversationFile, newContent, 'utf-8');
    }

    /**
     * Format conversation for AICF file storage
     */
    formatConversationForAICF(conversation) {
        const timestamp = new Date(conversation.timestamp).toISOString();
        const source = conversation.source || 'unknown';
        const summary = conversation.analysis?.summary?.preview || 'No summary available';
        
        return `# Conversation ${conversation.id}

**Source:** ${source}  
**Timestamp:** ${timestamp}  
**Messages:** ${conversation.analysis?.messageCount || 0}  

## Summary
${summary}

## Insights
${conversation.analysis?.insights?.map(i => `- ${i.description}`).join('\n') || 'No insights extracted'}

## Technologies
${conversation.analysis?.technologies?.join(', ') || 'None identified'}

## Metadata
- **Quality:** ${conversation.analysis?.quality || 'unknown'}
- **Confidence:** ${conversation.analysis?.confidence || 'unknown'}
- **Extracted:** ${new Date().toISOString()}`;
    }

    /**
     * Get set of already processed conversation IDs
     */
    async getAlreadyProcessedConversations() {
        const processed = new Set();
        
        try {
            if (fs.existsSync(this.processedTrackingFile)) {
                const trackingData = JSON.parse(fs.readFileSync(this.processedTrackingFile, 'utf-8'));
                if (Array.isArray(trackingData)) {
                    trackingData.forEach(id => processed.add(id));
                }
            }
        } catch (error) {
            console.warn('⚠️  Could not read processed conversation tracking:', error.message);
        }

        return processed;
    }

    /**
     * Update the tracking file with processed conversation IDs
     */
    async updateProcessedTrackingFile(processedIds) {
        try {
            const trackingData = {
                lastUpdated: new Date().toISOString(),
                totalProcessed: processedIds.length,
                conversationIds: processedIds
            };
            
            fs.writeFileSync(this.processedTrackingFile, JSON.stringify(trackingData, null, 2), 'utf-8');
        } catch (error) {
            console.warn('⚠️  Could not update processed conversation tracking:', error.message);
        }
    }

    /**
     * Utility methods for conversation analysis
     */
    estimateDuration(conversation) {
        if (conversation.metadata?.timespan?.duration) {
            return Math.round(conversation.metadata.timespan.duration / (1000 * 60)); // minutes
        }
        return null;
    }

    classifyConversationType(conversation) {
        const content = (conversation.content || '').toLowerCase();
        
        if (content.includes('command') || content.includes('terminal')) {
            return 'terminal_session';
        }
        if (content.includes('code') || content.includes('implement')) {
            return 'development';
        }
        if (content.includes('error') || content.includes('debug')) {
            return 'troubleshooting';
        }
        
        return 'general';
    }

    assessConversationQuality(conversation) {
        let score = 0;
        
        // Content length
        const contentLength = conversation.content ? conversation.content.length : 0;
        if (contentLength > 100) score += 1;
        if (contentLength > 500) score += 1;
        
        // Message count
        const messageCount = conversation.messages ? conversation.messages.length : 0;
        if (messageCount > 5) score += 1;
        if (messageCount > 20) score += 1;
        
        // Metadata richness
        if (conversation.metadata && Object.keys(conversation.metadata).length > 3) score += 1;
        
        return score >= 4 ? 'high' : score >= 2 ? 'medium' : 'low';
    }

    calculateConfidence(conversation) {
        // Simple confidence calculation based on data completeness
        let confidence = 0.3; // baseline
        
        if (conversation.content && conversation.content.length > 50) confidence += 0.2;
        if (conversation.messages && conversation.messages.length > 0) confidence += 0.2;
        if (conversation.timestamp) confidence += 0.1;
        if (conversation.metadata) confidence += 0.2;
        
        return Math.min(1.0, confidence);
    }

    /**
     * Generate workflow summary
     */
    generateWorkflowSummary(results) {
        return {
            extraction: {
                platformsProcessed: results.extraction?.success?.length || 0,
                platformsFailed: results.extraction?.failures?.length || 0,
                conversationsExtracted: results.extraction?.conversations?.length || 0,
                backupId: results.extraction?.backupId || null
            },
            processing: {
                conversationsProcessed: results.processing?.processed?.length || 0,
                processingErrors: results.processing?.errors?.length || 0
            },
            integration: {
                conversationsAdded: results.integration?.added?.length || 0,
                conversationsSkipped: results.integration?.skipped?.length || 0,
                integrationErrors: results.integration?.errors?.length || 0
            },
            organization: {
                filesOrganized: results.organization?.organized || 0,
                organizationErrors: results.organization?.errors || 0
            }
        };
    }

    /**
     * Print human-readable summary
     */
    printSummary(summary) {
        console.log(`\n📊 AICF Extraction Workflow Summary:`);
        console.log(`   🔍 Extraction: ${summary.extraction.conversationsExtracted} conversations from ${summary.extraction.platformsProcessed} platforms`);
        console.log(`   🔧 Processing: ${summary.processing.conversationsProcessed} conversations analyzed`);
        console.log(`   💾 Integration: ${summary.integration.conversationsAdded} new conversations added`);
        console.log(`   📁 Organization: ${summary.organization.filesOrganized} files organized`);
        
        if (summary.extraction.backupId) {
            console.log(`   💾 Backup created: ${summary.extraction.backupId}`);
        }
        
        const totalErrors = summary.extraction.platformsFailed + summary.processing.processingErrors + summary.integration.integrationErrors;
        if (totalErrors > 0) {
            console.log(`   ⚠️  Total errors: ${totalErrors}`);
        }
    }

    /**
     * Get status of all systems
     */
    async getStatus() {
        return {
            extractor: this.extractor.getStatus(),
            backups: this.extractor.listBackups(),
            processedConversations: (await this.getAlreadyProcessedConversations()).size,
            files: {
                conversations: fs.existsSync(this.conversationFile),
                insights: fs.existsSync(this.insightsFile),
                tracking: fs.existsSync(this.processedTrackingFile)
            }
        };
    }
}

module.exports = { AICFExtractorIntegration };