import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
export function verifyRuntime(directory = root, nodeVersion = process.versions.node, userAgent = process.env.npm_config_user_agent) {
  const root = directory;
  const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const lock = JSON.parse(readFileSync(join(root, "package-lock.json"), "utf8"));
  if (nodeVersion !== manifest.engines.node || readFileSync(join(root, ".node-version"), "utf8").trim() !== nodeVersion ||
      !userAgent?.startsWith(`npm/${manifest.engines.npm} `) || manifest.packageManager !== `npm@${manifest.engines.npm}` ||
      JSON.stringify(manifest.dependencies) !== JSON.stringify(lock.packages[""].dependencies) ||
      JSON.stringify(manifest.engines) !== JSON.stringify(lock.packages[""].engines)) throw new Error();
  for (const [path, entry] of Object.entries(lock.packages)) {
    if (!path) continue;
    const installed = JSON.parse(readFileSync(join(root, path, "package.json"), "utf8"));
    if (installed.version !== entry.version || !entry.integrity || !entry.resolved?.startsWith("https://registry.npmjs.org/")) throw new Error();
  }
  return { event: "runtime.checked", node: nodeVersion, npm: manifest.engines.npm, dependencies: Object.keys(manifest.dependencies).length, lockedPackages: Object.keys(lock.packages).length - 1 };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
try {
  console.log(verifyRuntime());
} catch {
  console.error({ event: "runtime.check_failed" }); process.exitCode = 1;
}
}
