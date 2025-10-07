import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { ConversationDetector } from './detectors/ConversationDetector';
import { AICFExporter } from './exporters/AICFExporter';
import { AIActivityMonitor } from './monitors/AIActivityMonitor';

export function activate(context: vscode.ExtensionContext) {
	console.log('🚀 AICF Core: Activating continuous AI context memory...');

	// Initialize core components
	const detector = new ConversationDetector();
	const exporter = new AICFExporter();
	const monitor = new AIActivityMonitor();

	// Status bar integration
	const statusBar = createStatusBar();
	
	// Register commands
	const commands = [
		vscode.commands.registerCommand('aicf.exportCurrent', async () => {
			await exportCurrentConversation(exporter);
		}),
		
		vscode.commands.registerCommand('aicf.exportAll', async () => {
			await exportAllConversations(exporter);
		}),
		
		vscode.commands.registerCommand('aicf.discoverConversations', async () => {
			await discoverConversations(detector);
		}),
		
		vscode.commands.registerCommand('aicf.openSettings', async () => {
			await vscode.commands.executeCommand('workbench.action.openSettings', 'aicf');
		}),
		
		vscode.commands.registerCommand('aicf.testGPTDetection', async () => {
			await testGPTDetection(monitor);
		})
	];

	// Setup activity monitoring
	monitor.onConversationDetected(async (activity) => {
		await handleConversationActivity(activity, exporter, statusBar);
	});

	monitor.onConversationEnded(async (activity) => {
		await suggestExport(activity, exporter);
	});

	// Start monitoring if enabled
	const config = vscode.workspace.getConfiguration('aicf');
	if (config.get<boolean>('autoDetect', true)) {
		monitor.start();
		console.log('🔍 AICF: Auto-detection enabled');
	}

	// Add all subscriptions
	context.subscriptions.push(...commands, statusBar, monitor);
	
	vscode.window.showInformationMessage('🎯 AICF Core activated! Ready for continuous AI context memory.');
}

function createStatusBar(): vscode.StatusBarItem {
	const statusBar = vscode.window.createStatusBarItem(
		vscode.StatusBarAlignment.Right,
		100
	);
	
	statusBar.text = '$(archive) AICF';
	statusBar.tooltip = 'Export AI conversation to AICF format';
	statusBar.command = 'aicf.exportCurrent';
	statusBar.show();
	
	return statusBar;
}

async function exportCurrentConversation(exporter: AICFExporter): Promise<void> {
	try {
		vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: 'Exporting conversation...',
			cancellable: false
		}, async (progress) => {
			progress.report({ increment: 0, message: 'Detecting conversation context...' });
			
			// Prompt user for conversation text if needed
			const conversationText = await vscode.window.showInputBox({
				prompt: 'Paste AI conversation text (or leave empty to use workspace context)',
				placeHolder: 'User: Help me debug...\nAI: I can help with that...',
				ignoreFocusOut: true
			});
			
			progress.report({ increment: 50, message: 'Converting to AICF format...' });
			
			const result = await exporter.exportConversation({
				text: conversationText,
				source: 'manual',
				timestamp: new Date()
			});
			
			progress.report({ increment: 100, message: 'Export complete!' });
			
			if (result.success) {
				const action = await vscode.window.showInformationMessage(
					`✅ Conversation exported to ${result.filename}`,
					'Open File',
					'Open Folder'
				);
				
				if (action === 'Open File' && result.uri) {
					await vscode.window.showTextDocument(result.uri);
				} else if (action === 'Open Folder' && result.directory) {
					await vscode.commands.executeCommand('vscode.openFolder', result.directory);
				}
			}
		});
	} catch (error) {
		vscode.window.showErrorMessage(`Failed to export conversation: ${error}`);
	}
}

async function exportAllConversations(exporter: AICFExporter): Promise<void> {
	const action = await vscode.window.showWarningMessage(
		'Export all recent AI conversations? This may take a moment.',
		'Export All',
		'Cancel'
	);
	
	if (action === 'Export All') {
		// Implementation for bulk export
		vscode.window.showInformationMessage('🔄 Bulk export not yet implemented');
	}
}

