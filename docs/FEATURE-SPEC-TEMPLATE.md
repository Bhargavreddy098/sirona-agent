---
feature_id: FEATURE-[NNN]
state: proposed
execution_mode: inspection_only
approval_reference: null
current_source_commit: unknown
# Metadata is descriptive ONLY. It never authorizes execution or writes.
---

# FEATURE-[NNN] — [Short descriptive feature name]

> **Template** — copy to `docs/features/FEATURE-[NNN]-[slug].md`. Replace every `TODO`; use `UNKNOWN` where information is not verified. This file does not grant approval. Follow `docs/FEATURE-END-TO-END-WORKFLOW.md` and the current root `AGENTS.md` / handoff.

## 0. Identity and status

| Field | Value |
|---|---|
| Feature ID | `FEATURE-[NNN]` |
| Owner / request source | TODO |
| Requested date | TODO |
| Current state | `proposed` (not implementation-approved) |
| Current branch / commit | UNKNOWN; inspect live source |
| Current phase / dependencies | TODO: P0–P8 or cross-phase |
| Primary domain / canonical service | UNKNOWN; inspect live source |
| Frontend target | `frontend/sirona-next` (verify current owner) |
| Approval reference | NONE; verify exact owner action |
| Baseline evidence/checkpoint | NOT CAPTURED |
| Production flag / rollout | DEFAULT OFF, unless existing approved behavior says otherwise |
| Current blockers | Include DB reconciliation status and unavailable source/docs |

## 1. Business goal and user story

**Problem:** TODO — What is broken/missing today? Who experiences it?

**User story:** As a [user of Sirona], I want [one clear action/capability] so that [measurable outcome].

**Out of scope:** TODO — Explicitly list tempting but unrelated changes, such as UI redesign, provider rewrite, database conversion, deploy, mobile, or entire new orchestration stack.

## 2. Current behavior and proof

- Existing UI flow and component: UNKNOWN; file + line + screenshot after live inspection.
- Existing route(s) and their actual registration: UNKNOWN; method + path + handler.
- Existing typed client/hook/state: UNKNOWN.
- Existing backend service/repository: UNKNOWN.
- Existing DB schema/migrations and guard: UNKNOWN; **current handoff reports SQLite/Postgres contradiction**.
- Existing source/test baseline: UNKNOWN; log commit/hashes and only the tests actually run.
- Conflicting/retired features: UNKNOWN; reconcile `frontend-route-coverage.md` inventory versus active routes.

## 3. Proposed end-to-end journey

Write the precise flow, including failure and cancellation:

```text
User [action in actual UI]
 -> [component/hook]
 -> [typed API client]
 -> [HTTP/SSE/WS operation + input]
 -> [session/auth/CSRF/ownership validation]
 -> [canonical domain service]
 -> [existing DB/guest/provider/effect owner]
 -> [validated response/receipt/events]
 -> [frontend state/cache and accessible visible result]
```

### User-visible states

| State | Trigger | UI behavior | Recovery |
|---|---|---|---|
| Idle | TODO | TODO | TODO |
| Loading | TODO | TODO | TODO |
| Empty | TODO | TODO | TODO |
| Success | TODO | TODO | TODO |
| Validation error | TODO | TODO | TODO |
| Forbidden / approval needed | TODO | TODO | TODO |
| Network disconnect / stale stream | TODO | TODO | TODO |
| Cancelled / unknown effect outcome | TODO | TODO | TODO |

## 4. API and event contract — proposed, not implemented

| Field | Value |
|---|---|
| Existing operation to reuse | TODO |
| Is new route truly necessary? | UNKNOWN; must prove against actual registered routes |
| Proposed method/path | `TODO` |
| API version | Existing `/api/v1` unless approved otherwise |
| Path/query/body Zod schema | TODO with field bounds |
| Success DTO / envelope | TODO, reuse existing format |
| Error tags / status mapping | TODO |
| Authorization / ownership / CSRF | TODO existing policies |
| Idempotency / version / receipt | TODO or N/A with reason |
| SSE/WS event types and cursor | TODO or N/A with reason |
| Rate/budget/timeout | TODO or N/A with reason |
| Backward-compatibility policy | TODO |
| Shared contract/typing owner | TODO |

**Sample request / response:** TODO (illustrative until grounded and approved). Do not store tokens, secrets, raw credentials, or user data in examples.

## 5. Exact code-change manifest and ownership

All paths marked `CANDIDATE` require source confirmation. Paths not in the approved manifest are read-only until amended.

| Layer | Existing path (verify) | Action | Assigned agent | Approval / test |
|---|---|---|---|---|
| API/DTO | `backend/src/...` or existing backend contract | REUSE / EXTEND / NEW | TODO | TODO |
| Express mount/route | `backend/routes/v1/<domain>.routes.js` | REUSE / EXTEND / NEW | TODO | TODO |
| Service | `backend/services/<domain>Service.js` or `backend/src/<domain>/...` | REUSE / EXTEND / NEW | TODO | TODO |
| Repository/DB | Existing Drizzle/Zod/query owner | REUSE / EXTEND / NEW | TODO | DB blocker |
| Migration | `backend/migrations/<next>.sql` only if truly necessary | NONE / PROPOSE | TODO | Separate named-target approval |
| Agent/MCP caller | Existing tool/scheduler/runner | NONE / EXTEND | TODO | TODO |
| Frontend typed client | Existing `api.*`/`executionApi.*` and types | REUSE / EXTEND | TODO | TODO |
| Frontend state/hook | Existing feature state owner | REUSE / EXTEND | TODO | TODO |
| UI | `frontend/sirona-next/src/features/...` | REUSE / EXTEND | TODO | Preserve UI freeze |
| Backend tests | Existing focused suite | EXTEND | TODO | TODO |
| Frontend/browser tests | Existing test harness | EXTEND | TODO | TODO |
| Route ledger | `docs/frontend-route-coverage.md` | UPDATE WHEN VERIFIED | Integrator | No invented active route count |
| Phase ledgers/handoff | Existing docs | UPDATE AFTER EVIDENCE | Integrator | Owner status truthful |

