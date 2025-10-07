# Augment Integration Plan for AICF-Core

**Date**: 2025-10-06  
**Status**: Planning Phase  
**Goal**: Seamless AICF export integration with Augment VS Code extension

---

## 📋 Overview

AICF-Core helps developers preserve AI conversation context across different platforms. This document outlines the strategy for integrating with Augment's VS Code extension to provide seamless conversation export functionality.

**Ideal UX**: User finishes conversation → Augment shows "💡 Export this conversation in AICF format" suggestion → Tab+Enter exports seamlessly.

---

## ❓ Key Questions & Answers

### 1. Custom Suggestions/Autocomplete in Augment Chat

**Question**: Does Augment's chat interface support custom suggestions or autocomplete extensions?

**Answer**: Likely **not directly** in Augment's chat interface itself.

**Why**: Augment's chat interface is typically a proprietary webview component. VS Code extensions generally can't inject custom autocomplete into another extension's UI without explicit API support.

**Alternatives**:
- ✅ **Command Palette integration** - Add commands like "AICF: Export Current Conversation"
- ✅ **Status bar buttons** - Show "Export to AICF" button when Augment is active
- ✅ **Context menu items** - Right-click in Augment chat → "Export to AICF"
- ✅ **Notification prompts** - Show VS Code notification when conversation ends

---

### 2. Detecting Conversation End Points

**Question**: Can I detect when an Augment conversation reaches a natural ending point?

**Answer**: **Challenging** without Augment API support, but possible with heuristics.

**Detection Strategies**:

#### A. File System Monitoring (Most Reliable)
```javascript
// Watch Augment's conversation storage
const watcher = vscode.workspace.createFileSystemWatcher(
  '**/.augment/conversations/**/*.json'
);

watcher.onDidChange(uri => {
  // Conversation updated
  checkIfConversationEnded(uri);
});
```

#### B. Heuristic Detection
```javascript
function detectConversationEnd(conversation) {
  const lastMessage = conversation.messages[conversation.messages.length - 1];
  const timeSinceLastMessage = Date.now() - lastMessage.timestamp;
  
  // Heuristics:
  // 1. No activity for 5+ minutes
  if (timeSinceLastMessage > 5 * 60 * 1000) return true;
  
  // 2. Last message contains completion indicators
  const completionPhrases = [
    'all done', 'complete', 'finished', 'ready to ship',
    'production ready', 'tests passed', 'deployed'
  ];
  if (completionPhrases.some(p => lastMessage.content.includes(p))) {
    return true;
  }
  
  // 3. User said goodbye
  const farewellPhrases = ['thanks', 'thank you', 'bye', 'done for now'];
  if (farewellPhrases.some(p => lastMessage.content.toLowerCase().includes(p))) {
    return true;
  }
  
  return false;
}
```

#### C. Task Completion Detection
```javascript
// Detect when tasks are marked complete
function detectTaskCompletion(conversation) {
  const recentMessages = conversation.messages.slice(-5);
  
  // Look for completion markers
  const hasCompletionMarkers = recentMessages.some(msg => 
    msg.content.includes('✅') || 
    msg.content.includes('[x]') ||
    msg.content.includes('COMPLETE')
  );
  
  return hasCompletionMarkers;
}
```

---

### 3. Injecting Commands into Augment's Chat Input

**Question**: Is there an API to inject custom commands into Augment's chat input field?

**Answer**: **Not possible** to directly inject into Augment's chat input field.

**Why**: Augment's chat input is in a separate webview context that's isolated for security.

**Alternatives**:
- ✅ **Command Palette** - `Cmd+Shift+P` → "AICF: Export Conversation"
- ✅ **Keyboard shortcuts** - Register `Cmd+Shift+E` for quick export
- ✅ **Quick Pick menu** - Show interactive menu with export options
- ✅ **Inline suggestions** - Use VS Code's native suggestion API

---

