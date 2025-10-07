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
exports.ConversationDetector = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs/promises"));
const AIActivityMonitor_1 = require("../monitors/AIActivityMonitor");
class ConversationDetector {
    constructor() {
        this.monitor = new AIActivityMonitor_1.AIActivityMonitor();
        console.log('🔎 ConversationDetector initialized');
    }
    async discoverAll(progress, token) {
        console.log('🔍 Starting comprehensive conversation discovery...');
        progress?.report({ increment: 0, message: 'Scanning AI platforms...' });
        const discoveries = [];
        const config = vscode.workspace.getConfiguration('aicf');
        const platforms = config.get('platformsToMonitor', ['claude', 'copilot', 'augment', 'chatgpt']);
        let platformIndex = 0;
        for (const platform of platforms) {
            if (token?.isCancellationRequested) {
                break;
            }
            progress?.report({
                increment: (platformIndex / platforms.length) * 100,
                message: `Scanning ${platform}...`
            });
            try {
                const platformDiscoveries = await this.discoverPlatform(platform);
                discoveries.push(...platformDiscoveries);
                console.log(`✅ Found ${platformDiscoveries.length} conversations for ${platform}`);
            }
            catch (error) {
                console.log(`❌ Error discovering ${platform}: ${error}`);
            }
            platformIndex++;
        }
        progress?.report({ increment: 100, message: `Found ${discoveries.length} conversations` });
        console.log(`🎯 Discovery complete: ${discoveries.length} total conversations found`);
        return discoveries.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
    }
    async discoverPlatform(platform) {
        const activities = await this.monitor.triggerDiscovery();
        const platformActivities = activities.filter(a => a.platform === platform);
        const discoveries = [];
        for (const activity of platformActivities) {
            try {
                const stats = await fs.stat(activity.path);
                const messageCount = await this.estimateMessageCount(activity.path, platform);
                discoveries.push({
                    platform: activity.platform,
                    path: activity.path,
                    lastModified: stats.mtime,
                    messageCount,
                    size: stats.size,
                    isEncrypted: platform === 'chatgpt' && activity.path.endsWith('.data'),
                    metadata: {
                        ...activity.metadata,
                        fileType: path.extname(activity.path),
                        discovered: new Date()
                    }
                });
            }
            catch (error) {
                console.log(`⚠️ Could not stat file ${activity.path}: ${error}`);
            }
        }
        return discoveries;
    }
    async estimateMessageCount(filePath, platform) {
        try {
            const stats = await fs.stat(filePath);
            const extension = path.extname(filePath).toLowerCase();
            // Handle encrypted GPT files
            if (platform === 'chatgpt' && extension === '.data') {
                // For encrypted files, we estimate based on file size
                // Average conversation seems to be ~50-200KB per conversation
                // This is a rough heuristic since we can't read the content
                const sizeKB = stats.size / 1024;
                if (sizeKB < 10)
                    return 5;
                if (sizeKB < 50)
                    return 15;
                if (sizeKB < 100)
                    return 30;
                return Math.min(100, Math.floor(sizeKB / 2)); // Conservative estimate
            }
            // For readable files, try to count messages
            if (extension === '.json') {
                const content = await fs.readFile(filePath, 'utf-8');
                try {
                    const data = JSON.parse(content);
                    if (Array.isArray(data)) {
                        return data.length;
                    }
                    else if (data.messages && Array.isArray(data.messages)) {
                        return data.messages.length;
                    }
                    else if (data.conversation && Array.isArray(data.conversation)) {
                        return data.conversation.length;
                    }
                }
                catch {
                    // If JSON parsing fails, fall back to text analysis
                }
            }
            // Text-based heuristic for other file types
            if (['.txt', '.md', '.aicf'].includes(extension)) {
                const content = await fs.readFile(filePath, 'utf-8');
                // Count potential message indicators
                const userMessages = (content.match(/\b(user|human):/gi) || []).length;
                const aiMessages = (content.match(/\b(assistant|ai|claude|copilot|gpt):/gi) || []).length;
                return Math.max(userMessages, aiMessages) * 2; // Estimate total exchanges
            }
            // Database files - return conservative estimate
            if (['.db', '.sqlite'].includes(extension)) {
                const sizeKB = stats.size / 1024;
                return Math.floor(sizeKB / 10); // Very rough estimate
            }
            return 1; // Default fallback
        }
        catch (error) {
            console.log(`⚠️ Could not estimate message count for ${filePath}: ${error}`);
            return 1;
        }
    }
    async findRecentConversations(days = 7) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        const allDiscoveries = await this.discoverAll();
        return allDiscoveries.filter(d => d.lastModified > cutoffDate);
    }
    async findLargestConversations(limit = 10) {
        const allDiscoveries = await this.discoverAll();
        return allDiscoveries
            .sort((a, b) => b.messageCount - a.messageCount)
            .slice(0, limit);
    }
    async getPlatformSummary() {
        const discoveries = await this.discoverAll();
        const summary = {};
        for (const discovery of discoveries) {
            if (!summary[discovery.platform]) {
                summary[discovery.platform] = {
                    count: 0,
                    totalSize: 0,
                    lastActivity: null
                };
            }
            summary[discovery.platform].count++;
            summary[discovery.platform].totalSize += discovery.size;
            if (!summary[discovery.platform].lastActivity ||
                discovery.lastModified > summary[discovery.platform].lastActivity) {
                summary[discovery.platform].lastActivity = discovery.lastModified;
            }
        }
        return summary;
    }
    dispose() {
        this.monitor.dispose();
    }
}
exports.ConversationDetector = ConversationDetector;
//# sourceMappingURL=ConversationDetector.js.map