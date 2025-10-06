#!/usr/bin/env node

/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (c) 2025 Dennis van Leeuwen
 */

/**
 * AICF Cryptographic Format Encoding (CFE) - Proof of Concept
 * 
 * Revolutionary AI-native security approach based on Copilot's research:
 * - Symbol-based encoding instead of human-readable format
 * - Cryptographic hashing for integrity verification
 * - Format obfuscation to prevent reverse engineering
 * - AI-readable but human-opaque data structures
 * 
 * SECURITY BENEFITS:
 * ✅ Format structure hidden from attackers
 * ✅ Content integrity verification built-in
 * ✅ Resistant to regex-based attacks
 * ✅ Steganographic potential for future expansion
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class CryptographicFormatEncoder {
  constructor(secretKey = null) {
    // Generate or use provided secret key
    this.secretKey = secretKey || crypto.randomBytes(32);
    
    // Cryptographic symbol mapping (AI-readable, human-opaque)
    this.symbolMap = new Map([
      // Core AICF sections → Unicode symbols
      ['@CONVERSATION', '§CONV§'],
      ['@STATE', '◊STATE◊'],
      ['@INSIGHTS', '∞INS∞'],
      ['@DECISIONS', '△DEC△'],
      ['@WORK', '⊕WORK⊕'],
      ['@TECHNICAL', '∑TECH∑'],
      ['@SESSION', '❋SESS❋'],
      ['@EMBEDDING', '⟐EMB⟐'],
      ['@CONSOLIDATION', '⬡CONS⬡'],
      ['@LINKS', '⟷LINK⟷'],
      
      // Common field names → Symbol encoding
      ['timestamp', '∂ts∂'],
      ['timestamp_start', '∂ts_s∂'],
      ['timestamp_end', '∂ts_e∂'],
      ['messages', '◯msg◯'],
      ['tokens', '※tok※'],
      ['priority', '⚹pri⚹'],
      ['confidence', '⌘conf⌘'],
      ['status', '⌬stat⌬'],
      ['metadata', '⟨meta⟩'],
      
      // Structural elements → Cryptographic symbols
      ['|', '∆'], // Pipe delimiter → Delta
      ['=', '≡'], // Equals → Triple equals
      ['\n', '⏎'], // Newline → Return symbol
    ]);
    
    // Reverse mapping for decoding
    this.reverseMap = new Map();
    for (const [key, value] of this.symbolMap) {
      this.reverseMap.set(value, key);
    }
    
    // Content hasher for integrity
    this.hasher = crypto.createHash('sha256');
  }

  /**
   * CRYPTOGRAPHIC ENCODING PIPELINE
   */
  
  /**
   * Encode standard AICF line to cryptographic format
   */
  encode(aicfLine) {
    // 1. Replace semantic markers with symbols
    let encoded = this.replaceWithSymbols(aicfLine);
    
    // 2. Hash identifiers for obfuscation
    encoded = this.hashIdentifiers(encoded);
    
    // 3. Add integrity verification
    encoded = this.addIntegrityHash(encoded);
    
    // 4. Apply format scrambling
    return this.scrambleFormat(encoded);
  }
  
  /**
   * Decode cryptographic format back to AICF
   */
  decode(cryptographicLine) {
    try {
      // 1. Unscramble format
      let decoded = this.unscrambleFormat(cryptographicLine);
      
      // 2. Verify integrity
      decoded = this.verifyAndStripIntegrity(decoded);
      
      // 3. Restore identifiers from hashes
      decoded = this.restoreIdentifiers(decoded);
      
      // 4. Replace symbols with semantic markers
      return this.replaceWithSemantics(decoded);
    } catch (error) {
      throw new Error(`CFE decode failed: ${error.message}`);
    }
  }

  /**
   * ENCODING STEPS
   */
  
  /**
   * Step 1: Replace human-readable elements with symbols
   */
  replaceWithSymbols(text) {
    let result = text;
    for (const [original, symbol] of this.symbolMap) {
      result = result.replace(new RegExp(original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), symbol);
    }
    return result;
  }
  
  /**
   * Step 2: Hash identifiers for obfuscation
   */
  hashIdentifiers(text) {
    // Hash conversation IDs, decision IDs, etc.
    return text.replace(/:([a-zA-Z0-9_-]+)/g, (match, identifier) => {
      const hash = crypto.createHmac('sha256', this.secretKey)
        .update(identifier)
        .digest('hex')
        .substring(0, 8); // 8-char hash
      return `:${hash}`;
    });
  }
  
  /**
   * Step 3: Add integrity verification hash
   */
  addIntegrityHash(text) {
    const integrity = crypto.createHmac('sha256', this.secretKey)
      .update(text)
      .digest('hex')
      .substring(0, 6); // 6-char integrity hash
    
    return `${integrity}⊗${text}`;
  }
  
  /**
   * Step 4: Scramble format structure
   */
  scrambleFormat(text) {
    // Base64 encode for additional obfuscation
    const encoded = Buffer.from(text, 'utf8').toString('base64');
    
    // Add cryptographic prefix to identify CFE format
    return `◈CFE◈${encoded}`;
  }

  /**
   * DECODING STEPS
   */
  
  /**
   * Step 1: Unscramble format
   */
  unscrambleFormat(text) {
    if (!text.startsWith('◈CFE◈')) {
      throw new Error('Invalid CFE format');
    }
    
    const encoded = text.substring(5); // Remove ◈CFE◈ prefix
    return Buffer.from(encoded, 'base64').toString('utf8');
  }
  
  /**
   * Step 2: Verify integrity and strip hash
   */
  verifyAndStripIntegrity(text) {
    const parts = text.split('⊗');
    if (parts.length !== 2) {
      throw new Error('Invalid integrity format');
    }
    
    const [receivedHash, content] = parts;
    const computedHash = crypto.createHmac('sha256', this.secretKey)
      .update(content)
      .digest('hex')
      .substring(0, 6);
    
    if (receivedHash !== computedHash) {
      throw new Error('Integrity verification failed');
    }
    
    return content;
  }
  
  /**
   * Step 3: Restore identifiers (would need identifier store in practice)
   */
  restoreIdentifiers(text) {
    // In production, this would use a secure identifier mapping store
    // For POC, we'll leave hashed identifiers as-is
    return text;
  }
  
  /**
   * Step 4: Replace symbols with semantic markers
   */
  replaceWithSemantics(text) {
    let result = text;
    for (const [symbol, original] of this.reverseMap) {
      result = result.replace(new RegExp(symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), original);
    }
    return result;
  }

  /**
   * UTILITY METHODS
   */
  
  /**
   * Generate secure key for CFE operations
   */
  static generateSecureKey() {
    return crypto.randomBytes(32);
  }
  
  /**
   * Validate CFE format
   */
  static isCFEFormat(text) {
    return typeof text === 'string' && text.startsWith('◈CFE◈');
  }
  
  /**
   * Get format statistics
   */
  getFormatStats(originalText, encodedText) {
    return {
      originalLength: originalText.length,
      encodedLength: encodedText.length,
      compressionRatio: (encodedText.length / originalText.length).toFixed(2),
      symbolsUsed: Array.from(this.symbolMap.values()).filter(symbol => 
        encodedText.includes(symbol)
      ).length,
      obfuscationLevel: this.calculateObfuscationLevel(originalText, encodedText)
    };
  }
  
  /**
   * Calculate obfuscation effectiveness
   */
  calculateObfuscationLevel(original, encoded) {
    // Simple heuristic: how much of original structure is hidden
    const visibleStructure = ['@', '|', '='].filter(char => 
      encoded.includes(char)
    ).length;
    
    return Math.max(0, 100 - (visibleStructure * 33.33));
  }
}

