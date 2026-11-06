/**
 * @file apps/server/src/diagnostics/index.ts
 * Diagnostics domain module: Service health controllers, readiness probes, and liveness endpoints.
 */
export { createHealthController } from '../../controllers/healthController.js';
export { createHealthRoutes } from '../../routes/health.routes.js';
