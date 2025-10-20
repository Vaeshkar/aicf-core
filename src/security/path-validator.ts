/**
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (c) 2025 Dennis van Leeuwen
 *
 * Path Validation - Prevent directory traversal attacks
 */

import { resolve, normalize } from "node:path";
import type { Result } from "../types/result.js";
import { ok, err } from "../types/result.js";

/**
 * Validate path to prevent directory traversal attacks
 */
export function validatePath(
  inputPath: string,
  projectRoot: string = process.cwd()
): Result<string> {
  if (!inputPath || typeof inputPath !== "string") {
    return err(new Error("Invalid path: must be a non-empty string"));
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
    return err(
      new Error(
        `Security violation: Path '${inputPath}' is outside project root '${projectRoot}'`
      )
    );
  }

  // Additional checks for common attack patterns
  const dangerousPatterns = [
    /\.\.[\/\\]/, // Directory traversal
    /[<>:|"*?]/, // Invalid filename characters
    /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i, // Windows reserved names
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(decodedPath)) {
      return err(
        new Error(
          `Security violation: Path contains dangerous pattern: ${inputPath}`
        )
      );
    }
  }

  return ok(normalizedPath);
}

/**
 * Normalize path safely
 */
export function normalizePath(inputPath: string): Result<string> {
  try {
    const normalized = normalize(inputPath);

    // Check for directory traversal
    if (normalized.includes("..")) {
      return err(new Error("Path traversal detected"));
    }

    return ok(normalized);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}
