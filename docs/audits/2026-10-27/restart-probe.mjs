import {backend,evidence,save,config} from './diagnostic.mjs'
import {readFile,writeFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
const ctx=JSON.parse(await readFile(resolve(evidence,'runtime-context.json'),'utf8')),deep=JSON.parse(await readFile(resolve(evidence,'deep-runtime-probes.json'),'utf8'))
let cookie='',csrf='';const log=[],base='http://127.0.0.1:8012'
async function req(method,path,body){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',Cookie:cookie,'X-CSRF-Token':csrf},...(body!==undefined?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(4000)});const data=await r.json();log.push({method,path,status:r.status,data});return{r,data}}
const auth=await req('POST','/api/v1/session/bootstrap',{});cookie=auth.r.headers.get('set-cookie').split(';')[0];csrf=auth.data.data.csrfToken
const paused=await req('POST',`/api/v1/runs/${deep.startedId}/pause`,{reason:'Audit owned-process restart'})
await writeFile(resolve(evidence,'stop-runtime'),'Stop only the owned audit runtime')
let stopped=false
for(let i=0;i<40;i++){try{await fetch(base+'/health/live',{signal:AbortSignal.timeout(300)})}catch{stopped=true;break}await new Promise(r=>setTimeout(r,250))}
if(!stopped)throw Error('Owned audit listener did not stop; refusing duplicate bind')
process.env.PGDATABASE=ctx.database
if(process.env.DATABASE_URL){const u=new URL(process.env.DATABASE_URL);u.pathname='/'+ctx.database;process.env.DATABASE_URL=u.href;for(const k of ['PGHOST','PGPORT','PGUSER','PGPASSWORD','PGDATABASE'])delete process.env[k]}
for(const k of Object.keys(process.env))if(/(?:OPENAI|ANTHROPIC|GEMINI|GOOGLE|CUSTOM).*API_KEY/i.test(k))delete process.env[k]
process.env.NODE_ENV='production';process.env.PORT='8012';process.env.ALLOWED_ORIGINS='http://127.0.0.1:5180,http://127.0.0.1:8012'
const {startBackend}=await import(pathToFileURL(resolve(backend,'server.js')))
const runtime=await startBackend(process.env)
try{
 await req('GET','/health/ready');await req('GET','/api/v1/session');await req('GET',`/api/v1/projects/${ctx.projectId}`);await req('GET',`/api/v1/runs/${deep.startedId}`)
 await req('POST','/api/v1/session/bootstrap',{})
 await req('POST',`/api/v1/runs/${deep.startedId}/resume`,{expectedEpoch:paused.data?.data?.run?.epoch})
 await req('POST',`/api/v1/runs/${deep.startedId}/cancel`,{reason:'Audit cleanup'})
 await req('POST',`/api/v1/runs/${deep.startedId}/resume`,{expectedEpoch:0})
 await save('restart-durability.json',{processRestart:true,sameSessionCookieKeptInMemory:true,productionRestart:true,log})
 console.log(JSON.stringify(log.map(x=>({method:x.method,path:x.path,status:x.status,state:x.data?.data?.run?.state}))))
}finally{await runtime.stop()}
