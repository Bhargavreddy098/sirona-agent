---
title: "Model eligibility, budget reservation and settlement"
status: "PROPOSED DESIGN"
implementation: "NOT IMPLEMENTED HERE"
verification: "NOT RUN"
feature_id: "F05"
specification: "EDITION 1 PROPOSAL"
updated: "2026-11-05"
---

# Model eligibility, budget reservation and settlement

## Exact accounting records

Inherit [foundation](../architecture/contract-foundation.md). Price={inputMicroUsdPerMillion:Money,outputMicroUsdPerMillion:Money,requestMicroUsd:Money,revision:Text(80)}. Rates are explicit user-approved configuration snapshots, never guessed from model names. Budget data={state:"open"|"exhausted"|"frozen",runId:Id,ceiling:Money,spent:Money,held:Money}. Ceiling is 0..1000000000; default 0 disables paid inference. Reservation data={state:"held"|"settled"|"released"|"uncertain",budgetId:Id,attemptId:Id,amount:Money,settledAmount:Money or null,price:Price,inputUpperBound:Int,outputUpperBound:Int}. Unique keys budget_run=(runId), reservation_attempt=(attemptId), usage_settlement=(attemptId).

One run budget covers the parent and all specialists/retries. A separate provider attempt always consumes a separate reservation. Unknown usage counts as held, not zero. Integer ceiling formula: requestMicroUsd + ceil(inputUpperBound*inputRate/1000000) + ceil(outputUpperBound*outputRate/1000000). Use overflow-checked integer arithmetic. Input bound comes from a qualified tokenizer or adapter-proved upper bound; no such bound means unavailable. Output bound is requested maxOutputTokens.

## Operations and ordering

- F05-OP01 routing.preview public read {modelCandidates:List({providerId:Id,modelId:Text(256)},20),requiresTools:boolean,inputTokens:Int,maxOutputTokens:Int} -> {eligible:List({providerId,modelId,estimatedMax:Money,price:Price},20),rejected:List({providerId,modelId,reason:"disabled"|"capability"|"context"|"price_missing"},20)}. Preserves candidate order; no reservation or inference.
- F05-OP02 createBudget internal {runId:Id,ceiling:Money} -> Entity(Budget). Ceiling cannot exceed the admitted F07 contract and F08 authority.
- F05-OP03 reserve internal {budgetId:Id,attemptId:Id,provider:Ref,modelId:Text(256),inputUpperBound:Int,outputUpperBound:Int} -> Entity(Reservation). Recheck capability, price revision and available ceiling in one F03 transaction; require spent+held+amount<=ceiling.
- F05-OP04 settle internal {attemptId:Id,usage:{inputTokens:Int,outputTokens:Int},receiptDigest:Digest} -> Entity(Reservation). Compute actual cost using stored price; same usage/receipt replay is no-op, conflicting settlement is CONFLICT reason usage_conflict.
- F05-OP05 reconcile internal {attemptId:Id,outcome:"not_sent"|"unknown",evidenceDigest:Digest} -> Entity(Reservation). Proven not_sent releases held amount; unknown sets uncertain and keeps it. No automatic TTL releases a dispatched reservation.
- F05-OP06 routing.budget public read {runId:Id} -> {budget:Entity(Budget),reservations:List(Entity(Reservation),200)}; more than 200 uses shared pagination in a reservations list operation with {runId,limit?,cursor?}.

## Failures, cancellation and fallback

Reservation and held increment commit together. Settlement subtracts the original hold and adds actual amount once. Actual usage exceeding its estimate is still recorded accurately: mark budget frozen, cancel future dispatch and expose overage; never clamp billed cost to hide it. A configured ceiling is an admission bound, not a guarantee an external provider cannot misreport or overbill.

No additional attempts while a budget is frozen. User budget increases require a new F07 contract revision and explicit authority; they are not a settlement side effect. Completion of all known requests does not turn uncertain holds into released values. Provider reconciliation may later settle them with evidence.

Fallback is permitted only when the previous attempt is proven not_sent, or failed before any text/tool output and its financial reservation is settled/released, and the alternative satisfies the same capabilities and remaining budget. At most two total attempts per logical model request. Any partial output or dispatched tool effect ends automatic fallback eligibility. F09 records the attempt chain.

Concurrency limit: four active provider attempts per installation, including specialists; queue at most 20, deadline 30 seconds. Admission order is FIFO by durable operation creation time then ID. An active attempt's transport cancellation frees the execution slot after cleanup; its unresolved financial hold remains.

## Acceptance cases

| Case | Requirement / operation | Action | Required result |
|---|---|---|---|
| F05-T10 | R01 / OP03 | Budget ceiling 100, two simultaneous reservations of 60 | One accepted, one denied; held=60 |
| F05-T11 | R02 / OP04 | Settle a hold of 60 for actual 40 twice | spent=40, held=0; conflicting usage rejected |
| F05-T12 | R02 / OP05 | Cancel request after send with missing usage | uncertain with hold retained, never charged zero by assumption |
| F05-T13 | R03 / preview | Request tools from a non-tool model | capability rejection before dispatch |
| F05-T14 | R04 / fallback | First attempt emits one text delta then fails | No fallback; interrupted result retained |
| F05-T15 | R02 / OP04 | Actual 120 against ceiling 100 | Actual cost recorded, budget frozen, no new call |

All arithmetic tests use integer micro-USD and deterministic rates; real pricing/spend requires explicit configuration and authorization.
