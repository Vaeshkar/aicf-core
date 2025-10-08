/**
 * Enhanced Project Orchestrator
 * Integrates all the improvements to fix AIOB's structural issues
 */

import { ProjectOrchestrator } from './project-orchestrator.js';
import { EnhancedFileBuilder } from './enhanced-file-builder.js';
import { PRDAnalyzer } from './prd-analyzer.js';
import { TemplateHunter } from './template-hunter.js';
import fs from 'fs/promises';

export class EnhancedProjectOrchestrator extends ProjectOrchestrator {
  constructor(providers = []) {
    super(providers);
    this.fileBuilder = new EnhancedFileBuilder();
    this.prdAnalyzer = new PRDAnalyzer();
    this.templateHunter = new TemplateHunter();
    this.phaseResults = [];
    this.buildReport = {
      startTime: null,
      endTime: null,
      phases: [],
      issues: [],
      warnings: []
    };
  }

  /**
   * Enhanced project building with PRD analysis and improved coordination
   */
  async buildProject(prdPath) {
    this.buildReport.startTime = new Date().toISOString();
    console.log('🚀 Starting Enhanced AIOB Project Builder...');

    try {
      // Step 1: Load and analyze PRD
      const prd = await this.loadAndAnalyzePRD(prdPath);
      
      // Step 2: Pre-flight checks
      const preflightResult = await this.runPreflightChecks(prd);
      if (!preflightResult.passed) {
        throw new Error(`Pre-flight checks failed: ${preflightResult.issues.join(', ')}`);
      }

      // Step 2.5: Template Discovery (DISABLED - focusing on core agents)
      // const templates = await this.discoverTemplates(prd);
      prd.templates = []; // Skip template discovery for now

      // Step 3: Initialize orchestrator (already initialized in constructor)
      const orchestrator = this;

      // Step 4: Execute phases with enhanced coordination
      const buildResult = await this.executeEnhancedBuildPhases(prd, orchestrator);

      // Step 5: Post-build validation
      const validationResult = await this.validateBuild(buildResult);

      // Step 6: Generate final report
      const finalReport = this.generateFinalReport(buildResult, validationResult);

      this.buildReport.endTime = new Date().toISOString();
      console.log('\\n🎉 ENHANCED PROJECT BUILD COMPLETE!');
      
      return finalReport;

    } catch (error) {
      this.buildReport.endTime = new Date().toISOString();
      this.buildReport.issues.push({
        type: 'fatal',
        message: error.message,
        timestamp: new Date().toISOString()
      });
      
      console.error('❌ Enhanced project build failed:', error.message);
      throw error;
    }
  }

  /**
   * Load and analyze PRD with enhanced detection
   */
  async loadAndAnalyzePRD(prdPath) {
    console.log(`📋 Loading and analyzing PRD: ${prdPath}`);
    
    const prdContent = await fs.readFile(prdPath, 'utf8');
    const analysis = this.prdAnalyzer.analyzePRD(prdContent);
    
    console.log(`🔍 PRD Analysis Complete:`);
    console.log(`  Project Type: ${analysis.projectType.type} (${analysis.projectType.confidence} matches)`);
    console.log(`  Complexity: ${analysis.complexity.level}`);
    console.log(`  Estimated Files: ${analysis.complexity.estimatedFiles}`);
    console.log(`  Recommended Phases: ${analysis.phases.length}`);
    
    // Show warnings
    if (analysis.warnings.length > 0) {
      console.log(`\\n⚠️  Warnings:`);
      analysis.warnings.forEach(warning => {
        console.log(`  - ${warning.message} (${warning.severity})`);
      });
      this.buildReport.warnings.push(...analysis.warnings);
    }
    
    // Show tech stack detection
    console.log(`\\n🔧 Detected Tech Stack:`);
    Object.entries(analysis.techStack).forEach(([category, techs]) => {
      if (techs.length > 0) {
        console.log(`  ${category}: ${techs[0].name}`);
      }
    });
    
    return {
      content: prdContent,
      analysis,
      path: prdPath
    };
  }

