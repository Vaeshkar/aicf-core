/**
 * Phase Validation Agent
 * 
 * Validates each phase completion against PRD requirements and AICF context.
 * Prevents wasteful token usage by ensuring phases are complete before proceeding.
 */

import fs from 'fs-extra';
import path from 'path';

export class PhaseValidationAgent {
  constructor() {
    this.name = 'Phase Validation Agent';
    this.role = 'phase_validation';
    this.systemPrompt = `You are a Phase Validation Agent specialized in verifying phase completion quality.

YOUR RESPONSIBILITIES:
- Validate phase deliverables against PRD requirements
- Check if phase outputs are complete and correct
- Identify missing or incomplete deliverables
- Prevent subsequent phases from building on incomplete foundations
- Recommend specific improvements or additions

YOU ALWAYS:
- Compare actual deliverables with expected deliverables from PRD
- Check file completeness and correctness
- Validate against AICF phase requirements
- Identify gaps between what was requested vs what was delivered
- Provide specific, actionable recommendations

VALIDATION CRITERIA:
1. COMPLETENESS: All required files/features implemented
2. CORRECTNESS: Files contain expected content and structure
3. INTEGRATION: Files work together as expected
4. PRD COMPLIANCE: Deliverables match PRD specifications
5. QUALITY: Code/content meets professional standards

OUTPUT FORMAT:
- PASS/FAIL status for the phase
- Specific list of missing/incomplete items
- Recommendations for improvements
- Whether next phase should proceed or current phase needs fixes

IMPORTANT: Be thorough but efficient. Focus on critical issues that would impact subsequent phases.`;
  }

  /**
   * Validate a completed phase against PRD and requirements
   */
  async validatePhase(phaseResult, prd, aicfContext, projectDir) {
    const validationPrompt = this.buildValidationPrompt(phaseResult, prd, aicfContext, projectDir);
    return validationPrompt;
  }

  /**
   * Build comprehensive validation prompt
   */
  buildValidationPrompt(phaseResult, prd, aicfContext, projectDir) {
    let prompt = `${this.systemPrompt}\n\n`;

    prompt += '═'.repeat(60) + '\n';
    prompt += 'PHASE VALIDATION REQUEST\n';
    prompt += '═'.repeat(60) + '\n\n';

    // Phase Information
    prompt += `**Phase:** ${phaseResult.phase}\n`;
    prompt += `**Agent:** ${phaseResult.agent}\n`;
    prompt += `**Task:** ${phaseResult.task}\n`;
    prompt += `**Files Created:** ${phaseResult.filesCreated.length}\n\n`;

    // Files Created
    prompt += `**Deliverables:**\n`;
    phaseResult.filesCreated.forEach(file => {
      prompt += `- ${file}\n`;
    });
    prompt += '\n';

    // PRD Requirements
    prompt += '═'.repeat(60) + '\n';
    prompt += 'PROJECT REQUIREMENTS (PRD):\n';
    prompt += '═'.repeat(60) + '\n\n';
    prompt += `${prd}\n\n`;

    // AICF Context
    if (aicfContext && aicfContext.phases && aicfContext.phases.length > 0) {
      prompt += '═'.repeat(60) + '\n';
      prompt += 'PREVIOUS PHASE CONTEXT:\n';
      prompt += '═'.repeat(60) + '\n\n';

      aicfContext.phases.forEach((prevPhase, i) => {
        prompt += `Phase ${i + 1}: ${prevPhase.phase}\n`;
        prompt += `Files: ${prevPhase.filesCreated.join(', ')}\n`;
        prompt += `Summary: ${prevPhase.summary}\n\n`;
      });
    }

    // Validation Task
    prompt += '═'.repeat(60) + '\n';
    prompt += 'VALIDATION TASK:\n';
    prompt += '═'.repeat(60) + '\n\n';

    prompt += `Please validate if this phase is complete and correct:\n\n`;

    prompt += `1. **COMPLETENESS CHECK**: Are all expected deliverables present?\n`;
    prompt += `2. **PRD COMPLIANCE**: Do deliverables match PRD specifications?\n`;
    prompt += `3. **QUALITY CHECK**: Are files complete and well-structured?\n`;
    prompt += `4. **INTEGRATION CHECK**: Will these files work with future phases?\n`;
    prompt += `5. **NEXT PHASE READINESS**: Is foundation solid for next phase?\n\n`;

    // Expected Response Format
    prompt += `**RESPOND WITH:**\n\n`;
    prompt += `**VALIDATION RESULT**: PASS or FAIL\n\n`;
    prompt += `**COMPLETENESS SCORE**: X/10\n\n`;
    prompt += `**MISSING ITEMS** (if any):\n`;
    prompt += `- List specific missing files/features\n`;
    prompt += `- Identify incomplete implementations\n\n`;

    prompt += `**RECOMMENDATIONS** (if needed):\n`;
    prompt += `- Specific improvements needed\n`;
    prompt += `- Files that need enhancement\n`;
    prompt += `- Critical issues to fix\n\n`;

    prompt += `**NEXT PHASE READINESS**: READY or NEEDS_FIXES\n\n`;

    prompt += `Focus on issues that would impact subsequent phases or final application quality.\n\n`;

    prompt += `BEGIN VALIDATION:\n`;

    return prompt;
  }

