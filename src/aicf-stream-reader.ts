#!/usr/bin/env node

/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2025 Dennis van Leeuwen
 *
 * AICF Stream Reader - Memory-efficient streaming access to AICF files
 *
 * Replaces fs.readFileSync() with streaming to handle large files (1GB+)
 * with constant memory usage regardless of file size.
 */

import { createReadStream, existsSync, statSync } from "node:fs";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";

export interface StreamOptions {
  onProgress?: (progress: ProgressInfo) => void;
  onError?: (error: Error, lineNum?: number) => void;
  maxLines?: number;
}

export interface ProgressInfo {
  lineCount: number;
  processedCount: number;
  bytesRead: number;
  totalBytes: number;
  progress: string;
}

export interface StreamResult {
  lineCount: number;
  processedCount: number;
  bytesRead: number;
}

export interface Conversation {
  id: string;
  line: number;
  metadata: Record<string, string>;
}

export interface Decision {
  id: string;
  line: number;
  metadata: Record<string, string>;
}

export interface Insight {
  id: string;
  line: number;
  text?: string;
  category?: string;
  priority?: string;
  confidence?: string;
  timestamp?: string;
  metadata: Record<string, string>;
}

export interface SearchResult {
  file: string;
  line: number;
  content: string;
  context: string;
}

export interface InsightOptions {
  limit?: number;
  category?: string | null;
  priority?: string | null;
}

export interface SearchOptions {
  maxResults?: number;
  onProgress?: (info: { file: string; matches: number }) => void;
}

/**
 * AICF Stream Reader
 */
export class AICFStreamReader {
  private readonly aicfDir: string;
  private indexCache: Record<string, Record<string, string>> | null = null;
  private lastIndexRead = 0;

  private readonly MAX_LINE_LENGTH = 1024 * 1024; // 1MB per line max

  constructor(aicfDir = ".aicf") {
    this.aicfDir = aicfDir;
  }

  /**
   * Stream read a file line by line with callback
   * Memory-efficient: O(1) memory usage regardless of file size
   */
  async streamFile(
    filePath: string,
    lineCallback: (line: string, lineNum: number) => boolean | void,
    options: StreamOptions = {}
  ): Promise<StreamResult> {
    const { onProgress = null, onError = null, maxLines = Infinity } = options;

    return new Promise((resolve, reject) => {
      if (!existsSync(filePath)) {
        const error = new Error(`File not found: ${filePath}`);
        if (onError) onError(error);
        return reject(error);
      }

      const fileStream = createReadStream(filePath, {
        encoding: "utf8",
        highWaterMark: 64 * 1024, // 64KB chunks
      });

      const rl = createInterface({
        input: fileStream,
        crlfDelay: Infinity,
      });

      let lineCount = 0;
      let processedCount = 0;
      const stats = statSync(filePath);
      let bytesRead = 0;

      rl.on("line", (line) => {
        lineCount++;
        bytesRead += Buffer.byteLength(line, "utf8");

        // Security: Prevent extremely long lines (potential DoS)
        if (line.length > this.MAX_LINE_LENGTH) {
          console.warn(`⚠️ Line ${lineCount} exceeds max length, truncating`);
          line = line.substring(0, this.MAX_LINE_LENGTH);
        }

        // Process line
        try {
          const shouldContinue = lineCallback(line, lineCount);
          processedCount++;

          // Progress callback
          if (onProgress && lineCount % 1000 === 0) {
            onProgress({
              lineCount,
              processedCount,
              bytesRead,
              totalBytes: stats.size,
              progress: ((bytesRead / stats.size) * 100).toFixed(2),
            });
          }

          // Stop if callback returns false or max lines reached
          if (shouldContinue === false || lineCount >= maxLines) {
            rl.close();
            fileStream.destroy();
          }
        } catch (error) {
          console.error(
            `Error processing line ${lineCount}:`,
            error instanceof Error ? error.message : String(error)
          );
          if (onError && error instanceof Error) {
            onError(error, lineCount);
          }
        }
      });

      rl.on("close", () => {
        resolve({
          lineCount,
          processedCount,
          bytesRead,
        });
      });

      rl.on("error", (error) => {
        if (onError) onError(error);
        reject(error);
      });

      fileStream.on("error", (error) => {
        if (onError) onError(error);
        reject(error);
      });
    });
  }

