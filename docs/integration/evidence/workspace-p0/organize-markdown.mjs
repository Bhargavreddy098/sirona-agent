// Owner-authorized documentation organization. No product files, SQL or packages.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../../..');
const archiveBase='docs/archive/pre-workspace-2026-10-28';
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function safe(relative){const absolute=path.resolve(root,relative);if(!absolute.startsWith(root+path.sep))throw new Error('Path outside workspace');return absolute;}
const backendFiles=(await fs.readdir(safe('docs/backend'))).filter(name=>/^(?:11|1[4-9]|2[0-6])-.*\.md$/.test(name)).map(name=>'docs/backend/'+name);
const historical=[...backendFiles,'.planning/PROJECT.md','.planning/ROADMAP.md','.planning/STATE.md','docs/frontend/STAGE03-05-INTEGRATION.md','docs/frontend/BOARDUI-INTEGRATION.md','docs/frontend/ROUTE-INTEGRATION-AUDIT.md','docs/superpowers/plans/2026-10-27-autonomous-ai-engineering-workspace.md','docs/superpowers/plans/2026-10-23-frontend-stages-01-06.md','docs/superpowers/specs/2026-10-23-frontend-stages-01-06-design.md'];
const rootSnapshots=['AGENTS.md','GEMINI.md','README.md'];
const originals=[];for(const relative of [...historical,...rootSnapshots]){const file=safe(relative);if((await fs.lstat(file)).isSymbolicLink())throw new Error('Refusing symbolic-link source');const bytes=await fs.readFile(file);originals.push({path:relative,sha256:hash(bytes),content:bytes.toString('base64')});}
await fs.writeFile(path.join(here,'private/markdown-originals.json.gz'),zlib.gzipSync(Buffer.from(JSON.stringify({format:'sirona-markdown-originals-v1',files:originals}))),{flag:'wx'});
const mapping=new Map(historical.map(relative=>[safe(relative),safe(archiveBase+'/'+relative)]));
for(const relative of rootSnapshots)mapping.set(safe(relative),safe(archiveBase+'/'+relative.replace('.md','-HISTORICAL.md')));
function adjustLinks(text,originalPath,destination){return text.replace(/(\[[^\]]*\]\()([^\s)]+)(\))/g,(match,start,target,end)=>{if(/^(?:[a-z][a-z0-9+.-]*:|#|\/)/i.test(target))return match;const split=target.indexOf('#');const fragment=split<0?'':target.slice(split),name=split<0?target:target.slice(0,split);const actual=path.resolve(path.dirname(originalPath),name);const finalTarget=mapping.get(actual)||actual;return start+path.relative(path.dirname(destination),finalTarget).split(path.sep).join('/')+fragment+end;});}
function anchors(text){const seen=new Map();return [...text.matchAll(/^#{1,6}\s+(.+)$/gm)].map(match=>{const key=match[1].trim().toLowerCase().replace(/[`*_~]/g,'').replace(/[^\p{L}\p{N}_\- ]/gu,'').replace(/ /g,'-');const count=seen.get(key)||0;seen.set(key,count+1);return key+(count?'-'+count:'');}).filter(Boolean).map(id=>`<a id="${id}"></a>`).join('\n');}
const manifest=[];
for(const item of originals){const original=safe(item.path),destination=mapping.get(original);await fs.mkdir(path.dirname(destination),{recursive:true});try{await fs.access(destination);throw new Error('Archive destination exists; refusing overwrite');}catch(error){if(error.code!=='ENOENT')throw error;}
  const text=Buffer.from(item.content,'base64').toString('utf8');
  const archived='> HISTORICAL REFERENCE ONLY — not a current task, permission or qualification.\n> Start at [the current agent handoff]('+path.relative(path.dirname(destination),safe('docs/integration/SIRONA-AGENT-HANDOFF.md')).split(path.sep).join('/')+').\n> Original source: `'+item.path+'`; original SHA-256: `'+item.sha256+'`.\n> Relative links adjusted for archival location; exact original bytes retained in the ignored P0 markdown snapshot.\n\n'+adjustLinks(text,original,destination);
  await fs.writeFile(destination,archived,{flag:'wx'});
  if(historical.includes(item.path)){
    const link=path.relative(path.dirname(original),destination).split(path.sep).join('/');
    const current=path.relative(path.dirname(original),safe('docs/integration/SIRONA-AGENT-HANDOFF.md')).split(path.sep).join('/');
    await fs.writeFile(original,'# Historical document — relocated\n\nThis old plan/status is not a current task, approval or qualification.\nRead [current Sirona agent handoff]('+current+') before implementation.\nThe complete [historical record]('+link+') is retained for evidence only.\n\n<!-- Compatibility anchors for old links; historical instructions live in the archive. -->\n'+anchors(text)+'\n');
  }
  manifest.push({original:item.path,archive:path.relative(root,destination).split(path.sep).join('/'),originalSha256:item.sha256,archivedSha256:hash(Buffer.from(archived)),kind:historical.includes(item.path)?'relocated-with-safe-redirect':'snapshot-before-active-entrypoint-update'});
}
await fs.mkdir(safe(archiveBase),{recursive:true});
await fs.writeFile(safe(archiveBase+'/README.md'),'# Historical Sirona documentation — do not execute\n\nThese records preserve earlier task scopes, source observations and alternative plans.\nThey do not authorize implementation, override Stage 17/security rules, or prove current\nproduction qualification. Start at [the current handoff](../../integration/SIRONA-AGENT-HANDOFF.md).\n\nNormative database/API/security contracts remain in docs/backend; historical assignments\ninside them are subordinate to explicit current owner scope. Nothing here revives a\nPython/SQLite backend or a second frontend. Original paths retain safe redirects and\nlegacy heading anchors. AGENTS-HISTORICAL.md and GEMINI-HISTORICAL.md are deliberately\nnot named AGENTS.md or GEMINI.md, so this archive does not install automatic agent rules.\n\n'+manifest.map(item=>'- ['+item.original+']('+path.relative(safe(archiveBase),safe(item.archive)).split(path.sep).join('/')+')').join('\n')+'\n');
await fs.writeFile(path.join(here,'markdown-archive-manifest.json'),JSON.stringify({organizedAt:new Date().toISOString(),authorization:'Owner requested confusing Markdown moved to another folder for future agents; no permission gates changed',archiveBase,originalSnapshot:'private/markdown-originals.json.gz',files:manifest},null,2));
console.log(JSON.stringify({archived:manifest.length,relocated:historical.length,rootSnapshots:rootSnapshots.length,productFilesChanged:0}));
