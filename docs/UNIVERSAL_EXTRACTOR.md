# Universal Conversation Extractor

The Universal Extractor is a bulletproof system for safely extracting conversation data from multiple AI platforms and integrating it into your AICF core system. Built with **data preservation as the top priority**.

## 🔐 Safety First Architecture

### Key Principles

1. **BULLETPROOF BACKUPS** - All existing data is backed up before any operation
2. **INDEPENDENT PARSERS** - Each platform parser operates in complete isolation  
3. **GRACEFUL FAILURES** - One parser failure doesn't affect others
4. **DATA VALIDATION** - All extracted data is validated before storage
5. **ROLLBACK CAPABILITY** - Any operation can be safely undone

### Data Loss Prevention

- ✅ **Automatic backups** before every operation
- ✅ **Incremental updates** - only adds new data, never overwrites
- ✅ **Duplicate detection** - prevents processing the same conversation twice
- ✅ **Format validation** - ensures all data meets AICF 3.0 standards
- ✅ **Error isolation** - platform failures don't corrupt existing data

## 🚀 Quick Start

### Basic Usage

```javascript
const { AICF } = require('@aicf/core');

// Create AICF instance
const aicf = new AICF();

// Extract conversations from all available platforms
const results = await aicf.extractConversations({
    maxConversations: 10,
    timeframe: '7d',
    platforms: 'all'
});

console.log(`Extracted ${results.summary.extraction.conversationsExtracted} conversations`);
```

### Platform-Specific Extraction

```javascript
// Extract only from Warp Terminal
const warpResults = await aicf.extractConversations({
    platforms: ['warp'],
    maxConversations: 5
});

// Extract from multiple specific platforms
const results = await aicf.extractConversations({
    platforms: ['warp', 'augment'],
    timeframe: '3d'
});
```

### Advanced Configuration

```javascript
const { AICFExtractorIntegration } = require('@aicf/core');

const extractor = new AICFExtractorIntegration({
    preserveExisting: true,
    normalizeFormat: true,
    organizeFiles: true,
    backupEnabled: true,
    maxBackups: 20
});

const results = await extractor.extractAndIntegrate({
    platforms: 'all',
    maxConversations: 20,
    timeframe: '14d',
    workspaceLimit: 5  // For Augment VSCode workspaces
});
```

## 🏗️ Supported Platforms

### Currently Supported

| Platform | Parser | Data Source | Status |
|----------|--------|-------------|---------|
| **Warp Terminal** | `WarpParser` | SQLite Database | ✅ Production Ready |
| **Augment VSCode** | `AugmentParser` | LevelDB Files | ✅ Production Ready |

### Planned Support

| Platform | Parser | Data Source | Status |
|----------|--------|-------------|---------|
| **OpenAI ChatGPT** | `OpenAIParser` | Export Files | 🚧 Coming Soon |
| **Claude/Anthropic** | `ClaudeParser` | Export Files | 🚧 Coming Soon |
| **Cursor AI** | `CursorParser` | Local Storage | 🚧 Coming Soon |

## 🔍 Platform Detection

The system automatically detects which AI platforms are available on your system:

```javascript
// Check what platforms are available
const status = await aicf.getExtractionStatus();

console.log('Available platforms:', status.extractor.available);
console.log('Unavailable platforms:', status.extractor.unavailable);
```

### Warp Terminal Detection

- Searches multiple possible database locations
- Validates database accessibility
- Reports recent activity status

### Augment VSCode Detection

- Scans VSCode workspace storage
- Identifies active LevelDB stores
- Prioritizes recently accessed workspaces

## 💾 Backup & Recovery System

### Automatic Backups

Every extraction operation creates a timestamped backup:

```javascript
const results = await aicf.extractConversations();
console.log(`Backup created: ${results.summary.extraction.backupId}`);
```

### Manual Backup Management

```javascript
const { UniversalExtractor } = require('@aicf/core');
const extractor = new UniversalExtractor();

// Create manual backup
const backupId = await extractor.createBackup('manual-backup');

// List all backups
const backups = extractor.listBackups();
console.log('Available backups:', backups);

// Restore from backup
await extractor.rollbackToBackup(backupId);
```

### Backup Structure

```
.aicf/backups/
├── backup-extraction-2025-01-06T18-30-45-123Z/
│   ├── manifest.json          # Backup metadata
│   ├── ai/                    # Complete .ai/ directory backup
│   └── aicf/                  # Complete .aicf/ directory backup
└── backup-manual-2025-01-06T17-15-30-456Z/
    └── ...
```

## 🔧 Data Processing Pipeline

### 1. Extraction Phase

```javascript
// Each parser operates independently
const warpConversations = await warpParser.extractConversations();
const augmentConversations = await augmentParser.extractConversations();
```

### 2. Analysis Phase

```javascript
// Analyze for insights, technologies, patterns
const analyzed = await analyzeConversation(conversation);
// Result: { insights, technologies, summary, quality, confidence }
```

### 3. Normalization Phase

```javascript
// Convert to clean AICF 3.0 format
const normalized = await prettifier.prettifyData(analyzed);
```

### 4. Integration Phase

```javascript
// Safely append to existing AICF files (preserves all existing content)
await appendToConversationFile(conversation);
```

## 📊 Data Quality & Validation

### Content Validation

- Minimum content length requirements
- Noise pattern filtering
- Duplicate detection
- Format compliance checking

### Quality Assessment

```javascript
// Automatic quality scoring
const quality = assessConversationQuality(conversation);
// Result: 'high', 'medium', or 'low'

// Confidence calculation
const confidence = calculateConfidence(conversation);
// Result: 0.0 to 1.0
```

### Data Enrichment

- Technology detection
- Insight extraction
- Conversation type classification
- Working directory analysis

