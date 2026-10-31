// Owner explicitly approved 022 on the named disposable DB only. No live migration.
import pg from '../../../../backend/node_modules/pg/lib/index.js';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {loadEnvironment} from '../../../../backend/server.js';
import {readRuntimeConfig} from '../../../../backend/foundation/runtimeConfig.js';
loadEnvironment();const config=readRuntimeConfig(process.env).database;
const target='sirona_workspace_p0_test_20261028';
let connection={...config,database:target};
if(config.connectionString){const url=new URL(config.connectionString);url.pathname='/'+target;connection={...config,connectionString:url.toString()};}
const client=new pg.Client(connection);await client.connect();
try{
 if((await client.query('SELECT current_database() AS name')).rows[0].name!==target)throw new Error('Unsafe target');
 const file='022_execution_reliability.sql';const sql=await fs.readFile(new URL('../../../../backend/migrations/'+file,import.meta.url),'utf8');const checksum=crypto.createHash('sha256').update(sql).digest('hex');
 const old=await client.query('SELECT checksum FROM schema_migrations WHERE filename=$1',[file]);
 if(old.rowCount){if(old.rows[0].checksum!==checksum)throw new Error('Migration checksum mismatch');}
 else{await client.query('BEGIN');try{await client.query(sql);await client.query('INSERT INTO schema_migrations(filename,checksum)VALUES($1,$2)',[file,checksum]);await client.query('COMMIT');}catch(error){await client.query('ROLLBACK');throw error;}}
 const report={appliedAt:new Date().toISOString(),target,file,checksum,result:'passed',approval:'Explicit owner approval: migration 022 on isolated test database only',workingSironaMigrated:false};await fs.writeFile(new URL('./migration-022.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await client.end();}
