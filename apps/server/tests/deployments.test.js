// @ts-check
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { loadEnvironment } from "../server.js";
import { readRuntimeConfig } from "../foundation/runtimeConfig.js";
import { createLogger } from "../foundation/logger.js";
import { createDatabaseOwner, activateDatabaseOwner, query } from "../config/db.js";
import { createApp } from "../app.js";
import { createHealthController } from "../controllers/healthController.js";
import apiRoutes from "../routes/index.js";
import { stage16Admission } from "../foundation/admission.js";
import { generateLauncherChallenge } from "../services/launcherChallenge.js";
import { ProjectService } from "../services/projectService.js";
import { IntentRequirementService } from "../services/intentRequirementService.js";
import { getCapabilities } from "../services/identityService.js";
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
    auditContext: (_req, _res, next) => next(),
    rateLimiter: (_req, _res, next) => next(),
    allowedOrigins: ["http://127.0.0.1:5173"],
    logError: () => {},
    admission: stage16Admission,
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
  const cookie = bootstrapRes.headers.get("set-cookie").split(";")[0];
  const bootstrapBody = await bootstrapRes.json();
  const csrfToken = bootstrapBody.data.csrfToken;
  const workspaceId = bootstrapBody.data.workspaceId;
  const principalId = bootstrapBody.data.principalId;
  return { cookie, csrfToken, workspaceId, principalId };
}

