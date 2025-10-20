import { UniversalExtractor } from "./UniversalExtractor.js";
import { FileOrganizationAgent } from "../agents/file-organization-agent.js";
import fs from "node:fs";

interface IntegrationOptions {
  preserveExisting?: boolean;
  normalizeFormat?: boolean;
  organizeFiles?: boolean;
  maxExtractionAge?: string;
  backupEnabled?: boolean;
  validateContent?: boolean;
}

interface WorkflowOptions {
  platforms?: string;
  maxConversations?: number;
}

interface ExtractionResults {
  extraction: any;
  processing: any;
  organization: any;
  integration: any;
  summary: Record<string, any>;
}

interface ProcessingResult {
  processed: any[];
  skipped: number;
  errors: string[];
}

interface IntegrationResult {
  added: number;
  skipped: number;
  errors: string[];
}

/**
 * AICF Extractor Integration
 *
 * Safely connects the Universal Extractor to existing AICF core systems
 * Key principles:
 * 1. PRESERVE ALL EXISTING DATA - Never overwrite without backup
 * 2. INCREMENTAL UPDATES - Only add new conversations, don't replace existing
 * 3. FORMAT NORMALIZATION - Convert all extracted data to clean AICF 3.0 format
 * 4. VALIDATION - Ensure data quality before storage
 */
export class AICFExtractorIntegration {
  private readonly options: Required<IntegrationOptions>;
  private readonly extractor: UniversalExtractor;
  private readonly organizer: FileOrganizationAgent;
  private readonly conversationFile: string;
  private readonly processedTrackingFile: string;

  constructor(options: IntegrationOptions = {}) {
    this.options = {
      preserveExisting: true,
      normalizeFormat: true,
      organizeFiles: true,
      maxExtractionAge: "7d",
      backupEnabled: true,
      validateContent: true,
      ...options,
    };

    this.extractor = new UniversalExtractor({
      backupEnabled: this.options.backupEnabled,
      validateContent: this.options.validateContent,
    });

    this.organizer = new FileOrganizationAgent();

    this.conversationFile = ".aicf/conversations.aicf";
    this.processedTrackingFile = ".aicf/extracted-conversations.json";
  }

  /**
   * Full extraction and integration workflow
   */
  async extractAndIntegrate(
    _options: WorkflowOptions = {}
  ): Promise<ExtractionResults> {
    console.log("🚀 Starting AICF extraction and integration workflow...");

    const results: ExtractionResults = {
      extraction: null,
      processing: null,
      organization: null,
      integration: null,
      summary: {},
    };

    try {
      console.log(
        "\n📊 Step 1: Extracting conversations from all platforms..."
      );
      results.extraction = await this.extractor.extractAll();

      console.log(
        "\n🔧 Step 2: Processing and normalizing conversation data..."
      );
      results.processing = await this.processConversations([]);

      console.log("\n💾 Step 3: Integrating with existing AICF data...");
      results.integration = await this.safelyIntegrateConversations(
        results.processing.processed
      );

      if (this.options.organizeFiles) {
        console.log("\n📁 Step 4: Organizing files...");
        results.organization = await this.organizer.organizeFiles();
      }

      results.summary = this.generateSummary(results);

      console.log("\n✅ Extraction and integration workflow completed");
      this.printSummary(results.summary);

      return results;
    } catch (error: unknown) {
      const err = error as Error;
      console.error("❌ Workflow failed:", err.message);
      throw error;
    }
  }

  /**
   * Process conversations
   */
  private async processConversations(
    conversations: any[]
  ): Promise<ProcessingResult> {
    const result: ProcessingResult = {
      processed: [],
      skipped: 0,
      errors: [],
    };

    for (const conv of conversations) {
      try {
        if (await this.isAlreadyProcessed(conv.id)) {
          result.skipped++;
          continue;
        }

        const normalized = this.normalizeConversation(conv);

        if (this.validateConversation(normalized)) {
          result.processed.push(normalized);
        } else {
          result.skipped++;
        }
      } catch (error: unknown) {
        const err = error as Error;
        result.errors.push(`Failed to process conversation: ${err.message}`);
      }
    }

    return result;
  }

