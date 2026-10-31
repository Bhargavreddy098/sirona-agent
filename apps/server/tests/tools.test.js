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
import { stage11Admission } from "../foundation/admission.js";
import { generateLauncherChallenge } from "../services/launcherChallenge.js";
import { canonicalJsonStringify } from "../services/toolRuntimeService.js";
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
    admission: stage11Admission,
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
  return { cookie, csrfToken };
}

test("Stage 11: Tool Runtime & One Coding Backend", async (t) => {
  const base = await serve(t, createTestApp());
  const { cookie, csrfToken } = await createAuthenticatedSession(base);

  // Create test workspace and project
  const userRes = await query("SELECT id FROM users LIMIT 1");
  const userId = userRes.rows[0].id;

  const wsRes = await query(
    "INSERT INTO workspaces (name, owner_principal_id) VALUES ($1, $2) RETURNING id",
    [`ws-tools-${Date.now()}`, userId]
  );
  const workspaceId = wsRes.rows[0].id;

  const projRes = await query(
    "INSERT INTO projects (workspace_id, name, primary_path) VALUES ($1, $2, $3) RETURNING id",
    [workspaceId, "tool-test-proj", "/tmp/tool-test-proj"]
  );
  const projectId = projRes.rows[0].id;

  // Setup temporary isolated workspace directory
  const tempWorkspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sirona-test-workspace-"));
  t.after(() => {
    try {
      fs.rmSync(tempWorkspaceRoot, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  });

  // ==========================================
  // 1. Authentication & CSRF
  // ==========================================

  await t.test("unauthenticated requests to /api/v1/tools return 401", async () => {
    const res = await request(base, "/api/v1/tools", { method: "GET" });
    assert.equal(res.status, 401);
  });

  await t.test("developer-connections mutation without CSRF token returns 403", async () => {
    const res = await request(base, "/api/v1/developer-connections", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
      },
      body: JSON.stringify({ adapterKind: "local_process" }),
    });
    assert.equal(res.status, 403);
  });

  await t.test("tool invocation without CSRF token returns 403", async () => {
    const res = await request(base, "/api/v1/tools/invoke", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
      },
      body: JSON.stringify({ toolName: "read_file", input: {} }),
    });
    assert.equal(res.status, 403);
  });

  // ==========================================
  // 2. Tool Catalog
  // ==========================================

  await t.test("GET /api/v1/tools returns seeded frozen tool catalog", async () => {
    const res = await request(base, "/api/v1/tools", {
      method: "GET",
      headers: { Cookie: cookie },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.data.total >= 5);

    const names = body.data.items.map((/** @type {{ name: string }} */ i) => i.name);
    assert.ok(names.includes("read_file"));
    assert.ok(names.includes("write_file"));
    assert.ok(names.includes("list_directory"));
    assert.ok(names.includes("execute_command"));
    assert.ok(names.includes("apply_patch"));

    // Check specific tool definition
    const readFileTool = body.data.items.find((/** @type {{ name: string }} */ i) => i.name === "read_file");
    assert.ok(readFileTool);
    assert.equal(readFileTool.risk, "read");
    assert.deepEqual(readFileTool.capabilities, ["fs_read"]);
    assert.ok(readFileTool.inputSchema.properties.path);
  });

  await t.test("GET /api/v1/tools filters by capability", async () => {
    const res = await request(base, "/api/v1/tools?capability=fs_read", {
      method: "GET",
      headers: { Cookie: cookie },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.data.items.every((/** @type {{ capabilities: string[] }} */ i) => i.capabilities.includes("fs_read")));
  });

  await t.test("GET /api/v1/tools/:toolId returns single tool and 404 for unknown", async () => {
    const res = await request(base, "/api/v1/tools/read_file", {
      method: "GET",
      headers: { Cookie: cookie },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.tool.name, "read_file");

    const unknownRes = await request(base, "/api/v1/tools/non_existent_tool", {
      method: "GET",
      headers: { Cookie: cookie },
    });
    assert.equal(unknownRes.status, 404);
  });

  // ==========================================
  // 3. Developer Connections Lifecycle
  // ==========================================

  let connectionId = "";

  await t.test("POST /api/v1/developer-connections rejects unsupported adapter kind", async () => {
    const res = await request(base, "/api/v1/developer-connections", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        workspaceId,
        adapterKind: "docker_escape",
      }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.ok(body.detail.includes("unsupported"));
  });

  await t.test("POST /api/v1/developer-connections creates connection successfully", async () => {
    const res = await request(base, "/api/v1/developer-connections", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        workspaceId,
        adapterKind: "local_process",
        installRef: "system-node",
        requestedCapabilities: ["fs_read", "fs_write", "shell_exec", "workspace_mutation"],
        testProfile: "hardened_local_boundary",
      }),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.ok(body.data.connection.id);
    assert.equal(body.data.connection.status, "connected");
    connectionId = body.data.connection.id;
  });

  await t.test("GET /api/v1/developer-connections lists connections", async () => {
    const res = await request(base, `/api/v1/developer-connections?workspaceId=${workspaceId}`, {
      method: "GET",
      headers: { Cookie: cookie },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.data.items.length >= 1);
  });

  await t.test("GET /api/v1/developer-connections/:id retrieves single connection", async () => {
    const res = await request(base, `/api/v1/developer-connections/${connectionId}`, {
      method: "GET",
      headers: { Cookie: cookie },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.connection.id, connectionId);
  });

  await t.test("POST /api/v1/developer-connections/:id/qualify qualifies connection", async () => {
    const res = await request(base, `/api/v1/developer-connections/${connectionId}/qualify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({ testProfile: "hardened_local_boundary" }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.connection.status, "qualified");
    assert.equal(body.data.qualification.status, "passed");
  });

  // ==========================================
  // 4. Tool Execution & Bounded Containment
  // ==========================================

  // Grant project capabilities for mutation testing
  await query(
    `INSERT INTO capability_grants (project_id, capability, resource_scope, expires_at)
     VALUES ($1, 'fs_write', '{}', NOW() + INTERVAL '1 hour'),
            ($1, 'workspace_mutation', '{}', NOW() + INTERVAL '1 hour'),
            ($1, 'patch', '{}', NOW() + INTERVAL '1 hour'),
            ($1, 'shell_exec', '{}', NOW() + INTERVAL '1 hour'),
            ($1, 'bounded_process', '{}', NOW() + INTERVAL '1 hour')`,
    [projectId]
  );

  let receiptId = "";

  await t.test("Tool execution: write_file writes file within containment", async () => {
    const res = await request(base, "/api/v1/tools/invoke", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        toolName: "write_file",
        input: {
          path: "src/index.js",
          content: "console.log('hello sirona stage 11');\n",
        },
        workspaceRoot: tempWorkspaceRoot,
        projectId,
        connectionId,
      }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.receipt.status, "success");
    assert.ok(body.data.output.bytesWritten > 0);
    assert.ok(body.data.output.digest);
    receiptId = body.data.receipt.id;

    // Verify on disk
    const onDisk = fs.readFileSync(path.join(tempWorkspaceRoot, "src", "index.js"), "utf8");
    assert.equal(onDisk, "console.log('hello sirona stage 11');\n");
  });

  await t.test("Tool execution: read_file reads file and computes sha256 digest", async () => {
    const res = await request(base, "/api/v1/tools/invoke", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        toolName: "read_file",
        input: { path: "src/index.js" },
        workspaceRoot: tempWorkspaceRoot,
        projectId,
      }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.receipt.status, "success");
    assert.equal(body.data.output.content, "console.log('hello sirona stage 11');\n");
    assert.ok(body.data.output.digest);
  });

  await t.test("Tool execution: list_directory lists entries within containment", async () => {
    const res = await request(base, "/api/v1/tools/invoke", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        toolName: "list_directory",
        input: { path: "src" },
        workspaceRoot: tempWorkspaceRoot,
      }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.receipt.status, "success");
    const entryNames = body.data.output.entries.map((/** @type {{ name: string }} */ e) => e.name);
    assert.ok(entryNames.includes("index.js"));
  });

  await t.test("Tool execution: apply_patch modifies file cleanly", async () => {
    const patch = `--- a/src/index.js\n+++ b/src/index.js\n@@ -1,1 +1,1 @@\n-console.log('hello sirona stage 11');\n+console.log('patch applied successfully');\n`;
    const res = await request(base, "/api/v1/tools/invoke", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        toolName: "apply_patch",
        input: { patch },
        workspaceRoot: tempWorkspaceRoot,
        projectId,
      }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.receipt.status, "success");
    assert.equal(body.data.output.applied, true);

    // Verify on disk
    const onDisk = fs.readFileSync(path.join(tempWorkspaceRoot, "src", "index.js"), "utf8");
    assert.ok(onDisk.includes("patch applied successfully"));
  });

  await t.test("Tool execution: execute_command runs isolated command", async () => {
    const res = await request(base, "/api/v1/tools/invoke", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        toolName: "execute_command",
        input: {
          command: process.platform === "win32" ? "cmd.exe" : "echo",
          args: process.platform === "win32" ? ["/c", "echo", "stage11-ok"] : ["stage11-ok"],
        },
        workspaceRoot: tempWorkspaceRoot,
        projectId,
      }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.receipt.status, "success");
    assert.equal(body.data.output.exitCode, 0);
    assert.ok(body.data.output.stdout.includes("stage11-ok"));
  });

  // ==========================================
  // 5. Security & Boundary Enforcement
  // ==========================================

  await t.test("Security: path traversal attempt is rejected with 400", async () => {
    const res = await request(base, "/api/v1/tools/invoke", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        toolName: "read_file",
        input: { path: "../../windows/system32/cmd.exe" },
        workspaceRoot: tempWorkspaceRoot,
      }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.ok(body.detail.includes("traversal") || body.detail.includes("escapes"));
  });

  await t.test("Security: device path attempt is rejected with 400", async () => {
    const res = await request(base, "/api/v1/tools/invoke", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        toolName: "write_file",
        input: { path: "\\\\.\\COM1", content: "evil" },
        workspaceRoot: tempWorkspaceRoot,
        projectId,
      }),
    });
    assert.equal(res.status, 400);
  });

  await t.test("Security: UNC path attempt is rejected with 400", async () => {
    const res = await request(base, "/api/v1/tools/invoke", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        toolName: "read_file",
        input: { path: "\\\\attacker-server\\share\\data" },
        workspaceRoot: tempWorkspaceRoot,
      }),
    });
    assert.equal(res.status, 400);
  });

  await t.test("Security: out-of-scope patch is rejected with 400", async () => {
    const badPatch = `--- a/../../outside.txt\n+++ b/../../outside.txt\n@@ -1,1 +1,1 @@\n-old\n+new\n`;
    const res = await request(base, "/api/v1/tools/invoke", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        toolName: "apply_patch",
        input: { patch: badPatch },
        workspaceRoot: tempWorkspaceRoot,
        projectId,
      }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.ok(body.detail.includes("out-of-scope") || body.detail.includes("traversal"));
  });

  await t.test("Security: non-existent base snapshot returns 409 BASE_SNAPSHOT_MISMATCH", async () => {
    const dummySnapshotId = crypto.randomUUID();
    const res = await request(base, "/api/v1/tools/invoke", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        toolName: "apply_patch",
        input: {
          patch: "--- a/src/index.js\n+++ b/src/index.js\n@@ -1,1 +1,1 @@\n-a\n+b\n",
          baseSnapshotId: dummySnapshotId,
        },
        workspaceRoot: tempWorkspaceRoot,
        projectId,
      }),
    });
    assert.equal(res.status, 409);
    const body = await res.json();
    assert.ok(body.detail.includes("snapshot"));
  });

  await t.test("Security: revoked grant blocks tool invocation with 403", async () => {
    // Create new project with revoked grant
    const revProjRes = await query(
      "INSERT INTO projects (workspace_id, name, primary_path) VALUES ($1, $2, $3) RETURNING id",
      [workspaceId, "revoked-grant-proj", "/tmp/revoked-grant-proj"]
    );
    const revProjectId = revProjRes.rows[0].id;

    // Insert revoked capability grant
    await query(
      `INSERT INTO capability_grants (project_id, capability, resource_scope, expires_at, revoked_at)
       VALUES ($1, 'workspace_mutation', '{}', NOW() + INTERVAL '1 hour', NOW())`,
      [revProjectId]
    );

    const res = await request(base, "/api/v1/tools/invoke", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        toolName: "write_file",
        input: { path: "test.txt", content: "test" },
        workspaceRoot: tempWorkspaceRoot,
        projectId: revProjectId,
      }),
    });
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.ok(body.detail.includes("revoked") || body.detail.includes("missing"));
  });

  await t.test("Security: timeout is bounded and recorded on receipt", async () => {
    const res = await request(base, "/api/v1/tools/invoke", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        toolName: "execute_command",
        input: {
          command: process.platform === "win32" ? "powershell.exe" : "sleep",
          args: process.platform === "win32" ? ["-Command", "Start-Sleep -Seconds 3"] : ["3"],
        },
        workspaceRoot: tempWorkspaceRoot,
        projectId,
        timeoutMs: 300, // Strict 300ms timeout
      }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.receipt.status, "timeout");
    assert.equal(body.data.output.timedOut, true);
  });

  // ==========================================
  // 6. Receipt Verification & Disconnect
  // ==========================================

  await t.test("GET /api/v1/tools/receipts/:receiptId returns immutable receipt", async () => {
    assert.ok(receiptId);
    const res = await request(base, `/api/v1/tools/receipts/${receiptId}`, {
      method: "GET",
      headers: { Cookie: cookie },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    const receipt = body.data.receipt;
    assert.equal(receipt.id, receiptId);
    assert.equal(receipt.status, "success");
    assert.ok(receipt.inputDigest);
    assert.ok(receipt.outputDigest);

    // Verify output digest matches canonical serialization of receipt output
    const expectedDigest = crypto
      .createHash("sha256")
      .update(canonicalJsonStringify(receipt.output))
      .digest("hex");
    assert.equal(receipt.outputDigest, expectedDigest);
  });

  await t.test("POST /api/v1/developer-connections/:id/disconnect revokes dispatch", async () => {
    const res = await request(base, `/api/v1/developer-connections/${connectionId}/disconnect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({ reason: "End of testing session" }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.connection.status, "disconnected");

    // Re-qualifying disconnected connection returns 400
    const qualRes = await request(base, `/api/v1/developer-connections/${connectionId}/qualify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({ testProfile: "hardened_local_boundary" }),
    });
    assert.equal(qualRes.status, 400);

    // Invoking tool on disconnected connection returns 400
    const invokeRes = await request(base, "/api/v1/tools/invoke", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        toolName: "read_file",
        input: { path: "src/index.js" },
        workspaceRoot: tempWorkspaceRoot,
        connectionId,
      }),
    });
    assert.equal(invokeRes.status, 400);
  });

  // ==========================================
  // 7. Stage 11 Admission Gate
  // ==========================================

  await t.test("Stage 11 Admission allows tool catalog & denies unqualified routes", async () => {
    // Stage 11 endpoints admitted
    const toolsRes = await request(base, "/api/v1/tools", {
      method: "GET",
      headers: { Cookie: cookie },
    });
    assert.equal(toolsRes.status, 200);

    // Future Stage 12+ endpoints fail-closed with 503
    const verifRes = await request(base, "/api/v1/verification/jobs", {
      method: "GET",
      headers: { Cookie: cookie },
    });
    assert.equal(verifRes.status, 503);
  });
});