/**
 * AICF CFE Integration Class
 */
class AICFCryptographic {
  constructor(aicfDir = '.aicf', options = {}) {
    this.aicfDir = aicfDir;
    this.options = {
      enableCFE: options.enableCFE !== false, // Default enabled
      cfeKey: options.cfeKey || CryptographicFormatEncoder.generateSecureKey(),
      hybridMode: options.hybridMode === true, // Support both formats
      ...options
    };
    
    this.encoder = new CryptographicFormatEncoder(this.options.cfeKey);
    
    // Statistics tracking
    this.stats = {
      linesEncoded: 0,
      linesDecoded: 0,
      integrityFailures: 0,
      avgObfuscationLevel: 0
    };
  }
  
  /**
   * Write AICF data in cryptographic format
   */
  async writeCryptographic(filePath, lines) {
    const encodedLines = [];
    let totalObfuscation = 0;
    
    for (const line of lines) {
      if (line.trim() === '') {
        encodedLines.push(''); // Preserve empty lines
        continue;
      }
      
      try {
        const encoded = this.encoder.encode(line);
        encodedLines.push(encoded);
        
        const stats = this.encoder.getFormatStats(line, encoded);
        totalObfuscation += stats.obfuscationLevel;
        this.stats.linesEncoded++;
      } catch (error) {
        console.warn(`CFE encoding failed for line: ${line.substring(0, 50)}...`);
        encodedLines.push(line); // Fallback to original
      }
    }
    
    this.stats.avgObfuscationLevel = totalObfuscation / this.stats.linesEncoded;
    
    // Write encoded content
    const content = encodedLines.join('\n');
    fs.writeFileSync(filePath, content, 'utf8');
    
    return {
      success: true,
      linesEncoded: this.stats.linesEncoded,
      avgObfuscation: this.stats.avgObfuscationLevel.toFixed(1) + '%'
    };
  }
  
