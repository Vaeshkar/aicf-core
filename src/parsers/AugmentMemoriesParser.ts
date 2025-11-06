/**
 * Parser for Augment-Memories files
 * Extracts distilled insights from Augment's memory markdown format
 */

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

/**
 * Parsed memory section from Augment-Memories
 */
export interface MemorySection {
  category: string; // e.g., "User Profile", "Project Context"
  items: MemoryItem[];
}

/**
 * Individual memory item (bullet point)
 */
export interface MemoryItem {
  text: string;
  confidence: number; // 0-1 (based on specificity and detail)
  category: string;
  source: "augment-memories";
}

/**
 * Result of parsing Augment-Memories file
 */
export interface AugmentMemoriesResult {
  workspaceId: string;
  sections: MemorySection[];
  totalItems: number;
  lastModified: Date;
}

/**
 * Parser for Augment-Memories markdown files
 */
export class AugmentMemoriesParser {
  private verbose: boolean;

  constructor(verbose = false) {
    this.verbose = verbose;
  }

  /**
   * Find all Augment-Memories files in VSCode workspace storage
   * @returns Array of file paths with workspace IDs
   */
  findMemoryFiles(): Array<{
    path: string;
    workspaceId: string;
    size: number;
  }> {
    const baseDir = join(
      homedir(),
      "Library/Application Support/Code/User/workspaceStorage"
    );

    if (!existsSync(baseDir)) {
      if (this.verbose) {
        console.log(
          "[AugmentMemoriesParser] VSCode workspace storage not found"
        );
      }
      return [];
    }

    const workspaceDirs = readdirSync(baseDir);
    const memoryFiles: Array<{
      path: string;
      workspaceId: string;
      size: number;
    }> = [];

    for (const workspaceId of workspaceDirs) {
      const memoryPath = join(
        baseDir,
        workspaceId,
        "Augment.vscode-augment",
        "Augment-Memories"
      );

      if (existsSync(memoryPath)) {
        const stats = statSync(memoryPath);
        // Only include non-empty files
        if (stats.size > 0) {
          memoryFiles.push({
            path: memoryPath,
            workspaceId,
            size: stats.size,
          });
        }
      }
    }

    if (this.verbose) {
      console.log(
        `[AugmentMemoriesParser] Found ${memoryFiles.length} non-empty Augment-Memories files`
      );
    }

    return memoryFiles;
  }

  /**
   * Parse a single Augment-Memories file
   * @param filePath - Path to Augment-Memories file
   * @param workspaceId - Workspace ID
   * @returns Parsed memory sections
   */
  parse(filePath: string, workspaceId: string): AugmentMemoriesResult {
    if (!existsSync(filePath)) {
      throw new Error(`Augment-Memories file not found: ${filePath}`);
    }

    const content = readFileSync(filePath, "utf-8");
    const stats = statSync(filePath);

    const sections = this.parseMarkdown(content);
    const totalItems = sections.reduce(
      (sum, section) => sum + section.items.length,
      0
    );

    if (this.verbose) {
      console.log(
        `[AugmentMemoriesParser] Parsed ${totalItems} items from ${sections.length} sections`
      );
    }

    return {
      workspaceId,
      sections,
      totalItems,
      lastModified: stats.mtime,
    };
  }

  /**
   * Parse markdown content into structured sections
   * @param content - Markdown content
   * @returns Array of memory sections
   */
  private parseMarkdown(content: string): MemorySection[] {
    const lines = content.split("\n");
    const sections: MemorySection[] = [];
    let currentSection: MemorySection | null = null;

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines
      if (!trimmed) {
        continue;
      }

      // Detect section headers (# Header)
      if (trimmed.startsWith("# ")) {
        const category = trimmed.substring(2).trim();

        // Save previous section
        if (currentSection && currentSection.items.length > 0) {
          sections.push(currentSection);
        }

        // Start new section
        currentSection = {
          category,
          items: [],
        };
        continue;
      }

      // Detect bullet points (- Item)
      if (trimmed.startsWith("- ") && currentSection) {
        const text = trimmed.substring(2).trim();

        // Skip empty bullets
        if (!text) {
          continue;
        }

        // Calculate confidence based on text characteristics
        const confidence = this.calculateConfidence(text);

        currentSection.items.push({
          text,
          confidence,
          category: currentSection.category,
          source: "augment-memories",
        });
      }
    }

    // Save last section
    if (currentSection && currentSection.items.length > 0) {
      sections.push(currentSection);
    }

    return sections;
  }

  /**
   * Calculate confidence score based on text characteristics
   * Higher confidence for specific, detailed statements
   * Lower confidence for vague or general statements
   * @param text - Memory item text
   * @returns Confidence score (0-1)
   */
  private calculateConfidence(text: string): number {
    let confidence = 0.7; // Base confidence

    // Increase confidence for specific details
    if (text.includes(":")) confidence += 0.05; // Contains structured data
    if (text.match(/\d+/)) confidence += 0.05; // Contains numbers
    if (text.length > 100) confidence += 0.05; // Detailed description
    if (text.includes("prefers") || text.includes("requires"))
      confidence += 0.05; // Clear preference
    if (text.includes("always") || text.includes("never")) confidence += 0.05; // Strong statement

    // Decrease confidence for vague statements
    if (text.includes("might") || text.includes("maybe")) confidence -= 0.1;
    if (text.includes("considering") || text.includes("thinking about"))
      confidence -= 0.1;
    if (text.length < 30) confidence -= 0.05; // Too short

    // Clamp to [0.5, 0.95]
    return Math.max(0.5, Math.min(0.95, confidence));
  }

  /**
   * Parse all Augment-Memories files
   * @returns Array of parsed results
   */
  parseAll(): AugmentMemoriesResult[] {
    const memoryFiles = this.findMemoryFiles();
    const results: AugmentMemoriesResult[] = [];

    for (const { path, workspaceId } of memoryFiles) {
      try {
        const result = this.parse(path, workspaceId);
        results.push(result);
      } catch (error) {
        if (this.verbose) {
          console.error(
            `[AugmentMemoriesParser] Failed to parse ${workspaceId}:`,
            error
          );
        }
      }
    }

    if (this.verbose) {
      const totalItems = results.reduce((sum, r) => sum + r.totalItems, 0);
      console.log(
        `[AugmentMemoriesParser] Parsed ${totalItems} total items from ${results.length} workspaces`
      );
    }

    return results;
  }

  /**
   * Get the most recent Augment-Memories file
   * @returns Most recent parsed result, or null if none found
   */
  getMostRecent(): AugmentMemoriesResult | null {
    const results = this.parseAll();

    if (results.length === 0) {
      return null;
    }

    // Sort by lastModified descending
    results.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());

    return results[0] ?? null;
  }
}
