const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

/**
 * Augment VSCode Extension Parser
 * Extracts conversation data from LevelDB files in augment-kv-store directories
 * Adapted from Dennis's existing augment-parser.js with improvements
 */
class AugmentParser {
    constructor() {
        this.name = 'Augment VSCode Extension';
        this.source = 'augment';
        this.augmentWorkspaces = this.findAugmentWorkspaces();
    }

    /**
     * Find all Augment workspace storage directories
     * Enhanced to detect and validate all data sources for 9/10 quality
     */
    findAugmentWorkspaces() {
        const homeDir = os.homedir();
        const vscodeStoragePath = path.join(homeDir, 'Library/Application Support/Code/User/workspaceStorage');
        
        try {
            if (!fs.existsSync(vscodeStoragePath)) {
                console.log('📂 VSCode workspace storage not found');
                return [];
            }

            const workspaces = fs.readdirSync(vscodeStoragePath);
            const augmentWorkspaces = [];

            for (const workspace of workspaces) {
                const augmentPath = path.join(vscodeStoragePath, workspace, 'Augment.vscode-augment');
                if (fs.existsSync(augmentPath)) {
                    const kvStorePath = path.join(augmentPath, 'augment-kv-store');
                    const globalStatePath = path.join(augmentPath, 'augment-global-state');
                    
                    if (fs.existsSync(kvStorePath)) {
                        // Enhanced workspace detection with quality scoring
                        const dataQuality = this.assessWorkspaceDataQuality(augmentPath);
                        
                        augmentWorkspaces.push({
                            workspaceId: workspace,
                            path: augmentPath,
                            kvStore: kvStorePath,
                            globalState: globalStatePath,
                            lastAccessed: this.getLastAccessTime(kvStorePath),
                            dataQuality: dataQuality,
                            dataSources: this.getAvailableDataSources(augmentPath)
                        });
                    }
                }
            }

            // Sort by data quality first, then by recent access
            augmentWorkspaces.sort((a, b) => {
                if (a.dataQuality.score !== b.dataQuality.score) {
                    return b.dataQuality.score - a.dataQuality.score;
                }
                return b.lastAccessed - a.lastAccessed;
            });
            
            console.log(`📋 Found ${augmentWorkspaces.length} Augment workspaces`);
            augmentWorkspaces.forEach(w => {
                console.log(`   🎯 Workspace ${w.workspaceId.substring(0, 8)}: Quality ${w.dataQuality.score}/10 (${w.dataQuality.description})`);
            });
            return augmentWorkspaces;
            
        } catch (error) {
            console.warn('⚠️  Could not scan Augment workspaces:', error.message);
            return [];
        }
    }

    /**
     * Get the last access time of a directory
     */
    getLastAccessTime(dirPath) {
        try {
            const stats = fs.statSync(dirPath);
            return stats.mtime.getTime();
        } catch {
            return 0;
        }
    }

    /**
     * Assess the data quality of an Augment workspace for extraction
     * Returns quality score out of 10 based on available data sources
     */
    assessWorkspaceDataQuality(augmentPath) {
        let score = 0;
        let description = '';
        const dataSources = [];

        try {
            // Base score for having kv-store (required)
            const kvStorePath = path.join(augmentPath, 'augment-kv-store');
            if (fs.existsSync(kvStorePath)) {
                const kvFiles = fs.readdirSync(kvStorePath).filter(f => f.endsWith('.ldb') || f.endsWith('.log'));
                if (kvFiles.length > 0) {
                    score += 3; // Base conversation data
                    dataSources.push('conversation-data');
                }
            }

            // Enhanced data sources for 9/10 quality
            const globalStatePath = path.join(augmentPath, 'augment-global-state');
            if (fs.existsSync(globalStatePath)) {
                // File context data (+2 points)
                const recentFilesPath = path.join(globalStatePath, 'recentlyOpenedFiles.json');
                if (fs.existsSync(recentFilesPath) && fs.statSync(recentFilesPath).size > 100) {
                    score += 2;
                    dataSources.push('file-context');
                }

                // Project structure data (+2 points)
                const fuzzyIndexPath = path.join(globalStatePath, 'fuzzyFsFilesIndex.json');
                if (fs.existsSync(fuzzyIndexPath) && fs.statSync(fuzzyIndexPath).size > 1000) {
                    score += 2;
                    dataSources.push('project-structure');
                }

                // Git state data (+1 point)
                const gitStatePath = path.join(globalStatePath, 'gitCommitIndexerState.json');
                if (fs.existsSync(gitStatePath) && fs.statSync(gitStatePath).size > 100) {
                    score += 1;
                    dataSources.push('git-state');
                }

                // Folder structure data (+1 point)
                const foldersIndexPath = path.join(globalStatePath, 'fuzzyFsFoldersIndex.json');
                if (fs.existsSync(foldersIndexPath) && fs.statSync(foldersIndexPath).size > 100) {
                    score += 1;
                    dataSources.push('folder-structure');
                }
            }

            // User assets and preferences (+1 point)
            const userAssetsPath = path.join(augmentPath, 'augment-user-assets');
            if (fs.existsSync(userAssetsPath)) {
                const assetFiles = fs.readdirSync(userAssetsPath);
                if (assetFiles.length > 0) {
                    score += 1;
                    dataSources.push('user-assets');
                }
            }

            // Quality description
            if (score >= 9) description = 'Excellent - Full context extraction possible';
            else if (score >= 7) description = 'Good - Rich context with minor gaps';
            else if (score >= 5) description = 'Fair - Basic context available';
            else description = 'Limited - Basic extraction only';

        } catch (error) {
            score = 1;
            description = 'Error assessing data quality';
        }

        return {
            score: Math.min(score, 10),
            description,
            dataSources
        };
    }

