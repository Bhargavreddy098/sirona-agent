import { Router } from "express";
import { sessionAuth } from "../../middleware/sessionAuth.js";
import { sendProblem } from "../../middleware/problem.js";
import { VerificationService } from "../../services/verificationService.js";

const router = Router();

function handleError(req, res, err) {
  if (err && typeof err.status === "number") {
    return sendProblem(req, res, err.status, err.message);
  }
  return sendProblem(
    req,
    res,
    500,
    err instanceof Error ? err.message : "Internal server error"
  );
}

// 1. POST /api/v1/runs/:runId/verifications
router.post(
  "/runs/:runId/verifications",
  sessionAuth({ requireCsrf: true }),
  async (req, res) => {
    try {
      const { runId } = req.params;
      const {
        artifactId,
        suiteRevision,
        verifierIdentity,
        testResults,
        expectedDigest,
        seededDefect,
      } = req.body || {};

      if (!artifactId) {
        return sendProblem(req, res, 400, "artifactId is required");
      }

      const report = await VerificationService.createVerificationJob({
        runId,
        artifactId,
        suiteRevision: suiteRevision || "v1",
        verifierIdentity: verifierIdentity || "verifier-engine-v1",
        testResults,
        expectedDigest,
        seededDefect,
      });

      return res.status(201).json({ data: report });
    } catch (err) {
      return handleError(req, res, err);
    }
  }
);

// 2. GET /api/v1/runs/:runId/verifications
router.get(
  "/runs/:runId/verifications",
  sessionAuth({ requireCsrf: false }),
  async (req, res) => {
    try {
      const { runId } = req.params;
      const reports = await VerificationService.getVerificationReports(runId);
      return res.status(200).json({ data: reports });
    } catch (err) {
      return handleError(req, res, err);
    }
  }
);

// 3. GET /api/v1/verifications/:reportId
router.get(
  "/verifications/:reportId",
  sessionAuth({ requireCsrf: false }),
  async (req, res) => {
    try {
      const { reportId } = req.params;
      const report = await VerificationService.getVerificationReport(reportId);
      return res.status(200).json({ data: report });
    } catch (err) {
      return handleError(req, res, err);
    }
  }
);

// 4. POST /api/v1/verifications/evaluations
router.post(
  "/verifications/evaluations",
  sessionAuth({ requireCsrf: true }),
  async (req, res) => {
    try {
      const {
        suiteRevision,
        candidateRevision,
        baselineRevision,
        metrics,
        evidenceRef,
      } = req.body || {};

      const evaluation = await VerificationService.evaluateRubric({
        suiteRevision: suiteRevision || "v1",
        candidateRevision: candidateRevision || "v1",
        baselineRevision: baselineRevision || "v0",
        metrics: metrics || {},
        evidenceRef: evidenceRef || null,
      });

      return res.status(201).json({ data: evaluation });
    } catch (err) {
      return handleError(req, res, err);
    }
  }
);

export default router;
