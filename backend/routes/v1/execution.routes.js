import { once } from "node:events";
import { query, transaction } from "../../config/db.js";
import { requireProjectIdentity, validate, uuidSchema } from "../../dist-workspace/src/security/executionPolicy.js";
import { Router } from "express";
import { sessionAuth } from "../../middleware/sessionAuth.js";
import { sendProblem } from "../../middleware/problem.js";
import { ExecutionService, ExecutionServiceError } from "../../services/executionService.js";
import { WorkflowOrchestratorService, WorkflowServiceError } from "../../services/workflowOrchestratorService.js";
import { AgentWorkerService } from "../../services/agentWorkerService.js";
import { requestPreparedApproval } from "../../dist-workspace/src/workspace/frontendController.js";

const router = Router();
// Authenticate scope before projections, controls and streams; retain route CSRF checks.
router.use(["/runs/:runId","/effects/:effectId","/projects/:projectId/runs","/goals/:goalId/runs"],sessionAuth(),async(req,res,next)=>{
  try{if(req.params.goalId && req.method === "POST" && !req.body?.contractRevisionId)return sendProblem(req,res,400,"contractRevisionId is required");
    let projectId=req.params.projectId;
    if(req.params.runId){validate(uuidSchema,req.params.runId);projectId=(await query("SELECT project_id FROM runs WHERE id=$1",[req.params.runId])).rows[0]?.project_id;}
    if(req.params.effectId){validate(uuidSchema,req.params.effectId);projectId=(await query("SELECT r.project_id FROM effects e JOIN runs r ON r.id=e.run_id WHERE e.id=$1",[req.params.effectId])).rows[0]?.project_id;}
    if(req.params.goalId){validate(uuidSchema,req.params.goalId);projectId=(await query("SELECT project_id FROM goals WHERE id=$1",[req.params.goalId])).rows[0]?.project_id;}
    if(!projectId)return sendProblem(req,res,404,req.params.runId ? `Run ${req.params.runId} not found` : "Resource not found");
    validate(uuidSchema,projectId);await transaction(client=>requireProjectIdentity(client,projectId,req.session));res.locals.projectId=projectId;next();
  }catch(error){handleError(req,res,error);}
});


function handleError(req, res, err) {
  if (err instanceof ExecutionServiceError || err instanceof WorkflowServiceError) {
    return sendProblem(req, res, err.status, err.message);
  }
  if (err && typeof err.status === "number") {
    return sendProblem(req, res, err.status, err.message);
  }
  return sendProblem(req, res, 500, err instanceof Error ? err.message : "Internal server error");
}

// ==========================================
// 1. Run Projections & Listing
// ==========================================

