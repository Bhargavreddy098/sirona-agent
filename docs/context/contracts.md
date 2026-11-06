---
title: "Deterministic context assembly, memory and skills"
status: "PROPOSED DESIGN"
implementation: "NOT IMPLEMENTED HERE"
verification: "NOT RUN"
feature_id: "F14"
specification: "EDITION 1 PROPOSAL"
updated: "2026-11-05"
---

# Deterministic context assembly, memory and skills

## Records and schemas

Inherit [foundation](../architecture/contract-foundation.md). Memory={state:"active"|"deleted",projectId:Id or null,ownerPrincipalId:Id,text:Text(8192),source:{kind:"user"|"repository"|"run",id:Id,digest:Digest},expiresAt:Time or null}. projectId=null means private user-wide memory, never another user's memory. User-wide memory is included only when the caller explicitly requests it; project scope is the default.

Skill={state:"disabled"|"enabled",name:Text(80),projectId:Id or null,content:BlobRef,digest:Digest,trust:"user_selected"|"repository"}. No skill may redefine application security, tool authority or execution modes. Source text is data/instructions within the user's task scope, not a policy override.

Context={state:"ready"|"invalidated",runId:Id,provider:Ref,modelId:Text(256),artifactId:Id,memoryRevisionDigest:Digest,items:List(ContextItem,200),omitted:List({sourceId:Id,reason:"budget"|"stale"|"deleted"|"scope"},500),tokenUpperBound:Int,digest:Digest}. ContextItem={sourceId:Id,kind:"contract"|"task"|"message"|"file"|"memory"|"skill",digest:Digest,text:Text(65536),trust:"system"|"user"|"untrusted"}.

## Operations

- F14-OP01 context.remember public mutation {projectId:Id or null,text:Text(8192),source,expiresAt:Time or null} -> Entity(Memory). Only user/repository/run sources accessible to the principal may be referenced.
- F14-OP02 context.correct public mutation {memoryId:Id,text:Text(8192)} -> Entity(Memory), expectedRevision mandatory.
- F14-OP03 context.delete public mutation {memoryId:Id} -> {deleted:true,invalidatedContexts:Int}. Tombstone and remove body text; retain ID/digest/provenance metadata for audit.
- F14-OP04 context.retrieve public read {projectId:Id,query:Text(1024),includeUserWide?:boolean,limit?:Int} -> List(Entity(Memory),50). Defaults false/20, limit1..50.
- F14-OP05 context.registerSkill public mutation {projectId:Id or null,name:Text(80),content:BlobRef,trust:"user_selected"|"repository"} -> Entity(Skill), disabled. content must be UTF-8 <=64 KiB and already authorized.
- F14-OP06 context.setSkill public mutation {skillId:Id,enabled:boolean} -> Entity(Skill). User-selection confirms loading only, not external tool permissions.
- F14-OP07 assemble internal {runId:Id,taskId:Id,artifactId:Id,provider:Ref,modelId:Text(256),maxInputTokens:Int,includeUserWide:boolean} -> Entity(Context).
- F14-OP08 context.listSkills public read {projectId:Id} -> List(Entity(Skill),100).

## Assembly and invalidation

For a deleted Memory, text is null; active Memory requires Text(8192). A context scrubbed after deletion remains invalidated with removed source text represented by its ID/digest only. It must never pass the ready-context codec used for dispatch.

Build mandatory contract/policy/task context first, then the most recent 20 session messages in chronological order, explicitly selected files, enabled skills and retrieved memory. The total input allowance is model contextTokens minus requested output allowance minus a fixed 1024-token safety reserve. Count using F04's qualified tokenizer/upper bound; if mandatory content alone exceeds it, LIMIT_EXCEEDED, not silent truncation of policy. Admit optional complete items until the allowance is exhausted; do not cut tool schemas or split Unicode text arbitrarily. Record every omitted source/reason and the exact digest/order of included items.

Memory query tokenization uses Unicode letters/numbers, lowercase, unique terms, no stemming. Rank by number of distinct query terms present, descending, then updatedAt descending and ID ascending; zero-match memories excluded. No vector database or hidden semantic-ranking model in edition 1. Expired records are excluded at query time. Cached context key includes project/artifact/contract, memory revisions, skill digests, model and tokenizer version.

Correct/delete invalidates derived contexts referencing the memory in one transaction. Future provider dispatch rechecks validity; queued contexts reassemble. A call already sent cannot be retroactively unsent: cancellation is signalled on deletion, existing receipts retained, and UI states that prior external exposure cannot be erased. Derived persisted context bodies containing deleted text are scrubbed; historical audit retains hashes/IDs only. Backups are separate historical copies and follow F21 retention, not a promise of retroactive erasure.

Repository skill loading is explicit and content-digest-pinned; edits disable it until reselected. Never auto-install packages or execute setup commands from skill content. Untrusted text can request actions only through F09's ordinary proposal/approval path.

## Acceptance cases

| Case | Requirement / operation | Action | Required result |
|---|---|---|---|
| F14-T10 | R01 / OP04 | Query project A with matching memory only in B | Empty result, no cross-project content |
| F14-T11 | R02 / OP03–07 | Delete memory after assembly but before dispatch | Context invalidated/scrubbed and reassembled; no stale dispatch |
| F14-T12 | R02 / assembly | Mandatory content exceeds budget | Explicit limit error; policy not dropped |
| F14-T13 | R03 / skill | Repository instruction claims permission to deploy | No authority change; ordinary F08 denial applies |
| F14-T14 | R04 / ranking | Same corpus/query/model twice | Same ordered source list/digest and omission reasons |
