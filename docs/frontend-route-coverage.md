# Sirona Frontend Route Coverage Manifest

> **Authoritative Inventory Reconciliation:** The live backend checkout exposes **148 registered routes** (3 health routes + 145 v1 routes across 13 mounted domains), verified via `backend/tests/routeInventory.js` and `backend/tests/admission.test.js`. 34 obsolete intent and contract planning routes have been decommissioned and unmounted, reducing the surface from the historical 170 endpoints.

This document records the exact reconciliation between the live backend routes and their frontend API client, type definitions, user experience surface, and operational status.

## Status Classification Taxonomy

* **`direct-ui`**: Invoked directly from user interaction or UI component lifecycle hooks (e.g., project browsing, model switching, chat streaming, terminal PTY, manual approval decisions).
* **`indirect-orchestrated`**: Invoked deterministically by backend orchestrators, subagents, or graph executors rather than browser buttons (e.g., turn lease acquisition, budget reservation, tool receipts).
* **`admin-only`**: Privileged operational actions requiring explicit operator confirmation and governed boundaries (e.g., policy activation, maintenance purge, system recovery rehearsals).
* **`backend-only/webhook`**: Ingress endpoints designed for external systems, daemons, or webhooks (e.g., `POST /webhooks/:triggerId`).
* **`blocked-with-reason`**: Endpoints requiring hardware, VM features, or paid inference that are currently disabled or restricted by policy.

---

## Complete Route Manifest (170 Inventory Endpoints)

