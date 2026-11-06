import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { DatabaseSync } from 'node:sqlite';

import {
  parseResourceScope,
  normalizePath,
  requireToolGrants,
  ExecutionBoundaryError
} from '../dist-workspace/src/security/executionPolicy.js';
import {
  HOME_PROFILE,
  requireRoot
} from '../dist-workspace/src/workspace/homeProfile.js';
import { translateSql } from '../config/sqliteDb.js';

describe('Capability Grants & Resource Scope Deserialization (SQLite / Postgres Compatibility)', () => {
  let tempDir;
  let db;

  // Mock transaction client using Sirona's canonical translateSql
  function createMockClient(sqliteDb) {
    return {
      async query(sql, params = []) {
        let translated = translateSql(sql);
        // Normalize params: convert objects/arrays to JSON strings
        const normalized = params.map(p => {
          if (typeof p === 'object' && p !== null && !Buffer.isBuffer(p)) {
            return JSON.stringify(p);
          }
          return p;
        });

        const stmt = sqliteDb.prepare(translated);
        if (translated.trim().toUpperCase().startsWith('SELECT')) {
          return { rows: stmt.all(...normalized) };
        }
        const info = stmt.run(...normalized);
        return { rows: [], rowCount: info.changes };
      }
    };
  }

  before(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sirona-cg-test-'));
    db = new DatabaseSync(':memory:');

    // Create required tables
    db.exec(`
      CREATE TABLE projects (
        id TEXT PRIMARY KEY,
        primary_path TEXT NOT NULL
      );
      CREATE TABLE capability_grants (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        capability TEXT NOT NULL,
        resource_scope TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        revoked_at TEXT,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
      );
    `);
  });

  after(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  // -----------------------------------------------------------------
  // 1. Reusable Deserializer Tests
  // -----------------------------------------------------------------
  describe('parseResourceScope unit tests', () => {
    test('1. Valid SQLite JSON string grant parses correctly', () => {
      const jsonStr = JSON.stringify({
        workspaceRoot: 'C:\\Users\\Developer\\Project',
        profile: 'docker_trusted_local_v1',
        registrationKey: 'hash123'
      });
      const scope = parseResourceScope(jsonStr);
      assert.equal(scope.workspaceRoot, 'C:\\Users\\Developer\\Project');
      assert.equal(scope.profile, 'docker_trusted_local_v1');
      assert.equal(scope.registrationKey, 'hash123');
    });

    test('2. Valid object grant (Postgres JSONB) passes through cleanly', () => {
      const obj = {
        workspaceRoot: '/home/developer/project',
        profile: 'docker_trusted_local_v1'
      };
      const scope = parseResourceScope(obj);
      assert.equal(scope.workspaceRoot, '/home/developer/project');
      assert.equal(scope.profile, 'docker_trusted_local_v1');
    });

    test('3. Invalid JSON string throws INVALID_GRANT_SCOPE (403)', () => {
      assert.throws(
        () => parseResourceScope('{ "broken json: true '),
        (err) => err instanceof ExecutionBoundaryError && err.code === 'INVALID_GRANT_SCOPE' && err.status === 403
      );
    });

    test('4. Non-object JSON (array, primitive) throws INVALID_GRANT_SCOPE (403)', () => {
      assert.throws(
        () => parseResourceScope('[1, 2, 3]'),
        (err) => err instanceof ExecutionBoundaryError && err.code === 'INVALID_GRANT_SCOPE'
      );
      assert.throws(
        () => parseResourceScope('"just-a-string"'),
        (err) => err instanceof ExecutionBoundaryError && err.code === 'INVALID_GRANT_SCOPE'
      );
      assert.throws(
        () => parseResourceScope(12345),
        (err) => err instanceof ExecutionBoundaryError && err.code === 'INVALID_GRANT_SCOPE'
      );
    });

    test('5. Null or undefined returns empty object safely', () => {
      assert.deepEqual(parseResourceScope(null), {});
      assert.deepEqual(parseResourceScope(undefined), {});
      assert.deepEqual(parseResourceScope(''), {});
    });
  });

  // -----------------------------------------------------------------
  // 2. Windows Path Normalization Tests
  // -----------------------------------------------------------------
  describe('normalizePath tests', () => {
    test('10. Windows canonical path handling normalizes casing and separators', () => {
      if (process.platform === 'win32') {
        const path1 = 'C:\\Users\\Developer\\Project';
        const path2 = 'c:/users/developer/project';
        assert.equal(normalizePath(path1), normalizePath(path2));
      } else {
        const path1 = '/home/developer/project';
        assert.equal(normalizePath(path1), path.resolve(path1));
      }
    });
  });

  // -----------------------------------------------------------------
  // 3. Security Boundary & Governance Integration Tests
  // -----------------------------------------------------------------
  describe('requireRoot & requireToolGrants with SQLite storage', () => {
    const projectId = crypto.randomUUID();
    let client;

    before(() => {
      client = createMockClient(db);
      // Register project
      db.prepare('INSERT INTO projects (id, primary_path) VALUES (?, ?)').run(projectId, tempDir);
    });

    test('Valid SQLite JSON string grant enables requireRoot and requireToolGrants', async () => {
      const grantId = crypto.randomUUID();
      const scopeJson = JSON.stringify({
        workspaceRoot: tempDir,
        profile: HOME_PROFILE
      });

      db.prepare(`
        INSERT INTO capability_grants (id, project_id, capability, resource_scope, expires_at)
        VALUES (?, ?, 'workspace_root', ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '+1 hour'))
      `).run(grantId, projectId, scopeJson);

      // Must succeed without throwing
      await requireRoot(client, projectId, grantId, tempDir);
    });

    test('Missing workspaceRoot in grant throws WORKSPACE_ROOT_MISMATCH (403)', async () => {
      const grantId = crypto.randomUUID();
      const scopeJson = JSON.stringify({
        profile: HOME_PROFILE
        // missing workspaceRoot
      });

      db.prepare(`
        INSERT INTO capability_grants (id, project_id, capability, resource_scope, expires_at)
        VALUES (?, ?, 'workspace_root', ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '+1 hour'))
      `).run(grantId, projectId, scopeJson);

      await assert.rejects(
        () => requireRoot(client, projectId, grantId, tempDir),
        (err) => err instanceof ExecutionBoundaryError && err.code === 'WORKSPACE_ROOT_MISMATCH' && err.status === 403
      );
    });

    test('Wrong workspaceRoot in grant throws WORKSPACE_ROOT_MISMATCH (403)', async () => {
      const grantId = crypto.randomUUID();
      const scopeJson = JSON.stringify({
        workspaceRoot: path.join(tempDir, 'subfolder'),
        profile: HOME_PROFILE
      });

      db.prepare(`
        INSERT INTO capability_grants (id, project_id, capability, resource_scope, expires_at)
        VALUES (?, ?, 'workspace_root', ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '+1 hour'))
      `).run(grantId, projectId, scopeJson);

      await assert.rejects(
        () => requireRoot(client, projectId, grantId, tempDir),
        (err) => err instanceof ExecutionBoundaryError && err.code === 'WORKSPACE_ROOT_MISMATCH' && err.status === 403
      );
    });

    test('Wrong project or grant reference throws WORKSPACE_ROOT_MISMATCH (403)', async () => {
      const nonExistentGrantId = crypto.randomUUID();
      await assert.rejects(
        () => requireRoot(client, projectId, nonExistentGrantId, tempDir),
        (err) => err instanceof ExecutionBoundaryError && err.code === 'WORKSPACE_ROOT_MISMATCH' && err.status === 403
      );
    });

    test('Revoked grant throws WORKSPACE_ROOT_MISMATCH (403)', async () => {
      const grantId = crypto.randomUUID();
      const scopeJson = JSON.stringify({
        workspaceRoot: tempDir,
        profile: HOME_PROFILE
      });

      db.prepare(`
        INSERT INTO capability_grants (id, project_id, capability, resource_scope, expires_at, revoked_at)
        VALUES (?, ?, 'workspace_root', ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '+1 hour'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
      `).run(grantId, projectId, scopeJson);

      await assert.rejects(
        () => requireRoot(client, projectId, grantId, tempDir),
        (err) => err instanceof ExecutionBoundaryError && err.code === 'WORKSPACE_ROOT_MISMATCH' && err.status === 403
      );
    });

    test('Expired grant throws WORKSPACE_ROOT_MISMATCH (403)', async () => {
      const grantId = crypto.randomUUID();
      const scopeJson = JSON.stringify({
        workspaceRoot: tempDir,
        profile: HOME_PROFILE
      });

      db.prepare(`
        INSERT INTO capability_grants (id, project_id, capability, resource_scope, expires_at)
        VALUES (?, ?, 'workspace_root', ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-1 hour'))
      `).run(grantId, projectId, scopeJson);

      await assert.rejects(
        () => requireRoot(client, projectId, grantId, tempDir),
        (err) => err instanceof ExecutionBoundaryError && err.code === 'WORKSPACE_ROOT_MISMATCH' && err.status === 403
      );
    });

    test('requireToolGrants enforces valid scope and revokes access on wrong path', async () => {
      const fsReadGrantId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO capability_grants (id, project_id, capability, resource_scope, expires_at)
        VALUES (?, ?, 'fs_read', ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '+1 hour'))
      `).run(fsReadGrantId, projectId, JSON.stringify({ workspaceRoot: tempDir }));

      // Sirona normalizePath matching path should succeed
      await requireToolGrants(client, projectId, ['fs_read'], tempDir);

      // Unauthorized path must be rejected with WORKSPACE_ROOT_MISMATCH
      await assert.rejects(
        () => requireToolGrants(client, projectId, ['fs_read'], path.resolve('/unauthorized/path')),
        (err) => err instanceof ExecutionBoundaryError && err.code === 'WORKSPACE_ROOT_MISMATCH' && err.status === 403
      );
    });
  });
});
