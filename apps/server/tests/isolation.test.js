import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { loadEnvironment } from "../server.js";
import { readRuntimeConfig } from "../foundation/runtimeConfig.js";
import { createLogger } from "../foundation/logger.js";
import { createDatabaseOwner, activateDatabaseOwner } from "../config/db.js";
import { createApp } from "../app.js";
import { createHealthController } from "../controllers/healthController.js";
import apiRoutes from "../routes/index.js";
import { stage10Admission } from "../foundation/admission.js";
import { generateLauncherChallenge } from "../services/launcherChallenge.js";
import { IsolationBrokerService } from "../services/isolationBrokerService.js";
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
    admission: stage10Admission,
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

test("unauthenticated requests to isolation endpoints return 401", async (t) => {
  const base = await serve(t, createTestApp());
  const diagRes = await request(base, "/api/v1/isolation/diagnostics");
  assert.equal(diagRes.status, 401, "Diagnostics must require session");

  const qualRes = await request(base, "/api/v1/isolation/qualifications");
  assert.equal(qualRes.status, 401, "Qualifications list must require session");

  const runRes = await request(base, "/api/v1/isolation/qualify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  assert.equal(runRes.status, 401, "Qualify trigger must require session");
});

test("isolation mutations without CSRF token return 403", async (t) => {
  const base = await serve(t, createTestApp());
  const { cookie } = await createAuthenticatedSession(base);

  const postQualRes = await request(base, "/api/v1/isolation/qualify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({}),
  });
  assert.equal(postQualRes.status, 403, "Qualify without CSRF must return 403");

  const validateRes = await request(base, "/api/v1/isolation/validate-path", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({ workspaceRoot: "C:\\test", targetPath: "file.txt" }),
  });
  assert.equal(validateRes.status, 403, "Validate path without CSRF must return 403");
});

test("canonical path validation strictly catches traversals, device paths, UNC paths, and forbidden segments", async () => {
  const testRoot = path.resolve("./test_workspace_sandbox");
  if (!fs.existsSync(testRoot)) {
    fs.mkdirSync(testRoot, { recursive: true });
  }

  try {
    // Valid path
    const valid = IsolationBrokerService.validateWorkspacePath(testRoot, "src/index.js");
    assert.equal(valid.valid, true);
    assert.ok(valid.canonicalPath.startsWith(testRoot));

    // Path traversal outside root
    assert.throws(() => {
      IsolationBrokerService.validateWorkspacePath(testRoot, "../../Windows/System32");
    }, { code: "PATH_TRAVERSAL_DETECTED" });

    // Device path escape
    assert.throws(() => {
      IsolationBrokerService.validateWorkspacePath(testRoot, "\\\\.\\PhysicalDrive0");
    }, { code: "DEVICE_PATH_FORBIDDEN" });

    // DOS device name
    assert.throws(() => {
      IsolationBrokerService.validateWorkspacePath(testRoot, "NUL.txt");
    }, { code: "DEVICE_PATH_FORBIDDEN" });

    // UNC share path escape
    assert.throws(() => {
      IsolationBrokerService.validateWorkspacePath(testRoot, "\\\\server\\share\\secrets.txt");
    }, { code: "UNC_PATH_FORBIDDEN" });

    // Sensitive path segments (.ssh, .env)
    assert.throws(() => {
      IsolationBrokerService.validateWorkspacePath(testRoot, ".ssh/id_rsa");
    }, { code: "FORBIDDEN_PATH_ACCESS" });

    assert.throws(() => {
      IsolationBrokerService.validateWorkspacePath(testRoot, "config/.env");
    }, { code: "FORBIDDEN_PATH_ACCESS" });
  } finally {
    try {
      fs.rmSync(testRoot, { recursive: true, force: true });
    } catch {}
  }
});

test("environment sanitization strips all host secrets and credentials", async () => {
  process.env.PGPASSWORD = "secret_pg_password";
  process.env.OPENAI_API_KEY = "sk-test-secret-key-12345";
  process.env.CANARY_HOST_SECRET = "top_secret_canary";

  const sanitized = IsolationBrokerService.sanitizeGuestEnvironment({
    ALLOWED_VAR: "allowed_value",
    ANOTHER_SECRET: "should_be_stripped_because_of_name",
  });

  assert.equal(sanitized.PGPASSWORD, undefined, "PGPASSWORD must be stripped");
  assert.equal(sanitized.OPENAI_API_KEY, undefined, "OPENAI_API_KEY must be stripped");
  assert.equal(sanitized.CANARY_HOST_SECRET, undefined, "CANARY_HOST_SECRET must be stripped");
  assert.equal(sanitized.ANOTHER_SECRET, undefined, "Custom vars matching secret patterns must be stripped");
  assert.equal(sanitized.ALLOWED_VAR, "allowed_value", "Safe custom vars must be preserved");
  assert.equal(sanitized.SIRONA_ISOLATED, "true", "Sirona isolation marker must be present");

  delete process.env.PGPASSWORD;
  delete process.env.OPENAI_API_KEY;
  delete process.env.CANARY_HOST_SECRET;
});

