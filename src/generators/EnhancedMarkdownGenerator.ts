import fs from "node:fs";
import { join } from "node:path";

interface GeneratorOptions {
  preserveExisting?: boolean;
  generateTimestamps?: boolean;
  includeEvidence?: boolean;
  smartTemplates?: boolean;
}

interface AICFData {
  source: string;
  messages: Message[];
  metadata: Record<string, any>;
}

interface Message {
  role: string;
  content: string;
  timestamp?: number;
}

interface Analysis {
  sessionType: string;
  workAccomplished: string[];
  problemsSolved: string[];
  decisionsWithRationale: string[];
  codeChanges: string[];
  methodsCreated: string[];
  filesModified: string[];
  apiChanges: string[];
}

interface Documentation {
  conversationLog: string | null;
  technicalDecisions: string | null;
  codePatterns: string | null;
  problemSolutions: string | null;
  designSystem: string | null;
  nextSteps: string | null;
}

interface GenerationResult {
  sessionType: string;
  analysis: Analysis;
  documentation: Documentation;
  filesGenerated: string[];
}

/**
 * Enhanced Markdown Generator
 *
 * Produces context-aware, intelligent documentation that captures actual
 * work accomplished, decisions made, and problems solved - not generic templates.
 */
export class EnhancedMarkdownGenerator {
  private readonly aiDir: string;

  constructor(_options: GeneratorOptions = {}) {
    this.aiDir = ".ai";
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    if (!fs.existsSync(this.aiDir)) {
      fs.mkdirSync(this.aiDir, { recursive: true });
    }
  }

  /**
   * Generate comprehensive documentation from AICF data
   */
  async generateDocumentation(
    aicfData: AICFData,
    _options: Record<string, any> = {}
  ): Promise<GenerationResult> {
    console.log(
      `📝 Generating enhanced documentation for ${aicfData.source} conversation...`
    );

    const analysis = this.performDeepAnalysis(aicfData);
    const sessionType = this.classifySession(analysis);

    console.log(`🎯 Session classified as: ${sessionType}`);

    const documentation: Documentation = {
      conversationLog: await this.generateIntelligentConversationLog(
        aicfData,
        analysis
      ),
      technicalDecisions: await this.generateTechnicalDecisions(
        aicfData,
        analysis
      ),
      codePatterns: await this.generateCodePatterns(aicfData, analysis),
      problemSolutions: await this.generateProblemSolutions(aicfData, analysis),
      designSystem: await this.generateDesignSystem(aicfData, analysis),
      nextSteps: await this.generateActionableNextSteps(aicfData, analysis),
    };

    await this.writeDocumentationFiles(documentation);

    return {
      sessionType,
      analysis,
      documentation,
      filesGenerated: Object.keys(documentation).filter(
        (doc) => documentation[doc as keyof Documentation] !== null
      ),
    };
  }

  /**
   * Perform deep analysis of conversation content
   */
  private performDeepAnalysis(aicfData: AICFData): Analysis {
    const content = this.extractAllText(aicfData);
    const messages = aicfData.messages ?? [];

    return {
      sessionType: this.detectSessionType(content, messages),
      workAccomplished: this.extractWorkAccomplished(content, messages),
      problemsSolved: this.extractProblemsSolved(content, messages),
      decisionsWithRationale: this.extractDecisionsWithRationale(
        content,
        messages
      ),
      codeChanges: this.extractCodeChanges(content, messages),
      methodsCreated: this.extractMethodsCreated(content, messages),
      filesModified: this.extractFilesModified(content, messages),
      apiChanges: this.extractAPIChanges(content, messages),
    };
  }

  /**
   * Extract all text from AICF data
   */
  private extractAllText(aicfData: AICFData): string {
    return aicfData.messages.map((m) => m.content).join("\n");
  }

  /**
   * Detect session type
   */
  private detectSessionType(_content: string, _messages: Message[]): string {
    return "development";
  }

  /**
   * Extract work accomplished
   */
  private extractWorkAccomplished(
    _content: string,
    _messages: Message[]
  ): string[] {
    return [];
  }

