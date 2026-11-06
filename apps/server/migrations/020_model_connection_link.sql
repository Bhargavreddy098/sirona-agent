-- =====================================================================
-- Migration 020: Link Models to Provider Connections & Clean Port 8000 Looping
-- =====================================================================

-- 1. Add provider_connection_id to models table
ALTER TABLE models 
ADD COLUMN IF NOT EXISTS provider_connection_id UUID REFERENCES provider_connections(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_models_connection ON models(provider_connection_id);

-- 2. Clean up any invalid provider connections pointing to Sirona's own port (8000)
DELETE FROM provider_connections 
WHERE base_url LIKE '%:8000%' OR base_url LIKE '%127.0.0.1:8000%' OR base_url LIKE '%localhost:8000%';

-- 3. Link existing OpenAI-compatible models to their active provider connection (freellmapi if present)
DO $$
DECLARE
    freellm_id UUID;
BEGIN
    SELECT id INTO freellm_id FROM provider_connections WHERE name = 'freellmapi' AND is_active = true LIMIT 1;
    IF freellm_id IS NOT NULL THEN
        UPDATE models
        SET provider_connection_id = freellm_id
        WHERE provider_kind = 'openai_compatible' AND provider_connection_id IS NULL;
    END IF;
END $$;

-- 4. Update default model settings to ensure working primary and fallback models
INSERT INTO desktop_settings (key, value, updated_at)
VALUES ('default_model', '"gemini-2.5-flash"', NOW())
ON CONFLICT (key) DO UPDATE SET value = '"gemini-2.5-flash"', updated_at = NOW();

INSERT INTO desktop_settings (key, value, updated_at)
VALUES ('model_settings', '{"primaryModel":"gemini-2.5-flash","fallbackModel":"gemini-flash-lite-latest","auxiliaryModels":{"fast":"gemini-flash-lite-latest","reasoning":"gemini-1.5-pro","embedding":"text-embedding-004"}}', NOW())
ON CONFLICT (key) DO UPDATE SET value = '{"primaryModel":"gemini-2.5-flash","fallbackModel":"gemini-flash-lite-latest","auxiliaryModels":{"fast":"gemini-flash-lite-latest","reasoning":"gemini-1.5-pro","embedding":"text-embedding-004"}}', updated_at = NOW();
