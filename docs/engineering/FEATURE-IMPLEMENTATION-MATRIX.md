---
title: "Feature Implementation Matrix"
summary: "Source-grounded F01-F24 implementation planning; no activation approval."
read_when:
  - "Planning or reviewing a bounded implementation task"
owning_subsystem: "Implementation planning"
primary_source_files:
  - "apps/server/routes/index.js"
  - "apps/server/config/sqliteDb.js"
  - "apps/web/src/App.tsx"
design_status: "PROPOSED"
updated: "2026-11-05"
---

# Feature Implementation Matrix

All current statuses are static findings. Runtime tests NOT_RUN. Target feature IDs retain the 24-feature architecture; nine legacy feature bundles are cross-references, not evidence of 24 completed specifications.

## F01 — Gateway and transport

- **Phase:** IP02; later qualification/consumer work follows the roadmap.
- **Current status:** SOURCE PRESENT / PARTIAL; canonical real workflow UNVERIFIED.
- **Functional requirements and missing work:** Reconcile registered routes, session scope and durable SSE replay; keep controllers thin.
- **Backend/source owners:** `apps/server/app.js`, `apps/server/routes/index.js`, `apps/server/middleware/sessionAuth.js`.
- **Database families:** `auth_sessions, run_events`. These are source-level logical names; use IP00 schema inventory to distinguish declarations. Exact migration delta is UNKNOWN until C task and IP01 schema mapping; reuse before adding tables.
- **API/events/contracts:** preserve registered operations in the [route inventory](IP00-SOURCE-INVENTORY.md); C task records field-by-field existing/proposed delta, auth, scopes, idempotency, errors, terminal events and replay. No route inferred from an outdated SPEC is assumed real.
- **Frontend:** No new product surface; operational diagnostics only until qualified.
- **Electron:** No direct privileged API added; use scoped existing bridge for native needs, HTTP/SSE for domain operations.
- **Libraries:** use technology ownership table in master plan; installed version/active consumer must be checked before dependency changes.
- **Dependencies:** phase prerequisites in [roadmap](IMPLEMENTATION-ROADMAP.md); contracts before consumers; qualification before production use.
- **Security/recovery:** scoped actor/project authority checked by server; bounded inputs and timeouts; abort propagation; persisted effects reconciled before retry; credentials excluded from renderer/results. Feature-specific requirement: Reject forged origins and cross-workspace reads; replay ordered events once after disconnect.
- **Tests:** existing `apps/server/tests/boundary.test.js` is a candidate, not a PASS; create focused acceptance at proposed `apps/server/tests/ip02-f01-acceptance.test.ts`, plus applicable desktop/UI tests.
- **Completion criterion:** Reject forged origins and cross-workspace reads; replay ordered events once after disconnect; real UI/CLI journey where applicable and source-bound evidence.
- **Complexity:** High.
- **Tasks:** IP02-F01-C/B/U/V in [backlog](IMPLEMENTATION-TASK-BACKLOG.md).

## F02 — Identity security and credentials

- **Phase:** IP02; later qualification/consumer work follows the roadmap.
- **Current status:** SOURCE PRESENT / PARTIAL; canonical real workflow UNVERIFIED.
- **Functional requirements and missing work:** Qualify trusted IPC, DPAPI availability, secret references, revocation and backend credential resolution.
- **Backend/source owners:** `apps/server/services/identityService.js`, `apps/desktop/src/security/credentialBroker.ts`, `apps/desktop/src/main.cjs`.
- **Database families:** `users, workspaces, auth_sessions, provider_connections`. These are source-level logical names; use IP00 schema inventory to distinguish declarations. Exact migration delta is UNKNOWN until C task and IP01 schema mapping; reuse before adding tables.
- **API/events/contracts:** preserve registered operations in the [route inventory](IP00-SOURCE-INVENTORY.md); C task records field-by-field existing/proposed delta, auth, scopes, idempotency, errors, terminal events and replay. No route inferred from an outdated SPEC is assumed real.
- **Frontend:** Use existing client and components; add only the feature-specific view/state required for this capability.
- **Electron:** Direct native/credential/lifecycle integration at listed desktop owners.
- **Libraries:** use technology ownership table in master plan; installed version/active consumer must be checked before dependency changes.
- **Dependencies:** phase prerequisites in [roadmap](IMPLEMENTATION-ROADMAP.md); contracts before consumers; qualification before production use.
- **Security/recovery:** scoped actor/project authority checked by server; bounded inputs and timeouts; abort propagation; persisted effects reconciled before retry; credentials excluded from renderer/results. Feature-specific requirement: Reject untrusted sender and revoked identity; scan renderer/log artifacts for secret canaries.
- **Tests:** existing `apps/server/tests/credentialBroker.test.js` is a candidate, not a PASS; create focused acceptance at proposed `apps/server/tests/ip02-f02-acceptance.test.ts`, plus applicable desktop/UI tests.
- **Completion criterion:** Reject untrusted sender and revoked identity; scan renderer/log artifacts for secret canaries; real UI/CLI journey where applicable and source-bound evidence.
- **Complexity:** High.
- **Tasks:** IP02-F02-C/B/U/V in [backlog](IMPLEMENTATION-TASK-BACKLOG.md).

## F03 — Sessions and persistence

- **Phase:** IP01; later qualification/consumer work follows the roadmap.
- **Current status:** PARTIAL; multi-file source and swallowed transaction errors.
- **Functional requirements and missing work:** Replace swallowed transaction-control failures; plan single-file conversion and isolated test paths.
- **Backend/source owners:** `apps/server/config/db.js`, `apps/server/config/sqliteDb.js`, `apps/server/migrations/runMigrations.js`, `apps/server/routes/v1/conversations.routes.js`.
- **Database families:** `sessions, messages, session_turn_leases; all namespace tables`. These are source-level logical names; use IP00 schema inventory to distinguish declarations. Exact migration delta is UNKNOWN until C task and IP01 schema mapping; reuse before adding tables.
- **API/events/contracts:** preserve registered operations in the [route inventory](IP00-SOURCE-INVENTORY.md); C task records field-by-field existing/proposed delta, auth, scopes, idempotency, errors, terminal events and replay. No route inferred from an outdated SPEC is assumed real.
- **Frontend:** No new product surface; operational diagnostics only until qualified.
- **Electron:** No direct privileged API added; use scoped existing bridge for native needs, HTTP/SSE for domain operations.
- **Libraries:** use technology ownership table in master plan; installed version/active consumer must be checked before dependency changes.
- **Dependencies:** phase prerequisites in [roadmap](IMPLEMENTATION-ROADMAP.md); contracts before consumers; qualification before production use.
- **Security/recovery:** scoped actor/project authority checked by server; bounded inputs and timeouts; abort propagation; persisted effects reconciled before retry; credentials excluded from renderer/results. Feature-specific requirement: Fail BEGIN/COMMIT honestly; concurrent writers cannot interleave; conversion interruption leaves originals usable.
- **Tests:** existing `apps/server/tests/sqliteMigrations.test.js` is a candidate, not a PASS; create focused acceptance at proposed `apps/server/tests/ip01-f03-acceptance.test.ts`, plus applicable desktop/UI tests.
- **Completion criterion:** Fail BEGIN/COMMIT honestly; concurrent writers cannot interleave; conversion interruption leaves originals usable; real UI/CLI journey where applicable and source-bound evidence.
- **Complexity:** Very high.
- **Tasks:** IP01-F03-C/B/U/V in [backlog](IMPLEMENTATION-TASK-BACKLOG.md).

