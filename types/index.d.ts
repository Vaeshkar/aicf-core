/**
 * AICF-Core TypeScript Definitions
 * Universal AI Context Format with 95.5% compression and zero semantic loss
 *
 * Version: 3.1 (with Google ADK Memory Management Patterns)
 *
 * @packageDocumentation
 */

declare module "aicf-core" {
  // ===== TYPES =====

  /**
   * Memory type classification (AICF v3.1)
   * Based on Google ADK patterns
   */
  export type MemoryType = "episodic" | "semantic" | "procedural";

  /**
   * State scope (AICF v3.1)
   * Based on Google ADK Session/State/Memory architecture
   */
  export type StateScope = "session" | "user" | "app" | "temp";

  /**
   * Session status (AICF v3.1)
   */
  export type SessionStatus = "active" | "completed" | "archived" | "error";

  /**
   * Consolidation method (AICF v3.1)
   */
  export type ConsolidationMethod =
    | "semantic_clustering"
    | "temporal_summarization"
    | "deduplication"
    | "importance_filtering";

  /**
   * Session data structure (AICF v3.1)
   */
  export interface Session {
    id: string;
    app_name: string;
    user_id: string;
    created_at: string;
    last_update_time: string;
    status: SessionStatus;
    event_count: number;
    total_tokens: number;
    metadata?: {
      [key: string]: any;
    };
  }

  /**
   * Scoped state data structure (AICF v3.1)
   */
  export interface ScopedState {
    scope: StateScope;
    data: {
      [key: string]: any;
    };
  }

  /**
   * Vector embedding data structure (AICF v3.1)
   */
  export interface Embedding {
    id: string;
    model: string;
    dimension: number;
    vector: number[];
    indexed_at: string;
    similarity_threshold: number;
    keywords?: string[];
    metadata?: {
      [key: string]: any;
    };
  }

  /**
   * Memory consolidation data structure (AICF v3.1)
   */
  export interface Consolidation {
    id: string;
    source_items: string[];
    consolidated_at: string;
    method: ConsolidationMethod;
    semantic_theme?: string;
    key_facts?: string[];
    information_preserved: number;
    compression_ratio: number;
    metadata?: {
      [key: string]: any;
    };
  }

  /**
   * Conversation metadata
   */
  export interface ConversationMetadata {
    topic?: string;
    user?: string;
    timestamp?: string;
    [key: string]: any;
  }

  /**
   * Conversation data structure
   */
  export interface Conversation {
    id: string;
    messages: number;
    tokens: number;
    metadata?: ConversationMetadata;
  }

  /**
   * Decision data structure
   */
  export interface Decision {
    description: string;
    impact: "HIGH" | "MEDIUM" | "LOW";
    confidence: "HIGH" | "MEDIUM" | "LOW";
    rationale?: string;
    memory_type?: MemoryType; // AICF v3.1
    metadata?: {
      impact: string;
      confidence: string;
      memory_type?: string;
      [key: string]: any;
    };
  }

  /**
   * Insight data structure
   */
  export interface Insight {
    description: string;
    category: string;
    priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    confidence: "HIGH" | "MEDIUM" | "LOW";
    memory_type?: MemoryType; // AICF v3.1
    metadata?: {
      category: string;
      priority: string;
      confidence: string;
      memory_type?: string;
      [key: string]: any;
    };
  }

  /**
   * Work state data structure
   */
  export interface WorkState {
    status: string;
    currentTask?: string;
    blockers?: string[];
    [key: string]: any;
  }

  /**
   * Project statistics
   */
  export interface ProjectStats {
    counts: {
      conversations: number;
      decisions: number;
      insights: number;
      [key: string]: number;
    };
    project: {
      name?: string;
      last_update?: string;
      [key: string]: any;
    };
  }

  /**
   * Query result
   */
  export interface QueryResult {
    relevanceScore: number;
    results: any[];
    query: string;
  }

  /**
   * Health check result
   */
  export interface HealthCheck {
    status: "healthy" | "degraded" | "unhealthy";
    issues: string[];
    timestamp: string;
  }

  /**
   * Project overview
   */
  export interface ProjectOverview {
    stats: ProjectStats;
    recent: {
      conversations: Conversation[];
      decisions: Decision[];
      workState: WorkState;
    };
    summary: string;
  }

