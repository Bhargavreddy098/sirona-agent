# Sirona — end-to-end feature implementation workflow

> **Status:** Proposed development procedure, documentation only. This file is **not** owner authorization for source edits, migrations, paid inference, production activation, privileges, or phase expansion.
>
> **Precedence:** Explicit current owner decisions and actual source/evidence > root `AGENTS.md` and current handoff > applicable accepted architecture/security/API contracts > current approved phase scope > this procedure > older plans/archives. Where documents conflict, report the conflict and stop the affected work. Do not silently choose a weaker rule.
>
> **Applicability:** Sirona Windows local-first Electron application; `frontend/sirona-next` React/TypeScript/Vite/Electron; Node/Express backend; approved PostgreSQL architecture using the existing Drizzle/Zod boundaries; P0–P8 phased work; guarded Docker + WSL2 Home execution; AI provider, LangGraph, MCP and workspace domains. Use the actual live repo to confirm paths, exports and contracts—this procedure was prepared from the supplied `docs.zip`, not from a source checkout.

## 0. Why this document exists

An AI agent **does not execute Markdown as code**. A human or orchestrator dispatches a feature task to an agent with filesystem/shell/test permissions. The agent reads this procedure and its feature specification, inspects the actual code, changes approved source files, runs verification and reports evidence. Markdown is the **instruction and approval context**; TypeScript/JavaScript source, route registration, schema, migrations, client functions, UI, tests and production composition are the **implementation**.

**Target invariant:** A feature is not complete merely because a Markdown checklist says so, a route file exists, TypeScript builds, or a mock UI renders. The real supported application entry point must reach the canonical backend owner, operate on authorized real state, produce the expected DTO/event, and render the resulting state in the real UI where applicable.

## 1. Existing authority and source-of-truth map

| Concern | First documents / source to examine | Required decision |
|---|---|---|
| Current request and scope | `AGENTS.md` (root, if present), `docs/SIRONA-AGENT-HANDOFF.md`, owner conversation/approval record | Is the exact task authorized? |
| Platform architecture | `docs/SIRONA-WORKSPACE-PLAN.md`, current normative `sironadocs/` references if available | Does this preserve the approved architecture? |
| Phase dependencies/status | `docs/SIRONA-WORKSPACE-LEDGER.md`, technology ledger, relevant P1–P8 documents | Are prerequisites accepted for this exact source and environment? |
| Existing HTTP surfaces | `docs/frontend-route-coverage.md`, current route registration and tests, normative route matrix if available | Reuse or extend? Is a new route necessary? |
| Backend owner | `backend/routes/v1/`, `backend/services/`, `backend/src/`, `backend/foundation/` (verify actual files) | Which canonical service owns the capability? |
| Contracts and validation | Existing route DTOs, Zod schemas, shared/frontend `types.ts` and client modules (verify actual files) | What request/response/error/version is stable? |
| Storage | Current DB adapter/config, schema, migrations and read/write repositories (verify current code) | PostgreSQL reconciliation resolved? Is migration needed? |
| Frontend | `frontend/sirona-next`, component/hook/API-client owners, UI freeze rules if available | Which existing component/state path owns the UI? |
| Runtime / side effects | P1 journal/leases, P3 Docker guest and PTY, P4 provider adapters, P5 orchestration, P6 tools (as relevant) | Which subsystem may execute and how is it fenced? |
| Acceptance | Focused tests, real HTTP/SSE/WebSocket/browser journey, evidence & ledgers | Is behavior proven in the correct isolated target? |

**Critical known blocker from the supplied 2026-10-30 handoff/ledger:** `config/db.js` reportedly selects SQLite and ignores PostgreSQL test-target configuration, contrary to the selected architecture. **STOP DB-dependent changes and verification until the owner resolves `SIRONA-BACKEND-DATABASE-RECONCILIATION.md` and the current source is reverified.** Do not delete, migrate, convert or repoint either database as a workaround. Older test results are historical for their captured source, not proof for the altered DB owner.

The supplied ZIP does **not** contain root `AGENTS.md`, `sironadocs/`, source files, recent wiring/refactor reports, or raw evidence. Missing material must be retrieved from the real checkout; absence from the ZIP is not proof of absence from the repository. Never invent missing content or treat a broken link as approval.

