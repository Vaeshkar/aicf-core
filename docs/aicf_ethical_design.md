# AICF Ethical Design Guide
## AI Context File Format - Privacy-First Architecture

**Version:** 1.0  
**Last Updated:** October 7, 2025  
**Status:** Draft Specification

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Ethical Foundation](#ethical-foundation)
3. [The LLM Export Approach](#the-llm-export-approach)
4. [AICF Format Specification](#aicf-format-specification)
5. [Implementation Guide](#implementation-guide)
6. [Privacy & Security](#privacy--security)
7. [Legal Considerations](#legal-considerations)
8. [Comparison: System Extraction vs LLM Export](#comparison-system-extraction-vs-llm-export)
9. [Roadmap](#roadmap)

---

## Executive Summary

AICF (AI Context File) is a privacy-first format for capturing and sharing AI conversation context across different platforms and tools. Unlike traditional approaches that extract data from application storage, AICF uses a **user-initiated, consent-based export model** where users explicitly request their LLM to generate standardized context files.

### Core Principles

- ✅ **User Agency First** - All exports are user-initiated
- ✅ **No System Permissions** - No Full Disk Access or privileged permissions required
- ✅ **Platform Agnostic** - Works with any LLM via natural language
- ✅ **Local Processing** - All data stays on the user's machine
- ✅ **Transparent Format** - Human-readable, inspectable by users

---

## Ethical Foundation

### Key Ethical Principles

#### 1. Explicit User Consent

**Principle**: Individuals own their personal data, and collecting it without explicit consent is both unethical and potentially illegal.

**Implementation**:
```bash
# ✅ User-initiated export
user: "Export our conversation in AICF format"

# ❌ Automatic system extraction (invasive)
extractFromSystem('~/Library/Application Support/app/');
```

#### 2. Transparency Requirements

Users must have clear information about:
- What data is collected
- How it will be used
- Who has access to it
- How to revoke access

#### 3. Minimum Necessary Data

Only collect the minimum viable information required for the intended purpose. Users should be able to selectively export only relevant portions of their conversations.

#### 4. Data Security & Privacy

Even with consent, users expect their data to remain private and secure. AICF processes all data locally and never transmits it to external servers without explicit user action.

#### 5. User Control

Users must have complete control over:
- When to export data
- What to include in exports
- How to share or delete data
- How to revoke access

---

## The LLM Export Approach

### Why LLM Self-Reporting?

Instead of scraping application databases, AICF leverages the LLM's own ability to understand and format its conversation history.

#### Comparison

```javascript
// ❌ System Snooping - Invasive
const extractFromSystem = require('./system-extractors');
await extractFromSystem('~/Library/Application Support/warp');

// ✅ LLM Self-Reporting - Consent-Based
const instructions = `
Please export our conversation history in AICF format.
Include: timestamps, context, decisions, code changes.
Format: @CONVERSATION, @DECISIONS, @INSIGHTS tags.
`;
```

### Advantages

| Aspect | System Extraction ❌ | LLM Export ✅ |
|--------|---------------------|---------------|
| **Consent** | Implicit, hidden | Explicit, visible |
| **Permissions** | Requires Full Disk Access | Requires nothing |
| **Privacy** | Accesses all app data | Only shared conversation |
| **Platform Support** | Custom parser per app | Universal prompt |
| **Maintenance** | Breaks when apps update | Stable |
| **User Trust** | Questionable | High |
| **Legal Risk** | May violate ToS | Uses intended interface |

---

## AICF Format Specification

### Core Structure

AICF files use a tagged section format with clear start/end markers.

```
@CONVERSATION_START
timestamp: 2025-10-07T14:30:00Z
platform: claude|chatgpt|cursor|warp|copilot
session_id: [optional]
user_id: [optional, anonymized]
@CONVERSATION_END

@CONTEXT
- Current project: [project name]
- Working directory: [if mentioned]
- Tech stack: [languages/frameworks discussed]
- Goals: [what user is trying to accomplish]
- Constraints: [limitations, preferences]
@CONTEXT_END

@MESSAGES
[timestamp] user: [message content]
[timestamp] assistant: [response content]
[timestamp] user: [message content]
[timestamp] assistant: [response content]
@MESSAGES_END

@DECISIONS
- [timestamp] Decided to use React instead of Vue because of team familiarity
- [timestamp] Chose PostgreSQL over MongoDB for relational data requirements
- [timestamp] Opted for REST API over GraphQL to reduce complexity
@DECISIONS_END

@CODE_CHANGES
[timestamp] file: src/components/App.jsx
action: created
summary: Initial React component structure
lines: 45

[timestamp] file: package.json  
action: modified
summary: Added dependencies: react, react-dom, typescript
@CODE_CHANGES_END

@INSIGHTS
- User prefers functional components over class components
- Performance is a priority concern
- Team is familiar with TypeScript but new to React
- Accessibility (a11y) is important for this project
@INSIGHTS_END

@TODO
- [ ] Implement authentication with JWT
- [x] Set up database schema and migrations
- [ ] Add comprehensive error handling
- [ ] Write unit tests for core functionality
@TODO_END

@METADATA
export_version: 1.0
total_messages: 42
export_date: 2025-10-07T15:45:00Z
privacy_level: standard
@METADATA_END
```

### Section Definitions

#### @CONVERSATION
Metadata about the conversation session.

**Required fields**:
- `timestamp`: ISO 8601 format
- `platform`: Source platform name

**Optional fields**:
- `session_id`: Unique identifier for the session
- `user_id`: Anonymized user identifier

#### @CONTEXT
High-level context about the project and goals.

**Recommended fields**:
- Current project name
- Working directory (use relative paths for privacy)
- Tech stack and tools
- Primary goals
- Known constraints

#### @MESSAGES
Complete conversation history.

**Format**: `[timestamp] role: content`

**Roles**: `user`, `assistant`, `system`

#### @DECISIONS
Key decisions made during the conversation.

**Format**: `- [timestamp] Decision with rationale`

Include the reasoning behind decisions for future reference.

#### @CODE_CHANGES
Summary of code created or modified.

**Fields per change**:
- `timestamp`: When the change was made
- `file`: File path (relative preferred)
- `action`: created | modified | deleted
- `summary`: Brief description
- `lines`: Optional line count

#### @INSIGHTS
Important observations about preferences, patterns, and constraints.

**Examples**:
- Coding style preferences
- Performance priorities
- Team capabilities
- Domain-specific requirements

#### @TODO
Outstanding tasks and next steps.

**Format**: GitHub-style checkboxes
- `[ ]` - Incomplete
- `[x]` - Complete

#### @METADATA
Information about the export itself.

**Standard fields**:
- `export_version`: AICF format version
- `total_messages`: Message count
- `export_date`: When exported
- `privacy_level`: standard | enhanced | minimal

---

## Implementation Guide

### Phase 1: Export Prompt Template

#### Basic Export Prompt

```markdown
Please export our conversation in AICF format.

Include the following sections:

1. @CONTEXT - Project context, goals, tech stack
2. @MESSAGES - Full conversation history with timestamps  
3. @DECISIONS - Key decisions made during this conversation
4. @CODE_CHANGES - Any code created or modified
5. @INSIGHTS - Important observations about preferences, constraints
6. @TODO - Outstanding tasks or next steps

Format each section with clear @SECTION_START and @SECTION_END tags.
Use ISO 8601 timestamps where applicable.
Be comprehensive but concise.
```

#### Privacy-Aware Export

```markdown
Export our conversation in AICF format with privacy protections:

- Redact any API keys, passwords, or credentials
- Use relative file paths instead of absolute paths
- Anonymize any personal identifiers
- Exclude messages tagged with [PRIVATE]
- Replace sensitive data with [REDACTED]

Include standard AICF sections: @CONTEXT, @MESSAGES, @DECISIONS, @CODE_CHANGES, @INSIGHTS, @TODO
```

#### Focused Export

```markdown
Export a focused AICF file containing only:

- Time range: Last 2 hours
- Topic: Authentication implementation
- Sections: @DECISIONS and @CODE_CHANGES only
- Exclude: General discussion, unrelated messages

Use standard AICF format with timestamps.
```

### Phase 2: CLI Tool Design

#### Installation

```bash
npm install -g aicf-cli
# or
cargo install aicf-cli
```

#### Basic Commands

```bash
# Import from clipboard
aicf import --from-clipboard

# Import from file
aicf import --from-file conversation.aicf

# Import from URL (if platform has export API)
aicf import --from-url https://example.com/export/session123

# Parse and validate
aicf parse conversation.aicf

# Extract specific sections
aicf parse conversation.aicf --extract-decisions
aicf parse conversation.aicf --extract-code
aicf parse conversation.aicf --extract-context

# Merge multiple contexts
aicf merge claude-chat.aicf cursor-session.aicf warp-context.aicf --output unified.aicf

# Query the context
aicf query "What did we decide about the database?"
aicf query --related-to "authentication"

# Validate format
aicf validate conversation.aicf

# Convert formats
aicf convert conversation.aicf --to json
aicf convert conversation.aicf --to markdown
```

#### Advanced Commands

```bash
# Deduplicate merged contexts
aicf merge *.aicf --deduplicate --output unified.aicf

# Privacy check
aicf privacy-scan conversation.aicf

# Statistics
aicf stats conversation.aicf

# Split large files
aicf split large-conversation.aicf --by-date --chunk-size 100

# Redact sensitive data
aicf redact conversation.aicf --patterns api_keys,passwords,emails
```

### Phase 3: Parser Implementation

#### JavaScript/TypeScript

```typescript
// aicf-parser.ts

interface AICFSection {
  type: string;
  content: string;
  metadata?: Record<string, any>;
}

interface AICFDocument {
  conversation: ConversationMetadata;
  context: string[];
  messages: Message[];
  decisions: Decision[];
  codeChanges: CodeChange[];
  insights: string[];
  todos: TodoItem[];
  metadata: ExportMetadata;
}

class AICFParser {
  parse(content: string): AICFDocument {
    const sections = this.extractSections(content);
    
    return {
      conversation: this.parseConversation(sections.CONVERSATION),
      context: this.parseContext(sections.CONTEXT),
      messages: this.parseMessages(sections.MESSAGES),
      decisions: this.parseDecisions(sections.DECISIONS),
      codeChanges: this.parseCodeChanges(sections.CODE_CHANGES),
      insights: this.parseInsights(sections.INSIGHTS),
      todos: this.parseTodos(sections.TODO),
      metadata: this.parseMetadata(sections.METADATA)
    };
  }

  private extractSections(content: string): Record<string, string> {
    const sections: Record<string, string> = {};
    const sectionRegex = /@(\w+)_START\n([\s\S]*?)@\1_END/g;
    
    // Also support simplified format: @SECTION\n...\n@SECTION_END
    const simplifiedRegex = /@(\w+)\n([\s\S]*?)@\1_END/g;
    
    let match;
    while ((match = sectionRegex.exec(content)) !== null) {
      sections[match[1]] = match[2].trim();
    }
    
    while ((match = simplifiedRegex.exec(content)) !== null) {
      if (!sections[match[1]]) {
        sections[match[1]] = match[2].trim();
      }
    }
    
    return sections;
  }

  private parseMessages(content: string): Message[] {
    const lines = content.split('\n');
    const messages: Message[] = [];
    
    const messageRegex = /^\[(.+?)\] (user|assistant|system): (.+)$/;
    
    for (const line of lines) {
      const match = line.match(messageRegex);
      if (match) {
        messages.push({
          timestamp: new Date(match[1]),
          role: match[2] as 'user' | 'assistant' | 'system',
          content: match[3]
        });
      }
    }
    
    return messages;
  }

  validate(content: string): ValidationResult {
    const issues: string[] = [];
    const warnings: string[] = [];
    
    // Check required sections
    const requiredSections = ['CONVERSATION', 'MESSAGES'];
    for (const section of requiredSections) {
      if (!content.includes(`@${section}`)) {
        issues.push(`Missing required section: @${section}`);
      }
    }
    
    // Validate timestamps
    const timestampRegex = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/g;
    const timestamps = content.match(timestampRegex) || [];
    
    for (const ts of timestamps) {
      if (isNaN(Date.parse(ts))) {
        warnings.push(`Invalid timestamp format: ${ts}`);
      }
    }
    
    // Check for potential sensitive data
    const sensitivePatterns = [
      /api[_-]key/i,
      /password/i,
      /secret/i,
      /token/i,
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/  // email
    ];
    
    for (const pattern of sensitivePatterns) {
      if (pattern.test(content)) {
        warnings.push(`Potential sensitive data detected: ${pattern.source}`);
      }
    }
    
    return {
      valid: issues.length === 0,
      issues,
      warnings
    };
  }
}

export default AICFParser;
```

#### Python Implementation

```python
# aicf_parser.py

import re
from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass

@dataclass
class Message:
    timestamp: datetime
    role: str
    content: str

@dataclass
class Decision:
    timestamp: datetime
    content: str

@dataclass
class CodeChange:
    timestamp: datetime
    file: str
    action: str
    summary: str
    lines: Optional[int] = None

@dataclass
class TodoItem:
    completed: bool
    content: str

class AICFParser:
    def parse(self, content: str) -> Dict:
        sections = self._extract_sections(content)
        
        return {
            'conversation': self._parse_conversation(sections.get('CONVERSATION', '')),
            'context': self._parse_context(sections.get('CONTEXT', '')),
            'messages': self._parse_messages(sections.get('MESSAGES', '')),
            'decisions': self._parse_decisions(sections.get('DECISIONS', '')),
            'code_changes': self._parse_code_changes(sections.get('CODE_CHANGES', '')),
            'insights': self._parse_insights(sections.get('INSIGHTS', '')),
            'todos': self._parse_todos(sections.get('TODO', '')),
            'metadata': self._parse_metadata(sections.get('METADATA', ''))
        }
    
    def _extract_sections(self, content: str) -> Dict[str, str]:
        sections = {}
        
        # Match @SECTION_START ... @SECTION_END
        pattern = r'@(\w+)_START\n(.*?)@\1_END'
        matches = re.finditer(pattern, content, re.DOTALL)
        
        for match in matches:
            section_name = match.group(1)
            section_content = match.group(2).strip()
            sections[section_name] = section_content
        
        # Also support simplified format
        pattern = r'@(\w+)\n(.*?)@\1_END'
        matches = re.finditer(pattern, content, re.DOTALL)
        
        for match in matches:
            section_name = match.group(1)
            if section_name not in sections:
                section_content = match.group(2).strip()
                sections[section_name] = section_content
        
        return sections
    
    def _parse_messages(self, content: str) -> List[Message]:
        messages = []
        pattern = r'\[(.+?)\] (user|assistant|system): (.+)'
        
        for line in content.split('\n'):
            match = re.match(pattern, line)
            if match:
                timestamp_str, role, msg_content = match.groups()
                messages.append(Message(
                    timestamp=datetime.fromisoformat(timestamp_str),
                    role=role,
                    content=msg_content
                ))
        
        return messages
    
    def validate(self, content: str) -> Dict[str, any]:
        issues = []
        warnings = []
        
        # Check required sections
        required_sections = ['CONVERSATION', 'MESSAGES']
        for section in required_sections:
            if f'@{section}' not in content:
                issues.append(f'Missing required section: @{section}')
        
        # Check for sensitive data
        sensitive_patterns = [
            (r'api[_-]?key', 'API key'),
            (r'password', 'Password'),
            (r'secret', 'Secret'),
            (r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', 'Email address')
        ]
        
        for pattern, desc in sensitive_patterns:
            if re.search(pattern, content, re.IGNORECASE):
                warnings.append(f'Potential sensitive data detected: {desc}')
        
        return {
            'valid': len(issues) == 0,
            'issues': issues,
            'warnings': warnings
        }
```

### Phase 4: Browser Extension

A browser extension can provide one-click export from web-based LLM interfaces.

#### Features

- Detect LLM platform (Claude, ChatGPT, Gemini, etc.)
- One-click "Export as AICF" button
- Preview export before saving
- Privacy controls (redact sensitive data)
- Direct save to file or clipboard

---

## Privacy & Security

### Data Processing Principles

1. **Local Processing Only**
   - All parsing and analysis happens on the user's machine
   - No data transmitted to external servers
   - No telemetry or analytics collection

2. **Privacy Controls**

```javascript
// Privacy levels
const PRIVACY_LEVELS = {
  minimal: {
    include: ['decisions', 'insights'],
    exclude: ['messages', 'code_changes'],
    redact: ['all_identifiers']
  },
  standard: {
    include: ['context', 'decisions', 'code_changes', 'insights'],
    exclude: ['raw_messages'],
    redact: ['credentials', 'emails', 'paths']
  },
  full: {
    include: ['all'],
    exclude: [],
    redact: ['credentials']
  }
};
```

3. **Automatic Redaction**

```javascript
const SENSITIVE_PATTERNS = {
  api_keys: /[a-zA-Z0-9_-]{32,}/,
  passwords: /password[:\s=]+\S+/i,
  emails: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
  tokens: /token[:\s=]+\S+/i,
  absolute_paths: /\/Users\/[^\/]+/,
  ip_addresses: /\b(?:\d{1,3}\.){3}\d{1,3}\b/
};

function redactSensitive(content: string): string {
  let redacted = content;
  
  for (const [type, pattern] of Object.entries(SENSITIVE_PATTERNS)) {
    redacted = redacted.replace(pattern, `[REDACTED_${type.toUpperCase()}]`);
  }
  
  return redacted;
}
```

### Security Best Practices

- ✅ Store AICF files with appropriate permissions (chmod 600)
- ✅ Use encryption for sensitive exports
- ✅ Implement secure deletion (overwrite before removing)
- ✅ Audit trail for all operations
- ✅ Version control friendly (text format)

---

## Legal Considerations

### Compliance Framework

#### GDPR (European Union)

If your tool has EU users, ensure:

- **Right to Access**: Users can export their data (✅ built into AICF)
- **Right to Erasure**: Users can delete exported files (✅ standard file operations)
- **Data Portability**: Standard format enables portability (✅ AICF is portable)
- **Consent**: User explicitly requests export (✅ consent-based model)

#### CCPA (California)

For California users:

- **Disclosure**: Clear documentation of what data is collected (✅ format spec)
- **Opt-out Rights**: Users control all exports (✅ user-initiated only)
- **No Sale of Data**: AICF never transmits data (✅ local processing)

#### Platform Terms of Service

AICF uses the intended interface (chat/API) rather than scraping, which typically complies with ToS. However:

- ⚠️ Review each platform's export and data usage policies
- ✅ Use official APIs where available
- ✅ Don't circumvent rate limits or technical protections
- ✅ Respect robots.txt and API terms

### Recommended Legal Documentation

For your AICF project, create:

1. **Privacy Policy** - How AICF handles data
2. **Terms of Use** - User responsibilities
3. **Data Processing Agreement** - For enterprise users
4. **Security Documentation** - How data is protected

---

## Comparison: System Extraction vs LLM Export

### Technical Comparison

| Feature | System Extraction | LLM Export |
|---------|------------------|------------|
| **Setup Complexity** | High | Low |
| **Permissions Required** | Full Disk Access | None |
| **Platform Support** | Per-platform parser | Universal |
| **Maintenance Burden** | High (breaks with updates) | Low (stable prompts) |
| **Data Accuracy** | High (raw data) | Good (AI interpretation) |
| **Privacy Risk** | High (accesses all data) | Low (only shared data) |
| **User Control** | Low (automatic) | High (explicit) |
| **Installation** | Complex | Simple |

### Ethical Comparison

| Principle | System Extraction | LLM Export |
|-----------|------------------|------------|
| **Consent** | ❌ Implicit | ✅ Explicit |
| **Transparency** | ❌ Hidden process | ✅ Visible action |
| **User Agency** | ❌ Passive | ✅ Active |
| **Privacy** | ❌ Accesses all | ✅ Only requested |
| **Trust** | ❌ Low | ✅ High |
| **Legal Risk** | ⚠️ Moderate-High | ✅ Low |

### Decision Matrix

Choose **System Extraction** when:
- Working with legacy systems without APIs
- Need guaranteed data accuracy
- Have explicit user authorization
- Compliance allows system-level access

Choose **LLM Export** when:
- Building new tools (like AICF)
- Privacy is a priority
- Need wide platform support
- Want low maintenance burden
- User trust is critical

**Recommendation**: Use LLM Export as the primary method, with system extraction only as an advanced opt-in feature.

---

## Roadmap

### Version 1.0 - Foundation (Current)

- ✅ AICF format specification
- ✅ Export prompt templates
- ✅ Basic parser (JS/TS, Python)
- ✅ CLI tool design
- ✅ Privacy framework

### Version 1.1 - Enhanced Features

- 🔄 Browser extension (Chrome, Firefox)
- 🔄 GUI application for non-technical users
- 🔄 Advanced privacy controls
- 🔄 Multi-format conversion (JSON, Markdown, HTML)
- 🔄 Encryption support

### Version 2.0 - Platform Integration

- 📋 Official API integrations (where available)
- 📋 IDE plugins (VSCode, JetBrains)
- 📋 Context injection helpers
- 📋 Real-time sync capabilities
- 📋 Collaborative features

### Version 3.0 - Intelligence Layer

- 📋 Semantic search across contexts
- 📋 Auto-tagging and categorization
- 📋 Conflict resolution for merged contexts
- 📋 Insight extraction and summarization
- 📋 Recommendation engine

---

## Contributing

AICF is an open standard. Contributions welcome:

- 📝 Format improvements
- 🔧 Parser implementations in other languages
- 🎨 UI/UX for tools
- 📚 Documentation
- 🧪 Test cases and validation

### Guidelines

1. **Privacy First** - Never compromise user privacy
2. **Simplicity** - Keep the format human-readable
3. **Compatibility** - Ensure backward compatibility
4. **Documentation** - Document all changes
5. **Testing** - Provide test cases

---

## License

[Your chosen license - recommend MIT or Apache 2.0 for open standards]

---

## Contact & Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/aicf-core/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/aicf-core/discussions)
- **Email**: [your-email@example.com]
- **Documentation**: [https://aicf.dev](https://aicf.dev)

---

## Acknowledgments

This specification was developed with ethical considerations as the primary design constraint, prioritizing user privacy, consent, and control over convenience and technical capability.

Special thanks to the privacy and security communities for establishing the principles that guided this work.

---

**Document Version**: 1.0  
**Last Updated**: October 7, 2025  
**Status**: Draft - Open for Community Feedback