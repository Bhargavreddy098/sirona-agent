-- =====================================================================
-- Sirona Relational Schema Migration (PostgreSQL)
-- Migration 013: Killer Workflow & Bounded Repair (MVP Gate)
-- Adds incident failures provenance, deduplication fingerprints,
-- structured repair hypotheses, and workflow run repair tracking.
-- =====================================================================

CREATE SCHEMA IF NOT EXISTS control;

-- 1. Control Failures Table (Incident Provenance & Deduplication)
CREATE TABLE IF NOT EXISTS control.failures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    class VARCHAR(100) NOT NULL, -- VERIFICATION_CRITERION_FAILED, TOOL_EXECUTION_ERROR, TIMEOUT, TEST_FAILURE
    fingerprint VARCHAR(64) NOT NULL, -- SHA-256 hash of normalized error/trace for deduplication
    safe_detail JSONB NOT NULL DEFAULT '{}'::jsonb,
    hypothesis_ref UUID,
    repair_attempt INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_failures_run_fingerprint ON control.failures(run_id, fingerprint);
CREATE INDEX IF NOT EXISTS idx_failures_run_created ON control.failures(run_id, created_at DESC);

-- 2. Control Repair Hypotheses Table (Bounded Repair Strategies)
CREATE TABLE IF NOT EXISTS control.repair_hypotheses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    failure_id UUID REFERENCES control.failures(id) ON DELETE SET NULL,
    attempt INT NOT NULL DEFAULT 1,
    max_attempts INT NOT NULL DEFAULT 3,
    strategy VARCHAR(50) NOT NULL DEFAULT 'targeted_patch', -- targeted_patch, rollback, dependency_fix
    diagnosis TEXT NOT NULL,
    proposed_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, applied, exhausted, superseded, abandoned
    applied_patch_digest VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_repair_hypotheses_run ON control.repair_hypotheses(run_id, attempt);

-- 3. Extend Runs Table for Bounded Repair Tracking
ALTER TABLE runs
    ADD COLUMN IF NOT EXISTS repair_attempts INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS max_repair_attempts INT NOT NULL DEFAULT 3,
    ADD COLUMN IF NOT EXISTS final_report_id UUID REFERENCES verification_reports(id) ON DELETE SET NULL;
