import crypto from "crypto";
import { query, transaction } from "../config/db.js";

export class GovernanceServiceError extends Error {
  /**
   * @param {string} code
   * @param {number} status
   * @param {string} message
   */
  constructor(code, status, message) {
    super(message);
    this.name = "GovernanceServiceError";
    this.code = code;
    this.status = status;
  }
}

const DEFAULT_POLICY_RULES = Object.freeze({
  autonomyMode: "supervised", // 'readonly' | 'supervised' | 'guarded' | 'autonomous'
  highImpactActions: ["terminal_exec", "file_write", "file_delete", "deploy"],
  capabilityRules: {
    terminal: { allowed: true, requireApproval: true },
    fs_read: { allowed: true, requireApproval: false },
    fs_write: { allowed: true, requireApproval: true },
    git: { allowed: true, requireApproval: false },
  },
  budgetRules: {
    requireReservation: true,
    maxSingleActionMicroUsd: 1000000, // $1.00
  },
  privacyRules: {
    denyEgress: false,
    allowedEgressHosts: ["127.0.0.1", "localhost", "openrouter.ai", "googleapis.com"],
  },
});

function sanitizeMetadata(metadata) {
  if (!metadata || typeof metadata !== "object") return {};
  const cleaned = {};
  const sensitiveKeys = ["nonce", "key", "secret", "password", "token", "authorization", "cookie"];
  for (const [k, v] of Object.entries(metadata)) {
    if (sensitiveKeys.some((s) => k.toLowerCase().includes(s))) {
      cleaned[k] = "[REDACTED]";
    } else if (typeof v === "object" && v !== null) {
      cleaned[k] = sanitizeMetadata(v);
    } else {
      cleaned[k] = v;
    }
  }
  return cleaned;
}

export class GovernanceService {
  // ==========================================
  // 1. Audit Trail (Hash-Chained Append-Only)
  // ==========================================

