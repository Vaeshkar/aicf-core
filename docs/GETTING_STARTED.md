# Getting Started with AICF-Core

Welcome to **AICF-Core** - the Universal AI Context Format that achieves 95.5% compression with zero semantic loss! This guide will help you get up and running in minutes.

## 📦 Installation

### Using npm

```bash
npm install aicf-core
```

### Using yarn

```bash
yarn add aicf-core
```

### Using pnpm

```bash
pnpm add aicf-core
```

## 🚀 Quick Start

### Your First AICF File

Let's create your first AI context file in just a few lines:

```javascript
const { AICF } = require('aicf-core');

// Create an AICF instance pointing to your .aicf directory
const aicf = AICF.create('.aicf');

// Log your first conversation
await aicf.logConversation({
  id: 'conv_001',
  messages: 10,
  tokens: 500,
  metadata: { 
    topic: 'getting_started',
    user: 'developer'
  }
});

console.log('✅ Your first AICF file created!');
```

### Reading Context

```javascript
const { AICFReader } = require('aicf-core');

// Create a reader instance
const reader = new AICFReader('.aicf');

// Get the last 5 conversations
const recent = reader.getLastConversations(5);
console.log('Recent conversations:', recent);

// Get project statistics
const stats = reader.getStats();
console.log('Total conversations:', stats.counts.conversations);
```

### Writing Decisions and Insights

```javascript
const { AICFWriter } = require('aicf-core');

// Create a writer instance
const writer = new AICFWriter('.aicf');

// Log an important decision
await writer.addDecision({
  description: 'Adopt AICF for AI memory management',
  impact: 'HIGH',
  confidence: 'HIGH',
  rationale: '95.5% compression with zero semantic loss'
});

// Add an insight
await writer.addInsight({
  description: 'AICF reduces token costs significantly',
  category: 'PERFORMANCE',
  priority: 'HIGH',
  confidence: 'HIGH'
});
```

## 🎯 Core Concepts

### The AICF Directory Structure

When you initialize AICF, it creates a `.aicf` directory with this structure:

```
.aicf/
├── index.aicf              # Fast lookup metadata
├── conversation-memory.aicf # Conversation history
├── technical-context.aicf   # Technical decisions
├── work-state.aicf          # Current work state
└── decisions.aicf           # Decision log
```

### Semantic Tags

AICF uses semantic tags for instant context retrieval:

- `@CONVERSATION` - Conversation metadata and boundaries
- `@STATE` - Session state and progress tracking
- `@INSIGHTS` - Extracted insights with priority levels
- `@DECISIONS` - Decision records with impact assessment
- `@WORK` - Work context and action tracking
- `@NEXT_STEPS` - Planned actions with step breakdown

### The Three Classes

AICF-Core provides three main classes:

1. **`AICF`** - Full-featured API (read + write + query + analytics)
2. **`AICFReader`** - Read-only operations (fast, safe for concurrent access)
3. **`AICFWriter`** - Write-only operations (thread-safe, atomic writes)

## 📚 Common Patterns

### Pattern 1: Natural Language Queries

```javascript
const { AICF } = require('aicf-core');
const aicf = new AICF('.aicf');

// Query with natural language
const results = aicf.query("What were the recent high-impact decisions?");
console.log(results);

// Query for specific topics
const insights = aicf.query("Show me insights about performance");
console.log(insights);
```

### Pattern 2: Date Range Filtering

```javascript
const { AICFReader } = require('aicf-core');
const reader = new AICFReader('.aicf');

// Get conversations from the last 7 days
const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
const recent = reader.getConversationsByDate(lastWeek);

console.log(`Found ${recent.length} conversations in the last week`);
```

### Pattern 3: Project Overview

```javascript
const { AICF } = require('aicf-core');
const aicf = new AICF('.aicf');

// Get comprehensive project overview
const overview = aicf.getProjectOverview();

console.log('Project Summary:', overview.summary);
console.log('Recent Activity:', overview.recent);
console.log('Statistics:', overview.stats);
```

### Pattern 4: Analytics and Insights

```javascript
const { AICF } = require('aicf-core');
const aicf = new AICF('.aicf');

// Generate analytics
const analytics = aicf.generateAnalytics();

console.log('Compression Stats:', analytics.overview);
console.log('High Priority Insights:', analytics.insights.highPriority);
console.log('Trends:', analytics.insights.trends);
```

### Pattern 5: Health Monitoring

```javascript
const { AICF } = require('aicf-core');
const aicf = new AICF('.aicf');

// Check system health
const health = aicf.healthCheck();

if (health.status === 'healthy') {
  console.log('✅ AICF system is healthy');
} else {
  console.log('⚠️ Issues detected:', health.issues);
}
```

