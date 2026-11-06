import { randomUUID } from "node:crypto";
import cors from "cors";
import helmet from "helmet";
import { validateOrigins } from "../foundation/origins.js";
import { sendProblem } from "./problem.js";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const methods = ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"];
const headers = ["Content-Type", "Authorization", "Cache-Control", "Pragma", "X-Request-ID",
  "X-CSRF-Token", "Idempotency-Key", "If-Match", "Last-Event-ID"];
const headerNames = headers.map(value => value.toLowerCase());
function count(req, name) {
  return req.rawHeaders.filter((value, index) => index % 2 === 0 && value.toLowerCase() === name).length;
}

/** Node-compatible middleware shared by Express and the existing Engine.IO transport. */
export function createHttpBoundary(allowedOrigins, admission = undefined) {
  const origins = validateOrigins(allowedOrigins);
  const security = helmet({
    contentSecurityPolicy: { useDefaults: false, directives: {
      defaultSrc: ["'none'"], baseUri: ["'none'"], frameAncestors: ["'none'"], formAction: ["'none'"],
    } },
    xFrameOptions: { action: "deny" }, strictTransportSecurity: false,
    crossOriginResourcePolicy: { policy: "same-origin" },
  });
  const crossOrigin = cors({ origin: [...origins], credentials: true, methods,
    allowedHeaders: headers, exposedHeaders: ["X-Request-ID"], preflightContinue: Boolean(admission) });
  return function httpBoundary(req, res, next) {
    const supplied = req.headers["x-request-id"];
    const validId = typeof supplied === "string" && uuid.test(supplied) && count(req, "x-request-id") === 1;
    req.requestId = validId ? supplied : randomUUID();
    res.setHeader("X-Request-ID", req.requestId);
    security(req, res, () => {
      const reject = (status, detail) => sendProblem(req, res, status, detail);
      if (supplied !== undefined && !validId) return reject(400, "Invalid request identifier");
      const host = req.headers.host;
      if (typeof host !== "string" || count(req, "host") !== 1 ||
          !/^[a-z0-9.-]+(?::[1-9][0-9]{0,4})?$/i.test(host)) return reject(400, "Invalid Host header");
      const [name, port] = host.toLowerCase().split(":");
      if (!["127.0.0.1", "localhost"].includes(name) || Number(port ?? 80) !== req.socket.localPort) {
        return reject(403, "Host is not allowed");
      }
      const origin = req.headers.origin;
      if (origin !== undefined && (count(req, "origin") !== 1 || !origins.includes(origin))) {
        return reject(403, "Origin is not allowed");
      }
      if (req.method === "OPTIONS" && origin !== undefined) {
        const method = req.headers["access-control-request-method"];
        const requested = req.headers["access-control-request-headers"];
        if (!methods.includes(method) || (requested !== undefined &&
            (typeof requested !== "string" || requested.split(",").some(h => !headerNames.includes(h.trim().toLowerCase()))))) {
          return reject(403, "Preflight is not allowed");
        }
      }
      // Production preflights also reach admission; CORS is never permission.
      return crossOrigin(req, res, admission ? () => admission(req, res, next) : next);
    });
  };
}
