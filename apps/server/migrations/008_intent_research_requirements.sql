-- =====================================================================
-- Sirona Relational Schema Migration (PostgreSQL)
-- Migration 008: Intent, Research, Requirements & Decisions
-- =====================================================================

-- 1. Goals Table
CREATE TABLE IF NOT EXISTS goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    intent TEXT NOT NULL,
    constraints JSONB NOT NULL DEFAULT '[]'::jsonb,
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, analyzing, clarifying, ready_for_planning, archived
    autonomy_mode VARCHAR(50) NOT NULL DEFAULT 'supervised', -- readonly, supervised, guarded, autonomous
    active_requirement_revision_id UUID,
    active_contract_revision_id UUID,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_goals_project ON goals(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_goals_conversation ON goals(conversation_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);

-- 2. Intent Analyses Table
CREATE TABLE IF NOT EXISTS intent_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    literal_request TEXT NOT NULL,
    desired_outcome TEXT NOT NULL,
    constraints JSONB NOT NULL DEFAULT '[]'::jsonb,
    assumptions JSONB NOT NULL DEFAULT '[]'::jsonb,
    unknowns JSONB NOT NULL DEFAULT '[]'::jsonb,
    acceptance_candidates JSONB NOT NULL DEFAULT '[]'::jsonb,
    source_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intent_analyses_goal ON intent_analyses(goal_id, created_at DESC);

-- 3. Clarifications Table
CREATE TABLE IF NOT EXISTS clarifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    materiality VARCHAR(20) NOT NULL DEFAULT 'material', -- material, minor, critical
    options JSONB NOT NULL DEFAULT '[]'::jsonb,
    answer TEXT,
    selected_option_id VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, answered, dismissed
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clarifications_goal ON clarifications(goal_id, status);

-- 4. Research Reports Table
CREATE TABLE IF NOT EXISTS research_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    conclusions JSONB NOT NULL DEFAULT '[]'::jsonb,
    source_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
    artifact_id UUID REFERENCES artifacts(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_research_reports_goal ON research_reports(goal_id, created_at DESC);

-- 5. Requirement Revisions Table
CREATE TABLE IF NOT EXISTS requirement_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    revision INT NOT NULL DEFAULT 1,
    digest VARCHAR(64) NOT NULL,
    requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
    assumptions JSONB NOT NULL DEFAULT '[]'::jsonb,
    exclusions JSONB NOT NULL DEFAULT '[]'::jsonb,
    source_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(goal_id, revision)
);

CREATE INDEX IF NOT EXISTS idx_requirement_revisions_goal ON requirement_revisions(goal_id, revision DESC);

-- 6. Decisions Table
CREATE TABLE IF NOT EXISTS decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'accepted', -- accepted, challenged, rejected, alternative, requires_user_decision
    proposal TEXT NOT NULL,
    alternatives JSONB NOT NULL DEFAULT '[]'::jsonb,
    rationale TEXT NOT NULL,
    source_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_decisions_goal ON decisions(goal_id, created_at DESC);
