import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';
import { EventEmitter } from 'events';

export interface ConversationActivity {
	platform: string;
	path: string;
	lastModified: Date;
	messageCount?: number;
	isActive: boolean;
	metadata?: any;
}

export class AIActivityMonitor extends EventEmitter implements vscode.Disposable {
	private watchers: vscode.FileSystemWatcher[] = [];
	private lastActivity: Map<string, Date> = new Map();
	private activityTimer: NodeJS.Timeout | null = null;
	private isMonitoring = false;

	// Known AI platform storage patterns (courtesy of cooperative AIs!)
	private readonly PLATFORM_PATTERNS = {
		claude: [
			// Claude Desktop
			'~/Library/Application Support/Claude/',
			'~/.claude/',
			// Claude via Augment
			'~/Library/Application Support/Code/User/globalStorage/augmentcode.augment/',
			'~/.augment/conversations/'
		],
		copilot: [
			// GitHub Copilot
			'~/Library/Application Support/Code/User/globalStorage/github.copilot/',
			'~/Library/Application Support/GitHub Copilot/',
			'~/.vscode/extensions/github.copilot*/conversations/'
		],
		augment: [
			// Augment storage
			'~/Library/Application Support/Augment/',
			'~/.augment/',
			'~/Library/Application Support/Code/User/globalStorage/augmentcode.augment/'
		],
		warp: [
			// Warp AI (our friend Claude in terminal!)
			'~/Library/Application Support/dev.warp.Warp-Stable/conversations/',
			'~/Library/Application Support/dev.warp.Warp/ai_sessions/',
			'~/.warp/conversations/'
		],
		chatgpt: [
			// ChatGPT Desktop App - encrypted .data files (auto-detect user ID)
			'~/Library/Application Support/com.openai.chat/conversations-v3-*',
			'~/Library/Application Support/com.openai.chat/drafts-v2-*',
			
			// ChatGPT Web (Chrome) - IndexedDB storage pattern from GPT's treasure map
			'~/Library/Application Support/Google/Chrome/Default/IndexedDB/https_chatgpt.com_0.indexeddb.leveldb',
			
			// ChatGPT Generic Desktop paths (from GPT's guide)
			'~/Library/Application Support/ChatGPT/IndexedDB',
			'~/Library/Application Support/ChatGPT/Cache',
			
			// Note: Multiple storage strategies - desktop app (.data), web (IndexedDB)
			// All encrypted but we can detect conversation activity via file changes
		]
	};

	constructor() {
		super();
		console.log('🔍 AI Activity Monitor initialized');
	}

	async start(): Promise<void> {
		if (this.isMonitoring) {
			console.log('⚠️ Monitor already running');
			return;
		}

		console.log('🚀 Starting AI activity monitoring...');
		
		const config = vscode.workspace.getConfiguration('aicf');
		const platformsToMonitor = config.get<string[]>('platformsToMonitor', ['claude', 'copilot', 'augment']);

		for (const platform of platformsToMonitor) {
			await this.setupPlatformMonitoring(platform);
		}

		// Start idle detection timer
		this.startIdleDetection();
		
		this.isMonitoring = true;
		console.log(`✅ Monitoring ${platformsToMonitor.length} AI platforms`);
	}

	private async setupPlatformMonitoring(platform: string): Promise<void> {
		const patterns = this.PLATFORM_PATTERNS[platform as keyof typeof this.PLATFORM_PATTERNS];
		
		if (!patterns) {
			console.log(`⚠️ Unknown platform: ${platform}`);
			return;
		}

		console.log(`🎯 Setting up monitoring for ${platform}...`);

		for (const pattern of patterns) {
			try {
				const expandedPaths = await this.expandPathWithWildcards(pattern);
				
				for (const expandedPath of expandedPaths) {
					const exists = await this.pathExists(expandedPath);
					
					if (exists) {
						await this.createWatcher(platform, expandedPath);
						console.log(`✅ Watching ${platform}: ${expandedPath}`);
					} else {
						console.log(`ℹ️ Path not found for ${platform}: ${expandedPath}`);
					}
				}
				
				if (expandedPaths.length === 0) {
					console.log(`ℹ️ No matching paths found for ${platform}: ${pattern}`);
				}
			} catch (error) {
				console.log(`❌ Failed to watch ${pattern}: ${error}`);
			}
		}
	}

