-- 016_browser_qa_deployment_adapter.sql
-- Stage 16: Browser QA Sessions and One Deployment Adapter (Ops Schema)

CREATE SCHEMA IF NOT EXISTS ops;

-- 1. Deployment Previews
CREATE TABLE IF NOT EXISTS ops.deployment_previews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    artifact_id UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
    target_ref TEXT NOT NULL,
    migration_plan_ref TEXT,
    target_summary JSONB NOT NULL DEFAULT '{}',
    changes JSONB NOT NULL DEFAULT '[]',
    cost_estimate_micro_usd BIGINT NOT NULL DEFAULT 0,
    input_digest TEXT NOT NULL,
    rollback_eligibility BOOLEAN NOT NULL DEFAULT TRUE,
    required_approval BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deployment_previews_run_id 
    ON ops.deployment_previews(run_id);

CREATE INDEX IF NOT EXISTS idx_deployment_previews_expires 
    ON ops.deployment_previews(expires_at);

-- 2. Deployments
CREATE TABLE IF NOT EXISTS ops.deployments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    artifact_id UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
    preview_id UUID REFERENCES ops.deployment_previews(id) ON DELETE SET NULL,
    target_ref TEXT NOT NULL,
    target_summary JSONB NOT NULL DEFAULT '{}',
    approval_id UUID REFERENCES approvals(id) ON DELETE SET NULL,
    state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'deploying', 'active', 'failed', 'rolled_back')),
    external_release_id TEXT,
    health_report_id UUID,
    rollback_ref UUID REFERENCES ops.deployments(id) ON DELETE SET NULL,
    input_digest TEXT NOT NULL,
    health_status TEXT NOT NULL DEFAULT 'unknown' CHECK (health_status IN ('healthy', 'degraded', 'failed', 'unknown')),
    health_evidence JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deployments_run_id 
    ON ops.deployments(run_id);

CREATE INDEX IF NOT EXISTS idx_deployments_state 
    ON ops.deployments(state);

-- 3. Browser QA Sessions
CREATE TABLE IF NOT EXISTS ops.browser_qa_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    target_url TEXT NOT NULL,
    guest_profile_id TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'active' CHECK (state IN ('active', 'completed', 'failed', 'terminated')),
    evidence_artifact_ids UUID[] DEFAULT '{}',
    console_logs JSONB DEFAULT '[]',
    network_events JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_browser_qa_sessions_run_id 
    ON ops.browser_qa_sessions(run_id);

CREATE INDEX IF NOT EXISTS idx_browser_qa_sessions_project_id 
    ON ops.browser_qa_sessions(project_id);
