---
title: "Dependency-Ordered Implementation Roadmap"
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

# Dependency-Ordered Implementation Roadmap

This replaces contradictory present-tense COMPLETE labels for current planning. Historical P1–P8 evidence remains recorded below and in governance; no historical approval is expanded. IP00 is static inventory only, not production qualification.

## Phase order

### IP00 — Baseline and authority

- **Prerequisites:** None.
- **Coverage:** All F01–F24 inventory.
- **Task IDs:** IP00-01–04. Slash notation expands into separate feature IDs and C/B/U/V records in the [backlog](IMPLEMENTATION-TASK-BACKLOG.md).
- **Reuse / exact owners:** corresponding rows in [ownership map](SOURCE-OWNERSHIP-MAP.md); no new parallel owner.
- **Required changes:** Source/route/schema/IPC/test inventory with explicit gaps; record current owner decisions without lifting STOP rules.
- **API / DB:** preserve current public contracts; apply only the reviewed feature C-task delta. No migration implied; conversion is separately gated.
- **Frontend / Electron:** feature U tasks through typed HTTP/SSE and existing trusted bridge; no theme redesign or renderer privilege expansion.
- **Security:** scope/auth at service boundary; fail closed on unavailable prerequisites; immutable approval scope; secrets stay in broker.
- **Tests / exit:** Static references and approval provenance checked; runtime baseline NOT_RUN. Unit/contract cases precede real isolated integration and applicable desktop E2E.
- **Failure / rollback:** do not advance on required failure; disable new admission, preserve durable records and uncertain effects, revert compatible source only. SQLite uses conversion protocol in [master plan](MASTER-IMPLEMENTATION-PLAN.md).

### IP01 — SQLite foundation

- **Prerequisites:** IP00 documentation accepted; persistence scope approval.
- **Coverage:** F03, F20 foundation.
- **Task IDs:** IP01-01–03; IP01-F03-C/B; IP01-F20-C/B. Slash notation expands into separate feature IDs and C/B/U/V records in the [backlog](IMPLEMENTATION-TASK-BACKLOG.md).
- **Reuse / exact owners:** corresponding rows in [ownership map](SOURCE-OWNERSHIP-MAP.md); no new parallel owner.
- **Required changes:** Isolated paths; transaction correctness; reviewed six-file-to-one mapping; redacted diagnostics.
- **API / DB:** preserve current public contracts; apply only the reviewed feature C-task delta. No migration implied; conversion is separately gated.
- **Frontend / Electron:** feature U tasks through typed HTTP/SSE and existing trusted bridge; no theme redesign or renderer privilege expansion.
- **Security:** scope/auth at service boundary; fail closed on unavailable prerequisites; immutable approval scope; secrets stay in broker.
- **Tests / exit:** Real disposable SQLite rollback/concurrency/crash and conversion fixture checks; no working-store activation. Unit/contract cases precede real isolated integration and applicable desktop E2E.
- **Failure / rollback:** do not advance on required failure; disable new admission, preserve durable records and uncertain effects, revert compatible source only. SQLite uses conversion protocol in [master plan](MASTER-IMPLEMENTATION-PLAN.md).

### IP02 — Secure desktop sessions

- **Prerequisites:** IP01 backend exit.
- **Coverage:** F01, F02, F22; F03 consumer.
- **Task IDs:** IP02-F01/F02/F22-C/B/U/V; IP01-F03-U/V. Slash notation expands into separate feature IDs and C/B/U/V records in the [backlog](IMPLEMENTATION-TASK-BACKLOG.md).
- **Reuse / exact owners:** corresponding rows in [ownership map](SOURCE-OWNERSHIP-MAP.md); no new parallel owner.
- **Required changes:** Authenticated gateway, actual window.sirona bridge, secure credentials and persisted sessions.
- **API / DB:** preserve current public contracts; apply only the reviewed feature C-task delta. No migration implied; conversion is separately gated.
- **Frontend / Electron:** feature U tasks through typed HTTP/SSE and existing trusted bridge; no theme redesign or renderer privilege expansion.
- **Security:** scope/auth at service boundary; fail closed on unavailable prerequisites; immutable approval scope; secrets stay in broker.
- **Tests / exit:** Electron restart restores session; forged Origin/IPC/cross-workspace calls denied; secret canaries absent. Unit/contract cases precede real isolated integration and applicable desktop E2E.
- **Failure / rollback:** do not advance on required failure; disable new admission, preserve durable records and uncertain effects, revert compatible source only. SQLite uses conversion protocol in [master plan](MASTER-IMPLEMENTATION-PLAN.md).