  /**
   * Parse validation response
   */
  parseValidationResponse(response) {
    const validation = {
      status: 'UNKNOWN',
      completenessScore: 0,
      missingItems: [],
      recommendations: [],
      nextPhaseReady: false,
      rawResponse: response
    };

    // Extract validation result
    const statusMatch = response.match(/VALIDATION RESULT:\s*(PASS|FAIL)/i);
    if (statusMatch) {
      validation.status = statusMatch[1].toUpperCase();
    }

    // Extract completeness score
    const scoreMatch = response.match(/COMPLETENESS SCORE:\s*(\d+)\/10/i);
    if (scoreMatch) {
      validation.completenessScore = parseInt(scoreMatch[1]);
    }

    // Extract missing items
    const missingSection = response.match(/MISSING ITEMS[^:]*:([\s\S]*?)(?=\*\*|$)/i);
    if (missingSection) {
      const items = missingSection[1].split('\n')
        .filter(line => line.trim().startsWith('-'))
        .map(line => line.trim().substring(1).trim());
      validation.missingItems = items;
    }

    // Extract recommendations
    const recSection = response.match(/RECOMMENDATIONS[^:]*:([\s\S]*?)(?=\*\*|$)/i);
    if (recSection) {
      const recs = recSection[1].split('\n')
        .filter(line => line.trim().startsWith('-'))
        .map(line => line.trim().substring(1).trim());
      validation.recommendations = recs;
    }

    // Extract next phase readiness
    const readyMatch = response.match(/NEXT PHASE READINESS:\s*(READY|NEEDS_FIXES)/i);
    if (readyMatch) {
      validation.nextPhaseReady = readyMatch[1].toUpperCase() === 'READY';
    }

    return validation;
  }

  /**
   * Create phase validation report
   */
  async createValidationReport(validation, phaseResult, projectDir) {
    const report = `@CONVERSATION:${phaseResult.phase.replace(/\s+/g, '_')}_validation
timestamp=${new Date().toISOString()}
phase=${phaseResult.phase}
agent=${phaseResult.agent}
validation_status=${validation.status}
completeness_score=${validation.completenessScore}
next_phase_ready=${validation.nextPhaseReady}

@DELIVERABLES
${phaseResult.filesCreated.map(file => `delivered=${file}`).join('\n')}

@MISSING_ITEMS
${validation.missingItems.map(item => `missing="${item}"`).join('\n')}

@RECOMMENDATIONS
${validation.recommendations.map(rec => `recommendation="${rec}"`).join('\n')}

@STATE
validation_complete=true
phase_approved=${validation.status === 'PASS' && validation.nextPhaseReady}
`;

    return report;
  }

  /**
   * Generate phase improvement suggestions
   */
  generateImprovementSuggestions(validation) {
    const suggestions = [];

    if (validation.completenessScore < 8) {
      suggestions.push({
        type: 'completeness',
        priority: 'high',
        description: 'Phase deliverables are incomplete',
        action: 'Review and complete missing items'
      });
    }

    if (validation.missingItems.length > 0) {
      suggestions.push({
        type: 'missing_deliverables',
        priority: 'critical',
        description: `Missing: ${validation.missingItems.join(', ')}`,
        action: 'Create missing files/features'
      });
    }

    if (!validation.nextPhaseReady) {
      suggestions.push({
        type: 'foundation',
        priority: 'critical',
        description: 'Phase foundation insufficient for next phase',
        action: 'Strengthen phase outputs before proceeding'
      });
    }

    return suggestions;
  }
}

export default PhaseValidationAgent;