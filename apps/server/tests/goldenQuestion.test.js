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
import { serve, request } from "./helpers.js";
import { IntentRequirementService } from "../services/intentRequirementService.js";
import { PlanningContractService, PlanningServiceError } from "../services/planningContractService.js";

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
  const cookie = bootstrapRes.headers.get("set-cookie") || "";
  const bootstrapBody = await bootstrapRes.json();
  const csrfToken = bootstrapBody.data.csrfToken;
  const workspaceId = bootstrapBody.data.workspaceId;
  return { cookie, csrfToken, workspaceId };
}

test("Question Test: Material Unknown Detection & Clarification Gating", async (t) => {
  const base = await serve(t, createTestApp());
  const { cookie, csrfToken, workspaceId: _workspaceId } = await createAuthenticatedSession(base);

  // 1. Create project & conversation
  const projRes = await request(base, "/api/v1/projects", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify({
      name: "Question Test Project",
      primaryPath: process.cwd(),
    }),
  });
  assert.equal(projRes.status, 201);
  const projBody = await projRes.json();
  const projectId = projBody.data.project.id;

  const convRes = await request(base, `/api/v1/projects/${projectId}/conversations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify({ title: "Ambiguous request" }),
  });
  assert.equal(convRes.status, 201);
  const convBody = await convRes.json();
  const conversationId = convBody.data.conversation.id;

  // Send an ambiguous user request
  await request(base, `/api/v1/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify({
      role: "user",
      content: "Modify the database tables and change the auth logic.",
    }),
  });

  // Create Goal
  const goal = await IntentRequirementService.createGoalFromConversation(conversationId, {
    autonomyMode: "supervised",
  });
  const goalId = goal.id;

  let clarificationId = "";

  // 2. Material question formulation
  await t.test("Material Unknown Detection: creates structured clarification for ambiguous request", async () => {
    const clarification = await IntentRequirementService.createClarification(goalId, {
      question: "Which authentication logic should be modified, and should migrations be non-destructive?",
      materiality: "material",
      options: [
        { id: "opt_session_safe", label: "Update session token expiration non-destructively" },
        { id: "opt_schema_rebuild", label: "Rebuild auth schema with breaking changes" },
      ],
    });

    assert.ok(clarification.id);
    assert.equal(clarification.status, "pending");
    assert.equal(clarification.materiality, "material");
    assert.equal(clarification.options.length, 2);
    clarificationId = clarification.id;

    // Verify goal status transitioned to clarifying
    const goalCheck = await query("SELECT status FROM goals WHERE id = $1", [goalId]);
    assert.equal(goalCheck.rows[0].status, "clarifying");
  });

  // 3. Proves Build Contract generation is strictly blocked while material questions are unanswered
  await t.test("Contract Gating: rejects Build Contract generation while material questions are pending", async () => {
    // Setup prerequisite plan
    const reqRevRes = await query(
      "INSERT INTO requirement_revisions (goal_id, revision, digest, requirements) VALUES ($1, 1, 'digest-req-q', '[]'::jsonb) RETURNING id",
      [goalId]
    );
    const reqRevId = reqRevRes.rows[0].id;

    const planRes = await query("INSERT INTO plans (goal_id) VALUES ($1) RETURNING id", [goalId]);
    const planId = planRes.rows[0].id;

    const planRevRes = await query(
      `INSERT INTO plan_revisions (plan_id, goal_id, revision, requirement_revision_id, digest, steps)
       VALUES ($1, $2, 1, $3, 'digest-plan-q', '[{"key":"step_1","title":"Step 1","dependencies":[]}]'::jsonb)
       RETURNING id`,
      [planId, goalId, reqRevId]
    );
    const planRevId = planRevRes.rows[0].id;

    await query("UPDATE plans SET active_plan_revision_id = $1 WHERE id = $2", [planRevId, planId]);
    await query("UPDATE goals SET active_plan_revision_id = $1 WHERE id = $2", [planRevId, goalId]);

    // Attempt to generate Build Contract
    await assert.rejects(
      async () => {
        await PlanningContractService.createContract(goalId, {
          planRevisionId: planRevId,
          document: {
            goal: "Modify auth",
            requirements: [],
            steps: [{ key: "step_1", title: "Step 1", dependencies: [] }],
            acceptance: { criteria: [] },
            verification: {},
          },
        });
      },
      (err) => {
        assert.ok(err instanceof PlanningServiceError);
        assert.equal(err.code, "UNRESOLVED_MATERIAL_QUESTION");
        assert.equal(err.status, 409);
        return true;
      }
    );
  });

  // 4. User answers clarification
  await t.test("User Answering: resolves clarification with selected option", async () => {
    const answered = await IntentRequirementService.answerClarification(clarificationId, {
      selectedOptionId: "opt_session_safe",
    });
    assert.equal(answered.status, "answered");
    assert.equal(answered.answer, "Update session token expiration non-destructively");

    // Double answering is rejected with 409
    await assert.rejects(
      async () => {
        await IntentRequirementService.answerClarification(clarificationId, {
          answer: "Duplicate answer",
        });
      },
      (err) => {
        assert.equal(err.code, "ALREADY_RESOLVED");
        assert.equal(err.status, 409);
        return true;
      }
    );
  });

  // 5. Unblocked Contract Generation
  await t.test("Contract Unblocked: Build Contract generation succeeds after clarification resolved", async () => {
    const planRevRes = await query("SELECT active_plan_revision_id FROM plans WHERE goal_id = $1", [goalId]);
    const planRevId = planRevRes.rows[0].active_plan_revision_id;

    const contractRev = await PlanningContractService.createContract(goalId, {
      planRevisionId: planRevId,
      document: {
        goal: "Update session token non-destructively",
        requirements: [{ id: "req_1", text: "Safe session update" }],
        steps: [{ key: "step_1", title: "Step 1", dependencies: [] }],
        acceptance: { criteria: [{ id: "crit_1", name: "Safe auth update", required: true }] },
        verification: {},
      },
    });

    assert.ok(contractRev.id);
    assert.ok(contractRev.digest);
    assert.equal(contractRev.revision, 1);
  });
});
