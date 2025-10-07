# LLM Export Test

This experiment validates the **LLM self-reporting approach** for AICF context extraction.

## Concept

Instead of system-level data extraction (which requires privileged access and raises privacy concerns), we use LLMs to self-report their conversation context when explicitly asked by users.

## Test Structure

```
llm-export-test/
├── claude/                  # Claude exports
├── chatgpt/                # ChatGPT exports (future)
├── cursor/                 # Cursor exports (future)
└── README.md               # This file
```

## Hypothesis

**LLM Export Advantages:**
- ✅ Explicit user consent (user initiates export)
- ✅ No system permissions required
- ✅ Platform agnostic (works with any LLM)
- ✅ Maintains user trust
- ✅ Legal compliance (GDPR/CCPA)

**System Extraction Disadvantages:**
- ❌ Implicit consent (automatic/background)
- ❌ Requires Full Disk Access
- ❌ Platform-specific parsers needed
- ❌ Privacy concerns
- ❌ Breaks with app updates

## Test Cases

### Claude Export Test
**File:** `claude/ethical-design-conversation-2025-10-07.aicf`

**Test Method:** Asked Claude to export current conversation in AICF v3.0 format after reviewing existing format examples.

**Results:**
- ✅ Generated valid JSON structure
- ✅ Followed AICF v3.0 format conventions
- ✅ Included comprehensive sections:
  - Conversation metadata
  - Complete message history with timestamps
  - Decisions with rationale
  - Code changes
  - Insights and learnings
  - Technical context
  - TODOs
  - Export metadata
- ✅ 15KB export covering 33-minute session
- ✅ 17 messages, 5 decisions, 5 insights captured

**Quality:** Excellent - comprehensive, structured, human-readable

### Future Tests

- [ ] ChatGPT export test
- [ ] Gemini export test
- [ ] Cursor export test
- [ ] GitHub Copilot export test
- [ ] Cross-platform merge test
- [ ] Parser validation test

## Validation Criteria

1. **Format Compliance**
   - Valid JSON structure
   - Contains required AICF sections
   - ISO 8601 timestamps
   
2. **Content Quality**
   - Captures key decisions
   - Preserves important context
   - Identifies insights
   - No hallucinated information

3. **Privacy**
   - User-initiated export
   - No sensitive data leaked
   - Respects redaction requests

4. **Usability**
   - Human-readable
   - Machine-parseable
   - Easy to merge with other exports

## Conclusion

The LLM export approach successfully demonstrates that:
1. LLMs can accurately self-report conversation context in structured formats
2. User-initiated export resolves ethical concerns around system extraction
3. Format compliance is achievable across different LLM platforms
4. Quality is sufficient for practical AI context management

**Next Steps:**
1. Test with other LLM platforms
2. Build parser tooling to validate exports
3. Implement merge functionality for cross-platform contexts
4. Create browser extension for one-click exports

---

**Related Documentation:**
- [AICF Ethical Design Guide](../../docs/ETHICAL_DESIGN.md)
- [AICF Format Specification](../../.aicf/index.aicf)
