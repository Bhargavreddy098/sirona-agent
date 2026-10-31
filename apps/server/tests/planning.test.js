import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { loadEnvironment } from "../server.js";
import { readRuntimeConfig } from "../foundation/runtimeConfig.js";
import { createLogger } from "../foundation/logger.js";
import { createDatabaseOwner, activateDatabaseOwner, query } from "../config/db.js";
import { createApp } from "../app.js";
import { createHealthController } from "../controllers/healthController.js";
import apiRoutes from "../routes/index.js";
import { stage09Admission } from "../foundation/admission.js";
import { generateLauncherChallenge } from "../services/launcherChallenge.js";
import { ProjectService } from "../services/projectService.js";
import { IntentRequirementService } from "../services/intentRequirementService.js";
import { PlanningContractService } from "../services/planningContractService.js";
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
    admission: stage09Admission,
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

test("unauthenticated requests to planning endpoints return 401", async (t) => {
  const base = await serve(t, createTestApp());
  const res = await request(base, "/api/v1/goals/00000000-0000-0000-0000-000000000000/plans", { method: "GET" });
  assert.equal(res.status, 401);
  const body = await res.json();
  assert.equal(body.code, "UNAUTHENTICATED");
});

test("planning mutations without CSRF token return 403", async (t) => {
  const base = await serve(t, createTestApp());
  const { cookie } = await createAuthenticatedSession(base);

  const res = await request(base, "/api/v1/goals/00000000-0000-0000-0000-000000000000/plans", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({}),
  });
  assert.equal(res.status, 403);
  const body = await res.json();
  assert.equal(body.code, "POLICY_DENIED");
});

test("Stage 09 Plan creation with DAG cycle detection returns 400 DAG_CYCLE", async (t) => {
  const base = await serve(t, createTestApp());
  const { cookie, csrfToken, workspaceId } = await createAuthenticatedSession(base);

  const project = await ProjectService.createProject({
    workspaceId,
    name: "DAG Cycle Project",
    primaryPath: "C:\\Workspace\\DagCycleProject",
  });
  const conversation = await ProjectService.createConversation(project.id, {
    title: "DAG Discussion",
  });
  const goal = await IntentRequirementService.createGoalFromConversation(conversation.id, {});
  await IntentRequirementService.createRequirementRevision(goal.id, {
    requirements: [
      {
        key: "req-1",
        statement: "Base requirement",
        priority: "must",
        kind: "functional",
        criteria: [{ key: "c1", required: true, method: "test", expected: "ok" }],
      },
    ],
  });

  // Cyclic dependency: step-A depends on step-B, and step-B depends on step-A
  const cyclicRes = await request(base, `/api/v1/goals/${goal.id}/plans`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie, "x-csrf-token": csrfToken },
    body: JSON.stringify({
      steps: [
        { key: "step-a", objective: "Do A", dependsOn: ["step-b"] },
        { key: "step-b", objective: "Do B", dependsOn: ["step-a"] },
      ],
    }),
  });
  assert.equal(cyclicRes.status, 400);
  const cyclicBody = await cyclicRes.json();
  assert.match(cyclicBody.detail, /cyclical dependency/);

  // Cleanup
  await query("DELETE FROM projects WHERE id = $1", [project.id]);
});

test("Stage 09 Plan creation with unscoped step returns 400 UNSCOPED_STEP", async (t) => {
  const base = await serve(t, createTestApp());
  const { cookie, csrfToken, workspaceId } = await createAuthenticatedSession(base);

  const project = await ProjectService.createProject({
    workspaceId,
    name: "Unscoped Step Project",
    primaryPath: "C:\\Workspace\\UnscopedStepProject",
  });
  const conversation = await ProjectService.createConversation(project.id, {
    title: "Unscoped Step Discussion",
  });
  const goal = await IntentRequirementService.createGoalFromConversation(conversation.id, {});
  await IntentRequirementService.createRequirementRevision(goal.id, {
    requirements: [
      {
        key: "req-1",
        statement: "Base requirement",
        priority: "must",
        kind: "functional",
        criteria: [{ key: "c1", required: true, method: "test", expected: "ok" }],
      },
    ],
  });

  // Step depends on a non-existent step
  const unscopedRes = await request(base, `/api/v1/goals/${goal.id}/plans`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie, "x-csrf-token": csrfToken },
    body: JSON.stringify({
      steps: [
        { key: "step-a", objective: "Do A", dependsOn: ["phantom-step-z"] },
      ],
    }),
  });
  assert.equal(unscopedRes.status, 400);
  const unscopedBody = await unscopedRes.json();
  assert.match(unscopedBody.detail, /unscoped step/);

  // Cleanup
  await query("DELETE FROM projects WHERE id = $1", [project.id]);
});