## 🔧 TypeScript Support

AICF-Core includes TypeScript definitions for full type safety:

```typescript
import { AICF, AICFReader, AICFWriter } from 'aicf-core';

// Full type inference
const aicf: AICF = AICF.create('.aicf');

// Type-safe conversation logging
await aicf.logConversation({
  id: 'conv_001',
  messages: 10,
  tokens: 500,
  metadata: {
    topic: 'typescript_example'
  }
});

// Type-safe reading
const reader: AICFReader = new AICFReader('.aicf');
const conversations = reader.getLastConversations(5);
```

## 🎨 Advanced Features

### Memory Lifecycle Management

```javascript
const { MemoryLifecycleManager } = require('aicf-core');

const manager = new MemoryLifecycleManager();

// Automatic memory lifecycle processing
await manager.processMemoryCycle();
```

### Intelligent Conversation Analysis

```javascript
const { IntelligentConversationParser } = require('aicf-core');

const parser = new IntelligentConversationParser();

// Analyze conversation with AI intelligence
const analysis = await parser.analyzeConversation(conversationData);
console.log('Extracted insights:', analysis.insights);
```

### Memory Dropoff (7/30/90 day cycles)

```javascript
const { MemoryDropoff } = require('aicf-core');

const dropoff = new MemoryDropoff();

// Execute 30-day memory dropoff
await dropoff.executeDropoff('30-day');
```

## 🌟 Real-World Example

Here's a complete example of using AICF in a real application:

```javascript
const { AICF } = require('aicf-core');

async function trackDevelopmentSession() {
  const aicf = AICF.create('.aicf');
  
  // Log the session
  await aicf.logConversation({
    id: `session_${Date.now()}`,
    messages: 45,
    tokens: 2500,
    metadata: {
      topic: 'feature_development',
      feature: 'user_authentication',
      duration_minutes: 90
    }
  });
  
  // Record key decisions
  await aicf.addDecision({
    description: 'Use JWT for authentication tokens',
    impact: 'HIGH',
    confidence: 'HIGH',
    rationale: 'Industry standard, stateless, scalable'
  });
  
  // Add insights
  await aicf.addInsight({
    description: 'Token refresh strategy needed for long sessions',
    category: 'SECURITY',
    priority: 'HIGH',
    confidence: 'MEDIUM'
  });
  
  // Query for related context
  const authDecisions = aicf.query('authentication decisions');
  console.log('Previous auth decisions:', authDecisions);
  
  // Get project health
  const health = aicf.healthCheck();
  console.log('System health:', health.status);
}

trackDevelopmentSession().catch(console.error);
```

## 📊 Performance Characteristics

AICF-Core is designed for high performance:

| Operation | Time | Throughput |
|-----------|------|------------|
| Read Last 10 Conversations | 1.2ms | 833 ops/sec |
| Query by Date Range | 3.4ms | 294 ops/sec |
| Append Conversation | 2.1ms | 476 ops/sec |
| Full Context Load | 15.8ms | 63 ops/sec |

## 🔒 Security Best Practices

1. **Never commit `.aicf` directories** - Add to `.gitignore`
2. **Sanitize sensitive data** - Use PII detection before logging
3. **Use read-only instances** - Use `AICFReader` when you don't need writes
4. **Validate inputs** - Always validate conversation data before logging

## 🐛 Troubleshooting

### Issue: "Cannot find module 'aicf-core'"

**Solution**: Make sure you've installed the package:
```bash
npm install aicf-core
```

### Issue: "ENOENT: no such file or directory"

**Solution**: The `.aicf` directory doesn't exist. Create it first:
```javascript
const fs = require('fs');
fs.mkdirSync('.aicf', { recursive: true });
```

### Issue: "Corrupted AICF file"

**Solution**: AICF has built-in recovery. Use the health check:
```javascript
const health = aicf.healthCheck();
console.log(health.issues); // Shows specific problems
```

## 📖 Next Steps

Now that you've mastered the basics, explore:

- **[API Reference](./API_REFERENCE.md)** - Complete API documentation
- **[Integration Tutorials](./INTEGRATION_TUTORIALS.md)** - LangChain, OpenAI, Claude
- **[Best Practices](./BEST_PRACTICES.md)** - Production deployment patterns
- **[Examples](../examples/)** - Working code samples

## 💬 Get Help

- **GitHub Issues**: [Report bugs or request features](https://github.com/Vaeshkar/aicf-core/issues)
- **Discussions**: [Ask questions and share ideas](https://github.com/Vaeshkar/aicf-core/discussions)
- **Documentation**: [Full documentation](https://github.com/Vaeshkar/aicf-core/tree/main/docs)

---

**Welcome to the future of AI memory management! 🚀**

