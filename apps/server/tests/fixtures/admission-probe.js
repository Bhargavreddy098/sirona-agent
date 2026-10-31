// Isolated R09 probe: actual production composition, real HTTP/Engine.IO,
// SELECT-1-only external driver and canonical tool/provider tripwires.
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { createServer, request as httpRequest } from "node:http";
import { routeInventory } from "../routeInventory.js";
import { tcpAddress } from "../helpers.js";

const stats = { handlers: 0, fs: 0, process: 0, provider: 0, external: 0, cleanup: 0, productQueries: 0,
  future: 0, shadow: 0, connections: 0, approvals: 0,
  fsPrimitives: { readFile: 0, readFileSync: 0, writeFile: 0, writeFileSync: 0, rm: 0, rmSync: 0,
    rename: 0, renameSync: 0, readdirSync: 0, statSync: 0, existsSync: 0, mkdirSync: 0 },
  processPrimitives: { exec: 0, execFile: 0, spawn: 0 } };
globalThis.r09Stats = stats;
const driver = new URL("./pgDriver.js", import.meta.url).href;
registerHooks({ resolve(specifier, context, next) {
  if (specifier === "pg" && context.parentURL?.endsWith("/config/db.js")) return { url: driver, shortCircuit: true };
  return next(specifier, context);
} });
const originalFetch = globalThis.fetch;
globalThis.fetch = (input, options) => {
  const target = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
  if (target.hostname !== "127.0.0.1") { stats.external++; throw new Error("external request tripwire"); }
  return originalFetch(input, options);
};

// Canonical sandboxed tool execution must never run under Stage 01 admission.
const { ToolRuntimeService } = await import("../../services/toolRuntimeService.js");
ToolRuntimeService.invokeTool = async () => { stats.handlers++; throw new Error("tool runtime tripwire"); };
const { AIService } = await import("../../services/aiService.js");
AIService.streamTurn = async () => { stats.provider++; throw new Error("provider tripwire"); };
const { TurnLease } = await import("../../model/TurnLease.js");
TurnLease.cleanExpired = async () => { stats.cleanup++; throw new Error("cleanup tripwire"); };
const pg = (await import("./pgDriver.js")).default;
const query = pg.Pool.prototype.query;
pg.Pool.prototype.query = function (sql) { if (sql !== "SELECT 1 AS alive") stats.productQueries++; return query.call(this, sql); };

