---
title: "Browser profiles, observations and sensitive actions"
status: "PROPOSED DESIGN"
implementation: "NOT IMPLEMENTED HERE"
verification: "NOT RUN"
feature_id: "F18"
specification: "EDITION 1 PROPOSAL"
updated: "2026-11-05"
---

# Browser profiles, observations and sensitive actions

## Adapter boundary and records

Inherit [foundation](../architecture/contract-foundation.md). The proposed first browser adapter is a pinned Playwright browser runtime with a fresh isolated profile per session; exact browser/package build is a qualification input. Profile={state:"opening"|"ready"|"closed"|"failed",projectId:Id,adapterBuild:Text(80),profileId:Text(256),allowedOrigins:List(Text(2048),20),lastObservationId:Id or null}. Credentials are not copied from the user's personal browser. Profile files are ephemeral, removed after confirmed session close; if cleanup fails show failed/cleanup_pending and retry only owned paths.

Observation={state:"current"|"stale",sessionId:Id,url:Text(2048),title:Text(512),capturedAt:Time,nodes:List(Node,1000),screenshot:BlobRef or null,digest:Digest}. Node={ref:Text(80),role:Text(80),name:Text(512),enabled:boolean}; refs are adapter-issued for that observation. Sensitive input values/passwords are excluded from snapshots/logs. Text/DOM is untrusted content.

## Operations

- F18-OP01 browser.open public mutation {projectId:Id,allowedOrigins:List(Text(2048),20)} -> Ack, qualified adapter required.
- F18-OP02 browser.observe public mutation {sessionId:Id,screenshot?:boolean} -> Entity(Observation). This creates an immutable observation record without changing external page state; it uses a mutation key but no expectedRevision. Serialize observation publication per session. At most1 observation/second/session, maximum text256 KiB and screenshot8 MiB.
- F18-OP03 browser.navigate public mutation {sessionId:Id,url:Text(2048),approvalId?:Id} -> Ack. Only http/https, no credentials or non-allowlisted/private-network target; redirects rechecked and refused if scope changes.
- F18-OP04 browser.act public mutation {sessionId:Id,observationId:Id,nodeRef:Text(80),action:"click"|"fill"|"select",value?:Text(8192),approvalId?:Id} -> Ack. fill/select require value; click forbids it. No generic script/evaluate endpoint.
- F18-OP05 browser.upload public mutation {sessionId:Id,observationId:Id,nodeRef:Text(80),blob:BlobRef,approvalId?:Id} -> Ack. Max16 MiB, exact destination and bytes bound to F08 grant.
- F18-OP06 browser.download public mutation {sessionId:Id,observationId:Id,nodeRef:Text(80),approvalId?:Id} -> Ack -> {blob:BlobRef}. Download goes to owned quarantine, max16 MiB, never auto-opens or executes; invalid content length/oversize aborts.
- F18-OP07 browser.close public mutation {sessionId:Id} -> {state:"closed"|"failed"} after actual cleanup.
- F18-OP08 browser.get public read {sessionId:Id} -> Entity(Profile).
- F18-OP09 computer.status public read {} -> {available:false,reason:"adapter_not_qualified"} in edition 1. General native computer control is explicitly unavailable until a selected target/adapter contract is added; browser qualification never enables OS-wide input.

## Target binding and failure

A browser action requires a current observation no older than30 seconds, unchanged page/navigation identity and matching node reference. Changed DOM/navigation invalidates relevant refs; return CONFLICT reason observation_stale and observe again. Clicks/fills that may send data, submit forms, change accounts or publish are sensitive exact actions. Default classify all act operations as browser_sensitive unless a trusted adapter-specific read-only classification proves otherwise; page text cannot label itself safe. Before effect recheck displayed origin, node descriptor and value/blob digest against the grant.

Default navigation/action deadline30 seconds, observation10 seconds, close10 seconds. Up to3 concurrent sessions/installation. Unexpected browser death after dispatch produces uncertain effect, not successful click. Reopen creates a new profile and cannot reuse old node refs/approval. Reconciliation uses actual current observations where safe; it must not repeat a purchase/upload/submit to discover whether it happened.

Output is {actionOperationId:Id,observationId:Id or null,status:"observed"|"uncertain",receipt:BlobRef or null}; observed means the adapter saw the documented browser transition, not that an external business transaction succeeded. F15 requires a criterion appropriate to that result. Browser testing of Sirona's own UI uses a separate test fixture and does not confer arbitrary browser authority.

## Acceptance cases

| Case | Requirement / operation | Action | Required result |
|---|---|---|---|
| F18-T10 | R01 / OP01 | Adapter absent | UNAVAILABLE; no synthetic page/log |
| F18-T11 | R02 / OP03 | Allowed URL redirects to disallowed/private target | Navigation stopped before sending to forbidden destination |
| F18-T12 | R03 / OP04–05 | Change page after approval; stale node ref | Conflict, no click/upload |
| F18-T13 | R04 / recovery | Kill browser after submit before receipt | Uncertain, no automatic resubmit |
| F18-T14 | R02 / OP06–07 | Oversized download and cleanup | Bounded refusal; only owned quarantine/profile paths cleaned |

Actual account operations or external uploads still require their exact user authority; adapter qualification is not that authorization.