## F04 — Model providers

- **Phase:** IP03; later qualification/consumer work follows the roadmap.
- **Current status:** SOURCE PRESENT / PARTIAL; canonical real workflow UNVERIFIED.
- **Functional requirements and missing work:** Preserve exact IDs, native chat, discovery, provider port, tool compatibility, streaming and cancellation.
- **Backend/source owners:** `apps/server/services/providerService.js`, `apps/server/services/aiService.js`, `apps/server/src/providers/aiSdkAdapter.ts`, `apps/server/src/providers/modelAdapter.ts`.
- **Database families:** `provider_connections, models, model_calls`. These are source-level logical names; use IP00 schema inventory to distinguish declarations. Exact migration delta is UNKNOWN until C task and IP01 schema mapping; reuse before adding tables.
- **API/events/contracts:** preserve registered operations in the [route inventory](IP00-SOURCE-INVENTORY.md); C task records field-by-field existing/proposed delta, auth, scopes, idempotency, errors, terminal events and replay. No route inferred from an outdated SPEC is assumed real.
- **Frontend:** Use existing client and components; add only the feature-specific view/state required for this capability.
- **Electron:** No direct privileged API added; use scoped existing bridge for native needs, HTTP/SSE for domain operations.
- **Libraries:** use technology ownership table in master plan; installed version/active consumer must be checked before dependency changes.
- **Dependencies:** phase prerequisites in [roadmap](IMPLEMENTATION-ROADMAP.md); contracts before consumers; qualification before production use.
- **Security/recovery:** scoped actor/project authority checked by server; bounded inputs and timeouts; abort propagation; persisted effects reconciled before retry; credentials excluded from renderer/results. Feature-specific requirement: 401/429/timeout/interrupted stream normalize correctly; real authorized inference and immediate lease reacquisition.
- **Tests:** existing `apps/server/tests/providerParity.test.ts` is a candidate, not a PASS; create focused acceptance at proposed `apps/server/tests/ip03-f04-acceptance.test.ts`, plus applicable desktop/UI tests.
- **Completion criterion:** 401/429/timeout/interrupted stream normalize correctly; real authorized inference and immediate lease reacquisition; real UI/CLI journey where applicable and source-bound evidence.
- **Complexity:** High.
- **Tasks:** IP03-F04-C/B/U/V in [backlog](IMPLEMENTATION-TASK-BACKLOG.md).

## F05 — Routing and budgets

- **Phase:** IP03; later qualification/consumer work follows the roadmap.
- **Current status:** SOURCE PRESENT / PARTIAL; canonical real workflow UNVERIFIED.
- **Functional requirements and missing work:** Unify capability eligibility and budget reservation/settlement; forbid replay after partial side effects.
- **Backend/source owners:** `apps/server/services/providerService.js`, `apps/server/services/governanceService.js`, `apps/server/src/providers/credentialResolver.ts`.
- **Database families:** `budget_accounts, budget_reservations, model_calls`. These are source-level logical names; use IP00 schema inventory to distinguish declarations. Exact migration delta is UNKNOWN until C task and IP01 schema mapping; reuse before adding tables.
- **API/events/contracts:** preserve registered operations in the [route inventory](IP00-SOURCE-INVENTORY.md); C task records field-by-field existing/proposed delta, auth, scopes, idempotency, errors, terminal events and replay. No route inferred from an outdated SPEC is assumed real.
- **Frontend:** Use existing client and components; add only the feature-specific view/state required for this capability.
- **Electron:** No direct privileged API added; use scoped existing bridge for native needs, HTTP/SSE for domain operations.
- **Libraries:** use technology ownership table in master plan; installed version/active consumer must be checked before dependency changes.
- **Dependencies:** phase prerequisites in [roadmap](IMPLEMENTATION-ROADMAP.md); contracts before consumers; qualification before production use.
- **Security/recovery:** scoped actor/project authority checked by server; bounded inputs and timeouts; abort propagation; persisted effects reconciled before retry; credentials excluded from renderer/results. Feature-specific requirement: Concurrent requests respect limit; cancellation settles once; unsupported tool capability fails explicitly.
- **Tests:** existing `apps/server/tests/providerActivityBounds.test.ts` is a candidate, not a PASS; create focused acceptance at proposed `apps/server/tests/ip03-f05-acceptance.test.ts`, plus applicable desktop/UI tests.
- **Completion criterion:** Concurrent requests respect limit; cancellation settles once; unsupported tool capability fails explicitly; real UI/CLI journey where applicable and source-bound evidence.
- **Complexity:** High.
- **Tasks:** IP03-F05-C/B/U/V in [backlog](IMPLEMENTATION-TASK-BACKLOG.md).

## F06 — Intent research and requirements

- **Phase:** IP05; later qualification/consumer work follows the roadmap.
- **Current status:** STUB at named owner; alternative owner UNKNOWN.
- **Functional requirements and missing work:** Replace confirmed empty stub after caller audit; persist clarification/provenance and measurable requirements.
- **Backend/source owners:** `apps/server/services/intentRequirementService.js`, `apps/server/migrations/008_intent_research_requirements.sql`.
- **Database families:** `goals, intent_analyses, clarifications, research_reports, requirement_revisions`. These are source-level logical names; use IP00 schema inventory to distinguish declarations. Exact migration delta is UNKNOWN until C task and IP01 schema mapping; reuse before adding tables.
- **API/events/contracts:** preserve registered operations in the [route inventory](IP00-SOURCE-INVENTORY.md); C task records field-by-field existing/proposed delta, auth, scopes, idempotency, errors, terminal events and replay. No route inferred from an outdated SPEC is assumed real.
- **Frontend:** Use existing client and components; add only the feature-specific view/state required for this capability.
- **Electron:** No direct privileged API added; use scoped existing bridge for native needs, HTTP/SSE for domain operations.
- **Libraries:** use technology ownership table in master plan; installed version/active consumer must be checked before dependency changes.
- **Dependencies:** phase prerequisites in [roadmap](IMPLEMENTATION-ROADMAP.md); contracts before consumers; qualification before production use.
- **Security/recovery:** scoped actor/project authority checked by server; bounded inputs and timeouts; abort propagation; persisted effects reconciled before retry; credentials excluded from renderer/results. Feature-specific requirement: Ambiguous prompt requests clarification; untrusted research cannot grant permission; revision survives restart.
- **Tests:** existing `apps/server/tests/intent.test.js` is a candidate, not a PASS; create focused acceptance at proposed `apps/server/tests/ip05-f06-acceptance.test.ts`, plus applicable desktop/UI tests.
- **Completion criterion:** Ambiguous prompt requests clarification; untrusted research cannot grant permission; revision survives restart; real UI/CLI journey where applicable and source-bound evidence.
- **Complexity:** High.
- **Tasks:** IP05-F06-C/B/U/V in [backlog](IMPLEMENTATION-TASK-BACKLOG.md).

