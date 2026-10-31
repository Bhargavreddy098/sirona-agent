import { Router } from "express";
import { sessionAuth } from "../../middleware/sessionAuth.js";
import { sendProblem } from "../../middleware/problem.js";
import { PlanningContractService, PlanningServiceError } from "../../services/planningContractService.js";

const router = Router();

function handleError(req, res, err) {
  if (err instanceof PlanningServiceError) {
    return sendProblem(req, res, err.status, err.message);
  }
  if (err && typeof err.status === "number") {
    return sendProblem(req, res, err.status, err.message);
  }
  return sendProblem(req, res, 500, err instanceof Error ? err.message : "Internal server error");
}

// ==========================================
// 1. Plans Endpoints
// ==========================================

// POST /api/v1/goals/:goalId/plans
router.post("/goals/:goalId/plans", sessionAuth(), async (req, res) => {
  try {
    const { requirementRevisionId, budgetCeilingMicroUsd, layers, steps, reason } = req.body || {};
    const planRevision = await PlanningContractService.createPlan(req.params.goalId, {
      requirementRevisionId,
      budgetCeilingMicroUsd,
      layers,
      steps,
      reason,
    });
    return res.status(201).json({
      data: { plan: planRevision },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// GET /api/v1/goals/:goalId/plans
router.get("/goals/:goalId/plans", sessionAuth({ requireCsrf: false }), async (req, res) => {
  try {
    const { limit, offset } = req.query;
    const plans = await PlanningContractService.getPlans(req.params.goalId, {
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
    });
    return res.status(200).json({
      data: { plans },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// POST /api/v1/plans/:planId/revisions
router.post("/plans/:planId/revisions", sessionAuth(), async (req, res) => {
  try {
    const { baseRevisionId, layers, steps, reason } = req.body || {};
    const planRevision = await PlanningContractService.createPlanRevision(req.params.planId, {
      baseRevisionId,
      layers,
      steps,
      reason,
    });
    return res.status(201).json({
      data: { plan: planRevision },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// GET /api/v1/plan-revisions/:revisionId
router.get("/plan-revisions/:revisionId", sessionAuth({ requireCsrf: false }), async (req, res) => {
  try {
    const revision = await PlanningContractService.getPlanRevisionById(req.params.revisionId);
    return res.status(200).json({
      data: { revision },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// ==========================================
// 2. Build Contracts Endpoints
// ==========================================

// POST /api/v1/goals/:goalId/contracts
router.post("/goals/:goalId/contracts", sessionAuth(), async (req, res) => {
  try {
    const { planRevisionId, document, reason } = req.body || {};
    const contractRevision = await PlanningContractService.createContract(req.params.goalId, {
      planRevisionId,
      document,
      reason,
    });
    return res.status(201).json({
      data: { contract: contractRevision },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// POST /api/v1/contracts/:contractId/revisions
router.post("/contracts/:contractId/revisions", sessionAuth(), async (req, res) => {
  try {
    const { baseRevisionId, planRevisionId, document, reason } = req.body || {};
    const contractRevision = await PlanningContractService.createContractRevision(req.params.contractId, {
      baseRevisionId,
      planRevisionId,
      document,
      reason,
    });
    return res.status(201).json({
      data: { contract: contractRevision },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// GET /api/v1/contracts/:contractId/revisions
router.get("/contracts/:contractId/revisions", sessionAuth({ requireCsrf: false }), async (req, res) => {
  try {
    const { limit, offset } = req.query;
    const revisions = await PlanningContractService.getContracts(req.params.contractId, {
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
    });
    return res.status(200).json({
      data: { revisions },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// GET /api/v1/contract-revisions/:revisionId
router.get("/contract-revisions/:revisionId", sessionAuth({ requireCsrf: false }), async (req, res) => {
  try {
    const revision = await PlanningContractService.getContractRevisionById(req.params.revisionId);
    return res.status(200).json({
      data: { revision },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// GET /api/v1/contract-revisions/:revisionId/diff
router.get("/contract-revisions/:revisionId/diff", sessionAuth({ requireCsrf: false }), async (req, res) => {
  try {
    const againstRevisionId = typeof req.query.against === "string" ? req.query.against : null;
    const diff = await PlanningContractService.diffContractRevisions(req.params.revisionId, {
      againstRevisionId,
    });
    return res.status(200).json({
      data: diff,
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

export default router;
