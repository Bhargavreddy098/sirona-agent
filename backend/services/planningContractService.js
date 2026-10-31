import crypto from "node:crypto";
import { query, transaction } from "../config/db.js";
import { GovernanceService } from "./governanceService.js";

/* =====================================================================
   Planning & Build Contracts Service — Stage 09
   Implements twenty validated planning layers, DAG and criterion coverage,
   immutable plan/contract revisions, canonical digests, material diffs,
   and exact-revision approval requests.
   ===================================================================== */

export class PlanningServiceError extends Error {
  /**
   * @param {string} code
   * @param {number} status
   * @param {string} message
   */
  constructor(code, status, message) {
    super(message);
    this.name = "PlanningServiceError";
    this.code = code;
    this.status = status;
  }
}

export const TWENTY_PLANNING_LAYERS = [
  "intent",
  "product_strategy",
  "requirements",
  "ux",
  "functional_architecture",
  "technical_architecture",
  "data",
  "api",
  "ai",
  "integrations",
  "security",
  "infrastructure",
  "implementation",
  "testing",
  "verification",
  "deployment",
  "operations",
  "cost",
  "risk",
  "maintenance",
];

/**
 * Deterministic JSON stringify with sorted keys.
 * @param {unknown} val
 * @returns {string}
 */
export function canonicalJsonStringify(val) {
  if (val === null || typeof val !== "object") {
    return JSON.stringify(val);
  }
  if (Array.isArray(val)) {
    return `[${val.map((item) => canonicalJsonStringify(item)).join(",")}]`;
  }
  const obj = /** @type {Record<string, unknown>} */ (val);
  const sortedKeys = Object.keys(obj).sort();
  const pairs = sortedKeys.map((k) => `${JSON.stringify(k)}:${canonicalJsonStringify(obj[k])}`);
  return `{${pairs.join(",")}}`;
}

function sha256(data) {
  return crypto.createHash("sha256").update(typeof data === "string" ? data : canonicalJsonStringify(data)).digest("hex");
}

export class PlanningContractService {
  // ==========================================
  // 1. Validation & DAG Resolution
  // ==========================================

  /**
   * Validate step DAG: key uniqueness, unscoped dependencies, and absence of cycles.
   * @param {any[]} steps
   */
  static validateStepDAG(steps) {
    if (!Array.isArray(steps)) {
      throw new PlanningServiceError("INVALID_INPUT", 400, "Plan steps must be an array");
    }

    const keySet = new Set();
    for (const step of steps) {
      if (!step || typeof step !== "object") {
        throw new PlanningServiceError("INVALID_INPUT", 400, "Each step must be an object");
      }
      if (!step.key || typeof step.key !== "string") {
        throw new PlanningServiceError("INVALID_INPUT", 400, "Each step requires a valid string 'key'");
      }
      if (keySet.has(step.key)) {
        throw new PlanningServiceError("DUPLICATE_STEP_KEY", 400, `Duplicate step key: '${step.key}'`);
      }
      keySet.add(step.key);
    }

    // Check for unscoped dependencies
    for (const step of steps) {
      const deps = Array.isArray(step.dependsOn) ? step.dependsOn : [];
      for (const dep of deps) {
        if (!keySet.has(dep)) {
          throw new PlanningServiceError("UNSCOPED_STEP", 400, `Step '${step.key}' depends on unscoped step '${dep}'`);
        }
      }
    }

    // Detect cycles using DFS (0 = unvisited, 1 = visiting, 2 = visited)
    const state = new Map();
    const adj = new Map();
    for (const step of steps) {
      state.set(step.key, 0);
      adj.set(step.key, Array.isArray(step.dependsOn) ? step.dependsOn : []);
    }

    function dfs(node) {
      state.set(node, 1);
      const neighbors = adj.get(node) || [];
      for (const n of neighbors) {
        const neighborState = state.get(n);
        if (neighborState === 1) {
          return true; // cycle detected
        }
        if (neighborState === 0) {
          if (dfs(n)) return true;
        }
      }
      state.set(node, 2);
      return false;
    }

    for (const step of steps) {
      if (state.get(step.key) === 0) {
        if (dfs(step.key)) {
          throw new PlanningServiceError("DAG_CYCLE", 400, "Plan steps contain a cyclical dependency");
        }
      }
    }
  }

