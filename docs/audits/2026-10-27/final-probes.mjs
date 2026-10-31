import {evidence,save,config,Client} from './diagnostic.mjs'
import {readFile} from 'node:fs/promises'
import {resolve} from 'node:path'
const ctx=JSON.parse(await readFile(resolve(evidence,'runtime-context.json'),'utf8')), deep=JSON.parse(await readFile(resolve(evidence,'deep-runtime-probes.json'),'utf8'))
const db=new Client({...config,database:ctx.database,...(config.connectionString?{connectionString:(()=>{const u=new URL(config.connectionString);u.pathname='/'+ctx.database;return u.href})()}:{} )});await db.connect()
const log=[];let cookie='',csrf=''
async function req(method,path,body){const r=await fetch('http://127.0.0.1:8012'+path,{method,headers:{'Content-Type':'application/json',Cookie:cookie,'X-CSRF-Token':csrf},...(body!==undefined?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(5000)});const data=await r.json();log.push({method,path,status:r.status,data});return{r,data}}
const auth=await req('POST','/api/v1/session/bootstrap',{});cookie=auth.r.headers.get('set-cookie').split(';')[0];csrf=auth.data.data.csrfToken
await db.query("UPDATE goals SET autonomy_mode='supervised' WHERE id=$1",[ctx.goalId])
const approval=(await db.query("INSERT INTO approvals (project_id,contract_revision_id,input_digest,state,expires_at) VALUES ($1,$2,$3,'approved',NOW()-INTERVAL '1 day') RETURNING id",[ctx.projectId,deep.contractRevisionId,deep.digest])).rows[0]
const expired=await req('POST',`/api/v1/goals/${ctx.goalId}/runs`,{contractRevisionId:deep.contractRevisionId,contractDigest:deep.digest,budgetCeilingMicroUsd:0})
const runs=(await db.query('SELECT id,state,epoch FROM runs WHERE project_id=$1 ORDER BY created_at DESC',[ctx.projectId])).rows
const scheduled=(await db.query('SELECT s.id,s.next_fire_at,(SELECT count(*) FROM automation.occurrences o WHERE o.schedule_id=s.id) AS occurrences FROM automation.schedules s WHERE s.project_id=$1',[ctx.projectId])).rows
const queue=(await db.query("SELECT schemaname,tablename FROM pg_tables WHERE tablename ILIKE '%queue%' OR tablename ILIKE '%outbox%' OR tablename ILIKE '%inbox%'")).rows
const constraints=(await db.query("SELECT contype, count(*) FROM pg_constraint WHERE connamespace IN (SELECT oid FROM pg_namespace WHERE nspname NOT IN ('pg_catalog','information_schema')) GROUP BY contype")).rows
const diagnostics=await req('GET','/api/v1/system/diagnostics')
await save('final-runtime-probes.json',{expiredApprovalFixture:approval.id,expiredApprovalAcceptedStatus:expired.r.status,runs,scheduled,queueTables:queue,constraints,log,diagnosticsSecurityClaim:diagnostics.data?.data?.security})
await db.end();console.log(JSON.stringify({expiredApprovalRunStatus:expired.r.status,scheduled,queueTables:queue}))
