-- Migration 024: Conversation-scoped runs, artifacts, grants and retirement of mandatory workflow tables
-- Existing migration runner owns BEGIN/COMMIT.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

-- 1. Conversation-scoped Runs (no mandatory project, goal, or contract)
ALTER TABLE runs ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES sessions(id) ON DELETE CASCADE;
ALTER TABLE runs ALTER COLUMN project_id DROP NOT NULL;
CREATE INDEX IF NOT EXISTS idx_runs_session ON runs(session_id, created_at DESC);

-- Backfill session_id for historical runs linked to goals with a conversation
UPDATE runs r
SET session_id = g.conversation_id
FROM goals g
WHERE r.goal_id = g.id AND r.session_id IS NULL AND g.conversation_id IS NOT NULL;

-- 2. Conversation-scoped Artifacts & Grants
ALTER TABLE artifacts ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES sessions(id) ON DELETE CASCADE;
ALTER TABLE artifacts ALTER COLUMN project_id DROP NOT NULL;
CREATE INDEX IF NOT EXISTS idx_artifacts_session ON artifacts(session_id, created_at DESC);

ALTER TABLE capability_grants ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES sessions(id) ON DELETE CASCADE;
ALTER TABLE capability_grants ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE capability_grants ALTER COLUMN project_id DROP NOT NULL;
CREATE INDEX IF NOT EXISTS idx_capability_grants_session ON capability_grants(session_id);

-- 3. Action-level Approvals without Contract coupling
ALTER TABLE approvals ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES sessions(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_approvals_session ON approvals(session_id);

-- 4. Disconnect obsolete workflow foreign key locks to preserve historical runs
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'runs_goal_id_fkey') THEN
    ALTER TABLE runs DROP CONSTRAINT runs_goal_id_fkey;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'runs_contract_revision_id_fkey') THEN
    ALTER TABLE runs DROP CONSTRAINT runs_contract_revision_id_fkey;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'runs_plan_revision_id_fkey') THEN
    ALTER TABLE runs DROP CONSTRAINT runs_plan_revision_id_fkey;
  END IF;
END $$;