## F07 — Planning and Build Contracts

- **Phase:** IP05; later qualification/consumer work follows the roadmap.
- **Current status:** SOURCE PRESENT / PARTIAL; canonical real workflow UNVERIFIED.
- **Functional requirements and missing work:** Bind task DAG, requirement revision, budget, allowed effects and acceptance to immutable approved contract.
- **Backend/source owners:** `apps/server/services/workflowOrchestratorService.js`, `apps/server/services/executionService.js`, `apps/server/migrations/009_planning_contracts.sql`.
- **Database families:** `plans, plan_revisions, contracts, contract_revisions`. These are source-level logical names; use IP00 schema inventory to distinguish declarations. Exact migration delta is UNKNOWN until C task and IP01 schema mapping; reuse before adding tables.
- **API/events/contracts:** preserve registered operations in the [route inventory](IP00-SOURCE-INVENTORY.md); C task records field-by-field existing/proposed delta, auth, scopes, idempotency, errors, terminal events and replay. No route inferred from an outdated SPEC is assumed real.
- **Frontend:** Use existing client and components; add only the feature-specific view/state required for this capability.
- **Electron:** No direct privileged API added; use scoped existing bridge for native needs, HTTP/SSE for domain operations.
- **Libraries:** use technology ownership table in master plan; installed version/active consumer must be checked before dependency changes.
- **Dependencies:** phase prerequisites in [roadmap](IMPLEMENTATION-ROADMAP.md); contracts before consumers; qualification before production use.
- **Security/recovery:** scoped actor/project authority checked by server; bounded inputs and timeouts; abort propagation; persisted effects reconciled before retry; credentials excluded from renderer/results. Feature-specific requirement: Changing scope invalidates old approval; cyclic plans fail; plan-only produces no project mutation.
- **Tests:** existing `apps/server/tests/planning.test.js` is a candidate, not a PASS; create focused acceptance at proposed `apps/server/tests/ip05-f07-acceptance.test.ts`, plus applicable desktop/UI tests.
- **Completion criterion:** Changing scope invalidates old approval; cyclic plans fail; plan-only produces no project mutation; real UI/CLI journey where applicable and source-bound evidence.
- **Complexity:** High.
- **Tasks:** IP05-F07-C/B/U/V in [backlog](IMPLEMENTATION-TASK-BACKLOG.md).

## F08 — Approvals and governance

- **Phase:** IP04; later qualification/consumer work follows the roadmap.
- **Current status:** SOURCE PRESENT / PARTIAL; canonical real workflow UNVERIFIED.
- **Functional requirements and missing work:** Server-classified risk and exact action proofs; preserve legacy mode wire values with explicit four-mode mapping proposal.
- **Backend/source owners:** `apps/server/services/governanceService.js`, `apps/server/routes/v1/governance.routes.js`, `apps/server/src/security/executionPolicy.ts`.
- **Database families:** `policy_revisions, capability_grants, approvals, audit_events`. These are source-level logical names; use IP00 schema inventory to distinguish declarations. Exact migration delta is UNKNOWN until C task and IP01 schema mapping; reuse before adding tables.
- **API/events/contracts:** preserve registered operations in the [route inventory](IP00-SOURCE-INVENTORY.md); C task records field-by-field existing/proposed delta, auth, scopes, idempotency, errors, terminal events and replay. No route inferred from an outdated SPEC is assumed real.
- **Frontend:** Use existing client and components; add only the feature-specific view/state required for this capability.
- **Electron:** No direct privileged API added; use scoped existing bridge for native needs, HTTP/SSE for domain operations.
- **Libraries:** use technology ownership table in master plan; installed version/active consumer must be checked before dependency changes.
- **Dependencies:** phase prerequisites in [roadmap](IMPLEMENTATION-ROADMAP.md); contracts before consumers; qualification before production use.
- **Security/recovery:** scoped actor/project authority checked by server; bounded inputs and timeouts; abort propagation; persisted effects reconciled before retry; credentials excluded from renderer/results. Feature-specific requirement: Spoofed actor/risk, expired/replayed grant and changed action digest are denied before dispatch.
- **Tests:** existing `apps/server/tests/governance.test.js` is a candidate, not a PASS; create focused acceptance at proposed `apps/server/tests/ip04-f08-acceptance.test.ts`, plus applicable desktop/UI tests.
- **Completion criterion:** Spoofed actor/risk, expired/replayed grant and changed action digest are denied before dispatch; real UI/CLI journey where applicable and source-bound evidence.
- **Complexity:** Very high.
- **Tasks:** IP04-F08-C/B/U/V in [backlog](IMPLEMENTATION-TASK-BACKLOG.md).

## F09 — Runtime and durable recovery

- **Phase:** IP06; later qualification/consumer work follows the roadmap.
- **Current status:** SOURCE PRESENT / PARTIAL; canonical real workflow UNVERIFIED.
- **Functional requirements and missing work:** One run authority; fencing, stable operation keys, cancellation, reconciliation and version-pinned resume.
- **Backend/source owners:** `apps/server/services/conversationTurnCoordinator.js`, `apps/server/services/agentExecutionEngine.js`, `apps/server/services/executionService.js`, `apps/server/src/execution/effectJournal.ts`, `apps/server/src/execution/runEventStore.ts`.
- **Database families:** `runs, tasks, effects, run_checkpoints, run_events, reconciliation_operations`. These are source-level logical names; use IP00 schema inventory to distinguish declarations. Exact migration delta is UNKNOWN until C task and IP01 schema mapping; reuse before adding tables.
- **API/events/contracts:** preserve registered operations in the [route inventory](IP00-SOURCE-INVENTORY.md); C task records field-by-field existing/proposed delta, auth, scopes, idempotency, errors, terminal events and replay. No route inferred from an outdated SPEC is assumed real.
- **Frontend:** Use existing client and components; add only the feature-specific view/state required for this capability.
- **Electron:** No direct privileged API added; use scoped existing bridge for native needs, HTTP/SSE for domain operations.
- **Libraries:** use technology ownership table in master plan; installed version/active consumer must be checked before dependency changes.
- **Dependencies:** phase prerequisites in [roadmap](IMPLEMENTATION-ROADMAP.md); contracts before consumers; qualification before production use.
- **Security/recovery:** scoped actor/project authority checked by server; bounded inputs and timeouts; abort propagation; persisted effects reconciled before retry; credentials excluded from renderer/results. Feature-specific requirement: Kill before/after each mutation boundary; no duplicate effect; uncertain outcome blocks blind retry.
- **Tests:** existing `apps/server/tests/orchestrationCrash.test.ts` is a candidate, not a PASS; create focused acceptance at proposed `apps/server/tests/ip06-f09-acceptance.test.ts`, plus applicable desktop/UI tests.
- **Completion criterion:** Kill before/after each mutation boundary; no duplicate effect; uncertain outcome blocks blind retry; real UI/CLI journey where applicable and source-bound evidence.
- **Complexity:** Very high.
- **Tasks:** IP06-F09-C/B/U/V in [backlog](IMPLEMENTATION-TASK-BACKLOG.md).

