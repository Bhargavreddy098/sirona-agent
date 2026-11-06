import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const serverRootDir = path.resolve(moduleDir, '..');

let db = null;
let activeOwner = null;

export function getDbPath() {
  let target;
  if (process.env.SIRONA_DB_PATH) {
    target = path.isAbsolute(process.env.SIRONA_DB_PATH)
      ? process.env.SIRONA_DB_PATH
      : path.resolve(serverRootDir, process.env.SIRONA_DB_PATH);
  } else {
    const baseDir = process.env.APPDATA
      ? path.join(process.env.APPDATA, 'SironaNext')
      : path.join(serverRootDir, 'data');
    target = path.join(baseDir, 'sirona.db');
  }
  const dir = path.dirname(target);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return target;
}

export function initDatabase() {
  if (db) return db;
  const target = getDbPath();
  db = new DatabaseSync(target);

  // Performance and integrity pragmas
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA foreign_keys = ON;
  `);

  // Attach namespaces for ops, automation, control, knowledge, system
  const dbDir = path.dirname(target);
  for (const ns of ['ops', 'automation', 'control', 'knowledge', 'system']) {
    const nsPath = path.join(dbDir, `${ns}.db`);
    try {
      db.exec(`ATTACH DATABASE '${nsPath.replace(/'/g, "''")}' AS ${ns};`);
    } catch {
      // Already attached or in-memory
    }
  }

  // UUID expression for SQLite default values
  // UUIDv4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  const UUID_EXPR = `(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-a' || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))`;

  // Initialize Core Schemas
  db.exec(`
    -- 1. Users & Identity
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      name TEXT,
      avatar_url TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      token_version INTEGER NOT NULL DEFAULT 0,
      google_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      name TEXT NOT NULL,
      owner_principal_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS auth_sessions (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      principal_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
      token_hash TEXT UNIQUE NOT NULL,
      csrf_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL,
      revoked_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_auth_sessions_token ON auth_sessions(token_hash);

    -- 2. Projects
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      primary_path TEXT NOT NULL,
      icon TEXT DEFAULT 'folder',
      color TEXT DEFAULT '#1f2328',
      archived INTEGER NOT NULL DEFAULT 0,
      git_info TEXT DEFAULT '{}',
      index_state TEXT DEFAULT 'unindexed',
      last_scanned_at TEXT,
      detected_framework TEXT,
      detected_test_runner TEXT,
      structure_summary TEXT DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_projects_archived ON projects(archived, created_at DESC);

    -- 3. Sessions (Conversations)
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
      workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      title TEXT NOT NULL DEFAULT 'New Session',
      model TEXT NOT NULL DEFAULT 'auto',
      system_prompt TEXT,
      cwd TEXT,
      git_branch TEXT,
      parent_session_id TEXT REFERENCES sessions(id) ON DELETE SET NULL,
      branch_point_id INTEGER,
      pinned INTEGER NOT NULL DEFAULT 0,
      archived INTEGER NOT NULL DEFAULT 0,
      chat_scope TEXT NOT NULL DEFAULT 'project',
      reasoning_effort TEXT NOT NULL DEFAULT 'medium',
      message_count INTEGER NOT NULL DEFAULT 0,
      input_tokens INTEGER NOT NULL DEFAULT 0,
      output_tokens INTEGER NOT NULL DEFAULT 0,
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_activity_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(deleted_at, archived, last_activity_at DESC);
    CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions(project_id, deleted_at);

    -- 4. Messages
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT,
      tool_call_id TEXT,
      tool_name TEXT,
      tool_args TEXT,
      tool_result TEXT,
      duration_ms INTEGER,
      reasoning TEXT,
      tokens INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      compacted INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'completed',
      client_turn_id TEXT,
      search_vector TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_messages_client_turn ON messages(session_id, client_turn_id, role);

    -- 5. Turn Leases
    CREATE TABLE IF NOT EXISTS session_turn_leases (
      session_id TEXT PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
      holder TEXT NOT NULL,
      generation INTEGER NOT NULL DEFAULT 1,
      acquired_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL,
      released_at TEXT
    );

    -- 6. Checkpoints & State
    CREATE TABLE IF NOT EXISTS checkpoints (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      message_id INTEGER REFERENCES messages(id) ON DELETE SET NULL,
      summary TEXT,
      state_data TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 7. Approvals
    CREATE TABLE IF NOT EXISTS approvals (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      project_id TEXT,
      run_id TEXT,
      prompt_id TEXT,
      session_id TEXT REFERENCES sessions(id) ON DELETE CASCADE,
      tool_name TEXT,
      command TEXT,
      tool_args TEXT,
      risk_level TEXT NOT NULL DEFAULT 'medium',
      approved INTEGER,
      resolved_at TEXT,
      kind TEXT NOT NULL DEFAULT 'action',
      state TEXT NOT NULL DEFAULT 'pending',
      input_digest TEXT NOT NULL DEFAULT '',
      scope_summary TEXT,
      consequences TEXT,
      cost_ceiling_micro_usd TEXT NOT NULL DEFAULT '0',
      expires_at TEXT,
      consumed_at TEXT,
      nonce TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 8. Desktop Settings
    CREATE TABLE IF NOT EXISTS desktop_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 9. Security Audit Logs
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      resource_type TEXT,
      resource_id TEXT,
      details TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 10. Repository Content & Artifacts
    CREATE TABLE IF NOT EXISTS repository_snapshots (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      commit_hash TEXT,
      branch TEXT,
      snapshot_data TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS artifacts (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
      run_id TEXT,
      path TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'file',
      size_bytes INTEGER NOT NULL DEFAULT 0,
      hash TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS uploads (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      media_type TEXT NOT NULL DEFAULT 'application/octet-stream',
      byte_size INTEGER NOT NULL DEFAULT 0,
      digest TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      storage_path TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT
    );

    -- 11. Governance, Grants & Budgets
    CREATE TABLE IF NOT EXISTS policy_revisions (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
      version INTEGER NOT NULL DEFAULT 1,
      content TEXT NOT NULL,
      author TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS capability_grants (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      project_id TEXT NOT NULL,
      capability TEXT NOT NULL,
      resource_scope TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      revoked_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS grants (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      project_id TEXT NOT NULL,
      capability TEXT NOT NULL,
      resource_scope TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS budget_accounts (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      scope_kind TEXT NOT NULL,
      scope_id TEXT NOT NULL,
      limit_micro_usd TEXT NOT NULL DEFAULT '10000000',
      spent_micro_usd TEXT NOT NULL DEFAULT '0',
      version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS budget_reservations (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      account_id TEXT REFERENCES budget_accounts(id) ON DELETE CASCADE,
      amount_micro_usd TEXT NOT NULL DEFAULT '0',
      purpose TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      actor_id TEXT,
      target_type TEXT,
      target_id TEXT,
      payload TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 12. Provider Connections & Models
    CREATE TABLE IF NOT EXISTS provider_connections (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      name TEXT NOT NULL,
      base_url TEXT,
      api_key_ciphertext TEXT,
      credential_ref TEXT,
      credential_status TEXT NOT NULL DEFAULT 'ready',
      credential_migrated_at TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS models (
      id TEXT PRIMARY KEY,
      provider_kind TEXT NOT NULL,
      name TEXT NOT NULL,
      context_window INTEGER NOT NULL DEFAULT 128000,
      max_output_tokens INTEGER NOT NULL DEFAULT 8192,
      input_cost_micro_usd_per_m INTEGER NOT NULL DEFAULT 250000,
      output_cost_micro_usd_per_m INTEGER NOT NULL DEFAULT 1000000,
      is_available INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      provider_connection_id TEXT REFERENCES provider_connections(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS model_settings (
      id TEXT PRIMARY KEY,
      primary_model TEXT NOT NULL DEFAULT 'auto',
      fallback_model TEXT,
      fast_model TEXT NOT NULL DEFAULT 'auto',
      reasoning_model TEXT NOT NULL DEFAULT 'auto',
      embedding_model TEXT NOT NULL DEFAULT 'auto',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS model_calls (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      session_id TEXT REFERENCES sessions(id) ON DELETE CASCADE,
      project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
      model_id TEXT NOT NULL,
      provider_kind TEXT NOT NULL,
      prompt_tokens INTEGER NOT NULL DEFAULT 0,
      completion_tokens INTEGER NOT NULL DEFAULT 0,
      total_tokens INTEGER NOT NULL DEFAULT 0,
      cost_micro_usd INTEGER NOT NULL DEFAULT 0,
      budget_reservation_id TEXT,
      status TEXT NOT NULL DEFAULT 'success',
      duration_ms INTEGER NOT NULL DEFAULT 0,
      error_message TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 13. Execution Goals & Runs
    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      intent TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'created',
      autonomy_mode TEXT NOT NULL DEFAULT 'balanced',
      active_contract_revision_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS intent_analyses (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      goal_id TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
      analysis TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS clarifications (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      goal_id TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
      question TEXT NOT NULL,
      answer TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS research_reports (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      goal_id TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
      report TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS requirement_revisions (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      goal_id TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
      version INTEGER NOT NULL DEFAULT 1,
      requirements TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS decisions (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      goal_id TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
      decision TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS plans (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      goal_id TEXT REFERENCES goals(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS plan_revisions (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
      version INTEGER NOT NULL DEFAULT 1,
      content TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS contracts (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      goal_id TEXT REFERENCES goals(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS contract_revisions (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      contract_id TEXT NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
      version INTEGER NOT NULL DEFAULT 1,
      content TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS runs (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      goal_id TEXT REFERENCES goals(id) ON DELETE SET NULL,
      contract_revision_id TEXT,
      plan_revision_id TEXT,
      repository_snapshot_id TEXT,
      state TEXT NOT NULL DEFAULT 'pending',
      autonomy_mode TEXT NOT NULL DEFAULT 'balanced',
      epoch TEXT NOT NULL DEFAULT '1',
      budget_limit TEXT NOT NULL DEFAULT '10000000',
      budget_reserved TEXT NOT NULL DEFAULT '0',
      budget_spent TEXT NOT NULL DEFAULT '0',
      current_sequence TEXT NOT NULL DEFAULT '0',
      event_sequence INTEGER NOT NULL DEFAULT 0,
      verification_report_id TEXT,
      waiting_state TEXT,
      execution_summary TEXT DEFAULT '{}',
      progress_total_tasks INTEGER NOT NULL DEFAULT 0,
      progress_completed_tasks INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
      step_key TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'pending',
      attempt INTEGER NOT NULL DEFAULT 1,
      max_attempts INTEGER NOT NULL DEFAULT 3,
      lease_epoch TEXT NOT NULL DEFAULT '1',
      lease_expires_at TEXT,
      dependencies TEXT NOT NULL DEFAULT '[]',
      error_message TEXT,
      diff TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS agent_sessions (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
      agent_role TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'idle',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS effects (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
      operation_key TEXT,
      effect_type TEXT NOT NULL,
      payload TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS run_checkpoints (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
      state_snapshot TEXT,
      sequence INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS run_events (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
      sequence INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      payload TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reconciliation_operations (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'pending',
      details TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 14. Isolation & Tool Runtime
    CREATE TABLE IF NOT EXISTS isolation_profiles (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      name TEXT NOT NULL,
      config TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS isolation_workers (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      profile_id TEXT REFERENCES isolation_profiles(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'idle',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS isolation_qualifications (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      profile_id TEXT REFERENCES isolation_profiles(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'unqualified',
      details TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tools (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      name TEXT NOT NULL,
      description TEXT,
      schema_definition TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tool_revisions (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      tool_id TEXT REFERENCES tools(id) ON DELETE CASCADE,
      version INTEGER NOT NULL DEFAULT 1,
      schema_definition TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS developer_connections (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      config TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tool_invocations (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      run_id TEXT REFERENCES runs(id) ON DELETE CASCADE,
      tool_id TEXT REFERENCES tools(id) ON DELETE SET NULL,
      input_payload TEXT,
      output_payload TEXT,
      status TEXT NOT NULL DEFAULT 'completed',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tool_receipts (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      invocation_id TEXT REFERENCES tool_invocations(id) ON DELETE CASCADE,
      receipt_hash TEXT NOT NULL,
      signature TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 15. Verification
    CREATE TABLE IF NOT EXISTS verification_jobs (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      run_id TEXT REFERENCES runs(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS verification_results (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      job_id TEXT REFERENCES verification_jobs(id) ON DELETE CASCADE,
      details TEXT,
      passed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS verification_reports (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      run_id TEXT REFERENCES runs(id) ON DELETE CASCADE,
      summary TEXT,
      passed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS verification_evaluations (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      report_id TEXT REFERENCES verification_reports(id) ON DELETE CASCADE,
      evaluator TEXT NOT NULL,
      score REAL NOT NULL DEFAULT 0.0,
      details TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 16. Ops Schema Tables
    CREATE TABLE IF NOT EXISTS ops.deployments (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      run_id TEXT,
      name TEXT,
      target TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ops.deployment_previews (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      run_id TEXT,
      artifact_id TEXT,
      target_ref TEXT,
      status TEXT NOT NULL DEFAULT 'ready',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ops.browser_qa_sessions (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      deployment_id TEXT,
      status TEXT NOT NULL DEFAULT 'completed',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS knowledge.context_bundles (
      id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
      project_id TEXT NOT NULL,
      run_id TEXT,
      task_id TEXT,
      digest TEXT NOT NULL,
      source_revision_refs TEXT NOT NULL DEFAULT '[]',
      token_estimate INTEGER NOT NULL DEFAULT 0,
      classification TEXT NOT NULL DEFAULT 'internal',
      bundle_data TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Safe schema evolutions for existing databases
  try { db.exec('ALTER TABLE projects ADD COLUMN workspace_id TEXT REFERENCES workspaces(id);'); } catch {}
  try { db.exec('ALTER TABLE sessions ADD COLUMN workspace_id TEXT REFERENCES workspaces(id);'); } catch {}
  try { db.exec('ALTER TABLE sessions ADD COLUMN chat_scope TEXT NOT NULL DEFAULT "project";'); } catch {}
  try { db.exec('ALTER TABLE messages ADD COLUMN client_turn_id TEXT;'); } catch {}
  try { db.exec('ALTER TABLE messages ADD COLUMN status TEXT DEFAULT "completed";'); } catch {}
  try {
    const upCols = db.prepare("PRAGMA table_info(uploads)").all();
    const mediaTypeCol = upCols.find(c => c.name === 'media_type');
    if (!mediaTypeCol) {
      db.exec("PRAGMA foreign_keys = OFF;");
      db.exec(`
        CREATE TABLE uploads_rebuild (
          id TEXT PRIMARY KEY DEFAULT ${UUID_EXPR},
          project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
          filename TEXT NOT NULL,
          media_type TEXT NOT NULL DEFAULT 'application/octet-stream',
          byte_size INTEGER NOT NULL DEFAULT 0,
          digest TEXT,
          status TEXT NOT NULL DEFAULT 'pending',
          storage_path TEXT DEFAULT '',
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          completed_at TEXT
        );
      `);
      try {
        db.exec(`
          INSERT INTO uploads_rebuild (id, project_id, filename, media_type, byte_size, storage_path, created_at)
          SELECT id, project_id, filename, COALESCE(mime_type, 'application/octet-stream'), COALESCE(size_bytes, 0), COALESCE(storage_path, ''), created_at
          FROM uploads;
        `);
      } catch {}
      db.exec("DROP TABLE uploads;");
      db.exec("ALTER TABLE uploads_rebuild RENAME TO uploads;");
      db.exec("CREATE INDEX IF NOT EXISTS idx_uploads_project ON uploads(project_id, created_at DESC);");
      db.exec("PRAGMA foreign_keys = ON;");
    }
  } catch {}

  // Register session_valid function for compatibility
  try {
    db.function('session_valid', (sessionId) => {
      if (!sessionId) return 0;
      const row = db.prepare("SELECT expires_at, revoked_at FROM auth_sessions WHERE id = ?").get(String(sessionId));
      if (!row || row.revoked_at) return 0;
      const expires = String(row.expires_at).includes("T")
        ? (String(row.expires_at).endsWith("Z") ? row.expires_at : `${row.expires_at}Z`)
        : `${String(row.expires_at).replace(" ", "T")}Z`;
      return (new Date(expires).getTime() > Date.now()) ? 1 : 0;
    });
  } catch {}

  // Seed baseline models
  const seedModels = [
    ['auto', 'openai_compatible', 'Auto', 128000, 8192, 0, 0],
    ['gemini-3.5-flash-lite', 'google', 'Gemini 3.5 Flash Lite', 1048576, 8192, 75000, 300000],
    ['gemini-3.5-flash', 'google', 'Gemini 3.5 Flash', 1048576, 8192, 100000, 400000],
    ['gemini-3.1-pro-preview', 'google', 'Gemini 3.1 Pro', 2097152, 8192, 1250000, 5000000],
    ['gemini-2.5-flash', 'google', 'Gemini 2.5 Flash', 1048576, 8192, 100000, 400000],
    ['gemini-1.5-pro', 'google', 'Gemini 1.5 Pro', 2097152, 8192, 1250000, 5000000],
    ['gemini-flash-lite-latest', 'google', 'Gemini Flash Lite', 1048576, 8192, 75000, 300000],
    ['gpt-4o', 'openai', 'GPT-4o', 128000, 4096, 2500000, 10000000],
    ['gpt-4o-mini', 'openai', 'GPT-4o Mini', 128000, 16384, 150000, 600000],
    ['claude-3-7-sonnet-20250219', 'anthropic', 'Claude 3.7 Sonnet', 200000, 8192, 3000000, 15000000],
    ['claude-3-5-sonnet-20241022', 'anthropic', 'Claude 3.5 Sonnet', 200000, 8192, 3000000, 15000000],
  ];

  const insertModel = db.prepare(`
    INSERT OR IGNORE INTO models (id, provider_kind, name, context_window, max_output_tokens, input_cost_micro_usd_per_m, output_cost_micro_usd_per_m, is_available)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `);

  for (const m of seedModels) {
    insertModel.run(...m);
  }

  // Ensure modern verified models exist and legacy discontinued models are marked unavailable
  try {
    db.prepare("UPDATE models SET is_available = 0 WHERE id = 'gemini-1.5-pro'").run();
  } catch {}

  // Seed initial model settings if absent
  db.prepare(`
    INSERT OR IGNORE INTO model_settings (id, primary_model, fast_model, reasoning_model, embedding_model)
    VALUES ('global', 'auto', 'auto', 'auto', 'auto')
  `).run();

  // Seed default desktop settings
  db.prepare(`
    INSERT OR IGNORE INTO desktop_settings (key, value, updated_at)
    VALUES ('default_model', '"gemini-2.5-flash"', datetime('now'))
  `).run();

  // Seed default user and workspace for instant offline availability
  db.prepare(`
    INSERT OR IGNORE INTO users (id, email, name, role)
    VALUES ('usr_owner_default', 'owner@sirona.local', 'Local Developer', 'owner')
  `).run();

  db.prepare(`
    INSERT OR IGNORE INTO workspaces (id, name, owner_principal_id, status)
    VALUES ('ws_primary_default', 'Primary Workspace', 'usr_owner_default', 'active')
  `).run();

  return db;
}

/**
 * Translates PostgreSQL-specific syntax into SQLite equivalents.
 */
export function translateSql(sql) {
  if (typeof sql === "object" && sql !== null) {
    sql = sql.text || sql.sql || String(sql);
  }
  let s = typeof sql === "string" ? sql : String(sql || "");
  // Handle PostgreSQL JSONB ? existence operator before parameter translation
  s = s.replace(/(\b[a-zA-Z0-9_.]+\b)\s*\?\s*'([^']+)'/g, "json_extract($1, '$.$2') IS NOT NULL");
  // Handle PostgreSQL = ANY($N::type[]) before parameter translation
  s = s.replace(/([a-zA-Z0-9_.]+)\s*=\s*ANY\s*\(\s*\$(\d+)(?:::[\w\[\]]+)?\s*\)/gi, "$1 IN (SELECT value FROM json_each(\$$2))");
  s = s.replace(/([a-zA-Z0-9_.]+)\s*=\s*ANY\s*\(\s*\?(\d+)(?:::[\w\[\]]+)?\s*\)/gi, "$1 IN (SELECT value FROM json_each(?$2))");
  // Convert Postgres positional parameter notation ($1, $2, ...) to SQLite numbered params (?1, ?2, ...)
  s = s.replace(/\$(\d+)/g, '?$1');
  // Handle UPDATE table alias syntax (PostgreSQL UPDATE tablename alias SET -> SQLite UPDATE tablename AS alias SET)
  s = s.replace(/\bUPDATE\s+([a-zA-Z0-9_]+)\s+(?!SET\b)([a-zA-Z0-9_]+)\s+SET\b/gi, (m, p1, p2) => 'UPDATE ' + p1 + ' AS ' + p2 + ' SET');
  // Strip PostgreSQL advisory/table locks and session settings
  s = s.replace(/\bLOCK TABLE\b[^;]+;/gi, '');
  s = s.replace(/\bSET LOCAL\b[^;]+;/gi, '');
  // Custom functions
  s = s.replace(/control\.session_valid\(/gi, "session_valid(");
  // Date and Time functions
  s = s.replace(/NOW\(\)\s*\+\s*\(\s*\?(\d+)\s*\*\s*INTERVAL\s*'1 second'\s*\)/gi, "strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '+' || ?$1 || ' seconds')");
  s = s.replace(/NOW\(\)\s*\+\s*INTERVAL\s*'([^']+)'/gi, "strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '+$1')");
  s = s.replace(/datetime\('now'\)\s*\+\s*INTERVAL\s*'([^']+)'/gi, "strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '+$1')");
  s = s.replace(/\bNOW\(\)/gi, "strftime('%Y-%m-%dT%H:%M:%SZ', 'now')");
  s = s.replace(/\bCURRENT_TIMESTAMP\b/gi, "strftime('%Y-%m-%dT%H:%M:%SZ', 'now')");
  // Handle PostgreSQL INSERT ... VALUES (..., default, ...)
  s = s.replace(/\bINSERT\s+INTO\s+([^\s(]+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/gi, (match, table, colsStr, valsStr) => {
    const cols = colsStr.split(',').map(c => c.trim().replace(/^["`]|["`]$/g, ''));
    const vals = valsStr.split(',').map(v => v.trim());
    if (cols.length === vals.length && vals.some(v => v.toLowerCase() === 'default')) {
      const newVals = vals.map((v, i) => {
        if (v.toLowerCase() === 'default') {
          const col = cols[i].toLowerCase();
          if (col === 'id') {
            return "(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-a' || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))";
          }
          if (col === 'created_at' || col === 'updated_at' || col === 'started_at' || col === 'completed_at') {
            return "strftime('%Y-%m-%dT%H:%M:%SZ', 'now')";
          }
          return "NULL";
        }
        return v;
      });
      return `INSERT INTO ${table} (${colsStr}) VALUES (${newVals.join(', ')})`;
    }
    return match;
  });
  // Identity and UUID functions
  s = s.replace(/\bgen_random_uuid\(\)/gi, "(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-a' || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))");
  // Comparison operators
  s = s.replace(/\bIS NOT DISTINCT FROM\b/gi, 'IS');
  s = s.replace(/\bIS DISTINCT FROM\b/gi, 'IS NOT');
  s = s.replace(/\bILIKE\b/gi, 'LIKE');
  // Scalar math
  s = s.replace(/\bGREATEST\(/gi, 'MAX(');
  s = s.replace(/\bLEAST\(/gi, 'MIN(');
  s = s.replace(/\bEXTRACT\s*\(\s*EPOCH\s+FROM\s+([^)]+)\)/gi, "(strftime('%s', $1))");
  // Type casts (e.g. ::text, ::jsonb, ::uuid, ::text[], ::uuid[])
  s = s.replace(/::[a-zA-Z_]+(?:\[\])?/g, '');
  // Text search functions
  s = s.replace(/to_tsvector\([^)]+\)/gi, "''");
  s = s.replace(/ts_headline\([^)]+\)/gi, "content");
  s = s.replace(/search_vector\s*@@\s*plainto_tsquery\([^)]+\)/gi, "(content LIKE '%' || ?1 || '%')");
  // Row locking constructs (SQLite operates single-writer at db level)
  s = s.replace(/\bFOR\s+(?:UPDATE|SHARE|NO\s+KEY\s+UPDATE|KEY\s+SHARE)(?:\s+OF\s+[a-zA-Z0-9_,\s]+)?(?:\s+SKIP\s+LOCKED|\s+NOWAIT)?/gi, '');
  return s;
}

