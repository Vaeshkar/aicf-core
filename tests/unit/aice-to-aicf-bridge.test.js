/**
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (c) 2025 Dennis van Leeuwen
 *
 * AICE-to-AICF Bridge Unit Tests
 */

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { mkdir, rm, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { AICEToAICFBridge } from "../../dist/bridges/aice-to-aicf.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe("AICEToAICFBridge", () => {
  let bridge;
  let tempDir;

  beforeEach(async () => {
    tempDir = join(__dirname, `../.test-aice-bridge-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    bridge = new AICEToAICFBridge(tempDir);
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

  describe("Transform AICE AnalysisResult", () => {
    it("should transform complete analysis to AICF v3.1 format", async () => {
      const analysis = {
        userIntents: [
          {
            timestamp: "2025-10-31T10:00:00Z",
            intent: "Implement authentication system",
            inferredFrom: "conversation_summary",
            confidence: "high",
            messageIndex: 0,
          },
        ],
        aiActions: [
          {
            type: "augment_ai_response",
            timestamp: "2025-10-31T10:00:01Z",
            details: "Provided authentication implementation guide",
            source: "conversation_summary",
            messageIndex: 1,
          },
        ],
        technicalWork: [
          {
            timestamp: "2025-10-31T10:00:02Z",
            work: "Implement JWT authentication with TypeScript",
            type: "technical_conversation",
            source: "conversation_summary",
            lineIndex: 0,
          },
        ],
        decisions: [
          {
            timestamp: "2025-10-31T10:00:03Z",
            decision: "Use JWT for authentication",
            context: "Scalability and microservices architecture",
            impact: "high",
          },
        ],
        flow: {
          sequence: ["user", "assistant", "user", "assistant"],
          turns: 2,
          dominantRole: "balanced",
        },
        workingState: {
          currentTask: "Implement authentication",
          blockers: ["Need to decide on token storage"],
          nextAction: "Research token storage options",
          lastUpdate: "2025-10-31T10:00:04Z",
        },
      };

      const options = {
        conversationId: "test_conv_001",
        sessionId: "test_session_001",
        appName: "augment",
        userId: "test_user",
        source: "augment",
      };

      const result = await bridge.transform(analysis, options);

      assert.strictEqual(result.ok, true);

      // Check that files were created
      const files = await readdir(tempDir);
      assert.ok(files.length > 0, "Should create AICF files");

      // Check sessions.aicf
      if (files.includes("sessions.aicf")) {
        const sessionContent = await readFile(
          join(tempDir, "sessions.aicf"),
          "utf8"
        );
        assert.ok(sessionContent.includes("@SESSION:test_session_001"));
        assert.ok(sessionContent.includes("app_name=augment"));
        assert.ok(sessionContent.includes("user_id=test_user"));
        assert.ok(sessionContent.includes("status=completed"));
        assert.ok(sessionContent.includes("event_count=2"));
      }

      // Check conversations.aicf
      if (files.includes("conversations.aicf")) {
        const conversationContent = await readFile(
          join(tempDir, "conversations.aicf"),
          "utf8"
        );
        assert.ok(
          conversationContent.includes("Implement authentication system")
        );
        assert.ok(
          conversationContent.includes(
            "Provided authentication implementation guide"
          )
        );
      }

      // Check decisions.aicf
      if (files.includes("decisions.aicf")) {
        const decisionContent = await readFile(
          join(tempDir, "decisions.aicf"),
          "utf8"
        );
        assert.ok(decisionContent.includes("Use JWT for authentication"));
        assert.ok(
          decisionContent.includes("Scalability and microservices architecture")
        );
      }

      // Check memories.aicf (technical work + working state)
      if (files.includes("memories.aicf")) {
        const memoryContent = await readFile(
          join(tempDir, "memories.aicf"),
          "utf8"
        );
        assert.ok(
          memoryContent.includes("Implement JWT authentication with TypeScript")
        );
        assert.ok(memoryContent.includes("Current task: Implement authentication"));
        assert.ok(memoryContent.includes("Blockers: Need to decide on token storage"));
        assert.ok(memoryContent.includes("Next action: Research token storage options"));
      }
    });

    it("should handle empty analysis gracefully", async () => {
      const analysis = {
        userIntents: [],
        aiActions: [],
        technicalWork: [],
        decisions: [],
        flow: {
          sequence: [],
          turns: 0,
          dominantRole: "balanced",
        },
        workingState: {
          currentTask: "",
          blockers: [],
          nextAction: "",
          lastUpdate: "2025-10-31T10:00:00Z",
        },
      };

      const options = {
        conversationId: "test_conv_002",
      };

      const result = await bridge.transform(analysis, options);

      assert.strictEqual(result.ok, true);

      // Should still create session file
      const files = await readdir(tempDir);
      assert.ok(files.includes("sessions.aicf"));
    });
  });
});