  /**
   * Run pre-flight checks before building
   */
  async runPreflightChecks(prd) {
    console.log('\\n🛫 Running pre-flight checks...');
    
    const checks = {
      prdValid: prd.content.length > 100,
      techStackDetected: Object.values(prd.analysis.techStack).some(techs => techs.length > 0),
      projectTypeConfident: prd.analysis.projectType.confidence > 0,
      noHighSeverityWarnings: !prd.analysis.warnings.some(w => w.severity === 'high')
    };
    
    const issues = [];
    Object.entries(checks).forEach(([check, passed]) => {
      if (passed) {
        console.log(`✅ ${check}`);
      } else {
        console.log(`❌ ${check}`);
        issues.push(check);
      }
    });
    
    const allPassed = issues.length === 0;
    console.log(`\\n🔍 Pre-flight result: ${allPassed ? 'PASSED' : 'FAILED'}`);
    
    return { passed: allPassed, issues };
  }

  /**
   * Discover relevant templates for the project
   */
  async discoverTemplates(prd) {
    console.log('\n🎯 Discovering templates from AI ecosystem...');
    
    try {
      const templates = await this.templateHunter.discoverTemplates(prd.analysis);
      
      if (templates.length > 0) {
        console.log('\n📚 Found relevant templates:');
        templates.forEach(template => {
          console.log(`  • ${template.name} (${template.source}) - Score: ${template.qualityScore.toFixed(2)}`);
          console.log(`    ${template.description}`);
        });
        
        // Cache discovered templates for future use
        templates.forEach(template => this.templateHunter.cacheTemplate(template));
        
        return templates;
      } else {
        console.log('\n📭 No suitable templates found - proceeding with fresh build');
        return [];
      }
      
    } catch (error) {
      console.warn(`⚠️  Template discovery failed: ${error.message}`);
      console.log('📭 Proceeding with fresh build');
      return [];
    }
  }

  /**
   * Execute build phases with enhanced coordination
   */
  async executeEnhancedBuildPhases(prd, orchestrator) {
    const phases = prd.analysis.phases;
    console.log(`\\n📋 Build plan: ${phases.length} phases`);
    
    const results = {
      projectName: this.extractProjectName(prd.content),
      phases: [],
      totalFiles: 0,
      totalTokens: 0,
      duplicatesSkipped: 0
    };

    for (let i = 0; i < phases.length; i++) {
      const phase = phases[i];
      console.log(`\\n${'='.repeat(80)}`);
      console.log(`🔨 PHASE ${i + 1}: ${phase.name.toUpperCase()}`);
      console.log('='.repeat(80));

      try {
        // Enhanced phase execution with context sharing
        const phaseResult = await this.executePhaseWithContext(phase, i, phases, prd, orchestrator);
        
        // Enhanced file building with deduplication
        const fileResult = await this.buildPhaseFiles(phaseResult, results.projectName);
        
        // Track results
        const phaseReport = {
          phase: i + 1,
          name: phase.name,
          type: phase.type,
          ai: phaseResult.ai,
          filesCreated: fileResult.createdFiles.length,
          tokensUsed: phaseResult.tokens,
          duplicatesSkipped: fileResult.duplicatesSkipped,
          timestamp: new Date().toISOString()
        };
        
        results.phases.push(phaseReport);
        results.totalFiles += fileResult.createdFiles.length;
        results.totalTokens += phaseResult.tokens;
        results.duplicatesSkipped += fileResult.duplicatesSkipped;
        
        console.log(`✅ Phase ${i + 1} complete`);
        console.log(`📊 Files: ${fileResult.createdFiles.length}, Tokens: ${phaseResult.tokens}, Duplicates Skipped: ${fileResult.duplicatesSkipped}`);
        
      } catch (error) {
        console.error(`❌ Phase ${i + 1} failed:`, error.message);
        this.buildReport.issues.push({
          type: 'phase_error',
          phase: i + 1,
          message: error.message,
          timestamp: new Date().toISOString()
        });
        // Continue with next phase instead of failing completely
      }
    }

    return results;
  }

