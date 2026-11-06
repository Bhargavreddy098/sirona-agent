---
title: "Source Ownership Map"
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

# Source Ownership Map

Exact existing owners below are editable source paths. Runtime reachability and qualification remain separate. Shared contracts: `packages/contracts/src/api.ts`, `models.ts`, `execution.ts`, `events.ts`; existing schema/AI package ownership must be traced before reuse. UI normally calls `apps/web/src/api/sironaClient.ts`; desktop native actions use the existing preload bridge. No new backend architecture is authorized.

## F01 — Gateway and transport

| Existing source | Responsibility |
|---|---|
| `apps/server/app.js` | Domain owner or adapter; follow imports before introducing another owner |
| `apps/server/routes/index.js` | Transport/controller |
| `apps/server/middleware/sessionAuth.js` | Domain owner or adapter; follow imports before introducing another owner |

Candidate existing test: `apps/server/tests/boundary.test.js`. Proposed additional acceptance: `apps/server/tests/ip02-f01-acceptance.test.ts`. Future locations are proposals, not claims of existing files.

## F02 — Identity security and credentials

| Existing source | Responsibility |
|---|---|
| `apps/server/services/identityService.js` | Domain owner or adapter; follow imports before introducing another owner |
| `apps/desktop/src/security/credentialBroker.ts` | Consumer/native boundary |
| `apps/desktop/src/main.cjs` | Consumer/native boundary |

Candidate existing test: `apps/server/tests/credentialBroker.test.js`. Proposed additional acceptance: `apps/server/tests/ip02-f02-acceptance.test.ts`. Future locations are proposals, not claims of existing files.

## F03 — Sessions and persistence

| Existing source | Responsibility |
|---|---|
| `apps/server/config/db.js` | Domain owner or adapter; follow imports before introducing another owner |
| `apps/server/config/sqliteDb.js` | Domain owner or adapter; follow imports before introducing another owner |
| `apps/server/migrations/runMigrations.js` | Domain owner or adapter; follow imports before introducing another owner |
| `apps/server/routes/v1/conversations.routes.js` | Transport/controller |

Candidate existing test: `apps/server/tests/sqliteMigrations.test.js`. Proposed additional acceptance: `apps/server/tests/ip01-f03-acceptance.test.ts`. Future locations are proposals, not claims of existing files.

## F04 — Model providers

| Existing source | Responsibility |
|---|---|
| `apps/server/services/providerService.js` | Domain owner or adapter; follow imports before introducing another owner |
| `apps/server/services/aiService.js` | Domain owner or adapter; follow imports before introducing another owner |
| `apps/server/src/providers/aiSdkAdapter.ts` | Domain owner or adapter; follow imports before introducing another owner |
| `apps/server/src/providers/modelAdapter.ts` | Domain owner or adapter; follow imports before introducing another owner |

Candidate existing test: `apps/server/tests/providerParity.test.ts`. Proposed additional acceptance: `apps/server/tests/ip03-f04-acceptance.test.ts`. Future locations are proposals, not claims of existing files.

## F05 — Routing and budgets

| Existing source | Responsibility |
|---|---|
| `apps/server/services/providerService.js` | Domain owner or adapter; follow imports before introducing another owner |
| `apps/server/services/governanceService.js` | Domain owner or adapter; follow imports before introducing another owner |
| `apps/server/src/providers/credentialResolver.ts` | Domain owner or adapter; follow imports before introducing another owner |

Candidate existing test: `apps/server/tests/providerActivityBounds.test.ts`. Proposed additional acceptance: `apps/server/tests/ip03-f05-acceptance.test.ts`. Future locations are proposals, not claims of existing files.

## F06 — Intent research and requirements

| Existing source | Responsibility |
|---|---|
| `apps/server/services/intentRequirementService.js` | Domain owner or adapter; follow imports before introducing another owner |
| `apps/server/migrations/008_intent_research_requirements.sql` | Domain owner or adapter; follow imports before introducing another owner |

