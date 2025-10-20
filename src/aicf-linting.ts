/**
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (c) 2025 Dennis van Leeuwen
 *
 * AICF Linting - Detects format inconsistencies in AICF files
 * Validates against AICF 3.0 specification
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, basename } from "node:path";

export interface LintError {
  type: string;
  message: string;
  line: number | null;
  content?: string;
}

export interface LintWarning {
  type: string;
  message: string;
  line: number;
  content?: string;
  suggestion?: string;
}

export interface LintSuggestion {
  type: string;
  message: string;
  line: number | null;
  suggestion?: string;
}

export interface LintResult {
  filePath: string;
  isValid: boolean;
  format?: string;
  errors: LintError[];
  warnings: LintWarning[];
  suggestions: LintSuggestion[];
  statistics?: FormatStatistics;
}

export interface FormatStatistics {
  totalLines: number;
  sectionLines: number;
  keyValueLines: number;
  emptyLines: number;
  malformedLines: number;
}

export interface DirectoryLintResult {
  directory: string;
  totalFiles: number;
  validFiles: number;
  results: LintResult[];
  summary: LintSummary;
  error?: string;
}

export interface LintSummary {
  totalFiles: number;
  validFiles: number;
  totalErrors: number;
  totalWarnings: number;
  totalSuggestions: number;
  formatDistribution: Record<string, number>;
}

interface Section {
  name: string;
  line: number;
  entries: unknown[];
}

interface KeyValuePair {
  key: string;
  value: string;
  line: number;
  section: string | null;
}

interface FormatAnalysis {
  detectedFormat: string;
  sections: Section[];
  keyValuePairs: KeyValuePair[];
  inconsistencies: string[];
  statistics: FormatStatistics;
}

/**
 * AICF Linting
 */
export class AICFLinting {
  readonly name = "AICFLinting";
  private errors: LintError[] = [];
  private warnings: LintWarning[] = [];
  private suggestions: LintSuggestion[] = [];

  async lintFile(filePath: string): Promise<LintResult> {
    this.errors = [];
    this.warnings = [];
    this.suggestions = [];

    try {
      const content = readFileSync(filePath, "utf8");
      const lines = content.split("\n");

      const analysis = this.analyzeFormat(lines, filePath);
      this.validateStructure(analysis, filePath);

      return {
        filePath,
        isValid: this.errors.length === 0,
        format: analysis.detectedFormat,
        errors: this.errors,
        warnings: this.warnings,
        suggestions: this.suggestions,
        statistics: analysis.statistics,
      };
    } catch (error) {
      this.errors.push({
        type: "FILE_ERROR",
        message: `Cannot read file: ${(error as Error).message}`,
        line: null,
      });

      return {
        filePath,
        isValid: false,
        errors: this.errors,
        warnings: this.warnings,
        suggestions: this.suggestions,
      };
    }
  }

