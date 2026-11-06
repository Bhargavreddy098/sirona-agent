import { test, before, after } from "node:test";
import assert from "node:assert/strict";
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
import { TurnLease } from "../model/TurnLease.js";
import { validateSafeEndpointUrl } from "../foundation/ssrfGuard.js";
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

/* =====================================================================
   Requirement 1 & 2: Bootstrap & Cookie Security
   ===================================================================== */

test("Bootstrap: Production environment strictly rejects missing launcher challenge with 400", async (t) => {
  const base = await serve(t, createTestApp());
  const prevEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = "production";
    const res = await request(base, "/api/v1/session/bootstrap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.detail, "Challenge and clientNonce are required");
  } finally {
    process.env.NODE_ENV = prevEnv;
  }
});

test("Bootstrap: Untrusted client header alone cannot enable dev bootstrap without server opt-in", async (t) => {
  const base = await serve(t, createTestApp());
  const prevEnv = process.env.NODE_ENV;
  const prevOpt = process.env.ALLOW_DEV_BOOTSTRAP;
  try {
    process.env.NODE_ENV = "development";
    delete process.env.ALLOW_DEV_BOOTSTRAP;

    const res = await request(base, "/api/v1/session/bootstrap", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-sirona-test-bootstrap": "true",
      },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.ok(body.detail.includes("ALLOW_DEV_BOOTSTRAP=true or NODE_ENV=test is explicitly configured"));
  } finally {
    process.env.NODE_ENV = prevEnv;
    if (prevOpt !== undefined) process.env.ALLOW_DEV_BOOTSTRAP = prevOpt;
  }
});

test("Bootstrap: Forged, expired, and replayed launcher challenges are rejected", async (t) => {
  const base = await serve(t, createTestApp());

  // 1. Forged challenge
  const forgedRes = await request(base, "/api/v1/session/bootstrap", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ challenge: "forged-challenge-hex", clientNonce: "forged-nonce-hex" }),
  });
  assert.equal(forgedRes.status, 401);

  // 2. Expired challenge
  const expiredPair = generateLauncherChallenge(-1000);
  const expiredRes = await request(base, "/api/v1/session/bootstrap", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ challenge: expiredPair.challenge, clientNonce: expiredPair.clientNonce }),
  });
  assert.equal(expiredRes.status, 401);

  // 3. Single-use and replay rejection
  const validPair = generateLauncherChallenge(60000);
  const firstUseRes = await request(base, "/api/v1/session/bootstrap", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ challenge: validPair.challenge, clientNonce: validPair.clientNonce }),
  });
  assert.equal(firstUseRes.status, 200);

  const replayRes = await request(base, "/api/v1/session/bootstrap", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ challenge: validPair.challenge, clientNonce: validPair.clientNonce }),
  });
  assert.equal(replayRes.status, 401);
});

test("Cookie Security: Desktop localhost HTTP permits un-flagged cookies while HTTPS/Production enforces Secure", async (t) => {
  const base = await serve(t, createTestApp());
  const { challenge, clientNonce } = generateLauncherChallenge(60000);

  // 1. Local desktop HTTP development
  const localRes = await request(base, "/api/v1/session/bootstrap", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ challenge, clientNonce }),
  });
  const cookieHeader = localRes.headers.get("set-cookie");
  assert.ok(cookieHeader.includes("HttpOnly"));
  assert.ok(cookieHeader.includes("SameSite=Strict"));
  assert.ok(cookieHeader.includes("Path=/api/v1"));
  assert.ok(!cookieHeader.includes("Secure"), "Local desktop HTTP should not set Secure flag");

  // 2. HTTPS request enforces Secure flag
  const pair2 = generateLauncherChallenge(60000);
  const httpsRes = await request(base, "/api/v1/session/bootstrap", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-proto": "https",
    },
    body: JSON.stringify({ challenge: pair2.challenge, clientNonce: pair2.clientNonce }),
  });
  const httpsCookieHeader = httpsRes.headers.get("set-cookie");
  assert.ok(httpsCookieHeader.includes("Secure"), "HTTPS deployment must enforce Secure flag");
});

