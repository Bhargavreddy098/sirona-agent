import type pg from 'pg';
import crypto from 'node:crypto';
import { BaseCheckpointSaver, type Checkpoint as LangGraphCheckpoint, type CheckpointMetadata, type CheckpointTuple, type PendingWrite } from '@langchain/langgraph-checkpoint';
import type { RunnableConfig } from '@langchain/core/runnables';
import {
  GraphState,
  RunLimits,
  SpecialistProposal,
  SpecialistJoin,
  HumanApproval,
  Checkpoint,
  AgentAssignment,
  ParentDelegation,
} from './graphContracts.js';

export interface DbClient {
  query: (sql: string, params?: any[]) => Promise<any>;
}

export const CheckpointKind = {
  FULL: 'full',
  PENDING: 'pending',
  ABORTED: 'aborted',
  FAILED: 'failed',
} as const;

export type CheckpointKind = typeof CheckpointKind[keyof typeof CheckpointKind];

function canonicalize(val: any): any {
  if (val === null || typeof val !== 'object') return val;
  if (val instanceof Date) return val.toISOString();
  if (Array.isArray(val)) return val.map(canonicalize);
  const sorted: Record<string, any> = {};
  for (const key of Object.keys(val).sort()) {
    sorted[key] = canonicalize(val[key]);
  }
  return sorted;
}

export function computeStateDigest(data: any): string {
  try {
    const jsonStr = typeof data === 'string' ? data : JSON.stringify(data);
    const parsed = JSON.parse(jsonStr);
    const canonical = JSON.stringify(canonicalize(parsed));
    return crypto.createHash('sha256').update(canonical).digest('hex');
  } catch {
    return crypto.createHash('sha256').update(String(data)).digest('hex');
  }
}

/**
 * Persist a checkpoint to the existing run_checkpoints table.
 * Zero new columns: all graph metadata lives in state_data.sironaGraph JSONB.
 */
export async function persistCheckpoint(
  db: DbClient,
  runId: string,
  sequence: number,
  state: GraphState,
  specialists: Map<string, AgentAssignment | { specialistId: string; role: string; assignedAt: Date }> = new Map(),
  parentDelegation?: ParentDelegation,
  specialistProposals: Map<string, SpecialistProposal> = new Map(),
  specialistJoin?: SpecialistJoin,
  humanApproval?: HumanApproval,
  counters: { critiqueRounds: number; repairRounds: number; delegatedTasks: number } = { critiqueRounds: 0, repairRounds: 0, delegatedTasks: 0 },
  limits: RunLimits = {
    maxParallelSpecialists: 3,
    maxTotalDelegatedTasks: 12,
    maxCritiqueRounds: 2,
    maxRepairRounds: 2,
    runDeadlineSeconds: 1800,
    specialistInvocationDeadlineSeconds: 120,
  },
  checkpointId?: string,
  status: CheckpointKind = CheckpointKind.FULL,
  pendingWrites: string[] = []
): Promise<Checkpoint> {
  const resolvedId = checkpointId || crypto.randomUUID();
  const epoch = Date.now();
  const createdAt = new Date();

  const firstSpecialist = specialists.values().next().value;
  const specialistId = firstSpecialist ? firstSpecialist.specialistId : null;
  const delegationNonce = parentDelegation?.nonce || null;
  const delegatedAt = parentDelegation ? createdAt : null;

  const sironaGraph = {
    version: '1.0.0',
    namespace: 'state_data.sironaGraph',
    runId,
    sequence,
    state,
    status,
    specialistId,
    delegationNonce,
    delegatedAt: delegatedAt ? delegatedAt.toISOString() : null,
    specialists: Array.from(specialists.values()),
    parentDelegation,
    specialistProposals: Array.from(specialistProposals.values()),
    specialistJoin,
    humanApproval,
    counters,
    limits,
    pendingWrites,
  };

  const statePayload = {
    sironaGraph,
    runId,
    state,
    counters,
    limits,
  };

  const stateData = JSON.stringify(statePayload);
  const stateDigest = computeStateDigest(statePayload);

  // Check if row already exists for (run_id, sequence)
  const existing = await db.query(
    `SELECT id FROM run_checkpoints WHERE run_id = $1 AND sequence = $2`,
    [runId, sequence]
  );

  if (existing.rowCount && existing.rowCount > 0) {
    await db.query(
      `UPDATE run_checkpoints
       SET epoch = $1, state_digest = $2, state_data = $3::jsonb
       WHERE run_id = $4 AND sequence = $5`,
      [epoch, stateDigest, stateData, runId, sequence]
    );
  } else {
    await db.query(
      `INSERT INTO run_checkpoints (id, run_id, sequence, epoch, state_digest, state_data, created_at)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)`,
      [resolvedId, runId, sequence, epoch, stateDigest, stateData, createdAt]
    );
  }

  return {
    id: resolvedId,
    runId,
    sequence,
    epoch,
    stateDigest,
    stateData,
    pendingWrites,
    createdAt,
    status,
    specialistId,
    delegationNonce,
    delegatedAt,
  };
}

