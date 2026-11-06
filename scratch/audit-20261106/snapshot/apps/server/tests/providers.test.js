import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { loadEnvironment } from "../server.js";
import { readRuntimeConfig } from "../foundation/runtimeConfig.js";
import { createLogger } from "../foundation/logger.js";
import { createDatabaseOwner, activateDatabaseOwner, query } from "../config/db.js";
import { createApp } from "../app.js";
import { createHealthController } from "../controllers/healthController.js";
import apiRoutes from "../routes/index.js";
import { stage06Admission } from "../foundation/admission.js";
import { generateLauncherChallenge } from "../services/launcherChallenge.js";
import { ProviderService } from "../services/providerService.js";
import { AIService } from "../services/aiService.js";
import { ProjectService } from "../services/projectService.js";
import { GovernanceService } from "../services/governanceService.js";
import { TurnLease } from "../model/TurnLease.js";
import { CredentialResolver } from "../dist-workspace/src/providers/credentialResolver.js";
import { serve, request } from "./helpers.js";

loadEnvironment();
const config = readRuntimeConfig(process.env);
const logger = createLogger(config);
let owner;

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
    admission: stage06Admission,
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

test("unauthenticated requests to /api/v1/models return 401", async (t) => {
  const base = await serve(t, createTestApp());
  const res = await request(base, "/api/v1/models", { method: "GET" });
  assert.equal(res.status, 401);
  const body = await res.json();
  assert.equal(body.code, "UNAUTHENTICATED");
});

test("authenticated GET /api/v1/models returns qualified models with pricing", async (t) => {
  const base = await serve(t, createTestApp());
  const { cookie } = await createAuthenticatedSession(base);

  const res = await request(base, "/api/v1/models", {
    method: "GET",
    headers: { Cookie: cookie },
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(Array.isArray(body.data.models));
  assert.ok(body.data.models.length >= 4);

  const geminiFlash = body.data.models.find((m) => m.id === "gemini-2.5-flash");
  assert.ok(geminiFlash, "gemini-2.5-flash model must exist");
  assert.equal(geminiFlash.provider, "google");
  assert.ok(geminiFlash.pricing.inputCostPerMillionMicroUsd > 0);
  assert.ok(geminiFlash.pricing.outputCostPerMillionMicroUsd > 0);
  assert.equal(typeof geminiFlash.hasConfiguredApiKey, "boolean");

  const gemini35FlashLite = body.data.models.find((m) => m.id === "gemini-3.5-flash-lite");
  assert.ok(gemini35FlashLite, "gemini-3.5-flash-lite model must exist");
  assert.equal(gemini35FlashLite.provider, "google");

  const gemini35Flash = body.data.models.find((m) => m.id === "gemini-3.5-flash");
  assert.ok(gemini35Flash, "gemini-3.5-flash model must exist");
  assert.equal(gemini35Flash.provider, "google");
});

test("POST /api/v1/models/verify requires authentication and CSRF token", async (t) => {
  const base = await serve(t, createTestApp());
  const { cookie } = await createAuthenticatedSession(base);

  // 1. Unauthenticated -> 401
  const unauthRes = await request(base, "/api/v1/models/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "google", apiKey: "test-key" }),
  });
  assert.equal(unauthRes.status, 401);

  // 2. Missing CSRF -> 403
  const noCsrfRes = await request(base, "/api/v1/models/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ kind: "google", apiKey: "test-key" }),
  });
  assert.equal(noCsrfRes.status, 403);
});

