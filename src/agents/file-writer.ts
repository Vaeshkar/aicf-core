import { promises as fs } from "node:fs";
import { join } from "node:path";

interface WriteOptions {
  projectRoot?: string;
}

interface Section {
  content: unknown;
}

interface FlowSection extends Section {
  content: string;
}

interface InsightItem {
  insight?: string;
  category?: string;
  importance?: string;
  confidence?: string;
}

interface InsightsSection extends Section {
  content: InsightItem[];
}

interface DecisionItem {
  decision?: string;
  reasoning?: string;
  impact?: string;
  confidence?: string;
  category?: string;
  alternatives?: string[];
}

interface DecisionsSection extends Section {
  content: DecisionItem[];
}

interface StateContent {
  working_on?: string;
  progress?: {
    score: number;
    completed_tasks: number;
    total_tasks: number;
  };
  blockers?: string;
  next_action?: string;
  session_status?: string;
}

interface StateSection extends Section {
  content: StateContent;
}

interface Sections {
  flow?: FlowSection;
  insights?: InsightsSection;
  decisions?: DecisionsSection;
  state?: StateSection;
}

interface Metadata {
  sessionId?: string;
  checkpointNumber?: number;
  timestamp: string;
  startTime?: string;
  messageCount?: number;
  tokenCount?: number;
}

interface WriteResult {
  filesUpdated: string[];
  aicfContent: string | null;
  markdownContent: string | null;
  status: string;
  error?: string;
}

interface AICFWriteResult {
  success: boolean;
  filePath: string | null;
  content: string | null;
  error?: string;
}

interface MarkdownWriteResult {
  success: boolean;
  filesUpdated: string[];
  content: string | null;
  error?: string;
}

interface FileUpdateResult {
  success: boolean;
  filePath: string | null;
  error?: string;
}

/**
 * FileWriterAgent - Writes updates to both .aicf and .ai formats
 * Handles dual-format output for AI-optimized and human-readable formats
 */
export class FileWriterAgent {
  private readonly projectRoot: string;

  constructor(options: WriteOptions = {}) {
    this.projectRoot = options.projectRoot ?? process.cwd();
  }

  /**
   * Write structured data to both AICF and AI formats
   */
  async write(sections: Sections, metadata: Metadata): Promise<WriteResult> {
    try {
      const results: WriteResult = {
        filesUpdated: [],
        aicfContent: null,
        markdownContent: null,
        status: "success",
      };

      const aicfResult = await this.writeAICF(sections, metadata);
      if (aicfResult.success && aicfResult.filePath) {
        results.filesUpdated.push(aicfResult.filePath);
        results.aicfContent = aicfResult.content;
      }

      const markdownResult = await this.writeMarkdown(sections, metadata);
      if (markdownResult.success) {
        results.filesUpdated.push(...markdownResult.filesUpdated);
        results.markdownContent = markdownResult.content;
      }

      return results;
    } catch (error: unknown) {
      const err = error as Error;
      return {
        filesUpdated: [],
        status: "error",
        error: err.message,
        aicfContent: null,
        markdownContent: null,
      };
    }
  }

  /**
   * Write AICF format (AI-optimized pipe-delimited format)
   */
  async writeAICF(
    sections: Sections,
    metadata: Metadata
  ): Promise<AICFWriteResult> {
    try {
      const aicfPath = join(this.projectRoot, ".aicf");
      const conversationsFile = join(aicfPath, "conversations.aicf");

      await this.ensureDirectoryExists(aicfPath);

      const aicfContent = this.formatAICF(sections, metadata);

      await this.appendToFile(conversationsFile, aicfContent);

      return {
        success: true,
        filePath: conversationsFile,
        content: aicfContent,
      };
    } catch (error: unknown) {
      const err = error as Error;
      return {
        success: false,
        error: err.message,
        filePath: null,
        content: null,
      };
    }
  }

  /**
   * Write human-readable markdown format updates
   */
  async writeMarkdown(
    sections: Sections,
    metadata: Metadata
  ): Promise<MarkdownWriteResult> {
    try {
      const aiPath = join(this.projectRoot, ".ai");
      const filesUpdated: string[] = [];

      await this.ensureDirectoryExists(aiPath);

      const conversationLogResult = await this.updateConversationLog(
        sections,
        metadata,
        aiPath
      );
      if (conversationLogResult.success && conversationLogResult.filePath) {
        filesUpdated.push(conversationLogResult.filePath);
      }

      if (
        sections.decisions?.content &&
        Array.isArray(sections.decisions.content) &&
        sections.decisions.content.length > 0
      ) {
        const decisionsResult = await this.updateTechnicalDecisions(
          sections.decisions,
          metadata,
          aiPath
        );
        if (decisionsResult.success && decisionsResult.filePath) {
          filesUpdated.push(decisionsResult.filePath);
        }
      }

      if (sections.state?.content) {
        const nextStepsResult = await this.updateNextSteps(
          sections.state,
          metadata,
          aiPath
        );
        if (nextStepsResult.success && nextStepsResult.filePath) {
          filesUpdated.push(nextStepsResult.filePath);
        }
      }

      return {
        success: true,
        filesUpdated: filesUpdated,
        content: "Multiple files updated",
      };
    } catch (error: unknown) {
      const err = error as Error;
      return {
        success: false,
        error: err.message,
        filesUpdated: [],
        content: null,
      };
    }
  }

