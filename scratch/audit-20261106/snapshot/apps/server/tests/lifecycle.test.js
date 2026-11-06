import { test } from "node:test";
import assert from "node:assert/strict";
import { get } from "node:http";
import { createLifecycle } from "../foundation/lifecycle.js";
import { fixture, serve, request, tcpAddress } from "./helpers.js";

// BEHAVIORAL: actual owned HTTP listener; no database/provider/Redis/worker imports.
test("unavailable startup rejects, never listens, and closes its owners once", async () => {
  let closed = 0;
  const runtime = createLifecycle({ app: fixture().app, checkReady: async () => false,
    closeResources: async () => { closed += 1; }, host: "127.0.0.1", port: 0 });
  await assert.rejects(runtime.start(), { code: "DEPENDENCY_UNREADY" });
  assert.equal(runtime.server.listening, false);
  assert.equal(runtime.server.address(), null);
  await runtime.stop();
  assert.equal(closed, 1);
});
test("thrown startup failure stays visible and cleanup runs", async () => {
  const failure = new Error("injected dependency failure");
  let closed = false;
  const runtime = createLifecycle({ app: fixture().app, checkReady: async () => { throw failure; },
    closeResources: async () => { closed = true; }, host: "127.0.0.1", port: 0 });
  await assert.rejects(runtime.start(), error => error === failure);
  assert.equal(closed, true);
  assert.equal(runtime.server.listening, false);
});
test("a nonreturning readiness owner has a bounded startup deadline", async () => {
  let closed = false;
  const runtime = createLifecycle({ app: fixture().app, checkReady: () => new Promise(() => {}),
    closeResources: async () => { closed = true; }, host: "127.0.0.1", port: 0, startupTimeoutMs: 20 });
  await assert.rejects(runtime.start(), { code: "STARTUP_TIMEOUT" });
  assert.equal(closed, true);
  assert.equal(runtime.server.listening, false);
});
test("occupied port rejects startup without closing the other listener", async t => {
  const base = await serve(t, fixture().app);
  const port = Number(new URL(base).port);
  let closed = 0;
  const runtime = createLifecycle({ app: fixture().app, checkReady: async () => true,
    closeResources: async () => { closed += 1; }, host: "127.0.0.1", port });
  await assert.rejects(runtime.start(), { code: "EADDRINUSE" });
  assert.equal(runtime.server.listening, false);
  assert.equal(closed, 1);
  assert.equal((await request(base, "/health/live")).status, 200);
});
test("concurrent start/stop are idempotent and successful startup actually serves HTTP", async t => {
  let checks = 0;
  let closed = 0;
  let quiesced = 0;
  const runtime = createLifecycle({ app: fixture().app, checkReady: async () => { checks += 1; return true; },
    closeResources: async () => { closed += 1; }, beforeClose: async () => { quiesced += 1; }, host: "127.0.0.1", port: 0 });
  t.after(() => runtime.stop());
  const first = runtime.start();
  assert.equal(first, runtime.start());
  await first;
  assert.equal(checks, 1);
  assert.equal(tcpAddress(runtime.server).address, "127.0.0.1");
  const base = `http://127.0.0.1:${tcpAddress(runtime.server).port}`;
  assert.deepEqual(await (await request(base, "/health/live")).json(), { status: "live" });
  const stop = runtime.stop();
  assert.equal(stop, runtime.stop());
  await stop;
  assert.equal(runtime.server.listening, false);
  assert.equal(closed, 1);
  assert.equal(quiesced, 1);
  await assert.rejects(runtime.start(), /already stopped/);
});
test("resource cleanup failure is not swallowed", async () => {
  const failure = new Error("cleanup failed");
  const runtime = createLifecycle({ app: fixture().app, checkReady: async () => true,
    closeResources: async () => { throw failure; }, host: "127.0.0.1", port: 0 });
  await assert.rejects(runtime.stop(), error => error === failure);
  assert.equal(runtime.server.listening, false);
});
test("hung before-close hook is bounded and still closes listener/resources", async () => {
  let closed = 0;
  const runtime = createLifecycle({ app: fixture().app, checkReady: async () => true,
    beforeClose: () => new Promise(() => {}), closeResources: async () => { closed += 1; },
    host: "127.0.0.1", port: 0, shutdownTimeoutMs: 20 });
  await runtime.start();
  await assert.rejects(runtime.stop(), { code: "SHUTDOWN_TIMEOUT" });
  assert.equal(runtime.server.listening, false);
  assert.equal(closed, 1);
});
test("shutdown deadline closes stalled HTTP work and reports timeout", async t => {
  const entered = Promise.withResolvers();
  let closed = 0;
  const runtime = createLifecycle({ app: () => { entered.resolve(); }, checkReady: async () => true,
    closeResources: async () => { closed += 1; }, host: "127.0.0.1", port: 0, shutdownTimeoutMs: 20 });
  await runtime.start();
  t.after(async () => { if (runtime.server.listening) { runtime.server.closeAllConnections(); await runtime.stop().catch(error => { if (error.code !== "SHUTDOWN_TIMEOUT") throw error; }); } });
  const disconnected = Promise.withResolvers();
  const req = get(`http://127.0.0.1:${tcpAddress(runtime.server).port}/`, response => { response.resume(); });
  req.on("error", disconnected.resolve);
  t.after(() => req.destroy());
  await Promise.race([entered.promise, disconnected.promise.then(error => { throw error; })]);
  await assert.rejects(runtime.stop(), { code: "SHUTDOWN_TIMEOUT" });
  assert.equal((await disconnected.promise).code, "ECONNRESET");
  assert.equal(closed, 1);
  assert.equal(runtime.server.listening, false);
});