  /**
   * Validate and normalize the twenty planning layers.
   * @param {Record<string, any> | null} layers
   * @returns {Record<string, any>}
   */
  static validateAndNormalizeLayers(layers) {
    const normalized = {};
    const input = layers && typeof layers === "object" ? layers : {};

    for (const layerKey of TWENTY_PLANNING_LAYERS) {
      if (input[layerKey]) {
        normalized[layerKey] = {
          schemaVersion: 1,
          summary: typeof input[layerKey].summary === "string" ? input[layerKey].summary : `Layer ${layerKey} specification`,
          decisions: Array.isArray(input[layerKey].decisions) ? input[layerKey].decisions : [],
          sourceRefs: Array.isArray(input[layerKey].sourceRefs) ? input[layerKey].sourceRefs : [],
          risks: Array.isArray(input[layerKey].risks) ? input[layerKey].risks : [],
          dependencies: Array.isArray(input[layerKey].dependencies) ? input[layerKey].dependencies : [],
          acceptanceRefs: Array.isArray(input[layerKey].acceptanceRefs) ? input[layerKey].acceptanceRefs : [],
          ...input[layerKey],
        };
      } else {
        normalized[layerKey] = {
          schemaVersion: 1,
          summary: `Default specification for ${layerKey}`,
          decisions: [],
          sourceRefs: [],
          risks: [],
          dependencies: [],
          acceptanceRefs: [],
          status: "applicable",
        };
      }
    }

    return normalized;
  }

  // ==========================================
  // 2. Plans & Plan Revisions Lifecycle
  // ==========================================

  /**
   * Create an initial plan and revision for a goal.
   * @param {string} goalId
   * @param {{ requirementRevisionId?: string | null, budgetCeilingMicroUsd?: number | string, layers?: Record<string, any> | null, steps?: any[], reason?: string }} [payload]
   */
  static async createPlan(goalId, {
    requirementRevisionId = null,
    budgetCeilingMicroUsd: _budgetCeilingMicroUsd = 0,
    layers = null,
    steps = [],
    reason = "Initial plan creation",
  } = {}) {
    const goalRes = await query("SELECT * FROM goals WHERE id = $1", [goalId]);
    if (goalRes.rows.length === 0) {
      throw new PlanningServiceError("GOAL_NOT_FOUND", 404, `Goal ${goalId} not found`);
    }
    const goal = goalRes.rows[0];

    // Resolve requirement revision
    const targetReqId = requirementRevisionId || goal.active_requirement_revision_id;
    if (!targetReqId) {
      throw new PlanningServiceError("REQUIREMENTS_INCOMPLETE", 400, "Goal requires an active requirement revision before planning");
    }

    const reqRes = await query("SELECT * FROM requirement_revisions WHERE id = $1", [targetReqId]);
    if (reqRes.rows.length === 0 || reqRes.rows[0].goal_id !== goalId) {
      throw new PlanningServiceError("REQUIREMENTS_INCOMPLETE", 400, "Requirement revision not found or does not belong to goal");
    }

    // Default step if none provided
    const planSteps = Array.isArray(steps) && steps.length > 0 ? steps : [
      {
        key: "step-1-foundation",
        objective: "Establish foundation and dependencies",
        dependsOn: [],
        capabilities: ["read", "write"],
        budgetCeilingMicroUsd: 100000,
        criterionRefs: [],
      },
    ];

    this.validateStepDAG(planSteps);
    const normalizedLayers = this.validateAndNormalizeLayers(layers);

    const canonicalPayload = {
      goalId,
      requirementRevisionId: targetReqId,
      layers: normalizedLayers,
      steps: planSteps,
    };
    const digest = sha256(canonicalPayload);

    return await transaction(async (client) => {
      // Find or create plan row
      let planId;
      const planRes = await client.query("SELECT id FROM plans WHERE goal_id = $1", [goalId]);
      if (planRes.rows.length > 0) {
        planId = planRes.rows[0].id;
      } else {
        const createPlanRes = await client.query(
          "INSERT INTO plans (goal_id, version) VALUES ($1, 1) RETURNING id",
          [goalId]
        );
        planId = createPlanRes.rows[0].id;
      }

      const revRes = await client.query(
        "SELECT COALESCE(MAX(revision), 0) + 1 AS next_rev FROM plan_revisions WHERE plan_id = $1",
        [planId]
      );
      const revision = parseInt(revRes.rows[0]?.next_rev || "1", 10);

      const insertRevSql = `
        INSERT INTO plan_revisions (
          plan_id, goal_id, revision, requirement_revision_id, digest, layers, steps, reason, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        RETURNING *
      `;
      const inserted = await client.query(insertRevSql, [
        planId,
        goalId,
        revision,
        targetReqId,
        digest,
        JSON.stringify(normalizedLayers),
        JSON.stringify(planSteps),
        reason,
      ]);
      const createdRev = inserted.rows[0];

      await client.query(
        "UPDATE plans SET active_plan_revision_id = $1, version = version + 1, updated_at = NOW() WHERE id = $2",
        [createdRev.id, planId]
      );
      await client.query(
        "UPDATE goals SET active_plan_revision_id = $1, status = 'planning', version = version + 1, updated_at = NOW() WHERE id = $2",
        [createdRev.id, goalId]
      );

      return this._formatPlanRevision(createdRev);
    });
  }