## F10 — Specialists and independent review

- **Phase:** IP08; later qualification/consumer work follows the roadmap.
- **Current status:** SOURCE PRESENT / PARTIAL; canonical real workflow UNVERIFIED.
- **Functional requirements and missing work:** Qualify flat parent delegation, max three concurrent specialists, independent artifact review and bounded repair.
- **Backend/source owners:** `apps/server/src/orchestration/workspaceGraph.ts`, `apps/server/src/orchestration/delegationService.ts`, `apps/server/src/orchestration/activityAdapter.ts`, `apps/server/src/orchestration/graphRuntime.ts`.
- **Database families:** `agent_sessions, tasks, run_checkpoints, effects`. These are source-level logical names; use IP00 schema inventory to distinguish declarations. Exact migration delta is UNKNOWN until C task and IP01 schema mapping; reuse before adding tables.
- **API/events/contracts:** preserve registered operations in the [route inventory](IP00-SOURCE-INVENTORY.md); C task records field-by-field existing/proposed delta, auth, scopes, idempotency, errors, terminal events and replay. No route inferred from an outdated SPEC is assumed real.
- **Frontend:** Use existing client and components; add only the feature-specific view/state required for this capability.
- **Electron:** No direct privileged API added; use scoped existing bridge for native needs, HTTP/SSE for domain operations.
- **Libraries:** use technology ownership table in master plan; installed version/active consumer must be checked before dependency changes.
- **Dependencies:** phase prerequisites in [roadmap](IMPLEMENTATION-ROADMAP.md); contracts before consumers; qualification before production use.
- **Security/recovery:** scoped actor/project authority checked by server; bounded inputs and timeouts; abort propagation; persisted effects reconciled before retry; credentials excluded from renderer/results. Feature-specific requirement: Fourth concurrent specialist rejected; nested delegation denied; sequential reuse allowed; stale review rejected.
- **Tests:** existing `apps/server/tests/delegationPolicy.test.ts` is a candidate, not a PASS; create focused acceptance at proposed `apps/server/tests/ip08-f10-acceptance.test.ts`, plus applicable desktop/UI tests.
- **Completion criterion:** Fourth concurrent specialist rejected; nested delegation denied; sequential reuse allowed; stale review rejected; real UI/CLI journey where applicable and source-bound evidence.
- **Complexity:** High.
- **Tasks:** IP08-F10-C/B/U/V in [backlog](IMPLEMENTATION-TASK-BACKLOG.md).

## F11 — Workspace Git and artifacts

- **Phase:** IP04; later qualification/consumer work follows the roadmap.
- **Current status:** SOURCE PRESENT / PARTIAL; canonical real workflow UNVERIFIED.
- **Functional requirements and missing work:** Canonical roots, bounded reads, digest-bound previews and atomic patches; Git status/diff without auto commit/push.
- **Backend/source owners:** `apps/server/services/workspacePathResolver.js`, `apps/server/src/workspace/workspaceBroker.ts`, `apps/server/src/workspace/patchService.ts`, `apps/server/src/tools/gitAdapter.ts`.
- **Database families:** `projects, repository_snapshots, artifacts`. These are source-level logical names; use IP00 schema inventory to distinguish declarations. Exact migration delta is UNKNOWN until C task and IP01 schema mapping; reuse before adding tables.
- **API/events/contracts:** preserve registered operations in the [route inventory](IP00-SOURCE-INVENTORY.md); C task records field-by-field existing/proposed delta, auth, scopes, idempotency, errors, terminal events and replay. No route inferred from an outdated SPEC is assumed real.
- **Frontend:** Use existing client and components; add only the feature-specific view/state required for this capability.
- **Electron:** No direct privileged API added; use scoped existing bridge for native needs, HTTP/SSE for domain operations.
- **Libraries:** use technology ownership table in master plan; installed version/active consumer must be checked before dependency changes.
- **Dependencies:** phase prerequisites in [roadmap](IMPLEMENTATION-ROADMAP.md); contracts before consumers; qualification before production use.
- **Security/recovery:** scoped actor/project authority checked by server; bounded inputs and timeouts; abort propagation; persisted effects reconciled before retry; credentials excluded from renderer/results. Feature-specific requirement: Junction and cross-drive escapes fail; modified base causes conflict; rollback preserves unrelated edits.
- **Tests:** existing `apps/server/tests/nativePatch.test.ts` is a candidate, not a PASS; create focused acceptance at proposed `apps/server/tests/ip04-f11-acceptance.test.ts`, plus applicable desktop/UI tests.
- **Completion criterion:** Junction and cross-drive escapes fail; modified base causes conflict; rollback preserves unrelated edits; real UI/CLI journey where applicable and source-bound evidence.
- **Complexity:** High.
- **Tasks:** IP04-F11-C/B/U/V in [backlog](IMPLEMENTATION-TASK-BACKLOG.md).

## F12 — Tool runtime and sandbox

- **Phase:** IP04; later qualification/consumer work follows the roadmap.
- **Current status:** SOURCE PRESENT / PARTIAL; canonical real workflow UNVERIFIED.
- **Functional requirements and missing work:** Qualify exact trusted-local guest; reconcile explicit host opt-in with policy; enforce receipts, bounds and cleanup.
- **Backend/source owners:** `apps/server/services/toolRuntimeService.js`, `apps/server/services/sandboxManager.js`, `apps/server/src/windows/dockerRuntime.ts`, `apps/server/src/windows/canonicalTerminal.ts`, `apps/cli/docker/tools-worker.Dockerfile`.
- **Database families:** `tools, tool_revisions, tool_invocations, tool_receipts, isolation_workers`. These are source-level logical names; use IP00 schema inventory to distinguish declarations. Exact migration delta is UNKNOWN until C task and IP01 schema mapping; reuse before adding tables.
- **API/events/contracts:** preserve registered operations in the [route inventory](IP00-SOURCE-INVENTORY.md); C task records field-by-field existing/proposed delta, auth, scopes, idempotency, errors, terminal events and replay. No route inferred from an outdated SPEC is assumed real.
- **Frontend:** Use existing client and components; add only the feature-specific view/state required for this capability.
- **Electron:** No direct privileged API added; use scoped existing bridge for native needs, HTTP/SSE for domain operations.
- **Libraries:** use technology ownership table in master plan; installed version/active consumer must be checked before dependency changes.
- **Dependencies:** phase prerequisites in [roadmap](IMPLEMENTATION-ROADMAP.md); contracts before consumers; qualification before production use.
- **Security/recovery:** scoped actor/project authority checked by server; bounded inputs and timeouts; abort propagation; persisted effects reconciled before retry; credentials excluded from renderer/results. Feature-specific requirement: Docker absence never routes project command to host; timeout kills process tree; network/resource policy verified.
- **Tests:** existing `apps/server/tests/dockerContainment.integration.test.ts` is a candidate, not a PASS; create focused acceptance at proposed `apps/server/tests/ip04-f12-acceptance.test.ts`, plus applicable desktop/UI tests.
- **Completion criterion:** Docker absence never routes project command to host; timeout kills process tree; network/resource policy verified; real UI/CLI journey where applicable and source-bound evidence.
- **Complexity:** Very high.
- **Tasks:** IP04-F12-C/B/U/V in [backlog](IMPLEMENTATION-TASK-BACKLOG.md).

