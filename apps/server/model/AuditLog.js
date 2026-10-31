import { query } from "../config/db.js";

/* =====================================================================
   AuditLog Model — Security & Action Audit Trail
   ===================================================================== */

export class AuditLog {
  static async log({ action, actor_id = null, resource_type = null, resource_id = null, details = {}, ip_address = null }) {
    const sql = `
      INSERT INTO audit_logs (action, actor_id, resource_type, resource_id, details, ip_address)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const res = await query(sql, [
      action,
      actor_id,
      resource_type,
      resource_id,
      JSON.stringify(details),
      ip_address,
    ]);
    return res.rows[0];
  }

  static async findRecent({ limit = 100, action = null, actorId = null } = {}) {
    const conditions = [];
    const params = [];
    let idx = 1;

    if (action) {
      conditions.push(`action = $${idx++}`);
      params.push(action);
    }
    if (actorId) {
      conditions.push(`actor_id = $${idx++}`);
      params.push(actorId);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    params.push(limit);

    const sql = `
      SELECT a.*, u.email as actor_email, u.name as actor_name
      FROM audit_logs a
      LEFT JOIN users u ON a.actor_id = u.id
      ${where}
      ORDER BY a.created_at DESC
      LIMIT $${idx}
    `;

    const res = await query(sql, params);
    return res.rows.map((row) => ({
      ...row,
      details: typeof row.details === "string" ? JSON.parse(row.details) : row.details,
    }));
  }
}

export default AuditLog;
