/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2025 Dennis van Leeuwen
 *
 * Smart Conversation Analyzer
 * Extracts meaningful insights, decisions, and summaries from conversations
 */

export interface ConversationMessage {
  input?: string;
  working_directory?: string;
}

export interface Conversation {
  id: string;
  messageCount: number;
  created_at: string;
  last_modified_at: string;
  messages?: ConversationMessage[];
}

export interface ExtractedItem {
  type: string;
  description: string;
  category: string;
}

export interface Technologies {
  files: string[];
  commands: string[];
  packages: string[];
  directories: string[];
}

export interface ConversationAnalysis {
  id: string;
  shortId: string;
  messageCount: number;
  timespan: {
    start: string;
    end: string;
    duration: number;
  };
  summary: string;
  accomplishments: ExtractedItem[];
  decisions: ExtractedItem[];
  problems: ExtractedItem[];
  insights: ExtractedItem[];
  technologies: Technologies;
  nextSteps: string[];
}

interface PatternGroup {
  [key: string]: RegExp;
}

interface Patterns {
  implementation: PatternGroup;
  decisions: PatternGroup;
  problems: PatternGroup;
  insights: PatternGroup;
}

interface ContinuationPattern {
  regex: RegExp;
  hint: string;
}

/**
 * Analyzes conversations to extract insights
 */
export class ConversationAnalyzer {
  private readonly patterns: Patterns;
  private readonly techPatterns: PatternGroup;

  constructor() {
    this.patterns = {
      implementation: {
        created:
          /(?:created?|added?|implemented?|built?)\s+([^\n\r]{5,500})(?:\.|\n|\r|$)/gi,
        modified:
          /(?:updated?|modified?|changed?|edited?|fixed?)\s+([^\n\r]{5,500})(?:\.|\n|\r|$)/gi,
        removed:
          /(?:removed?|deleted?|cleaned up?)\s+([^\n\r]{5,500})(?:\.|\n|\r|$)/gi,
        refactored:
          /(?:refactored?|restructured?|reorganized?)\s+([^\n\r]{5,500})(?:\.|\n|\r|$)/gi,
      },
      decisions: {
        chose:
          /(?:chose|decided|selected|picked|opted for)\s+([^\n\r]{5,400})(?:\.|\n|\r|$)/gi,
        because:
          /(?:because|since|due to|as)\s+([^\n\r]{5,400})(?:\.|\n|\r|$)/gi,
        instead:
          /(?:instead of|rather than|over)\s+([^\n\r]{5,400})(?:\.|\n|\r|$)/gi,
      },
      problems: {
        issue:
          /(?:issue|problem|bug|error)\s*:?\s*([^\n\r]{5,400})(?:\.|\n|\r|$)/gi,
        fixed: /(?:fixed|resolved|solved)\s+([^\n\r]{5,400})(?:\.|\n|\r|$)/gi,
        workaround:
          /(?:workaround|temporary fix)\s*:?\s*([^\n\r]{5,400})(?:\.|\n|\r|$)/gi,
      },
      insights: {
        learned:
          /(?:learned|discovered|found out|realized)\s+([^\n\r]{5,400})(?:\.|\n|\r|$)/gi,
        important:
          /(?:important|crucial|critical|key|essential)\s+([^\n\r]{5,400})(?:\.|\n|\r|$)/gi,
        note: /(?:note|remember|keep in mind)\s*:?\s*([^\n\r]{5,400})(?:\.|\n|\r|$)/gi,
      },
    };

    this.techPatterns = {
      files:
        /(?:file|script|component|module)\s+([a-zA-Z0-9\-_.\/]+\.[a-zA-Z0-9]+)/gi,
      commands:
        /(?:npm|git|node|python|pip|cargo|go|rustc)\s+([a-zA-Z0-9\-_ ]+)/gi,
      packages: /(?:installed?|added?|using)\s+([a-zA-Z0-9\-_@\/]+)/gi,
      directories: /(\/[a-zA-Z0-9\-_\.\/]+\/[a-zA-Z0-9\-_\.]*)/gi,
    };
  }

