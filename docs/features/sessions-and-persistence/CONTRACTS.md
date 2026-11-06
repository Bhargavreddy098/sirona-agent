# API Contracts & Schemas: Sessions & Persistence

## 1. REST Endpoints

### 1.1 List Conversation Sessions
- **Route**: `GET /api/v1/conversations`
- **Controller**: [`apps/server/controllers/conversationController.js`](file:///apps/server/controllers/conversationController.js)
- **Response**: `200 OK`
```json
{
  "conversations": [
    {
      "id": "conv_01HXYZ987654321",
      "projectId": "proj_12345",
      "title": "Refactor auth middleware",
      "model": "gemini-2.5-pro",
      "messageCount": 14,
      "createdAt": "2026-11-03T10:00:00.000Z",
      "updatedAt": "2026-11-03T11:45:00.000Z"
    }
  ]
}
```

### 1.2 Create Conversation Session
- **Route**: `POST /api/v1/conversations`
- **Request Body**:
```json
{
  "projectId": "proj_12345",
  "title": "New feature planning",
  "model": "gemini-2.5-pro"
}
```
- **Response**: `201 Created`
```json
{
  "id": "conv_01HXYZ99887766",
  "projectId": "proj_12345",
  "title": "New feature planning",
  "model": "gemini-2.5-pro",
  "createdAt": "2026-11-03T11:50:00.000Z"
}
```

---

## 2. Table Schema Definitions (PostgreSQL & SQLite)

### `conversations` Table
```sql
CREATE TABLE IF NOT EXISTS conversations (
    id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    active_model VARCHAR(128) NOT NULL,
    status VARCHAR(32) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_conversations_project_id ON conversations(project_id);
```

### `messages` Table
```sql
CREATE TABLE IF NOT EXISTS messages (
    id VARCHAR(64) PRIMARY KEY,
    conversation_id VARCHAR(64) REFERENCES conversations(id) ON DELETE CASCADE,
    role VARCHAR(32) NOT NULL, -- 'user', 'assistant', 'system', 'tool'
    content TEXT NOT NULL,
    tool_calls JSONB,
    tool_results JSONB,
    token_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
```
