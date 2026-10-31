import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import type {BoundedOutput} from './graphContracts.js';
import {boundedOutputSchema} from './graphContracts.js';
import {computeStateDigest} from './checkpointAdapter.js';
import {requireProjectIdentity,requireRunApproval,requireFence,ExecutionBoundaryError} from '../security/executionPolicy.js';
import type {TransactionClient} from '../db/transactionAdapter.js';
import {applyPreview,type ApplyRequest} from '../workspace/patchService.js';
import {readArtifact} from '../workspace/homeProfile.js';
import {saveArtifact} from '../workspace/homeProfile.js';
import {ensureEffect,dispatchEffect,settleEffect} from '../execution/effectJournal.js';
const require=createRequire(import.meta.url);
const database=()=>require('../../../config/db.js');
export interface ActivityContext {
  runId:string;taskId:string;projectId:string;workspaceRoot:string;rootRef:string;
  identity:unknown;fence:unknown;operationKey:string;signal?:AbortSignal;contextBundleId?:string;
}
async function authority(context:ActivityContext) {
  if(!context?.identity||!context.fence)throw new ExecutionBoundaryError('GRAPH_AUTHORITY_REQUIRED',403,'Trusted activity identity and fence are required');
  await database().transaction(async(c:TransactionClient)=>{
    await requireProjectIdentity(c,context.projectId,context.identity);
    const run=(await c.query('SELECT project_id FROM runs WHERE id=$1',[context.runId])).rows[0];
    if(run?.project_id!==context.projectId)throw new ExecutionBoundaryError('TASK_SCOPE_MISMATCH',403,'Run scope mismatch');
    await requireRunApproval(c,context.runId);
    await requireFence(c,context.runId,context.taskId,context.fence);
  });
  context.signal?.throwIfAborted();
}
/** Read/tool dispatch remains owned by ToolRuntimeService, including schemas, grants and receipts. */
export async function executeToolCall(toolName:string,input:Record<string,unknown>,context:ActivityContext) {
  await authority(context);
  const {ToolRuntimeService}=require('../../../services/toolRuntimeService.js');
  return ToolRuntimeService.invokeTool({toolName,input,workspaceRoot:context.workspaceRoot,projectId:context.projectId,
    runId:context.runId,taskId:context.taskId,session:context.identity,workerFence:context.fence,operationKey:context.operationKey});
}
/** Raw model text/approved booleans cannot apply patches; only the persisted P3 preview path can. */
export async function applyApprovedPatch(request:ApplyRequest) {
  const result=await applyPreview(request);
  if(result.status!=='completed')throw new ExecutionBoundaryError('PATCH_RECONCILIATION_REQUIRED',409,'Patch outcome requires reconciliation');
  return result;
}
/** Models use the existing provider owner and turn lease, preserving discovery IDs and usage. */
export async function executeSpecialistTask(
  conversationId:string,modelId:string,prompt:string,limits:BoundedOutput,context:ActivityContext,clientTurnId:string
) {
  await authority(context);
  const {ProviderService}=require('../../../services/providerService.js');
  boundedOutputSchema.parse(limits);
  if(context.contextBundleId)await (await import('../context/contextAssembler.js')).ContextAssembler.validateForDispatch(context,context.contextBundleId);
  const {SessionTurnLeaseRegistry}=require('../../../services/turnLeaseService.js');
  const registry=(await database().query('SELECT m.is_available,pc.is_active,pc.workspace_id FROM models m LEFT JOIN provider_connections pc ON pc.id=m.provider_connection_id WHERE m.id=$1',[modelId])).rows[0];
  if(!registry||!registry.is_available||registry.is_active===false||(registry.workspace_id&&registry.workspace_id!==(context.identity as any).workspaceId))throw new ExecutionBoundaryError('MODEL_NOT_REGISTERED',403,'Model is unavailable in this workspace');
  const model=await ProviderService.getModelById(modelId);
  if(!model||model.id!==modelId)throw new ExecutionBoundaryError('MODEL_NOT_REGISTERED',400,'Exact discovered model ID required');
  if(!Number.isSafeInteger(model.context_window)||model.context_window<=limits.maxTokens)throw new ExecutionBoundaryError('MODEL_CONTEXT_UNKNOWN',409,'Known model context bound required');
  if(typeof prompt!=='string'||!prompt.trim()||Buffer.byteLength(prompt,'utf8')>Math.min(100000,model.context_window-limits.maxTokens))throw new ExecutionBoundaryError('CONTEXT_LIMIT_EXCEEDED',422,'Specialist input exceeds the conservative context bound');
  if(!Number.isSafeInteger(limits.maxDurationSeconds)||limits.maxDurationSeconds<1||limits.maxDurationSeconds>120||!Number.isSafeInteger(limits.contextOutputCap)||limits.contextOutputCap<1||limits.contextOutputCap>32768)
    throw new ExecutionBoundaryError('GRAPH_LIMIT_INVALID',400,'Invalid specialist deadline or output limit');
  const session=(await database().query('SELECT project_id FROM sessions WHERE id=$1 AND deleted_at IS NULL',[conversationId])).rows[0];
  if(session?.project_id!==context.projectId)throw new ExecutionBoundaryError('CONVERSATION_SCOPE_MISMATCH',403,'Specialist conversation scope mismatch');
  if(!Number.isSafeInteger(limits.maxTokens)||limits.maxTokens<1||limits.maxTokens>8192)throw new ExecutionBoundaryError('GRAPH_LIMIT_INVALID',400,'Invalid output token bound');
  const inputRate=BigInt(model.input_cost_micro_usd_per_m??0),outputRate=BigInt(model.output_cost_micro_usd_per_m??0);
  if(inputRate<=0n||outputRate<=0n)throw new ExecutionBoundaryError('MODEL_PRICING_UNKNOWN',409,'Verified model pricing is required');
  // Reserve the full registered context plus capped output, including SDK retry headroom.
  // Uncertain attempts retain their reservation; reported final-call usage is not proof earlier attempts were free.
  const ceiling=((BigInt(model.context_window||128000)*inputRate+BigInt(limits.maxTokens)*outputRate+999999n)/1000000n)*3n;
  if(ceiling<=0n||ceiling>999999999n)throw new ExecutionBoundaryError('GRAPH_BUDGET_INVALID',409,'Activity ceiling unavailable');
  const prepared=await database().transaction(async(c:TransactionClient)=>{
    await requireFence(c,context.runId,context.taskId,context.fence);
    const run=(await c.query('SELECT * FROM runs WHERE id=$1 FOR UPDATE',[context.runId])).rows[0];
    const e=await ensureEffect(c,{runId:context.runId,taskId:context.taskId,toolId:'p5_model_activity_v1',inputDigest:computeStateDigest({modelId,prompt,limits,conversationId,clientTurnId}),targetSummary:modelId,operationKey:context.operationKey});
    if(!e.created){
      if(e.effect.state==='completed'&&e.effect.receiptRef)return {replay:await readArtifact(c,e.effect.receiptRef,context.projectId)};
      throw new ExecutionBoundaryError('EFFECT_OUTCOME_UNKNOWN',409,'Reconcile the prior model activity; do not retry inference');
    }
    if(BigInt(run.budget_spent_micro_usd)+BigInt(run.budget_reserved_micro_usd)+ceiling>BigInt(run.budget_limit_micro_usd))throw new ExecutionBoundaryError('BUDGET_EXCEEDED',409,'Run model budget exhausted');
    await c.query('UPDATE runs SET budget_reserved_micro_usd=budget_reserved_micro_usd+$2 WHERE id=$1',[context.runId,ceiling.toString()]);
    await dispatchEffect(c,e.effect.id,clientTurnId);
    return {effectId:e.effect.id};
  });
  if(prepared.replay)return prepared.replay;
  const holder='desktop:p5:'+crypto.randomUUID();
  const signal=AbortSignal.any([AbortSignal.timeout(limits.maxDurationSeconds*1000),...(context.signal?[context.signal]:[])]);
  let token:any;
  try {
    token=await SessionTurnLeaseRegistry.acquireLease(conversationId,{ownerId:holder,ttlSeconds:150});
    const sourceContext=context.contextBundleId?await (await import('../context/contextAssembler.js')).ContextAssembler.validateForDispatch(context,context.contextBundleId):null;
    const result=await ProviderService.executeTurn({conversationId,projectId:context.projectId,modelId,prompt,clientTurnId,actorId:(context.identity as any).principalId,leaseOwner:holder,signal,nativeChat:true,adapter:process.env.SIRONA_PROVIDER_ADAPTER,
      activityLimits:{maxTokens:limits.maxTokens,deadlineMs:limits.maxDurationSeconds*1000,ceilingMicroUsd:ceiling.toString(),operationKey:context.operationKey}});
    await authority(context);
    if(sourceContext)await (await import('../context/contextAssembler.js')).ContextAssembler.validateForDispatch(context,sourceContext.id);
    const output=result.assistantMessage?.content;
    if(typeof output!=='string'||!output.trim()||output.length>limits.contextOutputCap)throw new ExecutionBoundaryError('GRAPH_OUTPUT_INVALID',422,'Specialist output is missing or exceeds its bound');
    const receipt={output,usage:result.usage,messageId:String(result.assistantMessage.id),...(sourceContext?{contextBundleId:sourceContext.id,contextDigest:sourceContext.digest}:{})};
    await database().transaction(async(c:TransactionClient)=>{
      await requireFence(c,context.runId,context.taskId,context.fence);
      const cost=BigInt(result.usage.costMicroUsd);
      if(cost<0n||cost>ceiling)throw new ExecutionBoundaryError('USAGE_OUT_OF_BOUNDS',409,'Reported usage exceeds reserved ceiling');
      const artifactId=await saveArtifact(c,context.projectId,'P5 model activity receipt',receipt);
      await c.query('UPDATE effects SET receipt_ref=$2 WHERE id=$1',[prepared.effectId,artifactId]);
      const settled=await settleEffect(c,prepared.effectId,'completed');
      if(settled.length!==1)throw new ExecutionBoundaryError('EFFECT_OUTCOME_UNKNOWN',409,'Activity settlement lost ownership');
      // Retain retry headroom as uncertain charges until explicit reconciliation.
      await c.query('UPDATE runs SET budget_spent_micro_usd=budget_spent_micro_usd+$2,budget_reserved_micro_usd=budget_reserved_micro_usd-$2 WHERE id=$1',[context.runId,cost.toString()]);
    });
    return receipt;
  } catch(error) {
    await database().transaction((c:TransactionClient)=>settleEffect(c,prepared.effectId,'unknown'));
    throw error;
  } finally {
    if(token)await SessionTurnLeaseRegistry.releaseLease(conversationId,{ownerId:holder,generation:token.generation});
  }
}
/** Caller-supplied candidate text is not independently verified evidence. Kept fail-closed for old callers. */
export async function verifyArtifact(_artifactId:string,_candidate:string,_criteria:string[],_context:unknown):Promise<{success:boolean;verified:boolean;error?:string;verifiedArtifact?:string}> {
  throw new ExecutionBoundaryError('VERIFIER_RECEIPT_REQUIRED',403,'Independent scoped guest receipts are required; candidate text is not verification');
}
/** Consume real, digest-checked P3 receipts from a separate verifier task; missing criteria remain unknown. */
export async function verifyGuestArtifact(context:ActivityContext,artifactId:string,expectedDigest:string,criteria:Record<string,string>,producerTaskId:string) {
  await authority(context);
  if(context.taskId===producerTaskId)throw new ExecutionBoundaryError('VERIFIER_IDENTITY_CONFLICT',403,'Producer cannot verify its own artifact');
  const evidence=await database().transaction(async(c:TransactionClient)=>{
    const artifact=(await c.query('SELECT digest,project_id FROM artifacts WHERE id=$1',[artifactId])).rows[0];
    if(artifact?.project_id!==context.projectId||artifact.digest!==expectedDigest)throw new ExecutionBoundaryError('ARTIFACT_SCOPE_MISMATCH',403,'Artifact scope or digest mismatch');
    const producer=(await c.query("SELECT id FROM effects WHERE run_id=$1 AND task_id=$2 AND receipt_ref=$3 AND state='completed'",[context.runId,producerTaskId,artifactId])).rows[0];
    if(!producer)throw new ExecutionBoundaryError('ARTIFACT_SCOPE_MISMATCH',403,'Artifact must be the completed producer receipt');
    const candidate=await readArtifact(c,artifactId,context.projectId);
    if(typeof candidate.guestDigest!=='string')throw new ExecutionBoundaryError('ARTIFACT_SCOPE_MISMATCH',403,'Candidate guest digest is required');
    const results:Record<string,unknown>={};
    for(const [criterionId,effectId]of Object.entries(criteria)) {
      const effect=(await c.query(`SELECT e.state,e.receipt_ref,e.task_id FROM effects e JOIN tools t ON t.id::text=e.tool_id AND t.name='execute_command' WHERE e.id=$1 AND e.run_id=$2`,[effectId,context.runId])).rows[0];
      if(!effect||effect.task_id!==context.taskId||effect.state!=='completed'||!effect.receipt_ref)throw new ExecutionBoundaryError('VERIFIER_RECEIPT_REQUIRED',403,'Fresh verifier-task receipts required');
      const receipt=await readArtifact(c,effect.receipt_ref,context.projectId);
      if(receipt.baseDigest!==candidate.guestDigest)throw new ExecutionBoundaryError('VERIFIER_ARTIFACT_MISMATCH',409,'Verifier did not test the candidate tree');
      results[criterionId]={outcome:receipt.execResult?.exitCode===0?'pass':'fail',reason:'Independent trusted-local guest command receipt '+effectId};
    }
    return results;
  });
  const {VerificationService}=require('../../../services/verificationService.js');
  return VerificationService.createVerificationJob({runId:context.runId,artifactId,expectedDigest,verifierIdentity:context.taskId,suiteRevision:'p5-guest-v1',testResults:evidence});
}


