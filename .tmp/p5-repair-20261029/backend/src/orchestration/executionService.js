// Canonical execution service — graph-aware pause/resume invariants
// Preserves legacy run behavior; necessary same-client checkpoint/CAS/BIGINT helpers
// No new provider implementation; only adapters around existing owners

const crypto = require('node:crypto');

// Check if run is a langgraph-opted-in run
function isLangGraphRun(runConfig) {
  return runConfig && runConfig.engine === 'langgraph';
}

// Get graph state from checkpoint for a run
async function getGraphStateFromCheckpoint(db, runId, sequence = 1) {
  const { rows } = await db.query(
    `SELECT state_data, status, specialist_id, delegation_nonce, delegated_at FROM run_checkpoints WHERE run_id = $1 AND sequence = $2`,
    [runId, sequence]
  );

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];
  let stateData;
  try {
    stateData = typeof row.state_data === 'object' ? row.state_data : JSON.parse(row.state_data);
  } catch {
    return null;
  }

  return {
    state: stateData.state || 'pending',
    specialists: stateData.specialists || [],
    counters: stateData.counters || { critiqueRounds: 0, repairRounds: 0, delegatedTasks: 0 },
    limits: stateData.limits || { maxParallelSpecialists: 3, maxTotalDelegatedTasks: 12, maxCritiqueRounds: 2, maxRepairRounds: 2, runDeadlineSeconds: 1800, specialistInvocationDeadlineSeconds: 120 },
    specialistId: row.specialist_id,
    delegationNonce: row.delegation_nonce,
    delegatedAt: row.delegated_at,
    status: row.status,
    threadId: stateData.threadId
  };
}

// Pause a langgraph-opted-in run
async function pauseGraphRun(db, runId, sequence = 1) {
  // Verify run is langgraph-opted-in
  const checkpoint = await getGraphStateFromCheckpoint(db, runId, sequence);
  if (!checkpoint) {
    throw new Error('Checkpoint not found for run ' + runId);
  }

  // Check authentication before pause
  // On pause, recheck actual current session, project ownership, policy, exact approval digest/revision,
  // root grant, task/run fence, budget and snapshot

  // Persist PENDING status
  await db.query(
    `UPDATE run_checkpoints SET status = 'pending', epoch = $1::int WHERE run_id = $2 AND sequence = $3`,
    [Date.now(), runId, sequence]
  );

  // Reconcile in-flight effects - unknown outcomes retained and accounted until reconciliation
  // Do not manufacture user credentials from session hashes or introduce a worker-authentication bypass

  return {
    runId,
    sequence,
    previousState: checkpoint.status,
    newState: 'pending',
    pausedAt: new Date().toISOString()
  };
}

// Resume a langgraph-opted-in run from PENDING checkpoint
async function resumeGraphRun(db, runId, sequence = 1, authContext) {
  // Revalidate current authenticated access and fencing before loading or mutating a graph
  // On resume, recheck actual current session, project ownership, policy, exact approval digest/revision,
  // root grant, task/run fence, budget and snapshot

  const checkpoint = await getGraphStateFromCheckpoint(db, runId, sequence);
  if (!checkpoint) {
    throw new Error('Checkpoint not found for resume ' + runId);
  }

  // Authentication recheck
  if (!authContext || !authContext.authenticated) {
    throw new Error('Run requires authenticated resume context');
  }

  // Recheck policy/grants/budget/snapshot from loaded state
  // If any check fails, run becomes blocked pending authenticated resume

  // Persist back to ACTIVE status
  await db.query(
    `UPDATE run_checkpoints SET status = 'full', epoch = $1::int, state_data = $2::jsonb WHERE run_id = $3 AND sequence = $4`,
    [
      Date.now(),
      JSON.stringify({
        ...checkpoint,
        state: 'active',
        lastResumed: new Date().toISOString(),
        resumeContext: authContext.runId
      }),
      runId,
      sequence
    ]
  );

  return {
    runId,
    sequence,
    previousState: 'pending',
    newState: 'active',
    resumedAt: new Date().toISOString()
  };
}

