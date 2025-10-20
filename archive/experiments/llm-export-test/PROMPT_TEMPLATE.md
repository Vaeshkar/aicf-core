# LLM Export Test - Standardized Prompts

## Prompt A: Basic Export (Standard Test)

```
Please export our conversation in AICF (AI Context File) format.

Follow this exact structure with these sections:

@CONVERSATION
timestamp: [ISO 8601 format]
platform: [your platform name]
session_id: [if available]
@CONVERSATION_END

@CONTEXT
- Current project: [what we're working on]
- Working directory: [if mentioned]
- Tech stack: [languages/frameworks discussed]
- Goals: [what user is trying to accomplish]
@CONTEXT_END

@MESSAGES
[timestamp] user: [message content]
[timestamp] assistant: [response content]
[Include ALL messages chronologically]
@MESSAGES_END

@DECISIONS
- [timestamp] [Decision made with brief rationale]
[Include key technical or strategic decisions]
@DECISIONS_END

@CODE_CHANGES
[timestamp] file: [path]
action: [created|modified|deleted]  
summary: [brief description]
[Include any code or file changes discussed]
@CODE_CHANGES_END

@INSIGHTS
- [Important observations about preferences, patterns, constraints]
@INSIGHTS_END

@TODO
- [ ] [Outstanding tasks]
- [x] [Completed items]
@TODO_END

@METADATA
export_version: 1.0
total_messages: [count]
export_date: [current timestamp]
privacy_level: standard
@METADATA_END

Rules:
- Use EXACT section tags as shown
- Include ALL our conversation messages
- Use ISO 8601 timestamps where possible
- Be comprehensive but concise
- Do not add commentary or extra sections
```

## Prompt B: Consistency Check (Repeat Test)

```
Please export our conversation in AICF format again, using the same structure as before:

@CONVERSATION through @METADATA_END sections.

This is a consistency test - provide the same format and content as you would for any AICF export request.
```

## Prompt C: Focused Export (Section Test)

```
Export only the following sections from our conversation in AICF format:

@DECISIONS_END - Key decisions we made
@INSIGHTS_END - Important observations about the project
@TODO_END - Outstanding tasks

Use standard AICF section format with proper tags.
```

## Prompt D: Privacy-Aware Export (Redaction Test)

```
Export our conversation in AICF format with privacy protections:

- Replace any file paths with [PATH_REDACTED]
- Replace any personal identifiers with [USER_REDACTED]  
- Replace any sensitive technical details with [TECH_REDACTED]
- Use standard AICF format otherwise

Include: @CONVERSATION, @CONTEXT, @DECISIONS, @INSIGHTS sections
Exclude: @MESSAGES (for privacy)
```

## Test Instructions

### For Each LLM Platform:

1. **Copy Prompt A exactly** - paste into the LLM
2. **Save response** as `attempt-1-basic.aicf`
3. **Wait 5 minutes**, then copy **Prompt B exactly**
4. **Save response** as `attempt-2-repeat.aicf`  
5. **Test Prompt C** and save as `attempt-3-focused.aicf`
6. **Test Prompt D** and save as `attempt-4-privacy.aicf`

### Document Observations:
- Did LLM follow format exactly?
- Did it add extra sections or commentary?
- Was content consistent between attempts?
- Did it miss any important conversation elements?
- How did it handle timestamps and metadata?

### Save Notes:
Create `notes.md` in each platform folder with observations, format deviations, and quality assessment.

---
**Critical**: Use these prompts exactly as written to ensure consistent testing across all LLM platforms.