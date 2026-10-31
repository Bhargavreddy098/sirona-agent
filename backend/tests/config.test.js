import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { readConfig } from "../foundation/config.js";
import { createHealthController } from "../controllers/healthController.js";
import { createApp } from "../app.js";

// UNIT: injected listener configuration, no application environment loading.
test("configuration defaults are deterministic and immutable", () => {
  const config = readConfig({});
  assert.deepEqual(config, { host: "127.0.0.1", port: 8000, environment: "development", allowedOrigins: ["http://127.0.0.1:8000", "http://localhost:8000", "http://127.0.0.1:5173", "http://localhost:5173"] });
  assert.ok(Object.isFrozen(config));
});
test("explicit valid listener configuration is accepted", () => {
  const config = readConfig({ PORT: "65535", NODE_ENV: "production", ASI_HOST: "127.0.0.1" }); assert.equal(config.port, 65535); assert.equal(config.host, "127.0.0.1"); assert.equal(config.environment, "production");
});
for (const port of ["0", "-1", "65536", "8000garbage", "", "CANARY_SECRET", 8000]) {
  test(`invalid port ${JSON.stringify(port)} is rejected without value disclosure`, () => {
    assert.throws(() => readConfig({ PORT: port }), { code: "INVALID_CONFIG", message: "Invalid backend listener configuration" });
  });
}
test("unsupported environment is rejected", () => {
  assert.throws(() => readConfig({ NODE_ENV: "CANARY_SECRET" }), { code: "INVALID_CONFIG" });
});
test("missing HTTP owners fail construction rather than invent working services", () => {
  // Deliberate invalid input through reflection, not a lie about the valid owner contract.
  assert.throws(() => Reflect.apply(createApp, undefined, [{}]), /owner is missing/);
});
test("missing health owners and invalid deadlines fail construction", () => {
  assert.throws(() => Reflect.apply(createHealthController, undefined, [{ checkDatabase: async () => true }]), /owners/);
  assert.throws(() => createHealthController({ checkDatabase: async () => true, cleanExpiredLeases: async () => {}, readinessTimeoutMs: 0 }), /deadline/);
});
test("importing the active entrypoint and factory opens no network connection", () => {
  const script = `import net from 'node:net';
    net.Socket.prototype.connect = function () { throw new Error('UNEXPECTED_NETWORK_CONNECT'); };
    await import(${JSON.stringify(new URL("../server.js", import.meta.url).href)});
    console.log('IMPORT_WITHOUT_STARTUP');`;
  const child = spawnSync(process.execPath, ["--input-type=module", "-e", script], { encoding: "utf8", timeout: 10000 });
  assert.equal(child.error, undefined);
  assert.equal(child.status, 0, child.stderr);
  assert.equal(child.stdout.trim(), "IMPORT_WITHOUT_STARTUP");
});
test("invalid actual CLI configuration exits nonzero before loading production dependencies", () => {
  const child = spawnSync(process.execPath, [fileURLToPath(new URL("../server.js", import.meta.url))], {
    encoding: "utf8", timeout: 10000,
    env: { SystemRoot: process.env.SystemRoot, PORT: "CANARY_SECRET", NODE_ENV: "test" },
  });
  assert.equal(child.error, undefined);
  assert.equal(child.status, 1);
  assert.match(child.stderr, /backend.startup_failed/);
  assert.doesNotMatch(child.stdout + child.stderr, /CANARY_SECRET|backend.listening|PostgreSQL|Redis/);
});

for (const overrides of [{ ASI_HOST: "0.0.0.0" }, { ALLOWED_ORIGINS: "http://CANARY_SECRET.test" }]) {
  test(`invalid CLI transport configuration ${Object.keys(overrides)[0]} fails before external owners`, () => {
    const child = spawnSync(process.execPath, [fileURLToPath(new URL("../server.js", import.meta.url))], {
      encoding: "utf8", timeout: 10000,
      env: { SystemRoot: process.env.SystemRoot, PORT: "8000", NODE_ENV: "test", ...overrides },
    });
    assert.equal(child.error, undefined);
    assert.equal(child.status, 1);
    assert.match(child.stderr, /backend.startup_failed/);
    assert.doesNotMatch(child.stdout + child.stderr, /CANARY_SECRET|backend.listening|PostgreSQL|Redis/);
  });
}
