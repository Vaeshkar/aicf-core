# Migration Guide: AICF v3.0 to v3.1

**Upgrading to Memory Management Features**

---

## Overview

AICF v3.1 introduces powerful memory management capabilities based on Google ADK patterns. This guide helps you migrate from v3.0 to v3.1 and take advantage of the new features.

### What's New in v3.1?

- ✅ **@SESSION** - Conversation thread tracking
- ✅ **@EMBEDDING** - Vector search support
- ✅ **@CONSOLIDATION** - Memory lifecycle management
- ✅ **Scope-based @STATE** - session/user/app/temp scoping
- ✅ **Memory type classification** - episodic/semantic/procedural
- ✅ **Enhanced @LINKS** - semantic_cluster, temporal_sequence, causal_relationship

### Backward Compatibility

**Good News**: v3.1 is **fully backward compatible** with v3.0!

- ✅ All v3.0 files work in v3.1 readers
- ✅ New sections are **optional**
- ✅ Existing code continues to work
- ✅ Gradual migration is supported

---

## Migration Checklist

### Phase 1: Immediate (No Breaking Changes)

- [ ] Update AICF version declaration to `3.1`
- [ ] Review new semantic tags (@SESSION, @EMBEDDING, @CONSOLIDATION)
- [ ] Understand scope-based state management
- [ ] Read memory management documentation

### Phase 2: Gradual Enhancement (Optional)

- [ ] Add @SESSION tracking to conversations
- [ ] Implement scope prefixes in @STATE (user:, app:, temp:)
- [ ] Add memory_type classification to @INSIGHTS
- [ ] Generate embeddings for semantic search
- [ ] Implement memory consolidation

### Phase 3: Advanced Features (Optional)

- [ ] Integrate with vector databases
- [ ] Build semantic search capabilities
- [ ] Implement automated consolidation
- [ ] Add memory lifecycle management

---

## Step-by-Step Migration

### Step 1: Update Version Declaration

**Before (v3.0)**:
```aicf
1|@AICF_VERSION
2|version=3.0
3|
```

**After (v3.1)**:
```aicf
1|@AICF_VERSION
2|version=3.1
3|
```

**Impact**: None - this is informational only

---

### Step 2: Add Session Tracking (Optional)

**Before (v3.0)** - No session tracking:
```aicf
@CONVERSATION:conv_001
timestamp_start=2025-10-06T08:00:00Z
timestamp_end=2025-10-06T09:00:00Z
messages=15
```

**After (v3.1)** - With session tracking:
```aicf
@SESSION:session_001
app_name=my_app
user_id=user_123
created_at=2025-10-06T08:00:00Z
last_update_time=2025-10-06T09:00:00Z
status=completed
event_count=15

@CONVERSATION:conv_001
timestamp_start=2025-10-06T08:00:00Z
timestamp_end=2025-10-06T09:00:00Z
messages=15
```

**Benefits**:
- Track conversation lifecycle
- Monitor session metrics
- Enable multi-session analytics

---

### Step 3: Implement Scope-Based State (Recommended)

**Before (v3.0)** - Flat state:
```aicf
@STATE
status=completed
user_language=python
max_tokens=128000
validation_needed=true
```

**After (v3.1)** - Scoped state:
```aicf
@STATE
status=completed

@STATE:user
user:language=python
user:experience_level=senior

@STATE:app
app:max_tokens=128000
app:api_version=3.1

@STATE:temp
temp:validation_needed=true
```

**Benefits**:
- Clear separation of concerns
- User preferences persist across sessions
- App config shared across users
- Temporary data automatically cleaned up

**Migration Code**:
```javascript
// Before (v3.0)
const state = {
  status: 'completed',
  user_language: 'python',
  max_tokens: 128000,
  validation_needed: true
};

// After (v3.1)
const sessionState = {
  status: 'completed'
};

const userState = {
  'user:language': 'python',
  'user:experience_level': 'senior'
};

const appState = {
  'app:max_tokens': 128000,
  'app:api_version': '3.1'
};

const tempState = {
  'temp:validation_needed': true
};
```

