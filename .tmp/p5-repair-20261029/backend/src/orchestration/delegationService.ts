import crypto from 'node:crypto';
import {
  GraphState,
  Checkpoint,
  RunLimits,
  SpecialistProposal,
  ParentDelegation,
  AgentAssignment,
} from './graphContracts.js';
import {
  persistCheckpoint,
  loadCheckpoint,
  computeStateDigest,
  type DbClient,
} from './checkpointAdapter.js';

/**
 * Check whether a new specialist can be admitted given current run state.
 * Enforces maxParallelSpecialists (<=3) and maxTotalDelegatedTasks (<=12).
 */
export async function canAdmitSpecialist(
  db: DbClient,
  runId: string,
  sequence: number,
  limits: RunLimits
): Promise<{ allowed: boolean; currentCount: number; totalDelegated: number; error?: string }> {
  const checkpoint = await loadCheckpoint(db, runId, sequence);
  if (!checkpoint) {
    return { allowed: true, currentCount: 0, totalDelegated: 0 };
  }

  let stateObj: any = {};
  try {
    stateObj = typeof checkpoint.stateData === 'string' ? JSON.parse(checkpoint.stateData) : checkpoint.stateData;
  } catch {
    stateObj = {};
  }

  const sironaGraph = stateObj.sironaGraph || {};
  const specialists: AgentAssignment[] = sironaGraph.specialists || [];
  const currentCount = specialists.length;
  const counters = sironaGraph.counters || stateObj.counters || { delegatedTasks: 0 };
  const totalDelegated = counters.delegatedTasks || 0;

  if (currentCount >= limits.maxParallelSpecialists) {
    return {
      allowed: false,
      currentCount,
      totalDelegated,
      error: `Cannot admit specialist: ${currentCount} already active, max is ${limits.maxParallelSpecialists}`,
    };
  }

  if (totalDelegated >= limits.maxTotalDelegatedTasks) {
    return {
      allowed: false,
      currentCount,
      totalDelegated,
      error: `Total delegated task limit (${limits.maxTotalDelegatedTasks}) reached`,
    };
  }

  return { allowed: true, currentCount, totalDelegated };
}

/**
 * Admit a specialist to the run.
 */
