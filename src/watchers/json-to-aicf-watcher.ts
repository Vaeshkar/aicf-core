/**
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (c) 2025 Dennis van Leeuwen
 *
 * JSON Watcher - Watches .aicf/raw/ for new JSON files and converts to AICF v3.1
 * Phase 2: AICF-Core Watcher
 *
 * Renamed from JSONToAICFWatcher to JSONWatcher (future-proof naming)
 */

import { watch, type FSWatcher } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { AICFWriter } from "../aicf-writer.js";
import type { Result } from "../types/result.js";
import { ok, err, toError } from "../types/result.js";
import type { Logger } from "../types/aicf.js";
import { ConsoleLogger } from "../utils/logger.js";

/**
 * JSON conversation structure from AICE
 */
interface ConversationJSON {
  metadata: {
    conversationId: string;
    date: string;
    platform: string;
    user: string;
    status: string;
    timestamp_start: string;
    timestamp_end: string;
    duration_minutes: number;
    messages: number;
    tokens_estimated: number;
  };
  conversation?: {
    topic?: string;
    summary?: string;
    participants?: string[];
    flow?: string[];
  };
  key_exchanges: Array<{
    index?: number;
    timestamp: string;
    role?: string;
    content?: string;
    full_content_length?: number;
    user?: string;
    assistant_action?: string;
    outcome?: string;
  }>;
  decisions: Array<{
    timestamp: string;
    decision: string;
    context: string;
    impact: string;
  }>;
  insights: Array<{
    timestamp: string;
    insight: string;
    type: string;
    source: string;
  }>;
  technical_work: Array<{
    timestamp: string;
    work: string;
    type: string;
  }>;
  state: {
    current_task: string;
    blockers: string[];
    next_action: string;
    last_update: string;
  };
  user_intents: Array<{
    timestamp: string;
    intent: string;
    confidence: string;
    inferred_from: string;
  }>;
  ai_actions: Array<{
    timestamp: string;
    type: string;
    details: string;
    source: string;
  }>;
}

/**
 * Watcher configuration
 */
export interface JSONToAICFWatcherConfig {
  rawDir?: string;
  aicfDir?: string;
  pollInterval?: number;
  verbose?: boolean;
}

/**
 * JSON Watcher
 * Monitors .aicf/raw/ for new JSON files and converts them to AICF v3.1 format
 *
 * Day 4 Simplification: Only writes to conversations.aicf (no more separate files)
 * Renamed from JSONToAICFWatcher to JSONWatcher (future-proof naming)
 */
export class JSONWatcher {
  private readonly rawDir: string;
  private readonly aicfDir: string;
  private readonly writer: AICFWriter;
  private readonly logger: Logger;
  private readonly pollInterval: number;
  private readonly verbose: boolean;
  private watcher: FSWatcher | null = null;
  private pollTimer: NodeJS.Timeout | null = null;
  private processedFiles: Set<string> = new Set();
  private isRunning: boolean = false;

  constructor(
    cwd: string = process.cwd(),
    config?: JSONToAICFWatcherConfig,
    logger?: Logger
  ) {
    this.rawDir = config?.rawDir ?? join(cwd, ".aicf", "raw");
    this.aicfDir = config?.aicfDir ?? join(cwd, ".aicf");
    this.pollInterval = config?.pollInterval ?? 5000; // 5 seconds
    this.verbose = config?.verbose ?? false;
    this.logger = logger ?? new ConsoleLogger();
    this.writer = new AICFWriter(this.aicfDir);
  }

  /**
   * Start watching for new JSON files
   */
  async start(): Promise<Result<void>> {
    try {
      if (this.isRunning) {
        return err(new Error("Watcher is already running"));
      }

      // Ensure raw directory exists
      if (!existsSync(this.rawDir)) {
        if (this.verbose) {
          this.logger.info(`Raw directory does not exist: ${this.rawDir}`);
        }
        return ok(undefined);
      }

      this.isRunning = true;

      // Process existing files first
      await this.processExistingFiles();

      // Start file system watcher
      this.watcher = watch(this.rawDir, async (_eventType, filename) => {
        if (filename && filename.endsWith(".json")) {
          await this.processFile(filename);
        }
      });

      // Start polling as backup (in case fs.watch misses events)
      this.pollTimer = setInterval(() => {
        this.processExistingFiles().catch((error) => {
          this.logger.error("Poll error", toError(error));
        });
      }, this.pollInterval);

      if (this.verbose) {
        this.logger.info(`JSON to AICF watcher started on ${this.rawDir}`);
      }

      return ok(undefined);
    } catch (error) {
      return err(toError(error));
    }
  }

