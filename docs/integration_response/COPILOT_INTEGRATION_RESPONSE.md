# AICF Integration with GitHub Copilot: Official Support Inquiry

**Project:** AICF (AI Context Format)  
**Goal:** To understand the officially supported integration points for connecting context management tools with GitHub Copilot in VS Code.

## Executive Summary

We understand that direct UI injection into other extensions' webviews is not feasible due to security and sandboxing principles within the VS Code extension architecture. However, as developers of AICF, a tool designed to preserve conversation history across AI sessions, we are keen to explore any officially supported, non-intrusive integration pathways that GitHub Copilot may offer now or in the future. Our goal is to provide a seamless user experience for exporting conversation context at natural endpoints.

## Key Questions for the GitHub Copilot Team

We are seeking clarification on the following points to guide our development roadmap and ensure our integration strategy aligns with best practices and supported APIs:

1. **Conversation Lifecycle Event APIs:**
    * Are there any plans for GitHub Copilot to expose extension APIs related to conversation lifecycle events, such as `onConversationStart`, `onConversationEnd`, or `onUserIdle`?

2. **Custom Slash Command Registration:**
    * Is there, or will there be, a supported mechanism for third-party extensions to register custom slash commands (e.g., `/exportAICF`) that would be discoverable and executable within the Copilot Chat interface?

3. **VS Code Event Broadcasting:**
    * Does the GitHub Copilot extension currently emit any workspace-level or global VS Code events (e.g., `copilot.conversation.active`, `copilot.message.sent`) that other extensions can safely subscribe to?

4. **Conversation State Detection:**
    * Is there a supported method for an external extension to reliably detect whether a Copilot Chat session is currently active, inactive, or has been closed?

5. **Official Export Hooks:**
    * Would the GitHub Copilot team consider adding official "Export Conversation" hooks or contribution points? This would allow context management tools like AICF to register as export providers, creating a standardized and secure ecosystem for users.

## Current Integration Plan & Desired Future State

Our current workaround involves a combination of file system monitoring (to detect changes to where conversation logs might be stored locally, if at all) and generic VS Code notifications. This approach is functional but lacks the seamless, native feel we aim for.

Our ideal future state is a fully supported integration where AICF can suggest a conversation export at a natural pause, directly within the user's workflow, using official APIs. This would enhance the user experience and provide significant value by bridging the gap between real-time AI interaction and long-term knowledge retention.

We are hopeful for a future where the VS Code and Copilot extension ecosystem allows for this kind of symbiotic relationship between tools.
