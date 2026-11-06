---
title: "F22 cross-domain handoffs"
status: "PROPOSED DESIGN"
implementation: "NOT IMPLEMENTED HERE"
verification: "NOT RUN"
feature_id: "F22"
updated: "2026-11-05"
---

# F22 cross-domain handoffs

F22 launches and authenticates the sole F03/F01 backend, brokers F02 credentials and exposes only the named preload methods to F23. The per-user verified pipe gives F24 ephemeral scoped authentication. Native recovery invokes F21 with exact grants; renderer or pipe input never becomes arbitrary shell/filesystem capability.

The exact request/result fields and transitions are owned by [contracts](contracts.md), with [shared envelopes/identity](../architecture/contract-foundation.md) and [F03 storage](../architecture/storage-contract.md). Resolve peer IDs through the [feature index](../INDEX.md); read that peer's contract before changing a handoff. No transport, UI, CLI or adapter may duplicate the business state machine.

On prerequisite failure return the owner's unavailable/blocked result before dispatch. On response loss use the original operation identity. Reconciliation, not repeated business mutation, resolves uncertain effects. Consumer rendering and notification failure never justify replaying a completed action.

Verify the [concrete acceptance cases](verification.md) and [worked cross-feature journey](../journeys/implementation-example.md) through the actual boundary; source helpers alone do not establish consumer integration. All application evidence remains NOT RUN.
