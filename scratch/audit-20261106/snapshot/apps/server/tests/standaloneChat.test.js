import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {loadEnvironment} from '../server.js';
import {readRuntimeConfig} from '../foundation/runtimeConfig.js';
import {createLogger} from '../foundation/logger.js';
import {createDatabaseOwner,activateDatabaseOwner,query} from '../config/db.js';
import {createApp} from '../app.js';
import {createHealthController} from '../controllers/healthController.js';
import routes from '../routes/index.js';
import {stage17Admission} from '../foundation/admission.js';
import {generateLauncherChallenge} from '../services/launcherChallenge.js';
import {TurnLease} from '../model/TurnLease.js';
import {createServer} from 'node:http';
import {SecretStore} from '../services/secretStore.js';
import {Setting} from '../model/Setting.js';
import {serve,request} from './helpers.js';
loadEnvironment();let owner;
const sessions=[],projects=[],users=[],workspaces=[],authIds=[],modelIds=[],connectionIds=[];
before(async()=>{const config=readRuntimeConfig(process.env);owner=createDatabaseOwner(config.database,createLogger(config));activateDatabaseOwner(owner);await owner.initialize();});
after(async()=>{if(owner){
  for(const id of sessions){await query('DELETE FROM model_calls WHERE session_id=$1',[id]);await query('DELETE FROM session_turn_leases WHERE session_id=$1',[id]);await query('DELETE FROM sessions WHERE id=$1',[id]);}
  for(const id of modelIds)await query('DELETE FROM models WHERE id=$1',[id]);
  for(const id of connectionIds)await query('DELETE FROM provider_connections WHERE id=$1',[id]);
  for(const id of projects)await query('DELETE FROM projects WHERE id=$1',[id]);
  for(const id of authIds)await query('DELETE FROM auth_sessions WHERE id=$1',[id]);
  for(const id of workspaces)await query('DELETE FROM workspaces WHERE id=$1',[id]);
  for(const id of users)await query('DELETE FROM users WHERE id=$1',[id]);
  await owner.close();
}});
function app(){return createApp({healthController:createHealthController({checkDatabase:()=>owner.ready(),cleanExpiredLeases:async()=>{}}),apiRoutes:routes,auditContext:(_q,_s,n)=>n(),rateLimiter:(_q,_s,n)=>n(),allowedOrigins:['http://127.0.0.1:5173'],logError:()=>{},admission:stage17Admission});}
async function login(base){const pair=generateLauncherChallenge();const response=await request(base,'/api/v1/session/bootstrap',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(pair)});assert.equal(response.status,200);const {data}=await response.json();const cookie=response.headers.get('set-cookie').split(';')[0];const digest=crypto.createHash('sha256').update(cookie.slice(cookie.indexOf('=')+1)).digest('hex');const auth=await query('SELECT id FROM auth_sessions WHERE token_hash=$1',[digest]);if(auth.rows[0])authIds.push(auth.rows[0].id);return{...data,cookie};}
const headers=identity=>({'Content-Type':'application/json',Cookie:identity.cookie,'X-CSRF-Token':identity.csrfToken});
async function create(base,identity){const response=await request(base,'/api/v1/conversations',{method:'POST',headers:headers(identity),body:JSON.stringify({title:'Standalone integration test',modelId:'test/namespace:model'})});assert.equal(response.status,201);const conversation=(await response.json()).data.conversation;sessions.push(conversation.id);return conversation;}

