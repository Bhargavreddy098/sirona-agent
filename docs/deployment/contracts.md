---
title: "Deployment preview, release receipts and rollback"
status: "PROPOSED DESIGN"
implementation: "NOT IMPLEMENTED HERE"
verification: "NOT RUN"
feature_id: "F19"
specification: "EDITION 1 PROPOSAL"
updated: "2026-11-05"
---

# Deployment preview, release receipts and rollback

## Target contract and records

Inherit [foundation](../architecture/contract-foundation.md). Target={state:"unconfigured"|"unqualified"|"qualified"|"unavailable",adapter:Text(80),environment:Text(80),endpoint:Text(2048),credentialId:Id,healthUrl:Text(2048),previousReleaseLookup:boolean,qualificationDigest:Digest or null}. A concrete vendor/target remains user-selected; no hosting account or paid default is inferred. Edition 1 specifies the port and disabled path so implementations cannot manufacture an active deployment.

Release={state:"previewed"|"deploying"|"healthy"|"unhealthy"|"rolling_back"|"rolled_back"|"failed"|"uncertain",target:Ref,artifactId:Id,artifactDigest:Digest,contractDigest:Digest,previewDigest:Digest,externalReleaseId:Text(256) or null,previousReleaseId:Text(256) or null,health:List(Probe,10),rollbackCompatible:boolean}. Probe={at:Time,statusCode:Int or null,latencyMs:Int,outcome:"pass"|"fail"|"unknown"}. No credential-bearing URLs or secret values in records.

## Operations

- F19-OP01 deployment.register public mutation {adapter,environment,endpoint,credentialId,healthUrl,previousReleaseLookup:boolean} -> Entity(Target), unqualified. Endpoints are HTTPS with exact allowed host/port, no redirects/userinfo.
- F19-OP02 deployment.qualify native/admin mutation {targetId:Id} -> Ack; selected test target and explicit deployment/rollback authority required.
- F19-OP03 deployment.preview public mutation {targetId:Id,artifactId:Id,contractDigest:Digest} -> Entity(Release). Resolve current target revision, immutable artifact, current external release and rollback compatibility; no deployment.
- F19-OP04 deployment.execute public mutation {releaseId:Id,previewDigest:Digest,approvalId?:Id} -> Ack. Grant binds exact artifact, target revision, environment and rollback plan.
- F19-OP05 deployment.get public read {releaseId:Id} -> Entity(Release).
- F19-OP06 deployment.rollback public mutation {releaseId:Id,approvalId?:Id} -> Ack. Separate exact approval, unless the original grant explicitly includes this same rollback target/action.
- F19-OP07 deployment.list public read {targetId:Id,limit?:Int,cursor?:Text(1024)} -> Page(Entity(Release)).

Adapter port: inspect(target)->{currentReleaseId:Text(256) or null,rollbackCompatible:boolean}; deploy({operationId,artifact:BlobRef,environment,expectedCurrentReleaseId})->{externalReleaseId}; lookup(operationId)->{status:"not_found"|"running"|"completed"|"unknown",externalReleaseId:Text(256) or null}; rollback({operationId,fromReleaseId,toReleaseId})->{externalReleaseId}. Vendor mapping must document exact request/receipt schemas and idempotency behavior before qualification; unsupported lookup forces uncertain on lost responses.

## Deployment and health algorithm

Only F19 may invoke the target adapter. Verify F15 PASS for the exact artifact/contract before preview and again before execute; stale verdict prevents dispatch. Serialize releases per target. Persist intent and F08 consumption before deploy. Changed artifact/target/current external release invalidates preview. Default deployment deadline10 minutes; timeout means uncertain unless adapter proves failure/no effect.

After an actual external release ID, probe the exact health URL every5 seconds for at most60 seconds. A probe passes only on HTTP200..299 with latency<=2000ms and no redirect. Healthy requires three consecutive passes; any missing network observation is unknown, not healthy. Record all final10 probes. Unhealthy never silently becomes rolled_back; invoke the separately authorized rollback only if previousReleaseId exists and compatibility is true. No automatic database rollback when new application writes may have occurred.

After uncertain deployment, lookup stable operationId and inspect target; reconcile identity before retry. If target cannot attribute the release, keep uncertain for an explicit recovery decision. Rollback follows the same intent/receipt/probe protocol. An adapter API accepting a request does not establish healthy or rolled_back.

## Acceptance cases

| Case | Requirement / operation | Action | Required result |
|---|---|---|---|
| F19-T10 | R01 / OP03–04 | Unqualified target | UNAVAILABLE, zero deployment call |
| F19-T11 | R02 / OP04 | Change artifact or target revision after preview | CONFLICT, old approval cannot dispatch |
| F19-T12 | R02 / recovery | Deploy accepted but response lost | Lookup/reconcile; no blind second deploy |
| F19-T13 | R03 / health | Three successful probes vs missing/timeout probes | Healthy only for actual consecutive passes |
| F19-T14 | R04 / OP06 | Previous release absent or rollback incompatible | Rollback blocked, original evidence preserved |

Target-independent tests use a protocol fixture and do not qualify a vendor. Live qualification is explicitly pending selection, credentials, budget and permission.
