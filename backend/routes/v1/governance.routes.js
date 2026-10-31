import { Router } from "express";
import { sessionAuth } from "../../middleware/sessionAuth.js";
import { sendProblem } from "../../middleware/problem.js";
import { GovernanceService, GovernanceServiceError } from "../../services/governanceService.js";
import { SessionTurnLeaseRegistry, TurnLeaseError } from "../../services/turnLeaseService.js";
import { PlanningContractService, PlanningServiceError } from "../../services/planningContractService.js";

const router = Router();

function handleError(req, res, err) {
  if (err instanceof GovernanceServiceError || err instanceof TurnLeaseError || err instanceof PlanningServiceError) {
    return sendProblem(req, res, err.status, err.message);
  }
  if (err && typeof err.status === "number") {
    return sendProblem(req, res, err.status, err.message);
  }
  return sendProblem(req, res, 500, err instanceof Error ? err.message : "Internal server error");
}

// ==========================================
// 1. Policy Endpoints
// ==========================================

// GET /api/v1/policies/current
router.get("/policies/current", sessionAuth({ requireCsrf: false }), async (req, res) => {
  try {
    const policy = await GovernanceService.getCurrentPolicy();
    return res.status(200).json({
      data: { policy },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// POST /api/v1/policies/revisions
router.post("/policies/revisions", sessionAuth(), async (req, res) => {
  try {
    const { rules } = req.body || {};
    const createdBy = req.session?.principalId || null;
    const revision = await GovernanceService.createPolicyRevision({ rules, createdBy });
    return res.status(201).json({
      data: { policy: revision },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// POST /api/v1/policies/:revisionId/activate
router.post("/policies/:revisionId/activate", sessionAuth(), async (req, res) => {
  try {
    const actorId = req.session?.principalId || null;
    const policy = await GovernanceService.activatePolicyRevision(req.params.revisionId, actorId);
    return res.status(200).json({
      data: { policy },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// ==========================================
// 2. Capability Grant Endpoints
// ==========================================

// GET /api/v1/projects/:projectId/grants
router.get("/projects/:projectId/grants", sessionAuth({ requireCsrf: false }), async (req, res) => {
  try {
    const grants = await GovernanceService.getGrants(req.params.projectId);
    return res.status(200).json({
      data: { grants },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// POST /api/v1/projects/:projectId/grants
router.post("/projects/:projectId/grants", sessionAuth(), async (req, res) => {
  try {
    const { capability, resourceScope, ttlMs } = req.body || {};
    const grant = await GovernanceService.createGrant(req.params.projectId, {
      capability,
      resourceScope,
      ttlMs,
    });
    return res.status(201).json({
      data: { grant },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// POST /api/v1/grants/:grantId/revoke
router.post("/grants/:grantId/revoke", sessionAuth(), async (req, res) => {
  try {
    const grant = await GovernanceService.revokeGrant(req.params.grantId);
    return res.status(200).json({
      data: { grant },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// ==========================================
// 3. Approval Endpoints
// ==========================================

// POST /api/v1/contract-revisions/:revisionId/approval-requests
router.post("/contract-revisions/:revisionId/approval-requests", sessionAuth(), async (req, res) => {
  try {
    const { digest } = req.body || {};
    const designatedOwner = req.session?.principalId || null;
    const result = await PlanningContractService.requestApprovalForContract(req.params.revisionId, {
      digest,
      designatedOwner,
    });
    return res.status(201).json({
      data: result,
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// GET /api/v1/approvals
router.get("/approvals", sessionAuth({ requireCsrf: false }), async (req, res) => {
  try {
    const projectId = req.query.projectId ? String(req.query.projectId) : null;
    const state = req.query.state ? String(req.query.state) : null;
    const limit = parseInt(String(req.query.limit || "50"), 10);
    const offset = parseInt(String(req.query.offset || "0"), 10);
    const result = await GovernanceService.getApprovals({ projectId, state, limit, offset });
    return res.status(200).json({
      data: result,
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// GET /api/v1/approvals/:approvalId
router.get("/approvals/:approvalId", sessionAuth({ requireCsrf: false }), async (req, res) => {
  try {
    const approval = await GovernanceService.getApprovalById(req.params.approvalId);
    if (!approval) {
      return sendProblem(req, res, 404, "Approval not found");
    }
    return res.status(200).json({
      data: { approval },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// POST /api/v1/approvals/:approvalId/decisions
router.post("/approvals/:approvalId/decisions", sessionAuth(), async (req, res) => {
  try {
    const { decision, nonce, digest } = req.body || {};
    const approverId = req.session?.principalId || null;
    const approval = await GovernanceService.decideApproval(req.params.approvalId, {
      decision,
      nonce,
      digest,
      approverId,
    });
    return res.status(200).json({
      data: { approval },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// POST /api/v1/approvals/:approvalId/revoke
router.post("/approvals/:approvalId/revoke", sessionAuth(), async (req, res) => {
  try {
    const { reason } = req.body || {};
    const approval = await GovernanceService.revokeApproval(req.params.approvalId, { reason });
    return res.status(200).json({
      data: { approval },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// ==========================================
// 4. Budget & Usage Endpoints
// ==========================================

// GET /api/v1/projects/:projectId/budgets
router.get("/projects/:projectId/budgets", sessionAuth({ requireCsrf: false }), async (req, res) => {
  try {
    const budgets = await GovernanceService.getBudgets(req.params.projectId);
    return res.status(200).json({
      data: { budgets },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// POST /api/v1/projects/:projectId/budgets
router.post("/projects/:projectId/budgets", sessionAuth(), async (req, res) => {
  try {
    const { limitMicroUsd } = req.body || {};
    const budget = await GovernanceService.createOrUpdateBudget({
      scopeKind: "project",
      scopeId: req.params.projectId,
      limitMicroUsd,
    });
    return res.status(200).json({
      data: { budget },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// POST /api/v1/budgets/:accountId/reserve
router.post("/budgets/:accountId/reserve", sessionAuth(), async (req, res) => {
  try {
    const { operationKey, ceilingMicroUsd } = req.body || {};
    const reservation = await GovernanceService.reserveBudget(req.params.accountId, {
      operationKey,
      ceilingMicroUsd,
    });
    return res.status(201).json({
      data: { reservation },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// GET /api/v1/usage
router.get("/usage", sessionAuth({ requireCsrf: false }), async (req, res) => {
  try {
    return res.status(200).json({
      data: {
        totalSpentMicroUsd: 0,
        totalReservedMicroUsd: 0,
        records: [],
      },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// ==========================================
// 5. Session Turn Lease Endpoints
// ==========================================

// POST /api/v1/sessions/:sessionId/lease
router.post("/sessions/:sessionId/lease", sessionAuth(), async (req, res) => {
  try {
    const { ttlSeconds } = req.body || {};
    const ownerId = req.session?.principalId || "operator";
    const token = await SessionTurnLeaseRegistry.acquireLease(req.params.sessionId, {
      ownerId,
      ttlSeconds: ttlSeconds ? parseInt(String(ttlSeconds), 10) : 30,
    });
    return res.status(201).json({
      data: { token },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// DELETE /api/v1/sessions/:sessionId/lease
router.delete("/sessions/:sessionId/lease", sessionAuth(), async (req, res) => {
  try {
    const ownerId = req.session?.principalId || "operator";
    const generation = req.query.generation ? parseInt(String(req.query.generation), 10) : null;
    const released = await SessionTurnLeaseRegistry.releaseLease(req.params.sessionId, {
      ownerId,
      generation,
    });
    return res.status(200).json({
      data: { released },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// GET /api/v1/sessions/:sessionId/lease
router.get("/sessions/:sessionId/lease", sessionAuth({ requireCsrf: false }), async (req, res) => {
  try {
    const lease = await SessionTurnLeaseRegistry.getLease(req.params.sessionId);
    return res.status(200).json({
      data: { lease },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

export default router;
