/**
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (c) 2025 Dennis van Leeuwen
 * 
 * AICF Linting - Detects format inconsistencies in AICF files
 * Validates against AICF 3.0 specification
 */

const fs = require('fs');
const path = require('path');

class AICFLinting {
  constructor() {
    this.name = 'AICFLinting';
    this.errors = [];
    this.warnings = [];
    this.suggestions = [];
  }

  /**
   * Lint an AICF file for format consistency
   */
  async lintFile(filePath) {
    this.errors = [];
    this.warnings = [];
    this.suggestions = [];

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      const analysis = this.analyzeFormat(lines, filePath);
      this.validateStructure(analysis, filePath);
      
      return {
        filePath,
        isValid: this.errors.length === 0,
        format: analysis.detectedFormat,
        errors: this.errors,
        warnings: this.warnings,
        suggestions: this.suggestions,
        statistics: analysis.statistics
      };

    } catch (error) {
      this.errors.push({
        type: 'FILE_ERROR',
        message: `Cannot read file: ${error.message}`,
        line: null
      });

      return {
        filePath,
        isValid: false,
        errors: this.errors,
        warnings: this.warnings,
        suggestions: this.suggestions
      };
    }
  }

  /**
   * Analyze the format style of the file
   */
  analyzeFormat(lines, filePath) {
    const analysis = {
      detectedFormat: 'UNKNOWN',
      sections: [],
      keyValuePairs: [],
      inconsistencies: [],
      statistics: {
        totalLines: lines.length,
        sectionLines: 0,
        keyValueLines: 0,
        emptyLines: 0,
        malformedLines: 0
      }
    };

    let currentSection = null;
    const formatPatterns = {
      aicf3: 0,      // @SECTION + key=value
      csv: 0,        // pipe delimited
      verbose: 0,    // decision_1=, rationale_1=
      mixed: 0       // inconsistent patterns
    };

    lines.forEach((line, index) => {
      const lineNum = index + 1;
      const trimmed = line.trim();

      if (trimmed === '') {
        analysis.statistics.emptyLines++;
        return;
      }

      // Section headers
      if (trimmed.startsWith('@')) {
        analysis.statistics.sectionLines++;
        currentSection = trimmed;
        analysis.sections.push({
          name: trimmed,
          line: lineNum,
          entries: []
        });
        formatPatterns.aicf3++;
        return;
      }

      // Pipe-delimited (CSV style)
      if (trimmed.includes('|') && trimmed.split('|').length > 3) {
        formatPatterns.csv++;
        analysis.statistics.malformedLines++;
        this.warnings.push({
          type: 'CSV_FORMAT_DETECTED',
          message: 'Pipe-delimited format detected - should use AICF 3.0 structure',
          line: lineNum,
          content: trimmed.substring(0, 50) + '...'
        });
        return;
      }

      // Key=value pairs
      if (trimmed.includes('=')) {
        const [key, value] = trimmed.split('=', 2);
        analysis.statistics.keyValueLines++;

        // Check for verbose format (decision_1=, rationale_1=, etc)
        if (key.match(/^(decision|rationale|impact)_\d+$/)) {
          formatPatterns.verbose++;
          this.warnings.push({
            type: 'VERBOSE_FORMAT_DETECTED',
            message: `Verbose key format detected: "${key}" - should use simple keys`,
            line: lineNum,
            suggestion: key.replace(/_\d+$/, '')
          });
        } else {
          formatPatterns.aicf3++;
        }

        analysis.keyValuePairs.push({
          key: key.trim(),
          value: value ? value.trim() : '',
          line: lineNum,
          section: currentSection
        });

        // Check for missing metadata
        if (this.isMissingMetadata(key, value)) {
          this.suggestions.push({
            type: 'MISSING_METADATA',
            message: `Key "${key}" could use more metadata`,
            line: lineNum,
            suggestion: this.suggestMetadata(key, value)
          });
        }
      } else {
        analysis.statistics.malformedLines++;
        this.errors.push({
          type: 'MALFORMED_LINE',
          message: 'Line does not follow AICF format (no section header, no key=value)',
          line: lineNum,
          content: trimmed
        });
      }
    });

    // Determine dominant format
    const maxPattern = Math.max(...Object.values(formatPatterns));
    if (formatPatterns.aicf3 === maxPattern) {
      analysis.detectedFormat = 'AICF_3.0';
    } else if (formatPatterns.csv === maxPattern) {
      analysis.detectedFormat = 'CSV_STYLE';
    } else if (formatPatterns.verbose === maxPattern) {
      analysis.detectedFormat = 'VERBOSE';
    } else {
      analysis.detectedFormat = 'MIXED';
    }

    // Check for mixed formats
    const nonZeroFormats = Object.values(formatPatterns).filter(v => v > 0).length;
    if (nonZeroFormats > 1) {
      analysis.inconsistencies.push('MIXED_FORMATS');
      this.errors.push({
        type: 'MIXED_FORMATS',
        message: `File contains ${nonZeroFormats} different format styles - should use consistent AICF 3.0`,
        line: null
      });
    }

    return analysis;
  }

  /**
   * Validate overall file structure
   */
  validateStructure(analysis, filePath) {
    const filename = path.basename(filePath);

    // File-specific validations
    if (filename === 'index.aicf') {
      this.validateIndexFile(analysis);
    } else if (filename === 'conversations.aicf') {
      this.validateConversationsFile(analysis);
    } else if (filename === 'decisions.aicf') {
      this.validateDecisionsFile(analysis);
    } else if (filename === 'tasks.aicf') {
      this.validateTasksFile(analysis);
    }

    // General structure validation
    if (analysis.sections.length === 0) {
      this.errors.push({
        type: 'NO_SECTIONS',
        message: 'AICF file must contain at least one @SECTION',
        line: null
      });
    }

    // Check for required metadata in each section
    analysis.sections.forEach(section => {
      if (!section.name.match(/^@[A-Z_]+$/)) {
        this.warnings.push({
          type: 'INVALID_SECTION_NAME',
          message: `Section "${section.name}" should use UPPERCASE with underscores`,
          line: section.line,
          suggestion: section.name.toUpperCase().replace(/[^A-Z_@]/g, '_')
        });
      }
    });
  }

  /**
   * Validate index.aicf specific requirements
   */
  validateIndexFile(analysis) {
    const requiredSections = ['@PROJECT', '@COUNTS', '@STATE'];
    const foundSections = analysis.sections.map(s => s.name);

    requiredSections.forEach(required => {
      if (!foundSections.includes(required)) {
        this.errors.push({
          type: 'MISSING_REQUIRED_SECTION',
          message: `index.aicf must contain ${required} section`,
          line: null
        });
      }
    });
  }

  /**
   * Validate conversations.aicf specific requirements
   */
  validateConversationsFile(analysis) {
    const conversationSections = analysis.sections.filter(s => s.name.startsWith('@CONVERSATION'));
    
    if (conversationSections.length === 0) {
      this.warnings.push({
        type: 'NO_CONVERSATIONS',
        message: 'conversations.aicf contains no @CONVERSATION sections',
        line: null
      });
    }

    // Check each conversation has required fields
    conversationSections.forEach(section => {
      const requiredFields = ['timestamp_start', 'timestamp_end', 'messages'];
      const sectionKeys = analysis.keyValuePairs
        .filter(kv => kv.section === section.name)
        .map(kv => kv.key);

      requiredFields.forEach(field => {
        if (!sectionKeys.includes(field)) {
          this.errors.push({
            type: 'MISSING_CONVERSATION_FIELD',
            message: `Conversation ${section.name} missing required field: ${field}`,
            line: section.line
          });
        }
      });
    });
  }

  /**
   * Validate decisions.aicf specific requirements  
   */
  validateDecisionsFile(analysis) {
    // Check for verbose format issues
    const verboseKeys = analysis.keyValuePairs.filter(kv => 
      kv.key.match(/^(decision|rationale|impact)_\d+$/)
    );

    if (verboseKeys.length > 0) {
      this.suggestions.push({
        type: 'CONVERT_TO_CLEAN_FORMAT',
        message: `${verboseKeys.length} verbose keys detected - should convert to clean AICF format`,
        line: null,
        suggestion: 'Use AICFPrettier to convert to standard format'
      });
    }
  }

  /**
   * Validate tasks.aicf specific requirements
   */
  validateTasksFile(analysis) {
    // Check for CSV format
    if (analysis.detectedFormat === 'CSV_STYLE') {
      this.suggestions.push({
        type: 'CONVERT_CSV_TO_AICF',
        message: 'CSV-style format detected - should convert to AICF structure',
        line: null,
        suggestion: 'Use @TASK sections with key=value pairs instead of pipe-delimited format'
      });
    }
  }

  /**
   * Check if key-value pair is missing important metadata
   */
  isMissingMetadata(key, value) {
    // Decision without timestamp
    if (key === 'decision' && !value.includes('timestamp')) {
      return true;
    }

    // Task without priority or status
    if (key === 'task' && (!value.includes('priority') && !value.includes('status'))) {
      return true;
    }

    // Conversation without required fields
    if (key.startsWith('conversation') && !value.includes('timestamp')) {
      return true;
    }

    return false;
  }

  /**
   * Suggest metadata improvements
   */
  suggestMetadata(key, value) {
    if (key === 'decision') {
      return 'Add timestamp, impact level, and confidence score';
    }
    if (key === 'task') {
      return 'Add priority, status, assignee, and deadline';
    }
    if (key.startsWith('conversation')) {
      return 'Add timestamp, participant count, and topic';
    }
    return 'Consider adding timestamp and contextual metadata';
  }

  /**
   * Lint all AICF files in a directory
   */
  async lintDirectory(aicfDir) {
    const results = [];
    
    try {
      const files = fs.readdirSync(aicfDir)
        .filter(file => file.endsWith('.aicf'))
        .map(file => path.join(aicfDir, file));

      for (const filePath of files) {
        const result = await this.lintFile(filePath);
        results.push(result);
      }

      return {
        directory: aicfDir,
        totalFiles: results.length,
        validFiles: results.filter(r => r.isValid).length,
        results: results,
        summary: this.generateSummary(results)
      };

    } catch (error) {
      return {
        directory: aicfDir,
        error: error.message,
        results: []
      };
    }
  }

  /**
   * Generate summary of linting results
   */
  generateSummary(results) {
    const summary = {
      totalFiles: results.length,
      validFiles: results.filter(r => r.isValid).length,
      totalErrors: results.reduce((sum, r) => sum + r.errors.length, 0),
      totalWarnings: results.reduce((sum, r) => sum + r.warnings.length, 0),
      totalSuggestions: results.reduce((sum, r) => sum + r.suggestions.length, 0),
      formatDistribution: {}
    };

    // Count format types
    results.forEach(result => {
      const format = result.format || 'UNKNOWN';
      summary.formatDistribution[format] = (summary.formatDistribution[format] || 0) + 1;
    });

    return summary;
  }
}

module.exports = AICFLinting;