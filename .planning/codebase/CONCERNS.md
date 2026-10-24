# Codebase Concerns

**Analysis Date:** 2026-10-24

## Tech Debt & Upcoming Milestone Gaps

**1. Autonomous Turn Recovery & Circuit Breakers (Planned: Phase 17):**
- Current State: Pre-flight user prompts and turn leases are stored durably in SQLite with monotonic generation counters. If the backend process crashes mid-stream, the prompt is safely stored in `messages` table with status `pending`.
- Gap: Automatic restart daemon detection to inspect pending turns upon boot and seamlessly resume execution without requiring explicit user resubmission. Circuit breaker thresholding needed for repetitive provider rate-limit (HTTP 429) errors.
- Approach: Implement `AutonomousTurnRecoveryManager` and `CircuitBreakerPolicy` during Phase 17.

**2. Gateway Multiplexing & Connection Pooling (Planned: Phase 18):**
- Current State: The WebSocket dispatcher handles the active window's JSON-RPC requests cleanly.
- Gap: If multiple desktop windows or headless CLI observers connect simultaneously, event broadcasting needs connection pooling and channel subscription filtering to avoid redundant payload serialization.
- Approach: Add client session multiplexer and channel pub/sub router in `sirona.api.websocket`.

**3. Physical CardStack & Drag-and-Dock Layout (Planned: Phase 19):**
- Current State: Responsive desktop layout with flexible split views, collapsible sidebars, and command palette.
- Gap: Hermes-style physical CardStack drag-and-dock panels with animated physics and persistent layout states.
- Approach: Enhance `sirona-ui/src/components/layout` with dynamic dockable card containers.

**4. Sandboxed Subprocess Execution (Planned: Phase 20):**
- Current State: Subprocess shell executions run under the local host user account, gated by user approval dialogs for destructive actions.
- Gap: Zero-trust process sandboxing (Bubblewrap / Docker / Windows Job Objects) to isolate file system mutations and network calls for untrusted agent workflows.
- Approach: Integrate OS-level sandbox runner in `sirona.tools.shell`.

**5. Remote Bot Desktop & noVNC Webview (Planned: Phase 21):**
- Current State: Terminal and tool execution outputs are visualized as structured text, diffs, and code blocks.
- Gap: Visual browser automation and remote VNC stream rendering for headless browser bots.
- Approach: Embed noVNC client component in `sirona-ui/src/components` with RFB WebSocket tunneling.

## Security Considerations

**API Key Storage:**
- Current State: Provider keys can be set via environment variables or entered in the UI settings dialog.
- Mitigation: In production builds, keys must be stored in the OS-native credential vault (Windows Credential Manager / macOS Keychain / Linux Secret Service) via Electron `safeStorage` API rather than plaintext local storage.

**Arbitrary Code Execution via Tools:**
- Current State: Explicit user approval required for shell execution and file overwrite tools.
- Recommendation: Maintain strict path validation preventing directory traversal attacks (`../`) outside workspace boundaries.

## Performance Considerations

**FTS5 Index Size:**
- Current State: Full-text search index (`messages_fts`) scales efficiently to tens of thousands of messages.
- Recommendation: Ensure background database compaction (`VACUUM` / `PRAGMA optimize`) runs periodically on application shutdown.

---
*Concerns analysis: 2026-10-24*
*Update as items are remediated or new technical debt emerges*
