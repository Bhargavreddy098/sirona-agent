import crypto from 'node:crypto';
import path from 'node:path';
import {z} from 'zod-v4';
import type {TransactionClient} from '../db/transactionAdapter.js';
export class ExecutionBoundaryError extends Error{
  constructor(public code:string,public status:number,message:string){super(message);}
}
export const uuidSchema=z.uuid();
export const identitySchema=z.object({principalId:z.uuid(),workspaceId:z.uuid(),sessionId:z.uuid(),rawSessionToken:z.string().min(32).max(256)}).passthrough();
export const fenceSchema=z.object({holder:z.string().min(1).max(100),runEpoch:z.coerce.bigint().positive(),leaseEpoch:z.coerce.bigint().positive()});
export const toolRequestSchema=z.object({toolName:z.string().min(1).max(64),input:z.record(z.string(),z.unknown()),workspaceRoot:z.string().min(1).optional(),projectId:z.uuid().optional(),connectionId:z.uuid().optional(),runId:z.uuid().optional(),taskId:z.uuid().optional(),timeoutMs:z.number().int().positive().max(600000).optional()}).passthrough();
export function validate<T>(schema:z.ZodType<T>,value:unknown):T{const parsed=schema.safeParse(value);if(!parsed.success)throw new ExecutionBoundaryError('INVALID_INPUT',400,'Invalid execution request');return parsed.data;}
export async function requireProjectIdentity(client:TransactionClient,projectId:string,identity:unknown){
  const session=validate(identitySchema,identity);
  const result=await client.query(`SELECT p.id FROM projects p JOIN auth_sessions a ON a.id=$2 AND a.principal_id=$3 AND a.workspace_id=$4 AND a.token_hash=$5 WHERE p.id=$1 AND p.workspace_id=a.workspace_id AND p.archived=0 AND a.revoked_at IS NULL AND a.expires_at>NOW() FOR SHARE OF a`,[projectId,session.sessionId,session.principalId,session.workspaceId,crypto.createHash('sha256').update(session.rawSessionToken).digest('hex')]);
  if(!result.rows.length)throw new ExecutionBoundaryError('RESOURCE_FORBIDDEN',403,'Project or session is unavailable in this workspace');
  return session;
}
export async function requireToolGrants(client:TransactionClient,projectId:string,capabilities:string[],workspaceRoot:string){
  const project=(await client.query('SELECT primary_path FROM projects WHERE id=$1 FOR SHARE',[projectId])).rows[0];
  const normalize=(value:string)=>process.platform==='win32'?path.resolve(value).toLowerCase():path.resolve(value);
  if(!project?.primary_path||normalize(project.primary_path)!==normalize(workspaceRoot))throw new ExecutionBoundaryError('WORKSPACE_ROOT_MISMATCH',403,'Workspace root does not match project authority');
  const grants=(await client.query(`SELECT capability,resource_scope FROM capability_grants WHERE project_id=$1 AND revoked_at IS NULL AND expires_at>NOW() AND capability=ANY($2::text[]) FOR SHARE`,[projectId,[...capabilities,'*']])).rows;
  for(const capability of capabilities){
    const allowed=grants.some(grant=>(grant.capability===capability||grant.capability==='*')&&typeof grant.resource_scope?.workspaceRoot==='string'&&normalize(grant.resource_scope.workspaceRoot)===normalize(workspaceRoot));
    if(!allowed)throw new ExecutionBoundaryError('REVOKED_GRANT',403,'Scoped capability grant is missing, expired or revoked');
  }
}
export async function requireFence(client:TransactionClient,runId:string,taskId:string,fence:unknown){
  const token=validate(fenceSchema,fence);
  const result=await client.query(`SELECT t.id FROM runs r JOIN tasks t ON t.run_id=r.id WHERE r.id=$1 AND t.id=$2 AND r.epoch=$3 AND t.lease_epoch=$4 AND t.lease_holder=$5 AND t.lease_expires_at>NOW() AND r.state='running' AND t.state='running'`,[runId,taskId,token.runEpoch.toString(),token.leaseEpoch.toString(),token.holder]);
  if(!result.rows.length)throw new ExecutionBoundaryError('STALE_WORKER',409,'Worker lease or run epoch is stale');
}
export async function requireRunApproval(client:TransactionClient,runId:string){
  const run=(await client.query(`SELECT r.project_id,r.autonomy_mode,r.contract_revision_id,cr.digest FROM runs r LEFT JOIN contract_revisions cr ON cr.id=r.contract_revision_id AND cr.goal_id IN (SELECT id FROM goals WHERE project_id=r.project_id) WHERE r.id=$1`,[runId])).rows[0];
  if(!run)throw new ExecutionBoundaryError('RUN_NOT_FOUND',404,'Run not found');
  if(run.autonomy_mode==='readonly')throw new ExecutionBoundaryError('POLICY_DENIED',403,'Plan-only runs cannot dispatch changes');
  if(!run.contract_revision_id||!run.digest)throw new ExecutionBoundaryError('APPROVAL_REQUIRED',403,'A pinned approved contract is required');
  const approval=await client.query(`SELECT id,run_id FROM approvals WHERE contract_revision_id=$1 AND input_digest=$2 AND project_id=$3 AND state='approved' AND (expires_at IS NULL OR expires_at>NOW()) AND (policy_revision_id IS NULL OR policy_revision_id IN (SELECT id FROM policy_revisions WHERE active=true)) ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,[run.contract_revision_id,run.digest,run.project_id]);
  if(!approval.rows.length)throw new ExecutionBoundaryError('APPROVAL_REQUIRED',403,'Contract approval is missing, expired or changed');
  if(approval.rows[0].run_id && approval.rows[0].run_id!==runId)throw new ExecutionBoundaryError('APPROVAL_SCOPE_MISMATCH',403,'Contract approval is bound to another run');
  await client.query('UPDATE approvals SET run_id=$2 WHERE id=$1',[approval.rows[0].id,runId]);
}
