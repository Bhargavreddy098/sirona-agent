---
title: "F13 cross-domain handoffs"
status: "PROPOSED DESIGN"
implementation: "NOT IMPLEMENTED HERE"
verification: "NOT RUN"
feature_id: "F13"
updated: "2026-11-05"
---

# F13 cross-domain handoffs

F11 supplies immutable artifact bytes, F12 supplies qualified search/parser execution and F08 governs MCP effects. F13 validates registered schema digests and returns bounded revision-tagged results to F14/F09. F23 shows stale indexes as stale; tool discovery never confers runtime authority.

The exact request/result fields and transitions are owned by [contracts](contracts.md), with [shared envelopes/identity](../architecture/contract-foundation.md) and [F03 storage](../architecture/storage-contract.md). Resolve peer IDs through the [feature index](../INDEX.md); read that peer's contract before changing a handoff. No transport, UI, CLI or adapter may duplicate the business state machine.

On prerequisite failure return the owner's unavailable/blocked result before dispatch. On response loss use the original operation identity. Reconciliation, not repeated business mutation, resolves uncertain effects. Consumer rendering and notification failure never justify replaying a completed action.

Verify the [concrete acceptance cases](verification.md) and [worked cross-feature journey](../journeys/implementation-example.md) through the actual boundary; source helpers alone do not establish consumer integration. All application evidence remains NOT RUN.
