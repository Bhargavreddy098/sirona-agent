---
title: "Sirona 24-Feature Implementation and Qualification Plan"
summary: "Canonical IP00-IP13 planning with explicit qualification and approval boundaries."
read_when:
  - "Preparing the next approved implementation phase"
owning_subsystem: "Implementation planning"
primary_source_files:
  - "apps/server/config/sqliteDb.js"
  - "apps/server/services/sandboxManager.js"
  - "apps/server/routes/index.js"
design_status: "PROPOSED"
updated: "2026-11-05"
---

# Sirona 24-Feature Implementation and Qualification Plan

## Status and authorization

Documentation-only planning snapshot, 2026-11-05. No product tests run, no data opened or changed, no source changes, no dependency installation, no application startup. Static inventory completion is not IP00 runtime baseline qualification or phase acceptance. All implementation tasks are NOT_STARTED by this package.

Owner-selected target in this conversation: SQLite-only; one unified sirona.db; first release is the local coding workspace. These choices authorize planning, not migration application, working-data conversion, policy changes, live inference, guest activation or deployment. Existing STOP rules remain enforced pending explicit scoped reconciliation. This plan extends the 24-feature topic architecture; it does not claim those proposed topic pages already exist.

## Canonical package

- [Feature matrix](FEATURE-IMPLEMENTATION-MATRIX.md): all F01–F24 requirements, status, owners, gaps and acceptance.
- [Source ownership](SOURCE-OWNERSHIP-MAP.md): exact reusable code/test paths.
- [Static inventory](IP00-SOURCE-INVENTORY.md): route declarations, schema declarations, IPC and hashed source/test manifest.
- [Roadmap](IMPLEMENTATION-ROADMAP.md): sole current proposed IP00–IP13 sequence and phase exit criteria.
- [Dependency graph](IMPLEMENTATION-DEPENDENCY-GRAPH.md): milestones, parallel lanes and task dependencies.
- [Task backlog](IMPLEMENTATION-TASK-BACKLOG.md): bounded change and qualification records.
- [Integration journeys](END-TO-END-INTEGRATION-PLAN.md): eight required real workflows.
- [Audit and blockers](AUDIT-AND-GAP-ANALYSIS.md): findings, approvals and unresolved decisions.

Requested PHASE-BY-PHASE-ROADMAP.md and RISKS-AND-BLOCKERS.md are intentionally represented by the existing roadmap and audit above. No duplicate versions. Prior P1–P8 names retain their historical meaning and approval scope; IP identifiers do not supersede those approvals. Prior completion prose is preserved in labelled historical sections, not current acceptance.

## Architecture and contracts

React uses the existing typed HTTP/SSE client. Electron owns native folder selection, trusted IPC, safeStorage and lifecycle. Express authenticates/scopes requests and invokes existing domain services. The coordinator owns turn leases; execution services own durable runs/effects; LangGraph supplies bounded specialist workflow through existing activities. ProviderService and aiService retain the provider boundary. Tools go through governance, workspace containment and qualified guest dispatch. SQLite owns durable records. Run events project state back to consumers; UI state is not execution authority.

Public /api/v1 contracts remain compatible. Observed route paths are in the inventory; old SPEC examples must not create duplicate endpoints. packages/contracts is the current Sirona wire boundary; packages/schema and packages/ai contain additional imported architecture and must be mapped by actual callers before reuse. New C tasks specify exact schema/event deltas before code. No unreviewed wholesale package rename or schema replacement.

Four product modes are Plan Only, Ask Before Every Change, Autonomous Coding and Full Autonomous Build. Current wire enum contains three historical values. C-task IP04-F08-C must propose an additive policy-profile representation and an explicit mapping preserving historical meanings; no silent value reinterpretation. Full Autonomous Build remains local and bounded; commits, pushes, credential changes and deployment are separately authorized effects.

## SQLite target and conversion design

Current sqliteDb.js opens sirona.db plus ops.db, automation.db, control.db, knowledge.db and system.db through ATTACH. Target: core table names retained; attached tables become ops_*, automation_*, control_*, knowledge_* and system_* in one new database. Foreign keys, triggers, indexes and service SQL references must be mapped explicitly; collisions cause a blocked review, not guessed renames. Existing migration history is preserved as provenance; applied checksums are never rewritten to make conversion pass.

