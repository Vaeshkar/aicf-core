import fs from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

interface UpdaterOptions {
  verbose?: boolean;
}

interface UpdateResults {
  updated: string[];
  skipped: string[];
  errors: string[];
}

interface ConversationData {
  id: string;
  messages: MessageData[];
  metadata: Record<string, any>;
}

interface MessageData {
  id: string;
  role: string;
  content: string;
  timestamp: number;
}

/**
 * Markdown Updater Agent
 * Reads directly from AI terminal SQLite database and updates .ai/ markdown files
 * Extracts full conversation data for human-readable documentation
 */
export class MarkdownUpdater {
  private readonly verbose: boolean;
  private readonly aiDir: string;
  private readonly terminalDbPath: string;
  private readonly processedFile: string;

  constructor(options: UpdaterOptions = {}) {
    this.verbose = options.verbose ?? false;
    this.aiDir = ".ai";
    this.terminalDbPath = join(
      homedir(),
      "Library/Group Containers/2BBY89MBSN.dev.warp/Library/Application Support/dev.warp.Warp-Stable/warp.sqlite"
    );
    this.processedFile = ".terminal-processed-conversations.json";
  }

  /**
   * Update all .md files based on Warp SQLite database
   */
  async updateAllMarkdownFiles(): Promise<UpdateResults> {
    console.log(
      "🔄 Updating .ai/ markdown files from terminal SQLite database..."
    );

    const results: UpdateResults = {
      updated: [],
      skipped: [],
      errors: [],
    };

    try {
      const processedConversations = this.getProcessedConversations();

      if (processedConversations.length === 0) {
        console.log(
          "⚠️ No processed conversations found. Run warp-auto-processor first."
        );
        return results;
      }

      const conversationsData = await this.getConversationsFromSQLite(
        processedConversations
      );

      const filesToUpdate = [
        "conversation-log.md",
        "technical-decisions.md",
        "next-steps.md",
        "known-issues.md",
      ];

      for (const mdFile of filesToUpdate) {
        try {
          await this.updateMarkdownFileFromSQLite(mdFile, conversationsData);
          results.updated.push(mdFile);
        } catch (error: unknown) {
          const err = error as Error;
          console.error(`❌ Error updating ${mdFile}:`, err.message);
          results.errors.push(`${mdFile}: ${err.message}`);
        }
      }
    } catch (error: unknown) {
      const err = error as Error;
      console.error("❌ Error accessing Warp database:", err.message);
      results.errors.push(`Database access: ${err.message}`);
    }

    console.log(`\n📊 Markdown update summary:`);
    console.log(`   ✅ Updated: ${results.updated.length} files`);
    console.log(`   ⏭️  Skipped: ${results.skipped.length} files`);
    console.log(`   ❌ Errors: ${results.errors.length} files`);

    if (results.updated.length > 0) {
      console.log(`\n📝 Updated files:`);
      results.updated.forEach((file) => console.log(`   - .ai/${file}`));
    }

    return results;
  }

  /**
   * Get processed conversations from tracking file
   */
  private getProcessedConversations(): string[] {
    try {
      if (fs.existsSync(this.processedFile)) {
        const content = fs.readFileSync(this.processedFile, "utf-8");
        return JSON.parse(content);
      }
    } catch {
      console.log("⚠️ Could not load processed conversations list");
    }
    return [];
  }

  /**
   * Get full conversation data from Warp SQLite database
   */
  private async getConversationsFromSQLite(
    conversationIds: string[]
  ): Promise<ConversationData[]> {
    const { default: Database } = await import("better-sqlite3");
    const db = new Database(this.terminalDbPath, { readonly: true });

    const conversations: ConversationData[] = [];

    for (const convId of conversationIds) {
      try {
        const messages = db
          .prepare(
            `
          SELECT id, role, content, created_at as timestamp
          FROM messages
          WHERE conversation_id = ?
          ORDER BY created_at ASC
        `
          )
          .all(convId) as MessageData[];

        if (messages.length > 0) {
          const firstMsg = messages[0];
          const lastMsg = messages[messages.length - 1];

          if (firstMsg && lastMsg) {
            conversations.push({
              id: convId,
              messages,
              metadata: {
                messageCount: messages.length,
                firstMessage: new Date(firstMsg.timestamp).toISOString(),
                lastMessage: new Date(lastMsg.timestamp).toISOString(),
              },
            });
          }
        }
      } catch (error: unknown) {
        const err = error as Error;
        console.error(`⚠️ Error loading conversation ${convId}:`, err.message);
      }
    }

    db.close();
    return conversations;
  }

