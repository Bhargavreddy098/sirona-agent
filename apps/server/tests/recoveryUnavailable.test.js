// Contract tests only: real services, HTTP routes and auth/CSRF middleware.
// The persistence tripwire cannot open SQLite/PostgreSQL or record fake recovery.
import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { createHash } from 'node:crypto';
import express from 'express';
import { serve, request } from './helpers.js';

const fixtureUrl = 'data:text/javascript,' + encodeURIComponent(`
  export const state = { calls: [], rows: [], session: null, tokenHash: null };
  export async function query(sql, params = []) {
    state.calls.push(sql);
    if (!/^\\s*SELECT\\b/i.test(sql)) throw new Error('Database write tripwire');
    if (sql.includes('FROM auth_sessions')) {
      return { rows: params[0] === state.tokenHash && state.session ? [state.session] : [] };
    }
    if (sql.includes('FROM system.recovery_checkpoints')) return { rows: state.rows };
    throw new Error('Unexpected database access');
  }
`);
const dbUrl = new URL('../config/db.js', import.meta.url).href;
const hook = registerHooks({ resolve(specifier, context, next) {
  const resolved = next(specifier, context);
  return resolved.url === dbUrl ? { url: fixtureUrl, shortCircuit: true } : resolved;
} });
const { state } = await import(fixtureUrl);
const { ReleaseRecoveryService: service } = await import('../services/releaseRecoveryService.js');
const { getCapabilities } = await import('../services/identityService.js');
const { default: router } = await import('../routes/v1/recovery.routes.js');
hook.deregister();

test('every supported backup kind and restore attempt fails without database access', async () => {
  state.calls.length = 0;
  for (const checkpointKind of ['full_backup', 'wal_snapshot', 'state_snapshot']) {
    await assert.rejects(service.createRecoveryCheckpoint({ checkpointKind,
      metadata: { verified: true, storageRef: 'CANARY_PRIVATE_PATH' } }),
    { code: 'RECOVERY_NOT_CONFIGURED', status: 503 });
  }
  for (const simulateCorruption of [false, true]) {
    await assert.rejects(service.executeRecoveryRehearsal('historical-id', { simulateCorruption }),
      { code: 'RECOVERY_NOT_CONFIGURED', status: 503 });
  }
  await assert.rejects(service.getRecoveryRehearsal('historical-id'),
    { code: 'RECOVERY_NOT_CONFIGURED', status: 503 });
  assert.deepEqual(state.calls, []);
});

test('invalid recovery inputs retain explicit validation errors', async () => {
  await assert.rejects(service.createRecoveryCheckpoint({ checkpointKind: 'invalid' }),
    { code: 'INVALID_CHECKPOINT_KIND', status: 400 });
  await assert.rejects(service.executeRecoveryRehearsal(''), { code: 'INVALID_INPUT', status: 400 });
  await assert.rejects(service.getRecoveryRehearsal(''), { code: 'INVALID_INPUT', status: 400 });
});

test('historical metadata is not presented as verified backup content or mutated', async () => {
  const row = Object.freeze({ id: 'historical-id', checkpoint_kind: 'full_backup', verified: true,
    checksum: 'a'.repeat(64), size_bytes: 123, metadata: Object.freeze({ historical: true }) });
  state.rows = [row];
  state.calls.length = 0;
  const [listed] = await service.listRecoveryCheckpoints();
  const fetched = await service.getRecoveryCheckpoint(row.id);
  assert.equal(listed.verified, false);
  assert.equal(fetched.verified, false);
  assert.equal(row.verified, true);
  assert.equal(state.calls.length, 2);
  state.rows = [];
  await assert.rejects(service.getRecoveryCheckpoint('missing'), { code: 'CHECKPOINT_NOT_FOUND', status: 404 });
});

test('capability projection truthfully marks recovery unavailable', () => {
  const recovery = getCapabilities().items.find(item => item.name === 'release_recovery');
  assert.equal(recovery.state, 'unavailable');
  assert.match(recovery.reason, /not configured or qualified/);
});

test('HTTP recovery preserves real auth and CSRF enforcement and cannot return simulated success', async t => {
  const hash = value => createHash('sha256').update(value).digest('hex');
  state.tokenHash = hash('fixture-session');
  state.session = { id: 'fixture-id', principal_id: 'fixture-owner', workspace_id: 'fixture-workspace',
    csrf_hash: hash('fixture-csrf'), expires_at: new Date(Date.now() + 60000).toISOString(), revoked_at: null };
  state.calls.length = 0;
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { req.requestId = 'recovery-contract'; next(); });
  app.use('/api/v1', router);
  const base = await serve(t, app);
  const path = '/api/v1/system/recovery/checkpoints';
  const headers = { 'Content-Type': 'application/json', Authorization: 'Bearer fixture-session' };
  assert.equal((await request(base, path, { method: 'POST', body: '{}' })).status, 401);
  assert.equal((await request(base, path, { method: 'POST', headers, body: '{}' })).status, 403);
  assert.equal((await request(base, path, { method: 'POST', headers: { ...headers,
    'x-csrf-token': 'wrong' }, body: '{}' })).status, 403);
  const authorized = { ...headers, 'x-csrf-token': 'fixture-csrf' };
  for (const target of [path, `${path}/historical-id/rehearsal`]) {
    const response = await request(base, target, { method: 'POST', headers: authorized,
      body: JSON.stringify({ metadata: { verified: true, secret: 'CANARY_SECRET' } }) });
    assert.equal(response.status, 503);
    assert.match(response.headers.get('content-type'), /application\/problem\+json/);
    const body = await response.json();
    assert.equal(body.code, 'CAPABILITY_UNAVAILABLE');
    assert.match(body.detail, /not configured/);
    assert.equal(body.data, undefined);
    assert.doesNotMatch(JSON.stringify(body), /CANARY_SECRET|zeroDataLossVerified|restoredRowCount/);
  }
  const historical = await request(base, '/api/v1/system/recovery/rehearsals/historical-id', { headers });
  assert.equal(historical.status, 503);
  assert.ok(state.calls.every(sql => sql.includes('FROM auth_sessions')));
});
