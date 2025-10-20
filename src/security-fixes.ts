#!/usr/bin/env node

/**
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (c) 2025 Dennis van Leeuwen
 *
 * AICF Security Fixes Implementation
 * Addresses critical vulnerabilities identified in the security analysis
 */

import {
  closeSync,
  createReadStream,
  existsSync,
  openSync,
  renameSync,
  unlinkSync,
} from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";

export interface RedactionResult {
  text: string;
  redactions: Array<{ type: string; count: number }>;
  originalLength: number;
  redactedLength: number;
}

export interface SecurityConfig {
  maxFileSize?: number;
  maxMemoryUsage?: number;
  enablePIIRedaction?: boolean;
  enablePathValidation?: boolean;
  enableRateLimit?: boolean;
  rateLimitOperations?: number;
  rateLimitWindow?: number;
  allowedExtensions?: string[];
  maxStringLength?: number;
  maxObjectSize?: number;
}

interface ValidationSchema {
  type: string;
  required?: boolean;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  maxSize?: number;
}

/**
 * Path validation to prevent directory traversal attacks
 */
export function validatePath(
  inputPath: string,
  projectRoot: string = process.cwd()
): string {
  if (!inputPath || typeof inputPath !== "string") {
    throw new Error("Invalid path: must be a non-empty string");
  }

  // Decode URL encoding to prevent encoded path traversal attacks
  let decodedPath = inputPath;
  try {
    // Decode multiple times to handle double encoding
    decodedPath = decodeURIComponent(decodedPath);
    decodedPath = decodeURIComponent(decodedPath);
  } catch {
    // If decoding fails, use original path
  }

  // Resolve the absolute path
  const normalizedPath = resolve(decodedPath);
  const normalizedRoot = resolve(projectRoot);

  // Ensure the path is within the project root
  if (!normalizedPath.startsWith(normalizedRoot)) {
    throw new Error(
      `Security violation: Path '${inputPath}' is outside project root '${projectRoot}'`
    );
  }

  // Additional checks for common attack patterns
  const dangerousPatterns = [
    /\.\.[/\\]/, // Directory traversal
    /[<>:|"*?]/, // Invalid filename characters
    /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i, // Windows reserved names
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(decodedPath)) {
      throw new Error(
        `Security violation: Path contains dangerous pattern: ${inputPath}`
      );
    }
  }

  return normalizedPath;
}

/**
 * Sanitize pipe-delimited data to prevent injection attacks
 */
