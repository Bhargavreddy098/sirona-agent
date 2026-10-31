# P5 approval scope - corrected proposal

2026-10-29. Status: proposed, not authorized for implementation or SQL application.

The current exact proposal is [SIRONA-WORKSPACE-P5-IMPLEMENTATION-PLAN.md](SIRONA-WORKSPACE-P5-IMPLEMENTATION-PLAN.md).
Read its source manifest, delegation/resource limits, persistence contract, ordered tasks,
acceptance tests, rollback and separate gates A (implementation), B (isolated migration)
and C (production rollout). Section 14 provides the OpenCode handoff and a future owner
approval template; those examples grant no authority by themselves.

The previous draft was superseded because it referenced nonexistent schema fields/tables,
omitted concrete LangGraph integration and proposed unsafe recovery semantics. Its original
bytes are retained in [the historical draft](../sironadocs/archive/p5-proposal-2026-10-29/SIRONA-WORKSPACE-P5-APPROVAL-before-corrected-plan.md).
Do not execute that draft's SQL or checkpoint deletion instructions.

Mandatory: LangGraph.js with TypeScript adapters over existing owners; at most three
concurrent specialists, parent-only repeated bounded delegation, no nested delegation,
real pending-write/checkpoint/effect recovery, one executing Home guest and real independent
verification. Existing provider/chat/UI/API/security/data contracts stay preserved.

No new migration is authored or applied by this documentation change. Working sirona,
production activation, frontend feature work, P6+, privileged operations and commits/pushes/
deployment remain excluded. OpenCode must inspect actual source and present any mismatch
before the owner grants implementation approval.
