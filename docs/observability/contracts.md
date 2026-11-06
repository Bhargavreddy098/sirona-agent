---
title: "Diagnostics, usage projections and evaluation runs"
status: "PROPOSED DESIGN"
implementation: "NOT IMPLEMENTED HERE"
verification: "NOT RUN"
feature_id: "F20"
specification: "EDITION 1 PROPOSAL"
updated: "2026-11-05"
---

# Diagnostics, usage projections and evaluation runs

## Records and event contract

Inherit [foundation](../architecture/contract-foundation.md). Diagnostic={state:"available"|"failed",createdBy:Id,windowStart:Time,windowEnd:Time,archive:BlobRef or null}. Evaluation={state:"draft"|"running"|"completed"|"failed"|"blocked",datasetDigest:Digest,cases:List(EvalCase,100),modelConfigDigest:Digest,environmentDigest:Digest,budgetMicroUsd:Money,results:List(EvalResult,100)}. EvalCase={id:Text(80),contract:Ref,artifactId:Id,expectedVerdict:"PASS"|"FAIL",maxDurationMs:Int,maxCostMicroUsd:Money}. EvalResult={caseId:Text(80),runId:Id,outcome:"PASS"|"FAIL"|"BLOCKED",durationMs:Int,costMicroUsd:Money or null,verdictId:Id or null,reason:Text(200) or null}. Unknown cost is null.

Structured diagnostic line={at:Time,level:"info"|"warn"|"error",component:Text(80),requestId:Id or null,operationId:Id or null,runId:Id or null,code:Text(80),message:Text(512)}. Only allowlisted fields; no request bodies, prompts, headers, credentials or raw external responses. Event payloads use each domain's declared projection; domain events contain metadata, not an indiscriminate record dump. Before persistence/export, redact known credential references' secret material if detected, and reject unsupported fields. Redaction is defense in depth, not permission to log raw secrets first.

## Operations

- F20-OP01 observability.health public read {} -> {at:Time,components:List({name:Text(80),state:"healthy"|"unhealthy"|"unknown"|"disabled",measuredAt:Time or null,reason:Text(200) or null},64)}. Actual probe registry, 2-second deadline/probe, cached at most15 seconds.
- F20-OP02 observability.usage public read {runId:Id} -> {spentMicroUsd:Money,heldMicroUsd:Money,unknownAttempts:Int,inputTokens:Int or null,outputTokens:Int or null}. F05 is authoritative; observability never settles or recomputes money from logs.
- F20-OP03 observability.export public mutation {since:Time,until:Time,includeLogs:boolean} -> Ack -> Entity(Diagnostic). Window maximum24 hours, <=10 MiB before archive; secrets and content bodies excluded. Export preview lists included categories and excluded data.
- F20-OP04 evaluations.create public mutation {cases:List(EvalCase,100),modelConfigDigest:Digest,budgetMicroUsd:Money} -> Entity(Evaluation), draft. At least1 case, unique case IDs, maxDuration1000..900000, aggregate sublimits<=budget; validate artifact/contract access.
- F20-OP05 evaluations.start public mutation {evaluationId:Id,approvalId?:Id} -> Ack. Requires exact dataset/model/environment/budget authority; no default paid run.
- F20-OP06 evaluations.get public read {evaluationId:Id} -> Entity(Evaluation).
- F20-OP07 evaluations.cancel public mutation {evaluationId:Id} -> Entity(Evaluation); cancels active child run, leaves completed case results and actual costs.
- F20-OP08 observability.diagnostic public read {diagnosticId:Id} -> Entity(Diagnostic).

## Probes, retention and evaluation algorithm

Healthy requires a successful current probe. Disabled means explicitly unconfigured capability; unknown means no valid measurement or timeout, never healthy. Database probe is a bounded actual read, provider probe is metadata-only, guest/browser/worker checks are their qualification/readiness ports. Do not send paid inference or deploy as a health check. Probe failure cannot crash the product's status screen.

Logs rotate at5 MiB per file, five files maximum, under dataRoot/logs with owner-only ACL. On log-write failure, emit one bounded sanitized stderr diagnostic and mark telemetry degraded; never suppress the domain result or invent successful audit persistence for a required effect. Security/approval evidence is durable in F03 independently of optional log output.

Evaluation dataset digest hashes ordered case definitions plus pinned contract/artifact digests. Execute cases sequentially, each in a fresh isolated project snapshot through F09; no live-project application. Parent evaluation budget allocates case sublimits and never exceeds the authorized aggregate reservation. A case passes only if real F15 verdict equals expectedVerdict and duration/cost thresholds are satisfied with known measurements. Missing provider/profile/evidence or unknown cost yields BLOCKED. Overall completed requires all cases to have actual results; report pass/fail/blocked counts and rate denominator=all cases. Never discard blocked cases to inflate success. No pass-rate threshold substitutes for product acceptance.

Emit diagnostics.changed and evaluation.changed using record IDs/state/counts. Diagnostic archives are authorized blobs; they cannot include private credential blobs or arbitrary filesystem paths.

## Acceptance cases

| Case | Requirement / operation | Action | Required result |
|---|---|---|---|
| F20-T10 | R01 / logging | Inject secrets into forbidden payload/error fields | Fields rejected/redacted before file/database/export |
| F20-T11 | R02 / OP01 | Probe missing, stale or timed out | unknown/disabled as applicable, not healthy |
| F20-T12 | R02 / OP02 | Replay provider usage event | Projection unchanged; F05 remains billing owner |
| F20-T13 | R03 / OP03 | Export foreign run or >24-hour window | Denied/invalid; no arbitrary data dump |
| F20-T14 | R04 / evaluation | One pass, one fail, one unavailable case | Counts1/1/1, denominator3; unavailable not scored as success |
