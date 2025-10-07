# VS Code AI Chat Integration Considerations

## Overview

The Visual Studio Code extension host deliberately sandboxes extensions to prevent cross-extension interference. Copilot Chat, Claude for VS Code, GitHub Copilot, and similar AI chat clients implement their own chat UIs on top of internal (often proposed or private) APIs. As of VS Code 1.88 and the 2024 extension API surface, there is no stable, shared contract for observing or augmenting another extension’s chat session. The notes below assume the current public API (`vscode` npm package) and the latest proposed APIs published in the [`vscode.proposed.d.ts`](https://github.com/microsoft/vscode/blob/main/src/vs/vscode.proposed.d.ts) file.

## Question-by-question guidance

1. **Detecting conversation state changes**  
   - Public API: No events are exposed for foreign chat sessions. Chat history, turn boundaries, response completion, or idle detection remain internal to each AI extension.  
   - Proposed API: The draft `chat` API only delivers state events to the provider that registered the session (i.e., your own chat participant).

2. **Injecting suggestions into existing chat input fields**  
   - Not supported across extensions. Input boxes are owned by the extension that rendered the chat view (webview or custom view). VS Code does not allow another extension to programmatically modify that DOM.  
   - You can only surface suggestions inside your own contribution (e.g., Quick Pick, `showInformationMessage`, custom webview, or a chat participant you own).

3. **Standard API for AI chat integration**  
   - There is no general, stable API for manipulating third-party chat UIs.  
   - The only standardized surface is the **Chat Participant** API (proposed as `vscode.chat.createChatParticipant`). It lets you register a first-party chat entry point under the `Chat` view but does not let you hook into existing participants like Copilot or Claude. Production extensions must ship with the stable API; proposed APIs require users to enable `"enableProposedApi"` and therefore are unsuitable for marketplace distribution.

4. **Listening for events like `ai_response_complete` or `user_inactive`**  
   - No cross-extension events exist. Individual vendors may emit telemetry or expose commands (e.g., `github.copilot.openPanel`), but these are undocumented and subject to change.  
   - The extension host does not offer a global lifecycle event for “AI response finished” or user inactivity inside another extension’s webview.

5. **Pattern for context-aware chat suggestions**  
   - Recommended approach is to build your own chat participant using the proposed API or create a dedicated view/webview that mirrors chat context. Within your own surface you can:  
     - Track request/response completion (the API provides session hooks).  
     - Present accept/deny UX (e.g., quick pick, buttons) for “Export conversation in AICF format”.  
   - For marketplace-safe distribution today, fall back to VS Code primitives: status bar entries, code actions, notification prompts, or a `TreeView` that surfaces recent chat artifacts your extension controls.

## Implementation guidance for AICF export

- **Capture context explicitly**: Provide commands such as `AICF: Export Latest Conversation` that operate on transcripts you own (your chat participant or logs you assemble with the user’s consent).  
- **Surface suggestions non-intrusively**: Use `vscode.window.showInformationMessage` with `doNotAskAgain` quick picks, or a status bar item that becomes visible when your heuristic detects a lull in activity (e.g., no edits for N minutes) rather than interacting with other extensions’ UIs.  
- **Guardrails**: Clearly communicate that you cannot access proprietary chat histories unless the user copies them into your extension or the upstream vendor exposes an official API.

## Practical next steps

1. Implement an opt-in “AICF Chat” participant using the proposed `vscode.chat.createChatParticipant` API for insiders/testing channels.  
2. Ship a stable extension that relies on VS Code core primitives (commands, status bar, notifications) while waiting for Microsoft to stabilize the chat API.  
3. Engage with vendor-specific APIs only when they publish documented hooks (e.g., GitHub Copilot’s forthcoming extension API discussions); isolate adapters per provider to handle drift.  
4. Track the VS Code issue tracker (`vscode` repo) for stabilization of the chat APIs and advocate for cross-participant events that would unlock universal export prompts.
