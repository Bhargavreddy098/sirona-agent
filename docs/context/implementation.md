---
title: "F14 implementation handoff"
status: "PROPOSED DESIGN"
implementation: "NOT IMPLEMENTED HERE"
verification: "NOT RUN"
feature_id: "F14"
updated: "2026-11-05"
---

# F14 implementation handoff

Read [requirements](requirements.md), [selected operation contracts](contracts.md), [connections](connections.md), [verification](verification.md), [shared contract foundation](../architecture/contract-foundation.md), [storage contract](../architecture/storage-contract.md) and [build handoff](../engineering/build-handoff.md). Follow the existing [roadmap](../engineering/roadmap.md); these specifications do not authorize implementation.

## Ordered build slices

1. Implement scoped memory/skill records, deterministic lexical retrieval and correction/deletion transactions.
2. Implement ordered budgeted context assembly with qualified token bounds and exact source/digest provenance.
3. Connect memory/skill settings and runtime dispatch invalidation; test deletion between assembly and provider send.

## Source allocation and completion

Allocate domain schema/service/repository to src/domains/context/; transport/native/consumer code belongs to the shared handoff paths. Implement the named operations, public/internal boundaries and exact record codecs in [contracts](contracts.md). Keep consumers thin and reuse the existing owner if source is later introduced. Proposed test directory: tests/features/F14/. The contract's T10-and-later cases are the concrete acceptance matrix; bind each to a test and actual observation.

Before marking the slice implemented, run the future package's pnpm typecheck and pnpm test:feature -- F14, then its relevant actual consumer journey. These script names are specified in the handoff and do not exist in this documentation-only checkout. Zero tests, missing required live prerequisites or fixture-only evidence cannot produce a completion claim.

Qualification boundary: Deterministic corpus/fake clock; token bound must be qualified for the selected model adapter.

## Recovery and rollout

Introduce codec/storage changes before exposing new consumer actions. On failure stop new admission, preserve operation IDs, completed receipts and uncertainty, and follow this owner's recovery transitions. Reverting source is not rollback of external effects or data. Do not erase evidence, overwrite user changes or enable a fallback to make a scenario pass. Fresh-install schema is specified; legacy source/data needs a separate inventoried conversion task.

## Specification review

Edition 1 supplies proposed operation behavior rather than the earlier outline. Review against the [operation specification standard](../engineering/operation-specification.md); the historical [F14 audit](../engineering/documentation-depth-audit.md#f14) explains the expansion. Review approval, implementation and runtime evidence remain separate.
