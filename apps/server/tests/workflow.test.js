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
import { stage13Admission } from "../foundation/admission.js";
import { generateLauncherChallenge } from "../services/launcherChallenge.js";
import { ProjectService } from "../services/projectService.js";
import { IntentRequirementService } from "../services/intentRequirementService.js";
import { WorkflowOrchestratorService } from "../services/workflowOrchestratorService.js";
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
    auditContext: (req, res, next) => next(),
    rateLimiter: (req, res, next) => next(),
    allowedOrigins: ["http://127.0.0.1:5173"],
    logError: () => {},
    admission: stage13Admission,
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

async function setupTestProjectAndGoal(workspaceId) {
  const project = await ProjectService.createProject({
    workspaceId,
    name: "workflow-test-proj",
    primaryPath: "C:\\Workspace\\WorkflowTest",
  });
  const projectId = project.id;

  const conversation = await ProjectService.createConversation(projectId, {
    title: "workflow-test-conv",
  });
  const conversationId = conversation.id;

  const goal = await IntentRequirementService.createGoalFromConversation(conversationId, {
    autonomyMode: "supervised",
  });
  const goalId = goal.id;

  // Insert requirement, plan and contract revision
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
     VALUES ($1, $2, 1, $3, 'digest-plan-1', '[{"key":"build_app","title":"Build App","dependencies":[]}]'::jsonb)
     RETURNING id`,
    [planId, goalId, reqRevId]
  );
  const planRevId = planRevRes.rows[0].id;

  const contractDoc = {
    title: "Build and verify app",
    steps: [
      { key: "build_app", title: "Build App", dependencies: [] },
      { key: "verify_app", title: "Verify App", dependencies: ["build_app"] },
    ],
    acceptance: {
      criteria: [
        {
          key: "crit_bundle_exists",
          name: "Bundle file exists",
          required: true,
          method: "file_exists",
        },
        {
          key: "crit_tests_pass",
          name: "Unit tests pass",
          required: true,
          method: "exit_zero",
        },
      ],
    },
  };
  const contractDigest = crypto.createHash("sha256").update(JSON.stringify(contractDoc)).digest("hex");

  const contractRes = await query(
    `INSERT INTO contracts (goal_id) VALUES ($1) RETURNING id`,
    [goalId]
  );
  const contractId = contractRes.rows[0].id;

  const contractRevRes = await query(
    `INSERT INTO contract_revisions (
      contract_id, goal_id, revision, requirement_revision_id, digest, document, plan_revision_id, schema_version, canonicalizer_version
    ) VALUES ($1, $2, 1, $3, $4, $5, $6, 1, 'c14n-v1') RETURNING id`,
    [contractId, goalId, reqRevId, contractDigest, JSON.stringify(contractDoc), planRevId]
  );
  const contractRevId = contractRevRes.rows[0].id;

  // Create an approved record for this contract revision
  const appRes = await query(
    `INSERT INTO approvals (
      kind, contract_revision_id, input_digest, state, nonce_hash, expires_at
    ) VALUES ('contract', $1, $2, 'approved', 'dummy_nonce_hash', NOW() + interval '1 day')
    RETURNING id`,
    [contractRevId, contractDigest]
  );
  const approvalId = appRes.rows[0].id;

  // Create deliverable artifact
  const artContent = "artifact-binary-payload-stage13";
  const artDigest = crypto.createHash("sha256").update(artContent).digest("hex");
  const artRes = await query(
    `INSERT INTO artifacts (project_id, name, storage_path, byte_size, digest, media_type, status)
     VALUES ($1, 'app-bundle.tar.gz', '/artifacts/app-bundle.tar.gz', 1024, $2, 'application/gzip', 'ready')
     RETURNING id`,
    [projectId, artDigest]
  );
  const artifactId = artRes.rows[0].id;

  return {
    projectId,
    conversationId,
    goalId,
    planId,
    planRevId,
    reqRevId,
    contractId,
    contractRevId,
    contractDigest,
    approvalId,
    artifactId,
    artDigest,
  };
}

test("Stage 13: Autonomous Killer Workflow & Bounded Repair", async (t) => {
  const app = createTestApp();
  const base = await serve(t, app);

  const { cookie, csrfToken, workspaceId } = await createAuthenticatedSession(base);
  const fixture = await setupTestProjectAndGoal(workspaceId);

  await t.test("unauthenticated POST /api/v1/goals/:goalId/runs returns 401", async () => {
    const res = await request(base, `/api/v1/goals/${fixture.goalId}/runs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contractRevisionId: fixture.contractRevId }),
    });
    assert.equal(res.status, 401);
  });

  await t.test("POST /api/v1/goals/:goalId/runs without CSRF token returns 403", async () => {
    const res = await request(base, `/api/v1/goals/${fixture.goalId}/runs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
      },
      body: JSON.stringify({ contractRevisionId: fixture.contractRevId }),
    });
    assert.equal(res.status, 403);
  });

  await t.test("POST /api/v1/goals/:goalId/runs with non-existent goal returns 404 GOAL_NOT_FOUND", async () => {
    const nonExistentGoalId = crypto.randomUUID();
    const res = await request(base, `/api/v1/goals/${nonExistentGoalId}/runs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        contractRevisionId: fixture.contractRevId,
        contractDigest: fixture.contractDigest,
      }),
    });
    assert.equal(res.status, 404);
  });

  await t.test("POST /api/v1/goals/:goalId/runs with non-existent contract returns 404 CONTRACT_NOT_FOUND", async () => {
    const nonExistentContractRevId = crypto.randomUUID();
    const res = await request(base, `/api/v1/goals/${fixture.goalId}/runs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        contractRevisionId: nonExistentContractRevId,
      }),
    });
    assert.equal(res.status, 404);
  });

  await t.test("POST /api/v1/goals/:goalId/runs with mismatched contract digest returns 400 CONTRACT_DIGEST_MISMATCH", async () => {
    const res = await request(base, `/api/v1/goals/${fixture.goalId}/runs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        contractRevisionId: fixture.contractRevId,
        contractDigest: "incorrect-sha256-digest-value",
      }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.detail, /does not match pinned revision digest/);
  });

  await t.test("POST /api/v1/goals/:goalId/runs without approved contract returns 400 APPROVAL_REQUIRED", async () => {
    // Create an unapproved contract revision
    const unapprovedRevRes = await query(
      `INSERT INTO contract_revisions (
        contract_id, goal_id, revision, requirement_revision_id, digest, document, plan_revision_id, schema_version, canonicalizer_version
      ) VALUES ($1, $2, 2, $3, 'unapproved-digest', '{"steps":[]}'::jsonb, $4, 1, 'c14n-v1') RETURNING id`,
      [fixture.contractId, fixture.goalId, fixture.reqRevId, fixture.planRevId]
    );
    const unapprovedRevId = unapprovedRevRes.rows[0].id;

    const res = await request(base, `/api/v1/goals/${fixture.goalId}/runs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        contractRevisionId: unapprovedRevId,
        contractDigest: "unapproved-digest",
      }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.detail, /Execution requires an approved Build Contract/);
  });

  await t.test("POST /api/v1/goals/:goalId/runs with negative budget returns 400 INVALID_BUDGET", async () => {
    const res = await request(base, `/api/v1/goals/${fixture.goalId}/runs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        contractRevisionId: fixture.contractRevId,
        contractDigest: fixture.contractDigest,
        budgetCeilingMicroUsd: -500,
      }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.detail, /Budget ceiling cannot be negative/);
  });

  let activeRunId;
  await t.test("POST /api/v1/goals/:goalId/runs starts execution and projects DAG tasks (202 Accepted)", async () => {
    const res = await request(base, `/api/v1/goals/${fixture.goalId}/runs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        contractRevisionId: fixture.contractRevId,
        contractDigest: fixture.contractDigest,
        budgetCeilingMicroUsd: 1000000,
      }),
    });
    assert.equal(res.status, 202);
    const body = await res.json();
    assert.ok(body.data.run.id);
    assert.equal(body.data.run.state, "running");
    assert.equal(body.data.run.goal_id, fixture.goalId);
    assert.equal(body.data.run.progress_total_tasks, 2);
    activeRunId = body.data.run.id;
  });

  await t.test("GET /api/v1/runs/:runId/failures returns recorded failures and deduplication flags", async () => {
    // Record first failure
    const f1 = await WorkflowOrchestratorService.recordFailure(activeRunId, {
      failureClass: "TEST_FAILURE",
      errorDetail: { test: "unit_test_math", line: 42 },
    });
    assert.equal(f1.isDuplicate, false);
    assert.ok(f1.fingerprint);

    // Record exact same failure -> deduplicated
    const f2 = await WorkflowOrchestratorService.recordFailure(activeRunId, {
      failureClass: "TEST_FAILURE",
      errorDetail: { test: "unit_test_math", line: 42 },
    });
    assert.equal(f2.isDuplicate, true);
    assert.equal(f2.fingerprint, f1.fingerprint);

    const res = await request(base, `/api/v1/runs/${activeRunId}/failures`, {
      method: "GET",
      headers: { Cookie: cookie },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.failures.length, 2);
    assert.equal(body.data.failures[0].class, "TEST_FAILURE");
  });

  let hypothesisId;
  await t.test("POST /api/v1/runs/:runId/repairs applies bounded repair hypothesis", async () => {
    const hyp = await WorkflowOrchestratorService.createRepairHypothesis(activeRunId, {
      strategy: "targeted_patch",
      diagnosis: "Math assertion failed on line 42; applying targeted patch",
      proposedActions: [{ action: "fix_operator" }],
    });
    assert.ok(hyp.id);
    assert.equal(hyp.status, "pending");
    hypothesisId = hyp.id;

    const res = await request(base, `/api/v1/runs/${activeRunId}/repairs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        hypothesisId,
        appliedPatchDigest: "patch-digest-sha256-abc",
      }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.hypothesis.status, "applied");
    assert.equal(body.data.hypothesis.applied_patch_digest, "patch-digest-sha256-abc");
    assert.equal(body.data.run.repair_attempts, 1);
  });

  await t.test("GET /api/v1/runs/:runId/repairs returns list of repair hypotheses", async () => {
    const res = await request(base, `/api/v1/runs/${activeRunId}/repairs`, {
      method: "GET",
      headers: { Cookie: cookie },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.data.repairs.length >= 1);
    assert.equal(body.data.repairs[0].id, hypothesisId);
  });

  await t.test("executeWorkflow with passing verification marks run completed (pass)", async () => {
    const testResults = [
      { name: "Bundle file exists", passed: true, output: "app-bundle.tar.gz verified" },
      { name: "Unit tests pass", passed: true, output: "12 tests passed" },
    ];

    const result = await WorkflowOrchestratorService.executeWorkflow(activeRunId, {
      artifactId: fixture.artifactId,
      testResults,
      verifierIdentity: "system:verifier:stage13",
    });

    assert.equal(result.status, "completed");
    assert.equal(result.outcome, "pass");
    assert.ok(result.reportId);

    // Verify run row state
    const runCheck = await query("SELECT state, verification_report_id, final_report_id FROM runs WHERE id = $1", [activeRunId]);
    assert.equal(runCheck.rows[0].state, "completed");
    assert.equal(runCheck.rows[0].final_report_id, result.reportId);
  });

  await t.test("executeWorkflow with skipped required check blocks run (unknown)", async () => {
    // Create fresh run
    const freshRun = await WorkflowOrchestratorService.startWorkflowRun(fixture.goalId, {
      contractRevisionId: fixture.contractRevId,
      contractDigest: fixture.contractDigest,
    });

    // Provide test results missing the required "Unit tests pass" check
    const skippedTestResults = [
      { name: "Bundle file exists", passed: true, output: "exists" },
    ];

    const result = await WorkflowOrchestratorService.executeWorkflow(freshRun.id, {
      artifactId: fixture.artifactId,
      testResults: skippedTestResults,
      verifierIdentity: "system:verifier:stage13",
    });

    assert.equal(result.status, "blocked");
    assert.equal(result.reason, "MISSING_REQUIRED_CRITERIA");
    assert.equal(result.outcome, "unknown");

    const runCheck = await query("SELECT state FROM runs WHERE id = $1", [freshRun.id]);
    assert.equal(runCheck.rows[0].state, "blocked");
  });

  await t.test("executeWorkflow with failing criterion triggers bounded repair and passes on repaired patch", async () => {
    // Create fresh run
    const repairRun = await WorkflowOrchestratorService.startWorkflowRun(fixture.goalId, {
      contractRevisionId: fixture.contractRevId,
      contractDigest: fixture.contractDigest,
    });

    // Failing initial test results
    const failingTests = [
      { name: "Bundle file exists", passed: true, output: "exists" },
      { name: "Unit tests pass", passed: false, output: "AssertionError: expected 4 to equal 5" },
    ];

    // Repair action that fixes the test
    const repairAction = async ({ _runId, _hypothesisId }) => {
      return {
        digest: "repaired-patch-digest-123",
        repairedTestResults: [
          { name: "Bundle file exists", passed: true, output: "exists" },
          { name: "Unit tests pass", passed: true, output: "AssertionError resolved; tests passed" },
        ],
      };
    };

    const result = await WorkflowOrchestratorService.executeWorkflow(repairRun.id, {
      artifactId: fixture.artifactId,
      testResults: failingTests,
      verifierIdentity: "system:verifier:stage13",
      repairAction,
    });

    assert.equal(result.status, "completed");
    assert.equal(result.outcome, "pass");
    assert.equal(result.repairAttempts, 1);

    const runCheck = await query("SELECT state, repair_attempts FROM runs WHERE id = $1", [repairRun.id]);
    assert.equal(runCheck.rows[0].state, "completed");
    assert.equal(runCheck.rows[0].repair_attempts, 1);
  });

  await t.test("executeWorkflow with persistent failure exhausts max repair attempts and fails closed", async () => {
    // Create fresh run
    const exhaustedRun = await WorkflowOrchestratorService.startWorkflowRun(fixture.goalId, {
      contractRevisionId: fixture.contractRevId,
      contractDigest: fixture.contractDigest,
    });

    // Artificially set repair attempts to 3 (max)
    await query("UPDATE runs SET repair_attempts = 3, max_repair_attempts = 3 WHERE id = $1", [exhaustedRun.id]);

    const failingTests = [
      { name: "Bundle file exists", passed: true, output: "exists" },
      { name: "Unit tests pass", passed: false, output: "Unresolvable defect" },
    ];

    const result = await WorkflowOrchestratorService.executeWorkflow(exhaustedRun.id, {
      artifactId: fixture.artifactId,
      testResults: failingTests,
      verifierIdentity: "system:verifier:stage13",
    });

    assert.equal(result.status, "failed");
    assert.equal(result.reason, "REPAIR_ATTEMPTS_EXHAUSTED");
    assert.equal(result.outcome, "fail");

    const runCheck = await query("SELECT state FROM runs WHERE id = $1", [exhaustedRun.id]);
    assert.equal(runCheck.rows[0].state, "failed");
  });

  await t.test("capabilities projection reports execution as available in Stage 13", async () => {
    const caps = getCapabilities();
    const execCap = caps.items.find(i => i.name === "execution");
    assert.ok(execCap);
    assert.equal(execCap.state, "available");
  });

  await t.test("Stage 13 Admission allows Stage 13 endpoints & denies unqualified Stage 14+ endpoints with 503", async () => {
    // Stage 13 route (POST goals/:goalId/runs) admitted
    const validRes = await request(base, `/api/v1/goals/${fixture.goalId}/runs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({ contractRevisionId: fixture.contractRevId }),
    });
    // Admitted (not 503)
    assert.notEqual(validRes.status, 503);

    // Unqualified Stage 14 endpoint (e.g. /api/v1/memory/search or /api/v1/knowledge-index) fails closed with 503
    const memoryRes = await request(base, "/api/v1/memory/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({ query: "find context" }),
    });
    assert.equal(memoryRes.status, 503);
    const body = await memoryRes.json();
    assert.match(body.detail, /Capability is not qualified/);
  });
});