export async function admitSpecialist(
  db: DbClient,
  runId: string,
  sequence: number,
  specialistId: string,
  limits: RunLimits,
  role: 'primary' | 'secondary' | 'reviewer' = 'primary',
  callerRole: 'parent' | 'specialist' = 'parent'
): Promise<{ success: boolean; checkpoint?: Checkpoint; error?: string }> {
  // Enforce parent-only delegation (specialist cannot delegate)
  if (callerRole !== 'parent') {
    return {
      success: false,
      error: 'Delegation policy violation: specialists cannot delegate; only parent may delegate',
    };
  }

  const check = await canAdmitSpecialist(db, runId, sequence, limits);
  if (!check.allowed) {
    return { success: false, error: check.error };
  }

  const existingCp = await loadCheckpoint(db, runId, sequence);
  let stateObj: any = {};
  if (existingCp?.stateData) {
    try {
      stateObj = typeof existingCp.stateData === 'string' ? JSON.parse(existingCp.stateData) : existingCp.stateData;
    } catch {
      stateObj = {};
    }
  }

  const sironaGraph = stateObj.sironaGraph || {};
  const currentSpecialists: AgentAssignment[] = sironaGraph.specialists || [];

  // Check if specialistId already assigned
  if (currentSpecialists.some(s => s.specialistId === specialistId)) {
    return {
      success: false,
      error: `Specialist ${specialistId} is already assigned to this run`,
    };
  }

  const newAssignment: AgentAssignment = {
    specialistId,
    role,
    assignedAt: new Date(),
    taskScope: 'P5 bounded delegation',
  };

  const specialistsMap = new Map<string, AgentAssignment>();
  for (const s of currentSpecialists) {
    specialistsMap.set(s.specialistId, s);
  }
  specialistsMap.set(specialistId, newAssignment);

  const counters = sironaGraph.counters || stateObj.counters || { critiqueRounds: 0, repairRounds: 0, delegatedTasks: 0 };
  counters.delegatedTasks = (counters.delegatedTasks || 0) + 1;

  const proposalsMap = new Map<string, SpecialistProposal>();
  if (sironaGraph.specialistProposals) {
    for (const p of sironaGraph.specialistProposals) {
      proposalsMap.set(p.specialistId, p);
    }
  }

  try {
    const updated = await persistCheckpoint(
      db,
      runId,
      sequence,
      GraphState.ACTIVE,
      specialistsMap,
      sironaGraph.parentDelegation,
      proposalsMap,
      sironaGraph.specialistJoin,
      sironaGraph.humanApproval,
      counters,
      limits,
      existingCp?.id
    );

    return { success: true, checkpoint: updated };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Release a specialist slot after task completion or failure.
 */
export async function releaseSpecialist(
  db: DbClient,
  runId: string,
  sequence: number,
  specialistId: string
): Promise<{ success: boolean; checkpoint?: Checkpoint; error?: string }> {
  const existingCp = await loadCheckpoint(db, runId, sequence);
  if (!existingCp) {
    return { success: false, error: 'Checkpoint not found' };
  }

  let stateObj: any = {};
  try {
    stateObj = typeof existingCp.stateData === 'string' ? JSON.parse(existingCp.stateData) : existingCp.stateData;
  } catch {
    stateObj = {};
  }

  const sironaGraph = stateObj.sironaGraph || {};
  const currentSpecialists: AgentAssignment[] = sironaGraph.specialists || [];
  const remaining = currentSpecialists.filter(s => s.specialistId !== specialistId);

  const specialistsMap = new Map<string, AgentAssignment>();
  for (const s of remaining) {
    specialistsMap.set(s.specialistId, s);
  }

  const proposalsMap = new Map<string, SpecialistProposal>();
  if (sironaGraph.specialistProposals) {
    for (const p of sironaGraph.specialistProposals) {
      proposalsMap.set(p.specialistId, p);
    }
  }

  try {
    const updated = await persistCheckpoint(
      db,
      runId,
      sequence,
      GraphState.ACTIVE,
      specialistsMap,
      sironaGraph.parentDelegation,
      proposalsMap,
      sironaGraph.specialistJoin,
      sironaGraph.humanApproval,
      sironaGraph.counters || { critiqueRounds: 0, repairRounds: 0, delegatedTasks: 0 },
      sironaGraph.limits,
      existingCp.id
    );

    return { success: true, checkpoint: updated };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Fanout: parent delegates to multiple specialists in parallel (up to maxParallelSpecialists).
 */
export async function fanoutToSpecialists(
  db: DbClient,
  runId: string,
  sequence: number,
  specialistIds: string[],
  delegation: { taskDescription: string; specialistRequirements: any; justification: string },
  limits: RunLimits,
  callerRole: 'parent' | 'specialist' = 'parent'
): Promise<{ success: boolean; checkpoint?: Checkpoint; error?: string }> {
  if (callerRole !== 'parent') {
    return { success: false, error: 'Specialists cannot perform fanout' };
  }

  if (specialistIds.length > limits.maxParallelSpecialists) {
    return {
      success: false,
      error: `Cannot fanout to ${specialistIds.length} specialists, max is ${limits.maxParallelSpecialists}`,
    };
  }

  const existingCp = await loadCheckpoint(db, runId, sequence);
  const specialistsMap = new Map<string, AgentAssignment>();
  for (const sid of specialistIds) {
    specialistsMap.set(sid, {
      specialistId: sid,
      role: 'primary',
      assignedAt: new Date(),
      taskScope: delegation.taskDescription,
    });
  }

  const parentDelegation: ParentDelegation = {
    type: 'delegate',
    taskDescription: delegation.taskDescription,
    specialistRequirements: {
      maxConcurrent: limits.maxParallelSpecialists,
      outputLimits: {
        maxTokens: 8192,
        maxDurationSeconds: limits.specialistInvocationDeadlineSeconds,
        contextOutputCap: 4096,
      },
      justification: delegation.justification,
    },
    nonce: crypto.randomUUID(),
    approved: true,
  };

  const proposalsMap = new Map<string, SpecialistProposal>();
  for (const sid of specialistIds) {
    proposalsMap.set(sid, {
      type: 'propose',
      specialistId: sid,
      taskId: crypto.randomUUID(),
      output: '',
      usage: { tokens: 0, costMicroUsd: 0 },
      status: 'pending',
    });
  }

  const counters = {
    critiqueRounds: 0,
    repairRounds: 0,
    delegatedTasks: specialistIds.length,
  };

  try {
    const updated = await persistCheckpoint(
      db,
      runId,
      sequence,
      GraphState.ACTIVE,
      specialistsMap,
      parentDelegation,
      proposalsMap,
      undefined,
      undefined,
      counters,
      limits,
      existingCp?.id
    );

    return { success: true, checkpoint: updated };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Join: merge specialist outputs after all have completed.
 */
export async function joinSpecialistOutputs(
  db: DbClient,
  runId: string,
  sequence: number,
  taskIds: string[],
  mergedOutput: string,
  consensus: boolean
): Promise<{ success: boolean; checkpoint?: Checkpoint; error?: string }> {
  const existingCp = await loadCheckpoint(db, runId, sequence);
  if (!existingCp) {
    return { success: false, error: 'Checkpoint not found' };
  }

  let stateObj: any = {};
  try {
    stateObj = typeof existingCp.stateData === 'string' ? JSON.parse(existingCp.stateData) : existingCp.stateData;
  } catch {
    stateObj = {};
  }

  const sironaGraph = stateObj.sironaGraph || {};
  sironaGraph.specialistJoin = {
    type: 'join',
    taskIds,
    mergedOutput,
    consensus,
  };
  sironaGraph.state = GraphState.COMPLETED;
  stateObj.state = GraphState.COMPLETED;
  stateObj.sironaGraph = sironaGraph;

  const newStateData = JSON.stringify(stateObj);
  const newDigest = computeStateDigest(stateObj);

  await db.query(
    `UPDATE run_checkpoints
     SET epoch = $1, state_digest = $2, state_data = $3::jsonb
     WHERE run_id = $4 AND sequence = $5`,
    [Date.now(), newDigest, newStateData, runId, sequence]
  );

  return {
    success: true,
    checkpoint: {
      ...existingCp,
      stateDigest: newDigest,
      stateData: newStateData,
    },
  };
}

/**
 * Record a specialist proposal.
 */
export async function recordSpecialistProposal(
  db: DbClient,
  runId: string,
  sequence: number,
  specialistId: string,
  proposal: SpecialistProposal
): Promise<{ success: boolean; checkpoint?: Checkpoint; error?: string }> {
  const existingCp = await loadCheckpoint(db, runId, sequence);
  if (!existingCp) {
    return { success: false, error: 'Checkpoint not found' };
  }

  let stateObj: any = {};
  try {
    stateObj = typeof existingCp.stateData === 'string' ? JSON.parse(existingCp.stateData) : existingCp.stateData;
  } catch {
    stateObj = {};
  }

  const sironaGraph = stateObj.sironaGraph || {};
  if (!sironaGraph.specialistProposals) {
    sironaGraph.specialistProposals = [];
  }

  // Update or insert proposal for specialistId
  const proposals: SpecialistProposal[] = sironaGraph.specialistProposals;
  const idx = proposals.findIndex(p => p.specialistId === specialistId);
  if (idx >= 0) {
    proposals[idx] = proposal;
  } else {
    proposals.push(proposal);
  }
  sironaGraph.specialistProposals = proposals;
  stateObj.sironaGraph = sironaGraph;

  const newStateData = JSON.stringify(stateObj);
  const newDigest = computeStateDigest(stateObj);

  await db.query(
    `UPDATE run_checkpoints
     SET epoch = $1, state_digest = $2, state_data = $3::jsonb
     WHERE run_id = $4 AND sequence = $5`,
    [Date.now(), newDigest, newStateData, runId, sequence]
  );

  return {
    success: true,
    checkpoint: {
      ...existingCp,
      stateDigest: newDigest,
      stateData: newStateData,
    },
  };
}

/**
 * Record human approval.
 */
export async function recordHumanApproval(
  db: DbClient,
  runId: string,
  sequence: number,
  approval: { approvalId: string; approved: boolean; reason?: string; nonce: string }
): Promise<{ success: boolean; checkpoint?: Checkpoint; error?: string }> {
  const existingCp = await loadCheckpoint(db, runId, sequence);
  if (!existingCp) {
    return { success: false, error: 'Checkpoint not found' };
  }

  let stateObj: any = {};
  try {
    stateObj = typeof existingCp.stateData === 'string' ? JSON.parse(existingCp.stateData) : existingCp.stateData;
  } catch {
    stateObj = {};
  }

  const sironaGraph = stateObj.sironaGraph || {};
  sironaGraph.humanApproval = {
    type: 'approve',
    approvalId: approval.approvalId,
    approved: approval.approved,
    reason: approval.reason,
    nonce: approval.nonce,
  };
  stateObj.sironaGraph = sironaGraph;

  const newStateData = JSON.stringify(stateObj);
  const newDigest = computeStateDigest(stateObj);

  await db.query(
    `UPDATE run_checkpoints
     SET epoch = $1, state_digest = $2, state_data = $3::jsonb
     WHERE run_id = $4 AND sequence = $5`,
    [Date.now(), newDigest, newStateData, runId, sequence]
  );

  return {
    success: true,
    checkpoint: {
      ...existingCp,
      stateDigest: newDigest,
      stateData: newStateData,
    },
  };
}

export default {
  canAdmitSpecialist,
  admitSpecialist,
  releaseSpecialist,
  fanoutToSpecialists,
  joinSpecialistOutputs,
  recordSpecialistProposal,
  recordHumanApproval,
};
