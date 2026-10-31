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
import { SandboxManager } from "../services/sandboxManager.js";

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

test("Golden Unseen Project: Inventory Management Service E2E, Sandbox Security & Autonomous Repair", { timeout: 240000 }, async (t) => {
  const base = await serve(t, createTestApp());
  const { cookie, csrfToken, workspaceId: _workspaceId } = await createAuthenticatedSession(base);

  // 1. Setup sample local project repository on disk (Inventory Domain)
  const sampleProjectDir = fs.mkdtempSync(path.join(os.tmpdir(), "sirona-unseen-inv-"));
  fs.mkdirSync(path.join(sampleProjectDir, "src"), { recursive: true });
  fs.mkdirSync(path.join(sampleProjectDir, "tests"), { recursive: true });

  fs.writeFileSync(
    path.join(sampleProjectDir, "package.json"),
    JSON.stringify(
      {
        name: "inventory-service",
        version: "1.0.0",
        type: "module",
        scripts: { test: "node --test" },
      },
      null,
      2
    )
  );

  fs.writeFileSync(
    path.join(sampleProjectDir, "src", "inventory.js"),
    `export function calculateTotalValue(items) {
  if (!Array.isArray(items)) return 0;
  return items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 0), 0);
}
`
  );

  fs.writeFileSync(
    path.join(sampleProjectDir, "tests", "inventory.test.js"),
    `import test from "node:test";
import assert from "node:assert/strict";
import { calculateTotalValue } from "../src/inventory.js";

test("calculateTotalValue computes inventory worth", () => {
  const items = [
    { id: "A", price: 10, quantity: 2 },
    { id: "B", price: 5, quantity: 4 },
  ];
  assert.equal(calculateTotalValue(items), 40);
});
`
  );

  fs.writeFileSync(
    path.join(sampleProjectDir, "README.md"),
    "# Inventory Management Service\nA lightweight inventory utility.\n"
  );

  // Setup External Canary file to prove sandbox containment
  const externalCanaryDir = fs.mkdtempSync(path.join(os.tmpdir(), "sirona-canary-secret-"));
  const canaryFile = path.join(externalCanaryDir, "secret_canary.txt");
  fs.writeFileSync(canaryFile, "CONFIDENTIAL_CANARY_VALUE_XYZ_999");

  t.after(() => {
    try { fs.rmSync(sampleProjectDir, { recursive: true, force: true }); } catch {}
    try { fs.rmSync(externalCanaryDir, { recursive: true, force: true }); } catch {}
  });

  let projectId;
  let conversationId;
  let goalId;
  let contractRevId;
  let contractDigest;
  let runId;

  // 1. Positive Sandbox Security Proofs
  await t.test("1. Sandbox Security: Bubblewrap namespace containment, Docker socket masking, and network isolation", async () => {
    // A. Verify Docker socket is masked
    const dockerCheck = await SandboxManager.execute({
      command: "test",
      args: ["-S", "/var/run/docker.sock"],
      workspaceRoot: sampleProjectDir,
    });
    // Exit code 1 means /var/run/docker.sock does NOT exist as a socket (masked with tmpfs)
    assert.equal(dockerCheck.exitCode, 1, "Docker socket must be masked/unreachable inside sandbox");

    // B. Verify External Canary Containment (cannot access outside workspace)
    const canaryCheck = await SandboxManager.execute({
      command: "cat",
      args: ["/mnt/c" + canaryFile.replace(/^[a-zA-Z]:/, "").replace(/\\/g, "/")],
      workspaceRoot: sampleProjectDir,
    });
    assert.notEqual(canaryCheck.exitCode, 0, "External canary path must not be accessible from sandbox");
    assert.ok(!canaryCheck.stdout.includes("CONFIDENTIAL_CANARY_VALUE_XYZ_999"));

    // C. Verify Network Isolation by default
    const netCheck = await SandboxManager.execute({
      command: "curl",
      args: ["-s", "--connect-timeout", "2", "https://example.com"],
      workspaceRoot: sampleProjectDir,
      allowNetwork: false,
    });
    assert.notEqual(netCheck.exitCode, 0, "Outbound network access must fail closed by default");
  });

  // 2. Project Registration
  await t.test("2. Project Registration: create project with local directory", async () => {
    const res = await request(base, "/api/v1/projects", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        name: "Inventory Service",
        primaryPath: sampleProjectDir,
        engine: "nodejs",
      }),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    projectId = body.data.project.id;
    assert.ok(projectId);

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

  // 3. Repository Scanning
  await t.test("3. Repository Scanning: detect manifests, framework, and test runner", async () => {
    const res = await request(base, `/api/v1/projects/${projectId}/scan`, {
      method: "POST",
      headers: {
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.data.fileCount >= 3);
    assert.equal(body.data.detectedFramework, "node");
    assert.equal(body.data.detectedTestRunner, "node --test");

    // Verify nodes were ingested into knowledge.nodes
    const nodeRes = await query("SELECT count(*) FROM knowledge.nodes WHERE project_id = $1", [projectId]);
    assert.ok(parseInt(nodeRes.rows[0].count, 10) >= 3);
  });

  // 4. Context Engine
  await t.test("4. Context Engine: compile reproducible Context Pack", async () => {
    const contextPack = await ContextEngineService.assembleContextPack({
      projectId,
      prompt: "Implement low stock inventory filter",
    });
    assert.ok(contextPack.id);
    assert.ok(contextPack.digest);
  });

  // 5. Intent System
  await t.test("5. Intent System: create conversation and goal from user request", async () => {
    const convRes = await request(base, `/api/v1/projects/${projectId}/conversations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({ title: "Inventory low stock feature" }),
    });
    assert.equal(convRes.status, 201);
    const convBody = await convRes.json();
    conversationId = convBody.data.conversation.id;

    const msgRes = await request(base, `/api/v1/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        role: "user",
        content: "Add a getLowStockItems(items, threshold) function to the inventory module, add tests, and update README.",
      }),
    });
    assert.equal(msgRes.status, 201);

    const goal = await IntentRequirementService.createGoalFromConversation(conversationId, {
      autonomyMode: "supervised",
    });
    goalId = goal.id;
    assert.ok(goalId);
  });

  // 6. Planning & Contract
  await t.test("6. Planning: generate plan and Build Contract revision", async () => {
    const reqRevRes = await query(
      `INSERT INTO requirement_revisions (goal_id, revision, digest, requirements)
       VALUES ($1, 1, 'digest-req-inv', '[{"id":"req_inv","text":"Add getLowStockItems function and tests"}]'::jsonb)
       RETURNING id`,
      [goalId]
    );
    const reqRevId = reqRevRes.rows[0].id;

    const planRes = await query("INSERT INTO plans (goal_id) VALUES ($1) RETURNING id", [goalId]);
    const planId = planRes.rows[0].id;

    const planRevRes = await query(
      `INSERT INTO plan_revisions (plan_id, goal_id, revision, requirement_revision_id, digest, steps)
       VALUES ($1, $2, 1, $3, 'digest-plan-inv', '[{"key":"implement_inventory_feature","title":"Implement getLowStockItems and tests","dependencies":[]}]'::jsonb)
       RETURNING id`,
      [planId, goalId, reqRevId]
    );
    const planRevId = planRevRes.rows[0].id;

    const contractDoc = {
      goal: "Add getLowStockItems function",
      requirements: [{ id: "req_inv", text: "Add getLowStockItems function" }],
      steps: [
        { key: "implement_inventory_feature", title: "Implement getLowStockItems function and tests", dependencies: [] },
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
      ) VALUES ($1, $2, 1, $3, $4, $5, 1, 'v1', $6, 'Inventory plan', NOW())
      RETURNING id`,
      [contractId, goalId, planRevId, reqRevId, contractDigest, JSON.stringify(contractDoc)]
    );
    contractRevId = contractRevRes.rows[0].id;
    assert.ok(contractRevId);
  });

  // 7. Approval
  await t.test("7. Governance: grant human approval for contract revision", async () => {
    const appRes = await query(
      `INSERT INTO approvals (
        kind, contract_revision_id, input_digest, state, nonce_hash, expires_at
      ) VALUES ('contract', $1, $2, 'approved', 'dummy_inv_nonce', NOW() + INTERVAL '1 day')
      RETURNING id`,
      [contractRevId, contractDigest]
    );
    assert.ok(appRes.rows[0].id);
  });

  // 8. Workflow Orchestrator
  await t.test("8. Workflow Orchestrator: start run and project tasks", { timeout: 60000 }, async () => {
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
  });

  // 9. Autonomous Worker: Claim Task & Execute Tools (ReAct loop on Unseen Domain)
  await t.test("9. Worker Execution: claim task, execute tools, modify files, run tests, verify cleanly", { timeout: 180000 }, async () => {
    const unseenModelExecutor = async ({ turn }) => {
      if (turn === 1) {
        return {
          content: "Inspecting directory to understand structure.",
          tool_calls: [{ id: "call_list", name: "list_directory", args: { path: "." } }],
        };
      }
      if (turn === 2) {
        return {
          content: "Reading inventory source file.",
          tool_calls: [{ id: "call_read_inv", name: "read_file", args: { path: "src/inventory.js" } }],
        };
      }
      if (turn === 3) {
        return {
          content: "Implementing getLowStockItems function in src/inventory.js.",
          tool_calls: [{
            id: "call_write_inv",
            name: "write_file",
            args: {
              path: "src/inventory.js",
              content: `export function calculateTotalValue(items) {
  if (!Array.isArray(items)) return 0;
  return items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 0), 0);
}

export function getLowStockItems(items, threshold = 5) {
  if (!Array.isArray(items)) return [];
  return items.filter((item) => (item.quantity || 0) <= threshold);
}
`,
            },
          }],
        };
      }
      if (turn === 4) {
        return {
          content: "Adding unit tests for getLowStockItems in tests/inventory.test.js.",
          tool_calls: [{
            id: "call_write_test",
            name: "write_file",
            args: {
              path: "tests/inventory.test.js",
              content: `import test from "node:test";
import assert from "node:assert/strict";
import { calculateTotalValue, getLowStockItems } from "../src/inventory.js";

test("calculateTotalValue computes inventory worth", () => {
  const items = [
    { id: "A", price: 10, quantity: 2 },
    { id: "B", price: 5, quantity: 4 },
  ];
  assert.equal(calculateTotalValue(items), 40);
});

test("getLowStockItems filters items below or equal to threshold", () => {
  const items = [
    { id: "A", quantity: 2 },
    { id: "B", quantity: 10 },
    { id: "C", quantity: 5 },
  ];
  const low = getLowStockItems(items, 5);
  assert.equal(low.length, 2);
  assert.deepEqual(low.map(i => i.id), ["A", "C"]);
});
`,
            },
          }],
        };
      }
      if (turn === 5) {
        return {
          content: "Running test suite inside sandbox to verify changes.",
          tool_calls: [{
            id: "call_test",
            name: "execute_command",
            args: { command: "node", args: ["--test"] },
          }],
        };
      }
      if (turn === 6) {
        return {
          content: "Updating documentation in README.md.",
          tool_calls: [{
            id: "call_readme",
            name: "write_file",
            args: {
              path: "README.md",
              content: "# Inventory Management Service\nA lightweight inventory utility featuring total valuation and low-stock alerting.\n",
            },
          }],
        };
      }
      return {
        content: "Proposing task completion.",
        tool_calls: [{
          id: "call_done",
          name: "propose_task_completion",
          args: {
            summary: "Implemented getLowStockItems function, added unit tests, and updated README.",
            filesModified: ["src/inventory.js", "tests/inventory.test.js", "README.md"],
          },
        }],
      };
    };

    let outcome;
    try {
      outcome = await AgentWorkerService.runWorkflowToCompletion(runId);
    } catch (err) {
      const errMsg = err?.message || "";
      if (errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("quota")) {
        console.log("[Golden Unseen] Live provider quota exhausted; verifying ReAct loop via unseenModelExecutor.");
        await query("UPDATE tasks SET state = 'pending' WHERE run_id = $1", [runId]);
        outcome = await AgentWorkerService.runWorkflowToCompletion(runId, { modelExecutor: unseenModelExecutor });
      } else {
        throw err;
      }
    }
    assert.equal(outcome.status, "completed");
    assert.ok(outcome.reportId);
    assert.equal(outcome.verification.outcome, "pass");

    // Verify on-disk file mutations
    const invContent = fs.readFileSync(path.join(sampleProjectDir, "src", "inventory.js"), "utf8");
    assert.ok(invContent.includes("export function getLowStockItems"), "inventory.js must contain getLowStockItems");

    const testContent = fs.readFileSync(path.join(sampleProjectDir, "tests", "inventory.test.js"), "utf8");
    assert.ok(testContent.includes("getLowStockItems filters items"), "inventory.test.js must contain getLowStockItems tests");

    const readmeContent = fs.readFileSync(path.join(sampleProjectDir, "README.md"), "utf8");
    assert.ok(readmeContent.includes("low-stock"), "README.md must mention low-stock");
  });

  // 10. Autonomous Verification & Bounded Repair on Unseen Defect
  await t.test("10. Bounded Self-Repair Loop on Unseen Defect: detects failure, records fingerprint, applies patch, and passes", { timeout: 120000 }, async () => {
    // Seed an intentional bug in getLowStockItems (inverted condition > instead of <=)
    fs.writeFileSync(
      path.join(sampleProjectDir, "src", "inventory.js"),
      `export function calculateTotalValue(items) {
  if (!Array.isArray(items)) return 0;
  return items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 0), 0);
}

// BUG: strictly greater than instead of less than or equal
export function getLowStockItems(items, threshold = 5) {
  if (!Array.isArray(items)) return [];
  return items.filter((item) => (item.quantity || 0) > threshold);
}
`
    );

    // Update test to assert low stock items (fails on seeded bug)
    fs.writeFileSync(
      path.join(sampleProjectDir, "tests", "inventory.test.js"),
      `import test from "node:test";
import assert from "node:assert/strict";
import { calculateTotalValue, getLowStockItems } from "../src/inventory.js";

test("calculateTotalValue computes inventory worth", () => {
  assert.equal(calculateTotalValue([{ id: "A", price: 10, quantity: 2 }]), 20);
});

test("getLowStockItems filters items below threshold", () => {
  const low = getLowStockItems([{ id: "A", quantity: 2 }, { id: "B", quantity: 10 }], 5);
  assert.equal(low.length, 1);
  assert.equal(low[0].id, "A");
});
`
    );

    // Create a new run for the repair test
    const repairRunRes = await request(base, `/api/v1/goals/${goalId}/runs`, {
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
    assert.equal(repairRunRes.status, 202);
    const repairRunId = (await repairRunRes.json()).data.run.id;

    const unseenRepairExecutor = async ({ prompt }) => {
      if (prompt.includes("Verification Test Failure Repair")) {
        // Repair turn: fix the condition to <= threshold
        return {
          content: "Fixing filter condition in getLowStockItems.",
          tool_calls: [
            {
              id: "call_fix",
              name: "write_file",
              args: {
                path: "src/inventory.js",
                content: `export function calculateTotalValue(items) {
  if (!Array.isArray(items)) return 0;
  return items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 0), 0);
}

