# P1–P5 frontend/backend wiring — exact protected slice

Owner request: continue and wire backend and frontend properly. The frontend is being extended through existing APIs. This proposal covers the additional protected API work needed to remove two actual integration blockers; it is not a migration or production-activation request.

## Observed blockers

1. `graphRuntime.ts` durably emits `graph.approval_required`, but HTTP only supports creating **contract** approval requests. Existing P5 tests create effect requests through `GovernanceService` directly. A renderer cannot legitimately substitute for this missing owner.
2. Terminal creation requires a worker-owned task fence. Existing frontend transport accepts that contract, but no UI-facing owner acquires, renews and releases the lease. The renderer must not mint or receive worker lease authority.
3. There is no scoped readiness projection explaining disabled execution before a user attempts it.

## Exact proposed backend files

| File | Change |
| --- | --- |
| `backend/routes/v1/execution.routes.js` | Add a human-session, CSRF-protected request endpoint for an existing durable prepared-action event. Retain existing routes and DTOs. |
| `backend/routes/v1/workspace.routes.js` | Add scoped read-only readiness and terminal preparation/open/input-preparation routes. Retain existing terminal and workspace contracts. |
| `backend/src/workspace/frontendController.ts` (new) | Thin application owner reusing current project/root/grant checks, GovernanceService, P1 task leases, P3 CanonicalTerminal and P5 prepared events. No competing policy or execution engine. |
| `backend/src/orchestration/graphRuntime.ts` | Only if necessary: expose trusted resolution/validation of the current prepared action from existing pinned graph/checkpoint state. Do not change delegation limits or graph algorithms. |
| `backend/services/governanceService.js` | Only the optional same-transaction client needed to create a request while holding its run/preparation locks. Preserve existing callers and nonce/digest decision behavior. |
| `backend/tests/frontendWorkspaceBoundary.test.ts` (new), `backend/tests/frontendWorkspace.test.ts` | Free real PostgreSQL, HTTP/SSE and Docker/PTY coverage with disposable project roots. |

Existing ExecutionService remains the task/lease owner. It is reused rather than replaced. If implementation discovers it needs a materially different lease or schema contract, stop that part and report it.

## New routes under `/api/v1`

| Route | Input / purpose |
| --- | --- |
| GET `/projects/:projectId/workspace-readiness` | Read-only flags, applicable qualification/access state and safe denial reasons; never activates anything. |
| POST `/runs/:runId/approval-requests` | `{ eventSequence: decimalString }`; the server resolves and validates the exact current durable action. The client cannot supply an arbitrary digest, action or authorization claim. |
| POST `/projects/:projectId/terminal-preparations` | `{ runId, rootRef }`; prepare only the fixed trusted-local guest shell, allocate its bounded server-owned task lease and return a preparation reference/action summary. |
| POST `/projects/:projectId/terminal-preparations/:preparationId/open` | `{ approvalId }`; consume exact human approval and open through CanonicalTerminal using server-owned fencing. |
| POST `/terminals/:terminalId/input-preparations` | Bounded `{ data }`; prepare a one-use input digest/key and durable approval-required event. Existing authenticated WebSocket input remains subject to exact approval. |

Terminal preparation emits a durable approval-required event consumed through the same run approval-request endpoint. No arbitrary shell, SQL, filesystem IPC or worker-fence endpoint is added.

## Required security and lifecycle behavior

- Authenticate native human session; require matching workspace/project/run ownership and CSRF for every mutation. Deny cross-scope, unknown inputs, stale revisions, expired sessions and worker impersonation.
- Derive exact commands/patches from current durable prepared state. Validate contract, run epoch, task, root, digest and current policy. Reject superseded events, consumed approvals and mismatched action kinds.
- Keep nonce proofs out of saved lists/logs/localStorage. Return proof only for its explicit request. A lost response must not cause automatic request/effect replay; define an explicit safe recovery outcome rather than persisting plaintext nonce proofs.
- Use existing PostgreSQL tables, transactions, leases, fencing, events and receipts. No schema changes or production Map fallback.
- Acquire/renew/cancel/release terminal task leases in trusted code. Cap lifetime and active workers, fail closed on renewal failure, and recover unknown workers through the existing P3 path. Never invent a recovered PTY.
- Preserve Docker + WSL2 trusted-local scope, default-deny networking, existing filesystem isolation and one-worker limit. No host execution fallback, privileged install, WSL shutdown or Docker prune.
- Keep orchestration and Docker production flags at their current OFF values. No paid calls, working-database changes, migrations, commits, pushes or deployment.

## Frontend scope

Continue using the existing typed transport and compact light shell. Connect prepared-action requests to a review dialog showing exact command/patch, digest, expiry and cost before recording the human decision. Add a terminal surface only through the prepared/open/input contracts; use the already selected xterm.js technology with reviewed/pinned official packages. Readiness and denials must be visible. No fake agents, terminal output, model responses or verification results.

Monaco editing, React Flow visualization and the remaining P6–P8 technology gates are not automatically marked complete by this slice.

## Acceptance and rollback

Free tests must exercise real canonical HTTP, isolated PostgreSQL and Docker/PTY: cross-workspace denial, CSRF, stale event/epoch/root rejection, nonce/digest replay, concurrent request/preparation limits, lease renewal loss, actual approved PTY input/output, confirmed close, cancellation while execution is pending, restart recovery and unchanged existing chat/provider contracts. Browser checks must cover loading/empty/error/denied/running/confirmed states, keyboard dialogs, 390px layout and SSE cursor replay.

Only `sirona_workspace_p0_test_20261028` may be mutated by tests. Working `sirona` receives no DDL or test writes. Record file hashes, test outputs and screenshots. Restore only this slice from a before-change source snapshot if needed; do not reset the repository or roll back applied migrations.

**Approval status: approved by the owner on 2026-10-29: “Approve this scoped backend/frontend wiring.” Implementation is limited to the slice above. No migration, working-data write, paid call or production activation is authorized.**

Implementation dependency addendum (reported before applying): `backend/foundation/admission.js` needs only the approved method/path entries, preserving default-deny. `backend/services/executionService.js` needs an additive internal `reservedTerminal` option: create a blocked reservation and let only an explicitly targeted trusted terminal owner claim that namespace after exact approval. Ordinary claims exclude the new reserved namespace; their existing behavior otherwise remains unchanged. This stays in the existing task/lease owner and does not add a lease framework or schema. Source baselines for both files are saved with the wiring rollback checkpoint. The public capability scope remains the five approved routes above.

Verification repair record, 2026-10-30: the real P5 canonical journey completed but exposed missing project attribution in its model-call records. Within the already assigned P5 integration repair, `backend/src/orchestration/activityAdapter.ts` now passes its validated `context.projectId` to the provider's existing `projectId` parameter. This was reported before applying; no new provider parameter, provider-service modification, migration or paid call was introduced. The before-change activity adapter is retained in the private rollback checkpoint. Final free tests and boundaries are recorded in the wiring report; this note does not grant new authority.
