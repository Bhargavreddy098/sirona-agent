import { query, transaction } from "../config/db.js";

/* =====================================================================
   TurnLease Model — PostgreSQL Concurrency & Lease Registry
   Enforces single-writer execution per session with monotonic generations.
   ===================================================================== */

export class TurnLease {
  static async acquire(sessionId, holder = "agent-runtime", ttlSeconds = 1800) {
    return await transaction(async (client) => {
      // 1. Lock and check existing lease
      const checkRes = await client.query(
        "SELECT * FROM session_turn_leases WHERE session_id = $1 FOR UPDATE",
        [sessionId]
      );

      const now = new Date();
      const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);
      const existing = checkRes.rows[0];

      if (existing) {
        const isExpired = new Date(existing.expires_at) < now || existing.released_at != null;
        if (!isExpired && existing.holder !== holder) {
          // Lease actively held by another process
          return {
            acquired: false,
            reason: "locked",
            holder: existing.holder,
            generation: Number(existing.generation),
            expires_at: existing.expires_at,
          };
        }

        // Renew expired, released, or same holder with strictly monotonic generation
        const newGen = Number(existing.generation) + 1;
        const updateRes = await client.query(
          `UPDATE session_turn_leases
           SET holder = $2, generation = $3, acquired_at = NOW(), expires_at = $4, released_at = NULL
           WHERE session_id = $1
           RETURNING *`,
          [sessionId, holder, newGen, expiresAt]
        );

        return {
          acquired: true,
          token: {
            session_id: sessionId,
            holder,
            generation: newGen,
            expires_at: updateRes.rows[0].expires_at,
          },
        };
      }

      // Insert fresh lease
      const insertRes = await client.query(
        `INSERT INTO session_turn_leases (session_id, holder, generation, acquired_at, expires_at)
         VALUES ($1, $2, 1, NOW(), $3)
         RETURNING *`,
        [sessionId, holder, expiresAt]
      );

      return {
        acquired: true,
        token: {
          session_id: sessionId,
          holder,
          generation: 1,
          expires_at: insertRes.rows[0].expires_at,
        },
      };
    });
  }

  static async release(sessionId, holder, generation) {
    const sql = `
      UPDATE session_turn_leases
      SET released_at = NOW(), expires_at = NOW()
      WHERE session_id = $1 AND holder = $2 AND generation = $3
      RETURNING session_id
    `;
    const res = await query(sql, [sessionId, holder, generation]);
    return res.rows.length > 0;
  }

  static async getLease(sessionId) {
    const res = await query("SELECT * FROM session_turn_leases WHERE session_id = $1", [sessionId]);
    if (!res.rows[0]) return null;
    const isExpired = new Date(res.rows[0].expires_at) < new Date() || res.rows[0].released_at != null;
    return {
      ...res.rows[0],
      is_active: !isExpired,
    };
  }

  static async cleanExpired() {
    const res = await query("DELETE FROM session_turn_leases WHERE expires_at < NOW() RETURNING session_id");
    return res.rows.length;
  }
}

export default TurnLease;
