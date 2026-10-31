import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../../../../',import.meta.url));
const env={...process.env,PGDATABASE:'sirona_workspace_p0_test_20261028'};delete env.DATABASE_URL;
const tests=fs.readdirSync(path.join(root,'backend/dist-workspace/tests')).filter(name=>name.endsWith('.test.js')).map(name=>'backend/dist-workspace/tests/'+name);
// Each DB suite asserts the exact isolated current_database before any write.
const result=spawnSync(process.execPath,['--test','--test-concurrency=1','--test-timeout=60000',...tests],{cwd:root,env,encoding:'utf8',windowsHide:true,timeout:300000,maxBuffer:8*1024*1024});
fs.writeFileSync(new URL('./verified-workspace-tests.txt',import.meta.url),(result.stdout||'')+'\n'+(result.stderr||''));
const summary=(result.stdout||'').split(/\r?\n/).filter(line=>/ℹ (tests|pass|fail|cancelled|skipped|duration_ms)/.test(line));
const evidence={exitCode:result.status,signal:result.signal,errorCode:result.error?.code||null,summary,createdAt:new Date().toISOString()};
fs.writeFileSync(new URL('./verified-workspace-result.json',import.meta.url),JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));process.exitCode=result.status===0&&!result.error?0:1;
