---
title: "F10 — Specialists and independent review"
status: "PROPOSED DESIGN"
implementation: "NOT IMPLEMENTED HERE"
verification: "NOT RUN"
feature_id: "F10"
updated: "2026-11-05"
---

# F10 — Specialists and independent review

Primary phase: IP08. Target: Qualify flat parent delegation, max three concurrent specialists, independent artifact review and bounded repair.

Dependencies and consumers: [runtime](../runtime/index.md), [context](../context/index.md), [verification](../verification/index.md). These are responsibility links, not whole-feature build ordering; see the [roadmap](../engineering/roadmap.md).

- [Requirements](requirements.md)
- [Architecture](architecture.md)
- [Contracts](contracts.md)
- [Connections](connections.md)
- [Implementation](implementation.md)
- [Verification](verification.md)
- [Troubleshooting](troubleshooting.md)
- [Delegation And Review](delegation-and-review.md)

[System index](../INDEX.md)

## Edition 1 specification

The [operation contracts](contracts.md) select schemas, defaults, transitions, failures and acceptance cases. Follow the [ordered implementation slices](implementation.md) and [verification specification](verification.md), with the [shared foundation](../architecture/contract-foundation.md), [storage schema](../architecture/storage-contract.md) and [build handoff](../engineering/build-handoff.md). Status is specified proposal; implementation and runtime verification remain NOT RUN.