  /**
   * Get plans / plan revisions for a goal.
   * @param {string} goalId
   * @param {{ limit?: number, offset?: number }} [queryOptions]
   */
  static async getPlans(goalId, { limit = 50, offset = 0 } = {}) {
    const sql = `
      SELECT * FROM plan_revisions
      WHERE goal_id = $1
      ORDER BY revision DESC
      LIMIT $2 OFFSET $3
    `;
    const params = [goalId, Math.min(100, Math.max(1, limit)), Math.max(0, offset)];
    const res = await query(sql, params);
    return res.rows.map((r) => this._formatPlanRevision(r));
  }

  /**
   * Create an immutable revision for an existing plan.
   * @param {string} planId
   * @param {{ baseRevisionId?: string | null, layers?: Record<string, any> | null, steps?: any[], reason?: string }} [payload]
   */
  static async createPlanRevision(planId, {
    baseRevisionId = null,
    layers = null,
    steps = [],
    reason = "Plan update",
  } = {}) {
    const planRes = await query("SELECT * FROM plans WHERE id = $1", [planId]);
    if (planRes.rows.length === 0) {
      throw new PlanningServiceError("PLAN_NOT_FOUND", 404, `Plan ${planId} not found`);
    }
    const plan = planRes.rows[0];

    if (baseRevisionId && plan.active_plan_revision_id && plan.active_plan_revision_id !== baseRevisionId) {
      throw new PlanningServiceError("BASE_CHANGED", 409, "Active plan revision has changed since base revision");
    }

    const activeRevRes = await query("SELECT * FROM plan_revisions WHERE id = $1", [plan.active_plan_revision_id]);
    const requirementRevisionId = activeRevRes.rows[0]?.requirement_revision_id;

    const planSteps = Array.isArray(steps) && steps.length > 0 ? steps : activeRevRes.rows[0]?.steps || [];
    this.validateStepDAG(planSteps);
    const normalizedLayers = this.validateAndNormalizeLayers(layers || activeRevRes.rows[0]?.layers);

    const canonicalPayload = {
      goalId: plan.goal_id,
      requirementRevisionId,
      layers: normalizedLayers,
      steps: planSteps,
    };
    const digest = sha256(canonicalPayload);

    return await transaction(async (client) => {
      const revRes = await client.query(
        "SELECT COALESCE(MAX(revision), 0) + 1 AS next_rev FROM plan_revisions WHERE plan_id = $1",
        [planId]
      );
      const revision = parseInt(revRes.rows[0]?.next_rev || "1", 10);

      const insertSql = `
        INSERT INTO plan_revisions (
          plan_id, goal_id, revision, requirement_revision_id, digest, layers, steps, reason, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        RETURNING *
      `;
      const res = await client.query(insertSql, [
        planId,
        plan.goal_id,
        revision,
        requirementRevisionId,
        digest,
        JSON.stringify(normalizedLayers),
        JSON.stringify(planSteps),
        reason,
      ]);
      const createdRev = res.rows[0];

      await client.query(
        "UPDATE plans SET active_plan_revision_id = $1, version = version + 1, updated_at = NOW() WHERE id = $2",
        [createdRev.id, planId]
      );
      await client.query(
        "UPDATE goals SET active_plan_revision_id = $1, version = version + 1, updated_at = NOW() WHERE id = $2",
        [createdRev.id, plan.goal_id]
      );

      return this._formatPlanRevision(createdRev);
    });
  }

