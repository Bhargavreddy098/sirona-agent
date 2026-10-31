// Phase 0 evidence utility. No product code, database writes, or environment output.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../../../..');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const exclusions=new Set(['node_modules','dist','build','.git','.local','release','release-client']);
const allowed=/\.(?:[cm]?js|[cm]?tsx?|json|sql|css|html|md|ps1|ya?ml|toml|woff2|txt)$/i;
async function collect(relative){
  const result=[];for(const item of await fs.readdir(path.join(root,relative),{withFileTypes:true})){
    if(exclusions.has(item.name)||item.name.startsWith('.env')||item.name.endsWith('.tsbuildinfo'))continue;
    const name=path.posix.join(relative,item.name);
    if(item.isSymbolicLink())throw new Error('Source snapshot refuses symbolic links: '+name);
    if(item.isDirectory()){if(name==='frontend/sirona-next/design/evidence')continue;result.push(...await collect(name));}
    else if(allowed.test(item.name)){const bytes=await fs.readFile(path.join(root,name));result.push({path:name,sha256:hash(bytes),size:bytes.length,bytes});}
  }return result;
}
const files=(await Promise.all(['backend','frontend/sirona-next','frontend/sirona','tooling/sirona'].map(collect))).flat();
for(const name of ['AGENTS.md','package.json','.gitignore','docs/frontend/UI-FREEZE-CONTRACT.md','docs/integration/ROUTE-SURFACE-MATRIX.md']){
  const bytes=await fs.readFile(path.join(root,name));files.push({path:name,sha256:hash(bytes),size:bytes.length,bytes});
}
files.sort((a,b)=>a.path.localeCompare(b.path));
if(process.argv.includes('--verify')){
  const baseline=JSON.parse(await fs.readFile(path.join(here,'source-baseline.json'),'utf8'));
  const permitted=new Set(['AGENTS.md','docs/frontend/UI-FREEZE-CONTRACT.md','docs/integration/ROUTE-SURFACE-MATRIX.md','frontend/sirona-next/TASKS.md']);
  const current=new Map(files.map(item=>[item.path,item]));
  const changed=baseline.files.filter(item=>current.get(item.path)?.sha256!==item.sha256);
  const unexpected=changed.filter(item=>!permitted.has(item.path));
  const extra=files.filter(item=>!baseline.files.some(old=>old.path===item.path));
  const report={checkedAt:new Date().toISOString(),result:unexpected.length||extra.length?'failed':'passed',fileCount:baseline.files.length,permittedDocumentationChanges:changed.filter(item=>permitted.has(item.path)).map(item=>item.path),unexpectedChanges:unexpected.map(item=>item.path),unexpectedNewFiles:extra.map(item=>item.path)};
  await fs.writeFile(path.join(here,'preservation-check.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));if(report.result!=='passed')process.exitCode=1;
}else{
  const output=path.join(here,'source-baseline.json');
  try{await fs.access(output);throw new Error('Refusing to overwrite the original baseline');}catch(error){if(error.code!=='ENOENT')throw error;}
  const revision=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
  const status=execFileSync('git',['status','--porcelain=v1'],{cwd:root,encoding:'utf8'});
  const manifest={capturedAt:new Date().toISOString(),revision,branch:execFileSync('git',['branch','--show-current'],{cwd:root,encoding:'utf8'}).trim(),dirtyEntries:status.trim().split(/\r?\n/).filter(Boolean).length,scope:'Current on-disk source, including untracked source; excludes secrets, dependencies, build outputs and prior screenshot evidence',files:files.map(({bytes,...metadata})=>metadata)};
  await fs.writeFile(output,JSON.stringify(manifest,null,2));
  const archive=zlib.gzipSync(Buffer.from(JSON.stringify({format:'sirona-source-snapshot-v1',files:files.map(({bytes,...metadata})=>({...metadata,content:bytes.toString('base64')}))})));
  const restored=JSON.parse(zlib.gunzipSync(archive));for(const file of restored.files)if(hash(Buffer.from(file.content,'base64'))!==file.sha256)throw new Error('Source snapshot verification failed');
  await fs.writeFile(path.join(here,'private/source-snapshot.json.gz'),archive,{flag:'wx'});
  await fs.writeFile(path.join(here,'rollback-source.json'),JSON.stringify({format:'sirona-source-snapshot-v1',archive:'private/source-snapshot.json.gz',sha256:hash(archive),fileCount:files.length,roundTripVerified:true,containsEnvironmentFiles:false,restorePolicy:'Inspect manifest, select exact approved paths, verify current changes, never bulk overwrite the checkout'},null,2));
  const routes=[];for(const file of files.filter(item=>item.path.startsWith('backend/routes/'))){const lines=file.bytes.toString('utf8').split(/\r?\n/);lines.forEach((line,index)=>{const match=/\b(?:router|app)\.(get|post|patch|put|delete|head|options|use)\(\s*["'`]([^"'`]+)["'`]/.exec(line);if(match)routes.push({method:match[1].toUpperCase(),path:match[2],file:file.path,line:index+1});});}
  await fs.writeFile(path.join(here,'route-inventory.json'),JSON.stringify({scope:'Static literal registrations; mounted-prefix interpretation requires routes/index.js and owning router. This is not live endpoint qualification.',routes},null,2));
  const references=[];for(const name of ['desktop-live.json','desktop-recovery.json','desktop-settings.json','desktop-native-chat.json','visual-qa.json','11-native-chat-compact.png','visual-desktop.png','visual-mobile.png','visual-settings.png']){
    const relative='frontend/sirona-next/design/evidence/'+name;const bytes=await fs.readFile(path.join(root,relative));references.push({path:relative,sha256:hash(bytes),size:bytes.length,provenance:'Pre-existing evidence; not rerun by Phase 0 and not originally bound to the newly captured source hashes'});
  }
  await fs.writeFile(path.join(here,'prior-evidence-index.json'),JSON.stringify(references,null,2));
  console.log(JSON.stringify({result:'captured',fileCount:files.length,revision,routes:routes.length,sourceRollbackRoundTrip:true}));
}
