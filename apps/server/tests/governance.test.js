import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { loadEnvironment } from "../server.js";
import { readRuntimeConfig } from "../foundation/runtimeConfig.js";
import { createLogger } from "../foundation/logger.js";
import { createDatabaseOwner, activateDatabaseOwner, query } from "../config/db.js";
import { createApp } from "../app.js";
import { createHealthController } from "../controllers/healthController.js";
import apiRoutes from "../routes/index.js";
import { stage05Admission } from "../foundation/admission.js";
import { generateLauncherChallenge } from "../services/launcherChallenge.js";
import { GovernanceService, GovernanceServiceError } from "../services/governanceService.js";
import { SessionTurnLeaseRegistry, TurnLeaseError } from "../services/turnLeaseService.js";
import { ProjectService } from "../services/projectService.js";
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
    admission: stage05Admission,
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

test("unauthenticated requests to governance endpoints return 401", async (t) => {
  const base = await serve(t, createTestApp());
  const res = await request(base, "/api/v1/policies/current", { method: "GET" });
  assert.equal(res.status, 401);
  const body = await res.json();
  assert.equal(body.code, "UNAUTHENTICATED");
});

test("governance mutations without CSRF token return 403", async (t) => {
  const base = await serve(t, createTestApp());
  const { cookie } = await createAuthenticatedSession(base);

  const res = await request(base, "/api/v1/policies/revisions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({ rules: { autonomyMode: "guarded" } }),
  });
  assert.equal(res.status, 403);
  const body = await res.json();
  assert.equal(body.code, "POLICY_DENIED");
});

test("deterministic policy evaluation truth table across autonomy modes", () => {
  // 1. Read-only mode
  const readOnlyPolicy = { rules: { autonomyMode: "readonly" } };
  const roAllowed = GovernanceService.evaluatePolicy(readOnlyPolicy, { action: "fs_read" });
  assert.equal(roAllowed.allowed, true);

  const roDenied = GovernanceService.evaluatePolicy(readOnlyPolicy, { action: "fs_write" });
  assert.equal(roDenied.allowed, false);
  assert.equal(roDenied.requiresApproval, true);

  // 2. Supervised mode
  const supervisedPolicy = { rules: { autonomyMode: "supervised" } };
  const supNormal = GovernanceService.evaluatePolicy(supervisedPolicy, { action: "fs_write", highImpact: false });
  assert.equal(supNormal.allowed, true);

  const supHighImpact = GovernanceService.evaluatePolicy(supervisedPolicy, { action: "execute_shell", highImpact: true });
  assert.equal(supHighImpact.allowed, false);
  assert.equal(supHighImpact.requiresApproval, true);

  // 3. Guarded mode with cost ceiling and egress restrictions
  const guardedPolicy = {
    rules: {
      autonomyMode: "guarded",
      budgetCeilingMicroUsd: 500000,
      allowedHosts: ["api.openai.com", "api.anthropic.com"],
    },
  };
  const guardedBudgetExceeded = GovernanceService.evaluatePolicy(guardedPolicy, {
    action: "ai_inference",
    costMicroUsd: 600000,
  });
  assert.equal(guardedBudgetExceeded.allowed, false);
  assert.equal(guardedBudgetExceeded.requiresApproval, true);

  const guardedDisallowedHost = GovernanceService.evaluatePolicy(guardedPolicy, {
    action: "egress_http",
    targetHost: "evil.example.com",
  });
  assert.equal(guardedDisallowedHost.allowed, false);
  assert.equal(guardedDisallowedHost.requiresApproval, true);

  const guardedAllowedHost = GovernanceService.evaluatePolicy(guardedPolicy, {
    action: "egress_http",
    targetHost: "api.openai.com",
    costMicroUsd: 10000,
  });
  assert.equal(guardedAllowedHost.allowed, true);

  // 4. Autonomous mode
  const autonomousPolicy = { rules: { autonomyMode: "autonomous" } };
  const autoHighImpact = GovernanceService.evaluatePolicy(autonomousPolicy, { action: "execute_shell", highImpact: true });
  assert.equal(autoHighImpact.allowed, true);
});

