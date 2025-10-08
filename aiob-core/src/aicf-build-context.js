/**
 * AICF Build Context Manager
 * 
 * Manages .aicf files for build memory, task tracking, and iterative improvements.
 * This creates institutional memory for AI agents to learn and improve across builds.
 */

import fs from 'fs-extra';
import path from 'path';

export class AICFBuildContext {
  constructor(projectDir, projectName) {
    this.projectDir = projectDir;
    this.projectName = projectName;
    this.aicfDir = path.join(projectDir, '.aicf');
    this.buildContext = {
      project: projectName,
      startTime: new Date().toISOString(),
      phases: [],
      decisions: [],
      issues: [],
      suggestions: []
    };
  }

  /**
   * Initialize AICF directory and context
   */
  async initialize() {
    await fs.ensureDir(this.aicfDir);
    
    // Create initial build log
    await this.writeAICF('build-context.aicf', `@CONVERSATION:${this.projectName}_build
timestamp_start=${this.buildContext.startTime}
project=${this.projectName}

@FLOW
initialization|ready_for_build

@STATE
status=initialized
phase=0
quality_score=0
`);
  }

  /**
   * Record a completed phase
   */
  async recordPhase(phaseResult) {
    const phaseRecord = {
      phase: phaseResult.phase,
      agent: phaseResult.agent,
      timestamp: phaseResult.timestamp,
      filesCreated: phaseResult.filesCreated,
      summary: phaseResult.summary,
      keyDecisions: phaseResult.keyDecisions
    };

    this.buildContext.phases.push(phaseRecord);

    // Update build context
    await this.appendToAICF('build-context.aicf', `
phase_${this.buildContext.phases.length}_completed=${phaseResult.timestamp}
agent=${phaseResult.agent}
files_created=${phaseResult.filesCreated.length}
`);

    // Create phase-specific log
    const phaseAICF = `@CONVERSATION:${this.projectName}_phase_${this.buildContext.phases.length}
timestamp=${phaseResult.timestamp}
agent=${phaseResult.agent}
phase=${phaseResult.phase}

@TASK
description="${phaseResult.task}"
status=completed

@OUTPUT
files_created=${phaseResult.filesCreated.join(', ')}
summary="${phaseResult.summary}"

@DECISIONS
${phaseResult.keyDecisions}

@STATE
phase_complete=true
`;

    await this.writeAICF(`phase-${this.buildContext.phases.length}.aicf`, phaseAICF);
  }

  /**
   * Record validation results and generate suggestions
   */
  async recordValidation(validation) {
    const issues = [];
    const suggestions = [];

    // Analyze validation results
    if (validation.results && validation.results.structure && !validation.results.structure.pass) {
      const missing = validation.results.structure.missing || [];
      issues.push({
        type: 'structure',
        severity: 'critical',
        description: `Missing files: ${missing.join(', ')}`,
        files: missing
      });

      suggestions.push({
        type: 'structure',
        action: 'create_missing_files',
        description: 'Create missing essential files',
        files: missing,
        priority: 'high'
      });
    }

    if (validation.results && validation.results.syntax && !validation.results.syntax.pass) {
      const syntaxErrors = validation.results.syntax.errors || [];
      syntaxErrors.forEach(error => {
        issues.push({
          type: 'syntax',
          severity: error.type === 'JSX' ? 'low' : 'medium',
          description: error.error,
          file: error.file
        });

        if (error.type !== 'JSX') {
          suggestions.push({
            type: 'syntax',
            action: 'fix_syntax_error',
            file: error.file,
            description: `Fix syntax error: ${error.error}`,
            priority: 'medium'
          });
        }
      });
    }

    if (validation.results && validation.results.dependencies && !validation.results.dependencies.pass) {
      const missingDeps = validation.results.dependencies.missing || [];
      issues.push({
        type: 'dependencies',
        severity: 'medium',
        description: `Missing dependencies: ${missingDeps.join(', ')}`,
        missing: missingDeps
      });

      suggestions.push({
        type: 'dependencies',
        action: 'add_dependencies',
        description: 'Add missing dependencies to package.json',
        packages: missingDeps,
        priority: 'medium'
      });
    }

    // Store issues and suggestions
    this.buildContext.issues = issues;
    this.buildContext.suggestions = suggestions;

    // Create errors.aicf
    const errorsAICF = `@CONVERSATION:${this.projectName}_errors
timestamp=${new Date().toISOString()}
quality_score=${validation.qualityScore}
critical_issues=${validation.criticalIssues}

@ISSUES
${issues.map(issue => `
type=${issue.type}
severity=${issue.severity}
description="${issue.description}"
${issue.file ? `file=${issue.file}` : ''}
${issue.files ? `files=${issue.files.join(', ')}` : ''}
${issue.missing ? `missing=${issue.missing.join(', ')}` : ''}
`).join('')}

@STATE
validation_complete=true
needs_fixes=${!validation.success}
`;

    await this.writeAICF('errors.aicf', errorsAICF);

    // Create suggestions.aicf
    const suggestionsAICF = `@CONVERSATION:${this.projectName}_suggestions
timestamp=${new Date().toISOString()}

@SUGGESTIONS
${suggestions.map(suggestion => `
type=${suggestion.type}
action=${suggestion.action}
priority=${suggestion.priority}
description="${suggestion.description}"
${suggestion.file ? `file=${suggestion.file}` : ''}
${suggestion.files ? `files=${suggestion.files.join(', ')}` : ''}
${suggestion.packages ? `packages=${suggestion.packages.join(', ')}` : ''}
`).join('')}

@RECOMMENDATIONS
${this.generateRecommendations(issues, suggestions)}

@STATE
suggestions_ready=true
`;

    await this.writeAICF('suggestions.aicf', suggestionsAICF);
  }

