/**
 * AIOB v2.0 - Simple Project Orchestrator
 * 
 * Back to basics: The simple, working system that successfully builds projects
 * With modern model support: Claude 3.5 Sonnet + GPT-4-mini
 */

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

export class SimpleOrchestrator {
  constructor(providers) {
    this.providers = providers;
    this.projectName = null;
    this.projectDir = null;
    this.prd = null;
    this.createdFiles = [];
    this.initialized = false;
  }

  /**
   * Initialize AI providers
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
      throw new Error('No AI providers available. Please check your API keys.');
    }
    
    this.initialized = true;
  }

  /**
   * Load PRD and extract project details
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
      await fs.ensureDir(this.projectDir);
      
      this.prd = content;
      return content;
    } catch (error) {
      throw new Error(`Failed to load PRD: ${error.message}`);
    }
  }

  /**
   * Select appropriate AI provider for task
   */
  selectProvider(taskType) {
    // Simple selection: Claude for architecture/planning, GPT for implementation
    if (taskType === 'planning' || taskType === 'architecture') {
      return this.providers.find(p => p.name.toLowerCase().includes('claude') && p.isAvailable) ||
             this.providers.find(p => p.isAvailable);
    } else {
      return this.providers.find(p => p.name.toLowerCase().includes('gpt') && p.isAvailable) ||
             this.providers.find(p => p.isAvailable);
    }
  }

  /**
   * Create role-specific prompts
   */
  createRolePrompt(role, context) {
    const basePrompt = `You are working on: ${this.projectName}

CRITICAL: Create actual files using this exact format:

\`\`\`language path=relative/path/to/file.ext
file content here
\`\`\`

PRD:
${this.prd}

${context ? `Previous work context:\n${context}\n` : ''}`

    const rolePrompts = {
      infrastructure: `${basePrompt}

Your role: Infrastructure Setup
Focus: Create complete project structure with all dependencies

Tasks:
- Create package.json with ALL required dependencies (frontend AND backend)
- Set up directory structure (src/, public/, etc.)
- Create configuration files (.gitignore, README.md)
- Prepare foundation files (empty but properly structured)

Create a comprehensive, working project foundation.`,

      backend: `${basePrompt}

Your role: Backend Developer  
Focus: Build complete server-side functionality

Tasks:
- Create Express server (server.js)
- Implement ALL API endpoints from PRD
- Add middleware (CORS, validation, error handling)
- Create data models and persistence
- Ensure APIs actually work

Create production-ready backend code.`,

      frontend: `${basePrompt}

Your role: Frontend Developer
Focus: Build complete user interface

Tasks:
- Create HTML structure (public/index.html)
- Build React components (or vanilla JS if specified)
- Implement all UI features from PRD
- Style appropriately (CSS/Tailwind)
- Connect to backend APIs

Create a fully functional user interface.`,

      qa: `${basePrompt}

Your role: QA Engineer
Focus: Test and validate complete application

Tasks:
- Review all functionality against PRD requirements
- Test frontend-backend integration
- Identify any missing features or bugs
- Create setup/usage instructions
- Provide final assessment

Ensure everything works as specified in the PRD.`
    };

    return rolePrompts[role] || basePrompt;
  }

  /**
   * Parse AI response and extract files
   */
  parseFiles(response) {
    const files = [];
    const codeBlockRegex = /```(\w+)?\s+path=([^\n\s]+)\s*\n([\s\S]*?)```/g;
    let match;
    
    while ((match = codeBlockRegex.exec(response)) !== null) {
      const [, language, filePath, content] = match;
      
      if (filePath && content && content.trim()) {
        files.push({
          path: filePath.trim(),
          content: content.trim(),
          language: language || 'text'
        });
      }
    }
    
    return files;
  }

  /**
   * Write files to project directory
   */
  async writeFiles(files) {
    const created = [];
    
    for (const file of files) {
      const fullPath = path.join(this.projectDir, file.path);
      
      // Ensure directory exists
      await fs.ensureDir(path.dirname(fullPath));
      
      // Write file
      await fs.writeFile(fullPath, file.content, 'utf8');
      created.push(fullPath);
      this.createdFiles.push(fullPath);
      
      console.log(`  ✓ ${file.path}`);
    }
    
    return created;
  }