const { createBackend } = await import("../../server.js");
const { productionFactories } = await import("../../foundation/production.js");
const { createApp } = await import("../../app.js");
const { stage01Admission, stage01Routes } = await import("../../foundation/admission.js");
const { getIO } = await import("../../services/socket.js");
const reservation = createServer();
await new Promise(resolve => reservation.listen(0, "127.0.0.1", () => resolve(undefined)));
const port = tcpAddress(reservation).port;
await new Promise(resolve => reservation.close(resolve));
const runtime = createBackend({ NODE_ENV: "production", PORT: String(port),
  DATABASE_URL: "postgresql://fixture:fixture@127.0.0.1/fixture", ASI_STARTUP_TIMEOUT_MS: "5000", ASI_SHUTDOWN_TIMEOUT_MS: "1000" }, {
  loggerFactory: () => ({ event() {}, async close() {} }),
  factories: { ...productionFactories, app(options) {
    assert.equal(options.admission, stage01Admission, "actual production application must own admission");
    const app = createApp(options);
    // Explicit test injection proves even an already-populated guest is denied.
    return (req, res) => {
      if (req.headers["x-fixture-guest"] === "true") req.user = { is_local: true, id: null };
      return app(req, res);
    };
  } },
});
const base = `http://127.0.0.1:${port}`;
const results = [];
async function denied(path, method = "GET", headers = {}, body = undefined) {
  const options = { method, headers: { Connection: "close", ...headers }, signal: AbortSignal.timeout(3000) };
  if (body !== undefined && !["GET", "HEAD"].includes(method)) Object.assign(options, { body });
  const response = await fetch(base + path, options);
  assert.equal(response.status, 503, `${method} ${path}`);
  assert.match(response.headers.get("content-type"), /application\/problem\+json/);
  if (method === "HEAD") {
    assert.equal(await response.text(), "");
    assert.match(response.headers.get("x-request-id"), /^[0-9a-f-]{36}$/);
    results.push({ method, path, status: response.status, code: null });
    return;
  }
  const problem = await response.json();
  assert.equal(problem.code, "CAPABILITY_UNAVAILABLE");
  assert.equal(problem.detail, "Capability is not qualified");
  assert.equal(problem.requestId, response.headers.get("x-request-id"));
  if (headers["X-Request-ID"]) assert.equal(problem.requestId, headers["X-Request-ID"]);
  assert.deepEqual(Object.keys(problem).sort(), ["code", "detail", "requestId", "retryable", "status", "title", "type"]);
  assert.doesNotMatch(JSON.stringify(problem), /CANARY|password|command|fixture-target/);
  results.push({ method, path, status: response.status, code: problem.code });
}
try {
  await runtime.start();
  const io = getIO();
  io.on("connection", socket => { stats.connections++; socket.on("approval:respond", () => stats.approvals++); });
  const foundation = [];
  for (const route of stage01Routes) {
    for (const method of route.methods) {
      const response = await fetch(base + route.path, { method, signal: AbortSignal.timeout(3000) });
      assert.equal(response.status, 200);
      if (method === "GET") foundation.push({ method, path: route.path, body: await response.json() });
      else { assert.equal(await response.text(), ""); foundation.push({ method, path: route.path, body: null }); }
    }
  }
  const inventory = routeInventory();
  for (const route of inventory) {
    if (stage01Routes.some(allowed => allowed.path === route.path && allowed.methods.includes(route.method))) continue;
    const path = route.path.replace(/:[A-Za-z0-9_]+/g, "fixture") + "?path=fixture-target";
    const body = ["GET", "HEAD"].includes(route.method) ? undefined : JSON.stringify({ tool_name: "run_command", args: { command: "CANARY" }, path: "fixture-target", content: "fixture", prompt: "fixture", prompt_id: "fixture", approved: true, email: "fixture@example.invalid", password: "fixture-password" });
    await denied(path, route.method, { "Content-Type": "application/json" }, body);
    if (route.method === "GET") await denied(path, "HEAD");
  }
  const registry = (await import("../../routes/index.js")).default;
  registry.all("/future/:capability", () => { stats.future++; throw new Error("new route tripwire"); });
  registry.get("/health/live", () => { stats.shadow++; throw new Error("health shadow tripwire"); });
  await denied("/future/host", "POST");
  assert.equal((await fetch(base + "/health/live")).status, 200);
  const identities = [
    { name: "tokenless", headers: {} }, { name: "injected guest", headers: { "x-fixture-guest": "true" } },
    { name: "bearer", headers: { Authorization: "Bearer CANARY" } }, { name: "cookie", headers: { Cookie: "token=CANARY" } },
    { name: "worker", headers: { "X-Worker-Token": "CANARY" } }, { name: "method override", headers: { "X-HTTP-Method-Override": "GET" } },
  ];
  for (const identity of identities) {
    await denied("/api/tools/execute", "POST", identity.headers);
  }
  await denied("/api/tools/execute", "POST", { "X-Request-ID": "a1b2c3d4-1234-4123-8123-123456789abc" });
  for (const tool of ["read_file", "write_file", "run_command"]) {
    await denied("/v1/execute", "POST", { "Content-Type": "application/json" }, JSON.stringify({ tool_name: tool, args: { path: "fixture-target", content: "CANARY", command: "CANARY" } }));
  }
  await denied("/api/tools/execute", "POST", { "Content-Type": "application/json" }, "{CANARY-invalid-json");
  for (const path of ["/HEALTH/live", "/health/live/", "/%68ealth/live", "//health/live", "/health/live;tool", "/api/upload", "/api/files/download", "/api/notify", "/api/v1/future"]) await denied(path);
  for (const path of ["/health/live", "/api/tools/execute", "/socket.io/?EIO=4&transport=polling"]) {
    await denied(path, "OPTIONS", { Origin: "http://127.0.0.1:5173", "Access-Control-Request-Method": "POST" });
  }
  await denied("/health/live", "POST");
  await denied("/socket.io/?EIO=4&transport=polling");
  await denied("/socket.io/?EIO=4&transport=polling", "POST", {}, '42["approval:respond",{}]');
  const upgrade = await new Promise((resolve, reject) => {
    const req = httpRequest(base + "/socket.io/?EIO=4&transport=websocket", { headers: { Connection: "Upgrade", Upgrade: "websocket", "Sec-WebSocket-Version": "13", "Sec-WebSocket-Key": "dGhlIHNhbXBsZSBub25jZQ==" } });
    req.on("upgrade", (_res, socket) => { socket.destroy(); reject(new Error("upgrade admitted")); });
    req.on("response", res => { res.resume(); resolve({ status: res.statusCode }); });
    req.on("error", error => { if ("code" in error && error.code === "ECONNRESET") resolve({ closed: true }); else reject(error); });
    req.setTimeout(3000, () => req.destroy(new Error("upgrade deadline"))); req.end();
  });
  /** @type {Array<[Record<string, string>, number]>} */
  const adversarialCases = [[{ Origin: "null" }, 403], [{ "X-Request-ID": "CANARY" }, 400]];
  for (const [headers, status] of adversarialCases) {
    const response = await fetch(base + "/api/tools/execute", { method: "POST", headers, signal: AbortSignal.timeout(3000) });
    assert.equal(response.status, status); await response.arrayBuffer();
  }
  for (const [name, count] of Object.entries(stats)) if (typeof count === "number") assert.equal(count, 0, name);
  for (const group of [stats.fsPrimitives, stats.processPrimitives]) for (const count of Object.values(group)) assert.equal(count, 0);
  process.stdout.write(JSON.stringify({ foundation, identities: identities.map(row => row.name), correlationPreserved: true,
    inventoryRoutes: inventory.length, denied: results, upgrade, stats }));
} finally { await runtime.stop(); }
