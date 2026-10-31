import { test } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { fileURLToPath } from "node:url";
import { readRuntimeConfig } from "../foundation/runtimeConfig.js";
import { loadEnvironment } from "../server.js";
import { createDatabaseOwner } from "../config/db.js";
import { createRedisOwner } from "../config/redis.js";
import { createLogger } from "../foundation/logger.js";
import { createHook } from "node:async_hooks";
import { createRateLimiterOwner } from "../middleware/rateLimiter.js";

const base = { NODE_ENV: "production", DATABASE_URL: "postgresql://fixture:CANARY_SECRET@127.0.0.1:5432/fixture" };
const logger = { event() {} };
test("runtime configuration has bounded immutable defaults and optional cache disabled", () => {
  const config = readRuntimeConfig(base);
  assert.equal(config.host, "127.0.0.1"); assert.equal(config.cache, null);
  assert.equal(config.startupTimeoutMs, 5000); assert.equal(config.shutdownTimeoutMs, 10000); assert.equal(config.readinessTimeoutMs, 2000);
  assert.equal(config.logLevel, "info"); assert.equal(config.database.ssl, false);
  assert.ok(Object.isFrozen(config)); assert.ok(Object.isFrozen(config.database));
});
test("explicit individual PostgreSQL credentials and verified TLS are accepted", () => {
  const config = readRuntimeConfig({ PGHOST: "127.0.0.1", PGDATABASE: "fixture", PGUSER: "fixture", PGPASSWORD: "CANARY_SECRET", PGPORT: "5433", PGSSL: "true" });
  assert.equal(config.database.port, 5433); assert.deepEqual(config.database.ssl, { rejectUnauthorized: true });
});
for (const overrides of [
  { DATABASE_URL: undefined }, { DATABASE_URL: "CANARY_SECRET" }, { DATABASE_URL: "postgresql://localhost/fixture" },
  { DATABASE_URL: "postgresql://u:p@localhost/" }, { DATABASE_URL: "postgresql://u:p@evil.test/fixture" },
  { DATABASE_URL: "postgresql://u:p@localhost/fixture?sslmode=no-verify" },
  { PGSSL: "TRUE" }, { PGSSL: "true", PGSSL_REJECT_UNAUTHORIZED: "false" }, { PGSSL: "true", DATABASE_SSL: "false" },
  { PGPORT: "oops", DATABASE_URL: undefined, PGHOST: "localhost", PGDATABASE: "x", PGUSER: "x", PGPASSWORD: "x" },
  { PGPOOL_MAX: "20garbage" }, { PGCONN_TIMEOUT: "0" }, { PGIDLE_TIMEOUT: "-1" },
  { ASI_STARTUP_TIMEOUT_MS: "0" }, { ASI_SHUTDOWN_TIMEOUT_MS: "30001" }, { ASI_READINESS_TIMEOUT_MS: "20garbage" },
  { LOG_LEVEL: "CANARY_SECRET" }, { LOG_LEVEL: "debug" }, { DEBUG_SQL: "true" }, { DEBUG_REDIS: "true" },
  { REDIS_URL: "http://localhost:6379" }, { REDIS_URL: "redis://evil.test:6379" },
  { REDIS_URL: "redis://localhost:0" }, { REDIS_URL: "redis://localhost:6379?password=CANARY_SECRET" },
  { REDIS_HOST: "localhost", REDIS_PORT: "6379oops" }, { REDIS_PASSWORD: "CANARY_SECRET" },
  { RATE_LIMIT_POINTS: "0" }, { RATE_LIMIT_DURATION: "60garbage" },
  { PGHOST: "localhost" }, { REDIS_URL: "redis://localhost:6379", REDIS_HOST: "localhost" },
]) {
  test(`invalid runtime config ${JSON.stringify(Object.keys(overrides))} fails without disclosure`, () => {
    assert.throws(() => readRuntimeConfig({ ...base, ...overrides }), { code: "INVALID_CONFIG", message: "Invalid backend runtime configuration" });
  });
}
test("off-host dependencies require TLS and retain certificate verification", () => {
  const config = readRuntimeConfig({ ...base, DATABASE_URL: "postgresql://u:p@db.example.test/fixture", PGSSL: "true", REDIS_URL: "rediss://cache.example.test:6379" });
  assert.deepEqual(config.database.ssl, { rejectUnauthorized: true }); assert.ok(config.cache.url.startsWith("rediss:"));
});
test("production does not implicitly load the developer environment file", () => {
  const env = { NODE_ENV: "production" }; loadEnvironment(env);
  assert.deepEqual(env, { NODE_ENV: "production" });
});
test("explicit environment file respects existing values and missing file fails safely", () => {
  const env = { NODE_ENV: "production", ASI_ENV_FILE: fileURLToPath(new URL("./fixtures/runtime.env", import.meta.url)), PORT: "9000" };
  loadEnvironment(env); assert.equal(env.PORT, "9000"); assert.equal(env.LOG_LEVEL, "warn");
  assert.throws(() => loadEnvironment({ NODE_ENV: "production", ASI_ENV_FILE: "CANARY_SECRET/nonexistent" }), { code: "INVALID_CONFIG", message: "Environment configuration unavailable" });
});
test("database driver owner uses only SELECT 1, propagates failures and closes once", async () => {
  const calls = [];
  class Pool extends EventEmitter {
    async query(sql) { calls.push(sql); return { rows: [{ alive: 1 }] }; }
    async end() { calls.push("end"); }
  }
  const owner = createDatabaseOwner({}, logger, Pool);
  await owner.initialize(); assert.equal(await owner.ready(), true);
  await Promise.all([owner.close(), owner.close()]); assert.equal(await owner.ready(), false);
  assert.deepEqual(calls, ["SELECT 1 AS alive", "SELECT 1 AS alive", "end"]);
});
test("database unready/throwing driver cannot report ready; close failure is visible", async () => {
  class Pool extends EventEmitter {
    async query() { throw new Error("CANARY_SECRET"); }
    async end() { throw new Error("CANARY_SECRET"); }
  }
  const owner = createDatabaseOwner({}, logger, Pool);
  assert.equal(await owner.ready(), false); await assert.rejects(owner.initialize(), { code: "DEPENDENCY_UNREADY" });
  await assert.rejects(owner.close(), /CANARY_SECRET/);
});
test("Redis factory has no import-time connect, uses explicit initialization and bounded no-retry ownership", async () => {
  const events = [];
  /** @type {import('ioredis').RedisOptions | undefined} */
  let options;
  class Redis extends EventEmitter {
    constructor(config) { super(); options = config; events.push("construct"); }
    status = "wait";
    async connect() { events.push("connect"); this.status = "ready"; }
    disconnect() { events.push("disconnect"); }
  }
  const owner = createRedisOwner({ host: "127.0.0.1", port: 6379, timeoutMs: 20 }, logger, Redis);
  assert.deepEqual(events, ["construct"]); assert.ok(options);
  assert.equal(options.retryStrategy(1), null); assert.equal(options.enableOfflineQueue, false);
  await owner.initialize(); await Promise.all([owner.close(), owner.close()]);
  assert.deepEqual(events, ["construct", "connect", "disconnect"]);
});
test("logger strictly allowlists event/context fields rather than serializing arbitrary errors/config", async () => {
  let output = "";
  const owned = createLogger({ logLevel: "info" }, { write(chunk) { output += chunk; } });
  owned.event("dependency.error", { category: "database", code: "RESOURCE_FAILED", error: new Error("CANARY_SECRET"), connectionString: "CANARY_SECRET" });
  owned.event("CANARY_SECRET", { requestId: "CANARY_SECRET" });
  owned.event("http.error", { method: "CANARY_SECRET", status: 500, requestId: "CANARY_SECRET" });
  await owned.close(); assert.doesNotMatch(output, /CANARY_SECRET|connectionString|stack/);
  assert.equal(output.trim().split("\n").length, 2);
});
test("application limiter owns and clears its actual expiry timers on repeated close", async () => {
  const timers = new Set();
  const hook = createHook({ init(id, type) { if (type === "Timeout") timers.add(id); }, destroy(id) { timers.delete(id); } });
  const owner = createRateLimiterOwner({ points: 3, duration: 60 });
  try {
    hook.enable(); let next = false;
    await owner.middleware({ path: "/health/live", ip: "127.0.0.1" }, {}, () => { next = true; });
    assert.equal(next, true); assert.ok(timers.size > 0);
    await Promise.all([owner.close(), owner.close()]);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(timers.size, 0);
  } finally { await owner.close(); hook.disable(); }
});