    /**
     * Get detailed information about available data sources in workspace
     */
    getAvailableDataSources(augmentPath) {
        const sources = {};

        try {
            // KV Store analysis
            const kvStorePath = path.join(augmentPath, 'augment-kv-store');
            if (fs.existsSync(kvStorePath)) {
                const kvFiles = fs.readdirSync(kvStorePath).filter(f => f.endsWith('.ldb') || f.endsWith('.log'));
                sources.kvStore = {
                    available: true,
                    fileCount: kvFiles.length,
                    totalSize: kvFiles.reduce((sum, file) => {
                        try {
                            return sum + fs.statSync(path.join(kvStorePath, file)).size;
                        } catch {
                            return sum;
                        }
                    }, 0)
                };
            }

            // Global State analysis
            const globalStatePath = path.join(augmentPath, 'augment-global-state');
            if (fs.existsSync(globalStatePath)) {
                sources.globalState = {};
                
                ['recentlyOpenedFiles.json', 'fuzzyFsFilesIndex.json', 'gitCommitIndexerState.json', 'fuzzyFsFoldersIndex.json'].forEach(filename => {
                    const filePath = path.join(globalStatePath, filename);
                    sources.globalState[filename.replace('.json', '')] = {
                        available: fs.existsSync(filePath),
                        size: fs.existsSync(filePath) ? fs.statSync(filePath).size : 0,
                        lastModified: fs.existsSync(filePath) ? fs.statSync(filePath).mtime : null
                    };
                });
            }

            // User Assets analysis
            const userAssetsPath = path.join(augmentPath, 'augment-user-assets');
            if (fs.existsSync(userAssetsPath)) {
                const assetFiles = fs.readdirSync(userAssetsPath);
                sources.userAssets = {
                    available: true,
                    fileCount: assetFiles.length,
                    files: assetFiles
                };
            }

        } catch (error) {
            console.warn('⚠️  Error analyzing data sources:', error.message);
        }

        return sources;
    }

    /**
     * Extract rich workspace context for enhanced conversation understanding
     * This is what gets us from 7/10 to 9/10 quality
     */
    async extractWorkspaceContext(workspace) {
        const context = {
            workspaceId: workspace.workspaceId,
            extractedAt: new Date().toISOString(),
            quality: workspace.dataQuality.score
        };

        try {
            // Extract file context - which files were being worked on
            if (fs.existsSync(path.join(workspace.globalState, 'recentlyOpenedFiles.json'))) {
                context.recentFiles = await this.extractRecentFiles(workspace);
            }

            // Extract project structure - full codebase context
            if (fs.existsSync(path.join(workspace.globalState, 'fuzzyFsFilesIndex.json'))) {
                context.projectStructure = await this.extractProjectStructure(workspace);
            }

            // Extract git state - code version context
            if (fs.existsSync(path.join(workspace.globalState, 'gitCommitIndexerState.json'))) {
                context.gitState = await this.extractGitState(workspace);
            }

            // Extract folder structure - project organization
            if (fs.existsSync(path.join(workspace.globalState, 'fuzzyFsFoldersIndex.json'))) {
                context.folderStructure = await this.extractFolderStructure(workspace);
            }

        } catch (error) {
            console.warn(`⚠️  Error extracting workspace context:`, error.message);
        }

        return context;
    }

