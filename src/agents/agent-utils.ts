/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2025 Dennis van Leeuwen
 *
 * AgentUtils - Common utilities for pattern matching and text analysis
 */

export type PatternCategory =
  | "decisions"
  | "insights"
  | "actions"
  | "blockers"
  | "workingOn"
  | "nextActions";

export type ImpactLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type PriorityLevel = "HIGH" | "MEDIUM" | "LOW";
export type InsightCategory =
  | "PERFORMANCE"
  | "SECURITY"
  | "ARCHITECTURE"
  | "DEBUGGING"
  | "USER_EXPERIENCE"
  | "DATA"
  | "GENERAL";

export interface PatternMatch {
  pattern: string;
  match: string;
  context: string;
  index: number;
}

/**
 * Pattern definitions for content analysis
 */
const PATTERNS: Record<PatternCategory, RegExp[]> = {
  decisions: [
    /we decided to/i,
    /I chose/i,
    /let's go with/i,
    /the approach is/i,
    /we'll use/i,
    /selected/i,
    /agreed on/i,
    /going to use/i,
    /will implement/i,
    /plan is to/i,
  ],
  insights: [
    /realized/i,
    /discovered/i,
    /key insight/i,
    /learned that/i,
    /important to note/i,
    /critical/i,
    /breakthrough/i,
    /found out/i,
    /figured out/i,
    /turns out/i,
    /interesting/i,
  ],
  actions: [
    /implemented/i,
    /built/i,
    /created/i,
    /fixed/i,
    /solved/i,
    /updated/i,
    /changed/i,
    /modified/i,
    /added/i,
    /removed/i,
    /refactored/i,
    /optimized/i,
  ],
  blockers: [
    /blocked by/i,
    /can't proceed/i,
    /stuck on/i,
    /waiting for/i,
    /dependency/i,
    /issue with/i,
    /problem with/i,
    /error/i,
    /failing/i,
    /not working/i,
  ],
  workingOn: [
    /working on/i,
    /currently/i,
    /in progress/i,
    /building/i,
    /developing/i,
    /focusing on/i,
    /task is/i,
  ],
  nextActions: [
    /next step/i,
    /need to/i,
    /will/i,
    /plan to/i,
    /should/i,
    /todo/i,
    /next/i,
  ],
};

/**
 * Check if text matches any pattern in a category
 */
export function matchesPattern(text: string, category: PatternCategory): boolean {
  const patterns = PATTERNS[category] ?? [];
  return patterns.some((pattern) => pattern.test(text));
}

/**
 * Extract text matching specific patterns with context
 */
export function extractMatches(
  text: string,
  category: PatternCategory,
  contextLength = 100
): PatternMatch[] {
  const patterns = PATTERNS[category] ?? [];
  const matches: PatternMatch[] = [];

  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match) {
      const start = Math.max(0, match.index - contextLength / 2);
      const end = Math.min(
        text.length,
        match.index + match[0].length + contextLength / 2
      );
      matches.push({
        pattern: pattern.toString(),
        match: match[0],
        context: text.slice(start, end).trim(),
        index: match.index,
      });
    }
  }

  return matches;
}

/**
 * Clean and normalize text for processing
 */
export function cleanText(text: string): string {
  if (!text) return "";

  return text
    .replace(/\s+/g, " ")
    .replace(/[^\w\s\-_.]/g, "")
    .trim();
}

/**
 * Extract action verb from text
 */
export function extractAction(text: string): string {
  if (!text) return "";

  for (const pattern of PATTERNS.actions) {
    const match = pattern.exec(text);
    if (match) {
      const start = Math.max(0, match.index - 20);
      const end = Math.min(text.length, match.index + match[0].length + 30);
      const context = text.slice(start, end);
      return normalizeAction(context);
    }
  }

  return normalizeAction(text.substring(0, 50));
}

/**
 * Normalize action text to consistent format
 */
export function normalizeAction(action: string): string {
  return action
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, "_")
    .substring(0, 50)
    .replace(/^_+|_+$/g, "");
}

/**
 * Assess impact level of a decision or insight
 */
export function assessImpact(text: string): ImpactLevel {
  const content = text.toLowerCase();

  const criticalWords = [
    "architecture",
    "database",
    "security",
    "performance",
    "api design",
    "data model",
    "infrastructure",
    "deployment",
    "authentication",
    "authorization",
    "scalability",
  ];

  const highWords = [
    "feature",
    "component",
    "integration",
    "framework",
    "library",
    "service",
    "module",
    "interface",
    "workflow",
  ];

  const mediumWords = [
    "function",
    "method",
    "variable",
    "styling",
    "ui",
    "layout",
    "formatting",
    "validation",
    "helper",
  ];

  if (criticalWords.some((word) => content.includes(word))) return "CRITICAL";
  if (highWords.some((word) => content.includes(word))) return "HIGH";
  if (mediumWords.some((word) => content.includes(word))) return "MEDIUM";

  return "LOW";
}

/**
 * Categorize insights by domain
 */
export function categorizeInsight(text: string): InsightCategory {
  const content = text.toLowerCase();

  if (
    content.includes("performance") ||
    content.includes("speed") ||
    content.includes("optimization")
  ) {
    return "PERFORMANCE";
  }
  if (
    content.includes("security") ||
    content.includes("authentication") ||
    content.includes("authorization")
  ) {
    return "SECURITY";
  }
  if (
    content.includes("architecture") ||
    content.includes("design") ||
    content.includes("structure")
  ) {
    return "ARCHITECTURE";
  }
  if (
    content.includes("bug") ||
    content.includes("error") ||
    content.includes("fix") ||
    content.includes("debug")
  ) {
    return "DEBUGGING";
  }
  if (
    content.includes("user") ||
    content.includes("ui") ||
    content.includes("ux") ||
    content.includes("interface")
  ) {
    return "USER_EXPERIENCE";
  }
  if (
    content.includes("data") ||
    content.includes("database") ||
    content.includes("model")
  ) {
    return "DATA";
  }

  return "GENERAL";
}

/**
 * Calculate priority based on keywords
 */
export function calculatePriority(text: string): PriorityLevel {
  const content = text.toLowerCase();

  const highPriorityWords = [
    "critical",
    "urgent",
    "blocker",
    "important",
    "must",
    "required",
    "essential",
    "crucial",
    "key",
  ];

  const lowPriorityWords = [
    "nice to have",
    "optional",
    "later",
    "future",
    "minor",
    "cosmetic",
    "enhancement",
    "improvement",
  ];

  if (highPriorityWords.some((word) => content.includes(word))) return "HIGH";
  if (lowPriorityWords.some((word) => content.includes(word))) return "LOW";

  return "MEDIUM";
}

/**
 * Truncate text to specified length
 */
export function truncateText(text: string, maxLength = 100): string {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}

/**
 * Remove duplicate items from array
 */
export function deduplicate<T>(items: T[], keyProperty = "content"): T[] {
  if (!Array.isArray(items)) return items;

  const seen = new Set<unknown>();
  return items.filter((item) => {
    const key =
      typeof item === "object" && item !== null
        ? (item as Record<string, unknown>)[keyProperty]
        : item;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

