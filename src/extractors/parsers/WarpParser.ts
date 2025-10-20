import fs from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

interface ExtractOptions {
  maxConversations?: number;
  timeframe?: string;
}

interface StatusResult {
  available: boolean;
  message: string;
  searchedPaths?: string[];
  dbPath?: string;
  lastModified?: string;
  ageHours?: number;
  size?: string;
}

interface ConversationMessage {
  id: string;
  role: string;
  content: string;
  timestamp: number;
}

interface Conversation {
  id: string;
  messages: ConversationMessage[];
  metadata: {
    source: string;
    extractedAt: string;
    messageCount: number;
    firstMessage: string;
    lastMessage: string;
  };
}

/**
 * Warp Terminal Parser
 * Extracts conversations from Warp's SQLite database
 * Adapted from Dennis's existing extract-warp-conversation.js
 */
export class WarpParser {
  private readonly source: string;
  private readonly possibleDbPaths: string[];
  private readonly dbPath: string | null;

  constructor() {
    this.source = "warp";

    this.possibleDbPaths = [
      join(
        homedir(),
        "Library/Group Containers/2BBY89MBSN.dev.warp/Library/Application Support/dev.warp.Warp-Stable/warp.sqlite"
      ),
      join(
        homedir(),
        "Library/Group Containers/2BBY89MBSN.dev.warp/Library/Application Support/dev.warp.Warp/warp.sqlite"
      ),
      join(
        homedir(),
        "Library/Application Support/dev.warp.Warp-Stable/warp.sqlite"
      ),
    ];

    this.dbPath = this.findWarpDatabase();
  }

  /**
   * Find the Warp database file
   */
  private findWarpDatabase(): string | null {
    for (const dbPath of this.possibleDbPaths) {
      if (fs.existsSync(dbPath)) {
        console.log(`🔍 Found Warp database: ${dbPath}`);
        return dbPath;
      }
    }
    return null;
  }

  /**
   * Check if Warp is available on this system
   */
  isAvailable(): boolean {
    return this.dbPath !== null && fs.existsSync(this.dbPath);
  }

  /**
   * Get current status of Warp
   */
  getStatus(): StatusResult {
    if (!this.isAvailable()) {
      return {
        available: false,
        message: "Warp database not found",
        searchedPaths: this.possibleDbPaths,
      };
    }

    try {
      if (!this.dbPath) {
        return {
          available: false,
          message: "Warp database path is null",
        };
      }

      const stats = fs.statSync(this.dbPath);
      const ageHours = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60);

      return {
        available: true,
        dbPath: this.dbPath,
        lastModified: stats.mtime.toISOString(),
        ageHours: Math.round(ageHours * 10) / 10,
        size: this.formatFileSize(stats.size),
        message: `Warp database found and accessible (${ageHours < 24 ? "recently active" : "older activity"})`,
      };
    } catch (error: unknown) {
      const err = error as Error;
      return {
        available: false,
        message: `Warp database found but not accessible: ${err.message}`,
      };
    }
  }

  /**
   * Extract conversations from Warp SQLite database
   */
  async extractConversations(
    options: ExtractOptions = {}
  ): Promise<Conversation[]> {
    if (!this.isAvailable() || !this.dbPath) {
      throw new Error("Warp database not available");
    }

    const extractOptions = {
      maxConversations: 10,
      timeframe: "7d",
      ...options,
    };

    console.log(`🔍 Extracting conversations from Warp database...`);

    try {
      const { default: Database } = await import("better-sqlite3");
      const db = new Database(this.dbPath, { readonly: true });

      const conversationIds = await this.getRecentConversationIds(
        db,
        extractOptions
      );

      console.log(`📊 Found ${conversationIds.length} recent conversations`);

      const conversations: Conversation[] = [];

      for (const convId of conversationIds) {
        const messages = await this.getConversationMessages(db, convId);

        if (messages.length > 0) {
          const firstMsg = messages[0];
          const lastMsg = messages[messages.length - 1];

          if (firstMsg && lastMsg) {
            conversations.push({
              id: convId,
              messages,
              metadata: {
                source: this.source,
                extractedAt: new Date().toISOString(),
                messageCount: messages.length,
                firstMessage: new Date(firstMsg.timestamp).toISOString(),
                lastMessage: new Date(lastMsg.timestamp).toISOString(),
              },
            });
          }
        }
      }

      db.close();

      console.log(`✅ Extracted ${conversations.length} conversations`);
      return conversations;
    } catch (error: unknown) {
      const err = error as Error;
      throw new Error(`Failed to extract Warp conversations: ${err.message}`);
    }
  }

  /**
   * Get recent conversation IDs
   */
  private async getRecentConversationIds(
    db: any,
    options: ExtractOptions
  ): Promise<string[]> {
    const timeframeDays = this.parseTimeframe(options.timeframe ?? "7d");
    const cutoffTimestamp = Date.now() - timeframeDays * 24 * 60 * 60 * 1000;

    const query = `
      SELECT DISTINCT c.id
      FROM conversations c
      LEFT JOIN messages m ON c.id = m.conversation_id
      WHERE m.created_at > ?
      GROUP BY c.id
      ORDER BY MAX(m.created_at) DESC
      LIMIT ?
    `;

    const rows = db
      .prepare(query)
      .all(cutoffTimestamp, options.maxConversations ?? 10);

    return rows.map((row: { id: string }) => row.id);
  }

  /**
   * Get messages for a conversation
   */
  private async getConversationMessages(
    db: any,
    conversationId: string
  ): Promise<ConversationMessage[]> {
    const query = `
      SELECT id, role, content, created_at as timestamp
      FROM messages
      WHERE conversation_id = ?
      ORDER BY created_at ASC
    `;

    const rows = db.prepare(query).all(conversationId);

    return rows.map((row: ConversationMessage) => ({
      id: row.id,
      role: row.role,
      content: row.content,
      timestamp: row.timestamp,
    }));
  }

  /**
   * Parse timeframe string (e.g., "7d", "24h")
   */
  private parseTimeframe(timeframe: string): number {
    const match = timeframe.match(/^(\d+)([dhm])$/);

    if (!match || !match[1] || !match[2]) {
      return 7;
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case "d":
        return value;
      case "h":
        return value / 24;
      case "m":
        return value / (24 * 60);
      default:
        return 7;
    }
  }

  /**
   * Format file size
   */
  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024)
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  /**
   * Convert conversation to AICF format
   */
  convertToAICF(conversation: Conversation): string {
    const lines: string[] = [];

    lines.push("@METADATA");
    lines.push(`source=${conversation.metadata.source}`);
    lines.push(`conversation_id=${conversation.id}`);
    lines.push(`message_count=${conversation.metadata.messageCount}`);
    lines.push(`extracted_at=${conversation.metadata.extractedAt}`);
    lines.push(`first_message=${conversation.metadata.firstMessage}`);
    lines.push(`last_message=${conversation.metadata.lastMessage}`);
    lines.push("");

    lines.push("@CONVERSATION");
    conversation.messages.forEach((msg, index) => {
      const timestamp = new Date(msg.timestamp).toISOString();
      lines.push(`C${index + 1}|${timestamp}|${msg.role}|${msg.content}`);
    });
    lines.push("");

    return lines.join("\n");
  }
}
