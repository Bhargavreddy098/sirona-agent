import express from "express";
import compression from "compression";
import cookieParser from "cookie-parser";
import { createHealthRoutes } from "./routes/health.routes.js";
import { createErrorHandler } from "./middleware/errorHandler.js";
import { createHttpBoundary } from "./middleware/httpBoundary.js";
import { notFound } from "./middleware/problem.js";
import { sendProblem } from "./middleware/problem.js";

/** Construct the actual HTTP pipeline without opening listeners or dependencies.
 * @param {import('./foundation/contracts.js').AppOptions} options
 */
export function createApp({ healthController, apiRoutes, auditContext, rateLimiter, allowedOrigins, logError, httpLogger, accepting = () => true, admission }) {
  for (const owner of [apiRoutes, auditContext, rateLimiter]) {
    if (typeof owner !== "function") throw new TypeError("Required HTTP owner is missing");
  }
  if (!Array.isArray(allowedOrigins)) throw new TypeError("Origin configuration is required");
  const app = express();
  app.set("trust proxy", false);
  app.use(createHttpBoundary(allowedOrigins, admission));
  if (httpLogger) app.use(httpLogger);
  app.use((req, res, next) => {
    if (accepting()) return next();
    if (req.path === "/health/ready") return res.status(503).json({ ready: false });
    return sendProblem(req, res, 503, "Backend is stopping");
  });
  app.use(compression());
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));
  app.use(cookieParser());
  app.use(auditContext);
  app.use(rateLimiter);
  app.use(createHealthRoutes(healthController));
  app.use(apiRoutes);
  app.use(notFound);
  app.use(createErrorHandler({ logError }));
  return app;
}
