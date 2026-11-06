import crypto from 'node:crypto';
import path from 'node:path';
import {createRequire} from 'node:module';
import {z} from 'zod-v4';
import type {TransactionClient} from '../db/transactionAdapter.js';
import {ExecutionBoundaryError,identitySchema,requireProjectIdentity,requireToolGrants,requireRunApproval,validate,uuidSchema,parseResourceScope,normalizePath} from '../security/executionPolicy.js';
import {HOME_PROFILE,requireHomeProfile,requireRoot,readArtifact,digest} from './homeProfile.js';
import {computeStateDigest} from '../orchestration/checkpointAdapter.js';
import {commandSchema,orchestrationSettingsSchema} from '../orchestration/graphContracts.js';
import {patchApprovalDigest} from './patchService.js';
import {DockerWorkerAdapter,type TaskExecutionRequest} from '../windows/dockerWorkerAdapter.js';
import {CanonicalTerminal} from '../windows/canonicalTerminal.js';
import {appendRunEvent} from '../execution/runEventStore.js';
const require=createRequire(import.meta.url);
const db=()=>require('../../../config/db.js');
const execution=()=>require('../../../services/executionService.js').ExecutionService;
const governance=()=>require('../../../services/governanceService.js').GovernanceService;
const keySchema=z.string().min(1).max(120),hash=z.string().regex(/^[a-f0-9]{64}$/),sequence=z.string().regex(/^[1-9][0-9]{0,18}$/).refine(v=>BigInt(v)<=9223372036854775807n);
const failure=(code:string,status=409)=>new ExecutionBoundaryError(code,status,code);
type Actor=z.infer<typeof identitySchema>;
type Preparation={version:'1';sessionId:string;principalId:string;rootRef:string;runEpoch:string;operationKey:string;requestKey:string;expiresAt:number;status:'prepared'|'opening'|'opened'|'unknown'|'closed';eventSequence?:string;terminalId?:string;input?:InputPreparation};
type InputPreparation={id:string;terminalId:string;operationKey:string;data:string;inputDigest:string;eventSequence:string;expiresAt:number;runEpoch:string};
async function human(c:TransactionClient,projectId:string,identity:unknown){
 const actor=await requireProjectIdentity(c,projectId,identity);
 const owner=(await c.query("SELECT 1 FROM workspaces w JOIN users u ON u.id=w.owner_principal_id WHERE w.id=$1 AND u.id=$2 AND u.role='owner'",[actor.workspaceId,actor.principalId])).rows[0];
 if(!owner)throw failure('HUMAN_OWNER_REQUIRED',403);return actor;
}
async function runScope(c:TransactionClient,runId:string,identity:unknown){
 const run=(await c.query('SELECT r.*,p.primary_path,cr.document,cr.digest AS contract_digest FROM runs r JOIN projects p ON p.id=r.project_id LEFT JOIN contract_revisions cr ON cr.id=r.contract_revision_id AND cr.goal_id=r.goal_id WHERE r.id=$1 FOR UPDATE OF r',[validate(uuidSchema,runId)])).rows[0];
 if(!run)throw failure('RUN_NOT_FOUND',404);const actor=await human(c,run.project_id,identity);return{run,actor};
}
async function policy(c:TransactionClient){
 const current=(await c.query('SELECT * FROM policy_revisions WHERE active=true ORDER BY revision DESC LIMIT 1 FOR SHARE')).rows[0];
 const decision=governance().evaluatePolicy(current||{},{action:'tool:execute_command',highImpact:true});
 if(!decision.allowed&&!(current?.rules?.autonomyMode!=='readonly'&&decision.requiresApproval&&decision.reason==="Action 'tool:execute_command' is classified as high-impact and requires human approval"))throw failure('POLICY_DENIED',403);
 return current?.id??null;
}
function ownedPreparation(task:any,actor:Pick<Actor,'sessionId'|'principalId'>):Preparation{
 const value=task?.result?.sironaTerminalPreparation as Preparation|undefined;
 if(!task?.step_key?.startsWith('ui:terminal:')||value?.version!=='1'||value.sessionId!==actor.sessionId||value.principalId!==actor.principalId)throw failure('TERMINAL_PREPARATION_FORBIDDEN',403);return value;
}
function terminalRequest(run:any,taskId:string,p:Preparation,identity:unknown):TaskExecutionRequest{
 return CanonicalTerminal.request({projectId:run.project_id,runId:run.id,taskId,workspaceRoot:run.primary_path,rootRef:p.rootRef,command:[],identity,fence:null,capabilities:[],operationKey:p.operationKey});
}
function publicPreparation(runId:string,taskId:string,p:Preparation,inputDigest:string){return{preparationId:taskId,runId,kind:'terminal_open' as const,inputDigest,eventSequence:p.eventSequence!,expiresAt:new Date(p.expiresAt).toISOString(),command:['/bin/sh']};}
async function terminalAuthority(c:TransactionClient,run:any,rootRef:string){
 if(run.state!=='running')throw failure('RUN_NOT_RUNNING');
 await requireRunApproval(c,run.id);await requireRoot(c,run.project_id,rootRef,run.primary_path);
 await requireToolGrants(c,run.project_id,['fs_read','shell_exec','bounded_process'],run.primary_path);await requireHomeProfile(c);await policy(c);
}
/** Read-only projection: no probes, grants, migrations or feature activation. */
export async function workspaceReadiness(projectId:string,identity:unknown){
 return db().transaction(async(c:TransactionClient)=>{
  const actor=await human(c,validate(uuidSchema,projectId),identity),project=(await c.query('SELECT primary_path FROM projects WHERE id=$1',[projectId])).rows[0];
  let profileReason:string|null=null,fileReason:string|null=null,terminalReason:string|null=null;
  try{await requireHomeProfile(c);}catch(error){if(!(error instanceof ExecutionBoundaryError))throw error;profileReason=error.code;}
  try{await requireToolGrants(c,projectId,['fs_read'],project.primary_path);}catch(error){if(!(error instanceof ExecutionBoundaryError))throw error;fileReason=error.code;}
  try{await requireToolGrants(c,projectId,['fs_read','shell_exec','bounded_process'],project.primary_path);await policy(c);}catch(error){if(!(error instanceof ExecutionBoundaryError))throw error;terminalReason=error.code;}
  const roots=(await c.query("SELECT id,expires_at,resource_scope FROM capability_grants WHERE project_id=$1 AND capability='workspace_root' AND revoked_at IS NULL AND expires_at>NOW()",[projectId])).rows.filter((row:any)=>{
    const scope = parseResourceScope(row.resource_scope);
    return scope.profile===HOME_PROFILE && typeof scope.workspaceRoot==='string' && normalizePath(scope.workspaceRoot)===normalizePath(project.primary_path);
  });
  const workers=(await c.query("SELECT id,status,metadata FROM isolation_workers WHERE metadata->>'profile'=$1 AND status IN('running','provisioning','unknown') LIMIT 2",[HOME_PROFILE])).rows;
  const preparationRows=(await c.query("SELECT t.id,t.run_id,r.epoch,r.state AS run_state,t.result->'sironaTerminalPreparation' AS preparation FROM tasks t JOIN runs r ON r.id=t.run_id WHERE r.project_id=$1 AND t.step_key LIKE 'ui:terminal:%' AND t.result->'sironaTerminalPreparation'->>'sessionId'=$2 AND t.result->'sironaTerminalPreparation'->>'principalId'=$3 AND t.state IN('pending','queued','running','blocked') ORDER BY t.created_at DESC LIMIT 10",[projectId,actor.sessionId,actor.principalId])).rows;
  const preparations=[];
  for(const row of preparationRows){
   const p=row.preparation as Preparation;if(p.version!=='1'||p.status==='closed')continue;
   const worker=p.terminalId?(await c.query("SELECT status FROM isolation_workers WHERE id=$1 AND metadata->>'taskId'=$2",[p.terminalId,row.id])).rows[0]:null;
   const event=(await c.query("SELECT payload->>'inputDigest' AS digest FROM run_events WHERE run_id=$1 AND sequence=$2 AND event_type='terminal.approval_required'",[row.run_id,p.eventSequence??'0'])).rows[0];
   let live=false;if(p.status==='opened'&&p.terminalId&&worker?.status==='running')try{await CanonicalTerminal.access(p.terminalId,identity);live=true;}catch(error){if(!(error instanceof ExecutionBoundaryError))throw error;}
   preparations.push({preparationId:row.id,runId:row.run_id,rootRef:p.rootRef,status:p.status,eventSequence:p.eventSequence??null,inputDigest:event?.digest??null,terminalId:p.terminalId??null,workerStatus:worker?.status??null,usable:p.runEpoch===String(row.epoch)&&row.run_state==='running'&&(p.status==='opened'?live:p.status==='prepared'&&p.expiresAt>Date.now()),expiresAt:new Date(p.expiresAt).toISOString()});
  }
  return{projectId,profile:{id:HOME_PROFILE,enabled:process.env.SIRONA_TRUSTED_LOCAL_DOCKER_ENABLED==='true',qualified:profileReason===null,reasonCode:profileReason},orchestration:{enabled:process.env.SIRONA_ORCHESTRATION_ENABLED==='true'},files:{canRead:!fileReason&&roots.length>0,reasonCode:fileReason??(roots.length?null:'REGISTERED_ROOT_REQUIRED'),roots:roots.map((row:any)=>({id:row.id,expiresAt:row.expires_at}))},terminal:{canPrepare:!profileReason&&!terminalReason&&roots.length>0&&!workers.length,reasonCode:profileReason??terminalReason??(!roots.length?'REGISTERED_ROOT_REQUIRED':workers.length?'WORKER_BUSY':null)},preparations};
 });
}
/** Prepare a fixed guest shell. No lease or container exists before exact human approval. */
export async function prepareTerminal(projectId:string,identity:unknown,raw:unknown,operationKey:string){
 const input=validate(z.object({runId:uuidSchema,rootRef:uuidSchema}).strict(),raw),requestKey=digest({projectId,operationKey:validate(keySchema,operationKey),sessionId:validate(identitySchema,identity).sessionId});
 await db().transaction(async(c:TransactionClient)=>{const {run}=await runScope(c,input.runId,identity);if(run.project_id!==projectId)throw failure('RESOURCE_FORBIDDEN',403);await terminalAuthority(c,run,input.rootRef);
  const prior=(await c.query("SELECT t.run_id,t.result->'sironaTerminalPreparation' AS preparation FROM tasks t JOIN runs r ON r.id=t.run_id WHERE r.project_id=$1 AND t.step_key LIKE 'ui:terminal:%' AND t.result->'sironaTerminalPreparation'->>'requestKey'=$2 LIMIT 1",[projectId,requestKey])).rows[0];
  if(prior&&(prior.run_id!==input.runId||prior.preparation.rootRef!==input.rootRef))throw failure('IDEMPOTENCY_CONFLICT');
 });
 const task=await execution().createTask({runId:input.runId,stepKey:'ui:terminal:'+requestKey,maxAttempts:1,reservedTerminal:true});
 return db().transaction(async(c:TransactionClient)=>{
  await c.query('SELECT pg_advisory_xact_lock(8113,2)');const {run,actor}=await runScope(c,input.runId,identity);if(run.project_id!==projectId)throw failure('RESOURCE_FORBIDDEN',403);await terminalAuthority(c,run,input.rootRef);
  const current=(await c.query('SELECT * FROM tasks WHERE id=$1 AND run_id=$2 FOR UPDATE',[task.id,run.id])).rows[0];
  if(current.result?.sironaTerminalPreparation){const p=ownedPreparation(current,actor);if(p.requestKey!==requestKey||p.rootRef!==input.rootRef||p.runEpoch!==String(run.epoch))throw failure('IDEMPOTENCY_CONFLICT');if(p.status!=='prepared'||p.expiresAt<=Date.now())throw failure('TERMINAL_PREPARATION_STALE');return publicPreparation(run.id,task.id,p,DockerWorkerAdapter.commandDigest(terminalRequest(run,task.id,p,identity)));}
  const occupied=await c.query("SELECT t.id FROM tasks t JOIN runs r ON r.id=t.run_id WHERE t.id<>$1 AND t.step_key LIKE 'ui:terminal:%' AND t.result->'sironaTerminalPreparation'->>'status' IN('prepared','opening','opened','unknown') AND ((t.result->'sironaTerminalPreparation'->>'expiresAt')::bigint>$2 OR t.state='running') AND r.state IN('running','paused','blocked','recovering') LIMIT 1",[task.id,Date.now()]);
  if(occupied.rows.length)throw failure('TERMINAL_PREPARATION_BUSY');
  if((await c.query("SELECT 1 FROM isolation_workers WHERE metadata->>'profile'=$1 AND status IN('running','provisioning','unknown') LIMIT 1",[HOME_PROFILE])).rows.length)throw failure('RECOVERY_REQUIRED');
  const p:Preparation={version:'1',sessionId:actor.sessionId,principalId:actor.principalId,rootRef:input.rootRef,runEpoch:String(run.epoch),operationKey:digest({requestKey,action:'terminal_open'}),requestKey,expiresAt:Date.now()+300000,status:'prepared'};
  const inputDigest=DockerWorkerAdapter.commandDigest(terminalRequest(run,task.id,p,identity));
  p.eventSequence=await appendRunEvent(c,run.id,'terminal.approval_required',{kind:'terminal_open',preparationId:task.id,taskId:task.id,inputDigest,runEpoch:p.runEpoch,command:['/bin/sh']});
  await c.query("UPDATE tasks SET result=$2::jsonb,deadline_at=$3 WHERE id=$1",[task.id,JSON.stringify({sironaTerminalPreparation:p}),new Date(p.expiresAt)]);
  return publicPreparation(run.id,task.id,p,inputDigest);
 }).catch(async(error:unknown)=>{
  await db().transaction(async(c:TransactionClient)=>{
   await c.query('SELECT id FROM runs WHERE id=$1 FOR UPDATE',[input.runId]);
   const cancelled=await c.query("UPDATE tasks SET state='cancelled',updated_at=NOW() WHERE id=$1 AND run_id=$2 AND step_key=$3 AND state='blocked' AND result IS NULL AND lease_holder IS NULL RETURNING id",[task.id,input.runId,'ui:terminal:'+requestKey]);
   if(cancelled.rows.length)await appendRunEvent(c,input.runId,'terminal.preparation_failed',{preparationId:task.id,code:error instanceof ExecutionBoundaryError?error.code:'PREPARATION_FAILED'});
  });throw error;
 });
}
async function graphAction(c:TransactionClient,run:any,event:any){
 if(process.env.SIRONA_ORCHESTRATION_ENABLED!=='true')throw failure('GRAPH_DISABLED',503);
 if(!['blocked','paused'].includes(run.state))throw failure('RUN_NOT_WAITING_FOR_APPROVAL');
 if(Date.now()-new Date(run.created_at).getTime()>=1800000)throw failure('RUN_DEADLINE');
 const p=event.payload;
 if(p?.preparationVersion!=='1'||String(p.runEpoch)!==String(run.epoch))throw failure('APPROVAL_SOURCE_STALE');
 const latest=(await c.query("SELECT sequence::text FROM run_events WHERE run_id=$1 AND event_type='graph.approval_required' ORDER BY sequence DESC LIMIT 1",[run.id])).rows[0];
 if(latest?.sequence!==String(event.sequence))throw failure('APPROVAL_SOURCE_SUPERSEDED');
 if(!run.document||computeStateDigest(run.document)!==run.contract_digest)throw failure('CONTRACT_DIGEST_MISMATCH');
 const settings=validate(orchestrationSettingsSchema,run.document.orchestration);
 if(settings.rootRef!==p.rootRef)throw failure('WORKSPACE_ROOT_MISMATCH',403);
 const binding=(await c.query("SELECT state_data,state_digest FROM run_checkpoints WHERE run_id=$1 AND state_data->'sironaGraph'->>'kind'='engine_binding' ORDER BY sequence LIMIT 1",[run.id])).rows[0];
 if(!binding||binding.state_data.sironaGraph.version!=='1.0.0'||computeStateDigest(binding.state_data)!==binding.state_digest)throw failure('GRAPH_ENGINE_UNQUALIFIED');
 const task=(await c.query('SELECT * FROM tasks WHERE id=$1 AND run_id=$2',[validate(uuidSchema,p.taskId),run.id])).rows[0];
 if(!task||!['queued','pending'].includes(task.state))throw failure('APPROVAL_TASK_STALE');
 await requireRoot(c,run.project_id,settings.rootRef,run.primary_path);await requireHomeProfile(c);
 let expected:string,summary:string;
 if(p.kind==='command'){
  await requireToolGrants(c,run.project_id,['fs_read','shell_exec','bounded_process'],run.primary_path);
  const command=validate(commandSchema,p.command),operationKey=validate(hash,p.operationKey),timeoutMs=validate(z.number().int().min(1).max(120000),p.timeoutMs);
  expected=DockerWorkerAdapter.commandDigest({projectId:run.project_id,runId:run.id,taskId:task.id,rootRef:settings.rootRef,workspaceRoot:run.primary_path,operationKey,command,timeoutMs,capabilities:[],identity:{},fence:null});summary='Run exact guest command: '+JSON.stringify(command).slice(0,2000);
 }else if(p.kind==='patch'){
  await requireToolGrants(c,run.project_id,['fs_write'],run.primary_path);
  const preview=await readArtifact(c,validate(uuidSchema,p.previewId),run.project_id);
  if(preview.runId!==run.id||preview.taskId!==task.id||preview.rootRef!==settings.rootRef||path.resolve(preview.root)!==path.resolve(run.primary_path))throw failure('ARTIFACT_SCOPE_MISMATCH',403);
  expected=patchApprovalDigest(p.previewId,validate(hash,preview.patch?.patchDigest),validate(hash,p.operationKey));summary='Apply exact reviewed host patch '+preview.patch.patchDigest;
 }else throw failure('APPROVAL_KIND_INVALID',400);
 if(expected!==p.inputDigest)throw failure('APPROVAL_DIGEST_MISMATCH');
 if((await c.query("SELECT 1 FROM effects WHERE run_id=$1 AND input_digest=$2 AND state IN('completed','dispatched','unknown') LIMIT 1",[run.id,expected])).rows.length)throw failure('EFFECT_RECONCILIATION_REQUIRED');
 return{inputDigest:expected,summary,expiresAt:Math.min(Date.now()+120000,new Date(run.created_at).getTime()+1800000)};
}
async function terminalAction(c:TransactionClient,run:any,event:any,actor:Pick<Actor,'sessionId'|'principalId'>){
 if(run.state!=='running')throw failure('RUN_NOT_RUNNING');const payload=event.payload;
 const task=(await c.query('SELECT * FROM tasks WHERE id=$1 AND run_id=$2 FOR UPDATE',[validate(uuidSchema,payload.taskId),run.id])).rows[0],p=ownedPreparation(task,actor);
 if(p.runEpoch!==String(run.epoch))throw failure('APPROVAL_SOURCE_STALE');await terminalAuthority(c,run,p.rootRef);
 if(payload.kind==='terminal_open'){
  if(p.status!=='prepared'||p.eventSequence!==String(event.sequence)||p.expiresAt<=Date.now()||task.state!=='blocked')throw failure('TERMINAL_PREPARATION_STALE');
  const expected=DockerWorkerAdapter.commandDigest(terminalRequest(run,task.id,p,actor));if(expected!==payload.inputDigest)throw failure('APPROVAL_DIGEST_MISMATCH');return{inputDigest:expected,summary:'Open fixed /bin/sh in the trusted-local Docker guest; every input requires a separate approval.',expiresAt:p.expiresAt};
 }
 if(payload.kind==='terminal_input'){
  const input=p.input;if(p.status!=='opened'||!input||input.id!==payload.preparationId||input.eventSequence!==String(event.sequence)||input.expiresAt<=Date.now()||input.runEpoch!==String(run.epoch))throw failure('TERMINAL_INPUT_STALE');
  const expected=CanonicalTerminal.inputDigest(input.terminalId,input.data,input.operationKey);if(expected!==input.inputDigest||expected!==payload.inputDigest)throw failure('APPROVAL_DIGEST_MISMATCH');
  if(task.state!=='running'||!task.lease_expires_at||new Date(task.lease_expires_at).getTime()<=Date.now())throw failure('TERMINAL_INPUT_STALE');
  if((await c.query('SELECT 1 FROM effects WHERE run_id=$1 AND operation_key=$2 LIMIT 1',[run.id,input.operationKey])).rows.length)throw failure('TERMINAL_INPUT_ALREADY_SUBMITTED');
  return{inputDigest:expected,summary:'Submit exact terminal input: '+input.data.slice(0,2000),expiresAt:input.expiresAt};
 }
 throw failure('APPROVAL_KIND_INVALID',400);
}
/** Human request binds only current server-prepared actions; no caller-selected digest. */
export async function requestPreparedApproval(runId:string,identity:unknown,raw:unknown,operationKey:string){
 const input=validate(z.object({eventSequence:sequence}).strict(),raw);validate(keySchema,operationKey);
 return db().transaction(async(c:TransactionClient)=>{
  const {run,actor}=await runScope(c,runId,identity);await requireRunApproval(c,run.id);const policyId=await policy(c);
  const event=(await c.query('SELECT sequence::text,event_type,payload FROM run_events WHERE run_id=$1 AND sequence=$2',[run.id,input.eventSequence])).rows[0];
  if(!event||!['graph.approval_required','terminal.approval_required'].includes(event.event_type))throw failure('APPROVAL_SOURCE_INVALID',404);
  const action=event.event_type==='graph.approval_required'?await graphAction(c,run,event):await terminalAction(c,run,event,actor);
  const requestKey=digest({operationKey,sessionId:actor.sessionId,runId:run.id});
  const priorRequest=(await c.query("SELECT payload->>'sourceSequence' AS source_sequence FROM run_events WHERE run_id=$1 AND event_type='workspace.approval_requested' AND payload->>'requestKey'=$2 LIMIT 1",[run.id,requestKey])).rows[0];
  if(priorRequest)throw failure(priorRequest.source_sequence===input.eventSequence?'APPROVAL_PROOF_ALREADY_ISSUED':'IDEMPOTENCY_CONFLICT');
  const previous=(await c.query("SELECT a.* FROM approvals a JOIN run_events e ON e.payload->>'approvalId'=a.id::text AND e.run_id=$1 AND e.event_type='workspace.approval_requested' WHERE e.payload->>'sourceSequence'=$2 ORDER BY a.created_at DESC FOR UPDATE OF a",[run.id,input.eventSequence])).rows;
  if(previous.some((a:any)=>a.state==='approved'&&!a.consumed_at&&new Date(a.expires_at).getTime()>Date.now()))throw failure('APPROVAL_ALREADY_GRANTED');
  for(const a of previous)if(a.state==='pending')await c.query("UPDATE approvals SET state='revoked' WHERE id=$1 AND state='pending' AND consumed_at IS NULL",[a.id]);
  const created=await governance().createApprovalRequest({projectId:run.project_id,kind:'effect',inputDigest:action.inputDigest,scopeSummary:action.summary,consequences:'One exact local action only. Does not authorize later actions, host execution fallback, commits, pushes or deployment.',ttlMs:Math.max(1,Math.min(120000,action.expiresAt-Date.now())),costCeilingMicroUsd:0},c);
  await c.query('UPDATE approvals SET run_id=$2,policy_revision_id=$3 WHERE id=$1',[created.approval.id,run.id,policyId]);
  await appendRunEvent(c,run.id,'workspace.approval_requested',{approvalId:created.approval.id,sourceSequence:input.eventSequence,sourceEpoch:String(run.epoch),requestKey,principalId:actor.principalId,sessionId:actor.sessionId,workspaceId:actor.workspaceId});
  const a=created.approval;return{approval:{id:a.id,project_id:a.project_id,kind:a.kind,state:a.state,input_digest:a.input_digest,scope_summary:a.scope_summary,consequences:a.consequences,cost_ceiling_micro_usd:String(a.cost_ceiling_micro_usd),expires_at:a.expires_at},nonce:created.nonce};
 });
}
/** Revalidate new prepared decisions under the same run lock used by pause/resume/cancel. */
export async function decidePreparedApproval(approvalId:string,input:{decision:string;nonce:string;digest:string;approverId:string|null}){
 validate(uuidSchema,approvalId);validate(uuidSchema,input.approverId);
 return db().transaction(async(c:TransactionClient)=>{
  const source=(await c.query("SELECT run_id,payload FROM run_events WHERE event_type='workspace.approval_requested' AND payload->>'approvalId'=$1 ORDER BY sequence DESC LIMIT 1",[approvalId])).rows[0];if(!source)throw failure('APPROVAL_SOURCE_INVALID',404);
  const run=(await c.query('SELECT r.*,p.primary_path,cr.document,cr.digest AS contract_digest FROM runs r JOIN projects p ON p.id=r.project_id LEFT JOIN contract_revisions cr ON cr.id=r.contract_revision_id AND cr.goal_id=r.goal_id WHERE r.id=$1 FOR UPDATE OF r',[source.run_id])).rows[0];
  if(!run||source.payload.principalId!==input.approverId||String(run.epoch)!==source.payload.sourceEpoch)throw failure('APPROVAL_SOURCE_STALE',403);
  const owner=(await c.query("SELECT 1 FROM auth_sessions a JOIN workspaces w ON w.id=a.workspace_id JOIN users u ON u.id=a.principal_id JOIN projects p ON p.workspace_id=w.id WHERE a.id=$1 AND a.principal_id=$2 AND w.owner_principal_id=$2 AND u.role='owner' AND a.workspace_id=$3 AND p.id=$4 AND a.revoked_at IS NULL AND a.expires_at>NOW()",[source.payload.sessionId,input.approverId,source.payload.workspaceId,run.project_id])).rows[0];
  if(!owner)throw failure('HUMAN_OWNER_REQUIRED',403);await requireRunApproval(c,run.id);const currentPolicy=await policy(c);
  const target=(await c.query('SELECT policy_revision_id FROM approvals WHERE id=$1 AND run_id=$2 FOR UPDATE',[approvalId,run.id])).rows[0];if(!target||target.policy_revision_id!==currentPolicy)throw failure('APPROVAL_POLICY_STALE',403);
  const event=(await c.query('SELECT sequence::text,event_type,payload FROM run_events WHERE run_id=$1 AND sequence=$2',[run.id,source.payload.sourceSequence])).rows[0];if(!event)throw failure('APPROVAL_SOURCE_INVALID');
  const action=event.event_type==='graph.approval_required'?await graphAction(c,run,event):event.event_type==='terminal.approval_required'?await terminalAction(c,run,event,{sessionId:source.payload.sessionId,principalId:source.payload.principalId}):null;
  if(!action||action.inputDigest!==input.digest)throw failure('APPROVAL_DIGEST_MISMATCH',400);
  return governance().decideApproval(approvalId,input,c);
 });
}
export async function openPreparedTerminal(projectId:string,preparationId:string,identity:unknown,raw:unknown){
 const input=validate(z.object({approvalId:uuidSchema}).strict(),raw);validate(uuidSchema,preparationId);
 const prepared=await db().transaction(async(c:TransactionClient)=>{
  const reference=(await c.query('SELECT run_id FROM tasks WHERE id=$1',[preparationId])).rows[0];if(!reference)throw failure('TERMINAL_PREPARATION_NOT_FOUND',404);
  const {run,actor}=await runScope(c,reference.run_id,identity);if(run.project_id!==projectId)throw failure('RESOURCE_FORBIDDEN',403);const task=(await c.query('SELECT * FROM tasks WHERE id=$1 FOR UPDATE',[preparationId])).rows[0],p=ownedPreparation(task,actor);
  await terminalAuthority(c,run,p.rootRef);if(p.status!=='prepared'||p.expiresAt<=Date.now()||p.runEpoch!==String(run.epoch))throw failure('TERMINAL_PREPARATION_STALE');
  const request=terminalRequest(run,task.id,p,identity),expected=DockerWorkerAdapter.commandDigest(request);
  const approved=(await c.query("SELECT id FROM approvals WHERE id=$1 AND project_id=$2 AND run_id=$3 AND input_digest=$4 AND kind='effect' AND state='approved' AND consumed_at IS NULL AND expires_at>NOW() AND approver_principal_id=$5 AND (policy_revision_id IS NULL OR policy_revision_id IN(SELECT id FROM policy_revisions WHERE active=true)) FOR UPDATE",[input.approvalId,projectId,run.id,expected,actor.principalId])).rows[0];if(!approved)throw failure('APPROVAL_REQUIRED',403);
  p.status='opening';await c.query("UPDATE tasks SET result=jsonb_set(result,'{sironaTerminalPreparation}',$2::jsonb) WHERE id=$1",[task.id,JSON.stringify(p)]);return{run,p,request};
 });
 let fence:unknown;
 try{
  const claimed=await execution().claimTask(prepared.run.id,{taskId:preparationId,holder:'ui-terminal:'+crypto.randomUUID(),ttlSeconds:90,reservedTerminal:true});if(!claimed)throw failure('TERMINAL_TASK_UNAVAILABLE');
  fence={holder:claimed.leaseHolder,runEpoch:claimed.runEpoch,leaseEpoch:claimed.leaseEpoch};
  const result=await CanonicalTerminal.create({...prepared.request,fence,approvalId:input.approvalId});
  await db().transaction(async(c:TransactionClient)=>{const {run,actor}=await runScope(c,prepared.run.id,identity);const task=(await c.query('SELECT * FROM tasks WHERE id=$1 FOR UPDATE',[preparationId])).rows[0],p=ownedPreparation(task,actor);p.status='opened';p.terminalId=result.terminalId;await c.query("UPDATE tasks SET result=jsonb_set(result,'{sironaTerminalPreparation}',$2::jsonb),deadline_at=NOW()+INTERVAL '10 minutes' WHERE id=$1",[preparationId,JSON.stringify(p)]);await appendRunEvent(c,run.id,'terminal.opened',{terminalId:result.terminalId,preparationId});});
  return result;
 }catch(error){await db().query("UPDATE tasks SET result=jsonb_set(result,'{sironaTerminalPreparation,status}','\"unknown\"'::jsonb) WHERE id=$1 AND result->'sironaTerminalPreparation'->>'status'='opening'",[preparationId]);throw error;}
}
export async function prepareTerminalInput(terminalId:string,identity:unknown,raw:unknown,operationKey:string){
 const input=validate(z.object({data:z.string().min(1).max(8192).refine(value=>Buffer.byteLength(value)<=8192)}).strict(),raw);validate(keySchema,operationKey);validate(uuidSchema,terminalId);
 await CanonicalTerminal.access(terminalId,identity);
 return db().transaction(async(c:TransactionClient)=>{
  const worker=(await c.query("SELECT metadata FROM isolation_workers WHERE id=$1 AND status='running'",[terminalId])).rows[0];if(!worker)throw failure('TERMINAL_UNAVAILABLE');
  const {run,actor}=await runScope(c,worker.metadata.runId,identity),task=(await c.query('SELECT * FROM tasks WHERE id=$1 AND run_id=$2 FOR UPDATE',[worker.metadata.taskId,run.id])).rows[0],p=ownedPreparation(task,actor);await terminalAuthority(c,run,p.rootRef);
  if(p.status!=='opened'||p.terminalId!==terminalId||p.runEpoch!==String(run.epoch))throw failure('TERMINAL_INPUT_STALE');
  const key=digest({operationKey,sessionId:actor.sessionId,terminalId});
  if(p.input){
   if(p.input.operationKey===key){if(p.input.data!==input.data||p.input.expiresAt<=Date.now())throw failure('IDEMPOTENCY_CONFLICT');return{...p.input,runId:run.id,kind:'terminal_input',expiresAt:new Date(p.input.expiresAt).toISOString()};}
   const pending=(await c.query("SELECT state,expires_at FROM approvals WHERE run_id=$1 AND input_digest=$2 ORDER BY created_at DESC LIMIT 1",[run.id,p.input.inputDigest])).rows[0];
   const receipt=(await c.query("SELECT state FROM effects WHERE run_id=$1 AND operation_key=$2",[run.id,p.input.operationKey])).rows[0];
   if(receipt&&receipt.state!=='completed')throw failure('EFFECT_RECONCILIATION_REQUIRED');
   if(!receipt&&p.input.expiresAt>Date.now()&&(!pending||['pending','approved'].includes(pending.state)&&new Date(pending.expires_at).getTime()>Date.now()))throw failure('TERMINAL_INPUT_PENDING');
  }
  if((await c.query("SELECT 1 FROM effects WHERE run_id=$1 AND operation_key=$2 UNION ALL SELECT 1 FROM run_events WHERE run_id=$1 AND event_type='terminal.approval_required' AND payload->>'terminalId'=$3 AND payload->>'operationKey'=$2 LIMIT 1",[run.id,key,terminalId])).rows.length)throw failure('IDEMPOTENCY_CONFLICT');
  const value:InputPreparation={id:crypto.randomUUID(),terminalId,operationKey:key,data:input.data,inputDigest:CanonicalTerminal.inputDigest(terminalId,input.data,key),eventSequence:'',expiresAt:Date.now()+120000,runEpoch:String(run.epoch)};
  value.eventSequence=await appendRunEvent(c,run.id,'terminal.approval_required',{kind:'terminal_input',preparationId:value.id,taskId:task.id,terminalId,inputDigest:value.inputDigest,runEpoch:value.runEpoch,operationKey:key});p.input=value;
  await c.query("UPDATE tasks SET result=jsonb_set(result,'{sironaTerminalPreparation}',$2::jsonb) WHERE id=$1",[task.id,JSON.stringify(p)]);
  return{...value,runId:run.id,kind:'terminal_input',expiresAt:new Date(value.expiresAt).toISOString()};
 });
}
/** Reconcile only controller-owned tasks against confirmed terminated workers. Never replay an effect. */
export async function reconcileTerminalTasks(projectId:string,runId:string,identity:unknown,cancelPrepared=false){
 return db().transaction(async(c:TransactionClient)=>{
  const {run}=await runScope(c,runId,identity);if(run.project_id!==projectId)throw failure('RESOURCE_FORBIDDEN',403);
  const rows=(await c.query("SELECT t.* FROM tasks t WHERE t.run_id=$1 AND t.step_key LIKE 'ui:terminal:%' AND t.result ? 'sironaTerminalPreparation' AND t.state IN('pending','queued','running','blocked','cancelled') FOR UPDATE",[runId])).rows;let reconciled=0;
  for(const task of rows){
   const p=task.result.sironaTerminalPreparation as Preparation;
   if(p.status==='closed'&&!task.lease_holder)continue;
   const worker=(await c.query("SELECT status FROM isolation_workers WHERE metadata->>'taskId'=$1 AND metadata->>'runId'=$2 AND metadata->>'projectId'=$3 ORDER BY started_at DESC LIMIT 1",[task.id,runId,projectId])).rows[0];
   if(worker?.status!=='terminated'&&!(cancelPrepared&&!worker&&['blocked','running'].includes(task.state)&&['prepared','opening','unknown'].includes(p.status)))continue;
   if((await c.query("SELECT 1 FROM effects WHERE task_id=$1 AND state IN('dispatched','unknown') LIMIT 1",[task.id])).rows.length)continue;
   p.status='closed';
   const updated=await c.query("UPDATE tasks SET state='cancelled',lease_holder=NULL,lease_expires_at=NULL,result=jsonb_set(result,'{sironaTerminalPreparation}',$4::jsonb),updated_at=NOW() WHERE id=$1 AND lease_epoch=$2 AND lease_holder IS NOT DISTINCT FROM $3 RETURNING id",[task.id,String(task.lease_epoch),task.lease_holder,JSON.stringify(p)]);
   if(updated.rows.length){
    reconciled++;await c.query("UPDATE approvals SET state='revoked' WHERE run_id=$1::text AND kind='effect' AND consumed_at IS NULL AND state IN('pending','approved') AND input_digest IN(SELECT payload->>'inputDigest' FROM run_events WHERE run_id=$1::uuid AND event_type='terminal.approval_required' AND payload->>'taskId'=$2)",[runId,task.id]);
    await appendRunEvent(c,runId,'terminal.reconciled',{preparationId:task.id,terminalId:p.terminalId??null,commandsCompleted:false});
   }
  }
  if(rows.length&&run.state==='cancelling'&&!(await c.query("SELECT 1 FROM effects WHERE run_id=$1 AND state IN('dispatched','unknown') LIMIT 1",[runId])).rows.length&&!(await c.query("SELECT 1 FROM isolation_workers WHERE metadata->>'runId'=$1 AND metadata->>'profile'=$2 AND status IN('running','provisioning','unknown') LIMIT 1",[runId,HOME_PROFILE])).rows.length){
   await c.query("UPDATE runs SET state='cancelled',version=version+1,updated_at=NOW() WHERE id=$1 AND state='cancelling'",[runId]);
   await c.query("UPDATE agent_sessions SET state='terminated',updated_at=NOW() WHERE run_id=$1 AND state='active' AND role LIKE 'p5_%'",[runId]);
   await appendRunEvent(c,runId,'run_cancelled',{runId,epoch:String(run.epoch),reason:'terminal_termination_confirmed'});
  }
  return reconciled;
 });
}
export async function closeWorkspaceTerminal(terminalId:string,identity:unknown){
 validate(uuidSchema,terminalId);const worker=(await db().query("SELECT metadata FROM isolation_workers WHERE id=$1 AND metadata->>'kind'='terminal'",[terminalId])).rows[0];
 try{return await CanonicalTerminal.close(terminalId,identity);}
 finally{if(worker){const actor=validate(identitySchema,identity);if(actor.sessionId===worker.metadata.sessionId&&actor.principalId===worker.metadata.principalId)await reconcileTerminalTasks(worker.metadata.projectId,worker.metadata.runId,identity);}}
}
