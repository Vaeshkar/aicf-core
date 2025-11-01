# AICF-Core Documentation

Complete documentation for AICF-Core - Universal AI Context Format with 95.5% compression and zero semantic loss.

---

## 🎉 **NEW: AICF v3.1 - Memory Management with Google ADK Patterns**

**Released**: 2025-10-06

AICF v3.1 introduces production-proven memory management patterns from Google's Agent Developer Kit (ADK), validated by Saurabh Tiwary (VP & GM CloudAI @ Google).

**New Documentation**:

- **[AICF v3.1 Release Notes](./AICF_v3.1_RELEASE_NOTES.md)** - What's new in v3.1
- **[Memory Management Guide](./MEMORY_MANAGEMENT.md)** - Google ADK patterns, scope-based state, memory types
- **[Migration Guide v3.0 → v3.1](./MIGRATION_v3.0_to_v3.1.md)** - Step-by-step upgrade guide
- **[Example: Memory Management](../examples/06-memory-management.js)** - Working code examples

---

## 📖 Documentation Index

### 🚀 Getting Started

Perfect for beginners and those new to AICF-Core.

- **[Getting Started Guide](./GETTING_STARTED.md)** ⭐ **START HERE**
  - Installation instructions
  - Quick start examples
  - Core concepts explained
  - Common patterns
  - TypeScript support
  - Real-world examples

### 📚 Core Documentation

Essential reading for all AICF-Core users.

- **[API Reference](./API_REFERENCE.md)**
  - Complete API documentation
  - Method signatures and parameters
  - Return types and examples
  - Type definitions
  - All classes and functions

- **[AICF Specification v3.1](./AICF_SPEC_v3.0.md)** 🆕
  - Official format specification
  - Semantic tag definitions (@SESSION, @EMBEDDING, @CONSOLIDATION)
  - Scope-based state management
  - Memory type classification
  - File structure and encoding rules
  - Version compatibility (v3.0 → v3.1)
  - Industry validation (Google ADK, Vertex AI)

### 🏗️ Architecture & Design

Deep dive into AICF-Core's architecture.

- **[Architecture Overview](./ARCHITECTURE.md)**
  - System architecture diagrams
  - Component relationships
  - Data flow visualization
  - Memory lifecycle
  - Concurrency model
  - Performance characteristics

- **[Technical Assessment](./AICF-ASSESSMENT.md)**
  - Technical deep-dive analysis
  - Performance benchmarks
  - Compression validation
  - Production readiness
  - Competitive analysis

### 💡 Best Practices

Production-ready patterns and recommendations.

- **[Best Practices Guide](./BEST_PRACTICES.md)**
  - File organization
  - Memory lifecycle management
  - Performance optimization
  - Security considerations
  - Production deployment
  - Error handling
  - Monitoring & observability
  - Scaling strategies

### 🔌 Integration Guides

Connect AICF-Core with popular frameworks and platforms.

- **[Integration Tutorials](./INTEGRATION_TUTORIALS.md)**
  - LangChain integration
  - OpenAI API integration
  - Claude API integration
  - Vector database integration (Pinecone)
  - Cloud storage (AWS S3, GCS, Azure)
  - Express.js REST API

### 🔧 Troubleshooting & Support

Solutions to common issues and problems.

- **[Troubleshooting Guide](./TROUBLESHOOTING.md)**
  - Installation issues
  - File system errors
  - Data corruption recovery
  - Performance problems
  - Memory issues
  - Query problems
  - Integration issues
  - Debugging techniques
  - FAQ

### 🔄 Migration & Upgrades

Guides for upgrading and converting formats.

- **[Migration Guide](./MIGRATION_GUIDE.md)**
  - Upgrading from v2.x to v3.0
  - Converting from JSON
  - Converting from SQLite
  - Converting from plain text
  - Breaking changes
  - Migration tools
  - Post-migration checklist

### 📝 Development & Contributing

For contributors and developers.

- **[Contributing Guidelines](../CONTRIBUTING.md)**
  - Development setup
  - Coding standards
  - Testing requirements
  - Pull request process
  - Issue templates
  - Code of conduct

- **[Development Plan](./DEVELOPMENT_PLAN.md)**
  - Project roadmap
  - Phase 1: Foundation completion
  - Phase 2: Security & reliability
  - Phase 3: Ecosystem & adoption
  - Phase 4: Enterprise features
  - Success metrics

- **[Contributor Quick Start](../aicf-core-contributor-quickstart.md)**
  - Quick reference for contributors
  - Essential commands
  - Repository structure
  - Contribution checklist

### 📊 Analysis & Reports

Historical context and project analysis.

- **[AICF Analysis Report](./aicf-analysis-report.md)**
  - Format analysis
  - Compression validation
  - Component overview
  - Enhancement deliverables

- **[Implementation Success](./IMPLEMENTATION_SUCCESS.md)**
  - Project achievements
  - Session analysis system
  - Context extraction
  - Success metrics

- **[Birth of AICF](./BIRTH_OF_AICF_HISTORIC_CONVERSATION.md)**
  - Historical conversation
  - Project origins
  - Design decisions

