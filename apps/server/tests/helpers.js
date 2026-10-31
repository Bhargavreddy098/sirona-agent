import { createServer } from "node:http";
import { Router } from "express";
import { createApp } from "../app.js";
import { createHealthController } from "../controllers/healthController.js";
import assert from "node:assert/strict";

/** Bound test listeners must be TCP, never a pipe or an unbound server.
 * @param {import('node:net').Server} server
 */
export function tcpAddress(server) {
  const address = server.address();
  assert.ok(address && typeof address === "object", "Expected a bound TCP test listener");
  return address;
}

/** @param {import('node:http').IncomingHttpHeaders} source */
export function responseHeaders(source) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(source)) {
    if (Array.isArray(value)) for (const item of value) headers.append(name, item);
    else if (value !== undefined) headers.append(name, value);
  }
  return headers;
}

// Explicit test fixtures; no production dependency, database, environment file or provider imports.
/** @param {{checkDatabase?: () => unknown, readinessTimeoutMs?: number, rateLimiter?: import('../foundation/contracts.js').Middleware}} options */
export function fixture({ checkDatabase = async () => true, readinessTimeoutMs = 100, rateLimiter = (req, res, next) => next() } = {}) {
  const errors = [];
  let cleanups = 0;
  const healthController = createHealthController({ checkDatabase,
    cleanExpiredLeases: async () => { cleanups += 1; }, readinessTimeoutMs, now: () => 123456 });
  const routes = Router();
  routes.post("/fixture/echo", (req, res) => res.json({ received: req.body }));
  routes.get("/fixture/error", () => { throw new Error("SELECT private CANARY_SECRET /private/path"); });
  routes.get("/fixture/unique", () => { throw Object.assign(new Error("CANARY_SECRET"), { code: "23505" }); });
  routes.get("/fixture/foreign", () => { throw Object.assign(new Error("CANARY_SECRET"), { code: "23503" }); });
  const app = createApp({ healthController, apiRoutes: routes,
    auditContext: (req, res, next) => next(), rateLimiter,
    allowedOrigins: ["http://127.0.0.1:5173"], logError: record => errors.push(record) });
  return { app, routes, healthController, errors, get cleanupCalls() { return cleanups; } };
}

export async function serve(t, app) {
  const server = createServer(app);
  t.after(() => new Promise((resolve, reject) => {
    server.closeAllConnections();
    server.close(error => error ? reject(error) : resolve());
  }));
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(undefined));
  });
  return `http://127.0.0.1:${tcpAddress(server).port}`;
}

export async function request(base, path, options = {}) {
  const timeoutMs = options.timeout || 60000;
  const signal = options.signal || AbortSignal.timeout(timeoutMs);
  const { timeout: _t, ...fetchOptions } = options;
  return fetch(base + path, { ...fetchOptions, headers: { Connection: "close", ...fetchOptions.headers }, signal });
}