## 🚨 Error Handling & Recovery

### Independent Parser Operation

```javascript
// If one parser fails, others continue
try {
    const warpData = await warpParser.extract();
} catch (error) {
    console.warn('Warp parser failed, continuing with other parsers');
}

try {
    const augmentData = await augmentParser.extract();
} catch (error) {
    console.warn('Augment parser failed, continuing with other parsers');
}
```

### Rollback on Critical Failure

```javascript
try {
    const results = await extractor.extractAndIntegrate();
} catch (error) {
    if (results.extraction?.backupId) {
        console.log('Rolling back due to critical failure...');
        await extractor.rollbackToBackup(results.extraction.backupId);
    }
}
```

## 🧪 Testing & Validation

### Run Comprehensive Tests

```bash
# Test the complete system
node test-universal-extractor.js
```

### Test Output Example

```
🧪 Testing Universal Extractor System
=====================================

📊 Step 1: Checking system status...
🔍 Extractor Status:
   Available parsers: 2
   Processed conversations: 0
   Backup count: 3

✅ Available Parsers:
   - Warp Terminal: warp
   - Augment VSCode Extension: augment, vscode

💾 Step 2: Testing backup system...
   ✅ Backup created: backup-test-2025-01-06T18-45-30-789Z

🔍 Step 3: Testing extraction (limited scope)...
✅ Extraction completed successfully!
   Conversations extracted: 5
   Conversations processed: 5
   Conversations added: 5

🎉 Universal Extractor Test Complete!
✅ System architecture validated
✅ Backup/recovery system working
✅ Data integrity preserved
✅ Platform detection functional
```

## ⚙️ Configuration Options

### Extraction Options

```javascript
const options = {
    platforms: 'all',           // 'all' or ['warp', 'augment']
    maxConversations: 10,       // Limit per platform
    timeframe: '7d',            // '1d', '7d', '30d', etc.
    workspaceLimit: 3,          // For Augment workspaces
    organizeFiles: true         // Run file organization after extraction
};
```

### System Options

```javascript
const systemOptions = {
    backupEnabled: true,        // Always keep enabled for safety
    maxBackups: 10,             // Number of backups to retain
    validateContent: true,      // Validate extracted content
    parallelExtraction: false,  // Sequential for safety
    preserveExisting: true      // Never overwrite existing data
};
```

## 🔄 Integration with AICF Core

### Main AICF Class Integration

```javascript
const aicf = new AICF();

// Extract conversations
await aicf.extractConversations();

// Organize files
await aicf.organizeFiles();

// Run complete memory lifecycle
await aicf.runMemoryLifecycle();
```

### File Organization Integration

The extractor integrates with `FileOrganizationAgent` to:
- Move misplaced files to appropriate subdirectories
- Maintain whitelist of core AICF files
- Create organized documentation structure

### Memory Lifecycle Integration

Works with `MemoryLifecycleManager` to:
- Process extracted conversations through analysis pipeline
- Apply memory decay strategies
- Generate insights and summaries

## 🚦 Best Practices

### Production Usage

1. **Always test first**: Run `test-universal-extractor.js` before production use
2. **Start small**: Begin with limited conversations (`maxConversations: 5`)
3. **Monitor backups**: Regularly check backup creation and integrity
4. **Validate results**: Review extracted conversation quality
5. **Schedule extraction**: Run during off-peak hours to avoid platform interference

### Data Safety

1. **Never disable backups** in production
2. **Test rollback procedures** before critical operations
3. **Monitor disk space** for backup storage
4. **Validate data integrity** after each extraction
5. **Keep multiple backup generations** for redundancy

### Platform-Specific Tips

#### Warp Terminal
- Extraction works while Warp is running
- Database is read-only, no interference with Warp operation
- Recent conversations have richer metadata

#### Augment VSCode
- Close VSCode before extraction for best results
- LevelDB files can be large - monitor processing time
- Multiple workspaces are processed in parallel

## 🆘 Troubleshooting

### Common Issues

**"No parsers available"**
- Warp/Augment not installed or databases not found
- Check file paths and permissions

**"Backup creation failed"**
- Insufficient disk space
- Permission issues with .aicf directory

**"Extraction timeout"**
- Large LevelDB files in Augment
- Reduce `workspaceLimit` or increase timeout

### Debug Mode

```javascript
const extractor = new AICFExtractorIntegration({
    verbose: true  // Enable detailed logging
});
```

### Recovery Procedures

```javascript
// Emergency rollback to last known good state
const extractor = new UniversalExtractor();
const backups = extractor.listBackups();
await extractor.rollbackToBackup(backups[0].id);
```

## 📈 Future Enhancements

### Planned Features

- **Real-time extraction**: Monitor AI platforms for new conversations
- **Enhanced analysis**: Integration with Dennis's full ConversationAnalyzer
- **Cloud backup**: Optional backup to cloud storage
- **Web interface**: Visual management of extractions and backups
- **Scheduled extraction**: Automatic daily/weekly extraction runs

### Parser Extensions

- OpenAI ChatGPT export parser
- Claude conversation parser  
- Cursor AI session parser
- Generic JSON conversation parser

---

## 🎯 Summary

The Universal Extractor provides a **bulletproof, production-ready system** for safely extracting and integrating AI conversation data. With automatic backups, independent parser operation, and comprehensive error handling, it ensures your valuable conversation history is preserved and enhanced without risk.

**Key benefits:**
- ✅ **Zero data loss** with automatic backup/recovery
- ✅ **Platform independence** - parsers can't interfere with each other
- ✅ **Production ready** with comprehensive testing
- ✅ **Future proof** - easily extensible to new AI platforms
- ✅ **Integrated** - works seamlessly with existing AICF core systems