---

### Step 4: Add Memory Type Classification (Recommended)

**Before (v3.0)** - No memory type:
```aicf
@INSIGHTS
@INSIGHTS microservices_enable_scaling|ARCHITECTURE|HIGH|HIGH
```

**After (v3.1)** - With memory type:
```aicf
@INSIGHTS
@INSIGHTS microservices_enable_scaling|ARCHITECTURE|HIGH|HIGH|memory_type=semantic
```

**Memory Type Guidelines**:
- `episodic` - Specific past events ("User approved design on 2025-10-06")
- `semantic` - Facts and concepts ("User prefers microservices architecture")
- `procedural` - Rules and behaviors ("Always validate before implementation")

**Migration Code**:
```javascript
// Classify existing insights
function classifyMemoryType(insight) {
  // Check if it's a specific event
  if (insight.includes('timestamp') || insight.includes('on 2025')) {
    return 'episodic';
  }
  
  // Check if it's a rule or behavior
  if (insight.includes('always') || insight.includes('should') || insight.includes('must')) {
    return 'procedural';
  }
  
  // Default to semantic (facts and concepts)
  return 'semantic';
}
```

---

### Step 5: Add Vector Embeddings (Optional)

**New in v3.1** - Enable semantic search:
```aicf
@EMBEDDING:conv_001
model=text-embedding-3-large
dimension=1536
vector=0.123,0.456,0.789,...
indexed_at=2025-10-06T00:00:00Z
keywords=microservices|architecture|scalability
```

**Implementation**:
```javascript
const { OpenAI } = require('openai');
const openai = new OpenAI();

// Generate embedding for conversation
async function addEmbedding(conversationId, text) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: text
  });
  
  const embedding = response.data[0].embedding;
  
  await aicf.addEmbedding(conversationId, {
    model: 'text-embedding-3-large',
    dimension: embedding.length,
    vector: embedding,
    indexed_at: new Date().toISOString()
  });
}
```

---

### Step 6: Implement Memory Consolidation (Optional)

**New in v3.1** - Consolidate related memories:
```aicf
@CONSOLIDATION:cluster_001
source_items=conv_001|conv_002|conv_003
consolidated_at=2025-10-06T00:00:00Z
method=semantic_clustering
semantic_theme=microservices_architecture
key_facts=scalability|service_mesh|containers
information_preserved=95.5%
```

**Implementation**:
```javascript
// Consolidate related conversations
async function consolidateMemories(conversationIds, theme) {
  // Extract key facts from conversations
  const conversations = await Promise.all(
    conversationIds.map(id => aicf.getConversation(id))
  );
  
  const keyFacts = extractKeyFacts(conversations);
  
  // Create consolidation
  await aicf.createConsolidation({
    source_items: conversationIds,
    method: 'semantic_clustering',
    semantic_theme: theme,
    key_facts: keyFacts,
    information_preserved: '95.5%'
  });
}
```

---

## Code Migration Examples

### Example 1: Basic Conversation (v3.0 → v3.1)

**Before (v3.0)**:
```javascript
const conversation = await aicf.createConversation({
  id: 'conv_001',
  timestamp_start: new Date().toISOString(),
  messages: []
});

await aicf.addState({
  status: 'in_progress'
});
```

**After (v3.1)**:
```javascript
// Create session first
const session = await aicf.createSession({
  app_name: 'my_app',
  user_id: 'user_123'
});

// Create conversation within session
const conversation = await aicf.createConversation({
  id: 'conv_001',
  session_id: session.id,
  timestamp_start: new Date().toISOString(),
  messages: []
});

// Add scoped state
await aicf.addState('session', session.id, {
  status: 'in_progress'
});

await aicf.addState('user', 'user_123', {
  'user:preferred_language': 'python'
});
```

### Example 2: Insights with Memory Types (v3.0 → v3.1)

**Before (v3.0)**:
```javascript
await aicf.addInsight({
  text: 'User prefers microservices',
  category: 'ARCHITECTURE',
  priority: 'HIGH',
  confidence: 'HIGH'
});
```

