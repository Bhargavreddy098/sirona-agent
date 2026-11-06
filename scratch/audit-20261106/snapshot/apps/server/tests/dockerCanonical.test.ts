import test from 'node:test';import assert from 'node:assert/strict';import crypto from 'node:crypto';import fs from 'node:fs';import path from 'node:path';
import {fixture,legacy,server} from './typedDatabaseBoundary.test.js';
import {DockerWorkerAdapter,type TaskExecutionRequest} from '../src/windows/dockerWorkerAdapter.js';
import {patchApprovalDigest} from '../src/workspace/patchService.js';
import {spawn} from 'node:child_process';
import {DockerRuntime} from '../src/windows/dockerRuntime.js';
import {CanonicalTerminal} from '../src/windows/canonicalTerminal.js';
import {requireHomeProfile} from '../src/workspace/homeProfile.js';
import {createRequire} from 'node:module';
const {WebSocket}=createRequire(import.meta.url)('ws');
async function approve(f:any,inputDigest:string,kind='effect',contractRevisionId?:string){const a=await legacy.GovernanceService.createApprovalRequest({projectId:f.projectId,inputDigest,kind,contractRevisionId,ttlMs:600000});await legacy.GovernanceService.decideApproval(a.approval.id,{decision:'approve',nonce:a.nonce,digest:inputDigest,approverId:f.identity.principalId});return a.approval.id;}
async function setup(t:any,terminal=false){const f=await fixture(t),q=legacy.query,hash='d'.repeat(64);const base=await server(t,terminal);
 for(const cap of ['fs_write','shell_exec','bounded_process'])await q("INSERT INTO capability_grants(project_id,capability,resource_scope,expires_at)VALUES($1,$2,$3,NOW()+INTERVAL '1 hour')",[f.projectId,cap,JSON.stringify({workspaceRoot:f.root})]);
 const goal=(await q("INSERT INTO goals(project_id,intent)VALUES($1,'P3 real trusted Docker test')RETURNING id",[f.projectId])).rows[0].id;const req=(await q('INSERT INTO requirement_revisions(goal_id,digest)VALUES($1,$2)RETURNING id',[goal,hash])).rows[0].id;const plan=(await q('INSERT INTO plans(goal_id)VALUES($1)RETURNING id',[goal])).rows[0].id;const planRev=(await q('INSERT INTO plan_revisions(plan_id,goal_id,requirement_revision_id,digest)VALUES($1,$2,$3,$4)RETURNING id',[plan,goal,req,hash])).rows[0].id;const contract=(await q('INSERT INTO contracts(goal_id)VALUES($1)RETURNING id',[goal])).rows[0].id;const rev=(await q("INSERT INTO contract_revisions(contract_id,goal_id,plan_revision_id,requirement_revision_id,digest,document)VALUES($1,$2,$3,$4,$5,'{}')RETURNING id",[contract,goal,planRev,req,hash])).rows[0].id;await q('UPDATE runs SET contract_revision_id=$2 WHERE id=$1',[f.runId,rev]);await approve(f,hash,'contract',rev);
 const claimed=await legacy.ExecutionService.claimTask(f.runId,{holder:'p3-test',ttlSeconds:300});const fence={holder:claimed.leaseHolder,runEpoch:claimed.runEpoch,leaseEpoch:claimed.leaseEpoch};
 const api=async(url:string,method='GET',body?:unknown,headers:Record<string,string>=f.headers)=>{const r=await fetch(base+url,{method,headers:{...headers,...(method==='POST'&&!headers['Idempotency-Key']?{'Idempotency-Key':crypto.randomUUID()}:{})},...(method!=='GET'&&body!==undefined?{body:JSON.stringify(body)}:{})});return{status:r.status,body:await r.json() as any};};
 const root=await api('/api/v1/projects/'+f.projectId+'/workspace-root','POST',{profile:'trusted-local'});assert.equal(root.status,201,JSON.stringify(root.body));const rootRef=root.body.data.rootRef;
 const qualified=await api('/api/v1/projects/'+f.projectId+'/isolation/docker-qualification','POST',{profile:'trusted-local'});assert.equal(qualified.status,200,JSON.stringify(qualified.body));
 return{...f,rootRef,fence,api,base};}
