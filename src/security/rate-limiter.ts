/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2025 Dennis van Leeuwen
 *
 * Rate Limiter - Prevent abuse through rate limiting
 */

import type { Result } from "../types/result.js";
import { ok, err } from "../types/result.js";

export interface RateLimiterOptions {
  maxOperations: number;
  windowMs: number;
}

/**
 * Rate limiter for operations
 */
export class RateLimiter {
  private operations: number[] = [];
  private maxOperations: number;
  private windowMs: number;

  constructor(options: RateLimiterOptions) {
    this.maxOperations = options.maxOperations;
    this.windowMs = options.windowMs;
  }

  /**
   * Check if operation is allowed
   */
  private isAllowed(): boolean {
    const now = Date.now();

    // Remove old operations outside the window
    while (
      this.operations.length > 0 &&
      (this.operations[0] ?? 0) < now - this.windowMs
    ) {
      this.operations.shift();
    }

    // Check if we've exceeded the limit
    return this.operations.length < this.maxOperations;
  }

  /**
   * Record an operation
   */
  private record(): void {
    this.operations.push(Date.now());
  }

  /**
   * Execute operation with rate limiting
   */
  async execute<T>(operation: () => Promise<T>): Promise<Result<T>> {
    if (!this.isAllowed()) {
      return err(
        new Error(
          `Rate limit exceeded: ${this.maxOperations} operations per ${this.windowMs}ms`
        )
      );
    }

    this.record();

    try {
      const result = await operation();
      return ok(result);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Execute sync operation with rate limiting
   */
  executeSync<T>(operation: () => T): Result<T> {
    if (!this.isAllowed()) {
      return err(
        new Error(
          `Rate limit exceeded: ${this.maxOperations} operations per ${this.windowMs}ms`
        )
      );
    }

    this.record();

    try {
      const result = operation();
      return ok(result);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Reset rate limiter
   */
  reset(): void {
    this.operations = [];
  }

  /**
   * Get current operation count
   */
  getCount(): number {
    const now = Date.now();
    return this.operations.filter((op) => op >= now - this.windowMs).length;
  }
}

/**
 * Create a rate limiter
 */
export function createRateLimiter(
  maxOperations = 100,
  windowMs = 60000
): RateLimiter {
  return new RateLimiter({ maxOperations, windowMs });
}
