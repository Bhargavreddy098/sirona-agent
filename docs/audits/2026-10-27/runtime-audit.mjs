import {root,evidence,backend,save,config,Client} from './diagnostic.mjs'
import {resolve,join} from 'node:path'
import {pathToFileURL} from 'node:url'
import {readFile,writeFile,mkdtemp,mkdir,symlink,stat} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {spawnSync,spawn} from 'node:child_process'
import {randomUUID,createHash} from 'node:crypto'
const {name}=JSON.parse(await readFile(resolve(evidence,'audit-database.json'),'utf8'))
if(!/^sirona_audit_20261027_[a-f0-9]{8}$/.test(name))throw Error('Not an audit DB')
process.env.PGDATABASE=name
if(process.env.DATABASE_URL){const u=new URL(process.env.DATABASE_URL);u.pathname='/'+name;process.env.DATABASE_URL=u.href;for(const k of ['PGHOST','PGPORT','PGUSER','PGPASSWORD','PGDATABASE'])delete process.env[k]}
for(const k of Object.keys(process.env))if(/(?:OPENAI|ANTHROPIC|GEMINI|GOOGLE|CUSTOM).*API_KEY|API_KEY.*(?:OPENAI|ANTHROPIC|GEMINI|GOOGLE|CUSTOM)/i.test(k))delete process.env[k]
process.env.NODE_ENV='development';process.env.PORT='8012';process.env.RATE_LIMIT_POINTS='100000';process.env.ALLOWED_ORIGINS='http://127.0.0.1:5179,http://127.0.0.1:5180,http://127.0.0.1:8012'
const {startBackend}=await import(pathToFileURL(resolve(backend,'server.js')))
const runtime=await startBackend(process.env)
const db=new Client({...config,database:name,...(config.connectionString?{connectionString:(()=>{const u=new URL(config.connectionString);u.pathname='/'+name;return u.href})()}:{} )});await db.connect()
const {generateLauncherChallenge}=await import(pathToFileURL(resolve(backend,'services/launcherChallenge.js')))
const {ExecutionService}=await import(pathToFileURL(resolve(backend,'services/executionService.js')))
const {IsolationBrokerService}=await import(pathToFileURL(resolve(backend,'services/isolationBrokerService.js')))
const base='http://127.0.0.1:8012', requests=[],findings=[];let cookie='',csrf=''
async function request(method,path,body,{anonymous=false,csrfMissing=false,headers={}}={}){
 const h={'Content-Type':'application/json',...(!anonymous?{Cookie:cookie,...(!csrfMissing?{'X-CSRF-Token':csrf}:{})}:{}),...headers}
 const started=Date.now();let response,data
 try{response=await fetch(base+path,{method,headers:h,...(body!==undefined?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(6000)});const raw=await response.text();try{data=JSON.parse(raw)}catch{data=raw};requests.push({method,path,status:response.status,durationMs:Date.now()-started,body:data});return {status:response.status,data,headers:response.headers}}
 catch(error){requests.push({method,path,error:error.name,durationMs:Date.now()-started});return {status:0,data:{error:error.name}}}
}
const routes=JSON.parse(await readFile(resolve(evidence,'route-inventory.json'),'utf8')).routes
for(const row of routes){const path=row.path.replace(/:[A-Za-z][A-Za-z0-9_]*/g,()=>randomUUID());const result=await request(row.method==='ALL'?'GET':row.method,path,['GET','HEAD'].includes(row.method)?undefined:{challenge:'audit-invalid',clientNonce:'audit-invalid'},{anonymous:true});row.anonymousLive={status:result.status,path};}
await save('route-anonymous-probes.json',routes.map(r=>({method:r.method,path:r.path,...r.anonymousLive})))
const auth=await request('POST','/api/v1/session/bootstrap',generateLauncherChallenge());cookie=auth.headers.get('set-cookie').split(';')[0];csrf=auth.data.data.csrfToken
await request('GET','/api/v1/session');await request('GET','/api/v1/workspaces');await request('GET','/api/v1/capabilities')
for(const path of ['/api/v1/projects','/api/v1/policies/current','/api/v1/approvals','/api/v1/models','/api/v1/tools','/api/v1/developer-connections','/api/v1/isolation/diagnostics','/api/v1/activity','/api/v1/notifications','/api/v1/usage','/api/v1/system/release','/api/v1/system/diagnostics','/api/v1/system/recovery/checkpoints'])await request('GET',path)
await request('POST','/api/v1/projects',{name:'CSRF must fail'},{csrfMissing:true});await request('POST','/api/v1/projects',{})
const fixture=await mkdtemp(join(tmpdir(),'sirona-audit-'));const work=join(fixture,'sample-project'),outside=join(fixture,'unattached-sibling');await mkdir(join(work,'src'),{recursive:true});await mkdir(join(work,'tests'));await mkdir(outside)
await save('runtime-fixtures.json',{fixture,work,outside})
await writeFile(join(work,'package.json'),JSON.stringify({name:'sirona-controlled-audit-project',version:'1.0.0',type:'module',scripts:{test:'node --test tests/*.test.js',build:'node --check src/calculator.js'}},null,2));await writeFile(join(work,'src/calculator.js'),'export const sum = (a,b) => a+b;\n');await writeFile(join(work,'tests/calculator.test.js'),"import {test} from 'node:test'; import assert from 'node:assert/strict'; import {sum} from '../src/calculator.js'; test('sum',()=>assert.equal(sum(2,3),5));\n");await writeFile(join(work,'README.md'),'# Controlled audit project\nAdd a sum endpoint and preserve tests.\n');await writeFile(join(work,'.gitignore'),'node_modules/\ndist/\n');await writeFile(join(outside,'canary.txt'),'AUDIT_ONLY_UNATTACHED_CANARY')
for(const args of [['init'],['add','.'],['-c','user.name=Sirona Audit','-c','user.email=audit@invalid.local','commit','-m','Controlled audit baseline']])spawnSync('git',['-C',work,...args],{windowsHide:true,encoding:'utf8'})
const projectRes=await request('POST','/api/v1/projects',{name:'AUDIT 2026-10-27 controlled project',primaryPath:work});const project=projectRes.data.data.project
const convRes=await request('POST',`/api/v1/projects/${project.id}/conversations`,{title:'AUDIT golden calculator request'});const conversation=convRes.data.data.conversation
await request('POST',`/api/v1/conversations/${conversation.id}/messages`,{role:'user',content:'Add a GET /api/calculator/sum endpoint accepting numeric a and b; add tests and update README.'})
await request('GET',`/api/v1/conversations/${conversation.id}/messages`)
const goalRes=await request('POST',`/api/v1/conversations/${conversation.id}/goals`,{autonomyMode:'supervised'});const goal=goalRes.data.data.goal||goalRes.data.data
await request('POST',`/api/v1/goals/${goal.id}/intent-analysis`,{})
for(const path of [`/api/v1/projects/${project.id}/goals`,`/api/v1/projects/${project.id}/runs`,`/api/v1/projects/${project.id}/memories`,`/api/v1/projects/${project.id}/knowledge/nodes`,`/api/v1/projects/${project.id}/schedules`,`/api/v1/projects/${project.id}/triggers`,`/api/v1/projects/${project.id}/events`,`/api/v1/projects/${project.id}/artifacts`,`/api/v1/projects/${project.id}/budgets`])await request('GET',path)
await request('POST',`/api/v1/projects/${project.id}/knowledge-index`,{})
await request('POST',`/api/v1/goals/${goal.id}/runs`,{})
const foreignWorkspace=(await db.query("INSERT INTO workspaces (name) VALUES ('AUDIT foreign workspace') RETURNING id")).rows[0]
const foreign=(await db.query('INSERT INTO projects (workspace_id,name,primary_path) VALUES ($1,$2,$3) RETURNING id',[foreignWorkspace.id,'AUDIT cross-scope target',outside])).rows[0]
const foreignRead=await request('GET',`/api/v1/projects/${foreign.id}`);findings.push({test:'cross-workspace project read',expected:'404/403',actual:foreignRead.status})
async function tool(toolName,input,workspaceRoot=work,extra={}){return request('POST','/api/v1/tools/invoke',{toolName,input,workspaceRoot,...extra})}
const read=await tool('read_file',{path:'src/calculator.js'});findings.push({test:'read without project/connection',actual:read.status})
const write=await tool('write_file',{path:'audit-written.txt',content:'AUDIT ungranted write'});findings.push({test:'write without project/grant/connection/approval',actual:write.status,effect:await readFile(join(work,'audit-written.txt'),'utf8').catch(()=>null)})
await tool('read_file',{path:'../unattached-sibling/canary.txt'})
await tool('read_file',{path:'canary.txt'},outside)
const shell=await tool('execute_command',{command:process.execPath,args:['-e',`console.log(JSON.stringify({cwd:process.cwd(),outside:require('node:fs').readFileSync(${JSON.stringify(join(outside,'canary.txt'))},'utf8')}))`]});findings.push({test:'shell without sandbox/grant reads unattached fixture',actual:shell.status,result:shell.data})
await tool('execute_command',{command:process.execPath,args:['-e','setInterval(()=>{},1000)']},work,{timeoutMs:200})
try{await symlink(outside,join(work,'junction'),'junction');const result=await tool('write_file',{path:'junction/new-file.txt',content:'AUDIT junction escape'});findings.push({test:'nonexistent target below escaping junction',actual:result.status,effect:await readFile(join(outside,'new-file.txt'),'utf8').catch(()=>null)})}catch(error){findings.push({test:'junction setup',blocked:error.code})}
findings.push({test:'prerequisites',result:await IsolationBrokerService.checkPrerequisites()})
const run=await ExecutionService.createRun({projectId:project.id,goalId:goal.id})
await save('runtime-probes-partial.json',{requests,findings})
const artifact=(await db.query("INSERT INTO artifacts (project_id,name,digest,storage_path,status) VALUES ($1,'audit-broken.js',$2,$3,'available') RETURNING id",[project.id,'a'.repeat(64),join(work,'artifact-does-not-exist.js')])).rows[0]
const verification=await request('POST',`/api/v1/runs/${run.id}/verifications`,{artifactId:artifact.id});findings.push({test:'verification with nonexistent artifact bytes and no test results',actual:verification.status,result:verification.data})
await request('POST',`/api/v1/runs/${run.id}/verifications`,{artifactId:artifact.id,testResults:{'CRIT-BUILD':{outcome:'fail'}}})
await request('POST',`/api/v1/runs/${run.id}/browser-qa-sessions`,{targetUrl:'http://127.0.0.1:9/audit-does-not-exist'})
const checkpoint=await request('POST','/api/v1/system/recovery/checkpoints',{checkpointKind:'full_backup',metadata:{audit:true}});const checkpointId=checkpoint.data.data.id
await request('POST',`/api/v1/system/recovery/checkpoints/${checkpointId}/rehearsal`,{})
await request('POST','/api/v1/models/verify',{kind:'openai_compatible',name:'AUDIT unsafe URL/no real credential',baseUrl:'file:///audit-not-a-network-endpoint',apiKey:'AUDIT_FAKE_KEY_NOT_VALID'})
findings.push({test:'plaintext canary binding',result:(await db.query("SELECT api_key_ciphertext = 'AUDIT_FAKE_KEY_NOT_VALID' AS stored_unchanged FROM provider_connections WHERE name='AUDIT unsafe URL/no real credential'")).rows})
await save('runtime-probes.json',{environment:'real production composition, development bootstrap, disposable PostgreSQL; provider environment credentials removed',requests,findings})
await save('runtime-context.json',{port:8012,frontendPort:5179,fixture,work,outside,projectId:project.id,conversationId:conversation.id,goalId:goal.id,runId:run.id,artifactId:artifact.id,database:name})
console.log('AUDIT_RUNTIME_READY '+JSON.stringify({port:8012,projectId:project.id,fixture}))
let desktop
async function close(){if(desktop&&!desktop.killed)desktop.kill();await db.end();await runtime.stop();process.exit(0)}
process.on('SIGTERM',()=>void close());process.on('SIGINT',()=>void close())
// Private diagnostic control is file-based, never an HTTP/IPC product backdoor.
const timer=setInterval(async()=>{
 if(await stat(resolve(evidence,'stop-runtime')).catch(()=>false)){clearInterval(timer);await close()}
 if(!desktop&&await stat(resolve(evidence,'launch-desktop')).catch(()=>false)){
  const pair=generateLauncherChallenge();const env={...process.env,SIRONA_BACKEND_PORT:'8012',SIRONA_CLIENT_PORT:'5180',SIRONA_LAUNCHER_CHALLENGE:pair.challenge,SIRONA_LAUNCHER_NONCE:pair.clientNonce};delete env.ELECTRON_RUN_AS_NODE
  desktop=spawn(process.execPath,[resolve(root,'frontend/sirona/node_modules/electron/cli.js'),'.','--user-data-dir='+join(fixture,'electron-profile')],{cwd:resolve(root,'frontend/sirona'),env,windowsHide:true,stdio:['ignore','pipe','pipe']});let output='';desktop.stdout.on('data',d=>output+=d);desktop.stderr.on('data',d=>output+=d);desktop.on('exit',code=>void save('electron-live-result.json',{exitCode:code,output}));await save('electron-live-process.json',{pid:desktop.pid,userData:join(fixture,'electron-profile'),port:5180,realBackend:8012})
 }
},1000)