  /**
   * Analytics data
   */
  export interface Analytics {
    overview: {
      totalConversations: number;
      totalDecisions: number;
      projectAge: number;
      activityLevel: string;
    };
    insights: {
      highPriority: number;
      categories: Record<string, number>;
      trends: {
        decisionVelocity: number;
        impactDistribution: Record<string, number>;
        confidenceLevel: number;
      };
    };
    recommendations: string[];
  }

  /**
   * Version information
   */
  export interface VersionInfo {
    version: string;
    aicfFormat: string;
    compressionRatio: string;
    semanticLoss: string;
  }

  /**
   * Memory dropoff result
   */
  export interface DropoffResult {
    itemsProcessed: number;
    itemsArchived: number;
  }

  // ===== MAIN CLASSES =====

  /**
   * Main AICF class - Complete interface for AI Context Format
   */
  export class AICF {
    /**
     * Create a new AICF instance
     * @param aicfDir - Path to the .aicf directory (default: '.aicf')
     */
    constructor(aicfDir?: string);

    /**
     * Reader instance for read operations
     */
    reader: AICFReader;

    /**
     * Writer instance for write operations
     */
    writer: AICFWriter;

    /**
     * Agent instances
     */
    agents: {
      conversationParser: IntelligentConversationParser;
      analyzer: ConversationAnalyzer;
      memoryManager: MemoryLifecycleManager;
      memoryDropoff: MemoryDropoff;
      router: AgentRouter;
    };

    /**
     * Factory method to create AICF instance
     * @param aicfDir - Path to the .aicf directory
     */
    static create(aicfDir?: string): AICF;

    /**
     * Create reader-only instance
     * @param aicfDir - Path to the .aicf directory
     */
    static createReader(aicfDir?: string): AICFReader;

    /**
     * Create writer-only instance
     * @param aicfDir - Path to the .aicf directory
     */
    static createWriter(aicfDir?: string): AICFWriter;

    /**
     * Load complete AICF context from directory
     * @param aicfDir - Path to the .aicf directory
     */
    static load(aicfDir: string): Promise<any>;

    /**
     * Get version information
     */
    static getVersion(): VersionInfo;

    /**
     * Log a conversation to AICF
     * @param data - Conversation data
     */
    logConversation(data: Conversation): Promise<void>;

    /**
     * Add a decision record
     * @param decision - Decision data
     */
    addDecision(decision: Decision): Promise<void>;

    /**
     * Add an insight record
     * @param insight - Insight data
     */
    addInsight(insight: Insight): Promise<void>;

    /**
     * Query AICF data with natural language
     * @param queryString - Natural language query
     */
    query(queryString: string): QueryResult;

    /**
     * Get comprehensive project overview
     */
    getProjectOverview(): ProjectOverview;

    /**
     * Generate comprehensive analytics
     */
    generateAnalytics(): Analytics;

    /**
     * Check system health
     */
    healthCheck(): HealthCheck;

    /**
     * Export AICF data to JSON format
     */
    exportToJSON(): any;

    /**
     * Export AICF data to Markdown format
     */
    exportToMarkdown(): string;
  }

  /**
   * AICFReader - Read-only operations for AICF data
   */
  export class AICFReader {
    /**
     * Create a new AICFReader instance
     * @param aicfDir - Path to the .aicf directory
     */
    constructor(aicfDir: string);

    /**
     * Get project statistics
     */
    getStats(): ProjectStats;

    /**
     * Get the last N conversations
     * @param count - Number of conversations to retrieve
     */
    getLastConversations(count: number): Conversation[];

    /**
     * Get conversations within a date range
     * @param startDate - Start date
     * @param endDate - End date (optional, default: now)
     */
    getConversationsByDate(startDate: Date, endDate?: Date): Conversation[];

    /**
     * Get decisions within a date range
     * @param startDate - Start date
     * @param endDate - End date (optional, default: now)
     */
    getDecisionsByDate(startDate: Date, endDate?: Date): Decision[];

    /**
     * Get decisions by impact level
     * @param impact - Impact level
     */
    getDecisionsByImpact(impact: "HIGH" | "MEDIUM" | "LOW"): Decision[];

    /**
     * Get insights by priority level
     * @param priority - Priority level
     */
    getInsightsByPriority(
      priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
    ): Insight[];

