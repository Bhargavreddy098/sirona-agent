-- =====================================================================
-- Sirona Relational Schema Migration (PostgreSQL)
-- Migration 009: Layered Plans & Immutable Build Contracts
-- =====================================================================

-- 1. Extend Goals Table with Active Plan Revision Pointer
ALTER TABLE goals ADD COLUMN IF NOT EXISTS active_plan_revision_id UUID;

-- 2. Plans Table
CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    active_plan_revision_id UUID,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plans_goal ON plans(goal_id);

-- 3. Plan Revisions Table
CREATE TABLE IF NOT EXISTS plan_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    revision INT NOT NULL DEFAULT 1,
    requirement_revision_id UUID NOT NULL REFERENCES requirement_revisions(id) ON DELETE RESTRICT,
    digest VARCHAR(64) NOT NULL,
    layers JSONB NOT NULL DEFAULT '{}'::jsonb,
    steps JSONB NOT NULL DEFAULT '[]'::jsonb,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(plan_id, revision)
);

CREATE INDEX IF NOT EXISTS idx_plan_revisions_plan ON plan_revisions(plan_id, revision DESC);
CREATE INDEX IF NOT EXISTS idx_plan_revisions_goal ON plan_revisions(goal_id, revision DESC);
CREATE INDEX IF NOT EXISTS idx_plan_revisions_req ON plan_revisions(requirement_revision_id);

-- 4. Contracts Table
CREATE TABLE IF NOT EXISTS contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    active_contract_revision_id UUID,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contracts_goal ON contracts(goal_id);

-- 5. Contract Revisions Table
CREATE TABLE IF NOT EXISTS contract_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    revision INT NOT NULL DEFAULT 1,
    plan_revision_id UUID NOT NULL REFERENCES plan_revisions(id) ON DELETE RESTRICT,
    requirement_revision_id UUID NOT NULL REFERENCES requirement_revisions(id) ON DELETE RESTRICT,
    digest VARCHAR(64) NOT NULL,
    schema_version INT NOT NULL DEFAULT 1,
    canonicalizer_version VARCHAR(20) NOT NULL DEFAULT 'v1',
    document JSONB NOT NULL,
    supersedes_id UUID REFERENCES contract_revisions(id) ON DELETE SET NULL,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(contract_id, revision)
);

CREATE INDEX IF NOT EXISTS idx_contract_revisions_contract ON contract_revisions(contract_id, revision DESC);
CREATE INDEX IF NOT EXISTS idx_contract_revisions_goal ON contract_revisions(goal_id, revision DESC);
CREATE INDEX IF NOT EXISTS idx_contract_revisions_plan ON contract_revisions(plan_revision_id);
CREATE INDEX IF NOT EXISTS idx_contract_revisions_req ON contract_revisions(requirement_revision_id);