The route manifest includes both a **170-route historic inventory** and a **146-active-route post-simplification statement**. Reconcile against actual route registration before assigning ownership or adding an endpoint. Never rely on the 170 number alone.

## 2. Feature lifecycle — gates, artifacts and stop conditions

| Gate | Input | Output/artifact | May proceed when |
|---|---|---|---|
| F00 Intake | User request | `FEATURE-<id>-<slug>.md` created as `proposed`; owner/intent recorded | Request is understood; documentation work only |
| F01 Read & audit | Root rules, handoff, ledgers, real code, dependency graph | Existing-owner map, route collision check, baseline hashes, blockers | Current source and prerequisite truth established |
| F02 Contract design | Existing DTOs/clients, use cases | Wire/API contract, errors, events, ownership, test plan, migration impact | Contract is coherent and nonduplicative |
| F03 Approval | Diffable change manifest, cost/privilege/data impact, rollback | **Exact owner approval reference** for approved files/actions | Explicit approval covers proposed protected changes |
| F04 Backend | Approved source and tests | Service/repository/route code wired into live composition | Focused backend tests pass, no scope drift |
| F05 Transport | Existing API envelopes / stream protocols | Stable DTO, auth/CSRF/ownership, timeouts, stream/reconnect | Real HTTP/RPC/SSE integration passes |
| F06 Frontend | Typed client, state owners, UI contract | Real UI trigger, loading/error/success/reconnect states | App uses actual transport, no demo/mock fallbacks |
| F07 Integration | Isolated environment, fixtures, approved test data | Full UI→backend→state→UI proof + negatives | All applicable gates pass on current source |
| F08 Review/handoff | Diffs, logs, test output, evidence | Requirement→code→test→evidence matrix; ledger updates | Owner accepts slice; production flag remains separate |

Transitions: `proposed → inspected → contract_ready → awaiting_approval → approved → implementing → verifying → accepted`; alternate states `blocked`, `failed`, `partially_verified`, `rolled_back`. **Only the approving person grants authority**; a status value or file edit does not.

### F00 — Write the per-feature spec (no code edits)

Create `docs/features/FEATURE-<NNN>-<short-slug>.md` from `docs/FEATURE-SPEC-TEMPLATE.md`.

Capture: business problem, user-visible behavior, domain owner, supported surfaces (web/Electron/mobile only if actually present), existing APIs, proposed changes, exact exclusions, approval needs, testable acceptance criteria, rollback, evidence location. Include current environment assumptions, code-access scope, and flag defaults. Do **not** fill unknown paths, approval IDs or test results with invented values.

### F01 — Preflight: inspect actual code, status, route ownership

**The agent first produces a concise read-only audit:**

1. Identify git branch/commit, working tree status and unrelated uncommitted files. Preserve them. Never run broad `git clean`/`reset`, destructive shell patterns or unrelated process killing.
2. Read root `AGENTS.md` and the current handoff/ledgers; collect *actual* approval reference for this slice. Resolve superseded status by date/source/authority; note contradictions.
3. Locate the existing domain modules: registered Express router, middleware, service, persistence layer, tests, API client, frontend state/hook and component(s). Search for endpoints and method names before creating files.
4. Diff `frontend-route-coverage.md` against currently mounted/registered routes. Distinguish live, retired, backend-only, and conditional routes. Choose **reuse → additive extension → new route only when necessary**.
5. Inspect real DB adapter/config. Establish actual `current_database()` or equivalent target and ensure the approved Postgres lineage is in force before DB-dependent tests or writes. Under the current reported SQLite mismatch, **block affected work** rather than fake a passing DB gate.
6. Identify whether the feature touches protected code, environment credentials, host execution, terminal, provider billing, image admission, migrations, or deployment. List exact additional approvals and STOP before affected modifications.
7. Record baseline source hashes and narrow rollback copy of approved touched files if applicable; do not include credentials, data or secrets in evidence.

**F01 deliverable:** a table of `requirement | existing owner/file | reuse/add | current evidence | blocker | proposed file changes`. Unverified candidate paths are marked `VERIFY`.

### F02 — Design a versioned, typed API contract first

For an API-backed feature, decide whether it requires HTTP REST, SSE, WebSocket, internal service calls, or existing MCP/agent tool entry points. Prefer the **current canonical transport** for the domain; do not introduce a parallel API gateway, routing layer, event bus, provider registry or orchestrator.

Define precisely:

