# Sirona Autonomous Developer Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Sirona, an autonomous personal developer agent engineered from Hermes Agent foundations (excluding platform bots), featuring a Python FastAPI + WebSocket core and a modern React 19 + TypeScript + Tailwind CSS desktop UI with borderless multi-pane layout, CardStack approvals, live tool streaming, and embedded terminal decks.

**Architecture:** Sirona uses a decoupled client-server architecture: `sirona-core` provides an async Python engine with SQLite WAL persistence, LLM provider routing, dynamic tool/skill execution, MCP hosting, and dual REST + JSON-RPC/WebSocket gateways; `sirona-ui` provides an ultra-responsive React desktop canvas with virtualized transcripts, interactive approval overlays, composer drawers, and PTY terminal deck integration. All platform bots (Discord, Telegram, Slack, WhatsApp, Twitter, Teams) and external bot relay synchronizers are stripped out to deliver an uncompromised, hyper-focused local personal agent experience.

**Tech Stack:**
- **Backend (`sirona-core`):** Python 3.11+, FastAPI, Uvicorn, WebSockets, Pydantic v2, aiosqlite (SQLite WAL mode), Google GenAI SDK (`google-genai`), Anthropic SDK, OpenAI SDK, LiteLLM/Ollama, MCP Python SDK (`mcp`), pywinpty / ptyprocess for interactive PTY shells.
- **Frontend (`sirona-ui`):** React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, Nanostores / Zustand, Radix UI Primitives, Shiki syntax highlighter, xterm.js (with WebGL addon).
- **Protocol & Storage:** REST API + JSON-RPC 2.0 over WebSocket + SSE, SQLite with FTS5 (`sirona.db`), YAML configs (`~/.sirona/config.yaml`), Markdown memory (`SOUL.md`).

**Spec:** Hermes Agent & Desktop UX/UI Reverse-Engineered Architecture Specification (`C:\Users\bharg\AppData\Local\hermes`).

## Global Constraints
- Rebrand all names, configurations, directories, databases, and protocol identifiers from `Hermes` to `Sirona`.
- Strictly exclude all external platform bots (Telegram, Discord, Slack, WhatsApp, Teams, Matrix, Twitter) and bot relay / hosted room multi-bot synchronizers.
- Retain subagent delegation for local parallel problem solving, but eliminate external bot personas and chat platform webhook ingresses.
- Design token discipline: zero hardcoded hex colors or arbitrary Tailwind classes; all styling references CSS variables (`--ui-stroke-*`, `--ui-text-*`, `--ui-bg-*`, `--shadow-nous`).
- Flat, not boxed: no nested cards inside cards, no heavy borders; structure achieved via whitespace and hairline dividers (`--ui-stroke-tertiary`).
- Immediate optimistic UI feedback with background server reconciliation.
- Strict Z-index layer hierarchy (`--z-modal-backdrop: 120` to `--z-crash: 320`).
- Database durability: SQLite WAL mode with synchronous pragma and full ACID transactions.

## Review Focus
1. **Interactive Approval Deadlock:** When a tool requires approval (`CardStack`), verify that the agent turn pauses cleanly without blocking the event loop or timing out while waiting for user Enter/Esc.
2. **Streaming WebSocket Disconnect & Reconnect:** If the client drops connection mid-stream, verify that the backend buffers output or maintains state and the client resynchronizes without losing transcript history or duplicating tokens.
3. **PTY Terminal Concurrency:** Ensure that heavy interactive terminal output (e.g. `htop`, `vim`, `npm install`) over WebSockets does not starve agent chat streaming or UI rendering threads.
4. **Context Window Overflow:** Verify that long-running sessions automatically trigger token budgeting, sliding window truncation, and smart summarization before hitting model context limits.
5. **Tool Execution Isolation & File Safety:** Verify that file write/edit tools create backups and support diff review before irreversible changes are committed to disk.

---

## Complete API Route & Protocol Specification

### 1. REST API Endpoints (`sirona-core`)

