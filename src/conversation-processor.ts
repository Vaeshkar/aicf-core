#!/usr/bin/env node

/**
 * Terminal Conversation Processor
 * Monitors AI terminal's SQLite database and automatically processes new conversations
 */

import fs from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const TERMINAL_DB_PATH = join(
  homedir(),
  "Library/Group Containers/2BBY89MBSN.dev.warp/Library/Application Support/dev.warp.Warp-Stable/warp.sqlite"
);

const PROCESSED_CONVERSATIONS_FILE = ".terminal-processed-conversations.json";

interface ConversationRow {
  conversation_id: string;
  last_modified: number;
  message_count: number;
}

interface Message {
  role: string;
  content: string;
  timestamp: number;
}

interface ProcessedConversation {
  id: string;
  messages: Message[];
  metadata: {
    lastModified: number;
    messageCount: number;
  };
}

/**
 * Terminal Conversation Processor
 */
export class ConversationProcessor {
  private processedConversations: Set<string>;
  private isProcessing: boolean;

  constructor() {
    this.processedConversations = this.loadProcessedList();
    this.isProcessing = false;
  }

  /**
   * Load list of processed conversations
   */
  private loadProcessedList(): Set<string> {
    try {
      if (fs.existsSync(PROCESSED_CONVERSATIONS_FILE)) {
        const data = fs.readFileSync(PROCESSED_CONVERSATIONS_FILE, "utf-8");
        return new Set(JSON.parse(data));
      }
    } catch {
      console.log(
        "⚠️ Could not load processed conversations list, starting fresh"
      );
    }
    return new Set();
  }

  /**
   * Save list of processed conversations
   */
  private saveProcessedList(): void {
    try {
      fs.writeFileSync(
        PROCESSED_CONVERSATIONS_FILE,
        JSON.stringify([...this.processedConversations], null, 2)
      );
    } catch (error: unknown) {
      const err = error as Error;
      console.error(
        "❌ Could not save processed conversations list:",
        err.message
      );
    }
  }

  /**
   * Get new conversations from terminal database
   */
  async getNewConversations(): Promise<ProcessedConversation[]> {
    try {
      // Dynamic import for better-sqlite3
      const { default: Database } = await import("better-sqlite3");
      const db = new Database(TERMINAL_DB_PATH, { readonly: true });

      const conversations = db
        .prepare(
          `
        SELECT DISTINCT
          c.id as conversation_id,
          MAX(m.created_at) as last_modified,
          COUNT(m.id) as message_count
        FROM conversations c
        LEFT JOIN messages m ON c.id = m.conversation_id
        WHERE m.role IN ('user', 'assistant')
        GROUP BY c.id
        ORDER BY last_modified DESC
        LIMIT 50
      `
        )
        .all() as ConversationRow[];

      const newConversations: ProcessedConversation[] = [];

      for (const conv of conversations) {
        if (!this.processedConversations.has(conv.conversation_id)) {
          const messages = db
            .prepare(
              `
            SELECT role, content, created_at as timestamp
            FROM messages
            WHERE conversation_id = ?
            ORDER BY created_at ASC
          `
            )
            .all(conv.conversation_id) as Message[];

          newConversations.push({
            id: conv.conversation_id,
            messages,
            metadata: {
              lastModified: conv.last_modified,
              messageCount: conv.message_count,
            },
          });
        }
      }

      db.close();
      return newConversations;
    } catch (error: unknown) {
      const err = error as Error;
      console.error("❌ Error reading terminal database:", err.message);
      return [];
    }
  }

  /**
   * Process a conversation
   */
  async processConversation(
    conversation: ProcessedConversation
  ): Promise<boolean> {
    try {
      console.log(`📝 Processing conversation ${conversation.id}...`);

      const aicfContent = this.convertToAICF(conversation);

      const aicfDir = ".aicf";
      if (!fs.existsSync(aicfDir)) {
        fs.mkdirSync(aicfDir, { recursive: true });
      }

      const fileName = `conversation-${conversation.id}.aicf`;
      const filePath = join(aicfDir, fileName);

      fs.writeFileSync(filePath, aicfContent);

      this.processedConversations.add(conversation.id);
      this.saveProcessedList();

      console.log(`✅ Processed conversation ${conversation.id}`);
      return true;
    } catch (error: unknown) {
      const err = error as Error;
      console.error(
        `❌ Error processing conversation ${conversation.id}:`,
        err.message
      );
      return false;
    }
  }

  /**
   * Convert conversation to AICF format
   */
  private convertToAICF(conversation: ProcessedConversation): string {
    const lines: string[] = [];

    lines.push("@METADATA");
    lines.push(`conversation_id=${conversation.id}`);
    lines.push(`message_count=${conversation.metadata.messageCount}`);
    lines.push(
      `last_modified=${new Date(conversation.metadata.lastModified).toISOString()}`
    );
    lines.push("");

    lines.push("@CONVERSATION");
    conversation.messages.forEach((msg, index) => {
      const timestamp = new Date(msg.timestamp).toISOString();
      lines.push(`C${index + 1}|${timestamp}|${msg.role}|${msg.content}`);
    });
    lines.push("");

    return lines.join("\n");
  }

  /**
   * Monitor terminal for new conversations
   */
  async monitor(intervalMs: number = 60000): Promise<void> {
    console.log("🔍 Monitoring terminal for new conversations...");

    const processNew = async () => {
      if (this.isProcessing) {
        return;
      }

      this.isProcessing = true;

      try {
        const newConversations = await this.getNewConversations();

        if (newConversations.length > 0) {
          console.log(`Found ${newConversations.length} new conversations`);

          for (const conv of newConversations) {
            await this.processConversation(conv);
          }
        }
      } catch (error: unknown) {
        const err = error as Error;
        console.error("❌ Error in monitor loop:", err.message);
      } finally {
        this.isProcessing = false;
      }
    };

    await processNew();

    setInterval(processNew, intervalMs);
  }

  /**
   * Process all unprocessed conversations once
   */
  async processAll(): Promise<number> {
    console.log("🔄 Processing all unprocessed conversations...");

    const newConversations = await this.getNewConversations();

    if (newConversations.length === 0) {
      console.log("✅ No new conversations to process");
      return 0;
    }

    console.log(`Found ${newConversations.length} new conversations`);

    let processed = 0;
    for (const conv of newConversations) {
      const success = await this.processConversation(conv);
      if (success) {
        processed++;
      }
    }

    console.log(`✅ Processed ${processed} conversations`);
    return processed;
  }
}

if (require.main === module) {
  const processor = new ConversationProcessor();

  const args = process.argv.slice(2);
  const command = args[0];

  if (command === "monitor") {
    const interval = parseInt(args[1] ?? "60000", 10);
    processor.monitor(interval).catch((error: unknown) => {
      const err = error as Error;
      console.error("❌ Monitor error:", err.message);
      process.exit(1);
    });
  } else {
    processor.processAll().catch((error: unknown) => {
      const err = error as Error;
      console.error("❌ Process error:", err.message);
      process.exit(1);
    });
  }
}