/**
 * Load a checkpoint from the existing run_checkpoints table.
 * Verifies SHA-256 digest integrity and extracts sironaGraph metadata.
 */
export async function loadCheckpoint(
  db: DbClient,
  runId: string,
  sequence: number
): Promise<Checkpoint | null> {
  const result = await db.query(
    `SELECT id, run_id, sequence, epoch, state_digest, state_data, created_at
     FROM run_checkpoints
     WHERE run_id = $1 AND sequence = $2`,
    [runId, sequence]
  );

  if (!result.rowCount || result.rowCount === 0) {
    return null;
  }

  const row = result.rows[0];
  const storedData = typeof row.state_data === 'string' ? row.state_data : JSON.stringify(row.state_data);
  const computedDigest = computeStateDigest(row.state_data);

  if (computedDigest !== row.state_digest) {
    throw new Error(`Checkpoint digest mismatch for run ${runId}, sequence ${sequence}`);
  }

  const parsed = typeof row.state_data === 'object' ? row.state_data : JSON.parse(storedData);
  const sironaGraph = parsed?.sironaGraph || {};

  return {
    id: row.id,
    runId: row.run_id,
    sequence: Number(row.sequence),
    epoch: Number(row.epoch),
    stateDigest: row.state_digest,
    stateData: storedData,
    pendingWrites: sironaGraph.pendingWrites || [],
    createdAt: new Date(row.created_at),
    status: sironaGraph.status || CheckpointKind.FULL,
    specialistId: sironaGraph.specialistId || null,
    delegationNonce: sironaGraph.delegationNonce || null,
    delegatedAt: sironaGraph.delegatedAt ? new Date(sironaGraph.delegatedAt) : null,
  };
}

/**
 * Persist pending writes for an interrupted task within the checkpoint.
 */
export async function persistPendingWrite(
  db: DbClient,
  runId: string,
  sequence: number,
  writeKey: string,
  writeData: string
): Promise<void> {
  const checkpoint = await loadCheckpoint(db, runId, sequence);
  const existingWrites = checkpoint?.pendingWrites || [];
  if (!existingWrites.includes(writeKey)) {
    existingWrites.push(writeKey);
  }

  let stateObj: any = {};
  if (checkpoint?.stateData) {
    try {
      stateObj = typeof checkpoint.stateData === 'string' ? JSON.parse(checkpoint.stateData) : checkpoint.stateData;
    } catch {
      stateObj = {};
    }
  }

  if (!stateObj.sironaGraph) stateObj.sironaGraph = {};
  stateObj.sironaGraph.pendingWrites = existingWrites;
  if (!stateObj.sironaGraph.pendingData) stateObj.sironaGraph.pendingData = {};
  stateObj.sironaGraph.pendingData[writeKey] = writeData;

  const newStateData = JSON.stringify(stateObj);
  const newDigest = computeStateDigest(stateObj);

  if (checkpoint) {
    await db.query(
      `UPDATE run_checkpoints
       SET epoch = $1, state_digest = $2, state_data = $3::jsonb
       WHERE run_id = $4 AND sequence = $5`,
      [Date.now(), newDigest, newStateData, runId, sequence]
    );
  } else {
    await db.query(
      `INSERT INTO run_checkpoints (id, run_id, sequence, epoch, state_digest, state_data, created_at)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)`,
      [crypto.randomUUID(), runId, sequence, Date.now(), newDigest, newStateData, new Date()]
    );
  }
}