  /**
   * Record a tamper-evident hash-chained audit event.
   */
  static async recordAuditEvent({
    actorId = null,
    action,
    targetRef,
    traceId = null,
    safeMetadata = {},
  }) {
    if (!action || !targetRef) {
      throw new GovernanceServiceError("INVALID_AUDIT_INPUT", 400, "Action and targetRef required for audit");
    }

    const tid = traceId || crypto.randomBytes(16).toString("hex");
    const sanitized = sanitizeMetadata(safeMetadata);

    // Get previous digest
    const lastRes = await query(
      "SELECT sequence, digest FROM audit_events ORDER BY sequence DESC LIMIT 1"
    );
    const prevDigest =
      lastRes.rows[0]?.digest ||
      "0000000000000000000000000000000000000000000000000000000000000000";

    const payload = JSON.stringify({
      action,
      targetRef,
      actorId,
      safeMetadata: sanitized,
      previousDigest: prevDigest,
    });
    const digest = crypto.createHash("sha256").update(payload).digest("hex");

    const sql = `
      INSERT INTO audit_events (actor_id, action, target_ref, trace_id, safe_metadata, previous_digest, digest)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const res = await query(sql, [actorId, action, targetRef, tid, sanitized, prevDigest, digest]);
    return res.rows[0];
  }

  // ==========================================
  // 2. Policy Revisions & Evaluation
  // ==========================================

  /**
   * Retrieve active policy revision or default fallback.
   */
  static async getCurrentPolicy() {
    const res = await query(
      "SELECT * FROM policy_revisions WHERE active = true ORDER BY revision DESC LIMIT 1"
    );
    if (res.rows.length > 0) {
      return res.rows[0];
    }

    // Initialize default revision 1 if empty
    const rules = DEFAULT_POLICY_RULES;
    const digest = crypto.createHash("sha256").update(JSON.stringify(rules)).digest("hex");
    const initRes = await query(
      `INSERT INTO policy_revisions (revision, digest, rules, active)
       VALUES (1, $1, $2, true)
       RETURNING *`,
      [digest, JSON.stringify(rules)]
    );
    return initRes.rows[0];
  }

  /**
   * Create an immutable policy revision.
   */
  static async createPolicyRevision({ rules, createdBy = null }) {
    if (!rules || typeof rules !== "object") {
      throw new GovernanceServiceError("INVALID_RULES", 400, "Valid policy rules object required");
    }

    const digest = crypto.createHash("sha256").update(JSON.stringify(rules)).digest("hex");
    const lastRes = await query("SELECT revision FROM policy_revisions ORDER BY revision DESC LIMIT 1");
    const nextRev = (lastRes.rows[0]?.revision || 0) + 1;

    const sql = `
      INSERT INTO policy_revisions (revision, digest, rules, active, created_by)
      VALUES ($1, $2, $3, false, $4)
      RETURNING *
    `;
    const res = await query(sql, [nextRev, digest, JSON.stringify(rules), createdBy]);
    return res.rows[0];
  }

  /**
   * Atomically activate a policy revision.
   */
  static async activatePolicyRevision(revisionId, _actorId = null) {
    return await transaction(async (client) => {
      const targetRes = await client.query("SELECT * FROM policy_revisions WHERE id = $1", [revisionId]);
      if (targetRes.rows.length === 0) {
        throw new GovernanceServiceError("POLICY_NOT_FOUND", 404, "Policy revision not found");
      }

      await client.query("UPDATE policy_revisions SET active = false WHERE active = true");
      const activeRes = await client.query(
        "UPDATE policy_revisions SET active = true WHERE id = $1 RETURNING *",
        [revisionId]
      );

      return activeRes.rows[0];
    });
  }

  /**
   * Deterministic policy evaluator.
   */
  static evaluatePolicy(policy, { action, highImpact = false, targetHost = null, costMicroUsd = 0 }) {
    const rules = policy.rules || DEFAULT_POLICY_RULES;
    const mode = rules.autonomyMode || "supervised";

    // 1. Read-only mode denies any mutating or high-impact actions
    if (mode === "readonly") {
      const isReadOnly = ["fs_read", "git_status", "git_log", "search"].includes(action);
      if (!isReadOnly) {
        return {
          allowed: false,
          requiresApproval: true,
          reason: `Autonomy mode '${mode}' denies non-read action '${action}'`,
        };
      }
    }

    // 2. Privacy rules (egress denial)
    const denyEgress = rules.privacyRules?.denyEgress ?? (rules.allowedHosts !== undefined);
    if (denyEgress && targetHost) {
      const allowedHosts = rules.allowedHosts || rules.privacyRules?.allowedEgressHosts || [];
      if (!allowedHosts.includes(targetHost)) {
        return {
          allowed: false,
          requiresApproval: true,
          reason: `Egress to host '${targetHost}' is blocked by active privacy policy`,
        };
      }
    }

    // 3. High-impact actions require approval
    const highImpactList = rules.highImpactActions || [];
    if (highImpact || highImpactList.includes(action)) {
      if (mode !== "autonomous") {
        return {
          allowed: false,
          requiresApproval: true,
          reason: `Action '${action}' is classified as high-impact and requires human approval`,
        };
      }
    }

    // 4. Budget ceiling check
    const maxSingle = rules.budgetRules?.maxSingleActionMicroUsd || rules.budgetCeilingMicroUsd || 1000000;
    if (costMicroUsd > maxSingle) {
      return {
        allowed: false,
        requiresApproval: true,
        reason: `Cost ${costMicroUsd}µUSD exceeds single-action ceiling of ${maxSingle}µUSD`,
      };
    }

    return {
      allowed: true,
      requiresApproval: false,
    };
  }

  // ==========================================
  // 3. Capability Grants
  // ==========================================

  static async getGrants(projectId) {
    const res = await query(
      `SELECT * FROM capability_grants
       WHERE project_id = $1 AND revoked_at IS NULL AND expires_at > NOW()
       ORDER BY created_at DESC`,
      [projectId]
    );
    return res.rows;
  }

  static async createGrant(projectId, { capability, resourceScope = {}, ttlMs = 86400000 }) {
    if (!capability || typeof capability !== "string") {
      throw new GovernanceServiceError("INVALID_CAPABILITY", 400, "Capability name required");
    }

    const expiresAt = new Date(Date.now() + ttlMs);
    const sql = `
      INSERT INTO capability_grants (project_id, capability, resource_scope, expires_at)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const res = await query(sql, [projectId, capability, JSON.stringify(resourceScope), expiresAt]);
    return res.rows[0];
  }