Candidate existing test: `apps/server/tests/intent.test.js`. Proposed additional acceptance: `apps/server/tests/ip05-f06-acceptance.test.ts`. Future locations are proposals, not claims of existing files.

## F07 — Planning and Build Contracts

| Existing source | Responsibility |
|---|---|
| `apps/server/services/workflowOrchestratorService.js` | Domain owner or adapter; follow imports before introducing another owner |
| `apps/server/services/executionService.js` | Domain owner or adapter; follow imports before introducing another owner |
| `apps/server/migrations/009_planning_contracts.sql` | Domain owner or adapter; follow imports before introducing another owner |

Candidate existing test: `apps/server/tests/planning.test.js`. Proposed additional acceptance: `apps/server/tests/ip05-f07-acceptance.test.ts`. Future locations are proposals, not claims of existing files.

## F08 — Approvals and governance

| Existing source | Responsibility |
|---|---|
| `apps/server/services/governanceService.js` | Domain owner or adapter; follow imports before introducing another owner |
| `apps/server/routes/v1/governance.routes.js` | Transport/controller |
| `apps/server/src/security/executionPolicy.ts` | Domain owner or adapter; follow imports before introducing another owner |

Candidate existing test: `apps/server/tests/governance.test.js`. Proposed additional acceptance: `apps/server/tests/ip04-f08-acceptance.test.ts`. Future locations are proposals, not claims of existing files.

## F09 — Runtime and durable recovery

| Existing source | Responsibility |
|---|---|
| `apps/server/services/conversationTurnCoordinator.js` | Domain owner or adapter; follow imports before introducing another owner |
| `apps/server/services/agentExecutionEngine.js` | Domain owner or adapter; follow imports before introducing another owner |
| `apps/server/services/executionService.js` | Domain owner or adapter; follow imports before introducing another owner |
| `apps/server/src/execution/effectJournal.ts` | Domain owner or adapter; follow imports before introducing another owner |
| `apps/server/src/execution/runEventStore.ts` | Domain owner or adapter; follow imports before introducing another owner |

Candidate existing test: `apps/server/tests/orchestrationCrash.test.ts`. Proposed additional acceptance: `apps/server/tests/ip06-f09-acceptance.test.ts`. Future locations are proposals, not claims of existing files.

## F10 — Specialists and independent review

| Existing source | Responsibility |
|---|---|
| `apps/server/src/orchestration/workspaceGraph.ts` | Domain owner or adapter; follow imports before introducing another owner |
| `apps/server/src/orchestration/delegationService.ts` | Domain owner or adapter; follow imports before introducing another owner |
| `apps/server/src/orchestration/activityAdapter.ts` | Domain owner or adapter; follow imports before introducing another owner |
| `apps/server/src/orchestration/graphRuntime.ts` | Domain owner or adapter; follow imports before introducing another owner |

Candidate existing test: `apps/server/tests/delegationPolicy.test.ts`. Proposed additional acceptance: `apps/server/tests/ip08-f10-acceptance.test.ts`. Future locations are proposals, not claims of existing files.

## F11 — Workspace Git and artifacts

| Existing source | Responsibility |
|---|---|
| `apps/server/services/workspacePathResolver.js` | Domain owner or adapter; follow imports before introducing another owner |
| `apps/server/src/workspace/workspaceBroker.ts` | Domain owner or adapter; follow imports before introducing another owner |
| `apps/server/src/workspace/patchService.ts` | Domain owner or adapter; follow imports before introducing another owner |
| `apps/server/src/tools/gitAdapter.ts` | Domain owner or adapter; follow imports before introducing another owner |

Candidate existing test: `apps/server/tests/nativePatch.test.ts`. Proposed additional acceptance: `apps/server/tests/ip04-f11-acceptance.test.ts`. Future locations are proposals, not claims of existing files.

## F12 — Tool runtime and sandbox

