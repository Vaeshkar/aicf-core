import fs from "node:fs";
import { join } from "node:path";

interface ParserOptions {
  verbose?: boolean;
}

interface ConversationData {
  source?: string;
  aiAssistant?: string;
  messages: ConversationMessage[];
  metadata?: Record<string, any>;
}

interface ConversationMessage {
  type?: string;
  role: string;
  content: string;
  timestamp?: number;
  context?: {
    aiSource?: string;
  };
}

interface ProcessOptions {
  skipDuplicates?: boolean;
  routeToSpecialized?: boolean;
}

interface ProcessResult {
  success: boolean;
  platform: string;
  routedFiles: string[];
  errors: string[];
}

/**
 * Intelligent Conversation Parser with specialized routing
 * Routes content to appropriate .aicf files and prevents duplication
 */
export class IntelligentConversationParser {
  private readonly name: string;
  private readonly processedChunks: Set<string>;
  private readonly verbose: boolean;

  constructor(options: ParserOptions = {}) {
    this.name = "IntelligentConversationParser";
    this.processedChunks = new Set();
    this.verbose = options.verbose ?? false;
  }

  private log(message: string): void {
    if (this.verbose) {
      console.log(message);
    }
  }

  /**
   * Detect AI platform from conversation data
   */
  detectAIPlatform(conversationData: ConversationData): string {
    if (conversationData.source) {
      return conversationData.source.toLowerCase();
    }

    if (conversationData.aiAssistant) {
      return conversationData.aiAssistant.toLowerCase();
    }

    if (conversationData.messages && conversationData.messages.length > 0) {
      const firstMessage = conversationData.messages[0];
      if (firstMessage?.context?.aiSource) {
        return firstMessage.context.aiSource.toLowerCase();
      }
    }

    if (conversationData.messages) {
      const messageTypes = conversationData.messages
        .map((m) => m.type)
        .filter(Boolean);

      if (
        messageTypes.includes("USER_QUERY") ||
        messageTypes.includes("AI_ACTION")
      ) {
        return "warp";
      }
      if (messageTypes.includes("COPILOT_CHAT")) {
        return "copilot";
      }
    }

    return "unknown";
  }

  /**
   * Process conversation and route to specialized files
   */
  async processConversation(
    conversationData: ConversationData,
    options: ProcessOptions = {}
  ): Promise<ProcessResult> {
    try {
      console.log(`🧠 ${this.name} processing conversation...`);

      if (!conversationData) {
        throw new Error("No conversation data provided");
      }

      const aiPlatform = this.detectAIPlatform(conversationData);
      console.log(`🤖 Detected AI platform: ${aiPlatform}`);

      const result: ProcessResult = {
        success: true,
        platform: aiPlatform,
        routedFiles: [],
        errors: [],
      };

      const skipDuplicates = options.skipDuplicates ?? true;
      const routeToSpecialized = options.routeToSpecialized ?? true;

      if (skipDuplicates) {
        const conversationId = this.generateConversationId(conversationData);
        if (this.processedChunks.has(conversationId)) {
          console.log("⏭️  Skipping duplicate conversation");
          return result;
        }
        this.processedChunks.add(conversationId);
      }

      if (routeToSpecialized) {
        const routedFiles = await this.routeToSpecializedFiles(
          conversationData,
          aiPlatform
        );
        result.routedFiles = routedFiles;
      }

      await this.writeMainConversationFile(conversationData, aiPlatform);

      console.log(`✅ Conversation processed successfully`);
      return result;
    } catch (error: unknown) {
      const err = error as Error;
      console.error(`❌ Error processing conversation:`, err.message);
      return {
        success: false,
        platform: "unknown",
        routedFiles: [],
        errors: [err.message],
      };
    }
  }

  /**
   * Generate conversation ID for deduplication
   */
  private generateConversationId(conversationData: ConversationData): string {
    const firstMessage = conversationData.messages[0];
    const lastMessage =
      conversationData.messages[conversationData.messages.length - 1];

    if (firstMessage && lastMessage) {
      return `${firstMessage.content.substring(0, 50)}-${lastMessage.content.substring(0, 50)}`;
    }

    return `conv-${Date.now()}`;
  }

