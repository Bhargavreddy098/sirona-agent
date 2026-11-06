import {test,after,type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {sql} from 'drizzle-orm';
import {typedClient} from '../src/db/transactionAdapter.js';
import {validate,toolRequestSchema} from '../src/security/executionPolicy.js';
const backendModules=createRequire(new URL('../../package.json',import.meta.url));
export const legacy={...backendModules('./config/db.js'),...backendModules('./services/executionService.js'),...backendModules('./services/toolRuntimeService.js'),...backendModules('./services/governanceService.js')};
let ready:Promise<void>|undefined;let owner:any;
export async function fixture(t:TestContext){
  if(!ready)ready=(async()=>{
    backendModules('./server.js').loadEnvironment();
    const config=backendModules('./foundation/runtimeConfig.js').readRuntimeConfig(process.env);
    owner=legacy.createDatabaseOwner({...config.database,max:20,query_timeout:15000},backendModules('./foundation/logger.js').createLogger(config));
    legacy.activateDatabaseOwner(owner);
    await owner.initialize();
    process.env.SIRONA_EXECUTION_RELIABILITY='true';
    process.env.SIRONA_TRUSTED_LOCAL_DOCKER_ENABLED='true'; // Guarded isolated test DB only; no production activation.
  })();await ready;
  const temp=await fs.mkdtemp(path.join(os.tmpdir(),'sirona-p1-'));
  const user=(await legacy.query("INSERT INTO users(email,name,role)VALUES($1,'P1 test owner','owner')RETURNING id",['p1-'+crypto.randomUUID()+'@test.invalid'])).rows[0];
  const workspace=(await legacy.query("INSERT INTO workspaces(name,owner_principal_id)VALUES('P1 isolated test',$1)RETURNING id",[user.id])).rows[0];
  const token=crypto.randomBytes(32).toString('hex'),csrf=crypto.randomBytes(32).toString('hex');
  const hash=(value:string)=>crypto.createHash('sha256').update(value).digest('hex');
  const session=(await legacy.query("INSERT INTO auth_sessions(principal_id,workspace_id,token_hash,csrf_hash,expires_at)VALUES($1,$2,$3,$4,NOW()+INTERVAL '1 hour')RETURNING id",[user.id,workspace.id,hash(token),hash(csrf)])).rows[0];
  const project=(await legacy.query("INSERT INTO projects(workspace_id,name,primary_path)VALUES($1,'P1 real workspace',$2)RETURNING id",[workspace.id,temp])).rows[0];
  await legacy.query("INSERT INTO capability_grants(project_id,capability,resource_scope,expires_at)VALUES($1,'fs_read',$2,NOW()+INTERVAL '1 hour')",[project.id,JSON.stringify({workspaceRoot:temp})]);
  const run=await legacy.ExecutionService.createRun({projectId:project.id});await legacy.query("UPDATE runs SET state='running' WHERE id=$1",[run.id]);
  const task=await legacy.ExecutionService.createTask({runId:run.id,stepKey:'p1-test'});
  t.after(async()=>{
    // Tear down only resources minted for this fixture, including failed-test workers.
    const workers=(await legacy.query("SELECT id,status,metadata FROM isolation_workers WHERE metadata->>'projectId'=$1",[project.id])).rows;
    for(const worker of workers){if(worker.status!=='terminated'){if(!worker.metadata.binding)throw new Error('Unresolved fixture worker binding; preserve recovery evidence');const {DockerRuntime}=await import('../src/windows/dockerRuntime.js');await DockerRuntime.recoverBinding(worker.metadata.binding);}}
    await legacy.query("DELETE FROM isolation_workers WHERE metadata->>'projectId'=$1",[project.id]);
    await legacy.query('DELETE FROM contracts WHERE goal_id IN (SELECT id FROM goals WHERE project_id=$1)',[project.id]);
    await legacy.query('DELETE FROM plans WHERE goal_id IN (SELECT id FROM goals WHERE project_id=$1)',[project.id]);
    await legacy.query('DELETE FROM requirement_revisions WHERE goal_id IN (SELECT id FROM goals WHERE project_id=$1)',[project.id]);
    await legacy.query('DELETE FROM projects WHERE id=$1',[project.id]);await legacy.query('DELETE FROM auth_sessions WHERE id=$1',[session.id]);await legacy.query('DELETE FROM workspaces WHERE id=$1',[workspace.id]);await legacy.query('DELETE FROM users WHERE id=$1',[user.id]);
    const relative=path.relative(os.tmpdir(),temp);if(relative.startsWith('..')||!path.basename(temp).startsWith('sirona-p1-'))throw new Error('Unsafe fixture cleanup');await fs.rm(temp,{recursive:true,force:true});
  });
  return{projectId:project.id,runId:run.id,taskId:task.id,root:temp,identity:{sessionId:session.id,principalId:user.id,workspaceId:workspace.id,rawSessionToken:token},headers:{Cookie:'asi_session='+token,'X-CSRF-Token':csrf,'Content-Type':'application/json'}};
}
export async function server(t:TestContext,terminal=false){
  const {createApp}=backendModules('./app.js');const {createHealthController}=backendModules('./controllers/healthController.js');
  const app=createApp({healthController:createHealthController({checkDatabase:()=>owner.ready(),cleanExpiredLeases:async()=>{}}),apiRoutes:backendModules('./routes/index.js').default,auditContext:(_q:any,_s:any,n:()=>void)=>n(),rateLimiter:(_q:any,_s:any,n:()=>void)=>n(),allowedOrigins:['http://127.0.0.1:5173'],logError:()=>{},admission:backendModules('./foundation/admission.js').stage17Admission});
  if(!terminal)return backendModules('./tests/helpers.js').serve(t,app) as Promise<string>;
  const listener=backendModules('node:http').createServer(app);
  const gateway=backendModules('./services/terminalGateway.js').createTerminalGateway(listener,{allowedOrigins:['http://127.0.0.1:5173']});
  t.after(async()=>{await gateway.close();listener.closeAllConnections();await new Promise<void>((resolve,reject)=>listener.close((error:Error)=>error?reject(error):resolve()));});
  await new Promise<void>(resolve=>listener.listen(0,'127.0.0.1',resolve));return 'http://127.0.0.1:'+listener.address().port;
}
after(async()=>{if(owner)await owner.close();});
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
test('Drizzle uses existing client transaction and rolls back real writes',async t=>{
  const f=await fixture(t);
  await assert.rejects(legacy.transaction(async(client:any)=>{await typedClient(client).execute(sql`UPDATE projects SET name='must rollback' WHERE id=${f.projectId}`);throw new Error('rollback qualification');}),/rollback qualification/);
  assert.equal((await legacy.query('SELECT name FROM projects WHERE id=$1',[f.projectId])).rows[0].name,'P1 real workspace');
});
test('Zod rejects malformed tools at real HTTP boundary; valid authenticated read works',async t=>{
  const f=await fixture(t),base=await server(t);await fs.writeFile(path.join(f.root,'read.txt'),'actual P1 file bytes');
  const bad=await fetch(base+'/api/v1/tools/invoke',{method:'POST',headers:f.headers,body:JSON.stringify({toolName:'read_file',input:[],projectId:f.projectId,workspaceRoot:f.root})});assert.equal(bad.status,400);
  const valid=await fetch(base+'/api/v1/tools/invoke',{method:'POST',headers:f.headers,body:JSON.stringify({toolName:'read_file',input:{path:'read.txt'},projectId:f.projectId,workspaceRoot:f.root})});assert.equal(valid.status,200);assert.equal(((await valid.json()) as any).data.output.content,'actual P1 file bytes');
  assert.throws(()=>validate(toolRequestSchema,{toolName:'read_file',input:{},projectId:'invalid'}));
});

}