/**
 * Load pending writes from a checkpoint.
 */
export async function loadPendingWrites(
  db: DbClient,
  runId: string,
  sequence: number
): Promise<string[]> {
  const checkpoint = await loadCheckpoint(db, runId, sequence);
  return checkpoint?.pendingWrites || [];
}

/**
 * Increment delegated tasks counter and persist updated checkpoint.
 */
export async function incrementDelegatedTasks(
  db: DbClient,
  runId: string,
  sequence: number
): Promise<Checkpoint> {
  const checkpoint = await loadCheckpoint(db, runId, sequence);
  if (!checkpoint) {
    throw new Error(`Checkpoint not found for run ${runId}, sequence ${sequence}`);
  }

  let stateObj: any;
  try {
    stateObj = typeof checkpoint.stateData === 'string' ? JSON.parse(checkpoint.stateData) : checkpoint.stateData;
  } catch {
    stateObj = { counters: { critiqueRounds: 0, repairRounds: 0, delegatedTasks: 0 }, state: 'pending' };
  }

  if (!stateObj.counters) {
    stateObj.counters = { critiqueRounds: 0, repairRounds: 0, delegatedTasks: 0 };
  }
  stateObj.counters.delegatedTasks = (stateObj.counters.delegatedTasks || 0) + 1;
  if (stateObj.sironaGraph?.counters) {
    stateObj.sironaGraph.counters.delegatedTasks = stateObj.counters.delegatedTasks;
  }

  const newStateData = JSON.stringify(stateObj);
  const newDigest = computeStateDigest(stateObj);

  await db.query(
    `UPDATE run_checkpoints
     SET epoch = $1, state_digest = $2, state_data = $3::jsonb
     WHERE run_id = $4 AND sequence = $5`,
    [Date.now(), newDigest, newStateData, runId, sequence]
  );

  return {
    ...checkpoint,
    epoch: Date.now(),
    stateDigest: newDigest,
    stateData: newStateData,
  };
}

/**
 * Reset checkpoint status (e.g. pending/aborted/failed).
 */
export async function resetCheckpointStatus(
  db: DbClient,
  runId: string,
  sequence: number,
  newStatus: CheckpointKind
): Promise<void> {
  const checkpoint = await loadCheckpoint(db, runId, sequence);
  if (!checkpoint) {
    throw new Error(`Checkpoint not found for run ${runId}, sequence ${sequence}`);
  }

  let stateObj: any;
  try {
    stateObj = typeof checkpoint.stateData === 'string' ? JSON.parse(checkpoint.stateData) : checkpoint.stateData;
  } catch {
    stateObj = {};
  }

  if (!stateObj.sironaGraph) stateObj.sironaGraph = {};
  stateObj.sironaGraph.status = newStatus;
  stateObj.status = newStatus;

  const newStateData = JSON.stringify(stateObj);
  const newDigest = computeStateDigest(stateObj);

  await db.query(
    `UPDATE run_checkpoints
     SET epoch = $1, state_digest = $2, state_data = $3::jsonb
     WHERE run_id = $4 AND sequence = $5`,
    [Date.now(), newDigest, newStateData, runId, sequence]
  );
}

/**
 * LangGraph BaseCheckpointSaver implementation backed by PostgreSQL run_checkpoints.
 */
export class SironaPostgresSaver extends BaseCheckpointSaver {
  private db: DbClient;

  constructor(db: DbClient) {
    super();
    this.db = db;
  }