function request(f:any,command:string[]):TaskExecutionRequest{return{projectId:f.projectId,runId:f.runId,taskId:f.taskId,workspaceRoot:f.root,rootRef:f.rootRef,identity:f.identity,fence:f.fence,capabilities:[],command,operationKey:'p3-'+crypto.randomUUID(),timeoutMs:10000};}
async function invoke(f:any,r:TaskExecutionRequest){return f.api('/api/v1/tools/invoke','POST',{toolName:'execute_command',input:{command:r.command[0],args:r.command.slice(1),rootRef:r.rootRef,approvalId:r.approvalId},projectId:r.projectId,runId:r.runId,taskId:r.taskId,workspaceRoot:r.workspaceRoot,workerFence:r.fence,timeoutMs:r.timeoutMs},{...f.headers,'Idempotency-Key':r.operationKey});}
test('P3 canonical authenticated tool -> Node guest -> durable receipt -> approved native patch -> replay',async t=>{const f=await setup(t);fs.writeFileSync(path.join(f.root,'base.txt'),'original');const r=request(f,['node','-e',"require('fs').writeFileSync('/workspace/created.txt','actual guest output');console.log('NODE_WORKER_OK')"]);r.approvalId=await approve(f,DockerWorkerAdapter.commandDigest(r));const executed=await invoke(f,r);assert.equal(executed.status,200,JSON.stringify(executed.body));assert.equal(executed.body.data.output.exitCode,0);assert.match(executed.body.data.output.stdout,/NODE_WORKER_OK/);assert.equal(fs.existsSync(path.join(f.root,'created.txt')),false);
 const previewId=executed.body.data.output.patchPreviewId;const preview=await f.api('/api/v1/projects/'+f.projectId+'/patch-previews/'+previewId);assert.equal(preview.status,200);const operationKey='patch-'+crypto.randomUUID(),approvalId=await approve(f,patchApprovalDigest(previewId,preview.body.data.patchDigest,operationKey));const payload={runId:f.runId,taskId:f.taskId,rootRef:f.rootRef,approvalId,fence:f.fence};const applied=await f.api('/api/v1/projects/'+f.projectId+'/patch-previews/'+previewId+'/apply','POST',payload,{...f.headers,'Idempotency-Key':operationKey});assert.equal(applied.status,200,JSON.stringify(applied.body));assert.equal(applied.body.data.status,'completed');assert.equal(fs.readFileSync(path.join(f.root,'created.txt'),'utf8'),'actual guest output');const replay=await f.api('/api/v1/projects/'+f.projectId+'/patch-previews/'+previewId+'/apply','POST',payload,{...f.headers,'Idempotency-Key':operationKey});assert.equal(replay.status,200);assert.equal(replay.body.data.effectId,applied.body.data.effectId);
 const again=await invoke(f,r);assert.equal(again.status,200,JSON.stringify(again.body));assert.equal(again.body.data.receipt.id,executed.body.data.receipt.id);assert.equal((await legacy.query('SELECT COUNT(*)::int AS n FROM effects WHERE run_id=$1',[f.runId])).rows[0].n,2);const files=await f.api('/api/v1/projects/'+f.projectId+'/files?rootRef='+f.rootRef);assert.equal(files.status,200);assert.ok(files.body.data.files.some((x:any)=>x.path==='created.txt'));
});
test('P3 canonical command denies wrong approval, cross-project root, stale fence and revoked grants',async t=>{const f=await setup(t),r=request(f,['node','-e','console.log("must not run")']);r.approvalId=await approve(f,'0'.repeat(64));assert.equal((await invoke(f,r)).status,403);r.approvalId=await approve(f,DockerWorkerAdapter.commandDigest(r));const stale={...r,fence:{...f.fence,leaseEpoch:'999999'}};assert.equal((await invoke(f,stale)).status,409);await legacy.query("UPDATE capability_grants SET revoked_at=NOW() WHERE project_id=$1 AND capability='shell_exec'",[f.projectId]);assert.equal((await invoke(f,r)).status,403);assert.equal((await legacy.query('SELECT COUNT(*)::int AS n FROM effects WHERE run_id=$1',[f.runId])).rows[0].n,0);});

