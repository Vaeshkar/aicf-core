/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2025 Dennis van Leeuwen
 *
 * Safe File Operations - Atomic operations with proper locking
 */

import { readFile } from "node:fs/promises";
import {
  existsSync,
  openSync,
  closeSync,
  unlinkSync,
  renameSync,
} from "node:fs";
import { createReadStream } from "node:fs";
import type { Result } from "../types/result.js";
import { ok, err, toError } from "../types/result.js";

/**
 * Safe atomic file operation with proper locking
 */
export async function atomicFileOperation<T>(
  filePath: string,
  operation: (tempPath: string) => Promise<T>
): Promise<Result<T>> {
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

    return ok(result);
  } catch (error) {
    // Clean up temp file if it exists
    try {
      if (existsSync(tempFile)) {
        unlinkSync(tempFile);
      }
    } catch {
      // Ignore cleanup errors
    }

    return err(toError(error));
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
 * Stream callback for processing lines
 */
export type StreamLineCallback = (line: string, lineNumber: number) => unknown;

/**
 * Memory-efficient file reading for large files
 */
export async function readFileStream(
  filePath: string,
  callback: StreamLineCallback
): Promise<Result<unknown[]>> {
  return new Promise((resolve) => {
    const stream = createReadStream(filePath, { encoding: "utf8" });
    let buffer = "";
    let lineNumber = 0;
    const results: unknown[] = [];

    stream.on("data", (chunk: string | Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? ""; // Keep incomplete line in buffer

      for (const line of lines) {
        lineNumber++;
        const result = callback(line, lineNumber);
        if (result !== undefined && result !== null) {
          results.push(result);
        }
      }
    });

    stream.on("end", () => {
      // Process final line if exists
      if (buffer.trim()) {
        lineNumber++;
        const result = callback(buffer, lineNumber);
        if (result !== undefined && result !== null) {
          results.push(result);
        }
      }
      resolve(ok(results));
    });

    stream.on("error", (error) => {
      resolve(err(toError(error)));
    });
  });
}

/**
 * Safe file read with error handling
 */
export async function safeReadFile(filePath: string): Promise<Result<string>> {
  try {
    const content = await readFile(filePath, "utf-8");
    return ok(content);
  } catch (error) {
    return err(toError(error));
  }
}

/**
 * Check if file exists safely
 */
export function fileExists(filePath: string): boolean {
  return existsSync(filePath);
}
