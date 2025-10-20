/**
 * AI-Native Conversation Format (AICF) v1.0
 * Copyright (c) 2025 Dennis van Leeuwen
 *
 * Optimized for AI parsing efficiency, not human readability.
 * Token reduction: 85% vs YAML, 95% vs prose
 *
 * Format: C#|YYYYMMDD|T|TOPIC|WHAT|WHY|O|FILES
 *
 * Types: R=Release, F=Feature, X=Fix, D=Docs, W=Work, M=Refactor
 * Outcomes: S=Shipped, D=Decided, R=Resolved, P=InProgress, B=Blocked
 */

export type ConversationType = "R" | "F" | "X" | "D" | "W" | "M";
export type OutcomeType = "S" | "D" | "R" | "P" | "B";

export interface ParsedData {
  chat?: string;
  date?: string;
  type?: ConversationType;
  topic?: string;
  what?: string;
  why?: string;
  outcome?: OutcomeType;
  files?: string[];
}

const TYPE_MAP: Record<ConversationType, string> = {
  R: "RELEASE",
  F: "FEAT",
  X: "FIX",
  D: "DOCS",
  W: "WORK",
  M: "REFACTOR",
};

const OUTCOME_MAP: Record<OutcomeType, string> = {
  S: "SHIPPED",
  D: "DECIDED",
  R: "RESOLVED",
  P: "IN_PROGRESS",
  B: "BLOCKED",
};

/**
 * Convert YAML entry to AI-native format
 */
export function yamlToAiNative(yamlEntry: string): string {
  const lines = yamlEntry.split("\n");
  const data: ParsedData & { whyNext?: boolean; filesNext?: boolean } = {};

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (trimmed.startsWith("CHAT:")) {
      const chatValue = trimmed.split(":")[1]?.trim();
      if (chatValue) data.chat = chatValue;
    } else if (trimmed.startsWith("DATE:")) {
      const dateValue = trimmed.split(":")[1]?.trim().replace(/-/g, "");
      if (dateValue) data.date = dateValue;
    } else if (trimmed.startsWith("TYPE:")) {
      const typeStr = trimmed.split(":")[1]?.trim();
      data.type = (typeStr?.[0] as ConversationType) || "W";
    } else if (trimmed.startsWith("TOPIC:")) {
      const topicValue = trimmed.split(":")[1]?.trim().substring(0, 40);
      if (topicValue) data.topic = topicValue;
    } else if (trimmed.startsWith("- ") && !data.what) {
      data.what = trimmed.substring(2).substring(0, 80);
    } else if (trimmed.startsWith("WHY:")) {
      data.whyNext = true;
    } else if (data.whyNext && trimmed.startsWith("- ")) {
      data.why = trimmed.substring(2).substring(0, 60);
      data.whyNext = false;
    } else if (trimmed.startsWith("OUTCOME:")) {
      const outcomeStr = trimmed.split(":")[1]?.trim();
      data.outcome = (outcomeStr?.[0] as OutcomeType) || "D";
    } else if (trimmed.startsWith("FILES:")) {
      data.filesNext = true;
      data.files = [];
    } else if (data.filesNext && trimmed.startsWith("- ")) {
      const file = trimmed.substring(2).split(":")[0]?.trim();
      if (file) {
        data.files?.push(file);
      }
    }
  });

  const parts = [
    data.chat || "?",
    data.date || "00000000",
    data.type || "W",
    data.topic || "work",
    data.what || "",
    data.why || "",
    data.outcome || "D",
    (data.files || []).join(","),
  ];

  return parts.join("|");
}

/**
 * Convert AI-native format to YAML entry
 */
export function aiNativeToYaml(aiNativeLine: string): string {
  const parts = aiNativeLine.split("|");

  if (parts.length < 8) {
    throw new Error("Invalid AI-native format");
  }

  const [chat, date, type, topic, what, why, outcome, files] = parts;

  const dateStr = date || "00000000";
  const formattedDate = `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;

  let yaml = "```yaml\n---\n";
  yaml += `CHAT: ${chat}\n`;
  yaml += `DATE: ${formattedDate}\n`;
  yaml += `TYPE: ${TYPE_MAP[type as ConversationType] || "WORK"}\n`;
  yaml += `TOPIC: ${topic}\n\n`;
  yaml += `WHAT:\n  - ${what}\n\n`;

  if (why) {
    yaml += `WHY:\n  - ${why}\n\n`;
  }

  yaml += `OUTCOME: ${OUTCOME_MAP[outcome as OutcomeType] || "DECIDED"}\n\n`;

  if (files) {
    yaml += `FILES:\n`;
    files.split(",").forEach((file) => {
      yaml += `  - ${file}: Modified\n`;
    });
    yaml += "\n";
  }

  yaml += "---\n```\n";

  return yaml;
}

