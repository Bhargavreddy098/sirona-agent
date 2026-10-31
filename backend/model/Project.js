import { query } from "../config/db.js";

/* =====================================================================
   Project Model — PostgreSQL Data Access
   ===================================================================== */

export class Project {
  static async create({ name, description = null, primary_path, icon = "folder", color = "#1f2328" }) {
    const sql = `
      INSERT INTO projects (name, description, primary_path, icon, color)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const res = await query(sql, [name, description, primary_path, icon, color]);
    return res.rows[0];
  }

  static async findAll(includeArchived = false) {
    const sql = includeArchived
      ? "SELECT * FROM projects ORDER BY created_at DESC"
      : "SELECT * FROM projects WHERE archived = 0 ORDER BY created_at DESC";
    const res = await query(sql);
    return res.rows;
  }

  static async findById(id) {
    if (!id) return null;
    const sql = "SELECT * FROM projects WHERE id = $1";
    const res = await query(sql, [id]);
    return res.rows[0] || null;
  }

  static async update(id, updates = {}) {
    const fields = [];
    const values = [];
    let idx = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (["name", "description", "primary_path", "icon", "color", "archived"].includes(key)) {
        fields.push(`${key} = $${idx++}`);
        values.push(value);
      }
    }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    const sql = `
      UPDATE projects SET ${fields.join(", ")}
      WHERE id = $${idx}
      RETURNING *
    `;
    const res = await query(sql, values);
    return res.rows[0] || null;
  }

  static async delete(id) {
    const sql = "DELETE FROM projects WHERE id = $1 RETURNING id";
    const res = await query(sql, [id]);
    return !!res.rows[0];
  }
}

export default Project;
