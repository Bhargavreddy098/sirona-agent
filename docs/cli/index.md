---
title: "F24 — CLI and headless consumers"
status: "PROPOSED DESIGN"
implementation: "NOT IMPLEMENTED HERE"
verification: "NOT RUN"
feature_id: "F24"
updated: "2026-11-05"
---

# F24 — CLI and headless consumers

Primary phase: IP09. Target: Specify authenticated status/project/session/run commands using the same gateway.

Dependencies and consumers: [gateway](../gateway/index.md), [security](../security/index.md). These are responsibility links, not whole-feature build ordering; see the [roadmap](../engineering/roadmap.md).

- [Requirements](requirements.md)
- [Architecture](architecture.md)
- [Contracts](contracts.md)
- [Connections](connections.md)
- [Implementation](implementation.md)
- [Verification](verification.md)
- [Troubleshooting](troubleshooting.md)
- [Headless Commands](headless-commands.md)

[System index](../INDEX.md)

[Scheduled-job commands](cron.md)

## Edition 1 specification

The [operation contracts](contracts.md) select schemas, defaults, transitions, failures and acceptance cases. Follow the [ordered implementation slices](implementation.md) and [verification specification](verification.md), with the [shared foundation](../architecture/contract-foundation.md), [storage schema](../architecture/storage-contract.md) and [build handoff](../engineering/build-handoff.md). Status is specified proposal; implementation and runtime verification remain NOT RUN.