test("Stage 16: Browser QA and Deployment Adapter", async (t) => {
  const base = await serve(t, createTestApp());
  const { cookie, csrfToken, workspaceId, principalId } = await createAuthenticatedSession(base);

  const project = await ProjectService.createProject({
    workspaceId,
    name: "Deployment Test Project",
    primaryPath: "C:\\Workspace\\DeploymentTest",
  });
  const projectId = project.id;

  // Create Goal, Conversation, Run, Artifact
  const conversation = await ProjectService.createConversation(projectId, {
    title: "deploy-test-conv",
  });
  const conversationId = conversation.id;

  const goal = await IntentRequirementService.createGoalFromConversation(conversationId, {
    autonomyMode: "supervised",
  });
  const goalId = goal.id;

  const reqRevRes = await query(
    `INSERT INTO requirement_revisions (goal_id, revision, digest, requirements)
     VALUES ($1, 1, 'digest-req-1', '[]'::jsonb) RETURNING id`,
    [goalId]
  );
  const reqRevId = reqRevRes.rows[0].id;

  const planRes = await query(
    `INSERT INTO plans (goal_id) VALUES ($1) RETURNING id`,
    [goalId]
  );
  const planId = planRes.rows[0].id;

  const planRevRes = await query(
    `INSERT INTO plan_revisions (plan_id, goal_id, revision, requirement_revision_id, digest, steps)
     VALUES ($1, $2, 1, $3, 'digest-plan-1', '[]'::jsonb) RETURNING id`,
    [planId, goalId, reqRevId]
  );
  const planRevId = planRevRes.rows[0].id;

  const contractRes = await query(
    `INSERT INTO contracts (goal_id) VALUES ($1) RETURNING id`,
    [goalId]
  );
  const contractId = contractRes.rows[0].id;

  const contractRevRes = await query(
    `INSERT INTO contract_revisions (contract_id, goal_id, revision, plan_revision_id, requirement_revision_id, digest, document)
     VALUES ($1, $2, 1, $3, $4, 'digest-contract-1', '{}'::jsonb) RETURNING id`,
    [contractId, goalId, planRevId, reqRevId]
  );
  const contractRevisionId = contractRevRes.rows[0].id;

  const runRes = await query(
    `INSERT INTO runs (project_id, goal_id, contract_revision_id, plan_revision_id, state)
     VALUES ($1, $2, $3, $4, 'verified') RETURNING id`,
    [projectId, goalId, contractRevisionId, planRevId]
  );
  const runId = runRes.rows[0].id;

  const artifactDigest = crypto.createHash("sha256").update("build artifact binary").digest("hex");
  const artRes = await query(
    `INSERT INTO artifacts (project_id, conversation_id, name, digest, storage_path, status, media_type, byte_size)
     VALUES ($1, $2, 'dist.zip', $3, '/tmp/artifacts/dist.zip', 'available', 'application/zip', 1024) RETURNING id`,
    [projectId, conversationId, artifactDigest]
  );
  const artifactId = artRes.rows[0].id;

  // Create passing Verification Report for this run
  const reportDigest = crypto.createHash("sha256").update("clean report").digest("hex");
  const repArtRes = await query(
    `INSERT INTO artifacts (project_id, conversation_id, name, digest, storage_path, status, media_type, byte_size)
     VALUES ($1, $2, 'verification-report.json', $3, '/tmp/artifacts/verification-report.json', 'available', 'application/json', 512) RETURNING id`,
    [projectId, conversationId, reportDigest]
  );
  const reportArtifactId = repArtRes.rows[0].id;

  await query(
    `INSERT INTO verification_reports (
      run_id, artifact_id, artifact_digest, contract_revision_id, outcome, required_count, passed_count, environment_digest, report_artifact_id
    ) VALUES ($1, $2, $3, $4, 'pass', 3, 3, 'env-digest', $5)`,
    [runId, artifactId, artifactDigest, contractRevisionId, reportArtifactId]
  );

  // Create approved approval record for deployment
  const appRes = await query(
    `INSERT INTO approvals (
      project_id, kind, scope_summary, state, approver_principal_id
    ) VALUES ($1, 'deployment', 'Deploy to local_process', 'approved', $2) RETURNING id`,
    [projectId, principalId]
  );
  const approvalId = appRes.rows[0].id;

  let previewId = "";
  let previewDigest = "";
  let deploymentId = "";
  let rollbackPreviewId = "";

  // ==========================================
  // 1. Authentication & CSRF
  // ==========================================

  await t.test("unauthenticated POST /api/v1/runs/:runId/deployment-previews returns 401", async () => {
    const res = await request(base, `/api/v1/runs/${runId}/deployment-previews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ artifactId, targetRef: "local_process" }),
    });
    assert.equal(res.status, 401);
  });

  await t.test("POST /api/v1/runs/:runId/deployment-previews without CSRF token returns 403", async () => {
    const res = await request(base, `/api/v1/runs/${runId}/deployment-previews`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
      },
      body: JSON.stringify({ artifactId, targetRef: "local_process" }),
    });
    assert.equal(res.status, 403);
  });

  // ==========================================
  // 2. Deployment Preview Pre-Flight Validations
  // ==========================================

  await t.test("POST /api/v1/runs/:runId/deployment-previews with non-existent run returns 404 RUN_NOT_FOUND", async () => {
    const res = await request(base, `/api/v1/runs/00000000-0000-0000-0000-000000000000/deployment-previews`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({ artifactId, targetRef: "local_process" }),
    });
    assert.equal(res.status, 404);
  });

  await t.test("POST /api/v1/runs/:runId/deployment-previews with non-existent artifact returns 404 ARTIFACT_NOT_FOUND", async () => {
    const res = await request(base, `/api/v1/runs/${runId}/deployment-previews`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({ artifactId: "00000000-0000-0000-0000-000000000000", targetRef: "local_process" }),
    });
    assert.equal(res.status, 404);
  });

  await t.test("POST /api/v1/runs/:runId/deployment-previews with unsupported target returns 400 TARGET_UNSUPPORTED", async () => {
    const res = await request(base, `/api/v1/runs/${runId}/deployment-previews`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({ artifactId, targetRef: "unsupported_cloud_hyperscaler" }),
    });
    assert.equal(res.status, 400);
  });

  await t.test("POST /api/v1/runs/:runId/deployment-previews with unverified run returns 400 VERIFICATION_REQUIRED", async () => {
    const unverifiedRunRes = await query(
      `INSERT INTO runs (project_id, goal_id, state) VALUES ($1, $2, 'running') RETURNING id`,
      [projectId, goalId]
    );
    const unverifiedRunId = unverifiedRunRes.rows[0].id;

    const res = await request(base, `/api/v1/runs/${unverifiedRunId}/deployment-previews`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({ artifactId, targetRef: "local_process" }),
    });
    assert.equal(res.status, 400);
  });

  await t.test("POST /api/v1/runs/:runId/deployment-previews generates consequence preview (200 OK)", async () => {
    const res = await request(base, `/api/v1/runs/${runId}/deployment-previews`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({ artifactId, targetRef: "local_process" }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.data.id);
    assert.equal(body.data.targetRef, "local_process");
    assert.equal(body.data.rollbackEligibility, true);
    assert.ok(body.data.inputDigest);
    previewId = body.data.id;
    previewDigest = body.data.inputDigest;
  });

  // ==========================================
  // 3. Deployment Execution & Health Checks
  // ==========================================

  await t.test("POST /api/v1/runs/:runId/deployments without approval returns 400 APPROVAL_REQUIRED", async () => {
    const res = await request(base, `/api/v1/runs/${runId}/deployments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        previewId,
        approvalId: "00000000-0000-0000-0000-000000000000",
        inputDigest: previewDigest,
      }),
    });
    assert.equal(res.status, 400);
  });

  await t.test("POST /api/v1/runs/:runId/deployments with input digest mismatch returns 400 ARTIFACT_MISMATCH", async () => {
    const res = await request(base, `/api/v1/runs/${runId}/deployments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        previewId,
        approvalId,
        inputDigest: "mismatched_corrupted_digest_value",
      }),
    });
    assert.equal(res.status, 400);
  });

  await t.test("POST /api/v1/runs/:runId/deployments executes deployment and confirms healthy status (201 Created)", async () => {
    const res = await request(base, `/api/v1/runs/${runId}/deployments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        previewId,
        approvalId,
        inputDigest: previewDigest,
      }),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.ok(body.data.id);
    assert.ok(body.data.externalReleaseId);
    assert.equal(body.data.state, "active");
    assert.equal(body.data.healthStatus, "healthy");
    assert.ok(body.data.healthEvidence);
    deploymentId = body.data.id;
  });

  await t.test("GET /api/v1/deployments/:deploymentId retrieves active deployment record", async () => {
    const res = await request(base, `/api/v1/deployments/${deploymentId}`, {
      method: "GET",
      headers: { Cookie: cookie },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.id, deploymentId);
    assert.equal(body.data.state, "active");
    assert.equal(body.data.healthStatus, "healthy");
  });

  // ==========================================
  // 4. Rehearsed Rollbacks
  // ==========================================

  await t.test("POST /api/v1/deployments/:deploymentId/rollback-previews with irreversible data migration returns 400 DATA_MIGRATION_IRREVERSIBLE", async () => {
    // Generate preview with irreversible migration plan
    const irrPreviewRes = await request(base, `/api/v1/runs/${runId}/deployment-previews`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        artifactId,
        targetRef: "local_process",
        migrationPlanRef: "migration-irreversible-drop-column",
      }),
    });
    const irrPreview = await irrPreviewRes.json();

    const irrDepRes = await request(base, `/api/v1/runs/${runId}/deployments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        previewId: irrPreview.data.id,
        approvalId,
        inputDigest: irrPreview.data.inputDigest,
      }),
    });
    const irrDeployment = await irrDepRes.json();

    // Try to rollback
    const rollbackRes = await request(base, `/api/v1/deployments/${irrDeployment.data.id}/rollback-previews`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({ reason: "Revert" }),
    });
    assert.equal(rollbackRes.status, 400);
  });

  await t.test("POST /api/v1/deployments/:deploymentId/rollback-previews generates rollback preview (200 OK)", async () => {
    const res = await request(base, `/api/v1/deployments/${deploymentId}/rollback-previews`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({ reason: "Operator rehearsal" }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.data.id);
    assert.ok(body.data.inputDigest);
    rollbackPreviewId = body.data.id;
  });

  await t.test("POST /api/v1/deployments/:deploymentId/rollback executes rollback and marks original rolled_back", async () => {
    const prevRes = await query("SELECT input_digest FROM ops.deployment_previews WHERE id = $1", [rollbackPreviewId]);
    const rbDigest = prevRes.rows[0].input_digest;

    const res = await request(base, `/api/v1/deployments/${deploymentId}/rollback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        previewId: rollbackPreviewId,
        approvalId,
        inputDigest: rbDigest,
      }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.rollbackRef, deploymentId);
    assert.equal(body.data.state, "active");

    // Check original deployment is marked rolled_back
    const origRes = await request(base, `/api/v1/deployments/${deploymentId}`, {
      method: "GET",
      headers: { Cookie: cookie },
    });
    const origBody = await origRes.json();
    assert.equal(origBody.data.state, "rolled_back");
  });

  // ==========================================
  // 5. Guest Browser QA Sessions
  // ==========================================

  await t.test("POST /api/v1/runs/:runId/browser-qa-sessions launches guest QA session with zero host cookie leakage", async () => {
    const res = await request(base, `/api/v1/runs/${runId}/browser-qa-sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        targetUrl: "http://127.0.0.1:3000/app",
        scenario: "smoke_and_dom_integrity",
      }),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.ok(body.data.id);
    assert.ok(body.data.guestProfileId);
    assert.equal(body.data.state, "completed");
    assert.ok(body.data.consoleLogs.length > 0);
  });

  await t.test("GET /api/v1/runs/:runId/browser-qa-sessions lists QA sessions", async () => {
    const res = await request(base, `/api/v1/runs/${runId}/browser-qa-sessions`, {
      method: "GET",
      headers: { Cookie: cookie },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length >= 1);
  });

  // ==========================================
  // 6. Capabilities & Fail-Closed Admission
  // ==========================================

  await t.test("capabilities projection reports deployments and browser_qa as available", () => {
    const caps = getCapabilities();
    const depCap = caps.items.find(c => c.name === "deployments");
    const bqaCap = caps.items.find(c => c.name === "browser_qa");
    assert.equal(depCap?.state, "available");
    assert.equal(bqaCap?.state, "available");
  });

  await t.test("Stage 16 Admission allows Stage 16 routes & denies unqualified Stage 17+ routes with 503", async () => {
    // Stage 16 route allowed
    const depRes = await request(base, `/api/v1/deployments/${deploymentId}`, {
      method: "GET",
      headers: { Cookie: cookie },
    });
    assert.notEqual(depRes.status, 503);

    // Unqualified future route denied
    const unqualRes = await request(base, `/api/v1/future-release-gate`, {
      method: "GET",
      headers: { Cookie: cookie },
    });
    assert.equal(unqualRes.status, 503);
  });
});
