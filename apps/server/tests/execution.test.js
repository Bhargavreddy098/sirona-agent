import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { loadEnvironment } from "../server.js";
import { readRuntimeConfig } from "../foundation/runtimeConfig.js";
import { createLogger } from "../foundation/logger.js";
import { createDatabaseOwner, activateDatabaseOwner, query } from "../config/db.js";
import { createApp } from "../app.js";
import { createHealthController } from "../controllers/healthController.js";
import apiRoutes from "../routes/index.js";
import { stage07Admission } from "../foundation/admission.js";
import { generateLauncherChallenge } from "../services/launcherChallenge.js";
import { ProjectService } from "../services/projectService.js";
import { ExecutionService } from "../services/executionService.js";
import { serve, request } from "./helpers.js";

loadEnvironment();
const config = readRuntimeConfig(process.env);
const logger = createLogger(config);
let owner;

before(async () => {
  owner = createDatabaseOwner(config.database, logger);
  activateDatabaseOwner(owner);
  await owner.initialize();
});

after(async () => {
  if (owner) await owner.close();
});

function createTestApp() {
  const healthController = createHealthController({
    checkDatabase: () => owner.ready(),
    cleanExpiredLeases: async () => {},
  });
  return createApp({
    healthController,
    apiRoutes,
    auditContext: (req, res, next) => next(),
    rateLimiter: (req, res, next) => next(),
    allowedOrigins: ["http://127.0.0.1:5173"],
    logError: () => {},
    admission: stage07Admission,
  });
}

async function createAuthenticatedSession(base) {
  const { challenge, clientNonce } = generateLauncherChallenge(60000);
  const bootstrapRes = await request(base, "/api/v1/session/bootstrap", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ challenge, clientNonce }),
  });
  assert.equal(bootstrapRes.status, 200);
  const bootstrapBody = await bootstrapRes.json();
  const cookie = bootstrapRes.headers.get("set-cookie").split(";")[0];
  const csrfToken = bootstrapBody.data.csrfToken;
  const workspaceId = bootstrapBody.data.workspaceId;
  return { cookie, csrfToken, workspaceId };
}

test("unauthenticated requests to execution endpoints return 401", async (t) => {
  const base = await serve(t, createTestApp());
  const res = await request(base, "/api/v1/runs/00000000-0000-0000-0000-000000000000", { method: "GET" });
  assert.equal(res.status, 401);
  const body = await res.json();
  assert.equal(body.code, "UNAUTHENTICATED");
});

test("execution mutations without CSRF token return 403", async (t) => {
  const base = await serve(t, createTestApp());
  const { cookie } = await createAuthenticatedSession(base);

  const res = await request(base, "/api/v1/runs/00000000-0000-0000-0000-000000000000/pause", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ reason: "test pause" }),
  });
  assert.equal(res.status, 403);
  const body = await res.json();
  assert.equal(body.code, "POLICY_DENIED");
});

test("POST /api/v1/goals/:goalId/runs validates input and requires contract in Stage 13", async (t) => {
  const base = await serve(t, createTestApp());
  const { cookie, csrfToken } = await createAuthenticatedSession(base);

  const res = await request(base, "/api/v1/goals/00000000-0000-0000-0000-000000000000/runs", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify({ budgetCeilingMicroUsd: 1000000 }),
  });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.code, "INVALID_INPUT");
});

