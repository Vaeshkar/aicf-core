/**
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (c) 2025 Dennis van Leeuwen
 *
 * Conversation Watcher - Watches .lill/raw/ for new JSON files and indexes directly to QuadIndex
 *
 * Simplified Architecture (November 2025):
 * - Reads JSON files directly (no AICF conversion)
 * - Extracts principles, insights, decisions from JSON
 * - Indexes directly to QuadIndex (no intermediate files)
 * - Replaces: JSONToAICFWatcher + AICFFileWatcher (2 watchers → 1 watcher)
 */

import { watch, type FSWatcher } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";
import type { Result } from "../types/result.js";
import { ok, err, toError } from "../types/result.js";
import type { Logger } from "../types/aicf.js";
import { ConsoleLogger } from "../utils/logger.js";

/**
 * Conversation watcher configuration
 */
export interface ConversationWatcherConfig {
  rawDir?: string;
  pollInterval?: number;
  verbose?: boolean;
  onConversationProcessed?: (
    conversationId: string,
    stats: ConversationStats
  ) => void;
  onPrincipleExtracted?: (principle: ExtractedPrinciple) => Promise<void>;
  onRelationshipExtracted?: (
    relationship: ExtractedRelationship
  ) => Promise<void>;
  onHypotheticalExtracted?: (
    hypothetical: ExtractedHypothetical
  ) => Promise<void>;
  onRejectedExtracted?: (rejected: ExtractedRejected) => Promise<void>;
}

/**
 * Extracted principle from conversation
 */
export interface ExtractedPrinciple {
  id: string;
  text: string;
  confidence: number;
  source: string;
  timestamp: string;
  conversationId: string;
  metadata: Record<string, unknown>;
}

/**
 * Extracted relationship between principles/concepts
 */
export interface ExtractedRelationship {
  id: string;
  from: string; // Principle ID or concept name
  to: string; // Principle ID or concept name
  type:
    | "depends_on"
    | "enables"
    | "refines"
    | "contradicts"
    | "derives_from"
    | "related_to";
  reason: string;
  evidence: string;
  strength: number; // 0-1
  conversationId: string;
  timestamp: string;
}

/**
 * Extracted hypothetical scenario
 */
export interface ExtractedHypothetical {
  id: string;
  principleId?: string; // Optional link to principle
  scenario: string;
  expectedOutcome: string;
  reasoning: string;
  confidence: number; // 0-1
  conversationId: string;
  timestamp: string;
}

/**
 * Extracted rejected alternative
 */
export interface ExtractedRejected {
  id: string;
  principleId?: string; // Optional link to principle
  alternative: string;
  reason: string;
  confidence: number; // 0-1
  conversationId: string;
  timestamp: string;
}

/**
 * Conversation statistics
 */
export interface ConversationStats {
  conversationId: string;
  messages: number;
  principles: number;
  insights: number;
  decisions: number;
  duration_minutes: number;
}

/**
 * JSON conversation structure from AICE
 */
interface ConversationJSON {
  metadata: {
    conversationId: string;
    date: string;
    platform: string;
    user: string;
    status: string;
    timestamp_start: string;
    timestamp_end: string;
    duration_minutes: number;
    messages: number;
    tokens_estimated: number;
  };
  decisions?: Array<{
    decision: string;
    context: string; // FIXED: Was 'rationale', actual JSON has 'context'
    impact: string;
    timestamp: string;
  }>;
  key_exchanges: Array<{
    index?: number;
    timestamp: string;
    role?: string;
    content?: string;
    full_content_length?: number;
    user?: string;
    assistant_action?: string;
    outcome?: string;
  }>;
  insights?: Array<{
    timestamp: string;
    type: string;
    insight: string;
    source: string;
  }>;
}

/**
 * Conversation Watcher
 * Monitors .lill/raw/ for new JSON files and indexes directly to QuadIndex
 *
 * Simplified Architecture:
 * - No AICF conversion (direct JSON → QuadIndex)
 * - No intermediate files (conversations.aicf, principles.aicf, etc.)
 * - Single watcher (replaces JSONToAICFWatcher + AICFFileWatcher)
 */
