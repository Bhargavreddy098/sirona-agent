---
title: "Audit, Gaps, Risks and Blockers"
summary: "Planning evidence, risks and acceptance requirements without implementation authorization."
read_when:
  - "Reviewing cross-feature safety and readiness"
owning_subsystem: "Implementation planning"
primary_source_files:
  - "apps/server/config/sqliteDb.js"
  - "apps/server/services/sandboxManager.js"
  - "apps/server/services/verificationService.js"
design_status: "PROPOSED"
updated: "2026-11-05"
---

# Audit, Gaps, Risks and Blockers

## Current assessment

2026-11-05 static review. Source inventory is complete within its documented file-selection boundary; behavior/security qualification is NOT_RUN. Earlier implemented/complete descriptions are historical claims, not new verified outcomes. The current owner selected SQLite-only, single-file target and local-first release. No migration, protected source changes or activation are authorized by documentation.

## Findings and disposition

| ID | Severity | Finding | Evidence | Required disposition | Task |
|---|---|---|---|---|---|
| R01 | Critical | DB topology conflict | Root/STOP-01 describe dual drivers; ADR-001 final entry and owner answer select SQLite-only/single file. Source still attaches five databases. | Planning target resolved by owner; governance synchronization and exact migration application remain unapproved. | IP01-02/03 |
| R02 | Critical | False transaction success | sqliteDb.js catches BEGIN/COMMIT/ROLLBACK failures and returns successful-looking results; getClient shares the connection. | Qualify serialized transaction owner, nesting policy and error propagation before lease/effect tests. Do not claim current atomicity. | IP01-F03-B |
| R03 | Critical | Host execution ambiguity | sandboxManager.resolveBackend accepts allowHostExecution and SIRONA_HOST_EXECUTION=true before guest selection. HostExecutionBackend delegates to a clamped host broker. | Propose Docker-only agent project commands; trusted native maintenance narrowly enumerated. Requires protected policy approval; no flag is changed here. | IP04-01 |
| R04 | Critical | Missing verifier evidence can pass | VerificationService initializes criterion outcome pass and missing testResults does not enter the required-missing branch. | Required absent/unauthenticated evidence must yield unknown; bind actual checker receipts and trusted verifier identity. | IP06-F15-B |
| R05 | Critical | Synthetic browser success | DeploymentService.createBrowserQASession constructs successful console/network records without browser execution. | Disable success pathway with explicit unavailable until real adapter qualified; historical rows do not count as evidence. | IP06-01; IP12-F18-B |
| R06 | High | Deployment health claims | DeploymentService writes active/healthy records; actual external target qualification not established by inspected path. | Fail closed for unqualified targets; no deployment or simulated healthy result accepted for local release. | IP06-01; IP13-F19-B |
| R07 | High | Unqualified backup/recovery | ReleaseRecoveryService deliberately throws RECOVERY_NOT_CONFIGURED; release and diagnostics include unconditional verified/security values. | Preserve explicit unavailable behavior; replace unsupported proof claims and qualify isolated restore. | IP10-F21-B; IP01-F20-B |
| R08 | High | Wrong test target | verifyP6Free.mjs configures PGDATABASE and writes evidence. Working APPDATA fallback exists in SQLite owner. | Never run legacy script blindly; require isolated all-path harness before imports; adapt targets under approved task. | IP01-01 |
| R09 | High | Documentation/API drift | SPEC examples cite different turn routes, controllers, bridge and test filenames than current source. | Inventory is observed API authority for planning; reconcile active specifications with implementation contracts, not invented endpoints. | IP00-02/04 |
| R10 | High | Partial UI versus claims | Current App/MainCanvas are chat-oriented; defaults contain model/workspace values; no Monaco/xterm imports found in active source scan. | Client API wrappers are not proof of editor/terminal UI. Build qualified surfaces within approved design. | IP09-F23-B/U |
| R11 | High | Persistence projection mismatch | src/db/schema.ts imports drizzle-orm/pg-core while selected target is SQLite. | Review projection and transaction adapter; no ORM auto-sync or blind SQL translation. | IP01-02; IP01-F03-B |
| R12 | High | Live-provider gate | STOP-02 and ADR-004 block live calls without exact provider/model/cost approval. | Prepare controlled tests; real inference acceptance stays BLOCKED until scoped approval. | IP03-F04-V; IP08-F10-V |
| R13 | High | Guest qualification gate | STOP-03 defers Gate B; existing Docker code is not image qualification. | Review image digest, packages, network, mounts and target; no enabling flag or host fallback. | IP04-F12-V; IP07-F13-V |
| R14 | High | Mode compatibility | Target four modes versus existing supervised/semi-autonomous/autonomous contract. | Add reviewed policy-profile mapping preserving historical behavior; no enum reinterpretation. | IP04-F08-C |
| R15 | Medium | Duplicate imported frameworks | packages/schema/ai scoped instructions retain OpenCode contracts; web manifest includes React and Solid dependencies. | Trace actual import/build ownership; no broad deletion or extra runtime to paper over conflict. | IP00-03; IP09-F23-C |
| R16 | High | Scheduler admission | claimDueOccurrences uses FOR UPDATE SKIP LOCKED and separate operations; SQLite translation cannot prove equivalent locking. | Atomic unique occurrence admission plus dispatch/outbox identity; qualify concurrent scheduler and restart. | IP11-F17-B |
| R17 | Medium | Late adapter choice | First external worker, browser profile and deployment target unspecified. | Remain separate explicit design gates. Not required for IP10 local release; IP12/IP13 adapter coding blocked. | IP12-F16-C; IP12-F18-C; IP13-F19-C |
| R18 | High | Data/approval provenance | Working tree already contains many edits/deletions and database changes before this task. | Use source manifest hashes; never reset another agent work or equate a new plan with old approval. | All tasks |

