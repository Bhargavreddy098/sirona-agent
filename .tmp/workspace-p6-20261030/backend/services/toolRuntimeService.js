import fs from "fs";
import path from "path";
import crypto from "crypto";
import { query, transaction } from "../config/db.js";
import { ensureEffect, dispatchEffect, settleEffect } from "../dist-workspace/src/execution/effectJournal.js";
import { requireProjectIdentity, requireFence, requireRunApproval, requireToolGrants, validate, toolRequestSchema } from "../dist-workspace/src/security/executionPolicy.js";
import { IsolationBrokerService } from "./isolationBrokerService.js";
import { SandboxManager } from "./sandboxManager.js";
import { GovernanceService } from "./governanceService.js";

/**
 * Custom error class for Tool Runtime domain errors.
 */
export class ToolRuntimeError extends Error {
  /**
   * @param {string} code
   * @param {number} status
   * @param {string} message
   */
  constructor(code, status, message) {
    super(message);
    this.name = "ToolRuntimeError";
    this.code = code;
    this.status = status;
  }
}

/**
 * Deterministic canonical JSON serialization.
 * Sorts object keys recursively.
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

/**
 * Supported developer adapter kinds.
 */
export const SUPPORTED_ADAPTER_KINDS = Object.freeze([
  "local_process",
  "windows_sandbox",
  "custom_agent",
]);

/**
 * ToolRuntimeService
 * Manages tool catalog, developer connections, sandboxed execution,
 * pre-flight capability checks, and immutable receipts.
 */
export class ToolRuntimeService {
  // ==========================================
  // 1. Tool Catalog
  // ==========================================

  /**
   * List tools with their active revisions.
   * @param {{ capability?: string, availability?: string, limit?: number, offset?: number }} [params]
   */
  static async getToolCatalog({
    capability,
    availability = "available",
    limit = 50,
    offset = 0,
  } = {}) {
    const conditions = ["r.availability = $1"];
    const values = [availability];
    let idx = 2;

    if (capability) {
      conditions.push(`$${idx} = ANY(r.capabilities)`);
      values.push(capability);
      idx++;
    }

    const whereClause = conditions.join(" AND ");

    const countSql = `
      SELECT COUNT(*) AS total
      FROM tools t
      JOIN tool_revisions r ON r.tool_id = t.id
      WHERE ${whereClause}
    `;
    const countRes = await query(countSql, values);
    const total = parseInt(countRes.rows[0]?.total || "0", 10);

    const listSql = `
      SELECT 
        t.id, t.name, t.description,
        r.id AS revision_id, r.revision, r.input_schema, r.output_schema,
        r.capabilities, r.risk_class, r.timeout_ms, r.max_output_bytes,
        r.idempotency, r.cancellation, r.sandbox_profile, r.availability
      FROM tools t
      JOIN tool_revisions r ON r.tool_id = t.id
      WHERE ${whereClause}
      ORDER BY t.name ASC, r.revision DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `;
    const listRes = await query(listSql, [...values, limit, offset]);

    const items = listRes.rows.map(this._formatToolDefinition);
    return { items, total };
  }

  /**
   * Get single tool definition by ID or Name.
   * @param {string} toolIdOrName
   */
  static async getTool(toolIdOrName) {
    const isUuid = /^[0-9a-f-]{36}$/i.test(toolIdOrName);
    const sql = `
      SELECT 
        t.id, t.name, t.description,
        r.id AS revision_id, r.revision, r.input_schema, r.output_schema,
        r.capabilities, r.risk_class, r.timeout_ms, r.max_output_bytes,
        r.idempotency, r.cancellation, r.sandbox_profile, r.availability
      FROM tools t
      JOIN tool_revisions r ON r.tool_id = t.id
      WHERE ${isUuid ? "t.id = $1" : "t.name = $1"}
      ORDER BY r.revision DESC
      LIMIT 1
    `;
    const res = await query(sql, [toolIdOrName]);
    if (res.rows.length === 0) {
      throw new ToolRuntimeError("TOOL_NOT_FOUND", 404, `Tool '${toolIdOrName}' not found`);
    }
    return this._formatToolDefinition(res.rows[0]);
  }

  // ==========================================
  // 2. Developer Connections Lifecycle
  // ==========================================

