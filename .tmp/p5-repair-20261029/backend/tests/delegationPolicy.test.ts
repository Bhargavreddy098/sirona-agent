import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fixture, legacy } from './typedDatabaseBoundary.test.js';
import {
  canAdmitSpecialist,
  admitSpecialist,
  releaseSpecialist,
  fanoutToSpecialists,
} from '../src/orchestration/delegationService.js';
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

const limits: RunLimits = {
  maxParallelSpecialists: 3,
  maxTotalDelegatedTasks: 12,
  maxCritiqueRounds: 2,
  maxRepairRounds: 2,
  runDeadlineSeconds: 1800,
  specialistInvocationDeadlineSeconds: 120,
};

test('P5-03: Delegation Policy - admits up to maxParallelSpecialists (3) concurrently, rejects 4th', async (t: TestContext) => {
  const { runId } = await fixture(t);
  const sequence = 1;

  await persistCheckpoint(legacy, runId, sequence, GraphState.ACTIVE, new Map(), undefined, new Map(), undefined, undefined, { critiqueRounds: 0, repairRounds: 0, delegatedTasks: 0 }, limits);

  // Admit 1st, 2nd, 3rd specialists
  const r1 = await admitSpecialist(legacy, runId, sequence, 'spec-1', limits, 'primary', 'parent');
  assert.strictEqual(r1.success, true);

  const r2 = await admitSpecialist(legacy, runId, sequence, 'spec-2', limits, 'primary', 'parent');
  assert.strictEqual(r2.success, true);

  const r3 = await admitSpecialist(legacy, runId, sequence, 'spec-3', limits, 'primary', 'parent');
  assert.strictEqual(r3.success, true);

  // 4th concurrent specialist must be denied
  const r4 = await admitSpecialist(legacy, runId, sequence, 'spec-4', limits, 'primary', 'parent');
  assert.strictEqual(r4.success, false);
  assert.match(r4.error || '', /Cannot admit specialist: 3 already active/);
});

test('P5-03: Delegation Policy - sequential admission succeeds after specialist is released', async (t: TestContext) => {
  const { runId } = await fixture(t);
  const sequence = 1;

  await persistCheckpoint(legacy, runId, sequence, GraphState.ACTIVE, new Map(), undefined, new Map(), undefined, undefined, { critiqueRounds: 0, repairRounds: 0, delegatedTasks: 0 }, limits);

  // Fill all 3 slots
  await admitSpecialist(legacy, runId, sequence, 'spec-1', limits, 'primary', 'parent');
  await admitSpecialist(legacy, runId, sequence, 'spec-2', limits, 'primary', 'parent');
  await admitSpecialist(legacy, runId, sequence, 'spec-3', limits, 'primary', 'parent');

  // Verify full
  const fullCheck = await canAdmitSpecialist(legacy, runId, sequence, limits);
  assert.strictEqual(fullCheck.allowed, false);

  // Release spec-2
  const releaseRes = await releaseSpecialist(legacy, runId, sequence, 'spec-2');
  assert.strictEqual(releaseRes.success, true);

  // Now slot is free - admit spec-4 sequentially
  const r4 = await admitSpecialist(legacy, runId, sequence, 'spec-4', limits, 'primary', 'parent');
  assert.strictEqual(r4.success, true, 'Sequential admission must succeed once a slot is released');
});

test('P5-03: Delegation Policy - enforces maximum total delegated tasks ceiling (12)', async (t: TestContext) => {
  const { runId } = await fixture(t);
  const sequence = 1;

  // Initialize checkpoint with 12 total delegated tasks already performed
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
    { critiqueRounds: 0, repairRounds: 0, delegatedTasks: 12 },
    limits
  );

  const check = await canAdmitSpecialist(legacy, runId, sequence, limits);
  assert.strictEqual(check.allowed, false);
  assert.match(check.error || '', /Total delegated task limit/);

  const res = await admitSpecialist(legacy, runId, sequence, 'spec-over-limit', limits, 'primary', 'parent');
  assert.strictEqual(res.success, false);
});

test('P5-03: Delegation Policy - flat parent-to-specialist hierarchy; specialists cannot delegate', async (t: TestContext) => {
  const { runId } = await fixture(t);
  const sequence = 1;

  await persistCheckpoint(legacy, runId, sequence, GraphState.ACTIVE, new Map(), undefined, new Map(), undefined, undefined, { critiqueRounds: 0, repairRounds: 0, delegatedTasks: 0 }, limits);

  // Specialist attempts to delegate -> denied
  const res = await admitSpecialist(legacy, runId, sequence, 'sub-spec-1', limits, 'primary', 'specialist');
  assert.strictEqual(res.success, false);
  assert.match(res.error || '', /specialists cannot delegate/);

  // Specialist attempts fanout -> denied
  const fanoutRes = await fanoutToSpecialists(
    legacy,
    runId,
    sequence,
    ['sub-1', 'sub-2'],
    { taskDescription: 'subtask', specialistRequirements: {}, justification: 'testing' },
    limits,
    'specialist'
  );
  assert.strictEqual(fanoutRes.success, false);
  assert.match(fanoutRes.error || '', /Specialists cannot perform fanout/);
});

test('P5-03: Delegation Policy - fanout enforces parallel limits atomically', async (t: TestContext) => {
  const { runId } = await fixture(t);
  const sequence = 1;

  await persistCheckpoint(legacy, runId, sequence, GraphState.ACTIVE, new Map(), undefined, new Map(), undefined, undefined, { critiqueRounds: 0, repairRounds: 0, delegatedTasks: 0 }, limits);

  // Attempt fanout to 4 specialists -> rejected (exceeds max 3)
  const failRes = await fanoutToSpecialists(
    legacy,
    runId,
    sequence,
    ['spec-A', 'spec-B', 'spec-C', 'spec-D'],
    { taskDescription: 'fanout task', specialistRequirements: {}, justification: 'testing' },
    limits,
    'parent'
  );
  assert.strictEqual(failRes.success, false);
  assert.match(failRes.error || '', /Cannot fanout to 4 specialists, max is 3/);

  // Fanout to 3 specialists -> succeeds
  const okRes = await fanoutToSpecialists(
    legacy,
    runId,
    sequence,
    ['spec-A', 'spec-B', 'spec-C'],
    { taskDescription: 'fanout task', specialistRequirements: {}, justification: 'testing' },
    limits,
    'parent'
  );
  assert.strictEqual(okRes.success, true);
});
