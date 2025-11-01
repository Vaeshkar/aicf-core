#!/usr/bin/env node

/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2025 Dennis van Leeuwen
 *
 * AICF Reader - Programmatic access to AI Context Format files
 */

import { join } from "node:path";
import type { Result } from "./types/result.js";
import { ok, err, toError } from "./types/result.js";
import type { FileSystem, Logger } from "./types/aicf.js";
import { SafeFileSystem } from "./utils/file-system.js";
import { validatePath } from "./security/path-validator.js";
import {
  validateConfig,
  SECURE_DEFAULTS,
} from "./security/config-validator.js";
import { readFileStream } from "./security/file-operations.js";

export interface AICFReaderConfig {
  maxFileSize?: number;
  enableCaching?: boolean;
  cacheTimeout?: number;
}

export interface AICFIndex {
  [section: string]: Record<string, string>;
}

export interface AICFConversation {
  id: string;
  timestamp: string;
  role: string;
  content: string;
  metadata?: Record<string, string>;
}

export interface AICFStats {
  project: {
    name: string;
    path: string;
  };
  counts: {
    conversations: number;
    memories: number;
    decisions: number;
    insights: number;
  };
  lastUpdate: string;
  state: {
    status: string;
  };
}

/**
 * AICF Reader - Read and query AICF files
 */
export class AICFReader {
  private readonly aicfDir: string;
  private readonly fs: SafeFileSystem;
  private readonly config: Required<AICFReaderConfig>;
  private indexCache: AICFIndex | null = null;
  private lastIndexRead = 0;

  constructor(
    aicfDir = ".aicf",
    fs?: FileSystem,
    _logger?: Logger,
    config?: AICFReaderConfig
  ) {
    const pathResult = validatePath(aicfDir);
    if (!pathResult.ok) {
      throw pathResult.error;
    }
    this.aicfDir = pathResult.value;

    this.fs = new SafeFileSystem(fs);

    validateConfig({
      maxFileSize: config?.maxFileSize ?? SECURE_DEFAULTS.maxFileSize,
      ...config,
    });

    this.config = {
      maxFileSize: config?.maxFileSize ?? SECURE_DEFAULTS.maxFileSize,
      enableCaching: config?.enableCaching ?? true,
      cacheTimeout: config?.cacheTimeout ?? 5 * 60 * 1000,
    };
  }

  /**
   * Read and cache the master index
   */
  async getIndex(): Promise<Result<AICFIndex>> {
    try {
      const indexPath = join(this.aicfDir, "index.aicf");

      const statResult = await this.fs.stat(indexPath);
      if (!statResult.ok) {
        return err(statResult.error);
      }

      const stats = statResult.value;
      const mtimeMs = stats.mtimeMs ?? 0;

      if (
        this.config.enableCaching &&
        this.indexCache &&
        mtimeMs <= this.lastIndexRead
      ) {
        return ok(this.indexCache);
      }

      const contentResult = await this.fs.readFile(indexPath);
      if (!contentResult.ok) {
        return err(contentResult.error);
      }

      const parseResult = this.parseIndex(contentResult.value);
      if (!parseResult.ok) {
        return err(parseResult.error);
      }

      this.indexCache = parseResult.value;
      this.lastIndexRead = mtimeMs;

      return ok(this.indexCache);
    } catch (error) {
      return err(toError(error));
    }
  }

  /**
   * Parse index content
   */
  private parseIndex(content: string): Result<AICFIndex> {
    try {
      const lines = content.split("\n").filter(Boolean);
      const index: AICFIndex = {};
      let currentSection: string | null = null;

      for (const line of lines) {
        const parts = line.split("|", 2);
        if (parts.length < 2) continue;

        const data = parts[1];
        if (!data) continue;

        if (data.startsWith("@")) {
          currentSection = data.substring(1);
          index[currentSection] = {};
        } else if (currentSection && data.includes("=")) {
          const [key, value] = data.split("=", 2);
          if (key && value && index[currentSection]) {
            index[currentSection]![key] = value;
          }
        }
      }

      return ok(index);
    } catch (error) {
      return err(toError(error));
    }
  }

  /**
   * Get last N conversations
   */
  async getLastConversations(count = 5): Promise<Result<AICFConversation[]>> {
    try {
      const conversationsPath = join(this.aicfDir, "conversations.aicf");

      const existsResult = await this.fs.exists(conversationsPath);
      if (!existsResult.ok) {
        return err(existsResult.error);
      }
      if (!existsResult.value) {
        return ok([]);
      }

      const statResult = await this.fs.stat(conversationsPath);
      if (!statResult.ok) {
        return err(statResult.error);
      }

      const stats = statResult.value;
      const fileSize = stats.size ?? 0;

      if (fileSize > this.config.maxFileSize) {
        return this.getLastConversationsStreaming(conversationsPath, count);
      } else {
        return this.getLastConversationsMemory(conversationsPath, count);
      }
    } catch (error) {
      return err(toError(error));
    }
  }