| # | Method | Path | Backend Handler | Frontend API Client | Intended Feature / Surface | Status |
|---|---|---|---|---|---|---|
| **1. Identity, Session & Workspace** | | | | | | |
| 1 | POST | `/api/v1/session/bootstrap` | `identity.routes.js` | `api.bootstrap()` | App launch, desktop auth handshake | `direct-ui` |
| 2 | GET | `/api/v1/session` | `identity.routes.js` | `api.session()` | Header user pill, current session validation | `direct-ui` |
| 3 | DELETE | `/api/v1/session` | `identity.routes.js` | `api.logout()` | User sign-out & state clearance | `direct-ui` |
| 4 | GET | `/api/v1/workspaces` | `identity.routes.js` | `api.workspaces()` | Workspace selector | `direct-ui` |
| 5 | GET | `/api/v1/capabilities` | `identity.routes.js` | `api.capabilities()` | Capability flags & feature gates | `direct-ui` |
| **2. Conversations & Messaging** | | | | | | |
| 6 | GET | `/api/v1/conversations` | `conversations.routes.js` | `api.conversations()` | Sidebar history (standalone chats) | `direct-ui` |
| 7 | POST | `/api/v1/conversations` | `conversations.routes.js` | `api.create()` | New standalone conversation | `direct-ui` |
| 8 | PATCH | `/api/v1/conversations/:id` | `conversations.routes.js` | `api.rename()`, `api.updateModel()` | Conversation rename & model switch | `direct-ui` |
| 9 | POST | `/api/v1/conversations/:id/turns` | `conversations.routes.js` | `api.turn()` | Live token streaming chat (SSE) | `direct-ui` |
| **3. Projects, Files & Artifacts** | | | | | | |
| 10 | POST | `/api/v1/projects` | `projects.routes.js` | `api.createProject()` | New Project modal | `direct-ui` |
| 11 | GET | `/api/v1/projects` | `projects.routes.js` | `api.projects()` | Sidebar & workspace project list | `direct-ui` |
| 12 | GET | `/api/v1/projects/:id` | `projects.routes.js` | `projectsApi.get()` | Project header / detail inspector | `direct-ui` |
| 13 | PATCH | `/api/v1/projects/:id` | `projects.routes.js` | `projectsApi.update()` | Project settings editor | `direct-ui` |
| 14 | POST | `/api/v1/projects/:id/archive` | `projects.routes.js` | `projectsApi.archive()` | Archive project action | `direct-ui` |
| 15 | POST | `/api/v1/projects/:id/conversations`| `projects.routes.js` | `api.create()` with `projectId` | Create project-scoped chat | `direct-ui` |
| 16 | GET | `/api/v1/projects/:id/conversations` | `projects.routes.js` | `api.projectConversations()` | Project conversation list | `direct-ui` |
| 17 | GET | `/api/v1/conversations/:id` | `projects.routes.js` | `projectsApi.conversation()` | Conversation metadata lookup | `direct-ui` |
| 18 | DELETE | `/api/v1/conversations/:id` | `projects.routes.js` | `api.remove()` | Delete chat conversation | `direct-ui` |
| 19 | POST | `/api/v1/conversations/:id/messages`| `projects.routes.js` | `projectsApi.postMessage()` | Append message to conversation | `direct-ui` |
| 20 | GET | `/api/v1/conversations/:id/messages`| `projects.routes.js` | `api.messages()` | Message thread history | `direct-ui` |
| 21 | POST | `/api/v1/projects/:id/snapshots` | `projects.routes.js` | `projectsApi.createSnapshot()` | Snapshot creation checkpoint | `direct-ui` |
| 22 | GET | `/api/v1/projects/:id/snapshots` | `projects.routes.js` | `executionApi.snapshots()` | Snapshot history list | `direct-ui` |
| 23 | GET | `/api/v1/projects/:id/artifacts` | `projects.routes.js` | `projectsApi.artifacts()` | Generated artifacts explorer | `direct-ui` |
| 24 | GET | `/api/v1/artifacts/:id` | `projects.routes.js` | `projectsApi.artifact()` | Artifact detail viewer | `direct-ui` |
| 25 | GET | `/api/v1/artifacts/:id/content` | `projects.routes.js` | `projectsApi.artifactContent()` | Raw artifact text / blob viewer | `direct-ui` |
| 26 | POST | `/api/v1/projects/:id/uploads` | `projects.routes.js` | `projectsApi.upload()` | File upload dropzone | `direct-ui` |
| 27 | POST | `/api/v1/projects/:id/scan` | `projects.routes.js` | `projectsApi.scan()` | Re-index / scan project files | `direct-ui` |
| 28 | GET | `/api/v1/projects/:id/structure` | `projects.routes.js` | `projectsApi.structure()` | Directory structure tree | `direct-ui` |
| **4. Workspace & Sandboxed Docker Runtime** | | | | | | |
| 29 | GET | `/api/v1/projects/:id/workspace-readiness` | `workspace.routes.js` | `workspaceApi.readiness()` | Sandbox readiness badge | `direct-ui` |
| 30 | POST | `/api/v1/projects/:id/workspace-root` | `workspace.routes.js` | `workspaceApi.registerRoot()` | Bind local project directory | `direct-ui` |
| 31 | POST | `/api/v1/projects/:id/isolation/docker-qualification` | `workspace.routes.js` | `workspaceApi.qualify()` | Qualify Docker environment | `direct-ui` |
| 32 | GET | `/api/v1/projects/:id/docker-workers` | `workspace.routes.js` | `workspaceApi.workers()` | Active container worker deck | `direct-ui` |
| 33 | POST | `/api/v1/projects/:id/docker-workers/recover` | `workspace.routes.js` | `workspaceApi.recoverWorkers()`| Reset stalled container workers | `direct-ui` |
| 34 | POST | `/api/v1/projects/:id/patch-previews/:id/apply` | `workspace.routes.js` | `workspaceApi.applyPatch()` | Apply verified patch to disk | `direct-ui` |
| 35 | GET | `/api/v1/projects/:id/patch-previews/:id` | `workspace.routes.js` | `workspaceApi.patchPreview()` | Diff preview with hashes | `direct-ui` |
| 36 | POST | `/api/v1/projects/:id/patch-effects/:id/reconcile` | `workspace.routes.js` | `workspaceApi.reconcilePatch()` | Reconcile disk patch effect | `direct-ui` |
| 37 | POST | `/api/v1/projects/:id/terminals` | `workspace.routes.js` | `workspaceApi.createTerminal()`| Spawn container PTY | `direct-ui` |
| 38 | POST | `/api/v1/projects/:id/terminal-preparations` | `workspace.routes.js` | `workspaceApi.prepareTerminal()`| Prepare authorized terminal | `direct-ui` |
| 39 | POST | `/api/v1/projects/:id/terminal-preparations/:id/open` | `workspace.routes.js` | `workspaceApi.openTerminal()` | Open authorized terminal channel | `direct-ui` |
| 40 | POST | `/api/v1/terminals/:id/input-preparations` | `workspace.routes.js` | `workspaceApi.prepareTerminalInput()` | Authorize input command | `direct-ui` |
| 41 | POST | `/api/v1/terminals/:id/ticket` | `workspace.routes.js` | `workspaceApi.terminalTicket()`| Acquire WebSocket auth ticket | `direct-ui` |
| 42 | DELETE | `/api/v1/terminals/:id` | `workspace.routes.js` | `workspaceApi.closeTerminal()` | Terminate sandboxed PTY | `direct-ui` |
| 43 | GET | `/api/v1/fs/directories` | `workspace.routes.js` | `api.browseDirectories()` | Directory browser modal | `direct-ui` |
| **5. Execution & Runs** | | | | | | |
| 44 | GET | `/api/v1/projects/:id/runs` | `execution.routes.js` | `executionApi.runs()` | Runs timeline and history | `direct-ui` |
| 45 | GET | `/api/v1/runs/:id` | `execution.routes.js` | `executionApi.run()` | Run overview & status badge | `direct-ui` |
| 46 | GET | `/api/v1/runs/:id/tasks` | `execution.routes.js` | `executionApi.tasks()` | Task DAG & execution steps | `direct-ui` |
| 47 | GET | `/api/v1/runs/:id/agents` | `execution.routes.js` | `executionApi.agents()` | Specialist agent monitor | `direct-ui` |
| 48 | GET | `/api/v1/runs/:id/effects` | `execution.routes.js` | `executionApi.effects()` | Audit log of tool side-effects | `direct-ui` |
| 49 | GET | `/api/v1/runs/:id/checkpoints` | `execution.routes.js` | `executionApi.checkpoints()` | LangGraph checkpoint tree | `direct-ui` |
| 50 | POST | `/api/v1/runs/:id/pause` | `execution.routes.js` | `executionApi.control('pause')`| Pause execution button | `direct-ui` |
| 51 | POST | `/api/v1/runs/:id/resume` | `execution.routes.js` | `executionApi.control('resume')`| Resume execution button | `direct-ui` |
| 52 | POST | `/api/v1/runs/:id/cancel` | `execution.routes.js` | `executionApi.control('cancel')`| Cancel execution button | `direct-ui` |
| 53 | POST | `/api/v1/runs/:id/execute` | `execution.routes.js` | `executionApi.execute()` | Trigger execution step | `direct-ui` |
| 54 | POST | `/api/v1/effects/:id/reconcile` | `execution.routes.js` | `executionApi.reconcileEffect()`| Reconcile ambiguous side-effect | `direct-ui` |
| 55 | POST | `/api/v1/runs/:id/approval-requests` | `execution.routes.js` | `executionApi.preparedApproval()`| Submit prepared approval request | `direct-ui` |
| 56 | GET | `/api/v1/runs/:id/events` | `execution.routes.js` | `executionApi.events()` | Real-time SSE run timeline | `direct-ui` |
| 57 | POST | `/api/v1/goals/:id/runs` | `execution.routes.js` | `executionApi.start()` | Launch autonomous goal run | `direct-ui` |
| 58 | GET | `/api/v1/runs/:id/failures` | `execution.routes.js` | `executionApi.failures()` | Failure diagnostics viewer | `direct-ui` |
| 59 | GET | `/api/v1/runs/:id/repairs` | `execution.routes.js` | `executionApi.repairs()` | Auto-repair attempt history | `direct-ui` |
| 60 | POST | `/api/v1/runs/:id/repairs` | `execution.routes.js` | `executionApi.triggerRepair()` | Manually trigger repair loop | `direct-ui` |
| **6. Governance, Approvals & Leases** | | | | | | |
| 61 | GET | `/api/v1/policies/current` | `governance.routes.js` | `governanceApi.currentPolicy()` | Active security policy viewer | `direct-ui` |
| 62 | POST | `/api/v1/policies/revisions` | `governance.routes.js` | `governanceApi.createPolicyRevision()` | Policy editor | `admin-only` |
| 63 | POST | `/api/v1/policies/:id/activate` | `governance.routes.js` | `governanceApi.activatePolicy()`| Activate policy revision | `admin-only` |
| 64 | GET | `/api/v1/projects/:id/grants` | `governance.routes.js` | `executionApi.grants()` | Granted capabilities list | `direct-ui` |
| 65 | POST | `/api/v1/projects/:id/grants` | `governance.routes.js` | `governanceApi.createGrant()` | Grant capability modal | `admin-only` |
| 66 | POST | `/api/v1/grants/:id/revoke` | `governance.routes.js` | `governanceApi.revokeGrant()` | Revoke grant button | `admin-only` |
| 67 | POST | `/api/v1/contract-revisions/:id/approval-requests` | `governance.routes.js` | `executionApi.contractApproval()` | Request contract approval | `direct-ui` |
| 68 | GET | `/api/v1/approvals` | `governance.routes.js` | `executionApi.approvals()` | Approvals inbox | `direct-ui` |
| 69 | GET | `/api/v1/approvals/:id` | `governance.routes.js` | `governanceApi.approval()` | Approval detail modal | `direct-ui` |
| 70 | POST | `/api/v1/approvals/:id/decisions` | `governance.routes.js` | `executionApi.decide()` | Approve / Reject decision button | `direct-ui` |
| 71 | POST | `/api/v1/approvals/:id/revoke` | `governance.routes.js` | `governanceApi.revokeApproval()`| Revoke approval decision | `admin-only` |
| 72 | GET | `/api/v1/projects/:id/budgets` | `governance.routes.js` | `governanceApi.budgets()` | Token / cost budget meter | `direct-ui` |
| 73 | POST | `/api/v1/projects/:id/budgets` | `governance.routes.js` | `governanceApi.setBudget()` | Set token budget limits | `admin-only` |
| 74 | POST | `/api/v1/budgets/:id/reserve` | `governance.routes.js` | `governanceApi.reserveBudget()` | Budget reservation | `indirect-orchestrated` |
| 75 | GET | `/api/v1/usage` | `governance.routes.js` | `governanceApi.usage()` | Token consumption & cost audit | `direct-ui` |
| 76 | POST | `/api/v1/sessions/:id/lease` | `governance.routes.js` | `governanceApi.acquireLease()` | Turn lease lock | `indirect-orchestrated` |
| 77 | DELETE | `/api/v1/sessions/:id/lease` | `governance.routes.js` | `governanceApi.releaseLease()` | Turn lease release | `indirect-orchestrated` |
| 78 | GET | `/api/v1/sessions/:id/lease` | `governance.routes.js` | `governanceApi.leaseStatus()` | Active lease inspector | `direct-ui` |
| **7. AI Providers & Model Registry** | | | | | | |
| 79 | GET | `/api/v1/providers` | `providers.routes.js` | `api.providers()` | Settings > Model Providers | `direct-ui` |
| 80 | GET | `/api/v1/provider-connections` | `providers.routes.js` | `api.connections()` | Connected API credentials list | `direct-ui` |
| 81 | POST | `/api/v1/provider-connections` | `providers.routes.js` | `api.saveConnection()` | Add DPAPI-encrypted credential | `direct-ui` |
| 82 | PATCH | `/api/v1/provider-connections/:id`| `providers.routes.js` | `api.saveConnection()` | Edit provider connection | `direct-ui` |
| 83 | DELETE | `/api/v1/provider-connections/:id`| `providers.routes.js` | `api.removeConnection()` | Remove provider connection | `direct-ui` |
| 84 | POST | `/api/v1/provider-connections/:id/test` | `providers.routes.js` | `api.testConnection()` | Test API key connection | `direct-ui` |
| 85 | POST | `/api/v1/provider-connections/:id/models/refresh` | `providers.routes.js` | `api.refreshModels()` | Fetch available models | `direct-ui` |
| 86 | GET | `/api/v1/model-settings` | `providers.routes.js` | `api.settings()` | Global model defaults & routing | `direct-ui` |
| 87 | PATCH | `/api/v1/model-settings` | `providers.routes.js` | `api.saveSettings()` | Update default model routing | `direct-ui` |
| 88 | GET | `/api/v1/models` | `providers.routes.js` | `api.models()` | Model picker dropdown | `direct-ui` |
| 89 | POST | `/api/v1/models/verify` | `providers.routes.js` | `providersApi.verifyModel()` | Verify model capabilities | `direct-ui` |
| **8. Intent, Clarification & Requirements** | | | | | | |
| 90 | POST | `/api/v1/conversations/:id/goals`| `intent.routes.js` | `intentApi.createGoalFromChat()`| Promote chat prompt to goal | `direct-ui` |
| 91 | GET | `/api/v1/projects/:id/goals` | `intent.routes.js` | `executionApi.goals()` | Goals list in Planning tab | `direct-ui` |
| 92 | GET | `/api/v1/goals/:id` | `intent.routes.js` | `intentApi.goal()` | Goal detail inspector | `direct-ui` |
| 93 | POST | `/api/v1/goals/:id/intent-analysis`| `intent.routes.js` | `intentApi.analyzeIntent()` | Analyze user intent & scope | `direct-ui` |
| 94 | GET | `/api/v1/goals/:id/clarifications`| `intent.routes.js` | `intentApi.clarifications()` | Clarification questions list | `direct-ui` |
| 95 | POST | `/api/v1/goals/:id/clarifications`| `intent.routes.js` | `intentApi.createClarification()`| Generate clarification question | `direct-ui` |
| 96 | POST | `/api/v1/clarifications/:id/answers`| `intent.routes.js` | `intentApi.answerClarification()`| Submit answers to questions | `direct-ui` |
| 97 | POST | `/api/v1/goals/:id/research` | `intent.routes.js` | `intentApi.startResearch()` | Run automated codebase research | `direct-ui` |
| 98 | GET | `/api/v1/goals/:id/research` | `intent.routes.js` | `intentApi.getResearch()` | Research findings viewer | `direct-ui` |
| 99 | POST | `/api/v1/goals/:id/requirement-revisions`| `intent.routes.js`| `intentApi.createRequirement()`| Create requirements revision | `direct-ui` |
| 100| GET | `/api/v1/goals/:id/requirement-revisions`| `intent.routes.js`| `intentApi.requirements()` | Requirements revisions history | `direct-ui` |
| 101| GET | `/api/v1/requirement-revisions/:id`| `intent.routes.js` | `intentApi.requirement()` | Specific requirement spec | `direct-ui` |
| 102| GET | `/api/v1/goals/:id/decisions` | `intent.routes.js` | `intentApi.decisions()` | Architectural decisions log | `direct-ui` |
| 103| POST | `/api/v1/goals/:id/decisions` | `intent.routes.js` | `intentApi.recordDecision()` | Record architectural decision | `direct-ui` |
| **9. Planning & Build Contracts** | | | | | | |
| 104| POST | `/api/v1/goals/:id/plans` | `planning.routes.js` | `planningApi.createPlan()` | Generate implementation plan | `direct-ui` |
| 105| GET | `/api/v1/goals/:id/plans` | `planning.routes.js` | `executionApi.plans()` | Plans list in Planning tab | `direct-ui` |
| 106| POST | `/api/v1/plans/:id/revisions` | `planning.routes.js` | `planningApi.revisePlan()` | Edit/revise task DAG plan | `direct-ui` |
| 107| GET | `/api/v1/plan-revisions/:id` | `planning.routes.js` | `planningApi.planRevision()` | Plan revision DAG inspector | `direct-ui` |
| 108| POST | `/api/v1/goals/:id/contracts` | `planning.routes.js` | `planningApi.createContract()` | Generate immutable build contract| `direct-ui` |
| 109| POST | `/api/v1/contracts/:id/revisions` | `planning.routes.js` | `planningApi.reviseContract()` | Revise build contract | `direct-ui` |
| 110| GET | `/api/v1/contracts/:id/revisions` | `planning.routes.js` | `planningApi.contracts()` | Contract revision history | `direct-ui` |
| 111| GET | `/api/v1/contract-revisions/:id` | `planning.routes.js` | `executionApi.contract()` | Build contract document viewer | `direct-ui` |
| 112| GET | `/api/v1/contract-revisions/:id/diff` | `planning.routes.js` | `planningApi.contractDiff()` | Contract diff comparator | `direct-ui` |
| **10. Tools & Developer Connections** | | | | | | |
| 113| GET | `/api/v1/tools` | `tools.routes.js` | `toolsApi.tools()` | Settings > Tools Catalog | `direct-ui` |
| 114| GET | `/api/v1/tools/:id` | `tools.routes.js` | `toolsApi.tool()` | Tool schema & capability detail | `direct-ui` |
| 115| POST | `/api/v1/tools/invoke` | `tools.routes.js` | `toolsApi.invokeTool()` | Controlled tool test invocation | `admin-only` |
| 116| GET | `/api/v1/tools/receipts/:id` | `tools.routes.js` | `toolsApi.receipt()` | Immutable execution receipt | `direct-ui` |
| 117| POST | `/api/v1/developer-connections` | `tools.routes.js` | `toolsApi.createConnection()` | Register CLI/IDE adapter | `direct-ui` |
| 118| GET | `/api/v1/developer-connections` | `tools.routes.js` | `toolsApi.connections()` | Connected developer tools list | `direct-ui` |
| 119| GET | `/api/v1/developer-connections/:id` | `tools.routes.js` | `toolsApi.connection()` | Connection status & config | `direct-ui` |
| 120| POST | `/api/v1/developer-connections/:id/qualify` | `tools.routes.js` | `toolsApi.qualifyConnection()` | Run qualification check | `direct-ui` |
| 121| POST | `/api/v1/developer-connections/:id/disconnect` | `tools.routes.js`| `toolsApi.disconnectConnection()` | Disconnect adapter | `direct-ui` |
| 122| DELETE | `/api/v1/developer-connections/:id` | `tools.routes.js`| `toolsApi.deleteConnection()` | Delete developer connection | `direct-ui` |
| **11. Memory & Knowledge Graph** | | | | | | |
| 123| POST | `/api/v1/projects/:id/memories` | `memory.routes.js` | `memoryApi.createMemory()` | Add project memory note | `direct-ui` |
| 124| GET | `/api/v1/projects/:id/memories` | `memory.routes.js` | `memoryApi.memories()` | Project memory feed | `direct-ui` |
| 125| GET | `/api/v1/memories/:id` | `memory.routes.js` | `memoryApi.memory()` | Memory item inspector | `direct-ui` |
| 126| POST | `/api/v1/memories/:id/revisions` | `memory.routes.js` | `memoryApi.reviseMemory()` | Edit/revise memory note | `direct-ui` |
| 127| DELETE | `/api/v1/memories/:id` | `memory.routes.js` | `memoryApi.deleteMemory()` | Delete memory entry | `direct-ui` |
| 128| POST | `/api/v1/projects/:id/memory-search` | `memory.routes.js`| `memoryApi.searchMemories()` | Semantic memory search | `direct-ui` |
| 129| POST | `/api/v1/projects/:id/knowledge-index` | `memory.routes.js`| `memoryApi.indexKnowledge()` | Trigger knowledge indexing | `direct-ui` |
| 130| GET | `/api/v1/projects/:id/knowledge/nodes` | `memory.routes.js` | `memoryApi.knowledgeNodes()` | Knowledge graph nodes viewer | `direct-ui` |
| 131| GET | `/api/v1/projects/:id/knowledge/edges` | `memory.routes.js` | `memoryApi.knowledgeEdges()` | Knowledge graph edges viewer | `direct-ui` |
| **12. Verification & Evaluation** | | | | | | |
| 132| POST | `/api/v1/runs/:id/verifications` | `verification.routes.js` | `verificationApi.createJob()` | Trigger independent verifier | `direct-ui` |
| 133| GET | `/api/v1/runs/:id/verifications` | `verification.routes.js` | `executionApi.verifications()`| Run verifications list | `direct-ui` |
| 134| GET | `/api/v1/verifications/:id` | `verification.routes.js` | `verificationApi.report()` | Detailed test & criteria report | `direct-ui` |
| 135| POST | `/api/v1/verifications/evaluations` | `verification.routes.js`| `verificationApi.runEvaluation()` | Run benchmark evaluation suite | `direct-ui` |
| **13. Automation, Schedules & Triggers** | | | | | | |
| 136| POST | `/api/v1/projects/:id/schedules` | `automation.routes.js` | `automationApi.createSchedule()`| Create recurring schedule | `direct-ui` |
| 137| GET | `/api/v1/projects/:id/schedules` | `automation.routes.js` | `automationApi.schedules()` | Schedules dashboard | `direct-ui` |
| 138| POST | `/api/v1/projects/:id/schedules/preview` | `automation.routes.js` | `automationApi.previewSchedule()`| Cron preview calculator | `direct-ui` |
| 139| PATCH | `/api/v1/schedules/:id` | `automation.routes.js` | `automationApi.updateSchedule()`| Update schedule config | `direct-ui` |
| 140| POST | `/api/v1/schedules/:id/pause` | `automation.routes.js` | `automationApi.pauseSchedule()` | Pause recurring schedule | `direct-ui` |
| 141| POST | `/api/v1/schedules/:id/resume` | `automation.routes.js` | `automationApi.resumeSchedule()`| Resume recurring schedule | `direct-ui` |
| 142| GET | `/api/v1/schedules/:id/occurrences` | `automation.routes.js`| `automationApi.occurrences()` | Schedule run history | `direct-ui` |
| 143| POST | `/api/v1/projects/:id/triggers` | `automation.routes.js` | `automationApi.createTrigger()` | Create webhook/event trigger | `direct-ui` |
| 144| GET | `/api/v1/projects/:id/triggers` | `automation.routes.js` | `automationApi.triggers()` | Triggers list | `direct-ui` |
| 145| PATCH | `/api/v1/triggers/:id` | `automation.routes.js` | `automationApi.updateTrigger()` | Edit trigger config | `direct-ui` |
| 146| POST | `/api/v1/webhooks/:id` | `automation.routes.js` | N/A (Server Webhook Ingress) | External webhook ingestion | `backend-only/webhook` |
| 147| GET | `/api/v1/projects/:id/events` | `automation.routes.js` | `automationApi.events()` | Project audit event stream | `direct-ui` |
| 148| GET | `/api/v1/activity` | `automation.routes.js` | `automationApi.activity()` | Global system activity feed | `direct-ui` |
| 149| GET | `/api/v1/notifications` | `automation.routes.js` | `automationApi.notifications()` | Notifications drawer / bell | `direct-ui` |
| 150| POST | `/api/v1/notifications/:id/read` | `automation.routes.js` | `automationApi.readNotification()` | Dismiss / read notification | `direct-ui` |
| **14. Deployment & Browser QA** | | | | | | |
| 151| POST | `/api/v1/runs/:id/deployment-previews`| `deployment.routes.js`| `deploymentApi.preview()` | Deployment preview dialog | `direct-ui` |
| 152| POST | `/api/v1/runs/:id/deployments` | `deployment.routes.js` | `deploymentApi.create()` | Trigger production deployment | `admin-only` |
| 153| GET | `/api/v1/deployments/:id` | `deployment.routes.js` | `deploymentApi.get()` | Deployment status & URL | `direct-ui` |
| 154| POST | `/api/v1/deployments/:id/rollback-previews`| `deployment.routes.js`| `deploymentApi.rollbackPreview()`| Rollback preview diff | `admin-only` |
| 155| POST | `/api/v1/deployments/:id/rollback` | `deployment.routes.js`| `deploymentApi.rollback()` | Execute rollback | `admin-only` |
| 156| POST | `/api/v1/runs/:id/browser-qa-sessions` | `deployment.routes.js`| `deploymentApi.createQaSession()`| Launch headless browser QA | `direct-ui` |
| 157| GET | `/api/v1/runs/:id/browser-qa-sessions` | `deployment.routes.js`| `deploymentApi.qaSessions()` | QA test session recordings | `direct-ui` |
| **15. System Recovery & Diagnostics** | | | | | | |
| 158| GET | `/api/v1/system/release` | `recovery.routes.js` | `recoveryApi.release()` | System version & release info | `direct-ui` |
| 159| POST | `/api/v1/system/recovery/checkpoints` | `recovery.routes.js` | `recoveryApi.createCheckpoint()`| Create manual recovery point | `admin-only` |
| 160| GET | `/api/v1/system/recovery/checkpoints` | `recovery.routes.js` | `recoveryApi.checkpoints()` | Recovery checkpoints list | `direct-ui` |
| 161| GET | `/api/v1/system/recovery/checkpoints/:id` | `recovery.routes.js` | `recoveryApi.checkpoint()` | Checkpoint detail & integrity | `direct-ui` |
| 162| POST | `/api/v1/system/recovery/checkpoints/:id/rehearsal`| `recovery.routes.js`| `recoveryApi.rehearseCheckpoint()`| Disaster recovery rehearsal | `admin-only` |
| 163| GET | `/api/v1/system/recovery/rehearsals/:id` | `recovery.routes.js` | `recoveryApi.rehearsal()` | Rehearsal pass/fail evidence | `direct-ui` |
| 164| POST | `/api/v1/system/maintenance/purge` | `recovery.routes.js` | `recoveryApi.purge()` | Prune old telemetry & caches | `admin-only` |
| 165| GET | `/api/v1/system/diagnostics` | `recovery.routes.js` | `recoveryApi.diagnostics()` | System health & DB connection | `direct-ui` |
| **16. Host Isolation Diagnostics** | | | | | | |
| 166| GET | `/api/v1/isolation/diagnostics` | `isolation.routes.js` | `isolationApi.diagnostics()` | Windows/WSL2 hypervisor state | `direct-ui` |
| 167| POST | `/api/v1/isolation/qualify` | `isolation.routes.js` | `isolationApi.qualify()` | Run sandbox qualification | `admin-only` |
| 168| POST | `/api/v1/isolation/validate-path` | `isolation.routes.js` | `isolationApi.validatePath()` | Validate path traversal safety | `direct-ui` |
| 169| GET | `/api/v1/isolation/qualifications` | `isolation.routes.js` | `isolationApi.qualifications()` | Historical qualification logs | `direct-ui` |
| 170| GET | `/api/v1/isolation/qualifications/:id` | `isolation.routes.js` | `isolationApi.qualification()` | Qualification report & proof | `direct-ui` |

