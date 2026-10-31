# Phase 1 — implementation and scoped verification

2026-10-28. **P1 scoped implementation verified on the approved isolated database.**
This is not full-repository static qualification, production rollout, Hyper-V
qualification or authority to start P2. Existing full-static legacy failures are
explicit below; no failure was hidden by deleting code/tests or weakening checks.

## Authorization and database boundary

Owner explicitly approved the protected P1 edit/dependency/SQL-authoring scope, then
separately approved migration 022 **only** on sirona_workspace_p0_test_20261028.
[Migration evidence](integration/evidence/workspace-p1/migration-022.json) binds the reviewed SQL
SHA-256. [Read-only target verification](integration/evidence/workspace-p1/database-targets.json)
confirms working sirona still has 001–021; isolated test target has 001–022.
No production migration, data reset, new privileged installation or P2 work occurred.

## Implemented behavior

- Mandatory Drizzle uses the existing pg transaction client, not a second pool or
  ORM-owned transaction. Real effect inserts, event inserts and rollback are tested.
- Mandatory current Zod validates tool requests, identities, fencing and keyed effects.
  It is installed as zod-v4 (npm:zod@4.6.7), avoiding the installed OpenAI SDK's optional
  Zod-3 peer conflict without upgrading/breaking that SDK. Audit: zero vulnerabilities.
- Pinned Drizzle 0.45.4, TypeScript 6.0.3 and typings. Backend TypeScript 6 retains the
  compiler API needed by existing analyzers; new source is strict, separately emitted
  into ignored dist-workspace. Existing JS services retain their paths/interfaces.
- Existing effects store operation_key with partial run/key uniqueness. Same logical
  request reuses its immutable receipt; different inputs/revision/authority conflict.
  Pending intent is safe to retry; dispatched-without-receipt returns unknown and
  blocks redispatch/reclaim. A committed receipt reconciles a lost settlement.
  Arbitrary external commands are NOT claimed exactly-once.
- Event writers lock the canonical run, use the backfilled counter with legacy-counter
  reconciliation, and insert atomically on the borrowed transaction. All direct event
  writers in the approved services use the same allocator. 100 concurrent writers pass.
- Claims obey run state, max attempts, DAG readiness and outstanding-effect safety.
  Completion/renewal check run epoch, task epoch, holder and expiry. Worker tool calls
  carry authenticated context, stable logical-call ordinal and fencing; retries cannot
  silently bind changed inputs to an earlier operation.
- Project/session/token authority, exact workspace root, scoped/expiring/revoked grants
  and current policy are checked at dispatch. HTTP callers cannot provide their own
  trusted session. Connection/receipt/run projections and mutations enforce workspace
  scope. CSRF and existing missing-input error precedence remain intact.
- Contract approvals are bound to project, exact digest, current policy and one run;
  expiry/revocation/changed digest prevent resume/dispatch. Concurrent nonce decisions
  cannot overwrite an already committed decision.
- Run SSE paginates replay, tails committed events, honors Last-Event-ID, handles
  backpressure, revocation, cursor bounds and disconnect cleanup without holding an
  idle database connection for the lifetime of a stream.
- Unqualified project mutation and host fallback are fail-closed. A host process probe
  cannot qualify a managed Hyper-V guest. Readiness may inspect existing adapters but
  only a genuinely qualified managed_hyperv backend can admit later execution. P3 must
  implement/requalify that boundary before coding commands or project mutations run.

## Compatibility and build/rollout

No route namespace, renderer, UI design, provider discovery, native model ID, streaming
format or conversation schema was replaced. No unrelated source was removed.
New keyed tool requests use Idempotency-Key and optional workerFence, while valid
legacy projections and non-mutating requests retain their envelopes. Unauthorized
and unqualified behavior is intentionally rejected, not preserved as a bypass.

Build backend before launching Electron from a fresh checkout:
`npm --prefix backend ci --ignore-scripts` then `npm --prefix backend run build:workspace`.
Backend npm start/dev/test pre-scripts also build the typed modules. P8 packaging must
include the compiled backend modules. Do not use the unrelated root package commands.

