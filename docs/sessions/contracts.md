---
title: "Database ownership, sessions and message admission"
status: "PROPOSED DESIGN"
implementation: "NOT IMPLEMENTED HERE"
verification: "NOT RUN"
feature_id: "F03"
specification: "EDITION 1 PROPOSAL"
updated: "2026-11-05"
---

# Database ownership, sessions and message admission

## Owned records and operations

The [storage contract](../architecture/storage-contract.md) is the exact proposed schema and writer algorithm. Inherit [shared values](../architecture/contract-foundation.md). F03 supplies transactions and the operation journal to every owner; it does not decide another domain's behavior.

Session data: {state:"open"|"archived", projectId:Id, title:Text(200), nextMessageSeq:Int}. Message data: {state:"complete"|"interrupted",sessionId:Id,sequence:Int,role:"user"|"assistant"|"tool",text:Text(65536),runId:Id or null,sourceOperationId:Id}. Empty assistant/tool text is permitted only for an interrupted record or a separately linked tool receipt. Unique keys: session_message=(sessionId,sequence), session_input=(sessionId,principalId,inputKey). User messages are immutable; corrections append a new user message, never rewrite a prior transcript.

- F03-OP01 sessions.create public mutation {projectId:Id,title:Text(200)} -> Entity(Session). Validate open project; nextMessageSeq=1.
- F03-OP02 sessions.list public read {projectId:Id,state?:"open"|"archived",limit?:Int,cursor?:Text(1024)} -> Page(Entity(Session)); state defaults open.
- F03-OP03 sessions.append public mutation {sessionId:Id,inputKey:Id,text:Text(65536)} -> {message:Entity(Message),sessionRevision:Int}. expectedRevision required; role is always user. This records intent only, not inference or run admission.
- F03-OP04 sessions.messages public read {sessionId:Id,afterSequence?:Int,limit?:Int} -> {items:List(Entity(Message),100),nextSequence:Int or null}; defaults afterSequence=0, limit=50; ascending sequence.
- F03-OP05 sessions.update public mutation {sessionId:Id,title?:Text(200),state?:"open"|"archived"} -> Entity(Session); at least one changed field required. Archival fails CONFLICT reason active_run while any nonterminal run exists; cancel/reconcile first. Reopen preserves history.
- F03-OP06 appendResult internal mutation {sessionId:Id,runId:Id,role:"assistant"|"tool",text:Text(65536),state:"complete"|"interrupted",sourceOperationId:Id} -> Entity(Message). Unique sourceOperationId plus role prevents duplicate terminal transcript append.
- F03-OP07 operations.get public read uses the shared operation status schema. tx/read internal ports implement the storage contract without exposing SQL to clients.

## Commit and duplicate behavior

Append validates session/project ownership, open state, current revision and next sequence in one writer transaction; creates message, advances nextMessageSeq and session revision, records the input key, and emits session.message with {sessionId,messageId,sequence,role,state}. Same input key with the same principal/text returns its existing message even if another turn has since started; different text is CONFLICT reason input_key_reused. This check occurs before the expectedRevision check for the duplicate logical input, but only after authentication/authorization. The operation-envelope key still follows its own full-input hash rule.

A first-time append at stale expectedRevision is CONFLICT and changes nothing. Client reads current state and resubmits with a new envelope key but the same inputKey; this is safe if a concurrent retry already committed it. One session allows one active run; F09 owns that separate admission constraint. Message appending never automatically starts an unbounded agent loop.

Events session.created, session.updated and session.message contain IDs and changed public fields only, committed with the records. Text appears through authorized message reads, not in generic events. No physical session/message deletion in edition 1; archival hides from the default list but is not a privacy-erasure promise. Export/removal requires a later explicit retention contract.

## Persistence failure and bootstrap

Initialize the isolated root before loading any repository. Startup verifies schema checksum, foreign keys and basic integrity; unknown version/corruption yields unavailable, not an empty new database. BEGIN/COMMIT failures follow the storage contract. Interrupted external work is F09's concern; the database owner never decides an unrecorded tool action succeeded.

A synchronous mutation not committed leaves no message or operation result; retrying its key can execute the transaction. If the connection fails after COMMIT may have succeeded, reopen, inspect the key and return its durable result; do not insert a second message. Bootstrap workspace and owner principal is a private initialization transaction; it cannot be called again through RPC.

## Acceptance cases

| Case | Requirement / operation | Fixture/action | Required result |
|---|---|---|---|
| F03-T10 | R01 / tx | Inject BEGIN failure before append | Callback never runs; zero new rows/events |
| F03-T11 | R02 / OP03 | Two distinct messages race at the same session revision | One succeeds, one conflicts; retry produces consecutive unique sequences |
| F03-T12 | R02 / OP03 | Retry same input key after another append, then change its text | Original message returned, then input_key_reused; no extra transcript row |
| F03-T13 | R04 / tx | Kill after commit before response, restart and retry key | Same message ID/result, one committed event |
| F03-T14 | R03 / OP04–05 | Foreign project read; archive session with active run | NOT_FOUND for foreign read; active_run conflict; history intact |
| F03-T15 | R01 / bootstrap | Invalid test root and unknown schema | Refuse open; production APPDATA store untouched |

The behavior follows OpenClaw's documented distinction between duplicate input and conflicting reuse, adapted to Sirona's single-database transaction owner. See [reference provenance](../reference/openclaw-reference.md).
