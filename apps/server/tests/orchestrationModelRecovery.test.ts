import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {approvedP5Fixture} from './helpers/p5-fixture.js';
import {legacy} from './typedDatabaseBoundary.test.js';
import {CredentialResolver} from '../src/providers/credentialResolver.js';
import {executeSpecialistTask,type ActivityContext} from '../src/orchestration/activityAdapter.js';
const require=createRequire(new URL('../../package.json',import.meta.url));const {ProviderService}=require('./services/providerService.js');
test('P5 model activity: interrupted controlled transport retains unknown charges and cannot be redispatched',async t=>{
 const records=new Map<string,string>();CredentialResolver.configureVault({put(s){const r=CredentialResolver.generateCredentialRef();records.set(r,s);return r;},get(r){const s=records.get(r);if(!s)throw new Error('TEST_KEY_UNAVAILABLE');return s;},remove(r){records.delete(r);}});
 const f=await approvedP5Fixture(t);let calls=0;
 const upstream=http.createServer(async(req,res)=>{for await(const _chunk of req){/* Drain test request. */}calls++;res.writeHead(200,{'Content-Type':'text/event-stream'});res.write('data: '+JSON.stringify({candidates:[{content:{role:'model',parts:[{text:'partial controlled output'}]}}]})+'\n\n');setTimeout(()=>res.destroy(),25);});
 await new Promise<void>(resolve=>upstream.listen(0,'127.0.0.1',resolve));
 const url=`http://127.0.0.1:${(upstream.address() as any).port}`;
 const connection=await ProviderService.createProviderConnection({workspaceId:f.identity.workspaceId,kind:'google',name:'P5 interrupted controlled transport',apiKey:'controlled-dummy-key',baseUrl:url});
 const modelId='p5-interrupted-'+crypto.randomUUID(),conversationId=crypto.randomUUID(),turnId=crypto.randomUUID();
 const before=process.env.SIRONA_PROVIDER_ADAPTER;process.env.SIRONA_PROVIDER_ADAPTER='vercel_ai_sdk';
 try{
  await legacy.query("INSERT INTO models(id,provider_kind,name,is_available,context_window,max_output_tokens,input_cost_micro_usd_per_m,output_cost_micro_usd_per_m,provider_connection_id) VALUES($1,'google',$1,true,8192,8192,1000000,1000000,$2)",[modelId,connection.id]);
  await legacy.query('INSERT INTO sessions(id,project_id,user_id,title,model)VALUES($1,$2,$3,$4,$5)',[conversationId,f.projectId,f.identity.principalId,'P5 controlled interruption',modelId]);
  const task=await legacy.ExecutionService.claimTask(f.runId,{taskId:f.taskId,holder:'p5-interrupted',ttlSeconds:150});
  const c:ActivityContext={runId:f.runId,projectId:f.projectId,taskId:f.taskId,workspaceRoot:f.root,rootRef:crypto.randomUUID(),identity:f.identity,operationKey:'p5-interrupted-fixed-key',fence:{holder:task.leaseHolder,runEpoch:task.runEpoch,leaseEpoch:task.leaseEpoch}};
  const invoke=()=>executeSpecialistTask(conversationId,modelId,'controlled test only',{maxTokens:64,maxDurationSeconds:5,contextOutputCap:4096},c,turnId);
  await assert.rejects(invoke(),{code:'STREAM_INTERRUPTED'});assert.equal(calls,1);
  assert.equal((await legacy.query('SELECT state FROM effects WHERE run_id=$1 AND operation_key=$2',[f.runId,c.operationKey])).rows[0].state,'unknown');
  const held=(await legacy.query('SELECT budget_reserved_micro_usd FROM runs WHERE id=$1',[f.runId])).rows[0].budget_reserved_micro_usd;assert.ok(BigInt(held)>0n);
  await assert.rejects(invoke(),{code:'EFFECT_OUTCOME_UNKNOWN'});assert.equal(calls,1);
  assert.equal((await legacy.query('SELECT budget_reserved_micro_usd FROM runs WHERE id=$1',[f.runId])).rows[0].budget_reserved_micro_usd,held);
  assert.equal((await legacy.query('SELECT session_id FROM session_turn_leases WHERE session_id=$1 AND released_at IS NULL',[conversationId])).rows.length,0);
 }finally{
  if(before===undefined)delete process.env.SIRONA_PROVIDER_ADAPTER;else process.env.SIRONA_PROVIDER_ADAPTER=before;
  await legacy.query('DELETE FROM sessions WHERE id=$1',[conversationId]);await legacy.query('DELETE FROM models WHERE id=$1',[modelId]);await legacy.query('DELETE FROM provider_connections WHERE id=$1',[connection.id]);
  upstream.closeAllConnections();await new Promise<void>(resolve=>upstream.close(()=>resolve()));
 }
});