SIRONA_EXECUTION_RELIABILITY defaults off for staged compatibility. New keyed reliability
admission requires migration 022; absent lineage fails 503, never auto-migrates.
The test fixture explicitly enables it only against the named isolated DB. Enabling
the flag or applying SQL to working sirona is not approved by scoped test success.

## Verification results

| Evidence | Result |
| --- | --- |
| [Strict TS build + real P1 HTTP/PostgreSQL/filesystem suite](integration/evidence/workspace-p1/integration-tests.txt) | 17 passed; zero failed/skipped/cancelled |
| [Existing configuration/runtime/chat/project/execution regression suite](integration/evidence/workspace-p1/regression-tests.txt) | 72 passed; zero failures |
| Scoped oxlint over changed services/routes/new TS/tests | PASS, zero warnings/errors |
| Node syntax scan | 163 JS roots, zero failures |
| Frontend typecheck, lint, five SSE tests and production build | PASS; existing large-bundle advisory retained |
| [Dependency audit](integration/evidence/workspace-p1/dependency-audit.json) | Zero vulnerabilities |
| [Product-source preservation](integration/evidence/workspace-p1/source-after.json) | PASS; both frontends unchanged, root package unchanged, changes within approval |
| [Active module graph](integration/evidence/workspace-p1/module-check.json) | No active production-graph resolution/cycle failures |
| [Full JS static scan](integration/evidence/workspace-p1/full-static.txt) | NOT GREEN: existing legacy diagnostics remain |
| [Same-compiler pre-P1 comparison](integration/evidence/workspace-p1/static-baseline-comparison.json) | 43 baseline → 39 current; zero newly introduced diagnostics |

The full module inventory also retains unresolved imports in retired/unmounted legacy
files and a historical route-inventory test. Those are reported, not excluded from
the full scan. New TS passes strict checking; compiler output is excluded only from
duplicate JS semantic checking, not from its own source check or module/syntax checks.
No mock successful inference, guest, model response or execution was used as proof.
Controlled upstream errors in existing tests are fault injection only.

## Baseline qualification debt — not waived

The scoped phase criteria pass. Final production qualification remains incomplete:
- Retired S3/auth/upload/legacy route sources have undeclared/unresolved imports.
  Audit ownership/references before any future retirement/dependency restoration;
  deleting tests or adding unused packages just to green a scan is prohibited.
- Existing provider/agent/sandbox JSDoc/interfaces and historical test fixtures have
  static diagnostics. Their runtime paths were not rewritten in P1 to clear warnings.
- Provider type contracts are assigned to P4, agent contracts to P5, sandbox contracts
  to P3, and the remaining repository/test migration cleanup to P8 (or a separately
  approved earlier bounded remediation slice). Full checks must be green before P8
  production acceptance. No global verification success or Stage 17 requalification
  is claimed here.

## Preservation recheck and cleanup

An initial filesystem read reported frontend/sirona absent. At the owner's request
both normal and host views were rechecked: both frontends exist, all 13 older-frontend
source/config hashes match P0, and no restoration was performed. Cause of the earlier
observation is unproven; do not attribute deletion to the owner or another agent.

Cleanup removed only two generated duplicate P0 .log transcripts after verifying exact
hash equality with retained .txt copies. [Cleanup record](integration/evidence/workspace-p1/cleanup.json).
Archives, private backups, old source, unrelated files and build output needed at
runtime were retained. No speculative recursive cleanup or Git reset occurred.

## Rollback and next gate

Pre-P1 approved source/manifest/lock bytes are in the ignored
integration/evidence/workspace-p1/private/source-before.json.gz; hashes in source-before.json.
The P0 encrypted database archive remains available. Drain/fence new dispatch,
reconcile unknown effects and revert only reviewed compatible code. Retain additive
schema/journal rows; no destructive down migration or automatic old-DB restore.

P2 remains unstarted and needs its own protected credential/frontend-boundary and
migration-authoring approval. Production 022 application/activation also needs named
target approval and an execution-writer maintenance window. P3 remains blocked on
Windows 11 Home Single Language / absent Hyper-V management service.

Technical references used for implementation:
- https://orm.drizzle.team/docs/get-started-postgresql (borrow existing node-postgres client)
- https://zod.dev/basics (schema parsing and safe validation failures)
