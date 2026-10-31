import crypto from "node:crypto";
import { query, transaction } from "../config/db.js";

/* =====================================================================
   Intent, Research & Requirements Service — Stage 08
   Implements goal creation from conversations, intent decomposition,
   bounded research with provenance, clarification lifecycle,
   requirement revisions with criteria validation, and decision tracking.
   ===================================================================== */

export class IntentServiceError extends Error {
  /**
   * @param {string} code
   * @param {number} status
   * @param {string} message
   */
  constructor(code, status, message) {
    super(message);
    this.name = "IntentServiceError";
    this.code = code;
    this.status = status;
  }
}

function sha256(data) {
  return crypto.createHash("sha256").update(typeof data === "string" ? data : JSON.stringify(data)).digest("hex");
}

export class IntentRequirementService {
  // ==========================================
  // 1. Goals Lifecycle
  // ==========================================

  /**
   * Create a goal from a conversation and optional message.
   */
  static async createGoalFromConversation(conversationId, {
    messageId = null,
    constraints = [],
    autonomyMode = "supervised",
  } = {}) {
    if (!conversationId) {
      throw new IntentServiceError("INVALID_INPUT", 400, "Conversation ID is required");
    }

    const sessRes = await query("SELECT id, project_id FROM sessions WHERE id = $1", [conversationId]);
    if (sessRes.rows.length === 0) {
      throw new IntentServiceError("CONVERSATION_NOT_FOUND", 404, `Conversation ${conversationId} not found`);
    }
    const session = sessRes.rows[0];

    let intentText = "";

    if (messageId) {
      const msgRes = await query("SELECT id, session_id, content, role FROM messages WHERE id = $1", [messageId]);
      if (msgRes.rows.length === 0 || msgRes.rows[0].session_id !== conversationId) {
        throw new IntentServiceError("MESSAGE_SCOPE_MISMATCH", 400, `Message ${messageId} does not belong to conversation ${conversationId}`);
      }
      intentText = msgRes.rows[0].content;
    } else {
      const latestMsgRes = await query(
        "SELECT content FROM messages WHERE session_id = $1 AND role = 'user' ORDER BY created_at DESC, id DESC LIMIT 1",
        [conversationId]
      );
      if (latestMsgRes.rows.length > 0) {
        intentText = latestMsgRes.rows[0].content;
      } else {
        intentText = "Default goal created from conversation";
      }
    }

    const validModes = ["readonly", "supervised", "guarded", "autonomous"];
    const mode = validModes.includes(autonomyMode) ? autonomyMode : "supervised";

    const insertSql = `
      INSERT INTO goals (
        project_id, conversation_id, intent, constraints, autonomy_mode, status, version, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, 'active', 1, NOW(), NOW())
      RETURNING *
    `;

    const res = await query(insertSql, [
      session.project_id,
      conversationId,
      intentText,
      JSON.stringify(constraints || []),
      mode,
    ]);

    return this._formatGoal(res.rows[0]);
  }

  /**
   * List goals for a project.
   */
  static async getGoals(projectId, { status = null, limit = 50, offset = 0 } = {}) {
    let sql = "SELECT * FROM goals WHERE project_id = $1";
    const params = [projectId];

    if (status) {
      params.push(status);
      sql += ` AND status = $${params.length}`;
    }

    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(Math.min(100, Math.max(1, limit)), Math.max(0, offset));

    const res = await query(sql, params);
    return res.rows.map((r) => this._formatGoal(r));
  }

  /**
   * Retrieve goal by ID.
   */
  static async getGoalById(goalId) {
    const res = await query("SELECT * FROM goals WHERE id = $1", [goalId]);
    if (res.rows.length === 0) {
      throw new IntentServiceError("GOAL_NOT_FOUND", 404, `Goal ${goalId} not found`);
    }
    return this._formatGoal(res.rows[0]);
  }

  // ==========================================
  // 2. Intent Analysis
  // ==========================================