    /**
     * Extract recently opened files to understand conversation file context
     */
    async extractRecentFiles(workspace) {
        try {
            const recentFilesPath = path.join(workspace.globalState, 'recentlyOpenedFiles.json');
            const data = JSON.parse(fs.readFileSync(recentFilesPath, 'utf8'));
            
            // Parse the nested array structure
            const files = data.map(entry => {
                if (Array.isArray(entry) && entry.length >= 2) {
                    const filePath = entry[0];
                    const metadata = entry[1]?.value || {};
                    
                    return {
                        filePath,
                        rootPath: metadata.rootPath,
                        relPath: metadata.relPath,
                        extension: path.extname(filePath),
                        directory: path.dirname(filePath),
                        filename: path.basename(filePath)
                    };
                }
                return null;
            }).filter(Boolean);

            // Group by project and analyze patterns
            const projects = {};
            files.forEach(file => {
                if (file.rootPath) {
                    if (!projects[file.rootPath]) {
                        projects[file.rootPath] = {
                            rootPath: file.rootPath,
                            files: [],
                            extensions: new Set(),
                            directories: new Set()
                        };
                    }
                    projects[file.rootPath].files.push(file);
                    projects[file.rootPath].extensions.add(file.extension);
                    projects[file.rootPath].directories.add(file.directory);
                }
            });

            return {
                totalFiles: files.length,
                files: files.slice(0, 50), // Limit for performance
                projects: Object.values(projects).map(p => ({
                    ...p,
                    extensions: Array.from(p.extensions),
                    directories: Array.from(p.directories).slice(0, 20)
                })),
                recentProject: Object.keys(projects)[0] || null
            };

        } catch (error) {
            console.warn('⚠️  Error extracting recent files:', error.message);
            return null;
        }
    }

    /**
     * Extract project structure for full codebase context
     */
    async extractProjectStructure(workspace) {
        try {
            const structurePath = path.join(workspace.globalState, 'fuzzyFsFilesIndex.json');
            const data = JSON.parse(fs.readFileSync(structurePath, 'utf8'));
            
            // Analyze the structure data
            const fileCount = Array.isArray(data) ? data.length : Object.keys(data).length;
            const extensions = new Set();
            const directories = new Set();
            
            // Sample the data to understand project composition
            let sampleFiles = [];
            if (Array.isArray(data)) {
                sampleFiles = data.slice(0, 100);
            } else {
                sampleFiles = Object.keys(data).slice(0, 100);
            }
            
            sampleFiles.forEach(file => {
                const filePath = typeof file === 'string' ? file : file.path || '';
                if (filePath) {
                    extensions.add(path.extname(filePath));
                    directories.add(path.dirname(filePath));
                }
            });

            return {
                fileCount,
                extensions: Array.from(extensions).filter(ext => ext).slice(0, 20),
                directories: Array.from(directories).slice(0, 30),
                sampleFiles: sampleFiles.slice(0, 20),
                indexSize: fs.statSync(structurePath).size
            };

        } catch (error) {
            console.warn('⚠️  Error extracting project structure:', error.message);
            return null;
        }
    }

    /**
     * Extract git state for code version context
     */
    async extractGitState(workspace) {
        try {
            const gitStatePath = path.join(workspace.globalState, 'gitCommitIndexerState.json');
            const data = JSON.parse(fs.readFileSync(gitStatePath, 'utf8'));
            
            return {
                hasGitData: true,
                lastIndexed: data.lastIndexed || null,
                commitCount: data.commitCount || 0,
                branches: data.branches || [],
                remotes: data.remotes || [],
                currentBranch: data.currentBranch || null,
                repositoryPath: data.repositoryPath || null
            };

        } catch (error) {
            console.warn('⚠️  Error extracting git state:', error.message);
            return null;
        }
    }

