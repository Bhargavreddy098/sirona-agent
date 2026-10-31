import crypto from "node:crypto";
import { query } from "../config/db.js";
import { consumeLauncherChallenge } from "./launcherChallenge.js";

function sha256(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

/**
 * Ensures a default local owner principal and default workspace exist.
 */
export async function getOrCreateDefaultOwner() {
  const findUserSql = "SELECT * FROM users WHERE role = 'owner' LIMIT 1";
  const userRes = await query(findUserSql);
  let user = userRes.rows[0];

  if (!user) {
    const insertUserSql = `
      INSERT INTO users (email, name, role)
      VALUES ($1, $2, 'owner')
      RETURNING *
    `;
    const inserted = await query(insertUserSql, ["owner@sirona.local", "Local Developer"]);
    user = inserted.rows[0];
  }

  const findWsSql = "SELECT * FROM workspaces WHERE owner_principal_id = $1 LIMIT 1";
  const wsRes = await query(findWsSql, [user.id]);
  let workspace = wsRes.rows[0];

  if (!workspace) {
    const insertWsSql = `
      INSERT INTO workspaces (name, owner_principal_id, status)
      VALUES ($1, $2, 'active')
      RETURNING *
    `;
    const insertedWs = await query(insertWsSql, ["Primary Workspace", user.id]);
    workspace = insertedWs.rows[0];
  }

  return { user, workspace };
}

/**
 * Bootstrap an active owner session via a single-use desktop challenge.
 * @param {{ challenge: string, clientNonce: string }} input
 * @returns {Promise<{ session: { principalId: string, workspaceId: string, expiresAt: string, csrfToken: string }, rawSessionToken: string }>}
 */
export async function bootstrapSession({ challenge, clientNonce }) {
  consumeLauncherChallenge(challenge, clientNonce);
  const { user, workspace } = await getOrCreateDefaultOwner();

  const rawSessionToken = crypto.randomBytes(32).toString("hex");
  const rawCsrfToken = crypto.randomBytes(32).toString("hex");

  const tokenHash = sha256(rawSessionToken);
  const csrfHash = sha256(rawCsrfToken);

  // 8-hour lifetime
  const expiresAt = new Date(Date.now() + 8 * 3600 * 1000);

  const insertSql = `
    INSERT INTO auth_sessions (principal_id, workspace_id, token_hash, csrf_hash, expires_at)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, principal_id, workspace_id, expires_at
  `;
  await query(insertSql, [user.id, workspace.id, tokenHash, csrfHash, expiresAt]);

  return {
    session: {
      principalId: user.id,
      workspaceId: workspace.id,
      expiresAt: expiresAt.toISOString(),
      csrfToken: rawCsrfToken,
    },
    rawSessionToken,
  };
}

/**
 * Verify an incoming opaque session token against the database.
 * @param {string} rawSessionToken
 * @returns {Promise<{ sessionId: string, principalId: string, workspaceId: string, expiresAt: Date, csrfHash: string } | null>}
 */
export async function verifySession(rawSessionToken) {
  if (!rawSessionToken || typeof rawSessionToken !== "string") return null;

  const tokenHash = sha256(rawSessionToken);
  const sql = `
    SELECT id, principal_id, workspace_id, csrf_hash, expires_at, revoked_at
    FROM auth_sessions
    WHERE token_hash = $1
    LIMIT 1
  `;
  const res = await query(sql, [tokenHash]);
  const row = res.rows[0];

  if (!row) return null;
  if (row.revoked_at) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;

  return {
    sessionId: row.id,
    principalId: row.principal_id,
    workspaceId: row.workspace_id,
    expiresAt: row.expires_at,
    csrfHash: row.csrf_hash,
  };
}

/**
 * Validate a candidate CSRF token against the session hash.
 * @param {{ csrfHash: string }} session
 * @param {string} candidateCsrf
 * @returns {boolean}
 */
export function verifyCsrfToken(session, candidateCsrf) {
  if (!session?.csrfHash || !candidateCsrf || typeof candidateCsrf !== "string") return false;
  const candidateHash = sha256(candidateCsrf);
  return crypto.timingSafeEqual(Buffer.from(session.csrfHash), Buffer.from(candidateHash));
}

/**
 * Durable sign-out: revokes the active session in the database.
 * @param {string} rawSessionToken
 * @returns {Promise<boolean>}
 */
export async function revokeSession(rawSessionToken) {
  if (!rawSessionToken || typeof rawSessionToken !== "string") return false;
  const tokenHash = sha256(rawSessionToken);
  const sql = `
    UPDATE auth_sessions
    SET revoked_at = NOW()
    WHERE token_hash = $1 AND revoked_at IS NULL
  `;
  await query(sql, [tokenHash]);
  return true;
}

/**
 * List workspaces for an authenticated owner.
 * @param {string} principalId
 * @returns {Promise<Array<{ id: string, name: string, ownerPrincipalId: string, status: string }>>}
 */
export async function getWorkspaces(principalId) {
  const sql = `
    SELECT id, name, owner_principal_id, status
    FROM workspaces
    WHERE owner_principal_id = $1
    ORDER BY created_at ASC
  `;
  const res = await query(sql, [principalId]);
  return res.rows.map(r => ({
    id: r.id,
    name: r.name,
    ownerPrincipalId: r.owner_principal_id,
    status: r.status,
  }));
}

/**
 * Return system capabilities projection.
 * @returns {{ items: Array<{ name: string, state: string, reason?: string }> }}
 */
export function getCapabilities() {
  return {
    items: [
      { name: "identity", state: "available" },
      { name: "database", state: "available" },
      { name: "health", state: "available" },
      { name: "projects", state: "available" },
      { name: "conversations", state: "available" },
      { name: "artifacts", state: "available" },
      { name: "governance", state: "available" },
      { name: "approvals", state: "available" },
      { name: "leases", state: "available" },
      { name: "budgets", state: "available" },
      { name: "models", state: "available" },
      { name: "inference", state: "available" },
      { name: "tasks", state: "available" },
      { name: "effects", state: "available" },
      { name: "checkpoints", state: "available" },
      { name: "goals", state: "available" },
      { name: "intent", state: "available" },
      { name: "clarifications", state: "available" },
      { name: "research", state: "available" },
      { name: "requirements", state: "available" },
      { name: "decisions", state: "available" },
      { name: "plans", state: "available" },
      { name: "contracts", state: "available" },
      { name: "isolation", state: "available" },
      { name: "tools", state: "available" },
      { name: "verification", state: "available" },
      { name: "execution", state: "available" },
      { name: "memory", state: "available" },
      { name: "knowledge", state: "available" },
      { name: "schedules", state: "available" },
      { name: "triggers", state: "available" },
      { name: "events", state: "available" },
      { name: "activity", state: "available" },
      { name: "notifications", state: "available" },
      { name: "deployments", state: "available" },
      { name: "browser_qa", state: "available" },
      { name: "release_recovery", state: "available" },
      { name: "operational_diagnostics", state: "available" },
    ],
  };
}
