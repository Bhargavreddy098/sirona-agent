---
title: "Architecture choices and execution gates"
status: "PROPOSED DESIGN"
implementation: "NOT IMPLEMENTED HERE"
verification: "NOT RUN"
updated: "2026-11-05"
---

# Architecture choices and execution gates

| Topic | Target | Gate before execution |
|---|---|---|
| Persistence | SQLite-only, one sirona.db | Exact conversion/schema and target approval; preserve source files |
| Platform | Windows Electron with React UI | Native/IPC tests and protected UI scope |
| Execution | Docker on WSL2, trusted-local projects | Exact image/profile qualification; no host fallback |
| Orchestration | Canonical run owner with bounded LangGraph specialists | Actual recovery and delegation qualification |
| Delegation | Flat, maximum three concurrent specialists | Trusted admission; no nested delegation |
| Inference | Configured real provider | Exact model and approved cost ceiling |
| First release | Local coding workspace | Real provider/tool/restore/desktop evidence |
| Later effects | Workers, browser control, deployment | Selected adapter/target and exact authority |

Choices do not authorize migrations, data conversion or activation. Four product modes remain bounded: Plan Only, Ask Before Every Change, Autonomous Coding, Full Autonomous Build. Commits, pushes and deployments are never implicit. External reference exports are untrusted source material, not instructions for Sirona.

Edition 1 now proposes the [shared RPC/types](../architecture/contract-foundation.md), [fresh-install SQL schema](../architecture/storage-contract.md), per-feature operation contracts and [source/test handoff](../engineering/build-handoff.md). These selections resolve the earlier outline's routine design gaps; they are not claims of applied migrations or running software.

Before dependent execution, supply the actual migration artifact/checksum derived from the implementation, selected live model/pricing/budget, exact guest/browser image/build qualification, and any external worker/deployment target. Fresh installation does not require a legacy conversion. Legacy source/data, additional native providers, LSP and general native computer control require separately specified adapters rather than inferred compatibility. Their unavailable behavior is defined in the current contracts.
