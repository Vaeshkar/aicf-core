/**
 * Enhanced Project Orchestrator v3
 * 
 * This orchestrator uses specialized AI agents with proper context sharing
 * and file persistence across phases. Based on the refactor plan from
 * aiob_refactor_plan_incomplete.md
 */

import { FrontendDeveloper, BackendDeveloper, IntegrationSpecialist, QAEngineer } from './agents/specialized-agents.js';
import { AppValidator } from './validators/app-validator.js';
import { FileBuilder } from './file-builder.js';
import { DependencyFixer } from './utils/dependency-fixer.js';
import { AICFBuildContext } from './aicf-build-context.js';
import { ErrorAnalysisAgent } from './agents/error-analysis-agent.js';
import { PhaseValidationAgent } from './agents/phase-validation-agent.js';
import { IntelligentFileManager } from './utils/intelligent-file-manager.js';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

export class ProjectOrchestrator {
  constructor(providers) {
    this.providers = providers;
    this.createdFiles = new Set();
    this.projectStructure = {};
    this.phaseHistory = [];
    this.fileBuilder = new FileBuilder();
    this.dependencyFixer = new DependencyFixer();
    this.errorAnalysisAgent = new ErrorAnalysisAgent();
    this.phaseValidationAgent = new PhaseValidationAgent();
    this.intelligentFileManager = new IntelligentFileManager();
    this.aicfContext = null;
    this.projectName = null;
    this.projectDir = null;
    this.initialized = false;
  }

  /**
   * Initialize all AI providers
   */
  async initialize() {
    if (this.initialized) return;
    
    console.log('🔧 Initializing AI providers...');
    
    for (const provider of this.providers) {
      await provider.initialize();
    }
    
    const availableProviders = this.providers.filter(p => p.isAvailable);
    console.log(`✅ ${availableProviders.length}/${this.providers.length} providers available`);
    
    if (availableProviders.length === 0) {
      throw new Error('No AI providers are available. Please check your API keys.');
    }
    
    this.initialized = true;
  }

