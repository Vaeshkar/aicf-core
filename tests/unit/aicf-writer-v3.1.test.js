/**
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (c) 2025 Dennis van Leeuwen
 *
 * AICF Writer v3.1 Unit Tests
 * Tests for new semantic tags: @SESSION, @EMBEDDING, @CONSOLIDATION
 */

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { mkdir, rm, readFile, access } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { AICFWriter } from "../../dist/aicf-writer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe("AICFWriter v3.1 Features", () => {
  let writer;
  let tempDir;

  beforeEach(async () => {
    tempDir = join(__dirname, `../.test-aicf-writer-v3.1-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    writer = new AICFWriter(tempDir);
  });

  afterEach(async () => {
    if (tempDir) {
      try {
        await rm(tempDir, { recursive: true, force: true });
      } catch (err) {
        // Ignore cleanup errors
      }
    }
  });

  describe("Session Writing (@SESSION)", () => {
    it("should write session with all required fields", async () => {
      const sessionData = {
        id: "session_001",
        app_name: "aether",
        user_id: "vaeshkar",
        created_at: "2025-10-31T08:00:00Z",
        last_update_time: "2025-10-31T09:30:00Z",
        status: "active",
      };

      const result = await writer.writeSession(sessionData);

      assert.strictEqual(result.ok, true);
      assert.ok(result.value > 0);

      const filePath = join(tempDir, "sessions.aicf");
      await access(filePath); // Throws if file doesn't exist

      const content = await readFile(filePath, "utf8");
      assert.ok(content.includes("@SESSION:session_001"));
      assert.ok(content.includes("app_name=aether"));
      assert.ok(content.includes("user_id=vaeshkar"));
      assert.ok(content.includes("status=active"));
    });

    it("should write session with optional fields", async () => {
      const sessionData = {
        id: "session_002",
        app_name: "aether",
        user_id: "vaeshkar",
        created_at: "2025-10-31T08:00:00Z",
        last_update_time: "2025-10-31T09:30:00Z",
        status: "completed",
        event_count: 25,
        total_tokens: 3200,
        session_duration_seconds: 5400,
      };

      const result = await writer.writeSession(sessionData);

      assert.strictEqual(result.ok, true);

      const filePath = join(tempDir, "sessions.aicf");
      const content = await readFile(filePath, "utf8");

      assert.ok(content.includes("event_count=25"));
      assert.ok(content.includes("total_tokens=3200"));
      assert.ok(content.includes("session_duration_seconds=5400"));
    });
  });

  describe("Embedding Writing (@EMBEDDING)", () => {
    it("should write embedding with vector array", async () => {
      const embeddingData = {
        id: "conv_001",
        model: "text-embedding-3-large",
        dimension: 1536,
        vector: [0.123, 0.456, 0.789],
        indexed_at: "2025-10-31T00:00:00Z",
      };

      const result = await writer.writeEmbedding(embeddingData);

      assert.strictEqual(result.ok, true);
      assert.ok(result.value > 0);

      const filePath = join(tempDir, "embeddings.aicf");
      await access(filePath);

      const content = await readFile(filePath, "utf8");
      assert.ok(content.includes("@EMBEDDING:conv_001"));
      assert.ok(content.includes("model=text-embedding-3-large"));
      assert.ok(content.includes("dimension=1536"));
      assert.ok(content.includes("vector=0.123,0.456,0.789"));
    });

    it("should write embedding with optional fields", async () => {
      const embeddingData = {
        id: "conv_003",
        model: "text-embedding-3-large",
        dimension: 1536,
        vector: [0.1, 0.2, 0.3],
        indexed_at: "2025-10-31T00:00:00Z",
        similarity_threshold: 0.85,
        keywords: ["authentication", "security", "api_design"],
      };

      const result = await writer.writeEmbedding(embeddingData);

      assert.strictEqual(result.ok, true);

      const filePath = join(tempDir, "embeddings.aicf");
      const content = await readFile(filePath, "utf8");

      assert.ok(content.includes("similarity_threshold=0.85"));
      assert.ok(content.includes("keywords=authentication|security|api_design"));
    });
  });

  describe("Consolidation Writing (@CONSOLIDATION)", () => {
    it("should write consolidation with all required fields", async () => {
      const consolidationData = {
        id: "cluster_001",
        source_items: ["conv_001", "conv_002", "conv_003"],
        consolidated_at: "2025-10-31T00:00:00Z",
        method: "semantic_clustering",
      };

      const result = await writer.writeConsolidation(consolidationData);

      assert.strictEqual(result.ok, true);
      assert.ok(result.value > 0);

      const filePath = join(tempDir, "consolidations.aicf");
      await access(filePath);

      const content = await readFile(filePath, "utf8");
      assert.ok(content.includes("@CONSOLIDATION:cluster_001"));
      assert.ok(content.includes("source_items=conv_001|conv_002|conv_003"));
      assert.ok(content.includes("method=semantic_clustering"));
    });

    it("should write consolidation with optional fields", async () => {
      const consolidationData = {
        id: "cluster_002",
        source_items: ["conv_004", "conv_005"],
        consolidated_at: "2025-10-31T00:00:00Z",
        method: "temporal_summarization",
        semantic_theme: "microservices_architecture",
        key_facts: ["scalability", "service_mesh", "containers"],
        information_preserved: 95.5,
        compression_ratio: 0.955,
      };

      const result = await writer.writeConsolidation(consolidationData);

      assert.strictEqual(result.ok, true);

      const filePath = join(tempDir, "consolidations.aicf");
      const content = await readFile(filePath, "utf8");

      assert.ok(content.includes("semantic_theme=microservices_architecture"));
      assert.ok(content.includes("key_facts=scalability|service_mesh|containers"));
      assert.ok(content.includes("information_preserved=95.5%"));
      assert.ok(content.includes("compression_ratio=0.955"));
    });
  });
});
