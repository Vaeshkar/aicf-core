/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2025 Dennis van Leeuwen
 *
 * AICF Core - Universal AI Context Format Infrastructure
 * Enterprise-grade AI memory system with 95.5% compression and zero semantic loss
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// Core classes
import { AICFAPI } from "./aicf-api.js";
import { AICFReader } from "./aicf-reader.js";
import { AICFWriter } from "./aicf-writer.js";
import { AICFSecure } from "./aicf-secure.js";

// Read version from package.json dynamically
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJsonPath = join(__dirname, "../package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
const PACKAGE_VERSION = packageJson.version;

export { AICFAPI } from "./aicf-api.js";
export {
  AICFReader,
  type AICFReaderConfig,
  type AICFConversation,
  type AICFStats,
} from "./aicf-reader.js";
export { AICFWriter, type AICFWriterConfig } from "./aicf-writer.js";
export {
  AICFSecure,
  type AICFSecureConfig,
  type SecurityEvent,
} from "./aicf-secure.js";

// Memory Writer (new in v2.1.0)
export {
  MemoryFileWriter,
  type UserIntent,
  type AIAction,
  type TechnicalWork,
  type Decision,
  type ConversationFlow,
  type WorkingState,
  type AnalysisResult,
} from "./writers/MemoryFileWriter.js";

// AICE-to-AICF Bridge (new in v2.2.0)
export {
  AICEToAICFBridge,
  type AICEToAICFBridgeOptions,
} from "./bridges/aice-to-aicf.js";

// Watchers (new in v2.3.0)
export {
  JSONToAICFWatcher,
  type JSONToAICFWatcherConfig,
} from "./watchers/json-to-aicf-watcher.js";

// Types
export type {
  Result,
  AICFData,
  AICFMetadata,
  AICFSession,
  AICFMemory,
  AICFState,
  AICFConversation as AICFConversationType,
  AICFInsight,
  AICFDecision,
  AICFWork,
  AICFLink,
  AICFEmbedding,
  AICFConsolidation,
  FileSystem,
  Logger,
} from "./types/index.js";

// Result type utilities
export {
  ok,
  err,
  toError,
  map,
  mapError,
  andThen,
  combine,
  tryCatch,
  tryCatchAsync,
} from "./types/result.js";

// Parsers
export {
  parseAICF,
  parseSectionName,
  parsePipeLine,
  parseKeyValue,
  validateAICF,
} from "./parsers/aicf-parser.js";
export {
  compileAICF,
  compileMetadata,
  compileSession,
  compileConversations,
} from "./parsers/aicf-compiler.js";

// Security
export { validatePath, normalizePath } from "./security/path-validator.js";
export {
  sanitizePipeData,
  sanitizeString,
  sanitizeTimestamp,
  sanitizeNumber,
} from "./security/data-sanitizer.js";
export {
  detectPII,
  redactPII,
  PIIDetector,
  type PIIDetection,
  type PIIRedactionResult,
} from "./security/pii-detector.js";
export { PII_PATTERNS, type PIIType } from "./security/pii-patterns.js";
export {
  atomicFileOperation,
  readFileStream,
  safeReadFile,
} from "./security/file-operations.js";
export {
  RateLimiter,
  type RateLimiterOptions,
} from "./security/rate-limiter.js";
export { calculateChecksum, verifyChecksum } from "./security/checksum.js";
export {
  validateConfig,
  SECURE_DEFAULTS,
  type SecurityConfig,
} from "./security/config-validator.js";

// Utilities
export { NodeFileSystem, SafeFileSystem } from "./utils/file-system.js";
export { ConsoleLogger, SilentLogger, type LogLevel } from "./utils/logger.js";

/**
 * Main AICF class - Complete interface for AI Context Format
 */
export class AICF extends AICFAPI {
  /**
   * Factory method to create AICF instance
   */
  static create(aicfDir = ".aicf"): AICF {
    return new AICF(aicfDir);
  }

  /**
   * Create reader-only instance for read operations
   */
  static createReader(aicfDir = ".aicf"): AICFReader {
    return new AICFReader(aicfDir);
  }

  /**
   * Create writer-only instance for write operations
   */
  static createWriter(aicfDir = ".aicf"): AICFWriter {
    return new AICFWriter(aicfDir);
  }

  /**
   * Create secure instance with PII protection
   */
  static createSecure(aicfDir = ".aicf"): AICFSecure {
    return new AICFSecure(aicfDir);
  }

  /**
   * Create memory writer instance for analysis results
   * @since 2.1.0
   */
  static createMemoryWriter(
    cwd?: string
  ): import("./writers/MemoryFileWriter.js").MemoryFileWriter {
    const { MemoryFileWriter } = require("./writers/MemoryFileWriter.js");
    return new MemoryFileWriter(cwd);
  }

  /**
   * Get version information
   */
  static getVersion(): {
    version: string;
    aicfFormat: string;
    compressionRatio: string;
    semanticLoss: string;
  } {
    return {
      version: PACKAGE_VERSION, // Read dynamically from package.json
      aicfFormat: "3.1.1",
      compressionRatio: "95.5%",
      semanticLoss: "0%",
    };
  }
}

// Default export
export default AICF;

// Convenience factory methods
export const create = AICF.create;
export const createReader = AICF.createReader;
export const createWriter = AICF.createWriter;
export const createSecure = AICF.createSecure;
export const createMemoryWriter = AICF.createMemoryWriter;
export const getVersion = AICF.getVersion;
