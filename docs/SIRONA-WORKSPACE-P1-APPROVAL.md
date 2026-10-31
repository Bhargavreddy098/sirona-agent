> Approval update 2026-10-28: owner explicitly approved P1 source/dependency/SQL authoring, then 022 on the isolated test DB only. Scoped implementation verified; production migration/activation and P2 not approved. See the P1 report and current ledger. The original request below records boundaries, not permission for a future slice.

# Phase 1 approval scope — approved implementation record

This is a concrete future edit/verification manifest, not an implementation or a
request to bypass Stage 17. P0 must be accepted first. Owner requirement 6 and
AGENTS.md's Stage 17 STOP/protected-service boundaries require separate approval.

## Requested protected changes

1. Existing effect/run/task services: durable operation keys, transactionally ordered
   event allocation and run/task epoch fencing; no replacement execution engine.
2. Existing tool/governance boundary: explicit trusted worker identity and exact
   grant/approval revalidation on dispatch/resume; preserve contract-bound approval.
3. Existing run event endpoint: paginated replay plus committed live events, existing
   Last-Event-ID semantics, disconnect cleanup and no database connections held idle.
4. New mandatory Drizzle ORM + Zod integration: typed queries over existing pg client/
   pool ownership and real validation boundaries. Existing JS migrates only as needed.

## Exact edit allowlist

Existing backend files:
- services/executionService.js
- services/agentWorkerService.js
- services/workflowOrchestratorService.js
- services/toolRuntimeService.js
- services/governanceService.js
- routes/v1/execution.routes.js
- routes/v1/tools.routes.js
- package.json and package-lock.json
- scripts/checkSyntax.js, scripts/checkStatic.js, scripts/checkModules.js and
  jsconfig.json only for preserving JS checks and adding compiled TS coverage;
  never weaken checking, exclude failing code or modify unrelated tooling.

New backend files:
- tsconfig.workspace.json
- src/db/schema.ts, src/db/transactionAdapter.ts
- src/execution/effectJournal.ts, src/execution/runEventStore.ts
- src/security/executionPolicy.ts
- tests/executionReliability.test.ts
- tests/executionAuthorization.test.ts
- tests/typedDatabaseBoundary.test.ts
- migrations/022_execution_reliability.sql (number rechecked before creation)

Documentation/evidence: existing plan/ledger/ownership matrix plus P1 evidence directory.
Any required file outside this allowlist is reported with its reason before editing.

## Dependencies and schema approval

Requested dependencies are drizzle-orm and zod, plus package-local TypeScript build
tooling required to execute/check the new TS. Reuse existing pg and Node test runner;
do not add a second ORM pool, Vitest, queue, orchestrator or state framework in P1.
Resolve and pin compatible versions during the approved slice; report security findings.
Do not adopt Drizzle auto-sync or replace existing SQL migration authority.

Proposed migration 022 only:
- Add nullable effects.operation_key and a partial unique (run_id, operation_key)
  index where the key is non-null; retain all legacy effects.
- Add runs.event_sequence BIGINT, backfill from existing committed run_events under
  a controlled write boundary, and allocate subsequent sequence values transactionally.
- Reuse existing runs.epoch and tasks.lease_epoch/holder/expiry fields for fencing.
- No drops, resets, duplicate product tables, auth/schema redesign or data deletion.

Before applying, present exact SQL, lock/backfill behavior, test evidence and rollback
checkpoint. Permission to edit protected source/create SQL does NOT authorize applying
it to working sirona. Target-specific migration application requires explicit approval.

## API and security consequences

No new route namespace or new filesystem/terminal/guest authority. Preserve existing
methods and envelopes. Add optional request idempotency where applicable; new internal
mutating worker calls require trusted identity and fencing tokens. Existing unauthorized
or stale behavior is rejected and documented, not retained as compatibility.
Graph/Hyper-V/provider/UI changes are out of scope. Native chat and discovery must pass
regression checks without sending live-provider calls merely as fixture evidence.

## Verification and acceptance

Use the approved disposable target sirona_workspace_p0_test_20261028 only, with a
test-target guard before writes. Never run destructive/provider-mutating suites on sirona.
- Real PostgreSQL/API path proves Drizzle transaction commit/rollback and Zod validation.
- 100 concurrent event writers, unique ordered replay/live events and reconnect cursors.
- Concurrent duplicate operation IDs produce one effect; changed inputs under one ID fail.
- Crashes before dispatch, after dispatch and before receipt: reconcile unknown outcomes;
  no exactly-once guarantee for arbitrary external commands, no blind retry.
- Stale run/task epochs, revoked grants, expired/changed approvals and foreign workspace fail.
- Existing valid route, standalone/project session, provider ID, SSE/cancel/retry contracts pass.
- All product changes remain within approved scope, no weakened checks, scoped lint/build/tests.

## Rollback and requested decision boundary

Capture new source/schema/backup before P1. Disable new dispatch, drain/fence workers,
reconcile unknown effects and retain additive journals/columns. Revert adapters only
when no incompatible in-flight effects remain; never drop migration data on rollback.

After P0 acceptance, request explicit approval for this protected-source/dependency
and migration-authoring scope. Ask separately before migration application, privilege,
or new architectural scope. Overall target approval is not a Stage 17 STOP override.
