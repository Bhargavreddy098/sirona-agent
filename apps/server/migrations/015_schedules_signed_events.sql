-- 015_schedules_signed_events.sql
-- Stage 15: Schedules, Occurrences, Triggers, Inbound Signed Events, Activity & Notifications

CREATE SCHEMA IF NOT EXISTS automation;

-- 1. Schedules table
CREATE TABLE IF NOT EXISTS automation.schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    goal_template JSONB NOT NULL,
    recurrence TEXT NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'UTC',
    misfire_policy TEXT NOT NULL DEFAULT 'skip' CHECK (misfire_policy IN ('skip', 'latest', 'bounded_catchup')),
    overlap_policy TEXT NOT NULL DEFAULT 'skip' CHECK (overlap_policy IN ('skip', 'queue_one', 'parallel')),
    budget_ceiling_micro_usd BIGINT,
    grant_ids UUID[] DEFAULT '{}',
    next_fire_at TIMESTAMPTZ NOT NULL,
    last_fired_at TIMESTAMPTZ,
    paused_at TIMESTAMPTZ,
    pause_reason TEXT,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schedules_next_fire 
    ON automation.schedules(next_fire_at, id) 
    WHERE paused_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_schedules_project_id 
    ON automation.schedules(project_id);

-- 2. Occurrences table
CREATE TABLE IF NOT EXISTS automation.occurrences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES automation.schedules(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    scheduled_for TIMESTAMPTZ NOT NULL,
    state TEXT NOT NULL DEFAULT 'queued' CHECK (state IN ('queued', 'running', 'skipped', 'completed', 'failed')),
    run_id UUID REFERENCES runs(id) ON DELETE SET NULL,
    reason TEXT,
    claimed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_schedule_occurrence UNIQUE (schedule_id, scheduled_for)
);

CREATE INDEX IF NOT EXISTS idx_occurrences_schedule_id 
    ON automation.occurrences(schedule_id, scheduled_for DESC);

CREATE INDEX IF NOT EXISTS idx_occurrences_state 
    ON automation.occurrences(state, scheduled_for ASC);

-- 3. Triggers table
CREATE TABLE IF NOT EXISTS automation.triggers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    source TEXT NOT NULL CHECK (source IN ('github', 'generic_webhook')),
    event_filter JSONB NOT NULL DEFAULT '{}',
    goal_template JSONB NOT NULL,
    grant_ids UUID[] DEFAULT '{}',
    secret_reference_id TEXT,
    secret_token TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_triggers_project_id 
    ON automation.triggers(project_id);

-- 4. Inbound signed events table
CREATE TABLE IF NOT EXISTS automation.inbound_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    trigger_id UUID REFERENCES automation.triggers(id) ON DELETE SET NULL,
    source TEXT NOT NULL,
    delivery_id TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'received' CHECK (state IN ('received', 'processed', 'ignored', 'failed')),
    payload_digest TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}',
    goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,
    run_id UUID REFERENCES runs(id) ON DELETE SET NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    CONSTRAINT uq_trigger_delivery UNIQUE (trigger_id, delivery_id)
);

CREATE INDEX IF NOT EXISTS idx_inbound_events_project 
    ON automation.inbound_events(project_id, received_at DESC);

-- 5. Activity log table
CREATE TABLE IF NOT EXISTS automation.activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    run_id UUID REFERENCES runs(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    safe_summary TEXT NOT NULL,
    trace_id TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_project_created 
    ON automation.activity(project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_created 
    ON automation.activity(created_at DESC);

-- 6. Notifications table
CREATE TABLE IF NOT EXISTS automation.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    channel TEXT NOT NULL DEFAULT 'local' CHECK (channel IN ('local', 'approved_external')),
    state TEXT NOT NULL DEFAULT 'unread' CHECK (state IN ('unread', 'read', 'archived')),
    summary TEXT NOT NULL,
    artifact_ids UUID[] DEFAULT '{}',
    metadata JSONB NOT NULL DEFAULT '{}',
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_state_created 
    ON automation.notifications(state, created_at DESC);