  static async revokeGrant(grantId) {
    const res = await query(
      `UPDATE capability_grants
       SET revoked_at = NOW()
       WHERE id = $1 AND revoked_at IS NULL
       RETURNING *`,
      [grantId]
    );
    if (res.rows.length === 0) {
      throw new GovernanceServiceError("GRANT_NOT_FOUND", 404, "Grant not found or already revoked");
    }
    return res.rows[0];
  }

  // ==========================================
  // 4. Approvals Lifecycle
  // ==========================================

  static async createApprovalRequest({
    projectId = null,
    kind = "contract",
    contractRevisionId = null,
    effectId = null,
    inputDigest,
    scopeSummary = null,
    costCeilingMicroUsd = 0,
    consequences = null,
    ttlMs = 86400000,
  }, /** @type {import('pg').PoolClient | null} */ client = null) {
    if (!inputDigest) {
      throw new GovernanceServiceError("INVALID_DIGEST", 400, "Input digest is mandatory for approvals");
    }

    const rawNonce = crypto.randomBytes(32).toString("hex");
    const nonceHash = crypto.createHash("sha256").update(rawNonce).digest("hex");
    const expiresAt = new Date(Date.now() + ttlMs);

    const sql = `
      INSERT INTO approvals (
        project_id, kind, contract_revision_id, effect_id, input_digest,
        nonce_hash, scope_summary, cost_ceiling_micro_usd, consequences, expires_at, state
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')
      RETURNING *
    `;
    const execute = client ? client.query.bind(client) : query;
    const res = await execute(sql, [
      projectId,
      kind,
      contractRevisionId,
      effectId,
      inputDigest,
      nonceHash,
      scopeSummary,
      costCeilingMicroUsd,
      consequences,
      expiresAt,
    ]);

    const approval = res.rows[0];
    return {
      approval,
      nonce: rawNonce, // returned strictly once upon creation
    };
  }

