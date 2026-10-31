import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname, resolve, basename } from "node:path";
import { spawnSync } from "node:child_process";

// UNIT/tooling: prove assertion failures cannot become a green verification command.
test("the runner returns nonzero and reports a deliberately failing isolated assertion", async t => {
  const directory = await mkdtemp(join(tmpdir(), "sirona-r02-runner-"));
  assert.equal(dirname(resolve(directory)), resolve(tmpdir()));
  assert.match(basename(directory), /^sirona-r02-runner-/);
  t.after(() => rm(directory, { recursive: true, force: true }));
  const file = join(directory, "failure.fixture.mjs");
  await writeFile(file, `import { test } from 'node:test'; import assert from 'node:assert/strict';
    test('intentional isolated failure', () => assert.equal('actual', 'expected'));`);
  const child = spawnSync(process.execPath, ["--test", file], { encoding: "utf8", timeout: 10000, env: { SystemRoot: process.env.SystemRoot } });
  assert.equal(child.error, undefined);
  assert.equal(child.status, 1);
  assert.match(child.stdout + child.stderr, /ERR_ASSERTION/);
});
