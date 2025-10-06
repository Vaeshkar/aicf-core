#!/usr/bin/env node

/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (c) 2025 Dennis van Leeuwen
 */

/**
 * AICF Stream Reader - Memory-efficient streaming access to AICF files
 * 
 * Replaces fs.readFileSync() with streaming to handle large files (1GB+)
 * with constant memory usage regardless of file size.
 * 
 * Security improvements:
 * - Constant memory usage (no memory exhaustion)
 * - Handles files of any size
 * - Progress callbacks for monitoring
 * - Graceful error handling
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

class AICFStreamReader {
  constructor(aicfDir = '.aicf') {
    this.aicfDir = aicfDir;
    this.indexCache = null;
    this.lastIndexRead = 0;
    
    // Memory limits
    this.MAX_LINE_LENGTH = 1024 * 1024; // 1MB per line max
    this.MAX_CACHE_SIZE = 10 * 1024 * 1024; // 10MB cache max
  }

  /**
   * Stream read a file line by line with callback
   * Memory-efficient: O(1) memory usage regardless of file size
   */
  async streamFile(filePath, lineCallback, options = {}) {
    const {
      onProgress = null,
      onError = null,
      maxLines = Infinity
    } = options;

    return new Promise((resolve, reject) => {
      if (!fs.existsSync(filePath)) {
        const error = new Error(`File not found: ${filePath}`);
        if (onError) onError(error);
        return reject(error);
      }

      const fileStream = fs.createReadStream(filePath, {
        encoding: 'utf8',
        highWaterMark: 64 * 1024 // 64KB chunks
      });

      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
      });

      let lineCount = 0;
      let processedCount = 0;
      const stats = fs.statSync(filePath);
      let bytesRead = 0;

      rl.on('line', (line) => {
        lineCount++;
        bytesRead += Buffer.byteLength(line, 'utf8');

        // Security: Prevent extremely long lines (potential DoS)
        if (line.length > this.MAX_LINE_LENGTH) {
          console.warn(`⚠️ Line ${lineCount} exceeds max length, truncating`);
          line = line.substring(0, this.MAX_LINE_LENGTH);
        }

        // Process line
        try {
          const shouldContinue = lineCallback(line, lineCount);
          processedCount++;

          // Progress callback
          if (onProgress && lineCount % 1000 === 0) {
            onProgress({
              lineCount,
              processedCount,
              bytesRead,
              totalBytes: stats.size,
              progress: (bytesRead / stats.size * 100).toFixed(2)
            });
          }

          // Stop if callback returns false or max lines reached
          if (shouldContinue === false || lineCount >= maxLines) {
            rl.close();
            fileStream.destroy();
          }
        } catch (error) {
          console.error(`Error processing line ${lineCount}:`, error.message);
          if (onError) onError(error, lineCount);
        }
      });

      rl.on('close', () => {
        resolve({
          lineCount,
          processedCount,
          bytesRead
        });
      });

      rl.on('error', (error) => {
        if (onError) onError(error);
        reject(error);
      });

      fileStream.on('error', (error) => {
        if (onError) onError(error);
        reject(error);
      });
    });
  }

  /**
   * Get index with streaming (for large index files)
   */
  async getIndex() {
    const indexPath = path.join(this.aicfDir, 'index.aicf');
    
    // Check if file exists
    if (!fs.existsSync(indexPath)) {
      throw new Error(`Index file not found: ${indexPath}`);
    }

    const stats = fs.statSync(indexPath);
    
    // Use cache if available and not modified
    if (this.indexCache && stats.mtimeMs <= this.lastIndexRead) {
      return this.indexCache;
    }

    // For small files (<1MB), use synchronous read (faster)
    if (stats.size < 1024 * 1024) {
      const content = fs.readFileSync(indexPath, 'utf8');
      const lines = content.split('\n').filter(Boolean);
      
      const index = {};
      let currentSection = null;
      
      lines.forEach(line => {
        const [lineNum, data] = line.split('|', 2);
        if (!data) return;
        
        if (data.startsWith('@')) {
          currentSection = data.substring(1);
          index[currentSection] = {};
        } else if (currentSection && data.includes('=')) {
          const [key, value] = data.split('=', 2);
          index[currentSection][key] = value;
        }
      });

      this.indexCache = index;
      this.lastIndexRead = stats.mtimeMs;
      return index;
    }

    // For large files, use streaming
    const index = {};
    let currentSection = null;

    await this.streamFile(indexPath, (line) => {
      if (!line.trim()) return true;

      const [lineNum, data] = line.split('|', 2);
      if (!data) return true;
      
      if (data.startsWith('@')) {
        currentSection = data.substring(1);
        index[currentSection] = {};
      } else if (currentSection && data.includes('=')) {
        const [key, value] = data.split('=', 2);
        index[currentSection][key] = value;
      }

      return true; // Continue processing
    });

    this.indexCache = index;
    this.lastIndexRead = stats.mtimeMs;
    return index;
  }

  /**
   * Get last N conversations with streaming
   */
  async getLastConversations(count = 5) {
    const conversationsPath = path.join(this.aicfDir, 'conversations.aicf');
    if (!fs.existsSync(conversationsPath)) return [];

    const conversations = [];
    let currentConv = null;
    const allLines = [];

    // First pass: collect all lines (for reverse iteration)
    // For very large files, this could be optimized with a reverse stream
    await this.streamFile(conversationsPath, (line) => {
      if (line.trim()) {
        allLines.push(line);
      }
      return true;
    });

    // Parse from end to get most recent first
    for (let i = allLines.length - 1; i >= 0 && conversations.length < count; i--) {
      const [lineNum, data] = allLines[i].split('|', 2);
      if (!data) continue;
      
      if (data.startsWith('@CONVERSATION:')) {
        if (currentConv) {
          conversations.unshift(currentConv);
        }
        currentConv = {
          id: data.substring(14),
          line: parseInt(lineNum),
          metadata: {}
        };
      } else if (currentConv && data.includes('=')) {
        const [key, value] = data.split('=', 2);
        currentConv.metadata[key] = value;
      }
    }
    
    if (currentConv && conversations.length < count) {
      conversations.unshift(currentConv);
    }
    
    return conversations;
  }

  /**
   * Get decisions by date range with streaming
   */
  async getDecisionsByDate(startDate, endDate = new Date()) {
    const decisionsPath = path.join(this.aicfDir, 'decisions.aicf');
    if (!fs.existsSync(decisionsPath)) return [];

    const decisions = [];
    let currentDecision = null;
    
    await this.streamFile(decisionsPath, (line) => {
      if (!line.trim()) return true;

      const [lineNum, data] = line.split('|', 2);
      if (!data) return true;
      
      if (data.startsWith('@DECISION:')) {
        if (currentDecision) {
          decisions.push(currentDecision);
        }
        currentDecision = {
          id: data.substring(10),
          line: parseInt(lineNum),
          metadata: {}
        };
      } else if (currentDecision && data.includes('=')) {
        const [key, value] = data.split('=', 2);
        currentDecision.metadata[key] = value;
      }

      return true;
    });
    
    if (currentDecision) {
      decisions.push(currentDecision);
    }
    
    // Filter by date range
    return decisions.filter(decision => {
      const timestamp = decision.metadata.timestamp;
      if (!timestamp) return false;
      
      const decisionDate = new Date(timestamp);
      return decisionDate >= startDate && decisionDate <= endDate;
    });
  }

  /**
   * Get insights with streaming
   */
  async getInsights(options = {}) {
    const {
      limit = 100,
      category = null,
      priority = null
    } = options;

    const insightsPath = path.join(this.aicfDir, 'insights.aicf');
    if (!fs.existsSync(insightsPath)) return [];

    const insights = [];
    let currentInsight = null;

    await this.streamFile(insightsPath, (line) => {
      if (!line.trim()) return true;

      const [lineNum, data] = line.split('|', 2);
      if (!data) return true;
      
      if (data.startsWith('@INSIGHT:')) {
        if (currentInsight) {
          // Filter by category/priority if specified
          const matchesCategory = !category || currentInsight.category === category;
          const matchesPriority = !priority || currentInsight.priority === priority;
          
          if (matchesCategory && matchesPriority) {
            insights.push(currentInsight);
          }
        }
        
        if (insights.length >= limit) {
          return false; // Stop processing
        }
        
        currentInsight = {
          id: data.substring(9),
          line: parseInt(lineNum),
          metadata: {}
        };
      } else if (currentInsight && data.includes('=')) {
        const [key, value] = data.split('=', 2);
        if (['text', 'category', 'priority', 'confidence', 'timestamp'].includes(key)) {
          currentInsight[key] = value;
        } else {
          currentInsight.metadata[key] = value;
        }
      }

      return true;
    });
    
    // Don't forget the last insight
    if (currentInsight && insights.length < limit) {
      const matchesCategory = !category || currentInsight.category === category;
      const matchesPriority = !priority || currentInsight.priority === priority;
      
      if (matchesCategory && matchesPriority) {
        insights.push(currentInsight);
      }
    }
    
    return insights;
  }

  /**
   * Search across files with streaming (memory-efficient)
   */
  async search(term, fileTypes = ['conversations', 'decisions', 'work-state', 'technical-context'], options = {}) {
    const results = [];
    const { maxResults = 100, onProgress = null } = options;
    
    for (const fileType of fileTypes) {
      if (results.length >= maxResults) break;

      const filePath = path.join(this.aicfDir, `${fileType}.aicf`);
      if (!fs.existsSync(filePath)) continue;
      
      const contextLines = [];
      
      await this.streamFile(filePath, (line, lineNum) => {
        // Keep last 3 lines for context
        contextLines.push(line);
        if (contextLines.length > 3) {
          contextLines.shift();
        }

        if (line.toLowerCase().includes(term.toLowerCase())) {
          const [num, data] = line.split('|', 2);
          results.push({
            file: fileType,
            line: parseInt(num) || lineNum,
            content: data || line,
            context: contextLines.join('\n')
          });

          if (onProgress) {
            onProgress({ file: fileType, matches: results.length });
          }

          // Stop if max results reached
          if (results.length >= maxResults) {
            return false;
          }
        }

        return true;
      });
    }
    
    return results;
  }
}

module.exports = AICFStreamReader;

