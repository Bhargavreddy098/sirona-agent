-- Additive Phase 2 migration: Opaque credential references and migration state.
-- Existing migration runner owns BEGIN/COMMIT. Abort instead of waiting indefinitely.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

-- Quiesce provider connection writers before schema update.
LOCK TABLE provider_connections IN SHARE ROW EXCLUSIVE MODE;

-- Add opaque reference, status, and migration timestamp columns
ALTER TABLE provider_connections ADD COLUMN IF NOT EXISTS credential_ref VARCHAR(128);
ALTER TABLE provider_connections ADD COLUMN IF NOT EXISTS credential_status VARCHAR(32) NOT NULL DEFAULT 'legacy';
ALTER TABLE provider_connections ADD COLUMN IF NOT EXISTS credential_migrated_at TIMESTAMPTZ;

-- Unique/lookup index on workspace and opaque credential reference
CREATE INDEX IF NOT EXISTS idx_provider_connections_cred_ref
    ON provider_connections (workspace_id, credential_ref) WHERE credential_ref IS NOT NULL;

-- Retain all existing connection rows, api_key_ciphertext, models, and conversation history.
-- Legacy connections remain intact with credential_status = 'legacy' until explicitly verified and migrated.