test('standalone creation persists project NULL and never creates a hidden project',async t=>{const base=await serve(t,app()),identity=await login(base);const before=await query('SELECT COUNT(*)::int AS total FROM projects');const conversation=await create(base,identity);assert.equal(conversation.project_id,null);assert.equal(conversation.workspace_id,identity.workspaceId);assert.equal(conversation.user_id,identity.principalId);assert.equal((await query('SELECT COUNT(*)::int AS total FROM projects')).rows[0].total,before.rows[0].total);const list=await request(base,'/api/v1/conversations?scope=standalone',{headers:headers(identity)});assert.equal(list.status,200);assert.ok((await list.json()).data.sessions.some(item=>item.id===conversation.id));});
test('authentication and CSRF remain enforced',async t=>{const base=await serve(t,app());assert.equal((await request(base,'/api/v1/conversations?scope=standalone')).status,401);const identity=await login(base);assert.equal((await request(base,'/api/v1/conversations',{method:'POST',headers:{Cookie:identity.cookie,'Content-Type':'application/json'},body:'{}'})).status,403);});
test('other workspace cannot retrieve, mutate, delete, lease, or execute a standalone conversation',async t=>{
  const base=await serve(t,app()),identity=await login(base),conversation=await create(base,identity);
  const user=(await query("INSERT INTO users(email,name,role)VALUES($1,'Scoped test user','owner')RETURNING id",[`standalone-${crypto.randomUUID()}@test.invalid`])).rows[0];users.push(user.id);
  const workspace=(await query("INSERT INTO workspaces(name,owner_principal_id)VALUES('Scoped test workspace',$1)RETURNING id",[user.id])).rows[0];workspaces.push(workspace.id);
  const token=crypto.randomBytes(32).toString('hex'),csrf=crypto.randomBytes(32).toString('hex'),hash=value=>crypto.createHash('sha256').update(value).digest('hex');
  const auth=(await query("INSERT INTO auth_sessions(principal_id,workspace_id,token_hash,csrf_hash,expires_at)VALUES($1,$2,$3,$4,NOW()+INTERVAL '1 hour')RETURNING id",[user.id,workspace.id,hash(token),hash(csrf)])).rows[0];authIds.push(auth.id);const other={cookie:`asi_session=${token}`,csrfToken:csrf};
  for(const [path,method]of[[`/conversations/${conversation.id}`,'GET'],[`/conversations/${conversation.id}/messages`,'GET'],[`/conversations/${conversation.id}`,'PATCH'],[`/conversations/${conversation.id}`,'DELETE'],[`/sessions/${conversation.id}/lease`,'POST'],[`/conversations/${conversation.id}/turns`,'POST']]){const response=await request(base,`/api/v1${path}`,{method,headers:headers(other),...(method==='GET'?{}:{body:'{}'})});assert.equal(response.status,404,`${method} ${path}`);}
});
test('project history remains separate and rename preserves exact model identifiers',async t=>{
  const base=await serve(t,app()),identity=await login(base),standalone=await create(base,identity);
  const project=(await query("INSERT INTO projects(workspace_id,name,primary_path)VALUES($1,'Standalone slice project test','test-workspace')RETURNING id",[identity.workspaceId])).rows[0];projects.push(project.id);
  const response=await request(base,`/api/v1/projects/${project.id}/conversations`,{method:'POST',headers:headers(identity),body:JSON.stringify({title:'Project chat',model:'custom/engine:tag'})});assert.equal(response.status,201);const projectConversation=(await response.json()).data.conversation;sessions.push(projectConversation.id);assert.equal(projectConversation.project_id,project.id);
  const projectList=await request(base,`/api/v1/projects/${project.id}/conversations`,{headers:headers(identity)});assert.ok((await projectList.json()).data.sessions.some(c=>c.id===projectConversation.id));
  const standaloneList=(await (await request(base,'/api/v1/conversations?scope=standalone',{headers:headers(identity)})).json()).data.sessions;assert.ok(!standaloneList.some(c=>c.id===projectConversation.id));
  const rename=await request(base,`/api/v1/conversations/${standalone.id}`,{method:'PATCH',headers:headers(identity),body:JSON.stringify({title:'Renamed',modelId:'custom/engine:tag'})});assert.equal(rename.status,200);assert.equal((await rename.json()).data.conversation.model,'custom/engine:tag');
});
test('legacy turn still rejects missing lease and new coordinated turn rejects another holder',async t=>{
  const base=await serve(t,app()),identity=await login(base),conversation=await create(base,identity);
  const noLease=await request(base,`/api/v1/conversations/${conversation.id}/turns`,{method:'POST',headers:headers(identity),body:JSON.stringify({prompt:'Lease enforcement test',bypassCoordinator:true})});assert.equal(noLease.status,409);
  const model=(await query('SELECT id FROM models WHERE is_available=true LIMIT 1')).rows[0];assert.ok(model,'A canonical registry model is required');
  const lease=await TurnLease.acquire(conversation.id,'standalone-test-other-holder',90);assert.ok(lease.acquired);
  const blocked=await request(base,`/api/v1/conversations/${conversation.id}/turns`,{method:'POST',headers:headers(identity),body:JSON.stringify({prompt:'Do not execute',modelId:model.id,clientTurnId:crypto.randomUUID()})});assert.equal(blocked.status,409);
  assert.equal((await query('SELECT COUNT(*)::int AS count FROM messages WHERE session_id=$1',[conversation.id])).rows[0].count,0);
});
test('controlled upstream HTTP 503 preserves failed state, releases lease and retries without duplicate user prompts',async t=>{
  // Fault injection only: this server never returns model text and is not live inference proof.
  const payloads=[];
  const upstream=createServer((req,res)=>{let body='';req.on('data',part=>{body+=part;});req.on('end',()=>{payloads.push(JSON.parse(body));setTimeout(()=>{res.writeHead(503,{'Content-Type':'application/json','Retry-After':'0'});res.end(JSON.stringify({error:{message:'Controlled upstream HTTP 503 qualification'}}));},100);});});
  await new Promise(resolve=>upstream.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>upstream.close(resolve)));
  const base=await serve(t,app()),identity=await login(base),conversation=await create(base,identity),modelId=`qa503/${crypto.randomUUID()}:test`;
  const connection=(await query("INSERT INTO provider_connections(workspace_id,kind,name,base_url,api_key_ciphertext,is_active)VALUES($1,'openai_compatible','Controlled fault test',$2,$3,true)RETURNING id",[identity.workspaceId,`http://127.0.0.1:${upstream.address().port}/v1`,SecretStore.encrypt('non-secret-controlled-test-credential')])).rows[0];connectionIds.push(connection.id);
  await query("INSERT INTO models(id,provider_kind,name,context_window,max_output_tokens,is_available,provider_connection_id)VALUES($1,'openai_compatible','Controlled fault test',8192,256,true,$2)",[modelId,connection.id]);modelIds.push(modelId);
  const original=await Setting.get('model_settings');
  try{
    await Setting.set('model_settings',{primaryModel:modelId,fallbackModel:modelId});
    const prompt='Controlled failure qualification; no model output is expected';
    for(let n=1;n<=31;n++){await query("INSERT INTO messages(session_id,role,content,status)VALUES($1,'user','Historical test prompt '||$2,'completed')",[conversation.id,n]);}
    const firstId=crypto.randomUUID();
    const first=await request(base,`/api/v1/conversations/${conversation.id}/turns`,{method:'POST',headers:{...headers(identity),Accept:'text/event-stream'},body:JSON.stringify({prompt,modelId,clientTurnId:firstId,coordinateLease:true})});
    assert.equal(first.status,200);
    const concurrent=await request(base,`/api/v1/conversations/${conversation.id}/turns`,{method:'POST',headers:headers(identity),body:JSON.stringify({prompt,modelId,clientTurnId:crypto.randomUUID(),coordinateLease:true})});assert.equal(concurrent.status,409);
    assert.match(await first.text(),/HTTP 503/);
    assert.ok(payloads.length);assert.equal(payloads[0].model,modelId);assert.ok(!payloads[0].messages.some(message=>message.role==="system"),"Native chat must not inject an agent persona");assert.equal(payloads[0].messages.at(-1).content,prompt);assert.ok(!payloads[0].messages.some(message=>message.content==='Historical test prompt 1'));
    const failed=(await query('SELECT * FROM messages WHERE session_id=$1 ORDER BY id',[conversation.id])).rows;assert.equal(failed.at(-1).status,'failed');assert.equal((await TurnLease.getLease(conversation.id)).is_active,false);
    const duplicate=await request(base,`/api/v1/conversations/${conversation.id}/turns`,{method:'POST',headers:headers(identity),body:JSON.stringify({prompt,modelId,clientTurnId:firstId,coordinateLease:true})});assert.equal(duplicate.status,409);
    const retry=await request(base,`/api/v1/conversations/${conversation.id}/turns`,{method:'POST',headers:{...headers(identity),Accept:'text/event-stream'},body:JSON.stringify({prompt,modelId,clientTurnId:crypto.randomUUID(),coordinateLease:true,retryOf:String(failed.at(-1).id)})});assert.match(await retry.text(),/HTTP 503/);
    const count=(await query("SELECT COUNT(*)::int AS total FROM messages WHERE session_id=$1 AND role='user' AND content=$2",[conversation.id,prompt])).rows[0].total;assert.equal(count,1);
  }finally{await Setting.set('model_settings',original);}
});
test('standard turn execution without coordinateLease coordinates and executes with single-writer lease',async t=>{
  const base=await serve(t,app()),identity=await login(base),conversation=await create(base,identity);
  const model=(await query('SELECT id FROM models WHERE is_available=true LIMIT 1')).rows[0];assert.ok(model,'A canonical registry model is required');
  const res=await request(base,`/api/v1/conversations/${conversation.id}/turns`,{method:'POST',headers:{...headers(identity),Accept:'text/event-stream'},body:JSON.stringify({prompt:'Standard turn without coordinateLease flag',modelId:model.id})});
  assert.equal(res.status,200);
});
