import {test} from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {fixture,legacy} from './typedDatabaseBoundary.test.js';
import {SironaPostgresSaver,computeStateDigest} from '../src/orchestration/checkpointAdapter.js';
test('P5 saver: complete SDK checkpoint, metadata, parent and writes round trip through fresh owner',async t=>{
 const f=await fixture(t),saver=new SironaPostgresSaver(legacy),config={configurable:{thread_id:f.runId,checkpoint_ns:'non-numeric:child'}};
 const first={v:1,id:'00000000-0000-6000-8000-000000000001',ts:new Date().toISOString(),channel_values:{messages:['first']},channel_versions:{messages:'9007199254740993'},versions_seen:{node:{messages:'9007199254740993'}},pending_sends:[]};
 const metadata={source:'loop' as const,step:1,writes:{node:{data:'present'}},parents:{}};
 const saved=await saver.put(config,first,metadata);
 await saver.putWrites(saved,[['messages','output'],['__error__','original']],'task');
 await saver.putWrites(saved,[['__error__','replacement']],'task');
 const tuple=await new SironaPostgresSaver(legacy).getTuple(saved);
 assert.deepEqual(tuple?.checkpoint,first);assert.deepEqual(tuple?.metadata,metadata);
 assert.deepEqual(tuple?.pendingWrites?.find(w=>w[1]==='messages'),['task','messages','output']);
 assert.deepEqual(tuple?.pendingWrites?.find(w=>w[1]==='__error__'),['task','__error__','replacement']);
 const second={...first,id:'00000000-0000-6000-8000-000000000002',channel_values:{messages:['second']}};
 const saved2=await saver.put(saved,second,{...metadata,step:2});
 assert.deepEqual((await saver.getTuple(saved2))?.parentConfig,saved);
 assert.equal((await saver.getTuple(config))?.checkpoint.id,second.id);
 const history=[];for await(const tuple of saver.list(config,{before:saved2,limit:1}))history.push(tuple);
 assert.equal(history.length,1);assert.equal(history[0].checkpoint.id,first.id);
 await assert.rejects(saver.getTuple({configurable:{thread_id:crypto.randomUUID(),run_id:f.runId}}),/GRAPH_THREAD_SCOPE_MISMATCH/);
 await legacy.query("UPDATE run_checkpoints SET state_data='{}' WHERE run_id=$1",[f.runId]);
 assert.equal(computeStateDigest({b:2,a:1}),computeStateDigest({a:1,b:2}));
 // Corruption which removes the namespace cannot create a valid continuation.
 assert.equal(await saver.getTuple(config),undefined);
});
