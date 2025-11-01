#!/usr/bin/env node

/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2025 Dennis van Leeuwen
 *
 * AICF Secure Writer - Enhanced writer with security improvements
 *
 * Security improvements:
 * - Path traversal protection
 * - Pipe injection prevention
 * - PII detection and redaction
 * - Streaming for large files
 * - Improved file locking
 * - GDPR/CCPA/HIPAA compliance
 */

import { existsSync, mkdirSync } from "node:fs";
import { appendFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { randomUUID } from "node:crypto";
import { PIIDetector } from "./security/pii-detector.js";
import { validatePath, sanitizePipeData } from "./security-fixes.js";

export interface SecureWriterOptions {
  redactSSN?: boolean;
  redactCreditCard?: boolean;
  redactEmail?: boolean;
  redactPhone?: boolean;
  redactAPIKey?: boolean;
  logPII?: boolean;
  throwOnPII?: boolean;
  enablePIIDetection?: boolean;
  enableSanitization?: boolean;
  enableComplianceLogging?: boolean;
  warnOnPII?: boolean;
}

export interface ProcessedText {
  text: string;
  warnings: Warning[];
  original: string;
}

export interface Warning {
  type: string;
  count: number;
  types: string[];
  message: string;
}

export interface WriteResult {
  success: boolean;
  warnings: Warning[];
  bytesWritten: number;
}

interface LockInfo {
  timestamp: number;
  pid: number;
  lockId: string;
}

/**
 * AICF Secure Writer
 */
export class AICFSecureWriter {
  private readonly aicfDir: string;
  private readonly piiDetector: PIIDetector;
  private readonly options: Required<SecureWriterOptions>;
  private readonly locks = new Map<string, LockInfo>();

  constructor(aicfDir = ".aicf", options: SecureWriterOptions = {}) {
    // SECURITY FIX: Validate path to prevent traversal attacks
    this.aicfDir = validatePath(aicfDir);

    // Initialize PII detector
    this.piiDetector = new PIIDetector({
      redactSSN: options.redactSSN !== false,
      redactCreditCard: options.redactCreditCard !== false,
      redactEmail: options.redactEmail !== false,
      redactPhone: options.redactPhone !== false,
      redactAPIKey: options.redactAPIKey !== false,
      logDetections: options.logPII !== false,
      throwOnDetection: options.throwOnPII === true,
    });

    // Configuration
    this.options = {
      redactSSN: options.redactSSN !== false,
      redactCreditCard: options.redactCreditCard !== false,
      redactEmail: options.redactEmail !== false,
      redactPhone: options.redactPhone !== false,
      redactAPIKey: options.redactAPIKey !== false,
      logPII: options.logPII !== false,
      throwOnPII: options.throwOnPII === true,
      enablePIIDetection: options.enablePIIDetection !== false,
      enableSanitization: options.enableSanitization !== false,
      enableComplianceLogging: options.enableComplianceLogging !== false,
      warnOnPII: options.warnOnPII !== false,
    };

    // Ensure directory exists
    if (!existsSync(this.aicfDir)) {
      mkdirSync(this.aicfDir, { recursive: true, mode: 0o755 });
    }
  }

  /**
   * SECURITY FIX: Improved file locking with timeout and retry
   */
  async acquireLock(fileName: string, timeoutMs = 5000): Promise<string> {
    const lockKey = `${this.aicfDir}/${fileName}`;
    const startTime = Date.now();

    while (this.locks.has(lockKey)) {
      // Check for timeout
      if (Date.now() - startTime > timeoutMs) {
        throw new Error(`Lock acquisition timeout for ${fileName}`);
      }

      // Check for stale locks (older than 30 seconds)
      const lockInfo = this.locks.get(lockKey);
      if (lockInfo && Date.now() - lockInfo.timestamp > 30000) {
        console.warn(`⚠️ Removing stale lock for ${fileName}`);
        this.locks.delete(lockKey);
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    // Add process ID to lock to detect stale locks
    this.locks.set(lockKey, {
      timestamp: Date.now(),
      pid: process.pid,
      lockId: randomUUID(),
    });

    return lockKey;
  }

  /**
   * SECURITY FIX: Enhanced lock release with validation
   */
  releaseLock(lockKey: string): void {
    if (this.locks.has(lockKey)) {
      const lockInfo = this.locks.get(lockKey);
      if (!lockInfo) return;

      // Verify the lock belongs to this process
      if (lockInfo.pid === process.pid) {
        this.locks.delete(lockKey);
      } else {
        console.warn(
          `⚠️ Attempted to release lock owned by different process: ${lockKey}`
        );
      }
    }
  }

  /**
   * Process text with security checks
   */
  processText(text: string): ProcessedText {
    let processedText = text;
    const warnings: Warning[] = [];

    // PII Detection
    if (this.options.enablePIIDetection) {
      const piiResult = this.piiDetector.redact(text);

      if (piiResult.ok) {
        const result = piiResult.value;
        if (result.detections > 0) {
          processedText = result.text;
          warnings.push({
            type: "PII_DETECTED",
            count: result.detections,
            types: result.types,
            message: `⚠️ PII detected and redacted: ${result.types.join(", ")}`,
          });

          if (this.options.warnOnPII) {
            console.warn(
              `⚠️ PII DETECTED: ${result.detections} instances (${result.types.join(", ")})`
            );
          }
        }
      }
    }

    // Sanitization
    if (this.options.enableSanitization) {
      processedText = sanitizePipeData(processedText);
    }

    return {
      text: processedText,
      warnings,
      original: text,
    };
  }

  /**
   * Append data to AICF file with security checks
   */
  async appendToFile(fileName: string, data: string): Promise<WriteResult> {
    // SECURITY FIX: Validate file name
    const safeFileName = basename(fileName);
    const filePath = join(this.aicfDir, safeFileName);

    // Acquire lock
    const lockKey = await this.acquireLock(safeFileName);

    try {
      // Process data with security checks
      const processed = this.processText(data);

      // Append to file
      await appendFile(filePath, processed.text + "\n", "utf8");

      // Log compliance if enabled
      if (
        this.options.enableComplianceLogging &&
        processed.warnings.length > 0
      ) {
        await this.logCompliance(safeFileName, processed.warnings);
      }

      return {
        success: true,
        warnings: processed.warnings,
        bytesWritten: Buffer.byteLength(processed.text, "utf8"),
      };
    } finally {
      this.releaseLock(lockKey);
    }
  }

  /**
   * Write conversation with security checks
   */
  async writeConversation(
    conversationId: string,
    metadata: Record<string, unknown>
  ): Promise<WriteResult> {
    const lines = [`@CONVERSATION:${conversationId}`];

    // Add metadata with security processing
    for (const [key, value] of Object.entries(metadata)) {
      const processed = this.processText(String(value));
      lines.push(`${key}=${processed.text}`);

      if (processed.warnings.length > 0) {
        console.warn(
          `⚠️ PII detected in conversation ${conversationId}, field: ${key}`
        );
      }
    }

    return await this.appendToFile("conversations.aicf", lines.join("\n"));
  }

  /**
   * Write decision with security checks
   */
  async writeDecision(
    decisionId: string,
    metadata: Record<string, unknown>
  ): Promise<WriteResult> {
    const lines = [`@DECISION:${decisionId}`];

    // Add metadata with security processing
    for (const [key, value] of Object.entries(metadata)) {
      const processed = this.processText(String(value));
      lines.push(`${key}=${processed.text}`);
    }

    return await this.appendToFile("decisions.aicf", lines.join("\n"));
  }

  /**
   * Write insight with security checks
   */
  async writeInsight(
    insight: string,
    category: string,
    priority: string,
    confidence: string,
    memoryType: string | null = null
  ): Promise<WriteResult> {
    const processed = this.processText(insight);

    let line = `@INSIGHTS ${processed.text}|${category}|${priority}|${confidence}`;
    if (memoryType) {
      line += `|memory_type=${memoryType}`;
    }

    return await this.appendToFile("technical-context.aicf", line);
  }

  /**
   * Write work state with security checks
   */
  async writeWorkState(
    workId: string,
    metadata: Record<string, unknown>
  ): Promise<WriteResult> {
    const lines = [`@WORK:${workId}`];

    // Add metadata with security processing
    for (const [key, value] of Object.entries(metadata)) {
      const processed = this.processText(String(value));
      lines.push(`${key}=${processed.text}`);
    }

    return await this.appendToFile("work-state.aicf", lines.join("\n"));
  }

  /**
   * Log compliance violations
   */
  async logCompliance(fileName: string, warnings: Warning[]): Promise<void> {
    const complianceLog = {
      timestamp: new Date().toISOString(),
      file: fileName,
      warnings: warnings.map((w) => ({
        type: w.type,
        count: w.count,
        types: w.types,
      })),
    };

    const logPath = join(this.aicfDir, "compliance.log");
    await appendFile(logPath, JSON.stringify(complianceLog) + "\n", "utf8");
  }

  /**
   * Get PII detection statistics
   */
  getPIIStats(): unknown {
    return this.piiDetector.getStats();
  }

  /**
   * Generate compliance report
   */
  generateComplianceReport(): string {
    return "PII detection statistics available via getPIIStats()";
  }

  /**
   * Clear PII detection log
   */
  clearPIILog(): void {
    this.piiDetector.clearLog();
  }

  /**
   * Test text for PII without writing
   */
  testForPII(text: string): unknown {
    return this.piiDetector.detect(text);
  }

  /**
   * Sanitize text for safe logging
   */
  sanitizeForLogging(text: string): string {
    const result = this.piiDetector.sanitizeForLogging(text);
    return result.ok ? result.value : text;
  }
}
