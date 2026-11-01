import {z} from 'zod';
import {request,eventStream} from './client';
import {readRunEvents} from './run-events.mjs';
export const uuid=z.uuid(),digest=z.string().regex(/^[a-f0-9]{64}$/),decimal=z.string().regex(/^\d+$/);
const nullableId=uuid.nullish(),state=z.string().min(1);
export const runSchema=z.object({id:uuid,projectId:nullableId,sessionId:nullableId,goalId:nullableId,contractRevisionId:nullableId,planRevisionId:nullableId,repositorySnapshotId:nullableId,state,autonomyMode:z.string(),epoch:decimal,progress:z.object({completedTasks:z.number().int(),totalTasks:z.number().int()}),budget:z.object({limit:decimal,reserved:decimal,spent:decimal}),verificationReportId:nullableId,blockers:z.array(z.unknown()),currentSequence:decimal,createdAt:z.string(),updatedAt:z.string()});
export const taskSchema=z.object({id:uuid,runId:uuid,stepKey:z.string(),state,attempt:z.number().int(),maxAttempts:z.number().int(),leaseEpoch:decimal,dependencies:z.array(z.string()),errorMessage:z.string().nullish(),artifactIds:z.array(z.string())});
export const agentSchema=z.object({id:uuid,runId:uuid,taskId:nullableId,role:z.string(),state,usageSummary:z.record(z.string(),z.unknown())});
export const effectSchema=z.object({id:uuid,runId:uuid,taskId:nullableId,toolId:z.string(),inputDigest:digest,targetSummary:z.string().nullish(),risk:z.string(),state,approvalId:nullableId,receiptRef:nullableId});
export const checkpointSchema=z.object({id:uuid,runId:uuid,sequence:decimal,epoch:decimal,stateDigest:digest,createdAt:z.string()});
export const goalSchema=z.object({id:uuid,projectId:nullableId,intent:z.string(),status:z.string(),autonomyMode:z.string(),activeContractRevisionId:nullableId});
export const planSchema=z.object({id:uuid,goalId:nullableId,revision:z.number().int(),digest,layers:z.record(z.string(),z.unknown()),steps:z.array(z.unknown()),reason:z.string().nullish()});
export const contractSchema=z.object({id:uuid,goalId:nullableId,revision:z.number().int(),digest,planRevisionId:nullableId,document:z.record(z.string(),z.unknown())});
export const approvalSchema=z.object({id:uuid,project_id:nullableId,session_id:nullableId,kind:z.string(),state,input_digest:digest,scope_summary:z.string().nullish(),consequences:z.string().nullish(),expires_at:z.string(),consumed_at:z.string().nullish(),cost_ceiling_micro_usd:z.union([decimal,z.number().int().nonnegative()]).transform(String)});
export const grantSchema=z.object({id:uuid,project_id:nullableId,session_id:nullableId,capability:z.string(),resource_scope:z.record(z.string(),z.unknown()),expires_at:z.string()});
export const verificationSchema=z.object({id:uuid,runId:uuid,outcome:z.string(),artifactDigest:digest,requiredCount:z.number().int(),passedCount:z.number().int(),failedCount:z.number().int(),unknownCount:z.number().int(),verifierIdentity:z.string(),criteria:z.array(z.unknown())});
export type Run=z.infer<typeof runSchema>;export type Task=z.infer<typeof taskSchema>;export type Agent=z.infer<typeof agentSchema>;export type Effect=z.infer<typeof effectSchema>;export type Checkpoint=z.infer<typeof checkpointSchema>;export type Goal=z.infer<typeof goalSchema>;export type Plan=z.infer<typeof planSchema>;export type Contract=z.infer<typeof contractSchema>;export type Approval=z.infer<typeof approvalSchema>;export type Grant=z.infer<typeof grantSchema>;export type Verification=z.infer<typeof verificationSchema>;
export type RunEvent={id:string;type:string;payload:Record<string,unknown>};
const id=(value:string)=>uuid.parse(value),page=(offset=0)=>`limit=50&offset=${z.number().int().nonnegative().parse(offset)}`;
const keyed=(value:string)=>z.string().min(1).max(120).parse(value);
const related=<T extends {runId:string}>(values:T[],runId:string)=>{if(values.some(value=>value.runId!==runId))throw new Error('The server returned records for another run');return values;};
export const executionApi={
 async runs(projectId?:string,offset=0,signal?:AbortSignal){
  const path = projectId ? `/runs?projectId=${id(projectId)}&${page(offset)}` : `/runs?${page(offset)}`;
  const value=await request(path,z.object({runs:z.array(runSchema)}),'GET',undefined,signal);
  return value.runs;
 },
 listAllRuns:async(offset=0,signal?:AbortSignal)=>(await request(`/runs?${page(offset)}`,z.object({runs:z.array(runSchema)}),'GET',undefined,signal)).runs,
 conversationRuns:async(conversationId:string,offset=0,signal?:AbortSignal)=>(await request(`/conversations/${id(conversationId)}/runs?${page(offset)}`,z.object({runs:z.array(runSchema)}),'GET',undefined,signal)).runs,
 startConversationRun:async(conversationId:string,input?:Record<string,unknown>,operationKey?:string)=>(await request(`/conversations/${id(conversationId)}/runs`,z.object({run:runSchema}),'POST',input||{},undefined,keyed(operationKey||crypto.randomUUID()))).run,
 run:async(runId:string,signal?:AbortSignal)=>(await request(`/runs/${id(runId)}`,z.object({run:runSchema}),'GET',undefined,signal)).run,
 tasks:async(runId:string,offset=0,signal?:AbortSignal)=>related((await request(`/runs/${id(runId)}/tasks?${page(offset)}`,z.object({tasks:z.array(taskSchema)}),'GET',undefined,signal)).tasks,runId),
 agents:async(runId:string,offset=0,signal?:AbortSignal)=>related((await request(`/runs/${id(runId)}/agents?${page(offset)}`,z.object({agents:z.array(agentSchema)}),'GET',undefined,signal)).agents,runId),
 effects:async(runId:string,offset=0,signal?:AbortSignal)=>related((await request(`/runs/${id(runId)}/effects?${page(offset)}`,z.object({effects:z.array(effectSchema)}),'GET',undefined,signal)).effects,runId),
 checkpoints:async(runId:string,offset=0,signal?:AbortSignal)=>related((await request(`/runs/${id(runId)}/checkpoints?${page(offset)}`,z.object({checkpoints:z.array(checkpointSchema)}),'GET',undefined,signal)).checkpoints,runId),
 verifications:async(runId:string,signal?:AbortSignal)=>related(await request(`/runs/${id(runId)}/verifications`,z.array(verificationSchema),'GET',undefined,signal),runId),
 contract:async(revisionId:string,signal?:AbortSignal)=>(await request(`/contract-revisions/${id(revisionId)}`,z.object({revision:contractSchema}),'GET',undefined,signal)).revision,
 async snapshots(projectId:string,offset=0,signal?:AbortSignal){const value=await request(`/projects/${id(projectId)}/snapshots?${page(offset)}`,z.object({snapshots:z.array(z.object({id:uuid,project_id:uuid,tree_digest:digest,status:z.string(),created_at:z.string()})),total:z.number().int()}),'GET',undefined,signal);if(value.snapshots.some(snapshot=>snapshot.project_id!==projectId))throw new Error('The server returned snapshots for another project');return value;},
 async approvals(projectId?:string,offset=0,signal?:AbortSignal){
  const path = projectId ? `/approvals?projectId=${id(projectId)}&${page(offset)}` : `/approvals?${page(offset)}`;
  const value=await request(path,z.object({approvals:z.array(approvalSchema),total:z.number().int()}),'GET',undefined,signal);
  return value;
 },
 async grants(projectId:string,signal?:AbortSignal){const value=await request(`/projects/${id(projectId)}/grants`,z.object({grants:z.array(grantSchema)}),'GET',undefined,signal);if(value.grants.some(grant=>grant.project_id!==projectId))throw new Error('The server returned grants for another project');return value.grants;},
 async control(run:Run,action:'pause'|'resume'|'cancel',operationKey:string,checkpointId?:string){const input=action==='resume'?{expectedEpoch:decimal.parse(run.epoch),...(checkpointId?{checkpointId:id(checkpointId)}:{})}:{reason:'Requested by the workspace owner'};return (await request(`/runs/${id(run.id)}/${action}`,z.object({run:runSchema}),'POST',input,undefined,keyed(operationKey))).run;},
 async execute(runId:string,operationKey:string){return request(`/runs/${id(runId)}/execute`,z.object({status:z.string().optional(),state:z.string().optional()}).passthrough(),'POST',{},undefined,keyed(operationKey),180000);},
 failures:(runId:string)=>request(`/runs/${id(runId)}/failures`,z.object({failures:z.array(z.record(z.string(),z.unknown()))}).passthrough()),
 repairs:(runId:string)=>request(`/runs/${id(runId)}/repairs`,z.object({repairs:z.array(z.record(z.string(),z.unknown()))}).passthrough()),
 triggerRepair:(runId:string,operationKey?:string)=>request(`/runs/${id(runId)}/repairs`,z.object({repair:z.record(z.string(),z.unknown()).optional(),started:z.boolean().optional()}).passthrough(),'POST',{},undefined,keyed(operationKey||crypto.randomUUID())),
 reconcileEffect:(effectId:string,operationKey?:string)=>request(`/effects/${id(effectId)}/reconcile`,z.object({effect:effectSchema.optional(),reconciled:z.boolean().optional()}).passthrough(),'POST',{},undefined,keyed(operationKey||crypto.randomUUID())),
 async decide(approval:Approval,decision:'approve'|'reject',nonce:string,operationKey:string){if(approval.state!=='pending'||Date.parse(approval.expires_at)<=Date.now()||approval.consumed_at)throw new Error('This approval is no longer pending');return request(`/approvals/${id(approval.id)}/decisions`,z.object({approval:z.object({id:uuid,state:z.enum(['approved','rejected'])})}),'POST',{decision,nonce:z.string().regex(/^[a-f0-9]{64}$/).parse(nonce),digest:approval.input_digest},undefined,keyed(operationKey));},
 preparedApproval:(runId:string,eventSequence:string,operationKey:string)=>request(`/runs/${id(runId)}/approval-requests`,z.object({approval:approvalSchema,nonce:z.string().regex(/^[a-f0-9]{64}$/)}),'POST',{eventSequence:decimal.parse(eventSequence)},undefined,keyed(operationKey)),
 async events(runId:string,cursor:string,signal:AbortSignal,onEvent:(event:RunEvent)=>void,onConnected?:()=>void){const response=await eventStream(`/runs/${id(runId)}/events`,signal,decimal.parse(cursor));onConnected?.();await readRunEvents(response,onEvent,signal,cursor);},
};
