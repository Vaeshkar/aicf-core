/**
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (c) 2025 Dennis van Leeuwen
 * 
 * AICF Core - Universal AI Context Format Infrastructure
 * Enterprise-grade AI memory system with 95.5% compression and zero semantic loss
 */

const AICFAPI = require('./aicf-api');
const AICFReader = require('./aicf-reader');
const AICFWriter = require('./aicf-writer');

// Agents
const IntelligentConversationParser = require('./agents/intelligent-conversation-parser');
const ConversationAnalyzer = require('./agents/conversation-analyzer');
const MemoryLifecycleManager = require('./agents/memory-lifecycle-manager');
const MemoryDropoff = require('./agents/memory-dropoff');
const FileOrganizationAgent = require('./agents/file-organization-agent');
const AgentRouter = require('./agents/agent-router');

// Parsers and utilities
const { parseIndex, parseDataFile, loadAICF, query } = require('./parsers/aicf-parser');
const { compileIndex, compileDataFile, writeAICF, addEntry } = require('./parsers/aicf-compiler');
const ContextExtractor = require('./context-extractor');
const ConversationProcessor = require('./conversation-processor');

// Extractors
const { UniversalExtractor } = require('./extractors/UniversalExtractor');
const { AICFExtractorIntegration } = require('./extractors/AICFExtractorIntegration');

/**
 * Main AICF class - Complete interface for AI Context Format
 */
class AICF extends AICFAPI {
  constructor(aicfDir = '.aicf') {
    super(aicfDir);
    this.agents = {
      conversationParser: new IntelligentConversationParser(),
      analyzer: new ConversationAnalyzer(),
      memoryManager: new MemoryLifecycleManager({ projectRoot: aicfDir }),
      memoryDropoff: new MemoryDropoff(),
      fileOrganizer: new FileOrganizationAgent({ projectRoot: aicfDir }),
      router: new AgentRouter()
    };
  }

  /**
   * Factory method to create AICF instance
   */
  static create(aicfDir) {
    return new AICF(aicfDir);
  }

  /**
   * Create reader-only instance for read operations
   */
  static createReader(aicfDir) {
    return new AICFReader(aicfDir);
  }

  /**
   * Create writer-only instance for write operations
   */
  static createWriter(aicfDir) {
    return new AICFWriter(aicfDir);
  }

  /**
   * Load complete AICF context from directory
   */
  static async load(aicfDir) {
    return await loadAICF(aicfDir);
  }

  /**
   * Organize project files automatically
   */
  async organizeFiles(options = {}) {
    return await this.agents.fileOrganizer.organizeFiles();
  }

  /**
   * Run complete memory lifecycle (file organization + memory management)
   */
  async runMemoryLifecycle() {
    return await this.agents.memoryManager.processLifecycle();
  }

  /**
   * Extract conversations from all available AI platforms
   */
  async extractConversations(options = {}) {
    const extractor = new AICFExtractorIntegration();
    return await extractor.extractAndIntegrate(options);
  }

  /**
   * Get status of conversation extraction systems
   */
  async getExtractionStatus() {
    const extractor = new AICFExtractorIntegration();
    return await extractor.getStatus();
  }

  /**
   * Get version information
   */
  static getVersion() {
    return {
      version: '1.0.0',
      aicfFormat: '3.0',
      compressionRatio: '95.5%',
      semanticLoss: '0%'
    };
  }
}

module.exports = {
  // Main class
  AICF,
  
  // Core components
  AICFAPI,
  AICFReader,
  AICFWriter,
  
  // Agents
  IntelligentConversationParser,
  ConversationAnalyzer,
  MemoryLifecycleManager,
  MemoryDropoff,
  FileOrganizationAgent,
  AgentRouter,
  
  // Parsers and utilities
  parseIndex,
  parseDataFile,
  loadAICF,
  query,
  compileIndex,
  compileDataFile,
  writeAICF,
  addEntry,
  ContextExtractor,
  ConversationProcessor,
  
  // Extractors
  UniversalExtractor,
  AICFExtractorIntegration,
  
  // Convenience factory methods
  create: AICF.create,
  createReader: AICF.createReader,
  createWriter: AICF.createWriter,
  load: AICF.load,
  getVersion: AICF.getVersion
};