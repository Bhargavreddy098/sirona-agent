import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';

// Preparation only; never invokes Docker, installs packages or executes downloaded code.
// Building/selecting the resulting candidate is separately gated by the owner.
const here=path.dirname(fileURLToPath(import.meta.url)),workspace=path.resolve(here,'../../..');
const artifacts=JSON.parse(await fs.readFile(path.join(here,'tools-runtime/artifacts.json'),'utf8'));
const apks=JSON.parse(await fs.readFile(path.join(here,'tools-runtime/apk-lock.json'),'utf8'));
const cache=path.join(workspace,'.tmp/workspace-p6-20261030/artifacts'),target=path.join(workspace,'.tmp/workspace-p6-20261030/tools-build');
if(!target.startsWith(workspace+path.sep)||!cache.startsWith(workspace+path.sep))throw Error('BUILD_CONTEXT_SCOPE_INVALID');
const download=process.argv.length===3&&process.argv[2]==='--download';
if(process.argv.length>2&&!download)throw Error('Use no arguments for cached verification, or --download for pinned public artifacts.');
const sha256=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
async function readArtifact(item,subdirectory=''){
 if(!/^[A-Za-z0-9_.+-]+$/.test(item.filename)||!/^[a-f0-9]{64}$/.test(item.sha256))throw Error('ARTIFACT_LOCK_INVALID');
 const file=path.join(cache,subdirectory,item.filename);let bytes;
 try{bytes=await fs.readFile(file);}catch(error){if(error.code!=='ENOENT'||!download)throw Error('PINNED_ARTIFACT_MISSING: '+item.filename);
  const url=new URL(item.url);if(url.protocol!=='https:'||!['github.com','dl-cdn.alpinelinux.org'].includes(url.hostname))throw Error('ARTIFACT_ORIGIN_DENIED');
  const response=await fetch(url,{signal:AbortSignal.timeout(60000)});if(!response.ok)throw Error('ARTIFACT_DOWNLOAD_FAILED');const chunks=[];let total=0;
  for await(const chunk of response.body){total+=chunk.length;if(total>64*1024*1024)throw Error('ARTIFACT_DOWNLOAD_LIMIT');chunks.push(Buffer.from(chunk));}bytes=Buffer.concat(chunks);
  if(sha256(bytes)!==item.sha256)throw Error('ARTIFACT_DIGEST_CHANGED');await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,bytes,{flag:'wx'});
 }
 if(sha256(bytes)!==item.sha256)throw Error('ARTIFACT_DIGEST_CHANGED: '+item.filename);return bytes;
}
function validateSourceTar(compressed){const bytes=zlib.gunzipSync(compressed,{maxOutputLength:64*1024*1024});for(let offset=0;offset+512<=bytes.length;){
 const header=bytes.subarray(offset,offset+512);if(header.every(value=>value===0))return;
 const name=header.subarray(0,100).toString().replace(/\0.*$/,''),prefix=header.subarray(345,500).toString().replace(/\0.*$/,''),entry=prefix?prefix+'/'+name:name,type=String.fromCharCode(header[156]),size=parseInt(header.subarray(124,136).toString().replace(/\0.*$/,'').trim(),8);
 if(!Number.isSafeInteger(size)||size<0||offset+512+size>bytes.length||entry.startsWith('/')||entry.includes('\\')||entry.split('/').includes('..')||!['0','5','\0'].includes(type))throw Error('SOURCE_ARCHIVE_UNSAFE');offset+=512+Math.ceil(size/512)*512;
 }throw Error('SOURCE_ARCHIVE_TRUNCATED');}
// Verify every input before creating a context. An existing context is never overwritten.
const verified=[];for(const item of artifacts.downloads){const bytes=await readArtifact(item);if(item.filename==='sql-v0.3.11.tar.gz')validateSourceTar(bytes);verified.push({file:item.filename,bytes});}
for(const item of apks.packages)verified.push({file:'apks/'+item.filename,bytes:await readArtifact(item,'apks')});
for(const [source,file] of [['tools-worker.Dockerfile','Dockerfile'],['tools-runtime/package.json','package.json'],['tools-runtime/package-lock.json','package-lock.json'],['tools-runtime/server.mjs','server.mjs']])verified.push({file,bytes:await fs.readFile(path.join(here,source))});
await fs.mkdir(target);for(const input of verified){await fs.mkdir(path.dirname(path.join(target,input.file)),{recursive:true});await fs.writeFile(path.join(target,input.file),input.bytes,{flag:'wx'});}
const manifest={timestamp:new Date().toISOString(),candidateOnly:true,imageBuilt:false,files:verified.map(input=>({file:input.file,sha256:sha256(input.bytes)}))};
await fs.writeFile(path.join(target,'context-inputs.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({context:target,files:verified.length,imageBuilt:false}));
