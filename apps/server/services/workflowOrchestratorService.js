import { requireRunApproval } from "../dist-workspace/src/security/executionPolicy.js";
import { appendRunEvent } from "../dist-workspace/src/execution/runEventStore.js";
// @ts-check
import crypto from "crypto";
import { query, transaction } from "../config/db.js";
import { VerificationService } from "./verificationService.js";
import { IsolationBrokerService } from "./isolationBrokerService.js";
import { SandboxManager } from "./sandboxManager.js";

/**
 * SHA-256 hash helper.
 * @param {string | Buffer} data
 * @returns {string}
 */
function sha256(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

export class WorkflowServiceError extends Error {
  /**
   * @param {string} code
   * @param {number} status
   * @param {string} message
   */
  constructor(code, status, message) {
    super(message);
    this.name = "WorkflowServiceError";
    this.code = code;
    this.status = status;
  }
}

export class WorkflowOrchestratorService {
  /**
   * Start an autonomous workflow execution run for a goal.
   * Enforces all Stage 09–12 pre-flight verification gates:
   * 1. Goal existence and scope verification
   * 2. Pinned Build Contract revision existence and exact SHA-256 digest validation
   * 3. Contract approval verification (must be approved by human owner or allowed by policy)
   * 4. Windows native isolation & sandbox readiness check
   * 5. Budget ceiling headroom check
   * 6. Immutable run creation in 'running' state with task dependency projection
   */
  static async startWorkflowRun(goalId, {
    contractRevisionId,
    contractDigest,
    repositorySnapshotId = null,
    budgetCeilingMicroUsd = 0,
    actorId = null,
    session = null,
  }) {
    if (!goalId) {
      throw new WorkflowServiceError("INVALID_INPUT", 400, "Goal ID is required");
    }
    if (!contractRevisionId) {
      throw new WorkflowServiceError("INVALID_INPUT", 400, "Contract revision ID is required");
    }

    // 1. Fetch Goal & Project
    const goalRes = await query(
      `SELECT g.id, g.project_id, g.conversation_id, g.intent, g.autonomy_mode, g.status
       FROM goals g
       WHERE g.id = $1`,
      [goalId]
    );
    if (goalRes.rows.length === 0) {
      throw new WorkflowServiceError("GOAL_NOT_FOUND", 404, `Goal ${goalId} not found`);
    }
    const goal = goalRes.rows[0];

    // 2. Fetch & Validate Contract Revision
    const contractRes = await query(
      `SELECT cr.id, cr.contract_id, cr.revision, cr.digest, cr.document, cr.plan_revision_id, cr.created_at
       FROM contract_revisions cr
       WHERE cr.id = $1 AND cr.goal_id=$2`,
      [contractRevisionId,goalId]
    );
    if (contractRes.rows.length === 0) {
      throw new WorkflowServiceError("CONTRACT_NOT_FOUND", 404, `Contract revision ${contractRevisionId} not found`);
    }
    const contractRev = contractRes.rows[0];

    // Verify exact contract digest match
    if (contractDigest && contractRev.digest !== contractDigest) {
      throw new WorkflowServiceError(
        "CONTRACT_DIGEST_MISMATCH",
        400,
        `Declared contract digest '${contractDigest}' does not match pinned revision digest '${contractRev.digest}'`
      );
    }

    // 3. Verify Approval Requirement
    // If autonomy mode is supervised or guarded, an active unexpired approval record is required
    const autonomyMode = goal.autonomy_mode || "supervised";
    if (autonomyMode === "supervised" || autonomyMode === "guarded") {
      const appRes = await query(
        `SELECT id, state, expires_at, input_digest FROM approvals 
         WHERE contract_revision_id = $1 
           AND state = 'approved'
           AND (expires_at IS NULL OR expires_at > NOW())
         ORDER BY created_at DESC
         LIMIT 1`,
        [contractRevisionId]
      );
      if (appRes.rows.length === 0) {
        throw new WorkflowServiceError(
          "APPROVAL_REQUIRED",
          400,
          `Execution requires an approved Build Contract (active and unexpired) for autonomy mode '${autonomyMode}'`
        );
      }
      if (appRes.rows[0].input_digest !== contractRev.digest) {
        throw new WorkflowServiceError(
          "APPROVAL_SCOPE_MISMATCH",
          400,
          "Approval scope digest does not match pinned contract digest"
        );
      }
    }

    // 4. Verify Sandbox Isolation Readiness (fail-closed)
    const graphEnabled=process.env.SIRONA_ORCHESTRATION_ENABLED==='true';
    if(graphEnabled){
      const {requireHomeProfile,requireRoot}=await import('../dist-workspace/src/workspace/homeProfile.js');
      const {requireProjectIdentity}=await import('../dist-workspace/src/security/executionPolicy.js');
      await transaction(async client=>{await requireProjectIdentity(client,goal.project_id,session);await requireHomeProfile(client);
        const root=(await client.query('SELECT primary_path FROM projects WHERE id=$1',[goal.project_id])).rows[0];
        await requireRoot(client,goal.project_id,contractRev.document?.orchestration?.rootRef,root.primary_path);});
    }
    const prereqs = graphEnabled?{status:'ready'}:await IsolationBrokerService.checkPrerequisites();
    const sandboxReady = prereqs && prereqs.status === "ready";
    const sandboxAvailable = sandboxReady || (await SandboxManager.resolveBackend({ allowHostExecution: false }).then(() => true).catch(() => false));
    if (!sandboxAvailable && !process.env.SIRONA_ALLOW_HOST_EXECUTION) {
      throw new WorkflowServiceError(
        "SANDBOX_UNAVAILABLE",
        503,
        "Windows native isolation boundary is unavailable"
      );
    }

    // 5. Budget Ceiling Check
    const budgetCeiling = Number(budgetCeilingMicroUsd || 0);
    if (budgetCeiling < 0) {
      throw new WorkflowServiceError("INVALID_BUDGET", 400, "Budget ceiling cannot be negative");
    }

    // 6. Create Durable Run and initialize tasks
    return await transaction(async (client) => {
      // Create run in 'running' state
      const runSql = `
        INSERT INTO runs (
          project_id, goal_id, contract_revision_id, plan_revision_id,
          repository_snapshot_id, state, autonomy_mode, epoch,
          budget_limit_micro_usd, version, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, 'running', $6, 1, $7, 1, NOW(), NOW())
        RETURNING *
      `;
      const runRes = await client.query(runSql, [
        goal.project_id,
        goalId,
        contractRevisionId,
        contractRev.plan_revision_id,
        repositorySnapshotId,
        autonomyMode,
        budgetCeiling,
      ]);
      const run = runRes.rows[0];
      if(graphEnabled){const {bindGraphRun}=await import('../dist-workspace/src/orchestration/graphRuntime.js');await bindGraphRun(client,run.id);}
      if(process.env.SIRONA_EXECUTION_RELIABILITY === "true") await requireRunApproval(client,run.id);

      // Record run.started event
      await appendRunEvent(client,run.id,"run.started",{
          runId: run.id,
          goalId,
          contractRevisionId,
          contractDigest: contractRev.digest,
          autonomyMode,
          actorId,
          startedAt: new Date().toISOString(),
        });

      // Project steps from contract document into tasks
      const steps = contractRev.document?.steps || [];
      if (Array.isArray(steps) && steps.length > 0) {
        for (const step of steps) {
          const stepKey = step.key || `step_${Math.random().toString(36).substring(2, 8)}`;
          const deps = Array.isArray(step.dependencies) ? step.dependencies : [];
          await client.query(
            `INSERT INTO tasks (
              run_id, step_key, state, dependencies, max_attempts, created_at, updated_at
            ) VALUES ($1, $2, 'pending', $3, 3, NOW(), NOW())`,
            [run.id, stepKey, JSON.stringify(deps)]
          );
        }
        await client.query(
          `UPDATE runs SET progress_total_tasks = $1 WHERE id = $2`,
          [steps.length, run.id]
        );
        run.progress_total_tasks = steps.length;
      }

      return run;
    });
  }

  /**
   * Record an incident failure with deterministic fingerprint deduplication.
   */
  static async recordFailure(runId, {
    taskId = null,
    failureClass,
    errorDetail,
    hypothesisRef = null,
    repairAttempt = 0,
  }) {
    if (!runId || !failureClass) {
      throw new WorkflowServiceError("INVALID_INPUT", 400, "runId and failureClass are required");
    }

    const safeDetailJson = typeof errorDetail === "object" && errorDetail !== null
      ? errorDetail
      : { message: String(errorDetail || "Unknown failure") };

    const rawTrace = failureClass + ":" + JSON.stringify(safeDetailJson);
    const fingerprint = sha256(rawTrace);

    // Check for existing failure with same fingerprint in this run (deduplication)
    const existingRes = await query(
      `SELECT id, fingerprint, repair_attempt, created_at 
       FROM control.failures 
       WHERE run_id = $1 AND fingerprint = $2`,
      [runId, fingerprint]
    );
    const isDuplicate = existingRes.rows.length > 0;

    const insertSql = `
      INSERT INTO control.failures (
        run_id, task_id, class, fingerprint, safe_detail, hypothesis_ref, repair_attempt, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING *
    `;
    const res = await query(insertSql, [
      runId,
      taskId,
      failureClass,
      fingerprint,
      JSON.stringify(safeDetailJson),
      hypothesisRef,
      repairAttempt,
    ]);

    const failure = res.rows[0];
    return {
      ...failure,
      isDuplicate,
    };
  }

  /**
   * Formulate a structured repair hypothesis.
   */
  static async createRepairHypothesis(runId, {
    failureId = null,
    strategy = "targeted_patch",
    diagnosis,
    proposedActions = [],
    attempt = 1,
    maxAttempts = 3,
  }) {
    if (!runId || !diagnosis) {
      throw new WorkflowServiceError("INVALID_INPUT", 400, "runId and diagnosis are required");
    }

    const insertSql = `
      INSERT INTO control.repair_hypotheses (
        run_id, failure_id, attempt, max_attempts, strategy, diagnosis, proposed_actions, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', NOW(), NOW())
      RETURNING *
    `;
    const res = await query(insertSql, [
      runId,
      failureId,
      attempt,
      maxAttempts,
      strategy,
      diagnosis,
      JSON.stringify(proposedActions),
    ]);
    return res.rows[0];
  }

  /**
   * Apply a repair action and increment repair counter on the run.
   */
  static async applyRepair(runId, hypothesisId, { appliedPatchDigest = null } = {}) {
    return await transaction(async (client) => {
      // 1. Update hypothesis status to applied
      const updateHypSql = `
        UPDATE control.repair_hypotheses
        SET status = 'applied', applied_patch_digest = $1, updated_at = NOW()
        WHERE id = $2 AND run_id = $3
        RETURNING *
      `;
      const hypRes = await client.query(updateHypSql, [appliedPatchDigest, hypothesisId, runId]);
      if (hypRes.rows.length === 0) {
        throw new WorkflowServiceError("HYPOTHESIS_NOT_FOUND", 404, `Repair hypothesis ${hypothesisId} not found`);
      }

      // 2. Increment repair attempts on the run
      const updateRunSql = `
        UPDATE runs
        SET repair_attempts = repair_attempts + 1, updated_at = NOW()
        WHERE id = $1
        RETURNING id, repair_attempts, max_repair_attempts
      `;
      const runRes = await client.query(updateRunSql, [runId]);

      // 3. Emit repair.applied event

      await appendRunEvent(client,runId,"repair.applied",{
          hypothesisId,
          repairAttempts: runRes.rows[0]?.repair_attempts,
          appliedPatchDigest,
          appliedAt: new Date().toISOString(),
        });

      return {
        hypothesis: hypRes.rows[0],
        run: runRes.rows[0],
      };
    });
  }

  /**
   * Retrieve all recorded failures for a run.
   */
  static async getRunFailures(runId) {
    const res = await query(
      `SELECT id, run_id, task_id, class, fingerprint, safe_detail, hypothesis_ref, repair_attempt, created_at
       FROM control.failures
       WHERE run_id = $1
       ORDER BY created_at ASC`,
      [runId]
    );
    return res.rows;
  }

  /**
   * Retrieve all repair hypotheses for a run.
   */
  static async getRunRepairs(runId) {
    const res = await query(
      `SELECT id, run_id, failure_id, attempt, max_attempts, strategy, diagnosis, proposed_actions, status, applied_patch_digest, created_at, updated_at
       FROM control.repair_hypotheses
       WHERE run_id = $1
       ORDER BY created_at ASC`,
      [runId]
    );
    return res.rows;
  }

  /**
   * Closed-loop autonomous execution with Stage 12 independent verification and bounded repair.
   */
  static async executeWorkflow(runId, {
    artifactId = null,
    testResults = null,
    verifierIdentity = "system:verifier:stage13",
    repairAction = null,
  } = {}) {
    if (!runId) {
      throw new WorkflowServiceError("INVALID_INPUT", 400, "runId is required");
    }

    const runRes = await query("SELECT * FROM runs WHERE id = $1", [runId]);
    if (runRes.rows.length === 0) {
      throw new WorkflowServiceError("RUN_NOT_FOUND", 404, `Run ${runId} not found`);
    }
    const run = runRes.rows[0];

    // 1. Run Independent Verification Engine (Stage 12)
    const report = await VerificationService.createVerificationJob({
      runId,
      artifactId,
      verifierIdentity,
      testResults,
    });

    // 2. Handle Outcome: PASS
    if (report.outcome === "pass") {
      await transaction(async (client) => {
        await client.query(
          `UPDATE runs 
           SET state = 'completed', verification_report_id = $1, final_report_id = $1, updated_at = NOW()
           WHERE id = $2`,
          [report.id, runId]
        );
await appendRunEvent(client,runId,"run.completed",{
            runId,
            verificationReportId: report.id,
            outcome: "pass",
            completedAt: new Date().toISOString(),
          });
      });

      return {
        status: "completed",
        runId,
        reportId: report.id,
        outcome: "pass",
        repairAttempts: run.repair_attempts,
      };
    }

    // 3. Handle Outcome: UNKNOWN (skipped required check blocks completion)
    if (report.outcome === "unknown") {
      await this.recordFailure(runId, {
        failureClass: "MISSING_REQUIRED_CRITERIA",
        errorDetail: {
          message: "One or more required acceptance checks were skipped or reported unknown",
          rubric: report.rubric,
        },
      });

      await query(
        `UPDATE runs SET state = 'blocked', verification_report_id = $1, updated_at = NOW() WHERE id = $2`,
        [report.id, runId]
      );

      return {
        status: "blocked",
        reason: "MISSING_REQUIRED_CRITERIA",
        runId,
        reportId: report.id,
        outcome: "unknown",
      };
    }

    // 4. Handle Outcome: FAIL -> Enter Bounded Repair Engine
    const failedCriteria = report.criteria || [];
    const failureRecord = await this.recordFailure(runId, {
      failureClass: "VERIFICATION_CRITERION_FAILED",
      errorDetail: {
        message: "Verification criteria failed",
        failedCount: report.failedCount ?? report.failed_count,
        criteria: failedCriteria,
      },
      repairAttempt: run.repair_attempts + 1,
    });

    // Check bounded repair limits
    const currentAttempts = Number(run.repair_attempts || 0);
    const maxAttempts = Number(run.max_repair_attempts || 3);

    if (currentAttempts >= maxAttempts) {
      // Repair exhausted -> Fail Closed
      await transaction(async (client) => {
        await client.query(
          `UPDATE runs 
           SET state = 'failed', verification_report_id = $1, updated_at = NOW()
           WHERE id = $2`,
          [report.id, runId]
        );
await appendRunEvent(client,runId,"run.failed",{
            runId,
            reason: "REPAIR_ATTEMPTS_EXHAUSTED",
            verificationReportId: report.id,
            repairAttempts: currentAttempts,
            failedAt: new Date().toISOString(),
          });
      });

      return {
        status: "failed",
        reason: "REPAIR_ATTEMPTS_EXHAUSTED",
        runId,
        reportId: report.id,
        outcome: "fail",
        repairAttempts: currentAttempts,
      };
    }

    // Formulate Repair Hypothesis
    const hypothesis = await this.createRepairHypothesis(runId, {
      failureId: failureRecord.id,
      strategy: "targeted_patch",
      diagnosis: `Verification failed with ${report.failedCount ?? report.failed_count} failing criteria. Applying bounded repair hypothesis.`,
      proposedActions: [
        { action: "patch_defect", targetArtifactId: artifactId },
      ],
      attempt: currentAttempts + 1,
      maxAttempts,
    });

    // If repairAction is provided, apply it and re-verify
    if (typeof repairAction === "function") {
      const patchResult = await repairAction({ runId, hypothesisId: hypothesis.id, report });
      await this.applyRepair(runId, hypothesis.id, {
        appliedPatchDigest: patchResult?.digest || sha256("applied_patch_" + hypothesis.id),
      });

      // Re-verify with repaired test results/artifact
      const repairedReport = await VerificationService.createVerificationJob({
        runId,
        artifactId: patchResult?.repairedArtifactId || artifactId,
        verifierIdentity,
        testResults: patchResult?.repairedTestResults || testResults,
      });

      if (repairedReport.outcome === "pass") {
        await transaction(async (client) => {
          await client.query(
            `UPDATE runs 
             SET state = 'completed', verification_report_id = $1, final_report_id = $1, updated_at = NOW()
             WHERE id = $2`,
            [repairedReport.id, runId]
          );
await appendRunEvent(client,runId,"run.completed",{
              runId,
              verificationReportId: repairedReport.id,
              outcome: "pass",
              repairAttempts: currentAttempts + 1,
              completedAt: new Date().toISOString(),
            });
        });

        return {
          status: "completed",
          runId,
          reportId: repairedReport.id,
          outcome: "pass",
          repairAttempts: currentAttempts + 1,
        };
      }
    }

    return {
      status: "repair_pending",
      runId,
      reportId: report.id,
      hypothesisId: hypothesis.id,
      repairAttempts: currentAttempts + 1,
      outcome: "fail",
    };
  }
}
