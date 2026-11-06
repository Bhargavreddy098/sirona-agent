-- =====================================================================
-- Sirona Relational Schema Migration (PostgreSQL)
-- Migration 019: Conversation Turn States & Durable Turn Lifecycles
-- =====================================================================

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'completed';

CREATE INDEX IF NOT EXISTS idx_messages_session_status ON messages(session_id, status);