| Method | Path | Description | Request Body | Response Payload |
|---|---|---|---|---|
| `GET` | `/health` | Liveness health check | None | `{"status": "ok", "version": "1.0.0"}` |
| `GET` | `/health/detailed` | Deep health check (DB, providers, storage) | None | `{"status": "ok", "db": true, "providers": {...}, "uptime": float}` |
| `GET` | `/v1/models` | List available models & providers | None | `{"data": [{"id": str, "provider": str, "name": str, "context_window": int}]}` |
| `GET` | `/api/model/options` | Model configuration options & parameters | None | `{"models": [...], "reasoning_efforts": ["low", "medium", "high"]}` |
| `POST` | `/api/model/set` | Set default model or profile model | `{"model": str, "provider": str, "profile": str?}` | `{"success": true, "active_model": str}` |
| `GET` | `/v1/capabilities` | Server capabilities & enabled toolsets | None | `{"terminal": bool, "mcp": bool, "computer_use": bool, "vision": bool}` |
| `GET` | `/api/status` | Real-time system status (RAM, GPU, context) | None | `{"cpu_pct": float, "mem_pct": float, "active_runs": int, "gateway": "connected"}` |
| `GET` | `/api/config` | Read active Sirona configuration | None | `{"config": SironaConfigRecord, "profile": str}` |
| `PATCH` | `/api/config` | Update configuration settings | `{"updates": dict, "profile": str?}` | `{"success": true, "config": SironaConfigRecord}` |
| `GET` | `/api/config/schema` | JSON Schema for config validation | None | `{"$schema": "...", "properties": {...}}` |
| `GET` | `/api/sessions` | List sessions (paginated, filterable) | Query: `limit`, `offset`, `search`, `pinned`, `archived` | `{"sessions": [SessionSummary], "total": int}` |
| `POST` | `/api/sessions` | Create a new session | `{"title": str?, "model": str?, "cwd": str?, "system_prompt": str?}` | `{"session": SessionRecord}` |
| `GET` | `/api/sessions/{session_id}` | Get session details & metadata | None | `{"session": SessionRecord}` |
| `PATCH` | `/api/sessions/{session_id}` | Update session (title, pin, archive) | `{"title": str?, "pinned": bool?, "archived": bool?}` | `{"session": SessionRecord}` |
| `DELETE` | `/api/sessions/{session_id}` | Delete a session and its messages | None | `{"success": true, "session_id": str}` |
| `GET` | `/api/sessions/{session_id}/messages` | Retrieve session transcript messages | Query: `limit`, `offset`, `order`, `include_compacted` | `{"messages": [MessageRecord], "total": int}` |
| `POST` | `/api/sessions/{session_id}/fork` | Fork session from specific message | `{"message_id": int, "title": str?}` | `{"new_session_id": str, "forked_from": str}` |
| `POST` | `/api/sessions/{session_id}/chat` | Send prompt turn (blocking completion) | `{"prompt": str, "attachments": list?}` | `{"response": str, "message_id": int, "tool_calls": list}` |
| `POST` | `/api/sessions/{session_id}/chat/stream`| Send prompt turn (Server-Sent Events) | `{"prompt": str, "attachments": list?}` | `text/event-stream` (token chunks, tool calls, done) |
| `POST` | `/v1/chat/completions` | OpenAI-compatible chat completion | Standard OpenAI ChatCompletionRequest | Standard OpenAI ChatCompletionResponse / Stream |
| `POST` | `/v1/runs` | Start a durable agent run | `{"session_id": str, "prompt": str, "effort": str?}` | `{"run_id": str, "status": "queued"}` |
| `GET` | `/v1/runs/{run_id}` | Get run state and execution telemetry | None | `{"run_id": str, "status": str, "turn_count": int, "usage": dict}` |
| `GET` | `/v1/runs/{run_id}/events` | SSE stream for a specific run | Query: `since_event_id` | `text/event-stream` of RunEvents |
| `POST` | `/v1/runs/{run_id}/approval` | Respond to pending tool approval | `{"prompt_id": str, "approved": bool, "amendments": dict?}` | `{"success": true, "run_id": str}` |
| `POST` | `/v1/runs/{run_id}/clarify` | Respond to agent clarification | `{"prompt_id": str, "selected_options": list, "text": str?}` | `{"success": true, "run_id": str}` |
| `POST` | `/v1/runs/{run_id}/steer` | Steer a running agent mid-turn | `{"instruction": str}` | `{"success": true, "run_id": str}` |
| `POST` | `/v1/runs/{run_id}/stop` | Interrupt / halt a running run | `{"reason": str?}` | `{"success": true, "run_id": str}` |
| `GET` | `/v1/skills` | List all discovered skills | Query: `enabled_only` | `{"skills": [SkillMetadata]}` |
| `POST` | `/api/skills/toggle` | Enable or disable a skill | `{"skill_name": str, "enabled": bool}` | `{"success": true}` |
| `GET` | `/v1/toolsets` | List all registered tools & schemas | None | `{"tools": [ToolDefinition]}` |
| `GET` | `/api/mcp/servers` | List configured MCP servers & status | None | `{"servers": [McpServerStatus]}` |
| `POST` | `/api/mcp/servers` | Add or update an MCP server | `{"name": str, "command": str?, "url": str?, "env": dict?}` | `{"success": true, "server": McpServerStatus}` |
| `DELETE` | `/api/mcp/servers/{name}` | Remove an MCP server | None | `{"success": true}` |
| `GET` | `/api/projects` | List projects & primary directories | None | `{"projects": [ProjectRecord]}` |
| `POST` | `/api/projects` | Create a new workspace project | `{"name": str, "path": str, "description": str?}` | `{"project": ProjectRecord}` |
| `GET` | `/api/memory` | Retrieve long-term recall items | Query: `query`, `limit` | `{"memories": [MemoryItem]}` |
| `POST` | `/api/memory/reset` | Clear or compact memories | `{"scope": "all" \| "session"}` | `{"success": true}` |
| `POST` | `/api/audio/transcribe` | STT speech-to-text transcription | `multipart/form-data` (audio file) | `{"text": str}` |
| `POST` | `/api/audio/speak` | TTS text-to-speech synthesis | `{"text": str, "voice": str?}` | `audio/wav` stream |

