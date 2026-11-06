import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { loadEnvironment } from "../server.js";
import { readRuntimeConfig } from "../foundation/runtimeConfig.js";
import { createLogger } from "../foundation/logger.js";
import { createDatabaseOwner, activateDatabaseOwner } from "../config/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations() {
  console.log("🚀 Starting Sirona SQLite migrations...");
  loadEnvironment();
  const config = readRuntimeConfig(process.env);
  const logger = createLogger(config);
  const owner = createDatabaseOwner(config.database, logger);

  try {
    activateDatabaseOwner(owner);
    await owner.initialize();
    const client = await owner.pool.connect();

    try {
      // 1. Ensure migrations tracking table exists with checksum column in SQLite
      await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          filename TEXT UNIQUE NOT NULL,
          checksum TEXT,
          applied_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
      `);

      // 2. Discover .sql migration files in deterministic alphabetical order
      const files = fs
        .readdirSync(__dirname)
        .filter((file) => file.endsWith(".sql"))
        .sort();

      for (const file of files) {
        const filePath = path.join(__dirname, file);
        const sql = fs.readFileSync(filePath, "utf-8");
        const checksum = crypto.createHash("sha256").update(sql).digest("hex");

        const checkRes = await client.query(
          "SELECT id, checksum FROM schema_migrations WHERE filename = $1",
          [file]
        );

        if (checkRes.rows.length === 0) {
          console.log(`📦 Applying migration: ${file}...`);
          await client.query("BEGIN");
          try {
            await client.query(sql);
            await client.query(
              "INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2)",
              [file, checksum]
            );
            await client.query("COMMIT");
            console.log(`✅ Applied migration: ${file} (checksum: ${checksum.slice(0, 8)})`);
          } catch (err) {
            await client.query("ROLLBACK");
            throw err;
          }
        } else {
          const recorded = checkRes.rows[0];
          if (!recorded.checksum) {
            await client.query(
              "UPDATE schema_migrations SET checksum = $1 WHERE id = $2",
              [checksum, recorded.id]
            );
            console.log(`⏩ Migration already applied: ${file} (backfilled checksum: ${checksum.slice(0, 8)})`);
          } else if (recorded.checksum !== checksum) {
            // FAIL CLOSED POLICY: Checksum mismatch aborts migration immediately
            throw new Error(
              `CRITICAL: Migration checksum mismatch on ${file}!\n` +
              `Recorded: ${recorded.checksum.slice(0, 8)}, Current: ${checksum.slice(0, 8)}\n` +
              `Aborting migration to prevent database corruption.`
            );
          } else {
            console.log(`⏩ Migration already applied: ${file} (checksum verified: ${checksum.slice(0, 8)})`);
          }
        }
      }

      console.log("🎉 All migrations applied and verified successfully!");
    } finally {
      client.release?.();
    }
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    process.exitCode = 1;
    throw error;
  } finally {
    await owner.close();
  }
}

const isDirectRun = process.argv[1] && (
  import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/")) ||
  process.argv[1].endsWith("runMigrations.js")
);

if (isDirectRun) {
  runMigrations().catch(() => process.exit(1));
}
