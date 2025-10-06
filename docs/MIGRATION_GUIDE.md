# AICF-Core Migration Guide

Guide for migrating between AICF versions and converting from other formats.

## Table of Contents

- [Upgrading from v2.x to v3.0](#upgrading-from-v2x-to-v30)
- [Converting from JSON](#converting-from-json)
- [Converting from SQLite](#converting-from-sqlite)
- [Converting from Plain Text](#converting-from-plain-text)
- [Breaking Changes](#breaking-changes)
- [Migration Tools](#migration-tools)

---

## Upgrading from v2.x to v3.0

### What's New in v3.0

- **Enhanced compression** - 95.5% compression (up from 90%)
- **New semantic tags** - `@INSIGHTS`, `@DECISIONS`, `@WORK`
- **Improved query API** - Natural language queries
- **Agent system** - Intelligent conversation parsing
- **Memory lifecycle** - Automatic memory management

### Breaking Changes

#### 1. API Changes

**v2.x:**
```javascript
const aicf = require('aicf-core');
aicf.log(data);
```

**v3.0:**
```javascript
const { AICF } = require('aicf-core');
const aicf = AICF.create('.aicf');
await aicf.logConversation(data);
```

#### 2. File Format Changes

**v2.x format:**
```
1|CONV|conv_001|10|500
2|DATA|user_message
3|DATA|assistant_message
```

**v3.0 format:**
```
@CONVERSATION:conv_001
timestamp_start=2025-01-06T08:00:00Z
messages=10
tokens=500

@STATE
status=completed
```

#### 3. Configuration Changes

**v2.x:**
```javascript
const aicf = require('aicf-core')({
  dir: '.aicf',
  format: 'v2'
});
```

**v3.0:**
```javascript
const { AICF } = require('aicf-core');
const aicf = AICF.create('.aicf');
```

### Migration Steps

#### Step 1: Backup Existing Data

```bash
# Backup v2.x data
cp -r .aicf .aicf-v2-backup
```

#### Step 2: Install v3.0

```bash
npm install aicf-core@latest
```

#### Step 3: Run Migration Script

```javascript
const { AICF } = require('aicf-core');
const fs = require('fs');
const path = require('path');

async function migrateV2ToV3() {
  console.log('Starting migration from v2.x to v3.0...');
  
  // Read v2 data
  const v2Dir = '.aicf-v2-backup';
  const v2Files = fs.readdirSync(v2Dir);
  
  // Create v3 instance
  const aicf = AICF.create('.aicf-v3');
  
  // Migrate each file
  for (const file of v2Files) {
    if (!file.endsWith('.aicf')) continue;
    
    const filePath = path.join(v2Dir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    // Parse v2 format
    for (const line of lines) {
      const [lineNum, type, ...data] = line.split('|');
      
      if (type === 'CONV') {
        const [id, messages, tokens] = data;
        await aicf.logConversation({
          id,
          messages: parseInt(messages),
          tokens: parseInt(tokens),
          metadata: {
            migrated_from: 'v2',
            original_line: lineNum
          }
        });
      }
    }
  }
  
  console.log('Migration completed!');
  
  // Verify migration
  const stats = aicf.reader.getStats();
  console.log('Migrated conversations:', stats.counts.conversations);
}

migrateV2ToV3().catch(console.error);
```

#### Step 4: Verify Migration

```javascript
const { AICF } = require('aicf-core');

async function verifyMigration() {
  const aicf = AICF.create('.aicf-v3');
  
  // Check health
  const health = aicf.healthCheck();
  console.log('Health:', health.status);
  
  // Check stats
  const stats = aicf.reader.getStats();
  console.log('Stats:', stats);
  
  // Sample data
  const conversations = aicf.reader.getLastConversations(5);
  console.log('Sample conversations:', conversations);
}

verifyMigration().catch(console.error);
```

#### Step 5: Update Application Code

Update your application to use the new v3.0 API:

```javascript
// Old v2.x code
const aicf = require('aicf-core');
aicf.log({ id: 'conv_001', messages: 10 });

// New v3.0 code
const { AICF } = require('aicf-core');
const aicf = AICF.create('.aicf');
await aicf.logConversation({
  id: 'conv_001',
  messages: 10,
  tokens: 500,
  metadata: { topic: 'example' }
});
```

---

## Converting from JSON

### Why Convert to AICF?

- **95.5% smaller** - Massive storage savings
- **Faster queries** - O(1) index access
- **AI-native** - Direct AI readability
- **Better structure** - Semantic organization

### Conversion Script

```javascript
const { AICF } = require('aicf-core');
const fs = require('fs');

async function convertJSONToAICF(jsonFile, aicfDir) {
  console.log('Converting JSON to AICF...');
  
  // Read JSON
  const jsonData = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
  
  // Create AICF instance
  const aicf = AICF.create(aicfDir);
  
  // Convert conversations
  if (jsonData.conversations) {
    for (const conv of jsonData.conversations) {
      await aicf.logConversation({
        id: conv.id || `conv_${Date.now()}`,
        messages: conv.messages || conv.message_count || 0,
        tokens: conv.tokens || estimateTokens(conv),
        metadata: {
          ...conv.metadata,
          converted_from: 'json',
          original_timestamp: conv.timestamp
        }
      });
    }
  }
  
  // Convert decisions
  if (jsonData.decisions) {
    for (const decision of jsonData.decisions) {
      await aicf.addDecision({
        description: decision.description || decision.text,
        impact: decision.impact || 'MEDIUM',
        confidence: decision.confidence || 'MEDIUM',
        rationale: decision.rationale || decision.reason
      });
    }
  }
  
  console.log('Conversion completed!');
  
  // Show compression stats
  const jsonSize = fs.statSync(jsonFile).size;
  const aicfSize = getDirectorySize(aicfDir);
  const compression = ((1 - aicfSize / jsonSize) * 100).toFixed(1);
  
  console.log(`JSON size: ${jsonSize} bytes`);
  console.log(`AICF size: ${aicfSize} bytes`);
  console.log(`Compression: ${compression}%`);
}

function estimateTokens(conv) {
  // Simple token estimation
  const text = JSON.stringify(conv);
  return Math.ceil(text.length / 4);
}

function getDirectorySize(dir) {
  let size = 0;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    size += fs.statSync(filePath).size;
  }
  return size;
}

// Usage
convertJSONToAICF('conversations.json', '.aicf')
  .catch(console.error);
```

### Example JSON Structure

```json
{
  "conversations": [
    {
      "id": "conv_001",
      "messages": 25,
      "tokens": 1200,
      "timestamp": "2025-01-06T08:00:00Z",
      "metadata": {
        "topic": "architecture_design",
        "user": "developer"
      }
    }
  ],
  "decisions": [
    {
      "description": "Adopt microservices architecture",
      "impact": "HIGH",
      "confidence": "HIGH",
      "rationale": "Improves scalability"
    }
  ]
}
```

---

## Converting from SQLite

### Conversion Script

```javascript
const { AICF } = require('aicf-core');
const sqlite3 = require('sqlite3').verbose();

async function convertSQLiteToAICF(dbPath, aicfDir) {
  console.log('Converting SQLite to AICF...');
  
  const db = new sqlite3.Database(dbPath);
  const aicf = AICF.create(aicfDir);
  
  // Convert conversations
  await new Promise((resolve, reject) => {
    db.all('SELECT * FROM conversations', async (err, rows) => {
      if (err) return reject(err);
      
      for (const row of rows) {
        await aicf.logConversation({
          id: row.id,
          messages: row.message_count,
          tokens: row.token_count,
          metadata: {
            topic: row.topic,
            timestamp: row.created_at,
            converted_from: 'sqlite'
          }
        });
      }
      
      resolve();
    });
  });
  
  // Convert decisions
  await new Promise((resolve, reject) => {
    db.all('SELECT * FROM decisions', async (err, rows) => {
      if (err) return reject(err);
      
      for (const row of rows) {
        await aicf.addDecision({
          description: row.description,
          impact: row.impact,
          confidence: row.confidence,
          rationale: row.rationale
        });
      }
      
      resolve();
    });
  });
  
  db.close();
  console.log('Conversion completed!');
}

// Usage
convertSQLiteToAICF('conversations.db', '.aicf')
  .catch(console.error);
```

---

## Converting from Plain Text

### Conversion Script

```javascript
const { AICF } = require('aicf-core');
const fs = require('fs');

async function convertTextToAICF(textFile, aicfDir) {
  console.log('Converting plain text to AICF...');
  
  const content = fs.readFileSync(textFile, 'utf8');
  const aicf = AICF.create(aicfDir);
  
  // Split into conversations (assuming blank line separators)
  const conversations = content.split('\n\n');
  
  for (let i = 0; i < conversations.length; i++) {
    const conv = conversations[i].trim();
    if (!conv) continue;
    
    const lines = conv.split('\n');
    const messages = lines.length;
    const tokens = Math.ceil(conv.length / 4);
    
    await aicf.logConversation({
      id: `conv_text_${i + 1}`,
      messages,
      tokens,
      metadata: {
        content: conv,
        converted_from: 'text',
        line_count: lines.length
      }
    });
  }
  
  console.log('Conversion completed!');
}

// Usage
convertTextToAICF('conversations.txt', '.aicf')
  .catch(console.error);
```

---

## Breaking Changes

### v3.0 Breaking Changes

1. **Module exports changed**
   - Old: `require('aicf-core')`
   - New: `require('aicf-core').AICF`

2. **Async operations**
   - All write operations now return Promises
   - Use `await` or `.then()`

3. **Configuration format**
   - No more config object in constructor
   - Use factory methods instead

4. **File format**
   - New semantic tag structure
   - Line numbering removed
   - Pipe-delimited metadata

### Compatibility Mode

For gradual migration, use compatibility mode:

```javascript
const { AICF } = require('aicf-core');

const aicf = AICF.create('.aicf', {
  compatibility: 'v2',  // Read v2 format
  writeFormat: 'v3'     // Write v3 format
});
```

---

## Migration Tools

### Automated Migration Tool

```bash
# Install migration tool
npm install -g aicf-migrate

# Run migration
aicf-migrate --from v2 --to v3 --dir .aicf

# Convert from JSON
aicf-migrate --from json --input data.json --output .aicf

# Convert from SQLite
aicf-migrate --from sqlite --input data.db --output .aicf
```

### Validation Tool

```bash
# Validate migration
aicf-validate .aicf

# Check for issues
aicf-validate .aicf --strict

# Generate report
aicf-validate .aicf --report migration-report.json
```

---

## Post-Migration Checklist

- [ ] Backup original data
- [ ] Run migration script
- [ ] Verify data integrity
- [ ] Update application code
- [ ] Test all functionality
- [ ] Monitor performance
- [ ] Update documentation
- [ ] Train team on new API

---

## Getting Help

- **GitHub Issues**: [Report migration issues](https://github.com/Vaeshkar/aicf-core/issues)
- **Discussions**: [Ask migration questions](https://github.com/Vaeshkar/aicf-core/discussions)
- **Documentation**: [Read the docs](https://github.com/Vaeshkar/aicf-core/tree/main/docs)

---

**AICF-Core Migration Guide** | **Seamless Upgrades**

