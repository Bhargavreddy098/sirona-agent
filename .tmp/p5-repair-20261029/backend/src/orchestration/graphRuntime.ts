import crypto from 'node:crypto';
import {
  GraphState,
  GraphTransition,
  LangGraphState,
  Checkpoint,
  RunLimits,
} from './graphContracts.js';
import {
  persistCheckpoint,
  loadCheckpoint,
  resetCheckpointStatus,
  computeStateDigest,
  CheckpointKind,
  type DbClient,
} from './checkpointAdapter.js';

// Graph runtime owner: start/resume/pause/cancel/shutdown
// Authentication context, recovery classification, fixed-version dispatch
// All state persists through checkpoints in existing run_checkpoints namespace state_data.sironaGraph

/**
 * Start a new opted-in graph run.
 */
export async function startGraphRun(
  db: DbClient,
  runId: string,
  threadId: string,
  initialLimits: RunLimits,
  parentRunId?: string,
  authenticationContext?: { runId: string; threadId: string; authenticated: boolean }
): Promise<{
  success: boolean;
  state: LangGraphState;
  checkpoint: Checkpoint;
  error?: string;
}> {
  if (parentRunId) {
    const parentCheckpoint = await loadCheckpoint(db, parentRunId, 1);
    if (!parentCheckpoint) {
      return { success: false, state: {} as LangGraphState, checkpoint: {} as Checkpoint, error: 'Parent run checkpoint not found' };
    }
    let parentState: any;
    try {
      parentState = typeof parentCheckpoint.stateData === 'string' ? JSON.parse(parentCheckpoint.stateData) : parentCheckpoint.stateData;
    } catch {
      return { success: false, state: {} as LangGraphState, checkpoint: {} as Checkpoint, error: 'Cannot parse parent checkpoint stateData' };
    }
    if (parentState.engine && parentState.engine !== 'langgraph') {
      return { success: false, state: {} as LangGraphState, checkpoint: {} as Checkpoint, error: 'Parent run is not a langgraph engine run' };
    }
  }

  const initialState: LangGraphState = {
    runId,
    threadId,
    state: GraphState.PENDING,
    currentTransition: GraphTransition.CHOOSE_SPECIALISTS,
    specialists: new Map(),
    parentDelegation: undefined,
    specialistProposals: new Map(),
    counters: {
      critiqueRounds: 0,
      repairRounds: 0,
      delegatedTasks: 0,
    },
    limits: initialLimits,
    createdAt: new Date(),
    lastUpdated: new Date(),
    checkpointId: undefined,
  };

  const initialCheckpoint = await persistCheckpoint(
    db,
    runId,
    1,
    initialState.state,
    initialState.specialists,
    initialState.parentDelegation,
    initialState.specialistProposals,
    initialState.specialistJoin,
    initialState.humanApproval,
    initialState.counters,
    initialState.limits,
    initialState.checkpointId
  );

  initialState.checkpointId = initialCheckpoint.id;
  initialState.lastUpdated = new Date();

  return {
    success: true,
    state: initialState,
    checkpoint: initialCheckpoint,
  };
}

/**
 * Resume a previously paused/blocked run from its checkpoint.
 */