  /**
   * Analyze a full conversation
   */
  analyzeConversation(conversation: Conversation): ConversationAnalysis {
    return {
      id: conversation.id,
      shortId: conversation.id.substring(0, 8),
      messageCount: conversation.messageCount,
      timespan: this.calculateTimespan(conversation),
      summary: this.generateSummary(conversation),
      accomplishments: this.extractAccomplishments(conversation),
      decisions: this.extractDecisions(conversation),
      problems: this.extractProblems(conversation),
      insights: this.extractInsights(conversation),
      technologies: this.extractTechnologies(conversation),
      nextSteps: this.generateNextSteps(conversation),
    };
  }

  /**
   * Calculate conversation timespan
   */
  private calculateTimespan(conversation: Conversation) {
    const start = conversation.created_at;
    const end = conversation.last_modified_at;
    const duration = new Date(end).getTime() - new Date(start).getTime();

    return { start, end, duration };
  }

  /**
   * Generate high-level summary
   */
  private generateSummary(conversation: Conversation): string {
    const messages = conversation.messages || [];
    if (messages.length === 0) {
      return "Empty conversation with no messages";
    }

    const workingDirs = this.extractWorkingDirs(messages);
    const timespan = this.calculateTimespanMinutes(conversation);

    let summary = `${messages.length}-message conversation`;
    summary += this.formatTimespan(timespan);
    summary += this.formatProjects(workingDirs);
    summary += this.formatSessionType(messages.length);

    return summary;
  }

  /**
   * Extract working directories
   */
  private extractWorkingDirs(messages: ConversationMessage[]): string[] {
    const dirs = messages
      .map((m) => m.working_directory)
      .filter((d): d is string => Boolean(d));
    return [...new Set(dirs)];
  }

  /**
   * Calculate timespan in minutes
   */
  private calculateTimespanMinutes(conversation: Conversation): number {
    const start = new Date(conversation.created_at).getTime();
    const end = new Date(conversation.last_modified_at).getTime();
    return Math.round((end - start) / (1000 * 60));
  }

  /**
   * Format timespan for display
   */
  private formatTimespan(minutes: number): string {
    if (minutes === 0) return "";
    if (minutes < 60) return ` over ${minutes} minutes`;
    const hours = Math.round((minutes / 60) * 10) / 10;
    return ` over ${hours} hours`;
  }

  /**
   * Format project names
   */
  private formatProjects(workingDirs: string[]): string {
    if (workingDirs.length === 0) return "";

    const projectNames = workingDirs.map((dir) => {
      const parts = dir.split("/");
      return parts[parts.length - 1] || parts[parts.length - 2] || "project";
    });

    return ` in ${[...new Set(projectNames)].join(", ")}`;
  }

  /**
   * Format session type
   */
  private formatSessionType(messageCount: number): string {
    if (messageCount > 500) return " (major development session)";
    if (messageCount > 100) return " (substantial work session)";
    if (messageCount > 20) return " (focused session)";
    return " (brief session)";
  }

  /**
   * Extract accomplishments
   */
  private extractAccomplishments(conversation: Conversation): ExtractedItem[] {
    const items = this.extractItems(
      conversation,
      this.patterns.implementation,
      "implementation"
    );
    return this.deduplicateAndSort(items).slice(0, 6);
  }

  /**
   * Extract decisions
   */
  private extractDecisions(conversation: Conversation): ExtractedItem[] {
    const items = this.extractItems(
      conversation,
      this.patterns.decisions,
      "decision"
    );
    return this.deduplicateAndSort(items).slice(0, 4);
  }

