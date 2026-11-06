import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {approvedP5Fixture} from './helpers/p5-fixture.js';
import {legacy,server} from './typedDatabaseBoundary.test.js';
import {CredentialResolver} from '../src/providers/credentialResolver.js';
import {WorkspaceBroker} from '../src/workspace/workspaceBroker.js';
import {registerRoot,qualifyHome} from '../src/workspace/homeProfile.js';
import {WorkspaceGraphRuntime,configureWorkspaceGraphRuntime,clearWorkspaceGraphRuntime} from '../src/orchestration/graphRuntime.js';
const require=createRequire(new URL('../../package.json',import.meta.url));
const {ProviderService}=require('./services/providerService.js');

// Controlled upstream text is deliberately NOT real-model inference evidence.
// This qualifies actual canonical transport, governance, SDK, SQL, guest, patch, verifier and HTTP/SSE integration.
test('P5 canonical HTTP/SSE journey with controlled upstream: approvals, real guest/patch/verifier, no duplicate model calls',{timeout:120000},async t=>{
 const vault=new Map<string,string>();CredentialResolver.configureVault({put(s){const ref=CredentialResolver.generateCredentialRef();vault.set(ref,s);return ref;},get(ref){const s=vault.get(ref);if(!s)throw new Error('TEST_CREDENTIAL_MISSING');return s;},remove(ref){vault.delete(ref);}});
 let calls=0,connectionId='',modelId='',rootRef='',snapshotId='';
 const upstream=http.createServer(async(req,res)=>{
  const chunks=[];for await(const chunk of req)chunks.push(chunk);const body=JSON.parse(Buffer.concat(chunks).toString());
  assert.equal(body.generationConfig.maxOutputTokens,4096);assert.match(req.url??'',new RegExp(modelId));calls++;
  const prompt=JSON.stringify(body.contents);let answer;
  if(prompt.includes('Decompose this approved layered plan'))answer=JSON.stringify([{key:'answer',description:'Create answer.cjs exporting the number 42'}]);
  else if(prompt.includes('Propose a bounded implementation'))answer='Create answer.cjs with module.exports=42; verify independently.';
  else if(prompt.includes('Independently review'))answer=JSON.stringify({outcome:'pass',reason:'Controlled review fixture',command:['node','-e',"require('fs').writeFileSync('/workspace/answer.cjs','module.exports=42')"]});
  else {res.writeHead(400);res.end();return;}
  res.writeHead(200,{'Content-Type':'text/event-stream'});res.end('data: '+JSON.stringify({candidates:[{content:{role:'model',parts:[{text:answer}]},finishReason:'STOP'}],usageMetadata:{promptTokenCount:7,candidatesTokenCount:11,totalTokenCount:18}})+'\n\n');
 });
 await new Promise<void>(resolve=>upstream.listen(0,'127.0.0.1',resolve));
 const endpoint=`http://127.0.0.1:${(upstream.address() as any).port}`;
 const oldFlag=process.env.SIRONA_ORCHESTRATION_ENABLED,oldAdapter=process.env.SIRONA_PROVIDER_ADAPTER;
 process.env.SIRONA_ORCHESTRATION_ENABLED='true';process.env.SIRONA_PROVIDER_ADAPTER='vercel_ai_sdk';
 const runtime=new WorkspaceGraphRuntime(legacy);configureWorkspaceGraphRuntime(runtime);
 let f:Awaited<ReturnType<typeof approvedP5Fixture>>|undefined;
 try{
  f=await approvedP5Fixture(t,async scope=>{
   for(const capability of ['fs_write','shell_exec','bounded_process'])await legacy.query("INSERT INTO capability_grants(project_id,capability,resource_scope,expires_at) VALUES($1,$2,$3,NOW()+INTERVAL '1 hour')",[scope.projectId,capability,JSON.stringify({workspaceRoot:scope.root})]);
   rootRef=(await registerRoot(scope.projectId,scope.identity,'p5-canonical-root')).rootRef;await qualifyHome(scope.projectId,scope.identity);
   const connection=await ProviderService.createProviderConnection({workspaceId:scope.identity.workspaceId,kind:'google',name:'P5 controlled upstream only',apiKey:'controlled-dummy-key',baseUrl:endpoint});connectionId=connection.id;
   modelId='p5-controlled-'+crypto.randomUUID();
   await legacy.query("INSERT INTO models(id,provider_kind,name,is_available,context_window,max_output_tokens,input_cost_micro_usd_per_m,output_cost_micro_usd_per_m,provider_connection_id) VALUES($1,'google',$1,true,8192,8192,1000000,1000000,$2)",[modelId,connectionId]);
   const snapshot=await WorkspaceBroker.createSnapshotFromHost(scope.root);
   snapshotId=(await legacy.query("INSERT INTO repository_snapshots(project_id,tree_digest,status)VALUES($1,$2,'completed')RETURNING id",[scope.projectId,snapshot.treeDigest])).rows[0].id;
   return {acceptanceCriteria:[{id:'P5-ANSWER',name:'Exported answer must be 42',required:true}],orchestration:{version:'1.0.0',rootRef,parentModelId:modelId,specialistModelId:modelId,reviewerModelId:modelId,criteria:[{id:'P5-ANSWER',command:['node','-e',"require('assert/strict').equal(require('/workspace/answer.cjs'),42)"]}]}};
  });
  const scope=f,base=await server(t);
  const post=async(url:string,body:unknown={})=>{const response=await fetch(base+'/api/v1'+url,{method:'POST',headers:{...scope.headers,'Idempotency-Key':crypto.randomUUID()},body:JSON.stringify(body)});const result:any=await response.json();assert.ok(response.ok,JSON.stringify({url,status:response.status,problem:result}));return result;};
  const started=await post('/goals/'+scope.goalId+'/runs',{contractRevisionId:scope.contractRevisionId,contractDigest:scope.contractDigest,repositorySnapshotId:snapshotId,budgetCeilingMicroUsd:5000000});
  const runId=started.data.run.id as string;
  const resume=async()=>{const read:any=await (await fetch(base+'/api/v1/runs/'+runId,{headers:scope.headers})).json();await post('/runs/'+runId+'/resume',{expectedEpoch:read.data.run.epoch});};
  const approve=async()=>{
   const prepared=(await legacy.query("SELECT sequence::text,payload FROM run_events WHERE run_id=$1 AND event_type='graph.approval_required' ORDER BY sequence DESC LIMIT 1",[runId])).rows[0];const event=prepared?.payload;
   assert.ok(event?.inputDigest,'Real prepared-action event must precede human approval');
   const approval=(await post('/runs/'+runId+'/approval-requests',{eventSequence:prepared.sequence})).data;
   await post('/approvals/'+approval.approval.id+'/decisions',{decision:'approve',nonce:approval.nonce,digest:event.inputDigest});
   return event.kind;
  };
  const firstExecution=await post('/runs/'+runId+'/execute');assert.equal(firstExecution.data.status,'blocked');assert.equal(calls,3,JSON.stringify({status:firstExecution.data,events:(await legacy.query("SELECT event_type,payload->>'code' AS code,payload->>'reason' AS reason FROM run_events WHERE run_id=$1 ORDER BY sequence DESC LIMIT 8",[runId])).rows}));
  assert.equal(await approve(),'command');await resume();
  assert.equal((await post('/runs/'+runId+'/execute')).data.status,'blocked');assert.equal(calls,3);
  await assert.rejects(fs.readFile(path.join(scope.root,'answer.cjs')),{code:'ENOENT'});
  assert.equal(await approve(),'patch');await resume();
  assert.equal((await post('/runs/'+runId+'/execute')).data.status,'blocked');assert.equal(calls,3);
  assert.equal(await fs.readFile(path.join(scope.root,'answer.cjs'),'utf8'),'module.exports=42');
  assert.equal(await approve(),'command');await resume();
  const completed=await post('/runs/'+runId+'/execute');assert.equal(completed.data.status,'completed');assert.equal(completed.data.verification.outcome,'pass');assert.equal(calls,3);
  assert.equal((await legacy.query('SELECT COUNT(*)::int AS n FROM model_calls WHERE project_id=$1',[scope.projectId])).rows[0].n,3);
  const control=new AbortController();const events=await fetch(base+'/api/v1/runs/'+runId+'/events',{headers:{...scope.headers,'Last-Event-ID':'1'},signal:control.signal});assert.equal(events.status,200);
  const reader=events.body!.getReader();let text='';const timer=setTimeout(()=>control.abort(),5000);
  try{while(!text.includes('graph.completed')){const chunk=await reader.read();assert.equal(chunk.done,false);text+=new TextDecoder().decode(chunk.value);}assert.match(text,/graph.approval_required/);}
  finally{clearTimeout(timer);control.abort();await reader.cancel().catch(()=>{});}
 }finally{
  await runtime.close();clearWorkspaceGraphRuntime(runtime);
  if(f){await legacy.query("DELETE FROM sessions WHERE project_id=$1 AND title='P5 bounded activity'",[f.projectId]);}
  if(modelId)await legacy.query('DELETE FROM models WHERE id=$1',[modelId]);
  if(connectionId)await legacy.query('DELETE FROM provider_connections WHERE id=$1',[connectionId]);
  if(oldFlag===undefined)delete process.env.SIRONA_ORCHESTRATION_ENABLED;else process.env.SIRONA_ORCHESTRATION_ENABLED=oldFlag;
  if(oldAdapter===undefined)delete process.env.SIRONA_PROVIDER_ADAPTER;else process.env.SIRONA_PROVIDER_ADAPTER=oldAdapter;
  upstream.closeAllConnections();await new Promise<void>(resolve=>upstream.close(()=>resolve()));
 }
});
