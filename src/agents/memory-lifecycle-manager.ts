import { promises as fs } from "node:fs";
import { join } from "node:path";
import { FileOrganizationAgent } from "./file-organization-agent.js";

interface LifecycleOptions {
  projectRoot?: string;
}

interface LifecycleConfig {
  recent: number;
  medium: number;
  old: number;
  purge: number;
}

interface Paths {
  sessionDumps: string;
  archive: string;
  aicf: string;
  ai: string;
}

interface LifecycleResults {
  fileOrganization: OrganizationResult;
  sessionDumps: DumpResult;
  aicfFiles: AICFResult;
  memoryCompression: CompressionResult;
  statistics: Statistics;
}

interface OrganizationResult {
  success: boolean;
  filesOrganized?: number;
  error?: string;
}

interface DumpResult {
  processed: number;
  archived: number;
  deleted: number;
  error?: string;
}

interface AICFResult {
  processed: number;
  compressed: number;
  error?: string;
}

interface CompressionResult {
  applied: boolean;
  compressionRatio?: number;
  error?: string;
}

interface Statistics {
  totalFiles: number;
  totalSize: number;
  ageDistribution: Record<string, number>;
  error?: string;
}

interface SessionDump {
  path: string;
  ageInDays: number;
  size: number;
}

/**
 * Memory Lifecycle Manager - 3-tier system compatible
 *
 * Manages memory decay for session dumps and AICF files:
 * - JSON session dumps: 7/30/90-day lifecycle
 * - AICF files: Compress old entries, keep critical info
 * - Archive management: Move old dumps to archive
 */
export class MemoryLifecycleManager {
  private readonly name: string;
  private readonly projectRoot: string;
  private readonly lifecycle: LifecycleConfig;
  private readonly paths: Paths;

  constructor(options: LifecycleOptions = {}) {
    this.name = "MemoryLifecycleManager";
    this.projectRoot = options.projectRoot ?? process.cwd();

    this.lifecycle = {
      recent: 7,
      medium: 30,
      old: 90,
      purge: 365,
    };

    this.paths = {
      sessionDumps: join(this.projectRoot, ".meta/session-dumps"),
      archive: join(this.projectRoot, ".meta/session-dumps/archive"),
      aicf: join(this.projectRoot, ".aicf"),
      ai: join(this.projectRoot, ".ai"),
    };
  }

  /**
   * Process complete memory lifecycle for 3-tier system
   */
  async processLifecycle(): Promise<LifecycleResults> {
    try {
      console.log(`🔄 ${this.name} processing memory lifecycle...`);

      const results: LifecycleResults = {
        fileOrganization: await this.processFileOrganization(),
        sessionDumps: await this.processSessionDumpLifecycle(),
        aicfFiles: await this.processAICFLifecycle(),
        memoryCompression: await this.processMemoryCompression(),
        statistics: await this.calculateStatistics(),
      };

      console.log(`✅ ${this.name} completed lifecycle processing`);
      return results;
    } catch (error: unknown) {
      const err = error as Error;
      console.error(`❌ ${this.name} lifecycle error:`, err.message);
      throw error;
    }
  }

  /**
   * Process file organization using FileOrganizationAgent
   */
  private async processFileOrganization(): Promise<OrganizationResult> {
    try {
      const agent = new FileOrganizationAgent({
        projectRoot: this.projectRoot,
      });

      const result = await agent.organizeFiles();

      return {
        success: result.errors === 0,
        filesOrganized: result.organized,
      };
    } catch (error: unknown) {
      const err = error as Error;
      return {
        success: false,
        error: err.message,
      };
    }
  }

  /**
   * Process session dump lifecycle
   */
  private async processSessionDumpLifecycle(): Promise<DumpResult> {
    try {
      if (!(await this.directoryExists(this.paths.sessionDumps))) {
        return { processed: 0, archived: 0, deleted: 0 };
      }

      const dumps = await this.getSessionDumps();
      let archived = 0;
      let deleted = 0;

      for (const dump of dumps) {
        if (dump.ageInDays >= this.lifecycle.purge) {
          const shouldDelete = await this.shouldDeleteDump(dump.path);
          if (shouldDelete) {
            await fs.unlink(dump.path);
            deleted++;
          }
        } else if (dump.ageInDays >= this.lifecycle.old) {
          await this.archiveDump(dump.path);
          archived++;
        }
      }

      return {
        processed: dumps.length,
        archived,
        deleted,
      };
    } catch (error: unknown) {
      const err = error as Error;
      return {
        processed: 0,
        archived: 0,
        deleted: 0,
        error: err.message,
      };
    }
  }

  /**
   * Process AICF file lifecycle
   */
  private async processAICFLifecycle(): Promise<AICFResult> {
    try {
      if (!(await this.directoryExists(this.paths.aicf))) {
        return { processed: 0, compressed: 0 };
      }

      const files = await fs.readdir(this.paths.aicf);
      const aicfFiles = files.filter((f) => f.endsWith(".aicf"));

      let compressed = 0;

      for (const file of aicfFiles) {
        const filePath = join(this.paths.aicf, file);
        const stats = await fs.stat(filePath);
        const ageInDays = this.calculateAgeInDays(stats.mtime);

        if (ageInDays >= this.lifecycle.medium) {
          await this.compressAICFFile(filePath);
          compressed++;
        }
      }

      return {
        processed: aicfFiles.length,
        compressed,
      };
    } catch (error: unknown) {
      const err = error as Error;
      return {
        processed: 0,
        compressed: 0,
        error: err.message,
      };
    }
  }

