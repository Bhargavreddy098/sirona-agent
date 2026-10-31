import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { loadEnvironment } from "../server.js";
import { readRuntimeConfig } from "../foundation/runtimeConfig.js";
import { createLogger } from "../foundation/logger.js";
import { createDatabaseOwner, activateDatabaseOwner, query } from "../config/db.js";
import { createApp } from "../app.js";
import { createHealthController } from "../controllers/healthController.js";
import apiRoutes from "../routes/index.js";
import { stage08Admission } from "../foundation/admission.js";
import { generateLauncherChallenge } from "../services/launcherChallenge.js";
import { ProjectService } from "../services/projectService.js";
import { IntentRequirementService } from "../services/intentRequirementService.js";
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
    admission: stage08Admission,
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

test("unauthenticated requests to intent endpoints return 401", async (t) => {
  const base = await serve(t, createTestApp());
  const res = await request(base, "/api/v1/goals/00000000-0000-0000-0000-000000000000", { method: "GET" });
  assert.equal(res.status, 401);
  const body = await res.json();
  assert.equal(body.code, "UNAUTHENTICATED");
});

test("intent mutations without CSRF token return 403", async (t) => {
  const base = await serve(t, createTestApp());
  const { cookie } = await createAuthenticatedSession(base);

  const res = await request(base, "/api/v1/conversations/00000000-0000-0000-0000-000000000000/goals", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({}),
  });
  assert.equal(res.status, 403);
  const body = await res.json();
  assert.equal(body.code, "POLICY_DENIED");
});

test("Stage 08 goal creation, scope validation and retrieval", async (t) => {
  const base = await serve(t, createTestApp());
  const { cookie, csrfToken, workspaceId } = await createAuthenticatedSession(base);

  const project = await ProjectService.createProject({
    workspaceId,
    name: "Intent Test Project",
    description: "Stage 08 verification",
    primaryPath: "C:\\Workspace\\Stage08Project",
  });
  const conversation = await ProjectService.createConversation(project.id, {
    title: "Stage 08 Discussion",
  });
  const otherConversation = await ProjectService.createConversation(project.id, {
    title: "Other Discussion",
  });

  const msgRes = await query(
    "INSERT INTO messages (session_id, role, content, tokens, created_at) VALUES ($1, 'user', 'Implement user auth module', 10, NOW()) RETURNING id",
    [conversation.id]
  );
  const messageId = msgRes.rows[0].id;

  const otherMsgRes = await query(
    "INSERT INTO messages (session_id, role, content, tokens, created_at) VALUES ($1, 'user', 'Unrelated message', 5, NOW()) RETURNING id",
    [otherConversation.id]
  );
  const otherMessageId = otherMsgRes.rows[0].id;

  // 1. Scope mismatch: messageId from other conversation returns 400 MESSAGE_SCOPE_MISMATCH
  const mismatchRes = await request(base, `/api/v1/conversations/${conversation.id}/goals`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie, "x-csrf-token": csrfToken },
    body: JSON.stringify({ messageId: otherMessageId }),
  });
  assert.equal(mismatchRes.status, 400);
  const mismatchBody = await mismatchRes.json();
  assert.match(mismatchBody.detail, /does not belong to conversation/);

  // 2. Successful goal creation from conversation
  const createRes = await request(base, `/api/v1/conversations/${conversation.id}/goals`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie, "x-csrf-token": csrfToken },
    body: JSON.stringify({
      messageId,
      constraints: [{ key: "security", value: "JWT with RS256" }],
      autonomyMode: "supervised",
    }),
  });
  assert.equal(createRes.status, 201);
  const createBody = await createRes.json();
  assert.ok(createBody.data.goal.id);
  assert.equal(createBody.data.goal.intent, "Implement user auth module");
  assert.equal(createBody.data.goal.status, "active");
  assert.equal(createBody.data.goal.autonomyMode, "supervised");
  const goalId = createBody.data.goal.id;

  // 3. List goals for project
  const listRes = await request(base, `/api/v1/projects/${project.id}/goals`, {
    headers: { Cookie: cookie },
  });
  assert.equal(listRes.status, 200);
  const listBody = await listRes.json();
  assert.ok(Array.isArray(listBody.data.goals));
  assert.ok(listBody.data.goals.some((g) => g.id === goalId));

  // 4. Retrieve single goal by ID
  const getRes = await request(base, `/api/v1/goals/${goalId}`, {
    headers: { Cookie: cookie },
  });
  assert.equal(getRes.status, 200);
  const getBody = await getRes.json();
  assert.equal(getBody.data.goal.id, goalId);

  // Cleanup
  await query("DELETE FROM projects WHERE id = $1", [project.id]);
});

