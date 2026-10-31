import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fixture, legacy } from './typedDatabaseBoundary.test.js';
import {
  persistCheckpoint,
  loadCheckpoint,
  persistPendingWrite,
  loadPendingWrites,
  incrementDelegatedTasks,
  computeStateDigest,
  SironaPostgresSaver,
  CheckpointKind,
} from '../src/orchestration/checkpointAdapter.js';
import {
  GraphState,
  RunLimits,
} from '../src/orchestration/graphContracts.js';

const backendModules = createRequire(new URL('../../package.json', import.meta.url));
const { loadEnvironment } = backendModules('./server.js');
loadEnvironment();
delete process.env.DATABASE_URL;
process.env.PGDATABASE = 'sirona_workspace_p0_test_20261028';

test('P5-02: Graph Checkpoint - persists and loads checkpoint with SHA-256 digest verification', async (t: TestContext) => {
  const { runId } = await fixture(t);
  const sequence = 1;

  const defaultLimits: RunLimits = {
    maxParallelSpecialists: 3,
    maxTotalDelegatedTasks: 12,
    maxCritiqueRounds: 2,
    maxRepairRounds: 2,
    runDeadlineSeconds: 1800,
    specialistInvocationDeadlineSeconds: 120,
  };

  const persisted = await persistCheckpoint(
    legacy,
    runId,
    sequence,
    GraphState.PENDING,
    new Map(),
    undefined,
    new Map(),
    undefined,
    undefined,
    { critiqueRounds: 0, repairRounds: 0, delegatedTasks: 0 },
    defaultLimits
  );

  assert.ok(persisted.id, 'Checkpoint must have an ID');
  assert.strictEqual(persisted.runId, runId);
  assert.strictEqual(persisted.sequence, sequence);
  assert.strictEqual(persisted.status, CheckpointKind.FULL);

  // Load back from database
  const loaded = await loadCheckpoint(legacy, runId, sequence);
  assert.ok(loaded, 'Checkpoint must be loaded from DB');
  assert.strictEqual(loaded.runId, runId);
  assert.strictEqual(loaded.sequence, sequence);
  assert.strictEqual(loaded.status, CheckpointKind.FULL);

  // Digest verification
  const computedDigest = computeStateDigest(loaded.stateData);
  assert.strictEqual(loaded.stateDigest, computedDigest, 'Computed digest must match persisted digest');
});

test('P5-02: Graph Checkpoint - detects tampered or corrupted checkpoint data', async (t: TestContext) => {
  const { runId } = await fixture(t);
  const sequence = 2;

  await persistCheckpoint(
    legacy,
    runId,
    sequence,
    GraphState.ACTIVE,
    new Map(),
    undefined,
    new Map(),
    undefined,
    undefined,
    { critiqueRounds: 0, repairRounds: 0, delegatedTasks: 0 }
  );

  // Tamper directly with the state_data in PostgreSQL without updating state_digest
  await legacy.query(
    `UPDATE run_checkpoints SET state_data = '{"tampered":true}'::jsonb WHERE run_id = $1 AND sequence = $2`,
    [runId, sequence]
  );

  // Attempting to load the tampered checkpoint must fail with digest mismatch error
  await assert.rejects(
    async () => {
      await loadCheckpoint(legacy, runId, sequence);
    },
    /Checkpoint digest mismatch/,
    'Tampered state data must be rejected'
  );
});

test('P5-02: Graph Checkpoint - persists and retrieves pending writes for interrupted tasks', async (t: TestContext) => {
  const { runId } = await fixture(t);
  const sequence = 3;

  await persistCheckpoint(legacy, runId, sequence, GraphState.ACTIVE);

  await persistPendingWrite(legacy, runId, sequence, 'task-write-001', JSON.stringify({ edit: 'file1.txt' }));
  await persistPendingWrite(legacy, runId, sequence, 'task-write-002', JSON.stringify({ edit: 'file2.txt' }));

  const pending = await loadPendingWrites(legacy, runId, sequence);
  assert.strictEqual(pending.length, 2);
  assert.ok(pending.includes('task-write-001'));
  assert.ok(pending.includes('task-write-002'));
});

test('P5-02: Graph Checkpoint - increments delegated tasks counter atomically', async (t: TestContext) => {
  const { runId } = await fixture(t);
  const sequence = 4;

  await persistCheckpoint(legacy, runId, sequence, GraphState.ACTIVE);

  const updated1 = await incrementDelegatedTasks(legacy, runId, sequence);
  const loaded1 = await loadCheckpoint(legacy, runId, sequence);
  let parsed1 = typeof loaded1?.stateData === 'string' ? JSON.parse(loaded1.stateData) : loaded1?.stateData;
  assert.strictEqual(parsed1.counters.delegatedTasks, 1);

  const updated2 = await incrementDelegatedTasks(legacy, runId, sequence);
  const loaded2 = await loadCheckpoint(legacy, runId, sequence);
  let parsed2 = typeof loaded2?.stateData === 'string' ? JSON.parse(loaded2.stateData) : loaded2?.stateData;
  assert.strictEqual(parsed2.counters.delegatedTasks, 2);
});

test('P5-02: Graph Checkpoint - SironaPostgresSaver LangGraph BaseCheckpointSaver integration', async (t: TestContext) => {
  const { runId } = await fixture(t);
  const saver = new SironaPostgresSaver(legacy);

  const config = {
    configurable: {
      thread_id: runId,
      run_id: runId,
      checkpoint_ns: '5',
    },
  };

  const checkpointData = {
    v: 1,
    id: crypto.randomUUID(),
    ts: new Date().toISOString(),
    channel_values: { messages: ['hello from langgraph'] },
    channel_versions: { messages: 1 },
    versions_seen: { agent: { messages: 1 } },
    pending_sends: [],
  };

  const metadata = {
    source: 'loop' as const,
    step: 1,
    writes: {},
    parents: {},
  };

  // Put checkpoint via LangGraph saver
  const putConfig = await saver.put(config, checkpointData, metadata);
  assert.ok(putConfig.configurable);

  // Retrieve via getTuple
  const tuple = await saver.getTuple(config);
  assert.ok(tuple, 'Should retrieve checkpoint tuple');
  assert.strictEqual(tuple.checkpoint.id, checkpointData.id);
  assert.deepStrictEqual(tuple.checkpoint.channel_values, checkpointData.channel_values);

  // Put and retrieve pending writes via putWrites
  await saver.putWrites(config, [['messages', 'another write']], 'task-lg-1');
  const writes = await loadPendingWrites(legacy, runId, 5);
  assert.ok(writes.some(w => w.includes('task-lg-1')));
});