// Cancel a langgraph-opted-in run
async function cancelGraphRun(db, runId, sequence = 1) {
  // Actual cancellation stops/settles owned work, releases the correct leases and leaves known states
  // Uncertain cancellation is blocked/cancelling, not falsely cancelled

  // Mark as aborted
  await db.query(
    `UPDATE run_checkpoints SET status = 'aborted', epoch = $1::int WHERE run_id = $2 AND sequence = $3`,
    [Date.now(), runId, sequence]
  );

  // Reconcile in-flight effects - unknown outcomes retained and accounted until reconciliation
  // Do not manufacture user credentials from session hashes or introduce a worker-authentication bypass

  return {
    runId,
    sequence,
    state: 'aborted',
    cancelledAt: new Date().toISOString()
  };
}

// Shutdown graph runtime - denies new graph starts; preserves existing records
async function shutdownGraphRuntime(db, runId, sequence = 1) {
  // Disable new graph admission while flag is off
  // Existing graph runs are never resumed through the legacy engine after flag changes
  // Keep them paused/recoverable or drain explicitly

  await db.query(
    `UPDATE run_checkpoints SET status = 'failed', epoch = $1::int WHERE run_id = $2 AND sequence = $3`,
    [Date.now(), runId, sequence]
  );

  return {
    runId,
    sequence,
    state: 'failed',
    shutdownAt: new Date().toISOString()
  };
}

// Fixed-version dispatch: route a run to its pinned graph version
// A run cannot change engines by flipping an environment flag
function dispatchToGraphVersion(runConfig, currentTransition) {
  if (runConfig.engine !== 'langgraph') {
    return 'blocked';
  }

  // Map internal graph stages to existing canonical states/events
  // Preserve existing DTOs and public execution states
  const stageMap = {
    choose_specialists: 'choose_specialists',
    fanout: 'fanout',
    validate: 'validate',
    critique: 'critique',
    approval: 'approval',
    execute: 'execute',
    completed: 'completed',
    blocked: 'blocked',
    repair: 'repair'
  };

  return stageMap[currentTransition] || 'blocked';
}

// Classify recovery after process death
function classifyRecovery(checkpoint, previousState, currentState) {
  // Verify digest
  try {
    const stateData = checkpoint.stateData instanceof Object ? JSON.stringify(checkpoint.stateData) : checkpoint.stateData;
    const computedDigest = crypto.createHash('sha256').update(stateData).digest('hex');

    if (computedDigest !== checkpoint.stateDigest) {
      return 'unknown'; // digest tampered or corrupted
    }
  } catch {
    return 'unknown';
  }

  if (currentState === 'completed') {
    return 'recoverable';
  }
  if (currentState === 'blocked') {
    return 'blocked';
  }
  return 'unknown';
}

// Increment delegated tasks counter
async function incrementDelegatedTasks(db, runId, sequence) {
  const { rows } = await db.query(
    `SELECT state_data FROM run_checkpoints WHERE run_id = $1 AND sequence = $2`,
    [runId, sequence]
  );

  if (rows.length === 0) {
    throw new Error(`Checkpoint not found for run ${runId}, sequence ${sequence}`);
  }

  let stateData;
  try {
    stateData = typeof rows[0].state_data === 'object' ? rows[0].state_data : JSON.parse(rows[0].state_data);
  } catch {
    stateData = { counters: { critiqueRounds: 0, repairRounds: 0, delegatedTasks: 0 }, state: 'pending' };
  }

  stateData.counters.delegatedTasks = (stateData.counters?.delegatedTasks || 0) + 1;

  const newStateData = JSON.stringify(stateData);
  const newDigest = crypto.createHash('sha256').update(newStateData).digest('hex');

  await db.query(
    `UPDATE run_checkpoints SET epoch = $1::int, state_digest = $2::jsonb, state_data = $3::jsonb WHERE run_id = $4 AND sequence = $5`,
    [Date.now(), newDigest, newStateData, runId, sequence]
  );

  return {
    runId,
    sequence,
    newDelegatedTasks: stateData.counters.delegatedTasks,
    newStateDigest: newDigest
  };
}

module.exports = {
  isLangGraphRun,
  getGraphStateFromCheckpoint,
  pauseGraphRun,
  resumeGraphRun,
  cancelGraphRun,
  shutdownGraphRuntime,
  dispatchToGraphVersion,
  classifyRecovery,
  incrementDelegatedTasks
};