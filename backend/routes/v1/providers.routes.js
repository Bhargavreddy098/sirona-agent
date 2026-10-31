import { Router } from "express";
import { sessionAuth } from "../../middleware/sessionAuth.js";
import { sendProblem } from "../../middleware/problem.js";
import { ProviderService, ProviderServiceError } from "../../services/providerService.js";

const router = Router();

function formatProviderError(err) {
  if (!err) return "Provider turn failed";
  let msg = err.message || String(err);
  try {
    if (typeof msg === "string" && (msg.startsWith("{") || msg.includes('"message":'))) {
      const parsed = JSON.parse(msg);
      if (parsed.error?.message) {
        msg = parsed.error.message;
        if (typeof msg === "string" && (msg.startsWith("{") || msg.includes('"message":'))) {
          const inner = JSON.parse(msg);
          msg = inner.error?.message || msg;
        }
      }
    }
  } catch {}

  if (typeof msg === "string") {
    if (msg.includes("503 status code (no body)") || msg.includes("503 Service Unavailable") || msg.includes("Service Unavailable")) {
      return "Upstream AI provider endpoint returned Service Unavailable (HTTP 503). Ensure your LLM server or proxy is running and responsive, or select an alternative model.";
    }
    if (
      msg.includes("429") ||
      msg.includes("Rate limit") ||
      msg.includes("rate_limit") ||
      msg.includes("All models exhausted") ||
      msg.includes("Quota exceeded") ||
      msg.includes("RESOURCE_EXHAUSTED") ||
      msg.includes("requests per day")
    ) {
      return "AI Provider Rate Limit or Quota Exceeded. The requested model is temporarily unavailable. Please select another model (such as Gemini 2.5 Flash) or retry in a few moments.";
    }
    if (msg.includes("401") || msg.includes("Unauthorized") || msg.includes("Invalid API key") || msg.includes("AUTH_FAILED")) {
      return "Authentication failed with the AI provider. Please verify or update your API key in Settings > Model Providers.";
    }
    if (msg.includes("ECONNREFUSED") || msg.includes("Failed to connect") || msg.includes("fetch failed")) {
      return "Could not connect to the AI model provider endpoint. Ensure your local server (e.g. Ollama, LM Studio, or vLLM) is running.";
    }
  }

  return typeof msg === "string" ? msg : "Provider turn failed";
}

function handleError(req, res, err) {
  const cleanMsg = formatProviderError(err);
  if (err instanceof ProviderServiceError) {
    return sendProblem(req, res, err.status, cleanMsg);
  }
  if (err && typeof err.status === "number") {
    return sendProblem(req, res, err.status, cleanMsg);
  }
  if (err && err.code === "API_KEY_REQUIRED") {
    return sendProblem(req, res, 400, cleanMsg);
  }
  return sendProblem(req, res, 500, cleanMsg || "Internal server error");
}

// ==========================================
// 1. Models Catalog & Options
// ==========================================

// Credential operations must belong to the authenticated workspace, even with a valid ID.
router.use('/provider-connections/:id', sessionAuth(), async (req,res,next)=>{
  try {const connection=await ProviderService.getConnectionById(req.params.id);
    if(!connection||connection.workspaceId!==req.session.workspaceId)return sendProblem(req,res,404,'Provider connection not found');
    next();
  }catch(error){handleError(req,res,error);}
});