export function sanitizePipeData(input: unknown): string {
  if (input === null || input === undefined) {
    return "";
  }

  const str = typeof input === "string" ? input : String(input);

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
 * PII detection and redaction
 */
export function redactPII(text: string): RedactionResult {
  if (!text || typeof text !== "string") {
    return {
      text: text ?? "",
      redactions: [],
      originalLength: 0,
      redactedLength: 0,
    };
  }

  const piiPatterns = {
    creditCard: {
      pattern: /\b(?:\d{4}[\s-]?){3}\d{4}\b/g,
      replacement: "[REDACTED-CREDIT-CARD]",
    },
    ssn: {
      pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
      replacement: "[REDACTED-SSN]",
    },
    email: {
      pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      replacement: "[REDACTED-EMAIL]",
    },
    phone: {
      pattern:
        /\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g,
      replacement: "[REDACTED-PHONE]",
    },
    apiKey: {
      pattern: /\b[A-Za-z0-9]{20,}\b/g,
      replacement: "[REDACTED-API-KEY]",
    },
    ipAddress: {
      pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
      replacement: "[REDACTED-IP]",
    },
  };

  let redactedText = text;
  const redactionLog: Array<{ type: string; count: number }> = [];

  for (const [type, { pattern, replacement }] of Object.entries(piiPatterns)) {
    const matches = text.match(pattern);
    if (matches) {
      redactionLog.push({ type, count: matches.length });
      redactedText = redactedText.replace(pattern, replacement);
    }
  }

  return {
    text: redactedText,
    redactions: redactionLog,
    originalLength: text.length,
    redactedLength: redactedText.length,
  };
}

/**
 * Validate conversation data structure
 */
export function validateConversationData(
  data: Record<string, unknown>
): boolean {
  const schema: Record<string, ValidationSchema> = {
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
      if (
        rules.maxSize !== undefined &&
        typeof value === "object" &&
        value !== null
      ) {
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
    throw new Error(`Validation errors: ${errors.join(", ")}`);
  }

  return true;
}

/**
 * Safe atomic file operations with proper locking
 */
export async function atomicFileOperation<T>(
  filePath: string,
  operation: (tempFile: string) => Promise<T>
): Promise<T> {
  const lockFile = `${filePath}.lock`;
  const tempFile = `${filePath}.tmp.${Date.now()}.${process.pid}`;

  let lockfd: number | undefined;
  try {
    // Try to create lock file exclusively
    lockfd = openSync(lockFile, "wx");

    // Perform the operation with temp file
    const result = await operation(tempFile);

    // Atomically move temp file to target
    renameSync(tempFile, filePath);

    return result;
  } catch (error) {
    // Clean up temp file if it exists
    try {
      if (existsSync(tempFile)) {
        unlinkSync(tempFile);
      }
    } catch {
      // Ignore cleanup errors
    }

    throw error;
  } finally {
    // Release lock
    if (lockfd !== undefined) {
      try {
        closeSync(lockfd);
        unlinkSync(lockFile);
      } catch {
        // Ignore unlock errors
      }
    }
  }
}

/**
 * Memory-efficient file reading for large files
 */
export async function readFileStream<T>(
  filePath: string,
  callback: (line: string, lineNumber: number) => T | null
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const stream = createReadStream(filePath, { encoding: "utf8" });
    let buffer = "";
    let lineNumber = 0;
    const results: T[] = [];

    stream.on("data", (chunk: string | Buffer) => {
      const chunkStr = typeof chunk === "string" ? chunk : chunk.toString();
      buffer += chunkStr;
      const lines = buffer.split("\n");
      const partial = lines.pop();
      buffer = partial ?? ""; // Keep incomplete line in buffer

      for (const line of lines) {
        lineNumber++;
        const result = callback(line, lineNumber);
        if (result !== null) {
          results.push(result);
        }
      }
    });

    stream.on("end", () => {
      // Process final line if exists
      if (buffer.trim()) {
        lineNumber++;
        const result = callback(buffer, lineNumber);
        if (result !== null) {
          results.push(result);
        }
      }
      resolve(results);
    });

    stream.on("error", reject);
  });
}

/**
 * Rate limiting for write operations
 */
export function createRateLimiter<T>(
  maxOperations = 100,
  windowMs = 60000
): (operation: () => T) => T {
  const operations: number[] = [];

  return function rateLimited(operation: () => T): T {
    const now = Date.now();

    // Remove old operations outside the window
    while (operations.length > 0 && operations[0]! < now - windowMs) {
      operations.shift();
    }

    // Check if we've exceeded the limit
    if (operations.length >= maxOperations) {
      throw new Error(
        `Rate limit exceeded: ${maxOperations} operations per ${windowMs}ms`
      );
    }

    // Record this operation
    operations.push(now);

    return operation();
  };
}

/**
 * Checksum validation for data integrity
 */
export function calculateChecksum(data: unknown): string {
  return createHash("sha256").update(JSON.stringify(data)).digest("hex");
}

export function verifyChecksum(
  data: unknown,
  expectedChecksum: string
): boolean {
  const actualChecksum = calculateChecksum(data);
  return actualChecksum === expectedChecksum;
}

/**
 * Secure configuration validation
 */
export function validateConfig(
  config: Partial<SecurityConfig>
): SecurityConfig {
  const secureDefaults: SecurityConfig = {
    maxFileSize: 100 * 1024 * 1024, // 100MB
    maxMemoryUsage: 500 * 1024 * 1024, // 500MB
    enablePIIRedaction: true,
    enablePathValidation: true,
    enableRateLimit: true,
    rateLimitOperations: 100,
    rateLimitWindow: 60000,
    allowedExtensions: [".aicf"],
    maxStringLength: 10000,
    maxObjectSize: 1000000,
  };

  return { ...secureDefaults, ...config };
}

/**
 * Additional utility methods for compatibility with existing code
 */
export function sanitizeString(input: unknown): string {
  if (input === null || input === undefined) {
    return "";
  }

  const str = typeof input === "string" ? input : String(input);
  return sanitizePipeData(str);
}

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

export function sanitizeNumber(input: unknown): number {
  const num = Number(input);
  return isNaN(num) ? 0 : Math.max(0, Math.min(num, Number.MAX_SAFE_INTEGER));
}
