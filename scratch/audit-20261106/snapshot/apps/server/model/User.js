import bcrypt from "bcryptjs";
import { query } from "../config/db.js";

/* =====================================================================
   User Model — PostgreSQL Data Access
   ===================================================================== */

export class User {
  static async hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  static async verifyPassword(candidatePassword, hashedPassword) {
    if (!candidatePassword || !hashedPassword) return false;
    return bcrypt.compare(candidatePassword, hashedPassword);
  }

  /** Existing legacy optional fields; no new identity semantics or schema.
   * @param {{email: string, password?: string, name: string, avatar_url?: string, role?: string, google_id?: string}} input
   */
  static async create({ email, password, name, avatar_url, role = "user", google_id = null }) {
    let passwordHash = null;
    if (password) {
      passwordHash = await this.hashPassword(password);
    }

    const sql = `
      INSERT INTO users (email, password_hash, name, avatar_url, role, google_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, email, name, avatar_url, role, token_version, created_at, updated_at
    `;
    const res = await query(sql, [email.toLowerCase().trim(), passwordHash, name, avatar_url, role, google_id]);
    return res.rows[0];
  }

  static async findByEmail(email) {
    if (!email) return null;
    const sql = "SELECT * FROM users WHERE email = $1";
    const res = await query(sql, [email.toLowerCase().trim()]);
    return res.rows[0] || null;
  }

  static async findById(id) {
    if (!id) return null;
    const sql = `
      SELECT id, email, name, avatar_url, role, token_version, google_id, created_at, updated_at
      FROM users WHERE id = $1
    `;
    const res = await query(sql, [id]);
    return res.rows[0] || null;
  }

  static async findByGoogleId(googleId) {
    if (!googleId) return null;
    const sql = "SELECT * FROM users WHERE google_id = $1";
    const res = await query(sql, [googleId]);
    return res.rows[0] || null;
  }

  static async update(id, updates = {}) {
    const fields = [];
    const values = [];
    let idx = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (["name", "avatar_url", "role"].includes(key)) {
        fields.push(`${key} = $${idx++}`);
        values.push(value);
      }
    }

    if (fields.length === 0) return this.findById(id);

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const sql = `
      UPDATE users SET ${fields.join(", ")}
      WHERE id = $${idx}
      RETURNING id, email, name, avatar_url, role, token_version, created_at, updated_at
    `;
    const res = await query(sql, values);
    return res.rows[0] || null;
  }

  static async incrementTokenVersion(id) {
    const sql = `
      UPDATE users
      SET token_version = token_version + 1, updated_at = NOW()
      WHERE id = $1
      RETURNING token_version
    `;
    const res = await query(sql, [id]);
    return res.rows[0]?.token_version;
  }
}

export default User;
