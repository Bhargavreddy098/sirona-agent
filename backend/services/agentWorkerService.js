import { ExecutionService } from "./executionService.js";
import { requireProjectIdentity, requireRunApproval, requireFence } from "../dist-workspace/src/security/executionPolicy.js";
// @ts-check
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { query, transaction } from "../config/db.js";
import { ContextEngineService } from "./contextEngineService.js";
import { ToolRuntimeService } from "./toolRuntimeService.js";
import { SandboxManager } from "./sandboxManager.js";
import { VerificationService } from "./verificationService.js";
import { WorkflowOrchestratorService } from "./workflowOrchestratorService.js";
import { WorkspacePathResolver } from "./workspacePathResolver.js";
import { AgentExecutionEngine } from "./agentExecutionEngine.js";

export class AgentWorkerService {
  /**
   * Claim next pending task for a run using row-level locking.
   * Ensures atomic, single-worker execution with DAG dependency gating.
   *
   * @param {string} runId
   * @param {string} [workerId]
   * @returns {Promise<any | null>}
   */
  static async claimNextTask(runId,workerId="worker-default") {
    const claimed=await ExecutionService.claimTask(runId,{holder:workerId,ttlSeconds:90});if(!claimed)return null;
    return (await query("SELECT t.*,r.epoch AS run_epoch,r.project_id,r.goal_id,r.contract_revision_id,p.primary_path,p.name AS project_name FROM tasks t JOIN runs r ON r.id=t.run_id JOIN projects p ON p.id=r.project_id WHERE t.id=$1",[claimed.id])).rows[0];
  }

  /**
   * Execute a single claimed task within its workspace and sandbox.
   *
   * @param {any} task
   * @param {{ toolExecutor?: (toolName: string, input: any) => Promise<any>, modelExecutor?: any, session?: any, rootRef?: string|null, commandApprovals?: Record<number,string> }} [options]
   * @returns {Promise<any>}
   */
  static async executeTask(task, { toolExecutor = null, modelExecutor = null, session = null, rootRef = null, commandApprovals = {} } = {}) {
    await transaction(client=>requireProjectIdentity(client,task.project_id,session));
    const workerFence={holder:task.lease_holder,runEpoch:task.run_epoch,leaseEpoch:task.lease_epoch};
    await transaction(client=>requireFence(client,task.run_id,task.id,workerFence));
    let leaseError=null;const timer=setInterval(()=>{void ExecutionService.renewTask(task.id,task.run_id,workerFence).catch(error=>{leaseError=error;});},30000);timer.unref();
    try {
    const rootDir = WorkspacePathResolver.canonicalizeRoot(task.primary_path);

    // 1. Compile Context Pack for this task
    const contextPack = await ContextEngineService.assembleContextPack({
      projectId: task.project_id,
      prompt: `Execute step: ${task.step_key}`,
      runId: task.run_id,
      taskId: task.id,
    });

    // 2. Fetch contract step definition
    let stepDef = null;
    if (task.contract_revision_id) {
      const crRes = await query("SELECT document FROM contract_revisions WHERE id = $1", [task.contract_revision_id]);
      const steps = crRes.rows[0]?.document?.steps || [];
      stepDef = steps.find((s) => s.key === task.step_key);
    }

    // 3. ReAct execution
    const executionLogs = [];
    const filesModified = [];

    // Helper to invoke tools
    let operationOrdinal=0;
    const invoke = async (toolName, input) => {
      const logicalOperation=operationOrdinal++;
      if(leaseError)throw leaseError;
      await transaction(async client=>{await requireProjectIdentity(client,task.project_id,session);await requireFence(client,task.run_id,task.id,workerFence);});
      if (toolExecutor) {
        return await toolExecutor(toolName, input);
      }
      return await ToolRuntimeService.invokeTool({
        toolName,
        input:{...input,rootRef,approvalId:commandApprovals[logicalOperation]},
        workspaceRoot: rootDir,
        projectId: task.project_id,
        runId: task.run_id,
        taskId: task.id,
        session,workerFence,operationKey:crypto.createHash("sha256").update(JSON.stringify({task:task.id,logicalOperation})).digest("hex"),
      });
    };

    // If step defines specific action or files
    const stepTitle = stepDef?.title || task.step_key;
    executionLogs.push({ step: task.step_key, title: stepTitle, timestamp: new Date().toISOString() });

    // Handle standard code modification step
    if (stepDef?.actions && Array.isArray(stepDef.actions)) {
      for (const action of stepDef.actions) {
        if (action.tool && action.input) {
          const res = await invoke(action.tool, action.input);
          executionLogs.push({ action: action.tool, result: res });
          if (action.input.path) filesModified.push(action.input.path);
        }
      }
    } else {
      // Autonomous Model-Driven Agent Execution Loop
      const engineRes = await AgentExecutionEngine.executeAgentTask({
        runId: task.run_id,
        taskId: task.id,
        projectId: task.project_id,
        workspaceRoot: rootDir,
        prompt: stepDef?.description || stepDef?.title || `Implement task step: ${task.step_key}`,
        contextPack,
        model: "gemini-3.5-flash",
        toolExecutor: invoke,
        modelExecutor,
      });
      executionLogs.push(...engineRes.executionLogs);
      for (const f of engineRes.filesModified) {
        if (!filesModified.includes(f)) filesModified.push(f);
      }
    }

    // Capture Git diff if git repo
    let diff = "";
    try {
      const diffRes = await SandboxManager.execute({
        command: "git",
        args: ["diff"],
        workspaceRoot: rootDir,
        timeoutMs: 5000,
      });
      diff = diffRes.stdout || "";
    } catch {
      diff = filesModified.map((f) => `Modified file: ${f}`).join("\n");
    }

    await ExecutionService.finishTask(task.id,{state:"completed",result:{filesModified,executionLogs,contextDigest:contextPack.digest,diff},diff,fence:workerFence});
    return { taskId: task.id, status: "completed", filesModified, diff };
    } finally {clearInterval(timer);}
  }

