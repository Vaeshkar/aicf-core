/**
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (c) 2025 Dennis van Leeuwen
 *
 * AICE-to-AICF Bridge
 * Transforms AICE AnalysisResult into AICF v3.1 format
 */

import type { Result } from "../types/result.js";
import { ok, err, toError } from "../types/result.js";
import { AICFWriter } from "../aicf-writer.js";

/**
 * AICE types (from packages/aice)
 */
export interface UserIntent {
  timestamp: string;
  intent: string;
  inferredFrom: "conversation_summary" | "individual_message";
  confidence: "high" | "medium" | "low";
  messageIndex: number;
}

export interface AIAction {
  type: "augment_ai_response" | "augment_agent_action";
  timestamp: string;
  details: string;
  source: "conversation_summary" | "augment_leveldb";
  messageIndex?: number;
}

export interface TechnicalWork {
  timestamp: string;
  work: string;
  type: "technical_conversation" | "agent_automation";
  source: "conversation_summary" | "augment";
  lineIndex?: number;
}

export interface Decision {
  timestamp: string;
  decision: string;
  context: string;
  impact: "high" | "medium" | "low";
}

export interface ConversationFlow {
  sequence: string[];
  turns: number;
  dominantRole: "user" | "assistant" | "balanced";
}

export interface WorkingState {
  currentTask: string;
  blockers: string[];
  nextAction: string;
  lastUpdate: string;
}

export interface AnalysisResult {
  userIntents: UserIntent[];
  aiActions: AIAction[];
  technicalWork: TechnicalWork[];
  decisions: Decision[];
  flow: ConversationFlow;
  workingState: WorkingState;
}

/**
 * Bridge options
 */
export interface AICEToAICFBridgeOptions {
  conversationId: string;
  sessionId?: string;
  appName?: string;
  userId?: string;
  source?: "augment" | "warp" | "copilot" | "chatgpt" | "unknown";
}

/**
 * AICE-to-AICF Bridge
 * Transforms AICE AnalysisResult into AICF v3.1 semantic format
 */
export class AICEToAICFBridge {
  private writer: AICFWriter;

  constructor(aicfDir: string) {
    this.writer = new AICFWriter(aicfDir);
  }

  /**
   * Transform AICE AnalysisResult to AICF v3.1 format
   * Writes to multiple AICF files using semantic tags
   */
  async transform(
    analysis: AnalysisResult,
    options: AICEToAICFBridgeOptions
  ): Promise<Result<void>> {
    try {
      const timestamp = new Date().toISOString();

      // 1. Write session metadata
      const sessionResult = await this.writeSession(
        analysis,
        options,
        timestamp
      );
      if (!sessionResult.ok) {
        return err(sessionResult.error);
      }

      // 2. Write conversations (user intents + AI actions)
      const conversationResult = await this.writeConversations(
        analysis,
        options
      );
      if (!conversationResult.ok) {
        return err(conversationResult.error);
      }

      // 3. Write insights (technical work)
      const insightsResult = await this.writeInsights(analysis, options);
      if (!insightsResult.ok) {
        return err(insightsResult.error);
      }

      // 4. Write decisions
      const decisionsResult = await this.writeDecisions(analysis, options);
      if (!decisionsResult.ok) {
        return err(decisionsResult.error);
      }

      // 5. Write state (working state)
      const stateResult = await this.writeState(analysis, options, timestamp);
      if (!stateResult.ok) {
        return err(stateResult.error);
      }

      return ok(undefined);
    } catch (error) {
      return err(toError(error));
    }
  }

  /**
   * Write session metadata using @SESSION tag
   */
  private async writeSession(
    analysis: AnalysisResult,
    options: AICEToAICFBridgeOptions,
    timestamp: string
  ): Promise<Result<void>> {
    try {
      const sessionData = {
        id: options.sessionId || options.conversationId,
        app_name: options.appName || options.source || "augment",
        user_id: options.userId || "default",
        created_at: timestamp,
        last_update_time: timestamp,
        status: "completed" as const,
        event_count: analysis.flow.turns,
      };

      const result = await this.writer.writeSession(sessionData);
      if (!result.ok) {
        return err(result.error);
      }

      return ok(undefined);
    } catch (error) {
      return err(toError(error));
    }
  }

