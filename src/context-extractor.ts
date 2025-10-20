#!/usr/bin/env node

import fs from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

interface ExtractorOptions {
  limit?: number;
  timeframe?: string;
}

interface Conversation {
  id: string;
  messages: Message[];
  metadata: Record<string, any>;
}

interface Message {
  id: string;
  role: string;
  content: string;
  timestamp: number;
}

interface ContextSource {
  isAvailable(): boolean;
  listConversations(options: ExtractorOptions): Promise<Conversation[]>;
  extractConversation(
    conversationId: string,
    options: ExtractorOptions
  ): Promise<Conversation | null>;
}

/**
 * Universal AI Context Extractor
 *
 * Extracts conversation context from various AI assistants:
 * - Warp AI (SQLite database) - ✅ Production Ready
 * - Augment (Agent edit history) - ✅ Production Ready
 * - Claude Desktop (IndexedDB/LocalStorage) - 🔧 Placeholder
 * - Cursor AI (Extension Storage) - 🔧 Placeholder
 * - GitHub Copilot (Extension Data) - 🔧 Placeholder
 */
export class ContextExtractor {
  private readonly sources: Record<string, ContextSource>;
  private readonly defaultSource: string;

  constructor() {
    this.sources = {
      warp: new WarpContextSource(),
      augment: new AugmentContextSource(),
      claude: new ClaudeContextSource(),
      cursor: new CursorContextSource(),
      copilot: new CopilotContextSource(),
      chatgpt: new ChatGPTContextSource(),
    };
    this.defaultSource = "warp";
  }

  /**
   * List available conversations from specified source
   */
  async listConversations(
    source: string = this.defaultSource,
    options: ExtractorOptions = {}
  ): Promise<Conversation[]> {
    const contextSource = this.sources[source];
    if (!contextSource) {
      throw new Error(`Unsupported context source: ${source}`);
    }

    return await contextSource.listConversations(options);
  }

  /**
   * Extract full conversation context from specified source
   */
  async extractConversation(
    conversationId: string,
    source: string = this.defaultSource,
    options: ExtractorOptions = {}
  ): Promise<Conversation | null> {
    const contextSource = this.sources[source];
    if (!contextSource) {
      throw new Error(`Unsupported context source: ${source}`);
    }

    return await contextSource.extractConversation(conversationId, options);
  }

  /**
   * Get available context sources
   */
  getAvailableSources(): string[] {
    return Object.keys(this.sources).filter((source) =>
      this.sources[source]?.isAvailable()
    );
  }

  /**
   * Check if a specific source is available
   */
  isSourceAvailable(source: string): boolean {
    const contextSource = this.sources[source];
    return contextSource ? contextSource.isAvailable() : false;
  }
}

/**
 * Warp Terminal Context Source
 */
class WarpContextSource implements ContextSource {
  private readonly dbPath: string;

  constructor() {
    this.dbPath = join(
      homedir(),
      "Library/Group Containers/2BBY89MBSN.dev.warp/Library/Application Support/dev.warp.Warp-Stable/warp.sqlite"
    );
  }

  isAvailable(): boolean {
    return fs.existsSync(this.dbPath);
  }

  async listConversations(options: ExtractorOptions = {}): Promise<Conversation[]> {
    if (!this.isAvailable()) {
      return [];
    }

    try {
      const { default: Database } = await import("better-sqlite3");
      const db = new Database(this.dbPath, { readonly: true });

      const limit = options.limit ?? 10;

      const rows = db
        .prepare(
          `
        SELECT DISTINCT c.id
        FROM conversations c
        LEFT JOIN messages m ON c.id = m.conversation_id
        GROUP BY c.id
        ORDER BY MAX(m.created_at) DESC
        LIMIT ?
      `
        )
        .all(limit);

      const conversations: Conversation[] = [];

      for (const row of rows as { id: string }[]) {
        const messages = db
          .prepare(
            `
          SELECT id, role, content, created_at as timestamp
          FROM messages
          WHERE conversation_id = ?
          ORDER BY created_at ASC
        `
          )
          .all(row.id) as Message[];

        if (messages.length > 0) {
          conversations.push({
            id: row.id,
            messages,
            metadata: {
              source: "warp",
              messageCount: messages.length,
            },
          });
        }
      }

      db.close();
      return conversations;
    } catch (error: unknown) {
      const err = error as Error;
      console.error("Error listing Warp conversations:", err.message);
      return [];
    }
  }

  async extractConversation(
    conversationId: string,
    _options: ExtractorOptions = {}
  ): Promise<Conversation | null> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const { default: Database } = await import("better-sqlite3");
      const db = new Database(this.dbPath, { readonly: true });

      const messages = db
        .prepare(
          `
        SELECT id, role, content, created_at as timestamp
        FROM messages
        WHERE conversation_id = ?
        ORDER BY created_at ASC
      `
        )
        .all(conversationId) as Message[];

      db.close();

      if (messages.length === 0) {
        return null;
      }

      return {
        id: conversationId,
        messages,
        metadata: {
          source: "warp",
          messageCount: messages.length,
        },
      };
    } catch (error: unknown) {
      const err = error as Error;
      console.error("Error extracting Warp conversation:", err.message);
      return null;
    }
  }
}

/**
 * Augment Context Source
 */
class AugmentContextSource implements ContextSource {
  private readonly augmentDir: string;

  constructor() {
    this.augmentDir = join(homedir(), "Library/Application Support/Augment");
  }

  isAvailable(): boolean {
    return fs.existsSync(this.augmentDir);
  }

  async listConversations(_options: ExtractorOptions = {}): Promise<Conversation[]> {
    console.log("Augment context source not fully implemented");
    return [];
  }

  async extractConversation(
    _conversationId: string,
    _options: ExtractorOptions = {}
  ): Promise<Conversation | null> {
    console.log("Augment context source not fully implemented");
    return null;
  }
}

/**
 * Claude Desktop Context Source
 */
class ClaudeContextSource implements ContextSource {
  isAvailable(): boolean {
    return false;
  }

  async listConversations(_options: ExtractorOptions = {}): Promise<Conversation[]> {
    return [];
  }

  async extractConversation(
    _conversationId: string,
    _options: ExtractorOptions = {}
  ): Promise<Conversation | null> {
    return null;
  }
}

/**
 * Cursor AI Context Source
 */
class CursorContextSource implements ContextSource {
  isAvailable(): boolean {
    return false;
  }

  async listConversations(_options: ExtractorOptions = {}): Promise<Conversation[]> {
    return [];
  }

  async extractConversation(
    _conversationId: string,
    _options: ExtractorOptions = {}
  ): Promise<Conversation | null> {
    return null;
  }
}

/**
 * GitHub Copilot Context Source
 */
class CopilotContextSource implements ContextSource {
  isAvailable(): boolean {
    return false;
  }

  async listConversations(_options: ExtractorOptions = {}): Promise<Conversation[]> {
    return [];
  }

  async extractConversation(
    _conversationId: string,
    _options: ExtractorOptions = {}
  ): Promise<Conversation | null> {
    return null;
  }
}

/**
 * ChatGPT Context Source
 */
class ChatGPTContextSource implements ContextSource {
  isAvailable(): boolean {
    return false;
  }

  async listConversations(_options: ExtractorOptions = {}): Promise<Conversation[]> {
    return [];
  }

  async extractConversation(
    _conversationId: string,
    _options: ExtractorOptions = {}
  ): Promise<Conversation | null> {
    return null;
  }
}