  private analyzeFormat(lines: string[], _filePath: string): FormatAnalysis {
    const analysis: FormatAnalysis = {
      detectedFormat: "UNKNOWN",
      sections: [],
      keyValuePairs: [],
      inconsistencies: [],
      statistics: {
        totalLines: lines.length,
        sectionLines: 0,
        keyValueLines: 0,
        emptyLines: 0,
        malformedLines: 0,
      },
    };

    let currentSection: string | null = null;
    const formatPatterns = {
      aicf3: 0,
      csv: 0,
      verbose: 0,
      mixed: 0,
    };

    lines.forEach((line, index) => {
      const lineNum = index + 1;
      const trimmed = line.trim();

      if (trimmed === "") {
        analysis.statistics.emptyLines++;
        return;
      }

      if (trimmed.startsWith("@")) {
        analysis.statistics.sectionLines++;
        currentSection = trimmed;
        analysis.sections.push({
          name: trimmed,
          line: lineNum,
          entries: [],
        });
        formatPatterns.aicf3++;
        return;
      }

      if (trimmed.includes("|") && trimmed.split("|").length > 3) {
        formatPatterns.csv++;
        analysis.statistics.malformedLines++;
        this.warnings.push({
          type: "CSV_FORMAT_DETECTED",
          message:
            "Pipe-delimited format detected - should use AICF 3.0 structure",
          line: lineNum,
          content: trimmed.substring(0, 50) + "...",
        });
        return;
      }

      if (trimmed.includes("=")) {
        const [key, ...valueParts] = trimmed.split("=");
        const value = valueParts.join("=").trim();
        const keyStr = key ?? "";
        analysis.statistics.keyValueLines++;

        if (keyStr.match(/^(decision|rationale|impact)_\d+$/)) {
          formatPatterns.verbose++;
          this.warnings.push({
            type: "VERBOSE_FORMAT_DETECTED",
            message: `Verbose key format detected: "${keyStr}" - should use simple keys`,
            line: lineNum,
            suggestion: keyStr.replace(/_\d+$/, ""),
          });
        } else {
          formatPatterns.aicf3++;
        }

        analysis.keyValuePairs.push({
          key: keyStr.trim(),
          value: value,
          line: lineNum,
          section: currentSection,
        });

        if (this.isMissingMetadata(keyStr, value)) {
          this.suggestions.push({
            type: "MISSING_METADATA",
            message: `Key "${keyStr}" could use more metadata`,
            line: lineNum,
            suggestion: this.suggestMetadata(keyStr, value),
          });
        }
      } else {
        analysis.statistics.malformedLines++;
        this.errors.push({
          type: "MALFORMED_LINE",
          message:
            "Line does not follow AICF format (no section header, no key=value)",
          line: lineNum,
          content: trimmed,
        });
      }
    });

    const maxPattern = Math.max(...Object.values(formatPatterns));
    if (formatPatterns.aicf3 === maxPattern) {
      analysis.detectedFormat = "AICF_3.0";
    } else if (formatPatterns.csv === maxPattern) {
      analysis.detectedFormat = "CSV_STYLE";
    } else if (formatPatterns.verbose === maxPattern) {
      analysis.detectedFormat = "VERBOSE";
    } else {
      analysis.detectedFormat = "MIXED";
    }

    const nonZeroFormats = Object.values(formatPatterns).filter(
      (v) => v > 0
    ).length;
    if (nonZeroFormats > 1) {
      analysis.inconsistencies.push("MIXED_FORMATS");
      this.errors.push({
        type: "MIXED_FORMATS",
        message: `File contains ${nonZeroFormats} different format styles - should use consistent AICF 3.0`,
        line: null,
      });
    }

    return analysis;
  }

  private validateStructure(analysis: FormatAnalysis, filePath: string): void {
    const filename = basename(filePath);

    if (filename === "index.aicf") {
      this.validateIndexFile(analysis);
    } else if (filename === "conversations.aicf") {
      this.validateConversationsFile(analysis);
    } else if (filename === "decisions.aicf") {
      this.validateDecisionsFile(analysis);
    } else if (filename === "tasks.aicf") {
      this.validateTasksFile(analysis);
    }

    if (analysis.sections.length === 0) {
      this.errors.push({
        type: "NO_SECTIONS",
        message: "AICF file must contain at least one @SECTION",
        line: null,
      });
    }

    analysis.sections.forEach((section) => {
      if (!section.name.match(/^@[A-Z_]+$/)) {
        this.warnings.push({
          type: "INVALID_SECTION_NAME",
          message: `Section "${section.name}" should use UPPERCASE with underscores`,
          line: section.line,
          suggestion: section.name.toUpperCase().replace(/[^A-Z_@]/g, "_"),
        });
      }
    });
  }

  private validateIndexFile(analysis: FormatAnalysis): void {
    const requiredSections = ["@PROJECT", "@COUNTS", "@STATE"];
    const foundSections = analysis.sections.map((s) => s.name);

    requiredSections.forEach((required) => {
      if (!foundSections.includes(required)) {
        this.errors.push({
          type: "MISSING_REQUIRED_SECTION",
          message: `index.aicf must contain ${required} section`,
          line: null,
        });
      }
    });
  }