    /**
     * Extract folder structure for project organization context
     */
    async extractFolderStructure(workspace) {
        try {
            const foldersPath = path.join(workspace.globalState, 'fuzzyFsFoldersIndex.json');
            const data = JSON.parse(fs.readFileSync(foldersPath, 'utf8'));
            
            let folders = [];
            if (Array.isArray(data)) {
                folders = data;
            } else {
                folders = Object.keys(data);
            }
            
            return {
                folderCount: folders.length,
                folders: folders.slice(0, 50), // Sample for performance
                projectRoots: folders.filter(f => 
                    f.includes('src/') || 
                    f.includes('lib/') || 
                    f.includes('components/') ||
                    f.includes('pages/') ||
                    f.endsWith('/')
                ).slice(0, 20)
            };

        } catch (error) {
            console.warn('⚠️  Error extracting folder structure:', error.message);
            return null;
        }
    }

    /**
     * Check if Augment is available/being used
     */
    isAvailable() {
        return this.augmentWorkspaces.length > 0;
    }

    /**
     * Get current status of Augment workspaces
     */
    getStatus() {
        if (!this.isAvailable()) {
            return {
                available: false,
                message: 'No Augment VSCode workspaces found'
            };
        }

        const totalWorkspaces = this.augmentWorkspaces.length;
        const recentWorkspaces = this.augmentWorkspaces.filter(w => {
            const daysSinceAccess = (Date.now() - w.lastAccessed) / (1000 * 60 * 60 * 24);
            return daysSinceAccess < 30; // Active within last 30 days
        }).length;

        return {
            available: true,
            totalWorkspaces,
            recentWorkspaces,
            message: `Found ${totalWorkspaces} Augment workspaces (${recentWorkspaces} recently active)`,
            workspaces: this.augmentWorkspaces.slice(0, 5).map(w => ({
                id: w.workspaceId.substring(0, 8) + '...',
                lastAccessed: new Date(w.lastAccessed).toISOString(),
                path: w.kvStore
            }))
        };
    }

    /**
     * Extract conversation data from Augment LevelDB files
     * Groups individual messages into meaningful conversation sessions
     */
    async extractConversations(options = {}) {
        if (!this.isAvailable()) {
            throw new Error('No Augment workspaces available');
        }

        const extractOptions = {
            maxConversations: 10,
            workspaceLimit: 3,
            timeframe: '7d',
            ...options
        };

        console.log(`🔍 Extracting conversations from Augment workspaces...`);

        const rawMessages = [];
        const workspacesToProcess = this.augmentWorkspaces.slice(0, extractOptions.workspaceLimit);

        console.log(`📂 Processing ${workspacesToProcess.length} most recent Augment workspaces...`);

        // Extract messages from each workspace
        for (const workspace of workspacesToProcess) {
            try {
                const workspaceMessages = await this.extractFromWorkspace(workspace, extractOptions);
                rawMessages.push(...workspaceMessages);
                console.log(`✅ Extracted ${workspaceMessages.length} messages from workspace ${workspace.workspaceId.substring(0, 8)}`);
            } catch (error) {
                console.warn(`⚠️  Failed to extract from workspace ${workspace.workspaceId}:`, error.message);
                // Continue with other workspaces
            }
        }

        // Group messages into meaningful conversations
        const groupedConversations = this.groupMessagesIntoConversations(rawMessages);

        console.log(`📊 Extracted ${rawMessages.length} raw messages, grouped into ${groupedConversations.length} conversations`);
        return groupedConversations.slice(0, extractOptions.maxConversations);
    }

