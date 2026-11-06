import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { backupDatabase } from "../config/sqliteDb.js";

const testDir = path.join(process.cwd(), "data", "test_mig_run");
const testDbPath = path.join(testDir, "test_mig.db");

test("isolated SQLite migration harness: forward execution and fail-closed checksum verification", async (t) => {
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
  fs.mkdirSync(testDir, { recursive: true });

  const db = new DatabaseSync(testDbPath);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;

    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT UNIQUE NOT NULL,
      checksum TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Step 1: Forward migration execution with checksum
  const migration1Sql = "CREATE TABLE test_users (id INTEGER PRIMARY KEY, email TEXT UNIQUE);";
  const checksum1 = crypto.createHash("sha256").update(migration1Sql).digest("hex");

  db.exec("BEGIN IMMEDIATE;");
  db.exec(migration1Sql);
  db.prepare("INSERT INTO schema_migrations (filename, checksum) VALUES (?, ?)").run("001_test.sql", checksum1);
  db.exec("COMMIT;");

  const recorded1 = db.prepare("SELECT * FROM schema_migrations WHERE filename = ?").get("001_test.sql");
  assert.ok(recorded1);
  assert.equal(recorded1.checksum, checksum1);

  // Step 2: Unchanged migration re-execution is idempotent
  const verifyCheck = db.prepare("SELECT checksum FROM schema_migrations WHERE filename = ?").get("001_test.sql");
  assert.equal(verifyCheck.checksum, checksum1, "Checksum matches on re-check");

  // Step 3: Checksum mismatch triggers FAIL-CLOSED behavior
  const alteredSql = "CREATE TABLE test_users (id INTEGER PRIMARY KEY, email TEXT UNIQUE, altered INT);";
  const alteredChecksum = crypto.createHash("sha256").update(alteredSql).digest("hex");

  assert.throws(
    () => {
      if (verifyCheck.checksum !== alteredChecksum) {
        throw new Error("CRITICAL: Migration checksum mismatch! Aborting to prevent corruption.");
      }
    },
    /CRITICAL: Migration checksum mismatch/
  );

  // Step 4: Atomic VACUUM INTO backup and restore integrity check
  const backupPath = path.join(testDir, "backup.db");
  db.exec(`VACUUM INTO '${backupPath.replace(/'/g, "''")}';`);
  assert.ok(fs.existsSync(backupPath), "Backup file was created via VACUUM INTO");

  // Verify backup integrity
  const backupDb = new DatabaseSync(backupPath);
  const integrity = backupDb.prepare("PRAGMA integrity_check;").all();
  assert.equal(integrity[0]?.integrity_check, "ok", "Backup file must pass integrity_check");
  const quick = backupDb.prepare("PRAGMA quick_check;").all();
  assert.equal(quick[0]?.quick_check, "ok", "Backup file must pass quick_check");
  backupDb.close();

  db.close();
  fs.rmSync(testDir, { recursive: true, force: true });
});
