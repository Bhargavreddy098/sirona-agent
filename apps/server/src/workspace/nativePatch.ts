import fs from 'node:fs';import crypto from 'node:crypto';import path from 'node:path';import {fileURLToPath} from 'node:url';import {execFileSync} from 'node:child_process';
import type {WorkspacePatch} from './workspaceBroker.js';
import {WorkspaceBroker,WorkspaceBrokerError} from './workspaceBroker.js';
const helper=fileURLToPath(new URL('../../../../tooling/sirona/native/windows-broker/patch.ps1',import.meta.url));
/** Fixed Windows helper. Caller must first persist an approved journal and hold the scoped project lock. */
export function applyNativePatch(root:string,patch:WorkspacePatch){
 if(process.platform!=='win32')throw new WorkspaceBrokerError('WINDOWS_HELPER_REQUIRED',503,'Windows native broker required');
 const files=[...patch.added.map(x=>({path:x.path,kind:'add',oldHash:'',content:x.content.toString('base64')})),...patch.modified.map(x=>({path:x.path,kind:'modify',oldHash:x.oldSha256,content:x.content.toString('base64')})),...patch.deleted.map(x=>({path:x.path,kind:'delete',oldHash:x.oldSha256,content:''}))];
 if(files.length>128)throw new WorkspaceBrokerError('PATCH_LIMIT',413,'Patch entry limit');
 const installed=fileURLToPath(new URL('../../../../',import.meta.url)).toLowerCase();
 for(const f of files){WorkspaceBroker.sanitizeRelativePath(f.path);if(path.resolve(root,f.path).toLowerCase().startsWith(installed))throw new WorkspaceBrokerError('PROTECTED_PATH',403,'Running Sirona installation cannot patch itself');if(/^\.env(?:\.|$)/i.test(path.basename(f.path))||f.path.split('/').some(x=>['.git','.ssh','.aws','.docker','.sirona','.npmrc'].includes(x)))throw new WorkspaceBrokerError('PROTECTED_PATH',403,'Protected patch target');}
 const request=JSON.stringify({root:path.resolve(root),files,ownerPid:process.pid});if(Buffer.byteLength(request)>16*1024*1024)throw new WorkspaceBrokerError('PATCH_LIMIT',413,'Patch size limit');
 const code=fs.readFileSync(helper);if(crypto.createHash('sha256').update(code).digest('hex')!==PATCH_HELPER_DIGEST)throw new WorkspaceBrokerError('HELPER_INTEGRITY_FAILED',503,'Broker helper mismatch');
 try{const result=execFileSync(path.join(process.env.SystemRoot||'C:/Windows','System32/WindowsPowerShell/v1.0/powershell.exe'),['-NoProfile','-NonInteractive','-File',helper],{input:request,encoding:'utf8',windowsHide:true,timeout:30000,maxBuffer:65536,env:{SystemRoot:process.env.SystemRoot,PATH:process.env.PATH,TEMP:process.env.TEMP,TMP:process.env.TMP,USERPROFILE:process.env.USERPROFILE,PSModulePath:path.join(process.env.SystemRoot||'C:/Windows','System32/WindowsPowerShell/v1.0/Modules')}});return JSON.parse(result) as {status:'completed'|'unknown';applied:number;code?:string};}catch{return{status:'unknown' as const,applied:0,code:'PATCH_RECONCILIATION_REQUIRED'};}
}
const PATCH_HELPER_DIGEST='c4cc4695b5180d7d54999d710c9f7010c9c2fc2eea949a36ebbed25e2a7fc6c7';