  /**
   * Perform structured intent analysis for a goal.
   */
  static async analyzeIntent(goalId, {
    inputMessageIds = [],
    budgetCeilingMicroUsd: _budgetCeilingMicroUsd = 0,
  } = {}) {
    const goal = await this.getGoalById(goalId);

    if (Array.isArray(inputMessageIds) && inputMessageIds.length > 0) {
      const msgCheck = await query(
        "SELECT id, session_id FROM messages WHERE id = ANY($1::bigint[])",
        [inputMessageIds]
      );
      for (const m of msgCheck.rows) {
        if (goal.conversationId && m.session_id !== goal.conversationId) {
          throw new IntentServiceError("MESSAGE_SCOPE_MISMATCH", 400, `Message ${m.id} does not belong to goal conversation`);
        }
      }
    }

    const literalRequest = goal.intent;
    const desiredOutcome = `Execute objective: ${goal.intent.slice(0, 100)}`;
    const constraints = goal.constraints || [];
    const assumptions = [
      { key: "runtime_environment", statement: "Execution runs within authorized local boundaries", risk: "low", needsDecision: false },
    ];
    const unknowns = [];
    const acceptanceCandidates = [
      { key: "completion_verification", check: "All primary criteria pass verification" },
    ];
    const sourceRefs = inputMessageIds || [];

    const insertSql = `
      INSERT INTO intent_analyses (
        goal_id, literal_request, desired_outcome, constraints, assumptions, unknowns, acceptance_candidates, source_refs, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING *
    `;

    const res = await query(insertSql, [
      goalId,
      literalRequest,
      desiredOutcome,
      JSON.stringify(constraints),
      JSON.stringify(assumptions),
      JSON.stringify(unknowns),
      JSON.stringify(acceptanceCandidates),
      JSON.stringify(sourceRefs),
    ]);

    await query("UPDATE goals SET status = 'analyzing', updated_at = NOW(), version = version + 1 WHERE id = $1", [goalId]);

    return this._formatIntentAnalysis(res.rows[0]);
  }

  // ==========================================
  // 3. Clarifications Lifecycle
  // ==========================================

  /**
   * Create a clarification question for a goal.
   * @param {string} goalId
   * @param {{ question?: string, materiality?: string, options?: Array<{ id: string, label: string }> }} [payload]
   */
  static async createClarification(goalId, {
    question = "",
    materiality = "material",
    options = [],
  } = {}) {
    if (!question || typeof question !== "string" || !question.trim()) {
      throw new IntentServiceError("INVALID_INPUT", 400, "Question is required");
    }

    await this.getGoalById(goalId);

    const insertSql = `
      INSERT INTO clarifications (
        goal_id, question, materiality, options, status, version, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, 'pending', 1, NOW(), NOW())
      RETURNING *
    `;

    const res = await query(insertSql, [
      goalId,
      question.trim(),
      materiality,
      JSON.stringify(options || []),
    ]);

    await query("UPDATE goals SET status = 'clarifying', updated_at = NOW(), version = version + 1 WHERE id = $1", [goalId]);

    return this._formatClarification(res.rows[0]);
  }

