-- 010_windows_isolation_qualification.sql
-- Stage 10: Windows Native Isolation & Sandbox Qualification

CREATE TABLE IF NOT EXISTS isolation_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(64) NOT NULL UNIQUE,
    backend_type VARCHAR(32) NOT NULL,
    version VARCHAR(32) NOT NULL DEFAULT 'v1',
    memory_limit_mb INT NOT NULL DEFAULT 4096,
    cpu_limit_pct INT NOT NULL DEFAULT 80,
    wall_clock_timeout_ms INT NOT NULL DEFAULT 300000,
    max_output_bytes INT NOT NULL DEFAULT 10485760,
    network_egress_policy VARCHAR(32) NOT NULL DEFAULT 'deny_all',
    allowed_domains JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS isolation_workers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES isolation_profiles(id) ON DELETE CASCADE,
    workspace_root_ref VARCHAR(512) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'provisioning',
    process_tree_pid INT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    terminated_at TIMESTAMPTZ,
    termination_reason VARCHAR(128),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_isolation_workers_profile_id ON isolation_workers(profile_id);
CREATE INDEX IF NOT EXISTS idx_isolation_workers_status ON isolation_workers(status);

CREATE TABLE IF NOT EXISTS isolation_qualifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    suite_version VARCHAR(32) NOT NULL DEFAULT 'v1',
    runner_version VARCHAR(32) NOT NULL DEFAULT '1.0.0',
    environment VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL,
    prerequisites JSONB NOT NULL DEFAULT '{}'::jsonb,
    adversarial_results JSONB NOT NULL DEFAULT '[]'::jsonb,
    evidence_artifact_id UUID REFERENCES artifacts(id),
    digest CHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_isolation_qualifications_created_at ON isolation_qualifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_isolation_qualifications_status ON isolation_qualifications(status);

-- Seed baseline profiles
INSERT INTO isolation_profiles (name, backend_type, version, memory_limit_mb, cpu_limit_pct, wall_clock_timeout_ms, max_output_bytes, network_egress_policy, allowed_domains)
VALUES 
    ('windows_sandbox_default', 'windows_sandbox', 'v1', 4096, 80, 300000, 10485760, 'deny_all', '[]'::jsonb),
    ('hardened_local_boundary', 'process_boundary', 'v1', 2048, 50, 60000, 5242880, 'deny_all', '[]'::jsonb)
ON CONFLICT (name) DO NOTHING;