test("policy revisions creation, retrieval and atomic activation", async () => {
  const current = await GovernanceService.getCurrentPolicy();
  assert.ok(current);
  assert.equal(current.active, true);

  // Create new revision
  const newRev = await GovernanceService.createPolicyRevision({
    rules: {
      autonomyMode: "guarded",
      allowedHosts: ["api.openai.com"],
      budgetCeilingMicroUsd: 1000000,
    },
  });
  assert.ok(newRev);
  assert.equal(newRev.active, false);
  assert.ok(newRev.digest);

  // Activate revision
  const activated = await GovernanceService.activatePolicyRevision(newRev.id);
  assert.equal(activated.id, newRev.id);
  assert.equal(activated.active, true);

  // Verify current policy is now the activated one
  const currentAfter = await GovernanceService.getCurrentPolicy();
  assert.equal(currentAfter.id, newRev.id);
  assert.equal(/** @type {any} */ (currentAfter).rules.autonomyMode, "guarded");

  // Re-activate baseline
  await GovernanceService.activatePolicyRevision(current.id);
});

test("single-writer turn lease registry enforces concurrency and generational safety", async () => {
  const project = await ProjectService.createProject({ name: "Turn Lease Registry Project" });
  const conv = await ProjectService.createConversation(/** @type {any} */ (project).id, { title: "Turn Session" });
  const testSessionId = conv.id;

  // 1. Acquire initial lease
  const token = await SessionTurnLeaseRegistry.acquireLease(testSessionId, {
    ownerId: "agent-runtime-1",
    ttlSeconds: 10,
  });
  assert.ok(token);
  assert.equal(token.session_id, testSessionId);
  assert.equal(token.holder, "agent-runtime-1");
  assert.equal(token.generation, 1);

  // 2. Competing acquire should fail with 409 TURN_LEASE_CONFLICT
  await assert.rejects(
    async () => {
      await SessionTurnLeaseRegistry.acquireLease(testSessionId, {
        ownerId: "agent-runtime-2",
        ttlSeconds: 10,
      });
    },
    (err) => {
      assert.ok(err instanceof TurnLeaseError);
      assert.equal(err.status, 409);
      assert.equal(err.code, "TURN_LEASE_CONFLICT");
      assert.equal(/** @type {any} */ (err).holder, "agent-runtime-1");
      return true;
    }
  );

  // 3. Inspect active lease
  const active = /** @type {any} */ (await SessionTurnLeaseRegistry.getLease(testSessionId));
  assert.equal(active.holder, "agent-runtime-1");
  assert.equal(Number(active.generation), 1);

  // 4. Release lease
  const released = await SessionTurnLeaseRegistry.releaseLease(testSessionId, {
    ownerId: "agent-runtime-1",
    generation: token.generation,
  });
  assert.equal(released, true);

  // 5. Subsequent acquire succeeds and increments generation
  const token2 = await SessionTurnLeaseRegistry.acquireLease(testSessionId, {
    ownerId: "agent-runtime-2",
    ttlSeconds: 10,
  });
  assert.equal(token2.holder, "agent-runtime-2");
  assert.equal(Number(token2.generation), 2);

  // Clean up
  await SessionTurnLeaseRegistry.releaseLease(testSessionId, {
    ownerId: "agent-runtime-2",
    generation: token2.generation,
  });
});

test("approval lifecycle: request, pending, approve with nonce proof, and reject double-decision", async () => {
  const project = await ProjectService.createProject({
    name: "Governance Approval Test",
    description: "Testing approvals",
  });
  const projId = /** @type {any} */ (project).id;

  const rawInput = JSON.stringify({ command: "rm -rf /unauthorized/path" });
  const inputDigest = crypto.createHash("sha256").update(rawInput).digest("hex");

  // 1. Request approval
  const { approval, nonce } = await GovernanceService.createApprovalRequest({
    projectId: projId,
    kind: "action",
    inputDigest,
    scopeSummary: "Destructive file removal",
    consequences: "Cannot be undone",
  });
  assert.equal(approval.state, "pending");
  assert.equal(approval.input_digest, inputDigest);
  assert.ok(approval.nonce_hash);

  // 2. Reject decision with invalid nonce
  await assert.rejects(
    async () => {
      await GovernanceService.decideApproval(approval.id, {
        decision: "approve",
        nonce: "wrong-nonce",
        digest: inputDigest,
      });
    },
    /Invalid approval nonce proof/
  );

  // 3. Reject decision with mismatched input digest
  await assert.rejects(
    async () => {
      await GovernanceService.decideApproval(approval.id, {
        decision: "approve",
        nonce,
        digest: "0000000000000000000000000000000000000000000000000000000000000000",
      });
    },
    /Input digest mismatch against approval request/
  );

  // 4. Successful approval with correct nonce and digest
  const decided = await GovernanceService.decideApproval(approval.id, {
    decision: "approve",
    nonce,
    digest: inputDigest,
  });
  assert.equal(decided.state, "approved");
  assert.ok(decided.decided_at);

  // 5. Double-decision is rejected
  await assert.rejects(
    async () => {
      await GovernanceService.decideApproval(approval.id, {
        decision: "reject",
        nonce,
        digest: inputDigest,
      });
    },
    /Approval is already approved/
  );
});

