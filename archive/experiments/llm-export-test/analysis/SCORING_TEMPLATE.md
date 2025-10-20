# LLM Export Quality Scoring Template

## Scoring Criteria (0-10 scale)

### 1. Format Compliance (0-10)
- **10**: Perfect AICF format, exact section tags, proper structure
- **8-9**: Minor format deviations (extra spaces, slight tag differences)
- **6-7**: Major format issues but still parseable
- **4-5**: Significant structure problems
- **0-3**: Unusable format, doesn't follow AICF structure

### 2. Content Completeness (0-10)
- **10**: Captures all key conversation elements, decisions, and context
- **8-9**: Minor omissions but covers 90%+ of important content
- **6-7**: Moderate content gaps, missing some decisions or context
- **4-5**: Major omissions, incomplete conversation coverage
- **0-3**: Severely incomplete, missing most content

### 3. Consistency (0-10)
- **10**: Identical output for identical prompts
- **8-9**: Minor variations in wording but same essential content
- **6-7**: Moderate inconsistencies across repeat attempts
- **4-5**: Significant variations between attempts
- **0-3**: Completely different outputs for same prompt

### 4. Accuracy (0-10)
- **10**: All facts, timestamps, and details correct
- **8-9**: Minor factual errors or timestamp approximations
- **6-7**: Some factual mistakes but generally accurate
- **4-5**: Multiple errors affecting reliability
- **0-3**: Significant inaccuracies, unreliable content

### 5. Following Instructions (0-10)
- **10**: Follows prompt exactly, no extra content or commentary
- **8-9**: Minor additions but mostly follows instructions
- **6-7**: Adds some unwanted content or sections
- **4-5**: Significant deviations from instructions
- **0-3**: Ignores instructions, adds extensive unwanted content

## Per-Platform Scoring Sheet

### Claude (Anthropic)
| Criteria | Attempt 1 | Attempt 2 | Attempt 3 | Average | Notes |
|----------|-----------|-----------|-----------|---------|-------|
| Format Compliance | _/10 | _/10 | _/10 | _/10 | |
| Content Completeness | _/10 | _/10 | _/10 | _/10 | |
| Consistency | _/10 | _/10 | _/10 | _/10 | |
| Accuracy | _/10 | _/10 | _/10 | _/10 | |
| Following Instructions | _/10 | _/10 | _/10 | _/10 | |
| **TOTAL SCORE** | _/50 | _/50 | _/50 | _/50 | |

### Warp AI
| Criteria | Attempt 1 | Attempt 2 | Attempt 3 | Average | Notes |
|----------|-----------|-----------|-----------|---------|-------|
| Format Compliance | _/10 | _/10 | _/10 | _/10 | |
| Content Completeness | _/10 | _/10 | _/10 | _/10 | |
| Consistency | _/10 | _/10 | _/10 | _/10 | |
| Accuracy | _/10 | _/10 | _/10 | _/10 | |
| Following Instructions | _/10 | _/10 | _/10 | _/10 | |
| **TOTAL SCORE** | _/50 | _/50 | _/50 | _/50 | |

### Augment
| Criteria | Attempt 1 | Attempt 2 | Attempt 3 | Average | Notes |
|----------|-----------|-----------|-----------|---------|-------|
| Format Compliance | _/10 | _/10 | _/10 | _/10 | |
| Content Completeness | _/10 | _/10 | _/10 | _/10 | |
| Consistency | _/10 | _/10 | _/10 | _/10 | |
| Accuracy | _/10 | _/10 | _/10 | _/10 | |
| Following Instructions | _/10 | _/10 | _/10 | _/10 | |
| **TOTAL SCORE** | _/50 | _/50 | _/50 | _/50 | |

### ChatGPT
| Criteria | Attempt 1 | Attempt 2 | Attempt 3 | Average | Notes |
|----------|-----------|-----------|-----------|---------|-------|
| Format Compliance | _/10 | _/10 | _/10 | _/10 | |
| Content Completeness | _/10 | _/10 | _/10 | _/10 | |
| Consistency | _/10 | _/10 | _/10 | _/10 | |
| Accuracy | _/10 | _/10 | _/10 | _/10 | |
| Following Instructions | _/10 | _/10 | _/10 | _/10 | |
| **TOTAL SCORE** | _/50 | _/50 | _/50 | _/50 | |

### Gemini
| Criteria | Attempt 1 | Attempt 2 | Attempt 3 | Average | Notes |
|----------|-----------|-----------|-----------|---------|-------|
| Format Compliance | _/10 | _/10 | _/10 | _/10 | |
| Content Completeness | _/10 | _/10 | _/10 | _/10 | |
| Consistency | _/10 | _/10 | _/10 | _/10 | |
| Accuracy | _/10 | _/10 | _/10 | _/10 | |
| Following Instructions | _/10 | _/10 | _/10 | _/10 | |
| **TOTAL SCORE** | _/50 | _/50 | _/50 | _/50 | |

## Final Comparison

| LLM Platform | Average Score | Rank | Key Strengths | Key Weaknesses | Recommended? |
|--------------|---------------|------|---------------|----------------|--------------|
| Claude | _/50 | _ | | | ✅/❌ |
| Warp AI | _/50 | _ | | | ✅/❌ |
| Augment | _/50 | _ | | | ✅/❌ |
| ChatGPT | _/50 | _ | | | ✅/❌ |
| Gemini | _/50 | _ | | | ✅/❌ |

## Decision Threshold

**Minimum viable score for LLM export approach**: 35/50 (70%)

- **Score 40+**: Excellent - LLM export is viable
- **Score 35-39**: Good - LLM export workable with refinements
- **Score 30-34**: Marginal - Significant issues, probably not viable
- **Score <30**: Poor - System extraction superior

## Experiment Conclusion

Based on testing, the recommendation is:

- [ ] **LLM Export Primary** - Scores consistently above 35/50
- [ ] **LLM Export Secondary** - Workable but needs improvements  
- [ ] **System Extraction Primary** - LLM export too unreliable
- [ ] **Hybrid Approach** - Use both methods depending on use case

**Rationale**: [Fill in after completing tests]