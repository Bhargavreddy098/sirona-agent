// Controlled test activity only. Never a provider, host-tool or guest qualification.
import {createRequire} from 'node:module';
import crypto from 'node:crypto';
import {StateGraph,Annotation,START,END} from '@langchain/langgraph';
import {SironaPostgresSaver} from '../../dist-workspace/src/orchestration/checkpointAdapter.js';
import {ensureEffect,dispatchEffect,settleEffect} from '../../dist-workspace/src/execution/effectJournal.js';
const require=createRequire(new URL('../../package.json',import.meta.url));
const [runId,taskId,mode]=process.argv.slice(2);
if(process.env.PGDATABASE!=='sirona_workspace_p0_test_20261028'||process.env.DATABASE_URL)throw new Error('Guarded test target required');
require('./server.js').loadEnvironment();
if(process.env.DATABASE_URL){const url=new URL(process.env.DATABASE_URL);url.pathname='/sirona_workspace_p0_test_20261028';process.env.DATABASE_URL=url.toString();for(const key of ['PGHOST','PGPORT','PGDATABASE','PGUSER','PGPASSWORD'])delete process.env[key];}
const db=require('./config/db.js'),config=require('./foundation/runtimeConfig.js').readRuntimeConfig(process.env);
const owner=db.createDatabaseOwner({...config.database,query_timeout:5000},{event:()=>{}});db.activateDatabaseOwner(owner);
try{
 await owner.initialize();if((await db.query('SELECT current_database() AS name')).rows[0].name!=='sirona_workspace_p0_test_20261028')throw new Error('Database guard failed');
 const saver=new SironaPostgresSaver(db),state=Annotation.Root({count:Annotation()});
 const graph=new StateGraph(state).addNode('effect',async()=>{
  await saver.flush();
  const receipt=await db.transaction(async c=>{
   const e=await ensureEffect(c,{runId,taskId,toolId:'p5_db_crash_fixture',inputDigest:crypto.createHash('sha256').update('controlled database effect').digest('hex'),targetSummary:'test-owned task counter',operationKey:'p5-crash-fixed-operation'});
   if(!e.created){if(e.effect.state!=='completed')throw Object.assign(new Error('Reconciliation required'),{code:'EFFECT_OUTCOME_UNKNOWN'});return {count:(await c.query('SELECT result FROM tasks WHERE id=$1',[taskId])).rows[0].result.count};}
   await dispatchEffect(c,e.effect.id,'p5-controlled-dispatch');
   if(mode==='after_dispatch')return {dispatched:true};
   const value=(await c.query("UPDATE tasks SET result=jsonb_build_object('count',COALESCE((result->>'count')::int,0)+1) WHERE id=$1 AND run_id=$2 RETURNING result",[taskId,runId])).rows[0].result;
   await settleEffect(c,e.effect.id,'completed');return value;
  });
  if(mode==='after_receipt'||mode==='after_dispatch'){process.send?.({at:mode});await new Promise(()=>{});}
  return receipt;
 }).addEdge(START,'effect').addEdge('effect',END).compile({checkpointer:saver});
 const cfg={configurable:{thread_id:runId}};
 const prior=await saver.getTuple(cfg);const result=await graph.invoke(prior?null:{count:0},cfg);await saver.flush();
 process.send?.({done:true,count:result.count});
}catch(error){process.send?.({error:error.code??'TEST_CHILD_FAILED'});process.exitCode=1;}finally{await owner.close();}