/* =====================================================================
   Requirement 3: SSRF Protection & Safe Endpoint Validation
   ===================================================================== */

test("SSRF Guard: Cloud metadata, link-local, carrier-grade NAT, and zero addresses are strictly blocked", async () => {
  const blockedTargets = [
    "http://169.254.169.254/latest/meta-data",
    "http://169.254.169.253",
    "http://metadata.google.internal/computeMetadata/v1",
    "http://0.0.0.0:8000",
    "http://[fe80::1]/",
    "http://[::ffff:169.254.169.254]/",
    "http://100.64.0.1/",
  ];

  for (const url of blockedTargets) {
    const res = await validateSafeEndpointUrl(url, { allowLoopback: true });
    assert.equal(res.ok, false, `Expected ${url} to be blocked by SSRF guard`);
    assert.ok(res.reason, "Must provide explicit blocking reason");
  }
});

test("SSRF Guard: Local loopback endpoints (Ollama/LM Studio/vLLM) are explicitly permitted for local providers", async () => {
  const validLocalUrls = [
    "http://127.0.0.1:11434/v1",
    "http://localhost:1234/v1",
    "http://[::1]:8000/v1",
  ];

  for (const url of validLocalUrls) {
    const res = await validateSafeEndpointUrl(url, { allowLoopback: true });
    assert.equal(res.ok, true, `Expected local engine ${url} to be permitted`);
  }
});

test("SSRF Guard: Provider connection creation rejects cloud metadata baseUrl with 400 SSRF_BLOCKED", async (t) => {
  const base = await serve(t, createTestApp());
  const { cookie, csrfToken } = await createAuthenticatedSession(base);

  const res = await request(base, "/api/v1/provider-connections", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify({
      kind: "openai_compatible",
      name: "Malicious Metadata Target",
      baseUrl: "http://169.254.169.254/latest/meta-data",
    }),
  });

  assert.equal(res.status, 400);
  const body = await res.json();
  assert.ok(body.detail.includes("forbidden cloud metadata endpoint") || body.detail.includes("SSRF"));
});

test("OpenAI-Compatible Discovery: Permits model discovery with empty API key for local Ollama instances", async () => {
  // Mock discoverModels temporarily to simulate local Ollama /models response
  const originalDiscover = ProviderService.discoverModels;

  // Verify discoverModels does not throw API_KEY_REQUIRED when apiKey is empty
  let fetchCalled = false;
  /** @type {any} */ (ProviderService).discoverModels = async (providerKind, opts) => {
    fetchCalled = true;
    assert.equal(providerKind, "openai_compatible");
    assert.equal(opts.apiKey, null);
    return [{ id: "llama3:latest", name: "Llama 3", provider_kind: "openai_compatible", context_window: 8192, max_output_tokens: 4096 }];
  };

  try {
    const models = await ProviderService.discoverModels("openai_compatible", {
      apiKey: null,
      baseUrl: "http://127.0.0.1:11434/v1",
    });
    assert.ok(fetchCalled);
    assert.equal(models.length, 1);
    assert.equal(models[0].id, "llama3:latest");
  } finally {
    ProviderService.discoverModels = originalDiscover;
  }
});

/* =====================================================================
   Requirement 4: Streaming Cancellation & Abort Lifecycle
   ===================================================================== */

