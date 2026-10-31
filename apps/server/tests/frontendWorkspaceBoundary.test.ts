import {test} from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {approvedP5Fixture} from './helpers/p5-fixture.js';
import {fixture,legacy,server} from './typedDatabaseBoundary.test.js';
import {registerRoot,qualifyHome} from '../src/workspace/homeProfile.js';
import {reconcileTerminalTasks} from '../src/workspace/frontendController.js';
const require=createRequire(new URL('../../package.json',import.meta.url));const WebSocket=require('ws');
async function response(base:string,path:string,headers:Record<string,string>,body?:unknown,key=crypto.randomUUID()){
 const r=await fetch(base+'/api/v1'+path,{method:body===undefined?'GET':'POST',headers:{...headers,'Idempotency-Key':key},...(body===undefined?{}:{body:JSON.stringify(body)})});return{status:r.status,value:await r.json() as any};
}
test('Prepared workspace API: scoped readiness, CSRF/worker denial, reserved tasks and nonce replay',{timeout:120000},async t=>{
 const f=await approvedP5Fixture(t),foreign=await fixture(t),base=await server(t),before=(await legacy.query('SELECT count(*)::int AS n FROM tasks WHERE run_id=$1',[f.runId])).rows[0].n;
 const flag=process.env.SIRONA_TRUSTED_LOCAL_DOCKER_ENABLED;process.env.SIRONA_TRUSTED_LOCAL_DOCKER_ENABLED='false';
 try{const ready=await response(base,`/projects/${f.projectId}/workspace-readiness`,f.headers);assert.equal(ready.status,200);assert.equal(ready.value.data.profile.enabled,false);assert.equal(ready.value.data.profile.qualified,false);assert.equal(ready.value.data.terminal.canPrepare,false);assert.equal((await legacy.query('SELECT count(*)::int AS n FROM tasks WHERE run_id=$1',[f.runId])).rows[0].n,before);}finally{process.env.SIRONA_TRUSTED_LOCAL_DOCKER_ENABLED=flag;}
 assert.equal((await response(base,`/projects/${f.projectId}/workspace-readiness`,foreign.headers)).status,403);
 await legacy.query("UPDATE users SET role='worker' WHERE id=$1",[f.identity.principalId]);try{assert.equal((await response(base,`/projects/${f.projectId}/workspace-readiness`,f.headers)).status,403);}finally{await legacy.query("UPDATE users SET role='owner' WHERE id=$1",[f.identity.principalId]);}
 const root=await registerRoot(f.projectId,f.identity,'boundary-root');for(const capability of ['shell_exec','bounded_process'])await legacy.GovernanceService.createGrant(f.projectId,{capability,resourceScope:{workspaceRoot:f.root},ttlMs:600000});
 await qualifyHome(f.projectId,f.identity);
 const missingCsrf={...f.headers};delete (missingCsrf as Record<string,string>)['X-CSRF-Token'];assert.equal((await response(base,`/projects/${f.projectId}/terminal-preparations`,missingCsrf,{runId:f.runId,rootRef:root.rootRef})).status,403);
 const foreignRoot=await registerRoot(foreign.projectId,foreign.identity,'foreign-root');assert.equal((await response(base,`/projects/${f.projectId}/terminal-preparations`,f.headers,{runId:f.runId,rootRef:foreignRoot.rootRef})).status,403);
 const raceKeys=[crypto.randomUUID(),crypto.randomUUID()],race=await Promise.all(raceKeys.map(key=>response(base,`/projects/${f.projectId}/terminal-preparations`,f.headers,{runId:f.runId,rootRef:root.rootRef},key)));assert.deepEqual(race.map(result=>result.status).sort(),[201,409],'Exactly one concurrent preparation may be admitted');const winner=race.findIndex(result=>result.status===201),requestKey=raceKeys[winner],first=race[winner],prepared=first.value.data;
 assert.equal((await response(base,`/projects/${f.projectId}/terminal-preparations`,f.headers,{runId:f.runId,rootRef:root.rootRef},requestKey)).value.data.preparationId,prepared.preparationId);
 const row=(await legacy.query('SELECT state,lease_holder FROM tasks WHERE id=$1',[prepared.preparationId])).rows[0];assert.equal(row.state,'blocked');assert.equal(row.lease_holder,null);assert.equal(await legacy.ExecutionService.claimTask(f.runId,{taskId:prepared.preparationId,holder:'generic-worker'}),null);
 assert.equal((await response(base,`/runs/${f.runId}/approval-requests`,foreign.headers,{eventSequence:prepared.eventSequence})).status,403);
 assert.equal((await response(base,`/runs/${f.runId}/approval-requests`,f.headers,{eventSequence:prepared.eventSequence,inputDigest:prepared.inputDigest})).status,400);
 const proofKey=crypto.randomUUID(),proof1=await response(base,`/runs/${f.runId}/approval-requests`,f.headers,{eventSequence:prepared.eventSequence},proofKey);assert.equal(proof1.status,201,proof1.value.detail);assert.equal(typeof proof1.value.data.nonce,'string');assert.equal(proof1.value.data.nonce.length,64);assert.equal('nonce_hash'in proof1.value.data.approval,false);
 assert.equal((await response(base,`/runs/${f.runId}/approval-requests`,f.headers,{eventSequence:prepared.eventSequence},proofKey)).status,409);
 const proof2=await response(base,`/runs/${f.runId}/approval-requests`,f.headers,{eventSequence:prepared.eventSequence});assert.equal(proof2.status,201,proof2.value.detail);assert.ok(proof2.value.data.nonce!==proof1.value.data.nonce);
 assert.equal((await legacy.query('SELECT state FROM approvals WHERE id=$1',[proof1.value.data.approval.id])).rows[0].state,'revoked');
 const decided=await response(base,`/approvals/${proof2.value.data.approval.id}/decisions`,f.headers,{decision:'approve',nonce:proof2.value.data.nonce,digest:prepared.inputDigest});assert.equal(decided.status,200,decided.value.detail);
 assert.equal((await response(base,`/approvals/${proof2.value.data.approval.id}/decisions`,f.headers,{decision:'approve',nonce:proof2.value.data.nonce,digest:prepared.inputDigest})).status,409);
 const cancelled=await response(base,`/projects/${f.projectId}/docker-workers/recover`,f.headers,{runId:f.runId});if(cancelled.status!==200)await reconcileTerminalTasks(f.projectId,f.runId,f.identity,true).catch((error:any)=>assert.fail(`Reconciliation diagnostic: ${error.code??error.name}; ${error.routine??''}; position ${error.position??''}`));assert.equal(cancelled.status,200,cancelled.value.detail);assert.equal(cancelled.value.data.preparationsCancelled,1);assert.equal((await legacy.query('SELECT state,lease_holder FROM tasks WHERE id=$1',[prepared.preparationId])).rows[0].state,'cancelled');
 assert.equal((await response(base,`/projects/${f.projectId}/terminal-preparations/${prepared.preparationId}/open`,f.headers,{approvalId:proof2.value.data.approval.id})).status,409);
 assert.equal((await response(base,`/runs/${f.runId}/approval-requests`,f.headers,{eventSequence:'9223372036854775808'})).status,400);
 assert.equal((await response(base,`/projects/${f.projectId}/terminal-preparations/extra`,f.headers,{})).status,503,'Stage17 must keep unknown paths denied');
 const stalePrep=await response(base,`/projects/${f.projectId}/terminal-preparations`,f.headers,{runId:f.runId,rootRef:root.rootRef});assert.equal(stalePrep.status,201,stalePrep.value.detail);
 const conflictingKey=await response(base,`/runs/${f.runId}/approval-requests`,f.headers,{eventSequence:stalePrep.value.data.eventSequence},proofKey);assert.equal(conflictingKey.status,409);assert.equal(conflictingKey.value.code,'STATE_CONFLICT');assert.equal(conflictingKey.value.detail,'IDEMPOTENCY_CONFLICT');
 const staleProof=await response(base,`/runs/${f.runId}/approval-requests`,f.headers,{eventSequence:stalePrep.value.data.eventSequence});assert.equal(staleProof.status,201,staleProof.value.detail);
 const paused=await response(base,`/runs/${f.runId}/pause`,f.headers,{});assert.equal(paused.status,202,paused.value.detail);const resumed=await response(base,`/runs/${f.runId}/resume`,f.headers,{expectedEpoch:paused.value.data.run.epoch});assert.equal(resumed.status,202,resumed.value.detail);
 const staleDecision=await response(base,`/approvals/${staleProof.value.data.approval.id}/decisions`,f.headers,{decision:'approve',nonce:staleProof.value.data.nonce,digest:stalePrep.value.data.inputDigest});assert.equal(staleDecision.status,403,'A previous epoch must not authorize the current run');assert.equal(staleDecision.value.detail,'APPROVAL_SOURCE_STALE');assert.equal((await legacy.query('SELECT state FROM approvals WHERE id=$1',[staleProof.value.data.approval.id])).rows[0].state,'pending');
 assert.equal((await response(base,`/projects/${f.projectId}/docker-workers/recover`,f.headers,{runId:f.runId})).status,200);
});
test('Prepared terminal: actual guest PTY, exact input approval, lease renewal and confirmed cleanup',{timeout:120000},async t=>{
 const f=await approvedP5Fixture(t),base=await server(t,true),root=await registerRoot(f.projectId,f.identity,'pty-root');
 for(const capability of ['shell_exec','bounded_process'])await legacy.GovernanceService.createGrant(f.projectId,{capability,resourceScope:{workspaceRoot:f.root},ttlMs:600000});
 const preparedResult=await response(base,`/projects/${f.projectId}/terminal-preparations`,f.headers,{runId:f.runId,rootRef:root.rootRef});assert.equal(preparedResult.status,201,preparedResult.value.detail);const prep=preparedResult.value.data;
 const proof=await response(base,`/runs/${f.runId}/approval-requests`,f.headers,{eventSequence:prep.eventSequence});assert.equal(proof.status,201,proof.value.detail);
 const decision=await response(base,`/approvals/${proof.value.data.approval.id}/decisions`,f.headers,{decision:'approve',nonce:proof.value.data.nonce,digest:prep.inputDigest});assert.equal(decision.status,200,decision.value.detail);
 const opened=await response(base,`/projects/${f.projectId}/terminal-preparations/${prep.preparationId}/open`,f.headers,{approvalId:proof.value.data.approval.id});assert.equal(opened.status,201,opened.value.detail);const terminalId=opened.value.data.terminalId;assert.equal(opened.value.data.live,true);assert.equal(opened.value.data.commandsCompleted,false);
 let ws:any;try{
  const leaseBefore=(await legacy.query('SELECT lease_expires_at FROM tasks WHERE id=$1',[prep.preparationId])).rows[0].lease_expires_at;await delay(1200);assert.ok(new Date((await legacy.query('SELECT lease_expires_at FROM tasks WHERE id=$1',[prep.preparationId])).rows[0].lease_expires_at).getTime()>new Date(leaseBefore).getTime());
  const ticket=await response(base,`/terminals/${terminalId}/ticket`,f.headers,{});assert.equal(ticket.status,200,ticket.value.detail);
  const frames:any[]=[];ws=new WebSocket(base.replace('http:','ws:')+`/api/v1/terminals/${terminalId}/channel?ticket=${ticket.value.data.ticket}`,{headers:{Cookie:f.headers.Cookie,Origin:'http://127.0.0.1:5173'}});ws.on('message',(data:Buffer)=>frames.push(JSON.parse(data.toString())));
  await new Promise<void>((resolve,reject)=>{ws.once('open',resolve);ws.once('error',()=>reject(new Error('Terminal channel unavailable')));});
  const wait=async(check:()=>boolean)=>{for(let i=0;i<60&&!check();i++)await delay(100);assert.ok(check(),'Expected real terminal frame was not received');};await wait(()=>frames.some(frame=>frame.type==='attached'));
  const line="printf 'WIRED_%s\\n' 'TERMINAL'\n",input=await response(base,`/terminals/${terminalId}/input-preparations`,f.headers,{data:line});assert.equal(input.status,201,input.value.detail);const p=input.value.data;
  const approval=await response(base,`/runs/${f.runId}/approval-requests`,f.headers,{eventSequence:p.eventSequence});assert.equal(approval.status,201,approval.value.detail);
  const accepted=await response(base,`/approvals/${approval.value.data.approval.id}/decisions`,f.headers,{decision:'approve',nonce:approval.value.data.nonce,digest:p.inputDigest});assert.equal(accepted.status,200,accepted.value.detail);
  const send={type:'input',data:line,approvalId:approval.value.data.approval.id,operationKey:p.operationKey};ws.send(JSON.stringify(send));await wait(()=>frames.some(frame=>frame.type==='receipt')&&frames.filter(frame=>frame.type==='output').map(frame=>frame.data).join('').includes('WIRED_TERMINAL'));
  assert.equal(frames.find(frame=>frame.type==='receipt').receipt.commandsCompleted,false);ws.send(JSON.stringify(send));await wait(()=>frames.filter(frame=>frame.type==='receipt').length===2);assert.equal((await legacy.query('SELECT count(*)::int AS n FROM effects WHERE run_id=$1 AND operation_key=$2',[f.runId,p.operationKey])).rows[0].n,1);
  const privateHolder=(await legacy.query('SELECT lease_holder FROM tasks WHERE id=$1',[prep.preparationId])).rows[0].lease_holder;const eventPayloads=(await legacy.query("SELECT payload FROM run_events WHERE run_id=$1 AND event_type='task_started' AND payload->>'taskId'=$2",[f.runId,prep.preparationId])).rows;assert.ok(eventPayloads.length>0);assert.ok(!JSON.stringify(eventPayloads).includes(privateHolder));
  const cancellation=await response(base,`/runs/${f.runId}/cancel`,f.headers,{});assert.equal(cancellation.status,202,cancellation.value.detail);assert.equal(cancellation.value.data.run.state,'cancelling','An active guest must prevent an immediate cancelled claim');
  for(let i=0;i<100&&(await legacy.query('SELECT status FROM isolation_workers WHERE id=$1',[terminalId])).rows[0].status!=='terminated';i++)await delay(100);
  assert.equal((await legacy.query('SELECT status FROM isolation_workers WHERE id=$1',[terminalId])).rows[0].status,'terminated','Cancellation must actually terminate the guest');
 }finally{ws?.terminate();const closed=await fetch(base+`/api/v1/terminals/${terminalId}`,{method:'DELETE',headers:f.headers});if(closed.status!==200)await reconcileTerminalTasks(f.projectId,f.runId,f.identity).catch((error:any)=>assert.fail(`Reconciliation diagnostic: ${error.code??error.name}; ${error.routine??''}; position ${error.position??''}`));assert.equal(closed.status,200,(await closed.clone().json() as any).detail);assert.equal((await closed.json() as any).data.status,'closed');}
 const worker=(await legacy.query('SELECT status FROM isolation_workers WHERE id=$1',[terminalId])).rows[0],task=(await legacy.query('SELECT state,lease_holder FROM tasks WHERE id=$1',[prep.preparationId])).rows[0];assert.equal(worker.status,'terminated');assert.equal(task.state,'cancelled');assert.equal(task.lease_holder,null);
 assert.equal((await legacy.query('SELECT state FROM runs WHERE id=$1',[f.runId])).rows[0].state,'cancelled');
});

