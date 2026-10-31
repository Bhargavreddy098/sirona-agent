import { validate, toolRequestSchema, uuidSchema } from "../../dist-workspace/src/security/executionPolicy.js";
import { Router } from "express";
import { sessionAuth } from "../../middleware/sessionAuth.js";
import { sendProblem } from "../../middleware/problem.js";
import { ToolRuntimeService, ToolRuntimeError } from "../../services/toolRuntimeService.js";

const router = Router();
router.use("/developer-connections/:connectionId",sessionAuth(),async(req,res,next)=>{try{validate(uuidSchema,req.params.connectionId);const connection=await ToolRuntimeService.getDeveloperConnection(req.params.connectionId);if(connection.workspaceId!==req.session.workspaceId)return sendProblem(req,res,403,"Connection belongs to another workspace");next();}catch(error){handleError(req,res,error);}});

function handleError(req, res, err) {
  if (err instanceof ToolRuntimeError) {
    return sendProblem(req, res, err.status, err.message);
  }
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

// ==========================================
// 1. Tool Catalog
// ==========================================

// GET /api/v1/tools
router.get("/tools", sessionAuth({ requireCsrf: false }), async (req, res) => {
  try {
    const capability = typeof req.query.capability === "string" ? req.query.capability : undefined;
    const availability = typeof req.query.availability === "string" ? req.query.availability : "available";
    const limit = Math.min(Math.max(parseInt(String(req.query.limit || "50"), 10) || 50, 1), 100);
    const offset = Math.max(parseInt(String(req.query.offset || "0"), 10) || 0, 0);

    const catalog = await ToolRuntimeService.getToolCatalog({
      capability,
      availability,
      limit,
      offset,
    });
    res.status(200).json({ data: catalog });
  } catch (err) {
    handleError(req, res, err);
  }
});

// GET /api/v1/tools/:toolId
router.get("/tools/:toolId", sessionAuth({ requireCsrf: false }), async (req, res) => {
  try {
    const tool = await ToolRuntimeService.getTool(req.params.toolId);
    res.status(200).json({ data: { tool } });
  } catch (err) {
    handleError(req, res, err);
  }
});

// ==========================================
// 2. Developer Connections
// ==========================================

// POST /api/v1/developer-connections
router.post("/developer-connections", sessionAuth({ requireCsrf: true }), async (req, res) => {
  try {
    const {
      workspaceId,
      adapterKind,
      installRef,
      authMethod,
      requestedCapabilities,
      testProfile,
      metadata,
    } = req.body || {};

    if(workspaceId && workspaceId!==req.session.workspaceId)return sendProblem(req,res,403,"Connection belongs to another workspace");
    const connection = await ToolRuntimeService.createDeveloperConnection({
      workspaceId: req.session.workspaceId,
      adapterKind,
      installRef,
      authMethod,
      requestedCapabilities,
      testProfile,
      metadata,
    });
    res.status(201).json({ data: { connection } });
  } catch (err) {
    handleError(req, res, err);
  }
});

// GET /api/v1/developer-connections
router.get("/developer-connections", sessionAuth({ requireCsrf: false }), async (req, res) => {
  try {
    if(req.query.workspaceId && req.query.workspaceId!==req.session.workspaceId)return sendProblem(req,res,403,"Connection belongs to another workspace");
    const workspaceId = req.session.workspaceId;
    const status = typeof req.query.status === "string" ? req.query.status : null;
    const limit = Math.min(Math.max(parseInt(String(req.query.limit || "50"), 10) || 50, 1), 100);
    const offset = Math.max(parseInt(String(req.query.offset || "0"), 10) || 0, 0);

    const result = await ToolRuntimeService.listDeveloperConnections({
      workspaceId,
      status,
      limit,
      offset,
    });
    res.status(200).json({ data: result });
  } catch (err) {
    handleError(req, res, err);
  }
});

// GET /api/v1/developer-connections/:connectionId
router.get("/developer-connections/:connectionId", sessionAuth({ requireCsrf: false }), async (req, res) => {
  try {
    const connection = await ToolRuntimeService.getDeveloperConnection(req.params.connectionId);
    res.status(200).json({ data: { connection } });
  } catch (err) {
    handleError(req, res, err);
  }
});

// POST /api/v1/developer-connections/:connectionId/qualify
router.post("/developer-connections/:connectionId/qualify", sessionAuth({ requireCsrf: true }), async (req, res) => {
  try {
    const { testProfile, budgetCeilingMicroUsd } = req.body || {};
    const result = await ToolRuntimeService.qualifyDeveloperConnection(req.params.connectionId, {
      testProfile,
      budgetCeilingMicroUsd,
    });
    res.status(200).json({ data: result });
  } catch (err) {
    handleError(req, res, err);
  }
});

// POST /api/v1/developer-connections/:connectionId/disconnect
router.post("/developer-connections/:connectionId/disconnect", sessionAuth({ requireCsrf: true }), async (req, res) => {
  try {
    const { reason } = req.body || {};
    const connection = await ToolRuntimeService.disconnectDeveloperConnection(req.params.connectionId, { reason });
    res.status(200).json({ data: { connection } });
  } catch (err) {
    handleError(req, res, err);
  }
});

// DELETE /api/v1/developer-connections/:connectionId
router.delete("/developer-connections/:connectionId", sessionAuth({ requireCsrf: true }), async (req, res) => {
  try {
    const { reason } = req.body || {};
    const connection = await ToolRuntimeService.disconnectDeveloperConnection(req.params.connectionId, { reason });
    res.status(200).json({ data: { connection } });
  } catch (err) {
    handleError(req, res, err);
  }
});

// ==========================================
// 3. Tool Invocation & Receipts
// ==========================================

// POST /api/v1/tools/invoke
router.post("/tools/invoke", sessionAuth({ requireCsrf: true }), async (req, res) => {
  try {
    const {
      toolName,
      input,
      workspaceRoot,
      projectId,
      connectionId,
      runId,
      taskId,
      timeoutMs,
    } = validate(toolRequestSchema,req.body || {});

    const result = await ToolRuntimeService.invokeTool({
      toolName,
      input,
      workspaceRoot,
      projectId,
      connectionId,
      runId,
      taskId,
      timeoutMs,
      session: req.session,
      operationKey: req.get("Idempotency-Key") || null,
      workerFence: req.body?.workerFence || null,
    });
    res.status(200).json({ data: result });
  } catch (err) {
    handleError(req, res, err);
  }
});

// GET /api/v1/tools/receipts/:receiptId
router.get("/tools/receipts/:receiptId", sessionAuth({ requireCsrf: false }), async (req, res) => {
  try {
    const receipt = await ToolRuntimeService.getToolReceipt(validate(uuidSchema,req.params.receiptId),req.session);
    res.status(200).json({ data: { receipt } });
  } catch (err) {
    handleError(req, res, err);
  }
});

export default router;
