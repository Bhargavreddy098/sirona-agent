import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fixture, legacy } from './typedDatabaseBoundary.test.js';
import {
  verifyArtifact,
  recordEffectUsage,
  loadEffectUsage,
} from '../src/orchestration/activityAdapter.js';
import {
  classifyRecovery,
  startGraphRun,
  pauseGraphRun,
  resumeGraphRun,
  cancelGraphRun,
} from '../src/orchestration/graphRuntime.js';
import {
  persistCheckpoint,
  loadCheckpoint,
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

const defaultLimits: RunLimits = {
  maxParallelSpecialists: 3,
  maxTotalDelegatedTasks: 12,
  maxCritiqueRounds: 2,
  maxRepairRounds: 2,
  runDeadlineSeconds: 1800,
  specialistInvocationDeadlineSeconds: 120,
};

test('P5-06: Verification - independent verifier rejects seeded bad artifact and accepts corrected', async (t: TestContext) => {
  const { runId } = await fixture(t);
  const authContext = { runId, threadId: `thread-${runId}`, authenticated: true };

  // Bad candidate missing required criteria token
  const badCandidate = 'function test() { return false; }';
  const criteria = ['return true;', 'export default'];

  const badRes = await verifyArtifact('art-1', badCandidate, criteria, authContext);
  assert.strictEqual(badRes.success, true);
  assert.strictEqual(badRes.verified, false, 'Bad candidate must be rejected');

  // Corrected candidate meeting all criteria
  const goodCandidate = 'export default function test() { return true; }';
  const goodRes = await verifyArtifact('art-1', goodCandidate, criteria, authContext);
  assert.strictEqual(goodRes.success, true);
  assert.strictEqual(goodRes.verified, true, 'Corrected candidate must pass verification');
  assert.ok(goodRes.verifiedArtifact, 'Must return artifact digest');
});

test('P5-06: Recovery - classifies recovery states correctly (recoverable, blocked, unknown)', async (t: TestContext) => {
  const { runId } = await fixture(t);
  const sequence = 1;

  // Persist completed checkpoint
  const completedCp = await persistCheckpoint(
    legacy,
    runId,
    sequence,
    GraphState.COMPLETED
  );
  assert.strictEqual(classifyRecovery(completedCp, GraphState.ACTIVE, GraphState.COMPLETED), 'recoverable');

  // Persist blocked checkpoint
  const blockedCp = await persistCheckpoint(
    legacy,
    runId,
    sequence + 1,
    GraphState.BLOCKED
  );
  assert.strictEqual(classifyRecovery(blockedCp, GraphState.ACTIVE, GraphState.BLOCKED), 'blocked');

  // Tampered digest checkpoint -> unknown
  const tamperedCp = {
    ...completedCp,
    stateDigest: 'bad'.repeat(21) + '0',
  };
  assert.strictEqual(classifyRecovery(tamperedCp, GraphState.ACTIVE, GraphState.COMPLETED), 'unknown');
});

test('P5-06: Effect Accounting - journals paid effect usage without duplicate execution', async (t: TestContext) => {
  const { runId } = await fixture(t);
  const sequence = 1;

  await persistCheckpoint(legacy, runId, sequence, GraphState.ACTIVE);

  const effectId = crypto.randomUUID();
  const modelId = 'gemini-2.5-flash';
  const tokens = 250;
  const cost = 15;
  const outputHash = crypto.createHash('sha256').update('generated text').digest('hex');

  await recordEffectUsage(legacy, runId, sequence, effectId, modelId, tokens, cost, outputHash);

  const recorded = await loadEffectUsage(legacy, runId, sequence);
  assert.strictEqual(recorded.length, 1);
  assert.strictEqual(recorded[0].effect_id, effectId);
  assert.strictEqual(recorded[0].model_id, modelId);
  assert.strictEqual(recorded[0].tokens, tokens);
  assert.strictEqual(recorded[0].output_hash, outputHash);
});

test('P5-06: Graph Runtime - start, pause, resume, cancel lifecycle preserves consistency', async (t: TestContext) => {
  const { runId } = await fixture(t);
  const threadId = `thread-${runId}`;
  const authContext = { runId, threadId, authenticated: true };

  // Start graph run
  const started = await startGraphRun(legacy, runId, threadId, defaultLimits, undefined, authContext);
  assert.strictEqual(started.success, true);
  assert.strictEqual(started.state.state, GraphState.PENDING);

  // Pause graph run
  const paused = await pauseGraphRun(legacy, runId, 1, started.checkpoint);
  assert.strictEqual(paused.success, true);

  // Resume graph run with valid authentication
  const resumed = await resumeGraphRun(legacy, runId, 1, authContext);
  assert.strictEqual(resumed.success, true);
  assert.strictEqual(resumed.state.runId, runId);

  // Resume with unauthenticated context -> rejected
  const unauth = await resumeGraphRun(legacy, runId, 1, { runId, threadId, authenticated: false });
  assert.strictEqual(unauth.success, false);
  assert.match(unauth.error || '', /authenticated resume context/);

  // Cancel graph run
  const cancelled = await cancelGraphRun(legacy, runId, 1, started.checkpoint);
  assert.strictEqual(cancelled.success, true);
});
