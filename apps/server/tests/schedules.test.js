// @ts-check
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { loadEnvironment } from "../server.js";
import { readRuntimeConfig } from "../foundation/runtimeConfig.js";
import { createLogger } from "../foundation/logger.js";
import { createDatabaseOwner, activateDatabaseOwner, query } from "../config/db.js";
import { createApp } from "../app.js";
import { createHealthController } from "../controllers/healthController.js";
import apiRoutes from "../routes/index.js";
import { stage15Admission } from "../foundation/admission.js";
import { generateLauncherChallenge } from "../services/launcherChallenge.js";
import { ProjectService } from "../services/projectService.js";
import { AutomationService } from "../services/automationService.js";
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
    admission: stage15Admission,
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

test("Stage 15: Schedules and Signed Events", async (t) => {
  const base = await serve(t, createTestApp());
  const { cookie, csrfToken, workspaceId } = await createAuthenticatedSession(base);

  const project = await ProjectService.createProject({
    workspaceId,
    name: "Automation Test Project",
    primaryPath: "C:\\Workspace\\AutomationTest",
  });
  const projectId = project.id;

  let scheduleId = "";
  let triggerId = "";
  let triggerSecretToken = "";
  let notificationId = "";

  // ==========================================
  // 1. Authentication & CSRF
  // ==========================================

  await t.test("unauthenticated POST /api/v1/projects/:projectId/schedules returns 401", async () => {
    const res = await request(base, `/api/v1/projects/${projectId}/schedules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        goalTemplate: { intent: "Nightly regression suite" },
        recurrence: "0 0 * * *",
        budgetCeilingMicroUsd: 500000,
      }),
    });
    assert.equal(res.status, 401);
  });

  await t.test("POST /api/v1/projects/:projectId/schedules without CSRF token returns 403", async () => {
    const res = await request(base, `/api/v1/projects/${projectId}/schedules`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
      },
      body: JSON.stringify({
        goalTemplate: { intent: "Nightly regression suite" },
        recurrence: "0 0 * * *",
        budgetCeilingMicroUsd: 500000,
      }),
    });
    assert.equal(res.status, 403);
  });

  await t.test("POST /api/v1/projects/:projectId/schedules/preview without CSRF token returns 403", async () => {
    const res = await request(base, `/api/v1/projects/${projectId}/schedules/preview`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
      },
      body: JSON.stringify({
        expression: "0 9 * * 1-5",
        timezone: "UTC",
      }),
    });
    assert.equal(res.status, 403);
  });

  await t.test("POST /api/v1/projects/:projectId/triggers without CSRF token returns 403", async () => {
    const res = await request(base, `/api/v1/projects/${projectId}/triggers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
      },
      body: JSON.stringify({
        source: "github",
        goalTemplate: { intent: "CI Trigger" },
      }),
    });
    assert.equal(res.status, 403);
  });

  // ==========================================
  // 2. Recurrence Preview & Timezones
  // ==========================================

  await t.test("POST /api/v1/projects/:projectId/schedules/preview with valid cron returns next 5 occurrences", async () => {
    const res = await request(base, `/api/v1/projects/${projectId}/schedules/preview`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        expression: "0 9 * * 1-5",
        timezone: "America/New_York",
        misfirePolicy: "skip",
        overlapPolicy: "skip",
      }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.normalizedRecurrence, "0 9 * * 1-5");
    assert.equal(body.data.nextOccurrences.length, 5);
  });

  await t.test("POST /api/v1/projects/:projectId/schedules/preview with invalid cron expression returns 400 INVALID_RECURRENCE", async () => {
    const res = await request(base, `/api/v1/projects/${projectId}/schedules/preview`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        expression: "invalid expression * * *",
        timezone: "UTC",
      }),
    });
    assert.equal(res.status, 400);
  });

  await t.test("POST /api/v1/projects/:projectId/schedules/preview with invalid timezone returns 400 AMBIGUOUS_TIME", async () => {
    const res = await request(base, `/api/v1/projects/${projectId}/schedules/preview`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        expression: "0 0 * * *",
        timezone: "Invalid/Fake_Zone",
      }),
    });
    assert.equal(res.status, 400);
  });

  // ==========================================
  // 3. Schedule Lifecycle
  // ==========================================

  await t.test("POST /api/v1/projects/:projectId/schedules with missing budget ceiling returns 400 BUDGET_REQUIRED", async () => {
    const res = await request(base, `/api/v1/projects/${projectId}/schedules`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        goalTemplate: { intent: "Nightly regression suite" },
        recurrence: "0 0 * * *",
        timezone: "UTC",
      }),
    });
    assert.equal(res.status, 400);
  });

  await t.test("POST /api/v1/projects/:projectId/schedules creates schedule (201 Created)", async () => {
    const res = await request(base, `/api/v1/projects/${projectId}/schedules`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        goalTemplate: { intent: "Nightly build and test", autonomyMode: "guarded" },
        recurrence: "0 2 * * *",
        timezone: "UTC",
        misfirePolicy: "latest",
        overlapPolicy: "queue_one",
        budgetCeilingMicroUsd: 1000000,
      }),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.ok(body.data.id);
    assert.equal(body.data.recurrence, "0 2 * * *");
    assert.equal(body.data.paused, false);
    assert.equal(body.data.budgetCeilingMicroUsd, 1000000);
    scheduleId = body.data.id;
  });

  await t.test("GET /api/v1/projects/:projectId/schedules lists schedules", async () => {
    const res = await request(base, `/api/v1/projects/${projectId}/schedules`, {
      method: "GET",
      headers: { Cookie: cookie },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.some(s => s.id === scheduleId));
  });

  await t.test("PATCH /api/v1/schedules/:scheduleId updates schedule", async () => {
    const res = await request(base, `/api/v1/schedules/${scheduleId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        recurrence: "0 3 * * *",
        overlapPolicy: "parallel",
      }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.recurrence, "0 3 * * *");
    assert.equal(body.data.overlapPolicy, "parallel");
  });

  await t.test("POST /api/v1/schedules/:scheduleId/pause pauses schedule", async () => {
    const res = await request(base, `/api/v1/schedules/${scheduleId}/pause`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({ reason: "Manual maintenance" }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.paused, true);
    assert.equal(body.data.pauseReason, "Manual maintenance");
  });

  await t.test("POST /api/v1/schedules/:scheduleId/resume resumes schedule", async () => {
    const res = await request(base, `/api/v1/schedules/${scheduleId}/resume`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({ misfirePolicy: "skip" }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.paused, false);
    assert.equal(body.data.pauseReason, null);
  });

  // ==========================================
  // 4. Occurrence Claims & Overlap Handling
  // ==========================================

  await t.test("claimDueOccurrences handles duplicate prevention and records occurrence", async () => {
    // Manually set next_fire_at in the past so it becomes due
    await query("UPDATE automation.schedules SET next_fire_at = NOW() - INTERVAL '5 minutes' WHERE id = $1", [scheduleId]);

    const claimed = await AutomationService.claimDueOccurrences({ limit: 5 });
    assert.ok(claimed.length > 0);
    assert.equal(claimed[0].scheduleId, scheduleId);
    assert.equal(claimed[0].state, "running");

    // Second immediate claim finds no due schedules (it advanced next_fire_at into future)
    const claimedAgain = await AutomationService.claimDueOccurrences({ limit: 5 });
    assert.equal(claimedAgain.length, 0);
  });

  await t.test("GET /api/v1/schedules/:scheduleId/occurrences lists occurrences", async () => {
    const res = await request(base, `/api/v1/schedules/${scheduleId}/occurrences`, {
      method: "GET",
      headers: { Cookie: cookie },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length >= 1);
  });

  // ==========================================
  // 5. Triggers & Inbound Signed Webhooks
  // ==========================================

  await t.test("POST /api/v1/projects/:projectId/triggers rejects unsupported source with 400 SOURCE_UNSUPPORTED", async () => {
    const res = await request(base, `/api/v1/projects/${projectId}/triggers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        source: "unsupported_external_sms",
        goalTemplate: { intent: "SMS trigger" },
      }),
    });
    assert.equal(res.status, 400);
  });

  await t.test("POST /api/v1/projects/:projectId/triggers creates trigger and generates secret token (201 Created)", async () => {
    const res = await request(base, `/api/v1/projects/${projectId}/triggers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        source: "github",
        eventFilter: { event: "push", branch: "main" },
        goalTemplate: { intent: "Verify main push", autonomyMode: "guarded" },
      }),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.ok(body.data.id);
    assert.ok(body.data.secretToken);
    triggerId = body.data.id;
    triggerSecretToken = body.data.secretToken;
  });

  await t.test("GET /api/v1/projects/:projectId/triggers lists triggers", async () => {
    const res = await request(base, `/api/v1/projects/${projectId}/triggers`, {
      method: "GET",
      headers: { Cookie: cookie },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.some(t => t.id === triggerId));
  });

  await t.test("PATCH /api/v1/triggers/:triggerId updates trigger", async () => {
    const res = await request(base, `/api/v1/triggers/${triggerId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        enabled: true,
        eventFilter: { event: "push", branch: "release" },
      }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.eventFilter.branch, "release");
  });

  await t.test("POST /api/v1/webhooks/:triggerId rejects missing/invalid signature with 400 SIGNATURE_INVALID", async () => {
    const res = await request(base, `/api/v1/webhooks/${triggerId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-signature-sha256": "bad_signature_hash",
        "x-delivery-id": "deliv-12345",
      },
      body: JSON.stringify({ event: "push", branch: "release" }),
    });
    assert.equal(res.status, 400);
  });

  await t.test("POST /api/v1/webhooks/:triggerId accepts valid signed webhook without CSRF (202 Accepted)", async () => {
    const payload = JSON.stringify({ event: "push", branch: "release", commit: "abcdef123456" });
    const signature = crypto.createHmac("sha256", triggerSecretToken).update(payload).digest("hex");

    const res = await request(base, `/api/v1/webhooks/${triggerId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-signature-sha256": `sha256=${signature}`,
        "x-delivery-id": "deliv-unique-001",
      },
      body: payload,
    });
    assert.equal(res.status, 202);
    const body = await res.json();
    assert.equal(body.accepted, true);
    assert.equal(body.deliveryId, "deliv-unique-001");
  });

  await t.test("POST /api/v1/webhooks/:triggerId rejects duplicate delivery ID with 409 REPLAY_REJECTED", async () => {
    const payload = JSON.stringify({ event: "push", branch: "release", commit: "abcdef123456" });
    const signature = crypto.createHmac("sha256", triggerSecretToken).update(payload).digest("hex");

    const res = await request(base, `/api/v1/webhooks/${triggerId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-signature-sha256": `sha256=${signature}`,
        "x-delivery-id": "deliv-unique-001", // Duplicate!
      },
      body: payload,
    });
    assert.equal(res.status, 409);
  });

  await t.test("GET /api/v1/projects/:projectId/events lists inbound webhook events", async () => {
    const res = await request(base, `/api/v1/projects/${projectId}/events`, {
      method: "GET",
      headers: { Cookie: cookie },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.some(e => e.deliveryId === "deliv-unique-001"));
  });

  // ==========================================
  // 6. Activity Stream & Notifications
  // ==========================================

  await t.test("GET /api/v1/activity lists recorded activity items", async () => {
    const res = await request(base, `/api/v1/activity?projectId=${projectId}`, {
      method: "GET",
      headers: { Cookie: cookie },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length >= 1);
  });

  await t.test("GET /api/v1/notifications lists notifications", async () => {
    const res = await request(base, `/api/v1/notifications`, {
      method: "GET",
      headers: { Cookie: cookie },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length >= 1);
    notificationId = body.data[0].id;
  });

  await t.test("POST /api/v1/notifications/:notificationId/read marks notification as read", async () => {
    const res = await request(base, `/api/v1/notifications/${notificationId}/read`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.state, "read");
    assert.ok(body.data.readAt);
  });

  // ==========================================
  // 7. Capabilities & Fail-Closed Admission
  // ==========================================

  await t.test("capabilities projection reports schedules, triggers, events, activity, notifications as available", () => {
    const caps = getCapabilities();
    const scheduleCap = caps.items.find(c => c.name === "schedules");
    const triggerCap = caps.items.find(c => c.name === "triggers");
    const eventCap = caps.items.find(c => c.name === "events");
    const actCap = caps.items.find(c => c.name === "activity");
    const notifCap = caps.items.find(c => c.name === "notifications");

    assert.equal(scheduleCap?.state, "available");
    assert.equal(triggerCap?.state, "available");
    assert.equal(eventCap?.state, "available");
    assert.equal(actCap?.state, "available");
    assert.equal(notifCap?.state, "available");
  });

  await t.test("Stage 15 Admission allows Stage 15 routes & denies unqualified Stage 16+ routes with 503", async () => {
    // Stage 15 route allowed
    const schedRes = await request(base, `/api/v1/projects/${projectId}/schedules`, {
      method: "GET",
      headers: { Cookie: cookie },
    });
    assert.notEqual(schedRes.status, 503);

    // Unqualified Stage 16 deployment route denied
    const unqualRes = await request(base, `/api/v1/runs/00000000-0000-0000-0000-000000000001/deployments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({}),
    });
    assert.equal(unqualRes.status, 503);
  });
});
