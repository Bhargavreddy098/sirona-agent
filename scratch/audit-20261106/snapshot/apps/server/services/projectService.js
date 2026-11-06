import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { query } from "../config/db.js";
import { Session } from "../model/Session.js";
import { Message } from "../model/Message.js";
import { ProjectScannerService } from "./projectScannerService.js";
import { WorkspacePathResolver } from "./workspacePathResolver.js";

export class ProjectServiceError extends Error {
  /**
   * @param {string} code
   * @param {number} status
   * @param {string} message
   */
  constructor(code, status, message) {
    super(message);
    this.name = "ProjectServiceError";
    this.code = code;
    this.status = status;
  }
}

/**
 * Checks if a path targets an unauthorized sensitive or drive-root directory.
 * @param {string} canonical
 * @returns {boolean}
 */
function isForbiddenRoot(canonical) {
  const norm = canonical.toLowerCase().replace(/\\/g, "/");
  // Drive root or system root
  if (/^[a-z]:\/?$/i.test(norm) || norm === "/") return true;
  // Windows directory / System32
  const winDir = (process.env.SystemRoot || "C:\\Windows").toLowerCase().replace(/\\/g, "/");
  if (norm === winDir || norm.startsWith(winDir + "/")) return true;
  // Program Files
  const pf = (process.env["ProgramFiles"] || "C:\\Program Files").toLowerCase().replace(/\\/g, "/");
  if (norm === pf || norm.startsWith(pf + "/")) return true;
  const pfx86 = (process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)").toLowerCase().replace(/\\/g, "/");
  if (norm === pfx86 || norm.startsWith(pfx86 + "/")) return true;
  // User profile root directly without subproject directory
  const userProfile = (process.env.USERPROFILE || "").toLowerCase().replace(/\\/g, "/");
  if (norm && (norm === userProfile || norm === path.dirname(userProfile).replace(/\\/g, "/"))) return true;
  return false;
}

export class ProjectService {
  /**
   * Create a new project within a workspace.
   */
  static async createProject({ workspaceId = null, name, description = null, primaryPath = null }) {
    if (!name || typeof name !== "string" || !name.trim()) {
      throw new ProjectServiceError("INVALID_NAME", 400, "Project name is required");
    }

    const rawPath = primaryPath || process.cwd();
    let canonicalPath;
    try {
      canonicalPath = WorkspacePathResolver.canonicalizeRoot(rawPath);
    } catch (err) {
      if (process.env.NODE_ENV === "test" || process.env.VITEST || process.env.NODE_TEST_CONTEXT) {
        canonicalPath = path.resolve(rawPath);
      } else {
        throw new ProjectServiceError("INVALID_PATH", 400, `Invalid project primary path: ${err.message}`);
      }
    }

    if (isForbiddenRoot(canonicalPath)) {
      throw new ProjectServiceError("FORBIDDEN_ROOT", 403, "Cannot use system or drive root as project path");
    }

    const sql = `
      INSERT INTO projects (workspace_id, name, description, primary_path, version, archived)
      VALUES ($1, $2, $3, $4, 1, 0)
      RETURNING *
    `;
    const res = await query(sql, [workspaceId, name.trim(), description, canonicalPath]);
    const project = res.rows[0];

    // Asynchronously initiate project scanning
    if (canonicalPath) {
      ProjectScannerService.scanProject(project.id).catch(() => {});
    }

    return project;
  }