	private async createWatcher(platform: string, watchPath: string): Promise<void> {
		// Watch for various file types that might indicate conversations
		// Include .data for encrypted files (GPT Desktop) and .ldb for LevelDB (GPT Web)
		const watchPattern = path.join(watchPath, '**/*.{json,db,sqlite,txt,md,aicf,data,ldb}');
		
		try {
			const watcher = vscode.workspace.createFileSystemWatcher(watchPattern);
			
			watcher.onDidCreate((uri) => {
				this.handleFileEvent('created', platform, uri);
			});
			
			watcher.onDidChange((uri) => {
				this.handleFileEvent('changed', platform, uri);
			});
			
			watcher.onDidDelete((uri) => {
				this.handleFileEvent('deleted', platform, uri);
			});
			
			this.watchers.push(watcher);
		} catch (error) {
			console.log(`❌ Failed to create watcher for ${watchPath}: ${error}`);
		}
	}

	private handleFileEvent(event: string, platform: string, uri: vscode.Uri): void {
		const filePath = uri.fsPath;
		const now = new Date();
		
		console.log(`📁 ${event}: ${platform} - ${path.basename(filePath)}`);
		
		// Update activity timestamp
		this.lastActivity.set(platform, now);
		
		// Check if this looks like a conversation file
		if (this.isConversationFile(filePath)) {
			const activity: ConversationActivity = {
				platform,
				path: filePath,
				lastModified: now,
				isActive: true,
				metadata: { event, uri: uri.toString() }
			};
			
			this.emit('conversationDetected', activity);
			
			// Reset idle timer since we detected activity
			this.resetIdleTimer();
		}
	}

	private isConversationFile(filePath: string): boolean {
		const filename = path.basename(filePath).toLowerCase();
		const extension = path.extname(filePath).toLowerCase();
		
		// Special handling for ChatGPT encrypted files
		if (extension === '.data') {
			// GPT Desktop: UUID.data files in conversations-v3-* or drafts-v2-* directories
			const isInGPTConversationsDir = filePath.includes('conversations-v3-') || filePath.includes('drafts-v2-');
			const isUUIDFileName = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.data$/i.test(filename);
			return isInGPTConversationsDir && isUUIDFileName;
		}
		
		// Handle ChatGPT Web (Chrome IndexedDB) LevelDB files
		if (extension === '.ldb') {
			// GPT Web: LevelDB files in IndexedDB directory
			const isInIndexedDB = filePath.includes('IndexedDB') && 
							   (filePath.includes('chatgpt.com') || filePath.includes('ChatGPT'));
			return isInIndexedDB;
		}
		
		// Heuristics for conversation files (thanks to our AI friends!)
		const conversationIndicators = [
			'conversation', 'chat', 'messages', 'session', 'dialogue',
			'context', 'history', 'transcript', 'exchange'
		];
		
		const supportedExtensions = ['.json', '.db', '.sqlite', '.txt', '.md', '.aicf'];
		
		const hasConversationKeyword = conversationIndicators.some(keyword => 
			filename.includes(keyword)
		);
		
		const hasSupportedExtension = supportedExtensions.includes(extension);
		
		return hasConversationKeyword && hasSupportedExtension;
	}

	private startIdleDetection(): void {
		const config = vscode.workspace.getConfiguration('aicf');
		const idleTimeout = config.get<number>('idleTimeout', 300) * 1000; // Convert to ms
		
		this.activityTimer = setInterval(() => {
			this.checkForIdleConversations();
		}, 60000); // Check every minute
	}

	private checkForIdleConversations(): void {
		const config = vscode.workspace.getConfiguration('aicf');
		const idleTimeout = config.get<number>('idleTimeout', 300) * 1000;
		const now = new Date();
		
		for (const [platform, lastActivity] of this.lastActivity.entries()) {
			const timeSinceActivity = now.getTime() - lastActivity.getTime();
			
			if (timeSinceActivity > idleTimeout) {
				console.log(`😴 ${platform} appears idle (${Math.round(timeSinceActivity / 1000)}s)`);
				
				const activity: ConversationActivity = {
					platform,
					path: `${platform}_session`,
					lastModified: lastActivity,
					isActive: false,
					metadata: { 
						idleTime: timeSinceActivity,
						reason: 'idle_timeout'
					}
				};
				
				this.emit('conversationEnded', activity);
				
				// Remove from active tracking
				this.lastActivity.delete(platform);
			}
		}
	}

