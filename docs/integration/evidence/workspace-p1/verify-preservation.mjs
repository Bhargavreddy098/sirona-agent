import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../../..');
const original=JSON.parse(await fs.readFile(path.join(here,'../workspace-p0/source-baseline.json'),'utf8'));
const approved=JSON.parse(await fs.readFile(path.join(here,'source-before.json'),'utf8'));
const permitted=new Set([...approved.files.map(file=>file.path),'AGENTS.md','docs/frontend/UI-FREEZE-CONTRACT.md','docs/integration/ROUTE-SURFACE-MATRIX.md','frontend/sirona-next/TASKS.md']);
const changed=[],unexpected=[];for(const item of original.files){let bytes;try{bytes=await fs.readFile(path.join(root,item.path));}catch(error){if(error.code!=='ENOENT')throw error;changed.push({path:item.path,missing:true});unexpected.push(item.path);continue;}const current=crypto.createHash('sha256').update(bytes).digest('hex');if(current!==item.sha256){changed.push({path:item.path,sha256:current});if(!permitted.has(item.path))unexpected.push(item.path);}}
const newFiles=['backend/tsconfig.workspace.json','backend/src/db/schema.ts','backend/src/db/transactionAdapter.ts','backend/src/execution/effectJournal.ts','backend/src/execution/runEventStore.ts','backend/src/security/executionPolicy.ts','backend/tests/executionReliability.test.ts','backend/tests/executionAuthorization.test.ts','backend/tests/typedDatabaseBoundary.test.ts','backend/migrations/022_execution_reliability.sql'];
const added=[];for(const file of newFiles){const bytes=await fs.readFile(path.join(root,file));added.push({path:file,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});}
const result={checkedAt:new Date().toISOString(),result:unexpected.length?'failed':'passed',sourceBaseline:'P0 original 243-file manifest with explicit P0 documentation + P1 protected allowlists',changed,added,unexpected,frontendSourceUnchanged:!changed.some(file=>file.path.startsWith('frontend/')&&!file.path.endsWith('/TASKS.md')),activeFrontendSourceUnchanged:!changed.some(file=>file.path.startsWith('frontend/sirona-next/')&&!file.path.endsWith('/TASKS.md')),rootPackageUnchanged:!changed.some(file=>file.path==='package.json')};
await fs.writeFile(path.join(here,'source-after.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({result:result.result,unexpected,frontendSourceUnchanged:result.frontendSourceUnchanged,rootPackageUnchanged:result.rootPackageUnchanged}));if(unexpected.length)process.exitCode=1;