test("Stage 08 intent analysis and research report generation", async (t) => {
  const base = await serve(t, createTestApp());
  const { cookie, csrfToken, workspaceId } = await createAuthenticatedSession(base);

  const project = await ProjectService.createProject({
    workspaceId,
    name: "Intent Analysis Project",
    primaryPath: "C:\\Workspace\\AnalysisProject",
  });
  const conversation = await ProjectService.createConversation(project.id, {
    title: "Analysis Conversation",
  });

  const msgRes = await query(
    "INSERT INTO messages (session_id, role, content, tokens, created_at) VALUES ($1, 'user', 'Build a caching layer with Redis', 15, NOW()) RETURNING id",
    [conversation.id]
  );
  const messageId = msgRes.rows[0].id;

  const goal = await IntentRequirementService.createGoalFromConversation(conversation.id, { messageId });

  // 1. Structured intent analysis
  const analysisRes = await request(base, `/api/v1/goals/${goal.id}/intent-analysis`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie, "x-csrf-token": csrfToken },
    body: JSON.stringify({ inputMessageIds: [messageId] }),
  });
  assert.equal(analysisRes.status, 200);
  const analysisBody = await analysisRes.json();
  assert.ok(analysisBody.data.intentAnalysis.id);
  assert.equal(analysisBody.data.intentAnalysis.literalRequest, "Build a caching layer with Redis");
  assert.ok(Array.isArray(analysisBody.data.intentAnalysis.assumptions));

  // 2. Bounded research: validation error on empty questions
  const emptyResearchRes = await request(base, `/api/v1/goals/${goal.id}/research`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie, "x-csrf-token": csrfToken },
    body: JSON.stringify({ questions: [] }),
  });
  assert.equal(emptyResearchRes.status, 400);

  // 3. Bounded research: successful generation with questions
  const researchRes = await request(base, `/api/v1/goals/${goal.id}/research`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie, "x-csrf-token": csrfToken },
    body: JSON.stringify({
      questions: ["What Redis eviction policy fits best?", "What is the memory footprint?"],
      allowedSources: ["redis.io/docs", "internal-standards"],
    }),
  });
  assert.equal(researchRes.status, 200);
  const researchBody = await researchRes.json();
  assert.ok(researchBody.data.report.id);
  assert.equal(researchBody.data.report.questions.length, 2);
  assert.equal(researchBody.data.report.conclusions.length, 2);

  // 4. List research reports
  const listReportsRes = await request(base, `/api/v1/goals/${goal.id}/research`, {
    headers: { Cookie: cookie },
  });
  assert.equal(listReportsRes.status, 200);
  const listReportsBody = await listReportsRes.json();
  assert.ok(listReportsBody.data.reports.length >= 1);

  // Cleanup
  await query("DELETE FROM projects WHERE id = $1", [project.id]);
});