- **Method/path/operation name**, version and domain; route order avoids collisions with dynamic `/:id` patterns.
- **Request schema**: path params, query, body, types, defaults, bounds, normalization; reject unknown or conflicting fields as policy requires.
- **Response schema**: success envelope, field names, nullability, enum values, pagination/cursors, IDs and timestamps; match existing contracts.
- **Errors**: validation, unauthenticated, forbidden, not found, conflict/stale state, rate/cost limits, service unavailable; stable error envelope and mapped HTTP codes or RPC error tags.
- **Authorization**: authenticated local session, workspace/project ownership, capability grants, approval proofs, CSRF where required. Local-first does not mean permission-free execution.
- **Mutation semantics**: idempotency key, operation identity, effect journal/receipt, optimistic concurrency/version, exact retry and cancellation outcome. Never retry an unknown side effect blindly.
- **Streaming**: authoritative event IDs/cursors, ordering, reconnect/replay, heartbeat, terminal states, unsubscribe/cancel behavior; distinguish stream failures from completed operations.
- **Persistence**: source-of-truth tables, transactions, migrations, schema compatibility, migrations-only-on-explicit-approved-target policy. Query existing tables first.
- **Frontend and agent reach**: API client method, hook/state owner, UI surface, any existing MCP or scheduled-action caller. Backend capability belongs in a shared service, not UI or router-only code.
- **Compatibility**: existing `/api/v1` clients and standalone conversations, other UI surfaces, exact provider IDs, no unauthorized breaking DTO change.

Commit to one approved contract. Backend and frontend agents **cannot independently change the same wire shape**. Either have a contract owner approve first, or make edits serially with the same contract commit. If the established codebase lacks a shared contracts package, reuse the current typed API client/DTOs; propose extraction separately rather than restructuring the entire repository as a side effect.

### F03 — Exact approval gate before protected changes

Prepare a one-screen approval packet with: feature ID, reason, exact allowed existing and new paths, required dependencies with versions, route methods and schema, database/migration target, security/process/host impact, paid calls, verification commands, evidence destination and rollback plan. Explicitly mark exclusions.

**Separate approvals** are required when applicable for source edits outside an approved boundary, SQL *authoring* versus SQL *application* to a named target, paid provider calls, OS privileges, Docker image replacement, working-data modification, auto-commit/push/deployment, production enablement, and any architecture pivot. Do not ask for a vague blanket approval. A proposal file is not evidence of approval.

For strictly unprotected changes, follow the current root instructions and owner decision; this proposed playbook does not manufacture a new authorization requirement or waive existing ones.

### F04 — Implement backend from inside out

**Expected Sirona domain chain (verify real paths):**

```text
incoming request
  -> existing Express mount and session/auth/CSRF middleware
  -> backend/routes/v1/<domain>.routes.js       [thin transport]
  -> request/response Zod validation            [canonical DTO]
  -> backend/services/<domain>Service.js or backend/src/<domain>/*
       [canonical application/domain operation]
  -> existing repository / Drizzle / PostgreSQL [durable state]
  -> existing execution/journal/guest/provider owners (only if needed)
  -> mapped DTO and/or authoritative event stream
```

Use a **thin handler**: parse+validate, check/current context via existing middleware/service boundaries, invoke one domain service, map errors and return the established response envelope. No new shadow service, direct DB access from React, guessed SQL columns, hidden host process spawn, or hand-rolled permission bypass. Reuse actual existing service names; the examples in this document are conceptual unless source-confirmed.

Implementation order within the approved scope:

1. Add narrowly scoped tests around the existing domain behavior, including failing regression where applicable.
2. Update compatible schema/DTO (contract step F02 may already establish this).
3. Add or extend **one** domain service and any required existing repository method.
4. Apply additive migration **only after separately approved target/SQL**, with target assertion and backup/recovery plan; otherwise stop DB-dependent slices.
5. Add/extend Express router handler, register router at actual server composition, validate input/output, preserve existing auth/CSRF/ownership policy.
6. Wire any associated SSE/WS event/receipt from existing live owner. A route merely exporting a handler is not enough.
7. If an agent/MCP/scheduled task can invoke the same feature, reuse this service in its tool or job adapter rather than copying logic.
8. Verify disabled/flag-off behavior, restart/cancel and exact errors.

