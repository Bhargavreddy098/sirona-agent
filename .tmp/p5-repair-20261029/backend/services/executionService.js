import crypto from "node:crypto";
import { appendRunEvent } from "../dist-workspace/src/execution/runEventStore.js";
import { ensureEffect } from "../dist-workspace/src/execution/effectJournal.js";
import { requireFence, requireRunApproval } from "../dist-workspace/src/security/executionPolicy.js";
import { query, transaction } from "../config/db.js";

/* =====================================================================
   Execution Service — Stage 07 Durable Execution, Tasks, Effects & SSE
   Implements resilient execution runs, bounded DAG tasks, permanent
   effect identities, atomic checkpoints, and ordered event replay.
   ===================================================================== */

export class ExecutionServiceError extends Error {
  /**
   * @param {string} code
   * @param {number} status
   * @param {string} message
   */
  constructor(code, status, message) {
    super(message);
    this.name = "ExecutionServiceError";
    this.code = code;
    this.status = status;
  }
}

function sha256(data) {
  return crypto.createHash("sha256").update(typeof data === "string" ? data : JSON.stringify(data)).digest("hex");
}

export class ExecutionService {
  // ==========================================
  // 1. Runs Lifecycle
  // ==========================================

  /**
   * Create a durable run.
   */
  static async createRun({
    projectId,
    goalId = null,
    contractRevisionId = null,
    planRevisionId = null,
    repositorySnapshotId = null,
    autonomyMode = "supervised",
    budgetCeilingMicroUsd = 0,
  }) {
    if (!projectId) {
      throw new ExecutionServiceError("INVALID_INPUT", 400, "Project ID is required");
    }

    const projRes = await query("SELECT id FROM projects WHERE id = $1", [projectId]);
    if (projRes.rows.length === 0) {
      throw new ExecutionServiceError("PROJECT_NOT_FOUND", 404, `Project ${projectId} not found`);
    }

    return await transaction(async (client) => {
      const sql = `
        INSERT INTO runs (
          project_id, goal_id, contract_revision_id, plan_revision_id,
          repository_snapshot_id, state, autonomy_mode, epoch,
          budget_limit_micro_usd, version, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, 'pending', $6, 1, $7, 1, NOW(), NOW())
        RETURNING *
      `;
      const res = await client.query(sql, [
        projectId,
        goalId,
        contractRevisionId,
        planRevisionId,
        repositorySnapshotId,
        autonomyMode,
        budgetCeilingMicroUsd,
      ]);
      const run = res.rows[0];

      // Allocate initial run_created event
      await this._recordEvent(client, run.id, "run_created", {
        runId: run.id,
        projectId,
        autonomyMode,
      });

      return this._formatRun(run, "1");
    });
  }

  /**
   * List runs for a project.
   */
  static async getRuns(projectId, { state = null, limit = 50, offset = 0 } = {}) {
    let sql = "SELECT * FROM runs WHERE project_id = $1";
    const params = [projectId];

    if (state) {
      params.push(state);
      sql += ` AND state = $${params.length}`;
    }

    sql += " ORDER BY created_at DESC LIMIT $" + (params.length + 1) + " OFFSET $" + (params.length + 2);
    params.push(Math.min(100, Math.max(1, limit)), Math.max(0, offset));

    const res = await query(sql, params);
    return res.rows.map((r) => this._formatRun(r));
  }

  /**
   * Get run by ID with current sequence for SSE subscription alignment.
   */
  static async getRunById(runId) {
    const res = await query("SELECT * FROM runs WHERE id = $1", [runId]);
    if (res.rows.length === 0) {
      throw new ExecutionServiceError("RUN_NOT_FOUND", 404, `Run ${runId} not found`);
    }
    const currentSeq = await this.getCurrentSequence(runId);
    return this._formatRun(res.rows[0], currentSeq);
  }

