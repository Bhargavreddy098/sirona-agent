-- =====================================================================
-- Sirona Relational Schema Migration (PostgreSQL)
-- Migration 005: Governance, Leases, Policies, Approvals, Budgets & Audit
-- =====================================================================

-- 1. Policy Revisions Table
CREATE TABLE IF NOT EXISTS policy_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    revision INT NOT NULL,
    digest VARCHAR(64) NOT NULL,
    rules JSONB NOT NULL DEFAULT '{}'::jsonb,
    active BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_policy_revisions_active ON policy_revisions(active, revision DESC);

-- 2. Capability Grants Table
CREATE TABLE IF NOT EXISTS capability_grants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    capability VARCHAR(100) NOT NULL,
    resource_scope JSONB NOT NULL DEFAULT '{}'::jsonb,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_capability_grants_project ON capability_grants(project_id, capability, expires_at);

-- 3. Upgrade Approvals Table for Canonical Governance
ALTER TABLE approvals ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE approvals ADD COLUMN IF NOT EXISTS kind VARCHAR(50) NOT NULL DEFAULT 'contract';
ALTER TABLE approvals ADD COLUMN IF NOT EXISTS contract_revision_id UUID;
ALTER TABLE approvals ADD COLUMN IF NOT EXISTS effect_id UUID;
ALTER TABLE approvals ADD COLUMN IF NOT EXISTS input_digest VARCHAR(64) DEFAULT '';
ALTER TABLE approvals ADD COLUMN IF NOT EXISTS policy_revision_id UUID REFERENCES policy_revisions(id) ON DELETE SET NULL;
ALTER TABLE approvals ADD COLUMN IF NOT EXISTS approver_principal_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE approvals ADD COLUMN IF NOT EXISTS state VARCHAR(50) NOT NULL DEFAULT 'pending';
ALTER TABLE approvals ADD COLUMN IF NOT EXISTS nonce_hash VARCHAR(64) DEFAULT '';
ALTER TABLE approvals ADD COLUMN IF NOT EXISTS scope_summary TEXT;
ALTER TABLE approvals ADD COLUMN IF NOT EXISTS cost_ceiling_micro_usd BIGINT NOT NULL DEFAULT 0;
ALTER TABLE approvals ADD COLUMN IF NOT EXISTS consequences TEXT;
ALTER TABLE approvals ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours');
ALTER TABLE approvals ADD COLUMN IF NOT EXISTS decided_at TIMESTAMPTZ;
ALTER TABLE approvals ADD COLUMN IF NOT EXISTS consumed_at TIMESTAMPTZ;

-- Drop legacy NOT NULL constraints on legacy columns if present
ALTER TABLE approvals ALTER COLUMN run_id DROP NOT NULL;
ALTER TABLE approvals ALTER COLUMN prompt_id DROP NOT NULL;
ALTER TABLE approvals ALTER COLUMN tool_name DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_approvals_state ON approvals(project_id, state, expires_at);
CREATE INDEX IF NOT EXISTS idx_approvals_digest ON approvals(input_digest);

-- 4. Budget Accounts Table
CREATE TABLE IF NOT EXISTS budget_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scope_kind VARCHAR(50) NOT NULL,
    scope_id UUID NOT NULL,
    limit_micro_usd BIGINT NOT NULL DEFAULT 10000000,
    spent_micro_usd BIGINT NOT NULL DEFAULT 0,
    reserved_micro_usd BIGINT NOT NULL DEFAULT 0,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unq_budget_scope UNIQUE (scope_kind, scope_id)
);

-- 5. Budget Reservations Table
CREATE TABLE IF NOT EXISTS budget_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_account_id UUID NOT NULL REFERENCES budget_accounts(id) ON DELETE CASCADE,
    operation_key VARCHAR(100) NOT NULL,
    ceiling_micro_usd BIGINT NOT NULL,
    state VARCHAR(50) NOT NULL DEFAULT 'held',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unq_account_op UNIQUE (budget_account_id, operation_key)
);

CREATE INDEX IF NOT EXISTS idx_budget_reservations_state ON budget_reservations(budget_account_id, state);

-- 6. Append-Only Hash-Chained Audit Events Table
CREATE TABLE IF NOT EXISTS audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sequence BIGSERIAL NOT NULL UNIQUE,
    actor_id UUID,
    action VARCHAR(100) NOT NULL,
    target_ref VARCHAR(255) NOT NULL,
    trace_id VARCHAR(64) NOT NULL,
    safe_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    previous_digest VARCHAR(64) NOT NULL DEFAULT '0000000000000000000000000000000000000000000000000000000000000000',
    digest VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_events_seq ON audit_events(sequence DESC);

-- 7. Upgrade Session Turn Leases Table
ALTER TABLE session_turn_leases ADD COLUMN IF NOT EXISTS lease_token VARCHAR(64);
ALTER TABLE session_turn_leases ADD COLUMN IF NOT EXISTS released_at TIMESTAMPTZ;
ALTER TABLE session_turn_leases ADD COLUMN IF NOT EXISTS owner_id VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_session_turn_leases_token ON session_turn_leases(lease_token);
