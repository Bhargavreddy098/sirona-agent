---
title: "Documentation rules"
status: "PROPOSED DESIGN"
implementation: "NOT IMPLEMENTED HERE"
verification: "NOT RUN"
updated: "2026-11-05"
---

# Documentation rules

Each feature has one behavioral owner. Topic pages answer focused questions; CLI and UI pages link to behavior rather than repeat it. Read index, requirements, contracts, connections, implementation and verification for the requested domain.

Keep requirements, design approval, implementation and evidence separate. Never infer PASS from written files or mocks. Use relative links, stable F01–F24 IDs and INDEX.md capitalization on Windows. Before coding, complete the bounded operation contract with exact schemas and gates. Do not create competing roadmaps or empty completion placeholders.

Use the [operation specification standard](engineering/operation-specification.md) to assess depth. The [domain audit](engineering/documentation-depth-audit.md) identifies missing details; each operation must settle inputs, outputs, limits, state transitions, races, recovery and observable acceptance in its existing owner. More pages or passing link checks do not establish build readiness. Claims about existing source require a source revision and evidence; this checkout contains documentation only.

Edition 1 operation details now live in each feature's contracts.md, with ordered implementation/verification guides. Read the [shared foundation](architecture/contract-foundation.md), [storage contract](architecture/storage-contract.md) and [build handoff](engineering/build-handoff.md) for the selected slice. The depth audit is historical; current contracts supersede its outline-era gaps. Keep live qualification inputs and explicitly unavailable extensions visible rather than silently choosing an adapter or expanding scope.