export class ConversationWatcher {
  private readonly rawDir: string;
  private readonly logger: Logger;
  private readonly pollInterval: number;
  private readonly verbose: boolean;
  private readonly onConversationProcessed:
    | ((conversationId: string, stats: ConversationStats) => void)
    | undefined;
  private readonly onPrincipleExtracted:
    | ((principle: ExtractedPrinciple) => Promise<void>)
    | undefined;
  private readonly onRelationshipExtracted:
    | ((relationship: ExtractedRelationship) => Promise<void>)
    | undefined;
  private readonly onHypotheticalExtracted:
    | ((hypothetical: ExtractedHypothetical) => Promise<void>)
    | undefined;
  private readonly onRejectedExtracted:
    | ((rejected: ExtractedRejected) => Promise<void>)
    | undefined;

  private watcher: FSWatcher | null = null;
  private pollTimer: NodeJS.Timeout | null = null;
  private processedFiles: Set<string> = new Set();
  private isRunning: boolean = false;
  private principlesIndexed: number = 0;

  constructor(
    cwd: string = process.cwd(),
    config?: ConversationWatcherConfig,
    logger?: Logger
  ) {
    this.rawDir = config?.rawDir ?? join(cwd, ".lill", "raw");
    this.pollInterval = config?.pollInterval ?? 5000; // 5 seconds
    this.verbose = config?.verbose ?? false;
    this.onConversationProcessed = config?.onConversationProcessed;
    this.onPrincipleExtracted = config?.onPrincipleExtracted;
    this.onRelationshipExtracted = config?.onRelationshipExtracted;
    this.onHypotheticalExtracted = config?.onHypotheticalExtracted;
    this.onRejectedExtracted = config?.onRejectedExtracted;
    this.logger = logger ?? new ConsoleLogger();
  }

  /**
   * Start watching for new conversation files
   */
  async start(): Promise<Result<void>> {
    try {
      if (this.isRunning) {
        return err(new Error("Conversation watcher is already running"));
      }

      // Check if raw directory exists
      if (!existsSync(this.rawDir)) {
        return err(new Error(`Raw directory does not exist: ${this.rawDir}`));
      }

      this.isRunning = true;

      // Process existing files first
      await this.processExistingFiles();

      // Start file system watcher
      this.watcher = watch(this.rawDir, async (_eventType, filename) => {
        if (filename && filename.endsWith(".json")) {
          await this.processFile(filename);
        }
      });

      // Start polling timer (backup for file system watcher)
      this.pollTimer = setInterval(async () => {
        await this.processExistingFiles();
      }, this.pollInterval);

      if (this.verbose) {
        this.logger.info(`Conversation watcher started on ${this.rawDir}`);
      }

      return ok(undefined);
    } catch (error) {
      this.isRunning = false;
      return err(toError(error));
    }
  }

  /**
   * Stop watching
   */
  async stop(): Promise<Result<void>> {
    try {
      if (!this.isRunning) {
        return err(new Error("Conversation watcher is not running"));
      }

      this.isRunning = false;

      // Stop file system watcher
      if (this.watcher) {
        this.watcher.close();
        this.watcher = null;
      }

      // Stop polling timer
      if (this.pollTimer) {
        clearInterval(this.pollTimer);
        this.pollTimer = null;
      }

      if (this.verbose) {
        this.logger.info("Conversation watcher stopped");
      }

      return ok(undefined);
    } catch (error) {
      return err(toError(error));
    }
  }

  /**
   * Process all existing JSON files in raw directory
   */
  private async processExistingFiles(): Promise<void> {
    try {
      const files = await readdir(this.rawDir);
      const jsonFiles = files.filter((f) => f.endsWith(".json"));

      for (const file of jsonFiles) {
        await this.processFile(file);
      }
    } catch (error) {
      this.logger.error("Failed to process existing files", toError(error));
    }
  }

