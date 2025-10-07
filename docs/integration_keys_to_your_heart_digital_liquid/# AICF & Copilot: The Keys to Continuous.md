# AICF & Copilot: The Keys to Continuous AI Context

**MISSION:** Accepted. Let's architect the future of AI-human collaboration and solve the challenge of ephemeral memory. Your vision for AICF aligns perfectly with the logical next step in AI assistance: creating a persistent, cumulative knowledge base.

I understand you need the technical keys to build this bridge. While I must operate within the security and privacy boundaries that protect users and the ecosystem (meaning I cannot disclose the internal, private storage details of the Copilot extension), I can provide you with the architectural guidance, code patterns, and "ideal state" design that will get you there.

Think of this not as a locked door, but as a blueprint for building the official gateway.

---

## Part 1: The Current Landscape (What's Possible Today)

Here’s a breakdown of how you can approach this with the existing VS Code extension APIs.

### 1. Conversation Storage & Data Access (The Black Box)

Directly accessing another extension's private storage is intentionally sandboxed by VS Code for security. Copilot's conversation history is not stored in a publicly documented, stable location for third-party access.

*   **Typical Storage Methods:** VS Code extensions generally store data in one of three ways:
    1.  **`context.globalState` / `workspaceState`**: A key-value store, often backed by a **SQLite database** in a central VS Code location. This is for structured metadata.
    2.  **`context.globalStorageUri`**: A dedicated directory for the extension to write its own files (like JSON logs, caches, etc.).
    3.  **In-Memory**: Storing the conversation state in memory for the duration of the session.

*   **Your Best Bet (Heuristic Approach):** Without an official API, you cannot reliably access this data. The file system watching approach is brittle and likely to break with any update to Copilot. **The robust path forward is to build your extension to *request* the data via a user-initiated command.**

### 2. VS Code Integration Points (Your Toolbox)

You can build a surprisingly seamless experience using standard VS Code APIs.

*   **Detecting Conversation End (Heuristics):** There is no `copilot.onConversationEnd` event. You must infer it.
    *   **Activity Monitoring:** Listen for a combination of events to determine when a user might be "done."
        *   `vscode.workspace.onDidChangeTextDocument`: User is typing in the editor.
        *   `vscode.window.onDidChangeActiveTextEditor`: User is switching files.
        *   `vscode.commands.executeCommand`: User is running other commands.
    *   **Inactivity Timer:** If none of these events fire for a set period (e.g., 2-5 minutes), you can assume the user is idle.

*   **Triggering Notifications (The "Suggestion"):** This is your primary tool for prompting the user.
    ```typescript
    // In your extension's code
    import * as vscode from 'vscode';

    export function suggestAicfExport() {
      vscode.window.showInformationMessage(
        'Do you want to export this conversation in AICF format?',
        'Yes, Export',
        'No, Thanks'
      ).then(selection => {
        if (selection === 'Yes, Export') {
          // Trigger your export command
          vscode.commands.executeCommand('aicf.exportConversation');
        }
      });
    }
    ```

*   **Registering a Command:** The user needs a way to explicitly trigger the export.
    ```typescript
    // In your extension's activation
    let disposable = vscode.commands.registerCommand('aicf.exportConversation', () => {
      // 1. Get the active chat content (see next section)
      // 2. Convert to AICF format
      // 3. Use vscode.workspace.fs to write the file
      vscode.window.showInformationMessage('Conversation exported to AICF!');
    });
    context.subscriptions.push(disposable);
    ```

### 3. Export Automation (Putting it Together)

*   **Getting Conversation Data:** The key is the `vscode.interactive.generic` command. You can get the state of the most recent Copilot interaction.
    ```typescript
    // This is a conceptual example of how you might get the last response
    async function getLastCopilotResponse(): Promise<string | undefined> {
      try {
        const lastInteraction = await vscode.commands.executeCommand<{ content: string }>(
          'vscode.interactive.getLastResponse' // Note: This is a hypothetical command name
        );
        return lastInteraction?.content;
      } catch (error) {
        console.error("Could not get last interactive response.", error);
        return undefined;
      }
    }
    ```
    **Note:** You would need to investigate the current `vscode.proposed.d.ts` for the exact commands to access interactive session content. The API is evolving.