  /**
   * Get plan revision by ID.
   * @param {string} revisionId
   */
  static async getPlanRevisionById(revisionId) {
    const res = await query("SELECT * FROM plan_revisions WHERE id = $1", [revisionId]);
    if (res.rows.length === 0) {
      throw new PlanningServiceError("PLAN_REVISION_NOT_FOUND", 404, `Plan revision ${revisionId} not found`);
    }
    return this._formatPlanRevision(res.rows[0]);
  }

  // ==========================================
  // 3. Build Contracts & Contract Revisions
  // ==========================================

  /**
   * Create an initial Build Contract and revision for a goal.
   * @param {string} goalId
   * @param {{ planRevisionId?: string | null, document?: Record<string, any> | null, reason?: string }} [payload]
   */
  static async createContract(goalId, {
    planRevisionId = null,
    document = null,
    reason = "Initial build contract",
  } = {}) {
    const goalRes = await query("SELECT * FROM goals WHERE id = $1", [goalId]);
    if (goalRes.rows.length === 0) {
      throw new PlanningServiceError("GOAL_NOT_FOUND", 404, `Goal ${goalId} not found`);
    }
    const goal = goalRes.rows[0];

    // Check for unresolved material clarifications
    const clarCheck = await query(
      "SELECT COUNT(*) AS count FROM clarifications WHERE goal_id = $1 AND materiality = 'material' AND status = 'pending'",
      [goalId]
    );
    const pendingClars = parseInt(clarCheck.rows[0]?.count || "0", 10);
    if (pendingClars > 0) {
      throw new PlanningServiceError(
        "UNRESOLVED_MATERIAL_QUESTION",
        409,
        `Cannot create Build Contract while ${pendingClars} material clarification(s) remain unresolved`
      );
    }

    // Resolve plan revision
    const targetPlanRevId = planRevisionId || goal.active_plan_revision_id;
    if (!targetPlanRevId) {
      throw new PlanningServiceError("PLAN_NOT_FOUND", 400, "Goal requires an active plan revision before creating a Build Contract");
    }

    const planRevRes = await query("SELECT * FROM plan_revisions WHERE id = $1", [targetPlanRevId]);
    if (planRevRes.rows.length === 0 || planRevRes.rows[0].goal_id !== goalId) {
      throw new PlanningServiceError("PLAN_NOT_FOUND", 400, "Plan revision not found or does not belong to goal");
    }
    const planRev = planRevRes.rows[0];

    // Validate BuildContractInput document
    if (!document || typeof document !== "object") {
      throw new PlanningServiceError("CONTRACT_INCOMPLETE", 400, "Build contract document must be an object");
    }

    const requiredFields = ["goal", "requirements", "acceptance", "verification"];
    for (const field of requiredFields) {
      if (!document[field]) {
        throw new PlanningServiceError("CONTRACT_INCOMPLETE", 400, `Build contract document is missing required section '${field}'`);
      }
    }

    const canonicalBytes = canonicalJsonStringify(document);
    const digest = sha256(canonicalBytes);

    return await transaction(async (client) => {
      // Find or create contract row
      let contractId;
      const contractRes = await client.query("SELECT id FROM contracts WHERE goal_id = $1", [goalId]);
      if (contractRes.rows.length > 0) {
        contractId = contractRes.rows[0].id;
      } else {
        const createContractRes = await client.query(
          "INSERT INTO contracts (goal_id, version) VALUES ($1, 1) RETURNING id",
          [goalId]
        );
        contractId = createContractRes.rows[0].id;
      }

      const revRes = await client.query(
        "SELECT COALESCE(MAX(revision), 0) + 1 AS next_rev FROM contract_revisions WHERE contract_id = $1",
        [contractId]
      );
      const revision = parseInt(revRes.rows[0]?.next_rev || "1", 10);

      const insertRevSql = `
        INSERT INTO contract_revisions (
          contract_id, goal_id, revision, plan_revision_id, requirement_revision_id,
          digest, schema_version, canonicalizer_version, document, reason, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, 1, 'v1', $7, $8, NOW())
        RETURNING *
      `;
      const inserted = await client.query(insertRevSql, [
        contractId,
        goalId,
        revision,
        targetPlanRevId,
        planRev.requirement_revision_id,
        digest,
        JSON.stringify(document),
        reason,
      ]);
      const createdRev = inserted.rows[0];

      await client.query(
        "UPDATE contracts SET active_contract_revision_id = $1, version = version + 1, updated_at = NOW() WHERE id = $2",
        [createdRev.id, contractId]
      );
      await client.query(
        "UPDATE goals SET active_contract_revision_id = $1, status = 'ready_for_approval', version = version + 1, updated_at = NOW() WHERE id = $2",
        [createdRev.id, goalId]
      );

      return this._formatContractRevision(createdRev);
    });
  }