test("Stage 08 clarification lifecycle: question, answer, and double-answer rejection (409)", async (t) => {
  const base = await serve(t, createTestApp());
  const { cookie, csrfToken, workspaceId } = await createAuthenticatedSession(base);

  const project = await ProjectService.createProject({
    workspaceId,
    name: "Clarification Project",
    primaryPath: "C:\\Workspace\\ClarificationProject",
  });
  const conversation = await ProjectService.createConversation(project.id, {
    title: "Clarification Conversation",
  });
  const goal = await IntentRequirementService.createGoalFromConversation(conversation.id, {});

  // 1. Create a clarification question
  const createClarRes = await request(base, `/api/v1/goals/${goal.id}/clarifications`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie, "x-csrf-token": csrfToken },
    body: JSON.stringify({
      question: "Which database schema migration tool should we adopt?",
      materiality: "material",
      options: [
        { id: "opt-1", label: "Custom SQL scripts" },
        { id: "opt-2", label: "Flyway" },
      ],
    }),
  });
  assert.equal(createClarRes.status, 201);
  const createClarBody = await createClarRes.json();
  const clarId = createClarBody.data.clarification.id;
  assert.equal(createClarBody.data.clarification.status, "pending");

  // 2. List clarifications
  const listClarRes = await request(base, `/api/v1/goals/${goal.id}/clarifications`, {
    headers: { Cookie: cookie },
  });
  assert.equal(listClarRes.status, 200);
  const listClarBody = await listClarRes.json();
  assert.equal(listClarBody.data.clarifications.length, 1);

  // 3. Answer clarification
  const answerRes = await request(base, `/api/v1/clarifications/${clarId}/answers`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie, "x-csrf-token": csrfToken },
    body: JSON.stringify({
      selectedOptionId: "opt-1",
    }),
  });
  assert.equal(answerRes.status, 200);
  const answerBody = await answerRes.json();
  assert.equal(answerBody.data.clarification.status, "answered");
  assert.equal(answerBody.data.clarification.answer, "Custom SQL scripts");

  // 4. Double-answer rejection: returns 409 ALREADY_RESOLVED
  const doubleAnswerRes = await request(base, `/api/v1/clarifications/${clarId}/answers`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie, "x-csrf-token": csrfToken },
    body: JSON.stringify({
      answer: "Alternative answer",
    }),
  });
  assert.equal(doubleAnswerRes.status, 409);
  const doubleBody = await doubleAnswerRes.json();
  assert.equal(doubleBody.code, "STATE_CONFLICT");
  assert.match(doubleBody.detail, /already answered/);

  // Cleanup
  await query("DELETE FROM projects WHERE id = $1", [project.id]);
});