test("POST /api/v1/models/verify validates mandatory fields and OpenAI-compatible base URL", async (t) => {
  const base = await serve(t, createTestApp());
  const { cookie, csrfToken } = await createAuthenticatedSession(base);

  // 1. Missing apiKey -> 400
  const missingKeyRes = await request(base, "/api/v1/models/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify({ kind: "google" }),
  });
  assert.equal(missingKeyRes.status, 400);

  // 2. OpenAI-compatible missing baseUrl -> 400 BASE_URL_REQUIRED
  const missingUrlRes = await request(base, "/api/v1/models/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify({ kind: "openai_compatible", apiKey: "sk-fake-key" }),
  });
  assert.equal(missingUrlRes.status, 400);
  const urlBody = await missingUrlRes.json();
  assert.equal(urlBody.code, "INVALID_INPUT");

  // 3. Valid save persists connection
  const validRes = await request(base, "/api/v1/models/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify({
      kind: "openai_compatible",
      name: "Local vLLM",
      baseUrl: "http://127.0.0.1:8001/v1",
      apiKey: "sk-local-test",
    }),
  });
  assert.equal(validRes.status, 200);
  const validBody = await validRes.json();
  assert.equal(validBody.data.connection.kind, "openai_compatible");
  assert.equal(validBody.data.connection.base_url, "http://127.0.0.1:8001/v1");
});

test("POST /api/v1/conversations/:id/turns rejects without turn lease and rejects unconfigured API key (no fake responses)", async (t) => {
  const base = await serve(t, createTestApp());
  const { cookie, csrfToken, workspaceId } = await createAuthenticatedSession(base);

  // Create project & conversation
  const project = await ProjectService.createProject({
    workspaceId,
    name: "Turns Test Project",
    description: "Testing model turns",
  });
  const projId = /** @type {any} */ (project).id;

  const conversation = await ProjectService.createConversation(projId, {
    title: "Turns Conversation",
  });
  const convId = /** @type {any} */ (conversation).id;

  // 1. Missing turn lease -> 409 STATE_CONFLICT
  const noLeaseRes = await request(base, `/api/v1/conversations/${convId}/turns`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify({ prompt: "Hello Sirona", bypassCoordinator: true }),
  });
  assert.equal(noLeaseRes.status, 409);
  const noLeaseBody = await noLeaseRes.json();
  assert.equal(noLeaseBody.code, "STATE_CONFLICT");

  // 2. Acquire turn lease
  const lease1 = await TurnLease.acquire(convId, "test-runner", 30);
  assert.ok(lease1.acquired);

  // 3. Model turn with unconfigured key fails fast with 400 (NOT mock text)
  // Ensure we query a model without key (OPENAI_API_KEY is not configured in .env)
  await query("DELETE FROM provider_connections WHERE kind = 'openai'");
  const missingKeyRes = await request(base, `/api/v1/conversations/${convId}/turns`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify({ prompt: "Hello", modelId: "gpt-4o", bypassCoordinator: true }),
  });
  assert.equal(missingKeyRes.status, 400);
  const missingKeyBody = await missingKeyRes.json();
  assert.equal(missingKeyBody.code, "INVALID_INPUT");

  // Clean up lease
  await TurnLease.release(convId, "test-runner", lease1.token.generation);
});

