---
title: "External worker protocol and reconciliation"
status: "PROPOSED DESIGN"
implementation: "NOT IMPLEMENTED HERE"
verification: "NOT RUN"
feature_id: "F16"
specification: "EDITION 1 PROPOSAL"
updated: "2026-11-05"
---

# External worker protocol and reconciliation

## Capability boundary and records

Inherit [foundation](../architecture/contract-foundation.md). This specifies Sirona's adapter port; no external IDE/vendor integration is claimed selected or qualified. Adapter={state:"unconfigured"|"unqualified"|"qualified"|"unavailable",name:Text(80),protocolVersion:1,transport:"private-pipe"|"https",target:Text(2048),credentialId:Id or null,capabilities:List("read"|"propose_patch"|"execute_guest",3),qualificationDigest:Digest or null}. WorkerJob={state:"admitted"|"running"|"cancelling"|"succeeded"|"failed"|"cancelled"|"uncertain",runId:Id,taskId:Id,adapter:Ref,inputArtifactId:Id,deadlineAt:Time,lastSequence:Int,resultArtifactId:Id or null,externalJobId:Text(256) or null}.

A worker gets an immutable snapshot, task instructions, scoped capabilities, deadline and shared-budget sublimit. It never receives the live project root, a reusable provider secret or autonomous parent authority. It returns patch/artifact proposals; F11 owns live application. No worker may delegate or create another run owner.

## Operations and port

- F16-OP01 workers.register public mutation {name,transport,target,credentialId:Id or null,capabilities} -> Entity(Adapter), unqualified; F08 classifies registration/target authority.
- F16-OP02 workers.qualify native/admin mutation {adapterId:Id} -> Ack; actual handshake, disconnect, cancellation, scope and receipt tests required.
- F16-OP03 workers.dispatch internal {adapterId:Id,runId:Id,taskId:Id,inputArtifactId:Id,instructions:Text(8192),budgetMicroUsd:Money,timeoutMs:Int} -> Entity(WorkerJob). timeout1000..900000; missing adapter returns unavailable.
- F16-OP04 workers.get public read {jobId:Id} -> Entity(WorkerJob).
- F16-OP05 workers.cancel public mutation {jobId:Id} -> Entity(WorkerJob), cancelling until confirmed stop.
- F16-OP06 receiveWorkerEvent internal adapter-only {jobId:Id,sequence:Int,type:"started"|"progress"|"artifact"|"finished"|"failed"|"cancelled",payload:Json} -> {acceptedSequence:Int}. Payload schemas below.
- F16-OP07 workers.list public read {runId:Id,limit?:Int,cursor?:Text(1024)} -> Page(Entity(WorkerJob)).

Port handshake returns {protocolVersion:1,adapterBuild:Text(80),capabilities,identity:Text(256)}. submit receives {operationId:Id,jobId:Id,runId:Id,taskId:Id,fence:Int,artifact:BlobRef,instructions:Text(8192),allowedPaths:List(Text(1024),100),budgetMicroUsd:Money,deadlineAt:Time} and returns {externalJobId:Text(256)}. lookup(operationId) returns {status:"not_found"|"running"|"finished"|"unknown",receipt:Json or null}; cancel(externalJobId) returns {acknowledged:boolean}. A vendor adapter must implement or explicitly report unsupported lookup/cancel; unsupported reconciliation keeps effects uncertain.

Event payload: started={externalJobId}; progress={message:Text(2048)}; artifact={manifest:List(FileEntry,10000),content:List(BlobRef,10000)} using F11 file rules; finished={resultArtifactId:Id,receiptDigest:Digest}; failed={reason:Text(80)}; cancelled={stoppedAt:Time}. Validate size<=1 MiB per event, artifact blobs via bounded F11 transfer, and monotonically increasing sequence. Same sequence/same digest no-op; conflicting duplicate is protocol failure.

## Recovery and acceptance

Heartbeat every 10 seconds, lost after 30; transport loss changes job uncertain and blocks parent dispatch pending lookup. Reconnection authenticates adapter identity/version and resumes after lastSequence, never submits a new job automatically. Parent fence/contract still checked before accepting results. Late output may be retained but cannot supersede cancelled/current artifacts. Cancel acknowledgement alone does not prove process stopped.

| Case | Requirement / operation | Action | Required result |
|---|---|---|---|
| F16-T10 | R01 / OP03 | No qualified adapter | UNAVAILABLE before external dispatch |
| F16-T11 | R02 / port | Repeated submit operation ID across disconnect | One vendor job if lookup supported; otherwise uncertain, no blind retry |
| F16-T12 | R02 / OP06 | Duplicate sequence with changed payload | Protocol conflict, no replacement artifact |
| F16-T13 | R03 / scope | Worker asks for extra root/delegation/credentials | Denied without expanding parent scope |
| F16-T14 | R04 / cancel | Worker acknowledges cancel but still reports running | Parent remains cancelling/blocked, never falsely cancelled |

Adapter-specific wire encoding, authentication and vendor commands must be supplied with the selected adapter before live qualification. Port/unavailable/consumer behavior is fully independent of that selection.
