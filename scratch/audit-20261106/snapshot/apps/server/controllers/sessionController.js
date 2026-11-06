import { Session } from "../model/Session.js";
import { Message } from "../model/Message.js";
import { Checkpoint } from "../model/Checkpoint.js";
import { auditLogger } from "../services/auditLogger.js";

/* =====================================================================
   Session Controller — Preserves Sirona UI REST Contracts
   ===================================================================== */

export const sessionController = {
  async listSessions(req, res, next) {
    try {
      const { pinned, archived, project_id, limit, offset } = req.query;

      const pinnedBool = pinned !== undefined ? pinned === "true" || pinned === "1" : undefined;
      const archivedBool = archived !== undefined ? archived === "true" || archived === "1" : undefined;

      const data = await Session.findAll({
        pinned: pinnedBool,
        archived: archivedBool,
        project_id,
        limit: limit ? parseInt(limit, 10) : 100,
        offset: offset ? parseInt(offset, 10) : 0,
      });

      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  async createSession(req, res, next) {
    try {
      const { title, model, cwd, project_id, system_prompt, reasoning_effort } = req.body;
      const session = await Session.create({
        title,
        model,
        cwd,
        project_id,
        user_id: req.user?.id || null,
        system_prompt,
        reasoning_effort,
      });

      auditLogger.log(req, "session.create", { resourceType: "session", resourceId: session.id });

      res.status(201).json({ session });
    } catch (err) {
      next(err);
    }
  },

  async getSession(req, res, next) {
    try {
      const { id } = req.params;
      const session = await Session.findById(id);
      if (!session) {
        return res.status(404).json({ success: false, message: "Session not found" });
      }
      res.json({ session });
    } catch (err) {
      next(err);
    }
  },

  async updateSession(req, res, next) {
    try {
      const { id } = req.params;
      const session = await Session.update(id, req.body);
      if (!session) {
        return res.status(404).json({ success: false, message: "Session not found" });
      }

      auditLogger.log(req, "session.update", { resourceType: "session", resourceId: id, details: req.body });

      res.json({ session });
    } catch (err) {
      next(err);
    }
  },

  async deleteSession(req, res, next) {
    try {
      const { id } = req.params;
      const success = await Session.delete(id);

      auditLogger.log(req, "session.delete", { resourceType: "session", resourceId: id });

      res.json({ success, session_id: id });
    } catch (err) {
      next(err);
    }
  },

  async getMessages(req, res, next) {
    try {
      const { id } = req.params;
      const { limit, offset } = req.query;

      const data = await Message.findBySession(id, {
        limit: limit ? parseInt(limit, 10) : 500,
        offset: offset ? parseInt(offset, 10) : 0,
      });

      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  async branchSession(req, res, next) {
    try {
      const { id } = req.params;
      const { through_message_id, new_title } = req.body;

      const parent = await Session.findById(id);
      if (!parent) {
        return res.status(404).json({ success: false, message: "Source session not found" });
      }

      // Create child branch session
      const child = await Session.create({
        title: new_title || `${parent.title} (Branch)`,
        model: parent.model,
        cwd: parent.cwd,
        project_id: parent.project_id,
        user_id: req.user?.id || null,
        parent_session_id: parent.id,
        branch_point_id: through_message_id ? parseInt(through_message_id, 10) : null,
      });

      // Copy messages through branch point
      const copiedCount = await Message.copyMessagesThrough(
        parent.id,
        child.id,
        through_message_id ? parseInt(through_message_id, 10) : null
      );

      await Session.update(child.id, { message_count: copiedCount });

      auditLogger.log(req, "session.branch", {
        resourceType: "session",
        resourceId: child.id,
        details: { parent_id: parent.id, through_message_id },
      });

      res.status(201).json({ session: child });
    } catch (err) {
      next(err);
    }
  },

  async rewindSession(req, res, next) {
    try {
      const { id } = req.params;
      const { to_message_id } = req.body;

      if (!to_message_id) {
        return res.status(400).json({ success: false, message: "to_message_id is required" });
      }

      const result = await Message.rewindTo(id, parseInt(to_message_id, 10));

      auditLogger.log(req, "session.rewind", {
        resourceType: "session",
        resourceId: id,
        details: { to_message_id },
      });

      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  },

  async getTopology(req, res, next) {
    try {
      const topology = await Session.getTopology();
      res.json(topology);
    } catch (err) {
      next(err);
    }
  },

  async getLineage(req, res, next) {
    try {
      const { id } = req.params;
      const lineage = await Session.getLineage(id);
      if (!lineage) {
        return res.status(404).json({ success: false, message: "Session not found" });
      }
      res.json(lineage);
    } catch (err) {
      next(err);
    }
  },

  async listCheckpoints(req, res, next) {
    try {
      const { id } = req.params;
      const checkpoints = await Checkpoint.findBySession(id);
      res.json({ checkpoints, total: checkpoints.length });
    } catch (err) {
      next(err);
    }
  },

  async createCheckpoint(req, res, next) {
    try {
      const { id } = req.params;
      const { message_id, summary, state_data } = req.body;
      const checkpoint = await Checkpoint.create({
        session_id: id,
        message_id,
        summary,
        state_data,
      });
      res.status(201).json({ checkpoint });
    } catch (err) {
      next(err);
    }
  },

  async searchMessages(req, res, next) {
    try {
      const { q, session_id, limit } = req.query;
      const results = await Message.search(
        q,
        session_id,
        limit ? parseInt(limit, 10) : 50
      );
      res.json(results);
    } catch (err) {
      next(err);
    }
  },
};

export default sessionController;
