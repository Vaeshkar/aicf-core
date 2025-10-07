const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Warp Terminal Parser
 * Extracts conversations from Warp's SQLite database
 * Adapted from Dennis's existing extract-warp-conversation.js
 */
class WarpParser {
    constructor() {
        this.name = 'Warp Terminal';
        this.source = 'warp';
        
        // Warp database paths (try multiple possible locations)
        this.possibleDbPaths = [
            path.join(os.homedir(), 'Library/Group Containers/2BBY89MBSN.dev.warp/Library/Application Support/dev.warp.Warp-Stable/warp.sqlite'),
            path.join(os.homedir(), 'Library/Group Containers/2BBY89MBSN.dev.warp/Library/Application Support/dev.warp.Warp/warp.sqlite'),
            path.join(os.homedir(), 'Library/Application Support/dev.warp.Warp-Stable/warp.sqlite')
        ];
        
        this.dbPath = this.findWarpDatabase();
    }

    /**
     * Find the Warp database file
     */
    findWarpDatabase() {
        for (const dbPath of this.possibleDbPaths) {
            if (fs.existsSync(dbPath)) {
                console.log(`🔍 Found Warp database: ${dbPath}`);
                return dbPath;
            }
        }
        return null;
    }

    /**
     * Check if Warp is available on this system
     */
    isAvailable() {
        return this.dbPath !== null && fs.existsSync(this.dbPath);
    }