test('P3 concurrent host edits survive approved patch rejection and recovery never rewrites bytes',async t=>{
 const f=await setup(t);fs.writeFileSync(path.join(f.root,'review.txt'),'base');
 const r=request(f,['node','-e',"require('fs').writeFileSync('/workspace/review.txt','guest proposal')"]);r.approvalId=await approve(f,DockerWorkerAdapter.commandDigest(r));
 const executed=await invoke(f,r);assert.equal(executed.status,200,JSON.stringify(executed.body));const previewId=executed.body.data.output.patchPreviewId;
 const preview=await f.api('/api/v1/projects/'+f.projectId+'/patch-previews/'+previewId);assert.equal(preview.status,200);
 const key='conflict-'+crypto.randomUUID(),approvalId=await approve(f,patchApprovalDigest(previewId,preview.body.data.patchDigest,key));
 fs.writeFileSync(path.join(f.root,'review.txt'),'user edited after preview');
 const applied=await f.api('/api/v1/projects/'+f.projectId+'/patch-previews/'+previewId+'/apply','POST',{runId:f.runId,taskId:f.taskId,rootRef:f.rootRef,approvalId,fence:f.fence},{...f.headers,'Idempotency-Key':key});
 assert.equal(applied.status,409);assert.equal(fs.readFileSync(path.join(f.root,'review.txt'),'utf8'),'user edited after preview');
 const effect=(await legacy.query('SELECT id,state FROM effects WHERE run_id=$1 AND operation_key=$2',[f.runId,key])).rows[0];assert.equal(effect.state,'unknown');
 const recovered=await f.api('/api/v1/projects/'+f.projectId+'/patch-effects/'+effect.id+'/reconcile','POST',{});assert.equal(recovered.status,200,JSON.stringify(recovered.body));assert.equal(recovered.body.data.status,'unknown');
 assert.equal(fs.readFileSync(path.join(f.root,'review.txt'),'utf8'),'user edited after preview');
 await legacy.query('UPDATE capability_grants SET revoked_at=NOW() WHERE id=$1',[f.rootRef]);
 assert.equal((await f.api('/api/v1/projects/'+f.projectId+'/patch-effects/'+effect.id+'/reconcile','POST',{})).status,403);
});

test('P3 revoking a grant during real execution stops the owned workload and prohibits replay',async t=>{
 const f=await setup(t),r=request(f,['node','-e','setInterval(()=>{},1000)']);r.approvalId=await approve(f,DockerWorkerAdapter.commandDigest(r));
 const running=invoke(f,r);let worker:any;const deadline=Date.now()+8000;
 while(Date.now()<deadline){worker=(await legacy.query("SELECT id,metadata,status FROM isolation_workers WHERE metadata->>'runId'=$1 AND status='running'",[f.runId])).rows[0];if(worker)break;await new Promise(resolve=>setTimeout(resolve,100));}
 assert.ok(worker,'Actual running worker must exist before revocation');
 await legacy.query("UPDATE capability_grants SET revoked_at=NOW() WHERE project_id=$1 AND capability='shell_exec'",[f.projectId]);
 const response=await running;assert.notEqual(response.status,200);
 assert.equal((await legacy.query('SELECT status FROM isolation_workers WHERE id=$1',[worker.id])).rows[0].status,'terminated');
 assert.equal((await legacy.query('SELECT state FROM effects WHERE run_id=$1 AND operation_key=$2',[f.runId,r.operationKey])).rows[0].state,'unknown');
 assert.equal((await invoke(f,r)).status,403);
});

