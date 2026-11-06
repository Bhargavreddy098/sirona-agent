import { Session } from "../model/Session.js";
import { Project } from "../model/Project.js";

/* =====================================================================
   Ownership Guard Middleware
   ===================================================================== */

export async function verifySessionOwnership(req, res, next) {
  const sessionId = req.params.sessionId || req.params.id;
  if (!sessionId) return next();

  // Local desktop mode always has permission
  if (req.user?.is_local || !req.user?.id) {
    return next();
  }

  const session = await Session.findById(sessionId);
  if (!session) {
    return res.status(404).json({ success: false, message: "Session not found" });
  }

  if (session.user_id && req.user?.id && session.user_id !== req.user.id) {
    return res.status(403).json({ success: false, message: "Forbidden: You do not own this session" });
  }

  req.sessionRecord = session;
  next();
}

export async function verifyProjectOwnership(req, res, next) {
  const projectId = req.params.projectId || req.params.id;
  if (!projectId) return next();

  if (req.user?.is_local || !req.user?.id) {
    return next();
  }

  const project = await Project.findById(projectId);
  if (!project) {
    return res.status(404).json({ success: false, message: "Project not found" });
  }

  req.projectRecord = project;
  next();
}

export default {
  verifySessionOwnership,
  verifyProjectOwnership,
};
