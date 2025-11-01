/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2025 Dennis van Leeuwen
 *
 * AICF Compiler - Compile structured data to AICF v3.1.1 format
 */

import type { Result } from "../types/result.js";
import { ok, err, toError } from "../types/result.js";
import type { AICFData } from "../types/aicf.js";
import { sanitizePipeData } from "../security/data-sanitizer.js";

/**
 * Compile metadata section
 */
export function compileMetadata(metadata: AICFData["metadata"]): string {
  const lines: string[] = ["@METADATA:"];

  for (const [key, value] of Object.entries(metadata)) {
    if (value !== undefined) {
      lines.push(`${key}=${sanitizePipeData(value)}`);
    }
  }

  return lines.join("\n");
}

/**
 * Compile session section
 */
export function compileSession(session: AICFData["session"]): string {
  if (!session) {
    return "";
  }

  const lines: string[] = ["@SESSION:"];

  for (const [key, value] of Object.entries(session)) {
    if (value !== undefined) {
      lines.push(`${key}=${sanitizePipeData(value)}`);
    }
  }

  return lines.join("\n");
}

/**
 * Compile conversations section
 */
export function compileConversations(
  conversations: AICFData["conversations"]
): string {
  if (!conversations || conversations.length === 0) {
    return "";
  }

  const lines: string[] = ["@CONVERSATION:"];

  for (const conv of conversations) {
    const parts = [
      sanitizePipeData(conv.id),
      sanitizePipeData(conv.timestamp),
      sanitizePipeData(conv.role),
      sanitizePipeData(conv.content),
    ];
    lines.push(parts.join("|"));
  }

  return lines.join("\n");
}

/**
 * Compile memories section
 */
export function compileMemories(memories: AICFData["memories"]): string {
  if (!memories || memories.length === 0) {
    return "";
  }

  const lines: string[] = ["@MEMORY:"];

  for (const memory of memories) {
    const parts = [
      sanitizePipeData(memory.type),
      sanitizePipeData(memory.timestamp),
      sanitizePipeData(memory.content),
    ];

    if (memory.importance) {
      parts.push(sanitizePipeData(memory.importance));
    }

    lines.push(parts.join("|"));
  }

  return lines.join("\n");
}

/**
 * Compile states section
 */
export function compileStates(states: AICFData["states"]): string {
  if (!states || states.length === 0) {
    return "";
  }

  const lines: string[] = ["@STATE:"];

  for (const state of states) {
    const parts = [
      sanitizePipeData(state.scope),
      sanitizePipeData(state.key),
      sanitizePipeData(state.value),
    ];
    lines.push(parts.join("|"));
  }

  return lines.join("\n");
}

/**
 * Compile insights section
 */
export function compileInsights(insights: AICFData["insights"]): string {
  if (!insights || insights.length === 0) {
    return "";
  }

  const lines: string[] = ["@INSIGHTS:"];

  for (const insight of insights) {
    const parts = [
      sanitizePipeData(insight.content),
      sanitizePipeData(insight.category),
      sanitizePipeData(insight.priority),
      sanitizePipeData(String(insight.confidence)),
    ];
    lines.push(parts.join("|"));
  }

  return lines.join("\n");
}

/**
 * Compile decisions section
 */
export function compileDecisions(decisions: AICFData["decisions"]): string {
  if (!decisions || decisions.length === 0) {
    return "";
  }

  const lines: string[] = ["@DECISIONS:"];

  for (const decision of decisions) {
    const parts = [
      sanitizePipeData(decision.decision),
      sanitizePipeData(decision.rationale),
    ];
    lines.push(parts.join("|"));
  }

  return lines.join("\n");
}

/**
 * Compile work section
 */
export function compileWork(work: AICFData["work"]): string {
  if (!work || work.length === 0) {
    return "";
  }

  const lines: string[] = ["@WORK:"];

  for (const item of work) {
    const parts = [sanitizePipeData(item.id), sanitizePipeData(item.status)];

    if (item.description) {
      parts.push(sanitizePipeData(item.description));
    }

    lines.push(parts.join("|"));
  }

  return lines.join("\n");
}

/**
 * Compile links section
 */
export function compileLinks(links: AICFData["links"]): string {
  if (!links || links.length === 0) {
    return "";
  }

  const lines: string[] = ["@LINKS:"];

  for (const link of links) {
    const parts = [
      sanitizePipeData(link.type),
      sanitizePipeData(link.source),
      sanitizePipeData(link.target),
    ];
    lines.push(parts.join("|"));
  }

  return lines.join("\n");
}

/**
 * Compile complete AICF data to string
 */
export function compileAICF(data: AICFData): Result<string> {
  try {
    const sections: string[] = [];

    // Required sections
    sections.push(compileMetadata(data.metadata));

    // Optional sections
    if (data.session) {
      sections.push(compileSession(data.session));
    }

    if (data.conversations.length > 0) {
      sections.push(compileConversations(data.conversations));
    }

    if (data.memories.length > 0) {
      sections.push(compileMemories(data.memories));
    }

    if (data.states.length > 0) {
      sections.push(compileStates(data.states));
    }

    if (data.insights.length > 0) {
      sections.push(compileInsights(data.insights));
    }

    if (data.decisions.length > 0) {
      sections.push(compileDecisions(data.decisions));
    }

    if (data.work.length > 0) {
      sections.push(compileWork(data.work));
    }

    if (data.links.length > 0) {
      sections.push(compileLinks(data.links));
    }

    // Join sections with double newline
    const content = sections.filter((s) => s).join("\n\n");

    return ok(content);
  } catch (error) {
    return err(toError(error));
  }
}
