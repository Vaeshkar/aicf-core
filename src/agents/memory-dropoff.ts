import { promises as fs } from "node:fs";
import { join } from "node:path";

interface DropOffOptions {
  projectRoot?: string;
}

interface DecayConfig {
  recent: number;
  medium: number;
  old: number;
  archive: number;
}

interface ProcessResult {
  applied: boolean;
  reason?: string;
  itemsProcessed: number;
  compressionRatio?: number;
  decayStatistics?: DecayStatistics;
  error?: string;
}

interface ConversationMetadata {
  [key: string]: string;
}

interface ConversationSections {
  [key: string]: string[];
}

interface Conversation {
  id: string;
  metadata: ConversationMetadata;
  sections: ConversationSections;
  originalContent: string[];
  timestamp: Date | null;
  ageInDays: number;
  decayLevel?: string;
  compressed?: boolean;
  compressedContent?: string[];
}

interface DecayStatistics {
  total: number;
  recent: number;
  medium: number;
  old: number;
  archived: number;
}

interface MemoryStatistics {
  totalConversations: number;
  totalSize: number;
  ageDistribution: Record<string, number>;
  decayRecommendations: {
    candidatesForDecay: number;
    estimatedCompressionRatio: string;
    recommendDecay: boolean;
  };
  error?: string;
}

/**
 * MemoryDropOffAgent - Implements intelligent memory decay strategy
 * Manages memory hierarchy to prevent infinite growth while preserving important information
 */
export class MemoryDropOffAgent {
  private readonly projectRoot: string;
  private readonly decayConfig: DecayConfig;

  constructor(options: DropOffOptions = {}) {
    this.projectRoot = options.projectRoot ?? process.cwd();

    this.decayConfig = {
      recent: 7,
      medium: 30,
      old: 90,
      archive: 365,
    };
  }

  /**
   * Process memory decay for all stored conversations
   */
  async processMemoryDecay(): Promise<ProcessResult> {
    try {
      const aicfPath = join(this.projectRoot, ".aicf");
      const conversationsFile = join(aicfPath, "conversations.aicf");

      if (!(await this.fileExists(conversationsFile))) {
        return {
          applied: false,
          reason: "No conversations file found",
          itemsProcessed: 0,
        };
      }

      const rawContent = await fs.readFile(conversationsFile, "utf-8");
      const conversations = this.parseConversations(rawContent);

      if (conversations.length === 0) {
        return {
          applied: false,
          reason: "No conversations to process",
          itemsProcessed: 0,
        };
      }

      const processedConversations = this.applyMemoryDecay(conversations);

      const compressedContent = this.formatCompressedConversations(
        processedConversations
      );
      await fs.writeFile(conversationsFile, compressedContent);

      await this.createBackupIfNeeded(conversationsFile, rawContent);

      return {
        applied: true,
        itemsProcessed: conversations.length,
        compressionRatio: this.calculateCompressionRatio(
          rawContent,
          compressedContent
        ),
        decayStatistics: this.calculateDecayStatistics(processedConversations),
      };
    } catch (error: unknown) {
      const err = error as Error;
      return {
        applied: false,
        error: err.message,
        itemsProcessed: 0,
      };
    }
  }

  /**
   * Parse conversations from AICF content
   */
  private parseConversations(content: string): Conversation[] {
    const conversations: Conversation[] = [];
    const lines = content.split("\n");
    let currentConversation: Conversation | null = null;
    let currentSection: string | null = null;

    lines.forEach((line) => {
      line = line.trim();

      if (line.startsWith("@CONVERSATION:")) {
        if (currentConversation) {
          conversations.push(currentConversation);
        }

        currentConversation = {
          id: line.replace("@CONVERSATION:", ""),
          metadata: {},
          sections: {},
          originalContent: [],
          timestamp: null,
          ageInDays: 0,
        };
        currentSection = null;
      } else if (currentConversation) {
        currentConversation.originalContent.push(line);

        if (line.includes("=") && !line.startsWith("@")) {
          const [key, ...valueParts] = line.split("=");
          if (key) {
            const value = valueParts.join("=");
            currentConversation.metadata[key] = value;

            if (key === "timestamp_end") {
              currentConversation.timestamp = new Date(value);
              currentConversation.ageInDays = this.calculateAgeInDays(
                currentConversation.timestamp
              );
            }
          }
        }

        if (line.startsWith("@")) {
          currentSection = line;
          currentConversation.sections[currentSection] = [];
        } else if (currentSection && line.length > 0) {
          const section = currentConversation.sections[currentSection];
          if (section) {
            section.push(line);
          }
        }
      }
    });

    if (currentConversation) {
      conversations.push(currentConversation);
    }

    return conversations;
  }

