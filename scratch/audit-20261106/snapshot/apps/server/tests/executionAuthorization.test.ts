import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fixture,server,legacy} from './typedDatabaseBoundary.test.js';
import {requireProjectIdentity,requireRunApproval} from '../src/security/executionPolicy.js';
test('run projections, control, stream and receipts enforce workspace and CSRF',async t=>{
  const owner=await fixture(t),other=await fixture(t),base=await server(t);
  for(const suffix of ['', '/tasks','/agents','/effects','/checkpoints','/events'])assert.equal((await fetch(base+'/api/v1/runs/'+owner.runId+suffix,{headers:other.headers})).status,403);
  assert.equal((await fetch(base+'/api/v1/runs/'+owner.runId+'/pause',{method:'POST',headers:{Cookie:owner.headers.Cookie,'Content-Type':'application/json'},body:'{}'})).status,403);
  assert.equal((await fetch(base+'/api/v1/runs/'+owner.runId+'/cancel',{method:'POST',headers:other.headers,body:'{}'})).status,403);
});
test('internal identity requires the actual live session token; revoked session fails',async t=>{
  const f=await fixture(t);await assert.rejects(legacy.transaction((c:any)=>requireProjectIdentity(c,f.projectId,{...f.identity,rawSessionToken:'x'.repeat(64)})));
  await legacy.transaction((c:any)=>requireProjectIdentity(c,f.projectId,f.identity));
  await legacy.query('UPDATE auth_sessions SET revoked_at=NOW() WHERE id=$1',[f.identity.sessionId]);await assert.rejects(legacy.transaction((c:any)=>requireProjectIdentity(c,f.projectId,f.identity)));
});
test('unauthenticated workers, foreign roots and missing contract approval fail closed',async t=>{
  const f=await fixture(t);await fs.writeFile(path.join(f.root,'file.txt'),'real file');
  await assert.rejects(legacy.ToolRuntimeService.invokeTool({toolName:'read_file',input:{path:'file.txt'},projectId:f.projectId,workspaceRoot:f.root}));
  await assert.rejects(legacy.ToolRuntimeService.invokeTool({toolName:'read_file',input:{path:'file.txt'},projectId:f.projectId,workspaceRoot:path.dirname(f.root),session:f.identity}),(e:any)=>e.code==='WORKSPACE_ROOT_MISMATCH');
  await assert.rejects(legacy.transaction((c:any)=>requireRunApproval(c,f.runId)),(e:any)=>e.code==='APPROVAL_REQUIRED');
});
test('read-only policy permits actual reads and denies mutations',async t=>{
  const f=await fixture(t);const {GovernanceService}=legacy;
  const rules={autonomyMode:'readonly'};assert.equal(GovernanceService.evaluatePolicy({rules},{action:'fs_read'}).allowed,true);assert.equal(GovernanceService.evaluatePolicy({rules},{action:'tool:write_file',highImpact:true}).allowed,false);
  assert.ok(f.projectId);
});
test('capability grants are checked again after revoke or expiry',async t=>{
  const f=await fixture(t);const tool={name:'write_file',risk_class:'workspace_mutation',capabilities:['fs_write']};
  await legacy.query("INSERT INTO capability_grants(project_id,capability,expires_at,revoked_at)VALUES($1,'fs_write',NOW()+INTERVAL '1 hour',NOW())",[f.projectId]);
  await assert.rejects(legacy.ToolRuntimeService.authorizeToolInvocation({tool,projectId:f.projectId,workspaceRoot:f.root,session:f.identity}),(e:any)=>e.code==='REVOKED_GRANT');
  await legacy.query("UPDATE capability_grants SET revoked_at=NULL,expires_at=NOW()-INTERVAL '1 second' WHERE project_id=$1",[f.projectId]);
  await assert.rejects(legacy.ToolRuntimeService.authorizeToolInvocation({tool,projectId:f.projectId,workspaceRoot:f.root,session:f.identity}),(e:any)=>e.code==='REVOKED_GRANT');
});
test('approval nonce can only decide once under a concurrent race',async t=>{
  const f=await fixture(t),digest='a'.repeat(64),{GovernanceService}=legacy;
  const request=await GovernanceService.createApprovalRequest({projectId:f.projectId,inputDigest:digest,scopeSummary:'P1 nonce race',consequences:'Test only',ttlMs:60000});
  const results=await Promise.allSettled(['approve','reject'].map(decision=>GovernanceService.decideApproval(request.approval.id,{decision,nonce:request.nonce,digest,approverId:f.identity.principalId})));
  assert.equal(results.filter(result=>result.status==='fulfilled').length,1);assert.equal(results.filter(result=>result.status==='rejected').length,1);
});
test('invalid SSE cursor is rejected and a revoked session closes a live stream',async t=>{
  const f=await fixture(t),base=await server(t),url=base+'/api/v1/runs/'+f.runId+'/events';
  assert.equal((await fetch(url+'?after=1.5',{headers:f.headers})).status,410);
  const controller=new AbortController();const response=await fetch(url,{headers:f.headers,signal:controller.signal});assert.equal(response.status,200);
  await legacy.query('UPDATE auth_sessions SET revoked_at=NOW() WHERE id=$1',[f.identity.sessionId]);
  const timer=setTimeout(()=>controller.abort(),5000);try{const text=await response.text();assert.match(text,/STREAM_UNAVAILABLE/);}finally{clearTimeout(timer);controller.abort();}
});
test('real pinned contract approval is revalidated for expiry, digest, run binding and revoke',async t=>{
  const f=await fixture(t),digest='b'.repeat(64),q=legacy.query;
  const goal=(await q("INSERT INTO goals(project_id,intent)VALUES($1,'P1 approval qualification')RETURNING id",[f.projectId])).rows[0].id;
  const req=(await q('INSERT INTO requirement_revisions(goal_id,digest)VALUES($1,$2)RETURNING id',[goal,digest])).rows[0].id;
  const plan=(await q('INSERT INTO plans(goal_id)VALUES($1)RETURNING id',[goal])).rows[0].id;
  const planRevision=(await q('INSERT INTO plan_revisions(plan_id,goal_id,requirement_revision_id,digest)VALUES($1,$2,$3,$4)RETURNING id',[plan,goal,req,digest])).rows[0].id;
  const contract=(await q('INSERT INTO contracts(goal_id)VALUES($1)RETURNING id',[goal])).rows[0].id;
  const revision=(await q("INSERT INTO contract_revisions(contract_id,goal_id,plan_revision_id,requirement_revision_id,digest,document)VALUES($1,$2,$3,$4,$5,'{}')RETURNING id",[contract,goal,planRevision,req,digest])).rows[0].id;
  await q('UPDATE runs SET contract_revision_id=$2 WHERE id=$1',[f.runId,revision]);
  const approval=await legacy.GovernanceService.createApprovalRequest({projectId:f.projectId,contractRevisionId:revision,inputDigest:digest,ttlMs:60000});
  await legacy.GovernanceService.decideApproval(approval.approval.id,{decision:'approve',nonce:approval.nonce,digest,approverId:f.identity.principalId});
  await legacy.transaction((c:any)=>requireRunApproval(c,f.runId));
  await q("UPDATE approvals SET expires_at=NOW()-INTERVAL '1 second' WHERE id=$1",[approval.approval.id]);await assert.rejects(legacy.transaction((c:any)=>requireRunApproval(c,f.runId)),(e:any)=>e.code==='APPROVAL_REQUIRED');
  await q("UPDATE approvals SET expires_at=NOW()+INTERVAL '1 hour',input_digest=$2 WHERE id=$1",[approval.approval.id,'c'.repeat(64)]);await assert.rejects(legacy.transaction((c:any)=>requireRunApproval(c,f.runId)),(e:any)=>e.code==='APPROVAL_REQUIRED');
  await q('UPDATE approvals SET input_digest=$2 WHERE id=$1',[approval.approval.id,digest]);
  const otherRun=await legacy.ExecutionService.createRun({projectId:f.projectId,contractRevisionId:revision});await assert.rejects(legacy.transaction((c:any)=>requireRunApproval(c,otherRun.id)),(e:any)=>e.code==='APPROVAL_SCOPE_MISMATCH');
  await legacy.GovernanceService.revokeApproval(approval.approval.id);await assert.rejects(legacy.transaction((c:any)=>requireRunApproval(c,f.runId)),(e:any)=>e.code==='APPROVAL_REQUIRED');
});
test('developer connections are workspace scoped and host probes cannot qualify a guest',async t=>{
  const f=await fixture(t),foreign=await fixture(t),base=await server(t);
  const response=await fetch(base+'/api/v1/developer-connections',{method:'POST',headers:f.headers,body:JSON.stringify({adapterKind:'local_process',requestedCapabilities:['fs_read']})});assert.equal(response.status,201);
  const id=((await response.json()) as any).data.connection.id;
  assert.equal((await fetch(base+'/api/v1/developer-connections/'+id,{headers:foreign.headers})).status,403);
  assert.equal((await fetch(base+'/api/v1/developer-connections?workspaceId='+f.identity.workspaceId,{headers:foreign.headers})).status,403);
  assert.equal((await fetch(base+'/api/v1/developer-connections/'+id+'/qualify',{method:'POST',headers:f.headers,body:'{}'})).status,503);
});