test('P3 killed control plane recovers only its persisted worker and never replays a dispatched effect',async t=>{
 const f=await setup(t),r=request(f,['node','-e','setInterval(()=>{},1000)']);r.timeoutMs=60000;r.approvalId=await approve(f,DockerWorkerAdapter.commandDigest(r));
 const moduleUrl=new URL('../src/windows/dockerWorkerAdapter.js',import.meta.url).href;
 const childCode=`import {createRequire} from 'node:module';const require=createRequire(new URL('../../package.json',${JSON.stringify(import.meta.url)}));require('./server.js').loadEnvironment();if(new URL(process.env.DATABASE_URL).pathname!=='/sirona_workspace_p0_test_20261028')throw Error('TEST_DATABASE_REQUIRED');const db=require('./config/db.js');const config=require('./foundation/runtimeConfig.js').readRuntimeConfig(process.env);const owner=db.createDatabaseOwner({...config.database,max:4},require('./foundation/logger.js').createLogger(config));db.activateDatabaseOwner(owner);await owner.initialize();process.on('message',async request=>{try{const {DockerWorkerAdapter}=await import(${JSON.stringify(moduleUrl)});await DockerWorkerAdapter.executeTask(request);process.send({done:true});}catch{process.send({failed:true});}finally{await owner.close();}});process.send({ready:true});`;
 const child=spawn(process.execPath,['--input-type=module','-e',childCode],{windowsHide:true,stdio:['ignore','ignore','ignore','ipc'],env:{...process.env}});
 t.after(()=>{if(child.exitCode===null)child.kill();});
 await new Promise<void>((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error('Child control plane did not start')),10000);child.once('error',reject);child.once('message',()=>{clearTimeout(timeout);resolve();});});child.send(r);
 let worker:any;const deadline=Date.now()+10000;
 while(Date.now()<deadline){worker=(await legacy.query("SELECT id,metadata,status FROM isolation_workers WHERE metadata->>'runId'=$1 AND status='running'",[f.runId])).rows[0];if(worker?.metadata.binding)break;await new Promise(resolve=>setTimeout(resolve,100));}
 assert.ok(worker?.metadata.binding,'Persisted full Docker binding is required for crash recovery');
 const exited=new Promise<void>(resolve=>child.once('exit',()=>resolve()));child.kill();await exited;
 const response=await f.api('/api/v1/projects/'+f.projectId+'/docker-workers/recover','POST',{runId:f.runId});assert.equal(response.status,200,JSON.stringify(response.body));assert.equal(response.body.data.stopped,1);assert.equal(response.body.data.unresolved,0);assert.equal(response.body.data.effectReplayAllowed,false);
 assert.equal((await legacy.query('SELECT status FROM isolation_workers WHERE id=$1',[worker.id])).rows[0].status,'terminated');
 const retry=await invoke(f,r);assert.equal(retry.status,409,JSON.stringify(retry.body));
 assert.ok(['dispatched','unknown'].includes((await legacy.query('SELECT state FROM effects WHERE run_id=$1 AND operation_key=$2',[f.runId,r.operationKey])).rows[0].state));
 // A foreign in-memory handle is not silently adopted; recovery uses only server-read durable bindings.
 await assert.rejects(DockerRuntime.exec(worker.metadata.binding.containerId,['id']),{code:'CONTAINER_OWNERSHIP_REQUIRED'});
});