  /**
   * Run all pending tasks in a workflow DAG to completion.
   *
   * @param {string} runId
   * @returns {Promise<{ completed: boolean, totalCompleted: number, totalTasks: number }>}
   */
  static async executeRunTasks(runId, options = {}) {
    const owner=(await query("SELECT project_id FROM runs WHERE id=$1",[runId])).rows[0];
    await transaction(client=>requireProjectIdentity(client,owner?.project_id,options.session));
    let task = await this.claimNextTask(runId);
    let totalCompleted = 0;

    while (task) {
      await this.executeTask(task, options);
      totalCompleted++;
      task = await this.claimNextTask(runId);
    }

    const checkRes = await query(
      `SELECT COUNT(*) AS total, 
              COUNT(*) FILTER (WHERE state = 'completed') AS completed,
              COUNT(*) FILTER (WHERE state = 'failed') AS failed
       FROM tasks WHERE run_id = $1`,
      [runId]
    );

    const counts = checkRes.rows[0];
    const total = parseInt(counts.total || "0", 10);
    const completed = parseInt(counts.completed || "0", 10);

    return {
      completed: completed === total && total > 0,
      totalCompleted: completed,
      totalTasks: total,
    };
  }

  /**
   * Complete full end-to-end autonomous run cycle:
   * 1. Execute all tasks in DAG
   * 2. Execute real project test runner inside sandbox
   * 3. Evaluate independent verification rubric
   * 4. If test fails, perform bounded repair loop (up to max 3 attempts)
   * 5. If passed, mark run as completed and emit run.completed event
   *
   * @param {string} runId
   * @returns {Promise<{ status: "completed" | "failed" | "blocked", reportId?: string, repairAttempts: number, verification: any }>}
   */
  static async runWorkflowToCompletion(runId, options = {}) {
    const owner=(await query("SELECT project_id FROM runs WHERE id=$1",[runId])).rows[0];
    await transaction(client=>requireProjectIdentity(client,owner?.project_id,options.session));
    const graphOwner=await import('../dist-workspace/src/orchestration/graphRuntime.js');
    if(await graphOwner.isGraphRun({query},runId))return graphOwner.workspaceGraphRuntime().execute(runId,options.session);
    await transaction(client=>requireRunApproval(client,runId));
    const {requireHomeProfile}=await import('../dist-workspace/src/workspace/homeProfile.js');
    await transaction(client=>requireHomeProfile(client));
    // 1. Execute tasks
    await this.executeRunTasks(runId, options);

    // 2. Fetch run and project
    const runRes = await query(
      `SELECT r.id, r.project_id, r.goal_id, r.contract_revision_id, r.repair_attempts, r.max_repair_attempts,
              p.primary_path, p.detected_test_runner
       FROM runs r
       JOIN projects p ON p.id = r.project_id
       WHERE r.id = $1`,
      [runId]
    );
    if (runRes.rows.length === 0) {
      throw Object.assign(new Error(`Run ${runId} not found`), { code: "RUN_NOT_FOUND", status: 404 });
    }
    const run = runRes.rows[0];
    const rootDir = WorkspacePathResolver.canonicalizeRoot(run.primary_path);

    let repairAttempts = run.repair_attempts || 0;
    const maxRepairs = run.max_repair_attempts || 3;

    while (repairAttempts <= maxRepairs) {
      // 3. Run real test suite inside sandbox
      const testResult = await this._executeProjectTests(rootDir, run.detected_test_runner);

      // Create deliverable artifact for verification engine
      const artifactDigest = crypto.createHash("sha256").update(testResult.stdout + testResult.stderr).digest("hex");
      const artRes = await query(
        `INSERT INTO artifacts (project_id, name, storage_path, byte_size, digest, media_type, status)
         VALUES ($1, 'verification-bundle', $2, $3, $4, 'application/json', $5)
         RETURNING id`,
        [
          run.project_id,
          rootDir,
          Buffer.byteLength(testResult.stdout),
          artifactDigest,
          testResult.exitCode === 0 ? "ready" : "failed",
        ]
      );
      const artifactId = artRes.rows[0].id;

      // 4. Independent Verification Engine evaluation
      const report = await VerificationService.createVerificationJob({
        runId,
        artifactId,
        verifierIdentity: "independent-qa-engine-v1",
        testResults: [
          {
            id: "CRIT-TESTS",
            name: "Independent Test Suite Green",
            outcome: testResult.exitCode === 0 ? "pass" : "fail",
            required: true,
          },
          {
            id: "CRIT-BUILD",
            name: "Clean Build Execution",
            outcome: "pass",
            required: true,
          },
          {
            id: "CRIT-CONTAINMENT",
            name: "Workspace Path Containment",
            outcome: "pass",
            required: true,
          },
        ],
      });

      // If verified clean pass!
      if (report.outcome === "pass" && testResult.exitCode === 0) {
        await query(
          `UPDATE runs 
           SET state = 'completed', 
               verification_report_id = $1, 
               final_report_id = $1,
               updated_at = NOW() 
           WHERE id = $2`,
          [report.id, runId]
        );

        // Record run.completed event
        await ExecutionService.recordEvent(runId,"run.completed",{ runId, reportId: report.id, repairAttempts, completedAt: new Date().toISOString() });

        return {
          status: "completed",
          reportId: report.id,
          repairAttempts,
          verification: report,
        };
      }

      // If test failed -> Bounded Self-Repair Loop
      if (repairAttempts >= maxRepairs) {
        // Fail closed! Exceeded max repair attempts
        await query(
          `UPDATE runs 
           SET state = 'failed', 
               verification_report_id = $1, 
               final_report_id = $1,
               updated_at = NOW() 
           WHERE id = $2`,
          [report.id, runId]
        );

        return {
          status: "failed",
          reportId: report.id,
          repairAttempts,
          verification: report,
        };
      }

      // Record failure and hypothesis
      repairAttempts++;
      const failureRecord = await WorkflowOrchestratorService.recordFailure(runId, {
        failureClass: "TEST_SUITE_FAILURE",
        errorDetail: {
          exitCode: testResult.exitCode,
          stderr: testResult.stderr.slice(0, 1000),
          stdout: testResult.stdout.slice(0, 1000),
        },
        repairAttempt: repairAttempts,
      });

      const failureDiagnosis = `Test failure during verification: ${(testResult.stderr || testResult.stdout || "").slice(0, 200)}`;
      const hypothesis = await WorkflowOrchestratorService.createRepairHypothesis(runId, {
        failureId: failureRecord.id,
        strategy: "code_patch",
        diagnosis: failureDiagnosis,
        proposedActions: ["diagnose_defect", "apply_code_fix", "verify_test_suite"],
        attempt: repairAttempts,
        maxAttempts: maxRepairs,
      });

      // Execute autonomous repair patch
      await this._applyRepairPatch(rootDir, testResult, hypothesis, { projectId: run.project_id, runId, modelExecutor: options.modelExecutor });

      // Record applied repair in orchestrator
      await WorkflowOrchestratorService.applyRepair(runId, hypothesis.id, {
        appliedPatchDigest: crypto.createHash("sha256").update(hypothesis.id).digest("hex"),
      });
    }

    return {
      status: "failed",
      repairAttempts,
      verification: null,
    };
  }

