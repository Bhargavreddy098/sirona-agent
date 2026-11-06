import { Router } from "express";

export function createHealthRoutes(controller) {
  if (!controller || ["getLiveness", "getReadiness", "getHealth", "getStatus"].some(key => typeof controller[key] !== "function")) {
    throw new TypeError("Health controller is required");
  }
  const router = Router();
  router.get("/health/live", controller.getLiveness);
  router.get("/health/ready", controller.getReadiness);
  router.get("/health", controller.getHealth);
  router.get("/api/status", controller.getStatus);
  return router;
}