---

### 2. WebSocket JSON-RPC 2.0 Gateway (`/ws/gateway`)

**Connection Endpoint:** `ws://127.0.0.1:8000/ws/gateway`  
Standard JSON-RPC 2.0 framing (`{"jsonrpc": "2.0", "id": 1, "method": "...", "params": {...}}`).

#### Client-to-Server Methods:
1. `session.create`: Create a fresh session (`params: {title, cwd, model}`).
2. `session.list`: List recent sessions with unread/active status.
3. `session.activate`: Switch active session on the client.
4. `session.branch`: Branch from a specific turn or create parallel thread.
5. `session.rewind`: Rewind transcript to prior turn.
6. `session.interrupt`: Immediately halt the current model turn.
7. `session.cwd.set`: Update active working directory.
8. `prompt.submit`: Submit prompt turn (`params: {sessionId, prompt, attachments, model, effort}`).
9. `prompt.cancel`: Cancel queued or running prompt.
10. `approval.respond`: Resolve pending approval card (`params: {prompt_id, approved, response}`).
11. `clarify.respond`: Answer clarification question (`params: {prompt_id, answers}`).
12. `tools.list`: Get available tools for session.
13. `mcp.servers.list`: List live MCP server tools and health.
14. `complete.slash`: Autocomplete slash commands (`/goal`, `/compact`, `/plan`).
15. `complete.path`: Autocomplete `@file` directive paths in workspace.
16. `ping`: Keepalive heartbeat.

#### Server-to-Client Notification Events:
1. `stream.token`: Incremental text token chunk (`{sessionId, turnId, token}`).
2. `stream.reasoning`: Incremental reasoning / thinking token chunk (`{sessionId, turnId, token}`).
3. `stream.tool_start`: Tool invocation started (`{sessionId, turnId, toolName, toolCallId, args}`).
4. `stream.tool_output`: Tool output chunk received (`{sessionId, toolCallId, chunk}`).
5. `stream.tool_complete`: Tool finished execution (`{sessionId, toolCallId, exitCode, result, durationMs}`).
6. `approval.request`: Interactive approval required (`{prompt_id, action, command, path, diff, danger_level}`).
7. `clarify.request`: Agent asks clarification question (`{prompt_id, question, options, is_multi}`).
8. `session.updated`: Session title, message count, or usage updated.
9. `message.complete`: Full assistant turn finalized with cost and token accounting.

---

### 3. Interactive PTY Terminal WebSocket (`/ws/terminal`)

**Connection Endpoint:** `ws://127.0.0.1:8000/ws/terminal?sessionId=...&cwd=...`
- Bidirectional binary or JSON stream:
  - Client sends: keystrokes, resize events (`{"type": "resize", "cols": 120, "rows": 40}`).
  - Server sends: raw PTY ANSI stdout/stderr bytes for instant xterm.js rendering.

---

## Folder Structure