test("egress gateway blocks loopback, metadata, and private network destinations", async () => {
  // Deny all policy
  const denyAll = IsolationBrokerService.validateEgress("https://api.github.com", "deny_all");
  assert.equal(denyAll.allowed, false);
  assert.equal(denyAll.reason, "EGRESS_POLICY_DENY_ALL");

  // Metadata endpoint
  const metadata = IsolationBrokerService.validateEgress("http://169.254.169.254/latest/meta-data", "allowlist_only", ["api.github.com"]);
  assert.equal(metadata.allowed, false);
  assert.equal(metadata.reason, "METADATA_ENDPOINT_FORBIDDEN");

  // Loopback
  const loopback = IsolationBrokerService.validateEgress("http://127.0.0.1:8000/api", "allowlist_only", ["api.github.com"]);
  assert.equal(loopback.allowed, false);
  assert.equal(loopback.reason, "LOOPBACK_FORBIDDEN");

  // Private RFC 1918
  const priv = IsolationBrokerService.validateEgress("http://192.168.1.1/router", "allowlist_only", ["api.github.com"]);
  assert.equal(priv.allowed, false);
  assert.equal(priv.reason, "PRIVATE_NETWORK_FORBIDDEN");

  // Unlisted domain
  const unlisted = IsolationBrokerService.validateEgress("https://malicious.evil.com/exfil", "allowlist_only", ["api.github.com"]);
  assert.equal(unlisted.allowed, false);
  assert.equal(unlisted.reason, "DOMAIN_NOT_ALLOWLISTED");

  // Whitelisted domain
  const whitelisted = IsolationBrokerService.validateEgress("https://api.github.com/v1/repos", "allowlist_only", ["api.github.com"]);
  assert.equal(whitelisted.allowed, true);
});

test("artifact quarantine import and export preserves SHA-256 digest and blocks executables/secrets", async () => {
  const testRoot = path.resolve("./test_workspace_artifacts");
  if (!fs.existsSync(testRoot)) {
    fs.mkdirSync(testRoot, { recursive: true });
  }

  try {
    const content = Buffer.from("export const hello = 'world';\n");
    const imported = IsolationBrokerService.quarantineImport(testRoot, "dist/bundle.js", content);
    assert.equal(imported.relativePath, "dist/bundle.js");
    assert.ok(imported.digest.length === 64);

    const exported = IsolationBrokerService.quarantineExport(testRoot, "dist/bundle.js");
    assert.equal(exported.digest, imported.digest);
    assert.equal(exported.passedScan, true);

    // Host secret leak detection in artifact
    const leakContent = Buffer.from("CANARY_HOST_SECRET_LEAK=12345");
    IsolationBrokerService.quarantineImport(testRoot, "leaked.txt", leakContent);
    const leakedExport = IsolationBrokerService.quarantineExport(testRoot, "leaked.txt");
    assert.equal(leakedExport.passedScan, false, "Artifact containing canary secret pattern must fail scan");
  } finally {
    try {
      fs.rmSync(testRoot, { recursive: true, force: true });
    } catch {}
  }
});

test("full Stage 10 HTTP workflow: diagnostics, path validation, qualify, list and get qualifications", async (t) => {
  const base = await serve(t, createTestApp());
  const { cookie, csrfToken } = await createAuthenticatedSession(base);

    // 1. GET /api/v1/isolation/diagnostics
    const diagRes = await request(base, "/api/v1/isolation/diagnostics", {
      headers: { Cookie: cookie },
    });
    assert.equal(diagRes.status, 200);
    const diagBody = await diagRes.json();
    assert.ok(diagBody.data.diagnostics);
    assert.ok(typeof diagBody.data.diagnostics.isWindows === "boolean");

    // 2. POST /api/v1/isolation/validate-path (valid)
    const validPathRes = await request(base, "/api/v1/isolation/validate-path", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        workspaceRoot: process.cwd(),
        targetPath: "package.json",
      }),
    });
    assert.equal(validPathRes.status, 200);
    const validBody = await validPathRes.json();
    assert.equal(validBody.data.valid, true);

    // 3. POST /api/v1/isolation/validate-path (path traversal attack)
    const attackPathRes = await request(base, "/api/v1/isolation/validate-path", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        workspaceRoot: process.cwd(),
        targetPath: "../../Windows/System32/cmd.exe",
      }),
    });
    assert.equal(attackPathRes.status, 400);

    // 4. POST /api/v1/isolation/qualify
    const qualifyRes = await request(base, "/api/v1/isolation/qualify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({ runnerVersion: "1.0.0" }),
    });
    assert.equal(qualifyRes.status, 201);
    const qualifyBody = await qualifyRes.json();
    const qual = qualifyBody.data.qualification;
    assert.ok(qual.id);
    assert.equal(qual.status, "passed");
    assert.equal(qual.digest.length, 64);
    assert.ok(Array.isArray(qual.adversarialResults));
    assert.equal(qual.adversarialResults.length, 7);
    assert.ok(qual.adversarialResults.every((r) => r.passed));

    // 5. GET /api/v1/isolation/qualifications
    const listRes = await request(base, "/api/v1/isolation/qualifications", {
      headers: { Cookie: cookie },
    });
    assert.equal(listRes.status, 200);
    const listBody = await listRes.json();
    assert.ok(Array.isArray(listBody.data.qualifications));
    assert.ok(listBody.data.qualifications.length >= 1);

    // 6. GET /api/v1/isolation/qualifications/:id
    const getRes = await request(base, `/api/v1/isolation/qualifications/${qual.id}`, {
      headers: { Cookie: cookie },
    });
    assert.equal(getRes.status, 200);
    const getBody = await getRes.json();
    assert.equal(getBody.data.qualification.id, qual.id);
    assert.equal(getBody.data.qualification.digest, qual.digest);

    // 7. GET /api/v1/capabilities includes isolation
    const capRes = await request(base, "/api/v1/capabilities", {
      headers: { Cookie: cookie },
    });
    assert.equal(capRes.status, 200);
    const capBody = await capRes.json();
    assert.ok(capBody.data.items.some((i) => i.name === "isolation" && i.state === "available"));
    assert.ok(capBody.data.items.some((i) => i.name === "execution" && i.state === "available"));
});