  /**
   * Create a new developer connection.
   * @param {{ workspaceId?: string | null, adapterKind: string, installRef?: string | null, authMethod?: string, requestedCapabilities?: string[], testProfile?: string, metadata?: Record<string, unknown> }} params
   */
  static async createDeveloperConnection({
    workspaceId = null,
    adapterKind,
    installRef = null,
    authMethod = "local_token",
    requestedCapabilities = [],
    testProfile = "hardened_local_boundary",
    metadata = {},
  }) {
    if (!adapterKind || !SUPPORTED_ADAPTER_KINDS.includes(adapterKind)) {
      throw new ToolRuntimeError(
        "ADAPTER_UNSUPPORTED",
        400,
        `Adapter '${adapterKind}' is unsupported. Supported adapters: ${SUPPORTED_ADAPTER_KINDS.join(", ")}`
      );
    }

    if (workspaceId) {
      const wsCheck = await query("SELECT id FROM workspaces WHERE id = $1", [workspaceId]);
      if (wsCheck.rows.length === 0) {
        throw new ToolRuntimeError("WORKSPACE_NOT_FOUND", 404, "Specified workspace was not found");
      }
    }

    const insertSql = `
      INSERT INTO developer_connections (
        workspace_id, adapter_kind, install_ref, auth_method,
        requested_capabilities, status, test_profile, metadata,
        last_heartbeat, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, 'connected', $6, $7, NOW(), NOW(), NOW())
      RETURNING *
    `;
    const res = await query(insertSql, [
      workspaceId,
      adapterKind,
      installRef,
      authMethod,
      JSON.stringify(requestedCapabilities),
      testProfile,
      JSON.stringify(metadata),
    ]);

    return this._formatDeveloperConnection(res.rows[0]);
  }

