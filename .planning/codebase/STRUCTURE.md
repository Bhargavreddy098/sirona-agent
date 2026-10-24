# Codebase Structure

**Analysis Date:** 2026-10-24

## Directory Layout

```
personal -agent/
├── .planning/                  # GSD planning directory (configs, codebase maps, roadmaps, states)
│   ├── codebase/               # 7 canonical architectural and tech mapping documents
│   └── config.json             # GSD workflow and runtime settings
├── docs/                       # Project specifications, reverse engineering, and audits
├── sirona-core/                # Python FastAPI backend & autonomous agent engine
│   ├── sirona/                 # Core Python application package
│   │   ├── agent/              # Runtime execution loop, turn leases, scheduling, context
│   │   ├── api/                # FastAPI application, REST endpoints, WebSocket dispatcher
│   │   ├── database/           # SQLite schema, aiosqlite connection pool, migrations
│   │   ├── mcp/                # Model Context Protocol client & server integrations
│   │   ├── providers/          # LLM provider implementations (Anthropic, Gemini, OpenAI, Ollama)
│   │   ├── skills/             # Custom agent capabilities & dynamic skills loader
│   │   ├── terminal/           # PTY and shell process management
│   │   └── tools/              # Core tool definitions (file editing, bash, search, memory)
│   ├── tests/                  # Pytest async test suite (unit, integration, regression)
│   └── pyproject.toml          # Python dependencies, Hatchling configuration
├── sirona-shared/              # Shared TypeScript contracts, schemas, and event types
│   ├── src/                    # TypeScript interfaces mirroring backend models
│   └── package.json            # Shared package definition
├── sirona-ui/                  # Electron + React 19 desktop frontend studio
│   ├── electron/               # Electron main process and secure contextBridge preload
│   │   ├── main.cjs            # Window management, IPC handlers, app lifecycle
│   │   └── preload.cjs         # Context bridge exposing window.sironaDesktop
│   ├── public/                 # Static assets, icons, fonts
│   ├── release/                # Packaged desktop executables (win-unpacked/Sirona.exe)
│   ├── src/                    # React 19 application source
│   │   ├── api/                # WebSocket client, HTTP fetchers, RPC wrappers
│   │   ├── components/         # Modular UI component hierarchy
│   │   │   ├── approvals/      # Tool execution permission modals
│   │   │   ├── chat/           # Message stream, reasoning blocks, tool cards
│   │   │   ├── clarify/        # User clarification input prompts
│   │   │   ├── composer/       # Input textarea, model selector, token counters
│   │   │   ├── context/        # File tree, workspace inspector, token usage
│   │   │   ├── layout/         # App shell, split panes, titlebar, sidebar, status bar
│   │   │   ├── modals/         # Command palette (⌘K), session settings, shortcuts
│   │   │   ├── settings/       # Provider keys, appearance, system preferences
│   │   │   ├── telemetry/      # Execution stats and latency diagnostics
│   │   │   └── ui/             # Reusable design primitives (Button, Card, Input, Tooltip)
│   │   ├── store/              # Nanostores & React hooks (sessions, turns, commands, ui)
│   │   ├── styles/             # Tailwind CSS 4 style entry points
│   │   ├── test/               # Vitest component test suites
│   │   └── types/              # Frontend-specific type augmentations
│   ├── package.json            # Frontend dependencies and dev scripts
│   └── vite.config.ts          # Vite build and plugin configuration
├── GEMINI.md                   # Living project context & agent guidance rules
├── start.bat                   # Windows batch quick-launch script
└── start.ps1                   # PowerShell interactive launcher
```

## Directory Purposes

**`sirona-core/`:**
- Purpose: Hosts the async agent runtime, tool execution engine, database persistence, and API gateway.
- Contains: Python modules, async route handlers, test suites, and database migration scripts.
- Key files:
  - `sirona/agent/runtime.py`: Core execution loop and turn state machine.
  - `sirona/agent/turn_lease.py`: Concurrency control and generation-based turn locking.
  - `sirona/api/websocket/dispatcher.py`: Bidirectional JSON-RPC WebSocket dispatcher.
  - `sirona/database/schema.py`: SQLite DDL with WAL mode and FTS5 virtual tables.

**`sirona-ui/`:**
- Purpose: Provides the Electron desktop application and React 19 studio interface.
- Contains: TSX components, Nanostores state management, Tailwind CSS styles, Vitest tests.
- Key files:
  - `electron/main.cjs`: Window creation and lifecycle control.
  - `electron/preload.cjs`: Secure context bridge.
  - `src/App.tsx`: Root desktop layout and provider wiring.
  - `src/store/commandStore.ts`: Command palette (`⌘K`) and FTS message search integration.
  - `src/store/sessionStore.ts`: Reactive session and thread state.

**`sirona-shared/`:**
- Purpose: Defines cross-boundary data contracts shared between UI and Core.
- Contains: TypeScript type definitions for events, requests, responses, and models.

## Key File Locations

**Entry Points:**
- `sirona-ui/electron/main.cjs`: Desktop window startup.
- `sirona-core/sirona/cli.py`: Backend daemon CLI startup (`python -m sirona.cli serve`).
- `sirona-ui/src/main.tsx`: React DOM client mount.

**Configuration:**
- `sirona-core/sirona/config.py`: Environment variables and Pydantic application settings.
- `sirona-ui/vite.config.ts`: Frontend bundler configuration.
- `sirona-ui/electron-builder.json`: Desktop release packaging rules.

**Persistence:**
- `sirona-core/sirona/database/`: SQLite database initialization and query helpers.

**Testing:**
- `sirona-core/tests/`: Pytest async test files.
- `sirona-ui/src/test/` or `sirona-ui/src/**/*.test.tsx`: Vitest component tests.

---
*Structure analysis: 2026-10-24*
*Update after directory reorganizations*