// GET /api/v1/providers
router.get("/providers", sessionAuth({ requireCsrf: false }), async (req, res) => {
  try {
    const providers = ProviderService.getSupportedProviders();
    return res.status(200).json({
      data: { providers },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// GET /api/v1/provider-connections
router.get("/provider-connections", sessionAuth({ requireCsrf: false }), async (req, res) => {
  try {
    const connections = await ProviderService.getProviderConnections({
      all: true,
      workspaceId: req.session?.workspaceId || null,
    });
    return res.status(200).json({
      data: { connections },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// POST /api/v1/provider-connections
router.post("/provider-connections", sessionAuth(), async (req, res) => {
  try {
    const { kind, name, baseUrl, apiKey, workspaceId, isActive } = req.body || {};
    if(workspaceId && workspaceId!==req.session.workspaceId)return sendProblem(req,res,403,'Workspace does not match the session');
    const connection = await ProviderService.createProviderConnection({
      workspaceId: req.session.workspaceId,
      kind,
      name,
      baseUrl,
      apiKey,
      isActive,
    });
    return res.status(201).json({
      data: { connection },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// PATCH /api/v1/provider-connections/:id
router.patch("/provider-connections/:id", sessionAuth(), async (req, res) => {
  try {
    const connection = await ProviderService.updateProviderConnection(req.params.id, req.body || {});
    return res.status(200).json({
      data: { connection },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// DELETE /api/v1/provider-connections/:id
router.delete("/provider-connections/:id", sessionAuth(), async (req, res) => {
  try {
    const result = await ProviderService.deleteProviderConnection(req.params.id);
    return res.status(200).json({
      data: result,
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// POST /api/v1/provider-connections/:id/test
router.post("/provider-connections/:id/test", sessionAuth(), async (req, res) => {
  try {
    const result = await ProviderService.testProviderConnection(req.params.id);
    return res.status(200).json({
      data: result,
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// POST /api/v1/provider-connections/:id/models/refresh
router.post("/provider-connections/:id/models/refresh", sessionAuth(), async (req, res) => {
  try {
    const result = await ProviderService.refreshConnectionModels(req.params.id);
    return res.status(200).json({
      data: result,
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// GET /api/v1/model-settings
router.get("/model-settings", sessionAuth({ requireCsrf: false }), async (req, res) => {
  try {
    const settings = await ProviderService.getModelSettings();
    return res.status(200).json({
      data: settings,
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// PATCH /api/v1/model-settings
router.patch("/model-settings", sessionAuth(), async (req, res) => {
  try {
    const settings = await ProviderService.updateModelSettings(req.body || {});
    return res.status(200).json({
      data: settings,
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// GET /api/v1/models
router.get("/models", sessionAuth({ requireCsrf: false }), async (req, res) => {
  try {
    const models = await ProviderService.getModels();
    const connections = await ProviderService.getProviderConnections({workspaceId:req.session.workspaceId});
    return res.status(200).json({
      data: { models, connections },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// POST /api/v1/models/verify
router.post("/models/verify", sessionAuth(), async (req, res) => {
  try {
    const { kind, name, baseUrl, apiKey, workspaceId, discover } = req.body || {};
    if(workspaceId && workspaceId!==req.session.workspaceId)return sendProblem(req,res,403,'Workspace does not match the session');
    const result = await ProviderService.saveProviderConnection({
      workspaceId: req.session.workspaceId,
      kind,
      name,
      baseUrl,
      apiKey,
      discover: !!discover,
    });
    return res.status(200).json({
      data: {
        connection: result.connection,
        models: result.models,
        count: result.count,
      },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// ==========================================
// 2. Governed & Budget-Settled Turn Execution
// ==========================================

// POST /api/v1/conversations/:conversationId/turns
router.post("/conversations/:conversationId/turns", sessionAuth(), async (req, res) => {
  const isSse = req.headers.accept?.includes("text/event-stream");
  const conversationId = req.params.conversationId;
  const { prompt, modelId, projectId } = req.body || {};
  const actorId = req.session?.principalId || null;

  if (isSse) {
    let headersSent = false;
    let completedNormally = false;
    const abortController = new AbortController();

    // Hook response close to handle client disconnect / cancellation
    res.on("close", () => {
      if (!completedNormally && !res.writableEnded) {
        abortController.abort(new Error("CLIENT_DISCONNECTED"));
      }
    });

    try {
      // Pre-validate before writing SSE headers
      if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
        return sendProblem(req, res, 400, "Prompt must not be empty");
      }

      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      });
      headersSent = true;

      const result = await ProviderService.executeTurn({
        conversationId,
        prompt,
        modelId,
        actorId,
        projectId,
        signal: abortController.signal,
        onToken: (token) => {
          if (!res.writableEnded) {
            res.write(`data: ${JSON.stringify({ type: "token", token })}\n\n`);
          }
        },
      });

      completedNormally = true;
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ type: "done", ...result })}\n\n`);
        return res.end();
      }
    } catch (err) {
      if (!headersSent) {
        return handleError(req, res, err);
      }
      if (!res.writableEnded) {
        res.write(
          `data: ${JSON.stringify({
            type: "error",
            error: formatProviderError(err),
            code: err.code || "TURN_FAILED",
          })}\n\n`
        );
        return res.end();
      }
    }
    return;
  }

  // Standard JSON response
  try {
    const collectedTokens = [];
    const result = await ProviderService.executeTurn({
      conversationId,
      prompt,
      modelId,
      actorId,
      projectId,
      onToken: (token) => {
        collectedTokens.push(token);
      },
    });

    return res.status(200).json({
      data: {
        ...result,
        tokens: collectedTokens,
      },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

export default router;