  /**
   * Extract problems
   */
  private extractProblems(conversation: Conversation): ExtractedItem[] {
    const items = this.extractItems(
      conversation,
      this.patterns.problems,
      "problem"
    );
    return this.deduplicateAndSort(items).slice(0, 4);
  }

  /**
   * Extract insights
   */
  private extractInsights(conversation: Conversation): ExtractedItem[] {
    const items = this.extractItems(
      conversation,
      this.patterns.insights,
      "insight"
    );
    return this.deduplicateAndSort(items).slice(0, 4);
  }

  /**
   * Extract items using patterns
   */
  private extractItems(
    conversation: Conversation,
    patterns: PatternGroup,
    category: string
  ): ExtractedItem[] {
    const items: ExtractedItem[] = [];
    const allText = this.getCombinedText(conversation);

    for (const [type, pattern] of Object.entries(patterns)) {
      const matches = this.findMatches(pattern, allText);
      for (const description of matches) {
        items.push({ type, description, category });
      }
    }

    return items;
  }

  /**
   * Find pattern matches
   */
  private findMatches(pattern: RegExp, text: string): string[] {
    const matches: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
      if (match[1]) {
        const cleaned = this.cleanText(match[1]);
        if (this.isValidMatch(cleaned)) {
          matches.push(cleaned);
        }
      }
    }

