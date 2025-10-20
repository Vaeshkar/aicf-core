/**
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (c) 2025 Dennis van Leeuwen
 *
 * Result Type - Type-safe error handling without exceptions
 */

/**
 * Result type for operations that can succeed or fail
 * Replaces throwing exceptions with explicit error handling
 */
export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

/**
 * Create a successful result
 */
export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

/**
 * Create a failed result
 */
export function err<E = Error>(error: E): Result<never, E> {
  return { ok: false, error };
}

/**
 * Convert unknown error to Error instance
 */
export function toError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === "string") {
    return new Error(error);
  }

  if (error === null || error === undefined) {
    return new Error("Unknown error");
  }

  // For objects, try to extract meaningful information
  if (typeof error === "object") {
    try {
      return new Error(JSON.stringify(error));
    } catch {
      return new Error(String(error));
    }
  }

  return new Error(String(error));
}

/**
 * Map a Result's success value to a new value
 */
export function map<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E> {
  if (result.ok) {
    return ok(fn(result.value));
  }
  return result;
}

/**
 * Map a Result's error value to a new error
 */
export function mapError<T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => F
): Result<T, F> {
  if (!result.ok) {
    return err(fn(result.error));
  }
  return result;
}

/**
 * Chain async operations that return Results
 */
export async function andThen<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Promise<Result<U, E>>
): Promise<Result<U, E>> {
  if (result.ok) {
    return await fn(result.value);
  }
  return result;
}

/**
 * Unwrap a Result, throwing if it's an error
 * Use sparingly - prefer explicit error handling
 */
export function unwrap<T>(result: Result<T>): T {
  if (result.ok) {
    return result.value;
  }
  throw result.error;
}

/**
 * Unwrap a Result with a default value if it's an error
 */
export function unwrapOr<T>(result: Result<T>, defaultValue: T): T {
  if (result.ok) {
    return result.value;
  }
  return defaultValue;
}

/**
 * Combine multiple Results into a single Result
 * Returns error if any Result is an error
 */
export function combine<T extends readonly unknown[]>(
  ...results: { [K in keyof T]: Result<T[K]> }
): Result<T> {
  const values: unknown[] = [];

  for (const result of results) {
    if (!result.ok) {
      return result as Result<never>;
    }
    values.push(result.value);
  }

  return ok(values as unknown as T);
}

/**
 * Wrap a function that might throw into a Result-returning function
 */
export function tryCatch<T, A extends unknown[]>(
  fn: (...args: A) => T
): (...args: A) => Result<T> {
  return (...args: A): Result<T> => {
    try {
      return ok(fn(...args));
    } catch (error) {
      return err(toError(error));
    }
  };
}

/**
 * Wrap an async function that might throw into a Result-returning function
 */
export function tryCatchAsync<T, A extends unknown[]>(
  fn: (...args: A) => Promise<T>
): (...args: A) => Promise<Result<T>> {
  return async (...args: A): Promise<Result<T>> => {
    try {
      const value = await fn(...args);
      return ok(value);
    } catch (error) {
      return err(toError(error));
    }
  };
}

/**
 * Check if a value is a Result
 */
export function isResult<T>(value: unknown): value is Result<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    "ok" in value &&
    typeof (value as { ok: unknown }).ok === "boolean"
  );
}

/**
 * Async version of map
 */
export async function mapAsync<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Promise<U>
): Promise<Result<U, E>> {
  if (result.ok) {
    return ok(await fn(result.value));
  }
  return result;
}

/**
 * Filter a Result based on a predicate
 */
export function filter<T, E>(
  result: Result<T, E>,
  predicate: (value: T) => boolean,
  errorFn: () => E
): Result<T, E> {
  if (result.ok && !predicate(result.value)) {
    return err(errorFn());
  }
  return result;
}
