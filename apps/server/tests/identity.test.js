import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { loadEnvironment } from "../server.js";
import { readRuntimeConfig } from "../foundation/runtimeConfig.js";
import { createLogger } from "../foundation/logger.js";
import { createDatabaseOwner, activateDatabaseOwner, query } from "../config/db.js";
import { createApp } from "../app.js";
import { createHealthController } from "../controllers/healthController.js";
import apiRoutes from "../routes/index.js";
import { stage03Admission } from "../foundation/admission.js";
import { generateLauncherChallenge, consumeLauncherChallenge } from "../services/launcherChallenge.js";
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

test("launcher challenge generates, validates and is strictly single-use", () => {
  const { challenge, clientNonce } = generateLauncherChallenge(60000);

  // Consume with invalid nonce fails
  assert.throws(
    () => consumeLauncherChallenge(challenge, "wrong-nonce"),
    /Invalid client nonce/
  );

  // Challenge should now be burned (single-use attempt)
  assert.throws(
    () => consumeLauncherChallenge(challenge, clientNonce),
    /Challenge not found or already used/
  );

  // New valid challenge
  const pair = generateLauncherChallenge(60000);
  assert.equal(consumeLauncherChallenge(pair.challenge, pair.clientNonce), true);

  // Replay fails
  assert.throws(
    () => consumeLauncherChallenge(pair.challenge, pair.clientNonce),
    /Challenge not found or already used/
  );
});

test("expired launcher challenge is rejected", () => {
  const { challenge, clientNonce } = generateLauncherChallenge(-1000); // already expired
  assert.throws(
    () => consumeLauncherChallenge(challenge, clientNonce),
    /Challenge has expired/
  );
});

test("Stage 03 HTTP workflow: bootstrap, authenticated session, workspaces, capabilities, and sign-out", async (t) => {
  const healthController = createHealthController({
    checkDatabase: () => owner.ready(),
    cleanExpiredLeases: async () => {},
  });

  const app = createApp({
    healthController,
    apiRoutes,
    auditContext: (req, res, next) => next(),
    rateLimiter: (req, res, next) => next(),
    allowedOrigins: ["http://127.0.0.1:5173"],
    logError: () => {},
    admission: stage03Admission,
  });

  const base = await serve(t, app);

  // 1. Unauthenticated request to /api/v1/session returns 401
  const unauthRes = await request(base, "/api/v1/session");
  assert.equal(unauthRes.status, 401);
  const unauthProb = await unauthRes.json();
  assert.equal(unauthProb.code, "UNAUTHENTICATED");

  // 2. Generate valid launcher challenge
  const { challenge, clientNonce } = generateLauncherChallenge(60000);

  // 3. POST /api/v1/session/bootstrap with challenge
  const bootstrapRes = await request(base, "/api/v1/session/bootstrap", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ challenge, clientNonce }),
  });

  assert.equal(bootstrapRes.status, 200, "Bootstrap must succeed with 200");
  const bootstrapBody = await bootstrapRes.json();
  assert.ok(bootstrapBody.data.principalId, "Must return principalId");
  assert.ok(bootstrapBody.data.workspaceId, "Must return workspaceId");
  assert.ok(bootstrapBody.data.csrfToken, "Must return csrfToken");

  const setCookie = bootstrapRes.headers.get("set-cookie");
  assert.ok(setCookie && setCookie.includes("asi_session="), "Must set asi_session cookie");

  const cookieVal = setCookie.split(";")[0];
  const csrfToken = bootstrapBody.data.csrfToken;

  // 4. Replay of same bootstrap challenge returns 401 ALREADY_USED
  const replayRes = await request(base, "/api/v1/session/bootstrap", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ challenge, clientNonce }),
  });
  assert.equal(replayRes.status, 401);

  // 5. GET /api/v1/session with valid cookie
  const sessionRes = await request(base, "/api/v1/session", {
    headers: { Cookie: cookieVal },
  });
  assert.equal(sessionRes.status, 200);
  const sessionBody = await sessionRes.json();
  assert.equal(sessionBody.data.principalId, bootstrapBody.data.principalId);
  assert.equal(sessionBody.data.workspaceId, bootstrapBody.data.workspaceId);

  // 6. GET /api/v1/workspaces with valid cookie
  const wsRes = await request(base, "/api/v1/workspaces", {
    headers: { Cookie: cookieVal },
  });
  assert.equal(wsRes.status, 200);
  const wsBody = await wsRes.json();
  assert.ok(Array.isArray(wsBody.data), "Workspaces must be an array");
  assert.ok(wsBody.data.length >= 1, "Must contain at least 1 workspace");

  // 7. GET /api/v1/capabilities with valid cookie
  const capRes = await request(base, "/api/v1/capabilities", {
    headers: { Cookie: cookieVal },
  });
  assert.equal(capRes.status, 200);
  const capBody = await capRes.json();
  assert.ok(Array.isArray(capBody.data.items), "Capabilities items must be an array");
  assert.ok(capBody.data.items.some(i => i.name === "identity" && i.state === "available"));

  // 8. DELETE /api/v1/session without CSRF token returns 403
  const noCsrfRes = await request(base, "/api/v1/session", {
    method: "DELETE",
    headers: { Cookie: cookieVal },
  });
  assert.equal(noCsrfRes.status, 403, "Mutation without CSRF must return 403");

  // 9. DELETE /api/v1/session with wrong CSRF token returns 403
  const badCsrfRes = await request(base, "/api/v1/session", {
    method: "DELETE",
    headers: { Cookie: cookieVal, "x-csrf-token": "wrong-csrf-token" },
  });
  assert.equal(badCsrfRes.status, 403, "Mutation with invalid CSRF must return 403");

  // 10. DELETE /api/v1/session with correct CSRF token returns 204
  const logoutRes = await request(base, "/api/v1/session", {
    method: "DELETE",
    headers: { Cookie: cookieVal, "x-csrf-token": csrfToken },
  });
  assert.equal(logoutRes.status, 204, "Sign-out must return 204 No Content");

  // 11. Subsequent GET /api/v1/session returns 401 because session is revoked
  const revokedRes = await request(base, "/api/v1/session", {
    headers: { Cookie: cookieVal },
  });
  assert.equal(revokedRes.status, 401, "Revoked session must be denied with 401");

  // Cleanup: delete this test session from auth_sessions
  if (bootstrapBody.data.sessionId) {
    await query("DELETE FROM auth_sessions WHERE id = $1", [bootstrapBody.data.sessionId]);
  }
});