/**
 * Normalizes query parameters for SQLite:
 * converts booleans to 1/0, Dates to ISO strings, objects to JSON strings.
 */
function normalizeParams(params) {
  if (!Array.isArray(params)) return [];
  return params.map(p => {
    if (p === undefined) return null;
    if (typeof p === 'boolean') return p ? 1 : 0;
    if (p instanceof Date) return p.toISOString();
    if (typeof p === 'object' && p !== null && !Buffer.isBuffer(p)) {
      return JSON.stringify(p);
    }
    return p;
  });
}

/**
 * Core query function matching PostgreSQL pg.Pool query signature.
 * Returns { rows: [...], rowCount: number }
 */
export async function query(text, params = []) {
  let queryText = text;
  if (typeof text === "object" && text !== null) {
    params = text.values || text.params || params;
    queryText = text.text || text.sql || String(text);
  }
  const database = initDatabase();
  const translated = translateSql(queryText);
  const normalized = normalizeParams(params);

  try {
    const trimmed = translated.trim();
    if (!trimmed) {
      return { rows: [], rowCount: 0 };
    }

    if (/^BEGIN\b/i.test(trimmed)) {
      try { database.exec('BEGIN IMMEDIATE'); } catch {}
      return { rows: [], rowCount: 0 };
    }
    if (/^COMMIT\b/i.test(trimmed)) {
      try { database.exec('COMMIT'); } catch {}
      return { rows: [], rowCount: 0 };
    }
    if (/^ROLLBACK\b/i.test(trimmed)) {
      try { database.exec('ROLLBACK'); } catch {}
      return { rows: [], rowCount: 0 };
    }

    const isSelect = /^SELECT\b/i.test(trimmed);
    const hasReturning = /\bRETURNING\b/i.test(trimmed);

    if (isSelect || hasReturning) {
      const stmt = database.prepare(translated);
      const rows = stmt.all(...normalized);
      if (typeof queryText === "string" && /\bcontrol\.session_valid\b/i.test(queryText)) {
        for (const row of rows) {
          if ("valid" in row) {
            row.valid = Boolean(row.valid);
          }
        }
      }
      return { rows, rowCount: rows.length };
    }

    const stmt = database.prepare(translated);
    const info = stmt.run(...normalized);
    return { rows: [], rowCount: info.changes };
  } catch (err) {
    // Standardize unique constraint errors to PostgreSQL code 23505
    if (err.message?.includes('UNIQUE constraint failed')) {
      err.code = '23505';
    }
    throw err;
  }
}

