# P5 implementation plan for OpenCode

2026-10-29. Status: proposed implementation contract, not implementation or migration approval. This corrects the earlier P5 draft. P4 code/evidence has been reviewed; the owner must explicitly approve this P5 slice before protected changes begin. P5 production activation and P6+ remain outside scope.

## 1. Outcome and preserved boundaries

Deliver a real LangGraph.js workflow that takes an existing approved project run, decomposes bounded tasks, delegates to independent specialists, joins their results, pauses for exact approvals, executes through the existing trusted-local Docker broker, obtains independent verification, and resumes safely after process death without blindly repeating effects.

Keep Node/Express, existing PostgreSQL authority, `/api/v1` contracts, P4 providers/usage, P2 DPAPI, P3 runtime/patch/terminal, current compact light frontend and directory structure. Do not put graph scheduling into ordinary standalone-chat turns. Do not introduce a second orchestrator, database, provider stack, approval engine or verification authority.

LangGraph.js is mandatory; TypeScript adapter files are explicitly part of this proposal. “Reuse services” means adapters call the existing owners and make necessary approved integration changes, not that all existing service files must remain byte-for-byte unchanged. Preserve their qualified behavior with regression tests.

Local-only release boundaries remain: no host command fallback, arbitrary host writes, commits, pushes, deployments, remote executors or implicit network permissions. The Home profile covers trusted local projects, not hostile-code/VM isolation or native Windows guest builds.

## 2. Repository facts that the implementation must honor

Observed source, not proposed tables:

| Existing authority | Actual shape / implication |
| --- | --- |
| `runs` | `project_id`, contract/plan/snapshot references, state, epoch, budgets and version already exist |
| `tasks` | Run-scoped tasks with unique `(run_id, step_key)`, dependencies, attempts, deadlines and lease fencing already exist |
| `agent_sessions` | Existing `id`, `run_id`, `task_id`, role/state/capabilities/deadline/usage fields; reuse for parent/specialist identities |
| `run_checkpoints` | `id`, `run_id`, `sequence`, `epoch`, `state_digest`, `state_data`, `created_at`; no `session_id` or `status` |
| `effects` | Existing permanent operation keys, approval/receipt references and pending/dispatched/completed/unknown lifecycle |
| `run_events` | Existing durable ordered events and replay; reuse for graph/task/agent projections |
| `specialists` | No such table exists; do not write a foreign key to it or create a competing specialist registry |

Inspect `backend/migrations/007_durable_execution_tasks_effects.sql`, 022 and current schema before SQL authoring. Do not add `specialist_id`, `delegation_nonce` or `delegated_at` to every checkpoint merely because the old draft listed them.

Important existing integration gaps to inspect before wiring execution:

- `ExecutionService.saveCheckpoint` currently allocates sequence under a run lock but converts BIGINT values to `Number`; the graph adapter must preserve decimal-string/BIGINT identity and add focused regression coverage if this helper needs adjustment.
- `agentWorkerService.js` still contains legacy `SandboxManager.execute` calls for diff/test paths. Do not enable those blocked paths or fabricate their output. Route the needed workflow activities through the P3 broker with scoped identity, root grant, exact approvals and fencing.
- `workflowOrchestratorService.js` has older readiness/orchestration paths. Select the qualified Home profile through its real admission port, not a renamed Hyper-V check or Docker reachability alone.
- `reconcileTurns` handles chat messages/turn leases. It is not a LangGraph checkpoint or effect-recovery engine.

## 3. Approval gates

| Gate | What an explicit approval covers | Still excluded |
| --- | --- | --- |
| A: P5 implementation | Listed source/dependency/test changes, isolated qualification, bounded real-model calls within an owner-approved test budget; SQL authoring only if specified | Applying SQL anywhere; production activation; P6+; UI redesign |
| B: isolated migration | Exact reviewed versioned SQL file/checksum, existing-data preflight, rollback plan and database named `sirona_workspace_p0_test_20261028` | Working `sirona`, other databases, role/extension/cluster changes |
| C: production rollout | Separate later backup/compatibility/activation proposal after release qualification | Not granted by A, B, successful tests or this plan |