test('Prepared terminal: lease expiry stops the actual guest, denies further input and requires confirmed reconciliation',{timeout:120000},async t=>{
 const f=await approvedP5Fixture(t),base=await server(t,true),root=await registerRoot(f.projectId,f.identity,'lease-loss-root');
 for(const capability of ['shell_exec','bounded_process'])await legacy.GovernanceService.createGrant(f.projectId,{capability,resourceScope:{workspaceRoot:f.root},ttlMs:600000});
 const preparation=await response(base,`/projects/${f.projectId}/terminal-preparations`,f.headers,{runId:f.runId,rootRef:root.rootRef});assert.equal(preparation.status,201,preparation.value.detail);const prep=preparation.value.data;
 const proof=await response(base,`/runs/${f.runId}/approval-requests`,f.headers,{eventSequence:prep.eventSequence});assert.equal(proof.status,201,proof.value.detail);
 assert.equal((await response(base,`/approvals/${proof.value.data.approval.id}/decisions`,f.headers,{decision:'approve',nonce:proof.value.data.nonce,digest:prep.inputDigest})).status,200);
 const opened=await response(base,`/projects/${f.projectId}/terminal-preparations/${prep.preparationId}/open`,f.headers,{approvalId:proof.value.data.approval.id});assert.equal(opened.status,201,opened.value.detail);const terminalId=opened.value.data.terminalId;
 try{
  await legacy.query("UPDATE tasks SET lease_expires_at=NOW()-INTERVAL '1 second' WHERE id=$1",[prep.preparationId]);
  for(let i=0;i<100&&(await legacy.query('SELECT status FROM isolation_workers WHERE id=$1',[terminalId])).rows[0].status!=='terminated';i++)await delay(100);
  assert.equal((await legacy.query('SELECT status FROM isolation_workers WHERE id=$1',[terminalId])).rows[0].status,'terminated','A lost lease must stop the real worker');
  const denied=await response(base,`/terminals/${terminalId}/input-preparations`,f.headers,{data:'printf must-not-execute\\n\n'});assert.ok([403,409].includes(denied.status),'Expired ownership cannot prepare more input');
 }finally{
  const closed=await fetch(base+`/api/v1/terminals/${terminalId}`,{method:'DELETE',headers:f.headers});assert.equal(closed.status,200,(await closed.clone().json() as any).detail);
 }
 const task=(await legacy.query('SELECT state,lease_holder FROM tasks WHERE id=$1',[prep.preparationId])).rows[0];assert.equal(task.state,'cancelled');assert.equal(task.lease_holder,null);
});

