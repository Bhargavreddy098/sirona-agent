/** Exact loopback HTTP origins only; native opaque origins require later qualification. */
/** @param {unknown} origins @returns {readonly string[]} */
export function validateOrigins(origins) {
  if (!Array.isArray(origins) || origins.length > 64 || origins.some(value => {
    if (typeof value !== "string" || value.length > 256) return true;
    try {
      const url = new URL(value);
      return url.origin !== value || url.protocol !== "http:" ||
        !["127.0.0.1", "localhost"].includes(url.hostname) || url.port === "0";
    } catch { return true; }
  })) throw Object.assign(new Error("Invalid backend origin configuration"), { code: "INVALID_CONFIG" });
  return Object.freeze([...new Set(origins)]);
}

/** @param {Record<string, unknown>} env @param {number} port */
export function readOrigins(env, port) {
  if (env.ALLOWED_ORIGINS !== undefined && typeof env.ALLOWED_ORIGINS !== "string") {
    throw Object.assign(new Error("Invalid backend origin configuration"), { code: "INVALID_CONFIG" });
  }
  const defaults = [port, 5173].flatMap(p => ["127.0.0.1", "localhost"].map(host => new URL(`http://${host}:${p}`).origin));
  const extra = typeof env.ALLOWED_ORIGINS === "string" ? env.ALLOWED_ORIGINS.split(",").map(v => v.trim()) : [];
  return validateOrigins([...defaults, ...extra]);
}
