# AICF-Core Examples

This directory contains comprehensive examples demonstrating all aspects of AICF-Core usage.

## 📚 Example Index

### Basic Examples

1. **[01-basic-usage.js](./01-basic-usage.js)** - Getting started with AICF
   - Creating AICF instances
   - Logging conversations
   - Reading context
   - Basic queries
   - Health checks

2. **[02-reader-writer-separation.js](./02-reader-writer-separation.js)** - Reader/Writer pattern
   - Using AICFReader for read-only operations
   - Using AICFWriter for write-only operations
   - Concurrent access patterns
   - Benefits of separation

3. **[03-advanced-queries.js](./03-advanced-queries.js)** - Advanced querying
   - Natural language queries
   - Date range filtering
   - Priority-based filtering
   - Category-based filtering
   - Combined filtering
   - Analytics queries

### Intermediate Examples

4. **[04-memory-management.js](./04-memory-management.js)** - Memory lifecycle
   - Memory lifecycle processing
   - Memory dropoff (7/30/90 day cycles)
   - Automatic cleanup
   - Memory optimization strategies
   - Scheduled memory management

5. **[05-error-handling.js](./05-error-handling.js)** - Robust error handling
   - Handling missing directories
   - Dealing with corrupted files
   - Validation errors
   - Recovery strategies
   - Graceful degradation
   - Retry logic

6. **[06-memory-management.js](./06-memory-management.js)** - 🆕 **AICF v3.1 Memory Management**
   - Session tracking with lifecycle management
   - Scope-based state (session/user/app/temp)
   - Memory type classification (episodic/semantic/procedural)
   - Vector embeddings for semantic search
   - Memory consolidation (95.5% compression)
   - **Based on Google ADK patterns**

### Advanced Examples

6. **[06-typescript-usage.ts](./06-typescript-usage.ts)** - TypeScript integration
   - Type-safe AICF usage
   - Custom type definitions
   - Generic patterns
   - Type inference

7. **[07-integration-langchain.js](./07-integration-langchain.js)** - LangChain integration
   - Using AICF as LangChain memory provider
   - Conversation history management
   - Context retrieval

8. **[08-integration-openai.js](./08-integration-openai.js)** - OpenAI API integration
   - Using AICF with OpenAI
   - Conversation logging
   - Context injection

9. **[09-performance-optimization.js](./09-performance-optimization.js)** - Performance tips
   - Caching strategies
   - Batch operations
   - Query optimization
   - Memory profiling

10. **[10-production-deployment.js](./10-production-deployment.js)** - Production patterns
    - Multi-process coordination
    - Monitoring and alerting
    - Backup strategies
    - Disaster recovery

## 🚀 Running Examples

### Run Individual Examples

```bash
# Basic usage
node examples/01-basic-usage.js

# Reader/Writer separation
node examples/02-reader-writer-separation.js

# Advanced queries
node examples/03-advanced-queries.js

# Memory management
node examples/04-memory-management.js

# Error handling
node examples/05-error-handling.js

# Memory management (v3.1 - Google ADK patterns)
node examples/06-memory-management.js
```

### Run All Examples

```bash
# Run all examples in sequence
npm run examples

# Or manually
for file in examples/*.js; do
  echo "Running $file..."
  node "$file"
  echo ""
done
```

### TypeScript Examples

```bash
# Compile and run TypeScript examples
npx ts-node examples/06-typescript-usage.ts
```

## 📖 Learning Path

### Beginner Path

1. Start with `01-basic-usage.js` to understand fundamentals
2. Learn separation of concerns with `02-reader-writer-separation.js`
3. Explore querying with `03-advanced-queries.js`

### Intermediate Path

4. Master memory management with `04-memory-management.js`
5. Learn error handling with `05-error-handling.js`
6. Add type safety with `06-typescript-usage.ts`

### Advanced Path

7. Integrate with LangChain: `07-integration-langchain.js`
8. Integrate with OpenAI: `08-integration-openai.js`
9. Optimize performance: `09-performance-optimization.js`
10. Deploy to production: `10-production-deployment.js`

## 🎯 Example Categories

### By Use Case

**AI Chat Applications**

- `01-basic-usage.js` - Basic conversation logging
- `07-integration-langchain.js` - LangChain memory
- `08-integration-openai.js` - OpenAI integration

**Enterprise Applications**

- `02-reader-writer-separation.js` - Concurrent access
- `05-error-handling.js` - Robust error handling
- `10-production-deployment.js` - Production patterns

**Performance-Critical Applications**

- `03-advanced-queries.js` - Efficient querying
- `09-performance-optimization.js` - Performance tuning

**Long-Running Applications**

- `04-memory-management.js` - Memory lifecycle
- `10-production-deployment.js` - Monitoring

### By Complexity

**Simple** (5-10 minutes)

- `01-basic-usage.js`
- `02-reader-writer-separation.js`

**Moderate** (10-20 minutes)

- `03-advanced-queries.js`
- `04-memory-management.js`
- `05-error-handling.js`

**Advanced** (20-30 minutes)

- `06-typescript-usage.ts`
- `07-integration-langchain.js`
- `08-integration-openai.js`
- `09-performance-optimization.js`
- `10-production-deployment.js`

## 🛠️ Prerequisites

### Required

- Node.js >= 16.0.0
- npm or yarn or pnpm
- AICF-Core installed (`npm install aicf-core`)

### Optional (for specific examples)

- TypeScript (`npm install -g typescript`)
- ts-node (`npm install -g ts-node`)
- LangChain (`npm install langchain`)
- OpenAI SDK (`npm install openai`)

## 📝 Example Template

Use this template to create your own examples:

```javascript
/**
 * AICF-Core Example: [Your Example Name]
 *
 * This example demonstrates:
 * - Feature 1
 * - Feature 2
 * - Feature 3
 */

const { AICF } = require("aicf-core");
const path = require("path");

async function yourExample() {
  console.log("🚀 AICF-Core [Your Example Name]\n");

  const aicfDir = path.join(__dirname, ".aicf-demo");
  const aicf = AICF.create(aicfDir);

  // Your example code here

  console.log("✨ Example completed!");
}

// Run the example
if (require.main === module) {
  yourExample().catch((error) => {
    console.error("❌ Error:", error.message);
    process.exit(1);
  });
}

module.exports = yourExample;
```

## 🤝 Contributing Examples

Have a great example to share? We'd love to include it!

1. Follow the example template above
2. Add clear comments explaining each step
3. Include error handling
4. Add your example to this README
5. Submit a pull request

## 📚 Additional Resources

- **[Getting Started Guide](../docs/GETTING_STARTED.md)** - Beginner-friendly introduction
- **[API Reference](../docs/API_REFERENCE.md)** - Complete API documentation
- **[Best Practices](../docs/BEST_PRACTICES.md)** - Production deployment patterns
- **[AICF Specification](../docs/AICF_SPEC_v3.0.md)** - Format specification

## 💬 Get Help

- **GitHub Issues**: [Report bugs or request features](https://github.com/Vaeshkar/aicf-core/issues)
- **Discussions**: [Ask questions and share ideas](https://github.com/Vaeshkar/aicf-core/discussions)

---

**Happy coding with AICF-Core! 🚀**