  /**
   * List developer connections.
   * @param {{ workspaceId?: string | null, status?: string | null, limit?: number, offset?: number }} [params]
   */
  static async listDeveloperConnections({
    workspaceId = null,
    status = null,
    limit = 50,
    offset = 0,
  } = {}) {
    const conditions = [];
    const values = [];
    let idx = 1;

    if (workspaceId) {
      conditions.push(`workspace_id = $${idx}`);
      values.push(workspaceId);
      idx++;
    }

    if (status) {
      conditions.push(`status = $${idx}`);
      values.push(status);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countRes = await query(`SELECT COUNT(*) AS total FROM developer_connections ${whereClause}`, values);
    const total = parseInt(countRes.rows[0]?.total || "0", 10);

    const listSql = `
      SELECT * FROM developer_connections
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `;
    const res = await query(listSql, [...values, limit, offset]);

    return {
      items: res.rows.map(this._formatDeveloperConnection),
      total,
    };
  }

  /**
   * Get single developer connection by ID.
   * @param {string} connectionId
   */
  static async getDeveloperConnection(connectionId) {
    const res = await query("SELECT * FROM developer_connections WHERE id = $1", [connectionId]);
    if (res.rows.length === 0) {
      throw new ToolRuntimeError("CONNECTION_NOT_FOUND", 404, "Developer connection not found");
    }
    return this._formatDeveloperConnection(res.rows[0]);
  }

  /**
   * Qualify a developer connection against the Stage 10 isolation boundary.
   * @param {string} connectionId
   * @param {{ testProfile?: string, budgetCeilingMicroUsd?: number }} [payload]
   */
  static async qualifyDeveloperConnection(connectionId, {
    testProfile = "hardened_local_boundary",
    budgetCeilingMicroUsd: _budgetCeilingMicroUsd = 0,
  } = {}) {
    const connection = await this.getDeveloperConnection(connectionId);
    if (connection.status === "disconnected") {
      throw new ToolRuntimeError("CONNECTION_DISCONNECTED", 400, "Cannot qualify a disconnected developer connection");
    }

    const {requireHomeProfile,HOME_PROFILE}=await import('../dist-workspace/src/workspace/homeProfile.js');
    if(testProfile!==HOME_PROFILE)throw new ToolRuntimeError('GUEST_NOT_QUALIFIED',503,'Select the explicitly approved trusted-local Docker profile');
    await transaction(client=>requireHomeProfile(client));
    const {DockerRuntime}=await import('../dist-workspace/src/windows/dockerRuntime.js');
    if(!(await DockerRuntime.checkHealth()).available)throw new ToolRuntimeError('GUEST_NOT_QUALIFIED',503,'Qualified local Docker engine is unavailable');
    const row=(await query("UPDATE developer_connections SET status='qualified',test_profile=$2,metadata=metadata||$3::jsonb,last_heartbeat=NOW(),updated_at=NOW() WHERE id=$1 RETURNING *",[connectionId,HOME_PROFILE,JSON.stringify({profile:HOME_PROFILE,imageId:DockerRuntime.DEFAULT_IMAGE,threatModel:'trusted_local_projects_only'})])).rows[0];
    return{connection:this._formatDeveloperConnection(row),qualification:{status:'passed',profile:HOME_PROFILE,verifiedAt:new Date().toISOString(),threatModel:'trusted_local_projects_only'}};
  }

  /**
   * Disconnect a developer connection, revoking future dispatches.
   * @param {string} connectionId
   * @param {{ reason?: string }} [payload]
   */
  static async disconnectDeveloperConnection(connectionId, { reason = "Disconnected by operator" } = {}) {
    await this.getDeveloperConnection(connectionId); // Ensure exists

    const res = await query(
      `UPDATE developer_connections 
       SET status = 'disconnected', 
           metadata = metadata || $1, 
           updated_at = NOW() 
       WHERE id = $2 RETURNING *`,
      [JSON.stringify({ disconnectReason: reason, disconnectedAt: new Date().toISOString() }), connectionId]
    );

    return this._formatDeveloperConnection(res.rows[0]);
  }

  // ==========================================
  // 3. Tool Invocation & Bounded Execution
  // ==========================================

  /**
   * Centralized authorization for tool invocations.
   * Enforces project-binding, cross-workspace isolation, capability grants, and governance policies.
   */
  static async authorizeToolInvocation({
    session = null,
    tool,
    projectId = null,
    workspaceRoot = null,
    input = {},
  }) {
    if (!session) throw new ToolRuntimeError("WORKER_IDENTITY_REQUIRED",401,"Authenticated execution identity required");
    const isSensitive = tool.risk_class !== "read";
    if (projectId) await transaction(client=>requireProjectIdentity(client,projectId,session));

    // For sensitive tools (write, execute, deploy), projectId is strictly required
    if ((isSensitive || ["read_file","list_directory"].includes(tool.name)) && !projectId) {
      throw new ToolRuntimeError("PROJECT_REQUIRED", 400, `projectId is required to invoke sensitive tool '${tool.name}'`);
    }

    // If workspaceRoot is required for filesystem tools
    if (["read_file", "write_file", "list_directory", "apply_patch"].includes(tool.name)) {
      if (!workspaceRoot) {
        throw new ToolRuntimeError("WORKSPACE_ROOT_REQUIRED", 400, `workspaceRoot is required to invoke project-bound tool '${tool.name}'`);
      }
    }

    // If projectId is provided, validate existence, workspace containment, and capabilities
    if (projectId) {
      const projRes = await query(
        `SELECT p.id, p.workspace_id, p.primary_path, w.owner_principal_id 
         FROM projects p
         LEFT JOIN workspaces w ON w.id = p.workspace_id
         WHERE p.id = $1 AND p.archived = 0`,
        [projectId]
      );
      if (projRes.rows.length === 0) {
        throw new ToolRuntimeError("PROJECT_NOT_FOUND", 404, `Project '${projectId}' was not found`);
      }
      const project = projRes.rows[0];
      if (workspaceRoot && path.resolve(workspaceRoot).toLowerCase() !== path.resolve(project.primary_path).toLowerCase()) throw new ToolRuntimeError("WORKSPACE_ROOT_MISMATCH",403,"Workspace root does not match project authority");

      // Cross-workspace tenant isolation:
      // Allowed if project belongs to active session workspace OR workspace is owned by the session principal
      const isSameWorkspace = session?.workspaceId && project.workspace_id === session.workspaceId;
      const isOwner = session?.principalId && project.owner_principal_id === session.principalId;
      if (session && !isSameWorkspace && !isOwner) {
        throw new ToolRuntimeError("CROSS_WORKSPACE_FORBIDDEN", 403, "Project does not belong to the active session workspace");
      }

      // Capability grants check for sensitive tools
      const requiredCaps = /** @type {string[]} */ (tool.capabilities || []);
      if (tool.risk_class !== "read" && requiredCaps.length > 0) {
        const grantRes = await query(
          `SELECT capability FROM capability_grants 
           WHERE project_id = $1 AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > NOW())`,
          [projectId]
        );
        const grantedCaps = new Set(grantRes.rows.map((r) => r.capability));
        const revokedRes = await query(
          `SELECT capability FROM capability_grants 
           WHERE project_id = $1 AND revoked_at IS NOT NULL`,
          [projectId]
        );
        const revokedCaps = new Set(revokedRes.rows.map((r) => r.capability));

        const hasRevoked = requiredCaps.some((c) => revokedCaps.has(c));
        const hasAllRequired = requiredCaps.every((c) => grantedCaps.has(c) || grantedCaps.has("*"));

        if (hasRevoked || !hasAllRequired) {
          throw new ToolRuntimeError(
            "REVOKED_GRANT",
            403,
            `Required capability grant for tool '${tool.name}' is missing or revoked`
          );
        }
      }
    }

    // Governance policy evaluation
    const policy = await GovernanceService.getCurrentPolicy();
    const evalRes = GovernanceService.evaluatePolicy(policy, {
      action: tool.risk_class === "read" ? "fs_read" : `tool:${tool.name}`,
      highImpact: tool.risk_class !== "read",
    });
    const exactCommandApprovalPending=tool.name==='execute_command'&&typeof input?.approvalId==='string'&&policy.rules?.autonomyMode!=='readonly'&&evalRes.requiresApproval&&evalRes.reason==="Action 'tool:execute_command' is classified as high-impact and requires human approval";
    if (!evalRes.allowed&&!exactCommandApprovalPending) {
      throw new ToolRuntimeError("POLICY_DENIED", 403, evalRes.reason || "Governance policy denied tool invocation");
    }
  }

  /**
   * Execute an approved bounded task through an interchangeable worker.
   * Enforces input schema validation, path containment, capability grants,
   * bounded timeouts, and produces immutable receipts.
   *
   * @param {{
   *   toolName: string,
   *   input: Record<string, unknown>,
   *   workspaceRoot: string,
   *   projectId?: string | null,
   *   connectionId?: string | null,
   *   runId?: string | null,
   *   taskId?: string | null,
   *   timeoutMs?: number | null,
   *   session?: { workspaceId?: string, principalId?: string, sessionId?: string, rawSessionToken?: string } | null,
   *   operationKey?: string | null,
   *   workerFence?: any,
   * }} options
   */
  static async invokeTool({
    toolName,
    input,
    workspaceRoot,
    projectId = null,
    connectionId = null,
    runId = null,
    taskId = null,
    timeoutMs = null,
    session = null,
    operationKey = null,
    workerFence = null,
  }) {
    if (!toolName || typeof toolName !== "string") {
      throw new ToolRuntimeError("INVALID_TOOL_INPUT", 400, "toolName is required");
    }
    if (!input || typeof input !== "object") {
      throw new ToolRuntimeError("INVALID_TOOL_INPUT", 400, "input object is required");
    }

    validate(toolRequestSchema,Object.fromEntries(Object.entries({toolName,input,workspaceRoot,projectId,connectionId,runId,taskId,timeoutMs}).filter(([,value])=>value!==null && value!==undefined)));

    // 1. Resolve Tool & Active Revision
    const toolSql = `
      SELECT 
        t.id AS tool_id, t.name,
        r.id AS revision_id, r.revision, r.capabilities, r.risk_class,
        r.timeout_ms, r.max_output_bytes, r.availability, r.sandbox_profile
      FROM tools t
      JOIN tool_revisions r ON r.tool_id = t.id
      WHERE t.name = $1 AND r.availability = 'available'
      ORDER BY r.revision DESC
      LIMIT 1
    `;
    const toolRes = await query(toolSql, [toolName]);
    if (toolRes.rows.length === 0) {
      throw new ToolRuntimeError("TOOL_NOT_FOUND", 404, `Tool '${toolName}' is not available or registered`);
    }
    const tool = toolRes.rows[0];

    // 2. Validate Developer Connection if specified
    if (connectionId) {
      const conn = await this.getDeveloperConnection(connectionId);
      if (session && conn.workspaceId !== session.workspaceId) throw new ToolRuntimeError("RESOURCE_FORBIDDEN",403,"Connection belongs to another workspace");
      if (conn.status !== "qualified" && tool.risk_class !== "read") throw new ToolRuntimeError("CONNECTION_UNQUALIFIED",403,"A qualified connection is required");
      if (conn.status === "disconnected") {
        throw new ToolRuntimeError("CONNECTION_DISCONNECTED", 400, "Developer connection is disconnected");
      }
    }

    // 3. Compute Canonical SHA-256 Input Digest
    const inputDigest = crypto
      .createHash("sha256")
      .update(canonicalJsonStringify(input))
      .digest("hex");

    // 5. Pre-flight Capability Grant & Authorization Verification
    await this.authorizeToolInvocation({ session, tool, projectId, workspaceRoot, input });

    // 4. Pre-flight Input & Workspace Containment Validation
    if (["read_file", "write_file", "list_directory", "apply_patch"].includes(toolName)) {
      if (!workspaceRoot || typeof workspaceRoot !== "string") {
        throw new ToolRuntimeError("WORKSPACE_ROOT_REQUIRED", 400, "workspaceRoot is required for filesystem tools");
      }
    }

    let targetPath = "";
    if (toolName === "read_file" || toolName === "write_file") {
      if (!input.path || typeof input.path !== "string") {
        throw new ToolRuntimeError("INVALID_TOOL_INPUT", 400, "Path string is required in input");
      }
      targetPath = input.path;
      // Validates containment; throws 400 on traversal, junctions, device paths, UNC paths
      IsolationBrokerService.validateWorkspacePath(workspaceRoot, targetPath);
    } else if (toolName === "list_directory") {
      targetPath = typeof input.path === "string" ? input.path : ".";
      IsolationBrokerService.validateWorkspacePath(workspaceRoot, targetPath);
    } else if (toolName === "execute_command") {
      if (!input.command || typeof input.command !== "string") {
        throw new ToolRuntimeError("INVALID_TOOL_INPUT", 400, "command string is required in input");
      }
      if (workspaceRoot) {
        IsolationBrokerService.validateWorkspacePath(workspaceRoot, ".");
      }
    } else if (toolName === "apply_patch") {
      if (!input.patch || typeof input.patch !== "string") {
        throw new ToolRuntimeError("INVALID_TOOL_INPUT", 400, "patch string is required in input");
      }
      // Check base snapshot if provided
      if (input.baseSnapshotId) {
        const snap = await query("SELECT id FROM repository_snapshots WHERE id = $1", [input.baseSnapshotId]);
        if (snap.rows.length === 0) {
          throw new ToolRuntimeError("BASE_SNAPSHOT_MISMATCH", 409, "Declared base repository snapshot was not found");
        }
      }
      // Determine target file
      targetPath = this._extractPatchTargetPath(input.patch, typeof input.targetPath === "string" ? input.targetPath : undefined);
      try {
        IsolationBrokerService.validateWorkspacePath(workspaceRoot, targetPath);
      } catch (err) {
        throw new ToolRuntimeError("OUT_OF_SCOPE_PATCH", 400, `Patch targets out-of-scope path: ${err instanceof Error ? err.message : String(err)}`);
      }
    }


    if(toolName==='execute_command'){
      if(input.allowHostExecution===true||input.allowNetwork===true)throw new ToolRuntimeError('POLICY_DENIED',403,'Host execution and unrestricted network are denied');
      const {DockerWorkerAdapter}=await import('../dist-workspace/src/windows/dockerWorkerAdapter.js');
      const result=await DockerWorkerAdapter.executeTask({projectId,runId,taskId,workspaceRoot,rootRef:typeof input.rootRef==='string'?input.rootRef:undefined,command:[String(input.command),...(Array.isArray(input.args)?input.args.map(String):[])],identity:session,fence:workerFence,capabilities:[],operationKey:operationKey||undefined,approvalId:typeof input.approvalId==='string'?input.approvalId:undefined,timeoutMs:typeof timeoutMs==='number'?timeoutMs:tool.timeout_ms});
      return{receipt:await this.getToolReceipt(result.receiptId,session),output:{...result.execResult,patchPreviewId:result.patchPreviewId,hasModifications:result.hasModifications,hostFilesChanged:false}};
    }

    const strict = process.env.SIRONA_EXECUTION_RELIABILITY === "true";
    if (tool.risk_class !== "read") {
      if(!strict)throw new ToolRuntimeError("GUEST_NOT_QUALIFIED",503,"Project mutation requires the qualified P3 guest broker");
      if (!runId || !taskId || !operationKey) throw new ToolRuntimeError("EXECUTION_SCOPE_REQUIRED",400,"Mutating tools require a keyed run/task dispatch");
      await transaction(async client=>{await requireFence(client,runId,taskId,workerFence);await requireRunApproval(client,runId);});
      throw new ToolRuntimeError("GUEST_NOT_QUALIFIED",503,"Mutating project tools remain unavailable until the approved guest broker is qualified");
    }
    const admission = await transaction(async client=>{
      if(strict){
        await requireProjectIdentity(client,projectId,session);
        await requireToolGrants(client,projectId,tool.capabilities,workspaceRoot);
        const policy=(await client.query("SELECT * FROM policy_revisions WHERE active=true ORDER BY revision DESC LIMIT 1 FOR SHARE")).rows[0];
        const decision=GovernanceService.evaluatePolicy(policy||{},{action:tool.risk_class==="read"?"fs_read":"tool:"+tool.name,highImpact:tool.risk_class!=="read"});
        if(!decision.allowed)throw new ToolRuntimeError("POLICY_DENIED",403,"Dispatch denied by current policy");
      }
      let effectId=null;
      if (operationKey !== null) {
        if (!strict || !runId || !taskId) throw new ToolRuntimeError("EXECUTION_SCOPE_REQUIRED",400,"Keyed operations require qualified run/task reliability");
        const scope=await client.query("SELECT r.project_id FROM runs r JOIN tasks t ON t.run_id=r.id WHERE r.id=$1 AND t.id=$2 FOR UPDATE OF r",[runId,taskId]);
        if (!scope.rows.length || scope.rows[0].project_id!==projectId) throw new ToolRuntimeError("RESOURCE_FORBIDDEN",403,"Run/task does not belong to project");
        await requireProjectIdentity(client,projectId,session);
        const effectDigest=crypto.createHash("sha256").update(canonicalJsonStringify({inputDigest,revision:tool.revision_id,projectId,workspaceRoot})).digest("hex");
        const ensured=await ensureEffect(client,{runId,taskId,toolId:tool.tool_id,inputDigest:effectDigest,targetSummary:toolName,risk:"low",operationKey});
        effectId=ensured.effect.id;
        if (ensured.effect.state!=="pending") {
          const receipt=await client.query("SELECT * FROM tool_receipts WHERE invocation_id=$1 ORDER BY created_at LIMIT 1",[ensured.effect.externalOperationId]);
          if (receipt.rows.length) {await settleEffect(client,effectId,receipt.rows[0].status==="success"?"completed":"failed");return {replay:{receipt:this._formatToolReceipt(receipt.rows[0]),output:receipt.rows[0].output}};}
          throw new ToolRuntimeError("EFFECT_OUTCOME_UNKNOWN",409,"Operation already dispatched; reconcile outcome before retry");
        }
        await requireFence(client,runId,taskId,workerFence);
      }
      const result=await client.query(
        "INSERT INTO tool_invocations(connection_id,tool_id,tool_revision_id,project_id,run_id,task_id,status,input,input_digest,started_at)VALUES($1,$2,$3,$4,$5,$6,'running',$7,$8,NOW())RETURNING id",
        [connectionId,tool.tool_id,tool.revision_id,projectId,runId,taskId,JSON.stringify(input),inputDigest]);
      if (effectId) await dispatchEffect(client,effectId,result.rows[0].id);
      return {invocationId:result.rows[0].id,effectId};
    });
    if (admission.replay) return admission.replay;
    const {invocationId,effectId}=admission;

    // 7. Bounded Tool Execution
    const startTime = Date.now();
    let output = {};
    let status = "success";
    let exitCode = 0;
    let errorMessage = null;

    try {
      if (toolName === "read_file") {
        const pathStr = String(input.path);
        const { canonicalPath } = IsolationBrokerService.validateWorkspacePath(workspaceRoot, pathStr);
        const buf = await fs.promises.readFile(canonicalPath);
        const encoding = /** @type {BufferEncoding} */ (typeof input.encoding === "string" ? input.encoding : "utf8");
        const digest = crypto.createHash("sha256").update(buf).digest("hex");
        output = {
          content: buf.toString(encoding),
          bytes: buf.length,
          digest,
        };
      } else if (toolName === "write_file") {
        if (typeof input.content !== "string") {
          throw new ToolRuntimeError("INVALID_TOOL_INPUT", 400, "content string is required for write_file");
        }
        const pathStr = String(input.path);
        const contentStr = String(input.content);
        const { canonicalPath } = IsolationBrokerService.validateWorkspacePath(workspaceRoot, pathStr);
        // Ensure parent directory exists
        await fs.promises.mkdir(path.dirname(canonicalPath), { recursive: true });
        // Quarantine check for private keys / forbidden executable headers
        IsolationBrokerService.quarantineImport(workspaceRoot, pathStr, contentStr);
        await fs.promises.writeFile(canonicalPath, contentStr, "utf8");
        const digest = crypto.createHash("sha256").update(contentStr).digest("hex");
        output = {
          path: pathStr,
          bytesWritten: Buffer.byteLength(contentStr, "utf8"),
          digest,
        };
      } else if (toolName === "list_directory") {
        const pathStr = typeof input.path === "string" ? input.path : ".";
        const { canonicalPath } = IsolationBrokerService.validateWorkspacePath(workspaceRoot, pathStr);
        const dirents = await fs.promises.readdir(canonicalPath, { withFileTypes: true });
        /** @type {Array<{ name: string, isDirectory: boolean }>} */
        const entries = dirents.map((d) => ({
          name: d.name,
          isDirectory: d.isDirectory(),
        }));
        output = { entries };
      } else if (toolName === "execute_command") {
        const cwd = workspaceRoot || process.cwd();
        const effectiveTimeout = typeof timeoutMs === "number" ? timeoutMs : tool.timeout_ms;
        if (input.allowHostExecution === true || input.allowNetwork === true) throw new ToolRuntimeError("POLICY_DENIED",403,"Host execution and unrestricted network are not authorized");
        try {
          const execRes = await SandboxManager.execute({
            command: String(input.command),
            args: Array.isArray(input.args) ? input.args.map(String) : [],
            workspaceRoot: cwd,
            timeoutMs: effectiveTimeout,
            maxOutputBytes: tool.max_output_bytes,
            allowHostExecution: false,
          });

          output = {
            exitCode: execRes.exitCode,
            stdout: execRes.stdout,
            stderr: execRes.stderr,
            durationMs: execRes.durationMs,
            timedOut: false,
            outputCapped: false,
          };
          exitCode = execRes.exitCode;
          if (execRes.exitCode !== 0) {
            status = "failure";
            errorMessage = `Command exited with code ${execRes.exitCode}`;
          }
        } catch (execErr) {
          if (/** @type {any} */ (execErr).code === "SANDBOX_UNAVAILABLE") {
            throw new ToolRuntimeError("SANDBOX_UNAVAILABLE", 503, execErr.message);
          } else if (/** @type {any} */ (execErr).code === "EXECUTION_TIMEOUT") {
            status = "timeout";
            errorMessage = "Execution timed out";
            output = { exitCode: -1, stdout: "", stderr: "Execution timed out", durationMs: effectiveTimeout, timedOut: true, outputCapped: false };
          } else if (/** @type {any} */ (execErr).code === "OUTPUT_LIMIT_EXCEEDED") {
            status = "failure";
            errorMessage = "Output limit exceeded";
            output = { exitCode: -1, stdout: "", stderr: "Output limit exceeded", durationMs: 0, timedOut: false, outputCapped: true };
          } else {
            throw execErr;
          }
        }
      } else if (toolName === "apply_patch") {
        const patchStr = String(input.patch);
        const { canonicalPath } = IsolationBrokerService.validateWorkspacePath(workspaceRoot, targetPath);
        const patchResult = await this._applyPatchToFile(canonicalPath, patchStr);
        const patchDigest = crypto.createHash("sha256").update(patchStr).digest("hex");
        output = {
          applied: patchResult.applied,
          filesChanged: [targetPath],
          patchDigest,
        };
      }
    } catch (err) {
      status = "error";
      errorMessage = err instanceof Error ? err.message : String(err);
      output = { error: errorMessage };
      if (err instanceof ToolRuntimeError) {
        // Update invocation to failed before rethrowing
        await query(
          "UPDATE tool_invocations SET status = 'failed', completed_at = NOW() WHERE id = $1",
          [invocationId]
        );
        throw err;
      }
    }

    const durationMs = Date.now() - startTime;
    const outputDigest = crypto
      .createHash("sha256")
      .update(canonicalJsonStringify(output))
      .digest("hex");

    // 8. Persist Receipt and Update Invocation Status
    const invocationFinalStatus = status === "success" ? "completed" : "failed";
    const receiptRes=await transaction(async client=>{
    await client.query(
      "UPDATE tool_invocations SET status = $1, completed_at = NOW() WHERE id = $2",
      [invocationFinalStatus, invocationId]
    );

    const saved = await client.query(
      `INSERT INTO tool_receipts (
        invocation_id, tool_revision_id, status, exit_code,
        input_digest, output_digest, output, duration_ms,
        artifact_ids, error_message, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, '[]', $9, NOW())
      RETURNING *`,
      [
        invocationId,
        tool.revision_id,
        status,
        exitCode,
        inputDigest,
        outputDigest,
        JSON.stringify(output),
        durationMs,
        errorMessage,
      ]
    );

    if (effectId) await settleEffect(client,effectId,status === "success" ? "completed" : "failed");
    return saved;
    });

    return {
      receipt: this._formatToolReceipt(receiptRes.rows[0]),
      output,
    };
  }

  /**
   * Get an immutable tool execution receipt by ID.
   * @param {string} receiptId
   */
  static async getToolReceipt(receiptId, session = null) {
    const owner=await query("SELECT i.project_id FROM tool_receipts r JOIN tool_invocations i ON i.id=r.invocation_id WHERE r.id=$1",[receiptId]);
    if (!owner.rows.length) throw new ToolRuntimeError("RECEIPT_NOT_FOUND",404,"Tool receipt not found");
    if (!owner.rows[0].project_id) throw new ToolRuntimeError("RESOURCE_FORBIDDEN",403,"Receipt has no project authority");
    await transaction(client=>requireProjectIdentity(client,owner.rows[0].project_id,session));
    const res = await query("SELECT * FROM tool_receipts WHERE id = $1", [receiptId]);
    if (res.rows.length === 0) {
      throw new ToolRuntimeError("RECEIPT_NOT_FOUND", 404, "Tool receipt not found");
    }
    return this._formatToolReceipt(res.rows[0]);
  }

  // ==========================================
  // Helper Methods
  // ==========================================

  /**
   * Extracts target relative path from unified diff or fallback property.
   * @private
   * @param {string} patch
   * @param {string} [fallbackTargetPath]
   */
  static _extractPatchTargetPath(patch, fallbackTargetPath) {
    if (fallbackTargetPath && typeof fallbackTargetPath === "string") {
      return fallbackTargetPath;
    }
    const lines = patch.split(/\r?\n/);
    for (const line of lines) {
      if (line.startsWith("+++ b/")) {
        return line.slice(6).trim();
      }
      if (line.startsWith("+++ ") && !line.startsWith("+++ /dev/null")) {
        return line.slice(4).trim();
      }
    }
    throw new ToolRuntimeError(
      "INVALID_TOOL_INPUT",
      400,
      "Cannot determine target path from patch. Provide targetPath in input or a valid +++ header."
    );
  }

  /**
   * Applies unified patch or full replacement to target file.
   * @private
   * @param {string} canonicalPath
   * @param {string} patchText
   */
  static async _applyPatchToFile(canonicalPath, patchText) {
    let original = "";
    try {
      original = await fs.promises.readFile(canonicalPath, "utf8");
    } catch (err) {
      if (/** @type {NodeJS.ErrnoException} */ (err).code !== "ENOENT") throw err;
      original = "";
    }

    const lines = patchText.split(/\r?\n/);
    const isUnifiedDiff = lines.some((l) => l.startsWith("@@"));

    if (!isUnifiedDiff) {
      // Direct replacement
      await fs.promises.mkdir(path.dirname(canonicalPath), { recursive: true });
      await fs.promises.writeFile(canonicalPath, patchText, "utf8");
      return { applied: true };
    }

    // Apply unified diff hunks
    const origLines = original.split(/\r?\n/);
    const newLines = [];
    let hunkStarted = false;

    for (const line of lines) {
      if (line.startsWith("@@")) {
        hunkStarted = true;
        continue;
      }
      if (!hunkStarted) continue;

      if (line.startsWith("+")) {
        newLines.push(line.slice(1));
      } else if (line.startsWith(" ")) {
        newLines.push(line.slice(1));
      } else if (line.startsWith("-")) {
        // Excluded
      }
    }

    if (newLines.length === 0 && origLines.length > 0) {
      // If no valid lines parsed, fallback to patchText
      newLines.push(patchText);
    }

    await fs.promises.mkdir(path.dirname(canonicalPath), { recursive: true });
    await fs.promises.writeFile(canonicalPath, newLines.join("\n"), "utf8");
    return { applied: true };
  }

  // ==========================================
  // Formatters
  // ==========================================

  static _formatToolDefinition(row) {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      revision: row.revision,
      inputSchema: row.input_schema,
      outputSchema: row.output_schema,
      capabilities: row.capabilities || [],
      risk: row.risk_class,
      timeoutMs: row.timeout_ms,
      maxOutputBytes: row.max_output_bytes,
      idempotency: row.idempotency,
      cancellation: row.cancellation,
      sandboxProfile: row.sandbox_profile,
      availability: row.availability,
    };
  }

