/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2025 Dennis van Leeuwen
 *
 * Memory File Writer for AICF Core
 * Writes analysis results to .aicf memory files with proper escaping
 */

import { mkdirSync, existsSync, appendFileSync, writeFileSync } from "fs";
import { join } from "path";
import type { Result } from "../types/result.js";
import { ok, err } from "../types/result.js";

/**
 * User intent extracted from conversation
 */
export interface UserIntent {
  timestamp: string;
  intent: string;
  confidence: "high" | "medium" | "low";
}

/**
 * AI action extracted from conversation
 */
export interface AIAction {
  timestamp: string;
  type: string;
  details: string;
}

/**
 * Technical work extracted from conversation
 */
export interface TechnicalWork {
  timestamp: string;
  type: string;
  work: string;
}

/**
 * Decision extracted from conversation
 */
export interface Decision {
  timestamp: string;
  decision: string;
  impact: "high" | "medium" | "low";
}

/**
 * Conversation flow tracking
 */
export interface ConversationFlow {
  sequence: string[];
  turns: number;
  dominantRole: "user" | "assistant" | "balanced";
}

/**
 * Working state extracted from conversation
 */
export interface WorkingState {
  currentTask: string;
  blockers: string[];
  nextAction: string;
}

/**
 * Complete analysis result
 */
export interface AnalysisResult {
  userIntents: UserIntent[];
  aiActions: AIAction[];
  technicalWork: TechnicalWork[];
  decisions: Decision[];
  flow: ConversationFlow;
  workingState: WorkingState;
}

/**
 * Writer for memory files (.aicf format)
 * Uses pipe-delimited format with proper escaping for newlines and pipes
 */
export class MemoryFileWriter {
  private cwd: string;

  constructor(cwd: string = process.cwd()) {
    this.cwd = cwd;
  }

  /**
   * Escape special characters for AICF format
   * Replaces newlines with \\n and pipes with \\|
   */
  private escapeAICF(text: string): string {
    return text.replace(/\n/g, "\\n").replace(/\|/g, "\\|");
  }

  /**
   * Unescape AICF format special characters
   * Replaces \\n with newlines and \\| with pipes
   */
  static unescapeAICF(text: string): string {
    return text.replace(/\\n/g, "\n").replace(/\\\|/g, "|");
  }

  /**
   * Serialize user intents to pipe-delimited format
   */
  private serializeUserIntents(intents: UserIntent[]): string {
    if (intents.length === 0) return "";
    return intents
      .map((i) => `${i.timestamp}|${this.escapeAICF(i.intent)}|${i.confidence}`)
      .join(";");
  }

  /**
   * Serialize AI actions to pipe-delimited format
   */
  private serializeAIActions(actions: AIAction[]): string {
    if (actions.length === 0) return "";
    return actions
      .map((a) => `${a.timestamp}|${a.type}|${this.escapeAICF(a.details)}`)
      .join(";");
  }

  /**
   * Serialize technical work to pipe-delimited format
   */
  private serializeTechnicalWork(work: TechnicalWork[]): string {
    if (work.length === 0) return "";
    return work
      .map((w) => `${w.timestamp}|${w.type}|${this.escapeAICF(w.work)}`)
      .join(";");
  }

  /**
   * Serialize decisions to pipe-delimited format
   */
  private serializeDecisions(decisions: Decision[]): string {
    if (decisions.length === 0) return "";
    return decisions
      .map((d) => `${d.timestamp}|${this.escapeAICF(d.decision)}|${d.impact}`)
      .join(";");
  }

  /**
   * Serialize flow to pipe-delimited format
   */
  private serializeFlow(flow: ConversationFlow): string {
    return `${flow.turns}|${flow.dominantRole}|${flow.sequence.join(",")}`;
  }

  /**
   * Serialize working state to pipe-delimited format
   */
  private serializeWorkingState(state: WorkingState): string {
    return `${this.escapeAICF(state.currentTask)}|${state.blockers.map((b) => this.escapeAICF(b)).join(",")}|${this.escapeAICF(state.nextAction)}`;
  }

  /**
   * Generate AICF format content
   * @param analysis - Analysis result
   * @param conversationId - Conversation ID
   * @param timestamp - Optional conversation timestamp (defaults to now)
   * @returns AICF content as string
   */
  generateAICF(
    analysis: AnalysisResult,
    conversationId: string,
    timestamp?: string
  ): string {
    const conversationTimestamp = timestamp || new Date().toISOString();

    // Serialize each component
    const userIntents = this.serializeUserIntents(analysis.userIntents);
    const aiActions = this.serializeAIActions(analysis.aiActions);
    const technicalWork = this.serializeTechnicalWork(analysis.technicalWork);
    const decisions = this.serializeDecisions(analysis.decisions);
    const flow = this.serializeFlow(analysis.flow);
    const workingState = this.serializeWorkingState(analysis.workingState);

    // Build AICF content (pipe-delimited)
    const lines = [
      `version|3.0.0-alpha`,
      `timestamp|${conversationTimestamp}`,
      `conversationId|${conversationId}`,
      `userIntents|${userIntents}`,
      `aiActions|${aiActions}`,
      `technicalWork|${technicalWork}`,
      `decisions|${decisions}`,
      `flow|${flow}`,
      `workingState|${workingState}`,
    ];

    return lines.join("\n");
  }

  /**
   * Write AICF content to file in recent/ folder with date in filename
   * Filename format: {date}_{conversationId}.aicf (e.g., 2025-10-24_abc123.aicf)
   */
  async writeAICF(
    conversationId: string,
    content: string,
    cwd: string = this.cwd,
    timestamp?: string
  ): Promise<Result<void, Error>> {
    try {
      // Use conversation timestamp if provided, otherwise use today
      const conversationDate = timestamp
        ? new Date(timestamp).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0]; // YYYY-MM-DD

      // Build file path
      const recentDir = join(cwd, ".aicf", "recent");
      if (!existsSync(recentDir)) {
        mkdirSync(recentDir, { recursive: true });
      }

      const filePath = join(
        recentDir,
        `${conversationDate}_${conversationId}.aicf`
      );

      // Write content directly with proper AICF format (pipe-delimited with escaping)
      // Append if file exists, otherwise create new file
      if (existsSync(filePath)) {
        appendFileSync(filePath, "\n" + content, "utf-8");
      } else {
        writeFileSync(filePath, content, "utf-8");
      }

      return ok(undefined);
    } catch (error) {
      return err(
        error instanceof Error
          ? error
          : new Error(`Failed to write AICF file: ${String(error)}`)
      );
    }
  }

  /**
   * Synchronous version of writeAICF
   */
  writeAICFSync(
    conversationId: string,
    content: string,
    cwd: string = this.cwd,
    timestamp?: string
  ): void {
    const recentDir = join(cwd, ".aicf", "recent");
    if (!existsSync(recentDir)) {
      mkdirSync(recentDir, { recursive: true });
    }
    const conversationDate = timestamp
      ? new Date(timestamp).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];
    const filePath = join(
      recentDir,
      `${conversationDate}_${conversationId}.aicf`
    );

    // Write content directly
    if (existsSync(filePath)) {
      appendFileSync(filePath, "\n" + content, "utf-8");
    } else {
      writeFileSync(filePath, content, "utf-8");
    }
  }
}