  /**
   * Format content for AICF (AI-native format)
   */
  private formatAICF(sections: Sections, metadata: Metadata): string {
    const lines: string[] = [];

    lines.push(
      `@CONVERSATION:${metadata.sessionId ?? "unknown"}-CP${metadata.checkpointNumber ?? 0}`
    );
    lines.push(`timestamp_start=${metadata.startTime ?? metadata.timestamp}`);
    lines.push(`timestamp_end=${metadata.timestamp}`);
    lines.push(`messages=${metadata.messageCount ?? 0}`);
    lines.push(`tokens=${metadata.tokenCount ?? 0}`);
    lines.push("");

    if (sections.flow?.content) {
      lines.push("@FLOW");
      lines.push(sections.flow.content);
      lines.push("");
    }

    if (
      sections.insights?.content &&
      Array.isArray(sections.insights.content) &&
      sections.insights.content.length > 0
    ) {
      lines.push("@INSIGHTS");
      sections.insights.content.forEach((insight) => {
        const insightLine = [
          insight.insight ?? "unknown",
          insight.category ?? "GENERAL",
          insight.importance ?? "MEDIUM",
          insight.confidence ?? "MEDIUM",
        ].join("|");
        lines.push(insightLine);
      });
      lines.push("");
    }

    if (
      sections.decisions?.content &&
      Array.isArray(sections.decisions.content) &&
      sections.decisions.content.length > 0
    ) {
      lines.push("@DECISIONS");
      sections.decisions.content.forEach((decision) => {
        const decisionLine = [
          decision.decision ?? "unknown",
          decision.reasoning ?? "unclear",
          `IMPACT:${decision.impact ?? "MEDIUM"}`,
          `CONF:${decision.confidence ?? "MEDIUM"}`,
        ].join("|");
        lines.push(decisionLine);
      });
      lines.push("");
    }

    if (sections.state?.content) {
      lines.push("@STATE");
      const state = sections.state.content;
      Object.entries(state).forEach(([key, value]) => {
        if (typeof value === "object") {
          lines.push(`${key}=${JSON.stringify(value)}`);
        } else {
          lines.push(`${key}=${value}`);
        }
      });
      lines.push("");
    }

    return lines.join("\n");
  }

  /**
   * Update conversation log in markdown format
   */
  private async updateConversationLog(
    sections: Sections,
    metadata: Metadata,
    aiPath: string
  ): Promise<FileUpdateResult> {
    try {
      const conversationLogPath = join(aiPath, "conversation-log.md");
      const date =
        new Date(metadata.timestamp).toISOString().split("T")[0] ?? "unknown";
      const sessionId = metadata.sessionId ?? "unknown";
      const checkpointNumber = metadata.checkpointNumber ?? 0;

      const entry = this.formatConversationEntry(
        sections,
        metadata,
        date,
        sessionId,
        checkpointNumber
      );

      await this.appendToFile(conversationLogPath, entry);

      return {
        success: true,
        filePath: conversationLogPath,
      };
    } catch (error: unknown) {
      const err = error as Error;
      return {
        success: false,
        error: err.message,
        filePath: null,
      };
    }
  }

  /**
   * Format conversation log entry
   */
  private formatConversationEntry(
    sections: Sections,
    _metadata: Metadata,
    date: string,
    sessionId: string,
    checkpointNumber: number
  ): string {
    const lines: string[] = [];

    lines.push(
      `\n**${date} - ${sessionId} Checkpoint ${checkpointNumber}:**\n`
    );

    if (
      sections.state?.content?.working_on &&
      sections.state.content.working_on !== "unknown"
    ) {
      lines.push(`- 🔄 **Working on:** ${sections.state.content.working_on}`);
    }

    if (
      sections.insights?.content &&
      Array.isArray(sections.insights.content) &&
      sections.insights.content.length > 0
    ) {
      lines.push("- 💡 **Key insights:**");
      sections.insights.content.slice(0, 3).forEach((insight) => {
        lines.push(`  - ${insight.insight ?? "unknown"}`);
      });
    }

    if (
      sections.decisions?.content &&
      Array.isArray(sections.decisions.content) &&
      sections.decisions.content.length > 0
    ) {
      lines.push("- 📋 **Decisions:**");
      sections.decisions.content.slice(0, 2).forEach((decision) => {
        lines.push(
          `  - ${decision.decision ?? "unknown"} (${decision.impact ?? "MEDIUM"})`
        );
      });
    }

    if (sections.state?.content?.progress) {
      const progress = sections.state.content.progress;
      if (progress.score > 0) {
        lines.push(
          `- 📈 **Progress:** ${progress.completed_tasks}/${progress.total_tasks} tasks (${progress.score}%)`
        );
      }
    }

    if (
      sections.state?.content?.blockers &&
      sections.state.content.blockers !== "none"
    ) {
      lines.push(`- 🚫 **Blockers:** ${sections.state.content.blockers}`);
    }

    if (
      sections.state?.content?.next_action &&
      sections.state.content.next_action !== "to_be_determined"
    ) {
      lines.push(`- ⏭️ **Next:** ${sections.state.content.next_action}`);
    }

    lines.push("");
    return lines.join("\n");
  }