```
personal-agent/
├── sirona-core/                     # Backend Python Agent & API Server
│   ├── pyproject.toml
│   ├── sirona/
│   │   ├── __init__.py
│   │   ├── main.py                  # Entrypoint: starts FastAPI + WebSocket Gateway
│   │   ├── config.py                # ~/.sirona/config.yaml parser & settings
│   │   ├── database/                # SQLite WAL storage engine
│   │   │   ├── __init__.py
│   │   │   ├── connection.py        # Connection pool with WAL pragma
│   │   │   ├── migrations.py        # Schema DDL (sessions, messages, projects, memory)
│   │   │   ├── sessions.py          # Session CRUD and query routines
│   │   │   ├── messages.py          # Message persistence & FTS5 search
│   │   │   └── projects.py          # Project and folder workspace bindings
│   │   ├── agent/                   # Agent Core & Turn Execution Engine
│   │   │   ├── __init__.py
│   │   │   ├── runtime.py           # Orchestrator: preflight -> LLM -> tools -> response
│   │   │   ├── turn_context.py      # Turn context, history, token usage tracking
│   │   │   ├── prompt_builder.py    # SOUL.md + System prompt + Dynamic tools assembly
│   │   │   ├── context_compressor.py# Token budgeting & conversation compaction
│   │   │   └── approvals.py         # Approval and clarification gatekeeper
│   │   ├── providers/               # LLM Provider Adapters
│   │   │   ├── __init__.py
│   │   │   ├── base.py              # Provider interface (stream, call, format)
│   │   │   ├── gemini.py            # Google GenAI SDK (Gemini 2.5/Flash Thinking)
│   │   │   ├── anthropic.py         # Anthropic Claude 3.5/3.7 adapter
│   │   │   ├── openai.py            # OpenAI & OpenAI-compatible provider
│   │   │   └── ollama.py            # Local Ollama runner adapter
│   │   ├── tools/                   # Extensible Tool Registry & Implementations
│   │   │   ├── __init__.py
│   │   │   ├── registry.py          # Dynamic tool registration and JSON Schema export
│   │   │   ├── terminal.py          # Shell command execution (sandboxed/local)
│   │   │   ├── filesystem.py        # File read, write, edit (search/replace), search
│   │   │   ├── web.py               # Search & scrape
│   │   │   ├── git.py               # Git status, diff, commit, log
│   │   │   ├── python_repl.py       # Python code runner
│   │   │   └── computer_use.py      # Vision & desktop interaction
│   │   ├── mcp/                     # Model Context Protocol Client
│   │   │   ├── __init__.py
│   │   │   ├── manager.py           # Configures and manages MCP subprocesses
│   │   │   └── client.py            # JSON-RPC bridge to external MCP servers
│   │   ├── skills/                  # Skills Loader & Scaffolder
│   │   │   ├── __init__.py
│   │   │   ├── manager.py           # Discovers and indexes SKILL.md files
│   │   │   └── parser.py            # Parses YAML frontmatter and markdown sections
│   │   ├── terminal/                # Interactive PTY WebSocket Bridge
│   │   │   ├── __init__.py
│   │   │   ├── session.py           # Async PTY session wrapper (pywinpty/pty)
│   │   │   └── manager.py           # PTY connection pool & resize router
│   │   └── api/                     # FastAPI Routes & WebSocket Gateway
│   │       ├── __init__.py
│   │       ├── router.py            # Central router aggregator
│   │       ├── routes/
│   │       │   ├── health.py        # Health & status endpoints
│   │       │   ├── sessions.py      # Session CRUD, fork, branch, messages
│   │       │   ├── runs.py          # Runs, SSE streaming, approvals, steer, stop
│   │       │   ├── chat.py          # Chat completions
│   │       │   ├── models.py        # Model list, options, switcher
│   │       │   ├── tools.py         # Tools list, permissions
│   │       │   ├── skills.py        # Skills list, toggle
│   │       │   ├── mcp.py           # MCP server configs and status
│   │       │   ├── config.py        # Config read/write, env, system
│   │       │   ├── audio.py         # TTS / STT audio endpoints
│   │       │   ├── projects.py      # Project folders and workspace
│   │       │   └── terminal.py      # Interactive PTY WebSocket handler
│   │       └── websocket/
│   │           ├── gateway.py       # Gateway WS listener (`/ws/gateway`)
│   │           ├── dispatcher.py    # JSON-RPC 2.0 method dispatcher
│   │           └── events.py        # Server broadcast event emitter
│   └── tests/                       # Pytest unit & integration tests
│
├── sirona-ui/                       # Frontend Web / Desktop App
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   ├── src/
│   │   ├── styles/
│   │   │   ├── tokens.css           # --ui-stroke-*, --shadow-nous, --z-* hierarchy
│   │   │   └── globals.css
│   │   ├── api/                     # API & Gateway Client
│   │   │   ├── client.ts            # Fetch wrapper with typed errors
│   │   │   ├── gateway.ts           # JSON-RPC Gateway client with auto-reconnect
│   │   │   ├── sessions.ts
│   │   │   ├── runs.ts
│   │   │   ├── config.ts
│   │   │   └── terminal.ts
│   │   ├── store/                   # Nanostores state management
│   │   │   ├── sessionStore.ts
│   │   │   ├── messageStore.ts
│   │   │   ├── approvalStore.ts
│   │   │   ├── layoutStore.ts
│   │   │   └── terminalStore.ts
│   │   ├── hooks/                   # Custom React hooks
│   │   │   ├── useSession.ts
│   │   │   ├── useStreamingChat.ts
│   │   │   ├── useTerminal.ts
│   │   │   └── useKeyboardShortcuts.ts
│   │   ├── components/
│   │   │   ├── layout/              # 3-Pane Responsive Layout Shell
│   │   │   │   ├── TitlebarChrome.tsx
│   │   │   │   ├── WorkspaceRail.tsx (48px fixed)
│   │   │   │   ├── SessionsRail.tsx  (237px default)
│   │   │   │   ├── MainCanvas.tsx    (Dominant center)
│   │   │   │   ├── ContextPane.tsx   (Right collapsible: Files / Diff / Review)
│   │   │   │   └── StatusBar.tsx
│   │   │   ├── chat/                # Conversation & Transcript
│   │   │   │   ├── TranscriptCanvas.tsx
│   │   │   │   ├── UserMessageBubble.tsx
│   │   │   │   ├── AssistantMessage.tsx
│   │   │   │   ├── MarkdownRenderer.tsx
│   │   │   │   ├── ToolExecutionCard.tsx
│   │   │   │   ├── RunTicker.tsx
│   │   │   │   └── DiffViewer.tsx
│   │   │   ├── composer/            # Composer Suite
│   │   │   │   ├── Composer.tsx
│   │   │   │   ├── StatusDrawer.tsx (Todos, queue, effort)
│   │   │   │   ├── DirectiveChips.tsx (@file, /slash, !shell)
│   │   │   │   ├── ModelPickerPopover.tsx
│   │   │   │   └── ReasoningEffortPill.tsx
│   │   │   ├── approvals/           # Interactive Approval Overlays
│   │   │   │   ├── CardStack.tsx
│   │   │   │   ├── ApprovalCard.tsx
│   │   │   │   └── ClarifyDialog.tsx
│   │   │   ├── context/             # Right Pane Views
│   │   │   │   ├── FileTreeExplorer.tsx
│   │   │   │   ├── DiffReviewView.tsx
│   │   │   │   └── TerminalDeck.tsx
│   │   │   └── ui/                  # Design primitives
│   │   │       ├── Button.tsx
│   │   │       ├── SearchField.tsx
│   │   │       ├── Loader.tsx
│   │   │       ├── Tip.tsx
│   │   │       └── Dialog.tsx
│   └── tests/                       # Vitest component & store tests
```

