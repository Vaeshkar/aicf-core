/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2025 Dennis van Leeuwen
 *
 * Secure AICF Writer - Auto-redacts secrets before writing to AICF files
 * Part of AETHER Watcher Safety System
 */

import type { Result } from "../types/result.js";
import { ok, err } from "../types/result.js";
import { AICFWriter, type AICFWriterConfig } from "../aicf-writer.js";
import { detectPII, redactPII, containsAPIKeys } from "./pii-detector.js";
import type { FileSystem, Logger } from "../types/aicf.js";

export interface SecureAICFWriterConfig extends AICFWriterConfig {
  /**
   * Enable automatic secret redaction (default: true)
   */
  enableSecretRedaction?: boolean;

  /**
   * Log redactions to security log (default: true)
   */
  logRedactions?: boolean;

  /**
   * Throw error if secrets detected (default: false)
   * If false, secrets are redacted and logged
   */
  throwOnSecrets?: boolean;

  /**
   * Use smart masking instead of full redaction (default: true)
   * Smart masking shows first 4 + last 4 chars: sk-a****xyz
   */
  useSmartMasking?: boolean;
}

export interface RedactionLog {
  timestamp: string;
  fileName: string;
  secretsDetected: number;
  secretTypes: string[];
  action: "redacted" | "blocked";
}

/**
 * Secure AICF Writer - Wraps AICFWriter with automatic secret detection and redaction
 */
export class SecureAICFWriter {
  private readonly writer: AICFWriter;
  private readonly config: Required<SecureAICFWriterConfig>;
  private readonly redactionLog: RedactionLog[] = [];

  constructor(
    aicfDir = ".aicf",
    fs?: FileSystem,
    logger?: Logger,
    config?: SecureAICFWriterConfig
  ) {
    this.config = {
      maxFileSize: config?.maxFileSize ?? 100 * 1024 * 1024,
      lockTimeout: config?.lockTimeout ?? 5000,
      enablePIIRedaction: config?.enablePIIRedaction ?? true,
      enableSecretRedaction: config?.enableSecretRedaction ?? true,
      logRedactions: config?.logRedactions ?? true,
      throwOnSecrets: config?.throwOnSecrets ?? false,
      useSmartMasking: config?.useSmartMasking ?? true,
    };

    this.writer = new AICFWriter(aicfDir, fs, logger, {
      maxFileSize: this.config.maxFileSize,
      lockTimeout: this.config.lockTimeout,
      enablePIIRedaction: this.config.enablePIIRedaction,
    });
  }

  /**
   * Process text with security checks and redaction
   */
  private processText(text: string, fileName: string): Result<string> {
    if (!this.config.enableSecretRedaction) {
      return ok(text);
    }

    // Check for API keys
    if (containsAPIKeys(text)) {
      const detections = detectPII(text);
      const apiKeyTypes = detections
        .filter((d) =>
          [
            "apiKey",
            "awsKey",
            "githubToken",
            "openaiKey",
            "anthropicKey",
          ].includes(d.type)
        )
        .map((d) => d.type);

      // Log the detection
      if (this.config.logRedactions) {
        this.redactionLog.push({
          timestamp: new Date().toISOString(),
          fileName,
          secretsDetected: apiKeyTypes.length,
          secretTypes: apiKeyTypes,
          action: this.config.throwOnSecrets ? "blocked" : "redacted",
        });
      }

      // Throw if configured to do so
      if (this.config.throwOnSecrets) {
        return err(
          new Error(
            `Secrets detected in ${fileName}: ${apiKeyTypes.join(", ")}. Writing blocked.`
          )
        );
      }

      // Redact secrets
      const redactResult = redactPII(text);
      if (!redactResult.ok) {
        return redactResult;
      }

      return ok(redactResult.value.text);
    }

    return ok(text);
  }

  /**
   * Append line with security checks
   */
  async appendLine(fileName: string, data: string): Promise<Result<number>> {
    const processedResult = this.processText(data, fileName);
    if (!processedResult.ok) {
      return err(processedResult.error);
    }

    return await this.writer.appendLine(fileName, processedResult.value);
  }

  /**
   * Write conversation with security checks
   */
  async writeConversation(conversation: {
    id: string;
    timestamp: string;
    messages: number;
    tokens: number;
    app: string;
  }): Promise<Result<number>> {
    const data = `@CONVERSATION:${conversation.id}|timestamp=${conversation.timestamp}|messages=${conversation.messages}|tokens=${conversation.tokens}|app=${conversation.app}`;

    const processedResult = this.processText(data, "conversations.aicf");
    if (!processedResult.ok) {
      return err(processedResult.error);
    }

    return await this.writer.appendLine(
      "conversations.aicf",
      processedResult.value
    );
  }

  /**
   * Write decision with security checks
   */
  async writeDecision(decision: {
    decision: string;
    rationale: string;
    timestamp: string;
  }): Promise<Result<number>> {
    const processedDecision = this.processText(
      decision.decision,
      "decisions.aicf"
    );
    const processedRationale = this.processText(
      decision.rationale,
      "decisions.aicf"
    );

    if (!processedDecision.ok) return err(processedDecision.error);
    if (!processedRationale.ok) return err(processedRationale.error);

    return await this.writer.writeDecision({
      decision: processedDecision.value,
      rationale: processedRationale.value,
      timestamp: decision.timestamp,
    });
  }

  /**
   * Get redaction log
   */
  getRedactionLog(): RedactionLog[] {
    return [...this.redactionLog];
  }

  /**
   * Get redaction stats
   */
  getRedactionStats(): {
    totalRedactions: number;
    byFile: Record<string, number>;
    byType: Record<string, number>;
  } {
    const stats = {
      totalRedactions: this.redactionLog.length,
      byFile: {} as Record<string, number>,
      byType: {} as Record<string, number>,
    };

    for (const log of this.redactionLog) {
      stats.byFile[log.fileName] = (stats.byFile[log.fileName] ?? 0) + 1;
      for (const type of log.secretTypes) {
        stats.byType[type] = (stats.byType[type] ?? 0) + 1;
      }
    }

    return stats;
  }

  /**
   * Clear redaction log
   */
  clearRedactionLog(): void {
    this.redactionLog.length = 0;
  }
}