test("Stage 09 Plan creation, twenty layers normalization, and revision lifecycle", async (t) => {
  const base = await serve(t, createTestApp());
  const { cookie, csrfToken, workspaceId } = await createAuthenticatedSession(base);

  const project = await ProjectService.createProject({
    workspaceId,
    name: "Plan Lifecycle Project",
    primaryPath: "C:\\Workspace\\PlanLifecycleProject",
  });
  const conversation = await ProjectService.createConversation(project.id, {
    title: "Plan Discussion",
  });
  const goal = await IntentRequirementService.createGoalFromConversation(conversation.id, {});
  const reqRev = await IntentRequirementService.createRequirementRevision(goal.id, {
    requirements: [
      {
        key: "req-auth",
        statement: "JWT authentication required",
        priority: "must",
        kind: "functional",
        criteria: [{ key: "c1", required: true, method: "test", expected: "token signed" }],
      },
    ],
  });

  // 1. Create initial plan
  const createRes = await request(base, `/api/v1/goals/${goal.id}/plans`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie, "x-csrf-token": csrfToken },
    body: JSON.stringify({
      requirementRevisionId: reqRev.id,
      steps: [
        { key: "step-1", objective: "Setup project structure", dependsOn: [] },
        { key: "step-2", objective: "Implement auth middleware", dependsOn: ["step-1"] },
        { key: "step-3", objective: "Verify token verification", dependsOn: ["step-2"] },
      ],
      reason: "Initial architecture plan",
    }),
  });
  assert.equal(createRes.status, 201);
  const createBody = await createRes.json();
  assert.ok(createBody.data.plan.id);
  assert.equal(createBody.data.plan.revision, 1);
  assert.ok(createBody.data.plan.digest);
  assert.equal(createBody.data.plan.steps.length, 3);
  // Verify all 20 layers are normalized
  assert.equal(Object.keys(createBody.data.plan.layers).length, 20);
  assert.ok(createBody.data.plan.layers.security);
  assert.ok(createBody.data.plan.layers.infrastructure);
  const planId = createBody.data.plan.planId;
  const rev1Id = createBody.data.plan.id;

  // 2. List plans for goal
  const listRes = await request(base, `/api/v1/goals/${goal.id}/plans`, {
    headers: { Cookie: cookie },
  });
  assert.equal(listRes.status, 200);
  const listBody = await listRes.json();
  assert.ok(listBody.data.plans.length >= 1);

  // 3. Get exact plan revision by ID
  const getRes = await request(base, `/api/v1/plan-revisions/${rev1Id}`, {
    headers: { Cookie: cookie },
  });
  assert.equal(getRes.status, 200);
  const getBody = await getRes.json();
  assert.equal(getBody.data.revision.id, rev1Id);

  // 4. Create new plan revision with stale baseRevisionId -> returns 409 BASE_CHANGED
  const staleRes = await request(base, `/api/v1/plans/${planId}/revisions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie, "x-csrf-token": csrfToken },
    body: JSON.stringify({
      baseRevisionId: "00000000-0000-0000-0000-000000000000",
      steps: [{ key: "step-1", objective: "Updated step", dependsOn: [] }],
    }),
  });
  assert.equal(staleRes.status, 409);
  const staleBody = await staleRes.json();
  assert.match(staleBody.detail, /changed since base revision/);

  // 5. Create new plan revision with correct baseRevisionId
  const rev2Res = await request(base, `/api/v1/plans/${planId}/revisions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie, "x-csrf-token": csrfToken },
    body: JSON.stringify({
      baseRevisionId: rev1Id,
      steps: [
        { key: "step-1", objective: "Setup project structure", dependsOn: [] },
        { key: "step-2", objective: "Implement auth middleware with RS256", dependsOn: ["step-1"] },
      ],
      reason: "Refined auth algorithm",
    }),
  });
  assert.equal(rev2Res.status, 201);
  const rev2Body = await rev2Res.json();
  assert.equal(rev2Body.data.plan.revision, 2);
  assert.equal(rev2Body.data.plan.reason, "Refined auth algorithm");

  // Cleanup
  await query("DELETE FROM projects WHERE id = $1", [project.id]);
});

