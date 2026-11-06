-- =====================================================================
-- Sirona Relational Schema Migration (PostgreSQL)
-- Migration 007: Durable Execution, Runs, Tasks, Effects & Checkpoints
-- =====================================================================

-- 0. Control Schema & Security-Definer Session Validator
CREATE SCHEMA IF NOT EXISTS control;

CREATE OR REPLACE FUNCTION control.session_valid(session_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth_sessions
    WHERE id = session_uuid
      AND revoked_at IS NULL
      AND expires_at > NOW()
  );
$$;

-- 1. Runs Table (Durable Execution Lifecycle)
CREATE TABLE IF NOT EXISTS runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    goal_id UUID,
    contract_revision_id UUID,
    plan_revision_id UUID,
    repository_snapshot_id UUID REFERENCES repository_snapshots(id) ON DELETE SET NULL,
    state VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, running, paused, cancelling, completed, failed, cancelled, blocked
    autonomy_mode VARCHAR(50) NOT NULL DEFAULT 'supervised', -- readonly, supervised, guarded, autonomous
    epoch BIGINT NOT NULL DEFAULT 1,
    progress_completed_tasks INT NOT NULL DEFAULT 0,
    progress_total_tasks INT NOT NULL DEFAULT 0,
    budget_limit_micro_usd BIGINT NOT NULL DEFAULT 0,
    budget_reserved_micro_usd BIGINT NOT NULL DEFAULT 0,
    budget_spent_micro_usd BIGINT NOT NULL DEFAULT 0,
    verification_report_id UUID,
    blockers JSONB NOT NULL DEFAULT '[]'::jsonb,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_runs_project ON runs(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_runs_state ON runs(state);

-- 2. Tasks Table (Bounded DAG Unit of Work)
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    step_key VARCHAR(100) NOT NULL,
    state VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, queued, running, verifying, completed, failed, cancelled, blocked
    attempt INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 3,
    deadline_at TIMESTAMPTZ,
    lease_epoch BIGINT NOT NULL DEFAULT 1,
    lease_holder VARCHAR(100),
    lease_expires_at TIMESTAMPTZ,
    dependencies JSONB NOT NULL DEFAULT '[]'::jsonb,
    artifact_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    result JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(run_id, step_key)
);

CREATE INDEX IF NOT EXISTS idx_tasks_run ON tasks(run_id, step_key);
CREATE INDEX IF NOT EXISTS idx_tasks_claim ON tasks(run_id, state);

-- 3. Agent Sessions Table (Scoped Worker Context Identities)
CREATE TABLE IF NOT EXISTS agent_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    role VARCHAR(50) NOT NULL,
    state VARCHAR(50) NOT NULL DEFAULT 'active', -- active, idle, terminated
    capabilities JSONB NOT NULL DEFAULT '[]'::jsonb,
    deadline_at TIMESTAMPTZ,
    usage_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_sessions_run ON agent_sessions(run_id);

-- 4. Effects Table (Permanent Effect Identity & Dispatch Lifecycle)
CREATE TABLE IF NOT EXISTS effects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    tool_id VARCHAR(100) NOT NULL,
    input_digest VARCHAR(64) NOT NULL,
    target_summary TEXT NOT NULL,
    risk VARCHAR(20) NOT NULL DEFAULT 'low', -- low, medium, high, critical
    state VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, dispatched, completed, blocked, failed, unknown
    approval_id UUID REFERENCES approvals(id) ON DELETE SET NULL,
    receipt_ref UUID REFERENCES artifacts(id) ON DELETE SET NULL,
    external_operation_id VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_effects_run ON effects(run_id);
CREATE INDEX IF NOT EXISTS idx_effects_task ON effects(task_id);

-- 5. Run Checkpoints Table (Immutable State Snapshots)
CREATE TABLE IF NOT EXISTS run_checkpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    sequence BIGINT NOT NULL,
    epoch BIGINT NOT NULL,
    state_digest VARCHAR(64) NOT NULL,
    state_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_run_checkpoints_run ON run_checkpoints(run_id, sequence);

-- 6. Run Events Table (Ordered Durable Event Log for SSE)
CREATE TABLE IF NOT EXISTS run_events (
    id BIGSERIAL PRIMARY KEY,
    run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    sequence BIGINT NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(run_id, sequence)
);

CREATE INDEX IF NOT EXISTS idx_run_events_run_seq ON run_events(run_id, sequence ASC);

-- 7. Reconciliation Operations Table (Safe Blocked Recovery)
CREATE TABLE IF NOT EXISTS reconciliation_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    effect_id UUID NOT NULL REFERENCES effects(id) ON DELETE CASCADE,
    state VARCHAR(50) NOT NULL DEFAULT 'blocked', -- blocked, reconciled, rejected
    reason TEXT,
    external_receipt_ref UUID REFERENCES artifacts(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reconciliation_effect ON reconciliation_operations(effect_id);