| Existing source | Responsibility |
|---|---|
| `apps/server/services/toolRuntimeService.js` | Domain owner or adapter; follow imports before introducing another owner |
| `apps/server/services/sandboxManager.js` | Domain owner or adapter; follow imports before introducing another owner |
| `apps/server/src/windows/dockerRuntime.ts` | Domain owner or adapter; follow imports before introducing another owner |
| `apps/server/src/windows/canonicalTerminal.ts` | Domain owner or adapter; follow imports before introducing another owner |
| `apps/cli/docker/tools-worker.Dockerfile` | Consumer/native boundary |

Candidate existing test: `apps/server/tests/dockerContainment.integration.test.ts`. Proposed additional acceptance: `apps/server/tests/ip04-f12-acceptance.test.ts`. Future locations are proposals, not claims of existing files.

## F13 — MCP and code intelligence

| Existing source | Responsibility |
|---|---|
| `apps/server/src/tools/mcpAdapter.ts` | Domain owner or adapter; follow imports before introducing another owner |
| `apps/server/src/tools/searchAdapter.ts` | Domain owner or adapter; follow imports before introducing another owner |
| `apps/server/src/tools/lspAdapter.ts` | Domain owner or adapter; follow imports before introducing another owner |
| `apps/server/src/context/parserWorker.ts` | Domain owner or adapter; follow imports before introducing another owner |
| `apps/cli/src/guest/agent.ts` | Consumer/native boundary |

Candidate existing test: `apps/server/tests/p6CanonicalJourney.test.ts`. Proposed additional acceptance: `apps/server/tests/ip07-f13-acceptance.test.ts`. Future locations are proposals, not claims of existing files.

## F14 — Context memory and skills

| Existing source | Responsibility |
|---|---|
| `apps/server/services/contextEngineService.js` | Domain owner or adapter; follow imports before introducing another owner |
| `apps/server/services/memoryService.js` | Domain owner or adapter; follow imports before introducing another owner |
| `apps/server/src/context/contextAssembler.ts` | Domain owner or adapter; follow imports before introducing another owner |
| `apps/server/src/context/projectIndex.ts` | Domain owner or adapter; follow imports before introducing another owner |

Candidate existing test: `apps/server/tests/contextIsolation.test.ts`. Proposed additional acceptance: `apps/server/tests/ip07-f14-acceptance.test.ts`. Future locations are proposals, not claims of existing files.

## F15 — Verification and quality

| Existing source | Responsibility |
|---|---|
| `apps/server/services/verificationService.js` | Domain owner or adapter; follow imports before introducing another owner |
| `apps/server/routes/v1/verification.routes.js` | Transport/controller |
| `apps/server/services/agentWorkerService.js` | Domain owner or adapter; follow imports before introducing another owner |

Candidate existing test: `apps/server/tests/verification.test.js`. Proposed additional acceptance: `apps/server/tests/ip06-f15-acceptance.test.ts`. Future locations are proposals, not claims of existing files.

## F16 — External worker adapters

| Existing source | Responsibility |
|---|---|
| `apps/server/services/agentWorkerService.js` | Domain owner or adapter; follow imports before introducing another owner |
| `apps/server/routes/v1/tools.routes.js` | Transport/controller |
| `apps/server/src/tools/guestTransport.ts` | Domain owner or adapter; follow imports before introducing another owner |

Candidate existing test: `apps/server/tests/runner.test.js`. Proposed additional acceptance: `apps/server/tests/ip12-f16-acceptance.test.ts`. Future locations are proposals, not claims of existing files.

## F17 — Scheduling events notifications

| Existing source | Responsibility |
|---|---|
| `apps/server/services/automationService.js` | Domain owner or adapter; follow imports before introducing another owner |
| `apps/server/services/notificationDispatcher.js` | Domain owner or adapter; follow imports before introducing another owner |
| `apps/server/routes/v1/automation.routes.js` | Transport/controller |

Candidate existing test: `apps/server/tests/schedules.test.js`. Proposed additional acceptance: `apps/server/tests/ip11-f17-acceptance.test.ts`. Future locations are proposals, not claims of existing files.

