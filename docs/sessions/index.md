---
title: "F03 — Sessions and persistence"
status: "PROPOSED DESIGN"
implementation: "NOT IMPLEMENTED HERE"
verification: "NOT RUN"
feature_id: "F03"
updated: "2026-11-05"
---

# F03 — Sessions and persistence

Primary phase: IP01. Target: Specify observable transaction failures, single-file persistence and isolated test paths; assess conversion only if legacy source is supplied.

Dependencies and consumers: [security](../security/index.md). These are responsibility links, not whole-feature build ordering; see the [roadmap](../engineering/roadmap.md).

- [Requirements](requirements.md)
- [Architecture](architecture.md)
- [Contracts](contracts.md)
- [Connections](connections.md)
- [Implementation](implementation.md)
- [Verification](verification.md)
- [Troubleshooting](troubleshooting.md)
- [Sqlite Transactions](sqlite-transactions.md)

[System index](../INDEX.md)

## Edition 1 specification

The [operation contracts](contracts.md) select schemas, defaults, transitions, failures and acceptance cases. Follow the [ordered implementation slices](implementation.md) and [verification specification](verification.md), with the [shared foundation](../architecture/contract-foundation.md), [storage schema](../architecture/storage-contract.md) and [build handoff](../engineering/build-handoff.md). Status is specified proposal; implementation and runtime verification remain NOT RUN.
