import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
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
import { ContextEngineService } from "../services/contextEngineService.js";
import { IntentRequirementService } from "../services/intentRequirementService.js";
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

test("Golden E2E Test: Full Autonomous Coding & Verification Cycle", { timeout: 240000 }, async (t) => {
  const base = await serve(t, createTestApp());
  const { cookie, csrfToken, workspaceId: _workspaceId } = await createAuthenticatedSession(base);

  // Setup sample local project repository on disk
  const sampleProjectDir = fs.mkdtempSync(path.join(os.tmpdir(), "sirona-sample-calc-"));
  fs.mkdirSync(path.join(sampleProjectDir, "src"), { recursive: true });
  fs.mkdirSync(path.join(sampleProjectDir, "tests"), { recursive: true });

  fs.writeFileSync(
    path.join(sampleProjectDir, "package.json"),
    JSON.stringify(
      {
        name: "sample-calculator",
        version: "1.0.0",
        scripts: { test: "node --test tests/*.test.js" },
      },
      null,
      2
    )
  );

  fs.writeFileSync(
    path.join(sampleProjectDir, "AGENTS.md"),
    "# Instructions for Agent\nAlways write unit tests for functions. Keep documentation clean.\n"
  );

  fs.writeFileSync(
    path.join(sampleProjectDir, "README.md"),
    "# Calculator\nSimple calculator application.\n"
  );

  fs.writeFileSync(
    path.join(sampleProjectDir, "src", "calculator.js"),
    "function add(a, b) {\n  return a + b;\n}\n\nmodule.exports = {\n  add,\n};\n"
  );

  fs.writeFileSync(
    path.join(sampleProjectDir, "tests", "calculator.test.js"),
    "const { test } = require('node:test');\nconst assert = require('node:assert/strict');\nconst { add } = require('../src/calculator.js');\n\ntest('add works', () => {\n  assert.equal(add(2, 3), 5);\n});\n"
  );

  t.after(() => {
    try {
      fs.rmSync(sampleProjectDir, { recursive: true, force: true });
    } catch {}
  });

  let projectId = "";
  let conversationId = "";
  let goalId = "";
  let contractRevId = "";
  let contractDigest = "";
  let runId = "";

  // 1. User selects local project -> Project Registration
  await t.test("1. Project Registration: create project with local directory", async () => {
    const res = await request(base, "/api/v1/projects", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        name: "Sample Calculator",
        primaryPath: sampleProjectDir,
      }),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    projectId = body.data.project.id;
    assert.ok(projectId);
    assert.equal(body.data.project.primary_path, sampleProjectDir);

    // Grant project capabilities for mutation & execution
    await query(
      `INSERT INTO capability_grants (project_id, capability, resource_scope, expires_at)
       VALUES ($1, 'fs_write', '{}', NOW() + INTERVAL '2 hours'),
              ($1, 'workspace_mutation', '{}', NOW() + INTERVAL '2 hours'),
              ($1, 'shell_exec', '{}', NOW() + INTERVAL '2 hours'),
              ($1, 'bounded_process', '{}', NOW() + INTERVAL '2 hours')`,
      [projectId]
    );
  });

  // 2. Repository Scanning & Ingestion
  await t.test("2. Repository Scanning: detect manifests, framework, and test runner", async () => {
    const res = await request(base, `/api/v1/projects/${projectId}/scan`, {
      method: "POST",
      headers: {
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.data.fileCount >= 4);
    assert.equal(body.data.detectedFramework, "node");
    assert.equal(body.data.detectedTestRunner, "node --test");

    // Verify nodes were ingested into knowledge.nodes
    const nodeRes = await query("SELECT count(*) FROM knowledge.nodes WHERE project_id = $1", [projectId]);
    assert.ok(parseInt(nodeRes.rows[0].count, 10) >= 4);
  });

  // 3. Context Engine: Assemble Context Pack
  await t.test("3. Context Engine: compile reproducible Context Pack", async () => {
    const pack = await ContextEngineService.assembleContextPack({
      projectId,
      prompt: "Add subtract function to calculator, add test, update README",
    });
    assert.ok(pack.id);
    assert.ok(pack.digest);
    assert.ok(pack.contextText.includes("Repository Overview"));
    assert.ok(pack.contextText.includes("calculator.js"));
    assert.ok(pack.contextText.includes("Always write unit tests"));
  });

  // 4. Intent Decomposition
  await t.test("4. Intent System: create conversation and goal from user request", async () => {
    const convRes = await request(base, `/api/v1/projects/${projectId}/conversations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({ title: "Add subtraction feature" }),
    });
    assert.equal(convRes.status, 201);
    const convBody = await convRes.json();
    conversationId = convBody.data.conversation.id;

    // Send user message
    const msgRes = await request(base, `/api/v1/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        role: "user",
        content: "Add a subtract function to the calculator, add tests, and update the README.",
      }),
    });
    assert.equal(msgRes.status, 201);

    // Create Goal
    const goal = await IntentRequirementService.createGoalFromConversation(conversationId, {
      autonomyMode: "supervised",
    });
    goalId = goal.id;
    assert.ok(goalId);

    // Analyze intent
    const analysis = await IntentRequirementService.analyzeIntent(goalId);
    assert.ok(analysis.id);
  });

  // 5. Plan & Build Contract Generation
  await t.test("5. Planning: generate plan and Build Contract revision", async () => {
    // Create requirement revision
    const reqRevRes = await query(
      `INSERT INTO requirement_revisions (goal_id, revision, digest, requirements)
       VALUES ($1, 1, 'digest-req-golden', '[{"id":"req_subtract","text":"Add subtract function and tests"}]'::jsonb)
       RETURNING id`,
      [goalId]
    );
    const reqRevId = reqRevRes.rows[0].id;

    // Create plan & revision
    const planRes = await query("INSERT INTO plans (goal_id) VALUES ($1) RETURNING id", [goalId]);
    const planId = planRes.rows[0].id;

    const planRevRes = await query(
      `INSERT INTO plan_revisions (plan_id, goal_id, revision, requirement_revision_id, digest, steps)
       VALUES ($1, $2, 1, $3, 'digest-plan-golden', '[{"key":"implement_subtract","title":"Implement subtract and test","dependencies":[]}]'::jsonb)
       RETURNING id`,
      [planId, goalId, reqRevId]
    );
    const planRevId = planRevRes.rows[0].id;

    // Create Contract & Revision
    const contractDoc = {
      goal: "Add subtract function",
      requirements: [{ id: "req_subtract", text: "Add subtract function" }],
      steps: [
        { key: "implement_subtract", title: "Implement subtract function and tests", dependencies: [] },
      ],
      acceptance: {
        criteria: [
          { key: "CRIT-TESTS", name: "Independent Test Suite Green", required: true },
          { key: "CRIT-BUILD", name: "Clean Build Execution", required: true },
        ],
      },
      verification: { suite: "node_test" },
    };
    contractDigest = crypto.createHash("sha256").update(JSON.stringify(contractDoc)).digest("hex");

    const contractRes = await query("INSERT INTO contracts (goal_id) VALUES ($1) RETURNING id", [goalId]);
    const contractId = contractRes.rows[0].id;

    const contractRevRes = await query(
      `INSERT INTO contract_revisions (
        contract_id, goal_id, revision, plan_revision_id, requirement_revision_id,
        digest, schema_version, canonicalizer_version, document, reason, created_at
      ) VALUES ($1, $2, 1, $3, $4, $5, 1, 'v1', $6, 'Golden plan', NOW())
      RETURNING id`,
      [contractId, goalId, planRevId, reqRevId, contractDigest, JSON.stringify(contractDoc)]
    );
    contractRevId = contractRevRes.rows[0].id;
    assert.ok(contractRevId);
  });

  // 6. Approval Enforcement
  await t.test("6. Governance: grant human approval for contract revision", async () => {
    const appRes = await query(
      `INSERT INTO approvals (
        kind, contract_revision_id, input_digest, state, nonce_hash, expires_at
      ) VALUES ('contract', $1, $2, 'approved', 'dummy_golden_nonce', NOW() + INTERVAL '1 day')
      RETURNING id`,
      [contractRevId, contractDigest]
    );
    assert.ok(appRes.rows[0].id);
  });

  // 7. Start Workflow Run & Project DAG Tasks
  await t.test("7. Workflow Orchestrator: start run and project tasks", { timeout: 60000 }, async () => {
    const res = await request(base, `/api/v1/goals/${goalId}/runs`, {
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
    assert.equal(res.status, 202);
    const body = await res.json();
    runId = body.data.run.id;
    assert.ok(runId);
    assert.equal(body.data.run.state, "running");

    // Verify task was projected into tasks table
    const taskRes = await query("SELECT id, step_key, state FROM tasks WHERE run_id = $1", [runId]);
    assert.equal(taskRes.rows.length, 1);
    assert.equal(taskRes.rows[0].step_key, "implement_subtract");
    assert.equal(taskRes.rows[0].state, "pending");
  });

  // 8. Autonomous Worker: Claim Task & Execute Tools (ReAct loop)
  await t.test("8. Worker Execution: claim task, invoke tools, modify files, run tests, verify cleanly", { timeout: 180000 }, async () => {
    const testModelExecutor = async ({ turn }) => {
      if (turn === 1) {
        return {
          content: "Inspecting directory to understand structure.",
          tool_calls: [{ id: "call_list", name: "list_directory", args: { path: "." } }],
        };
      }
      if (turn === 2) {
        return {
          content: "Reading calculator source.",
          tool_calls: [{ id: "call_read_calc", name: "read_file", args: { path: "src/calculator.js" } }],
        };
      }
      if (turn === 3) {
        return {
          content: "Implementing subtract function.",
          tool_calls: [{
            id: "call_write_calc",
            name: "write_file",
            args: {
              path: "src/calculator.js",
              content: `export function add(a, b) { return a + b; }\nexport function subtract(a, b) { return a - b; }\n`,
            },
          }],
        };
      }
      if (turn === 4) {
        return {
          content: "Adding unit tests for subtract.",
          tool_calls: [{
            id: "call_write_test",
            name: "write_file",
            args: {
              path: "tests/calculator.test.js",
              content: `import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport { add, subtract } from '../src/calculator.js';\n\ntest('add works', () => { assert.equal(add(1, 2), 3); });\ntest('subtract works', () => { assert.equal(subtract(5, 2), 3); });\n`,
            },
          }],
        };
      }
      if (turn === 5) {
        return {
          content: "Running test suite inside sandbox.",
          tool_calls: [{
            id: "call_test",
            name: "execute_command",
            args: { command: "node", args: ["--test", "tests/calculator.test.js"] },
          }],
        };
      }
      if (turn === 6) {
        return {
          content: "Updating documentation.",
          tool_calls: [{
            id: "call_readme",
            name: "write_file",
            args: { path: "README.md", content: "# Calculator\nSupports add and subtract operations.\n" },
          }],
        };
      }
      return {
        content: "Proposing task completion.",
        tool_calls: [{
          id: "call_done",
          name: "propose_task_completion",
          args: {
            summary: "Implemented subtract function, updated test suite, verified tests pass in sandbox, and updated documentation.",
            filesModified: ["src/calculator.js", "tests/calculator.test.js", "README.md"],
          },
        }],
      };
    };

    let outcome;
    try {
      // First attempt with live provider
      outcome = await AgentWorkerService.runWorkflowToCompletion(runId);
    } catch (err) {
      // If live Gemini daily quota is exhausted (limit: 20 per day), fallback to testModelExecutor
      const errMsg = err?.message || "";
      if (errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("quota")) {
        console.log("[Golden E2E] Live provider quota exhausted for today; verifying ReAct loop via testModelExecutor.");
        await query("UPDATE tasks SET state = 'pending' WHERE run_id = $1", [runId]);
        outcome = await AgentWorkerService.runWorkflowToCompletion(runId, { modelExecutor: testModelExecutor });
      } else {
        throw err;
      }
    }
    assert.equal(outcome.status, "completed");
    assert.ok(outcome.reportId);
    assert.equal(outcome.verification.outcome, "pass");

    // Verify run record updated in database
    const runCheck = await query("SELECT state, verification_report_id FROM runs WHERE id = $1", [runId]);
    assert.equal(runCheck.rows[0].state, "completed");
    assert.equal(runCheck.rows[0].verification_report_id, outcome.reportId);

    // 9. Verify on-disk file mutations
    const calcContent = fs.readFileSync(path.join(sampleProjectDir, "src", "calculator.js"), "utf8");
    assert.ok(calcContent.includes("function subtract"), "calculator.js must contain subtract function");

    const testContent = fs.readFileSync(path.join(sampleProjectDir, "tests", "calculator.test.js"), "utf8");
    assert.ok(testContent.includes("subtract works"), "calculator.test.js must contain subtract test");

    const readmeContent = fs.readFileSync(path.join(sampleProjectDir, "README.md"), "utf8");
    assert.ok(readmeContent.includes("subtract"), "README.md must mention subtract");
  });
});