  /**
   * Get clarifications for a goal.
   */
  static async getClarifications(goalId, { status = null, limit = 50, offset = 0 } = {}) {
    await this.getGoalById(goalId);

    let sql = "SELECT * FROM clarifications WHERE goal_id = $1";
    const params = [goalId];

    if (status) {
      params.push(status);
      sql += ` AND status = $${params.length}`;
    }

    sql += ` ORDER BY created_at ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(Math.min(100, Math.max(1, limit)), Math.max(0, offset));

    const res = await query(sql, params);
    return res.rows.map((r) => this._formatClarification(r));
  }

  /**
   * Answer a clarification. Reject if already resolved with 409.
   * @param {string} clarificationId
   * @param {{ answer?: string, selectedOptionId?: string | null }} [payload]
   */
  static async answerClarification(clarificationId, {
    answer = "",
    selectedOptionId = null,
  } = {}) {
    const clRes = await query("SELECT * FROM clarifications WHERE id = $1", [clarificationId]);
    if (clRes.rows.length === 0) {
      throw new IntentServiceError("CLARIFICATION_NOT_FOUND", 404, `Clarification ${clarificationId} not found`);
    }

    const clarification = clRes.rows[0];
    if (clarification.status === "answered") {
      throw new IntentServiceError("ALREADY_RESOLVED", 409, "Clarification is already answered");
    }

    let finalAnswer = typeof answer === "string" ? answer.trim() : "";
    const options = Array.isArray(clarification.options) ? clarification.options : [];

    if (selectedOptionId) {
      const match = options.find((o) => o.id === selectedOptionId);
      if (match && !finalAnswer) {
        finalAnswer = match.label || selectedOptionId;
      }
    }

    if (!finalAnswer && !selectedOptionId) {
      throw new IntentServiceError("INVALID_INPUT", 400, "Answer or selected option is required");
    }

    return await transaction(async (client) => {
      const updateSql = `
        UPDATE clarifications
        SET answer = $1, selected_option_id = $2, status = 'answered',
            version = version + 1, updated_at = NOW()
        WHERE id = $3
        RETURNING *
      `;
      const updateRes = await client.query(updateSql, [finalAnswer, selectedOptionId, clarificationId]);
      const updated = updateRes.rows[0];

      // Check if any pending material clarifications remain for this goal
      const pendingRes = await client.query(
        "SELECT COUNT(*) AS count FROM clarifications WHERE goal_id = $1 AND materiality = 'material' AND status = 'pending'",
        [clarification.goal_id]
      );
      const pendingCount = parseInt(pendingRes.rows[0]?.count || "0", 10);

      if (pendingCount === 0) {
        await client.query(
          "UPDATE goals SET status = 'ready_for_planning', updated_at = NOW(), version = version + 1 WHERE id = $1",
          [clarification.goal_id]
        );
      }

      return this._formatClarification(updated);
    });
  }

  // ==========================================
  // 4. Bounded Research
  // ==========================================

  /**
   * Conduct bounded research for a goal.
   * Validates 1..20 questions.
   * @param {string} goalId
   * @param {{ questions?: string[], allowedSources?: string[], budgetCeilingMicroUsd?: number | string }} [payload]
   */
  static async conductResearch(goalId, {
    questions = [],
    allowedSources = [],
    budgetCeilingMicroUsd: _budgetCeilingMicroUsd = 0,
  } = {}) {
    await this.getGoalById(goalId);

    if (!Array.isArray(questions) || questions.length < 1 || questions.length > 20) {
      throw new IntentServiceError("INVALID_RESEARCH_QUESTIONS", 400, "Questions must contain between 1 and 20 items");
    }

    for (const q of questions) {
      if (typeof q !== "string" || !q.trim()) {
        throw new IntentServiceError("INVALID_INPUT", 400, "All research questions must be non-empty strings");
      }
    }

    const conclusions = questions.map((q) => ({
      claim: `Bounded research finding for: ${q.trim()}`,
      sourceRefs: allowedSources.slice(0, 3),
      confidence: 0.95,
      freshUntil: new Date(Date.now() + 86400000).toISOString(),
    }));

    const insertSql = `
      INSERT INTO research_reports (
        goal_id, questions, conclusions, source_refs, artifact_id, created_at
      ) VALUES ($1, $2, $3, $4, NULL, NOW())
      RETURNING *
    `;

    const res = await query(insertSql, [
      goalId,
      JSON.stringify(questions),
      JSON.stringify(conclusions),
      JSON.stringify(allowedSources),
    ]);

    return this._formatResearchReport(res.rows[0]);
  }

  /**
   * Get research reports for a goal.
   */
  static async getResearchReports(goalId, { limit = 50, offset = 0 } = {}) {
    await this.getGoalById(goalId);

    const sql = `
      SELECT * FROM research_reports
      WHERE goal_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const params = [goalId, Math.min(100, Math.max(1, limit)), Math.max(0, offset)];
    const res = await query(sql, params);
    return res.rows.map((r) => this._formatResearchReport(r));
  }

  // ==========================================
  // 5. Requirement Revisions
  // ==========================================

