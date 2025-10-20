#!/usr/bin/env node

/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (c) 2025 Dennis van Leeuwen
 *
 * AICF Writer - Atomic, thread-safe writing to AI Context Format files
 */

import { join } from "node:path";
import { randomUUID } from "node:crypto";
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
   * Ensure directory exists
   */
  private async ensureDirectory(): Promise<void> {
    const existsResult = await this.fs.exists(this.aicfDir);
    if (!existsResult.ok || !existsResult.value) {
      const mkdirResult = await this.fs.mkdir(this.aicfDir, {
        recursive: true,
      });
      if (!mkdirResult.ok) {
        this.logger.error("Failed to create directory", mkdirResult.error);
      }
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

      const lastLine = lines[lines.length - 1];
      if (!lastLine) {
        return ok(1);
      }

      const parts = lastLine.split("|", 1);
      const lineNum = parseInt(parts[0] ?? "0", 10);

      return ok(lineNum + 1);
    } catch (error) {
      return err(toError(error));
    }
  }

  /**
   * Append line to file
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

      return await this.appendLine("conversations.aicf", data);
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

      return await this.appendLine("memories.aicf", data);
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

      return await this.appendLine("decisions.aicf", data);
    } catch (error) {
      return err(toError(error));
    }
  }
}
