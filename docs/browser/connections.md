---
title: "F18 cross-domain handoffs"
status: "PROPOSED DESIGN"
implementation: "NOT IMPLEMENTED HERE"
verification: "NOT RUN"
feature_id: "F18"
updated: "2026-11-05"
---

# F18 cross-domain handoffs

F09 or an authenticated user requests a browser operation; F08 binds the exact target/observation/input. F18 uses only the qualified browser profile and actual observations, storing evidence through F03/F11 blobs. F15 interprets evidence against its criterion; F23 cannot turn an adapter acknowledgement into business success.

The exact request/result fields and transitions are owned by [contracts](contracts.md), with [shared envelopes/identity](../architecture/contract-foundation.md) and [F03 storage](../architecture/storage-contract.md). Resolve peer IDs through the [feature index](../INDEX.md); read that peer's contract before changing a handoff. No transport, UI, CLI or adapter may duplicate the business state machine.

On prerequisite failure return the owner's unavailable/blocked result before dispatch. On response loss use the original operation identity. Reconciliation, not repeated business mutation, resolves uncertain effects. Consumer rendering and notification failure never justify replaying a completed action.

Verify the [concrete acceptance cases](verification.md) and [worked cross-feature journey](../journeys/implementation-example.md) through the actual boundary; source helpers alone do not establish consumer integration. All application evidence remains NOT RUN.