  /**
   * Main entry point - Build project from PRD
   */
  async buildFromPRD(prdPath, outputDir = './output') {
    console.log('🏗️  ENHANCED AIOB PROJECT BUILD');
    console.log('═'.repeat(80));
    
    // Initialize providers first
    await this.initialize();
    
    // Load PRD
    const prd = await this.loadPRD(prdPath);
    
    // Initialize AICF build context
    this.aicfContext = new AICFBuildContext(this.projectDir, this.projectName);
    await this.aicfContext.initialize();
    
    console.log(`PRD: ${path.basename(prdPath)}`);
    console.log(`Project: ${this.projectName}`);
    console.log(`Output: ${this.projectDir}`);
    console.log('═'.repeat(80) + '\n');

    // Define our specialized team
    const team = [
      {
        name: 'Infrastructure Setup',
        agent: new BackendDeveloper(),
        task: 'Create COMPLETE project structure with comprehensive package.json including ALL dependencies (frontend AND backend), directory structure, and configuration files. This is the foundation - make it comprehensive and correct.'
      },
      {
        name: 'Backend Development',
        agent: new BackendDeveloper(),
        task: 'Build the Express server, implement all API routes, add middleware for CORS/validation/errors, and create data models. Ensure APIs work correctly.'
      },
      {
        name: 'Frontend Development',
        agent: new FrontendDeveloper(),
        task: 'Create React components, implement the user interface with Tailwind CSS, add proper state management, and prepare for backend integration.'
      },
      {
        name: 'Integration',
        agent: new IntegrationSpecialist(),
        task: 'Connect frontend to backend APIs, add error handling and loading states, ensure CORS works, and test complete user flows end-to-end.'
      },
      {
        name: 'Quality Assurance',
        agent: new QAEngineer(),
        task: 'Review all code for quality and completeness, verify functionality works as specified in PRD, and create comprehensive QA report.'
      }
    ];

    console.log(`👥 Team: ${team.length} specialized agents\n`);

    // Execute each phase with proper context sharing
    for (let i = 0; i < team.length; i++) {
      const phase = team[i];
      
      console.log('═'.repeat(60));
      console.log(`PHASE ${i + 1}/${team.length}: ${phase.name.toUpperCase()}`);
      console.log(`Agent: ${phase.agent.name}`);
      console.log('═'.repeat(60));
      console.log(`Task: ${phase.task}`);
      console.log();

      try {
        const result = await this.executePhase(phase, this.phaseHistory, prd);
        this.phaseHistory.push(result);

        // Record phase in AICF context
        await this.aicfContext.recordPhase(result);

        // Validate phase completion
        const phaseValidation = await this.validatePhaseCompletion(result, prd, i);
        
        // Verify files were created and persist
        await this.verifyPhaseFiles(result);

        console.log(`✓ Phase ${i + 1} complete`);
        console.log(`Files created this phase: ${result.filesCreated.length}`);
        console.log(`Total files in project: ${this.createdFiles.size}`);
        console.log();
        
      } catch (error) {
        console.error(`❌ Phase ${i + 1} failed:`, error.message);
        throw error;
      }
    }

    // Auto-fix dependencies before validation
    console.log('═'.repeat(60));
    console.log('DEPENDENCY AUTO-FIX');
    console.log('═'.repeat(60));
    
    const dependencyFix = await this.dependencyFixer.fixProjectDependencies(this.projectDir);
    
    // Final validation using the real validator
    console.log('═'.repeat(60));
    console.log('FINAL VALIDATION');
    console.log('═'.repeat(60));

    const validator = new AppValidator();
    const validation = await validator.validate(this.projectDir);

    // Record validation results in AICF context
    await this.aicfContext.recordValidation(validation);

    // Start the debug iteration loop until 100% quality!
    const perfectValidation = await this.performDebugIteration(validation, validator);
    validation.success = perfectValidation.success;
    validation.qualityScore = perfectValidation.qualityScore;
    validation.criticalIssues = perfectValidation.criticalIssues;
    validation.results = perfectValidation.results;

    // Generate comprehensive build summary
    await this.generateBuildSummary(validation);
    
    // Create final AICF build summary
    const finalResult = {
      success: validation.success,
      projectName: this.projectName,
      projectDir: this.projectDir,
      phases: this.phaseHistory,
      filesCreated: Array.from(this.createdFiles),
      validation,
      dependencyFix,
      summary: {
        totalPhases: this.phaseHistory.length,
        totalFiles: this.createdFiles.size,
        qualityScore: validation.qualityScore,
        criticalIssues: validation.criticalIssues,
        dependenciesFixed: dependencyFix.fixed,
        dependenciesAdded: dependencyFix.added?.length || 0
      }
    };
    
    await this.aicfContext.createBuildSummary(finalResult);

    return {
      success: validation.success,
      projectName: this.projectName,
      projectDir: this.projectDir,
      phases: this.phaseHistory,
      filesCreated: Array.from(this.createdFiles),
      validation,
      dependencyFix,
      summary: {
        totalPhases: this.phaseHistory.length,
        totalFiles: this.createdFiles.size,
        qualityScore: validation.qualityScore,
        criticalIssues: validation.criticalIssues,
        dependenciesFixed: dependencyFix.fixed,
        dependenciesAdded: dependencyFix.added?.length || 0
      }
    };
  }

