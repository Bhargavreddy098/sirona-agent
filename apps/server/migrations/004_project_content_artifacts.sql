-- =====================================================================
-- Sirona Relational Schema Migration (PostgreSQL)
-- Migration 004: Projects Scoping, Snapshots, Artifacts & Staged Uploads
-- =====================================================================

-- 1. Upgrade Projects Table for Workspace Scoping and Optimistic Locking
ALTER TABLE projects ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_projects_workspace ON projects(workspace_id, archived, created_at DESC);

-- 2. Repository Snapshots Table (Captures immutable Git worktree / tree state)
CREATE TABLE IF NOT EXISTS repository_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    commit_sha VARCHAR(64),
    tree_digest VARCHAR(128) NOT NULL,
    include_uncommitted BOOLEAN NOT NULL DEFAULT false,
    status VARCHAR(50) NOT NULL DEFAULT 'completed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_snapshots_project ON repository_snapshots(project_id, created_at DESC);

-- 3. Content-Addressed Encrypted Artifacts Table
CREATE TABLE IF NOT EXISTS artifacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    media_type VARCHAR(100) NOT NULL DEFAULT 'application/octet-stream',
    byte_size BIGINT NOT NULL DEFAULT 0,
    digest VARCHAR(128) NOT NULL,
    storage_path TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'available',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_artifacts_project ON artifacts(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_artifacts_digest ON artifacts(digest);

-- 4. Staged Uploads Table
CREATE TABLE IF NOT EXISTS uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    media_type VARCHAR(100) NOT NULL DEFAULT 'application/octet-stream',
    byte_size BIGINT NOT NULL DEFAULT 0,
    digest VARCHAR(128),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_uploads_project ON uploads(project_id, created_at DESC);
