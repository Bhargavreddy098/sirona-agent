// @ts-check
import { Router } from "express";
import { sessionAuth } from "../../middleware/sessionAuth.js";
import { sendProblem } from "../../middleware/problem.js";
import { MemoryService, MemoryServiceError } from "../../services/memoryService.js";
import { ProjectService, ProjectServiceError } from "../../services/projectService.js";

const router = Router();

/**
 * Common error handler for memory routes.
 * @param {any} req
 * @param {any} res
 * @param {any} err
 */
function handleError(req, res, err) {
  if (err instanceof MemoryServiceError || err instanceof ProjectServiceError) {
    return sendProblem(req, res, err.status, err.message);
  }
  if (err && typeof err.status === "number") {
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

// Middleware to strictly verify workspace ownership of a memoryId
async function requireMemoryOwnership(req, res, next) {
  const workspaceId = req.session?.workspaceId;
  if (!workspaceId) {
    return sendProblem(req, res, 401, "Authentication session required");
  }
  try {
    const scope = await MemoryService.getMemoryProjectScope(req.params.memoryId);
    if (!scope) {
      return sendProblem(req, res, 404, "Memory not found");
    }
    const project = await ProjectService.getProjectById(scope.project_id, workspaceId);
    if (!project) {
      return sendProblem(req, res, 404, "Memory not found");
    }
    req.memoryScope = scope;
    req.project = project;
    next();
  } catch (err) {
    return handleError(req, res, err);
  }
}

// ==========================================
// 1. Memory CRUD Endpoints
// ==========================================

// POST /api/v1/projects/:projectId/memories
router.post(
  "/projects/:projectId/memories",
  sessionAuth({ requireCsrf: true }),
  requireProjectOwnership,
  async (req, res) => {
    try {
      const memory = await MemoryService.createMemory(req.params.projectId, req.body || {});
      return res.status(201).json({
        data: memory,
        meta: { requestId: req.requestId },
      });
    } catch (err) {
      return handleError(req, res, err);
    }
  }
);

// GET /api/v1/projects/:projectId/memories
router.get(
  "/projects/:projectId/memories",
  sessionAuth({ requireCsrf: false }),
  requireProjectOwnership,
  async (req, res) => {
    try {
      const { memoryKind, scopeKind, includeDeleted, limit, offset } = req.query;
      const result = await MemoryService.getProjectMemories(req.params.projectId, {
        memoryKind: typeof memoryKind === "string" ? memoryKind : undefined,
        scopeKind: typeof scopeKind === "string" ? scopeKind : undefined,
        includeDeleted: includeDeleted === "true",
        limit: limit ? Number(limit) : 50,
        offset: offset ? Number(offset) : 0,
      });
      return res.status(200).json({
        data: result,
        meta: { requestId: req.requestId },
      });
    } catch (err) {
      return handleError(req, res, err);
    }
  }
);

// GET /api/v1/memories/:memoryId
router.get(
  "/memories/:memoryId",
  sessionAuth({ requireCsrf: false }),
  requireMemoryOwnership,
  async (req, res) => {
    try {
      const { includeDeleted } = req.query;
      const result = await MemoryService.getMemoryById(req.params.memoryId, {
        includeDeleted: includeDeleted === "true",
      });
      return res.status(200).json({
        data: result,
        meta: { requestId: req.requestId },
      });
    } catch (err) {
      return handleError(req, res, err);
    }
  }
);

// POST /api/v1/memories/:memoryId/revisions
router.post(
  "/memories/:memoryId/revisions",
  sessionAuth({ requireCsrf: true }),
  requireMemoryOwnership,
  async (req, res) => {
    try {
      const memory = await MemoryService.createMemoryRevision(req.params.memoryId, req.body || {});
      return res.status(201).json({
        data: memory,
        meta: { requestId: req.requestId },
      });
    } catch (err) {
      return handleError(req, res, err);
    }
  }
);

// DELETE /api/v1/memories/:memoryId
router.delete(
  "/memories/:memoryId",
  sessionAuth({ requireCsrf: true }),
  requireMemoryOwnership,
  async (req, res) => {
    try {
      const result = await MemoryService.deleteMemory(req.params.memoryId);
      return res.status(200).json({
        data: result,
        meta: { requestId: req.requestId },
      });
    } catch (err) {
      return handleError(req, res, err);
    }
  }
);

// ==========================================
// 2. Hybrid Search Endpoint
// ==========================================

// POST /api/v1/projects/:projectId/memory-search
router.post(
  "/projects/:projectId/memory-search",
  sessionAuth({ requireCsrf: true }),
  requireProjectOwnership,
  async (req, res) => {
    try {
      const result = await MemoryService.searchMemories(req.params.projectId, req.body || {});
      return res.status(200).json({
        data: result,
        meta: { requestId: req.requestId },
      });
    } catch (err) {
      return handleError(req, res, err);
    }
  }
);

// ==========================================
// 3. Project Intelligence & AST Knowledge Graph
// ==========================================

// POST /api/v1/projects/:projectId/knowledge-index
router.post(
  "/projects/:projectId/knowledge-index",
  sessionAuth({ requireCsrf: true }),
  requireProjectOwnership,
  async (req, res) => {
    try {
      const result = await MemoryService.indexProjectKnowledge(req.params.projectId, req.body || {});
      return res.status(200).json({
        data: result,
        meta: { requestId: req.requestId },
      });
    } catch (err) {
      return handleError(req, res, err);
    }
  }
);

// GET /api/v1/projects/:projectId/knowledge/nodes
router.get(
  "/projects/:projectId/knowledge/nodes",
  sessionAuth({ requireCsrf: false }),
  requireProjectOwnership,
  async (req, res) => {
    try {
      const { kind, path, snapshotId, limit, offset } = req.query;
      const result = await MemoryService.getKnowledgeNodes(req.params.projectId, {
        kind: typeof kind === "string" ? kind : undefined,
        path: typeof path === "string" ? path : undefined,
        snapshotId: typeof snapshotId === "string" ? snapshotId : undefined,
        limit: limit ? Number(limit) : 100,
        offset: offset ? Number(offset) : 0,
      });
      return res.status(200).json({
        data: result,
        meta: { requestId: req.requestId },
      });
    } catch (err) {
      return handleError(req, res, err);
    }
  }
);

// GET /api/v1/projects/:projectId/knowledge/edges
router.get(
  "/projects/:projectId/knowledge/edges",
  sessionAuth({ requireCsrf: false }),
  requireProjectOwnership,
  async (req, res) => {
    try {
      const { kind, fromNodeId, toNodeId, snapshotId, limit, offset } = req.query;
      const result = await MemoryService.getKnowledgeEdges(req.params.projectId, {
        kind: typeof kind === "string" ? kind : undefined,
        fromNodeId: typeof fromNodeId === "string" ? fromNodeId : undefined,
        toNodeId: typeof toNodeId === "string" ? toNodeId : undefined,
        snapshotId: typeof snapshotId === "string" ? snapshotId : undefined,
        limit: limit ? Number(limit) : 100,
        offset: offset ? Number(offset) : 0,
      });
      return res.status(200).json({
        data: result,
        meta: { requestId: req.requestId },
      });
    } catch (err) {
      return handleError(req, res, err);
    }
  }
);

export default router;
