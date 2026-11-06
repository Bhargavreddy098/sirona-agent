import { query } from "../config/db.js";

/* =====================================================================
   Session Model — PostgreSQL Data Access
   ===================================================================== */

export class Session {
  static async create({
    title = "New Session",
    model = "gemini-2.5-flash",
    cwd = process.cwd(),
    project_id = null,
    user_id = null,
    system_prompt = null,
    parent_session_id = null,
    branch_point_id = null,
    reasoning_effort = "medium",
  }) {
    const sql = `
      INSERT INTO sessions (
        title, model, cwd, project_id, user_id, system_prompt,
        parent_session_id, branch_point_id, reasoning_effort
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    const res = await query(sql, [
      title,
      model,
      cwd,
      project_id,
      user_id,
      system_prompt,
      parent_session_id,
      branch_point_id,
      reasoning_effort,
    ]);
    return this._format(res.rows[0]);
  }

  /** @param {{pinned?: boolean, archived?: boolean, project_id?: string, limit?: number, offset?: number}} options */
  static async findAll({ pinned, archived, project_id, limit = 100, offset = 0 } = {}) {
    const conditions = ["deleted_at IS NULL"];
    const params = [];
    let idx = 1;

    if (pinned !== undefined) {
      conditions.push(`pinned = $${idx++}`);
      params.push(pinned ? 1 : 0);
    }
    if (archived !== undefined) {
      conditions.push(`archived = $${idx++}`);
      params.push(archived ? 1 : 0);
    }
    if (project_id) {
      conditions.push(`project_id = $${idx++}`);
      params.push(project_id);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    
    // Count total
    const countSql = `SELECT COUNT(*) AS total FROM sessions ${whereClause}`;
    const countRes = await query(countSql, params);
    const total = parseInt(countRes.rows[0]?.total || "0", 10);

    // Fetch page
    params.push(limit, offset);
    const sql = `
      SELECT * FROM sessions
      ${whereClause}
      ORDER BY pinned DESC, last_activity_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `;
    const res = await query(sql, params);
    return {
      sessions: res.rows.map(this._format),
      total,
    };
  }

  static async findById(id) {
    if (!id) return null;
    const sql = "SELECT * FROM sessions WHERE id = $1 AND deleted_at IS NULL";
    const res = await query(sql, [id]);
    return res.rows[0] ? this._format(res.rows[0]) : null;
  }

  static async update(id, updates = {}) {
    const allowed = [
      "title",
      "model",
      "cwd",
      "pinned",
      "archived",
      "reasoning_effort",
      "system_prompt",
      "last_activity_at",
      "message_count",
      "input_tokens",
      "output_tokens",
    ];

    const fields = [];
    const values = [];
    let idx = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (allowed.includes(key)) {
        fields.push(`${key} = $${idx++}`);
        values.push(value);
      }
    }

    if (fields.length === 0) return this.findById(id);

    fields.push("last_activity_at = NOW()");
    values.push(id);

    const sql = `
      UPDATE sessions SET ${fields.join(", ")}
      WHERE id = $${idx} AND deleted_at IS NULL
      RETURNING *
    `;
    const res = await query(sql, values);
    return res.rows[0] ? this._format(res.rows[0]) : null;
  }

  static async delete(id) {
    // Soft delete session
    const sql = "UPDATE sessions SET deleted_at = NOW() WHERE id = $1 RETURNING id";
    const res = await query(sql, [id]);
    return !!res.rows[0];
  }

  static async incrementMessageCount(id, inputTokens = 0, outputTokens = 0) {
    const sql = `
      UPDATE sessions
      SET message_count = message_count + 1,
          input_tokens = input_tokens + $2,
          output_tokens = output_tokens + $3,
          last_activity_at = NOW()
      WHERE id = $1
      RETURNING message_count
    `;
    const res = await query(sql, [id, inputTokens, outputTokens]);
    return res.rows[0]?.message_count;
  }

  static async getTopology() {
    const nodesRes = await query(`
      SELECT id, title, model, started_at, message_count, parent_session_id, branch_point_id
      FROM sessions
      WHERE deleted_at IS NULL
      ORDER BY started_at ASC
    `);

    const edges = [];
    for (const node of nodesRes.rows) {
      if (node.parent_session_id) {
        edges.push({
          source: node.parent_session_id,
          target: node.id,
          branch_point_id: node.branch_point_id,
        });
      }
    }

    const checkpointsRes = await query(`
      SELECT id, session_id, message_id, summary, created_at
      FROM checkpoints
      ORDER BY created_at ASC
    `);

    return {
      nodes: nodesRes.rows.map((n) => ({
        ...n,
        started_at: new Date(n.started_at).getTime() / 1000,
      })),
      edges,
      checkpoints: checkpointsRes.rows.map((c) => ({
        ...c,
        created_at: new Date(c.created_at).getTime() / 1000,
      })),
    };
  }

  static async getLineage(id) {
    const session = await this.findById(id);
    if (!session) return null;

    // Traverse ancestors
    const ancestors = [];
    let currParentId = session.parent_session_id;
    while (currParentId) {
      const parent = await this.findById(currParentId);
      if (!parent) break;
      ancestors.push(parent);
      currParentId = parent.parent_session_id;
    }

    // Direct children
    const childrenRes = await query(
      "SELECT * FROM sessions WHERE parent_session_id = $1 AND deleted_at IS NULL",
      [id]
    );
    const children = childrenRes.rows.map(this._format);

    return {
      session,
      ancestors,
      children,
    };
  }

  static _format(row) {
    if (!row) return null;
    return {
      ...row,
      started_at: new Date(row.started_at).getTime() / 1000,
      last_activity_at: row.last_activity_at ? new Date(row.last_activity_at).getTime() / 1000 : undefined,
      pinned: row.pinned ? 1 : 0,
      archived: row.archived ? 1 : 0,
    };
  }
}

export default Session;
