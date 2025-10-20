# Code Style Guide - AICF-Core

**Last Updated:** 2025-10-19 (Q4 2025)
**Status:** ✅ Current
**Project:** AICF-Core v3.1.1
**Node.js:** 20+ LTS (October 2025)

---

## 🎯 Overview

This document defines the **Q4 2025 coding standards** for AICF-Core. These are **non-negotiable requirements** for all code contributions.

---

## 🔒 Core Requirements (Non-Negotiable)

### 1. ✅ TypeScript with Strict Mode

- **All new code must be TypeScript**
- **No `any` types allowed** - Use proper type definitions
- **Strict mode enabled** in `tsconfig.json`

### 2. ✅ ESM Imports Only

- **No CommonJS `require()`** - Use ESM `import/export`
- **Modern module system** for Node.js 20+

### 3. ✅ Modern Node.js 20+ LTS

- **Use latest LTS features** (October 2025)
- **Native fetch, test runner, watch mode**

### 4. ✅ Proper Error Handling

- **Type-safe error boundaries**
- **Result types** for operations that can fail
- **No throwing errors in pure functions**

### 5. ✅ Must Be Testable

- **Pure functions** wherever possible
- **Dependency injection** for external dependencies
- **No side effects** in business logic

### 6. ✅ Functions < 50 Lines

- **Split large functions** into smaller, focused units
- **Single Responsibility Principle**
- **Composable functions**

---

## 📦 Module System

### ESM Imports (Required)

✅ **CORRECT:**

```typescript
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { AICFConfig } from "./types.js";

export async function readAICFFile(filePath: string): Promise<string> {
  return await readFile(filePath, "utf-8");
}

export { processCheckpoint, validateFormat };
```

❌ **FORBIDDEN:**

```javascript
// ❌ No CommonJS
const fs = require("fs");
const path = require("path");

module.exports = {
  processCheckpoint,
  validateFormat,
};
```

### Node.js Built-in Imports

✅ **CORRECT (use `node:` protocol):**

```typescript
import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { createHash } from "node:crypto";
```

❌ **AVOID:**

```typescript
import { readFile } from "fs/promises"; // Missing node: protocol
```

---

## 🎨 TypeScript Standards

### Strict Mode Configuration

**tsconfig.json:**

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "module": "ESNext",
    "target": "ES2022",
    "moduleResolution": "bundler"
  }
}
```

### Type Definitions

✅ **CORRECT:**

```typescript
// Explicit types for all parameters and returns
function processCheckpoint(
  checkpoint: Checkpoint
): Result<ProcessedData, Error> {
  // Implementation
}

// Type-safe async functions
async function readAICFFile(filePath: string): Promise<AICFData> {
  // Implementation
}

// Proper interface definitions
interface AICFConfig {
  readonly version: string;
  readonly enablePIIRedaction: boolean;
  readonly streamingThreshold: number;
}
```

❌ **FORBIDDEN:**

```typescript
// ❌ No 'any' types
function processCheckpoint(checkpoint: any): any {
  // Implementation
}

// ❌ No implicit types
function readFile(path) {
  // Implementation
}
```

### Result Types for Error Handling

✅ **CORRECT:**

```typescript
type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };

async function readAICFFile(filePath: string): Promise<Result<AICFData>> {
  try {
    const content = await readFile(filePath, "utf-8");
    const data = parseAICF(content);
    return { ok: true, value: data };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

// Usage
const result = await readAICFFile("file.aicf");
if (result.ok) {
  console.log(result.value);
} else {
  console.error(result.error);
}
```

---

## 📁 File Naming Conventions

### Source Files (TypeScript)

**Format:** kebab-case with `.ts` extension
**Examples:**

- `aicf-secure.ts`
- `pii-detector.ts`
- `stream-reader.ts`

### Test Files

**Format:** `*.test.ts` or `*.spec.ts`
**Examples:**

- `aicf-secure.test.ts`
- `pii-detector.spec.ts`
- `integration.test.ts`

### Type Definition Files

**Format:** `*.types.ts` or `types/*.ts`
**Examples:**

- `aicf.types.ts`
- `types/config.ts`
- `types/result.ts`

---

## 🏗️ Code Organization

### File Structure (TypeScript)

```typescript
// 1. Type imports
import type { AICFConfig, AICFData } from "./types.js";

// 2. Module imports
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// 3. Constants
const AICF_VERSION = "3.1.1" as const;
const DEFAULT_TIMEOUT = 5000;

// 4. Type definitions (if not in separate file)
interface ProcessOptions {
  readonly timeout: number;
  readonly retries: number;
}

// 5. Helper functions (private)
function parseAICFSection(text: string): Record<string, string> {
  // Implementation
}

// 6. Main functions (public)
export async function processCheckpoint(
  checkpoint: string,
  options: ProcessOptions
): Promise<Result<AICFData>> {
  // Implementation
}

// 7. Named exports
export { AICF_VERSION };
```

### Function Size Limit: < 50 Lines

✅ **CORRECT (split into focused functions):**

```typescript
// Each function < 50 lines, single responsibility
async function readFileContent(filePath: string): Promise<Result<string>> {
  try {
    const content = await readFile(filePath, "utf-8");
    return { ok: true, value: content };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}

function parseAICF(content: string): Result<AICFData> {
  // Parse AICF format (< 50 lines)
}

async function loadAICFFile(filePath: string): Promise<Result<AICFData>> {
  const fileResult = await readFileContent(filePath);
  if (!fileResult.ok) return fileResult;

  return parseAICF(fileResult.value);
}
```

❌ **FORBIDDEN (function > 50 lines):**

```typescript
async function loadAICFFile(filePath: string): Promise<AICFData> {
  // 100+ lines of mixed concerns
  const content = await readFile(filePath, "utf-8");
  const sections = {};
  // ... 50+ lines of parsing logic
  // ... 30+ lines of validation
  // ... 20+ lines of transformation
  return sections;
}
```

### Dependency Injection for Testability

✅ **CORRECT (testable with DI):**

```typescript
// Define interface for dependencies
interface FileSystem {
  readFile(path: string): Promise<Result<string>>;
  writeFile(path: string, content: string): Promise<Result<void>>;
}

// Pure function with injected dependency
async function loadAICFFile(
  filePath: string,
  fs: FileSystem
): Promise<Result<AICFData>> {
  const fileResult = await fs.readFile(filePath);
  if (!fileResult.ok) return fileResult;

  return parseAICF(fileResult.value);
}

// Easy to test with mock
const mockFS: FileSystem = {
  readFile: async () => ({ ok: true, value: "mock content" }),
  writeFile: async () => ({ ok: true, value: undefined }),
};
```

---

## 🔐 Security Standards (AICF v3.1.1)

### Path Traversal Protection

✅ **CORRECT:**

```typescript
import { resolve, normalize } from "node:path";

function validatePath(filePath: string, baseDir: string): Result<string> {
  const normalized = normalize(filePath);

  // Prevent directory traversal
  if (normalized.includes("..")) {
    return {
      ok: false,
      error: new Error("Path traversal detected"),
    };
  }

  const resolved = resolve(baseDir, normalized);

  // Ensure path is within base directory
  if (!resolved.startsWith(resolve(baseDir))) {
    return {
      ok: false,
      error: new Error("Path outside base directory"),
    };
  }

  return { ok: true, value: resolved };
}
```

### PII Detection and Redaction

✅ **CORRECT:**

```typescript
interface PIIDetector {
  detect(text: string): PIIDetection[];
  redact(text: string): Result<string>;
}

// Use PII detector before writing sensitive data
async function writeConversation(
  data: ConversationData,
  piiDetector: PIIDetector
): Promise<Result<void>> {
  const redactResult = piiDetector.redact(data.content);
  if (!redactResult.ok) return redactResult;

  // Write redacted content
  return writeFile(data.path, redactResult.value);
}
```

### Streaming for Large Files (>1MB)

✅ **CORRECT:**

```typescript
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";

async function streamLargeFile(
  filePath: string,
  processor: (line: string) => void
): Promise<Result<void>> {
  try {
    const stream = createReadStream(filePath);
    const rl = createInterface({ input: stream });

    for await (const line of rl) {
      processor(line);
    }

    return { ok: true, value: undefined };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}
```

---

## 🧪 Testing Standards

### Pure Functions (Easiest to Test)

✅ **CORRECT:**

```typescript
// Pure function - deterministic, no side effects
function parseAICFSection(text: string): Result<Record<string, string>> {
  const lines = text.split("\n");
  const result: Record<string, string> = {};

  for (const line of lines) {
    const [key, value] = line.split("=");
    if (key && value) {
      result[key.trim()] = value.trim();
    }
  }

  return { ok: true, value: result };
}

// Easy to test
test("parseAICFSection", () => {
  const input = "key1=value1\nkey2=value2";
  const result = parseAICFSection(input);

  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.value).toEqual({
      key1: "value1",
      key2: "value2",
    });
  }
});
```

### Dependency Injection for Testing

✅ **CORRECT:**

```typescript
// Test with mocked dependencies
test("loadAICFFile with mock", async () => {
  const mockFS: FileSystem = {
    readFile: async () => ({
      ok: true,
      value: "@CONVERSATION:test\nkey=value",
    }),
    writeFile: async () => ({ ok: true, value: undefined }),
  };

  const result = await loadAICFFile("test.aicf", mockFS);

  expect(result.ok).toBe(true);
});
```

### Node.js Native Test Runner

✅ **CORRECT (use Node.js 20+ test runner):**

```typescript
import { test, describe } from "node:test";
import assert from "node:assert";

describe("AICF Parser", () => {
  test("parses valid AICF format", () => {
    const input = "@CONVERSATION:test\nkey=value";
    const result = parseAICF(input);

    assert.strictEqual(result.ok, true);
  });

  test("returns error for invalid format", () => {
    const input = "invalid format";
    const result = parseAICF(input);

    assert.strictEqual(result.ok, false);
  });
});
```

---

## 📝 AICF v3.1.1 Format Standards

### Version Declaration

✅ **CORRECT:**

```aicf
@METADATA
format_version=3.1.1
created_at=2025-10-19T10:00:00Z
ai_assistant=claude_sonnet_4.5
```

### Section Naming (UPPERCASE)

✅ **CORRECT:**

```aicf
@CONVERSATION:identifier
@SESSION
@MEMORY:episodic
@STATE
@INSIGHTS
@DECISIONS
@WORK
@CONSOLIDATION
@EMBEDDING
```

❌ **AVOID:**

```aicf
@conversation:identifier  # Wrong case
@Flow                     # Wrong case
@details:tag              # Wrong case
```

### Key Naming (snake_case)

✅ **CORRECT:**

```aicf
working_on=current_task_description
current_phase=implementation_phase
next_action=create_test_files
session_id=session_12345
memory_type=episodic
```

❌ **AVOID:**

```aicf
workingOn=current_task_description  # camelCase not allowed
working-on=current_task_description # kebab-case not allowed
```

### Value Formatting (underscores for spaces)

✅ **CORRECT:**

```aicf
model=claude_sonnet_4.5
cost=$14.63_per_month
success_rate=91.7_percent
memory_improvement=91.7_percent
```

❌ **AVOID:**

```aicf
model=claude sonnet 4.5  # Spaces break parsing
cost=$14.63 per month    # Spaces break parsing
```

### Google ADK Patterns (v3.1+)

✅ **CORRECT:**

```aicf
@SESSION
session_id=unique_session_identifier
app_name=application_context
user_id=user_identifier
creation_time=2025-10-19T10:00:00Z
status=active

@MEMORY:episodic
type=episodic
timestamp=2025-10-19T10:00:00Z
content=User requested integration tests
importance=high
tags=testing|security|production

@STATE
scope=session
key=test_results
value={"passed":29,"failed":0}
type=json
```

---

## 🖥️ CLI Output Standards

### Consistent Emoji Indicators

```typescript
// Use structured logging
const log = {
  success: (msg: string) => console.log(`✅ ${msg}`),
  error: (msg: string) => console.error(`❌ ${msg}`),
  warn: (msg: string) => console.warn(`⚠️  ${msg}`),
  info: (msg: string) => console.log(`ℹ️  ${msg}`),
  loading: (msg: string) => console.log(`🔄 ${msg}`),
};

log.success("Files created");
log.error("File not found");
log.warn("File already exists");
log.info("Processing...");
log.loading("Loading...");
```

### Clear, Actionable Feedback

✅ **CORRECT:**

```typescript
log.success("Created .ai/ folder");
log.success("Created .aicf/ folder");
log.success("Initialized 6 documentation files");
console.log("\nNext steps:");
console.log("1. Review the files in .ai/ and .aicf/");
console.log("2. Customize templates for your project");
console.log("3. Commit to version control");
```

❌ **AVOID:**

```typescript
console.log("Done"); // Too vague
```

---

## Testing Standards

### Test File Structure

```javascript
const { describe, it, expect } = require("@jest/globals");
const { processCheckpoint } = require("./checkpoint-agent");

describe("processCheckpoint", () => {
  it("should process valid AICF file", async () => {
    const result = await processCheckpoint("test.aicf");
    expect(result.success).toBe(true);
  });

  it("should throw error for invalid format", async () => {
    await expect(processCheckpoint("invalid.aicf")).rejects.toThrow(
      "Invalid AICF format"
    );
  });
});
```

### Test Coverage

**Aim for:**

- Core functionality: 80%+ coverage
- Utility functions: 90%+ coverage
- Error handling: Test all error paths

---

## Comments & Documentation

### When to Comment

✅ **DO comment:**

- Complex algorithms
- Non-obvious logic
- Business rules
- Public APIs

❌ **DON'T comment:**

- Obvious code
- What the code does (code should be self-explanatory)

### Good Comments

```javascript
// AICF format requires 6 mandatory sections
// Missing any section will cause validation to fail
const requiredSections = [
  "@CONVERSATION",
  "@FLOW",
  "@DETAILS",
  "@INSIGHTS",
  "@DECISIONS",
  "@STATE",
];

// Calculate token count (1 token ≈ 4 characters)
const tokenCount = Math.floor(content.length / 4);
```

### JSDoc for Public APIs

```javascript
/**
 * Process an AICF checkpoint file
 *
 * @param {string} filePath - Path to AICF file
 * @param {Object} options - Processing options
 * @param {boolean} options.verbose - Enable verbose logging
 * @returns {Promise<Object>} Processing result
 * @throws {Error} If file format is invalid
 *
 * @example
 * const result = await processCheckpoint('checkpoint.aicf', { verbose: true });
 */
async function processCheckpoint(filePath, options = {}) {
  // Implementation
}
```

---

## Git Commit Standards

### Commit Message Format

```
<type>: <short description>

<optional longer description>

<optional footer>
```

### Types

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `refactor:` Code refactoring
- `test:` Test changes
- `chore:` Maintenance

### Examples

```
feat: add AICF format validation

Implemented validation for all 6 mandatory sections and proper
key-value pair formatting. Includes helpful error messages.

Closes #12
```

```
fix: handle missing @STATE section gracefully

Previously threw unclear error. Now provides specific message
about which section is missing.

Fixes #15
```

---

## Performance Guidelines

### File I/O

**Read files efficiently:**

✅ **CORRECT:**

```javascript
// Read all files in parallel
const files = await Promise.all(filePaths.map((f) => fs.readFile(f, "utf-8")));
```

❌ **AVOID:**

```javascript
// Reading files sequentially (slower)
const files = [];
for (const f of filePaths) {
  files.push(await fs.readFile(f, "utf-8"));
}
```

### Memory Management

**Stream large files:**

```javascript
const stream = fs.createReadStream("large-file.aicf");
stream.on("data", (chunk) => {
  // Process chunk
});
```

---

## Security Best Practices

### Input Validation

**Always validate user input:**

```javascript
function validateFilePath(filePath) {
  if (!filePath || typeof filePath !== "string") {
    throw new Error("Invalid file path");
  }

  // Prevent directory traversal
  const normalized = path.normalize(filePath);
  if (normalized.includes("..")) {
    throw new Error("Invalid file path: directory traversal detected");
  }

  return normalized;
}
```

### File System Operations

**Check file existence before operations:**

```javascript
async function safeReadFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  return await fs.readFile(filePath, "utf-8");
}
```

---

## 📋 Summary - Q4 2025 Standards

### 🔒 Core Requirements (Non-Negotiable)

1. ✅ **TypeScript with strict mode** - No `any` types
2. ✅ **ESM imports only** - No CommonJS `require()`
3. ✅ **Node.js 20+ LTS** - Latest features (October 2025)
4. ✅ **Result types** - Type-safe error handling
5. ✅ **Pure functions** - Testable, no side effects
6. ✅ **Functions < 50 lines** - Single responsibility
7. ✅ **Dependency injection** - For testability
8. ✅ **Security-first** - Path validation, PII redaction, streaming
9. ✅ **AICF v3.1.1** - Google ADK patterns
10. ✅ **Native test runner** - Node.js 20+ built-in testing

### ✅ Pre-Commit Checklist

**Code Quality:**

- [ ] TypeScript strict mode enabled
- [ ] No `any` types used
- [ ] All functions < 50 lines
- [ ] Pure functions with no side effects
- [ ] Dependency injection for external dependencies

**Error Handling:**

- [ ] Result types used for all operations that can fail
- [ ] No throwing errors in pure functions
- [ ] Proper error messages with context

**Testing:**

- [ ] Tests written using Node.js native test runner
- [ ] 90%+ code coverage
- [ ] All error paths tested
- [ ] Integration tests for security features

**Security:**

- [ ] Path traversal protection implemented
- [ ] PII detection enabled for sensitive data
- [ ] Streaming used for files >1MB
- [ ] Input validation on all user inputs

**Format:**

- [ ] AICF v3.1.1 format compliance
- [ ] Google ADK patterns followed
- [ ] Proper section naming (@UPPERCASE)
- [ ] snake_case for keys

**Documentation:**

- [ ] TSDoc comments for public APIs
- [ ] README updated if needed
- [ ] Type definitions exported

---

## 🚀 Migration from Old Standards

### From CommonJS to ESM

```typescript
// ❌ Old (CommonJS)
const fs = require("fs");
module.exports = { readFile };

// ✅ New (ESM)
import { readFile } from "node:fs/promises";
export { readFile };
```

### From JavaScript to TypeScript

```typescript
// ❌ Old (JavaScript)
async function readFile(path) {
  return await fs.readFile(path, "utf-8");
}

// ✅ New (TypeScript)
async function readFile(path: string): Promise<Result<string>> {
  try {
    const content = await readFile(path, "utf-8");
    return { ok: true, value: content };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}
```

### From Throwing to Result Types

```typescript
// ❌ Old (throwing)
function parseAICF(content: string): AICFData {
  if (!content) throw new Error("Empty content");
  // ...
}

// ✅ New (Result type)
function parseAICF(content: string): Result<AICFData> {
  if (!content) {
    return { ok: false, error: new Error("Empty content") };
  }
  // ...
  return { ok: true, value: data };
}
```

---

**Last Updated:** 2025-10-19 (Q4 2025)
**Status:** ✅ Current
**This is a living document** - Update as standards evolve.