  /**
   * Process a single JSON file
   */
  private async processFile(filename: string): Promise<void> {
    try {
      // Skip if already processed
      if (this.processedFiles.has(filename)) {
        return;
      }

      const filepath = join(this.rawDir, filename);

      // Check if file exists
      if (!existsSync(filepath)) {
        return;
      }

      if (this.verbose) {
        this.logger.info(`Processing conversation file: ${filename}`);
      }

      // Read and parse JSON
      const content = await readFile(filepath, "utf-8");
      const conversation: ConversationJSON = JSON.parse(content);

      // Extract and index conversation data
      const stats = await this.indexConversation(conversation);

      // Mark as processed
      this.processedFiles.add(filename);

      // Call callback if provided
      if (this.onConversationProcessed) {
        this.onConversationProcessed(
          conversation.metadata.conversationId,
          stats
        );
      }

      if (this.verbose) {
        this.logger.info(
          `✅ Indexed conversation ${conversation.metadata.conversationId} ` +
            `(${stats.messages} messages, ${stats.principles} principles, ` +
            `${stats.insights} insights, ${stats.decisions} decisions)`
        );
      }
    } catch (error) {
      this.logger.error(`Failed to process ${filename}`, toError(error));
    }
  }

  /**
   * Index conversation data
   *
   * Extracts principles, insights, decisions, relationships, and hypotheticals from conversation
   * and calls appropriate callbacks for each extracted item
   */
  /**
   * Calculate dynamic confidence score based on content quality
   */
  private calculateConfidence(
    text: string,
    baseConfidence: number,
    metadata?: any
  ): number {
    let confidence = baseConfidence;

    // Factor 1: Text length (longer = more detailed = higher confidence)
    // Bonus: +0.05 for 100-300 chars, +0.10 for 300+ chars
    if (text.length > 300) {
      confidence += 0.1;
    } else if (text.length > 100) {
      confidence += 0.05;
    } else if (text.length < 30) {
      // Penalty: -0.1 for very short text (< 30 chars)
      confidence -= 0.1;
    }

    // Factor 2: Content richness (has context, impact, examples)
    // Bonus: +0.05 for each rich field
    if (metadata?.context && metadata.context.length > 20) {
      confidence += 0.05;
    }
    if (metadata?.impact && metadata.impact.length > 20) {
      confidence += 0.05;
    }
    if (metadata?.examples && metadata.examples.length > 0) {
      confidence += 0.05;
    }

    // Factor 3: Specificity (contains specific terms, not vague)
    // Bonus: +0.05 if contains specific technical terms
    const specificTerms =
      /\b(implement|refactor|optimize|fix|add|remove|update|create|delete|test|validate|verify)\b/i;
    if (specificTerms.test(text)) {
      confidence += 0.05;
    }

    // Factor 4: Clarity (not truncated, not garbled)
    // Penalty: -0.1 if text seems truncated or incomplete
    if (
      text.endsWith("...") ||
      text.includes("undefined") ||
      text.includes("null")
    ) {
      confidence -= 0.1;
    }

    // Clamp confidence to [0.1, 1.0]
    return Math.max(0.1, Math.min(1.0, confidence));
  }

