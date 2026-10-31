-- =====================================================================
-- Sirona Relational Schema Migration (PostgreSQL)
-- Migration 001: Initial Core Schema
-- =====================================================================

-- Enable UUID extension if available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Users Table (Authentication & RBAC)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    name VARCHAR(100),
    avatar_url TEXT,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    token_version INT NOT NULL DEFAULT 0,
    google_id VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google ON users(google_id);

-- 2. Workspace Projects
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    primary_path TEXT NOT NULL,
    icon VARCHAR(50) DEFAULT 'folder',
    color VARCHAR(20) DEFAULT '#1f2328',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archived SMALLINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_projects_archived ON projects(archived, created_at DESC);

-- 3. Sessions (Conversational Workflow Threads)
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL DEFAULT 'New Session',
    model VARCHAR(100) NOT NULL DEFAULT 'gemini-2.5-flash',
    system_prompt TEXT,
    cwd TEXT,
    git_branch VARCHAR(100),
    parent_session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    branch_point_id INT,
    pinned SMALLINT NOT NULL DEFAULT 0,
    archived SMALLINT NOT NULL DEFAULT 0,
    reasoning_effort VARCHAR(20) NOT NULL DEFAULT 'medium',
    message_count INT NOT NULL DEFAULT 0,
    input_tokens INT NOT NULL DEFAULT 0,
    output_tokens INT NOT NULL DEFAULT 0,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(deleted_at, archived, last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions(project_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_sessions_parent ON sessions(parent_session_id);

-- 4. Messages (Turn Transcripts, Tool Invocations, and Reasoning)
CREATE TABLE IF NOT EXISTS messages (
    id BIGSERIAL PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    content TEXT,
    tool_call_id VARCHAR(100),
    tool_name VARCHAR(100),
    tool_args JSONB,
    tool_result JSONB,
    duration_ms INT,
    reasoning TEXT,
    tokens INT NOT NULL DEFAULT 0,
    active SMALLINT NOT NULL DEFAULT 1,
    compacted SMALLINT NOT NULL DEFAULT 0,
    search_vector TSVECTOR,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_active ON messages(session_id, active, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_search ON messages USING GIN(search_vector);

-- Trigger to automatically update full-text search vector on message insert/update
CREATE OR REPLACE FUNCTION messages_search_update() RETURNS trigger AS $$
BEGIN
    new.search_vector := to_tsvector('english', COALESCE(new.content, '') || ' ' || COALESCE(new.tool_name, '') || ' ' || COALESCE(new.reasoning, ''));
    RETURN new;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_messages_search_update ON messages;
CREATE TRIGGER trg_messages_search_update
    BEFORE INSERT OR UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION messages_search_update();

-- 5. Session Turn Leases (Single-Writer Concurrency Control)
CREATE TABLE IF NOT EXISTS session_turn_leases (
    session_id UUID PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
    holder VARCHAR(100) NOT NULL,
    generation BIGINT NOT NULL DEFAULT 1,
    acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_turn_leases_expires ON session_turn_leases(expires_at);

-- 6. Checkpoints (State Snapshots for Branching & Rewinds)
CREATE TABLE IF NOT EXISTS checkpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    message_id BIGINT REFERENCES messages(id) ON DELETE SET NULL,
    summary TEXT,
    state_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checkpoints_session ON checkpoints(session_id, created_at);

-- 7. Action Approvals (Human-in-the-Loop Safety Gates)
CREATE TABLE IF NOT EXISTS approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id VARCHAR(100) NOT NULL,
    prompt_id VARCHAR(100) NOT NULL,
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    tool_name VARCHAR(100) NOT NULL,
    command TEXT,
    tool_args JSONB,
    risk_level VARCHAR(20) NOT NULL DEFAULT 'medium',
    approved BOOLEAN,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approvals_lookup ON approvals(run_id, prompt_id);
CREATE INDEX IF NOT EXISTS idx_approvals_session ON approvals(session_id, created_at);

-- 8. Desktop Settings & KV Store
CREATE TABLE IF NOT EXISTS desktop_settings (
    key VARCHAR(255) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Security Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    details JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_id, created_at DESC);