  /**
   * Get index with streaming (for large index files)
   */
  async getIndex(): Promise<Record<string, Record<string, string>>> {
    const indexPath = join(this.aicfDir, "index.aicf");

    if (!existsSync(indexPath)) {
      throw new Error(`Index file not found: ${indexPath}`);
    }

    const stats = statSync(indexPath);

    // Use cache if available and not modified
    if (this.indexCache && stats.mtimeMs <= this.lastIndexRead) {
      return this.indexCache;
    }

    // For small files (<1MB), use synchronous read (faster)
    if (stats.size < 1024 * 1024) {
      const content = readFileSync(indexPath, "utf8");
      const lines = content.split("\n").filter(Boolean);

      const index: Record<string, Record<string, string>> = {};
      let currentSection: string | null = null;

      lines.forEach((line) => {
        const parts = line.split("|", 2);
        const data = parts[1];
        if (!data) return;

        if (data.startsWith("@")) {
          currentSection = data.substring(1);
          if (currentSection) {
            index[currentSection] = {};
          }
        } else if (currentSection && data.includes("=")) {
          const [key, value] = data.split("=", 2);
          const section = index[currentSection];
          if (key && value !== undefined && section) {
            section[key] = value;
          }
        }
      });

      this.indexCache = index;
      this.lastIndexRead = stats.mtimeMs;
      return index;
    }

    // For large files, use streaming
    const index: Record<string, Record<string, string>> = {};
    let currentSection: string | null = null;

    await this.streamFile(indexPath, (line) => {
      if (!line.trim()) return true;

      const parts = line.split("|", 2);
      const data = parts[1];
      if (!data) return true;

      if (data.startsWith("@")) {
        currentSection = data.substring(1);
        if (currentSection) {
          index[currentSection] = {};
        }
      } else if (currentSection && data.includes("=")) {
        const [key, value] = data.split("=", 2);
        const section = index[currentSection];
        if (key && value !== undefined && section) {
          section[key] = value;
        }
      }

      return true;
    });

    this.indexCache = index;
    this.lastIndexRead = stats.mtimeMs;
    return index;
  }

  /**
   * Get last N conversations with streaming
   */
  async getLastConversations(count = 5): Promise<Conversation[]> {
    const conversationsPath = join(this.aicfDir, "conversations.aicf");
    if (!existsSync(conversationsPath)) return [];

    const conversations: Conversation[] = [];
    let currentConv: Conversation | null = null;
    const allLines: string[] = [];

    await this.streamFile(conversationsPath, (line) => {
      if (line.trim()) {
        allLines.push(line);
      }
      return true;
    });

    // Parse from end to get most recent first
    for (
      let i = allLines.length - 1;
      i >= 0 && conversations.length < count;
      i--
    ) {
      const parts = allLines[i]?.split("|", 2);
      if (!parts) continue;

      const lineNum = parts[0];
      const data = parts[1];
      if (!data) continue;

      if (data.startsWith("@CONVERSATION:")) {
        if (currentConv) {
          conversations.unshift(currentConv);
        }
        currentConv = {
          id: data.substring(14),
          line: parseInt(lineNum || "0"),
          metadata: {},
        };
      } else if (currentConv && data.includes("=")) {
        const [key, value] = data.split("=", 2);
        if (key && value !== undefined) {
          currentConv.metadata[key] = value;
        }
      }
    }

    if (currentConv && conversations.length < count) {
      conversations.unshift(currentConv);
    }

    return conversations;
  }