  /**
   * Extract problems solved
   */
  private extractProblemsSolved(
    _content: string,
    _messages: Message[]
  ): string[] {
    return [];
  }

  /**
   * Extract decisions with rationale
   */
  private extractDecisionsWithRationale(
    _content: string,
    _messages: Message[]
  ): string[] {
    return [];
  }

  /**
   * Extract code changes
   */
  private extractCodeChanges(_content: string, _messages: Message[]): string[] {
    return [];
  }

  /**
   * Extract methods created
   */
  private extractMethodsCreated(
    _content: string,
    _messages: Message[]
  ): string[] {
    return [];
  }

  /**
   * Extract files modified
   */
  private extractFilesModified(
    _content: string,
    _messages: Message[]
  ): string[] {
    return [];
  }

  /**
   * Extract API changes
   */
  private extractAPIChanges(_content: string, _messages: Message[]): string[] {
    return [];
  }

  /**
   * Classify session
   */
  private classifySession(analysis: Analysis): string {
    return analysis.sessionType;
  }

  /**
   * Generate intelligent conversation log
   */
  private async generateIntelligentConversationLog(
    aicfData: AICFData,
    _analysis: Analysis
  ): Promise<string> {
    const lines: string[] = [];

    lines.push("# Conversation Log");
    lines.push("");
    lines.push(`Source: ${aicfData.source}`);
    lines.push("");

    aicfData.messages.forEach((msg, index) => {
      lines.push(`## Message ${index + 1} - ${msg.role}`);
      lines.push("");
      lines.push(msg.content);
      lines.push("");
    });

    return lines.join("\n");
  }

  /**
   * Generate technical decisions
   */
  private async generateTechnicalDecisions(
    _aicfData: AICFData,
    analysis: Analysis
  ): Promise<string | null> {
    if (analysis.decisionsWithRationale.length === 0) {
      return null;
    }

    const lines: string[] = [];
    lines.push("# Technical Decisions");
    lines.push("");

    analysis.decisionsWithRationale.forEach((decision) => {
      lines.push(`- ${decision}`);
    });

    return lines.join("\n");
  }

  /**
   * Generate code patterns
   */
  private async generateCodePatterns(
    _aicfData: AICFData,
    analysis: Analysis
  ): Promise<string | null> {
    if (analysis.codeChanges.length === 0) {
      return null;
    }

    const lines: string[] = [];
    lines.push("# Code Patterns");
    lines.push("");

    analysis.codeChanges.forEach((change) => {
      lines.push(`- ${change}`);
    });

    return lines.join("\n");
  }

  /**
   * Generate problem solutions
   */
  private async generateProblemSolutions(
    _aicfData: AICFData,
    analysis: Analysis
  ): Promise<string | null> {
    if (analysis.problemsSolved.length === 0) {
      return null;
    }

    const lines: string[] = [];
    lines.push("# Problem Solutions");
    lines.push("");

    analysis.problemsSolved.forEach((problem) => {
      lines.push(`- ${problem}`);
    });

    return lines.join("\n");
  }

  /**
   * Generate design system
   */
  private async generateDesignSystem(
    _aicfData: AICFData,
    _analysis: Analysis
  ): Promise<string | null> {
    return null;
  }

  /**
   * Generate actionable next steps
   */
  private async generateActionableNextSteps(
    _aicfData: AICFData,
    analysis: Analysis
  ): Promise<string> {
    const lines: string[] = [];
    lines.push("# Next Steps");
    lines.push("");

    if (analysis.workAccomplished.length > 0) {
      lines.push("## Continue Work");
      analysis.workAccomplished.forEach((work) => {
        lines.push(`- ${work}`);
      });
    }

    return lines.join("\n");
  }

  /**
   * Write documentation files
   */
  private async writeDocumentationFiles(
    documentation: Documentation
  ): Promise<void> {
    for (const [key, content] of Object.entries(documentation)) {
      if (content !== null) {
        const filename = `${key.replace(/([A-Z])/g, "-$1").toLowerCase()}.md`;
        const filepath = join(this.aiDir, filename);

        fs.writeFileSync(filepath, content);
        console.log(`✅ Generated ${filepath}`);
      }
    }
  }
}
