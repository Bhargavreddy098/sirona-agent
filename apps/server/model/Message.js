import { query } from "../config/db.js";

/* =====================================================================
   Message Model — PostgreSQL Data Access & Full-Text Search
   ===================================================================== */

export class Message {
  static async create({
    session_id,
    role,
    content = null,
    tool_call_id = null,
    tool_name = null,
    tool_args = null,
    tool_result = null,
    duration_ms = null,
    reasoning = null,
    tokens = 0,
    active = 1,
    compacted = 0,
  }) {
    const sql = `
      INSERT INTO messages (
        session_id, role, content, tool_call_id, tool_name,
        tool_args, tool_result, duration_ms, reasoning, tokens, active, compacted
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;
    const res = await query(sql, [
      session_id,
      role,
      content,
      tool_call_id,
      tool_name,
      tool_args ? JSON.stringify(tool_args) : null,
      tool_result ? JSON.stringify(tool_result) : null,
      duration_ms,
      reasoning,
      tokens,
      active,
      compacted,
    ]);
    return this._format(res.rows[0]);
  }

  static async findBySession(sessionId, { activeOnly = true, limit = 500, offset = 0 } = {}) {
    const conditions = ["session_id = $1"];
    const params = [sessionId];
    let idx = 2;

    if (activeOnly) {
      conditions.push(`active = 1`);
    }

    const countSql = `SELECT COUNT(*) AS total FROM messages WHERE ${conditions.join(" AND ")}`;
    const countRes = await query(countSql, params);
    const total = parseInt(countRes.rows[0]?.total || "0", 10);

    params.push(limit, offset);
    const sql = `
      SELECT * FROM messages
      WHERE ${conditions.join(" AND ")}
      ORDER BY id ASC
      LIMIT $${idx++} OFFSET $${idx++}
    `;
    const res = await query(sql, params);
    return {
      messages: res.rows.map(this._format),
      total,
    };
  }

  static async findById(id) {
    if (!id) return null;
    const sql = "SELECT * FROM messages WHERE id = $1";
    const res = await query(sql, [id]);
    return res.rows[0] ? this._format(res.rows[0]) : null;
  }

  static async search(queryString, sessionId = null, limit = 50) {
    if (!queryString || !queryString.trim()) return { results: [], total: 0 };

    const cleanQuery = queryString.trim();
    const params = [cleanQuery];
    let sessionFilter = "";

    if (sessionId) {
      params.push(sessionId);
      sessionFilter = "AND session_id = $2";
    }

    params.push(limit);
    const limitIdx = params.length;

    const sql = `
      SELECT id AS message_id, session_id, role, content,
             ts_headline('english', content, plainto_tsquery('english', $1), 'StartSel=<b>, StopSel=</b>, MaxWords=35, MinWords=15') AS snippet
      FROM messages
      WHERE search_vector @@ plainto_tsquery('english', $1) ${sessionFilter}
      ORDER BY ts_rank(search_vector, plainto_tsquery('english', $1)) DESC
      LIMIT $${limitIdx}
    `;

    const res = await query(sql, params);
    return {
      results: res.rows,
      total: res.rows.length,
    };
  }

  static async rewindTo(sessionId, toMessageId) {
    const sql = `
      UPDATE messages
      SET active = 0
      WHERE session_id = $1 AND id > $2
      RETURNING id
    `;
    const res = await query(sql, [sessionId, toMessageId]);
    return {
      session_id: sessionId,
      rewound_to: toMessageId,
      deactivated_count: res.rows.length,
    };
  }

  static async copyMessagesThrough(sourceSessionId, targetSessionId, throughMessageId = null) {
    const conditions = ["session_id = $1", "active = 1"];
    const params = [sourceSessionId, targetSessionId];

    if (throughMessageId) {
      conditions.push(`id <= $3`);
      params.push(throughMessageId);
    }

    const sql = `
      INSERT INTO messages (
        session_id, role, content, tool_call_id, tool_name,
        tool_args, tool_result, duration_ms, reasoning, tokens, active, compacted
      )
      SELECT $2, role, content, tool_call_id, tool_name,
             tool_args, tool_result, duration_ms, reasoning, tokens, active, compacted
      FROM messages
      WHERE ${conditions.join(" AND ")}
      ORDER BY id ASC
      RETURNING id
    `;

    const res = await query(sql, params);
    return res.rows.length;
  }

  static _format(row) {
    if (!row) return null;
    return {
      id: Number(row.id),
      session_id: row.session_id,
      role: row.role,
      content: row.content || "",
      tool_call_id: row.tool_call_id || undefined,
      tool_name: row.tool_name || undefined,
      tool_args: typeof row.tool_args === "string" ? JSON.parse(row.tool_args) : row.tool_args || undefined,
      tool_result: typeof row.tool_result === "string" ? JSON.parse(row.tool_result) : row.tool_result || undefined,
      duration_ms: row.duration_ms ? Number(row.duration_ms) : undefined,
      timestamp: new Date(row.created_at).getTime() / 1000,
      status: row.status || "completed",
      clientTurnId: row.client_turn_id || undefined,
      reasoning: row.reasoning || undefined,
      compacted: row.compacted || 0,
      tokens: row.tokens || 0,
    };
  }
}

export default Message;
