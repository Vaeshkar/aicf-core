/**
 * AICF Context Manager
 * Handles context compression, sharing, and restoration for AI-to-AI communication
 */

import fs from 'fs/promises';
import path from 'path';

export class AICFContext {
  constructor() {
    this.conversationHistory = [];
    this.technicalDecisions = [];
    this.insights = [];
    this.currentState = {};
  }

  /**
   * Load context from AICF file
   */
  static async load(aicfPath) {
    try {
      const content = await fs.readFile(aicfPath, 'utf8');
      return AICFContext.parse(content);
    } catch (error) {
      console.warn(`Could not load AICF context from ${aicfPath}: ${error.message}`);
      return new AICFContext();
    }
  }

  /**
   * Parse AICF format into structured context
   */
  static parse(aicfContent) {
    const context = new AICFContext();
    const lines = aicfContent.split('\n');
    let currentSection = null;
    let currentData = [];

    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('@FLOW')) {
        currentSection = 'flow';
        continue;
      }
      if (trimmed.startsWith('@DETAILS')) {
        currentSection = 'details';
        continue;
      }
      if (trimmed.startsWith('@INSIGHTS')) {
        currentSection = 'insights';
        continue;
      }
      if (trimmed.startsWith('@DECISIONS')) {
        currentSection = 'decisions';
        continue;
      }
      if (trimmed.startsWith('@STATE')) {
        currentSection = 'state';
        continue;
      }
      if (trimmed === '---' || trimmed.startsWith('@CONVERSATION:')) {
        currentSection = null;
        continue;
      }

      if (currentSection && trimmed) {
        currentData.push(trimmed);
      }
    }

    // Process collected data
    context.conversationHistory = currentData.filter(line => line.includes('|'));
    return context;
  }

  /**
   * Compress context for AI communication
   */
  compress(targetTokens = 500) {
    const compressed = {
      flow: this.conversationHistory.slice(-10).join('|'), // Last 10 interactions
      key_insights: this.insights.slice(-5), // Top 5 recent insights
      decisions: this.technicalDecisions.slice(-3), // Last 3 decisions
      state: this.currentState
    };

    return this.formatForAI(compressed);
  }

  /**
   * Format context for AI consumption
   */
  formatForAI(compressed) {
    return `
CONTEXT (AICF):
Flow: ${compressed.flow}
Insights: ${compressed.key_insights.join('; ')}
Decisions: ${compressed.decisions.join('; ')}
Current State: ${JSON.stringify(compressed.state)}
    `.trim();
  }

  /**
   * Update context with new AI response
   */
  update(aiName, response, metadata = {}) {
    this.conversationHistory.push(`${aiName}: ${response.substring(0, 200)}...`);
    
    if (metadata.insights) {
      this.insights.push(...metadata.insights);
    }
    
    if (metadata.decisions) {
      this.technicalDecisions.push(...metadata.decisions);
    }
    
    this.currentState = { ...this.currentState, ...metadata.state };
  }

  /**
   * Save context to AICF file
   */
  async save(outputPath) {
    const aicfContent = this.toAICF();
    await fs.writeFile(outputPath, aicfContent, 'utf8');
  }

  /**
   * Convert to AICF format
   */
  toAICF() {
    const timestamp = new Date().toISOString();
    
    return `@CONVERSATION:aiob_session_${Date.now()}
timestamp_start=${timestamp}
messages=${this.conversationHistory.length}

@FLOW
${this.conversationHistory.join('|')}

@INSIGHTS
${this.insights.join('|')}

@DECISIONS  
${this.technicalDecisions.join('|')}

@STATE
${JSON.stringify(this.currentState)}
`;
  }
}

export class AICFContextManager {
  constructor() {
    this.contexts = new Map();
  }

  /**
   * Prepare context for specific AI
   */
  prepareContext(context, aiName, aiCapabilities) {
    const compressedContext = context.compress();
    
    const contextPrompt = `
You are ${aiName} in an AI collaboration session.
Your capabilities: ${aiCapabilities.join(', ')}

Previous context:
${compressedContext}

Continue the conversation based on this context and your role.
    `.trim();

    return contextPrompt;
  }

  /**
   * Share context between AIs
   */
  shareContext(fromAI, toAI, conversation, aiCapabilities) {
    const context = new AICFContext();
    context.update(fromAI, conversation.response, conversation.metadata);
    
    return this.prepareContext(context, toAI, aiCapabilities[toAI] || []);
  }

  /**
   * Merge multiple AI responses into unified context
   */
  mergeResponses(responses) {
    const context = new AICFContext();
    
    for (const response of responses) {
      context.update(response.ai, response.content, response.metadata);
    }
    
    return context;
  }
}