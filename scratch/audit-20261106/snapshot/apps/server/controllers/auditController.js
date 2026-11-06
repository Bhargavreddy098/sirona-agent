import { AuditLog } from "../model/AuditLog.js";

export const auditController = {
  async listAuditLogs(req, res, next) {
    try {
      const { limit, action, actor_id } = req.query;
      const logs = await AuditLog.findRecent({
        limit: limit ? parseInt(limit, 10) : 100,
        action,
        actorId: actor_id,
      });
      res.json({ logs, total: logs.length });
    } catch (err) {
      next(err);
    }
  },
};

export default auditController;