  /**
   * Create an immutable revision for an existing Build Contract.
   * @param {string} contractId
   * @param {{ baseRevisionId?: string | null, planRevisionId?: string | null, document?: Record<string, any> | null, reason?: string }} [payload]
   */
  static async createContractRevision(contractId, {
    baseRevisionId = null,
    planRevisionId = null,
    document = null,
    reason = "Contract update",
  } = {}) {
    const contractRes = await query("SELECT * FROM contracts WHERE id = $1", [contractId]);
    if (contractRes.rows.length === 0) {
      throw new PlanningServiceError("CONTRACT_NOT_FOUND", 404, `Contract ${contractId} not found`);
    }
    const contract = contractRes.rows[0];

    if (baseRevisionId && contract.active_contract_revision_id && contract.active_contract_revision_id !== baseRevisionId) {
      throw new PlanningServiceError("BASE_CHANGED", 409, "Active contract revision has changed since base revision");
    }

    const activeRevRes = await query("SELECT * FROM contract_revisions WHERE id = $1", [contract.active_contract_revision_id]);
    const activeRev = activeRevRes.rows[0];

    const targetPlanRevId = planRevisionId || activeRev?.plan_revision_id;
    const requirementRevisionId = activeRev?.requirement_revision_id;

    if (!document || typeof document !== "object") {
      throw new PlanningServiceError("CONTRACT_INCOMPLETE", 400, "Build contract document must be an object");
    }
    const requiredFields = ["goal", "requirements", "acceptance", "verification"];
    for (const field of requiredFields) {
      if (!document[field]) {
        throw new PlanningServiceError("CONTRACT_INCOMPLETE", 400, `Build contract document is missing required section '${field}'`);
      }
    }

    const canonicalBytes = canonicalJsonStringify(document);
    const digest = sha256(canonicalBytes);

    return await transaction(async (client) => {
      const revRes = await client.query(
        "SELECT COALESCE(MAX(revision), 0) + 1 AS next_rev FROM contract_revisions WHERE contract_id = $1",
        [contractId]
      );
      const revision = parseInt(revRes.rows[0]?.next_rev || "1", 10);

      const insertSql = `
        INSERT INTO contract_revisions (
          contract_id, goal_id, revision, plan_revision_id, requirement_revision_id,
          digest, schema_version, canonicalizer_version, document, supersedes_id, reason, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, 1, 'v1', $7, $8, $9, NOW())
        RETURNING *
      `;
      const res = await client.query(insertSql, [
        contractId,
        contract.goal_id,
        revision,
        targetPlanRevId,
        requirementRevisionId,
        digest,
        JSON.stringify(document),
        contract.active_contract_revision_id,
        reason,
      ]);
      const createdRev = res.rows[0];

      await client.query(
        "UPDATE contracts SET active_contract_revision_id = $1, version = version + 1, updated_at = NOW() WHERE id = $2",
        [createdRev.id, contractId]
      );
      await client.query(
        "UPDATE goals SET active_contract_revision_id = $1, version = version + 1, updated_at = NOW() WHERE id = $2",
        [createdRev.id, contract.goal_id]
      );

      return this._formatContractRevision(createdRev);
    });
  }