// GET /api/v1/projects/:projectId/runs
router.get("/projects/:projectId/runs", sessionAuth({ requireCsrf: false }), async (req, res) => {
  try {
    const { state, limit, offset } = req.query;
    const runs = await ExecutionService.getRuns(req.params.projectId, {
      state: typeof state === "string" ? state : null,
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
    });
    return res.status(200).json({
      data: { runs },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// GET /api/v1/runs/:runId
router.get("/runs/:runId", sessionAuth({ requireCsrf: false }), async (req, res) => {
  try {
    const run = await ExecutionService.getRunById(req.params.runId);
    return res.status(200).json({
      data: { run },
      meta: { requestId: req.requestId, currentSequence: run.currentSequence },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// GET /api/v1/runs/:runId/tasks
router.get("/runs/:runId/tasks", sessionAuth({ requireCsrf: false }), async (req, res) => {
  try {
    const { state, limit, offset } = req.query;
    const tasks = await ExecutionService.getTasks(req.params.runId, {
      state: typeof state === "string" ? state : null,
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
    });
    return res.status(200).json({
      data: { tasks },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// GET /api/v1/runs/:runId/agents
router.get("/runs/:runId/agents", sessionAuth({ requireCsrf: false }), async (req, res) => {
  try {
    const { limit, offset } = req.query;
    const agents = await ExecutionService.getAgents(req.params.runId, {
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
    });
    return res.status(200).json({
      data: { agents },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// GET /api/v1/runs/:runId/effects
router.get("/runs/:runId/effects", sessionAuth({ requireCsrf: false }), async (req, res) => {
  try {
    const { state, limit, offset } = req.query;
    const effects = await ExecutionService.getEffects(req.params.runId, {
      state: typeof state === "string" ? state : null,
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
    });
    return res.status(200).json({
      data: { effects },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// GET /api/v1/runs/:runId/checkpoints
router.get("/runs/:runId/checkpoints", sessionAuth({ requireCsrf: false }), async (req, res) => {
  try {
    const { limit, offset } = req.query;
    const checkpoints = await ExecutionService.getCheckpoints(req.params.runId, {
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
    });
    return res.status(200).json({
      data: { checkpoints },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// ==========================================
// 2. Run Execution Controls (Pause / Resume / Cancel)
// ==========================================

// POST /api/v1/runs/:runId/pause
router.post("/runs/:runId/pause", sessionAuth(), async (req, res) => {
  try {
    const { reason } = req.body || {};
    const actorId = req.session?.principalId || null;
    const run = await ExecutionService.pauseRun(req.params.runId, { reason, actorId });
    return res.status(202).json({
      data: { run },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// POST /api/v1/runs/:runId/resume
router.post("/runs/:runId/resume", sessionAuth(), async (req, res) => {
  try {
    const { checkpointId, expectedEpoch } = req.body || {};
    const actorId = req.session?.principalId || null;
    const run = await ExecutionService.resumeRun(req.params.runId, { checkpointId, expectedEpoch, actorId });
    return res.status(202).json({
      data: { run },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// POST /api/v1/runs/:runId/cancel
router.post("/runs/:runId/cancel", sessionAuth(), async (req, res) => {
  try {
    const { reason } = req.body || {};
    const actorId = req.session?.principalId || null;
    const run = await ExecutionService.cancelRun(req.params.runId, { reason, actorId });
    return res.status(202).json({
      data: { run },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// ==========================================
// 3. Effect Reconciliation
// ==========================================

// POST /api/v1/effects/:effectId/reconcile
router.post("/effects/:effectId/reconcile", sessionAuth(), async (req, res) => {
  try {
    const { externalReceiptRef, reason } = req.body || {};
    const actorId = req.session?.principalId || null;
    const operation = await ExecutionService.reconcileEffect(req.params.effectId, {
      externalReceiptRef,
      reason,
      actorId,
    });
    return res.status(202).json({
      data: { operation },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// ==========================================
// 4. Ordered Run Events (SSE)
// ==========================================

// Human approval requests reference only durable server-prepared actions.
router.post('/runs/:runId/approval-requests',sessionAuth(),async(req,res)=>{
 try{res.status(201).json({data:await requestPreparedApproval(req.params.runId,req.session,req.body,req.get('Idempotency-Key')||''),meta:{requestId:req.requestId}});}
 catch(error){const safe=Number.isInteger(error?.status)&&/^[A-Z_]+$/.test(error?.code||'');return sendProblem(req,res,safe?error.status:503,safe?error.code:'APPROVAL_REQUEST_UNAVAILABLE');}
});

// New UI terminal lease holders remain control-plane-only. Older event DTOs are preserved.
function publicEventPayload(event){
 const payload=event.payload;
 return event.eventType==='task_started'&&typeof payload?.holder==='string'&&payload.holder.startsWith('ui-terminal:')?{...payload,holder:'trusted-terminal-owner'}:payload;
}

// GET /api/v1/runs/:runId/events
router.get("/runs/:runId/events",sessionAuth({requireCsrf:false}),async(req,res)=>{
 const runId=req.params.runId;const raw=req.headers["last-event-id"]??req.query.after??"0";
 if(typeof raw!=="string"||raw.length>19||!/^\d+$/.test(raw)||BigInt(raw)>9223372036854775807n)return sendProblem(req,res,410,"Event cursor is invalid or expired");
 let cursor=raw,lastHeartbeat=Date.now();const controller=new AbortController();res.once("close",()=>controller.abort());
 res.writeHead(200,{"Content-Type":"text/event-stream","Cache-Control":"no-cache, no-transform","Connection":"keep-alive","X-Accel-Buffering":"no"});res.flushHeaders();
 try{while(!controller.signal.aborted){
   await transaction(client=>requireProjectIdentity(client,res.locals.projectId,req.session));
   const events=await ExecutionService.getRunEvents(runId,{afterSequence:cursor,limit:100});
   for(const event of events){if(controller.signal.aborted)break;const accepted=res.write('id: '+event.sequence+'\nevent: '+event.eventType+'\ndata: '+JSON.stringify(publicEventPayload(event))+'\n\n');cursor=event.sequence;res.flush?.();if(!accepted)await once(res,"drain",{signal:controller.signal});}
   if(Date.now()-lastHeartbeat>=10000){res.write(": ping\n\n");res.flush?.();lastHeartbeat=Date.now();}
   if(events.length<100&&!controller.signal.aborted)await new Promise(resolve=>setTimeout(resolve,250));
 }}catch{if(!controller.signal.aborted){res.write('event: error\ndata: '+JSON.stringify({code:"STREAM_UNAVAILABLE",message:"Run stream is unavailable; reconnect after authentication or recovery."})+'\n\n');}}
 finally{if(!res.writableEnded)res.end();}
});

// ==========================================
// 5. Public Execution-Start & Bounded Repair (Stage 13)
// ==========================================

// POST /api/v1/goals/:goalId/runs
router.post("/goals/:goalId/runs", sessionAuth(), async (req, res) => {
  try {
    const { contractRevisionId, contractDigest, repositorySnapshotId, budgetCeilingMicroUsd } = req.body || {};
    const actorId = req.session?.principalId || null;
    const run = await WorkflowOrchestratorService.startWorkflowRun(req.params.goalId, {
      contractRevisionId,
      contractDigest,
      repositorySnapshotId,
      budgetCeilingMicroUsd,
      actorId,
      session:req.session,
    });
    return res.status(202).json({
      data: { run },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// GET /api/v1/runs/:runId/failures
router.get("/runs/:runId/failures", sessionAuth({ requireCsrf: false }), async (req, res) => {
  try {
    const failures = await WorkflowOrchestratorService.getRunFailures(req.params.runId);
    return res.status(200).json({
      data: { failures },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// GET /api/v1/runs/:runId/repairs
router.get("/runs/:runId/repairs", sessionAuth({ requireCsrf: false }), async (req, res) => {
  try {
    const repairs = await WorkflowOrchestratorService.getRunRepairs(req.params.runId);
    return res.status(200).json({
      data: { repairs },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// POST /api/v1/runs/:runId/repairs
router.post("/runs/:runId/repairs", sessionAuth(), async (req, res) => {
  try {
    const { hypothesisId, appliedPatchDigest } = req.body || {};
    const result = await WorkflowOrchestratorService.applyRepair(req.params.runId, hypothesisId, { appliedPatchDigest });
    return res.status(200).json({
      data: result,
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// POST /api/v1/runs/:runId/execute
router.post("/runs/:runId/execute", sessionAuth(), async (req, res) => {
  try {
    const outcome = await AgentWorkerService.runWorkflowToCompletion(req.params.runId,{session:req.session});
    return res.status(200).json({
      data: outcome,
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

export default router;
