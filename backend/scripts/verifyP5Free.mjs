import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const backend=fileURLToPath(new URL('../',import.meta.url));
const evidence=path.resolve(backend,'../docs/integration/evidence/workspace-p5-repair');
fs.mkdirSync(evidence,{recursive:true});
const env={...process.env,PGDATABASE:'sirona_workspace_p0_test_20261028',SIRONA_ORCHESTRATION_ENABLED:'false'};
delete env.DATABASE_URL;
const files=['graphCheckpoint','delegationPolicy','orchestrationRecovery','orchestrationWorkflow','orchestrationGraphIntegration','providerActivityBounds','orchestrationCrash','orchestrationGuestVerification','orchestrationCanonicalJourney','orchestrationModelRecovery'];
function run(args,timeout){return spawnSync(process.execPath,args,{cwd:backend,env,encoding:'utf8',timeout,maxBuffer:8*1024*1024,windowsHide:true});}
const build=run(['node_modules/typescript/bin/tsc','-p','tsconfig.workspace.json'],90000);
fs.writeFileSync(path.join(evidence,'build.txt'),(build.stdout??'')+(build.stderr??''));
if(build.status!==0){console.error('P5 build failed. See build.txt.');process.exit(build.status??1);}
const result=run(['--test','--test-reporter=tap','--test-concurrency=1','--test-timeout=90000',...files.map(f=>'dist-workspace/tests/'+f+'.test.js')],240000);
const transcript=(result.stdout??'')+(result.stderr??'');
fs.writeFileSync(path.join(evidence,'free-p5-tests.txt'),transcript);
console.log(transcript.split(/\r?\n/).filter(s=>/^(# (tests|pass|fail|cancelled|skipped)|not ok)/.test(s)).join('\n'));
const summary={timestamp:new Date().toISOString(),database:'sirona_workspace_p0_test_20261028',groups:files,exitCode:result.status,runnerError:result.error?.code??null,inferenceCalls:0,migrationsApplied:0,scope:'Free transport/control/DB/guest qualification only; real-model P5 workflow remains UNVERIFIED'};
fs.writeFileSync(path.join(evidence,'free-verification.json'),JSON.stringify(summary,null,2)+'\n');
process.exitCode=result.status??1;