## F18 — Browser and computer runtime

| Existing source | Responsibility |
|---|---|
| `apps/server/services/deploymentService.js` | Domain owner or adapter; follow imports before introducing another owner |
| `apps/server/routes/v1/deployment.routes.js` | Transport/controller |

Candidate existing test: `apps/server/tests/deployments.test.js`. Proposed additional acceptance: `apps/server/tests/ip12-f18-acceptance.test.ts`. Future locations are proposals, not claims of existing files.

## F19 — Deployment and integrations

| Existing source | Responsibility |
|---|---|
| `apps/server/services/deploymentService.js` | Domain owner or adapter; follow imports before introducing another owner |
| `apps/server/routes/v1/deployment.routes.js` | Transport/controller |

Candidate existing test: `apps/server/tests/deployments.test.js`. Proposed additional acceptance: `apps/server/tests/ip13-f19-acceptance.test.ts`. Future locations are proposals, not claims of existing files.

## F20 — Observability and evaluations

| Existing source | Responsibility |
|---|---|
| `apps/server/foundation/logger.js` | Domain owner or adapter; follow imports before introducing another owner |
| `apps/server/services/auditLogger.js` | Domain owner or adapter; follow imports before introducing another owner |
| `apps/server/services/releaseRecoveryService.js` | Domain owner or adapter; follow imports before introducing another owner |

Candidate existing test: `apps/server/tests/productionHardening.test.js`. Proposed additional acceptance: `apps/server/tests/ip01-f20-acceptance.test.ts`. Future locations are proposals, not claims of existing files.

## F21 — Release backup and recovery

| Existing source | Responsibility |
|---|---|
| `apps/server/services/releaseRecoveryService.js` | Domain owner or adapter; follow imports before introducing another owner |
| `apps/server/routes/v1/recovery.routes.js` | Transport/controller |
| `apps/desktop/package.json` | Consumer/native boundary |

Candidate existing test: `apps/server/tests/recoveryUnavailable.test.js`. Proposed additional acceptance: `apps/server/tests/ip10-f21-acceptance.test.ts`. Future locations are proposals, not claims of existing files.

## F22 — Desktop shell and security

| Existing source | Responsibility |
|---|---|
| `apps/desktop/src/main.cjs` | Consumer/native boundary |
| `apps/desktop/src/preload.cjs` | Consumer/native boundary |
| `apps/desktop/src/server.cjs` | Consumer/native boundary |
| `apps/desktop/src/terminalProxy.cjs` | Consumer/native boundary |

Candidate existing test: `apps/server/tests/credentialBroker.test.js`. Proposed additional acceptance: `apps/server/tests/ip02-f22-acceptance.test.ts`. Future locations are proposals, not claims of existing files.

## F23 — Frontend product surfaces

| Existing source | Responsibility |
|---|---|
| `apps/web/src/App.tsx` | Consumer/native boundary |
| `apps/web/src/components/MainCanvas.tsx` | Consumer/native boundary |
| `apps/web/src/components/SettingsScreen.tsx` | Consumer/native boundary |
| `apps/web/src/api/sironaClient.ts` | Consumer/native boundary |
| `apps/web/src/api/useSirona.ts` | Consumer/native boundary |

Candidate existing test: `apps/server/tests/frontendWorkspace.test.ts`. Proposed additional acceptance: `apps/server/tests/ip09-f23-acceptance.test.ts`. Future locations are proposals, not claims of existing files.

## F24 — CLI and headless consumers

| Existing source | Responsibility |
|---|---|
| `apps/cli/src/cli.ts` | Consumer/native boundary |
| `apps/cli/src/health.ts` | Consumer/native boundary |
| `apps/cli/src/lsp.ts` | Consumer/native boundary |

Candidate existing test: `apps/server/tests/cli.test.js`. Proposed additional acceptance: `apps/server/tests/ip09-f24-acceptance.test.ts`. Future locations are proposals, not claims of existing files.

