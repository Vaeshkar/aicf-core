/**
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (c) 2025 Dennis van Leeuwen
 *
 * Input Validator - Comprehensive input validation and sanitization
 */

import type { Result } from "../types/result.js";
import { ok, err } from "../types/result.js";

export interface ValidationRule {
  type: "string" | "number" | "boolean" | "object" | "array" | "email" | "url" | "uuid" | "date";
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: string[];
  custom?: (value: unknown) => boolean;
}

export interface ValidationSchema {
  [key: string]: ValidationRule;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

/**
 * Validate input against schema
 */
export function validateInput(
  input: Record<string, unknown>,
  schema: ValidationSchema
): Result<true, ValidationError[]> {
  const errors: ValidationError[] = [];

  for (const [field, rule] of Object.entries(schema)) {
    const value = input[field];

    // Required check
    if (rule.required && (value === undefined || value === null || value === "")) {
      errors.push({
        field,
        message: `Field '${field}' is required`,
        value,
      });
      continue;
    }

    // Skip validation if not required and value is empty
    if (!rule.required && (value === undefined || value === null)) {
      continue;
    }

    // Type validation
    const typeValid = validateType(value, rule.type);
    if (!typeValid.ok) {
      errors.push({
        field,
        message: `Field '${field}' must be of type '${rule.type}'`,
        value,
      });
      continue;
    }

    // String validations
    if (rule.type === "string" && typeof value === "string") {
      if (rule.minLength !== undefined && value.length < rule.minLength) {
        errors.push({
          field,
          message: `Field '${field}' must be at least ${rule.minLength} characters`,
          value,
        });
      }

      if (rule.maxLength !== undefined && value.length > rule.maxLength) {
        errors.push({
          field,
          message: `Field '${field}' must be at most ${rule.maxLength} characters`,
          value,
        });
      }

      if (rule.pattern && !rule.pattern.test(value)) {
        errors.push({
          field,
          message: `Field '${field}' does not match required pattern`,
          value,
        });
      }

      if (rule.enum && !rule.enum.includes(value)) {
        errors.push({
          field,
          message: `Field '${field}' must be one of: ${rule.enum.join(", ")}`,
          value,
        });
      }
    }

    // Number validations
    if (rule.type === "number" && typeof value === "number") {
      if (rule.min !== undefined && value < rule.min) {
        errors.push({
          field,
          message: `Field '${field}' must be at least ${rule.min}`,
          value,
        });
      }

      if (rule.max !== undefined && value > rule.max) {
        errors.push({
          field,
          message: `Field '${field}' must be at most ${rule.max}`,
          value,
        });
      }
    }

    // Custom validation
    if (rule.custom && !rule.custom(value)) {
      errors.push({
        field,
        message: `Field '${field}' failed custom validation`,
        value,
      });
    }
  }

  if (errors.length > 0) {
    return err(errors);
  }

  return ok(true);
}

/**
 * Validate type
 */
function validateType(value: unknown, type: ValidationRule["type"]): Result<true> {
  switch (type) {
    case "string":
      return typeof value === "string" ? ok(true) : err(new Error("Not a string"));

    case "number":
      return typeof value === "number" && !isNaN(value)
        ? ok(true)
        : err(new Error("Not a number"));

    case "boolean":
      return typeof value === "boolean" ? ok(true) : err(new Error("Not a boolean"));

    case "object":
      return typeof value === "object" && value !== null && !Array.isArray(value)
        ? ok(true)
        : err(new Error("Not an object"));

    case "array":
      return Array.isArray(value) ? ok(true) : err(new Error("Not an array"));

    case "email":
      if (typeof value !== "string") return err(new Error("Not a string"));
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value) ? ok(true) : err(new Error("Invalid email"));

    case "url":
      if (typeof value !== "string") return err(new Error("Not a string"));
      try {
        new URL(value);
        return ok(true);
      } catch {
        return err(new Error("Invalid URL"));
      }

    case "uuid":
      if (typeof value !== "string") return err(new Error("Not a string"));
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return uuidRegex.test(value) ? ok(true) : err(new Error("Invalid UUID"));

    case "date":
      if (typeof value !== "string") return err(new Error("Not a string"));
      const date = new Date(value);
      return !isNaN(date.getTime()) ? ok(true) : err(new Error("Invalid date"));

    default:
      return err(new Error(`Unknown type: ${type}`));
  }
}

/**
 * Sanitize string to prevent XSS
 */
export function sanitizeHTML(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

/**
 * Sanitize SQL to prevent injection
 */
export function sanitizeSQL(input: string): string {
  return input
    .replace(/'/g, "''")
    .replace(/;/g, "")
    .replace(/--/g, "")
    .replace(/\/\*/g, "")
    .replace(/\*\//g, "");
}

/**
 * Validate and sanitize file path
 */
export function sanitizeFilePath(input: string): Result<string> {
  // Remove null bytes
  if (input.includes("\0")) {
    return err(new Error("Path contains null bytes"));
  }

  // Remove dangerous characters
  const sanitized = input
    .replace(/[<>:"|?*]/g, "")
    .replace(/\.\./g, "")
    .trim();

  if (sanitized.length === 0) {
    return err(new Error("Path is empty after sanitization"));
  }

  return ok(sanitized);
}

/**
 * Validate conversation ID format
 */
export function validateConversationId(id: string): Result<true> {
  if (!id || typeof id !== "string") {
    return err(new Error("Conversation ID must be a non-empty string"));
  }

  if (id.length > 100) {
    return err(new Error("Conversation ID must be at most 100 characters"));
  }

  // Allow alphanumeric, hyphens, underscores
  const validPattern = /^[a-zA-Z0-9_-]+$/;
  if (!validPattern.test(id)) {
    return err(
      new Error("Conversation ID must contain only alphanumeric characters, hyphens, and underscores")
    );
  }

  return ok(true);
}

/**
 * Validate timestamp format
 */
export function validateTimestamp(timestamp: string): Result<true> {
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) {
    return err(new Error("Invalid timestamp format"));
  }

  // Check if timestamp is not in the future
  if (date.getTime() > Date.now() + 60000) {
    // Allow 1 minute clock skew
    return err(new Error("Timestamp cannot be in the future"));
  }

  return ok(true);
}

