import crypto from 'node:crypto';
import { BaseCheckpointSaver,TASKS, type Checkpoint as LangGraphCheckpoint, type CheckpointMetadata, type CheckpointTuple, type PendingWrite } from '@langchain/langgraph-checkpoint';
import type { RunnableConfig } from '@langchain/core/runnables';
export interface DbClient {
  query: (sql: string, params?: any[]) => Promise<any>;
  transaction?: <T>(work: (client: DbClient) => Promise<T>) => Promise<T>;
}

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

/** SDK checkpoints share the canonical table; SDK namespaces are never SQL sequences. */
export class SironaPostgresSaver extends BaseCheckpointSaver {
  private readonly pending=new Set<Promise<unknown>>();
  private failed:unknown;
  constructor(private readonly db: DbClient,private readonly expectedEpoch?:()=>string|undefined) { super(); }
  private track<T>(promise:Promise<T>):Promise<T>{
    this.pending.add(promise);
    void promise.then(()=>this.pending.delete(promise),error=>{this.failed=error;this.pending.delete(promise);});
    return promise;
  }
  /** The pinned SDK writes in the background; owners must cross this barrier before effects and shutdown. */
  async flush(){
    let idle=0;
    while(idle<2){await new Promise<void>(resolve=>setImmediate(resolve));
      if(this.pending.size){idle=0;await Promise.allSettled(this.pending);}else idle++;
    }
    if(this.failed)throw this.failed;
  }

  private scope(config: RunnableConfig) {
    const c = config.configurable ?? {};
    const runId = c.run_id ?? c.thread_id;
    if (typeof runId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(runId) || c.thread_id !== runId)
      throw new Error('GRAPH_THREAD_SCOPE_MISMATCH');
    if (typeof (c.checkpoint_ns ?? '') !== 'string'||(c.checkpoint_ns??'').length>1024) throw new Error('GRAPH_NAMESPACE_INVALID');
    return { runId, ns: c.checkpoint_ns ?? '', id: c.checkpoint_id as string | undefined };
  }

  private async locked<T>(runId: string, operation: (c: DbClient, run: any) => Promise<T>): Promise<T> {
    if (!this.db.transaction) throw new Error('GRAPH_TRANSACTION_OWNER_REQUIRED');
    return this.db.transaction(async c => {
      const run = (await c.query('SELECT id, epoch FROM runs WHERE id=$1 FOR UPDATE', [runId])).rows[0];
      if (!run) throw new Error('GRAPH_RUN_NOT_FOUND');
      const expected=this.expectedEpoch?.();
      if(expected!==undefined&&String(run.epoch)!==expected)throw new Error('GRAPH_STALE_EPOCH');
      return operation(c, run);
    });
  }

