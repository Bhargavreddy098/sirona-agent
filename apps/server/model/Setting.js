import { query, transaction } from "../config/db.js";

/* =====================================================================
   Setting Model — Key-Value Desktop Settings Store
   ===================================================================== */

export class Setting {
  static async getAll() {
    const res = await query("SELECT key, value FROM desktop_settings");
    const result = {};
    for (const row of res.rows) {
      try {
        result[row.key] = JSON.parse(row.value);
      } catch {
        result[row.key] = row.value;
      }
    }
    return result;
  }

  static async get(key) {
    const res = await query("SELECT value FROM desktop_settings WHERE key = $1", [key]);
    if (!res.rows[0]) return null;
    try {
      return JSON.parse(res.rows[0].value);
    } catch {
      return res.rows[0].value;
    }
  }

  static async set(key, value) {
    const serialized = typeof value === "string" ? value : JSON.stringify(value);
    const sql = `
      INSERT INTO desktop_settings (key, value, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (key) DO UPDATE
      SET value = EXCLUDED.value, updated_at = NOW()
      RETURNING key, value
    `;
    const res = await query(sql, [key, serialized]);
    return res.rows[0];
  }

  static async setMultiple(settingsMap = {}) {
    return await transaction(async (client) => {
      const savedKeys = [];
      for (const [key, val] of Object.entries(settingsMap)) {
        const serialized = typeof val === "string" ? val : JSON.stringify(val);
        await client.query(
          `INSERT INTO desktop_settings (key, value, updated_at)
           VALUES ($1, $2, NOW())
           ON CONFLICT (key) DO UPDATE
           SET value = EXCLUDED.value, updated_at = NOW()`,
          [key, serialized]
        );
        savedKeys.push(key);
      }
      return savedKeys;
    });
  }

  static async delete(key) {
    const res = await query("DELETE FROM desktop_settings WHERE key = $1 RETURNING key", [key]);
    return !!res.rows[0];
  }
}

export default Setting;
