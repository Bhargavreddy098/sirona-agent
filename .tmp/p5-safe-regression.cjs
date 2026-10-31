const {spawnSync}=require('node:child_process');const fs=require('node:fs'),path=require('node:path');
const root=process.cwd(),cwd=path.join(root,'backend'),out=path.join(root,'docs/integration/evidence/workspace-p5-repair');fs.mkdirSync(out,{recursive:true});
const env={...process.env,PGDATABASE:'sirona_workspace_p0_test_20261028'};delete env.DATABASE_URL;
const phase=process.argv[2]??'workspace';
let args;
if(phase==='workspace'){
 const names=fs.readdirSync(path.join(cwd,'tests')).filter(n=>n.endsWith('.test.ts')&&n!=='providerParity.test.ts');
 args=['--test','--test-reporter=tap','--test-concurrency=1','--test-timeout=45000',...names.map(n=>'dist-workspace/tests/'+n.replace('.ts','.js'))];
}else if(phase==='legacy'){
 const names=['admission','boundary','config','foundation','lifecycle','production','runner','runtimeConfig','cli','mail','providerText','execution','standaloneChat'];
 args=['--require',path.join(root,'.tmp/p5-js-test-guard.cjs'),'--test','--test-reporter=tap','--test-concurrency=1','--test-timeout=30000',...names.map(n=>'tests/'+n+'.test.js')];
}else throw new Error('Unknown free test group');
const r=spawnSync(process.execPath,args,{cwd,env,encoding:'utf8',timeout:420000,maxBuffer:12*1024*1024,windowsHide:true});
const text=(r.stdout||'')+(r.stderr||'');fs.writeFileSync(path.join(out,'free-'+phase+'-regression.txt'),text);
console.log(text.split(/\r?\n/).filter(s=>/^(# (tests|pass|fail|cancelled|skipped)|not ok|  error:)/.test(s)).join('\n'));console.log('Exit:',r.status,'Runner error:',r.error?.code??'none');process.exitCode=r.status??1;
