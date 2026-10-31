# Exact database-owner reconciliation proposal

2026-10-30. **Decision pending; no owner replacement applied.** The current owner request preserves PostgreSQL; current `backend/config/db.js` selects a SQLite SQL-translation adapter. AGENTS.md §31 says to “Stop affected work when implementation needs an architectural departure, material contract conflict … materially unexpected repository state.” This is the concrete conflict, not a request to reapprove the whole backend-refactor task.

## Proposed minimum slice

1. Restore the canonical PostgreSQL owner **in `backend/config/db.js`**, reusing installed `pg`, the existing runtime config, explicit lifecycle/composition and the signatures consumed by existing services: `query`, `getClient`, `transaction`, `createDatabaseOwner`, `activateDatabaseOwner`, `checkPostgresConnection`, `closePool`, `pool`.
2. Inspect all current consumers of SQLite-only exports (`initDatabase`, `getDbPath`, `translateSql`) before removing exports; migrate only verified internal callers or stop if a material compatibility requirement is found. Never emulate PostgreSQL transaction guarantees with a SQLite fallback.
3. Preserve `backend/config/sqliteDb.js` and every existing SQLite/database/WAL/namespace file unchanged. No automatic import, merge, cleanup, schema rewrite, data reset or file rename. Recent SQLite data requires a separate inventory and owner-approved data-migration decision.
4. Restore real Pool injection for existing lifecycle tests, bounded readiness, close-once ownership and same checked-out-client transactions. Initialization performs no DDL or seeding. No error swallowing or fabricated readiness.
5. Tests may change/add only directly relevant owner/guard tests under `backend/tests/` and isolated test helper configuration where necessary. Reuse current PostgreSQL schema; assert `current_database()='sirona_workspace_p0_test_20261028'` before mutation. Verify rollback, concurrency/fencing and pool cleanup. Requalify dependent P1/P5/P6 source against the current owner; do not inherit historical passes.

## Scope boundaries

- No schema migration, working `sirona` writes, SQLite writes/conversion, driver dependency, duplicate DB framework, public route/DTO change, provider charges, image build/admission, privileges, commits, pushes or deployment.
- Do not restart the user's currently running backend/Electron app or enable production flags. Inspect the running launch/watch ownership before writing the protected source; if changes would auto-restart the user's app, prepare an isolated repair candidate rather than applying to its active checkout.
- Preserve existing frontend design, root project directories, graph/effect/checkpoint/approval/provider services. Broader callers change only after their exact compatibility impact is known.
- Identify the authoritative location/backup of the missing normative `sironadocs/` documents before changing protected API/security contracts. Do not guess their contents or silently rewrite governance.

## Verification and rollback

Capture exact pre-change source hashes/copies, then run the existing owner/lifecycle tests and guarded real PostgreSQL transactions, followed by current free regression suites only after guard validation. Actual SQL/provider/guest failures remain failures or blocked results. Read-only working-store checks are separate from test mutation.

Rollback retains all database files and durable evidence; selectively restore reviewed owner source only if no in-flight work can be resumed through incompatible semantics. No automatic switch back to the unqualified SQLite emulation and no database rollback over newer data. Keep application activation disabled pending owner review.

Suggested owner decision: **“Approve this PostgreSQL-owner repair and guarded isolated tests only. Preserve every SQLite file and leave running services and working data unchanged.”**
