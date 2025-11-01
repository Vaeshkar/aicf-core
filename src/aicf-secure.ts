#!/usr/bin/env node

/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2025 Dennis van Leeuwen
 *
 * AICF Secure - Production-ready AICF with comprehensive security
 */

import type { Result } from "./types/result.js";
import { ok, err } from "./types/result.js";
import type { FileSystem, Logger } from "./types/aicf.js";
import { AICFReader, type AICFReaderConfig } from "./aicf-reader.js";
import { AICFWriter, type AICFWriterConfig } from "./aicf-writer.js";
import { redactPII, type PIIRedactionResult } from "./security/pii-detector.js";
import { ConsoleLogger } from "./utils/logger.js";

export interface AICFSecureConfig extends AICFReaderConfig, AICFWriterConfig {
  enablePIIRedaction?: boolean;
  piiRedactionMode?: "mask" | "hash" | "remove" | "flag";
  enableAuditLog?: boolean;
  maxAuditLogSize?: number;
  streamingThreshold?: number;
}

export interface SecurityEvent {
  type: string;
  timestamp: string;
  details: Record<string, unknown>;
}

/**
 * AICF Secure - Secure reader/writer with PII protection
 */
export class AICFSecure {
  private readonly reader: AICFReader;
  private readonly writer: AICFWriter;
  private readonly logger: Logger;
  private readonly config: Required<AICFSecureConfig>;
  private readonly auditLog: SecurityEvent[] = [];

  constructor(
    aicfDir = ".aicf",
    fs?: FileSystem,
    logger?: Logger,
    config?: AICFSecureConfig
  ) {
    this.logger = logger ?? new ConsoleLogger();

    this.config = {
      maxFileSize: config?.maxFileSize ?? 100 * 1024 * 1024,
      enableCaching: config?.enableCaching ?? true,
      cacheTimeout: config?.cacheTimeout ?? 5 * 60 * 1000,
      lockTimeout: config?.lockTimeout ?? 5000,
      enablePIIRedaction: config?.enablePIIRedaction ?? true,
      piiRedactionMode: config?.piiRedactionMode ?? "mask",
      enableAuditLog: config?.enableAuditLog ?? true,
      maxAuditLogSize: config?.maxAuditLogSize ?? 1000,
      streamingThreshold: config?.streamingThreshold ?? 1024 * 1024,
    };

    this.reader = new AICFReader(aicfDir, fs, logger, {
      maxFileSize: this.config.maxFileSize,
      enableCaching: this.config.enableCaching,
      cacheTimeout: this.config.cacheTimeout,
    });

    this.writer = new AICFWriter(aicfDir, fs, logger, {
      maxFileSize: this.config.maxFileSize,
      lockTimeout: this.config.lockTimeout,
      enablePIIRedaction: this.config.enablePIIRedaction,
    });
  }

  /**
   * Log security event
   */
  private logSecurityEvent(type: string, details: Record<string, unknown>): void {
    if (!this.config.enableAuditLog) return;

    const event: SecurityEvent = {
      type,
      timestamp: new Date().toISOString(),
      details,
    };

    this.auditLog.push(event);

    if (this.auditLog.length > this.config.maxAuditLogSize) {
      this.auditLog.shift();
    }

    this.logger.info(`Security event: ${type}`, details);
  }

  /**
   * Read with PII redaction
   */
  async readWithRedaction(
    fileName: string
  ): Promise<Result<PIIRedactionResult>> {
    try {
      const contentResult = await this.reader.getIndex();
      if (!contentResult.ok) {
        return err(contentResult.error);
      }

      const content = JSON.stringify(contentResult.value);

      if (!this.config.enablePIIRedaction) {
        return ok({
          text: content,
          detections: 0,
          types: [],
          original: content,
        });
      }

      const redactionResult = redactPII(content);
      if (!redactionResult.ok) {
        return err(redactionResult.error);
      }

      if (redactionResult.value.detections > 0) {
        this.logSecurityEvent("pii_detected", {
          fileName,
          detections: redactionResult.value.detections,
          types: redactionResult.value.types,
        });
      }

      return ok(redactionResult.value);
    } catch (error) {
      return err(error as Error);
    }
  }

  /**
   * Write conversation with PII check
   */
  async writeConversationSecure(conversation: {
    id: string;
    timestamp: string;
    role: string;
    content: string;
  }): Promise<Result<number>> {
    try {
      let content = conversation.content;

      if (this.config.enablePIIRedaction) {
        const redactionResult = redactPII(content);
        if (!redactionResult.ok) {
          return err(redactionResult.error);
        }

        if (redactionResult.value.detections > 0) {
          this.logSecurityEvent("pii_redacted_before_write", {
            detections: redactionResult.value.detections,
            types: redactionResult.value.types,
          });

          content = redactionResult.value.text;
        }
      }

      return await this.writer.writeConversation({
        ...conversation,
        content,
      });
    } catch (error) {
      return err(error as Error);
    }
  }

  /**
   * Write memory with PII check
   */
  async writeMemorySecure(memory: {
    id: string;
    type: string;
    content: string;
    timestamp: string;
  }): Promise<Result<number>> {
    try {
      let content = memory.content;

      if (this.config.enablePIIRedaction) {
        const redactionResult = redactPII(content);
        if (!redactionResult.ok) {
          return err(redactionResult.error);
        }

        if (redactionResult.value.detections > 0) {
          this.logSecurityEvent("pii_redacted_before_write", {
            detections: redactionResult.value.detections,
            types: redactionResult.value.types,
          });

          content = redactionResult.value.text;
        }
      }

      return await this.writer.writeMemory({
        ...memory,
        content,
      });
    } catch (error) {
      return err(error as Error);
    }
  }

  /**
   * Get audit log
   */
  getAuditLog(): SecurityEvent[] {
    return [...this.auditLog];
  }

  /**
   * Clear audit log
   */
  clearAuditLog(): void {
    this.auditLog.length = 0;
    this.logSecurityEvent("audit_log_cleared", {});
  }

  /**
   * Get reader instance
   */
  getReader(): AICFReader {
    return this.reader;
  }

  /**
   * Get writer instance
   */
  getWriter(): AICFWriter {
    return this.writer;
  }

  /**
   * Get last conversations (delegated to reader)
   */
  async getLastConversations(count = 5) {
    return await this.reader.getLastConversations(count);
  }

  /**
   * Get stats (delegated to reader)
   */
  async getStats() {
    return await this.reader.getStats();
  }

  /**
   * Get current work state (delegated to reader)
   */
  async getCurrentWorkState() {
    return await this.reader.getCurrentWorkState();
  }

  /**
   * Write conversation (delegated to writer with security)
   */
  async writeConversation(conversation: {
    id: string;
    timestamp: string;
    role: string;
    content: string;
  }) {
    return await this.writeConversationSecure(conversation);
  }

  /**
   * Write memory (delegated to writer with security)
   */
  async writeMemory(memory: {
    id: string;
    type: string;
    content: string;
    timestamp: string;
  }) {
    return await this.writeMemorySecure(memory);
  }

  /**
   * Write decision (delegated to writer)
   */
  async writeDecision(decision: {
    decision: string;
    rationale: string;
    timestamp: string;
  }) {
    return await this.writer.writeDecision(decision);
  }
}