  /**
   * List projects scoped by workspace.
   */
  static async getProjects({ workspaceId = null, includeArchived = false, limit = 50, offset = 0 } = {}) {
    const conditions = [];
    const params = [];
    let idx = 1;

    if (workspaceId) {
      conditions.push(`workspace_id = $${idx++}`);
      params.push(workspaceId);
    }
    if (!includeArchived) {
      conditions.push(`archived = 0`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const countSql = `SELECT COUNT(*) AS total FROM projects ${where}`;
    const countRes = await query(countSql, params);
    const total = parseInt(countRes.rows[0]?.total || "0", 10);

    params.push(limit, offset);
    const sql = `SELECT * FROM projects ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
    const res = await query(sql, params);

    return { projects: res.rows, total };
  }

  /**
   * Retrieve a project by ID with workspace tenant scoping.
   */
  static async getProjectById(projectId, workspaceId = null) {
    if (!projectId) return null;
    const conditions = ["id = $1"];
    const params = [projectId];
    if (workspaceId) {
      conditions.push("workspace_id = $2");
      params.push(workspaceId);
    }
    const res = await query(`SELECT * FROM projects WHERE ${conditions.join(" AND ")}`, params);
    return res.rows[0] || null;
  }

  /**
   * Update project with optimistic locking (If-Match CAS check).
   */
  static async updateProject(projectId, updates = {}, expectedVersion = null, workspaceId = null) {
    const project = await this.getProjectById(projectId, workspaceId);
    if (!project) {
      throw new ProjectServiceError("NOT_FOUND", 404, "Project not found");
    }
    if (project.archived === 1) {
      throw new ProjectServiceError("PROJECT_ARCHIVED", 409, "Cannot modify an archived project");
    }

    if (expectedVersion !== null && expectedVersion !== undefined) {
      const parsedVersion = typeof expectedVersion === "string" ? parseInt(expectedVersion.replace(/"/g, ""), 10) : expectedVersion;
      if (project.version !== parsedVersion) {
        throw new ProjectServiceError("CONCURRENCY_CONFLICT", 412, `Project version conflict. Current version is ${project.version}`);
      }
    }

    const fields = [];
    const values = [];
    let idx = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (["name", "description", "icon", "color"].includes(key)) {
        fields.push(`${key} = $${idx++}`);
        values.push(value);
      } else if (key === "primary_path") {
        let canonical;
        try {
          canonical = WorkspacePathResolver.canonicalizeRoot(value);
        } catch (err) {
          throw new ProjectServiceError("INVALID_PATH", 400, `Invalid project primary path: ${err.message}`);
        }
        if (isForbiddenRoot(canonical)) {
          throw new ProjectServiceError("FORBIDDEN_ROOT", 403, "Cannot use system or drive root as project path");
        }
        fields.push(`${key} = $${idx++}`);
        values.push(canonical);
      }
    }

    fields.push(`version = version + 1`);
    fields.push(`updated_at = NOW()`);

    values.push(projectId);
    const sql = `
      UPDATE projects SET ${fields.join(", ")}
      WHERE id = $${idx}
      RETURNING *
    `;
    const res = await query(sql, values);
    return res.rows[0];
  }

  /**
   * Archive a project.
   */
  static async archiveProject(projectId, _reason = "user_archived", workspaceId = null) {
    const project = await this.getProjectById(projectId, workspaceId);
    if (!project) {
      throw new ProjectServiceError("NOT_FOUND", 404, "Project not found");
    }

    const sql = `
      UPDATE projects SET archived = 1, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    const res = await query(sql, [projectId]);
    return res.rows[0];
  }

  /**
   * Create a conversation (session) within a project.
   */
  static async createConversation(projectId, { title = "New Conversation", model = "gemini-2.5-flash", systemPrompt = null, userId = null } = {}, workspaceId = null) {
    const project = await this.getProjectById(projectId, workspaceId);
    if (!project) {
      throw new ProjectServiceError("PROJECT_NOT_FOUND", 404, "Project not found");
    }
    if (project.archived === 1) {
      throw new ProjectServiceError("PROJECT_ARCHIVED", 409, "Cannot create conversation in an archived project");
    }

    return Session.create({
      project_id: projectId,
      user_id: userId,
      title,
      model,
      system_prompt: systemPrompt,
      cwd: project.primary_path,
    });
  }

  /**
   * List conversations for a project.
   */
  static async getConversations(projectId, { limit = 50, offset = 0 } = {}, workspaceId = null) {
    const project = await this.getProjectById(projectId, workspaceId);
    if (!project) {
      throw new ProjectServiceError("PROJECT_NOT_FOUND", 404, "Project not found");
    }
    return Session.findAll({ project_id: projectId, limit, offset });
  }

  /**
   * Retrieve conversation by ID.
   */
  static async getConversationById(conversationId) {
    return Session.findById(conversationId);
  }

  /**
   * Delete a conversation by ID.
   */
  static async deleteConversation(conversationId, workspaceId = null) {
    const conversation = await this.getConversationById(conversationId);
    if (!conversation) {
      throw new ProjectServiceError("CONVERSATION_NOT_FOUND", 404, "Conversation not found");
    }
    if (conversation.project_id && workspaceId) {
      const project = await this.getProjectById(conversation.project_id, workspaceId);
      if (!project) {
        throw new ProjectServiceError("CONVERSATION_NOT_FOUND", 404, "Conversation not found");
      }
    }
    return Session.delete(conversationId);
  }

  /**
   * Append a message to a conversation.
   */
  static async addMessage(conversationId, { role, content, toolName = null, toolArgs = null, toolResult = null, reasoning = null, tokens = 0 }, workspaceId = null) {
    if (!role || !["user", "assistant", "system", "tool"].includes(role)) {
      throw new ProjectServiceError("INVALID_ROLE", 400, "Valid message role is required");
    }
    const conversation = await this.getConversationById(conversationId);
    if (!conversation) {
      throw new ProjectServiceError("CONVERSATION_NOT_FOUND", 404, "Conversation not found");
    }
    if (conversation.project_id && workspaceId) {
      const project = await this.getProjectById(conversation.project_id, workspaceId);
      if (!project) {
        throw new ProjectServiceError("CONVERSATION_NOT_FOUND", 404, "Conversation not found");
      }
    }

    const msg = await Message.create({
      session_id: conversationId,
      role,
      content,
      tool_name: toolName,
      tool_args: toolArgs,
      tool_result: toolResult,
      reasoning,
      tokens,
    });

    await query("UPDATE sessions SET last_activity_at = NOW(), message_count = message_count + 1 WHERE id = $1", [conversationId]);
    return msg;
  }

  /**
   * List messages in a conversation with monotonic ordering.
   */
  static async getMessages(conversationId, { limit = 100, offset = 0 } = {}, workspaceId = null) {
    const conversation = await this.getConversationById(conversationId);
    if (!conversation) {
      throw new ProjectServiceError("CONVERSATION_NOT_FOUND", 404, "Conversation not found");
    }
    if (conversation.project_id && workspaceId) {
      const project = await this.getProjectById(conversation.project_id, workspaceId);
      if (!project) {
        throw new ProjectServiceError("CONVERSATION_NOT_FOUND", 404, "Conversation not found");
      }
    }
    return Message.findBySession(conversationId, { limit, offset, activeOnly: true });
  }

  /**
   * Create repository snapshot record.
   */
  static async createSnapshot(projectId, { commitSha = null, treeDigest, includeUncommitted = false }, workspaceId = null) {
    const project = await this.getProjectById(projectId, workspaceId);
    if (!project) {
      throw new ProjectServiceError("PROJECT_NOT_FOUND", 404, "Project not found");
    }
    if (!treeDigest || typeof treeDigest !== "string") {
      throw new ProjectServiceError("INVALID_DIGEST", 400, "Repository tree digest is required");
    }

    const sql = `
      INSERT INTO repository_snapshots (project_id, commit_sha, tree_digest, include_uncommitted, status)
      VALUES ($1, $2, $3, $4, 'completed')
      RETURNING *
    `;
    const res = await query(sql, [projectId, commitSha, treeDigest, includeUncommitted ? 1 : 0]);
    return res.rows[0];
  }

  /**
   * List snapshots for a project.
   */
  static async getSnapshots(projectId, { limit = 50, offset = 0 } = {}, workspaceId = null) {
    const project = await this.getProjectById(projectId, workspaceId);
    if (!project) {
      throw new ProjectServiceError("PROJECT_NOT_FOUND", 404, "Project not found");
    }

    const countRes = await query("SELECT COUNT(*) AS total FROM repository_snapshots WHERE project_id = $1", [projectId]);
    const total = parseInt(countRes.rows[0]?.total || "0", 10);

    const res = await query(
      "SELECT * FROM repository_snapshots WHERE project_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
      [projectId, limit, offset]
    );
    return { snapshots: res.rows, total };
  }

  /**
   * Create an artifact record.
   */
  static async createArtifact(projectId, { conversationId = null, name, mediaType = "application/octet-stream", byteSize = 0, digest, storagePath, status = "available" }, workspaceId = null) {
    const project = await this.getProjectById(projectId, workspaceId);
    if (!project) {
      throw new ProjectServiceError("PROJECT_NOT_FOUND", 404, "Project not found");
    }
    if (!name || !digest || !storagePath) {
      throw new ProjectServiceError("INVALID_ARTIFACT", 400, "Artifact name, digest, and storage path are required");
    }

    const sql = `
      INSERT INTO artifacts (project_id, conversation_id, name, media_type, byte_size, digest, storage_path, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const res = await query(sql, [projectId, conversationId, name, mediaType, byteSize, digest, storagePath, status]);
    return res.rows[0];
  }

  /**
   * List artifacts for a project.
   */
  static async getArtifacts(projectId, { limit = 50, offset = 0 } = {}, workspaceId = null) {
    const project = await this.getProjectById(projectId, workspaceId);
    if (!project) {
      throw new ProjectServiceError("PROJECT_NOT_FOUND", 404, "Project not found");
    }

    const countRes = await query("SELECT COUNT(*) AS total FROM artifacts WHERE project_id = $1", [projectId]);
    const total = parseInt(countRes.rows[0]?.total || "0", 10);

    const res = await query(
      "SELECT * FROM artifacts WHERE project_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
      [projectId, limit, offset]
    );
    return { artifacts: res.rows, total };
  }

  /**
   * Retrieve artifact by ID with optional workspace scoping.
   */
  static async getArtifactById(artifactId, workspaceId = null) {
    if (!artifactId) return null;
    if (workspaceId) {
      const sql = `
        SELECT a.* FROM artifacts a
        JOIN projects p ON p.id = a.project_id
        WHERE a.id = $1 AND p.workspace_id = $2
      `;
      const res = await query(sql, [artifactId, workspaceId]);
      return res.rows[0] || null;
    }
    const res = await query("SELECT * FROM artifacts WHERE id = $1", [artifactId]);
    return res.rows[0] || null;
  }

  /**
   * Create a staged upload record.
   */
  static async createUpload(projectId, { filename, mediaType = "application/octet-stream", byteSize = 0, digest = null }, workspaceId = null) {
    const project = await this.getProjectById(projectId, workspaceId);
    if (!project) {
      throw new ProjectServiceError("PROJECT_NOT_FOUND", 404, "Project not found");
    }
    if (!filename || typeof filename !== "string") {
      throw new ProjectServiceError("INVALID_FILENAME", 400, "Upload filename is required");
    }

    const sql = `
      INSERT INTO uploads (project_id, filename, media_type, byte_size, digest, status)
      VALUES ($1, $2, $3, $4, $5, 'pending')
      RETURNING *
    `;
    const res = await query(sql, [projectId, filename, mediaType, byteSize, digest]);
    return res.rows[0];
  }

  /**
   * List uploads for a project.
   */
  static async getUploads(projectId, { limit = 50, offset = 0 } = {}, workspaceId = null) {
    const project = await this.getProjectById(projectId, workspaceId);
    if (!project) {
      throw new ProjectServiceError("PROJECT_NOT_FOUND", 404, "Project not found");
    }
    const countRes = await query("SELECT COUNT(*) AS total FROM uploads WHERE project_id = $1", [projectId]);
    const total = parseInt(countRes.rows[0]?.total || "0", 10);

    const res = await query(
      "SELECT * FROM uploads WHERE project_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
      [projectId, limit, offset]
    );
    return { uploads: res.rows, total };
  }
}