    /**
     * Get insights by category
     * @param category - Category name
     */
    getInsightsByCategory(category: string): Insight[];

    /**
     * Get current work state
     */
    getCurrentWorkState(): WorkState;
  }

  /**
   * AICFWriter - Write-only operations for AICF data
   */
  export class AICFWriter {
    /**
     * Create a new AICFWriter instance
     * @param aicfDir - Path to the .aicf directory
     */
    constructor(aicfDir: string);

    /**
     * Log a conversation to AICF
     * @param data - Conversation data
     */
    logConversation(data: Conversation): Promise<void>;

    /**
     * Add a decision record
     * @param decision - Decision data
     */
    addDecision(decision: Decision): Promise<void>;

    /**
     * Add an insight record
     * @param insight - Insight data
     */
    addInsight(insight: Insight): Promise<void>;

    /**
     * Update work state
     * @param state - Work state data
     */
    updateWorkState(state: WorkState): Promise<void>;
  }

  /**
   * AICF API - High-level API interface
   */
  export class AICFAPI {
    /**
     * Create a new AICFAPI instance
     * @param aicfDir - Path to the .aicf directory
     */
    constructor(aicfDir?: string);

    reader: AICFReader;
    writer: AICFWriter;

    getProjectOverview(): ProjectOverview;
    generateAnalytics(): Analytics;
    query(queryString: string): QueryResult;
    healthCheck(): HealthCheck;
    exportToJSON(): any;
    exportToMarkdown(): string;
  }

  // ===== AGENT CLASSES =====

  /**
   * Intelligent conversation parser with AI capabilities
   */
  export class IntelligentConversationParser {
    constructor();
    analyzeConversation(conversationData: any): Promise<any>;
  }

  /**
   * Conversation analyzer for extracting insights
   */
  export class ConversationAnalyzer {
    constructor();
    extractInsights(analysis: any): Promise<Insight[]>;
  }

  /**
   * Memory lifecycle manager for automatic memory management
   */
  export class MemoryLifecycleManager {
    constructor();
    processMemoryCycle(): Promise<any>;
  }

  /**
   * Memory dropoff with 7/30/90 day cycles
   */
  export class MemoryDropoff {
    constructor();
    executeDropoff(
      cycle: "7-day" | "30-day" | "90-day"
    ): Promise<DropoffResult>;
  }

  /**
   * Agent router for intelligent routing
   */
  export class AgentRouter {
    constructor();
  }

  // ===== UTILITY FUNCTIONS =====

  /**
   * Load complete AICF context from directory
   * @param aicfDir - Path to .aicf directory
   */
  export function loadAICF(aicfDir: string): Promise<any>;

  /**
   * Query AICF data with flexible filtering
   * @param context - AICF context
   * @param type - Query type
   * @param filter - Filter criteria
   */
  export function query(context: any, type: string, filter: any): any[];

  /**
   * Write complete AICF context to directory
   * @param context - AICF context
   * @param aicfDir - Path to .aicf directory
   */
  export function writeAICF(context: any, aicfDir: string): Promise<void>;

  /**
   * Parse AICF index file
   * @param indexPath - Path to index file
   */
  export function parseIndex(indexPath: string): any;

  /**
   * Parse AICF data file
   * @param filePath - Path to data file
   */
  export function parseDataFile(filePath: string): any;

  /**
   * Compile AICF index
   * @param data - Index data
   */
  export function compileIndex(data: any): string;

  /**
   * Compile AICF data file
   * @param data - Data to compile
   */
  export function compileDataFile(data: any): string;

  /**
   * Add entry to AICF file
   * @param filePath - Path to file
   * @param entry - Entry to add
   */
  export function addEntry(filePath: string, entry: any): Promise<void>;

  // ===== CONVENIENCE EXPORTS =====

  export const create: typeof AICF.create;
  export const createReader: typeof AICF.createReader;
  export const createWriter: typeof AICF.createWriter;
  export const load: typeof AICF.load;
  export const getVersion: typeof AICF.getVersion;

  // ===== CONTEXT EXTRACTOR =====

  export class ContextExtractor {
    constructor();
  }

  // ===== CONVERSATION PROCESSOR =====

  export class ConversationProcessor {
    constructor();
  }
}
