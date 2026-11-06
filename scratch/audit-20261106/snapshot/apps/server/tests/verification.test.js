import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import { loadEnvironment } from "../server.js";
import { readRuntimeConfig } from "../foundation/runtimeConfig.js";
import { createLogger } from "../foundation/logger.js";
import { createDatabaseOwner, activateDatabaseOwner, query } from "../config/db.js";
import { createApp } from "../app.js";
import { createHealthController } from "../controllers/healthController.js";
import apiRoutes from "../routes/index.js";
import { stage12Admission } from "../foundation/admission.js";
import { generateLauncherChallenge } from "../services/launcherChallenge.js";
import { ProjectService } from "../services/projectService.js";
import { IntentRequirementService } from "../services/intentRequirementService.js";
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
    admission: stage12Admission,
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
  return { cookie, csrfToken, workspaceId };
}

test("Stage 12: Independent Verification Engine", async (t) => {
  const base = await serve(t, createTestApp());
  const { cookie, csrfToken, workspaceId } = await createAuthenticatedSession(base);

  // Setup test fixtures
  const project = await ProjectService.createProject({
    workspaceId,
    name: "verif-test-proj",
    primaryPath: "C:\\Workspace\\VerifTest",
  });
  const projectId = project.id;

  const conversation = await ProjectService.createConversation(projectId, {
    title: "verif-test-conv",
  });
  const conversationId = conversation.id;

  const goal = await IntentRequirementService.createGoalFromConversation(conversationId, {
    autonomyMode: "supervised",
  });
  const goalId = goal.id;

  // Requirement, Plan and Contract revisions
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
  const planRevisionId = planRevRes.rows[0].id;

  const contractDoc = {
    deliverable: "Qualified application package",
    criteria: [
      { id: "CRIT-BUILD", name: "Clean Build Execution", required: true },
      { id: "CRIT-TYPECHECK", name: "Zero Static Type Diagnostics", required: true },
      { id: "CRIT-TESTS", name: "Independent Test Suite Green", required: true },
      { id: "CRIT-CONTAINMENT", name: "Workspace Path Containment", required: true },
    ],
  };

  const contractRes = await query(
    `INSERT INTO contracts (goal_id) VALUES ($1) RETURNING id`,
    [goalId]
  );
  const contractId = contractRes.rows[0].id;

  const contractRevRes = await query(
    `INSERT INTO contract_revisions (contract_id, goal_id, revision, plan_revision_id, requirement_revision_id, digest, document)
     VALUES ($1, $2, 1, $3, $4, 'digest-contract-1', $5) RETURNING id`,
    [contractId, goalId, planRevisionId, reqRevId, JSON.stringify(contractDoc)]
  );
  const contractRevisionId = contractRevRes.rows[0].id;

  // Run
  const runRes = await query(
    `INSERT INTO runs (project_id, goal_id, contract_revision_id, plan_revision_id, state)
     VALUES ($1, $2, $3, $4, 'executing') RETURNING id`,
    [projectId, goalId, contractRevisionId, planRevisionId]
  );
  const runId = runRes.rows[0].id;

  // Artifact
  const artifactDigest = crypto.createHash("sha256").update("clean-codebase-content").digest("hex");
  const artRes = await query(
    `INSERT INTO artifacts (project_id, conversation_id, name, digest, storage_path, status, media_type, byte_size)
     VALUES ($1, $2, 'source_bundle.zip', $3, '/tmp/artifacts/source_bundle.zip', 'available', 'application/zip', 1024) RETURNING id`,
    [projectId, conversationId, artifactDigest]
  );
  const artifactId = artRes.rows[0].id;

  // ==========================================
  // 1. Authentication & CSRF
  // ==========================================

  await t.test("unauthenticated requests to /api/v1/runs/:id/verifications return 401", async () => {
    const res = await request(base, `/api/v1/runs/${runId}/verifications`, { method: "GET" });
    assert.equal(res.status, 401);
  });

  await t.test("POST verification without CSRF token returns 403", async () => {
    const res = await request(base, `/api/v1/runs/${runId}/verifications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
      },
      body: JSON.stringify({ artifactId }),
    });
    assert.equal(res.status, 403);
  });

  // ==========================================
  // 2. Resource Existence Validations
  // ==========================================

  await t.test("POST verification with non-existent runId returns 404 RUN_NOT_FOUND", async () => {
    const fakeRunId = "00000000-0000-0000-0000-000000000000";
    const res = await request(base, `/api/v1/runs/${fakeRunId}/verifications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({ artifactId }),
    });
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.code, "NOT_FOUND");
    assert.match(body.detail, /Run .* not found/);
  });

  await t.test("POST verification with non-existent artifactId returns 404 ARTIFACT_NOT_FOUND", async () => {
    const fakeArtId = "00000000-0000-0000-0000-000000000000";
    const res = await request(base, `/api/v1/runs/${runId}/verifications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({ artifactId: fakeArtId }),
    });
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.code, "NOT_FOUND");
    assert.match(body.detail, /Artifact .* not found/);
  });

  // ==========================================
  // 3. Verifier Identity & Producer Separation
  // ==========================================

  await t.test("producer identity cannot approve its own result or act as verifier (403)", async () => {
    const res = await request(base, `/api/v1/runs/${runId}/verifications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        artifactId,
        verifierIdentity: "producer",
      }),
    });
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.code, "POLICY_DENIED");
    assert.match(body.detail, /Producer cannot edit verifier policy/);
  });

  // ==========================================
  // 4. Adversarial Defect Rejection & Criterion Outcomes
  // ==========================================

  await t.test("bad artifact with swapped digest fails verification (outcome: fail)", async () => {
    const res = await request(base, `/api/v1/runs/${runId}/verifications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        artifactId,
        expectedDigest: "corrupted-or-swapped-sha256-digest",
      }),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.data.outcome, "fail");
    assert.ok(body.data.failedCount > 0);
  });

  await t.test("skipped required check causes outcome: unknown and blocks verified state", async () => {
    const res = await request(base, `/api/v1/runs/${runId}/verifications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        artifactId,
        seededDefect: "skipped_required_check",
      }),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    // Required unknown blocks verified state
    assert.equal(body.data.outcome, "unknown");
    assert.equal(body.data.unknownCount, 1);
    assert.equal(body.data.failedCount, 0);
    const skippedCrit = body.data.criteria.find((c) => c.criterionId === "CRIT-TYPECHECK");
    assert.ok(skippedCrit);
    assert.equal(skippedCrit.outcome, "unknown");
  });

  await t.test("weakened test assertion fails verification (outcome: fail)", async () => {
    const res = await request(base, `/api/v1/runs/${runId}/verifications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        artifactId,
        seededDefect: "weakened_test",
      }),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.data.outcome, "fail");
    const testCrit = body.data.criteria.find((c) => c.criterionId === "CRIT-TESTS");
    assert.ok(testCrit);
    assert.equal(testCrit.outcome, "fail");
  });

  // ==========================================
  // 5. Clean Verification Pass & Report Persistence
  // ==========================================

  let verifiedReportId;
  await t.test("clean artifact with all required criteria passing produces report outcome: pass", async () => {
    const res = await request(base, `/api/v1/runs/${runId}/verifications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        artifactId,
        expectedDigest: artifactDigest,
        verifierIdentity: "independent-verifier-clean",
      }),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.data.outcome, "pass");
    assert.equal(body.data.requiredCount, 4);
    assert.equal(body.data.passedCount, 4);
    assert.equal(body.data.failedCount, 0);
    assert.equal(body.data.unknownCount, 0);
    assert.equal(body.data.artifactDigest, artifactDigest);
    assert.ok(body.data.environmentDigest);
    assert.equal(body.data.criteria.length, 4);
    verifiedReportId = body.data.id;

    // Verify run pointer was updated
    const updatedRunRes = await query("SELECT verification_report_id FROM runs WHERE id = $1", [runId]);
    assert.equal(updatedRunRes.rows[0].verification_report_id, verifiedReportId);

    // Verify durable event was recorded
    const eventRes = await query(
      "SELECT event_type, payload FROM run_events WHERE run_id = $1 AND event_type = 'verification.completed'",
      [runId]
    );
    assert.ok(eventRes.rows.length >= 1);
  });

  // ==========================================
  // 6. Report Retrieval Endpoints
  // ==========================================

  await t.test("GET /api/v1/runs/:runId/verifications lists verification reports", async () => {
    const res = await request(base, `/api/v1/runs/${runId}/verifications`, {
      method: "GET",
      headers: { Cookie: cookie },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length >= 4);
  });

  await t.test("GET /api/v1/verifications/:reportId returns exact report", async () => {
    const res = await request(base, `/api/v1/verifications/${verifiedReportId}`, {
      method: "GET",
      headers: { Cookie: cookie },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.id, verifiedReportId);
    assert.equal(body.data.outcome, "pass");
    assert.equal(body.data.passedCount, 4);
  });

  // ==========================================
  // 7. Verification Evaluation Rubric
  // ==========================================

  await t.test("POST /api/v1/verifications/evaluations records rubric metrics", async () => {
    const res = await request(base, "/api/v1/verifications/evaluations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        suiteRevision: "v1",
        candidateRevision: "build-artifact-v1.0",
        baselineRevision: "build-artifact-v0.9",
        metrics: {
          testCoveragePct: 98.5,
          cyclomaticComplexityAvg: 2.1,
          flakinessScore: 0.0,
        },
      }),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.data.suite_revision, "v1");
    assert.equal(body.data.metrics.testCoveragePct, 98.5);
  });

  // ==========================================
  // 8. Stage 12 Admission Fail-Closed Gate
  // ==========================================

  await t.test("Stage 12 Admission rejects unqualified endpoints with 503", async () => {
    const res = await request(base, "/api/v1/unqualified-stage13-route", {
      method: "GET",
      headers: { Cookie: cookie },
    });
    assert.equal(res.status, 503);
    const body = await res.json();
    assert.equal(body.code, "CAPABILITY_UNAVAILABLE");
  });
});