**Mutation-specific:** ensure atomic durable operation identity, approvals, lease/fencing and receipts. Commit/patch/terminal/provider actions require their existing safety owners. Unknown outcome ≠ success; cancel requested ≠ cancelled; accepted command ≠ completed effect.

### F05 — Prove the transport and DTO before UI work

Call the running registered endpoint through the actual authenticated server and existing session/CSRF model. Exercise at least success, malformed input, forbidden/foreign project, missing record, conflict/retry where relevant, restart/reconnect where relevant, and failure mapping. Test actual HTTP envelope and event order. Do not replace real Postgres validation with in-memory mocks while claiming DB acceptance.

Check that the backend method is reachable through the **same running server composition** used by Electron and the frontend, not only direct unit imports. If the endpoint is not truly reachable, F05 fails even when F04 service unit tests pass.

### F06 — Connect frontend as a first-class feature, not a mocked screen

**Expected current frontend path (verify actual exports):**

```text
frontend/sirona-next UI component
  -> feature hook / state owner
  -> existing typed API client method (api.* / executionApi.* / projectsApi.* / ...)
  -> existing desktop/browser transport and base URL
  -> authenticated /api/v1 route and SSE/WS as appropriate
  -> DTO decoded into canonical client type
  -> state cache/event subscription (existing owner)
  -> React render, action feedback, navigation and cleanup
```

Frontend implementation checklist:

- Reuse existing typed transport and consolidated API client; do not create scattered raw `fetch()` calls or a second API namespace.
- Add/extend proper shared client type or inferred Zod DTO. Include abort/cancel and browser-vs-Electron connection handling.
- Identify the authoritative state source and cache invalidation. Avoid local-only fake state and stale optimistic success.
- Map loading/empty/partial/error/retrying/success/disabled states; prevent duplicate submissions; ensure accessible controls and readable recovery.
- If live: use existing SSE/WebSocket contract with event cursor/replay, unsubscribe, one authoritative terminal state and reconnect semantics. No invented stream event type.
- Preserve `frontend/sirona-next` UI freeze, component library/design system, theme/spacing and navigation; do not resurrect retired `frontend/sirona` or perform unauthorized redesign.
- Ensure the feature is accessible from intended real entry points and views. Inspect command palette/Settings/sidebar if applicable.
- Never treat a hard-coded list, static JSON response, mock adapter, imported fixture, or screenshot as production UI integration.

### F07 — Test by layer and then through the full user path

Do not run unchecked broad scripts against the real working environment. With the **currently authorized** target and source verified, exercise:

| Layer | Mandatory examples | Acceptance evidence |
|---|---|---|
| Contract | Valid/invalid DTO, backward compatibility, envelope, route collisions | Tests using current schemas |
| Service | Correct business result, errors, no duplicate operations, owner isolation | Focused module tests |
| Repository | Approved schema/transaction, data isolation, migration lineage if relevant | Actual safe DB integration with explicit target check |
| Router | Auth, CSRF, allowlist, validation, status code, response DTO | Real HTTP request/response |
| Live transport | Event ordering, subscribe/replay, disconnect, cancellation, stale/duplicate events | Real SSE/WS transcript if applicable |
| Frontend | App invokes real client; state and error views; keyboard/accessibility | Real interactive browser/Electron capture |
| Host/guest/provider | Actual permitted guest/provider boundary, no host fallback, crashes/revokes | Bound source/effect/receipt evidence, distinguish free mocks from paid inference |
| Regression | Existing chat, providers, workspace, current routes and UI remain intact | Relevant existing focused checks |

The supplied current handoff lists **package-local** candidate commands, subject to real `package.json` verification: `frontend/sirona-next`: `npm run check`, `npm run lint`, `npm test`, `npm run build`; backend: `npm run build:workspace`, `npm run check:workspace`, `node scripts/checkSyntax.js`, and relevant focused tests. Do **not** blindly run `backend npm test`, migration scripts, or use a working `.env` for DB-mutating tests. A generic passing TypeScript build is not evidence of HTTP/DB/browser integration.

For a real end-to-end test, record the causal chain: user action -> actual network request -> auth/validated handler -> canonical service -> actual storage/effect -> response/event -> updated UI, including failure and cleanup. If a gate requires a real model/guest/browser, mark it `UNVERIFIED` when unavailable. Zero-cost provider simulations prove only the simulated boundary.

