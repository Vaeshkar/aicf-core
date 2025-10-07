const fs = require('fs');
const path = require('path');
const { AICFPrettier } = require('../middleware/AICFPrettier');

/**
 * Universal Conversation Extractor
 * 
 * Key Principles:
 * 1. INDEPENDENT PARSERS - Each platform parser operates in isolation
 * 2. BULLETPROOF BACKUPS - All existing data is preserved before any modification
 * 3. GRACEFUL FAILURES - One parser failure doesn't affect others
 * 4. DATA VALIDATION - All extracted data is validated before storage
 * 5. ROLLBACK CAPABILITY - Any operation can be safely undone
 */
class UniversalExtractor {
    constructor(options = {}) {
        this.options = {
            backupEnabled: true,
            maxBackups: 10,
            validateContent: true,
            parallelExtraction: false, // Sequential by default for safety
            ...options
        };
        
        this.aiDir = '.ai';
        this.aicfDir = '.aicf';
        this.backupDir = '.aicf/backups';
        this.parsers = new Map();
        this.extractionResults = new Map();
        
        this.ensureDirectories();
        this.initializeParsers();
    }

    /**
     * Ensure required directories exist
     */
    ensureDirectories() {
        [this.aiDir, this.aicfDir, this.backupDir].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }

    /**
     * Initialize all available parsers
     * Each parser is completely independent
     */
    initializeParsers() {
        // Load parsers dynamically - failures don't affect other parsers
        const parserConfigs = [
            { name: 'warp', module: './parsers/WarpParser', platforms: ['warp'] },
            { name: 'augment', module: './parsers/AugmentParser', platforms: ['augment', 'vscode'] },
            { name: 'openai', module: './parsers/OpenAIParser', platforms: ['chatgpt', 'openai'] },
            { name: 'claude', module: './parsers/ClaudeParser', platforms: ['claude', 'anthropic'] },
            { name: 'cursor', module: './parsers/CursorParser', platforms: ['cursor'] }
        ];

        for (const config of parserConfigs) {
            try {
                const ParserClass = require(config.module);
                const parser = new ParserClass();
                
                if (parser.isAvailable()) {
                    this.parsers.set(config.name, {
                        parser,
                        platforms: config.platforms,
                        status: 'available'
                    });
                    console.log(`✅ ${config.name} parser loaded and available`);
                } else {
                    console.log(`⏭️  ${config.name} parser loaded but not available on this system`);
                }
            } catch (error) {
                console.warn(`⚠️  Could not load ${config.name} parser:`, error.message);
            }
        }
    }

    /**
     * CRITICAL: Create comprehensive backup before any operations
     */
    async createBackup(operation = 'extraction') {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupId = `backup-${operation}-${timestamp}`;
        const backupPath = path.join(this.backupDir, backupId);

        try {
            fs.mkdirSync(backupPath, { recursive: true });

            // Backup .ai/ directory
            if (fs.existsSync(this.aiDir)) {
                const aiBackupPath = path.join(backupPath, 'ai');
                await this.copyDirectoryRecursive(this.aiDir, aiBackupPath);
            }

            // Backup .aicf/ directory (excluding backups subfolder)
            if (fs.existsSync(this.aicfDir)) {
                const aicfBackupPath = path.join(backupPath, 'aicf');
                fs.mkdirSync(aicfBackupPath, { recursive: true });
                
                const items = fs.readdirSync(this.aicfDir);
                for (const item of items) {
                    if (item !== 'backups') { // Don't backup the backups folder
                        const sourcePath = path.join(this.aicfDir, item);
                        const destPath = path.join(aicfBackupPath, item);
                        
                        if (fs.statSync(sourcePath).isDirectory()) {
                            await this.copyDirectoryRecursive(sourcePath, destPath);
                        } else {
                            fs.copyFileSync(sourcePath, destPath);
                        }
                    }
                }
            }

            // Create backup manifest
            const manifest = {
                backupId,
                timestamp,
                operation,
                directories: {
                    ai: fs.existsSync(this.aiDir),
                    aicf: fs.existsSync(this.aicfDir)
                },
                parsers: Array.from(this.parsers.keys()),
                version: require('../../package.json').version
            };

            fs.writeFileSync(
                path.join(backupPath, 'manifest.json'),
                JSON.stringify(manifest, null, 2)
            );

            console.log(`💾 Created backup: ${backupId}`);
            
            // Clean up old backups
            this.cleanupOldBackups();
            
            return backupId;

        } catch (error) {
            console.error(`❌ Failed to create backup:`, error.message);
            throw new Error(`Backup creation failed: ${error.message}`);
        }
    }

