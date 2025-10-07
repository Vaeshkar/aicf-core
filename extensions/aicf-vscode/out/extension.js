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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const ConversationDetector_1 = require("./detectors/ConversationDetector");
const AICFExporter_1 = require("./exporters/AICFExporter");
const AIActivityMonitor_1 = require("./monitors/AIActivityMonitor");
function activate(context) {
    console.log('🚀 AICF Core: Activating continuous AI context memory...');
    // Initialize core components
    const detector = new ConversationDetector_1.ConversationDetector();
    const exporter = new AICFExporter_1.AICFExporter();
    const monitor = new AIActivityMonitor_1.AIActivityMonitor();
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
    if (config.get('autoDetect', true)) {
        monitor.start();
        console.log('🔍 AICF: Auto-detection enabled');
    }
    // Add all subscriptions
    context.subscriptions.push(...commands, statusBar, monitor);
    vscode.window.showInformationMessage('🎯 AICF Core activated! Ready for continuous AI context memory.');
}
function createStatusBar() {
    const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBar.text = '$(archive) AICF';
    statusBar.tooltip = 'Export AI conversation to AICF format';
    statusBar.command = 'aicf.exportCurrent';
    statusBar.show();
    return statusBar;
}
async function exportCurrentConversation(exporter) {
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
                const action = await vscode.window.showInformationMessage(`✅ Conversation exported to ${result.filename}`, 'Open File', 'Open Folder');
                if (action === 'Open File' && result.uri) {
                    await vscode.window.showTextDocument(result.uri);
                }
                else if (action === 'Open Folder' && result.directory) {
                    await vscode.commands.executeCommand('vscode.openFolder', result.directory);
                }
            }
        });
    }
    catch (error) {
        vscode.window.showErrorMessage(`Failed to export conversation: ${error}`);
    }
}
async function exportAllConversations(exporter) {
    const action = await vscode.window.showWarningMessage('Export all recent AI conversations? This may take a moment.', 'Export All', 'Cancel');
    if (action === 'Export All') {
        // Implementation for bulk export
        vscode.window.showInformationMessage('🔄 Bulk export not yet implemented');
    }
}
async function discoverConversations(detector) {
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
        }
        else {
            vscode.window.showInformationMessage('No AI conversations found');
        }
    });
}
async function handleConversationActivity(activity, exporter, statusBar) {
    // Update status bar to show activity
    statusBar.text = '$(sync~spin) AICF';
    statusBar.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    // Reset after a moment
    setTimeout(() => {
        statusBar.text = '$(archive) AICF';
        statusBar.backgroundColor = undefined;
    }, 2000);
}
async function suggestExport(activity, exporter) {
    const config = vscode.workspace.getConfiguration('aicf');
    const notificationLevel = config.get('notificationLevel', 'important');
    if (notificationLevel === 'none')
        return;
    const autoExport = config.get('autoExport', false);
    if (autoExport) {
        // Auto-export without asking
        await exporter.exportConversation({
            source: 'auto',
            platform: activity.platform,
            timestamp: new Date()
        });
        vscode.window.showInformationMessage('📦 AI conversation auto-exported to AICF');
    }
    else {
        // Ask user
        const action = await vscode.window.showInformationMessage(`💡 ${activity.platform} conversation detected. Export to AICF?`, 'Export Now', 'Export & Open', 'Later', 'Settings');
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
async function testGPTDetection(monitor) {
    try {
        vscode.window.showInformationMessage('🔍 Testing ChatGPT detection...');
        const discoveries = await monitor.triggerDiscovery();
        const gptDiscoveries = discoveries.filter(d => d.platform === 'chatgpt');
        if (gptDiscoveries.length > 0) {
            const message = `✅ Found ${gptDiscoveries.length} ChatGPT conversation files!\n\n` +
                gptDiscoveries.slice(0, 5).map(d => `• ${path.basename(d.path)} (${(d.metadata?.size || 0)} bytes)`).join('\n') +
                (gptDiscoveries.length > 5 ? `\n...and ${gptDiscoveries.length - 5} more` : '');
            vscode.window.showInformationMessage(message);
        }
        else {
            vscode.window.showWarningMessage('❌ No ChatGPT conversation files found. Check the configuration.');
        }
        // Also show monitoring status
        const status = monitor.getMonitoringStatus();
        console.log('🔍 Monitor status:', status);
    }
    catch (error) {
        vscode.window.showErrorMessage(`❌ Test failed: ${error}`);
    }
}
function deactivate() {
    console.log('👋 AICF Core: Deactivated');
}
//# sourceMappingURL=extension.js.map