import fs from 'node:fs/promises';
import pg from '../../../../backend/node_modules/pg/lib/index.js';
import {loadEnvironment} from '../../../../backend/server.js';
import {readRuntimeConfig} from '../../../../backend/foundation/runtimeConfig.js';
loadEnvironment();const config=readRuntimeConfig(process.env).database;
function target(name){const result={...config};if(config.connectionString){const url=new URL(config.connectionString);url.pathname='/'+name;result.connectionString=url.toString();}else result.database=name;return result;}
const result={checkedAt:new Date().toISOString(),operation:'Read-only metadata only; no target migration or data writes',targets:[]};
for(const name of ['sirona','sirona_workspace_p0_test_20261028']){
 const client=new pg.Client(target(name));await client.connect();try{await client.query('BEGIN READ ONLY');const actual=(await client.query('SELECT current_database() AS name')).rows[0].name;if(actual!==name)throw new Error('Unexpected target');
 const migrations=(await client.query('SELECT filename FROM schema_migrations ORDER BY filename')).rows.map(row=>row.filename);
 result.targets.push({database:name,migrations,expectedCount:name==='sirona'?21:22,result:migrations.length===(name==='sirona'?21:22)?'passed':'failed'});await client.query('ROLLBACK');}finally{await client.end();}
}
await fs.writeFile(new URL('./database-targets.json',import.meta.url),JSON.stringify(result,null,2));console.log(JSON.stringify(result.targets.map(item=>({database:item.database,migrationCount:item.migrations.length,result:item.result}))));if(result.targets.some(item=>item.result!=='passed'))process.exitCode=1;
