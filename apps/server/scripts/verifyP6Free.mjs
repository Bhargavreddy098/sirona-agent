import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const backend=fileURLToPath(new URL('../',import.meta.url)),evidence=path.resolve(backend,'../../docs/integration/evidence/workspace-p6');fs.mkdirSync(evidence,{recursive:true});
const env={...process.env,PGDATABASE:'sirona_workspace_p0_test_20261028',SIRONA_ORCHESTRATION_ENABLED:'false',SIRONA_P6_CONTEXT_ENABLED:'false'};delete env.DATABASE_URL;
const run=(args,timeout)=>spawnSync(process.execPath,args,{cwd:backend,env,encoding:'utf8',timeout,maxBuffer:8*1024*1024,windowsHide:true});
const build=run(['node_modules/typescript/bin/tsc','-p','tsconfig.workspace.json'],90000);fs.writeFileSync(path.join(evidence,'build.txt'),(build.stdout??'')+(build.stderr??''));if(build.status!==0){console.error('P6 build failed; see build.txt');process.exit(build.status??1);}
const groups=['contextIsolation','mcpAuthorization','gitWorkspace','p6CanonicalJourney'];
const result=run(['--test','--test-reporter=tap','--test-concurrency=1','--test-timeout=60000',...groups.map(name=>'dist-workspace/tests/'+name+'.test.js')],180000),transcript=(result.stdout??'')+(result.stderr??'');fs.writeFileSync(path.join(evidence,'gate-a-tests.txt'),transcript);console.log(transcript);
fs.writeFileSync(path.join(evidence,'gate-a-verification.json'),JSON.stringify({timestamp:new Date().toISOString(),scope:'Gate A only; no guest/SQL/LSP/ripgrep/Git runtime qualification claimed',database:env.PGDATABASE,groups,exitCode:result.status,runnerError:result.error?.code??null,paidCalls:0,migrationsApplied:0,workingDataWrites:0,productionActivation:false,remaining:['Gate B exact tools image/artifacts approval','SQL WASM artifact qualification','Real guest MCP/Git/ripgrep/LSP canonical E2E','P5 real-provider acceptance remains UNVERIFIED']},null,2));process.exitCode=result.status??1;
