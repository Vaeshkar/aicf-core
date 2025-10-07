# AICF Core - AI Context Memory Extension

Preserve AI conversation context across platforms with continuous memory.

## Features

🎯 **Multi-Platform AI Monitoring**: Automatically detect conversations from:
- Claude Desktop & Claude via Augment
- GitHub Copilot 
- Augment AI
- **ChatGPT Desktop** (encrypted files - activity detection only)
- Warp AI (Claude in terminal)

📦 **AICF Format Export**: Convert conversations to standardized AICF format for cross-platform context preservation

🔍 **Real-time Activity Detection**: Monitor file system changes to detect active AI conversations

⚡ **Smart Export Suggestions**: Get notified when conversations end with export prompts

## Installation

### Development Setup

1. Clone and navigate to the extension directory:
   ```bash
   cd /Users/leeuwen/Programming/aicf-core/extensions/aicf-vscode
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Compile TypeScript:
   ```bash
   npm run compile
   ```

4. Open in VS Code and press **F5** to launch Extension Development Host

### Commands

Access these commands via **Cmd+Shift+P** (Command Palette):

- `AICF: Export Current AI Conversation` - Export conversation text to AICF format
- `AICF: Discover AI Conversations` - Scan for existing conversation files
- `AICF: Test ChatGPT Detection` - Verify ChatGPT conversation detection
- `AICF: Open Settings` - Configure AICF preferences

### Keyboard Shortcuts

- **Cmd+Shift+E** (Mac) - Quick export current conversation

## Configuration

Configure the extension via VS Code Settings (`aicf.*`):

```json
{
  "aicf.autoDetect": true,
  "aicf.autoExport": false,
  "aicf.idleTimeout": 300,
  "aicf.exportPath": ".aicf/conversations",
  "aicf.notificationLevel": "important",
  "aicf.platformsToMonitor": ["claude", "copilot", "augment", "chatgpt"]
}
```

## How It Works

### For Accessible Platforms (Claude, Copilot, Augment)
- **File System Monitoring**: Watches known storage locations for conversation files
- **Automatic Detection**: Identifies conversation files using heuristics
- **Direct Export**: Can read and convert conversation content to AICF format

### For Encrypted Platforms (ChatGPT)
- **Activity Detection**: Monitors file changes in encrypted conversation directories
- **User-Initiated Export**: Prompts user to copy/paste conversation text for export
- **Privacy Respect**: Cannot read encrypted content, relies on user consent

### AICF Format

Conversations are exported in standardized AICF JSON format:

```json
{
  "version": "1.0",
  "metadata": {
    "title": "Conversation Title",
    "created": "2024-01-01T10:00:00.000Z",
    "modified": "2024-01-01T10:30:00.000Z",
    "source": "manual",
    "platform": "chatgpt",
    "participants": [
      {"role": "user", "name": "User"},
      {"role": "assistant", "name": "ChatGPT"}
    ]
  },
  "messages": [
    {
      "role": "user",
      "content": "Help me debug...",
      "timestamp": "2024-01-01T10:00:00.000Z"
    },
    {
      "role": "assistant", 
      "content": "I can help with that...",
      "timestamp": "2024-01-01T10:01:00.000Z"
    }
  ]
}
```

## Testing ChatGPT Detection

1. Open Command Palette (**Cmd+Shift+P**)
2. Run `AICF: Test ChatGPT Detection`
3. Should detect your encrypted conversation files: `${gptFilesCount} files found`

## Usage Scenarios

### Manual Export (Recommended for ChatGPT)
1. Have a conversation in any AI platform
2. Copy the conversation text
3. Run `AICF: Export Current AI Conversation`
4. Paste the conversation text when prompted
5. AICF file is created in your configured export directory

### Automatic Detection (Claude, Copilot, Augment)
1. Extension automatically detects conversation activity
2. After idle timeout, suggests export via notification
3. Click "Export Now" to save conversation in AICF format

### Batch Discovery
1. Run `AICF: Discover AI Conversations`
2. View all detected conversation files across platforms
3. Select conversations to export in batch

## Technical Architecture

Based on insights from cooperative AIs (Claude, Copilot, Augment), the extension:

- **Respects Sandboxing**: Uses VS Code's file system APIs and notifications
- **Privacy-First**: Cannot access encrypted data without user consent
- **Platform Agnostic**: Works across different AI chat interfaces
- **Future-Ready**: Designed to integrate with upcoming AI platform APIs

## Known ChatGPT Specifics

ChatGPT Desktop stores conversations as encrypted `.data` files in:
```
~/Library/Application Support/com.openai.chat/conversations-v3-{user-id}/
```

The extension:
- ✅ **Can** detect file changes (new conversations, updates)
- ✅ **Can** estimate conversation activity based on file sizes/timestamps  
- ❌ **Cannot** read encrypted conversation content
- ✅ **Can** prompt user to export manually via copy/paste

This approach respects ChatGPT's security model while still providing context preservation.

## Status Bar

Look for the **📦 AICF** icon in the status bar:
- **📦 AICF** - Ready to export
- **🔄 AICF** - Activity detected (orange background)

Click the status bar icon for quick export.

## Development & Debug

- Check **Developer Console** for detailed logs (`🔍`, `✅`, `❌` prefixed)
- Monitor file system events in real-time
- Test platform detection and export workflows
- Verify AICF format compliance

## Future Enhancements

- Integration with official AI platform APIs as they become available
- Enhanced conversation parsing for more platforms
- Cross-device context sync via cloud storage
- Conversation search and management UI
- Integration with external AICF-compatible tools

---

Built with insights from cooperative AIs. Respects privacy and security while enabling continuous AI context memory across platforms.