## F13 — MCP and code intelligence

- **Phase:** IP07; later qualification/consumer work follows the roadmap.
- **Current status:** SOURCE PRESENT / PARTIAL; canonical real workflow UNVERIFIED.
- **Functional requirements and missing work:** Authorize actual MCP dispatch; qualify guest ripgrep, Tree-sitter and LSP using pinned artifacts.
- **Backend/source owners:** `apps/server/src/tools/mcpAdapter.ts`, `apps/server/src/tools/searchAdapter.ts`, `apps/server/src/tools/lspAdapter.ts`, `apps/server/src/context/parserWorker.ts`, `apps/cli/src/guest/agent.ts`.
- **Database families:** `developer_connections, tools, tool_revisions, tool_receipts`. These are source-level logical names; use IP00 schema inventory to distinguish declarations. Exact migration delta is UNKNOWN until C task and IP01 schema mapping; reuse before adding tables.
- **API/events/contracts:** preserve registered operations in the [route inventory](IP00-SOURCE-INVENTORY.md); C task records field-by-field existing/proposed delta, auth, scopes, idempotency, errors, terminal events and replay. No route inferred from an outdated SPEC is assumed real.
- **Frontend:** Use existing client and components; add only the feature-specific view/state required for this capability.
- **Electron:** No direct privileged API added; use scoped existing bridge for native needs, HTTP/SSE for domain operations.
- **Libraries:** use technology ownership table in master plan; installed version/active consumer must be checked before dependency changes.
- **Dependencies:** phase prerequisites in [roadmap](IMPLEMENTATION-ROADMAP.md); contracts before consumers; qualification before production use.
- **Security/recovery:** scoped actor/project authority checked by server; bounded inputs and timeouts; abort propagation; persisted effects reconciled before retry; credentials excluded from renderer/results. Feature-specific requirement: Unauthorized server/tool rejected; parser cancellation works; bounded outputs; real guest search and diagnostics.
- **Tests:** existing `apps/server/tests/p6CanonicalJourney.test.ts` is a candidate, not a PASS; create focused acceptance at proposed `apps/server/tests/ip07-f13-acceptance.test.ts`, plus applicable desktop/UI tests.
- **Completion criterion:** Unauthorized server/tool rejected; parser cancellation works; bounded outputs; real guest search and diagnostics; real UI/CLI journey where applicable and source-bound evidence.
- **Complexity:** High.
- **Tasks:** IP07-F13-C/B/U/V in [backlog](IMPLEMENTATION-TASK-BACKLOG.md).

## F14 — Context memory and skills

- **Phase:** IP07; later qualification/consumer work follows the roadmap.
- **Current status:** SOURCE PRESENT / PARTIAL; canonical real workflow UNVERIFIED.
- **Functional requirements and missing work:** Scoped retrieval with provenance/freshness/token budget; document skill loading trust before enabling it.
- **Backend/source owners:** `apps/server/services/contextEngineService.js`, `apps/server/services/memoryService.js`, `apps/server/src/context/contextAssembler.ts`, `apps/server/src/context/projectIndex.ts`.
- **Database families:** `knowledge.memories, memory_revisions, memory_chunks, context_bundles`. These are source-level logical names; use IP00 schema inventory to distinguish declarations. Exact migration delta is UNKNOWN until C task and IP01 schema mapping; reuse before adding tables.
- **API/events/contracts:** preserve registered operations in the [route inventory](IP00-SOURCE-INVENTORY.md); C task records field-by-field existing/proposed delta, auth, scopes, idempotency, errors, terminal events and replay. No route inferred from an outdated SPEC is assumed real.
- **Frontend:** Use existing client and components; add only the feature-specific view/state required for this capability.
- **Electron:** No direct privileged API added; use scoped existing bridge for native needs, HTTP/SSE for domain operations.
- **Libraries:** use technology ownership table in master plan; installed version/active consumer must be checked before dependency changes.
- **Dependencies:** phase prerequisites in [roadmap](IMPLEMENTATION-ROADMAP.md); contracts before consumers; qualification before production use.
- **Security/recovery:** scoped actor/project authority checked by server; bounded inputs and timeouts; abort propagation; persisted effects reconciled before retry; credentials excluded from renderer/results. Feature-specific requirement: Cross-project memory excluded; deleted/stale data not reused; untrusted text cannot expand tool grants.
- **Tests:** existing `apps/server/tests/contextIsolation.test.ts` is a candidate, not a PASS; create focused acceptance at proposed `apps/server/tests/ip07-f14-acceptance.test.ts`, plus applicable desktop/UI tests.
- **Completion criterion:** Cross-project memory excluded; deleted/stale data not reused; untrusted text cannot expand tool grants; real UI/CLI journey where applicable and source-bound evidence.
- **Complexity:** High.
- **Tasks:** IP07-F14-C/B/U/V in [backlog](IMPLEMENTATION-TASK-BACKLOG.md).

## F15 — Verification and quality

- **Phase:** IP06; later qualification/consumer work follows the roadmap.
- **Current status:** PARTIAL; absent testResults can default required criteria to pass.
- **Functional requirements and missing work:** Remove no-results default pass behavior; obtain trusted checker receipts and bind verdict to artifact/contract.
- **Backend/source owners:** `apps/server/services/verificationService.js`, `apps/server/routes/v1/verification.routes.js`, `apps/server/services/agentWorkerService.js`.
- **Database families:** `verification_jobs, verification_results, verification_reports`. These are source-level logical names; use IP00 schema inventory to distinguish declarations. Exact migration delta is UNKNOWN until C task and IP01 schema mapping; reuse before adding tables.
- **API/events/contracts:** preserve registered operations in the [route inventory](IP00-SOURCE-INVENTORY.md); C task records field-by-field existing/proposed delta, auth, scopes, idempotency, errors, terminal events and replay. No route inferred from an outdated SPEC is assumed real.
- **Frontend:** Use existing client and components; add only the feature-specific view/state required for this capability.
- **Electron:** No direct privileged API added; use scoped existing bridge for native needs, HTTP/SSE for domain operations.
- **Libraries:** use technology ownership table in master plan; installed version/active consumer must be checked before dependency changes.
- **Dependencies:** phase prerequisites in [roadmap](IMPLEMENTATION-ROADMAP.md); contracts before consumers; qualification before production use.
- **Security/recovery:** scoped actor/project authority checked by server; bounded inputs and timeouts; abort propagation; persisted effects reconciled before retry; credentials excluded from renderer/results. Feature-specific requirement: Absent checks yield unknown; bad artifact fails; producer-supplied success cannot certify itself.
- **Tests:** existing `apps/server/tests/verification.test.js` is a candidate, not a PASS; create focused acceptance at proposed `apps/server/tests/ip06-f15-acceptance.test.ts`, plus applicable desktop/UI tests.
- **Completion criterion:** Absent checks yield unknown; bad artifact fails; producer-supplied success cannot certify itself; real UI/CLI journey where applicable and source-bound evidence.
- **Complexity:** Very high.
- **Tasks:** IP06-F15-C/B/U/V in [backlog](IMPLEMENTATION-TASK-BACKLOG.md).

