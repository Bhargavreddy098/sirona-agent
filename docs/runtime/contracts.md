---
title: "Canonical run execution and effect recovery"
status: "PROPOSED DESIGN"
implementation: "NOT IMPLEMENTED HERE"
verification: "NOT RUN"
feature_id: "F09"
specification: "EDITION 1 PROPOSAL"
updated: "2026-11-05"
---

# Canonical run execution and effect recovery

## Records and transitions

Inherit [foundation](../architecture/contract-foundation.md). Run data={state:"queued"|"running"|"waiting_approval"|"cancelling"|"succeeded"|"failed"|"cancelled"|"blocked",sessionId:Id,contract:Ref,contractDigest:Digest,currentTaskId:Id or null,budgetId:Id,modelTurns:Int,repairCount:Int,checkpointVersion:1,checkpointDigest:Digest,blockedReason:Text(80) or null}. TaskRun data={state:"pending"|"running"|"waiting_approval"|"succeeded"|"failed"|"cancelled"|"blocked",runId:Id,planTaskId:Id,artifactId:Id or null,verdictId:Id or null}. Effect data={state:"intent"|"dispatched"|"confirmed"|"failed"|"uncertain",runId:Id or null,taskId:Id or null,operationId:Id,actionDigest:Digest,adapter:Text(80),receipt:Json or null}. Unique active_session=(sessionId) is held until the run is terminal or explicitly blocked with no live work; blocked runs still prevent a new mutating run on the same project until reconciliation.

Lease resource run:ID expires after 30 seconds, heartbeat every 5 seconds. Global project-write lease allows one writer run per project. Owner takeover requires expired lease plus proof old owned process/container has stopped; inability to establish this leaves blocked. Every runtime write checks owner/fence. A stale worker response is retained as diagnostic evidence but cannot change current state.

## Operations

- F09-OP01 runtime.start public mutation {sessionId:Id,contract:Ref,contractDigest:Digest} -> Ack. Require approved runnable contract, open session/project, current permission, qualified required dependencies and budget. Atomically create run/task records, budget and active keys. Plan Only returns CONFLICT reason plan_only.
- F09-OP02 runtime.get public read {runId:Id} -> {run:Entity(Run),tasks:List(Entity(TaskRun),100),effects:List(Entity(Effect),500)}; above 500 use runtime.effects {runId,limit?,cursor?} -> Page(Entity(Effect)).
- F09-OP03 runtime.cancel public mutation {runId:Id} -> Entity(Run). Terminal run returns current state with no revision change. Otherwise set cancelling, prohibit new effects, abort provider/guest/worker operations and preserve receipts.
- F09-OP04 runtime.resume public mutation {runId:Id} -> Ack. Only blocked with no uncertain effects, compatible checkpoint and still-current scope; recheck all prerequisites. Failed/cancelled/succeeded runs require a new run, not state reversal.
- F09-OP05 reconcile internal {effectId:Id,observation:"confirmed"|"not_started"|"unknown",receipt:Json or null} -> Entity(Effect). Adapter-specific evidence is mandatory for confirmed/not_started. unknown remains uncertain and run blocked.
- F09-OP06 runtime.list public read {sessionId:Id,limit?:Int,cursor?:Text(1024)} -> Page(Entity(Run)).

## Direct user effects

The same canonical effect coordinator handles user-initiated patch/tool/Git/browser/deployment operations outside a model run. Such Effect records have runId/taskId null, an authenticated originating operation, exact F08 grant and the same intent/dispatch/receipt/reconciliation rules. They never start a model loop or inherit autonomous permissions. Their status is read through operations.get/lookup and the domain result; project-write ownership still prevents races with runs.

## Execution algorithm

1. Acquire fenced run/project ownership, validate the stored checkpoint digest against JCS of contract digest, task states, effect IDs and counters. Unsupported checkpointVersion blocks resume.
2. Select the next ready task in F07 stable topological order. Failed dependency blocks descendants; do not execute them speculatively.
3. Select the first F05-eligible route in the pinned contract.modelRoutes order and assemble F14 context for that provider/model. For reasoning/research/patch/command tasks, reserve F05 budget and call F04 with the task instructions, pinned contract and only the allowlisted tool schemas. The model can propose calls; it cannot change task graph, scope or criterion.
4. Allowlisted model tools map to existing operations: workspace.read, workspace.previewPatch, workspace.applyPatch, tools.execute, intelligence.search, context.retrieve and specialists.delegate. The dispatcher resolves IDs from trusted run/task context, validates arguments through the same codec and applies F08. Public variants never accept run fence or actor fields.
5. Before each external effect persist intent and consume the grant in one transaction. Dispatch with stable operationId; persist actual receipt afterward. Tool outputs return to the model as attributed untrusted data. Never dispatch a partial tool call.
6. Persist each completed model turn and increment modelTurns. At maxModelTurns stop with blocked reason turn_limit. Per turn at most 16 effect proposals; exceeding it fails protocol validation. No hidden recursion.
7. For a task's candidate artifact, invoke F15 fixed criteria. PASS succeeds task; FAIL permits at most repairLimit attempts under the same scope and remaining budget; UNKNOWN blocks. Repairs create new artifact digests and invalidate affected receipts.
8. All required tasks succeeded plus final F15 PASS -> run succeeded. Failure with known outcomes -> failed. Cancellation with all active work stopped and outcomes known -> cancelled. Any uncertain effect -> blocked, including cancellation races.

The model's text saying done is never a completion transition. Task instructions for kind verify invoke F15 directly; specialist invokes F10 with a bounded assignment; unsupported capability blocks before dispatch.

## Crash boundaries

Intent without dispatch is retryable only when adapter proves it did not start. Dispatched without durable receipt is uncertain. A known receipt committed before crash is returned without reexecution. Filesystem effects reconcile base/result digests via F11; provider usage via F04/F05; guest processes via F12 owned container identity. External adapters lacking a lookup/idempotency mechanism remain blocked after uncertainty. Heartbeats cannot make a non-idempotent external action exactly-once.

Emit runtime.changed, task.changed and effect.changed with IDs/state/revision, in the same transaction as those changes. Stop/pause views must distinguish cancelling from cancelled and blocked from failed. Checkpoint changes cannot alter the immutable plan.

## Acceptance cases

| Case | Requirement / operation | Action | Required result |
|---|---|---|---|
| F09-T10 | R01 / OP01 | Two starts race for same session/project | One active run admitted; second conflicts |
| F09-T11 | R02 / dispatch | Kill before dispatch, after effect, after receipt commit | Prove not_started/reconcile uncertainty/reuse receipt respectively |
| F09-T12 | R02 / lease | Old owner submits receipt after takeover | Current state unchanged; stale evidence retained |
| F09-T13 | R03 / OP03 | Cancel during tool effect whose result is unknown | No new dispatch; blocked until reconciliation, never false cancelled |
| F09-T14 | R04 / completion | Model says done but required receipt is absent | UNKNOWN/blocked, no succeeded state |
| F09-T15 | R01 / loop | Exhaust turns or repair count | Bounded stop with reason; no extra provider call |
