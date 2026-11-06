import {createRequire} from 'node:module';import crypto from 'node:crypto';import path from 'node:path';
import {DockerRuntime,type ExecResult} from './dockerRuntime.js';
import {WorkspaceBroker,type WorkspacePatch} from '../workspace/workspaceBroker.js';
import {requireProjectIdentity,requireToolGrants,requireFence,requireRunApproval,ExecutionBoundaryError,validate,identitySchema,fenceSchema,uuidSchema} from '../security/executionPolicy.js';
import type {TransactionClient} from '../db/transactionAdapter.js';
import {ensureEffect,dispatchEffect,settleEffect} from '../execution/effectJournal.js';
import {HOME_PROFILE,requireHomeProfile,requireRoot,saveArtifact,readArtifact,digest} from '../workspace/homeProfile.js';
const require=createRequire(import.meta.url);const db=()=>require('../../../config/db.js');
export interface TaskExecutionRequest{projectId:string;runId:string;taskId:string;workspaceRoot:string;rootRef?:string;command:string[];identity:unknown;fence:unknown;capabilities:string[];operationKey?:string;approvalId?:string;env?:Record<string,string>;timeoutMs?:number;diskLimitMb?:number;signal?:AbortSignal}
export interface TaskExecutionResult{containerId:string;execResult:ExecResult;baseDigest:string;guestDigest:string;patch:WorkspacePatch;hasModifications:boolean;patchPreviewId:string;receiptId:string}
export class DockerWorkerAdapter{
 public static commandDigest(r:TaskExecutionRequest){return digest({profile:HOME_PROFILE,projectId:r.projectId,runId:r.runId,taskId:r.taskId,rootRef:r.rootRef,root:path.resolve(r.workspaceRoot),operationKey:r.operationKey,command:r.command,timeoutMs:r.timeoutMs??30000,env:DockerRuntime.sanitizeEnvironment(r.env)});}
 public static async validateExecutionPolicy(c:TransactionClient,r:TaskExecutionRequest){
  const actor=await requireProjectIdentity(c,r.projectId,r.identity);const run=(await c.query('SELECT project_id FROM runs WHERE id=$1',[r.runId])).rows[0];if(run?.project_id!==r.projectId)throw new ExecutionBoundaryError('TASK_SCOPE_MISMATCH',403,'Run belongs to another project');
  await requireToolGrants(c,r.projectId,['fs_read','shell_exec','bounded_process'],r.workspaceRoot);await requireRoot(c,r.projectId,r.rootRef||'',r.workspaceRoot);await requireFence(c,r.runId,r.taskId,r.fence);await requireRunApproval(c,r.runId);await requireHomeProfile(c);
  const policy=(await c.query('SELECT * FROM policy_revisions WHERE active=true ORDER BY revision DESC LIMIT 1 FOR SHARE')).rows[0];const {GovernanceService}=require('../../../services/governanceService.js');const decision=GovernanceService.evaluatePolicy(policy||{},{action:'tool:execute_command',highImpact:true});if(!decision.allowed&&!(policy?.rules?.autonomyMode!=='readonly'&&decision.requiresApproval&&decision.reason==="Action 'tool:execute_command' is classified as high-impact and requires human approval"))throw new ExecutionBoundaryError('POLICY_DENIED',403,'Command denied by current policy');
  const approved=await c.query("SELECT id FROM approvals WHERE id=$1 AND project_id=$2 AND kind='effect' AND input_digest=$3 AND approver_principal_id=$4 AND state='approved' AND expires_at>NOW() AND (policy_revision_id IS NULL OR policy_revision_id IN(SELECT id FROM policy_revisions WHERE active=true)) AND (consumed_at IS NULL OR effect_id IN(SELECT id FROM effects WHERE run_id=$5 AND operation_key=$6))",[r.approvalId,r.projectId,this.commandDigest(r),actor.principalId,r.runId,r.operationKey]);if(!approved.rows.length)throw new ExecutionBoundaryError('APPROVAL_REQUIRED',403,'Current exact command approval required');return actor;
 }
 public static async executeTask(r:TaskExecutionRequest):Promise<TaskExecutionResult>{
  validate(identitySchema,r.identity);validate(fenceSchema,r.fence);validate(uuidSchema,r.projectId);validate(uuidSchema,r.runId);validate(uuidSchema,r.taskId);validate(uuidSchema,r.rootRef);validate(uuidSchema,r.approvalId);
  if(!r.operationKey||r.operationKey.length>120||!Array.isArray(r.command)||!r.command.length||r.command.some(x=>typeof x!=='string'||x.includes('\0')))throw new ExecutionBoundaryError('INVALID_INPUT',400,'Keyed command and exact approval required');
  const inputDigest=this.commandDigest(r);const connection=await db().getClient();let locked=false,cid:string|undefined,workerId:string|undefined,effectId:string|undefined,invocationId:string|undefined,tool:any,timer:ReturnType<typeof setInterval>|undefined;
  const controller=new AbortController();const externalAbort=()=>controller.abort();r.signal?.addEventListener('abort',externalAbort,{once:true});if(r.signal?.aborted)controller.abort();let checking=false;let replay:any;
  try{
   locked=(await connection.query('SELECT pg_try_advisory_lock(8113,1) AS locked')).rows[0].locked;if(!locked)throw new ExecutionBoundaryError('WORKER_BUSY',409,'Only one Home container execution is admitted');
   await db().transaction(async(c:TransactionClient)=>{
    const actor=await this.validateExecutionPolicy(c,r);
    tool=(await c.query("SELECT t.id AS tool_id,r.id AS revision_id FROM tools t JOIN tool_revisions r ON r.tool_id=t.id WHERE t.name='execute_command' AND r.availability='available' ORDER BY r.revision DESC LIMIT 1")).rows[0];if(!tool)throw new Error('TOOL_UNAVAILABLE');
    const ensured=await ensureEffect(c,{runId:r.runId,taskId:r.taskId,toolId:tool.tool_id,inputDigest,targetSummary:HOME_PROFILE,risk:'high',approvalId:r.approvalId,operationKey:r.operationKey});effectId=ensured.effect.id;
    if(!ensured.created){const existing=await c.query('SELECT state,receipt_ref FROM effects WHERE id=$1',[effectId]);if(existing.rows[0].state==='completed'&&existing.rows[0].receipt_ref){replay=await readArtifact(c,existing.rows[0].receipt_ref,r.projectId);return;}throw new ExecutionBoundaryError('EFFECT_OUTCOME_UNKNOWN',409,'Reconcile the existing operation before resuming');}
    const approval=(await c.query("UPDATE approvals SET consumed_at=NOW(),run_id=$2,effect_id=$3 WHERE id=$1 AND project_id=$4 AND kind='effect' AND input_digest=$5 AND state='approved' AND consumed_at IS NULL AND expires_at>NOW() AND approver_principal_id=$6 AND (run_id IS NULL OR run_id=$2) AND (policy_revision_id IS NULL OR policy_revision_id IN(SELECT id FROM policy_revisions WHERE active=true)) RETURNING id",[r.approvalId,r.runId,effectId,r.projectId,inputDigest,actor.principalId])).rows[0];if(!approval)throw new ExecutionBoundaryError('APPROVAL_REQUIRED',403,'Exact one-time command approval is required');
    if((await c.query("SELECT id FROM isolation_workers WHERE metadata->>'profile'=$1 AND status IN('provisioning','running','unknown') LIMIT 1",[HOME_PROFILE])).rows.length)throw new ExecutionBoundaryError('RECOVERY_REQUIRED',409,'An earlier worker needs recovery');
    const profileId=await requireHomeProfile(c);workerId=(await c.query("INSERT INTO isolation_workers(profile_id,workspace_root_ref,status,metadata)VALUES($1,$2,'provisioning',$3)RETURNING id",[profileId,r.rootRef,JSON.stringify({profile:HOME_PROFILE,projectId:r.projectId,runId:r.runId,taskId:r.taskId,imageId:DockerRuntime.DEFAULT_IMAGE,effectId})])).rows[0].id;
    invocationId=(await c.query("INSERT INTO tool_invocations(tool_id,tool_revision_id,project_id,run_id,task_id,status,input,input_digest)VALUES($1,$2,$3,$4,$5,'running',$6,$7)RETURNING id",[tool.tool_id,tool.revision_id,r.projectId,r.runId,r.taskId,JSON.stringify({command:r.command,rootRef:r.rootRef}),inputDigest])).rows[0].id;await dispatchEffect(c,effectId!,invocationId!);
   });
   if(replay)return deserializeResult(replay);
   cid=await DockerRuntime.createContainer({runId:r.runId,taskId:r.taskId,owner:r.projectId,diskLimitMb:r.diskLimitMb,customEnv:r.env});
   const binding=DockerRuntime.binding(cid);await connection.query("UPDATE isolation_workers SET metadata=metadata||$2::jsonb WHERE id=$1",[workerId,JSON.stringify({binding})]);
   await db().transaction((c:TransactionClient)=>this.validateExecutionPolicy(c,r));await DockerRuntime.startContainer(cid);
   await connection.query("UPDATE isolation_workers SET status='running',last_heartbeat_at=NOW() WHERE id=$1",[workerId]);
   timer=setInterval(()=>{if(checking)return;checking=true;void db().transaction((c:TransactionClient)=>this.validateExecutionPolicy(c,r)).then(()=>connection.query('UPDATE isolation_workers SET last_heartbeat_at=NOW() WHERE id=$1',[workerId])).catch(()=>controller.abort()).finally(()=>checking=false);},1000);
   const base=await WorkspaceBroker.exportSnapshotToContainer(cid,r.workspaceRoot);await db().transaction((c:TransactionClient)=>this.validateExecutionPolicy(c,r));
   const execResult=await DockerRuntime.exec(cid,r.command,{timeoutMs:r.timeoutMs??30000,signal:controller.signal});
   const guest=await WorkspaceBroker.importSnapshotFromContainer(cid);const patch=WorkspaceBroker.computePatch(base,guest);if(timer){clearInterval(timer);timer=undefined;}
   await db().transaction((c:TransactionClient)=>this.validateExecutionPolicy(c,r));
   await DockerRuntime.removeContainer(cid);const containerId=cid;cid=undefined;
   const result=await db().transaction(async(c:TransactionClient)=>{
    await this.validateExecutionPolicy(c,r);
    const preview={profile:HOME_PROFILE,projectId:r.projectId,runId:r.runId,taskId:r.taskId,rootRef:r.rootRef,root:r.workspaceRoot,baseDigest:base.treeDigest,patch:serializePatch(patch),preimages:[...base.entries].map(([name,e])=>({path:name,content:e.content.toString('base64'),sha256:e.sha256}))};
    const patchPreviewId=await saveArtifact(c,r.projectId,'P3 guest patch preview',preview);
    const output={containerId,execResult,baseDigest:base.treeDigest,guestDigest:guest.treeDigest,patch:serializePatch(patch),hasModifications:!!(patch.added.length+patch.modified.length+patch.deleted.length),patchPreviewId};
    const receipt=(await c.query("INSERT INTO tool_receipts(invocation_id,tool_revision_id,status,exit_code,input_digest,output_digest,output,duration_ms,artifact_ids)VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)RETURNING id",[invocationId,tool.revision_id,execResult.exitCode===0?'success':'failure',execResult.exitCode,inputDigest,digest(output),JSON.stringify(output),execResult.durationMs,JSON.stringify([patchPreviewId])])).rows[0];
    const complete={...output,receiptId:receipt.id};const artifact=await saveArtifact(c,r.projectId,'P3 execution receipt',complete);await c.query("UPDATE effects SET receipt_ref=$2 WHERE id=$1",[effectId,artifact]);await settleEffect(c,effectId!,'completed');await c.query("UPDATE tool_invocations SET status='completed',completed_at=NOW() WHERE id=$1",[invocationId]);await c.query("UPDATE isolation_workers SET status='terminated',terminated_at=NOW(),termination_reason='completed' WHERE id=$1",[workerId]);return deserializeResult(complete);
   });return result;
  }catch(error){if(effectId)await db().transaction(async(c:TransactionClient)=>{await settleEffect(c,effectId!,'unknown');if(workerId)await c.query("UPDATE isolation_workers SET status='unknown',termination_reason='reconciliation_required' WHERE id=$1",[workerId]);}).catch(()=>{});throw error;
  }finally{if(timer)clearInterval(timer);r.signal?.removeEventListener('abort',externalAbort);if(cid){try{await DockerRuntime.removeContainer(cid);if(workerId)await connection.query("UPDATE isolation_workers SET status='terminated',terminated_at=NOW(),termination_reason='failed_stopped' WHERE id=$1",[workerId]);}catch{/* Unknown durable worker/effect is retained; new dispatch remains blocked. */}}if(locked)await connection.query('SELECT pg_advisory_unlock(8113,1)').catch(()=>{});connection.release();}
 }
 public static async applyApprovedPatch(_root:string,_patch:WorkspacePatch):Promise<{applied:number;errors:string[]}>{throw new ExecutionBoundaryError('APPROVAL_REQUIRED',403,'Use the persisted patch-preview approval endpoint');}
}
export function serializePatch(p:WorkspacePatch){return{...p,added:p.added.map(x=>({...x,content:x.content.toString('base64')})),modified:p.modified.map(x=>({...x,content:x.content.toString('base64')}))};}
export function deserializePatch(p:any):WorkspacePatch{return{...p,added:p.added.map((x:any)=>({...x,content:Buffer.from(x.content,'base64')})),modified:p.modified.map((x:any)=>({...x,content:Buffer.from(x.content,'base64')}))};}
function deserializeResult(value:any):TaskExecutionResult{return{...value,patch:deserializePatch(value.patch)};}