  /**
   * Execute phase with enhanced context sharing
   */
  async executePhaseWithContext(phase, phaseIndex, allPhases, prd, orchestrator) {
    // Build enhanced context
    const context = this.buildEnhancedContext(phase, phaseIndex, prd, this.phaseResults);
    
    // Select AI
    const selectedAI = orchestrator.selectBestAI(phase.requiredCapabilities);
    console.log(`🎯 Selected ${selectedAI.name} (score: ${this.calculateAIScore(selectedAI, phase.requiredCapabilities).toFixed(2)}) for capabilities: ${phase.requiredCapabilities.join(', ')}`);
    
    // Create enhanced prompt  
    const prompt = this.createEnhancedPhasePrompt(phase, context, prd);
    
    console.log(`🤖 ${selectedAI.name} working on ${phase.type}...`);
    
    // Execute with enhanced context
    const result = await selectedAI.sendMessage(context.contextString, prompt);
    
    const phaseResult = {
      phase: phaseIndex + 1,
      type: phase.type,
      ai: selectedAI.name,
      content: result.content,
      tokens: result.tokens || 0,
      timestamp: new Date().toISOString(),
      context
    };
    
    this.phaseResults.push(phaseResult);
    return phaseResult;
  }

  /**
   * Build enhanced context for each phase
   */
  buildEnhancedContext(currentPhase, phaseIndex, prd, previousResults) {
    const context = {
      projectType: prd.analysis.projectType.type,
      techStack: prd.analysis.techStack,
      structure: prd.analysis.recommendedStructure,
      currentPhase: {
        index: phaseIndex + 1,
        name: currentPhase.name,
        type: currentPhase.type
      },
      previousPhases: previousResults.map(result => ({
        phase: result.phase,
        type: result.type,
        ai: result.ai,
        filesCreated: this.extractFileCount(result.content)
      })),
      existingFiles: this.fileBuilder.createdFiles ? Array.from(this.fileBuilder.createdFiles.keys()) : [],
      contextString: ''
    };
    
    // Build context string
    context.contextString = this.buildContextString(context);
    
    return context;
  }

  /**
   * Create enhanced phase prompt with all context
   */
  createEnhancedPhasePrompt(phase, context, prd) {
    let prompt = `# AIOB Enhanced Phase ${context.currentPhase.index}: ${phase.name}\\n\\n`;
    
    // Project context
    prompt += `## Project Overview\\n`;
    prompt += `- **Type**: ${context.projectType}\\n`;
    prompt += `- **Structure**: ${context.structure.type}\\n`;
    prompt += `- **Your Role**: ${phase.type} specialist\\n\\n`;
    
    // Previous work
    if (context.previousPhases.length > 0) {
      prompt += `## Previous Work Completed\\n`;
      context.previousPhases.forEach(prev => {
        prompt += `- **Phase ${prev.phase} (${prev.ai})**: ${prev.type} - ${prev.filesCreated} files created\\n`;
      });
      prompt += `\\n`;
    }
    
    // Existing structure warning
    if (context.existingFiles.length > 0) {
      prompt += `## ⚠️  IMPORTANT: Existing Project Structure\\n`;
      prompt += `These files/directories already exist - DO NOT recreate them:\\n`;
      context.existingFiles.forEach(file => {
        prompt += `- ${file}\\n`;
      });
      prompt += `\\nBuild on the existing structure, don't duplicate it.\\n\\n`;
    }
    
    // Phase-specific instructions
    prompt += `## Your Specific Task\\n`;
    prompt += this.getPhaseInstructions(phase.type);
    
    // Tech stack context
    prompt += `\\n## Technology Requirements\\n`;
    Object.entries(context.techStack).forEach(([category, techs]) => {
      if (techs.length > 0) {
        prompt += `- **${category}**: ${techs[0].name}\\n`;
      }
    });
    
    // Template context
    if (prd.templates && prd.templates.length > 0) {
      prompt += `\\n## 🎯 Available Templates\\n`;
      prompt += `High-quality templates have been discovered that match this project:\\n`;
      prd.templates.forEach(template => {
        prompt += `- **${template.name}**: ${template.description} (Score: ${template.qualityScore.toFixed(2)})\\n`;
        if (template.tech) {
          prompt += `  Tech: ${template.tech.join(', ')}\\n`;
        }
      });
      prompt += `\\nConsider incorporating patterns and best practices from these templates.\\n`;
    }
    
    return prompt;
  }