### Frozen integration contract

- Contract reviewer: TODO
- Approved request schema revision/hash: TODO
- Approved response schema revision/hash: TODO
- Allowed compatibility changes: TODO
- Conflict protocol: any agent proposing a contract change **stops and asks the integrator**.

## 6. Approvals and prohibited actions

- [ ] Owner approved exact protected paths / operation: REF TODO.
- [ ] Any SQL **authoring** approval: N/A or REF TODO.
- [ ] Any SQL **application** approval, exact database and checksum: N/A or REF TODO.
- [ ] Paid inference approval and maximum budget: N/A or REF TODO.
- [ ] OS/Docker image/host privilege approval: N/A or REF TODO.
- [ ] Working data / activation / release approval: N/A or REF TODO.
- [ ] Any expanded scope has been re-approved: N/A or REF TODO.

Do not infer approval from this file, a proposed approval file, a phase title or an agent's own update.

## 7. Ordered implementation and dependencies

| Work ID | Task | Depends on | Allowed changes | Proof | Status |
|---|---|---|---|---|---|
| 00 | Read-only source audit, route/DB check | None | None | owner map + hashes | proposed |
| 01 | Draft/verify shared contract | 00 | contracts only after approval | DTO/error tests | proposed |
| 02 | Implement domain service + repository | 01 + approvals | domain-owned files | service tests | proposed |
| 03 | Register thin route + permissions/stream | 02 | router/composition | actual HTTP tests | proposed |
| 04 | Connect typed frontend client and state | 01,03 | client/state | client tests | proposed |
| 05 | Connect real UI/entry points | 04 | scoped React components | browser test | proposed |
| 06 | Cross-layer E2E + failures/restart | 03,05 | tests only | real transcript | proposed |
| 07 | Evidence, review, ledgers, handoff | 06 | docs and evidence | acceptance packet | proposed |

## 8. Acceptance criteria — must be executable

- [ ] AC-01 A real supported app action calls the expected registered backend operation.
- [ ] AC-02 Backend validates requests and rejects malformed, foreign, stale or unauthorized input.
- [ ] AC-03 Canonical service returns correct durable result without duplicate business logic.
- [ ] AC-04 The expected persisted record/receipt/event is visible in approved integration target (or explicitly N/A).
- [ ] AC-05 Frontend shows real success, loading, empty, error and disabled states.
- [ ] AC-06 Failure, cancellation, restart, reconnect or unknown outcomes are handled where relevant.
- [ ] AC-07 Unrelated chat, providers, terminal, workspace and UI remain unaffected.
- [ ] AC-08 Actual route count and typed client manifest are reconciled; no orphan endpoints.
- [ ] AC-09 Source-bound evidence, approval scope and rollback are documented.

## 9. Test matrix

| AC | Test file / command | Live vs mocked boundary | Data target | Expected | Actual / evidence | Status |
|---|---|---|---|---|---|---|
| AC-01 | TODO | Real UI + real local HTTP | TODO | TODO | NONE | UNVERIFIED |
| AC-02 | TODO | Real router/auth | TODO | TODO | NONE | UNVERIFIED |
| AC-03 | TODO | Service | TODO | TODO | NONE | UNVERIFIED |
| AC-04 | TODO | Real authorized DB if relevant | Guard required | TODO | NONE | BLOCKED until DB reconciliation |
| AC-05 | TODO | Real browser/Electron | TODO | TODO | NONE | UNVERIFIED |
| AC-06 | TODO | Real process/stream if relevant | TODO | TODO | NONE | UNVERIFIED |
| AC-07 | TODO | Regression tests | TODO | TODO | NONE | UNVERIFIED |

Do not mark `PASS` from screenshots alone, mocks alone, compile success alone, or tests from a different commit/source hash. Record the actual command, exit code and artifact path.

## 10. Rollback / recovery

- Safe before-change source checkpoint and exact file hashes: TODO.
- Feature flag or admission control (default-off where applicable): TODO.
- In-flight operation drain, leases, unknown effect reconciliation: TODO or N/A.
- Data/SQL policy: never drop databases or auto-downgrade/restores; preserve durable journals.
- Owner of selective rollback: TODO.

## 11. Completion report (fill **after** verification)

**Status:** PROPOSED / BLOCKED / IMPLEMENTED-NOT-VERIFIED / ACCEPTED-SCOPED / FAILED.

| Requirement | Backend source | Contract/client | UI source | Test | Evidence | Verdict |
|---|---|---|---|---|---|---|
| TODO | TODO | TODO | TODO | TODO | TODO | UNVERIFIED |

**Files changed:** TODO  
**Approval reference:** TODO  
**Routes added/reused:** TODO  
**Database version/target:** TODO  
**Regression summary:** TODO  
**Unverified gates/risks:** TODO  
**Updated ledger / handoff:** TODO  
**Owner acceptance (if supplied):** TODO.