## F16 — External worker adapters

- **Phase:** IP12; later qualification/consumer work follows the roadmap.
- **Current status:** UNKNOWN external integration; internal worker source exists.
- **Functional requirements and missing work:** Existing internal worker is not proof of external IDE integration; qualify one selected adapter later.
- **Backend/source owners:** `apps/server/services/agentWorkerService.js`, `apps/server/routes/v1/tools.routes.js`, `apps/server/src/tools/guestTransport.ts`.
- **Database families:** `developer_connections, tasks, tool_receipts`. These are source-level logical names; use IP00 schema inventory to distinguish declarations. Exact migration delta is UNKNOWN until C task and IP01 schema mapping; reuse before adding tables.
- **API/events/contracts:** preserve registered operations in the [route inventory](IP00-SOURCE-INVENTORY.md); C task records field-by-field existing/proposed delta, auth, scopes, idempotency, errors, terminal events and replay. No route inferred from an outdated SPEC is assumed real.
- **Frontend:** Use existing client and components; add only the feature-specific view/state required for this capability.
- **Electron:** No direct privileged API added; use scoped existing bridge for native needs, HTTP/SSE for domain operations.
- **Libraries:** use technology ownership table in master plan; installed version/active consumer must be checked before dependency changes.
- **Dependencies:** phase prerequisites in [roadmap](IMPLEMENTATION-ROADMAP.md); contracts before consumers; qualification before production use.
- **Security/recovery:** scoped actor/project authority checked by server; bounded inputs and timeouts; abort propagation; persisted effects reconciled before retry; credentials excluded from renderer/results. Feature-specific requirement: Worker cannot broaden grant; disconnect becomes explicit uncertain state; resumed task deduplicates effects.
- **Tests:** existing `apps/server/tests/runner.test.js` is a candidate, not a PASS; create focused acceptance at proposed `apps/server/tests/ip12-f16-acceptance.test.ts`, plus applicable desktop/UI tests.
- **Completion criterion:** Worker cannot broaden grant; disconnect becomes explicit uncertain state; resumed task deduplicates effects; real UI/CLI journey where applicable and source-bound evidence.
- **Complexity:** High.
- **Tasks:** IP12-F16-C/B/U/V in [backlog](IMPLEMENTATION-TASK-BACKLOG.md).

## F17 — Scheduling events notifications

- **Phase:** IP11; later qualification/consumer work follows the roadmap.
- **Current status:** SOURCE PRESENT / PARTIAL; canonical real workflow UNVERIFIED.
- **Functional requirements and missing work:** Atomic SQLite occurrence admission and real canonical run dispatch; policy checks; local delivery outbox.
- **Backend/source owners:** `apps/server/services/automationService.js`, `apps/server/services/notificationDispatcher.js`, `apps/server/routes/v1/automation.routes.js`.
- **Database families:** `automation.schedules, occurrences, triggers, inbound_events, notifications`. These are source-level logical names; use IP00 schema inventory to distinguish declarations. Exact migration delta is UNKNOWN until C task and IP01 schema mapping; reuse before adding tables.
- **API/events/contracts:** preserve registered operations in the [route inventory](IP00-SOURCE-INVENTORY.md); C task records field-by-field existing/proposed delta, auth, scopes, idempotency, errors, terminal events and replay. No route inferred from an outdated SPEC is assumed real.
- **Frontend:** Use existing client and components; add only the feature-specific view/state required for this capability.
- **Electron:** No direct privileged API added; use scoped existing bridge for native needs, HTTP/SSE for domain operations.
- **Libraries:** use technology ownership table in master plan; installed version/active consumer must be checked before dependency changes.
- **Dependencies:** phase prerequisites in [roadmap](IMPLEMENTATION-ROADMAP.md); contracts before consumers; qualification before production use.
- **Security/recovery:** scoped actor/project authority checked by server; bounded inputs and timeouts; abort propagation; persisted effects reconciled before retry; credentials excluded from renderer/results. Feature-specific requirement: DST/misfire/overlap tests; duplicate signed event creates one logical run; delivery retry never reruns code.
- **Tests:** existing `apps/server/tests/schedules.test.js` is a candidate, not a PASS; create focused acceptance at proposed `apps/server/tests/ip11-f17-acceptance.test.ts`, plus applicable desktop/UI tests.
- **Completion criterion:** DST/misfire/overlap tests; duplicate signed event creates one logical run; delivery retry never reruns code; real UI/CLI journey where applicable and source-bound evidence.
- **Complexity:** High.
- **Tasks:** IP11-F17-C/B/U/V in [backlog](IMPLEMENTATION-TASK-BACKLOG.md).

## F18 — Browser and computer runtime

- **Phase:** IP12; later qualification/consumer work follows the roadmap.
- **Current status:** SYNTHETIC browser QA records; real control MISSING at inspected owner.
- **Functional requirements and missing work:** Replace synthetic completed browser logs with unavailable state first; later real bounded browser adapter.
- **Backend/source owners:** `apps/server/services/deploymentService.js`, `apps/server/routes/v1/deployment.routes.js`.
- **Database families:** `ops.browser_qa_sessions`. These are source-level logical names; use IP00 schema inventory to distinguish declarations. Exact migration delta is UNKNOWN until C task and IP01 schema mapping; reuse before adding tables.
- **API/events/contracts:** preserve registered operations in the [route inventory](IP00-SOURCE-INVENTORY.md); C task records field-by-field existing/proposed delta, auth, scopes, idempotency, errors, terminal events and replay. No route inferred from an outdated SPEC is assumed real.
- **Frontend:** Use existing client and components; add only the feature-specific view/state required for this capability.
- **Electron:** No direct privileged API added; use scoped existing bridge for native needs, HTTP/SSE for domain operations.
- **Libraries:** use technology ownership table in master plan; installed version/active consumer must be checked before dependency changes.
- **Dependencies:** phase prerequisites in [roadmap](IMPLEMENTATION-ROADMAP.md); contracts before consumers; qualification before production use.
- **Security/recovery:** scoped actor/project authority checked by server; bounded inputs and timeouts; abort propagation; persisted effects reconciled before retry; credentials excluded from renderer/results. Feature-specific requirement: Unconfigured browser never reports success; real navigation evidence, denied sensitive action, cleanup.
- **Tests:** existing `apps/server/tests/deployments.test.js` is a candidate, not a PASS; create focused acceptance at proposed `apps/server/tests/ip12-f18-acceptance.test.ts`, plus applicable desktop/UI tests.
- **Completion criterion:** Unconfigured browser never reports success; real navigation evidence, denied sensitive action, cleanup; real UI/CLI journey where applicable and source-bound evidence.
- **Complexity:** Very high.
- **Tasks:** IP12-F18-C/B/U/V in [backlog](IMPLEMENTATION-TASK-BACKLOG.md).