test("ExecutionService run lifecycle: create, get, pause, stale resume rejection, valid resume, and cancel", async (t) => {
  const base = await serve(t, createTestApp());
  const { cookie, csrfToken, workspaceId } = await createAuthenticatedSession(base);

  // 1. Create a project
  const project = await ProjectService.createProject({
    workspaceId,
    name: "Execution Run Project",
    description: "Testing durable runs",
  });
  const projId = /** @type {any} */ (project).id;

  // 2. Create a durable run
  const run = await ExecutionService.createRun({
    projectId: projId,
    autonomyMode: "supervised",
    budgetCeilingMicroUsd: 5000000,
  });
  assert.ok(run.id);
  assert.equal(run.state, "pending");
  assert.equal(run.epoch, "1");
  assert.equal(run.version, 1);
  assert.ok(run.currentSequence);

  // 3. GET /api/v1/projects/:projectId/runs
  const listRes = await request(base, `/api/v1/projects/${projId}/runs`, {
    method: "GET",
    headers: { Cookie: cookie },
  });
  assert.equal(listRes.status, 200);
  const listBody = await listRes.json();
  assert.ok(Array.isArray(listBody.data.runs));
  assert.ok(listBody.data.runs.length >= 1);

  // 4. GET /api/v1/runs/:runId
  const getRes = await request(base, `/api/v1/runs/${run.id}`, {
    method: "GET",
    headers: { Cookie: cookie },
  });
  assert.equal(getRes.status, 200);
  const getBody = await getRes.json();
  assert.equal(getBody.data.run.id, run.id);
  assert.equal(getBody.meta.currentSequence, run.currentSequence);

  // 5. POST /api/v1/runs/:runId/pause
  const pauseRes = await request(base, `/api/v1/runs/${run.id}/pause`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify({ reason: "Testing pause" }),
  });
  assert.equal(pauseRes.status, 202);
  const pauseBody = await pauseRes.json();
  assert.equal(pauseBody.data.run.state, "paused");
  assert.equal(pauseBody.data.run.epoch, "2");

  // 6. Resume with stale epoch (epoch is now 2, passing 1 must fail with 409)
  const staleResumeRes = await request(base, `/api/v1/runs/${run.id}/resume`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify({ expectedEpoch: "1" }),
  });
  assert.equal(staleResumeRes.status, 409);
  const staleBody = await staleResumeRes.json();
  assert.equal(staleBody.code, "STATE_CONFLICT");

  // 7. Resume with correct epoch (expectedEpoch: "2") -> succeeds and increments epoch to 3
  const resumeRes = await request(base, `/api/v1/runs/${run.id}/resume`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify({ expectedEpoch: "2" }),
  });
  assert.equal(resumeRes.status, 202);
  const resumeBody = await resumeRes.json();
  assert.equal(resumeBody.data.run.state, "running");
  assert.equal(resumeBody.data.run.epoch, "3");

  // 8. Cancel run -> transitions to cancelled, increments epoch to 4
  const cancelRes = await request(base, `/api/v1/runs/${run.id}/cancel`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify({ reason: "User requested abort" }),
  });
  assert.equal(cancelRes.status, 202);
  const cancelBody = await cancelRes.json();
  assert.equal(cancelBody.data.run.state, "cancelled");
  assert.equal(cancelBody.data.run.epoch, "4");

  // 9. Repeat cancel is idempotent
  const repeatCancelRes = await request(base, `/api/v1/runs/${run.id}/cancel`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify({ reason: "Repeat abort" }),
  });
  assert.equal(repeatCancelRes.status, 202);

  // 10. Pause on cancelled run fails with 409 TERMINAL_RUN
  const pauseTerminalRes = await request(base, `/api/v1/runs/${run.id}/pause`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify({ reason: "Pause terminal" }),
  });
  assert.equal(pauseTerminalRes.status, 409);
});

test("DAG task dependency and fair claim resolution", async () => {
  const project = await ProjectService.createProject({
    name: "DAG Tasks Project",
    description: "Testing DAG dependencies",
  });
  const projId = /** @type {any} */ (project).id;

  const run = await ExecutionService.createRun({ projectId: projId });

  // Create Step A (no dependencies)
  const taskA = await ExecutionService.createTask({
    runId: run.id,
    stepKey: "build_scaffold",
    dependencies: [],
  });

  // Create Step B (depends on Step A)
  const taskB = await ExecutionService.createTask({
    runId: run.id,
    stepKey: "run_compiler",
    dependencies: ["build_scaffold"],
  });

  assert.equal(taskA.stepKey, "build_scaffold");
  assert.equal(taskB.stepKey, "run_compiler");

  // Worker 1 claims task: must be Step A since Step B dependencies are unsatisfied
  const claim1 = await ExecutionService.claimTask(run.id, { holder: "worker-alpha" });
  assert.ok(claim1);
  assert.equal(claim1.stepKey, "build_scaffold");
  assert.equal(claim1.state, "running");

  // Worker 2 attempts to claim: nothing eligible because Step A is running and Step B is waiting on Step A
  const claim2 = await ExecutionService.claimTask(run.id, { holder: "worker-beta" });
  assert.equal(claim2, null);

  // Finish Task A
  const finishedA = await ExecutionService.finishTask(taskA.id, {
    state: "completed",
    result: { output: "Scaffold created" },
  });
  assert.equal(finishedA.state, "completed");

  // Now Worker 2 attempts to claim: Step B is now eligible!
  const claim3 = await ExecutionService.claimTask(run.id, { holder: "worker-beta" });
  assert.ok(claim3);
  assert.equal(claim3.stepKey, "run_compiler");
  assert.equal(claim3.state, "running");

  // Finish Task B
  const finishedB = await ExecutionService.finishTask(taskB.id, {
    state: "completed",
    result: { output: "Compilation clean" },
  });
  assert.equal(finishedB.state, "completed");

  // Verify run progress
  const updatedRun = await ExecutionService.getRunById(run.id);
  assert.equal(updatedRun.progress.completedTasks, 2);
  assert.equal(updatedRun.progress.totalTasks, 2);
});