  /**
   * Get decisions by date range with streaming
   */
  async getDecisionsByDate(
    startDate: Date,
    endDate: Date = new Date()
  ): Promise<Decision[]> {
    const decisionsPath = join(this.aicfDir, "decisions.aicf");
    if (!existsSync(decisionsPath)) return [];

    const decisions: Decision[] = [];
    let currentDecision: Decision | null = null;

    await this.streamFile(decisionsPath, (line) => {
      if (!line.trim()) return true;

      const parts = line.split("|", 2);
      const lineNum = parts[0];
      const data = parts[1];
      if (!data) return true;

      if (data.startsWith("@DECISION:")) {
        if (currentDecision) {
          decisions.push(currentDecision);
        }
        currentDecision = {
          id: data.substring(10),
          line: parseInt(lineNum || "0"),
          metadata: {},
        };
      } else if (currentDecision && data.includes("=")) {
        const [key, value] = data.split("=", 2);
        if (key && value !== undefined) {
          currentDecision.metadata[key] = value;
        }
      }

      return true;
    });

    if (currentDecision) {
      decisions.push(currentDecision);
    }

    // Filter by date range
    return decisions.filter((decision) => {
      const timestamp = decision.metadata["timestamp"];
      if (!timestamp) return false;

      const decisionDate = new Date(timestamp);
      return decisionDate >= startDate && decisionDate <= endDate;
    });
  }

  /**
   * Get insights with streaming
   */
  async getInsights(options: InsightOptions = {}): Promise<Insight[]> {
    const { limit = 100, category = null, priority = null } = options;

    const insightsPath = join(this.aicfDir, "insights.aicf");
    if (!existsSync(insightsPath)) return [];

    const insights: Insight[] = [];
    let currentInsight: Insight | null = null;

    await this.streamFile(insightsPath, (line) => {
      if (!line.trim()) return true;

      const parts = line.split("|", 2);
      const lineNum = parts[0];
      const data = parts[1];
      if (!data) return true;

      if (data.startsWith("@INSIGHT:")) {
        if (currentInsight) {
          const matchesCategory =
            !category || (currentInsight.category ?? "") === category;
          const matchesPriority =
            !priority || (currentInsight.priority ?? "") === priority;

          if (matchesCategory && matchesPriority) {
            insights.push(currentInsight);
          }
        }

        if (insights.length >= limit) {
          return false;
        }

        currentInsight = {
          id: data.substring(9),
          line: parseInt(lineNum || "0"),
          metadata: {},
        };
      } else if (currentInsight && data.includes("=")) {
        const [key, value] = data.split("=", 2);
        if (!key || value === undefined) return true;

        if (key === "text") {
          currentInsight.text = value;
        } else if (key === "category") {
          currentInsight.category = value;
        } else if (key === "priority") {
          currentInsight.priority = value;
        } else if (key === "confidence") {
          currentInsight.confidence = value;
        } else if (key === "timestamp") {
          currentInsight.timestamp = value;
        } else {
          currentInsight.metadata[key] = value;
        }
      }

      return true;
    });

    if (currentInsight !== null && insights.length < limit) {
      const insight: Insight = currentInsight;
      const matchesCategory =
        !category || (insight.category ?? "") === category;
      const matchesPriority =
        !priority || (insight.priority ?? "") === priority;

      if (matchesCategory && matchesPriority) {
        insights.push(insight);
      }
    }

    return insights;
  }

  /**
   * Search across files with streaming (memory-efficient)
   */
  async search(
    term: string,
    fileTypes: string[] = [
      "conversations",
      "decisions",
      "work-state",
      "technical-context",
    ],
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const { maxResults = 100, onProgress = null } = options;

    for (const fileType of fileTypes) {
      if (results.length >= maxResults) break;

      const filePath = join(this.aicfDir, `${fileType}.aicf`);
      if (!existsSync(filePath)) continue;

      const contextLines: string[] = [];

      await this.streamFile(filePath, (line, lineNum) => {
        contextLines.push(line);
        if (contextLines.length > 3) {
          contextLines.shift();
        }

        if (line.toLowerCase().includes(term.toLowerCase())) {
          const parts = line.split("|", 2);
          const num = parts[0];
          const data = parts[1];

          results.push({
            file: fileType,
            line: parseInt(num || "0") || lineNum,
            content: data || line,
            context: contextLines.join("\n"),
          });

          if (onProgress) {
            onProgress({ file: fileType, matches: results.length });
          }

          if (results.length >= maxResults) {
            return false;
          }
        }

        return true;
      });
    }

    return results;
  }
}
