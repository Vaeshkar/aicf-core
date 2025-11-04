#!/usr/bin/env node

/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2025 Dennis van Leeuwen
 *
 * AICF Writer - Atomic, thread-safe writing to AI Context Format files
 */

import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync } from "node:fs";
import type { Result } from "./types/result.js";
import { ok, err, toError } from "./types/result.js";
import type { FileSystem, Logger } from "./types/aicf.js";
import { SafeFileSystem } from "./utils/file-system.js";
import { ConsoleLogger } from "./utils/logger.js";
import { validatePath } from "./security/path-validator.js";
import {
  validateConfig,
  SECURE_DEFAULTS,
} from "./security/config-validator.js";
import { sanitizePipeData } from "./security/data-sanitizer.js";
import { atomicFileOperation } from "./security/file-operations.js";

export interface AICFWriterConfig {
  maxFileSize?: number;
  lockTimeout?: number;
  enablePIIRedaction?: boolean;
}

interface LockInfo {
  timestamp: number;
  pid: number;
  lockId: string;
}

/**
 * AICF Writer - Write and update AICF files safely
 */
export class AICFWriter {
  private readonly aicfDir: string;
  private readonly fs: SafeFileSystem;
  private readonly logger: Logger;
  private readonly config: Required<AICFWriterConfig>;
  private readonly locks: Map<string, LockInfo> = new Map();

  constructor(
    aicfDir = ".aicf",
    fs?: FileSystem,
    logger?: Logger,
    config?: AICFWriterConfig
  ) {
    const pathResult = validatePath(aicfDir);
    if (!pathResult.ok) {
      throw pathResult.error;
    }
    this.aicfDir = pathResult.value;

    this.fs = new SafeFileSystem(fs);
    this.logger = logger ?? new ConsoleLogger();

    validateConfig({
      maxFileSize: config?.maxFileSize ?? SECURE_DEFAULTS.maxFileSize,
      ...config,
    });

    this.config = {
      maxFileSize: config?.maxFileSize ?? SECURE_DEFAULTS.maxFileSize,
      lockTimeout: config?.lockTimeout ?? 5000,
      enablePIIRedaction: config?.enablePIIRedaction ?? false,
    };

    this.ensureDirectory();
  }

  /**
   * Ensure directory exists (synchronous for constructor)
   */
  private ensureDirectory(): void {
    try {
      if (!existsSync(this.aicfDir)) {
        // DEBUG: Log who is creating .aicf folder
        if (this.aicfDir.includes(".aicf")) {
          console.error(
            `🚨 WARNING: Creating .aicf folder at: ${this.aicfDir}`
          );
          console.error("Stack trace:", new Error().stack);
        }
        mkdirSync(this.aicfDir, { recursive: true });
      }
    } catch (error) {
      this.logger.error("Failed to create directory", toError(error));
    }
  }

  /**
   * Acquire lock for file
   */
  private async acquireLock(fileName: string): Promise<Result<string>> {
    try {
      const lockKey = `${this.aicfDir}/${fileName}`;
      const startTime = Date.now();

      while (this.locks.has(lockKey)) {
        if (Date.now() - startTime > this.config.lockTimeout) {
          return err(new Error(`Lock acquisition timeout for ${fileName}`));
        }

        const lockInfo = this.locks.get(lockKey);
        if (lockInfo && Date.now() - lockInfo.timestamp > 30000) {
          this.logger.warn(`Removing stale lock for ${fileName}`);
          this.locks.delete(lockKey);
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      this.locks.set(lockKey, {
        timestamp: Date.now(),
        pid: process.pid,
        lockId: randomUUID(),
      });

      return ok(lockKey);
    } catch (error) {
      return err(toError(error));
    }
  }

  /**
   * Release lock for file
   */
  private releaseLock(lockKey: string): void {
    if (this.locks.has(lockKey)) {
      const lockInfo = this.locks.get(lockKey);
      if (lockInfo && lockInfo.pid === process.pid) {
        this.locks.delete(lockKey);
      } else {
        this.logger.warn(
          `Attempted to release lock owned by different process: ${lockKey}`
        );
      }
    }
  }

  /**
   * Get next line number for file
   * Searches backwards to find the last line with a line number (handles multi-line entries)
   */
  private async getNextLineNumber(filePath: string): Promise<Result<number>> {
    try {
      const existsResult = await this.fs.exists(filePath);
      if (!existsResult.ok) {
        return err(existsResult.error);
      }
      if (!existsResult.value) {
        return ok(1);
      }

      const contentResult = await this.fs.readFile(filePath);
      if (!contentResult.ok) {
        return err(contentResult.error);
      }

      const lines = contentResult.value.split("\n").filter(Boolean);
      if (lines.length === 0) {
        return ok(1);
      }

      // Search backwards for the last line that starts with a number followed by a pipe
      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i];
        if (!line) continue;

        const pipeIndex = line.indexOf("|");
        if (pipeIndex > 0) {
          const lineNumStr = line.substring(0, pipeIndex);
          const lineNum = parseInt(lineNumStr, 10);
          if (!isNaN(lineNum)) {
            return ok(lineNum + 1);
          }
        }
      }

      // If no valid line number found, start at 1
      return ok(1);
    } catch (error) {
      return err(toError(error));
    }
  }

