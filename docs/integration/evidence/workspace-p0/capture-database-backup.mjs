// Read-only pg_dump; encrypt in memory with Windows CurrentUser DPAPI.
// Never writes a plaintext database archive or prints database configuration.
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {loadEnvironment} from '../../../../backend/server.js';
import {readRuntimeConfig} from '../../../../backend/foundation/runtimeConfig.js';
loadEnvironment();
const config=readRuntimeConfig(process.env).database;
const url=config.connectionString?new URL(config.connectionString):null;
const dbName=url?decodeURIComponent(url.pathname.slice(1)):config.database;
if(dbName!=='sirona')throw new Error('Backup target must be the current sirona database');
const pgEnv={...process.env,PGHOST:url?url.hostname:config.host,PGPORT:String(url?.port||config.port||5432),PGDATABASE:dbName,PGUSER:url?decodeURIComponent(url.username):config.user,PGPASSWORD:url?decodeURIComponent(url.password):config.password,PGCONNECT_TIMEOUT:'10',PGSSLMODE:config.ssl?'verify-full':'disable'};
const destination=new URL('./private/sirona.pgdump.dpapi',import.meta.url);
try{await fs.access(destination);throw new Error('Refusing to overwrite the original backup');}catch(error){if(error.code!=='ENOENT')throw error;}
const dump=execFileSync('C:/Program Files/PostgreSQL/17/bin/pg_dump.exe',['--format=custom','--no-owner','--no-privileges'],{env:pgEnv,maxBuffer:128*1024*1024,timeout:120000,windowsHide:true,stdio:['ignore','pipe','pipe']});
const psEnv={SystemRoot:process.env.SystemRoot,WINDIR:process.env.WINDIR,TEMP:process.env.TEMP,TMP:process.env.TMP,USERPROFILE:process.env.USERPROFILE};
function dpapi(bytes,method){return execFileSync('C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe',['-NoProfile','-NonInteractive','-Command',`$ErrorActionPreference='Stop'; Add-Type -AssemblyName System.Security; $archiveMemory=New-Object IO.MemoryStream; [Console]::OpenStandardInput().CopyTo($archiveMemory); $archiveBytes=$archiveMemory.ToArray(); $protectedBytes=[Security.Cryptography.ProtectedData]::${method}($archiveBytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser); [Console]::OpenStandardOutput().Write($protectedBytes,0,$protectedBytes.Length);`],{input:bytes,env:psEnv,maxBuffer:128*1024*1024,timeout:30000,windowsHide:true,stdio:['pipe','pipe','pipe']});}
const encrypted=dpapi(dump,'Protect');
await fs.writeFile(destination,encrypted,{flag:'wx'});
const decrypted=dpapi(await fs.readFile(destination),'Unprotect');
if(!crypto.timingSafeEqual(crypto.createHash('sha256').update(dump).digest(),crypto.createHash('sha256').update(decrypted).digest()))throw new Error('Encrypted backup round-trip failed');
const listing=execFileSync('C:/Program Files/PostgreSQL/17/bin/pg_restore.exe',['--list'],{input:decrypted,maxBuffer:16*1024*1024,timeout:30000,windowsHide:true,stdio:['pipe','pipe','pipe']}).toString('utf8');
const report={capturedAt:new Date().toISOString(),result:'passed',operation:'pg_dump --format=custom --no-owner --no-privileges; no database writes',archive:'private/sirona.pgdump.dpapi',encryption:'Windows DPAPI CurrentUser; decrypt on the same Windows account/machine',encryptedSha256:crypto.createHash('sha256').update(encrypted).digest('hex'),encryptedBytes:encrypted.length,decryptionRoundTripVerified:true,pgRestoreCatalogReadable:true,archiveEntryCount:listing.split(/\r?\n/).filter(line=>line&&!line.startsWith(';')).length,actualRestorePerformed:false,limits:'A readable archive is not a tested disaster recovery restore. Protect the Windows account; no plaintext archive was written. No backup of operator environment secrets.'};
dump.fill(0);decrypted.fill(0);delete pgEnv.PGPASSWORD;
await fs.writeFile(new URL('./database-backup.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