The current request is to prepare a plan. No gate is approved by writing or reading it. If A is approved before B, implement and test non-DDL slices, author the concrete migration if authorized, then stop dependent database tests until B is approved. Do not loosen a database invariant to avoid the gate.

Use server-controlled `SIRONA_ORCHESTRATION_ENABLED=false` by default. Isolated test harnesses may enable it only after asserting their exact database. Do not add a Settings toggle in P5; workspace UI belongs to P7 and production activation remains separate. Preserve `SIRONA_TRUSTED_LOCAL_DOCKER_ENABLED=false` in the working installation.

## 4. Exact proposed files and owners

Inspect current contents/callers before editing. A missing file is a proposed addition, not a claim of implementation.

| Files | Assigned responsibility |
| --- | --- |
| `backend/package.json`, `backend/package-lock.json` | Pin qualified `@langchain/langgraph`; add only directly imported required companion packages after checking peer/version/license/security compatibility |
| `backend/src/orchestration/graphContracts.ts` (new) | Strict Zod schemas for graph identity/state, agent assignments, bounded outputs, limits and pinned revisions |
| `backend/src/orchestration/workspaceGraph.ts` (new) | Actual LangGraph graph, conditional planning/delegation/join/approval/execute/review/repair/verify transitions |
| `backend/src/orchestration/checkpointAdapter.ts` (new) | Durable LangGraph saver contract over existing PostgreSQL checkpoint authority; namespace, pending writes, serialization, digest and version checks |
| `backend/src/orchestration/delegationService.ts` (new) | Atomic bounded specialist/task admission using existing runs/tasks/agent_sessions, typed model output and exact parent identity |
| `backend/src/orchestration/activityAdapter.ts` (new) | Canonical model/tool/patch/verification calls and stable effect identity; no direct effects in graph reducers |
| `backend/src/orchestration/graphRuntime.ts` (new) | Explicit runtime owner: start/resume/pause/cancel/shutdown, authentication context in trusted memory, recovery classification and fixed-version dispatch |
| `backend/services/executionService.js` | Necessary same-client checkpoint/CAS/BIGINT helpers, graph-aware pause/resume invariants; preserve legacy run behavior |
| `backend/services/workflowOrchestratorService.js` | Existing project workflow entrypoint selects graph for new opted-in runs after canonical preflight; retain legacy path for legacy runs |
| `backend/services/agentWorkerService.js` | Reuse claim/renew/fence/finish; adapt only needed activity paths away from unqualified legacy sandbox calls |
| `backend/services/agentExecutionEngine.js` | Only necessary bounded model/agent port integration, validated output and cancellation; no new provider implementation |
| `backend/services/planningContractService.js` | Reuse existing normalized plans/contracts; modify only if a demonstrated adapter blocker requires a compatible change |
| `backend/services/verificationService.js` | Bind independent verification to exact artifact/criterion/environment and actual qualified guest execution |
| `backend/routes/v1/execution.routes.js` | Pass trusted authenticated request context and dispatch existing run control routes to their pinned engine; no new public adapter/permission switches |
| `backend/foundation/production.js` | Own graph lifecycle only through existing startup/shutdown ownership; no import-time workers/listeners |
| `backend/src/db/schema.ts` | Only necessary typed projections for existing or separately approved schema; no auto-sync |
| `backend/migrations/<next>_langgraph_checkpoint_integrity.sql` (conditional new file) | Exact number and contents determined after current migration/data preflight; never edit applied SQL |
| `backend/tests/{graphCheckpoint,delegationPolicy,orchestrationRecovery,orchestrationWorkflow}.test.ts` (new) | Real persistence, concurrency, scope, model/guest/effect/recovery acceptance |
| `docs/` current plan/approval/ledger/technology/handoff/route matrix and P5 report | Record authority, actual progress, source/evidence and next gate |