  /**
   * Get contract revisions for a goal.
   * @param {string} goalId
   * @param {{ limit?: number, offset?: number }} [queryOptions]
   */
  static async getContracts(goalId, { limit = 50, offset = 0 } = {}) {
    const sql = `
      SELECT * FROM contract_revisions
      WHERE goal_id = $1
      ORDER BY revision DESC
      LIMIT $2 OFFSET $3
    `;
    const params = [goalId, Math.min(100, Math.max(1, limit)), Math.max(0, offset)];
    const res = await query(sql, params);
    return res.rows.map((r) => this._formatContractRevision(r));
  }

  /**
   * Get contract revision by ID.
   * @param {string} revisionId
   */
  static async getContractRevisionById(revisionId) {
    const res = await query("SELECT * FROM contract_revisions WHERE id = $1", [revisionId]);
    if (res.rows.length === 0) {
      throw new PlanningServiceError("CONTRACT_REVISION_NOT_FOUND", 404, `Contract revision ${revisionId} not found`);
    }
    return this._formatContractRevision(res.rows[0]);
  }

  /**
   * Diff two contract revisions to detect material changes and determine reapproval requirement.
   * @param {string} revisionId
   * @param {{ againstRevisionId?: string | null }} [payload]
   */
  static async diffContractRevisions(revisionId, { againstRevisionId = null } = {}) {
    if (!againstRevisionId) {
      throw new PlanningServiceError("INVALID_INPUT", 400, "Target comparison revision ID (against) is required");
    }

    const toRev = await this.getContractRevisionById(revisionId);
    const fromRev = await this.getContractRevisionById(againstRevisionId);

    if (toRev.contractId !== fromRev.contractId || toRev.goalId !== fromRev.goalId) {
      throw new PlanningServiceError("DIFFERENT_CONTRACT", 400, "Cannot diff revisions from different contracts");
    }

    const changes = [];
    const docA = fromRev.document || {};
    const docB = toRev.document || {};

    const allKeys = Array.from(new Set([...Object.keys(docA), ...Object.keys(docB)]));
    for (const key of allKeys) {
      const valA = docA[key];
      const valB = docB[key];

      const strA = canonicalJsonStringify(valA);
      const strB = canonicalJsonStringify(valB);

      if (strA !== strB) {
        // Material changes include scope, requirements, architecture, permissions, costs, security, acceptance
        const materialKeys = ["goal", "requirements", "architecture", "technologyStack", "permissions", "cost", "security", "acceptance", "verification", "autonomyMode"];
        const isMaterial = materialKeys.includes(key);

        changes.push({
          path: key,
          before: valA ?? null,
          after: valB ?? null,
          material: isMaterial,
        });
      }
    }

    const requiresApproval = changes.some((c) => c.material) || toRev.digest !== fromRev.digest;

    return {
      fromDigest: fromRev.digest,
      toDigest: toRev.digest,
      changes,
      requiresApproval,
    };
  }

