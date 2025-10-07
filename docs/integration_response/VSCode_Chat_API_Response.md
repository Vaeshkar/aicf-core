# Inquiry: VS Code Chat API Roadmap

## 1. Plans for exposing conversation events

We would appreciate clarity on whether the VS Code team has a roadmap for a stable, public API that surfaces chat session lifecycle events (e.g., request started, response completed, conversation archived). Today, the sandbox prevents cross-extension observation, which limits workflow automation for features like AICF export.

## 2. Potential webhook/event support

If native API hooks are not on the near-term roadmap, could the team consider webhook-style callbacks or an event bus that extensions can subscribe to (with explicit user consent)? That would allow external tooling to trigger actions when a conversation ends or when the workspace becomes idle without requiring DOM access to another extension’s UI.

## 3. Post-conversation action suggestions

Is there any supported mechanism—current or planned—for third-party extensions to register contextual actions that appear once an AI chat turn finishes? Even a simple “extension-provided quick suggestion” hook would enable us to recommend exporting the transcript to AICF without modifying other extensions’ chat panels.

## 4. Access to conversation data

Do existing AI chat integrations persist data in a format that other extensions can access once users grant permission (e.g., exported JSON, shared storage)? If not, would the team consider standardizing a storage contract so that extensions like ours can read the latest transcript, with user approval, and perform tasks such as format conversion?

## 5. Interest in standardization collaboration

We are eager to collaborate on a standardized “conversation export” capability. A shared specification—perhaps aligned with AICF—would let users port their AI chat history across tools. If this aligns with your roadmap, we would welcome a discussion on requirements, governance, and pilot implementations.

---

We can deliver an interim experience using VS Code notifications and monitored files, but official APIs would let us provide a seamless, low-friction export flow that respects user privacy and extension boundaries.
