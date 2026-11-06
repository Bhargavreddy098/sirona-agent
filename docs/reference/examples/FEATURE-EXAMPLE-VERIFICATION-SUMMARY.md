# EXAMPLE ONLY — proposed run verification summary, UI → backend → UI

> **This is a teaching example, not a user-requested implementation or approved route. Do not execute it automatically.** It illustrates the exact per-file questions and acceptance gates using existing Sirona domains. The sample endpoint below is **hypothetical** and must not be registered unless actual source audit proves a missing need and the owner approves the precise change.
>
> Current handoff reports DB adapter mismatch (`config/db.js`: SQLite instead of selected PostgreSQL) and stops DB-dependent implementation/verification pending owner reconciliation. No production acceptance is claimed.

## 1. Example feature request

> When a user opens a Run in the Sirona workspace, show a concise verification summary: last outcome, checks executed, failed checks and evidence references, using the canonical backend verification records, not a frontend approximation.

### Important first decision: probably reuse existing APIs

The supplied `frontend-route-coverage.md` already lists:

- `GET /api/v1/runs/:id` → `executionApi.run()` for run details.
- `GET /api/v1/runs/:id/tasks` → `executionApi.tasks()`.
- `GET /api/v1/runs/:id/failures` → `executionApi.failures()`.
- `GET /api/v1/runs/:id/events` → `executionApi.events()` for SSE.
- Other checkpoint/repair surfaces related to runs.

**Audit these implementations and their current DTOs first.** If an existing response already carries enough authoritative verification information, simply connect a view using that current transport and leave backend routing unchanged. Adding an endpoint just because the user said “new feature” would be unnecessary.

If no existing API can expose the required aggregate without inconsistent client-side joins, an additive **candidate** could be:

```http
GET /api/v1/runs/:id/verification-summary
```

No route is approved by this example, and the backend may require a different canonical owner or transport after source inspection.

## 2. Owner and boundary inspection

| Concern | Example inspection question | Candidate source mentioned in supplied docs |
|---|---|---|
| User entry | Which existing Run detail / verification panel owns display? | `frontend/sirona-next/src/features/workspace/` (verify actual source) |
| API client | Does `executionApi.run()` or `executionApi.events()` expose the needed proof already? | `executionApi.*` per route manifest |
| Backend route | Are execution routes mounted and authorized with current session/project context? | `backend/routes/v1/execution.routes.js` per manifest |
| Canonical service | Which existing verification service owns verdicts and evidence? | `VerificationService` mentioned in P5 plan; verify actual module/path |
| Persistence | Is the verification source projected or stored in existing tables? | Current repositories and approved PostgreSQL model (verify source) |
| Events | Does existing `/api/v1/runs/:id/events` already emit changes? | Route manifest; verify real SSE semantics |
| Security | Can a session read only runs in its own project/workspace? | Existing auth/ownership/CSRF/governance rules |
| UI policy | Are UI layout and design frozen? | `frontend/sirona-next` preservation rules and normative UI contract |
| DB blocker | Is `config/db.js` reconciled? | Current handoff says **no; affected work STOPPED** |

## 3. Candidate contract — illustrative only

Only if a new read endpoint is actually needed and approved:

```ts
// Conceptual DTO shape: adapt to existing Sirona Zod schema and API envelope.
const VerificationSummary = z.object({
  runId: z.string().min(1),
  status: z.enum(["not_started", "running", "passed", "failed", "blocked"]),
  checks: z.array(z.object({
    id: z.string(),
    label: z.string(),
    status: z.enum(["pending", "passed", "failed", "blocked"]),
    evidenceRef: z.string().nullable(),
  })),
  lastVerifiedAt: z.string().datetime().nullable(),
});
```

**Caution:** This schema is merely an example of writing a typed contract. The real app may have different canonical verification states and response envelopes. The agent must reuse actual types, evidence IDs and fields after inspecting the live service; it must not convert `unknown` into `passed`, invent verification evidence, or add incompatible enums.

The proposed semantics should distinguish `not_started`, `running`, `blocked`, `failed` and `passed` by actual canonical outcomes. `GET` has no side effects, no model calls, no implicit guest creation and no migration by default. User/project authorization is enforced before reading any run data.

## 4. Example backend implementation tasks

**Start only after current source/approval/DB gates are resolved.**

