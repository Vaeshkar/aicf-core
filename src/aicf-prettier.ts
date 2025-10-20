/**
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (c) 2025 Dennis van Leeuwen
 *
 * AICF Prettier - Converts any AICF-like format to clean AICF 3.0 specification
 * Preserves all data while standardizing format
 */

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, basename } from "node:path";

export interface PrettifyResult {
  success: boolean;
  inputPath: string;
  outputPath?: string;
  originalFormat?: string;
  sectionsConverted?: number;
  entriesConverted?: number;
  preservedMetadata?: Record<string, unknown>;
  error?: string;
}

export interface PrettifyOptions {
  skipFiles?: string[];
  verbose?: boolean;
}

export interface DirectoryPrettifyResult {
  directory: string;
  totalFiles: number;
  successfulFiles: number;
  results: PrettifyResult[];
  summary: PrettifySummary;
  error?: string;
}

export interface PrettifySummary {
  totalFiles: number;
  successfulFiles: number;
  totalSectionsConverted: number;
  totalEntriesConverted: number;
  formatConversions: Record<string, number>;
}

interface Section {
  name: string;
  originalName: string;
  line: number;
  entries: Entry[];
}

interface Entry {
  key: string;
  value: string;
  originalKey: string;
  line: number;
  section: string;
  verboseIndex?: string;
  metadata?: Record<string, string>;
  csvData?: Record<string, string>;
}

interface ParsedFormat {
  detectedFormat: string;
  sections: Section[];
  entries: Entry[];
  preservedMetadata: Record<string, unknown>;
}

/**
 * AICF Prettier
 */
export class AICFPrettier {
  readonly name = "AICFPrettier";

  async prettifyFile(
    inputPath: string,
    outputPath: string | null = null
  ): Promise<PrettifyResult> {
    if (!outputPath) {
      outputPath = inputPath;
    }

    try {
      const content = readFileSync(inputPath, "utf8");
      const parsed = this.parseAnyFormat(content);
      const prettified = this.convertToAICF3(parsed);

      writeFileSync(outputPath, prettified);

      return {
        success: true,
        inputPath,
        outputPath,
        originalFormat: parsed.detectedFormat,
        sectionsConverted: parsed.sections.length,
        entriesConverted: parsed.entries.length,
        preservedMetadata: parsed.preservedMetadata,
      };
    } catch (error) {
      return {
        success: false,
        inputPath,
        error: (error as Error).message,
      };
    }
  }

  private parseAnyFormat(content: string): ParsedFormat {
    const lines = content.split("\n");
    const parsed: ParsedFormat = {
      detectedFormat: "UNKNOWN",
      sections: [],
      entries: [],
      preservedMetadata: {},
    };

    let currentSection: Section | null = null;
    let isCSVMode = false;
    let csvHeaders: string[] = [];

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed === "") return;

