#!/usr/bin/env node

/**
 * Data Extraction Inspector
 * 
 * Shows EXACTLY what data we receive from Warp and Augment
 * and what we transform it into. Complete transparency.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Standalone Warp inspector
class WarpDataInspector {
    constructor() {
        this.name = 'Warp Terminal Data Inspector';
        this.dbPath = this.findWarpDatabase();
    }

    findWarpDatabase() {
        const possiblePaths = [
            path.join(os.homedir(), 'Library/Group Containers/2BBY89MBSN.dev.warp/Library/Application Support/dev.warp.Warp-Stable/warp.sqlite'),
            path.join(os.homedir(), 'Library/Group Containers/2BBY89MBSN.dev.warp/Library/Application Support/dev.warp.Warp/warp.sqlite'),
            path.join(os.homedir(), 'Library/Application Support/dev.warp.Warp-Stable/warp.sqlite')
        ];
        
        for (const dbPath of possiblePaths) {
            if (fs.existsSync(dbPath)) {
                return dbPath;
            }
        }
        return null;
    }

    isAvailable() {
        return this.dbPath !== null;
    }

    async inspectRawData() {
        if (!this.isAvailable()) {
            return {
                available: false,
                message: 'Warp database not found',
                searchedPaths: [
                    'Library/Group Containers/2BBY89MBSN.dev.warp/.../warp.sqlite',
                    'Library/Application Support/dev.warp.Warp-Stable/warp.sqlite'
                ]
            };
        }

        try {
            // Try to use better-sqlite3, but fallback gracefully
            let Database;
            try {
                Database = require('better-sqlite3');
            } catch (error) {
                return {
                    available: true,
                    dbPath: this.dbPath,
                    error: 'better-sqlite3 not installed - cannot read database',
                    install: 'Run: npm install better-sqlite3',
                    rawStructure: 'Unknown - cannot access without better-sqlite3'
                };
            }

            const db = new Database(this.dbPath, { readonly: true });

            // Inspect database structure
            const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
            
            // Sample conversation data
            const conversations = db.prepare(`
                SELECT conversation_id, last_modified_at, length(conversation_data) as data_size
                FROM agent_conversations 
                ORDER BY last_modified_at DESC 
                LIMIT 3
            `).all();

            // Sample query data
            const queries = db.prepare(`
                SELECT id, conversation_id, length(input) as input_size, start_ts, model_id, working_directory
                FROM ai_queries 
                ORDER BY start_ts DESC 
                LIMIT 5
            `).all();

            // Get a real input sample (truncated for safety)
            let sampleInput = null;
            try {
                const sample = db.prepare(`
                    SELECT substr(input, 1, 500) as sample_input
                    FROM ai_queries 
                    WHERE length(input) > 100
                    ORDER BY start_ts DESC 
                    LIMIT 1
                `).get();
                sampleInput = sample?.sample_input;
            } catch (error) {
                sampleInput = 'Could not retrieve sample';
            }

            db.close();

            return {
                available: true,
                dbPath: this.dbPath,
                structure: {
                    tables: tables.map(t => t.name),
                    conversationCount: conversations.length,
                    queryCount: queries.length
                },
                sampleData: {
                    conversations: conversations.map(c => ({
                        id: c.conversation_id.substring(0, 8) + '...',
                        lastModified: new Date(c.last_modified_at).toISOString(),
                        dataSize: c.data_size + ' chars'
                    })),
                    queries: queries.map(q => ({
                        id: q.id,
                        conversationId: q.conversation_id?.substring(0, 8) + '...',
                        inputSize: q.input_size + ' chars',
                        timestamp: new Date(q.start_ts).toISOString(),
                        modelId: q.model_id,
                        workingDirectory: q.working_directory
                    })),
                    sampleInput: sampleInput
                }
            };

        } catch (error) {
            return {
                available: true,
                dbPath: this.dbPath,
                error: `Database access failed: ${error.message}`
            };
        }
    }
}

// Standalone Augment inspector
class AugmentDataInspector {
    constructor() {
        this.name = 'Augment VSCode Data Inspector';
        this.workspaces = this.findAugmentWorkspaces();
    }

    findAugmentWorkspaces() {
        const homeDir = os.homedir();
        const vscodeStoragePath = path.join(homeDir, 'Library/Application Support/Code/User/workspaceStorage');
        
        try {
            if (!fs.existsSync(vscodeStoragePath)) {
                return [];
            }

            const workspaces = fs.readdirSync(vscodeStoragePath);
            const augmentWorkspaces = [];

            for (const workspace of workspaces.slice(0, 10)) { // Limit scan
                try {
                    const augmentPath = path.join(vscodeStoragePath, workspace, 'Augment.vscode-augment');
                    if (fs.existsSync(augmentPath)) {
                        const kvStorePath = path.join(augmentPath, 'augment-kv-store');
                        if (fs.existsSync(kvStorePath)) {
                            const files = fs.readdirSync(kvStorePath);
                            const ldbFiles = files.filter(f => f.endsWith('.ldb') || f.endsWith('.log'));
                            
                            if (ldbFiles.length > 0) {
                                augmentWorkspaces.push({
                                    workspaceId: workspace.substring(0, 12) + '...',
                                    path: augmentPath,
                                    kvStore: kvStorePath,
                                    fileCount: ldbFiles.length,
                                    files: ldbFiles.slice(0, 3), // Sample files
                                    lastAccessed: this.getLastAccessTime(kvStorePath)
                                });
                            }
                        }
                    }
                } catch (error) {
                    // Skip workspace if error
                    continue;
                }
            }

            return augmentWorkspaces.sort((a, b) => b.lastAccessed - a.lastAccessed);
            
        } catch (error) {
            return [];
        }
    }

    getLastAccessTime(dirPath) {
        try {
            const stats = fs.statSync(dirPath);
            return stats.mtime.getTime();
        } catch {
            return 0;
        }
    }

    isAvailable() {
        return this.workspaces.length > 0;
    }

    async inspectRawData() {
        if (!this.isAvailable()) {
            return {
                available: false,
                message: 'No Augment VSCode workspaces found',
                searchPath: 'Library/Application Support/Code/User/workspaceStorage'
            };
        }

        const workspace = this.workspaces[0]; // Most recent workspace
        const sampleFile = path.join(workspace.kvStore, workspace.files[0]);

        try {
            // Try to extract sample data using strings command
            const { execSync } = require('child_process');
            const output = execSync(`strings "${sampleFile}" | head -50`, { 
                encoding: 'utf8',
                timeout: 10000 
            });

            // Look for patterns in the output
            const lines = output.split('\n').filter(line => line.length > 10);
            
            // Find conversation-like patterns
            const conversationPatterns = [];
            const requestPatterns = [];
            const responsePatterns = [];

            for (const line of lines) {
                if (line.includes('request_message') || line.includes('user_input')) {
                    requestPatterns.push(line.substring(0, 100) + '...');
                }
                if (line.includes('response_text') || line.includes('assistant')) {
                    responsePatterns.push(line.substring(0, 100) + '...');
                }
                if (line.includes('conversationId') || line.includes('conversation')) {
                    conversationPatterns.push(line.substring(0, 100) + '...');
                }
            }

            return {
                available: true,
                workspaceCount: this.workspaces.length,
                sampleWorkspace: {
                    id: workspace.workspaceId,
                    fileCount: workspace.fileCount,
                    sampleFiles: workspace.files,
                    lastAccessed: new Date(workspace.lastAccessed).toISOString()
                },
                rawDataSample: {
                    totalLines: lines.length,
                    conversationPatterns: conversationPatterns.slice(0, 3),
                    requestPatterns: requestPatterns.slice(0, 3),
                    responsePatterns: responsePatterns.slice(0, 3),
                    allPatterns: lines.slice(0, 10).map(line => line.substring(0, 80) + '...')
                }
            };

        } catch (error) {
            return {
                available: true,
                workspaceCount: this.workspaces.length,
                sampleWorkspace: {
                    id: workspace.workspaceId,
                    fileCount: workspace.fileCount,
                    files: workspace.files
                },
                error: `Could not extract data: ${error.message}`,
                note: 'LevelDB files require strings command or specialized parsing'
            };
        }
    }
}

async function inspectExtractionData() {
    console.log('🔍 DATA EXTRACTION INSPECTION');
    console.log('============================\n');
    console.log('This shows EXACTLY what raw data we find and what we transform it into.\n');

    // Inspect Warp data
    console.log('📊 WARP TERMINAL DATA INSPECTION');
    console.log('=================================');
    
    const warpInspector = new WarpDataInspector();
    const warpData = await warpInspector.inspectRawData();
    
    console.log('🔍 Raw Warp Data Structure:');
    console.log(JSON.stringify(warpData, null, 2));
    
    if (warpData.available && warpData.sampleData) {
        console.log('\n📋 What We Extract from Warp:');
        console.log('- Database Tables:', warpData.structure.tables.join(', '));
        console.log('- Conversation Records:', warpData.structure.conversationCount);
        console.log('- Query Records:', warpData.structure.queryCount);
        
        if (warpData.sampleData.sampleInput) {
            console.log('\n🔤 Sample Input Data (first 200 chars):');
            console.log('"' + warpData.sampleData.sampleInput.substring(0, 200) + '..."');
        }
    }

    console.log('\n\n📊 AUGMENT VSCODE DATA INSPECTION');
    console.log('==================================');
    
    const augmentInspector = new AugmentDataInspector();
    const augmentData = await augmentInspector.inspectRawData();
    
    console.log('🔍 Raw Augment Data Structure:');
    console.log(JSON.stringify(augmentData, null, 2));
    
    if (augmentData.available && augmentData.rawDataSample) {
        console.log('\n📋 What We Extract from Augment:');
        console.log('- Workspace Count:', augmentData.workspaceCount);
        console.log('- LevelDB Files per Workspace:', augmentData.sampleWorkspace.fileCount);
        console.log('- Data Patterns Found:', augmentData.rawDataSample.totalLines, 'lines');
        
        if (augmentData.rawDataSample.allPatterns.length > 0) {
            console.log('\n🔤 Sample Raw Data Patterns:');
            augmentData.rawDataSample.allPatterns.forEach((pattern, i) => {
                console.log(`  ${i + 1}. "${pattern}"`);
            });
        }
    }

    console.log('\n\n🎯 TRANSFORMATION SUMMARY');
    console.log('=========================');
    
    console.log('\n📥 WARP INPUT → OUTPUT:');
    if (warpData.available && warpData.sampleData) {
        console.log('✅ Raw SQLite Data:');
        console.log('   - agent_conversations table: conversation metadata');
        console.log('   - ai_queries table: user inputs and AI actions');
        console.log('   - JSON-structured input field with Query/ActionResult objects');
        console.log('\n📤 Transformed Output:');
        console.log('   - Structured conversation object with messages array');
        console.log('   - User queries extracted from Query.text fields');
        console.log('   - AI actions extracted from ActionResult objects');
        console.log('   - Command execution results parsed and categorized');
        console.log('   - Working directories, models, timestamps preserved');
    } else {
        console.log('❌ No Warp data available for inspection');
        if (warpData.error) {
            console.log('   Error:', warpData.error);
        }
        if (warpData.install) {
            console.log('   Install:', warpData.install);
        }
    }

    console.log('\n📥 AUGMENT INPUT → OUTPUT:');
    if (augmentData.available && augmentData.rawDataSample) {
        console.log('✅ Raw LevelDB Data:');
        console.log('   - Binary LevelDB files with embedded JSON strings');
        console.log('   - Extracted using strings command');
        console.log('   - Contains request_message and response_text patterns');
        console.log('   - Conversation IDs for grouping messages');
        console.log('\n📤 Transformed Output:');
        console.log('   - Individual messages grouped into conversations');
        console.log('   - User requests and AI responses paired');
        console.log('   - Temporal grouping (30-minute windows)');
        console.log('   - Workspace context preserved');
        console.log('   - Content cleaned and validated');
    } else {
        console.log('❌ No Augment data available for inspection');
        if (augmentData.error) {
            console.log('   Error:', augmentData.error);
        }
    }

    console.log('\n\n🏗️ DATA QUALITY ASSESSMENT');
    console.log('===========================');
    
    console.log('\n🎯 Warp Data Quality:');
    if (warpData.available && !warpData.error) {
        console.log('✅ HIGH QUALITY');
        console.log('   - Structured SQLite database');
        console.log('   - Rich metadata (timestamps, models, directories)');
        console.log('   - JSON-parsed content with clear structure');
        console.log('   - Real-time access while Warp is running');
    } else {
        console.log('❓ UNKNOWN - Database not accessible');
    }

    console.log('\n🎯 Augment Data Quality:');
    if (augmentData.available && !augmentData.error) {
        console.log('⚠️  MEDIUM QUALITY');
        console.log('   - Binary LevelDB requires string extraction');
        console.log('   - Pattern-based parsing (regex-dependent)');
        console.log('   - Limited metadata availability'); 
        console.log('   - Requires message grouping logic');
        console.log('   - Quality depends on conversation ID presence');
    } else if (augmentData.available && augmentData.error) {
        console.log('❓ UNKNOWN - LevelDB extraction failed');
        console.log('   - Files detected but content not parseable');
    } else {
        console.log('❌ NO DATA - Augment not found or no workspaces');
    }

    return {
        warp: warpData,
        augment: augmentData
    };
}

// Run inspection if called directly
if (require.main === module) {
    inspectExtractionData()
        .then(results => {
            console.log('\n🎉 DATA INSPECTION COMPLETE!');
            console.log('=============================');
            console.log('You now have complete visibility into:');
            console.log('✅ What raw data is available on your system');
            console.log('✅ How we parse and transform that data');
            console.log('✅ What quality level to expect from each source');
            console.log('\nThis is exactly what the Universal Extractor works with.');
        })
        .catch(error => {
            console.error('\n❌ Inspection failed:', error.message);
            process.exit(1);
        });
}

module.exports = { inspectExtractionData };