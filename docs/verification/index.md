---
title: "F15 — Verification and quality"
status: "PROPOSED DESIGN"
implementation: "NOT IMPLEMENTED HERE"
verification: "NOT RUN"
feature_id: "F15"
updated: "2026-11-05"
---

# F15 — Verification and quality

Primary phase: IP06. Target: Specify UNKNOWN for missing required evidence; obtain trusted checker receipts and bind verdict to artifact/contract.

Dependencies and consumers: [planning](../planning/index.md), [tools](../tools/index.md), [workspace](../workspace/index.md). These are responsibility links, not whole-feature build ordering; see the [roadmap](../engineering/roadmap.md).

- [Requirements](requirements.md)
- [Architecture](architecture.md)
- [Contracts](contracts.md)
- [Connections](connections.md)
- [Implementation](implementation.md)
- [Verification](verification.md)
- [Troubleshooting](troubleshooting.md)
- [Evidence And Verdicts](evidence-and-verdicts.md)

[System index](../INDEX.md)

## Edition 1 specification

The [operation contracts](contracts.md) select schemas, defaults, transitions, failures and acceptance cases. Follow the [ordered implementation slices](implementation.md) and [verification specification](verification.md), with the [shared foundation](../architecture/contract-foundation.md), [storage schema](../architecture/storage-contract.md) and [build handoff](../engineering/build-handoff.md). Status is specified proposal; implementation and runtime verification remain NOT RUN.
