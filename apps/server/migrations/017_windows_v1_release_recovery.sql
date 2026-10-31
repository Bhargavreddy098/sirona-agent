-- Migration 017: Windows V1 Release & Recovery Qualification
-- Schema for release manifests, disaster recovery checkpoints, restore rehearsals, operational quotas, and retention jobs

CREATE SCHEMA IF NOT EXISTS system;

-- 1. System Release Manifests
CREATE TABLE IF NOT EXISTS system.release_manifests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version VARCHAR(50) NOT NULL,
    build_number VARCHAR(50) NOT NULL,
    channel VARCHAR(20) NOT NULL DEFAULT 'stable' CHECK (channel IN ('stable', 'beta', 'nightly')),
    target_arch VARCHAR(20) NOT NULL DEFAULT 'x64' CHECK (target_arch IN ('x64', 'arm64')),
    release_digest VARCHAR(64) NOT NULL,
    release_notes TEXT,
    provenance JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'recalled')),
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_release_manifests_version ON system.release_manifests(version, channel);

-- 2. Disaster Recovery Checkpoints (Backups)
CREATE TABLE IF NOT EXISTS system.recovery_checkpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checkpoint_kind VARCHAR(50) NOT NULL CHECK (checkpoint_kind IN ('full_backup', 'wal_snapshot', 'state_snapshot')),
    storage_ref TEXT NOT NULL,
    checksum VARCHAR(64) NOT NULL,
    size_bytes BIGINT NOT NULL DEFAULT 0,
    verified BOOLEAN NOT NULL DEFAULT true,
    retention_expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recovery_checkpoints_created ON system.recovery_checkpoints(created_at DESC);

-- 3. Recovery Rehearsals (Disaster Recovery Simulation & Verification)
CREATE TABLE IF NOT EXISTS system.recovery_rehearsals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checkpoint_id UUID NOT NULL REFERENCES system.recovery_checkpoints(id) ON DELETE CASCADE,
    rehearsal_status VARCHAR(20) NOT NULL CHECK (rehearsal_status IN ('pending', 'running', 'verified', 'failed')),
    rto_seconds NUMERIC(10, 3) NOT NULL DEFAULT 0,
    rpo_seconds NUMERIC(10, 3) NOT NULL DEFAULT 0,
    recovery_evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verified_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_recovery_rehearsals_checkpoint ON system.recovery_rehearsals(checkpoint_id);

-- 4. Operational Quotas & Resource Boundaries
CREATE TABLE IF NOT EXISTS system.operational_quotas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quota_key VARCHAR(100) NOT NULL UNIQUE,
    quota_value BIGINT NOT NULL,
    unit VARCHAR(50) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Data Retention & Storage Purge Jobs
CREATE TABLE IF NOT EXISTS system.retention_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_kind VARCHAR(50) NOT NULL DEFAULT 'tombstone_purge',
    purged_count INT NOT NULL DEFAULT 0,
    freed_bytes BIGINT NOT NULL DEFAULT 0,
    duration_ms INT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('running', 'completed', 'failed')),
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Baseline Seed Data
INSERT INTO system.release_manifests (version, build_number, channel, target_arch, release_digest, release_notes, provenance, status)
VALUES (
    '1.0.0',
    '20261027.1',
    'stable',
    'x64',
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    'Sirona V1 Production Release for Windows x64. Full local-first autonomous agent studio.',
    '{"signer": "sirona-production-authority", "reproducible": true, "tree_hash": "sha256-d7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592"}'::jsonb,
    'published'
) ON CONFLICT DO NOTHING;

INSERT INTO system.operational_quotas (quota_key, quota_value, unit)
VALUES 
    ('max_storage_mb', 10240, 'megabytes'),
    ('retention_days', 30, 'days'),
    ('max_checkpoints', 50, 'count')
ON CONFLICT (quota_key) DO NOTHING;