P4 provider files and ordinary `conversationTurnCoordinator.js` are outside the intended P5 edits. If an unavoidable blocker requires changing them, present the exact reason/diff scope before proceeding. No frontend source edits are planned.

Dependencies: LangGraph is the only newly selected orchestration engine. Do not install Mastra, another workflow engine, Redis/BullMQ infrastructure, LangSmith cloud services, a parallel SQL saver database or LangChain retrieval features for this phase. Use the existing provider adapter for model calls. Review current official package/API documentation and pin compatible versions before installation; preserve disabled install scripts and strict engine/peer checks.

## 5. Delegation and resource policy

These are proposed P5 qualification defaults for owner review; they do not silently expand current policy. Existing stricter contract/grant/provider limits win.

| Limit | Proposed rule |
| --- | --- |
| Delegation topology | Parent → specialists only; specialists cannot delegate, promote themselves or appoint approvers |
| Parallel specialists | At most 3 per run; initially at most 3 active across the Home runtime as well |
| Repeated delegation | Parent may schedule further tasks after slots free; no once-per-run restriction |
| Total delegated tasks | At most 12 per run, including delegated reviews/repairs; durable counter, not reset by restart |
| Critique | At most 2 rounds, or tighter existing policy |
| Repair | At most 2 bounded repair rounds, within the same approved scope; changed scope requires revision/reapproval |
| Run deadline | At most 30 minutes of elapsed wall time, or tighter contract deadline; persists across restarts |
| Specialist/model deadline | At most 120 seconds per invocation, bounded by remaining run/contract/provider limits |
| Guest execution | One active Home guest globally, as P3 already enforces; parallel reasoning does not mean concurrent Docker workers |
| Spend | Explicit positive approved run/test ceiling, conservative atomic reservations and once-only reconciliation; no automatic budget increase |
| Context/output | Explicit bounded token/output caps per task using qualified provider limits; artifact refs instead of dumping repositories |

Slot admission must use a short PostgreSQL transaction with deterministic lock ordering, run scope/fence checks and a global Home admission lock where needed. Count actual active/unresolved specialist records. Commit task, agent, durable delegation manifest and event atomically. Never hold a transaction over model/network/guest calls.

Expired leases do not prove an old worker or paid model call stopped. Unknown calls retain cost reservations and appropriate blocked/active accounting until safely reconciled. Do not free slots and redispatch blindly after a crash.

Tests must prove both: a fourth *concurrent* specialist is denied, and a fourth *sequential* delegation succeeds after a slot is safely released, provided total/deadline/budget limits allow it.

## 6. Persistence design: extend existing truth, not the old imaginary schema

### Run and engine binding

Bind a new opted-in run to `engine=langgraph`, graph/schema/serializer versions, run/thread ID, pinned contract/plan/policy/snapshot, initial limits and durable counters. Use an immutable initial graph manifest checkpoint plus validated references to existing tasks/agents/effects/artifacts. A run cannot change engines by flipping an environment flag.

For this phase, use a stable thread ID derived from the existing run UUID. Checkpoint lookup must resolve through run → project → workspace authorization; a supplied graph thread ID is not authority. Do not scope an execution checkpoint to a nonexistent `session_id` field. Revalidate current authenticated access and fencing before loading or mutating a graph.

### LangGraph saver implementation

