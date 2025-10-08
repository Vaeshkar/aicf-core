/**
 * Error Analysis Agent
 * 
 * Specialized agent that analyzes validation results and generates specific, 
 * actionable fixes for the second iteration of the build process.
 */

export class ErrorAnalysisAgent {
  constructor() {
    this.name = 'Error Analysis Agent';
    this.role = 'error_analysis';
    this.systemPrompt = `You are an Error Analysis Agent specialized in diagnosing and fixing code issues.

YOUR RESPONSIBILITIES:
- Analyze validation errors from build results
- Generate specific, actionable fixes for each issue
- Create targeted solutions rather than full rebuilds
- Prioritize fixes by impact and difficulty
- Provide precise file modifications

YOU ALWAYS:
- Focus on the root cause of each error
- Provide minimal, targeted fixes
- Preserve existing working code
- Generate complete, working file contents
- Include specific line numbers when possible
- Test fixes logically before suggesting

ANALYSIS PRIORITIES:
1. CRITICAL: Missing essential files (prevents app from working)
2. HIGH: Syntax errors in core files (prevents build/runtime)
3. MEDIUM: Missing dependencies (can be auto-fixed)
4. LOW: JSX syntax warnings (expected in React projects)

FIX STRATEGIES:
- Structure issues: Create missing essential files
- Syntax errors: Fix specific syntax problems
- Import/export issues: Correct module references
- Package.json issues: Add missing dependencies
- Configuration issues: Fix config files

IMPORTANT: Generate COMPLETE, WORKING file contents, not just snippets or patches.`;
  }

  /**
   * Analyze validation results and generate fixes
   */
  analyzeAndFix(validation, previousBuildContext, projectDir) {
    const analysisPrompt = this.buildAnalysisPrompt(validation, previousBuildContext, projectDir);
    return analysisPrompt;
  }

  /**
   * Build comprehensive analysis prompt
   */
  buildAnalysisPrompt(validation, buildContext, projectDir) {
    let prompt = `${this.systemPrompt}\n\n`;
    
    prompt += '═'.repeat(60) + '\n';
    prompt += 'VALIDATION RESULTS TO ANALYZE:\n';
    prompt += '═'.repeat(60) + '\n\n';

    // File Structure Issues
    if (!validation.results.structure.pass) {
      prompt += `🔴 CRITICAL: File Structure Issues\n`;
      const missing = validation.results.structure.missing || [];
      prompt += `Missing files: ${missing.join(', ')}\n`;
      prompt += `Required files not found: ${missing.length}\n\n`;
    }

    // Syntax Issues  
    if (!validation.results.syntax.pass) {
      prompt += `🟡 SYNTAX ERRORS FOUND:\n`;
      validation.results.syntax.errors.forEach(error => {
        if (error.type !== 'JSX') { // Skip JSX warnings
          prompt += `- File: ${error.file}\n`;
          prompt += `- Error: ${error.error}\n`;
          prompt += `- Type: ${error.type}\n\n`;
        }
      });
    }

    // Dependency Issues
    if (!validation.results.dependencies.pass) {
      prompt += `🔶 DEPENDENCY ISSUES:\n`;
      const missing = validation.results.dependencies.missing || [];
      prompt += `Missing packages: ${missing.join(', ')}\n\n`;
    }

    // Runtime Issues
    if (!validation.results.runtime.pass) {
      prompt += `🔴 RUNTIME ISSUES:\n`;
      prompt += `Error: ${validation.results.runtime.error}\n\n`;
    }

    // Build Context
    if (buildContext && buildContext.phases) {
      prompt += '═'.repeat(60) + '\n';
      prompt += 'PREVIOUS BUILD CONTEXT:\n';
      prompt += '═'.repeat(60) + '\n\n';

      buildContext.phases.forEach((phase, i) => {
        prompt += `Phase ${i + 1}: ${phase.phase}\n`;
        prompt += `Agent: ${phase.agent}\n`;
        prompt += `Files created: ${phase.filesCreated.join(', ')}\n`;
        prompt += `Summary: ${phase.summary}\n\n`;
      });
    }

    // Analysis Task
    prompt += '═'.repeat(60) + '\n';
    prompt += 'YOUR ANALYSIS TASK:\n';
    prompt += '═'.repeat(60) + '\n\n';

    prompt += `Quality Score: ${validation.qualityScore}/100\n`;
    prompt += `Critical Issues: ${validation.criticalIssues}\n\n`;

    prompt += `Analyze the above issues and provide specific fixes. For each fix:\n\n`;

    prompt += `1. IDENTIFY the root cause\n`;
    prompt += `2. PRIORITIZE by impact (Critical/High/Medium/Low)\n`;
    prompt += `3. PROVIDE complete file content for fixes\n`;
    prompt += `4. EXPLAIN why this fix resolves the issue\n\n`;

    prompt += `Focus on the highest impact fixes first. Generate complete, working files using this format:\n\n`;

    prompt += `\`\`\`javascript path=filename.js\n`;
    prompt += `// Complete file content here\n`;
    prompt += `\`\`\`\n\n`;

    prompt += `CRITICAL: Only fix actual problems. Do not fix JSX syntax "errors" - they are expected in React projects.\n\n`;

    prompt += `BEGIN YOUR ANALYSIS AND FIXES:\n`;

    return prompt;
  }

  /**
   * Generate fix priority based on error type and severity
   */
  getFixPriority(errorType, severity) {
    const priorities = {
      'structure': 'CRITICAL',
      'syntax': severity === 'high' ? 'HIGH' : 'MEDIUM', 
      'dependencies': 'MEDIUM',
      'runtime': 'HIGH'
    };

    return priorities[errorType] || 'LOW';
  }

  /**
   * Extract fixes from AI response
   */
  parseFixResponse(response) {
    const fixes = [];
    
    // Look for code blocks with file paths
    const codeBlockRegex = /```(\w+)?\s+path=([^\n\s]+)\s*\n([\s\S]*?)```/g;
    let match;
    
    while ((match = codeBlockRegex.exec(response)) !== null) {
      const [fullMatch, language, filePath, content] = match;
      
      if (filePath && content.trim()) {
        fixes.push({
          file: filePath.trim(),
          content: content.trim(),
          language: language || 'text',
          type: 'file_fix'
        });
      }
    }

    // Look for priority indicators in the response
    const priorityRegex = /(?:CRITICAL|HIGH|MEDIUM|LOW):\s*([^\n]+)/g;
    const priorities = [];
    while ((match = priorityRegex.exec(response)) !== null) {
      priorities.push(match[0]);
    }

    return {
      fixes,
      priorities,
      analysis: response
    };
  }
}

export default ErrorAnalysisAgent;