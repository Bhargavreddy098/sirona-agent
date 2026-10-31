import {root,backend,save} from './diagnostic.mjs'
import {readFile,readdir} from 'node:fs/promises'
import {resolve,dirname,relative} from 'node:path'
import {pathToFileURL} from 'node:url'
const {routeInventory}=await import(pathToFileURL(resolve(backend,'tests/routeInventory.js')))
const routes=routeInventory()
const client=await readFile(resolve(root,'frontend/sirona/src/api/client.ts'),'utf8')
const ts=(await import(pathToFileURL(resolve(root,'frontend/sirona/node_modules/typescript/lib/typescript.js')))).default
const clientAst=ts.createSourceFile('client.ts',client,ts.ScriptTarget.Latest,true)
const frontendFiles=[]
async function walk(dir){for(const e of await readdir(dir,{withFileTypes:true})){const p=resolve(dir,e.name); if(e.isDirectory())await walk(p);else if(/\.tsx?$/.test(p)&&!p.endsWith('.d.ts'))frontendFiles.push(p)}}
await walk(resolve(root,'frontend/sirona/src'))
const clients=[]
const norm=s=>s.replace(/\$\{query\}/g,'').split('?')[0].replace(/\$\{[^}]+\}/g,':id').replace(/:[A-Za-z][A-Za-z0-9_]*/g,':id')
function visit(n,fn){fn(n);ts.forEachChild(n,c=>visit(c,fn))}
visit(clientAst,n=>{if(!ts.isMethodDeclaration(n)||!n.body)return;const body=n.body.getText(clientAst), paths=[...body.matchAll(/['"`]((?:\/api\/v1\/)[^'"`]+)['"`]/g)];for(const p of paths)clients.push({name:n.name.getText(clientAst),method:body.match(/method:\s*['"]([A-Z]+)['"]/)?.[1]||'GET',path:p[1]})})
const texts=new Map(await Promise.all(frontendFiles.map(async p=>[p,await readFile(p,'utf8')])))
for(const row of routes){
 row.registration=relative(root,resolve(backend,row.router)).replaceAll('\\','/')
 const fileText=await readFile(resolve(backend,row.router),'utf8')
 const services=[...row.chain.join(' ').matchAll(/([A-Z][A-Za-z]+Service)\.([A-Za-z]+)/g)].map(m=>m[1]+'.'+m[2])
 row.services=[...new Set(services)]
 row.auth=row.chain.some(c=>c.includes('sessionAuth'))?'sessionAuth; CSRF for mutations (resource scope must be separately checked)':row.chain.some(c=>c.includes('userAuth'))?'legacy userAuth; production admission denied':row.path.startsWith('/health')?'public foundation':'route-specific/legacy; see admission/live result'
 row.requestFields=[...new Set([...row.handler.matchAll(/const\s*\{([^}]+)\}\s*=\s*req\.(body|query|params)/g)].flatMap(m=>m[1].split(',').map(s=>s.trim())))];row.requestValidation='Manual per-handler/service validation; no common generated runtime schema'
 row.responseSchema=row.handler.includes('res.json')||row.handler.includes('.json(')?'Handler JSON envelope; see raw chain':row.handler.includes('res.write')?'SSE/raw handler; see raw chain':'Delegated handler; see controller'
 row.errors=[...new Set([...row.handler.matchAll(/sendProblem\([^;]+/g)].map(m=>m[0].slice(0,180)))]
 row.databaseDependencies=[]
 for(const s of row.services){const cls=s.split('.')[0],match=[...fileText.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g)].find(m=>m[1].includes(cls));if(match){const p=resolve(dirname(resolve(backend,row.router)),match[2]);const serviceText=await readFile(p,'utf8');row.databaseDependencies.push({file:relative(root,p).replaceAll('\\','/'),tables:[...new Set([...serviceText.matchAll(/(?:FROM|JOIN|INTO|UPDATE)\s+([a-z_][a-z_0-9.]*)/g)].map(m=>m[1]))]})}}
 const matches=clients.filter(c=>c.method===row.method&&norm(c.path)===norm(row.path))
 row.frontendFunctions=matches.map(c=>c.name)
 row.frontendConsumers=[...new Set(matches.flatMap(c=>[...texts].filter(([p,t])=>!p.endsWith('/api/client.ts')&&t.includes('.'+c.name+'(')).map(([p])=>relative(root,p).replaceAll('\\','/'))))]
 const tests=[];for(const file of await readdir(resolve(backend,'tests'))){if(!file.endsWith('.test.js'))continue;const t=await readFile(resolve(backend,'tests',file),'utf8');const suffix=row.path.split('/').filter(Boolean).at(-1);if(t.includes(row.path)|| (suffix&&suffix.length>5&&t.includes('/'+suffix)))tests.push('backend/tests/'+file)}row.testReferences=tests;row.testEvidence='Source reference only, not a per-route pass claim'
 row.runtimeVerified=false
}
await save('route-inventory.json',{count:routes.length,canonical:routes.filter(r=>r.path.startsWith('/api/v1')).length,routes})
console.log(JSON.stringify({total:routes.length,canonical:routes.filter(r=>r.path.startsWith('/api/v1')).length,legacy:routes.filter(r=>!r.path.startsWith('/api/v1')&&!r.path.startsWith('/health')).length}))