    /**
     * Extract conversations from a single workspace with enhanced context
     * Now includes file context, project structure, and git state for 9/10 quality
     */
    async extractFromWorkspace(workspace, options) {
        console.log(`🔍 Enhanced extraction from workspace ${workspace.workspaceId.substring(0, 8)} (Quality: ${workspace.dataQuality.score}/10)`);
        
        const conversations = [];
        
        try {
            // Step 1: Extract rich context data first
            const workspaceContext = await this.extractWorkspaceContext(workspace);
            console.log(`📊 Context extracted: ${workspaceContext.recentFiles?.length || 0} recent files, ${workspaceContext.projectStructure?.fileCount || 0} indexed files`);
            
            // Step 2: Get all LDB and LOG files from the kv-store
            const kvStoreFiles = fs.readdirSync(workspace.kvStore)
                .filter(file => file.endsWith('.ldb') || file.endsWith('.log'))
                .map(file => path.join(workspace.kvStore, file));

            if (kvStoreFiles.length === 0) {
                console.log(`📂 No LevelDB files found in workspace ${workspace.workspaceId.substring(0, 8)}`);
                return [];
            }

            // Sort files by modification time (newest first)
            kvStoreFiles.sort((a, b) => {
                try {
                    return fs.statSync(b).mtime - fs.statSync(a).mtime;
                } catch {
                    return 0;
                }
            });

            // Process the most recent files first (limit to avoid overwhelming system)
            const filesToProcess = kvStoreFiles.slice(0, 5);
            console.log(`📋 Processing ${filesToProcess.length} LevelDB files with enhanced context`);

            // Step 3: Extract conversations with enriched context
            for (const filePath of filesToProcess) {
                try {
                    const fileConversations = await this.extractFromLevelDBFileEnhanced(filePath, workspace, workspaceContext);
                    conversations.push(...fileConversations);
                } catch (error) {
                    console.warn(`⚠️  Failed to process ${path.basename(filePath)}:`, error.message);
                }
            }

        } catch (error) {
            console.warn(`⚠️  Could not read workspace ${workspace.workspaceId}:`, error.message);
        }

        return conversations;
    }

    /**
     * Enhanced extraction from LevelDB file with rich context integration
     * This is the enhanced method that achieves 9/10 quality
     */
    async extractFromLevelDBFileEnhanced(filePath, workspace, workspaceContext) {
        const conversations = [];

        try {
            // Use strings command to extract text data from LevelDB file
            const command = `strings "${filePath}"`;
            const output = execSync(command, { 
                encoding: 'utf8', 
                maxBuffer: 50 * 1024 * 1024, // 50MB buffer
                timeout: 30000 // 30 second timeout
            });
            
            // Enhanced conversation parsing with context
            const conversationMatches = this.parseConversationDataEnhanced(output, filePath, workspace, workspaceContext);
            conversations.push(...conversationMatches);

        } catch (error) {
            // Handle different error types gracefully
            if (error.message.includes('too large') || error.message.includes('maxBuffer')) {
                console.warn(`📁 File ${path.basename(filePath)} too large, skipping...`);
            } else if (error.message.includes('timeout')) {
                console.warn(`⏰ Timeout processing ${path.basename(filePath)}, skipping...`);
            } else {
                console.warn(`🔍 Could not extract from ${path.basename(filePath)}:`, error.message);
            }
        }

        return conversations;
    }

    /**
     * Legacy method for backwards compatibility
     */
    async extractFromLevelDBFile(filePath, workspace) {
        return this.extractFromLevelDBFileEnhanced(filePath, workspace, {});
    }

    /**
     * Enhanced conversation parsing with rich context integration
     * This achieves 9/10 quality by adding file context, tool threading, and project awareness
     */
    parseConversationDataEnhanced(output, filePath, workspace, workspaceContext) {
        const conversations = [];
        
        try {
            console.log(`🎩 Enhanced parsing with quality ${workspaceContext.quality || 'unknown'}/10`);
            
            // Extract all conversation elements with enhanced patterns
            const requestMatches = [];
            const responseMatches = [];
            const toolUseIds = [];
            const fileReferences = [];
            
            // Enhanced user request extraction with file context awareness
            const requestPattern = /"request_message"\s*:\s*"([^"]{20,1000})"/g;
            let requestMatch;
            while ((requestMatch = requestPattern.exec(output)) !== null) {
                const cleanedRequest = this.cleanMessage(requestMatch[1]);
                if (cleanedRequest && this.isValidConversationMessage(cleanedRequest)) {
                    // Check if request mentions files from workspace context
                    const mentionedFiles = this.findFileReferences(cleanedRequest, workspaceContext);
                    
                    requestMatches.push({
                        content: cleanedRequest,
                        type: 'user',
                        rawMatch: requestMatch[0],
                        fileReferences: mentionedFiles,
                        position: requestMatch.index
                    });
                }
            }
            
