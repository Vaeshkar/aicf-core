/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2025 Dennis van Leeuwen
 *
 * Tests for Result type system
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ok,
  err,
  map,
  andThen,
  combine,
  toError,
  type Result,
} from "../types/result.js";

describe("Result Type System", () => {
  describe("ok()", () => {
    it("should create a successful result", () => {
      const result = ok(42);
      assert.equal(result.ok, true);
      if (result.ok) {
        assert.equal(result.value, 42);
      }
    });

    it("should work with strings", () => {
      const result = ok("hello");
      assert.equal(result.ok, true);
      if (result.ok) {
        assert.equal(result.value, "hello");
      }
    });

    it("should work with objects", () => {
      const result = ok({ name: "test", value: 123 });
      assert.equal(result.ok, true);
      if (result.ok) {
        assert.deepEqual(result.value, { name: "test", value: 123 });
      }
    });
  });

  describe("err()", () => {
    it("should create an error result", () => {
      const result = err(new Error("test error"));
      assert.equal(result.ok, false);
      if (!result.ok) {
        assert.equal(result.error.message, "test error");
      }
    });

    it("should work with string errors", () => {
      const result = err("error message");
      assert.equal(result.ok, false);
      if (!result.ok) {
        assert.equal(result.error, "error message");
      }
    });
  });

  describe("map()", () => {
    it("should transform successful result", () => {
      const result = ok(10);
      const mapped = map(result, (x) => x * 2);
      assert.equal(mapped.ok, true);
      if (mapped.ok) {
        assert.equal(mapped.value, 20);
      }
    });

    it("should not transform error result", () => {
      const result: Result<number> = err(new Error("test"));
      const mapped = map(result, (x) => x * 2);
      assert.equal(mapped.ok, false);
      if (!mapped.ok) {
        assert.equal(mapped.error.message, "test");
      }
    });

    it("should chain multiple maps", () => {
      const result = ok(5);
      const mapped = map(map(result, (x) => x * 2), (x) => x + 1);
      assert.equal(mapped.ok, true);
      if (mapped.ok) {
        assert.equal(mapped.value, 11);
      }
    });
  });

  describe("andThen()", () => {
    it("should chain successful async operations", async () => {
      const result = ok(10);
      const chained = await andThen(result, async (x) => ok(x * 2));
      assert.equal(chained.ok, true);
      if (chained.ok) {
        assert.equal(chained.value, 20);
      }
    });

    it("should stop on first error", async () => {
      const result = ok(10);
      const chained = await andThen(result, async () =>
        err(new Error("failed"))
      );
      assert.equal(chained.ok, false);
      if (!chained.ok) {
        assert.equal(chained.error.message, "failed");
      }
    });

    it("should not execute if input is error", async () => {
      const result: Result<number> = err(new Error("initial error"));
      let executed = false;
      const chained = await andThen(result, async (x) => {
        executed = true;
        return ok(x * 2);
      });
      assert.equal(executed, false);
      assert.equal(chained.ok, false);
    });
  });

  describe("combine()", () => {
    it("should combine successful results", () => {
      const r1 = ok(1);
      const r2 = ok("hello");
      const r3 = ok(true);
      const combined = combine(r1, r2, r3);
      assert.equal(combined.ok, true);
      if (combined.ok) {
        assert.deepEqual(combined.value, [1, "hello", true]);
      }
    });

    it("should fail if any result is error", () => {
      const r1 = ok(1);
      const r2: Result<string> = err(new Error("failed"));
      const r3 = ok(true);
      const combined = combine(r1, r2, r3);
      assert.equal(combined.ok, false);
      if (!combined.ok) {
        assert.equal(combined.error.message, "failed");
      }
    });

    it("should return first error", () => {
      const r1: Result<number> = err(new Error("error 1"));
      const r2: Result<string> = err(new Error("error 2"));
      const combined = combine(r1, r2);
      assert.equal(combined.ok, false);
      if (!combined.ok) {
        assert.equal(combined.error.message, "error 1");
      }
    });
  });

  describe("toError()", () => {
    it("should convert Error to Error", () => {
      const error = new Error("test");
      const result = toError(error);
      assert.equal(result.message, "test");
    });

    it("should convert string to Error", () => {
      const result = toError("error message");
      assert.equal(result.message, "error message");
    });

    it("should convert unknown to Error", () => {
      const result = toError({ code: 123 });
      assert.ok(result.message.includes("123"));
    });

    it("should handle null", () => {
      const result = toError(null);
      assert.equal(result.message, "Unknown error");
    });

    it("should handle undefined", () => {
      const result = toError(undefined);
      assert.equal(result.message, "Unknown error");
    });
  });

  describe("Real-world scenarios", () => {
    it("should handle file read simulation", async () => {
      async function readFile(path: string): Promise<Result<string>> {
        if (path === "exists.txt") {
          return ok("file content");
        }
        return err(new Error("File not found"));
      }

      const result1 = await readFile("exists.txt");
      assert.equal(result1.ok, true);

      const result2 = await readFile("missing.txt");
      assert.equal(result2.ok, false);
    });

    it("should handle parsing pipeline", () => {
      function parseNumber(str: string): Result<number> {
        const num = Number(str);
        if (isNaN(num)) {
          return err(new Error("Invalid number"));
        }
        return ok(num);
      }

      const result1 = parseNumber("42");
      const doubled = map(result1, (x) => x * 2);
      assert.equal(doubled.ok, true);
      if (doubled.ok) {
        assert.equal(doubled.value, 84);
      }

      const result2 = parseNumber("invalid");
      const doubled2 = map(result2, (x) => x * 2);
      assert.equal(doubled2.ok, false);
    });

    it("should handle multiple async operations", async () => {
      async function step1(x: number): Promise<Result<number>> {
        return ok(x + 1);
      }

      async function step2(x: number): Promise<Result<number>> {
        return ok(x * 2);
      }

      async function step3(x: number): Promise<Result<string>> {
        return ok(`Result: ${x}`);
      }

      const initial = ok(5);
      const result = await andThen(
        await andThen(await andThen(initial, step1), step2),
        step3
      );

      assert.equal(result.ok, true);
      if (result.ok) {
        assert.equal(result.value, "Result: 12");
      }
    });
  });
});