**After (v3.1)**:
```javascript
await aicf.addInsight({
  text: 'User prefers microservices',
  category: 'ARCHITECTURE',
  priority: 'HIGH',
  confidence: 'HIGH',
  memory_type: 'semantic'  // NEW: Classify as semantic memory
});
```

### Example 3: Semantic Search (New in v3.1)

```javascript
// Generate embedding for query
const queryEmbedding = await generateEmbedding('microservices architecture');

// Search for similar conversations
const results = await aicf.searchByEmbedding({
  embedding: queryEmbedding,
  limit: 5,
  threshold: 0.85
});

console.log('Similar conversations:', results);
```

---

## Testing Your Migration

### Validation Checklist

- [ ] All v3.0 files still parse correctly
- [ ] New v3.1 features work as expected
- [ ] Scope-based state separates correctly
- [ ] Memory types classify appropriately
- [ ] Embeddings generate successfully
- [ ] Consolidation preserves key information

### Test Script

```javascript
const { AICFCore } = require('aicf-core');

async function testMigration() {
  const aicf = new AICFCore();
  
  // Test 1: v3.0 compatibility
  const v30File = await aicf.load('old-v3.0-file.aicf');
  console.assert(v30File.version === '3.0', 'v3.0 file should load');
  
  // Test 2: v3.1 features
  const session = await aicf.createSession({
    app_name: 'test',
    user_id: 'test_user'
  });
  console.assert(session.id, 'Session should be created');
  
  // Test 3: Scoped state
  await aicf.addState('user', 'test_user', {
    'user:test': 'value'
  });
  const userState = await aicf.getState('user', 'test_user');
  console.assert(userState['user:test'] === 'value', 'User state should persist');
  
  console.log('✅ All migration tests passed!');
}

testMigration();
```

---

## Common Migration Issues

### Issue 1: State Scope Confusion

**Problem**: Mixing scoped and unscoped state keys

**Solution**: Use consistent prefixes
```javascript
// ❌ Wrong
const state = {
  'user:language': 'python',
  language: 'javascript'  // Conflict!
};

// ✅ Correct
const userState = {
  'user:language': 'python'
};
const sessionState = {
  language: 'javascript'
};
```

### Issue 2: Memory Type Misclassification

**Problem**: Classifying all memories as semantic

**Solution**: Use appropriate types
```javascript
// ❌ Wrong
memory_type: 'semantic'  // For everything

// ✅ Correct
// Specific event
memory_type: 'episodic'  // "User approved design on 2025-10-06"

// General fact
memory_type: 'semantic'  // "User prefers microservices"

// Behavior rule
memory_type: 'procedural'  // "Always validate before implementation"
```

### Issue 3: Embedding Dimension Mismatch

**Problem**: Using different embedding models with different dimensions

**Solution**: Standardize on one model
```javascript
// ✅ Correct - Use consistent model
const EMBEDDING_MODEL = 'text-embedding-3-large';
const EMBEDDING_DIMENSION = 1536;

async function generateEmbedding(text) {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text
  });
  
  console.assert(
    response.data[0].embedding.length === EMBEDDING_DIMENSION,
    'Dimension mismatch!'
  );
  
  return response.data[0].embedding;
}
```

---

## Rollback Plan

If you need to rollback to v3.0:

1. **Change version declaration** back to `3.0`
2. **Remove new sections** (@SESSION, @EMBEDDING, @CONSOLIDATION)
3. **Flatten scoped state** back to single @STATE
4. **Remove memory_type** fields from @INSIGHTS

**Note**: You'll lose the new features, but your data remains intact.

---

## Getting Help

- **Documentation**: [MEMORY_MANAGEMENT.md](./MEMORY_MANAGEMENT.md)
- **Examples**: [examples/06-memory-management.js](../examples/06-memory-management.js)
- **Issues**: [GitHub Issues](https://github.com/Vaeshkar/aicf-core/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Vaeshkar/aicf-core/discussions)

---

**Ready to migrate?** Start with Phase 1 and gradually adopt new features! 🚀