  /**
   * Apply memory decay strategy based on conversation age
   */
  private applyMemoryDecay(conversations: Conversation[]): Conversation[] {
    return conversations.map((conversation) => {
      const age = conversation.ageInDays;

      if (age <= this.decayConfig.recent) {
        return {
          ...conversation,
          decayLevel: "RECENT",
          compressed: false,
        };
      } else if (age <= this.decayConfig.medium) {
        return {
          ...conversation,
          decayLevel: "MEDIUM",
          compressed: true,
          compressedContent: this.compressToKeyPoints(conversation),
        };
      } else if (age <= this.decayConfig.old) {
        return {
          ...conversation,
          decayLevel: "OLD",
          compressed: true,
          compressedContent: this.compressToSingleLine(conversation),
        };
      } else {
        return {
          ...conversation,
          decayLevel: "ARCHIVED",
          compressed: true,
          compressedContent: this.compressToCriticalOnly(conversation),
        };
      }
    });
  }

  /**
   * Compress conversation to key points (medium decay)
   */
  private compressToKeyPoints(conversation: Conversation): string[] {
    const keyPoints: string[] = [];

    keyPoints.push(`@CONVERSATION:${conversation.id}`);
    keyPoints.push(
      `timestamp=${conversation.metadata["timestamp_end"] ?? "unknown"}`
    );
    keyPoints.push(`age=${conversation.ageInDays}d`);

    const decisionsSection = conversation.sections["@DECISIONS"];
    if (decisionsSection) {
      const criticalDecisions = decisionsSection.filter(
        (line) =>
          line.includes("IMPACT:CRITICAL") || line.includes("IMPACT:HIGH")
      );

      if (criticalDecisions.length > 0) {
        keyPoints.push("@DECISIONS_KEY");
        criticalDecisions.slice(0, 3).forEach((decision) => {
          const parts = decision.split("|");
          if (parts.length >= 3 && parts[0] && parts[2]) {
            keyPoints.push(`${parts[0]}|${parts[2]}`);
          }
        });
      }
    }

    const insightsSection = conversation.sections["@INSIGHTS"];
    if (insightsSection) {
      const criticalInsights = insightsSection.filter(
        (line) => line.includes("|CRITICAL|") || line.includes("|HIGH|")
      );

      if (criticalInsights.length > 0) {
        keyPoints.push("@INSIGHTS_KEY");
        criticalInsights.slice(0, 2).forEach((insight) => {
          const parts = insight.split("|");
          if (parts.length >= 2 && parts[0] && parts[1]) {
            keyPoints.push(`${parts[0]}|${parts[1]}`);
          }
        });
      }
    }

    const stateSection = conversation.sections["@STATE"];
    if (stateSection) {
      const workingOn = stateSection.find((line) =>
        line.startsWith("working_on=")
      );
      if (workingOn) {
        keyPoints.push("@STATE_FINAL");
        keyPoints.push(workingOn);
      }
    }

    keyPoints.push("");
    return keyPoints;
  }

  /**
   * Compress conversation to single line (old decay)
   */
  private compressToSingleLine(conversation: Conversation): string[] {
    const date = conversation.timestamp
      ? conversation.timestamp.toISOString().split("T")[0]
      : "unknown";

    let criticalDecision = "no_decisions";
    const decisionsSection = conversation.sections["@DECISIONS"];
    if (decisionsSection) {
      const critical = decisionsSection.find((line) =>
        line.includes("IMPACT:CRITICAL")
      );
      if (critical) {
        const parts = critical.split("|");
        criticalDecision = parts[0] ?? "unknown_decision";
      }
    }

    let outcome = "unknown";
    const stateSection = conversation.sections["@STATE"];
    if (stateSection) {
      const workingOn = stateSection.find((line) =>
        line.startsWith("working_on=")
      );
      if (workingOn) {
        const parts = workingOn.split("=");
        outcome = parts[1] ?? "unknown";
      }
    }

    return [`${date}|${criticalDecision}|outcome:${outcome}`, ""];
  }