  /**
   * Load and parse PRD
   */
  async loadPRD(prdPath) {
    try {
      const content = await fs.readFile(prdPath, 'utf8');
      
      // Extract project name from PRD title
      const titleMatch = content.match(/^#\s*(.+?)(?:\s+PRD)?$/m);
      if (titleMatch) {
        this.projectName = titleMatch[1]
          .trim()
          .replace(/[^a-zA-Z0-9\-\s]/g, '')
          .replace(/\s+/g, '-')
          .toLowerCase()
          .substring(0, 50);
      } else {
        this.projectName = 'aiob-project';
      }
      
      // Set up project directory
      this.projectDir = path.join('./output', this.projectName);
      
      // Ensure output directory exists
      await fs.ensureDir(this.projectDir);
      
      return content;
    } catch (error) {
      throw new Error(`Failed to load PRD: ${error.message}`);
    }
  }

  /**
   * Execute a single phase with full context
   */
  async executePhase(phase, previousPhases, prd) {
    // Build comprehensive context prompt
    const contextPrompt = this.buildPhaseContext(phase, previousPhases, prd);
    
    // Select appropriate AI provider for this agent with cost optimization
    const provider = this.selectProvider(phase.agent.role, phase.name);
    
    console.log(`🤖 Executing with ${provider.name}...`);
    
    // Execute with AI
    const aiResponse = await provider.sendMessage([], contextPrompt);
    
    console.log(`📝 Processing AI response...`);
    
    // Parse AI response to extract files
    const files = this.parseAIResponse(aiResponse.content);
    
    console.log(`📁 Found ${files.length} files to create`);
    
    // Write files using intelligent file manager
    const fileOperations = await this.intelligentFileManager.executeSmartFileOperations(files, this.projectDir);
    
    // Track created/updated files for future phases
    const createdFiles = [];
    fileOperations.results.forEach(result => {
      if (result.action === 'created' || result.action === 'updated') {
        // result.path is now an absolute path from IntelligentFileManager
        const fullPath = result.path;
        createdFiles.push(fullPath);
        this.createdFiles.add(fullPath);
        // Show relative path for console display
        const displayPath = path.relative(this.projectDir, fullPath);
        console.log(`  ${result.action === 'created' ? '✓' : '🔄'} ${displayPath}`);
      } else if (result.action === 'skipped') {
        const displayPath = path.relative(this.projectDir, result.path);
        console.log(`  ⏭️  ${displayPath} (${result.reason})`);
      }
    });
    
    console.log(`\n📊 FILE OPERATIONS: ${fileOperations.operations.created} created, ${fileOperations.operations.updated} updated, ${fileOperations.operations.skipped} skipped`);
    if (fileOperations.summary.tokensSaved > 0) {
      console.log(`💰 Tokens saved: ~${fileOperations.summary.tokensSaved}`);
    }

    return {
      phase: phase.name,
      agent: phase.agent.name,
      task: phase.task,
      filesCreated: createdFiles.map(f => path.relative(this.projectDir, f)),
      filesCreatedAbsolute: createdFiles, // Keep absolute paths for verification
      aiResponse: aiResponse.content,
      summary: this.extractSummary(aiResponse.content),
      keyDecisions: this.extractKeyDecisions(aiResponse.content),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Build comprehensive context for each phase
   */
  buildPhaseContext(phase, previousPhases, prd) {
    let context = `${phase.agent.systemPrompt}\n\n`;
    
    context += '═'.repeat(60) + '\n';
    context += 'PRODUCT REQUIREMENTS DOCUMENT:\n';
    context += '═'.repeat(60) + '\n\n';
    context += `${prd}\n\n`;

    if (previousPhases.length > 0) {
      context += '═'.repeat(60) + '\n';
      context += 'WORK COMPLETED BY PREVIOUS DEVELOPERS:\n';
      context += '═'.repeat(60) + '\n\n';
      
      previousPhases.forEach((prevPhase, i) => {
        context += `Developer ${i + 1}: ${prevPhase.agent}\n`;
        context += `Phase: ${prevPhase.phase}\n`;
        context += `Completed: ${new Date(prevPhase.timestamp).toLocaleString()}\n\n`;
        
        context += 'Files Created:\n';
        prevPhase.filesCreated.forEach(file => {
          context += `  ✓ ${file}\n`;
        });
        context += '\n';
        
        if (prevPhase.summary) {
          context += `Summary:\n${prevPhase.summary}\n\n`;
        }
        
        if (prevPhase.keyDecisions) {
          context += `Key Decisions:\n${prevPhase.keyDecisions}\n\n`;
        }
        
        context += '─'.repeat(50) + '\n\n';
      });
    }

    context += '═'.repeat(60) + '\n';
    context += 'FILES THAT ALREADY EXIST IN PROJECT:\n';
    context += '═'.repeat(60) + '\n\n';
    
    if (this.createdFiles.size > 0) {
      Array.from(this.createdFiles).forEach(file => {
        context += `✓ ${path.relative(this.projectDir, file)}\n`;
      });
    } else {
      context += 'No files yet - you are the first phase\n';
    }
    
    context += '\n';
    context += '═'.repeat(60) + '\n';
    context += 'YOUR CURRENT TASK:\n';
    context += '═'.repeat(60) + '\n\n';
    context += `${phase.task}\n\n`;

    context += 'CRITICAL INSTRUCTIONS:\n';
    context += '1. Build on existing files - don\'t recreate them unless necessary\n';
    context += '2. Your code must integrate with previous developers\' work\n';
    context += '3. Reference and use files created by previous phases\n';
    context += '4. Only create NEW files you need for your specific task\n';
    context += '5. If updating existing files, create new versions or additions\n';
    context += '6. Use the exact file format shown in examples\n\n';

    context += 'FILE FORMAT:\n';
    context += 'Use this exact format for each file you create:\n\n';
    context += '```language path=relative/file/path\n';
    context += 'file content here\n';
    context += '```\n\n';

    context += 'BEGIN YOUR WORK NOW:\n';

    return context;
  }

  /**
   * Select best AI provider and model for the specific task (cost-optimized)
   */
  selectProvider(role, phaseName = '') {
    // Task-specific model optimization for maximum cost savings
    const taskModelMap = {
      'infrastructure': 'qwen/qwen-2.5-72b-instruct',      // 75% cheaper - structured tasks
      'backend': 'meta-llama/llama-3.1-405b-instruct',     // 33% cheaper - code generation
      'frontend': 'meta-llama/llama-3.1-405b-instruct',    // 33% cheaper - React/JSX
      'integration': 'anthropic/claude-3.5-sonnet',        // Keep quality for complex reasoning
      'qa': 'anthropic/claude-3.5-sonnet',                 // Keep quality for analysis
      'error_analysis': 'qwen/qwen-2.5-72b-instruct',     // 75% cheaper - pattern matching
      'validation': 'qwen/qwen-2.5-72b-instruct'          // 75% cheaper - structured validation
    };
    
    // Determine task type from phase name
    let taskType = role;
    if (phaseName.toLowerCase().includes('infrastructure')) taskType = 'infrastructure';
    else if (phaseName.toLowerCase().includes('backend')) taskType = 'backend';
    else if (phaseName.toLowerCase().includes('frontend')) taskType = 'frontend';
    else if (phaseName.toLowerCase().includes('integration')) taskType = 'integration';
    else if (phaseName.toLowerCase().includes('qa') || phaseName.toLowerCase().includes('quality')) taskType = 'qa';
    
    // ALWAYS prefer OpenRouter first (has all the cost-optimized models)
    const openrouter = this.providers.find(p => p.name.toLowerCase() === 'openrouter' && p.isAvailable);
    if (openrouter) {
      // Set the optimal model for this task
      const optimalModel = taskModelMap[taskType] || 'qwen/qwen-2.5-72b-instruct';
      openrouter.preferredModel = optimalModel;
      console.log(`🎯 Cost-optimized: Using ${optimalModel} for ${taskType} task`);
      return openrouter;
    }
    
    // Fallback to other providers if OpenRouter unavailable
    if (role === 'qa' || role === 'integration') {
      return this.providers.find(p => p.name.toLowerCase() === 'claude' && p.isAvailable) || 
             this.providers.find(p => p.isAvailable) ||
             this.providers[0];
    }
    
    return this.providers.find(p => p.name.toLowerCase() === 'claude' && p.isAvailable) ||
           this.providers.find(p => p.name.toLowerCase() === 'gpt' && p.isAvailable) || 
           this.providers.find(p => p.isAvailable) ||
           this.providers[0];
  }

  /**
   * Parse AI response to extract files
   */
  parseAIResponse(response) {
    const files = [];
    
    // Look for code blocks with file paths - try different formats
    const codeBlockPatterns = [
      // Standard format: ```lang path=file
      /```(\w+)?\s+path=([^\n\s]+)\s*\n([\s\S]*?)```/g,
      // Alternative format: ```lang:file
      /```(\w+)?:([^\n\s]+)\s*\n([\s\S]*?)```/g,
      // Simple format with filename comment
      /```(\w+)?\s*\n\/\/\s*([^\n]+)\n([\s\S]*?)```/g
    ];
    
    for (const pattern of codeBlockPatterns) {
      let match;
      while ((match = pattern.exec(response)) !== null) {
        const [fullMatch, language, filePath, content] = match;
        
        if (filePath && content && content.trim()) {
          // Clean up file path
          const cleanPath = filePath.trim().replace(/^['"`]|['"`]$/g, '');
          
          // Skip if we already have this file
          if (files.some(f => f.path === cleanPath)) {
            continue;
          }
          
          // Validate content is not just a comment or snippet
          const cleanContent = content.trim();
          if (cleanContent.length > 10 && !cleanContent.startsWith('// Add this')) {
            files.push({
              path: cleanPath,
              content: cleanContent,
              language: language || this.inferLanguage(cleanPath)
            });
          }
        }
      }
      
      // Reset regex for next pattern
      pattern.lastIndex = 0;
    }
    
    return files;
  }
  
  /**
   * Infer file language from extension
   */
  inferLanguage(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const langMap = {
      '.js': 'javascript',
      '.jsx': 'jsx',
      '.ts': 'typescript',
      '.tsx': 'tsx',
      '.json': 'json',
      '.html': 'html',
      '.css': 'css',
      '.md': 'markdown'
    };
    return langMap[ext] || 'text';
  }


  /**
   * Verify that phase files were created and still exist
   */
  async verifyPhaseFiles(phaseResult) {
    const missing = [];
    
    // Use absolute paths if available, otherwise convert relative paths
    const filesToCheck = phaseResult.filesCreatedAbsolute || 
                        phaseResult.filesCreated.map(f => path.join(this.projectDir, f));
    
    for (const fullPath of filesToCheck) {
      const exists = await fs.pathExists(fullPath);
      
      if (!exists) {
        const relativePath = path.relative(this.projectDir, fullPath);
        missing.push(relativePath);
      }
    }

    if (missing.length > 0) {
      throw new Error(
        `Phase "${phaseResult.phase}" files missing after creation: ${missing.join(', ')}`
      );
    }
  }

  /**
   * Extract summary from AI response
   */
  extractSummary(response) {
    const lines = response.split('\n');
    const summaryLines = lines.filter(line => 
      line.toLowerCase().includes('summary') || 
      line.toLowerCase().includes('completed') ||
      line.toLowerCase().includes('created')
    );
    
    return summaryLines.slice(0, 3).join(' ').trim() || 'Phase completed successfully';
  }

  /**
   * Extract key decisions from AI response
   */
  extractKeyDecisions(response) {
    const decisions = [];
    
    // Look for decision indicators
    const decisionPatterns = [
      /(?:decided|chose|selected|implemented|used)\s+(.+?)(?:\.|$)/gi,
      /(?:architecture|framework|approach):\s*(.+?)(?:\.|$)/gi
    ];
    
    for (const pattern of decisionPatterns) {
      let match;
      while ((match = pattern.exec(response)) !== null) {
        if (match[1] && match[1].length < 100) {
          decisions.push(match[1].trim());
        }
      }
    }
    
    return decisions.slice(0, 3).join('; ') || 'Standard implementation decisions';
  }

  /**
   * Perform debug iterations until 100% quality achieved!
   * "Gotta catch 'em all" - keep debugging until perfection!
   */
  async performDebugIteration(initialValidation, validator) {
    let currentValidation = initialValidation;
    let iteration = 0;
    const maxIterations = 5; // Safety limit
    const targetQuality = 100;
    const improvementThreshold = 5; // Must improve by at least 5 points per iteration
    
    console.log('═'.repeat(80));
    console.log('🎯 STARTING DEBUG ITERATION LOOP - TARGET: 100% QUALITY!');
    console.log(`📊 Initial Quality Score: ${currentValidation.qualityScore}/100`);
    console.log(`❌ Critical Issues: ${currentValidation.criticalIssues}`);
    console.log('═'.repeat(80));
    
    // Track iterations in AICF
    await this.aicfContext.writeAICF('debug-iterations.aicf', `@CONVERSATION:${this.projectName}_debug_loop
timestamp_start=${new Date().toISOString()}
initial_quality=${currentValidation.qualityScore}
target_quality=${targetQuality}
max_iterations=${maxIterations}

@STATE
debug_loop_started=true
`);
    
    // Keep debugging until perfect or max iterations reached
    while (currentValidation.qualityScore < targetQuality && 
           iteration < maxIterations && 
           (currentValidation.criticalIssues > 0 || !currentValidation.success)) {
      
      iteration++;
      const previousQuality = currentValidation.qualityScore;
      
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🔄 DEBUG ITERATION ${iteration}/${maxIterations}`);
      console.log(`🎯 Current Quality: ${previousQuality}/100 → Target: ${targetQuality}/100`);
      console.log(`${'='.repeat(60)}`);
      
      // Perform AI-driven fixes
      await this.performAIFixes(currentValidation, iteration);
      
      // Re-validate after fixes
      console.log(`\n🔍 RE-VALIDATING AFTER ITERATION ${iteration}...`);
      const newValidation = await validator.validate(this.projectDir);
      
      // Calculate improvement
      const qualityImprovement = newValidation.qualityScore - previousQuality;
      const issuesReduced = currentValidation.criticalIssues - newValidation.criticalIssues;
      
      console.log(`\n📊 ITERATION ${iteration} RESULTS:`);
      console.log(`   Quality: ${previousQuality}/100 → ${newValidation.qualityScore}/100 (${qualityImprovement >= 0 ? '+' : ''}${qualityImprovement})`);
      console.log(`   Critical Issues: ${currentValidation.criticalIssues} → ${newValidation.criticalIssues} (${issuesReduced >= 0 ? '-' : '+'}${Math.abs(issuesReduced)})`);
      console.log(`   Status: ${newValidation.success ? '✅ PASS' : '❌ NEEDS MORE WORK'}`);
      
      // Record iteration results
      await this.aicfContext.appendToAICF('debug-iterations.aicf', `
iteration_${iteration}_quality=${newValidation.qualityScore}
iteration_${iteration}_improvement=${qualityImprovement}
iteration_${iteration}_issues=${newValidation.criticalIssues}
`);
      
      // Check if we achieved perfection!
      if (newValidation.qualityScore === targetQuality && newValidation.success) {
        console.log(`\n🎆 PERFECT! ACHIEVED ${targetQuality}/100 QUALITY IN ${iteration} ITERATIONS!`);
        console.log('🎉 ALL BUGS CAUGHT! GOTTA CATCH \'EM ALL - COMPLETE!');
        break;
      }
      
      // Check for sufficient improvement
      if (qualityImprovement < 1 && issuesReduced <= 0) {
        console.log(`\n⚠️  Minimal improvement detected. Quality plateau reached.`);
        console.log(`📊 Final achievable quality: ${newValidation.qualityScore}/100`);
        break;
      }
      
      currentValidation = newValidation;
    }
    
    // Final results
    const finalQuality = currentValidation.qualityScore;
    const totalImprovement = finalQuality - initialValidation.qualityScore;
    
    console.log(`\n${'='.repeat(80)}`);
    if (finalQuality === targetQuality) {
      console.log(`🎆 DEBUG LOOP COMPLETE - PERFECTION ACHIEVED!`);
      console.log(`💯 FINAL QUALITY SCORE: ${finalQuality}/100`);
    } else {
      console.log(`🏁 DEBUG LOOP COMPLETE - MAXIMUM IMPROVEMENT ACHIEVED!`);
      console.log(`📊 FINAL QUALITY SCORE: ${finalQuality}/100 (improved by +${totalImprovement})`);
    }
    console.log(`🔄 Total Iterations: ${iteration}`);
    console.log(`❌ Critical Issues Remaining: ${currentValidation.criticalIssues}`);
    console.log(`${'='.repeat(80)}`);
    
    // Record final results
    await this.aicfContext.appendToAICF('debug-iterations.aicf', `
final_quality=${finalQuality}
total_improvement=${totalImprovement}
total_iterations=${iteration}
debug_complete=true
perfection_achieved=${finalQuality === targetQuality}
`);
    
    return currentValidation;
  }
  
  /**
   * Perform AI-driven fixes for a specific iteration
   */
  async performAIFixes(validation, iteration) {
    console.log(`🤖 ITERATION ${iteration}: Analyzing errors and generating targeted fixes...`);
    
    // Enhanced analysis prompt with iteration context
    let analysisPrompt = this.errorAnalysisAgent.analyzeAndFix(
      validation, 
      this.aicfContext.getBuildContext(),
      this.projectDir
    );
    
    // Add iteration-specific context
    analysisPrompt += `\n\n═══ ITERATION ${iteration} CONTEXT ═══\n`;
    analysisPrompt += `This is debug iteration ${iteration}. Focus on the MOST CRITICAL issues first.\n`;
    analysisPrompt += `Previous iterations may have already fixed some issues.\n`;
    analysisPrompt += `Target: 100% quality score. Current: ${validation.qualityScore}%\n`;
    analysisPrompt += `PRIORITY: Fix issues that will have the biggest impact on quality score.\n\n`;
    
    // Select cost-optimized provider for error analysis 
    const analysisProvider = this.selectProvider('error_analysis', 'Error Analysis');
    
    console.log(`📝 Using ${analysisProvider.name} for error analysis...`);
    
    // Get AI analysis and fixes
    const aiResponse = await analysisProvider.sendMessage([], analysisPrompt);
    
    // Parse fixes from AI response
    const fixResult = this.errorAnalysisAgent.parseFixResponse(aiResponse.content);
    
    console.log(`🔧 Found ${fixResult.fixes.length} targeted fixes for iteration ${iteration}`);
    
    // Apply fixes with enhanced error handling
    let fixesApplied = 0;
    const fixResults = [];
    
    for (const fix of fixResult.fixes) {
      try {
        const fixPath = path.join(this.projectDir, fix.file);
        
        // Ensure directory exists
        await fs.ensureDir(path.dirname(fixPath));
        
        // Create backup if file exists
        if (await fs.pathExists(fixPath)) {
          await fs.copy(fixPath, `${fixPath}.iter${iteration}-backup`);
          console.log(`  💾 Backed up: ${fix.file}`);
        }
        
        // Apply fix
        await fs.writeFile(fixPath, fix.content, 'utf8');
        console.log(`  ✅ Fixed: ${fix.file}`);
        
        fixesApplied++;
        fixResults.push({ file: fix.file, status: 'applied', iteration });
        
      } catch (error) {
        console.error(`  ❌ Failed to fix ${fix.file}:`, error.message);
        fixResults.push({ file: fix.file, status: 'failed', error: error.message, iteration });
      }
    }
    
    console.log(`\n🎆 ITERATION ${iteration} COMPLETE: Applied ${fixesApplied}/${fixResult.fixes.length} fixes`);
    
    // Record iteration-specific fixes in AICF
    await this.aicfContext.writeAICF(`fixes-iteration-${iteration}.aicf`, `@CONVERSATION:${this.projectName}_fixes_iter_${iteration}
timestamp=${new Date().toISOString()}
iteration=${iteration}
fixes_attempted=${fixResult.fixes.length}
fixes_applied=${fixesApplied}
quality_before=${validation.qualityScore}

@FIXES
${fixResults.map(result => `file=${result.file}
status=${result.status}
iteration=${result.iteration}
${result.error ? `error=${result.error}` : ''}`).join('\n')}

@STATE
iteration_${iteration}_complete=true
`);
    
    return { fixesApplied, totalFixes: fixResult.fixes.length, iteration };
  }

  /**
   * Validate phase completion against PRD requirements
   */
  async validatePhaseCompletion(phaseResult, prd, phaseIndex) {
    console.log(`\n🔍 VALIDATING PHASE ${phaseIndex + 1} COMPLETION...`);
    
    // Build validation prompt
    const validationPrompt = this.phaseValidationAgent.validatePhase(
      phaseResult,
      prd,
      this.aicfContext.getBuildContext(),
      this.projectDir
    );
    
    // Use cost-optimized provider for validation
    const validationProvider = this.selectProvider('validation', 'Phase Validation');
    
    // Get AI validation
    const aiResponse = await validationProvider.sendMessage([], validationPrompt);
    
    // Parse validation results
    const validation = this.phaseValidationAgent.parseValidationResponse(aiResponse.content);
    
    // Create validation report
    const validationReport = await this.phaseValidationAgent.createValidationReport(
      validation,
      phaseResult,
      this.projectDir
    );
    
    // Save validation report to AICF
    await this.aicfContext.writeAICF(`phase-${phaseIndex + 1}-validation.aicf`, validationReport);
    
    // Display validation results
    console.log(`📊 PHASE VALIDATION RESULTS:`);
    console.log(`   Status: ${validation.status === 'PASS' ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Completeness: ${validation.completenessScore}/10`);
    console.log(`   Next Phase Ready: ${validation.nextPhaseReady ? '✅ YES' : '❌ NO'}`);
    
    if (validation.missingItems.length > 0) {
      console.log(`   Missing Items: ${validation.missingItems.length}`);
      validation.missingItems.slice(0, 3).forEach(item => {
        console.log(`     - ${item}`);
      });
    }
    
    if (validation.recommendations.length > 0) {
      console.log(`   Recommendations: ${validation.recommendations.length}`);
    }
    
    // If phase is incomplete, suggest improvements
    if (validation.status === 'FAIL' || !validation.nextPhaseReady) {
      console.log(`\n⚠️  Phase ${phaseIndex + 1} needs improvements, but continuing with available foundation...`);
      
      const improvements = this.phaseValidationAgent.generateImprovementSuggestions(validation);
      if (improvements.length > 0) {
        console.log(`💡 Suggested improvements for future iterations:`);
        improvements.forEach(imp => {
          console.log(`   - ${imp.description}`);
        });
      }
    }
    
    return validation;
  }

  /**
   * Generate comprehensive build summary
   */
  async generateBuildSummary(validation) {
    const summary = `# ${this.projectName} - Build Summary

**Generated by Enhanced AIOB v3.0**  
**Date:** ${new Date().toISOString()}  
**Status:** ${validation.success ? '✅ SUCCESS' : '❌ NEEDS FIXES'}  
**Quality Score:** ${validation.qualityScore}/100  

## Project Overview

- **Project:** ${this.projectName}
- **Location:** ${this.projectDir}
- **Total Phases:** ${this.phaseHistory.length}
- **Total Files:** ${this.createdFiles.size}
- **Critical Issues:** ${validation.criticalIssues}

## Development Phases

${this.phaseHistory.map((phase, i) => `
### Phase ${i + 1}: ${phase.phase}

**Agent:** ${phase.agent}  
**Task:** ${phase.task}  
**Files Created:** ${phase.filesCreated.length}  
**Timestamp:** ${new Date(phase.timestamp).toLocaleString()}  

**Files:**
${phase.filesCreated.map(f => `- ${f}`).join('\n')}

**Summary:** ${phase.summary}

**Key Decisions:** ${phase.keyDecisions}
`).join('\n')}

## Validation Results

### File Structure: ${validation.results.structure.pass ? '✅ PASS' : '❌ FAIL'}
${validation.results.structure.missing?.length > 0 ? `**Missing:** ${validation.results.structure.missing.join(', ')}` : ''}

### Syntax Check: ${validation.results.syntax.pass ? '✅ PASS' : '❌ FAIL'}
${validation.results.syntax.errors?.length > 0 ? `**Errors:** ${validation.results.syntax.errors.length} found` : ''}

### Dependencies: ${validation.results.dependencies.pass ? '✅ PASS' : '❌ FAIL'}
${validation.results.dependencies.missing?.length > 0 ? `**Missing:** ${validation.results.dependencies.missing.join(', ')}` : ''}

### Runtime Test: ${validation.results.runtime.pass ? '✅ PASS' : '❌ FAIL'}
${validation.results.runtime.error ? `**Error:** ${validation.results.runtime.error}` : ''}

## Files Created

${Array.from(this.createdFiles).map(f => `- ${path.relative(this.projectDir, f)}`).join('\n')}

## Getting Started

${validation.success ? `
🎉 **Your application is ready!**

To run your app:
\`\`\`bash
cd ${path.basename(this.projectDir)}
npm install
npm start
\`\`\`

Then open your browser to test the functionality.
` : `
⚠️ **Your application needs fixes before it can run.**

Please review the validation errors above and fix them before deploying.

Common fixes needed:
- Add missing files listed in validation
- Fix syntax errors in JavaScript/JSON files  
- Add missing dependencies to package.json
- Ensure server starts correctly
`}

---
*Generated automatically by Enhanced AIOB v3.0 - AI Operations Board*
`;

    const summaryPath = path.join(this.projectDir, 'BUILD_SUMMARY.md');
    await fs.writeFile(summaryPath, summary);
    
    console.log('📄 Generated BUILD_SUMMARY.md');
  }
}

export default ProjectOrchestrator;