import { Approval } from "../model/Approval.js";
import { broadcastEvent } from "../services/socket.js";
import { auditLogger } from "../services/auditLogger.js";

/* =====================================================================
   Approval Controller — Human-in-the-Loop Safety Resolution
   ===================================================================== */

export const approvalController = {
  async respondApproval(req, res, next) {
    try {
      const { runId } = req.params;
      const { prompt_id, approved } = req.body;

      if (!prompt_id) {
        return res.status(400).json({ success: false, message: "prompt_id is required" });
      }

      const updated = await Approval.resolve(runId, prompt_id, Boolean(approved));

      // Broadcast resolution over Socket.IO to any awaiting turn runners
      broadcastEvent(`approval:${runId}:${prompt_id}`, {
        run_id: runId,
        prompt_id,
        approved: Boolean(approved),
      });

      auditLogger.log(req, "approval.resolve", {
        resourceType: "approval",
        resourceId: prompt_id,
        details: { run_id: runId, approved: Boolean(approved) },
      });

      res.json({ success: true, approval: updated });
    } catch (err) {
      next(err);
    }
  },

  async listApprovals(req, res, next) {
    try {
      const { sessionId } = req.query;
      if (!sessionId) {
        return res.status(400).json({ success: false, message: "sessionId is required" });
      }
      const approvals = await Approval.findBySession(sessionId);
      res.json({ approvals, total: approvals.length });
    } catch (err) {
      next(err);
    }
  },
};

export default approvalController;
