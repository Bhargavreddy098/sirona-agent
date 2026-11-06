import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, relative } from "node:path";
import { spawnSync } from "node:child_process";

const root = fileURLToPath(new URL("../", import.meta.url));
let checked = 0;
let failed = 0;
function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === "node_modules") continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (entry.isFile() && /\.(?:js|mjs|cjs)$/.test(entry.name)) {
      const result = spawnSync(process.execPath, ["--check", path], { encoding: "utf8", timeout: 10000 });
      checked += 1;
      if (result.status !== 0 || result.error) {
        failed += 1;
        // Do not echo source excerpts: legacy source can contain credential literals.
        console.error({ event: "syntax.failed", file: relative(root, path) });
      }
    }
  }
}
walk(root);
console.log({ event: "syntax.checked", files: checked, failed });
if (failed) process.exitCode = 1;
