/**
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (c) 2025 Dennis van Leeuwen
 * 
 * AICF Prettier - Converts any AICF-like format to clean AICF 3.0 specification
 * Preserves all data while standardizing format
 */

const fs = require('fs');
const path = require('path');
const AICFWriter = require('./aicf-writer');

class AICFPrettier {
  constructor() {
    this.name = 'AICFPrettier';
  }

  /**
   * Convert any AICF format to clean AICF 3.0
   */
  async prettifyFile(inputPath, outputPath = null) {
    if (!outputPath) {
      outputPath = inputPath; // Overwrite original
    }

    try {
      const content = fs.readFileSync(inputPath, 'utf8');
      const parsed = this.parseAnyFormat(content);
      const prettified = this.convertToAICF3(parsed);
      
      // Write using AICFWriter for consistency
      fs.writeFileSync(outputPath, prettified);
      
      return {
        success: true,
        inputPath,
        outputPath,
        originalFormat: parsed.detectedFormat,
        sectionsConverted: parsed.sections.length,
        entriesConverted: parsed.entries.length,
        preservedMetadata: parsed.preservedMetadata
      };

    } catch (error) {
      return {
        success: false,
        inputPath,
        error: error.message
      };
    }
  }

  /**
   * Parse any AICF-like format and extract structured data
   */
  parseAnyFormat(content) {
    const lines = content.split('\n');
    const parsed = {
      detectedFormat: 'UNKNOWN',
      sections: [],
      entries: [],
      preservedMetadata: {}
    };

    let currentSection = null;
    let isCSVMode = false;
    let csvHeaders = [];

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed === '') return;

