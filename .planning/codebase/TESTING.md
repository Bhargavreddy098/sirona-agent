# Testing Patterns

**Analysis Date:** 2026-10-24

## Test Frameworks

### Backend (`sirona-core`)

**Runner & Plugins:**
- Pytest 8.3+ with `pytest-asyncio` 0.25+
- Configuration in `sirona-core/pyproject.toml` (`[tool.pytest.ini_options]` with `asyncio_mode = "auto"`)

**Execution Commands:**
```bash
# Run entire backend test suite
cd sirona-core
pytest

# Run a specific test module
pytest tests/agent/test_turn_lease.py

# Run with verbose output and print statements
pytest -sv

# Run tests matching a specific pattern
pytest -k "test_message_adoption"
```

### Frontend (`sirona-ui`)

**Runner & Environment:**
- Vitest 3.0+ with `@testing-library/react`
- Fast in-memory JSDOM execution

**Execution Commands:**
```bash
# Run entire frontend test suite
cd sirona-ui
npm test

# Run Vitest in watch mode for active TDD
npx vitest

# Run a specific component test file
npx vitest run src/components/layout/Sidebar.test.tsx
```

## Current Test Metrics

- **Backend Pytest Suite:** 63 passing tests (unit, runtime scheduling, lease safety, storage migrations, API WebSocket dispatcher)
- **Frontend Vitest Suite:** 86 passing tests (store reactivity, command palette search, approvals modal, split views, layout components)
- **Total Verification Baseline:** 149 / 149 passing green tests

## Test File Organization

**Backend:**
```
sirona-core/tests/
├── agent/
│   ├── test_runtime.py          # Turn runner execution loops
│   ├── test_turn_lease.py       # Monotonic generation numbers, lease timeouts, single-writer lock
│   └── test_message_adoption.py # Pre-flight message durability & crash recovery
├── api/
│   ├── test_routes.py           # REST endpoints
│   └── test_websocket.py        # WebSocket RPC dispatcher and event streams
└── storage/
    └── test_database.py         # SQLite schema initialization, WAL mode, FTS5 queries
```

**Frontend:**
```
sirona-ui/src/
├── components/
│   ├── approvals/Approvals.test.tsx
│   ├── chat/ChatArea.test.tsx
│   ├── composer/Composer.test.tsx
│   ├── layout/Sidebar.test.tsx
│   └── modals/CommandPalette.test.tsx
└── store/
    ├── commandStore.test.ts
    └── sessionStore.test.ts
```

## Mocking & Isolation Patterns

- **AI Providers**: LLM provider streaming responses are mocked using deterministic async generator fixtures yielding `StreamChunk(type="text", content=...)` or `StreamChunk(type="reasoning", ...)`.
- **Database**: Backend tests use isolated temporary SQLite databases (`:memory:` or temporary disk files in `.pytest_cache`) with full schema creation and automatic cleanup fixtures.
- **WebSocket Gateway**: Frontend tests mock WebSocket transport using lightweight test-doubles, verifying Nanostores signal changes and DOM rendering without requiring a running backend process.

## Continuous Verification Standard

Before claiming any stage or phase complete:
1. All 63 Pytest tests must pass without warnings or regressions.
2. All 86 Vitest tests must pass cleanly.
3. Total green test count must strictly increase or remain equal (zero tolerance for deleted or skipped tests).

---
*Testing analysis: 2026-10-24*
*Update after test suite expansions*
