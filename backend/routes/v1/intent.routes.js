import { Router } from "express";
import { sessionAuth } from "../../middleware/sessionAuth.js";
import { sendProblem } from "../../middleware/problem.js";
import { IntentRequirementService, IntentServiceError } from "../../services/intentRequirementService.js";

const router = Router();

function handleError(req, res, err) {
  if (err instanceof IntentServiceError) {
    return sendProblem(req, res, err.status, err.message);
  }
  if (err && typeof err.status === "number") {
    return sendProblem(req, res, err.status, err.message);
  }
  return sendProblem(req, res, 500, err instanceof Error ? err.message : "Internal server error");
}

// ==========================================
// 1. Goals Endpoints
// ==========================================

// POST /api/v1/conversations/:conversationId/goals
router.post("/conversations/:conversationId/goals", sessionAuth(), async (req, res) => {
  try {
    const { messageId, constraints, autonomyMode } = req.body || {};
    const goal = await IntentRequirementService.createGoalFromConversation(req.params.conversationId, {
      messageId,
      constraints,
      autonomyMode,
    });
    return res.status(201).json({
      data: { goal },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// GET /api/v1/projects/:projectId/goals
router.get("/projects/:projectId/goals", sessionAuth({ requireCsrf: false }), async (req, res) => {
  try {
    const { status, limit, offset } = req.query;
    const goals = await IntentRequirementService.getGoals(req.params.projectId, {
      status: typeof status === "string" ? status : null,
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
    });
    return res.status(200).json({
      data: { goals },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// GET /api/v1/goals/:goalId
router.get("/goals/:goalId", sessionAuth({ requireCsrf: false }), async (req, res) => {
  try {
    const goal = await IntentRequirementService.getGoalById(req.params.goalId);
    return res.status(200).json({
      data: { goal },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// ==========================================
// 2. Intent Analysis Endpoints
// ==========================================

// POST /api/v1/goals/:goalId/intent-analysis
router.post("/goals/:goalId/intent-analysis", sessionAuth(), async (req, res) => {
  try {
    const { inputMessageIds, budgetCeilingMicroUsd } = req.body || {};
    const intentAnalysis = await IntentRequirementService.analyzeIntent(req.params.goalId, {
      inputMessageIds,
      budgetCeilingMicroUsd,
    });
    return res.status(200).json({
      data: { intentAnalysis },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// ==========================================
// 3. Clarifications Endpoints
// ==========================================

// GET /api/v1/goals/:goalId/clarifications
router.get("/goals/:goalId/clarifications", sessionAuth({ requireCsrf: false }), async (req, res) => {
  try {
    const { status, limit, offset } = req.query;
    const clarifications = await IntentRequirementService.getClarifications(req.params.goalId, {
      status: typeof status === "string" ? status : null,
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
    });
    return res.status(200).json({
      data: { clarifications },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// POST /api/v1/goals/:goalId/clarifications (provisional helper endpoint)
router.post("/goals/:goalId/clarifications", sessionAuth(), async (req, res) => {
  try {
    const { question, materiality, options } = req.body || {};
    const clarification = await IntentRequirementService.createClarification(req.params.goalId, {
      question,
      materiality,
      options,
    });
    return res.status(201).json({
      data: { clarification },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// POST /api/v1/clarifications/:clarificationId/answers
router.post("/clarifications/:clarificationId/answers", sessionAuth(), async (req, res) => {
  try {
    const { answer, selectedOptionId } = req.body || {};
    const clarification = await IntentRequirementService.answerClarification(req.params.clarificationId, {
      answer,
      selectedOptionId,
    });
    return res.status(200).json({
      data: { clarification },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// ==========================================
// 4. Research Endpoints
// ==========================================

// POST /api/v1/goals/:goalId/research
router.post("/goals/:goalId/research", sessionAuth(), async (req, res) => {
  try {
    const { questions, allowedSources, budgetCeilingMicroUsd } = req.body || {};
    const report = await IntentRequirementService.conductResearch(req.params.goalId, {
      questions,
      allowedSources,
      budgetCeilingMicroUsd,
    });
    return res.status(200).json({
      data: { report },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// GET /api/v1/goals/:goalId/research
router.get("/goals/:goalId/research", sessionAuth({ requireCsrf: false }), async (req, res) => {
  try {
    const { limit, offset } = req.query;
    const reports = await IntentRequirementService.getResearchReports(req.params.goalId, {
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
    });
    return res.status(200).json({
      data: { reports },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// ==========================================
// 5. Requirement Revisions Endpoints
// ==========================================

// POST /api/v1/goals/:goalId/requirement-revisions
router.post("/goals/:goalId/requirement-revisions", sessionAuth(), async (req, res) => {
  try {
    const { requirements, assumptions, exclusions, sourceRefs } = req.body || {};
    const requirementRevision = await IntentRequirementService.createRequirementRevision(req.params.goalId, {
      requirements,
      assumptions,
      exclusions,
      sourceRefs,
    });
    return res.status(201).json({
      data: { requirementRevision },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// GET /api/v1/goals/:goalId/requirement-revisions
router.get("/goals/:goalId/requirement-revisions", sessionAuth({ requireCsrf: false }), async (req, res) => {
  try {
    const { limit, offset } = req.query;
    const revisions = await IntentRequirementService.getRequirementRevisions(req.params.goalId, {
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

// GET /api/v1/requirement-revisions/:revisionId
router.get("/requirement-revisions/:revisionId", sessionAuth({ requireCsrf: false }), async (req, res) => {
  try {
    const revision = await IntentRequirementService.getRequirementRevisionById(req.params.revisionId);
    return res.status(200).json({
      data: { revision },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// ==========================================
// 6. Decisions Endpoints
// ==========================================

// GET /api/v1/goals/:goalId/decisions
router.get("/goals/:goalId/decisions", sessionAuth({ requireCsrf: false }), async (req, res) => {
  try {
    const { limit, offset } = req.query;
    const decisions = await IntentRequirementService.getDecisions(req.params.goalId, {
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
    });
    return res.status(200).json({
      data: { decisions },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// POST /api/v1/goals/:goalId/decisions
router.post("/goals/:goalId/decisions", sessionAuth(), async (req, res) => {
  try {
    const { proposal, alternatives, status, rationale, sourceRefs } = req.body || {};
    const decision = await IntentRequirementService.createDecision(req.params.goalId, {
      proposal,
      alternatives,
      status,
      rationale,
      sourceRefs,
    });
    return res.status(201).json({
      data: { decision },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

export default router;