1. Qualify the pinned SDK's actual saver interface before implementing it. Round-trip all required checkpoint/channel/version/metadata/parent fields, namespace, task-level pending writes and interrupted-task state. Implement the required lookup/list/write semantics; no stubbed empty returns.
2. Persist records within a versioned `state_data.sironaGraph` namespace in existing `run_checkpoints`, using explicit record kinds for full checkpoints and pending writes. Keep compatibility with existing non-graph checkpoints; don't overwrite them.
3. Use bounded validated serialized payloads, stable logical record identities, an explicit serializer version and artifact refs for large task outputs. Never deserialize arbitrary executable types or store session/provider secrets or hidden reasoning.
4. Use the existing checked-out pg client and run lock to allocate sequence and commit state/events. Do not nest another pool transaction behind the port. Preserve 64-bit values as strings/BIGINT; no precision-losing conversion.
5. Read and verify the exact existing digest contract (run/sequence/epoch/state), plus namespace/schema/version and referenced task/agent/artifact scope. A SHA-256 digest detects corruption; it is not an authenticated approval or a defense against a compromised database administrator.
6. Same logical checkpoint/pending-write delivery with identical input is idempotent; conflicting input fails closed. Support successful sibling-node pending writes so a failed branch does not cause those siblings to re-execute.
7. Do not expose destructive thread deletion as a recovery action. If the SDK contract needs deletion support, it must be explicitly unsupported/denied in this adapter unless a separate retention policy authorizes it; test the selected graph features accordingly.

Use `agent_sessions` for specialist identity and `tasks` for work. Record parent/child task bindings in the typed durable graph manifest, validating that referenced rows belong to the same run in the same transaction. Do not create a `specialists` table or use JSON role labels supplied by a model as authentication. If concrete concurrency/recovery requirements demonstrate a relational column is necessary, present its minimal scoped FK/index design before SQL authoring/application; do not improvise it mid-implementation.

### Conditional schema gate

First inspect source and database constraints, current migrations and existing checkpoint duplicates. A candidate integrity improvement is a versioned unique index on `(run_id, sequence)` if absent:

```sql
-- PROPOSED ONLY. Not an approved migration or command to execute.
CREATE UNIQUE INDEX uq_run_checkpoints_run_sequence
    ON run_checkpoints (run_id, sequence);
```

Check for conflicting index names/definitions, duplicate rows and supported migration locking before authoring the final SQL. Do not silently delete/deduplicate checkpoints. Namespaced logical-identity indexes must reflect the qualified SDK pending-write semantics; do not add a uniqueness rule that breaks valid SDK updates. Present exact additional SQL if needed.

No new checkpoint columns are preapproved by this plan. The old draft's `specialists(id)`, `(session_id, delegation_nonce)`, checkpoint `status`, and standalone `ADD CONSTRAINT` statements are rejected. Any actual migration application still needs gate B with exact file/checksum and target. Working `sirona` receives no P5 DDL.

## 7. Graph and activity flow

Use this workflow, with explicit conditional transitions and bounded counters:

```text
Canonical preflight and run binding
  -> read existing requirements / normalize approved plan
  -> parent chooses bounded specialist tasks
  -> parallel reasoning fanout (up to 3) and durable join
  -> validate proposals / detect patch or requirement conflicts
  -> independent critique (bounded)
  -> exact human approval where required
  -> serial qualified guest execution / immutable patch preview
  -> separate approved host patch application when required
  -> fresh independent verification of exact candidate artifact
  -> verified completion, or bounded repair, or truthful blocked/failed state
```

Specialists produce validated proposals, evidence or artifact references. They do not mutate host files directly. A model saying “done” is never a completion criterion. Do not add new public execution states casually; map internal graph stages to existing canonical states/events and preserve existing DTOs.

Model and tool activities run through existing owners. Use stable operation identities derived from run, pinned contract, logical task/node/effect and attempt policy—not new UUIDs on transport retries. Reuse committed receipts on replay. A one-time approval nonce cannot be consumed twice; that does not mean an identical transport retry must create a new delegation or be treated as a malicious new action.

Journal paid model activities and their persisted outputs/usage using existing effect/accounting ports. A completed specialist result must be recoverable without repeating the model call. A dispatched call whose outcome is unknown is not automatically retried as if free; retain unknown charges/reservations and reconcile or request a reviewed new attempt.

