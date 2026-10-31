import { Router } from "express";
import { sessionAuth } from "../../middleware/sessionAuth.js";
import { sendProblem } from "../../middleware/problem.js";
import { IsolationBrokerService } from "../../services/isolationBrokerService.js";

const router = Router();

function handleError(req, res, err) {
  if (err && typeof err.code === "string") {
    switch (err.code) {
      case "PATH_TRAVERSAL_DETECTED":
      case "JUNCTION_ESCAPE_DETECTED":
      case "DEVICE_PATH_FORBIDDEN":
      case "UNC_PATH_FORBIDDEN":
      case "FORBIDDEN_PATH_ACCESS":
      case "INVALID_WORKSPACE_ROOT":
      case "INVALID_TARGET_PATH":
        return sendProblem(req, res, 400, err.message);
      case "ARTIFACT_NOT_FOUND":
        return sendProblem(req, res, 404, err.message);
      case "OUTPUT_LIMIT_EXCEEDED":
      case "EXECUTION_TIMEOUT":
        return sendProblem(req, res, 408, err.message);
    }
  }
  if (err && typeof err.status === "number") {
    return sendProblem(req, res, err.status, err.message);
  }
  return sendProblem(req, res, 500, err instanceof Error ? err.message : "Internal server error");
}

// GET /api/v1/isolation/diagnostics
router.get("/isolation/diagnostics", sessionAuth({ requireCsrf: false }), async (req, res) => {
  try {
    const prereqs = await IsolationBrokerService.checkPrerequisites();
    const latestQualification = await IsolationBrokerService.getLatestQualification();
    return res.status(200).json({
      data: {
        diagnostics: prereqs,
        latestQualification,
      },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// POST /api/v1/isolation/qualify
router.post("/isolation/qualify", sessionAuth(), async (req, res) => {
  try {
    const { runnerVersion } = req.body || {};
    const qualification = await IsolationBrokerService.runAdversarialQualification({ runnerVersion });
    return res.status(201).json({
      data: { qualification },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// POST /api/v1/isolation/validate-path
router.post("/isolation/validate-path", sessionAuth(), async (req, res) => {
  try {
    const { workspaceRoot, targetPath } = req.body || {};
    if (!workspaceRoot || !targetPath) {
      return sendProblem(req, res, 400, "workspaceRoot and targetPath are required");
    }
    const result = IsolationBrokerService.validateWorkspacePath(workspaceRoot, targetPath);
    return res.status(200).json({
      data: result,
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// GET /api/v1/isolation/qualifications
router.get("/isolation/qualifications", sessionAuth({ requireCsrf: false }), async (req, res) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const qualifications = await IsolationBrokerService.listQualifications(limit);
    return res.status(200).json({
      data: { qualifications },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// GET /api/v1/isolation/qualifications/:id
router.get("/isolation/qualifications/:id", sessionAuth({ requireCsrf: false }), async (req, res) => {
  try {
    const qualification = await IsolationBrokerService.getQualification(req.params.id);
    if (!qualification) {
      return sendProblem(req, res, 404, "Isolation qualification not found");
    }
    return res.status(200).json({
      data: { qualification },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

export default router;
