# AICF-Core Troubleshooting Guide

Common issues, solutions, and debugging techniques for AICF-Core.

## Table of Contents

- [Installation Issues](#installation-issues)
- [File System Errors](#file-system-errors)
- [Data Corruption](#data-corruption)
- [Performance Issues](#performance-issues)
- [Memory Issues](#memory-issues)
- [Query Problems](#query-problems)
- [Integration Issues](#integration-issues)
- [Debugging Techniques](#debugging-techniques)
- [FAQ](#faq)

---

## Installation Issues

### Issue: "Cannot find module 'aicf-core'"

**Symptoms:**

```
Error: Cannot find module 'aicf-core'
```

**Solutions:**

1. **Install the package:**

   ```bash
   npm install aicf-core
   ```

2. **Check package.json:**

   ```json
   {
     "dependencies": {
       "aicf-core": "^1.0.0"
     }
   }
   ```

3. **Clear npm cache:**

   ```bash
   npm cache clean --force
   npm install
   ```

4. **Check Node.js version:**
   ```bash
   node --version  # Should be >= 16.0.0
   ```

### Issue: "Module not found: Can't resolve 'aicf-core'"

**Symptoms:**
Webpack or bundler can't find the module.

**Solutions:**

1. **Check module resolution:**

   ```typescript
   // Use explicit path
   import { AICF } from "aicf-core";
   ```

2. **Update webpack config:**
   ```typescript
   module.exports = {
     resolve: {
       modules: ["node_modules"],
     },
   };
   ```

---

## File System Errors

### Issue: "ENOENT: no such file or directory"

**Symptoms:**

```
Error: ENOENT: no such file or directory, open '.aicf/index.aicf'
```

**Solutions:**

1. **Create directory first:**

   ```typescript
   const fs = require("fs");
   const path = require("path");

   const aicfDir = ".aicf";
   if (!fs.existsSync(aicfDir)) {
     fs.mkdirSync(aicfDir, { recursive: true });
   }

   const aicf = AICF.create(aicfDir);
   ```

2. **Use absolute paths:**

   ```typescript
   const aicfDir = path.join(__dirname, ".aicf");
   const aicf = AICF.create(aicfDir);
   ```

3. **Check permissions:**
   ```bash
   ls -la .aicf
   chmod 755 .aicf
   ```

### Issue: "EACCES: permission denied"

**Symptoms:**

```
Error: EACCES: permission denied, open '.aicf/conversation-memory.aicf'
```

**Solutions:**

1. **Fix permissions:**

   ```bash
   chmod -R 755 .aicf
   ```

2. **Check ownership:**

   ```bash
   chown -R $USER:$USER .aicf
   ```

3. **Run with proper user:**
   ```bash
   # Don't run as root unless necessary
   node app.js
   ```

### Issue: "EMFILE: too many open files"

**Symptoms:**

```
Error: EMFILE: too many open files
```

**Solutions:**

1. **Increase file descriptor limit:**

   ```bash
   # macOS/Linux
   ulimit -n 4096
   ```

2. **Close readers properly:**

   ```typescript
   // Use reader pooling
   class AICFPool {
     constructor(aicfDir, poolSize = 5) {
       this.readers = Array(poolSize)
         .fill(null)
         .map(() => new AICFReader(aicfDir));
     }
   }
   ```

3. **Reuse instances:**

   ```typescript
   // ✅ Good - reuse instance
   const reader = new AICFReader(".aicf");
   const stats1 = reader.getStats();
   const stats2 = reader.getStats();

   // ❌ Bad - creates too many instances
   for (let i = 0; i < 1000; i++) {
     const reader = new AICFReader(".aicf");
     reader.getStats();
   }
   ```

---

## Data Corruption

### Issue: "Corrupted AICF file detected"

**Symptoms:**

- Health check shows 'degraded' or 'unhealthy'
- Missing or malformed data
- Parse errors

**Solutions:**

1. **Run health check:**

   ```typescript
   const health = aicf.healthCheck();
   console.log("Status:", health.status);
   console.log("Issues:", health.issues);
   ```

2. **Backup and repair:**

   ```typescript
   // Backup corrupted file
   fs.copyFileSync(
     ".aicf/conversation-memory.aicf",
     ".aicf/conversation-memory.aicf.backup"
   );

   // Attempt repair
   await aicf.repairCorruption();
   ```

3. **Restore from backup:**

   ```bash
   cp .aicf-backup/conversation-memory.aicf .aicf/
   ```

4. **Rebuild index:**
   ```typescript
   await aicf.rebuildIndex();
   ```

### Issue: "Invalid line format"

**Symptoms:**

```
Error: Invalid line format at line 42
```

**Solutions:**

1. **Validate file format:**

   ```typescript
   const validator = new AICFValidator();
   const result = validator.validateFile(".aicf/conversation-memory.aicf");

   if (!result.valid) {
     console.log("Errors:", result.errors);
   }
   ```

2. **Manual inspection:**

   ```bash
   # Check line 42
   sed -n '42p' .aicf/conversation-memory.aicf
   ```

3. **Remove invalid lines:**
   ```typescript
   // Use safe mode to skip invalid lines
   const reader = new AICFReader(".aicf", { safeMode: true });
   ```

---

## Performance Issues

### Issue: "Slow query performance"

**Symptoms:**

- Queries take > 100ms
- High CPU usage
- Slow response times

**Solutions:**

1. **Use date range filters:**

   ```typescript
   // ✅ Fast - filtered query
   const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
   const recent = reader.getConversationsByDate(lastWeek);

   // ❌ Slow - unfiltered query
   const all = reader.getAllConversations();
   ```

2. **Limit result sets:**

   ```typescript
   // ✅ Fast - limited results
   const last10 = reader.getLastConversations(10);

   // ❌ Slow - unlimited results
   const all = reader.getLastConversations(10000);
   ```

3. **Use caching:**

   ```typescript
   class CachedReader {
     constructor(reader) {
       this.reader = reader;
       this.cache = new Map();
     }

     getStats() {
       if (!this.cache.has("stats")) {
         this.cache.set("stats", this.reader.getStats());
       }
       return this.cache.get("stats");
     }
   }
   ```

4. **Profile queries:**
   ```typescript
   console.time("query");
   const results = aicf.query("high-impact decisions");
   console.timeEnd("query");
   ```

### Issue: "High memory usage"

**Symptoms:**

- Memory usage grows over time
- Out of memory errors
- Slow garbage collection

**Solutions:**

1. **Use streaming for large files:**

   ```typescript
   const stream = fs.createReadStream(".aicf/conversation-memory.aicf");
   stream.on("data", (chunk) => {
     // Process chunk
   });
   ```

2. **Implement memory limits:**

   ```typescript
   const aicf = AICF.create(".aicf", {
     maxMemory: 100 * 1024 * 1024, // 100MB
   });
   ```

3. **Run memory dropoff:**

   ```typescript
   const dropoff = new MemoryDropoff();
   await dropoff.executeDropoff("30-day");
   ```

4. **Monitor memory:**
   ```typescript
   setInterval(() => {
     const usage = process.memoryUsage();
     console.log("Memory:", Math.round(usage.heapUsed / 1024 / 1024), "MB");
   }, 60000);
   ```

---

## Memory Issues

### Issue: "Memory leak detected"

**Symptoms:**

- Memory usage continuously increases
- Application crashes after running for hours
- Slow performance over time

**Solutions:**

1. **Check for unclosed resources:**

   ```typescript
   // ✅ Good - reuse instances
   const reader = new AICFReader(".aicf");

   // ❌ Bad - creates new instances
   setInterval(() => {
     const reader = new AICFReader(".aicf"); // Memory leak!
     reader.getStats();
   }, 1000);
   ```

2. **Clear caches periodically:**

   ```typescript
   setInterval(
     () => {
       cache.clear();
     },
     60 * 60 * 1000
   ); // Every hour
   ```

3. **Use weak references:**
   ```typescript
   const cache = new WeakMap();
   ```

---

## Query Problems

### Issue: "Query returns no results"

**Symptoms:**

- Query returns empty array
- Expected results not found

**Solutions:**

1. **Check data exists:**

   ```typescript
   const stats = reader.getStats();
   console.log("Total conversations:", stats.counts.conversations);
   ```

2. **Verify query syntax:**

   ```typescript
   // Try different queries
   const results1 = aicf.query("decisions");
   const results2 = aicf.query("high impact");
   const results3 = aicf.query("show me all decisions");
   ```

3. **Check date ranges:**
   ```typescript
   // Expand date range
   const allTime = reader.getConversationsByDate(new Date(0));
   ```

### Issue: "Query relevance score is low"

**Symptoms:**

- Relevance score < 0.5
- Results don't match query intent

**Solutions:**

1. **Improve query specificity:**

   ```typescript
   // ❌ Vague
   aicf.query("stuff");

   // ✅ Specific
   aicf.query("high-impact security decisions from last week");
   ```

2. **Use exact filters:**
   ```typescript
   // Instead of natural language query
   const highImpact = reader.getDecisionsByImpact("HIGH");
   const security = highImpact.filter((d) =>
     d.description.toLowerCase().includes("security")
   );
   ```

---

## Integration Issues

### Issue: "TypeScript type errors"

**Symptoms:**

```
Property 'logConversation' does not exist on type 'AICF'
```

**Solutions:**

1. **Install type definitions:**

   ```bash
   npm install --save-dev @types/aicf-core
   ```

2. **Use explicit types:**

   ```typescript
   import { AICF, AICFReader } from "aicf-core";

   const aicf: AICF = AICF.create(".aicf");
   const reader: AICFReader = new AICFReader(".aicf");
   ```

---

## Debugging Techniques

### Enable Debug Logging

```typescript
// Set environment variable
process.env.AICF_DEBUG = "true";

// Or use debug mode
const aicf = AICF.create(".aicf", { debug: true });
```

### Inspect AICF Files

```bash
# View file contents
cat .aicf/conversation-memory.aicf

# Count lines
wc -l .aicf/conversation-memory.aicf

# Search for specific content
grep "conv_001" .aicf/conversation-memory.aicf
```

### Performance Profiling

```typescript
import { performance } from "perf_hooks";

const start = performance.now();
const results = aicf.query("decisions");
const end = performance.now();

console.log(`Query took ${end - start}ms`);
```

---

## FAQ

### Q: Can I use AICF with TypeScript?

**A:** Yes! AICF-Core includes TypeScript definitions.

```typescript
import { AICF } from "aicf-core";
const aicf: AICF = AICF.create(".aicf");
```

### Q: Is AICF thread-safe?

**A:** Yes, AICFWriter uses atomic writes. Multiple readers are safe. Multiple writers require coordination.

### Q: Can I use AICF in the browser?

**A:** AICF-Core is designed for Node.js. Browser support is not currently available.

### Q: How do I migrate from v2 to v3?

**A:** See [Migration Guide](./MIGRATION_GUIDE.md) for detailed instructions.

### Q: What's the maximum file size?

**A:** AICF can handle files up to several GB, but performance is best with files < 100MB. Use memory dropoff for large datasets.

### Q: Can I use AICF with databases?

**A:** Yes! AICF can complement databases. Use AICF for AI context, databases for structured data.

### Q: How do I backup AICF data?

**A:** Simply copy the `.aicf` directory:

```bash
cp -r .aicf .aicf-backup-$(date +%Y%m%d)
```

### Q: Is AICF compatible with LangChain?

**A:** Yes! See [Integration Tutorials](./INTEGRATION_TUTORIALS.md) for examples.

### Q: How does AICF compare to Conare.ai and other context management apps?

**A:** AICF is fundamentally different:

| Aspect                 | AICF                                                        | Conare.ai / Desktop Apps                         |
| ---------------------- | ----------------------------------------------------------- | ------------------------------------------------ |
| **Platform Support**   | ALL AI platforms (ChatGPT, Claude, Cursor, Copilot, v0.dev) | Single platform only (Conare = Claude Code only) |
| **Data Ownership**     | Your git repository, you own the files                      | Proprietary app database                         |
| **Cost**               | Free forever (open source)                                  | $59-$109+ lifetime/subscriptions                 |
| **Portability**        | Universal - switch AI platforms anytime                     | Locked to specific app                           |
| **Team Collaboration** | Git = built-in version control & sharing                    | Limited/proprietary                              |
| **File Format**        | Open standard (.aicf files)                                 | Proprietary database                             |
| **Platform**           | Cross-platform (Node.js)                                    | Often limited (Conare = macOS only)              |

**Key Advantages of AICF:**

- ✅ **Universal**: One context format works with ALL AI platforms
- ✅ **Open Source**: No vendor lock-in, community-driven
- ✅ **Git-Native**: Version control, branching, team collaboration built-in
- ✅ **Free Forever**: Zero cost, no premium features
- ✅ **Portable**: Take your context anywhere, switch AIs freely

**When to consider alternatives:**

- If you only use one AI platform and prefer GUI tools
- If you want a macOS-specific app with visual interface
- If you don't need git integration or team collaboration

---

## Getting More Help

- **GitHub Issues**: [Report bugs](https://github.com/Vaeshkar/aicf-core/issues)
- **Discussions**: [Ask questions](https://github.com/Vaeshkar/aicf-core/discussions)
- **Documentation**: [Read the docs](https://github.com/Vaeshkar/aicf-core/tree/main/docs)

---

**Still having issues? Open a GitHub issue with:**

- AICF-Core version
- Node.js version
- Operating system
- Error message
- Steps to reproduce
