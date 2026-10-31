const {spawnSync}=require('node:child_process');const fs=require('node:fs'),path=require('node:path');
const root=process.cwd(),out=path.join(root,'docs/integration/evidence/workspace-p5-repair');fs.mkdirSync(out,{recursive:true});
const env={...process.env,PGDATABASE:'sirona_workspace_p0_test_20261028'};delete env.DATABASE_URL;
const build=spawnSync(process.execPath,['node_modules/typescript/bin/tsc','-p','tsconfig.workspace.json'],{cwd:path.join(root,'backend'),env,encoding:'utf8',timeout:90000,windowsHide:true});
fs.writeFileSync(path.join(out,'build.txt'),(build.stdout||'')+(build.stderr||''));
if(build.status!==0){console.log('Build failed:',build.stdout,build.stderr);process.exit(build.status??1);}
const names=['graphCheckpoint','delegationPolicy','orchestrationRecovery','orchestrationWorkflow','orchestrationGraphIntegration','providerActivityBounds','orchestrationCrash','orchestrationGuestVerification'];
const result=spawnSync(process.execPath,['--test','--test-concurrency=1','--test-timeout=30000',...names.map(n=>'dist-workspace/tests/'+n+'.test.js')],{cwd:path.join(root,'backend'),env,encoding:'utf8',timeout:180000,maxBuffer:4*1024*1024,windowsHide:true});
const text=(result.stdout||'')+(result.stderr||'');fs.writeFileSync(path.join(out,'free-p5-tests.txt'),text);
console.log(text.split(/\r?\n/).filter(l=>/^(# (tests|pass|fail|cancelled|skipped)|not ok|  error:|    .*Error|  code:)/.test(l)).join('\n'));
console.log('Exit:',result.status,'Runner error:',result.error?.code??'none');process.exitCode=result.status??1;
