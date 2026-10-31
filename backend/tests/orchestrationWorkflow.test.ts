import {test} from 'node:test';
import assert from 'node:assert/strict';
import {approvedP5Fixture} from './helpers/p5-fixture.js';
import {legacy,server} from './typedDatabaseBoundary.test.js';
import {bindGraphRun,isGraphRun} from '../src/orchestration/graphRuntime.js';
import {buildWorkspaceGraph} from '../src/orchestration/workspaceGraph.js';
test('P5 real HTTP: identity, pause/resume engine pin, cancellation and durable event replay',async t=>{
 const f=await approvedP5Fixture(t),base=await server(t);
 await legacy.transaction((c:any)=>bindGraphRun(c,f.runId));
 assert.equal(await isGraphRun(legacy,f.runId),true);
 const endpoint=base+'/api/v1/runs/'+f.runId;
 assert.equal((await fetch(endpoint+'/pause',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,401);
 const pause=await fetch(endpoint+'/pause',{method:'POST',headers:f.headers,body:'{}'});
 assert.equal(pause.status,202);assert.equal(((await pause.json()) as any).data.run.state,'paused');
 const previous=process.env.SIRONA_ORCHESTRATION_ENABLED;delete process.env.SIRONA_ORCHESTRATION_ENABLED;
 try{const resumed=await fetch(endpoint+'/resume',{method:'POST',headers:f.headers,body:'{}'});assert.equal(resumed.status,503);}
 finally{if(previous!==undefined)process.env.SIRONA_ORCHESTRATION_ENABLED=previous;}
 const controller=new AbortController();const events=await fetch(endpoint+'/events',{headers:{...f.headers,'Last-Event-ID':'1'},signal:controller.signal});
 assert.equal(events.status,200);const reader=events.body!.getReader();let text='';const timeout=setTimeout(()=>controller.abort(),5000);
 try{while(!text.includes('run_paused')){const part=await reader.read();assert.equal(part.done,false);text+=new TextDecoder().decode(part.value);}assert.doesNotMatch(text,/event: run_created/);}
 finally{clearTimeout(timeout);controller.abort();await reader.cancel().catch(()=>{});}
 const cancel=await fetch(endpoint+'/cancel',{method:'POST',headers:f.headers,body:'{}'});assert.equal(cancel.status,202);assert.equal(((await cancel.json()) as any).data.run.state,'cancelled');
});
test('P5 real lifecycle: unknown effects keep cancellation unresolved; no legacy conversion',async t=>{
 const f=await approvedP5Fixture(t);await legacy.transaction((c:any)=>bindGraphRun(c,f.runId));
 await legacy.query("INSERT INTO effects(run_id,task_id,tool_id,input_digest,target_summary,state)VALUES($1,$2,'test',$3,'unknown test boundary','unknown')",[f.runId,f.taskId,'f'.repeat(64)]);
 assert.equal((await legacy.ExecutionService.cancelRun(f.runId)).state,'cancelling');
 assert.equal(await isGraphRun(legacy,f.runId),true);
});
test('P5 graph rejects missing activity owners instead of running a no-op',()=>{assert.throws(()=>buildWorkspaceGraph(undefined as any),/GRAPH_ACTIVITY_OWNER_REQUIRED/);});
