import {test} from 'node:test';
import assert from 'node:assert/strict';
import {approvedP5Fixture} from './helpers/p5-fixture.js';
import {legacy} from './typedDatabaseBoundary.test.js';
import {registerRoot,qualifyHome} from '../src/workspace/homeProfile.js';
import {DockerWorkerAdapter,type TaskExecutionRequest} from '../src/windows/dockerWorkerAdapter.js';
import {patchApprovalDigest} from '../src/workspace/patchService.js';
import {applyApprovedPatch,verifyGuestArtifact,type ActivityContext} from '../src/orchestration/activityAdapter.js';

test('P5 actual guest/verifier: bad candidate fails, approved correction passes in separate fresh guests',{timeout:90000},async t=>{
 const f=await approvedP5Fixture(t,{acceptanceCriteria:[{id:'P5-ANSWER',name:'Exported value must be 42',required:true}]});
 for(const capability of ['fs_write','shell_exec','bounded_process'])await legacy.query("INSERT INTO capability_grants(project_id,capability,resource_scope,expires_at) VALUES($1,$2,$3,NOW()+INTERVAL '1 hour')",[f.projectId,capability,JSON.stringify({workspaceRoot:f.root})]);
 const {rootRef}=await registerRoot(f.projectId,f.identity,'p5-verifier-root');await qualifyHome(f.projectId,f.identity);
 const approve=async(digest:string)=>{const a=await legacy.GovernanceService.createApprovalRequest({projectId:f.projectId,kind:'effect',inputDigest:digest,ttlMs:600000});await legacy.GovernanceService.decideApproval(a.approval.id,{decision:'approve',nonce:a.nonce,digest,approverId:f.identity.principalId});return a.approval.id;};
 const claim=async(key:string)=>{const task=await legacy.ExecutionService.createTask({runId:f.runId,stepKey:key});const claimed=await legacy.ExecutionService.claimTask(f.runId,{taskId:task.id,holder:key,ttlSeconds:300});return {taskId:task.id,fence:{holder:claimed.leaseHolder,runEpoch:claimed.runEpoch,leaseEpoch:claimed.leaseEpoch}};};
 for(const [stage,value]of [[0,41],[1,42]]){
  const producer=await claim('p5-producer-'+stage);
  const context:ActivityContext={runId:f.runId,projectId:f.projectId,taskId:producer.taskId,rootRef,workspaceRoot:f.root,identity:f.identity,fence:producer.fence,operationKey:'produce-'+stage};
  const request:TaskExecutionRequest={...context,command:['node','-e',`require('fs').writeFileSync('/workspace/answer.cjs','module.exports=${value}')`],capabilities:[],timeoutMs:10000};
  request.approvalId=await approve(DockerWorkerAdapter.commandDigest(request));
  const candidate=await DockerWorkerAdapter.executeTask(request);assert.equal(candidate.execResult.exitCode,0);
  const operationKey='patch-'+stage,approvalId=await approve(patchApprovalDigest(candidate.patchPreviewId,candidate.patch.patchDigest,operationKey));
  assert.equal((await applyApprovedPatch({...context,previewId:candidate.patchPreviewId,operationKey,approvalId})).status,'completed');
  const verifier=await claim('p5-verifier-'+stage),verifierContext:ActivityContext={...context,taskId:verifier.taskId,fence:verifier.fence,operationKey:'verify-'+stage};
  const verifyRequest:TaskExecutionRequest={...verifierContext,command:['node','-e',"require('assert/strict').equal(require('/workspace/answer.cjs'),42)"],capabilities:[],timeoutMs:10000};
  verifyRequest.approvalId=await approve(DockerWorkerAdapter.commandDigest(verifyRequest));
  const verified=await DockerWorkerAdapter.executeTask(verifyRequest);
  assert.notEqual(candidate.containerId,verified.containerId);
  assert.equal(verified.execResult.exitCode===0,stage===1);
  const producerEffect=(await legacy.query('SELECT receipt_ref FROM effects WHERE run_id=$1 AND operation_key=$2',[f.runId,context.operationKey])).rows[0];
  const verifierEffect=(await legacy.query('SELECT id FROM effects WHERE run_id=$1 AND operation_key=$2',[f.runId,verifierContext.operationKey])).rows[0];
  const artifact=(await legacy.query('SELECT digest FROM artifacts WHERE id=$1',[producerEffect.receipt_ref])).rows[0];
  await assert.rejects(verifyGuestArtifact(context,producerEffect.receipt_ref,artifact.digest,{'P5-ANSWER':verifierEffect.id},producer.taskId),{code:'VERIFIER_IDENTITY_CONFLICT'});
  const report=await verifyGuestArtifact(verifierContext,producerEffect.receipt_ref,artifact.digest,{'P5-ANSWER':verifierEffect.id},producer.taskId);
  assert.equal(report.outcome,stage===0?'fail':'pass');
  await assert.rejects(verifyGuestArtifact(verifierContext,producerEffect.receipt_ref,'0'.repeat(64),{'P5-ANSWER':verifierEffect.id},producer.taskId),{code:'ARTIFACT_SCOPE_MISMATCH'});
 }
});
