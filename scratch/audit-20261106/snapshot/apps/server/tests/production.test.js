import { test } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { createServer, get } from "node:http";
import { Router } from "express";
import { createBackend } from "../server.js";
import { createApp } from "../app.js";
import { createLogger } from "../foundation/logger.js";
import { productionFactories } from "../foundation/production.js";
import { activateRedisOwner, createRedisOwner, isRedisAvailable } from "../config/redis.js";
import { request, tcpAddress } from "./helpers.js";

// PRODUCTION COMPOSITION BEHAVIORAL: same supervisor, real HTTP, injected external owners. Not real DB integration.
export async function availablePort() {
  const server = createServer();
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", () => resolve(undefined)); });
  const port = tcpAddress(server).port;
  await new Promise(resolve => server.close(resolve));
  return port;
}
export function environment(port, extra = {}) {
  return { PORT: String(port), NODE_ENV: "production", DATABASE_URL: "postgresql://fixture:CANARY_SECRET@127.0.0.1:5432/fixture",
    ASI_STARTUP_TIMEOUT_MS: "2000", ASI_SHUTDOWN_TIMEOUT_MS: "250", ASI_READINESS_TIMEOUT_MS: "30", ...extra };
}
function harness(env, options = {}) {
  const events = [], counts = {}, records = [];
  const signals = new EventEmitter();
  /** @type {{ready: boolean | 'throw' | 'stall' | 'not-boolean', readyCalls: number}} */
  const state = { ready: true, readyCalls: 0 };
  const routes = Router();
  const owner = name => {
    counts[name] = { construct: 1, initialize: 0, close: 0 }; events.push(name + ".construct");
    return { async initialize() { counts[name].initialize++; events.push(name + ".initialize"); },
      async close() { counts[name].close++; events.push(name + ".close"); } };
  };
  const factories = {
    database() { return Object.assign(owner("database"), { async ready() {
      state.readyCalls++;
      if (state.ready === "throw") throw new Error("CANARY_SECRET sql /private/path");
      if (state.ready === "stall") return new Promise(() => {});
      return state.ready;
    } }); },
    cache() { return owner("cache"); },
    application() { return Object.assign(owner("application"), { routes, auditContext: (req, res, next) => next(),
      rateLimiter: (req, res, next) => next(), cleanExpiredLeases: async () => { throw new Error("Product cleanup must not run"); } }); },
    realtime() { return owner("realtime"); },
    ...options.factories,
  };
  let flushes = 0;
  const loggerFactory = options.loggerFactory ?? (() => ({ event(event, fields) { records.push({ event, ...fields }); },
    async close() { flushes++; events.push("logger.close"); } }));
  const runtime = createBackend(env, { factories, signals, loggerFactory });
  return { runtime, state, events, counts, records, signals, factories, routes, get flushes() { return flushes; } };
}
test("config is validated before logger or owner construction", () => {
  let made = 0;
  assert.throws(() => createBackend(environment(8000, { DATABASE_URL: "CANARY_SECRET" }), { loggerFactory() { made++; } }), { code: "INVALID_CONFIG" });
  assert.equal(made, 0);
});
test("production order, required readiness, HTTP contract and exactly-once reverse cleanup", async t => {
  const port = await availablePort(); const f = harness(environment(port, { REDIS_URL: "redis://127.0.0.1:6379" }));
  t.after(() => f.runtime.stop());
  assert.equal(f.runtime.start(), f.runtime.start()); await f.runtime.start();
  assert.deepEqual(f.events.slice(0, 8), ["database.construct", "database.initialize", "cache.construct", "cache.initialize", "application.construct", "application.initialize", "realtime.construct", "realtime.initialize"]);
  assert.ok(f.state.readyCalls >= 2);
  const base = `http://127.0.0.1:${port}`;
  assert.deepEqual(await (await request(base, "/health/live")).json(), { status: "live" });
  assert.deepEqual(await (await request(base, "/health/ready")).json(), { ready: true });
  let closes = 0; const actualClose = f.runtime.server.close.bind(f.runtime.server);
  f.runtime.server.close = (...args) => { closes++; return actualClose(...args); };
  assert.equal(f.runtime.stop(), f.runtime.stop()); await f.runtime.stop();
  assert.equal(closes, 1); assert.equal(f.runtime.server.listening, false); assert.equal(await f.runtime.ready(), false);
  assert.deepEqual(f.events.slice(-5), ["realtime.close", "application.close", "cache.close", "database.close", "logger.close"]);
  for (const count of Object.values(f.counts)) assert.equal(count.close, 1);
  assert.equal(f.flushes, 1); assert.equal(f.signals.listenerCount("SIGINT"), 0); assert.equal(f.signals.listenerCount("SIGTERM"), 0);
});
test("readiness follows current required owner truth, exceptions and bounded stalls", async t => {
  const port = await availablePort(); const f = harness(environment(port)); t.after(() => f.runtime.stop()); await f.runtime.start();
  /** @type {Array<boolean | 'throw' | 'stall'>} */
  const readinessStates = [true, false, "throw", "stall", true];
  for (const value of readinessStates) {
    f.state.ready = value;
    const res = await request(`http://127.0.0.1:${port}`, "/health/ready");
    assert.equal(res.status, value === true ? 200 : 503);
    assert.deepEqual(await res.json(), { ready: value === true });
  }
});
for (const stage of ["database.construct", "database.initialize", "database.ready", "application.construct", "application.initialize", "app", "realtime.construct", "realtime.initialize"]) {
  test(`production failure at ${stage} cleans every constructed owner without listening`, async () => {
    const port = await availablePort(); const f = harness(environment(port));
    const [resource, method] = stage.split(".");
    if (stage === "app") f.factories.app = () => { throw new Error("CANARY_SECRET"); };
    else {
      const previous = f.factories[resource];
      f.factories[resource] = ctx => {
        if (method === "construct") throw new Error("CANARY_SECRET");
        const result = previous(ctx);
        result[method] = async () => { throw new Error("CANARY_SECRET"); };
        return result;
      };
    }
    await assert.rejects(f.runtime.start());
    assert.equal(f.runtime.server?.listening ?? false, false);
    assert.ok(!f.records.some(r => r.event === "backend.listening"));
    for (const count of Object.values(f.counts)) assert.equal(count.close, 1);
    assert.equal(f.flushes, 1);
    assert.doesNotMatch(JSON.stringify(f.records), /CANARY_SECRET/);
  });
}
/** @type {Array<false | 'not-boolean'>} */
const nonReadyStates = [false, "not-boolean"];
for (const value of nonReadyStates) {
  test(`non-ready required owner (${value}) prevents application construction`, async () => {
    const f = harness(environment(await availablePort())); f.state.ready = value;
    await assert.rejects(f.runtime.start(), { code: "DEPENDENCY_UNREADY" });
    assert.equal(f.counts.application, undefined); assert.equal(f.counts.database.close, 1);
  });
}
test("required initialization timeout closes partial owner and prevents late listening", async () => {
  const f = harness(environment(await availablePort(), { ASI_STARTUP_TIMEOUT_MS: "30" }));
  /** @type {undefined | (() => void)} */
  let release;
  const previous = f.factories.database;
  f.factories.database = ctx => ({ ...previous(ctx), initialize: () => new Promise(resolve => { release = () => resolve(undefined); }) });
  await assert.rejects(f.runtime.start(), { code: "STARTUP_TIMEOUT" });
  assert.ok(release); release(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.counts.database.close, 1); assert.equal(f.counts.application, undefined);
  assert.equal(f.runtime.phase, "stopped");
});
test("occupied port fails production bind and cleans resources without touching existing listener", async t => {
  const occupied = createServer((req, res) => res.end("existing"));
  await new Promise(resolve => occupied.listen(0, "127.0.0.1", () => resolve(undefined)));
  t.after(() => new Promise(resolve => occupied.close(resolve)));
  const port = tcpAddress(occupied).port; const f = harness(environment(port));
  await assert.rejects(f.runtime.start(), { code: "EADDRINUSE" });
  assert.equal(occupied.listening, true); assert.equal(f.counts.database.close, 1);
  assert.equal(await (await request(`http://127.0.0.1:${port}`, "/")).text(), "existing");
});
for (const stage of ["construct", "initialize"]) {
  test(`optional cache ${stage} failure does not falsify required readiness or leak owner`, async t => {
    const port = await availablePort(); const f = harness(environment(port, { REDIS_URL: "redis://127.0.0.1:6379" }));
    const previous = f.factories.cache;
    f.factories.cache = ctx => {
      if (stage === "construct") throw new Error("CANARY_SECRET");
      return { ...previous(ctx), async initialize() { throw new Error("CANARY_SECRET"); } };
    };
    t.after(() => f.runtime.stop()); await f.runtime.start(); assert.equal(await f.runtime.ready(), true);
    if (stage === "initialize") assert.equal(f.counts.cache.close, 1);
    await f.runtime.stop(); if (stage === "initialize") assert.equal(f.counts.cache.close, 1);
    assert.ok(f.records.some(r => r.event === "dependency.unavailable" && r.category === "cache"));
  });
}
for (const signal of ["SIGINT", "SIGTERM"]) {
  test(`${signal} event initiates a single bounded shutdown, including repeat events`, async () => {
    const f = harness(environment(await availablePort())); await f.runtime.start();
    f.signals.emit(signal); f.signals.emit(signal); await f.runtime.stop();
    assert.equal(f.runtime.phase, "stopped"); for (const count of Object.values(f.counts)) assert.equal(count.close, 1);
  });
}
test("optional cache initialization deadline closes its owner before continuing", async t => {
  const f = harness(environment(await availablePort(), { REDIS_URL: "redis://127.0.0.1:6379" }));
  const original = f.factories.cache;
  f.factories.cache = ctx => ({ ...original(ctx), initialize: () => new Promise(() => {}) });
  t.after(() => f.runtime.stop()); await f.runtime.start();
  assert.equal(f.counts.cache.close, 1); assert.equal(await f.runtime.ready(), true);
  await f.runtime.stop(); assert.equal(f.counts.cache.close, 1);
});
test("required dependency loss after initialization is rechecked before HTTP bind", async () => {
  const f = harness(environment(await availablePort())); const original = f.factories.realtime;
  f.factories.realtime = ctx => {
    const owner = original(ctx); const initialize = owner.initialize;
    owner.initialize = async () => { await initialize(); f.state.ready = false; };
    return owner;
  };
  await assert.rejects(f.runtime.start(), { code: "DEPENDENCY_UNREADY" });
  assert.equal(f.runtime.server.listening, false); assert.equal(f.counts.database.close, 1);
});
test("signal during required startup cancels before application/listen and clears handlers", async () => {
  const f = harness(environment(await availablePort())); const previous = f.factories.database;
  let initialized; const started = new Promise(resolve => { initialized = resolve; });
  f.factories.database = ctx => ({ ...previous(ctx), initialize() { initialized(); return new Promise(() => {}); } });
  const starting = f.runtime.start(); await started; f.signals.emit("SIGINT");
  await assert.rejects(starting, { code: "STARTUP_CANCELLED" });
  assert.equal(f.counts.database.close, 1); assert.equal(f.counts.application, undefined); assert.equal(f.signals.listenerCount("SIGINT"), 0);
});
test("signal inside asynchronous bind cancels the pending listener without a late orphan", async () => {
  const f = harness(environment(await availablePort())); const original = f.factories.realtime;
  f.factories.realtime = context => {
    const listen = context.server.listen.bind(context.server);
    context.server.listen = (...args) => { const result = listen(...args); f.signals.emit("SIGINT"); return result; };
    return original(context);
  };
  await assert.rejects(f.runtime.start(), { code: "STARTUP_CANCELLED" });
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(f.runtime.server.listening, false); assert.equal(f.counts.database.close, 1);
});
for (const resource of ["database", "cache", "application", "realtime", "logger"]) {
  for (const mode of ["throw", "stall"]) {
    test(`${resource} ${mode} during shutdown stays bounded and other owners close once`, async () => {
      const f = harness(environment(await availablePort(), { ASI_SHUTDOWN_TIMEOUT_MS: "35", REDIS_URL: "redis://127.0.0.1:6379" }));
      if (resource === "logger") {
        // Inject at the constructed logger boundary without changing production composition.
        const original = f.runtime;
        await original.stop();
        const log = { event() {}, close: () => mode === "stall" ? new Promise(() => {}) : Promise.reject(new Error("CANARY_SECRET")) };
        const runtime = createBackend(environment(await availablePort(), { ASI_SHUTDOWN_TIMEOUT_MS: "35" }), {
          factories: f.factories, signals: f.signals, loggerFactory: () => log,
        });
        await runtime.start(); await assert.rejects(runtime.stop(), { code: "CLEANUP_FAILED" });
        assert.equal(runtime.server.listening, false);
      } else {
        const previous = f.factories[resource];
        f.factories[resource] = ctx => {
          const owner = previous(ctx); const actual = owner.close;
          owner.close = async () => { await actual(); if (mode === "stall") return new Promise(() => {}); throw new Error("CANARY_SECRET"); };
          return owner;
        };
        await f.runtime.start(); await assert.rejects(f.runtime.stop(), { code: "CLEANUP_FAILED" });
        assert.equal(f.runtime.server.listening, false);
      }
      for (const count of Object.values(f.counts)) assert.equal(count.close, 1);
    });
  }
}
test("shutdown drains active HTTP and immediately projects unready", async () => {
  const port = await availablePort(); const f = harness(environment(port));
  let entered;
  /** @type {undefined | (() => void)} */
  let release;
  const enteredPromise = new Promise(resolve => { entered = resolve; });
  f.routes.get("/fixture/active", async (req, res) => { entered(); await new Promise(resolve => { release = () => resolve(undefined); }); res.end("drained"); });
  await f.runtime.start();
  const response = request(`http://127.0.0.1:${port}`, "/fixture/active"); await enteredPromise;
  const stopping = f.runtime.stop(); assert.equal(await f.runtime.ready(), false); assert.ok(release); release();
  assert.equal(await (await response).text(), "drained"); await stopping;
  assert.equal(f.runtime.server.listening, false);
});
test("stalled active HTTP is destroyed on the shutdown deadline", async () => {
  const port = await availablePort(); const f = harness(environment(port, { ASI_SHUTDOWN_TIMEOUT_MS: "35" }));
  let entered; const waiting = new Promise(resolve => { entered = resolve; });
  f.routes.get("/fixture/hang", () => entered()); await f.runtime.start();
  const client = get(`http://127.0.0.1:${port}/fixture/hang`); client.on("error", () => {});
  await waiting; await assert.rejects(f.runtime.stop(), { code: "CLEANUP_FAILED" });
  client.destroy(); assert.equal(f.runtime.server.listening, false); assert.equal(f.counts.database.close, 1);
});
test("unavailable real legacy transport still closes without competing for HTTP ownership", async t => {
  const port = await availablePort(); const f = harness(environment(port)); f.factories.realtime = productionFactories.realtime;
  t.after(() => f.runtime.stop());
  await f.runtime.start(); let closes = 0; const close = f.runtime.server.close.bind(f.runtime.server);
  f.runtime.server.close = (...args) => { closes++; return close(...args); };
  const response = await request(`http://127.0.0.1:${port}`, "/socket.io/?EIO=4&transport=polling");
  // R09 deliberately withdraws production transport admission; R03 retains its
  // positive isolated transport fixture. HTTP ownership assertions stay intact.
  assert.equal(response.status, 503); assert.equal((await response.json()).code, "CAPABILITY_UNAVAILABLE");
  await f.runtime.stop(); assert.equal(closes, 1); assert.equal(f.runtime.server.listening, false);
});
test("Stage 01 production does not duplicate a ready cache for unavailable realtime", async t => {
  let duplicates = 0, disconnects = 0;
  class Cache extends EventEmitter {
    constructor(_config) { super(); }
    status = "wait";
    async connect() { this.status = "ready"; }
    duplicate() { duplicates++; throw new Error("Unqualified realtime subscriber constructed"); }
    disconnect() { disconnects++; this.status = "end"; }
  }
  const cache = createRedisOwner({ host: "127.0.0.1", port: 6379, timeoutMs: 20 }, { event() {} }, Cache);
  const f = harness(environment(await availablePort(), { REDIS_URL: "redis://127.0.0.1:6379" }));
  f.factories.cache = () => { activateRedisOwner(cache); return cache; };
  f.factories.realtime = productionFactories.realtime;
  t.after(async () => { await f.runtime.stop(); await cache.close(); });
  await f.runtime.start();
  assert.equal(isRedisAvailable(), true);
  assert.equal(duplicates, 0);
  const base = `http://127.0.0.1:${tcpAddress(f.runtime.server).port}`;
  assert.deepEqual(await (await request(base, "/health/live")).json(), { status: "live" });
  const response = await request(base, "/socket.io/?EIO=4&transport=polling");
  assert.equal(response.status, 503);
  assert.equal((await response.json()).code, "CAPABILITY_UNAVAILABLE");
  await f.runtime.stop();
  assert.equal(disconnects, 1);
  assert.equal(isRedisAvailable(), false);
});