  /**
   * Append line to file (with sanitization)
   */
  async appendLine(fileName: string, data: string): Promise<Result<number>> {
    const lockResult = await this.acquireLock(fileName);
    if (!lockResult.ok) {
      return err(lockResult.error);
    }

    const lockKey = lockResult.value;

    try {
      const filePath = join(this.aicfDir, fileName);

      const lineNumResult = await this.getNextLineNumber(filePath);
      if (!lineNumResult.ok) {
        return err(lineNumResult.error);
      }

      const lineNum = lineNumResult.value;
      const sanitized = sanitizePipeData(data);
      const line = `${lineNum}|${sanitized}\n`;

      const writeResult = await atomicFileOperation(
        filePath,
        async (tempPath) => {
          const existsResult = await this.fs.exists(filePath);
          if (existsResult.ok && existsResult.value) {
            const contentResult = await this.fs.readFile(filePath);
            if (contentResult.ok) {
              await this.fs.writeFile(tempPath, contentResult.value + line);
            } else {
              await this.fs.writeFile(tempPath, line);
            }
          } else {
            await this.fs.writeFile(tempPath, line);
          }
          return lineNum;
        }
      );

      if (!writeResult.ok) {
        return err(writeResult.error);
      }

      return ok(writeResult.value);
    } catch (error) {
      return err(toError(error));
    } finally {
      this.releaseLock(lockKey);
    }
  }

  /**
   * Append line to file (without sanitization - for pre-sanitized structured data)
   * Handles multi-line data by only adding line number to the first line
   */
  private async appendLineRaw(
    fileName: string,
    data: string
  ): Promise<Result<number>> {
    const lockResult = await this.acquireLock(fileName);
    if (!lockResult.ok) {
      return err(lockResult.error);
    }

    const lockKey = lockResult.value;

    try {
      const filePath = join(this.aicfDir, fileName);

      const lineNumResult = await this.getNextLineNumber(filePath);
      if (!lineNumResult.ok) {
        return err(lineNumResult.error);
      }

      const lineNum = lineNumResult.value;

      // For multi-line data, only add line number to the first line
      const lines = data.split("\n");
      const formattedLines = lines.map((line, index) => {
        if (index === 0) {
          return `${lineNum}|${line}`;
        } else {
          return line;
        }
      });
      const formattedData = formattedLines.join("\n") + "\n";

      const writeResult = await atomicFileOperation(
        filePath,
        async (tempPath) => {
          const existsResult = await this.fs.exists(filePath);
          if (existsResult.ok && existsResult.value) {
            const contentResult = await this.fs.readFile(filePath);
            if (contentResult.ok) {
              await this.fs.writeFile(
                tempPath,
                contentResult.value + formattedData
              );
            } else {
              await this.fs.writeFile(tempPath, formattedData);
            }
          } else {
            await this.fs.writeFile(tempPath, formattedData);
          }
          return lineNum;
        }
      );

      if (!writeResult.ok) {
        return err(writeResult.error);
      }

      return ok(lineNum);
    } catch (error) {
      return err(toError(error));
    } finally {
      this.releaseLock(lockKey);
    }
  }

  /**
   * Write conversation
   */
  async writeConversation(conversation: {
    id: string;
    timestamp: string;
    role: string;
    content: string;
  }): Promise<Result<number>> {
    try {
      const data = [
        `@CONVERSATION:`,
        `id=${sanitizePipeData(conversation.id)}`,
        `timestamp=${sanitizePipeData(conversation.timestamp)}`,
        `role=${sanitizePipeData(conversation.role)}`,
        `content=${sanitizePipeData(conversation.content)}`,
      ].join("\n");

      return await this.appendLineRaw("conversations.aicf", data);
    } catch (error) {
      return err(toError(error));
    }
  }

  /**
   * Write memory
   */
  async writeMemory(memory: {
    id: string;
    type: string;
    content: string;
    timestamp: string;
  }): Promise<Result<number>> {
    try {
      const data = [
        `@MEMORY:`,
        `id=${sanitizePipeData(memory.id)}`,
        `type=${sanitizePipeData(memory.type)}`,
        `content=${sanitizePipeData(memory.content)}`,
        `timestamp=${sanitizePipeData(memory.timestamp)}`,
      ].join("\n");

      return await this.appendLineRaw("memories.aicf", data);
    } catch (error) {
      return err(toError(error));
    }
  }

  /**
   * Write decision
   */
  async writeDecision(decision: {
    decision: string;
    rationale: string;
    timestamp: string;
  }): Promise<Result<number>> {
    try {
      const data = [
        `@DECISION:`,
        `decision=${sanitizePipeData(decision.decision)}`,
        `rationale=${sanitizePipeData(decision.rationale)}`,
        `timestamp=${sanitizePipeData(decision.timestamp)}`,
      ].join("\n");

      return await this.appendLineRaw("decisions.aicf", data);
    } catch (error) {
      return err(toError(error));
    }
  }