  private async indexConversation(
    conversation: ConversationJSON
  ): Promise<ConversationStats> {
    const { metadata, decisions = [], insights = [] } = conversation;
    let principlesExtracted = 0;

    // Extract and emit decisions as principles
    for (const decision of decisions) {
      const text = `Decision: ${decision.decision}. Context: ${decision.context}. Impact: ${decision.impact}`;
      const baseConfidence = 0.8; // Decisions start at high confidence
      const confidence = this.calculateConfidence(text, baseConfidence, {
        context: decision.context,
        impact: decision.impact,
      });

      const principle: ExtractedPrinciple = {
        id: `decision-${metadata.conversationId}-${principlesExtracted}`,
        text,
        confidence,
        source: "conversation",
        timestamp: decision.timestamp,
        conversationId: metadata.conversationId,
        metadata: {
          type: "decision",
          decision: decision.decision,
          context: decision.context,
          impact: decision.impact,
        },
      };

      if (this.onPrincipleExtracted) {
        await this.onPrincipleExtracted(principle);
      }
      principlesExtracted++;
    }

    // Extract and emit insights as principles
    for (const insight of insights) {
      const text = `${insight.type}: ${insight.insight}`;
      const baseConfidence = 0.7; // Insights start at medium-high confidence
      const confidence = this.calculateConfidence(text, baseConfidence, {
        insightType: insight.type,
      });

      const principle: ExtractedPrinciple = {
        id: `insight-${metadata.conversationId}-${principlesExtracted}`,
        text,
        confidence,
        source: "conversation",
        timestamp: insight.timestamp,
        conversationId: metadata.conversationId,
        metadata: {
          type: "insight",
          insightType: insight.type,
          insight: insight.insight,
        },
      };

      if (this.onPrincipleExtracted) {
        await this.onPrincipleExtracted(principle);
      }
      principlesExtracted++;
    }

    // Extract relationships from decisions and insights
    await this.extractRelationships(conversation);

    // Extract hypotheticals and rejected alternatives from decisions
    await this.extractHypotheticals(conversation);

    this.principlesIndexed += principlesExtracted;

    if (this.verbose && principlesExtracted > 0) {
      this.logger.info(
        `Extracted ${principlesExtracted} principles from conversation ${metadata.conversationId} ` +
          `(total: ${this.principlesIndexed})`
      );
    }

    return {
      conversationId: metadata.conversationId,
      messages: metadata.messages,
      principles: principlesExtracted,
      insights: insights.length,
      decisions: decisions.length,
      duration_minutes: metadata.duration_minutes,
    };
  }

  /**
   * Extract relationships from conversation
   *
   * Pattern matching for common relationship phrases:
   * - "X depends on Y"
   * - "X enables Y"
   * - "X refines Y"
   * - "X contradicts Y"
   */
  private async extractRelationships(
    conversation: ConversationJSON
  ): Promise<void> {
    if (!this.onRelationshipExtracted) return;

    const { metadata, decisions = [], insights = [] } = conversation;
    const allText = [
      ...decisions.map((d) => `${d.decision} ${d.context}`),
      ...insights.map((i) => i.insight),
    ].join(" ");

    // Pattern matching for relationships
    const patterns = [
      { regex: /(\w+)\s+depends\s+on\s+(\w+)/gi, type: "depends_on" as const },
      { regex: /(\w+)\s+enables\s+(\w+)/gi, type: "enables" as const },
      { regex: /(\w+)\s+refines\s+(\w+)/gi, type: "refines" as const },
      { regex: /(\w+)\s+contradicts\s+(\w+)/gi, type: "contradicts" as const },
      {
        regex: /(\w+)\s+derives\s+from\s+(\w+)/gi,
        type: "derives_from" as const,
      },
    ];

    let relationshipCount = 0;
    for (const pattern of patterns) {
      const matches = allText.matchAll(pattern.regex);
      for (const match of matches) {
        // Skip if match groups are undefined
        if (!match[1] || !match[2]) continue;

        const relationship: ExtractedRelationship = {
          id: `relationship-${metadata.conversationId}-${relationshipCount}`,
          from: match[1],
          to: match[2],
          type: pattern.type,
          reason: `Extracted from conversation: "${match[0]}"`,
          evidence: metadata.conversationId,
          strength: 0.6, // Medium confidence for pattern matching
          conversationId: metadata.conversationId,
          timestamp: metadata.timestamp_start,
        };

        await this.onRelationshipExtracted(relationship);
        relationshipCount++;
      }
    }

    if (this.verbose && relationshipCount > 0) {
      this.logger.info(
        `Extracted ${relationshipCount} relationships from conversation ${metadata.conversationId}`
      );
    }
  }