  private encode(value: unknown) {
    const [type, bytes] = this.serde.dumpsTyped(value);
    if(bytes.length>16*1024*1024)throw new Error('GRAPH_CHECKPOINT_LIMIT');
    return { type, data: Buffer.from(bytes).toString('base64') };
  }
  private decode(value: {type: string; data: string}) {
    return this.serde.loadsTyped(value.type, Buffer.from(value.data, 'base64'));
  }
  private rowGraph(row: any) {
    if (computeStateDigest(row.state_data) !== row.state_digest) throw new Error('GRAPH_CHECKPOINT_CORRUPT');
    const graph = row.state_data.sironaGraph;
    if (graph?.version !== '1.0.0' || graph.kind !== 'sdk_checkpoint') throw new Error('GRAPH_VERSION_UNSUPPORTED');
    return graph;
  }
  private config(runId: string, ns: string, id: string): RunnableConfig {
    return { configurable: { thread_id: runId, run_id: runId, checkpoint_ns: ns, checkpoint_id: id } };
  }
  private async tuple(row: any): Promise<CheckpointTuple> {
    const g = this.rowGraph(row);
    const checkpoint=await this.decode(g.checkpoint);
    if(g.parentId){
      const parent=(await this.db.query("SELECT * FROM run_checkpoints WHERE run_id=$1 AND state_data->'sironaGraph'->>'ns'=$2 AND state_data->'sironaGraph'->>'checkpointId'=$3",[row.run_id,g.ns,g.parentId])).rows[0];
      if(!parent)throw new Error('GRAPH_PARENT_CHECKPOINT_MISSING');
      const parentGraph=this.rowGraph(parent);
      checkpoint.pending_sends=await Promise.all(Object.values(parentGraph.pending??{}).filter((w:any)=>w.channel===TASKS).map((w:any)=>this.decode(w.value)));
    }
    return {
      config: this.config(row.run_id, g.ns, g.checkpointId),
      checkpoint, metadata: await this.decode(g.metadata),
      parentConfig: g.parentId ? this.config(row.run_id, g.ns, g.parentId) : undefined,
      pendingWrites: await Promise.all(Object.values(g.pending ?? {}).map(async (w: any):Promise<[string,string,unknown]> => [w.taskId, w.channel, await this.decode(w.value)])),
    };
  }
  async getTuple(config: RunnableConfig): Promise<CheckpointTuple | undefined> {
    await this.flush();
    const {runId, ns, id} = this.scope(config);
    const rows = await this.db.query(`SELECT * FROM run_checkpoints WHERE run_id=$1
      AND state_data->'sironaGraph'->>'kind'='sdk_checkpoint'
      AND state_data->'sironaGraph'->>'ns'=$2
      AND ($3::text IS NULL OR state_data->'sironaGraph'->>'checkpointId'=$3)
      ORDER BY state_data->'sironaGraph'->>'checkpointId' DESC LIMIT 1`, [runId, ns, id ?? null]);
    return rows.rows[0] ? this.tuple(rows.rows[0]) : undefined;
  }
  async *list(config: RunnableConfig, options: import('@langchain/langgraph-checkpoint').CheckpointListOptions = {}): AsyncGenerator<CheckpointTuple> {
    const {runId, ns} = this.scope(config);
    const limit = options.limit ?? 100;
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1000) throw new Error('GRAPH_LIST_LIMIT_INVALID');
    const beforeId = options.before?.configurable?.checkpoint_id ?? null;
    const result = await this.db.query(`SELECT * FROM run_checkpoints WHERE run_id=$1
      AND state_data->'sironaGraph'->>'kind'='sdk_checkpoint'
      AND state_data->'sironaGraph'->>'ns'=$2
      AND ($3::text IS NULL OR state_data->'sironaGraph'->>'checkpointId' < $3)
      ORDER BY state_data->'sironaGraph'->>'checkpointId' DESC LIMIT $4`, [runId, ns, beforeId, limit]);
    for (const row of result.rows) {
      const tuple = await this.tuple(row);
      if (!options.filter || Object.entries(options.filter).every(([k,v]) => JSON.stringify((tuple.metadata as any)?.[k]) === JSON.stringify(v))) yield tuple;
    }
  }
  async put(config: RunnableConfig, checkpoint: LangGraphCheckpoint, metadata: CheckpointMetadata): Promise<RunnableConfig> {
    if(checkpoint.v!==1)throw new Error('GRAPH_CHECKPOINT_VERSION_UNSUPPORTED');
    const {runId, ns, id: parentId} = this.scope(config);
    const checkpointValue = this.encode(checkpoint), metadataValue = this.encode(metadata);
    await this.track(this.locked(runId, async (c, run) => {
      const existing = (await c.query(`SELECT * FROM run_checkpoints WHERE run_id=$1
        AND state_data->'sironaGraph'->>'kind' IN ('sdk_checkpoint','sdk_pending_writes')
        AND state_data->'sironaGraph'->>'ns'=$2 AND state_data->'sironaGraph'->>'checkpointId'=$3`, [runId,ns,checkpoint.id])).rows;
      if (existing.length) {
        const row=existing[0];
        if(computeStateDigest(row.state_data)!==row.state_digest)throw new Error('GRAPH_CHECKPOINT_CORRUPT');
        const g=row.state_data.sironaGraph;
        if(g.version!=='1.0.0')throw new Error('GRAPH_VERSION_UNSUPPORTED');
        if(g.kind==='sdk_pending_writes'){
          const data={sironaGraph:{...g,kind:'sdk_checkpoint',parentId:parentId??null,checkpoint:checkpointValue,metadata:metadataValue}};
          await c.query('UPDATE run_checkpoints SET state_data=$2::jsonb,state_digest=$3 WHERE id=$1',[row.id,JSON.stringify(data),computeStateDigest(data)]);
          return;
        }
        if (computeStateDigest(g.checkpoint) !== computeStateDigest(checkpointValue) || computeStateDigest(g.metadata) !== computeStateDigest(metadataValue)) throw new Error('GRAPH_CHECKPOINT_CONFLICT');
        return;
      }
      const sequence = (await c.query('SELECT COALESCE(MAX(sequence),0)+1 AS next FROM run_checkpoints WHERE run_id=$1', [runId])).rows[0].next;
      const data = { sironaGraph: { version:'1.0.0', kind:'sdk_checkpoint', ns, checkpointId:checkpoint.id, parentId:parentId ?? null, checkpoint:checkpointValue, metadata:metadataValue, pending:{} } };
      await c.query('INSERT INTO run_checkpoints(id,run_id,sequence,epoch,state_digest,state_data) VALUES($1,$2,$3,$4,$5,$6::jsonb)', [crypto.randomUUID(),runId,String(sequence),String(run.epoch),computeStateDigest(data),JSON.stringify(data)]);
    }));
    return this.config(runId,ns,checkpoint.id);
  }
  async putWrites(config: RunnableConfig, writes: PendingWrite[], taskId: string): Promise<void> {
    const {runId, ns, id} = this.scope(config);
    if (!id) throw new Error('GRAPH_CHECKPOINT_ID_REQUIRED');
    await this.track(this.locked(runId, async (c,run) => {
      let row = (await c.query(`SELECT * FROM run_checkpoints WHERE run_id=$1 AND state_data->'sironaGraph'->>'ns'=$2
        AND state_data->'sironaGraph'->>'checkpointId'=$3 FOR UPDATE`, [runId,ns,id])).rows[0];
      if(!row){
        const sequence=(await c.query('SELECT COALESCE(MAX(sequence),0)+1 AS next FROM run_checkpoints WHERE run_id=$1',[runId])).rows[0].next;
        const data={sironaGraph:{version:'1.0.0',kind:'sdk_pending_writes',ns,checkpointId:id,pending:{}}};
        row=(await c.query('INSERT INTO run_checkpoints(id,run_id,sequence,epoch,state_digest,state_data) VALUES($1,$2,$3,$4,$5,$6::jsonb) RETURNING *',[crypto.randomUUID(),runId,String(sequence),String(run.epoch),computeStateDigest(data),JSON.stringify(data)])).rows[0];
      }
      if(computeStateDigest(row.state_data)!==row.state_digest)throw new Error('GRAPH_CHECKPOINT_CORRUPT');
      const g=row.state_data.sironaGraph;
      if(g.version!=='1.0.0'||!['sdk_checkpoint','sdk_pending_writes'].includes(g.kind))throw new Error('GRAPH_VERSION_UNSUPPORTED');
      const indices = (await import('@langchain/langgraph-checkpoint')).WRITES_IDX_MAP;
      for (let i=0; i<writes.length; i++) {
        const [channel,value] = writes[i];
        const index = indices[channel] ?? i;
        const key = JSON.stringify([taskId,index]);
        if (index >= 0 && g.pending[key]) continue; // SDK pending-write replay contract.
        g.pending[key] = {taskId,channel,value:this.encode(value)};
        if(Object.keys(g.pending).length>256)throw new Error('GRAPH_PENDING_WRITE_LIMIT');
      }
      await c.query('UPDATE run_checkpoints SET state_data=$2::jsonb,state_digest=$3 WHERE id=$1', [row.id,JSON.stringify(row.state_data),computeStateDigest(row.state_data)]);
    }));
  }
}