    /**
     * Get current status of Warp
     */
    getStatus() {
        if (!this.isAvailable()) {
            return {
                available: false,
                message: 'Warp database not found',
                searchedPaths: this.possibleDbPaths
            };
        }

        try {
            const stats = fs.statSync(this.dbPath);
            const ageHours = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60);
            
            return {
                available: true,
                dbPath: this.dbPath,
                lastModified: stats.mtime.toISOString(),
                ageHours: Math.round(ageHours * 10) / 10,
                size: this.formatFileSize(stats.size),
                message: `Warp database found and accessible (${ageHours < 24 ? 'recently active' : 'older activity'})`
            };
        } catch (error) {
            return {
                available: false,
                message: `Warp database found but not accessible: ${error.message}`
            };
        }
    }

    /**
     * Extract conversations from Warp SQLite database
     * Based on Dennis's proven extraction logic
     */
    async extractConversations(options = {}) {
        if (!this.isAvailable()) {
            throw new Error('Warp database not available');
        }

        const extractOptions = {
            maxConversations: 10,
            timeframe: '7d',
            ...options
        };

        console.log(`🔍 Extracting conversations from Warp database...`);

        try {
            // Use better-sqlite3 for reliable database access
            const Database = require('better-sqlite3');
            const db = new Database(this.dbPath, { readonly: true });

            // First, get list of recent conversations
            const conversationIds = await this.getRecentConversationIds(db, extractOptions);
            console.log(`📋 Found ${conversationIds.length} recent conversations`);

            const conversations = [];
            
            // Process each conversation
            for (const conversationId of conversationIds) {
                try {
                    const conversation = await this.extractSingleConversation(db, conversationId);
                    if (conversation) {
                        conversations.push(conversation);
                    }
                } catch (error) {
                    console.warn(`⚠️  Failed to extract conversation ${conversationId}:`, error.message);
                    // Continue with other conversations
                }
            }

            db.close();

            console.log(`✅ Successfully extracted ${conversations.length} conversations from Warp`);
            return conversations;

        } catch (error) {
            console.error(`❌ Error accessing Warp database:`, error.message);
            throw new Error(`Warp extraction failed: ${error.message}`);
        }
    }

    /**
     * Get list of recent conversation IDs
     */
    async getRecentConversationIds(db, options) {
        try {
            // Calculate time threshold
            const timeframe = this.parseTimeframe(options.timeframe);
            const cutoffTime = Date.now() - timeframe;
            
            const query = `
                SELECT DISTINCT conversation_id, MAX(last_modified_at) as latest_activity
                FROM agent_conversations 
                WHERE last_modified_at > ?
                ORDER BY latest_activity DESC 
                LIMIT ?
            `;

            const rows = db.prepare(query).all(cutoffTime, options.maxConversations);
            return rows.map(row => row.conversation_id);

        } catch (error) {
            console.error('Error getting conversation IDs:', error.message);
            throw error;
        }
    }

    /**
     * Extract a single conversation with full context
     * Adapted from Dennis's extraction logic with improvements
     */
    async extractSingleConversation(db, conversationId) {
        try {
            // Get conversation metadata
            const conversationQuery = `
                SELECT 
                    conversation_id,
                    conversation_data,
                    last_modified_at
                FROM agent_conversations 
                WHERE conversation_id = ?
            `;

            const conversation = db.prepare(conversationQuery).get(conversationId);
            if (!conversation) {
                console.warn(`Conversation ${conversationId} not found`);
                return null;
            }

            // Get all queries for this conversation
            const queriesQuery = `
                SELECT 
                    id,
                    exchange_id,
                    input,
                    start_ts,
                    model_id,
                    working_directory,
                    output_status
                FROM ai_queries 
                WHERE conversation_id = ?
                ORDER BY start_ts ASC
            `;

            const queries = db.prepare(queriesQuery).all(conversationId);

            // Parse conversation data
            let conversationData = {};
            try {
                if (conversation.conversation_data) {
                    conversationData = JSON.parse(conversation.conversation_data);
                }
            } catch (error) {
                console.warn(`Could not parse conversation data for ${conversationId}`);
            }

            // Extract and structure messages from queries
            const messages = this.parseWarpMessages(queries);

            // Create comprehensive conversation object
            const extractedConversation = {
                id: `warp-${conversationId}`,
                conversationId: conversationId,
                timestamp: conversation.last_modified_at,
                source: 'warp',
                content: this.generateConversationContent(messages, conversationData),
                messages: messages,
                metadata: {
                    messageCount: queries.length,
                    rawMessageCount: messages.length,
                    workingDirectories: this.extractWorkingDirectories(queries),
                    models: this.extractModels(queries),
                    timespan: this.calculateTimespan(queries),
                    conversationData: Object.keys(conversationData).length > 0 ? conversationData : null,
                    extractedAt: new Date().toISOString(),
                    platform: 'warp-terminal'
                }
            };

            return extractedConversation;

        } catch (error) {
            console.error(`Error extracting conversation ${conversationId}:`, error.message);
            throw error;
        }
    }

    /**
     * Parse Warp messages from SQLite queries
     * Based on Dennis's message parsing logic
     */
    parseWarpMessages(queries) {
        const messages = [];

        for (const query of queries) {
            try {
                // Try to parse as JSON first
                let queryData;
                try {
                    queryData = JSON.parse(query.input);
                } catch (jsonError) {
                    // If not JSON, treat as plain text
                    messages.push({
                        type: 'user_query',
                        content: query.input,
                        timestamp: query.start_ts,
                        working_directory: query.working_directory,
                        model_id: query.model_id,
                        exchange_id: query.exchange_id,
                        output_status: query.output_status
                    });
                    continue;
                }

                // Process JSON-structured data
                if (Array.isArray(queryData)) {
                    for (const item of queryData) {
                        // Handle user queries
                        if (item.Query && item.Query.text) {
                            messages.push({
                                type: 'user_query',
                                content: item.Query.text,
                                timestamp: query.start_ts,
                                working_directory: query.working_directory,
                                context: item.Query.context || null,
                                model_id: query.model_id,
                                exchange_id: query.exchange_id
                            });
                        }

                        // Handle AI actions/results
                        if (item.ActionResult && item.ActionResult.result) {
                            const result = item.ActionResult.result;
                            let actionContent = 'Action performed';
                            let actionType = 'ai_action';

                            // Parse command results
                            if (result.RequestCommandOutput) {
                                const cmdResult = result.RequestCommandOutput.result;
                                if (cmdResult.Success) {
                                    actionContent = `Command: ${cmdResult.Success.command}\nOutput: ${cmdResult.Success.output}`;
                                    actionType = 'command_execution';
                                } else if (cmdResult.Error) {
                                    actionContent = `Command failed: ${cmdResult.Error.command}\nError: ${cmdResult.Error.message}`;
                                    actionType = 'command_error';
                                }
                            }

                            // Parse file access
                            else if (result.GetFiles) {
                                const files = result.GetFiles.result;
                                if (files.Success) {
                                    const fileNames = files.Success.files.map(f => f.file_name).join(', ');
                                    actionContent = `Files accessed: ${fileNames}`;
                                    actionType = 'file_access';
                                }
                            }

                            // Parse other action types
                            else if (result.EditFiles) {
                                actionContent = 'Files edited';
                                actionType = 'file_edit';
                            }

                            messages.push({
                                type: actionType,
                                content: actionContent,
                                timestamp: query.start_ts,
                                working_directory: query.working_directory,
                                action_id: item.ActionResult.id,
                                model_id: query.model_id,
                                exchange_id: query.exchange_id
                            });
                        }
                    }
                }

            } catch (error) {
                console.warn(`Error parsing query ${query.id}:`, error.message);
                // Add as plain text fallback
                messages.push({
                    type: 'unknown',
                    content: query.input.substring(0, 500) + (query.input.length > 500 ? '...' : ''),
                    timestamp: query.start_ts,
                    working_directory: query.working_directory,
                    model_id: query.model_id,
                    error: 'Failed to parse query data'
                });
            }
        }

        return messages;
    }

    /**
     * Generate readable conversation content from messages
     */
    generateConversationContent(messages, conversationData) {
        if (messages.length === 0) {
            return 'Empty Warp conversation with no messages';
        }

        // Create a meaningful summary of the conversation
        const userQueries = messages.filter(m => m.type === 'user_query');
        const aiActions = messages.filter(m => m.type.includes('ai_') || m.type.includes('command_') || m.type.includes('file_'));

        let content = `Warp terminal conversation with ${messages.length} messages`;
        
        if (userQueries.length > 0) {
            content += `\n\nUser queries (${userQueries.length}):`;
            // Include first and last few queries for context
            const queriesToShow = userQueries.length > 4 ? 
                [...userQueries.slice(0, 2), ...userQueries.slice(-2)] : 
                userQueries;

            for (const query of queriesToShow) {
                const truncatedContent = query.content.length > 200 ? 
                    query.content.substring(0, 200) + '...' : 
                    query.content;
                content += `\n- ${truncatedContent}`;
            }
        }

        if (aiActions.length > 0) {
            content += `\n\nAI actions and results (${aiActions.length} actions)`;
            
            // Show summary of action types
            const actionTypes = {};
            aiActions.forEach(action => {
                actionTypes[action.type] = (actionTypes[action.type] || 0) + 1;
            });

            for (const [type, count] of Object.entries(actionTypes)) {
                content += `\n- ${type}: ${count}`;
            }
        }

        return content;
    }

    /**
     * Extract working directories from queries
     */
    extractWorkingDirectories(queries) {
        const dirs = new Set();
        queries.forEach(query => {
            if (query.working_directory) {
                dirs.add(query.working_directory);
            }
        });
        return Array.from(dirs);
    }

    /**
     * Extract AI models used
     */
    extractModels(queries) {
        const models = new Set();
        queries.forEach(query => {
            if (query.model_id) {
                models.add(query.model_id);
            }
        });
        return Array.from(models);
    }

    /**
     * Calculate conversation timespan
     */
    calculateTimespan(queries) {
        if (queries.length === 0) {
            return { start: null, end: null, duration: 0 };
        }

        const start = Math.min(...queries.map(q => q.start_ts));
        const end = Math.max(...queries.map(q => q.start_ts));

        return {
            start: new Date(start).toISOString(),
            end: new Date(end).toISOString(),
            duration: end - start
        };
    }

    /**
     * Parse timeframe string to milliseconds
     */
    parseTimeframe(timeframe) {
        const match = timeframe.match(/^(\d+)([dhm])$/);
        if (!match) {
            return 7 * 24 * 60 * 60 * 1000; // Default to 7 days
        }

        const [, amount, unit] = match;
        const multipliers = {
            'm': 60 * 1000,           // minutes
            'h': 60 * 60 * 1000,      // hours
            'd': 24 * 60 * 60 * 1000  // days
        };

        return parseInt(amount) * (multipliers[unit] || multipliers.d);
    }

    /**
     * Format file size for display
     */
    formatFileSize(bytes) {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;
        
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        
        return `${Math.round(size * 100) / 100} ${units[unitIndex]}`;
    }
}

module.exports = WarpParser;