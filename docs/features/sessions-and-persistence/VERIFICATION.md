# Verification & Testing: Sessions & Persistence

## 1. Acceptance Criteria & Test Matrix

| Test ID | Test Description | Verification Target | Pass Condition |
|---|---|---|---|
| `DB-01` | Parameterized query parity | Run same query in PG and SQLite | Both return identical record shapes and types |
| `DB-02` | Transaction rollback on error | Throw error in transaction callback | Incomplete inserts are rolled back completely |
| `DB-03` | Migration catalog execution | Run `runMigrations.js` on fresh DB | Migrations 001–024 apply cleanly with zero errors |
| `DB-04` | Turn lease deadlock recovery | Stale lease with expired TTL | `forceBreakStaleLeases` releases lock cleanly |
| `DB-05` | Cascading session deletion | Delete conversation | Associated messages, runs, and tasks deleted cleanly |

---

## 2. Automated Test Commands

```bash
# Test SQLite adapter in isolation
SIRONA_DB_DRIVER=sqlite pnpm --filter @sirona/server test tests/sqliteDb.test.js

# Test PostgreSQL transaction and connection pool
pnpm --filter @sirona/server test tests/db.test.js

# Test migration integrity
pnpm --filter @sirona/server test tests/migrations.test.js
```