### 🛠️ Specialized Guides

Topic-specific documentation.

- **[Session Analyzer Guide](./SESSION_ANALYZER_GUIDE.md)**
  - Session analysis features
  - Command extraction
  - Context building

- **[Checkpoint Orchestrator](./CHECKPOINT_ORCHESTRATOR.md)**
  - Checkpoint management
  - Orchestration patterns

- **[AICF Core Checklist](./aicf-core-checklist.md)**
  - Development checklist
  - Quality assurance
  - Production readiness

---

## 📂 Code Examples

Practical, working code samples for all use cases.

See **[examples/](../examples/)** directory for:

1. **[Basic Usage](../examples/01-basic-usage.js)** - Getting started
2. **[Reader/Writer Separation](../examples/02-reader-writer-separation.js)** - Concurrent access
3. **[Advanced Queries](../examples/03-advanced-queries.js)** - Query patterns
4. **[Memory Management](../examples/04-memory-management.js)** - Lifecycle management
5. **[Error Handling](../examples/05-error-handling.js)** - Robust error handling
6. **[Memory Management v3.1](../examples/06-memory-management.js)** 🆕 - Google ADK patterns

More examples coming soon!

---

## 🎯 Quick Navigation

### By User Type

**Beginners:**

1. [Getting Started Guide](./GETTING_STARTED.md)
2. [Examples](../examples/)
3. [API Reference](./API_REFERENCE.md)

**Intermediate Users:**

1. [Best Practices](./BEST_PRACTICES.md)
2. [Integration Tutorials](./INTEGRATION_TUTORIALS.md)
3. [Architecture](./ARCHITECTURE.md)

**Advanced Users:**

1. [AICF Specification](./AICF_SPEC_v3.0.md)
2. [Technical Assessment](./AICF-ASSESSMENT.md)
3. [Contributing](../CONTRIBUTING.md)

### By Task

**Installing AICF:**

- [Getting Started - Installation](./GETTING_STARTED.md#-installation)

**First AICF File:**

- [Getting Started - Quick Start](./GETTING_STARTED.md#-quick-start)

**Integrating with LangChain:**

- [Integration Tutorials - LangChain](./INTEGRATION_TUTORIALS.md#langchain-integration)

**Optimizing Performance:**

- [Best Practices - Performance](./BEST_PRACTICES.md#performance-optimization)

**Troubleshooting Errors:**

- [Troubleshooting Guide](./TROUBLESHOOTING.md)

**Migrating from v2:**

- [Migration Guide - v2 to v3](./MIGRATION_GUIDE.md#upgrading-from-v2x-to-v30)

**Contributing Code:**

- [Contributing Guidelines](../CONTRIBUTING.md)

---

## 🔍 Search Tips

### Finding Information

1. **Use the search function** - Press `Ctrl+F` (or `Cmd+F` on Mac)
2. **Check the index** - This page lists all documentation
3. **Browse examples** - See working code in [examples/](../examples/)
4. **Read the FAQ** - Common questions in [Troubleshooting](./TROUBLESHOOTING.md#faq)

### Common Search Terms

- **Installation** → [Getting Started](./GETTING_STARTED.md)
- **API** → [API Reference](./API_REFERENCE.md)
- **Examples** → [Examples Directory](../examples/)
- **Performance** → [Best Practices](./BEST_PRACTICES.md#performance-optimization)
- **Security** → [Best Practices](./BEST_PRACTICES.md#security-considerations)
- **Integration** → [Integration Tutorials](./INTEGRATION_TUTORIALS.md)
- **Migration** → [Migration Guide](./MIGRATION_GUIDE.md)
- **Errors** → [Troubleshooting](./TROUBLESHOOTING.md)

---

## 📈 Documentation Quality

Our documentation follows these principles:

✅ **Clear and Concise** - Easy to understand
✅ **Code Examples** - Show, don't just tell
✅ **Up-to-Date** - Kept in sync with code
✅ **Well-Organized** - Logical structure
✅ **Searchable** - Easy to find information
✅ **Comprehensive** - Covers all features

---

## 🤝 Improving Documentation

Found an issue or want to improve the docs?

1. **Report issues** - [Open an issue](https://github.com/Vaeshkar/aicf-core/issues)
2. **Suggest improvements** - [Start a discussion](https://github.com/Vaeshkar/aicf-core/discussions)
3. **Submit changes** - [Create a pull request](https://github.com/Vaeshkar/aicf-core/pulls)

See [Contributing Guidelines](../CONTRIBUTING.md) for details.

---

## 📞 Getting Help

- **GitHub Issues**: [Report bugs or request features](https://github.com/Vaeshkar/aicf-core/issues)
- **Discussions**: [Ask questions and share ideas](https://github.com/Vaeshkar/aicf-core/discussions)
- **Examples**: [Browse working code samples](../examples/)

---

## 📄 License

AICF-Core is licensed under **MIT**.

This ensures AICF remains open source and benefits the entire AI community.

See [LICENSE](../LICENSE) for full details.

---

**AICF-Core Documentation** | **95.5% Compression, 0% Semantic Loss** | **Universal AI Context Format**