test('P3 canonical terminal requires a one-use authenticated channel and approved input; replay cannot resend',async t=>{
 const f=await setup(t,true),r=CanonicalTerminal.request(request(f,['/bin/sh']));r.approvalId=await approve(f,DockerWorkerAdapter.commandDigest(r));
 const opened=await f.api('/api/v1/projects/'+f.projectId+'/terminals','POST',{runId:f.runId,taskId:f.taskId,rootRef:f.rootRef,approvalId:r.approvalId,fence:f.fence,cols:80,rows:24},{...f.headers,'Idempotency-Key':r.operationKey!});assert.equal(opened.status,201,JSON.stringify(opened.body));const id=opened.body.data.terminalId;
 const ticket=await f.api('/api/v1/terminals/'+id+'/ticket','POST',{});assert.equal(ticket.status,200,JSON.stringify(ticket.body));
 const require=createRequire(import.meta.url),proxy=require('node:http').createServer((_req:any,res:any)=>res.writeHead(404).end());await new Promise<void>(resolve=>proxy.listen(0,'127.0.0.1',resolve));
 const closeProxy=require('../../../desktop/src/terminalProxy.cjs').attachTerminalProxy(proxy,{port:proxy.address().port,origin:'http://127.0.0.1:5173',backendPort:Number(new URL(f.base).port)});
 t.after(async()=>{closeProxy();await new Promise<void>(resolve=>proxy.close(()=>resolve()));});
 const url='ws://127.0.0.1:'+proxy.address().port+'/api/v1/terminals/'+id+'/channel?ticket='+ticket.body.data.ticket;
 const rejected=await new Promise<number>((resolve,reject)=>{const socket=new WebSocket(url,{headers:{Cookie:f.headers.Cookie,Origin:'https://evil.invalid'}});socket.once('unexpected-response',(_req:any,res:any)=>{resolve(res.statusCode);res.resume();socket.terminate();});socket.on('error',()=>{});socket.once('open',()=>reject(new Error('Cross-origin terminal accepted')));});assert.equal(rejected,403);
 const ws=new WebSocket(url,{headers:{Cookie:f.headers.Cookie,Origin:'http://127.0.0.1:5173'}}),messages:any[]=[];ws.on('message',(bytes:Buffer)=>messages.push(JSON.parse(bytes.toString())));ws.on('error',()=>{});t.after(()=>ws.terminate());
 const wait=async(predicate:()=>boolean)=>{const deadline=Date.now()+10000;while(Date.now()<deadline){if(predicate())return;await new Promise(resolve=>setTimeout(resolve,30));}assert.fail('Missing canonical terminal event');};
 await wait(()=>messages.some(x=>x.type==='attached'));
 const reused=await new Promise<number>(resolve=>{const socket=new WebSocket(url,{headers:{Cookie:f.headers.Cookie,Origin:'http://127.0.0.1:5173'}});socket.once('unexpected-response',(_req:any,res:any)=>{resolve(res.statusCode);res.resume();socket.terminate();});socket.on('error',()=>{});});assert.equal(reused,403);
 ws.send(JSON.stringify({type:'resize',cols:91,rows:37}));await wait(()=>messages.some(x=>x.type==='resized'));
 const data="node -e \"require('fs').appendFileSync('/workspace/session.txt','x');console.log('CANONICAL_'+'PTY_OK')\"\n",key='terminal-input-'+crypto.randomUUID();
 const wrong=await approve(f,'0'.repeat(64));ws.send(JSON.stringify({type:'input',data,operationKey:key,approvalId:wrong}));await wait(()=>messages.some(x=>x.type==='error'&&x.code==='APPROVAL_REQUIRED'));
 const approvalId=await approve(f,CanonicalTerminal.inputDigest(id,data,key)),frame={type:'input',data,operationKey:key,approvalId};ws.send(JSON.stringify(frame));await wait(()=>messages.some(x=>x.type==='output'&&x.data.includes('CANONICAL_PTY_OK')));await wait(()=>messages.filter(x=>x.type==='receipt').length===1);
 ws.send(JSON.stringify(frame));await wait(()=>messages.filter(x=>x.type==='receipt').length===2);
 const closed=await f.api('/api/v1/terminals/'+id,'DELETE');assert.equal(closed.status,200,JSON.stringify(closed.body));assert.equal(closed.body.data.status,'closed');assert.ok(closed.body.data.patchPreviewId);
 const preview=await f.api('/api/v1/projects/'+f.projectId+'/patch-previews/'+closed.body.data.patchPreviewId);assert.equal(preview.status,200);const file=preview.body.data.patch.added.find((x:any)=>x.path==='session.txt');assert.equal(Buffer.from(file.content,'base64').toString(),'x');assert.equal(fs.existsSync(path.join(f.root,'session.txt')),false);
 assert.equal((await legacy.query('SELECT status FROM isolation_workers WHERE id=$1',[id])).rows[0].status,'terminated');
 const repeatedClose=await f.api('/api/v1/terminals/'+id,'DELETE');assert.equal(repeatedClose.status,200);assert.equal(repeatedClose.body.data.patchPreviewId,closed.body.data.patchPreviewId);
 const replay=await f.api('/api/v1/projects/'+f.projectId+'/terminals','POST',{runId:f.runId,taskId:f.taskId,rootRef:f.rootRef,approvalId:r.approvalId,fence:f.fence,cols:80,rows:24},{...f.headers,'Idempotency-Key':r.operationKey!});assert.equal(replay.status,201,JSON.stringify(replay.body));assert.equal(replay.body.data.terminalId,id);assert.equal(replay.body.data.live,false);assert.equal(replay.body.data.status,'terminated');
 assert.equal((await f.api('/api/v1/terminals/'+crypto.randomUUID(),'DELETE')).status,404);
});