  /**
   * Write session (AICF v3.1)
   * Track conversation lifecycle and session metrics
   */
  async writeSession(session: {
    id: string;
    app_name: string;
    user_id: string;
    created_at: string;
    last_update_time: string;
    status: "active" | "completed" | "archived";
    event_count?: number;
    total_tokens?: number;
    session_duration_seconds?: number;
  }): Promise<Result<number>> {
    try {
      const data = [
        `@SESSION:${sanitizePipeData(session.id)}`,
        `app_name=${sanitizePipeData(session.app_name)}`,
        `user_id=${sanitizePipeData(session.user_id)}`,
        `created_at=${sanitizePipeData(session.created_at)}`,
        `last_update_time=${sanitizePipeData(session.last_update_time)}`,
        `status=${sanitizePipeData(session.status)}`,
      ];

      if (session.event_count !== undefined) {
        data.push(`event_count=${session.event_count}`);
      }
      if (session.total_tokens !== undefined) {
        data.push(`total_tokens=${session.total_tokens}`);
      }
      if (session.session_duration_seconds !== undefined) {
        data.push(
          `session_duration_seconds=${session.session_duration_seconds}`
        );
      }

      return await this.appendLineRaw("sessions.aicf", data.join("\n"));
    } catch (error) {
      return err(toError(error));
    }
  }

  /**
   * Write embedding (AICF v3.1)
   * Enable semantic search with vector embeddings
   */
  async writeEmbedding(embedding: {
    id: string;
    model: string;
    dimension: number;
    vector: number[] | string;
    indexed_at: string;
    similarity_threshold?: number;
    keywords?: string[];
  }): Promise<Result<number>> {
    try {
      const vectorStr =
        typeof embedding.vector === "string"
          ? embedding.vector
          : embedding.vector.join(",");

      const data = [
        `@EMBEDDING:${sanitizePipeData(embedding.id)}`,
        `model=${sanitizePipeData(embedding.model)}`,
        `dimension=${embedding.dimension}`,
        `vector=${sanitizePipeData(vectorStr)}`,
        `indexed_at=${sanitizePipeData(embedding.indexed_at)}`,
      ];

      if (embedding.similarity_threshold !== undefined) {
        data.push(`similarity_threshold=${embedding.similarity_threshold}`);
      }
      if (embedding.keywords && embedding.keywords.length > 0) {
        // Join keywords with pipe - don't sanitize the pipes themselves
        // Individual keywords should not contain pipes
        data.push(`keywords=${embedding.keywords.join("|")}`);
      }

      return await this.appendLineRaw("embeddings.aicf", data.join("\n"));
    } catch (error) {
      return err(toError(error));
    }
  }

  /**
   * Write consolidation (AICF v3.1)
   * Track memory consolidation and lifecycle management
   */
  async writeConsolidation(consolidation: {
    id: string;
    source_items: string[];
    consolidated_at: string;
    method:
      | "semantic_clustering"
      | "temporal_summarization"
      | "deduplication"
      | "importance_filtering";
    semantic_theme?: string;
    key_facts?: string[];
    information_preserved?: number;
    compression_ratio?: number;
  }): Promise<Result<number>> {
    try {
      const data = [
        `@CONSOLIDATION:${sanitizePipeData(consolidation.id)}`,
        // Join source items with pipe - don't sanitize the pipes themselves
        `source_items=${consolidation.source_items.join("|")}`,
        `consolidated_at=${sanitizePipeData(consolidation.consolidated_at)}`,
        `method=${sanitizePipeData(consolidation.method)}`,
      ];

      if (consolidation.semantic_theme) {
        data.push(
          `semantic_theme=${sanitizePipeData(consolidation.semantic_theme)}`
        );
      }
      if (consolidation.key_facts && consolidation.key_facts.length > 0) {
        // Join key facts with pipe - don't sanitize the pipes themselves
        data.push(`key_facts=${consolidation.key_facts.join("|")}`);
      }
      if (consolidation.information_preserved !== undefined) {
        data.push(
          `information_preserved=${consolidation.information_preserved}%`
        );
      }
      if (consolidation.compression_ratio !== undefined) {
        data.push(`compression_ratio=${consolidation.compression_ratio}`);
      }

      return await this.appendLineRaw("consolidations.aicf", data.join("\n"));
    } catch (error) {
      return err(toError(error));
    }
  }

  /**
   * Append multiple lines to a file (for watcher use)
   * Used by JSON-to-AICF watcher to write converted data
   */
  async appendLines(
    filename: string,
    lines: string[]
  ): Promise<Result<number>> {
    try {
      const content = lines.join("\n") + "\n";
      return await this.appendLineRaw(filename, content);
    } catch (error) {
      return err(toError(error));
    }
  }
}