      if (trimmed.startsWith("@")) {
        currentSection = {
          name: this.cleanSectionName(trimmed),
          originalName: trimmed,
          line: index + 1,
          entries: [],
        };
        parsed.sections.push(currentSection);
        parsed.detectedFormat = "AICF_STYLE";
        isCSVMode = false;
      } else if (trimmed.includes("|") && trimmed.split("|").length > 3) {
        if (trimmed.includes("T#|PRIORITY|EFFORT")) {
          csvHeaders = trimmed.split("|");
          isCSVMode = true;
          parsed.detectedFormat = "CSV_STYLE";

          if (!currentSection) {
            currentSection = {
              name: "@TASKS",
              originalName: "@TASKS",
              line: index + 1,
              entries: [],
            };
            parsed.sections.push(currentSection);
          }
        } else if (isCSVMode && csvHeaders.length > 0) {
          const values = trimmed.split("|");
          const entry = this.convertCSVRowToEntry(
            csvHeaders,
            values,
            index + 1
          );
          if (entry && currentSection) {
            currentSection.entries.push(entry);
            parsed.entries.push(entry);
          }
        }
      } else if (trimmed.includes("=")) {
        const parts = trimmed.split("=");
        const key = parts[0] ?? "";
        if (key) {
          const valueParts = parts.slice(1);
          const value = valueParts.join("=").trim();

          const entry: Entry = {
            key: this.cleanKey(key.trim()),
            value: value,
            originalKey: key.trim(),
            line: index + 1,
            section: currentSection ? currentSection.name : "@GENERAL",
          };

          if (key.match(/^(decision|rationale|impact|timestamp)_\d+$/)) {
            parsed.detectedFormat = "VERBOSE_STYLE";
            const match = key.match(/_(\d+)$/);
            if (match && match[1]) {
              entry.verboseIndex = match[1];
              entry.key = key.replace(/_\d+$/, "");
            }
          }

          if (currentSection) {
            currentSection.entries.push(entry);
          }
          parsed.entries.push(entry);
        }
      }
    });

    if (parsed.detectedFormat === "UNKNOWN" && parsed.sections.length > 0) {
      parsed.detectedFormat = "AICF_STYLE";
    }

    return parsed;
  }

  private convertCSVRowToEntry(
    headers: string[],
    values: string[],
    lineNum: number
  ): Entry | null {
    if (headers.length !== values.length) {
      return null;
    }

    const entry: Entry = {
      key: "task",
      value: "",
      originalKey: "task",
      line: lineNum,
      section: "@TASKS",
      metadata: {},
      csvData: {},
    };

    headers.forEach((header, index) => {
      const value = values[index]?.trim() || "";
      const cleanHeader = header.toLowerCase().replace(/[^a-z0-9]/g, "_");

      if (!entry.csvData) entry.csvData = {};
      entry.csvData[cleanHeader] = value;

      if (header === "TASK") {
        entry.value = value;
      } else if (header === "STATUS") {
        if (!entry.metadata) entry.metadata = {};
        entry.metadata["status"] = value;
      } else if (header === "PRIORITY") {
        if (!entry.metadata) entry.metadata = {};
        entry.metadata["priority"] = value;
      } else if (header === "EFFORT") {
        if (!entry.metadata) entry.metadata = {};
        entry.metadata["effort"] = value;
      } else if (header === "ASSIGNED") {
        if (!entry.metadata) entry.metadata = {};
        entry.metadata["assignee"] = value;
      } else if (header === "CREATED") {
        if (!entry.metadata) entry.metadata = {};
        entry.metadata["created"] = value;
      } else if (header === "COMPLETED") {
        if (!entry.metadata) entry.metadata = {};
        entry.metadata["completed"] = value;
      } else {
        if (!entry.metadata) entry.metadata = {};
        entry.metadata[cleanHeader] = value;
      }
    });

    return entry;
  }

  private convertToAICF3(parsed: ParsedFormat): string {
    const lines: string[] = [];

    const sectionMap = new Map<string, Entry[]>();

    parsed.entries.forEach((entry) => {
      const sectionName = entry.section || "@GENERAL";
      if (!sectionMap.has(sectionName)) {
        sectionMap.set(sectionName, []);
      }
      const entries = sectionMap.get(sectionName);
      if (entries) {
        entries.push(entry);
      }
    });

    if (parsed.detectedFormat === "VERBOSE_STYLE") {
      this.groupVerboseEntries(sectionMap);
    }

    for (const [sectionName, entries] of sectionMap) {
      if (entries.length === 0) continue;

      lines.push(sectionName);

      if (parsed.detectedFormat === "CSV_STYLE") {
        entries.forEach((entry, index) => {
          const taskId = entry.csvData?.["t_"] || (index + 1).toString();
          lines.push(`task_id=${taskId}`);
          lines.push(`description=${entry.value}`);

          if (entry.metadata) {
            Object.entries(entry.metadata).forEach(([key, value]) => {
              if (value && value !== "" && value !== "None") {
                lines.push(`${key}=${value}`);
              }
            });
          }

          lines.push("");
        });
      } else {
        entries.forEach((entry) => {
          lines.push(`${entry.key}=${entry.value}`);

          if (entry.metadata) {
            Object.entries(entry.metadata).forEach(([key, value]) => {
              if (value && value !== "" && value !== "None") {
                lines.push(`${key}=${value}`);
              }
            });
          }
        });
      }

      lines.push("");
    }

    return lines.join("\n").trim() + "\n";
  }

  private groupVerboseEntries(sectionMap: Map<string, Entry[]>): void {
    for (const [sectionName, entries] of sectionMap) {
      if (!sectionName.includes("DECISION")) continue;

      const grouped = new Map<string, Entry>();
      const newEntries: Entry[] = [];

      entries.forEach((entry) => {
        if (entry.verboseIndex) {
          const index = entry.verboseIndex;
          if (!grouped.has(index)) {
            grouped.set(index, {
              key: "decision",
              value: "",
              originalKey: "decision",
              metadata: {},
              line: entry.line,
              section: sectionName,
            });
          }

          const groupedEntry = grouped.get(index);
          if (groupedEntry) {
            if (entry.key === "decision") {
              groupedEntry.value = entry.value;
            } else {
              if (!groupedEntry.metadata) groupedEntry.metadata = {};
              groupedEntry.metadata[entry.key] = entry.value;
            }
          }
        } else {
          newEntries.push(entry);
        }
      });

      newEntries.push(...Array.from(grouped.values()));
      sectionMap.set(sectionName, newEntries);
    }
  }

  private cleanSectionName(sectionName: string): string {
    let cleaned = sectionName.toUpperCase();
    cleaned = cleaned.replace(/[^A-Z0-9@_:]/g, "_");

    if (!cleaned.startsWith("@")) {
      cleaned = "@" + cleaned;
    }

    const mappings: Record<string, string> = {
      "@DECISIONS_CHAT": "@DECISIONS",
      "@CONVERSATION_HOURGLASS": "@CONVERSATION",
      "@TASKS_": "@TASKS",
    };

    for (const [pattern, replacement] of Object.entries(mappings)) {
      if (cleaned.includes(pattern.replace("@", ""))) {
        return replacement;
      }
    }

    return cleaned;
  }

  private cleanKey(key: string): string {
    return key
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");
  }

  async prettifyDirectory(
    aicfDir: string,
    options: PrettifyOptions = {}
  ): Promise<DirectoryPrettifyResult> {
    const results: PrettifyResult[] = [];

    try {
      const files = readdirSync(aicfDir)
        .filter((file) => file.endsWith(".aicf"))
        .map((file) => join(aicfDir, file));

      for (const filePath of files) {
        if (
          options.skipFiles &&
          options.skipFiles.includes(basename(filePath))
        ) {
          continue;
        }

        const result = await this.prettifyFile(filePath);
        results.push(result);

        if (result.success && options.verbose) {
          console.log(
            `✅ Prettified ${basename(filePath)}: ${result.originalFormat} → AICF_3.0`
          );
        }
      }

      return {
        directory: aicfDir,
        totalFiles: results.length,
        successfulFiles: results.filter((r) => r.success).length,
        results: results,
        summary: this.generateSummary(results),
      };
    } catch (error) {
      return {
        directory: aicfDir,
        error: (error as Error).message,
        totalFiles: 0,
        successfulFiles: 0,
        results: [],
        summary: {
          totalFiles: 0,
          successfulFiles: 0,
          totalSectionsConverted: 0,
          totalEntriesConverted: 0,
          formatConversions: {},
        },
      };
    }
  }

  private generateSummary(results: PrettifyResult[]): PrettifySummary {
    const summary: PrettifySummary = {
      totalFiles: results.length,
      successfulFiles: results.filter((r) => r.success).length,
      totalSectionsConverted: results.reduce(
        (sum, r) => sum + (r.sectionsConverted || 0),
        0
      ),
      totalEntriesConverted: results.reduce(
        (sum, r) => sum + (r.entriesConverted || 0),
        0
      ),
      formatConversions: {},
    };

    results.forEach((result) => {
      if (result.success && result.originalFormat) {
        const conversion = `${result.originalFormat} → AICF_3.0`;
        summary.formatConversions[conversion] =
          (summary.formatConversions[conversion] || 0) + 1;
      }
    });

    return summary;
  }
}
