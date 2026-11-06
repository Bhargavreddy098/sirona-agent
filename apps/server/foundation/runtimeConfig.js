import { readConfig } from "./config.js";

/** @returns {never} */
function invalid() { throw Object.assign(new Error("Invalid backend runtime configuration"), { code: "INVALID_CONFIG" }); }
function integer(value, fallback, min, max) {
  const input = value ?? String(fallback);
  if (typeof input !== "string" || !/^[1-9]\d*$/.test(input) || Number(input) < min || Number(input) > max) invalid();
  return Number(input);
}
function boolean(value, fallback = false) {
  if (value === undefined) return fallback;
  if (value !== "true" && value !== "false") invalid();
  return value === "true";
}
function text(value) { if (typeof value !== "string" || !value.trim() || value.length > 4096 || /[\r\n\0]/.test(value)) invalid(); return value; }
function connection(value, protocols) {
  try {
    const url = new URL(text(value));
    if (!protocols.includes(url.protocol) || !url.hostname || url.search || url.hash || url.port === "0") invalid();
    return url;
  } catch { return invalid(); }
}

/** Secrets remain only in the trusted config/driver owner, never a log object. */
export function readRuntimeConfig(env) {
  const transport = readConfig(env);
  const startupTimeoutMs = integer(env.ASI_STARTUP_TIMEOUT_MS, 5000, 10, 30000);
  const shutdownTimeoutMs = integer(env.ASI_SHUTDOWN_TIMEOUT_MS, 10000, 10, 30000);
  const readinessTimeoutMs = integer(env.ASI_READINESS_TIMEOUT_MS, 2000, 10, 30000);
  const rateLimit = Object.freeze({ points: integer(env.RATE_LIMIT_POINTS, 300, 1, 100000), duration: integer(env.RATE_LIMIT_DURATION, 60, 1, 3600) });
  const logLevel = env.LOG_LEVEL ?? "info";
  if (!["fatal", "error", "warn", "info", "debug", "trace", "silent"].includes(logLevel)) invalid();
  if (transport.environment === "production" && ["trace", "debug"].includes(logLevel)) invalid();
  // Raw SQL/Redis debugging is never appropriate in qualified lifecycle logs.
  if (boolean(env.DEBUG_SQL) || boolean(env.DEBUG_REDIS)) invalid();
  const tls = boolean(env.PGSSL, boolean(env.DATABASE_SSL));
  if (env.PGSSL !== undefined && env.DATABASE_SSL !== undefined && env.PGSSL !== env.DATABASE_SSL) invalid();
  if (!boolean(env.PGSSL_REJECT_UNAUTHORIZED, true)) invalid();
  /** @type {import('./contracts.js').DatabaseConfig} */
  const database = {
    max: integer(env.PGPOOL_MAX, 20, 1, 100),
    idleTimeoutMillis: integer(env.PGIDLE_TIMEOUT, 30000, 10, 300000),
    connectionTimeoutMillis: Math.min(integer(env.PGCONN_TIMEOUT, 5000, 10, 30000), startupTimeoutMs),
    query_timeout: Math.min(readinessTimeoutMs, startupTimeoutMs),
    ssl: tls ? Object.freeze({ rejectUnauthorized: true }) : false,
  };
  let host;
  if (env.DATABASE_URL !== undefined) {
    if (["PGHOST", "PGPORT", "PGDATABASE", "PGUSER", "PGPASSWORD"].some(key => env[key] !== undefined)) invalid();
    const url = connection(env.DATABASE_URL, ["postgres:", "postgresql:"]);
    if (!url.username || !url.password || url.pathname.length < 2) invalid();
    host = url.hostname;
    database.connectionString = env.DATABASE_URL;
  } else if (env.PGHOST !== undefined) {
    host = text(env.PGHOST);
    Object.assign(database, { host, port: integer(env.PGPORT, 5432, 1, 65535),
      database: text(env.PGDATABASE), user: text(env.PGUSER), password: text(env.PGPASSWORD) });
  } else {
    // Default to canonical SQLite-only persistence
    database.driver = "sqlite";
    database.path = env.SIRONA_DB_PATH !== undefined ? text(env.SIRONA_DB_PATH) : "./data/sirona.db";
    database.busyTimeout = integer(env.SIRONA_SQLITE_BUSY_TIMEOUT_MS, 5000, 100, 60000);
    database.cacheSizeMb = integer(env.SIRONA_SQLITE_CACHE_MB, 64, 1, 1024);
    database.walMode = true;
    host = "localhost";
  }
  // Off-host PostgreSQL is never silently sent cleartext credentials.
  if (!["localhost", "127.0.0.1", "[::1]", "::1"].includes(host) && !tls) invalid();
  let cache = null;
  if (env.REDIS_URL !== undefined || env.REDIS_HOST !== undefined) {
    if (env.REDIS_URL !== undefined) {
      if (["REDIS_HOST", "REDIS_PORT", "REDIS_PASSWORD"].some(key => env[key] !== undefined)) invalid();
      const url = connection(env.REDIS_URL, ["redis:", "rediss:"]);
      if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) && url.protocol !== "rediss:") invalid();
      cache = { url: env.REDIS_URL };
    } else {
      const redisHost = text(env.REDIS_HOST);
      if (!["localhost", "127.0.0.1", "::1"].includes(redisHost)) invalid();
      cache = { host: redisHost, port: integer(env.REDIS_PORT, 6379, 1, 65535),
        ...(env.REDIS_PASSWORD === undefined ? {} : { password: text(env.REDIS_PASSWORD) }) };
    }
  } else if (env.REDIS_PORT !== undefined || env.REDIS_PASSWORD !== undefined) invalid();
  return Object.freeze({ ...transport, startupTimeoutMs, shutdownTimeoutMs, readinessTimeoutMs,
    logLevel, rateLimit, database: Object.freeze(database), cache: cache ? Object.freeze(cache) : null });
}
