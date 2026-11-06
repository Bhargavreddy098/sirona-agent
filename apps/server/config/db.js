import * as sqliteDb from "./sqliteDb.js";

let active;
export let pool;

export function createDatabaseOwner(config, logger, Pool) {
  if (Pool) {
    const ownedPool = new Pool(config);
    let stopped = false;
    let closing;
    ownedPool.on?.("error", () => logger?.event?.("dependency.error", { category: "database", code: "RESOURCE_FAILED" }));
    const owner = {
      isCustom: true,
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

  const owner = sqliteDb.createDatabaseOwner(config, logger);
  return owner;
}

export function activateDatabaseOwner(owner) {
  if (active) throw Object.assign(new Error("Database owner already exists"), { code: "RESOURCE_FAILED" });
  active = owner;
  pool = owner.pool;
}

function requirePool() {
  if (!pool) {
    return sqliteDb.pool;
  }
  return pool;
}

export function query(text, params = []) {
  if (active?.isCustom) {
    return requirePool().query(text, params);
  }
  return sqliteDb.query(text, params);
}

export function getClient() {
  if (active?.isCustom) {
    return requirePool().connect();
  }
  return sqliteDb.getClient();
}

export async function transaction(callback) {
  if (active?.isCustom) {
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
  return sqliteDb.transaction(callback);
}

export function checkPostgresConnection() {
  return active ? active.ready() : Promise.resolve(true);
}

export function closePool() {
  if (active) {
    const p = active.close();
    active = undefined;
    pool = undefined;
    return p;
  }
  return Promise.resolve();
}

export { pool as default };
