/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2025 Dennis van Leeuwen
 *
 * AICF Type Definitions - Core types for AICF v3.1.1
 */

/**
 * AICF Format Version
 */
export type AICFVersion = "3.1" | "3.1.1";

/**
 * Memory types based on Google ADK patterns
 */
export type MemoryType = "episodic" | "semantic" | "procedural";

/**
 * State scope types
 */
export type StateScope = "session" | "user" | "app" | "temp";

/**
 * Link relationship types
 */
export type LinkType =
  | "semantic_cluster"
  | "temporal_sequence"
  | "causal_relationship"
  | "reference"
  | "dependency";

/**
 * AICF Metadata
 */
export interface AICFMetadata {
  format_version: AICFVersion;
  created_at: string;
  updated_at?: string;
  ai_assistant?: string;
  project_name?: string;
  session_id?: string;
  [key: string]: string | undefined;
}

/**
 * Session information (Google ADK pattern)
 */
export interface AICFSession {
  session_id: string;
  app_name?: string;
  user_id?: string;
  creation_time: string;
  status: "active" | "completed" | "archived";
  [key: string]: string | undefined;
}

/**
 * Memory entry (Google ADK pattern)
 */
export interface AICFMemory {
  type: MemoryType;
  timestamp: string;
  content: string;
  importance?: "low" | "medium" | "high" | "critical";
  tags?: string[];
  embedding_id?: string;
  [key: string]: string | string[] | undefined;
}

/**
 * State entry with scope
 */
export interface AICFState {
  scope: StateScope;
  key: string;
  value: string;
  type?: "string" | "json" | "number" | "boolean";
  ttl?: number;
  [key: string]: string | number | undefined;
}

/**
 * Conversation entry
 */
export interface AICFConversation {
  id: string;
  timestamp: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: Record<string, string>;
}

/**
 * Insight entry
 */
export interface AICFInsight {
  content: string;
  category: string;
  priority: "low" | "medium" | "high" | "critical";
  confidence: number;
  memory_type?: MemoryType;
  timestamp?: string;
}

/**
 * Decision entry
 */
export interface AICFDecision {
  decision: string;
  rationale: string;
  alternatives?: string[];
  timestamp?: string;
  impact?: "low" | "medium" | "high";
}

/**
 * Work state entry
 */
export interface AICFWork {
  id: string;
  status: "not_started" | "in_progress" | "completed" | "blocked";
  description?: string | undefined;
  metadata?: Record<string, string> | undefined;
}

/**
 * Link entry
 */
export interface AICFLink {
  type: LinkType;
  source: string;
  target: string;
  strength?: number;
  metadata?: Record<string, string>;
}

/**
 * Embedding entry
 */
export interface AICFEmbedding {
  id: string;
  content_hash: string;
  vector?: number[];
  model?: string;
  dimensions?: number;
}

/**
 * Consolidation entry
 */
export interface AICFConsolidation {
  trigger: "time" | "size" | "manual";
  timestamp: string;
  summary: string;
  archived_count?: number;
}

/**
 * Complete AICF data structure
 */
export interface AICFData {
  metadata: AICFMetadata;
  session?: AICFSession;
  conversations: AICFConversation[];
  memories: AICFMemory[];
  states: AICFState[];
  insights: AICFInsight[];
  decisions: AICFDecision[];
  work: AICFWork[];
  links: AICFLink[];
  embeddings: AICFEmbedding[];
  consolidations: AICFConsolidation[];
}

/**
 * AICF Query options
 */
export interface AICFQueryOptions {
  section?: string;
  key?: string;
  value?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/**
 * AICF Write options
 */
export interface AICFWriteOptions {
  enablePIIDetection?: boolean;
  redactPII?: boolean;
  throwOnPII?: boolean;
  streaming?: boolean;
  validate?: boolean;
}

/**
 * AICF Read options
 */
export interface AICFReadOptions {
  streaming?: boolean;
  validate?: boolean;
  parseMetadata?: boolean;
}

/**
 * PII Detection result
 */
export interface PIIDetection {
  type: string;
  value: string;
  position: number;
  redacted: string;
}

/**
 * Security validation result
 */
export interface SecurityValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * File system interface for dependency injection
 */
export interface FileSystem {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  appendFile(path: string, content: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  readdir(path: string): Promise<string[]>;
  stat(
    path: string
  ): Promise<{
    isFile(): boolean;
    isDirectory(): boolean;
    size: number;
    mtimeMs?: number;
  }>;
}

/**
 * Logger interface for dependency injection
 */
export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}