### IP03 — Providers and budgets

- **Prerequisites:** IP02.
- **Coverage:** F04, F05.
- **Task IDs:** IP03-F04/F05-C/B/U/V. Slash notation expands into separate feature IDs and C/B/U/V records in the [backlog](IMPLEMENTATION-TASK-BACKLOG.md).
- **Reuse / exact owners:** corresponding rows in [ownership map](SOURCE-OWNERSHIP-MAP.md); no new parallel owner.
- **Required changes:** Exact IDs, discovery, streaming, bounds and settlements through existing adapters.
- **API / DB:** preserve current public contracts; apply only the reviewed feature C-task delta. No migration implied; conversion is separately gated.
- **Frontend / Electron:** feature U tasks through typed HTTP/SSE and existing trusted bridge; no theme redesign or renderer privilege expansion.
- **Security:** scope/auth at service boundary; fail closed on unavailable prerequisites; immutable approval scope; secrets stay in broker.
- **Tests / exit:** Controlled failures plus separately approved real inference; cancel releases lease and settles once. Unit/contract cases precede real isolated integration and applicable desktop E2E.
- **Failure / rollback:** do not advance on required failure; disable new admission, preserve durable records and uncertain effects, revert compatible source only. SQLite uses conversion protocol in [master plan](MASTER-IMPLEMENTATION-PLAN.md).

### IP04 — Workspace policy and tools

- **Prerequisites:** IP02; image/dispatch approval for guest qualification.
- **Coverage:** F08, F11, F12.
- **Task IDs:** IP04-01; IP04-F08/F11/F12-C/B/U/V. Slash notation expands into separate feature IDs and C/B/U/V records in the [backlog](IMPLEMENTATION-TASK-BACKLOG.md).
- **Reuse / exact owners:** corresponding rows in [ownership map](SOURCE-OWNERSHIP-MAP.md); no new parallel owner.
- **Required changes:** Root containment, exact approvals, safe patching and real guest/terminal lifecycle.
- **API / DB:** preserve current public contracts; apply only the reviewed feature C-task delta. No migration implied; conversion is separately gated.
- **Frontend / Electron:** feature U tasks through typed HTTP/SSE and existing trusted bridge; no theme redesign or renderer privilege expansion.
- **Security:** scope/auth at service boundary; fail closed on unavailable prerequisites; immutable approval scope; secrets stay in broker.
- **Tests / exit:** No host fallback; stale patch refused; actual guest timeout/network/resource/cleanup evidence. Unit/contract cases precede real isolated integration and applicable desktop E2E.
- **Failure / rollback:** do not advance on required failure; disable new admission, preserve durable records and uncertain effects, revert compatible source only. SQLite uses conversion protocol in [master plan](MASTER-IMPLEMENTATION-PLAN.md).

### IP05 — Requirements and Build Contracts

- **Prerequisites:** IP03; IP04 policy C/B exit.
- **Coverage:** F06, F07.
- **Task IDs:** IP05-F06/F07-C/B/U/V. Slash notation expands into separate feature IDs and C/B/U/V records in the [backlog](IMPLEMENTATION-TASK-BACKLOG.md).
- **Reuse / exact owners:** corresponding rows in [ownership map](SOURCE-OWNERSHIP-MAP.md); no new parallel owner.
- **Required changes:** Replace intent stub; persist requirements, plans and immutable approved scope.
- **API / DB:** preserve current public contracts; apply only the reviewed feature C-task delta. No migration implied; conversion is separately gated.
- **Frontend / Electron:** feature U tasks through typed HTTP/SSE and existing trusted bridge; no theme redesign or renderer privilege expansion.
- **Security:** scope/auth at service boundary; fail closed on unavailable prerequisites; immutable approval scope; secrets stay in broker.
- **Tests / exit:** Changed requirement/plan revision cannot reuse old approval; plan-only has no mutations. Unit/contract cases precede real isolated integration and applicable desktop E2E.
- **Failure / rollback:** do not advance on required failure; disable new admission, preserve durable records and uncertain effects, revert compatible source only. SQLite uses conversion protocol in [master plan](MASTER-IMPLEMENTATION-PLAN.md).

