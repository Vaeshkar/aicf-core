/**
 * Enhanced File Builder with JSON Validation and Deduplication
 * Fixes the core issues with AIOB file generation
 */

import fs from 'fs/promises';
import path from 'path';

export class EnhancedFileBuilder {
  constructor() {
    this.createdFiles = new Map(); // Track all created files
    this.projectStructure = new Map(); // Track project structure
    this.duplicateCount = 0;
  }

  /**
   * Parse AI response and extract file creation instructions
   * Enhanced to detect and prevent duplicates
   */
  parseFileInstructions(aiResponse) {
    const fileInstructions = [];
    const filePatterns = [
      // Existing patterns
      /CREATE_FILE:\s*(.+?)\s*\n([\s\S]*?)(?=CREATE_FILE:|$)/g,
      /File:\s*`([^`]+)`\s*\n([\s\S]*?)(?=File:|$)/g,
      /```(\w+)\s+path=([^\n]+)\n([\s\S]*?)```/g,
      
      // New enhanced patterns
      /FILE_START:\s*([^\n]+)\n([\s\S]*?)FILE_END/g,
      /\*\*File:\s*([^*]+)\*\*\s*\n([\s\S]*?)(?=\*\*File:|$)/g
    ];

    for (const pattern of filePatterns) {
      let match;
      while ((match = pattern.exec(aiResponse)) !== null) {
        const [, filePath, content] = match;
        const cleanPath = this.sanitizePath(filePath);
        const cleanContent = this.sanitizeContent(content, cleanPath);
        
        // Check for duplicates BEFORE adding
        if (this.isDuplicate(cleanPath, cleanContent)) {
          console.warn(`⚠️  Duplicate file detected: ${cleanPath} (skipping)`);
          this.duplicateCount++;
          continue;
        }
        
        fileInstructions.push({
          path: cleanPath,
          content: cleanContent,
          type: this.detectFileType(cleanPath)
        });
      }
    }

    return fileInstructions;
  }

  /**
   * Sanitize file paths to prevent conflicts
   */
  sanitizePath(filePath) {
    // Remove metadata prefixes
    let clean = filePath.replace(/^path=/, '').trim();
    
    // Remove language specifiers
    clean = clean.replace(/^(javascript|typescript|jsx|tsx|json|html|css):\s*/, '');
    
    // Normalize path separators
    clean = clean.replace(/\\\\/g, '/');
    
    // Remove quotes
    clean = clean.replace(/^["'](.+)["']$/, '$1');
    
    return clean;
  }

  /**
   * Sanitize file content to fix JSON and other issues
   */
  sanitizeContent(content, filePath) {
    let clean = content.trim();
    
    // Fix JSON files specifically
    if (filePath.endsWith('.json')) {
      clean = this.sanitizeJSON(clean);
    }
    
    // Remove metadata lines at the beginning
    clean = clean.replace(/^path=[^\n]*\n/, '');
    clean = clean.replace(/^file=[^\n]*\n/, '');
    clean = clean.replace(/^language=[^\n]*\n/, '');
    
    // Remove code block markers if present
    clean = clean.replace(/^```[a-z]*\n/, '').replace(/\n```$/, '');
    
    return clean;
  }

  /**
   * Fix JSON content specifically
   */
  sanitizeJSON(content) {
    try {
      // Remove any non-JSON lines at the start
      const lines = content.split('\n');
      let jsonStart = -1;
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('{') || lines[i].trim().startsWith('[')) {
          jsonStart = i;
          break;
        }
      }
      
      if (jsonStart > 0) {
        content = lines.slice(jsonStart).join('\n');
      }
      
      // Validate JSON
      JSON.parse(content);
      return content;
    } catch (error) {
      console.warn(`⚠️  Invalid JSON detected, attempting to fix...`);
      
      // Try to fix common JSON issues
      let fixed = content
        .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
        .replace(/([{,]\s*)(\w+):/g, '$1"$2":') // Quote unquoted keys
        .replace(/:\s*'([^']*)'/g, ': "$1"'); // Replace single quotes with double
      
      try {
        JSON.parse(fixed);
        return fixed;
      } catch (fixError) {
        console.error(`❌ Could not fix JSON:`, fixError.message);
        return content; // Return original if can't fix
      }
    }
  }

  /**
   * Check if file is a duplicate based on path and content similarity
   */
  isDuplicate(filePath, content) {
    // Check if exact path already exists
    if (this.createdFiles.has(filePath)) {
      return true;
    }
    
    // Check for functional duplicates (same filename, similar purpose)
    const fileName = path.basename(filePath);
    
    for (const [existingPath, existingContent] of this.createdFiles) {
      const existingFileName = path.basename(existingPath);
      
      // Same filename in different directories
      if (fileName === existingFileName) {
        console.log(`🔍 Checking duplicate: ${filePath} vs ${existingPath}`);
        
        // For certain critical files, prevent duplicates entirely
        if (['server.js', 'package.json', 'App.js', 'index.js'].includes(fileName)) {
          console.log(`📁 Structure conflict detected: ${fileName}`);
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Detect file type for better handling
   */
  detectFileType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const typeMap = {
      '.js': 'javascript',
      '.jsx': 'jsx',
      '.ts': 'typescript',
      '.tsx': 'tsx',
      '.json': 'json',
      '.html': 'html',
      '.css': 'css',
      '.md': 'markdown'
    };
    
    return typeMap[ext] || 'plaintext';
  }

  /**
   * Create project structure with conflict resolution
   */
  async createProjectStructure(projectName, outputDir) {
    // Sanitize project name for filesystem
    const sanitizedName = this.sanitizeProjectName(projectName);
    const projectDir = path.join(outputDir, sanitizedName);
    
    // Clear tracking
    this.createdFiles.clear();
    this.projectStructure.clear();
    this.duplicateCount = 0;
    
    // Ensure clean directory
    try {
      await fs.rm(projectDir, { recursive: true, force: true });
    } catch (error) {
      // Directory doesn't exist, that's fine
    }
    
    await fs.mkdir(projectDir, { recursive: true });
    return projectDir;
  }

  /**
   * Write file with enhanced validation
   */
  async writeFile(projectDir, instruction) {
    const fullPath = path.join(projectDir, instruction.path);
    const directory = path.dirname(fullPath);
    
    // Create directory if needed
    await fs.mkdir(directory, { recursive: true });
    
    // Write file
    await fs.writeFile(fullPath, instruction.content, 'utf8');
    
    // Track created file
    this.createdFiles.set(instruction.path, instruction.content);
    
    console.log(`✅ Created: ${instruction.path} (${instruction.content.length} chars)`);
    return fullPath;
  }

  /**
   * Build all files from instructions with deduplication
   */
  async buildFiles(projectName, outputDir, fileInstructions, clearDirectory = false) {
    const projectDir = await this.createProjectStructure(projectName, outputDir, clearDirectory);
    
    console.log(`📁 Creating project: ${projectDir}`);
    console.log(`📋 Found ${fileInstructions.length} file(s) to create`);
    
    // Show file list for review
    fileInstructions.forEach(instruction => {
      console.log(`  • ${instruction.path} (${instruction.type})`);
    });
    
    const createdFiles = [];
    
    for (const instruction of fileInstructions) {
      try {
        const filePath = await this.writeFile(projectDir, instruction);
        createdFiles.push(filePath);
      } catch (error) {
        console.error(`❌ Failed to create ${instruction.path}:`, error.message);
      }
    }
    
    // Report results
    console.log(`✅ Created ${createdFiles.length} files`);
    if (this.duplicateCount > 0) {
      console.log(`⚠️  Skipped ${this.duplicateCount} duplicate files`);
    }
    
    return {
      projectDir,
      createdFiles,
      duplicatesSkipped: this.duplicateCount
    };
  }

  /**
   * Generate project structure report
   */
  generateStructureReport() {
    const report = {
      totalFiles: this.createdFiles.size,
      duplicatesSkipped: this.duplicateCount,
      structure: {}
    };
    
    for (const [filePath] of this.createdFiles) {
      const parts = filePath.split('/');
      let current = report.structure;
      
      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) {
          current[parts[i]] = {};
        }
        current = current[parts[i]];
      }
      
      current[parts[parts.length - 1]] = 'file';
    }
    
    return report;
  }

  /**
   * Sanitize project name for filesystem compatibility
   */
  sanitizeProjectName(projectName) {
    let sanitized = projectName;
    
    // Remove markdown formatting
    sanitized = sanitized.replace(/\*\*/g, ''); // Bold
    sanitized = sanitized.replace(/\*/g, ''); // Italic
    sanitized = sanitized.replace(/[\[\]()]/g, ''); // Brackets
    sanitized = sanitized.replace(/[#]+/g, ''); // Headers
    
    // Remove special characters that cause filesystem issues
    sanitized = sanitized.replace(/[<>:"/\\|?*]/g, '');
    
    // Replace spaces and other separators with hyphens
    sanitized = sanitized.replace(/[\s\-_]+/g, '-');
    
    // Remove multiple consecutive hyphens
    sanitized = sanitized.replace(/-+/g, '-');
    
    // Remove leading/trailing hyphens
    sanitized = sanitized.replace(/^-+|-+$/g, '');
    
    // Convert to lowercase for consistency
    sanitized = sanitized.toLowerCase();
    
    // Ensure it's not empty and not too long
    if (!sanitized || sanitized.length === 0) {
      sanitized = 'aiob-project';
    } else if (sanitized.length > 50) {
      sanitized = sanitized.substring(0, 50).replace(/-+$/, '');
    }
    
    console.log(`📁 Sanitized project name: '${projectName}' → '${sanitized}'`);
    
    return sanitized;
  }
}
