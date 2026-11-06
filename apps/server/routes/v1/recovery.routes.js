// @ts-check
import { Router } from "express";
import { sessionAuth } from "../../middleware/sessionAuth.js";
import { sendProblem } from "../../middleware/problem.js";
import { ReleaseRecoveryService, ReleaseRecoveryServiceError } from "../../services/releaseRecoveryService.js";

const router = Router();

/**
 * Common error handler for release & recovery routes.
 * @param {any} req
 * @param {any} res
 * @param {any} err
 */
function handleError(req, res, err) {
  if (err instanceof ReleaseRecoveryServiceError) {
    return sendProblem(req, res, err.status, err.message);
  }
  if (err && typeof err.status === "number") {
    return sendProblem(req, res, err.status, err.message);
  }
  return sendProblem(req, res, 500, err instanceof Error ? err.message : "Internal server error");
}

// GET /api/v1/system/release
router.get(
  "/system/release",
  sessionAuth({ requireCsrf: false }),
  async (req, res) => {
    try {
      const channel = typeof req.query.channel === "string" ? req.query.channel : "stable";
      const release = await ReleaseRecoveryService.getReleaseManifest({ channel });
      return res.status(200).json({
        data: release,
        meta: { requestId: req.requestId },
      });
    } catch (err) {
      return handleError(req, res, err);
    }
  }
);

// POST /api/v1/system/recovery/checkpoints
router.post(
  "/system/recovery/checkpoints",
  sessionAuth({ requireCsrf: true }),
  async (req, res) => {
    try {
      const checkpoint = await ReleaseRecoveryService.createRecoveryCheckpoint(req.body || {});
      return res.status(201).json({
        data: checkpoint,
        meta: { requestId: req.requestId },
      });
    } catch (err) {
      return handleError(req, res, err);
    }
  }
);

// GET /api/v1/system/recovery/checkpoints
router.get(
  "/system/recovery/checkpoints",
  sessionAuth({ requireCsrf: false }),
  async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;
      const offset = req.query.offset ? parseInt(String(req.query.offset), 10) : 0;
      const checkpoints = await ReleaseRecoveryService.listRecoveryCheckpoints({ limit, offset });
      return res.status(200).json({
        data: checkpoints,
        meta: { requestId: req.requestId },
      });
    } catch (err) {
      return handleError(req, res, err);
    }
  }
);

// GET /api/v1/system/recovery/checkpoints/:checkpointId
router.get(
  "/system/recovery/checkpoints/:checkpointId",
  sessionAuth({ requireCsrf: false }),
  async (req, res) => {
    try {
      const checkpoint = await ReleaseRecoveryService.getRecoveryCheckpoint(req.params.checkpointId);
      return res.status(200).json({
        data: checkpoint,
        meta: { requestId: req.requestId },
      });
    } catch (err) {
      return handleError(req, res, err);
    }
  }
);

// POST /api/v1/system/recovery/checkpoints/:checkpointId/rehearsal
router.post(
  "/system/recovery/checkpoints/:checkpointId/rehearsal",
  sessionAuth({ requireCsrf: true }),
  async (req, res) => {
    try {
      const rehearsal = await ReleaseRecoveryService.executeRecoveryRehearsal(
        req.params.checkpointId,
        req.body || {}
      );
      return res.status(201).json({
        data: rehearsal,
        meta: { requestId: req.requestId },
      });
    } catch (err) {
      return handleError(req, res, err);
    }
  }
);

// GET /api/v1/system/recovery/rehearsals/:rehearsalId
router.get(
  "/system/recovery/rehearsals/:rehearsalId",
  sessionAuth({ requireCsrf: false }),
  async (req, res) => {
    try {
      const rehearsal = await ReleaseRecoveryService.getRecoveryRehearsal(req.params.rehearsalId);
      return res.status(200).json({
        data: rehearsal,
        meta: { requestId: req.requestId },
      });
    } catch (err) {
      return handleError(req, res, err);
    }
  }
);

// POST /api/v1/system/maintenance/purge
router.post(
  "/system/maintenance/purge",
  sessionAuth({ requireCsrf: true }),
  async (req, res) => {
    try {
      const result = await ReleaseRecoveryService.executeRetentionPurge(req.body || {});
      return res.status(200).json({
        data: result,
        meta: { requestId: req.requestId },
      });
    } catch (err) {
      return handleError(req, res, err);
    }
  }
);

// GET /api/v1/system/diagnostics
router.get(
  "/system/diagnostics",
  sessionAuth({ requireCsrf: false }),
  async (req, res) => {
    try {
      const diagnostics = await ReleaseRecoveryService.getOperationalDiagnostics();
      return res.status(200).json({
        data: diagnostics,
        meta: { requestId: req.requestId },
      });
    } catch (err) {
      return handleError(req, res, err);
    }
  }
);

export default router;
