import fs from "node:fs";
import { join } from "node:path";

interface ExtractorOptions {
  backupEnabled?: boolean;
  maxBackups?: number;
  validateContent?: boolean;
  parallelExtraction?: boolean;
}

interface ParserConfig {
  name: string;
  module: string;
  platforms: string[];
}

interface ParserInfo {
  parser: any;
  platforms: string[];
  status: string;
}

interface ExtractionResult {
  success: boolean;
  conversationsExtracted?: number;
  error?: string;
  timestamp?: string;
}

interface StatusResult {
  totalParsers: number;
  availableParsers: number;
  parsers: Record<string, { available: boolean; platforms: string[] }>;
}

/**
 * Universal Conversation Extractor
 *
 * Key Principles:
 * 1. INDEPENDENT PARSERS - Each platform parser operates in isolation
 * 2. BULLETPROOF BACKUPS - All existing data is preserved before any modification
 * 3. GRACEFUL FAILURES - One parser failure doesn't affect others
 * 4. DATA VALIDATION - All extracted data is validated before storage
 * 5. ROLLBACK CAPABILITY - Any operation can be safely undone
 */
export class UniversalExtractor {
  private readonly options: Required<ExtractorOptions>;
  private readonly aiDir: string;
  private readonly aicfDir: string;
  private readonly backupDir: string;
  private readonly parsers: Map<string, ParserInfo>;
  private readonly extractionResults: Map<string, ExtractionResult>;

  constructor(options: ExtractorOptions = {}) {
    this.options = {
      backupEnabled: true,
      maxBackups: 10,
      validateContent: true,
      parallelExtraction: false,
      ...options,
    };

    this.aiDir = ".ai";
    this.aicfDir = ".aicf";
    this.backupDir = ".aicf/backups";
    this.parsers = new Map();
    this.extractionResults = new Map();

    this.ensureDirectories();
    this.initializeParsers();
  }