  /**
   * Process memory compression
   */
  private async processMemoryCompression(): Promise<CompressionResult> {
    try {
      const conversationsFile = join(this.paths.aicf, "conversations.aicf");

      if (!(await this.fileExists(conversationsFile))) {
        return { applied: false };
      }

      const originalContent = await fs.readFile(conversationsFile, "utf-8");
      const compressedContent = this.compressConversations(originalContent);

      if (compressedContent.length < originalContent.length) {
        await fs.writeFile(conversationsFile, compressedContent);

        const ratio =
          ((originalContent.length - compressedContent.length) /
            originalContent.length) *
          100;

        return {
          applied: true,
          compressionRatio: Math.round(ratio * 100) / 100,
        };
      }

      return { applied: false };
    } catch (error: unknown) {
      const err = error as Error;
      return {
        applied: false,
        error: err.message,
      };
    }
  }

  /**
   * Calculate memory statistics
   */
  private async calculateStatistics(): Promise<Statistics> {
    try {
      const stats: Statistics = {
        totalFiles: 0,
        totalSize: 0,
        ageDistribution: {},
      };

      if (await this.directoryExists(this.paths.sessionDumps)) {
        const dumps = await this.getSessionDumps();
        stats.totalFiles += dumps.length;

        dumps.forEach((dump) => {
          stats.totalSize += dump.size;

          let category: string;
          if (dump.ageInDays <= this.lifecycle.recent) category = "recent";
          else if (dump.ageInDays <= this.lifecycle.medium) category = "medium";
          else if (dump.ageInDays <= this.lifecycle.old) category = "old";
          else category = "archived";

          stats.ageDistribution[category] =
            (stats.ageDistribution[category] ?? 0) + 1;
        });
      }

      return stats;
    } catch (error: unknown) {
      const err = error as Error;
      return {
        totalFiles: 0,
        totalSize: 0,
        ageDistribution: {},
        error: err.message,
      };
    }
  }

  /**
   * Get all session dumps with metadata
   */
  private async getSessionDumps(): Promise<SessionDump[]> {
    const dumps: SessionDump[] = [];

    try {
      const files = await fs.readdir(this.paths.sessionDumps);

      for (const file of files) {
        if (file.endsWith(".json")) {
          const filePath = join(this.paths.sessionDumps, file);
          const stats = await fs.stat(filePath);

          dumps.push({
            path: filePath,
            ageInDays: this.calculateAgeInDays(stats.mtime),
            size: stats.size,
          });
        }
      }
    } catch {
      // Directory doesn't exist or can't be read
    }

    return dumps;
  }

  /**
   * Calculate age in days from date
   */
  private calculateAgeInDays(date: Date): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Check if dump should be deleted
   */
  private async shouldDeleteDump(dumpPath: string): Promise<boolean> {
    try {
      const content = await fs.readFile(dumpPath, "utf-8");
      const data = JSON.parse(content);

      const hasCriticalDecisions =
        data.decisions?.some(
          (d: { impact?: string }) =>
            d.impact === "CRITICAL" || d.impact === "HIGH"
        ) ?? false;

      return !hasCriticalDecisions;
    } catch {
      return true;
    }
  }

  /**
   * Archive a session dump
   */
  private async archiveDump(dumpPath: string): Promise<void> {
    try {
      await this.ensureDirectoryExists(this.paths.archive);

      const fileName = dumpPath.split("/").pop() ?? "unknown.json";
      const archivePath = join(this.paths.archive, fileName);

      await fs.rename(dumpPath, archivePath);
    } catch (error: unknown) {
      const err = error as Error;
      console.error(`Failed to archive dump: ${err.message}`);
    }
  }

  /**
   * Compress AICF file by removing old entries
   */
  private async compressAICFFile(filePath: string): Promise<void> {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      const lines = content.split("\n");

      const compressedLines: string[] = [];
      let inOldSection = false;

      lines.forEach((line) => {
        if (line.startsWith("@CONVERSATION:")) {
          inOldSection = false;
        }

        if (
          line.includes("IMPACT:CRITICAL") ||
          line.includes("IMPACT:HIGH") ||
          line.startsWith("@")
        ) {
          compressedLines.push(line);
          inOldSection = false;
        } else if (!inOldSection) {
          compressedLines.push(line);
        }
      });

      await fs.writeFile(filePath, compressedLines.join("\n"));
    } catch (error: unknown) {
      const err = error as Error;
      console.error(`Failed to compress AICF file: ${err.message}`);
    }
  }

  /**
   * Compress conversations content
   */
  private compressConversations(content: string): string {
    const lines = content.split("\n");
    const compressed: string[] = [];

    let currentAge = 0;
    let skipNonCritical = false;

    lines.forEach((line) => {
      if (line.includes("age=")) {
        const match = line.match(/age=(\d+)d/);
        if (match?.[1]) {
          currentAge = parseInt(match[1], 10);
          skipNonCritical = currentAge > this.lifecycle.medium;
        }
      }

      if (
        !skipNonCritical ||
        line.startsWith("@") ||
        line.includes("CRITICAL") ||
        line.includes("HIGH")
      ) {
        compressed.push(line);
      }
    });

    return compressed.join("\n");
  }

  /**
   * Check if directory exists
   */
  private async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(dirPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Ensure directory exists
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch {
      // Directory already exists or can't be created
    }
  }
}
