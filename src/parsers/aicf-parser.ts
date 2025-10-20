/**
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (c) 2025 Dennis van Leeuwen
 *
 * AICF Parser - Parse AICF v3.1.1 format
 */

import type { Result } from "../types/result.js";
import { ok, err, toError } from "../types/result.js";
import type { AICFData, AICFMetadata } from "../types/aicf.js";

/**
 * Parse AICF section name from line
 */
export function parseSectionName(line: string): string | null {
  const match = line.match(/^@([A-Z_]+):/);
  return match?.[1] ?? null;
}

/**
 * Parse pipe-delimited line
 */
export function parsePipeLine(line: string): string[] {
  return line.split("|").map((part) => part.trim());
}

/**
 * Parse key-value pair
 */
export function parseKeyValue(line: string): [string, string] | null {
  const index = line.indexOf("=");
  if (index === -1) {
    return null;
  }

  const key = line.substring(0, index).trim();
  const value = line.substring(index + 1).trim();
  return [key, value];
}

/**
 * Parse metadata section
 */
export function parseMetadata(lines: string[]): Result<AICFMetadata> {
  try {
    const metadata: AICFMetadata = {
      format_version: "3.1.1",
      created_at: new Date().toISOString(),
    };

    for (const line of lines) {
      const kv = parseKeyValue(line);
      if (kv) {
        const [key, value] = kv;
        metadata[key] = value;
      }
    }

    return ok(metadata);
  } catch (error) {
    return err(toError(error));
  }
}

/**
 * Parse AICF content into structured data
 */
export function parseAICF(content: string): Result<Partial<AICFData>> {
  try {
    const data: Partial<AICFData> = {
      conversations: [],
      memories: [],
      states: [],
      insights: [],
      decisions: [],
      work: [],
      links: [],
      embeddings: [],
      consolidations: [],
    };

    const lines = content.split("\n");
    let currentSection: string | null = null;
    let sectionLines: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines
      if (!trimmed) {
        continue;
      }

      // Check for section marker
      const sectionName = parseSectionName(trimmed);
      if (sectionName) {
        // Process previous section
        if (currentSection && sectionLines.length > 0) {
          processSectionLines(data, currentSection, sectionLines);
        }

        // Start new section
        currentSection = sectionName;
        sectionLines = [];
        continue;
      }

      // Add line to current section
      if (currentSection) {
        sectionLines.push(trimmed);
      }
    }

    // Process final section
    if (currentSection && sectionLines.length > 0) {
      processSectionLines(data, currentSection, sectionLines);
    }

    return ok(data);
  } catch (error) {
    return err(toError(error));
  }
}

/**
 * Process section lines based on section type
 */
function processSectionLines(
  data: Partial<AICFData>,
  section: string,
  lines: string[]
): void {
  switch (section) {
    case "METADATA":
      const metadataResult = parseMetadata(lines);
      if (metadataResult.ok) {
        data.metadata = metadataResult.value;
      }
      break;

    case "CONVERSATION":
      for (const line of lines) {
        const parts = parsePipeLine(line);
        if (parts.length >= 4) {
          data.conversations?.push({
            id: parts[0] ?? "",
            timestamp: parts[1] ?? "",
            role: (parts[2] as "user" | "assistant" | "system") ?? "user",
            content: parts[3] ?? "",
          });
        }
      }
      break;

    case "MEMORY":
      for (const line of lines) {
        const parts = parsePipeLine(line);
        if (parts.length >= 3) {
          data.memories?.push({
            type:
              (parts[0] as "episodic" | "semantic" | "procedural") ??
              "episodic",
            timestamp: parts[1] ?? "",
            content: parts[2] ?? "",
          });
        }
      }
      break;

    case "STATE":
      for (const line of lines) {
        const parts = parsePipeLine(line);
        if (parts.length >= 3) {
          data.states?.push({
            scope:
              (parts[0] as "session" | "user" | "app" | "temp") ?? "session",
            key: parts[1] ?? "",
            value: parts[2] ?? "",
          });
        }
      }
      break;

    case "INSIGHTS":
      for (const line of lines) {
        const parts = parsePipeLine(line);
        if (parts.length >= 3) {
          data.insights?.push({
            content: parts[0] ?? "",
            category: parts[1] ?? "",
            priority:
              (parts[2] as "low" | "medium" | "high" | "critical") ?? "medium",
            confidence: parseFloat(parts[3] ?? "0"),
          });
        }
      }
      break;

    case "DECISIONS":
      for (const line of lines) {
        const parts = parsePipeLine(line);
        if (parts.length >= 2) {
          data.decisions?.push({
            decision: parts[0] ?? "",
            rationale: parts[1] ?? "",
          });
        }
      }
      break;

    case "WORK":
      for (const line of lines) {
        const parts = parsePipeLine(line);
        if (parts.length >= 2) {
          data.work?.push({
            id: parts[0] ?? "",
            status:
              (parts[1] as
                | "not_started"
                | "in_progress"
                | "completed"
                | "blocked") ?? "not_started",
            description: parts[2] ?? undefined,
          });
        }
      }
      break;

    case "LINKS":
      for (const line of lines) {
        const parts = parsePipeLine(line);
        if (parts.length >= 3) {
          data.links?.push({
            type:
              (parts[0] as
                | "semantic_cluster"
                | "temporal_sequence"
                | "causal_relationship"
                | "reference"
                | "dependency") ?? "reference",
            source: parts[1] ?? "",
            target: parts[2] ?? "",
          });
        }
      }
      break;
  }
}

/**
 * Validate AICF format
 */
export function validateAICF(content: string): Result<boolean> {
  try {
    // Check for required sections
    const hasMetadata = content.includes("@METADATA:");

    if (!hasMetadata) {
      return err(new Error("Missing required @METADATA section"));
    }

    // Try to parse
    const parseResult = parseAICF(content);
    if (!parseResult.ok) {
      return parseResult;
    }

    return ok(true);
  } catch (error) {
    return err(toError(error));
  }
}