## F19 — Deployment and integrations

- **Phase:** IP13; later qualification/consumer work follows the roadmap.
- **Current status:** SYNTHETIC deployment status path; actual target qualification UNKNOWN.
- **Functional requirements and missing work:** Replace synthetic active/healthy result paths with fail-closed availability; qualify one approved target later.
- **Backend/source owners:** `apps/server/services/deploymentService.js`, `apps/server/routes/v1/deployment.routes.js`.
- **Database families:** `ops.deployment_previews, deployments`. These are source-level logical names; use IP00 schema inventory to distinguish declarations. Exact migration delta is UNKNOWN until C task and IP01 schema mapping; reuse before adding tables.
- **API/events/contracts:** preserve registered operations in the [route inventory](IP00-SOURCE-INVENTORY.md); C task records field-by-field existing/proposed delta, auth, scopes, idempotency, errors, terminal events and replay. No route inferred from an outdated SPEC is assumed real.
- **Frontend:** Use existing client and components; add only the feature-specific view/state required for this capability.
- **Electron:** No direct privileged API added; use scoped existing bridge for native needs, HTTP/SSE for domain operations.
- **Libraries:** use technology ownership table in master plan; installed version/active consumer must be checked before dependency changes.
- **Dependencies:** phase prerequisites in [roadmap](IMPLEMENTATION-ROADMAP.md); contracts before consumers; qualification before production use.
- **Security/recovery:** scoped actor/project authority checked by server; bounded inputs and timeouts; abort propagation; persisted effects reconciled before retry; credentials excluded from renderer/results. Feature-specific requirement: Changed digest invalidates approval; real health evidence required; uncertain external result reconciled.
- **Tests:** existing `apps/server/tests/deployments.test.js` is a candidate, not a PASS; create focused acceptance at proposed `apps/server/tests/ip13-f19-acceptance.test.ts`, plus applicable desktop/UI tests.
- **Completion criterion:** Changed digest invalidates approval; real health evidence required; uncertain external result reconciled; real UI/CLI journey where applicable and source-bound evidence.
- **Complexity:** Very high.
- **Tasks:** IP13-F19-C/B/U/V in [backlog](IMPLEMENTATION-TASK-BACKLOG.md).

## F20 — Observability and evaluations

- **Phase:** IP01; later qualification/consumer work follows the roadmap.
- **Current status:** SOURCE PRESENT / PARTIAL; canonical real workflow UNVERIFIED.
- **Functional requirements and missing work:** Correlate run/effect/model events, redact secrets and replace unconditional health/security claims with measurements.
- **Backend/source owners:** `apps/server/foundation/logger.js`, `apps/server/services/auditLogger.js`, `apps/server/services/releaseRecoveryService.js`.
- **Database families:** `audit_events, model_calls, verification_evaluations, system.operational_quotas`. These are source-level logical names; use IP00 schema inventory to distinguish declarations. Exact migration delta is UNKNOWN until C task and IP01 schema mapping; reuse before adding tables.
- **API/events/contracts:** preserve registered operations in the [route inventory](IP00-SOURCE-INVENTORY.md); C task records field-by-field existing/proposed delta, auth, scopes, idempotency, errors, terminal events and replay. No route inferred from an outdated SPEC is assumed real.
- **Frontend:** No new product surface; operational diagnostics only until qualified.
- **Electron:** No direct privileged API added; use scoped existing bridge for native needs, HTTP/SSE for domain operations.
- **Libraries:** use technology ownership table in master plan; installed version/active consumer must be checked before dependency changes.
- **Dependencies:** phase prerequisites in [roadmap](IMPLEMENTATION-ROADMAP.md); contracts before consumers; qualification before production use.
- **Security/recovery:** scoped actor/project authority checked by server; bounded inputs and timeouts; abort propagation; persisted effects reconciled before retry; credentials excluded from renderer/results. Feature-specific requirement: Canary secrets absent; costs derived from actual usage; missing probes report unknown rather than healthy.
- **Tests:** existing `apps/server/tests/productionHardening.test.js` is a candidate, not a PASS; create focused acceptance at proposed `apps/server/tests/ip01-f20-acceptance.test.ts`, plus applicable desktop/UI tests.
- **Completion criterion:** Canary secrets absent; costs derived from actual usage; missing probes report unknown rather than healthy; real UI/CLI journey where applicable and source-bound evidence.
- **Complexity:** High.
- **Tasks:** IP01-F20-C/B/U/V in [backlog](IMPLEMENTATION-TASK-BACKLOG.md).

## F21 — Release backup and recovery

- **Phase:** IP10; later qualification/consumer work follows the roadmap.
- **Current status:** UNAVAILABLE backup/restore by explicit error.
- **Functional requirements and missing work:** Backup/restore currently unavailable; implement consistent single-file backup, isolated restore and packaging qualification.
- **Backend/source owners:** `apps/server/services/releaseRecoveryService.js`, `apps/server/routes/v1/recovery.routes.js`, `apps/desktop/package.json`.
- **Database families:** `system.release_manifests, recovery_checkpoints, recovery_rehearsals`. These are source-level logical names; use IP00 schema inventory to distinguish declarations. Exact migration delta is UNKNOWN until C task and IP01 schema mapping; reuse before adding tables.
- **API/events/contracts:** preserve registered operations in the [route inventory](IP00-SOURCE-INVENTORY.md); C task records field-by-field existing/proposed delta, auth, scopes, idempotency, errors, terminal events and replay. No route inferred from an outdated SPEC is assumed real.
- **Frontend:** Use existing client and components; add only the feature-specific view/state required for this capability.
- **Electron:** No direct privileged API added; use scoped existing bridge for native needs, HTTP/SSE for domain operations.
- **Libraries:** use technology ownership table in master plan; installed version/active consumer must be checked before dependency changes.
- **Dependencies:** phase prerequisites in [roadmap](IMPLEMENTATION-ROADMAP.md); contracts before consumers; qualification before production use.
- **Security/recovery:** scoped actor/project authority checked by server; bounded inputs and timeouts; abort propagation; persisted effects reconciled before retry; credentials excluded from renderer/results. Feature-specific requirement: Restore validated backup on clean fixture; corrupted backup refused; rollback retains pre-upgrade data.
- **Tests:** existing `apps/server/tests/recoveryUnavailable.test.js` is a candidate, not a PASS; create focused acceptance at proposed `apps/server/tests/ip10-f21-acceptance.test.ts`, plus applicable desktop/UI tests.
- **Completion criterion:** Restore validated backup on clean fixture; corrupted backup refused; rollback retains pre-upgrade data; real UI/CLI journey where applicable and source-bound evidence.
- **Complexity:** Very high.
- **Tasks:** IP10-F21-C/B/U/V in [backlog](IMPLEMENTATION-TASK-BACKLOG.md).