### IP06 — Durable execution and verifier

- **Prerequisites:** IP03, qualified IP04, IP05.
- **Coverage:** F09, F15.
- **Task IDs:** IP06-01; IP06-F09/F15-C/B/U/V. Slash notation expands into separate feature IDs and C/B/U/V records in the [backlog](IMPLEMENTATION-TASK-BACKLOG.md).
- **Reuse / exact owners:** corresponding rows in [ownership map](SOURCE-OWNERSHIP-MAP.md); no new parallel owner.
- **Required changes:** Effect journal, fences, checkpoints, trusted checker evidence, bounded repair.
- **API / DB:** preserve current public contracts; apply only the reviewed feature C-task delta. No migration implied; conversion is separately gated.
- **Frontend / Electron:** feature U tasks through typed HTTP/SSE and existing trusted bridge; no theme redesign or renderer privilege expansion.
- **Security:** scope/auth at service boundary; fail closed on unavailable prerequisites; immutable approval scope; secrets stay in broker.
- **Tests / exit:** Kill matrix before/after effects; no duplicate mutation; missing checks cannot pass. Unit/contract cases precede real isolated integration and applicable desktop E2E.
- **Failure / rollback:** do not advance on required failure; disable new admission, preserve durable records and uncertain effects, revert compatible source only. SQLite uses conversion protocol in [master plan](MASTER-IMPLEMENTATION-PLAN.md).

### IP07 — Context and tools intelligence

- **Prerequisites:** IP06.
- **Coverage:** F13, F14.
- **Task IDs:** IP07-F13/F14-C/B/U/V. Slash notation expands into separate feature IDs and C/B/U/V records in the [backlog](IMPLEMENTATION-TASK-BACKLOG.md).
- **Reuse / exact owners:** corresponding rows in [ownership map](SOURCE-OWNERSHIP-MAP.md); no new parallel owner.
- **Required changes:** Real authorized MCP/search/parser/LSP and scoped context/memory.
- **API / DB:** preserve current public contracts; apply only the reviewed feature C-task delta. No migration implied; conversion is separately gated.
- **Frontend / Electron:** feature U tasks through typed HTTP/SSE and existing trusted bridge; no theme redesign or renderer privilege expansion.
- **Security:** scope/auth at service boundary; fail closed on unavailable prerequisites; immutable approval scope; secrets stay in broker.
- **Tests / exit:** Real guest tooling; cross-project exclusion; bounded output; poisoned content cannot grant authority. Unit/contract cases precede real isolated integration and applicable desktop E2E.
- **Failure / rollback:** do not advance on required failure; disable new admission, preserve durable records and uncertain effects, revert compatible source only. SQLite uses conversion protocol in [master plan](MASTER-IMPLEMENTATION-PLAN.md).

### IP08 — Specialists and review

- **Prerequisites:** IP07; IP06 verification.
- **Coverage:** F10.
- **Task IDs:** IP08-F10-C/B/U/V. Slash notation expands into separate feature IDs and C/B/U/V records in the [backlog](IMPLEMENTATION-TASK-BACKLOG.md).
- **Reuse / exact owners:** corresponding rows in [ownership map](SOURCE-OWNERSHIP-MAP.md); no new parallel owner.
- **Required changes:** Flat durable delegation, independent review, consolidation and recovery.
- **API / DB:** preserve current public contracts; apply only the reviewed feature C-task delta. No migration implied; conversion is separately gated.
- **Frontend / Electron:** feature U tasks through typed HTTP/SSE and existing trusted bridge; no theme redesign or renderer privilege expansion.
- **Security:** scope/auth at service boundary; fail closed on unavailable prerequisites; immutable approval scope; secrets stay in broker.
- **Tests / exit:** Max three concurrent; no nesting; real authorized provider/guest workflow and replay safety. Unit/contract cases precede real isolated integration and applicable desktop E2E.
- **Failure / rollback:** do not advance on required failure; disable new admission, preserve durable records and uncertain effects, revert compatible source only. SQLite uses conversion protocol in [master plan](MASTER-IMPLEMENTATION-PLAN.md).

### IP09 — Complete local consumers

