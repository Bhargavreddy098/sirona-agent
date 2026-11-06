import {and,eq,sql} from 'drizzle-orm';
import {z} from 'zod-v4';
import {typedClient,requireReliabilityMigration,type TransactionClient} from '../db/transactionAdapter.js';
import {effects} from '../db/schema.js';
import {ExecutionBoundaryError,validate} from '../security/executionPolicy.js';
const operationSchema=z.object({runId:z.uuid(),taskId:z.uuid(),toolId:z.string().min(1).max(100),inputDigest:z.string().regex(/^[a-f0-9]{64}$/),targetSummary:z.string().max(4096),risk:z.enum(['low','medium','high','critical']).default('low'),approvalId:z.uuid().nullable().default(null),operationKey:z.string().min(1).max(128)});
export async function ensureEffect(client:TransactionClient,input:unknown){
  await requireReliabilityMigration(client);
  const value=validate(operationSchema,input),db=typedClient(client);
  const run=await db.execute(sql`SELECT id FROM runs WHERE id=${value.runId} FOR UPDATE`);
  if(!run.rows.length)throw new ExecutionBoundaryError('RUN_NOT_FOUND',404,'Run not found');
  const task=await db.execute(sql`SELECT id FROM tasks WHERE id=${value.taskId} AND run_id=${value.runId}`);
  if(!task.rows.length)throw new ExecutionBoundaryError('TASK_SCOPE_MISMATCH',409,'Task does not belong to run');
  const inserted=await db.insert(effects).values({...value,state:'pending'}).onConflictDoNothing().returning();
  const row=inserted[0]??(await db.select().from(effects).where(and(eq(effects.runId,value.runId),eq(effects.operationKey,value.operationKey))))[0];
  if(!row||row.inputDigest!==value.inputDigest||row.toolId!==value.toolId||row.taskId!==value.taskId||row.approvalId!==value.approvalId)throw new ExecutionBoundaryError('IDEMPOTENCY_CONFLICT',409,'Operation key is bound to different inputs or authority');
  return{effect:row,created:inserted.length===1};
}
export async function dispatchEffect(client:TransactionClient,id:string,invocationId:string){
  const changed=await typedClient(client).update(effects).set({state:'dispatched',externalOperationId:invocationId,updatedAt:new Date()}).where(and(eq(effects.id,id),eq(effects.state,'pending'))).returning();
  if(!changed.length)throw new ExecutionBoundaryError('EFFECT_OUTCOME_UNKNOWN',409,'Operation is already dispatched; reconcile its receipt before retry');
  return changed[0];
}
export async function settleEffect(client:TransactionClient,id:string,state:'completed'|'failed'|'unknown'){
  return typedClient(client).update(effects).set({state,updatedAt:new Date()}).where(and(eq(effects.id,id),eq(effects.state,'dispatched'))).returning();
}