test('P3 revoked terminal identity is denied and its owned process tree is terminated',async t=>{
 const f=await setup(t,true),r=CanonicalTerminal.request(request(f,['/bin/sh']));r.approvalId=await approve(f,DockerWorkerAdapter.commandDigest(r));
 const opened=await f.api('/api/v1/projects/'+f.projectId+'/terminals','POST',{runId:f.runId,taskId:f.taskId,rootRef:f.rootRef,approvalId:r.approvalId,fence:f.fence},{...f.headers,'Idempotency-Key':r.operationKey!});assert.equal(opened.status,201,JSON.stringify(opened.body));const id=opened.body.data.terminalId;
 const other=await fixture(t);assert.equal((await f.api('/api/v1/terminals/'+id+'/ticket','POST',{},other.headers)).status,403);
 await legacy.query('UPDATE auth_sessions SET revoked_at=NOW() WHERE id=$1',[f.identity.sessionId]);assert.equal((await f.api('/api/v1/terminals/'+id+'/ticket','POST',{})).status,401);
 const deadline=Date.now()+6000;let state='running';while(Date.now()<deadline){state=(await legacy.query('SELECT status FROM isolation_workers WHERE id=$1',[id])).rows[0].status;if(state==='terminated')break;await new Promise(resolve=>setTimeout(resolve,100));}assert.equal(state,'terminated');
});

test('P3 root registration is idempotent and revocation cannot be undone by replay; activation is default-deny',async t=>{
 const f=await setup(t),url='/api/v1/projects/'+f.projectId+'/workspace-root',headers={...f.headers,'Idempotency-Key':'register-'+crypto.randomUUID()};
 const first=await f.api(url,'POST',{profile:'trusted-local'},headers),again=await f.api(url,'POST',{profile:'trusted-local'},headers);assert.equal(first.status,201);assert.equal(again.status,201);assert.equal(first.body.data.rootRef,again.body.data.rootRef);
 await legacy.query('UPDATE capability_grants SET revoked_at=NOW() WHERE id=$1',[first.body.data.rootRef]);assert.equal((await f.api(url,'POST',{profile:'trusted-local'},headers)).status,409);
 assert.equal((await f.api('/api/v1/projects/'+f.projectId+'/docker-workers')).body.data.workers.length,0);
 const qualifications=(await legacy.query("SELECT status,metadata FROM isolation_workers WHERE metadata->>'projectId'=$1 AND metadata->>'kind'='qualification'",[f.projectId])).rows;assert.equal(qualifications.length,1);assert.equal(qualifications[0].status,'terminated');assert.ok(qualifications[0].metadata.binding);
 const previous=process.env.SIRONA_TRUSTED_LOCAL_DOCKER_ENABLED;process.env.SIRONA_TRUSTED_LOCAL_DOCKER_ENABLED='false';try{await assert.rejects(legacy.transaction(requireHomeProfile),{code:'PROFILE_NOT_ACTIVATED'});}finally{process.env.SIRONA_TRUSTED_LOCAL_DOCKER_ENABLED=previous;}
});