- **Prerequisites:** IP02–IP08.
- **Coverage:** F23, F24; F11/F12 views.
- **Task IDs:** IP09-F23/F24-C/B/U/V. Slash notation expands into separate feature IDs and C/B/U/V records in the [backlog](IMPLEMENTATION-TASK-BACKLOG.md).
- **Reuse / exact owners:** corresponding rows in [ownership map](SOURCE-OWNERSHIP-MAP.md); no new parallel owner.
- **Required changes:** Editor/diff/terminal/planning/approvals/monitoring; CLI through gateway.
- **API / DB:** preserve current public contracts; apply only the reviewed feature C-task delta. No migration implied; conversion is separately gated.
- **Frontend / Electron:** feature U tasks through typed HTTP/SSE and existing trusted bridge; no theme redesign or renderer privilege expansion.
- **Security:** scope/auth at service boundary; fail closed on unavailable prerequisites; immutable approval scope; secrets stay in broker.
- **Tests / exit:** Actual desktop and CLI journeys; no fabricated model/workspace values; preserved design. Unit/contract cases precede real isolated integration and applicable desktop E2E.
- **Failure / rollback:** do not advance on required failure; disable new admission, preserve durable records and uncertain effects, revert compatible source only. SQLite uses conversion protocol in [master plan](MASTER-IMPLEMENTATION-PLAN.md).

### IP10 — Local production qualification

- **Prerequisites:** IP01–IP09 accepted; release scope approval.
- **Coverage:** F21; F20 final qualification; all local features.
- **Task IDs:** IP10-F21-C/B/U/V; IP01-F20-U/V; IP10-01. Slash notation expands into separate feature IDs and C/B/U/V records in the [backlog](IMPLEMENTATION-TASK-BACKLOG.md).
- **Reuse / exact owners:** corresponding rows in [ownership map](SOURCE-OWNERSHIP-MAP.md); no new parallel owner.
- **Required changes:** Consistent backup/restore, installer, update compatibility, evidence and diagnostics.
- **API / DB:** preserve current public contracts; apply only the reviewed feature C-task delta. No migration implied; conversion is separately gated.
- **Frontend / Electron:** feature U tasks through typed HTTP/SSE and existing trusted bridge; no theme redesign or renderer privilege expansion.
- **Security:** scope/auth at service boundary; fail closed on unavailable prerequisites; immutable approval scope; secrets stay in broker.
- **Tests / exit:** Clean install, real restore, corruption refusal, restart/recovery, required criteria all satisfied. Unit/contract cases precede real isolated integration and applicable desktop E2E.
- **Failure / rollback:** do not advance on required failure; disable new admission, preserve durable records and uncertain effects, revert compatible source only. SQLite uses conversion protocol in [master plan](MASTER-IMPLEMENTATION-PLAN.md).

### IP11 — Automation

- **Prerequisites:** IP10.
- **Coverage:** F17; F24 additions.
- **Task IDs:** IP11-F17-C/B/U/V. Slash notation expands into separate feature IDs and C/B/U/V records in the [backlog](IMPLEMENTATION-TASK-BACKLOG.md).
- **Reuse / exact owners:** corresponding rows in [ownership map](SOURCE-OWNERSHIP-MAP.md); no new parallel owner.
- **Required changes:** SQLite atomic occurrences, canonical runs, local delivery, signed triggers.
- **API / DB:** preserve current public contracts; apply only the reviewed feature C-task delta. No migration implied; conversion is separately gated.
- **Frontend / Electron:** feature U tasks through typed HTTP/SSE and existing trusted bridge; no theme redesign or renderer privilege expansion.
- **Security:** scope/auth at service boundary; fail closed on unavailable prerequisites; immutable approval scope; secrets stay in broker.
- **Tests / exit:** DST/misfire/overlap/duplicate-event tests; retry delivery never re-executes code. Unit/contract cases precede real isolated integration and applicable desktop E2E.
- **Failure / rollback:** do not advance on required failure; disable new admission, preserve durable records and uncertain effects, revert compatible source only. SQLite uses conversion protocol in [master plan](MASTER-IMPLEMENTATION-PLAN.md).

### IP12 — External workers and browser