## Approval register for future work

- A01: synchronize root/scoped/STOP/ADR database statements to latest owner target, while preserving the audit and working-data gate. Proposed documentation scope needs care because governance edits must not silently lift restrictions.
- A02: approve exact conversion/migration artifact hash, isolated target, then separately working-store cutover and recovery plan. No down-migration deletion.
- A03: approve protected dispatch changes and exact trusted-local Docker image/profile qualification. Project-command host policy ambiguity must be resolved first.
- A04: approve provider, exact model and maximum inference spend for each bounded qualification batch.
- A05: approve new UI surfaces/state libraries within frozen design and protected contract changes where required.
- A06: select one external worker/browser profile and later one deployment target; approve their effect boundaries separately.
- A07: approve packaging/signing, installation and release activation when IP10 evidence is ready.

Planning decisions already made: SQLite-only; one target file; first production milestone IP10. These decisions are not pending again. Schema content, file checksums and activation targets are pending because they do not yet exist as approved artifacts.

## Unknowns that must remain explicit

Actual schema/version and row-level data in working databases were not opened. Source inventory is not deployed data inventory. Runtime caller authorization of every legacy route, production feature flag values, actual provider credentials and local Docker state were not tested. No secret values are needed for planning. Vendor adapters beyond the first selected qualified profile, external workers and hosted deployments remain unqualified. Each unknown blocks only its dependent task.

## Existing documentation validation debt

The existing docs validator ignores file:// links and anchors, so its success cannot establish complete source/anchor consistency. The missing docs/_archive/legacy pointers are replaced with truthful unavailable-archive text in INDEX/README, not an empty archive folder. Legacy feature guides may still contain stale source links; they are inventory findings and do not override this plan's explicit source map. Planned source reconciliation must preserve API compatibility.

## Preserved previous audit — historical claims only