/**
 * Returns a dedicated client interface for transaction blocks.
 */
export function getClient() {
  const database = initDatabase();
  return {
    async query(text, params = []) {
      return query(text, params);
    },
    release() {}
  };
}

/**
 * Executes operations within an SQLite transaction.
 */
export async function transaction(callback) {
  const client = getClient();
  const database = initDatabase();
  try {
    database.exec('BEGIN IMMEDIATE');
  } catch {}
  try {
    const result = await callback(client);
    try {
      database.exec('COMMIT');
    } catch {}
    return result;
  } catch (err) {
    try { database.exec('ROLLBACK'); } catch {}
    throw err;
  }
}

/**
 * Database lifecycle owner matching the factory in production.js.
 */
export function createDatabaseOwner(config, logger, CustomPool) {
  if (CustomPool) {
    const ownedPool = new CustomPool(config);
    let stopped = false;
    let closing;
    ownedPool.on?.("error", () => logger?.event?.("dependency.error", { category: "database", code: "RESOURCE_FAILED" }));
    const owner = {
      pool: ownedPool,
      async ready() {
        if (stopped) return false;
        try { const result = await ownedPool.query("SELECT 1 AS alive"); return !stopped && result.rows[0]?.alive === 1; }
        catch { return false; }
      },
      async initialize() {
        if (!await owner.ready()) throw Object.assign(new Error("Required dependency is unavailable"), { code: "DEPENDENCY_UNREADY" });
      },
      close() {
        if (!closing) {
          stopped = true;
          closing = Promise.resolve().then(() => ownedPool.end?.()).finally(() => {
            if (activeOwner === owner) { activeOwner = undefined; }
          });
        }
        return closing;
      },
    };
    return owner;
  }

  const poolMock = {
    query,
    connect: getClient,
    on(event, handler) {}
  };

  return {
    pool: poolMock,
    async ready() {
      try {
        const res = await query('SELECT 1 AS alive');
        return res.rows[0]?.alive === 1;
      } catch {
        return false;
      }
    },
    async initialize() {
      initDatabase();
    },
    async close() {
      // In-process SQLite requires no external teardown
    }
  };
}

export function activateDatabaseOwner(owner) {
  activeOwner = owner;
}

export function checkPostgresConnection() {
  return Promise.resolve(true);
}

export function closePool() {
  return Promise.resolve();
}

export const pool = {
  query,
  connect: getClient,
  on(event, handler) {}
};

export default { query, getClient, transaction, pool };