  private validateConversationsFile(analysis: FormatAnalysis): void {
    const conversationSections = analysis.sections.filter((s) =>
      s.name.startsWith("@CONVERSATION")
    );

    if (conversationSections.length === 0) {
      this.warnings.push({
        type: "NO_CONVERSATIONS",
        message: "conversations.aicf contains no @CONVERSATION sections",
        line: 0,
      });
    }
  }

  private validateDecisionsFile(analysis: FormatAnalysis): void {
    const verboseKeys = analysis.keyValuePairs.filter((kv) =>
      kv.key.match(/^(decision|rationale|impact)_\d+$/)
    );

    if (verboseKeys.length > 0) {
      this.suggestions.push({
        type: "CONVERT_TO_CLEAN_FORMAT",
        message: `${verboseKeys.length} verbose keys detected - should convert to clean AICF format`,
        line: null,
        suggestion: "Use AICFPrettier to convert to standard format",
      });
    }
  }

  private validateTasksFile(analysis: FormatAnalysis): void {
    if (analysis.detectedFormat === "CSV_STYLE") {
      this.suggestions.push({
        type: "CONVERT_CSV_TO_AICF",
        message: "CSV-style format detected - should convert to AICF structure",
        line: null,
        suggestion:
          "Use @TASK sections with key=value pairs instead of pipe-delimited format",
      });
    }
  }

  private isMissingMetadata(key: string, value: string): boolean {
    if (key === "decision" && !value.includes("timestamp")) {
      return true;
    }

    if (
      key === "task" &&
      !value.includes("priority") &&
      !value.includes("status")
    ) {
      return true;
    }

    if (key.startsWith("conversation") && !value.includes("timestamp")) {
      return true;
    }

    return false;
  }

  private suggestMetadata(key: string, _value: string): string {
    if (key === "decision") {
      return "Add timestamp, impact level, and confidence score";
    }
    if (key === "task") {
      return "Add priority, status, assignee, and deadline";
    }
    if (key.startsWith("conversation")) {
      return "Add timestamp, participant count, and topic";
    }
    return "Consider adding timestamp and contextual metadata";
  }

  async lintDirectory(aicfDir: string): Promise<DirectoryLintResult> {
    const results: LintResult[] = [];

    try {
      const files = readdirSync(aicfDir)
        .filter((file) => file.endsWith(".aicf"))
        .map((file) => join(aicfDir, file));

      for (const filePath of files) {
        const result = await this.lintFile(filePath);
        results.push(result);
      }

      return {
        directory: aicfDir,
        totalFiles: results.length,
        validFiles: results.filter((r) => r.isValid).length,
        results: results,
        summary: this.generateSummary(results),
      };
    } catch (error) {
      return {
        directory: aicfDir,
        error: (error as Error).message,
        totalFiles: 0,
        validFiles: 0,
        results: [],
        summary: {
          totalFiles: 0,
          validFiles: 0,
          totalErrors: 0,
          totalWarnings: 0,
          totalSuggestions: 0,
          formatDistribution: {},
        },
      };
    }
  }

  private generateSummary(results: LintResult[]): LintSummary {
    const summary: LintSummary = {
      totalFiles: results.length,
      validFiles: results.filter((r) => r.isValid).length,
      totalErrors: results.reduce((sum, r) => sum + r.errors.length, 0),
      totalWarnings: results.reduce((sum, r) => sum + r.warnings.length, 0),
      totalSuggestions: results.reduce(
        (sum, r) => sum + r.suggestions.length,
        0
      ),
      formatDistribution: {},
    };

    results.forEach((result) => {
      const format = result.format || "UNKNOWN";
      summary.formatDistribution[format] =
        (summary.formatDistribution[format] || 0) + 1;
    });

    return summary;
  }
}
