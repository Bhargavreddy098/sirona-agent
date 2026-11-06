# Sirona Database Schema Catalog (Migrations 001–024)

This catalog describes all canonical tables defined across the SQL migration series in [`apps/server/migrations/`](file:///apps/server/migrations/).

---

## 1. Migration Series Overview

| Migration File | Primary Domain | Tables Introduced / Modified |
|---|---|---|
| `001_initial_schema.sql` | Baseline | `users`, `projects`, `workspaces` |
| `002_vector_extension.sql` | Vector Search | pgvector extension & embeddings table |
| `003_identity_sessions.sql` | Identity & Auth | `sessions`, `identity_tokens` |
| `004_project_content_artifacts.sql` | Project Files | `project_files`, `artifacts` |
| `005_governance_leases_approvals.sql` | Governance | `turn_leases`, `approvals`, `audit_events` |
| `006_provider_models_inference.sql` | Models | `provider_connections`, `model_catalog` |
| `007_durable_execution_tasks_effects.sql` | Execution | `runs`, `tasks`, `effects` |
| `008_intent_research_requirements.sql` | Intent | `intent_requirements`, `research_notes` |
| `009_planning_contracts.sql` | Planning | `plans`, `milestones` |
| `010_windows_isolation_qualification.sql` | Isolation | `container_workers`, `wsl_profiles` |
| `011_tool_runtime_coding_backend.sql` | Tools | `tool_execution_logs`, `tool_quotas` |
| `012_verification_engine.sql` | Testing | `verification_runs`, `test_results` |
| `013_killer_workflow_bounded_repair.sql` | Repair | `repair_checkpoints`, `diff_snapshots` |
| `014_memory_project_intelligence.sql` | Memory | `project_memories`, `ast_symbols` |
| `015_schedules_signed_events.sql` | Events | `schedules`, `signed_event_log` |
| `016_browser_qa_deployment_adapter.sql` | Browser QA | `browser_qa_sessions`, `deployments` |
| `017_windows_v1_release_recovery.sql` | Recovery | `release_recovery_logs`, `crash_dumps` |
| `018_runtime_recovery_execution.sql` | Recovery | `orphan_lease_cleanups` |
| `019_conversation_turn_states.sql` | Turns | `turn_states`, `turn_events` |
| `020_model_connection_link.sql` | Providers | `model_connection_bindings` |
| `021_standalone_conversations.sql` | Conversations | `conversations`, `messages` |
| `022_execution_reliability.sql` | Reliability | `turn_lease_heartbeats` |
| `023_provider_credential_references.sql` | Credentials | `provider_credentials` (DPAPI references) |
| `024_conversation_runs_and_retire_obsolete_workflows.sql` | Modernization | Schema cleanup and obsolete workflow retirement |

---

## 2. Cross-Driver Compatibility Conventions
- Foreign keys use `ON DELETE CASCADE` where parent deletion must purge child logs.
- Timestamps use `TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`.
- All JSON columns use `JSONB` in PostgreSQL and `TEXT` in SQLite.
- All primary keys use `VARCHAR(64)` storing alphanumeric nanoids or UUIDs.
