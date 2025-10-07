# Agent-Based Memory Management Concept

**Date:** 2025-10-06  
**Status:** Concept for future implementation  
**Target Project:** aic-experimental  
**Priority:** Post-production deployment  

## 🎯 Core Problem

**Current State:** 36 files, 10,504 lines - Information overload  
- LLMs add information but never manage it
- Files grow indefinitely (1,211 lines in conversation-log.md!)
- Context becomes unwieldy for AI assistants

## 💡 Dennis's Solution: Time-Based Agent Janitors

### The Algorithm
```
Hourly Agent Scan:
1. Find entries added in last hour (using timestamps)
2. Count new content lines  
3. If > THRESHOLD: Archive oldest entries from bottom
4. Maintain key|value in .aicf, bullet points in .ai
```

### Key Insight: Crush Phases
**Normal:** ~50 lines/hour  
**Today:** ~2,000 lines/2 hours (40x spike during security documentation)  
**Need:** Emergency protocols for development sprints

## 🔧 Implementation Ideas

### Timestamp-Based Triggers
- **We have:** ISO8601 timestamps in .aicf files ✅
- **Scan frequency:** Hourly intervals
- **Archive strategy:** Bottom-up (oldest first)

### Crush Phase Handling
- **Adaptive thresholds:** Scale based on recent activity
- **Emergency mode:** Aggressive archiving during 10x spikes  
- **Priority preservation:** Keep CRITICAL entries longer

### Reference Management
```
Before Archive: (500 lines of details)
After Archive: 
- .ai: "Security Complete (see archive/security-2025-q4.md)"
- .aicf: "security_phase_0=complete|archive_ref=security-2025-q4"
```

## 🚀 Future Work

### Architecture Questions
1. **Agent Runtime:** Cron? Git hooks? Session triggers?
2. **Intelligence Level:** Simple line counts vs semantic parsing?
3. **Cross-file consistency:** How to maintain references?
4. **Failure modes:** What if agent crashes mid-archive?

### Integration with aic-experimental
- This concept belongs in the experimental research project
- Production AICF should focus on core functionality first
- Agent system can be developed in parallel

## 📋 Next Steps (Post-Production)
- [ ] Design agent architecture in aic-experimental
- [ ] Prototype timestamp parsing and threshold logic
- [ ] Test crush phase handling algorithms
- [ ] Build reference management system
- [ ] Create archive structure and lifecycle

---

**Note:** Brilliant concept but requires dedicated focus. Getting production deployment done first is the right call.