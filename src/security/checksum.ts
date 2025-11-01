/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2025 Dennis van Leeuwen
 *
 * Checksum - Data integrity validation
 */

import { createHash } from "node:crypto";
import type { Result } from "../types/result.js";
import { ok, err } from "../types/result.js";

/**
 * Calculate SHA-256 checksum of data
 */
export function calculateChecksum(data: unknown): string {
  const hash = createHash("sha256");
  hash.update(JSON.stringify(data));
  return hash.digest("hex");
}

/**
 * Verify checksum matches expected value
 */
export function verifyChecksum(
  data: unknown,
  expectedChecksum: string
): boolean {
  const actualChecksum = calculateChecksum(data);
  return actualChecksum === expectedChecksum;
}

/**
 * Calculate checksum with Result type
 */
export function calculateChecksumSafe(data: unknown): Result<string> {
  try {
    return ok(calculateChecksum(data));
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Verify checksum with Result type
 */
export function verifyChecksumSafe(
  data: unknown,
  expectedChecksum: string
): Result<boolean> {
  try {
    return ok(verifyChecksum(data, expectedChecksum));
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}