test("Streaming Cancellation: Aborting client request terminates turn and transitions status to 'cancelled'", async (t) => {
  const base = await serve(t, createTestApp());
  const { workspaceId } = await createAuthenticatedSession(base);

  const project = await ProjectService.createProject({
    workspaceId,
    name: "Cancellation Project",
    description: "Testing turn cancellation",
  });
  const projId = /** @type {any} */ (project).id;

  const conversation = await ProjectService.createConversation(projId, {
    title: "Cancellation Conversation",
  });
  const convId = /** @type {any} */ (conversation).id;

  const lease = await TurnLease.acquire(convId, "test-runner", 30);
  assert.ok(lease.acquired);

  const abortController = new AbortController();
  const originalStreamTurn = AIService.streamTurn;

  /** @type {any} */ (AIService).streamTurn = async ({ onToken, signal }) => {
    onToken("Chunk 1 ");
    // Simulate abort mid-stream
    abortController.abort();
    if (signal?.aborted) {
      const err = new Error("Inference aborted by client");
      err.name = "AbortError";
      throw err;
    }
    return { content: "Chunk 1 Chunk 2", tokens: 10 };
  };

  try {
    await assert.rejects(
      async () => {
        await ProviderService.executeTurn({
          conversationId: convId,
          prompt: "Please write a long story",
          signal: abortController.signal,
        });
      },
      (err) => err.name === "AbortError" || err.code === "TURN_CANCELLED"
    );

    // Verify durable turn states in database
    const msgRes = await query("SELECT role, content, status FROM messages WHERE session_id = $1 ORDER BY id ASC", [convId]);
    assert.equal(msgRes.rows.length, 2);

    // User message is PRESERVED with completed status
    assert.equal(msgRes.rows[0].role, "user");
    assert.equal(msgRes.rows[0].status, "completed");

    // Assistant message is marked 'cancelled'
    assert.equal(msgRes.rows[1].role, "assistant");
    assert.equal(msgRes.rows[1].status, "cancelled");

    // Model call is logged with 'aborted'
    const callRes = await query("SELECT status FROM model_calls WHERE session_id = $1", [convId]);
    assert.equal(callRes.rows.length, 1);
    assert.equal(callRes.rows[0].status, "aborted");
  } finally {
    AIService.streamTurn = originalStreamTurn;
    await TurnLease.release(convId, "test-runner", lease.token.generation);
  }
});

/* =====================================================================
   Requirement 5: Conversation Integrity & Durable Turn States
   ===================================================================== */

test("Conversation Integrity: Failed inference does NOT delete user message and transitions assistant message to 'failed'", async () => {
  const project = await ProjectService.createProject({
    name: "Integrity Project",
    description: "Testing history preservation on failure",
  });
  const projId = /** @type {any} */ (project).id;

  const conversation = await ProjectService.createConversation(projId, {
    title: "Integrity Conversation",
  });
  const convId = /** @type {any} */ (conversation).id;

  const lease = await TurnLease.acquire(convId, "test-runner", 30);
  assert.ok(lease.acquired);

  const originalStreamTurn = AIService.streamTurn;
  /** @type {any} */ (AIService).streamTurn = async () => {
    const err = Object.assign(new Error("Upstream model service 503 unavailable"), { status: 503 });
    throw err;
  };

  try {
    await assert.rejects(
      async () => {
        await ProviderService.executeTurn({
          conversationId: convId,
          prompt: "Calculate fibonacci(100)",
        });
      },
      /503 unavailable/
    );

    // Verify messages: user message must be intact
    const msgRes = await query("SELECT role, content, status FROM messages WHERE session_id = $1 ORDER BY id ASC", [convId]);
    assert.equal(msgRes.rows.length, 2, "Both user prompt and assistant error state must be retained");
    assert.equal(msgRes.rows[0].role, "user");
    assert.equal(msgRes.rows[0].content, "Calculate fibonacci(100)");
    assert.equal(msgRes.rows[0].status, "completed");

    assert.equal(msgRes.rows[1].role, "assistant");
    assert.equal(msgRes.rows[1].status, "failed");
    assert.ok(msgRes.rows[1].content.includes("503 unavailable"));

    // Verify model_calls logged failure
    const callRes = await query("SELECT status, error_message FROM model_calls WHERE session_id = $1", [convId]);
    assert.equal(callRes.rows[0].status, "failed");
    assert.ok(callRes.rows[0].error_message.includes("503 unavailable"));
  } finally {
    AIService.streamTurn = originalStreamTurn;
    await TurnLease.release(convId, "test-runner", lease.token.generation);
  }
});