  static async getApprovals({ projectId = null, state = null, limit = 50, offset = 0 } = {}) {
    const conditions = [];
    const params = [];
    let idx = 1;

    if (projectId) {
      conditions.push(`project_id = $${idx++}`);
      params.push(projectId);
    }
    if (state) {
      conditions.push(`state = $${idx++}`);
      params.push(state);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const countRes = await query(`SELECT COUNT(*) as total FROM approvals ${where}`, params);
    const total = parseInt(countRes.rows[0]?.total || "0", 10);

    params.push(limit, offset);
    const listSql = `
      SELECT id, kind, project_id, contract_revision_id, effect_id, input_digest,
             approver_principal_id, state, scope_summary, cost_ceiling_micro_usd,
             consequences, expires_at, decided_at, consumed_at, created_at
      FROM approvals
      ${where}
      ORDER BY created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `;
    const res = await query(listSql, params);
    return { approvals: res.rows, total };
  }

  static async getApprovalById(approvalId) {
    const res = await query(
      `SELECT id, kind, project_id, contract_revision_id, effect_id, input_digest,
              approver_principal_id, state, scope_summary, cost_ceiling_micro_usd,
              consequences, expires_at, decided_at, consumed_at, created_at
       FROM approvals WHERE id = $1`,
      [approvalId]
    );
    return res.rows[0] || null;
  }

  static async decideApproval(approvalId, { decision, nonce, digest, approverId = null }, /** @type {import('pg').PoolClient | null} */ client = null) {
    if (!["approve", "reject"].includes(decision)) {
      throw new GovernanceServiceError("INVALID_DECISION", 400, "Decision must be 'approve' or 'reject'");
    }
    if (!nonce || !digest) {
      throw new GovernanceServiceError("INVALID_PROOF", 400, "Nonce and input digest proof required");
    }

    const execute = client ? client.query.bind(client) : query;
    const targetRes = await execute("SELECT * FROM approvals WHERE id = $1", [approvalId]);
    if (targetRes.rows.length === 0) {
      throw new GovernanceServiceError("APPROVAL_NOT_FOUND", 404, "Approval not found");
    }

    const approval = targetRes.rows[0];

    // Only the new prepared-action slice adds source/epoch/owner revalidation.
    // Existing approval callers keep their current contracts; the same owner records the decision.
    if (!client && approval.kind === 'effect' && approval.run_id) {
      const prepared = await query("SELECT 1 FROM run_events WHERE run_id=$1 AND event_type='workspace.approval_requested' AND payload->>'approvalId'=$2 LIMIT 1",[approval.run_id,approvalId]);
      if (prepared.rows.length) {
        const { decidePreparedApproval } = await import('../dist-workspace/src/workspace/frontendController.js');
        return decidePreparedApproval(approvalId,{decision,nonce,digest,approverId});
      }
    }

    if (approval.state !== "pending") {
      throw new GovernanceServiceError("ALREADY_DECIDED", 409, `Approval is already ${approval.state}`);
    }

    if (new Date(approval.expires_at) < new Date()) {
      await execute("UPDATE approvals SET state = 'expired' WHERE id = $1", [approvalId]);
      throw new GovernanceServiceError("APPROVAL_EXPIRED", 410, "Approval request has expired");
    }

    // Verify nonce proof
    const hashedNonce = crypto.createHash("sha256").update(nonce).digest("hex");
    if (hashedNonce !== approval.nonce_hash) {
      throw new GovernanceServiceError("NONCE_MISMATCH", 403, "Invalid approval nonce proof");
    }

    // Verify input digest match
    if (digest !== approval.input_digest) {
      throw new GovernanceServiceError("DIGEST_MISMATCH", 400, "Input digest mismatch against approval request");
    }

    const newState = decision === "approve" ? "approved" : "rejected";
    const updateRes = await execute(
      `UPDATE approvals
       SET state = $2, decided_at = NOW(), approver_principal_id = $3
       WHERE id = $1 AND state='pending' AND (expires_at IS NULL OR expires_at>NOW())
       RETURNING *`,
      [approvalId, newState, approverId]
    );

    if (!updateRes.rows.length) throw new GovernanceServiceError("ALREADY_DECIDED",409,"Approval was already decided, revoked or expired");
    return updateRes.rows[0];
  }

  static async revokeApproval(approvalId, { reason: _reason = "user_revoked" } = {}) {
    const targetRes = await query("SELECT * FROM approvals WHERE id = $1", [approvalId]);
    if (targetRes.rows.length === 0) {
      throw new GovernanceServiceError("APPROVAL_NOT_FOUND", 404, "Approval not found");
    }

    const approval = targetRes.rows[0];
    if (approval.consumed_at) {
      throw new GovernanceServiceError(
        "EFFECT_ALREADY_DISPATCHED",
        409,
        "Cannot revoke approval: effect has already been dispatched/consumed"
      );
    }

    const res = await query(
      `UPDATE approvals
       SET state = 'revoked', decided_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [approvalId]
    );
    return res.rows[0];
  }

  // ==========================================
  // 5. Budgets & Atomic Reservations
  // ==========================================

  static async getBudgets(projectId) {
    const res = await query(
      "SELECT * FROM budget_accounts WHERE scope_id = $1",
      [projectId]
    );
    return res.rows;
  }

  static async getBudgetAccount(accountId) {
    const res = await query(
      "SELECT * FROM budget_accounts WHERE id = $1",
      [accountId]
    );
    return res.rows[0] || null;
  }

  static async createOrUpdateBudget({ scopeKind = "project", scopeId, limitMicroUsd = 10000000 }) {
    const sql = `
      INSERT INTO budget_accounts (scope_kind, scope_id, limit_micro_usd, version)
      VALUES ($1, $2, $3, 1)
      ON CONFLICT (scope_kind, scope_id)
      DO UPDATE SET limit_micro_usd = $3, version = budget_accounts.version + 1, updated_at = NOW()
      RETURNING *
    `;
    const res = await query(sql, [scopeKind, scopeId, limitMicroUsd]);
    return res.rows[0];
  }

  static async reserveBudget(accountId, { operationKey, ceilingMicroUsd }) {
    if (!operationKey || !ceilingMicroUsd || ceilingMicroUsd <= 0) {
      throw new GovernanceServiceError("INVALID_RESERVATION", 400, "Valid operationKey and positive ceiling required");
    }

    return await transaction(async (client) => {
      // Row lock on budget account
      const accRes = await client.query(
        "SELECT * FROM budget_accounts WHERE id = $1 FOR UPDATE",
        [accountId]
      );
      if (accRes.rows.length === 0) {
        throw new GovernanceServiceError("BUDGET_NOT_FOUND", 404, "Budget account not found");
      }

      const acc = accRes.rows[0];
      const spent = BigInt(acc.spent_micro_usd || 0);
      const reserved = BigInt(acc.reserved_micro_usd || 0);
      const limit = BigInt(acc.limit_micro_usd || 0);
      const ceiling = BigInt(ceilingMicroUsd);

      // Check existing reservation with same key
      const existRes = await client.query(
        "SELECT * FROM budget_reservations WHERE budget_account_id = $1 AND operation_key = $2",
        [accountId, operationKey]
      );
      if (existRes.rows.length > 0) {
        return existRes.rows[0];
      }

      if (spent + reserved + ceiling > limit) {
        throw new GovernanceServiceError(
          "BUDGET_EXCEEDED",
          409,
          `Reservation of ${ceiling}µUSD exceeds budget headroom (${limit - (spent + reserved)}µUSD remaining)`
        );
      }

      // Record reservation
      const resRes = await client.query(
        `INSERT INTO budget_reservations (budget_account_id, operation_key, ceiling_micro_usd, state)
         VALUES ($1, $2, $3, 'held')
         RETURNING *`,
        [accountId, operationKey, ceilingMicroUsd]
      );

      // Increment reserved amount
      await client.query(
        "UPDATE budget_accounts SET reserved_micro_usd = reserved_micro_usd + $2, updated_at = NOW() WHERE id = $1",
        [accountId, ceilingMicroUsd]
      );

      return resRes.rows[0];
    });
  }

  static async settleReservation(reservationId, { actualSpentMicroUsd = 0 }) {
    return await transaction(async (client) => {
      const resRes = await client.query(
        "SELECT * FROM budget_reservations WHERE id = $1 FOR UPDATE",
        [reservationId]
      );
      if (resRes.rows.length === 0) {
        throw new GovernanceServiceError("RESERVATION_NOT_FOUND", 404, "Reservation not found");
      }

      const r = resRes.rows[0];
      if (r.state !== "held") {
        return r;
      }

      const ceiling = Number(r.ceiling_micro_usd);
      const spent = Number(actualSpentMicroUsd);

      await client.query(
        "UPDATE budget_reservations SET state = 'settled', updated_at = NOW() WHERE id = $1",
        [reservationId]
      );

      await client.query(
        `UPDATE budget_accounts
         SET reserved_micro_usd = GREATEST(0, reserved_micro_usd - $2),
             spent_micro_usd = spent_micro_usd + $3,
             updated_at = NOW()
         WHERE id = $1`,
        [r.budget_account_id, ceiling, spent]
      );

      return { ...r, state: "settled" };
    });
  }

  static async releaseReservation(reservationId) {
    return await transaction(async (client) => {
      const resRes = await client.query(
        "SELECT * FROM budget_reservations WHERE id = $1 FOR UPDATE",
        [reservationId]
      );
      if (resRes.rows.length === 0) {
        throw new GovernanceServiceError("RESERVATION_NOT_FOUND", 404, "Reservation not found");
      }

      const r = resRes.rows[0];
      if (r.state !== "held") {
        return r;
      }

      const ceiling = Number(r.ceiling_micro_usd);

      await client.query(
        "UPDATE budget_reservations SET state = 'released', updated_at = NOW() WHERE id = $1",
        [reservationId]
      );

      await client.query(
        `UPDATE budget_accounts
         SET reserved_micro_usd = GREATEST(0, reserved_micro_usd - $2),
             updated_at = NOW()
         WHERE id = $1`,
        [r.budget_account_id, ceiling]
      );

      return { ...r, state: "released" };
    });
  }
}
