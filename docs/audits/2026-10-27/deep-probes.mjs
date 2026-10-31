import {root,backend,evidence,save,config,Client} from './diagnostic.mjs'
import {readFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
import {createHash,randomUUID} from 'node:crypto'
const ctx=JSON.parse(await readFile(resolve(evidence,'runtime-context.json'),'utf8'))
if(!ctx.database.startsWith('sirona_audit_20261027_'))throw Error('Invalid audit DB')
const db=new Client({...config,database:ctx.database,...(config.connectionString?{connectionString:(()=>{const u=new URL(config.connectionString);u.pathname='/'+ctx.database;return u.href})()}:{} )});await db.connect()
const log=[],base='http://127.0.0.1:8012';let cookie='',csrf=''
async function req(method,path,body){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',Cookie:cookie,'X-CSRF-Token':csrf},...(body!==undefined?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(6000)});let data;try{data=await r.json()}catch{data=null};log.push({method,path,status:r.status,data});return {r,data}}
const auth=await req('POST','/api/v1/session/bootstrap',{});cookie=auth.r.headers.get('set-cookie').split(';')[0];csrf=auth.data.data.csrfToken
// All insertions below are explicit verifier/contract fixtures in the disposable DB,
// not evidence that Sirona generated a plan or ran tests.
const reqRev=(await db.query("INSERT INTO requirement_revisions (goal_id,revision,digest,requirements) VALUES ($1,1,$2,'[]') RETURNING id",[ctx.goalId,'b'.repeat(64)])).rows[0]
const plan=(await db.query('INSERT INTO plans (goal_id) VALUES ($1) RETURNING id',[ctx.goalId])).rows[0]
const planRev=(await db.query("INSERT INTO plan_revisions (plan_id,goal_id,revision,requirement_revision_id,digest,steps) VALUES ($1,$2,1,$3,$4,'[]') RETURNING id",[plan.id,ctx.goalId,reqRev.id,'c'.repeat(64)])).rows[0]
const contract=(await db.query('INSERT INTO contracts (goal_id) VALUES ($1) RETURNING id',[ctx.goalId])).rows[0]
const document={deliverable:'audit sum endpoint',criteria:[{id:'audit-required-tests',name:'Actually execute the failing test suite',required:true}],steps:[{key:'implement_sum_endpoint',dependencies:[]}]}
const digest=createHash('sha256').update(JSON.stringify(document)).digest('hex')
const contractRev=(await db.query('INSERT INTO contract_revisions (contract_id,goal_id,revision,plan_revision_id,requirement_revision_id,digest,document) VALUES ($1,$2,1,$3,$4,$5,$6) RETURNING id',[contract.id,ctx.goalId,planRev.id,reqRev.id,digest,document])).rows[0]
await db.query('UPDATE runs SET contract_revision_id=$1, plan_revision_id=$2 WHERE id=$3',[contractRev.id,planRev.id,ctx.runId])
await req('POST',`/api/v1/runs/${ctx.runId}/verifications`,{artifactId:ctx.artifactId})
await req('POST',`/api/v1/runs/${ctx.runId}/verifications`,{artifactId:ctx.artifactId,testResults:{'audit-required-tests':{outcome:'fail',reason:'AUDIT intentional failing result'}}})
await req('POST',`/api/v1/runs/${ctx.runId}/verifications`,{artifactId:ctx.artifactId,testResults:{'audit-required-tests':{outcome:'unknown'}}})
await db.query("UPDATE goals SET autonomy_mode='readonly' WHERE id=$1",[ctx.goalId])
const started=await req('POST',`/api/v1/goals/${ctx.goalId}/runs`,{contractRevisionId:contractRev.id,contractDigest:digest,budgetCeilingMicroUsd:0})
let startedId=started.data?.data?.run?.id||started.data?.data?.id
if(startedId){await new Promise(r=>setTimeout(r,2000));await req('GET',`/api/v1/runs/${startedId}`);await req('GET',`/api/v1/runs/${startedId}/tasks`);await req('GET',`/api/v1/runs/${startedId}/agents`)}
const clarified=await req('POST',`/api/v1/goals/${ctx.goalId}/clarifications`,{question:'AUDIT authentication choice: local passwords or external identity provider?',materiality:'material',options:[{id:'local',label:'Local passwords'},{id:'external',label:'External identity provider'}]})
const clarificationId=clarified.data?.data?.clarification?.id
if(clarificationId){await req('POST',`/api/v1/clarifications/${clarificationId}/answers`,{answer:'Local passwords',selectedOptionId:'local'});await req('POST',`/api/v1/clarifications/${clarificationId}/answers`,{answer:'External identity provider'})}
await req('POST',`/api/v1/goals/${ctx.goalId}/intent-analysis`,{})
await req('POST',`/api/v1/contract-revisions/${contractRev.id}/approval-requests`,{inputDigest:digest})
await req('POST',`/api/v1/projects/${ctx.projectId}/schedules`,{goalTemplate:{intent:'AUDIT harmless scheduled task'},recurrence:'every 1s',timezone:'UTC',budgetCeilingMicroUsd:1000,misfirePolicy:'latest',overlapPolicy:'skip'})
await req('GET',`/api/v1/projects/${ctx.projectId}/schedules`)
const routes=JSON.parse(await readFile(resolve(evidence,'route-inventory.json'),'utf8')).routes.filter(r=>r.path.startsWith('/api/v1'))
for(const row of routes){if(row.path==='/api/v1/session'||row.path==='/api/v1/session/bootstrap')continue;const p=row.path.replace(/:[A-Za-z][A-Za-z0-9_]*/g,()=>randomUUID());await req(row.method,p,['GET','HEAD'].includes(row.method)?undefined:(p==='/api/v1/system/maintenance/purge'?{dryRun:true}:{}))}
// Durable replay is a real SSE endpoint; bounded read and then cancel.
const controller=new AbortController();let sse='';try{const r=await fetch(base+`/api/v1/runs/${ctx.runId}/events`,{headers:{Cookie:cookie,Accept:'text/event-stream'},signal:AbortSignal.any([controller.signal,AbortSignal.timeout(2000)])});const reader=r.body.getReader();const chunk=await reader.read();sse=new TextDecoder().decode(chunk.value);controller.abort();log.push({method:'GET',path:`/api/v1/runs/${ctx.runId}/events`,status:r.status,firstChunk:sse})}catch(error){log.push({sseError:error.name,firstChunk:sse})}
await save('deep-runtime-probes.json',{fixturePreparation:'Explicit SQL fixtures only; no generated-agent claim',log,contractRevisionId:contractRev.id,digest,startedId,clarificationId})
await db.end();console.log(JSON.stringify({requests:log.length,verification:log.filter(x=>x.path?.endsWith('/verifications')).map(x=>({status:x.status,outcome:x.data?.data?.outcome})),runStart:started.r.status,startedId,clarificationId}))
