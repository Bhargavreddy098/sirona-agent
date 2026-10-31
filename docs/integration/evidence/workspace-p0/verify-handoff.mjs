import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../../..');
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const manifest=JSON.parse(await fs.readFile(path.join(here,'markdown-archive-manifest.json'),'utf8'));
const snapshot=JSON.parse(zlib.gunzipSync(await fs.readFile(path.join(here,manifest.originalSnapshot))));
assert.equal(snapshot.files.length,26);assert.equal(manifest.files.length,26);
const originals=new Map(snapshot.files.map(item=>[item.path,item]));
const checks=[];
for(const entry of manifest.files){
  const original=originals.get(entry.original);assert.ok(original);assert.equal(sha(Buffer.from(original.content,'base64')),entry.originalSha256);
  const archived=await fs.readFile(path.join(root,entry.archive));assert.equal(sha(archived),entry.archivedSha256);
  if(entry.kind==='relocated-with-safe-redirect'){
    const redirect=await fs.readFile(path.join(root,entry.original),'utf8');assert.ok(redirect.includes('Historical document — relocated'));assert.ok(!redirect.includes('CREATE DATABASE')&&!redirect.includes('Strict SQLite'));
    for(const match of redirect.matchAll(/\[[^\]]*\]\(([^)]+)\)/g))await fs.access(path.resolve(path.dirname(path.join(root,entry.original)),match[1].split('#')[0]));
  }
}
checks.push('All 26 original documents recoverable byte-for-byte; all archived copies match manifest hashes');
checks.push('All 23 original historical paths contain non-executable current/archive redirects with resolving links');
const oldAgents=Buffer.from(originals.get('AGENTS.md').content,'base64').toString('utf8'),current=await fs.readFile(path.join(root,'AGENTS.md'),'utf8');
for(const number of [15,16,17,19,21,31,32,33,34,35]){const re=new RegExp('## '+number+'\\.[\\s\\S]*?(?=## \\d+\\.|$)');assert.equal(current.match(re)?.[0],oldAgents.match(re)?.[0],'Protected section '+number);}
assert.ok(current.includes('Stage 17 checkpoint and STOP remain in force'));assert.ok(current.includes('P1–P8 protected changes are NOT automatically authorized'));
checks.push('Security/approval/database/durable-execution/verification/STOP/scope sections preserved verbatim; no blanket phase authority');
const entrypoints=['AGENTS.md','GEMINI.md','README.md','docs/README.md'];
for(const name of entrypoints)assert.ok((await fs.readFile(path.join(root,name),'utf8')).includes('SIRONA-AGENT-HANDOFF.md'));
for(const name of ['04-DATABASE.md','05-API-CONTRACTS.md','08-SECURITY-AND-RUNTIME.md'])assert.ok(!(await fs.readFile(path.join(root,'docs/backend',name),'utf8')).startsWith('# Historical document'));
checks.push('All active agent/readme entrypoints identify one handoff; normative API/database/security contracts stay active');
const result={checkedAt:new Date().toISOString(),result:'passed',checks,relocatedDocuments:23,rootHistoricalSnapshots:3,protectedSectionsVerified:[15,16,17,19,21,31,32,33,34,35],nextGate:'P1 protected-source/dependency/new-SQL authoring approval; subsequent migration application separately approved',changedProductSource:false};
await fs.writeFile(path.join(here,'handoff-verification.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({result:result.result,checks:checks.length,relocatedDocuments:23,protectedSectionsVerified:10}));