test("Stage 08 requirement revisions: criteria validation & unresolved clarification blocking (409)", async (t) => {
  const base = await serve(t, createTestApp());
  const { cookie, csrfToken, workspaceId } = await createAuthenticatedSession(base);

  const project = await ProjectService.createProject({
    workspaceId,
    name: "Requirements Project",
    primaryPath: "C:\\Workspace\\RequirementsProject",
  });
  const conversation = await ProjectService.createConversation(project.id, {
    title: "Requirements Conversation",
  });
  const goal = await IntentRequirementService.createGoalFromConversation(conversation.id, {});

  // 1. Add an unresolved material clarification
  const clar = await IntentRequirementService.createClarification(goal.id, {
    question: "Do we require multi-tenant isolation?",
    materiality: "material",
    options: [{ id: "opt-yes", label: "Yes" }, { id: "opt-no", label: "No" }],
  });

  // Attempt to create requirement revision while material question is unresolved -> 409 UNRESOLVED_MATERIAL_QUESTION
  const blockedRevRes = await request(base, `/api/v1/goals/${goal.id}/requirement-revisions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie, "x-csrf-token": csrfToken },
    body: JSON.stringify({
      requirements: [
        {
          key: "req-1",
          statement: "Multi-tenant tenant ID in all tables",
          priority: "must",
          kind: "functional",
          criteria: [{ key: "c1", required: true, method: "schema-inspect", expected: "tenant_id NOT NULL" }],
        },
      ],
    }),
  });
  assert.equal(blockedRevRes.status, 409);
  const blockedBody = await blockedRevRes.json();
  assert.match(blockedBody.detail, /material clarification.*unresolved/);

  // 2. Resolve the clarification
  await IntentRequirementService.answerClarification(clar.id, { selectedOptionId: "opt-yes" });

  // 3. Must-have requirement missing criteria -> 400 MISSING_REQUIRED_CRITERIA
  const missingCriteriaRes = await request(base, `/api/v1/goals/${goal.id}/requirement-revisions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie, "x-csrf-token": csrfToken },
    body: JSON.stringify({
      requirements: [
        {
          key: "req-1",
          statement: "Must-have requirement with no criteria",
          priority: "must",
          kind: "functional",
          criteria: [],
        },
      ],
    }),
  });
  assert.equal(missingCriteriaRes.status, 400);
  const missingBody = await missingCriteriaRes.json();
  assert.match(missingBody.detail, /requires at least one acceptance criterion/);

  // 4. Valid requirement revision creation
  const validRevRes = await request(base, `/api/v1/goals/${goal.id}/requirement-revisions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie, "x-csrf-token": csrfToken },
    body: JSON.stringify({
      requirements: [
        {
          key: "req-1",
          statement: "Multi-tenant tenant ID in all tables",
          priority: "must",
          kind: "functional",
          criteria: [{ key: "c1", required: true, method: "schema-inspect", expected: "tenant_id NOT NULL" }],
        },
        {
          key: "req-2",
          statement: "Read replicas for analytics",
          priority: "should",
          kind: "nonfunctional",
          criteria: [],
        },
      ],
      assumptions: [{ key: "a1", statement: "PostgreSQL 17 is target runtime" }],
      exclusions: ["No legacy MySQL support"],
    }),
  });
  assert.equal(validRevRes.status, 201);
  const validBody = await validRevRes.json();
  assert.ok(validBody.data.requirementRevision.id);
  assert.equal(validBody.data.requirementRevision.revision, 1);
  assert.ok(validBody.data.requirementRevision.digest);
  const revId = validBody.data.requirementRevision.id;

  // 5. List requirement revisions
  const listRevRes = await request(base, `/api/v1/goals/${goal.id}/requirement-revisions`, {
    headers: { Cookie: cookie },
  });
  assert.equal(listRevRes.status, 200);
  const listRevBody = await listRevRes.json();
  assert.equal(listRevBody.data.revisions.length, 1);

  // 6. Get single requirement revision by ID
  const getRevRes = await request(base, `/api/v1/requirement-revisions/${revId}`, {
    headers: { Cookie: cookie },
  });
  assert.equal(getRevRes.status, 200);
  const getRevBody = await getRevRes.json();
  assert.equal(getRevBody.data.revision.id, revId);

  // Verify goal active requirement revision ID was updated
  const updatedGoal = await IntentRequirementService.getGoalById(goal.id);
  assert.equal(updatedGoal.activeRequirementRevisionId, revId);
  assert.equal(updatedGoal.status, "ready_for_planning");

  // Cleanup
  await query("DELETE FROM projects WHERE id = $1", [project.id]);
});

test("Stage 08 decisions tracking: creation and listing", async (t) => {
  const base = await serve(t, createTestApp());
  const { cookie, csrfToken, workspaceId } = await createAuthenticatedSession(base);

  const project = await ProjectService.createProject({
    workspaceId,
    name: "Decisions Project",
    primaryPath: "C:\\Workspace\\DecisionsProject",
  });
  const conversation = await ProjectService.createConversation(project.id, {
    title: "Decisions Conversation",
  });
  const goal = await IntentRequirementService.createGoalFromConversation(conversation.id, {});

  // 1. Create a decision
  const decRes = await request(base, `/api/v1/goals/${goal.id}/decisions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie, "x-csrf-token": csrfToken },
    body: JSON.stringify({
      proposal: "Use Argon2id for password hashing",
      alternatives: ["bcrypt", "PBKDF2"],
      status: "accepted",
      rationale: "Argon2id provides state-of-the-art resistance to GPU and side-channel attacks",
    }),
  });
  assert.equal(decRes.status, 201);
  const decBody = await decRes.json();
  assert.ok(decBody.data.decision.id);
  assert.equal(decBody.data.decision.proposal, "Use Argon2id for password hashing");
  assert.equal(decBody.data.decision.status, "accepted");

  // 2. List decisions
  const listDecRes = await request(base, `/api/v1/goals/${goal.id}/decisions`, {
    headers: { Cookie: cookie },
  });
  assert.equal(listDecRes.status, 200);
  const listDecBody = await listDecRes.json();
  assert.equal(listDecBody.data.decisions.length, 1);
  assert.equal(listDecBody.data.decisions[0].proposal, "Use Argon2id for password hashing");

  // Cleanup
  await query("DELETE FROM projects WHERE id = $1", [project.id]);
});

test("Stage 08 admission allows Stage 08 routes and denies unqualified Stage 09+ routes (503)", async (t) => {
  const base = await serve(t, createTestApp());
  const { cookie, csrfToken } = await createAuthenticatedSession(base);

  // Unqualified Stage 09 plan creation route is blocked with 503
  const unqualifiedRes = await request(base, "/api/v1/goals/00000000-0000-0000-0000-000000000000/plans", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie, "x-csrf-token": csrfToken },
    body: JSON.stringify({}),
  });
  assert.equal(unqualifiedRes.status, 503);
  const body = await unqualifiedRes.json();
  assert.equal(body.code, "CAPABILITY_UNAVAILABLE");
  assert.equal(body.detail, "Capability is not qualified");
});