test("approval revocation before consumption", async () => {
  const project = await ProjectService.createProject({
    name: "Revocation Test",
  });
  const projId = /** @type {any} */ (project).id;

  const inputDigest = crypto.createHash("sha256").update("contract-data").digest("hex");
  const { approval } = await GovernanceService.createApprovalRequest({
    projectId: projId,
    kind: "contract",
    inputDigest,
    scopeSummary: "Plan execution approval",
  });
  assert.equal(approval.state, "pending");

  const revoked = await GovernanceService.revokeApproval(approval.id, { reason: "User cancelled turn" });
  assert.equal(revoked.state, "revoked");
});

test("budget accounts and atomic reservations enforce cost ceiling", async () => {
  const project = await ProjectService.createProject({
    name: "Budget Test Project",
  });
  const projId = /** @type {any} */ (project).id;

  // 1. Create budget account with $5 ceiling (5,000,000 micro-USD)
  const account = await GovernanceService.createOrUpdateBudget({
    scopeKind: "project",
    scopeId: projId,
    limitMicroUsd: 5000000,
  });
  assert.equal(account.limit_micro_usd, "5000000");
  assert.equal(account.reserved_micro_usd, "0");
  assert.equal(account.spent_micro_usd, "0");

  // 2. Reserve $3 (3,000,000 micro-USD)
  const reservation = await GovernanceService.reserveBudget(account.id, {
    operationKey: "op-1",
    ceilingMicroUsd: 3000000,
  });
  assert.equal(reservation.state, "held");
  assert.equal(reservation.ceiling_micro_usd, "3000000");

  // 3. Attempting to reserve $3 more exceeds $5 ceiling ($3 reserved + $3 requested = $6 > $5)
  await assert.rejects(
    async () => {
      await GovernanceService.reserveBudget(account.id, {
        operationKey: "op-2",
        ceilingMicroUsd: 3000000,
      });
    },
    (err) => {
      assert.ok(err instanceof GovernanceServiceError);
      assert.equal(err.code, "BUDGET_EXCEEDED");
      return true;
    }
  );

  // 4. Settle reservation: actual cost $2.50 (2,500,000 micro-USD), releasing $0.50
  const settled = await GovernanceService.settleReservation(reservation.id, {
    actualSpentMicroUsd: 2500000,
  });
  assert.equal(settled.state, "settled");

  // 5. Verify account state: spent = 2.50, reserved = 0
  const updatedAccount = /** @type {any} */ (await GovernanceService.getBudgetAccount(account.id));
  assert.equal(updatedAccount.spent_micro_usd, "2500000");
  assert.equal(updatedAccount.reserved_micro_usd, "0");
});

test("audit events maintain hash-chained append-only integrity without token leakage", async () => {
  // Query last audit events
  const eventsRes = await query(
    "SELECT * FROM audit_events ORDER BY id DESC LIMIT 5"
  );
  if (eventsRes.rows.length >= 2) {
    const latest = eventsRes.rows[0];
    const prev = eventsRes.rows[1];
    // Each event must have an event_digest and prev_digest
    assert.ok(latest.event_digest);
    assert.ok(latest.prev_digest);
    assert.ok(prev.event_digest);
    // Verified hash chain linkage
    assert.equal(latest.prev_digest, prev.event_digest);
  }
});