test('Prepared terminal: killed backend exposes recovery, never a fabricated live PTY or input replay',{timeout:120000},async t=>{
 const f=await approvedP5Fixture(t),base=await server(t,true),root=await registerRoot(f.projectId,f.identity,'restart-root');
 for(const capability of ['shell_exec','bounded_process'])await legacy.GovernanceService.createGrant(f.projectId,{capability,resourceScope:{workspaceRoot:f.root},ttlMs:600000});
 const preparation=await response(base,`/projects/${f.projectId}/terminal-preparations`,f.headers,{runId:f.runId,rootRef:root.rootRef});assert.equal(preparation.status,201,preparation.value.detail);const prep=preparation.value.data;
 const proof=await response(base,`/runs/${f.runId}/approval-requests`,f.headers,{eventSequence:prep.eventSequence});assert.equal(proof.status,201,proof.value.detail);assert.equal((await response(base,`/approvals/${proof.value.data.approval.id}/decisions`,f.headers,{decision:'approve',nonce:proof.value.data.nonce,digest:prep.inputDigest})).status,200);
 const moduleUrl=new URL('../src/workspace/frontendController.js',import.meta.url).href;
 const code=`import {createRequire} from 'node:module';const require=createRequire(new URL('../../package.json',${JSON.stringify(import.meta.url)}));require('./server.js').loadEnvironment();if(new URL(process.env.DATABASE_URL).pathname!=='/sirona_workspace_p0_test_20261028')throw Error('ISOLATED_DATABASE_REQUIRED');const db=require('./config/db.js'),config=require('./foundation/runtimeConfig.js').readRuntimeConfig(process.env);const owner=db.createDatabaseOwner({...config.database,max:4},require('./foundation/logger.js').createLogger(config));db.activateDatabaseOwner(owner);await owner.initialize();process.on('message',async input=>{try{const controller=await import(${JSON.stringify(moduleUrl)});const opened=await controller.openPreparedTerminal(input.projectId,input.preparationId,input.identity,{approvalId:input.approvalId});process.send({terminalId:opened.terminalId});}catch(error){process.send({code:error.code??'CHILD_OPEN_FAILED'});}});process.send({ready:true});`;
 const child=spawn(process.execPath,['--input-type=module','-e',code],{windowsHide:true,stdio:['ignore','ignore','ignore','ipc'],env:{...process.env}});
 const message=()=>new Promise<any>((resolve,reject)=>{const timer=setTimeout(()=>{child.off('message',received);reject(new Error('Owned backend child did not respond'));},20000);const received=(value:unknown)=>{clearTimeout(timer);resolve(value);};child.once('message',received);child.once('error',()=>{clearTimeout(timer);reject(new Error('Owned backend child failed'));});});
 try{
 assert.equal((await message()).ready,true);const opened=message();child.send({projectId:f.projectId,preparationId:prep.preparationId,approvalId:proof.value.data.approval.id,identity:f.identity});const terminal=await opened;assert.ok(terminal.terminalId,terminal.code);
 const exited=new Promise<void>(resolve=>child.once('exit',()=>resolve()));child.kill('SIGKILL');await exited;
 const ready=await response(base,`/projects/${f.projectId}/workspace-readiness`,f.headers);assert.equal(ready.status,200,ready.value.detail);const saved=ready.value.data.preparations.find((value:any)=>value.preparationId===prep.preparationId);assert.equal(saved.workerStatus,'running');assert.equal(saved.usable,false,'Persisted running metadata cannot qualify a live transport after a backend kill');
 assert.equal((await response(base,`/terminals/${terminal.terminalId}/ticket`,f.headers,{})).status,409);
 const before=(await legacy.query('SELECT count(*)::int AS n FROM effects WHERE run_id=$1',[f.runId])).rows[0].n;
 const recovered=await response(base,`/projects/${f.projectId}/docker-workers/recover`,f.headers,{runId:f.runId});assert.equal(recovered.status,200,recovered.value.detail);assert.equal(recovered.value.data.stopped,1);assert.equal(recovered.value.data.unresolved,0);assert.equal(recovered.value.data.preparationsCancelled,1);assert.equal(recovered.value.data.effectReplayAllowed,false);
 assert.equal((await legacy.query('SELECT status FROM isolation_workers WHERE id=$1',[terminal.terminalId])).rows[0].status,'terminated');assert.equal((await legacy.query('SELECT state,lease_holder FROM tasks WHERE id=$1',[prep.preparationId])).rows[0].lease_holder,null);assert.equal((await legacy.query('SELECT count(*)::int AS n FROM effects WHERE run_id=$1',[f.runId])).rows[0].n,before);
 }finally{if(child.exitCode===null&&!child.killed){const exited=new Promise<void>(resolve=>child.once('exit',()=>resolve()));child.kill('SIGKILL');await exited;}const cleanup=await response(base,`/projects/${f.projectId}/docker-workers/recover`,f.headers,{runId:f.runId});assert.equal(cleanup.status,200,cleanup.value.detail);assert.equal(cleanup.value.data.unresolved,0);}
});