  /**
   * Get phase-specific instructions
   */
  getPhaseInstructions(phaseType) {
    const instructions = {
      infrastructure: `
**Create the foundational project structure:**
- Set up package.json with ALL required dependencies
- Create proper directory structure (follow the recommended structure)
- Configure development environment
- NO incomplete files or TODOs - everything must be functional

**Output Format**: Use this exact syntax for each file:
CREATE_FILE: relative/path/to/file.ext
[complete file content - no placeholders or TODOs]
`,
      backend: `
**Build the complete backend API:**
- Create Express server with ALL required middleware
- Implement ALL CRUD endpoints (GET, POST, PATCH, DELETE)
- Add proper validation, error handling, and logging
- Ensure data persistence works correctly
- Test all endpoints return correct responses

**Output Format**: Use this exact syntax for each file:
CREATE_FILE: relative/path/to/file.ext  
[complete file content - all functions implemented]
`,
      frontend: `
**Create the complete user interface:**
- Build React components that connect to the backend
- Implement ALL user interactions (add, edit, delete, toggle)
- Style with Tailwind CSS for modern appearance
- Handle loading states, errors, and edge cases
- Make it responsive for mobile and desktop
- Components must actually fetch and display data

**Output Format**: Use this exact syntax for each file:
CREATE_FILE: relative/path/to/file.ext
[complete component code with all functionality]
`,
      qa: `
**Validate and enhance the application:**
- Test that all API endpoints work correctly
- Verify frontend connects to backend properly
- Fix any integration issues found
- Add any missing error handling
- Create test files if needed
- Provide clear setup instructions

**Output Format**: Use this exact syntax for any fixes:
CREATE_FILE: relative/path/to/file.ext
[corrected file content]
`
    };
    
    return instructions[phaseType] || `Complete the ${phaseType} phase with working, production-ready code.`;
  }

  /**
   * Build files with enhanced deduplication
   */
  async buildPhaseFiles(phaseResult, projectName) {
    console.log('🔍 Parsing AI response for file instructions...');
    
    const fileInstructions = this.fileBuilder.parseFileInstructions(phaseResult.content);
    
    if (fileInstructions.length === 0) {
      console.warn(`⚠️  No file instructions found in ${phaseResult.ai} response`);
      return { createdFiles: [], duplicatesSkipped: 0 };
    }
    
    const result = await this.fileBuilder.buildFiles(projectName, 'output', fileInstructions);
    
    return result;
  }

  /**
   * Validate the built project
   */
  async validateBuild(buildResult) {
    console.log('\\n🧪 Validating build...');
    
    const projectDir = `output/${buildResult.projectName}`;
    const validation = {
      passed: true,
      issues: [],
      checks: {
        filesCreated: buildResult.totalFiles > 0,
        noJsonErrors: true,
        packageJsonValid: true,
        serverFileExists: false,
        frontendExists: false
      }
    };
    
    try {
      // Check if package.json files are valid
      const packageFiles = this.fileBuilder.createdFiles ? 
        Array.from(this.fileBuilder.createdFiles.keys()).filter(f => f.endsWith('package.json')) : [];
      
      for (const packageFile of packageFiles) {
        try {
          const fullPath = `${projectDir}/${packageFile}`;
          const content = await fs.readFile(fullPath, 'utf8');
          JSON.parse(content);
          console.log(`✅ Valid JSON: ${packageFile}`);
        } catch (error) {
          validation.checks.packageJsonValid = false;
          validation.issues.push(`Invalid JSON in ${packageFile}: ${error.message}`);
          console.log(`❌ Invalid JSON: ${packageFile}`);
        }
      }
      
      // More validation checks would go here...
      
    } catch (error) {
      validation.passed = false;
      validation.issues.push(`Validation error: ${error.message}`);
    }
    
    validation.passed = validation.issues.length === 0;
    console.log(`\\n📊 Build validation: ${validation.passed ? 'PASSED' : 'FAILED'}`);
    
    return validation;
  }

