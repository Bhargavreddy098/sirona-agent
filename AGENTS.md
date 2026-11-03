# Sirona — Root AGENTS.md

Welcome to Sirona. This document is the authoritative instruction entry point for all coding assistants working on the repository. It defines our architecture, navigation rules, operating discipline, and definition of done.

---

## 1. Project Identity & Architecture

Sirona is a **local-first Windows AI coding and agent workspace**. Code lives on the developer's local machine, and agent operations are restricted to an explicitly authorized workspace root.

### Monorepo Layout (`pnpm-workspace.yaml`)
- `apps/server`: Node.js / Express backend (`app.js`, `server.js`, `services/`, `routes/v1/`). Exposes canonical `/api/v1` routes and the ReAct execution engine.
- `apps/desktop`: Electron application (`src/main.cjs`, `preload.cjs`, `security/credentialBroker.ts`). Provides native OS boundaries, folder selection dialogs, and DPAPI-encrypted credential storage.
- `apps/web`: Vite + React 19 + TypeScript frontend (`src/app.tsx`, `src/components/`, `src/api/`). Provides the interactive chat canvas, model picker, settings, and file explorer.
- `apps/cli`: Command line tools and diagnostic utilities (`src/cli.ts`).
- `packages/contracts`: Canonical shared TypeScript wire contracts and DTO types (`src/api.ts`, `src/models.ts`, `src/execution.ts`).
- `packages/ai`: Multi-protocol AI engine and model routing.
- `packages/schema`: Effect/Zod-based domain schemas.
- `packages/client`: Typed client for SDK and frontend integration.

---

## 2. Mandatory Navigation & Documentation Routing

Do not guess architecture or improvise parallel systems. Follow this exact reading order:

1. **Root Instructions (This File)**: Global rules, safety constraints, and mandatory workflows.
2. **Owning Module Instructions**: Before touching code in any package, read its scoped instructions:
   - Backend: [`apps/server/AGENTS.md`](apps/server/AGENTS.md)
   - Desktop Shell: [`apps/desktop/AGENTS.md`](apps/desktop/AGENTS.md)
   - Frontend UI: [`apps/web/AGENTS.md`](apps/web/AGENTS.md)
   - Shared Contracts: [`packages/contracts/AGENTS.md`](packages/contracts/AGENTS.md)
   - AI Engine: [`packages/ai/AGENTS.md`](packages/ai/AGENTS.md)
   - Domain Schema: [`packages/schema/AGENTS.md`](packages/schema/AGENTS.md)
3. **Canonical Documentation Index**: Consult [`docs/INDEX.md`](docs/INDEX.md) or run `node scripts/docs.js search <topic>` to find technical subsystem specifications:
   - Model Gateway & Providers: [`docs/subsystems/model-gateway.md`](docs/subsystems/model-gateway.md)
   - Agent ReAct Loop: [`docs/subsystems/agent-runtime.md`](docs/subsystems/agent-runtime.md) & [`docs/concepts/agent-loop.md`](docs/concepts/agent-loop.md)
   - Tool Execution & Sandbox: [`docs/subsystems/tool-execution.md`](docs/subsystems/tool-execution.md)
   - Workspace Filesystem: [`docs/subsystems/workspace-filesystem.md`](docs/subsystems/workspace-filesystem.md)
   - Approvals & Governance: [`docs/subsystems/approvals-and-governance.md`](docs/subsystems/approvals-and-governance.md)
   - Sessions & Persistence: [`docs/subsystems/sessions-and-persistence.md`](docs/subsystems/sessions-and-persistence.md)
   - Master Plan & P0–P8 Roadmap: [`docs/SIRONA-WORKSPACE-PLAN.md`](docs/SIRONA-WORKSPACE-PLAN.md)

---

## 3. Mandatory Feature Implementation Lifecycle

Every requested feature must be implemented as a **complete vertical slice**:

```
User Request
  │
  ├─► 1. Inspect: Read root AGENTS.md, scoped AGENTS.md, and relevant subsystem doc in docs/
  ├─► 2. Audit: Inspect existing code, route mounts, service classes, and callers (no duplicate routes)
  ├─► 3. Contract First: Define/update shared DTOs in packages/contracts/
  ├─► 4. Implement Backend: Add service logic, database queries, and register thin Express routes
  ├─► 5. Implement Frontend: Update typed client (sironaClient.ts), hooks, and wire real React UI
  ├─► 6. Verify: Run focused tests and verify real UI-to-backend flow (never claim simulated passes)
  └─► 7. Sync Docs: Update affected subsystem guide or provider document in docs/
```

### Vertical Slice Invariants
- **Never claim completion** because a file was written, types compiled, or mock tests passed. A user-facing feature is complete only when the user can trigger it in the UI, reach the registered backend route, and observe the canonical result.
- **Never create fake data**: Production pathways must never use fake lists, hardcoded mocks, or simulated LLM responses. If an upstream dependency is offline, return explicit errors.

---

## 4. Engineering & Safety Constraints

1. **Source Code Integrity**: Always edit editable source files (`apps/server/src/`, `apps/server/services/`). Never edit build output folders like `dist-workspace/`.
2. **Database Neutrality**: Sirona supports both PostgreSQL and SQLite (`config/db.js`). All SQL queries must use parameterized syntax (`$1, $2`) supported by both drivers. Never drop tables or run unapproved destructive migrations.
3. **Execution Containment**:
   - Filesystem operations must be strictly contained within `workspaceRoot` using `workspacePathResolver.js`. Path traversals (`..`) are denied.
   - Shell commands execute under Docker WSL2 (`trusted-local` profile) or Node child processes with timeouts. Unrestricted host command execution is prohibited.
4. **Credential Protection**: LLM credentials must be handled securely through `DesktopCredentialBroker` (DPAPI/safeStorage) and never logged, exported, or leaked into renderer logs.

---

## 5. Definition of Done

A task is **DONE** only when:
1. All relevant unit, contract, or integration tests pass.
2. The real end-to-end pathway functions without mocks.
3. All internal links and file paths are verified.
4. Affected documentation in `docs/` is synchronized.
5. Evidence of actual execution is reported.
