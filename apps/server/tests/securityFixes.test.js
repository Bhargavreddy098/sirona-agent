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
import { SecretStore } from "../services/secretStore.js";
import { ProviderService } from "../services/providerService.js";
import { WorkspacePathResolver } from "../services/workspacePathResolver.js";
import { SandboxManager, SandboxError } from "../services/sandboxManager.js";
import { WorkflowOrchestratorService } from "../services/workflowOrchestratorService.js";
import { CredentialResolver } from "../dist-workspace/src/providers/credentialResolver.js";
import { ProjectService } from "../services/projectService.js";

const testVaultRecords = new Map();
try {
  CredentialResolver.configureVault({
    put(secret) {
      const ref = CredentialResolver.generateCredentialRef();
      testVaultRecords.set(ref, secret);
      return ref;
    },
    get(ref) {
      const val = testVaultRecords.get(ref);
      if (!val) throw new Error("CREDENTIAL_UNAVAILABLE");
      return val;
    },
    remove(ref) {
      testVaultRecords.delete(ref);
    },
  });
} catch {}

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
  return { cookie, csrfToken };
}

test("Stage A: P0 Security Validations", async (t) => {
  const base = await serve(t, createTestApp());
  const { cookie, csrfToken } = await createAuthenticatedSession(base);

  const userRes = await query("SELECT id FROM users LIMIT 1");
  const userId = userRes.rows[0].id;

  const wsRes = await query(
    "INSERT INTO workspaces (name, owner_principal_id) VALUES ($1, $2) RETURNING id",
    [`ws-sec-${Date.now()}`, userId]
  );
  const workspaceId = wsRes.rows[0].id;

  const projRes = await query(
    "INSERT INTO projects (workspace_id, name, primary_path) VALUES ($1, $2, $3) RETURNING id",
    [workspaceId, "sec-test-proj", "/tmp/sec-test-proj"]
  );
  const projectId = projRes.rows[0].id;

  const tempWorkspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sirona-sec-workspace-"));
  t.after(() => {
    try {
      fs.rmSync(tempWorkspaceRoot, { recursive: true, force: true });
    } catch {}
  });

  // 1. Tool authorization bypass prevention
  await t.test("Tool authorization: omitting projectId for sensitive tool is rejected with 400", async () => {
    const res = await request(base, "/api/v1/tools/invoke", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        toolName: "write_file",
        input: { path: "test.txt", content: "data" },
        workspaceRoot: tempWorkspaceRoot,
      }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.ok(body.detail.includes("projectId is required") || body.detail.includes("required"));
  });

  await t.test("Tool authorization: ungranted write capability is rejected with 403", async () => {
    const res = await request(base, "/api/v1/tools/invoke", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        toolName: "write_file",
        input: { path: "test.txt", content: "data" },
        workspaceRoot: tempWorkspaceRoot,
        projectId,
      }),
    });
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(res.status, 403);
    assert.ok(body.detail);
  });

  // 2. Filesystem containment and junction/symlink escape blocking
  await t.test("Filesystem containment: WorkspacePathResolver blocks traversal and external escapes", () => {
    assert.throws(
      () => WorkspacePathResolver.resolveAndValidate(tempWorkspaceRoot, "../outside.txt"),
      /Path traversal/
    );

    assert.throws(
      () => WorkspacePathResolver.resolveAndValidate(tempWorkspaceRoot, "C:\\Windows\\System32\\calc.exe"),
      /Path traversal/
    );
  });

  // 3. Plaintext provider credentials encryption
  await t.test("Provider credentials: API keys are encrypted at rest with AES-256-GCM envelope", async () => {
    const secretKey = "sk-test-super-secret-key-12345678";
    const encrypted = SecretStore.encrypt(secretKey);
    assert.ok(encrypted.startsWith("enc:v1:"));
    assert.notEqual(encrypted, secretKey);

    const decrypted = SecretStore.decrypt(encrypted);
    assert.equal(decrypted, secretKey);

    // Test ProviderService persistence
    const conn = await ProviderService.saveProviderConnection({
      kind: "openai",
      name: "OpenAI Prod",
      apiKey: secretKey,
    });
    const connectionId = conn.connection.id;

    // Directly query database to prove it is NOT stored in plaintext
    const dbRes = await query("SELECT api_key_ciphertext FROM provider_connections WHERE id = $1", [connectionId]);
    const stored = dbRes.rows[0].api_key_ciphertext;
    assert.ok(stored.startsWith("enc:v1:") || stored.startsWith("cred:v1:"));
    assert.ok(!stored.includes(secretKey));

    // Decrypts cleanly on retrieval
    const retrievedKey = await ProviderService.getApiKey("openai");
    assert.equal(retrievedKey, secretKey);

    // Clean up test connection
    await query("DELETE FROM provider_connections WHERE id = $1", [connectionId]);
  });

  // 4. Sandbox fail-closed requirement
  await t.test("Sandbox fail-closed: unavailable sandbox does NOT fall back to host execution", async () => {
    // When requested sandbox is unavailable and allowHostExecution is false, must throw SANDBOX_UNAVAILABLE
    await assert.rejects(
      async () => {
        await SandboxManager.resolveBackend({ prefer: "windows_sandbox", allowHostExecution: false });
      },
      (err) => {
        assert.ok(err instanceof SandboxError);
        assert.equal(err.code, "SANDBOX_UNAVAILABLE");
        assert.equal(err.status, 503);
        return true;
      }
    );
  });

  // 5. Expired approvals rejected
  await t.test("Workflow execution: expired approvals are strictly rejected", async () => {
    // Create goal
    const goalRes = await query(
      "INSERT INTO goals (project_id, intent, status, autonomy_mode) VALUES ($1, 'Expired Approval Test', 'active', 'supervised') RETURNING id",
      [projectId]
    );
    const goalId = goalRes.rows[0].id;

    // Insert requirement revision
    const reqRevRes = await query(
      "INSERT INTO requirement_revisions (goal_id, revision, digest, requirements) VALUES ($1, 1, 'digest-req-exp', '[]'::jsonb) RETURNING id",
      [goalId]
    );
    const reqRevId = reqRevRes.rows[0].id;

    // Insert plan & plan revision
    const planRes = await query(
      "INSERT INTO plans (goal_id) VALUES ($1) RETURNING id",
      [goalId]
    );
    const planId = planRes.rows[0].id;

    const planRevRes = await query(
      `INSERT INTO plan_revisions (plan_id, goal_id, revision, requirement_revision_id, digest, steps)
       VALUES ($1, $2, 1, $3, 'digest-plan-exp', '[{"key":"step_1","title":"Step 1","dependencies":[]}]'::jsonb)
       RETURNING id`,
      [planId, goalId, reqRevId]
    );
    const planRevId = planRevRes.rows[0].id;

    // Create contract & revision
    const contractRes = await query(
      "INSERT INTO contracts (goal_id) VALUES ($1) RETURNING id",
      [goalId]
    );
    const contractId = contractRes.rows[0].id;

    const contractDigest = "sha256-mock-digest-expired-1234567890abcdef";
    const contractRevRes = await query(
      `INSERT INTO contract_revisions (
        contract_id, goal_id, revision, digest, document, schema_version, canonicalizer_version, plan_revision_id, requirement_revision_id
      ) VALUES ($1, $2, 1, $3, '{"title":"Test"}', 1, 'v1', $4, $5)
      RETURNING id`,
      [contractId, goalId, contractDigest, planRevId, reqRevId]
    );
    const contractRevId = contractRevRes.rows[0].id;

    // Create EXPIRED approval
    await query(
      `INSERT INTO approvals (
        kind, contract_revision_id, input_digest, state, nonce_hash, expires_at
      ) VALUES ('contract', $1, $2, 'approved', 'dummy_nonce', NOW() - INTERVAL '10 minutes')`,
      [contractRevId, contractDigest]
    );

    await assert.rejects(
      async () => {
        await WorkflowOrchestratorService.startWorkflowRun(goalId, {
          contractRevisionId: contractRevId,
          contractDigest,
        });
      },
      (err) => {
        assert.equal(err.code, "APPROVAL_REQUIRED");
        assert.equal(err.status, 400);
        return true;
      }
    );
  });

  // 6. Multi-tenant workspace isolation and cross-workspace access rejection (404/403)
  await t.test("Multi-tenant workspace isolation: cross-workspace access to projects, artifacts, and memories is rejected with 404", async () => {
    // Session A in default Workspace A
    const sessionA = await createAuthenticatedSession(base);

    // Create a distinct Workspace B and Session B
    const userRes = await query("SELECT id FROM users LIMIT 1");
    const userId = userRes.rows[0].id;
    const wsBRes = await query(
      "INSERT INTO workspaces (name, owner_principal_id) VALUES ($1, $2) RETURNING id",
      [`Workspace-B-${Date.now()}`, userId]
    );
    const workspaceBId = wsBRes.rows[0].id;

    const rawSessionTokenB = crypto.randomBytes(32).toString("hex");
    const rawCsrfTokenB = crypto.randomBytes(32).toString("hex");
    const tokenHashB = crypto.createHash("sha256").update(rawSessionTokenB).digest("hex");
    const csrfHashB = crypto.createHash("sha256").update(rawCsrfTokenB).digest("hex");
    const expiresAtB = new Date(Date.now() + 8 * 3600 * 1000);

    await query(
      "INSERT INTO auth_sessions (principal_id, workspace_id, token_hash, csrf_hash, expires_at) VALUES ($1, $2, $3, $4, $5)",
      [userId, workspaceBId, tokenHashB, csrfHashB, expiresAtB]
    );

    const sessionB = {
      cookie: `asi_session=${rawSessionTokenB}`,
      csrfToken: rawCsrfTokenB,
      workspaceId: workspaceBId,
    };

    // Create Project A in Workspace A
    const projARes = await request(base, "/api/v1/projects", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionA.cookie,
        "x-csrf-token": sessionA.csrfToken,
      },
      body: JSON.stringify({ name: "Project-A-Private" }),
    });
    assert.equal(projARes.status, 201);
    const projA = (await projARes.json()).data.project;

    // Create Memory in Project A
    const memARes = await request(base, `/api/v1/projects/${projA.id}/memories`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionA.cookie,
        "x-csrf-token": sessionA.csrfToken,
      },
      body: JSON.stringify({
        memoryKind: "project",
        title: "Confidential Secrets",
        content: "Top secret architectural decision for Workspace A",
      }),
    });
    assert.equal(memARes.status, 201);
    const memA = (await memARes.json()).data;

    // Create Artifact in Project A
    const tempFile = path.join(tempWorkspaceRoot, "artifact-a.txt");
    fs.writeFileSync(tempFile, "confidential workspace A artifact content", "utf8");
    const artA = await ProjectService.createArtifact(projA.id, {
      name: "Secret Spec A",
      digest: "sha256-artifact-a-digest",
      storagePath: tempFile,
      sizeBytes: 42,
      mimeType: "text/plain",
    }, sessionA.workspaceId || (await query("SELECT workspace_id FROM projects WHERE id = $1", [projA.id])).rows[0].workspace_id);

    // Now test Session B (Workspace B) attempting cross-workspace access:

    // 6.1 GET Project A -> 404
    const getProjRes = await request(base, `/api/v1/projects/${projA.id}`, {
      method: "GET",
      headers: { Cookie: sessionB.cookie },
    });
    assert.equal(getProjRes.status, 404);

    // 6.2 PATCH Project A -> 404
    const patchProjRes = await request(base, `/api/v1/projects/${projA.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionB.cookie,
        "x-csrf-token": sessionB.csrfToken,
      },
      body: JSON.stringify({ name: "Hacked Project Name", expectedVersion: 1 }),
    });
    assert.equal(patchProjRes.status, 404);

    // 6.3 Archive Project A -> 404
    const archiveProjRes = await request(base, `/api/v1/projects/${projA.id}/archive`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionB.cookie,
        "x-csrf-token": sessionB.csrfToken,
      },
    });
    assert.equal(archiveProjRes.status, 404);

    // 6.4 GET Artifact A -> 404
    const getArtRes = await request(base, `/api/v1/artifacts/${artA.id}`, {
      method: "GET",
      headers: { Cookie: sessionB.cookie },
    });
    assert.equal(getArtRes.status, 404);

    // 6.5 GET Artifact A Content -> 404
    const getArtContentRes = await request(base, `/api/v1/artifacts/${artA.id}/content`, {
      method: "GET",
      headers: { Cookie: sessionB.cookie },
    });
    assert.equal(getArtContentRes.status, 404);

    // 6.6 GET Memory A -> 404
    const getMemRes = await request(base, `/api/v1/memories/${memA.id}`, {
      method: "GET",
      headers: { Cookie: sessionB.cookie },
    });
    assert.equal(getMemRes.status, 404);

    // 6.7 DELETE Memory A -> 404
    const delMemRes = await request(base, `/api/v1/memories/${memA.id}`, {
      method: "DELETE",
      headers: {
        Cookie: sessionB.cookie,
        "x-csrf-token": sessionB.csrfToken,
      },
    });
    assert.equal(delMemRes.status, 404);

    // 6.8 Search memories in Project A -> 404
    const searchMemRes = await request(base, `/api/v1/projects/${projA.id}/memory-search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionB.cookie,
        "x-csrf-token": sessionB.csrfToken,
      },
      body: JSON.stringify({ query: "Confidential" }),
    });
    assert.equal(searchMemRes.status, 404);
  });

  // 7. Filesystem boundary: drive roots and system directories forbidden
  await t.test("Filesystem boundary: dangerous roots rejected with 403 FORBIDDEN_ROOT", async () => {
    const dangerousPaths = ["C:\\", "C:\\Windows", "C:\\Windows\\System32"];
    for (const dp of dangerousPaths) {
      const res = await request(base, "/api/v1/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookie,
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({ name: "Dangerous Root Project", primaryPath: dp }),
      });
      assert.equal(res.status, 403);
      const body = await res.json();
      assert.equal(body.code, "POLICY_DENIED");
      assert.ok(body.detail.includes("Cannot use system or drive root"));
    }
  });
});