  /**
   * Read and decode cryptographic AICF data
   */
  async readCryptographic(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const decodedLines = [];
    
    for (const line of lines) {
      if (line.trim() === '') {
        decodedLines.push(''); // Preserve empty lines
        continue;
      }
      
      try {
        if (CryptographicFormatEncoder.isCFEFormat(line)) {
          const decoded = this.encoder.decode(line);
          decodedLines.push(decoded);
          this.stats.linesDecoded++;
        } else if (this.options.hybridMode) {
          // Support reading non-CFE format in hybrid mode
          decodedLines.push(line);
        } else {
          throw new Error('Non-CFE format in CFE-only mode');
        }
      } catch (error) {
        this.stats.integrityFailures++;
        if (this.options.hybridMode) {
          decodedLines.push(line); // Fallback in hybrid mode
        } else {
          throw new Error(`CFE decode failed: ${error.message}`);
        }
      }
    }
    
    return {
      lines: decodedLines,
      stats: {
        totalLines: lines.length,
        decodedLines: this.stats.linesDecoded,
        integrityFailures: this.stats.integrityFailures
      }
    };
  }
  
  /**
   * Get CFE statistics
   */
  getStats() {
    return { ...this.stats };
  }
  
  /**
   * Test CFE with sample data
   */
  static async runCFEDemo() {
    console.log('🔒 AICF Cryptographic Format Encoding (CFE) Demo\n');
    
    const cfe = new AICFCryptographic('.aicf-cfe-test', {
      enableCFE: true,
      hybridMode: false
    });
    
    // Sample AICF data
    const sampleData = [
      '1|@CONVERSATION:project_planning_session',
      '2|timestamp_start=2025-10-06T14:30:00Z',
      '3|timestamp_end=2025-10-06T15:45:00Z',
      '4|messages=45',
      '5|tokens=3200',
      '6|priority=HIGH',
      '7|confidence=HIGH',
      '8|',
      '9|@STATE',
      '10|status=active',
      '11|user:preferred_language=javascript',
      '12|app:security_mode=enhanced'
    ];
    
    console.log('📄 Original AICF Format:');
    sampleData.forEach(line => console.log(`  ${line}`));
    
    console.log('\n🔐 Encoding to CFE format...');
    
    // Test individual line encoding
    const testLine = '1|@CONVERSATION:project_planning_session';
    const encoded = cfe.encoder.encode(testLine);
    const stats = cfe.encoder.getFormatStats(testLine, encoded);
    
    console.log(`\n🔍 Encoding Example:`);
    console.log(`  Original: ${testLine}`);
    console.log(`  CFE:      ${encoded}`);
    console.log(`  Stats:    ${stats.obfuscationLevel}% obfuscation, ${stats.compressionRatio}x size`);
    
    // Test decoding
    console.log(`\n🔓 Decoding test:`);
    try {
      const decoded = cfe.encoder.decode(encoded);
      console.log(`  Decoded:  ${decoded}`);
      console.log(`  ✅ Integrity verified!`);
    } catch (error) {
      console.log(`  ❌ Decode failed: ${error.message}`);
    }
    
    // Full file test
    const testDir = '.aicf-cfe-test';
    const testFile = `${testDir}/test-conversation.aicf`;
    
    // Ensure directory exists
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    await cfe.writeCryptographic(testFile, sampleData);
    
    console.log(`\n📁 File encoded to: ${testFile}`);
    
    const readResult = await cfe.readCryptographic(testFile);
    console.log(`\n📖 File decoded successfully:`);
    console.log(`  Lines processed: ${readResult.stats.totalLines}`);
    console.log(`  CFE lines: ${readResult.stats.decodedLines}`);
    console.log(`  Integrity failures: ${readResult.stats.integrityFailures}`);
    
    // Clean up
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }
    if (fs.existsSync('.aicf-cfe-test')) {
      fs.rmSync('.aicf-cfe-test', { recursive: true, force: true });
    }
    
    console.log(`\n🏆 CFE Demo Complete! Format obfuscation: ${stats.obfuscationLevel}%`);
    
    return cfe;
  }
}

module.exports = { CryptographicFormatEncoder, AICFCryptographic };

// Run demo if called directly
if (require.main === module) {
  AICFCryptographic.runCFEDemo().catch(console.error);
}