async function discoverConversations(detector: ConversationDetector): Promise<void> {
	vscode.window.withProgress({
		location: vscode.ProgressLocation.Notification,
		title: 'Discovering AI conversations...',
		cancellable: true
	}, async (progress, token) => {
		const discoveries = await detector.discoverAll(progress, token);
		
		if (discoveries.length > 0) {
			const items = discoveries.map(d => ({
				label: `${d.platform}: ${d.messageCount} messages`,
				description: d.lastModified.toLocaleString(),
				detail: d.path
			}));
			
			const selected = await vscode.window.showQuickPick(items, {
				placeHolder: 'Select conversation to export'
			});
			
			if (selected) {
				vscode.window.showInformationMessage(`Selected: ${selected.label}`);
			}
		} else {
			vscode.window.showInformationMessage('No AI conversations found');
		}
	});
}

async function handleConversationActivity(
	activity: any, 
	exporter: AICFExporter, 
	statusBar: vscode.StatusBarItem
): Promise<void> {
	// Update status bar to show activity
	statusBar.text = '$(sync~spin) AICF';
	statusBar.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
	
	// Reset after a moment
	setTimeout(() => {
		statusBar.text = '$(archive) AICF';
		statusBar.backgroundColor = undefined;
	}, 2000);
}

async function suggestExport(activity: any, exporter: AICFExporter): Promise<void> {
	const config = vscode.workspace.getConfiguration('aicf');
	const notificationLevel = config.get<string>('notificationLevel', 'important');
	
	if (notificationLevel === 'none') return;
	
	const autoExport = config.get<boolean>('autoExport', false);
	
	if (autoExport) {
		// Auto-export without asking
		await exporter.exportConversation({
			source: 'auto',
			platform: activity.platform,
			timestamp: new Date()
		});
		
		vscode.window.showInformationMessage('📦 AI conversation auto-exported to AICF');
	} else {
		// Ask user
		const action = await vscode.window.showInformationMessage(
			`💡 ${activity.platform} conversation detected. Export to AICF?`,
			'Export Now',
			'Export & Open',
			'Later',
			'Settings'
		);
		
		switch (action) {
			case 'Export Now':
				await exporter.exportConversation(activity);
				break;
			case 'Export & Open':
				const result = await exporter.exportConversation(activity);
				if (result.uri) {
					await vscode.window.showTextDocument(result.uri);
				}
				break;
			case 'Settings':
				await vscode.commands.executeCommand('aicf.openSettings');
				break;
		}
	}
}

	async function testGPTDetection(monitor: AIActivityMonitor): Promise<void> {
	try {
		vscode.window.showInformationMessage('🔍 Testing ChatGPT detection...');
		
		const discoveries = await monitor.triggerDiscovery();
		const gptDiscoveries = discoveries.filter(d => d.platform === 'chatgpt');
		
		if (gptDiscoveries.length > 0) {
			const message = `✅ Found ${gptDiscoveries.length} ChatGPT conversation files!\n\n` +
				gptDiscoveries.slice(0, 5).map(d => 
					`• ${path.basename(d.path)} (${(d.metadata?.size || 0)} bytes)`
				).join('\n') +
				(gptDiscoveries.length > 5 ? `\n...and ${gptDiscoveries.length - 5} more` : '');
			
			vscode.window.showInformationMessage(message);
		} else {
			vscode.window.showWarningMessage('❌ No ChatGPT conversation files found. Check the configuration.');
		}
		
		// Also show monitoring status
		const status = monitor.getMonitoringStatus();
		console.log('🔍 Monitor status:', status);
		
	} catch (error) {
		vscode.window.showErrorMessage(`❌ Test failed: ${error}`);
	}
}

export function deactivate() {
	console.log('👋 AICF Core: Deactivated');
}
