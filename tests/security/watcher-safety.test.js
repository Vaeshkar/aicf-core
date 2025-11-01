/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2025 Dennis van Leeuwen
 *
 * Watcher Safety System Tests
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { SecureAICFWriter } from "../../dist/security/secure-aicf-writer.js";
import { smartMask, maskAPIKey } from "../../dist/security/pii-patterns.js";
import {
  containsAPIKeys,
  detectPII,
} from "../../dist/security/pii-detector.js";
import { mkdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";

// Use a test directory within the project
const TEST_DIR = join(process.cwd(), "tests", "security", ".test-data");

describe("Watcher Safety System", () => {
  before(() => {
    // Clean up and create test directory
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
    mkdirSync(TEST_DIR, { recursive: true });
  });

  after(() => {
    // Clean up test directory
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe("Smart Masking", () => {
    it("should mask long strings with first 4 + last 4", () => {
      const key = "sk-ant-api03-abcdefghijklmnopqrstuvwxyz1234567890";
      const masked = smartMask(key, 4);

      assert.ok(masked.includes("sk-a"));
      assert.ok(masked.includes("7890"));
      assert.ok(masked.includes("****"));
      assert.ok(masked.length < key.length);
    });

    it("should mask short strings completely", () => {
      const key = "abc123";
      const masked = smartMask(key, 4);

      assert.strictEqual(masked, "******");
    });

    it("should handle API key masking", () => {
      const key = "sk-ant-api03-1234567890abcdefghijklmnopqrstuvwxyz";
      const masked = maskAPIKey(key);

      assert.match(masked, /^sk-a\*{4}wxyz$/);
    });
  });

  describe("Anthropic API Key Detection", () => {
    it("should detect Anthropic API keys", () => {
      const text = "My key is sk-ant-api03-" + "a".repeat(95);
      const detections = detectPII(text);

      assert.ok(detections.length > 0);
      assert.ok(detections.some((d) => d.type === "anthropicKey"));
    });

    it("should detect API keys in containsAPIKeys", () => {
      const text = "My key is sk-ant-api03-" + "a".repeat(95);

      assert.strictEqual(containsAPIKeys(text), true);
    });

    it("should not detect non-API-key text", () => {
      const text = "This is just normal text without any secrets";

      assert.strictEqual(containsAPIKeys(text), false);
    });
  });

  describe("SecureAICFWriter", () => {
    it("should create writer with default config", () => {
      const writer = new SecureAICFWriter(TEST_DIR);

      assert.ok(writer);
    });

    it("should redact secrets when writing conversations", async () => {
      const writer = new SecureAICFWriter(TEST_DIR, undefined, undefined, {
        enableSecretRedaction: true,
        throwOnSecrets: false,
      });

      const result = await writer.writeConversation({
        id: "test-123",
        timestamp: "2025-01-01T00:00:00Z",
        messages: 10,
        tokens: 1000,
        app: "test",
      });

      assert.strictEqual(result.ok, true);
    });

    it("should throw on secrets if configured", async () => {
      const writer = new SecureAICFWriter(TEST_DIR, undefined, undefined, {
        enableSecretRedaction: true,
        throwOnSecrets: true,
      });

      const secretText = "sk-ant-api03-" + "a".repeat(95);

      const result = await writer.appendLine("test.aicf", secretText);

      assert.strictEqual(result.ok, false);
      if (!result.ok) {
        assert.ok(result.error.message.includes("Secrets detected"));
      }
    });

    it("should log redactions", async () => {
      const writer = new SecureAICFWriter(TEST_DIR, undefined, undefined, {
        enableSecretRedaction: true,
        logRedactions: true,
        throwOnSecrets: false,
      });

      const secretText = "My key is sk-ant-api03-" + "a".repeat(95);

      await writer.appendLine("test.aicf", secretText);

      const log = writer.getRedactionLog();
      assert.ok(log.length > 0);
      assert.strictEqual(log[0]?.fileName, "test.aicf");
      assert.strictEqual(log[0]?.action, "redacted");
    });

    it("should provide redaction stats", async () => {
      const writer = new SecureAICFWriter(TEST_DIR, undefined, undefined, {
        enableSecretRedaction: true,
        logRedactions: true,
        throwOnSecrets: false,
      });

      const secretText1 = "My key is sk-ant-api03-" + "a".repeat(95);
      const secretText2 = "Another key: sk-" + "b".repeat(48);

      await writer.appendLine("test1.aicf", secretText1);
      await writer.appendLine("test2.aicf", secretText2);

      const stats = writer.getRedactionStats();
      assert.ok(stats.totalRedactions > 0);
      assert.ok(stats.byFile["test1.aicf"]);
      assert.ok(stats.byFile["test2.aicf"]);
    });

    it("should clear redaction log", async () => {
      const writer = new SecureAICFWriter(TEST_DIR, undefined, undefined, {
        enableSecretRedaction: true,
        logRedactions: true,
        throwOnSecrets: false,
      });

      const secretText = "My key is sk-ant-api03-" + "a".repeat(95);

      await writer.appendLine("test.aicf", secretText);

      assert.ok(writer.getRedactionLog().length > 0);

      writer.clearRedactionLog();

      assert.strictEqual(writer.getRedactionLog().length, 0);
    });

    it("should handle decisions with secrets", async () => {
      const writer = new SecureAICFWriter(TEST_DIR, undefined, undefined, {
        enableSecretRedaction: true,
        throwOnSecrets: false,
      });

      const result = await writer.writeDecision({
        decision: "Use API key for authentication",
        rationale: "We need sk-ant-api03-" + "a".repeat(95) + " for Claude",
        timestamp: "2025-01-01T00:00:00Z",
      });

      assert.strictEqual(result.ok, true);

      const log = writer.getRedactionLog();
      assert.ok(log.length > 0);
    });
  });

  describe("Multiple API Key Types", () => {
    it("should detect OpenAI keys", () => {
      const text = "My OpenAI key: sk-" + "a".repeat(48);

      assert.strictEqual(containsAPIKeys(text), true);
    });

    it("should detect GitHub tokens", () => {
      const text = "My GitHub token: ghp_" + "a".repeat(36);

      assert.strictEqual(containsAPIKeys(text), true);
    });

    it("should detect AWS keys", () => {
      const text = "My AWS key: AKIA" + "A".repeat(16);

      assert.strictEqual(containsAPIKeys(text), true);
    });

    it("should detect all key types in one text", () => {
      const text = `
        OpenAI: sk-${"a".repeat(48)}
        Anthropic: sk-ant-api03-${"b".repeat(95)}
        GitHub: ghp_${"c".repeat(36)}
        AWS: AKIA${"D".repeat(16)}
      `;

      const detections = detectPII(text);
      const types = detections.map((d) => d.type);

      assert.ok(types.includes("openaiKey"));
      assert.ok(types.includes("anthropicKey"));
      assert.ok(types.includes("githubToken"));
      assert.ok(types.includes("awsKey"));
    });
  });
});
