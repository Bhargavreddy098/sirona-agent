import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fork,type ChildProcess} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {fixture,legacy} from './typedDatabaseBoundary.test.js';
function child(runId:string,taskId:string,mode:string){
 const env:NodeJS.ProcessEnv={...process.env,PGDATABASE:'sirona_workspace_p0_test_20261028'};delete env.DATABASE_URL;
 return fork(fileURLToPath(new URL('../../tests/helpers/p5-crash-child.mjs',import.meta.url)),[runId,taskId,mode],{env,stdio:['ignore','ignore','ignore','ipc'],windowsHide:true});
}
function message(c:ChildProcess){return new Promise<any>((resolve,reject)=>{const timer=setTimeout(()=>{c.kill();reject(new Error('Crash-test child timed out'));},10000);c.once('message',m=>{clearTimeout(timer);resolve(m);});c.once('error',e=>{clearTimeout(timer);reject(e);});});}
function exited(c:ChildProcess){return new Promise<number|null>(resolve=>c.once('exit',resolve));}
test('P5 real process death: committed DB effect is reused after SIGKILL before SDK checkpoint acknowledgment',async t=>{
 const f=await fixture(t),first=child(f.runId,f.taskId,'after_receipt');t.after(()=>first.kill());
 const at=await message(first);assert.equal(at.at,'after_receipt');const killed=exited(first);first.kill('SIGKILL');await killed;
 const restarted=child(f.runId,f.taskId,'resume');t.after(()=>restarted.kill());const finished=exited(restarted),result=await message(restarted);
 assert.equal(result.done,true);assert.equal(result.count,1);assert.equal(await finished,0);
 assert.equal((await legacy.query('SELECT result FROM tasks WHERE id=$1',[f.taskId])).rows[0].result.count,1);
 assert.equal((await legacy.query("SELECT COUNT(*)::int AS n FROM effects WHERE run_id=$1 AND operation_key='p5-crash-fixed-operation'",[f.runId])).rows[0].n,1);
});
test('P5 real process death: dispatched outcome stays unknown and is never blindly repeated',async t=>{
 const f=await fixture(t),first=child(f.runId,f.taskId,'after_dispatch');t.after(()=>first.kill());
 assert.equal((await message(first)).at,'after_dispatch');const killed=exited(first);first.kill('SIGKILL');await killed;
 const restarted=child(f.runId,f.taskId,'resume');t.after(()=>restarted.kill());const finished=exited(restarted),result=await message(restarted);
 assert.equal(result.error,'EFFECT_OUTCOME_UNKNOWN');assert.equal(await finished,1);
 assert.equal((await legacy.query('SELECT result FROM tasks WHERE id=$1',[f.taskId])).rows[0].result,null);
 assert.equal((await legacy.query("SELECT state FROM effects WHERE run_id=$1 AND operation_key='p5-crash-fixed-operation'",[f.runId])).rows[0].state,'dispatched');
});
