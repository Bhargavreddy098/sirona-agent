# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Non-technical power users seeking a guided, visual coding assistant. Users want to build, customize, inspect, and automate software projects without needing to write raw syntax from scratch, manage complex build chains, or master terminal command-line interfaces.

## Product Purpose

Sirona empowers users to create, modify, and manage software through intuitive visual guidance, conversational interaction, and intelligent agent execution. Success means a non-developer can express their goal in plain language, receive structured recommendations, visually review diffs, safely approve actions, and see their software running without friction.

## Positioning

Cloud-connected agent orchestration with heavy multi-model provider routing. Unlike raw terminal coding agents or monolithic single-model wrappers, Sirona dynamically routes tasks across leading cloud AI models (Gemini, Claude 3.7 with extended thinking, OpenAI) and presents all complex agentic operations through an accessible, highly visual desktop studio.

## Operating Context

- Desktop studio environment on Windows, macOS, and Linux powered by Electron and React 19.
- Users operate within project workspaces containing files, scripts, documents, and assets.
- Interactions take place through guided conversational threads, interactive approval modals, visual diff reviewers, and a ⌘K command palette.
- High-frequency token streaming and real-time reasoning visualization make the agent's thought process transparent and easy to follow.

## Capabilities and Constraints

**Confirmed Capabilities:**
- Dynamic multi-model routing across Google Gemini, Anthropic Claude, OpenAI, and local models.
- Guided conversational interaction with plain-language explanations of code changes and actions.
- Interactive visual approvals for file modifications, package installations, and terminal executions.
- Real-time token and reasoning stream display with low latency.
- Fast full-text search (SQLite FTS5) across past turns and conversation history.
- Local SQLite persistence in WAL mode ensuring no loss of user data or active turns.

**Constraints:**
- Technical jargon must be translated into clear, human-understandable concepts; actions must state their real-world impact before execution.
- Security and user consent are mandatory: destructive or irreversible operations require explicit visual approval.
- High reliability: turns must be crash-resilient with durable pre-flight storage.

## Brand Commitments

- **Name**: Sirona
- **Personality**: Reassuring, clear, highly capable, and transparent.
- **Tone & Voice**: Approachable and calm; acts as an expert pair programmer who simplifies complexity rather than showing off technical esoterica.

## Evidence on Hand

- Core engine and desktop studio fully built across 16 foundational stages (`sirona-core`, `sirona-ui`, `sirona-shared`).
- Comprehensive automated verification suite with 149 passing tests (63 Pytest + 86 Vitest).
- Packaged desktop executable (`release/win-unpacked/Sirona.exe`).
- Exhaustive reverse-engineering artifacts and parity audits of desktop agent architectures in `docs/` and project logs.

## Product Principles

1. **Clarity Before Code**: Never present dense terminal logs or raw diffs without an accompanying plain-language summary of what was done and why.
2. **Invisible Intelligence**: Handle model selection, context pruning, prompt routing, and turn leasing under the hood so the user can focus entirely on what they want to build.
3. **Safety Through Transparency**: Make every tool execution explicit, visual, and reversible; eliminate the anxiety of breaking the workspace.
4. **Zero-Loss Resiliency**: Ensure every user prompt, session state, and execution record is saved durably so crashes or disconnections never waste user effort.

## Accessibility & Inclusion

- Adherence to WCAG 2.1 AA standards for color contrast, focus rings, and legible typography.
- Information must never be communicated by color alone (always combine color with iconography or status labels).
- Support for keyboard navigation and screen-reader friendly ARIA attributes across all interactive studio modals and panels.
