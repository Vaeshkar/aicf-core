/**
 * Intelligent File Manager
 * 
 * Prevents wasteful file overwrites by comparing existing files with new content.
 * Only creates/updates files when there are meaningful differences.
 */

import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';

export class IntelligentFileManager {
  constructor() {
    this.fileHashes = new Map();
    this.fileMetadata = new Map();
  }

  /**
   * Smart file creation - only create/update if content is meaningfully different
   */
  async smartWriteFile(filePath, newContent, language = 'text') {
    const fileExists = await fs.pathExists(filePath);
    // Store the original absolute path for return
    const absolutePath = path.resolve(filePath);
    
    // Calculate content hash for comparison
    const newHash = this.calculateContentHash(newContent);
    
    if (!fileExists) {
      // File doesn't exist - create it
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, newContent, 'utf8');
      
      this.fileHashes.set(filePath, newHash);
      this.fileMetadata.set(filePath, {
        created: new Date().toISOString(),
        language,
        size: newContent.length,
        lines: newContent.split('\n').length
      });
      
      return {
        action: 'created',
        path: absolutePath,
        reason: 'file_not_exists',
        size: newContent.length
      };
    }

    // File exists - check if update is needed
    const existingContent = await fs.readFile(filePath, 'utf8');
    const existingHash = this.calculateContentHash(existingContent);
    
    // Check if content is meaningfully different
    const diff = this.calculateContentDifference(existingContent, newContent);
    
    if (existingHash === newHash) {
      return {
        action: 'skipped',
        path: absolutePath,
        reason: 'identical_content',
        size: newContent.length
      };
    }

    if (this.isMinimalDifference(diff)) {
      return {
        action: 'skipped',
        path: absolutePath,
        reason: 'minimal_difference',
        size: newContent.length,
        difference: diff
      };
    }

    // Content is meaningfully different - update file
    await fs.copy(filePath, `${filePath}.backup-${Date.now()}`);
    await fs.writeFile(filePath, newContent, 'utf8');
    
    this.fileHashes.set(filePath, newHash);
    this.fileMetadata.set(filePath, {
      updated: new Date().toISOString(),
      language,
      size: newContent.length,
      lines: newContent.split('\n').length,
      previousSize: existingContent.length
    });