  /**
   * Compress to critical information only (archived decay)
   */
  private compressToCriticalOnly(conversation: Conversation): string[] {
    const criticalInfo: string[] = [];

    const decisionsSection = conversation.sections["@DECISIONS"];
    if (decisionsSection) {
      const criticalDecisions = decisionsSection.filter((line) =>
        line.includes("IMPACT:CRITICAL")
      );

      if (criticalDecisions.length > 0) {
        const date = conversation.timestamp
          ? conversation.timestamp.toISOString().split("T")[0]
          : "archived";
        criticalInfo.push(`@ARCHIVED:${date}`);

        criticalDecisions.slice(0, 1).forEach((decision) => {
          const parts = decision.split("|");
          if (parts.length > 0 && parts[0]) {
            criticalInfo.push(`CRITICAL:${parts[0]}`);
          }
        });
        criticalInfo.push("");
      }
    }

    return criticalInfo;
  }

  /**
   * Calculate age in days from timestamp
   */
  private calculateAgeInDays(timestamp: Date | null): number {
    if (!timestamp) return 999;

    const now = new Date();
    const diffTime = Math.abs(now.getTime() - timestamp.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Format processed conversations back to AICF format
   */
  private formatCompressedConversations(conversations: Conversation[]): string {
    const lines: string[] = [];

    conversations.forEach((conversation) => {
      if (conversation.compressed && conversation.compressedContent) {
        lines.push(...conversation.compressedContent);
      } else {
        lines.push(`@CONVERSATION:${conversation.id}`);
        lines.push(...conversation.originalContent);
        lines.push("");
      }
    });

    return lines.join("\n");
  }

  /**
   * Calculate compression ratio
   */
  private calculateCompressionRatio(
    originalContent: string,
    compressedContent: string
  ): number {
    const originalSize = originalContent.length;
    const compressedSize = compressedContent.length;

    if (originalSize === 0) return 0;

    const ratio = ((originalSize - compressedSize) / originalSize) * 100;
    return Math.round(ratio * 100) / 100;
  }

  /**
   * Calculate decay statistics
   */
  private calculateDecayStatistics(
    conversations: Conversation[]
  ): DecayStatistics {
    const stats: DecayStatistics = {
      total: conversations.length,
      recent: 0,
      medium: 0,
      old: 0,
      archived: 0,
    };

    conversations.forEach((conv) => {
      const level = conv.decayLevel?.toLowerCase() as keyof DecayStatistics;
      if (level && level in stats) {
        stats[level]++;
      }
    });

    return stats;
  }

  /**
   * Create backup of original content if needed
   */
  private async createBackupIfNeeded(
    filePath: string,
    content: string
  ): Promise<void> {
    const backupPath = filePath + ".backup";

    if (!(await this.fileExists(backupPath))) {
      await fs.writeFile(backupPath, content);
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
   * Get memory decay statistics without applying decay
   */
  async getMemoryStatistics(): Promise<MemoryStatistics> {
    try {
      const aicfPath = join(this.projectRoot, ".aicf");
      const conversationsFile = join(aicfPath, "conversations.aicf");

      if (!(await this.fileExists(conversationsFile))) {
        return { error: "No conversations file found" } as MemoryStatistics;
      }

      const rawContent = await fs.readFile(conversationsFile, "utf-8");
      const conversations = this.parseConversations(rawContent);

      const stats: MemoryStatistics = {
        totalConversations: conversations.length,
        totalSize: rawContent.length,
        ageDistribution: {},
        decayRecommendations: {
          candidatesForDecay: 0,
          estimatedCompressionRatio: "0%",
          recommendDecay: false,
        },
      };

      conversations.forEach((conv) => {
        const age = conv.ageInDays;
        let category: string;

        if (age <= this.decayConfig.recent) category = "recent";
        else if (age <= this.decayConfig.medium) category = "medium";
        else if (age <= this.decayConfig.old) category = "old";
        else category = "archived";

        stats.ageDistribution[category] =
          (stats.ageDistribution[category] ?? 0) + 1;
      });

      const candidatesForDecay = conversations.filter(
        (conv) => conv.ageInDays > this.decayConfig.recent
      ).length;

      stats.decayRecommendations = {
        candidatesForDecay,
        estimatedCompressionRatio: candidatesForDecay > 0 ? "60-80%" : "0%",
        recommendDecay: candidatesForDecay > 5,
      };

      return stats;
    } catch (error: unknown) {
      const err = error as Error;
      return { error: err.message } as MemoryStatistics;
    }
  }
}
