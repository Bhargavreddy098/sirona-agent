import {root,backend,evidence,save,config,Client} from './diagnostic.mjs'
import {readFile,writeFile} from 'node:fs/promises'
import {join,resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
import {createServer} from 'node:http'
import {spawnSync} from 'node:child_process'
const ctx=JSON.parse(await readFile(resolve(evidence,'runtime-context.json'),'utf8'))
const auditConfig={...config,database:ctx.database,...(config.connectionString?{connectionString:(()=>{const u=new URL(config.connectionString);u.pathname='/'+ctx.database;return u.href})()}:{} )}
const db=new Client(auditConfig);await db.connect()
const logs=[],base='http://127.0.0.1:8012';let cookie='',csrf=''
async function req(method,path,body){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',Cookie:cookie,'X-CSRF-Token':csrf},...(body!==undefined?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(8000)});const data=await r.json();logs.push({method,path,status:r.status,data});return {r,data}}
const auth=await req('POST','/api/v1/session/bootstrap',{});cookie=auth.r.headers.get('set-cookie').split(';')[0];csrf=auth.data.data.csrfToken
const providerHits=[];const provider=createServer((req,res)=>{providerHits.push({path:req.url,bearerCanary:req.headers.authorization==='Bearer AUDIT_COMPATIBLE_CANARY'});res.setHeader('Content-Type','application/json');res.end(JSON.stringify({data:[{id:'audit-model',name:'Audit model'},{id:'audit-model',name:'Duplicate audit model'}]}))});await new Promise(r=>provider.listen(0,'127.0.0.1',r));const providerUrl=`http://127.0.0.1:${provider.address().port}/v1`
await req('POST','/api/v1/models/verify',{kind:'openai_compatible',name:'AUDIT controlled compatible protocol peer',baseUrl:providerUrl,apiKey:'AUDIT_COMPATIBLE_CANARY',discover:true})
await req('GET','/api/v1/models')
provider.closeAllConnections();await new Promise(r=>provider.close(r))
await writeFile(join(ctx.work,'tests/failing-audit.test.js'),"import {test} from 'node:test'; import assert from 'node:assert/strict';test('AUDIT must fail',()=>assert.equal(1,2));\n")
const shell=await req('POST','/api/v1/tools/invoke',{toolName:'execute_command',workspaceRoot:ctx.work,input:{command:process.execPath,args:['--test','tests/failing-audit.test.js']}})
const verified=await req('POST',`/api/v1/runs/${ctx.runId}/verifications`,{artifactId:ctx.artifactId})
// Direct service invocation is explicitly distinct from an autonomous product run.
const {createDatabaseOwner,activateDatabaseOwner}=await import(pathToFileURL(resolve(backend,'config/db.js')))
const owner=createDatabaseOwner(auditConfig,{event(){}});activateDatabaseOwner(owner);await owner.initialize()
const {WorkflowOrchestratorService}=await import(pathToFileURL(resolve(backend,'services/workflowOrchestratorService.js')))
const completed=await WorkflowOrchestratorService.executeWorkflow(ctx.runId,{artifactId:ctx.artifactId})
await owner.close();await req('GET',`/api/v1/runs/${ctx.runId}`)
await req('POST',`/api/v1/conversations/${ctx.conversationId}/messages`,{role:'user',content:'Add authentication.'})
const newGoal=await req('POST',`/api/v1/conversations/${ctx.conversationId}/goals`,{autonomyMode:'supervised'})
const g=newGoal.data?.data?.goal
if(g)await req('POST',`/api/v1/goals/${g.id}/intent-analysis`,{})
const attachment=(await db.query("SELECT id,name,primary_path FROM projects WHERE name='sample-project' AND primary_path=$1",[ctx.work])).rows
const knowledge=attachment.length?(await db.query('SELECT count(*) AS nodes FROM knowledge.nodes WHERE project_id=$1',[attachment[0].id])).rows:[]
const git=spawnSync('git',['-C',ctx.work,'status','--short'],{encoding:'utf8',windowsHide:true})
await save('security-extra-probes.json',{controlledProvider:{url:providerUrl,hits:providerHits,realExternalConformance:false},actualFailingCommandStatus:shell.data?.data?.receipt?.status,actualFailingCommandExit:shell.data?.data?.output?.exitCode,verificationAfterFailure:verified.data?.data?.outcome,directServiceCompletion:completed,nativeAttachment:attachment,automaticKnowledgeNodes:knowledge,gitStatus:git.stdout,logs})
await db.end();console.log(JSON.stringify({localDiscoveryHits:providerHits.length,failCommand:shell.data?.data?.output?.exitCode,verification:verified.data?.data?.outcome,directCompletion:completed.status,nativeAttachmentCount:attachment.length,knowledge}))
