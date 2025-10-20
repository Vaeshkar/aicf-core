/**
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (c) 2025 Dennis van Leeuwen
 *
 * PII Detector - Detect and redact Personally Identifiable Information
 */

import type { Result } from "../types/result.js";
import { ok, err } from "../types/result.js";
import { PII_PATTERNS, type PIIType } from "./pii-patterns.js";

export interface PIIDetection {
  type: PIIType;
  value: string;
  index: number;
  length: number;
}

export interface PIIDetectorOptions {
  redactSSN?: boolean;
  redactCreditCard?: boolean;
  redactEmail?: boolean;
  redactPhone?: boolean;
  redactAPIKey?: boolean;
  redactIPAddress?: boolean;
  redactDateOfBirth?: boolean;
  redactPassport?: boolean;
  logDetections?: boolean;
  throwOnDetection?: boolean;
}

export interface PIIRedactionResult {
  text: string;
  detections: number;
  types: PIIType[];
  original: string;
}

export interface PIIDetectionLog {
  timestamp: string;
  count: number;
  types: PIIType[];
}

export interface PIIStats {
  totalDetections: number;
  totalScans: number;
  typeBreakdown: Record<string, number>;
  lastScan?: string | undefined;
}

/**
 * Detect PII in text
 */
export function detectPII(text: string): PIIDetection[] {
  const detections: PIIDetection[] = [];

  // Check each pattern
  for (const [type, { pattern }] of Object.entries(PII_PATTERNS)) {
    // Reset regex lastIndex
    pattern.lastIndex = 0;

    const matches = text.matchAll(pattern);

    for (const match of matches) {
      if (match.index !== undefined) {
        detections.push({
          type: type as PIIType,
          value: match[0],
          index: match.index,
          length: match[0].length,
        });
      }
    }
  }

  return detections;
}

/**
 * Check if text contains PII
 */
export function hasPII(text: string): boolean {
  return detectPII(text).length > 0;
}

/**
 * Redact PII from text
 */
export function redactPII(text: string): Result<PIIRedactionResult> {
  try {
    let redactedText = text;
    const detections = detectPII(text);

    // Sort detections by index (descending) to avoid offset issues
    detections.sort((a, b) => b.index - a.index);

    // Apply redactions
    for (const detection of detections) {
      const { type, index, length } = detection;
      const pattern = PII_PATTERNS[type];
      const replacement = pattern?.replacement ?? "[REDACTED]";

      redactedText =
        redactedText.substring(0, index) +
        replacement +
        redactedText.substring(index + length);
    }

    return ok({
      text: redactedText,
      detections: detections.length,
      types: [...new Set(detections.map((d) => d.type))],
      original: text,
    });
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Sanitize text for logging (with PII redacted)
 */
export function sanitizeForLogging(text: string): Result<string> {
  const result = redactPII(text);
  if (!result.ok) {
    return result;
  }
  return ok(result.value.text);
}

/**
 * Check if text contains API keys
 */
export function containsAPIKeys(text: string): boolean {
  const apiKeyTypes: PIIType[] = [
    "apiKey",
    "awsKey",
    "githubToken",
    "openaiKey",
  ];

  for (const type of apiKeyTypes) {
    const pattern = PII_PATTERNS[type]?.pattern;
    if (pattern) {
      pattern.lastIndex = 0;
      if (pattern.test(text)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * PIIDetector class for stateful detection with logging
 */
export class PIIDetector {
  private options: Required<PIIDetectorOptions>;
  private detectionLog: PIIDetectionLog[] = [];

  constructor(options: PIIDetectorOptions = {}) {
    this.options = {
      redactSSN: true,
      redactCreditCard: true,
      redactEmail: true,
      redactPhone: true,
      redactAPIKey: true,
      redactIPAddress: true,
      redactDateOfBirth: true,
      redactPassport: true,
      logDetections: true,
      throwOnDetection: false,
      ...options,
    };
  }

  /**
   * Detect PII with logging
   */
  detect(text: string): Result<PIIDetection[]> {
    try {
      const detections = detectPII(text);

      // Log detections
      if (this.options.logDetections && detections.length > 0) {
        this.detectionLog.push({
          timestamp: new Date().toISOString(),
          count: detections.length,
          types: [...new Set(detections.map((d) => d.type))],
        });
      }

      // Throw error if configured
      if (this.options.throwOnDetection && detections.length > 0) {
        return err(
          new Error(
            `PII detected: ${detections.length} instances of ${detections.map((d) => d.type).join(", ")}`
          )
        );
      }

      return ok(detections);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Redact PII with logging
   */
  redact(text: string): Result<PIIRedactionResult> {
    const detectResult = this.detect(text);
    if (!detectResult.ok) {
      return detectResult;
    }

    return redactPII(text);
  }

  /**
   * Check if text has PII
   */
  hasPII(text: string): boolean {
    return hasPII(text);
  }

  /**
   * Get detection statistics
   */
  getStats(): PIIStats {
    const totalDetections = this.detectionLog.reduce(
      (sum, log) => sum + log.count,
      0
    );
    const allTypes = this.detectionLog.flatMap((log) => log.types);
    const typeCount: Record<string, number> = {};

    allTypes.forEach((type) => {
      typeCount[type] = (typeCount[type] ?? 0) + 1;
    });

    const lastLog = this.detectionLog[this.detectionLog.length - 1];

    return {
      totalDetections,
      totalScans: this.detectionLog.length,
      typeBreakdown: typeCount,
      lastScan: lastLog?.timestamp ?? undefined,
    };
  }

  /**
   * Clear detection log
   */
  clearLog(): void {
    this.detectionLog = [];
  }

  /**
   * Sanitize for logging
   */
  sanitizeForLogging(text: string): Result<string> {
    return sanitizeForLogging(text);
  }

  /**
   * Check for API keys
   */
  containsAPIKeys(text: string): boolean {
    return containsAPIKeys(text);
  }
}