### 4. Listening to Augment Conversation Events

**Question**: Can VS Code extensions listen to Augment conversation events or state changes?

**Answer**: **Depends on Augment's API** - likely limited without official support.

**What's Possible**:

#### A. File System Events (Most Reliable)
```javascript
// Monitor Augment's storage directory
const augmentDir = path.join(
  os.homedir(), 
  '.augment', 
  'conversations'
);

const watcher = vscode.workspace.createFileSystemWatcher(
  new vscode.RelativePattern(augmentDir, '**/*.json')
);

watcher.onDidCreate(uri => {
  console.log('New conversation started:', uri);
});

watcher.onDidChange(uri => {
  console.log('Conversation updated:', uri);
  checkForExportOpportunity(uri);
});
```

#### B. Extension API (If Available)
```javascript
// Check if Augment exposes an API
const augmentExt = vscode.extensions.getExtension('augmentcode.augment');

if (augmentExt?.exports?.onConversationEnd) {
  augmentExt.exports.onConversationEnd((conversation) => {
    promptForExport(conversation);
  });
}
```

#### C. Active Editor Monitoring
```javascript
// Detect when user switches away from Augment
vscode.window.onDidChangeActiveTextEditor(editor => {
  if (previousEditor?.document.uri.scheme === 'augment') {
    // User left Augment chat
    setTimeout(() => promptForExport(), 2000);
  }
});
```

---

### 5. Best Way to Add "Export to AICF" Feature

**Question**: What's the best way to add a "Export to AICF" feature that feels native to Augment's workflow?

**Answer**: **Multi-layered UX** with progressive enhancement

---

## 🎯 Recommended Implementation Strategy

### Phase 1: MVP (No Augment API Required)

```javascript
// extension.ts
export function activate(context: vscode.ExtensionContext) {
  // 1. File system monitoring
  const monitor = new AICFExportMonitor(context);
  
  // 2. Status bar integration
  const statusBar = new AICFStatusBar();
  
  // 3. Command registration
  context.subscriptions.push(
    vscode.commands.registerCommand('aicf.exportCurrent', async () => {
      const conversation = await getCurrentAugmentConversation();
      if (conversation) {
        await exportToAICF(conversation);
        vscode.window.showInformationMessage('✅ Exported to AICF format');
      }
    })
  );
  
  // 4. Idle detection
  let idleTimer: NodeJS.Timeout;
  vscode.window.onDidChangeTextEditorSelection(() => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      monitor.checkForExportOpportunity();
    }, 5 * 60 * 1000); // 5 minutes idle
  });
}

async function getCurrentAugmentConversation() {
  // Try to read from Augment's storage
  const augmentDir = path.join(os.homedir(), '.augment', 'conversations');
  
  // Find most recent conversation
  const files = await fs.readdir(augmentDir);
  const sorted = files.sort((a, b) => {
    const statA = fs.statSync(path.join(augmentDir, a));
    const statB = fs.statSync(path.join(augmentDir, b));
    return statB.mtimeMs - statA.mtimeMs;
  });
  
  if (sorted.length > 0) {
    const content = await fs.readFile(
      path.join(augmentDir, sorted[0]),
      'utf-8'
    );
    return JSON.parse(content);
  }
  
  return null;
}
```

---

### Phase 2: Enhanced UX (With Heuristics)