    /**
     * Recursive directory copy utility
     */
    async copyDirectoryRecursive(source, destination) {
        if (!fs.existsSync(source)) return;

        fs.mkdirSync(destination, { recursive: true });
        const items = fs.readdirSync(source);

        for (const item of items) {
            const sourcePath = path.join(source, item);
            const destPath = path.join(destination, item);

            if (fs.statSync(sourcePath).isDirectory()) {
                await this.copyDirectoryRecursive(sourcePath, destPath);
            } else {
                fs.copyFileSync(sourcePath, destPath);
            }
        }
    }

    /**
     * Clean up old backups, keeping only the most recent ones
     */
    cleanupOldBackups() {
        try {
            const backups = fs.readdirSync(this.backupDir)
                .filter(name => name.startsWith('backup-'))
                .map(name => ({
                    name,
                    path: path.join(this.backupDir, name),
                    mtime: fs.statSync(path.join(this.backupDir, name)).mtime
                }))
                .sort((a, b) => b.mtime - a.mtime);

            // Keep only the most recent backups
            const backupsToDelete = backups.slice(this.options.maxBackups);
            
            for (const backup of backupsToDelete) {
                fs.rmSync(backup.path, { recursive: true, force: true });
                console.log(`🗑️  Cleaned up old backup: ${backup.name}`);
            }
        } catch (error) {
            console.warn('Warning: Could not clean up old backups:', error.message);
        }
    }

    /**
     * Extract conversations from all available platforms
     * Each parser operates independently with full error isolation
     */
    async extractConversations(options = {}) {
        const extractOptions = {
            platforms: 'all', // or specific array like ['warp', 'augment']
            maxConversations: 10,
            timeframe: '7d', // last 7 days
            ...options
        };

        console.log('🚀 Starting universal conversation extraction...');

        // CRITICAL: Create backup before any extraction
        let backupId = null;
        if (this.options.backupEnabled) {
            try {
                backupId = await this.createBackup('extraction');
            } catch (error) {
                throw new Error(`Cannot proceed without backup: ${error.message}`);
            }
        }

        const results = {
            backupId,
            success: [],
            failures: [],
            conversations: [],
            summary: {}
        };

        // Get list of parsers to run
        const parsersToRun = this.getEligibleParsers(extractOptions.platforms);
        console.log(`📋 Running ${parsersToRun.length} parsers: ${parsersToRun.map(p => p.name).join(', ')}`);

        // Extract from each parser independently
        for (const { name, config } of parsersToRun) {
            try {
                console.log(`\n🔍 Extracting from ${name}...`);
                
                const startTime = Date.now();
                const conversations = await this.extractFromSingleParser(name, config, extractOptions);
                const duration = Date.now() - startTime;

                results.success.push({
                    parser: name,
                    conversations: conversations.length,
                    duration: `${duration}ms`
                });

                results.conversations.push(...conversations);
                console.log(`✅ ${name}: Extracted ${conversations.length} conversations in ${duration}ms`);

            } catch (error) {
                console.error(`❌ ${name} parser failed:`, error.message);
                results.failures.push({
                    parser: name,
                    error: error.message,
                    stack: error.stack
                });
                // Continue with other parsers - failures are isolated
            }
        }

        // Summary
        results.summary = {
            totalConversations: results.conversations.length,
            successfulParsers: results.success.length,
            failedParsers: results.failures.length,
            platforms: [...new Set(results.conversations.map(c => c.source))]
        };

        console.log(`\n📊 Extraction Summary:`);
        console.log(`   ✅ Successful: ${results.success.length} parsers`);
        console.log(`   ❌ Failed: ${results.failures.length} parsers`);
        console.log(`   💬 Total conversations: ${results.conversations.length}`);
        console.log(`   🏢 Platforms: ${results.summary.platforms.join(', ')}`);

        return results;
    }

    /**
     * Extract from a single parser with full error isolation
     */
    async extractFromSingleParser(parserName, config, options) {
        const parser = config.parser;
        
        try {
            // Verify parser is still available
            if (!parser.isAvailable()) {
                throw new Error(`Parser ${parserName} is no longer available`);
            }

            // Extract conversations using parser's native method
            const conversations = await parser.extractConversations({
                maxConversations: options.maxConversations,
                timeframe: options.timeframe
            });

            // Validate extracted data
            const validatedConversations = this.validateConversations(conversations, parserName);

            return validatedConversations;

        } catch (error) {
            // Log parser-specific error but don't let it affect other parsers
            console.error(`Parser ${parserName} extraction failed:`, error.message);
            throw error;
        }
    }