test("Stage 09 Build Contract creation, canonical digest, diff detection, and approval requests", async (t) => {
  const base = await serve(t, createTestApp());
  const { cookie, csrfToken, workspaceId } = await createAuthenticatedSession(base);

  const project = await ProjectService.createProject({
    workspaceId,
    name: "Build Contract Project",
    primaryPath: "C:\\Workspace\\ContractProject",
  });
  const conversation = await ProjectService.createConversation(project.id, {
    title: "Contract Discussion",
  });
  const goal = await IntentRequirementService.createGoalFromConversation(conversation.id, {});
  const reqRev = await IntentRequirementService.createRequirementRevision(goal.id, {
    requirements: [
      {
        key: "req-storage",
        statement: "Encrypted data at rest",
        priority: "must",
        kind: "nonfunctional",
        criteria: [{ key: "c1", required: true, method: "audit", expected: "AES-256" }],
      },
    ],
  });
  const planRev = await PlanningContractService.createPlan(goal.id, {
    requirementRevisionId: reqRev.id,
    steps: [{ key: "step-1", objective: "Setup AES storage", dependsOn: [] }],
  });

  const validContractDoc = {
    goal: {
      goalId: goal.id,
      title: "Encrypted Storage Build Contract",
      problemDefinition: "Unencrypted storage vulnerability",
      expectedOutcome: "Zero unencrypted bytes on disk",
    },
    requirements: {
      revisionId: reqRev.id,
      digest: reqRev.digest,
      functionalIds: [],
      nonfunctionalIds: ["req-storage"],
    },
    technologyStack: [
      { component: "cipher", selectedTechnology: "aes-256-gcm", rationale: "Authenticated encryption" },
    ],
    architecture: {
      planRevisionId: planRev.id,
      planDigest: planRev.digest,
    },
    cost: {
      projectCeilingMicroUsd: 500000,
      currency: "USD",
    },
    permissions: {
      networkAllowlist: ["127.0.0.1"],
    },
    security: {
      classification: "internal",
    },
    acceptance: {
      requirementRevisionId: reqRev.id,
      requiredCriterionIds: ["c1"],
    },
    verification: {
      suiteRevision: "v1",
      evidenceRequirements: ["aes_validation_report"],
    },
    autonomyMode: "supervised",
  };

  // 1. Missing required sections returns 400 CONTRACT_INCOMPLETE
  const incompleteRes = await request(base, `/api/v1/goals/${goal.id}/contracts`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie, "x-csrf-token": csrfToken },
    body: JSON.stringify({
      planRevisionId: planRev.id,
      document: { goal: validContractDoc.goal }, // missing requirements, acceptance, verification
    }),
  });
  assert.equal(incompleteRes.status, 400);
  const incompleteBody = await incompleteRes.json();
  assert.match(incompleteBody.detail, /missing required section/);

  // 2. Successful contract creation
  const createContractRes = await request(base, `/api/v1/goals/${goal.id}/contracts`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie, "x-csrf-token": csrfToken },
    body: JSON.stringify({
      planRevisionId: planRev.id,
      document: validContractDoc,
      reason: "Initial baseline contract",
    }),
  });
  assert.equal(createContractRes.status, 201);
  const createContractBody = await createContractRes.json();
  assert.ok(createContractBody.data.contract.id);
  assert.equal(createContractBody.data.contract.revision, 1);
  assert.ok(createContractBody.data.contract.digest);
  const contractId = createContractBody.data.contract.contractId;
  const contractRev1Id = createContractBody.data.contract.id;
  const digest1 = createContractBody.data.contract.digest;

  // 3. Create second revision of contract with increased budget
  const updatedDoc = {
    ...validContractDoc,
    cost: {
      projectCeilingMicroUsd: 1000000, // increased ceiling
      currency: "USD",
    },
  };
  const createRev2Res = await request(base, `/api/v1/contracts/${contractId}/revisions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie, "x-csrf-token": csrfToken },
    body: JSON.stringify({
      baseRevisionId: contractRev1Id,
      document: updatedDoc,
      reason: "Increased project ceiling",
    }),
  });
  assert.equal(createRev2Res.status, 201);
  const createRev2Body = await createRev2Res.json();
  assert.equal(createRev2Body.data.contract.revision, 2);
  const contractRev2Id = createRev2Body.data.contract.id;
  const digest2 = createRev2Body.data.contract.digest;
  assert.notEqual(digest1, digest2);

  // 4. Diff contract revisions
  const diffRes = await request(base, `/api/v1/contract-revisions/${contractRev2Id}/diff?against=${contractRev1Id}`, {
    headers: { Cookie: cookie },
  });
  assert.equal(diffRes.status, 200);
  const diffBody = await diffRes.json();
  assert.equal(diffBody.data.fromDigest, digest1);
  assert.equal(diffBody.data.toDigest, digest2);
  assert.ok(diffBody.data.changes.length > 0);
  assert.ok(diffBody.data.changes.some((c) => c.path === "cost" && c.material === true));
  assert.equal(diffBody.data.requiresApproval, true);

  // 5. Approval request with wrong digest returns 400 DIGEST_MISMATCH
  const wrongDigestRes = await request(base, `/api/v1/contract-revisions/${contractRev2Id}/approval-requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie, "x-csrf-token": csrfToken },
    body: JSON.stringify({ digest: "0000000000000000000000000000000000000000000000000000000000000000" }),
  });
  assert.equal(wrongDigestRes.status, 400);
  const wrongDigestBody = await wrongDigestRes.json();
  assert.match(wrongDigestBody.detail, /does not match the immutable contract revision digest/);

  // 6. Approval request with matching digest generates approval and nonce
  const approvalRes = await request(base, `/api/v1/contract-revisions/${contractRev2Id}/approval-requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie, "x-csrf-token": csrfToken },
    body: JSON.stringify({ digest: digest2 }),
  });
  assert.equal(approvalRes.status, 201);
  const approvalBody = await approvalRes.json();
  assert.ok(approvalBody.data.approval.id);
  assert.equal(approvalBody.data.approval.digest, digest2);
  assert.equal(approvalBody.data.approval.state, "pending");
  assert.ok(approvalBody.data.approval.nonce); // Strictly once returned nonce

  // Cleanup
  await query("DELETE FROM projects WHERE id = $1", [project.id]);
});

test("Stage 09 admission allows Stage 09 routes and denies unqualified Stage 10+ routes (503)", async (t) => {
  const base = await serve(t, createTestApp());
  const { cookie } = await createAuthenticatedSession(base);

  // Admitted Stage 09 endpoint returns 404 (for dummy id), not 503
  const planRes = await request(base, "/api/v1/goals/00000000-0000-0000-0000-000000000000/plans", {
    headers: { Cookie: cookie },
  });
  assert.notEqual(planRes.status, 503);

  // Unqualified Stage 10+ route is denied with 503
  const unqualifiedRes = await request(base, "/api/v1/developer-connections/00000000-0000-0000-0000-000000000000/qualify", {
    headers: { Cookie: cookie },
  });
  assert.equal(unqualifiedRes.status, 503);
  const body = await unqualifiedRes.json();
  assert.equal(body.code, "CAPABILITY_UNAVAILABLE");
  assert.equal(body.detail, "Capability is not qualified");
});
