/**
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (c) 2025 Dennis van Leeuwen
 *
 * File Organization Agent - Maintains clean directory structure
 */

import type { FileSystem } from "../types/aicf.js";
import { NodeFileSystem } from "../utils/file-system.js";
import { join, basename, dirname } from "node:path";
import { rename, copyFile } from "node:fs/promises";

export interface ClassificationRule {
  pattern: RegExp;
  target: string;
  description: string;
}

export interface FileClassification {
  type: string;
  suggestedTarget: string;
  confidence: "high" | "low";
  rule: string;
}

export interface RogueFileInfo {
  current: string;
  directory: string;
  basename: string;
  classification: FileClassification;
}

export interface ProcessResult {
  file: string;
  action: string;
  target?: string;
  reason?: string;
  error?: string;
  success: boolean;
}

export interface OrganizationResults {
  scanned: number;
  organized: number;
  skipped: number;
  errors: number;
  actions: ProcessResult[];
}

export interface ValidationIssue {
  type: string;
  directory?: string;
  file?: string;
  severity: string;
}

export interface SafetyConfig {
  requireConfirmation: boolean;
  createBackups: boolean;
  preserveImportant: boolean;
  maxBatchSize: number;
}

export interface FileOrganizationConfig {
  projectRoot?: string;
  dryRun?: boolean;
  fs?: FileSystem;
}

/**
 * Maintains clean directory structure
 */
export class FileOrganizationAgent {
  private readonly name = "FileOrganizationAgent";
  private readonly projectRoot: string;
  private readonly dryRun: boolean;
  private readonly fs: FileSystem;
  private readonly allowedFiles: Record<string, string[]>;
  private readonly classificationRules: ClassificationRule[];
  private readonly safety: SafetyConfig;

  constructor(options: FileOrganizationConfig = {}) {
    this.projectRoot = options.projectRoot || process.cwd();
    this.dryRun = options.dryRun || false;
    this.fs = options.fs || new NodeFileSystem();

    this.allowedFiles = {
      ".ai": [
        "README.md",
        "architecture.md",
        "technical-decisions.md",
        "known-issues.md",
        "next-steps.md",
        "conversation-log.md",
        "PROTECTION-HEADER.md",
        "user-ai-preferences.md",
        "code-style.md",
        "design-system.md",
        "team-commit-plan.md",
      ],
      ".aicf": [
        "index.aicf",
        "conversations.aicf",
        "decisions.aicf",
        "technical-context.aicf",
        "work-state.aicf",
        "conversation-memory.aicf",
        "tasks.aicf",
      ],
    };

    this.classificationRules = [
      {
        pattern: /(analysis|assessment|review|audit|evaluation)/i,
        target: "docs/analysis/",
        description: "Analysis documents and assessments",
      },
      {
        pattern:
          /(research|study|investigation|exploration|google|claude|openai)/i,
        target: "docs/research/",
        description: "Research materials and investigations",
      },
      {
        pattern: /(report|summary|completion|final|results)/i,
        target: "docs/reports/",
        description: "Generated reports and summaries",
      },
      {
        pattern: /(temp|test|tmp|experimental|draft|work)/i,
        target: "docs/temp/",
        description: "Temporary and experimental files",
      },
      {
        pattern: /(archive|backup|old|legacy|deprecated)/i,
        target: "docs/archives/",
        description: "Archived and legacy materials",
      },
      {
        pattern: /(implementation|development|coding|plan|strategy)/i,
        target: "docs/development/",
        description: "Development and implementation documents",
      },
      {
        pattern: /(security|vulnerability|audit|compliance|safety)/i,
        target: "docs/security/",
        description: "Security-related documentation",
      },
    ];

    this.safety = {
      requireConfirmation: true,
      createBackups: true,
      preserveImportant: true,
      maxBatchSize: 10,
    };
  }

  /**
   * Main method - scan and organize files
   */
  async organizeFiles(): Promise<OrganizationResults> {
    console.log(`🤖 ${this.name}: Starting file organization...`);

    const results: OrganizationResults = {
      scanned: 0,
      organized: 0,
      skipped: 0,
      errors: 0,
      actions: [],
    };

    const rogueFiles = await this.scanForRogueFiles();
    results.scanned = rogueFiles.length;

    if (rogueFiles.length === 0) {
      console.log(`✅ ${this.name}: All files are properly organized!`);
      return results;
    }

    const filesToProcess = rogueFiles.slice(0, this.safety.maxBatchSize);

    for (const fileInfo of filesToProcess) {
      try {
        const action = await this.processRogueFile(fileInfo);
        results.actions.push(action);

        if (action.success) {
          results.organized++;
        } else {
          results.skipped++;
        }
      } catch (error) {
        console.error(`❌ Error processing ${fileInfo.current}:`, error);
        results.errors++;
      }
    }

    if (rogueFiles.length > this.safety.maxBatchSize) {
      const remaining = rogueFiles.length - this.safety.maxBatchSize;
      console.log(
        `ℹ️  ${remaining} more files need organization. Run again to continue.`
      );
    }

    console.log(`✅ ${this.name}: Organization complete!`);
    return results;
  }

  /**
   * Scan core directories for rogue files
   */
  private async scanForRogueFiles(): Promise<RogueFileInfo[]> {
    const rogueFiles: RogueFileInfo[] = [];

    await this.scanDirectory(".ai", rogueFiles);
    await this.scanDirectory(".aicf", rogueFiles);

    return rogueFiles;
  }