    /**
     * Validate extracted conversation data
     */
    validateConversations(conversations, parserName) {
        if (!this.options.validateContent) {
            return conversations;
        }

        const validated = [];
        
        for (const conversation of conversations) {
            try {
                // Basic validation
                if (!conversation.id || !conversation.content || !conversation.timestamp) {
                    console.warn(`⚠️  Skipping invalid conversation from ${parserName}: missing required fields`);
                    continue;
                }

                // Content length validation
                if (conversation.content.length < 10) {
                    console.warn(`⚠️  Skipping conversation from ${parserName}: content too short`);
                    continue;
                }

                // Source validation
                if (!conversation.source) {
                    conversation.source = parserName;
                }

                validated.push(conversation);

            } catch (error) {
                console.warn(`⚠️  Error validating conversation from ${parserName}:`, error.message);
            }
        }

        return validated;
    }

    /**
     * Get list of eligible parsers based on platform specification
     */
    getEligibleParsers(platformSpec) {
        const eligible = [];

        if (platformSpec === 'all') {
            // Run all available parsers
            for (const [name, config] of this.parsers.entries()) {
                if (config.status === 'available') {
                    eligible.push({ name, config });
                }
            }
        } else if (Array.isArray(platformSpec)) {
            // Run specific parsers
            for (const platformName of platformSpec) {
                for (const [name, config] of this.parsers.entries()) {
                    if (config.platforms.includes(platformName) && config.status === 'available') {
                        eligible.push({ name, config });
                        break;
                    }
                }
            }
        }

        return eligible;
    }

    /**
     * Get status of all parsers
     */
    getStatus() {
        const status = {
            available: [],
            unavailable: [],
            failed: []
        };

        for (const [name, config] of this.parsers.entries()) {
            status[config.status].push({
                name,
                platforms: config.platforms
            });
        }

        return status;
    }

    /**
     * Rollback to a specific backup
     */
    async rollbackToBackup(backupId) {
        const backupPath = path.join(this.backupDir, backupId);
        
        if (!fs.existsSync(backupPath)) {
            throw new Error(`Backup ${backupId} not found`);
        }

        console.log(`🔄 Rolling back to backup: ${backupId}`);

        try {
            // Restore .ai/ directory
            const aiBackupPath = path.join(backupPath, 'ai');
            if (fs.existsSync(aiBackupPath)) {
                if (fs.existsSync(this.aiDir)) {
                    fs.rmSync(this.aiDir, { recursive: true });
                }
                await this.copyDirectoryRecursive(aiBackupPath, this.aiDir);
            }

            // Restore .aicf/ directory (excluding backups)
            const aicfBackupPath = path.join(backupPath, 'aicf');
            if (fs.existsSync(aicfBackupPath)) {
                // Remove current .aicf contents except backups
                const currentItems = fs.readdirSync(this.aicfDir);
                for (const item of currentItems) {
                    if (item !== 'backups') {
                        fs.rmSync(path.join(this.aicfDir, item), { recursive: true, force: true });
                    }
                }

                // Restore from backup
                await this.copyDirectoryRecursive(aicfBackupPath, this.aicfDir);
            }

            console.log(`✅ Successfully rolled back to backup: ${backupId}`);

        } catch (error) {
            throw new Error(`Rollback failed: ${error.message}`);
        }
    }

    /**
     * List available backups
     */
    listBackups() {
        try {
            const backups = fs.readdirSync(this.backupDir)
                .filter(name => name.startsWith('backup-'))
                .map(name => {
                    const manifestPath = path.join(this.backupDir, name, 'manifest.json');
                    let manifest = {};
                    
                    if (fs.existsSync(manifestPath)) {
                        try {
                            manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
                        } catch (error) {
                            console.warn(`Could not read manifest for ${name}`);
                        }
                    }

                    return {
                        id: name,
                        timestamp: manifest.timestamp || 'unknown',
                        operation: manifest.operation || 'unknown',
                        size: this.getDirectorySize(path.join(this.backupDir, name))
                    };
                })
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            return backups;
        } catch (error) {
            console.error('Error listing backups:', error.message);
            return [];
        }
    }

    /**
     * Get directory size for backup info
     */
    getDirectorySize(dirPath) {
        try {
            let size = 0;
            const items = fs.readdirSync(dirPath);
            
            for (const item of items) {
                const itemPath = path.join(dirPath, item);
                const stats = fs.statSync(itemPath);
                
                if (stats.isDirectory()) {
                    size += this.getDirectorySize(itemPath);
                } else {
                    size += stats.size;
                }
            }
            
            return this.formatFileSize(size);
        } catch (error) {
            return 'unknown';
        }
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

module.exports = { UniversalExtractor };