# AICF-Core Integration Tutorials

Step-by-step guides for integrating AICF-Core with popular AI frameworks and platforms.

## Table of Contents

- [LangChain Integration](#langchain-integration)
- [OpenAI API Integration](#openai-api-integration)
- [Claude API Integration](#claude-api-integration)
- [Vector Database Integration](#vector-database-integration)
- [Cloud Storage Integration](#cloud-storage-integration)
- [Express.js API Integration](#expressjs-api-integration)

---

## LangChain Integration

### Overview

Use AICF as a memory provider for LangChain applications.

### Installation

```bash
npm install aicf-core langchain
```

### Basic Integration

```typescript
import { AICF } from 'aicf-core';
import { BufferMemory } from 'langchain/memory';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { ConversationChain } from 'langchain/chains';

// Create AICF-backed memory
class AICFMemory extends BufferMemory {
  constructor(aicfDir) {
    super();
    this.aicf = AICF.create(aicfDir);
  }

  async saveContext(inputValues, outputValues) {
    // Save to LangChain's buffer
    await super.saveContext(inputValues, outputValues);
    
    // Also save to AICF
    await this.aicf.logConversation({
      id: `conv_${Date.now()}`,
      messages: this.chatHistory.messages.length,
      tokens: this.estimateTokens(),
      metadata: {
        input: inputValues.input,
        output: outputValues.output,
        timestamp: new Date().toISOString()
      }
    });
  }

  estimateTokens() {
    // Simple token estimation
    const text = this.chatHistory.messages
      .map(m => m.content)
      .join(' ');
    return Math.ceil(text.length / 4);
  }

  async loadMemoryVariables() {
    // Load from LangChain buffer
    const variables = await super.loadMemoryVariables();
    
    // Optionally enrich with AICF context
    const recentConvs = this.aicf.reader.getLastConversations(5);
    variables.aicf_context = recentConvs;
    
    return variables;
  }
}

// Usage
async function main() {
  const memory = new AICFMemory('.aicf');
  
  const model = new ChatOpenAI({
    temperature: 0.7,
    openAIApiKey: process.env.OPENAI_API_KEY
  });
  
  const chain = new ConversationChain({
    llm: model,
    memory: memory
  });
  
  // Have a conversation
  const response1 = await chain.call({
    input: "Hello! I'm working on a new project."
  });
  console.log(response1.response);
  
  const response2 = await chain.call({
    input: "What did I just tell you?"
  });
  console.log(response2.response);
  
  // Check AICF storage
  const stats = memory.aicf.reader.getStats();
  console.log('Conversations stored:', stats.counts.conversations);
}

main().catch(console.error);
```

### Advanced: Context Injection

```typescript
class EnhancedAICFMemory extends AICFMemory {
  async loadMemoryVariables() {
    const variables = await super.loadMemoryVariables();
    
    // Inject relevant context from AICF
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentDecisions = this.aicf.reader.getDecisionsByDate(lastWeek);
    const highPriorityInsights = this.aicf.reader.getInsightsByPriority('HIGH');
    
    variables.recent_decisions = recentDecisions
      .map(d => `- ${d.description} (${d.metadata.impact} impact)`)
      .join('\n');
    
    variables.key_insights = highPriorityInsights
      .map(i => `- ${i.description}`)
      .join('\n');
    
    return variables;
  }
}
```

---

## OpenAI API Integration

### Overview

Use AICF to persist OpenAI conversation history.

### Installation

```bash
npm install aicf-core openai
```

### Basic Integration

```typescript
import { AICF } from 'aicf-core';
const OpenAI = require('openai');

class OpenAIWithAICF {
  constructor(apiKey, aicfDir = '.aicf') {
    this.openai = new OpenAI({ apiKey });
    this.aicf = AICF.create(aicfDir);
    this.conversationHistory = [];
  }

  async chat(userMessage, conversationId = null) {
    // Add user message to history
    this.conversationHistory.push({
      role: 'user',
      content: userMessage
    });

    // Call OpenAI
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: this.conversationHistory
    });

    const assistantMessage = response.choices[0].message;
    
    // Add assistant response to history
    this.conversationHistory.push(assistantMessage);

    // Log to AICF
    await this.aicf.logConversation({
      id: conversationId || `conv_${Date.now()}`,
      messages: this.conversationHistory.length,
      tokens: response.usage.total_tokens,
      metadata: {
        model: 'gpt-4',
        user_message: userMessage,
        assistant_message: assistantMessage.content,
        timestamp: new Date().toISOString()
      }
    });

    return assistantMessage.content;
  }

  async loadConversation(conversationId) {
    // Load from AICF
    const conversations = this.aicf.reader.getLastConversations(100);
    const conv = conversations.find(c => c.id === conversationId);
    
    if (conv && conv.metadata) {
      this.conversationHistory = [
        { role: 'user', content: conv.metadata.user_message },
        { role: 'assistant', content: conv.metadata.assistant_message }
      ];
    }
  }

  clearHistory() {
    this.conversationHistory = [];
  }
}

// Usage
async function main() {
  const ai = new OpenAIWithAICF(process.env.OPENAI_API_KEY);
  
  const response1 = await ai.chat("What is AICF?");
  console.log('AI:', response1);
  
  const response2 = await ai.chat("How does it achieve compression?");
  console.log('AI:', response2);
  
  // Check stats
  const stats = ai.aicf.reader.getStats();
  console.log('Total conversations:', stats.counts.conversations);
}

main().catch(console.error);
```

---

## Claude API Integration

### Overview

Use AICF with Anthropic's Claude API.

### Installation

```bash
npm install aicf-core @anthropic-ai/sdk
```

### Basic Integration

```typescript
import { AICF } from 'aicf-core';
const Anthropic = require('@anthropic-ai/sdk');

class ClaudeWithAICF {
  constructor(apiKey, aicfDir = '.aicf') {
    this.anthropic = new Anthropic({ apiKey });
    this.aicf = AICF.create(aicfDir);
    this.conversationHistory = [];
  }

  async chat(userMessage, conversationId = null) {
    // Add user message
    this.conversationHistory.push({
      role: 'user',
      content: userMessage
    });

    // Call Claude
    const response = await this.anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1024,
      messages: this.conversationHistory
    });

    const assistantMessage = response.content[0].text;
    
    // Add assistant response
    this.conversationHistory.push({
      role: 'assistant',
      content: assistantMessage
    });

    // Log to AICF
    await this.aicf.logConversation({
      id: conversationId || `conv_${Date.now()}`,
      messages: this.conversationHistory.length,
      tokens: response.usage.input_tokens + response.usage.output_tokens,
      metadata: {
        model: 'claude-3-sonnet',
        user_message: userMessage,
        assistant_message: assistantMessage,
        timestamp: new Date().toISOString()
      }
    });

    return assistantMessage;
  }
}

// Usage
async function main() {
  const claude = new ClaudeWithAICF(process.env.ANTHROPIC_API_KEY);
  
  const response = await claude.chat("Explain AICF compression");
  console.log('Claude:', response);
}

main().catch(console.error);
```

---

## Vector Database Integration

### Overview

Use AICF alongside vector databases for semantic search.

### Installation

```bash
npm install aicf-core @pinecone-database/pinecone
```

### Integration with Pinecone

```typescript
import { AICF } from 'aicf-core';
import { Pinecone } from '@pinecone-database/pinecone';

class AICFWithVectorDB {
  constructor(pineconeApiKey, aicfDir = '.aicf') {
    this.aicf = AICF.create(aicfDir);
    this.pinecone = new Pinecone({ apiKey: pineconeApiKey });
    this.index = this.pinecone.index('aicf-conversations');
  }

  async logConversationWithEmbedding(data, embedding) {
    // Store in AICF
    await this.aicf.logConversation(data);
    
    // Store embedding in Pinecone
    await this.index.upsert([{
      id: data.id,
      values: embedding,
      metadata: {
        topic: data.metadata.topic,
        timestamp: data.metadata.timestamp
      }
    }]);
  }

  async semanticSearch(queryEmbedding, topK = 5) {
    // Search vector DB
    const results = await this.index.query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true
    });
    
    // Fetch full context from AICF
    const conversations = [];
    for (const match of results.matches) {
      const conv = await this.getConversationById(match.id);
      conversations.push({
        ...conv,
        similarity: match.score
      });
    }
    
    return conversations;
  }

  async getConversationById(id) {
    const all = this.aicf.reader.getLastConversations(1000);
    return all.find(c => c.id === id);
  }
}
```

---

## Cloud Storage Integration

### AWS S3 Integration

```typescript
import { AICF } from 'aicf-core';
const AWS = require('aws-sdk');
import fs from 'fs';
import path from 'path';

class AICFWithS3 {
  constructor(aicfDir, s3Config) {
    this.aicf = AICF.create(aicfDir);
    this.s3 = new AWS.S3(s3Config);
    this.bucket = s3Config.bucket;
    this.aicfDir = aicfDir;
  }

  async backup() {
    const files = fs.readdirSync(this.aicfDir);
    
    for (const file of files) {
      const filePath = path.join(this.aicfDir, file);
      const fileContent = fs.readFileSync(filePath);
      
      await this.s3.putObject({
        Bucket: this.bucket,
        Key: `aicf-backup/${file}`,
        Body: fileContent
      }).promise();
    }
    
    console.log('Backup completed');
  }

  async restore() {
    const objects = await this.s3.listObjectsV2({
      Bucket: this.bucket,
      Prefix: 'aicf-backup/'
    }).promise();
    
    for (const obj of objects.Contents) {
      const data = await this.s3.getObject({
        Bucket: this.bucket,
        Key: obj.Key
      }).promise();
      
      const fileName = path.basename(obj.Key);
      const filePath = path.join(this.aicfDir, fileName);
      fs.writeFileSync(filePath, data.Body);
    }
    
    console.log('Restore completed');
  }
}

// Usage
const aicfS3 = new AICFWithS3('.aicf', {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  bucket: 'my-aicf-backups'
});

// Backup daily
setInterval(() => {
  aicfS3.backup().catch(console.error);
}, 24 * 60 * 60 * 1000);
```

---

## Express.js API Integration

### REST API for AICF

```typescript
const express = require('express');
import { AICF } from 'aicf-core';

const app = express();
app.use(express.json());

const aicf = AICF.create('.aicf');

// Log conversation
app.post('/api/conversations', async (req, res) => {
  try {
    await aicf.logConversation(req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get conversations
app.get('/api/conversations', async (req, res) => {
  try {
    const count = parseInt(req.query.count) || 10;
    const conversations = aicf.reader.getLastConversations(count);
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Query
app.get('/api/query', async (req, res) => {
  try {
    const results = aicf.query(req.query.q);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const health = aicf.healthCheck();
    res.json(health);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log('AICF API running on port 3000');
});
```

---

## Next Steps

- **[API Reference](./API_REFERENCE.md)** - Complete API documentation
- **[Examples](../examples/)** - More code samples
- **[Best Practices](./BEST_PRACTICES.md)** - Production patterns

---

**AICF-Core Integration Tutorials** | **Universal AI Context Format**