  /**
   * Write conversations using @CONVERSATION tag
   */
  private async writeConversations(
    analysis: AnalysisResult,
    options: AICEToAICFBridgeOptions
  ): Promise<Result<void>> {
    try {
      // Write user intents as user messages
      for (const intent of analysis.userIntents) {
        const result = await this.writer.writeConversation({
          id: `${options.conversationId}_user_${intent.messageIndex}`,
          timestamp: intent.timestamp,
          role: "user",
          content: intent.intent,
        });

        if (!result.ok) {
          return err(result.error);
        }
      }

      // Write AI actions as assistant messages
      for (const action of analysis.aiActions) {
        const result = await this.writer.writeConversation({
          id: `${options.conversationId}_ai_${action.messageIndex || 0}`,
          timestamp: action.timestamp,
          role: "assistant",
          content: action.details,
        });

        if (!result.ok) {
          return err(result.error);
        }
      }

      return ok(undefined);
    } catch (error) {
      return err(toError(error));
    }
  }

  /**
   * Write insights using @INSIGHTS tag (technical work)
   */
  private async writeInsights(
    analysis: AnalysisResult,
    options: AICEToAICFBridgeOptions
  ): Promise<Result<void>> {
    try {
      for (const work of analysis.technicalWork) {
        const result = await this.writer.writeMemory({
          id: `${options.conversationId}_work_${work.lineIndex || 0}`,
          type: "procedural",
          content: work.work,
          timestamp: work.timestamp,
        });

        if (!result.ok) {
          return err(result.error);
        }
      }

      return ok(undefined);
    } catch (error) {
      return err(toError(error));
    }
  }

  /**
   * Write decisions using @DECISION tag
   */
  private async writeDecisions(
    analysis: AnalysisResult,
    _options: AICEToAICFBridgeOptions
  ): Promise<Result<void>> {
    try {
      for (const decision of analysis.decisions) {
        const result = await this.writer.writeDecision({
          decision: decision.decision,
          rationale: decision.context,
          timestamp: decision.timestamp,
        });

        if (!result.ok) {
          return err(result.error);
        }
      }

      return ok(undefined);
    } catch (error) {
      return err(toError(error));
    }
  }

  /**
   * Write state using @STATE tag (working state)
   */
  private async writeState(
    analysis: AnalysisResult,
    options: AICEToAICFBridgeOptions,
    timestamp: string
  ): Promise<Result<void>> {
    try {
      // Write current task
      if (analysis.workingState.currentTask) {
        const taskResult = await this.writer.writeMemory({
          id: `${options.conversationId}_task`,
          type: "episodic",
          content: `Current task: ${analysis.workingState.currentTask}`,
          timestamp,
        });

        if (!taskResult.ok) {
          return err(taskResult.error);
        }
      }

      // Write blockers
      if (analysis.workingState.blockers.length > 0) {
        const blockersResult = await this.writer.writeMemory({
          id: `${options.conversationId}_blockers`,
          type: "episodic",
          content: `Blockers: ${analysis.workingState.blockers.join(", ")}`,
          timestamp,
        });

        if (!blockersResult.ok) {
          return err(blockersResult.error);
        }
      }

      // Write next action
      if (analysis.workingState.nextAction) {
        const nextActionResult = await this.writer.writeMemory({
          id: `${options.conversationId}_next`,
          type: "episodic",
          content: `Next action: ${analysis.workingState.nextAction}`,
          timestamp,
        });

        if (!nextActionResult.ok) {
          return err(nextActionResult.error);
        }
      }

      return ok(undefined);
    } catch (error) {
      return err(toError(error));
    }
  }
}