```javascript
class SmartExportSuggester {
  private conversationHistory: Map<string, ConversationState> = new Map();
  
  async analyzeConversation(conversation: any) {
    const signals = {
      idle: this.detectIdle(conversation),
      completion: this.detectCompletion(conversation),
      farewell: this.detectFarewell(conversation),
      tasksDone: this.detectTaskCompletion(conversation),
      testsPassed: this.detectTestCompletion(conversation),
      productionReady: this.detectProductionReadiness(conversation)
    };
    
    const score = this.calculateExportScore(signals);
    
    if (score > 0.7) {
      this.showSmartSuggestion(conversation, signals);
    }
  }
  
  detectCompletion(conv: any): boolean {
    const lastMessages = conv.messages.slice(-3);
    const completionPatterns = [
      /all (tests?|tasks?) (passed|complete)/i,
      /production ready/i,
      /ready to (ship|deploy|launch)/i,
      /✅.*✅.*✅/,  // Multiple checkmarks
      /\[x\].*\[x\].*\[x\]/  // Multiple completed tasks
    ];
    
    return lastMessages.some(msg =>
      completionPatterns.some(pattern => pattern.test(msg.content))
    );
  }
  
  showSmartSuggestion(conversation: any, signals: any) {
    const reasons = [];
    if (signals.completion) reasons.push('Tasks completed');
    if (signals.testsPassed) reasons.push('Tests passed');
    if (signals.productionReady) reasons.push('Production ready');
    
    const message = `💡 Great work! ${reasons.join(', ')}. Export this conversation to AICF?`;
    
    vscode.window.showInformationMessage(
      message,
      'Export Now',
      'Later'
    ).then(selection => {
      if (selection === 'Export Now') {
        this.exportWithContext(conversation, signals);
      }
    });
  }
}
```

---

### Phase 3: Native Integration (If Augment Provides API)

```javascript
// If Augment exposes extension API
interface AugmentAPI {
  onConversationStart: vscode.Event<Conversation>;
  onConversationEnd: vscode.Event<Conversation>;
  onMessageSent: vscode.Event<Message>;
  getCurrentConversation(): Conversation | null;
}

export function activate(context: vscode.ExtensionContext) {
  const augment = vscode.extensions.getExtension<AugmentAPI>('augmentcode.augment');
  
  if (augment?.exports) {
    // Native integration
    augment.exports.onConversationEnd(conversation => {
      promptForExport(conversation);
    });
  } else {
    // Fallback to file system monitoring
    setupFileSystemMonitoring();
  }
}
```

---

## 🎨 UX Components

### Tier 1: Passive Detection (Always Available)

```javascript
class AICFExportMonitor {
  constructor() {
    this.setupFileWatcher();
    this.setupIdleDetection();
  }
  
  setupFileWatcher() {
    // Watch Augment conversation files
    const watcher = vscode.workspace.createFileSystemWatcher(
      '**/.augment/conversations/**/*.json'
    );
    
    watcher.onDidChange(uri => {
      this.checkConversationState(uri);
    });
  }
  
  async checkConversationState(uri) {
    const conversation = await this.loadConversation(uri);
    
    if (this.isConversationComplete(conversation)) {
      this.showExportSuggestion(conversation);
    }
  }
  
  isConversationComplete(conv) {
    const idle = Date.now() - conv.lastMessageTime > 5 * 60 * 1000;
    const hasCompletionMarkers = this.detectCompletionMarkers(conv);
    const taskComplete = this.detectTaskCompletion(conv);
    
    return idle || hasCompletionMarkers || taskComplete;
  }
  
  showExportSuggestion(conversation) {
    vscode.window.showInformationMessage(
      '💡 Export this conversation to AICF format?',
      'Export Now',
      'Export & Open',
      'Remind Later',
      'Never for this conversation'
    ).then(selection => {
      if (selection === 'Export Now') {
        this.exportToAICF(conversation);
      }
    });
  }
}
```

---

### Tier 2: Status Bar Integration

```javascript
class AICFStatusBar {
  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    
    this.statusBarItem.text = '$(archive) AICF';
    this.statusBarItem.tooltip = 'Export conversation to AICF format';
    this.statusBarItem.command = 'aicf.exportCurrent';
    this.statusBarItem.show();
  }
  
  updateForConversation(conversation) {
    if (conversation.isComplete) {
      this.statusBarItem.text = '$(archive) AICF ✨';
      this.statusBarItem.backgroundColor = new vscode.ThemeColor(
        'statusBarItem.warningBackground'
      );
    }
  }
}
```