      // Detect format patterns
      if (trimmed.startsWith('@')) {
        // Section header
        currentSection = {
          name: this.cleanSectionName(trimmed),
          originalName: trimmed,
          line: index + 1,
          entries: []
        };
        parsed.sections.push(currentSection);
        parsed.detectedFormat = 'AICF_STYLE';
        isCSVMode = false;

      } else if (trimmed.includes('|') && trimmed.split('|').length > 3) {
        // CSV/Pipe-delimited format
        if (trimmed.includes('T#|PRIORITY|EFFORT')) {
          // Header row
          csvHeaders = trimmed.split('|');
          isCSVMode = true;
          parsed.detectedFormat = 'CSV_STYLE';
          
          if (!currentSection) {
            currentSection = {
              name: '@TASKS',
              originalName: '@TASKS',
              line: index + 1,
              entries: []
            };
            parsed.sections.push(currentSection);
          }
        } else if (isCSVMode && csvHeaders.length > 0) {
          // Data row
          const values = trimmed.split('|');
          const entry = this.convertCSVRowToEntry(csvHeaders, values, index + 1);
          if (entry) {
            currentSection.entries.push(entry);
            parsed.entries.push(entry);
          }
        }

      } else if (trimmed.includes('=')) {
        // Key=value format
        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=').trim();
        
        const entry = {
          key: this.cleanKey(key.trim()),
          value: value,
          originalKey: key.trim(),
          line: index + 1,
          section: currentSection ? currentSection.name : '@GENERAL'
        };

        // Handle verbose formats (decision_1=, rationale_1=, etc)
        if (key.match(/^(decision|rationale|impact|timestamp)_\d+$/)) {
          parsed.detectedFormat = 'VERBOSE_STYLE';
          entry.verboseIndex = key.match(/_(\d+)$/)[1];
          entry.key = key.replace(/_\d+$/, '');
        }

        if (currentSection) {
          currentSection.entries.push(entry);
        }
        parsed.entries.push(entry);
      }
    });

    // If no format detected, assume basic AICF
    if (parsed.detectedFormat === 'UNKNOWN' && parsed.sections.length > 0) {
      parsed.detectedFormat = 'AICF_STYLE';
    }

    return parsed;
  }

  /**
   * Convert CSV row to structured entry
   */
  convertCSVRowToEntry(headers, values, lineNum) {
    if (headers.length !== values.length) {
      return null; // Skip malformed rows
    }

    const entry = {
      key: 'task',
      value: '',
      line: lineNum,
      metadata: {},
      csvData: {}
    };

    headers.forEach((header, index) => {
      const value = values[index]?.trim() || '';
      const cleanHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '_');
      
      entry.csvData[cleanHeader] = value;
      
      // Map important fields
      if (header === 'TASK') {
        entry.value = value;
      } else if (header === 'STATUS') {
        entry.metadata.status = value;
      } else if (header === 'PRIORITY') {
        entry.metadata.priority = value;
      } else if (header === 'EFFORT') {
        entry.metadata.effort = value;
      } else if (header === 'ASSIGNED') {
        entry.metadata.assignee = value;
      } else if (header === 'CREATED') {
        entry.metadata.created = value;
      } else if (header === 'COMPLETED') {
        entry.metadata.completed = value;
      } else {
        entry.metadata[cleanHeader] = value;
      }
    });

    return entry;
  }

  /**
   * Convert parsed data to clean AICF 3.0 format
   */
  convertToAICF3(parsed) {
    const lines = [];
    
    // Group entries by section
    const sectionMap = new Map();
    
    parsed.entries.forEach(entry => {
      const sectionName = entry.section || '@GENERAL';
      if (!sectionMap.has(sectionName)) {
        sectionMap.set(sectionName, []);
      }
      sectionMap.get(sectionName).push(entry);
    });

    // Handle verbose format grouping (decision_1, rationale_1, impact_1 -> one entry)
    if (parsed.detectedFormat === 'VERBOSE_STYLE') {
      this.groupVerboseEntries(sectionMap);
    }

    // Generate clean AICF 3.0 format
    for (const [sectionName, entries] of sectionMap) {
      if (entries.length === 0) continue;

      lines.push(sectionName);
      
      if (parsed.detectedFormat === 'CSV_STYLE') {
        // Convert CSV entries to clean key=value format
        entries.forEach((entry, index) => {
          const taskId = entry.csvData.t_ || (index + 1);
          lines.push(`task_id=${taskId}`);
          lines.push(`description=${entry.value}`);
          
          Object.entries(entry.metadata).forEach(([key, value]) => {
            if (value && value !== '' && value !== 'None') {
              lines.push(`${key}=${value}`);
            }
          });
          
          lines.push(''); // Separator between tasks
        });
      } else {
        // Standard key=value entries
        entries.forEach(entry => {
          lines.push(`${entry.key}=${entry.value}`);
          
          // Add metadata if present
          if (entry.metadata) {
            Object.entries(entry.metadata).forEach(([key, value]) => {
              if (value && value !== '' && value !== 'None') {
                lines.push(`${key}=${value}`);
              }
            });
          }
        });
      }
      
      lines.push(''); // Empty line after section
    }

    return lines.join('\n').trim() + '\n';
  }

  /**
   * Group verbose entries (decision_1, rationale_1, impact_1) into single decisions
   */
  groupVerboseEntries(sectionMap) {
    for (const [sectionName, entries] of sectionMap) {
      if (!sectionName.includes('DECISION')) continue;

      const grouped = new Map();
      const newEntries = [];

      entries.forEach(entry => {
        if (entry.verboseIndex) {
          const index = entry.verboseIndex;
          if (!grouped.has(index)) {
            grouped.set(index, {
              key: 'decision',
              value: '',
              metadata: {},
              line: entry.line,
              section: sectionName
            });
          }
          
          const groupedEntry = grouped.get(index);
          if (entry.key === 'decision') {
            groupedEntry.value = entry.value;
          } else {
            groupedEntry.metadata[entry.key] = entry.value;
          }
        } else {
          newEntries.push(entry);
        }
      });

      // Replace entries with grouped ones
      newEntries.push(...Array.from(grouped.values()));
      sectionMap.set(sectionName, newEntries);
    }
  }

  /**
   * Clean section name to AICF 3.0 standard
   */
  cleanSectionName(sectionName) {
    // Remove any non-alphanumeric characters except @ and _
    let cleaned = sectionName.toUpperCase();
    cleaned = cleaned.replace(/[^A-Z0-9@_:]/g, '_');
    
    // Ensure it starts with @
    if (!cleaned.startsWith('@')) {
      cleaned = '@' + cleaned;
    }
    
    // Handle special cases
    const mappings = {
      '@DECISIONS_CHAT': '@DECISIONS',
      '@CONVERSATION_HOURGLASS': '@CONVERSATION',
      '@TASKS_': '@TASKS'
    };
    
    for (const [pattern, replacement] of Object.entries(mappings)) {
      if (cleaned.includes(pattern.replace('@', ''))) {
        return replacement;
      }
    }
    
    return cleaned;
  }

  /**
   * Clean key name to AICF 3.0 standard
   */
  cleanKey(key) {
    // Convert to lowercase, replace non-alphanumeric with underscores
    return key.toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  /**
   * Prettify all AICF files in a directory
   */
  async prettifyDirectory(aicfDir, options = {}) {
    const results = [];
    
    try {
      const files = fs.readdirSync(aicfDir)
        .filter(file => file.endsWith('.aicf'))
        .map(file => path.join(aicfDir, file));

      for (const filePath of files) {
        if (options.skipFiles && options.skipFiles.includes(path.basename(filePath))) {
          continue;
        }

        const result = await this.prettifyFile(filePath);
        results.push(result);

        if (result.success && options.verbose) {
          console.log(`✅ Prettified ${path.basename(filePath)}: ${result.originalFormat} → AICF_3.0`);
        }
      }

      return {
        directory: aicfDir,
        totalFiles: results.length,
        successfulFiles: results.filter(r => r.success).length,
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
   * Generate summary of prettification results
   */
  generateSummary(results) {
    const summary = {
      totalFiles: results.length,
      successfulFiles: results.filter(r => r.success).length,
      totalSectionsConverted: results.reduce((sum, r) => sum + (r.sectionsConverted || 0), 0),
      totalEntriesConverted: results.reduce((sum, r) => sum + (r.entriesConverted || 0), 0),
      formatConversions: {}
    };

    // Count format conversions
    results.forEach(result => {
      if (result.success && result.originalFormat) {
        const conversion = `${result.originalFormat} → AICF_3.0`;
        summary.formatConversions[conversion] = (summary.formatConversions[conversion] || 0) + 1;
      }
    });

    return summary;
  }

  /**
   * Validate prettified output
   */
  async validatePrettified(filePath) {
    try {
      const AICFLinting = require('./aicf-linting');
      const linter = new AICFLinting();
      const result = await linter.lintFile(filePath);
      
      return {
        isValid: result.isValid,
        errors: result.errors,
        warnings: result.warnings,
        format: result.format
      };
    } catch (error) {
      return {
        isValid: false,
        error: error.message
      };
    }
  }
}

module.exports = AICFPrettier;