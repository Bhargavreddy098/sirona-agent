import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";
import { request, tcpAddress } from "./helpers.js";

// PRODUCTION COMPOSITION BEHAVIORAL: actual CLI and real app/Socket.IO/Pino; external pg driver injected by test-only --import.
async function port() {
  const socket = createServer(); await new Promise(resolve => socket.listen(0, "127.0.0.1", () => resolve(undefined)));
  const result = tcpAddress(socket).port; await new Promise(resolve => socket.close(resolve)); return result;
}
function cli(t, scenario, env) {
  const child = spawn(process.execPath, ["--import", new URL("./fixtures/cli-preload.js", import.meta.url).href,
    fileURLToPath(new URL("../server.js", import.meta.url))], {
    env: { SystemRoot: process.env.SystemRoot, NODE_ENV: "production", LOG_LEVEL: "info",
      DATABASE_URL: "postgresql://fixture:CANARY_SECRET@127.0.0.1:5432/fixture", ASI_STARTUP_TIMEOUT_MS: "5000",
      ASI_SHUTDOWN_TIMEOUT_MS: "200", ASI_READINESS_TIMEOUT_MS: "30", R04_TEST_SCENARIO: scenario, ...env },
    stdio: ["ignore", "pipe", "pipe", "ipc"],
  });
  let output = ""; const messages = []; let result;
  const changes = new Set(); const notify = () => { for (const fn of changes) fn(); };
  for (const stream of [child.stdout, child.stderr]) stream.on("data", data => { output += data; notify(); });
  child.on("message", message => { messages.push(message); notify(); });
  const exited = new Promise((resolve, reject) => {
    child.on("error", reject); child.on("exit", (code, signal) => { result = { code, signal }; notify(); resolve(result); });
  });
  const guard = setTimeout(() => child.kill("SIGKILL"), 10000);
  t.after(async () => {
    clearTimeout(guard); if (!result) child.kill("SIGKILL"); await exited;
    // Parent-owned pipes are separate from process exit, especially after Windows IPC disconnect.
    child.stdout.destroy(); child.stderr.destroy();
  });
  function wait(predicate) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => { changes.delete(check); reject(new Error("CLI evidence deadline")); }, 8000);
      function check() {
        if (predicate(output, messages)) { clearTimeout(timeout); changes.delete(check); resolve(); }
        else if (result) { clearTimeout(timeout); changes.delete(check); reject(new Error("CLI exited before expected evidence: " + output)); }
      }
      changes.add(check); check();
    });
  }
  return { child, exited, wait, messages, get output() { return output; } };
}
test("actual CLI invalid database config exits before any external owner is constructed", async t => {
  const run = cli(t, "ready", { PORT: String(await port()), DATABASE_URL: "CANARY_SECRET" });
  assert.equal((await run.exited).code, 1); assert.equal(run.messages.length, 0);
  assert.match(run.output, /backend.startup_failed/); assert.doesNotMatch(run.output, /CANARY_SECRET|backend.listening/);
});
for (const scenario of ["constructor-failure", "unavailable", "throw", "stall"]) {
  test(`actual CLI ${scenario} cannot announce listening and exits after cleanup`, async t => {
    const run = cli(t, scenario, { PORT: String(await port()), ASI_STARTUP_TIMEOUT_MS: "100" });
    assert.equal((await run.exited).code, 1);
    assert.doesNotMatch(run.output, /backend.listening|CANARY_SECRET|postgresql:\/\//);
    assert.match(run.output, /backend.startup_failed/);
    assert.equal(run.messages.filter(m => m.event === "database.close").length, scenario === "constructor-failure" ? 0 : 1);
  });
}
for (const signal of ["SIGINT", "SIGTERM"]) {
  test(`actual CLI readiness changes and controlled ${signal} event closes resources once`, async t => {
    const listenerPort = await port(); const run = cli(t, "ready", { PORT: String(listenerPort) });
    await run.wait(output => output.includes('"event":"backend.listening"'));
    const base = `http://127.0.0.1:${listenerPort}`;
    assert.deepEqual(await (await request(base, "/health/ready")).json(), { ready: true });
    for (const value of ["unavailable", "throw", "stall", "ready"]) {
      run.child.send({ kind: "state", value }); await run.wait((output, messages) => messages.some(m => m.kind === "control" && m.value === value));
      const res = await request(base, "/health/ready"); assert.equal(res.status, value === "ready" ? 200 : 503);
      assert.deepEqual(await res.json(), { ready: value === "ready" });
    }
    run.child.send({ kind: "signal", value: signal });
    await run.wait((output, messages) => output.includes('"event":"backend.stopped"') && messages.some(m => m.event === "database.close"));
    run.child.disconnect(); assert.equal((await run.exited).code, 0);
    assert.equal(run.messages.filter(m => m.event === "database.close").length, 1);
    assert.doesNotMatch(run.output, /CANARY_SECRET|postgresql:\/\//);
    await assert.rejects(request(base, "/health/live"));
  });
}
test("actual CLI startup interruption closes a pending required owner and never listens", async t => {
  const run = cli(t, "stall", { PORT: String(await port()) });
  await run.wait((output, messages) => messages.some(m => m.event === "database.construct"));
  run.child.send({ kind: "signal", value: "SIGINT" });
  assert.equal((await run.exited).code, 1);
  assert.equal(run.messages.filter(m => m.event === "database.close").length, 1);
  assert.doesNotMatch(run.output, /backend.listening|CANARY_SECRET/);
});
for (const scenario of ["close-failure", "close-stall"]) {
  test(`actual CLI ${scenario} exits nonzero within bounded shutdown, leaving no child`, async t => {
    const run = cli(t, scenario, { PORT: String(await port()) });
    await run.wait(output => output.includes('"event":"backend.listening"'));
    run.child.send({ kind: "signal", value: "SIGINT" });
    assert.equal((await run.exited).code, 1);
    assert.equal(run.messages.filter(m => m.event === "database.close").length, 1);
    assert.match(run.output, /backend.shutdown_failed/); assert.doesNotMatch(run.output, /CANARY_SECRET/);
  });
}
