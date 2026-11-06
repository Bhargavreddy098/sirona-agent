---
title: "Bounded specialist assignments and independent review"
status: "PROPOSED DESIGN"
implementation: "NOT IMPLEMENTED HERE"
verification: "NOT RUN"
feature_id: "F10"
specification: "EDITION 1 PROPOSAL"
updated: "2026-11-05"
---

# Bounded specialist assignments and independent review

## Data and admission

Inherit [foundation](../architecture/contract-foundation.md). Assignment={state:"queued"|"running"|"cancelling"|"succeeded"|"failed"|"cancelled"|"blocked",parentRunId:Id,parentTaskId:Id,role:"implementer"|"researcher"|"reviewer",instructions:Text(8192),inputArtifactId:Id,allowedPaths:List(Text(1024),100),budgetMicroUsd:Money,deadlineAt:Time,resultArtifactId:Id or null,review:Review or null}. Review={artifactDigest:Digest,criterionIds:List(Id,50),findings:List({severity:"blocking"|"nonblocking",path:Text(1024) or null,message:Text(2048)},100),recommendation:"accept"|"revise"|"unknown"}.

The ceiling is three active specialist assignments across the entire installation, including all parent runs. Admission reserves a slot in the serialized F03 transaction. Queued requests do not count as active but queue is capped at 20; fourth immediate request with queue=false returns RATE_LIMITED, queue=true may wait. Default queue=false. Parent work is not a specialist slot. Nested delegation is rejected regardless of available slots. Each assignment's budget is a sublimit of the parent's existing budget, not newly created spend authority.

## Operations

- F10-OP01 specialists.delegate internal parent-only {parentRunId:Id,parentTaskId:Id,role,instructions,inputArtifactId,allowedPaths,budgetMicroUsd,timeoutMs?:Int,queue?:boolean} -> Entity(Assignment). timeout default 300000, range 1000..900000. Validate all paths/effects/budget as a subset of the admitted parent contract.
- F10-OP02 specialists.get public read {assignmentId:Id} -> Entity(Assignment).
- F10-OP03 specialists.list public read {runId:Id,limit?:Int,cursor?:Text(1024)} -> Page(Entity(Assignment)).
- F10-OP04 specialists.cancel public mutation {assignmentId:Id} -> Entity(Assignment); signals parent-owned runtime activities and releases slot only after cleanup/outcome reconciliation.
- F10-OP05 returnAssignment internal {assignmentId:Id,resultArtifactId:Id or null,review:Review or null} -> Entity(Assignment). Implementer requires result artifact; reviewer requires review; researcher returns a provenance-bearing artifact. Both fields null is invalid.
- F10-OP06 specialists.review internal parent-only {parentRunId:Id,parentTaskId:Id,artifactId:Id,criterionIds:List(Id,50)} -> Entity(Assignment), role reviewer, fresh isolated review context.

## Execution and independence

LangGraph may implement the bounded specialist workflow but uses F09's existing activities, effect journal and budget port. It may not open another database, start its own ungoverned loop or create children. Specialist context includes assignment, pinned input artifact, allowed sources and contract subset; it does not inherit another specialist's private reasoning or undisclosed credentials. Model/tool requests still use F04/F05/F08/F12.

Specialists operate on snapshots and return artifacts/patch proposals. The parent owns application to the live project through F11. Parallel assignments cannot overwrite each other's live files. Reviewer identity must differ from the producer assignment; its input is the immutable artifact and fixed criteria, without producer assertions of PASS. Same underlying model is permitted but does not establish independent empirical verification. A model review is advisory; F15 defines when a required review criterion is accepted.

Queue order is createdAt then ID. On restart, running assignments reconcile child effects and owned processes; slots remain reserved while outcome is unknown. Terminal assignment and slot release commit together. Parent cancellation stops queued admission and signals all active children. Deadline sets cancelling, then cancelled or blocked based on actual outcomes. Parent success is impossible while a required child remains unresolved.

Emit specialist.changed with assignmentId,parentRunId,state. A stale result tied to an older artifact digest is rejected; preserve it as historical evidence without changing the current task verdict.

## Acceptance cases

| Case | Requirement / operation | Action | Required result |
|---|---|---|---|
| F10-T10 | R01 / OP01 | Four concurrent queue=false requests across two parents | Exactly three active; fourth RATE_LIMITED |
| F10-T11 | R02 / OP01 | Specialist invokes delegate | FORBIDDEN reason nested_delegation |
| F10-T12 | R02 / OP05 | Assignment completes; another starts | Slot released once and reusable |
| F10-T13 | R03 / OP06 | Producer reviews itself or artifact changes before result | Rejected; no current acceptance |
| F10-T14 | R04 / recovery | Kill parent with running children | Slots retained until children reconciled; no fourth active child |
