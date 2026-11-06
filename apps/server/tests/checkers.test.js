import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, mkdir, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { verifyRuntime } from "../scripts/verifyRuntime.js";
import { runChecks } from "../scripts/verify.js";
import { inspectModules } from "../scripts/checkModules.js";

async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), "sirona-r06-checker-"));
  assert.equal(dirname(resolve(directory)), resolve(tmpdir()));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}
const root = fileURLToPath(new URL("../", import.meta.url));
test("lint returns nonzero for a real unused-variable violation", async t => {
  const directory = await fixture(t);
  const file = join(directory, "bad.js");
  await writeFile(file, "const unused = 1;\n");
  const tool = fileURLToPath(new URL("../../web/node_modules/oxlint/bin/oxlint", import.meta.url));
  const result = spawnSync(process.execPath, [tool, "--deny-warnings", file], { encoding: "utf8", timeout: 10000 });
  assert.equal(result.status, 1);
  assert.match(result.stdout + result.stderr, /no-unused-vars/);
});
test("semantic checker rejects a JSDoc type mismatch without printing source", async t => {
  const directory = await fixture(t);
  await writeFile(join(directory, "bad.js"), '/** @type {number} */ const value = "fixture-secret-canary";\n');
  const config = join(directory, "jsconfig.json");
  await writeFile(config, JSON.stringify({ compilerOptions: { allowJs: true, checkJs: true, strict: true, noEmit: true, types: [] }, files: ["bad.js"] }));
  const result = spawnSync(process.execPath, [join(root, "scripts/checkStatic.js"), "--project", config], { encoding: "utf8", timeout: 10000 });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /2322/);
  assert.doesNotMatch(result.stdout + result.stderr, /fixture-secret-canary/);
});
test("module checker detects missing imports, computed production loaders and cycles", async t => {
  const directory = await fixture(t);
  await writeFile(join(directory, "server.js"), "import './missing.js'; import('./other.js'); require(process.env.PLUGIN);\n");
  await writeFile(join(directory, "other.js"), "import './server.js';\n");
  const result = inspectModules(directory);
  assert.ok(result.failures.some(x => x.includes("unresolved-module")));
  assert.ok(result.failures.some(x => x.includes("computed-loader")));
  assert.ok(result.failures.some(x => x.includes("cycle")));
});
test("runtime verifier rejects manifest-lock and installed-version drift", async t => {
  const directory = await fixture(t);
  const manifest = { engines: { node: process.versions.node, npm: "12.0.2" }, packageManager: "npm@12.0.2", dependencies: { fixture: "1.0.0" } };
  const lock = { packages: { "": { dependencies: manifest.dependencies, engines: manifest.engines }, "node_modules/fixture": { version: "1.0.0", integrity: "sha512-fixture", resolved: "https://registry.npmjs.org/fixture" } } };
  await writeFile(join(directory, "package.json"), JSON.stringify(manifest));
  await writeFile(join(directory, "package-lock.json"), JSON.stringify(lock));
  await writeFile(join(directory, ".node-version"), process.versions.node);
  await mkdir(join(directory, "node_modules/fixture"), { recursive: true });
  const installed = join(directory, "node_modules/fixture/package.json");
  await writeFile(installed, JSON.stringify({ version: "1.0.0" }));
  assert.equal(verifyRuntime(directory, process.versions.node, "npm/12.0.2 fixture").dependencies, 1);
  await writeFile(installed, JSON.stringify({ version: "2.0.0" }));
  assert.throws(() => verifyRuntime(directory, process.versions.node, "npm/12.0.2 fixture"));
  await writeFile(installed, JSON.stringify({ version: "1.0.0" }));
  lock.packages[""].dependencies = { fixture: "2.0.0" };
  await writeFile(join(directory, "package-lock.json"), JSON.stringify(lock));
  assert.throws(() => verifyRuntime(directory, process.versions.node, "npm/12.0.2 fixture"));
});
test("verify runs every gate and returns failure if any checker fails or cannot start", () => {
  const visited = [];
  assert.equal(runChecks([0, 1, 0], value => { visited.push(value); return { status: value }; }), 1);
  assert.deepEqual(visited, [0, 1, 0]);
  assert.equal(runChecks([0], () => ({ status: null, error: new Error("fixture") })), 1);
  assert.equal(runChecks([0], () => ({ status: 0 })), 0);
});
test("production graph has no deferred packages, mail chain, test or frontend imports", async () => {
  const graph = inspectModules(root);
  assert.deepEqual(graph.failures, []);
  assert.deepEqual(graph.dynamic, []);
  assert.ok(!Object.hasOwn(graph.packages, "geoip-lite") && !Object.hasOwn(graph.packages, "nodemailer"));
  assert.ok(graph.productionReachable.every(file => !/tests\/|scripts\/|frontend|email|notification/.test(file)));
  const manifest = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  assert.ok(!manifest.dependencies["geoip-lite"] && !manifest.dependencies.nodemailer);
});
