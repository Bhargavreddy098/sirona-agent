import pino from "pino";
import { pinoHttp } from "pino-http";

const events = new Set(["backend.starting", "backend.listening", "backend.startup_failed", "backend.stopping",
  "backend.stopped", "backend.shutdown_failed", "dependency.ready", "dependency.unavailable", "dependency.error", "http.error"]);
const categories = new Set(["database", "cache", "http", "legacy", "logger", "config"]);
const codes = new Set(["INVALID_CONFIG", "DEPENDENCY_UNREADY", "STARTUP_TIMEOUT", "SHUTDOWN_TIMEOUT",
  "STARTUP_CANCELLED", "EADDRINUSE", "RESOURCE_FAILED", "CLEANUP_FAILED"]);

/** Synchronous stdout destination: no worker/transport/file ownership or secret-bearing error serializer.
 * @param {import('pino').DestinationStream} destination
 */
export function createLogger(config, destination = pino.destination({ dest: 1, sync: true })) {
  const logger = pino({ level: config.logLevel, base: null }, destination);
  let closed;
  return {
    middleware: pinoHttp({ logger, autoLogging: false, quietReqLogger: true,
      genReqId: req => req.requestId, serializers: { req: req => ({ method: req.method }), res: res => ({ statusCode: res.statusCode }) } }),
    event(event, fields = {}) {
      if (!events.has(event)) return;
      const record = { event };
      if (categories.has(fields.category)) record.category = fields.category;
      if (codes.has(fields.code)) record.code = fields.code;
      if (["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"].includes(fields.method)) record.method = fields.method;
      if (Number.isInteger(fields.status) && fields.status >= 100 && fields.status <= 599) record.status = fields.status;
      if (typeof fields.requestId === "string" && /^[0-9a-f-]{36}$/i.test(fields.requestId)) record.requestId = fields.requestId;
      logger[event.endsWith("failed") || event === "dependency.error" || event === "http.error" ? "error" : event === "dependency.unavailable" ? "warn" : "info"](record);
    },
    close() { closed ??= new Promise((resolve, reject) => logger.flush(error => error ? reject(error) : resolve())); return closed; },
  };
}
