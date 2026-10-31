import pg from "pg";
import * as sqliteDb from "./sqliteDb.js";

let active;
export let pool;

export function createDatabaseOwner(config, logger, Pool = pg.Pool) {
  if (process.env.SIRONA_DB_DRIVER === "sqlite" && Pool === pg.Pool) {
    const owner = sqliteDb.createDatabaseOwner(config, logger);
    const origInit = owner.initialize;
    owner.initialize = async () => {
      await origInit();
    };
    return owner;
  }

  const ownedPool = new Pool(config);
  let stopped = false;
  let closing;
  ownedPool.on?.("error", () => logger?.event?.("dependency.error", { category: "database", code: "RESOURCE_FAILED" }));
  const owner = {
    pool: ownedPool,
    async ready() {
      if (stopped) return false;
      try {
        const result = await ownedPool.query("SELECT 1 AS alive");
        return !stopped && result.rows[0]?.alive === 1;
      } catch {
        return false;
      }
    },
    async initialize() {
      if (!await owner.ready()) {
        throw Object.assign(new Error("Required dependency is unavailable"), { code: "DEPENDENCY_UNREADY" });
      }
    },
    close() {
      if (!closing) {
        stopped = true;
        closing = Promise.resolve().then(() => ownedPool.end?.()).finally(() => {
          if (active === owner) {
            active = undefined;
            pool = undefined;
          }
        });
      }
      return closing;
    },
  };
  return owner;
}

export function activateDatabaseOwner(owner) {
  if (active) throw Object.assign(new Error("Database owner already exists"), { code: "RESOURCE_FAILED" });
  active = owner;
  pool = owner.pool;
}

function requirePool() {
  if (!pool) {
    // If not yet explicitly initialized in standalone/scripts, allow sqlite fallback if configured
    if (process.env.SIRONA_DB_DRIVER === "sqlite") {
      return sqliteDb.pool;
    }
    throw Object.assign(new Error("Database owner is not initialized"), { code: "RESOURCE_FAILED" });
  }
  return pool;
}

export function query(text, params = []) {
  if (process.env.SIRONA_DB_DRIVER === "sqlite" && !active) {
    return sqliteDb.query(text, params);
  }
  return requirePool().query(text, params);
}

export function getClient() {
  if (process.env.SIRONA_DB_DRIVER === "sqlite" && !active) {
    return sqliteDb.getClient();
  }
  return requirePool().connect();
}

export async function transaction(callback) {
  if (process.env.SIRONA_DB_DRIVER === "sqlite" && !active) {
    return sqliteDb.transaction(callback);
  }
  const client = await getClient();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release?.();
  }
}

export function checkPostgresConnection() {
  return active ? active.ready() : Promise.resolve(false);
}

export function closePool() {
  return active ? active.close() : Promise.resolve();
}

export { pool as default };
