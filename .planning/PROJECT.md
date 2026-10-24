# Sirona Autonomous Developer Agent & Desktop Studio

## What This Is

Sirona is a high-performance, local-first autonomous developer agent and Electron desktop studio. It combines an async Python backend engine with a React 19 desktop frontend, enabling developers to delegate complex coding tasks, run multi-step reasoning workflows, execute tools securely, and inspect real-time progress through a responsive desktop studio.

## Core Value

Zero-loss, crash-resilient autonomous coding with an Electron desktop studio featuring instant turn leasing, durable pre-flight messaging, and local SQLite persistence.

## Requirements

### Validated (Shipped & Verified)

- [x] **REQ-01**: Async FastAPI daemon with REST API and low-latency WebSocket JSON-RPC streaming gateway.
- [x] **REQ-02**: Electron 40 desktop shell with secure `contextBridge` IPC (`sironaDesktop`).
- [x] **REQ-03**: React 19 + Tailwind CSS 4 frontend studio with Nanostores reactive state management.
- [x] **REQ-04**: Multi-provider LLM support (Google Gemini, Anthropic Claude 3.7 with extended thinking, OpenAI, Ollama).
- [x] **REQ-05**: Dynamic tool execution registry (filesystem edits, terminal execution, search, memory).
- [x] **REQ-06**: Approval and safety gating workflows for high-risk operations.
- [x] **REQ-07**: SQLite persistence in WAL mode with relational session, message, and execution tracking.
- [x] **REQ-08**: `SessionTurnLeaseRegistry` providing single-writer guarantees, generation counters, and lease expiration safety.
- [x] **REQ-09**: Pre-flight message durability (`adopt_submit_user_row`) saving prompts prior to execution.
- [x] **REQ-10**: Sub-millisecond SQLite FTS5 full-text search integrated with `⌘K` command palette.
- [x] **REQ-11**: Continuous test verification suite with 149 passing tests (63 Pytest + 86 Vitest).

### Active (Current Milestone: Production Hardening & Advanced Capabilities)

- [ ] **REQ-12**: Autonomous turn recovery loop & circuit breaker policies for provider rate limits (Phase 17).
- [ ] **REQ-13**: Gateway multiplexing, connection pooling, and multi-window event broadcasting (Phase 18).
- [ ] **REQ-14**: Physical CardStack drag-and-dock panel layout with animated physics (Phase 19).
- [ ] **REQ-15**: Zero-trust sandbox isolation for subprocess execution (Bubblewrap / Win32 Job Objects) (Phase 20).
- [ ] **REQ-16**: Remote bot desktop streaming with embedded noVNC viewer for browser agents (Phase 21).

### Out of Scope

- Cloud-hosted SaaS database dependency — Sirona is strictly local-first and privacy-preserving.
- Unsandboxed blind execution of destructive shell scripts without explicit user safety configuration.

## Context

- Evolved across 16 implementation stages, audited against local Hermes Desktop architecture (`C:\Users\bharg\AppData\Local\hermes`).
- Built for cross-platform desktop operation (Windows 11, macOS, Linux).
- Clean monorepo structure with decoupled backend (`sirona-core`), frontend (`sirona-ui`), and shared contracts (`sirona-shared`).

## Constraints

- **Persistence**: Strict SQLite WAL mode with local ACID guarantees; no remote telemetry without consent.
- **Concurrency**: Only one active turn per session enforced via `SessionTurnLeaseRegistry`.
- **Quality**: 100% green test passes required before committing phase deliverables.

## Key Decisions

| Date | Scope | Decision | Rationale |
|------|-------|----------|-----------|
| 2026-10-24 | Concurrency | Implement `SessionTurnLeaseRegistry` with monotonic generation tokens | Prevents race conditions and overlapping LLM turn executions |
| 2026-10-24 | Resiliency | Pre-flight prompt durability via `adopt_submit_user_row` | Guarantees user prompts survive process crashes or network drops |
| 2026-10-24 | Search | SQLite FTS5 virtual tables with trigram/tokenized search | Enables instant `⌘K` message navigation without loading full chat history into memory |
| 2026-10-24 | Desktop UI | React 19 + Nanostores micro-stores | Isolates high-frequency token streams from heavy React tree re-renders |
