import { AuditLog } from "../model/AuditLog.js";

/* =====================================================================
   Audit Logger Service
   Asynchronously records sensitive security operations to PostgreSQL.
   ===================================================================== */

export const auditLogger = {
  log(req, action, { resourceType = null, resourceId = null, details = {} } = {}) {
    const actorId = req?.user?.id || null;
    const ipAddress =
      req?.headers["x-forwarded-for"]?.split(",")[0] ||
      req?.socket?.remoteAddress ||
      null;

    // Fire-and-forget: do not block HTTP response flow
    setImmediate(async () => {
      try {
        await AuditLog.log({
          action,
          actor_id: actorId,
          resource_type: resourceType,
          resource_id: String(resourceId || ""),
          details,
          ip_address: ipAddress,
        });
      } catch (err) {
        console.error("Failed to write audit log:", err.message);
      }
    });
  },
};

export default auditLogger;
