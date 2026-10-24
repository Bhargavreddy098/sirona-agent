from .connection import DatabaseManager

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL DEFAULT 'desktop',
    created_source TEXT DEFAULT 'user',
    user_id TEXT DEFAULT 'local',
    session_key TEXT,
    title TEXT NOT NULL DEFAULT 'New Session',
    title_source TEXT DEFAULT 'auto',
    model TEXT NOT NULL DEFAULT 'gemini-2.5-flash',
    model_config TEXT,
    system_prompt TEXT,
    parent_session_id TEXT,
    cwd TEXT,
    git_branch TEXT,
    git_repo_root TEXT,
    started_at REAL NOT NULL,
    ended_at REAL,
    last_activity_at REAL,
    message_count INTEGER DEFAULT 0,
    tool_call_count INTEGER DEFAULT 0,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    pinned INTEGER NOT NULL DEFAULT 0,
    archived INTEGER NOT NULL DEFAULT 0,
    hidden INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (parent_session_id) REFERENCES sessions(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    content TEXT,
    tool_call_id TEXT,
    tool_calls TEXT,
    tool_name TEXT,
    timestamp REAL NOT NULL,
    token_count INTEGER DEFAULT 0,
    finish_reason TEXT,
    reasoning TEXT,
    reasoning_content TEXT,
    api_content TEXT,
    display_kind TEXT DEFAULT 'normal',
    active INTEGER NOT NULL DEFAULT 1,
    compacted INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, timestamp);

-- FTS5 Full-Text Search for Messages
CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
    content,
    session_id UNINDEXED,
    role UNINDEXED,
    tokenize = 'unicode61'
);

-- Triggers to synchronize messages with messages_fts
CREATE TRIGGER IF NOT EXISTS trg_messages_insert AFTER INSERT ON messages
BEGIN
    INSERT INTO messages_fts(rowid, content, session_id, role)
    VALUES (new.id, new.content, new.session_id, new.role);
END;

CREATE TRIGGER IF NOT EXISTS trg_messages_delete AFTER DELETE ON messages
BEGIN
    DELETE FROM messages_fts WHERE rowid = old.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_messages_update AFTER UPDATE ON messages
BEGIN
    DELETE FROM messages_fts WHERE rowid = old.id;
    INSERT INTO messages_fts(rowid, content, session_id, role)
    VALUES (new.id, new.content, new.session_id, new.role);
END;

-- Projects and Workspace Folders
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    primary_path TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    created_at REAL NOT NULL,
    archived INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS project_folders (
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    path TEXT NOT NULL,
    label TEXT,
    is_primary INTEGER NOT NULL DEFAULT 0,
    added_at REAL NOT NULL,
    PRIMARY KEY (project_id, path)
);

-- Active Turn Leases
CREATE TABLE IF NOT EXISTS session_turn_leases (
    conversation_id TEXT PRIMARY KEY,
    holder TEXT NOT NULL,
    acquired_at REAL NOT NULL,
    expires_at REAL NOT NULL
);

-- Long-Term Memory
CREATE TABLE IF NOT EXISTS memories (
    id TEXT PRIMARY KEY,
    session_id TEXT REFERENCES sessions(id) ON DELETE SET NULL,
    category TEXT DEFAULT 'general',
    key TEXT,
    content TEXT NOT NULL,
    confidence REAL DEFAULT 1.0,
    created_at REAL NOT NULL,
    updated_at REAL NOT NULL
);
"""

async def init_db(db_mgr: DatabaseManager) -> None:
    async with db_mgr.acquire() as db:
        await db.executescript(SCHEMA_SQL)
        await db.commit()