> # Codebase Audit, Verification & Gap Analysis
> 
> > **Mode: Engineering Audit (Read-Only)**  
> > **Source Inspection Date:** 2026-11-03  
> > **Methodology:** gstack `/spec` and `/plan-eng-review` verification standards.
> 
> ---
> 
> ## 1. Executive Summary & Verification Matrix
> 
> This audit contrasts the real source code in `apps/` and `packages/` against the historical records in `docs/` and `sironadocs/`.
> 
> | Domain / Subsystem | Actual Implementation Status | Real Code Source Location | Existing Docs vs Reality Delta |
> |---|---|---|---|
> | **Identity & Sessions** | **Implemented** | [`apps/server/routes/v1/identity.routes.js`](file:///apps/server/routes/v1/identity.routes.js), [`conversations.routes.js`](file:///apps/server/routes/v1/conversations.routes.js) | Canonical `/api/v1` routes fully match [`packages/contracts/src/api.ts`](file:///packages/contracts/src/api.ts). Legacy `/api/*` routes are retired. |
> | **Projects & Workspace** | **Implemented** | [`apps/server/routes/v1/projects.routes.js`](file:///apps/server/routes/v1/projects.routes.js), [`workspace.routes.js`](file:///apps/server/routes/v1/workspace.routes.js) | Local folder selection via Electron native dialog verified. Path traversal protection active in [`workspacePathResolver.js`](file:///apps/server/services/workspacePathResolver.js). |
> | **Model Gateway** | **Implemented** | [`packages/ai/src/providers.ts`](file:///packages/ai/src/providers.ts), [`apps/server/services/aiService.js`](file:///apps/server/services/aiService.js) | Multi-vendor streaming (Gemini, OpenAI, Anthropic, Ollama) active with SSRF guard. |
> | **Agent ReAct Loop** | **Implemented** | [`apps/server/services/agentExecutionEngine.js`](file:///apps/server/services/agentExecutionEngine.js), [`conversationTurnCoordinator.js`](file:///apps/server/services/conversationTurnCoordinator.js) | Turn lease serialized locking in [`turnLeaseService.js`](file:///apps/server/services/turnLeaseService.js). Step limit (25) and abort handlers verified. |
> | **Tool Sandbox** | **Implemented** | [`apps/server/services/toolRuntimeService.js`](file:///apps/server/services/toolRuntimeService.js), [`apps/cli/docker/tools-worker.Dockerfile`](file:///apps/cli/docker/tools-worker.Dockerfile) | Filesystem tools contained. Docker WSL2 worker container implemented. |
> | **Approvals & Governance** | **Implemented** | [`apps/server/services/governanceService.js`](file:///apps/server/services/governanceService.js), [`auditLogger.js`](file:///apps/server/services/auditLogger.js) | Risk evaluation, pending approval queue, and audit trail hash recording active. |
> | **Persistence (Dual-Engine)** | **Partially Implemented (Conflict)** | [`apps/server/config/db.js`](file:///apps/server/config/db.js), [`sqliteDb.js`](file:///apps/server/config/sqliteDb.js) | **CRITICAL DELTA:** `config/db.js` has SQLite fallback enabled when `SIRONA_DB_DRIVER === 'sqlite'`. Historical roadmap required PostgreSQL transaction evidence. Reconciled queries use `$1, $2`. |
> | **Desktop OS Integration** | **Implemented** | [`apps/desktop/src/main.cjs`](file:///apps/desktop/src/main.cjs), [`security/credentialBroker.ts`](file:///apps/desktop/src/security/credentialBroker.ts) | Windows DPAPI encryption via `safeStorage` verified. Electron IPC channel whitelisting active. |
> | **Frontend Canvas UI** | **Implemented** | [`apps/web/src/App.tsx`](file:///apps/web/src/App.tsx), [`components/MainCanvas.tsx`](file:///apps/web/src/components/MainCanvas.tsx) | React 19 + Vite canvas active. `frontend/sirona` has been deleted; `apps/web` is the sole UI. |
> | **MCP & Code Intelligence** | **Partially Implemented** | [`apps/cli/src/lsp.ts`](file:///apps/cli/src/lsp.ts), [`packages/schema/src/mcp.ts`](file:///packages/schema/src/mcp.ts) | Schemas and CLI LSP implemented. Gate B for tools-image qualification remains pending owner approval. |
> | **LangGraph Orchestration** | **Delivered Free Checks / Real Unverified** | [`apps/server/services/workflowOrchestratorService.js`](file:///apps/server/services/workflowOrchestratorService.js) | 22 free tests pass. Real-provider live inference remains UNVERIFIED due to paid call gates. |
> 
> ---
> 
> ## 2. Architectural Decisions & Recorded Owner Sign-Off
> 
> See canonical decision records and options in [`docs/governance/ARCHITECTURE-DECISION-REGISTRY.md`](../governance/ARCHITECTURE-DECISION-REGISTRY.md).
> 
> ### 2.1 Database Adapter Conflict (ADR-001 / DEC-01)
> - **Problem**: Earlier P1–P4 plans mandated PostgreSQL as the canonical database with Drizzle ORM. However, [`apps/server/config/db.js`](file:///apps/server/config/db.js) was adapted to support SQLite for local offline development.
> - **Current State**: `config/db.js` switches between `sqliteDb.js` and `pg.Pool` depending on `process.env.SIRONA_DB_DRIVER`.
> - **Recorded Owner Decision (2026-11-03)**: Owner confirmed **Option A** (SQLite for desktop, PostgreSQL for server). Pre-implementation requirement: verify existing adapters, migrations `001–024`, schema compatibility, and data ownership before modifying code ([`ADR-001`](../governance/ARCHITECTURE-DECISION-REGISTRY.md#adr-001-database-engine-topology-sqlite-vs-postgresql)). STOP-01 remains active against code edits.
> 
> ### 2.2 P5 Real-Model Acceptance Gate (ADR-004 / DEC-02)
> - **Problem**: P5 (LangGraph bounded specialists) passed 22 synthetic/free tests, but real-model live inference was stopped to avoid unauthorized paid API usage.
> - **Current State**: Feature code is present, but marked `UNVERIFIED` in the execution ledger.
> - **Recorded Owner Decision (2026-11-03)**: Owner confirmed **Option A (Conditional)** to prepare for one bounded live-provider acceptance test. Condition: No billable inference call may be executed until provider, model, and cost ceiling are separately approved ([`ADR-004`](../governance/ARCHITECTURE-DECISION-REGISTRY.md#adr-004-live-model-paid-inference-verification-gate)). STOP-02 remains active.
> 
> ### 2.3 P6 Gate B Docker Tools Image Qualification (ADR-007 / DEC-03)
> - **Problem**: P6 Gate A was approved and passed free checks. Gate B requires testing the full `tools-worker.Dockerfile` inside WSL2 Docker with live tool admission.
> - **Recorded Owner Decision (2026-11-03)**: Owner confirmed **Option B** (defer Gate B container qualification). Preserve existing sandbox safeguards (WSL2 Docker trusted-local profile, timeout-clamped processes) and mandatory human approval rules ([`ADR-007`](../governance/ARCHITECTURE-DECISION-REGISTRY.md#adr-007-containerized-tools-worker-qualification-p6-gate-b)). STOP-03 preserved in deferred state.
