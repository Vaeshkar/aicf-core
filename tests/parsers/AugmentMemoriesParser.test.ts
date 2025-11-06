/**
 * Tests for AugmentMemoriesParser
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { AugmentMemoriesParser } from "../../src/parsers/AugmentMemoriesParser.js";
import { writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("AugmentMemoriesParser", () => {
  let parser: AugmentMemoriesParser;
  let testDir: string;

  beforeEach(() => {
    parser = new AugmentMemoriesParser(false);
    testDir = join(tmpdir(), `augment-memories-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe("parseMarkdown", () => {
    it("should parse simple markdown with sections and items", () => {
      const content = `# User Profile

- Dennis: 26-year advertising veteran transitioning to software engineering
- Dennis has ADHD/dyslexic/Asperger's, INTJ personality
- Dennis prefers architecture-first development approach

# Project Context

- TobyStore is being built for IDEN/Duo-Shop network
- User prefers all-in-one Next.js app over microservices
`;

      const testFile = join(testDir, "test-memories.md");
      writeFileSync(testFile, content, "utf-8");

      const result = parser.parse(testFile, "test-workspace");

      expect(result.sections).toHaveLength(2);
      expect(result.sections[0].category).toBe("User Profile");
      expect(result.sections[0].items).toHaveLength(3);
      expect(result.sections[1].category).toBe("Project Context");
      expect(result.sections[1].items).toHaveLength(2);
      expect(result.totalItems).toBe(5);
    });

    it("should skip empty lines and sections", () => {
      const content = `# User Profile

- Dennis prefers quality over speed

# Empty Section

# Another Section

- Item 1
- Item 2
`;

      const testFile = join(testDir, "test-memories.md");
      writeFileSync(testFile, content, "utf-8");

      const result = parser.parse(testFile, "test-workspace");

      expect(result.sections).toHaveLength(2);
      expect(result.sections[0].category).toBe("User Profile");
      expect(result.sections[0].items).toHaveLength(1);
      expect(result.sections[1].category).toBe("Another Section");
      expect(result.sections[1].items).toHaveLength(2);
    });

    it("should calculate confidence based on text characteristics", () => {
      const content = `# Test Section

- Dennis prefers comprehensive solutions that 'do it right' over quick approaches
- User might consider using microservices
- Short item
- Dennis requires strict and correct implementations: 100% compliance, zero shortcuts
`;

      const testFile = join(testDir, "test-memories.md");
      writeFileSync(testFile, content, "utf-8");

      const result = parser.parse(testFile, "test-workspace");

      const items = result.sections[0].items;

      // First item: long, contains "prefers", detailed
      expect(items[0].confidence).toBeGreaterThan(0.7);

      // Second item: contains "might" (vague)
      expect(items[1].confidence).toBeLessThan(0.7);

      // Third item: too short
      expect(items[2].confidence).toBeLessThan(0.7);

      // Fourth item: contains "requires", numbers, colon, detailed
      expect(items[3].confidence).toBeGreaterThan(0.8);
    });

    it("should handle real Augment-Memories format", () => {
      const content = `# User Profile

- Dennis: 26-year advertising veteran transitioning to software engineering, WBS Coding School student, ADHD/dyslexic/Asperger's, INTJ personality, lives in Germany with 7-year-old son, experienced with web tech since 1998
- Dennis has a systems thinking leadership style from 13+ years as WoW raid leader (2005-2018), excels at complex coordination but struggles with simple tasks, prefers big-picture strategic thinking over detail work
- Dennis prefers architecture-first development approach (reading code, choosing tools, system design) over typing from scratch, and is validated by senior engineers that his AI-assisted development approach is correct

# System Architecture & Data Strategy

- User prefers all-in-one Next.js app over microservices for toy store project, with one seed per store to install on customer's hosting
- User considering hybrid data strategy: JSON configs for rapid deployment transitioning to database for production
- User requires response times within 2-4 seconds maximum for user retention

# UI/UX Preferences

- User prefers calm, muted colors, consistent border thickness, 60% backdrop opacity for modals, and fully rounded button corners to match Toby's circular avatar
- User prefers compact product cards that adjust height based on content rather than fixed heights, showing more than 5 products with 4 per row
`;

      const testFile = join(testDir, "test-memories.md");
      writeFileSync(testFile, content, "utf-8");

      const result = parser.parse(testFile, "test-workspace");

      expect(result.sections).toHaveLength(3);
      expect(result.sections[0].category).toBe("User Profile");
      expect(result.sections[0].items).toHaveLength(3);
      expect(result.sections[1].category).toBe(
        "System Architecture & Data Strategy"
      );
      expect(result.sections[1].items).toHaveLength(3);
      expect(result.sections[2].category).toBe("UI/UX Preferences");
      expect(result.sections[2].items).toHaveLength(2);
      expect(result.totalItems).toBe(8);

      // All items should have high confidence (detailed, specific)
      for (const section of result.sections) {
        for (const item of section.items) {
          expect(item.confidence).toBeGreaterThan(0.7);
          expect(item.source).toBe("augment-memories");
          expect(item.category).toBe(section.category);
        }
      }
    });

    it("should handle empty file", () => {
      const content = "";

      const testFile = join(testDir, "test-memories.md");
      writeFileSync(testFile, content, "utf-8");

      const result = parser.parse(testFile, "test-workspace");

      expect(result.sections).toHaveLength(0);
      expect(result.totalItems).toBe(0);
    });

    it("should handle file with only headers", () => {
      const content = `# Section 1

# Section 2

# Section 3
`;

      const testFile = join(testDir, "test-memories.md");
      writeFileSync(testFile, content, "utf-8");

      const result = parser.parse(testFile, "test-workspace");

      expect(result.sections).toHaveLength(0);
      expect(result.totalItems).toBe(0);
    });

    it("should preserve full text without truncation", () => {
      const longText =
        "Dennis prefers comprehensive solutions that do it right over quick/piecemeal approaches - when given options, he consistently chooses the thorough approach even if it takes longer, and this applies to architecture design, code quality, testing strategy, documentation, and deployment processes across all projects.";

      const content = `# Test Section

- ${longText}
`;

      const testFile = join(testDir, "test-memories.md");
      writeFileSync(testFile, content, "utf-8");

      const result = parser.parse(testFile, "test-workspace");

      expect(result.sections[0].items[0].text).toBe(longText);
      expect(result.sections[0].items[0].text.length).toBe(longText.length);
    });
  });

  describe("getMostRecent", () => {
    it("should return most recent file or null", () => {
      const result = parser.getMostRecent();
      // This test may find real Augment-Memories files on the system
      // Just verify it returns the correct type
      if (result) {
        expect(result).toHaveProperty("workspaceId");
        expect(result).toHaveProperty("sections");
        expect(result).toHaveProperty("totalItems");
        expect(result).toHaveProperty("lastModified");
      } else {
        expect(result).toBeNull();
      }
    });
  });
});