  static _formatDeveloperConnection(row) {
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      adapterKind: row.adapter_kind,
      installRef: row.install_ref,
      authMethod: row.auth_method,
      requestedCapabilities: row.requested_capabilities || [],
      status: row.status,
      testProfile: row.test_profile,
      lastHeartbeat: row.last_heartbeat,
      metadata: row.metadata || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  static _formatToolReceipt(row) {
    return {
      id: row.id,
      invocationId: row.invocation_id,
      toolRevisionId: row.tool_revision_id,
      status: row.status,
      exitCode: row.exit_code,
      inputDigest: row.input_digest,
      outputDigest: row.output_digest,
      output: row.output,
      durationMs: row.duration_ms,
      artifactIds: row.artifact_ids || [],
      errorMessage: row.error_message,
      createdAt: row.created_at,
    };
  }

  /**
   * Get standard agent tool schemas formatted for LLM function calling.
   * @param {string[]} [toolNames]
   */
  static getStandardToolSchemas(toolNames = ["read_file", "write_file", "list_directory", "execute_command", "propose_task_completion"]) {
    const catalog = {
      read_file: {
        name: "read_file",
        description: "Read file contents from the workspace.",
        parameters: {
          type: "object",
          properties: {
            path: { type: "string", description: "Relative path to the file in workspace" },
            encoding: { type: "string", description: "File encoding, default utf8" },
          },
          required: ["path"],
        },
      },
      write_file: {
        name: "write_file",
        description: "Write content to a file in the workspace.",
        parameters: {
          type: "object",
          properties: {
            path: { type: "string", description: "Relative path to the file in workspace" },
            content: { type: "string", description: "Exact full content to write to the file" },
          },
          required: ["path", "content"],
        },
      },
      list_directory: {
        name: "list_directory",
        description: "List directory contents in the workspace.",
        parameters: {
          type: "object",
          properties: {
            path: { type: "string", description: "Relative path to directory, defaults to ." },
          },
        },
      },
      execute_command: {
        name: "execute_command",
        description: "Execute a command inside the isolated workspace sandbox.",
        parameters: {
          type: "object",
          properties: {
            command: { type: "string", description: "Command executable (e.g. node, npm, git)" },
            args: { type: "array", items: { type: "string" }, description: "Command line arguments" },
          },
          required: ["command"],
        },
      },
      apply_patch: {
        name: "apply_patch",
        description: "Apply a patch or diff to a file in the workspace.",
        parameters: {
          type: "object",
          properties: {
            patch: { type: "string", description: "Unified diff or patch string" },
            targetPath: { type: "string", description: "Target file path to patch" },
          },
          required: ["patch"],
        },
      },
      propose_task_completion: {
        name: "propose_task_completion",
        description: "Propose task completion after verifying that code changes and tests pass.",
        parameters: {
          type: "object",
          properties: {
            summary: { type: "string", description: "Clear concise summary of changes made and verification results" },
            filesModified: { type: "array", items: { type: "string" }, description: "List of workspace relative file paths modified" },
          },
          required: ["summary"],
        },
      },
    };

    return toolNames.map((n) => catalog[n]).filter(Boolean);
  }
}
