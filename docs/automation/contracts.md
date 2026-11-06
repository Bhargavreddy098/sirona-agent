---
title: "Schedules, hooks, occurrence admission and local delivery"
status: "PROPOSED DESIGN"
implementation: "NOT IMPLEMENTED HERE"
verification: "NOT RUN"
feature_id: "F17"
specification: "EDITION 1 PROPOSAL"
updated: "2026-11-05"
---

# Schedules, hooks, occurrence admission and local delivery

## Schedule and occurrence schemas

Inherit [foundation](../architecture/contract-foundation.md). Schedule={state:"enabled"|"paused"|"deleted",projectId:Id,sessionId:Id,contract:Ref,contractDigest:Digest,name:Text(200),trigger:Trigger,misfire:"skip"|"latest",overlap:"skip",nextAt:Time or null,lastEvaluatedAt:Time,budgetPerRun:Money,totalBudgetMicroUsd:Money,reservedMicroUsd:Money,settledMicroUsd:Money,occurrenceLimit:Int,admittedCount:Int,expiresAt:Time,standingApprovalId:Id or null}. Trigger is {kind:"at",at:Time} or {kind:"every",anchor:Time,intervalMs:Int} or {kind:"cron",expression:Text(128),timezone:Text(80)}. intervalMs60000..31536000000. at requires an explicit instant, no timezone-less string. New schedule starts paused until explicit enable verifies authority and required capabilities; default misfire=skip/overlap=skip.

Cron is five numeric fields minute/hour/day-of-month/month/day-of-week with *, ranges, lists and positive /steps; reject names, macros, seconds fields and invalid ranges. Day-of-week0..6 Sunday=0. When both day fields are restricted, match either; when one is *, match the other. IANA timezone mandatory; default supplied by UI is the user's selected timezone, never silently host timezone. DST gaps skip nonexistent local times; folds choose the first occurrence only. No random staggering. Preview uses the same evaluator/version as admission.

Occurrence={state:"admitted"|"running"|"succeeded"|"failed"|"blocked"|"skipped",scheduleId:Id,scheduleRevision:Int,scheduledAt:Time,runId:Id or null,reason:Text(80) or null}. Unique schedule_occurrence=(scheduleId,scheduledAt), deliberately excluding revision so an edit cannot duplicate an already considered instant. Manual runs use a separate manualOccurrenceId from the mutation key.

## Public operations

- F17-OP01 automation.create {projectId:Id,sessionId:Id,contract:Ref,contractDigest:Digest,name:Text(200),trigger:Trigger,misfire?:"skip"|"latest",budgetPerRun:Money,totalBudgetMicroUsd:Money,occurrenceLimit:Int,expiresAt:Time} -> Entity(Schedule), paused; reserved/settled/admittedCount start at zero and standingApprovalId=null. occurrenceLimit1..1000, expiry after now and at most30 days, budgetPerRun<=totalBudgetMicroUsd<=1000000000.
- F17-OP02 automation.edit {scheduleId:Id,name?:Text(200),trigger?:Trigger,misfire?:"skip"|"latest",contract?:Ref,contractDigest?:Digest,budgetPerRun?:Money} -> Entity(Schedule), expectedRevision; contract and digest supplied together; any behavior change pauses the schedule for re-enable.
- F17-OP03 automation.setState {scheduleId:Id,state:"enabled"|"paused"|"deleted",approvalId?:Id} -> Entity(Schedule), expectedRevision. Deletion is a tombstone; history remains. Deleted schedules cannot be re-enabled; create a new schedule.
- F17-OP04 automation.preview read {trigger:Trigger,after:Time,count?:Int} -> {instants:List(Time,20),evaluatorVersion:1}; default5/range1..20; bounded lookahead five years, error if none found.
- F17-OP05 automation.runNow {scheduleId:Id} -> Ack, respects current authority/overlap and does not change recurrence anchor.
- F17-OP06 automation.list read {state?:"enabled"|"paused"|"deleted",limit?:Int,cursor?:Text(1024)} -> Page(Entity(Schedule)).
- F17-OP07 automation.occurrences read {scheduleId:Id,limit?:Int,cursor?:Text(1024)} -> Page(Entity(Occurrence)).
All unmarked operations are public mutations and use the common envelope; schedule limit100/workspace. budgetPerRun is bounded by the approved contract. Enabling consumes a human schedule_enable grant binding schedule revision, trigger, contract digest, total budget, occurrence limit and expiry. The schedule may not reference Plan Only. No new paid authority is created by a timer.

## Admission, restart and edits

Poll every second, at most100 due candidates per tick. Evaluate due instants in (lastEvaluatedAt,now]. For a delayed instant more than60 seconds late, skip discards all overdue work; latest admits only the latest instant if <=24 hours old, recording skipped count/range in one audit event rather than inserting unbounded historical rows. Limit evaluation to24 hours and1000 candidate instants per schedule per tick; older ranges coalesce to skipped history. Every interval is anchor+n*intervalMs in UTC, not completion-time drift.