---

## Step-by-Step Implementation Tasks

### Task 1: Backend Foundation & Database Layer (`sirona-core/database`)
**Files:**
- Create: `sirona-core/pyproject.toml`
- Create: `sirona-core/sirona/config.py`
- Create: `sirona-core/sirona/database/connection.py`
- Create: `sirona-core/sirona/database/migrations.py`
- Create: `sirona-core/sirona/database/sessions.py`
- Create: `sirona-core/sirona/database/messages.py`
- Create: `sirona-core/sirona/database/projects.py`
- Test: `sirona-core/tests/test_database.py`

- [x] Write failing test in `tests/test_database.py` asserting schema initialization, WAL mode verification, session creation, message storage, FTS5 message search, and project folder associations.
- [x] Implement `connection.py` with async connection management and SQLite WAL pragmas (`PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL;`).
- [x] Implement `migrations.py` defining tables: `sessions`, `messages`, `messages_fts` (FTS5 full text search), `projects`, `project_folders`, `session_turn_leases`, and `memories`.
- [x] Implement `sessions.py`, `messages.py`, and `projects.py` with async CRUD operations, pagination, search, and fork/branch support.
- [x] Run `pytest tests/test_database.py` and verify all tests pass.

---

### Task 2: Tool Registry & Core System Tools (`sirona-core/tools`)
**Files:**
- Create: `sirona-core/sirona/tools/registry.py`
- Create: `sirona-core/sirona/tools/terminal.py`
- Create: `sirona-core/sirona/tools/filesystem.py`
- Create: `sirona-core/sirona/tools/web.py`
- Create: `sirona-core/sirona/tools/git.py`
- Create: `sirona-core/sirona/tools/python_repl.py`
- Test: `sirona-core/tests/test_tools.py`

- [x] Write failing test in `tests/test_tools.py` testing registration, schema export, safe command execution, file read/write/edit with exact match replacement, and git status parsing.
- [x] Implement `registry.py`: `@tool` decorator, parameter introspection, JSON Schema generation, and danger level classification (`safe`, `requires_approval`, `forbidden`).
- [x] Implement `terminal.py`: async subprocess runner with configurable timeout, stdout/stderr streaming chunks, and return code capture.
- [x] Implement `filesystem.py`: `read_file`, `write_file`, `edit_file` (with single contiguous target matching), `list_dir`, `file_search`, and diff generator.
- [x] Implement `web.py`: search and scraping tools with markdown extraction.
- [x] Implement `git.py`: diff inspection, commit history, and staging helpers.
- [x] Run `pytest tests/test_tools.py` and verify all tests pass.

