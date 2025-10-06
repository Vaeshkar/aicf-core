# AICF-Core Best Practices

Production-ready patterns and best practices for AICF-Core deployment.

## Table of Contents

- [File Organization](#file-organization)
- [Memory Lifecycle Management](#memory-lifecycle-management)
- [Performance Optimization](#performance-optimization)
- [Security Considerations](#security-considerations)
- [Production Deployment](#production-deployment)
- [Error Handling](#error-handling)
- [Monitoring & Observability](#monitoring--observability)
- [Scaling Strategies](#scaling-strategies)

---

## File Organization

### Directory Structure

**✅ Recommended:**

```
project/
├── .aicf/                    # AICF data directory
│   ├── index.aicf           # Fast lookup metadata
│   ├── conversation-memory.aicf
│   ├── technical-context.aicf
│   ├── work-state.aicf
│   └── decisions.aicf
├── .aicf-archive/           # Archived data (optional)
│   └── 2025-01/
│       └── archived-conversations.aicf
├── src/
│   └── aicf-service.js      # AICF service layer
└── .gitignore               # Exclude .aicf from version control
```

**❌ Avoid:**
- Committing `.aicf` directories to version control
- Mixing AICF data with application code
- Using relative paths without proper resolution

### .gitignore Configuration

```gitignore
# AICF data directories
.aicf/
.aicf-*/

# Keep example structure
!examples/.aicf/README.md
```

### File Naming Conventions

**✅ Good:**
- `conversation-memory.aicf` - Descriptive, lowercase, hyphenated
- `technical-context.aicf` - Clear purpose
- `work-state.aicf` - Consistent naming

**❌ Bad:**
- `conv.aicf` - Too abbreviated
- `ConversationMemory.aicf` - Inconsistent casing
- `data.aicf` - Too generic

---

## Memory Lifecycle Management

### Retention Policies

**Recommended Retention Schedule:**

```javascript
// Daily: Process memory lifecycle
const dailyJob = cron.schedule('0 0 * * *', async () => {
  const manager = new MemoryLifecycleManager();
  await manager.processMemoryCycle();
});

// Weekly: 7-day dropoff (Sundays at 2 AM)
const weeklyJob = cron.schedule('0 2 * * 0', async () => {
  const dropoff = new MemoryDropoff();
  await dropoff.executeDropoff('7-day');
});

// Monthly: 30-day dropoff (1st of month at 3 AM)
const monthlyJob = cron.schedule('0 3 1 * *', async () => {
  const dropoff = new MemoryDropoff();
  await dropoff.executeDropoff('30-day');
});

// Quarterly: 90-day dropoff (1st of quarter at 4 AM)
const quarterlyJob = cron.schedule('0 4 1 1,4,7,10 *', async () => {
  const dropoff = new MemoryDropoff();
  await dropoff.executeDropoff('90-day');
});
```

### Selective Archiving

**✅ Keep Indefinitely:**
- High-impact decisions
- Critical insights
- Security-related conversations
- Compliance-required data

**✅ Archive After 30 Days:**
- Routine conversations
- Low-priority insights
- Completed project discussions

**✅ Archive After 90 Days:**
- Historical data
- Deprecated decisions
- Old work states

### Memory Optimization

```javascript
class AICFMemoryOptimizer {
  constructor(aicfDir) {
    this.aicf = AICF.create(aicfDir);
  }

  async optimizeMemory() {
    // 1. Archive old conversations
    await this.archiveOldConversations();
    
    // 2. Consolidate insights
    await this.consolidateInsights();
    
    // 3. Clean up duplicates
    await this.removeDuplicates();
    
    // 4. Update indexes
    await this.rebuildIndexes();
  }

  async archiveOldConversations() {
    const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const oldConvs = this.aicf.reader.getConversationsByDate(
      new Date(0), 
      cutoffDate
    );
    
    // Archive to separate location
    for (const conv of oldConvs) {
      await this.archiveConversation(conv);
    }
  }
}
```

---

## Performance Optimization

### Query Optimization

**✅ Efficient Queries:**

```javascript
// Use date range filters
const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
const recent = reader.getConversationsByDate(lastWeek);

// Use specific filters
const highImpact = reader.getDecisionsByImpact('HIGH');

// Limit result sets
const last10 = reader.getLastConversations(10);
```

**❌ Inefficient Queries:**

```javascript
// Don't load all data then filter
const all = reader.getAllConversations(); // Slow!
const filtered = all.filter(c => c.metadata.topic === 'auth');

// Don't query without limits
const unlimited = reader.getConversationsByDate(new Date(0)); // Slow!
```

### Caching Strategy

```javascript
class AICFCache {
  constructor(aicf, ttl = 60000) { // 1 minute TTL
    this.aicf = aicf;
    this.ttl = ttl;
    this.cache = new Map();
  }

  async getStats() {
    const key = 'stats';
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.data;
    }
    
    const stats = this.aicf.reader.getStats();
    this.cache.set(key, {
      data: stats,
      timestamp: Date.now()
    });
    
    return stats;
  }

  invalidate(key) {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }
}
```

### Batch Operations

```javascript
// ✅ Batch writes
async function batchLogConversations(conversations) {
  const writer = new AICFWriter('.aicf');
  
  for (const conv of conversations) {
    await writer.logConversation(conv);
  }
  
  // Single index update at the end
  await writer.updateIndex();
}

// ❌ Individual writes with index updates
async function inefficientWrites(conversations) {
  for (const conv of conversations) {
    const writer = new AICFWriter('.aicf');
    await writer.logConversation(conv);
    await writer.updateIndex(); // Expensive!
  }
}
```

### Connection Pooling

```javascript
class AICFPool {
  constructor(aicfDir, poolSize = 5) {
    this.readers = Array(poolSize).fill(null)
      .map(() => new AICFReader(aicfDir));
    this.currentIndex = 0;
  }

  getReader() {
    const reader = this.readers[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.readers.length;
    return reader;
  }
}

// Usage
const pool = new AICFPool('.aicf', 10);
const reader = pool.getReader();
const stats = reader.getStats();
```

---

## Security Considerations

### PII Detection and Redaction

```javascript
class PIIRedactor {
  constructor() {
    this.patterns = {
      email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
      ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
      creditCard: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g
    };
  }

  redact(text) {
    let redacted = text;
    
    for (const [type, pattern] of Object.entries(this.patterns)) {
      redacted = redacted.replace(pattern, `[REDACTED_${type.toUpperCase()}]`);
    }
    
    return redacted;
  }

  async logConversationSafely(aicf, data) {
    // Redact PII from metadata
    if (data.metadata) {
      for (const [key, value] of Object.entries(data.metadata)) {
        if (typeof value === 'string') {
          data.metadata[key] = this.redact(value);
        }
      }
    }
    
    await aicf.logConversation(data);
  }
}
```

### Access Control

```javascript
class SecureAICFService {
  constructor(aicfDir, permissions) {
    this.aicf = AICF.create(aicfDir);
    this.permissions = permissions;
  }

  async logConversation(userId, data) {
    // Check write permission
    if (!this.permissions.canWrite(userId)) {
      throw new Error('Insufficient permissions');
    }
    
    // Add audit trail
    data.metadata = {
      ...data.metadata,
      logged_by: userId,
      logged_at: new Date().toISOString()
    };
    
    await this.aicf.logConversation(data);
  }

  async getConversations(userId) {
    // Check read permission
    if (!this.permissions.canRead(userId)) {
      throw new Error('Insufficient permissions');
    }
    
    return this.aicf.reader.getLastConversations(10);
  }
}
```

### Encryption at Rest

```javascript
const crypto = require('crypto');

class EncryptedAICFWriter {
  constructor(aicfDir, encryptionKey) {
    this.writer = new AICFWriter(aicfDir);
    this.key = encryptionKey;
  }

  encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  async logConversation(data) {
    // Encrypt sensitive fields
    if (data.metadata) {
      data.metadata = {
        ...data.metadata,
        encrypted: true,
        data: this.encrypt(JSON.stringify(data.metadata))
      };
    }
    
    await this.writer.logConversation(data);
  }
}
```

---

## Production Deployment

### Service Layer Pattern

```javascript
class AICFService {
  constructor(config) {
    this.aicf = AICF.create(config.aicfDir);
    this.logger = config.logger || console;
    this.metrics = config.metrics;
  }

  async logConversation(data) {
    const startTime = Date.now();
    
    try {
      // Validate input
      this.validateConversation(data);
      
      // Log conversation
      await this.aicf.logConversation(data);
      
      // Record metrics
      this.metrics.recordLatency('log_conversation', Date.now() - startTime);
      this.metrics.increment('conversations_logged');
      
      // Log success
      this.logger.info('Conversation logged', { id: data.id });
      
      return { success: true };
    } catch (error) {
      // Record error
      this.metrics.increment('log_conversation_errors');
      
      // Log error
      this.logger.error('Failed to log conversation', {
        error: error.message,
        data
      });
      
      throw error;
    }
  }

  validateConversation(data) {
    if (!data.id) throw new Error('Missing conversation ID');
    if (!data.messages) throw new Error('Missing message count');
    if (!data.tokens) throw new Error('Missing token count');
  }
}
```

### Health Check Endpoint

```javascript
app.get('/health/aicf', async (req, res) => {
  try {
    const health = aicfService.healthCheck();
    
    res.status(health.status === 'healthy' ? 200 : 503).json({
      status: health.status,
      issues: health.issues,
      timestamp: health.timestamp
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});
```

### Graceful Shutdown

```javascript
class AICFApplication {
  constructor() {
    this.aicf = AICF.create('.aicf');
    this.isShuttingDown = false;
  }

  async shutdown() {
    if (this.isShuttingDown) return;
    
    this.isShuttingDown = true;
    console.log('Shutting down AICF service...');
    
    // Stop accepting new requests
    this.server.close();
    
    // Wait for pending operations
    await this.waitForPendingOperations();
    
    // Flush any cached data
    await this.flushCache();
    
    // Final health check
    const health = this.aicf.healthCheck();
    console.log('Final health status:', health.status);
    
    console.log('AICF service shut down gracefully');
  }

  async waitForPendingOperations() {
    // Wait for all pending writes to complete
    await Promise.all(this.pendingWrites);
  }
}

// Handle shutdown signals
process.on('SIGTERM', async () => {
  await app.shutdown();
  process.exit(0);
});
```

---

## Error Handling

### Comprehensive Error Handling

```javascript
class RobustAICFService {
  async logConversation(data) {
    try {
      await this.aicf.logConversation(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Directory doesn't exist
        await this.createDirectory();
        return this.logConversation(data); // Retry
      } else if (error.code === 'EACCES') {
        // Permission denied
        this.logger.error('Permission denied', { error });
        throw new Error('Insufficient permissions');
      } else if (error.message.includes('validation')) {
        // Validation error
        this.logger.warn('Validation failed', { data, error });
        throw error;
      } else {
        // Unknown error
        this.logger.error('Unexpected error', { error });
        throw error;
      }
    }
  }
}
```

---

## Monitoring & Observability

### Metrics Collection

```javascript
class AICFMetrics {
  constructor() {
    this.metrics = {
      conversationsLogged: 0,
      decisionsAdded: 0,
      insightsAdded: 0,
      queriesExecuted: 0,
      errors: 0,
      latencies: []
    };
  }

  recordLatency(operation, latency) {
    this.latencies.push({ operation, latency, timestamp: Date.now() });
  }

  getMetrics() {
    return {
      ...this.metrics,
      avgLatency: this.calculateAvgLatency(),
      p95Latency: this.calculateP95Latency()
    };
  }
}
```

### Logging Best Practices

```javascript
// ✅ Structured logging
logger.info('Conversation logged', {
  conversationId: data.id,
  messages: data.messages,
  tokens: data.tokens,
  duration: Date.now() - startTime
});

// ❌ Unstructured logging
console.log(`Logged conversation ${data.id}`);
```

---

## Scaling Strategies

### Horizontal Scaling

```javascript
// Use Redis for coordination
const aicf = new AICF('.aicf', {
  coordination: 'redis',
  redisUrl: 'redis://cluster:6379',
  sharding: 'conversation_id'
});
```

### Load Balancing

```
┌─────────────┐
│ Load        │
│ Balancer    │
└──────┬──────┘
       │
   ┌───┴───┬───────┬───────┐
   │       │       │       │
┌──▼──┐ ┌──▼──┐ ┌──▼──┐ ┌──▼──┐
│ App │ │ App │ │ App │ │ App │
│  1  │ │  2  │ │  3  │ │  4  │
└──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘
   │       │       │       │
   └───┬───┴───────┴───────┘
       │
  ┌────▼────┐
  │ Shared  │
  │  AICF   │
  │ Storage │
  └─────────┘
```

---

**Next Steps:**
- [API Reference](./API_REFERENCE.md)
- [Examples](../examples/)
- [Getting Started](./GETTING_STARTED.md)

