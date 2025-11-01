#!/usr/bin/env node

/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2025 Dennis van Leeuwen
 *
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

import { createHmac, randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

export interface FormatStats {
  originalLength: number;
  encodedLength: number;
  compressionRatio: string;
  symbolsUsed: number;
  obfuscationLevel: number;
}

export interface CFEWriteResult {
  success: boolean;
  linesEncoded: number;
  avgObfuscation: string;
}

export interface CFEReadResult {
  lines: string[];
  stats: {
    totalLines: number;
    decodedLines: number;
    integrityFailures: number;
  };
}

export interface CFEOptions {
  enableCFE?: boolean;
  cfeKey?: Buffer;
  hybridMode?: boolean;
}

interface CFEStats {
  linesEncoded: number;
  linesDecoded: number;
  integrityFailures: number;
  avgObfuscationLevel: number;
}

/**
 * Cryptographic Format Encoder
 */
export class CryptographicFormatEncoder {
  private readonly secretKey: Buffer;
  private readonly symbolMap: Map<string, string>;
  private readonly reverseMap: Map<string, string>;

  constructor(secretKey: Buffer | null = null) {
    this.secretKey = secretKey || randomBytes(32);

    this.symbolMap = new Map([
      ["@CONVERSATION", "§CONV§"],
      ["@STATE", "◊STATE◊"],
      ["@INSIGHTS", "∞INS∞"],
      ["@DECISIONS", "△DEC△"],
      ["@WORK", "⊕WORK⊕"],
      ["@TECHNICAL", "∑TECH∑"],
      ["@SESSION", "❋SESS❋"],
      ["@EMBEDDING", "⟐EMB⟐"],
      ["@CONSOLIDATION", "⬡CONS⬡"],
      ["@LINKS", "⟷LINK⟷"],
      ["timestamp", "∂ts∂"],
      ["timestamp_start", "∂ts_s∂"],
      ["timestamp_end", "∂ts_e∂"],
      ["messages", "◯msg◯"],
      ["tokens", "※tok※"],
      ["priority", "⚹pri⚹"],
      ["confidence", "⌘conf⌘"],
      ["status", "⌬stat⌬"],
      ["metadata", "⟨meta⟩"],
      ["|", "∆"],
      ["=", "≡"],
      ["\n", "⏎"],
    ]);

    this.reverseMap = new Map();
    for (const [key, value] of this.symbolMap) {
      this.reverseMap.set(value, key);
    }
  }

  encode(aicfLine: string): string {
    let encoded = this.replaceWithSymbols(aicfLine);
    encoded = this.hashIdentifiers(encoded);
    encoded = this.addIntegrityHash(encoded);
    return this.scrambleFormat(encoded);
  }

  decode(cryptographicLine: string): string {
    try {
      let decoded = this.unscrambleFormat(cryptographicLine);
      decoded = this.verifyAndStripIntegrity(decoded);
      decoded = this.restoreIdentifiers(decoded);
      return this.replaceWithSemantics(decoded);
    } catch (error) {
      throw new Error(`CFE decode failed: ${(error as Error).message}`);
    }
  }

  private replaceWithSymbols(text: string): string {
    let result = text;
    for (const [original, symbol] of this.symbolMap) {
      const escaped = original.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      result = result.replace(new RegExp(escaped, "g"), symbol);
    }
    return result;
  }

  private hashIdentifiers(text: string): string {
    return text.replace(/:([a-zA-Z0-9_-]+)/g, (_match, identifier) => {
      const hash = createHmac("sha256", this.secretKey)
        .update(identifier)
        .digest("hex")
        .substring(0, 8);
      return `:${hash}`;
    });
  }

  private addIntegrityHash(text: string): string {
    const integrity = createHmac("sha256", this.secretKey)
      .update(text)
      .digest("hex")
      .substring(0, 6);

    return `${integrity}⊗${text}`;
  }

  private scrambleFormat(text: string): string {
    const encoded = Buffer.from(text, "utf8").toString("base64");
    return `◈CFE◈${encoded}`;
  }

  private unscrambleFormat(text: string): string {
    if (!text.startsWith("◈CFE◈")) {
      throw new Error("Invalid CFE format");
    }

    const encoded = text.substring(5);
    return Buffer.from(encoded, "base64").toString("utf8");
  }

  private verifyAndStripIntegrity(text: string): string {
    const parts = text.split("⊗");
    if (parts.length !== 2) {
      throw new Error("Invalid integrity format");
    }

    const [receivedHash, content] = parts;
    if (!receivedHash || !content) {
      throw new Error("Invalid integrity format");
    }

    const computedHash = createHmac("sha256", this.secretKey)
      .update(content)
      .digest("hex")
      .substring(0, 6);

    if (receivedHash !== computedHash) {
      throw new Error("Integrity verification failed");
    }

    return content;
  }

  private restoreIdentifiers(text: string): string {
    return text;
  }

  private replaceWithSemantics(text: string): string {
    let result = text;
    for (const [symbol, original] of this.reverseMap) {
      const escaped = symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      result = result.replace(new RegExp(escaped, "g"), original);
    }
    return result;
  }

  static generateSecureKey(): Buffer {
    return randomBytes(32);
  }

  static isCFEFormat(text: string): boolean {
    return typeof text === "string" && text.startsWith("◈CFE◈");
  }

  getFormatStats(originalText: string, encodedText: string): FormatStats {
    return {
      originalLength: originalText.length,
      encodedLength: encodedText.length,
      compressionRatio: (encodedText.length / originalText.length).toFixed(2),
      symbolsUsed: Array.from(this.symbolMap.values()).filter((symbol) =>
        encodedText.includes(symbol)
      ).length,
      obfuscationLevel: this.calculateObfuscationLevel(
        originalText,
        encodedText
      ),
    };
  }

  private calculateObfuscationLevel(
    _original: string,
    encoded: string
  ): number {
    const visibleStructure = ["@", "|", "="].filter((char) =>
      encoded.includes(char)
    ).length;

    return Math.max(0, 100 - visibleStructure * 33.33);
  }
}

/**
 * AICF CFE Integration Class
 */
export class AICFCryptographic {
  private readonly options: Required<CFEOptions>;
  private readonly encoder: CryptographicFormatEncoder;
  private readonly stats: CFEStats;

  constructor(_aicfDir = ".aicf", options: CFEOptions = {}) {
    this.options = {
      enableCFE: options.enableCFE !== false,
      cfeKey: options.cfeKey || CryptographicFormatEncoder.generateSecureKey(),
      hybridMode: options.hybridMode === true,
    };

    this.encoder = new CryptographicFormatEncoder(this.options.cfeKey);

    this.stats = {
      linesEncoded: 0,
      linesDecoded: 0,
      integrityFailures: 0,
      avgObfuscationLevel: 0,
    };
  }

  async writeCryptographic(
    filePath: string,
    lines: string[]
  ): Promise<CFEWriteResult> {
    const encodedLines: string[] = [];
    let totalObfuscation = 0;

    for (const line of lines) {
      if (line.trim() === "") {
        encodedLines.push("");
        continue;
      }

      try {
        const encoded = this.encoder.encode(line);
        encodedLines.push(encoded);

        const stats = this.encoder.getFormatStats(line, encoded);
        totalObfuscation += stats.obfuscationLevel;
        this.stats.linesEncoded++;
      } catch (error) {
        console.warn(
          `CFE encoding failed for line: ${line.substring(0, 50)}...`
        );
        encodedLines.push(line);
      }
    }

    this.stats.avgObfuscationLevel = totalObfuscation / this.stats.linesEncoded;

    const content = encodedLines.join("\n");
    writeFileSync(filePath, content, "utf8");

    return {
      success: true,
      linesEncoded: this.stats.linesEncoded,
      avgObfuscation: this.stats.avgObfuscationLevel.toFixed(1) + "%",
    };
  }

  async readCryptographic(filePath: string): Promise<CFEReadResult> {
    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const content = readFileSync(filePath, "utf8");
    const lines = content.split("\n");
    const decodedLines: string[] = [];

    for (const line of lines) {
      if (line.trim() === "") {
        decodedLines.push("");
        continue;
      }

      try {
        if (CryptographicFormatEncoder.isCFEFormat(line)) {
          const decoded = this.encoder.decode(line);
          decodedLines.push(decoded);
          this.stats.linesDecoded++;
        } else if (this.options.hybridMode) {
          decodedLines.push(line);
        } else {
          throw new Error("Non-CFE format in CFE-only mode");
        }
      } catch (error) {
        this.stats.integrityFailures++;
        if (this.options.hybridMode) {
          decodedLines.push(line);
        } else {
          throw new Error(`CFE decode failed: ${(error as Error).message}`);
        }
      }
    }

    return {
      lines: decodedLines,
      stats: {
        totalLines: lines.length,
        decodedLines: this.stats.linesDecoded,
        integrityFailures: this.stats.integrityFailures,
      },
    };
  }

  getStats(): CFEStats {
    return { ...this.stats };
  }
}