IP01-01/02 produce the exact mapping and versioned conversion manifest. No live copy is attempted during this task. Later authorized conversion requires: stop new writes and quiesce all owners; obtain a consistent source snapshot including WAL state; create target at a different path; transfer IDs/values with explicit type conversions; validate counts, canonical row digests, foreign keys, uniqueness, migrations and application invariants; close/checkpoint target; activate through an atomic configuration change only after approval. Original files remain intact.

Recovery: before activation discard only the explicitly identified staging target after review; after activation do not blindly revert once new writes exist. Freeze writes, preserve both stores and reconcile post-cutover changes under a separate recovery decision. A snapshot of one attached file is not a consistent backup of the current application.

The typed Drizzle projection currently uses pg-core: change it to an explicit SQLite projection only through the approved persistence task, preserve actual SQL ownership, and do not introduce ORM auto-sync. Startup inline schema creation, translator behavior and migration runner need one defined authority. SQLITE_BUSY, transaction begin/commit failure, concurrent callbacks and disk-full must be observable; swallowed errors are release blockers.

## Execution boundary decision

Docker Desktop on WSL2 is the selected Windows Home project-execution substrate. The approved threat profile is trusted-local; this is not a hostile-code VM guarantee. WSL2 is Docker's substrate, not automatic permission to run commands directly in a user's distro. Project code never silently falls back to a host shell.

Current code has explicit host opt-in and environment paths, a disabled legacy Docker execution method and a newer broker. Some governance prose permits clamped host processes while ADR-006 describes stricter containment. Record this conflict; do not rewrite authority by implementation. Proposed release boundary: trusted application maintenance may use specifically reviewed native operations; agent-generated project commands require a qualified guest. Timeout alone is not containment. IP04-01 requires approval for the exact protected dispatch changes, followed by image/profile-specific Gate B qualification.

## Required technologies and ownership

| Technology | Integration owner | Required functional evidence |
|---|---|---|
| LangGraph | Existing orchestration graph/activity/runtime | Real bounded delegation and crash recovery, IP08 |
| Vercel AI SDK | Existing provider adapter behind provider services | Discovery/stream/cancel/usage parity, IP03 |
| Docker + WSL2 | Windows guest runtime and broker | Real policy/resource/network/cleanup tests, IP04 |
| Monaco | Proposed editor/diff consumer in apps/web/src/components/ | Open/edit/approved save and stale-base conflict, IP09 |
| xterm.js | Proposed terminal consumer, existing canonical terminal | Input/output/resize/cancel/disconnect, IP09 |
| React Flow | Proposed monitoring consumer | Actual persisted task graph and live status, IP09 |
| Zustand + TanStack Query | Client state versus server cache owners | Reconnect/cache invalidation without duplicate dispatch, IP09 |
| Drizzle + Zod | SQLite projection and runtime/wire validation | Real SQLite constraints/transactions and boundary rejection, IP01 |
| MCP SDK | Existing MCP adapter | Authenticated real guest invocation/cancellation, IP07 |
| Tree-sitter + ripgrep | Existing parser/search adapters | Real scoped code intelligence results, IP07 |

Pin reviewed compatible versions only during authorized implementation. Installation alone never satisfies integration. Keep Redis, BullMQ, Mastra and retrieval frameworks optional; no duplicate runtime. Existing dependencies are not removed until caller/licensing/build analysis proves safe.

## First release and first task

Mandatory local release: IP00–IP10 capabilities including actual provider inference, qualified project execution, approval, independent verification, durable recovery, bounded specialists and desktop journeys. IP11–IP13 are later releases. Minimal browser testing of the local product is a verification requirement, not authorization for general computer-control F18.

Exact first implementation task after scoped approval: IP01-01 — isolated SQLite path/transaction test harness. Before importing any database owner, require an explicit temporary root; reject working paths; enumerate all six potential files; verify no production fallback; spawn disposable child processes for crash tests. A fixture must never default to APPDATA. Qualify this prerequisite before running legacy database tests. Documentation task IP00-04 closes the baseline catalogue but does not approve execution.

## Planning completeness and limits

The inventory covers source/config declarations and 24 feature ownership records. It is not a line-by-line security audit of all 2,972 files. Actual working database contents, active services, paid provider capability and real guest qualification remain UNKNOWN intentionally. Each dependent task is blocked until its stated resolution/gate; this package must not advertise production readiness. Late external adapter/target selection is a bounded future decision, not an implementer guessing a vendor.
