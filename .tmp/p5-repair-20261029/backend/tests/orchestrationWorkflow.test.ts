import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fixture, legacy } from './typedDatabaseBoundary.test.js';
import {
  buildWorkspaceGraph,
  initializeGraphRun,
  transitionChooseSpecialists,
  transitionFanout,
  transitionValidate,
  transitionCritique,
  transitionApproval,
  transitionExecute,
  transitionRepair,
  transitionFinalize,
} from '../src/orchestration/workspaceGraph.js';
import {
  persistCheckpoint,
  loadCheckpoint,
} from '../src/orchestration/checkpointAdapter.js';
import {
  GraphState,
  GraphTransition,
  RunLimits,
  SpecialistProposal,
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

test('P5-07: Orchestration Workflow - full state transition lifecycle through LangGraph nodes', async (t: TestContext) => {
  const { runId } = await fixture(t);
  const threadId = `thread-${runId}`;

  // 1. Initialize
  let state = initializeGraphRun(runId, threadId, defaultLimits);
  assert.strictEqual(state.state, GraphState.PENDING);
  assert.strictEqual(state.currentTransition, GraphTransition.CHOOSE_SPECIALISTS);

  // 2. Choose Specialists
  const chooseRes = transitionChooseSpecialists(state, ['spec-1', 'spec-2']);
  assert.strictEqual(chooseRes.valid, true);
  state = chooseRes.newState;
  assert.strictEqual(state.state, GraphState.ACTIVE);
  assert.strictEqual(state.currentTransition, GraphTransition.FANOUT);
  assert.strictEqual(state.specialists.size, 2);

  // 3. Fanout
  const fanoutRes = transitionFanout(state, new Map([
    ['spec-3', {
      type: 'delegate',
      taskDescription: 'subtask 3',
      specialistRequirements: { maxConcurrent: 3, outputLimits: { maxTokens: 1000, maxDurationSeconds: 60, contextOutputCap: 1000 }, justification: 'fanout' },
      nonce: crypto.randomUUID(),
      approved: true,
    }],
  ]));
  assert.strictEqual(fanoutRes.valid, true);
  state = fanoutRes.newState;
  assert.strictEqual(state.currentTransition, GraphTransition.VALIDATE);

  // Mark all proposals completed
  for (const [sid, prop] of state.specialistProposals) {
    prop.status = 'completed';
    prop.output = `Output from ${sid}`;
  }

  // 4. Validate
  const valRes = transitionValidate(state);
  assert.strictEqual(valRes.valid, true);
  state = valRes.newState;
  assert.strictEqual(state.currentTransition, GraphTransition.CRITIQUE);

  // 5. Critique (Round 1)
  const critRes1 = transitionCritique(state);
  assert.strictEqual(critRes1.valid, true);
  state = critRes1.newState;
  assert.strictEqual(state.counters.critiqueRounds, 1);

  // Critique (Round 2 hits maxCritiqueRounds -> moves to APPROVAL)
  const critRes2 = transitionCritique(state);
  assert.strictEqual(critRes2.valid, true);
  state = critRes2.newState;
  assert.strictEqual(state.counters.critiqueRounds, 2);
  assert.strictEqual(state.currentTransition, GraphTransition.APPROVAL);

  // 6. Approval
  const appRes = transitionApproval(state, {
    approvalId: crypto.randomUUID(),
    approved: true,
    reason: 'Verified and approved',
    nonce: crypto.randomUUID(),
  });
  assert.strictEqual(appRes.valid, true);
  state = appRes.newState;
  assert.strictEqual(state.currentTransition, GraphTransition.EXECUTE);

  // 7. Execute & Join
  const execRes = transitionExecute(state, state.specialistProposals);
  assert.strictEqual(execRes.valid, true);
  state = execRes.newState;
  assert.strictEqual(state.state, GraphState.COMPLETED);
  assert.ok(state.specialistJoin?.mergedOutput.includes('Output from spec-3'));

  // Persist final completed state
  await persistCheckpoint(legacy, runId, 1, state.state);
  const loaded = await loadCheckpoint(legacy, runId, 1);
  assert.strictEqual(loaded?.runId, runId);
});

test('P5-07: Orchestration Workflow - LangGraph StateGraph compiles and executes transitions', async () => {
  const workflow = buildWorkspaceGraph();
  const app = workflow.compile();

  const initialState = {
    runId: crypto.randomUUID(),
    threadId: 'thread-lg-compile',
    state: GraphState.ACTIVE,
    currentTransition: GraphTransition.CHOOSE_SPECIALISTS,
    specialistIds: ['s1', 's2'],
    mergedOutput: '',
    counters: { critiqueRounds: 0, repairRounds: 0, delegatedTasks: 0 },
    limits: defaultLimits,
  };

  const result = await app.invoke(initialState);
  assert.strictEqual(result.state, GraphState.COMPLETED);
  assert.strictEqual(result.currentTransition, GraphTransition.COMPLETED);
  assert.strictEqual(result.counters.critiqueRounds, 1);
});

test('P5-07: Orchestration Workflow - human approval denial blocks the workflow', async (t: TestContext) => {
  const { runId } = await fixture(t);
  const state = initializeGraphRun(runId, `thread-${runId}`, defaultLimits);

  const deniedRes = transitionApproval(state, {
    approvalId: crypto.randomUUID(),
    approved: false,
    reason: 'Policy violation: unauthorized target path',
    nonce: crypto.randomUUID(),
  });

  assert.strictEqual(deniedRes.valid, true);
  assert.strictEqual(deniedRes.newState.state, GraphState.BLOCKED);
  assert.strictEqual(deniedRes.newState.currentTransition, GraphTransition.COMPLETED);
});

test('P5-07: Orchestration Workflow - enforces maximum bounded repair rounds (2)', async (t: TestContext) => {
  const { runId } = await fixture(t);
  let state = initializeGraphRun(runId, `thread-${runId}`, defaultLimits);

  // Round 1 repair
  const rep1 = transitionRepair(state, 'First repair attempt');
  assert.strictEqual(rep1.valid, true);
  state = rep1.newState;
  assert.strictEqual(state.counters.repairRounds, 1);
  assert.strictEqual(state.state, GraphState.REPAIR);

  // Round 2 repair
  const rep2 = transitionRepair(state, 'Second repair attempt');
  assert.strictEqual(rep2.valid, true);
  state = rep2.newState;
  assert.strictEqual(state.counters.repairRounds, 2);

  // Round 3 repair -> must be rejected because maxRepairRounds is 2
  const rep3 = transitionRepair(state, 'Third repair attempt over limit');
  assert.strictEqual(rep3.valid, false);
  assert.match(rep3.error || '', /Repair round limit exceeded/);
});