Use the existing governance engine for policy, grants, immutable approvals and budgets. LangGraph interrupt/resume is workflow control, not permission. On resume, recheck actual current session, project ownership, policy, exact approval digest/revision, root grant, task/run fence, budget and snapshot. Never persist a raw auth token in a graph checkpoint.

After process restart, a run lacking a valid authenticated execution context can become recoverable/blocked pending authenticated resume. Do not manufacture user credentials from session hashes or introduce a worker-authentication bypass to claim unattended recovery.

## 8. Guest changes, review and verification

Reuse P3 snapshot export, strict tar validation, exact owned container bindings, immutable receipts/preview artifacts and Windows native patch broker. Preserve per-command/per-patch approvals. Review results cannot grant filesystem or tool permissions.

Specialists can propose independent patches against pinned bases. Merge them serially in a candidate workspace, validate base hashes and reject conflicts; never overwrite current user edits or edit approved contract bytes. Apply to the host only through the exact P3 patch approval and journal path.

Use `VerificationService` as the criterion authority, with a separate reviewer/verifier identity and a fresh guest/context for required checks. Bind evidence to the exact artifact digest, criterion/suite/environment and run revision. A producer cannot satisfy its own independent-verification requirement. Test a deliberately bad artifact that the producer claims is good; the verifier must reject it. Do not replace verification with another model's opinion or treat unavailable test execution as success.

## 9. API and lifecycle integration

Reuse existing project workflow start and run read/pause/resume/cancel/events routes. Pass authenticated context through internal parameters; no public `adapter`, engine-selection, approval-bypass or arbitrary delegation payload is added in this slice. Inspect route semantics first and update their internal owner wiring only where required.

Start must reach a real graph consumer/runtime owner through production composition. An uncalled exported graph or test-only entrypoint is not integration. Stop/close must stop claims, cancel or quiesce owned work, persist state, reconcile effects and then close resources. No import-time timers or competing long-lived worker loop.

Default-off behavior: legacy/ordinary chat and legacy runs stay on their existing paths. New graph starts are denied while the flag is off. Existing graph runs are never resumed through the legacy engine after flag changes; keep them paused/recoverable or drain explicitly. Disabling starts is not proof an already-running effect stopped.

No frontend/Settings work in P5. The existing event API may expose already supported task/agent/state projections. Any truly necessary new public route/DTO requires a separate concrete contract proposal and approval before editing it.

## 10. Ordered implementation tasks and exit gates

| Task | Dependencies | Deliverable | Required gate |
| --- | --- | --- | --- |
| P5-00 inspect/baseline | This proposal | Actual approved scope, source hashes, current schema/indexes, caller map, P4 integration/evidence/regression baseline, conflicts and rollback checkpoint | Read-only preparation; obtain gate A before edits |
| P5-01 SDK and contracts | P5-00 + A | Pinned LangGraph, strict state/activity schemas, explicit graph/lifecycle ports; inspect saver API and required serialization | Build and SDK conformance tests; no package-only completion |
| P5-02 durable saver | P5-01 | Existing PostgreSQL checkpoint adapter, pending writes, scope/version/digest/idempotency and BIGINT correctness | Real DB round-trip/restart; request gate B first if SQL required |
| P5-03 bounded delegation | P5-02 | Actual parent fanout/join, tasks/agent_sessions/manifest/events, slot/total/deadline/budget enforcement | Concurrent racing fourth admissions denied; sequential reuse works; no nesting |
| P5-04 activities and approvals | P5-03 | Real configured models, journaled output/usage, trusted approvals, serial P3 guest and exact patch application | Real-model and actual guest flows; rejected/revoked/expired authority denies effects |
| P5-05 canonical integration | P5-04 | Existing workflow routes/lifecycle dispatch to pinned graph engine; real pause/resume/cancel/events | Real authenticated HTTP/SSE journey, no alternate security path |
| P5-06 verification and repair | P5-05 | Independent review/verifier; exact artifact binding; bounded repair and merge conflicts | Seeded bad artifact fails; clean artifact passes; limits persist after restart |
| P5-07 crash matrix | P5-02–06 | Real process kill/restart and canonical recovery at effect boundaries | No duplicate committed mutations; unknown outcome stays blocked |
| P5-08 acceptance/handoff | All prior | Exact-source report, safe raw transcripts, hashes, cleanup/lineage proof, ledgers updated | Owner review; stop before P6 and production rollout |

