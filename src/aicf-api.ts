#!/usr/bin/env node

/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2025 Dennis van Leeuwen
 *
 * AICF API - Complete interface for AI Context Format
 */

import type { Result } from "./types/result.js";
import { ok, err, toError } from "./types/result.js";
import type { FileSystem, Logger } from "./types/aicf.js";
import {
  AICFReader,
  type AICFConversation,
  type AICFStats,
} from "./aicf-reader.js";
import { AICFWriter } from "./aicf-writer.js";
import { ConsoleLogger } from "./utils/logger.js";

export interface ProjectOverview {
  stats: AICFStats;
  recent: {
    conversations: AICFConversation[];
    decisions: unknown[];
    workState: Record<string, unknown> | null;
  };
  summary: string;
}

export interface QueryIntent {
  type: string;
  count?: number;
  timeRange?: { start: Date; end: Date };
  keywords?: string[];
}

export interface QueryResults {
  conversations: AICFConversation[];
  decisions: unknown[];
  insights: unknown[];
  workStates: unknown[];
  relevanceScore: number;
}

/**
 * AICF API - High-level interface for AICF operations
 */
export class AICFAPI {
  protected readonly reader: AICFReader;
  protected readonly writer: AICFWriter;
  protected readonly aicfDir: string;
  protected readonly logger: Logger;

  constructor(aicfDir = ".aicf", fs?: FileSystem, logger?: Logger) {
    this.aicfDir = aicfDir;
    this.logger = logger ?? new ConsoleLogger();
    this.reader = new AICFReader(aicfDir, fs, logger);
    this.writer = new AICFWriter(aicfDir, fs, logger);
  }

  /**
   * Get comprehensive project overview
   */
  async getProjectOverview(): Promise<Result<ProjectOverview>> {
    try {
      const statsResult = await this.reader.getStats();
      if (!statsResult.ok) {
        return err(statsResult.error);
      }

      const conversationsResult = await this.reader.getLastConversations(5);
      if (!conversationsResult.ok) {
        return err(conversationsResult.error);
      }

      const workStateResult = await this.reader.getCurrentWorkState();
      if (!workStateResult.ok) {
        return err(workStateResult.error);
      }

      const stats = statsResult.value;
      const conversations = conversationsResult.value;
      const workState = workStateResult.value;

      const overview: ProjectOverview = {
        stats,
        recent: {
          conversations,
          decisions: [],
          workState,
        },
        summary: this.generateProjectSummary(stats, workState, []),
      };

      return ok(overview);
    } catch (error) {
      return err(toError(error));
    }
  }

  /**
   * Generate AI-friendly project summary
   */
  private generateProjectSummary(
    stats: AICFStats,
    workState: Record<string, unknown> | null,
    decisions: unknown[]
  ): string {
    const projectName = stats.project.name;
    const conversationCount = stats.counts.conversations;
    const decisionCount = stats.counts.decisions;
    const lastUpdate = stats.lastUpdate;

    let summary = `Project: ${projectName}\n`;
    summary += `Status: ${stats.state.status}\n`;
    summary += `Conversations: ${conversationCount}, Decisions: ${decisionCount}\n`;
    summary += `Last Updated: ${lastUpdate}\n`;

    if (workState) {
      summary += `Current Work: ${workState["id"]} (${workState["status"]})\n`;
    }

    if (decisions.length > 0) {
      summary += `Recent Decisions: ${decisions.length}\n`;
    }

    return summary;
  }

  /**
   * Query the AICF database
   */
  async query(queryText: string): Promise<Result<QueryResults>> {
    try {
      const results: QueryResults = {
        conversations: [],
        decisions: [],
        insights: [],
        workStates: [],
        relevanceScore: 0,
      };

      const intent = this.parseQueryIntent(queryText);

      switch (intent.type) {
        case "recent_activity": {
          const conversationsResult = await this.reader.getLastConversations(
            intent.count ?? 10
          );
          if (conversationsResult.ok) {
            results.conversations = conversationsResult.value;
          }

          const workStateResult = await this.reader.getCurrentWorkState();
          if (workStateResult.ok && workStateResult.value) {
            results.workStates = [workStateResult.value];
          }

          results.relevanceScore = 0.9;
          break;
        }

        case "search": {
          const conversationsResult =
            await this.reader.getLastConversations(50);
          if (conversationsResult.ok) {
            results.conversations = this.filterByKeywords(
              conversationsResult.value,
              intent.keywords ?? []
            );
          }
          results.relevanceScore = 0.7;
          break;
        }

        default:
          results.relevanceScore = 0.1;
      }

      return ok(results);
    } catch (error) {
      return err(toError(error));
    }
  }

  /**
   * Parse query intent
   */
  private parseQueryIntent(queryText: string): QueryIntent {
    const lower = queryText.toLowerCase();

    if (
      lower.includes("recent") ||
      lower.includes("last") ||
      lower.includes("latest")
    ) {
      const countMatch = queryText.match(/\d+/);
      return {
        type: "recent_activity",
        count: countMatch ? parseInt(countMatch[0], 10) : 10,
      };
    }

    if (lower.includes("search") || lower.includes("find")) {
      const keywords = queryText
        .split(" ")
        .filter((word) => word.length > 3)
        .map((word) => word.toLowerCase());
      return {
        type: "search",
        keywords,
      };
    }

    return {
      type: "unknown",
    };
  }

  /**
   * Filter conversations by keywords
   */
  private filterByKeywords(
    conversations: AICFConversation[],
    keywords: string[]
  ): AICFConversation[] {
    if (keywords.length === 0) return conversations;

    return conversations.filter((conv) => {
      const content = conv.content.toLowerCase();
      return keywords.some((keyword) => content.includes(keyword));
    });
  }

  /**
   * Add conversation
   */
  async addConversation(conversation: {
    id: string;
    timestamp: string;
    role: string;
    content: string;
  }): Promise<Result<number>> {
    return await this.writer.writeConversation(conversation);
  }

  /**
   * Add memory
   */
  async addMemory(memory: {
    id: string;
    type: string;
    content: string;
    timestamp: string;
  }): Promise<Result<number>> {
    return await this.writer.writeMemory(memory);
  }

  /**
   * Add decision
   */
  async addDecision(decision: {
    decision: string;
    rationale: string;
    timestamp: string;
  }): Promise<Result<number>> {
    return await this.writer.writeDecision(decision);
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<Result<AICFStats>> {
    return await this.reader.getStats();
  }

  /**
   * Get last conversations
   */
  async getLastConversations(count = 5): Promise<Result<AICFConversation[]>> {
    return await this.reader.getLastConversations(count);
  }

  /**
   * Get current work state
   */
  async getCurrentWorkState(): Promise<Result<Record<string, unknown> | null>> {
    return await this.reader.getCurrentWorkState();
  }

  /**
   * Get reader instance
   */
  getReader(): AICFReader {
    return this.reader;
  }

  /**
   * Get writer instance
   */
  getWriter(): AICFWriter {
    return this.writer;
  }
}
