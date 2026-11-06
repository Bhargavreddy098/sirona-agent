import { query } from "../config/db.js";

/* =====================================================================
   Approval Model — Human-in-the-Loop Safety Approvals
   ===================================================================== */

export class Approval {
  static async create({
    run_id,
    prompt_id,
    session_id,
    tool_name,
    command = null,
    tool_args = null,
    risk_level = "medium",
  }) {
    const sql = `
      INSERT INTO approvals (
        run_id, prompt_id, session_id, tool_name, command, tool_args, risk_level
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const res = await query(sql, [
      run_id,
      prompt_id,
      session_id,
      tool_name,
      command,
      tool_args ? JSON.stringify(tool_args) : null,
      risk_level,
    ]);
    return this._format(res.rows[0]);
  }

  static async resolve(runId, promptId, approved) {
    const sql = `
      UPDATE approvals
      SET approved = $3, resolved_at = NOW()
      WHERE run_id = $1 AND prompt_id = $2
      RETURNING *
    `;
    const res = await query(sql, [runId, promptId, approved]);
    return res.rows[0] ? this._format(res.rows[0]) : null;
  }

  static async findPending(runId, promptId) {
    const sql = `
      SELECT * FROM approvals
      WHERE run_id = $1 AND prompt_id = $2 AND approved IS NULL
    `;
    const res = await query(sql, [runId, promptId]);
    return res.rows[0] ? this._format(res.rows[0]) : null;
  }

  static async findBySession(sessionId) {
    const sql = "SELECT * FROM approvals WHERE session_id = $1 ORDER BY created_at DESC";
    const res = await query(sql, [sessionId]);
    return res.rows.map(this._format);
  }

  static _format(row) {
    if (!row) return null;
    return {
      ...row,
      tool_args: typeof row.tool_args === "string" ? JSON.parse(row.tool_args) : row.tool_args || {},
      created_at: new Date(row.created_at).getTime() / 1000,
      resolved_at: row.resolved_at ? new Date(row.resolved_at).getTime() / 1000 : null,
    };
  }
}

export default Approval;