If a necessary interface cannot safely be reused, record the blocker and propose the smallest protected change. Do not implement an unsafe shortcut or quietly reduce the acceptance criterion.

## 11. Required tests: behavior and evidence

Tests must exercise production adapters and real PostgreSQL/guest paths, not reproduce the implementation logic inside assertions. Controlled upstream servers are appropriate for failures; label them separately from real configured-provider inference.

### Checkpoint and scope

- Full SDK checkpoint + pending-write round-trip, namespace and parent lookup/history.
- Restart after one successful parallel sibling and one failed sibling: successful sibling output is reused without a new paid call/effect.
- Different workspace/run, wrong thread binding, revoked identity, stale epoch and incompatible graph/schema version denied.
- Tampered state digest and invalid referenced task/agent/artifact scope rejected.
- Concurrent saves, duplicate logical delivery, conflicting duplicate input, pool scope reset/rollback and 64-bit wire values.

### Delegation and governance

- Parent fans out to three independently bounded specialists and joins real outputs.
- Concurrent fourth request rejected atomically; fourth sequential task admitted after a slot frees.
- Specialist cannot delegate by spoofing a role, parent ID or model-provided instruction.
- Total 12-task, deadline, critique, repair and spend ceilings survive restarts; stricter policy wins.
- Exact approved operation retry returns its stored state/receipt; changed input or reused authority for a different action rejected.
- Approval wait/reject/expiry/revoke/material revision and grant revocation during work stop admission; no transaction held while waiting.

### Real workflow and recovery

- Use authenticated model discovery/configured connection through existing provider/credential ports. Record exact model IDs, native identity, actual usage and safe output evidence.
- Run through actual workflow HTTP/control routes and real SSE replay/reconnect. Test auth/CSRF/ownership before effects, not only a direct service call with a fabricated principal.
- Real Node guest produces a candidate patch; host unchanged before approval; exact approved apply succeeds; concurrent user edit is preserved/rejected.
- Independent verifier rejects a seeded bad candidate and accepts the exact corrected artifact in a fresh guest.
- Kill the actual Node control plane before dispatch, after dispatch/before receipt, after receipt/before graph checkpoint, during approval wait, during sibling completion and during cancellation.
- Completed effect never re-executes; dispatched unknown remains blocked until reconciliation; stale owner cannot dispatch/settle; no unrelated container/process is touched.
- Actual cancellation stops/settles owned work, releases the correct leases and leaves known states; uncertain cancellation is blocked/cancelling, not falsely cancelled.
- Stop/restart with orchestration disabled preserves graph records and denies new graph starts; no fallback to a different engine for an existing run.

Run existing P1–P4 suites and provider/chat regressions. Prior counts (73 workspace, 13 provider parity) are dated baselines, not mandatory fixed totals for expanded suites. No skipped required case counts as a pass. Full legacy static failures remain visible; do not weaken checks to make them disappear.

## 12. Test environment, evidence and rollback

Only integration-write target currently eligible for separately authorized P5 qualification is `sirona_workspace_p0_test_20261028`. Assert actual connected database before any mutation. Reuse the guarded fixtures; setting `PGDATABASE` alone is not safe if a later `.env` loader overrides it. No tests/migrations against working `sirona`; no cluster recreation or data reset.

Create fresh P5 evidence paths and keep P4/P3 proof immutable. Preserve source hashes, dependency/runtime/image versions, exact DB lineage, safe raw stdout/stderr, commands/exit codes, real-provider versus controlled-server classification, graph/effect/artifact traces and leftover owned resources. Do not record raw tokens, cookies, API keys, vault/private backup contents or hidden reasoning.

