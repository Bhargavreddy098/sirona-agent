import { before, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { stage01Routes } from "../foundation/admission.js";
import { routeInventory } from "./routeInventory.js";

let evidence;
before(() => {
  const child = spawnSync(process.execPath, [fileURLToPath(new URL("./fixtures/admission-probe.js", import.meta.url))], {
    encoding: "utf8", timeout: 30000,
    env: { SystemRoot: process.env.SystemRoot, NODE_ENV: "production", R04_TEST_SCENARIO: "ready" },
  });
  assert.equal(child.error, undefined);
  assert.equal(child.status, 0, child.stderr);
  assert.equal(child.stderr, "");
  evidence = JSON.parse(child.stdout);
});

for (const allowed of stage01Routes) for (const method of allowed.methods) {
  test(`production admits qualified ${method} ${allowed.path}`, () => {
    const result = evidence.foundation.find(row => row.method === method && row.path === allowed.path);
    assert.ok(result);
    if (method === "HEAD") assert.equal(result.body, null);
    else if (allowed.path === "/health/live") assert.deepEqual(result.body, { status: "live" });
    else if (allowed.path === "/health/ready") assert.deepEqual(result.body, { ready: true });
    else assert.deepEqual(result.body, { status: "ok", service: "sirona-core", db: true });
  });
}
for (const route of routeInventory()) {
  if (stage01Routes.some(allowed => allowed.path === route.path && allowed.methods.includes(route.method))) continue;
  test(`production denies ${route.method} ${route.path} before legacy handler/effects`, () => {
    const wirePath = route.path.replace(/:[A-Za-z0-9_]+/g, "fixture") + "?path=fixture-target";
    assert.ok(evidence.denied.some(row => row.path === wirePath && row.method === route.method && row.status === 503 && row.code === "CAPABILITY_UNAVAILABLE"));
    assert.equal(evidence.stats.handlers, 0);
  });
}
test("explicit production allowlist is frozen and has no wildcard or write method", () => {
  assert.ok(Object.isFrozen(stage01Routes));
  assert.deepEqual(stage01Routes.map(route => route.path), ["/health/live", "/health/ready", "/health"]);
  for (const route of stage01Routes) {
    assert.ok(Object.isFrozen(route) && Object.isFrozen(route.methods));
    assert.match(route.path, /^\/health(?:\/live|\/ready)?$/);
    assert.deepEqual(route.methods, ["GET", "HEAD"]);
  }
  assert.throws(() => Reflect.apply(Array.prototype.push, stage01Routes, [{ path: "/future" }]), TypeError);
});
test("tokenless, injected guest, bearer, cookie, worker and override inputs cannot grant admission", () => {
  assert.deepEqual(evidence.identities, ["tokenless", "injected guest", "bearer", "cookie", "worker", "method override"]);
  assert.equal(evidence.stats.handlers, 0); assert.equal(evidence.stats.productQueries, 0);
});
test("legacy API mounts are absent and canonical tooling stays blocked at Stage 01", () => {
  const inventory = routeInventory();
  assert.ok(!inventory.some(row => ["/api/auth", "/api/sessions", "/api/tools", "/api/files", "/api/git", "/api/settings", "/api/audit", "/api/approvals"].some(prefix => row.path === prefix || row.path.startsWith(prefix + "/"))));
  assert.equal(evidence.stats.handlers, 0);
  assert.equal(evidence.stats.fs, 0); assert.equal(evidence.stats.process, 0);
  for (const group of [evidence.stats.fsPrimitives, evidence.stats.processPrimitives]) {
    for (const count of Object.values(group)) assert.equal(count, 0);
  }
});
test("implicit HEAD on every unqualified GET stays denied before any handler", () => {
  for (const route of routeInventory().filter(row => row.method === "GET" && !stage01Routes.some(allowed => allowed.path === row.path))) {
    const path = route.path.replace(/:[A-Za-z0-9_]+/g, "fixture") + "?path=fixture-target";
    assert.ok(evidence.denied.some(row => row.path === path && row.method === "HEAD" && row.status === 503));
  }
  assert.equal(evidence.stats.handlers, 0);
});
test("canonical unavailable response preserves a supplied valid request ID", () => {
  assert.equal(evidence.correlationPreserved, true);
});
test("provider, external request, product query and lease-cleanup tripwires stay zero", () => {
  for (const key of ["provider", "external", "productQueries", "cleanup"]) assert.equal(evidence.stats[key], 0);
});
test("hot-registering a new capability or shadow health route grants no handler admission", () => {
  assert.ok(evidence.denied.some(row => row.path === "/future/host"));
  assert.equal(evidence.stats.future, 0); assert.equal(evidence.stats.shadow, 0);
});
test("case, encoded, trailing, double-slash and unknown paths remain unavailable", () => {
  for (const path of ["/HEALTH/live", "/health/live/", "/%68ealth/live", "//health/live", "/health/live;tool", "/api/upload", "/api/v1/future"]) {
    assert.ok(evidence.denied.some(row => row.path === path && row.status === 503));
  }
});
test("preflights and unsupported health methods cannot bypass capability admission", () => {
  assert.equal(evidence.denied.filter(row => row.method === "OPTIONS").length, 3);
  assert.ok(evidence.denied.some(row => row.path === "/health/live" && row.method === "POST"));
});
test("Engine.IO polling, event submission and websocket upgrade never establish privileged realtime", () => {
  assert.ok(evidence.upgrade.closed || evidence.upgrade.status === 503);
  assert.equal(evidence.stats.connections, 0); assert.equal(evidence.stats.approvals, 0);
});
