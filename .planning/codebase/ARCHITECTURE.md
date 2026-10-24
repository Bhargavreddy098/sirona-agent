# Architecture

**Analysis Date:** 2026-10-24

## Pattern Overview

**Overall:** Decoupled Autonomous Agent Architecture with Local Electron Desktop Studio & Async Daemon

**Key Characteristics:**
- **Local-First Persistence:** SQLite database in WAL (Write-Ahead Logging) mode with FTS5 search, providing zero-latency reads and total user data sovereignty.
- **Durable Pre-flight Adoption:** User prompts and turn states are persisted to SQLite *before* execution begins, eliminating turn loss on process crashes or network disconnects.
- **Single-Writer Turn Leasing:** Strict lease tokens with monotonic generation counters (`SessionTurnLeaseRegistry`) preventing concurrent conflicting turns on the same session.
- **Reactive Real-time Streaming:** Low-latency WebSocket duplex communication streaming tokens, reasoning chains, tool invocations, and approval dialogs into Nanostores / React 19 state.
- **Contract-Driven Type Safety:** Shared interfaces across Python backend (`pydantic`) and TypeScript frontend (`sirona-shared`).

## Layers

**1. Presentation Layer (`sirona-ui/src/`):**
- Purpose: Render the high-performance desktop studio interface, handle interactive user actions, and present streaming agent output.
- Contains: React 19 components, Tailwind CSS 4 styling, Lucide icons, Nanostores state stores, command palette (`⌘K`), split panes, message threads, diff viewer, and tool cards.
- Depends on: `sirona-shared` (type contracts), WebSocket client, Electron preload bridge.
- Used by: End user interacting with desktop application.

**2. Desktop Shell Layer (`sirona-ui/electron/`):**
- Purpose: Manage native operating system integration, secure window creation, protocol handling, and IPC context bridging.
- Contains: `main.cjs` (Electron main process), `preload.cjs` (isolated context bridge).
- Depends on: Chromium and Node.js APIs.
- Used by: Electron runtime to host the renderer application.

**3. API & Gateway Layer (`sirona-core/sirona/api/`):**
- Purpose: Expose unified HTTP REST and WebSocket JSON-RPC endpoints for session management, turn execution, tool approvals, and full-text search.
- Contains: `main.py`, `websocket/dispatcher.py`, `routes/sessions.py`, `routes/search.py`, `routes/models.py`.
- Depends on: Agent Runtime, SessionTurnLeaseRegistry, Storage Layer.
- Used by: Frontend WebSocket and HTTP clients.

**4. Agent Engine & Scheduling Layer (`sirona-core/sirona/agent/`):**
- Purpose: Orchestrate model streaming, execute reasoning chains, manage turn lifecycles, and enforce lease safety.
- Contains: `runtime.py` (`AgentRuntime`), `turn_lease.py` (`SessionTurnLeaseRegistry`), `scheduler.py`, `context.py`.
- Depends on: Tool Registry, AI Provider Clients, Storage Layer.
- Used by: Gateway / WebSocket dispatcher.

**5. Tool Execution & Security Layer (`sirona-core/sirona/tools/`):**
- Purpose: Execute file edits, terminal commands, web searches, and file inspections within user-defined safety boundaries.
- Contains: `registry.py`, `filesystem.py`, `shell.py`, `search.py`, `memory.py`.
- Depends on: Operating system commands and file system.
- Used by: Agent Runtime during tool execution turns.

**6. Storage & Indexing Layer (`sirona-core/sirona/storage/`):**
- Purpose: Manage ACID-compliant SQLite operations, schema migrations, and full-text search indexing.
- Contains: `database.py`, `models.py`, `migrations/`.
- Depends on: `aiosqlite`.
- Used by: All backend services and API routes.

## Data Flow

### 1. User Prompt Submission & Execution Cycle

```text
[User Types Message in UI Composer]
                 ↓
[Submit via WebSocket (turn.submit)]
                 ↓
[Dispatcher Acquires Turn Lease via SessionTurnLeaseRegistry]
                 ↓
[Durable Pre-flight: Prompt Saved to SQLite messages Table]
                 ↓
[AgentRuntime.run_turn() Adopts Message & Begins LLM Stream]
                 ↓
[StreamChunk Tokens / Reasoning Events Dispatched over WS]
                 ↓
[Model Requests Tool Call] → [Approval Gate / Safety Check]
                 ↓
[Tool Executed Locally] → [Result Appended to Context]
                 ↓
[LLM Synthesizes Final Answer]
                 ↓
[Turn Lease Released & State Marked Complete in SQLite]
```

### 2. Search & Command Palette Flow

```text
[User Presses ⌘K / Types in Search Box]
                 ↓
[Debounced Request to search.messages / API /api/search]
                 ↓
[SQLite FTS5 Query with MATCH and snippet()]
                 ↓
[Matching Sessions & Message Snippets Returned to UI Store]
                 ↓
[Rendered Instantly in Command Palette with Category Badges]
```

## Key Abstractions

- `SessionTurnLeaseRegistry`: Manages `TurnLeaseToken` lifecycles with monotonic generation numbers. Guarantees that only one turn executes per session, rejecting stale or overlapping calls.
- `StreamChunk`: Standardized event payload representing token stream fragments, tool invocation starts/deltas/finishes, or reasoning blocks.
- `ToolRegistry`: Dynamic catalog of agent capabilities with typed JSON schemas, approval requirements, and sandboxed execution hooks.
- `AgentRuntime`: Core orchestrator executing the ReAct (Reasoning + Acting) loop with pluggable AI providers.

## Entry Points

- **Desktop UI**: `sirona-ui/electron/main.cjs` launches the Chromium desktop window, loading `index.html` or Vite dev server.
- **Backend Server**: `sirona-core/sirona/cli.py` (`sirona serve`) boots FastAPI via Uvicorn.
- **Test Suites**: `npm run test` (Vitest for UI) and `pytest` (Pytest for Core).

## Error Handling & Resiliency

- **Turn Lease Timeouts**: Expired leases are automatically reclaimed with structured `TurnLeaseTimeoutError` exceptions.
- **Pre-flight Message Adoption**: If the process crashes mid-turn, the adopted user prompt remains safely persisted in SQLite with status `pending`, ready for recovery on restart.
- **Defensive WebSocket Handling**: Automatic reconnection with exponential backoff and message deduplication.

---
*Architecture analysis: 2026-10-24*
*Update after structural modifications*
