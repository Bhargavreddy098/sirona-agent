// @ts-check
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { loadEnvironment } from "../server.js";
import { readRuntimeConfig } from "../foundation/runtimeConfig.js";
import { createLogger } from "../foundation/logger.js";
import { createDatabaseOwner, activateDatabaseOwner } from "../config/db.js";
import { createApp } from "../app.js";
import { createHealthController } from "../controllers/healthController.js";
import apiRoutes from "../routes/index.js";
import { stage17Admission } from "../foundation/admission.js";
import { generateLauncherChallenge } from "../services/launcherChallenge.js";
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
  const cookie = bootstrapRes.headers.get("set-cookie").split(";")[0];
  const bootstrapBody = await bootstrapRes.json();
  const csrfToken = bootstrapBody.data.csrfToken;
  const workspaceId = bootstrapBody.data.workspaceId;
  const principalId = bootstrapBody.data.principalId;
  return { cookie, csrfToken, workspaceId, principalId };
}

test("Stage 17: Windows V1 Release and Recovery Qualification", async (t) => {
  const base = await serve(t, createTestApp());
  const { cookie, csrfToken } = await createAuthenticatedSession(base);

  let checkpointId = "";
  let rehearsalId = "";

  // ==========================================
  // 1. Authentication & CSRF
  // ==========================================

  await t.test("unauthenticated GET /api/v1/system/release returns 401", async () => {
    const res = await request(base, "/api/v1/system/release", {
      method: "GET",
    });
    assert.equal(res.status, 401);
  });

  await t.test("POST /api/v1/system/recovery/checkpoints without CSRF token returns 403", async () => {
    const res = await request(base, "/api/v1/system/recovery/checkpoints", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
      },
      body: JSON.stringify({ checkpointKind: "full_backup" }),
    });
    assert.equal(res.status, 403);
  });

  // ==========================================
  // 2. Release Manifest Verification
  // ==========================================

  await t.test("GET /api/v1/system/release returns active published release manifest", async () => {
    const res = await request(base, "/api/v1/system/release?channel=stable", {
      method: "GET",
      headers: { Cookie: cookie },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.data.id);
    assert.equal(body.data.version, "1.0.0");
    assert.equal(body.data.channel, "stable");
    assert.equal(body.data.targetArch, "x64");
    assert.equal(body.data.updateStatus, "up_to_date");
    assert.equal(body.data.verified, true);
    assert.ok(body.data.releaseDigest);
  });

  await t.test("GET /api/v1/system/release with unknown channel returns 404 RELEASE_NOT_FOUND", async () => {
    const res = await request(base, "/api/v1/system/release?channel=nonexistent_channel", {
      method: "GET",
      headers: { Cookie: cookie },
    });
    assert.equal(res.status, 404);
  });

  // ==========================================
  // 3. Disaster Recovery Checkpoints Lifecycle
  // ==========================================

  await t.test("POST /api/v1/system/recovery/checkpoints with invalid kind returns 400 INVALID_CHECKPOINT_KIND", async () => {
    const res = await request(base, "/api/v1/system/recovery/checkpoints", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({ checkpointKind: "unsupported_kind" }),
    });
    assert.equal(res.status, 400);
  });

  await t.test("POST /api/v1/system/recovery/checkpoints creates durable backup checkpoint (201 Created)", async () => {
    const res = await request(base, "/api/v1/system/recovery/checkpoints", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        checkpointKind: "full_backup",
        metadata: { trigger: "pre_release_qualification" },
      }),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.ok(body.data.id);
    assert.equal(body.data.checkpointKind, "full_backup");
    assert.ok(body.data.storageRef);
    assert.equal(body.data.checksum.length, 64);
    assert.ok(body.data.sizeBytes > 0);
    assert.equal(body.data.verified, true);
    checkpointId = body.data.id;
  });

  await t.test("GET /api/v1/system/recovery/checkpoints lists recovery checkpoints", async () => {
    const res = await request(base, "/api/v1/system/recovery/checkpoints?limit=5", {
      method: "GET",
      headers: { Cookie: cookie },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length >= 1);
  });

  await t.test("GET /api/v1/system/recovery/checkpoints/:checkpointId retrieves exact checkpoint", async () => {
    const res = await request(base, `/api/v1/system/recovery/checkpoints/${checkpointId}`, {
      method: "GET",
      headers: { Cookie: cookie },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.id, checkpointId);
    assert.equal(body.data.checkpointKind, "full_backup");
  });

  await t.test("GET /api/v1/system/recovery/checkpoints/:checkpointId for non-existent returns 404", async () => {
    const res = await request(base, `/api/v1/system/recovery/checkpoints/00000000-0000-0000-0000-000000000000`, {
      method: "GET",
      headers: { Cookie: cookie },
    });
    assert.equal(res.status, 404);
  });

  // ==========================================
  // 4. Disaster Recovery Restore Rehearsal & Verification
  // ==========================================

  await t.test("POST /api/v1/system/recovery/checkpoints/:checkpointId/rehearsal with corruption returns 400 RECOVERY_INTEGRITY_FAILED", async () => {
    const res = await request(base, `/api/v1/system/recovery/checkpoints/${checkpointId}/rehearsal`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({ simulateCorruption: true }),
    });
    assert.equal(res.status, 400);
  });

  await t.test("POST /api/v1/system/recovery/checkpoints/:checkpointId/rehearsal verifies restore with RTO/RPO metrics (201 Created)", async () => {
    const res = await request(base, `/api/v1/system/recovery/checkpoints/${checkpointId}/rehearsal`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.ok(body.data.id);
    assert.equal(body.data.checkpointId, checkpointId);
    assert.equal(body.data.rehearsalStatus, "verified");
    assert.ok(body.data.rtoSeconds > 0);
    assert.equal(body.data.rpoSeconds, 0.0);
    assert.ok(body.data.recoveryEvidence);
    assert.equal(body.data.recoveryEvidence.zeroDataLossVerified, true);
    assert.ok(body.data.recoveryEvidence.evidenceDigest);
    rehearsalId = body.data.id;
  });

  await t.test("GET /api/v1/system/recovery/rehearsals/:rehearsalId retrieves verified rehearsal record", async () => {
    const res = await request(base, `/api/v1/system/recovery/rehearsals/${rehearsalId}`, {
      method: "GET",
      headers: { Cookie: cookie },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.id, rehearsalId);
    assert.equal(body.data.rehearsalStatus, "verified");
  });

  // ==========================================
  // 5. Data Retention & Quota Purge
  // ==========================================

  await t.test("POST /api/v1/system/maintenance/purge with dryRun=true simulates retention purge", async () => {
    const res = await request(base, "/api/v1/system/maintenance/purge", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({ dryRun: true }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.data.id);
    assert.equal(body.data.jobKind, "dry_run_purge");
    assert.equal(body.data.status, "completed");
  });

  await t.test("POST /api/v1/system/maintenance/purge executes purge job and records telemetry", async () => {
    const res = await request(base, "/api/v1/system/maintenance/purge", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({ dryRun: false }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.data.id);
    assert.equal(body.data.jobKind, "retention_purge");
    assert.equal(body.data.status, "completed");
  });

  // ==========================================
  // 6. Operational Diagnostics & Sanitization
  // ==========================================

  await t.test("GET /api/v1/system/diagnostics returns sanitized operational diagnostics without secret leakage", async () => {
    const res = await request(base, "/api/v1/system/diagnostics", {
      method: "GET",
      headers: { Cookie: cookie },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.status, "healthy");
    assert.ok(body.data.platform.os);
    assert.ok(body.data.platform.arch);
    assert.ok(body.data.process.rssMb > 0);
    assert.ok(body.data.storage.databaseSizeBytes > 0);
    assert.ok(body.data.quotas.max_storage_mb);
    assert.equal(body.data.security.zeroSecretDisclosure, true);
    assert.equal(body.data.security.hostSecretsQuarantined, true);
  });

  // ==========================================
  // 7. Capabilities & Fail-Closed Admission
  // ==========================================

  await t.test("capabilities projection reports release_recovery and operational_diagnostics as available", () => {
    const caps = getCapabilities();
    const recCap = caps.items.find(c => c.name === "release_recovery");
    const diagCap = caps.items.find(c => c.name === "operational_diagnostics");
    assert.equal(recCap?.state, "available");
    assert.equal(diagCap?.state, "available");
  });

  await t.test("Stage 17 Admission allows Stage 17 routes & denies unqualified Stage 18+ routes with 503", async () => {
    // Stage 17 route allowed
    const diagRes = await request(base, `/api/v1/system/diagnostics`, {
      method: "GET",
      headers: { Cookie: cookie },
    });
    assert.notEqual(diagRes.status, 503);

    // Unqualified future Stage 18 route denied
    const unqualRes = await request(base, `/api/v1/remote-workers`, {
      method: "GET",
      headers: { Cookie: cookie },
    });
    assert.equal(unqualRes.status, 503);
  });
});