test("ProviderService.executeTurn persists user + assistant messages, settles budget, and logs model_calls", async () => {
  // Create project, conversation, and budget account
  const project = await ProjectService.createProject({
    name: "Turn Settlement Project",
    description: "Testing turn settlement",
  });
  const projId = /** @type {any} */ (project).id;

  const conversation = await ProjectService.createConversation(projId, {
    title: "Settlement Conversation",
  });
  const convId = /** @type {any} */ (conversation).id;

  // Create budget account with $10 limit
  const budget = await GovernanceService.createOrUpdateBudget({
    scopeKind: "project",
    scopeId: projId,
    limitMicroUsd: 10000000,
  });

  // Acquire turn lease
  const lease = await TurnLease.acquire(convId, "agent-turn-worker", 30);
  assert.ok(lease.acquired);

  // Mock streamTurn temporarily on AIService to simulate live model stream without external network call
  const originalStreamTurn = AIService.streamTurn;
  let receivedTokens = [];
  /** @type {any} */ (AIService).streamTurn = async ({ onToken }) => {
    onToken("Hello ");
    onToken("world from Sirona!");
    return {
      content: "Hello world from Sirona!",
      reasoning: "Test inference passed",
      tool_calls: [],
      tokens: 6,
    };
  };

  // Configure a mock active provider connection so apiKey resolution succeeds
  const mockRef = CredentialResolver.storeCredential("test-key-mock");
  await query(
    `INSERT INTO provider_connections (kind, name, api_key_ciphertext, credential_ref, credential_status, is_active, updated_at)
     VALUES ('google', 'Test Google Connection', $1, $1, 'migrated', true, NOW())`,
    [mockRef]
  );

  try {
    const turnResult = await ProviderService.executeTurn({
      conversationId: convId,
      prompt: "Who are you?",
      modelId: "gemini-2.5-flash",
      onToken: (tok) => receivedTokens.push(tok),
    });

    assert.equal(turnResult.userMessage.role, "user");
    assert.equal(turnResult.userMessage.content, "Who are you?");
    assert.ok(turnResult.userMessage.id);

    assert.equal(turnResult.assistantMessage.role, "assistant");
    assert.equal(turnResult.assistantMessage.content, "Hello world from Sirona!");
    assert.ok(turnResult.assistantMessage.id);

    assert.ok(turnResult.usage.totalTokens >= 7);
    assert.ok(turnResult.usage.costMicroUsd >= 0);

    // Verify messages in DB
    const msgsRes = await query(
      "SELECT role, content, id FROM messages WHERE session_id = $1 ORDER BY created_at ASC, id ASC",
      [convId]
    );
    assert.equal(msgsRes.rows.length, 2);
    assert.equal(msgsRes.rows[0].role, "user");
    assert.equal(msgsRes.rows[1].role, "assistant");

    // Verify model_calls record
    const callsRes = await query(
      "SELECT * FROM model_calls WHERE session_id = $1",
      [convId]
    );
    assert.equal(callsRes.rows.length, 1);
    assert.equal(callsRes.rows[0].model_id, "gemini-2.5-flash");
    assert.equal(callsRes.rows[0].status, "success");

    // Verify budget account spent amount updated
    const updatedBudgetRes = await query(
      "SELECT spent_micro_usd FROM budget_accounts WHERE id = $1",
      [budget.id]
    );
    assert.equal(
      Number(updatedBudgetRes.rows[0].spent_micro_usd),
      turnResult.usage.costMicroUsd
    );
  } finally {
    // Restore original streamTurn and clean up
    AIService.streamTurn = originalStreamTurn;
    await TurnLease.release(convId, "agent-turn-worker", lease.token.generation);
    await query("DELETE FROM provider_connections WHERE name = 'Test Google Connection'");
  }
});

test("Stage 06 Admission rejects unqualified endpoints with 503", async (t) => {
  const base = await serve(t, createTestApp());
  const { cookie } = await createAuthenticatedSession(base);

  // DELETE on /api/v1/models is not admitted
  const deleteRes = await request(base, "/api/v1/models", {
    method: "DELETE",
    headers: { Cookie: cookie },
  });
  assert.equal(deleteRes.status, 503);
  const deleteBody = await deleteRes.json();
  assert.equal(deleteBody.code, "CAPABILITY_UNAVAILABLE");

  // Non-qualified legacy endpoint
  const legacyRes = await request(base, "/api/sessions/foo/turn", {
    method: "POST",
    headers: { Cookie: cookie },
  });
  assert.equal(legacyRes.status, 503);
});

test("POST /api/v1/models/verify with discover: true discovers models from endpoint and updates registry", async (t) => {
  const base = await serve(t, createTestApp());
  const { cookie, csrfToken } = await createAuthenticatedSession(base);

  // Spin up a mock OpenAI-compatible server
  const mockServer = http.createServer((req, res) => {
    if (req.url === "/v1/models") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        data: [
          { id: "custom-llama-3-8b", name: "Llama 3 8B" },
          { id: "custom-deepseek-coder", name: "DeepSeek Coder" },
        ]
      }));
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise((resolve) => mockServer.listen(0, "127.0.0.1", () => resolve(undefined)));
  const mockPort = /** @type {import('node:net').AddressInfo} */ (mockServer.address()).port;
  const mockBaseUrl = `http://127.0.0.1:${mockPort}/v1`;

  try {
    const res = await request(base, "/api/v1/models/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        kind: "openai_compatible",
        name: "Test Gateway",
        baseUrl: mockBaseUrl,
        apiKey: "sk-mock-key",
        discover: true,
      }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.count, 2);
    assert.ok(body.data.models.some((m) => m.id === "custom-llama-3-8b"));

    // Verify GET /api/v1/models includes the discovered models and active connection
    const getRes = await request(base, "/api/v1/models", {
      method: "GET",
      headers: { Cookie: cookie },
    });
    assert.equal(getRes.status, 200);
    const getBody = await getRes.json();
    assert.ok(getBody.data.models.some((m) => m.id === "custom-llama-3-8b"));
    assert.ok(getBody.data.connections.some((c) => c.kind === "openai_compatible"));
  } finally {
    mockServer.close();
    await query("DELETE FROM models WHERE id IN ('custom-llama-3-8b', 'custom-deepseek-coder')");
    await query("DELETE FROM provider_connections WHERE name = 'Test Gateway'");
  }
});