  async getTuple(config: RunnableConfig): Promise<CheckpointTuple | undefined> {
    const threadId = config.configurable?.thread_id;
    const checkpointId = config.configurable?.checkpoint_id;
    const runId = config.configurable?.run_id || threadId;
    if (!runId) return undefined;

    const sequence = config.configurable?.checkpoint_ns ? Number(config.configurable.checkpoint_ns) : 1;
    const cp = await loadCheckpoint(this.db, runId, sequence);
    if (!cp) return undefined;

    let parsedState: any = {};
    try {
      parsedState = typeof cp.stateData === 'string' ? JSON.parse(cp.stateData) : cp.stateData;
    } catch {
      parsedState = {};
    }

    const langgraphCheckpoint: LangGraphCheckpoint = {
      v: 1,
      id: cp.id,
      ts: cp.createdAt.toISOString(),
      channel_values: parsedState.channel_values || {},
      channel_versions: parsedState.channel_versions || {},
      versions_seen: parsedState.versions_seen || {},
      pending_sends: [],
    };

    return {
      config: {
        configurable: {
          thread_id: threadId,
          checkpoint_id: cp.id,
          checkpoint_ns: String(cp.sequence),
          run_id: cp.runId,
        },
      },
      checkpoint: langgraphCheckpoint,
      metadata: { source: 'update', step: cp.sequence, writes: {}, parents: {} },
      pendingWrites: [],
    };
  }

  async *list(config: RunnableConfig): AsyncGenerator<CheckpointTuple> {
    const threadId = config.configurable?.thread_id;
    const runId = config.configurable?.run_id || threadId;
    if (!runId) return;

    const res = await this.db.query(
      `SELECT sequence FROM run_checkpoints WHERE run_id = $1 ORDER BY sequence DESC`,
      [runId]
    );

    for (const row of res.rows) {
      const tuple = await this.getTuple({
        configurable: {
          thread_id: threadId,
          run_id: runId,
          checkpoint_ns: String(row.sequence),
        },
      });
      if (tuple) yield tuple;
    }
  }

  async put(
    config: RunnableConfig,
    checkpoint: LangGraphCheckpoint,
    metadata: CheckpointMetadata
  ): Promise<RunnableConfig> {
    const threadId = config.configurable?.thread_id;
    const runId = config.configurable?.run_id || threadId;
    const sequence = config.configurable?.checkpoint_ns ? Number(config.configurable.checkpoint_ns) : 1;

    const sironaGraph = {
      version: '1.0.0',
      namespace: 'state_data.sironaGraph',
      runId,
      sequence,
      langgraphCheckpoint: checkpoint,
      metadata,
    };

    const statePayload = {
      sironaGraph,
      channel_values: checkpoint.channel_values,
      channel_versions: checkpoint.channel_versions,
      versions_seen: checkpoint.versions_seen,
    };
    const stateData = JSON.stringify(statePayload);
    const stateDigest = computeStateDigest(statePayload);
    const epoch = Date.now();

    const existing = await this.db.query(
      `SELECT id FROM run_checkpoints WHERE run_id = $1 AND sequence = $2`,
      [runId, sequence]
    );

    if (existing.rowCount && existing.rowCount > 0) {
      await this.db.query(
        `UPDATE run_checkpoints
         SET epoch = $1, state_digest = $2, state_data = $3::jsonb
         WHERE run_id = $4 AND sequence = $5`,
        [epoch, stateDigest, stateData, runId, sequence]
      );
    } else {
      await this.db.query(
        `INSERT INTO run_checkpoints (id, run_id, sequence, epoch, state_digest, state_data, created_at)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)`,
        [checkpoint.id || crypto.randomUUID(), runId, sequence, epoch, stateDigest, stateData, new Date()]
      );
    }

    return {
      configurable: {
        thread_id: threadId,
        checkpoint_id: checkpoint.id,
        checkpoint_ns: String(sequence),
        run_id: runId,
      },
    };
  }

  async putWrites(config: RunnableConfig, writes: PendingWrite[], taskId: string): Promise<void> {
    const runId = config.configurable?.run_id || config.configurable?.thread_id;
    const sequence = config.configurable?.checkpoint_ns ? Number(config.configurable.checkpoint_ns) : 1;
    if (!runId) return;

    for (const [channel, value] of writes) {
      await persistPendingWrite(this.db, runId, sequence, `${taskId}:${channel}`, JSON.stringify(value));
    }
  }
}

export default {
  persistCheckpoint,
  loadCheckpoint,
  persistPendingWrite,
  loadPendingWrites,
  incrementDelegatedTasks,
  resetCheckpointStatus,
  SironaPostgresSaver,
  CheckpointKind,
};
