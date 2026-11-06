---
title: "IP00 Source Inventory"
summary: "Static source, API, schema, IPC and test inventory; not runtime qualification."
read_when:
  - "Locating implementation owners and baseline evidence"
owning_subsystem: "Implementation planning"
primary_source_files:
  - "apps/server/routes/index.js"
  - "apps/server/config/sqliteDb.js"
  - "apps/desktop/src/preload.cjs"
design_status: "PROPOSED"
updated: "2026-11-05"
---

# IP00 Source Inventory

Static inventory of editable source/config files, excluding dependencies, output, databases and backup trees. No database was opened and no runtime module was imported. This is exhaustive within the enumerated roots/extensions, not an exhaustive semantic or security audit. All runtime behavior remains UNVERIFIED unless separately qualified. Hashes identify dirty working-tree source bytes.

## Routes

Literal router method declarations mounted through apps/server/routes/index.js; dynamic registrations and handler behavior require contract testing.

| Source | Line | Method and canonical path |
|---|---:|---|
| `apps/server/routes/v1/automation.routes.js` | 30 | POST `/api/v1/projects/:projectId/schedules/preview` |
| `apps/server/routes/v1/automation.routes.js` | 47 | POST `/api/v1/projects/:projectId/schedules` |
| `apps/server/routes/v1/automation.routes.js` | 67 | GET `/api/v1/projects/:projectId/schedules` |
| `apps/server/routes/v1/automation.routes.js` | 91 | PATCH `/api/v1/schedules/:scheduleId` |
| `apps/server/routes/v1/automation.routes.js` | 108 | POST `/api/v1/schedules/:scheduleId/pause` |
| `apps/server/routes/v1/automation.routes.js` | 125 | POST `/api/v1/schedules/:scheduleId/resume` |
| `apps/server/routes/v1/automation.routes.js` | 142 | GET `/api/v1/schedules/:scheduleId/occurrences` |
| `apps/server/routes/v1/automation.routes.js` | 170 | POST `/api/v1/projects/:projectId/triggers` |
| `apps/server/routes/v1/automation.routes.js` | 190 | GET `/api/v1/projects/:projectId/triggers` |
| `apps/server/routes/v1/automation.routes.js` | 214 | PATCH `/api/v1/triggers/:triggerId` |
| `apps/server/routes/v1/automation.routes.js` | 231 | POST `/api/v1/webhooks/:triggerId` |
| `apps/server/routes/v1/automation.routes.js` | 248 | GET `/api/v1/projects/:projectId/events` |
| `apps/server/routes/v1/automation.routes.js` | 285 | GET `/api/v1/activity` |
| `apps/server/routes/v1/automation.routes.js` | 313 | GET `/api/v1/notifications` |
| `apps/server/routes/v1/automation.routes.js` | 339 | POST `/api/v1/notifications/:notificationId/read` |
| `apps/server/routes/v1/conversations.routes.js` | 23 | GET `/api/v1/conversations` |
| `apps/server/routes/v1/conversations.routes.js` | 28 | POST `/api/v1/conversations` |
| `apps/server/routes/v1/conversations.routes.js` | 39 | PATCH `/api/v1/conversations/:conversationId` |
| `apps/server/routes/v1/conversations.routes.js` | 46 | POST `/api/v1/conversations/:conversationId/turns` |
| `apps/server/routes/v1/deployment.routes.js` | 26 | POST `/api/v1/runs/:runId/deployment-previews` |
| `apps/server/routes/v1/deployment.routes.js` | 43 | POST `/api/v1/runs/:runId/deployments` |
| `apps/server/routes/v1/deployment.routes.js` | 60 | GET `/api/v1/deployments/:deploymentId` |
| `apps/server/routes/v1/deployment.routes.js` | 77 | POST `/api/v1/deployments/:deploymentId/rollback-previews` |
| `apps/server/routes/v1/deployment.routes.js` | 94 | POST `/api/v1/deployments/:deploymentId/rollback` |
| `apps/server/routes/v1/deployment.routes.js` | 111 | POST `/api/v1/runs/:runId/browser-qa-sessions` |
| `apps/server/routes/v1/deployment.routes.js` | 128 | GET `/api/v1/runs/:runId/browser-qa-sessions` |
| `apps/server/routes/v1/execution.routes.js` | 64 | GET `/api/v1/projects/:projectId/runs` |
| `apps/server/routes/v1/execution.routes.js` | 82 | GET `/api/v1/conversations/:conversationId/runs` |
| `apps/server/routes/v1/execution.routes.js` | 106 | GET `/api/v1/runs` |
| `apps/server/routes/v1/execution.routes.js` | 128 | GET `/api/v1/runs/:runId` |
| `apps/server/routes/v1/execution.routes.js` | 141 | GET `/api/v1/runs/:runId/tasks` |
| `apps/server/routes/v1/execution.routes.js` | 159 | GET `/api/v1/runs/:runId/agents` |
| `apps/server/routes/v1/execution.routes.js` | 176 | GET `/api/v1/runs/:runId/effects` |
| `apps/server/routes/v1/execution.routes.js` | 194 | GET `/api/v1/runs/:runId/checkpoints` |
| `apps/server/routes/v1/execution.routes.js` | 215 | POST `/api/v1/runs/:runId/pause` |
| `apps/server/routes/v1/execution.routes.js` | 230 | POST `/api/v1/runs/:runId/resume` |
| `apps/server/routes/v1/execution.routes.js` | 245 | POST `/api/v1/runs/:runId/cancel` |
| `apps/server/routes/v1/execution.routes.js` | 264 | POST `/api/v1/effects/:effectId/reconcile` |
| `apps/server/routes/v1/execution.routes.js` | 287 | POST `/api/v1/runs/:runId/approval-requests` |
| `apps/server/routes/v1/execution.routes.js` | 299 | GET `/api/v1/runs/:runId/events` |
| `apps/server/routes/v1/execution.routes.js` | 319 | POST `/api/v1/goals/:goalId/runs` |
| `apps/server/routes/v1/execution.routes.js` | 341 | POST `/api/v1/conversations/:conversationId/runs` |
| `apps/server/routes/v1/execution.routes.js` | 407 | GET `/api/v1/runs/:runId/failures` |
| `apps/server/routes/v1/execution.routes.js` | 420 | GET `/api/v1/runs/:runId/repairs` |
| `apps/server/routes/v1/execution.routes.js` | 433 | POST `/api/v1/runs/:runId/repairs` |
| `apps/server/routes/v1/execution.routes.js` | 447 | POST `/api/v1/runs/:runId/execute` |
| `apps/server/routes/v1/governance.routes.js` | 24 | GET `/api/v1/policies/current` |
| `apps/server/routes/v1/governance.routes.js` | 37 | POST `/api/v1/policies/revisions` |
| `apps/server/routes/v1/governance.routes.js` | 52 | POST `/api/v1/policies/:revisionId/activate` |
| `apps/server/routes/v1/governance.routes.js` | 70 | GET `/api/v1/projects/:projectId/grants` |
| `apps/server/routes/v1/governance.routes.js` | 83 | POST `/api/v1/projects/:projectId/grants` |
| `apps/server/routes/v1/governance.routes.js` | 101 | POST `/api/v1/grants/:grantId/revoke` |
| `apps/server/routes/v1/governance.routes.js` | 118 | GET `/api/v1/approvals` |
| `apps/server/routes/v1/governance.routes.js` | 135 | GET `/api/v1/approvals/:approvalId` |
| `apps/server/routes/v1/governance.routes.js` | 151 | POST `/api/v1/approvals/:approvalId/decisions` |
| `apps/server/routes/v1/governance.routes.js` | 171 | POST `/api/v1/approvals/:approvalId/revoke` |
| `apps/server/routes/v1/governance.routes.js` | 189 | GET `/api/v1/projects/:projectId/budgets` |
| `apps/server/routes/v1/governance.routes.js` | 202 | POST `/api/v1/projects/:projectId/budgets` |
| `apps/server/routes/v1/governance.routes.js` | 220 | POST `/api/v1/budgets/:accountId/reserve` |
| `apps/server/routes/v1/governance.routes.js` | 237 | GET `/api/v1/usage` |
| `apps/server/routes/v1/governance.routes.js` | 257 | POST `/api/v1/sessions/:sessionId/lease` |
| `apps/server/routes/v1/governance.routes.js` | 275 | DELETE `/api/v1/sessions/:sessionId/lease` |
| `apps/server/routes/v1/governance.routes.js` | 293 | GET `/api/v1/sessions/:sessionId/lease` |
| `apps/server/routes/v1/identity.routes.js` | 50 | POST `/api/v1/session/bootstrap` |
| `apps/server/routes/v1/identity.routes.js` | 110 | GET `/api/v1/session` |
| `apps/server/routes/v1/identity.routes.js` | 122 | DELETE `/api/v1/session` |
| `apps/server/routes/v1/identity.routes.js` | 139 | GET `/api/v1/workspaces` |
| `apps/server/routes/v1/identity.routes.js` | 153 | GET `/api/v1/capabilities` |
| `apps/server/routes/v1/isolation.routes.js` | 33 | GET `/api/v1/isolation/diagnostics` |
| `apps/server/routes/v1/isolation.routes.js` | 50 | POST `/api/v1/isolation/qualify` |
| `apps/server/routes/v1/isolation.routes.js` | 64 | POST `/api/v1/isolation/validate-path` |
| `apps/server/routes/v1/isolation.routes.js` | 81 | GET `/api/v1/isolation/qualifications` |
| `apps/server/routes/v1/isolation.routes.js` | 95 | GET `/api/v1/isolation/qualifications/:id` |
| `apps/server/routes/v1/memory.routes.js` | 72 | POST `/api/v1/projects/:projectId/memories` |
| `apps/server/routes/v1/memory.routes.js` | 90 | GET `/api/v1/projects/:projectId/memories` |
| `apps/server/routes/v1/memory.routes.js` | 115 | GET `/api/v1/memories/:memoryId` |
| `apps/server/routes/v1/memory.routes.js` | 136 | POST `/api/v1/memories/:memoryId/revisions` |
| `apps/server/routes/v1/memory.routes.js` | 154 | DELETE `/api/v1/memories/:memoryId` |
| `apps/server/routes/v1/memory.routes.js` | 176 | POST `/api/v1/projects/:projectId/memory-search` |
| `apps/server/routes/v1/memory.routes.js` | 198 | POST `/api/v1/projects/:projectId/knowledge-index` |
| `apps/server/routes/v1/memory.routes.js` | 216 | GET `/api/v1/projects/:projectId/knowledge/nodes` |
| `apps/server/routes/v1/memory.routes.js` | 241 | GET `/api/v1/projects/:projectId/knowledge/edges` |
| `apps/server/routes/v1/projects.routes.js` | 41 | POST `/api/v1/projects` |
| `apps/server/routes/v1/projects.routes.js` | 66 | GET `/api/v1/projects` |
| `apps/server/routes/v1/projects.routes.js` | 93 | GET `/api/v1/projects/:projectId` |
| `apps/server/routes/v1/projects.routes.js` | 105 | PATCH `/api/v1/projects/:projectId` |
| `apps/server/routes/v1/projects.routes.js` | 134 | POST `/api/v1/projects/:projectId/archive` |
| `apps/server/routes/v1/projects.routes.js` | 160 | POST `/api/v1/projects/:projectId/conversations` |
| `apps/server/routes/v1/projects.routes.js` | 179 | GET `/api/v1/projects/:projectId/conversations` |
| `apps/server/routes/v1/projects.routes.js` | 198 | GET `/api/v1/conversations/:conversationId` |
| `apps/server/routes/v1/projects.routes.js` | 214 | DELETE `/api/v1/conversations/:conversationId` |
| `apps/server/routes/v1/projects.routes.js` | 231 | POST `/api/v1/conversations/:conversationId/messages` |
| `apps/server/routes/v1/projects.routes.js` | 248 | GET `/api/v1/conversations/:conversationId/messages` |
| `apps/server/routes/v1/projects.routes.js` | 271 | POST `/api/v1/projects/:projectId/snapshots` |
| `apps/server/routes/v1/projects.routes.js` | 293 | GET `/api/v1/projects/:projectId/snapshots` |
| `apps/server/routes/v1/projects.routes.js` | 316 | GET `/api/v1/projects/:projectId/artifacts` |
| `apps/server/routes/v1/projects.routes.js` | 335 | GET `/api/v1/artifacts/:artifactId` |
| `apps/server/routes/v1/projects.routes.js` | 355 | GET `/api/v1/artifacts/:artifactId/content` |
| `apps/server/routes/v1/projects.routes.js` | 398 | POST `/api/v1/projects/:projectId/uploads` |
| `apps/server/routes/v1/projects.routes.js` | 421 | POST `/api/v1/projects/:projectId/scan` |
| `apps/server/routes/v1/projects.routes.js` | 437 | GET `/api/v1/projects/:projectId/structure` |
| `apps/server/routes/v1/providers.routes.js` | 77 | GET `/api/v1/providers` |
| `apps/server/routes/v1/providers.routes.js` | 90 | GET `/api/v1/provider-connections` |
| `apps/server/routes/v1/providers.routes.js` | 106 | POST `/api/v1/provider-connections` |
| `apps/server/routes/v1/providers.routes.js` | 128 | PATCH `/api/v1/provider-connections/:id` |
| `apps/server/routes/v1/providers.routes.js` | 141 | DELETE `/api/v1/provider-connections/:id` |
| `apps/server/routes/v1/providers.routes.js` | 154 | POST `/api/v1/provider-connections/:id/test` |
| `apps/server/routes/v1/providers.routes.js` | 167 | POST `/api/v1/provider-connections/:id/models/refresh` |
| `apps/server/routes/v1/providers.routes.js` | 180 | GET `/api/v1/model-settings` |
| `apps/server/routes/v1/providers.routes.js` | 193 | PATCH `/api/v1/model-settings` |
| `apps/server/routes/v1/providers.routes.js` | 206 | GET `/api/v1/models` |
| `apps/server/routes/v1/providers.routes.js` | 220 | POST `/api/v1/models/verify` |
| `apps/server/routes/v1/providers.routes.js` | 250 | POST `/api/v1/conversations/:conversationId/turns` |
| `apps/server/routes/v1/recovery.routes.js` | 26 | GET `/api/v1/system/release` |
| `apps/server/routes/v1/recovery.routes.js` | 44 | POST `/api/v1/system/recovery/checkpoints` |
| `apps/server/routes/v1/recovery.routes.js` | 61 | GET `/api/v1/system/recovery/checkpoints` |
| `apps/server/routes/v1/recovery.routes.js` | 80 | GET `/api/v1/system/recovery/checkpoints/:checkpointId` |
| `apps/server/routes/v1/recovery.routes.js` | 97 | POST `/api/v1/system/recovery/checkpoints/:checkpointId/rehearsal` |
| `apps/server/routes/v1/recovery.routes.js` | 117 | GET `/api/v1/system/recovery/rehearsals/:rehearsalId` |
| `apps/server/routes/v1/recovery.routes.js` | 134 | POST `/api/v1/system/maintenance/purge` |
| `apps/server/routes/v1/recovery.routes.js` | 151 | GET `/api/v1/system/diagnostics` |
| `apps/server/routes/v1/tools.routes.js` | 58 | GET `/api/v1/tools` |
| `apps/server/routes/v1/tools.routes.js` | 78 | GET `/api/v1/tools/:toolId` |
| `apps/server/routes/v1/tools.routes.js` | 92 | POST `/api/v1/developer-connections` |
| `apps/server/routes/v1/tools.routes.js` | 123 | GET `/api/v1/developer-connections` |
| `apps/server/routes/v1/tools.routes.js` | 146 | GET `/api/v1/developer-connections/:connectionId` |
| `apps/server/routes/v1/tools.routes.js` | 156 | POST `/api/v1/developer-connections/:connectionId/qualify` |
| `apps/server/routes/v1/tools.routes.js` | 170 | POST `/api/v1/developer-connections/:connectionId/disconnect` |
| `apps/server/routes/v1/tools.routes.js` | 181 | DELETE `/api/v1/developer-connections/:connectionId` |
| `apps/server/routes/v1/tools.routes.js` | 196 | POST `/api/v1/tools/invoke` |
| `apps/server/routes/v1/tools.routes.js` | 229 | GET `/api/v1/tools/receipts/:receiptId` |
| `apps/server/routes/v1/verification.routes.js` | 21 | POST `/api/v1/runs/:runId/verifications` |
| `apps/server/routes/v1/verification.routes.js` | 58 | GET `/api/v1/runs/:runId/verifications` |
| `apps/server/routes/v1/verification.routes.js` | 73 | GET `/api/v1/verifications/:reportId` |
| `apps/server/routes/v1/verification.routes.js` | 88 | POST `/api/v1/verifications/evaluations` |
| `apps/server/routes/v1/workspace.routes.js` | 16 | GET `/api/v1/projects/:projectId/workspace-readiness` |
| `apps/server/routes/v1/workspace.routes.js` | 17 | POST `/api/v1/projects/:projectId/terminal-preparations` |
| `apps/server/routes/v1/workspace.routes.js` | 18 | POST `/api/v1/projects/:projectId/terminal-preparations/:preparationId/open` |
| `apps/server/routes/v1/workspace.routes.js` | 19 | POST `/api/v1/terminals/:terminalId/input-preparations` |
| `apps/server/routes/v1/workspace.routes.js` | 20 | POST `/api/v1/projects/:projectId/workspace-root` |
| `apps/server/routes/v1/workspace.routes.js` | 21 | POST `/api/v1/projects/:projectId/isolation/docker-qualification` |
| `apps/server/routes/v1/workspace.routes.js` | 22 | GET `/api/v1/projects/:projectId/docker-workers` |
| `apps/server/routes/v1/workspace.routes.js` | 24 | GET `/api/v1/projects/:projectId/file` |
| `apps/server/routes/v1/workspace.routes.js` | 25 | GET `/api/v1/projects/:projectId/files` |
| `apps/server/routes/v1/workspace.routes.js` | 26 | GET `/api/v1/projects/:projectId/patch-previews/:artifactId` |
| `apps/server/routes/v1/workspace.routes.js` | 27 | POST `/api/v1/projects/:projectId/patch-previews/:artifactId/apply` |
| `apps/server/routes/v1/workspace.routes.js` | 28 | POST `/api/v1/projects/:projectId/patch-effects/:effectId/reconcile` |
| `apps/server/routes/v1/workspace.routes.js` | 29 | POST `/api/v1/projects/:projectId/docker-workers/recover` |
| `apps/server/routes/v1/workspace.routes.js` | 30 | POST `/api/v1/projects/:projectId/terminals` |
| `apps/server/routes/v1/workspace.routes.js` | 31 | POST `/api/v1/terminals/:terminalId/ticket` |
| `apps/server/routes/v1/workspace.routes.js` | 32 | DELETE `/api/v1/terminals/:terminalId` |
| `apps/server/routes/v1/workspace.routes.js` | 33 | GET `/api/v1/fs/directories` |

## Schema declarations

Source declarations only; the deployed schema and data population are UNKNOWN. Namespace tables currently occupy attached files; do not treat these as already unified.

| Source | Declared table |
|---|---|
| `apps/server/config/sqliteDb.js` | `users` |
| `apps/server/config/sqliteDb.js` | `workspaces` |
| `apps/server/config/sqliteDb.js` | `auth_sessions` |
| `apps/server/config/sqliteDb.js` | `projects` |
| `apps/server/config/sqliteDb.js` | `sessions` |
| `apps/server/config/sqliteDb.js` | `messages` |
| `apps/server/config/sqliteDb.js` | `session_turn_leases` |
| `apps/server/config/sqliteDb.js` | `checkpoints` |
| `apps/server/config/sqliteDb.js` | `approvals` |
| `apps/server/config/sqliteDb.js` | `desktop_settings` |
| `apps/server/config/sqliteDb.js` | `audit_logs` |
| `apps/server/config/sqliteDb.js` | `repository_snapshots` |
| `apps/server/config/sqliteDb.js` | `artifacts` |
| `apps/server/config/sqliteDb.js` | `uploads` |
| `apps/server/config/sqliteDb.js` | `policy_revisions` |
| `apps/server/config/sqliteDb.js` | `capability_grants` |
| `apps/server/config/sqliteDb.js` | `grants` |
| `apps/server/config/sqliteDb.js` | `budget_accounts` |
| `apps/server/config/sqliteDb.js` | `budget_reservations` |
| `apps/server/config/sqliteDb.js` | `audit_events` |
| `apps/server/config/sqliteDb.js` | `provider_connections` |
| `apps/server/config/sqliteDb.js` | `models` |
| `apps/server/config/sqliteDb.js` | `model_settings` |
| `apps/server/config/sqliteDb.js` | `model_calls` |
| `apps/server/config/sqliteDb.js` | `goals` |
| `apps/server/config/sqliteDb.js` | `intent_analyses` |
| `apps/server/config/sqliteDb.js` | `clarifications` |
| `apps/server/config/sqliteDb.js` | `research_reports` |
| `apps/server/config/sqliteDb.js` | `requirement_revisions` |
| `apps/server/config/sqliteDb.js` | `decisions` |
| `apps/server/config/sqliteDb.js` | `plans` |
| `apps/server/config/sqliteDb.js` | `plan_revisions` |
| `apps/server/config/sqliteDb.js` | `contracts` |
| `apps/server/config/sqliteDb.js` | `contract_revisions` |
| `apps/server/config/sqliteDb.js` | `runs` |
| `apps/server/config/sqliteDb.js` | `tasks` |
| `apps/server/config/sqliteDb.js` | `agent_sessions` |
| `apps/server/config/sqliteDb.js` | `effects` |
| `apps/server/config/sqliteDb.js` | `run_checkpoints` |
| `apps/server/config/sqliteDb.js` | `run_events` |
| `apps/server/config/sqliteDb.js` | `reconciliation_operations` |
| `apps/server/config/sqliteDb.js` | `isolation_profiles` |
| `apps/server/config/sqliteDb.js` | `isolation_workers` |
| `apps/server/config/sqliteDb.js` | `isolation_qualifications` |
| `apps/server/config/sqliteDb.js` | `tools` |
| `apps/server/config/sqliteDb.js` | `tool_revisions` |
| `apps/server/config/sqliteDb.js` | `developer_connections` |
| `apps/server/config/sqliteDb.js` | `tool_invocations` |
| `apps/server/config/sqliteDb.js` | `tool_receipts` |
| `apps/server/config/sqliteDb.js` | `verification_jobs` |
| `apps/server/config/sqliteDb.js` | `verification_results` |
| `apps/server/config/sqliteDb.js` | `verification_reports` |
| `apps/server/config/sqliteDb.js` | `verification_evaluations` |
| `apps/server/config/sqliteDb.js` | `ops.deployments` |
| `apps/server/config/sqliteDb.js` | `ops.deployment_previews` |
| `apps/server/config/sqliteDb.js` | `ops.browser_qa_sessions` |
| `apps/server/config/sqliteDb.js` | `knowledge.context_bundles` |
| `apps/server/config/sqliteDb.js` | `uploads_rebuild` |
| `apps/server/migrations/001_initial_schema.sql` | `users` |
| `apps/server/migrations/001_initial_schema.sql` | `projects` |
| `apps/server/migrations/001_initial_schema.sql` | `sessions` |
| `apps/server/migrations/001_initial_schema.sql` | `messages` |
| `apps/server/migrations/001_initial_schema.sql` | `session_turn_leases` |
| `apps/server/migrations/001_initial_schema.sql` | `checkpoints` |
| `apps/server/migrations/001_initial_schema.sql` | `approvals` |
| `apps/server/migrations/001_initial_schema.sql` | `desktop_settings` |
| `apps/server/migrations/001_initial_schema.sql` | `audit_logs` |
| `apps/server/migrations/003_identity_sessions.sql` | `workspaces` |
| `apps/server/migrations/003_identity_sessions.sql` | `auth_sessions` |
| `apps/server/migrations/004_project_content_artifacts.sql` | `repository_snapshots` |
| `apps/server/migrations/004_project_content_artifacts.sql` | `artifacts` |
| `apps/server/migrations/004_project_content_artifacts.sql` | `uploads` |
| `apps/server/migrations/005_governance_leases_approvals.sql` | `policy_revisions` |
| `apps/server/migrations/005_governance_leases_approvals.sql` | `capability_grants` |
| `apps/server/migrations/005_governance_leases_approvals.sql` | `budget_accounts` |
| `apps/server/migrations/005_governance_leases_approvals.sql` | `budget_reservations` |
| `apps/server/migrations/005_governance_leases_approvals.sql` | `audit_events` |
| `apps/server/migrations/006_provider_models_inference.sql` | `provider_connections` |
| `apps/server/migrations/006_provider_models_inference.sql` | `models` |
| `apps/server/migrations/006_provider_models_inference.sql` | `model_calls` |
| `apps/server/migrations/007_durable_execution_tasks_effects.sql` | `runs` |
| `apps/server/migrations/007_durable_execution_tasks_effects.sql` | `tasks` |
| `apps/server/migrations/007_durable_execution_tasks_effects.sql` | `agent_sessions` |
| `apps/server/migrations/007_durable_execution_tasks_effects.sql` | `effects` |
| `apps/server/migrations/007_durable_execution_tasks_effects.sql` | `run_checkpoints` |
| `apps/server/migrations/007_durable_execution_tasks_effects.sql` | `run_events` |
| `apps/server/migrations/007_durable_execution_tasks_effects.sql` | `reconciliation_operations` |
| `apps/server/migrations/008_intent_research_requirements.sql` | `goals` |
| `apps/server/migrations/008_intent_research_requirements.sql` | `intent_analyses` |
| `apps/server/migrations/008_intent_research_requirements.sql` | `clarifications` |
| `apps/server/migrations/008_intent_research_requirements.sql` | `research_reports` |
| `apps/server/migrations/008_intent_research_requirements.sql` | `requirement_revisions` |
| `apps/server/migrations/008_intent_research_requirements.sql` | `decisions` |
| `apps/server/migrations/009_planning_contracts.sql` | `plans` |
| `apps/server/migrations/009_planning_contracts.sql` | `plan_revisions` |
| `apps/server/migrations/009_planning_contracts.sql` | `contracts` |
| `apps/server/migrations/009_planning_contracts.sql` | `contract_revisions` |
| `apps/server/migrations/010_windows_isolation_qualification.sql` | `isolation_profiles` |
| `apps/server/migrations/010_windows_isolation_qualification.sql` | `isolation_workers` |
| `apps/server/migrations/010_windows_isolation_qualification.sql` | `isolation_qualifications` |
| `apps/server/migrations/011_tool_runtime_coding_backend.sql` | `tools` |
| `apps/server/migrations/011_tool_runtime_coding_backend.sql` | `tool_revisions` |
| `apps/server/migrations/011_tool_runtime_coding_backend.sql` | `developer_connections` |
| `apps/server/migrations/011_tool_runtime_coding_backend.sql` | `tool_invocations` |
| `apps/server/migrations/011_tool_runtime_coding_backend.sql` | `tool_receipts` |
| `apps/server/migrations/012_verification_engine.sql` | `verification_jobs` |
| `apps/server/migrations/012_verification_engine.sql` | `verification_results` |
| `apps/server/migrations/012_verification_engine.sql` | `verification_reports` |
| `apps/server/migrations/012_verification_engine.sql` | `verification_evaluations` |
| `apps/server/migrations/013_killer_workflow_bounded_repair.sql` | `control.failures` |
| `apps/server/migrations/013_killer_workflow_bounded_repair.sql` | `control.repair_hypotheses` |
| `apps/server/migrations/014_memory_project_intelligence.sql` | `knowledge.embedding_spaces` |
| `apps/server/migrations/014_memory_project_intelligence.sql` | `knowledge.memories` |
| `apps/server/migrations/014_memory_project_intelligence.sql` | `knowledge.memory_revisions` |
| `apps/server/migrations/014_memory_project_intelligence.sql` | `knowledge.memory_chunks` |
| `apps/server/migrations/014_memory_project_intelligence.sql` | `knowledge.embeddings_1536` |
| `apps/server/migrations/014_memory_project_intelligence.sql` | `knowledge.embeddings_1536` |
| `apps/server/migrations/014_memory_project_intelligence.sql` | `knowledge.nodes` |
| `apps/server/migrations/014_memory_project_intelligence.sql` | `knowledge.edges` |
| `apps/server/migrations/014_memory_project_intelligence.sql` | `knowledge.context_bundles` |
| `apps/server/migrations/015_schedules_signed_events.sql` | `automation.schedules` |
| `apps/server/migrations/015_schedules_signed_events.sql` | `automation.occurrences` |
| `apps/server/migrations/015_schedules_signed_events.sql` | `automation.triggers` |
| `apps/server/migrations/015_schedules_signed_events.sql` | `automation.inbound_events` |
| `apps/server/migrations/015_schedules_signed_events.sql` | `automation.activity` |
| `apps/server/migrations/015_schedules_signed_events.sql` | `automation.notifications` |
| `apps/server/migrations/016_browser_qa_deployment_adapter.sql` | `ops.deployment_previews` |
| `apps/server/migrations/016_browser_qa_deployment_adapter.sql` | `ops.deployments` |
| `apps/server/migrations/016_browser_qa_deployment_adapter.sql` | `ops.browser_qa_sessions` |
| `apps/server/migrations/017_windows_v1_release_recovery.sql` | `system.release_manifests` |
| `apps/server/migrations/017_windows_v1_release_recovery.sql` | `system.recovery_checkpoints` |
| `apps/server/migrations/017_windows_v1_release_recovery.sql` | `system.recovery_rehearsals` |
| `apps/server/migrations/017_windows_v1_release_recovery.sql` | `system.operational_quotas` |
| `apps/server/migrations/017_windows_v1_release_recovery.sql` | `system.retention_jobs` |

## IPC

Current exposed bridge: window.sirona. Desktop method contract must be reconciled with legacy docs naming window.sironaDesktop.

| Source | Channel |
|---|---|
| `apps/desktop/src/preload.cjs` | `sirona-next:bootstrap` |
| `apps/desktop/src/preload.cjs` | `sirona-next:copy-text` |
| `apps/desktop/src/preload.cjs` | `sirona-next:credential-status` |
| `apps/desktop/src/preload.cjs` | `sirona-next:pick-folder` |
| `apps/desktop/src/preload.cjs` | `sirona-next:save-connection` |
| `apps/desktop/src/main.cjs` | `sirona-next:bootstrap` |
| `apps/desktop/src/main.cjs` | `sirona-next:copy-text` |
| `apps/desktop/src/main.cjs` | `sirona-next:credential-status` |
| `apps/desktop/src/main.cjs` | `sirona-next:pick-folder` |
| `apps/desktop/src/main.cjs` | `sirona-next:save-connection` |

## Source and test manifest

Test files are discovery evidence, not passing results. Inspect their targets and doubles before running. Kind marks tests, contracts, or source/configuration.

| Path | Kind | SHA-256 |
|---|---|---|
| `apps/cli/docker/prepare-tools-context.mjs` | source/config | `f5fef38f2b55859b470ff7b300b3574d24968fd86a535f27be006c6cdbf438b3` |
| `apps/cli/docker/tools-runtime/apk-lock.json` | source/config | `86145f1205e1533c04b9be3041c160aff9628b2507b413118d65268cabb3d502` |
| `apps/cli/docker/tools-runtime/artifacts.json` | source/config | `f0051e08975d927b7ce01cb67333c71ced9d50259b6395a97285dbb344b73b94` |
| `apps/cli/docker/tools-runtime/package.json` | source/config | `2b919b691b29b58a07df1b9bfdce3c14d4116ec48b2feddea0ba3f7e4da1c56e` |
| `apps/cli/docker/tools-runtime/server.mjs` | source/config | `0ed7b82e0ccaf1bea5c575775d9d80df619da8a4c879f9d095e810f8d1ea4bf5` |
| `apps/cli/package.json` | source/config | `ee73ff832d468dfbb5c3e782206d698536c9e0752ecea65c60e0778c37c225de` |
| `apps/cli/src/cli.ts` | source/config | `1486f17b70e7638c82286d0bdef2b587e6d3b3a4f23010d25c17f020e815daf7` |
| `apps/cli/src/guest/agent.ts` | source/config | `17feb8b63a8253dc462f073945572cca0d3ac882bbff2038d5d48f8289569d41` |
| `apps/cli/src/health.ts` | source/config | `689bbbf0281e173fee35d356e52f356e6fc205893bfa6f59c6ca181aca7d1acf` |
| `apps/cli/src/isolate-worker.ts` | source/config | `e12dec6595977cde2058da0fb632625b011b8cb4c919e8cc6e2a1f2fb78481a8` |
| `apps/cli/src/lsp.ts` | source/config | `4e4d5d419a554195ab502098537bd7403d659f69ea92afb7e6eed71eac097fa2` |
| `apps/cli/tests/tooling.test.mjs` | test/fixture | `1804efc9a6c8f2af640401d6cf05024fd282adb134ce237a77b89363f43abe63` |
| `apps/cli/tsconfig.json` | source/config | `9e9af861d817eb5c6a1c54c5093427884cb063a9f6a35e4e63733e31dcca97db` |
| `apps/desktop/package.json` | source/config | `397fba0fcf1b03d94617e79a9dfd4c12355b7e8fa3ec34e3ea20fb49b4137f34` |
| `apps/desktop/src/main.cjs` | source/config | `7eb58dde3d4085ee1b7cea87a07902d53d9403fe47a682fc2f11613198d6501e` |
| `apps/desktop/src/preload.cjs` | source/config | `e81a3b99f4938c8a57a5278b80a4353f5edce52b469fadba3a67eee0e5667573` |
| `apps/desktop/src/security/credentialBroker.ts` | source/config | `4343e54e6f5d8e70659d9f5712b036fd83baac6d7c671325b210eade9d2e4c7a` |
| `apps/desktop/src/server.cjs` | source/config | `35e81a7e227d599d0efc774182f045adda5a9467da8372080b1ef8c20b9c1435` |
| `apps/desktop/src/terminalProxy.cjs` | source/config | `ceb604bad05e9b43384b377b8b38c7a17a1b0179bccadb623f89a127ce15d6c7` |
| `apps/desktop/tests/desktopServer.test.mjs` | test/fixture | `8e45d1027ba80b155725f48134a776efe08d47984a6399abdc098e74e96e02e3` |
| `apps/desktop/tsconfig.json` | source/config | `e566afe183058ee3be3efebfd9d340bcf78cf397d1b44f09210f09f2f79ce468` |
| `apps/server/CLEANUP_MANIFEST.json` | source/config | `2ad3e6e7f18a429cdb0025b9e182f877d0484c6feff2cea35d5de63e417a03de` |
| `apps/server/app.js` | source/config | `16cb9afbc760e8678c8cc6eca75f83e2243ca4b202271065db835362f61b8e03` |
| `apps/server/config/db.js` | source/config | `af369cddba56cd28b78e402accfb56a7ff4b198abd13d3bf8c4cea9430492528` |
| `apps/server/config/index.js` | source/config | `a06138ddf283f52f4d07f734b66b8f363fac7e7af7764cb4500b7be2afe38241` |
| `apps/server/config/origins.js` | source/config | `0737ecc750f53ae6f94bab33415eea933889b9a884681b206585bb646db97a11` |
| `apps/server/config/redis.js` | source/config | `74c06a99f96b6bbebd35dcf44c3474212769f44fd496ae098d0aa88ce3ce8767` |
| `apps/server/config/s3.js` | source/config | `6ca7eab7960744bb13e6f57dbf8eb42168426f2b610f0147ff460c08dc9b596c` |
| `apps/server/config/sqliteDb.js` | source/config | `5293f29b7b984e93121928944ec3cf664c820b547dacb19a1d1fe3e4e67b1ca9` |
| `apps/server/controllers/approvalController.js` | source/config | `abb8747f4b8403211a3602f3737342064289520b8eb95cc1a8bf3675a5dae720` |
| `apps/server/controllers/auditController.js` | source/config | `e7db7b96827b3acefa9e29bd83db19346ee856757f41a281587e2671e3d2b481` |
| `apps/server/controllers/authController.js` | source/config | `04ee48f8161bb9db22bbf8a6d222cab94d42dc5dba3194f47b5134e0fb60295f` |
| `apps/server/controllers/chatController.js` | source/config | `68d5e203e6b5d8d3146cd09985ebadd89d2569eb060ca31fcfc496b79fdee403` |
| `apps/server/controllers/filesController.js` | source/config | `f684da29238fbfc47766645ff3cf723d82b47e2459ae383c8a7232468ad8e25c` |
| `apps/server/controllers/gitController.js` | source/config | `335a7a251e2f94f81719191c2cb6de6e636405701bae1bcbe4663a8b432bf691` |
| `apps/server/controllers/healthController.js` | source/config | `092183446321888e612303f6fab53cda4fd5451b1d94b22e925b4ccc49a65cad` |
| `apps/server/controllers/index.js` | source/config | `5e257714875d54cb768393993c8143dedc8c9f7fc0bcc672559445a7dba740be` |
| `apps/server/controllers/modelsController.js` | source/config | `82138c7c938c7a392ac660c12641a94dc8c77f7f413e90f123b8941febea779a` |
| `apps/server/controllers/sessionController.js` | source/config | `20c48adef51693fddd4ef3f06bcf604077bea3adad2c4646589bf9bc847b8186` |
| `apps/server/controllers/settingsController.js` | source/config | `6a3e7e30b2c3331a241ec44a78bcd741fc1cd46c71a00840e8ad89c94b8226b5` |
| `apps/server/controllers/toolsController.js` | source/config | `0265d0bef36f6f750fd8d8c5dbc7bb956b2c35e63e4baf314998be81aa1e01c4` |
| `apps/server/errors/index.js` | source/config | `04b762d9a03439da42916461a7318ec13f72ce18e67574d462f1cf5da1488c52` |
| `apps/server/foundation/admission.js` | source/config | `ce29d819dae8b2ad23f7b95fddd36f6fe5d5f3506a94795bc49b7d4056721323` |
| `apps/server/foundation/bounded.js` | source/config | `b8dd675c5977da1d7166c4a62e0e4f76d28444e76926c45b01c69e04b7232798` |
| `apps/server/foundation/composition.js` | source/config | `2909474ccae495290c2f752987ced57bfc913c8f88969e1a2d8cf6cddf7cb635` |
| `apps/server/foundation/config.js` | source/config | `e1d248b8caab33054ba80d8e285b7463f6ff2c718fb5886c5c685f28d930f6b3` |
| `apps/server/foundation/contracts.d.ts` | source/config | `f4e26f341bfc04418945ca1b82810e2ab9a5cb85892436f98322e72ee61ce1db` |
| `apps/server/foundation/lifecycle.js` | source/config | `e75402778ed2c56b2d6a366192a334f4e1aa91c7cc3cbd99aeadaf933b85c670` |
| `apps/server/foundation/logger.js` | source/config | `c3a8a4e4e320c1ef134d950260ef0ab80aae8a398a8d41529b028057984026bb` |
| `apps/server/foundation/origins.js` | source/config | `8c05716e4d37287f81b1fcdb094379a1b78917aec75261fd97586a03fe94db5f` |
| `apps/server/foundation/production.js` | source/config | `484e46ddfdeb77fec97720048fbf958bceb9b20e081b6ad10966ffeb16ff6366` |
| `apps/server/foundation/runtimeConfig.js` | source/config | `ea830042d428b3c29ffe9d3fe8f6af862a391b40657ef9b5d6934bfd3114e68e` |
| `apps/server/foundation/ssrfGuard.js` | source/config | `d5b38e11272dbc900da4e926bc7b38543428960a16b9a84ed86b35d209fe561b` |
| `apps/server/graphql.config.ts` | source/config | `9c7e34d2bcacf3690f63758b49ab3b2dd1690f337fbc847c047e4d5e9851bcda` |
| `apps/server/inspect_schema.mjs` | source/config | `51fa2aa7b3177cef61892d5250a60b3b49cb4b374fedc1d7cb10137ea907be32` |
| `apps/server/jsconfig.json` | source/config | `6e255ddc04650af7ea7c9430f2d454ac98e751b551dbb83cd6108938fade3442` |
| `apps/server/jsconfig.strict.json` | source/config | `b96b698201d45d39f8e00608445bf853e8fe17b613598cc06d6a6582b4462066` |
| `apps/server/middleware/auditContext.js` | source/config | `0d68c6b45ded6d361c0eb7f0b0b109cf745d63e4477837f4ba4b1e955c256fe7` |
| `apps/server/middleware/errorHandler.js` | source/config | `894cb0a8e8b5d447f9971f92a13fd5aae5f61d5dce474a73c63cf8d3bc46c6c9` |
| `apps/server/middleware/httpBoundary.js` | source/config | `16bb58a9567ebd847fe50d02f5a5a83d0b53dfaeb3ec104dc97e5b4f3da4c28a` |
| `apps/server/middleware/index.js` | source/config | `4365f6f9a644afd9808085e0744f91657afea27184c1251435a63273206f0e26` |
| `apps/server/middleware/ownershipGuard.js` | source/config | `96c1c361f03f4392aeb478b45cb413795302f9ac63dd7f9929740a20cd6230ce` |
| `apps/server/middleware/problem.js` | source/config | `7a167b5f4d789a05b1e0ef658beabb7edaf780da33efb0c9db9154eab7ebac46` |
| `apps/server/middleware/rateLimiter.js` | source/config | `91c5cd0a901e9b73a17352317d02da83eaba7775a5543da86f2aa3a1b330afd0` |
| `apps/server/middleware/sessionAuth.js` | source/config | `346c0de2f7eb00136c3e301f6a13feabd571f2fc01aa8d78bfed11c7e6035b43` |
| `apps/server/middleware/upload.js` | source/config | `9af7606bf94fd041bf49282d8bb1d27f3cab670b2364ce8aa666584f28862354` |
| `apps/server/middleware/userAuth.js` | source/config | `f0014959ef5d6f7193c09fe7a90e4605a5798b1aeef4e7a40f379ab8a3b99f00` |
| `apps/server/middleware/validate.js` | source/config | `d0c11c7f037d5e3f3d241280273c54084e6a1cfbfdc35918743c0ce24e59d8f7` |
| `apps/server/migrations/001_initial_schema.sql` | source/config | `caecf97eee19e0f653d76c7a979da7a8d01619089779e928b6d6640e91cefa1e` |
| `apps/server/migrations/002_vector_extension.sql` | source/config | `d320d7ed87d214b28e8baeded1598f914de38cb924ee4435fb66c4295f6b942b` |
| `apps/server/migrations/003_identity_sessions.sql` | source/config | `5691ddb0af2c88471af5797c21a0ec9d2263aa8913e7c26a84eb01161f9ddf39` |
| `apps/server/migrations/004_project_content_artifacts.sql` | source/config | `5e2edfe40741b5fc813e56b5faf6c8bb6c9bd14f819f01a1e1f8a0ef9b1382bb` |
| `apps/server/migrations/005_governance_leases_approvals.sql` | source/config | `4569cb710a409414f71e6f7dbe7a996a680a1381908b2654672437689ead38f5` |
| `apps/server/migrations/006_provider_models_inference.sql` | source/config | `1ded4c5469779000904aec8bfab726557cda2e087245ef922432765fa094fed0` |
| `apps/server/migrations/007_durable_execution_tasks_effects.sql` | source/config | `50df1ecafffd6853515a9f9e805e38ee890568c431a0612da1aab2d0c578bcda` |
| `apps/server/migrations/008_intent_research_requirements.sql` | source/config | `22550fe1da38d7370ffbba8e0a4d83c4d02eae325548fcd8cf141bf3ee06ad95` |
| `apps/server/migrations/009_planning_contracts.sql` | source/config | `abb3a84b611ab3a8d871003e817c97be358d3c43f19fdf5a44ef162732fd966d` |
| `apps/server/migrations/010_windows_isolation_qualification.sql` | source/config | `09015489bdbc27dfa058be8282936c787f78917d3ff06130154ba7936534f76c` |
| `apps/server/migrations/011_tool_runtime_coding_backend.sql` | source/config | `ff4e92e346d756c08f47147b24b8731595ddf4a3f1c24fcd4bf85714efa81da7` |
| `apps/server/migrations/012_verification_engine.sql` | source/config | `df70cf3d33c1763059343b76678856063dd92131f5e9175704a7a718a5b82e37` |
| `apps/server/migrations/013_killer_workflow_bounded_repair.sql` | source/config | `2238caa5e914140e06bf90306c95ec9fca378453a10be560b7be797ad07f07e2` |
| `apps/server/migrations/014_memory_project_intelligence.sql` | source/config | `b9fa6c2bd06195b44f7659baf88825ab45d19819e3811ed83c83e286fbe25f6e` |
| `apps/server/migrations/015_schedules_signed_events.sql` | source/config | `7ed2154c4a68cebfe66dc8f41dd62ee70639c390cc46fa2626adb279b62ea389` |
| `apps/server/migrations/016_browser_qa_deployment_adapter.sql` | source/config | `d0ba04b434f3ab337d743becc0a3184cd59950ac6bff035fd4a3140fa0bc1117` |
| `apps/server/migrations/017_windows_v1_release_recovery.sql` | source/config | `9a3e2144cabb421655bde4bfc3cd3b767862cbc5e75c57bd6c4e0e37004f0902` |
| `apps/server/migrations/018_runtime_recovery_execution.sql` | source/config | `5acb5d0df64e19e5dc7af1e8c841043885cff880fd730c5dbcc4bf2d9fe5abdc` |
| `apps/server/migrations/019_conversation_turn_states.sql` | source/config | `6a557310f646259542fc4e423e5175cce560b5f326436f02e3bd54e886078267` |
| `apps/server/migrations/020_model_connection_link.sql` | source/config | `6161428d8e27033155d922cea82dbdd6beb642e423a277df90cb0c72365d2f7d` |
| `apps/server/migrations/021_standalone_conversations.sql` | source/config | `6c7e7b60f269de4718c7ca47d176d7b49b4d43c5569f850e3b51de7432a51872` |
| `apps/server/migrations/022_execution_reliability.sql` | source/config | `26b54d78a4b6f0fc65dbcd4fb4c0dc9af6b5c83978a979146799ab5e15f63f01` |
| `apps/server/migrations/023_provider_credential_references.sql` | source/config | `867db99fbb8b4940b15f23dd6e2698d1c946aa6bd7509793465f63d0ce3aaebd` |
| `apps/server/migrations/024_conversation_runs_and_retire_obsolete_workflows.sql` | source/config | `275aacd0dcc3cd720701a1f1cd958f0bff856b9c594cfb7e4f0bf1ae2e9b54df` |
| `apps/server/migrations/runMigrations.js` | source/config | `e35c26ae235732b47f55a51ca510936547c51f3e8c8979bac2cc9a50e6ebb9fc` |
| `apps/server/model/Approval.js` | source/config | `495580a06e7b4ec3f8cc5414b9ab2c2f400aaf3a6dc3458e858bd97b129c6d75` |
| `apps/server/model/AuditLog.js` | source/config | `dbfd70951b9f6f20b41b6c02d1d691c1d6aef3b6c72106ca87f6fe4a67a06092` |
| `apps/server/model/Checkpoint.js` | source/config | `bfcd72af4dceabba97b7d34606e382b2b3086185adb157bcaf2a1b20fd61e653` |
| `apps/server/model/Message.js` | source/config | `32429fa5dc797464f5f487cbaab7e90653bd8bc28411736ccf4a1fffcc18e49f` |
| `apps/server/model/Project.js` | source/config | `563e5a33eefb8e584ae37c3591c136058f350b94906061ed3ca6872ed9d41376` |
| `apps/server/model/Session.js` | source/config | `90a7a8e33de8db32d3931e69d891608e0b9b645ac3a54a581e32b4fa78e73968` |
| `apps/server/model/Setting.js` | source/config | `f48e5686e74c521a7fe47222a74d306cd5b8242d45f95359d1f312c2492cc59a` |
| `apps/server/model/TurnLease.js` | source/config | `4cbf41f4aef2f68f443f6064d30b28d4a08a807856d9880c7506fb57ccd9bc0e` |
| `apps/server/model/User.js` | source/config | `adc0ac395d1cc4ebedcc62e971521a5f688921b0bc49de31d862f0c334e5a73f` |
| `apps/server/model/index.js` | source/config | `1790505a87a515060e5b6548f97fa401b70dd39f64703f83288a11b3bd72b186` |
| `apps/server/package.json` | source/config | `2da3c02713de580feeceab1fc42a0ed8dde6e9de0ccd06b82d9fd0dd04bd871b` |
| `apps/server/routes/approval.routes.js` | source/config | `4414e269aa73d502ffa2fb40fd544fd017fadffa9134292794022c3c892a8ec1` |
| `apps/server/routes/audit.routes.js` | source/config | `f9aab3d3ae74e7a8770fca431cf64d981e125c0e70856bdeb254809379be149e` |
| `apps/server/routes/auth.routes.js` | source/config | `adf5d61bc050351c7358ab3f709eab7b3564775685ce0bee1524d05d4c5ead6a` |
| `apps/server/routes/files.routes.js` | source/config | `a2ded2e133739183c9a6e10e30f9a097aa4445dd6d6ce1fae46d31d02415555e` |
| `apps/server/routes/git.routes.js` | source/config | `de535a963eae5ab5d77df486605c3ac0287e672fb806b50e17e0e13111fadbf0` |
| `apps/server/routes/health.routes.js` | source/config | `ced1af882f43eebee786af8e3f5ec7dd727699870febaf1b12c0bc146f3f8186` |
| `apps/server/routes/index.js` | source/config | `b6c61242690bdee36b1b217c05020dc6e57674ca0e9883f64b0599476f03cafb` |
| `apps/server/routes/models.routes.js` | source/config | `94fc5dd80a44834768082e914c7d6cbd45f5906130ab54cf428f33908b49ea93` |
| `apps/server/routes/session.routes.js` | source/config | `8d8def35fdb1bf215deeebc3b649dff54842dc7ba6e69f45d471d9ec2b8ceaac` |
| `apps/server/routes/settings.routes.js` | source/config | `4104eb62042afab6aff8ea1bd3f4eb8a94842619ff7c772bd1dcb26eaac19624` |
| `apps/server/routes/tools.routes.js` | source/config | `ebf2dc67b56ba2ee0077c1e4984937340fa02747b7d7ef74fe8ecbc13bbbd925` |
| `apps/server/routes/v1/automation.routes.js` | source/config | `61689c3f12bd9213c855ec3a0e04d806dc0aac4be560e6dc406c9d71a720bb6b` |
| `apps/server/routes/v1/conversations.routes.js` | source/config | `aada135d012f30bb36a052439aac440b97738ab2f4f4550ecb86ee4d960195fc` |
| `apps/server/routes/v1/deployment.routes.js` | source/config | `ef11b3409b354d509e16db17015d8a93f8409bd22e3473479f5aff234c5cb5c1` |
| `apps/server/routes/v1/execution.routes.js` | source/config | `03d2d0bf6eaa08947fecb243bb27cd08dccea5b1fa0367c5462b2f126518fa1f` |
| `apps/server/routes/v1/governance.routes.js` | source/config | `d80e30b97dfff47273758a3c8325e6390041518f611ad000411e848fe4a2d0a1` |
| `apps/server/routes/v1/identity.routes.js` | source/config | `66841c17acd9df721c1264345fab7986392d6787c5e6c614f5122468076f6dc0` |
| `apps/server/routes/v1/isolation.routes.js` | source/config | `56f17311eb5aef1a9923d5ae3de3f0fff5f4c49ac3ba2ce6a51b1875ea77004f` |
| `apps/server/routes/v1/memory.routes.js` | source/config | `0763e048e461b643968eafb5f72c850e74febb50fe4fb0f9f9b7826d597282ab` |
| `apps/server/routes/v1/projects.routes.js` | source/config | `a1e8ed5a6223a8cc548bb014f5fcf8d1708a75fdf01635409b1e0aa5187d4918` |
| `apps/server/routes/v1/providers.routes.js` | source/config | `7444059da6237554cda55ca822940f188905b45dd86fc245899b2e96f44a0933` |
| `apps/server/routes/v1/recovery.routes.js` | source/config | `01bc883262f04ed5772c9921768f2d53a8d556690970a4eb1a157ec16c993803` |
| `apps/server/routes/v1/tools.routes.js` | source/config | `1a9b254df610dd713e02dbb1475eaa086fa0fb8e1e257f122050c1878c4b0207` |
| `apps/server/routes/v1/verification.routes.js` | source/config | `62c0a47e3ccc698b7bfe1d6b104ca34ad0d15d331087b137aa07642319f49e8d` |
| `apps/server/routes/v1/workspace.routes.js` | source/config | `b3360c3a2135b068c51c4f4b5a6c1995aaa0c6441de3a5bceb913c46ea78da3c` |
| `apps/server/scratch/query_od.mjs` | source/config | `f2e8d77a4f0ed6a5bd21882360753e33f038ae8b188d81a0db1c224c7273012e` |
| `apps/server/scripts/checkModules.js` | source/config | `148c2256b8eb6676640b02cd1e2eca557c4c60375ff7ff6be3d2dfadc1453bb3` |
| `apps/server/scripts/checkPackageBoundary.mjs` | source/config | `53eb7e3523e0d5d488fc1bc3ed2c22d6a283ea405f3418bc4c5c533f0a184328` |
| `apps/server/scripts/checkStatic.js` | source/config | `05cf06b1695f623b2e280d535af6b7442a85fd87960eedae426a303a658d8dde` |
| `apps/server/scripts/checkSyntax.js` | source/config | `57afa3beee724c5efc84619f0246a8ae38933b6dbff9d7d114fa60c912e5e3c1` |
| `apps/server/scripts/seedSettings.js` | source/config | `68c640ba0b86b3b58ef888ebf5fb5d3c07561d3b85997528c58a62a627127bf9` |
| `apps/server/scripts/verify.js` | source/config | `5a523b70f6c153a7edd393f3ff5ce07f6966a0a2ec884b6aa1320a3da5ff0b55` |
| `apps/server/scripts/verifyDb.js` | source/config | `b2f5d2e1aef873a4b9d44b7e812b79b54065fa5c05732c4f28c1b76ca943413f` |
| `apps/server/scripts/verifyP5Free.mjs` | source/config | `41ba6a0d7827245e315a70776f6ff210a25cbb4257d64ada7c7bb731eeb54aed` |
| `apps/server/scripts/verifyP6Free.mjs` | source/config | `b624360ad3786cb8fd54ad7fdd69b6b3805377f8cf78619211a91f6276173cc7` |
| `apps/server/scripts/verifyRuntime.js` | source/config | `bd9307428c8261966d6b0640f7cdfc909a79d8cd202febb9a783ca492919ad72` |
| `apps/server/server.js` | source/config | `6425bcf0ff7477f4e4c20ace07bb335b5f3651031cfb06cf9e36ac5d5229d092` |
| `apps/server/services/agentExecutionEngine.js` | source/config | `b489e2ec3a4b3993d20a226aff93d0ec3645b6b5693b605a872e336e7756b0ec` |
| `apps/server/services/agentWorkerService.js` | source/config | `7f972262aaf343bf3634550b81e3fbfe1a3014c22eeb09a9c6c5de716958e1bd` |
| `apps/server/services/aiService.js` | source/config | `67dc9f94b534471ba2fb87e331cc5600a73571bb7d86a57eb0970d1035c04951` |
| `apps/server/services/auditLogger.js` | source/config | `18fa062c32312a59d06dc046cd39c77d0c73a7d58b174c0960291c6e06b2ff22` |
| `apps/server/services/automationService.js` | source/config | `740f3b088ef312162f0410beeaf6ea0d345ea3fd25bc0725927c193d18332a54` |
| `apps/server/services/cacheService.js` | source/config | `76ea59ed8aa2acc51adf4f58eeb9a59498ef3a5d82750a4711d6cd43aa636e66` |
| `apps/server/services/contextEngineService.js` | source/config | `949dec4989afe5e30f60502d9b58c0045795ac6a654482f347e125314f264106` |
| `apps/server/services/conversationAccess.js` | source/config | `820e43d87507416cbfdc9f4f100f6f660e16a1672ecc4dc639c5f99f99406af7` |
| `apps/server/services/conversationTurnCoordinator.js` | source/config | `7b14082b12069e5bc0e12017c020e6a33e94e478fce554236cd7df096aaf17ff` |
| `apps/server/services/deploymentService.js` | source/config | `fac52a344fe92f23d07194532b1b4d1bda7d112b88656e520f8ef9b2786b042a` |
| `apps/server/services/emailService.js` | source/config | `a363c099a5e862376312dcba29e5eedcbe65fd80043edbed10236b94dd866d93` |
| `apps/server/services/executionService.js` | source/config | `5327e015a62ec556af9e750620bd925f43f322c4ab1a98c21592d2642a488fe1` |
| `apps/server/services/governanceService.js` | source/config | `d3770420313a92ac628b195b42ad6c300a6930c253fc693fa141704168f38d6c` |
| `apps/server/services/identityService.js` | source/config | `08bd510359c43991dce1ac78dfc09a6836afad901e928fafdaaccbe3a81b8bf5` |
| `apps/server/services/index.js` | source/config | `e8bcc83303e04d0ba04a3129ec623e70866dfecb12a232abd31e2081e65e6b18` |
| `apps/server/services/intentRequirementService.js` | source/config | `193d88a510dc293ccad39dbd3533263e9d7fb4c6f0b1569e67e16b570ab2256d` |
| `apps/server/services/isolationBrokerService.js` | source/config | `665b99c5522933ba8ab2062f66e4d03d7923022e76b4fd84aa0fe4bffe44e43b` |
| `apps/server/services/launcherChallenge.js` | source/config | `31d0b269e86b479c9be37727d2a4c3ad4856faee56a26a5a64b014f2f4490fe8` |
| `apps/server/services/memoryService.js` | source/config | `84fccb53059615321a9016dfb5a15d984ecad169c975cf1e04c241bb7c78778c` |
| `apps/server/services/notificationDispatcher.js` | source/config | `13061e8dbcc3ee0f75ef1bf59a94aee611ed08e5fce5555f054849f47f9cfc6b` |
| `apps/server/services/projectContext.js` | source/config | `cc1ebeaf7ed72a13b841a55b08d04c244f35ddcf0ec0d53ef2ee400a683390da` |
| `apps/server/services/projectScannerService.js` | source/config | `c180f1f1c5b7cc55f49bba56becc9305d71ebe77b0c6bbb5cefa6e7e86709687` |
| `apps/server/services/projectService.js` | source/config | `3a34847d13cb827379546bd5e49d8d5eda67742194d27b834ec13c533a28d74d` |
| `apps/server/services/providerService.js` | source/config | `0c1697e0d1c24fbc385b25c19ebecbc18b1ddab236973b15f00e983717fdcc53` |
| `apps/server/services/queues/emailQueue.js` | source/config | `720ef70e3d7b76746b221c5b145143ec7f54bc02dc009809bc73b0dbf46c6343` |
| `apps/server/services/releaseRecoveryService.js` | source/config | `16c2b86ae85793d3a6322fa5f3590f6f6a4b9d1d12e4789a88db3d8a787fbcb4` |
| `apps/server/services/sandboxManager.js` | source/config | `360a1859b74374f418f95333a2c868c69664e2c5e83947f92384b481a41620bb` |
| `apps/server/services/secretStore.js` | source/config | `973b42fb42f9493440b432e6581a1effde4eb791d1bf3c1d72544ccde69b3464` |
| `apps/server/services/socket.js` | source/config | `b6666823b7baef4be32587f428bc46d3843abfc50e1e65c279a7f4698507b53f` |
| `apps/server/services/terminalGateway.js` | source/config | `8157e2cc66307367fd916fc9f82df4c61e7b78ae0918d334ec7c80dfcb4c2d62` |
| `apps/server/services/toolRuntimeService.js` | source/config | `96edc0046fef7edc8421bde1df2a63633dc6aacb5150b5b97241357f93fe7f5e` |
| `apps/server/services/turnLeaseService.js` | source/config | `04b97a4180aeaca321d9ca72b9dcb8de210f7d5a8ffc8f91e9d814c0e60a42ae` |
| `apps/server/services/verificationService.js` | source/config | `26653c7a101ea0fdc41c4ba41a079244491f26eeda06f70ca5dc2be76e2bba7e` |
| `apps/server/services/workflowOrchestratorService.js` | source/config | `e34ffe02ca080194ec386c48db9ec1ce806aeb9a64c1b5c6e9678f785423a12b` |
| `apps/server/services/workspacePathResolver.js` | source/config | `ee780c4517f873adf641c83db1d6e1fd5da16cd7facbee2b6fe820bdc39a3261` |
| `apps/server/src/assets/index.ts` | source/config | `37c9592eaba12c6db547b690ce344356bb3b100b3f879b4da744b646e70f2ff9` |
| `apps/server/src/auth/index.ts` | source/config | `d4eff1219705c8e4fc1a7d773e437859304eaee5214e24feffe187ee6344f8a2` |
| `apps/server/src/background/index.ts` | source/config | `131cc510ab293ee90c2b6a3b962bbd2b90893e2dae16bbe4f58f0bfc49bcf0eb` |
| `apps/server/src/checkpointing/index.ts` | source/config | `ac7c8d0396778dfe773ffe3f4b1e881857eef3a0884c34b3a8c39b6bca1d16bc` |
| `apps/server/src/cli/index.ts` | source/config | `03cad19f357ec693e1df0a4b59a2a2d289d62594682edc78dd00059f85ee40ee` |
| `apps/server/src/cloud/index.ts` | source/config | `1fba928380cb0ecd8e50251b95d919f78dc81382a1f6439a80f6d575e6a5aa2a` |
| `apps/server/src/context/contextAssembler.ts` | source/config | `7b07f78fd6546a3ca2fcf3f0208260f62feba7f1d16b076659efd7b4fd728a1d` |
| `apps/server/src/context/contextContracts.ts` | source/config | `c08a147a2537278dcb12e72400df667014fadfc2f7fbf17033b2fa488d623686` |
| `apps/server/src/context/parserWorker.ts` | source/config | `c0bb066f61469cc5e15d9fd4b7c10391547df95a63e2873ac1fce4b323c5a0b2` |
| `apps/server/src/context/projectIndex.ts` | source/config | `c35f93f13530cd523167b5d59e0033680506acaaf7440f344293a66db1423956` |
| `apps/server/src/db/schema.ts` | source/config | `8a8f3efd99aaaaafaaf42121d3b081c072a1cb9063f6bb64deb6125a7521e262` |
| `apps/server/src/db/transactionAdapter.ts` | source/config | `a101ac95ac9c45f6c890d3caa9470be0e3bcccb7f8f139db679954f976d01eed` |
| `apps/server/src/desktopUpdate/index.ts` | source/config | `bf95e5432751cc331a8b5fb62acf2cee91120224d4f67c7046e7d077b2e75dd8` |
| `apps/server/src/device/index.ts` | source/config | `0087dda825abd01aa18849f3e8d5fe701f85ab1e66dba45576c5c7a81869b5c7` |
| `apps/server/src/diagnostics/index.ts` | source/config | `9cc01ec6639f2d5f57f91a778ef8ef7902d249064f8b4cf03379f1cdcc352564` |
| `apps/server/src/environment/index.ts` | source/config | `652f5e64cf712fd2163777c2479edfd9e1655401d18f2a0d3790fef7a764b901` |
| `apps/server/src/execution/effectJournal.ts` | source/config | `a4e904afbff90a5da891b51f4017f361b28462a3b1dbbbba5270f984235debaa` |
| `apps/server/src/execution/runEventStore.ts` | source/config | `8075242771add831463d0a655b462b781796aa52ec184dd3a76949ee3bca83a9` |
| `apps/server/src/git/index.ts` | source/config | `d62d7df077b3c406860c8303723afe46b7c1eb8c3867b37143b1e130e209b2f6` |
| `apps/server/src/guest/index.ts` | source/config | `2a0e3b6d750f997e8a435364c30313e73e8f7aa89bf52bf94bc3ad93446a8071` |
| `apps/server/src/htmlRender/index.ts` | source/config | `7fddb2c18decc7cf298affcd800343f66e1f72ad588754bde75eb3cf79ab2190` |
| `apps/server/src/index.ts` | source/config | `f2d2f979f6b18e6b656b8e3db3333331ada52aca894f3d3ac49d36069e37120b` |
| `apps/server/src/mcp/index.ts` | source/config | `b012adf5e491ee54fe39197697435a7bf2047175cc6f5ffc97a3c168effb2ea8` |
| `apps/server/src/mcpApps/index.ts` | source/config | `d1cefe2b32a00eeb82eab01c336625a93911363870ff4516085c822b0091f17d` |
| `apps/server/src/observability/index.ts` | source/config | `41c67ac9bcb7df4b336823c70d2048c1f8016064af9f4ce3b4fb4656b86edd62` |
| `apps/server/src/orchestration-v2/index.ts` | source/config | `9a3f55e06c757f85c12d8c51d727e33db7f70c3dac8c2805c0cb427f246b9da7` |
| `apps/server/src/orchestration/activityAdapter.ts` | source/config | `5c3fb9de25ebbfba6c164a695c0596ef8066aa79fc1a2101920356de53e619a5` |
| `apps/server/src/orchestration/checkpointAdapter.ts` | source/config | `ab8aae780ebc14c4ed5cd604407e67a0b09e71b27e8553d88de2aca7fb956caf` |
| `apps/server/src/orchestration/delegationService.ts` | source/config | `6f5c3105d88516d1c4dc86cdea5ac6ae74686f746ba847a7e0e6bc9eb3c793e8` |
| `apps/server/src/orchestration/executionService.js` | source/config | `fc809355d368f27fa39630fff4ae6604665579136026c0e57f43023cf7b8f730` |
| `apps/server/src/orchestration/graphContracts.ts` | source/config | `dcf75ada1facca1aa9a4ff1e3e0a0ee37c76e5f2bc7f4f2e84bbabe42d9a65e8` |
| `apps/server/src/orchestration/graphRuntime.ts` | source/config | `a1fda6229a26772df8809e465179b142e2b303277c4b23b1958e6b340a0779f8` |
| `apps/server/src/orchestration/workspaceGraph.ts` | source/config | `b10a39f05d73af2f23426f6875067d0aee2b73cd29b44d3238fc36f3fc979baf` |
| `apps/server/src/peer/index.ts` | source/config | `f9654b687b2198d75b89a277621ba1fe12169c0015462bef9a5b7f9b8fc43e88` |
| `apps/server/src/persistence/index.ts` | source/config | `b2b5c0c0b9a5d0a02bc5cbf5a889ca72150b6fe68c42a8235ed462474a21d93c` |
| `apps/server/src/preview/index.ts` | source/config | `c7ba8b25ca4bb774c749f3b7d6741103bc467d77989298ea73357d6b4c06cd2f` |
| `apps/server/src/process/index.ts` | source/config | `f0f2697eb382473be23a0f6be17db9b5a28af6abc7794a3d8c22fbb3c09172f9` |
| `apps/server/src/project/index.ts` | source/config | `bda7907eb64fb01b56f246f5b2940b6ff4074174bb9c167cbb3d3573d5f6f9e2` |
| `apps/server/src/provider/index.ts` | source/config | `2cb462f0ee315bf7ab9f9beecd48b0a77e35a9eab4e7692382b273c9fbec518d` |
| `apps/server/src/providers/aiSdkAdapter.ts` | source/config | `015b79af02d2fd99de4dfb99d93ef7568815ce44b80e653d274f1579b3ba62ca` |
| `apps/server/src/providers/credentialResolver.ts` | source/config | `dcd702d1e19f961828ad0750483b78e41d594b4e3f14a1bcb262d8d4639544b8` |
| `apps/server/src/providers/modelAdapter.ts` | source/config | `8cba00787ba8a4c9107b094c7fcd810359b53bef794afa40ad2cccaaa5290cee` |
| `apps/server/src/pullRequest/index.ts` | source/config | `e04201d9da41b0ba93ce7bbc1b981d0f17e62d199c65154fb1edac76e7bd5e14` |
| `apps/server/src/relay/index.ts` | source/config | `c3ded4fb389733709fb6ec4a705c5c20e5bcc4cd40a6423c97f4e19f0de84751` |
| `apps/server/src/resourceTelemetry/index.ts` | source/config | `ccb9008f6768cb6a4c6c8669ca4d7fd8e0a19804bec75cf2899bbf26123467d3` |
| `apps/server/src/review/index.ts` | source/config | `f4e234bc7b47dad90a2e73b7529d7c79c3491b68d6c0b505d417bec9eaf04eb0` |
| `apps/server/src/scheduledTasks/index.ts` | source/config | `4d34d6ba3d1ba483154e9f7e33672ba50954a083b8c182a5ea84adbb6cf2dba8` |
| `apps/server/src/scheduling/index.ts` | source/config | `28c35a91cefb8558d18c720766686458f117b8079428da2a95bda72692511c3e` |
| `apps/server/src/secrets/index.ts` | source/config | `e43a79cca516217ab7dd53e24294e9a7f3269b9e8005534a4a4190cdc41ce642` |
| `apps/server/src/security/executionPolicy.ts` | source/config | `c43bb606e467d707209442c553f44068d51d0383b72138d7038601c9dbef5ab0` |
| `apps/server/src/sourceControl/index.ts` | source/config | `f4d4d6d5f0f91d0e5dd7ef4b64c0a546255b280315741add235f14efdc0dbd5a` |
| `apps/server/src/telemetry/index.ts` | source/config | `61e940b53d81b2576f70d3ed860af437e8ca03d2e9fa445a88fa68b7f03875f4` |
| `apps/server/src/terminal/index.ts` | source/config | `9d10a1a8edad22233e114f5c77cd213272f8fef787de5dd4d9608507ab289a96` |
| `apps/server/src/testUtils/index.ts` | source/config | `92d94532f6dd89b1f9b4ec6f8dbaeff78ec7f0c437ec4f6221c9c21f13f3e62e` |
| `apps/server/src/textGeneration/index.ts` | source/config | `cd811c50ada5b6732235b4479c8c712f9b9e29fff1e5cb21b9a751d9165bc284` |
| `apps/server/src/tools/gitAdapter.ts` | source/config | `57ee14612c21d92f5405d3b4e596f75a766aa146300c8d7aa1a45c77a8c86db8` |
| `apps/server/src/tools/guestTransport.ts` | source/config | `217f9008d61e21be114893b83ddc294f2ea29c6e3e7519007f6282d7b0e1971f` |
| `apps/server/src/tools/lspAdapter.ts` | source/config | `9e7f9e9b8a907856b4bbec046d5b1c2b8955f9206d052bc81ba5eac6a152e102` |
| `apps/server/src/tools/mcpAdapter.ts` | source/config | `2370c813c7a46e9ac2c21c48315c9306d25716112bf6a139a8cbb158c0c4447a` |
| `apps/server/src/tools/searchAdapter.ts` | source/config | `226a6c6cb597b7291b51285714ea850a05d6c98c9f03ab22098c8370650bd8d4` |
| `apps/server/src/tools/toolContracts.ts` | source/config | `2d108a2056018bb60d9aaafdf392276627e2383270088cf6c50b12964ac1ab09` |
| `apps/server/src/triage/index.ts` | source/config | `603db6069b3233388ab4f0f83d5fafaea6ef9a6956a4b5a3e972ff9260f1e0f4` |
| `apps/server/src/types/legacy.d.ts` | source/config | `fc9967605924a3428679d4db43e6316ebab3185e610d2babb93f2d90a369bafe` |
| `apps/server/src/usage/index.ts` | source/config | `7cfa82ed4b3dbfc975c4745942c3ffaaadc832577906a0740c88513572468dc4` |
| `apps/server/src/utils/index.ts` | source/config | `3388189176a162ec059a26dfea133436878fe7eb823413480eceee1aa990a78a` |
| `apps/server/src/vcs/index.ts` | source/config | `28b576d21b0c14371022d089072ab4446abde5f9fc7d0b185f1d0fa2a0402aca` |
| `apps/server/src/windows/canonicalTerminal.ts` | source/config | `0148c05fa908ed2e8875f62beb11f923fcf9f5e2726477a27ebd8996bc57b9aa` |
| `apps/server/src/windows/dockerRuntime.ts` | source/config | `e52989e1a6baa113e86880e44f41f9e11cd913e218beec2f4e5c968454dad516` |
| `apps/server/src/windows/dockerWorkerAdapter.ts` | source/config | `3e20ea7477ea39d324681ed8638da0d75d882a8efd1aed94e9923934cc2d37e2` |
| `apps/server/src/windows/terminalService.ts` | source/config | `af831d4be660159c39bf8a51bb314a8794432bd67def55bd32f42a73b32f5dcc` |
| `apps/server/src/workspace/frontendController.ts` | source/config | `04751e5fa320fc71e3f670595c65a695c1137ca7a5aadf6f9501a52b2d5650eb` |
| `apps/server/src/workspace/homeProfile.ts` | source/config | `29624f20a087ee31ac602eb910c5beb903ea07c4617f08ec9d99354b00adda18` |
| `apps/server/src/workspace/index.ts` | source/config | `245fffc89c43fc8fdc05834db4439ae8436e80978af9747ca1d3ea44045bc979` |
| `apps/server/src/workspace/nativePatch.ts` | source/config | `a728d927e83b6e1bba48a054dab79a44e11251ce1e1816d7e51740dd20eae9f1` |
| `apps/server/src/workspace/patchService.ts` | source/config | `f703d7da07d0a5c0d0cfcaa6b62173a2a25dd4ef139b451410c7287a3c853eee` |
| `apps/server/src/workspace/workspaceBroker.ts` | source/config | `3e73fb9ce40433a112b5744289e45649f8d1a40d2d87f2a03296038d67e8e59b` |
| `apps/server/tests/admission.test.js` | test/fixture | `21ce174ecc776bcfc2817fc4358c22d68d7e68446544516a5600b1975739e295` |
| `apps/server/tests/boundary.test.js` | test/fixture | `c9710b23ec72a39c61fb89ef5395dae4863539b2c6632ff6de39db9ae1b13c3e` |
| `apps/server/tests/checkers.test.js` | test/fixture | `93cd0db5c7f22f772b5ab21c838686677e1d9ffe3e0a530f20f861a95ec4605f` |
| `apps/server/tests/cli.test.js` | test/fixture | `9e4d549280352fbc01d6318882d777cc637c7e7abd4f06cc511b40a5238e9d66` |
| `apps/server/tests/config.test.js` | test/fixture | `428d68bff43d7ccefa08ad074479c8d61a03e104ea419333d529671c4d5c987e` |
| `apps/server/tests/contextIsolation.test.ts` | test/fixture | `20a5c6c7955747969c93c34327be74bf3e482e544f16948a4aa88ebb215bb8bb` |
| `apps/server/tests/conversationRuns.test.js` | test/fixture | `aad2f50bf0d5db2c4bbf1c26c2c5740479386720945358b9c746908cdf7a33b7` |
| `apps/server/tests/credentialBroker.test.js` | test/fixture | `6a7e82e2ace50b39a07c82774abae216cfa39fe64920746fc9807b3cffae2247` |
| `apps/server/tests/credentialMigration.test.ts` | test/fixture | `0bb9269f34215ea0e388a16d82e9e644aedfee2358306a4251bd5c7f957a2226` |
| `apps/server/tests/database.test.js` | test/fixture | `d973561c1366b5e917810cb528470182160bf8b804f6fecb6703ad686fb2b5e9` |
| `apps/server/tests/delegationPolicy.test.ts` | test/fixture | `62bec9c6cba3d98c67bb4c437e5a083a492ad53266b96aaf76e6654c05447fdf` |
| `apps/server/tests/deployments.test.js` | test/fixture | `96b687e7679ffb376cd9a0a8de870c5454f5f8f48006bb7c88e31f1350a29b81` |
| `apps/server/tests/dockerCanonical.test.ts` | test/fixture | `5957ecaa7fb5de176e3265cdab0d83d951d76e9c50e487084ee5816a5a5ba8a5` |
| `apps/server/tests/dockerContainment.integration.test.ts` | test/fixture | `c77b54ec1466d9dcaef105beb5da1c569567e5fa38ca736ac2338868ed68d4ee` |
| `apps/server/tests/dockerRecovery.test.ts` | test/fixture | `dc688b014cbd0c5fdba5f7740f05f6f879b3ccabb990302beb08efc191c9533c` |
| `apps/server/tests/execution.test.js` | test/fixture | `5ba1470390a4c2c4868a29ceac70502418b0b15ea1ec94cc98411c94edfc82d1` |
| `apps/server/tests/executionAuthorization.test.ts` | test/fixture | `4df76ca2405473338a12251fa3c8221914145a613846f4f337b7a2b990ffe821` |
| `apps/server/tests/executionReliability.test.ts` | test/fixture | `f3602b0f078fcafc14fd6f0659f9f12f36732629d5f5ce453025c3585850de50` |
| `apps/server/tests/fixtures/admission-probe.js` | test/fixture | `36ab8e3d02a69236a01a73aa097f330c8839dca2ac5522b970f69228f7fc7e2b` |
| `apps/server/tests/fixtures/cli-preload.js` | test/fixture | `8aeb6fa118993f502125828c812b49a5195ed2a360aa863e311856fbd42eefce` |
| `apps/server/tests/fixtures/pgDriver.js` | test/fixture | `04eda33c2a4e3748eb6d9ba413846677a46a7cca3fa00651fa9d72423277f407` |
| `apps/server/tests/foundation.test.js` | test/fixture | `4ec78ff1f78476a38bc3d5d5c6a7097d7c42980c320644c01f624ea83e04cd2d` |
| `apps/server/tests/frontendWorkspace.test.ts` | test/fixture | `5e736a70b518de683a3d8ce6afa090234653bb70777e0a2f4826b31cc2dc6ff4` |
| `apps/server/tests/frontendWorkspaceBoundary.test.ts` | test/fixture | `cfa9ce614b273b4ade5b31ec52c968bfa9b16a4c5a35f1bbe101cc5fd9c3aab0` |
| `apps/server/tests/gitWorkspace.test.ts` | test/fixture | `de4cd6482c574dd76a9cee17f5a5b073c4f922e3323e2a703c6a86281c25717f` |
| `apps/server/tests/goldenE2E.test.js` | test/fixture | `b28e6875711fcde7d59c989122074e55469beaa54a3db4e43af8d0ae79ff7567` |
| `apps/server/tests/goldenQuestion.test.js` | test/fixture | `83056e56bfd2f63445d961b94c00fc24e687f1582060c8ecb5631970055db421` |
| `apps/server/tests/goldenReactUnseen.test.js` | test/fixture | `c7446310b7093497896ed0bfb4e9d4302431d19295f3f020ff7151e62a14d6d1` |
| `apps/server/tests/goldenRepair.test.js` | test/fixture | `0a008f09d3e60596a274a245d31f92390197817c715d7c75a7deaedfb44e2d1e` |
| `apps/server/tests/goldenUnseen.test.js` | test/fixture | `f2c71affe2b50dc2e3e7422520ef657091fadbe132699b7a42c8b89899b7b215` |
| `apps/server/tests/governance.test.js` | test/fixture | `b5c895604002d307e2d15bb8571b614444c379466fcce7958da994046ea051a8` |
| `apps/server/tests/graphCheckpoint.test.ts` | test/fixture | `1037c0b32692a87075bc97dfc84472e0719b05a797a2bfde25f5e6b0beab2a0e` |
| `apps/server/tests/helpers.js` | test/fixture | `945da251769f536c62b0b4f9073220165b71a50a84b707fae3bcee9dd3d40649` |
| `apps/server/tests/helpers/p5-crash-child.mjs` | test/fixture | `039c40b277162c682cc7c685a7ff14e450998a738dd82bb368dc97d74eb25183` |
| `apps/server/tests/helpers/p5-fixture.ts` | test/fixture | `603465c617f5d1834480c2185f6161eee107767a658ec0281868bf20d00b9504` |
| `apps/server/tests/identity.test.js` | test/fixture | `461dc54f0e828bbb926a648ac311b0f512dbd8ebbbd3ec9a545e01568c508adb` |
| `apps/server/tests/intent.test.js` | test/fixture | `10ec4502121dd33e9cfd42b7ab9bd19254a3cde667b2e08c9f716df327902db3` |
| `apps/server/tests/isolation.test.js` | test/fixture | `35cf0fb0ed8a7e5b799587f6bdb23feb731df128d964f88412a4122a6f23d5cf` |
| `apps/server/tests/lifecycle.test.js` | test/fixture | `735c96ab36a4d2c64a9194b18a85c1da5d4e7fe47f0f0677b1eee51eae2a5204` |
| `apps/server/tests/mail.test.js` | test/fixture | `3c2e2cba95113e96343ef008908339ca28d2c8deb7d5cfbae58fb4ab1bcc9ce8` |
| `apps/server/tests/mcpAuthorization.test.ts` | test/fixture | `dc19cdd6d869e32abe925978313c3bef0e610a2c3b410bf535433aee2832ed70` |
| `apps/server/tests/memory.test.js` | test/fixture | `3d509e51a0fbc96e4254fc0d6eebb67386096d3668bc936d07f33c2e40b5c84d` |
| `apps/server/tests/nativePatch.test.ts` | test/fixture | `90b973e441e8a5222810958c273b10547893e758db965861de7b7ced498105eb` |
| `apps/server/tests/orchestrationCanonicalJourney.test.ts` | test/fixture | `a89edf798b55dcb48e3ba4623816623736b30d048b75bfa550d0e6588186719d` |
| `apps/server/tests/orchestrationCrash.test.ts` | test/fixture | `d12e3fc061262ad17f138e47492286380dd0a79d180473a7c4f68d8b0976cdae` |
| `apps/server/tests/orchestrationGraphIntegration.test.ts` | test/fixture | `41cf44eb013a67ce3c944caccaf160db0114df2ed01b3812917710b6602da371` |
| `apps/server/tests/orchestrationGuestVerification.test.ts` | test/fixture | `9ef2647d887e4fcadfc9b3d27b360188edd0311510d776cb1aacaad6503536ec` |
| `apps/server/tests/orchestrationModelRecovery.test.ts` | test/fixture | `658e2e59b73700237f2a7cf729f8b904e77cd6d6646f99c0da26aca8f7c735fb` |
| `apps/server/tests/orchestrationRecovery.test.ts` | test/fixture | `0b870549c4a9cf55290df48d56e92611523f3b782bba4c9b5817c0acaa95b87e` |
| `apps/server/tests/orchestrationWorkflow.test.ts` | test/fixture | `dd96fee37b471c94657b59e3cfd2acc7ed8b24b76d99b1964f05f333d9eaba51` |
| `apps/server/tests/p6CanonicalJourney.test.ts` | test/fixture | `fc1c29ab25da5502aa3500b3c45f6f4bdfc5b9b91415d409fdd6052d761e9766` |
| `apps/server/tests/packageBoundary.test.js` | test/fixture | `675830263219e30d885efd34eeebd57f412dd938a4298cf8ec6aecda9c4346fc` |
| `apps/server/tests/planning.test.js` | test/fixture | `c28ae83afff92dcd6a96bc28b221773c2dacb900c062a82dfd19cb8cbb3ed5d3` |
| `apps/server/tests/problemHelper.js` | test/fixture | `fa41c21bb21f78ee892d32a630e6acc0d6b0e278153639b86b75e604bd9e3efb` |
| `apps/server/tests/production.test.js` | test/fixture | `8acff4052dd6ff12ceec24600de0b5c4a7d55af52305a8ae18eab7f3ac4f1d0c` |
| `apps/server/tests/productionHardening.test.js` | test/fixture | `370202026151e6066a5ff9b7a451546fa34efde63127661fa491835ff7258317` |
| `apps/server/tests/projects.test.js` | test/fixture | `f38aa112d32d6112ff66976350cc93a1435bda60b4629488cd5c828677a12ba8` |
| `apps/server/tests/providerActivityBounds.test.ts` | test/fixture | `2ec4903b5ecd21867cb7f4c3b24b40ed6418e47309ad545b674cad835ed16861` |
| `apps/server/tests/providerParity.test.ts` | test/fixture | `c522cebdad22752f3cb73c658b47fcee0dcba4095c4077c8609d7a0389adfea4` |
| `apps/server/tests/providerText.test.js` | test/fixture | `056f2dc66f2145a9d57f83371efba8a38991c96cc1cb22bbfa442b458ea1b7d9` |
| `apps/server/tests/providers.test.js` | test/fixture | `446f885428024fb29b75191d52fc3587ec0049c51e1c52b9d500c1dfcfd1a36a` |
| `apps/server/tests/recoveryUnavailable.test.js` | test/fixture | `d3a5ec335b4076fb313aa5de4681101588157d4fe295dcdfe6aa8b5f5f43f737` |
| `apps/server/tests/releaseRecovery.test.js` | test/fixture | `9eb78b3c2c6ea08683a549d1b196a657dac7163783a68b7725ebe235490a460c` |
| `apps/server/tests/routeInventory.js` | test/fixture | `a67090bec840181a9e2c5817c08e83b9a465df15ee2fcfd5401b10b359141b7a` |
| `apps/server/tests/runner.test.js` | test/fixture | `db12755e43f35b6154d5331d96a127203ae6a196897aff0402caf1c15c8307f4` |
| `apps/server/tests/runtimeConfig.test.js` | test/fixture | `7a8175581707eb6c98526d86dd01450228eed7492282aa02fd4a013179face5b` |
| `apps/server/tests/schedules.test.js` | test/fixture | `4d9e86bbdb49b470fdd042d21e65364c520eb1f6d5884d03517f3131528b574a` |
| `apps/server/tests/securityFixes.test.js` | test/fixture | `5fda15c1ba992fe6641ef1b9ec4134b6331dae7f1ce2279f64b607acc4008752` |
| `apps/server/tests/sqliteMigrations.test.js` | test/fixture | `a2be12c037fe8202cc3cb39e0744677256b67502d8c98c425d8d863eabb74769` |
| `apps/server/tests/standaloneChat.test.js` | test/fixture | `05bebae8fb3334c3fa44cb4435c756e741ba32aa03c83fdaca21c6bbc396c0a9` |
| `apps/server/tests/tools.test.js` | test/fixture | `5bd055f7fe0598a1ffa73590dd57b04acb4a66039052021063387f9deb2d818c` |
| `apps/server/tests/typedDatabaseBoundary.test.ts` | test/fixture | `3df9ff676eb4359c67b0d594500b10ec39773a7b79e375eeadf812c6990cc148` |
| `apps/server/tests/verification.test.js` | test/fixture | `fbe9ae041fb782b21c6938d4e006b28a56ad00cde94a1c4bb4c1493e106b5a94` |
| `apps/server/tests/workflow.test.js` | test/fixture | `493986e9801dc7ce7d8569d3026cf19628b82df7f2ad49a3543faea93486ac57` |
| `apps/server/tests/workspaceBroker.test.ts` | test/fixture | `7005996f2e2ef9d2b264c7247fa1913615f1e33f2ac22b9bfda2ed7d3f93fdcb` |
| `apps/server/tsconfig.json` | source/config | `9869ca263cb326ccd465f1810740fdfc401894f743e7634460d63eb50dae6c62` |
| `apps/server/tsconfig.workspace.json` | source/config | `9c58e4fc5aa8c08564000f7cc64f5a84e4093b096b21db49a30ce0cade01ef61` |
| `apps/server/vite.config.ts` | source/config | `298fc8e72c7d494453718b5b3851ac61deced63b977d937709ebc72e1a4dc66b` |
| `apps/web/design/evidence/desktop-live.json` | source/config | `e8f2819a9c5328b1028ac8d9d0c9f8404f4e1305f521dd4228f660c28465d8dc` |
| `apps/web/design/evidence/desktop-native-chat.json` | source/config | `345fac3ce80112973365737830d8ce2b28c060db681d006a458ec3b41d3f89c3` |
| `apps/web/design/evidence/desktop-recovery.json` | source/config | `08218c924aff942a9fba9b35376111c2ccba9da07e73c7ab7c46aabc8bf4767d` |
| `apps/web/design/evidence/desktop-settings.json` | source/config | `274c3d9498dc6b6b27a93424765aaa80db51bd9863dc1bdc850d6d2459383581` |
| `apps/web/design/evidence/visual-qa.json` | source/config | `88e36f08def9bbfe27cd697d64e48949ebc492c70699f23875723ebfba24ee3e` |
| `apps/web/package.json` | source/config | `dcce96fe9a03ca52dac42a68f62c2f46534db66472d9892c24b11f819ef03886` |
| `apps/web/public/oc-theme-preload.js` | source/config | `b903488b8c3af869cb5c8b947849a916bad0a62e8f82261fdc9abc298a6d7f62` |
| `apps/web/src/App.tsx` | source/config | `cad7f9523bcd7e0fea3c8079eaa30fefca65dec82bbd51d41db0dcb6b6f95800` |
| `apps/web/src/api/index.ts` | source/config | `69ffd926f376449c5173a303de5e87aa2ce3a2584938ebb6e327e177e7088693` |
| `apps/web/src/api/run-events.mjs` | source/config | `4b3b09374fcb417cd3b434ac70fe407b00f7112f1802c72fb74c83c89516fa97` |
| `apps/web/src/api/sironaClient.ts` | source/config | `3d6e05e277b8fec0f308004ec8731a18eb53212ed105844d7c005413cfa5506e` |
| `apps/web/src/api/sse.mjs` | source/config | `cfe98a5737333809096353ea819a86c0f13e9ba4164ffedf333616df18b266dd` |
| `apps/web/src/api/useSirona.ts` | source/config | `dc29bd9ae8cceefd2041b641fa1e224bdcbf5d9bc603696bfa80fbdcc154fd57` |
| `apps/web/src/components/Icons.tsx` | source/config | `db9746af24bccaa80f2ea7e62d8cd31fd16919f89db18c1fd3a50673f46e810a` |
| `apps/web/src/components/MainCanvas.tsx` | source/config | `505e207f5529569c100bce4017896e01c6d58ece9eec0c0c277389e64589ccdd` |
| `apps/web/src/components/ModelSelectorModal.tsx` | source/config | `ce50688f7f8dc3edc63add700a564b49bbb08a17ff40e36635f05d5fd34ac75d` |
| `apps/web/src/components/SettingsScreen.tsx` | source/config | `5664a838e0cd16f2c0bf7c3460bb9e781dbf03f19318dc0fa55cdb855180221f` |
| `apps/web/src/components/Sidebar.tsx` | source/config | `0c1e12dab97f0de98dc23b498735d05adfd2bc6a3910b72c5da0929232aea132` |
| `apps/web/src/components/Titlebar.tsx` | source/config | `949effefc260d4d86b23c5e70e4ebda3a9246f8e23f63984e57a460ac78910c4` |
| `apps/web/src/entry.tsx` | source/config | `415b96c414de98052e7b54d4281236d915dd1accfbd1b48b22af2085a77612c3` |
| `apps/web/src/vite-env.d.ts` | source/config | `65996936fbb042915f7b74a200fcdde7e410f32a669b1ab9597cfaa4b0faddb5` |
| `apps/web/tests/api-coverage.test.mjs` | test/fixture | `6f912ad2b23e06669d56de5c7f5faeb4dfbdec549953e8637191af97f6663e40` |
| `apps/web/tests/credential-app.cjs` | test/fixture | `d6e20f88e834f7a8a7fd0166594387dbd1dea9172181ec7c045d915b049bcffd` |
| `apps/web/tests/desktop-credentials-e2e.mjs` | test/fixture | `b695e2f267cc98dc84dffecfb95dcf3ef0f0d6e73a39fa7551121b6f1136b5dd` |
| `apps/web/tests/desktop-credentials.mjs` | test/fixture | `0423de9be9cd425fc2922b730f980a3ce5adf425cbde062199e2d89f4d4ea557` |
| `apps/web/tests/desktop-live.mjs` | test/fixture | `58963d1f65db40a57189df94904706ba9bb6ec6b7e83e2f23eb2c0b602b4edb6` |
| `apps/web/tests/desktop-native-chat.mjs` | test/fixture | `b65dec2fd6ea036db02b82f84d4f776cfcca7a6843a33d934638340b478644ab` |
| `apps/web/tests/desktop-recovery.mjs` | test/fixture | `96d63cde357350da425cbf7c2243b716f7e4f693290de87e7392698d1c374554` |
| `apps/web/tests/desktop-settings.mjs` | test/fixture | `e4435e2531260b1fcc6636e9e7a407b5473c1e51c51251764372b868830a91bf` |
| `apps/web/tests/editor-diff.test.mjs` | test/fixture | `b57d7674414d0d0535378d8c74a24c86d4223b01f0197126b9769d3d2706f269` |
| `apps/web/tests/run-events.test.mjs` | test/fixture | `0cd8b9f501bd758c69cdb49d5b16964eb0386afdc059f4503d045ff77c024e76` |
| `apps/web/tests/sse.test.mjs` | test/fixture | `1c2fd9ce8f2ce8f8fd9bd700836138cf1b15d0175ffc5bb9a4cb4aed3f164a23` |
| `apps/web/tests/visual-qa.mjs` | test/fixture | `e233d0e1c61902f236f5122c49e52f661fb686378e7df439442c136f6f8c0940` |
| `apps/web/tsconfig.json` | source/config | `a3aa8e137fe986b1acdf6faa9f03da01067059b8344dfa5c19af7baa30ffec35` |
| `apps/web/vite.config.ts` | source/config | `501beb6b31e4d842f36025c491eb8969e44b1bb0e2b7311fe6690d00565d2f21` |
| `packages/ai/example/tutorial.ts` | source/config | `7442e0843015f919a6ee3d003964b8a845fd9d8c7c942648da8afefbfc68037a` |
| `packages/ai/package.json` | source/config | `0bfa51345c856b0936349f2204bb96823d4e57aff5c260f024c168957902c6d2` |
| `packages/ai/script/pack.ts` | source/config | `c19afa9fd85f771c1ed58ee53804806f81177c7e68ebd7695c91a825378afdee` |
| `packages/ai/script/recording-cost-report.ts` | source/config | `d5f443e6544572c5b6b94580f989964c56bb77f1d58fe6c2a118fad37bb545be` |
| `packages/ai/script/setup-recording-env.ts` | source/config | `c19c37e3e95104edd79fc55bbf6b0e7c4ff925182f135e41ab4337e1b7da2434` |
| `packages/ai/src/ai-client.ts` | source/config | `64cfa2a1c31d48c38d3c2e65e69bf3fe4f730e1304af536ea7316e76106552bf` |
| `packages/ai/src/cache-policy.ts` | source/config | `b8cda3046e109f18654f5c859cf48d7dea00b2f8de77bb298efa1236ec44263e` |
| `packages/ai/src/decision-client.ts` | source/config | `46f35f687c6bb5f5e0f81fbe481221396e0c17d655007411f79741b189c19c9a` |
| `packages/ai/src/decision.ts` | source/config | `9e091dc056f765dae4e05013f461b53e3ddcacd02f96bb604b7f0129b3f6d1ae` |
| `packages/ai/src/effect.ts` | source/config | `6c141225e104cb7d8a38c14e6d4561c1a722dc17ebac496c0720ab8f74243871` |
| `packages/ai/src/effort-updates.ts` | source/config | `f7a39cad81c39de8f25d3bb489edbece4d4cde6da8c0eff5d34051e6760a8c79` |
| `packages/ai/src/experimental.ts` | source/config | `e5c3692c413489114c9133829e93a07d1b3e07107eae0978e2796244d8e54cb3` |
| `packages/ai/src/experimental/cloudflare-run-extraction.ts` | source/config | `fb88105922e68436e466a3dd1074a8a7c24d830ddae4638d0b44ccdc29d7c24d` |
| `packages/ai/src/experimental/extraction.ts` | source/config | `b011632a996c8914b5cac61ec15f3f2ecadfce1824056ce68ef3ab353cf32675` |
| `packages/ai/src/experimental/realtime.ts` | source/config | `11eab7a3c159e68a660753c382f1fbf2b1f539278d2f5f5e29675c9d2c056076` |
| `packages/ai/src/generation.ts` | source/config | `f018daaefa6e17a937e561cd9f9ebee4278ee8b7e1ac50213c4d627c8bba0129` |
| `packages/ai/src/image-client.ts` | source/config | `3bea778c28556b7c4edd6fcbbdf53acfbfa569b4b2e311be322afed9953b58b6` |
| `packages/ai/src/image.ts` | source/config | `48133eb0e292f48d1d9e0350f171058d777125be388d4ef82723cc8f820eb525` |
| `packages/ai/src/index.ts` | source/config | `5ac7efe684d771bc3965eda267508dc5e9a6ff14c5d679768e3a713cb0a3fa00` |
| `packages/ai/src/llm.ts` | source/config | `df41c7bc1b7b3445aa822bc242b9dbf5d0b51c5421b2ab4d9de4468a78608c8d` |
| `packages/ai/src/media-client.ts` | source/config | `a55e20d2c34ea2a0a72af1a0619a98dac7c0af9220d6b30c86d1b98a1f8f47f6` |
| `packages/ai/src/media-model.ts` | source/config | `dec79adf98eb6377bb657f0a1de5a17b76b3eabc2d10a041a9ef269a0be738c7` |
| `packages/ai/src/media.ts` | source/config | `8ec1915b72ad8d34e838e95ddc98d06892de39f9406509858c7cbcfc4e6b3877` |
| `packages/ai/src/protocols.ts` | source/config | `ffe7e345d6f5b740c9a5dc93c7e4bb11f7925724b9224e9b7e75560b8e7a334b` |
| `packages/ai/src/protocols/alibaba-chat.ts` | source/config | `bcb0eb0703ec3623a85e3c852d09283465bfa5a97819001a985d4de5fbe4f6ac` |
| `packages/ai/src/protocols/alibaba-images.ts` | source/config | `b5ae50d64032eab49287e0e5ba012b357614c3aaf7fcd5ea32b88820e8f688e8` |
| `packages/ai/src/protocols/alibaba-messages.ts` | source/config | `734b2138de28da58845f80e953faa0f27827205c44b301b1dad4894b2e73a9f5` |
| `packages/ai/src/protocols/alibaba-responses.ts` | source/config | `40e4e6faf72e86f449f49977c8d344ffa69e9ba3b9de9d38e0ab16161ded4904` |
| `packages/ai/src/protocols/anthropic-messages.ts` | source/config | `3123838e49fc4d5b0d995d63233a5342de0d6c04386765e0eabf17b4662eb48d` |
| `packages/ai/src/protocols/assemblyai-transcription.ts` | source/config | `f495c2fc6bf7c745925d9fe95c49fede310eb825ee474fc4c134ea26a357e9ae` |
| `packages/ai/src/protocols/bedrock-converse.ts` | source/config | `1b7e94a64ec3bc3ec397ad16608abbd751d0e5a837f32154e0672c15453c3f82` |
| `packages/ai/src/protocols/bedrock-event-stream.ts` | source/config | `523d68db1005ad899b3b8ea755aae19a22914d0ea75c6ac9fecc4e6af9364ece` |
| `packages/ai/src/protocols/cartesia-speech.ts` | source/config | `b716092b4d5cc45e12a07a2205f174b4e55f8bde09a60f038fee88e34530d1a6` |
| `packages/ai/src/protocols/cloudflare-run-decisions.ts` | source/config | `8653b6f857d6cc57934fad52dce3215d6c5df3f7ad82d50bf02319b71a44bb5e` |
| `packages/ai/src/protocols/cloudflare-workers-ai-images.ts` | source/config | `758d91ea53eba7b6c0091132e8a5a60a47761f041cddb14dd436629757b56b3e` |
| `packages/ai/src/protocols/cohere-chat.ts` | source/config | `d52f3b902a73fc5ac2d47ebef849aa3742769d6287ef5cfd4ede1c97bacf7c52` |
| `packages/ai/src/protocols/deepgram-speech.ts` | source/config | `ad18e8de801a8822c8ff0aef64af1410a5bcc2298665926342c3db4d2daca075` |
| `packages/ai/src/protocols/deepgram-transcription.ts` | source/config | `be84a16673e062c193627559976def4cfda50b3596ecc607d93b18db46cd352e` |
| `packages/ai/src/protocols/elevenlabs-speech.ts` | source/config | `fc84eab1be09d6894c15728379d366715c31268fc965e755e8d908ffe5a4396c` |
| `packages/ai/src/protocols/elevenlabs-transcription.ts` | source/config | `70c8bd49eccf7755f63e29c003d3bbc6fa5194be16806205da64d6a890e1e6d1` |
| `packages/ai/src/protocols/gemini.ts` | source/config | `27c208780fa78d7b12caf9352778d286e455a422b8eb5ed4eeb00fb014f10ce1` |
| `packages/ai/src/protocols/google-images.ts` | source/config | `b12d4a34159af2aee49724f55844706a9524fb6e7fe1eaf4959bf1b3f8f1d374` |
| `packages/ai/src/protocols/google-interactions.ts` | source/config | `9899821ee3850b34fda78c4528204efc3d0c269a52365aa1a9c843bf5b3ef710` |
| `packages/ai/src/protocols/google-speech.ts` | source/config | `fd51d84d765ba332c6585ecdf783c67c43d5ace5c81cad50d0b0eb127ff33372` |
| `packages/ai/src/protocols/google-transcription.ts` | source/config | `9609d9054ae895b19a4b9cff2b8e25e3b70bbe4f2f7933482c938d98014189ed` |
| `packages/ai/src/protocols/google-video.ts` | source/config | `1a5ebb7fe3bf4c7669186a1954c81b4e01cdb14fc4daf2f81b3f62674d34f2a3` |
| `packages/ai/src/protocols/index.ts` | source/config | `83ef118d83819da3010921f52b6b6306b6c4e25c064ac2619c7f2d08510a7494` |
| `packages/ai/src/protocols/meta-images.ts` | source/config | `fb4ad922653cf3dbfe1c8117309efa650d287824587a15c625aaed9483ebea58` |
| `packages/ai/src/protocols/meta-messages.ts` | source/config | `08835d1f546037e53243f0e5719a498316f777128e5eab59a649a0ed9a784339` |
| `packages/ai/src/protocols/meta-responses.ts` | source/config | `2aeeab35507bf9a648591eda9a9ff92a07fcdc75d2e2c3677399965497e77e81` |
| `packages/ai/src/protocols/minimax-images.ts` | source/config | `771ef12f3335b64306eac04b0c38a8efabf4e6d1446738d5cdeaf0db3e104061` |
| `packages/ai/src/protocols/mistral-chat.ts` | source/config | `c89318897f3bdefe22c72180a0f6f0c960b9c7e2f5509b1e5306cf5ca321b007` |
| `packages/ai/src/protocols/open-responses-channel.ts` | source/config | `027b6083bef5fca47d247a840313638f1c8ad67b8ed027226f7fc19ffdafc4e8` |
| `packages/ai/src/protocols/open-responses-continuation.ts` | source/config | `7029d31ef627f7109a5075de468f53ca6443fd8feb413f33616acaa5fb324fb7` |
| `packages/ai/src/protocols/open-responses.ts` | source/config | `f44609dbe3a385a87b72c507ee1c6b049af06d78a11a0988e74f339628ec541c` |
| `packages/ai/src/protocols/openai-chat.ts` | source/config | `b88ce23356da19d050f42be15d525af4bcc84ddff157bb84659f7f33e7925f5c` |
| `packages/ai/src/protocols/openai-compatible-chat.ts` | source/config | `754d5b02fadc593a51dc02dee97e31a4a6671c57ee9d301dcd51ec54c81a7c2f` |
| `packages/ai/src/protocols/openai-compatible-responses.ts` | source/config | `a97c3d9c3b8fdc179237f4fd104a08069bd0797c1e47f6ed3d601ba822812628` |
| `packages/ai/src/protocols/openai-decisions.ts` | source/config | `8d42a7c92b3592dff61995e68db548386fbdbfcbf87c7c01365f176533d21564` |
| `packages/ai/src/protocols/openai-freeform.ts` | source/config | `5c9471f2980b10fd4141925e2f9c5aada4dfb75b606a936ae6eac42b0ae847d4` |
| `packages/ai/src/protocols/openai-images.ts` | source/config | `b596eb52e8240fa853dc21f7e8588492bb5b51d23f9d843c9ed3b963ffb44faa` |
| `packages/ai/src/protocols/openai-responses.ts` | source/config | `c4a4011da5c16487b159c4dfcff91d347a658a8969c8dba302e8c01b44fb0570` |
| `packages/ai/src/protocols/openai-speech.ts` | source/config | `f9d0c73b5a775025af6b8118c6c608bcfbc93309204cfc0225c949217aabedf2` |
| `packages/ai/src/protocols/openai-transcription.ts` | source/config | `6eb22fb53b84098a0cb2f84ae4debc98e113c73891072589d953bdfe9a87227b` |
| `packages/ai/src/protocols/runway-video.ts` | source/config | `70485eecdf9c64d6bea03f776b154337238865f9129c81c92cfd4633348c67ff` |
| `packages/ai/src/protocols/shared.ts` | source/config | `faa89b7df8190bfd3ec39c90acfa2740f7c10be3e21f461fe2770a2620344084` |
| `packages/ai/src/protocols/system-one.ts` | source/config | `0bc68101a124b1fda21841d8583afdf405e47a81d6cccd96530aa995ae7da726` |
| `packages/ai/src/protocols/utils/bedrock-auth.ts` | source/config | `8d0bbac0d5de61132dffcd422a37e9b96301e34a470b45419c8064cd5b209d18` |
| `packages/ai/src/protocols/utils/bedrock-cache.ts` | source/config | `f29801db2b07d1b0427565d3d861203815d33c308cbae290894c7ba758267f83` |
| `packages/ai/src/protocols/utils/bedrock-media.ts` | source/config | `01b3c803bf37f1edfb17b82d3a35c4325905c4b63e6c5caa162932dcb173052e` |
| `packages/ai/src/protocols/utils/cache.ts` | source/config | `6b9e94d93e52c7327f07030b76834a356a06c24d480b3a0823dcdda8a3bf2e7c` |
| `packages/ai/src/protocols/utils/claude-model.ts` | source/config | `cfd5a1c1ec2c948ecb1a1348a02c21e555df5ef6f113a1a7729769a868ca8105` |
| `packages/ai/src/protocols/utils/gateway-protocol.ts` | source/config | `1ac75ec90f00e6a4225824b905d86dfbf94b3760097ed6df7fbeab99e132f244` |
| `packages/ai/src/protocols/utils/gemini-generate-content.ts` | source/config | `b1acb116bd1cd7b590c914be4d332e88c416305c9cfd6e67255978c4a9a571b1` |
| `packages/ai/src/protocols/utils/gemini-json-schema.ts` | source/config | `f522a093b039279f263d3126153165686f4a8d4a891470730802d13c458f717d` |
| `packages/ai/src/protocols/utils/image-sizing.ts` | source/config | `ee6989fcb1e1219d48baa8167bb95839576c334f7d7e82e3615c7a34e44d541b` |
| `packages/ai/src/protocols/utils/lifecycle.ts` | source/config | `5c5b679eee194e0ea449cdee4db9ae5fb23f0fdee1eaa795d86fcd2b5115a7d9` |
| `packages/ai/src/protocols/utils/media-input.ts` | source/config | `4bcac46dc59fbeb25eba911521ccc45b188d569858984ce472fa4b06011c47da` |
| `packages/ai/src/protocols/utils/mistral-tool-id.ts` | source/config | `00b56d62fbd9d48570cea1b42233289ef5aba8fabb211930cbffc1d52c9d5439` |
| `packages/ai/src/protocols/utils/open-responses-options.ts` | source/config | `3b24538fad6164fa886244fd18525291ef7a76c0755f311b939a02ec4ee64a48` |
| `packages/ai/src/protocols/utils/partial-json-options.ts` | source/config | `777e102a8e9598575ca02685650bda7b2a702df378459087ac76594cfcc8fdb4` |
| `packages/ai/src/protocols/utils/partial-json.ts` | source/config | `4d8080c9a60f5c65606ebf66332d3e201b962814836f872003ba94146263ffd7` |
| `packages/ai/src/protocols/utils/responses-checkpoint.ts` | source/config | `e15c01627cb577db4962b1360d3dedf995a497e41064c6c00d360a717b81ebf5` |
| `packages/ai/src/protocols/utils/responses-compaction.ts` | source/config | `0a9874dcfc0e2cada4b6b85c270245b28abe75dfc7dcf8c02aca50d3b5fda6d8` |
| `packages/ai/src/protocols/utils/responses-hosted-tools.ts` | source/config | `94f174ac70637ab68d6c333e06f88f4ac6c06bc1be886f96fdd66ca92f01a51d` |
| `packages/ai/src/protocols/utils/speaker-turns.ts` | source/config | `5d6e1aaaa349503157aed05d3ad3092a95b719fb3a2ebdc527a0743a8ec02213` |
| `packages/ai/src/protocols/utils/speech-stream.ts` | source/config | `0efe33c05cb53c40ff4e0090befe62a128480250c8faa58d3293fdbf38566d02` |
| `packages/ai/src/protocols/utils/tool-schema.ts` | source/config | `f2af2e84854efc725f24cee7d23d90dabeced70a6ff9c49af6514a1daab3e376` |
| `packages/ai/src/protocols/utils/tool-stream.ts` | source/config | `2767cc352059201e940c8e00d2db3b54c94181b51b095dcb7569cca8429b9647` |
| `packages/ai/src/protocols/venice-chat.ts` | source/config | `a84216d3c93d0d29e513309be08b0902e6ff2a8131bf303b75a3ece1af7b2d13` |
| `packages/ai/src/protocols/xai-images.ts` | source/config | `5e2ea8e0b1cba01a1d2036990bc9ddb319c5ebc5669b173afa78a50588f349bc` |
| `packages/ai/src/protocols/xai-responses.ts` | source/config | `3eb37ee16cf4f37767595ceffbe3d5b0b727e36525b544b64833a95dd72aaf14` |
| `packages/ai/src/protocols/xai-video.ts` | source/config | `b739039f75514f8d10130b0622779acad0162fff249e9a9c025bc03f43ea8a28` |
| `packages/ai/src/protocols/zai-chat.ts` | source/config | `875b4d8c8f65e6ac9da2a3f60f1b303864a2f9151e7572755b0a4175abdfdc80` |
| `packages/ai/src/protocols/zai-images.ts` | source/config | `7fd0d832747d8fbb09936b10ca8531ef7da30c2df3433c398799cb5043def0e1` |
| `packages/ai/src/protocols/zai-messages.ts` | source/config | `03301c42660dd2707dbb59146f3dc31031ea70def3ca3ca3d1adb7f066da2deb` |
| `packages/ai/src/provider-error.ts` | source/config | `1fe23ff6164be5b95d2b8c2b8199d4581b964f04383c363294c9332c3dd77a44` |
| `packages/ai/src/provider-package.ts` | source/config | `05972da7c84e4dd215aedf45d962f65d5ed77746d6f95011e53c568f0ad3d806` |
| `packages/ai/src/providers.ts` | source/config | `49d07059552cb5b9b4160e00e51bce101682e45ae6cd09e6cf586a8445462da5` |
| `packages/ai/src/providers/alibaba.ts` | source/config | `5e53e629ae3a406d866dff2233e9c807a8aae9eddef67aff3e3a90c5c621073f` |
| `packages/ai/src/providers/alibaba/chat.ts` | source/config | `2071ff602c624ca424c4780a751c8bb8b8a38d2909bfd55b32c6535bd05d8d41` |
| `packages/ai/src/providers/alibaba/images.ts` | source/config | `2e7910c59517db65d89482d67e365304aef042412b72c1b380db1dd3fd80e219` |
| `packages/ai/src/providers/alibaba/messages.ts` | source/config | `e9b0aa15d18c5a46801ac483ff7033131e70e367cdf228ebf514d8719012fc0a` |
| `packages/ai/src/providers/alibaba/responses.ts` | source/config | `4c130282516d55f6726f603a8f6e60f9f46be904f4237abee668cd0a4fa32c1e` |
| `packages/ai/src/providers/amazon-bedrock-mantle.ts` | source/config | `047da19fcf340d53f5c4a3c16c7b80552fedd0b59960bcfdaeb97429944f607c` |
| `packages/ai/src/providers/amazon-bedrock.ts` | source/config | `a6827b761dbddf87685a4bf0937d2ecc34c650b298365ce067271201492c2a23` |
| `packages/ai/src/providers/amazon-bedrock/mantle.ts` | source/config | `6c03c96c86173369c3a3ff541fc9b0f56e36b5200b29220150197f5b1cc90af3` |
| `packages/ai/src/providers/amazon-bedrock/mantle/chat.ts` | source/config | `eeb739b7e47cdb2c739b9ec760735d726f651cb3f6a1c4044b76d1546ad6a7c5` |
| `packages/ai/src/providers/amazon-bedrock/mantle/messages.ts` | source/config | `f2f7ea2113157fd32fd85189238e9d569f245542ba58f9178965e15f38258027` |
| `packages/ai/src/providers/amazon-bedrock/mantle/responses.ts` | source/config | `2f9bc375182dd1ae668292b78713d428a307921b3804dfa53e5970f007148f8f` |
| `packages/ai/src/providers/anthropic-compatible.ts` | source/config | `a9d0551b3c20014c1c739c3127c3847c913c17efb53cec07c7f85f213fa2150b` |
| `packages/ai/src/providers/anthropic.ts` | source/config | `6fc51aff4bd10c025f7a93625d0823798272313fa33b6a8942912021eda8a3a0` |
| `packages/ai/src/providers/assemblyai.ts` | source/config | `0255775b62e925fe04b98a1fa23b0ff382407b17b2119a03b14f6e45173629ed` |
| `packages/ai/src/providers/azure.ts` | source/config | `b9c9286a76616337cd32f94579a506342929627739476c2e388e2f58ba3a783a` |
| `packages/ai/src/providers/azure/chat.ts` | source/config | `ffd01d7a9b129d8af63f1333f22e81105dfc67086752e27de00224d6a29f4ab6` |
| `packages/ai/src/providers/azure/images.ts` | source/config | `5b4ff4df20cf3865fdff0c8659e81c03d4847270b72408a11cc71c656971af7b` |
| `packages/ai/src/providers/azure/responses.ts` | source/config | `18cb470308a161f3f2ba6add92f038647730ad1769823a128bdd536f5ba08eff` |
| `packages/ai/src/providers/baseten.ts` | source/config | `b30b23faf2b4fc2ac7a9c456a1853fc012284a3e7c3d056677eff51c0d745284` |
| `packages/ai/src/providers/baseten/decisions.ts` | source/config | `09060b44e164d3544ba8e097096ccd6122871eb82085d1fedef9c845865a4824` |
| `packages/ai/src/providers/cartesia.ts` | source/config | `f237acb872e6d7805a39e8f084f2936007c01146684c7e1712b61362a77f6ee0` |
| `packages/ai/src/providers/cerebras.ts` | source/config | `e856b94b17a2caa2d31c37d50df96ab0976a1a43ae6bd6fe04886a274a02e044` |
| `packages/ai/src/providers/cloudflare-ai-gateway.ts` | source/config | `10db61ea21ded4b8f610b5863f957e5ca8e82fa83009de7313faba39cb3f55eb` |
| `packages/ai/src/providers/cloudflare-ai-gateway/decisions.ts` | source/config | `a8388f09ba29972fd8e247ae461261fc8d01230b861ba43fdb5b401769e941b0` |
| `packages/ai/src/providers/cloudflare-workers-ai.ts` | source/config | `c1b63b08b5b34a4b6b7dff7a1d0d4f8eeb0629f6d52000ef49b6c447d52d2c07` |
| `packages/ai/src/providers/cloudflare-workers-ai/decisions.ts` | source/config | `567e990b9833f1c6c8287071fc6d45157e89e64b2a28ac2dc57bce0966e5ab67` |
| `packages/ai/src/providers/cloudflare-workers-ai/images.ts` | source/config | `028db1695f6269842b3f34135c75b9b61f77fe4c0da8511a4de625e9cb0cdb20` |
| `packages/ai/src/providers/cohere.ts` | source/config | `2cb16c2c4cf3631c501111bdd1b234aebb5df3a238b004692aed26f2191ec554` |
| `packages/ai/src/providers/cohere/chat.ts` | source/config | `3461472e5610919c61d0ca109abd4c24d8ba679485098005c75755b7a7a88265` |
| `packages/ai/src/providers/deepgram.ts` | source/config | `cfe227a3bfc8467edfebd4c4b302016da95676fd44708f9b65887c809af0c807` |
| `packages/ai/src/providers/deepinfra.ts` | source/config | `44ef0af9ad199e896a100111f149e3bc8a5ef9519d782e8ac2b4d6d4bca2eae4` |
| `packages/ai/src/providers/deepseek.ts` | source/config | `7153bf8826c54045ddde1bcb63dd977a6ebbf87112d3d528bb4991ab9d37d890` |
| `packages/ai/src/providers/digitalocean.ts` | source/config | `093ccefa12e536bc906ff9a99331b8d207e186bef59f328fad9c6b008a809410` |
| `packages/ai/src/providers/digitalocean/decisions.ts` | source/config | `f955e69343ae2370c16ccd5477ff291adcafb47501629cd92bd64051a51a53b8` |
| `packages/ai/src/providers/digitalocean/images.ts` | source/config | `b8b8d5561fb8847a0f42d99f26af073cba06ef2df2cab0045019ee289e7a4ede` |
| `packages/ai/src/providers/digitalocean/responses.ts` | source/config | `06477d3aafb8e03e7907d4633bbb3c41758fe1aeac46b7c9249ae459938b93ee` |
| `packages/ai/src/providers/elevenlabs.ts` | source/config | `d6ba44787184d2568b2ab5df23fa395c90ba25cc1defdf51be4f61c9622c72f6` |
| `packages/ai/src/providers/fireworks.ts` | source/config | `7b7bb382c954fbaccc8867979346af85119addb46c353c3cffa0c1d7ec50a28d` |
| `packages/ai/src/providers/google-vertex-chat.ts` | source/config | `d2eaa5a1e73c2783069a4091b5ee9a819e996f56ffba217753fb913bda8f42bc` |
| `packages/ai/src/providers/google-vertex-interactions.ts` | source/config | `30f0081f7c551ac9fdb18bced39b2069823d36f14ac0cdf659850c6792234979` |
| `packages/ai/src/providers/google-vertex-messages.ts` | source/config | `856e12788ae41d878ee1c5da63c32d31e65cb36793f9bccf4bdf75026809caec` |
| `packages/ai/src/providers/google-vertex-mistral.ts` | source/config | `b841318588d46410b76161ef4e348fd19ed8a4511430c94fcccf6737bada980e` |
| `packages/ai/src/providers/google-vertex-responses.ts` | source/config | `635408ede6c394afa4d233394823b13d01e0b46c6f32c0a3a4ddbeb5c24f0709` |
| `packages/ai/src/providers/google-vertex-shared.ts` | source/config | `f118389fab2cbc61f3ba1105abb55010095ea748c9630cd8c8d33e82b0843dfd` |
| `packages/ai/src/providers/google-vertex.ts` | source/config | `bd09e51299624df21e78a01fed88a64326445f87cafbafaa3116bf9d688ea608` |
| `packages/ai/src/providers/google-vertex/chat.ts` | source/config | `ae678b10ff9bf9f1324c58076b2ad23742b156da4335e4bd4c7c34241babfc06` |
| `packages/ai/src/providers/google-vertex/gemini.ts` | source/config | `5cf6f202c1380377ae1d739e20cf355302326c7e06c0b345e99a7b4051cc9cfa` |
| `packages/ai/src/providers/google-vertex/images.ts` | source/config | `9b721d9f15f59b00634be522113ba717b3bb62e2333215449860c923a0613248` |
| `packages/ai/src/providers/google-vertex/interactions.ts` | source/config | `0b18e3e25aa31a4d503c6a245b1597ee07022ece4b08d04d6274e8622132fd8d` |
| `packages/ai/src/providers/google-vertex/messages.ts` | source/config | `eefa385ef9fe6d7cb22330fbb51ad47b117f41a112aaf8d82fb36ffed78369c5` |
| `packages/ai/src/providers/google-vertex/mistral.ts` | source/config | `b82e9493fd0d2f42f17bf05c8ad418d4484e1ba3272ca240a760bceb42655c31` |
| `packages/ai/src/providers/google-vertex/responses.ts` | source/config | `421078eebd48f0d9e8ff8379b4d7922ea35d918842631e57b48d853cea07ae6b` |
| `packages/ai/src/providers/google.ts` | source/config | `96ae97b415522a48f1769cbe7b5fafd9036a2a418cc0cd102402c1ffd94ea944` |
| `packages/ai/src/providers/google/images.ts` | source/config | `b3b1a003ebf58cba7125129718992f21e807fb90d08f95120d3f4a9a76616117` |
| `packages/ai/src/providers/google/interactions.ts` | source/config | `13e59de6794d75db1aa7cf866ea9a49cf445703536740c181c0b1082c0c3a64e` |
| `packages/ai/src/providers/groq.ts` | source/config | `fecbd075d5bdefba02f566c2099ea55168c2c14a14b1af4936656aa5d79831ed` |
| `packages/ai/src/providers/index.ts` | source/config | `4cb254d375d81179ce1f108dee9611e1b696543e12add39b40f4b3e2987fa5d4` |
| `packages/ai/src/providers/meta.ts` | source/config | `8027de6aa08368644cb8d5417e915b97acbe7aa943a94534db030057c9427bc5` |
| `packages/ai/src/providers/meta/chat.ts` | source/config | `be37de503aedd8bbcaeffc03559383c2b8cbd378aa86edc8170f37858cb87516` |
| `packages/ai/src/providers/meta/images.ts` | source/config | `deb8ca17f7d0eec1b49c46494d0a4a52c84df8b1b9cdfa7fbdb38bf00de53d71` |
| `packages/ai/src/providers/meta/messages.ts` | source/config | `d37553334b425c0504e366a109f9538f602cd99127413e47eb2904d17c1d1a53` |
| `packages/ai/src/providers/meta/responses.ts` | source/config | `21391b4c3264d5c8030afe9757d1a468980627ce2c8a5fae75d4701f9933c5c4` |
| `packages/ai/src/providers/minimax.ts` | source/config | `602487627e0011998f00fc20f870e5611159306b1a9d50fbc537408b6cc39e2c` |
| `packages/ai/src/providers/minimax/chat.ts` | source/config | `a91dfe7f251ee3c2d307c1df04dc8228950b6a4adb5d6868bd03914ce8dd8ae5` |
| `packages/ai/src/providers/minimax/images.ts` | source/config | `8afa07e7cfb84b8880eff6c14e569ec72ea503371888071844da1386bea531af` |
| `packages/ai/src/providers/minimax/messages.ts` | source/config | `28910499230791703f8f860b2c5b1fc735012533ecc973c4cba21dc03a844718` |
| `packages/ai/src/providers/minimax/responses.ts` | source/config | `7831621e04486962d97567a583d1de9c60a0e964b2ac79cf545a766d4fc66e7e` |
| `packages/ai/src/providers/mistral.ts` | source/config | `29f45bc9d3ab1c2c8d220e0f564359e7d08c3d94465c036fc4e4df85f9d34e26` |
| `packages/ai/src/providers/moonshot.ts` | source/config | `2c766cd8fa56bed14f2da9f1f67852dbf2a1dbb9e0f7fa54504cdda26c4855b5` |
| `packages/ai/src/providers/moonshot/chat.ts` | source/config | `284d4b613bd76d0d025d3cf5c4dc399bc7d6a2b9c5879c6ece2acce6c2ddf876` |
| `packages/ai/src/providers/moonshot/messages.ts` | source/config | `8395892fa40c344ec810450230b05181e4645714ba2b799c15e8eccee01c56d0` |
| `packages/ai/src/providers/moonshot/responses.ts` | source/config | `a80de932b0665caae385f2ae5a29ee4c2fa5654a804a5867c99aecee964b1dd0` |
| `packages/ai/src/providers/open-responses-options.ts` | source/config | `08b6825e07225c45ec603f4633e678ca41bf21910c439050ddddd64e15ffa912` |
| `packages/ai/src/providers/openai-compatible-responses.ts` | source/config | `a2e7095fc21491ec7851d5cd205ac4a738a78e2c2e443f0711b19575a5be77af` |
| `packages/ai/src/providers/openai-compatible.ts` | source/config | `90683e6e2dc7eeb6077bec3f7f316f635834d69fcd988fa069925086c70bd6c7` |
| `packages/ai/src/providers/openai-compatible/images.ts` | source/config | `dbc4d6a49f7a50eab3e23fc05c0289b85242b1c512861f80e109636e33c8ee6b` |
| `packages/ai/src/providers/openai-compatible/responses.ts` | source/config | `555750a1b32517d34da4d0dcba3f7d914b942766b71b592051459972ddd99a89` |
| `packages/ai/src/providers/openai-options.ts` | source/config | `69000a2d5d074599125407f1d434d6c317f8f4ee7cb8871c678859ddc43be70d` |
| `packages/ai/src/providers/openai.ts` | source/config | `af2eb76d2c51a7e5932c35479b194c66cca0a65b56d7ac09dfe81613ca19256a` |
| `packages/ai/src/providers/openai/chat.ts` | source/config | `f061cf1429dcc1b92b9ecba1329ed840a648553c5356a621734fd47f1927cfb3` |
| `packages/ai/src/providers/openai/images.ts` | source/config | `feea2a77e9eafec0595343a166db9c6addb5ce14fb331f3d30ef7e4c9c704d07` |
| `packages/ai/src/providers/openai/responses.ts` | source/config | `ab3d3bebb057a1f46c1648fff245dfa4afd550e527ea5fa7c22d994ee0053ace` |
| `packages/ai/src/providers/opencode.ts` | source/config | `50487849b8f0b78ef102ab14185b5612ed920ff3a34462a940049e8c59c9c59c` |
| `packages/ai/src/providers/opencode/decisions.ts` | source/config | `03fa5dd3bdee68f6838ab6c8e9d208378609d1095f22ee3679823cb1aa298a17` |
| `packages/ai/src/providers/openrouter.ts` | source/config | `a3ab79cf6a9ba9a20b65b4622a7b66912ecaf0b6ba7197dc9b220fca85546be7` |
| `packages/ai/src/providers/openrouter/decisions.ts` | source/config | `5e06735205d1ffc8e159b663ed26a7502b4040d4ea06613f2cf7b4de68c64048` |
| `packages/ai/src/providers/openrouter/images.ts` | source/config | `24bddfac04d306bb04f65d3c2e9ad28e50cb7680e05ea18ef814869b4b1ce92b` |
| `packages/ai/src/providers/openrouter/responses.ts` | source/config | `3d59635e89128e9a46f7d7e0e03a096081ff7cf4073bca80005ea5ad24244738` |
| `packages/ai/src/providers/runway.ts` | source/config | `b93e9c3d954db8b0c9cc37ca16ab9fa377ac6147e99c78f3088c7bb89563645c` |
| `packages/ai/src/providers/togetherai.ts` | source/config | `3ef173e858cece78c39811557fe3c0f42d6894d836c994d6394ed00ebedccb80` |
| `packages/ai/src/providers/typesafe-ai.ts` | source/config | `af15af943a48ef0416ac48cfd43d9ea5e99a59c63249331c17ebc69e7acc501d` |
| `packages/ai/src/providers/typesafe-ai/decisions.ts` | source/config | `d1d49f4a8402a1666848df106c2b4576537ceb298b1e4a9e270666aa6e08af7f` |
| `packages/ai/src/providers/venice.ts` | source/config | `ca8a58379775ed62205b130252cb6470750bf09dc224f85731bfe49a78545dd9` |
| `packages/ai/src/providers/venice/responses.ts` | source/config | `e3b32fb9267ab99e2cb66a4e141c2d70ae3c30f0a41d10a9cc5121ed24f71218` |
| `packages/ai/src/providers/vercel-ai-gateway.ts` | source/config | `0761c6cf7ed5bd2aa3d8b931e50e65cabe7f73b45bec85593e836e2fbf122a8c` |
| `packages/ai/src/providers/vercel-ai-gateway/chat.ts` | source/config | `15db66a009af4caf6180f2d690fa4f6d5f7fd94d1450dec439d7db0cb103cb28` |
| `packages/ai/src/providers/vercel-ai-gateway/decisions.ts` | source/config | `d828ff6c269e6771b3614aecf30cd220d7032807d8988a665d62c3e3cfbdd612` |
| `packages/ai/src/providers/vercel-ai-gateway/images.ts` | source/config | `396fbb6e4754a6b545118a78c3a45f76ee63d514e04f22ead7b3f99a4aa9fb70` |
| `packages/ai/src/providers/vercel-ai-gateway/messages.ts` | source/config | `446376336b1b69f46f2ff427b049195d4e0b5b53124335a17580cff1d763ea14` |
| `packages/ai/src/providers/vercel-ai-gateway/responses.ts` | source/config | `e69214c3b81ed50b741409c0f147f2e34cf25e30baa6877f9d78e03bda9d6dc9` |
| `packages/ai/src/providers/xai.ts` | source/config | `b0cd41404fa5375ca6df3a8b85e76a8d94dff2ea777cb13224c8512ef7f410f3` |
| `packages/ai/src/providers/xai/images.ts` | source/config | `3c9a614a6f260c7aea1b9381defd203778c2e355c8c73a301c53becfb9bbf6ce` |
| `packages/ai/src/providers/zai-coding-plan.ts` | source/config | `41e43cdc7192204dfddf1c2f405ba84898e78af7d2056ea3b161d940e46c301e` |
| `packages/ai/src/providers/zai-coding-plan/chat.ts` | source/config | `834aebe2ee3c3da3072e46789e091a2d399fad7539cb018b99fbfbeedfcb70f5` |
| `packages/ai/src/providers/zai-coding-plan/messages.ts` | source/config | `adbf88cfc1cfaa19399c3bc9c74230bf100917f205fa2d078876a267d00248f6` |
| `packages/ai/src/providers/zai-coding-plan/responses.ts` | source/config | `37822a6e2e48593750114ac48d380d55210a63a5a299a679b81318046d88dd05` |
| `packages/ai/src/providers/zai.ts` | source/config | `c9ea007cf4163169b2323ec9131de39de2e629965b50ddb7980dbde5f2f409d6` |
| `packages/ai/src/providers/zai/chat.ts` | source/config | `b1f238d2d8901c6705a37256171d713c40cd6701d624fe5cc572da624420ba59` |
| `packages/ai/src/providers/zai/images.ts` | source/config | `77aa386cf39ac4fa943cb987f1c3fe6dcb4825dae600f2edca53e407312720df` |
| `packages/ai/src/route.ts` | source/config | `906ce4c309ece8899e5deb73838f84a1c6630ba35ca8dc739321be82159a439e` |
| `packages/ai/src/route/auth-options.ts` | source/config | `eeeb334e2f857ca25417c4ca4291d13d231ec84bc6c04d82bb3a016973eda071` |
| `packages/ai/src/route/auth.ts` | source/config | `cf93fafbb5c0818a45a29d27b4d98dc629a6d75492c42fbd2e0d7db926be1367` |
| `packages/ai/src/route/client.ts` | source/config | `fa6abe394dfdb9ebc9a7dc8ff9d42a3cdbe989636e693f233ef6a5bdff79b8c7` |
| `packages/ai/src/route/decision.ts` | source/config | `8a884c0bafd3b64affcf6fbac8eaea116f3201fb54bf774de82329de0504180a` |
| `packages/ai/src/route/endpoint.ts` | source/config | `b7b7b2e8e0e6f295b7f66c197659446d2ebec1dc79d1d57a50843b7d301dec0f` |
| `packages/ai/src/route/executor-service.ts` | source/config | `c5464bea930d8012e454a6981a0e6a29790cf15d6952bd4748a9cd81d5994db4` |
| `packages/ai/src/route/executor.ts` | source/config | `a2d339f244f46f652ad0d104d9112534b8a5d1590c39e9cf5f4f2b96f7e1e755` |
| `packages/ai/src/route/framing.ts` | source/config | `26919c65307d6acca16e9cd64f89fa22e2ac526ce27dcb1e03a52ce51bf34528` |
| `packages/ai/src/route/index.ts` | source/config | `530c51448a67e87fed8c421d0a51af1ebadeb0e40d30d9373e50318c7d4fd20f` |
| `packages/ai/src/route/media-protocol.ts` | source/config | `daac84c01206de8b6b951786f3ca5a15f7f956160c233c9068650f453ee04b7c` |
| `packages/ai/src/route/media.ts` | source/config | `dd5f77b47dd63be3594da1ed4ef2b71a7e366aa4facd336c0c3fd534fe600d3a` |
| `packages/ai/src/route/protocol.ts` | source/config | `2ec9934e6bf02e833657480717b6333340409dba4fe9d63621ec4b03c98d0419` |
| `packages/ai/src/route/transport/http.ts` | source/config | `0053c1eb159a1df25bcf8ca43ea43dd543dd90b5c0860c6a331e05f6675429cd` |
| `packages/ai/src/route/transport/index.ts` | source/config | `206afbee56459b622d933dbb14d6a37bc81632a65a32460bc2d78f3a1eee069b` |
| `packages/ai/src/route/transport/websocket-channel.ts` | source/config | `54826cc5cbbdeb0f811d11424dbd47c6cc831acd55814800884d0d4e20e08aec` |
| `packages/ai/src/route/transport/websocket.ts` | source/config | `a25828ccee7766b035dcfe21b6f1c0a042300560c00509448a8d5b6aa5723c3f` |
| `packages/ai/src/schema/errors.ts` | source/config | `97bb1c886d0c273337a4f8c35a857815f231e40a42254bef21a7ae913c0bdb00` |
| `packages/ai/src/schema/events.ts` | source/config | `291117c9a7cc9965a21fc69b85db87159b78377882e40899e3d2aef7551ee1e4` |
| `packages/ai/src/schema/ids.ts` | source/config | `26645254d5eee5cf38fa0647849f6030b4f0127f887b9667f79845f42270e973` |
| `packages/ai/src/schema/index.ts` | source/config | `d33d5e12189c21f29c709b41db892edd43e33843a0a01bb0146b6ce705ee1c54` |
| `packages/ai/src/schema/messages.ts` | source/config | `bbe6639fe9c6bf876cd7b5c93e9b89bba4a7311ca11bbb794dcbf9c745a800ea` |
| `packages/ai/src/schema/options.ts` | source/config | `ea0beb5e64316837be02ddbdc6feb6bc8cdf08b17cfe40186c5a5f5c2a6a3f46` |
| `packages/ai/src/speech-client.ts` | source/config | `2d8d2006ce6335451ed583b2e439b9ae0b6d00b4be4dd3c573af6770934cf8a8` |
| `packages/ai/src/speech.ts` | source/config | `1e98c6c1201220fa2646b50ff46bc92fc30d96606b189edf865e85fc522dd98b` |
| `packages/ai/src/testing.ts` | source/config | `00f57eb859de748ca7a318151d31303880afc06c746828dc1228c6183b8255c7` |
| `packages/ai/src/tool-history.ts` | source/config | `498be09acc61d5aad1010c07c797131106e34dccb985d497780fe7ef2112501c` |
| `packages/ai/src/tool-runtime.ts` | source/config | `9a6b21a0317d4f234aa23e74a4b0ecafc773c896aa3890cb4c6834af705018c1` |
| `packages/ai/src/tool.ts` | source/config | `672bbe2cd85618080bbe2a87d95e4d946c8263ffa1462c22ca096f83af3165dd` |
| `packages/ai/src/transcription-client.ts` | source/config | `d4bf06448b1ec734582e099056b41013cbb354cc99c364cb6a90ab22b6b65849` |
| `packages/ai/src/transcription.ts` | source/config | `ba9363bda2040224720d7cf6768ec63a608ba1a4e1ee68141403d9e90f1b651f` |
| `packages/ai/src/utils/bytes.ts` | source/config | `ded678ebe50b50c785304dfeff17a7cefb91891011cc9f84ee468cc9f1e63fe3` |
| `packages/ai/src/utils/json.ts` | source/config | `429b6019351c3532bc31ed93dcf6797c8c3f62483c50ab559eb1b722e4fd5be7` |
| `packages/ai/src/utils/media-type.ts` | source/config | `5fca9fbd9c609edd4b157fe38f942b7201605f665b9399ac2eb32a0d097057c7` |
| `packages/ai/src/utils/record.ts` | source/config | `509f5505d91ffa6afcbfd4bd7d69d4236ad29330798498a4ee04904a0a3a8958` |
| `packages/ai/src/utils/sanitize.ts` | source/config | `ecef6797e71dec423d18ef3b5f7a30797c5d7c69e4ae6336600a91ad146342dd` |
| `packages/ai/src/video-client.ts` | source/config | `d1d45b3cd25e4144513fccf736ff13bf935b388e8f5177061f8ae45ff2394f28` |
| `packages/ai/src/video.ts` | source/config | `455223f75cffaba632a02ef0c36f3bee8288d9f279bb82315a22c10e08ed55ec` |
| `packages/ai/sst-env.d.ts` | source/config | `969c8a9762cdfe863f1a6a802e9f55b021486806909311013ec0357950790fbe` |
| `packages/ai/test/adapter.test.ts` | test/fixture | `e781cc8ecc5282bb11f97e75ddaf43a26548fe040f99489346007a90b96e4901` |
| `packages/ai/test/auth-options.types.ts` | test/fixture | `0ed963613eaa7f20c0f55032cef3e528dbc8b2f6ca57e35cde94bd3e57a42dcb` |
| `packages/ai/test/auth.test.ts` | test/fixture | `bb5426d54442f16f7ed0bde41dd1c508647c242ef78bdf2dec1b0af3394b70ca` |
| `packages/ai/test/cache-policy.test.ts` | test/fixture | `364c76da0f1d5d66982fa17cf70bb29fc8f07831105b19d815fa37ffa0dc4d37` |
| `packages/ai/test/compaction-http.test.ts` | test/fixture | `992cf3b33f2344dcf805e772b6753bc00b3c2892e24724b38c10a03a6786046a` |
| `packages/ai/test/compaction.test.ts` | test/fixture | `5bdee73aa1d01780c77b3c1c969bb9935cbd292542f3c36083b343f856d8192a` |
| `packages/ai/test/compile.test.ts` | test/fixture | `7d2797acb685562f0434fbae7bdfc1dfc4023d06abd32f7fb0907028012acc94` |
| `packages/ai/test/continuation-scenarios.ts` | test/fixture | `4c347b3f871e6ecd6d37dc5673c31667d6d82ddd2ad71d23b6d76a8a59e9743c` |
| `packages/ai/test/decision.test.ts` | test/fixture | `954f8e67594015d705b6ca7e44cf7059615d7ea56b08d701e0dd82fd0768b169` |
| `packages/ai/test/decision.types.ts` | test/fixture | `3e5f1b2e4780f6a10353e03f464c95163d6d98f6048cdace9735e2631e5ef9f7` |
| `packages/ai/test/effort-updates.test.ts` | test/fixture | `62dfd6f80cf3d87d963aa0089aa1073138b8d3d9635fc4b1f27b9bd0645b19da` |
| `packages/ai/test/endpoint.test.ts` | test/fixture | `5f108c1810918458def3afd854e754ba667a00bc1b175a351420795a066679eb` |
| `packages/ai/test/error-partial.test.ts` | test/fixture | `636430020dca423a7214dbc9796197517f04db1b54505f24d1f4da67a921c4c2` |
| `packages/ai/test/executor.test.ts` | test/fixture | `fdf6295a26660a50d59298f802f85f2c5e4bc61fbd528ccbf0f159cd602d5e12` |
| `packages/ai/test/exports.test.ts` | test/fixture | `96b22563aaf2f93e335eb11b35925b70d59a9b6784e6d14ac48607bf31fc9fee` |
| `packages/ai/test/extraction.test.ts` | test/fixture | `2eb4d6dd2f7d44bd5f1c27ec60515c0037b6157c486b0e36b905aaa2f8a4f6f2` |
| `packages/ai/test/fixtures/recordings/alibaba-chat/qwen-3-7-plus-streams-thinking-disabled.json` | test/fixture | `339e7a899ee96e2b420ea8cc276859bd2cd727658e4942e12f2e8cb5cf578ecc` |
| `packages/ai/test/fixtures/recordings/alibaba-chat/qwen-3-7-plus-streams-thinking-enabled.json` | test/fixture | `04575efb91110541e366603f41a45df21d277df6d0ee40f29cc25332e592093f` |
| `packages/ai/test/fixtures/recordings/alibaba-chat/qwen-3-8-flash-reads-image-bytes.json` | test/fixture | `f20db174413ed936c54634797ffe0ae9931ca6107781fb1f9de230bb63749a3b` |
| `packages/ai/test/fixtures/recordings/alibaba-chat/qwen-3-8-max-obeys-named-tool-choice.json` | test/fixture | `d61dc9b044284f66f133277118222c05fdc446096f3f1e5d1c3e2a22fb47ad46` |
| `packages/ai/test/fixtures/recordings/alibaba-chat/qwen-3-8-max-replays-reasoning-through-a-tool-loop-and-follow-up.json` | test/fixture | `e2c881cc63923f5842f47ef4a480a92ca4c0d4177ee269be39584553f2cb1105` |
| `packages/ai/test/fixtures/recordings/alibaba-chat/qwen-3-8-max-returns-a-json-object.json` | test/fixture | `b1ecb20e1d5ba0b3e8cb9f3794742407f4b032101510137c2e046f9e6583d64e` |
| `packages/ai/test/fixtures/recordings/alibaba-chat/qwen-3-8-max-streams-default-effort.json` | test/fixture | `1699a7b67c79bc1d6b40f5994946afbf560d4d75961b3778c32fda0315aed925` |
| `packages/ai/test/fixtures/recordings/alibaba-chat/qwen-3-8-max-streams-high-effort.json` | test/fixture | `abf9f9becb1e50d0fc0502b8eb976ffb6b8bf31f1573820a987eae30398b3c1e` |
| `packages/ai/test/fixtures/recordings/alibaba-chat/qwen-3-8-max-streams-low-effort.json` | test/fixture | `565541e9a1fdd20357a7dbcee68a19d1ad5532df0686f8d7a030433df807c0cf` |
| `packages/ai/test/fixtures/recordings/alibaba-chat/qwen-3-8-max-streams-max-effort.json` | test/fixture | `3835150a8d376cc56c936453ce26ce15f8302180b72b672d3bfd4291f75c1c50` |
| `packages/ai/test/fixtures/recordings/alibaba-chat/qwen-3-8-max-streams-medium-effort.json` | test/fixture | `1085e2f0828e779e3977e3279bef723e78eab41217642abcb705ec9da794418c` |
| `packages/ai/test/fixtures/recordings/alibaba-chat/qwen-3-8-max-streams-minimal-effort.json` | test/fixture | `04d8ecfed33cf63f1fae99d57eccc317e3ed0d73210a0aa906ad4462bf4aae70` |
| `packages/ai/test/fixtures/recordings/alibaba-chat/qwen-3-8-max-streams-none-effort.json` | test/fixture | `87733e8d6238c533f5a67bd3e507bd1448383995c6da435cc6320c137a742379` |
| `packages/ai/test/fixtures/recordings/alibaba-chat/qwen-3-8-max-streams-xhigh-effort.json` | test/fixture | `c9b111de153c11ea6361f67f8bd4dd2ab9d003bcf6e17a305cf5e1d44527c91e` |
| `packages/ai/test/fixtures/recordings/alibaba-images/edits-an-image.json` | test/fixture | `32e58bab9af86486e0ce18bac0584f9aab1d2fedf1ba6e9a5def0bd29aa4d0b8` |
| `packages/ai/test/fixtures/recordings/alibaba-images/generates-qwen-image-images.json` | test/fixture | `11b59d59531bbe53831e0481b8f753b24f790549fd0ba9c22d03478b65bdb748` |
| `packages/ai/test/fixtures/recordings/alibaba-images/generates-wan-images.json` | test/fixture | `7b491ee41f3ff3813ce6c48e0eb0126583fbda18916208cfc25a421db7d61a08` |
| `packages/ai/test/fixtures/recordings/alibaba-messages/qwen-3-7-plus-streams-thinking-disabled.json` | test/fixture | `c958986647eef5a23cb61b1eaef687e7ae267132eda84517bdc926506cb12e57` |
| `packages/ai/test/fixtures/recordings/alibaba-messages/qwen-3-7-plus-streams-thinking-enabled.json` | test/fixture | `dbf12499b13095dd7ac7f9f17d6389fda2471cd05b5e2ea5a8831b966d2cb548` |
| `packages/ai/test/fixtures/recordings/alibaba-messages/qwen-3-8-flash-reads-image-bytes.json` | test/fixture | `084f54a6eeaede61cf408f1cd60b7a2bd679f728d42f8ae665e34b3ce8e59bdc` |
| `packages/ai/test/fixtures/recordings/alibaba-messages/qwen-3-8-max-follows-a-json-schema.json` | test/fixture | `ce7ed967b8365392f0ed26004a97bf0ff64f7987ab9023aa86bebb659278d95b` |
| `packages/ai/test/fixtures/recordings/alibaba-messages/qwen-3-8-max-obeys-named-tool-choice.json` | test/fixture | `3f95ca4a1b6211dfe921ba6c4c9791e2defc2ef1d98963c2280ec6455de3bf96` |
| `packages/ai/test/fixtures/recordings/alibaba-messages/qwen-3-8-max-replays-reasoning-through-a-tool-loop-and-follow-up.json` | test/fixture | `d9831ac590bce941048e2fc58bc32f396236ce92bbac1071bdc2e6aaebe5d73d` |
| `packages/ai/test/fixtures/recordings/alibaba-messages/qwen-3-8-max-streams-default-effort.json` | test/fixture | `87716cd9491731dcd200f685a5ae095a86ff0bfe699b14a5bd544bfb5ed57f8f` |
| `packages/ai/test/fixtures/recordings/alibaba-messages/qwen-3-8-max-streams-high-effort.json` | test/fixture | `e682d5da1702885d0b343e1aa7609d83f3e961e6e94c32d9c588db851f5d63be` |
| `packages/ai/test/fixtures/recordings/alibaba-messages/qwen-3-8-max-streams-low-effort.json` | test/fixture | `1f76d24e46f4177f4dc8e9e300bf1e8d94bbb0dcff99682373540d62774bb4ed` |
| `packages/ai/test/fixtures/recordings/alibaba-messages/qwen-3-8-max-streams-max-effort.json` | test/fixture | `b956483357425794a9d122ce1000182fffdf7c4380e88d2ed535cc9ec9ffdb54` |
| `packages/ai/test/fixtures/recordings/alibaba-messages/qwen-3-8-max-streams-medium-effort.json` | test/fixture | `9f507a54ce5559808592667bff68f30d6af79b199ff733bc3268f59ea4245446` |
| `packages/ai/test/fixtures/recordings/alibaba-messages/qwen-3-8-max-streams-xhigh-effort.json` | test/fixture | `e0979e7ac6f803cf40c050eca03c73f4c4d489f3c09751f17bb004c2d9307461` |
| `packages/ai/test/fixtures/recordings/alibaba-responses/qwen-3-7-plus-streams-thinking-disabled.json` | test/fixture | `d93d5004f97f5afa4e3a2f10c56cef898fb419b89c6842af583771a75fd1f84c` |
| `packages/ai/test/fixtures/recordings/alibaba-responses/qwen-3-7-plus-streams-thinking-enabled.json` | test/fixture | `5ee52c588714b26b810b9798c2a9c16097798c2e68452791ddfcd4f4f9d65eb5` |
| `packages/ai/test/fixtures/recordings/alibaba-responses/qwen-3-8-flash-reads-image-bytes.json` | test/fixture | `a16dc4e3b1d09d3687ee2e177574aaa068d9306171f3d24cba1647abf1e4baf3` |
| `packages/ai/test/fixtures/recordings/alibaba-responses/qwen-3-8-max-continues-a-stored-response.json` | test/fixture | `f4f335aa51d5deaec85447d55983515e1e1040a41b6ffb99640e76c9b8dc6464` |
| `packages/ai/test/fixtures/recordings/alibaba-responses/qwen-3-8-max-obeys-named-tool-choice.json` | test/fixture | `04fac3beea4037984f5773df088c8e8495fbd6b23add9feebc7f7ca05047eafa` |
| `packages/ai/test/fixtures/recordings/alibaba-responses/qwen-3-8-max-replays-reasoning-through-a-tool-loop-and-follow-up.json` | test/fixture | `732e575150a11c89e047b0e1ab7fe5cfae01c2dc4675a96a50ae849a0f0966c0` |
| `packages/ai/test/fixtures/recordings/alibaba-responses/qwen-3-8-max-streams-default-effort.json` | test/fixture | `b7348fe33280614298b479d5f6ba6d050d6cd02e185f648deb7d3e1b8393b2f9` |
| `packages/ai/test/fixtures/recordings/alibaba-responses/qwen-3-8-max-streams-high-effort.json` | test/fixture | `e8d6315125eb90c5ff09c2635d1f822825fd97f313622e7e62e38a986a7c8e98` |
| `packages/ai/test/fixtures/recordings/alibaba-responses/qwen-3-8-max-streams-low-effort.json` | test/fixture | `b9741cec715e235ddbea23ccb54348e826ee0d7bb670a3fc6b9d0384b8ddf60d` |
| `packages/ai/test/fixtures/recordings/alibaba-responses/qwen-3-8-max-streams-max-effort.json` | test/fixture | `0ddf6e904977d47ac569c8e39671733ee6dfbb1c50ca1ffc63e094e15971505e` |
| `packages/ai/test/fixtures/recordings/alibaba-responses/qwen-3-8-max-streams-medium-effort.json` | test/fixture | `9d0f91ff8d865beb0cb47bdde403f94e95e34b508277203d19a3917be5f18946` |
| `packages/ai/test/fixtures/recordings/alibaba-responses/qwen-3-8-max-streams-minimal-effort.json` | test/fixture | `9c56ddf435818af8af670f5f232db10af13546cec230f1dad631438a67955b0c` |
| `packages/ai/test/fixtures/recordings/alibaba-responses/qwen-3-8-max-streams-none-effort.json` | test/fixture | `d466145054130455310769d9f2ec297fda8e2794ca839667c83c225820f2ec41` |
| `packages/ai/test/fixtures/recordings/alibaba-responses/qwen-3-8-max-streams-xhigh-effort.json` | test/fixture | `207ce27cbe1858d988bf43bff73c4150506f545ae95c2c62f343ec25fa0f3ab4` |
| `packages/ai/test/fixtures/recordings/alibaba-responses/qwen-3-8-max-uses-hosted-code-interpreter.json` | test/fixture | `1b907ba4a84b32bbc571596476212e0d7502ebba3366e11026953bcfe842de59` |
| `packages/ai/test/fixtures/recordings/alibaba-responses/qwen-3-8-max-uses-hosted-web-search-and-extraction.json` | test/fixture | `0eed6fb5e508a32c6703618bbfb1694a65992a734841831f540da678bb4efbed` |
| `packages/ai/test/fixtures/recordings/anthropic-compatible-messages/minimax-m3-anthropic-compatible-text.json` | test/fixture | `77fb397bbabb4136002a273d4868cbe06b92a9c99dac75b9a9fc4a51bcf798b8` |
| `packages/ai/test/fixtures/recordings/anthropic-compatible-messages/minimax-m3-anthropic-compatible-tool-call.json` | test/fixture | `3255ed623b989de1b1bdcc907cabbcee2f91393f3d0a92108f9d9384b2666dc6` |
| `packages/ai/test/fixtures/recordings/anthropic-compatible-messages/minimax-m3-anthropic-compatible-tool-loop.json` | test/fixture | `2223900f6bbde40b6b649d3f00a77d0abc8a2a153dc5c3117618aa0bfee2359e` |
| `packages/ai/test/fixtures/recordings/anthropic-messages-cache/keeps-a-long-tool-turn-inside-the-cache-lookback.json` | test/fixture | `463e7b23fabef24ed4bd2f427da3c668d2af3a17aa7de11389e622cfd1a59e32` |
| `packages/ai/test/fixtures/recordings/anthropic-messages-cache/writes-then-reads-cache-control-on-identical-second-call.json` | test/fixture | `89f4fb026250672c0a09980a0a5ef48faa0ca12933cbbb198a35bb8ae2540cdc` |
| `packages/ai/test/fixtures/recordings/anthropic-messages/anthropic-opus-4-7-image-tool-result.json` | test/fixture | `70e3c0b2a3fabf3c3ca7cd4831ea0ef5a033952b13509c1be36910efc62eb3dd` |
| `packages/ai/test/fixtures/recordings/assemblyai-transcription/uploads-submits-and-polls-a-transcript.json` | test/fixture | `c4ffea66cfb7ee10bc3fb8ed6b9c4ee7fa64945689081c0b9dc8483fc5db8d15` |
| `packages/ai/test/fixtures/recordings/azure/chat-streams-text.json` | test/fixture | `11e25e019e31e9ef566938031122fa18668efa7bc381cc1465ece443a10548ef` |
| `packages/ai/test/fixtures/recordings/azure/responses-calls-a-tool.json` | test/fixture | `354401ec8761a36de50c3f010a68dd69b1ee505ca5baffc1fae9a34ab4600504` |
| `packages/ai/test/fixtures/recordings/azure/responses-continues-after-a-tool-result.json` | test/fixture | `d6dd0d9b00ea124fdc93ad487e58b067ee313a9cba41c7bc028d6c3a23a13241` |
| `packages/ai/test/fixtures/recordings/azure/responses-streams-text.json` | test/fixture | `e705e68abc36d09ab61fee0328cc493249501e7b8b4defbabc986cb1dfa56aee` |
| `packages/ai/test/fixtures/recordings/baseten-decision/decides-choice-score-and-predicate-questions.json` | test/fixture | `37a03d915898a4796a6aaff5ceb6e19184006f03740df54bc3bfea3069165c10` |
| `packages/ai/test/fixtures/recordings/bedrock-converse-cache/writes-then-reads-cachepoint-on-identical-second-call.json` | test/fixture | `784109d89852d3f93783da99d24cb454b95a6803a76100989b001b3fd631730d` |
| `packages/ai/test/fixtures/recordings/bedrock-converse-options/constrains-claude-output-to-a-json-schema.json` | test/fixture | `a4df49df35182b30b5b3f6a73c9b247e5a3412e0d202e528745461ae8feefe1e` |
| `packages/ai/test/fixtures/recordings/bedrock-converse-options/sends-claude-effort-with-adaptive-thinking-service-tier-and-request-metadata.json` | test/fixture | `5a47926c40f304ab39687e3484885f7a15fc72ed54cc26b4d44fa96afc1c85cf` |
| `packages/ai/test/fixtures/recordings/bedrock-converse-options/sends-gpt-oss-reasoning-effort-with-the-priority-tier.json` | test/fixture | `8f7b9ffe7eca8b94e42b4ba58ff2b873a6113f62399608ec7cb6eba046b82602` |
| `packages/ai/test/fixtures/recordings/bedrock-converse-options/sends-nova-2-reasoning-effort.json` | test/fixture | `24829172120c27dd00412a954ab6fb39e97293e4ac1abb0a7b57606d0a6eeba8` |
| `packages/ai/test/fixtures/recordings/bedrock-converse-thinking-binding/accepts-the-default-binding-with-no-thinking-configured.json` | test/fixture | `1ae765b7863f4965289439c46c5df735c0fe395b8dd4d60a9487589217fc17bd` |
| `packages/ai/test/fixtures/recordings/bedrock-converse-thinking-binding/keeps-a-session-working-after-the-system-prompt-changes.json` | test/fixture | `8039babf367786c01247231024d1f433d9e0db434efbebf3741015e08076152d` |
| `packages/ai/test/fixtures/recordings/bedrock-converse/continues-after-parallel-tool-results.json` | test/fixture | `faabd3f38d6f53ceccfe51a8dcba215e9a2d0eca47c14894bca15b0ed2d586dd` |
| `packages/ai/test/fixtures/recordings/bedrock-converse/drives-a-tool-loop.json` | test/fixture | `cf0a18921b53642c3ad041433e4dc394a5b17860ad7d61d17189ad9f72bf8b2e` |
| `packages/ai/test/fixtures/recordings/bedrock-converse/streams-a-tool-call.json` | test/fixture | `fbe116ae2ae8c1dadd78810549c2d5f3cd0cfd0bb88291e399c881e6a85cc4f2` |
| `packages/ai/test/fixtures/recordings/bedrock-converse/streams-text.json` | test/fixture | `bfc458de53cf187937052d52459a542e66da0866b0ecd8893ff82b8226d864c0` |
| `packages/ai/test/fixtures/recordings/bedrock-mantle-messages/applies-mid-conversation-effort-updates-and-thinking-block-binding-on-opus-5-5.json` | test/fixture | `2a0fe86920ad980ee6be7ed5948dafeb922d90107302704a5f711ec56857cf54` |
| `packages/ai/test/fixtures/recordings/bedrock-mantle-messages/lowers-system-updates-to-wrapped-user-text-on-haiku-4-5-with-budget-thinking.json` | test/fixture | `a2a8badd47c253aa57e6ba680d6179e45e515f79ad6457312b8b09c7e0a50896` |
| `packages/ai/test/fixtures/recordings/bedrock-mantle-messages/replays-signed-thinking-through-a-tool-loop-and-native-system-update.json` | test/fixture | `788186decd4a34fba6bbb3eb417138db21b5302cd0ba47d3f3c44c52cc40a3cf` |
| `packages/ai/test/fixtures/recordings/bedrock-mantle-messages/strips-unsupported-mid-conversation-effort-updates-on-opus-5-0.json` | test/fixture | `4f797b7385232604affac7b87e3692240970d0deb080597a1d28886c99797fc0` |
| `packages/ai/test/fixtures/recordings/bedrock-mantle/streams-text.json` | test/fixture | `77c0f8e4fc14bcfdb8c6516f4e7e168bb73e8e3dabb9d25f8c73a45083201702` |
| `packages/ai/test/fixtures/recordings/cartesia-speech/generates-speech.json` | test/fixture | `776588cb722a566eca143a91bb79dc836b4e768aa3f0c422bbd6a3cf1aca1ed9` |
| `packages/ai/test/fixtures/recordings/cartesia-speech/streams-speech-with-timestamps.json` | test/fixture | `ba623d1fbb60f61b8c46a4d9d5ccfd212e89b59045075ff7bd3e35a3dd251235` |
| `packages/ai/test/fixtures/recordings/cerebras-chat/cerebras-gpt-oss-120b-text.json` | test/fixture | `02b055b122633fce05fa1f68a41650b7ea42ba2dd3ebce9171a373b25f58df84` |
| `packages/ai/test/fixtures/recordings/cerebras-chat/cerebras-gpt-oss-120b-tool-call.json` | test/fixture | `7e7362730e8dadff62f74af85e23d026c960b453c9822dadb5cdcc3c82da42b2` |
| `packages/ai/test/fixtures/recordings/cerebras-chat/cerebras-gpt-oss-120b-tool-loop.json` | test/fixture | `500a9afe7175d116ab8bc35dcad21034771df569406e811d7cd4e97a0e10f3c7` |
| `packages/ai/test/fixtures/recordings/cloudflare-ai-gateway-decision/decides-choice-score-and-predicate-questions.json` | test/fixture | `1d1096fc08cd617b821058c8273c9c3ede8aaeff1e27382c7b32d4f6d3eef39a` |
| `packages/ai/test/fixtures/recordings/cloudflare-ai-gateway/cloudflare-ai-gateway-claude-haiku-4-5-text.json` | test/fixture | `1a9d638b92bd2de720831429e3377a4c02c2ca360a26a55676a224902456feb1` |
| `packages/ai/test/fixtures/recordings/cloudflare-ai-gateway/cloudflare-ai-gateway-claude-haiku-4-5-tool-loop.json` | test/fixture | `fd4fbb36e8a3c58071a6875da15fa91a31f92b6003efd16d87b2cdbd37d52e36` |
| `packages/ai/test/fixtures/recordings/cloudflare-ai-gateway/cloudflare-ai-gateway-openai-gpt-5-nano-text.json` | test/fixture | `f5fb52e1a8bf43c5c3b299aa4bd15a244e34a7c08b156d4fbd4366673562e97d` |
| `packages/ai/test/fixtures/recordings/cloudflare-ai-gateway/cloudflare-ai-gateway-openai-gpt-5-nano-tool-loop.json` | test/fixture | `747609390d5b23626849e86cdff7e27c84d0549dc5afecb5547927e5b3615b7f` |
| `packages/ai/test/fixtures/recordings/cloudflare-ai-gateway/cloudflare-ai-gateway-workers-ai-gpt-oss-20b-tools-tool-call.json` | test/fixture | `662b0ad1475771dbab2ec578efa6f12349eb94b1cf30bae36e41eee9f9525d11` |
| `packages/ai/test/fixtures/recordings/cloudflare-ai-gateway/cloudflare-ai-gateway-workers-ai-llama-3-1-8b-text.json` | test/fixture | `d6097e71a4ff974452663d1f0495b0b95942621fa9a8b284a6cd4d7dff695d0f` |
| `packages/ai/test/fixtures/recordings/cloudflare-workers-ai-decision/decides-choice-score-and-predicate-questions.json` | test/fixture | `d180f20ec0ecbc410004baec4b33d789f201bee3d0d458561ee2c55b12b919bc` |
| `packages/ai/test/fixtures/recordings/cloudflare-workers-ai-extraction/extracts-invoice-fields.json` | test/fixture | `4ff73abb7a2cb6350478000ecdb659f12581fa76dfb4024683bd9e1bbc01124d` |
| `packages/ai/test/fixtures/recordings/cloudflare-workers-ai-images/generates-a-flux-2-image-from-multipart-fields.json` | test/fixture | `fba2a6a2e9aea6e02a6028d31e14a2275dbe631464e348f97cec2584f076b73f` |
| `packages/ai/test/fixtures/recordings/cloudflare-workers-ai-images/generates-a-raw-binary-image.json` | test/fixture | `01822de89476141b967fa5cc9922002be115f5d7ecfa74b4c64f2ad13f481b0e` |
| `packages/ai/test/fixtures/recordings/cloudflare-workers-ai/cloudflare-workers-ai-gpt-oss-20b-tools-tool-call.json` | test/fixture | `ec3556261a37672e5554362f9b0210b914c7479bbd967f2726b272fa1e7c65b9` |
| `packages/ai/test/fixtures/recordings/cloudflare-workers-ai/cloudflare-workers-ai-llama-3-1-8b-text.json` | test/fixture | `0510a9001dec44f58aff58441e2f4fa60a393d158d68e465b70263b83e0b090e` |
| `packages/ai/test/fixtures/recordings/cohere/continues-a-native-tool-call.json` | test/fixture | `24929e5e37379aec20fcd8c5d8c02c8f44bc7daebd2e14ebe74c14dbe27a46cf` |
| `packages/ai/test/fixtures/recordings/cohere/streams-compatible-chat-reasoning.json` | test/fixture | `f4c5404be1bae808c379b410550875ece1b954f4201f073d9c9d4d8d4f000b1e` |
| `packages/ai/test/fixtures/recordings/cohere/streams-native-text-and-usage.json` | test/fixture | `b13de1fea27c311d2d2b1632bbba55e903112626e4730e9f20166215c9e70d6d` |
| `packages/ai/test/fixtures/recordings/cohere/streams-native-thinking-with-a-budget.json` | test/fixture | `3f8aab784457dcfc37c86282d17a80f21d26323969134c7ed26881a11c086fdf` |
| `packages/ai/test/fixtures/recordings/deepgram-speech/generates-speech.json` | test/fixture | `16361770aafa490bfd50171efcf559a6c4d4353bf358cc05138b8a1249be6e20` |
| `packages/ai/test/fixtures/recordings/deepgram-speech/streams-speech.json` | test/fixture | `4816437faca00999d030a4189ece224c4a82db820ea4135fd12bfb141623a772` |
| `packages/ai/test/fixtures/recordings/deepgram-transcription/splits-utterances-at-speaker-changes.json` | test/fixture | `b67f4ed7edbbfb3b8ea706e7427aefda5c50878eed06c42e663807ac25eb08ed` |
| `packages/ai/test/fixtures/recordings/deepgram-transcription/transcribes-raw-audio-with-speakers-and-word-timestamps.json` | test/fixture | `3630da4a0693bbe30d82720780d0412ba667b82ae52f2384b631fcdab5fcd269` |
| `packages/ai/test/fixtures/recordings/deepinfra-chat/deepinfra-llama-3-3-70b-text.json` | test/fixture | `78018f37df2b1fcedb608a9ce0c456cee592eef9029a6b0a79118bdcd90dca93` |
| `packages/ai/test/fixtures/recordings/deepinfra-chat/deepinfra-llama-3-3-70b-tool-call.json` | test/fixture | `95aa7374c18a45af299b4b7ec466455c172f528ff2b02cd944fbd254ab43dc13` |
| `packages/ai/test/fixtures/recordings/deepinfra-chat/deepinfra-llama-3-3-70b-tool-loop.json` | test/fixture | `6bc10c8174fcbaa0835c526fdfb467d9b5e9803b62834abbe820d8167702e8bf` |
| `packages/ai/test/fixtures/recordings/digitalocean-chat/gpt-nano-continues-a-tool-call-with-cache-markers.json` | test/fixture | `171d8dc43b2affc761f07a4d1a2bd3370fca1cfd415d4b4bee6c97b02d3de5c5` |
| `packages/ai/test/fixtures/recordings/digitalocean-chat/gpt-nano-reuses-a-cached-prompt.json` | test/fixture | `0def3d041569ce0863f44fc92a67311bd0aabf4a90e747609f63832ffba4d4ac` |
| `packages/ai/test/fixtures/recordings/digitalocean-chat/haiku-continues-a-tool-call-with-cache-markers.json` | test/fixture | `87875b2c630fdc7260b7316a1f76e8136bff51206de020840fd8863096f5056b` |
| `packages/ai/test/fixtures/recordings/digitalocean-chat/haiku-reuses-a-cached-prompt.json` | test/fixture | `10b4a1f89794780061411d322d9a846c24f4ef15f03b22ff1490b9f770f5a448` |
| `packages/ai/test/fixtures/recordings/digitalocean-decision/decides-choice-score-and-predicate-questions.json` | test/fixture | `225a4a59de151b2e99dd7f6f97eff1bfec93eae334f27206fc68cdd65694f18b` |
| `packages/ai/test/fixtures/recordings/digitalocean-responses/calls-a-freeform-text-tool.json` | test/fixture | `73a0ab57a837f2b6d65074e499c6cc29de55745e07fddbad678ff0a247e87ec9` |
| `packages/ai/test/fixtures/recordings/digitalocean-responses/continues-a-tool-call.json` | test/fixture | `9ce530f856057632dca96501e5b8cf6f48be63f64298e7272cfe25b98298f82a` |
| `packages/ai/test/fixtures/recordings/digitalocean-responses/streams-text.json` | test/fixture | `700f96dbbee37b4ae1a2cad0cd4897cd8e04c445ca6ff706b39ecd5347fb682e` |
| `packages/ai/test/fixtures/recordings/elevenlabs-speech/generates-speech.json` | test/fixture | `db77a4ba0312898a7af686709654c51dc61a3439c02c553af0b13051895ab893` |
| `packages/ai/test/fixtures/recordings/elevenlabs-speech/streams-speech-with-timestamps.json` | test/fixture | `fd8e7207e05dc93d484d3033d2de2dbbaa8b8065034a8a60486a6726363bbd8c` |
| `packages/ai/test/fixtures/recordings/elevenlabs-transcription/groups-diarized-words-into-speaker-turns.json` | test/fixture | `2e39a53c002daa9bc15f946ae6d378500ff201ca3e4396ff380239f0e7a5c18d` |
| `packages/ai/test/fixtures/recordings/elevenlabs-transcription/transcribes-audio-with-word-timestamps.json` | test/fixture | `da133165a091e363f5317f24965fad0a1398abdbda6fcf3becdf25cc05f0c7f8` |
| `packages/ai/test/fixtures/recordings/gemini-cache/reports-cachedcontenttokencount-on-identical-second-call.json` | test/fixture | `c17f20ec18b21e92d276d63c5d684c79b89c3dfd94cc99ffedcdff4321880c30` |
| `packages/ai/test/fixtures/recordings/gemini/gemini-2-5-flash-image.json` | test/fixture | `3a5d27e291377d9cef190de1a36bbaf99986d4355e65942f7a0eed0a5bcc9fc5` |
| `packages/ai/test/fixtures/recordings/google-images/edits-an-image.json` | test/fixture | `58852acdec49bafb2337eeb890cc28b5528636867d459a2c3387bdbf2823239d` |
| `packages/ai/test/fixtures/recordings/google-images/generates-an-image.json` | test/fixture | `6334abbc601270bff13103e67d3611cb3c96b9c4d54a553cfc387ef1fd97f1a9` |
| `packages/ai/test/fixtures/recordings/google-interactions/continues-tool-results-with-previous-interaction-id.json` | test/fixture | `68121c557c3303c6bfa8896f092d431330114c15e8aad749e4b564ea7775a9b8` |
| `packages/ai/test/fixtures/recordings/google-interactions/replays-native-tool-results-and-signatures-statelessly.json` | test/fixture | `912e06130d12caa446cbbbdbc20b2146bd416be5b774ef776962aefed55f9f5a` |
| `packages/ai/test/fixtures/recordings/google-interactions/streams-reasoning-and-retains-thought-signatures.json` | test/fixture | `c9f1399b0c60391655a09d2aeb16b0a1d68c7582ae9ccff985072661bc1f0a2a` |
| `packages/ai/test/fixtures/recordings/google-interactions/streams-text-and-reports-usage.json` | test/fixture | `bc52ae599736c103682466cc9256f7f21b279b5ae075c3eb439a96e628ab9f09` |
| `packages/ai/test/fixtures/recordings/google-speech/generates-speech.json` | test/fixture | `42ce929272c1bf91c9713ce3c647c2ae4e57690717b3f059d496743d164e2335` |
| `packages/ai/test/fixtures/recordings/google-speech/streams-speech.json` | test/fixture | `d2cb996f14b392061b179ecfe8a5217051abdb1a896963bb2f8c3d1a84ff11f0` |
| `packages/ai/test/fixtures/recordings/google-transcription/streams-speaker-turns.json` | test/fixture | `7f852cbe2442c6aa93742161f6d590107fbf26b74f09590d8e375297947952c7` |
| `packages/ai/test/fixtures/recordings/google-transcription/transcribes-with-speakers-and-word-timestamps.json` | test/fixture | `942dc8991fb1760ec08708481d64d4c47fa6c368bcb2fa110f82d772dd4b8442` |
| `packages/ai/test/fixtures/recordings/google-vertex/calls-a-tool.json` | test/fixture | `66d5d0ce34667fed044001f4cf5504ea4874e04c620a0c9eb1f5f52e12483ff3` |
| `packages/ai/test/fixtures/recordings/google-vertex/continues-after-a-tool-result.json` | test/fixture | `27cf582a32e4a5e7c029d932fd9ebafa5fea8cf30d6f55b64b0d7033e0472f2c` |
| `packages/ai/test/fixtures/recordings/google-vertex/streams-text.json` | test/fixture | `d77a98805dcaa94f6b255fa2019f4a596981d0ab24d8b6a0d11358df729c0eb8` |
| `packages/ai/test/fixtures/recordings/google-video/generates-a-video.json` | test/fixture | `c9c349fc56119f3ddd01587a80cc10d0539e36400d8c34aaa4b5f1a8b5e86c07` |
| `packages/ai/test/fixtures/recordings/groq-chat/continues-qwen-parallel-tool-calls.json` | test/fixture | `ce8e4dc8b6091a1cf76f2901f93c38708197dfe0b2e83a73f9804ed3ab60980f` |
| `packages/ai/test/fixtures/recordings/groq-chat/replays-gpt-oss-reasoning-through-a-tool-loop.json` | test/fixture | `8b0a66b45e74c361e56052a4ffa6dbcb251f32b045633dba2babf9cf1a0d1a8b` |
| `packages/ai/test/fixtures/recordings/groq-chat/streams-qwen-parsed-reasoning.json` | test/fixture | `3957870f6f19410994cf2066562d13b4ba748fb7791934d3c2f060865393208a` |
| `packages/ai/test/fixtures/recordings/groq-chat/streams-text-with-usage.json` | test/fixture | `7b00c46dc313f599f271019349e5dbd7b90333133c0a3ad58490166f362b9855` |
| `packages/ai/test/fixtures/recordings/meta-chat/continues-a-generated-tool-call.json` | test/fixture | `21a7a4407b9983e75a5dca39d2e440bbbbd9e1392303f3069ebe97e00456b53f` |
| `packages/ai/test/fixtures/recordings/meta-chat/streams-text-with-default-reasoning.json` | test/fixture | `7f08ad79b38722595d9c51938f9d5b4011c1ee27888e33b8a5f605dfeaecf064` |
| `packages/ai/test/fixtures/recordings/meta-chat/streams-text-with-high-reasoning.json` | test/fixture | `245c681f2c34b0a1182877693595da24ae4fc17ac160231830e1192deaeeb81a` |
| `packages/ai/test/fixtures/recordings/meta-chat/streams-text-with-low-reasoning.json` | test/fixture | `f29ea94b2e56f0f9615d33e7b22f7afc13d123f2d514bd2887be90eda48d2aed` |
| `packages/ai/test/fixtures/recordings/meta-chat/streams-text-with-max-reasoning.json` | test/fixture | `16b6b72540b0e46ac80ee048e4573188293796109c7937cf0ce1b1e7d8c0b198` |
| `packages/ai/test/fixtures/recordings/meta-chat/streams-text-with-medium-reasoning.json` | test/fixture | `b807af92487c2b351576f096ac404052ec8fe1e973b4d2afc41f35ccced5f62a` |
| `packages/ai/test/fixtures/recordings/meta-chat/streams-text-with-minimal-reasoning.json` | test/fixture | `36dd4d8ac88712c26ff57a3c9ff1f32eb107f59bbdfd38461dcd51b79dbbe9ed` |
| `packages/ai/test/fixtures/recordings/meta-chat/streams-text-with-xhigh-reasoning.json` | test/fixture | `38b174a6da88f6dbfd6ee5d96d5c58fd0eafc2c633fad99080e8ee9c6b87c8f0` |
| `packages/ai/test/fixtures/recordings/meta-images/edits-image-bytes-and-returns-png.json` | test/fixture | `001d8fd902ae4ded543dcdfa7c0a5e59c0df7f9376a510a892427834473c1092` |
| `packages/ai/test/fixtures/recordings/meta-images/generates-default-webp-bytes.json` | test/fixture | `b27830b38634d83a1692fd05b90505c826ac88d7880af4b51c7d87a6c066c8a3` |
| `packages/ai/test/fixtures/recordings/meta-images/replays-a-signed-image-handle-for-a-responses-edit.json` | test/fixture | `711a1c62b337100316f45d49d4e7cb490489b042fadaebbd06bd6a0fd7c59618` |
| `packages/ai/test/fixtures/recordings/meta-messages/replays-encrypted-thinking-through-a-tool-loop.json` | test/fixture | `4b92c4b1c3a8a9b93886184c77e489a86e530146566fc971b72f114cbd655bf0` |
| `packages/ai/test/fixtures/recordings/meta-messages/streams-text-with-adaptive-thinking.json` | test/fixture | `cea3685db36edbfc24f265b50fcfbf400916b126575b7eab8e7a339a095823ef` |
| `packages/ai/test/fixtures/recordings/meta-messages/streams-text-with-enabled-thinking.json` | test/fixture | `614506f788884c8442c869f3640cc0335ea3b63f6ef50d163f1a48d51c99ffbc` |
| `packages/ai/test/fixtures/recordings/meta-responses/replays-encrypted-reasoning-through-a-tool-loop.json` | test/fixture | `0792441b017317567aa1b803f73e9bd7cd2315d17f92e28f48380b93946bdcb4` |
| `packages/ai/test/fixtures/recordings/meta-responses/streams-text-with-default-reasoning.json` | test/fixture | `f7fb89a75d7dbd31a3366790a424140427b5cb764652be4dde7103c2a58faa4a` |
| `packages/ai/test/fixtures/recordings/meta-responses/streams-text-with-high-reasoning.json` | test/fixture | `c1b0a08a8cba4e3df10ba931eb09d3f4e0127dc608208bfdd6e8c3d8667dc0e6` |
| `packages/ai/test/fixtures/recordings/meta-responses/streams-text-with-low-reasoning.json` | test/fixture | `5d84f4f246d333a2be336a46f500dffb1b0ef45a6634cdba5a3f716cb961410d` |
| `packages/ai/test/fixtures/recordings/meta-responses/streams-text-with-max-reasoning.json` | test/fixture | `6bb0c5e134e1ad7e1f6d44c6b1ccc686ceb29f6756a7023740f84df35b796aa4` |
| `packages/ai/test/fixtures/recordings/meta-responses/streams-text-with-medium-reasoning.json` | test/fixture | `33a8935a1460e0c545ba73d84cfb81e489f6ed2cb4b4e4c8938ff3aa4bc5712d` |
| `packages/ai/test/fixtures/recordings/meta-responses/streams-text-with-minimal-reasoning.json` | test/fixture | `e7ba390c11b41f84e97b02196a033e988fa15bf5fe26c6470423306eeb69a79f` |
| `packages/ai/test/fixtures/recordings/meta-responses/streams-text-with-xhigh-reasoning.json` | test/fixture | `d5a065dcaf5ee098dd120dbfc53c15e0506edd90534015241e9b0b096613d989` |
| `packages/ai/test/fixtures/recordings/meta-search/searches-and-replays-grounded-messages.json` | test/fixture | `a4b26ab15f27a9406afa4167d136169730308aee1dc9c469f57f0709c3e37270` |
| `packages/ai/test/fixtures/recordings/meta-search/searches-and-replays-grounded-responses.json` | test/fixture | `70827398dc3351d78600c79be4340549a1f163c949addcb0769f0c8f870adbc7` |
| `packages/ai/test/fixtures/recordings/minimax-chat/m3-continues-a-tool-loop-with-default-thinking.json` | test/fixture | `2c7b0e147fd7730e84216a298a5f3de88905e3cd64dcce8daf69f7771ef6d104` |
| `packages/ai/test/fixtures/recordings/minimax-chat/m3-streams-text-with-thinking-disabled.json` | test/fixture | `6c150e7f1b4f9c6ff4fc94ac4c4e274fec4dec997183e45c7366d2f5032e8eda` |
| `packages/ai/test/fixtures/recordings/minimax-images/generates-an-image.json` | test/fixture | `e1eaf0cc0d47260c02e6c90a9d2ff237a719d8dfe6e666a724c41a1dc6cc02bf` |
| `packages/ai/test/fixtures/recordings/minimax-images/generates-from-a-subject-reference.json` | test/fixture | `808f7e6783a5081d8ec0b4a6c222fe6a1b4243c091a894b0b6672ad538f4ff2f` |
| `packages/ai/test/fixtures/recordings/minimax-messages/m2-7-streams-default-thinking.json` | test/fixture | `c587de129996702091317f0dfc0edd62867186a8290994bcd86e48b6425939cd` |
| `packages/ai/test/fixtures/recordings/minimax-messages/m3-continues-a-tool-loop-with-adaptive-thinking.json` | test/fixture | `bdb8be4a46b3dbb4d0833c299968bc550b28df883fb9c1f68104202e682b42bb` |
| `packages/ai/test/fixtures/recordings/minimax-messages/m3-generates-a-named-tool-call-with-default-thinking-off.json` | test/fixture | `27a9f6f708903d7ca9bda46aa9f3eb201831de110dbe749bbcfc375041d0ab88` |
| `packages/ai/test/fixtures/recordings/minimax-messages/m3-streams-adaptive-thinking.json` | test/fixture | `0ae7500a9d208ee97d0ff3e231b3220fdf0877ee614e51312b1800510ff06550` |
| `packages/ai/test/fixtures/recordings/minimax-messages/m3-streams-text-with-thinking-disabled.json` | test/fixture | `fd732466cb75936a8e82802ab5b8f255fd5dc8343104f1263a9243e5e7aa3e2b` |
| `packages/ai/test/fixtures/recordings/minimax-responses/m3-continues-a-tool-loop-with-effort-minimal.json` | test/fixture | `755ef453253b47b0510e7c3914644377b515b9c4be95fceb211f0753ab6cee35` |
| `packages/ai/test/fixtures/recordings/minimax-responses/m3-streams-text-with-effort-none.json` | test/fixture | `fcd88681fafc848024c618deaca2612af6ef1ca1a5130bc1263c512aee0f6236` |
| `packages/ai/test/fixtures/recordings/mistral-chat-glm/streams-an-indexed-tool-call.json` | test/fixture | `2dd23e6155d748e0e0c11b85d0bdf2842af44c937057ce3342a5a55ce92e8f47` |
| `packages/ai/test/fixtures/recordings/mistral-chat/drives-a-tool-loop.json` | test/fixture | `94a065f995c11eb41f2f1da34bf5ee8b88548eb77e990e1c921c322279cecbd2` |
| `packages/ai/test/fixtures/recordings/mistral-chat/replays-native-reasoning.json` | test/fixture | `c2d4d732eeaebb7fe77073d3a8eaca8d570fb9e4c6d94ebc7146652cf44991b8` |
| `packages/ai/test/fixtures/recordings/mistral-chat/streams-text-with-usage.json` | test/fixture | `3aa8605b9dfc3c11561e624c43b41a696ad549abcf6082c551b06530bf6bbe00` |
| `packages/ai/test/fixtures/recordings/moonshot-chat/k3-reads-image-bytes.json` | test/fixture | `4adc1a8637a64cc879b81478d23d9e72594adba6205da89d1963b8aedbd7a4e9` |
| `packages/ai/test/fixtures/recordings/moonshot-chat/k3-respects-tool-choice-none.json` | test/fixture | `15c5b93e9245b431ff2a377c0d10312b4f8c47a1dce706f57b3c9dbc6bcdafec` |
| `packages/ai/test/fixtures/recordings/moonshot-chat/k3-respects-tool-choice-required.json` | test/fixture | `520792da4025caf750fb2da3242b3dc72824ca04f3b21898225f8dfcbd2bd050` |
| `packages/ai/test/fixtures/recordings/moonshot-chat/k3-returns-native-structured-output.json` | test/fixture | `215922c06fd7f978fda3a74519b614472cad1deed147c0d2fa4831acc4cdbcc2` |
| `packages/ai/test/fixtures/recordings/moonshot-chat/k3-streams-text-with-default-effort.json` | test/fixture | `ed85f2b2f6940a0a34360df24369a3ec9a3d67bab03cae7152e40078cf9a32e3` |
| `packages/ai/test/fixtures/recordings/moonshot-chat/k3-streams-text-with-high-effort.json` | test/fixture | `d6eebe705a30252bf743d531745a9006b3ade2cb1d025ca5cbfa3ef4ada7e1f6` |
| `packages/ai/test/fixtures/recordings/moonshot-chat/k3-streams-text-with-low-effort.json` | test/fixture | `6ad4ca0c0f370a20c4954382acbb990e94369ffdee5dad3a6688ec8dfdb50987` |
| `packages/ai/test/fixtures/recordings/moonshot-chat/k3-streams-text-with-max-effort.json` | test/fixture | `9eca882533cacc9b25620f579d9b269a64d912c3dbda1f8f840db9eb2cc707be` |
| `packages/ai/test/fixtures/recordings/moonshot-chat/kimi-k2-6-preserves-reasoning-through-a-tool-loop-and-follow-up.json` | test/fixture | `a98b362aaee5fcb3fc3265e6c4e3dff4e74a37c8981383b37422f304346c1929` |
| `packages/ai/test/fixtures/recordings/moonshot-chat/kimi-k2-6-streams-text-with-default-thinking.json` | test/fixture | `93dc61d419e3c40728879f84c6de9872324b3be866964664051599eabb429967` |
| `packages/ai/test/fixtures/recordings/moonshot-chat/kimi-k2-6-streams-text-with-disabled-thinking.json` | test/fixture | `8ed72e5489735acdc053e47f26930e479eaae13b77c71db2704324428fdf728d` |
| `packages/ai/test/fixtures/recordings/moonshot-chat/kimi-k2-6-streams-text-with-enabled-thinking.json` | test/fixture | `fc1a1d79cdb5753051bb79580fbe11e40fb626f10c52c789d07fba559c92df03` |
| `packages/ai/test/fixtures/recordings/moonshot-chat/kimi-k2-7-code-highspeed-preserves-reasoning-through-a-tool-loop-and-follow-up.json` | test/fixture | `a14bbdcc5de9c7b4c94549b4bee850c8f9bad3aadae6bc1cc5252a5342947159` |
| `packages/ai/test/fixtures/recordings/moonshot-chat/kimi-k2-7-code-highspeed-streams-text-with-default-thinking.json` | test/fixture | `18eba14c9db2d2d011bf3a56d8dd77bec3c113910c1653a955f568113ab1a339` |
| `packages/ai/test/fixtures/recordings/moonshot-chat/kimi-k2-7-code-preserves-reasoning-through-a-tool-loop-and-follow-up.json` | test/fixture | `69b82535c32bf29d1573625954a4e809e419cf3b80ab56651c7cc3043bee878c` |
| `packages/ai/test/fixtures/recordings/moonshot-chat/kimi-k2-7-code-streams-text-with-default-thinking.json` | test/fixture | `837feafc51c85313cee42cbc99785ad74396ee73ab20e89a19229fab9c86cc80` |
| `packages/ai/test/fixtures/recordings/moonshot-chat/kimi-k3-preserves-reasoning-through-a-tool-loop-and-follow-up.json` | test/fixture | `0fdfda7595b363276f79a1bd60566ecfaa5a2ee2b29d06e62f0cf4336f959d6c` |
| `packages/ai/test/fixtures/recordings/moonshot-messages/k3-reads-image-bytes.json` | test/fixture | `8d99c6eeef0407310df407b6d067e34f90b159620221e737cd0cd55531e881bf` |
| `packages/ai/test/fixtures/recordings/moonshot-messages/k3-respects-tool-choice-none.json` | test/fixture | `688665d3d85dff87cc44c2e2aed62a8a86b6f63280db15925c30d9729e22bcc7` |
| `packages/ai/test/fixtures/recordings/moonshot-messages/k3-respects-tool-choice-required.json` | test/fixture | `d4ba053095cdc51fa7365ae7aa0a8d50b4e6bb42acf083aed10d942a78d7d976` |
| `packages/ai/test/fixtures/recordings/moonshot-messages/k3-returns-native-structured-output.json` | test/fixture | `329ade9c56a0207d80ec984969d9026ea4f28015d031951991a21ff31c926229` |
| `packages/ai/test/fixtures/recordings/moonshot-messages/k3-streams-text-with-default-effort.json` | test/fixture | `9bf7eb012574ee4666a470e41501084906d5c272ea1694b2aa27758095675c85` |
| `packages/ai/test/fixtures/recordings/moonshot-messages/k3-streams-text-with-high-effort.json` | test/fixture | `82aaaf42d67edd36a82b6010a72705b32e645060d03844797dcd7d9836eb2088` |
| `packages/ai/test/fixtures/recordings/moonshot-messages/k3-streams-text-with-low-effort.json` | test/fixture | `04dbfcb8a4c2b1cf8600972068fa4516f237966d44b62b6d82a83d60d10718c6` |
| `packages/ai/test/fixtures/recordings/moonshot-messages/k3-streams-text-with-max-effort.json` | test/fixture | `29fd953d54c08c6b1b6c3b6d53b9ebbb9d7e9185360b59d1d0ac043f8fd31414` |
| `packages/ai/test/fixtures/recordings/moonshot-messages/kimi-k3-preserves-reasoning-through-a-tool-loop-and-follow-up.json` | test/fixture | `3501d0a3afad232fd0addd73330b225bc7298e6606495807f4ecf016c1989b78` |
| `packages/ai/test/fixtures/recordings/moonshot-responses/k3-reads-image-bytes.json` | test/fixture | `29e27995438b08b7e89d3c279a34f75ff3e82fdb0b532c1a94ad51db62620bd2` |
| `packages/ai/test/fixtures/recordings/moonshot-responses/k3-rejects-unsupported-tool-choice-none.json` | test/fixture | `b2b8f1de91eb7bfad08fdebff3e89501cd0cbb4723c4e0dbebd456936124c3ee` |
| `packages/ai/test/fixtures/recordings/moonshot-responses/k3-rejects-unsupported-tool-choice-required.json` | test/fixture | `9d164bc3be375b6ef59c4dcfca0d7b212a242fb2bd097bf4e27563530f18cee6` |
| `packages/ai/test/fixtures/recordings/moonshot-responses/k3-returns-native-structured-output.json` | test/fixture | `3e53df0f9a2a396da52f32713b1840b429445360a62c70afe63225637e639651` |
| `packages/ai/test/fixtures/recordings/moonshot-responses/k3-streams-text-with-default-effort.json` | test/fixture | `028c84be22d1d307630de7f908c331c4ad6f0057d775ce91c7ce3eef0fb7b79c` |
| `packages/ai/test/fixtures/recordings/moonshot-responses/k3-streams-text-with-high-effort.json` | test/fixture | `bcf480b7579f74dbef38734a0d00b3f21478efeee141b9f2a5d2c74dac2773b1` |
| `packages/ai/test/fixtures/recordings/moonshot-responses/k3-streams-text-with-low-effort.json` | test/fixture | `da3a62182c7ceadcb932322166a37944cc1bf42c7db55e5f35c6fcc6bea0b8aa` |
| `packages/ai/test/fixtures/recordings/moonshot-responses/k3-streams-text-with-max-effort.json` | test/fixture | `0bcfed58fab834a99013ba0d9c72f8504b1bee46ba4d5fa14989a8abe1451ad7` |
| `packages/ai/test/fixtures/recordings/moonshot-responses/kimi-k3-preserves-reasoning-through-a-tool-loop-and-follow-up.json` | test/fixture | `a5afd5f406ab0ee3050af7bb5587f63e488653b421c1f9009065411bb7bab99a` |
| `packages/ai/test/fixtures/recordings/openai-compatible-chat/gemini-parallel-tool-signatures.json` | test/fixture | `2f75842f68ee6bad4e3e5e3f86c1de21374d6321dce8e6503eeb1c39309c9cba` |
| `packages/ai/test/fixtures/recordings/openai-compatible-chat/togetherai-streams-text.json` | test/fixture | `194df1d056f301703e9d9669952c6a253a6d0bf626dc1fe64ea9421d383dfe89` |
| `packages/ai/test/fixtures/recordings/openai-compatible-chat/togetherai-streams-tool-call.json` | test/fixture | `1454e10923e9996db06218289d61bf53ed00ebc1b6330189c055e7d4293fc59e` |
| `packages/ai/test/fixtures/recordings/openai-decision/decides-choice-score-and-predicate-questions-about-json-state.json` | test/fixture | `508fc44cfa45d5a78587dceca61133c6f19cbd3325c0a84edd8210bb1e9ac6a5` |
| `packages/ai/test/fixtures/recordings/openai-images/edits-an-image.json` | test/fixture | `2d26585c66408fb463aa872c35d79ca812ae6002c844e7d577611d23a7d66dcd` |
| `packages/ai/test/fixtures/recordings/openai-images/generates-an-image.json` | test/fixture | `51598dc97682f6b1891d3940cdcbcf9eb7437243f4092945ccdcfd7a6af84ad2` |
| `packages/ai/test/fixtures/recordings/openai-images/streams-a-partial-image-before-the-final-image.json` | test/fixture | `e3ba1863e846f10334e17aa2e99cfc052814ff4cb3540b571a557822ae9cd937` |
| `packages/ai/test/fixtures/recordings/openai-responses-cache/reports-cached-tokens-on-identical-second-call.json` | test/fixture | `4c09a3688498138ea7d93ea969cacea1d69fcb6f6bfac66057a963e5566f60e0` |
| `packages/ai/test/fixtures/recordings/openai-responses-images/generates-and-edits-an-image-with-the-hosted-tool.json` | test/fixture | `01d7b38424996bad135a67579a65fd2031f0f692d6be7599e316510b6ebea6f9` |
| `packages/ai/test/fixtures/recordings/openai-responses-websocket/continues-a-tool-call-over-one-socket.json` | test/fixture | `bd1a0f965f88628a1e3cee6a0cc400b03d7406eff1b850574fa38bf5616e9da9` |
| `packages/ai/test/fixtures/recordings/openai-responses-websocket/reconstructs-full-context-after-reconnect.json` | test/fixture | `8973f3e1a4f2680295a31b95617b0f940e2f88d400da82ca13f1b20ea304515f` |
| `packages/ai/test/fixtures/recordings/openai-responses-websocket/recovers-from-explicit-continuation-rejection.json` | test/fixture | `ab384eeba08412eae8570b407505de115095bc9cec21e0f086dd903d53db998a` |
| `packages/ai/test/fixtures/recordings/openai-responses/openai-responses-gpt-5-5-image-tool-result.json` | test/fixture | `be184ac7b8879c0a09cc4ef8e623b93f2d6bb8bb1ce0ca9268122b89701dc5f1` |
| `packages/ai/test/fixtures/recordings/openai-responses/openai-responses-gpt-5-5-reasoning-continuation.json` | test/fixture | `40f75b0f6b69d20e410422f86e816e44219ca843eabd83c8b6b9d0c5710ccd30` |
| `packages/ai/test/fixtures/recordings/openai-responses/openai-responses-gpt-5-5-reasoning.json` | test/fixture | `db563a14cfc32a2661f9bf1513a5e590f0e15855698772cf15872bef251d87fe` |
| `packages/ai/test/fixtures/recordings/openai-responses/openai-responses-gpt-5-5-tool-loop.json` | test/fixture | `f742c935b09b6def50f7763a183bfc82da336bcece128eabde72bb5dad43fe2b` |
| `packages/ai/test/fixtures/recordings/openai-speech/generates-speech.json` | test/fixture | `fb47e34f111389ecb7667c9da079666ca83c8116d1be0c93e22d693ffedde39d` |
| `packages/ai/test/fixtures/recordings/openai-speech/streams-speech.json` | test/fixture | `6ca1c901b7ac4e7e5cf55b97ada871f1d2ca266ed831e3301d41b1d6a3f5a190` |
| `packages/ai/test/fixtures/recordings/openai-transcription/diarizes-speakers-into-segments.json` | test/fixture | `aafa94173f0e70c0e9f4fbabda68eeaa0c07157efa7acb4a14d8cd7397bff760` |
| `packages/ai/test/fixtures/recordings/openai-transcription/returns-whisper-word-timestamps.json` | test/fixture | `2217536a9a9030be79062ec9d3bbed41ba5b00d6decbb4eb466bc15e084e3231` |
| `packages/ai/test/fixtures/recordings/openai-transcription/streams-text-deltas.json` | test/fixture | `2a4487d9b33cad46f1f0b997fda088b28913ee96fc3354441171c3e9b72be3f8` |
| `packages/ai/test/fixtures/recordings/openai-transcription/transcribes-with-a-language-hint.json` | test/fixture | `c1594ed6d2450c3e514f03aed83f3f5a0051b281c6c51553ca898ad0c9d68d1c` |
| `packages/ai/test/fixtures/recordings/opencode-decision/decides-choice-score-and-predicate-questions.json` | test/fixture | `c847cf4d6cc88f5fcd8c052446364a3374f1d576a638c3046e0c486a95ae3936` |
| `packages/ai/test/fixtures/recordings/openrouter-decision/decides-choice-score-and-predicate-questions.json` | test/fixture | `2491d53e7942505be2b92f45c04a4a5a72651802908ca39d8fea4dccbd1ffb4f` |
| `packages/ai/test/fixtures/recordings/openrouter-images/edits-an-image-through-input-references.json` | test/fixture | `f8ae2231cfb3db4b7567ea9d9e6c0f258886f3edebb2c43e70eb2771bde011d0` |
| `packages/ai/test/fixtures/recordings/openrouter-images/renders-flux-3-from-an-aspect-ratio-and-tier.json` | test/fixture | `6ae8268d63ba911ef2269570bd362be94235e4817810b031a81d4434c0b4896d` |
| `packages/ai/test/fixtures/recordings/openrouter-images/renders-gemini-at-the-requested-2k-tier.json` | test/fixture | `2000dce37e63556c9492956d85a191d3881861fe2ac02848abc0df77bbba50ea` |
| `packages/ai/test/fixtures/recordings/openrouter-reasoning-tool-loop.json` | test/fixture | `7757f30e36758ade74d50f66eddd4c840ace05b04de8ac52f43effa88243eefd` |
| `packages/ai/test/fixtures/recordings/openrouter-reasoning.json` | test/fixture | `0f32ddc197bb86f44b9921e3e0a65313613a0e6bd74a6d83673698d4b61f756e` |
| `packages/ai/test/fixtures/recordings/openrouter-responses/calls-a-freeform-text-tool.json` | test/fixture | `2786f529523d25ecd2c58538c2d569bc6aaa94f00a009ab571bc23daf27387d7` |
| `packages/ai/test/fixtures/recordings/openrouter-responses/continues-a-tool-call.json` | test/fixture | `88a81572aea42c8327212a89e0de9fecc360aa299223d668ecb8c55d4bb26bd4` |
| `packages/ai/test/fixtures/recordings/openrouter-responses/streams-text.json` | test/fixture | `3b155f8f834b7bf2421fb01608371130e56e20bce707dbe262cdbe30b2260c7f` |
| `packages/ai/test/fixtures/recordings/pdf/anthropic-tool-result.json` | test/fixture | `9ddbdeacffb60e0c56a7920f7feb853a7420786dece392d2f2bd6ef1f080c88c` |
| `packages/ai/test/fixtures/recordings/pdf/anthropic-user-input.json` | test/fixture | `4ba3bd69944e56aef216d0d621950463df1586b516a2019753aff137f65ce4ae` |
| `packages/ai/test/fixtures/recordings/pdf/bedrock-tool-result.json` | test/fixture | `467b5cd0cd1e9512699bec5d83b68eaf2b0398644d25787aec9c694c023cf719` |
| `packages/ai/test/fixtures/recordings/pdf/bedrock-user-input.json` | test/fixture | `7b23a3a2ca20baea7a6146be72c7cd826ccd0584abc5f653e2648f8038354e59` |
| `packages/ai/test/fixtures/recordings/pdf/gemini-tool-result.json` | test/fixture | `98ee5a46551707ca35ad8fc04ceeb446ef7eb8166ca8b28fa76d6c9d16881c92` |
| `packages/ai/test/fixtures/recordings/pdf/gemini-user-input.json` | test/fixture | `48ef01bd20040cfbe4f8776c00285089ecfb4cbbb17b0e927a5d8dd363484729` |
| `packages/ai/test/fixtures/recordings/pdf/openai-tool-result.json` | test/fixture | `b50e1e970c8113bd0b776c947670aaf488def16ddd724468d52f3bad9be35266` |
| `packages/ai/test/fixtures/recordings/pdf/openai-user-input.json` | test/fixture | `28ce9a2575d803402d839eae3f22b1c309006548b9cba5f66063a94b51d06e1e` |
| `packages/ai/test/fixtures/recordings/pdf/xai-tool-result.json` | test/fixture | `8f8708e1209bf1a4e0bca6be5a0f4f30b5234bf39df897cdfad29217bc7ec302` |
| `packages/ai/test/fixtures/recordings/pdf/xai-user-input.json` | test/fixture | `4ba9f5e8d22b77a37a69b8fae7797835b6a42ff6aba06d89fb85733cac9a7094` |
| `packages/ai/test/fixtures/recordings/runway-video/generates-a-video.json` | test/fixture | `74ddcdfb7225ce2cdb90292471ed6dc9ad978c24bd549d32cb2e2cb01b517e3e` |
| `packages/ai/test/fixtures/recordings/typesafe-decision/decides-choice-score-and-predicate-questions.json` | test/fixture | `c4b98b3d8e626171d8663baf75d8bb06fbb8707aee1f168e6f3531f77cf2bb29` |
| `packages/ai/test/fixtures/recordings/venice-chat/claude-opus-4-8-preserves-reasoning-through-a-tool-loop-and-follow-up.json` | test/fixture | `ac90a1b54a71ebf23a4b2651bfda2e8f94fe7e9a89fb3fedd2d2a03a45986d23` |
| `packages/ai/test/fixtures/recordings/venice-chat/deepseek-v4-flash-preserves-reasoning-through-a-tool-loop-and-follow-up.json` | test/fixture | `b80af3b4090405495824a9e3a0e4eca94548a817b29bcc86dc4676463a0575d1` |
| `packages/ai/test/fixtures/recordings/venice-chat/gemini-3-1-pro-preview-preserves-reasoning-through-a-tool-loop-and-follow-up.json` | test/fixture | `2d7b9106bc754d6215d294e5f863f4aa175c33dcf872c54e68cf95be7fbe8155` |
| `packages/ai/test/fixtures/recordings/venice-chat/gemini-preserves-per-call-signatures-through-parallel-tools.json` | test/fixture | `06bfa5cf65bc4b7fd78c0fc89b98c71b91876eb40051597475228d9772747691` |
| `packages/ai/test/fixtures/recordings/venice-chat/openai-gpt-54-mini-preserves-reasoning-through-a-tool-loop-and-follow-up.json` | test/fixture | `991cc1f0c92238e34057db0a61d36bd0aa2e21d1ffead3f95086fc0d950faef1` |
| `packages/ai/test/fixtures/recordings/venice-chat/qwen-disables-reasoning.json` | test/fixture | `69b60d18366329ec83b102c78546dced3b7268602974d65e1d98ad64d8b7e2c8` |
| `packages/ai/test/fixtures/recordings/venice-chat/surfaces-venice-model-errors.json` | test/fixture | `7217c7ffc584e2f0f9f58654b972801a63a6e26f8961723d89642daaf9fb4979` |
| `packages/ai/test/fixtures/recordings/venice-responses/calls-a-freeform-text-tool.json` | test/fixture | `e7488d54aea4c76b9dc58dd955ddcf4f77c27c12306f9d815908413d75712baf` |
| `packages/ai/test/fixtures/recordings/venice-responses/continues-a-tool-call.json` | test/fixture | `ffd3f78684224b74e99a8886fa184a87cb334cdf4be547cdc1727cc214ab6c63` |
| `packages/ai/test/fixtures/recordings/venice-responses/streams-text.json` | test/fixture | `7575bc3a4a813b29f5f69d9e59cd837cae0fa5499443623e71704ac0458917e3` |
| `packages/ai/test/fixtures/recordings/vercel-ai-gateway-images/generates-an-image.json` | test/fixture | `3839967f6c0ed2ccd1e6cd584efc94fa11a3e578fdb4b37bfdeaf7f0fccacfcf` |
| `packages/ai/test/fixtures/recordings/vercel-ai-gateway-images/sizes-grok-through-xai-provider-options.json` | test/fixture | `42ab373c0d3a692f58f91036895f2af54598a92390f079b885e3246842b13c35` |
| `packages/ai/test/fixtures/recordings/vercel-ai-gateway-reasoning-tool-loop.json` | test/fixture | `0e1a69f7cc216ef6485231af82a1631a558e4927bc96845e6f2560bb3d23e146` |
| `packages/ai/test/fixtures/recordings/vercel-ai-gateway-reasoning.json` | test/fixture | `a37dd7887926c1bdc2dfae58b6e62773dedb13fad1baf704c06a1d57ffcbb7cb` |
| `packages/ai/test/fixtures/recordings/vercel-native/automatically-caches-distinct-claude-system-blocks.json` | test/fixture | `a498088ef7e60ae1565e9af61b198fa649df3437fd17431c23a8f16527258912` |
| `packages/ai/test/fixtures/recordings/vercel-native/continues-chat-claude-reasoning-and-tools.json` | test/fixture | `1a261d42183d87e4baed22ecc35e6e4e56a49ed5415a7f9af8a316ca09c3c8b8` |
| `packages/ai/test/fixtures/recordings/vercel-native/continues-chat-muse-reasoning-and-tools.json` | test/fixture | `eda3ec920f7dc0e51ed421758225c09fc35a95531b809f40e807dc2a230eccbd` |
| `packages/ai/test/fixtures/recordings/vercel-native/continues-messages-claude-reasoning-and-tools.json` | test/fixture | `a7c985acd8558d80b02f4147239f2cd3ba1eb9908ef1c8e669626116d7f37b4e` |
| `packages/ai/test/fixtures/recordings/vercel-native/continues-messages-deepseek-reasoning-and-tools.json` | test/fixture | `8b21f7e0521094c8d6ee7cf3124bcc6f6aa7346cb95e5609344531e74f695bd9` |
| `packages/ai/test/fixtures/recordings/vercel-native/continues-messages-gemini-reasoning-and-tools.json` | test/fixture | `bcb3f038048a82d5c34d516f90fc4d9ad19beebb5bd50fd89c7820e81e766c0f` |
| `packages/ai/test/fixtures/recordings/vercel-native/continues-responses-gpt-reasoning-and-tools.json` | test/fixture | `5020e83f6be1c02e2f2f01f3fc21ccac6d6d7d4c0c55f17a15b9c2839a75baf6` |
| `packages/ai/test/fixtures/recordings/vercel-native/continues-responses-grok-reasoning-and-tools.json` | test/fixture | `2f71086d4fb8b17f8d4978c5cd1cb44d258951ad036e6193e9309920906f8839` |
| `packages/ai/test/fixtures/recordings/vercel-native/rejects-invalid-credentials-without-retryable-classification.json` | test/fixture | `68541281b555b39851d1378f76f7a8d2b31795f9808b8e77823ff22a7e2a6571` |
| `packages/ai/test/fixtures/recordings/xai-images/edits-an-image.json` | test/fixture | `e8d0c25ea821937955e2d1f4d69aac2cfd50360782bd9035582b71356cef9491` |
| `packages/ai/test/fixtures/recordings/xai-images/generates-an-image.json` | test/fixture | `5559bd00eacc6da19b541d4c2dfd79d1edc79a82d6e2cf42ef7ddecf7134f8e0` |
| `packages/ai/test/fixtures/recordings/xai-video/generates-a-video.json` | test/fixture | `fbd76059cb70c73c5bb08b70b63814b6603114be8e4dd7a8f94f4eccc920b23d` |
| `packages/ai/test/fixtures/recordings/zai-chat/glm-4-5-calls-a-tool-without-streaming-arguments.json` | test/fixture | `b1b1f0fe2aa65d23ac911409aa2020ed9bec650c1712b6b9002925844c067b18` |
| `packages/ai/test/fixtures/recordings/zai-chat/glm-4-7-streams-thinking-disabled.json` | test/fixture | `e10b3966beb01ed552ab506c235dd24c83c1b6e0c363db60494b8268671c35db` |
| `packages/ai/test/fixtures/recordings/zai-chat/glm-4-7-streams-thinking-enabled.json` | test/fixture | `02923953c71c3a34974e233cd54393f943c5dc831fb301e6793b5a2f0beabbe2` |
| `packages/ai/test/fixtures/recordings/zai-chat/glm-5-2-streams-high-effort.json` | test/fixture | `b635a14a07ecccf572ec9cafc9b561e4b1c07ad23f3dfee628684e08bd6c6767` |
| `packages/ai/test/fixtures/recordings/zai-chat/glm-5-2-streams-low-effort.json` | test/fixture | `52185d5449049582dff5a8b9d23a9db16ef776d633f8cf081b6f27ff81af7827` |
| `packages/ai/test/fixtures/recordings/zai-chat/glm-5-2-streams-max-effort.json` | test/fixture | `258e798be1b13996f23ae4581d514c7bc52a01f9601a4f31d7653a1859c80131` |
| `packages/ai/test/fixtures/recordings/zai-chat/glm-5-2-streams-medium-effort.json` | test/fixture | `7178e74630dc616d0e480df3261f3eb9b16453992479c9ae59cbc6d45476cacf` |
| `packages/ai/test/fixtures/recordings/zai-chat/glm-5-2-streams-minimal-effort.json` | test/fixture | `742e175080968930aa6941c332902fc20c8f380aaa4480a1c30ebf8758b15d00` |
| `packages/ai/test/fixtures/recordings/zai-chat/glm-5-2-streams-none-effort.json` | test/fixture | `86f867308bc2e597d736417ac77da4ed282a9d67db38a4e96792a2c6f5061954` |
| `packages/ai/test/fixtures/recordings/zai-chat/glm-5-2-streams-thinking-disabled.json` | test/fixture | `69fb711981b9a3eed3c16690293dfef9030fc2b5580cf33c5c1f35b0c6d5a4c5` |
| `packages/ai/test/fixtures/recordings/zai-chat/glm-5-2-streams-thinking-enabled.json` | test/fixture | `769278ba9549f930504277a53bc367b47d458dab3b9aa90d3f17a98150f7fd53` |
| `packages/ai/test/fixtures/recordings/zai-chat/glm-5-2-streams-xhigh-effort.json` | test/fixture | `ad1dcd293aaeb38d1a6a02d314d6e2216622035b7c7ca9eae49b631492d29e84` |
| `packages/ai/test/fixtures/recordings/zai-chat/glm-5-3-flash-reads-image-bytes.json` | test/fixture | `a3d3db28784ae80b5fcd9213f350535d9384634b1c69430d3dd7a1749967f127` |
| `packages/ai/test/fixtures/recordings/zai-chat/glm-5-3-preserves-reasoning-through-a-tool-loop-and-follow-up.json` | test/fixture | `d6d3cccc82de7deffe95a19f1aeac398996dd7219742423b2c2676fe79aa3464` |
| `packages/ai/test/fixtures/recordings/zai-chat/glm-5-3-rejects-disabled-thinking.json` | test/fixture | `b00eaa8fbc6e23ad22becbcdbbfb72f3820665bce8b4f93b0277d592981ea999` |
| `packages/ai/test/fixtures/recordings/zai-chat/glm-5-3-returns-a-json-object.json` | test/fixture | `70b1b0fd68c6a1555d650470e7dcbb6929228fef6c4682edfdd8d47893ad85a7` |
| `packages/ai/test/fixtures/recordings/zai-chat/glm-5-3-streams-default-effort.json` | test/fixture | `a5c20f2b9f7a045667cd63dda449c9596a10c35c572a611672eda834d6a11dea` |
| `packages/ai/test/fixtures/recordings/zai-chat/glm-5-3-streams-high-effort.json` | test/fixture | `ef7b3cb464495f02e5c1372730f0f370415d785ea15c9d026972a57cf6ad731d` |
| `packages/ai/test/fixtures/recordings/zai-chat/glm-5-3-streams-low-effort.json` | test/fixture | `f4af89ca329077f0eee6516d976c6ca5a0ec82e84435c29807dcb48f1e3ee619` |
| `packages/ai/test/fixtures/recordings/zai-chat/glm-5-3-streams-max-effort.json` | test/fixture | `b3c63f67c46ad8c62d5dfd231258b3ec05b9bba0a331d5562574992037efc121` |
| `packages/ai/test/fixtures/recordings/zai-images/generates-an-image.json` | test/fixture | `acc220563ff278e8620ac4183b0593c60048338a5191a96f7027ffec4f2d92dd` |
| `packages/ai/test/generate-object.test.ts` | test/fixture | `018b0130fe02c120549354a983fea8fdd1fbe76b9d9efcc7a0801a3bd23593e2` |
| `packages/ai/test/generation.test.ts` | test/fixture | `2361edb6c4c131554f7d28e29b949f4a91c6881a6f40ea45fe531a3b2732605f` |
| `packages/ai/test/http-timeout.test.ts` | test/fixture | `d652d47e1d5cde2ec320ba55495355cbaaaaa13f48c646e6ca437681d89ed7ef` |
| `packages/ai/test/image-sizing.test.ts` | test/fixture | `9a7cad9995251c6c04a6d83523875f3ff5d7fc657e927977f27cb4adafb5d536` |
| `packages/ai/test/image.test.ts` | test/fixture | `d763efc94f8ff066ee0a44f504b39c12f59cace7de13f0e75bf53e3ec2bfeaa1` |
| `packages/ai/test/image.types.ts` | test/fixture | `f7da5cd0147aba5871003f70b4f65d7521f7a0dae7983b651a9c060e1e461993` |
| `packages/ai/test/keyless-auth.test.ts` | test/fixture | `d92b440cccf30399ab08cab1735b29ad50cfe78aa7a7afa29610e7d8691fbb08` |
| `packages/ai/test/lib/effect.ts` | test/fixture | `0d774c979b4955cd07360def2c2167dc03676343d8fd0a32b69d0f8e71caf1d5` |
| `packages/ai/test/lib/env.ts` | test/fixture | `0b007384b5d4767bc92b54bc73cf8742dee1d8a08f98baf3760639936489d1f9` |
| `packages/ai/test/lib/http.ts` | test/fixture | `4c4566bffeb933202f7efbab064ca441ae6bd47eb7b4fb31fa9ec651ebbef590` |
| `packages/ai/test/lib/image.ts` | test/fixture | `7f6fc79a849827d0708b3aa76de8cdedeff1274188a1fa73bf51963e0966e272` |
| `packages/ai/test/lib/openai-chunks.ts` | test/fixture | `ab0918270079ea66d96a7a80eae4eea8add27378bd5018ef63c194157cd9917b` |
| `packages/ai/test/lib/sse.ts` | test/fixture | `069c5b532c7aebaab0e8cf2dd6c020f190a31d8943c2a5a25ce983a996e3f72f` |
| `packages/ai/test/lib/tool-runtime.ts` | test/fixture | `a7de31f085e8c06f101693a81d6c82461cf1c9e083e9c7ac0a51d91c48084d9e` |
| `packages/ai/test/llm-option-types.types.ts` | test/fixture | `9cf3dc3a30a74884cd37cb0319354a966cde2331b1d3acc9ffa398a751e6ab2c` |
| `packages/ai/test/llm.test.ts` | test/fixture | `310d64980e688a5394c5d8bacfd4257b804810382f14e2bf169aa52032f5b0ac` |
| `packages/ai/test/loop-tools.types.ts` | test/fixture | `0a411b383ae71fbffac6b0f5727a34fb01f48f99f8daf0bb7cecb683317e7289` |
| `packages/ai/test/loop.test.ts` | test/fixture | `2041ab014447b1f365264164eaf0befe7abadca14f5cbed6b30bc3f6290519ec` |
| `packages/ai/test/media-usage.test.ts` | test/fixture | `afd96a269c474a050748bf31fdb3041b788ccbed22b20cd5a8ba84d006656726` |
| `packages/ai/test/media.test.ts` | test/fixture | `2340344f9687ddd9e98d9d6468a6c592364692d385e6bcd9135ee668310bf9eb` |
| `packages/ai/test/openai-freeform.test.ts` | test/fixture | `8f76e0d92e29c74d97a14dfa223257bd4cbb4ee16f27d4d0a420535778ec8267` |
| `packages/ai/test/partial-json.test.ts` | test/fixture | `bc933921d0f8353b1bd0c46887813c399716364e04afae7286c3ba01d672418b` |
| `packages/ai/test/promise-parity.types.ts` | test/fixture | `d03c20311d01526d1de7289574cd319a9641b1d29cb05bcecbf8cfb8a282d1d6` |
| `packages/ai/test/promise.test.ts` | test/fixture | `f3e153576b09ce3437111d014bf426e06f58065ef2ae0d6c82b882e0e0c9cac7` |
| `packages/ai/test/provider-error.test.ts` | test/fixture | `49218b020ffefe48a0b5b9c7ff447e9a6c145e8832b2886f6659b6b7d5e1200a` |
| `packages/ai/test/provider-model.types.ts` | test/fixture | `b3840e6caeec65f156c18554ca06eef9681f385ff754535f015b41d9bdcd1920` |
| `packages/ai/test/provider-options/alibaba.types.ts` | test/fixture | `e1ffdddcad0236623f02638c5dc121a0b1b3d89482c90d4e13badd092724e0e3` |
| `packages/ai/test/provider-options/amazon-bedrock.types.ts` | test/fixture | `21f793b17fe818e83db68741f75697c847ee4a59c1a28ac8786d30bcd796e7a1` |
| `packages/ai/test/provider-options/anthropic-compatible.types.ts` | test/fixture | `8c36f3a878bd61b26ce8bbad1a77119a7027edba20fba5554ddc0c489028905c` |
| `packages/ai/test/provider-options/anthropic.types.ts` | test/fixture | `b4a85690f2213c9858b4acd27b04b6d58be86780ce742a79666d6b2fee378064` |
| `packages/ai/test/provider-options/azure.types.ts` | test/fixture | `16539a892a235fac97011bd907eeee7e4478f6a3ce24c93b11606b491245e829` |
| `packages/ai/test/provider-options/checkpoint.types.ts` | test/fixture | `89636e0183de35bf2323066211cab64c6d03b23edb7dec31c21936f707430214` |
| `packages/ai/test/provider-options/cloudflare.types.ts` | test/fixture | `15bf12d80a47a394cef897eb505c36ac913e498864845fc7d4437d017c35f369` |
| `packages/ai/test/provider-options/compaction.types.ts` | test/fixture | `d7af2de4ec2ce28e1952bdf9b1deb12bc2f8bb34a64174cc319f3339002dad3b` |
| `packages/ai/test/provider-options/google-vertex-chat.types.ts` | test/fixture | `3da4c99d864f719ea6de6ec91fd7d2e57e95dddebc27c7b6feb269c2a9ab5dec` |
| `packages/ai/test/provider-options/google-vertex-interactions.types.ts` | test/fixture | `8f2c1c4b3269981d9cecc1269f75cdd1af39f1bd00ae8ef33ab80284000cc912` |
| `packages/ai/test/provider-options/google-vertex-messages.types.ts` | test/fixture | `30ca238d54db80427cc5fd19cd5fdd70d5c6c568cd2a2c36c973eb47fb94277c` |
| `packages/ai/test/provider-options/google-vertex-responses.types.ts` | test/fixture | `670c78f0d98ad8f5a38a0887da817e2e85f3cd1305a87e3f87dd1a61dd892fd8` |
| `packages/ai/test/provider-options/google-vertex.types.ts` | test/fixture | `c2e0dc443c2ddecec6e915a084300cc6b0cfdda8d1836fd6a38dc109126c6df1` |
| `packages/ai/test/provider-options/google.types.ts` | test/fixture | `2d4d06c7500e74f9bad4f7c15fd841e379301c64edeb27bd038d9df07f0196b1` |
| `packages/ai/test/provider-options/minimax.types.ts` | test/fixture | `aa827f02ed2ce022d97ddf57d4dc5a5256eba7de0c3f23b4b7dc80520ac10fff` |
| `packages/ai/test/provider-options/mistral.types.ts` | test/fixture | `839cf934a51b8aecf64940580a6dd79d8dd26c4d6d1c838ee29e33e6a3971152` |
| `packages/ai/test/provider-options/moonshot.types.ts` | test/fixture | `5408f7216b2b9216aa4d40c56b1b06695086826d8836143fe3a86f9f6a8128f7` |
| `packages/ai/test/provider-options/openai-compatible-responses.types.ts` | test/fixture | `cf13b041ecb0cabc015c45cb7395041efa470ef6ac205213126fff53cde05617` |
| `packages/ai/test/provider-options/openai-compatible.types.ts` | test/fixture | `b0742bc5071939117edf4951e88c0167227edd11b87ce1a8d77bebdc7821138b` |
| `packages/ai/test/provider-options/openai.types.ts` | test/fixture | `03108f9999537e6b7906a18c85b7e0ea12f705583d223b813067cac528b9a7d2` |
| `packages/ai/test/provider-options/openrouter.types.ts` | test/fixture | `f74265de30f9e7ae1fd356314782b83f4dd047509f9cf54f2bfdbbc88226cd9b` |
| `packages/ai/test/provider-options/venice.types.ts` | test/fixture | `e747274e94ae726660eb223927297d6df59040236e0e88bedb4afd7173ba0009` |
| `packages/ai/test/provider-options/vercel-ai-gateway.types.ts` | test/fixture | `7f8ce53245388c4c4bfa630bace0065e8e5ad116d2b98c0d5689f0c47e7cbf4f` |
| `packages/ai/test/provider-options/xai.types.ts` | test/fixture | `5caea8bcc69f90a54239f57eb76fc5e9c72cb4b5a1f0f78e847b5d558cb0e859` |
| `packages/ai/test/provider-options/zai.types.ts` | test/fixture | `435807a537ec12beb6f10c1f86739a375482098a26aef95ef27412c832d336de` |
| `packages/ai/test/provider-package.test.ts` | test/fixture | `42ee9829b48f1189eb89c5a52f72b17bf43772c2a210d60fa371e2bfabe3a29f` |
| `packages/ai/test/provider/alibaba-capabilities.recorded.test.ts` | test/fixture | `0e08b0ccc3a8bf90f7582c259d694ce02347395a6decc38bfc24a246fa02214f` |
| `packages/ai/test/provider/alibaba-images.recorded.test.ts` | test/fixture | `343747e5fecc4bae8f5c83e52cf12e52852fd084976f488c3da8e61abdd944e7` |
| `packages/ai/test/provider/alibaba-images.test.ts` | test/fixture | `590838477b38195e6899bad7fa249a879583d26748c5f735b4d8080eb623c9a6` |
| `packages/ai/test/provider/alibaba.recorded.test.ts` | test/fixture | `e3c6d7c8ecb560b183da55160967b294266b012666716cbe2778acf3b6f39ee9` |
| `packages/ai/test/provider/alibaba.test.ts` | test/fixture | `f4cb99e84d5db804a5b32544c1249b8312caf6204afb37817d4bf21674a55de0` |
| `packages/ai/test/provider/anthropic-compaction.test.ts` | test/fixture | `99cf97d4857b4281998a8f4bf9b4cbabb6af05b93c299fe413c95242cf81cfb6` |
| `packages/ai/test/provider/anthropic-messages-cache.recorded.test.ts` | test/fixture | `449f2690a1f70c85aafea2fe0f7f03b99bf8ea1baf440ee039c092c7f6815069` |
| `packages/ai/test/provider/anthropic-messages.recorded.test.ts` | test/fixture | `5d94ab3e9b28d706919301c0152565924bb079f6be6348ab3b98c4e50476f43c` |
| `packages/ai/test/provider/anthropic-messages.test.ts` | test/fixture | `f9ce73f50364da37e18f1c162d37ac40a2ccc16de50dbb729477328c234ea245` |
| `packages/ai/test/provider/anthropic-thinking-binding.test.ts` | test/fixture | `f78cd0fab6c7d5d1bf4abb340cec0e2f1afdacc0b34f11508df1baedfe37db76` |
| `packages/ai/test/provider/assemblyai-transcription.recorded.test.ts` | test/fixture | `4de359f6333074a471f93d4fd9098f92209eea9afac0981bdf2a3ee950fbfb02` |
| `packages/ai/test/provider/azure.recorded.test.ts` | test/fixture | `38419cd1d48937b7c9f2445c7134c71a001fd5188d3483de293172b72b52312e` |
| `packages/ai/test/provider/bedrock-converse-cache.recorded.test.ts` | test/fixture | `22849cd0a20f909cb9c05f7d4b91dfdbcb4f6f4cbbb69657668b925d70039424` |
| `packages/ai/test/provider/bedrock-converse-cache.test.ts` | test/fixture | `0db0608ff485a47518f9ca482487e8724dcabc5b6a74aebd0d47b6610cf884d4` |
| `packages/ai/test/provider/bedrock-converse-options.recorded.test.ts` | test/fixture | `bf80337806a668b8b80607b966fceae75cd1c958c2930396d26d7be1fc93f025` |
| `packages/ai/test/provider/bedrock-converse-options.test.ts` | test/fixture | `55fc6e1e3a0a2af21ef9acb8fc51dbb12867c559af4661f2f4f1d5089c9b62d8` |
| `packages/ai/test/provider/bedrock-converse-thinking-binding.recorded.test.ts` | test/fixture | `eaee8bab220f8decefa8d27e031a9e25bbe21eb8afa9e7c338805cb42dafb3cd` |
| `packages/ai/test/provider/bedrock-converse-thinking-binding.test.ts` | test/fixture | `06c7a9a381d80a76f7e4cd5cebccc248fa9588b627797a7bffb642bcb9002b15` |
| `packages/ai/test/provider/bedrock-converse.test.ts` | test/fixture | `d8bdcfbf31188112597627134c6eafae4badc7353302159aa905ee18237f3212` |
| `packages/ai/test/provider/bedrock-mantle.test.ts` | test/fixture | `10a5bb28f2bc62083fb3a07be05e93e17e0207af0f34a70ba51350c0e6e79da9` |
| `packages/ai/test/provider/bedrock-mistral-ids.test.ts` | test/fixture | `1f487775c8f32dedba9fd92f6ae4bd79111fa94ad1de42e5a4e031d47e5b5fdc` |
| `packages/ai/test/provider/cartesia-speech.recorded.test.ts` | test/fixture | `905f97141ffacbdde196aa2579817e2baf4549fd492eff8cdfc0489ba904fab1` |
| `packages/ai/test/provider/checkpoint.test.ts` | test/fixture | `358e8ccde5ce532cc338d3c570be59d8883cc04333489e6c8f1f521241530bd2` |
| `packages/ai/test/provider/cloudflare-workers-ai-images.recorded.test.ts` | test/fixture | `26af8b0bff55fb030f08cf81cfb90c8ace7def8ce83c37d38c90ff86157a9315` |
| `packages/ai/test/provider/cloudflare-workers-ai-images.test.ts` | test/fixture | `737a0f15db9a0c7cc10bca0e8ee80694faedf96771e5968c9beaf0edbe3b0443` |
| `packages/ai/test/provider/cloudflare.test.ts` | test/fixture | `7a42b5f0fe9bfa646cd3471baec42ac819c962017ab7329ab7a72f3b1af34cc0` |
| `packages/ai/test/provider/cohere.recorded.test.ts` | test/fixture | `2c976ba60b39fe6f9958038ac2e7ce80133a66136ec7e979670138b3712b43c2` |
| `packages/ai/test/provider/cohere.test.ts` | test/fixture | `383b729d1d3a83db53b1b6902ece3226723a4c47de0d6babb9eaf573f88bd2ec` |
| `packages/ai/test/provider/compaction-websocket.test.ts` | test/fixture | `18fb9e4c5f1eae7674113b1bd9a5db336f9a892f67fa44bbdc35d18d5b1e0047` |
| `packages/ai/test/provider/compaction.recorded.test.ts` | test/fixture | `4764f7b2fa5270f3c7a6434309eacdb39a69a1f22fc597471cb373f252646fe4` |
| `packages/ai/test/provider/compaction.test.ts` | test/fixture | `d2bbec9dd7996e4c7b8f6e3a3f7c70a3c86a48f8684dac371d8491382b301036` |
| `packages/ai/test/provider/conversation-lowering.test.ts` | test/fixture | `d21120318041158e2f1a506aec0413c3eace3b01e8b3711461a4f9c273459670` |
| `packages/ai/test/provider/decision.recorded.test.ts` | test/fixture | `2cbfdeabf24a28d1840a1af9db8266808e7489b6f67b32f85003883c410dbe74` |
| `packages/ai/test/provider/deepgram-speech.recorded.test.ts` | test/fixture | `983b95f06471fc3dd26651386a52d663a5883b901b28f84c672c48c63e021a01` |
| `packages/ai/test/provider/deepgram-transcription.recorded.test.ts` | test/fixture | `2e6a89e63768427850fde7f5aadb7f9891c5609c9987a81ff8993547c25238ba` |
| `packages/ai/test/provider/digitalocean.recorded.test.ts` | test/fixture | `7a2d8a93107ea41718d5e7b2ad93cb134d4eb92de86210287ba03c67341d2ec5` |
| `packages/ai/test/provider/digitalocean.test.ts` | test/fixture | `48bad0b60b10b450fdcdd07af8e548d8e2fcf2dd22ff986f1258660c6d2be954` |
| `packages/ai/test/provider/elevenlabs-speech.recorded.test.ts` | test/fixture | `0ae64b963471f32592009b15919f381e36e3328271b4d7cdf6ab745551b5cbb3` |
| `packages/ai/test/provider/elevenlabs-transcription.recorded.test.ts` | test/fixture | `e6a4e77a8adc74dd7d43f75933e3c2434790f00ddf4bcfe861bd41d471cc21c4` |
| `packages/ai/test/provider/empty-tool-choice.test.ts` | test/fixture | `ad431102f7c8bd040bc9827d11c980104ba8d04de42b3479e4e68d5f23036f9c` |
| `packages/ai/test/provider/error-retention.test.ts` | test/fixture | `2efc5a5d828e04d372157489bf13f1915da7383883d77e1b8306b01075055a08` |
| `packages/ai/test/provider/explicit-compaction.test.ts` | test/fixture | `93d2fa5e363ee7185de13ebfac1d7fc76386df22c1cdaf61e366ce43064a2608` |
| `packages/ai/test/provider/extraction.recorded.test.ts` | test/fixture | `d12b6ba10ba27f5f1b650308f98aa6b7652b7557eeaf701f5f53ce3048670eba` |
| `packages/ai/test/provider/freeform-tools.test.ts` | test/fixture | `46e34b9e3ed55af0c2f58f3b87ce9c45c59d1910e71743b1e761f0e8598a3bda` |
| `packages/ai/test/provider/gemini-cache.recorded.test.ts` | test/fixture | `d12584de6b474629f05986fe25a290cc06e78804b2b2a5a0b2ae586152f45867` |
| `packages/ai/test/provider/gemini-openai-chat.recorded.test.ts` | test/fixture | `8f38e1b9a9e48654f8a918b195e53a9e549a03654c2ac8422bd129115edbd6cb` |
| `packages/ai/test/provider/gemini.test.ts` | test/fixture | `e8ef765fe15bb8d6d012a9e59d0f0cc363eed9f738fdd627554820780275939b` |
| `packages/ai/test/provider/golden.recorded.test.ts` | test/fixture | `1589535406d0ec594253d4c86ea20692b6ba1eeb0b7d2d865727a597d36e45bf` |
| `packages/ai/test/provider/google-images.recorded.test.ts` | test/fixture | `4dab84cf9ff3fa8c0747e094e4503404a6eec57e93044bd496f1157efdf19e52` |
| `packages/ai/test/provider/google-interactions.recorded.test.ts` | test/fixture | `e2d5bcd97670eae74b88df130f443c9e4517465fd3cc73ec72bb17c3b136d392` |
| `packages/ai/test/provider/google-interactions.test.ts` | test/fixture | `a29ef4657ddf169f827824afcf678163df5f6da1fabfaee8e86cf1cdbb2c8d81` |
| `packages/ai/test/provider/google-speech.recorded.test.ts` | test/fixture | `ff8c3c5a454d57329a7eecdc56f1d163db01fdccdf72dfb09ff8c75d6fb7f270` |
| `packages/ai/test/provider/google-transcription.recorded.test.ts` | test/fixture | `3a7d49a8e5b897d17d1cca1eef1a7bdf0df6aa75e310df177cba1e72945af80e` |
| `packages/ai/test/provider/google-vertex-interactions.test.ts` | test/fixture | `0d08944f049bdf28749d236fb508209db791830937dbd77da1297744617cfa0c` |
| `packages/ai/test/provider/google-vertex.recorded.test.ts` | test/fixture | `0a1d7e02602e9c50b696e51ebe186134c18cb11ee410ae99cd028b6aa49346c2` |
| `packages/ai/test/provider/google-vertex.test.ts` | test/fixture | `e2d87119d905aeb3ea1ce902abc3476004c6e9229050dbfd3dc362bd5d9c1f8d` |
| `packages/ai/test/provider/google-video.recorded.test.ts` | test/fixture | `31d2e37b034fd927d7c81d4eff78129b74027a386b7fb27f3b6c18bef5ca9b86` |
| `packages/ai/test/provider/groq.recorded.test.ts` | test/fixture | `97480710f173e923fa4c4e1a59eff18413902b1ea549598058b9596335b2f070` |
| `packages/ai/test/provider/groq.test.ts` | test/fixture | `bdddc812dd0614f15bd9cd62286d11c90b92eb4c33a0891e26756027180da41e` |
| `packages/ai/test/provider/image-detail.test.ts` | test/fixture | `67200be276e6520424b4e24a68bd8b0d82fd69b581410bbd0c32ac34c2ca842a` |
| `packages/ai/test/provider/media-entrypoints.test.ts` | test/fixture | `6cc7659ce4f04247361cd6e078cd92e6519457345fc57c637bbd9312c01e3e15` |
| `packages/ai/test/provider/meta-capabilities.test.ts` | test/fixture | `cce22befeb4bcad4879d62ec19517126e468525d4f1f18da88137e990ff806a2` |
| `packages/ai/test/provider/meta-images.recorded.test.ts` | test/fixture | `9bc6c33c8ec9a65955cc410c01675c82f0f3af3eab6416fd5904f9f35a97160e` |
| `packages/ai/test/provider/meta-messages.recorded.test.ts` | test/fixture | `bcc534373d3d1bfc595fe556ea12d7a77a87badf9ac24c15d7323e16015243af` |
| `packages/ai/test/provider/meta-search.recorded.test.ts` | test/fixture | `5782465207305bc6d7a30db2f1a6b652fafb31ee8437e0bd570231951f1454f8` |
| `packages/ai/test/provider/meta.recorded.test.ts` | test/fixture | `fec9442bbf36c5f554adbe9ed9ef6bd31504de07873dc8ce05c08778d649730d` |
| `packages/ai/test/provider/meta.test.ts` | test/fixture | `9c2462d780cc3ed337d68f9e138fba5dbb8130018e0fed5cb26697351c5e306c` |
| `packages/ai/test/provider/minimax-images.recorded.test.ts` | test/fixture | `0f82cdc6d193882120a185d5f5e1ceaa5d3add7c67035ab5155ce81e13f19210` |
| `packages/ai/test/provider/minimax-images.test.ts` | test/fixture | `29fb89efab02f729d03ae28d250a999e66cf853e1caf71e5e703561a0c519538` |
| `packages/ai/test/provider/minimax.recorded.test.ts` | test/fixture | `d9cd729462c71d020bbca4c5ca232dd235a5e4d4ddb38bba7533249764d3b8a3` |
| `packages/ai/test/provider/minimax.test.ts` | test/fixture | `587bba3d7ef130972b4644ecf7441ee750caf74401fe1e78c588b37dda7a00f4` |
| `packages/ai/test/provider/missing-tool-input.test.ts` | test/fixture | `bec4532673dbffc84bbd21929f7ba71daf12b196ed59e824035e750958d497be` |
| `packages/ai/test/provider/mistral-chat.test.ts` | test/fixture | `f80b58618b30db8bafe9790f6dc6b3725e3a86ff5e5f1a0bd13f011bb4bca4cb` |
| `packages/ai/test/provider/mistral.recorded.test.ts` | test/fixture | `b0166db8f3c9eea1eb1cdf47fe0e36085658f994c008db4fd2e6e87b6b1425eb` |
| `packages/ai/test/provider/moonshot-capabilities.recorded.test.ts` | test/fixture | `0d2b2b2532b09e9a800aeb2bce644b603706f6134488faf1c73e4a63a25e46bb` |
| `packages/ai/test/provider/moonshot.recorded.test.ts` | test/fixture | `e696c17fbcb91f989e7eb92d5928ce231288e7aedabb6c1d8be1946980e48ab3` |
| `packages/ai/test/provider/moonshot.test.ts` | test/fixture | `2f138c10c0eb282c362874d77d771925038ec2c9ce251b460d45a0c6dcf5830e` |
| `packages/ai/test/provider/native-providers.test.ts` | test/fixture | `848b3f41a0ad5fb6aa4b812d12443af7103aa6777636143c060c2f3f26541adc` |
| `packages/ai/test/provider/open-responses-errors.test.ts` | test/fixture | `06d7c53cc4e3d502a5f661b7860cf230dff14300959592d41f73a1a469d35040` |
| `packages/ai/test/provider/open-responses-finals.test.ts` | test/fixture | `4a08e6573642dcb337f1350fa32d396f4e49bb942c5602a645a5cf6ae2816acb` |
| `packages/ai/test/provider/open-responses-lifecycle.test.ts` | test/fixture | `553b0faaec07366058ba8ec5d28de070b87c668ddeb6e25b77013c863d013208` |
| `packages/ai/test/provider/open-responses-replay.test.ts` | test/fixture | `b8500a514432f5e1c76dbe01afe9002e94970cc6bde7321e092e5de80603bfc6` |
| `packages/ai/test/provider/openai-chat-reasoning.recorded.test.ts` | test/fixture | `74ef3977f78018643dc9212b69bd35cdbab2903296e764be542d94a9f8828b7a` |
| `packages/ai/test/provider/openai-chat.test.ts` | test/fixture | `532ff6325abcc7545601cb6ed6fca2cc5e1dae18ad4e1cdb970689e87dca22a0` |
| `packages/ai/test/provider/openai-compatible-chat.test.ts` | test/fixture | `defb0ae190c4761097cffb06e3525c671c01cbe84a696039f157fedd795625ee` |
| `packages/ai/test/provider/openai-compatible-responses.test.ts` | test/fixture | `8979401aee50ef4193eb0e1ca26b216dfe2d37a1382fbc5f25fbba6e1bd57565` |
| `packages/ai/test/provider/openai-images.recorded.test.ts` | test/fixture | `f875f22ba7b88dd546a49015edb8f00008362a8fce99ca68091aafb2e33580e0` |
| `packages/ai/test/provider/openai-responses-cache.recorded.test.ts` | test/fixture | `677f326a01d6fd91d56ab9cb9359af4ed4e50dd1b0b3caabbbad03cbaf83fef6` |
| `packages/ai/test/provider/openai-responses-images.recorded.test.ts` | test/fixture | `b82a37a32805b5562485e3838518598b57d73e83786e2182aead161365319d24` |
| `packages/ai/test/provider/openai-responses-websocket.recorded.test.ts` | test/fixture | `161ada67023636c54b0b1ebde653885025d0bffac866d7488a08f0fd77d3b355` |
| `packages/ai/test/provider/openai-responses.test.ts` | test/fixture | `d755ded1fa820d5903a48df12bb0a010c65ebbfe2371074140b40191f51c48b3` |
| `packages/ai/test/provider/openai-speech.recorded.test.ts` | test/fixture | `915da10495148e197bfaaca779300acfec6971966d85aad7877f70e07af85717` |
| `packages/ai/test/provider/openai-transcription.recorded.test.ts` | test/fixture | `234c48fa3072116a5596a3bec7203e4f9d700af44696521da3264c297eb95121` |
| `packages/ai/test/provider/openrouter-images.recorded.test.ts` | test/fixture | `af73827d2ec0f592a29fb79227fcc9f538bd9e68efa80f88c8c414c895933191` |
| `packages/ai/test/provider/openrouter.test.ts` | test/fixture | `4f310b6d0f7c6b6f106a3b1580d857303e57c4f999ba8463f3624019f903278e` |
| `packages/ai/test/provider/pdf.recorded.test.ts` | test/fixture | `4a610846f80e5660600093507fcc2721012956bcd9005308637abfd87f6270f7` |
| `packages/ai/test/provider/queued-recording.ts` | test/fixture | `bd2d5221bdcb366e949406c1d831392ec4a01e503795a1aa9ce8e3496a3cd128` |
| `packages/ai/test/provider/responses-routes.recorded.test.ts` | test/fixture | `3c3a041fa3ed81557a4f5d09c0b3a88ba565c0830d5f608efadf51ec058e0288` |
| `packages/ai/test/provider/runway-video.recorded.test.ts` | test/fixture | `3d7f68e80b57760518eda48f5cd1351e5b02c823240f7d9e099ef83ca3d1c9d9` |
| `packages/ai/test/provider/speech-recording.ts` | test/fixture | `c8e4db212ad6c2c317ddc9a0e749c396d3d554c17ae38c3b61a6cfd6b3bef329` |
| `packages/ai/test/provider/transcription-recording.ts` | test/fixture | `359fdabb50f1fc31b1066a6f5590d11152616a5c1e310abbd7e8b047cf9ed5be` |
| `packages/ai/test/provider/venice.recorded.test.ts` | test/fixture | `203a58e11459c10a599ce2ad598cc64ef8090f89903c7d6c7c44aacac7afbb0b` |
| `packages/ai/test/provider/venice.test.ts` | test/fixture | `9abef0153ca532081df2fe18a87a2f162867443855f6f4b82f908f3db0175651` |
| `packages/ai/test/provider/vercel-ai-gateway-images.recorded.test.ts` | test/fixture | `806993106528dc6ea7c4d577ff3fc77d2a41def29baceb59488cf75d72cdaf15` |
| `packages/ai/test/provider/vercel-ai-gateway.recorded.test.ts` | test/fixture | `df992382d586a7c821eedf4e1420614e728293b13fd1705636e956c9786c74ec` |
| `packages/ai/test/provider/vercel-ai-gateway.test.ts` | test/fixture | `4cb36c2677c32a40adff73a29fb211c14bee60cbf7873ed8c08587f163f9754a` |
| `packages/ai/test/provider/xai-images.recorded.test.ts` | test/fixture | `5063ecc9e88e8c47ad5579e02ae2638a747702bd399f79cd3af2ab18b7cbbbe0` |
| `packages/ai/test/provider/xai-images.test.ts` | test/fixture | `3433ae22ce8c0a4bacf6cd4aac5c2eee36a64b91f45150bf548e55487c109fb8` |
| `packages/ai/test/provider/xai-responses.test.ts` | test/fixture | `3581f8030a5f5427337a226e4f5e3c6009af7cdb299bd9649ffa94a7521c7064` |
| `packages/ai/test/provider/xai-video.recorded.test.ts` | test/fixture | `97145667fdadd421dddbe5e70623b2f037304c7930a53954d7181fc9f65d7085` |
| `packages/ai/test/provider/zai-capabilities.recorded.test.ts` | test/fixture | `576f68ecf2a0b2454344512369a2442d0806f4ccf63a935d43507d042209605d` |
| `packages/ai/test/provider/zai-images.recorded.test.ts` | test/fixture | `4374e87fc3dfb24f94179699ff31d560a99229ecee849f300d637696278db35c` |
| `packages/ai/test/provider/zai-images.test.ts` | test/fixture | `476074809b6ee4b8378211142f5dd425f4e14862df6b49190e9cc3a242e7a513` |
| `packages/ai/test/provider/zai.recorded.test.ts` | test/fixture | `c039afbbe7e0b9d26387baf4dc05c7574f046daa93dfba6ea9d8c4833285aefd` |
| `packages/ai/test/provider/zai.test.ts` | test/fixture | `9201004b35a661f4bda48d7b111c36dfa5de67f4cec411a6d81592e06fd84f92` |
| `packages/ai/test/raw-events.test.ts` | test/fixture | `570299d633ba8d18fa33e0c2b4e8fba8e6244b64ee42621e7eec1587ec86e093` |
| `packages/ai/test/realtime.test.ts` | test/fixture | `38c36cc859a9af8648df69137f4a97a3dd56d54b2696acfcda454343d7e4231e` |
| `packages/ai/test/recorded-golden.ts` | test/fixture | `0fd8eba54e2c59b728b4fdc77d0aed1cf74d2cfcf6535bf834719e411ddf440d` |
| `packages/ai/test/recorded-runner.ts` | test/fixture | `ece7c359cff0025319d3dea126492a63c07d43ce4d0fe18a6db3cdaba882740d` |
| `packages/ai/test/recorded-scenarios.ts` | test/fixture | `e13e658c473b098bd56e7ec0e30927491d2e2f74f208b1923e40cd6e4ded3e92` |
| `packages/ai/test/recorded-test.ts` | test/fixture | `7244f405f99b3edf7158480daed01f27a143ec1e170959f91a36209d0ad0fc35` |
| `packages/ai/test/recorded-utils.ts` | test/fixture | `d50bb01271edf95eb05cf29ad75e49877ac04a0a10aae3f1fa89595b783bc387` |
| `packages/ai/test/request-encoding.test.ts` | test/fixture | `6f0714e35d5335e75c0017ee28b7fecc59dc275537c04c026b314b5caada4268` |
| `packages/ai/test/response.test.ts` | test/fixture | `3cad01c5c8736663b7310c47778533471c58189aab187f532ae18caa43a2d30d` |
| `packages/ai/test/route.test.ts` | test/fixture | `294f7094e0730f5269e96da075d044c023fcd4bb4a6ae2f2ec16ebad705a0768` |
| `packages/ai/test/sanitize.test.ts` | test/fixture | `f6227bfbd183f1ce933d6d2e9507bbed8ce0afdacdaf4b0a43a5d24bcc1b5f6c` |
| `packages/ai/test/schema.test.ts` | test/fixture | `6c825ad3ec8b5ca07cd3bbbc95523172d7a734988739b3903b00cc49f09b5694` |
| `packages/ai/test/speech.test.ts` | test/fixture | `639f569dcace4496b2ba6a428e9d590ad30aa9c45d5ed2aca26ed116d66589a9` |
| `packages/ai/test/speech.types.ts` | test/fixture | `d9d8688f6d858c2d9829e42252133c6e31c343dcc09d02489cf81894a0730fa4` |
| `packages/ai/test/testing.test.ts` | test/fixture | `969e06386ff96f0c9bcbaf2fbeceb97875b0031997d0ef6da984ad45cff58be5` |
| `packages/ai/test/tool-history.test.ts` | test/fixture | `5296f337ead0f457d85afed7af8ac12e952f799934062db1c2a1a23468ae7252` |
| `packages/ai/test/tool-runtime.test.ts` | test/fixture | `aec14a5d3bfd647cfaf3af2be6a2a30673b57c40ebd5e5544c5e60248561002b` |
| `packages/ai/test/tool-schema-projection.test.ts` | test/fixture | `c71cc6d752bfbb31d9f66e0bdccb2937429489a65e6cddb37c51a0b050151d18` |
| `packages/ai/test/tool-stream.test.ts` | test/fixture | `fbc126d545f9936cc2f5acd28a095de94c6ce989e26f9a77db95745a00a93156` |
| `packages/ai/test/tool.types.ts` | test/fixture | `e3b7d996f3861075b62295f968cd0a11379724d05c28999f5ef2ef59e1dfd136` |
| `packages/ai/test/transcription.test.ts` | test/fixture | `bff816be85b03822ed9207c41b7076de6d7b6e9fd10ec9e1c3072a919eccd650` |
| `packages/ai/test/transcription.types.ts` | test/fixture | `d363a202662855510e9cf7310275845a21e1ecd64f9a944c4b61b5992c8edb82` |
| `packages/ai/test/video.test.ts` | test/fixture | `3f749adf1cd530d8b42bc448b83cd25ef3cdda9e2abf2443c3140e6aabd64133` |
| `packages/ai/test/video.types.ts` | test/fixture | `8572da38b2b445b912281fc2605f5b78b6a53d90a43b2c76c9fc5f81c74a5dc1` |
| `packages/ai/tsconfig.build.json` | source/config | `3c7da0fd953f7225b5af1d1fa84d45619a1733f9bb11f18db428619cc7d86b74` |
| `packages/ai/tsconfig.json` | source/config | `140355561c635c83eef3344f9686b53e6384097be122837f27a91e3693d67b3c` |
| `packages/ai/tsconfig.types.json` | source/config | `828da66530bda171d65d4551b11bb121cbcefb4e46e7fea82adcc84fab91027d` |
| `packages/client/package.json` | source/config | `3270af701c4a58197e118428032a2fde542c8844d61f081aa2c94b3c776decd1` |
| `packages/client/script/build.ts` | source/config | `e68e5a88d003cc0a79fd42c2aec1f5c2505db53da19b7446fd2dab4d63d7b4bb` |
| `packages/client/script/generate.ts` | source/config | `56e8d12744a8fde4b2093b97cabd6f1e9aa3f544f7c866c9e8c1f369578b162f` |
| `packages/client/script/pack.ts` | source/config | `c19afa9fd85f771c1ed58ee53804806f81177c7e68ebd7695c91a825378afdee` |
| `packages/client/src/contract.ts` | source/config | `87598fff9b398cd6e94b6fd677c49151668ec79c000afef9b768c0aab7be2e29` |
| `packages/client/src/effect/api.ts` | source/config | `43df3b1b8849b42816cf55f5662d36a54bf04a1247361691d61bca526f261cca` |
| `packages/client/src/effect/api/.httpapi-codegen.json` | source/config | `7699dd4dd7a4ffb3261db9ad2b1c717e452aa0a39c0f0eede232cc61d4313150` |
| `packages/client/src/effect/api/api.ts` | source/config | `95482c3673f0eb5ed6f7b9f6832bd8f156a075231ee10ee0005daf234c1d1299` |
| `packages/client/src/effect/client.ts` | source/config | `fead453a6efcc7297243b6ce75bb66e71f61acf77e4c45a89a48afa05e862073` |
| `packages/client/src/effect/generated/.httpapi-codegen.json` | source/config | `974146de2c8ff8e6e415eb8d4308cd48d0bd59e10c8f21634551f47462de506a` |
| `packages/client/src/effect/generated/client-error.ts` | source/config | `6ad6c9ef8748d5f002761e0564526207a2508588d3951fba65a01f2097ba15ac` |
| `packages/client/src/effect/generated/client.ts` | source/config | `6d2675b80e2a5c9159bf78ad94e169dc5b7f125ada12fcfea93733a320c20462` |
| `packages/client/src/effect/generated/index.ts` | source/config | `b761702b71157d8e81a5d422e5668f4ec0980b59ba0c92e5f443383192bf6b5f` |
| `packages/client/src/effect/index.ts` | source/config | `174a0cad160aab444d520c4c6041aa3c6ba84242a5a3a104072fd4599a695ded` |
| `packages/client/src/effect/rpc.ts` | source/config | `5d7301112ba196a03ccd35aba75c2fbf144b1a800670ab13e307e297b56464b7` |
| `packages/client/src/effect/service.ts` | source/config | `e85885857a69110800edae72f1f2d503cf706d8e59be88daaab8cec11733c27c` |
| `packages/client/src/mcp.ts` | source/config | `a04c3c40a35415308888034b673c1ff31e61bee71dc6dbd96ab8b7d314ee1149` |
| `packages/client/src/promise/api.ts` | source/config | `c1eec6c019caa7dde1e9ba999103b3c1e7910f2747790ed79c191558cecf7ffd` |
| `packages/client/src/promise/client.ts` | source/config | `b993362bea51448493f55acbf220784ae0c04c7a9ada453732b9bbcc2515cfe6` |
| `packages/client/src/promise/generated/.httpapi-codegen.json` | source/config | `70581471ad37ce3ee71089a23d9c21852fd5d0594ad96f3e45626ff145702ccd` |
| `packages/client/src/promise/generated/client-error.ts` | source/config | `a2fe4b14a01cbe27c9f0ba97c7297cf1006af4c7701fc0621f2048fefa73b5d2` |
| `packages/client/src/promise/generated/client.ts` | source/config | `e55b816523b9077da9aefe1bda85bb7766cb8e48b5a41aeb7cbdadb051fbbb87` |
| `packages/client/src/promise/generated/index.ts` | source/config | `6d934431c8be37712c3e922ec50c7e2a566090387ab33d693ca8a60aa7487fd7` |
| `packages/client/src/promise/generated/types.ts` | source/config | `9592426a074ac81109867d947833c8908c21bbb1944f04d2ebe804e3f1a6972b` |
| `packages/client/src/promise/index.ts` | source/config | `4935c862084d7658019620beb32abcce67d5e6f4ef18562273da41c52ed4699a` |
| `packages/client/src/promise/media.ts` | source/config | `bc5b3e5a05edca3994127be2c1720c3b9aee3064e864a44a79f0b7399587c0e1` |
| `packages/client/src/promise/rpc.ts` | source/config | `3ef7a9483fa5d4387f3e6cb31a4d8837ee294cac521468fe3cf56efb52588f0f` |
| `packages/client/src/promise/service.ts` | source/config | `6a823b011867b4cc71b8db53eb50089f533f37e5ab43bea024b53913531474e4` |
| `packages/client/src/pty-handoff.ts` | source/config | `b1216390e3ff8c06bc257ade51b9df6563e2c8dee4815158f5da56053eff71cf` |
| `packages/client/src/rpc-runtime.ts` | source/config | `f5934a14bc2dc22bd18a8b1e9a7f11e158dd371c445a3088c41ee5c008a141f5` |
| `packages/client/src/service-contender.ts` | source/config | `ec860f66230a53f17011b3898e2dca2a1c5fb73cf0a4ee8a86d66e84adc6e8a5` |
| `packages/client/src/service-probe.ts` | source/config | `1136fe6495fbb1fb0a3e1d7ee78c92b998caccfdcf81e93e4c7a0746c51f441d` |
| `packages/client/src/service-timing.ts` | source/config | `eb47efff99ff724734277a24c3f1dab3ab720e16506cba4909097788d91afee5` |
| `packages/client/src/service-version.ts` | source/config | `7e9ba76df935665e248362558547009a3006bd2bce3da036de7d190c3424b692` |
| `packages/client/src/service.ts` | source/config | `34cb5b4b93192a6bf705010b2297343df1c6ffa05ed665a2889961eacc3f95fe` |
| `packages/client/src/shared-events.ts` | source/config | `87814cd89fce83960b9c633b665c481ac954c8ef04fb7bf56ca9c69d1724df81` |
| `packages/client/src/solid/connection.ts` | source/config | `d61f97300c59fc949535ac1dd32461a5ac84fd391dfb78dac7548da59bfbca9c` |
| `packages/client/src/solid/data.ts` | source/config | `bb1bfa22037424943fa5414640660489bcf0949565803ce9416e1e6796115a58` |
| `packages/client/src/solid/index.ts` | source/config | `2bcf06dbef73408d4395791213315afc57e141ef868aa0888132d9e051dbf227` |
| `packages/client/src/solid/pty.ts` | source/config | `68be43f3b95a246c40d9406df14a3945440f3de8bf20f62bfc03f9fd7f6be21a` |
| `packages/client/src/solid/retention.ts` | source/config | `f3e69b5f45846c94e4ea085c91d158293267a1d92244266c4577d9bf3ce6a620` |
| `packages/client/src/solid/usage.ts` | source/config | `2aaaa33840841c756697471e0e3c4d0899461da96e1aa405902bdee6006654e5` |
| `packages/client/sst-env.d.ts` | source/config | `969c8a9762cdfe863f1a6a802e9f55b021486806909311013ec0357950790fbe` |
| `packages/client/test/api.types.ts` | test/fixture | `6a4748ffb34d4887c18e885b6ebb651ebe89119ceb788a9b6ba9a87c95cf37e9` |
| `packages/client/test/contract-identity.test.ts` | test/fixture | `d6c9f65cd024c76241101cdb577e4d9022ab7fb3353437fe561e2284000bae7e` |
| `packages/client/test/deprecated-aliases.test.ts` | test/fixture | `5331878047f6f8a28efa61322125dff66210ed0bfd7383aacf9f0b1d613661e7` |
| `packages/client/test/effect.test.ts` | test/fixture | `2e553318f350515031bce4ae3c776dac2bc9ecb7faec3785cf60f073d3a59303` |
| `packages/client/test/fixture/service-fixture.ts` | test/fixture | `8a15fb56aa31bc1fd45a03e3ad618fcc3f0b0a08c5bff3af31c3ae562454840a` |
| `packages/client/test/fixture/service-timing.ts` | test/fixture | `1a4e92e850da05d5a5a0ddb60f790ed3dabdeaf9e7113d7e64a14c3bb4e428d1` |
| `packages/client/test/fixture/service.ts` | test/fixture | `be79650a64594164e0bb6548e2298515167a14ee12402afd9669604b03a847b5` |
| `packages/client/test/import-boundaries.test.ts` | test/fixture | `8e093cd9815ec942329359f8acbe4f8da09166dd91b2250ba716d51059da4e9e` |
| `packages/client/test/mcp.test.ts` | test/fixture | `8107ffb7ae16f392e06e677afbfd3a1540b6744c4db47906d6e347d1a9e51270` |
| `packages/client/test/media.test.ts` | test/fixture | `1a8f9a96cdfa58d5fceed1988b7335285b41a703f46a8e872a6bde3483b57b9f` |
| `packages/client/test/promise-service.test.ts` | test/fixture | `d857a4564e7ee1005872d0fb4ffd01fae76fb08cb0632d421fd5198086158b8c` |
| `packages/client/test/promise.test.ts` | test/fixture | `5408b50b472c686bdaebd62b924202443cbe5b2b1d069422c8c3aca768d804c9` |
| `packages/client/test/service-contender-pool.test.ts` | test/fixture | `78f248a3c772715f4d222e00ebddc57e6091093dc78bbeea70623c4b51791201` |
| `packages/client/test/service-decision.test.ts` | test/fixture | `fed509d4e9623845e001a476d9402237464a7a8d6e5e66c96a6f3e44783ec1e6` |
| `packages/client/test/service-reconnect.test.ts` | test/fixture | `2073f3885ea46120e9c18dfe2bd89dab46049900e9891c04d98fe582d73d3325` |
| `packages/client/test/service.test.ts` | test/fixture | `5c8a9ae92b144a8da939f8e9f05d4a85a1b67a6d51b0be5f0ac55568635b9b95` |
| `packages/client/test/session-parent-create.test.ts` | test/fixture | `040217bf36925b044bbe5a4d243d3ab59bcacada653e2aa243e6bd1aad09fea2` |
| `packages/client/test/shared-events.test.ts` | test/fixture | `d15f6186f8bf7f2445203536117989206190d129147d826f4578642a067589da` |
| `packages/client/test/solid-compaction.test.ts` | test/fixture | `1e99d7c797f29ec51602c79c232b14029604b216d8f5c15283197a85cd44a91e` |
| `packages/client/test/solid-connection.test.ts` | test/fixture | `1f763f132806f44010ab33b0d6377b9b00946df361570f87f3e8d3a409a370ec` |
| `packages/client/test/solid-data.test.ts` | test/fixture | `0e19b8796498b0c539c27453611371e7b2e35b3e3d6faee32b003eab1f2570ab` |
| `packages/client/test/solid-eviction.test.ts` | test/fixture | `5ac3da88a611019cb5d45ecc1714fce4bf373e804250bfeed7e859ed5fff449b` |
| `packages/client/test/solid-inbox-race.test.ts` | test/fixture | `05d7ff85b38a1a3b3cf6b6d67abd3256858a458245d18249efb2a338ef8f19e1` |
| `packages/client/test/solid-pending-status.test.ts` | test/fixture | `bcb04e1703c3b98d6d86eed47137ce66079d37733f93084b139a22ec6f19151b` |
| `packages/client/test/solid-pty-protocol.test.ts` | test/fixture | `f34d5cccd0df5331f1fb08a0d62188eed2e956420e1fb6609df5984c6d73b4e3` |
| `packages/client/test/solid-pty.test.ts` | test/fixture | `bf687bc816becb891f37d14555a38b8fbd62435349ef34862182e0f05ce7bdf2` |
| `packages/client/test/solid-refresh.test.ts` | test/fixture | `15633d1571db81dfb308e41899e2ec09b517a9f7a68b408b9dfd48f2666cf8a2` |
| `packages/client/test/solid-usage.test.ts` | test/fixture | `06cdef61a5b587addac0b8990b2b733b4c677dcc444a0717236bf3d0bd69f910` |
| `packages/client/test/worktree.test.ts` | test/fixture | `523b5f54eaae5d195fe0e19fa761f8f61f92c980f1476afb238903dc29e5d123` |
| `packages/client/tsconfig.build.json` | source/config | `4484bf7d033f6e63103d01fce7992339cb9edd91a280788e1f759a0fd9f3b684` |
| `packages/client/tsconfig.json` | source/config | `aeed8571cd40d34d5d7a36bee53c8f692b8b46ee9618ebe4d8cf1d808fea36d9` |
| `packages/contracts/package.json` | contract | `cd9596af45ff5e46138dc87ef5144a7253ef36b6b985560eb29c87acc45083b3` |
| `packages/contracts/src/api.ts` | contract | `df567b5b8f378478d0b4ef5ff9d6bdd3c0381fa51a7f382e4cb20bfeba2ed19b` |
| `packages/contracts/src/events.ts` | contract | `8b34366e464ccbd8a8b1320ab544a3a2267d7f7f0db50d02aaa2758886328cff` |
| `packages/contracts/src/execution.ts` | contract | `1d28256be1e4b45087ee64a8a1b8b7d7bd00b108c5a20c779152ddc0e2e2846b` |
| `packages/contracts/src/index.ts` | contract | `14d87fb0fa9ab1c0f5a0157edb24445c5bb65d31d0c12f48ff135b4784c49491` |
| `packages/contracts/src/models.ts` | contract | `3861dce22b6d1786e06501819c3476d59eb77fad860bf0b600ef297ea4cf7d56` |
| `packages/contracts/tests/contracts.test.ts` | test/fixture | `ae3e7f7b4b889420fdf9043ddc6fdc5662da0c072433dc11691282036a021154` |
| `packages/contracts/tsconfig.json` | contract | `1342c38f313dca99b33b723ecc28bdfab34426c25be039f2923cdab0eb51c794` |
| `packages/gui-plugins/happydom.ts` | source/config | `33e11b858710a95da15b130929ee81a473e63ebabc4af5da54deb2f087a69746` |
| `packages/gui-plugins/package.json` | source/config | `d29b95da3ee1069ed86cd423d531b2cd9925787b1a55c41ef9fce9b2b7c13a8f` |
| `packages/gui-plugins/src/browser/address.test.ts` | source/config | `06f27f1fb7de3c203eb523e7ed1081a65247cc6e216cce6b68508fe72f503f4b` |
| `packages/gui-plugins/src/browser/address.ts` | source/config | `bf6e1d60ee5457df23c11f71367da4b8acce263a4d3ba9f2b27798b9553c8637` |
| `packages/gui-plugins/src/browser/analysis.test.ts` | source/config | `48b521e0a6ed6977446f2afd5976f1d085f45ee7e8b9a179c19a27ed2c1eaec1` |
| `packages/gui-plugins/src/browser/analysis.ts` | source/config | `43287489295ccb583d03694662d2f6305bcea04da2c6e3d68c12f475bbc96ed8` |
| `packages/gui-plugins/src/browser/cdp.ts` | source/config | `18ffaba3d0a58d7f0514901e417e22f935de939b264b28637eaee0a11b0a4749` |
| `packages/gui-plugins/src/browser/chromium.ts` | source/config | `69752b0ed2b7ac2c130a0ded06ecdefe98511d95e84f871b80b21621ca1805ea` |
| `packages/gui-plugins/src/browser/comment.test.ts` | source/config | `696b548c4807168d1b8fd93541051cec653b9b647d3e63914b648c509bcddc99` |
| `packages/gui-plugins/src/browser/comment.ts` | source/config | `2b00443dfe728fe1876f92236484ceca723f5108f3fdff76b5d3aa8fac46d2c1` |
| `packages/gui-plugins/src/browser/connection.test.ts` | source/config | `44ff7cbd095bf36f60ddaf6f47078876e701d5c94d8edd6be44d70aac8b6da93` |
| `packages/gui-plugins/src/browser/connection.ts` | source/config | `24c1b35dcbf2d8ae7259d5b78c73bbe8c98d721f3eccd73f6dbb1456daa1d83f` |
| `packages/gui-plugins/src/browser/diagnostics.ts` | source/config | `85e0a96000688c1e7bb326b3c012433b92f2f8338df92e6541015e5c482f0207` |
| `packages/gui-plugins/src/browser/errors.test.ts` | source/config | `cec6de549f4a92978f63029374cbc5663e276d4a692fca2dfa244ed653470fd3` |
| `packages/gui-plugins/src/browser/errors.ts` | source/config | `59c1ecac44bcaca42cb75531937ebd4f3457afdcd8ccbccddee38d4713bfbc22` |
| `packages/gui-plugins/src/browser/files.test.ts` | source/config | `b34d3d2b0724ae9884f8da4a4d7f18ba21141babded04aeb5e4d673c4a823725` |
| `packages/gui-plugins/src/browser/files.ts` | source/config | `4d09674d547ebde715dbd06aca6454952d7705f2f0ba31958a5d912ce96097fe` |
| `packages/gui-plugins/src/browser/history.ts` | source/config | `b13bfdcf3aa7ae20e0272d57458f3d9c486dbe523831c1dbfd177d8fa497de53` |
| `packages/gui-plugins/src/browser/i18n/am.ts` | source/config | `ea0a92298f2dd7bf91dcfb9ddb8abc00fd891346dbf864e97b3523446d570c00` |
| `packages/gui-plugins/src/browser/i18n/ar.ts` | source/config | `100ce2cfd45e75fa87ebcc9f77500ba7a27aa3ac027868313864d1f86c66b24a` |
| `packages/gui-plugins/src/browser/i18n/az.ts` | source/config | `fa1a033977e84ad3bc2ac5d3d51b6bdd4ee074cefd8f7bbe15652426f3915170` |
| `packages/gui-plugins/src/browser/i18n/bg.ts` | source/config | `6c4fa078c9a00a6899d443e3bb5387c3172064de43b2ae6fc20d4e2527fdccae` |
| `packages/gui-plugins/src/browser/i18n/bn.ts` | source/config | `3aada9ded831126096da0c4d42bf5b1f87934475845a2cbfaab499de2d8ea93d` |
| `packages/gui-plugins/src/browser/i18n/br.ts` | source/config | `f505c3097356de017ab8cda0668b6a89e159d6c3a72dbc7579b079c058dc4b8a` |
| `packages/gui-plugins/src/browser/i18n/bs.ts` | source/config | `322939f118708d0cee95f02270956c76ad9ae57c91d822d244ce189ddffbe093` |
| `packages/gui-plugins/src/browser/i18n/ca.ts` | source/config | `27fcee2dc4c8d04630bcc91f6b8ba3c8e0aa4667d486efa2fa0733727fd15a1b` |
| `packages/gui-plugins/src/browser/i18n/cs.ts` | source/config | `373eb1ad2c65c34a1e9f1833135f596e1bb6463e10884be3acab7d8098b98b5f` |
| `packages/gui-plugins/src/browser/i18n/da.ts` | source/config | `bcc7ca9ffd059bb1b2fa8f3718433af576023db701da83b7b04a9f2f092a46ef` |
| `packages/gui-plugins/src/browser/i18n/de.ts` | source/config | `00909a9fad8bc004c4b46e0b1243a12742711cc33e4703fdf035b5a0ff2f481c` |
| `packages/gui-plugins/src/browser/i18n/dv.ts` | source/config | `b3f54aca4ced1eb7aec5cd7827a74097ce7975001c04c5af8f4f62466702f239` |
| `packages/gui-plugins/src/browser/i18n/dz.ts` | source/config | `691e8b15bd5f7585375542260b1c5fc45923f9272ff4165b6f8938e389636d14` |
| `packages/gui-plugins/src/browser/i18n/el.ts` | source/config | `88a10d0c5c36391fc0f40c7622a41cdee2f453cc0a203bc55dcf33124f565b2a` |
| `packages/gui-plugins/src/browser/i18n/en.ts` | source/config | `501f301a0ce56a3ab6634a8767ebcb8526bf76473e13ece1dea4c50b4f125541` |
| `packages/gui-plugins/src/browser/i18n/es.ts` | source/config | `65a2dca1064aca60311b4ca882a9be577d8b5bca6b790e8df1a6d6e47e408882` |
| `packages/gui-plugins/src/browser/i18n/et.ts` | source/config | `e0a542f17bfeff20745a6fc3932be3ccc807a5155dbff777e5bfc46e9e7b1192` |
| `packages/gui-plugins/src/browser/i18n/fa.ts` | source/config | `67efc13a6519070be466ec7dd941fd70a415413af201cc1966db7fa2a0761879` |
| `packages/gui-plugins/src/browser/i18n/fi.ts` | source/config | `00dcea61ba4c5bb09ab7f9b1360b44d3980ecd25d2dbc54aa6fad7c77ef591d6` |
| `packages/gui-plugins/src/browser/i18n/fo.ts` | source/config | `1a6c730806cdc3e502d0243e5bbbb657848c17f05c1850e61698f569ff2461ff` |
| `packages/gui-plugins/src/browser/i18n/fr.ts` | source/config | `e639ac6b3701ca59bfdcaa217885ead4c0b7a210e4e4b7443e685bd4a8a4e161` |
| `packages/gui-plugins/src/browser/i18n/he.ts` | source/config | `47885f507f53fc12a081ebdf925b6b45bfa5d1a57283464620edd2638de482f7` |
| `packages/gui-plugins/src/browser/i18n/hi.ts` | source/config | `734477696e26d529e7380883486ab699657e67455837985a2e19934101dd5577` |
| `packages/gui-plugins/src/browser/i18n/hr.ts` | source/config | `416a530c0bc2e0d4541d22a1222408cdc4a7f315903ca2d68be629924dc905b8` |
| `packages/gui-plugins/src/browser/i18n/hu.ts` | source/config | `3e8dfb26033feffb4d8b1e4b94d9737457e4b63b4dace573e59c87fbcf8eee5c` |
| `packages/gui-plugins/src/browser/i18n/hy.ts` | source/config | `e9b0d923589a8db7ad6d0dcf89ccb333fcc601b213a41b53b6eb8fcd10f1b916` |
| `packages/gui-plugins/src/browser/i18n/id.ts` | source/config | `46a10e355ecbead590b8c26e36b13073692b1169b961ff05ed387bbc8b32730d` |
| `packages/gui-plugins/src/browser/i18n/is.ts` | source/config | `900fe757a9444c9f624064ec51a87405630c9c7a77ca86d3530b0130eab704e7` |
| `packages/gui-plugins/src/browser/i18n/it.ts` | source/config | `f9cf8fbcecb5916670de565cc12173829ee39b79cdb6a0d95d255a68e606a2a6` |
| `packages/gui-plugins/src/browser/i18n/ja.ts` | source/config | `8802ae9c8f12bf2cc54b3e7b5ee6bb9650d87dbfd0b5aeab77c5f1f719b4853f` |
| `packages/gui-plugins/src/browser/i18n/ka.ts` | source/config | `f29dff8884c78c3e843997827ebc3286f3ccc04410bcf6ce8a286680eecdb6fa` |
| `packages/gui-plugins/src/browser/i18n/km.ts` | source/config | `ec3746fdd01423705759bfebb592f7da10e83f2e19f2c9f5769e750114b289d1` |
| `packages/gui-plugins/src/browser/i18n/ko.ts` | source/config | `46a6e5bc3c65ca23a3665e6ecabcfa5cb59b56ba7eb1478da93a58a913d648fd` |
| `packages/gui-plugins/src/browser/i18n/lo.ts` | source/config | `2a6fcb081f3a56e23c78caa6aaf40fd51e6d6ccd1b215989b728cec3041d5273` |
| `packages/gui-plugins/src/browser/i18n/lt.ts` | source/config | `da42b0fd38384aa08fee528299fcb1bce79bd20972bd424a193de9c3f16eb164` |
| `packages/gui-plugins/src/browser/i18n/lv.ts` | source/config | `62520822e6de3d215104966c73b6d076b45d4eebfe7f87e1622f20d02574b13c` |
| `packages/gui-plugins/src/browser/i18n/mk.ts` | source/config | `dfea94d370c1eb324869e68a0f054e09d1d739ae4c50496f2e2b037be44c3294` |
| `packages/gui-plugins/src/browser/i18n/mn.ts` | source/config | `da9b48276830113ecb36940b89a3a75e83207e22ce60538b299c2391ca00700b` |
| `packages/gui-plugins/src/browser/i18n/ms.ts` | source/config | `4cb3a5d76b3a4089dcd49bf5c0b874e2221e649f41699738c8193fb336fcb2e9` |
| `packages/gui-plugins/src/browser/i18n/my.ts` | source/config | `15cc628e3599bd1f5e2fb5ff89d6fa7b2204926b5922a6b4473df07363367890` |
| `packages/gui-plugins/src/browser/i18n/ne.ts` | source/config | `bfa42f484149c4f49f6b4d135bde7ec92505b79e217c1a243731f1cac6e069e1` |
| `packages/gui-plugins/src/browser/i18n/nl.ts` | source/config | `f6899ec046d6f9f3a7af6b281af885379ea5d865c7f8b1c48f39f825f2198035` |
| `packages/gui-plugins/src/browser/i18n/no.ts` | source/config | `dbfe96d14b41b7012b70c86b500a838e0674c3a79f65feb47078d69c567164ef` |
| `packages/gui-plugins/src/browser/i18n/pa.ts` | source/config | `092c549c048076ba0c140f681fc71a8f7ff2dfd58f3dac6c95bf8b6f6211b8b3` |
| `packages/gui-plugins/src/browser/i18n/pl.ts` | source/config | `c05a7687bf5aea0a49a73a3b7f39f2c2d6c343bb6d728bbaec0be593cfd00aeb` |
| `packages/gui-plugins/src/browser/i18n/ro.ts` | source/config | `52aca2d2508258918e8a95db1aea5f5c3d6a5c412500d921033c9257d7a31046` |
| `packages/gui-plugins/src/browser/i18n/ru.ts` | source/config | `7fd02407c0d4c7db1e02570736a912deb67e1df1276810ef8c8f33f4e1493f34` |
| `packages/gui-plugins/src/browser/i18n/si.ts` | source/config | `d92a246aaebca295a695d200334dfa37c422b860c4d9f5c2abd7316cac8e0bc8` |
| `packages/gui-plugins/src/browser/i18n/sk.ts` | source/config | `34ca001a09adb2cca59581af791311e8510c2b2eb3861f8d8ab42a47b8213a89` |
| `packages/gui-plugins/src/browser/i18n/sl.ts` | source/config | `606ac5ce6343b87d37ad3a4d8f084e9eec8354cfcdc1f91fd0626b7c7cf7138c` |
| `packages/gui-plugins/src/browser/i18n/sq.ts` | source/config | `eeca0d0b471b417e44067fa02aaafbb9b703cb1af08ea02d03cb3b9a886e4fe2` |
| `packages/gui-plugins/src/browser/i18n/sr.ts` | source/config | `1ef7663248bdbc51100506e932ee9fef6e12a55f99b840b8e9e22a8943ae13c2` |
| `packages/gui-plugins/src/browser/i18n/sv.ts` | source/config | `0f9f4ef6810854fb561005addbf2f09b9116ad050858b1f62702440923d75bd4` |
| `packages/gui-plugins/src/browser/i18n/tg.ts` | source/config | `c56a300dc7781c962c2331edb71967207ff0e2ac509aa84656add9773c7b546f` |
| `packages/gui-plugins/src/browser/i18n/th.ts` | source/config | `d45d18d45b5b0d3e0d6c6276220429b7160088891924a5a2f00a5d599ddd5bdc` |
| `packages/gui-plugins/src/browser/i18n/tk.ts` | source/config | `ab1b73fe3b2c2af4185dacda0b760cec5158431b2ad4e34ee1b59a1e1e63fa20` |
| `packages/gui-plugins/src/browser/i18n/tr.ts` | source/config | `1b6f0ed42cc5f325db55a6c0a3ba02722214b6a5019543453789a154eff8de2f` |
| `packages/gui-plugins/src/browser/i18n/uk.ts` | source/config | `88b7d104475a5ebf42f0e3f516c8867931fa0780901fa3b2fd09791beee2b881` |
| `packages/gui-plugins/src/browser/i18n/ur.ts` | source/config | `ee9b44e895dcd3adda50a412500ce7cba393b047bc9f7af7fc1f11acbf062c86` |
| `packages/gui-plugins/src/browser/i18n/uz.ts` | source/config | `836c204f8627b865ccff699a0238dac1fe1c69d805e95f6d89dc3bbde16c8601` |
| `packages/gui-plugins/src/browser/i18n/vi.ts` | source/config | `d58ecb173bcd779959ada125ef7f25625d6358bcde44dfc5714c41ff9fa58afe` |
| `packages/gui-plugins/src/browser/i18n/zh.ts` | source/config | `efd14caef286d38dccebdf81a6434f421c498bb603e4d2a50067a44a9ac83034` |
| `packages/gui-plugins/src/browser/i18n/zht.ts` | source/config | `721aac56ee2e966fc1b51fcfcc8744e134f0dd824ce1c7de0d9e89a9807abfbd` |
| `packages/gui-plugins/src/browser/icon.ts` | source/config | `0248fd4a2980b2be9f40c8ce738f00bbfac618b775d7ec57bcdd44b9e7eb271f` |
| `packages/gui-plugins/src/browser/index.ts` | source/config | `cb07a4b84824c46b451208c09355b05c201576b61abb1bb0b5b7c5945c0a4da1` |
| `packages/gui-plugins/src/browser/ipc.ts` | source/config | `d0f8de7abe58962ffb8859b1b73d71adf9942ca62c6d9d5752e0e19000a15ee1` |
| `packages/gui-plugins/src/browser/keys.test.ts` | source/config | `51308409ba8bdc106f749782e0a31acc540f6f9fef96febbb002aeab42be378b` |
| `packages/gui-plugins/src/browser/keys.ts` | source/config | `88c8e1c09a79033fbc0a4c3598ad64428eeefac9b14e1ce62374b37cacf6f593` |
| `packages/gui-plugins/src/browser/lighthouse.ts` | source/config | `97620a6f703d184a7caf0c02e83f0201652ab4f9c9187c7b30865e726affa5c7` |
| `packages/gui-plugins/src/browser/link.ts` | source/config | `f28f723c69a3cfa882e3a2122db275c21a18ce55417e0e28e0e2457ac0c16969` |
| `packages/gui-plugins/src/browser/main.ts` | source/config | `65a6c37e0e7b8fc0fa54e474c602fcc0e973edcde5fa6e3adda71293d6d721f0` |
| `packages/gui-plugins/src/browser/model.ts` | source/config | `3fe81bbd984ef7df53fbc0292144b80fe752f0b597b3d43c7f422a2a8b99fe71` |
| `packages/gui-plugins/src/browser/network.ts` | source/config | `2b6a4dad1b2caebf69bc768aa81a1487bbda269cfec3b8ac6c0e84bb2789cfb8` |
| `packages/gui-plugins/src/browser/page-icon.tsx` | source/config | `1d4be77efd443ae5fb60293a7ba3dd39e04c3b46185262956830804d2b8be940` |
| `packages/gui-plugins/src/browser/pane.ts` | source/config | `7600137fca87bc58ac22813844a210d47bf0609ad21a9fe2a38ae72fffb15fb1` |
| `packages/gui-plugins/src/browser/panel.fixture.tsx` | source/config | `4b71799000c1e4fc339b3650939b6c8b23c8bce19f6df95a0599525ddbc87938` |
| `packages/gui-plugins/src/browser/panel.tsx` | source/config | `6a4bc2f9dbeb59e189a196e9c7a9e201d9cd916e997021e6466709787fb84c83` |
| `packages/gui-plugins/src/browser/policy.test.ts` | source/config | `b6867a37b246a608faa71518acf1b1f1975ed7d7d0d6698ae787bec5efb74701` |
| `packages/gui-plugins/src/browser/policy.ts` | source/config | `43acfa6237f99fc1cdd2eab7df482ffc883da3b8ba1be54248ed65eb9ad7c00f` |
| `packages/gui-plugins/src/browser/profiling.ts` | source/config | `23c9e6bfb057403cf50636fac10fa62c33c9cecb3cd00980fb9b84a2242899fa` |
| `packages/gui-plugins/src/browser/refs.test.ts` | source/config | `cb92ce838f34d3cc43e40634c41a9d99d80c75da6e4169c91635231a568d25e5` |
| `packages/gui-plugins/src/browser/refs.ts` | source/config | `bf7562d432d5dad51a3b49f2c6d1de6e64611cd33d83d2c04c91f0b62742fab6` |
| `packages/gui-plugins/src/browser/renderer.tsx` | source/config | `631be50fedf7e70cf873114c00e5b7ae21c722c30e9578cb1866666357a79f9d` |
| `packages/gui-plugins/src/browser/restore.ts` | source/config | `8eec0cff1215470b7c68036194771dfd2b8c4c1732855c508a52b8c246a1a2d6` |
| `packages/gui-plugins/src/btw/i18n/en.ts` | source/config | `a9dd82aa64b413f8c8447c80b56908f9dd928a5ef8e0e42e2a9a744b3587dc58` |
| `packages/gui-plugins/src/btw/index.ts` | source/config | `0c007420916b11def8ff2c0a50fa81a90c1cef3bfd3b560ac046721489383e5a` |
| `packages/gui-plugins/src/btw/model.ts` | source/config | `86364ec4751b5654b72cadec57b74e6ae7f95be6a25a57fe941ed8db6fca82c6` |
| `packages/gui-plugins/src/btw/panel.tsx` | source/config | `049bb52c78df034e40c152533eae3426bcb5cf5b28e779df325e07311ee0fea2` |
| `packages/gui-plugins/src/btw/renderer.tsx` | source/config | `17c6170d62b5c29dede033d673b5ea460c84dafdcd34cfdb9e57619dd59c40cd` |
| `packages/gui-plugins/src/context/catalog.ts` | source/config | `fe8ba5d90bace2f570d339981af50e237e2f6fa99a59cd5cb16e4424f02b0e42` |
| `packages/gui-plugins/src/context/export.ts` | source/config | `9367a6498c571b02623cc06897798f0a827e1030a3b51110f60e92181e60d5b4` |
| `packages/gui-plugins/src/context/format.ts` | source/config | `e7eb085a9a0f3cd1d57fea9c734bdbd2b7829e9eb4a5cf23c8d257674e2ca5dc` |
| `packages/gui-plugins/src/context/i18n/am.ts` | source/config | `3d7d136d54f6d79c6d7b67efc34b3d3de35238350e0b6af3291078704a014ae6` |
| `packages/gui-plugins/src/context/i18n/ar.ts` | source/config | `c903756c41efdcf868754c878571a7a96e5ffae60461bb9b3b398259118a87f6` |
| `packages/gui-plugins/src/context/i18n/az.ts` | source/config | `aa57f538e045548e2171790ca9f1ead93c13c01e47a3e5dc570efdf2ced27c71` |
| `packages/gui-plugins/src/context/i18n/bg.ts` | source/config | `84d2ed10fa4a23b74dcc80219e367059f63e4edc06d7c5b8a58b719d1e2010e2` |
| `packages/gui-plugins/src/context/i18n/bn.ts` | source/config | `e92df9c5280c68f37fb081e808859654b04c2f48612bebd0c4cbe91f476da999` |
| `packages/gui-plugins/src/context/i18n/br.ts` | source/config | `7fb6c59f50ffa9350ccaf1053a99e495d33d4f69efe7e2a1d6d92e72d0d3cdd3` |
| `packages/gui-plugins/src/context/i18n/bs.ts` | source/config | `790e9812ffa604a39bca152fbaa09a790ea38599824f4fdfb0ff4e370cf689b8` |
| `packages/gui-plugins/src/context/i18n/ca.ts` | source/config | `746dc3ede5b8d1659aedc0d4eb6f61334953b412e3b7d1a0c7a684af04f4e231` |
| `packages/gui-plugins/src/context/i18n/cs.ts` | source/config | `83da7e8a9329c9fe2a4709d3da4041c33e7e310aeec18deda9c273e4c68b3963` |
| `packages/gui-plugins/src/context/i18n/da.ts` | source/config | `e04b8f0c604dd374777773e61f53cd41b31112fb67913ec2b6d52a7516e2c9ee` |
| `packages/gui-plugins/src/context/i18n/de.ts` | source/config | `37dc80866b244ae863b1aeb4938ba9d804c87005cf143620950e962f94c3b453` |
| `packages/gui-plugins/src/context/i18n/dv.ts` | source/config | `4812c08a55c5bb233620413b6d51656e08f1dea675afdf9bcba338ebda4be18e` |
| `packages/gui-plugins/src/context/i18n/dz.ts` | source/config | `29c0716b6845600e7e5c4d7b1799a70683643c1c1f2ac7a6527320e9491c1f19` |
| `packages/gui-plugins/src/context/i18n/el.ts` | source/config | `dd70fbd034989d94ed28b0c6a5f8950f21f407a208bd3ff850de7785187959df` |
| `packages/gui-plugins/src/context/i18n/en.ts` | source/config | `8be1c56b4d12fc42522e48d827f8101550e58eb1fa64ed0dd84e17ffb9498537` |
| `packages/gui-plugins/src/context/i18n/es.ts` | source/config | `0310d4ad2cd57620b36a8c745e5aee0d8b7343f5dfd64c2210f72434d5b12fda` |
| `packages/gui-plugins/src/context/i18n/et.ts` | source/config | `0ced66b76b4a3c6a2af3c142684d5c14a9b9683debcefb2c2d5fbfff1ac35694` |
| `packages/gui-plugins/src/context/i18n/fa.ts` | source/config | `0dabeea8ae5c4de10c3b19dfc938330ddb5f81023fa6bd8de7e9350200b02428` |
| `packages/gui-plugins/src/context/i18n/fi.ts` | source/config | `17585272b55d0148c4b26b1e62f69221da2b7437a451c0308fb61053bc9e293b` |
| `packages/gui-plugins/src/context/i18n/fo.ts` | source/config | `c0086479c83025259930bfc474300c4adfe7b480af525554cac6fb464ae10cad` |
| `packages/gui-plugins/src/context/i18n/fr.ts` | source/config | `8190ff598e0c474e4f787fb3bada0259002cc0eeb1c6872d297b1c8081815dbc` |
| `packages/gui-plugins/src/context/i18n/he.ts` | source/config | `6f3931d9546e7ca25f904b7955a0bde21257bafd7a61ea6653733562842afe2a` |
| `packages/gui-plugins/src/context/i18n/hi.ts` | source/config | `b3749312450f4ffc96ef85fc73753b59fba1d9cd417123b8951cb012f6df6496` |
| `packages/gui-plugins/src/context/i18n/hr.ts` | source/config | `e541c6c190aaaea7fd356a0205556edc6f00dbad3c9c47dfc6beff435693eda2` |
| `packages/gui-plugins/src/context/i18n/hu.ts` | source/config | `b4a9171def48f86e5ad05303fa365ef715dd88c9937bf1fbdd0de5c3b6426744` |
| `packages/gui-plugins/src/context/i18n/hy.ts` | source/config | `c4bfcac03370064aa5156f052564fe98f27479d536fadef03a0d24c72fb112c1` |
| `packages/gui-plugins/src/context/i18n/id.ts` | source/config | `2711bcf05a3bb603a34c64871b6c9b178a769e914fd274e27fdd1f1213b42908` |
| `packages/gui-plugins/src/context/i18n/is.ts` | source/config | `364e73b1c2e71020000cd77edff7d6b5cd4022c6d1f96219a0a52de62b8d406a` |
| `packages/gui-plugins/src/context/i18n/it.ts` | source/config | `ce9aa8e852374c2c0e998723f02c7101da4b5233c0767f4e4ceab60eab6e68a4` |
| `packages/gui-plugins/src/context/i18n/ja.ts` | source/config | `763d6001ceb3e40c89abd99bde8c855455f42a16f52ac4e4f3ff9571a8966417` |
| `packages/gui-plugins/src/context/i18n/ka.ts` | source/config | `68bed2c191eba634006debacadef618e076c146be1b60aa78796163441ea5750` |
| `packages/gui-plugins/src/context/i18n/km.ts` | source/config | `739442eb4e8fc82a8783f17d64eb195c94138c2dbce9b953016f41a66b787840` |
| `packages/gui-plugins/src/context/i18n/ko.ts` | source/config | `eaaf5fffcb2b6f4c60e8ee4b9242e637cdbb1c87c48c17844d12adf63f535f13` |
| `packages/gui-plugins/src/context/i18n/lo.ts` | source/config | `674b6c6da100cdf159d5244fc9378cd34686c3375952df8a837ceef34806ed81` |
| `packages/gui-plugins/src/context/i18n/lt.ts` | source/config | `1415411690c8762b822b8df022a4f835331fd0f574ea9f78f0040e6d1d6bee8c` |
| `packages/gui-plugins/src/context/i18n/lv.ts` | source/config | `e534938861addaaee1d2bada2a4d8b6c804fd7ea424f817e44be40574a9093e8` |
| `packages/gui-plugins/src/context/i18n/mk.ts` | source/config | `171614e8719bc351f36b2cf9d3ce84c790b8a14cb8e09badcceeef8855446c75` |
| `packages/gui-plugins/src/context/i18n/mn.ts` | source/config | `f266ef51d60f1a3fa9a1b798ff8108485d6027dcf87e57958a02cf2e31a1e876` |
| `packages/gui-plugins/src/context/i18n/ms.ts` | source/config | `07cb9164f8364923e920bce55982d282e85d923da5628c5ef1107a939f102ecb` |
| `packages/gui-plugins/src/context/i18n/my.ts` | source/config | `84693c46022aa4a0374973db96ccac87b5edfcfc889266867d11897c1ae22249` |
| `packages/gui-plugins/src/context/i18n/ne.ts` | source/config | `422930c16433c06428c3568d2735f102686ef6fc43033108def0cf04c5d25343` |
| `packages/gui-plugins/src/context/i18n/nl.ts` | source/config | `5f8c81ce0b616d57b408e4760b67600c566197ad66e55885e20e31e4a2d7d42e` |
| `packages/gui-plugins/src/context/i18n/no.ts` | source/config | `b7fcbe27e2c928c777fc2fb3a1212754b92ab7104c3094bb3ed64f494db15409` |
| `packages/gui-plugins/src/context/i18n/pa.ts` | source/config | `e223beb55a124757e08ec4b000a380cbf26ce2ae9ee4298f1209311ae8af0ec0` |
| `packages/gui-plugins/src/context/i18n/pl.ts` | source/config | `e0ae2669e1f4142f597c8f3323b47a8b1d7ae4e787d41abc474336f0e1716e2e` |
| `packages/gui-plugins/src/context/i18n/ro.ts` | source/config | `e8541de5eb1e11fa5880756b547c3b51214c0f37cdd4cc721d0f438f6f165774` |
| `packages/gui-plugins/src/context/i18n/ru.ts` | source/config | `ccc5c8bd3b3bfe9d0a651d91e6c439c5a4dd6c3a7e2934b7867e0af68102de6a` |
| `packages/gui-plugins/src/context/i18n/si.ts` | source/config | `03a29c9234f0ee45e1f9965fe8f40fa0fbcd6c4432093d19be3c085754b55e11` |
| `packages/gui-plugins/src/context/i18n/sk.ts` | source/config | `bbe542835d9b2e825103d008bdd54ec8f067186416b07b53fb5eab5aea314104` |
| `packages/gui-plugins/src/context/i18n/sl.ts` | source/config | `58c4d6a40d989808e3a4d064e557760f400c9bc95600a56fade88ad8f64b6e59` |
| `packages/gui-plugins/src/context/i18n/sq.ts` | source/config | `ba415d31d0ea7f188becc38c54e9cf742141b566cbe211d6e7bfbbbc5541098a` |
| `packages/gui-plugins/src/context/i18n/sr.ts` | source/config | `efe8ad2fbde4c457d00eb5453fc1549096d90df48d0610b30d248ee9f4eda552` |
| `packages/gui-plugins/src/context/i18n/sv.ts` | source/config | `40d66ce7799335684b3e68ec700ab232c2d4d323fe0c98719ac7f4cbeb078f81` |
| `packages/gui-plugins/src/context/i18n/tg.ts` | source/config | `74f41a8a22b46f0a8b9e1bd0c98684ea994f956fa56327578ec01d5c3ad31b8d` |
| `packages/gui-plugins/src/context/i18n/th.ts` | source/config | `68909719f17afbc862c93d4b1e1b36a86a1a3bfa20540eb554fb368e08e239b2` |
| `packages/gui-plugins/src/context/i18n/tk.ts` | source/config | `fd8cd313ca822c86067ac3f58f345148b41fd451df7944dd5c067ca00f4a3c54` |
| `packages/gui-plugins/src/context/i18n/tr.ts` | source/config | `217932aba69f1c3dbd0a376fcaf524f61d1122def4b95b2ad19391cc15e8540a` |
| `packages/gui-plugins/src/context/i18n/uk.ts` | source/config | `6a3f0a56338db7fab50ffccbad5d7fb97d135d612a20bbbef356c9690f01bd69` |
| `packages/gui-plugins/src/context/i18n/ur.ts` | source/config | `4a971ded2fb4112faa25252fe38035ae64bac89eb97d31a7b6ccfdd3d62f495a` |
| `packages/gui-plugins/src/context/i18n/uz.ts` | source/config | `4be9f4f8f2dd16179a5fba4dbcafad28f03baf4da78caaf00163f844f422668b` |
| `packages/gui-plugins/src/context/i18n/vi.ts` | source/config | `79160aaa31aa93f7cbe4db383e7577dc4b069edd57c41cc7065328b7ffbed792` |
| `packages/gui-plugins/src/context/i18n/zh.ts` | source/config | `a6ae6d29c9ccddcdfc4a0330d97dacce313520672ae652c828379e7bde59d708` |
| `packages/gui-plugins/src/context/i18n/zht.ts` | source/config | `7e52996fcbfcc479a34f9b753ffaf32021e1f4698d56ef2b803135227e50dd6c` |
| `packages/gui-plugins/src/context/index.ts` | source/config | `ed7d34d07183597bcebe59c95cde03d34b574acde8103d703a3a58b038b18177` |
| `packages/gui-plugins/src/context/indicator.tsx` | source/config | `6a8a19efde178fc8d632992c7f312a3a53d55d3d18d8c3e924b3b67f0b105660` |
| `packages/gui-plugins/src/context/renderer.tsx` | source/config | `c9486abebbbec0fc04bbb4a52d4980e5d43e3eb2fe8851a959863b5c4d3c8455` |
| `packages/gui-plugins/src/context/tab.tsx` | source/config | `eb97dc5b097cf006be0d7caa52962f6f1c4315211c335147e0eb943b0003de32` |
| `packages/gui-plugins/src/debug/bar.tsx` | source/config | `6732160d72dee2ed3eb27d17a2c7a3dfa7ecce1aeb8f516a1e210f598cfb3704` |
| `packages/gui-plugins/src/debug/contract.ts` | source/config | `3bf7f768598a1cd6d581da222638233bd3b5377377dd8f7e8f7ef9e1968a7fa4` |
| `packages/gui-plugins/src/debug/i18n/am.ts` | source/config | `a03aa3f4b387e9d2eb466b821402c99a8e01623797ab7383435230228f096e8e` |
| `packages/gui-plugins/src/debug/i18n/ar.ts` | source/config | `47a1a2cd59eb63f6c3bb4ccc7704b35ee347eafff23fc8fbfcefc83a42796234` |
| `packages/gui-plugins/src/debug/i18n/az.ts` | source/config | `196be721529b9d28dd68f14b3e2b472384b503066f5d393ef1752993add24604` |
| `packages/gui-plugins/src/debug/i18n/bg.ts` | source/config | `ceba6e2dc5ee363d1463a0e6086428bbf725592322519e257ee8dd3df61fcc34` |
| `packages/gui-plugins/src/debug/i18n/bn.ts` | source/config | `81faa4ff505477b4409a315854a849deac518d604cb5e182a6292f049ed6a864` |
| `packages/gui-plugins/src/debug/i18n/br.ts` | source/config | `8326edd27a23520be6b8093f9f982eb6e9ed3a2f5fa67ee764082a89278379f4` |
| `packages/gui-plugins/src/debug/i18n/bs.ts` | source/config | `84eeba5de26e95bcd16be8a01adc48d9b1aa92f52eb8d332b0f05e2a9a0f526a` |
| `packages/gui-plugins/src/debug/i18n/ca.ts` | source/config | `59a37ffc8d5b3cad5b8fbb2db4dce745e92e70cc2e27d51bc5d0d80b2697389a` |
| `packages/gui-plugins/src/debug/i18n/cs.ts` | source/config | `adc070231021016e274d53a8dba8e2cb444e722b54f32e8e5de84645ccc0c987` |
| `packages/gui-plugins/src/debug/i18n/da.ts` | source/config | `7bf658b1dcf6cde60a68e3a6504c74ae5b374f9b094133a7ae18f9a07c7127bc` |
| `packages/gui-plugins/src/debug/i18n/de.ts` | source/config | `47cbc35f5dc07bb46419d8374f93ce4e77a54093cc359eee36643a89c0dfc8be` |
| `packages/gui-plugins/src/debug/i18n/dv.ts` | source/config | `08736d55834f940d9dc54bbc5f51c3c96f432a8e48cbb45f73361ddfb3537d1f` |
| `packages/gui-plugins/src/debug/i18n/dz.ts` | source/config | `f885712bef06b581b481cfeba77772d47db40ab49d8f5b32d0bc9094e78c8dbc` |
| `packages/gui-plugins/src/debug/i18n/el.ts` | source/config | `f2c3850e05b8ba5664d81cfe7e05f774498a3a32401c9e84ab04620cf46f5539` |
| `packages/gui-plugins/src/debug/i18n/en.ts` | source/config | `9b8457a54523801a13670b7bb0d172ee74bfa1a42c42e790d32a3b2482eac995` |
| `packages/gui-plugins/src/debug/i18n/es.ts` | source/config | `4ad2aa0129f46baa4d5d1fa8170f3f5bc81cb814e1aa66bcc49d42a9b102c938` |
| `packages/gui-plugins/src/debug/i18n/et.ts` | source/config | `31717ded30f45bf3e0dfef84810f365e1ac69e745f0bcc103aa47d1e78d14518` |
| `packages/gui-plugins/src/debug/i18n/fa.ts` | source/config | `3871b4abf9dce593ba22422c567a09d9377c72346b42f58d746982c137fd00f3` |
| `packages/gui-plugins/src/debug/i18n/fi.ts` | source/config | `4b31369b9a32827076ec3f2fc06f31a4c8bfb494cf6fc10f23b73719d5732b52` |
| `packages/gui-plugins/src/debug/i18n/fo.ts` | source/config | `062b1f4170c0d12bbeccbea60f7ef6d6be0aabecec6b6a3aeb064eb0d383572c` |
| `packages/gui-plugins/src/debug/i18n/fr.ts` | source/config | `271b58b97230657463d8e7f091066dd2ab03e8546605ce370aaca34d3f29b763` |
| `packages/gui-plugins/src/debug/i18n/he.ts` | source/config | `b21a35caa045ffde19c44bb1160f478208df05bc0ebdb6757554eff54fead7fa` |
| `packages/gui-plugins/src/debug/i18n/hi.ts` | source/config | `c9e96a04819142164a77104660680a7eb56a7d31d3a21e24b84a0ca3d4c9e746` |
| `packages/gui-plugins/src/debug/i18n/hr.ts` | source/config | `2b2adb028e8ab170c6eb83cc07649e1006ef39e1eef0254955e31d500f8aa388` |
| `packages/gui-plugins/src/debug/i18n/hu.ts` | source/config | `e758e39fcfdf987ebf255a559ddb760dfb1695627c83bc87822103a2600e2506` |
| `packages/gui-plugins/src/debug/i18n/hy.ts` | source/config | `fd425632bd10ce5b56694a7eb60176d617571f371233b922bc18a99f19b3288d` |
| `packages/gui-plugins/src/debug/i18n/id.ts` | source/config | `37694e13f479a468b764e22f90283aaabefe875b131844cadea4ab6c77863d56` |
| `packages/gui-plugins/src/debug/i18n/is.ts` | source/config | `b781d5b46c03bd62ce69d0db0cc90aad8efaf4f4374a47df7ce7876c3f3b3811` |
| `packages/gui-plugins/src/debug/i18n/it.ts` | source/config | `a70148556dd614e1ef2c703c5c1a81543d6956867ad3e8bb0e23553fd4a8f2bc` |
| `packages/gui-plugins/src/debug/i18n/ja.ts` | source/config | `2b0be0b79c47b79e2cb684955d5114473d46650ff8d68d095cc974c3ef72a29d` |
| `packages/gui-plugins/src/debug/i18n/ka.ts` | source/config | `75d2499958a29420982fc432a566e327fcf76ed440e1b0c5d06599acfadfb3f3` |
| `packages/gui-plugins/src/debug/i18n/km.ts` | source/config | `71557a4760819a7be0a1287eb6e553f041978a68dbb592d4f27790ef8de95062` |
| `packages/gui-plugins/src/debug/i18n/ko.ts` | source/config | `a7fcca691c5926db323c55e19e9189fcb9abbda26cbc2f190dcf7d4a86ce967a` |
| `packages/gui-plugins/src/debug/i18n/lo.ts` | source/config | `3a190fdb04c73df1f330eb14500411e4fd9de9090593115612cf60bceac85d6c` |
| `packages/gui-plugins/src/debug/i18n/lt.ts` | source/config | `8b04bb1d26bba2bc5d50b9a1fa0e58377d8fe9b088f75649f437eaedd05edcca` |
| `packages/gui-plugins/src/debug/i18n/lv.ts` | source/config | `b5fe418ad6511307664b7ed4ee163d1d57077247c5690a041948bfcda50b7ada` |
| `packages/gui-plugins/src/debug/i18n/mk.ts` | source/config | `ed177a83404906dd4a5c8c0dd8bf7a2ce9f9443700557771756375b7de60f2b8` |
| `packages/gui-plugins/src/debug/i18n/mn.ts` | source/config | `a6a7fe68cff0d3c064ca29af8322bfc729021a4311af5dc64becd868a95ebd91` |
| `packages/gui-plugins/src/debug/i18n/ms.ts` | source/config | `cb9b1d75b3ac5cc7b964f8da34069e73045c5185f467b0dee78724ca15038337` |
| `packages/gui-plugins/src/debug/i18n/my.ts` | source/config | `b8294d1e984df0f2d52618db7c48ce02a80bfe3b3245626b1a113fabdedcf6a8` |
| `packages/gui-plugins/src/debug/i18n/ne.ts` | source/config | `8c80c702b48378b0f2a62e4601280e5738a2f2d70eef436fa0a969eb5967efad` |
| `packages/gui-plugins/src/debug/i18n/nl.ts` | source/config | `64cd3e501f56f8fcd6c7ac85b6a27eb12117de83f39ef529daddbe99a500fd40` |
| `packages/gui-plugins/src/debug/i18n/no.ts` | source/config | `f7035d1c64f9f4de338d0bb920dc55f04f6c051ed5e98a9c738638d9c7d1d673` |
| `packages/gui-plugins/src/debug/i18n/pa.ts` | source/config | `78ccde8e6792c5613624724297684d03b412446d27f1a4705a8a78b395b63fba` |
| `packages/gui-plugins/src/debug/i18n/pl.ts` | source/config | `e9d7d49fa3cfcccdf4f8bebe9c2266dae39c2f7b50b796fa4e7402ff28a519a6` |
| `packages/gui-plugins/src/debug/i18n/ro.ts` | source/config | `e9af1cc43e700e58be0806cb142f6e03f1348988d668facd2326c1d6d6b6a937` |
| `packages/gui-plugins/src/debug/i18n/ru.ts` | source/config | `d5919c031087109b2baa448bb4ce5bca238ef139de7eaf69c81ad9687f6c9df6` |
| `packages/gui-plugins/src/debug/i18n/si.ts` | source/config | `5b4e37a44979610197aa86ee0214ac306783b1254ff4c4d636079398abca6672` |
| `packages/gui-plugins/src/debug/i18n/sk.ts` | source/config | `f8e6efc17253bdf1c90173e6f258fceada0efb5a07b414b4adb1460ea302659f` |
| `packages/gui-plugins/src/debug/i18n/sl.ts` | source/config | `3b4a8898f6cd3a9f181a2ee1185ba82f006107133ad356cabb0624c85db306ec` |
| `packages/gui-plugins/src/debug/i18n/sq.ts` | source/config | `280ad6a66c34ec11c49a151cfa63721a47abd79bb33e9acdaa44d45728546d40` |
| `packages/gui-plugins/src/debug/i18n/sr.ts` | source/config | `fcebee040a3c104205342734d8a2f003410614395a35c6da6815f41f2fef0f83` |
| `packages/gui-plugins/src/debug/i18n/sv.ts` | source/config | `77644575f2e8c3735a1ac817abf7d1de4317b8a0b0e2b36b8ea9ca060c440c05` |
| `packages/gui-plugins/src/debug/i18n/tg.ts` | source/config | `b75d2cc545907f14a495cae6e5771e9cb1e6ea2a543b56d631d2d37b3308371c` |
| `packages/gui-plugins/src/debug/i18n/th.ts` | source/config | `47f4959e44d3a34626daeafd301a2e42d84f30d2fab803323196f448983d7df3` |
| `packages/gui-plugins/src/debug/i18n/tk.ts` | source/config | `9bf021e24a0cec6ed6411a1d26e8b01e11f9a6c7d61562451d639241e044ae81` |
| `packages/gui-plugins/src/debug/i18n/tr.ts` | source/config | `f6ba23ff75048286cea9dfbd75ee14d4ab79b99b8fdf1d28cc0de5378df447c4` |
| `packages/gui-plugins/src/debug/i18n/uk.ts` | source/config | `a3c1f0e2c4c0783cc07ac63b769cac9be075318a701057ebad97c777080c553e` |
| `packages/gui-plugins/src/debug/i18n/ur.ts` | source/config | `9c254a535a51aebadce78a7d5aa781b243eee7c2244e7bd0a0d1bbeb124e7c30` |
| `packages/gui-plugins/src/debug/i18n/uz.ts` | source/config | `36d57d8f6ae83081c338a9a955f03210c5648da7af9b98b82d384dcabc67a0e9` |
| `packages/gui-plugins/src/debug/i18n/vi.ts` | source/config | `bad2bbeab52f090d4fdf185b51bd54b7b9b92d56a9cf1476fbbf7ae89edda2ce` |
| `packages/gui-plugins/src/debug/i18n/zh.ts` | source/config | `9833d935fa864c8e0f2550061ca7c7f5986d193bb2be335976deb630477cf5c8` |
| `packages/gui-plugins/src/debug/i18n/zht.ts` | source/config | `69364580efa5df636d0e842492cee6f4c65295254522a6930a71ed5347c98791` |
| `packages/gui-plugins/src/debug/index.ts` | source/config | `3aa044b558aa7ed97e638e15af50e5ca4d019763fc00c47eb3ace44040933650` |
| `packages/gui-plugins/src/debug/main.ts` | source/config | `a06f8b5c8b2261942dc3811380338c1370bac520b967354f04f425cb5b59e16f` |
| `packages/gui-plugins/src/debug/memory-infra.test.ts` | source/config | `0fecc7b5fc05ae13b2784316c152e136cda89c75ba4043da345fc269ea351453` |
| `packages/gui-plugins/src/debug/memory-infra.ts` | source/config | `0c6fce33324adacf2f512c27dc52c1a02937e76013982270a003f7f13f326675` |
| `packages/gui-plugins/src/debug/memory-log.ts` | source/config | `9089511d738e4de05a53d6e81e7075621b2407dfa508cf78fb93a372636ddff9` |
| `packages/gui-plugins/src/debug/memory-record.test.ts` | source/config | `a69591929fc31fa23be78fabde1a31930d50eca3b24b64d14871342fe6b5eed4` |
| `packages/gui-plugins/src/debug/memory-record.ts` | source/config | `f8d94bc04535c0c8996f4f4f4369b9edb8a4568a7481224fc21cc55f6779108b` |
| `packages/gui-plugins/src/debug/motion.tsx` | source/config | `6c8f50e4e1a4bbe754fae2d05558d472a84f98e99e9063249d1035732b587bf6` |
| `packages/gui-plugins/src/debug/options.test.ts` | source/config | `3644636db56bc654a4e9128516c53872a1155ae6f08e1dd6cb7b030464de7b84` |
| `packages/gui-plugins/src/debug/options.ts` | source/config | `0cf8f738dc676940f6a7ca01e4e484126beab1d6470e02bb792fc7dedea8642c` |
| `packages/gui-plugins/src/debug/renderer.tsx` | source/config | `a1cba6d8925f1c21c9bc46303de61827d70ab394f55c279969c88953387e69c5` |
| `packages/gui-plugins/src/debug/server-heap.test.ts` | source/config | `d41d8746d3a1d50b21b524e9d68510e69d82c18afff46f2c5a70c491b0c1617f` |
| `packages/gui-plugins/src/debug/server-heap.ts` | source/config | `d2e4d0e6ff4b5624464a53015215bab87109bf2cf48c69a847630b8ae00ab645` |
| `packages/gui-plugins/src/debug/signal.test.ts` | source/config | `a34d45eacc04771a0a5e292542f53455d0223e22fbc43d226c8078974a5403f2` |
| `packages/gui-plugins/src/debug/signal.ts` | source/config | `ae95b784a29cd2ca2210e0275a16d5f51d4c697913ba1cca3ac4d1becddace46` |
| `packages/gui-plugins/src/details/config-file.test.ts` | source/config | `02b7570b7854825ac5539dedec7dea49f3a0be4d4b5f3ca8e5f7955078bdb21f` |
| `packages/gui-plugins/src/details/config-file.ts` | source/config | `9a7a09612b20749756ec6ca192d19c3c0c58e53bea13ee4b1db80c9136024d34` |
| `packages/gui-plugins/src/details/configured-lsp.test.ts` | source/config | `8243464f9ad0dcab967f0bfed960337f1804ac235d67edc84df3709c91c9b106` |
| `packages/gui-plugins/src/details/configured-lsp.ts` | source/config | `c5bb49c8ba167d8dbc92d247ad445aff86b4047a6103807e2758066c29590c1e` |
| `packages/gui-plugins/src/details/flyout-motion.ts` | source/config | `b7b224d397cc5850e8b6c6776ff1a3b09f5e9e1acc57fdcb1162956fc430d0c9` |
| `packages/gui-plugins/src/details/i18n/am.ts` | source/config | `8fb8bdbafdf536c2ec1c52ac692e68ea446215e5b2eaa7a4711f4812c1798045` |
| `packages/gui-plugins/src/details/i18n/ar.ts` | source/config | `517773a242c7e135bbfc86f3e2933f9c30ee952247571e623fbf2121e1dc064a` |
| `packages/gui-plugins/src/details/i18n/az.ts` | source/config | `ef0c2d34b74875acf9056e00c2a7967a8d93a39324a32319e27aecc70bbb280b` |
| `packages/gui-plugins/src/details/i18n/bg.ts` | source/config | `b212fefaaff258f763dc44611be821c4825bf6e7e1ed5a72624a7e1121822e23` |
| `packages/gui-plugins/src/details/i18n/bn.ts` | source/config | `74260fe90a1c623f6d4dbb77c0ec16789da95f0a408997c29ddf1804029318ba` |
| `packages/gui-plugins/src/details/i18n/br.ts` | source/config | `32ed5decb06a4d428cf30b5520620c1a690b1d0452e69dd9435503bfd6891877` |
| `packages/gui-plugins/src/details/i18n/bs.ts` | source/config | `e0fedbeed4581e45dfbe5aa80e4e74eb1586d55a11bc4ae269d37c0f540f1278` |
| `packages/gui-plugins/src/details/i18n/ca.ts` | source/config | `0e36ccf39866ebf59903808abb51b95b83906684c250d112c9c4a6629331a9fb` |
| `packages/gui-plugins/src/details/i18n/cs.ts` | source/config | `fbfbed75380d0c17a5082f248ff0d1deed83b53576cf6187df90cee01d3207da` |
| `packages/gui-plugins/src/details/i18n/da.ts` | source/config | `e05e237de4e64cec6e2ea151622f7d42fd233ab064846ea5f625f164fb4bfcaf` |
| `packages/gui-plugins/src/details/i18n/de.ts` | source/config | `643555ca41e359bc81d7b42e4740e4a68f111ef801a12b5873c616155b2975ef` |
| `packages/gui-plugins/src/details/i18n/dv.ts` | source/config | `52be641431ac5035d267c6200829f51dbb33b979709693f03de4673ac7d45a08` |
| `packages/gui-plugins/src/details/i18n/dz.ts` | source/config | `158ee9d1074952db4e97d5af040e115c9e19a9e4321928956897694d6e01d65d` |
| `packages/gui-plugins/src/details/i18n/el.ts` | source/config | `09d2c6b924f0576de8a16c0930069f86a150497163fdcb44598484a36d0b5c84` |
| `packages/gui-plugins/src/details/i18n/en.ts` | source/config | `2551941af636131c67beb82100edf18ae7b1140dc6a128e248aa0aba15411a49` |
| `packages/gui-plugins/src/details/i18n/es.ts` | source/config | `e83f1debde2bc3562b0358565a73c572ab8d34fd65e7e4d1737ff885c3920ac1` |
| `packages/gui-plugins/src/details/i18n/et.ts` | source/config | `0edc24487fc0021cdba3ecd1d8d2562816bda6204f488da38d7e0bcde7facfc0` |
| `packages/gui-plugins/src/details/i18n/fa.ts` | source/config | `618e65223289d0db25a77362043b8e691046541b9a1a02333db833a3a71bbe49` |
| `packages/gui-plugins/src/details/i18n/fi.ts` | source/config | `85c17ac7f18054b36e68232672c49878211784f8d4fe95ddb06a8baf05bde700` |
| `packages/gui-plugins/src/details/i18n/fo.ts` | source/config | `7f9640f5c6178fd26aa0172bccabfe4417d66b53fe6be6385163e2fb2f256fd9` |
| `packages/gui-plugins/src/details/i18n/fr.ts` | source/config | `e131c1718ce11616005d61076acfaf6173bbdd8c47eec8922448cfe728fb5951` |
| `packages/gui-plugins/src/details/i18n/he.ts` | source/config | `81230533c272351cb7e97e19c53a7dd73747434a22f69614e1e4c5e59fd617b7` |
| `packages/gui-plugins/src/details/i18n/hi.ts` | source/config | `9a5a498b4acbcb546474d15ab82e8e2dc54eba7dace8393de68f29fd791806f9` |
| `packages/gui-plugins/src/details/i18n/hr.ts` | source/config | `68ee36f208c596e8939d2bb9a25f022b9ff80e76768e56e7bd7d62cc3397ae1d` |
| `packages/gui-plugins/src/details/i18n/hu.ts` | source/config | `55e66659a0af5bf687c1cc8c296a34a7d8178d752f2c44ac30af8e2703a3cc8d` |
| `packages/gui-plugins/src/details/i18n/hy.ts` | source/config | `f37cbce124003b45342ac6783957b575e4cec3a60ca3d40daa7e0a5e6d7a4460` |
| `packages/gui-plugins/src/details/i18n/id.ts` | source/config | `dd10ce0a765307c84c9af24023773727f6cc7eb354b7a850e9d516ecc4d40d64` |
| `packages/gui-plugins/src/details/i18n/is.ts` | source/config | `9495bca93a37b23dd1364b5cc6484c39ff3450d4c47ad1144113de186e2536ec` |
| `packages/gui-plugins/src/details/i18n/it.ts` | source/config | `5d0a08f4976e13648679249b024ea0560f9679479e94c12c416da550e3f5563e` |
| `packages/gui-plugins/src/details/i18n/ja.ts` | source/config | `5ab20ec44bfb92f8fbd20834228ff000e18322265027f9b6a41e5d0f89aaa406` |
| `packages/gui-plugins/src/details/i18n/ka.ts` | source/config | `3808242c39e28f0399ac4c9ef06e5cd9a9647b64fce766d79d3f7e9275e835ff` |
| `packages/gui-plugins/src/details/i18n/km.ts` | source/config | `b3e535e694342c36f1ff406fc776c998938a2b01273216d4f3c5a93b15c6f4c3` |
| `packages/gui-plugins/src/details/i18n/ko.ts` | source/config | `b1b26f9579b9636a326633fb26afea2cec28f5f88838cefc57b842c068ca163a` |
| `packages/gui-plugins/src/details/i18n/lo.ts` | source/config | `2f47cf297552e9ffecc5ad1d0d85651b1db2bfef73e9a21470dd95b71739da0a` |
| `packages/gui-plugins/src/details/i18n/lt.ts` | source/config | `c69bed2a7fba7c195a1c5e5b42c72ed705667812f6e810a7ae87430967e1c609` |
| `packages/gui-plugins/src/details/i18n/lv.ts` | source/config | `37c4c2ea431a19bf07960106bbc8136edc75b92c90c6c27f88d55fcc68d8d760` |
| `packages/gui-plugins/src/details/i18n/mk.ts` | source/config | `6e62c5977fb1ba2d8ef53b199ba3c42adf4f6b5818f0675b6cd841dbefbbbde9` |
| `packages/gui-plugins/src/details/i18n/mn.ts` | source/config | `b5bd2f744a9495d2607c39c1cd4cfd9d9c612f0641fa3d83bc33873bb77757a0` |
| `packages/gui-plugins/src/details/i18n/ms.ts` | source/config | `20051cbe639eb3e591a62cf5ffd6babe88823d4456139b839d28a9f5596bf0c8` |
| `packages/gui-plugins/src/details/i18n/my.ts` | source/config | `3935cf6f4ec61d99dd64304a3ea4e5828bcca9ec42b407f9c080f7e2987a6612` |
| `packages/gui-plugins/src/details/i18n/ne.ts` | source/config | `f8ebfcc36622ddba26b8c6cc5c43827ab4c72716a5e79806c5f9040af2f1f83a` |
| `packages/gui-plugins/src/details/i18n/nl.ts` | source/config | `692b8a8424cf68390bafadc9992bb569ee509bab60c5a3ef44ef5bde4b478dad` |
| `packages/gui-plugins/src/details/i18n/no.ts` | source/config | `8915bc44fb95e855467bfffac00cc4ea066570b49a2787d7ccdc9f7ddb7e904a` |
| `packages/gui-plugins/src/details/i18n/pa.ts` | source/config | `33a55e3780458e94425ae9c93a60a8f75519ad4a6ed3ec666a80c6b0f0d0e4fa` |
| `packages/gui-plugins/src/details/i18n/pl.ts` | source/config | `bfb1e143a84c8119ac60b4dba17fee637daf3ed04d3763d80b8af11588409ca9` |
| `packages/gui-plugins/src/details/i18n/ro.ts` | source/config | `26a71ce73988ffcd11f1f4092df7f80c9c4af173e523dd5c3a77886108d16cbc` |
| `packages/gui-plugins/src/details/i18n/ru.ts` | source/config | `823293b6be28857a4c762ec9ae7b3d3776301998ea180414f2b3e8e754083c14` |
| `packages/gui-plugins/src/details/i18n/si.ts` | source/config | `3e19036bad377e953c7890a22bf81f8c506d1d2cbee80bd95c27e30b7645390d` |
| `packages/gui-plugins/src/details/i18n/sk.ts` | source/config | `73d2c6e7bf29315e73683c6b2ef1bf06c207a5757041b2b594d8b22530dcaf59` |
| `packages/gui-plugins/src/details/i18n/sl.ts` | source/config | `47079276784edb1180911973a243affa470688d03373c0379f5c026cd99a9729` |
| `packages/gui-plugins/src/details/i18n/sq.ts` | source/config | `4bd5f4392b6bfa163f1bce3247183e9321fbc3e8c0d097694677b9d93e0c290e` |
| `packages/gui-plugins/src/details/i18n/sr.ts` | source/config | `6f1c0edb33dacc13104fd1b471d8cc5d70d5ecf59fd9328125d7d6067f128075` |
| `packages/gui-plugins/src/details/i18n/sv.ts` | source/config | `c4823ade6f96ae4c5b73b821a575a968a5d4e241d07033995bb38c3c88c386fa` |
| `packages/gui-plugins/src/details/i18n/tg.ts` | source/config | `f85d2c0a17b41f7716f4676532695730d13f4be839ed6ddccecd47d775051e89` |
| `packages/gui-plugins/src/details/i18n/th.ts` | source/config | `a7f62a82fd121ba2e5c5af8b64f4f17bc4f8f09725a6bca118563feaa1c1cbb4` |
| `packages/gui-plugins/src/details/i18n/tk.ts` | source/config | `c5f7e42455d1d469443b14df55e0f561c10bee6ecfc16bee2978bed2db22bfd1` |
| `packages/gui-plugins/src/details/i18n/tr.ts` | source/config | `5c233c1534f0c2a9be4ae3c6224bcba3faaa822761cf21093067778843f9d8fb` |
| `packages/gui-plugins/src/details/i18n/uk.ts` | source/config | `626c7e62a43c5189f3dd46e53f947c300edb2dc2f5c54f050988de0269a099d2` |
| `packages/gui-plugins/src/details/i18n/ur.ts` | source/config | `82c8950a68b2600ee63b1e447935c04515e76af3c60073f6bd3206040547179f` |
| `packages/gui-plugins/src/details/i18n/uz.ts` | source/config | `10765b76de7e46d39905c5e5936eeae7010a7fd604ddb8457724995753cc77b8` |
| `packages/gui-plugins/src/details/i18n/vi.ts` | source/config | `62f8f6867bacbc8f416290916059b8a549e44821c93d11ac9f7d580ba1cd375d` |
| `packages/gui-plugins/src/details/i18n/zh.ts` | source/config | `8d99b57d9379f6654b776885b15129df2bddf03bc419c607eb73dd68ef9a6522` |
| `packages/gui-plugins/src/details/i18n/zht.ts` | source/config | `1f681c348540dbc9eeb9573b8a677322eb112b5a015698fee89f613b856ac3a9` |
| `packages/gui-plugins/src/details/index.ts` | source/config | `ed7d34d07183597bcebe59c95cde03d34b574acde8103d703a3a58b038b18177` |
| `packages/gui-plugins/src/details/location-menu.tsx` | source/config | `855cf3a79a50bb984a414fdcdc2a6609dc401a2eeb419f9c8bc7c70293d8a5d5` |
| `packages/gui-plugins/src/details/location-workspace.tsx` | source/config | `be141527950d372ab2f9a6431e9d696bcaf7af2fb16cc5111bf732f62aa2b59a` |
| `packages/gui-plugins/src/details/panel.tsx` | source/config | `8587abdad2d858b406654781d28688866f04f024c1edc4d46a22b29b44b857e3` |
| `packages/gui-plugins/src/details/paths.ts` | source/config | `c6d3a42aa5e6172a26b1c4893160888afe6a5d6d81f79a7cbae643b1ae6529c0` |
| `packages/gui-plugins/src/details/popover.tsx` | source/config | `b015c83867fa72510e97c2348783271aaea02d9155947107ccb1d931cab9f2be` |
| `packages/gui-plugins/src/details/renderer.tsx` | source/config | `e38283ef3c450051ef99ebb31279fdb690f2ac1b83780c34319667d8b46a193d` |
| `packages/gui-plugins/src/details/server-panel.tsx` | source/config | `0d63111291ac34815917b46e8f22e0bee2ae83567a4452af7131ba26fe19c512` |
| `packages/gui-plugins/src/details/workspace-menu.tsx` | source/config | `65deede3a59fbd2dd0f9952b0aed87401ea62ee48de1fe933580c341e25ea754` |
| `packages/gui-plugins/src/env.d.ts` | source/config | `583329bd0b597f904ca3d9a8b604f70856dba9c8e17b3f6c94d01187b64b7205` |
| `packages/gui-plugins/src/file/apps.ts` | source/config | `b26658969899895f5db02428d19ad35800e47e66e590954c0aea4f2ff74856a2` |
| `packages/gui-plugins/src/file/artifact-toolbar.tsx` | source/config | `7485282b4790a842977f2271988b5c43d9961674584dbb7b4608473b4bf3d69c` |
| `packages/gui-plugins/src/file/artifact-view.tsx` | source/config | `05eb5f6daee05918dbf4d1d0542b0f8db921802b971cbf60b8448cd68ed9f1a8` |
| `packages/gui-plugins/src/file/artifact.test.ts` | source/config | `04abca4ca1869ad871d37caf2e2782d94a031939f0f0c5170b34f71c4e068040` |
| `packages/gui-plugins/src/file/artifact.ts` | source/config | `dc472a79741cb9e6b3fd82ca11df593eaed2417601dede562be65cce892eae5d` |
| `packages/gui-plugins/src/file/browser.tsx` | source/config | `b49357eaa086377eb850999082af9fa65ba8880e1b036089a06468e4c3b08e16` |
| `packages/gui-plugins/src/file/context.ts` | source/config | `0782bc7e7a8f693ef601811feb9c3f068740562e2ebc7cba791aff57bcc95dd2` |
| `packages/gui-plugins/src/file/drag.ts` | source/config | `c241328bc6b6f20b827b37022931a23e461c845fc6f9b15ed4f3138c62ebfa12` |
| `packages/gui-plugins/src/file/i18n/am.ts` | source/config | `16b37386d560ea420e6a4b0e7636ca51aa92c605ed73dc5637a80b54a9988a1b` |
| `packages/gui-plugins/src/file/i18n/ar.ts` | source/config | `3fdc42ce87f8ff68fa051e4338ad2325abfedb244629fd38b78654ed30bdec3a` |
| `packages/gui-plugins/src/file/i18n/az.ts` | source/config | `065957e72191ab5287c47d7f6ae4c0d6687c5fe83f7c6c0f5cfc3676c6c5c5b6` |
| `packages/gui-plugins/src/file/i18n/bg.ts` | source/config | `27d33aee980ef9a5477726083f015795e9bfe9ec035f5f1ea47575588c4083ff` |
| `packages/gui-plugins/src/file/i18n/bn.ts` | source/config | `74c12e349fa81717a0270f5fdf319e31af905fc5d054bd8b637d54c7f6b28b88` |
| `packages/gui-plugins/src/file/i18n/br.ts` | source/config | `142e0c03ab5824df04e7b9399505785a41677205236b3dc1be12d6edc7b5c059` |
| `packages/gui-plugins/src/file/i18n/bs.ts` | source/config | `2e2b6e559cf43f3ef2884a55b42ec66deedf7ceb66b32c4e06389efcb5a1c7c3` |
| `packages/gui-plugins/src/file/i18n/ca.ts` | source/config | `4466e7cbeba1e7498562d33121c19e91bd53fcab62e3721b0c92869997b3412c` |
| `packages/gui-plugins/src/file/i18n/cs.ts` | source/config | `79db706368fbea9e6e015451d38a9100320db2814bde7e54beaa02961bae9a3f` |
| `packages/gui-plugins/src/file/i18n/da.ts` | source/config | `4ad5c5cb3a188c9f819d406f88b75b13c4064a1f4055d3cba821ab3b67cc6fa9` |
| `packages/gui-plugins/src/file/i18n/de.ts` | source/config | `719a1417f35fcb2595e99eb8702dba009e92a46f42bf0d387d36c481766caffe` |
| `packages/gui-plugins/src/file/i18n/dv.ts` | source/config | `493d57c673e1a289d2c4e2ba87b32e70244f31a37b0356f0c509ed73f6065a41` |
| `packages/gui-plugins/src/file/i18n/dz.ts` | source/config | `626c24f437c5755fde9415da081e6ce6b06c334dd6dac8abb12f2bc8eff65ce5` |
| `packages/gui-plugins/src/file/i18n/el.ts` | source/config | `73110f9ab3007955b9fb5f8c0e9d9e73882c44e8c1efff0a4d21aa4800297e3d` |
| `packages/gui-plugins/src/file/i18n/en.ts` | source/config | `787bbbd450adc8df075a060cab6840ef2f1debe7cdd32c7496c2ebb98ecd933a` |
| `packages/gui-plugins/src/file/i18n/es.ts` | source/config | `f99a32fd221d0fea14a2485a38c4f5b33010c6cea286581bfaa2536a6d0aeeaa` |
| `packages/gui-plugins/src/file/i18n/et.ts` | source/config | `d3688d9b500449f4019d4c280e287dd77c173cc4e7cc1b98e22ef4780a7eff3c` |
| `packages/gui-plugins/src/file/i18n/fa.ts` | source/config | `de664a8059e3f4dcd1185eee58329d920b9601d6fe212ac9d2f8008cf62dd3a1` |
| `packages/gui-plugins/src/file/i18n/fi.ts` | source/config | `1b4bd71ce3ff6bd7f461fc88765cb561b72b677e86eb9ccd32ebfb4d823c75e0` |
| `packages/gui-plugins/src/file/i18n/fo.ts` | source/config | `18d368dfe349e553f62ed1e03d80478b97bbdb0bdd3d90ca368b070e686c3554` |
| `packages/gui-plugins/src/file/i18n/fr.ts` | source/config | `a3c194b8d2fa182a4868bc3e3a00a90dd84a68c1badeb7d8f766ab8ed20a660f` |
| `packages/gui-plugins/src/file/i18n/he.ts` | source/config | `1cb4dee10bfb49cc54b2116053491f74ede72aa4da3d598a543f72104ff738b6` |
| `packages/gui-plugins/src/file/i18n/hi.ts` | source/config | `a61840a2e98a168ec2cee068e4bceb75fd49d080d9226beb02fc21653b667879` |
| `packages/gui-plugins/src/file/i18n/hr.ts` | source/config | `7f92677aff4a895f63678dc94b77717e49fc0ce83d1db16c3b8bc474a8621336` |
| `packages/gui-plugins/src/file/i18n/hu.ts` | source/config | `db518f5201de738ce0a19319fcb203a7f80a98503a7d64030cc74165066fc121` |
| `packages/gui-plugins/src/file/i18n/hy.ts` | source/config | `e223dfe6d6e231174ab573ba1d56d2b2f76832f622e57d0785aa75bd42edcef1` |
| `packages/gui-plugins/src/file/i18n/id.ts` | source/config | `6b012deb0acccd10889e6015ca1db1298a204d486c78132b036a969fd0b23f90` |
| `packages/gui-plugins/src/file/i18n/is.ts` | source/config | `24a060f9943a0e0aaffc6ca4c8ab680feb12c2c0ef48bb8239fff637198766ff` |
| `packages/gui-plugins/src/file/i18n/it.ts` | source/config | `1ef49bb8461350fc0d85af1d330df373c3bd01de2260727a53026da9e6743525` |
| `packages/gui-plugins/src/file/i18n/ja.ts` | source/config | `3ef429e4ddf8b4741934de8e192e2ab665b98885f1ad02314ccfe525037a551e` |
| `packages/gui-plugins/src/file/i18n/ka.ts` | source/config | `77221af983727f8d9ce64fc85a85aee4c2b030bc549beb569ef56a7055959579` |
| `packages/gui-plugins/src/file/i18n/km.ts` | source/config | `758c31291d4b81dc27f4c3b26dfdbdcfd2ef9ae2072d0bed6f2608a4673b3419` |
| `packages/gui-plugins/src/file/i18n/ko.ts` | source/config | `74b3eb0d3c311d8a61da0c90e16f9bab9c97d4842b6a9eaa634298628ee58338` |
| `packages/gui-plugins/src/file/i18n/lo.ts` | source/config | `d51c367558af08e2e7fa3384b37d2838a14a4f5f7a04bf0d0d2c9fefc06fd151` |
| `packages/gui-plugins/src/file/i18n/lt.ts` | source/config | `61c0f89496989dd0b34249b11137e365c492be6dd440c85994977fb5da86c85e` |
| `packages/gui-plugins/src/file/i18n/lv.ts` | source/config | `f58519162cb2b5daeb5a5ac10f437dcf673a8fad8e183cb362b4923ea0c9c2c1` |
| `packages/gui-plugins/src/file/i18n/mk.ts` | source/config | `f50726d13df540822ee702c7e06133233f2990037f3270063ae9f7d98bf97e7b` |
| `packages/gui-plugins/src/file/i18n/mn.ts` | source/config | `4cd1872ee20bdf809aa95457b6a170f31a6cda71c480fd431c061b42ef8efe1e` |
| `packages/gui-plugins/src/file/i18n/ms.ts` | source/config | `a007488922af63a0468d1c9832935f702a2161bf640b454ca63fb27e75d05143` |
| `packages/gui-plugins/src/file/i18n/my.ts` | source/config | `0d6f71aadbc05e2fd6faea490346fdf32365c726eef46324b1a514bcc33c8d9b` |
| `packages/gui-plugins/src/file/i18n/ne.ts` | source/config | `08c3da8a747125f2f668af467ea6b810e6c78183e2e1201cffbd4075c37e24d7` |
| `packages/gui-plugins/src/file/i18n/nl.ts` | source/config | `0e053febcc7421b88aba54170af1b5fb2df737c2210f832c6d7609186d397e46` |
| `packages/gui-plugins/src/file/i18n/no.ts` | source/config | `dfb2987cba456eee3e05c1c888dea89989a88365e46758d24631bf493e13e39b` |
| `packages/gui-plugins/src/file/i18n/pa.ts` | source/config | `637ed9335b566bb7c0ad2e8335815d28a47c46e92405da8623902f3f4d08d2d7` |
| `packages/gui-plugins/src/file/i18n/pl.ts` | source/config | `a02fcbdd9c912af756df2952b34f9cbcf8d34acef05d91c8ba2e50877b45aab7` |
| `packages/gui-plugins/src/file/i18n/ro.ts` | source/config | `ab7fc6ddd5348dcfbfe9014855fad792155f26fbaf8b66590f37d98ea09ef047` |
| `packages/gui-plugins/src/file/i18n/ru.ts` | source/config | `3c993a4d502c2bee4893c6c20a3333d4fbec33b185895926f16f121f710c1f1f` |
| `packages/gui-plugins/src/file/i18n/si.ts` | source/config | `bd25dc08508eea3235330b23a3f94d69825681d1893cd16f20d8bb635188fe5b` |
| `packages/gui-plugins/src/file/i18n/sk.ts` | source/config | `0e4df36abce59260f636df25cf654d76ce423905fea4e2137506775678ab9d25` |
| `packages/gui-plugins/src/file/i18n/sl.ts` | source/config | `c88510611404c061c96bea216db0a31698e869a07459891522c506ae6906d5ac` |
| `packages/gui-plugins/src/file/i18n/sq.ts` | source/config | `8a90c03bf5a9838d26067066ee0fb63b85f672285f29eb474ff7b9300446fd21` |
| `packages/gui-plugins/src/file/i18n/sr.ts` | source/config | `8f3502d0de0af73b124ce8510c4a9ea4f634fc9169b4634b3f95577008d8dd6a` |
| `packages/gui-plugins/src/file/i18n/sv.ts` | source/config | `abfcd05ef637f98f268612cdf620c92693e713a5bc6f6a4088ae213f0651699c` |
| `packages/gui-plugins/src/file/i18n/tg.ts` | source/config | `a01a916c4d2ae09b329b6a5417e16368831f876137e39b6a061f062c3a6d1909` |
| `packages/gui-plugins/src/file/i18n/th.ts` | source/config | `d560f82f83a2465600d539374027231090fe66dd64862c6c05564d16f072b719` |
| `packages/gui-plugins/src/file/i18n/tk.ts` | source/config | `42bc865a1c9eb0f1774425108bce45d1d959ef0a68d9029925d016d47bf11891` |
| `packages/gui-plugins/src/file/i18n/tr.ts` | source/config | `d97825fdfbc496e8391d15da0e1209980f86aad0118c53f8137dfbd6409da036` |
| `packages/gui-plugins/src/file/i18n/uk.ts` | source/config | `26107d93f6e84de04d20d3cc29cf77eb090a2c70f1b0946eb731a6c3adf1fb84` |
| `packages/gui-plugins/src/file/i18n/ur.ts` | source/config | `9441fdb4f64af75c716fd2a25de90ca65ad75ba5a1dacebbdf187fdd524b44aa` |
| `packages/gui-plugins/src/file/i18n/uz.ts` | source/config | `671ea4e1e80b2fd926199ec5a63f60bd24dc63a8572dc1f96bbfd752debb7e80` |
| `packages/gui-plugins/src/file/i18n/vi.ts` | source/config | `1541454e5a31063135f0c866f8d9fcae61209dd196929cd83ef7da76196a1578` |
| `packages/gui-plugins/src/file/i18n/zh.ts` | source/config | `dfb32a791a6a52cd3ab815e759972d563e00badc3b33e7176087eb5043caa67b` |
| `packages/gui-plugins/src/file/i18n/zht.ts` | source/config | `ebdd0b2c79cf708d7f301495340197c08f3c155adb34b549b9aa128b777ba223` |
| `packages/gui-plugins/src/file/index.ts` | source/config | `cd61e634a4f05031c46c0e646bce2b83969b8487037130c3ca59a0089ac09630` |
| `packages/gui-plugins/src/file/label.tsx` | source/config | `966f8e6652e583740c9e5cadbd6a0309333ddc4bdfb83caa4b718be4b76a708e` |
| `packages/gui-plugins/src/file/list.tsx` | source/config | `40ee30fbd3a8907b2fbed01ccf9999b79a9518caaec9e69f51309516c0d45753` |
| `packages/gui-plugins/src/file/mobile.tsx` | source/config | `3cdd3df0c2922cbdcd528dc943bcd340678d473ea272843d4e155f562b4bad29` |
| `packages/gui-plugins/src/file/open-in-app.tsx` | source/config | `e99066077d9e56f0b548463769faa6fa696088af0228006363c5c01d3d740e70` |
| `packages/gui-plugins/src/file/path.test.ts` | source/config | `70e2491402d06a0b6d0f7afa6fa7379e4a1873add9ad375e241db6321d39f795` |
| `packages/gui-plugins/src/file/path.ts` | source/config | `7eec5263aff2b7e61e72fa8eebcf93ededccdfbd1771713370ade12aef911236` |
| `packages/gui-plugins/src/file/pierre-tree.tsx` | source/config | `25c499b005e96c8d88b730de89e3baa56279e4e6c8f7927f75424c7ca21b2357` |
| `packages/gui-plugins/src/file/renderer.tsx` | source/config | `bf7b31cba38da487e07bba31a05397900bf8cb7e83840774bd52ef22783e3a40` |
| `packages/gui-plugins/src/file/resolve-link.test.ts` | source/config | `d8f8acf9aa8f144356b67b575acc5778f52a0c35eae1bff1b78c00b676cc9487` |
| `packages/gui-plugins/src/file/resolve-link.ts` | source/config | `72aef3601951f81deff7f79259d1c3aefd101d864f27bb127060bbbe0e3adb8a` |
| `packages/gui-plugins/src/file/styles.ts` | source/config | `827d8e266f85110bd8aa4156540e4a0dc02a353e6e4a25f31b72cad9583a1676` |
| `packages/gui-plugins/src/file/tree-model.test.ts` | source/config | `d7ef8aece46bd10d2aa8a461d8fdd88df36aa2f48e7b483203f49de87329b807` |
| `packages/gui-plugins/src/file/tree-model.ts` | source/config | `05918b03ca71b1ed5ac942185df2328e05d4ff0673b00be18371cfbf2314b51a` |
| `packages/gui-plugins/src/file/view.tsx` | source/config | `236396e83ae714ea35853749a0297b5b915bc451ea1952f8ba5d3151dcb220b9` |
| `packages/gui-plugins/src/goal/i18n/en.ts` | source/config | `d66b81cf0143ca3e0ac3790a0173925523beb4b5d764feb860e493ea4b44fd3f` |
| `packages/gui-plugins/src/goal/index.ts` | source/config | `314e554e59d7590db8adb578b2bf9eea30a704a6cb330bf26300d9532f02db02` |
| `packages/gui-plugins/src/goal/renderer.tsx` | source/config | `2e776521c3633056ff98fc2f07b55d7f383fdb43f2005d295f5a96d0c705cea6` |
| `packages/gui-plugins/src/icon-name.typecheck.ts` | source/config | `cadf6dbc0d892fc91617f1a49054978120416f772aa32398e820498a1a4ac2ad` |
| `packages/gui-plugins/src/main.ts` | source/config | `030c2030acf6fbb0fc87dd1a98323134aaccf8cc370b8ac7cdeb814f8ee282a1` |
| `packages/gui-plugins/src/microsoft-office/document.tsx` | source/config | `897d408a9d3d0fac806172bd30cf828c2bbe3d803647390b050bf9c1d7c0b77f` |
| `packages/gui-plugins/src/microsoft-office/document.worker.ts` | source/config | `0055fa2980a911347a9823d9c68231d870d3d462c35dcff620a2759e4dc1117f` |
| `packages/gui-plugins/src/microsoft-office/fonts-cjk.ts` | source/config | `80b3651a65df6eef2ae1304fb2be4a7af157e2411883e96d50590ccbebff7047` |
| `packages/gui-plugins/src/microsoft-office/fonts.test.ts` | source/config | `e2ef5c19194d4a345edbc35966ffe2c544caae840938ccd65c1c4e7c99811c5e` |
| `packages/gui-plugins/src/microsoft-office/fonts.ts` | source/config | `6f822d2f9c8a33ce5d64bd0f1f4bace23dacc41674a64c0169a0706a6c3a1574` |
| `packages/gui-plugins/src/microsoft-office/i18n/en.ts` | source/config | `76d7a1328d8bfe0be86a144948ea0df87e2165bc019af6b1d891ef3bf4b0a056` |
| `packages/gui-plugins/src/microsoft-office/index.ts` | source/config | `3736ba8a301268a14038e2a866fb05f30c9109997a6ea46aa03aaf9d05fbefb3` |
| `packages/gui-plugins/src/microsoft-office/links.test.ts` | source/config | `85e4ba22037228626b23c20f96fd0c8001a110375d08fdd786d5e3bd57c7d8da` |
| `packages/gui-plugins/src/microsoft-office/links.ts` | source/config | `82cb11d34f2192da20bd0d20dc0e59dc5559b2420ba5185435d01864875206f1` |
| `packages/gui-plugins/src/microsoft-office/pages.tsx` | source/config | `072c9b144eccfcc1478e1f8d968537c911ff3f6d70a8bcdca8494f5426f41732` |
| `packages/gui-plugins/src/microsoft-office/paper.ts` | source/config | `4630b6a29cba5de6b937c7f36d383345084e6b62424f08835c4487205a16370e` |
| `packages/gui-plugins/src/microsoft-office/presentation.tsx` | source/config | `14c24fd1524d90054d3ce6a6ea46e9e835cd0f3421bbf4467c36229c621b7b9d` |
| `packages/gui-plugins/src/microsoft-office/presentation.worker.ts` | source/config | `a3a9bd9209e8ab701bab85f25e03e365e6a274f96c9df51387f02a1627ffda49` |
| `packages/gui-plugins/src/microsoft-office/renderer.tsx` | source/config | `f5396adaa2ffb3b3b8525b1397e043013fda63ab5c5bc4b4a864f34a7c20f2c8` |
| `packages/gui-plugins/src/microsoft-office/sheet-cells.test.ts` | source/config | `ca403f473aee614aa43f7796f34060d18574974e2050af053b2da8610a267fc4` |
| `packages/gui-plugins/src/microsoft-office/sheet-cells.ts` | source/config | `a04741a2a430dc2b72bbbcbc7aa8df5977eec5001fdae0991d829271c4c4dad9` |
| `packages/gui-plugins/src/microsoft-office/sheet-frame.ts` | source/config | `09e916ce773485cc3eb938a3717a2a04103660d3413199f7ee6dce637a70696b` |
| `packages/gui-plugins/src/microsoft-office/sheet-paint.ts` | source/config | `c00235b110b6e1ec6849b3fc0f4f56514f5c78ec21098163767f6d4e04f29384` |
| `packages/gui-plugins/src/microsoft-office/sheet-protocol.ts` | source/config | `18c8c69dd5377f0925176c1cadab9c9cf40b3a089f7da3e377a139169ef694c8` |
| `packages/gui-plugins/src/microsoft-office/slide-fonts.ts` | source/config | `d7de2f71c05e7b734c40c4fb0ed373116f1fead69ead7340f435e07b9aee3161` |
| `packages/gui-plugins/src/microsoft-office/slide-protocol.ts` | source/config | `c0f8656fe094744c9f87c1b2dbcdafe64fe0ce6a4b8b9e1b3883be4d8a9432ab` |
| `packages/gui-plugins/src/microsoft-office/slide-text.test.ts` | source/config | `a31b6e5b773cccd0b5ad6c7e3c8e721782e853de9188de99d669174774b20afa` |
| `packages/gui-plugins/src/microsoft-office/slide-text.ts` | source/config | `e4c744171a95909464246e5437f0e54af32e3861c6e03194904d540bcd8954c7` |
| `packages/gui-plugins/src/microsoft-office/spreadsheet.tsx` | source/config | `06c75c557c87617b13f608d4bf08eb2f5e8a5b926229ef89e689496df1dcc1ff` |
| `packages/gui-plugins/src/microsoft-office/spreadsheet.worker.ts` | source/config | `89003907ff29b5847e5b12154d28f143ff3ce1e96e3c837e765959ddbd26f584` |
| `packages/gui-plugins/src/microsoft-office/word-images.ts` | source/config | `820173dc0c969b46f4b4d146bec2191bcf14e40a99358eb997b4775a4afe48a4` |
| `packages/gui-plugins/src/microsoft-office/word-protocol.ts` | source/config | `a878bd068d01b225bd9ae73f56a6fbbdf42cc8b306e98cc082af361002d74164` |
| `packages/gui-plugins/src/microsoft-office/word-text.ts` | source/config | `b802c4f8c1d2896063a525a91af6a8e7aabad79d9890b26859b3154c2c6b536f` |
| `packages/gui-plugins/src/microsoft-office/worker-rpc.fixture.ts` | source/config | `9ac11ea9121c2cd7a1a91b9e635910abfe5e17900688befa6b2c196143fa3408` |
| `packages/gui-plugins/src/microsoft-office/worker-rpc.test.ts` | source/config | `9080d5e72b3d8be0892d90bed221858ce86f0076d3f1676210f71271bcf464c1` |
| `packages/gui-plugins/src/microsoft-office/worker-rpc.ts` | source/config | `a24533abcfb75b2b71074602b154b2d252a032fa7298b351f28dc305aee1749b` |
| `packages/gui-plugins/src/pairing/contract.ts` | source/config | `964f890c5de9dd755528f9eac745703cec7f8e299f524b74cfb601e47f95c0a7` |
| `packages/gui-plugins/src/pairing/i18n/en.ts` | source/config | `929a2cf758c6ff27a74ea267a13feff49b664b4389fe1d65079f083789139f1c` |
| `packages/gui-plugins/src/pairing/index.ts` | source/config | `314e554e59d7590db8adb578b2bf9eea30a704a6cb330bf26300d9532f02db02` |
| `packages/gui-plugins/src/pairing/main.ts` | source/config | `277cb056dd18ed35ab6eee0e30468a70469c50fa256f51509d6e2eb68e6e959a` |
| `packages/gui-plugins/src/pairing/page.stories.tsx` | source/config | `d1db5d3066f018304df76c72a63132362cf664e171e09a1315f4cce70b992a62` |
| `packages/gui-plugins/src/pairing/page.tsx` | source/config | `a692b39783a52452f146222b6ce9318e714015bd085410ef7608050306695661` |
| `packages/gui-plugins/src/pairing/remote.test.ts` | source/config | `91fb82c859a38e73fcb4f655a5b8790048c54fe78fd27957e75a82855fe7b1ae` |
| `packages/gui-plugins/src/pairing/remote.ts` | source/config | `23f77b94ebd2d1e9e66e3be39b415b647c452839506463dfcc530d6e5a224286` |
| `packages/gui-plugins/src/pairing/renderer.tsx` | source/config | `a7732be10bdc5d8b489183bf25095e33bf0ce98fbb723c58197983204ef7e3b8` |
| `packages/gui-plugins/src/renderer.ts` | source/config | `8c8e453115c485053f64f85d48370641d2a261090c74edc6fc7e264411c48e71` |
| `packages/gui-plugins/src/review/i18n/am.ts` | source/config | `172cd23683031c0e16423cea14badfe27b948824ce34fd5b7d9d305e44ac57a6` |
| `packages/gui-plugins/src/review/i18n/ar.ts` | source/config | `98885163666da4acb9bde4f186e71f2a74a25eb7488e4365318c60500374b525` |
| `packages/gui-plugins/src/review/i18n/az.ts` | source/config | `a4e56feb127a5c98de7aa45a43a3e08d5d963e38c99d6d01cc2c8e47ee6ba0ab` |
| `packages/gui-plugins/src/review/i18n/bg.ts` | source/config | `6b9d8e3c05630c2710feaf67183c3e3cedb852d35d6bb1e8fcf1dab538b49945` |
| `packages/gui-plugins/src/review/i18n/bn.ts` | source/config | `29cc3701935940c67aa98f35566847d036ed59bbf2eb60fde9f13e140ad1c0b9` |
| `packages/gui-plugins/src/review/i18n/br.ts` | source/config | `7aa3cdd42569fc67d94953c828bcb0f778bc058ea9d8df1e180a6d49430cad2a` |
| `packages/gui-plugins/src/review/i18n/bs.ts` | source/config | `f3f43589da9c60d94d0504d30c9f9070dc544d5bf730eb3ab5e11c77f7681d90` |
| `packages/gui-plugins/src/review/i18n/ca.ts` | source/config | `54a683ca9831561929965e962006c0e6271023188d86d4d201db4e8d7648ac47` |
| `packages/gui-plugins/src/review/i18n/cs.ts` | source/config | `a0b49d9dedd64d5b9fdeeab987f0c4f2714d926466ce62c71f292c2b61d0bd1d` |
| `packages/gui-plugins/src/review/i18n/da.ts` | source/config | `8bae96c72211e63f36ab056e7f28317624e37c62e531acdf94162ad5252ae74c` |
| `packages/gui-plugins/src/review/i18n/de.ts` | source/config | `896df1105724640490cec515b9d8b0b8e03c194da4992d4f3dca68a19b2db415` |
| `packages/gui-plugins/src/review/i18n/dv.ts` | source/config | `7651f79ce07fbd12d0ea9ed9cd25a29b4686a52dc36f5e1c70065756c811ca12` |
| `packages/gui-plugins/src/review/i18n/dz.ts` | source/config | `83ea9612f98cc1f4bde8f9ca4b6b5cf2ec93425eeda69afd9c427fda531ae4ec` |
| `packages/gui-plugins/src/review/i18n/el.ts` | source/config | `eeb7da8f6ef4d7a03c047130802f5a6a3643d3eefed3d0532b9e2b4785bdae94` |
| `packages/gui-plugins/src/review/i18n/en.ts` | source/config | `b954c29bda174aa776fd50b49decd7c45d33f29c752711d0eb82b59c07d93655` |
| `packages/gui-plugins/src/review/i18n/es.ts` | source/config | `b4ca7adffeec77de6c8c9bf322009ab4e6c9a098d6ec36ad856388f9f8989835` |
| `packages/gui-plugins/src/review/i18n/et.ts` | source/config | `c3dc183e573be04aa90ee43af059fcc4614752e5c479f18033851099f7676cb5` |
| `packages/gui-plugins/src/review/i18n/fa.ts` | source/config | `c95a4dd19b95daf68c3c056abbebb5337a62d718cc3ab38c03bbe9e9d4a80819` |
| `packages/gui-plugins/src/review/i18n/fi.ts` | source/config | `f227f13f57652132c6c1a33905e25887765e247bbea5e4964f70120657d38d72` |
| `packages/gui-plugins/src/review/i18n/fo.ts` | source/config | `f670e8dca92b83f0d4898a4166b2bf84927d7923efb6f6e4b0f5f8e94cb15e2b` |
| `packages/gui-plugins/src/review/i18n/fr.ts` | source/config | `b1326a94aabdfddadcc7384941902a601e5d67c40065dfbf9e6e1314c1b1dd3e` |
| `packages/gui-plugins/src/review/i18n/he.ts` | source/config | `828596630efb3538505229f365b4eff63122f197dbc529a4ad82f4148bf8410e` |
| `packages/gui-plugins/src/review/i18n/hi.ts` | source/config | `dcd7cae17120afa34aa0b0ffcf2b1330fe2dcf422c0f97d56ba5b59ea601f64e` |
| `packages/gui-plugins/src/review/i18n/hr.ts` | source/config | `b1fe73bdc8250702f00b53e7074b7f7b3257922c669db72ca9e20df987ce48dd` |
| `packages/gui-plugins/src/review/i18n/hu.ts` | source/config | `bed7ae7bdd2c2c995716c60e23a4c7e770e78c5b2b871a006d0147c4aa53c798` |
| `packages/gui-plugins/src/review/i18n/hy.ts` | source/config | `6e6ec44d3c85f86bd78fa277386cd73670de51b01477d421c3a6a920b6cc8f5e` |
| `packages/gui-plugins/src/review/i18n/id.ts` | source/config | `d8f8948983099142223af4a204f792a268d95d8b66e3c9b1eb3222f61d8a7367` |
| `packages/gui-plugins/src/review/i18n/is.ts` | source/config | `7807ce102640e2339a4440194dcce9de46f20c80a6de05663dc8fa8d07f0e012` |
| `packages/gui-plugins/src/review/i18n/it.ts` | source/config | `af419e79e668b2b941a686fb589c5cd77cd5806f1335d30132a61b315c1390fe` |
| `packages/gui-plugins/src/review/i18n/ja.ts` | source/config | `7d3b368abb6ac7cf3c7dc6f19a140356561c6357e6c6ce682487e5663b438248` |
| `packages/gui-plugins/src/review/i18n/ka.ts` | source/config | `5fd3493d66909c88560a56cc5b0289f36a9f114d8ca1aad20faa176f229ebaf0` |
| `packages/gui-plugins/src/review/i18n/km.ts` | source/config | `2ba1f8c314a05046808744879410eb64d47292432db333ad80652188f425af2d` |
| `packages/gui-plugins/src/review/i18n/ko.ts` | source/config | `5bf482e85dfd5e9f1a70c99f7f642fec3fb5ad30b0360be66fb55903494897d3` |
| `packages/gui-plugins/src/review/i18n/lo.ts` | source/config | `fb79b865567e2565b0717687fcc6082ea8df073ba1ad630d75401c49bb8bfb0f` |
| `packages/gui-plugins/src/review/i18n/lt.ts` | source/config | `dfefafec415c6b5539b07d046e17069023f96fd2d8736c5b66bebdfad5abe171` |
| `packages/gui-plugins/src/review/i18n/lv.ts` | source/config | `5cbe53991b387263cb982e75cd46d59081553085c39ca4907b334ca81817c0ad` |
| `packages/gui-plugins/src/review/i18n/mk.ts` | source/config | `c7b10cc124df1d5c64e0ede27d15371cc67d0601105cebd50024605e79251f4d` |
| `packages/gui-plugins/src/review/i18n/mn.ts` | source/config | `9884da747abe89d733f73d6e52e233cbc735280248826fbf90cbf894a5ca36cd` |
| `packages/gui-plugins/src/review/i18n/ms.ts` | source/config | `a32b9b77e1b26ae45f1da7d3622799c992a98855a42661113ba21dea3022d7a3` |
| `packages/gui-plugins/src/review/i18n/my.ts` | source/config | `1f7aa4f3a956f55e5558867cc963655d0f6f8504c7acc7e41c24c1a62a772611` |
| `packages/gui-plugins/src/review/i18n/ne.ts` | source/config | `8a3b6e99842cd8c97f33006e08ef0412712cdc1d500e218aeb933bc369fcdc07` |
| `packages/gui-plugins/src/review/i18n/nl.ts` | source/config | `58d2722694c0a1a1f749496fd48076dd8133dcaf4ed8a4f681d8431da7b5f560` |
| `packages/gui-plugins/src/review/i18n/no.ts` | source/config | `846af4fddbbc32ce795814c056b19211bd7dbecc27e4ef849db3bffa43d17769` |
| `packages/gui-plugins/src/review/i18n/pa.ts` | source/config | `b7da6e555ed8cb5bef5743a2a1a2357064ece7cbaea0e61609c43d308e6a51cc` |
| `packages/gui-plugins/src/review/i18n/pl.ts` | source/config | `17cc836c4d0c0c8ebf8dfd38e501417c9f76423d9dee3dd08d50aaab33ae2ac3` |
| `packages/gui-plugins/src/review/i18n/ro.ts` | source/config | `a075ca71498cc4ddc6aaa1d5c3a7f293872311010772e1a4a8137d2e1e62a395` |
| `packages/gui-plugins/src/review/i18n/ru.ts` | source/config | `23c2b655a45e080590d4b5a44e673bde23acddbbbdcdb6dcab5bf928a151e3da` |
| `packages/gui-plugins/src/review/i18n/si.ts` | source/config | `7ab3009d34c3bed76e86ff57de1f91d6b800b09b9feee9c1736517699eb2a520` |
| `packages/gui-plugins/src/review/i18n/sk.ts` | source/config | `7ee5e44488f6a415df8e950a80233c3bcd275ef4eed156fb1c5c3f628a68d761` |
| `packages/gui-plugins/src/review/i18n/sl.ts` | source/config | `75b96fc975a58fdc04fc342e2d074745440fa47a92351d2d91150914513b124e` |
| `packages/gui-plugins/src/review/i18n/sq.ts` | source/config | `1bc4cf36bb1cf7b8a04561d77d0f5b7d2e6d592973f318120ba8e565a6ee919e` |
| `packages/gui-plugins/src/review/i18n/sr.ts` | source/config | `e88563bc170b8dca0fae04fb540e77ef7234e7577c56e04a33857fb116aefff2` |
| `packages/gui-plugins/src/review/i18n/sv.ts` | source/config | `9e70ace8f7165e0aae0f6cc97c1c1a9282fbecf1f458a766e03ae7202302095e` |
| `packages/gui-plugins/src/review/i18n/tg.ts` | source/config | `bd990c764fb2077a3c054e21c7de7c1c346f523e211e4cbfafc3ccd45abedfde` |
| `packages/gui-plugins/src/review/i18n/th.ts` | source/config | `42269749b8d9428abbf292e9ab76bb0323aa0348d9619febb6f5fe3fc88a2548` |
| `packages/gui-plugins/src/review/i18n/tk.ts` | source/config | `02df3e6d08979b1d1af1df7eb8f3f641117ea8eeb79ff483a250d24dc045c91f` |
| `packages/gui-plugins/src/review/i18n/tr.ts` | source/config | `b61c8a736a7f4d8dc1dfb290cd992ddabfa2d32806301e8392749d13f2b90960` |
| `packages/gui-plugins/src/review/i18n/uk.ts` | source/config | `7b782a9100c83aa39c2fc92c5fbe3b07498c7c6c3fc04f2cf4e1cb3657b268cb` |
| `packages/gui-plugins/src/review/i18n/ur.ts` | source/config | `fb693ee24db5001c48473ec4af38106ffc6c11a559bbcd4aacaac6aace547a43` |
| `packages/gui-plugins/src/review/i18n/uz.ts` | source/config | `5208d747ff07b4557bb4b173931111159d02f941b39f4727386dbc4f76901e56` |
| `packages/gui-plugins/src/review/i18n/vi.ts` | source/config | `e46d2b8ec1c5679b7463f4dc9da0c0bbc567aabf0e8d12abc961765622a7c318` |
| `packages/gui-plugins/src/review/i18n/zh.ts` | source/config | `ed9d02816fe4a28c97ffad84368124a004bfc02f54899c274af6705254d637c7` |
| `packages/gui-plugins/src/review/i18n/zht.ts` | source/config | `3dc4b4d6c647013d157f28577fc0b565bb8b164dddeefde47c4a534e1b3dc386` |
| `packages/gui-plugins/src/review/index.ts` | source/config | `9dbcaac452e753ae356fa474d291097eb9ea91d28913c5162826d5fce71d8c7e` |
| `packages/gui-plugins/src/review/kinds.test.ts` | source/config | `1797df7d77250636b9b73b4a5562b08d29bfc814251e4a12428949313b31ecd8` |
| `packages/gui-plugins/src/review/kinds.ts` | source/config | `a3f464e8d796ab22832874a9cc86cd37ee25d0c505addff4ede431f9c1e47d6b` |
| `packages/gui-plugins/src/review/mobile.tsx` | source/config | `0216c8ae3525a80257da2fe934d1474453f5987a614cbbece819c513088f1d02` |
| `packages/gui-plugins/src/review/model.ts` | source/config | `231fc23d028461cb1712fb4eb55dd5bc17c2cf77079007a8f22903222c7de543` |
| `packages/gui-plugins/src/review/panel.tsx` | source/config | `2742535f9246a38f24e9a4bbe87c291dfea71cc7a0fb51f087f67b811a7135d3` |
| `packages/gui-plugins/src/review/parts.tsx` | source/config | `3cb068d62c9c583011b3f370e07365d13b51328aab43eb2e7870df852cdcecdf` |
| `packages/gui-plugins/src/review/renderer.tsx` | source/config | `053cca3ecd337e255553e6b03d7cf315b1bfc76a0589e0b6a2bb2241f2ba6632` |
| `packages/gui-plugins/src/review/settings.tsx` | source/config | `a069ee313c475d17489d471cd95dd1154f061a715148528184deb2fa82713398` |
| `packages/gui-plugins/src/sources/i18n/en.ts` | source/config | `19b530a75e5aab06e6a8a3b4e979ba3e66d032673ff4324398469e0b62f4cceb` |
| `packages/gui-plugins/src/sources/index.ts` | source/config | `314e554e59d7590db8adb578b2bf9eea30a704a6cb330bf26300d9532f02db02` |
| `packages/gui-plugins/src/sources/panel.tsx` | source/config | `2f9ff9aed34d5d7ec479496d804e9a12ada65d116ab5e431a886526d2d439805` |
| `packages/gui-plugins/src/sources/renderer.tsx` | source/config | `3b27e4e44f99974f4896cae916f1ae0ef82548af2a1b6c2fba7f29782928ae6e` |
| `packages/gui-plugins/src/ssh/askpass.test.ts` | source/config | `4aa172ab95132ce686394f997ccd5dad5640c1ff03a9e4a8caac58e8e2778265` |
| `packages/gui-plugins/src/ssh/askpass.ts` | source/config | `fa8d8f66bfff1ec0c31d996f1d79f2de39ca75ada7f12047b5f8cf72cb79d0ce` |
| `packages/gui-plugins/src/ssh/bootstrap.test.ts` | source/config | `d51d7ae4b574b6330e509ee67cf6909c288707178cfac1e6b9b7ba18c2841211` |
| `packages/gui-plugins/src/ssh/bootstrap.ts` | source/config | `7b406a9bc6674d64d296df52a1ae1677b978ce1a3ba7d7d28a6bd46c7d4ff7e2` |
| `packages/gui-plugins/src/ssh/command.test.ts` | source/config | `596555d46fd2ed8d4f7c0fac8bde8c2563dd4abfc868be98b4e67e42c7b6f323` |
| `packages/gui-plugins/src/ssh/command.ts` | source/config | `3241e825fe2f70d514eafef6e562b5f46a3e0aa39e6dc4a1eab5acdaa6f23554` |
| `packages/gui-plugins/src/ssh/contract.ts` | source/config | `81885151923e573be3a4c8121247fef182f484974590b0b05ed16235757e2dbe` |
| `packages/gui-plugins/src/ssh/controller.ts` | source/config | `955a55d64afa7153783a316cb32154411877a4e7f1bfbf474d531725a3ddffb1` |
| `packages/gui-plugins/src/ssh/cover.tsx` | source/config | `f47c1cfcc27e8892cfbc34beaaabf52a2dceaacde9b71a55be9fa39b78b948d3` |
| `packages/gui-plugins/src/ssh/dialog.stories.tsx` | source/config | `703e6a78cffbfd57581af1f74477e54fd0c9127663216555489d82fbe2cddae1` |
| `packages/gui-plugins/src/ssh/dialog.tsx` | source/config | `eb93965e281612c702bc87471337fe83acfe383333e3bf79b497566e19d30306` |
| `packages/gui-plugins/src/ssh/i18n/am.ts` | source/config | `8cc19440cda04bef543116a3e88affb7807441048b35dbff2a2518b00b63fb5c` |
| `packages/gui-plugins/src/ssh/i18n/ar.ts` | source/config | `c6c10ec4bbdba7bcd4c04fc734fde36894ee9a1bf8670eaf12a3de44614b9c23` |
| `packages/gui-plugins/src/ssh/i18n/az.ts` | source/config | `f244080b5b0d5435500d3e633e74a6f606d6053a788320c65a6ad8307fae44ec` |
| `packages/gui-plugins/src/ssh/i18n/bg.ts` | source/config | `191c9cd515f649ed6072fb4b48c4720e3052dfcce248b2b20fa07a6c955f42c1` |
| `packages/gui-plugins/src/ssh/i18n/bn.ts` | source/config | `4c1f539e7ace76005f4377bc0fc725b160280d731d24e3b2fb9d00a88e57d570` |
| `packages/gui-plugins/src/ssh/i18n/br.ts` | source/config | `12aead57b1ca867c3637e0a69e2ded0310e31f4c3eafde80cc7cf68014e6a0e6` |
| `packages/gui-plugins/src/ssh/i18n/bs.ts` | source/config | `555e2b2eff224fd174fbc5b86676063a885a3c47d88ac1348b191ddd186a84b4` |
| `packages/gui-plugins/src/ssh/i18n/ca.ts` | source/config | `144831d212c7255d86cd183918c87694470513941b2476814bf8a48ac12fc31f` |
| `packages/gui-plugins/src/ssh/i18n/cs.ts` | source/config | `5ec637b3758cadca4549bb8c4a7ea15012c6cd37ada1ce0389568df7ea466ac4` |
| `packages/gui-plugins/src/ssh/i18n/da.ts` | source/config | `9afc7f0826286380e89174c76cd9e3269a1f34bbb1e07c85104c16af9efc6298` |
| `packages/gui-plugins/src/ssh/i18n/de.ts` | source/config | `fc8c655ed2b28a8b5ec024c0e99df15f90486ffc7c072e4858a0bb696b77b7a1` |
| `packages/gui-plugins/src/ssh/i18n/dv.ts` | source/config | `7bd1c48df923f5cec9e5cf0e517f3f502b71f01ddf8b1cba2f02348aacd33457` |
| `packages/gui-plugins/src/ssh/i18n/dz.ts` | source/config | `e9ac1d6cc9f93881bd0e3ef6b56db9263f6108f335182607ae780457751c9806` |
| `packages/gui-plugins/src/ssh/i18n/el.ts` | source/config | `2a0d5737f4e1cf54c1b9fa50c052addde58ebd10b4f251476d5c016940000c25` |
| `packages/gui-plugins/src/ssh/i18n/en.ts` | source/config | `6aa7f160e0cdfd041405984110751a780f9a4975c3b0ef32ad35681a7d1b60aa` |
| `packages/gui-plugins/src/ssh/i18n/es.ts` | source/config | `9b0681929c0ac32e60035d0e7c378cf3dfbefa2e555c9e06854e303b5a4d6878` |
| `packages/gui-plugins/src/ssh/i18n/et.ts` | source/config | `8dc5515cfd51d308082eb4c9254a5fe4efeae44ef5f06bc8e62e2c053b4953e7` |
| `packages/gui-plugins/src/ssh/i18n/fa.ts` | source/config | `a41d46f487e8d50e44c707eff6cdc889de4d1d9c8376ad8b58fa2608cc44338c` |
| `packages/gui-plugins/src/ssh/i18n/fi.ts` | source/config | `523919fc1de108424c676f6479fedf1f98f28b1afa0f608edb00d980230bb997` |
| `packages/gui-plugins/src/ssh/i18n/fo.ts` | source/config | `3c15c9d6f4a75b4e801f9c704664ca69608a13887e9610f5c6a6c08bcc71c7dc` |
| `packages/gui-plugins/src/ssh/i18n/fr.ts` | source/config | `b69fb463451158548a135bb0193815775a8340ddd97cdd239196cec2882fc13f` |
| `packages/gui-plugins/src/ssh/i18n/he.ts` | source/config | `422087446dc04c7fe7a571796b73045a2ccf7e9a75692ada7f5ebd0de146a3dd` |
| `packages/gui-plugins/src/ssh/i18n/hi.ts` | source/config | `4b3065445029d3dc12d194c6847725e23e0540a023e5dd87e85056ac0eb6473a` |
| `packages/gui-plugins/src/ssh/i18n/hr.ts` | source/config | `bf5364c25ecf11d50d4604ff1dccf518c758606f6a4976588dd787b0f3d7d64b` |
| `packages/gui-plugins/src/ssh/i18n/hu.ts` | source/config | `9275fb37238a38e58d1abe15bb217c198eadd6a634222e71430838c8decc71b1` |
| `packages/gui-plugins/src/ssh/i18n/hy.ts` | source/config | `c8d1728905ee0cc6eab516c1f5f8f82660a54b5b9938d1078bef86456dcf8952` |
| `packages/gui-plugins/src/ssh/i18n/id.ts` | source/config | `d291f89f898699348305f1014314a38291578548bcb497797980a4076abf9a36` |
| `packages/gui-plugins/src/ssh/i18n/is.ts` | source/config | `8e706293354f0cc96362be1c47d8b38b5ee63498de7805b19b808a58f0ec203d` |
| `packages/gui-plugins/src/ssh/i18n/it.ts` | source/config | `f77e7f94bb028384c679153f60ed7902b685a78e0b7df88499a01bb626bee0ec` |
| `packages/gui-plugins/src/ssh/i18n/ja.ts` | source/config | `e52017578a521d09ef2895b0eb1656296dfc9f124bfcdcc8766d84bfcbb33618` |
| `packages/gui-plugins/src/ssh/i18n/ka.ts` | source/config | `d0ba0b4548b656e6ae101b354b9d300bce71cea6e7f0f1938c06ae49d83cb6ba` |
| `packages/gui-plugins/src/ssh/i18n/km.ts` | source/config | `5c68a591e706f8c134625a026429186fc83d3f23fbc49cba88e1dc34c6366975` |
| `packages/gui-plugins/src/ssh/i18n/ko.ts` | source/config | `a7a85e2a6c613eb84d4fbff18ca0e6b9e507f304e99a9ce2664691ff6a750b8c` |
| `packages/gui-plugins/src/ssh/i18n/lo.ts` | source/config | `4cb8cf839ac3455955df9b76ea396edb4ba524408d7455f7a8125250fc1d42fc` |
| `packages/gui-plugins/src/ssh/i18n/lt.ts` | source/config | `f18634454efe3aa6545961173ae6387565344a293b09f0c7bb1400e5c489bfd9` |
| `packages/gui-plugins/src/ssh/i18n/lv.ts` | source/config | `3cf0edd3f1e3963c21902b444e7eac11355769cc94432e762e72289229528c92` |
| `packages/gui-plugins/src/ssh/i18n/mk.ts` | source/config | `a40ded56cf4174deda40c2dfebf539bce9afba6e0589d8d74c43c8c816e6ae46` |
| `packages/gui-plugins/src/ssh/i18n/mn.ts` | source/config | `15827635ababec73fdbed5bed9d061869e21b082e875c6d08a7eee7bef1e16aa` |
| `packages/gui-plugins/src/ssh/i18n/ms.ts` | source/config | `2032b5b991823daf12ba14852290700cb645a524fa2052dc78c6923d01292093` |
| `packages/gui-plugins/src/ssh/i18n/my.ts` | source/config | `02cfbdcb03ba1d4a990a24c8a659343c14d33ca53e1700d8330b61719a44233a` |
| `packages/gui-plugins/src/ssh/i18n/ne.ts` | source/config | `e320f6c33c766b1527dca6468254fbe8f57de20536febcffed983b83eefcad0a` |
| `packages/gui-plugins/src/ssh/i18n/nl.ts` | source/config | `6f8e8f2ddea22be273d57abb570493149078e9edac8363aec2d597c46507e954` |
| `packages/gui-plugins/src/ssh/i18n/no.ts` | source/config | `9ba10b0ff5a6768c62cafc06da3409c2809450912da3a5f5742ec6dbc34a3fd0` |
| `packages/gui-plugins/src/ssh/i18n/pa.ts` | source/config | `3944ea73df08a53e012ff22832641d8a7a554f8348c3e90deb69c93b5bab3e0e` |
| `packages/gui-plugins/src/ssh/i18n/pl.ts` | source/config | `ef044324f728bd218f4deb5596e5744d735333f6df29db77d46544b6511de556` |
| `packages/gui-plugins/src/ssh/i18n/ro.ts` | source/config | `9fd51eace84a0a46870d79edc57e0f940a582a2a922501e5be6be82630faa12e` |
| `packages/gui-plugins/src/ssh/i18n/ru.ts` | source/config | `c5c3e5680f479034e8140ee1221d349b39b4c2eea763b51dad40794111dcc919` |
| `packages/gui-plugins/src/ssh/i18n/si.ts` | source/config | `71c62fa679cfbccc7d4a957957187257b16703f15a472910ddd1a228bf700ac6` |
| `packages/gui-plugins/src/ssh/i18n/sk.ts` | source/config | `5280c514fb2edc2d08e58d13230911cd4d6d84b97d2ebed7fb85a14ca2fc78f1` |
| `packages/gui-plugins/src/ssh/i18n/sl.ts` | source/config | `da378a6717ff2c5d8895aa7fab7fbac8df2c8789d30c3162f11224526136e544` |
| `packages/gui-plugins/src/ssh/i18n/sq.ts` | source/config | `2465d2953c5111d19b26165ee22cc1497ac62a73e2463ffcd22d8f7de4b6ba25` |
| `packages/gui-plugins/src/ssh/i18n/sr.ts` | source/config | `ba13515a25375a71851a7ad8c49e5c54c3631e64227264f4da19a231e3c1bdce` |
| `packages/gui-plugins/src/ssh/i18n/sv.ts` | source/config | `0c8279b18b9a43d530e6968d07c441a7c1fbc06ca72585f0c817469de2f86b86` |
| `packages/gui-plugins/src/ssh/i18n/tg.ts` | source/config | `0951d21fde34dcf57e5613fe6385cc5437a7471544cf9cda12aeda26a4b575d9` |
| `packages/gui-plugins/src/ssh/i18n/th.ts` | source/config | `adc1d0c5ddb24b7e76029d7b5aa498781cd480385dc4902cc7f8728b33c4ca75` |
| `packages/gui-plugins/src/ssh/i18n/tk.ts` | source/config | `337bd8c80b480d929868957e8616ca25256875dfdcea3c4fa074e58806a1e465` |
| `packages/gui-plugins/src/ssh/i18n/tr.ts` | source/config | `3feabd200352708790ae5d7c1adb9c4ae6b91e9336fd2264f030d40b2a307a8c` |
| `packages/gui-plugins/src/ssh/i18n/uk.ts` | source/config | `85aba8fbf1a7532934f6a862a20a5d7b9497d3c3793bf6cf7cb44dc54584ccb1` |
| `packages/gui-plugins/src/ssh/i18n/ur.ts` | source/config | `ff4a741f5989e55662e852ac28d3457e313a01f77ab095d4b0dac60af79b4a24` |
| `packages/gui-plugins/src/ssh/i18n/uz.ts` | source/config | `89d46e9c5e343f96484f101bc151e1b1500ce8f3857f7fcf8d9a45988765ff37` |
| `packages/gui-plugins/src/ssh/i18n/vi.ts` | source/config | `9c60c4199e7cc47f26fbb07af163dde545a427f0b0a79182baeebfb121c553b3` |
| `packages/gui-plugins/src/ssh/i18n/zh.ts` | source/config | `11391ce11f8d9822292de0a468c765688e8b35b89cba4dad25871efa9a377d55` |
| `packages/gui-plugins/src/ssh/i18n/zht.ts` | source/config | `77f2582468d6873edf9859b7bbbb5b15cb7515c15adc23e98d2b0cb6b736174a` |
| `packages/gui-plugins/src/ssh/index.ts` | source/config | `ed7d34d07183597bcebe59c95cde03d34b574acde8103d703a3a58b038b18177` |
| `packages/gui-plugins/src/ssh/main.ts` | source/config | `750ed39ae37819e2d12c820da956c17ca8324294294fb859e46d5d5489ca3821` |
| `packages/gui-plugins/src/ssh/name.ts` | source/config | `e577bcb9d125146e02605b31b9236b93622f6cbb8f06da03d37ed8d618b78a6c` |
| `packages/gui-plugins/src/ssh/remote-cli.ts` | source/config | `76321ec9020cca45d234f18c76b148a649c4ccaaa40978f3d1e3d2d2df76b153` |
| `packages/gui-plugins/src/ssh/renderer.tsx` | source/config | `912ddfea3e3760a36ca1a3775b2d9b98df5534bcd43f6a0880bf2d33aa2ebf06` |
| `packages/gui-plugins/src/ssh/row.tsx` | source/config | `3ffa8dea549c6afb3b4ac19ab5bdce6898d4458f64773d7736514d75f3f30fbe` |
| `packages/gui-plugins/src/ssh/state.ts` | source/config | `56175a8e4a374aab396fc0e68c3508a1b05b069a54a406da0a4778f94189dfad` |
| `packages/gui-plugins/src/terminal/connection.test.ts` | source/config | `4b9bc798bcda2103bcbdfe193a71da6e9ebad10c313a26ae231431bd9cbe302e` |
| `packages/gui-plugins/src/terminal/connection.ts` | source/config | `a28e70295fe88f04bd6c9620009d4041e0d7863505e9720fd766d77ff446a08d` |
| `packages/gui-plugins/src/terminal/focus.ts` | source/config | `0a3026b7aa0cda6d5b3ab98ea183cc5090411d9a16827c3caa74a2921f45cbe9` |
| `packages/gui-plugins/src/terminal/i18n/am.ts` | source/config | `e16feab50a2a024fbf985a5d2a83dd8d770557194035e7c23c99d12d5f0ad8ee` |
| `packages/gui-plugins/src/terminal/i18n/ar.ts` | source/config | `d3bb0466eeec6eb0def26e271bf66dfbf1817c4542a9d1f156fb7bda9ea32e8b` |
| `packages/gui-plugins/src/terminal/i18n/az.ts` | source/config | `d9d05c52aa824623a7969d3a350cb21189d02065ff7048ddd748aff6909359d1` |
| `packages/gui-plugins/src/terminal/i18n/bg.ts` | source/config | `8def4eb5fb4919e1da5efab9ad41da3c9c496f9e5b41d98c191356f7bcea560f` |
| `packages/gui-plugins/src/terminal/i18n/bn.ts` | source/config | `e396476293af44830d2a6d85a0f145e0bc0049ec78ef6e269cf5001f9f06d9f4` |
| `packages/gui-plugins/src/terminal/i18n/br.ts` | source/config | `0ee474018497cea0fc6ee5da504c2e79a7d38b84c1a371df78e2c28dbf975336` |
| `packages/gui-plugins/src/terminal/i18n/bs.ts` | source/config | `195f1c797863a41ea92d89473fff80e37efb780d60ff2dacb0a2635ce9dafa62` |
| `packages/gui-plugins/src/terminal/i18n/ca.ts` | source/config | `527d9b018611c81639f2ffa9cc4bc0a8750184ce1b7e5ea8295a0a5a187d9b41` |
| `packages/gui-plugins/src/terminal/i18n/cs.ts` | source/config | `0a8f15f954a68e95fbab95ec04497cb1959097ca76da72362c08d93c0fc52f8f` |
| `packages/gui-plugins/src/terminal/i18n/da.ts` | source/config | `f40bc6137b34a892fe3d8d54f3a58ec18f8b59a0a26258981760a4aef480ba48` |
| `packages/gui-plugins/src/terminal/i18n/de.ts` | source/config | `e27bce4db730fd5d8dd767524b787da88e09c81b08b8d1ae021d446e3398a0c2` |
| `packages/gui-plugins/src/terminal/i18n/dv.ts` | source/config | `657b79d0317a5bc2d8186a96d3e4504611fe64faaacbc8a816fb5f8d232d73aa` |
| `packages/gui-plugins/src/terminal/i18n/dz.ts` | source/config | `4488c0acc7b8af09f2c2f220bed0dc69e201cf658a3d1a1c4c00455f46f4927e` |
| `packages/gui-plugins/src/terminal/i18n/el.ts` | source/config | `5116c2de122851ea5983eb8c9014c4edfd1e50b50dd958735930e8d47271cd2f` |
| `packages/gui-plugins/src/terminal/i18n/en.ts` | source/config | `374c65fd7e3fda9aa8af17c5c12af3549fd83f615269b2a33f18f61f4be1923c` |
| `packages/gui-plugins/src/terminal/i18n/es.ts` | source/config | `57864755976c4c2624abf2fa314b211ae110f758a3dcd6199062bc6129e2cbfb` |
| `packages/gui-plugins/src/terminal/i18n/et.ts` | source/config | `6d5fb90f9847858c74b39aa7b2b30c7e2c147d743fff8242aa57087d0179049e` |
| `packages/gui-plugins/src/terminal/i18n/fa.ts` | source/config | `590733e9bceb9209d8d3cbfd827e6c4cb6191b19ffc96fe532b7d77b3f18198d` |
| `packages/gui-plugins/src/terminal/i18n/fi.ts` | source/config | `71079ace1dad495e5e40f71291d5613aa4c6119955fa64cdc034f58ddd05f759` |
| `packages/gui-plugins/src/terminal/i18n/fo.ts` | source/config | `5284df3a0334828ede23d542377e04007d602a439bee04d45b89b5eac59bddb6` |
| `packages/gui-plugins/src/terminal/i18n/fr.ts` | source/config | `6ad4b6da9c72b106f3d8dca86acf25a8a950fe80fd9a7ae1afa4b4c4052a1a94` |
| `packages/gui-plugins/src/terminal/i18n/he.ts` | source/config | `76ed8c91d4a7339381a5ec671fa620c8ffa26140110eab62868795cfdc7c1f2a` |
| `packages/gui-plugins/src/terminal/i18n/hi.ts` | source/config | `bdd3eaa1a7bfcf7d64d78a35e81c7575c7e9faa505e25dc26ac5b244cf79c6a8` |
| `packages/gui-plugins/src/terminal/i18n/hr.ts` | source/config | `b85ae27f09a4af02879d1b50ae7c4b2468c1589d560a0ad15ce61e75ee07ee19` |
| `packages/gui-plugins/src/terminal/i18n/hu.ts` | source/config | `2e6baf95c3a18e8800ac3647863db6be200c94545dc8182e5164d6c22702a20b` |
| `packages/gui-plugins/src/terminal/i18n/hy.ts` | source/config | `1b6458bde75162e5a329baa911354686dd8ea9d125ccadf30259bf9585e024b0` |
| `packages/gui-plugins/src/terminal/i18n/id.ts` | source/config | `806660c763e54c16474a04c1135d4f3fe1de7b7ee02c02df37d7001c3a14dd81` |
| `packages/gui-plugins/src/terminal/i18n/is.ts` | source/config | `06db20c33b658af6b24149f78b122611d5cf8bb468445299271d412d25337975` |
| `packages/gui-plugins/src/terminal/i18n/it.ts` | source/config | `b76af9575bc117d7b8241db7ba786114cff87ae80cec7d54dc827088510d1a02` |
| `packages/gui-plugins/src/terminal/i18n/ja.ts` | source/config | `dd9c9ada1fb45ce436dad4e31d15b2e444fa25ca7504a9e9a874f1932583ad3b` |
| `packages/gui-plugins/src/terminal/i18n/ka.ts` | source/config | `f83f838851b0462e350cd0beb270de9fdbff1a98687fe1bc9d253ac067b1cf77` |
| `packages/gui-plugins/src/terminal/i18n/km.ts` | source/config | `7c550218ce9f7df16636bedef09c672b4b2dc73ad873356ca1ab2280a957642d` |
| `packages/gui-plugins/src/terminal/i18n/ko.ts` | source/config | `e3e2657fecd4ae655c48063045e8d9fe2f9bccfa6de3a35c65d8af5ce362cd2e` |
| `packages/gui-plugins/src/terminal/i18n/lo.ts` | source/config | `313703cbc769b1f879fa4e313a08de29641f22c504122121bb88a3b48cbea843` |
| `packages/gui-plugins/src/terminal/i18n/lt.ts` | source/config | `6a186710a4383a0b0be1e3bde30eda27103bc3546c40abb0c5bc7a494e4d6bd0` |
| `packages/gui-plugins/src/terminal/i18n/lv.ts` | source/config | `a147f401a430ca66f5795a095b9280d3aa86b3270b33e3d3cacfa33853c0aa6a` |
| `packages/gui-plugins/src/terminal/i18n/mk.ts` | source/config | `d2fab4c8fb0e98d136fce53788a78e1de200ce3a767721fe4ce18334e692d84d` |
| `packages/gui-plugins/src/terminal/i18n/mn.ts` | source/config | `aaf9af9fd0940959abced46a1d33c831fb327878b4c9065085a8d6ae49cd9c57` |
| `packages/gui-plugins/src/terminal/i18n/ms.ts` | source/config | `b56c4226cdb07234e3bd464f94bd92d68a9aaa7d904e8e9bc84977f7e4c4fd91` |
| `packages/gui-plugins/src/terminal/i18n/my.ts` | source/config | `c1dde77d4f09cb3ee2e037a845fee1929a4a859ad96141681ba46fd9628ad7e6` |
| `packages/gui-plugins/src/terminal/i18n/ne.ts` | source/config | `71db3df35ccd80e7d58786429f2ec58f6f1cce8b67e73db24b7ddf4a19463f4b` |
| `packages/gui-plugins/src/terminal/i18n/nl.ts` | source/config | `6799a25a5a85e38dcd8f16cc8bf94e54b79a467dfe64b49230b59a537a6bb913` |
| `packages/gui-plugins/src/terminal/i18n/no.ts` | source/config | `e38a16585eb3232863dc655e33df8e0cc6301971cea96429060e5bd7b84b09cd` |
| `packages/gui-plugins/src/terminal/i18n/pa.ts` | source/config | `91a529bccd2aeea1299829d1b87528bc4e6c291afb60572a3cee8dce3b7579de` |
| `packages/gui-plugins/src/terminal/i18n/pl.ts` | source/config | `2edd09f986347c3b787e24474a2b6c77ddcd5b2200be8e0ce8019075d1d03646` |
| `packages/gui-plugins/src/terminal/i18n/ro.ts` | source/config | `b30d18588f4c4e2cc25543dc0490b087c55951afcf34e58a3cdba3a16ee32022` |
| `packages/gui-plugins/src/terminal/i18n/ru.ts` | source/config | `a0f7d8de530c24f719d4f2383703ffea7dfc121e9d3ca08ce9c64255ceb6c42e` |
| `packages/gui-plugins/src/terminal/i18n/si.ts` | source/config | `b47dcd7b57db77a837597fbf8df56824a00cd9f742de63e73dff148defc58334` |
| `packages/gui-plugins/src/terminal/i18n/sk.ts` | source/config | `9319bd9afc2bf28335319761cec3d3937f427fed8ea0973d5dcbce6b6d58c701` |
| `packages/gui-plugins/src/terminal/i18n/sl.ts` | source/config | `56c4e3ad0daf5d1f8e5d2f7449e89106a173f88bd3cea357c80ee6560008a7fc` |
| `packages/gui-plugins/src/terminal/i18n/sq.ts` | source/config | `4a7c1fade1b6ef515b5e467eab1e26b465bb86f49fae59914c9afc76c5c0a772` |
| `packages/gui-plugins/src/terminal/i18n/sr.ts` | source/config | `c3a132fd900fb4e8c5ecfee16c5b91aecc62e9482812c22d891e3411fce3c18f` |
| `packages/gui-plugins/src/terminal/i18n/sv.ts` | source/config | `66088ef3f28c37a6aa13c125d62705ec60d95f05c7cdfa8b4f4b717fa8f3c6a9` |
| `packages/gui-plugins/src/terminal/i18n/tg.ts` | source/config | `ddf1b3e0e650dd4eb756e601137bf3d225f5195d34598ffa9751f59999ee92ff` |
| `packages/gui-plugins/src/terminal/i18n/th.ts` | source/config | `e362ddd8ade7351d81d43ed64c260c78ef71103568bb21cf6c178f878fa5c78e` |
| `packages/gui-plugins/src/terminal/i18n/tk.ts` | source/config | `570710f28001b92ab597b45b8df89a0b91dbae7d695390e86cd75397bc2dedb6` |
| `packages/gui-plugins/src/terminal/i18n/tr.ts` | source/config | `e9d5f3dc4565ee906d82fb9c9f6d761d6c164677aab64a4b98285f6ced38593d` |
| `packages/gui-plugins/src/terminal/i18n/uk.ts` | source/config | `35e7f31982440bd4788c5b0633a34080e22cad547ac771c424fb5233cbfdc25c` |
| `packages/gui-plugins/src/terminal/i18n/ur.ts` | source/config | `ca046572c21cf50d502c11ce059bd4711ec603a282a6cd151d00f5afe8e25c77` |
| `packages/gui-plugins/src/terminal/i18n/uz.ts` | source/config | `ab4cb218f9c135cee3103f5ce481eac389a53ce22137289e18fcc35ec4c05acc` |
| `packages/gui-plugins/src/terminal/i18n/vi.ts` | source/config | `e89814b8a8b7bc3a016787479094a7a414eed39e8d3089afb8550fda3bdcd084` |
| `packages/gui-plugins/src/terminal/i18n/zh.ts` | source/config | `bebf1407bb486ae0d32e222e0318b9cfb57eabb63b1d5dccb26992e641e2c33c` |
| `packages/gui-plugins/src/terminal/i18n/zht.ts` | source/config | `718e940bf06ba111ee4d4c0480ac4ccbabcd7e3d29d8d4dc96dab209446aadd3` |
| `packages/gui-plugins/src/terminal/index.ts` | source/config | `9de2328dec165f808a75b56ba235a67e41da205ac449407f69293112ff2e7f27` |
| `packages/gui-plugins/src/terminal/label.tsx` | source/config | `94b3c9cea8cf025d9d23352f0e5aad518a45bd48879c21fd97caf76e53cbd03b` |
| `packages/gui-plugins/src/terminal/model.test.ts` | source/config | `aee72af55034f9ebd88f32819a1005d07998ee494bc0de8d5ff248da81851a9d` |
| `packages/gui-plugins/src/terminal/model.ts` | source/config | `8cd07d33f54453e1bc2a5fec68c61d4e09f964fff82d3aa8b9fb98d0aa66bc73` |
| `packages/gui-plugins/src/terminal/panel.tsx` | source/config | `456ff7b52bff3bea7c4148bd691fc3ff08bd56c6368ba7e18ca238090bef7b8a` |
| `packages/gui-plugins/src/terminal/props.ts` | source/config | `4ffd91c671bd918856e419904bdef4ceaae15f0ff4c1f75aba9ce27952044336` |
| `packages/gui-plugins/src/terminal/quote.tsx` | source/config | `df89c63bf56de414e0dbffdf99ac97b20f36d6b03c9d1c03936840bd7b1daa44` |
| `packages/gui-plugins/src/terminal/renderer.tsx` | source/config | `02d6a9d7d9e07d040dfeba619b50aff4b01aab4b68a0e93c222a95b3697e5c09` |
| `packages/gui-plugins/src/terminal/runtime-adapters.ts` | source/config | `8ec341c6b67a5138c9e2347da1e8241f8b092356dee33de9766a137fa2eee6c2` |
| `packages/gui-plugins/src/terminal/tab.tsx` | source/config | `b19a66163c268141d817ba8599b7fb275395fba0b5a4f28b325b45133614a9fa` |
| `packages/gui-plugins/src/terminal/terminal-key-event.test.ts` | source/config | `87861ebe0739970664ba0eee4b21a8679a545284fa29a2ad91ce2967c8ba5de7` |
| `packages/gui-plugins/src/terminal/terminal-key-event.ts` | source/config | `e2dadebadb86648c4d04da608dce3c32df9f96e8a0118e75c7fe17688844f781` |
| `packages/gui-plugins/src/terminal/terminal.fixture.tsx` | source/config | `02f11efc0265cc3d552a7292d09322c1e739681b2d0e5dac3552c27e727c70d0` |
| `packages/gui-plugins/src/terminal/terminal.tsx` | source/config | `a75c3543e9e6e1c711dc53d5f99e63fff548f77df5f7ce6b5466c2709e24f2ed` |
| `packages/gui-plugins/src/terminal/title.ts` | source/config | `050a355bdf62073535232a6777b09eb89bf3c08349c53e8340dad50d8e30c592` |
| `packages/gui-plugins/src/terminal/writer.test.ts` | source/config | `22b7a6cac75f0db910f351a76ad468a35d0c4a31978b562531394a63468bc3b7` |
| `packages/gui-plugins/src/terminal/writer.ts` | source/config | `cfd81c7e982719e7591ba141c22ffb0fe8d502d5968df5e3bd5da24efabd02ce` |
| `packages/gui-plugins/src/updater/action.ts` | source/config | `78da026d4506b0e6ce0eb09edccd564ba20300569451f07925e7bf197159bad2` |
| `packages/gui-plugins/src/updater/actions.tsx` | source/config | `59ca9545cc42619f8bcf7c16a8ae2d647c88a2bdf55d53c4ef887b9827a01ea8` |
| `packages/gui-plugins/src/updater/beta-dialog.stories.tsx` | source/config | `5b45013622c16da9289ae761a656fa6c9b4dec3568683589da0d3b191b8bdec1` |
| `packages/gui-plugins/src/updater/beta-dialog.tsx` | source/config | `b0a4c8d7c9ccc7e9f87e890ac5442901e30b07be779748eaeb62bbd675e4877a` |
| `packages/gui-plugins/src/updater/beta-notes.test.ts` | source/config | `764f38881e650feb0112058dc284ab50e4d1046c824e2bcc8ea9c2ea936fc6fb` |
| `packages/gui-plugins/src/updater/beta-notes.ts` | source/config | `d3a5576b762aa983824e799d86d5e2c2bcd8e32db26ab203e5cb3209f543def7` |
| `packages/gui-plugins/src/updater/beta-page.tsx` | source/config | `d55af5fe498170a214ebd219591006f482f89248b85862d5d0e83b162c330793` |
| `packages/gui-plugins/src/updater/i18n/am.ts` | source/config | `9f9ca38c38ebb89aa2b694973cb41a2efcde739912bfdf36473e9545776d7508` |
| `packages/gui-plugins/src/updater/i18n/ar.ts` | source/config | `17e989c75f0a62decfc3a42130b653b3cc37d9a37e8f60913c4569ca95405de6` |
| `packages/gui-plugins/src/updater/i18n/az.ts` | source/config | `1548932fc91b5aa4adf91dec3e5eb9593ca7dfc045544a39429c96ee9edc2ed1` |
| `packages/gui-plugins/src/updater/i18n/bg.ts` | source/config | `03d1ed2f40c00c9a82755ee9d382f1bc9898505f9ffcd673082db569291b8e77` |
| `packages/gui-plugins/src/updater/i18n/bn.ts` | source/config | `db0d5374d080a9a6abef6fbcfc3e3a8d79584cfe326188010bb45f57e5d11e37` |
| `packages/gui-plugins/src/updater/i18n/br.ts` | source/config | `bb643a4ae7de7becee34e064bc91aaff71750bfa0eb8e32c799da1aa31b3a74f` |
| `packages/gui-plugins/src/updater/i18n/bs.ts` | source/config | `5f0fa125d21ddd01b02312226ae817757eb5070783dca73d86e474de9a5b8208` |
| `packages/gui-plugins/src/updater/i18n/ca.ts` | source/config | `b2c2067bdf5e6d16d9b8f9f64c5992f232ee45d0fc4b660dea7e573a0f8ed6b5` |
| `packages/gui-plugins/src/updater/i18n/cs.ts` | source/config | `b9e3da58d9d0f8b5d69af1ff285875bbb13b7d131b73240528ed7da50ccd4f5b` |
| `packages/gui-plugins/src/updater/i18n/da.ts` | source/config | `7883a924e7fc5fc91eaefe5ee6209f595cbcaeba61620e80dcda40b8fdb9f293` |
| `packages/gui-plugins/src/updater/i18n/de.ts` | source/config | `4b11fc515eab04e51994fffe04e3cb6073d0e38a891fc1b1d0d2459cdfe5b479` |
| `packages/gui-plugins/src/updater/i18n/dv.ts` | source/config | `2cf88ef0c08d787d0f801c50c9544bff0ae6113bb62118dcb015fa5883764df3` |
| `packages/gui-plugins/src/updater/i18n/dz.ts` | source/config | `8c5cb6ee2878b563fbc84546c03a50c87acf1b18061ae87deb45283c77954f67` |
| `packages/gui-plugins/src/updater/i18n/el.ts` | source/config | `21a4ea553e726a9d1cd41b24e946a938ece0d1aa22eaad4d33b8c1226a5c3592` |
| `packages/gui-plugins/src/updater/i18n/en.ts` | source/config | `07bf49df8967ca4d113f3d3cd1e03745f1a86ace53ce281063d2280e84319b0f` |
| `packages/gui-plugins/src/updater/i18n/es.ts` | source/config | `dbc76292c0434710a8a9504965a9cbe64cb510197b79d3303192718b4c9b76a1` |
| `packages/gui-plugins/src/updater/i18n/et.ts` | source/config | `fc1e0fce2da011c8fe837e0bab23117416ee45d81f759f0eced894c0ccb5c935` |
| `packages/gui-plugins/src/updater/i18n/fa.ts` | source/config | `3010d52ceae4ab29557c51241a9fb7053fedfda4fe6736a78247254cd6922a53` |
| `packages/gui-plugins/src/updater/i18n/fi.ts` | source/config | `5ff3c775f6a6373280438686efa8bcd155474457cd4a9e6f4a54d776e7f3cae0` |
| `packages/gui-plugins/src/updater/i18n/fo.ts` | source/config | `c7910dff10d2190626bd6869b14782e618869a4ee37b3835acb56171324382eb` |
| `packages/gui-plugins/src/updater/i18n/fr.ts` | source/config | `3ed17944850b45ea9fbc15b6dd0f9de7208aa526a7a0dfab966d483ebe2b367d` |
| `packages/gui-plugins/src/updater/i18n/he.ts` | source/config | `f1e508f91407a2ac807569c0b3bcbac5e60f3e29573d897eba6ee1f70cea21fb` |
| `packages/gui-plugins/src/updater/i18n/hi.ts` | source/config | `f17bd37e6022b0577d2996f9b8818eb2d691f5e7c62e6ee0219f3f08e05135ed` |
| `packages/gui-plugins/src/updater/i18n/hr.ts` | source/config | `8df71fc69ee902ea8de4a21988cabbf51b44b72fe0c6b5c4d20ccec069e6b80c` |
| `packages/gui-plugins/src/updater/i18n/hu.ts` | source/config | `92f01fa16a8aa369b487d72f03abda2a5117fa8344634af58aa782aa0c462810` |
| `packages/gui-plugins/src/updater/i18n/hy.ts` | source/config | `c414ddcf03442f03207ff74e99e89a30ebb6acb47d4ffb1e3975eec14079b660` |
| `packages/gui-plugins/src/updater/i18n/id.ts` | source/config | `03a20e5c52505bbe02f30337514b58b526a5b73a1e48a4f13307c0d9034e6018` |
| `packages/gui-plugins/src/updater/i18n/is.ts` | source/config | `1b7a98459e0ef9c451ca32f49ecc93d7f9d4f929315d492735967e308c6c5087` |
| `packages/gui-plugins/src/updater/i18n/it.ts` | source/config | `b2637a1384af77c2174dbe3aba7d5f24789e2a54f29488f9d9dfe759a03f6582` |
| `packages/gui-plugins/src/updater/i18n/ja.ts` | source/config | `82c78fc7ed2c48d7aeb314dc0b7bb78f9ac5edc88499ecdfced7a19bd4ff0970` |
| `packages/gui-plugins/src/updater/i18n/ka.ts` | source/config | `c887457ee3d7a129c7be8963a7d5e24e1c4a269d49c60405bf2b102eb5344870` |
| `packages/gui-plugins/src/updater/i18n/km.ts` | source/config | `a0f8038178189a9ec683ffa88aa137efa784e31b11dc522bc72d3869adcacafe` |
| `packages/gui-plugins/src/updater/i18n/ko.ts` | source/config | `05f42c2f6ed647f934c518b8afe6b05105c2ababf6ef0e8d726c15a11c3aa693` |
| `packages/gui-plugins/src/updater/i18n/lo.ts` | source/config | `0e2cbe845e3234cdd18eb1f7453cbae0b183ced9cb95461f41734e32d5ecc8e6` |
| `packages/gui-plugins/src/updater/i18n/lt.ts` | source/config | `2f823072bd1cc0ca6dde5e5d78df675f11db9d4381e63284ab1de85d760acec9` |
| `packages/gui-plugins/src/updater/i18n/lv.ts` | source/config | `9ba258bdb6097bf4bf59aabdf98b7456cee6c613454c5d11a77168bfd51526b2` |
| `packages/gui-plugins/src/updater/i18n/mk.ts` | source/config | `8194fb34749b3cd0c524eda31ca18e2efc808ff78e4558d3baf7637dc82b2a8a` |
| `packages/gui-plugins/src/updater/i18n/mn.ts` | source/config | `52f344f6d6f59781ecb238380e97f49dd6acbbb739c71fd9d5e4edbb78227249` |
| `packages/gui-plugins/src/updater/i18n/ms.ts` | source/config | `8effc938a287e1a8f9a137b304636546a21c24e7b92fc1251d9756e9fec4903d` |
| `packages/gui-plugins/src/updater/i18n/my.ts` | source/config | `c99e1e7155b7a5357d1d9015ca437a29fd85ee0bb92de67b9a22939a94f79015` |
| `packages/gui-plugins/src/updater/i18n/ne.ts` | source/config | `f9fe791533f7923c53e68d99f956ea504d74dc34a34d2414632c5df4f75fa018` |
| `packages/gui-plugins/src/updater/i18n/nl.ts` | source/config | `feefcbe124ffd0940bbaba6619fe9716add1282c629eff1973664e3952ff005d` |
| `packages/gui-plugins/src/updater/i18n/no.ts` | source/config | `b180a723349a5e27f7e19a0347c3df668e47a371ad86ce43ef92c13afa27a0d1` |
| `packages/gui-plugins/src/updater/i18n/pa.ts` | source/config | `ed28335d3e833f009edc2c35457f09a09835d08d063f37c56ca2348c1b9e8af8` |
| `packages/gui-plugins/src/updater/i18n/pl.ts` | source/config | `c9c44856d50a05f2a773548331c1c9251d4f4fdc97326248878f8102188be8eb` |
| `packages/gui-plugins/src/updater/i18n/ro.ts` | source/config | `d6e6aef16b7be5a73b394f7e5d205d9fb8f13ff507d1abcc72e42f39b0763889` |
| `packages/gui-plugins/src/updater/i18n/ru.ts` | source/config | `4dad5a48c22164a1b7959185d21543c89bda2ae15118baf50fb27b87f3b7956f` |
| `packages/gui-plugins/src/updater/i18n/si.ts` | source/config | `c6ab61fad016f85398ec19b0377ae5218fbeebe3f8958929b2497d8d9d38c582` |
| `packages/gui-plugins/src/updater/i18n/sk.ts` | source/config | `2722636d1e60e8004d311955f9f934f6048a408a41889fc620814a4683ec7a7a` |
| `packages/gui-plugins/src/updater/i18n/sl.ts` | source/config | `92b4fec41caaabe1cd33c594f973a39cfe14012d091d92fc9ea7256130421d17` |
| `packages/gui-plugins/src/updater/i18n/sq.ts` | source/config | `b8b40dab73cd3f0ddb6475658cccb66d4273e4c773719ab53a22b7282b47c928` |
| `packages/gui-plugins/src/updater/i18n/sr.ts` | source/config | `aa3f8af71e51d5fdb32269179a52aa97fed5f706d9e436126dbde6eeccb9556f` |
| `packages/gui-plugins/src/updater/i18n/sv.ts` | source/config | `fe1dcb4e9b826517cd18f2eb473c9e6426c828e97bd96d99a7ddbfc0223df409` |
| `packages/gui-plugins/src/updater/i18n/tg.ts` | source/config | `f63a89095d7cafe9dc8a396ea814e90f25053c6d4ddb652682dae81280fdc6bd` |
| `packages/gui-plugins/src/updater/i18n/th.ts` | source/config | `aa715197d91a2c8e18deff2cf468901789a87110cdc9ca3db3e131e11dc8b112` |
| `packages/gui-plugins/src/updater/i18n/tk.ts` | source/config | `0d9778192b1b527a02344847d8e735bcf9e5e83872265d16af34795225b7a2f3` |
| `packages/gui-plugins/src/updater/i18n/tr.ts` | source/config | `5516b31b54234b4b181c8917af972e35908f7d1f21f43c6fdf69f700973b141a` |
| `packages/gui-plugins/src/updater/i18n/uk.ts` | source/config | `2bde8f56fc81ec902f0960dd02ea988cf2176b9630c90445bd70cd87342fc7b7` |
| `packages/gui-plugins/src/updater/i18n/ur.ts` | source/config | `337bf32a7541048f288367e468fc85facad6dbe4c847e80f24bc03b813f4d4dc` |
| `packages/gui-plugins/src/updater/i18n/uz.ts` | source/config | `22a642856e49b8edf3184046f0f9b93027e3df6ec1811dbee024c4439865c5a2` |
| `packages/gui-plugins/src/updater/i18n/vi.ts` | source/config | `1f255c5ec9887977d1c5e319bfaa2e8513ae6b433760d1defeed49858fc64c91` |
| `packages/gui-plugins/src/updater/i18n/zh.ts` | source/config | `37ab362da1d054c5755ba155f040ba9ababd161d1ff713e82d872453d613ebc1` |
| `packages/gui-plugins/src/updater/i18n/zht.ts` | source/config | `18116208ed2b426ea435f905423dd30fcce026e180bc23e90b5cf70f525646ac` |
| `packages/gui-plugins/src/updater/index.ts` | source/config | `1b85fc5929012b2fca1e5b6aca7063e9c712344dce989a428e09462836ddebc4` |
| `packages/gui-plugins/src/updater/log.ts` | source/config | `76a62d422a4514b5251fc9548fdb43a838afd521e6c2e01746633526c861e4f4` |
| `packages/gui-plugins/src/updater/machine.test.ts` | source/config | `384060e823a3c0a55a059d36fb9e25c36514c56cfb0a521d6e9b0c1601e1cd08` |
| `packages/gui-plugins/src/updater/machine.ts` | source/config | `211535d37d9bace762eb7a3676414626a6b8b0a182359faf81d478275502bce2` |
| `packages/gui-plugins/src/updater/main.ts` | source/config | `595ffaab7956ad8b33976d1af08af418ae71607fb8f6140c8e08f69eeb9e4d49` |
| `packages/gui-plugins/src/updater/platform.ts` | source/config | `d937cba934b686a252135ba7bc4864838346434545c337d99107fb88eac829b5` |
| `packages/gui-plugins/src/updater/renderer.tsx` | source/config | `018e291c9d942ab8b0f831dd0222ede036fd65e21868c47e9a0e51dfa9811a21` |
| `packages/gui-plugins/src/updater/section.tsx` | source/config | `0bd94f6c959815e427b021bbf37d1dcca7d18f7d97e8076acfbd9fe48b6a1b09` |
| `packages/gui-plugins/src/updater/whats-new.tsx` | source/config | `c19722c958c267de43eee2a6301637636970d9efa612942c942289c054cf481c` |
| `packages/gui-plugins/src/wsl/contract.ts` | source/config | `cd72c2494acc18a742965ec539bc50e6d78fda24a3d77f11ec331e871155653d` |
| `packages/gui-plugins/src/wsl/dialog.tsx` | source/config | `af49fbd950f35d460fc8bed554330ad223099d4c2203390edb526ef8c4a11598` |
| `packages/gui-plugins/src/wsl/i18n/am.ts` | source/config | `701aaccf19991ba6a02a440a3c783c61d124dd8f37846cde33412f8ac396f757` |
| `packages/gui-plugins/src/wsl/i18n/ar.ts` | source/config | `d408a9d261818c776de0403eae3d7f30af0fe05a76f09936b6b9dbfc260f9da1` |
| `packages/gui-plugins/src/wsl/i18n/az.ts` | source/config | `e2773cf4310ced3a767db857946ff383d18185b3b6692722eb871d4088c2a367` |
| `packages/gui-plugins/src/wsl/i18n/bg.ts` | source/config | `a92ba0c6155c3d44fdf72386d56d794255db8d250f796434f704c0d0e0ce1fd8` |
| `packages/gui-plugins/src/wsl/i18n/bn.ts` | source/config | `bab47799b59f0a7489e7accdc3a2c34012aed1a55a24865d6f845411a04837ea` |
| `packages/gui-plugins/src/wsl/i18n/br.ts` | source/config | `d25541b380ba443fadc7e46d38de439cd68d35191876cc2aa1a7fb4707601a49` |
| `packages/gui-plugins/src/wsl/i18n/bs.ts` | source/config | `eb9ab6e676611b8e9754dc564ee1af3d45232ec283d5e6abf2d70fc2a22e247a` |
| `packages/gui-plugins/src/wsl/i18n/ca.ts` | source/config | `48db75a5e48ee195c72e1f6ed5f3dd44532780ed52112e73be7b6165e4fc2a33` |
| `packages/gui-plugins/src/wsl/i18n/cs.ts` | source/config | `736aa353c83736d43b490072b2c14532aa4dae1998c55a96f3e38caeed7225ac` |
| `packages/gui-plugins/src/wsl/i18n/da.ts` | source/config | `e5e9a1025996e31c18049ca52f589c0b53114771518f8474e66958eea0fb08c2` |
| `packages/gui-plugins/src/wsl/i18n/de.ts` | source/config | `f7fde6ff802c88896857ee6d08b225308a4dd752c05f726ff893b565589d6832` |
| `packages/gui-plugins/src/wsl/i18n/dv.ts` | source/config | `d54ee1db9bd18e73f263c5ffbc4bcd46b482c5fe22a7d933615336667b7ccbb4` |
| `packages/gui-plugins/src/wsl/i18n/dz.ts` | source/config | `c394f4bcbe3393f4d38f770c99e3074a1948fe5aa3cdb1fa921e98c4587cdaae` |
| `packages/gui-plugins/src/wsl/i18n/el.ts` | source/config | `1c5947d76f31acd7d48dda7a438f05d2855f7ab37cd6dbd107a6b07632c3cb52` |
| `packages/gui-plugins/src/wsl/i18n/en.ts` | source/config | `3e10fa93ed63fb62b849ddd5ba2168ac6930e4416bfcbc3c754eec5eb1d67c1c` |
| `packages/gui-plugins/src/wsl/i18n/es.ts` | source/config | `39ebe61c71c07ca708da5acdd0e04f1734d1da27764b6e29e30667f011a3151b` |
| `packages/gui-plugins/src/wsl/i18n/et.ts` | source/config | `a3d6065ede0f9bbdf5fa202787329f8fa9faf56f10c24d8100df853e343ce105` |
| `packages/gui-plugins/src/wsl/i18n/fa.ts` | source/config | `b5de1618bbc40aa0825297433bcf586a68c506fc0f58614a39b49c031ea89512` |
| `packages/gui-plugins/src/wsl/i18n/fi.ts` | source/config | `ce23368b0a4a6fc45de7c60eabdb9cb4e1919fbfa7060e0a748fb91dfc5cdbba` |
| `packages/gui-plugins/src/wsl/i18n/fo.ts` | source/config | `ea7328520a31abd662e4cba0b05290d63a52a30aafb0c8cb9421b7400477f7e0` |
| `packages/gui-plugins/src/wsl/i18n/fr.ts` | source/config | `3ae927ac62a2cc24ee5b8992691d1d52b776b2c82dec408d49de9c6702281cd7` |
| `packages/gui-plugins/src/wsl/i18n/he.ts` | source/config | `2f1d7739e8d7ff0af3ca52df069b391739b327776b5c8b2cab2118cbefaeeb02` |
| `packages/gui-plugins/src/wsl/i18n/hi.ts` | source/config | `a4fb8307b5312eca37cb45a7c5f978a10fe21d690995e0123c08972a8677d08c` |
| `packages/gui-plugins/src/wsl/i18n/hr.ts` | source/config | `de3bd23c459a83b7d41ea152980b87679c8709c1fc186f41253c9465ff59b068` |
| `packages/gui-plugins/src/wsl/i18n/hu.ts` | source/config | `2571bf3757906f46153db3ee24fe0d76f3283a471099e504fb32e0db425c6336` |
| `packages/gui-plugins/src/wsl/i18n/hy.ts` | source/config | `5f8e86e1a8dfcc7516c0786f6918bf9db37ae9558a9e73abb9e2931040bc5a3e` |
| `packages/gui-plugins/src/wsl/i18n/id.ts` | source/config | `42ec10105f46b1c27a81cf2e73bc4f05ac8febde010012acd5ae6de33d76f932` |
| `packages/gui-plugins/src/wsl/i18n/is.ts` | source/config | `d605eef854c3b99ae291fd710d554049391874f853909bc437e7a2c0318c7314` |
| `packages/gui-plugins/src/wsl/i18n/it.ts` | source/config | `767ca15cfc2b4c893c835784ad834a93dad85559f32988040bb0a9ba8b37be38` |
| `packages/gui-plugins/src/wsl/i18n/ja.ts` | source/config | `7735cbd71e7b15fab3a6010b55f9667c2e5d0c3ae63f39399b8b3a6dad419904` |
| `packages/gui-plugins/src/wsl/i18n/ka.ts` | source/config | `120ee7ace866eee25f7777213bc8fe8949f7cbbbe2aa1ddf8e84ce53b78f90e8` |
| `packages/gui-plugins/src/wsl/i18n/km.ts` | source/config | `c2953822184eaa9c90736c0e3cd1e4de7cb7c335bf2c4fba407b4bb5725eb2c4` |
| `packages/gui-plugins/src/wsl/i18n/ko.ts` | source/config | `39ae307c4da1eb760697fa64ceaa5080db72b748bd59b0545ab56b5de5953cbb` |
| `packages/gui-plugins/src/wsl/i18n/lo.ts` | source/config | `664fc8f00890ead045026df2caf6e8caf107af4134f2f087f2ff23ce48a751b9` |
| `packages/gui-plugins/src/wsl/i18n/lt.ts` | source/config | `a80977bf7a32890591bea9fb2fe4fecd5915eaa82b5857f99892d8a03bbebae3` |
| `packages/gui-plugins/src/wsl/i18n/lv.ts` | source/config | `b35453322079a654953f70ef9b29d743e3a30570728ace014c8390a09174e1cb` |
| `packages/gui-plugins/src/wsl/i18n/mk.ts` | source/config | `a88579598f45207790285362b806273aaacc38dacb67b257bfcc0d533a3b31e4` |
| `packages/gui-plugins/src/wsl/i18n/mn.ts` | source/config | `17073717ee57111d606ca8da797f69c3c2d9122dcae9749269c055ed758b7bfb` |
| `packages/gui-plugins/src/wsl/i18n/ms.ts` | source/config | `991cfc00e953daba7918999af1d92d5d6db78828108847aad5edb4611fc5f984` |
| `packages/gui-plugins/src/wsl/i18n/my.ts` | source/config | `13a190d2bbfbd484f968252f27ee61ac55d0c823416f82e3733b780a9d45462b` |
| `packages/gui-plugins/src/wsl/i18n/ne.ts` | source/config | `79cff833f83ec9a59c9dae76afee525405d8c10910207717c7995a8b961859f4` |
| `packages/gui-plugins/src/wsl/i18n/nl.ts` | source/config | `12bc6d344e2f59e0bbc88b3838b5f15a7ee1ab40464fd3450aa2dbab03a33ecd` |
| `packages/gui-plugins/src/wsl/i18n/no.ts` | source/config | `6db7b52568f9ab838f61cd1e5d156a0433458b316ce80ee0f9f0d8017b08734a` |
| `packages/gui-plugins/src/wsl/i18n/pa.ts` | source/config | `7a0601794c12dd807df4db087bfcff59bb13d17eddf9090133ff64ee1f49bb6c` |
| `packages/gui-plugins/src/wsl/i18n/pl.ts` | source/config | `914028452bb634482488f2f28db938c4e6815109d1d53418ec12017270272396` |
| `packages/gui-plugins/src/wsl/i18n/ro.ts` | source/config | `8a80e1e7da92110a1b467099a8cc0137952532f1cd16def722ade75d2486a929` |
| `packages/gui-plugins/src/wsl/i18n/ru.ts` | source/config | `f5923a35b9582982c8993fc905713559b0c3c33b9d92971f3f2d48b1dd34e666` |
| `packages/gui-plugins/src/wsl/i18n/si.ts` | source/config | `cd3354ea40f6260ae0f2b624cb7ce9c21c1b97f5da3384d672e0c94a55f0a36d` |
| `packages/gui-plugins/src/wsl/i18n/sk.ts` | source/config | `5eb614dc921d2ad93174ffe36df15c6f0ac3c2c643d1edef15071535aadb4735` |
| `packages/gui-plugins/src/wsl/i18n/sl.ts` | source/config | `3f3b01e0812f80ff9412e32abb06fe095959152be156ef219899776f9ee300a3` |
| `packages/gui-plugins/src/wsl/i18n/sq.ts` | source/config | `cad95cb2359ce5ef3180cb4dcbd275d9f0ebef9c00a79c23fa4ded0b1113d1e4` |
| `packages/gui-plugins/src/wsl/i18n/sr.ts` | source/config | `58e5bf73559c4371c13bdff0ad42f550229edd50ceee606ccf32b9098361e383` |
| `packages/gui-plugins/src/wsl/i18n/sv.ts` | source/config | `1f7401897f757f141798253737776282d21d00501d25a13201892a93ae95532e` |
| `packages/gui-plugins/src/wsl/i18n/tg.ts` | source/config | `e8386087cbf6ca30d497ca6f1df26fa15a7992281b022f34c50f0b3f42f0e554` |
| `packages/gui-plugins/src/wsl/i18n/th.ts` | source/config | `5c864e814bcf158f4b1a7fbc7429305b39f19d9b703a31381f634e55332ee9ae` |
| `packages/gui-plugins/src/wsl/i18n/tk.ts` | source/config | `a8496087d68b6d9cc6ce608d67611d3026a62f8952bbf5562cad2fe84f3a94c0` |
| `packages/gui-plugins/src/wsl/i18n/tr.ts` | source/config | `47967dcbc4fbeec55932af9bca060da172b6dab6fda72e94bdfe303512e3448c` |
| `packages/gui-plugins/src/wsl/i18n/uk.ts` | source/config | `17a44f311f9a43292a71824de289ef012745a07525b70beeda41e634f1d3bb76` |
| `packages/gui-plugins/src/wsl/i18n/ur.ts` | source/config | `75f11f22c3e972988a07249de73161ac5699cfae372e802221ba3bb5e4c702fd` |
| `packages/gui-plugins/src/wsl/i18n/uz.ts` | source/config | `dca414fec545edfff7ce09ae01fba5b883ee0b4baaabf43558e2f915a0977f8e` |
| `packages/gui-plugins/src/wsl/i18n/vi.ts` | source/config | `7b9063c91150f2c331eaff0648ad2486758897f9c8486404699c238af81cee2a` |
| `packages/gui-plugins/src/wsl/i18n/zh.ts` | source/config | `e2c1dcb94f2b726c57b19e8013b44feb6e84737bc876961f5d6fa8bfc1a0073c` |
| `packages/gui-plugins/src/wsl/i18n/zht.ts` | source/config | `3b50ae470c76bc31afa654d11a75d593f7597c20244c753d31c28494f9f0c49c` |
| `packages/gui-plugins/src/wsl/index.ts` | source/config | `7c47c50f1df3beb405052788c4f2107cf7c895e484bf63e133f3f8496928b84d` |
| `packages/gui-plugins/src/wsl/local.ts` | source/config | `dba4fea3879c50ade640179ac2407b61aa4fbcc109690a189c5fccc785390494` |
| `packages/gui-plugins/src/wsl/main.ts` | source/config | `3a97fb9a206594fe0691e95ddfe329662b5366e14a8f1c539e87ce26ea84daa4` |
| `packages/gui-plugins/src/wsl/model.ts` | source/config | `5910e622735533fc80af6fe3703d9d283fd24a54e99ebbde528dcd6424121a50` |
| `packages/gui-plugins/src/wsl/probes.ts` | source/config | `cdd802f3dbe441ed42cdae6f4594fbcccfe6cc25fdc4cf3065b37f37a8658f83` |
| `packages/gui-plugins/src/wsl/remote-cli.ts` | source/config | `49629fe91b98955f6e51f80626b9f2caf7584ed9f600115a37a4aacbf03f835a` |
| `packages/gui-plugins/src/wsl/renderer.tsx` | source/config | `fb749ec580a75516d0cd7cbe3a6607c43bd356ae83df97425fcb884c2172d470` |
| `packages/gui-plugins/src/wsl/row.tsx` | source/config | `f7f19378c10fdb813c633a31600223455b9407d0d43536883a8c2ca0aca72ddc` |
| `packages/gui-plugins/src/wsl/runtime.test.ts` | source/config | `52c55f303b553abc4151a21232c3ee2f9d7a0969ca594c34a1f28f60114d6df2` |
| `packages/gui-plugins/src/wsl/runtime.ts` | source/config | `2199654faf770bc886b30347633d5c561ff68cb094fb6d891ee1d32b755a1ce5` |
| `packages/gui-plugins/src/wsl/servers.test.ts` | source/config | `d6951d19b913e7487b4fa9e40248d9062cab6254ec7ea154d7391ea0a269163c` |
| `packages/gui-plugins/src/wsl/servers.ts` | source/config | `e1d8b4f15b43dd51f3264c117dba7e17e80b20d35d07b6593b7eb755a0dddce4` |
| `packages/gui-plugins/src/wsl/sidecar.ts` | source/config | `3fd04f130a7999e35c4596343a239e6c4ef5372f90f21f933ad1cf2671815849` |
| `packages/gui-plugins/tsconfig.json` | source/config | `9ccf92e2b935aaa8829a3e4f0a6a56a9297d9ad1bf105b0f6204fb77b51f32d3` |
| `packages/patchmark/package.json` | source/config | `28eb40ba47e678a8599ba55c04dec635a22e3bd2e4a42bbd1bf96bf0d50c90be` |
| `packages/patchmark/scripts/fuzz-differential.ts` | source/config | `47f11c2d01969f423c90879b7835aff60ab5ccc1b440c36baa9baafc2f24e669` |
| `packages/patchmark/src/blocks.ts` | source/config | `dfc863be6d3cccd1e859d90386e49239f2a03b1e0f85df4dc571fdba3e04ef16` |
| `packages/patchmark/src/entities.ts` | source/config | `f2ad3540d8de38ecbb7775708ae818e5dfcfa29d29462054f7009177e871a0ec` |
| `packages/patchmark/src/heal.ts` | source/config | `88a9049deeaad85c72022637dd201adf7337eec3a77138bf2a9771ebe1210952` |
| `packages/patchmark/src/html.ts` | source/config | `f068e1616d5c276f916413aa7779c993819557e1eb8e9c9037c48e7fbfe87136` |
| `packages/patchmark/src/index.ts` | source/config | `6662f3a5615227aacc775ddaf0bc78880bfae5e52ac66348d8c0ba960da5cbac` |
| `packages/patchmark/src/inline.ts` | source/config | `69bec8f7436f32a2f3748889cc5d242093c61f2317982e1f772b494625e95291` |
| `packages/patchmark/src/stream.ts` | source/config | `69eae20fbfa0690e36ce4f47fd45f14423b15685dfede982b019361b53fa55c7` |
| `packages/patchmark/src/types.ts` | source/config | `eae5a1076fd6ff285e7d932564166df9b115e1f1df10b9e563c537fd4feb423c` |
| `packages/patchmark/test/commonmark-spec.test.ts` | test/fixture | `26be09100ad00e5c226c9c387f76b1d7f9644ddcc9af53b5b4408039c23dc3e5` |
| `packages/patchmark/test/external.d.ts` | test/fixture | `f7b27cc21638f5fd6facc584b41e706639e3012c569132d48768482969948f45` |
| `packages/patchmark/test/fuzz-differential.test.ts` | test/fixture | `c34869d7be46d2fcbfaa65ab54219fe6aeaa839f6daef84a91e7088512e50af0` |
| `packages/patchmark/test/fuzz-known.ts` | test/fixture | `694e8fee3ae31072a4eabcc2aa47bb5ab60502a8f26d47b54028ef2e2852cf60` |
| `packages/patchmark/test/fuzz.ts` | test/fixture | `05709e126d10bf56ec75009c3c9763b4d990f2063dd5e7f4def47ee43b56ef15` |
| `packages/patchmark/test/gfm-spec.json` | test/fixture | `bbb312fc4862512d4bc8ab96ace16bcdb1dcc60e73bacb2656a7dcafb5d8a3a1` |
| `packages/patchmark/test/patchmark.test.ts` | test/fixture | `c4e4e27b165c272ea9b13ff681fd4f58cc84e2f8586888104dcdba9a770b329a` |
| `packages/patchmark/test/slow-inputs.test.ts` | test/fixture | `7114fb731238b7407a89fcda5119a292b73feecda4ed62023994f182372fd87d` |
| `packages/patchmark/tsconfig.json` | source/config | `100186a5ae1e9c96f42f9ca7dc92b5899228f63e0c831ac6c17f1bdda6dde2d7` |
| `packages/plugin-browser/package.json` | source/config | `4e672cc0a23649c1e569433be9cdc4432b717103a995a19f333ecc1621c387d8` |
| `packages/plugin-browser/script/pack.ts` | source/config | `c19afa9fd85f771c1ed58ee53804806f81177c7e68ebd7695c91a825378afdee` |
| `packages/plugin-browser/src/connection.ts` | source/config | `64a954ac72397f7b28fc3c9f4ab3eea23193cce61d3ec7fe9cd97776a6a04dae` |
| `packages/plugin-browser/src/files.ts` | source/config | `849213169c9607a934d297e23912294555330c6503d4119068414048553c3252` |
| `packages/plugin-browser/src/index.ts` | source/config | `90d7b67664168dd61d2ffbb975c5d5efa62f04cdcf384c20f88fb3e9c81418db` |
| `packages/plugin-browser/src/proxy.ts` | source/config | `028320f82bff5bc6f57108e9a934f93af1f92f3254a1f9040bf09918d4dfa1c4` |
| `packages/plugin-browser/src/rpc.ts` | source/config | `b0d87c0230b150deb2d69726ac28eceff271c153b08548d8206e7f4f129ff7f9` |
| `packages/plugin-browser/src/skill.ts` | source/config | `2517c1272817398e96d026be214fea30555b88aaeef1c7cf1e8ebcc74bcaacdb` |
| `packages/plugin-browser/src/tools.ts` | source/config | `8578a29bb2964c8c3b3ba3e3af0a6e55b729fd80e9b635c783fe6f2b158675a0` |
| `packages/plugin-browser/src/tunnel.ts` | source/config | `affa7a7121df935e3923c4ca9dfe3acdff6e3a294bdb6589014104af3b18d014` |
| `packages/plugin-browser/test/rpc.test.ts` | test/fixture | `66d2ffcc5b2b16a9c8c362e1e0140ef0841c3134acdc717f1e1367b4a93dc71c` |
| `packages/plugin-browser/test/tools.test.ts` | test/fixture | `fef6436c385bd623fa297c6713ae4997d60ccea74e0a86be50dcd7393059e8e6` |
| `packages/plugin-browser/test/tunnel.test.ts` | test/fixture | `e760a26a6ed9ea4e92e216453cc514f8efcc417a2e7a2f99987150f56c567e3d` |
| `packages/plugin-browser/tsconfig.build.json` | source/config | `3c7da0fd953f7225b5af1d1fa84d45619a1733f9bb11f18db428619cc7d86b74` |
| `packages/plugin-browser/tsconfig.json` | source/config | `e542d9679ad88a974d189bed1cb9571a751ddc898f1d454c8090a8ba1aabeb41` |
| `packages/plugin-browser/tsconfig.test.json` | source/config | `5ca5ac63438ab09d044dcb46ea43c8f54f0d5514cf43c032cd0bfb7841dd369b` |
| `packages/plugin/package.json` | source/config | `7d8449d8272c33540c74f417a65c6786cb33156cc505d41fa1b6ad0440edea9d` |
| `packages/plugin/script/icon-name.ts` | source/config | `234cd3c843feb74d0a132a28f8f05884ae8cf7eb96678e1387fda88ec7f3d083` |
| `packages/plugin/script/pack.ts` | source/config | `ad971637078c91369e4496b2fb511c3480762f6449952f4e343010f57d834c89` |
| `packages/plugin/src/app.ts` | source/config | `cd7a08bd91a35f5107dbd6dbc1a32d267ee334b93be8d39d7e4bbf1f881d364c` |
| `packages/plugin/src/effect/agent.ts` | source/config | `14a3231dcd01586e43bf1c5da4d4988dee5baf43561ae3d4c899e245b4143ba7` |
| `packages/plugin/src/effect/aisdk.ts` | source/config | `389445ae829a390f90919193c26bb8f9fa0bfc4947405fcfcd47a67f14ace45e` |
| `packages/plugin/src/effect/artifact.ts` | source/config | `a02fa2264abc0da2d2217f688c5e7748af263a1c88c54baf719505acf36d48f6` |
| `packages/plugin/src/effect/command.ts` | source/config | `d6aadebdf56658ff9659dd94eda9556c79d49049d3658755a9d8fd2c79e47e39` |
| `packages/plugin/src/effect/event.ts` | source/config | `b0f30c507d6562c23854ecd0445aa62acc032410808ed39d9cfb9059b0a6c6ba` |
| `packages/plugin/src/effect/index.ts` | source/config | `ed88616f8f691e20f51b42b521fd8f3b104357786839e43280c7d4eed77a8d1b` |
| `packages/plugin/src/effect/integration.ts` | source/config | `607046e616c82fe06e660745230699ae01ccfa2df8e1410d7dcd3982bba85e91` |
| `packages/plugin/src/effect/mcp.ts` | source/config | `ae472a2cbb1199bd435877d3b9602cd23da7e58fcf198ed922b687ec96669206` |
| `packages/plugin/src/effect/model.ts` | source/config | `43f164b34002f2a213ed8e9b51b96171edb77183db956c3d2ee0041988ed6cac` |
| `packages/plugin/src/effect/permission.ts` | source/config | `6c43c2006919e2c6177b0012c726f9075cfef8bb3f78298b9164fcb28a6aa7d6` |
| `packages/plugin/src/effect/plugin.ts` | source/config | `9b73b1180b61c8c2130100c7712af50c35772f6d957ffee91a39388e5de9dd20` |
| `packages/plugin/src/effect/provider.ts` | source/config | `603b9a889e9d97d085ab2aba210e7448758d8dbb72858d8b085c38eaa47ce2de` |
| `packages/plugin/src/effect/reference.ts` | source/config | `ba5b21d649a561e0e2d4256f0e8855e41ac0f3f32c6384aa3ae9e5087a52ae13` |
| `packages/plugin/src/effect/registration.ts` | source/config | `9d1212ad9550409595a6fc9dbffcd7d23964e581feb9235056102d6279ef90e1` |
| `packages/plugin/src/effect/rpc.ts` | source/config | `d600084d61da8b2a3785f4eebdc44e7541f0ff8f8856701ab080b8ac41cc5c2e` |
| `packages/plugin/src/effect/session.ts` | source/config | `ed3b4651d0d7f5d4e57e125965ea68b6afdfb74a5b076124798bc1e92ec6897f` |
| `packages/plugin/src/effect/shell.ts` | source/config | `5ec221b71485d5a75876878c1af0ad25b42422e20ccd55240f324ebd86a8a494` |
| `packages/plugin/src/effect/skill.ts` | source/config | `1ad6c45e492d839223654a401f16db684b45c5062ba7d3572d59248278737ffc` |
| `packages/plugin/src/effect/storage.ts` | source/config | `28c1e4a2562f3fe045804459aa41f3697e36c30b8c982e8adb41cadfb536292c` |
| `packages/plugin/src/effect/tool.ts` | source/config | `43ce7e6dc605113f4d6a14fe96f094d95734f82a2379df4cb3826311eef4029b` |
| `packages/plugin/src/effect/vcs.ts` | source/config | `10c3d54a28b9ebfb615b761645d0194c761a26a22d7d2defd8d9799af61742e8` |
| `packages/plugin/src/effect/websearch.ts` | source/config | `a8f56745afcbc7e36e0a000c2387878c09aa15f8b4c21e2f001c892f48e7c915` |
| `packages/plugin/src/effect/worktree.ts` | source/config | `7131bd134cde25f12b1d5af77c1852af1f271e5353671a0db5b3a6dc143992ca` |
| `packages/plugin/src/gui/browser.ts` | source/config | `4955c903f2c47b53e5d75852e00d52d867eba4b38c9d36204d934556b14394a1` |
| `packages/plugin/src/gui/builtin.ts` | source/config | `403df324a4fae5545571b0d318a367f977b1c11345dcbf313642130b39cc38ff` |
| `packages/plugin/src/gui/context.ts` | source/config | `ef583644da4025a4cb76bfdd11c936c378f0b1662a6a5c3200ec418e9ce175d0` |
| `packages/plugin/src/gui/context.typecheck.ts` | source/config | `64f6682602b723c434a124951c76cd3169eff940434273c65171bd5e31d658b9` |
| `packages/plugin/src/gui/core.ts` | source/config | `02600a1a77b380812990fca0f867b9c3472265a5a33796ab1449c0e065452e81` |
| `packages/plugin/src/gui/declarations.ts` | source/config | `4c5db4bce7798af869e839eab3c2654e013ff9a3f4bf3dd7fd594ab90303d372` |
| `packages/plugin/src/gui/file.ts` | source/config | `407853ec52468dd6e35228bea38db5e0907b4ffef7322d0dbaa29c071bea523b` |
| `packages/plugin/src/gui/host-apis.ts` | source/config | `854017a29d0b276eb199706efd05dead1759d02a50233ae20d6acf71e67896d9` |
| `packages/plugin/src/gui/host.ts` | source/config | `7305b487de2913398876e5b02603c2a1e803373d6dab2afb4b5470cff442f095` |
| `packages/plugin/src/gui/icon-name.ts` | source/config | `f9c47c828fc50bf517eae2501d9ed5dab183f62411e94768dfaf37abd3d8579f` |
| `packages/plugin/src/gui/index.ts` | source/config | `fff0742945a414a07defa742e71e5308dbb3572e01a835568eaf0f8bac9a955e` |
| `packages/plugin/src/gui/internal.ts` | source/config | `97b370dc2b32c6f63996b5b579f37fa4dffb2ab3acffc5c4fd4ae44681de0af1` |
| `packages/plugin/src/gui/main.ts` | source/config | `f608bba1af06cb0c46cde12a8ad356fdd29ed4b40714696a8e3228f840d02892` |
| `packages/plugin/src/gui/modules.ts` | source/config | `345c599425bf26873b0c2f1e415728972cb1898048a34342cc395fa38855dbdf` |
| `packages/plugin/src/gui/plugin.ts` | source/config | `b986eac1e3f29c334fe670c7fae9d913ca827ba33286ad8f49581f354a1b88a4` |
| `packages/plugin/src/gui/plugin.typecheck.ts` | source/config | `67a39539aafcc0a1427eb4e4731f69845f0951402f049e693579c8730409241d` |
| `packages/plugin/src/gui/reactive.ts` | source/config | `87104e47546ffe28a3823b2616053baa7621de09bde7cd2a6d5bf7dd4ce8a97c` |
| `packages/plugin/src/gui/registries.ts` | source/config | `dfb693fd1ec3c507e3fa1ecc8e09506d6235532b6b880f77ec9c06494b4ac04a` |
| `packages/plugin/src/gui/registries.typecheck.ts` | source/config | `9f8dcaf9d491aef18143347c128d74c8974e635057d1257b7f67fd65823879eb` |
| `packages/plugin/src/gui/review.ts` | source/config | `af86c729382fc8c884f8ae13bf5c6d98e77d72bb24a776abe4ed33a580737862` |
| `packages/plugin/src/gui/scope.ts` | source/config | `833c581413955f39e4ecbe17c8e9154ca99ff9ca893ad3e9c40b3a610b1676c0` |
| `packages/plugin/src/gui/solid.ts` | source/config | `a32976e02efd6a8a96504c24c956adda977c42f052b9afa3fd43c7bfb05f57d4` |
| `packages/plugin/src/gui/updater.ts` | source/config | `d861bf400b9edf27a7eb91e01079c8bd75b575b5108609d2a436c09d27160594` |
| `packages/plugin/src/gui/vite.ts` | source/config | `7c6a8806ff9db3ec28e8892533cc13d584f9e622b2522804a9a28bda8cfa35c8` |
| `packages/plugin/src/host.ts` | source/config | `3b700a9a4682a46c45cd5c960aa900a9a60923e147cb0807ea64faf2855e58e3` |
| `packages/plugin/src/options.ts` | source/config | `37081cc71f4f895802d482d469ec50f3ace7bf34ac0cb7977ece2fd7b03afd03` |
| `packages/plugin/src/permission.ts` | source/config | `ff2f8955761a044c7e4e165f9030549bbb85bacfcd957aa76a62d900b16572ab` |
| `packages/plugin/src/promise/adapter.ts` | source/config | `8782189cca62133bfc3e79baf8831c48cdc14da86600748791082edc433b502c` |
| `packages/plugin/src/promise/agent.ts` | source/config | `d6e524972bf53d8591023c6bd7073e3440da07f7b21a13137ba585e98f7366ee` |
| `packages/plugin/src/promise/aisdk.ts` | source/config | `389445ae829a390f90919193c26bb8f9fa0bfc4947405fcfcd47a67f14ace45e` |
| `packages/plugin/src/promise/artifact.ts` | source/config | `77967ca60a7ab43be4f92debe667dcb293e221e75a4daef42b047a5721815254` |
| `packages/plugin/src/promise/command.ts` | source/config | `dbe7059ca68d54bb3ab8cc429985fa262df1273b3cd686ec17492071f2859701` |
| `packages/plugin/src/promise/event.ts` | source/config | `9c8277760867f8fbfbbf4e6f3d383346fbb3716464814839da0c4cf2d14e34d3` |
| `packages/plugin/src/promise/index.ts` | source/config | `a4eeda7113a34b9ebdcb8be2c07e425af93b291e56ecae661a343b6bb2b14de2` |
| `packages/plugin/src/promise/integration.ts` | source/config | `c4d9aef8010747d37c163da8fa622808a511796446d3eb5dfa30cc5c987b4f6a` |
| `packages/plugin/src/promise/mcp.ts` | source/config | `4c7c4e93a019a6a59af3f2b82d20b696faf2bd8aa587afe451a66729855b8a25` |
| `packages/plugin/src/promise/model.ts` | source/config | `d75acc13a03b3d11841b1a739002ea87897b04b12f888b34ac324554e180c844` |
| `packages/plugin/src/promise/permission.ts` | source/config | `b8bb322a889ad6a785224528c3d1d20c0647091eb746d90861422dc212e9c530` |
| `packages/plugin/src/promise/plugin.ts` | source/config | `d6672ba0d14282edeb321e25cb5b64853b53d5ef135fe8da4924e8fc404aee53` |
| `packages/plugin/src/promise/provider.ts` | source/config | `dba8c6fb71512e2b5e9671897805e3a746fac10cbe8276c05bc8b397d49632bd` |
| `packages/plugin/src/promise/reference.ts` | source/config | `2eb4df9a35d00667d935770d278f1c15207be30b5524b2db67d8681659657e36` |
| `packages/plugin/src/promise/registration.ts` | source/config | `b9c8fd1f1d4c3c21992611f355103c141f9a47818d76cf2e7a3ab589d1fec6e5` |
| `packages/plugin/src/promise/rpc.ts` | source/config | `62824784faa30097ad04bfd2948833f05bc70f1710d36763e0147798ddaa9147` |
| `packages/plugin/src/promise/session.ts` | source/config | `27ab53d98df02ae703cc6e2fff1a04c0b7fcc95f1935b053c695c4ea856a8269` |
| `packages/plugin/src/promise/shell.ts` | source/config | `5ec221b71485d5a75876878c1af0ad25b42422e20ccd55240f324ebd86a8a494` |
| `packages/plugin/src/promise/skill.ts` | source/config | `1b631943e39fc91bd2cef8fafdad2ac00153f79a1d6564ba45d96f689d4ad5c8` |
| `packages/plugin/src/promise/storage.ts` | source/config | `5446c235a28315309bf13e1e94b0c6ef803979a86009579a2624e5dd617b6891` |
| `packages/plugin/src/promise/tool.ts` | source/config | `1f8cff2b569d5f35513644c9c4de37dc1db0614f8edb12b43a9e568c5edc586c` |
| `packages/plugin/src/promise/vcs.ts` | source/config | `e34e02d757912f113fe97f8e2709cd84f1c81532e1421b321976c1e29a5931e4` |
| `packages/plugin/src/promise/websearch.ts` | source/config | `cc014ae78c28a2737c6e5c8ee0f84722100505efc67f7315efa7e1dbd6a845f6` |
| `packages/plugin/src/promise/worktree.ts` | source/config | `08627fb1c4422c6917d0f58b15aa77e20b4ffd92cd0bbaf3e4c78636c91171c5` |
| `packages/plugin/src/rpc.ts` | source/config | `f8adbc27991bd331beffb23611eef78a7201e26df63bbdbaab4fdb41cdc30213` |
| `packages/plugin/src/runtime-modules.ts` | source/config | `275b78199a08840c4c460c71729f4b9aed447145cdda9d567fa956ffe839e21b` |
| `packages/plugin/src/runtime.ts` | source/config | `3467c7b0ffa4520cb52b654a8d2a26f5daab5bb24a2821a2d15440437c75b51e` |
| `packages/plugin/src/source.bun.ts` | source/config | `17ee1950e749bc23109398af45d4f4ea99355c82a397ce8cd9445e8aca456cfb` |
| `packages/plugin/src/source.node.ts` | source/config | `c1c3f740ebb543f3879a25f01497f63f40d69190d11d08d7666ebda3e5a13aa8` |
| `packages/plugin/src/source.package.ts` | source/config | `2d09ae3f29bc45e7ef0bea11bb51eae9873926db7fc0b87e4b0f2e502e426705` |
| `packages/plugin/src/source.ts` | source/config | `523260f670bddbe432087d2ed4d3c0cfefc503e79f4ba841ecfd1e3377f51ca1` |
| `packages/plugin/src/storage.ts` | source/config | `ec37cabfe0ea99befabb7b1732bf5f79c1a6693821824b11b0d76e909f526821` |
| `packages/plugin/src/tui/context.ts` | source/config | `f6f4e41af8e72c33c8f272c5457785f3713310d47124980a636173a72799f703` |
| `packages/plugin/src/tui/index.ts` | source/config | `a2b0a55a9e99e29554bae0202a99f0c6967cf1f8842f82552275e7ca9072ee95` |
| `packages/plugin/src/tui/plugin.ts` | source/config | `58a31540b4403e810d6e14c252a3c32e7e2272feeca96b7e598fa87e6dbbfab7` |
| `packages/plugin/src/tui/solid.ts` | source/config | `25d8356d3f0c6a966f15cd8fa43b3e749527af7e8aa5037cdbbfbed2d4513e59` |
| `packages/plugin/src/worktree.ts` | source/config | `dcc8e9db21994bdf76b23dde3cdb93d68d65afc35868776cc4bd1bd13c58e660` |
| `packages/plugin/sst-env.d.ts` | source/config | `969c8a9762cdfe863f1a6a802e9f55b021486806909311013ec0357950790fbe` |
| `packages/plugin/test/gui-host.test.ts` | test/fixture | `603bc470d4548e693d1bab5c130728dd4f8a4e3f7fc955ec64e068b3d7712f2f` |
| `packages/plugin/test/gui-scope.test.ts` | test/fixture | `2d54936c94e7b37a69f2c432fc4767c1b36377f46235a5b2d4b64d3f84b93fcc` |
| `packages/plugin/test/gui-vite.test.ts` | test/fixture | `1b2423504826e8ab77b096ba0da2c4cfd5b0d312caba5a82de892702caf6387e` |
| `packages/plugin/test/host.test.ts` | test/fixture | `7c96b6b7a983b5355a9f712a6fc6b130a60cc308d5ba6960574017ae693f3ec7` |
| `packages/plugin/tsconfig.build.json` | source/config | `6059578b398b37511113bee6f11a720233d29f248593f93039b561b31a23d4e2` |
| `packages/plugin/tsconfig.json` | source/config | `e542d9679ad88a974d189bed1cb9571a751ddc898f1d454c8090a8ba1aabeb41` |
| `packages/protocol/openapi.json` | source/config | `cf48167ad44d8ea52f92e9e8d6ee4242c3f2747f0464c3f103de8e640bdb64e7` |
| `packages/protocol/package.json` | source/config | `6b2accd171bd3679cebc57b04499d742fe60ea3c648633fb455fd05fc3f3b39e` |
| `packages/protocol/script/build.ts` | source/config | `31725fcaf81ff923b7d3175c82fa1a8d46fa2a3342275fbc15b300f5247b05d6` |
| `packages/protocol/script/generate-openapi.ts` | source/config | `b33a13ae8f8b6b3d7beee37b360d951a6cfbc512285c8339d6eb8760bba65b29` |
| `packages/protocol/script/openapi-stabilize.ts` | source/config | `1dbf7e5a5fa7009dfa2cca02371aeb0143498c852fd02e317414e13120e18dfd` |
| `packages/protocol/script/pack.ts` | source/config | `c19afa9fd85f771c1ed58ee53804806f81177c7e68ebd7695c91a825378afdee` |
| `packages/protocol/src/api.ts` | source/config | `4a50e8d8d4b842514f8993e874d032e88d4e7cbb0caa3a51a7d05ab1b13436be` |
| `packages/protocol/src/client.ts` | source/config | `b81b2eabdd105550f090cd181a5edd94c2b08aca28d8f72f217dcf11114a2c39` |
| `packages/protocol/src/errors.ts` | source/config | `1a7db51b347cac0d903c200b5c3ee7d81b66c94e980bc511c609f71e8ce9ad1c` |
| `packages/protocol/src/groups/agent.ts` | source/config | `13f347237377dadf876ecfd85736fdeffe865933e8341b82f61ccbcd22322211` |
| `packages/protocol/src/groups/artifact.ts` | source/config | `4fa65fdae5b5527437ea06b11f81114905f91d25674c670bb57a6749a1325c2f` |
| `packages/protocol/src/groups/command.ts` | source/config | `ecf17501a630c357917d37285ba1840ebdb9b9e4308332e5653c4ccfb9086a4d` |
| `packages/protocol/src/groups/config.ts` | source/config | `33b4eb81be1cabdea16c374b1c1252eefc404127fa5d93de7049425982d17a3d` |
| `packages/protocol/src/groups/credential.ts` | source/config | `6e9a314a511fdb8187d98d2e3e316a436efcd9bc650c62c4b1ff1c65ee4156f9` |
| `packages/protocol/src/groups/debug.ts` | source/config | `5e965dc2d0864414845ef83289eda1e1a62debc81873986941111b766998becb` |
| `packages/protocol/src/groups/event.ts` | source/config | `c4e290476db26ee3731da953131a835c4a97aeaff52fc46991101cdda008f62a` |
| `packages/protocol/src/groups/experimental.ts` | source/config | `dfe499f04de70de1f8a3fa270dd0cd21b420c67534cd8bfe33011a62e80b5a63` |
| `packages/protocol/src/groups/form.ts` | source/config | `3a80bf3e115311b1456616a0bea414ebbaa130d948f247fc52ccfab83c6aee8d` |
| `packages/protocol/src/groups/fs.ts` | source/config | `75349f59cbccb8de9e3ceb8fc89aaacf31f62c5a1af5954f61f4a3d4711e928b` |
| `packages/protocol/src/groups/generate.ts` | source/config | `9b519f6437d5287c00e9b2c29352fc63a6768eb76eda567c4c1dffad1692ea74` |
| `packages/protocol/src/groups/integration.ts` | source/config | `dec5b10cb87f540b3b33b836ddda5a726ab6b0919f92ccfd7e815f0cb1726788` |
| `packages/protocol/src/groups/location.ts` | source/config | `49ca052279181f551273e354d576f3b131368a7f4c6e5ea989dad17167fc4e96` |
| `packages/protocol/src/groups/mcp.ts` | source/config | `ff9fab55ff47a599999b7791e5e5f2913a16b6dc9f047be2ecde01b2c7ecfd82` |
| `packages/protocol/src/groups/media.ts` | source/config | `d99306b4c0bbf3b0ffd96b794e9990748976feb387a31c00f514b756155ac518` |
| `packages/protocol/src/groups/message.ts` | source/config | `c7b63ab2dec8fae4f56afcf55c733c61326382922d75b96c086cba1548f0a283` |
| `packages/protocol/src/groups/migration.ts` | source/config | `49ea3adb6574eb3d7e8d0f97c4a4360fc77ba4c4aaf50865c8cca2d8ff5f7827` |
| `packages/protocol/src/groups/model.ts` | source/config | `c8c49ea89c07c5b8c62e264facbaf46b62401140125f80edd295fdc88dcf8b2b` |
| `packages/protocol/src/groups/permission.ts` | source/config | `d227f924868382f2adcf4aa9e5e6e6c16a29696ec0db7c04c485afcb275a4f02` |
| `packages/protocol/src/groups/persistent-pty.ts` | source/config | `c33754aba03961a61718d3d4b02aef4219e17e46dc1d38f6c4c1b36591512f77` |
| `packages/protocol/src/groups/plugin.ts` | source/config | `17c519a48ab1fe8ce9ddefe4e01c0fd0a81d32bef61f6f77ba01fb4e4deb5f8c` |
| `packages/protocol/src/groups/project.ts` | source/config | `34fe1e6ced19bcbd2c82e2fdff69616edb357f8ace141e8ff772b7d1477bbb35` |
| `packages/protocol/src/groups/provider.ts` | source/config | `b1f7cdbba11f435c2edf58cc7d87efd10631f2734310fddb7ef67fb1d32430e1` |
| `packages/protocol/src/groups/pty.ts` | source/config | `5ca24260bdb268664a5786a5dc9a4d2e19d4254d669929ea3b2c1ed55be67b79` |
| `packages/protocol/src/groups/reference.ts` | source/config | `b66e2dc975d85be58731a8dcdd7c09851d842be05efe1b535f59375266e2ecbe` |
| `packages/protocol/src/groups/rpc.ts` | source/config | `fe19bc70d98a3c1cd28aeac68408fb8f9a7df7df92f98e4909bd928422f76e2c` |
| `packages/protocol/src/groups/schedule.ts` | source/config | `5ba81ca665f7abf158265dcc7a470e973cf6ad5fac79b03e9161b05d3820fe23` |
| `packages/protocol/src/groups/server.ts` | source/config | `7d6cb067de6ef4d7224bb30498a4460e1962df316b026bea9817fea7b353d5f4` |
| `packages/protocol/src/groups/session.ts` | source/config | `e3095721b7cfe2c52598385c783e32a6446ad6e1044dc8baaff91667c81747d2` |
| `packages/protocol/src/groups/shell.ts` | source/config | `975728e2ad26a965bda0dbf3365ac7abb6861f0fbb2e531aa2c97378961c94b9` |
| `packages/protocol/src/groups/skill.ts` | source/config | `190df2dad803b49a82a952229ba3ca4939bd16cd66c5f773b99071fac5bb2895` |
| `packages/protocol/src/groups/usage.ts` | source/config | `9f66dbd6b9b2ff0c564570d781db139efd2cdeec82b7328e2ec194182020a283` |
| `packages/protocol/src/groups/vcs.ts` | source/config | `fc0b9e02a2c0f219d45fdacef3a1fe0521fa3b63b6d27c48bc322f21e7c84611` |
| `packages/protocol/src/groups/voice.ts` | source/config | `d59dacdb4f07515a936400e605fd5dbcb513685f43c5cca2e8644e4c009a0379` |
| `packages/protocol/src/groups/websearch.ts` | source/config | `1dfa58bfd177584710a8aea70d3bfdb55e43c1e1e622d38b643510eb54fe931e` |
| `packages/protocol/src/groups/worktree.ts` | source/config | `fd61e49bae7e03c1d5491c09c81d04c1879a537f5b2e5bdec2932bcc769c105a` |
| `packages/protocol/src/middleware/authorization.ts` | source/config | `be76f30ac49382b73f60f3c64d8c9ef4a51893242f6de56c1a944bcafb331208` |
| `packages/protocol/src/middleware/schema-error.ts` | source/config | `33e9c1c829911e6ff48d1e7dd8216ebde0f05716d3b15bc78984103044312844` |
| `packages/protocol/src/simulation.ts` | source/config | `4e1b75f7ff84d24b67fa31e924679db3cda27b29563ca2179c2990e63f37d0a2` |
| `packages/protocol/sst-env.d.ts` | source/config | `969c8a9762cdfe863f1a6a802e9f55b021486806909311013ec0357950790fbe` |
| `packages/protocol/test/event.test.ts` | test/fixture | `07102f26bb3fa7a17473a82a46c5948480598374f59f1de1071ec8899832b395` |
| `packages/protocol/test/experimental-identifiers.test.ts` | test/fixture | `61ac21a8e7b1a185d81ed97d2c189db53288aea3368dcd2aa91fc6edf32549b1` |
| `packages/protocol/test/openapi-patterns.test.ts` | test/fixture | `b264ad8910252e7c4f9e9da4c42eec26563dd8b1baa63ec0543d554b93704aab` |
| `packages/protocol/test/openapi-stabilize.test.ts` | test/fixture | `f30710355fb87ddc52511623534fc8fd9577890990a3d8cbe6353cfc919dd038` |
| `packages/protocol/test/session-cursor.test.ts` | test/fixture | `b1f6150c2ee9b46187359e0bf7f557e1b2bac649b51c3fa72d56b22b8d2b04fa` |
| `packages/protocol/tsconfig.build.json` | source/config | `4484bf7d033f6e63103d01fce7992339cb9edd91a280788e1f759a0fd9f3b684` |
| `packages/protocol/tsconfig.json` | source/config | `95b0097666b91ff689833184d1d4e4bf507909538fe70879a75f08ed5647bdf9` |
| `packages/schema/package.json` | contract | `4e95fa2930506f0d52411e2b5fc1e7dc663fd10dcc7594d7d36c34217779083b` |
| `packages/schema/script/build.ts` | contract | `31725fcaf81ff923b7d3175c82fa1a8d46fa2a3342275fbc15b300f5247b05d6` |
| `packages/schema/script/config-schema.ts` | contract | `6992d2b4c7ccf768e5ced52a40b376a7bad1186ac07f7c49c5f70c63cac7f43f` |
| `packages/schema/script/config-v1.json` | contract | `a05eae68c5abffa4fb774841e006f5a16fcf5d260b593c3543dded85a6117514` |
| `packages/schema/script/pack.ts` | contract | `c19afa9fd85f771c1ed58ee53804806f81177c7e68ebd7695c91a825378afdee` |
| `packages/schema/src/agent.ts` | contract | `d76817cbb9b02820d3bdf667b8de4fbf6eab12125b81096f1da08b142481f787` |
| `packages/schema/src/artifact.ts` | contract | `81c101c08cb17e06a71c09bf6bf796d35b3af63e469143fea4e15f09afa2fcae` |
| `packages/schema/src/command.ts` | contract | `b8068dd7f3edfa4de2999aae8f9b083c536a4e462191b346abf12731ddaf5621` |
| `packages/schema/src/config.ts` | contract | `86932d524051191699a6335da1744e8f536f424aeb0993552fa40cfabf01b724` |
| `packages/schema/src/config/agent.ts` | contract | `4349d635cd586a077ba3c7008ddfcfcc4db81862ecd19996eff8efa7461ecffe` |
| `packages/schema/src/config/command.ts` | contract | `42ba1d30989467ef446b65ead87775b35c223715d72161028991e4501936d98f` |
| `packages/schema/src/config/compaction.ts` | contract | `eb571fed527c13294438bbd9465a3c5cee49268948e00c249c1022350947bdc4` |
| `packages/schema/src/config/experimental.ts` | contract | `0a2ba740e16bada4cda54ed332329048f3cfcfdc5f2399be52b7b0d90716ef62` |
| `packages/schema/src/config/formatter.ts` | contract | `03cee11c6aeba842b767fe2c2999f844c743dce63c9424765ccbb6eae5565911` |
| `packages/schema/src/config/lsp.ts` | contract | `28a37adf55e0b814e43bd6148ca537586f531fff375e66a39107d3b9d589d26b` |
| `packages/schema/src/config/mcp.ts` | contract | `38701e2ef587c44f9b67468c7aa7e031c48d73f08dfa1653660c53a9c7bb922b` |
| `packages/schema/src/config/media.ts` | contract | `acf1b210247c05d05ff2b02fd932deac6cbf7f61c393a68bc859bf7057746e79` |
| `packages/schema/src/config/model.ts` | contract | `a44db610efc8d2d6f2035c81a9c99542b1891e6d97f25282dd0901c6b5066ad3` |
| `packages/schema/src/config/plugin.ts` | contract | `210b5d32da9637c065012efff35cf9ff93e1a94fcca37195bc035f3b0f4171ca` |
| `packages/schema/src/config/policy.ts` | contract | `ff2a56562d3b1752e51c6dda648039cdcc1e9dd7f99da088d713e0b1472ebea3` |
| `packages/schema/src/config/provider.ts` | contract | `a6d8ef5821c9bcd4a9315b74ca512a20588e2074d800e5da739c477296f9e6ff` |
| `packages/schema/src/config/reference.ts` | contract | `7f043e69f8050f9221c514b8c3258030a429e5868dcb88ff12a315e9ac1eac77` |
| `packages/schema/src/config/shell.ts` | contract | `2ca0fda7431cb2ff9eabe39cff32b40d19868c4f431f69979349ce186d1ae3d9` |
| `packages/schema/src/config/tool-output.ts` | contract | `5f66b9f5aa97365cc78010e0f9bfe4a4a97026ed8cb4e0818c958c8d5390f512` |
| `packages/schema/src/config/warming.ts` | contract | `0597612b47ee7db9f1063df21b17010b6ab38ffb15fd80a242c3cd5aa9f7bbf8` |
| `packages/schema/src/config/watcher.ts` | contract | `5f22cebc5e3c65060b5cf7de76d7911d273188ddbe7cd0d36304b80757784762` |
| `packages/schema/src/config/websearch.ts` | contract | `010b8f05424760c783b0898cbc2c11f87baa868367fb21c1ed11220a5e1f2a99` |
| `packages/schema/src/config/worktree.ts` | contract | `3c2417db928dffaa25032984f43cd35bab1801c370e1e5a7d3e0b8cfaa115046` |
| `packages/schema/src/connection.ts` | contract | `6e116d68175e584130e24601532cf8af32065619cf3b7547a46287b2a7c61cae` |
| `packages/schema/src/credential-legacy.ts` | contract | `889b4e089d4e628267a931f8d4ef1686d0171d2436113c461dbef73416fcb1c6` |
| `packages/schema/src/credential.ts` | contract | `c879367935a330a77a953d719d84088f5c036b1a6503f455d17171a6669965bb` |
| `packages/schema/src/durable-event-manifest.ts` | contract | `81e578ebb7b554f04533363ce4e7ed36258d55383ee9bf8b65a5fd680d5835c6` |
| `packages/schema/src/event-log.ts` | contract | `5b8208a03945c187c36823523f4f3b0c15824a6841089153a642c5094f05bf61` |
| `packages/schema/src/event-manifest.ts` | contract | `beeae1b81e7bd613d2ae29ccd19366c3cf8fc04583a03d943c273166710f4de9` |
| `packages/schema/src/event.ts` | contract | `ce3a118b1347eb3b0b4990e75e9ec41baf38a4882c3b0e1f465a9cd51b91a303` |
| `packages/schema/src/file-diff.ts` | contract | `5b1492ebd8c0c4dcca4d1f1e67d7ceefaf2d962caed2a0c0485e77a29e57ab27` |
| `packages/schema/src/filesystem-v1.ts` | contract | `0f42ec25e3254c0c3807610f7ef5f762de4ef1f92c0d232920b46aa1eaf7bc1b` |
| `packages/schema/src/filesystem.ts` | contract | `c0161f1482dbce581a94f58a075cd8669ae601116802aca1eb2f5f438fade975` |
| `packages/schema/src/form.ts` | contract | `3ab47acd9adab469ef3d76b7ba55801e439af6339b813bda1f45e3465d5c1708` |
| `packages/schema/src/generate.ts` | contract | `5e1e7bfaf3f1d11dfbebdbab85da609a6e99217f096bac5e5bc952bf9592b417` |
| `packages/schema/src/goal.ts` | contract | `94376627f4ef2339be0b55b39317f32e41b94c85695162864dbc4b523e39a13f` |
| `packages/schema/src/identifier.ts` | contract | `7876157f0b2c4792571d75dd8cc5236553748bc2d1f3a58d45e60b794a904bbe` |
| `packages/schema/src/index.ts` | contract | `1c167570e6cb6645c64fd359b65687572d692d5091a62d28e6d9613d0437c7f9` |
| `packages/schema/src/installation-event.ts` | contract | `216d75c21c62fd9ab0f3df63a73cd32f6a89d6282723cb7bc3d3b936d0f1fee3` |
| `packages/schema/src/instruction-entry.ts` | contract | `8e279797574653cbee055c71f76ff48a36bc0605d8e072b3ab5240775ab433ea` |
| `packages/schema/src/instruction.ts` | contract | `17365456043ae91d0abada3373af212d910316d2059fc85f36ebe60030964cd8` |
| `packages/schema/src/integration-id.ts` | contract | `d96ffc77e13d3af2264c48a716ede3dd5b605e34389b74043c99bde0f5f30209` |
| `packages/schema/src/integration.ts` | contract | `fa6ad29e30beee7c3ac24d2e863a3d79b375390ca35f84b09aacbb2452076c2b` |
| `packages/schema/src/legacy-event.ts` | contract | `517e6b36c73e1a78fe1eeb9b26b2f8adbb29a0e04f197fdaed42ce485639030b` |
| `packages/schema/src/llm.ts` | contract | `bf2bec4eaa22019af95abb5c4fad8f6ffcf6bfaa4114f8adce7063d798297bb1` |
| `packages/schema/src/location-event.ts` | contract | `efb369fc7f5cf2994a89419f65c14bcd1420e45abfc95bce07aa8b2128fcb599` |
| `packages/schema/src/location.ts` | contract | `c05cbbb0b943096dc0ebe139149632515356447e6a3d7de0bec993ca7f9ec91e` |
| `packages/schema/src/lsp-event.ts` | contract | `9c6976ec95a1bcae9cecc875359ae29aabb0bddac56f9046c4f9c96982e223f7` |
| `packages/schema/src/mcp-event.ts` | contract | `315607035b38a46caca494974cab6f9c0336a6496aeb8a7f5460d2beed7d6739` |
| `packages/schema/src/mcp.ts` | contract | `d7c57d5d9c982a80e8f731e8b60eba833bced89dd17c7edc5c4c2d0101d95680` |
| `packages/schema/src/model-compatibility.ts` | contract | `c496759ee0044c9caefb6c4a902e53dc0220644f85f6983c89ee621b986801b8` |
| `packages/schema/src/model.ts` | contract | `2c2c363bd994de2b2525dbe2ca5ecaf07c436c68f1b9de0b8b4a112dbb57f6f4` |
| `packages/schema/src/models-dev.ts` | contract | `1cd91e4e794b9febcc07995dba632692a2a346c6c94154f991716521bab27b46` |
| `packages/schema/src/money.ts` | contract | `115e2793098b112fe088f6cb25f3ad2f6c28a8847295377e2571402fc06bfeea` |
| `packages/schema/src/permission-saved.ts` | contract | `5221918be507e7251dabdab04f2d9c9b460f4f5a2cbf68bd85c5c39f0871c0a8` |
| `packages/schema/src/permission-v1.ts` | contract | `9b6994392a97a76eb9a4cacf821ebd6f489803c3b8111b90edd5854648fbcb53` |
| `packages/schema/src/permission.ts` | contract | `9317c00ab0d2210754c4c933c4f7f041af56ddac404eb9c5979844087f5f040d` |
| `packages/schema/src/persistent-pty.ts` | contract | `6698293743ee60c989c7ffd355fd6fb7da37bf199a26a24126b8d578642da92c` |
| `packages/schema/src/plugin.ts` | contract | `c90bfdb7e7ab37c0cc6c437a0a36437ad5cbdcce880dd40b2b814ee862a139b9` |
| `packages/schema/src/project-id.ts` | contract | `9941be4bd7a4162ca5a928312bbc37a41c0f5e81113b5ca0160c7307b6c27a32` |
| `packages/schema/src/project.ts` | contract | `c9b138a7b0a1ad3e6c5461d374ca288faa77804dedaae338e8a0b6e724c0f827` |
| `packages/schema/src/prompt-input.ts` | contract | `2f5eff14cd4d817844b00711129b06ede1cfd91d05d3d6165f370eb1b29cf668` |
| `packages/schema/src/prompt.ts` | contract | `51f40cb5655806de7a47320e7dab5d239a57654850ccb1556ae8c3f64199f0ee` |
| `packages/schema/src/provider.ts` | contract | `17c634820d21dc64c5fbf2ee2a01b307e1dd045cc028aa53c6026d6de46645ad` |
| `packages/schema/src/pty-ticket.ts` | contract | `aa3a7cd3d698e4aa54fe237fad6bf589f5268185ed23cea6bd93a43d3d6783ae` |
| `packages/schema/src/pty.ts` | contract | `cf64dba01d915d5145b38d1fbd11e9295b8a8639b495aa602c930b03033209eb` |
| `packages/schema/src/question.ts` | contract | `268b4ebd41da0af415e246dc08a17f0202f8f7964eccb6b34215da18decdc2bb` |
| `packages/schema/src/reference.ts` | contract | `6fcdb61fc44ed8cb540399f3f3cb698662aee06f70619a8db4fce92c5f9f1b8a` |
| `packages/schema/src/rpc.ts` | contract | `68cd230295d4eef804bc3776f3f13e740d939398c6bcc38e041e1c1757de445f` |
| `packages/schema/src/schedule.ts` | contract | `aab49c6df5fcad527a92267d9a4cdbf080ee34d6170003101664974093de7c99` |
| `packages/schema/src/schema.ts` | contract | `82d667b0f2cf487f4f6961089d2511ef12aeab1dd5030b0e6dc6665373e5cf7a` |
| `packages/schema/src/server-event.ts` | contract | `298aa7361ca9a5c3249a327c0d9b2792efd39d16541d0424851f9925877b6739` |
| `packages/schema/src/session-error.ts` | contract | `10a06a116354c63115c06cd60f6cd81d2261534efd4ec47d14fa86c69b2c3734` |
| `packages/schema/src/session-event.ts` | contract | `d49c609a9e5ebf9b31c46e2691512766b8de6e6a7ce4a86b1f3fe181de30408a` |
| `packages/schema/src/session-fork.ts` | contract | `d72377c8c1df85e7a6332703d62839871dc1a0c0345e7492bd239c812243d1e0` |
| `packages/schema/src/session-id.ts` | contract | `15f1cc10fec06119f7eda08a243510f2183a8beeafa5b5882940b2744fe16c04` |
| `packages/schema/src/session-inbox.ts` | contract | `07d63c48560c9eef61579180b0738cb45f4e273ec94b2c74c9a1d2bf0c7e2984` |
| `packages/schema/src/session-legacy.ts` | contract | `149468727f7fa765a91a6697d5c242fe4e4eba92d167a7d8dabbbb32dfe8746e` |
| `packages/schema/src/session-message.ts` | contract | `6291f6f3a7cebe210ba129669415eebc29e910a7df6eb73b3598f994be4a9523` |
| `packages/schema/src/session-metadata.ts` | contract | `b2a70a46799dc819d58a2ef6538209b1aee771ae47ec0a715674a6f75c6e334d` |
| `packages/schema/src/session-revert.ts` | contract | `b2caf8128f4ab7e6abacfe18e918a6aa4ce199b533fe82e22607fc34752d653a` |
| `packages/schema/src/session-stats.ts` | contract | `eb732f7f735a9b2fef06412c012fc61caa54d8a8c3c4b63106c3d11aea6c0891` |
| `packages/schema/src/session-status-event.ts` | contract | `c903a264af4860644953325b64d063242123eb6a82201251357f24f56669e272` |
| `packages/schema/src/session-transfer.ts` | contract | `7c2f1f605e58ff06361ad24f8b1f3e270b5a813075d7c91353f82d1c23e94dcd` |
| `packages/schema/src/session-v1.ts` | contract | `56f32208c72e4e578f5447a855ab0f7143d0e075375d9226d08e78939d88cb23` |
| `packages/schema/src/session.ts` | contract | `15a9a53fcd96b36366ccef35a110a0c33b20ff9b3e64f6b6701fd3c55ed2de46` |
| `packages/schema/src/shell.ts` | contract | `7a9dbba7a840f01da637a3d624df8f4087ecf4bd5624abca2418d02f1c0b4646` |
| `packages/schema/src/skill.ts` | contract | `05e646f2a86b925da3eeb7209851737e29f36eef2c13568ff78f361766f6290e` |
| `packages/schema/src/snapshot.ts` | contract | `0fb9575ef1f5e31a5e1f5f6e6968c069a5108be1e3216c38928f916c2a5bd49e` |
| `packages/schema/src/token-usage.ts` | contract | `e379a033fb8484545bc5d2a9a3a4799d8c4dde942a084ae0246790fff0ed2070` |
| `packages/schema/src/tool.ts` | contract | `8d7923d20832f0dc0149fb6fd6c7720b07b3ee9a9ffae3410b9ab99bbae60352` |
| `packages/schema/src/tui-event.ts` | contract | `e8c751c91a1cd5e316f213f326771a868b5ab5d9a3f7eeed29c148d1e55672d7` |
| `packages/schema/src/usage-limits.ts` | contract | `1a64369b4f51490a71fb088b397b4289000c409b296be82453da9a65f730c734` |
| `packages/schema/src/v1/filesystem.ts` | contract | `6375a4bbac541d5f82a8dbe06a036054bc32ec3ee3d5db96512dd23648eb6deb` |
| `packages/schema/src/v1/legacy-event.ts` | contract | `140032cd75a286e346ed7798f3db076a7e18806d5b62bbec21555add91a9971c` |
| `packages/schema/src/v1/permission.ts` | contract | `f85998a2e6795ae9ba87f39a01402a87c7616202b1b0a8499b5a90222232a915` |
| `packages/schema/src/v1/session.ts` | contract | `d141a4e047f058ac63c29775cdef2e4dd2d86d3e91a00d75c3656b58cb5c8a7d` |
| `packages/schema/src/vcs-event.ts` | contract | `c5245095180c753ada38da95ade82052756ab2882f983677dddc09e6e3142e00` |
| `packages/schema/src/vcs.ts` | contract | `65c7a201b7d50f2af2b42090dd5e20f6d69662638351841b3527498e34762df8` |
| `packages/schema/src/websearch.ts` | contract | `2f912c02fc85c890714094567acb7f3affc4dda3e692739675b1215ccb9a7a51` |
| `packages/schema/src/workspace-event.ts` | contract | `f9b293302652fee243b9eb58b3e7b96c2eee2de94a4d92ac9ef02a6df88609ce` |
| `packages/schema/src/workspace-id.ts` | contract | `057008d7490bfd58564ea74fb7439a74492d27a4249707621674b0775abd82bb` |
| `packages/schema/src/workspace.ts` | contract | `e502c6013c760d7da33691b9e914cf69350482477d1266b8ce47618675c3ba66` |
| `packages/schema/src/worktree-event.ts` | contract | `ef26b5829dae37d7d892e8651fefdf4ed725420536c92c36b3a9583e776fb183` |
| `packages/schema/src/worktree.ts` | contract | `a15ca33091511046b8bb1f4cf9d5991baa34a96f604c0c6d812d59f6c028236a` |
| `packages/schema/sst-env.d.ts` | contract | `969c8a9762cdfe863f1a6a802e9f55b021486806909311013ec0357950790fbe` |
| `packages/schema/test/agent.test.ts` | test/fixture | `ac5b3e5b163d188d8aea4ddf23366f5bacfda6efaf71dedb93ded57f235aba0e` |
| `packages/schema/test/compatibility.test.ts` | test/fixture | `cac363bea852adc95e94bfcc0dd9e171aaa8c21293b5ba5bbf7bd06278b4e81d` |
| `packages/schema/test/config.test.ts` | test/fixture | `ebd2dfbca7060e8160192dee02527525773faa46a99a433509f37fd7fdc6fb9b` |
| `packages/schema/test/contract-hygiene.test.ts` | test/fixture | `156827788f2ccc0b54de40e0c5889f2e131e7a11cca51cc60964b57212943d63` |
| `packages/schema/test/credential-legacy.test.ts` | test/fixture | `8be7a7eeb50797a247ad0ceaae08c6990f4b5ae0010429c634daf9b992aeca1a` |
| `packages/schema/test/event-manifest.test.ts` | test/fixture | `19f84529798d47c055e58a6b682da64f54c5258ff4b50374df1b4afdaae39d71` |
| `packages/schema/test/event.test.ts` | test/fixture | `670a0f0790feac5a31f0a411712ac5312fceed6dc82e28ec0bd54b371548c625` |
| `packages/schema/test/legacy-event.test.ts` | test/fixture | `60fcf53af597fc61850e27631d35c3cf21b60d71078dbd7a2bacbcc4b28b3822` |
| `packages/schema/test/mcp.test.ts` | test/fixture | `b4d2d7235827d0fd8c905099627579982f11149f84088280a543ea0249fd27df` |
| `packages/schema/test/model.test.ts` | test/fixture | `bce65f4f30f3bf85b19b1e43c0a954ce878d2799fcc6f929a425205fa1b50b0f` |
| `packages/schema/test/session-cursor.test.ts` | test/fixture | `2695b858232f6b4b09b4089bebe7be80b2f62edd6cab62d82e8c3ce74efb2c7e` |
| `packages/schema/test/session-error.test.ts` | test/fixture | `3247e0d34ceba516f4e50ce3fd100ae3701822da902764b52ebd155b8f787f89` |
| `packages/schema/test/session-legacy.test.ts` | test/fixture | `c23f7be1cac0a706c3c30581e050f6fdc446d18d160fe9551d8dadb61bcae003` |
| `packages/schema/test/session-terminal.test.ts` | test/fixture | `727cdcfab1e9326da7d3b43d63479fd9ac142201ccf2ed67cbbb831a6d42821f` |
| `packages/schema/test/token-usage.test.ts` | test/fixture | `a31e3680f328e6e606e3aa95d9fbde337ae1c1ec681edf1065d64e17eae1cdf2` |
| `packages/schema/test/v1-isolation.test.ts` | test/fixture | `5567c03f650d2fb0d28b0488def4f3d2ff4214babed6fd61f17586cc12f18fcd` |
| `packages/schema/test/vcs.test.ts` | test/fixture | `750bb196f4f03c4f1786368676e17dc3401a6f803c1a7da9bd971583a4c3b722` |
| `packages/schema/test/worktree.test.ts` | test/fixture | `564af14547e586d6e18d4bd94558f008cc006711bb6d8f933243197898212f53` |
| `packages/schema/tsconfig.build.json` | contract | `4484bf7d033f6e63103d01fce7992339cb9edd91a280788e1f759a0fd9f3b684` |
| `packages/schema/tsconfig.json` | contract | `95b0097666b91ff689833184d1d4e4bf507909538fe70879a75f08ed5647bdf9` |
| `packages/session-ui/component-tests/basic-tool.fixture.tsx` | source/config | `2414ebb1eba48150c3a123f36a8ccc771966e60b6599688d9c2abd5f4b263c9d` |
| `packages/session-ui/component-tests/basic-tool.spec.ts` | source/config | `f407ae4f1d1f9bec268cdacd93393fa98fe0db6d6fed047711573ead3114e437` |
| `packages/session-ui/component-tests/file-tool.spec.ts` | source/config | `59ac7a20d256597a044ec40eb361c8b1ed51fa8a91011f002642e7c692863b9f` |
| `packages/session-ui/component-tests/file-viewer.fixture.tsx` | source/config | `f447d8de9d182494902ec211171acecf8333011c94117474410872ec08620de5` |
| `packages/session-ui/component-tests/file-viewer.spec.ts` | source/config | `38b01d0f81ed171e4277d7e1ee7e08217390770cc654450137ba53ffb6b931fd` |
| `packages/session-ui/component-tests/file.spec.ts` | source/config | `610d95db5c187d6c597512c8e7e1791971f5aed5ad556ea48137b8421b2357a1` |
| `packages/session-ui/component-tests/line-comment-v2.spec.ts` | source/config | `929d9814412e07a2e2c816cc6bd9060eb1a6a48b05df86b3f40f368adbf1f14c` |
| `packages/session-ui/component-tests/markdown.fixture.tsx` | source/config | `2b49c712cbcaa3af81e8807bace28a1fb9d6c7efdb70e79ee4574708da5b3286` |
| `packages/session-ui/component-tests/markdown.spec.ts` | source/config | `36186d856bf307b38222bef4730ecc361aebe57b53502b4f974b5480a9018ff2` |
| `packages/session-ui/component-tests/patch-group.spec.ts` | source/config | `063267fc4b7bb1da1a3271fc0e765883583cc893bc1498a1be37003d61a52c08` |
| `packages/session-ui/component-tests/read-group.spec.ts` | source/config | `6e52ab78bcf9c8da6490ed00d529faec8c75f5a5eb89307fa24307c53214c0c4` |
| `packages/session-ui/component-tests/read-image.fixture.tsx` | source/config | `bad15c1442964e76cf17de36b3dbb5b14fc94133926e394e5472526092b9eeea` |
| `packages/session-ui/component-tests/read-image.spec.ts` | source/config | `064aa78f589c3479776e40522a08ebfab4f165d9a37663523fbc596f356e0a67` |
| `packages/session-ui/component-tests/session-compaction.spec.ts` | source/config | `680765356c3798da748467176cf24c9954e6b56ee77cd99eb4df8507beabe5fd` |
| `packages/session-ui/component-tests/session-lifecycle.spec.ts` | source/config | `fcd98b3b0b4908f9a4137e564e89d5cf2d9604ee4d291ca5e260d58818ea7044` |
| `packages/session-ui/component-tests/session-message-projection.spec.ts` | source/config | `f271c10bb922531cbe43f27efe7f0436475af40c0a85470b9508c61312dbf29a` |
| `packages/session-ui/component-tests/session-notice-projection.spec.ts` | source/config | `22384d47a6d06765bb4bee97bc9dfdd02cf41e3863176d94e253bd514eefdd2e` |
| `packages/session-ui/component-tests/session-review-comments.spec.ts` | source/config | `fc5379cea4d3adb5c6733ee30574a4a3308aa208cdf2050c46e36ffd17189336` |
| `packages/session-ui/component-tests/session-shell.spec.ts` | source/config | `b0b928be68730743b760009bcb4b257dd0ed2efc53a3d6da9832a36b1f1bf606` |
| `packages/session-ui/component-tests/session-timeline-mobile.spec.ts` | source/config | `52d0c448347c15c6769c50a1e17a6ce12764fb4b2a781102eb66ca90ae39559f` |
| `packages/session-ui/component-tests/session-timeline-notices.spec.ts` | source/config | `8f637a030da7b95f957df362f91f370d93efe14d9bbdf32da8478fb186a55dba` |
| `packages/session-ui/component-tests/session-timeline-reasoning.spec.ts` | source/config | `f5aeefffa803c6a7972684b0acef9ac7405e478cfc47dbd011a4af3cf0663a06` |
| `packages/session-ui/component-tests/session-timeline.spec.ts` | source/config | `9cf2aac99992e406569763a13b3b0c816b6fd86d4c429dbeef579f684f174896` |
| `packages/session-ui/component-tests/session-tool-projection.spec.ts` | source/config | `72275ef376272e4f7c7a6bc423237bf0502e7ef95710e97393bc76ec4edbeccb` |
| `packages/session-ui/component-tests/tool-disclosure.spec.ts` | source/config | `295baddece7e118237b6a55c9132ef5d8be2dab69ee158d96ab3c59fab256e22` |
| `packages/session-ui/component-tests/tool-group-sticky.spec.ts` | source/config | `511c4dcbbf69300134369208fa8ce073651bd4491e768cee79e9a71fb0f3448a` |
| `packages/session-ui/component-tests/tool-group.spec.ts` | source/config | `64d78e06dab1b202a56801a26f531a6f708431f6b5f596e439c468a1935bbe08` |
| `packages/session-ui/package.json` | source/config | `5c309899b3424adfc3dfcef520d3fe332024af8245945220f98176b3a42fea4f` |
| `packages/session-ui/performance/highlighting/build.ts` | source/config | `cf769c50c92c89499fe25b858b9c66aa458f967413a2a71d63086d10be366307` |
| `packages/session-ui/performance/highlighting/cache.correctness.ts` | source/config | `7ac15415a87ee4f3230dfa94d7419e5dbf0c67b69b38676abd9aac7074e9fa34` |
| `packages/session-ui/performance/highlighting/plain.correctness.ts` | source/config | `809c3b7966efea122b223b01496544fd6a6bd77eda8e7c0fe58fbdb18c466fdb` |
| `packages/session-ui/performance/highlighting/playwright.config.ts` | source/config | `d9e9c7b5527f54b96a03b373cf77ef44ce76c6ae12d04d58f28381871ac1a637` |
| `packages/session-ui/performance/highlighting/serve.ts` | source/config | `befeed9cf182de4d15b5e327fa40c67cbb8caa84799e741ad89f46b6d529720c` |
| `packages/session-ui/performance/highlighting/viewer.bench.ts` | source/config | `f4921319d97f57bc5cfc8ff6ab98b09298063b2f9ad1110c6ce9bb1ea3eafd12` |
| `packages/session-ui/performance/highlighting/viewer.tsx` | source/config | `6d9f5c3ec6dc057bab49ba4a117430ddc8701295d2ea2e6066c64ba71671c565` |
| `packages/session-ui/performance/markdown-lifetime/answer.ts` | source/config | `e1cdd461860bcd830cda63a189e8363ce636c54782b174cf965ccb3e3e81eeb8` |
| `packages/session-ui/performance/markdown-lifetime/fixture.tsx` | source/config | `5f74d87f65bb27f23f4b07ac55dfef86560628b61c35addcf9e64e49712d33bf` |
| `packages/session-ui/performance/markdown-lifetime/lifetime.bench.ts` | source/config | `a23ac62063333fb7db26e5b1987a8612f0e2c11d38378c479ed5c0b279eee9e0` |
| `packages/session-ui/performance/markdown-lifetime/playwright.config.ts` | source/config | `9d93dc4f49d887378df897b873095d6b5e264dc2192ccea9b27cbd0ae3c0d6d7` |
| `packages/session-ui/performance/markdown-lifetime/ui-styles.d.ts` | source/config | `0cbee0bf21597e4384b451ae36e235fdc8f9b705a7e9068f91d8f9563eda31d8` |
| `packages/session-ui/performance/markdown-lifetime/vite.config.ts` | source/config | `6fdf407f6ce93794e6a9d7e887dd04ccd7b0ca5671dcd07bbb0558eb69aff9fc` |
| `packages/session-ui/playwright.components.config.ts` | source/config | `b746d99ff232b229185c56bc7d2d1eba4f539fc1b2d0b943dcd52a74d07d8f1a` |
| `packages/session-ui/playwright.local.config.ts` | source/config | `66f350b0e4ac89ad88c9932549343ad9150dbb5e52eacc8d4ec3f5da4fe3182d` |
| `packages/session-ui/src/actions.ts` | source/config | `daad31642fbf7721930b6b35af014033cdb2bf8bf9a4c7550e9b82f761d3e66c` |
| `packages/session-ui/src/components/apply-patch-file.test.ts` | source/config | `db3f954d26739dbcb58e9b91a5caf12172cc556820c61df40b371bc9b0863679` |
| `packages/session-ui/src/components/apply-patch-file.ts` | source/config | `8fbae14e2dec3041a9f5292cb44736b0815ddf569edcec120b94a46367eb6ae2` |
| `packages/session-ui/src/components/basic-tool.tsx` | source/config | `ba03197579e3db3444544dbf05f2b491dfe6ec0088684786be383dde855ff0ac` |
| `packages/session-ui/src/components/dock-prompt.stories.tsx` | source/config | `0ac4932d12d2895baf13cfba8ba1b4ae40dda1f12379be4a8cf95f38574d4357` |
| `packages/session-ui/src/components/dock-prompt.tsx` | source/config | `c05e1d144044f5b6e6fd7e14793060844588e0453272f77e150e0e3c632015d5` |
| `packages/session-ui/src/components/file-media.tsx` | source/config | `e475820e719a955827a467b312378a984b0bf5d8a7411839db4ce77a97006815` |
| `packages/session-ui/src/components/file-search.tsx` | source/config | `c2411caadfac28f6738f2c470c27fe4df5de812de08ad2e6767ec94b04832f2d` |
| `packages/session-ui/src/components/file.tsx` | source/config | `5034d55ad0abb0b8f14346a63b9765402652c61717998c552e24a54e0b75b1a3` |
| `packages/session-ui/src/components/image-preview.tsx` | source/config | `876a1df115f78e7771ff263e183f6d192dac5b6f2c87c0ee8b974f1fbe08225f` |
| `packages/session-ui/src/components/line-comment-annotations.tsx` | source/config | `1dd1a2e90b367b210aa2cc5ac209ec9d7fe3099b7669c2d1f34aa0f4aeb6098b` |
| `packages/session-ui/src/components/line-comment-styles.ts` | source/config | `aa56afe4ad3e393ec38d15be2b07ab18643e9216564451838f71c8a6450dcf51` |
| `packages/session-ui/src/components/line-comment.stories.tsx` | source/config | `add044b79288217a402ed54f4a4aeffb1f8434d49217fe3acaa1482b24fe25d8` |
| `packages/session-ui/src/components/line-comment.tsx` | source/config | `992d73f05d8a6c92962cfca4b0da4d6bfdd9860f49acc8b4cc39a7127d474f37` |
| `packages/session-ui/src/components/link-segments.test.ts` | source/config | `a419f88363087e8c09745e715e9b11b01a0b881c5c35ff9dfd760bd75f71505a` |
| `packages/session-ui/src/components/link-segments.ts` | source/config | `ad4801b92854d3f91595827748238b7d31bf79a50672512385d281d8b116b12a` |
| `packages/session-ui/src/components/linked-text.tsx` | source/config | `0ab0e095392fb77ef2af5b14afc69bea6c4e9baa52dbefe4232cda0f5f34c2d8` |
| `packages/session-ui/src/components/markdown-cache.tsx` | source/config | `c5d7b821535594cc0ccabd331e7518af976f133b0342dd7a46a013378edcee65` |
| `packages/session-ui/src/components/markdown-clipboard.test.ts` | source/config | `0224e9ed2931e4351b23cbec592f1069f007e29d42559cd052c8b15cc249b9be` |
| `packages/session-ui/src/components/markdown-clipboard.ts` | source/config | `47c380cd16552e8004082cfd2d3f10c62f0d6cc08047ccc335197e4ad751f824` |
| `packages/session-ui/src/components/markdown-code-state.test.ts` | source/config | `73c38791a1e7f6647dc876fd860ce4495a78aac64c47c8a399820a4511b33d70` |
| `packages/session-ui/src/components/markdown-code-state.ts` | source/config | `cd0af5ef0f34bbf1e59ac7851f09d0063cdb75f79c3872ee7cd4be6254db6464` |
| `packages/session-ui/src/components/markdown-fragment-links.test.ts` | source/config | `7da2f19154993d056b1c44c6aa869f8f33c4825a41748e1b3171be4d212b16a4` |
| `packages/session-ui/src/components/markdown-fragment-links.ts` | source/config | `bcff3872216e88775e6733e85f309155c2f8105738f2e392459333a212cc7774` |
| `packages/session-ui/src/components/markdown-image.test.ts` | source/config | `f79dbfd2da2d92980690ea7ca5a4b76630aea393dd7897baa9de35215e52d44a` |
| `packages/session-ui/src/components/markdown-image.ts` | source/config | `cec8b82032a8a813bb034db4ba9d7cc230e8d5e8b7ba167cf44f8125f9688dc4` |
| `packages/session-ui/src/components/markdown-inline-code-kind.test.ts` | source/config | `20a62844a56778338a2390264bb59c1a1597c5a4b4683551f44ea7ad00c99ea3` |
| `packages/session-ui/src/components/markdown-inline-code-kind.ts` | source/config | `cb06442b792456f20597b3f0f48470f27cca5f94da637d98eeba956da2e8e3d2` |
| `packages/session-ui/src/components/markdown-mermaid.ts` | source/config | `b8462c11427148f0c7a411f64a3850eb4d327a164c489a09ff0371e5496602d3` |
| `packages/session-ui/src/components/markdown-projection.ts` | source/config | `5f9403f7800bf5f0dca6294c339afebebdf0273084bd9fae4930dfd8d2489b84` |
| `packages/session-ui/src/components/markdown-session-links.test.ts` | source/config | `8f18f7ca3a488adfb7f5811ce692f825e399771dabd39bb35825c53e19eeec4f` |
| `packages/session-ui/src/components/markdown-session-links.ts` | source/config | `4c5cf1126067e2f7360ed9337480f92dda8799b05745d0ea4cd949b4ce1a62fa` |
| `packages/session-ui/src/components/markdown-solid.test.tsx` | source/config | `bc5ef9643fb58bbaf4bb270c29711050b2bda927b11db8c521bc6b0be9d88338` |
| `packages/session-ui/src/components/markdown-solid.tsx` | source/config | `191648015b7a626163c7130dbdc5a288c2f155669e24b7aada684974103d2f65` |
| `packages/session-ui/src/components/markdown-stream.test.ts` | source/config | `5e804e9ca2e1c0453b012e1a8b458e8d3be141ba40c5e38cfed06726b8369b9d` |
| `packages/session-ui/src/components/markdown-stream.ts` | source/config | `c935bdc3b0b3a2e142a6fde94da2cf088c37597b08339a26df36d30c60f131d5` |
| `packages/session-ui/src/components/markdown-worker-protocol.test.ts` | source/config | `967565e004790d5eb0ed5604b9697ab4127f9c401259b6e1bc43a60926384bd6` |
| `packages/session-ui/src/components/markdown-worker-protocol.ts` | source/config | `f712b6dad8227d34fd2c630b3ab66c82d109f4b252ba2f85d65cf2a7a7b8226c` |
| `packages/session-ui/src/components/markdown-worker-queue.test.ts` | source/config | `df22690d76e50b0265308be42e9f0528ac06452ce97acb785e19134f6b23ff30` |
| `packages/session-ui/src/components/markdown-worker-queue.ts` | source/config | `33bffee91c79147bbb0cc30723feb67e75e0d925af9967cb571117c6f0aefd1c` |
| `packages/session-ui/src/components/markdown-worker-transport.test.ts` | source/config | `babd52a5202b5f011d5f4a00146d8d2c6fe7b1eb42ba3d814679965aa580d04b` |
| `packages/session-ui/src/components/markdown-worker-transport.ts` | source/config | `d4a6bc6a64d50d8a516daf736ad7583e7902bc31694857ea0e50052cab5a2b80` |
| `packages/session-ui/src/components/markdown-worker.ts` | source/config | `5020a7a93d2aede92bd6d5bc6940c960c511c72407d87bca618ef2ea8e68143c` |
| `packages/session-ui/src/components/markdown.stories.tsx` | source/config | `911820d6d301a7540310e3ae392133b8fab71b5ccf391db6e953e3a75aabd45f` |
| `packages/session-ui/src/components/markdown.tsx` | source/config | `81a281b30c4e743c7528badf4c8cb067184fb7b17f1b112524aa1404f06b5cb4` |
| `packages/session-ui/src/components/markdown.worker.ts` | source/config | `c9270c0f99445d7e57c6b3aedd847a4afc42432057b1e5aa161f1a08c1167a22` |
| `packages/session-ui/src/components/message-file.test.ts` | source/config | `b14e709af9dd4ecd28981785720b39c5dfdee07011c49c0138813186fc1f4847` |
| `packages/session-ui/src/components/message-file.ts` | source/config | `ec1191eba84eb38db444459f207a69f306706019b6f67360bf959248a817f7f6` |
| `packages/session-ui/src/components/message-nav.tsx` | source/config | `be15fee15b5b40efb1506469d0fd03de03e756e6dad1ef60df9fe1ea88341f33` |
| `packages/session-ui/src/components/message-part.tsx` | source/config | `1d5799f1163a43c1be13b243f799c2981fe63beea2a0d2575b05aea9580f740f` |
| `packages/session-ui/src/components/session-diff.test.ts` | source/config | `93388ae3e86300e517fafac8dc8f9e210d89d2d97f3ac932783a2e4a1ab36a8f` |
| `packages/session-ui/src/components/session-diff.ts` | source/config | `186875771d646c78737cb5372c0e517f5e31e4dbc054cc64e76e6d66ab1bf0ce` |
| `packages/session-ui/src/components/session-error.tsx` | source/config | `5fefd99f622a41bba12eb2ccaa01eec05e3463287efa1ce8e427c452258df1c3` |
| `packages/session-ui/src/components/session-retry.tsx` | source/config | `955c337b163e593cc0170d5f740c8972093ff45433c5ffd71b7da1422501f0cc` |
| `packages/session-ui/src/components/session-review.stories.tsx` | source/config | `caa89e086566c39918c1263df5497a471a19d3275d50cb016fefbe4fb07c0165` |
| `packages/session-ui/src/components/session-review.tsx` | source/config | `3b09fad087882e9be8a64cc2e134225f2d6ba7fbbbd5ce5b8724dd0b6e022ec2` |
| `packages/session-ui/src/components/timeline-separator.tsx` | source/config | `0d63b8b29b8c97cef5689e0969d7cb4781a014501b50900853a4bbd1144a6d7b` |
| `packages/session-ui/src/components/tool-count-label.tsx` | source/config | `878bde3eba90987e631c1024529c00ec7f505ab2bbbf1ac6ed261c9d2322b4eb` |
| `packages/session-ui/src/components/tool-count-summary.stories.tsx` | source/config | `e26613de56e42cedfd1d3b9a029dea4b9f0bb89b328d7fdadca38ce237062fb2` |
| `packages/session-ui/src/components/tool-count-summary.tsx` | source/config | `1f94d463bdf8384fd41b06515a542c9955bf711d58137918ec4537fc0bf0b99c` |
| `packages/session-ui/src/components/tool-error-card.stories.tsx` | source/config | `f8ab98c805634bce1590804ab33d7855678ac62117f20e814635460fdcdc4fb5` |
| `packages/session-ui/src/components/tool-error-card.tsx` | source/config | `7872ff1504e2e02b3cf37f58ca9f70fbe9e91767583668a9369fe329fd87bedc` |
| `packages/session-ui/src/components/tool-status-title.tsx` | source/config | `370148bf638a7aed2aef1021b55fb4490f8f4874769ffb9d413596fc5f3d1ad0` |
| `packages/session-ui/src/context/data.tsx` | source/config | `00384416456da5f400d26fc6282bf028560c944a05aaa8b52a2e643982a2b489` |
| `packages/session-ui/src/context/index.ts` | source/config | `adf81340fe44c7da972c78f130412e3a6961e51acc7ee6f4d5c587bd269a081a` |
| `packages/session-ui/src/context/markdown.tsx` | source/config | `0d56c25aa95d2fa8f676b4e3021d4ac0eda06a08bb2c15dbefe6c801d5fd0e4a` |
| `packages/session-ui/src/context/sources.tsx` | source/config | `22c37227f555a2635bf65cd88a39d0d4925e695ecd3d6eaa4f18fa2279de7791` |
| `packages/session-ui/src/document.ts` | source/config | `1df46959931138be9d298503a6f9a613e22bddaeed09c8147ded451c50a71e64` |
| `packages/session-ui/src/file-presentation.ts` | source/config | `bbc13a8cac88ae051abbe109165949115fe7c1686408dcbc6ef26f597ed276e6` |
| `packages/session-ui/src/import-boundaries.test.ts` | source/config | `3c150edb5bba8926da3d374340eacbe300793a707fed17bd3042b0fcb7e5a99b` |
| `packages/session-ui/src/message/agent-label.test.ts` | source/config | `42a01234e3ecef078590461f71cdc864edfcfbf184029947d14d6d4b8595d513` |
| `packages/session-ui/src/message/agent-label.ts` | source/config | `260ea80fbcb685e1e3ee6f85d4495b702f80ac31600c9703e4ed55d078841eb9` |
| `packages/session-ui/src/message/attachment-card.tsx` | source/config | `47ea3e2db4748fcbcd40bb451d8f08388efa0c1516e376cd793bc7dc5a109899` |
| `packages/session-ui/src/message/comment-card.tsx` | source/config | `d45d0680ec7bb2bcc6a60491a4df4ca6051b43170e737a8a836b27469be331e3` |
| `packages/session-ui/src/message/current-message.test.ts` | source/config | `6263466e4c316142382f32d799064226d876102842a142394ef85e738d92a4bf` |
| `packages/session-ui/src/message/current-message.tsx` | source/config | `c45dd0af91d6782e29f150d981989ab43192982f6633f1efd447dcf0f42efbb9` |
| `packages/session-ui/src/message/current-tool-state.test.ts` | source/config | `c9643ae88dcfa3887ad3ffaad9636f7e4b1ce29eec5fcf5539aadca53f405ec8` |
| `packages/session-ui/src/message/current-tool-state.ts` | source/config | `ddc6a5f6a01211519170251f2d6c4cf541411992e4294d13b44e120760c506b2` |
| `packages/session-ui/src/message/message-content.tsx` | source/config | `6636a85a05f389d8b6bddea7d3d861452c6d9d453b04028d12872df9d9eddb5c` |
| `packages/session-ui/src/message/prompt-message.stories.tsx` | source/config | `270c25f5b6c275e659164ebe97b8de75d307f52e0667588511552a6ab5175d23` |
| `packages/session-ui/src/message/relative-time.test.ts` | source/config | `eefe6e42b0aa147e15d9d513d89473b834b6c6e8ddec92280e1205939725aee1` |
| `packages/session-ui/src/message/relative-time.ts` | source/config | `db4046b8a58892ab86c099d4cec2f76426f381c5b993b53f13cf65a3170ff732` |
| `packages/session-ui/src/pierre/comment-hover.ts` | source/config | `199582de8e5af67451e1dcf3bdfe76d813efea16c8ba84d3366ca510519f84ec` |
| `packages/session-ui/src/pierre/commented-lines.ts` | source/config | `db359e98206a9c038937151acb20ff5b16a43c6009a91183c2f3ea27181a92e0` |
| `packages/session-ui/src/pierre/diff-selection.ts` | source/config | `39c002aa45329ea1a75c2f37abd1428cb41306fa0daf7f2f69c35bcb2b11e3ff` |
| `packages/session-ui/src/pierre/file-find.ts` | source/config | `1643f4c8c36c3466e025973205fd261697bbbdaaa1156c6c1765fa35092fe44b` |
| `packages/session-ui/src/pierre/file-runtime.ts` | source/config | `b8ae4b4a46e97df1addc6527c8d3bd09f91814ce00b018177bd2183b7e6e3671` |
| `packages/session-ui/src/pierre/file-selection.ts` | source/config | `ca336ada83485e40804e924ee21fefc64f4bf987bb2f23251a11cae07edc55c4` |
| `packages/session-ui/src/pierre/index.ts` | source/config | `71cc06369517936727298e141b90ce81f6128bceae88f7452f564cf66cb728a6` |
| `packages/session-ui/src/pierre/media.ts` | source/config | `766a4d7e2d9a8d1471b10856acc896db401ed4e7e0c8ce37bac4e5eca82b81bc` |
| `packages/session-ui/src/pierre/selection-bridge.ts` | source/config | `f46cfb10aa4cdd99f2c96ee3618ae2fe1f9c30d396c61ae281e46645342068b8` |
| `packages/session-ui/src/pierre/virtualizer.ts` | source/config | `492be49bb5d5a8229cc23506c93f0d56bd9bbb96e38e5216542e9c17e2304cc1` |
| `packages/session-ui/src/pierre/worker.ts` | source/config | `4f749a5655d5b83b759fd5fe1c70a07397d196bfbabbcd4a73487def95f9014d` |
| `packages/session-ui/src/sources/experiment.ts` | source/config | `3dfe2d92fae7dc8e4c7181f5cc26e5890d839c597794aced606e315afd224d6a` |
| `packages/session-ui/src/sources/site-icon.tsx` | source/config | `4c32da7edde23a7944d61e432d18a8ba6229cf480c25dab1f31c94549bb715bd` |
| `packages/session-ui/src/sources/sources-chip.tsx` | source/config | `7493cd84f63a84d663995ebc23ec9c9d52989203d3ed927e20dde5b26be721bb` |
| `packages/session-ui/src/sources/sources-panel.tsx` | source/config | `b6a4bb1ca25636049c8b8bb065532ed596ee71793a04f3f849183be8339fce30` |
| `packages/session-ui/src/sources/sources-title.tsx` | source/config | `4f67d23bcb41e83274bb23fd0be78665cb8ed337b44b2fb204cc386cb2d68028` |
| `packages/session-ui/src/sources/sources.test.ts` | source/config | `c603bec21cbadbe78db96c799eb84179844c73bd8907d0870292ddab902b1851` |
| `packages/session-ui/src/sources/sources.ts` | source/config | `4de5cf0d224dbbef3c59f7148a0eb2241e3a5dfc1f4cc3847a6facfc22d1ef84` |
| `packages/session-ui/src/storybook/current-session-fixtures.ts` | source/config | `e84f178c522b676c104a2435dac76a40290682bc244281c861cb59f8904e47a4` |
| `packages/session-ui/src/storybook/current-session-scenarios.ts` | source/config | `efd60d99966061b0a9166f5f95e979a6c3855d0e901675ea3ff88ab0618ce68b` |
| `packages/session-ui/src/storybook/current-session-story.tsx` | source/config | `bc0c41ae5093c38e658c33a97b1a765756c823dccbe2721f1c7b051a9dc86dbc` |
| `packages/session-ui/src/storybook/index.ts` | source/config | `aa22abe2e01d0904184995082eacb4ad224b5cd0fe6fec4235646fd9a8596dbb` |
| `packages/session-ui/src/timeline/commentary.stories.tsx` | source/config | `38f4d617bd3ba0db508add668330df5abaae6263b17a7b057ae555b2f530e97c` |
| `packages/session-ui/src/timeline/detail.ts` | source/config | `14328a5e31a4c1152a89134a60db1cb99b6eac72059878da0a7a5d89d803274d` |
| `packages/session-ui/src/timeline/error-card.stories.tsx` | source/config | `d13528269e610d6ba59ae1642b88cdc369a84dc6323aaf49f39e8e62bca074a1` |
| `packages/session-ui/src/timeline/error-spacing.stories.tsx` | source/config | `78ad405e20e0a15c52dce511c2ac38882e4564bdac794156c24f255a1087f6b3` |
| `packages/session-ui/src/timeline/file-changes.stories.tsx` | source/config | `5b0f7e176760530206e050cf7a0ac94554c853d65f1b438d5f09bbb087725c54` |
| `packages/session-ui/src/timeline/mermaid.stories.tsx` | source/config | `88208755c072f08a6351586850da0840a02cf7f09d5f6e0f5457ec79e251d1ec` |
| `packages/session-ui/src/timeline/projection.test.ts` | source/config | `213f758a033717bfe84543cd44a38f23dcc3532bf4166d7fc43f123b029d3dbe` |
| `packages/session-ui/src/timeline/projection.ts` | source/config | `2654f17e58b87bf826cda581b695ce460c875fa3e2deda26cf215d5770681413` |
| `packages/session-ui/src/timeline/research-and-agents.stories.tsx` | source/config | `1ecd084cbd73f72130d47a3358d0f802842e107661e93b4d3a2f070f56105611` |
| `packages/session-ui/src/timeline/rows-current.test.ts` | source/config | `bd55f65afa99498a4bda2f7dab14ee0395d2b2f7bf521b07335cb4349e7bb923` |
| `packages/session-ui/src/timeline/session-timeline-row.tsx` | source/config | `404a176c7da31b359deb8307349bf2d9c8aa725c9ffe6906d78133cf1acb6bb7` |
| `packages/session-ui/src/timeline/session-timeline.tsx` | source/config | `555142fe49abc46f4a19ae7d17c1a6bf6557ca5b52bf5f30581ea04092dc7162` |
| `packages/session-ui/src/timeline/terminal-work.stories.tsx` | source/config | `f354bec2e9750dcb4b3d908905ab569fcd0a9bcec35c810eabccd3e8da452ebe` |
| `packages/session-ui/src/timeline/timeline-row.stories.tsx` | source/config | `a05f43b13f28e2e3c3af637efbf3c3a3e87edb9689d6901522df525a3d9ff065` |
| `packages/session-ui/src/timeline/timeline-row.ts` | source/config | `c704aab1a44325324d00ea8703f2f10085072442605b2a71b6bc6766f7027fea` |
| `packages/session-ui/src/timeline/user-message-fold.stories.tsx` | source/config | `4c6a70b8febed687ee988342b2cc8f7178ac6e2abdcd79339f6f1bb54d422a2f` |
| `packages/session-ui/src/timeline/user-runs.test.ts` | source/config | `b4b18783a686ff2eb63aee92c096324804bcab3fbb201c426910b2d270309c9c` |
| `packages/session-ui/src/timeline/user-runs.ts` | source/config | `72a4757cf1687b73b67b9e8c6eb95becbd1d61d4e456a219bac6633973deb539` |
| `packages/session-ui/src/tools/ansi.test.ts` | source/config | `ab42bf4bf95324b938e62608b0b173a0540ecfb8dad31320e05bc33e6ca713eb` |
| `packages/session-ui/src/tools/ansi.ts` | source/config | `c5f1203e161d482f0f58c35c4c8700b0e06c766f4ebc46fcc1ea8a41f50dcf28` |
| `packages/session-ui/src/tools/read-group.stories.tsx` | source/config | `0ba918f53c59a3b4bcbb7747cc42ce4c2b1e79e2768d831ceb440f0cf2be5eb0` |
| `packages/session-ui/src/tools/shell-output.test.ts` | source/config | `a3d9754fc469ed3e0d0ff0c68a8e6fedb2e21a5dbd7946cb0f9a892623824084` |
| `packages/session-ui/src/tools/shell-output.ts` | source/config | `31581817c104a2211e7f19c3efe88b15310fe920425758d936070d0274b0667d` |
| `packages/session-ui/src/tools/subagent-row-variants.stories.tsx` | source/config | `0bcb3cfb567d040d7740eb7b7b8f8ac59b28b6414f40c7e39455edecd700ea90` |
| `packages/session-ui/src/tools/tool-group.stories.tsx` | source/config | `b15213c4ca77e8c05cbef54de8dfc00e19116937f1241e0aaaa6a211d1788212` |
| `packages/session-ui/src/tools/tool-renderer.tsx` | source/config | `0dbf54a5bcc344e79dfd8256459204f91b526296d8a0e1f7a16fe19e03dc3d09` |
| `packages/session-ui/src/v2/components/line-comment-annotations-v2.tsx` | source/config | `47e60c51659eaf0735215fbf0a697bb8b64c6f53c21bd025bfd74bb812269dce` |
| `packages/session-ui/src/v2/components/session-file-panel-v2.tsx` | source/config | `de6096bb83dcf1e26b7f9db52d16d70fc6e8020ac089635baaaae672b81e784e` |
| `packages/session-ui/src/v2/components/session-progress-indicator-v2.stories.tsx` | source/config | `5862d8433057cf03eb6d8c47edc42a986d0d8689599bbac0222e807d584ef201` |
| `packages/session-ui/src/v2/components/session-progress-indicator-v2.tsx` | source/config | `4d85090ab5910de491a98b9f5d2300bd74cb38159c05fc46590d99bb1c867e7f` |
| `packages/session-ui/src/v2/components/session-review-empty-changes-v2.tsx` | source/config | `9814eebfd68986b7a1ed4d294c668e6baf6701c960571767ecf04ee1f9e94fe5` |
| `packages/session-ui/src/v2/components/session-review-empty-no-git-v2.tsx` | source/config | `36265377ce5fef3ed3d8cdf86ffbb16315baf0a146450a66ed33fbad2f58522e` |
| `packages/session-ui/src/v2/components/session-review-file-preview-v2-virtualize.test.ts` | source/config | `85bd2f310daccf274f5691d42862f87047d0bc87a4879636484c58ad241477cf` |
| `packages/session-ui/src/v2/components/session-review-file-preview-v2-virtualize.ts` | source/config | `2c9fa737bb9abaf230a0d21302e3301c992275dab23025db1c3db5013a8ca5da` |
| `packages/session-ui/src/v2/components/session-review-file-preview-v2.tsx` | source/config | `0704d3f60973927fa467d0f42d4f447357d5f3c7355c074f2771cb877680bda0` |
| `packages/session-ui/src/v2/components/session-review-v2.tsx` | source/config | `d33b8878f109cdd53e82749f1968e5a23bee344f1a6c86fa8610157f2f3b7702` |
| `packages/session-ui/sst-env.d.ts` | source/config | `969c8a9762cdfe863f1a6a802e9f55b021486806909311013ec0357950790fbe` |
| `packages/session-ui/tsconfig.json` | source/config | `6f6b0214314c2be85607345b23ee4e4b3436d5605c5ed4f71164a05e104c1e2a` |
| `packages/theme/package.json` | source/config | `be26ff9e42e994087143d828ed64c581af8d80c18a5ca72a2a2237626115eb47` |
| `packages/theme/script/build.ts` | source/config | `31725fcaf81ff923b7d3175c82fa1a8d46fa2a3342275fbc15b300f5247b05d6` |
| `packages/theme/script/pack.ts` | source/config | `c19afa9fd85f771c1ed58ee53804806f81177c7e68ebd7695c91a825378afdee` |
| `packages/theme/src/tui/color.ts` | source/config | `a495d917af3ba7a841f92074e62a1e21be39b6b763998c1f227e14346f416ae9` |
| `packages/theme/src/tui/expand.ts` | source/config | `e630edf57f020501e4f73947a6863d2bd52ef6edf8f762b2cc1259d176b2a2a4` |
| `packages/theme/src/tui/index.ts` | source/config | `71a5ff41f93ebf07e54abff81402e71a00ebc39b58f9d2bbf3b850e677156817` |
| `packages/theme/src/tui/resolve.ts` | source/config | `97ead3e035a5fdf48b944cc4ed1b37763f2956509289640274797a71e8b9d23a` |
| `packages/theme/src/tui/schema.ts` | source/config | `41c0bc5dd7f3a5c1db3e7f287582c89353c9e180bb166fb4cc3ed56da9e5c8d6` |
| `packages/theme/src/tui/select.ts` | source/config | `c4773927c8f2a2f11e244d0d8ede7c3d89aa632f684ffa8beb8003b5aac1f84f` |
| `packages/theme/src/tui/syntax.ts` | source/config | `4d5414ca141548f4e80e924fe4dc8a8f640f8151e897c22d11359fdc0e47d1e6` |
| `packages/theme/src/tui/types.ts` | source/config | `10965284f02397ed39b9a728ff366f4cc68fc4f17b825b2983810faa372d9449` |
| `packages/theme/src/tui/v1-migrate-new-designs.ts` | source/config | `f5f7f281207bd20fab369467f11547fd99765c838d5f104da107ae4b33a9ed7c` |
| `packages/theme/src/tui/v1-migrate.ts` | source/config | `945be046ed670fcef35ca6b96a94d2d23e98ba258607f17625693094b63a78ec` |
| `packages/theme/src/tui/v1.ts` | source/config | `98e84a4d0790283df98270a254f648325250a9a4748660da25228822ff6f05bb` |
| `packages/theme/sst-env.d.ts` | source/config | `b29cd08bcfcfc5263d87f7c39421d6916f5d2ff613695c8fc03f9aa514985a98` |
| `packages/theme/test/theme.test.ts` | test/fixture | `ef42f4abbc0dace7495208fce75ccec1ccda94778f941576f1c53406a68aea5a` |
| `packages/theme/tsconfig.build.json` | source/config | `4484bf7d033f6e63103d01fce7992339cb9edd91a280788e1f759a0fd9f3b684` |
| `packages/theme/tsconfig.json` | source/config | `95b0097666b91ff689833184d1d4e4bf507909538fe70879a75f08ed5647bdf9` |
| `packages/ui/package.json` | source/config | `a96cb3c2889e9d14dc582feb1ce85c9d043213c47fb37bae7bd9ea99def40b03` |
| `packages/ui/script/build-oc2-v2-overrides.ts` | source/config | `4b52d55d4c4dde4ffe6aad39301f1fa74677e670eaa8eba761e0c3b1634e6f0c` |
| `packages/ui/script/motion-bench.ts` | source/config | `bd6128f8174f51901d476d840f6957a2ff11ec12d1f22f8d389ca7e669a7af30` |
| `packages/ui/script/pack.ts` | source/config | `7e28aa2225ccece588d3a5ab805cd6e594a2271e8da06f7084f29c44a73aecbf` |
| `packages/ui/script/tailwind.ts` | source/config | `70edb3bab61d3b78b49bda80deea85cf9a0a753dcd14a8335aed5a33af4af6c7` |
| `packages/ui/src/actions/button/button.stories.tsx` | source/config | `66edb6038bf0194ac401e5d33d55e84185d1881cb470e2c794d127626f71f4fa` |
| `packages/ui/src/actions/button/button.tsx` | source/config | `6ca018dd53fe1e2cdee7d0ca6a65ba5f429b2625f91cf95156923223a757310a` |
| `packages/ui/src/actions/icon-button/icon-button.stories.tsx` | source/config | `29a3bdac279509b92c18642f6804c6a14e86b0f7a38c547533e5cbd21e48be28` |
| `packages/ui/src/actions/icon-button/icon-button.tsx` | source/config | `6681150c3b29c928dc8bff62414cce8a631ac8622bbf9f76f9ba40e883e97ade` |
| `packages/ui/src/actions/split-button/split-button.stories.tsx` | source/config | `6c30046df183078faf2b89d5e66759558ba311927af66b7592aeb945f5c47c34` |
| `packages/ui/src/actions/split-button/split-button.tsx` | source/config | `88f390e5eb9015a992bbbec82e6bd8b4deadef4f1a80dfdcb131273ff1f2e7b5` |
| `packages/ui/src/components/animated-number.tsx` | source/config | `7ceb3de96c4c7151a7817e00d70e82add9df85bfc69254ab649622e4b28214b3` |
| `packages/ui/src/components/app-icon.stories.tsx` | source/config | `d20c1a9a052f1ac771979f022f6ee163b8a03fd50db4633858e7771ce3f609da` |
| `packages/ui/src/components/app-icon.tsx` | source/config | `42089642a5aab1e9ba5e7417dc0724a163987ce6bfbdf05bbfb02156edb788e5` |
| `packages/ui/src/components/app-icons/types.ts` | source/config | `5eba497897fa93979d3cc74013ebf8e6b22b782dda6c71306885d5daf284a0cd` |
| `packages/ui/src/components/card.stories.tsx` | source/config | `1ce93031cb9503f231026cd2c40593bcd9d64ffc99337a5788763fd8b2117434` |
| `packages/ui/src/components/card.tsx` | source/config | `2a6c29b3703d22f518d5d4d4cabdbdbd1d319182622d7886aeb71adc53725e32` |
| `packages/ui/src/components/collapsible.stories.tsx` | source/config | `be68dc6a05b68e25574e040255edc154e2b35e8fb9b33594d0cc610899be968d` |
| `packages/ui/src/components/collapsible.tsx` | source/config | `06648daca00df0329584c0f3fdc4ddb298a37d85fb697976afa482c36b98f6f1` |
| `packages/ui/src/components/context-menu.stories.tsx` | source/config | `0eba9ca550fe1b915c92ae2a4f1ffccfaa7ae6621b59819858a39b1f15420110` |
| `packages/ui/src/components/context-menu.tsx` | source/config | `c86ac6f03b9a17141304f1b849585f505d80c16152cda5d6e53db882d00e66e9` |
| `packages/ui/src/components/dock-surface.tsx` | source/config | `9d4d906e6f7c8a5b92003eeb85ca71536f547779c9ce6a9e2c1df4144e34edfb` |
| `packages/ui/src/components/document-surface.tsx` | source/config | `c6b4c5777edac277e2f45b5a8a16f364e07e1f4a54fac452b2c68d7f1d138613` |
| `packages/ui/src/components/error-details.tsx` | source/config | `a322591c0f44f6b8f6dee6fb2c051850952a77e311e3af971f78d2c0ffab34a2` |
| `packages/ui/src/components/favicon.stories.tsx` | source/config | `9594c83c0c673e19ba22af62683e0fb07cdc8b0e8de99fe2209aa86cf48e5798` |
| `packages/ui/src/components/favicon.tsx` | source/config | `ec30191c84929e8e931b44b633081db250e9733ff498ac0713c0c0fa12a9f330` |
| `packages/ui/src/components/file-icon.stories.tsx` | source/config | `6066aa01ba60c74640cc59a0a14a12ee6997b0a7600e08593237375984b271ad` |
| `packages/ui/src/components/file-icon.tsx` | source/config | `1e8acd3f5a452654093dffcfee784f0601adc60560e7a2bfaf309f204d37852d` |
| `packages/ui/src/components/file-icons/types.ts` | source/config | `ad65cb8610bba9dd7ea785f530027d2c7c0ded0df149274911887f134495b8a4` |
| `packages/ui/src/components/font.stories.tsx` | source/config | `bb60b04672879dd8966a50870d819597d689fe521fdf02475789d623c65370b9` |
| `packages/ui/src/components/font.tsx` | source/config | `6abe13ee9e1f2257e245140cff8ed0529ebba805296122b9a4507566756d4b50` |
| `packages/ui/src/components/hover-card.stories.tsx` | source/config | `153a819ece452f69381605264b12298a6ba2f8a5b0a4c93cbf55461a5e02a04c` |
| `packages/ui/src/components/hover-card.tsx` | source/config | `986851a59c424126f88bf267390b06196313d6e7b44a44f42e3efe7bbc3caab2` |
| `packages/ui/src/components/image-flight.test.ts` | source/config | `6e54b41489fd33da545b2652607f5e31a42f59ce2053747679044ad5072fcc6b` |
| `packages/ui/src/components/image-flight.ts` | source/config | `3c29de62fc4482c5693850aca4ae6a020c198ec883442c7bbdc914ec95dfbbe8` |
| `packages/ui/src/components/image-preview.stories.tsx` | source/config | `cbfd4a3ba40d9ec39c543937c7f786cb71077c7e468876c89b4777c423496596` |
| `packages/ui/src/components/image-preview.tsx` | source/config | `204cf0ffdf6e92f503cc24016bbd11b7b8f4f6de23371980c1c7292dfc4ac445` |
| `packages/ui/src/components/image-zoom.test.ts` | source/config | `a349dd056d1edb207d8c2409ea1f0554b1b65381928b4de81e9828015ecac759` |
| `packages/ui/src/components/image-zoom.ts` | source/config | `0769df544e2eb0cca3bc7d5b9c9c0d1ec50a8c8271230600d735663e12b59c5e` |
| `packages/ui/src/components/list.stories.tsx` | source/config | `1ad540ed67bd506d0c8f9298e27a7f518168c96673561fd37e43ce90ccc51aeb` |
| `packages/ui/src/components/list.tsx` | source/config | `9b32e167cc708901dc416b7b0f056a80c5a2e1719ee66953359b041c7f02536d` |
| `packages/ui/src/components/logo.stories.tsx` | source/config | `65943df666eca90640d6fe35e072132e36a1e53fbe26de600421682f4d2a1dee` |
| `packages/ui/src/components/logo.tsx` | source/config | `8100d4151459a7e3a9f109659557ac99437d71a1e3fbcfc518d1ce6d202c9a20` |
| `packages/ui/src/components/menu-scroll.tsx` | source/config | `9476c21e83b34bb2f242b32ea9c00cce06cfe7c2b76a8c0e44c9354bc7b738d3` |
| `packages/ui/src/components/motion-spring.tsx` | source/config | `e83a3aff2ef5702511cb06a70906dd4080116d154cc6ec89ffc7d88be69069ff` |
| `packages/ui/src/components/popover.stories.tsx` | source/config | `6ab5add686ac09beaf8000ce6c6fab82148344ae851af16b005a2b5280f59fa1` |
| `packages/ui/src/components/popover.tsx` | source/config | `69c938cd153bf3d416e6dc21fb8662c40586f154165445575d32b3ebb100d84e` |
| `packages/ui/src/components/preview-controls.tsx` | source/config | `8e93d3ee2ad513a3f60863e4faea8a75f2140922bdcafac1e61694376a4be2ba` |
| `packages/ui/src/components/progress.stories.tsx` | source/config | `e17bcb51d74c397b28fcfe3e9290ac345035511f439e3dc930a4f73faaf1d113` |
| `packages/ui/src/components/progress.tsx` | source/config | `9146462c6f53ca34079e1ac1230333175635455a1115536f92c9d9d6cb8e3c74` |
| `packages/ui/src/components/provider-icon.stories.tsx` | source/config | `2ca49bc951fa91a999bb03fefe820a46d7d55a23492040c684b021c0dd8fba07` |
| `packages/ui/src/components/provider-icon.tsx` | source/config | `5b3afb8a6eca3af3f5cae1e9fc648ed9cbdf6dd4013dbb884ac504ec43f432a6` |
| `packages/ui/src/components/provider-icons/types.ts` | source/config | `98c4ff30c10b7291dda349d6b35ede46d586f81d219757d51a2744cb64d3f535` |
| `packages/ui/src/components/resize-handle.stories.tsx` | source/config | `a7e98663fcb62f31a76e7bcbd11cef35abdfbedd27318e65515dfe175bd5dc1d` |
| `packages/ui/src/components/resize-handle.tsx` | source/config | `f62fe9c70135b0e5a67155cd7f3dfcc176d7fd3c228a083d545d99a140740faf` |
| `packages/ui/src/components/rolling-number.tsx` | source/config | `b544f9ef72ac62bd995bcd0e89cca9f79372493a562c95a18142991a037848b3` |
| `packages/ui/src/components/scroll-view.test.ts` | source/config | `a682a5dc1cdee4b23ae8a7c0e4a99308386d6a49d89319ee8688e7a8147015f4` |
| `packages/ui/src/components/scroll-view.tsx` | source/config | `c4d0a7cd207786884eb3dfd75d9e7a7250093d7393650c92ac2de46854d33072` |
| `packages/ui/src/components/spinner-radar.test.ts` | source/config | `c875b12d502d95960cb088c0b29eb56c03b06cdda5b54d977514ffbe2e5c6aa5` |
| `packages/ui/src/components/spinner-radar.ts` | source/config | `20c1f17301479e9fb1aa7a6ec516102f4b80aee0dd97a0d15f1203ca18352c46` |
| `packages/ui/src/components/spinner.stories.tsx` | source/config | `1cc7670affd2a6a561324d807c04f9b61beff8f217d205034b7f47e97eafb9da` |
| `packages/ui/src/components/spinner.tsx` | source/config | `91d27309a60cad86bf3ef7859511528a3f48d420322eefdd915ae1fa4ef973ec` |
| `packages/ui/src/components/sticky-accordion-header.stories.tsx` | source/config | `c4830fb1d9c449d459008bcfaddcf651e2285313a210d9f00eabd27b2d2859f0` |
| `packages/ui/src/components/sticky-accordion-header.tsx` | source/config | `486313addc7128c2252efbe59f21ce02ce1d4f72d25ae6a574f4816d70c3b040` |
| `packages/ui/src/components/text-field.stories.tsx` | source/config | `8bd2e0abe33127b466de740936e83fd232b2034878a3c9795e8c3748b76599d8` |
| `packages/ui/src/components/text-field.tsx` | source/config | `596f6b6d9a2ab16f2c35da82f9627daf87d3b9f3877710d6fe7103b68bee2e4c` |
| `packages/ui/src/components/text-reveal.stories.tsx` | source/config | `c6115c33a28425176bc438cbc25ec81549c9c956fb8310c0379df1eee3b922f2` |
| `packages/ui/src/components/text-reveal.tsx` | source/config | `20ca3c55bb46a628d5a3d93364e63c65b4823f50e594ce7842d53c2116891d7a` |
| `packages/ui/src/components/text-strikethrough.stories.tsx` | source/config | `d4f913026205779ef37b1df51a20ddc17efa30afe9e489482ed4878157a6cb78` |
| `packages/ui/src/components/text-strikethrough.tsx` | source/config | `cc3d6aac53f926c2eb6b3902c0b8c0e9d74c7c706a973e5e608081f9e1a5a9e6` |
| `packages/ui/src/components/thinking-heading.stories.tsx` | source/config | `1b28eb96f77b4c0ab6e16e6c678a0b7f5336249b345cc3cd3431a68e6f46523e` |
| `packages/ui/src/components/truncated-text.tsx` | source/config | `931f6a2c7ae109556cb1d3713307b5ce1bab95a0cb5a40eb3ebc1b33a649dd46` |
| `packages/ui/src/components/typewriter.stories.tsx` | source/config | `1e7658992d06ae97b4b0b2deae18b979f02f91661612d4511b3077329cf6304d` |
| `packages/ui/src/components/typewriter.tsx` | source/config | `203129eafdc1dcfd661dd57c0a740973c110482506d4471d91d358eb042f0d1f` |
| `packages/ui/src/context/dialog.tsx` | source/config | `4282f6c625cc0ed2381019da8fcf964be491d9d2cbece780ef8ea58586e498e5` |
| `packages/ui/src/context/file.tsx` | source/config | `603ff4ae91c545318c11363760c895a3afcf3c408abb70ae0a70f89a6afd83ed` |
| `packages/ui/src/context/helper.tsx` | source/config | `e8b9c1d17d67a9326a9b1dbf6797e4c2f60a277de99bbd3059f077d2773919e8` |
| `packages/ui/src/context/highlight-theme.tsx` | source/config | `270fa0261fc2417579d50628eb4d1edc104f13d787c5c8404203264cc2259d39` |
| `packages/ui/src/context/i18n.test.ts` | source/config | `001f37241c46af837196ed09c91a57f9662dd65fabd3b55fa7b7d6fcf3c7cb69` |
| `packages/ui/src/context/i18n.tsx` | source/config | `b27787226ac036e4411f1ee26bb7f2631d35c1a6e1f452428dc755bf28889d5b` |
| `packages/ui/src/context/index.ts` | source/config | `32afdecd5268f3a6632980da05748061b5202154eaa846c507820025e34d355e` |
| `packages/ui/src/context/marked-base.test.ts` | source/config | `4d321f956b4f694c02a3a9418f007c70ebcea811f70209495bd79e55b19121b6` |
| `packages/ui/src/context/marked-base.tsx` | source/config | `d3b1514d5c5500eb2590c225c948c4a0ce6e335acd9e7e83ebf7053292d1da43` |
| `packages/ui/src/context/marked-parser.test.ts` | source/config | `3a83f69f4eacff2ba134b3c5decce700fcbd631f8564fba357821fe9f344cfa4` |
| `packages/ui/src/context/marked-parser.tsx` | source/config | `74323e68a7395fa64dc6815a7d06a6467d6464811d2ab55b759e7223da279ff7` |
| `packages/ui/src/context/marked-regression.test.ts` | source/config | `15bcab37aab23f181f7b1596172e3f927f319a089ddf44e49326b92d7ae57ec8` |
| `packages/ui/src/custom-elements.d.ts` | source/config | `0c768927d65570a4935adaa363710ac1a022121b99bb10ad5048ebb4383f1546` |
| `packages/ui/src/data-display/accordion/accordion.stories.tsx` | source/config | `3f9263b0929bf9e7469b31ea967c86613e5e615dca4968c5e90f86b042e9bea1` |
| `packages/ui/src/data-display/accordion/accordion.tsx` | source/config | `275b557c57ea456c3fbb60f6f62b1e781de37bdb7d0d721cb3727573234fc394` |
| `packages/ui/src/data-display/avatar/avatar.stories.tsx` | source/config | `37522d9bc405df515dd30787af511ecf8f04716473b21395716b3ca43d31de75` |
| `packages/ui/src/data-display/avatar/avatar.tsx` | source/config | `109538d3bcf8fad55eea0bb6b415fbad41688586564b789a31a34af5d09fbe2d` |
| `packages/ui/src/data-display/badge/badge.stories.tsx` | source/config | `31a5ccf767eeae12ceef79420bcad05c35ba176351ef168d73644cab3d39d525` |
| `packages/ui/src/data-display/badge/badge.tsx` | source/config | `e1ce36e76aed1114f50cabeb94db5f4573a4b6a72206ab0d0d5a98d6dc8b61b9` |
| `packages/ui/src/data-display/diff-changes/diff-changes.stories.tsx` | source/config | `2be39caae7262e52e5c08b52f2e471222b714e8792928bc4a93e20445e5663b2` |
| `packages/ui/src/data-display/diff-changes/diff-changes.tsx` | source/config | `07c58b53cb185dacdac230d3d056930a4db73e346a9f91770e4368d1188f8dd5` |
| `packages/ui/src/data-display/keybind/keybind.stories.tsx` | source/config | `3bc45992035b7cd758bbc5dabe8c7bd32155d570b5396de2be1d49c52fec2f2a` |
| `packages/ui/src/data-display/keybind/keybind.tsx` | source/config | `a4101e5eb2bae6f35cf80afea6f9955bc2d6f22469499652de487a8cb8058714` |
| `packages/ui/src/data-display/line-comment/line-comment.stories.tsx` | source/config | `7a6736827537245607d225a32233a3db915a48bd8acbbd449bf152a17fd5ae42` |
| `packages/ui/src/data-display/line-comment/line-comment.tsx` | source/config | `ea2af8f719e36ed736a88bdb7d4048337ae1f2184c9c3063f8dc912f9afd8389` |
| `packages/ui/src/data-display/project-avatar/animation.ts` | source/config | `a1a4ee65edffdc6a46bdd22089d21158416892e22e526cb8964cc859aef403f8` |
| `packages/ui/src/data-display/project-avatar/generated.test.ts` | source/config | `9989f6e62243ade005686dd03c41154d0d7392840443f04c4477aa0300d9dcd3` |
| `packages/ui/src/data-display/project-avatar/generated.ts` | source/config | `8e04999129d7968fc11b167c6499cd9cbaa10e473d465fcaed5d8c5bead37b27` |
| `packages/ui/src/data-display/project-avatar/procedural-craft.ts` | source/config | `bad0932d166799b1c2e213eee60100f514ecd9baa5f1fae5b0bfea49db8a1250` |
| `packages/ui/src/data-display/project-avatar/procedural-kit.ts` | source/config | `5780a4a405c82c550ac8ed95c31ae38fa3f82e06d7c8dd24695817423cc4b5ef` |
| `packages/ui/src/data-display/project-avatar/procedural-machine.ts` | source/config | `7190d869b24c092e5480e6774ffeaa6bc515228f72737b55f73f47c8be9552c3` |
| `packages/ui/src/data-display/project-avatar/procedural-world.ts` | source/config | `75221d566ce95d83ceeca3406300fee169d597c6f6dc4b95930b9f9dd9f5fe47` |
| `packages/ui/src/data-display/project-avatar/procedural.test.ts` | source/config | `f7ea0f826247d09c7cbe18ea85259f3dcde815750006ccf34ba453d5437f515c` |
| `packages/ui/src/data-display/project-avatar/procedural.ts` | source/config | `a13fd081d2bf4f637645732529d165f1de4de24f178de6dfbc68fdfc874b9bb5` |
| `packages/ui/src/data-display/project-avatar/project-avatar.stories.tsx` | source/config | `71c350fafc5f31bad77db3fc1de659866ddbeb5fdc17447ce553f04d7e576cb4` |
| `packages/ui/src/data-display/project-avatar/project-avatar.test.ts` | source/config | `6c67864a9cc2e1b437dc2eebf0acfde4d62050fb9092f067ee3d67d71aecb63c` |
| `packages/ui/src/data-display/project-avatar/project-avatar.tsx` | source/config | `891baee4ebf9c5440c628f50ba5a21b8022127bdf66bb36292c9a0123d674492` |
| `packages/ui/src/data-display/project-avatar/project-icon-styles.stories.tsx` | source/config | `74ce65357f6b80c2d4573dd195de83eccd32c9fad9cfb71a77c04df2f822e1a5` |
| `packages/ui/src/feedback/activity-ring/activity-ring.tsx` | source/config | `3917ee6f13ce0f8c1833e8858a675e4eec8fd13eb8ea976bf646b426b2b9f8f7` |
| `packages/ui/src/feedback/loader/loader.stories.tsx` | source/config | `02ddcb0ad1531028621bcd39dc9c750ffdc1291766ee3cc5a6ac7da1a2bd6007` |
| `packages/ui/src/feedback/loader/loader.tsx` | source/config | `94ec97abf0d76614543bc7d823e9aa6fd043a25fde0bf07645194dfbbd24f0db` |
| `packages/ui/src/feedback/progress-circle/progress-circle.stories.tsx` | source/config | `97a63bb37187e7cc14ba5f26e1ab229b50dea3116c39e9b24db3b685fc0add11` |
| `packages/ui/src/feedback/progress-circle/progress-circle.tsx` | source/config | `582e329cf4af6b4a34b3879cd3b2f3e2d08f76ec7d3f6b777fef05845a8e7a35` |
| `packages/ui/src/feedback/toast/description.test.ts` | source/config | `1464b4b8d702aa44ac23f2d0ae570ff34fd1f9aaac78483115d413e5587be192` |
| `packages/ui/src/feedback/toast/description.ts` | source/config | `da0d78fad12a12b47ae6c763a90746cf664fd2d735e7b200174300a3c7110305` |
| `packages/ui/src/feedback/toast/toast.stories.tsx` | source/config | `04905300b9bcd4fbaa2c0d33f0045f57b648858f145db715af6f5ae48fc7f9e1` |
| `packages/ui/src/feedback/toast/toast.tsx` | source/config | `3e4c9d9897e576674e013e8834d4768b183462e3518b0f23e12db96ca235dd9f` |
| `packages/ui/src/font.tsx` | source/config | `affae480db23e3124a60e985af56627953b397b6c66e9064a80ab84b532f2d52` |
| `packages/ui/src/forms/checkbox/checkbox.stories.tsx` | source/config | `0763acd4dfdb1bd5597494d298726f212e159d237ab20cfda782fc61ec4b0b29` |
| `packages/ui/src/forms/checkbox/checkbox.tsx` | source/config | `3877d69f9c9e616cdd510d18f1a11b191ffc705d8c969c2b09d8364e8f16a8ae` |
| `packages/ui/src/forms/field/field.stories.tsx` | source/config | `6e0907c0560cb9d7334f26af5dfd1076036557f865ddbbe02df841534812048a` |
| `packages/ui/src/forms/field/field.tsx` | source/config | `4afb1460adb04e1a8681e3c79be1468eb4dd8e536c496e5869c7b7be9fa24c7b` |
| `packages/ui/src/forms/inline-input/inline-input.stories.tsx` | source/config | `8b5de8dae3d974d6061024b4e8676880db268ee0a19cc00263fade06852f138a` |
| `packages/ui/src/forms/inline-input/inline-input.tsx` | source/config | `db98043c8288cd96386c7df08ad0a87ac515221c30e43f230e7064f5f78052b6` |
| `packages/ui/src/forms/radio/radio.stories.tsx` | source/config | `abc346e2cc43844846f4f0afd0fc3c349e90373a00b2ed628d40670b75da89c1` |
| `packages/ui/src/forms/radio/radio.tsx` | source/config | `2e8e8c9d34e8b7c9c16d2a8ec3f0f9f82e4fedec559e2f4da3ea193cbe156ed3` |
| `packages/ui/src/forms/search-list/navigation.test.ts` | source/config | `cba44ea31adbd757007f45ffc0e957ebda8a52f6262c982bfa5fa5bec0f121ac` |
| `packages/ui/src/forms/search-list/navigation.ts` | source/config | `107b696c5897b02335fb2107bf3bdd412432ca7e64f1db7fec785c820ae8bad2` |
| `packages/ui/src/forms/search-list/search-list.stories.tsx` | source/config | `26f64a9f85da04785a20f045ffed8c4476af6393b255ea48fe63d6b2fe22c9eb` |
| `packages/ui/src/forms/search-list/search-list.tsx` | source/config | `020b33ea4ae97b4a5fc404d81cbfbf162e1440aaab8d139e10d359c88f45a0c9` |
| `packages/ui/src/forms/select/select.stories.tsx` | source/config | `de119dcc57f8e305f3fac2f6ff8c12ff5203163c2c674b3c7e06ca5403eced1e` |
| `packages/ui/src/forms/select/select.tsx` | source/config | `d411ded88916e3814c6ceb7725dc2e1544ae12ef44f5a247bb0accb65ceeef3b` |
| `packages/ui/src/forms/switch/switch.stories.tsx` | source/config | `67a7c9e1cc2db7e07e8e0fb10726a1ae94970415a90325a8c50489047df16837` |
| `packages/ui/src/forms/switch/switch.tsx` | source/config | `ada7346d3754c97f0d0973891a2300a6a13e16af5b9da8829f17f284399884aa` |
| `packages/ui/src/forms/text-input/text-input.stories.tsx` | source/config | `dd3d2838a54a8ed60eb0e795db9137be157d45cf2f6b5d9c2a06a5864c0e4a66` |
| `packages/ui/src/forms/text-input/text-input.tsx` | source/config | `baec72736a290c8cd7885f81b9d587f7e10a475d8ecffe60ef019a5f7f904ab8` |
| `packages/ui/src/forms/textarea/textarea.stories.tsx` | source/config | `e2c854d14eec2b825bb48b71b114160048379505dacd2b59a92200ea8ac6de4e` |
| `packages/ui/src/forms/textarea/textarea.tsx` | source/config | `e234e55962a9c201762ebca7e0c3be40dfe373a24424af956cd06159c6306f52` |
| `packages/ui/src/forms/typeahead/controller.ts` | source/config | `201f046f2ebd4ebccd25e6888ce99c42895f63aa9360b505161dcd9e485e45da` |
| `packages/ui/src/forms/typeahead/typeahead.tsx` | source/config | `5d39f409bf76a1691b415ae88ff76a773d00f0a87a1ea9881ae833c78d179fcc` |
| `packages/ui/src/hooks/create-auto-scroll.tsx` | source/config | `07ab3c32bdb34e7df4e06d14a3bf63c1d191aeac182cbb94b4d6332c5e9c7ee1` |
| `packages/ui/src/hooks/index.ts` | source/config | `72b4fa705fe5533b5cc2a42164dbee3ee49f26f6f9501cb5115cafb08e7342d1` |
| `packages/ui/src/hooks/spin-phase.test.ts` | source/config | `a218b99a279b768437d30dbb1d71814e0b4e6c1d6996211f36dd61c8687431ae` |
| `packages/ui/src/hooks/spin-phase.ts` | source/config | `df279a9adc9266ac27e999a796d566808ce853bcc7eca5622793e297a17817ee` |
| `packages/ui/src/hooks/use-filtered-list.test.ts` | source/config | `d1f3e77622391b47a2eeb6952037d42150c60cdd7f32610f02fd97975134e645` |
| `packages/ui/src/hooks/use-filtered-list.tsx` | source/config | `837fe5812ccf30bfd64d40c7e80fbe688082f02d565addab6f3e5370be914f63` |
| `packages/ui/src/i18n/am.ts` | source/config | `ced80f0a6a60ce587af4da82cd3e8fb14203f20ec15a6a301e04b3faf9205182` |
| `packages/ui/src/i18n/ar.ts` | source/config | `fe99acd7570905351a5bfa4739869ecf6db6da4a9fb2e96334acf5b542f71609` |
| `packages/ui/src/i18n/az.ts` | source/config | `9ef4499dd4d40d3cf923a92f7e335aab1a860c4abcf108b4d5743b649c0a15ba` |
| `packages/ui/src/i18n/bg.ts` | source/config | `281026242c09271f3044fb66b44ca521f1a9701031018ee0fbfaf451f50c4c3e` |
| `packages/ui/src/i18n/bn.ts` | source/config | `1b41009ebf8bb9303ac7c3d6846ef22f283f545c0cc2f81314fa9e6c95121b72` |
| `packages/ui/src/i18n/br.ts` | source/config | `c42fd42de66dd291f173362633053498a50424b62b03f2403bbf54f623256a28` |
| `packages/ui/src/i18n/bs.ts` | source/config | `40992f7dc7137a6b520beab72ada49b49fc7ef343ffdbd6a916ffe83232844fc` |
| `packages/ui/src/i18n/ca.ts` | source/config | `81cba02d3fabab0bf9910a4301b6d48a5e96ad7615865fd8eb2112ba067565e8` |
| `packages/ui/src/i18n/cs.ts` | source/config | `22daa884fc02b60dc698dc92c84cc710f9033df43827653b26170476b0f3f174` |
| `packages/ui/src/i18n/da.ts` | source/config | `f6a4d828022e367a706ee2ac7c17a0701e7b2f62ef38a71b745b1b4a807c17bd` |
| `packages/ui/src/i18n/de.ts` | source/config | `d690b0e9a582f42f2dcdbd599a7cdc9ffd16cb90d86b97edca10a7bc8e056ad0` |
| `packages/ui/src/i18n/dv.ts` | source/config | `98ea2f81a406f7c8d1456049e90067662a434e60375c435cba230b2c4fe22621` |
| `packages/ui/src/i18n/dz.ts` | source/config | `858f5c7a8d731babd93540649ec0b9d1bb4a68f0b30424970a8a1e48566b3b7c` |
| `packages/ui/src/i18n/el.ts` | source/config | `aa35120a426a4becb7c45523ad4d6b037746014fecc0cd2a2246f12a17824ff7` |
| `packages/ui/src/i18n/en.ts` | source/config | `9f4222306b9641b7e42983156558ee0e5ccdd14dea135577fac0ef40e3fb96f4` |
| `packages/ui/src/i18n/es.ts` | source/config | `95beaab5e95c22e0b840d8a274d5f87e8c517afdcd9e6453f217a67d4cb234d0` |
| `packages/ui/src/i18n/et.ts` | source/config | `b6be1bb0946338f863773469699d1193400607b6b33c0d967de4fe17b0bb31c3` |
| `packages/ui/src/i18n/fa.ts` | source/config | `68742b12922e21d771a0b982b962010b37704f47e79d54525996a50ec088a69b` |
| `packages/ui/src/i18n/fi.ts` | source/config | `e0d453905d72dee2e9dbcfff1d8a51712033c534dce002c29c5276f0ec59650d` |
| `packages/ui/src/i18n/fo.ts` | source/config | `85b7dba33ddef2189275d41a30b863a5cef774e80288b4c20d2661503776ff3e` |
| `packages/ui/src/i18n/fr.ts` | source/config | `d76d965eed85bf2e28416b7948a6af36f07237cbd02e25687121d29a1f4d2d9b` |
| `packages/ui/src/i18n/he.ts` | source/config | `b3962f16b1d7e0192210c03883995856f1f5591643b7fb8679e0d2c01e0d2c17` |
| `packages/ui/src/i18n/hi.ts` | source/config | `1a459a568196863aa8dbf5a5d1fc2ebbecbaa0b87f85d9205723e2c9fa9b9f18` |
| `packages/ui/src/i18n/hr.ts` | source/config | `f776d0a49ce31661ccbc99064d4894e1435f2671eb7927ef525bc7d0984c79d1` |
| `packages/ui/src/i18n/hu.ts` | source/config | `c3c828d0c46800091b4faa5ef7e8b1a56fd042a2c6c623dd7bded634da350636` |
| `packages/ui/src/i18n/hy.ts` | source/config | `ecfe43bd3a3c4df2f78db200c9fd86e3562e5db90a2985af59c855f5e85c1fd9` |
| `packages/ui/src/i18n/id.ts` | source/config | `4cd1604f924de0454fb938c5410c3afd4aa159285134b3455b95b404962506b3` |
| `packages/ui/src/i18n/is.ts` | source/config | `5d8b519be5d2fce2de311b00481ff482951231fca16909ec3d14f7d6af128aa0` |
| `packages/ui/src/i18n/it.ts` | source/config | `4020008f1c83d54f0f4e9f2ba501dbc3e57be5e26ff3255b01a4b315cba631b0` |
| `packages/ui/src/i18n/ja.ts` | source/config | `1dce418e2e4a36702217f364ad8972f9d38e71d9b48962e53164a2fe6ff472ff` |
| `packages/ui/src/i18n/ka.ts` | source/config | `f761a15d90a1884d6f707ec52887af7a43883870d850c55cc69fc0e867eda110` |
| `packages/ui/src/i18n/km.ts` | source/config | `ca362424f642802e9356ec2af56d910f2b77f6790f68028c9e0dcda43d27e535` |
| `packages/ui/src/i18n/ko.ts` | source/config | `f081ebb45e65f0efde8a819b614ec303c66e5f904c43e73c87337d95280a05bc` |
| `packages/ui/src/i18n/lo.ts` | source/config | `3da4bcea0e44a9bf71fc28ca4430caed4c47073b3560ebc1ebd1588793b23e41` |
| `packages/ui/src/i18n/lt.ts` | source/config | `ca128685aec4ecaec8b1155b38a32a6ae110a7e437f4d1d7e19dbe3257e70cdf` |
| `packages/ui/src/i18n/lv.ts` | source/config | `d4440ed64df7f747972c09a8bb1ccbd42f86120eec8d4c203b270f37cf0fddd4` |
| `packages/ui/src/i18n/mk.ts` | source/config | `44f01f85fa1cceac887a19a7b4f2898083ea8e0d972b86a586db40618bde61a9` |
| `packages/ui/src/i18n/mn.ts` | source/config | `22aab57b7fec1d734afd33c4e2dbc69262d28b9c024ec2a3645fcd9cc6a78766` |
| `packages/ui/src/i18n/ms.ts` | source/config | `527edccbf70b2b3790c56f57eb776f2436dfb3399ac1f10104f7311f760f73d8` |
| `packages/ui/src/i18n/my.ts` | source/config | `cda1bab2c45d79aeff8a00939f3b86864f0987edb0bf0b5055443dc3d6811ffa` |
| `packages/ui/src/i18n/ne.ts` | source/config | `43b9779b94b9194d5817497c9dbbabb254bd8a6d98eadddce477d90337c065d9` |
| `packages/ui/src/i18n/nl.ts` | source/config | `584d6d0e9e4ae2e3de3d6f8b22ee1e2959b9857b8b201d51a78f36ac9213ff0e` |
| `packages/ui/src/i18n/no.ts` | source/config | `ba6188b9feecc23922e93cf8abb24d42b310d0ef6fc31e7c7ddfa5bf6775944e` |
| `packages/ui/src/i18n/pa.ts` | source/config | `f81f1bfebab56e716647d7a0e77011a59ec803609948d9c302578dcca4700b44` |
| `packages/ui/src/i18n/pl.ts` | source/config | `1c16c62a265dd1df43e8f5a049193cac0264eeeffc3154c836254cb8d4f27f3e` |
| `packages/ui/src/i18n/ro.ts` | source/config | `d3b7e57351697035b1b02da2e57d13a9cd1b8956b435ea8b7e3b5b92d6db02d0` |
| `packages/ui/src/i18n/ru.ts` | source/config | `2b83fe9da5df929c54a79424bca8a314e26b6b348c7214472995981de688b5c8` |
| `packages/ui/src/i18n/si.ts` | source/config | `f9a3274a478ca54012c930517c5449c95341cfe67f85a3854b6523cda01645a0` |
| `packages/ui/src/i18n/sk.ts` | source/config | `3ec1dc61617f6f2531c346233b73d7673435b878776920c1fbac32bcdf7a49dd` |
| `packages/ui/src/i18n/sl.ts` | source/config | `6b3e6f2e14534464183db5264cd24b7a9ba5e471d1730a38edbf75da3f13db96` |
| `packages/ui/src/i18n/sq.ts` | source/config | `71b62e2ca11bcf4371ae8309b9e812e4a043752c2e96c59186793fee515adb03` |
| `packages/ui/src/i18n/sr.ts` | source/config | `2b9f8f31d0c34508b721919185623738c75b0c57f3dfc802cd3b30f04c94790a` |
| `packages/ui/src/i18n/sv.ts` | source/config | `62ab4f6c7763c0c8745016edd913930993c4cf588fce6ce89d19f813a280bfb5` |
| `packages/ui/src/i18n/tg.ts` | source/config | `7df1d60194ef6d4a223f7eab14dc2962e39fb6f264a55ee7f4b4835098876773` |
| `packages/ui/src/i18n/th.ts` | source/config | `e24d6c61cc1df960526f1ee4f5d9e84cffa2e2fa0a7a0b7dcb42705a0a879512` |
| `packages/ui/src/i18n/tk.ts` | source/config | `ff270321a889a9688e8972664d320349951dbf30645ae9dfabb3fbcaac0f8197` |
| `packages/ui/src/i18n/tr.ts` | source/config | `b14a1f375b6b4eb7945bd90a373cd7e0ef926d17bd90c28248258c827156fc14` |
| `packages/ui/src/i18n/uk.ts` | source/config | `980b8ef5583e29ef4dd47f30b7c4ae40a65b2083d25aa7170aa7e0ed597afbae` |
| `packages/ui/src/i18n/ur.ts` | source/config | `a0b96491662557d22c05c7752fa2474b0a14eb42b7377412a8d9ba972bc35129` |
| `packages/ui/src/i18n/uz.ts` | source/config | `ce7a21116a34e2b07055a2b0742ec4403a6bc624a1f0eb2b23d056e248338813` |
| `packages/ui/src/i18n/vi.ts` | source/config | `b77a0f916dfa57221941fad0733925fb5db52cc5b58633501ae7d47434381508` |
| `packages/ui/src/i18n/zh.ts` | source/config | `d94140cc3129899f4797f0cab80f3c5f3971fcd0d774735a13fda59375cbc3c3` |
| `packages/ui/src/i18n/zht.ts` | source/config | `5908cda6caf33b77e8bb222a2c7b75fa642098da067eff57274637741f1a2386` |
| `packages/ui/src/icons/catalog.ts` | source/config | `e417dbc47329fc63b77acae230ad79849434e20ad2fe8c292615b517682b989c` |
| `packages/ui/src/icons/icon/additional-icons.ts` | source/config | `41575351dfe0ed69e44b8423733dacd902bf5cdc7bc7596af9309f66c960b7d1` |
| `packages/ui/src/icons/icon/icon.stories.tsx` | source/config | `a8d28571b121513c0205c7dc04324cb1beabe78f578ac662b2b32fd3c4fcbcc9` |
| `packages/ui/src/icons/icon/icon.tsx` | source/config | `9787967059b01e8326d3cc616a646fd8ccb10d30698eb710e5d52ddb8f34c1b9` |
| `packages/ui/src/icons/new-icons.ts` | source/config | `8bfd46ac681f14ba6d45e4ad6af73e8d76c873b92c5bfe2c8a7ff4b0ae9a2ed6` |
| `packages/ui/src/layout/divider/divider.stories.tsx` | source/config | `d8edc2d1bdbdf17aac25daed8c2188cc4efb193157b748c9ab71cf0630b053be` |
| `packages/ui/src/layout/divider/divider.tsx` | source/config | `1c495e1b1b62bb095ef006ba4af6709cce1a31aa5f29332519319ab4cf21e4a7` |
| `packages/ui/src/motion-tuning-features.test.ts` | source/config | `b804fb85fdd4fd4dcd5d1a6b5a573732500c5a448a436fdb73167cda4ae1fc16` |
| `packages/ui/src/motion-tuning-features.ts` | source/config | `c549c1a6b0c0fbf23ce658d9b8768c2703bf315f366a0553dbe084534c7857c6` |
| `packages/ui/src/motion-tuning-fields.ts` | source/config | `df8c81a3b97040d9e32cb2c0b4226c4487372add9b179e77b631bba4c1bb6144` |
| `packages/ui/src/motion-tuning.test.ts` | source/config | `79508b4548abd2249220b67659b4aa924f644b0d14d8058489ef578ed676e9a2` |
| `packages/ui/src/motion-tuning.ts` | source/config | `0d0428848feb8ab4f4a277adf365384b534bd4129e3ecc9239a2d2a50644e33f` |
| `packages/ui/src/motion/core.test.ts` | source/config | `5c6e5110e631b868f4ab88c8f7053c2ba587ccfbfb592c8624370d27a1c6511e` |
| `packages/ui/src/motion/index.ts` | source/config | `25cd570867c48b42c4eeba869b9eb4995e091061931a9d76e40e89beb36ff74e` |
| `packages/ui/src/motion/loop.ts` | source/config | `cc70e0b1a7a27db7ea1915c0cdae75ab5017c29352b3da8b5eb92ed4f7266095` |
| `packages/ui/src/motion/reduced.ts` | source/config | `7fef8e394006d835724b9e040da35aaf06beb0721460d902a6143f977d7c8a84` |
| `packages/ui/src/motion/slider.ts` | source/config | `b17c3b5204c75d9249d0c5b5064238c8e05fd8133c50e0fd09ff0296a7b6c90a` |
| `packages/ui/src/motion/solid.ts` | source/config | `ca3c88d2429119769fe3bf094a1c13f7eef64e404f363ac66703890358e8ee19` |
| `packages/ui/src/motion/spring.ts` | source/config | `df4dcce26e677e3894fe8ed677b08ca6d54bbca7b3ce563120aa523c107a62e7` |
| `packages/ui/src/motion/velocity.ts` | source/config | `a89c2b4fdf8059c29c53bee60e7f406cb5272e240a91369acf93825ffd7bce5a` |
| `packages/ui/src/motion/waapi.ts` | source/config | `b01dd9628168c41b3d5ff8c59aec1d40d7851d06df75e9b45834ad8695bb3619` |
| `packages/ui/src/navigation/menu/menu.stories.tsx` | source/config | `849aa933cdcd0aa459d1baab9089725574aa2649d7dd9b8d3d5cd2f92fffd095` |
| `packages/ui/src/navigation/menu/menu.tsx` | source/config | `891f36d6f7b41c8b72b293f87dc02e3f46d1cab9c3048d4ee57d400b547136c5` |
| `packages/ui/src/navigation/segmented-control/segmented-control.stories.tsx` | source/config | `02e3fbe78fc35553b8b68e1b248120351729da76da1b3cc2fbbd66767817ad78` |
| `packages/ui/src/navigation/segmented-control/segmented-control.test.ts` | source/config | `e6d452c8b06aa7323df0d652c5bf0968cc4d590703de1e8604680353779a0a80` |
| `packages/ui/src/navigation/segmented-control/segmented-control.tsx` | source/config | `a86e848b4f63d9518ce0bc3fbeb887aae245f5abfd8ea83d04d14942b2091229` |
| `packages/ui/src/navigation/tab-state-indicator.stories.tsx` | source/config | `276852d83c3ff677eb3f1691778bce742bb7edd6e476c3b4b5a85babaf1b46b9` |
| `packages/ui/src/navigation/tab-state-indicator.tsx` | source/config | `0eabb174e5f17dd4821eb2c086194e5986c8ce01e112c526fe174c2e7b7008f1` |
| `packages/ui/src/navigation/tabs/tabs.stories.tsx` | source/config | `e947b0a00771517b365bbc255e546475b9573f69d3eb43dc61c0ffaf346dfbd3` |
| `packages/ui/src/navigation/tabs/tabs.tsx` | source/config | `eb4a2396c9c0b08946e555cac545d45cbc94dd07a4e676c95c2112da13ea105b` |
| `packages/ui/src/overlays/dialog/dialog.stories.tsx` | source/config | `40ffe5a1577d618c0f7c54a0e34c58c5fc0cdfff2db7f5bac3074b4104a1c20b` |
| `packages/ui/src/overlays/dialog/dialog.tsx` | source/config | `6fef6a377aa4202f43ca3f0bb409cf9faa49cdf2fd49a2f48e68d52eb7c877df` |
| `packages/ui/src/overlays/tooltip/tooltip.stories.tsx` | source/config | `c5629fd431c7fbe7434a940b86b2d7b178a0121166fae4aa38a3c4baef1695bf` |
| `packages/ui/src/overlays/tooltip/tooltip.tsx` | source/config | `96fdfefe0b33a336cecf6baf49378b62d92c88e4652c3126ce16517eda55b62d` |
| `packages/ui/src/storybook/fixtures.ts` | source/config | `22df3f315b8e734dd6504b9824334427fc3143643a36cb4811a5cbff0dae8180` |
| `packages/ui/src/storybook/scaffold.tsx` | source/config | `4a328b697204ba195c14d3489bef3e820ec7e536a177ae06dff76001e5c7f090` |
| `packages/ui/src/styles/blue-tokens.stories.tsx` | source/config | `5d5ad464eb1623c91fe6f173f7ed3b64e1b48bb1b8e87178fc537d22704f2621` |
| `packages/ui/src/theme/color.ts` | source/config | `b558c4bef7d3796e326898d27f11281e24f5e1748b666769870eb4867402066f` |
| `packages/ui/src/theme/context.tsx` | source/config | `d53cba5329ff9f8128f6905936ea7d66bb92b25671dba7cbeee3cf238e7a2cb8` |
| `packages/ui/src/theme/desktop-theme.schema.json` | source/config | `56a2e40381c027e39550ae389d7e87c0df829074143934c4582c3023c98613de` |
| `packages/ui/src/theme/index.ts` | source/config | `6314272f174b16c4d59423248d89a1e774db464fc3e0d5193b38a89a1402f655` |
| `packages/ui/src/theme/resolve.ts` | source/config | `95a3ad55be0a71700992a4fbf40a6f320fd67a975605ee075e8ad16d54f12eea` |
| `packages/ui/src/theme/themes/amoled.json` | source/config | `a529d68c84df14cfcfb794a7b5286e81b53faa28027003c377b0137aebb16873` |
| `packages/ui/src/theme/themes/aura.json` | source/config | `ba05b95395f8cfb60718a9f8f8abb86e9914f9f7eeb6976191139b5160e6990b` |
| `packages/ui/src/theme/themes/ayu.json` | source/config | `6e32826ccbbae9a3575b03258d852d0ff6285058a572003597f5ba2f2eff4210` |
| `packages/ui/src/theme/themes/carbonfox.json` | source/config | `4402ad4fada296a0e085feaa277f60fb7d8283e39152fdfa1522e9341ebdfba1` |
| `packages/ui/src/theme/themes/catppuccin-frappe.json` | source/config | `b1e7ab9c51415825e002ffe8c7d528cf703813128900334f206de333233dd8e0` |
| `packages/ui/src/theme/themes/catppuccin-macchiato.json` | source/config | `8ab2ca0c599f3e670180a1a52b4cfde94e7eea50af9a41ac3f436b8e54f079b7` |
| `packages/ui/src/theme/themes/catppuccin.json` | source/config | `075fed18e17b88b9aff9bb37710aa694121cb21f3572a8fe3ed2974d3fbf6d72` |
| `packages/ui/src/theme/themes/cobalt2.json` | source/config | `294d695b7a45f77ae6dc3fbc5a5c2c28ba1d64b37451ebf548871197d2b9b8d5` |
| `packages/ui/src/theme/themes/cursor.json` | source/config | `b59bd602ac63923c9c98462c5ca6453d5ea510a627fd5efdee711f08ec18c1b7` |
| `packages/ui/src/theme/themes/dracula.json` | source/config | `8958913d2d3c1b685164fb8f36cb0561a0eb6f1ac7e1caab2bd46068b9f28912` |
| `packages/ui/src/theme/themes/everforest.json` | source/config | `273e5b5993af0f1b3a7ccf915a2a9b25e6ab26ab007da3f7b745db9d6f8e3d4c` |
| `packages/ui/src/theme/themes/flexoki.json` | source/config | `c6bfc07b8d862db3760e2b2cce3d1b6013c55f14e062a08b1bb7f066d4affe12` |
| `packages/ui/src/theme/themes/github.json` | source/config | `ed55ef3651c7e6bb81ac21b50823110f2c6c9c0054d31e825b0e1b490a01ac2e` |
| `packages/ui/src/theme/themes/gruvbox.json` | source/config | `aa6f5ac819bcfcd26c2cf6702a78c7218f6d8850baf723a8a60e248b09bbb666` |
| `packages/ui/src/theme/themes/kanagawa.json` | source/config | `128605c99c672031a09dd84ce86c25a1c8621a8878529080bfdb9deb051daa8a` |
| `packages/ui/src/theme/themes/lucent-orng.json` | source/config | `5164ff6fc2a943d06ccf11dc67744f28ec95bd9e9d4794e56ce4cb366a86a15a` |
| `packages/ui/src/theme/themes/material.json` | source/config | `725cd7c0cf416a0a1db222217ec0980d9a1b04c19c6596427f22eca5dc171abd` |
| `packages/ui/src/theme/themes/matrix.json` | source/config | `7882a8e9f56143fecedb10d5aee02013fa45b7466f79815c18d2bf68d9b856ad` |
| `packages/ui/src/theme/themes/mercury.json` | source/config | `2939d13e81a6e048943196556c1016f5adef4e0b9c86a3bb3d3660e5fe6e85fa` |
| `packages/ui/src/theme/themes/monokai.json` | source/config | `189e8e7cad9ccb1d0bd83baf22b9074714f43c5ced20150e0f3461085ece2119` |
| `packages/ui/src/theme/themes/nightowl.json` | source/config | `48d85ec152efcfc85c8f66a9b896876667bddcaf82294a2ce8c3ebd6fd909f00` |
| `packages/ui/src/theme/themes/nord.json` | source/config | `a81f93b168e5f24d8c3da93c0a436f283a386d43214cc1b850db72866ba31cd2` |
| `packages/ui/src/theme/themes/oc-2.json` | source/config | `f558c993e52eabbbc19f4b9eb7af2117fe2a1dacfb4cdaaa40825b7121aa1d06` |
| `packages/ui/src/theme/themes/one-dark.json` | source/config | `fb60d61251e5422bcc433ec8864ad3d1252aac4a867b96e09a0a059dce9a5458` |
| `packages/ui/src/theme/themes/onedarkpro.json` | source/config | `5fbf6a34e74b03172adb9c3c9ed49f8b6e0183c3ecf8b654ec659560b6924500` |
| `packages/ui/src/theme/themes/orng.json` | source/config | `922da3618cd1abc1f536502e9d04fe85f299b8571da6aaa18027926257c6aadd` |
| `packages/ui/src/theme/themes/osaka-jade.json` | source/config | `4afe94f59d196a32c584d012e9845543a25f987d7bdc8fd0a45435f6e0482707` |
| `packages/ui/src/theme/themes/palenight.json` | source/config | `051e30044b15650be534ab592d389a875dac6bf5f96007cb551775502857943e` |
| `packages/ui/src/theme/themes/rosepine.json` | source/config | `1f9fff5930ca3333836354056b03eeea0f1f0bc6c670859bcb5775bfbdf19885` |
| `packages/ui/src/theme/themes/shadesofpurple.json` | source/config | `18f2c2da1a32b6a031694cf35a2c7fb3ec5f33bf2d78b8b5552f4adb75258c34` |
| `packages/ui/src/theme/themes/solarized.json` | source/config | `6cd242c5882f57f2a3e5b67319bd5a5f457cab69d4427a56d0f209d1c172a39f` |
| `packages/ui/src/theme/themes/synthwave84.json` | source/config | `dcb2d1059160bedf1ef526b6a561a99bafc2f7c2e175f183e7796660c326bbf7` |
| `packages/ui/src/theme/themes/tokyonight.json` | source/config | `3c5973d4c7d0a7f55bd289f561478e8602055f54eb01f019afa1daabef68ce0c` |
| `packages/ui/src/theme/themes/vercel.json` | source/config | `6bd766e89c7fd64f706b3bf830aaa524b3c257ea93d1322b41ae5d69851f6cde` |
| `packages/ui/src/theme/themes/vesper.json` | source/config | `8b595bc005871fad1f9de5bba4f906a97e96e26bfb8f28917ed911f0afc6c1c2` |
| `packages/ui/src/theme/themes/zenburn.json` | source/config | `1fee4530998d71488341072fdaee893431324599ea5308aade47a10ddbd52e48` |
| `packages/ui/src/theme/types.ts` | source/config | `749758735e1c302d901ee8ba6f002ddc6772e7c5b8a6aedb8dd3dfaf50647423` |
| `packages/ui/src/theme/v2/avatar.ts` | source/config | `9bf54c2d5736e8beeee971448b808a12559976f6c3ab547533a01cb72e83933f` |
| `packages/ui/src/theme/v2/default-primitives.ts` | source/config | `4924497cb13232bd4920f2b9ce03e96b6abe95d2f80880b249642de8c72515f2` |
| `packages/ui/src/theme/v2/foreground.ts` | source/config | `c820762d3520effc8ec18a6fdcd5b3ef25af6e07f8241d29cddbc50aa5636561` |
| `packages/ui/src/theme/v2/mapping.ts` | source/config | `8f2a3ab8fa1685d7f06334748dfe520e74a30452dfcd2842735109c36582d3fa` |
| `packages/ui/src/theme/v2/resolve.test.ts` | source/config | `e09afca860f0e1c0ce06a24ae6d62a5e020bfc8f7e5c665da50fce2dd92f8eb0` |
| `packages/ui/src/theme/v2/resolve.ts` | source/config | `da9cd18f23291a015a721a980194da9437e2e76d9a23e74a564b3189ea77e5c1` |
| `packages/ui/src/typography/slash/slash.stories.tsx` | source/config | `027f0d646fb6909fedf5edc4f680b7d07134f54bc98265c93c0d8a6093332bbd` |
| `packages/ui/src/typography/slash/slash.tsx` | source/config | `901c0d324864c8718bae4bef7560cd72d8f3da33804b5eea924873729fc600b2` |
| `packages/ui/src/typography/text-shimmer/text-shimmer.stories.tsx` | source/config | `ed99ec595e56340b88a7c520ff53bd3e59dd33375b604b83ac8feceb28482757` |
| `packages/ui/src/typography/text-shimmer/text-shimmer.tsx` | source/config | `06b71340ed888a9e4f2a34513481912094e6fe2d20306c2085d5124336904f45` |
| `packages/ui/src/typography/wordmark/wordmark.stories.tsx` | source/config | `e821b246f11201593e54576651f6cc0fa43d7d1365475f2eb9b156b67616e2c7` |
| `packages/ui/src/typography/wordmark/wordmark.tsx` | source/config | `4f59a103bf101e111bff8f7a2b77c2371fdd0b87f2be52ba21a02c6a5c8063c2` |
| `packages/ui/sst-env.d.ts` | source/config | `969c8a9762cdfe863f1a6a802e9f55b021486806909311013ec0357950790fbe` |
| `packages/ui/test/solid-jsx.ts` | test/fixture | `fa66b56f2a8fc59a0f1da409ee578c5772e9c906cb4f17fad7ba6996f5dd64f5` |
| `packages/ui/tsconfig.build.json` | source/config | `735e48a81e7466b6a15de4496272373080c81fae502d525b3c2344d9ed51f550` |
| `packages/ui/tsconfig.json` | source/config | `e926d6508691bf23c23643c0de4fe91fa7a708f7bb3e8db38ee83923b35e9d88` |
| `packages/ui/vite.config.ts` | source/config | `e7df088731e6ea738172be736a408a900c167df7f74ceee8a0f3980c08d057d2` |
| `packages/util/package.json` | source/config | `8add0a3db6f24823e27d6fffed7f5dfa192b884a94c996bf269112676972cabd` |
| `packages/util/script/build.ts` | source/config | `31725fcaf81ff923b7d3175c82fa1a8d46fa2a3342275fbc15b300f5247b05d6` |
| `packages/util/script/pack.ts` | source/config | `c19afa9fd85f771c1ed58ee53804806f81177c7e68ebd7695c91a825378afdee` |
| `packages/util/src/abort.test.ts` | source/config | `956014325131f26be36f88ce16d0680ebe5375e97430195c216a2abc7ffa7278` |
| `packages/util/src/abort.ts` | source/config | `321cad827b580784e194281cfc966d00a1fcfab14178427d541093c5cd3d733f` |
| `packages/util/src/activity-calendar.test.ts` | source/config | `0724e3f7478cebc3b1ee54200405901e5530d2a5d42a6e3c34da3d82b98b088e` |
| `packages/util/src/activity-calendar.ts` | source/config | `83e171ed27f45a4bfa4b258b4669034aa81fb55bb313d4a3489760ef25f2d98a` |
| `packages/util/src/artifact.test.ts` | source/config | `daf8fa1c2b0dce7fe32c965bbcb17f4cceec683ef36559362281dbf361415c4f` |
| `packages/util/src/artifact.ts` | source/config | `1efa36a81b9beba97ee56f44307f0709ff04b41150706a07b99ed028ce6173ae` |
| `packages/util/src/base64.test.ts` | source/config | `0c07d4cbc07beae4b4d9de25cd47b0a27e282fd2be76b08f0d3cf9ecb342cc34` |
| `packages/util/src/base64.ts` | source/config | `ad77411ea70e60e65709bd44f0340c27abb31df8b48c612157c75f034a01221f` |
| `packages/util/src/binary.test.ts` | source/config | `b17c76a178a779772511e87db2dc8c004ee0aebee05985d52c3e30644664b116` |
| `packages/util/src/binary.ts` | source/config | `22147fe10a9d38c6a4ef93cbabcda89a58575730c3c296beb3d142200c68768c` |
| `packages/util/src/bom.test.ts` | source/config | `245fe6be17658c6c7cab41b4869c516faf5f8e99bec2be044300788f16686bc2` |
| `packages/util/src/bom.ts` | source/config | `4feead32e139cde31c6ff3f703d023fac59e9b30bdc3c8f890a4673488ff8bf1` |
| `packages/util/src/cross-spawn-spawner.ts` | source/config | `ca3450a8d8d99583ef9d542f6d86aeb4f7a9e465bf12165bed3519b0c22e9bdf` |
| `packages/util/src/duration.ts` | source/config | `98b5859155eb0b74a49cc259ae2eb31326f27aa449476e115c6c64741c87147d` |
| `packages/util/src/effect-flock.ts` | source/config | `1145b1924dbc9dba3962a3a13a243605b924f4bd29fc4790dcd1fcc835b2127c` |
| `packages/util/src/effect/app-node-platform.ts` | source/config | `654e2af8caf3de53bc5650068461f51147675a623fe0dec30ec1401ecabfbe23` |
| `packages/util/src/effect/app-node.ts` | source/config | `d7d35d4eb9dfd3754e23d9f81349d5cbb062d1f87c1a73fe959c7982bf0b00de` |
| `packages/util/src/effect/layer-node.ts` | source/config | `f0b614e1b3c61993c2ea7d218882b86e384ac400e42a5640baf9ee1fd6a55e80` |
| `packages/util/src/encode.test.ts` | source/config | `b02029830bb14dad7c9c84c11cd5d5b9449492cac37f434cec7ab025eed7078b` |
| `packages/util/src/encode.ts` | source/config | `bcdc76c95d7b0a25dc8fbe5db6748550035cbacf524f1b48a8843d287e05f0f3` |
| `packages/util/src/flock.ts` | source/config | `088733cb4a99707c56f72f225394e226b3bbad70d532b53c87af985b5d4884ef` |
| `packages/util/src/fs-util.ts` | source/config | `9bdb2cbcd878981f0850450c55ee04d70ef37855d987d690ba49aa1efccc425f` |
| `packages/util/src/glob.ts` | source/config | `cde5a01bf8140613ad42e4dcb575d76598592e25b109415fdca631f5c03a5346` |
| `packages/util/src/global-roots.ts` | source/config | `57a1eb7d5c12472f6b200afb12258d4f3633cc3267e9f3140d149f62a05a0640` |
| `packages/util/src/global-roots.workerd.ts` | source/config | `8baadd6944416e1503b85b7a25d20bdd6d7c2c98c0f73e72e6c5a7b98302e2da` |
| `packages/util/src/global.ts` | source/config | `6b868d706e725e7e0ea6716decde3d775d21e6fcabbdbd36a90c3b827a8246fc` |
| `packages/util/src/hash.ts` | source/config | `4027613280bca0604d7e9c40120586aa3f4f45c5f7a008cc7aa733e323910f6a` |
| `packages/util/src/heap-snapshot.ts` | source/config | `9a0b8f62ea7460cd950289d5dd02cde3e92145473fb2b7c9375fca44969fdeca` |
| `packages/util/src/no-timeout-fetch.test.ts` | source/config | `4bb934f8981494437ae80b4b3dde5f2231fbf33e699b1191e884290d5c441bf2` |
| `packages/util/src/no-timeout-fetch.ts` | source/config | `e38bbf7b473b6b41cf1f212bf2536ca0010db2173f73c180445de5184bc5d7de` |
| `packages/util/src/npm-config.ts` | source/config | `24cbbb4c2266d0e45080bb0afb3ab879e4e4559f849e6518f203fa0b20c49e02` |
| `packages/util/src/npm.ts` | source/config | `05bf39a0aee9693fb00e91c8ef6bb47e4071f6c3275e983956d10ef00b12bac8` |
| `packages/util/src/observability.ts` | source/config | `88898fb54984de5fd3b4d82b8ae1f4808a095db8af4bff2c701adb640c2af9a7` |
| `packages/util/src/observability/logging.ts` | source/config | `5c9d86208eb7add4c109d07ccd343bf2ae30bdc75f6ab0661c44b6f79e741a60` |
| `packages/util/src/observability/otlp.ts` | source/config | `b7ac50e2366e4c12e54c0f45f03f38acf8af2e536a033348cfc5e65b0cb2a86e` |
| `packages/util/src/observability/shared.ts` | source/config | `4ffdc85244b3c58e6d518b0385d99b74b8f309c87b72260cc292658a01fb4498` |
| `packages/util/src/open.test.ts` | source/config | `1fdc11f219f1d4b36c6f855274273d26e29208bbc4bee13f257812c75cdf30d4` |
| `packages/util/src/open.ts` | source/config | `3711c92e91e59bed49380fe7102838d97cdbd3211cf1bca68b54021a46c5a640` |
| `packages/util/src/patch.ts` | source/config | `4546e193a5008226854e9b6bac8f17551c677f789961f90593e585a4e098317e` |
| `packages/util/src/path.test.ts` | source/config | `d83a0ad4a1bb4b7989904f86fd7a6bb95488e22c230f9e89c28fa4b8d98ad3e4` |
| `packages/util/src/path.ts` | source/config | `8dcfe9256e8868d53f78b6a3fd1f4a1c370ed17405afcb8170dc5cbcff5c2739` |
| `packages/util/src/process-signal.test.ts` | source/config | `593b613903504c976eb697b5c33305c0d2c5f44af2cbc00f271bd0c3a13c458c` |
| `packages/util/src/process-signal.ts` | source/config | `775a150ec2fb3b6a7790eaa60bb9bebd485ee9a74dc655aa8ad5d7647ce47cb9` |
| `packages/util/src/process.ts` | source/config | `b06e826d4a3be249f6e047e30322fc6e0649a6ea10110c2674e37bf2f7b0acb9` |
| `packages/util/src/qr.ts` | source/config | `298c061b28a6df3bf9c73c28c4086ddf3d8601f8cac85c217aeee73328ac69bf` |
| `packages/util/src/record.ts` | source/config | `509f5505d91ffa6afcbfd4bd7d69d4236ad29330798498a4ee04904a0a3a8958` |
| `packages/util/src/retry.test.ts` | source/config | `a769b7698902c1082aaaccecbaa76d7a591e870d4596a64290288b05c6b16d0c` |
| `packages/util/src/retry.ts` | source/config | `55841972f60acf16613d08901b04639acbdb1f5a9b722bdf48e64eae74bbb5e0` |
| `packages/util/src/runtime-import.ts` | source/config | `a6e38afa3d68611d6bd43df252f91a80c0569d49fbf8df16219ba3b540a264c4` |
| `packages/util/src/runtime/import.bun.ts` | source/config | `919180e18318ac5871d5af11d763885f466d9044f4ed5133d10d09e070353d06` |
| `packages/util/src/runtime/import.node.ts` | source/config | `28b04cfc4fefeb8166e7bd151b0ebe184c80ce2fbf39ef8a3f2754a6b9a02d33` |
| `packages/util/src/runtime/import.workerd.ts` | source/config | `825054bfb612d179faf64daa4a38d5fb120fbfb6d035829977d828e455e54692` |
| `packages/util/src/session-mention.test.ts` | source/config | `5c4444dfba1fa6ecc086b305870248ba9d58118e680ed61882b67f30517bbaa7` |
| `packages/util/src/session-mention.ts` | source/config | `ee81ece4e5bcf92c2b4d29dcdd2498af6495c89e24ff595a4977271a24efd07c` |
| `packages/util/src/session-title-fallback.ts` | source/config | `217f268027b6396888dd9950ae35c65c9e95bb82b51e0f78414313613ac14d7c` |
| `packages/util/src/session-turn.test.ts` | source/config | `422d3db33212ed9cdc0310d31d04e49babfa0228ec79c611a99f2ba6956b0f8d` |
| `packages/util/src/session-turn.ts` | source/config | `f9007ba952d0364120e25d9e94ed47d03719c84a444cbe908439b6c1c91b65bd` |
| `packages/util/src/teardown.ts` | source/config | `26a2f52e71c9e9d2934039a52041fcb2a069bab7e8db53548f0e3a5117841a04` |
| `packages/util/src/uuid.test.ts` | source/config | `45b3baf5462521c023b60ff0f8d644406dfe949225673d51e1c439570affff5f` |
| `packages/util/src/uuid.ts` | source/config | `4689ca8f1c669e3ef283af5f13b60196f096d59a1481c39fdad566f8645ab45a` |
| `packages/util/test/fixtures/qr.json` | test/fixture | `88f9c18bcf13f55ba71573b595c7ba7100c5f1688f03f4cc06f77ea7d4c36c63` |
| `packages/util/test/global-roots.test.ts` | test/fixture | `40fa41a0da2ea8c44f8dce36e9d2d09eb597486f3d7a5cb1747d5e7fa3339508` |
| `packages/util/test/global.test.ts` | test/fixture | `455608e37ae5dd9bed801cb657d1fa2f4702bbcf99e50856ef36ccf55a86b505` |
| `packages/util/test/observability-otlp.test.ts` | test/fixture | `dc355a7e140ed83cb3346ac87bb0a14290c0c8157de2243ad7749710f36aaa59` |
| `packages/util/test/qr.test.ts` | test/fixture | `3bab12e0debbbe772a35e41aac0024c983d54c57e9e4fd5604b583eab95b5e96` |
| `packages/util/test/session-title-fallback.test.ts` | test/fixture | `30397c785b5c1703a627025f7d0594ac07f3938c581abb623b9a4040b63844d2` |
| `packages/util/tsconfig.build.json` | source/config | `4fa2bf2397f05f79b004311fe125a3273c70f5e94d807b4c8cb751362b8fd613` |
| `packages/util/tsconfig.dist.json` | source/config | `52136506f2e7390d215516723d085c75cdee3de213052127cf469f79e5a4188e` |
| `packages/util/tsconfig.json` | source/config | `95b0097666b91ff689833184d1d4e4bf507909538fe70879a75f08ed5647bdf9` |

## Documentation baseline

Read current Markdown for reference/claim reconciliation; hashes below describe the pre-edit baseline. Historical claims are not current runtime acceptance.

| Document | SHA-256 |
|---|---|
| `docs/AGENTS.md` | `63902a0a3959c9f732efafe22b8eeceb94d9dc8c95050e3b3b9784b82a12a3bf` |
| `docs/architecture/LOW-LEVEL-DESIGN.md` | `0e97cc897fe54cdd58cdbdb053a850114627c35aef972f8b1ad8deb2d8474c11` |
| `docs/architecture/SYSTEM-ARCHITECTURE.md` | `9dc47471db38b65d625a37f8fc23025508b8ee55208be526f9ca12c6d60a294f` |
| `docs/engineering/AUDIT-AND-GAP-ANALYSIS.md` | `b4b9da1fbfc0ecc1f9c42ef5ba95145847cbfa0919ed9c352b42943ae1a10709` |
| `docs/engineering/IMPLEMENTATION-ROADMAP.md` | `14f3c9d2368f6e1ccd1edf90ca54d0e646b464cfcf2787892760715114f78102` |
| `docs/engineering/SIRONA-SPEC-DRIVEN-DOCUMENTATION-PLAN.md` | `db6b21d311eec2e78c006a5f120cbab78215180d5bd41da4899e8163bc08483b` |
| `docs/features/agent-runtime-and-loop/CONTRACTS.md` | `9d366c009cb7a058e9454b405308078693c6f3fbf7c87194603f7d3db5f58738` |
| `docs/features/agent-runtime-and-loop/IMPLEMENTATION-GUIDE.md` | `5b5e094e37a4988314ec9cd1e9a358b40d52940d07c4749e42c80f2c688e896b` |
| `docs/features/agent-runtime-and-loop/SPEC.md` | `248c6a048dec5af34f16e816ea94cbdf2ce674d4aa842ae0809ba995b6043de8` |
| `docs/features/agent-runtime-and-loop/VERIFICATION.md` | `b0190da4d0c4a7f08822391868de29b51dcac90866f708c09da6079795c32bb9` |
| `docs/features/approvals-and-governance/CONTRACTS.md` | `788fbaf021b274d7b0cda1e5149d73782d3360baaad015f81eb52e30b0c388ab` |
| `docs/features/approvals-and-governance/IMPLEMENTATION-GUIDE.md` | `526f13d204270f2135329eac509a64cff882dfd8a8abbd63a55b9d8d05c67c70` |
| `docs/features/approvals-and-governance/SPEC.md` | `68f22da532a46e62cf5f5afcd9090aa369afceabe6e4361a23a89fe520e5ec53` |
| `docs/features/approvals-and-governance/VERIFICATION.md` | `806f3833d4f301c1754faf9520eb0800191e00ab748f130ad5ae74c30496356e` |
| `docs/features/desktop-shell-and-security/CONTRACTS.md` | `40b1dbae6f841c9d7c39439bc690a229021349269b4e2b08b57e7d5ab73e932b` |
| `docs/features/desktop-shell-and-security/IMPLEMENTATION-GUIDE.md` | `39badc0294d39423f5479cf3ac9da7e0682f838046047074b166b9247c5a29c3` |
| `docs/features/desktop-shell-and-security/SPEC.md` | `6e7dc6a08fd8736917099f028315717deacc82f5d3041deede0833f007279475` |
| `docs/features/desktop-shell-and-security/VERIFICATION.md` | `1d2a7fb7540057085f8ac825adb33c0cd34d0498ef04886933707b4753d4dbe8` |
| `docs/features/frontend-canvas-and-ui/CONTRACTS.md` | `3c238f08305ade0765378349034f976d4261ef3eecbc02e3a251dd1cce3e4d20` |
| `docs/features/frontend-canvas-and-ui/IMPLEMENTATION-GUIDE.md` | `effcf1cb4a9ad42864f9cf7e81b6afbf1c41522924f2c8b9c86ef8db0c7ff943` |
| `docs/features/frontend-canvas-and-ui/SPEC.md` | `da5a6117ce7a81b62ec22d24182a738ee88128bcec9feba525b127d039d324fa` |
| `docs/features/frontend-canvas-and-ui/VERIFICATION.md` | `505f674f9954f050c22271fc3e8ae9e475bb6270b59eb636c93b2d1381e184ff` |
| `docs/features/mcp-and-code-intelligence/CONTRACTS.md` | `169f0851fd61abffa3494bd651ea3e402eae2fd98d4faac1a7e6f706faf7b3a4` |
| `docs/features/mcp-and-code-intelligence/IMPLEMENTATION-GUIDE.md` | `cbef468aee67492e0762723e7a27ac0778e4b4c39138765058b35d7dddbf253f` |
| `docs/features/mcp-and-code-intelligence/SPEC.md` | `2708957fe96a57c12a6ebe4333d11731a15305e030822affda433842c4e48b1f` |
| `docs/features/mcp-and-code-intelligence/VERIFICATION.md` | `77f3a08cc38c0eafb4dbbf4c65983b239aa63386ba9b74dd04b0aa57e9ed3ba5` |
| `docs/features/model-providers-and-gateway/CONTRACTS.md` | `a5d0ec535089e696b56ad350cc7b9e9fe4899b1f20ee0686d71363a3357ab06d` |
| `docs/features/model-providers-and-gateway/IMPLEMENTATION-GUIDE.md` | `597925c0324b32364f4a62d4753fd9cea1357ddd9782fc12dc77d74918068cd8` |
| `docs/features/model-providers-and-gateway/SPEC.md` | `c6d4a98926cadc1a06a42e4b909cb00e02e4ac02477343c0b396ed81f0f12b79` |
| `docs/features/model-providers-and-gateway/VERIFICATION.md` | `7f8f22c25d0fffcd3b0c74b57b59e0117dfc26fd81af940f5c3e27e6ce36cb4f` |
| `docs/features/sessions-and-persistence/CONTRACTS.md` | `cae0cb83f819f90a66574a1671de1310e58d443ee1e9a094956d6e3c68a810a8` |
| `docs/features/sessions-and-persistence/IMPLEMENTATION-GUIDE.md` | `0876f0dac15c5e724e9ae74d4f800bf997ec4ea7f074cccb9efe241a81698278` |
| `docs/features/sessions-and-persistence/SPEC.md` | `f96df2df5ab2b9000c53bc35abff32214a5fc8f2d47daac7edc0e3e62061a53b` |
| `docs/features/sessions-and-persistence/VERIFICATION.md` | `1fdb2f2a5944cdcb3bf103645ad949ada90bb41b9adc6bbc8fe6fa138914c7df` |
| `docs/features/tool-execution-and-sandbox/CONTRACTS.md` | `4f72f1126a66e0acbeed6b38da742daf8aeed77dd0b2a6b963e4eada8371d032` |
| `docs/features/tool-execution-and-sandbox/IMPLEMENTATION-GUIDE.md` | `544c298ed35c201c6f8f9db4b65b5fe701bf6c354ceca58ac8a936d7bffbc78d` |
| `docs/features/tool-execution-and-sandbox/SPEC.md` | `fac649b2db8b893002214d2bdc499d865144595b44f369283460958285107889` |
| `docs/features/tool-execution-and-sandbox/VERIFICATION.md` | `4e0fc382e9a921c3df19fa5fa579efe53e848f29706c4c2511014563b8cf71c2` |
| `docs/features/workspace-and-filesystem/CONTRACTS.md` | `2a057265c7918b8c61e092fdde903642f9d3c6150a44dd0db65bdd3379eba357` |
| `docs/features/workspace-and-filesystem/IMPLEMENTATION-GUIDE.md` | `43e65bb034c41ccb2cf441e5310a1d832e363a2c26e097fafb1c83eeccb4d3c3` |
| `docs/features/workspace-and-filesystem/SPEC.md` | `b093b4e25ee8ca16fca227b14745bdffed16fb8dc876e79cfd855e4f27346e45` |
| `docs/features/workspace-and-filesystem/VERIFICATION.md` | `ddbf37d1973fdd36aa35f093d1098064fe2804e4e7eef6b58fd68ddca69d6e19` |
| `docs/frontend-route-coverage.md` | `54f2ab8db054e0d83b162b96789fc6250672686ee49af096f82ed80f0f5e5882` |
| `docs/governance/ACTIVE-STOP-RULES.md` | `cf1a288b51ef52bad2204bb5c595a4cadc3416520f389050c5f61103ace19498` |
| `docs/governance/ARCHITECTURE-DECISION-REGISTRY.md` | `5e153ec77880dcfbcb89416c161082c049eccc7cbfa12d1f4a7dfa5466862a4c` |
| `docs/governance/DOCUMENTATION-AUTHORITY-HIERARCHY.md` | `2ff8d63352f25c9cfe4432f6fa1822c2c0f5c2f1c86f3ed95113040de3cdb80d` |
| `docs/INDEX.md` | `c02d6a8835c8b643dc91ca26dcaafc325fdfde16f40d57e0fdea3ad6245e4c64` |
| `docs/README.md` | `07db133c50f8d4a064484b9e7575acfcc269302976a68bb4a06b14a6d10c093d` |
| `docs/reference/API-ROUTE-SURFACE.md` | `c7d11e93e72012f401550b0827c1be5817047ab71cf33d105e88113dc439032a` |
| `docs/reference/DATABASE-SCHEMA-CATALOG.md` | `ca622b7166934d4be40e1c0bc93f8310f20d31c12f268bf8b66e9cfec5b17af5` |
| `docs/reference/examples/FEATURE-EXAMPLE-VERIFICATION-SUMMARY.md` | `8f315f1d6b6d19e746565471d0f411890ba198b42dce9cc549b1b6ba1965b3e9` |
| `docs/reference/providers/gemini.md` | `ca5e5590ef2796444d9900502253f7f3fe1286de4137e8fe48e8de642e701dfd` |
| `docs/reference/providers/openai-compatible.md` | `fefc5dd78406427496edc6a9fb1d294177280526900e986d9143b0b54c0c5091` |
| `docs/reference/providers/openai.md` | `9dfaeeebd2e9584ea68bdd8524095eca23222096015c1794180f6932c892d489` |
| `docs/reference/providers/routing.md` | `f58a3771dd5b51a63c48d9aa8b1a8076f6ac7fd4a5083517775074eaec8ab37d` |