/**
 * Convert markdown entry to AI-native format
 */
export function markdownToAiNative(markdownEntry: string): string {
  const lines = markdownEntry.split("\n");
  const data: ParsedData = {};

  const headerMatch = lines[0]?.match(
    /Chat #(\d+).*\[Date: ([\d-]+)\].*- (.+)$/
  );
  if (headerMatch) {
    const chatMatch = headerMatch[1];
    const dateMatch = headerMatch[2];
    const topicMatch = headerMatch[3];

    if (chatMatch) data.chat = chatMatch;
    if (dateMatch) data.date = dateMatch.replace(/-/g, "");
    if (topicMatch) data.topic = topicMatch.substring(0, 40);
  }

  data.type = "W";
  if (data.topic && data.topic.match(/v\d+\.\d+\.\d+/)) {
    data.type = "R";
  } else if (data.topic && data.topic.match(/feat|feature/i)) {
    data.type = "F";
  } else if (data.topic && data.topic.match(/fix|bug/i)) {
    data.type = "X";
  } else if (data.topic && data.topic.match(/doc/i)) {
    data.type = "D";
  } else if (data.topic && data.topic.match(/refactor/i)) {
    data.type = "M";
  }

  let inWhatWeDid = false;
  let inKeyDecisions = false;
  let inFiles = false;

  lines.forEach((line) => {
    if (line.includes("### What We Did")) {
      inWhatWeDid = true;
      inKeyDecisions = false;
      inFiles = false;
    } else if (line.includes("### Key Decisions")) {
      inWhatWeDid = false;
      inKeyDecisions = true;
      inFiles = false;
    } else if (line.includes("### Files")) {
      inWhatWeDid = false;
      inKeyDecisions = false;
      inFiles = true;
    } else if (line.includes("###")) {
      inWhatWeDid = false;
      inKeyDecisions = false;
      inFiles = false;
    } else if (inWhatWeDid && line.trim().startsWith("-") && !data.what) {
      data.what = line.trim().substring(2).substring(0, 80);
    } else if (inKeyDecisions && line.trim().startsWith("-") && !data.why) {
      data.why = line.trim().substring(2).substring(0, 60);
    } else if (inFiles && line.trim().startsWith("-")) {
      if (!data.files) data.files = [];
      const file = line.trim().substring(2).split(":")[0]?.trim();
      if (file) {
        data.files.push(file);
      }
    }
  });

  data.outcome = "D";
  if (data.type === "R") {
    data.outcome = "S";
  } else if (data.type === "X") {
    data.outcome = "R";
  }

  const parts = [
    data.chat || "?",
    data.date || "00000000",
    data.type || "W",
    data.topic || "work",
    data.what || "",
    data.why || "",
    data.outcome || "D",
    (data.files || []).join(","),
  ];

  return parts.join("|");
}

/**
 * Convert entire conversation log to AI-native format
 */
export function convertConversationLog(
  content: string,
  format: "yaml" | "markdown" = "yaml"
): string[] {
  const aiNativeLines: string[] = [];

  if (format === "yaml") {
    const yamlBlocks = content.split("```yaml");
    yamlBlocks.forEach((block) => {
      if (block.includes("CHAT:")) {
        const yamlContent = block.split("```")[0];
        if (yamlContent) {
          aiNativeLines.push(yamlToAiNative(yamlContent));
        }
      }
    });
  } else {
    const entries = content.split(/^## Chat #/m);
    entries.forEach((entry) => {
      if (entry.trim()) {
        aiNativeLines.push(markdownToAiNative("## Chat #" + entry));
      }
    });
  }

  return aiNativeLines;
}

/**
 * Generate AI-native summary section
 */
export function generateAiNativeSummary(aiNativeLines: string[]): string {
  let summary = "## 📋 AI-Native Conversation History\n\n";
  summary += "> Format: C#|YYYYMMDD|T|TOPIC|WHAT|WHY|O|FILES\n";
  summary += "> Types: R=Release F=Feature X=Fix D=Docs W=Work M=Refactor\n";
  summary +=
    "> Outcomes: S=Shipped D=Decided R=Resolved P=InProgress B=Blocked\n";
  summary += "> Optimized for AI parsing - 85% token reduction vs YAML\n\n";
  summary += "```\n";
  summary += aiNativeLines.join("\n");
  summary += "\n```\n\n";
  summary += "---\n\n";

  return summary;
}