  /**
   * Safely integrate conversations
   */
  private async safelyIntegrateConversations(
    conversations: any[]
  ): Promise<IntegrationResult> {
    const result: IntegrationResult = {
      added: 0,
      skipped: 0,
      errors: [],
    };

    if (this.options.preserveExisting) {
      await this.createBackup();
    }

    try {
      const existingContent = this.loadExistingConversations();

      for (const conv of conversations) {
        if (!this.isDuplicate(conv, existingContent)) {
          await this.appendConversation(conv);
          await this.markAsProcessed(conv.id);
          result.added++;
        } else {
          result.skipped++;
        }
      }
    } catch (error: unknown) {
      const err = error as Error;
      result.errors.push(`Integration failed: ${err.message}`);
    }

    return result;
  }

  /**
   * Check if conversation is already processed
   */
  private async isAlreadyProcessed(conversationId: string): Promise<boolean> {
    try {
      if (!fs.existsSync(this.processedTrackingFile)) {
        return false;
      }

      const content = fs.readFileSync(this.processedTrackingFile, "utf-8");
      const processed = JSON.parse(content);

      return processed.includes(conversationId);
    } catch {
      return false;
    }
  }

  /**
   * Normalize conversation format
   */
  private normalizeConversation(conversation: any): any {
    return {
      id: conversation.id,
      metadata: conversation.metadata ?? {},
      messages: conversation.messages ?? [],
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Validate conversation
   */
  private validateConversation(conversation: any): boolean {
    return (
      conversation.id &&
      conversation.messages &&
      Array.isArray(conversation.messages) &&
      conversation.messages.length > 0
    );
  }

  /**
   * Create backup
   */
  private async createBackup(): Promise<void> {
    if (!fs.existsSync(this.conversationFile)) {
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFile = `.aicf/backups/conversations-${timestamp}.backup.aicf`;

    const backupDir = ".aicf/backups";
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    fs.copyFileSync(this.conversationFile, backupFile);
    console.log(`💾 Backup created: ${backupFile}`);
  }

  /**
   * Load existing conversations
   */
  private loadExistingConversations(): string {
    try {
      if (fs.existsSync(this.conversationFile)) {
        return fs.readFileSync(this.conversationFile, "utf-8");
      }
      return "";
    } catch {
      return "";
    }
  }

  /**
   * Check if conversation is duplicate
   */
  private isDuplicate(conversation: any, existingContent: string): boolean {
    return existingContent.includes(`conversation_id=${conversation.id}`);
  }

  /**
   * Append conversation
   */
  private async appendConversation(conversation: any): Promise<void> {
    const lines: string[] = [];

    lines.push("@METADATA");
    lines.push(`conversation_id=${conversation.id}`);
    lines.push(`timestamp=${conversation.timestamp}`);
    lines.push("");

    lines.push("@CONVERSATION");
    conversation.messages.forEach((msg: any, index: number) => {
      const timestamp = msg.timestamp
        ? new Date(msg.timestamp).toISOString()
        : new Date().toISOString();
      lines.push(`C${index + 1}|${timestamp}|${msg.role}|${msg.content}`);
    });
    lines.push("");

    fs.appendFileSync(this.conversationFile, lines.join("\n"));
  }

  /**
   * Mark conversation as processed
   */
  private async markAsProcessed(conversationId: string): Promise<void> {
    let processed: string[] = [];

    if (fs.existsSync(this.processedTrackingFile)) {
      const content = fs.readFileSync(this.processedTrackingFile, "utf-8");
      processed = JSON.parse(content);
    }

    processed.push(conversationId);

    fs.writeFileSync(
      this.processedTrackingFile,
      JSON.stringify(processed, null, 2)
    );
  }

  /**
   * Generate summary
   */
  private generateSummary(results: ExtractionResults): Record<string, any> {
    return {
      extraction: results.extraction,
      processing: results.processing,
      integration: results.integration,
      organization: results.organization,
    };
  }

  /**
   * Print summary
   */
  private printSummary(summary: Record<string, any>): void {
    console.log("\n" + "=".repeat(60));
    console.log("📊 WORKFLOW SUMMARY");
    console.log("=".repeat(60));
    console.log(JSON.stringify(summary, null, 2));
    console.log("=".repeat(60) + "\n");
  }
}
