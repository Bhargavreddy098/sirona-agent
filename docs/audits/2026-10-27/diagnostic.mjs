import { createRequire } from 'node:module'
import { resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { writeFile, readFile, readdir } from 'node:fs/promises'
import { randomUUID, createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
const root=resolve(dirname(fileURLToPath(import.meta.url)), '../../..'), evidence=resolve(root,'docs/audits/2026-10-27/evidence')
const backend=resolve(root,'backend'), require=createRequire(resolve(backend,'package.json'))
const {loadEnvironment}=await import(pathToFileURL(resolve(backend,'server.js')))
loadEnvironment()
const {readRuntimeConfig}=await import(pathToFileURL(resolve(backend,'foundation/runtimeConfig.js')))
const {Client}=require('pg'), config=readRuntimeConfig(process.env).database
const save=async(name,value)=>writeFile(resolve(evidence,name),JSON.stringify(value,null,2))
export {root,evidence,backend,require,config,save,Client}
const mode=process.argv[2]
if(mode==='database'){
 const client=new Client(config); await client.connect()
 try {
  await client.query('BEGIN READ ONLY')
  const info={}
  for(const [name,sql] of Object.entries({identity:'SELECT current_database() AS database, current_user AS role, version() AS version',role:'SELECT rolsuper, rolcreatedb, rolcreaterole, rolbypassrls FROM pg_roles WHERE rolname=current_user',extensions:'SELECT extname,extversion FROM pg_extension',tables:"SELECT n.nspname AS schema,c.relname AS name,c.relrowsecurity AS rls,c.relforcerowsecurity AS forced_rls FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind='r' AND n.nspname NOT IN ('pg_catalog','information_schema') ORDER BY 1,2",migrations:'SELECT filename,checksum,applied_at FROM schema_migrations ORDER BY filename',policies:'SELECT schemaname,tablename,policyname,roles,cmd FROM pg_policies'})) info[name]=(await client.query(sql)).rows
  info.schema=(await client.query("SELECT table_schema,table_name,column_name,data_type,is_nullable FROM information_schema.columns WHERE table_schema NOT IN ('pg_catalog','information_schema') ORDER BY 1,2,ordinal_position")).rows
  info.secretCounts=(await client.query('SELECT count(*) AS connections, count(api_key_ciphertext) AS populated_key_columns FROM provider_connections')).rows
  info.checksums=[]
  for(const file of (await readdir(resolve(backend,'migrations'))).filter(f=>f.endsWith('.sql'))){const checksum=createHash('sha256').update(await readFile(resolve(backend,'migrations',file))).digest('hex');const recorded=info.migrations.find(m=>m.filename===file); info.checksums.push({file,match:recorded?.checksum===checksum,recorded:!!recorded})}
  await client.query('COMMIT'); await save('database-live-readonly.json',info)
  const name='sirona_audit_20261027_'+randomUUID().slice(0,8)
  await client.query(`CREATE DATABASE "${name}"`)
  await save('audit-database.json',{name,created:true,productionDatabaseChanged:false})
  console.log(JSON.stringify({databaseInspected:info.identity,tableCount:info.tables.length,role:info.role,checksumMismatches:info.checksums.filter(c=>!c.match),auditDatabase:name}))
 }finally{await client.end()}
}
if(mode==='migrate'||mode==='verify'){
 const {name}=JSON.parse(await readFile(resolve(evidence,'audit-database.json'),'utf8'))
 if(!/^sirona_audit_20261027_[a-f0-9]{8}$/.test(name))throw Error('Invalid audit DB')
 const env={...process.env,PGDATABASE:name}
 if(env.DATABASE_URL){const u=new URL(env.DATABASE_URL);u.pathname='/'+name;env.DATABASE_URL=u.href;delete env.PGHOST;delete env.PGPORT;delete env.PGUSER;delete env.PGPASSWORD;delete env.PGDATABASE}
 const start=Date.now(),args=mode==='migrate'?['migrations/runMigrations.js']: [process.env.SIRONA_AUDIT_NPM_CLI || 'C:/Users/bharg/AppData/Roaming/npm/node_modules/npm/bin/npm-cli.js','run','verify']
 const result=spawnSync(process.execPath,args,{cwd:backend,env,encoding:'utf8',timeout:600000,windowsHide:true,maxBuffer:12*1024*1024})
 await writeFile(resolve(evidence,mode+'-audit-db.txt'),(result.stdout||'')+(result.stderr||''))
 await save(mode+'-result.json',{command:mode==='migrate'?'node migrations/runMigrations.js':'npm run verify',database:name,exitCode:result.status,error:result.error?.code,durationMs:Date.now()-start})
 console.log(JSON.stringify({mode,exitCode:result.status,durationMs:Date.now()-start}));process.exitCode=result.status??1
}