  /**
   * Update technical decisions file
   */
  private async updateTechnicalDecisions(
    decisions: DecisionsSection,
    metadata: Metadata,
    aiPath: string
  ): Promise<FileUpdateResult> {
    try {
      const decisionsPath = join(aiPath, "technical-decisions.md");
      const date =
        new Date(metadata.timestamp).toISOString().split("T")[0] ?? "unknown";

      const entries: string[] = [];
      decisions.content.forEach((decision) => {
        if (decision.impact === "CRITICAL" || decision.impact === "HIGH") {
          entries.push(this.formatDecisionEntry(decision, date, metadata));
        }
      });

      if (entries.length > 0) {
        const content = `\n## Decisions from ${date} (${metadata.sessionId ?? "unknown"})\n\n${entries.join("\n")}`;
        await this.appendToFile(decisionsPath, content);
      }

      return {
        success: true,
        filePath: decisionsPath,
      };
    } catch (error: unknown) {
      const err = error as Error;
      return {
        success: false,
        error: err.message,
        filePath: null,
      };
    }
  }
  /**
   * Format decision entry for markdown
   */
  private formatDecisionEntry(
    decision: DecisionItem,
    _date: string,
    _metadata: Metadata
  ): string {
    const lines: string[] = [];

    lines.push(`### ${decision.decision ?? "Unknown decision"}`);
    lines.push(
      `**Impact:** ${decision.impact ?? "MEDIUM"} | **Category:** ${decision.category ?? "GENERAL"} | **Confidence:** ${decision.confidence ?? "MEDIUM"}`
    );
    lines.push("");
    lines.push(
      `**Reasoning:** ${decision.reasoning ?? "No reasoning provided"}`
    );

    if (decision.alternatives && decision.alternatives.length > 0) {
      lines.push("");
      lines.push("**Alternatives considered:**");
      decision.alternatives.forEach((alt) => {
        lines.push(`- ${alt}`);
      });
    }

    lines.push("");
    return lines.join("\n");
  }

  /**
   * Update next steps file
   */
  private async updateNextSteps(
    state: StateSection,
    metadata: Metadata,
    aiPath: string
  ): Promise<FileUpdateResult> {
    try {
      const nextStepsPath = join(aiPath, "next-steps.md");
      const date =
        new Date(metadata.timestamp).toISOString().split("T")[0] ?? "unknown";

      let existingContent = "";
      try {
        existingContent = await fs.readFile(nextStepsPath, "utf-8");
      } catch {
        // File doesn't exist yet
      }

      const stateContent = state.content;
      if (!stateContent) {
        return {
          success: false,
          error: "No state content provided",
          filePath: null,
        };
      }

      const entry = this.formatNextStepsEntry(stateContent, date, metadata);

      let updatedContent: string;
      if (existingContent.includes("## ✅ Recently Completed")) {
        updatedContent = existingContent.replace(
          "## ✅ Recently Completed (Last 2 Weeks)",
          `## ✅ Recently Completed (Last 2 Weeks)\n${entry}`
        );
      } else {
        updatedContent = entry + "\n" + existingContent;
      }

      await fs.writeFile(nextStepsPath, updatedContent);

      return {
        success: true,
        filePath: nextStepsPath,
      };
    } catch (error: unknown) {
      const err = error as Error;
      return {
        success: false,
        error: err.message,
        filePath: null,
      };
    }
  }

  /**
   * Format next steps entry
   */
  private formatNextStepsEntry(
    state: StateContent,
    date: string,
    metadata: Metadata
  ): string {
    const lines: string[] = [];

    lines.push(
      `\n**${date} - ${metadata.sessionId ?? "unknown"} Checkpoint ${metadata.checkpointNumber ?? 0}:**\n`
    );

    if (state.working_on && state.working_on !== "unknown") {
      lines.push(`- ✅ **Progressed on** ${state.working_on}`);
    }

    if (state.progress && state.progress.completed_tasks > 0) {
      lines.push(`- ✅ **Completed** ${state.progress.completed_tasks} tasks`);
    }

    if (state.session_status === "completed_tasks") {
      lines.push(`- ✅ **Session completed** with tasks finished`);
    }

    lines.push("");
    return lines.join("\n");
  }

  /**
   * Ensure directory exists
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error: unknown) {
      const err = error as NodeJS.ErrnoException;
      if (err.code !== "EEXIST") {
        throw error;
      }
    }
  }

  /**
   * Append content to file
   */
  private async appendToFile(filePath: string, content: string): Promise<void> {
    try {
      await fs.appendFile(filePath, content);
    } catch (error: unknown) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === "ENOENT") {
        await fs.writeFile(filePath, content);
      } else {
        throw error;
      }
    }
  }
}
