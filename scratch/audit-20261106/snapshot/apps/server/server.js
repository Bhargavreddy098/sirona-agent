import { pathToFileURL, fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { readRuntimeConfig } from "./foundation/runtimeConfig.js";
import { createLogger } from "./foundation/logger.js";
import { composeBackend } from "./foundation/composition.js";
import { productionFactories } from "./foundation/production.js";

/** Explicit factories permit external test owners without an environment-selected mock mode. */
export function createBackend(env = process.env, options = {}) {
  const config = readRuntimeConfig(env);
  const logger = (options.loggerFactory ?? createLogger)(config);
  return composeBackend(config, options.factories ?? productionFactories, logger, options.signals ?? process, options.onSignalStop);
}
export async function startBackend(env = process.env, options = {}) {
  const runtime = createBackend(env, options);
  await runtime.start();
  return runtime;
}

export function loadEnvironment(env = process.env) {
  if (env.ASI_ENV_FILE !== undefined && (typeof env.ASI_ENV_FILE !== "string" || !env.ASI_ENV_FILE.trim() || /[\0\r\n]/.test(env.ASI_ENV_FILE))) {
    throw Object.assign(new Error("Environment configuration unavailable"), { code: "INVALID_CONFIG" });
  }
  // Production never implicitly reads a developer .env. Explicit file opt-in is trusted operator configuration.
  const envPath = env.ASI_ENV_FILE ?? (env.NODE_ENV === "production" ? null : fileURLToPath(new URL("./.env", import.meta.url)));
  if (!envPath) return;
  const result = dotenv.config({ path: envPath, processEnv: env, override: false });
  if (result.error && (env.ASI_ENV_FILE !== undefined || !("code" in result.error) || result.error.code !== "ENOENT")) {
    throw Object.assign(new Error("Environment configuration unavailable"), { code: "INVALID_CONFIG" });
  }
}
export async function runCli() {
  try {
    loadEnvironment();
    return await startBackend(process.env, { onSignalStop(error) {
      process.exitCode = error ? 1 : 0;
      // A failed bounded cleanup cannot keep an unattended CLI alive indefinitely.
      if (error) process.exit(1);
    } });
  } catch (error) {
    if (!error.logged) console.error(JSON.stringify({ event: "backend.startup_failed", category: "config", code: error.code === "INVALID_CONFIG" ? "INVALID_CONFIG" : "RESOURCE_FAILED" }));
    process.exitCode = 1;
    return null;
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli().then(runtime => { if (!runtime) process.exit(1); });
}