---

### Task 3: Provider Abstraction & Model Routing (`sirona-core/providers`)
**Files:**
- Create: `sirona-core/sirona/providers/base.py`
- Create: `sirona-core/sirona/providers/gemini.py`
- Create: `sirona-core/sirona/providers/anthropic.py`
- Create: `sirona-core/sirona/providers/openai.py`
- Create: `sirona-core/sirona/providers/ollama.py`
- Test: `sirona-core/tests/test_providers.py`

- [x] Write failing test in `tests/test_providers.py` mocking model streaming responses, tool calling message parsing, reasoning tokens extraction, and error handling.
- [x] Implement `base.py`: unified `LLMProvider` interface defining `stream_chat(messages, tools, options) -> AsyncIterator[StreamChunk]`.
- [x] Implement `gemini.py`: official Google GenAI integration supporting Gemini 2.5 Pro, Flash, and Flash Thinking with reasoning chunk emission.
- [x] Implement `anthropic.py` and `openai.py`: streaming completions with tool calls and token counting.
- [x] Implement `ollama.py`: local inference adapter with streaming support.
- [x] Run `pytest tests/test_providers.py` and verify all tests pass.

---

### Task 4: Agent Turn Execution & Approval Gatekeeper (`sirona-core/agent`)
**Files:**
- Create: `sirona-core/sirona/agent/turn_context.py`
- Create: `sirona-core/sirona/agent/prompt_builder.py`
- Create: `sirona-core/sirona/agent/approvals.py`
- Create: `sirona-core/sirona/agent/context_compressor.py`
- Create: `sirona-core/sirona/agent/runtime.py`
- Test: `sirona-core/tests/test_agent_runtime.py`

- [x] Write failing test in `tests/test_agent_runtime.py` covering turn execution loop: user prompt -> provider streaming -> tool invocation -> approval suspension -> approval resume -> final response.
- [x] Implement `approvals.py`: manages pending approval states (`prompt_id`, action payload, danger level), exposes `wait_for_approval` and `resolve_approval`.
- [x] Implement `prompt_builder.py`: loads Sirona `SOUL.md`, injects session context, active project files, and dynamic tool definitions.
- [x] Implement `context_compressor.py`: detects token budget thresholds, executes sliding window truncation and recursive compaction.
- [x] Implement `runtime.py`: coordinates the full execution turn with multi-step tool calls, error recovery, and persistence.
- [x] Run `pytest tests/test_agent_runtime.py` and verify all tests pass.

---

### Task 5: MCP Host & Skills Manager (`sirona-core/mcp`, `sirona-core/skills`)
**Files:**
- Create: `sirona-core/sirona/mcp/manager.py`
- Create: `sirona-core/sirona/mcp/client.py`
- Create: `sirona-core/sirona/skills/parser.py`
- Create: `sirona-core/sirona/skills/manager.py`
- Test: `sirona-core/tests/test_mcp_skills.py`

- [x] Write failing test in `tests/test_mcp_skills.py` validating SKILL.md parsing, dynamic skill discovery, and MCP server JSON-RPC tool extraction.
- [x] Implement `parser.py`: parses YAML frontmatter (`name`, `description`) and markdown body of `SKILL.md` files.
- [x] Implement `skills/manager.py`: scans workspace and global skills folders (`~/.sirona/skills`), manages active toggles.
- [x] Implement `mcp/manager.py` & `client.py`: launches external MCP servers via stdio / SSE and binds their tools into the Sirona Tool Registry.
- [x] Run `pytest tests/test_mcp_skills.py` and verify all tests pass.

---

### Task 6: Interactive PTY Terminal Bridge (`sirona-core/terminal`)
**Files:**
- Create: `sirona-core/sirona/terminal/session.py`
- Create: `sirona-core/sirona/terminal/manager.py`
- Test: `sirona-core/tests/test_terminal.py`

- [x] Write failing test in `tests/test_terminal.py` testing PTY process spawning, input writing, output stream reading, and resize events.
- [x] Implement `session.py`: platform-aware PTY abstraction (using `winpty` on Windows and `ptyprocess` on POSIX) with async IO queues.
- [x] Implement `manager.py`: manages active terminal sessions by ID, routes resize and kill signals.
- [x] Run `pytest tests/test_terminal.py` and verify all tests pass.

---

