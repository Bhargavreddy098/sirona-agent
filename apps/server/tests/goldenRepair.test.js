import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import os from "os";
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
import { PlanningContractService } from "../services/planningContractService.js";
import { AgentWorkerService } from "../services/agentWorkerService.js";

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

test("Repair Test: Bounded Self-Repair Loop & Failure Deduplication", { timeout: 240000 }, async (t) => {
  const base = await serve(t, createTestApp());
  const { cookie, csrfToken, workspaceId: _workspaceId } = await createAuthenticatedSession(base);

  // Setup sample local project repository on disk
  const sampleProjectDir = fs.mkdtempSync(path.join(os.tmpdir(), "sirona-repair-calc-"));
  fs.mkdirSync(path.join(sampleProjectDir, "src"), { recursive: true });
  fs.mkdirSync(path.join(sampleProjectDir, "tests"), { recursive: true });

  fs.writeFileSync(
    path.join(sampleProjectDir, "package.json"),
    JSON.stringify(
      {
        name: "repair-calculator",
        version: "1.0.0",
        scripts: { test: "node --test tests/*.test.js" },
      },
      null,
      2
    )
  );

  // Seeded defect: calculator has a bug in subtract (returns a + b instead of a - b)
  fs.writeFileSync(
    path.join(sampleProjectDir, "src", "calculator.js"),
    "function add(a, b) {\n  return a + b;\n}\nfunction subtract(a, b) {\n  return a + b;\n}\nmodule.exports = {\n  add,\n  subtract,\n};\n"
  );

  // Test expects subtract(5, 3) to be 2
  fs.writeFileSync(
    path.join(sampleProjectDir, "tests", "calculator.test.js"),
    "const { test } = require('node:test');\nconst assert = require('node:assert/strict');\nconst { subtract } = require('../src/calculator.js');\n\ntest('subtract works', () => {\n  assert.equal(subtract(5, 3), 2);\n});\n"
  );

  t.after(() => {
    try {
      fs.rmSync(sampleProjectDir, { recursive: true, force: true });
    } catch {}
  });

  // 1. Create Project
  const projRes = await request(base, "/api/v1/projects", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify({
      name: "Repair Project",
      primaryPath: sampleProjectDir,
    }),
  });
  assert.equal(projRes.status, 201);
  const projBody = await projRes.json();
  const projectId = projBody.data.project.id;

  // Grant project capabilities
  await query(
    `INSERT INTO capability_grants (project_id, capability, resource_scope, expires_at)
     VALUES ($1, 'fs_write', '{}', NOW() + INTERVAL '2 hours'),
            ($1, 'workspace_mutation', '{}', NOW() + INTERVAL '2 hours'),
            ($1, 'shell_exec', '{}', NOW() + INTERVAL '2 hours'),
            ($1, 'bounded_process', '{}', NOW() + INTERVAL '2 hours')`,
    [projectId]
  );

  // Scan project
  await request(base, `/api/v1/projects/${projectId}/scan`, {
    method: "POST",
    headers: { Cookie: cookie, "x-csrf-token": csrfToken },
  });

  // Create Conversation & Goal
  const convRes = await request(base, `/api/v1/projects/${projectId}/conversations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify({ title: "Fix subtraction bug" }),
  });
  const convBody = await convRes.json();
  const conversationId = convBody.data.conversation.id;

  const goal = await IntentRequirementService.createGoalFromConversation(conversationId, {
    autonomyMode: "supervised",
  });
  const goalId = goal.id;

  // Setup Plan & Contract
  const reqRevRes = await query(
    "INSERT INTO requirement_revisions (goal_id, revision, digest, requirements) VALUES ($1, 1, 'digest-req-repair', '[]'::jsonb) RETURNING id",
    [goalId]
  );
  const reqRevId = reqRevRes.rows[0].id;

  const planRes = await query("INSERT INTO plans (goal_id) VALUES ($1) RETURNING id", [goalId]);
  const planId = planRes.rows[0].id;

  const planRevRes = await query(
    `INSERT INTO plan_revisions (plan_id, goal_id, revision, requirement_revision_id, digest, steps)
     VALUES ($1, $2, 1, $3, 'digest-plan-repair', '[{"key":"verify_and_repair","title":"Verify and repair subtract logic","dependencies":[]}]'::jsonb)
     RETURNING id`,
    [planId, goalId, reqRevId]
  );
  const planRevId = planRevRes.rows[0].id;

  await query("UPDATE plans SET active_plan_revision_id = $1 WHERE id = $2", [planRevId, planId]);
  await query("UPDATE goals SET active_plan_revision_id = $1 WHERE id = $2", [planRevId, goalId]);

  const contractDoc = {
    goal: "Fix subtraction logic",
    requirements: [{ id: "req_sub", text: "Ensure subtract works" }],
    steps: [{ key: "verify_and_repair", title: "Verify and repair subtract logic", dependencies: [] }],
    acceptance: {
      criteria: [
        { key: "CRIT-TESTS", name: "Independent Test Suite Green", required: true },
        { key: "CRIT-BUILD", name: "Clean Build Execution", required: true },
      ],
    },
    verification: { suite: "node_test" },
  };
  const contractRev = await PlanningContractService.createContract(goalId, {
    planRevisionId: planRevId,
    document: contractDoc,
  });
  const contractRevId = contractRev.id;
  const contractDigest = contractRev.digest;

  // Grant Approval
  await query(
    `INSERT INTO approvals (
      kind, contract_revision_id, input_digest, state, nonce_hash, expires_at
    ) VALUES ('contract', $1, $2, 'approved', 'repair_nonce_hash', NOW() + INTERVAL '1 day')`,
    [contractRevId, contractDigest]
  );

  // Start Run
  const runRes = await request(base, `/api/v1/goals/${goalId}/runs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify({
      contractRevisionId: contractRevId,
      contractDigest,
    }),
  });
  assert.equal(runRes.status, 202);
  const runBody = await runRes.json();
  const runId = runBody.data.run.id;

  // 2. Execute Run with seeded defect triggering Bounded Self-Repair
  await t.test("Self-Repair Loop: detects test failure, records fingerprint, applies patch, and verifies clean pass", { timeout: 120000 }, async () => {
    const repairModelExecutor = async ({ prompt }) => {
      if (prompt.includes("Verification Test Failure Repair")) {
        return {
          content: "Fixing subtraction defect in src/calculator.js.",
          tool_calls: [
            {
              id: "call_fix",
              name: "write_file",
              args: {
                path: "src/calculator.js",
                content: "function add(a, b) {\n  return a + b;\n}\nfunction subtract(a, b) {\n  return a - b;\n}\nmodule.exports = {\n  add,\n  subtract,\n};\n",
              },
            },
            {
              id: "call_done",
              name: "propose_task_completion",
              args: { summary: "Repaired subtract function to return a - b" },
            },
          ],
        };
      }
      return {
        content: "Initial task step complete.",
        tool_calls: [{ id: "call_done", name: "propose_task_completion", args: { summary: "Initial task step executed" } }],
      };
    };

    let outcome;
    try {
      outcome = await AgentWorkerService.runWorkflowToCompletion(runId);
    } catch (err) {
      const errMsg = err?.message || "";
      if (errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("quota")) {
        console.log("[Golden Repair] Live provider quota exhausted for today; verifying repair via repairModelExecutor.");
        await query("UPDATE tasks SET state = 'pending' WHERE run_id = $1", [runId]);
        outcome = await AgentWorkerService.runWorkflowToCompletion(runId, { modelExecutor: repairModelExecutor });
      } else {
        throw err;
      }
    }
    assert.equal(outcome.status, "completed");
    assert.equal(outcome.repairAttempts, 1, "Must perform exactly 1 repair attempt to fix seeded defect");
    assert.equal(outcome.verification.outcome, "pass");

    // Verify failure record exists in control.failures
    const failuresRes = await query("SELECT * FROM control.failures WHERE run_id = $1", [runId]);
    assert.ok(failuresRes.rows.length >= 1);
    assert.equal(failuresRes.rows[0].class, "TEST_SUITE_FAILURE");
    assert.ok(failuresRes.rows[0].fingerprint);

    // Verify repair hypothesis exists in control.repair_hypotheses
    const repairsRes = await query("SELECT * FROM control.repair_hypotheses WHERE run_id = $1", [runId]);
    assert.ok(repairsRes.rows.length >= 1);
    assert.equal(repairsRes.rows[0].strategy, "code_patch");

    // Verify on-disk file was repaired
    const repairedCode = fs.readFileSync(path.join(sampleProjectDir, "src", "calculator.js"), "utf8");
    assert.ok(repairedCode.includes("return a - b"), "calculator.js must be repaired to return a - b");
  });

  // 3. Persistent Failure Capping (fail-closed after max repair attempts)
  await t.test("Bounded Limit: persistent failure fails closed after max repair attempts", { timeout: 60000 }, async () => {
    // Seed an unfixable syntax error in code
    fs.writeFileSync(path.join(sampleProjectDir, "src", "calculator.js"), "INVALID SYNTAX %%%;;;");

    // Create a new run to test bounding
    const failRunRes = await request(base, `/api/v1/goals/${goalId}/runs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        contractRevisionId: contractRevId,
        contractDigest,
      }),
    });
    const failRunId = (await failRunRes.json()).data.run.id;

    // Set max_repair_attempts to 2 for quick verification
    await query("UPDATE runs SET max_repair_attempts = 2 WHERE id = $1", [failRunId]);

    const persistentFailExecutor = async () => {
      return {
        content: "Attempting repair but unable to resolve invalid syntax.",
        tool_calls: [{ id: "call_done", name: "propose_task_completion", args: { summary: "Attempted repair" } }],
      };
    };

    let outcome;
    try {
      outcome = await AgentWorkerService.runWorkflowToCompletion(failRunId);
    } catch (err) {
      const errMsg = err?.message || "";
      if (errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("quota")) {
        await query("UPDATE tasks SET state = 'pending' WHERE run_id = $1", [failRunId]);
        outcome = await AgentWorkerService.runWorkflowToCompletion(failRunId, { modelExecutor: persistentFailExecutor });
      } else {
        throw err;
      }
    }
    assert.equal(outcome.status, "failed");
    assert.equal(outcome.repairAttempts, 2);

    // Verify run marked failed in database (fail closed)
    const runCheck = await query("SELECT state FROM runs WHERE id = $1", [failRunId]);
    assert.equal(runCheck.rows[0].state, "failed");
  });
});