    return {
      action: 'updated',
      path: absolutePath,
      reason: 'content_changed',
      size: newContent.length,
      previousSize: existingContent.length,
      difference: diff
    };
  }

  /**
   * Calculate content hash for comparison
   */
  calculateContentHash(content) {
    // Normalize content for comparison (remove extra whitespace, comments)
    const normalized = content
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
      .replace(/\/\/.*$/gm, '') // Remove line comments
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }

  /**
   * Calculate meaningful content difference
   */
  calculateContentDifference(oldContent, newContent) {
    const oldLines = oldContent.split('\n').filter(line => line.trim());
    const newLines = newContent.split('\n').filter(line => line.trim());
    
    // Calculate added/removed/modified lines
    const added = newLines.filter(line => !oldLines.includes(line));
    const removed = oldLines.filter(line => !newLines.includes(line));
    const common = newLines.filter(line => oldLines.includes(line));
    
    return {
      linesAdded: added.length,
      linesRemoved: removed.length,
      linesCommon: common.length,
      totalOldLines: oldLines.length,
      totalNewLines: newLines.length,
      changeRatio: (added.length + removed.length) / Math.max(oldLines.length, 1),
      addedContent: added.slice(0, 3), // Sample of added lines
      removedContent: removed.slice(0, 3) // Sample of removed lines
    };
  }

  /**
   * Determine if difference is minimal and not worth updating
   */
  isMinimalDifference(diff) {
    // Skip update if changes are minimal
    if (diff.changeRatio < 0.1 && diff.linesAdded + diff.linesRemoved < 3) {
      return true;
    }

    // Skip if only whitespace/formatting changes
    if (diff.linesAdded === 0 && diff.linesRemoved === 0) {
      return true;
    }

    // Skip if changes are only comments or minor formatting
    const isOnlyComments = [...diff.addedContent, ...diff.removedContent]
      .every(line => line.trim().startsWith('//') || line.trim().startsWith('/*') || line.trim() === '');
    
    if (isOnlyComments) {
      return true;
    }

    return false;
  }

  /**
   * Analyze files that need to be created/updated
   */
  async analyzeFileUpdates(files, projectDir) {
    const analysis = {
      toCreate: [],
      toUpdate: [],
      toSkip: [],
      summary: {
        totalFiles: files.length,
        newFiles: 0,
        updatedFiles: 0,
        skippedFiles: 0,
        tokensSaved: 0
      }
    };

    for (const file of files) {
      const fullPath = path.join(projectDir, file.path);
      const fileExists = await fs.pathExists(fullPath);
      
      if (!fileExists) {
        analysis.toCreate.push(file);
        analysis.summary.newFiles++;
      } else {
        // Check if update is needed
        const existingContent = await fs.readFile(fullPath, 'utf8');
        const newHash = this.calculateContentHash(file.content);
        const existingHash = this.calculateContentHash(existingContent);
        
        if (existingHash === newHash) {
          analysis.toSkip.push({
            ...file,
            reason: 'identical_content',
            existingSize: existingContent.length
          });
          analysis.summary.skippedFiles++;
          analysis.summary.tokensSaved += Math.floor(file.content.length / 4); // Rough token estimate
        } else {
          const diff = this.calculateContentDifference(existingContent, file.content);
          
          if (this.isMinimalDifference(diff)) {
            analysis.toSkip.push({
              ...file,
              reason: 'minimal_difference',
              existingSize: existingContent.length,
              difference: diff
            });
            analysis.summary.skippedFiles++;
            analysis.summary.tokensSaved += Math.floor(file.content.length / 4);
          } else {
            analysis.toUpdate.push({
              ...file,
              existingSize: existingContent.length,
              difference: diff
            });
            analysis.summary.updatedFiles++;
          }
        }
      }
    }

    return analysis;
  }

  /**
   * Create intelligent file operations summary
   */
  generateOperationsSummary(analysis) {
    let summary = [
      `📊 INTELLIGENT FILE ANALYSIS:`,
      `   Total Files: ${analysis.summary.totalFiles}`,
      `   ✅ New Files: ${analysis.summary.newFiles}`,
      `   🔄 Updates Needed: ${analysis.summary.updatedFiles}`,
      `   ⏭️  Skipped (Identical): ${analysis.summary.skippedFiles}`,
      `   💰 Tokens Saved: ~${analysis.summary.tokensSaved}`
    ].join('\n');

    if (analysis.toSkip.length > 0) {
      summary += '\n\n📋 SKIPPED FILES:';
      analysis.toSkip.forEach(file => {
        summary += `\n   - ${file.path} (${file.reason})`;
      });
    }

    if (analysis.toUpdate.length > 0) {
      summary += '\n\n🔄 FILES TO UPDATE:';
      analysis.toUpdate.forEach(file => {
        const diff = file.difference;
        summary += `\n   - ${file.path} (+${diff.linesAdded}/-${diff.linesRemoved} lines)`;
      });
    }

    return summary;
  }

  /**
   * Execute smart file operations
   */
  async executeSmartFileOperations(files, projectDir) {
    const analysis = await this.analyzeFileUpdates(files, projectDir);
    
    console.log(this.generateOperationsSummary(analysis));
    
    const results = [];
    
    // Create new files
    for (const file of analysis.toCreate) {
      const result = await this.smartWriteFile(
        path.join(projectDir, file.path),
        file.content,
        file.language
      );
      results.push(result);
    }
    
    // Update existing files
    for (const file of analysis.toUpdate) {
      const result = await this.smartWriteFile(
        path.join(projectDir, file.path),
        file.content,
        file.language
      );
      results.push(result);
    }
    
    // Add skipped files to results
    for (const file of analysis.toSkip) {
      results.push({
        action: 'skipped',
        path: file.path,
        reason: file.reason,
        size: file.content.length
      });
    }
    
    return {
      results,
      summary: analysis.summary,
      operations: {
        created: results.filter(r => r.action === 'created').length,
        updated: results.filter(r => r.action === 'updated').length,
        skipped: results.filter(r => r.action === 'skipped').length
      }
    };
  }

  /**
   * Get file operation statistics
   */
  getFileStats() {
    return {
      totalFiles: this.fileMetadata.size,
      files: Array.from(this.fileMetadata.entries()).map(([path, metadata]) => ({
        path: path.relative(process.cwd(), path),
        ...metadata
      }))
    };
  }
}

export default IntelligentFileManager;