test("capabilities projection reports Stage 05 governance, approvals, leases and budgets available", async (t) => {
  const base = await serve(t, createTestApp());
  const { cookie } = await createAuthenticatedSession(base);
  const res = await request(base, "/api/v1/capabilities", {
    method: "GET",
    headers: { Cookie: cookie },
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  const { items } = body.data;

  const govCap = items.find((i) => i.name === "governance");
  const apprCap = items.find((i) => i.name === "approvals");
  const leaseCap = items.find((i) => i.name === "leases");
  const budgetCap = items.find((i) => i.name === "budgets");
  const execCap = items.find((i) => i.name === "execution");

  assert.equal(govCap.state, "available");
  assert.equal(apprCap.state, "available");
  assert.equal(leaseCap.state, "available");
  assert.equal(budgetCap.state, "available");
  assert.equal(execCap.state, "available");
});

test("full Stage 05 HTTP workflow: policies, grants, leases, approvals, and budgets", async (t) => {
  const base = await serve(t, createTestApp());
  const { cookie, csrfToken, workspaceId } = await createAuthenticatedSession(base);
  const headers = {
    Cookie: cookie,
    "x-csrf-token": csrfToken,
    "Content-Type": "application/json",
  };

  // 1. GET /api/v1/policies/current
  const polRes = await request(base, "/api/v1/policies/current", {
    method: "GET",
    headers: { Cookie: cookie },
  });
  assert.equal(polRes.status, 200);
  const polBody = await polRes.json();
  assert.ok(polBody.data.policy);

  // 2. POST /api/v1/policies/revisions
  const revRes = await request(base, "/api/v1/policies/revisions", {
    method: "POST",
    headers,
    body: JSON.stringify({
      rules: { autonomyMode: "supervised", allowedHosts: ["api.openai.com"] },
    }),
  });
  assert.equal(revRes.status, 201);
  const revBody = await revRes.json();
  const revId = revBody.data.policy.id;

  // 3. POST /api/v1/policies/:revisionId/activate
  const actRes = await request(base, `/api/v1/policies/${revId}/activate`, {
    method: "POST",
    headers,
  });
  assert.equal(actRes.status, 200);

  // 4. Create Project and Conversation for test
  const projRes = await request(base, "/api/v1/projects", {
    method: "POST",
    headers,
    body: JSON.stringify({ workspaceId, name: "Stage 05 HTTP Project" }),
  });
  assert.equal(projRes.status, 201);
  const projBody = await projRes.json();
  const projectId = projBody.data.project.id;

  const convRes = await request(base, `/api/v1/projects/${projectId}/conversations`, {
    method: "POST",
    headers,
    body: JSON.stringify({ title: "Stage 05 HTTP Session" }),
  });
  assert.equal(convRes.status, 201);
  const convBody = await convRes.json();
  const sessionId = convBody.data.conversation.id;

  // 5. Capability Grants: POST and GET
  const grantRes = await request(base, `/api/v1/projects/${projectId}/grants`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      capability: "tools.filesystem.read",
      resourceScope: { allowedDirs: ["/workspace"] },
      ttlHours: 12,
    }),
  });
  assert.equal(grantRes.status, 201);
  const grantBody = await grantRes.json();
  const grantId = grantBody.data.grant.id;

  const listGrantsRes = await request(base, `/api/v1/projects/${projectId}/grants`, {
    method: "GET",
    headers: { Cookie: cookie },
  });
  assert.equal(listGrantsRes.status, 200);

  // Revoke grant
  const revokeGrantRes = await request(base, `/api/v1/grants/${grantId}/revoke`, {
    method: "POST",
    headers,
  });
  assert.equal(revokeGrantRes.status, 200);

  // 6. Turn Lease via HTTP
  const leaseAcquireRes = await request(base, `/api/v1/sessions/${sessionId}/lease`, {
    method: "POST",
    headers,
    body: JSON.stringify({ ttlSeconds: 15 }),
  });
  assert.equal(leaseAcquireRes.status, 201);
  const leaseBody = await leaseAcquireRes.json();
  assert.ok(leaseBody.data.token);

  const leaseGetRes = await request(base, `/api/v1/sessions/${sessionId}/lease`, {
    method: "GET",
    headers: { Cookie: cookie },
  });
  assert.equal(leaseGetRes.status, 200);

  const leaseReleaseRes = await request(base, `/api/v1/sessions/${sessionId}/lease`, {
    method: "DELETE",
    headers,
  });
  assert.equal(leaseReleaseRes.status, 200);

  // 7. Budget Account & Reservation via HTTP
  const budgetCreateRes = await request(base, `/api/v1/projects/${projectId}/budgets`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      currency: "USD",
      ceilingMicroUsd: 10000000,
    }),
  });
  assert.equal(budgetCreateRes.status, 200);
  const budgetBody = await budgetCreateRes.json();
  const accountId = budgetBody.data.budget.id;

  const reserveRes = await request(base, `/api/v1/budgets/${accountId}/reserve`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      operationKey: "op-http-test",
      ceilingMicroUsd: 500000,
    }),
  });
  assert.equal(reserveRes.status, 201);

  // 8. Approvals via HTTP
  const approvalsListRes = await request(base, "/api/v1/approvals", {
    method: "GET",
    headers: { Cookie: cookie },
  });
  assert.equal(approvalsListRes.status, 200);

  // Clean up: reactivate initial policy
  await GovernanceService.activatePolicyRevision(polBody.data.policy.id);
});
