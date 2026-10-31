// Owner authorized P0 test DB + existing migrations by "Yes proceed" after the
// named-target approval request. Never operates on the working sirona database.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import pg from '../../../../backend/node_modules/pg/lib/index.js';
import {loadEnvironment} from '../../../../backend/server.js';
import {readRuntimeConfig} from '../../../../backend/foundation/runtimeConfig.js';
if(!process.argv.includes('--approved-p0-test-database'))throw new Error('Explicit approved target flag required');
const target='sirona_workspace_p0_test_20261028';
const here=path.dirname(fileURLToPath(import.meta.url));
const backend=path.resolve(here,'../../../../backend');
loadEnvironment();const config=readRuntimeConfig(process.env).database;
function forDatabase(name){
  if(config.connectionString){const url=new URL(config.connectionString);url.pathname='/'+name;return{...config,connectionString:url.toString()};}
  return{...config,database:name};
}
const report={startedAt:new Date().toISOString(),target,workingDatabaseUsedForTests:false,approval:'Owner: Yes proceed following exact named P0 disposable-target and 001–021 approval request',status:'checking',created:false};
const admin=new pg.Client(forDatabase('postgres'));await admin.connect();
try{
  const exists=await admin.query('SELECT 1 FROM pg_database WHERE datname=$1',[target]);
  if(exists.rowCount)throw new Error('Target already exists; refusing to overwrite/recreate it');
  await fs.writeFile(path.join(here,'test-database-provisioning.json'),JSON.stringify(report,null,2));
  // Fixed compile-time identifier; no user/computed identifier enters this DDL.
  await admin.query('CREATE DATABASE sirona_workspace_p0_test_20261028');
  report.created=true;report.status='created';
  await fs.writeFile(path.join(here,'test-database-provisioning.json'),JSON.stringify(report,null,2));
}finally{await admin.end();}
const childEnv={...process.env};
if(config.connectionString){const url=new URL(config.connectionString);url.pathname='/'+target;childEnv.DATABASE_URL=url.toString();for(const key of ['PGHOST','PGPORT','PGDATABASE','PGUSER','PGPASSWORD'])delete childEnv[key];}
else{delete childEnv.DATABASE_URL;childEnv.PGDATABASE=target;}
try{
  const verify=new pg.Client(forDatabase(target));await verify.connect();
  try{const actual=(await verify.query('SELECT current_database() AS name')).rows[0].name;if(actual!==target)throw new Error('Unsafe database target');}finally{await verify.end();}
  const migrationLog=execFileSync(process.execPath,['migrations/runMigrations.js'],{cwd:backend,env:childEnv,timeout:120000,maxBuffer:4*1024*1024,encoding:'utf8',windowsHide:true});
  await fs.writeFile(path.join(here,'test-database-migrations.log'),migrationLog);
  const owner=new pg.Client(forDatabase(target));await owner.connect();
  try{const actual=(await owner.query('SELECT current_database() AS name')).rows[0].name;if(actual!==target)throw new Error('Unsafe database target');report.migrations=(await owner.query('SELECT filename FROM schema_migrations ORDER BY filename')).rows.map(row=>row.filename);if(report.migrations.length!==21||report.migrations.at(-1)!=='021_standalone_conversations.sql')throw new Error('Unexpected migration lineage');}finally{await owner.end();}
  const testLog=execFileSync(process.execPath,['--test','--test-concurrency=1','--test-timeout=30000','tests/standaloneChat.test.js'],{cwd:backend,env:childEnv,timeout:120000,maxBuffer:4*1024*1024,encoding:'utf8',windowsHide:true});
  await fs.writeFile(path.join(here,'test-database-integration.log'),testLog);
  if(!/tests 6/.test(testLog)||!/pass 6/.test(testLog)||!/fail 0/.test(testLog))throw new Error('Integration pass summary missing');
  report.tests={suite:'standaloneChat.test.js',passed:6,failed:0,scope:'Real HTTP + PostgreSQL auth/CSRF/ownership/standalone/project separation/leases/failed upstream retry; no mock success or real provider inference claim'};
  report.status='passed';report.completedAt=new Date().toISOString();
}catch(error){report.status='failed';report.error={name:error.name,code:error.code||null};if(error.stdout)await fs.writeFile(path.join(here,'test-database-failure.log'),String(error.stdout));process.exitCode=1;}
await fs.writeFile(path.join(here,'test-database-provisioning.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({status:report.status,target,created:report.created,migrations:report.migrations?.length,tests:report.tests||null}));
