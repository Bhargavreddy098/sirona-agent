import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import pg from '../../../../backend/node_modules/pg/lib/index.js';
import {loadEnvironment} from '../../../../backend/server.js';
import {readRuntimeConfig} from '../../../../backend/foundation/runtimeConfig.js';
loadEnvironment();const target='sirona_workspace_p0_test_20261028',env={...process.env,SIRONA_EXECUTION_RELIABILITY:'false'};
if(env.DATABASE_URL){const url=new URL(env.DATABASE_URL);url.pathname='/'+target;env.DATABASE_URL=url.toString();for(const key of ['PGHOST','PGPORT','PGDATABASE','PGUSER','PGPASSWORD'])delete env[key];}else env.PGDATABASE=target;
const client=new pg.Client(readRuntimeConfig(env).database);await client.connect();
try{if((await client.query('SELECT current_database() AS name')).rows[0].name!==target)throw new Error('Unsafe test target');}finally{await client.end();}
const tests=['tests/config.test.js','tests/runner.test.js','tests/runtimeConfig.test.js','tests/standaloneChat.test.js','tests/execution.test.js'];
try{
 const output=execFileSync(process.execPath,['--test','--test-concurrency=1','--test-timeout=30000',...tests],{cwd:new URL('../../../../backend/',import.meta.url),env,encoding:'utf8',timeout:120000,maxBuffer:8*1024*1024,windowsHide:true});
 await fs.writeFile(new URL('./regression-tests.txt',import.meta.url),output);console.log(output.split(/\r?\n/).filter(line=>/tests |pass |fail |duration_ms/.test(line)).join('\n'));
}catch(error){if(error.stdout)await fs.writeFile(new URL('./regression-tests.txt',import.meta.url),String(error.stdout));console.error('Regression failure; inspect saved transcript');process.exitCode=1;}
