/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2025 Dennis van Leeuwen
 *
 * Security Module - Export all security utilities
 */

// Path validation
export { validatePath, normalizePath } from "./path-validator.js";

// Data sanitization
export {
  sanitizePipeData,
  sanitizeString,
  sanitizeTimestamp,
  sanitizeNumber,
  validateConversationData,
} from "./data-sanitizer.js";

// PII detection
export {
  PIIDetector,
  detectPII,
  hasPII,
  redactPII,
  sanitizeForLogging,
  containsAPIKeys,
  type PIIDetection,
  type PIIDetectorOptions,
  type PIIRedactionResult,
  type PIIDetectionLog,
  type PIIStats,
} from "./pii-detector.js";

// PII patterns
export {
  PII_PATTERNS,
  validateCreditCard,
  validateSSN,
  smartMask,
  maskAPIKey,
  type PIIPattern,
  type PIIType,
} from "./pii-patterns.js";

// Secure AICF Writer
export {
  SecureAICFWriter,
  type SecureAICFWriterConfig,
  type RedactionLog,
} from "./secure-aicf-writer.js";

// File operations
export {
  atomicFileOperation,
  readFileStream,
  safeReadFile,
  fileExists,
  type StreamLineCallback,
} from "./file-operations.js";

// Rate limiting
export {
  RateLimiter,
  createRateLimiter,
  type RateLimiterOptions,
} from "./rate-limiter.js";

// Checksum
export {
  calculateChecksum,
  verifyChecksum,
  calculateChecksumSafe,
  verifyChecksumSafe,
} from "./checksum.js";

// Configuration
export {
  validateConfig,
  isFileSizeValid,
  isStringLengthValid,
  isObjectSizeValid,
  isExtensionAllowed,
  SECURE_DEFAULTS,
  type SecurityConfig,
} from "./config-validator.js";

// Input Validation
export {
  validateInput,
  sanitizeHTML,
  sanitizeSQL,
  sanitizeFilePath,
  validateConversationId,
  validateTimestamp,
  type ValidationRule,
  type ValidationSchema,
  type ValidationError,
} from "./input-validator.js";

// Encryption
export {
  encrypt,
  decrypt,
  generatePassword,
  generateKey,
  hashPassword,
  verifyPassword,
  encryptFile,
  decryptFile,
  deriveKey,
  constantTimeCompare,
  generateToken,
  encryptConfig,
  decryptConfig,
  type EncryptionOptions,
  type EncryptedData,
} from "./encryption.js";

// Access Control
export {
  AccessControl,
  createDefaultAdmin,
  isActionAllowed,
  type Permission,
  type Role,
  type User,
  type AccessPolicy,
} from "./access-control.js";

// Security Monitor
export {
  SecurityMonitor,
  getGlobalMonitor,
  reportGlobalThreat,
  type ThreatLevel,
  type ThreatType,
  type SecurityThreat,
  type SecurityMetrics,
  type MonitoringConfig,
} from "./security-monitor.js";

// Compliance
export {
  ComplianceManager,
  type ComplianceStandard,
  type ComplianceStatus,
  type ComplianceCheck,
  type ComplianceReport,
  type ComplianceConfig,
} from "./compliance.js";
