# Server Package Guide (`apps/server`)

`apps/server` is Sirona's canonical backend. It provides the Express HTTP/SSE application, domain services, orchestration loops, database access, and tool runtime.

---

## 1. Responsibilities & Ownership Boundaries

- **Owns**:
  - Express server lifecycle and composition (`app.js`, `server.js`, `foundation/`).
  - Canonical `/api/v1` route controllers (`routes/v1/`, `routes/index.js`).
  - Domain business logic (`services/`): `providerService.js`, `aiService.js`, `agentExecutionEngine.js`, `toolRuntimeService.js`, `governanceService.js`, `turnLeaseService.js`.
  - Database schema, migrations, connection pools, and SQLite/PostgreSQL dispatch (`config/db.js`, `migrations/`, `model/`).
  - TypeScript core modules (`src/`): compiled to `dist-workspace/`.
- **Does Not Own**:
  - Desktop native OS dialogs or DPAPI encryption (owned by `apps/desktop`).
  - User interface components or client-side React hooks (owned by `apps/web`).
  - Shared wire DTO type declarations (owned by `packages/contracts`).

---

## 2. Directory Structure

```
apps/server/
├── app.js                   # Express pipeline (middleware, error handler, route registration)
├── server.js                # Server entry point & CLI startup supervisor
├── config/
│   ├── db.js                # Dynamic driver dispatcher (PostgreSQL vs SQLite)
│   └── sqliteDb.js          # SQLite fallback connection & translation
├── routes/
│   ├── index.js             # Route mount router (/api/v1/*)
│   └── v1/                  # Canonical route modules (providers, execution, tools, etc.)
├── services/                # Authoritative JavaScript domain services
├── src/                     # Editable TypeScript core (context, orchestration, security)
├── migrations/              # SQL migrations (001_initial_schema.sql - 024_...sql)
├── model/                   # Active Record / Table models (Session, Message, Setting)
└── tests/                   # Integration and unit test suites
```

---

## 3. Relevant Canonical Technical Documentation

- **Model Gateway & Providers**: [`docs/features/model-providers-and-gateway/SPEC.md`](../../docs/features/model-providers-and-gateway/SPEC.md)
- **Agent Runtime & Execution**: [`docs/features/agent-runtime-and-loop/SPEC.md`](../../docs/features/agent-runtime-and-loop/SPEC.md)
- **Tool Execution & Sandbox**: [`docs/features/tool-execution-and-sandbox/SPEC.md`](../../docs/features/tool-execution-and-sandbox/SPEC.md)
- **Approvals & Governance**: [`docs/features/approvals-and-governance/SPEC.md`](../../docs/features/approvals-and-governance/SPEC.md)
- **Sessions & Persistence**: [`docs/features/sessions-and-persistence/SPEC.md`](../../docs/features/sessions-and-persistence/SPEC.md)

---

## 4. Coding & Architecture Conventions

1. **Source File Rule**: Always edit TypeScript code under `src/` or JavaScript services under `services/`. **Never** edit files under `dist-workspace/` (they are build outputs).
2. **Database Queries**: All queries must use parameterized syntax (`$1, $2`). This ensures compatibility with both PostgreSQL (`pg.Pool`) and the SQLite translator (`sqliteDb.js`).
3. **Thin Route Controllers**: Route handlers in `routes/v1/` must only decode requests, validate session auth, invoke the domain service, and return standardized JSON/SSE envelopes. Never put business policy or database queries directly in route handlers.
4. **Error Handling**: Use `sendProblem(req, res, status, message)` from `middleware/problem.js` for RFC 7807 problem details.

---

## 5. Verification Commands

```bash
# Run all server tests (skipping PostgreSQL when testing offline)
node scripts/run-test.js --pkg server --skip-db

# Run specific provider tests
node scripts/run-test.js --pkg server --filter provider

# Run agent execution tests
node scripts/run-test.js --pkg server --filter agentExecution
```