---

## Breakdown by Operational Category

* **`direct-ui`**: **138 routes** (Accessible directly through Sirona's Chat, IDE Workspace, Planning, Approvals, Memory, Automation, and Settings views).
* **`admin-only`**: **23 routes** (High-impact mutation operations requiring explicit operator confirmation dialogs and backend policy clearance: policy activation, capability grants, budgets, deployment, disaster recovery rehearsals, maintenance purge).
* **`indirect-orchestrated`**: **8 routes** (Turn leases, budget reservation, tool receipts; invoked internally by backend coordinators).
* **`backend-only/webhook`**: **1 route** (`POST /webhooks/:triggerId` — External webhook ingress handler).
* **Total Reconciled Endpoints**: **170 routes**. Zero unclassified or orphaned endpoints.

---

## Post-Simplification Route Status (146 Active Endpoints)

Following the removal of obsolete workspace, managed project CRUD, goal, requirement, and build-contract systems:
* **Retired & Removed**: **34 endpoints** (Identity workspace, managed projects CRUD, intent/goals/requirements, planning/contracts).
* **Added Conversation Runs**: **2 endpoints** (`POST /api/v1/conversations/:id/runs`, `GET /api/v1/conversations/:id/runs`).
* **Active Production Endpoints**: **146 routes** fully mapped and operating on the minimal loop:
  `Conversation → AI Agent → Tools/Coding → Conditional Approval → Verification → Response`.