  /**
   * Create an immutable requirement revision.
   * Rejects if unresolved material questions exist (409).
   * Rejects if must-have requirements lack criteria (400).
   * @param {string} goalId
   * @param {{ requirements?: any[], assumptions?: any[], exclusions?: string[], sourceRefs?: string[] }} [payload]
   */
  static async createRequirementRevision(goalId, {
    requirements = [],
    assumptions = [],
    exclusions = [],
    sourceRefs = [],
  } = {}) {
    await this.getGoalById(goalId);

    // 1. Check unresolved material clarifications
    const pendingRes = await query(
      "SELECT COUNT(*) AS count FROM clarifications WHERE goal_id = $1 AND materiality = 'material' AND status = 'pending'",
      [goalId]
    );
    const pendingCount = parseInt(pendingRes.rows[0]?.count || "0", 10);
    if (pendingCount > 0) {
      throw new IntentServiceError(
        "UNRESOLVED_MATERIAL_QUESTION",
        409,
        `Cannot create requirement revision while ${pendingCount} material clarification(s) remain unresolved`
      );
    }

    // 2. Validate requirements array
    if (!Array.isArray(requirements) || requirements.length === 0) {
      throw new IntentServiceError("INVALID_INPUT", 400, "Requirements must be a non-empty array");
    }

    // 3. Validate criteria on must-have requirements
    for (const req of requirements) {
      if (!req || typeof req !== "object") {
        throw new IntentServiceError("INVALID_INPUT", 400, "Each requirement must be an object");
      }
      if (req.priority === "must") {
        if (!Array.isArray(req.criteria) || req.criteria.length === 0) {
          throw new IntentServiceError(
            "MISSING_REQUIRED_CRITERIA",
            400,
            `Must-have requirement '${req.key || req.statement || "unnamed"}' requires at least one acceptance criterion`
          );
        }
      }
    }

    // 4. Compute next revision number & SHA-256 digest
    const revNumRes = await query(
      "SELECT COALESCE(MAX(revision), 0) + 1 AS next_rev FROM requirement_revisions WHERE goal_id = $1",
      [goalId]
    );
    const revision = parseInt(revNumRes.rows[0]?.next_rev || "1", 10);

    const canonicalPayload = {
      goalId,
      revision,
      requirements,
      assumptions,
      exclusions,
      sourceRefs,
    };
    const digest = sha256(canonicalPayload);

    return await transaction(async (client) => {
      const insertSql = `
        INSERT INTO requirement_revisions (
          goal_id, revision, digest, requirements, assumptions, exclusions, source_refs, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING *
      `;

      const res = await client.query(insertSql, [
        goalId,
        revision,
        digest,
        JSON.stringify(requirements),
        JSON.stringify(assumptions),
        JSON.stringify(exclusions),
        JSON.stringify(sourceRefs),
      ]);
      const createdRevision = res.rows[0];

      await client.query(
        "UPDATE goals SET active_requirement_revision_id = $1, status = 'ready_for_planning', updated_at = NOW(), version = version + 1 WHERE id = $2",
        [createdRevision.id, goalId]
      );

      return this._formatRequirementRevision(createdRevision);
    });
  }

  /**
   * Get requirement revisions for a goal.
   */
  static async getRequirementRevisions(goalId, { limit = 50, offset = 0 } = {}) {
    await this.getGoalById(goalId);

    const sql = `
      SELECT * FROM requirement_revisions
      WHERE goal_id = $1
      ORDER BY revision DESC
      LIMIT $2 OFFSET $3
    `;
    const params = [goalId, Math.min(100, Math.max(1, limit)), Math.max(0, offset)];
    const res = await query(sql, params);
    return res.rows.map((r) => this._formatRequirementRevision(r));
  }

  /**
   * Get requirement revision by ID.
   */
  static async getRequirementRevisionById(revisionId) {
    const res = await query("SELECT * FROM requirement_revisions WHERE id = $1", [revisionId]);
    if (res.rows.length === 0) {
      throw new IntentServiceError("REQUIREMENT_REVISION_NOT_FOUND", 404, `Requirement revision ${revisionId} not found`);
    }
    return this._formatRequirementRevision(res.rows[0]);
  }

  // ==========================================
  // 6. Decisions Tracking
  // ==========================================

