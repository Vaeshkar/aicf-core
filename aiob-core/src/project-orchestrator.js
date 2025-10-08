/**
 * Project Builder Orchestrator
 * AIOB 2.0 that creates real working projects from PRDs
 */

import { AIOrchestrator } from './orchestrator.js';
import { FileBuilder } from './file-builder.js';
import { AICFContext } from './aicf-context.js';
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';

export class ProjectOrchestrator extends AIOrchestrator {
  constructor(providers = []) {
    super(providers);
    this.fileBuilder = new FileBuilder();
    this.projectName = null;
    this.projectDir = null;
    this.prd = null;
  }

  /**
   * Load and parse PRD (Product Requirements Document)
   */
  async loadPRD(prdPath) {
    try {
      const prdContent = await fs.readFile(prdPath, 'utf8');
      this.prd = {
        content: prdContent,
        path: prdPath
      };
      
      // Extract project name from PRD
      const nameMatch = prdContent.match(/[#]\\s*([^\\n]+)/);
      if (nameMatch) {
        this.projectName = nameMatch[1]
          .replace(/\\s+PRD.*$/i, '')
          .replace(/[^a-zA-Z0-9\\-]/g, '-')
          .toLowerCase();
      } else {
        this.projectName = 'aiob-project';
      }
      
      console.log(chalk.green(`📋 Loaded PRD: ${path.basename(prdPath)}`));
      console.log(chalk.cyan(`🎯 Project: ${this.projectName}`));
      
      return this.prd;
    } catch (error) {
      throw new Error(`Failed to load PRD: ${error.message}`);
    }
  }

  /**
   * Create specialized prompts for different AI roles
   */
  createRoleSpecificPrompt(role, step, context) {
    const basePrompt = `You are working on: ${this.projectName}

IMPORTANT: You must create actual files. Use this format for each file:

\`\`\`language path=relative/path/to/file.ext
file content here
\`\`\`

PRD Context:
${this.prd?.content || 'No PRD loaded'}

Your role: ${role}
Current step: ${step.description}
`;

    const rolePrompts = {
      infrastructure: `${basePrompt}

Focus on project setup:
- Create package.json with correct dependencies
- Set up directory structure  
- Create initial empty files
- Focus on getting the foundation ready

Create ALL files needed for project structure.`,

      backend: `${basePrompt}

Focus on backend development:
- Build the server (server.js)
- Implement all API endpoints
- Add data persistence
- Include error handling

Create working, tested backend code.`,

      frontend: `${basePrompt}

Focus on frontend development:  
- Create HTML structure
- Style with CSS
- Implement JavaScript functionality
- Connect to backend APIs

Create a complete, functional user interface.`,

      qa: `${basePrompt}

Focus on testing and integration:
- Test all functionality
- Fix any issues found
- Verify requirements are met
- Document setup instructions

Ensure everything works together perfectly.`
    };

    return rolePrompts[role] || basePrompt;
  }

  /**
   * Enhanced orchestration that builds real projects
   */
  async buildProject(prdPath) {
    console.log(chalk.blue('🚀 Starting Project Build Process'));
    
    // Load PRD
    await this.loadPRD(prdPath);
    
    // Define specialized workflow
    const workflow = [
      {
        role: 'infrastructure',
        description: 'Set up project structure and dependencies',
        capabilities: ['planning', 'architecture'],
        createFiles: true
      },
      {
        role: 'backend',
        description: 'Build server and API endpoints',
        capabilities: ['coding', 'implementation'],
        createFiles: true
      },
      {
        role: 'frontend', 
        description: 'Create user interface and client-side logic',
        capabilities: ['coding', 'implementation'],
        createFiles: true
      },
      {
        role: 'qa',
        description: 'Test integration and verify functionality',
        capabilities: ['debugging', 'analysis'],
        createFiles: false
      }
    ];

    console.log(chalk.cyan(`📋 Build plan: ${workflow.length} phases`));
    
    let context = new AICFContext();
    const results = [];

    // Execute each phase
    for (let i = 0; i < workflow.length; i++) {
      const phase = workflow[i];
      
      console.log(chalk.blue(`\\n${'='.repeat(80)}`));
      console.log(chalk.blue(`🔨 PHASE ${i + 1}: ${phase.description.toUpperCase()}`));
      console.log(chalk.blue(`${'='.repeat(80)}`));
      
      // Select AI for this phase
      const selectedAI = this.selectBestAI(phase.capabilities);
      
      // Create role-specific prompt
      const prompt = this.createRoleSpecificPrompt(phase.role, phase, context);
      
      // Prepare context
      const aiContext = this.contextManager.prepareContext(
        context,
        selectedAI.name,
        selectedAI.capabilities
      );
      
      // Execute phase
      console.log(chalk.yellow(`🤖 ${selectedAI.name} working on ${phase.role}...`));
      const response = await selectedAI.sendMessage(aiContext, prompt);
      
      // Process file creation if needed
      let buildResult = null;
      if (phase.createFiles) {
        buildResult = await this.fileBuilder.processAIResponse(
          response.content,
          this.projectName
        );
        
        if (buildResult.successCount > 0) {
          console.log(chalk.green(`✅ Created ${buildResult.successCount} files`));
          
          // Store project directory from first successful build
          if (!this.projectDir && buildResult.projectDir) {
            this.projectDir = buildResult.projectDir;
          }
        }
      }
      
      // Store phase result
      const phaseResult = {
        phase: i + 1,
        role: phase.role,
        ai: selectedAI.name,
        description: phase.description,
        response: response.content,
        tokens: response.tokens,
        buildResult,
        timestamp: new Date().toISOString()
      };
      
      results.push(phaseResult);
      
      // Update context for next phase
      context.update(selectedAI.name, response.content, {
        insights: [`Completed ${phase.role} phase`],
        decisions: [`Used ${selectedAI.name} for ${phase.role}`],
        state: { 
          phase: i + 1, 
          totalPhases: workflow.length,
          filesCreated: buildResult?.successCount || 0
        }
      });
      
      console.log(chalk.green(`✅ Phase ${i + 1} complete`));
      
      // Brief pause between phases
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Post-build processing
    await this.finalizeBuild(results);
    
    return {
      projectName: this.projectName,
      projectDir: this.projectDir,
      phases: results,
      totalTokens: results.reduce((sum, r) => sum + r.tokens, 0),
      totalFiles: this.fileBuilder.getSummary().totalFiles
    };
  }

  /**
   * Finalize the build process
   */
  async finalizeBuild(results) {
    if (!this.projectDir) {
      console.log(chalk.yellow('⚠️  No project directory created'));
      return;
    }

    console.log(chalk.blue(`\\n${'='.repeat(80)}`));
    console.log(chalk.blue('🔧 FINALIZING PROJECT'));
    console.log(chalk.blue(`${'='.repeat(80)}`));

    try {
      // Test project structure
      const isValid = await this.fileBuilder.testProject(this.projectDir);
      
      if (isValid) {
        // Try to install dependencies
        try {
          await this.fileBuilder.installDependencies(this.projectDir);
        } catch (error) {
          console.log(chalk.yellow(`⚠️  Dependency installation failed: ${error.message}`));
        }
      }
      
      // Create project summary
      await this.createProjectSummary(results);
      
      console.log(chalk.green(`\\n🎉 PROJECT BUILD COMPLETE!`));
      console.log(chalk.cyan(`📁 Location: ${this.projectDir}`));
      console.log(chalk.cyan(`📊 Files created: ${this.fileBuilder.getSummary().totalFiles}`));
      console.log(chalk.cyan(`🤖 AI phases: ${results.length}`));
      
      // Show next steps
      console.log(chalk.yellow('\\n📋 Next steps:'));
      console.log(`1. cd ${this.projectDir}`);
      console.log('2. npm start (if available)');
      console.log('3. Open browser and test functionality');
      
    } catch (error) {
      console.error(chalk.red(`❌ Build finalization failed: ${error.message}`));
    }
  }

  /**
   * Create project summary documentation
   */
  async createProjectSummary(results) {
    const summary = `# ${this.projectName} - Build Summary

## Generated by AIOB v2.0
**Date:** ${new Date().toISOString()}  
**Total Phases:** ${results.length}  
**Total Files:** ${this.fileBuilder.getSummary().totalFiles}  
**Total Tokens:** ${results.reduce((sum, r) => sum + r.tokens, 0)}

## Build Phases

${results.map((result, i) => `
### Phase ${i + 1}: ${result.role}
- **AI:** ${result.ai}
- **Description:** ${result.description}
- **Files Created:** ${result.buildResult?.successCount || 0}
- **Tokens Used:** ${result.tokens}
`).join('')}

## Created Files
${this.fileBuilder.getSummary().files.map(f => `- ${path.relative(this.projectDir, f)}`).join('\\n')}

## Getting Started
1. \`cd ${path.basename(this.projectDir)}\`
2. \`npm install\` (if not already done)
3. \`npm start\`
4. Open browser to test functionality

---
*Generated automatically by AIOB - AI Operations Board*
`;

    const summaryPath = path.join(this.projectDir, 'BUILD_SUMMARY.md');
    await fs.writeFile(summaryPath, summary, 'utf8');
    
    console.log(chalk.green('📄 Created BUILD_SUMMARY.md'));
  }
}