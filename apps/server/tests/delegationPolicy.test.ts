import {test} from 'node:test';
import assert from 'node:assert/strict';
import {approvedP5Fixture} from './helpers/p5-fixture.js';
import {legacy} from './typedDatabaseBoundary.test.js';
import {DurableDelegation} from '../src/orchestration/delegationService.js';
test('P5 admission: racing fourth specialist denied by real DB lock; sequential reuse and immutable assignment',async t=>{
 await legacy.query("UPDATE agent_sessions SET state='idle' WHERE role='p5_specialist' AND state='active'");
 const f=await approvedP5Fixture(t),service=new DurableDelegation(legacy);
 const request=(key:string)=>({...f,key,purpose:'bounded test assignment',modelId:'test-only-model'});
 const results=await Promise.allSettled([0,1,2,3].map(i=>service.admit(request('race-'+i))));
 const admitted=results.filter(r=>r.status==='fulfilled').map(r=>(r as PromiseFulfilledResult<any>).value);
 const rejected=results.filter(r=>r.status==='rejected') as PromiseRejectedResult[];
 assert.equal(admitted.length,3);assert.equal(rejected.length,1);assert.equal(rejected[0].reason.code,'SPECIALIST_POOL_FULL');
 assert.equal((await legacy.query("SELECT COUNT(*)::int AS n FROM agent_sessions WHERE run_id=$1 AND role='p5_specialist' AND state='active'",[f.runId])).rows[0].n,3);
 const existing=(await legacy.query('SELECT step_key FROM tasks WHERE id=$1',[admitted[0].taskId])).rows[0].step_key.slice(3);
 assert.equal((await service.admit(request(existing))).taskId,admitted[0].taskId);
 await assert.rejects(service.admit({...request(existing),purpose:'different'}),{code:'IDEMPOTENCY_CONFLICT'});
 await legacy.query("UPDATE agent_sessions SET state='idle' WHERE id=$1",[admitted[0].agentId]);
 assert.equal((await service.admit(request('sequential'))).replay,false);
 await assert.rejects(service.admit({...request('nested'),parentId:admitted[1].agentId}),{code:'DELEGATION_FORBIDDEN'});
 await assert.rejects(service.admit({...request('spoof'),identity:{authenticated:true}}),{code:'INVALID_INPUT'});
 await legacy.query("UPDATE agent_sessions SET state='idle' WHERE run_id=$1",[f.runId]);
});
test('P5 admission: total/deadline limits survive separate service instances',async t=>{
 const f=await approvedP5Fixture(t);
 for(let i=0;i<12;i++){
   const assignment=await new DurableDelegation(legacy).admit({...f,key:'total-'+i,purpose:'bounded test',modelId:'test-only'});
   await legacy.query("UPDATE agent_sessions SET state='idle' WHERE id=$1",[assignment.agentId]);
 }
 await assert.rejects(new DurableDelegation(legacy).admit({...f,key:'thirteen',purpose:'bounded test',modelId:'test-only'}),{code:'DELEGATION_LIMIT'});
 await legacy.query("UPDATE runs SET created_at=NOW()-INTERVAL '31 minutes' WHERE id=$1",[f.runId]);
 await assert.rejects(new DurableDelegation(legacy).admit({...f,key:'expired',purpose:'bounded test',modelId:'test-only'}),{code:'RUN_DEADLINE'});
});