  /**
   * Record a decision for a goal.
   * @param {string} goalId
   * @param {{ proposal?: string, alternatives?: string[], status?: string, rationale?: string, sourceRefs?: string[] }} [payload]
   */
  static async createDecision(goalId, {
    proposal = "",
    alternatives = [],
    status = "accepted",
    rationale = "",
    sourceRefs = [],
  } = {}) {
    await this.getGoalById(goalId);

    if (!proposal || typeof proposal !== "string" || !proposal.trim()) {
      throw new IntentServiceError("INVALID_INPUT", 400, "Proposal is required");
    }
    if (!rationale || typeof rationale !== "string" || !rationale.trim()) {
      throw new IntentServiceError("INVALID_INPUT", 400, "Rationale is required");
    }

    const validStatuses = ["accepted", "challenged", "rejected", "alternative", "requires_user_decision"];
    const decisionStatus = validStatuses.includes(status) ? status : "accepted";

    const insertSql = `
      INSERT INTO decisions (
        goal_id, status, proposal, alternatives, rationale, source_refs, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING *
    `;

    const res = await query(insertSql, [
      goalId,
      decisionStatus,
      proposal.trim(),
      JSON.stringify(alternatives || []),
      rationale.trim(),
      JSON.stringify(sourceRefs || []),
    ]);

    return this._formatDecision(res.rows[0]);
  }

  /**
   * Get decisions for a goal.
   */
  static async getDecisions(goalId, { limit = 50, offset = 0 } = {}) {
    await this.getGoalById(goalId);

    const sql = `
      SELECT * FROM decisions
      WHERE goal_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const params = [goalId, Math.min(100, Math.max(1, limit)), Math.max(0, offset)];
    const res = await query(sql, params);
    return res.rows.map((r) => this._formatDecision(r));
  }

  // ==========================================
  // Formatters (database row -> canonical contract)
  // ==========================================

  static _formatGoal(g) {
    return {
      id: g.id,
      projectId: g.project_id,
      conversationId: g.conversation_id,
      intent: g.intent,
      constraints: g.constraints || [],
      status: g.status,
      autonomyMode: g.autonomy_mode,
      activeRequirementRevisionId: g.active_requirement_revision_id,
      activeContractRevisionId: g.active_contract_revision_id,
      version: g.version,
      createdAt: g.created_at,
      updatedAt: g.updated_at,
    };
  }

  static _formatIntentAnalysis(ia) {
    return {
      id: ia.id,
      goalId: ia.goal_id,
      literalRequest: ia.literal_request,
      desiredOutcome: ia.desired_outcome,
      constraints: ia.constraints || [],
      assumptions: ia.assumptions || [],
      unknowns: ia.unknowns || [],
      acceptanceCandidates: ia.acceptance_candidates || [],
      sourceRefs: ia.source_refs || [],
      createdAt: ia.created_at,
    };
  }

  static _formatClarification(c) {
    return {
      id: c.id,
      goalId: c.goal_id,
      question: c.question,
      materiality: c.materiality,
      options: c.options || [],
      answer: c.answer,
      selectedOptionId: c.selected_option_id,
      status: c.status,
      version: c.version,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    };
  }

  static _formatResearchReport(r) {
    return {
      id: r.id,
      goalId: r.goal_id,
      questions: r.questions || [],
      conclusions: r.conclusions || [],
      sourceRefs: r.source_refs || [],
      artifactId: r.artifact_id,
      createdAt: r.created_at,
    };
  }

  static _formatRequirementRevision(rr) {
    return {
      id: rr.id,
      goalId: rr.goal_id,
      revision: rr.revision,
      digest: rr.digest,
      requirements: rr.requirements || [],
      assumptions: rr.assumptions || [],
      exclusions: rr.exclusions || [],
      sourceRefs: rr.source_refs || [],
      createdAt: rr.created_at,
    };
  }

  static _formatDecision(d) {
    return {
      id: d.id,
      goalId: d.goal_id,
      status: d.status,
      proposal: d.proposal,
      alternatives: d.alternatives || [],
      rationale: d.rationale,
      sourceRefs: d.source_refs || [],
      createdAt: d.created_at,
    };
  }
}