- **Prerequisites:** IP10; chosen adapter/profile scope approval.
- **Coverage:** F16, F18.
- **Task IDs:** IP12-F16/F18-C/B/U/V. Slash notation expands into separate feature IDs and C/B/U/V records in the [backlog](IMPLEMENTATION-TASK-BACKLOG.md).
- **Reuse / exact owners:** corresponding rows in [ownership map](SOURCE-OWNERSHIP-MAP.md); no new parallel owner.
- **Required changes:** One selected worker and browser profile with narrow authority and actual evidence.
- **API / DB:** preserve current public contracts; apply only the reviewed feature C-task delta. No migration implied; conversion is separately gated.
- **Frontend / Electron:** feature U tasks through typed HTTP/SSE and existing trusted bridge; no theme redesign or renderer privilege expansion.
- **Security:** scope/auth at service boundary; fail closed on unavailable prerequisites; immutable approval scope; secrets stay in broker.
- **Tests / exit:** Disconnect/retry/grant enforcement; unconfigured adapters never claim successful work. Unit/contract cases precede real isolated integration and applicable desktop E2E.
- **Failure / rollback:** do not advance on required failure; disable new admission, preserve durable records and uncertain effects, revert compatible source only. SQLite uses conversion protocol in [master plan](MASTER-IMPLEMENTATION-PLAN.md).

### IP13 — Deployment and extended operations

- **Prerequisites:** IP10; IP12 only if needed by selected verification; target approval.
- **Coverage:** F19; F21 extensions.
- **Task IDs:** IP13-F19-C/B/U/V. Slash notation expands into separate feature IDs and C/B/U/V records in the [backlog](IMPLEMENTATION-TASK-BACKLOG.md).
- **Reuse / exact owners:** corresponding rows in [ownership map](SOURCE-OWNERSHIP-MAP.md); no new parallel owner.
- **Required changes:** Artifact-bound approved target, actual status/health, reconciliation and rollback.
- **API / DB:** preserve current public contracts; apply only the reviewed feature C-task delta. No migration implied; conversion is separately gated.
- **Frontend / Electron:** feature U tasks through typed HTTP/SSE and existing trusted bridge; no theme redesign or renderer privilege expansion.
- **Security:** scope/auth at service boundary; fail closed on unavailable prerequisites; immutable approval scope; secrets stay in broker.
- **Tests / exit:** Changed artifact invalidates proof; real target health required; rollback drill succeeds. Unit/contract cases precede real isolated integration and applicable desktop E2E.
- **Failure / rollback:** do not advance on required failure; disable new admission, preserve durable records and uncertain effects, revert compatible source only. SQLite uses conversion protocol in [master plan](MASTER-IMPLEMENTATION-PLAN.md).

## Scheduling precision

IP numbers name primary ownership, not a requirement to finish future consumer tests before foundational services. IP01 exits on F03/F20 C/B plus isolated persistence evidence; F03 U/V runs in IP02 and F20 U/V in IP10. IP04 may prepare contracts alongside IP03; guest acceptance cannot proceed without Gate B. IP05 starts after IP04 policy contracts/behavior, but IP06 requires qualified guest execution. Product UI slices accompany their domains; IP09 completes the workspace. IP06-01 fail-closed synthetic-path containment is a mandatory first-release safety task even though full browser/deployment implementation is IP12/IP13.

Global task order within a feature is C -> B -> U -> V. Cross-domain tasks depend on the required service B milestone, never all later UI work. IP02-F22-U depends only on its own B; IP02-F01/F02 consumers wait for desktop B. IP00 records DONE_STATIC; all implementation and runtime qualification records remain NOT_STARTED / NOT_RUN.

## Historical P1–P8 mapping

P1 -> IP01; P2 -> IP02; P3 -> IP04; P4 -> IP03; P5 -> IP06/IP08; P6 -> IP07; P7 -> IP09; P8 -> IP10. This is a scope crosswalk, not equivalent acceptance. Old counts such as 22/22, 37/37 or 14/14 are historical reports only. Current source changes, SQLite topology and pending live/guest gates prevent importing those counts as current release proof.

## Preserved pre-reconciliation roadmap — historical claims only

The following record is retained verbatim for provenance; its COMPLETE/READY labels do not qualify the current source. Conflicting architecture statements are resolved only by the applicable approved decision, not by this quote.

