---
title: "Goal intake, evidence and requirement revisions"
status: "PROPOSED DESIGN"
implementation: "NOT IMPLEMENTED HERE"
verification: "NOT RUN"
feature_id: "F06"
specification: "EDITION 1 PROPOSAL"
updated: "2026-11-05"
---

# Goal intake, evidence and requirement revisions

## Data contract

Inherit [foundation](../architecture/contract-foundation.md). RequirementSet data={state:"draft"|"needs_input"|"ready"|"superseded",projectId:Id,goal:Text(8192),constraints:List(Text(1024),50),nonGoals:List(Text(1024),50),items:List(Item,100),questions:List(Question,20),sources:List(Source,100),previousId:Id or null}. Item={key:Text(40),statement:Text(2048),acceptance:Text(4096),sourceIds:List(Id,20),assumption:boolean}. Item keys match R-[1-9][0-9]{0,3} and are unique within the revision. Acceptance must describe an observable outcome; readiness review rejects empty/vague criteria rather than claiming a model score proves measurability.

Question={id:Id,text:Text(1024),blocking:boolean,answer:Text(4096) or null,answeredBy:Id or null}. Source={id:Id,kind:"user"|"web"|"repository",locator:Text(2048),retrievedAt:Time,digest:Digest,excerpt:Text(4096),confidence:"confirmed"|"inferred"|"conflicting"}. Repository locators pin project artifact revision; web locators use http/https and retrieval time. Sources never grant authority.

## Operations

- F06-OP01 requirements.create public mutation {projectId:Id,goal:Text(8192)} -> Entity(RequirementSet), state draft, empty lists.
- F06-OP02 requirements.revise public mutation {setId:Id,constraints,nonGoals,items,questions,sources} -> Entity(RequirementSet), replacing the draft content at expectedRevision. Validate source references and question IDs. Caller-supplied answeredBy is forbidden; answered fields are null in proposals.
- F06-OP03 requirements.answer public mutation {setId:Id,questionId:Id,answer:Text(4096)} -> Entity(RequirementSet); derives answeredBy from trusted human principal. A model/internal service cannot answer on the user's behalf.
- F06-OP04 requirements.confirm public mutation {setId:Id,acceptedItemKeys?:List(Text(40),100)} -> Entity(RequirementSet), ready only if at least one item, no unanswered blocking questions, and every inferred/conflicting assumption is either resolved or explicitly accepted by listing its item key. acceptedItemKeys defaults empty; accepting an assumption is a requirement decision, not execution permission.
- F06-OP05 requirements.fork public mutation {setId:Id,goal?:Text(8192)} -> Entity(RequirementSet), new draft with previousId pointing to the immutable ready revision; old content stays readable.
- F06-OP06 requirements.get public read {setId:Id} -> Entity(RequirementSet). requirements.list public read {projectId:Id,limit?:Int,cursor?:Text(1024)} -> Page(Entity(RequirementSet)).

## State and integration

Draft edits set needs_input when unanswered blocking questions exist, otherwise draft. Confirmed ready sets are immutable. Further changes fork a new record; F07 pins the old record ID/revision/digest and must explicitly adopt the new one. Marking a set superseded changes discovery metadata only and never rewrites its frozen body or invalidates historical evidence. Newly admitting a run with a superseded set requires a new human confirmation.

For agent-assisted drafting, F09 calls F04 within a budget, gives the model the same Item/Question/Source schemas, and stores the result through requirements.revise as a proposal. A model's claim that information was user-confirmed is rejected. A malformed model answer leaves the previous draft unchanged and records a visible drafting error. Maximum two schema-repair attempts within the same budget. No automatic research browsing is necessary for manual intake; actual web research requires an authorized F18/F13 capability and evidence from it. Unavailable research does not become a fake source.

Events requirements.changed and requirements.ready contain setId, revision and state. UI shows unresolved questions, evidence provenance and assumptions separately from accepted requirements; CLI prints them in the same data. No acceptance click auto-starts code execution.

## Acceptance cases

| Case | Requirement / operation | Action | Required result |
|---|---|---|---|
| F06-T10 | R01 / OP01–04 | Goal with blocking question; attempt confirm | CONFLICT reason unanswered_question; no ready record |
| F06-T11 | R02 / OP02 | Item references absent source or duplicate key | INVALID_ARGUMENT; original draft intact |
| F06-T12 | R03 / OP03 | Model tries to submit answeredBy or human answer | Rejected by codec/context; no authority fabricated |
| F06-T13 | R02 / OP04–05 | Confirm, then change goal | New draft ID, old ready revision/digest unchanged |
| F06-T14 | R04 / assisted draft | Malformed provider result then process restart | No partial draft replacement; stored questions/provenance survive |

Case IDs supplement existing requirements R01–R04. Implementation must include the manual flow before agent-assisted drafting so missing inference never blocks reading/editing requirements.