  /**
   * Main build process - simple and straightforward
   */
  async buildProject(prdPath) {
    console.log(chalk.blue('🚀 AIOB v2.0 - Simple Project Build'));
    console.log('═'.repeat(60));
    
    // Initialize
    await this.initialize();
    await this.loadPRD(prdPath);
    
    console.log(`PRD: ${path.basename(prdPath)}`);
    console.log(`Project: ${this.projectName}`);
    console.log(`Output: ${this.projectDir}`);
    console.log('═'.repeat(60) + '\n');

    // Define build phases
    const phases = [
      {
        name: 'Infrastructure Setup',
        role: 'infrastructure',
        taskType: 'architecture'
      },
      {
        name: 'Backend Development', 
        role: 'backend',
        taskType: 'implementation'
      },
      {
        name: 'Frontend Development',
        role: 'frontend', 
        taskType: 'implementation'
      },
      {
        name: 'Quality Assurance',
        role: 'qa',
        taskType: 'planning'
      }
    ];

    console.log(`👥 Build phases: ${phases.length}\n`);
    
    const results = [];
    let context = '';

    // Execute each phase
    for (let i = 0; i < phases.length; i++) {
      const phase = phases[i];
      
      console.log('═'.repeat(60));
      console.log(`PHASE ${i + 1}/${phases.length}: ${phase.name.toUpperCase()}`);
      console.log('═'.repeat(60));
      
      // Select AI provider
      const provider = this.selectProvider(phase.taskType);
      console.log(`🤖 Using ${provider.name}...`);
      
      // Create prompt
      const prompt = this.createRolePrompt(phase.role, context);
      
      // Execute with AI
      const response = await provider.sendMessage([], prompt);
      
      // Parse and create files
      const files = this.parseFiles(response.content);
      console.log(`📁 Found ${files.length} files to create:`);
      
      const createdFiles = await this.writeFiles(files);
      
      // Store result
      const result = {
        phase: i + 1,
        name: phase.name,
        provider: provider.name,
        filesCreated: createdFiles.length,
        files: files.map(f => f.path)
      };
      results.push(result);
      
      // Update context for next phase
      context += `\n\nPhase ${i + 1} (${phase.name}) completed by ${provider.name}:\n`;
      context += `Files created: ${files.map(f => f.path).join(', ')}\n`;
      context += `Summary: ${response.content.substring(0, 500)}...\n`;
      
      console.log(`✅ Phase ${i + 1} complete\n`);
    }

    // Create build summary
    await this.createBuildSummary(results);
    
    console.log('═'.repeat(60));
    console.log('🎉 BUILD COMPLETE!');
    console.log('═'.repeat(60));
    console.log(`📁 Project: ${this.projectName}`);
    console.log(`📂 Location: ${this.projectDir}`);
    console.log(`📄 Files created: ${this.createdFiles.length}`);
    console.log(`🤖 Phases: ${phases.length}`);
    
    return {
      success: true,
      projectName: this.projectName,
      projectDir: this.projectDir,
      phases: results,
      totalFiles: this.createdFiles.length
    };
  }

  /**
   * Create build summary documentation
   */
  async createBuildSummary(results) {
    const summary = `# ${this.projectName} - Build Summary

**Generated by AIOB v2.0 (Simple)**  
**Date:** ${new Date().toISOString()}  
**Total Files:** ${this.createdFiles.length}  
**Total Phases:** ${results.length}  

## Build Phases

${results.map(r => `
### Phase ${r.phase}: ${r.name}
- **AI Provider:** ${r.provider}
- **Files Created:** ${r.filesCreated}
- **Files:** ${r.files.join(', ')}
`).join('')}

## Project Structure
${this.createdFiles.map(f => `- ${path.relative(this.projectDir, f)}`).join('\n')}

## Getting Started
1. \`cd ${path.basename(this.projectDir)}\`
2. \`npm install\`
3. \`npm start\`
4. Open browser and test functionality

---
*Built with AIOB v2.0 - Simple & Effective*
`;

    const summaryPath = path.join(this.projectDir, 'BUILD_SUMMARY.md');
    await fs.writeFile(summaryPath, summary);
  }
}

export default SimpleOrchestrator;