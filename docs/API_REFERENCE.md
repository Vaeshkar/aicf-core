# AICF-Core API Reference

Complete API documentation for AICF-Core v1.0.0

## Table of Contents

- [Core Classes](#core-classes)
  - [AICF](#aicf)
  - [AICFReader](#aicfreader)
  - [AICFWriter](#aicfwriter)
- [Agent Classes](#agent-classes)
  - [IntelligentConversationParser](#intelligentconversationparser)
  - [ConversationAnalyzer](#conversationanalyzer)
  - [MemoryLifecycleManager](#memorylifecyclemanager)
  - [MemoryDropoff](#memorydropoff)
- [Utility Functions](#utility-functions)
- [Type Definitions](#type-definitions)

---

## Core Classes

### AICF

The main AICF class provides a complete interface for AI Context Format operations, combining reading, writing, querying, and analytics capabilities.

#### Constructor

```typescript
new AICF(aicfDir)
```

**Parameters:**
- `aicfDir` (string): Path to the .aicf directory (default: '.aicf')

**Example:**
```typescript
import { AICF } from 'aicf-core';
const aicf = new AICF('.aicf');
```

#### Static Methods

##### `AICF.create(aicfDir)`

Factory method to create an AICF instance.

**Parameters:**
- `aicfDir` (string): Path to the .aicf directory

**Returns:** `AICF` instance

**Example:**
```typescript
const aicf = AICF.create('.aicf');
```

##### `AICF.createReader(aicfDir)`

Create a read-only instance.

**Parameters:**
- `aicfDir` (string): Path to the .aicf directory

**Returns:** `AICFReader` instance

**Example:**
```typescript
const reader = AICF.createReader('.aicf');
```

##### `AICF.createWriter(aicfDir)`

Create a write-only instance.

**Parameters:**
- `aicfDir` (string): Path to the .aicf directory

**Returns:** `AICFWriter` instance

**Example:**
```typescript
const writer = AICF.createWriter('.aicf');
```

##### `AICF.load(aicfDir)`

Load complete AICF context from directory.

**Parameters:**
- `aicfDir` (string): Path to the .aicf directory

**Returns:** `Promise<Object>` - Complete AICF context

**Example:**
```typescript
const context = await AICF.load('.aicf');
```

##### `AICF.getVersion()`

Get version information.

**Returns:** `Object` with version details

**Example:**
```typescript
const version = AICF.getVersion();
// {
//   version: '1.0.0',
//   aicfFormat: '3.0',
//   compressionRatio: '95.5%',
//   semanticLoss: '0%'
// }
```

#### Instance Methods

##### `logConversation(data)`

Log a conversation to AICF.

**Parameters:**
- `data` (Object):
  - `id` (string, required): Unique conversation identifier
  - `messages` (number, required): Number of messages
  - `tokens` (number, required): Approximate token count
  - `metadata` (Object, optional): Additional metadata

**Returns:** `Promise<void>`

**Example:**
```typescript
await aicf.logConversation({
  id: 'conv_001',
  messages: 25,
  tokens: 1200,
  metadata: {
    topic: 'architecture_design',
    user: 'developer'
  }
});
```

##### `addDecision(decision)`

Add a decision record.

**Parameters:**
- `decision` (Object):
  - `description` (string, required): Decision description
  - `impact` (string, required): Impact level (HIGH, MEDIUM, LOW)
  - `confidence` (string, required): Confidence level (HIGH, MEDIUM, LOW)
  - `rationale` (string, optional): Decision rationale

**Returns:** `Promise<void>`

**Example:**
```typescript
await aicf.addDecision({
  description: 'Adopt microservices architecture',
  impact: 'HIGH',
  confidence: 'HIGH',
  rationale: 'Improves scalability and maintainability'
});
```

##### `addInsight(insight)`

Add an insight record.

**Parameters:**
- `insight` (Object):
  - `description` (string, required): Insight description
  - `category` (string, required): Category (ARCHITECTURE, PERFORMANCE, SECURITY, etc.)
  - `priority` (string, required): Priority level (CRITICAL, HIGH, MEDIUM, LOW)
  - `confidence` (string, required): Confidence level (HIGH, MEDIUM, LOW)

**Returns:** `Promise<void>`

**Example:**
```typescript
await aicf.addInsight({
  description: 'Database queries are slow under load',
  category: 'PERFORMANCE',
  priority: 'HIGH',
  confidence: 'HIGH'
});
```

##### `query(queryString)`

Query AICF data with natural language.

**Parameters:**
- `queryString` (string): Natural language query

**Returns:** `Object` with query results
- `relevanceScore` (number): Relevance score (0-1)
- `results` (Array): Matching results
- `query` (string): Original query

**Example:**
```typescript
const results = aicf.query('show me high-impact decisions');
console.log(results.relevanceScore); // 0.85
console.log(results.results.length); // 5
```

##### `getProjectOverview()`

Get comprehensive project overview.

**Returns:** `Object` with project overview
- `stats` (Object): Project statistics
- `recent` (Object): Recent activity
- `summary` (string): Project summary

**Example:**
```typescript
const overview = aicf.getProjectOverview();
console.log(overview.summary);
```

##### `generateAnalytics()`

Generate comprehensive analytics.

**Returns:** `Object` with analytics data
- `overview` (Object): Overview statistics
- `insights` (Object): Insight analytics
- `recommendations` (Array): Recommendations

**Example:**
```typescript
const analytics = aicf.generateAnalytics();
console.log(analytics.overview.totalConversations);
console.log(analytics.insights.highPriority);
```

##### `healthCheck()`

Check system health.

**Returns:** `Object` with health status
- `status` (string): 'healthy', 'degraded', or 'unhealthy'
- `issues` (Array): List of issues found
- `timestamp` (string): Check timestamp

**Example:**
```typescript
const health = aicf.healthCheck();
if (health.status === 'healthy') {
  console.log('✅ System is healthy');
} else {
  console.log('⚠️ Issues:', health.issues);
}
```

##### `exportToJSON()`

Export AICF data to JSON format.

**Returns:** `Object` - Complete AICF data in JSON

**Example:**
```typescript
const json = aicf.exportToJSON();
console.log(JSON.stringify(json, null, 2));
```

##### `exportToMarkdown()`

Export AICF data to Markdown format.

**Returns:** `string` - AICF data in Markdown

**Example:**
```typescript
const markdown = aicf.exportToMarkdown();
console.log(markdown);
```

---

### AICFReader

Read-only operations for AICF data. Optimized for concurrent access and high performance.

#### Constructor

```typescript
new AICFReader(aicfDir)
```

**Parameters:**
- `aicfDir` (string): Path to the .aicf directory

**Example:**
```typescript
import { AICFReader } from 'aicf-core';
const reader = new AICFReader('.aicf');
```

#### Methods

##### `getStats()`

Get project statistics.

**Returns:** `Object` with statistics
- `counts` (Object): Counts of conversations, decisions, insights
- `project` (Object): Project metadata

**Example:**
```typescript
const stats = reader.getStats();
console.log('Total conversations:', stats.counts.conversations);
```

##### `getLastConversations(count)`

Get the last N conversations.

**Parameters:**
- `count` (number): Number of conversations to retrieve

**Returns:** `Array<Object>` - Array of conversation objects

**Example:**
```typescript
const recent = reader.getLastConversations(10);
recent.forEach(conv => {
  console.log(conv.id, conv.messages, conv.tokens);
});
```

##### `getConversationsByDate(startDate, endDate)`

Get conversations within a date range.

**Parameters:**
- `startDate` (Date): Start date
- `endDate` (Date, optional): End date (default: now)

**Returns:** `Array<Object>` - Array of conversation objects

**Example:**
```typescript
const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
const conversations = reader.getConversationsByDate(lastWeek);
```

##### `getDecisionsByDate(startDate, endDate)`

Get decisions within a date range.

**Parameters:**
- `startDate` (Date): Start date
- `endDate` (Date, optional): End date (default: now)

**Returns:** `Array<Object>` - Array of decision objects

**Example:**
```typescript
const recentDecisions = reader.getDecisionsByDate(lastWeek);
```

##### `getDecisionsByImpact(impact)`

Get decisions by impact level.

**Parameters:**
- `impact` (string): Impact level (HIGH, MEDIUM, LOW)

**Returns:** `Array<Object>` - Array of decision objects

**Example:**
```typescript
const highImpact = reader.getDecisionsByImpact('HIGH');
```

##### `getInsightsByPriority(priority)`

Get insights by priority level.

**Parameters:**
- `priority` (string): Priority level (CRITICAL, HIGH, MEDIUM, LOW)

**Returns:** `Array<Object>` - Array of insight objects

**Example:**
```typescript
const critical = reader.getInsightsByPriority('CRITICAL');
```

##### `getInsightsByCategory(category)`

Get insights by category.

**Parameters:**
- `category` (string): Category name

**Returns:** `Array<Object>` - Array of insight objects

**Example:**
```typescript
const performance = reader.getInsightsByCategory('PERFORMANCE');
```

##### `getCurrentWorkState()`

Get current work state.

**Returns:** `Object` - Current work state

**Example:**
```typescript
const workState = reader.getCurrentWorkState();
console.log(workState.status);
```

---

### AICFWriter

Write-only operations for AICF data. Thread-safe with atomic writes.

#### Constructor

```typescript
new AICFWriter(aicfDir)
```

**Parameters:**
- `aicfDir` (string): Path to the .aicf directory

**Example:**
```typescript
import { AICFWriter } from 'aicf-core';
const writer = new AICFWriter('.aicf');
```

#### Methods

##### `logConversation(data)`

Log a conversation (same as AICF.logConversation).

##### `addDecision(decision)`

Add a decision (same as AICF.addDecision).

##### `addInsight(insight)`

Add an insight (same as AICF.addInsight).

##### `updateWorkState(state)`

Update work state.

**Parameters:**
- `state` (Object): Work state data

**Returns:** `Promise<void>`

**Example:**
```typescript
await writer.updateWorkState({
  status: 'in_progress',
  currentTask: 'Implementing authentication',
  blockers: []
});
```

---

## Agent Classes

### IntelligentConversationParser

AI-powered conversation analysis with context understanding.

#### Constructor

```typescript
new IntelligentConversationParser()
```

#### Methods

##### `analyzeConversation(conversationData)`

Analyze conversation with AI intelligence.

**Parameters:**
- `conversationData` (Object): Conversation data to analyze

**Returns:** `Promise<Object>` - Analysis results

**Example:**
```typescript
import { IntelligentConversationParser } from 'aicf-core';
const parser = new IntelligentConversationParser();
const analysis = await parser.analyzeConversation(conversationData);
```

---

### ConversationAnalyzer

Extract insights, decisions, and semantic relationships.

#### Constructor

```typescript
new ConversationAnalyzer()
```

#### Methods

##### `extractInsights(analysis)`

Extract insights from conversation analysis.

**Parameters:**
- `analysis` (Object): Analysis data

**Returns:** `Promise<Array>` - Array of insights

**Example:**
```typescript
import { ConversationAnalyzer } from 'aicf-core';
const analyzer = new ConversationAnalyzer();
const insights = await analyzer.extractInsights(analysis);
```

---

### MemoryLifecycleManager

Automatic memory management with configurable retention policies.

#### Constructor

```typescript
new MemoryLifecycleManager()
```

#### Methods

##### `processMemoryCycle()`

Process memory lifecycle.

**Returns:** `Promise<Object>` - Processing results

**Example:**
```typescript
import { MemoryLifecycleManager } from 'aicf-core';
const manager = new MemoryLifecycleManager();
await manager.processMemoryCycle();
```

---

### MemoryDropoff

Memory dropoff with 7/30/90 day cycles.

#### Constructor

```typescript
new MemoryDropoff()
```

#### Methods

##### `executeDropoff(cycle)`

Execute memory dropoff for specified cycle.

**Parameters:**
- `cycle` (string): Dropoff cycle ('7-day', '30-day', '90-day')

**Returns:** `Promise<Object>` - Dropoff results
- `itemsProcessed` (number): Number of items processed
- `itemsArchived` (number): Number of items archived

**Example:**
```typescript
import { MemoryDropoff } from 'aicf-core';
const dropoff = new MemoryDropoff();
const result = await dropoff.executeDropoff('30-day');
console.log(`Archived ${result.itemsArchived} items`);
```

---

## Utility Functions

### `loadAICF(aicfDir)`

Load complete AICF context from directory.

**Parameters:**
- `aicfDir` (string): Path to .aicf directory

**Returns:** `Promise<Object>` - Complete AICF context

### `query(context, type, filter)`

Query AICF data with flexible filtering.

**Parameters:**
- `context` (Object): AICF context
- `type` (string): Query type
- `filter` (Object): Filter criteria

**Returns:** `Array` - Query results

### `writeAICF(context, aicfDir)`

Write complete AICF context to directory.

**Parameters:**
- `context` (Object): AICF context
- `aicfDir` (string): Path to .aicf directory

**Returns:** `Promise<void>`

---

## Type Definitions

### Conversation

```typescript
interface Conversation {
  id: string;
  messages: number;
  tokens: number;
  metadata?: {
    topic?: string;
    user?: string;
    timestamp?: string;
    [key: string]: any;
  };
}
```

### Decision

```typescript
interface Decision {
  description: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  rationale?: string;
}
```

### Insight

```typescript
interface Insight {
  description: string;
  category: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}
```

---

## Next Steps

- **[Getting Started Guide](./GETTING_STARTED.md)** - Learn the basics
- **[Examples](../examples/)** - Working code samples
- **[Best Practices](./BEST_PRACTICES.md)** - Production patterns

---

**AICF-Core v1.0.0** | **95.5% Compression, 0% Semantic Loss**

