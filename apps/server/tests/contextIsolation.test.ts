import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {indexSource,ProjectIndex} from '../src/context/projectIndex.js';
import {publicSourcePath,canonicalDigest} from '../src/tools/toolContracts.js';
import {ContextAssembler} from '../src/context/contextAssembler.js';
import {approvedP5Fixture} from './helpers/p5-fixture.js';
import {legacy} from './typedDatabaseBoundary.test.js';
import {registerRoot} from '../src/workspace/homeProfile.js';

test('P6 actual WASM parser finds JS/TS/TSX definitions/imports and fails closed on unqualified SQL',async()=>{
 const js=await indexSource('src/test.js',"import value from './value.js';\nexport function actual() { return value; }");assert.ok(js.symbols.some(s=>s.name==='actual'&&s.kind==='definition'));assert.ok(js.symbols.some(s=>s.kind==='import'&&s.name==="'./value.js'"));
 const ts=await indexSource('src/test.ts','export interface Contract { id: string }\nexport function typed(value: Contract) { return value; }');assert.ok(ts.symbols.some(s=>s.name==='Contract'));assert.ok(ts.symbols.some(s=>s.name==='typed'));
 const tsx=await indexSource('src/view.tsx','export function View() { return <div>Hello</div>; }');assert.ok(tsx.symbols.some(s=>s.name==='View'));assert.deepEqual(tsx.warnings,[]);
 await assert.rejects(indexSource('schema.sql','CREATE TABLE actual(id INTEGER);'),{code:'PARSER_ARTIFACT_UNQUALIFIED'});
 for(const value of ['.env','.env.production','keys/private_key.pem','.git/config','src/credentials.json','../outside.ts'])assert.equal(publicSourcePathSafe(value),false);
 const cancelled=new AbortController();cancelled.abort();await assert.rejects(indexSource('src/test.ts','const a=1',cancelled.signal),{code:'CONTEXT_CANCELLED'});
});
function publicSourcePathSafe(value:string){try{return publicSourcePath(value);}catch{return false;}}

test('P6 snapshot capture actually invalidates after a source edit; watcher shutdown and revocation fail closed',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'sirona-p6-index-'));let allowed=true;const authorize=async()=>{if(!allowed)throw Object.assign(new Error('revoked'),{code:'REVOKED_GRANT'});};let index:ProjectIndex|undefined;
 try{await fs.writeFile(path.join(root,'actual.ts'),'export const actual=1;');index=await ProjectIndex.open(root,authorize);const a=await index.capture(authorize);await fs.writeFile(path.join(root,'actual.ts'),'export const actual=2;');const b=await index.capture(authorize);assert.notEqual(a.treeDigest,b.treeDigest);assert.notEqual(a.entries.get('actual.ts')!.sha256,b.entries.get('actual.ts')!.sha256);allowed=false;await assert.rejects(index.capture(authorize),{code:'REVOKED_GRANT'});await index.close();await assert.rejects(index.capture(async()=>{}),{code:'INDEX_UNAVAILABLE'});}finally{await index?.close();await fs.rm(root,{recursive:true,force:true});}
});

test('P6 real PostgreSQL source context is contract-bound, source-fresh, private and revocable',async t=>{
 const started=Date.now(),checkpoint=(label:string)=>t.diagnostic(label+': '+(Date.now()-started)+'ms');
 let f:Awaited<ReturnType<typeof approvedP5Fixture>>|undefined,root:Awaited<ReturnType<typeof registerRoot>>|undefined;
 // Existing Windows ACL/root registration is prerequisite setup, not context
 // execution. Bound setup and behavior independently; do not relax either cap.
 await t.test('real isolated fixture and Windows root registration',{timeout:30000},async()=>{f=await approvedP5Fixture(t,{sourceContext:{version:'p6.1',snapshotMode:'current',files:['actual.ts'],maxBytes:1024,maxFiles:1}});root=await registerRoot(f.projectId,f.identity,'p6-context-root');checkpoint('fixture/root');});
 if(!f||!root)throw new Error('P6_FIXTURE_UNAVAILABLE');const fixture=f,registered=root;
 await t.test('source freshness, immutable replay, scope and revocation',{timeout:30000},async()=>{
 const f=fixture,root=registered;
 const task=await legacy.ExecutionService.claimTask(f.runId,{taskId:f.taskId,holder:'p6-context-test',ttlSeconds:90});assert.ok(task);const context={projectId:f.projectId,runId:f.runId,taskId:f.taskId,rootRef:root.rootRef,workspaceRoot:f.root,identity:f.identity,fence:{holder:task.leaseHolder,runEpoch:task.runEpoch,leaseEpoch:task.leaseEpoch},operationKey:'p6-context-test'};
 const old=process.env.SIRONA_P6_CONTEXT_ENABLED;process.env.SIRONA_P6_CONTEXT_ENABLED='true';
 try{await fs.writeFile(path.join(f.root,'actual.ts'),'export function actual() { return 42; }');const first=await ContextAssembler.assemble(context);checkpoint('initial assembly');assert.match(first.text,/return 42/);assert.ok(first.tokenUpperBound<=1024);assert.equal((await ContextAssembler.validateForDispatch(context,first.id)).digest,first.digest);checkpoint('initial validation');
  assert.equal((await ContextAssembler.assemble(context)).id,first.id,'Same logical activity must reuse its immutable bundle');checkpoint('stable replay');
  const stored=(await legacy.query('SELECT bundle_data,digest FROM knowledge.context_bundles WHERE id=$1',[first.id])).rows[0],oldIndex={...stored.bundle_data,indexRevisionDigest:'0'.repeat(64)};
  try{await legacy.query('UPDATE knowledge.context_bundles SET bundle_data=$2::jsonb,digest=$3 WHERE id=$1',[first.id,JSON.stringify(oldIndex),canonicalDigest({projectId:context.projectId,runId:context.runId,taskId:context.taskId,metadata:oldIndex})]);await assert.rejects(ContextAssembler.validateForDispatch(context,first.id),{code:'CONTEXT_INDEX_REVISION_CHANGED'});}finally{await legacy.query('UPDATE knowledge.context_bundles SET bundle_data=$2::jsonb,digest=$3 WHERE id=$1',[first.id,JSON.stringify(stored.bundle_data),stored.digest]);}
  await fs.writeFile(path.join(f.root,'actual.ts'),'export function actual() { return 43; }');await assert.rejects(ContextAssembler.validateForDispatch(context,first.id),{code:'CONTEXT_SNAPSHOT_STALE'});await assert.rejects(ContextAssembler.assemble(context),{code:'CONTEXT_SNAPSHOT_STALE'});checkpoint('stale rejection');const next={...context,operationKey:'p6-context-after-edit'},second=await ContextAssembler.assemble(next);assert.notEqual(first.digest,second.digest);assert.match(second.text,/return 43/);checkpoint('new operation');
  await assert.rejects(ContextAssembler.validateForDispatch({...context,taskId:crypto.randomUUID()},second.id));
  await legacy.query("UPDATE capability_grants SET revoked_at=NOW() WHERE project_id=$1 AND capability='fs_read'",[f.projectId]);await assert.rejects(ContextAssembler.validateForDispatch(next,second.id),{code:'REVOKED_GRANT'});
 }finally{if(old===undefined)delete process.env.SIRONA_P6_CONTEXT_ENABLED;else process.env.SIRONA_P6_CONTEXT_ENABLED=old;await legacy.query('DELETE FROM knowledge.context_bundles WHERE project_id=$1',[f.projectId]);}
 });
});
