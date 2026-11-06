---
title: "F20 cross-domain handoffs"
status: "PROPOSED DESIGN"
implementation: "NOT IMPLEMENTED HERE"
verification: "NOT RUN"
feature_id: "F20"
updated: "2026-11-05"
---

# F20 cross-domain handoffs

Each owner emits its declared sanitized metadata; F20 correlates request/operation/run identities without taking over their state. F05 owns monetary truth. F20 evaluation cases invoke F09 against isolated F11 snapshots and consume F15 verdicts; F23/F24 sees measured health, explicit unknowns and scoped diagnostic exports.

The exact request/result fields and transitions are owned by [contracts](contracts.md), with [shared envelopes/identity](../architecture/contract-foundation.md) and [F03 storage](../architecture/storage-contract.md). Resolve peer IDs through the [feature index](../INDEX.md); read that peer's contract before changing a handoff. No transport, UI, CLI or adapter may duplicate the business state machine.

On prerequisite failure return the owner's unavailable/blocked result before dispatch. On response loss use the original operation identity. Reconciliation, not repeated business mutation, resolves uncertain effects. Consumer rendering and notification failure never justify replaying a completed action.

Verify the [concrete acceptance cases](verification.md) and [worked cross-feature journey](../journeys/implementation-example.md) through the actual boundary; source helpers alone do not establish consumer integration. All application evidence remains NOT RUN.