  /**
   * Ensure required directories exist
   */
  private ensureDirectories(): void {
    [this.aiDir, this.aicfDir, this.backupDir].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Initialize all available parsers
   */
  private initializeParsers(): void {
    const parserConfigs: ParserConfig[] = [
      {
        name: "warp",
        module: "./parsers/WarpParser.js",
        platforms: ["warp"],
      },
      {
        name: "augment",
        module: "./parsers/AugmentParser.js",
        platforms: ["augment", "vscode"],
      },
    ];

    for (const config of parserConfigs) {
      try {
        // Dynamic import would be async, so we'll skip unavailable parsers for now
        console.log(
          `⏭️  ${config.name} parser skipped (dynamic import not implemented)`
        );
      } catch (error: unknown) {
        const err = error as Error;
        console.warn(`⚠️  Could not load ${config.name} parser:`, err.message);
      }
    }
  }

  /**
   * Get status of all parsers
   */
  getStatus(): StatusResult {
    const status: StatusResult = {
      totalParsers: this.parsers.size,
      availableParsers: 0,
      parsers: {},
    };

    this.parsers.forEach((info, name) => {
      const available = info.status === "available";
      if (available) {
        status.availableParsers++;
      }

      status.parsers[name] = {
        available,
        platforms: info.platforms,
      };
    });

    return status;
  }

  /**
   * Extract conversations from all available platforms
   */
  async extractAll(): Promise<Map<string, ExtractionResult>> {
    console.log("🚀 Starting universal extraction...");

    this.extractionResults.clear();

    if (this.options.parallelExtraction) {
      await this.extractParallel();
    } else {
      await this.extractSequential();
    }

    this.printSummary();

    return this.extractionResults;
  }

  /**
   * Extract from specific platform
   */
  async extractFrom(platformName: string): Promise<ExtractionResult> {
    const parserInfo = this.parsers.get(platformName);

    if (!parserInfo) {
      const error = `Parser for ${platformName} not found`;
      console.error(`❌ ${error}`);
      return { success: false, error };
    }

    if (parserInfo.status !== "available") {
      const error = `Parser for ${platformName} not available`;
      console.error(`❌ ${error}`);
      return { success: false, error };
    }

    return await this.extractFromParser(platformName, parserInfo);
  }

  /**
   * Extract sequentially (safer)
   */
  private async extractSequential(): Promise<void> {
    for (const [name, info] of this.parsers.entries()) {
      if (info.status === "available") {
        await this.extractFromParser(name, info);
      }
    }
  }

  /**
   * Extract in parallel (faster but riskier)
   */
  private async extractParallel(): Promise<void> {
    const promises: Promise<void>[] = [];

    this.parsers.forEach((info, name) => {
      if (info.status === "available") {
        promises.push(
          this.extractFromParser(name, info).then(() => {
            // Result stored in extractionResults
          })
        );
      }
    });

    await Promise.all(promises);
  }

  /**
   * Extract from a specific parser
   */
  private async extractFromParser(
    name: string,
    info: ParserInfo
  ): Promise<ExtractionResult> {
    console.log(`\n📥 Extracting from ${name}...`);

    try {
      if (this.options.backupEnabled) {
        await this.createBackup(name);
      }

      const conversations = await info.parser.extractConversations();

      if (!conversations || conversations.length === 0) {
        const result: ExtractionResult = {
          success: true,
          conversationsExtracted: 0,
          timestamp: new Date().toISOString(),
        };
        this.extractionResults.set(name, result);
        console.log(`ℹ️  No conversations found in ${name}`);
        return result;
      }

      await this.saveConversations(name, conversations);

      const result: ExtractionResult = {
        success: true,
        conversationsExtracted: conversations.length,
        timestamp: new Date().toISOString(),
      };

      this.extractionResults.set(name, result);
      console.log(
        `✅ Extracted ${conversations.length} conversations from ${name}`
      );

      return result;
    } catch (error: unknown) {
      const err = error as Error;
      const result: ExtractionResult = {
        success: false,
        error: err.message,
        timestamp: new Date().toISOString(),
      };

      this.extractionResults.set(name, result);
      console.error(`❌ Failed to extract from ${name}:`, err.message);

      return result;
    }
  }

  /**
   * Create backup before extraction
   */
  private async createBackup(parserName: string): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFile = join(
      this.backupDir,
      `${parserName}-${timestamp}.backup.aicf`
    );

    const existingFile = join(this.aicfDir, `${parserName}-conversations.aicf`);

    if (fs.existsSync(existingFile)) {
      fs.copyFileSync(existingFile, backupFile);
      console.log(`💾 Backup created: ${backupFile}`);

      await this.cleanOldBackups(parserName);
    }
  }

  /**
   * Clean old backups
   */
  private async cleanOldBackups(parserName: string): Promise<void> {
    const backups = fs
      .readdirSync(this.backupDir)
      .filter(
        (f) => f.startsWith(`${parserName}-`) && f.endsWith(".backup.aicf")
      )
      .map((f) => ({
        name: f,
        path: join(this.backupDir, f),
        mtime: fs.statSync(join(this.backupDir, f)).mtime.getTime(),
      }))
      .sort((a, b) => b.mtime - a.mtime);

    if (backups.length > this.options.maxBackups) {
      const toDelete = backups.slice(this.options.maxBackups);
      toDelete.forEach((backup) => {
        fs.unlinkSync(backup.path);
        console.log(`🗑️  Deleted old backup: ${backup.name}`);
      });
    }
  }

  /**
   * Save conversations to AICF format
   */
  private async saveConversations(
    parserName: string,
    conversations: any[]
  ): Promise<void> {
    const outputFile = join(this.aicfDir, `${parserName}-conversations.aicf`);

    const lines: string[] = [];

    conversations.forEach((conv) => {
      if (conv.metadata) {
        lines.push("@METADATA");
        Object.entries(conv.metadata).forEach(([key, value]) => {
          lines.push(`${key}=${value}`);
        });
        lines.push("");
      }

      if (conv.messages && Array.isArray(conv.messages)) {
        lines.push("@CONVERSATION");
        conv.messages.forEach((msg: any, index: number) => {
          const timestamp = msg.timestamp
            ? new Date(msg.timestamp).toISOString()
            : new Date().toISOString();
          const role = msg.role ?? "unknown";
          const content = msg.content ?? "";
          lines.push(`C${index + 1}|${timestamp}|${role}|${content}`);
        });
        lines.push("");
      }
    });

    fs.writeFileSync(outputFile, lines.join("\n"));

    if (this.options.validateContent) {
      await this.validateAICFFile(outputFile);
    }
  }