1. **Find code:** Inspect the currently registered `execution.routes.js`, its controller/service imports, Zod schemas, existing `runs/:id` response, current verification owner and tests. Search for `verification`, `evidence`, `run` and current SSE event names. Record source and actual line references.
2. **Choose reuse:** If sufficient information is already returned by `executionApi.run()` plus the current stream, add **no new route**. Focus on React integration and tests.
3. **If genuinely absent:** Present the exact additive method/path, request/response/error schema, route ordering and bounded read-query plan, including file diffs and approval request. Do not implement before approval.
4. **Domain service:** Add the minimal operation to the actual current verification/read service, using existing repository methods. No `SELECT` from guessed tables, new verification store, new audit journal, or inline route SQL.
5. **Thin route:** Validate run ID, resolve current context/project ownership, invoke the service, map existing domain errors to established `/api/v1` envelopes. Keep auth/CSRF policy consistent; avoid wildcard paths and accidental shadowing of `/:id` routes.
6. **Actual registration:** Verify that the router is mounted in the running Electron-bundled backend; a unit-test-only export does not suffice.
7. **Live update:** Use the current run event/subscription mechanism if verification results can change while a Run detail view is open. Reconcile event cursor/reconnect and don't let UI cache override authoritative newer state.
8. **Back-end verification:** Route tests for success, wrong run/project, bad IDs, nonexistent run, empty evidence, partial/blocked state, stale state and stream-update behavior. DB-dependent tests must await resolution and run against a specifically approved test target.

## 5. Example frontend implementation tasks

1. Locate the actual Run detail component and the existing `executionApi` typed module. Determine whether server events or queries already contain the verification summary.
2. Reuse/extend the current client operation; do not scatter raw fetch calls or create a new global state library just for this panel.
3. Add a hook/state selector that consumes canonical run data and events, handles error/stale events, and cancels subscriptions on unmount.
4. Render a compact, accessible verification summary inside the existing `frontend/sirona-next` UI. Follow current design tokens/primitives. Don't redesign the full workspace.
5. Show `not run`, `working`, `passed`, `failed`, `blocked`, `unknown/offline` distinctly and show evidence only when a real reference exists.
6. Prevent stale “passed” states after a new run/verification starts. After reconnect, request an authoritative snapshot or use the established replay cursor.
7. Verify navigation from Runs timeline and any other current entry point. Do not add unsupported Settings/command-palette routes automatically.
8. Write actual frontend tests and one browser/Electron test proving that the real backend summary appears after navigation.

## 6. Example trace for an end-to-end acceptance test

```text
USER: opens Run detail
FRONTEND: existing Run component calls typed executionApi
NETWORK: GET /api/v1/runs/<safe-test-id> [or reuse existing GET]
BACKEND: real Express route checks session + project/run ownership
SERVICE: canonical verification read service fetches authoritative result
DB: approved isolated PostgreSQL source (after DB reconciliation)
RESPONSE: existing typed /api/v1 envelope with actual evidence IDs
FRONTEND: state cache updates; shows verified status and evidence links
USER: sees FAILED state and exact existing evidence reference
NEGATIVE: foreign-project run is denied and never rendered
STREAM: new verification event updates UI after reconnect (if relevant)
```

Never replace this proof with a mock network layer and call it complete. If no actual browser, database, or current backend can be exercised, record `UNVERIFIED` and the exact missing prerequisite.

## 7. Example success / failure criteria

| Criterion | Evidence required | Status now |
|---|---|---|
| Uses existing route when sufficient | Source code comparison and decision record | NOT INSPECTED |
| New route if strictly necessary | Approval + registered handler + contract test | NOT APPROVED |
| Accurate canonical state | Service test + real authorized repository result | BLOCKED for DB-dependent proof |
| Correct ownership | HTTP unauthorized/foreign-run denial | UNVERIFIED |
| UI matches real response | Browser/Electron request trace and screenshot | UNVERIFIED |
| No state regression | Stream/reconnect and run-status tests | UNVERIFIED |
| No existing feature broken | Relevant provider/chat/Run regressions | UNVERIFIED |
| Ledger/route inventory truthful | Updated manifest/handoff linked to proof | NOT IMPLEMENTED |

## 8. Example approval packet

> FEATURE-EXAMPLE-VERIFICATION-SUMMARY: Requesting approval for [list exact paths after inspecting source], [reuse existing API OR introduce GET route only with justification], [specific DTO], [no SQL OR separate SQL author/apply gate], [actual test commands], and [rollback]. Current reported backend DB mismatch blocks affected implementation/testing. This request does not authorize production activation, paid inference, changes to unrelated providers, guest tooling or broader workspace redesign.

## 9. What to record on completion

- Exact current source commit and hashes, owner decision and permitted paths.
- Actual changed handler, contract, service, frontend client, hook and component paths.
- Requirement→code→test→evidence matrix with PASS/FAIL/BLOCKED/UNVERIFIED per criterion.
- Whether route manifest count changed and why; reconcile 170 historic versus 146 post-simplification and current actual registration.
- Migration target/version if any; safety guard; feature flag state; restart/stream limitations.
- Updated `SIRONA-WORKSPACE-LEDGER.md`, route manifest, handoff and technology ledger if relevant.

This example exists to teach the **discipline**, not to invent an additional Sirona feature or bypass the current STOP.
