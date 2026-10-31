-- Scoped standalone-chat support. Preserve existing sessions/messages and project links.
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id);
-- A deleted project's ON DELETE SET NULL must not move its history into standalone Chat.
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS chat_scope TEXT NOT NULL DEFAULT 'project';
UPDATE sessions s SET workspace_id=p.workspace_id FROM projects p
WHERE s.project_id=p.id AND s.workspace_id IS NULL;
CREATE INDEX IF NOT EXISTS sessions_standalone_owner ON sessions(workspace_id,user_id,last_activity_at) WHERE chat_scope='standalone' AND project_id IS NULL AND deleted_at IS NULL;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS client_turn_id UUID;
CREATE UNIQUE INDEX IF NOT EXISTS messages_client_turn ON messages(session_id,client_turn_id,role) WHERE client_turn_id IS NOT NULL;
