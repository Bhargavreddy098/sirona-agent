import fs from "node:fs";
import { Router } from "express";
import { sessionAuth } from "../../middleware/sessionAuth.js";
import { sendProblem } from "../../middleware/problem.js";
import { ProjectService, ProjectServiceError } from "../../services/projectService.js";
import { ProjectScannerService } from "../../services/projectScannerService.js";

const router = Router();

// Helper to handle service errors
function handleError(req, res, err) {
  if (err instanceof ProjectServiceError) {
    return sendProblem(req, res, err.status, err.message);
  }
  return sendProblem(req, res, 500, err instanceof Error ? err.message : "Internal server error");
}

// Middleware to strictly verify workspace ownership of a projectId
async function requireProjectOwnership(req, res, next) {
  const workspaceId = req.session?.workspaceId;
  if (!workspaceId) {
    return sendProblem(req, res, 401, "Authentication session required");
  }
  try {
    const project = await ProjectService.getProjectById(req.params.projectId, workspaceId);
    if (!project) {
      return sendProblem(req, res, 404, "Project not found");
    }
    req.project = project;
    next();
  } catch (err) {
    return handleError(req, res, err);
  }
}

// ==========================================
// 1. Project Endpoints
// ==========================================

// POST /api/v1/projects
router.post("/projects", sessionAuth(), async (req, res) => {
  try {
    const { name, description, primaryPath, directory } = req.body || {};
    const workspaceId = req.body?.workspaceId || req.session?.workspaceId || null;
    const project = await ProjectService.createProject({
      workspaceId,
      name,
      description,
      primaryPath: primaryPath || directory || null,
    });
    return res.status(201).json({
      data: {
        project: {
          ...project,
          canonical: project.primary_path || project.canonical || "",
        },
      },
      meta: { requestId: req.requestId, version: project.version },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// GET /api/v1/projects
router.get("/projects", sessionAuth({ requireCsrf: false }), async (req, res) => {
  try {
    const workspaceId = req.session?.workspaceId || null;
    const includeArchived = req.query.includeArchived === "true";
    const limit = parseInt(String(req.query.limit || "50"), 10);
    const offset = parseInt(String(req.query.offset || "0"), 10);

    const { projects, total } = await ProjectService.getProjects({
      workspaceId,
      includeArchived,
      limit,
      offset,
    });
    const formattedProjects = (projects || []).map((p) => ({
      ...p,
      canonical: p.primary_path || p.canonical || "",
    }));
    return res.status(200).json({
      data: { projects: formattedProjects, total },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// GET /api/v1/projects/:projectId
router.get("/projects/:projectId", sessionAuth({ requireCsrf: false }), requireProjectOwnership, async (req, res) => {
  const project = {
    ...req.project,
    canonical: req.project.primary_path || req.project.canonical || "",
  };
  return res.status(200).json({
    data: { project },
    meta: { requestId: req.requestId, version: project.version },
  });
});

// PATCH /api/v1/projects/:projectId (Optimistic Locking via If-Match)
router.patch("/projects/:projectId", sessionAuth(), requireProjectOwnership, async (req, res) => {
  try {
    const rawIfMatch = req.headers["if-match"];
    const expectedVersion = typeof rawIfMatch === "string" ? rawIfMatch : null;
    const updates = { ...(req.body || {}) };
    if (updates.directory && !updates.primary_path) {
      updates.primary_path = updates.directory;
    }
    const project = await ProjectService.updateProject(
      req.params.projectId,
      updates,
      expectedVersion,
      req.session.workspaceId
    );
    return res.status(200).json({
      data: {
        project: {
          ...project,
          canonical: project.primary_path || project.canonical || "",
        },
      },
      meta: { requestId: req.requestId, version: project.version },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// POST /api/v1/projects/:projectId/archive
router.post("/projects/:projectId/archive", sessionAuth(), requireProjectOwnership, async (req, res) => {
  try {
    const project = await ProjectService.archiveProject(
      req.params.projectId,
      req.body?.reason || "user_archived",
      req.session.workspaceId
    );
    return res.status(200).json({
      data: {
        project: {
          ...project,
          canonical: project.primary_path || project.canonical || "",
        },
      },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// ==========================================
// 2. Conversation Endpoints
// ==========================================

// POST /api/v1/projects/:projectId/conversations
router.post("/projects/:projectId/conversations", sessionAuth(), requireProjectOwnership, async (req, res) => {
  try {
    const { title, model, systemPrompt } = req.body || {};
    const userId = req.session?.principalId || null;
    const conversation = await ProjectService.createConversation(
      req.params.projectId,
      { title, model, systemPrompt, userId },
      req.session?.workspaceId
    );
    return res.status(201).json({
      data: { conversation },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// GET /api/v1/projects/:projectId/conversations
router.get("/projects/:projectId/conversations", sessionAuth({ requireCsrf: false }), requireProjectOwnership, async (req, res) => {
  try {
    const limit = parseInt(String(req.query.limit || "50"), 10);
    const offset = parseInt(String(req.query.offset || "0"), 10);
    const result = await ProjectService.getConversations(
      req.params.projectId,
      { limit, offset },
      req.session?.workspaceId
    );
    return res.status(200).json({
      data: result,
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// GET /api/v1/conversations/:conversationId
router.get("/conversations/:conversationId", sessionAuth({ requireCsrf: false }), async (req, res) => {
  try {
    const conversation = await ProjectService.getConversationById(req.params.conversationId);
    if (!conversation) {
      return sendProblem(req, res, 404, "Conversation not found");
    }
    return res.status(200).json({
      data: { conversation },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// DELETE /api/v1/conversations/:conversationId
router.delete("/conversations/:conversationId", sessionAuth(), async (req, res) => {
  try {
    await ProjectService.deleteConversation(req.params.conversationId, req.session?.workspaceId);
    return res.status(200).json({
      data: { success: true },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// ==========================================
// 3. Message Endpoints
// ==========================================

// POST /api/v1/conversations/:conversationId/messages
router.post("/conversations/:conversationId/messages", sessionAuth(), async (req, res) => {
  try {
    const msg = await ProjectService.addMessage(
      req.params.conversationId,
      req.body || {},
      req.session?.workspaceId
    );
    return res.status(201).json({
      data: { message: msg },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// GET /api/v1/conversations/:conversationId/messages
router.get("/conversations/:conversationId/messages", sessionAuth({ requireCsrf: false }), async (req, res) => {
  try {
    const limit = parseInt(String(req.query.limit || "100"), 10);
    const offset = parseInt(String(req.query.offset || "0"), 10);
    const result = await ProjectService.getMessages(
      req.params.conversationId,
      { limit, offset },
      req.session?.workspaceId
    );
    return res.status(200).json({
      data: result,
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// ==========================================
// 4. Repository Snapshot Endpoints
// ==========================================

// POST /api/v1/projects/:projectId/snapshots
router.post("/projects/:projectId/snapshots", sessionAuth(), requireProjectOwnership, async (req, res) => {
  try {
    const { commitSha, treeDigest, includeUncommitted } = req.body || {};
    const snapshot = await ProjectService.createSnapshot(
      req.params.projectId,
      {
        commitSha,
        treeDigest,
        includeUncommitted: Boolean(includeUncommitted),
      },
      req.session.workspaceId
    );
    return res.status(201).json({
      data: { snapshot },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// GET /api/v1/projects/:projectId/snapshots
router.get("/projects/:projectId/snapshots", sessionAuth({ requireCsrf: false }), requireProjectOwnership, async (req, res) => {
  try {
    const limit = parseInt(String(req.query.limit || "50"), 10);
    const offset = parseInt(String(req.query.offset || "0"), 10);
    const result = await ProjectService.getSnapshots(
      req.params.projectId,
      { limit, offset },
      req.session.workspaceId
    );
    return res.status(200).json({
      data: result,
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// ==========================================
// 5. Artifact & Upload Endpoints
// ==========================================

// GET /api/v1/projects/:projectId/artifacts
router.get("/projects/:projectId/artifacts", sessionAuth({ requireCsrf: false }), requireProjectOwnership, async (req, res) => {
  try {
    const limit = parseInt(String(req.query.limit || "50"), 10);
    const offset = parseInt(String(req.query.offset || "0"), 10);
    const result = await ProjectService.getArtifacts(
      req.params.projectId,
      { limit, offset },
      req.session.workspaceId
    );
    return res.status(200).json({
      data: result,
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// GET /api/v1/artifacts/:artifactId
router.get("/artifacts/:artifactId", sessionAuth({ requireCsrf: false }), async (req, res) => {
  try {
    const workspaceId = req.session?.workspaceId || null;
    const artifact = await ProjectService.getArtifactById(req.params.artifactId, workspaceId);
    if (!artifact) {
      return sendProblem(req, res, 404, "Artifact not found");
    }
    if (artifact.status === "quarantined") {
      return sendProblem(req, res, 403, "Artifact is quarantined for security review");
    }
    return res.status(200).json({
      data: { artifact },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// GET /api/v1/artifacts/:artifactId/content (Streams real file contents with digest & safe headers)
router.get("/artifacts/:artifactId/content", sessionAuth({ requireCsrf: false }), async (req, res) => {
  try {
    const workspaceId = req.session?.workspaceId || null;
    const artifact = await ProjectService.getArtifactById(req.params.artifactId, workspaceId);
    if (!artifact) {
      return sendProblem(req, res, 404, "Artifact not found");
    }
    if (artifact.status === "quarantined") {
      return sendProblem(req, res, 403, "Artifact is quarantined for security review");
    }

    if (!artifact.storage_path) {
      return sendProblem(req, res, 404, "Artifact storage file not found");
    }

    // Set canonical safe attachment headers
    const safeFilename = encodeURIComponent(artifact.name || "artifact.bin");
    res.setHeader("Content-Disposition", `attachment; filename="${safeFilename}"`);
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (artifact.digest) {
      res.setHeader("Content-Digest", `sha-256=:${artifact.digest}:`);
    }
    res.setHeader("Content-Type", artifact.media_type || "application/octet-stream");

    if (fs.existsSync(artifact.storage_path)) {
      const stat = fs.statSync(artifact.storage_path);
      res.setHeader("Content-Length", String(stat.size));
      const stream = fs.createReadStream(artifact.storage_path);
      stream.on("error", () => {
        if (!res.headersSent) sendProblem(req, res, 500, "Error reading artifact content");
      });
      stream.pipe(res);
    } else {
      const buf = Buffer.from(artifact.storage_path, "utf8");
      res.setHeader("Content-Length", String(buf.length));
      res.end(buf);
    }
  } catch (err) {
    return handleError(req, res, err);
  }
});

// POST /api/v1/projects/:projectId/uploads
router.post("/projects/:projectId/uploads", sessionAuth(), requireProjectOwnership, async (req, res) => {
  try {
    const { filename, mediaType, byteSize, digest } = req.body || {};
    const upload = await ProjectService.createUpload(
      req.params.projectId,
      {
        filename,
        mediaType,
        byteSize,
        digest,
      },
      req.session.workspaceId
    );
    return res.status(201).json({
      data: { upload },
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    return handleError(req, res, err);
  }
});

// POST /api/v1/projects/:projectId/scan
router.post("/projects/:projectId/scan", sessionAuth(), requireProjectOwnership, async (req, res) => {
  try {
    const summary = await ProjectScannerService.scanProject(req.params.projectId);
    return res.status(200).json({
      data: summary,
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    if (/** @type {any} */ (err).status) {
      return sendProblem(req, res, /** @type {any} */ (err).status, err.message);
    }
    return handleError(req, res, err);
  }
});

// GET /api/v1/projects/:projectId/structure
router.get("/projects/:projectId/structure", sessionAuth({ requireCsrf: false }), requireProjectOwnership, async (req, res) => {
  try {
    const structure = await ProjectScannerService.getProjectStructure(req.params.projectId);
    return res.status(200).json({
      data: structure,
      meta: { requestId: req.requestId },
    });
  } catch (err) {
    if (/** @type {any} */ (err).status) {
      return sendProblem(req, res, /** @type {any} */ (err).status, err.message);
    }
    return handleError(req, res, err);
  }
});

export default router;