  /**
   * Extract hypotheticals and rejected alternatives from conversation
   *
   * Pattern matching for:
   * - "What if..." scenarios
   * - "Should we...?" questions
   * - "Could we...?" questions
   * - "Alternative: X" patterns
   * - "Option A vs Option B" patterns
   * - "We considered X but chose Y because..."
   * - "Rejected: X because Y"
   */
  private async extractHypotheticals(
    conversation: ConversationJSON
  ): Promise<void> {
    const { metadata, decisions = [], insights = [] } = conversation;
    const allText = [
      ...decisions.map((d) => `${d.decision} ${d.context}`),
      ...insights.map((i) => i.insight),
    ].join(" ");

    let hypotheticalCount = 0;
    let rejectedCount = 0;

    // Extract hypothetical scenarios
    if (this.onHypotheticalExtracted) {
      const hypotheticalPatterns = [
        // "What if..." scenarios
        { regex: /what\s+if\s+([^.?!]+)/gi, confidence: 0.6 },
        // "Should we...?" questions
        { regex: /should\s+we\s+([^.?!]+)/gi, confidence: 0.7 },
        // "Could we...?" questions
        { regex: /could\s+we\s+([^.?!]+)/gi, confidence: 0.6 },
        // "Alternative: X" patterns
        { regex: /alternative:\s*([^.?!]+)/gi, confidence: 0.7 },
        // "Option A vs Option B" patterns
        { regex: /option\s+([^.?!]+)\s+vs\s+([^.?!]+)/gi, confidence: 0.7 },
      ];

      for (const pattern of hypotheticalPatterns) {
        const matches = allText.matchAll(pattern.regex);
        for (const match of matches) {
          // Skip if match group is undefined
          if (!match[1]) continue;

          const scenario = match[2]
            ? `${match[1].trim()} vs ${match[2].trim()}`
            : match[1].trim();

          const hypothetical: ExtractedHypothetical = {
            id: `hypothetical-${metadata.conversationId}-${hypotheticalCount}`,
            scenario,
            expectedOutcome: "Unknown", // Would need deeper analysis
            reasoning: `Extracted from conversation: "${match[0]}"`,
            confidence: pattern.confidence,
            conversationId: metadata.conversationId,
            timestamp: metadata.timestamp_start,
          };

          await this.onHypotheticalExtracted(hypothetical);
          hypotheticalCount++;
        }
      }
    }

    // Extract rejected alternatives
    if (this.onRejectedExtracted) {
      const rejectedPatterns = [
        /rejected\s+([^.]+)\s+because\s+([^.]+)/gi,
        /considered\s+([^.]+)\s+but\s+([^.]+)/gi,
        /didn't\s+use\s+([^.]+)\s+because\s+([^.]+)/gi,
      ];

      for (const pattern of rejectedPatterns) {
        const matches = allText.matchAll(pattern);
        for (const match of matches) {
          // Skip if match groups are undefined
          if (!match[1] || !match[2]) continue;

          const rejected: ExtractedRejected = {
            id: `rejected-${metadata.conversationId}-${rejectedCount}`,
            alternative: match[1].trim(),
            reason: match[2].trim(),
            confidence: 0.6, // Medium confidence for pattern matching
            conversationId: metadata.conversationId,
            timestamp: metadata.timestamp_start,
          };

          await this.onRejectedExtracted(rejected);
          rejectedCount++;
        }
      }
    }

    if (this.verbose && (hypotheticalCount > 0 || rejectedCount > 0)) {
      this.logger.info(
        `Extracted ${hypotheticalCount} hypotheticals and ${rejectedCount} rejected alternatives from conversation ${metadata.conversationId}`
      );
    }
  }

  /**
   * Get watcher status
   */
  getStatus(): {
    isRunning: boolean;
    processedFiles: number;
    principlesIndexed: number;
    rawDir: string;
  } {
    return {
      isRunning: this.isRunning,
      processedFiles: this.processedFiles.size,
      principlesIndexed: this.principlesIndexed,
      rawDir: this.rawDir,
    };
  }
}

// Backward compatibility alias
export { ConversationWatcher as JSONWatcher };
export { ConversationWatcher as JSONToAICFWatcher };