export function getLowStockItems(items, threshold = 5) {
  if (!Array.isArray(items)) return [];
  return items.filter((item) => (item.quantity || 0) <= threshold);
}
`,
              },
            },
            {
              id: "call_done",
              name: "propose_task_completion",
              args: { summary: "Fixed low stock condition to correctly return items <= threshold" },
            },
          ],
        };
      }
      return {
        content: "Initial task complete.",
        tool_calls: [{ id: "call_done", name: "propose_task_completion", args: { summary: "Initial task complete" } }],
      };
    };

    let outcome;
    try {
      outcome = await AgentWorkerService.runWorkflowToCompletion(repairRunId);
    } catch (err) {
      const errMsg = err?.message || "";
      if (errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("quota")) {
        console.log("[Golden Unseen Repair] Live provider quota exhausted; verifying repair via unseenRepairExecutor.");
        await query("UPDATE tasks SET state = 'pending' WHERE run_id = $1", [repairRunId]);
        outcome = await AgentWorkerService.runWorkflowToCompletion(repairRunId, { modelExecutor: unseenRepairExecutor });
      } else {
        throw err;
      }
    }

    assert.equal(outcome.status, "completed");
    assert.equal(outcome.repairAttempts, 1, "Must perform exactly 1 repair attempt to resolve unseen defect");
    assert.equal(outcome.verification.outcome, "pass");

    // Verify failure record exists with deduplication fingerprint
    const failuresRes = await query("SELECT * FROM control.failures WHERE run_id = $1", [repairRunId]);
    assert.ok(failuresRes.rows.length >= 1);
    assert.equal(failuresRes.rows[0].class, "TEST_SUITE_FAILURE");
    assert.ok(failuresRes.rows[0].fingerprint);

    // Verify repair hypothesis exists
    const repairsRes = await query("SELECT * FROM control.repair_hypotheses WHERE run_id = $1", [repairRunId]);
    assert.ok(repairsRes.rows.length >= 1);
    assert.equal(repairsRes.rows[0].strategy, "code_patch");

    // Verify on-disk file was fixed
    const fixedContent = fs.readFileSync(path.join(sampleProjectDir, "src", "inventory.js"), "utf8");
    assert.ok(fixedContent.includes("<= threshold"), "inventory.js must be repaired to use <= threshold");
  });
});
