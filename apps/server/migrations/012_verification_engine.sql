-- 012_verification_engine.sql
-- Stage 12: Independent Verification Engine

-- 1. Verification Jobs Table
CREATE TABLE IF NOT EXISTS verification_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    contract_revision_id UUID NOT NULL REFERENCES contract_revisions(id) ON DELETE CASCADE,
    artifact_id UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
    suite_revision VARCHAR(100) NOT NULL DEFAULT 'v1',
    state VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'running', 'completed', 'failed')),
    verifier_identity VARCHAR(100) NOT NULL DEFAULT 'verifier-engine-v1',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_jobs_run_artifact ON verification_jobs(run_id, artifact_id);

-- 2. Verification Results Table (per-criterion immutable findings)
CREATE TABLE IF NOT EXISTS verification_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES verification_jobs(id) ON DELETE CASCADE,
    criterion_id VARCHAR(100) NOT NULL,
    required BOOLEAN NOT NULL DEFAULT true,
    outcome VARCHAR(20) NOT NULL CHECK (outcome IN ('pass', 'fail', 'unknown')),
    evidence_artifact_id UUID REFERENCES artifacts(id) ON DELETE SET NULL,
    environment_digest VARCHAR(64) NOT NULL,
    reason TEXT,
    checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_verification_job_criterion UNIQUE (job_id, criterion_id)
);

CREATE INDEX IF NOT EXISTS idx_verification_results_job ON verification_results(job_id);

-- 3. Verification Reports Table (authoritative verification decision projection)
CREATE TABLE IF NOT EXISTS verification_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    artifact_id UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
    artifact_digest VARCHAR(64) NOT NULL,
    contract_revision_id UUID NOT NULL REFERENCES contract_revisions(id) ON DELETE CASCADE,
    outcome VARCHAR(20) NOT NULL CHECK (outcome IN ('pass', 'fail', 'unknown')),
    required_count INT NOT NULL DEFAULT 0,
    passed_count INT NOT NULL DEFAULT 0,
    failed_count INT NOT NULL DEFAULT 0,
    unknown_count INT NOT NULL DEFAULT 0,
    suite_revision VARCHAR(100) NOT NULL DEFAULT 'v1',
    verifier_identity VARCHAR(100) NOT NULL DEFAULT 'verifier-engine-v1',
    environment_digest VARCHAR(64) NOT NULL,
    report_artifact_id UUID REFERENCES artifacts(id) ON DELETE SET NULL,
    criteria JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_reports_run ON verification_reports(run_id);
CREATE INDEX IF NOT EXISTS idx_verification_reports_artifact ON verification_reports(artifact_id);

-- 4. Verification Evaluations Table (rubric tracking & offline improvements)
CREATE TABLE IF NOT EXISTS verification_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    suite_revision VARCHAR(100) NOT NULL,
    candidate_revision VARCHAR(100) NOT NULL,
    baseline_revision VARCHAR(100) NOT NULL,
    metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
    evidence_ref TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Link verification_report_id into runs table
ALTER TABLE runs ADD COLUMN IF NOT EXISTS verification_report_id UUID REFERENCES verification_reports(id) ON DELETE SET NULL;