  /**
   * Generate improvement recommendations
   */
  generateRecommendations(issues, suggestions) {
    const recommendations = [];

    // Prioritize suggestions
    const highPriority = suggestions.filter(s => s.priority === 'high');
    const mediumPriority = suggestions.filter(s => s.priority === 'medium');

    if (highPriority.length > 0) {
      recommendations.push('IMMEDIATE_ACTIONS_NEEDED');
      recommendations.push(...highPriority.map(s => `- ${s.description}`));
    }

    if (mediumPriority.length > 0) {
      recommendations.push('IMPROVEMENTS_RECOMMENDED');  
      recommendations.push(...mediumPriority.map(s => `- ${s.description}`));
    }

    // Add general recommendations
    if (issues.some(i => i.type === 'structure')) {
      recommendations.push('- Ensure all agents create required files');
    }

    if (issues.some(i => i.type === 'syntax' && i.severity !== 'low')) {
      recommendations.push('- Review agent output for syntax completeness');
    }

    return recommendations.join('\n');
  }

  /**
   * Check if previous build context exists
   */
  async hasPreviousBuild() {
    return await fs.pathExists(path.join(this.aicfDir, 'suggestions.aicf'));
  }

  /**
   * Load previous build suggestions for iteration
   */
  async loadPreviousSuggestions() {
    const suggestionsPath = path.join(this.aicfDir, 'suggestions.aicf');
    
    if (!await fs.pathExists(suggestionsPath)) {
      return null;
    }

    const content = await fs.readFile(suggestionsPath, 'utf8');
    
    // Parse AICF content
    const suggestions = [];
    const lines = content.split('\n');
    let currentSuggestion = {};
    
    for (const line of lines) {
      if (line.startsWith('type=')) {
        if (Object.keys(currentSuggestion).length > 0) {
          suggestions.push(currentSuggestion);
        }
        currentSuggestion = { type: line.split('=')[1] };
      } else if (line.includes('=')) {
        const [key, value] = line.split('=');
        currentSuggestion[key] = value.replace(/"/g, '');
      }
    }
    
    if (Object.keys(currentSuggestion).length > 0) {
      suggestions.push(currentSuggestion);
    }

    return suggestions;
  }

  /**
   * Create final build summary with AICF context
   */
  async createBuildSummary(buildResult) {
    const summaryAICF = `@CONVERSATION:${this.projectName}_summary
timestamp=${new Date().toISOString()}
duration=${this.calculateBuildDuration()}

@RESULTS
success=${buildResult.success}
quality_score=${buildResult.summary.qualityScore}
critical_issues=${buildResult.summary.criticalIssues}
phases_completed=${buildResult.summary.totalPhases}
files_created=${buildResult.summary.totalFiles}
dependencies_fixed=${buildResult.summary.dependenciesFixed}

@METRICS
file_structure=${buildResult.validation.results.structure.pass}
syntax_validation=${buildResult.validation.results.syntax.pass}  
dependencies_check=${buildResult.validation.results.dependencies.pass}
runtime_test=${buildResult.validation.results.runtime.pass}

@NEXT_STEPS
${buildResult.success ? 
  'ready_for_deployment' : 
  'requires_iteration|check_suggestions.aicf'}

@STATE
build_complete=true
requires_fixes=${!buildResult.success}
`;

    await this.writeAICF('build-summary.aicf', summaryAICF);
  }

  /**
   * Write AICF file
   */
  async writeAICF(filename, content) {
    await fs.writeFile(path.join(this.aicfDir, filename), content.trim());
  }

  /**
   * Append to AICF file
   */
  async appendToAICF(filename, content) {
    await fs.appendFile(path.join(this.aicfDir, filename), content);
  }

  /**
   * Calculate build duration
   */
  calculateBuildDuration() {
    const start = new Date(this.buildContext.startTime);
    const end = new Date();
    return Math.round((end - start) / 1000);
  }

  /**
   * Get build context for AI agents
   */
  getBuildContext() {
    return this.buildContext;
  }
}

export default AICFBuildContext;