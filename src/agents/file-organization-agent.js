/**
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (c) 2025 Dennis van Leeuwen
 * 
 * File Organization Agent - Maintains clean directory structure
 * Prevents random file proliferation in core .ai/ and .aicf/ directories
 */

const fs = require('fs').promises;
const path = require('path');

class FileOrganizationAgent {
  constructor(options = {}) {
    this.name = 'FileOrganizationAgent';
    this.projectRoot = options.projectRoot || process.cwd();
    this.dryRun = options.dryRun || false;
    
    // CORE FILES CONFIGURATION - These files are ALLOWED in their directories
    this.allowedFiles = {
      // .ai/ - Core knowledge base (markdown files only)
      '.ai': [
        'README.md',              // Project overview and entry point
        'architecture.md',        // System design and technical architecture  
        'technical-decisions.md', // Decision log with rationale
        'known-issues.md',        // Current bugs and limitations
        'next-steps.md',          // Immediate action items and TODOs
        'conversation-log.md',    // AI conversation history (recent only)
        'PROTECTION-HEADER.md',   // AI system protection rules
        'user-ai-preferences.md', // User preferences for AI interactions
        'code-style.md',          // Developer coding style preferences
        'design-system.md',       // Component and UX design guidelines
        'team-commit-plan.md'     // Team coordination and commit management
      ],
      
      // .aicf/ - Compressed AI context format (aicf files only)
      '.aicf': [
        'index.aicf',            // Master index for fast lookups
        'conversations.aicf',    // Compressed conversation records
        'decisions.aicf',        // Decision records with metadata
        'technical-context.aicf', // Insights and technical knowledge
        'work-state.aicf',       // Current project state
        'conversation-memory.aicf', // Long-term conversation memory
        'tasks.aicf'             // Task tracking and completion status
      ]
    };
    
    // FILE CLASSIFICATION RULES - Pattern matching for auto-organization
    this.classificationRules = [
      // Analysis and reports
      { 
        pattern: /(analysis|assessment|review|audit|evaluation)/i,
        target: 'docs/analysis/',
        description: 'Analysis documents and assessments'
      },
      
      // Research materials  
      {
        pattern: /(research|study|investigation|exploration|google|claude|openai)/i,
        target: 'docs/research/',
        description: 'Research materials and investigations'
      },
      
      // Generated reports
      {
        pattern: /(report|summary|completion|final|results)/i,
        target: 'docs/reports/',
        description: 'Generated reports and summaries'
      },
      
      // Temporary and test files
      {
        pattern: /(temp|test|tmp|experimental|draft|work)/i,
        target: 'docs/temp/',
        description: 'Temporary and experimental files'
      },
      
      // Archive materials
      {
        pattern: /(archive|backup|old|legacy|deprecated)/i,
        target: 'docs/archives/',
        description: 'Archived and legacy materials'
      },
      
      // Development and implementation
      {
        pattern: /(implementation|development|coding|plan|strategy)/i,
        target: 'docs/development/',
        description: 'Development and implementation documents'
      },
      
      // Security-related
      {
        pattern: /(security|vulnerability|audit|compliance|safety)/i,
        target: 'docs/security/',
        description: 'Security-related documentation'
      }
    ];
    
    // SAFETY CONFIGURATION
    this.safety = {
      requireConfirmation: true,    // Ask before moving files
      createBackups: true,          // Backup before moving
      preserveImportant: true,      // Never auto-delete important files
      maxBatchSize: 10             // Max files to process at once
    };
  }

  /**
   * Main method - scan and organize files
   */
  async organizeFiles() {
    try {
      console.log(`🤖 ${this.name}: Starting file organization...`);
      
      const results = {
        scanned: 0,
        organized: 0,
        skipped: 0,
        errors: 0,
        actions: []
      };

      // Scan core directories for rogue files
      const rogueFiles = await this.scanForRogueFiles();
      results.scanned = rogueFiles.length;

      if (rogueFiles.length === 0) {
        console.log(`✅ ${this.name}: All files are properly organized!`);
        return results;
      }

      // Process rogue files (respecting safety limits)
      const filesToProcess = rogueFiles.slice(0, this.safety.maxBatchSize);
      
      for (const fileInfo of filesToProcess) {
        try {
          const action = await this.processRogueFile(fileInfo);
          results.actions.push(action);
          
          if (action.success) {
            results.organized++;
          } else {
            results.skipped++;
          }
        } catch (error) {
          console.error(`❌ Error processing ${fileInfo.current}:`, error.message);
          results.errors++;
        }
      }

      // Report remaining files if we hit the batch limit
      if (rogueFiles.length > this.safety.maxBatchSize) {
        console.log(`ℹ️  ${rogueFiles.length - this.safety.maxBatchSize} more files need organization. Run again to continue.`);
      }

      console.log(`✅ ${this.name}: Organization complete!`);
      return results;
      
    } catch (error) {
      console.error(`❌ ${this.name} failed:`, error.message);
      throw error;
    }
  }

  /**
   * Scan core directories for files that don't belong
   */
  async scanForRogueFiles() {
    const rogueFiles = [];

    // Check .ai/ directory
    if (await this.directoryExists('.ai')) {
      const aiFiles = await this.getDirectoryFiles('.ai');
      for (const file of aiFiles) {
        const basename = path.basename(file);
        if (!this.allowedFiles['.ai'].includes(basename)) {
          rogueFiles.push({
            current: file,
            directory: '.ai',
            basename: basename,
            classification: this.classifyFile(file)
          });
        }
      }
    }

    // Check .aicf/ directory  
    if (await this.directoryExists('.aicf')) {
      const aicfFiles = await this.getDirectoryFiles('.aicf');
      for (const file of aicfFiles) {
        const basename = path.basename(file);
        if (!this.allowedFiles['.aicf'].includes(basename)) {
          rogueFiles.push({
            current: file,
            directory: '.aicf',
            basename: basename,
            classification: this.classifyFile(file)
          });
        }
      }
    }

    return rogueFiles;
  }

