# Sessions, Persistence & Database Adapters

**Subsystem:** Sessions, Conversation Persistence & Database Layer  
**Owning Package:** `apps/server` (Database, Migrations, Models)  
**Status:** Implemented in PostgreSQL & SQLite; Reconciliation Documented  
**Read When:** Working on conversation history, session creation, turn leases, message persistence, database schema migrations, or Drizzle/pg/SQLite adapters.

---

## 1. Overview & Architectural Role

The **Sessions & Persistence Subsystem** stores conversation history, turns, messages, provider connections, and execution runs. Sirona supports two database drivers:
- **PostgreSQL (`pg` Pool / Drizzle)**: Production-grade target with 24 SQL migrations, 76 application tables, transactional locking, and vector extensions.
- **SQLite (`better-sqlite3` / `sqliteDb.js`)**: Embedded local development driver enabling offline operation without external database services.

```
                      ┌────────────────────────────┐
                      │    Express Controllers     │
                      │  (sessionController, etc.) │
                      └─────────────┬──────────────┘
                                    │
                                    ▼
                      ┌────────────────────────────┐
                      │    apps/server/config/db.js│
                      │  (Driver Dispatcher)       │
                      └───────┬───────────┬────────┘
                              │           │
           SIRONA_DB_DRIVER   │           │ Default / PostgreSQL
              === "sqlite"    │           │
                              ▼           ▼
                      ┌───────────────┐ ┌───────────────────────────────┐
                      │  sqliteDb.js  │ │           pg.Pool             │
                      │  SQLite DB    │ │  PostgreSQL Pool              │
                      │  (sirona.db)  │ │  (sirona_workspace_...)      │
                      └───────────────┘ └───────────────────────────────┘
```

---

## 2. Implementation Ownership & File Map

| Responsibility | Owning File | Interfaces & Primary Exports |
|---|---|---|
| **Database Driver Selection** | `apps/server/config/db.js` | `query()`, `transaction()`, `getClient()`, `createDatabaseOwner()` |
| **SQLite Adapter** | `apps/server/config/sqliteDb.js` | `sqliteDb.query()`, `sqliteDb.getClient()` |
| **Session & Conversation Routes** | `apps/server/routes/v1/conversations.routes.js` | `GET /api/v1/conversations`, `POST /api/v1/conversations` |
| **Turn Lease Registry** | `apps/server/services/turnLeaseService.js` | `SessionTurnLeaseRegistry.acquireLease()`, `releaseLease()` |
| **Turn Coordinator** | `apps/server/services/conversationTurnCoordinator.js` | `coordinateTurn()` (Manages active turn leases and prevents concurrent streaming) |
| **Models & Active Record** | `apps/server/model/` | `Session.js`, `Message.js`, `Project.js`, `Setting.js`, `TurnLease.js` |
| **Migrations** | `apps/server/migrations/` | `001_initial_schema.sql` through `024_...sql` |

---

## 3. Turn Lease Mechanics

To avoid duplicate writes or model racing on the same conversation:
1. When a client initiates a turn via `coordinateTurn()`, `SessionTurnLeaseRegistry.acquireLease(conversationId, { ownerId, ttlSeconds: 90 })` inserts a row in `session_turn_leases`.
2. Concurrent requests for the same conversation receive HTTP `409 TURN_LEASE_CONFLICT`.
3. An active heartbeat renews the lease every 20 seconds.
4. On stream completion or client abort, the lease is released. If the server crashes, leases expire automatically via `expires_at > NOW()`.

---

## 4. Current DB Reconciliations & Extension Rules

- **Do Not Opportunistically Swap Adapters**: Any query written must use parameterized inputs `$1, $2` compatible with both PostgreSQL and the SQLite translation layer in `sqliteDb.js`.
- **Migrations**: New schema changes require adding a sequential migration under `apps/server/migrations/` (e.g. `025_...sql`). Never run destructive `DROP TABLE` operations on developer environments.
