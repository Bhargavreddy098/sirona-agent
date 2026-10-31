-- =====================================================================
-- Sirona Relational Schema Migration (PostgreSQL)
-- Migration 018: Runtime Recovery Execution & Project Intelligence
-- =====================================================================

-- 1. Projects metadata for repository ingestion
ALTER TABLE projects 
  ADD COLUMN IF NOT EXISTS git_info JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS index_state VARCHAR(50) DEFAULT 'unindexed',
  ADD COLUMN IF NOT EXISTS last_scanned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS detected_framework VARCHAR(100),
  ADD COLUMN IF NOT EXISTS detected_test_runner VARCHAR(100),
  ADD COLUMN IF NOT EXISTS structure_summary JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_projects_index_state ON projects(index_state);

-- 2. Runs execution summary and waiting state
ALTER TABLE runs
  ADD COLUMN IF NOT EXISTS waiting_state JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS execution_summary JSONB DEFAULT '{}'::jsonb;

-- 3. Tasks diff and patches
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS diff TEXT;
