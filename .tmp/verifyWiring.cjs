const {spawnSync}=require('node:child_process');const fs=require('node:fs');const path=require('node:path');
const root=process.cwd(),backend=path.join(root,'backend'),evidence=path.join(root,'docs/integration/evidence/frontend-p1-p5');fs.mkdirSync(evidence,{recursive:true});
const env={...process.env,PGDATABASE:'sirona_workspace_p0_test_20261028',SIRONA_ORCHESTRATION_ENABLED:'false'};delete env.DATABASE_URL;
const result=spawnSync(process.execPath,['--test','--test-reporter=tap','--test-concurrency=1','--test-timeout=120000','dist-workspace/tests/frontendWorkspaceBoundary.test.js'],{cwd:backend,env,encoding:'utf8',timeout:250000,maxBuffer:4*1024*1024,windowsHide:true});
fs.writeFileSync(path.join(evidence,'backend-wiring.txt'),(result.stdout??'')+(result.stderr??''));console.log((result.stdout??'')+(result.stderr??''));process.exitCode=result.status??1;
