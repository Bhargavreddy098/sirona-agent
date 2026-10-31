-- =====================================================================
-- Sirona Relational Schema Migration (PostgreSQL)
-- Migration 002: Vector Extension for Agent Embeddings (Optional)
-- =====================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'vector') THEN
    CREATE EXTENSION IF NOT EXISTS vector;
    RAISE NOTICE 'Vector extension successfully enabled.';
  ELSE
    RAISE NOTICE 'Vector extension is not installed in this PostgreSQL server; skipping.';
  END IF;
END $$;
