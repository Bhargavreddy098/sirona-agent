---
title: "Action descriptors, product modes and grant consumption"
status: "PROPOSED DESIGN"
implementation: "NOT IMPLEMENTED HERE"
verification: "NOT RUN"
feature_id: "F08"
specification: "EDITION 1 PROPOSAL"
updated: "2026-11-05"
---

# Action descriptors, product modes and grant consumption

## Authority schema

Inherit [foundation](../architecture/contract-foundation.md). EffectScope={kind:"read"|"inference"|"patch"|"command"|"network"|"git_commit"|"git_push"|"browser_sensitive"|"deploy",projectId:Id,target:Text(4096),maxCostMicroUsd:Money or null}. Targets are canonical project-relative file paths or an exact adapter/remote destination identifier; wildcard ** is permitted only for read/patch below the approved project root. Commands bind a qualified profile ID and executable/argv digest, not a free-form shell wildcard. Network targets are exact scheme/host/port; no implicit subdomain wildcard.

Action={kind:EffectScope.kind or "build_contract" or "schedule_enable" or "administration",projectId:Id,target:Text(4096),inputDigest:Digest,contractId:Id or null,contractDigest:Digest or null,operationId:Id,scope:EffectScope or null}. Trusted classifier constructs it from decoded operation and canonical target. Approval data={state:"pending"|"approved"|"rejected"|"expired"|"consumed"|"revoked",principalId:Id,action:Action,actionDigest:Digest,expiresAt:Time,decidedAt:Time or null,revokedAt:Time or null,decisionSource:"human"|"policy" or null,consumedBy:Id or null}. Digest covers the entire Action plus principalId and workspaceId. No caller-supplied risk field exists. Unique grant_operation=(operationId,actionDigest).

## Product mode matrix

All modes allow authorized scoped reads. Plan Only forbids project effects; a separately approved inference budget may draft plans. Ask Before Every Change prompts for every patch and command invocation. Autonomous Coding allows patches and qualified no-network coding/test commands within the approved contract. Full Autonomous Build adds approved network/dependency operations within that contract. Neither autonomous mode permits implicit commit, push, deployment, external publication, account changes or credential mutation: each needs an exact action grant. A model cannot change the mode. A user selecting a mode accepts only the displayed contract scope, not future wider effects.

Local configuration/credential/backup-activation/profile-registration actions use administration descriptors with their exact resource/input digest and an explicit trusted user action; they are not grantable by model/tool context. Schedule activation uses schedule_enable and always requires an exact human decision binding recurrence, expiry and aggregate budget. Unknown/unclassified actions are denied, not assigned low risk. Policy check order: authenticated scope -> exact decoded descriptor -> current contract/mode -> resource/profile readiness -> applicable grant -> dispatch. Reads of secrets remain F02 private operations even in Full Autonomous Build.

## Operations

- F08-OP01 evaluate internal {action:Action} -> {decision:"allow"|"deny"|"needs_approval",reason:Text(80),approvalId:Id or null}. If prompt required, create or return a pending record for the same exact operation/action. Default expiry 15 minutes, allowed 1..60 minutes at creation; fixed for that record.
- F08-OP02 approvals.list public read {state?:"pending"|"approved"|"rejected"|"expired"|"consumed"|"revoked",limit?:Int,cursor?:Text(1024)} -> Page(Entity(Approval)); default pending.
- F08-OP03 approvals.decide public mutation {approvalId:Id,decision:"approve"|"reject"} -> Entity(Approval); expectedRevision required; authenticated local human only, no internal/model/worker caller.
- F08-OP04 approvals.revoke public mutation {approvalId:Id} -> Entity(Approval); pending/approved can become revoked, consumed retains its historical state but sets revokedAt and triggers F09 stop-future-work for dependent runs plus pause for dependent schedules. Cannot undo a completed effect.
- F08-OP05 consume internal {approvalId:Id,operationId:Id,actionDigest:Digest} -> {authorized:true,grantId:Id}. In the same transaction as dispatch-intent admission, check active principal, unchanged scope/digest, expiry, revokedAt=null and approved state and unused grant. Set consumedBy=operationId. Replay by that same logical operation is allowed for reconciliation, not a second external execution.
- F08-OP06 approvals.get public read {approvalId:Id} -> Entity(Approval).

## Pending operation protocol

Effectful public operations accept an optional approvalId lookup hint. The caller submits the intended action first; the trusted owner creates its descriptor and pending grant. APPROVAL_REQUIRED returns approvalId and operationId while the operation remains admitted, not terminal failed. After approvals.decide, the same durable coordinator may continue that admitted operation if all current guards pass; a repeated original request/key only observes/resumes that identity. It cannot create a second effect. The displayed grant binds the actual original input, not a caller-authored Action object. Direct user actions outside a run use ask_each_change and the same effect coordinator with no model loop. A provided approvalId must refer to that exact operation/action; it never overrides policy.

## Races and presentation

Pending -> approved/rejected/expired/revoked; approved -> consumed/expired/revoked. Terminal rejected/expired/revoked cannot be approved later. Decision and expiry use server clock in the writer transaction. A stale UI receives CONFLICT with current revision; it must refresh, not reapply a previous choice to a new descriptor. A consumed grant is immutable evidence. If native/adapter admission fails before any effect, the original operation can reconcile not_sent; a changed operation requires a new grant.

The approval display is generated from Action: action kind, canonical target, project, changed bytes/command argv via inputDigest-linked preview, contract, cost ceiling, expiry. The display cannot substitute a friendly title for the target. CLI noninteractive callers return APPROVAL_REQUIRED with approvalId and do not block for an invisible prompt.

For automatic allow under an admitted autonomous contract, persist an audit record grant with state consumed, actor=policy via trusted context and the exact actionDigest. This is not represented as a human click. Edits to contract scopes or revocation invalidate subsequent dispatch checks, including queued specialists.

## Acceptance cases

| Case | Requirement / operation | Action | Required result |
|---|---|---|---|
| F08-T10 | R01 / OP01 | Caller supplies risk=low or principalId | Codec rejects; classifier remains trusted |
| F08-T11 | R02 / OP03–05 | Two different operations race to consume one grant | Only bound operation may consume; one durable consumedBy |
| F08-T12 | R02 / OP05 | Change canonical target/content after approval | Digest conflict before effect |
| F08-T13 | R03 / modes | Try commit/push/deploy in each autonomous mode without exact grant | APPROVAL_REQUIRED, no external action |
| F08-T14 | R04 / expiry | Decide at expiry, then replay old approve request | Expired remains expired; replay cannot revive it |

Legacy mode wire values are not assumed. These four names are the selected new-install vocabulary; an imported API needs an explicit compatibility mapping.