> # Sirona Dependency-Ordered Implementation Roadmap
> 
> > **Mode: Documentation & Planning Only**  
> > **Pre-Implementation Requirement:** Do not begin any phase without explicit user approval.
> 
> ---
> 
> ## 1. Dependency-Ordered Phase Progression
> 
> ```mermaid
> graph TD
>     P1["Phase 1: Persistence & Database Reconciliation (SQLite/PG)"] --> P2["Phase 2: DPAPI Credential Broker & Keyring Vault"]
>     P2 --> P3["Phase 3: Docker WSL2 Trusted-Local Sandbox"]
>     P3 --> P4["Phase 4: Multi-Protocol Model Gateway (Vercel AI SDK / Gemini / OpenAI)"]
>     P4 --> P5["Phase 5: Agent ReAct Engine & LangGraph State Machine"]
>     P5 --> P6["Phase 6: MCP SDK & Tree-sitter Code Intelligence (Gate B)"]
>     P6 --> P7["Phase 7: React 19 Frontend Canvas & Terminal Integrations"]
>     P7 --> P8["Phase 8: End-to-End Release & Disaster Recovery Qualification"]
> ```
> 
> ---
> 
> ## 2. Phase Execution Status Summary
> 
> | Phase | Description | Status | Evidence / Verification |
> |---|---|---|---|
> | **Phase 1** | Persistence & Database Reconciliation (SQLite-Only Architecture) | **COMPLETE** | `sqliteMigrations.test.js` (11/11 pass), WAL mode, unified `sirona.db`, single-writer coordination |
> | **Phase 2** | DPAPI Credential Broker & Keyring Vault | **COMPLETE** | `credentialBroker.test.js` (14/14 pass), DPAPI encrypted persistence, zero renderer leakage |
> | **Phase 3** | Docker WSL2 Trusted-Local Sandbox & Execution Guard | **COMPLETE** | `isolation.test.js` (7/7 pass), `tools.test.js` (27/27 pass), strict path containment, tool runtime receipts |
> | **Phase 4** | Multi-Protocol Model Gateway (Vercel AI SDK / Gemini / OpenAI) | **COMPLETE** | `providers.test.js` (12/12 pass), streaming SSE, single-writer turn leases, budget settlement, SSRF protection |
> | **Phase 5** | Agent ReAct Engine & LangGraph State Machine | **COMPLETE** | 9 execution & orchestration test suites (37/37 pass), serialized turn leases, checkpoint state machine, human approval gates |
> | **Phase 6** | MCP SDK & Tree-sitter Code Intelligence (Gate B) | **COMPLETE** | `contextIsolation.test.js` (5/5 pass), `gitWorkspace.test.js` (2/2 pass), `mcpAuthorization.test.js` (5/5 pass), `p6CanonicalJourney.test.js` (2/2 pass), `test:p6:free` (14/14 pass), CLI LSP/JSON-RPC (6/6 pass) |
> | **Phase 7** | React 19 Frontend Canvas & Terminal Integrations | **COMPLETE** | `apps/web test` (17/17 pass: SSE streaming, run events cursors, editor diff, route coverage), `run check` (0 errors), Vite production bundle built cleanly |
> | **Phase 8** | End-to-End Release & Disaster Recovery Qualification | **READY** | Final release & recovery phase |
> 
> ---
> 
> ## 3. Phase Breakdown & Acceptance Criteria
> 
> ### Phase 1: Persistence & Database Reconciliation
> - **Objective**: Reconcile SQLite and PostgreSQL dual-driver behavior in [`apps/server/config/db.js`](file:///apps/server/config/db.js).
> - **Prerequisites**: Owner decision on default database profile.
> - **Acceptance Criteria**:
>   - Parameterized queries (`$1, $2`) execute identically on both drivers.
>   - Migrations 001–024 apply without errors in both SQLite and PostgreSQL.
>   - Transactions support savepoints and rollback on error.
> 
> ### Phase 2: DPAPI Credential Broker & Keyring Vault
> - **Objective**: Secure encryption of provider API keys via Windows DPAPI and Electron `safeStorage`.
> - **Prerequisites**: Phase 1 database tables for credentials.
> - **Acceptance Criteria**:
>   - Keys encrypted before storage in `provider_credentials`.
>   - Zero plaintext keys stored on disk or exposed to renderer processes.
>   - Restart, key rotation, and revocation tested without data corruption.
> 
> ### Phase 3: Docker WSL2 Trusted-Local Sandbox
> - **Objective**: Contain shell executions and compiler runs inside an isolated Docker container.
> - **Prerequisites**: Docker engine running with WSL2 integration.
> - **Acceptance Criteria**:
>   - `tools-worker.Dockerfile` builds cleanly.
>   - Shell commands execute under non-root user with clamped memory (2GB) and CPU (2 cores).
>   - Timeout enforcement: commands exceeding 30s are terminated via SIGKILL.
> 
> ### Phase 4: Multi-Protocol Model Gateway
> - **Objective**: Unify Google Gemini, OpenAI, Anthropic, and local Ollama inference with streaming SSE.
> - **Prerequisites**: Phase 2 decrypted credentials.
> - **Acceptance Criteria**:
>   - SSE streams emit `turn.start`, `turn.token`, and `turn.finish`.
>   - Abort signals from client immediately terminate upstream vendor requests and release leases.
>   - SSRF protection blocks cloud metadata (`169.254.169.254`).
> 
> ### Phase 5: Agent ReAct Engine & LangGraph State Machine
> - **Objective**: Full autonomous coding loop with serialized turn leases and human approval gates.
> - **Prerequisites**: Phase 3 tool execution, Phase 4 model gateway.
> - **Acceptance Criteria**:
>   - Turn lease coordinator prevents concurrent turns on the same conversation.
>   - Multi-step loops execute up to 25 steps with circuit breaker.
>   - Dangerous tool calls (shell, rm, git push) pause for human approval.
> 
> ### Phase 6: MCP & Code Intelligence (Gate B)
> - **Objective**: Model Context Protocol client and Tree-sitter AST queries.
> - **Prerequisites**: Phase 5 ReAct engine.
> - **Acceptance Criteria**:
>   - Local stdio MCP servers connect and list tools cleanly.
>   - Tree-sitter accurately indexes symbols across TS/JS/Python files.
>   - Ripgrep search completes within 200ms on project codebase.
> 
> ### Phase 7: React 19 Frontend Canvas & Integrations
> - **Objective**: Complete user-facing IDE canvas, model selector, settings, and embedded terminal.
> - **Prerequisites**: All backend `/api/v1` routes verified.
> - **Acceptance Criteria**:
>   - Real-time token streaming without UI freeze.
>   - Model selector dynamically reflects configured credentials.
>   - Responsive light/dark theme complying with UI freeze contract.
> 
> ### Phase 8: End-to-End Release & Disaster Recovery
> - **Objective**: Production qualification, health probes, crash recovery, and automated release.
> - **Prerequisites**: Phases 1–7 verified.
> - **Acceptance Criteria**:
>   - Backend recovery clears orphaned turn leases on unexpected crash.
>   - Full smoke test passes without mocks across all 15 domains.
> 
> ---
> 
> ## 4. Decisions & Owner Sign-Off Status
> 
> The authoritative decision definitions and complete registry are maintained in [`docs/governance/ARCHITECTURE-DECISION-REGISTRY.md`](../governance/ARCHITECTURE-DECISION-REGISTRY.md).
> 
> | Canonical ID | Historical Alias | Topic | Owner Recorded Decision (2026-11-03) | Active Prerequisite / Blocker |
> |---|---|---|---|---|
> | [`ADR-001`](../governance/ARCHITECTURE-DECISION-REGISTRY.md#adr-001-database-engine-topology-sqlite-vs-postgresql) | `DEC-01` | **Default Database Driver** | **Option A Confirmed**: SQLite for desktop, PostgreSQL for server | STOP-01 Active: Verify adapters, migrations 001–024, schema compatibility before code changes |
> | [`ADR-004`](../governance/ARCHITECTURE-DECISION-REGISTRY.md#adr-004-live-model-paid-inference-verification-gate) | `DEC-02` | **P5 Live Model Verification** | **Option A (Conditional) Confirmed**: Prepare 1x bounded test | STOP-02 Active: Billable calls blocked until provider, model, and cost ceiling separately approved |
> | [`ADR-007`](../governance/ARCHITECTURE-DECISION-REGISTRY.md#adr-007-containerized-tools-worker-qualification-p6-gate-b) | `DEC-03` | **P6 Gate B Docker Image Build** | **Option B Confirmed**: Defer Gate B container qualification | STOP-03 Active: Container qualification deferred; existing sandbox safeguards preserved |
