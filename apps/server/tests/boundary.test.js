import { test } from "node:test";
import assert from "node:assert/strict";
import { request as nodeRequest, createServer } from "node:http";
import { connect } from "node:net";
import { Server } from "socket.io";
import { fixture, serve, request as fetchRequest, tcpAddress, responseHeaders } from "./helpers.js";
import { assertProblem } from "./problemHelper.js";
import { readConfig } from "../foundation/config.js";
import { createLifecycle } from "../foundation/lifecycle.js";
import { createHttpBoundary } from "../middleware/httpBoundary.js";
import { auditContext } from "../middleware/auditContext.js";
import { rateLimitResponse } from "../middleware/problem.js";

// Behavioral HTTP uses real Express/Engine.IO on temporary loopback ports; NO external owners.
function request(base, path, options = {}) {
  if (!options.headers?.Host) return fetchRequest(base, path, options);
  // Native fetch rewrites Host in this runtime. node:http transmits the adversarial value.
  return new Promise((resolve, reject) => {
    const req = nodeRequest(base + path, { ...options, headers: { Connection: "close", ...options.headers } }, res => {
      const chunks = [];
      res.on("data", chunk => chunks.push(chunk));
      res.on("error", reject);
      res.on("end", () => resolve(new Response(res.statusCode === 204 ? null : Buffer.concat(chunks), {
        status: res.statusCode, headers: responseHeaders(res.headers),
      })));
    });
    req.setTimeout(3000, () => req.destroy(new Error("Test request deadline")));
    req.on("error", reject); req.end(options.body);
  });
}
function raw(base, headers, path = "/health/live", version = "1.1") {
  return new Promise((resolve, reject) => {
    const socket = connect({ host: "127.0.0.1", port: Number(new URL(base).port) });
    let output = "";
    socket.setTimeout(3000, () => socket.destroy(new Error("Test socket deadline")));
    socket.on("error", reject);
    socket.on("data", data => { output += data; });
    socket.on("close", () => resolve(output));
    socket.on("connect", () => socket.write(`GET ${path} HTTP/${version}\r\n${headers}\r\nConnection: ${headers.includes("Upgrade: websocket") ? "Upgrade" : "close"}\r\n\r\n`));
  });
}

