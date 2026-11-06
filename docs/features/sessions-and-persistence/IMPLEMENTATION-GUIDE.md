# Agent Implementation Guide: Sessions & Persistence

This guide covers database query authoring, driver configuration, migration protocols, and transaction safety in Sirona.

---

## 1. Key Source Files
- Database Adapter: [`apps/server/config/db.js`](file:///apps/server/config/db.js)
- SQLite Adapter: [`apps/server/config/sqliteDb.js`](file:///apps/server/config/sqliteDb.js)
- Migrations: [`apps/server/migrations/`](file:///apps/server/migrations/)
- Migration Runner: [`apps/server/migrations/runMigrations.js`](file:///apps/server/migrations/runMigrations.js)
- Conversation Routes: [`apps/server/routes/v1/conversations.routes.js`](file:///apps/server/routes/v1/conversations.routes.js)

---

## 2. Authoring Cross-Compatible SQL Queries

Because Sirona supports both PostgreSQL and SQLite:
1. **Always use `$1, $2` parameters**:
   ```javascript
   import { query, transaction } from "../config/db.js";

   // CORRECT:
   const result = await query(
     "SELECT id, title FROM conversations WHERE project_id = $1 ORDER BY updated_at DESC",
     [projectId]
   );

   // FORBIDDEN: Raw interpolation or driver-specific '?' syntax
   ```
2. **Execute Multi-Table Operations in Transactions**:
   ```javascript
   await transaction(async (client) => {
     await client.query("INSERT INTO messages (id, conversation_id, role, content) VALUES ($1, $2, $3, $4)", [msgId, convId, 'user', prompt]);
     await client.query("UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1", [convId]);
   });
   ```

---

## 3. Mandatory Rules
> [!CAUTION] Never drop tables or run unapproved destructive migrations.
> [!WARNING] The current `config/db.js` defaults to SQLite if `SIRONA_DB_DRIVER === "sqlite"`. When targeting PostgreSQL tests, ensure `SIRONA_DB_DRIVER` is unset or explicitly set to `postgres`.