test("Effects creation and safe blocked reconciliation", async (t) => {
  const base = await serve(t, createTestApp());
  const { cookie, csrfToken, workspaceId } = await createAuthenticatedSession(base);

  const project = await ProjectService.createProject({
    workspaceId,
    name: "Effects Test Project",
    description: "Testing effects",
  });
  const projId = /** @type {any} */ (project).id;

  const run = await ExecutionService.createRun({ projectId: projId });
  const task = await ExecutionService.createTask({ runId: run.id, stepKey: "effect_step" });

  // Create an effect
  const effect = await ExecutionService.createEffect({
    runId: run.id,
    taskId: task.id,
    toolId: "git_commit",
    inputDigest: "a1b2c3d4e5f60000000000000000000000000000000000000000000000000000",
    targetSummary: "Commit local modifications",
    risk: "medium",
  });
  assert.ok(effect.id);
  assert.equal(effect.state, "pending");

  // GET /api/v1/runs/:runId/effects
  const effListRes = await request(base, `/api/v1/runs/${run.id}/effects`, {
    method: "GET",
    headers: { Cookie: cookie },
  });
  assert.equal(effListRes.status, 200);
  const effListBody = await effListRes.json();
  assert.ok(Array.isArray(effListBody.data.effects));
  assert.equal(effListBody.data.effects.length, 1);

  // POST /api/v1/effects/:effectId/reconcile -> returns 202 with blocked operation (OUTCOME_UNKNOWN)
  const recRes = await request(base, `/api/v1/effects/${effect.id}/reconcile`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify({ reason: "Ambiguous timeout recovery" }),
  });
  assert.equal(recRes.status, 202);
  const recBody = await recRes.json();
  assert.equal(recBody.data.operation.state, "blocked");
  assert.equal(recBody.data.operation.effectId, effect.id);
});

test("Checkpoints creation and listing", async (t) => {
  const base = await serve(t, createTestApp());
  const { cookie, workspaceId } = await createAuthenticatedSession(base);

  const project = await ProjectService.createProject({
    workspaceId,
    name: "Checkpoints Test Project",
    description: "Testing checkpoints",
  });
  const projId = /** @type {any} */ (project).id;

  const run = await ExecutionService.createRun({ projectId: projId });

  // Save checkpoints
  const cp1 = await ExecutionService.saveCheckpoint(run.id, { stateData: { step: 1 } });
  const cp2 = await ExecutionService.saveCheckpoint(run.id, { stateData: { step: 2 } });
  assert.ok(cp1.id);
  assert.ok(cp2.id);
  assert.equal(cp1.sequence, "1");
  assert.equal(cp2.sequence, "2");

  // GET /api/v1/runs/:runId/checkpoints
  const res = await request(base, `/api/v1/runs/${run.id}/checkpoints`, {
    method: "GET",
    headers: { Cookie: cookie },
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(Array.isArray(body.data.checkpoints));
  assert.equal(body.data.checkpoints.length, 2);
});

test("control.session_valid(uuid) security-definer function validates active sessions", async () => {
  // 1. Valid active session returns true
  const sessionRes = await query("SELECT id FROM auth_sessions WHERE revoked_at IS NULL AND expires_at > NOW() LIMIT 1");
  if (sessionRes.rows[0]) {
    const validRes = await query("SELECT control.session_valid($1) AS valid", [sessionRes.rows[0].id]);
    assert.equal(validRes.rows[0].valid, true);
  }

  // 2. Non-existent session returns false
  const invalidRes = await query("SELECT control.session_valid('00000000-0000-0000-0000-000000000000'::uuid) AS valid");
  assert.equal(invalidRes.rows[0].valid, false);
});

test("Stage 07 Admission rejects unqualified methods on execution routes with 503", async (t) => {
  const base = await serve(t, createTestApp());
  const { cookie } = await createAuthenticatedSession(base);

  // DELETE on /api/v1/runs/:runId is not admitted
  const res = await request(base, "/api/v1/runs/00000000-0000-0000-0000-000000000000", {
    method: "DELETE",
    headers: { Cookie: cookie },
  });
  assert.equal(res.status, 503);
  const body = await res.json();
  assert.equal(body.code, "CAPABILITY_UNAVAILABLE");
});
