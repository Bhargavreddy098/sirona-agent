/**
 * @file apps/server/src/persistence/index.ts
 * Persistence domain module: Database connections, transactional adapters, and event persistence.
 */
export * from '../db/schema.js';
export * from '../db/transactionAdapter.js';
export * from '../execution/effectJournal.js';
export * from '../execution/runEventStore.js';
export { query, transaction, pool } from '../../config/db.js';
export { getSqliteDb } from '../../config/sqliteDb.js';