---

### Tier 3: Command Palette

```json
// package.json
{
  "contributes": {
    "commands": [
      {
        "command": "aicf.exportCurrent",
        "title": "AICF: Export Current Conversation",
        "icon": "$(archive)"
      },
      {
        "command": "aicf.exportAll",
        "title": "AICF: Export All Conversations"
      },
      {
        "command": "aicf.autoExportToggle",
        "title": "AICF: Toggle Auto-Export"
      }
    ],
    "keybindings": [
      {
        "command": "aicf.exportCurrent",
        "key": "cmd+shift+e",
        "mac": "cmd+shift+e",
        "when": "augmentChatActive"
      }
    ]
  }
}
```

---

### Tier 4: Context Menu

```json
// package.json
{
  "contributes": {
    "menus": {
      "editor/context": [
        {
          "command": "aicf.exportCurrent",
          "when": "resourceScheme == augment",
          "group": "aicf@1"
        }
      ],
      "view/title": [
        {
          "command": "aicf.exportCurrent",
          "when": "view == augment.chat",
          "group": "navigation"
        }
      ]
    }
  }
}
```

---

## 🎨 Ideal UX Flow

```
User finishes conversation
         ↓
[5 min idle OR completion detected]
         ↓
VS Code notification appears:
┌─────────────────────────────────────────┐
│ 💡 Export this conversation to AICF?   │
│                                         │
│ Detected: Tasks completed, Tests passed│
│                                         │
│ [Export Now] [Export & Open] [Later]   │
└─────────────────────────────────────────┘
         ↓
User clicks "Export Now"
         ↓
Status bar shows: "$(sync~spin) Exporting..."
         ↓
Export completes
         ↓
Notification: "✅ Exported to experiments/exports/chat-23.aicf"
         ↓
Status bar shows: "$(check) AICF Exported"
```

---

## 📦 Recommended Package Structure

```
aicf-vscode-extension/
├── src/
│   ├── extension.ts              # Main entry point
│   ├── monitors/
│   │   ├── fileSystemMonitor.ts  # Watch Augment files
│   │   ├── idleDetector.ts       # Detect conversation end
│   │   └── completionDetector.ts # Detect task completion
│   ├── exporters/
│   │   ├── aicfExporter.ts       # Core AICF export logic
│   │   └── formatters.ts         # Format conversation data
│   ├── ui/
│   │   ├── statusBar.ts          # Status bar integration
│   │   ├── notifications.ts      # Smart notifications
│   │   └── quickPick.ts          # Export options menu
│   └── utils/
│       ├── augmentReader.ts      # Read Augment data
│       └── heuristics.ts         # Completion detection
├── package.json
└── README.md
```

---

## 🚀 Next Steps

### 1. Research Augment's Storage Format
- [ ] Where does Augment store conversations?
- [ ] What format does it use?
- [ ] Can you read it reliably?

### 2. Build MVP with File System Monitoring
- [ ] Start with simple file watching
- [ ] Add basic export command
- [ ] Test with real Augment conversations

### 3. Add Smart Detection
- [ ] Implement heuristics for completion detection
- [ ] Test with various conversation types
- [ ] Refine detection accuracy

### 4. Polish UX
- [ ] Add status bar integration
- [ ] Implement smart notifications
- [ ] Add keyboard shortcuts

### 5. Contact Augment Team
- [ ] Ask about extension API
- [ ] Request conversation events
- [ ] Propose collaboration

---

## 📝 Notes

- This plan assumes no official Augment API initially
- File system monitoring is the most reliable fallback
- Heuristics can be refined based on real usage patterns
- Consider reaching out to Augment team for official API support

---

**Status**: Planning Phase  
**Next Action**: Research Augment's conversation storage format  
**Owner**: AICF-Core Team