  /**
   * Classify a file based on rules and suggest target location
   */
  classifyFile(filePath) {
    const basename = path.basename(filePath).toLowerCase();
    const dirname = path.dirname(filePath);

    // Try each classification rule
    for (const rule of this.classificationRules) {
      if (rule.pattern.test(basename)) {
        return {
          type: rule.description,
          suggestedTarget: rule.target + path.basename(filePath),
          confidence: 'high',
          rule: rule.description
        };
      }
    }

    // Default classification for unknown files
    return {
      type: 'unclassified',
      suggestedTarget: `docs/misc/${path.basename(filePath)}`,
      confidence: 'low',
      rule: 'default fallback'
    };
  }

  /**
   * Process a single rogue file
   */
  async processRogueFile(fileInfo) {
    const { current, classification } = fileInfo;
    const targetPath = path.join(this.projectRoot, classification.suggestedTarget);

    console.log(`📁 Processing: ${current}`);
    console.log(`   → Target: ${classification.suggestedTarget}`);
    console.log(`   → Reason: ${classification.rule}`);

    // Safety check - confirm before moving if enabled
    if (this.safety.requireConfirmation && !this.dryRun) {
      const confirmed = await this.confirmAction(fileInfo);
      if (!confirmed) {
        return {
          file: current,
          action: 'skipped',
          reason: 'user declined',
          success: false
        };
      }
    }

    if (this.dryRun) {
      return {
        file: current,
        action: 'would_move',
        target: classification.suggestedTarget,
        success: true
      };
    }

    try {
      // Ensure target directory exists
      await fs.mkdir(path.dirname(targetPath), { recursive: true });

      // Create backup if enabled
      if (this.safety.createBackups) {
        await this.createBackup(current);
      }

      // Move the file
      await fs.rename(current, targetPath);
      
      return {
        file: current,
        action: 'moved',
        target: classification.suggestedTarget,
        success: true
      };

    } catch (error) {
      return {
        file: current,
        action: 'failed',
        error: error.message,
        success: false
      };
    }
  }

  /**
   * Create backup of file before moving
   */
  async createBackup(filePath) {
    const backupDir = path.join(this.projectRoot, '.backups', 'file-organization');
    await fs.mkdir(backupDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `${path.basename(filePath)}.backup.${timestamp}`;
    const backupPath = path.join(backupDir, backupName);
    
    await fs.copyFile(filePath, backupPath);
    console.log(`💾 Backup created: ${backupPath}`);
  }

  /**
   * Confirm action with user (placeholder for CLI integration)
   */
  async confirmAction(fileInfo) {
    // In a real implementation, this would prompt the user
    // For now, return true for low-confidence moves, false for unknown
    return fileInfo.classification.confidence === 'high';
  }

  /**
   * Add a new allowed file to the configuration
   */
  async addAllowedFile(directory, filename, reason = '') {
    if (!this.allowedFiles[directory]) {
      throw new Error(`Unknown directory: ${directory}`);
    }

    if (this.allowedFiles[directory].includes(filename)) {
      console.log(`ℹ️  File ${filename} is already allowed in ${directory}`);
      return false;
    }

    this.allowedFiles[directory].push(filename);
    console.log(`✅ Added ${filename} to allowed files in ${directory}`);
    
    if (reason) {
      console.log(`   Reason: ${reason}`);
    }

    // TODO: Persist this change to a configuration file
    return true;
  }

  /**
   * Validate directory structure and report issues
   */
  async validateStructure() {
    const issues = [];

    // Check if core directories exist
    const coreDirs = ['.ai', '.aicf', 'docs'];
    for (const dir of coreDirs) {
      if (!(await this.directoryExists(dir))) {
        issues.push({
          type: 'missing_directory',
          directory: dir,
          severity: 'warning'
        });
      }
    }

    // Check for required files
    for (const [directory, files] of Object.entries(this.allowedFiles)) {
      if (await this.directoryExists(directory)) {
        const existingFiles = await this.getDirectoryFiles(directory);
        const existingBasenames = existingFiles.map(f => path.basename(f));
        
        for (const requiredFile of files) {
          if (!existingBasenames.includes(requiredFile)) {
            issues.push({
              type: 'missing_file',
              directory: directory,
              file: requiredFile,
              severity: 'info'
            });
          }
        }
      }
    }

    return issues;
  }

  // UTILITY METHODS

  async directoryExists(dirPath) {
    try {
      const fullPath = path.join(this.projectRoot, dirPath);
      const stats = await fs.stat(fullPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  async getDirectoryFiles(dirPath) {
    try {
      const fullPath = path.join(this.projectRoot, dirPath);
      const entries = await fs.readdir(fullPath, { withFileTypes: true });
      return entries
        .filter(entry => entry.isFile())
        .map(entry => path.join(dirPath, entry.name));
    } catch {
      return [];
    }
  }

  /**
   * Get current configuration as JSON (for external tools)
   */
  getConfiguration() {
    return {
      allowedFiles: this.allowedFiles,
      classificationRules: this.classificationRules,
      safety: this.safety
    };
  }
}

module.exports = FileOrganizationAgent;