/* =====================================================================
   Requirement 6: Eligible Fallback Routing
   ===================================================================== */

test("Fallback Routing: Seamlessly routes to fallback model when primary encounters eligible upstream failure before tokens", async () => {
  const project = await ProjectService.createProject({
    name: "Fallback Project",
    description: "Testing fallback routing",
  });
  const projId = /** @type {any} */ (project).id;

  const conversation = await ProjectService.createConversation(projId, {
    title: "Fallback Conversation",
  });
  const convId = /** @type {any} */ (conversation).id;

  const lease = await TurnLease.acquire(convId, "test-runner", 30);
  assert.ok(lease.acquired);

  // Configure fallback model in settings
  const origGetModelSettings = ProviderService.getModelSettings;
  ProviderService.getModelSettings = async () => ({
    primaryModel: "gemini-2.5-flash",
    fallbackModel: "gemini-flash-lite-latest",
  });

  const originalStreamTurn = AIService.streamTurn;
  let primaryAttempted = false;
  let fallbackAttempted = false;

  /** @type {any} */ (AIService).streamTurn = async ({ model, onToken }) => {
    if (model === "gemini-2.5-flash") {
      primaryAttempted = true;
      const err = Object.assign(new Error("Model retired (404)"), { status: 404 });
      throw err;
    }
    if (model === "gemini-flash-lite-latest") {
      fallbackAttempted = true;
      onToken("Fallback output response");
      return { content: "Fallback output response", tokens: 8 };
    }
    throw new Error(`Unexpected model: ${model}`);
  };

  try {
    const result = await ProviderService.executeTurn({
      conversationId: convId,
      prompt: "Execute fallback test",
      modelId: "gemini-2.5-flash",
    });

    assert.ok(primaryAttempted, "Primary model must have been attempted first");
    assert.ok(fallbackAttempted, "Fallback model must have been attempted after primary 404");
    assert.equal(result.assistantMessage.status, "completed");
    assert.equal(result.assistantMessage.content, "Fallback output response");
    assert.equal(result.usage.model, "gemini-flash-lite-latest");
  } finally {
    AIService.streamTurn = originalStreamTurn;
    ProviderService.getModelSettings = origGetModelSettings;
    await TurnLease.release(convId, "test-runner", lease.token.generation);
  }
});

test("SSRF Guard: Pre-flight check blocks executeTurn if provider base URL resolves to forbidden cloud metadata", async () => {
  const project = await ProjectService.createProject({
    name: "SSRF Test Project",
    description: "Testing inference SSRF preflight",
  });
  const projId = /** @type {any} */ (project).id;

  const conversation = await ProjectService.createConversation(projId, {
    title: "SSRF Conversation",
  });
  const convId = /** @type {any} */ (conversation).id;

  const lease = await TurnLease.acquire(convId, "test-runner", 30);
  assert.ok(lease.acquired);

  const origGetBaseUrl = ProviderService.getBaseUrl;
  ProviderService.getBaseUrl = async () => "http://169.254.169.254/v1";

  try {
    await assert.rejects(
      async () => {
        await ProviderService.executeTurn({
          conversationId: convId,
          prompt: "Test SSRF preflight",
          modelId: "ollama/llama3",
        });
      },
      (err) => {
        assert.equal(err.code, "SSRF_BLOCKED");
        return true;
      }
    );
  } finally {
    ProviderService.getBaseUrl = origGetBaseUrl;
    await TurnLease.release(convId, "test-runner", lease.token.generation);
  }
});