test("GET /api/v1/providers lists supported provider types and metadata", async (t) => {
  const base = await serve(t, createTestApp());
  const { cookie } = await createAuthenticatedSession(base);

  // 1. Unauthenticated -> 401
  const unauthRes = await request(base, "/api/v1/providers", { method: "GET" });
  assert.equal(unauthRes.status, 401);

  // 2. Authenticated -> 200
  const res = await request(base, "/api/v1/providers", {
    method: "GET",
    headers: { Cookie: cookie },
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(Array.isArray(body.data.providers));
  assert.ok(body.data.providers.length >= 4);

  const google = body.data.providers.find((p) => p.id === "google");
  assert.ok(google);
  assert.equal(google.name, "Google Gemini");
  assert.ok(Array.isArray(google.capabilities));

  const openaiComp = body.data.providers.find((p) => p.id === "openai_compatible");
  assert.ok(openaiComp);
  assert.ok(openaiComp.requiredFields.includes("baseUrl"));
});

test("Provider Connections CRUD lifecycle (/api/v1/provider-connections)", async (t) => {
  const base = await serve(t, createTestApp());
  const { cookie, csrfToken, workspaceId } = await createAuthenticatedSession(base);

  // 1. Unauthenticated GET -> 401
  const unauthGet = await request(base, "/api/v1/provider-connections", { method: "GET" });
  assert.equal(unauthGet.status, 401);

  // 2. Unauthenticated POST -> 401
  const unauthPost = await request(base, "/api/v1/provider-connections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "google", apiKey: "sk-test" }),
  });
  assert.equal(unauthPost.status, 401);

  // 3. Missing CSRF POST -> 403
  const noCsrfPost = await request(base, "/api/v1/provider-connections", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ kind: "google", apiKey: "sk-test" }),
  });
  assert.equal(noCsrfPost.status, 403);

  // 4. Invalid input (missing baseUrl for openai_compatible) -> 400
  const invalidPost = await request(base, "/api/v1/provider-connections", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie, "x-csrf-token": csrfToken },
    body: JSON.stringify({ kind: "openai_compatible", apiKey: "sk-test" }),
  });
  assert.equal(invalidPost.status, 400);

  // 5. Create valid connection -> 201
  const createRes = await request(base, "/api/v1/provider-connections", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie, "x-csrf-token": csrfToken },
    body: JSON.stringify({
      workspaceId,
      kind: "openai_compatible",
      name: "Local vLLM Worker",
      baseUrl: "http://127.0.0.1:8001/v1",
      apiKey: "sk-secret-local-key",
      isActive: true,
    }),
  });
  assert.equal(createRes.status, 201);
  const createBody = await createRes.json();
  const conn = createBody.data.connection;
  assert.ok(conn.id);
  assert.equal(conn.name, "Local vLLM Worker");
  assert.equal(conn.hasApiKey, true);
  assert.equal(conn.api_key_ciphertext, undefined, "Must not leak ciphertext in response");
  assert.equal(conn.apiKey, undefined, "Must not leak raw apiKey in response");

  try {
    // 6. List connections -> 200
    const listRes = await request(base, "/api/v1/provider-connections", {
      method: "GET",
      headers: { Cookie: cookie },
    });
    assert.equal(listRes.status, 200);
    const listBody = await listRes.json();
    assert.ok(Array.isArray(listBody.data.connections));
    const found = listBody.data.connections.find((c) => c.id === conn.id);
    assert.ok(found);
    assert.equal(found.name, "Local vLLM Worker");
    assert.equal(found.hasApiKey, true);

    // 7. PATCH connection -> 200
    const patchRes = await request(base, `/api/v1/provider-connections/${conn.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookie, "x-csrf-token": csrfToken },
      body: JSON.stringify({ name: "Updated vLLM Worker", isActive: false }),
    });
    assert.equal(patchRes.status, 200);
    const patchBody = await patchRes.json();
    assert.equal(patchBody.data.connection.name, "Updated vLLM Worker");
    assert.equal(patchBody.data.connection.isActive, false);

    // 8. PATCH non-existent -> 404
    const patch404 = await request(base, "/api/v1/provider-connections/00000000-0000-0000-0000-000000000000", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookie, "x-csrf-token": csrfToken },
      body: JSON.stringify({ name: "Ghost" }),
    });
    assert.equal(patch404.status, 404);

    // 9. DELETE connection -> 200
    const deleteRes = await request(base, `/api/v1/provider-connections/${conn.id}`, {
      method: "DELETE",
      headers: { Cookie: cookie, "x-csrf-token": csrfToken },
    });
    assert.equal(deleteRes.status, 200);
    const deleteBody = await deleteRes.json();
    assert.equal(deleteBody.data.deleted, true);

    // 10. DELETE again -> 404
    const delete404 = await request(base, `/api/v1/provider-connections/${conn.id}`, {
      method: "DELETE",
      headers: { Cookie: cookie, "x-csrf-token": csrfToken },
    });
    assert.equal(delete404.status, 404);
  } finally {
    await query("DELETE FROM provider_connections WHERE id = $1", [conn.id]);
  }
});

test("POST /api/v1/provider-connections/:id/test and models/refresh", async (t) => {
  const base = await serve(t, createTestApp());
  const { cookie, csrfToken } = await createAuthenticatedSession(base);

  // Mock server for testing connectivity & refreshing models
  const mockServer = http.createServer((req, res) => {
    if (req.url === "/v1/models") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        data: [{ id: "test-fast-llm", name: "Test Fast LLM" }]
      }));
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise((resolve) => mockServer.listen(0, "127.0.0.1", () => resolve(undefined)));
  const mockPort = /** @type {import('node:net').AddressInfo} */ (mockServer.address()).port;
  const mockBaseUrl = `http://127.0.0.1:${mockPort}/v1`;

  // Create connection pointing to mock server
  const createRes = await request(base, "/api/v1/provider-connections", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie, "x-csrf-token": csrfToken },
    body: JSON.stringify({
      kind: "openai_compatible",
      name: "Mock Endpoint",
      baseUrl: mockBaseUrl,
      apiKey: "sk-mock-key",
    }),
  });
  assert.equal(createRes.status, 201);
  const conn = (await createRes.json()).data.connection;

  try {
    // 1. Test connection -> 200
    const testRes = await request(base, `/api/v1/provider-connections/${conn.id}/test`, {
      method: "POST",
      headers: { Cookie: cookie, "x-csrf-token": csrfToken },
    });
    assert.equal(testRes.status, 200);
    const testBody = await testRes.json();
    assert.equal(testBody.data.ok, true);
    assert.equal(testBody.data.provider, "openai_compatible");
    assert.ok(typeof testBody.data.latencyMs === "number");

    // 2. Test non-existent connection -> 404
    const test404 = await request(base, "/api/v1/provider-connections/00000000-0000-0000-0000-000000000000/test", {
      method: "POST",
      headers: { Cookie: cookie, "x-csrf-token": csrfToken },
    });
    assert.equal(test404.status, 404);

    // 3. Refresh models -> 200
    const refreshRes = await request(base, `/api/v1/provider-connections/${conn.id}/models/refresh`, {
      method: "POST",
      headers: { Cookie: cookie, "x-csrf-token": csrfToken },
    });
    assert.equal(refreshRes.status, 200);
    const refreshBody = await refreshRes.json();
    assert.equal(refreshBody.data.refreshed, true);
    assert.equal(refreshBody.data.count, 1);
    assert.equal(refreshBody.data.models[0].id, "test-fast-llm");
  } finally {
    mockServer.close();
    await query("DELETE FROM models WHERE id = 'test-fast-llm'");
    await query("DELETE FROM provider_connections WHERE id = $1", [conn.id]);
  }
});

