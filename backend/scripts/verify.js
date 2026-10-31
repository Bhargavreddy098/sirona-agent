import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export function runChecks(checks, execute) {
  let failed = false;
  for (const check of checks) {
    const result = execute(check);
    if (result.status !== 0 || result.error) failed = true;
  }
  return failed ? 1 : 0;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!process.env.npm_execpath) throw new Error("Run through npm run verify");
  const checks = [
    ["run", "check:runtime"], ["run", "lint"], ["run", "check:strict"],
    ["run", "check:static"], ["run", "check"], ["run", "check:modules"], ["test"],
    ["--prefix", "../frontend/sirona-next", "run", "lint"],
    ["--prefix", "../frontend/sirona-next", "run", "build"],
  ];
  process.exitCode = runChecks(checks, args => spawnSync(process.execPath,
    [process.env.npm_execpath, ...args], { stdio: "inherit", timeout: 180000 }));
}
