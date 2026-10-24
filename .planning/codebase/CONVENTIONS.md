# Coding Conventions

**Analysis Date:** 2026-10-24

## Naming Patterns

### Python (`sirona-core`)

**Modules & Files:**
- `snake_case.py` for all modules and packages (e.g., `turn_lease.py`, `runtime.py`, `dispatcher.py`).
- Test files prefixed with `test_` (e.g., `test_turn_lease.py`, `test_message_adoption.py`).

**Classes & Types:**
- `PascalCase` for classes, models, and exceptions (e.g., `SessionTurnLeaseRegistry`, `TurnLeaseToken`, `AgentRuntime`).
- Pydantic models inherit from `pydantic.BaseModel`.
- Exceptions end with `Error` or `Exception` (e.g., `TurnLeaseTimeoutError`).

**Functions & Methods:**
- `snake_case` for all functions and methods (e.g., `run_turn`, `acquire_lease`, `adopt_submit_user_row`).
- Private methods prefixed with single underscore `_` (e.g., `_execute_tool_call`).

**Variables & Constants:**
- `snake_case` for local variables and attributes.
- `UPPER_SNAKE_CASE` for module-level constants and default configuration values.

### TypeScript & React (`sirona-ui`, `sirona-shared`)

**Files & Directories:**
- `PascalCase.tsx` for React component files (e.g., `Sidebar.tsx`, `ChatArea.tsx`, `CommandPalette.tsx`).
- `camelCase.ts` for utilities, stores, and hooks (e.g., `sessionStore.ts`, `commandStore.ts`, `useWebSocket.ts`).
- `kebab-case.ts` for schemas or contract declarations in `sirona-shared`.
- Test files suffixed with `.test.ts` or `.test.tsx` (e.g., `Sidebar.test.tsx`).

**Components & Hooks:**
- `PascalCase` for component functions.
- `use` prefix for custom React hooks (`useTurnLease`, `useSessionMessages`).

**Variables & Types:**
- `camelCase` for variables, properties, and function names.
- `PascalCase` for interfaces and type aliases (no `I` prefix, e.g., `Session`, `TurnLeaseToken`).
- `UPPER_SNAKE_CASE` for static constants.

## Code Style & Formatting

**Python:**
- Python 3.11+ type annotations required on all function arguments and return types.
- Format with standard 4-space indentation.
- Explicit async/await for all network and database operations (no blocking sync calls in async loops).
- Context managers (`async with`) for database connections, transactions, and lease acquisition.

**TypeScript / React:**
- Strict TypeScript (`"strict": true` in `tsconfig.json`). No untyped `any` without explicit justification.
- Tailwind CSS 4 utility classes arranged using the `cn()` utility (`clsx` + `tailwind-merge`).
- Nanostores (`atom`, `map`) for atomic high-frequency state updates outside the React render cycle.
- Clean separation between presentation components and business logic stores.

## Import Organization

**Python:**
1. Standard library imports (`asyncio`, `typing`, `dataclasses`, `time`, `uuid`)
2. Third-party packages (`fastapi`, `pydantic`, `aiosqlite`, `pytest`)
3. Internal application modules (`sirona.agent.*`, `sirona.storage.*`, `sirona.api.*`)

**TypeScript:**
1. React and third-party libraries (`react`, `nanostores`, `lucide-react`)
2. Shared contracts (`@sirona/shared`)
3. Internal components, stores, and utilities (`@/components`, `@/store`, `@/api`)
4. Stylesheets and asset imports

## Error Handling & Resiliency Patterns

- **No Silent Failures**: All caught exceptions must be logged or surfaced to the caller with structured error payloads.
- **Lease Safety**: Long-running operations must wrap turn leases in `try ... finally` blocks to ensure lease release upon unexpected errors.
- **Defensive Parsing**: Use Pydantic `model_validate()` and TypeScript guards before consuming dynamic WebSocket payloads.

---
*Conventions analysis: 2026-10-24*
*Update after style consensus changes*
