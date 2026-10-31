-- =====================================================================
-- Sirona Relational Schema Migration (PostgreSQL)
-- Migration 006: AI Providers, Model Registry, and Inference Accounting
-- =====================================================================

-- 1. Provider Connections Table
CREATE TABLE IF NOT EXISTS provider_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    kind VARCHAR(50) NOT NULL, -- 'google' | 'openai' | 'anthropic' | 'openai_compatible'
    name VARCHAR(100) NOT NULL,
    base_url TEXT,
    api_key_ciphertext TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_provider_connections_workspace ON provider_connections(workspace_id, kind);

-- 2. Models Registry Table
CREATE TABLE IF NOT EXISTS models (
    id VARCHAR(100) PRIMARY KEY,
    provider_kind VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    context_window INT NOT NULL DEFAULT 128000,
    max_output_tokens INT NOT NULL DEFAULT 8192,
    input_cost_micro_usd_per_m BIGINT NOT NULL DEFAULT 250000,
    output_cost_micro_usd_per_m BIGINT NOT NULL DEFAULT 1000000,
    is_available BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed baseline qualified model profiles
INSERT INTO models (id, provider_kind, name, context_window, max_output_tokens, input_cost_micro_usd_per_m, output_cost_micro_usd_per_m, is_available)
VALUES
    ('gemini-2.5-flash', 'google', 'Gemini 2.5 Flash', 1048576, 8192, 100000, 400000, true),
    ('gemini-1.5-pro', 'google', 'Gemini 1.5 Pro', 2097152, 8192, 1250000, 5000000, true),
    ('gemini-flash-lite-latest', 'google', 'Gemini Flash Lite', 1048576, 8192, 75000, 300000, true),
    ('gpt-4o', 'openai', 'GPT-4o', 128000, 4096, 2500000, 10000000, true),
    ('gpt-4o-mini', 'openai', 'GPT-4o Mini', 128000, 16384, 150000, 600000, true),
    ('claude-3-7-sonnet-20250219', 'anthropic', 'Claude 3.7 Sonnet', 200000, 8192, 3000000, 15000000, true)
ON CONFLICT (id) DO NOTHING;

-- 3. Model Calls & Token Accounting Table
CREATE TABLE IF NOT EXISTS model_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    model_id VARCHAR(100) NOT NULL,
    provider_kind VARCHAR(50) NOT NULL,
    prompt_tokens INT NOT NULL DEFAULT 0,
    completion_tokens INT NOT NULL DEFAULT 0,
    total_tokens INT NOT NULL DEFAULT 0,
    cost_micro_usd BIGINT NOT NULL DEFAULT 0,
    budget_reservation_id UUID REFERENCES budget_reservations(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'success', -- 'success' | 'failed' | 'aborted'
    duration_ms INT NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_model_calls_session ON model_calls(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_model_calls_project ON model_calls(project_id, created_at DESC);