	private resetIdleTimer(): void {
		// Activity detected, reset the idle detection
		if (this.activityTimer) {
			clearInterval(this.activityTimer);
			this.startIdleDetection();
		}
	}

	private expandPath(pathPattern: string): string {
		return pathPattern.replace('~', os.homedir());
	}
	
	private async expandPathWithWildcards(pathPattern: string): Promise<string[]> {
		const expandedBase = pathPattern.replace('~', os.homedir());
		
		// Handle wildcards by finding matching directories
		if (expandedBase.includes('*')) {
			try {
				const basePath = expandedBase.substring(0, expandedBase.lastIndexOf('/'));
				const pattern = expandedBase.substring(expandedBase.lastIndexOf('/') + 1);
				
				const entries = await fs.readdir(basePath, { withFileTypes: true });
				const matches = entries
					.filter(entry => entry.isDirectory())
					.filter(entry => this.matchesPattern(entry.name, pattern))
					.map(entry => path.join(basePath, entry.name));
				
				return matches;
			} catch {
				return [];
			}
		}
		
		return [expandedBase];
	}
	
	private matchesPattern(name: string, pattern: string): boolean {
		// Simple wildcard matching for patterns like "conversations-v3-*"
		const regexPattern = pattern.replace(/\*/g, '.*');
		const regex = new RegExp(`^${regexPattern}$`);
		return regex.test(name);
	}

	private async pathExists(path: string): Promise<boolean> {
		try {
			await fs.access(path);
			return true;
		} catch {
			return false;
		}
	}

	// Event emitter methods for external listeners
	onConversationDetected(callback: (activity: ConversationActivity) => void): void {
		this.on('conversationDetected', callback);
	}

	onConversationEnded(callback: (activity: ConversationActivity) => void): void {
		this.on('conversationEnded', callback);
	}

	// Manual trigger for testing
	async triggerDiscovery(): Promise<ConversationActivity[]> {
		console.log('🔍 Manual conversation discovery triggered');
		
		const discoveries: ConversationActivity[] = [];
		const config = vscode.workspace.getConfiguration('aicf');
		const platforms = config.get<string[]>('platformsToMonitor', ['claude', 'copilot', 'augment']);
		
		for (const platform of platforms) {
			const patterns = this.PLATFORM_PATTERNS[platform as keyof typeof this.PLATFORM_PATTERNS];
			
			for (const pattern of patterns) {
				try {
					const expandedPath = this.expandPath(pattern);
					const files = await this.findConversationFiles(expandedPath);
					
					for (const file of files) {
						const stats = await fs.stat(file);
						discoveries.push({
							platform,
							path: file,
							lastModified: stats.mtime,
							isActive: false,
							metadata: { 
								size: stats.size,
								discovered: true
							}
						});
					}
				} catch (error) {
					// Silently continue - path might not exist
				}
			}
		}
		
		console.log(`🎯 Discovery complete: found ${discoveries.length} conversation files`);
		return discoveries;
	}

	private async findConversationFiles(dir: string): Promise<string[]> {
		try {
			const files: string[] = [];
			const entries = await fs.readdir(dir, { withFileTypes: true });
			
			for (const entry of entries) {
				const fullPath = path.join(dir, entry.name);
				
				if (entry.isDirectory()) {
					// Recursively search subdirectories
					const subFiles = await this.findConversationFiles(fullPath);
					files.push(...subFiles);
				} else if (this.isConversationFile(fullPath)) {
					files.push(fullPath);
				}
			}
			
			return files;
		} catch (error) {
			return [];
		}
	}

	stop(): void {
		if (!this.isMonitoring) return;
		
		console.log('🛑 Stopping AI activity monitoring...');
		
		// Dispose all watchers
		for (const watcher of this.watchers) {
			watcher.dispose();
		}
		this.watchers = [];
		
		// Clear timers
		if (this.activityTimer) {
			clearInterval(this.activityTimer);
			this.activityTimer = null;
		}
		
		// Clear activity tracking
		this.lastActivity.clear();
		
		this.isMonitoring = false;
		console.log('✅ AI monitoring stopped');
	}

	dispose(): void {
		this.stop();
		this.removeAllListeners();
	}

	// Debugging methods
	getMonitoringStatus(): any {
		return {
			isMonitoring: this.isMonitoring,
			activeWatchers: this.watchers.length,
			lastActivity: Object.fromEntries(this.lastActivity),
			platformPatterns: this.PLATFORM_PATTERNS
		};
	}
}