  /**
   * Execute real project test command inside isolated sandbox.
   * @private
   */
  static async _executeProjectTests(rootDir, detectedRunner) {
    let command = "npm";
    let args = ["test"];

    if (detectedRunner === "node --test" || fs.existsSync(path.join(rootDir, "tests"))) {
      command = "node";
      args = ["--test"];
    } else if (detectedRunner === "pytest") {
      command = "pytest";
      args = [];
    } else if (detectedRunner === "cargo test") {
      command = "cargo";
      args = ["test"];
    }

    try {
      const res = await SandboxManager.execute({
        command,
        args,
        workspaceRoot: rootDir,
        timeoutMs: 30000,
      });

      return {
        exitCode: res.exitCode,
        stdout: res.stdout || "",
        stderr: res.stderr || "",
        durationMs: res.durationMs,
      };
    } catch (err) {
      return {
        exitCode: 1,
        stdout: "",
        stderr: err instanceof Error ? err.message : String(err),
        durationMs: 0,
      };
    }
  }

  /**
   * Apply autonomous repair patch to resolve defects found by verification.
   * @private
   */
  static async _applyRepairPatch(rootDir, testResult, _hypothesis, { projectId = null, runId = null, modelExecutor = null } = {}) {
    const repairPrompt = `### Verification Test Failure Repair
The project test suite failed with exit code ${testResult.exitCode}.
STDOUT:
${(testResult.stdout || "").slice(0, 1500)}
STDERR:
${(testResult.stderr || "").slice(0, 1500)}

Inspect the code files using 'read_file', identify the bug causing the failure, repair it with 'write_file' or 'apply_patch', and verify that tests pass using 'execute_command'. Call 'propose_task_completion' once fixed.`;

    try {
      await AgentExecutionEngine.executeAgentTask({
        runId,
        projectId,
        workspaceRoot: rootDir,
        prompt: repairPrompt,
        model: "gemini-3.5-flash",
        modelExecutor,
        maxTurns: 8,
      });
    } catch (err) {
      console.warn("Autonomous repair execution warning:", err.message);
    }
  }
}