## F22 — Desktop shell and security

- **Phase:** IP02; later qualification/consumer work follows the roadmap.
- **Current status:** SOURCE PRESENT / PARTIAL; canonical real workflow UNVERIFIED.
- **Functional requirements and missing work:** Preserve window.sirona bridge; qualify readiness, trusted senders, startup/shutdown and restart.
- **Backend/source owners:** `apps/desktop/src/main.cjs`, `apps/desktop/src/preload.cjs`, `apps/desktop/src/server.cjs`, `apps/desktop/src/terminalProxy.cjs`.
- **Database families:** `desktop_settings, auth_sessions`. These are source-level logical names; use IP00 schema inventory to distinguish declarations. Exact migration delta is UNKNOWN until C task and IP01 schema mapping; reuse before adding tables.
- **API/events/contracts:** preserve registered operations in the [route inventory](IP00-SOURCE-INVENTORY.md); C task records field-by-field existing/proposed delta, auth, scopes, idempotency, errors, terminal events and replay. No route inferred from an outdated SPEC is assumed real.
- **Frontend:** Use existing client and components; add only the feature-specific view/state required for this capability.
- **Electron:** Direct native/credential/lifecycle integration at listed desktop owners.
- **Libraries:** use technology ownership table in master plan; installed version/active consumer must be checked before dependency changes.
- **Dependencies:** phase prerequisites in [roadmap](IMPLEMENTATION-ROADMAP.md); contracts before consumers; qualification before production use.
- **Security/recovery:** scoped actor/project authority checked by server; bounded inputs and timeouts; abort propagation; persisted effects reconciled before retry; credentials excluded from renderer/results. Feature-specific requirement: Electron restart restores session; forged IPC rejected; backend crash visible; own child processes cleaned.
- **Tests:** existing `apps/server/tests/credentialBroker.test.js` is a candidate, not a PASS; create focused acceptance at proposed `apps/server/tests/ip02-f22-acceptance.test.ts`, plus applicable desktop/UI tests.
- **Completion criterion:** Electron restart restores session; forged IPC rejected; backend crash visible; own child processes cleaned; real UI/CLI journey where applicable and source-bound evidence.
- **Complexity:** High.
- **Tasks:** IP02-F22-C/B/U/V in [backlog](IMPLEMENTATION-TASK-BACKLOG.md).

## F23 — Frontend product surfaces

- **Phase:** IP09; later qualification/consumer work follows the roadmap.
- **Current status:** PARTIAL compact chat UI; full IDE integration not established.
- **Functional requirements and missing work:** Active UI is compact chat; client wrappers do not establish IDE views; add editor/terminal/plans/approvals/monitoring within approved design.
- **Backend/source owners:** `apps/web/src/App.tsx`, `apps/web/src/components/MainCanvas.tsx`, `apps/web/src/components/SettingsScreen.tsx`, `apps/web/src/api/sironaClient.ts`, `apps/web/src/api/useSirona.ts`.
- **Database families:** `No new UI-owned tables; domain state through API`. These are source-level logical names; use IP00 schema inventory to distinguish declarations. Exact migration delta is UNKNOWN until C task and IP01 schema mapping; reuse before adding tables.
- **API/events/contracts:** preserve registered operations in the [route inventory](IP00-SOURCE-INVENTORY.md); C task records field-by-field existing/proposed delta, auth, scopes, idempotency, errors, terminal events and replay. No route inferred from an outdated SPEC is assumed real.
- **Frontend:** Use existing client and components; add only the feature-specific view/state required for this capability.
- **Electron:** No direct privileged API added; use scoped existing bridge for native needs, HTTP/SSE for domain operations.
- **Libraries:** use technology ownership table in master plan; installed version/active consumer must be checked before dependency changes.
- **Dependencies:** phase prerequisites in [roadmap](IMPLEMENTATION-ROADMAP.md); contracts before consumers; qualification before production use.
- **Security/recovery:** scoped actor/project authority checked by server; bounded inputs and timeouts; abort propagation; persisted effects reconciled before retry; credentials excluded from renderer/results. Feature-specific requirement: Every visible action hits canonical API; offline/loading/empty/error/cancel states; no hardcoded workspace/model treated as real.
- **Tests:** existing `apps/server/tests/frontendWorkspace.test.ts` is a candidate, not a PASS; create focused acceptance at proposed `apps/server/tests/ip09-f23-acceptance.test.ts`, plus applicable desktop/UI tests.
- **Completion criterion:** Every visible action hits canonical API; offline/loading/empty/error/cancel states; no hardcoded workspace/model treated as real; real UI/CLI journey where applicable and source-bound evidence.
- **Complexity:** Very high.
- **Tasks:** IP09-F23-C/B/U/V in [backlog](IMPLEMENTATION-TASK-BACKLOG.md).

## F24 — CLI and headless consumers

- **Phase:** IP09; later qualification/consumer work follows the roadmap.
- **Current status:** PARTIAL diagnostics-only command entry.
- **Functional requirements and missing work:** Current status/read-only TUI only; add authenticated project/session/run commands using same gateway.
- **Backend/source owners:** `apps/cli/src/cli.ts`, `apps/cli/src/health.ts`, `apps/cli/src/lsp.ts`.
- **Database families:** `No direct database ownership`. These are source-level logical names; use IP00 schema inventory to distinguish declarations. Exact migration delta is UNKNOWN until C task and IP01 schema mapping; reuse before adding tables.
- **API/events/contracts:** preserve registered operations in the [route inventory](IP00-SOURCE-INVENTORY.md); C task records field-by-field existing/proposed delta, auth, scopes, idempotency, errors, terminal events and replay. No route inferred from an outdated SPEC is assumed real.
- **Frontend:** Use existing client and components; add only the feature-specific view/state required for this capability.
- **Electron:** No direct privileged API added; use scoped existing bridge for native needs, HTTP/SSE for domain operations.
- **Libraries:** use technology ownership table in master plan; installed version/active consumer must be checked before dependency changes.
- **Dependencies:** phase prerequisites in [roadmap](IMPLEMENTATION-ROADMAP.md); contracts before consumers; qualification before production use.
- **Security/recovery:** scoped actor/project authority checked by server; bounded inputs and timeouts; abort propagation; persisted effects reconciled before retry; credentials excluded from renderer/results. Feature-specific requirement: Noninteractive mutations require explicit authority; stable exit codes; cancellation propagated; no direct DB bypass.
- **Tests:** existing `apps/server/tests/cli.test.js` is a candidate, not a PASS; create focused acceptance at proposed `apps/server/tests/ip09-f24-acceptance.test.ts`, plus applicable desktop/UI tests.
- **Completion criterion:** Noninteractive mutations require explicit authority; stable exit codes; cancellation propagated; no direct DB bypass; real UI/CLI journey where applicable and source-bound evidence.
- **Complexity:** High.
- **Tasks:** IP09-F24-C/B/U/V in [backlog](IMPLEMENTATION-TASK-BACKLOG.md).