  /**
   * Update markdown file from SQLite data
   */
  private async updateMarkdownFileFromSQLite(
    filename: string,
    conversationsData: ConversationData[]
  ): Promise<void> {
    const filePath = join(this.aiDir, filename);

    if (!fs.existsSync(this.aiDir)) {
      fs.mkdirSync(this.aiDir, { recursive: true });
    }

    let content = "";

    switch (filename) {
      case "conversation-log.md":
        content = this.generateConversationLog(conversationsData);
        break;
      case "technical-decisions.md":
        content = this.generateTechnicalDecisions(conversationsData);
        break;
      case "next-steps.md":
        content = this.generateNextSteps(conversationsData);
        break;
      case "known-issues.md":
        content = this.generateKnownIssues(conversationsData);
        break;
      default:
        throw new Error(`Unknown markdown file: ${filename}`);
    }

    fs.writeFileSync(filePath, content);

    if (this.verbose) {
      console.log(`✅ Updated ${filePath}`);
    }
  }

  /**
   * Generate conversation log
   */
  private generateConversationLog(conversations: ConversationData[]): string {
    const lines: string[] = [];

    lines.push("# Conversation Log");
    lines.push("");
    lines.push("Recent conversations from terminal.");
    lines.push("");

    conversations.forEach((conv) => {
      lines.push(`## Conversation ${conv.id}`);
      lines.push("");
      lines.push(`- Messages: ${conv.metadata["messageCount"]}`);
      lines.push(`- First: ${conv.metadata["firstMessage"]}`);
      lines.push(`- Last: ${conv.metadata["lastMessage"]}`);
      lines.push("");

      conv.messages.slice(0, 5).forEach((msg) => {
        const timestamp = new Date(msg.timestamp).toISOString();
        lines.push(`### ${msg.role} (${timestamp})`);
        lines.push("");
        lines.push(msg.content.substring(0, 200));
        lines.push("");
      });
    });

    return lines.join("\n");
  }

  /**
   * Generate technical decisions
   */
  private generateTechnicalDecisions(
    conversations: ConversationData[]
  ): string {
    const lines: string[] = [];

    lines.push("# Technical Decisions");
    lines.push("");
    lines.push("Key technical decisions from conversations.");
    lines.push("");

    conversations.forEach((conv) => {
      const decisions = conv.messages.filter(
        (msg) =>
          msg.content.toLowerCase().includes("decision") ||
          msg.content.toLowerCase().includes("decided")
      );

      if (decisions.length > 0) {
        lines.push(`## From Conversation ${conv.id}`);
        lines.push("");

        decisions.forEach((msg) => {
          lines.push(`- ${msg.content.substring(0, 150)}...`);
        });

        lines.push("");
      }
    });

    return lines.join("\n");
  }

  /**
   * Generate next steps
   */
  private generateNextSteps(conversations: ConversationData[]): string {
    const lines: string[] = [];

    lines.push("# Next Steps");
    lines.push("");
    lines.push("Action items from conversations.");
    lines.push("");

    conversations.forEach((conv) => {
      const lastMessage = conv.messages[conv.messages.length - 1];

      if (lastMessage) {
        lines.push(`## From Conversation ${conv.id}`);
        lines.push("");
        lines.push(lastMessage.content.substring(0, 200));
        lines.push("");
      }
    });

    return lines.join("\n");
  }

  /**
   * Generate known issues
   */
  private generateKnownIssues(conversations: ConversationData[]): string {
    const lines: string[] = [];

    lines.push("# Known Issues");
    lines.push("");
    lines.push("Issues identified in conversations.");
    lines.push("");

    conversations.forEach((conv) => {
      const issues = conv.messages.filter(
        (msg) =>
          msg.content.toLowerCase().includes("issue") ||
          msg.content.toLowerCase().includes("error") ||
          msg.content.toLowerCase().includes("bug")
      );

      if (issues.length > 0) {
        lines.push(`## From Conversation ${conv.id}`);
        lines.push("");

        issues.forEach((msg) => {
          lines.push(`- ${msg.content.substring(0, 150)}...`);
        });

        lines.push("");
      }
    });

    return lines.join("\n");
  }
}
