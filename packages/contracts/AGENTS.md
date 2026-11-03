# Contracts Package Guide (`packages/contracts`)

`packages/contracts` owns Sirona's canonical TypeScript schemas and wire contract types shared across the backend, desktop bridge, and frontend client.

---

## 1. Responsibilities & Ownership Boundaries

- **Owns**:
  - Typed DTO definitions for API requests and responses (`src/api.ts`).
  - Event schemas for SSE streams and execution journals (`src/events.ts`).
  - Execution run, task, and effect definitions (`src/execution.ts`).
  - Model and provider connection contract types (`src/models.ts`).
- **Does Not Own**:
  - Runtime service implementations or Express route handlers (owned by `apps/server`).
  - Frontend React state or UI components (owned by `apps/web`).

---

## 2. Directory Structure

```
packages/contracts/
├── src/
│   ├── index.ts             # Barrel exports
│   ├── api.ts               # Request & response envelopes, pagination, error schemas
│   ├── models.ts            # ProviderConnection, ModelDefinition, ModelSettings
│   ├── execution.ts         # Run, Task, Effect, AutonomyMode types
│   └── events.ts            # SSE event types (token, done, error, run_created)
├── tests/                   # Type validation and serialization tests
└── package.json
```

---

## 3. Relevant Canonical Technical Documentation

- **Model Gateway & Providers**: [`docs/subsystems/model-gateway.md`](../../docs/subsystems/model-gateway.md)
- **Agent Runtime & Execution**: [`docs/subsystems/agent-runtime.md`](../../docs/subsystems/agent-runtime.md)
- **Sessions & Persistence**: [`docs/subsystems/sessions-and-persistence.md`](../../docs/subsystems/sessions-and-persistence.md)

---

## 4. Contract Authoring Rules

1. **Single Writer Rule**: Any change to API request/response shapes must begin here in `packages/contracts` before modifying backend controllers or frontend clients.
2. **Forward Compatibility**: When defining string option types, prefer open literals (`KnownOption | (string & {})`) so new model versions or provider flags do not break serialization.
3. **Zero Runtime Dependencies**: `packages/contracts` must remain lightweight TypeScript types and schemas without heavy runtime dependencies.

---

## 5. Build & Verification Commands

```bash
# Typecheck contracts
npm --prefix packages/contracts run check

# Run contracts tests
npm --prefix packages/contracts test
```