### Task 7: FastAPI Server, REST Routes & WebSocket Gateway (`sirona-core/api`)
**Files:**
- Create: `sirona-core/sirona/api/router.py`
- Create: `sirona-core/sirona/api/routes/*.py` (all 12 REST modules)
- Create: `sirona-core/sirona/api/websocket/gateway.py`
- Create: `sirona-core/sirona/api/websocket/dispatcher.py`
- Create: `sirona-core/sirona/api/websocket/events.py`
- Create: `sirona-core/sirona/main.py`
- Test: `sirona-core/tests/test_api_server.py`

- [x] Write failing test in `tests/test_api_server.py` asserting all REST endpoints (`/health`, `/api/sessions`, `/v1/runs`, `/api/config`) and WebSocket JSON-RPC calls.
- [x] Implement all REST route handlers with Pydantic request/response validation.
- [x] Implement WebSocket gateway `/ws/gateway` with JSON-RPC 2.0 protocol dispatching and event broadcasting.
- [x] Implement PTY WebSocket endpoint `/ws/terminal`.
- [x] Wire application in `main.py` with CORS, security headers, and graceful shutdown.
- [x] Run `pytest tests/test_api_server.py` and verify all routes return 200 OK with correct schema.

---

### Task 8: Frontend Shell & Design System Tokens (`sirona-ui/src/styles`, `sirona-ui/src/components/ui`)
**Files:**
- Create: `sirona-ui/package.json`
- Create: `sirona-ui/vite.config.ts`
- Create: `sirona-ui/src/styles/tokens.css`
- Create: `sirona-ui/src/styles/globals.css`
- Create: `sirona-ui/src/components/ui/Button.tsx`
- Create: `sirona-ui/src/components/ui/SearchField.tsx`
- Create: `sirona-ui/src/components/ui/Loader.tsx`
- Create: `sirona-ui/src/components/ui/Tip.tsx`
- Create: `sirona-ui/src/components/ui/Dialog.tsx`
- Test: `sirona-ui/src/components/ui/ui.test.tsx`

- [x] Write test verifying token variables and rendering of core primitives without CSS literal violations.
- [x] Implement `tokens.css`: define `--ui-stroke-*`, `--shadow-nous`, `--stroke-nous`, and the exact `--z-*` scale (`120` to `320`).
- [x] Implement canonical primitives (`Button`, `SearchField`, `Loader`, `Tip` with warm-up delay, `Dialog`).
- [x] Run `npm test` and verify component tests pass.

---

### Task 9: 3-Pane Spatial Grid & Responsive Chrome (`sirona-ui/src/components/layout`)
**Files:**
- Create: `sirona-ui/src/store/layoutStore.ts`
- Create: `sirona-ui/src/components/layout/TitlebarChrome.tsx`
- Create: `sirona-ui/src/components/layout/WorkspaceRail.tsx`
- Create: `sirona-ui/src/components/layout/SessionsRail.tsx`
- Create: `sirona-ui/src/components/layout/MainCanvas.tsx`
- Create: `sirona-ui/src/components/layout/ContextPane.tsx`
- Create: `sirona-ui/src/components/layout/StatusBar.tsx`
- Test: `sirona-ui/src/components/layout/layout.test.tsx`

- [x] Write tests verifying sidebar docking at 640px breakpoint, panel collapse toggles, and layout preset switching (default, basic, focus, terminal-deck).
- [x] Implement `layoutStore.ts` with panel widths, active decks, and dock states.
- [x] Implement `TitlebarChrome.tsx` with OS control spacing, Cmd+K search trigger, and layout deck switches.
- [x] Implement `WorkspaceRail.tsx` (48px fixed) with squircle profile icons and fleet dot.
- [x] Implement `SessionsRail.tsx` (237px default) with virtualized infinite scroll, search, and session status dots.
- [x] Implement `ContextPane.tsx` (collapsible right rail) and `StatusBar.tsx`.
- [x] Run `npm test` and verify layout transitions.

---

### Task 10: Streaming Chat Transcript & Tool Execution (`sirona-ui/src/components/chat`)
**Files:**
- Create: `sirona-ui/src/store/messageStore.ts`
- Create: `sirona-ui/src/components/chat/TranscriptCanvas.tsx`
- Create: `sirona-ui/src/components/chat/UserMessageBubble.tsx`
- Create: `sirona-ui/src/components/chat/AssistantMessage.tsx`
- Create: `sirona-ui/src/components/chat/MarkdownRenderer.tsx`
- Create: `sirona-ui/src/components/chat/ToolExecutionCard.tsx`
- Create: `sirona-ui/src/components/chat/RunTicker.tsx`
- Create: `sirona-ui/src/components/chat/DiffViewer.tsx`
- Test: `sirona-ui/src/components/chat/chat.test.tsx`