### F08 — Completion packet and ledger handoff

Use an evidence matrix for every acceptance criterion:

| AC | Requirement | Backend source | Contract/client source | UI source | Test | Evidence path / hash | Status |
|---|---|---|---|---|---|---|---|
| AC-01 | [user flow] | [path:line] | [path:line] | [path:line] | [command/test] | [artifact/hash] | PASS / FAIL / BLOCKED / UNVERIFIED |

Record: current commit/tree and modified file manifest; approval ID and scope; route and DTO impact; migration target/version or none; test commands and exit codes; concise nonsecret evidence; pre/post data and flag checks; known pre-existing errors separated from introduced failures; rollback capability; exact unresolved gates.

Update **existing** `docs/SIRONA-WORKSPACE-LEDGER.md`, `docs/SIRONA-WORKSPACE-TECHNOLOGY-LEDGER.md` when technologies change, `docs/frontend-route-coverage.md` and authoritative route matrix after verifying live route counts, and `docs/SIRONA-AGENT-HANDOFF.md` to point to current state. Do not fabricate historical report files or overwrite immutable accepted evidence. A new one-page feature acceptance report may link to run evidence; avoid endless duplicate Markdown narratives.

Feature status may be `accepted` **only** for exactly proven scope. `accepted` does not imply general P7/P8 completion, paid-model correctness, production activation or owner permission for the next feature.

## 3. Parallel agents: safe scheduling and ownership

Parallel work is useful **after contract approval**. Assign each agent a precise write set and dependencies:

```text
Lead/orchestrator [read-only audit + F02 design]
      |
      v
Explicit owner approval (when required)
      |
      v
Contract owner: freezes DTO/method/schema [single writer]
      |
      +----> Backend implementer: domain service, router, backend tests
      |
      +----> Frontend implementer: typed client, UI, frontend tests
      |
      +----> Verification author: test cases, fixtures, browser plan (read-only to shared code)
      |
      v
Integrator: merge serially; resolve contract deviations; run complete path
      |
      v
Reviewer: independent evidence audit; ledger/handoff update
```

No agent may change a second agent's owned contract without integration lead review. One agent owns actual schema/migrations, one owns live route registration, one owns shared DTO; do not allow two agents to issue conflicting database migrations or write to the same front-end state module concurrently. Preserve the P5 specialist concurrency/delegation ceilings where applicable; this is a development-work distribution suggestion, **not** permission to alter production LangGraph policy.

## 4. Mandatory stop / escalation triggers

Stop only the affected slice, summarize exactly what is blocked, and request the minimum next owner decision for:

- Missing or conflicting root instructions, normative contract, scope approval, or active route ownership.
- Reported SQLite/PostgreSQL architecture mismatch or database-target guard failure.
- Changed/unlisted protected paths, unapproved dependencies, new SQL/migration application, or a breaking API/DTO.
- Paid provider test, credential migration/rotation, working-data writes, privileges, production activation, installer or release/deploy work.
- Requirement to escape approved Docker guest, spawn arbitrary host commands, add unbounded proxy, bypass canonical journal/permissions, or weaken current threat model.
- Unexpected existing user edits, stale hashes, shared mutable test infrastructure, or irreversible cleanup.
- Test marked PASS without actual evidence; flaky/racy integration or unverified real-provider behavior.

**Fallback when blocked:** provide a read-only implementation plan, contract sketch, exact file diff proposal and tests that could safely be run. Never label an unexecuted plan as implemented.

## 5. Checklist before saying 'done'

- [ ] Scoped request and current source/approval were verified.
- [ ] Relevant existing route/service/client were reused or a documented necessity for adding one was established.
- [ ] One accepted wire contract is used by backend and frontend.
- [ ] Service logic is reachable from the registered router and full server composition.
- [ ] Validation, auth/CSRF/ownership, error/permission gates are enforced where applicable.
- [ ] Durable transaction, migration, event, effect, approval and lease semantics are preserved.
- [ ] Typed client, real React UI, loading/error/reconnect and intended navigation are connected.
- [ ] Real route and UI integration tests were run against approved source/target, and the evidence is attached.
- [ ] Regressions, cancellation, cleanup, and rollback were assessed.
- [ ] Route inventory, task ledger, technology ledger and handoff are accurate.
- [ ] Unverified/blocked evidence and production/migration/paid gates remain explicitly open.
