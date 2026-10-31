import {test} from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fixture,server,legacy} from './typedDatabaseBoundary.test.js';
import {ensureEffect,dispatchEffect,settleEffect} from '../src/execution/effectJournal.js';
const digest=crypto.createHash('sha256').update('actual-bound-input').digest('hex');
test('100 concurrent writers allocate unique ordered committed events',async t=>{
  const f=await fixture(t);await Promise.all(Array.from({length:100},(_,i)=>legacy.ExecutionService.recordEvent(f.runId,'parallel',{i})));
  const events=await legacy.ExecutionService.getRunEvents(f.runId,{limit:500});assert.equal(events.length,101);assert.deepEqual(events.map((e:any)=>Number(e.sequence)),Array.from({length:101},(_,i)=>i+1));
});
test('concurrent operation identities deduplicate and mismatched payload fails',async t=>{
  const f=await fixture(t),input={runId:f.runId,taskId:f.taskId,toolId:'read_file',inputDigest:digest,targetSummary:'read.txt',operationKey:'stable-key'};
  const results=await Promise.all(Array.from({length:20},()=>legacy.transaction((client:any)=>ensureEffect(client,input))));assert.equal(new Set(results.map((r:any)=>r.effect.id)).size,1);assert.equal(results.filter((r:any)=>r.created).length,1);
  await assert.rejects(legacy.transaction((client:any)=>ensureEffect(client,{...input,inputDigest:'f'.repeat(64)})),(error:any)=>error.code==='IDEMPOTENCY_CONFLICT');
});
test('dispatch crash is unknown and never redispatched; pre-dispatch retry is safe',async t=>{
  const f=await fixture(t),input={runId:f.runId,taskId:f.taskId,toolId:'read_file',inputDigest:digest,targetSummary:'x',operationKey:'crash-key'};
  const first=await legacy.transaction((c:any)=>ensureEffect(c,input));const retry=await legacy.transaction((c:any)=>ensureEffect(c,input));assert.equal(first.effect.id,retry.effect.id);
  await legacy.transaction((c:any)=>dispatchEffect(c,first.effect.id,crypto.randomUUID()));
  await assert.rejects(legacy.transaction((c:any)=>dispatchEffect(c,first.effect.id,crypto.randomUUID())),(e:any)=>e.code==='EFFECT_OUTCOME_UNKNOWN');
  await legacy.transaction((c:any)=>settleEffect(c,first.effect.id,'unknown'));assert.equal((await legacy.query('SELECT state FROM effects WHERE id=$1',[first.effect.id])).rows[0].state,'unknown');
});
test('stale lease completion and expiry are fenced; outstanding effects prevent reclaim',async t=>{
  const f=await fixture(t),claimed=await legacy.ExecutionService.claimTask(f.runId,{holder:'worker-one'});const fence={holder:'worker-one',runEpoch:claimed.runEpoch,leaseEpoch:claimed.leaseEpoch};
  await assert.rejects(legacy.ExecutionService.finishTask(f.taskId,{fence:{...fence,leaseEpoch:'999'}}),(e:any)=>e.code==='STALE_WORKER');
  await legacy.query('UPDATE runs SET epoch=epoch+1 WHERE id=$1',[f.runId]);await assert.rejects(legacy.ExecutionService.finishTask(f.taskId,{fence}),(e:any)=>e.code==='STALE_WORKER');
  await legacy.query("UPDATE tasks SET lease_expires_at=NOW()-INTERVAL '1 second' WHERE id=$1",[f.taskId]);
  await legacy.query("INSERT INTO effects(run_id,task_id,tool_id,input_digest,target_summary,state)VALUES($1,$2,'read_file',$3,'pending reconciliation','unknown')",[f.runId,f.taskId,digest]);assert.equal(await legacy.ExecutionService.claimTask(f.runId),null);
});
test('real keyed HTTP tool replay returns original receipt and file bytes once',async t=>{
  const f=await fixture(t),base=await server(t);await fs.writeFile(path.join(f.root,'file.txt'),'first bytes');const task=await legacy.ExecutionService.claimTask(f.runId,{holder:'http-worker'});
  const body={toolName:'read_file',input:{path:'file.txt'},projectId:f.projectId,workspaceRoot:f.root,runId:f.runId,taskId:f.taskId,workerFence:{holder:'http-worker',runEpoch:task.runEpoch,leaseEpoch:task.leaseEpoch}};
  const request=()=>fetch(base+'/api/v1/tools/invoke',{method:'POST',headers:{...f.headers,'Idempotency-Key':'http-operation'},body:JSON.stringify(body)});
  const one=await request();assert.equal(one.status,200);const original=(await one.json()) as any;
  await fs.writeFile(path.join(f.root,'file.txt'),'different later bytes');const two=await request();assert.equal(two.status,200);const replay=(await two.json()) as any;assert.equal(replay.data.receipt.id,original.data.receipt.id);assert.equal(replay.data.output.content,'first bytes');
  assert.equal((await legacy.query('SELECT COUNT(*)::int AS n FROM tool_invocations WHERE run_id=$1',[f.runId])).rows[0].n,1);
  // Receipt committed before journal settlement: recovery must reconcile, never reread.
  await legacy.query("UPDATE effects SET state='dispatched' WHERE run_id=$1",[f.runId]);const recovered=await request();assert.equal(recovered.status,200);assert.equal(((await recovered.json()) as any).data.output.content,'first bytes');
  await legacy.query('UPDATE capability_grants SET revoked_at=NOW() WHERE project_id=$1',[f.projectId]);assert.equal((await request()).status,403);
});
test('SSE paginates replay and tails a new committed event with cursor',async t=>{
  const f=await fixture(t),base=await server(t);await Promise.all(Array.from({length:125},(_,i)=>legacy.ExecutionService.recordEvent(f.runId,'replay',{i})));
  const controller=new AbortController();const response=await fetch(base+'/api/v1/runs/'+f.runId+'/events',{headers:{...f.headers,'Last-Event-ID':'25'},signal:controller.signal});assert.equal(response.status,200);
  const reader=response.body!.getReader();let text='';const readUntil=async(pattern:RegExp)=>{const timer=setTimeout(()=>controller.abort(),8000);try{while(!pattern.test(text)){const part=await reader.read();if(part.done)throw new Error('premature stream close');text+=new TextDecoder().decode(part.value);}}finally{clearTimeout(timer);}};
  await readUntil(/id: 126\n/);await legacy.ExecutionService.recordEvent(f.runId,'live-proof',{actual:true});await readUntil(/event: live-proof/);assert.match(text,/id: 127\n/);assert.doesNotMatch(text,/id: 25\n/);controller.abort();await reader.cancel().catch(()=>{});
});