- [x] Write tests for token chunk appending, code syntax highlighting with Shiki, tool progress ticker, and diff rendering.
- [x] Implement `TranscriptCanvas.tsx` with virtual scrolling and auto-scroll to bottom.
- [x] Implement `UserMessageBubble.tsx` with glass effect and inline edit support.
- [x] Implement `AssistantMessage.tsx` rendering markdown prose, reasoning block accordions, and inline code blocks with copy/run actions.
- [x] Implement `ToolExecutionCard.tsx` with live `RunTicker.tsx` and hover-reveal details.
- [x] Implement `DiffViewer.tsx` for green/red line diff inspection.
- [x] Run `npm test` and verify transcript rendering.

---

### Task 11: Composer Suite & Directive Engine (`sirona-ui/src/components/composer`)
**Files:**
- Create: `sirona-ui/src/components/composer/StatusDrawer.tsx`
- Create: `sirona-ui/src/components/composer/DirectiveChips.tsx`
- Create: `sirona-ui/src/components/composer/ModelPickerPopover.tsx`
- Create: `sirona-ui/src/components/composer/ReasoningEffortPill.tsx`
- Create: `sirona-ui/src/components/composer/Composer.tsx`
- Test: `sirona-ui/src/components/composer/composer.test.tsx`

- [x] Write tests for `@file` autocomplete chip insertion, `/slash` command palette, auto-expanding textarea, and model switching.
- [x] Implement `StatusDrawer.tsx` for todos, turn effort, and queue counter with collapsible grip.
- [x] Implement `DirectiveChips.tsx` with instant removal and popover details.
- [x] Implement `ModelPickerPopover.tsx` and `ReasoningEffortPill.tsx` (low / med / high).
- [x] Implement `Composer.tsx` textarea with keyboard shortcuts (Enter to send, Shift+Enter for newline, @ and / triggers).
- [x] Run `npm test` and verify composer interactions.

---

### Task 12: CardStack Interactive Approval Overlay (`sirona-ui/src/components/approvals`)
**Files:**
- Create: `sirona-ui/src/store/approvalStore.ts`
- Create: `sirona-ui/src/components/approvals/CardStack.tsx`
- Create: `sirona-ui/src/components/approvals/ApprovalCard.tsx`
- Create: `sirona-ui/src/components/approvals/ClarifyDialog.tsx`
- Test: `sirona-ui/src/components/approvals/approvals.test.tsx`

- [x] Write tests for card stacking animation (96% scale silhouette 7px above), promotion on dismissal, Enter to approve, Esc to deny.
- [x] Implement `approvalStore.ts` tracking pending approval and clarification queues.
- [x] Implement `ApprovalCard.tsx` displaying command, diff, risk level, and action buttons.
- [x] Implement `CardStack.tsx` with smooth 220ms promotion and 180ms dismissal animations.
- [x] Implement `ClarifyDialog.tsx` for interactive option selection.
- [x] Run `npm test` and verify keyboard dismissing and state transitions.

---

### Task 13: Right Context Tooling: File Tree, Review & Terminal Deck (`sirona-ui/src/components/context`)
**Files:**
- Create: `sirona-ui/src/components/context/FileTreeExplorer.tsx`
- Create: `sirona-ui/src/components/context/DiffReviewView.tsx`
- Create: `sirona-ui/src/components/context/TerminalDeck.tsx`
- Create: `sirona-ui/src/api/terminal.ts`
- Test: `sirona-ui/src/components/context/context.test.tsx`

- [x] Write tests for file tree node expansion, diff staging toggle, and terminal WebSocket connect/resize.
- [x] Implement `FileTreeExplorer.tsx` with compact file tree and git modification badges.
- [x] Implement `DiffReviewView.tsx` for split/unified diff reviews before approval.
- [x] Implement `TerminalDeck.tsx` wrapping `xterm.js` connected to `/ws/terminal`.
- [x] Run `npm test` and verify context views.

---

### Task 14: End-to-End Integration, Verification & Sirona CLI (`sirona-core/sirona/main.py`)
**Files:**
- Modify: `sirona-core/sirona/main.py`
- Create: `sirona-core/sirona/cli.py`
- Create: `sirona-core/tests/test_e2e.py`

- [x] Write end-to-end integration test: start server, create session, send prompt, simulate streaming response and tool call with approval, verify final state.
- [x] Implement `sirona` CLI entry point (`sirona run`, `sirona serve`, `sirona config`, `sirona doctor`).
- [x] Run complete test suites (`pytest` across `sirona-core/tests`, `npm test` across `sirona-ui`).
- [x] Verify zero regressions, verify complete branding as `Sirona`, verify no external bot dependencies exist.
