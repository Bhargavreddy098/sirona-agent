import { query } from "../config/db.js";

/* =====================================================================
   Checkpoint Model — Session Snapshot Data Access
   ===================================================================== */

export class Checkpoint {
  static async create({ session_id, message_id = null, summary = null, state_data = null }) {
    const sql = `
      INSERT INTO checkpoints (session_id, message_id, summary, state_data)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const res = await query(sql, [
      session_id,
      message_id,
      summary,
      state_data ? JSON.stringify(state_data) : null,
    ]);
    return this._format(res.rows[0]);
  }

  static async findBySession(sessionId) {
    const sql = `
      SELECT * FROM checkpoints
      WHERE session_id = $1
      ORDER BY created_at DESC
    `;
    const res = await query(sql, [sessionId]);
    return res.rows.map(this._format);
  }

  static async findById(id) {
    const sql = "SELECT * FROM checkpoints WHERE id = $1";
    const res = await query(sql, [id]);
    return res.rows[0] ? this._format(res.rows[0]) : null;
  }

  static async delete(id) {
    const sql = "DELETE FROM checkpoints WHERE id = $1 RETURNING id";
    const res = await query(sql, [id]);
    return !!res.rows[0];
  }

  static _format(row) {
    if (!row) return null;
    return {
      ...row,
      state_data: typeof row.state_data === "string" ? JSON.parse(row.state_data) : row.state_data || {},
      created_at: new Date(row.created_at).getTime() / 1000,
    };
  }
}

export default Checkpoint;
