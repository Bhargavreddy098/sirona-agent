---
title: "Worked implementation and recovery example"
status: "PROPOSED DESIGN"
implementation: "NOT IMPLEMENTED HERE"
verification: "NOT RUN"
updated: "2026-11-05"
---

# Worked implementation and recovery example

This is a deterministic acceptance fixture, not a record of running software. It connects the owner contracts from a user action through storage, UI and recovery. IDs are fixture UUIDs; a real installation obtains identities from the native handshake and creation results.

## Message admission with a lost response

Prerequisites: F22/F03/F02/F01 ready, an open project and a session at revision 1 in the authenticated workspace. POST /api/v1/rpc with a valid bearer token:

```json
{
  "v": 1,
  "operation": "sessions.append",
  "workspaceId": "11111111-1111-4111-8111-111111111111",
  "key": "77777777-7777-4777-8777-777777777777",
  "expectedRevision": 1,
  "input": {
    "sessionId": "66666666-6666-4666-8666-666666666666",
    "inputKey": "88888888-8888-4888-8888-888888888888",
    "text": "Show a helpful message when the project has no files."
  }
}
```

Expected: HTTP 200 with the shared success envelope containing message Entity and sessionRevision=2. One user message exists at sequence 1, session nextMessageSeq=2, one session.message event and one operation result commit together. No model call, project write or run is implied.

If the response is lost, use:

```json
{
  "v": 1,
  "operation": "operations.lookup",
  "workspaceId": "11111111-1111-4111-8111-111111111111",
  "input": {
    "operation": "sessions.append",
    "key": "77777777-7777-4777-8777-777777777777"
  }
}
```

Expected: the completed operation status with the original message result. Repeating the exact append returns the same message ID. Changed text under the envelope key yields CONFLICT/key_reused. A fresh envelope key with the original inputKey and different text yields CONFLICT/input_key_reused. Neither adds a transcript row. A foreign workspace receives no message or operation disclosure.

## Plan and build through the owners

| Step | Operation and binding | Required state/evidence |
|---|---|---|
| Clarify | requirements.create/revise/answer | Requirement R-1 describes the selected empty-state message; unresolved blocking question prevents confirmation |
| Confirm | requirements.confirm with explicit accepted assumptions | Ready immutable requirement ID/revision/digest |
| Plan | planning.create with requirement Ref, modelRoutes, DAG, effects, budget and required criterion | Exact draft; saving it does not execute its tasks |
| Review | planning.requestApproval -> approvals.decide -> internal planning.finalize | Approved contract digest and bound human decision |
| Admit | runtime.start with session/contract Ref/digest | One run/task/budget admission; absent required capability produces unavailable before effects |
| Prepare | F14 context -> F05 reservation -> F04 attempt -> workspace.read/previewPatch | Actual model attempt, source bytes and patch digests |
| Authorize | F08 evaluates exact patch under admitted mode | Applicable grant or visible pending approval |
| Apply | workspace.applyPatch through stable F09 effect identity | Intent, observed resulting hashes, receipt and immutable artifact |
| Verify | verification.run against fixed artifact/criteria | Actual checker receipt; missing required evidence means UNKNOWN |
| Complete | F09 aggregates required tasks/checks | succeeded only with required PASS; UI/CLI show that durable result |

A manual Plan Only fixture has modelRoutes=[] and budgetMicroUsd=0; runtime.start rejects it with plan_only. A live build fixture requires a qualified model/profile and authorized budget. Substituting fake responses tests orchestration only, not live qualification.

## Recovery matrix

| Interruption | Recovery action | Required result |
|---|---|---|
| Before intent commit | Read operation status and retry same identity if absent | No duplicate run/grant/effect |
| After intent, uncertain dispatch | Adapter lookup | Retry only after not_started is proven |
| After file replacement, before receipt | Compare path identities and before/after hashes | Recognize completed change; do not blindly reapply |
| After first of two file replacements | Reconcile each path | Preserve user edits; remain uncertain until all outcomes known |
| After receipt, before UI event | Snapshot and exclusive replay | Same artifact/effect, no second mutation |
| After PASS, then artifact changes | Invalidate required receipts | Old verdict stale; new artifact requires checks |
| During delivery after successful run | Retry F17 outbox only | One project effect, one logical delivery |

Implement these cases in the [local-plan/local-build/interrupted-build journeys](../engineering/build-handoff.md). This example connects existing owners rather than defining another execution state machine.