  /**
   * Create an approval request for an exact immutable contract revision digest.
   * @param {string} revisionId
   * @param {{ digest?: string, designatedOwner?: string | null }} [payload]
   */
  static async requestApprovalForContract(revisionId, {
    digest = "",
    designatedOwner: _designatedOwner = null,
  } = {}) {
    const rev = await this.getContractRevisionById(revisionId);

    if (!digest || typeof digest !== "string" || digest !== rev.digest) {
      throw new PlanningServiceError("DIGEST_MISMATCH", 400, "Supplied digest does not match the immutable contract revision digest");
    }

    // Verify document completeness
    if (!rev.document || !rev.document.goal || !rev.document.requirements) {
      throw new PlanningServiceError("CONTRACT_INCOMPLETE", 400, "Contract document is missing required sections");
    }

    // Lookup goal project ID
    const goalRes = await query("SELECT project_id FROM goals WHERE id = $1", [rev.goalId]);
    const projectId = goalRes.rows[0]?.project_id || null;

    const costCeiling = typeof rev.document.cost?.projectCeilingMicroUsd === "number"
      ? rev.document.cost.projectCeilingMicroUsd
      : 0;

    const title = rev.document.goal?.title || "Contract Revision Approval";

    const { approval, nonce } = await GovernanceService.createApprovalRequest({
      projectId,
      kind: "contract",
      contractRevisionId: revisionId,
      inputDigest: digest,
      scopeSummary: `Approval request for contract revision ${rev.revision}: ${title}`,
      costCeilingMicroUsd: costCeiling,
      consequences: "Authorizes task dispatch and execution within defined contract boundaries",
      ttlMs: 86400000,
    });

    return {
      approval: {
        id: approval.id,
        kind: approval.kind,
        contractRevisionId: approval.contract_revision_id,
        digest: approval.input_digest,
        state: approval.state,
        scopeSummary: approval.scope_summary,
        costCeilingMicroUsd: approval.cost_ceiling_micro_usd,
        expiresAt: approval.expires_at,
        nonce, // Returned strictly once to designated requester
        createdAt: approval.created_at,
      },
    };
  }

  // ==========================================
  // Formatters (database row -> canonical contract)
  // ==========================================

  static _formatPlanRevision(pr) {
    return {
      id: pr.id,
      planId: pr.plan_id,
      goalId: pr.goal_id,
      revision: pr.revision,
      requirementRevisionId: pr.requirement_revision_id,
      digest: pr.digest,
      layers: pr.layers || {},
      steps: pr.steps || [],
      reason: pr.reason,
      createdAt: pr.created_at,
    };
  }

  static _formatContractRevision(cr) {
    return {
      id: cr.id,
      contractId: cr.contract_id,
      goalId: cr.goal_id,
      revision: cr.revision,
      planRevisionId: cr.plan_revision_id,
      requirementRevisionId: cr.requirement_revision_id,
      digest: cr.digest,
      schemaVersion: cr.schema_version,
      canonicalizerVersion: cr.canonicalizer_version,
      document: cr.document || {},
      supersedesId: cr.supersedes_id,
      reason: cr.reason,
      createdAt: cr.created_at,
    };
  }
}
