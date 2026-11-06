import { test } from "node:test";
import assert from "node:assert/strict";
import { fixture, serve, request } from "./helpers.js";
import { assertProblem } from "./problemHelper.js";

// BEHAVIORAL HTTP: real Express/middleware/listener, injected test-only dependencies; not DB integration/E2E.
test("liveness returns the exact public contract without querying dependencies", async t => {
  let queries = 0;
  const f = fixture({ checkDatabase: async () => { queries += 1; throw new Error("offline"); } });
  const base = await serve(t, f.app);
  const res = await request(base, "/health/live");
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type"), /application\/json/);
  assert.deepEqual(await res.json(), { status: "live" });
  assert.equal(queries, 0);
  assert.equal(f.cleanupCalls, 0);
});
test("HEAD liveness has status and headers but no body", async t => {
  const base = await serve(t, fixture().app);
  const res = await request(base, "/health/live", { method: "HEAD" });
  assert.equal(res.status, 200);
  assert.equal(await res.text(), "");
});
test("unsupported health mutation is rejected without dispatching any owner", async t => {
  let queries = 0;
  const base = await serve(t, fixture({ checkDatabase: async () => { queries += 1; return true; } }).app);
  const res = await request(base, "/health/live", { method: "POST" });
  assert.equal(res.status, 404);
  await assertProblem(res, 404, "NOT_FOUND", "Endpoint not found");
  assert.equal(queries, 0);
});
/** @type {Array<[string, () => unknown, number, boolean]>} */
const readinessCases = [
  ["ready dependency", async () => true, 200, true],
  ["unavailable dependency", async () => false, 503, false],
  ["thrown dependency failure", async () => { throw new Error("SELECT CANARY_SECRET"); }, 503, false],
  ["nonboolean dependency success", async () => "connected", 503, false],
  ["dependency deadline", () => new Promise(() => {}), 503, false],
];
for (const [name, probe, status, ready] of readinessCases) {
  test(`readiness: ${name} produces an exact truthful projection`, async t => {
    const f = fixture({ checkDatabase: probe, readinessTimeoutMs: 20 });
    const base = await serve(t, f.app);
    const res = await request(base, "/health/ready");
    assert.equal(res.status, status);
    assert.deepEqual(await res.json(), { ready });
    assert.equal(f.cleanupCalls, 0, "canonical readiness must not clean leases or mutate stores");
  });
}
test("dependency loss changes readiness without changing process liveness", async t => {
  let ready = true;
  const base = await serve(t, fixture({ checkDatabase: async () => ready }).app);
  assert.equal((await request(base, "/health/ready")).status, 200);
  ready = false;
  assert.equal((await request(base, "/health/ready")).status, 503);
  assert.deepEqual(await (await request(base, "/health/live")).json(), { status: "live" });
});
test("legacy health response stays compatible when the database is unavailable", async t => {
  const base = await serve(t, fixture({ checkDatabase: async () => false }).app);
  const res = await request(base, "/health");
  assert.equal(res.status, 503);
  assert.deepEqual(await res.json(), { status: "degraded", service: "sirona-core", db: false });
});
test("valid JSON reaches the injected router through the actual parser", async t => {
  const base = await serve(t, fixture().app);
  const res = await request(base, "/fixture/echo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: "hello" }) });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { received: { text: "hello" } });
});
test("malformed JSON returns safe 400 without body/stack leakage in response or logs", async t => {
  const f = fixture();
  const base = await serve(t, f.app);
  const res = await request(base, "/fixture/echo?CANARY_SECRET", { method: "POST", headers: { "Content-Type": "application/json" }, body: '{"CANARY_SECRET":' });
  assert.equal(res.status, 400);
  await assertProblem(res, 400, "INVALID_INPUT", "Invalid JSON request");
  assert.deepEqual(f.errors, [{ event: "http.error", method: "POST", status: 400, requestId: res.headers.get("x-request-id") }]);
});
test("unknown requests do not reflect sensitive URL/query data", async t => {
  const base = await serve(t, fixture().app);
  const res = await request(base, "/CANARY_SECRET?token=CANARY_SECRET");
  assert.equal(res.status, 404);
  await assertProblem(res, 404, "NOT_FOUND", "Endpoint not found");
});
for (const [path, status, message] of [
  ["/fixture/error", 500, "Internal server error"],
  ["/fixture/unique", 409, "A record with this unique identifier already exists."],
  ["/fixture/foreign", 400, "Referenced foreign entity does not exist."],
]) {
  test(`safe exception mapping ${path} preserves status with canonical safe problem`, async t => {
    const f = fixture();
    const base = await serve(t, f.app);
    const res = await request(base, path);
    assert.equal(res.status, status);
    await assertProblem(res, status, ({ 500: "INTERNAL_ERROR", 409: "STATE_CONFLICT", 400: "INVALID_INPUT" })[status], message);
    assert.deepEqual(f.errors, [{ event: "http.error", method: "GET", status, requestId: res.headers.get("x-request-id") }]);
  });
}
test("existing safe headers and configured-origin CORS are retained", async t => {
  const base = await serve(t, fixture().app);
  const res = await request(base, "/health/live", { headers: { Origin: "http://127.0.0.1:5173" } });
  assert.equal(res.headers.get("x-content-type-options"), "nosniff");
  assert.equal(res.headers.get("x-frame-options"), "DENY");
  assert.equal(res.headers.get("x-powered-by"), null);
  assert.equal(res.headers.get("access-control-allow-origin"), "http://127.0.0.1:5173");
  assert.equal(res.headers.get("access-control-allow-credentials"), "true");
});