  /**
   * Route to specialized files
   */
  private async routeToSpecializedFiles(
    conversationData: ConversationData,
    aiPlatform: string
  ): Promise<string[]> {
    const routedFiles: string[] = [];

    const analysis = this.analyzeConversation(conversationData);

    if (analysis.hasTechnicalDecisions) {
      await this.writeTechnicalDecisions(conversationData, aiPlatform);
      routedFiles.push("technical-decisions.aicf");
    }

    if (analysis.hasCodeChanges) {
      await this.writeCodeChanges(conversationData, aiPlatform);
      routedFiles.push("code-changes.aicf");
    }

    if (analysis.hasInsights) {
      await this.writeInsights(conversationData, aiPlatform);
      routedFiles.push("insights.aicf");
    }

    return routedFiles;
  }

  /**
   * Analyze conversation content
   */
  private analyzeConversation(conversationData: ConversationData): {
    hasTechnicalDecisions: boolean;
    hasCodeChanges: boolean;
    hasInsights: boolean;
  } {
    const content = conversationData.messages
      .map((m) => m.content.toLowerCase())
      .join(" ");

    return {
      hasTechnicalDecisions:
        content.includes("decision") ||
        content.includes("decided") ||
        content.includes("chose"),
      hasCodeChanges:
        content.includes("code") ||
        content.includes("function") ||
        content.includes("class"),
      hasInsights:
        content.includes("insight") ||
        content.includes("learned") ||
        content.includes("discovered"),
    };
  }

  /**
   * Write main conversation file
   */
  private async writeMainConversationFile(
    conversationData: ConversationData,
    aiPlatform: string
  ): Promise<void> {
    const aicfDir = ".aicf";
    if (!fs.existsSync(aicfDir)) {
      fs.mkdirSync(aicfDir, { recursive: true });
    }

    const filepath = join(aicfDir, "conversations.aicf");
    const content = this.convertToAICF(conversationData, aiPlatform);

    fs.appendFileSync(filepath, content + "\n");
    this.log(`✅ Wrote to ${filepath}`);
  }

  /**
   * Write technical decisions
   */
  private async writeTechnicalDecisions(
    conversationData: ConversationData,
    aiPlatform: string
  ): Promise<void> {
    const aicfDir = ".aicf";
    const filepath = join(aicfDir, "technical-decisions.aicf");
    const content = this.convertToAICF(conversationData, aiPlatform);

    fs.appendFileSync(filepath, content + "\n");
    this.log(`✅ Wrote to ${filepath}`);
  }

  /**
   * Write code changes
   */
  private async writeCodeChanges(
    conversationData: ConversationData,
    aiPlatform: string
  ): Promise<void> {
    const aicfDir = ".aicf";
    const filepath = join(aicfDir, "code-changes.aicf");
    const content = this.convertToAICF(conversationData, aiPlatform);

    fs.appendFileSync(filepath, content + "\n");
    this.log(`✅ Wrote to ${filepath}`);
  }

  /**
   * Write insights
   */
  private async writeInsights(
    conversationData: ConversationData,
    aiPlatform: string
  ): Promise<void> {
    const aicfDir = ".aicf";
    const filepath = join(aicfDir, "insights.aicf");
    const content = this.convertToAICF(conversationData, aiPlatform);

    fs.appendFileSync(filepath, content + "\n");
    this.log(`✅ Wrote to ${filepath}`);
  }

  /**
   * Convert conversation to AICF format
   */
  private convertToAICF(
    conversationData: ConversationData,
    aiPlatform: string
  ): string {
    const lines: string[] = [];

    lines.push("@METADATA");
    lines.push(`source=${aiPlatform}`);
    lines.push(`timestamp=${new Date().toISOString()}`);
    lines.push("");

    lines.push("@CONVERSATION");
    conversationData.messages.forEach((msg, index) => {
      const timestamp = msg.timestamp
        ? new Date(msg.timestamp).toISOString()
        : new Date().toISOString();
      lines.push(`C${index + 1}|${timestamp}|${msg.role}|${msg.content}`);
    });
    lines.push("");

    return lines.join("\n");
  }
}
