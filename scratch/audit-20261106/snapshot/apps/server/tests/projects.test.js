import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { loadEnvironment } from "../server.js";
import { readRuntimeConfig } from "../foundation/runtimeConfig.js";
import { createLogger } from "../foundation/logger.js";
import { createDatabaseOwner, activateDatabaseOwner } from "../config/db.js";
import { createApp } from "../app.js";
import { createHealthController } from "../controllers/healthController.js";
import apiRoutes from "../routes/index.js";
import { stage04Admission } from "../foundation/admission.js";
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
    admission: stage04Admission,
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

test("unauthenticated requests to /api/v1/projects return 401", async (t) => {
  const base = await serve(t, createTestApp());
  const res = await request(base, "/api/v1/projects", { method: "GET" });
  assert.equal(res.status, 401);
  const body = await res.json();
  assert.equal(body.code, "UNAUTHENTICATED");
});

test("project mutations without CSRF token return 403", async (t) => {
  const base = await serve(t, createTestApp());
  const { cookie } = await createAuthenticatedSession(base);

  // Attempt POST /api/v1/projects without x-csrf-token
  const res = await request(base, "/api/v1/projects", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({ name: "Test Project Without CSRF" }),
  });
  assert.equal(res.status, 403);
  const body = await res.json();
  assert.equal(body.code, "POLICY_DENIED");
});

test("Stage 04 project lifecycle: create, list, get, optimistic locking PATCH, and archive", async (t) => {
  const base = await serve(t, createTestApp());
  const { cookie, csrfToken, workspaceId } = await createAuthenticatedSession(base);

  // 1. Create Project
  const createRes = await request(base, "/api/v1/projects", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify({ name: "ASI Core Engine", description: "Autonomous Coding Platform", workspaceId }),
  });
  assert.equal(createRes.status, 201);
  const createBody = await createRes.json();
  const project = createBody.data.project;
  assert.ok(project.id);
  assert.equal(project.name, "ASI Core Engine");
  assert.equal(project.version, 1);
  assert.equal(project.archived, 0);

  // 2. List Projects
  const listRes = await request(base, "/api/v1/projects", {
    method: "GET",
    headers: { Cookie: cookie },
  });
  assert.equal(listRes.status, 200);
  const listBody = await listRes.json();
  assert.ok(listBody.data.total >= 1);
  const found = listBody.data.projects.find((p) => p.id === project.id);
  assert.ok(found);

  // 3. Retrieve single project
  const getRes = await request(base, `/api/v1/projects/${project.id}`, {
    method: "GET",
    headers: { Cookie: cookie },
  });
  assert.equal(getRes.status, 200);
  const getBody = await getRes.json();
  assert.equal(getBody.data.project.id, project.id);

  // 4. Optimistic locking with stale If-Match fails with 412
  const stalePatchRes = await request(base, `/api/v1/projects/${project.id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      "x-csrf-token": csrfToken,
      "If-Match": '"999"',
    },
    body: JSON.stringify({ description: "Stale update attempt" }),
  });
  assert.equal(stalePatchRes.status, 412);

  // 5. Valid optimistic locking PATCH succeeds and increments version to 2
  const validPatchRes = await request(base, `/api/v1/projects/${project.id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      "x-csrf-token": csrfToken,
      "If-Match": '"1"',
    },
    body: JSON.stringify({ description: "Updated Platform Description" }),
  });
  assert.equal(validPatchRes.status, 200);
  const validPatchBody = await validPatchRes.json();
  assert.equal(validPatchBody.data.project.version, 2);
  assert.equal(validPatchBody.data.project.description, "Updated Platform Description");

  // 6. Archive project
  const archiveRes = await request(base, `/api/v1/projects/${project.id}/archive`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify({ reason: "test_completed" }),
  });
  assert.equal(archiveRes.status, 200);
  const archiveBody = await archiveRes.json();
  assert.equal(archiveBody.data.project.archived, 1);

  // 7. Attempting to create a conversation in an archived project returns 409
  const convFailRes = await request(base, `/api/v1/projects/${project.id}/conversations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify({ title: "Archived Conv Attempt" }),
  });
  assert.equal(convFailRes.status, 409);
});

test("Stage 04 conversations and monotonic messages", async (t) => {
  const base = await serve(t, createTestApp());
  const { cookie, csrfToken, workspaceId } = await createAuthenticatedSession(base);

  // Create project
  const projectRes = await request(base, "/api/v1/projects", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify({ name: "Conversation Test Project", workspaceId }),
  });
  const projectBody = await projectRes.json();
  const projectId = projectBody.data.project.id;

  // Create conversation
  const convRes = await request(base, `/api/v1/projects/${projectId}/conversations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify({ title: "Feature Architecture Discussion", model: "gemini-2.5-flash" }),
  });
  assert.equal(convRes.status, 201);
  const convBody = await convRes.json();
  const conversationId = convBody.data.conversation.id;
  assert.ok(conversationId);

  // List conversations
  const listConvRes = await request(base, `/api/v1/projects/${projectId}/conversations`, {
    method: "GET",
    headers: { Cookie: cookie },
  });
  assert.equal(listConvRes.status, 200);
  const listConvBody = await listConvRes.json();
  assert.ok(listConvBody.data.total >= 1);

  // Add User Message
  const userMsgRes = await request(base, `/api/v1/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify({ role: "user", content: "Implement Stage 04 projects service." }),
  });
  assert.equal(userMsgRes.status, 201);
  const userMsgBody = await userMsgRes.json();
  assert.equal(userMsgBody.data.message.role, "user");

  // Add Assistant Message
  const assistantMsgRes = await request(base, `/api/v1/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify({ role: "assistant", content: "Stage 04 projects service implemented with monotonic messages." }),
  });
  assert.equal(assistantMsgRes.status, 201);
  const assistantMsgBody = await assistantMsgRes.json();
  assert.equal(assistantMsgBody.data.message.role, "assistant");

  // List messages
  const messagesRes = await request(base, `/api/v1/conversations/${conversationId}/messages`, {
    method: "GET",
    headers: { Cookie: cookie },
  });
  assert.equal(messagesRes.status, 200);
  const messagesBody = await messagesRes.json();
  assert.equal(messagesBody.data.total, 2);
  assert.equal(messagesBody.data.messages[0].role, "user");
  assert.equal(messagesBody.data.messages[1].role, "assistant");

  // Delete conversation
  const deleteConvRes = await request(base, `/api/v1/conversations/${conversationId}`, {
    method: "DELETE",
    headers: {
      Cookie: cookie,
      "x-csrf-token": csrfToken,
    },
  });
  assert.equal(deleteConvRes.status, 200);

  // Verify deleted conversation is no longer returned
  const getDeletedRes = await request(base, `/api/v1/conversations/${conversationId}`, {
    method: "GET",
    headers: { Cookie: cookie },
  });
  assert.equal(getDeletedRes.status, 404);
});