  /**
   * Stop watching
   */
  async stop(): Promise<Result<void>> {
    try {
      if (!this.isRunning) {
        return ok(undefined);
      }

      this.isRunning = false;

      if (this.watcher) {
        this.watcher.close();
        this.watcher = null;
      }

      if (this.pollTimer) {
        clearInterval(this.pollTimer);
        this.pollTimer = null;
      }

      if (this.verbose) {
        this.logger.info("JSON to AICF watcher stopped");
      }

      return ok(undefined);
    } catch (error) {
      return err(toError(error));
    }
  }

  /**
   * Process all existing JSON files in raw directory
   */
  private async processExistingFiles(): Promise<void> {
    try {
      const files = await readdir(this.rawDir);
      const jsonFiles = files.filter((f) => f.endsWith(".json"));

      for (const file of jsonFiles) {
        await this.processFile(file);
      }
    } catch (error) {
      this.logger.error("Failed to process existing files", toError(error));
    }
  }

  /**
   * Process a single JSON file
   */
  private async processFile(filename: string): Promise<void> {
    try {
      // Skip if already processed
      if (this.processedFiles.has(filename)) {
        return;
      }

      const filepath = join(this.rawDir, filename);

      // Check if file exists
      if (!existsSync(filepath)) {
        return;
      }

      if (this.verbose) {
        this.logger.info(`Processing JSON file: ${filename}`);
      }

      // Read and parse JSON
      const content = await readFile(filepath, "utf-8");
      const data: ConversationJSON = JSON.parse(content);

      // Convert to AICF v3.1 and write to 4 core files
      const result = await this.convertToAICF(data);

      if (result.ok) {
        this.processedFiles.add(filename);
        if (this.verbose) {
          this.logger.info(`✅ Converted ${filename} to AICF v3.1`);
        }
      } else {
        this.logger.error(`Failed to convert ${filename}`, result.error);
      }
    } catch (error) {
      this.logger.error(`Error processing ${filename}`, toError(error));
    }
  }

  /**
   * Convert JSON to AICF v3.1 format and write to conversations.aicf ONLY
   *
   * Day 4 Simplification: All data (conversations, insights, decisions) goes into
   * a single conversations.aicf file. Phase 5b (LILL-Meta) will extract and filter
   * this data into QuadIndex.
   */
  private async convertToAICF(data: ConversationJSON): Promise<Result<void>> {
    try {
      const { metadata, conversation, key_exchanges, decisions, insights } =
        data;

      // Write everything to conversations.aicf (single file!)
      const conversationLines: string[] = [];

      // 1. Conversation metadata
      conversationLines.push(
        `@CONVERSATION|${metadata.conversationId}|${metadata.timestamp_start}`
      );
      // Use fallback values if conversation fields are missing
      conversationLines.push(`topic|${conversation?.topic || "Untitled"}`);
      conversationLines.push(`summary|${conversation?.summary || ""}`);
      conversationLines.push(
        `participants|${conversation?.participants?.join(",") || "user,assistant"}`
      );
      conversationLines.push(`platform|${metadata.platform}`);
      conversationLines.push(`duration_minutes|${metadata.duration_minutes}`);
      conversationLines.push(`messages|${metadata.messages}`);
      conversationLines.push(`tokens|${metadata.tokens_estimated}`);

      // 2. Key exchanges (first 10)
      for (const exchange of key_exchanges.slice(0, 10)) {
        if (exchange.role && exchange.content) {
          // New format (from AICE writeJSON)
          conversationLines.push(
            `exchange|${exchange.timestamp}|${exchange.role}|${exchange.content.substring(0, 200)}`
          );
        } else if (exchange.user) {
          // Old format (manually created)
          conversationLines.push(
            `exchange|${exchange.timestamp}|user|${exchange.user.substring(0, 200)}`
          );
          if (exchange.assistant_action) {
            conversationLines.push(
              `exchange|${exchange.timestamp}|assistant|${exchange.assistant_action.substring(0, 200)}`
            );
          }
        }
      }

      // 3. Insights (inline, not separate file)
      if (insights.length > 0) {
        for (const insight of insights) {
          conversationLines.push(
            `insight|${insight.timestamp}|${insight.type}|${insight.insight}`
          );
        }
      }

      // 4. Decisions (inline, not separate file)
      if (decisions.length > 0) {
        for (const decision of decisions) {
          conversationLines.push(
            `decision|${decision.timestamp}|${decision.decision}|${decision.context}|${decision.impact}`
          );
        }
      }

      conversationLines.push(""); // Empty line separator

      // Write to conversations.aicf ONLY (no more insights.aicf, decisions.aicf, principles.aicf)
      await this.writer.appendLines("conversations.aicf", conversationLines);

      return ok(undefined);
    } catch (error) {
      return err(toError(error));
    }
  }
}

// Backward compatibility alias
export { JSONWatcher as JSONToAICFWatcher };
