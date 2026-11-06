---
title: "Trusted evidence, checker contracts and verdicts"
status: "PROPOSED DESIGN"
implementation: "NOT IMPLEMENTED HERE"
verification: "NOT RUN"
feature_id: "F15"
specification: "EDITION 1 PROPOSAL"
updated: "2026-11-05"
---

# Trusted evidence, checker contracts and verdicts

## Criteria and evidence schemas

Inherit [foundation](../architecture/contract-foundation.md). F07 Criterion.config is closed by checker kind:
- command: {profileId:Id,executable:Text(1024),args:List(Text(4096),100),cwd:Text(1024),timeoutMs:Int,expectedExitCode:Int}; no stdout substring can replace exit/process evidence; timeout follows F12.
- artifact: {assertions:List({path:Text(1024),condition:"exists"|"absent"|"digest",digest:Digest or null},100)}; digest required only for condition digest.
- review: {instructions:Text(4096),requiresHuman:true}; an independent F10 review can inform the decision, but a required review criterion needs a human attestation bound to the artifact.

Receipt={state:"valid"|"invalidated",runId:Id,criterionId:Id,contractDigest:Digest,artifactDigest:Digest,environmentDigest:Digest,checker:"command"|"artifact"|"review",outcome:"PASS"|"FAIL"|"UNKNOWN",details:Text(4096),evidence:List(BlobRef,20),checkerOperationId:Id,reviewerPrincipalId:Id or null}. Verdict={state:"current"|"stale",runId:Id,artifactId:Id,contractDigest:Digest,outcome:"PASS"|"FAIL"|"UNKNOWN",requiredCriterionIds:List(Id,1000),receiptIds:List(Id,1000),missingCriterionIds:List(Id,1000)}.

## Operations and aggregation

- F15-OP01 verification.run internal {runId:Id,artifactId:Id,criterionIds:List(Id,1000)} -> Ack. Resolve criteria from the admitted immutable contract; client/model cannot substitute easier conditions.
- F15-OP02 recordReceipt internal verifier-only {runId,criterionId,contractDigest,artifactDigest,environmentDigest,checker,outcome,details,evidence,checkerOperationId,reviewerPrincipalId:Id or null} -> Entity(Receipt). Validate actual checker operation and scope. No public receipt-write endpoint.
- F15-OP03 verification.review public mutation {runId:Id,artifactId:Id,criterionId:Id,decision:"accept"|"reject",note:Text(4096)} -> Entity(Receipt). Human only, current artifact displayed, required review criterion only; principal assigned by F02.
- F15-OP04 aggregate internal {runId:Id,artifactId:Id} -> Entity(Verdict). Match contract/artifact/environment receipts; latest completed eligible check per criterion supersedes earlier checks but cannot erase their history.
- F15-OP05 verification.get public read {verdictId:Id} -> {verdict:Entity(Verdict),receipts:List(Entity(Receipt),1000)}.
- F15-OP06 invalidate internal {runId:Id,newArtifactId:Id} -> {invalidated:Int}. Edition 1 conservatively invalidates every required receipt on any artifact digest change; optimization by affected paths is deferred.

PASS requires every required criterion to have valid PASS evidence. Any valid required FAIL makes FAIL, including when other checks are missing. Otherwise absent/UNKNOWN/invalidated evidence yields UNKNOWN. Optional failures are visible but do not turn an otherwise passing required set into FAIL. Zero required criteria yields UNKNOWN. Contradictory receipts for the same checkerOperationId are rejected as CONFLICT, never resolved by selecting PASS.

## Actual execution and repair

The verifier coordinator invokes F12 command checks on the exact artifact snapshot; it records actual exit code, timeout, profile digest and logs. Nonzero unexpected exit is FAIL; unavailable checker, missing receipt, infrastructure interruption or uncertain process outcome is UNKNOWN. A trusted artifact checker uses actual manifest bytes; a model saying a file exists is insufficient. Human review binds artifact digest, criterion and contract; changing any invalidates the attestation.

F10 model review output is advisory unless converted through the explicit human review operation; this prevents a producer's narrative from becoming completion evidence. Autonomous workflows can choose command/artifact criteria that require no human review; they cannot silently drop a review criterion after approval.

F09 repairs only within contract.repairLimit and remaining scope/budget. Every repair produces a new artifact and reruns all required checks under edition 1. No alteration of checker commands or expected codes to make the result pass. Emit verification.changed with verdictId/runId/outcome/missing count; UI distinguishes failure from unavailable evidence.

## Acceptance cases

| Case | Requirement / operation | Action | Required result |
|---|---|---|---|
| F15-T10 | R01 / OP04 | No receipts or zero required criteria | UNKNOWN, never PASS |
| F15-T11 | R02 / OP02 | Producer supplies fabricated successful log | Rejected, no valid checker receipt |
| F15-T12 | R02 / OP06 | Change one artifact byte after PASS | Prior verdict stale; required checks invalidated |
| F15-T13 | R03 / aggregate | One required FAIL and one missing receipt | FAIL with missing criterion still visible |
| F15-T14 | R04 / command | Real checker unavailable vs real assertion fails | UNKNOWN vs FAIL remain distinct |
| F15-T15 | R02 / review | Human accepts old artifact then artifact changes | Attestation cannot certify the new artifact |