test("Stage 04 snapshots, artifacts, and staged uploads with safe headers", async (t) => {
  const base = await serve(t, createTestApp());
  const { cookie, csrfToken, workspaceId } = await createAuthenticatedSession(base);

  // Create Project
  const projectRes = await request(base, "/api/v1/projects", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify({ name: "Artifact and Snapshot Project", workspaceId }),
  });
  const projectBody = await projectRes.json();
  const projectId = projectBody.data.project.id;

  // 1. Create Repository Snapshot
  const snapshotRes = await request(base, `/api/v1/projects/${projectId}/snapshots`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify({ commitSha: "abc123def456", treeDigest: "sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069" }),
  });
  assert.equal(snapshotRes.status, 201);
  const snapshotBody = await snapshotRes.json();
  assert.equal(snapshotBody.data.snapshot.tree_digest, "sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069");

  // List snapshots
  const listSnapshotsRes = await request(base, `/api/v1/projects/${projectId}/snapshots`, {
    method: "GET",
    headers: { Cookie: cookie },
  });
  assert.equal(listSnapshotsRes.status, 200);
  const listSnapshotsBody = await listSnapshotsRes.json();
  assert.equal(listSnapshotsBody.data.total, 1);

  // 2. Direct Artifact Creation & Retrieval
  const artifactRecord = await ProjectService.createArtifact(projectId, {
    name: "architecture-summary.md",
    mediaType: "text/markdown",
    byteSize: 1024,
    digest: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    storagePath: "# Sirona Architecture Summary\nStage 04 qualified.",
  });

  const getArtifactRes = await request(base, `/api/v1/artifacts/${artifactRecord.id}`, {
    method: "GET",
    headers: { Cookie: cookie },
  });
  assert.equal(getArtifactRes.status, 200);
  const getArtifactBody = await getArtifactRes.json();
  assert.equal(getArtifactBody.data.artifact.name, "architecture-summary.md");

  // Verify safe download headers
  const contentRes = await request(base, `/api/v1/artifacts/${artifactRecord.id}/content`, {
    method: "GET",
    headers: { Cookie: cookie },
  });
  assert.equal(contentRes.status, 200);
  assert.ok(contentRes.headers.get("content-disposition")?.includes("attachment"));
  assert.equal(contentRes.headers.get("x-content-type-options"), "nosniff");
  assert.ok(contentRes.headers.get("content-digest")?.includes(artifactRecord.digest));

  // 3. Create Staged Upload
  const uploadRes = await request(base, `/api/v1/projects/${projectId}/uploads`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify({ filename: "spec.json", mediaType: "application/json", byteSize: 2048, digest: "d41d8cd98f00b204e9800998ecf8427e" }),
  });
  assert.equal(uploadRes.status, 201);
  const uploadBody = await uploadRes.json();
  assert.equal(uploadBody.data.upload.status, "pending");
});

test("capabilities projection reports Stage 04 services available", async (t) => {
  const base = await serve(t, createTestApp());
  const { cookie } = await createAuthenticatedSession(base);

  const res = await request(base, "/api/v1/capabilities", {
    method: "GET",
    headers: { Cookie: cookie },
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  const { items } = body.data;

  const projectsCap = items.find((i) => i.name === "projects");
  const convsCap = items.find((i) => i.name === "conversations");
  const artifactsCap = items.find((i) => i.name === "artifacts");
  const execCap = items.find((i) => i.name === "execution");

  assert.equal(projectsCap.state, "available");
  assert.equal(convsCap.state, "available");
  assert.equal(artifactsCap.state, "available");
  assert.equal(execCap.state, "available"); // Stage 13 qualified
});
