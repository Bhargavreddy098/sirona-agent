-- 011_tool_runtime_coding_backend.sql
-- Stage 11: Tool Runtime & One Coding Backend

-- 1. Tools catalog (frozen tool definitions)
CREATE TABLE IF NOT EXISTS tools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(64) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tool revisions (versioned immutable schemas, capabilities, risk class, execution boundaries)
CREATE TABLE IF NOT EXISTS tool_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_id UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
    revision INT NOT NULL DEFAULT 1,
    input_schema JSONB NOT NULL,
    output_schema JSONB NOT NULL,
    capabilities TEXT[] NOT NULL DEFAULT '{}',
    risk_class VARCHAR(32) NOT NULL DEFAULT 'read' CHECK (risk_class IN ('read', 'workspace_mutation', 'external_mutation', 'high_impact')),
    timeout_ms INT NOT NULL DEFAULT 15000,
    max_output_bytes INT NOT NULL DEFAULT 1048576,
    idempotency BOOLEAN NOT NULL DEFAULT false,
    cancellation BOOLEAN NOT NULL DEFAULT true,
    sandbox_profile VARCHAR(64) NOT NULL DEFAULT 'hardened_local_boundary',
    availability VARCHAR(32) NOT NULL DEFAULT 'available' CHECK (availability IN ('available', 'deprecated', 'disabled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tool_id, revision)
);

-- 3. Developer connections (scoped adapters e.g. local_process, windows_sandbox, custom_agent)
CREATE TABLE IF NOT EXISTS developer_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    adapter_kind VARCHAR(64) NOT NULL CHECK (adapter_kind IN ('local_process', 'windows_sandbox', 'custom_agent')),
    install_ref VARCHAR(255),
    auth_method VARCHAR(64) NOT NULL DEFAULT 'local_token',
    requested_capabilities JSONB NOT NULL DEFAULT '[]',
    status VARCHAR(32) NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'qualified', 'disconnected', 'error')),
    test_profile VARCHAR(64) DEFAULT 'hardened_local_boundary',
    last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tool invocations (audit and tracking of individual executions)
CREATE TABLE IF NOT EXISTS tool_invocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID REFERENCES developer_connections(id) ON DELETE SET NULL,
    tool_id UUID NOT NULL REFERENCES tools(id),
    tool_revision_id UUID NOT NULL REFERENCES tool_revisions(id),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    run_id UUID REFERENCES runs(id) ON DELETE SET NULL,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    input JSONB NOT NULL,
    input_digest VARCHAR(64) NOT NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tool receipts (immutable execution proofs with SHA-256 digests)