  /**
   * Pause run: increments epoch, saves quiescent checkpoint, transitions to paused.
   */
  static async pauseRun(runId, { reason = "user_requested", actorId: _actorId = null } = {}) {
    return await transaction(async (client) => {
      const runRes = await client.query("SELECT * FROM runs WHERE id = $1 FOR UPDATE", [runId]);
      if (runRes.rows.length === 0) {
        throw new ExecutionServiceError("RUN_NOT_FOUND", 404, `Run ${runId} not found`);
      }
      const run = runRes.rows[0];

      if (["completed", "failed", "cancelled"].includes(run.state)) {
        throw new ExecutionServiceError("TERMINAL_RUN", 409, `Cannot pause terminal run in state '${run.state}'`);
      }

      if (run.state === "paused") {
        const seq = await this._getSeq(client, runId);
        return this._formatRun(run, seq);
      }

      const nextEpoch = Number(run.epoch) + 1;
      const nextVersion = Number(run.version) + 1;

      const updateRes = await client.query(
        `UPDATE runs
         SET state = 'paused', epoch = $2, version = $3, updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [runId, nextEpoch, nextVersion]
      );

      // Create pause checkpoint
      await client.query(
        `INSERT INTO run_checkpoints (run_id, sequence, epoch, state_digest, state_data, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [runId, nextEpoch, nextEpoch, sha256({ state: "paused", epoch: nextEpoch }), JSON.stringify({ reason })]
      );

      const seq = await this._recordEvent(client, runId, "run_paused", {
        runId,
        epoch: nextEpoch,
        reason,
      });

      return this._formatRun(updateRes.rows[0], seq);
    });
  }

  /**
   * Resume run: validates checkpoint & expectedEpoch, increments epoch, transitions to running.
   */
  static async resumeRun(runId, { checkpointId = null, expectedEpoch = null, actorId: _actorId = null } = {}) {
    return await transaction(async (client) => {
      const runRes = await client.query("SELECT * FROM runs WHERE id = $1 FOR UPDATE", [runId]);
      if (runRes.rows.length === 0) {
        throw new ExecutionServiceError("RUN_NOT_FOUND", 404, `Run ${runId} not found`);
      }
      const run = runRes.rows[0];

      if (["completed", "failed", "cancelled"].includes(run.state)) {
        throw new ExecutionServiceError("TERMINAL_RUN", 409, `Cannot resume terminal run in state '${run.state}'`);
      }

      // If expectedEpoch supplied, ensure it matches current run epoch
      if (expectedEpoch != null && String(run.epoch) !== String(expectedEpoch)) {
        throw new ExecutionServiceError("STALE_CHECKPOINT", 409, `Expected epoch ${expectedEpoch} does not match current run epoch ${run.epoch}`);
      }

      // If checkpointId supplied, verify it exists and matches run
      if (checkpointId) {
        const cpRes = await client.query("SELECT id FROM run_checkpoints WHERE id = $1 AND run_id = $2", [checkpointId, runId]);
        if (cpRes.rows.length === 0) {
          throw new ExecutionServiceError("CHECKPOINT_NOT_FOUND", 404, `Checkpoint ${checkpointId} not found for run ${runId}`);
        }
      }

      if (process.env.SIRONA_EXECUTION_RELIABILITY === "true") await requireRunApproval(client,runId);
      const nextEpoch = Number(run.epoch) + 1;
      const nextVersion = Number(run.version) + 1;

      const updateRes = await client.query(
        `UPDATE runs
         SET state = 'running', epoch = $2, version = $3, updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [runId, nextEpoch, nextVersion]
      );

      const seq = await this._recordEvent(client, runId, "run_resumed", {
        runId,
        epoch: nextEpoch,
      });

      return this._formatRun(updateRes.rows[0], seq);
    });
  }

  /**
   * Cancel run: fences running work, transitions to cancelled (idempotent).
   */
  static async cancelRun(runId, { reason = "user_requested", actorId: _actorId = null } = {}) {
    return await transaction(async (client) => {
      const runRes = await client.query("SELECT * FROM runs WHERE id = $1 FOR UPDATE", [runId]);
      if (runRes.rows.length === 0) {
        throw new ExecutionServiceError("RUN_NOT_FOUND", 404, `Run ${runId} not found`);
      }
      const run = runRes.rows[0];

      if (run.state === "cancelled") {
        const seq = await this._getSeq(client, runId);
        return this._formatRun(run, seq);
      }

      const nextEpoch = Number(run.epoch) + 1;
      const nextVersion = Number(run.version) + 1;

      const updateRes = await client.query(
        `UPDATE runs
         SET state = 'cancelled', epoch = $2, version = $3, updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [runId, nextEpoch, nextVersion]
      );

      // Fence running tasks
      await client.query(
        `UPDATE tasks
         SET state = 'cancelled', updated_at = NOW()
         WHERE run_id = $1 AND state IN ('pending', 'queued', 'running')`,
        [runId]
      );

      const seq = await this._recordEvent(client, runId, "run_cancelled", {
        runId,
        epoch: nextEpoch,
        reason,
      });

      return this._formatRun(updateRes.rows[0], seq);
    });
  }

  // ==========================================
  // 2. Tasks DAG Management
  // ==========================================

  /**
   * Add a task to a run's DAG.
   */
  static async createTask({
    runId,
    stepKey,
    dependencies = [],
    maxAttempts = 3,
  }) {
    if (!runId || !stepKey) {
      throw new ExecutionServiceError("INVALID_INPUT", 400, "runId and stepKey are required");
    }

    return await transaction(async (client) => {
      const runRes = await client.query("SELECT id FROM runs WHERE id = $1 FOR UPDATE", [runId]);
      if (runRes.rows.length === 0) {
        throw new ExecutionServiceError("RUN_NOT_FOUND", 404, `Run ${runId} not found`);
      }

      const sql = `
        INSERT INTO tasks (run_id, step_key, state, dependencies, max_attempts, created_at, updated_at)
        VALUES ($1, $2, 'pending', $3, $4, NOW(), NOW())
        ON CONFLICT (run_id, step_key) DO UPDATE
        SET dependencies = EXCLUDED.dependencies, updated_at = NOW()
        RETURNING *
      `;
      const res = await client.query(sql, [runId, stepKey, JSON.stringify(dependencies), maxAttempts]);

      // Update total tasks count in run
      await client.query(
        "UPDATE runs SET progress_total_tasks = (SELECT COUNT(*) FROM tasks WHERE run_id = $1) WHERE id = $1",
        [runId]
      );

      return this._formatTask(res.rows[0]);
    });
  }

  /**
   * List tasks for a run.
   */
  static async getTasks(runId, { state = null, limit = 50, offset = 0 } = {}) {
    let sql = "SELECT * FROM tasks WHERE run_id = $1";
    const params = [runId];

    if (state) {
      params.push(state);
      sql += ` AND state = $${params.length}`;
    }

    sql += " ORDER BY created_at ASC LIMIT $" + (params.length + 1) + " OFFSET $" + (params.length + 2);
    params.push(Math.min(100, Math.max(1, limit)), Math.max(0, offset));

    const res = await query(sql, params);
    return res.rows.map((t) => this._formatTask(t));
  }

  /**
   * Claim an eligible task according to DAG dependency resolution.
   */
  static async claimTask(runId, { holder = "worker-1", ttlSeconds = 60 } = {}) {
    return await transaction(async (client) => {
      const runLock = await client.query("SELECT id,state,epoch FROM runs WHERE id=$1 FOR UPDATE", [runId]);
      if (!runLock.rows.length) throw new ExecutionServiceError("RUN_NOT_FOUND",404,"Run not found");
      if (process.env.SIRONA_EXECUTION_RELIABILITY === "true" && runLock.rows[0].state !== "running") throw new ExecutionServiceError("RUN_NOT_RUNNING",409,"Run is not running");
      // 1. Fetch completed task stepKeys for this run
      const compRes = await client.query(
        "SELECT step_key FROM tasks WHERE run_id = $1 AND state = 'completed'",
        [runId]
      );
      const completedSteps = new Set(compRes.rows.map((r) => r.step_key));

      // 2. Fetch pending or queued tasks
      const candRes = await client.query(
        "SELECT * FROM tasks WHERE run_id = $1 AND attempt < max_attempts AND (state IN ('pending', 'queued') OR (state='running' AND lease_expires_at<NOW() AND NOT EXISTS(SELECT 1 FROM effects e WHERE e.task_id=tasks.id AND e.state IN ('dispatched','unknown')))) ORDER BY created_at ASC FOR UPDATE",
        [runId]
      );

      for (const task of candRes.rows) {
        const deps = Array.isArray(task.dependencies) ? task.dependencies : [];
        const isEligible = deps.every((dep) => completedSteps.has(dep));

        if (isEligible) {
          const nextAttempt = Number(task.attempt) + 1;
          const nextEpoch = Number(task.lease_epoch) + 1;
          const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

          const updateRes = await client.query(
            `UPDATE tasks
             SET state = 'running', attempt = $2, lease_epoch = $3, lease_holder = $4, lease_expires_at = $5, updated_at = NOW()
             WHERE id = $1
             RETURNING *`,
            [task.id, nextAttempt, nextEpoch, holder, expiresAt]
          );

          await this._recordEvent(client, runId, "task_started", {
            taskId: task.id,
            stepKey: task.step_key,
            attempt: nextAttempt,
            holder,
          });

          return {...this._formatTask(updateRes.rows[0]), leaseHolder:holder, runEpoch:String(runLock.rows[0].epoch)};
        }
      }

      return null;
    });
  }

  static async renewTask(taskId,runId,fence,ttlSeconds=90) {
    return transaction(async client=>{await client.query("SELECT id FROM runs WHERE id=$1 FOR UPDATE",[runId]);await requireFence(client,runId,taskId,fence);await client.query("UPDATE tasks SET lease_expires_at=NOW()+($2 * INTERVAL '1 second') WHERE id=$1",[taskId,Math.min(300,Math.max(10,ttlSeconds))]);});
  }

  /**
   * Complete or fail a task.
   */
  static async finishTask(taskId, { state = "completed", result = null, errorMessage = null, artifactIds = [], fence = null, diff = null } = {}) {
    return await transaction(async (client) => {
      const ref=await client.query("SELECT run_id FROM tasks WHERE id=$1",[taskId]);
      if (!ref.rows.length) throw new ExecutionServiceError("TASK_NOT_FOUND",404,"Task not found");
      await client.query("SELECT id FROM runs WHERE id=$1 FOR UPDATE",[ref.rows[0].run_id]);
      if (process.env.SIRONA_EXECUTION_RELIABILITY === "true") await requireFence(client,ref.rows[0].run_id,taskId,fence);
      const taskRes = await client.query("SELECT * FROM tasks WHERE id = $1 FOR UPDATE", [taskId]);
      if (taskRes.rows.length === 0) {
        throw new ExecutionServiceError("TASK_NOT_FOUND", 404, `Task ${taskId} not found`);
      }
      const task = taskRes.rows[0];
      if (!["completed","failed","cancelled"].includes(state)) throw new ExecutionServiceError("INVALID_STATE",400,"Invalid terminal task state");

      const updateRes = await client.query(
        `UPDATE tasks
         SET state = $2, result = $3, error_message = $4, artifact_ids = $5, diff=COALESCE($6,diff), updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [taskId, state, result ? JSON.stringify(result) : null, errorMessage, JSON.stringify(artifactIds),diff]
      );

      // If completed, update run progress
      if (state === "completed") {
        await client.query(
          "UPDATE runs SET progress_completed_tasks = (SELECT COUNT(*) FROM tasks WHERE run_id = $1 AND state = 'completed') WHERE id = $1",
          [task.run_id]
        );
      }

      await this._recordEvent(client, task.run_id, state === "completed" ? "task_completed" : "task_failed", {
        taskId,
        stepKey: task.step_key,
        state,
        errorMessage,
      });

      return this._formatTask(updateRes.rows[0]);
    });
  }

  // ==========================================
  // 3. Agent Sessions
  // ==========================================

  static async createAgentSession({ runId, taskId = null, role = "worker", capabilities = [] }) {
    const sql = `
      INSERT INTO agent_sessions (run_id, task_id, role, state, capabilities, created_at, updated_at)
      VALUES ($1, $2, $3, 'active', $4, NOW(), NOW())
      RETURNING *
    `;
    const res = await query(sql, [runId, taskId, role, JSON.stringify(capabilities)]);
    return this._formatAgent(res.rows[0]);
  }

  static async getAgents(runId, { limit = 50, offset = 0 } = {}) {
    const sql = "SELECT * FROM agent_sessions WHERE run_id = $1 ORDER BY created_at ASC LIMIT $2 OFFSET $3";
    const res = await query(sql, [runId, Math.min(100, Math.max(1, limit)), Math.max(0, offset)]);
    return res.rows.map((a) => this._formatAgent(a));
  }

  // ==========================================
  // 4. Effects & Safe Reconciliation
  // ==========================================

  static async createEffect({
    runId,
    taskId,
    toolId,
    inputDigest,
    targetSummary,
    risk = "low",
    approvalId = null,
    operationKey = null,
  }) {
    if (operationKey !== null) {
      if (process.env.SIRONA_EXECUTION_RELIABILITY !== "true") throw new ExecutionServiceError("RELIABILITY_DISABLED",503,"Keyed effects require qualified reliability admission");
      const result=await transaction(client=>ensureEffect(client,{runId,taskId,toolId,inputDigest,targetSummary,risk,approvalId,operationKey}));
      return this._formatEffect({...result.effect,run_id:result.effect.runId,task_id:result.effect.taskId,tool_id:result.effect.toolId,input_digest:result.effect.inputDigest,target_summary:result.effect.targetSummary,approval_id:result.effect.approvalId,operation_key:result.effect.operationKey,created_at:result.effect.createdAt,updated_at:result.effect.updatedAt});
    }
    const sql = `
      INSERT INTO effects (run_id, task_id, tool_id, input_digest, target_summary, risk, state, approval_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, NOW(), NOW())
      RETURNING *
    `;
    const res = await query(sql, [runId, taskId, toolId, inputDigest, targetSummary, risk, approvalId]);
    return this._formatEffect(res.rows[0]);
  }

  static async getEffects(runId, { state = null, limit = 50, offset = 0 } = {}) {
    let sql = "SELECT * FROM effects WHERE run_id = $1";
    const params = [runId];

    if (state) {
      params.push(state);
      sql += ` AND state = $${params.length}`;
    }

    sql += " ORDER BY created_at ASC LIMIT $" + (params.length + 1) + " OFFSET $" + (params.length + 2);
    params.push(Math.min(100, Math.max(1, limit)), Math.max(0, offset));

    const res = await query(sql, params);
    return res.rows.map((e) => this._formatEffect(e));
  }

  /**
   * Request trusted reconciliation for an effect.
   * In Stage 07, safely returns a blocked operation (OUTCOME_UNKNOWN) per contract.
   */
  static async reconcileEffect(effectId, { externalReceiptRef = null, reason = "user_reconcile_request", actorId: _actorId = null } = {}) {
    const effRes = await query("SELECT * FROM effects WHERE id = $1", [effectId]);
    if (effRes.rows.length === 0) {
      throw new ExecutionServiceError("EFFECT_NOT_FOUND", 404, `Effect ${effectId} not found`);
    }

    const insertSql = `
      INSERT INTO reconciliation_operations (effect_id, state, reason, external_receipt_ref, created_at, updated_at)
      VALUES ($1, 'blocked', $2, $3, NOW(), NOW())
      RETURNING *
    `;
    const res = await query(insertSql, [effectId, reason, externalReceiptRef]);
    const op = res.rows[0];

    return {
      id: op.id,
      effectId: op.effect_id,
      state: op.state,
      reason: op.reason,
      externalReceiptRef: op.external_receipt_ref,
      createdAt: op.created_at,
    };
  }

  // ==========================================
  // 5. Checkpoints
  // ==========================================

  static async saveCheckpoint(runId, { stateData = {} } = {}) {
    return await transaction(async (client) => {
      const runRes = await client.query("SELECT epoch FROM runs WHERE id = $1 FOR UPDATE", [runId]);
      if (runRes.rows.length === 0) {
        throw new ExecutionServiceError("RUN_NOT_FOUND", 404, `Run ${runId} not found`);
      }
      const epoch = Number(runRes.rows[0].epoch);

      const seqRes = await client.query(
        "SELECT COALESCE(MAX(sequence), 0) + 1 AS next_seq FROM run_checkpoints WHERE run_id = $1",
        [runId]
      );
      const seq = Number(seqRes.rows[0].next_seq);

      const digest = sha256({ runId, sequence: seq, epoch, stateData });

      const insertSql = `
        INSERT INTO run_checkpoints (run_id, sequence, epoch, state_digest, state_data, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING *
      `;
      const res = await client.query(insertSql, [runId, seq, epoch, digest, JSON.stringify(stateData)]);
      return this._formatCheckpoint(res.rows[0]);
    });
  }

  static async getCheckpoints(runId, { limit = 50, offset = 0 } = {}) {
    const sql = "SELECT * FROM run_checkpoints WHERE run_id = $1 ORDER BY sequence DESC LIMIT $2 OFFSET $3";
    const res = await query(sql, [runId, Math.min(100, Math.max(1, limit)), Math.max(0, offset)]);
    return res.rows.map((c) => this._formatCheckpoint(c));
  }

  // ==========================================
  // 6. Ordered Run Events & SSE Support
  // ==========================================

  static async getCurrentSequence(runId) {
    const res = await query(
      "SELECT COALESCE(MAX(sequence), 0) AS cur_seq FROM run_events WHERE run_id = $1",
      [runId]
    );
    return String(res.rows[0]?.cur_seq || "0");
  }

  /** @param {string} runId @param {{afterSequence?:string|number,limit?:number}} [options] */
  static async getRunEvents(runId, { afterSequence = 0, limit = 100 } = {}) {
    const sql = `
      SELECT id, run_id, sequence, event_type, payload, created_at
      FROM run_events
      WHERE run_id = $1 AND sequence > $2
      ORDER BY sequence ASC
      LIMIT $3
    `;
    const res = await query(sql, [runId, afterSequence, Math.min(500, Math.max(1, limit))]);
    return res.rows.map((r) => ({
      id: String(r.id),
      runId: r.run_id,
      sequence: String(r.sequence),
      eventType: r.event_type,
      payload: r.payload,
      createdAt: r.created_at,
    }));
  }

  // ==========================================
  // Helper Formatters
  // ==========================================

  static async _recordEvent(client,runId,eventType,payload) { return appendRunEvent(client,runId,eventType,payload); }

  static async recordEvent(runId,eventType,payload) { return transaction(client=>appendRunEvent(client,runId,eventType,payload)); }

  static async _getSeq(client, runId) {
    const seqRes = await client.query(
      "SELECT COALESCE(MAX(sequence), 0) AS cur_seq FROM run_events WHERE run_id = $1",
      [runId]
    );
    return String(seqRes.rows[0]?.cur_seq || "0");
  }

  static _formatRun(r, currentSeq = "0") {
    return {
      id: r.id,
      projectId: r.project_id,
      goalId: r.goal_id,
      contractRevisionId: r.contract_revision_id,
      planRevisionId: r.plan_revision_id,
      repositorySnapshotId: r.repository_snapshot_id,
      state: r.state,
      autonomyMode: r.autonomy_mode,
      epoch: String(r.epoch),
      progress: {
        completedTasks: r.progress_completed_tasks || 0,
        totalTasks: r.progress_total_tasks || 0,
      },
      budget: {
        limit: String(r.budget_limit_micro_usd || "0"),
        reserved: String(r.budget_reserved_micro_usd || "0"),
        spent: String(r.budget_spent_micro_usd || "0"),
      },
      verificationReportId: r.verification_report_id,
      blockers: r.blockers || [],
      version: r.version,
      currentSequence: currentSeq,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  static _formatTask(t) {
    return {
      id: t.id,
      runId: t.run_id,
      stepKey: t.step_key,
      state: t.state,
      attempt: t.attempt,
      maxAttempts: t.max_attempts,
      deadlineAt: t.deadline_at,
      leaseEpoch: String(t.lease_epoch),
      dependencies: t.dependencies || [],
      artifactIds: t.artifact_ids || [],
      result: t.result,
      errorMessage: t.error_message,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    };
  }

  static _formatAgent(a) {
    return {
      id: a.id,
      runId: a.run_id,
      taskId: a.task_id,
      role: a.role,
      state: a.state,
      capabilities: a.capabilities || [],
      deadlineAt: a.deadline_at,
      usageSummary: a.usage_summary || {},
      createdAt: a.created_at,
      updatedAt: a.updated_at,
    };
  }

  static _formatEffect(e) {
    return {
      id: e.id,
      runId: e.run_id,
      taskId: e.task_id,
      toolId: e.tool_id,
      inputDigest: e.input_digest,
      targetSummary: e.target_summary,
      risk: e.risk,
      state: e.state,
      approvalId: e.approval_id,
      receiptRef: e.receipt_ref,
      externalOperationId: e.external_operation_id,
      createdAt: e.created_at,
      updatedAt: e.updated_at,
    };
  }

  static _formatCheckpoint(c) {
    return {
      id: c.id,
      runId: c.run_id,
      sequence: String(c.sequence),
      epoch: String(c.epoch),
      stateDigest: c.state_digest,
      stateData: c.state_data,
      createdAt: c.created_at,
    };
  }
}

export default ExecutionService;
