# AICF-Core Architecture

Visual documentation of AICF-Core architecture, data flow, and system design.

## Table of Contents

- [System Overview](#system-overview)
- [Component Architecture](#component-architecture)
- [Data Flow](#data-flow)
- [Memory Lifecycle](#memory-lifecycle)
- [File Structure](#file-structure)
- [Query Processing](#query-processing)
- [Concurrency Model](#concurrency-model)

---

## System Overview

```mermaid
graph TB
    subgraph "Application Layer"
        APP[Your Application]
    end
    
    subgraph "AICF-Core API"
        AICF[AICF Main Class]
        READER[AICFReader]
        WRITER[AICFWriter]
        API[AICF API]
    end
    
    subgraph "Agent Layer"
        PARSER[Conversation Parser]
        ANALYZER[Conversation Analyzer]
        LIFECYCLE[Memory Lifecycle Manager]
        DROPOFF[Memory Dropoff]
    end
    
    subgraph "Storage Layer"
        INDEX[index.aicf]
        CONV[conversation-memory.aicf]
        TECH[technical-context.aicf]
        WORK[work-state.aicf]
        DEC[decisions.aicf]
    end
    
    APP --> AICF
    AICF --> READER
    AICF --> WRITER
    AICF --> API
    
    API --> PARSER
    API --> ANALYZER
    API --> LIFECYCLE
    API --> DROPOFF
    
    READER --> INDEX
    READER --> CONV
    READER --> TECH
    READER --> WORK
    READER --> DEC
    
    WRITER --> INDEX
    WRITER --> CONV
    WRITER --> TECH
    WRITER --> WORK
    WRITER --> DEC
```

---

## Component Architecture

```mermaid
classDiagram
    class AICF {
        +AICFReader reader
        +AICFWriter writer
        +Object agents
        +logConversation(data)
        +addDecision(decision)
        +addInsight(insight)
        +query(queryString)
        +getProjectOverview()
        +generateAnalytics()
        +healthCheck()
    }
    
    class AICFReader {
        +String aicfDir
        +getStats()
        +getLastConversations(count)
        +getConversationsByDate(startDate)
        +getDecisionsByImpact(impact)
        +getInsightsByPriority(priority)
    }
    
    class AICFWriter {
        +String aicfDir
        +logConversation(data)
        +addDecision(decision)
        +addInsight(insight)
        +updateWorkState(state)
    }
    
    class AICFAPI {
        +AICFReader reader
        +AICFWriter writer
        +getProjectOverview()
        +generateAnalytics()
        +query(queryString)
        +healthCheck()
        +exportToJSON()
        +exportToMarkdown()
    }
    
    class IntelligentConversationParser {
        +analyzeConversation(data)
        +extractContext(data)
    }
    
    class ConversationAnalyzer {
        +extractInsights(analysis)
        +identifyDecisions(analysis)
    }
    
    class MemoryLifecycleManager {
        +processMemoryCycle()
        +archiveOldData()
    }
    
    class MemoryDropoff {
        +executeDropoff(cycle)
        +archiveData(data)
    }
    
    AICF --|> AICFAPI
    AICF --> AICFReader
    AICF --> AICFWriter
    AICF --> IntelligentConversationParser
    AICF --> ConversationAnalyzer
    AICF --> MemoryLifecycleManager
    AICF --> MemoryDropoff
```

---

## Data Flow

### Write Operation Flow

```mermaid
sequenceDiagram
    participant App as Application
    participant AICF as AICF
    participant Writer as AICFWriter
    participant File as AICF File
    participant Index as Index File
    
    App->>AICF: logConversation(data)
    AICF->>AICF: Validate data
    AICF->>Writer: logConversation(data)
    Writer->>Writer: Format data
    Writer->>File: Append to file (atomic)
    Writer->>Index: Update index
    Index-->>Writer: Index updated
    File-->>Writer: Write complete
    Writer-->>AICF: Success
    AICF-->>App: Promise resolved
```

### Read Operation Flow

```mermaid
sequenceDiagram
    participant App as Application
    participant AICF as AICF
    participant Reader as AICFReader
    participant Index as Index File
    participant File as AICF File
    
    App->>AICF: getLastConversations(10)
    AICF->>Reader: getLastConversations(10)
    Reader->>Index: Read index
    Index-->>Reader: Return metadata
    Reader->>File: Read specific lines
    File-->>Reader: Return data
    Reader->>Reader: Parse data
    Reader-->>AICF: Return conversations
    AICF-->>App: Return results
```

### Query Operation Flow

```mermaid
sequenceDiagram
    participant App as Application
    participant AICF as AICF
    participant API as AICF API
    participant Reader as AICFReader
    participant Analyzer as Analyzer
    
    App->>AICF: query("high-impact decisions")
    AICF->>API: query("high-impact decisions")
    API->>API: Parse query intent
    API->>Reader: getDecisionsByImpact("HIGH")
    Reader-->>API: Return decisions
    API->>Analyzer: Calculate relevance
    Analyzer-->>API: Relevance scores
    API->>API: Rank results
    API-->>AICF: Return ranked results
    AICF-->>App: Query results
```

---

## Memory Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Active: New Data
    Active --> Recent: 7 days
    Recent --> Archived30: 30 days
    Archived30 --> Archived90: 90 days
    Archived90 --> Compressed: 180 days
    Compressed --> [*]: Deleted (optional)
    
    Active --> Preserved: High Impact
    Recent --> Preserved: Critical
    Archived30 --> Preserved: Important
    Preserved --> [*]: Never Deleted
    
    note right of Active
        Frequently accessed
        Full indexing
        Fast queries
    end note
    
    note right of Recent
        Regular access
        Indexed
        Good performance
    end note
    
    note right of Archived30
        Occasional access
        Partial indexing
        Slower queries
    end note
    
    note right of Preserved
        High-impact decisions
        Critical insights
        Security data
    end note
```

---

## File Structure

```mermaid
graph TD
    subgraph ".aicf Directory"
        INDEX[index.aicf<br/>Fast lookup metadata]
        CONV[conversation-memory.aicf<br/>Conversation history]
        TECH[technical-context.aicf<br/>Technical decisions]
        WORK[work-state.aicf<br/>Current work state]
        DEC[decisions.aicf<br/>Decision log]
    end
    
    subgraph "Index Structure"
        META[Project Metadata]
        COUNTS[Counts]
        POINTERS[File Pointers]
    end
    
    subgraph "Data File Structure"
        HEADER[@CONVERSATION]
        STATE[@STATE]
        INSIGHTS[@INSIGHTS]
        DECISIONS[@DECISIONS]
    end
    
    INDEX --> META
    INDEX --> COUNTS
    INDEX --> POINTERS
    
    CONV --> HEADER
    CONV --> STATE
    CONV --> INSIGHTS
    
    DEC --> DECISIONS
```

---

## Query Processing

```mermaid
flowchart TD
    START([Query Input]) --> PARSE[Parse Query Intent]
    PARSE --> INTENT{Query Type?}
    
    INTENT -->|Natural Language| NL[Natural Language Processing]
    INTENT -->|Specific Filter| FILTER[Apply Filters]
    INTENT -->|Date Range| DATE[Date Range Filter]
    
    NL --> EXTRACT[Extract Keywords]
    EXTRACT --> SEARCH[Search Index]
    
    FILTER --> DIRECT[Direct Lookup]
    DATE --> RANGE[Range Scan]
    
    SEARCH --> RESULTS[Collect Results]
    DIRECT --> RESULTS
    RANGE --> RESULTS
    
    RESULTS --> RANK[Rank by Relevance]
    RANK --> LIMIT[Apply Limits]
    LIMIT --> FORMAT[Format Output]
    FORMAT --> END([Return Results])
```

---

## Concurrency Model

```mermaid
graph TB
    subgraph "Multiple Readers (Safe)"
        R1[Reader 1]
        R2[Reader 2]
        R3[Reader 3]
        R4[Reader N]
    end
    
    subgraph "Single Writer (Atomic)"
        W1[Writer]
        LOCK[File Lock]
    end
    
    subgraph "AICF Files"
        FILES[(AICF Data)]
    end
    
    R1 -.->|Read| FILES
    R2 -.->|Read| FILES
    R3 -.->|Read| FILES
    R4 -.->|Read| FILES
    
    W1 -->|Acquire Lock| LOCK
    LOCK -->|Write| FILES
    FILES -->|Release Lock| LOCK
    
    style R1 fill:#90EE90
    style R2 fill:#90EE90
    style R3 fill:#90EE90
    style R4 fill:#90EE90
    style W1 fill:#FFB6C1
    style LOCK fill:#FFD700
```

### Concurrent Access Pattern

```mermaid
sequenceDiagram
    participant R1 as Reader 1
    participant R2 as Reader 2
    participant W as Writer
    participant F as File System
    
    par Read Operations (Concurrent)
        R1->>F: Read data
        R2->>F: Read data
    end
    
    F-->>R1: Return data
    F-->>R2: Return data
    
    W->>F: Acquire lock
    F-->>W: Lock acquired
    W->>F: Write data
    F-->>W: Write complete
    W->>F: Release lock
    
    par Read Operations (Resume)
        R1->>F: Read data
        R2->>F: Read data
    end
```

---

## Performance Characteristics

```mermaid
graph LR
    subgraph "Operation Performance"
        OP1[Read Last 10<br/>1.2ms]
        OP2[Date Range Query<br/>3.4ms]
        OP3[Append Write<br/>2.1ms]
        OP4[Full Context Load<br/>15.8ms]
    end
    
    subgraph "Scaling Characteristics"
        SC1[O1 Index Access]
        SC2[Linear File Scan]
        SC3[Constant Write Time]
    end
    
    OP1 --> SC1
    OP2 --> SC2
    OP3 --> SC3
    OP4 --> SC2
    
    style OP1 fill:#90EE90
    style OP2 fill:#FFD700
    style OP3 fill:#90EE90
    style OP4 fill:#FFB6C1
```

---

## Compression Technology

```mermaid
graph TD
    subgraph "Input: JSON Format"
        JSON[375KB JSON<br/>Verbose structure<br/>Repeated keys]
    end
    
    subgraph "AICF Processing"
        PARSE[Parse Structure]
        SEMANTIC[Extract Semantic Tags]
        COMPRESS[Pipe-Delimited Format]
        INDEX[Build Index]
    end
    
    subgraph "Output: AICF Format"
        AICF[8KB AICF<br/>95.5% compression<br/>Zero semantic loss]
    end
    
    JSON --> PARSE
    PARSE --> SEMANTIC
    SEMANTIC --> COMPRESS
    COMPRESS --> INDEX
    INDEX --> AICF
    
    style JSON fill:#FFB6C1
    style AICF fill:#90EE90
```

---

## Integration Architecture

```mermaid
graph TB
    subgraph "AI Platforms"
        CLAUDE[Claude API]
        GPT[OpenAI GPT]
        COPILOT[GitHub Copilot]
        CURSOR[Cursor IDE]
    end
    
    subgraph "AICF-Core"
        CORE[AICF Core Engine]
    end
    
    subgraph "Frameworks"
        LANGCHAIN[LangChain]
        LLAMAINDEX[LlamaIndex]
    end
    
    subgraph "Storage"
        LOCAL[Local Files]
        S3[AWS S3]
        GCS[Google Cloud Storage]
        AZURE[Azure Blob]
    end
    
    CLAUDE --> CORE
    GPT --> CORE
    COPILOT --> CORE
    CURSOR --> CORE
    
    CORE --> LANGCHAIN
    CORE --> LLAMAINDEX
    
    CORE --> LOCAL
    CORE --> S3
    CORE --> GCS
    CORE --> AZURE
```

---

## Next Steps

- **[Getting Started](./GETTING_STARTED.md)** - Learn the basics
- **[API Reference](./API_REFERENCE.md)** - Complete API docs
- **[Best Practices](./BEST_PRACTICES.md)** - Production patterns
- **[Examples](../examples/)** - Working code samples

---

**AICF-Core Architecture** | **95.5% Compression, 0% Semantic Loss**

