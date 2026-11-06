import {test} from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {fixture,legacy} from './typedDatabaseBoundary.test.js';
import {buildWorkspaceGraph,type WorkspaceActivities,type WorkspaceWork} from '../src/orchestration/workspaceGraph.js';
import {SironaPostgresSaver} from '../src/orchestration/checkpointAdapter.js';

// SDK/storage conformance only. These deterministic activities are explicitly not provider/guest qualification.
function controls(calls:string[],approval=true,verification:'pass'|'fail'|'unknown'='pass'):WorkspaceActivities {
  return {
    authorize:async()=>{calls.push('authorize');},
    plan:async()=>[{key:'coder',description:'SDK conformance',role:'coder',modelId:'test-only'}],
    specialize:async(_w,t)=>{calls.push('specialize');return {key:t.key,agentId:'test-only',output:'SDK test result'};},
    review:async()=>({outcome:'pass',reason:'test control'}),
    approve:async()=>approval,
    execute:async()=>{calls.push('execute');return {testOnly:true,execResult:{exitCode:0}};},
    patch:async()=>{calls.push('patch');},
    verify:async()=>{calls.push('verify');return {outcome:verification,reportId:'test-only'};},
  };
}
function initial(runId:string):WorkspaceWork{return {runId,version:'1.0.0',tasks:[],proposals:[],repairRounds:0,critiqueRounds:0,status:'running'};}

test('P5 SDK/storage: actual compiled graph persists channels, pending writes and parent lineage',async t=>{
  const f=await fixture(t),calls:string[]=[];
  const saver=new SironaPostgresSaver(legacy);
  const graph=buildWorkspaceGraph(controls(calls)).compile({checkpointer:saver});
  const config={configurable:{thread_id:f.runId,run_id:f.runId,checkpoint_ns:''}};
  const result=await graph.invoke({work:initial(f.runId)},config);
  await saver.flush();
  assert.equal(result.work.status,'completed');
  assert.equal(calls.filter(c=>c==='execute').length,1);
  const reloaded=await new SironaPostgresSaver(legacy).getTuple(config);
  assert.ok(reloaded);
  assert.equal((reloaded.checkpoint.channel_values.work as WorkspaceWork).status,'completed');
  assert.ok(reloaded?.parentConfig?.configurable?.checkpoint_id);
  const tuples=[];for await(const tuple of saver.list(config,{limit:100}))tuples.push(tuple);
  assert.ok(tuples.length>=8,'SDK must save each superstep, not overwrite one row');
  assert.notEqual(tuples[0].checkpoint.id,tuples[1].checkpoint.id);
  const restored=buildWorkspaceGraph(controls(calls)).compile({checkpointer:new SironaPostgresSaver(legacy)});
  await restored.invoke(null,config);
  assert.equal(calls.filter(c=>c==='execute').length,1,'Completed SDK resume cannot redispatch execution');
});

test('P5 SDK/storage: rejection and unknown verification cannot complete a graph',async t=>{
  for(const [approved,outcome]of [[false,'pass'],[true,'unknown']] as const){
    const f=await fixture(t),calls:string[]=[];
    const graph=buildWorkspaceGraph(controls(calls,approved,outcome)).compile({checkpointer:new SironaPostgresSaver(legacy)});
    const config={configurable:{thread_id:f.runId}};
    const result=await graph.invoke({work:initial(f.runId)},config);
    if(!approved){assert.ok(!calls.includes('execute')&&!calls.includes('patch'));assert.deepEqual((await graph.getState(config)).next,['approval']);}
    else assert.equal(result.work.status,'blocked');
  }
});

test('P5 saver: namespaces, immutable IDs, BIGINT allocation, duplicate writes and corruption',async t=>{
  const f=await fixture(t),saver=new SironaPostgresSaver(legacy);
  // Existing canonical sequences can exceed JS safe integer range.
  await legacy.query("INSERT INTO run_checkpoints(run_id,sequence,epoch,state_digest,state_data) VALUES($1,'9007199254740993',1,$2,'{}')",[f.runId,'0'.repeat(64)]);
  const config={configurable:{thread_id:f.runId,checkpoint_ns:'fanout:reviewer'}};
  const cp={v:1,id:crypto.randomUUID(),ts:new Date().toISOString(),channel_values:{data:new Map([['a',1]])},channel_versions:{data:'1'},versions_seen:{},pending_sends:[]};
  const metadata={source:'loop' as const,step:1,writes:{},parents:{}};
  const saved=await saver.put(config,cp,metadata);
  const row=(await legacy.query("SELECT sequence FROM run_checkpoints WHERE run_id=$1 AND state_data->'sironaGraph'->>'checkpointId'=$2",[f.runId,cp.id])).rows[0];
  assert.equal(row.sequence,'9007199254740994');
  await saver.put(config,cp,metadata);
  await Promise.all([saver.putWrites(saved,[['data','one']],'a'),saver.putWrites(saved,[['data','two']],'b')]);
  await saver.putWrites(saved,[['data','must not overwrite']],'a');
  const tuple=await saver.getTuple(saved);
  assert.ok(tuple?.checkpoint.channel_values.data instanceof Map);
  assert.equal(tuple?.pendingWrites?.length,2);
  assert.equal(tuple?.pendingWrites?.find(w=>w[0]==='a')?.[2],'one');
  await assert.rejects(saver.put(config,{...cp,channel_values:{changed:true}},metadata),/GRAPH_CHECKPOINT_CONFLICT/);
  await assert.rejects(saver.flush(),/GRAPH_CHECKPOINT_CONFLICT/);
  const fresh=new SironaPostgresSaver(legacy);
  assert.equal(await fresh.getTuple({configurable:{thread_id:f.runId,checkpoint_ns:'different'}}),undefined);
  await legacy.query("UPDATE run_checkpoints SET state_data=jsonb_set(state_data,'{sironaGraph,checkpointId}','\"corrupt\"') WHERE run_id=$1 AND sequence=$2",[f.runId,row.sequence]);
  await assert.rejects(fresh.getTuple(config),/GRAPH_CHECKPOINT_CORRUPT/);
});