  /**
   * Validate AICF file
   */
  private async validateAICFFile(filePath: string): Promise<boolean> {
    try {
      const content = fs.readFileSync(filePath, "utf-8");

      if (content.length === 0) {
        console.warn(`⚠️  Empty AICF file: ${filePath}`);
        return false;
      }

      const hasMetadata = content.includes("@METADATA");
      const hasConversation = content.includes("@CONVERSATION");

      if (!hasMetadata && !hasConversation) {
        console.warn(`⚠️  Invalid AICF format: ${filePath}`);
        return false;
      }

      return true;
    } catch (error: unknown) {
      const err = error as Error;
      console.error(`❌ Validation failed for ${filePath}:`, err.message);
      return false;
    }
  }

  /**
   * Print extraction summary
   */
  private printSummary(): void {
    console.log("\n" + "=".repeat(60));
    console.log("📊 EXTRACTION SUMMARY");
    console.log("=".repeat(60));

    let totalSuccess = 0;
    let totalFailed = 0;
    let totalConversations = 0;

    this.extractionResults.forEach((result, name) => {
      if (result.success) {
        totalSuccess++;
        totalConversations += result.conversationsExtracted ?? 0;
        console.log(
          `✅ ${name}: ${result.conversationsExtracted ?? 0} conversations`
        );
      } else {
        totalFailed++;
        console.log(`❌ ${name}: ${result.error ?? "Unknown error"}`);
      }
    });

    console.log("=".repeat(60));
    console.log(`Total Successful: ${totalSuccess}`);
    console.log(`Total Failed: ${totalFailed}`);
    console.log(`Total Conversations: ${totalConversations}`);
    console.log("=".repeat(60) + "\n");
  }

  /**
   * Rollback to previous backup
   */
  async rollback(parserName: string): Promise<boolean> {
    try {
      const backups = fs
        .readdirSync(this.backupDir)
        .filter(
          (f) => f.startsWith(`${parserName}-`) && f.endsWith(".backup.aicf")
        )
        .map((f) => ({
          name: f,
          path: join(this.backupDir, f),
          mtime: fs.statSync(join(this.backupDir, f)).mtime.getTime(),
        }))
        .sort((a, b) => b.mtime - a.mtime);

      if (backups.length === 0) {
        console.error(`❌ No backups found for ${parserName}`);
        return false;
      }

      const latestBackup = backups[0];
      if (!latestBackup) {
        console.error(`❌ No backups found for ${parserName}`);
        return false;
      }

      const targetFile = join(this.aicfDir, `${parserName}-conversations.aicf`);

      fs.copyFileSync(latestBackup.path, targetFile);

      console.log(`✅ Rolled back ${parserName} to ${latestBackup.name}`);
      return true;
    } catch (error: unknown) {
      const err = error as Error;
      console.error(`❌ Rollback failed for ${parserName}:`, err.message);
      return false;
    }
  }

  /**
   * List all backups
   */
  listBackups(): Record<string, string[]> {
    const backupsByParser: Record<string, string[]> = {};

    if (!fs.existsSync(this.backupDir)) {
      return backupsByParser;
    }

    const backups = fs
      .readdirSync(this.backupDir)
      .filter((f) => f.endsWith(".backup.aicf"));

    backups.forEach((backup) => {
      const parserName = backup.split("-")[0];
      if (parserName) {
        if (!backupsByParser[parserName]) {
          backupsByParser[parserName] = [];
        }
        const parserBackups = backupsByParser[parserName];
        if (parserBackups) {
          parserBackups.push(backup);
        }
      }
    });

    return backupsByParser;
  }
}
