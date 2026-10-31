import {backend,evidence,config,Client,save} from './diagnostic.mjs'
import {readFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
const ctx=JSON.parse(await readFile(resolve(evidence,'runtime-context.json'),'utf8'))
process.env.PGDATABASE=ctx.database;if(process.env.DATABASE_URL){const u=new URL(process.env.DATABASE_URL);u.pathname='/'+ctx.database;process.env.DATABASE_URL=u.href;for(const k of ['PGHOST','PGPORT','PGUSER','PGPASSWORD','PGDATABASE'])delete process.env[k]}
process.env.PORT='8012';process.env.NODE_ENV='production'
const {startBackend}=await import(pathToFileURL(resolve(backend,'server.js'))), {generateLauncherChallenge}=await import(pathToFileURL(resolve(backend,'services/launcherChallenge.js')))
const runtime=await startBackend(process.env),base='http://127.0.0.1:8012'
const db=new Client({...config,database:ctx.database,...(config.connectionString?{connectionString:(()=>{const u=new URL(config.connectionString);u.pathname='/'+ctx.database;return u.href})()}:{} )});await db.connect()
try{
 const auth=await fetch(base+'/api/v1/session/bootstrap',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(generateLauncherChallenge())});const cookie=auth.headers.get('set-cookie').split(';')[0]
 const controller=new AbortController();const deadline=setTimeout(()=>controller.abort(),6000);const response=await fetch(base+`/api/v1/runs/${ctx.runId}/events`,{headers:{Cookie:cookie,'Accept-Encoding':'identity'},signal:controller.signal});const reader=response.body.getReader();let first=new TextDecoder().decode((await reader.read()).value)
 const seq=Number((await db.query('SELECT COALESCE(MAX(sequence),0)+1 AS next FROM run_events WHERE run_id=$1',[ctx.runId])).rows[0].next)
 await db.query("INSERT INTO run_events (run_id,sequence,event_type,payload) VALUES ($1,$2,'audit.late_event',$3)",[ctx.runId,seq,JSON.stringify({audit:true})])
 const next=await Promise.race([reader.read().then(c=>new TextDecoder().decode(c.value)).catch(()=>''),new Promise(r=>setTimeout(()=>r('TIMEOUT_NO_LIVE_EVENT'),2500))]);controller.abort();clearTimeout(deadline)
 const reconnectController=new AbortController();const replayDeadline=setTimeout(()=>reconnectController.abort(),6000);const replay=await fetch(base+`/api/v1/runs/${ctx.runId}/events?after=${seq-1}`,{headers:{Cookie:cookie,'Accept-Encoding':'identity'},signal:reconnectController.signal});const replayBody=new TextDecoder().decode((await replay.body.getReader().read()).value);reconnectController.abort();clearTimeout(replayDeadline)
 const invalid=await fetch(base+`/api/v1/runs/${ctx.runId}/events?after=-1`,{headers:{Cookie:cookie}})
 await save('sse-runtime.json',{status:response.status,initialReplay:first,lateEventSequence:seq,liveRead:next,reconnectSawLateEvent:replayBody.includes('audit.late_event'),reconnectReplay:replayBody,invalidCursorStatus:invalid.status})
 console.log(JSON.stringify({status:response.status,liveRead:next,reconnect:replayBody.includes('audit.late_event'),invalidCursorStatus:invalid.status}))
}finally{await db.end();await runtime.stop()}
