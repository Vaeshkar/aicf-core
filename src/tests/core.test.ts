/**
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (c) 2025 Dennis van Leeuwen
 *
 * Simple core functionality tests
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import AICF from "../index.js";

describe("Core Functionality Tests", () => {
  describe("Factory Methods", () => {
    it("should create AICF instance", () => {
      const aicf = AICF.create(".aicf-test");
      assert.ok(aicf);
      assert.ok(typeof aicf.getProjectOverview === "function");
    });

    it("should create reader", () => {
      const reader = AICF.createReader(".aicf-test");
      assert.ok(reader);
      assert.ok(typeof reader.getIndex === "function");
    });

    it("should create writer", () => {
      const writer = AICF.createWriter(".aicf-test");
      assert.ok(writer);
      assert.ok(typeof writer.appendLine === "function");
    });

    it("should create secure instance", () => {
      const secure = AICF.createSecure(".aicf-test");
      assert.ok(secure);
      assert.ok(typeof secure.getReader === "function");
      assert.ok(typeof secure.getWriter === "function");
    });

    it("should get version info", () => {
      const version = AICF.getVersion();
      assert.ok(version.version);
      assert.ok(version.aicfFormat);
      assert.equal(version.version, "2.0.0");
      assert.equal(version.aicfFormat, "3.1.1");
    });
  });

  describe("Type Safety", () => {
    it("should have proper exports", () => {
      assert.ok(AICF);
      assert.ok(AICF.create);
      assert.ok(AICF.createReader);
      assert.ok(AICF.createWriter);
      assert.ok(AICF.createSecure);
      assert.ok(AICF.getVersion);
    });
  });
});

