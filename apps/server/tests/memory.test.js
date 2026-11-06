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
import { stage14Admission } from "../foundation/admission.js";
import { generateLauncherChallenge } from "../services/launcherChallenge.js";
import { ProjectService } from "../services/projectService.js";
import { MemoryService } from "../services/memoryService.js";
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
    admission: stage14Admission,
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

test("Stage 14: Memory and Project Intelligence", async (t) => {
  const base = await serve(t, createTestApp());
  const { cookie, csrfToken, workspaceId } = await createAuthenticatedSession(base);

  // Setup test projects A and B
  const projectA = await ProjectService.createProject({
    workspaceId,
    name: "Memory Test Project A",
    primaryPath: "C:\\Workspace\\MemoryTestA",
  });
  const projAId = projectA.id;

  const projectB = await ProjectService.createProject({
    workspaceId,
    name: "Memory Test Project B",
    primaryPath: "C:\\Workspace\\MemoryTestB",
  });
  const projBId = projectB.id;

  // ==========================================
  // 1. Authentication & CSRF
  // ==========================================

  await t.test("unauthenticated POST /api/v1/projects/:projectId/memories returns 401", async () => {
    const res = await request(base, `/api/v1/projects/${projAId}/memories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memoryKind: "project", title: "Test", content: "Details" }),
    });
    assert.equal(res.status, 401);
  });

  await t.test("POST /api/v1/projects/:projectId/memories without CSRF token returns 403", async () => {
    const res = await request(base, `/api/v1/projects/${projAId}/memories`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
      },
      body: JSON.stringify({ memoryKind: "project", title: "Test", content: "Details" }),
    });
    assert.equal(res.status, 403);
  });

  await t.test("DELETE /api/v1/memories/:memoryId without CSRF token returns 403", async () => {
    const res = await request(base, `/api/v1/memories/00000000-0000-0000-0000-000000000000`, {
      method: "DELETE",
      headers: { Cookie: cookie },
    });
    assert.equal(res.status, 403);
  });

  // ==========================================
  // 2. Input & Scope Validations
  // ==========================================

  await t.test("POST /api/v1/projects/:projectId/memories with non-existent project returns 404", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await request(base, `/api/v1/projects/${fakeId}/memories`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({ memoryKind: "project", title: "Test", content: "Details" }),
    });
    assert.equal(res.status, 404);
  });

  await t.test("POST /api/v1/projects/:projectId/memories with invalid memoryKind returns 400", async () => {
    const res = await request(base, `/api/v1/projects/${projAId}/memories`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({ memoryKind: "invalid_kind", title: "Test", content: "Details" }),
    });
    assert.equal(res.status, 400);
  });

  await t.test("POST /api/v1/projects/:projectId/memories with missing content returns 400", async () => {
    const res = await request(base, `/api/v1/projects/${projAId}/memories`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({ memoryKind: "decision", title: "Missing content" }),
    });
    assert.equal(res.status, 400);
  });

  // ==========================================
  // 3. Memory Creation, Revisions, and Retrieval
  // ==========================================

  let createdMemoryId;

  await t.test("POST /api/v1/projects/:projectId/memories creates memory and initial revision (201 Created)", async () => {
    const res = await request(base, `/api/v1/projects/${projAId}/memories`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        memoryKind: "decision",
        title: "Use PostgreSQL for durable event outbox",
        content: "We decided to use PostgreSQL 17 transaction outbox rather than an external queue broker.",
        confidence: 0.95,
        sourceRefs: [{ type: "adr", id: "ADR-007" }],
        metadata: { rationale: "acid-compliance" },
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.ok(body.data.id);
    assert.equal(body.data.memoryKind, "decision");
    assert.equal(body.data.title, "Use PostgreSQL for durable event outbox");
    assert.equal(body.data.revision, 1);
    assert.ok(body.data.contentDigest);
    assert.equal(body.data.confidence, 0.95);
    createdMemoryId = body.data.id;
  });

  await t.test("GET /api/v1/projects/:projectId/memories lists memories for project", async () => {
    const res = await request(base, `/api/v1/projects/${projAId}/memories`, {
      method: "GET",
      headers: { Cookie: cookie },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.data.memories));
    assert.ok(body.data.memories.length >= 1);
    assert.ok(body.data.memories.some(m => m.id === createdMemoryId));
  });

  await t.test("GET /api/v1/memories/:memoryId returns single memory and its revisions", async () => {
    const res = await request(base, `/api/v1/memories/${createdMemoryId}`, {
      method: "GET",
      headers: { Cookie: cookie },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.memory.id, createdMemoryId);
    assert.equal(body.data.memory.revision, 1);
    assert.ok(Array.isArray(body.data.revisions));
    assert.equal(body.data.revisions.length, 1);
    assert.equal(body.data.revisions[0].revision, 1);
  });

  await t.test("POST /api/v1/memories/:memoryId/revisions creates revision 2 and updates memory", async () => {
    const res = await request(base, `/api/v1/memories/${createdMemoryId}/revisions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        content: "Updated: We decided on PostgreSQL 17 outbox with LISTEN/NOTIFY and 50ms heartbeat.",
        confidence: 0.99,
        correctionReason: "Clarified heartbeat mechanism",
      }),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.data.revision, 2);
    assert.equal(body.data.confidence, 0.99);

    // Verify GET returns both revisions
    const getRes = await request(base, `/api/v1/memories/${createdMemoryId}`, {
      method: "GET",
      headers: { Cookie: cookie },
    });
    const getBody = await getRes.json();
    assert.equal(getBody.data.memory.revision, 2);
    assert.equal(getBody.data.revisions.length, 2);
    assert.equal(getBody.data.revisions[0].revision, 2);
    assert.equal(getBody.data.revisions[1].revision, 1);
  });

  // ==========================================
  // 4. Memory Tombstoning / Deletion
  // ==========================================

  let tombstoneMemoryId;

  await t.test("DELETE /api/v1/memories/:memoryId tombstones memory immediately", async () => {
    // Create temporary memory to delete
    const tempMem = await MemoryService.createMemory(projAId, {
      memoryKind: "failure",
      title: "Transient network flake",
      content: "Socket reset during test setup",
    });
    tombstoneMemoryId = tempMem.id;

    const delRes = await request(base, `/api/v1/memories/${tombstoneMemoryId}`, {
      method: "DELETE",
      headers: {
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
    });
    assert.equal(delRes.status, 200);
    const body = await delRes.json();
    assert.equal(body.data.deleted, true);
    assert.ok(body.data.deletedAt);

    // Default GET returns 404 for tombstoned memory
    const getRes = await request(base, `/api/v1/memories/${tombstoneMemoryId}`, {
      method: "GET",
      headers: { Cookie: cookie },
    });
    assert.equal(getRes.status, 404);

    // GET with includeDeleted=true returns tombstoned memory
    const getIncRes = await request(base, `/api/v1/memories/${tombstoneMemoryId}?includeDeleted=true`, {
      method: "GET",
      headers: { Cookie: cookie },
    });
    assert.equal(getIncRes.status, 200);
    const incBody = await getIncRes.json();
    assert.ok(incBody.data.memory.deletedAt);
  });

  await t.test("double DELETE /api/v1/memories/:memoryId returns 409 STATE_CONFLICT", async () => {
    const delRes = await request(base, `/api/v1/memories/${tombstoneMemoryId}`, {
      method: "DELETE",
      headers: {
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
    });
    assert.equal(delRes.status, 409);
  });

  // ==========================================
  // 5. Lexical & Hybrid Retrieval with Scope Isolation
  // ==========================================

  await t.test("POST /api/v1/projects/:projectId/memory-search finds matches lexically", async () => {
    const res = await request(base, `/api/v1/projects/${projAId}/memory-search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        query: "heartbeat outbox",
      }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.data.items.length >= 1);
    assert.equal(body.data.items[0].memoryId, createdMemoryId);
    assert.ok(body.data.items[0].score > 0);
  });

  await t.test("Cross-project isolation: search in Project B returns zero Project A results", async () => {
    const res = await request(base, `/api/v1/projects/${projBId}/memory-search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        query: "heartbeat outbox",
      }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.items.length, 0);
  });

  await t.test("Tombstoned memories are excluded from search results", async () => {
    const res = await request(base, `/api/v1/projects/${projAId}/memory-search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        query: "Transient network flake",
      }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(!body.data.items.some(i => i.memoryId === tombstoneMemoryId));
  });

  // ==========================================
  // 6. Project Intelligence & AST Knowledge Graph
  // ==========================================

  await t.test("POST /api/v1/projects/:projectId/knowledge-index parses code structures and indexes nodes/edges", async () => {
    const sampleFiles = [
      {
        path: "src/services/orderService.js",
        content: `
          import { db } from "../config/db.js";
          import express from "express";

          export async function createOrder(cartId, total) {
            return db.query("INSERT INTO orders (cart_id, total) VALUES ($1, $2)", [cartId, total]);
          }

          export class OrderProcessor {
            process() { return true; }
          }
        `,
      },
      {
        path: "src/routes/orderRoutes.js",
        content: `
          import { createOrder } from "../services/orderService.js";
          export function handleCreateOrder(req, res) {
            return createOrder(req.body.cartId, req.body.total);
          }
        `,
      },
    ];

    const res = await request(base, `/api/v1/projects/${projAId}/knowledge-index`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({ files: sampleFiles }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.indexedFiles, 2);
    assert.ok(body.data.indexedNodes >= 4);
    assert.ok(body.data.indexedEdges >= 2);
  });

  await t.test("GET /api/v1/projects/:projectId/knowledge/nodes lists extracted nodes", async () => {
    const res = await request(base, `/api/v1/projects/${projAId}/knowledge/nodes`, {
      method: "GET",
      headers: { Cookie: cookie },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.data.nodes.length >= 4);
    const fileNode = body.data.nodes.find(n => n.kind === "file" && n.name === "orderService.js");
    assert.ok(fileNode);
    const fnNode = body.data.nodes.find(n => n.kind === "symbol" && n.name === "createOrder");
    assert.ok(fnNode);
  });

  await t.test("GET /api/v1/projects/:projectId/knowledge/edges lists dependency edges", async () => {
    const res = await request(base, `/api/v1/projects/${projAId}/knowledge/edges`, {
      method: "GET",
      headers: { Cookie: cookie },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.data.edges.length >= 2);
    const definesEdge = body.data.edges.find(e => e.kind === "defines");
    assert.ok(definesEdge);
  });

  // ==========================================
  // 7. Capabilities & Fail-closed Admission
  // ==========================================

  await t.test("capabilities projection reports memory and knowledge as available in Stage 14", async () => {
    const caps = getCapabilities();
    const memCap = caps.items.find(i => i.name === "memory");
    const knowCap = caps.items.find(i => i.name === "knowledge");
    assert.ok(memCap);
    assert.equal(memCap.state, "available");
    assert.ok(knowCap);
    assert.equal(knowCap.state, "available");
  });

  await t.test("Stage 14 Admission allows Stage 14 routes & denies unqualified Stage 15+ routes with 503", async () => {
    // Stage 14 route allowed
    const memRes = await request(base, `/api/v1/projects/${projAId}/memories`, {
      method: "GET",
      headers: { Cookie: cookie },
    });
    assert.equal(memRes.status, 200);

    // Unqualified Stage 15 route (/api/v1/schedules) denied with 503
    const schedRes = await request(base, `/api/v1/schedules`, {
      method: "GET",
      headers: { Cookie: cookie },
    });
    assert.equal(schedRes.status, 503);
    const body = await schedRes.json();
    assert.equal(body.code, "CAPABILITY_UNAVAILABLE");
  });
});
