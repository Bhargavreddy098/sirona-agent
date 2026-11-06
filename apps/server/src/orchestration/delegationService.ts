import crypto from 'node:crypto';
import {requireProjectIdentity,requireRunApproval,ExecutionBoundaryError} from '../security/executionPolicy.js';
import type {TransactionClient} from '../db/transactionAdapter.js';
import {computeStateDigest,type DbClient} from './checkpointAdapter.js';

/** Admission is serialized across processes. Caller roles and model output carry no authority. */
export class DurableDelegation {
  constructor(private readonly database:DbClient) {}
  async admit(input:{runId:string;projectId:string;parentId:string;key:string;purpose:string;modelId:string;identity:unknown}) {
    if(!this.database.transaction)throw new Error('GRAPH_TRANSACTION_OWNER_REQUIRED');
    if(!/^[a-zA-Z0-9:_-]{1,80}$/.test(input.key)||!input.purpose.trim()||input.purpose.length>32768||!input.modelId)throw new ExecutionBoundaryError('INVALID_ASSIGNMENT',400,'Bounded specialist assignment required');
    return this.database.transaction(async raw=>{
      const c=raw as TransactionClient;
      await c.query('SELECT pg_advisory_xact_lock(8115,1)'); // Home-wide three-specialist admission lock.
      await requireProjectIdentity(c,input.projectId,input.identity);
      const run=(await c.query('SELECT * FROM runs WHERE id=$1 AND project_id=$2 FOR UPDATE',[input.runId,input.projectId])).rows[0];
      if(!run||run.state!=='running')throw new ExecutionBoundaryError('RUN_NOT_RUNNING',409,'Run is not executable');
      if(Date.now()-new Date(run.created_at).getTime()>=1800000)throw new ExecutionBoundaryError('RUN_DEADLINE',409,'Run deadline exceeded');
      await requireRunApproval(c,input.runId);
      const parent=(await c.query("SELECT id FROM agent_sessions WHERE id=$1 AND run_id=$2 AND role='p5_parent' AND state='active' FOR UPDATE",[input.parentId,input.runId])).rows[0];
      if(!parent)throw new ExecutionBoundaryError('DELEGATION_FORBIDDEN',403,'Only the run parent can delegate');
      const key='p5:'+input.key;
      const existing=(await c.query('SELECT t.*,a.id AS agent_id FROM tasks t JOIN agent_sessions a ON a.task_id=t.id AND a.run_id=t.run_id WHERE t.run_id=$1 AND t.step_key=$2',[input.runId,key])).rows[0];
      if(existing){
        const assignment=(await c.query('SELECT usage_summary FROM agent_sessions WHERE id=$1',[existing.agent_id])).rows[0].usage_summary.assignment;
        if(computeStateDigest(assignment)!==computeStateDigest({purpose:input.purpose,modelId:input.modelId,parentId:input.parentId}))throw new ExecutionBoundaryError('IDEMPOTENCY_CONFLICT',409,'Assignment key changed');
        return {taskId:existing.id,agentId:existing.agent_id,state:existing.state,replay:true};
      }
      const active=(await c.query("SELECT COUNT(*)::int AS count FROM agent_sessions WHERE role='p5_specialist' AND state='active'")).rows[0].count;
      if(active>=3)throw new ExecutionBoundaryError('SPECIALIST_POOL_FULL',409,'Three specialists are already active');
      const total=(await c.query("SELECT COUNT(*)::int AS count FROM tasks WHERE run_id=$1 AND step_key LIKE 'p5:%'",[input.runId])).rows[0].count;
      if(total>=12)throw new ExecutionBoundaryError('DELEGATION_LIMIT',409,'Twelve delegated tasks already admitted');
      const taskId=crypto.randomUUID(),agentId=crypto.randomUUID();
      await c.query("INSERT INTO tasks(id,run_id,step_key,state,max_attempts,deadline_at) VALUES($1,$2,$3,'pending',3,LEAST(NOW()+INTERVAL '120 seconds',$4::timestamptz+INTERVAL '30 minutes'))",[taskId,input.runId,key,run.created_at]);
      await c.query("INSERT INTO agent_sessions(id,run_id,task_id,role,state,capabilities,usage_summary,deadline_at) VALUES($1,$2,$3,'p5_specialist','active','[]',$4::jsonb,NOW()+INTERVAL '120 seconds')",[agentId,input.runId,taskId,JSON.stringify({assignment:{purpose:input.purpose,modelId:input.modelId,parentId:input.parentId}})]);
      return {taskId,agentId,state:'pending',replay:false};
    });
  }
}

