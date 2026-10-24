<!-- GSD:project-start source:PROJECT.md -->

## Project

**Sirona Autonomous Developer Agent & Desktop Studio**

Sirona is a high-performance, local-first autonomous developer agent and Electron desktop studio. It combines an async Python backend engine with a React 19 desktop frontend, enabling developers to delegate complex coding tasks, run multi-step reasoning workflows, execute tools securely, and inspect real-time progress through a responsive desktop studio.

**Core Value:** Zero-loss, crash-resilient autonomous coding with an Electron desktop studio featuring instant turn leasing, durable pre-flight messaging, and local SQLite persistence.

### Constraints

- **Persistence**: Strict SQLite WAL mode with local ACID guarantees; no remote telemetry without consent.
- **Concurrency**: Only one active turn per session enforced via `SessionTurnLeaseRegistry`.
- **Quality**: 100% green test passes required before committing phase deliverables.

<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->

## Technology Stack

## Languages

- TypeScript 5.7+ / JavaScript ES2023 - All desktop UI, state management, and shared contract models (`sirona-ui`, `sirona-shared`)
- Python 3.11+ / 3.12 - Agent runtime engine, async scheduling, SQLite persistence, and FastAPI server (`sirona-core`)
- PowerShell / Windows Batch - Local startup scripts (`start.ps1`, `start.bat`) and system CLI integration

## Runtime

- Node.js 20.x / 22.x
- Python 3.11+ / 3.12.x Virtual Environment (`.venv`)
- Electron 40.x (Chromium 134 + Node runtime)
- npm 10.x - `package-lock.json` present in `sirona-ui` and root
- pip / Hatchling - `pyproject.toml` in `sirona-core`

## Frameworks

- React 19.0 - UI components, layouts, virtual DOM rendering
- FastAPI 0.115+ - High-throughput async REST and WebSocket API gateway
- Electron 40.10+ - Secure desktop shell, window lifecycle, native context bridge
- Nanostores (`nanostores`, `@nanostores/react`) - Lightweight reactive micro-stores for high-frequency streaming events
- TanStack React Query 5.66+ - Client-side cache, query invalidation, and data synchronization
- Vitest 3.0+ - Fast frontend unit and component testing (`vitest run`)
- Pytest 8.3+ with `pytest-asyncio` 0.25+ - Comprehensive async backend testing
- Vite 6.1+ with `@vitejs/plugin-react` and `@tailwindcss/vite`
- Electron-Builder 26.18+ - Production packaging (`win-unpacked`, NSIS installers)
- Hatchling - Python wheel/sdist packaging

## Key Dependencies

- `aiosqlite` 0.20+ - Async SQLite database access with WAL mode and FTS5 full-text indexing
- `pydantic` 2.10+ & `pydantic-settings` 2.7+ - Data validation, JSON serialization, and environment configuration
- `websockets` 14.0+ - Low-latency bidirectional RPC and real-time streaming between UI and Core
- `lucide-react` 1.16+ - Consistent iconography across the desktop studio
- `clsx` & `tailwind-merge` - Dynamic Tailwind utility class resolution
- `uvicorn[standard]` 0.32+ - ASGI server runner
- `httpx` 0.28+ - Async HTTP client for external AI providers and remote APIs
- `psutil` 6.1+ - Process monitoring, turn execution lifecycle tracking, and memory profiling

## Configuration

- Backend configuration managed via `sirona.config.Settings` (Pydantic BaseSettings)
- Local SQLite database: `~/.sirona/sirona.db` or `%APPDATA%/sirona/sirona.db`
- Host/Port: Defaulting to `127.0.0.1:8000`
- `sirona-ui/vite.config.ts` - Vite dev and bundling configuration
- `sirona-ui/electron-builder.json` - Desktop release configuration
- `sirona-core/pyproject.toml` - Python project dependencies and pytest configuration

## Platform Requirements

- Windows 10/11 x64, macOS 12+, or Linux x86_64
- Node.js 20+ and Python 3.11+ installed
- Packaged desktop application via `electron-builder` (`release/win-unpacked/Sirona.exe`)
- Local or headless background daemon running `sirona.cli serve`

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

## Naming Patterns

### Python (`sirona-core`)

- `snake_case.py` for all modules and packages (e.g., `turn_lease.py`, `runtime.py`, `dispatcher.py`).
- Test files prefixed with `test_` (e.g., `test_turn_lease.py`, `test_message_adoption.py`).
- `PascalCase` for classes, models, and exceptions (e.g., `SessionTurnLeaseRegistry`, `TurnLeaseToken`, `AgentRuntime`).
- Pydantic models inherit from `pydantic.BaseModel`.
- Exceptions end with `Error` or `Exception` (e.g., `TurnLeaseTimeoutError`).
- `snake_case` for all functions and methods (e.g., `run_turn`, `acquire_lease`, `adopt_submit_user_row`).
- Private methods prefixed with single underscore `_` (e.g., `_execute_tool_call`).
- `snake_case` for local variables and attributes.
- `UPPER_SNAKE_CASE` for module-level constants and default configuration values.