test("actual Pino lifecycle/request logs omit arbitrary config/errors/SQL/body canaries", async () => {
  let output = ""; const loggerFactory = config => createLogger(config, { write(chunk) { output += chunk; } });
  const port = await availablePort(); const f = harness(environment(port), { loggerFactory });
  f.factories.app = options => {
    assert.equal(typeof options.httpLogger, "function");
    return createApp(options);
  };
  f.routes.get("/fixture/error", () => { throw new Error("CANARY_SECRET SQL /private/path"); });
  await f.runtime.start();
  const id = "a1b2c3d4-1234-4123-8123-123456789abc";
  const res = await request(`http://127.0.0.1:${port}`, "/fixture/error?CANARY_SECRET", { headers: { "X-Request-ID": id, Authorization: "Bearer CANARY_SECRET" } });
  assert.equal(res.status, 500); await res.text(); await f.runtime.stop();
  assert.doesNotMatch(output, /CANARY_SECRET|postgresql:|Authorization|private\/path|SQL|password/);
  const logs = output.trim().split("\n").map(line => JSON.parse(line));
  assert.ok(logs.some(r => r.event === "backend.listening"));
  assert.ok(logs.some(r => r.event === "backend.stopped"));
  assert.ok(logs.some(r => r.event === "http.error" && r.requestId === id));
});