  /**
   * Get last conversations from memory (small files)
   */
  private async getLastConversationsMemory(
    conversationsPath: string,
    count: number
  ): Promise<Result<AICFConversation[]>> {
    try {
      const contentResult = await this.fs.readFile(conversationsPath);
      if (!contentResult.ok) {
        return err(contentResult.error);
      }

      const lines = contentResult.value.split("\n").filter(Boolean);
      const conversations: AICFConversation[] = [];
      let currentConv: Partial<AICFConversation> = {};

      for (
        let i = lines.length - 1;
        i >= 0 && conversations.length < count;
        i--
      ) {
        const line = lines[i];
        if (!line) continue;

        // Check if line has a pipe (numbered line) or not (continuation line)
        const pipeIndex = line.indexOf("|");
        let data: string;

        if (pipeIndex > 0) {
          // Line has format: number|data
          data = line.substring(pipeIndex + 1);
        } else {
          // Line has no pipe, it's a continuation line (e.g., "id=value")
          data = line;
        }

        if (!data) continue;

        if (data.startsWith("@CONVERSATION:")) {
          // When reading backwards, we've been building currentConv from the data lines
          // Now we've hit the tag, so push it and start a new one
          if (this.isValidConversation(currentConv)) {
            conversations.push(currentConv as AICFConversation);
          }
          currentConv = {};
        } else {
          // Parse data line into currentConv
          this.parseConversationLine(data, currentConv);
        }
      }

      // Don't push the final currentConv - it's incomplete (we never saw its @CONVERSATION tag)

      return ok(conversations);
    } catch (error) {
      return err(toError(error));
    }
  }

  /**
   * Get last conversations using streaming (large files)
   */
  private async getLastConversationsStreaming(
    conversationsPath: string,
    count: number
  ): Promise<Result<AICFConversation[]>> {
    try {
      const conversations: AICFConversation[] = [];
      let currentConv: Partial<AICFConversation> = {};

      const streamResult = await readFileStream(
        conversationsPath,
        (line: string) => {
          // Check if line has a pipe (numbered line) or not (continuation line)
          const pipeIndex = line.indexOf("|");
          let data: string;

          if (pipeIndex > 0) {
            // Line has format: number|data
            data = line.substring(pipeIndex + 1);
          } else {
            // Line has no pipe, it's a continuation line (e.g., "id=value")
            data = line;
          }

          if (!data) return;

          if (data.startsWith("@CONVERSATION:")) {
            // When reading forward, we've been building currentConv from previous data lines
            // Now we've hit a new tag, so push the previous one and start a new one
            if (this.isValidConversation(currentConv)) {
              conversations.unshift(currentConv as AICFConversation);
              if (conversations.length > count) {
                conversations.pop();
              }
            }
            currentConv = {};
          } else {
            // Parse data line into currentConv
            this.parseConversationLine(data, currentConv);
          }
        }
      );

      if (!streamResult.ok) {
        return err(streamResult.error);
      }

      // Push the final conversation (the last one in the file)
      if (this.isValidConversation(currentConv)) {
        conversations.unshift(currentConv as AICFConversation);
      }

      return ok(conversations.slice(0, count));
    } catch (error) {
      return err(toError(error));
    }
  }

  /**
   * Parse conversation line
   */
  private parseConversationLine(
    data: string,
    conv: Partial<AICFConversation>
  ): void {
    if (data.includes("=")) {
      const [key, value] = data.split("=", 2);
      if (key && value) {
        if (key === "id") conv.id = value;
        else if (key === "timestamp") conv.timestamp = value;
        else if (key === "role") conv.role = value;
        else if (key === "content") conv.content = value;
      }
    }
  }

  /**
   * Check if conversation is valid
   */
  private isValidConversation(
    conv: Partial<AICFConversation>
  ): conv is AICFConversation {
    return !!(conv.id && conv.timestamp && conv.role && conv.content);
  }

  /**
   * Get statistics about AICF data
   */
  async getStats(): Promise<Result<AICFStats>> {
    try {
      const indexResult = await this.getIndex();
      if (!indexResult.ok) {
        return err(indexResult.error);
      }

      const index = indexResult.value;
      const stats: AICFStats = {
        project: {
          name: index["METADATA"]?.["project_name"] ?? "Unknown",
          path: this.aicfDir,
        },
        counts: {
          conversations: parseInt(index["STATS"]?.["conversations"] ?? "0", 10),
          memories: parseInt(index["STATS"]?.["memories"] ?? "0", 10),
          decisions: parseInt(index["STATS"]?.["decisions"] ?? "0", 10),
          insights: parseInt(index["STATS"]?.["insights"] ?? "0", 10),
        },
        lastUpdate:
          index["METADATA"]?.["updated_at"] ?? new Date().toISOString(),
        state: {
          status: index["STATE"]?.["status"] ?? "active",
        },
      };

      return ok(stats);
    } catch (error) {
      return err(toError(error));
    }
  }

  /**
   * Get current work state
   */
  async getCurrentWorkState(): Promise<Result<Record<string, unknown> | null>> {
    try {
      const workPath = join(this.aicfDir, "work.aicf");

      const existsResult = await this.fs.exists(workPath);
      if (!existsResult.ok) {
        return err(existsResult.error);
      }
      if (!existsResult.value) {
        return ok(null);
      }

      const contentResult = await this.fs.readFile(workPath);
      if (!contentResult.ok) {
        return err(contentResult.error);
      }

      const lines = contentResult.value.split("\n").filter(Boolean);
      if (lines.length === 0) {
        return ok(null);
      }

      const lastLine = lines[lines.length - 1];
      if (!lastLine) {
        return ok(null);
      }

      const parts = lastLine.split("|");
      if (parts.length < 3) {
        return ok(null);
      }

      return ok({
        id: parts[1] ?? "",
        status: parts[2] ?? "",
        description: parts[3] ?? "",
      });
    } catch (error) {
      return err(toError(error));
    }
  }
}
