/**
 * File Builder - Enables AIs to create actual files and directories
 * Parses AI responses and extracts file creation instructions
 */

import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';

export class FileBuilder {
  constructor(outputDir = './output') {
    this.outputDir = outputDir;
    this.createdFiles = [];
  }

  /**
   * Parse AI response for file creation instructions
   * Looks for code blocks with file paths
   */
  parseFileInstructions(aiResponse) {
    const files = [];
    
    // Match code blocks with file paths
    // Pattern: ```language path=/path/to/file
    const codeBlockRegex = /```(\w+)\s+path=([^\n\s]+)\n([\s\S]*?)```/g;
    let match;
    
    while ((match = codeBlockRegex.exec(aiResponse)) !== null) {
      const [, language, filePath, content] = match;
      files.push({
        path: filePath,
        content: content.trim(),
        language
      });
    }
    
    // Also look for explicit file instructions
    // Pattern: CREATE FILE: /path/to/file
    const explicitFileRegex = /CREATE FILE:\s*([^\n]+)\n```[\w]*\n([\s\S]*?)```/g;
    while ((match = explicitFileRegex.exec(aiResponse)) !== null) {
      const [, filePath, content] = match;
      files.push({
        path: filePath.trim(),
        content: content.trim(),
        language: this.detectLanguage(filePath)
      });
    }
    
    // Look for package.json specifically
    const packageJsonRegex = /```json[^`]*?{[\s\S]*?"name"[\s\S]*?}[^`]*?```/g;
    if ((match = packageJsonRegex.exec(aiResponse)) !== null) {
      const content = match[0].replace(/```json\n?/, '').replace(/```$/, '').trim();
      files.push({
        path: 'package.json',
        content,
        language: 'json'
      });
    }
    
    return files;
  }

  /**
   * Detect language from file extension
   */
  detectLanguage(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const languageMap = {
      '.js': 'javascript',
      '.ts': 'typescript',
      '.json': 'json',
      '.html': 'html',
      '.css': 'css',
      '.md': 'markdown',
      '.py': 'python',
      '.go': 'go'
    };
    return languageMap[ext] || 'text';
  }

  /**
   * Create directory structure and files based on AI instructions
   */
  async createFiles(files, projectName = 'aiob-project') {
    const projectDir = path.join(this.outputDir, projectName);
    
    console.log(chalk.blue(`📁 Creating project: ${projectDir}`));
    
    // Ensure output directory exists
    await fs.mkdir(projectDir, { recursive: true });
    
    const results = [];
    
    for (const file of files) {
      try {
        const fullPath = path.join(projectDir, file.path);
        const dir = path.dirname(fullPath);
        
        // Create directory if it doesn't exist
        await fs.mkdir(dir, { recursive: true });
        
        // Write file
        await fs.writeFile(fullPath, file.content, 'utf8');
        
        this.createdFiles.push(fullPath);
        results.push({
          path: fullPath,
          relativePath: file.path,
          success: true,
          size: file.content.length
        });
        
        console.log(chalk.green(`✅ Created: ${file.path} (${file.content.length} chars)`));
        
      } catch (error) {
        results.push({
          path: file.path,
          success: false,
          error: error.message
        });
        
        console.error(chalk.red(`❌ Failed to create ${file.path}: ${error.message}`));
      }
    }
    
    return {
      projectDir,
      files: results,
      totalFiles: results.length,
      successCount: results.filter(r => r.success).length
    };
  }

  /**
   * Extract file creation instructions from AI response
   */
  async processAIResponse(aiResponse, projectName) {
    console.log(chalk.yellow('🔍 Parsing AI response for file instructions...'));
    
    const files = this.parseFileInstructions(aiResponse);
    
    if (files.length === 0) {
      console.log(chalk.yellow('ℹ️  No file instructions found in AI response'));
      return { projectDir: null, files: [], totalFiles: 0, successCount: 0 };
    }
    
    console.log(chalk.cyan(`📋 Found ${files.length} file(s) to create:`));
    files.forEach(file => {
      console.log(chalk.gray(`  • ${file.path} (${file.language})`));
    });
    
    return await this.createFiles(files, projectName);
  }

  /**
   * Create a basic project structure
   */
  async createProjectStructure(projectName, structure) {
    const projectDir = path.join(this.outputDir, projectName);
    
    console.log(chalk.blue(`📁 Setting up project structure: ${projectName}`));
    
    // Create directories
    for (const dir of structure.directories || []) {
      const dirPath = path.join(projectDir, dir);
      await fs.mkdir(dirPath, { recursive: true });
      console.log(chalk.green(`📂 Created directory: ${dir}`));
    }
    
    // Create initial files
    for (const file of structure.files || []) {
      const filePath = path.join(projectDir, file.path);
      await fs.writeFile(filePath, file.content || '', 'utf8');
      console.log(chalk.green(`📄 Created file: ${file.path}`));
    }
    
    return projectDir;
  }

  /**
   * Run npm install in project directory
   */
  async installDependencies(projectDir) {
    const { spawn } = await import('child_process');
    
    return new Promise((resolve, reject) => {
      console.log(chalk.yellow('📦 Installing dependencies...'));
      
      const npm = spawn('npm', ['install'], {
        cwd: projectDir,
        stdio: 'pipe'
      });
      
      let output = '';
      npm.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      npm.stderr.on('data', (data) => {
        output += data.toString();
      });
      
      npm.on('close', (code) => {
        if (code === 0) {
          console.log(chalk.green('✅ Dependencies installed successfully'));
          resolve(output);
        } else {
          console.error(chalk.red('❌ Failed to install dependencies'));
          reject(new Error(`npm install failed with code ${code}`));
        }
      });
    });
  }

  /**
   * Test if the created project works
   */
  async testProject(projectDir) {
    try {
      // Check if package.json exists
      const packageJsonPath = path.join(projectDir, 'package.json');
      await fs.access(packageJsonPath);
      
      console.log(chalk.cyan('🧪 Testing project...'));
      
      // Try to parse package.json
      const packageContent = await fs.readFile(packageJsonPath, 'utf8');
      const packageJson = JSON.parse(packageContent);
      
      console.log(chalk.green(`✅ Project "${packageJson.name}" created successfully`));
      console.log(chalk.gray(`   Version: ${packageJson.version}`));
      console.log(chalk.gray(`   Main: ${packageJson.main || 'index.js'}`));
      
      // Check for start script
      if (packageJson.scripts?.start) {
        console.log(chalk.cyan(`🚀 Start command: npm start (runs: ${packageJson.scripts.start})`));
      }
      
      return true;
    } catch (error) {
      console.error(chalk.red(`❌ Project test failed: ${error.message}`));
      return false;
    }
  }

  /**
   * Get summary of created files
   */
  getSummary() {
    return {
      totalFiles: this.createdFiles.length,
      files: this.createdFiles,
      outputDir: this.outputDir
    };
  }
}