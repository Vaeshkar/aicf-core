/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2025 Dennis van Leeuwen
 *
 * Agent Router - Distributes content to appropriate .aicf files
 */

export interface RouteResult {
  targetFile: string;
  content: unknown;
  contentType: string;
  chunkId: string;
  timestamp: string;
}

export interface TokenAllocation {
  [key: string]: number;
}

/**
 * Routes content to specialized .aicf files
 */
export class AgentRouter {
  private readonly routes: Record<string, string>;
  private readonly chunkTracker: Set<string>;

  constructor() {
    this.routes = {
      // Conversation flow and session summaries
      conversation_flow: ".aicf/conversation-memory.aicf",
      session_summary: ".aicf/conversation-memory.aicf",
      user_interactions: ".aicf/conversation-memory.aicf",

      // Technical discoveries, architecture, system design
      technical_insight: ".aicf/technical-context.aicf",
      architecture_change: ".aicf/technical-context.aicf",
      system_design: ".aicf/technical-context.aicf",
      performance_optimization: ".aicf/technical-context.aicf",

      // Decisions and their reasoning
      decision: ".aicf/decisions.aicf",
      strategy_decision: ".aicf/decisions.aicf",
      technical_decision: ".aicf/decisions.aicf",

      // Work progress, tasks, project state
      task_progress: ".aicf/work-state.aicf",
      project_status: ".aicf/work-state.aicf",
      blockers: ".aicf/work-state.aicf",
      next_actions: ".aicf/work-state.aicf",

      // Individual tasks and todos
      task_created: ".aicf/tasks.aicf",
      task_completed: ".aicf/tasks.aicf",
      task_update: ".aicf/tasks.aicf",

      // Issues, bugs, problems
      issue_discovered: ".aicf/issues.aicf",
      bug_found: ".aicf/issues.aicf",
      problem_identified: ".aicf/issues.aicf",
      issue_resolved: ".aicf/issues.aicf",

      // Design patterns, UI/UX decisions
      design_decision: ".aicf/design-system.aicf",
      ui_pattern: ".aicf/design-system.aicf",
      style_guideline: ".aicf/design-system.aicf",
    };

    this.chunkTracker = new Set();
  }

  /**
   * Route content to appropriate .aicf file
   */
  routeContent(
    contentType: string,
    content: unknown,
    chunkId: string
  ): RouteResult | null {
    const contentHash = this.hashContent(content, chunkId);
    if (this.chunkTracker.has(contentHash)) {
      return null;
    }

    this.chunkTracker.add(contentHash);

    const targetFile =
      this.routes[contentType] || ".aicf/conversation-memory.aicf";

    return {
      targetFile,
      content,
      contentType,
      chunkId,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Classify conversation content
   */
  classifyContent(conversationData: unknown): string[] {
    const classifications: string[] = [];
    const content = JSON.stringify(conversationData).toLowerCase();

    if (this.containsDecision(content)) {
      classifications.push("decision");
    }

    if (this.containsTechnical(content)) {
      classifications.push("technical_insight");
    }

    if (this.containsTask(content)) {
      classifications.push("task_progress");
    }

    if (this.containsIssue(content)) {
      classifications.push("issue_discovered");
    }

    if (this.containsDesign(content)) {
      classifications.push("design_decision");
    }

    if (classifications.length === 0) {
      classifications.push("conversation_flow");
    }

    return classifications;
  }

  /**
   * Get token allocation strategy
   */
  getTokenAllocationStrategy(): TokenAllocation {
    return {
      "conversation-memory.aicf": 2000,
      "technical-context.aicf": 3000,
      "decisions.aicf": 1500,
      "work-state.aicf": 1000,
      "tasks.aicf": 1500,
      "issues.aicf": 1000,
      "design-system.aicf": 1500,
    };
  }

  /**
   * Generate content hash for deduplication
   */
  private hashContent(content: unknown, chunkId: string): string {
    const contentString = this.stringify(content);
    const hashInput = `${chunkId}-${contentString.substring(0, 100)}`;
    return this.simpleHash(hashInput);
  }

  /**
   * Simple hash function
   */
  private simpleHash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Convert content to string
   */
  private stringify(content: unknown): string {
    return typeof content === "string" ? content : JSON.stringify(content);
  }

  /**
   * Check if content contains decision keywords
   */
  private containsDecision(content: string): boolean {
    return (
      content.includes("decided") ||
      content.includes("decision") ||
      content.includes("we chose")
    );
  }

  /**
   * Check if content contains technical keywords
   */
  private containsTechnical(content: string): boolean {
    return (
      content.includes("architecture") ||
      content.includes("system") ||
      content.includes("technical")
    );
  }

  /**
   * Check if content contains task keywords
   */
  private containsTask(content: string): boolean {
    return (
      content.includes("task") ||
      content.includes("todo") ||
      content.includes("work on")
    );
  }

  /**
   * Check if content contains issue keywords
   */
  private containsIssue(content: string): boolean {
    return (
      content.includes("issue") ||
      content.includes("problem") ||
      content.includes("bug")
    );
  }

  /**
   * Check if content contains design keywords
   */
  private containsDesign(content: string): boolean {
    return (
      content.includes("design") ||
      content.includes("ui") ||
      content.includes("style")
    );
  }
}