CREATE TABLE IF NOT EXISTS tool_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invocation_id UUID NOT NULL REFERENCES tool_invocations(id) ON DELETE CASCADE,
    tool_revision_id UUID NOT NULL REFERENCES tool_revisions(id),
    status VARCHAR(32) NOT NULL CHECK (status IN ('success', 'failure', 'error', 'timeout')),
    exit_code INT,
    input_digest VARCHAR(64) NOT NULL,
    output_digest VARCHAR(64) NOT NULL,
    output JSONB NOT NULL,
    duration_ms INT NOT NULL DEFAULT 0,
    artifact_ids JSONB DEFAULT '[]',
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tool_revisions_tool_id ON tool_revisions(tool_id);
CREATE INDEX IF NOT EXISTS idx_developer_connections_workspace ON developer_connections(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tool_invocations_project ON tool_invocations(project_id);
CREATE INDEX IF NOT EXISTS idx_tool_receipts_invocation ON tool_receipts(invocation_id);

-- 6. Seed Baseline Frozen Tools and Revisions
DO $$
DECLARE
    v_tool_id UUID;
BEGIN
    -- Tool 1: read_file
    INSERT INTO tools (name, description)
    VALUES ('read_file', 'Read contents of a file within the workspace boundary with SHA-256 digest computation')
    ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
    RETURNING id INTO v_tool_id;

    INSERT INTO tool_revisions (tool_id, revision, input_schema, output_schema, capabilities, risk_class, timeout_ms, max_output_bytes, idempotency, cancellation, sandbox_profile, availability)
    VALUES (
        v_tool_id,
        1,
        '{"type": "object", "properties": {"path": {"type": "string"}, "encoding": {"type": "string", "default": "utf8"}}, "required": ["path"]}'::jsonb,
        '{"type": "object", "properties": {"content": {"type": "string"}, "bytes": {"type": "number"}, "digest": {"type": "string"}}, "required": ["content", "digest"]}'::jsonb,
        ARRAY['fs_read'],
        'read',
        10000,
        2097152,
        true,
        true,
        'hardened_local_boundary',
        'available'
    )
    ON CONFLICT (tool_id, revision) DO NOTHING;

    -- Tool 2: write_file
    INSERT INTO tools (name, description)
    VALUES ('write_file', 'Write contents to a file within the workspace boundary with quarantine scan')
    ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
    RETURNING id INTO v_tool_id;

    INSERT INTO tool_revisions (tool_id, revision, input_schema, output_schema, capabilities, risk_class, timeout_ms, max_output_bytes, idempotency, cancellation, sandbox_profile, availability)
    VALUES (
        v_tool_id,
        1,
        '{"type": "object", "properties": {"path": {"type": "string"}, "content": {"type": "string"}}, "required": ["path", "content"]}'::jsonb,
        '{"type": "object", "properties": {"path": {"type": "string"}, "bytesWritten": {"type": "number"}, "digest": {"type": "string"}}, "required": ["path", "digest"]}'::jsonb,
        ARRAY['fs_write', 'workspace_mutation'],
        'workspace_mutation',
        15000,
        1048576,
        false,
        true,
        'hardened_local_boundary',
        'available'
    )
    ON CONFLICT (tool_id, revision) DO NOTHING;

    -- Tool 3: list_directory
    INSERT INTO tools (name, description)
    VALUES ('list_directory', 'List directory entries within workspace containment')
    ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
    RETURNING id INTO v_tool_id;

    INSERT INTO tool_revisions (tool_id, revision, input_schema, output_schema, capabilities, risk_class, timeout_ms, max_output_bytes, idempotency, cancellation, sandbox_profile, availability)
    VALUES (
        v_tool_id,
        1,
        '{"type": "object", "properties": {"path": {"type": "string", "default": "."}, "recursive": {"type": "boolean", "default": false}, "maxDepth": {"type": "number", "default": 2}}}'::jsonb,
        '{"type": "object", "properties": {"entries": {"type": "array", "items": {"type": "object", "properties": {"name": {"type": "string"}, "isDirectory": {"type": "boolean"}, "size": {"type": "number"}}}}}, "required": ["entries"]}'::jsonb,
        ARRAY['fs_read'],
        'read',
        10000,
        1048576,
        true,
        true,
        'hardened_local_boundary',
        'available'
    )
    ON CONFLICT (tool_id, revision) DO NOTHING;

    -- Tool 4: execute_command
    INSERT INTO tools (name, description)
    VALUES ('execute_command', 'Execute a bounded command inside the isolated boundary with timeout and output limits')
    ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
    RETURNING id INTO v_tool_id;

    INSERT INTO tool_revisions (tool_id, revision, input_schema, output_schema, capabilities, risk_class, timeout_ms, max_output_bytes, idempotency, cancellation, sandbox_profile, availability)
    VALUES (
        v_tool_id,
        1,
        '{"type": "object", "properties": {"command": {"type": "string"}, "args": {"type": "array", "items": {"type": "string"}}, "cwd": {"type": "string"}, "timeoutMs": {"type": "number"}}, "required": ["command"]}'::jsonb,
        '{"type": "object", "properties": {"exitCode": {"type": "number"}, "stdout": {"type": "string"}, "stderr": {"type": "string"}, "durationMs": {"type": "number"}, "timedOut": {"type": "boolean"}}, "required": ["exitCode", "stdout", "stderr"]}'::jsonb,
        ARRAY['shell_exec', 'bounded_process'],
        'workspace_mutation',
        30000,
        1048576,
        false,
        true,
        'hardened_local_boundary',
        'available'
    )
    ON CONFLICT (tool_id, revision) DO NOTHING;

    -- Tool 5: apply_patch
    INSERT INTO tools (name, description)
    VALUES ('apply_patch', 'Apply a unified diff or patch against workspace files within containment boundary')
    ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
    RETURNING id INTO v_tool_id;

    INSERT INTO tool_revisions (tool_id, revision, input_schema, output_schema, capabilities, risk_class, timeout_ms, max_output_bytes, idempotency, cancellation, sandbox_profile, availability)
    VALUES (
        v_tool_id,
        1,
        '{"type": "object", "properties": {"patch": {"type": "string"}, "baseSnapshotId": {"type": "string"}, "targetPath": {"type": "string"}}, "required": ["patch"]}'::jsonb,
        '{"type": "object", "properties": {"applied": {"type": "boolean"}, "filesChanged": {"type": "array", "items": {"type": "string"}}, "patchDigest": {"type": "string"}}, "required": ["applied", "patchDigest"]}'::jsonb,
        ARRAY['workspace_mutation', 'patch'],
        'workspace_mutation',
        20000,
        1048576,
        false,
        true,
        'hardened_local_boundary',
        'available'
    )
    ON CONFLICT (tool_id, revision) DO NOTHING;
END $$;