test("Model Settings GET and PATCH (/api/v1/model-settings)", async (t) => {
  const base = await serve(t, createTestApp());
  const { cookie, csrfToken } = await createAuthenticatedSession(base);

  // 1. Unauthenticated GET -> 401
  const unauthGet = await request(base, "/api/v1/model-settings", { method: "GET" });
  assert.equal(unauthGet.status, 401);

  // 2. Authenticated GET returns defaults -> 200
  const getRes = await request(base, "/api/v1/model-settings", {
    method: "GET",
    headers: { Cookie: cookie },
  });
  assert.equal(getRes.status, 200);
  const getBody = await getRes.json();
  assert.ok(getBody.data.primaryModel);
  assert.ok(getBody.data.fallbackModel);
  assert.ok(getBody.data.auxiliaryModels);

  // 3. PATCH requires CSRF -> 403
  const noCsrfPatch = await request(base, "/api/v1/model-settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ primaryModel: "gpt-4o" }),
  });
  assert.equal(noCsrfPatch.status, 403);

  // 4. PATCH invalid input -> 400
  const invalidPatch = await request(base, "/api/v1/model-settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: cookie, "x-csrf-token": csrfToken },
    body: JSON.stringify({ primaryModel: "" }),
  });
  assert.equal(invalidPatch.status, 400);

  // 5. Valid PATCH updates routing preferences -> 200
  const patchRes = await request(base, "/api/v1/model-settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: cookie, "x-csrf-token": csrfToken },
    body: JSON.stringify({
      primaryModel: "gemini-2.5-flash",
      fallbackModel: "gpt-4o-mini",
      auxiliaryModels: {
        fast: "gemini-flash-lite-latest",
        reasoning: "gemini-1.5-pro",
      },
    }),
  });
  assert.equal(patchRes.status, 200);
  const patchBody = await patchRes.json();
  assert.equal(patchBody.data.primaryModel, "gemini-2.5-flash");
  assert.equal(patchBody.data.fallbackModel, "gpt-4o-mini");
  assert.equal(patchBody.data.auxiliaryModels.fast, "gemini-flash-lite-latest");

  // 6. Verify GET returns the newly patched values
  const verifyGet = await request(base, "/api/v1/model-settings", {
    method: "GET",
    headers: { Cookie: cookie },
  });
  assert.equal(verifyGet.status, 200);
  const verifyBody = await verifyGet.json();
  assert.equal(verifyBody.data.primaryModel, "gemini-2.5-flash");
  assert.equal(verifyBody.data.fallbackModel, "gpt-4o-mini");
});

test("AUDIT-01: AIService.resolveModelAlias resolves deprecated identifiers to active successors", () => {
  assert.equal(AIService.resolveModelAlias("gemini-2.5-flash-lite"), "gemini-3.5-flash-lite");
  assert.equal(AIService.resolveModelAlias("gemini-2.5-flash"), "gemini-3.5-flash-lite");
  assert.equal(AIService.resolveModelAlias("gemini-2.5-pro"), "gemini-3.1-pro-preview");
  assert.equal(AIService.resolveModelAlias("gemini-1.5-pro"), "gemini-3.1-pro-preview");
  assert.equal(AIService.resolveModelAlias("gemini-1.5-flash"), "gemini-3.5-flash-lite");
  assert.equal(AIService.resolveModelAlias("gpt-4o"), "gpt-4o");
  assert.equal(AIService.resolveModelAlias("claude-3-7-sonnet-20250219"), "claude-3-7-sonnet-20250219");
  assert.equal(AIService.resolveProvider("gemini-2.5-flash-lite"), "google");
  assert.equal(AIService.resolveProvider("gpt-4o"), "openai");
  assert.equal(AIService.resolveProvider("claude-3-7-sonnet-20250219"), "anthropic");
});