### TypeScript & React (`sirona-ui`, `sirona-shared`)

- `PascalCase.tsx` for React component files (e.g., `Sidebar.tsx`, `ChatArea.tsx`, `CommandPalette.tsx`).
- `camelCase.ts` for utilities, stores, and hooks (e.g., `sessionStore.ts`, `commandStore.ts`, `useWebSocket.ts`).
- `kebab-case.ts` for schemas or contract declarations in `sirona-shared`.
- Test files suffixed with `.test.ts` or `.test.tsx` (e.g., `Sidebar.test.tsx`).
- `PascalCase` for component functions.
- `use` prefix for custom React hooks (`useTurnLease`, `useSessionMessages`).
- `camelCase` for variables, properties, and function names.
- `PascalCase` for interfaces and type aliases (no `I` prefix, e.g., `Session`, `TurnLeaseToken`).
- `UPPER_SNAKE_CASE` for static constants.

## Code Style & Formatting

- Python 3.11+ type annotations required on all function arguments and return types.
- Format with standard 4-space indentation.
- Explicit async/await for all network and database operations (no blocking sync calls in async loops).
- Context managers (`async with`) for database connections, transactions, and lease acquisition.
- Strict TypeScript (`"strict": true` in `tsconfig.json`). No untyped `any` without explicit justification.
- Tailwind CSS 4 utility classes arranged using the `cn()` utility (`clsx` + `tailwind-merge`).
- Nanostores (`atom`, `map`) for atomic high-frequency state updates outside the React render cycle.
- Clean separation between presentation components and business logic stores.

## Import Organization

## Error Handling & Resiliency Patterns

- **No Silent Failures**: All caught exceptions must be logged or surfaced to the caller with structured error payloads.
- **Lease Safety**: Long-running operations must wrap turn leases in `try ... finally` blocks to ensure lease release upon unexpected errors.
- **Defensive Parsing**: Use Pydantic `model_validate()` and TypeScript guards before consuming dynamic WebSocket payloads.

<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

## Pattern Overview

- **Local-First Persistence:** SQLite database in WAL (Write-Ahead Logging) mode with FTS5 search, providing zero-latency reads and total user data sovereignty.
- **Durable Pre-flight Adoption:** User prompts and turn states are persisted to SQLite *before* execution begins, eliminating turn loss on process crashes or network disconnects.
- **Single-Writer Turn Leasing:** Strict lease tokens with monotonic generation counters (`SessionTurnLeaseRegistry`) preventing concurrent conflicting turns on the same session.
- **Reactive Real-time Streaming:** Low-latency WebSocket duplex communication streaming tokens, reasoning chains, tool invocations, and approval dialogs into Nanostores / React 19 state.
- **Contract-Driven Type Safety:** Shared interfaces across Python backend (`pydantic`) and TypeScript frontend (`sirona-shared`).

## Layers

- Purpose: Render the high-performance desktop studio interface, handle interactive user actions, and present streaming agent output.
- Contains: React 19 components, Tailwind CSS 4 styling, Lucide icons, Nanostores state stores, command palette (`⌘K`), split panes, message threads, diff viewer, and tool cards.
- Depends on: `sirona-shared` (type contracts), WebSocket client, Electron preload bridge.
- Used by: End user interacting with desktop application.
- Purpose: Manage native operating system integration, secure window creation, protocol handling, and IPC context bridging.
- Contains: `main.cjs` (Electron main process), `preload.cjs` (isolated context bridge).
- Depends on: Chromium and Node.js APIs.
- Used by: Electron runtime to host the renderer application.
- Purpose: Expose unified HTTP REST and WebSocket JSON-RPC endpoints for session management, turn execution, tool approvals, and full-text search.
- Contains: `main.py`, `websocket/dispatcher.py`, `routes/sessions.py`, `routes/search.py`, `routes/models.py`.
- Depends on: Agent Runtime, SessionTurnLeaseRegistry, Storage Layer.
- Used by: Frontend WebSocket and HTTP clients.
- Purpose: Orchestrate model streaming, execute reasoning chains, manage turn lifecycles, and enforce lease safety.
- Contains: `runtime.py` (`AgentRuntime`), `turn_lease.py` (`SessionTurnLeaseRegistry`), `scheduler.py`, `context.py`.
- Depends on: Tool Registry, AI Provider Clients, Storage Layer.
- Used by: Gateway / WebSocket dispatcher.
- Purpose: Execute file edits, terminal commands, web searches, and file inspections within user-defined safety boundaries.
- Contains: `registry.py`, `filesystem.py`, `shell.py`, `search.py`, `memory.py`.
- Depends on: Operating system commands and file system.
- Used by: Agent Runtime during tool execution turns.
- Purpose: Manage ACID-compliant SQLite operations, schema migrations, and full-text search indexing.
- Contains: `database.py`, `models.py`, `migrations/`.
- Depends on: `aiosqlite`.
- Used by: All backend services and API routes.

## Data Flow

### 1. User Prompt Submission & Execution Cycle

```text

```

### 2. Search & Command Palette Flow

```text

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

<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.agent/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