export async function resumeGraphRun(
  db: DbClient,
  runId: string,
  sequence: number,
  authenticationContext: { runId: string; threadId: string; authenticated: boolean }
): Promise<{
  success: boolean;
  state: LangGraphState;
  checkpoint: Checkpoint;
  error?: string;
}> {
  const checkpoint = await loadCheckpoint(db, runId, sequence);
  if (!checkpoint) {
    return { success: false, state: {} as LangGraphState, checkpoint: {} as Checkpoint, error: 'Checkpoint not found for resume' };
  }

  let stateObj: any;
  try {
    stateObj = typeof checkpoint.stateData === 'string' ? JSON.parse(checkpoint.stateData) : checkpoint.stateData;
  } catch {
    return { success: false, state: {} as LangGraphState, checkpoint: {} as Checkpoint, error: 'Cannot parse checkpoint stateData' };
  }

  if (!authenticationContext.authenticated) {
    return { success: false, state: {} as LangGraphState, checkpoint: {} as Checkpoint, error: 'Run requires authenticated resume context' };
  }

  const sironaGraph = stateObj?.sironaGraph || {};
  const limits = sironaGraph.limits || stateObj.limits || {
    maxParallelSpecialists: 3,
    maxTotalDelegatedTasks: 12,
    maxCritiqueRounds: 2,
    maxRepairRounds: 2,
    runDeadlineSeconds: 1800,
    specialistInvocationDeadlineSeconds: 120,
  };

  const state: LangGraphState = {
    runId: checkpoint.runId,
    threadId: authenticationContext.threadId,
    state: sironaGraph.state || stateObj.state || GraphState.BLOCKED,
    currentTransition: GraphTransition.VALIDATE,
    specialists: new Map(
      (sironaGraph.specialists || []).map((s: any) => [s.specialistId, { specialistId: s.specialistId, role: s.role || 'primary', assignedAt: new Date(s.assignedAt || Date.now()), taskScope: s.taskScope || '' }])
    ),
    parentDelegation: sironaGraph.parentDelegation,
    specialistProposals: new Map(
      (sironaGraph.specialistProposals || []).map((p: any) => [p.specialistId, {
        type: 'propose',
        specialistId: p.specialistId,
        taskId: p.taskId || crypto.randomUUID(),
        output: p.output || '',
        usage: p.usage || { tokens: 0, costMicroUsd: 0 },
        status: p.status || 'pending',
      }])
    ),
    counters: sironaGraph.counters || stateObj.counters || { critiqueRounds: 0, repairRounds: 0, delegatedTasks: 0 },
    limits,
    createdAt: checkpoint.createdAt,
    lastUpdated: new Date(),
    checkpointId: checkpoint.id,
    humanApproval: sironaGraph.humanApproval,
  };

  return {
    success: true,
    state,
    checkpoint,
  };
}

/**
 * Pause a running graph.
 */
export async function pauseGraphRun(
  db: DbClient,
  runId: string,
  sequence: number,
  checkpoint: Checkpoint
): Promise<{ success: boolean; error?: string }> {
  await resetCheckpointStatus(db, runId, sequence, CheckpointKind.PENDING);
  return { success: true };
}

/**
 * Cancel a running graph.
 */
export async function cancelGraphRun(
  db: DbClient,
  runId: string,
  sequence: number,
  checkpoint: Checkpoint
): Promise<{ success: boolean; error?: string }> {
  await resetCheckpointStatus(db, runId, sequence, CheckpointKind.ABORTED);
  return { success: true };
}

/**
 * Shutdown the graph runtime for a run.
 */
export async function shutdownGraphRuntime(
  db: DbClient,
  runId: string,
  sequence: number
): Promise<{ success: boolean; error?: string }> {
  await resetCheckpointStatus(db, runId, sequence, CheckpointKind.FAILED);
  return { success: true };
}

/**
 * Fixed-version dispatch: route a run to its pinned graph version.
 */
export function dispatchToGraphVersion(
  runConfig: { engine: 'langgraph' | 'legacy'; graphVersion: string; threadId: string },
  state: LangGraphState
): GraphTransition {
  if (runConfig.engine !== 'langgraph') {
    return GraphTransition.BLOCKED;
  }
  return state.currentTransition;
}

/**
 * Classify recovery after process death.
 */
export function classifyRecovery(
  checkpoint: Checkpoint,
  previousState: GraphState,
  currentState: GraphState
): 'recoverable' | 'blocked' | 'unknown' {
  try {
    const computedDigest = computeStateDigest(checkpoint.stateData);

    if (computedDigest !== checkpoint.stateDigest) {
      return 'unknown';
    }
  } catch {
    return 'unknown';
  }

  if (currentState === GraphState.COMPLETED) {
    return 'recoverable';
  }
  if (currentState === GraphState.BLOCKED) {
    return 'blocked';
  }
  return 'unknown';
}

export default {
  startGraphRun,
  resumeGraphRun,
  pauseGraphRun,
  cancelGraphRun,
  shutdownGraphRuntime,
  dispatchToGraphVersion,
  classifyRecovery,
};
