---
title: "Task graphs and immutable Build Contracts"
status: "PROPOSED DESIGN"
implementation: "NOT IMPLEMENTED HERE"
verification: "NOT RUN"
feature_id: "F07"
specification: "EDITION 1 PROPOSAL"
updated: "2026-11-05"
---

# Task graphs and immutable Build Contracts

## Schema and digest

Inherit [foundation](../architecture/contract-foundation.md). Contract data={state:"draft"|"approved"|"superseded",projectId:Id,requirements:Ref,requirementsDigest:Digest,mode:"plan_only"|"ask_each_change"|"autonomous_coding"|"full_autonomous_build",modelRoutes:List(ModelRoute,20),tasks:List(Task,100),allowedEffects:List(EffectScope,100),budgetMicroUsd:Money,maxModelTurns:Int,repairLimit:Int,digest:Digest or null,approvalId:Id or null,previousId:Id or null}. ModelRoute={provider:Ref,modelId:Text(256),maxOutputTokens:Int}; maxOutputTokens must fit the pinned provider model. Task={id:Id,title:Text(200),kind:"reason"|"patch"|"command"|"verify"|"research"|"specialist",dependsOn:List(Id,100),requirementKeys:List(Text(40),100),instructions:Text(8192),acceptance:List(Criterion,50)}. Criterion={id:Id,description:Text(2048),checker:"command"|"artifact"|"review",required:boolean,config:Json}. F15 closes the checker-specific config schemas. EffectScope is F08's exact scope schema.

Defaults maxModelTurns=20 (1..50), repairLimit=2 (0..3), budgetMicroUsd=0 (0..1000000000). Model routes retain explicit preference order; a runnable contract containing model-assisted tasks requires at least one qualified route. Plan Only/manual contracts may use an empty list. Task IDs and criterion IDs unique. Every dependency resolves in the same DAG; reject self-edge/cycle before storage. Every requirement key resolves in the pinned ready requirements. At least one task and one required criterion for a runnable contract. Plan Only may contain proposed effectful tasks but cannot admit their execution.

Digest object includes projectId, requirements, requirementsDigest, mode, modelRoutes, tasks, allowedEffects, budgetMicroUsd, maxModelTurns, repairLimit. Exclude lifecycle/approval/history/timestamps. Sort tasks by ID, dependsOn by ID, requirementKeys lexically and allowedEffects by JCS bytes before hashing; preserve criterion order. Persist the normalized object so approval UI and executor hash the same bytes.

## Operations

- F07-OP01 planning.create public mutation {projectId:Id,requirements:Ref,mode,modelRoutes,tasks,allowedEffects,budgetMicroUsd?,maxModelTurns?,repairLimit?} -> Entity(Contract), draft. Resolve and hash the ready requirement record.
- F07-OP02 planning.revise public mutation {contractId:Id,modelRoutes,tasks,allowedEffects,mode,budgetMicroUsd,maxModelTurns,repairLimit} -> Entity(Contract), draft only, expectedRevision mandatory.
- F07-OP03 planning.requestApproval public mutation {contractId:Id} -> {contract:Entity(Contract),approval:Entity(Approval)}. Freeze candidate digest and create F08 build_contract descriptor; no project effects.
- F07-OP04 planning.finalize internal {contractId:Id,approvalId:Id} -> Entity(Contract), approved only when F08 validates exact digest and principal. This transition and grant binding commit together; changed draft invalidates pending approval.
- F07-OP05 planning.fork public mutation {contractId:Id} -> Entity(Contract), new draft previousId; old approved body remains immutable.
- F07-OP06 planning.get public read {contractId:Id} -> Entity(Contract); planning.list public read {projectId:Id,limit?:Int,cursor?:Text(1024)} -> Page(Entity(Contract)).

## Admission, changes and consumers

Approved means the exact plan was accepted, not blanket permission for commit, push, deployment or arbitrary tool access. F08 still evaluates each effect. F09 admission requires current approved digest, active project, ready pinned requirements, budget and execution prerequisites. Superseding a contract blocks new admissions under it; active runs retain the admitted immutable contract unless authority is revoked or narrowed. New scope never hot-patches an active run. Cancel/reconcile then admit a new run under the new contract.

Task order is a stable topological order with ID lexical tie-break. Runtime executes one task at a time except explicitly delegated F10 specialists; dependencies must have succeeded. Missing required verification blocks downstream success. Plan-only UI shows proposed tasks/effects/cost ceiling and a disabled Execute with the reason; generating a plan can use an independently authorized inference budget but cannot dispatch workspace writes.

Events planning.changed, planning.approved and planning.superseded carry contractId/revision/digest/state. UI review shows the exact normalized tasks, target scopes, mode, budget and criteria; it must not hide external effects in collapsed generic summaries.

## Acceptance cases

| Case | Requirement / operation | Action | Required result |
|---|---|---|---|
| F07-T10 | R01 / OP01 | DAG A depends B, B depends A | INVALID_ARGUMENT reason dependency_cycle; no draft created |
| F07-T11 | R02 / OP03–04 | Change allowedEffects while approval pending | Old grant cannot finalize; new digest required |
| F07-T12 | R02 / digest | Permute set-like task/dependency input order | Same normalized digest; changing criterion content changes digest |
| F07-T13 | R03 / admission | Approved Plan Only contract contains patch task | F09 does not execute it; zero workspace effects |
| F07-T14 | R04 / OP05 | Fork while old run exists | New draft separate; old run sees original immutable scope |

No graph library owns execution independently of F09. F23 React Flow is a projection of this DAG, not a second task scheduler.
