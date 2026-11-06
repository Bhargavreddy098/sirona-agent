---
title: "Gateway admission, snapshots and replay"
status: "PROPOSED DESIGN"
implementation: "NOT IMPLEMENTED HERE"
verification: "NOT RUN"
feature_id: "F01"
specification: "EDITION 1 PROPOSAL"
updated: "2026-11-05"
---

# Gateway admission, snapshots and replay

## Scope and owned operations

F01 owns transport admission and observation, not domain mutation. Inherit [shared types/RPC](../architecture/contract-foundation.md). RPC requests dispatch only the literal public operation registry. Bind HTTP to 127.0.0.1 on an OS-assigned port; remote interfaces, wildcard CORS and unauthenticated application reads are disabled. Tokens are issued by F02. Reject an Origin except the registered desktop origin; native CLI requests without Origin still require a token.

- F01-OP01 gateway.status, public read input {} -> {ready:boolean, schemaVersion:Int, capabilities:List({name:Text(80),state:"available"|"unavailable",reason:Text(200) or null},64)}. This is authenticated and reports real registrations/probes.
- F01-OP02 gateway.snapshot, public read input {runId?:Id} -> {cursor:Text(32), entities:List(Entity(Json),500), truncated:boolean}. Only workspace-scoped, public projections; without runId include latest 100 sessions and active runs, with runId include that run, its tasks, current approvals and terminal verdict. Cap encoded response at 4 MiB as well as 500 entities; truncated=true when either limit is reached and consumers fetch domain lists. Each entity is decoded by kind using its domain codec, not an unrestricted Json write shape.
- F01-OP03 subscribe, GET /api/v1/events?after=CURSOR&runId=ID (runId optional), bearer token mandatory. The cursor is a decimal global events.seq serialized as a string, exclusive. Omitted after means obtain a snapshot first; reject omission with INVALID_ARGUMENT.
- F01-OP04 operations.get is the shared journal query; input/output/authority are owned by the foundation and F03.

## Stream envelope and atomic handoff

Every durable SSE frame has id equal to seq and event equal to the registered type. JSON data is {v:1,seq:Text(32),workspaceId:Id,entityId:Id,operationId:Id,type:Text(80),at:Time,payload:Json}. Reject leading signs, nondecimal or >64-bit cursors. Future cursor is CONFLICT reason cursor_ahead. A cursor below the persisted workspace retention floor is RESYNC_REQUIRED with no fabricated history. Another workspace's sequence is not proof of access; always filter workspace and optional run references.

Capture snapshot records and the global high-water sequence in one SQLite read transaction. Commit, then subscribe after that watermark. Stream delivery repeatedly queries committed events seq>last through the same repository, in batches of 100. The in-memory notifier only wakes the loop; it is never the sole event source. This removes the replay/live subscription gap. Events for a run include entities linked through runId, not unrelated workspace events. Client applies only increasing seq; gaps are legal because of filtering. A renderer acknowledges application locally only after updating its cache.

Check token validity before every batch and at each heartbeat. Heartbeat is an SSE comment every 15 seconds, no durable sequence. Buffer at most 256 events or 1 MiB per connection; if the client cannot drain within 10 seconds, close the connection without cancelling the run. Maximum four streams per token and 32 per installation; excess is RATE_LIMITED. Reconnect delays are 1,2,4,8,16,30 seconds capped, reset after a successful snapshot/stream. No mutation retries are hidden in this loop.

## Failure and consumer behavior

Validate authentication, scope, cursor and availability before sending stream headers. After headers, a safe control event named stream.error contains {code,reason}; close afterward, with no durable id. Consumers distinguish offline from completed. On RESYNC_REQUIRED replace the server-state cache from snapshot and resume at its cursor; preserve unsent local drafts. On 401 clear observation and request reconnect/authentication. Closing a tab stops only observation.

Runtime/domain owners append events in their state transaction. F01 cannot create a run or infer completion from connection close. Status reads time out after 2 seconds per probe; missing measurements are unavailable. No extra gateway records are required; F03 events and retention_floor kind {state:"active",floor:Text(32)} supply replay state.

## Acceptance cases

| Case | Requirement / operation | Fixture and action | Required result |
|---|---|---|---|
| F01-T10 | R01 / OP01 | Valid token, one unavailable guest; query status | Guest unavailable, no invented success; foreign token sees no state |
| F01-T11 | R02 / OP02–03 | Snapshot at seq 10, commit events 11 and 12 before subscribing | Both appear once in order; snapshot plus replay loses none |
| F01-T12 | R02 / OP03 | Retention floor 20; request after=19 then after=999999 | RESYNC_REQUIRED then cursor_ahead; neither starts a mutation |
| F01-T13 | R03 / OP03 | Revoke token after first batch | No later batch is disclosed; stream closes by next heartbeat at latest |
| F01-T14 | R04 / OP03 | Slow consumer exceeds buffer, reconnect from last applied seq | Connection closes; run remains active; replay restores terminal outcome |

Use actual HTTP/SSE and isolated SQLite for these cases. Public envelopes are checked byte-for-byte after JSON decoding. [Build handoff](../engineering/build-handoff.md) defines proposed paths and commands.