  /**
   * Generate final comprehensive report
   */
  generateFinalReport(buildResult, validationResult) {
    const report = {
      projectName: buildResult.projectName,
      projectDir: `output/${buildResult.projectName}`,
      totalFiles: buildResult.totalFiles,
      totalTokens: buildResult.totalTokens,
      duplicatesSkipped: buildResult.duplicatesSkipped,
      phases: buildResult.phases,
      validation: validationResult,
      buildTime: this.calculateBuildTime(),
      issues: this.buildReport.issues,
      warnings: this.buildReport.warnings
    };

    // Show summary
    console.log(`📁 Project: ${report.projectName}`);
    console.log(`📂 Location: ${report.projectDir}`);
    console.log(`📄 Files: ${report.totalFiles} (${report.duplicatesSkipped} duplicates skipped)`);
    console.log(`🤖 Phases: ${report.phases.length}`);
    console.log(`📊 Tokens: ${report.totalTokens}`);
    console.log(`⏱️  Build Time: ${report.buildTime}`);
    
    if (report.issues.length > 0) {
      console.log(`\\n⚠️  Issues: ${report.issues.length}`);
      report.issues.forEach(issue => {
        console.log(`  - ${issue.message}`);
      });
    }
    
    return report;
  }

  // Helper methods
  calculateBuildTime() {
    if (!this.buildReport.startTime || !this.buildReport.endTime) return 'Unknown';
    const start = new Date(this.buildReport.startTime);
    const end = new Date(this.buildReport.endTime);
    const seconds = Math.round((end - start) / 1000);
    return `${seconds}s`;
  }

  extractFileCount(content) {
    const matches = content.match(/CREATE_FILE:/g);
    return matches ? matches.length : 0;
  }

  calculateAIScore(ai, requiredCapabilities) {
    const matches = requiredCapabilities.reduce((score, cap) => {
      return score + (ai.capabilities.includes(cap) ? 1 : 0);
    }, 0);
    return matches / requiredCapabilities.length;
  }

  buildContextString(context) {
    let str = `Enhanced AIOB Project Building\\n`;
    str += `Project: ${context.projectType} application\\n`;
    str += `Phase: ${context.currentPhase.index} - ${context.currentPhase.name}\\n`;
    return str;
  }

  extractProjectName(prdContent) {
    // Try multiple patterns to extract project name
    const patterns = [
      /\*\*Product Name\*\*[:\s]*([^\n\*]+)/i,
      /Product Name[:\s]*([^\n\*]+)/i,
      /Project Name[:\s]*([^\n\*]+)/i,
      /Name[:\s]*([^\n\*]+)/i,
      /#\s*([^\n#]+)\s*-\s*Product Requirements Document/i,
      /#\s*([^\n#]+)\s*PRD/i,
      /#\s*([^\n#]+)\s*App/i,
      /#\s*([^\n#]+)/i  // Fallback to first header
    ];
    
    for (const pattern of patterns) {
      const match = prdContent.match(pattern);
      if (match) {
        let name = match[1].trim();
        
        // Clean up the extracted name
        name = name.replace(/\*\*/g, ''); // Remove markdown bold
        name = name.replace(/[\[\]]/g, ''); // Remove brackets
        name = name.replace(/[^a-zA-Z0-9\s-]/g, ''); // Keep only safe characters
        name = name.replace(/\s+/g, '-'); // Replace spaces with hyphens
        name = name.toLowerCase(); // Convert to lowercase
        
        if (name.length > 3 && name.length < 50) {
          return name;
        }
      }
    }
    
    return 'aiob-project'; // Fallback
  }
}