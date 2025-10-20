/**
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (c) 2025 Dennis van Leeuwen
 *
 * Data Sanitization - Prevent injection attacks
 */

import type { Result } from "../types/result.js";
import { ok } from "../types/result.js";

/**
 * Sanitize pipe-delimited data to prevent injection attacks
 */
export function sanitizePipeData(input: unknown): string {
  if (input === null || input === undefined) {
    return "";
  }

  let str = typeof input === "string" ? input : String(input);

  return (
    str
      // Escape pipe characters
      .replace(/\|/g, "\\|")
      // Escape newlines and carriage returns
      .replace(/\r?\n/g, "\\n")
      .replace(/\r/g, "\\r")
      // Escape AICF section markers
      .replace(/@([A-Z_]+):/g, "\\@$1:")
      .replace(/@([A-Z_]+)$/g, "\\@$1")
      // Remove null bytes and other control characters
      .replace(/[\x00-\x1F\x7F]/g, "")
      // Limit length to prevent buffer overflow
      .slice(0, 10000)
  );
}

/**
 * Sanitize string input
 */
export function sanitizeString(input: unknown): string {
  if (input === null || input === undefined) {
    return "";
  }

  const str = typeof input === "string" ? input : String(input);
  return sanitizePipeData(str);
}

/**
 * Sanitize timestamp input
 */
export function sanitizeTimestamp(input: unknown): string {
  if (!input) {
    return new Date().toISOString();
  }

  const timestamp = new Date(input as string | number | Date);
  if (isNaN(timestamp.getTime())) {
    return new Date().toISOString();
  }

  return timestamp.toISOString();
}

/**
 * Sanitize number input
 */
export function sanitizeNumber(input: unknown): number {
  const num = Number(input);
  return isNaN(num) ? 0 : Math.max(0, Math.min(num, Number.MAX_SAFE_INTEGER));
}

/**
 * Validate conversation data structure
 */
interface ConversationData {
  id?: string;
  messages?: number;
  tokens?: number;
  timestamp_start?: string;
  timestamp_end?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

interface ValidationRule {
  type: "string" | "number" | "object";
  required?: boolean;
  maxLength?: number;
  min?: number;
  max?: number;
  maxSize?: number;
  pattern?: RegExp;
}

type ValidationSchema = Record<string, ValidationRule>;

export function validateConversationData(data: ConversationData): Result<true> {
  const schema: ValidationSchema = {
    id: { type: "string", required: true, maxLength: 100 },
    messages: { type: "number", min: 0, max: 100000 },
    tokens: { type: "number", min: 0, max: 10000000 },
    timestamp_start: {
      type: "string",
      pattern: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
    },
    timestamp_end: {
      type: "string",
      pattern: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
    },
    metadata: { type: "object", maxSize: 1000000 }, // 1MB limit
  };

  const errors: string[] = [];

  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];

    if (rules.required && (value === undefined || value === null)) {
      errors.push(`Required field '${field}' is missing`);
      continue;
    }

    if (value !== undefined && value !== null) {
      // Type validation
      if (rules.type === "string" && typeof value !== "string") {
        errors.push(`Field '${field}' must be a string`);
      } else if (rules.type === "number" && typeof value !== "number") {
        errors.push(`Field '${field}' must be a number`);
      } else if (rules.type === "object" && typeof value !== "object") {
        errors.push(`Field '${field}' must be an object`);
      }

      // Range validation
      if (
        rules.min !== undefined &&
        typeof value === "number" &&
        value < rules.min
      ) {
        errors.push(`Field '${field}' must be >= ${rules.min}`);
      }
      if (
        rules.max !== undefined &&
        typeof value === "number" &&
        value > rules.max
      ) {
        errors.push(`Field '${field}' must be <= ${rules.max}`);
      }

      // Length validation
      if (
        rules.maxLength !== undefined &&
        typeof value === "string" &&
        value.length > rules.maxLength
      ) {
        errors.push(
          `Field '${field}' exceeds maximum length of ${rules.maxLength}`
        );
      }

      // Size validation for objects
      if (rules.maxSize !== undefined && typeof value === "object") {
        const size = JSON.stringify(value).length;
        if (size > rules.maxSize) {
          errors.push(
            `Field '${field}' exceeds maximum size of ${rules.maxSize} bytes`
          );
        }
      }

      // Pattern validation
      if (
        rules.pattern &&
        typeof value === "string" &&
        !rules.pattern.test(value)
      ) {
        errors.push(`Field '${field}' does not match required pattern`);
      }
    }
  }

  if (errors.length > 0) {
    return {
      ok: false,
      error: new Error(`Validation errors: ${errors.join(", ")}`),
    };
  }

  return ok(true);
}