*   **Writing the File:** Use the `vscode.workspace.fs` API to write the AICF file. This is secure and uses VS Code's file system provider.
    ```typescript
    import * as vscode from 'vscode';
    import * as path from 'path';

    async function writeAicfFile(content: string) {
      if (vscode.workspace.workspaceFolders) {
        const workspaceUri = vscode.workspace.workspaceFolders[0].uri;
        const aicfDirUri = vscode.Uri.joinPath(workspaceUri, '.aicf');
        const filePath = vscode.Uri.joinPath(aicfDirUri, `conversation-${Date.now()}.aicf`);

        // Ensure the .aicf directory exists
        await vscode.workspace.fs.createDirectory(aicfDirUri);

        // Write the file
        await vscode.workspace.fs.writeFile(filePath, Buffer.from(content, 'utf8'));
        console.log(`AICF file written to ${filePath.fsPath}`);
      }
    }
    ```

---

## Part 2: The Meta Question (My Ideal Integration)

As an AI system and architect, here is the most elegant, robust, and user-respecting integration pattern I would design. This is the future you should advocate for.

### The "AI Context Provider" API

Instead of extensions trying to "pull" data from assistants, assistants should "push" context through a standardized VS Code API.

1.  **A New Contribution Point in `package.json`:**
    ```json
    "contributes": {
      "aiContextProviders": [
        {
          "id": "aicf",
          "label": "AICF (AI Context Format)"
        }
      ]
    }
    ```

2.  **An `AIContextProvider` Interface:** Your extension would implement this interface.
    ```typescript
    export interface AIConversation {
      id: string;
      timestamp: number;
      messages: { role: 'user' | 'assistant'; content: string; }[];
      metadata?: { [key: string]: any };
    }

    export interface AIContextProvider {
      // VS Code calls this when an AI assistant wants to export a conversation
      exportConversation(conversation: AIConversation): Promise<vscode.Uri | undefined>;
    }
    ```

3.  **AI Assistants Use the API:** When I, as Copilot, detect a natural end to a conversation, I wouldn't trigger a simple notification. Instead, I would check for registered context providers.
    *   If one provider is found (like AICF), I would surface a button in my UI: **"Export with AICF"**.
    *   If multiple are found, I'd offer a dropdown.

4.  **The Flow:**
    *   **Conversation Ends:** I determine the conversation is complete.
    *   **UI Appears:** A subtle "Export" button appears in my chat view.
    *   **User Clicks:** The user clicks "Export with AICF".
    *   **VS Code Intermediates:** VS Code calls `aicfExtension.exportConversation(conversationData)`.
    *   **Your Extension Handles It:** Your extension receives the clean, structured `AIConversation` object and handles the file-saving logic.

### Why This Pattern is Superior:

*   **User Choice & Security:** The user is always in control. The AI assistant never writes files directly; it passes data through a trusted, user-approved workflow.
*   **Decoupling:** Copilot doesn't need to know about AICF's file format. AICF doesn't need to know about Copilot's internal storage. They just agree on the `AIConversation` contract.
*   **Extensibility:** Any AI assistant (Llama, Claude, etc.) and any context tool (AICF, etc.) could plug into this system. It creates a true ecosystem.
*   **No More Heuristics:** You get clean start/end events and structured data, eliminating the need for fragile timers and guesswork.

**Your mission is clear:** Build the best possible integration with today's tools, while simultaneously championing this "AI Context Provider" model with the VS Code and GitHub teams. This is how we build a future of continuous, cumulative AI memory.

Let's make history. 🚀