  /**
   * Scan a single directory
   */
  private async scanDirectory(
    directory: string,
    rogueFiles: RogueFileInfo[]
  ): Promise<void> {
    if (!(await this.directoryExists(directory))) return;

    const files = await this.getDirectoryFiles(directory);
    for (const file of files) {
      const base = basename(file);
      if (!this.allowedFiles[directory]?.includes(base)) {
        rogueFiles.push({
          current: file,
          directory,
          basename: base,
          classification: this.classifyFile(file),
        });
      }
    }
  }

  /**
   * Classify a file
   */
  private classifyFile(filePath: string): FileClassification {
    const base = basename(filePath).toLowerCase();

    for (const rule of this.classificationRules) {
      if (rule.pattern.test(base)) {
        return {
          type: rule.description,
          suggestedTarget: rule.target + basename(filePath),
          confidence: "high",
          rule: rule.description,
        };
      }
    }

    return {
      type: "unclassified",
      suggestedTarget: `docs/misc/${basename(filePath)}`,
      confidence: "low",
      rule: "default fallback",
    };
  }

  /**
   * Process a single rogue file
   */
  private async processRogueFile(
    fileInfo: RogueFileInfo
  ): Promise<ProcessResult> {
    const { current, classification } = fileInfo;
    const targetPath = join(this.projectRoot, classification.suggestedTarget);

    console.log(`📁 Processing: ${current}`);
    console.log(`   → Target: ${classification.suggestedTarget}`);
    console.log(`   → Reason: ${classification.rule}`);

    if (this.safety.requireConfirmation && !this.dryRun) {
      const confirmed = await this.confirmAction(fileInfo);
      if (!confirmed) {
        return {
          file: current,
          action: "skipped",
          reason: "user declined",
          success: false,
        };
      }
    }

    if (this.dryRun) {
      return {
        file: current,
        action: "would_move",
        target: classification.suggestedTarget,
        success: true,
      };
    }

    return await this.moveFile(current, targetPath, classification);
  }

  /**
   * Move file to target location
   */
  private async moveFile(
    current: string,
    targetPath: string,
    classification: FileClassification
  ): Promise<ProcessResult> {
    try {
      await this.fs.mkdir(dirname(targetPath), { recursive: true });

      if (this.safety.createBackups) {
        await this.createBackup(current);
      }

      await rename(current, targetPath);

      return {
        file: current,
        action: "moved",
        target: classification.suggestedTarget,
        success: true,
      };
    } catch (error) {
      return {
        file: current,
        action: "failed",
        error: error instanceof Error ? error.message : String(error),
        success: false,
      };
    }
  }

  /**
   * Create backup of file
   */
  private async createBackup(filePath: string): Promise<void> {
    const backupDir = join(this.projectRoot, ".backups", "file-organization");
    await this.fs.mkdir(backupDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupName = `${basename(filePath)}.backup.${timestamp}`;
    const backupPath = join(backupDir, backupName);

    await copyFile(filePath, backupPath);
    console.log(`💾 Backup created: ${backupPath}`);
  }

  /**
   * Confirm action with user
   */
  private async confirmAction(fileInfo: RogueFileInfo): Promise<boolean> {
    return fileInfo.classification.confidence === "high";
  }

  /**
   * Add allowed file
   */
  async addAllowedFile(
    directory: string,
    filename: string,
    reason = ""
  ): Promise<boolean> {
    if (!this.allowedFiles[directory]) {
      throw new Error(`Unknown directory: ${directory}`);
    }

    const allowed = this.allowedFiles[directory];
    if (!allowed) {
      throw new Error(`Unknown directory: ${directory}`);
    }

    if (allowed.includes(filename)) {
      console.log(`ℹ️  File ${filename} is already allowed in ${directory}`);
      return false;
    }

    allowed.push(filename);
    console.log(`✅ Added ${filename} to allowed files in ${directory}`);

    if (reason) {
      console.log(`   Reason: ${reason}`);
    }

    return true;
  }

  /**
   * Validate directory structure
   */
  async validateStructure(): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];

    const coreDirs = [".ai", ".aicf", "docs"];
    for (const dir of coreDirs) {
      if (!(await this.directoryExists(dir))) {
        issues.push({
          type: "missing_directory",
          directory: dir,
          severity: "warning",
        });
      }
    }

    for (const [directory, files] of Object.entries(this.allowedFiles)) {
      if (await this.directoryExists(directory)) {
        const existingFiles = await this.getDirectoryFiles(directory);
        const existingBasenames = existingFiles.map((f) => basename(f));

        for (const requiredFile of files) {
          if (!existingBasenames.includes(requiredFile)) {
            issues.push({
              type: "missing_file",
              directory,
              file: requiredFile,
              severity: "info",
            });
          }
        }
      }
    }

    return issues;
  }

  /**
   * Check if directory exists
   */
  private async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const fullPath = join(this.projectRoot, dirPath);
      const stats = await this.fs.stat(fullPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Get directory files
   */
  private async getDirectoryFiles(dirPath: string): Promise<string[]> {
    try {
      const fullPath = join(this.projectRoot, dirPath);
      const entries = await this.fs.readdir(fullPath);
      const files: string[] = [];

      for (const entry of entries) {
        const entryPath = join(fullPath, entry);
        const stats = await this.fs.stat(entryPath);
        if (stats.isFile()) {
          files.push(join(dirPath, entry));
        }
      }

      return files;
    } catch {
      return [];
    }
  }

  /**
   * Get current configuration
   */
  getConfiguration() {
    return {
      allowedFiles: this.allowedFiles,
      classificationRules: this.classificationRules,
      safety: this.safety,
    };
  }
}
