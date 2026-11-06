import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { loadEnvironment } from "../server.js";
import { readRuntimeConfig } from "../foundation/runtimeConfig.js";
import { createLogger } from "../foundation/logger.js";
import { createDatabaseOwner, activateDatabaseOwner, query } from "../config/db.js";
import { createApp } from "../app.js";
import { createHealthController } from "../controllers/healthController.js";
import apiRoutes from "../routes/index.js";
import { stage17Admission } from "../foundation/admission.js";
import { generateLauncherChallenge } from "../services/launcherChallenge.js";
import { ProjectService } from "../services/projectService.js";
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
    admission: stage17Admission,
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

test("unauthenticated requests to conversation runs return 401", async (t) => {
  const base = await serve(t, createTestApp());
  const res = await request(base, "/api/v1/conversations/00000000-0000-0000-0000-000000000000/runs", {
    method: "GET",
  });
  assert.equal(res.status, 401);
  const body = await res.json();
  assert.equal(body.code, "UNAUTHENTICATED");
});

test("conversation run creation without CSRF token returns 403", async (t) => {
  const base = await serve(t, createTestApp());
  const { cookie } = await createAuthenticatedSession(base);

  const res = await request(base, "/api/v1/conversations/00000000-0000-0000-0000-000000000000/runs", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({ budgetCeilingMicroUsd: 1000000 }),
  });
  assert.equal(res.status, 403);
  const body = await res.json();
  assert.equal(body.code, "POLICY_DENIED");
});

test("QA-BUG-04: standalone conversation run rejected with 400 PROJECT_REQUIRED", async (t) => {
  const base = await serve(t, createTestApp());
  const { cookie, csrfToken, workspaceId } = await createAuthenticatedSession(base);

  // Create standalone session via canonical route
  const convRes = await request(base, "/api/v1/conversations?scope=standalone", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify({ title: "Standalone Chat", modelId: "gemini-3.5-flash-lite" }),
  });
  assert.equal(convRes.status, 201);
  const convBody = await convRes.json();
  const standaloneId = convBody.data.conversation.id;

  const runRes = await request(base, `/api/v1/conversations/${standaloneId}/runs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify({ budgetCeilingMicroUsd: 500000 }),
  });
  assert.equal(runRes.status, 400);
  const runBody = await runRes.json();
  assert.equal(runBody.code, "PROJECT_REQUIRED");
});

test("QA-BUG-04: project-bound conversation starts run and lists runs without 503", async (t) => {
  const base = await serve(t, createTestApp());
  const { cookie, csrfToken, workspaceId } = await createAuthenticatedSession(base);

  // 1. Create project
  const project = await ProjectService.createProject({
    workspaceId,
    name: "Autonomous Agent Project",
    description: "Testing conversation runs",
  });
  const projectId = project.id;

  // 2. Create conversation bound to project
  const conv = await ProjectService.createConversation(
    projectId,
    { title: "Agent Run Session", model: "gemini-3.5-flash-lite" },
    workspaceId
  );
  const conversationId = conv.id;

  // 3. Initiate run via POST /api/v1/conversations/:conversationId/runs
  const runRes = await request(base, `/api/v1/conversations/${conversationId}/runs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify({
      budgetCeilingMicroUsd: 2000000,
      autonomyMode: "supervised",
    }),
  });
  assert.equal(runRes.status, 202);
  const runBody = await runRes.json();
  const run = runBody.data.run;
  assert.ok(run.id);
  assert.equal(run.state, "running");
  assert.equal(run.projectId, projectId);
  assert.equal(run.sessionId, conversationId);

  // 4. List runs for conversation via GET /api/v1/conversations/:conversationId/runs
  const listRes = await request(base, `/api/v1/conversations/${conversationId}/runs`, {
    method: "GET",
    headers: { Cookie: cookie },
  });
  assert.equal(listRes.status, 200);
  const listBody = await listRes.json();
  assert.ok(Array.isArray(listBody.data.runs));
  assert.equal(listBody.data.runs.length, 1);
  assert.equal(listBody.data.runs[0].id, run.id);

  // 5. Global runs list via GET /api/v1/runs
  const globalRunsRes = await request(base, "/api/v1/runs", {
    method: "GET",
    headers: { Cookie: cookie },
  });
  assert.equal(globalRunsRes.status, 200);
  const globalBody = await globalRunsRes.json();
  assert.ok(Array.isArray(globalBody.data.runs));
  assert.ok(globalBody.data.runs.some((r) => r.id === run.id));
});
