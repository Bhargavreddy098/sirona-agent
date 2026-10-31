const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=process.cwd(),dest=path.join(root,'.tmp/p5-repair-20261029');
fs.mkdirSync(dest,{recursive:true});
const files=[...fs.readdirSync('backend/src/orchestration').map(n=>'backend/src/orchestration/'+n),...fs.readdirSync('backend/tests').filter(n=>/^(graphCheckpoint|delegationPolicy|orchestrationRecovery|orchestrationWorkflow)\./.test(n)).map(n=>'backend/tests/'+n),'backend/services/executionService.js','backend/services/workflowOrchestratorService.js','backend/routes/v1/execution.routes.js','backend/foundation/production.js','backend/package.json','backend/package-lock.json','docs/SIRONA-AGENT-HANDOFF.md','docs/SIRONA-WORKSPACE-P5-REPORT.md','docs/SIRONA-WORKSPACE-LEDGER.md','docs/SIRONA-WORKSPACE-TECHNOLOGY-LEDGER.md'];
const manifest=[];
for(const file of files){if(!fs.existsSync(file))continue;const bytes=fs.readFileSync(file),target=path.join(dest,file);if(fs.existsSync(target))continue;fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);manifest.push({file,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});}
if(!fs.existsSync(path.join(dest,'manifest.json')))fs.writeFileSync(path.join(dest,'manifest.json'),JSON.stringify(manifest,null,2));
console.log('P5 rollback checkpoint preserved; '+manifest.length+' source/document files snapshotted.');
