import { readOrigins } from "./origins.js";
/** Validate transport configuration before loading external owners.
 * @param {Record<string, unknown>} env
 */
export function readConfig(env) {
  const value = env.PORT ?? "8000";
  const environment = env.NODE_ENV ?? "development";
  const host = env.ASI_HOST ?? "127.0.0.1";
  if (typeof value !== "string" || !/^\d{1,5}$/.test(value) || Number(value) < 1 || Number(value) > 65535 ||
      host !== "127.0.0.1" || typeof environment !== "string" || !["development", "test", "production"].includes(environment)) {
    throw Object.assign(new Error("Invalid backend listener configuration"), { code: "INVALID_CONFIG" });
  }
  return Object.freeze({ host, port: Number(value), environment, allowedOrigins: readOrigins(env, Number(value)) });
}