            // Enhanced AI response extraction with tool use detection
            const responsePattern = /"response_text"\s*:\s*"([^"]{20,1000})"/g;
            let responseMatch;
            while ((responseMatch = responsePattern.exec(output)) !== null) {
                const cleanedResponse = this.cleanMessage(responseMatch[1]);
                if (cleanedResponse && this.isValidConversationMessage(cleanedResponse)) {
                    // Extract tool use IDs for threading
                    const toolIds = this.extractToolUseIds(cleanedResponse);
                    const mentionedFiles = this.findFileReferences(cleanedResponse, workspaceContext);
                    
                    responseMatches.push({
                        content: cleanedResponse,
                        type: 'assistant',
                        rawMatch: responseMatch[0],
                        toolUseIds: toolIds,
                        fileReferences: mentionedFiles,
                        position: responseMatch.index
                    });
                    
                    toolUseIds.push(...toolIds);
                }
            }
            
            // Extract conversation IDs with enhanced grouping
            const conversationIdPattern = /"conversationId"\s*:\s*"([^"]+)"/g;
            const conversationIds = [];
            let convIdMatch;
            while ((convIdMatch = conversationIdPattern.exec(output)) !== null) {
                if (convIdMatch[1] && convIdMatch[1].length > 5) {
                    conversationIds.push({
                        id: convIdMatch[1],
                        position: convIdMatch.index
                    });
                }
            }
            
            // Extract file paths mentioned in conversations
            if (workspaceContext.recentFiles) {
                workspaceContext.recentFiles.files.forEach(file => {
                    const filePattern = new RegExp(file.filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
                    if (filePattern.test(output)) {
                        fileReferences.push({
                            file: file.filePath,
                            relPath: file.relPath,
                            mentioned: true
                        });
                    }
                });
            }
            
            // Create enhanced conversation entries with threading
            requestMatches.forEach((request, index) => {
                // Find closest conversation ID by position
                const closestConvId = this.findClosestConversationId(request.position, conversationIds) || `temporal-${index}`;
                
                conversations.push({
                    id: `aug-${workspace.workspaceId.substring(0, 8)}-req-${index}`,
                    conversationId: closestConvId.substring(0, 20),
                    timestamp: new Date().toISOString(),
                    source: 'augment',
                    workspaceId: workspace.workspaceId,
                    filePath: path.basename(filePath),
                    content: request.content,
                    type: 'user',
                    metadata: {
                        extractedFrom: 'leveldb-request-message-enhanced',
                        rawLength: request.content.length,
                        messageType: 'user_request',
                        workspace: workspace.workspaceId.substring(0, 8),
                        // Enhanced metadata
                        fileContext: request.fileReferences,
                        projectContext: workspaceContext.recentFiles?.recentProject || null,
                        gitBranch: workspaceContext.gitState?.currentBranch || null,
                        qualityScore: workspaceContext.quality || 7
                    }
                });
            });
            
            // Create enhanced response entries with tool threading
            responseMatches.forEach((response, index) => {
                const closestConvId = this.findClosestConversationId(response.position, conversationIds) || `temporal-${index}`;
                
                conversations.push({
                    id: `aug-${workspace.workspaceId.substring(0, 8)}-resp-${index}`,
                    conversationId: closestConvId.substring(0, 20),
                    timestamp: new Date().toISOString(),
                    source: 'augment',
                    workspaceId: workspace.workspaceId,
                    filePath: path.basename(filePath),
                    content: response.content,
                    type: 'assistant',
                    metadata: {
                        extractedFrom: 'leveldb-response-text-enhanced',
                        rawLength: response.content.length,
                        messageType: 'ai_response',
                        workspace: workspace.workspaceId.substring(0, 8),
                        // Enhanced metadata
                        toolUseIds: response.toolUseIds,
                        fileContext: response.fileReferences,
                        projectContext: workspaceContext.recentFiles?.recentProject || null,
                        gitBranch: workspaceContext.gitState?.currentBranch || null,
                        qualityScore: workspaceContext.quality || 7,
                        threadingCapable: response.toolUseIds.length > 0
                    }
                });
            });
            
            console.log(`🎩 Enhanced extraction: ${conversations.length} messages, ${toolUseIds.length} tool IDs, ${fileReferences.length} file refs`);
            
        } catch (error) {
            console.warn('⚠️  Error parsing enhanced Augment conversation data:', error.message);
        }

        return conversations;
    }

    /**
     * Legacy method for backwards compatibility
     */
    parseConversationData(output, filePath, workspace) {
        return this.parseConversationDataEnhanced(output, filePath, workspace, {});
    }

    /**
     * Clean and validate message content
     */
    cleanMessage(message) {
        if (!message || typeof message !== 'string') {
            return null;
        }

        // Unescape common JSON escaping
        let cleaned = message
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r')
            .replace(/\\t/g, '\t')
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\');

        // Remove control characters but keep newlines and tabs
        cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

        // Trim whitespace
        cleaned = cleaned.trim();

        // Return null if too short or empty
        return cleaned.length < 10 ? null : cleaned;
    }

    /**
     * Validate if content represents a real conversation message
     */
    isValidConversationMessage(content) {
        if (!content || content.length < 10) return false;
        
        // Filter out common noise patterns
        const noisePatterns = [
            /^[0-9a-f-]{32,}$/i,  // UUIDs or hashes
            /^[{}[\]]+$/,          // Just brackets
            /^[,.:;]+$/,          // Just punctuation
            /^\d+$/,              // Just numbers
            /^[A-Z_]+$/,          // Just constants
            /^(true|false|null|undefined)$/i // JSON literals
        ];

        return !noisePatterns.some(pattern => pattern.test(content.trim()));
    }

    /**
     * Extract tool use IDs for conversation threading
     */
    extractToolUseIds(content) {
        const toolUseIds = [];
        
        // Pattern for tool use IDs (toolu_...)
        const toolUsePattern = /toolu_[a-zA-Z0-9]{20,}/g;
        let match;
        while ((match = toolUsePattern.exec(content)) !== null) {
            toolUseIds.push(match[0]);
        }
        
        // Also look for tool_use_id patterns
        const toolIdPattern = /"tool_use_id"\s*:\s*"(toolu_[a-zA-Z0-9]+)"/g;
        while ((match = toolIdPattern.exec(content)) !== null) {
            if (!toolUseIds.includes(match[1])) {
                toolUseIds.push(match[1]);
            }
        }
        
        return toolUseIds;
    }

    /**
     * Find file references in conversation content using workspace context
     */
    findFileReferences(content, workspaceContext) {
        const fileRefs = [];
        
        if (!workspaceContext.recentFiles) {
            return fileRefs;
        }
        
        // Check for mentions of recently opened files
        workspaceContext.recentFiles.files.forEach(file => {
            const filename = file.filename;
            const relPath = file.relPath;
            
            // Check for filename mentions
            if (content.toLowerCase().includes(filename.toLowerCase())) {
                fileRefs.push({
                    type: 'filename',
                    file: filename,
                    fullPath: file.filePath,
                    relPath: relPath,
                    confidence: 0.8
                });
            }
            
            // Check for relative path mentions
            if (relPath && content.includes(relPath)) {
                fileRefs.push({
                    type: 'relative_path',
                    file: filename,
                    fullPath: file.filePath,
                    relPath: relPath,
                    confidence: 0.9
                });
            }
        });
        
        // Check for common file patterns
        const filePatterns = [
            /([a-zA-Z0-9._-]+\.(js|ts|jsx|tsx|py|md|json|css|html|vue|go|rs|java|cpp|c|h))/g,
            /([a-zA-Z0-9._/-]+\/[a-zA-Z0-9._-]+\.[a-zA-Z]{2,4})/g
        ];
        
        filePatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                if (match[1] && !fileRefs.some(ref => ref.file === match[1])) {
                    fileRefs.push({
                        type: 'pattern_match',
                        file: match[1],
                        confidence: 0.6
                    });
                }
            }
        });
        
        return fileRefs;
    }

    /**
     * Find the closest conversation ID by position in the output
     */
    findClosestConversationId(messagePosition, conversationIds) {
        if (!conversationIds || conversationIds.length === 0) {
            return null;
        }
        
        // Find the conversation ID that appears closest before this message
        let closestId = null;
        let closestDistance = Infinity;
        
        conversationIds.forEach(convId => {
            if (convId.position <= messagePosition) {
                const distance = messagePosition - convId.position;
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestId = convId.id;
                }
            }
        });
        
        return closestId || conversationIds[0]?.id;
    }

    /**
     * Group individual messages into meaningful conversation sessions
     * Uses conversationId, temporal proximity, and workspace context for grouping
     */
    groupMessagesIntoConversations(rawMessages) {
        if (rawMessages.length === 0) return [];
        
        // Sort messages by workspace and timestamp
        const sortedMessages = rawMessages.sort((a, b) => {
            // First sort by workspace
            if (a.workspaceId !== b.workspaceId) {
                return a.workspaceId.localeCompare(b.workspaceId);
            }
            // Then by timestamp
            return new Date(a.timestamp) - new Date(b.timestamp);
        });
        
        const conversations = [];
        const conversationGroups = new Map();
        
        // Group messages by conversationId or create temporal groups
        for (const message of sortedMessages) {
            let groupKey = null;
            
            // Try to use conversationId if it exists and is meaningful
            if (message.conversationId && 
                message.conversationId !== 'unknown' && 
                !message.conversationId.startsWith('temporal-')) {
                groupKey = `${message.workspaceId}-${message.conversationId}`;
            } else {
                // Create temporal groups: messages within 30 minutes are grouped together
                const messageTime = new Date(message.timestamp).getTime();
                let foundGroup = false;
                
                for (const [existingKey, existingGroup] of conversationGroups.entries()) {
                    if (existingKey.startsWith(`${message.workspaceId}-temporal-`)) {
                        const lastMessageTime = new Date(existingGroup.messages[existingGroup.messages.length - 1].timestamp).getTime();
                        const timeDiff = Math.abs(messageTime - lastMessageTime);
                        
                        // Group if within 30 minutes and same workspace
                        if (timeDiff <= 30 * 60 * 1000) {
                            groupKey = existingKey;
                            foundGroup = true;
                            break;
                        }
                    }
                }
                
                if (!foundGroup) {
                    // Create new temporal group
                    groupKey = `${message.workspaceId}-temporal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                }
            }
            
            // Add message to group
            if (!conversationGroups.has(groupKey)) {
                conversationGroups.set(groupKey, {
                    messages: [],
                    workspaceId: message.workspaceId,
                    conversationId: message.conversationId || groupKey,
                    filePath: message.filePath,
                    startTime: message.timestamp,
                    endTime: message.timestamp
                });
            }
            
            const group = conversationGroups.get(groupKey);
            group.messages.push(message);
            
            // Update timespan
            if (new Date(message.timestamp) < new Date(group.startTime)) {
                group.startTime = message.timestamp;
            }
            if (new Date(message.timestamp) > new Date(group.endTime)) {
                group.endTime = message.timestamp;
            }
        }
        
        // Convert groups to conversation objects
        let conversationIndex = 0;
        for (const [groupKey, group] of conversationGroups.entries()) {
            if (group.messages.length === 0) continue;
            
            // Create meaningful conversation content from all messages
            const userMessages = group.messages.filter(m => m.type === 'user');
            const assistantMessages = group.messages.filter(m => m.type === 'assistant');
            
            // Build comprehensive conversation content
            let conversationContent = '';
            if (userMessages.length > 0 && assistantMessages.length > 0) {
                conversationContent = `Augment VSCode conversation: ${userMessages.length} user messages, ${assistantMessages.length} AI responses.\n\n`;
                
                // Include sample of actual content
                if (userMessages.length > 0) {
                    conversationContent += `Latest user query: ${userMessages[userMessages.length - 1].content.substring(0, 300)}...\n\n`;
                }
                if (assistantMessages.length > 0) {
                    conversationContent += `Latest AI response: ${assistantMessages[assistantMessages.length - 1].content.substring(0, 300)}...`;
                }
            } else if (userMessages.length > 0) {
                conversationContent = `User queries (${userMessages.length}): ${userMessages[userMessages.length - 1].content.substring(0, 400)}...`;
            } else if (assistantMessages.length > 0) {
                conversationContent = `AI responses (${assistantMessages.length}): ${assistantMessages[assistantMessages.length - 1].content.substring(0, 400)}...`;
            }
            
            conversations.push({
                id: `aug-conv-${group.workspaceId.substring(0, 8)}-${conversationIndex++}`,
                conversationId: group.conversationId.substring(0, 20),
                timestamp: group.endTime, // Use latest message time
                source: 'augment',
                content: conversationContent,
                messages: group.messages,
                metadata: {
                    workspaceId: group.workspaceId,
                    filePath: group.filePath,
                    messageCount: group.messages.length,
                    userMessages: userMessages.length,
                    assistantMessages: assistantMessages.length,
                    timespan: {
                        start: group.startTime,
                        end: group.endTime,
                        duration: new Date(group.endTime) - new Date(group.startTime)
                    },
                    extractedAt: new Date().toISOString(),
                    platform: 'augment-vscode'
                }
            });
        }
        
        // Sort conversations by timestamp (most recent first)
        conversations.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        return conversations;
    }
}

module.exports = AugmentParser;