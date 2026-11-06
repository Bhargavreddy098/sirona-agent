import { loadEnvironment } from "../server.js";
import { readRuntimeConfig } from "../foundation/runtimeConfig.js";
import { createLogger } from "../foundation/logger.js";
import { createDatabaseOwner, activateDatabaseOwner } from "../config/db.js";

async function verifyDb() {
  console.log("🔍 Verifying PostgreSQL Database Connection & Tables...");

  loadEnvironment();
  const config = readRuntimeConfig(process.env);
  const logger = createLogger(config);
  const owner = createDatabaseOwner(config.database, logger);

  try {
    activateDatabaseOwner(owner);
    await owner.initialize();
    console.log("✅ PostgreSQL is reachable and answering queries.");

    const dbInfo = await owner.pool.query("SELECT current_database(), current_user, version();");
    console.log(`📊 Connected to: ${dbInfo.rows[0].current_database} as ${dbInfo.rows[0].current_user}`);

    const tablesRes = await owner.pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log(`📋 Found ${tablesRes.rows.length} existing tables in 'public' schema:`);
    for (const row of tablesRes.rows) {
      console.log(`   - ${row.table_name}`);
    }

    const extRes = await owner.pool.query("SELECT extname, extversion FROM pg_extension ORDER BY extname;");
    console.log(`🧩 Installed extensions: ${extRes.rows.map(r => `${r.extname} (v${r.extversion})`).join(", ")}`);

    console.log("\n✨ Database check complete: ALL CHECKS PASSED.");
  } catch (err) {
    console.error("❌ Verification failed:", err.message);
    process.exitCode = 1;
  } finally {
    await owner.close();
  }
}

verifyDb();