Run one integration suite at a time on shared PostgreSQL/Docker. Build first and do not edit/rebuild runtime code mid-run. Capture streams directly in Node when needed to avoid PowerShell CLIXML corruption. Reviewer tests and SDK failure tests must invoke the actual production boundary being tested.

Rollback: disable new graph admission; stop/drain/fence only owned work; reconcile in-flight effects; preserve graph/checkpoint/task/agent/effect/artifact/approval records. Keep existing graph runs pinned to their graph version and paused/blocked if the engine is unavailable. Revert only compatible application changes through the reviewed source checkpoint. Do not delete checkpoints, auto-start fresh runs, remove additive schema, restore an older database over new data, prune Docker globally, shut down WSL or enable host execution.

## 13. Final acceptance packet

OpenCode must provide:

1. Exact owner approval used, exclusions and any separately approved migration file/checksum/target.
2. Requirement → production source → test → evidence → pass/fail/unknown matrix for every gate above.
3. Real configured-provider + actual guest + actual authenticated workflow journey, plus independent verifier challenge.
4. Real kill/restart traces and effect identities proving no blind duplicate mutations.
5. Current hashes, raw safe transcripts and truthful failed/skipped/blocked results.
6. Working database/activation preservation and zero unexplained owned resources.
7. Updated report, execution ledger, technology ledger, route ownership and handoff; no claim that P6–P8 are complete.

Package installation, an exported wrapper, fake graph nodes, copied error assertions, green mocks, screenshots or a model saying “verified” cannot satisfy P5.

## 14. Copy/paste message for OpenCode

```text
Read AGENTS.md and docs/SIRONA-WORKSPACE-P5-IMPLEMENTATION-PLAN.md.
This is the owner's requested P5 proposal, not automatic implementation approval.
The older P5 draft is superseded; do not execute its nonexistent specialists FK,
session_id uniqueness, checkpoint status assumptions or destructive rollback.

First inspect actual source, dirty changes, existing services, schema/migrations
and P4 evidence. Present the exact gate-A implementation manifest and any mismatch
with this plan. Require LangGraph.js through TypeScript adapters over the current
owners. Parent may delegate repeatedly to at most three concurrent specialists;
specialists cannot delegate. Keep bounded totals/deadlines/budgets and one Home
guest. Preserve provider/chat/UI/API/database behavior.

Wait for my explicit gate-A approval before code/dependency/protected changes.
SQL application always needs its own exact migration + target approval (gate B).
Production activation, frontend features, P6+ and commits/push/deploy are excluded.
Then implement the approved P5-00 through P5-08 tasks in order, verify each exit
gate with real evidence, maintain the ledger and stop at the next unapproved gate.
```

After reviewing OpenCode's manifest, the owner can explicitly send this bounded approval (not granted by its presence here):

```text
I approve gate A for P5 under SIRONA-WORKSPACE-P5-IMPLEMENTATION-PLAN.md and the
reviewed exact implementation manifest. This supersedes Stop after P3 only for
that P5 implementation/test scope. I approve the stated bounded delegation limits
and selected LangGraph dependency work, preserving existing services and contracts.
Use only the guarded isolated test database and the separately agreed real-model
test budget. You may author a necessary versioned migration for review; do not
apply it until I approve its exact file/checksum and target separately.
No working-database mutation, production activation, privileged install, UI change,
P6+ work, commits, pushes or deployment. Report failures/conflicts; do not weaken
security, tests or recovery guarantees to finish.
```

## Official implementation references

Consult the pinned SDK version's actual types and these official guides during implementation:

- [LangGraph persistence](https://docs.langchain.com/oss/javascript/langgraph/persistence)
- [LangGraph checkpointers and pending writes](https://docs.langchain.com/oss/javascript/langgraph/checkpointers)

The custom saver must support the SDK's real persistence semantics; saving one JSON blob per completed graph is not sufficient for parallel-node recovery.
