"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AICFExporter = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs/promises"));
class AICFExporter {
    constructor() {
        console.log('📦 AICFExporter initialized');
    }
    async exportConversation(options) {
        try {
            console.log(`📄 Exporting conversation from ${options.source}...`);
            // Get export directory
            const exportDir = await this.getExportDirectory();
            // Generate filename
            const filename = this.generateFilename(options);
            const filePath = path.join(exportDir, filename);
            // Convert to AICF format
            const aicfData = await this.convertToAICF(options);
            // Write to file
            await fs.writeFile(filePath, JSON.stringify(aicfData, null, 2), 'utf-8');
            const uri = vscode.Uri.file(filePath);
            const directory = vscode.Uri.file(exportDir);
            console.log(`✅ Exported to ${filename}`);
            return {
                success: true,
                filename,
                uri,
                directory
            };
        }
        catch (error) {
            console.error('❌ Export failed:', error);
            return {
                success: false,
                error: String(error)
            };
        }
    }
    async exportBatch(conversations) {
        const results = [];
        for (const conversation of conversations) {
            const options = {
                source: 'batch',
                platform: conversation.platform,
                timestamp: conversation.lastModified,
                metadata: conversation.metadata
            };
            const result = await this.exportConversation(options);
            results.push(result);
        }
        return results;
    }
    async convertToAICF(options) {
        const now = new Date().toISOString();
        let messages = [];
        let title = 'AI Conversation';
        // Handle different input sources
        if (options.text) {
            messages = this.parseConversationText(options.text);
            title = this.extractTitleFromText(options.text);
        }
        else {
            // For encrypted or inaccessible files, create a placeholder
            messages = [{
                    role: 'system',
                    content: `This conversation was detected from ${options.platform || options.source} but could not be automatically extracted. To preserve the full conversation, please copy and paste it manually using the "Export Current" command.`,
                    timestamp: now,
                    metadata: {
                        note: 'User export required for encrypted/protected conversations',
                        original_source: options.source,
                        platform: options.platform
                    }
                }];
            title = `${options.platform || 'AI'} Conversation - Manual Export Required`;
        }
        const aicfConversation = {
            version: '1.0',
            metadata: {
                title,
                created: options.timestamp.toISOString(),
                modified: now,
                source: options.source,
                platform: options.platform,
                participants: this.inferParticipants(messages, options.platform),
                context: {
                    export_method: 'vscode_extension',
                    export_timestamp: now,
                    original_metadata: options.metadata
                }
            },
            messages
        };
        return aicfConversation;
    }
    parseConversationText(text) {
        const messages = [];
        const lines = text.split('\n').map(line => line.trim()).filter(line => line);
        let currentMessage = null;
        for (const line of lines) {
            // Try to detect message boundaries
            const userMatch = line.match(/^(user|human|you):\s*(.*)$/i);
            const assistantMatch = line.match(/^(assistant|ai|claude|copilot|gpt|chatgpt|bot):\s*(.*)$/i);
            const systemMatch = line.match(/^(system):\s*(.*)$/i);
            if (userMatch) {
                if (currentMessage)
                    messages.push(currentMessage);
                currentMessage = {
                    role: 'user',
                    content: userMatch[2],
                    timestamp: new Date().toISOString()
                };
            }
            else if (assistantMatch) {
                if (currentMessage)
                    messages.push(currentMessage);
                currentMessage = {
                    role: 'assistant',
                    content: assistantMatch[2],
                    timestamp: new Date().toISOString()
                };
            }
            else if (systemMatch) {
                if (currentMessage)
                    messages.push(currentMessage);
                currentMessage = {
                    role: 'system',
                    content: systemMatch[2],
                    timestamp: new Date().toISOString()
                };
            }
            else if (currentMessage) {
                // Continue the current message
                currentMessage.content += '\n' + line;
            }
            else {
                // If no role detected, assume it's a user message
                currentMessage = {
                    role: 'user',
                    content: line,
                    timestamp: new Date().toISOString()
                };
            }
        }
        // Add the last message
        if (currentMessage) {
            messages.push(currentMessage);
        }
        // If we couldn't parse any clear messages, treat the whole text as one user message
        if (messages.length === 0 && text.trim()) {
            messages.push({
                role: 'user',
                content: text.trim(),
                timestamp: new Date().toISOString(),
                metadata: { note: 'Could not parse message structure, treating as single user input' }
            });
        }
        return messages;
    }
    extractTitleFromText(text) {
        // Try to extract a meaningful title from the conversation
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length > 0) {
            const firstLine = lines[0].trim();
            // Remove common prefixes
            let title = firstLine
                .replace(/^(user|human|you|assistant|ai|claude|copilot|gpt|chatgpt|bot):\s*/i, '')
                .replace(/^["""''`]+|["""''`]+$/g, '') // Remove quotes
                .trim();
            // Truncate if too long
            if (title.length > 50) {
                title = title.substring(0, 47) + '...';
            }
            return title || 'AI Conversation';
        }
        return 'AI Conversation';
    }
    inferParticipants(messages, platform) {
        const participants = new Set();
        // Add participants based on message roles
        messages.forEach(msg => participants.add(msg.role));
        const result = [];
        if (participants.has('user')) {
            result.push({ role: 'user', name: 'User' });
        }
        if (participants.has('assistant')) {
            const aiName = this.getAIName(platform);
            result.push({ role: 'assistant', name: aiName });
        }
        if (participants.has('system')) {
            result.push({ role: 'system', name: 'System' });
        }
        return result;
    }
    getAIName(platform) {
        switch (platform?.toLowerCase()) {
            case 'claude': return 'Claude';
            case 'chatgpt': return 'ChatGPT';
            case 'copilot': return 'GitHub Copilot';
            case 'augment': return 'Augment AI';
            case 'warp': return 'Warp AI';
            default: return 'AI Assistant';
        }
    }
    generateFilename(options) {
        const timestamp = options.timestamp.toISOString().replace(/[:.]/g, '-').split('T')[0];
        const platform = options.platform ? `-${options.platform}` : '';
        const source = options.source === 'manual' ? '' : `-${options.source}`;
        return `conversation-${timestamp}${platform}${source}.aicf`;
    }
    async getExportDirectory() {
        const config = vscode.workspace.getConfiguration('aicf');
        const relativePath = config.get('exportPath', '.aicf/conversations');
        // Use workspace folder if available, otherwise use temp directory
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        let basePath;
        if (workspaceFolder) {
            basePath = workspaceFolder.uri.fsPath;
        }
        else {
            // Fallback to user home directory
            const os = require('os');
            basePath = path.join(os.homedir(), 'aicf-exports');
        }
        const exportDir = path.resolve(basePath, relativePath);
        // Ensure directory exists
        try {
            await fs.mkdir(exportDir, { recursive: true });
        }
        catch (error) {
            throw new Error(`Could not create export directory: ${exportDir}. ${error}`);
        }
        return exportDir;
    }
    async getExportStats() {
        try {
            const exportDir = await this.getExportDirectory();
            const files = await fs.readdir(exportDir);
            const aicfFiles = files.filter(f => f.endsWith('.aicf'));
            const recentExports = [];
            for (const file of aicfFiles.slice(-10)) { // Last 10 files
                try {
                    const filePath = path.join(exportDir, file);
                    const stats = await fs.stat(filePath);
                    recentExports.push({
                        filename: file,
                        created: stats.mtime,
                        size: stats.size
                    });
                }
                catch {
                    // Skip files we can't stat
                }
            }
            return {
                totalExports: aicfFiles.length,
                exportDirectory: exportDir,
                recentExports: recentExports.sort((a, b) => b.created.getTime() - a.created.getTime())
            };
        }
        catch (error) {
            return {
                totalExports: 0,
                exportDirectory: '',
                recentExports: []
            };
        }
    }
}
exports.AICFExporter = AICFExporter;
//# sourceMappingURL=AICFExporter.js.map