for (const host of ["0.0.0.0", "localhost", "::1", "192.168.1.2", "", "CANARY_SECRET", 123]) {
  test(`invalid/non-approved bind ${JSON.stringify(host)} fails before dependencies`, () => {
    assert.throws(() => readConfig({ ASI_HOST: host }), { code: "INVALID_CONFIG", message: "Invalid backend listener configuration" });
    assert.throws(() => createLifecycle({ app() {}, checkReady() {}, closeResources() {}, host, port: 8000 }), /configuration/);
  });
}
test("production defaults to IPv4 loopback and refuses ephemeral production ports", async t => {
  assert.equal(readConfig({ NODE_ENV: "production" }).host, "127.0.0.1");
  assert.throws(() => readConfig({ PORT: "0" }), { code: "INVALID_CONFIG" });
  const runtime = createLifecycle({ app: fixture().app, checkReady: async () => true, closeResources: async () => {}, host: "127.0.0.1", port: 0 });
  t.after(() => runtime.stop());
  await runtime.start();
  assert.equal(tcpAddress(runtime.server).address, "127.0.0.1");
});
for (const origin of ["*", "null", "file://", "sirona://app", "https://example.com", "http://evil.test", "http://localhost:0", "http://localhost:5173/path", "http://localhost:5173?secret=CANARY_SECRET", ""]) {
  test(`unapproved origin configuration ${origin} fails closed`, () => {
    assert.throws(() => readConfig({ ALLOWED_ORIGINS: origin }), { code: "INVALID_CONFIG", message: "Invalid backend origin configuration" });
  });
}
test("Vite defaults and explicit additional loopback origin are exact and immutable", () => {
  const config = readConfig({ PORT: "8123", ALLOWED_ORIGINS: "http://localhost:5174" });
  assert.ok(config.allowedOrigins.includes("http://localhost:5173"));
  assert.ok(config.allowedOrigins.includes("http://127.0.0.1:8123"));
  assert.ok(config.allowedOrigins.includes("http://localhost:5174"));
  assert.ok(Object.isFrozen(config.allowedOrigins));
  assert.ok(!config.allowedOrigins.includes("http://localhost:3001"));
  assert.ok(readConfig({ PORT: "80" }).allowedOrigins.includes("http://localhost"));
});
test("canonical throttling and dependency exceptions use retryable problems; legacy throttling retains its DTO", async t => {
  const f = fixture();
  f.routes.get("/fixture/unavailable", () => { throw Object.assign(new Error("CANARY_SECRET"), { status: 503 }); });
  f.routes.get("/fixture/unknown-status", () => { throw Object.assign(new Error("CANARY_SECRET"), { status: 450 }); });
  const base = await serve(t, f.app);
  await assertProblem(await request(base, "/fixture/unavailable"), 503, "CAPABILITY_UNAVAILABLE", "Internal server error");
  await assertProblem(await request(base, "/fixture/unknown-status"), 500, "INTERNAL_ERROR", "Internal server error");
  const throttled = await serve(t, fixture({ rateLimiter: (req, res) => rateLimitResponse(req, res, 2) }).app);
  const canonical = await request(throttled, "/health/live");
  await assertProblem(canonical, 429, "RATE_LIMITED", "Too many requests. Please slow down.");
  assert.equal(canonical.headers.get("retry-after"), "2");
  const legacy = await request(throttled, "/api/sessions");
  assert.equal(legacy.status, 429);
  assert.deepEqual(await legacy.json(), { success: false, message: "Too many requests. Please slow down.", retryAfterSeconds: 2 });
});
test("both approved Host aliases require the actual listening port", async t => {
  const base = await serve(t, fixture().app);
  for (const name of ["localhost", "127.0.0.1"]) {
    const output = await raw(base, `Host: ${name}:${new URL(base).port}`);
    assert.match(output, /^HTTP\/1.1 200/);
    assert.match(output, /\{"status":"live"\}/);
  }
});
for (const [name, host, status] of [
  ["malformed", "local/host", 400], ["hostname", "evil.test", 403],
  ["LAN", "192.168.1.20", 403], ["trailing dot", "localhost.", 403],
  ["wrong port", "127.0.0.1:1", 403], ["missing port", "localhost", 403],
]) {
  test(`Host rejects ${name} before probing readiness`, async t => {
    let probes = 0;
    const base = await serve(t, fixture({ checkDatabase: async () => { probes++; return true; } }).app);
    const res = await request(base, "/health/ready?CANARY_SECRET", { headers: { Host: host } });
    await assertProblem(res, status, status === 400 ? "INVALID_INPUT" : "POLICY_DENIED", status === 400 ? "Invalid Host header" : "Host is not allowed");
    assert.equal(probes, 0);
    assert.equal(res.headers.get("access-control-allow-origin"), null);
  });
}
test("HTTP/1.0 missing Host and duplicate Host are rejected safely", async t => {
  const base = await serve(t, fixture().app);
  for (const headers of ["", `Host: 127.0.0.1:${new URL(base).port}\r\nHost: evil.test`]) {
    const output = await raw(base, headers, "/health/live", "1.0");
    assert.match(output, /^HTTP\/1.1 400/);
    assert.match(output, /application\/problem\+json/);
    assert.doesNotMatch(output, /evil.test/);
  }
});
for (const origin of ["https://evil.test", "null", "file://", "http://127.0.0.1:5174", "http://127.0.0.1:5173.evil.test"]) {
  test(`unapproved Origin ${origin} cannot dispatch a legacy mutation`, async t => {
    const base = await serve(t, fixture().app);
    const res = await request(base, "/api/sessions", { method: "POST", headers: { Origin: origin } });
    await assertProblem(res, 403, "POLICY_DENIED", "Origin is not allowed");
    assert.equal(res.headers.get("access-control-allow-origin"), null);
    assert.equal(res.headers.get("access-control-allow-credentials"), null);
  });
}
test("missing Origin is accepted without synthesizing a CORS grant", async t => {
  const base = await serve(t, fixture().app);
  const res = await request(base, "/health/live");
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("access-control-allow-origin"), null);
});
test("approved credentialed preflight declares exact methods, headers and request ID exposure", async t => {
  const base = await serve(t, fixture().app);
  const res = await request(base, "/health/live", { method: "OPTIONS", headers: {
    Origin: "http://127.0.0.1:5173", "Access-Control-Request-Method": "PATCH",
    "Access-Control-Request-Headers": "Content-Type, X-Request-ID, X-CSRF-Token, Idempotency-Key, If-Match",
  } });
  assert.equal(res.status, 204);
  assert.equal(res.headers.get("access-control-allow-origin"), "http://127.0.0.1:5173");
  assert.equal(res.headers.get("access-control-allow-credentials"), "true");
  assert.equal(res.headers.get("access-control-allow-methods"), "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS");
  assert.equal(res.headers.get("access-control-allow-headers"), "Content-Type,Authorization,Cache-Control,Pragma,X-Request-ID,X-CSRF-Token,Idempotency-Key,If-Match,Last-Event-ID");
  assert.match(res.headers.get("vary"), /Origin/);
  const get = await request(base, "/health/live", { headers: { Origin: "http://127.0.0.1:5173" } });
  assert.equal(get.headers.get("access-control-expose-headers"), "X-Request-ID");
});
for (const extra of [{ "Access-Control-Request-Method": "TRACE" }, { "Access-Control-Request-Headers": "X-Evil" }, { Origin: "null" }]) {
  test(`preflight rejects ${JSON.stringify(extra)}`, async t => {
    const base = await serve(t, fixture().app);
    const res = await request(base, "/health/live", { method: "OPTIONS", headers: {
      Origin: "http://127.0.0.1:5173", "Access-Control-Request-Method": "GET", ...extra,
    } });
    await assertProblem(res, 403, "POLICY_DENIED", extra.Origin ? "Origin is not allowed" : "Preflight is not allowed");
    assert.equal(res.headers.get("access-control-allow-origin"), null);
  });
}
test("spoofed forwarding headers cannot change IP, protocol, hostname or audit peer", async t => {
  const f = fixture();
  // Reuse real audit middleware; fixture route observes Express-derived values only.
  f.routes.get("/fixture/proxy", auditContext, (req, res) => res.json({ ip: req.ip, protocol: req.protocol, hostname: req.hostname, audit: req.auditContext }));
  const base = await serve(t, f.app);
  const res = await request(base, "/fixture/proxy", { headers: { "X-Forwarded-For": "203.0.113.5", "X-Forwarded-Proto": "https", "X-Forwarded-Host": "evil.test" } });
  const body = await res.json();
  assert.equal(body.ip, "127.0.0.1"); assert.equal(body.audit.ip, "127.0.0.1");
  assert.equal(body.protocol, "http"); assert.equal(body.hostname, "127.0.0.1");
  assert.equal(body.audit.requestId, res.headers.get("x-request-id"));
});
test("generated request IDs are UUIDs, unique, and supplied UUID v4 propagates to safe logs/problems", async t => {
  const f = fixture(); const base = await serve(t, f.app);
  const first = await request(base, "/health/live"); const second = await request(base, "/health/live");
  assert.match(first.headers.get("x-request-id"), /^[0-9a-f-]{36}$/);
  assert.notEqual(first.headers.get("x-request-id"), second.headers.get("x-request-id"));
  const id = "a1b2c3d4-1234-4123-8123-123456789abc";
  const res = await request(base, "/fixture/error", { headers: { "X-Request-ID": id } });
  await assertProblem(res, 500, "INTERNAL_ERROR", "Internal server error");
  assert.equal(res.headers.get("x-request-id"), id);
  assert.deepEqual(f.errors, [{ event: "http.error", method: "GET", status: 500, requestId: id }]);
});
for (const id of ["CANARY_SECRET", "x".repeat(1024), "", "1234,evil"]) {
  test(`invalid request ID (${id.length} characters) gets fresh safe correlation`, async t => {
    const base = await serve(t, fixture().app);
    const res = await request(base, "/health/live", { headers: { "X-Request-ID": id } });
    await assertProblem(res, 400, "INVALID_INPUT", "Invalid request identifier");
    assert.notEqual(res.headers.get("x-request-id"), id);
  });
}
test("duplicate Origin and request ID headers cannot be smuggled", async t => {
  const base = await serve(t, fixture().app);
  const host = `Host: 127.0.0.1:${new URL(base).port}`;
  for (const extra of ["Origin: http://127.0.0.1:5173\r\nOrigin: http://127.0.0.1:5173", "X-Request-ID: a1b2c3d4-1234-4123-8123-123456789abc\r\nX-Request-ID: a1b2c3d4-1234-4123-8123-123456789abc"]) {
    const output = await raw(base, `${host}\r\n${extra}`);
    assert.match(output, /^HTTP\/1.1 (400|403)/); assert.match(output, /application\/problem\+json/);
  }
});
test("legacy central parser/errors/404 retain old shape; canonical /api/v1 does not gain an alias", async t => {
  const f = fixture();
  f.routes.get("/api/sessions/__test_error", () => { throw new Error("CANARY_SECRET"); });
  const base = await serve(t, f.app);
  for (const [path, options, status, message] of [
    ["/api/sessions/__test_error", {}, 500, "Internal server error"],
    ["/api/sessions/__missing", {}, 404, "Endpoint not found"],
    ["/api/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: '{"CANARY_SECRET":' }, 400, "Invalid JSON request"],
  ]) {
    const res = await request(base, path, options); assert.equal(res.status, status);
    assert.deepEqual(await res.json(), { success: false, message });
    assert.match(res.headers.get("x-request-id"), /^[0-9a-f-]{36}$/);
  }
  await assertProblem(await request(base, "/api/v1/sessions"), 404, "NOT_FOUND", "Endpoint not found");
});
test("security defaults apply to success, canonical failures and boundary rejection", async t => {
  const base = await serve(t, fixture().app);
  for (const [path, options] of [["/health/live", {}], ["/missing", {}], ["/health/live", { headers: { Origin: "null" } }]]) {
    const res = await request(base, path, options);
    assert.equal(res.headers.get("x-content-type-options"), "nosniff");
    assert.equal(res.headers.get("x-frame-options"), "DENY");
    assert.equal(res.headers.get("referrer-policy"), "no-referrer");
    assert.equal(res.headers.get("content-security-policy"), "default-src 'none';base-uri 'none';frame-ancestors 'none';form-action 'none'");
    assert.equal(res.headers.get("cross-origin-resource-policy"), "same-origin");
    assert.equal(res.headers.get("strict-transport-security"), null);
    assert.equal(res.headers.get("x-powered-by"), null);
  }
});
test("Engine.IO polling, preflight and websocket upgrade cannot bypass the shared boundary", async t => {
  const server = createServer(fixture().app);
  const io = new Server(server);
  io.engine.use(createHttpBoundary(["http://127.0.0.1:5173"]));
  t.after(() => new Promise(resolve => io.close(resolve)));
  await new Promise(resolve => server.listen(0, "127.0.0.1", () => resolve(undefined)));
  const base = `http://127.0.0.1:${tcpAddress(server).port}`;
  const path = "/socket.io/?EIO=4&transport=polling";
  const good = await request(base, path);
  assert.equal(good.status, 200); assert.match(await good.text(), /^0\{/);
  assert.match(good.headers.get("x-request-id"), /^[0-9a-f-]{36}$/);
  await assertProblem(await request(base, path, { headers: { Origin: "null" } }), 403, "POLICY_DENIED", "Origin is not allowed");
  await assertProblem(await request(base, path, { method: "OPTIONS", headers: { Host: "evil.test", Origin: "http://127.0.0.1:5173", "Access-Control-Request-Method": "GET" } }), 403, "POLICY_DENIED", "Host is not allowed");
  await new Promise((resolve, reject) => {
    const req = nodeRequest(base + "/socket.io/?EIO=4&transport=websocket", { headers: {
      Connection: "Upgrade", Upgrade: "websocket", Origin: "http://127.0.0.1:5173",
      "Sec-WebSocket-Version": "13", "Sec-WebSocket-Key": "dGhlIHNhbXBsZSBub25jZQ==",
    } });
    req.setTimeout(3000, () => req.destroy(new Error("Upgrade test deadline")));
    req.on("error", reject);
    req.on("response", res => { res.resume(); reject(new Error("Expected upgrade")); });
    req.on("upgrade", (res, socket) => {
      socket.destroy();
      try { assert.equal(res.statusCode, 101); const requestId = res.headers["x-request-id"]; assert.ok(typeof requestId === "string"); assert.match(requestId, /^[0-9a-f-]{36}$/); resolve(); }
      catch (error) { reject(error); }
    });
    req.end();
  });
  // Engine.IO's upgrade response adapter closes rejected sockets rather than writing a problem body.
  const denied = await raw(base, `Host: 127.0.0.1:${tcpAddress(server).port}\r\nOrigin: null\r\nUpgrade: websocket\r\nSec-WebSocket-Version: 13\r\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==`, "/socket.io/?EIO=4&transport=websocket");
  assert.doesNotMatch(denied, /101 Switching Protocols/);
});