In one transaction reload enabled state/revision, reserve the unique occurrence key, check no active/uncertain run for that schedule, recheck F08 standing scope and F05 budget, and admit F09 run with occurrence-derived idempotency identity. Admission also requires now<expiresAt, admittedCount<occurrenceLimit and settledMicroUsd+reservedMicroUsd+budgetPerRun<=totalBudgetMicroUsd; reserve budgetPerRun and increment admittedCount atomically. On terminal known usage, replace that hold with actual cost from F05 once by runId; unknown usage retains the hold. Exhaustion/expiry pauses the schedule. Failed/blocked admitted runs count against occurrenceLimit and are never silently replaced. If another interactive run holds the required session/project, record skipped with reason session_busy and advance the evaluated instant; do not retry that occurrence later. If policy requires a new human decision, occurrence becomes blocked and no action dispatches; never auto-click approval. A one-shot pauses after its occurrence is admitted. Pause committed before admission prevents it; admission committed first may continue, and explicit runtime.cancel is needed. Edits recalculate future instants after edit commit; no retroactive catch-up of the new expression. Recovered admitted occurrences consult runId and never start another run.

## Hooks and webhooks

Hook={state:"enabled"|"disabled",eventTypes:List("run.succeeded"|"run.failed"|"artifact.created",3),scheduleId:Id,secretRef:Id or null}. automation.registerHook public mutation {eventTypes,scheduleId,secretRef:Id or null} -> Entity(Hook), disabled until explicit enable via automation.setHook {hookId:Id,enabled:boolean}. Internal event input={eventId:Id,type:Text(80),occurredAt:Time,causationId:Id,depth:Int}; duplicate hook_event=(hookId,eventId) is acknowledged without another run. Reject depth>8; increment on emission, preserve causationId. No arbitrary JavaScript/shell hook callback.

Inbound POST /api/v1/hooks/HOOK_ID accepts raw JSON {eventId:Id,type:Text(80),occurredAt:Time,payload:Json}. Maximum64 KiB. Headers X-Sirona-Timestamp is decimal Unix seconds and X-Sirona-Signature is lowercase hex HMAC-SHA256(secret, timestamp + "." + rawBodyBytes). Verify constant-time before parsing, reject >300 seconds old or >60 seconds future, derive workspace/scope from stored hook, never payload. Secret rotation creates a new reference; no old-key grace period. Replay key retained as an operation tombstone; same ID/different body conflicts. Invalid signature returns401 without body details; disabled hook503; accepted event202 with occurrenceId. Rate limit60/minute/hook. External hooks are disabled by default; loopback listener does not imply public ingress deployment.

## Delivery records

Delivery={state:"pending"|"delivering"|"delivered"|"failed",occurrenceId:Id,runId:Id,recipientPrincipalId:Id,summary:Text(1024),attempts:Int,nextAttemptAt:Time or null,readAt:Time or null}. Unique delivery=(runId,recipientPrincipalId). First automation release supports local inbox only. Commit final result and outbox entry together; a failed outbox retry never reruns F09. Retry at1,5,30,120,600 seconds, then failed with explicit automation.retryDelivery {deliveryId:Id} mutation. Local delivery publishes inbox record and delivered state in one transaction, making restart idempotent. automation.inbox read {unreadOnly?:boolean,limit?:Int,cursor?:Text(1024)} -> Page(Entity(Delivery)); automation.markRead {deliveryId:Id} -> Entity(Delivery), readAt set once. Authorization rechecked on linked result reads.

## Acceptance cases

| Case | Requirement / operation | Action | Required result |
|---|---|---|---|
| F17-T10 | R01 / admission | Two pollers race, kill after run admission | One occurrence/run recovered |
| F17-T11 | R02 / OP04 | America/New_York daily02:30 across spring gap;01:30 across fold | Gap skipped, fold first only; preview equals admission |
| F17-T12 | R02 / misfire | Sleep3 hours on10-minute schedule, latest vs skip | One latest or zero runs; bounded history, no burst |
| F17-T13 | R03 / webhook | Alter raw body, stale timestamp, replay same event | Invalid rejected; replay acknowledged without duplicate run |
| F17-T14 | R04 / delivery | Fail notification after successful workspace effect | Delivery retries only; one project effect |
| F17-T15 | R02 / edit | Edit/pause races due instant | Transaction order governs; prior history survives |
| F17-T16 | R03 / authority | Two admissions would exceed total budget/count, or standing grant is revoked | At most the authorized admission succeeds; revoked schedule pauses before dispatch |

OpenClaw's [schedule documentation](https://docs.openclaw.ai/automation/cron-jobs/schedules) informs separation of calendar and interval schedules. Sirona deliberately selects fewer trigger types, explicit timezone/DST rules and no staggering.