    return matches;
  }

  /**
   * Check if match is valid
   */
  private isValidMatch(text: string): boolean {
    return text.length > 10 && this.isValidContent(text);
  }

  /**
   * Extract technologies
   */
  private extractTechnologies(conversation: Conversation): Technologies {
    const tech: Technologies = {
      files: [],
      commands: [],
      packages: [],
      directories: [],
    };

    const allText = this.getCombinedText(conversation);

    for (const [category, pattern] of Object.entries(this.techPatterns)) {
      const matches = this.findTechMatches(pattern, allText);
      tech[category as keyof Technologies] = matches.slice(0, 8);
    }

    return tech;
  }

  /**
   * Find technology matches
   */
  private findTechMatches(pattern: RegExp, text: string): string[] {
    const matches: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
      if (match[1]) {
        const item = match[1].trim();
        if (item.length > 2 && item.length < 100) {
          matches.push(item);
        }
      }
    }

    return [...new Set(matches)];
  }

  /**
   * Generate next steps
   */
  private generateNextSteps(conversation: Conversation): string[] {
    const steps: string[] = [];
    const allText = this.getCombinedText(conversation);

    const todoPatterns = [
      /(?:todo|need to|should|must)\s+(.{5,500})/gi,
      /(?:next|then|after)\s+(.{5,500})/gi,
      /(?:will|plan to|going to)\s+(.{5,500})/gi,
    ];

    for (const pattern of todoPatterns) {
      const matches = this.findTodoMatches(pattern, allText);
      steps.push(...matches);
    }

    const deduped = [...new Set(steps)].slice(0, 4);

    if (deduped.length === 0) {
      return this.generateDefaultSteps(conversation.messageCount);
    }

    return deduped;
  }

  /**
   * Find todo matches
   */
  private findTodoMatches(pattern: RegExp, text: string): string[] {
    const matches: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
      if (match[1]) {
        const step = this.cleanText(match[1]);
        if (step.length > 5) {
          matches.push(step);
        }
      }
    }

    return matches;
  }

  /**
   * Generate default steps
   */
  private generateDefaultSteps(messageCount: number): string[] {
    if (messageCount > 100) {
      return [
        "Review and test the implemented changes",
        "Update documentation if needed",
      ];
    }
    return ["Continue development work"];
  }

  /**
   * Get combined text from messages
   */
  private getCombinedText(conversation: Conversation): string {
    const messages = conversation.messages || [];
    return messages
      .map((m) => m.input || "")
      .join(" ")
      .toLowerCase();
  }

  /**
   * Clean and normalize text
   */
  private cleanText(text: string): string {
    if (!text) return "";
    if (text.length > 10000) return "";

    if (this.isCorrupted(text)) return "";

    let cleaned = this.applyCleaningRules(text);
    cleaned = this.truncateIfNeeded(cleaned);

    return cleaned;
  }

  /**
   * Check if text is corrupted
   */
  private isCorrupted(text: string): boolean {
    const corruptedPatterns = [
      /[a-zA-Z0-9+/]{100,}/,
      /[0-9a-f]{50,}/,
      /\w{200,}/,
      /[^\w\s.,!?;:()\-\/]{20,}/,
      /(file_path:[^,\s]{50,})/gi,
      /(context:|actionresult:|executionenvironment:)/gi,
    ];

    return corruptedPatterns.some((pattern) => pattern.test(text));
  }

  /**
   * Apply cleaning rules
   */
  private applyCleaningRules(text: string): string {
    return text
      .replace(/\\n/g, " ")
      .replace(/\\r/g, " ")
      .replace(/\\t/g, " ")
      .replace(/\\\\/g, "")
      .replace(/[\n\r\t]/g, " ")
      .replace(/\b\w*_path:\S+/g, "")
      .replace(/\b(context|actionresult|executionenvironment):[^,\s]+/gi, "")
      .replace(/\b[a-f0-9]{8,}/g, "")
      .replace(/\s+/g, " ")
      .replace(/[{}[\]]/g, "")
      .replace(/"+/g, "")
      .replace(/\|/g, " ")
      .trim();
  }

  /**
   * Truncate text if needed
   */
  private truncateIfNeeded(text: string): string {
    if (text.length <= 1000) return text;

    const sentences = text.split(/[.!?]+\s+/);
    if (sentences.length > 1 && sentences[0]) {
      const first = sentences[0];
      text = first.length < 300 ? first : text.substring(0, 200);
    } else {
      text = text.substring(0, 200);
    }

    text = text.trim();
    if (!text.match(/[.!?]$/)) {
      text += "...";
    }

    return text;
  }

  /**
   * Validate content
   */
  private isValidContent(text: string): boolean {
    if (!text || typeof text !== "string") return false;
    if (text.length < 10 || text.length > 1000) return false;

    const wordChars = text.match(/\w/g) || [];
    const wordRatio = wordChars.length / text.length;
    if (wordRatio < 0.6) return false;

    if (this.hasStructuredPatterns(text)) return false;

    const readableWords = text.match(/\b[a-zA-Z]{3,}\b/g) || [];
    return readableWords.length >= 2;
  }

  /**
   * Check for structured patterns
   */
  private hasStructuredPatterns(text: string): boolean {
    const structuredPatterns = [
      /^[a-z]+_[a-z]+:/,
      /^[a-f0-9]{10,}$/,
      /^[A-Za-z0-9+/]{20,}$/,
      /\b(actionresult|executionenvironment|context):/gi,
      /\bfile_path:\S+/gi,
      /\bhome_dir:\S+/gi,
    ];

    return structuredPatterns.some((pattern) => pattern.test(text));
  }

  /**
   * Deduplicate and sort items
   */
  private deduplicateAndSort(items: ExtractedItem[]): ExtractedItem[] {
    const seen = new Set<string>();
    const unique: ExtractedItem[] = [];

    for (const item of items) {
      const key = item.description.toLowerCase();
      if (!seen.has(key) && key.length > 5) {
        seen.add(key);
        unique.push(item);
      }
    }

    return unique.sort((a, b) => b.description.length - a.description.length);
  }

  /**
   * Format items for display
   */
  formatForDisplay(items: ExtractedItem[], maxItems = 5): string[] {
    if (!items || items.length === 0) {
      return [];
    }

    return items.slice(0, maxItems).map((item) => {
      const summary = this.summarizeText(item.description, 150);
      return `- **${item.type}**: ${summary}`;
    });
  }

  /**
   * Summarize text
   */
  private summarizeText(text: string, maxLength = 200): string {
    if (!text || text.length <= maxLength) {
      return text;
    }

    text = this.cleanText(text);

    const sentences = text
      .split(/[.!?]+\s+/)
      .filter((s) => s.trim().length > 0);

    if (sentences.length > 0) {
      return this.buildSummaryFromSentences(sentences, maxLength, text);
    }

    return this.buildSummaryFromWords(text, maxLength);
  }

  /**
   * Build summary from sentences
   */
  private buildSummaryFromSentences(
    sentences: string[],
    maxLength: number,
    fullText: string
  ): string {
    if (!sentences[0]) return "";
    let summary = sentences[0].trim();

    for (let i = 1; i < sentences.length; i++) {
      const sentence = sentences[i];
      if (!sentence) continue;
      const next = sentence.trim();
      if (summary.length + next.length + 2 <= maxLength) {
        summary += ". " + next;
      } else {
        break;
      }
    }

    if (summary.length > maxLength) {
      summary = this.truncateToWords(summary, maxLength);
      summary += this.generateContinuationHint(fullText, summary);
    }

    return summary;
  }

  /**
   * Build summary from words
   */
  private buildSummaryFromWords(text: string, maxLength: number): string {
    const words = text.split(" ").filter((w) => w.length > 0);
    if (words.length <= 20) return text;

    let summary = words.slice(0, Math.floor(maxLength / 6)).join(" ");
    summary = summary.replace(/[,\s]+$/, "");
    summary += this.generateContinuationHint(text, summary);
    return summary;
  }

  /**
   * Truncate to word boundaries
   */
  private truncateToWords(text: string, maxLength: number): string {
    const words = text.split(" ");
    const targetWords = Math.floor(words.length * (maxLength / text.length));
    let result = words.slice(0, Math.max(10, targetWords)).join(" ");
    result = result.replace(/[,\s]+$/, "");
    return result;
  }

  /**
   * Generate continuation hint
   */
  private generateContinuationHint(
    fullText: string,
    summarized: string
  ): string {
    const remaining = fullText.substring(summarized.length).trim();
    if (!remaining) return "...";

    const patterns: ContinuationPattern[] = [
      {
        regex: /\bfile[s]?\b.*\.(js|ts|py|go|rs|java|cpp|php|rb)\b/i,
        hint: " [+ file details]",
      },
      {
        regex: /\b(error|exception|failed|issue|problem)\b/i,
        hint: " [+ error details]",
      },
      {
        regex: /\b(implemented?|created?|added?|built?)\b/i,
        hint: " [+ implementation details]",
      },
      {
        regex: /\b(npm|git|node|python|cargo|go)\s+\w+/i,
        hint: " [+ command details]",
      },
      { regex: /\b(fixed|resolved|solved)\b/i, hint: " [+ solution details]" },
      {
        regex: /\b(decided?|chose|selected)\b/i,
        hint: " [+ decision rationale]",
      },
      { regex: /\b(learned|discovered|realized)\b/i, hint: " [+ insights]" },
      {
        regex: /\b(next|then|after|should|need|todo)\b/i,
        hint: " [+ next steps]",
      },
      { regex: /\b(because|since|due\s+to|as)\b/i, hint: " [+ reasoning]" },
      {
        regex: /\b\d+\s*(files?|lines?|changes?|messages?)\b/i,
        hint: " [+ metrics]",
      },
      {
        regex: /\b(component|function|class|module|api)\b/i,
        hint: " [+ code structure]",
      },
    ];

    for (const pattern of patterns) {
      if (pattern.regex.test(remaining)) {
        return pattern.hint;
      }
    }

    return this.generateGenericHint(remaining);
  }

  /**
   * Generate generic hint
   */
  private generateGenericHint(remaining: string): string {
    const charCount = remaining.length;
    if (charCount > 500) return " [+ extensive details]";
    if (charCount > 200) return " [+ more details]";
    return " [+ details]";
  }
}
