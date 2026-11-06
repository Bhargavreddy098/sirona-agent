// @ts-check
import { Router } from "express";
import { sessionAuth } from "../../middleware/sessionAuth.js";
import { sendProblem } from "../../middleware/problem.js";
import { DeploymentService, DeploymentServiceError } from "../../services/deploymentService.js";

const router = Router();

/**
 * Common error handler for deployment routes.
 * @param {any} req
 * @param {any} res
 * @param {any} err
 */
function handleError(req, res, err) {
  if (err instanceof DeploymentServiceError) {
    return sendProblem(req, res, err.status, err.message);
  }
  if (err && typeof err.status === "number") {
    return sendProblem(req, res, err.status, err.message);
  }
  return sendProblem(req, res, 500, err instanceof Error ? err.message : "Internal server error");
}

// POST /api/v1/runs/:runId/deployment-previews
router.post(
  "/runs/:runId/deployment-previews",
  sessionAuth({ requireCsrf: true }),
  async (req, res) => {
    try {
      const preview = await DeploymentService.createDeploymentPreview(req.params.runId, req.body || {});
      return res.status(200).json({
        data: preview,
        meta: { requestId: req.requestId },
      });
    } catch (err) {
      return handleError(req, res, err);
    }
  }
);

// POST /api/v1/runs/:runId/deployments
router.post(
  "/runs/:runId/deployments",
  sessionAuth({ requireCsrf: true }),
  async (req, res) => {
    try {
      const deployment = await DeploymentService.createDeployment(req.params.runId, req.body || {});
      return res.status(201).json({
        data: deployment,
        meta: { requestId: req.requestId },
      });
    } catch (err) {
      return handleError(req, res, err);
    }
  }
);

// GET /api/v1/deployments/:deploymentId
router.get(
  "/deployments/:deploymentId",
  sessionAuth({ requireCsrf: false }),
  async (req, res) => {
    try {
      const deployment = await DeploymentService.getDeployment(req.params.deploymentId);
      return res.status(200).json({
        data: deployment,
        meta: { requestId: req.requestId },
      });
    } catch (err) {
      return handleError(req, res, err);
    }
  }
);

// POST /api/v1/deployments/:deploymentId/rollback-previews
router.post(
  "/deployments/:deploymentId/rollback-previews",
  sessionAuth({ requireCsrf: true }),
  async (req, res) => {
    try {
      const preview = await DeploymentService.createRollbackPreview(req.params.deploymentId, req.body || {});
      return res.status(200).json({
        data: preview,
        meta: { requestId: req.requestId },
      });
    } catch (err) {
      return handleError(req, res, err);
    }
  }
);

// POST /api/v1/deployments/:deploymentId/rollback
router.post(
  "/deployments/:deploymentId/rollback",
  sessionAuth({ requireCsrf: true }),
  async (req, res) => {
    try {
      const deployment = await DeploymentService.executeRollback(req.params.deploymentId, req.body || {});
      return res.status(200).json({
        data: deployment,
        meta: { requestId: req.requestId },
      });
    } catch (err) {
      return handleError(req, res, err);
    }
  }
);

// POST /api/v1/runs/:runId/browser-qa-sessions
router.post(
  "/runs/:runId/browser-qa-sessions",
  sessionAuth({ requireCsrf: true }),
  async (req, res) => {
    try {
      const session = await DeploymentService.createBrowserQASession(req.params.runId, req.body || {});
      return res.status(201).json({
        data: session,
        meta: { requestId: req.requestId },
      });
    } catch (err) {
      return handleError(req, res, err);
    }
  }
);

// GET /api/v1/runs/:runId/browser-qa-sessions
router.get(
  "/runs/:runId/browser-qa-sessions",
  sessionAuth({ requireCsrf: false }),
  async (req, res) => {
    try {
      const sessions = await DeploymentService.getBrowserQASessions(req.params.runId);
      return res.status(200).json({
        data: sessions,
        meta: { requestId: req.requestId },
      });
    } catch (err) {
      return handleError(req, res, err);
    }
  }
);

export default router;
