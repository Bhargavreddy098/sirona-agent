import {_electron as electron} from 'playwright';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {pathToFileURL,fileURLToPath} from 'node:url';import assert from 'node:assert/strict';import crypto from 'node:crypto';
import {loadEnvironment} from '../../../backend/server.js';
import {readRuntimeConfig} from '../../../backend/foundation/runtimeConfig.js';
import pg from '../../../backend/node_modules/pg/lib/index.js';
import {SecretStore} from '../../../backend/services/secretStore.js';
import {createDatabaseOwner,activateDatabaseOwner} from '../../../backend/config/db.js';
import {ProviderService} from '../../../backend/services/providerService.js';
const frontend=fileURLToPath(new URL('../',import.meta.url)),backend=fileURLToPath(new URL('../../../backend/',import.meta.url));
const target='sirona_workspace_p0_test_20261028';loadEnvironment();
const env={...process.env,PGDATABASE:target,SIRONA_EXECUTION_RELIABILITY:'false'};delete env.ELECTRON_RUN_AS_NODE;
if(env.DATABASE_URL){const url=new URL(env.DATABASE_URL);url.pathname='/'+target;env.DATABASE_URL=url.toString();for(const key of ['PGHOST','PGPORT','PGDATABASE','PGUSER','PGPASSWORD'])delete env[key];}
const db=new pg.Client(readRuntimeConfig(env).database);await db.connect();assert.equal((await db.query('SELECT current_database() AS name')).rows[0].name,target);
// Inspect the working schema through a read-only connection. Never migrate or mutate it.
const liveEnv={...process.env};if(liveEnv.DATABASE_URL){const u=new URL(liveEnv.DATABASE_URL);u.pathname='/sirona';liveEnv.DATABASE_URL=u.toString();for(const k of ['PGHOST','PGPORT','PGDATABASE','PGUSER','PGPASSWORD'])delete liveEnv[k];}else liveEnv.PGDATABASE='sirona';
const live=new pg.Client({...readRuntimeConfig(liveEnv).database,options:'-c default_transaction_read_only=on'});await live.connect();let liveCredential;
try{assert.equal((await live.query('SELECT current_database() AS name')).rows[0].name,'sirona');
 const candidates=(await live.query('SELECT * FROM provider_connections WHERE is_active=true ORDER BY updated_at DESC LIMIT 10')).rows;
 for(const row of candidates){try{const key=SecretStore.decrypt(row.api_key_ciphertext);if(key){liveCredential={kind:row.kind,baseUrl:row.base_url,apiKey:key};break;}}catch{}}
}finally{await live.end();}
const readonlyOwner=createDatabaseOwner({...readRuntimeConfig(liveEnv).database,options:'-c default_transaction_read_only=on'},{event(){}});activateDatabaseOwner(readonlyOwner);await readonlyOwner.initialize();
let liveCompatibility;
try{const connections=await ProviderService.getProviderConnections();const models=await ProviderService.getModels();if(models.length)await ProviderService.getModelById(models[0].id);const migrations=(await readonlyOwner.pool.query('SELECT COUNT(*)::int AS n FROM schema_migrations')).rows[0].n;assert.equal(migrations,21);liveCompatibility={status:'pass',migrations,connectionListing:true,modelListing:true,exactModelLookup:true};}finally{await readonlyOwner.close();}
const profile=await fs.mkdtemp(path.join(os.tmpdir(),'sirona-p2-'));env.SIRONA_P2_TEST_PROFILE=profile;
const report={checks:[],result:'running',database:target,liveCompatibility};let application,page,connectionId;const canary='sirona-p2-canary-'+crypto.randomUUID();
const evidence=fileURLToPath(new URL('../../../docs/integration/evidence/workspace-p2/',import.meta.url));
async function launch(){application=await electron.launch({executablePath:path.join(frontend,'node_modules/electron/dist/electron.exe'),args:[path.join(frontend,'tests/credential-app.cjs')],cwd:frontend,env,timeout:30000});page=await application.firstWindow();await page.waitForLoadState('domcontentloaded');await page.evaluate(()=>window.sirona.bootstrap());}
async function main(fn,arg){return application.evaluate(fn,arg);}
try{
 await launch();
 const connection=await page.evaluate(input=>window.sirona.saveConnection(input),{kind:'openai',name:'P2 real desktop test',apiKey:canary});connectionId=connection.id;assert.match(connection.credentialRef,/^cred:v1:/);report.checks.push('Real preload -> sender-checked IPC -> authenticated provider API -> OS vault');
 let row=(await db.query('SELECT * FROM provider_connections WHERE id=$1',[connectionId])).rows[0];assert.equal(row.api_key_ciphertext,connection.credentialRef);assert.equal(row.credential_ref,connection.credentialRef);
 assert.ok(!JSON.stringify(connection).includes(canary));
 const vaultDir=path.join(profile,'SironaNext','credentials-v1');const files=await fs.readdir(vaultDir);for(const file of files)assert.ok(!(await fs.readFile(path.join(vaultDir,file))).includes(Buffer.from(canary)));report.checks.push('PostgreSQL stores references only; DTO and vault files contain no plaintext canary');
 const identity=execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-File',path.join(frontend,'tests/credential-identity.ps1')],{windowsHide:true,encoding:'utf8',env:{...process.env,PSModulePath:path.join(process.env.SystemRoot,'System32/WindowsPowerShell/v1.0/Modules'),SIRONA_IDENTITY_TEST_FILE:path.join(vaultDir,files[0])}});assert.match(identity,/cross-identity-file-and-dpapi-denied/);report.checks.push('Windows anonymous identity cannot read vault file or decrypt CurrentUser DPAPI data');
 const paths={resolver:pathToFileURL(path.join(backend,'dist-workspace/src/providers/credentialResolver.js')).href,service:pathToFileURL(path.join(backend,'services/providerService.js')).href,db:pathToFileURL(path.join(backend,'config/db.js')).href,legacy:pathToFileURL(path.join(backend,'services/secretStore.js')).href,broker:pathToFileURL(path.join(frontend,'dist-electron/electron/security/credentialBroker.js')).href};
 assert.equal(await main(async(_,{paths,id,canary})=>{const {CredentialResolver}=globalThis.__p2require(paths.resolver);const {query}=globalThis.__p2require(paths.db);return CredentialResolver.resolveCredential((await query('SELECT * FROM provider_connections WHERE id=$1',[id])).rows[0]).apiKey===canary;},{paths,id:connectionId,canary}),true);
 await application.close();application=null;await launch();
 assert.equal(await main(async(_,{paths,id,canary})=>{const {CredentialResolver}=globalThis.__p2require(paths.resolver);const {query}=globalThis.__p2require(paths.db);return CredentialResolver.resolveCredential((await query('SELECT * FROM provider_connections WHERE id=$1',[id])).rows[0]).apiKey===canary;},{paths,id:connectionId,canary}),true);report.checks.push('Actual Electron process restart decrypts persisted Windows DPAPI record');
 const migrated=await main(async(_,{paths,id})=>{
   const {query}=globalThis.__p2require(paths.db),{CredentialResolver}=globalThis.__p2require(paths.resolver),{SecretStore}=globalThis.__p2require(paths.legacy),{ProviderService}=globalThis.__p2require(paths.service);
   const owner=(await query('SELECT workspace_id FROM provider_connections WHERE id=$1',[id])).rows[0];const key='legacy-migration-synthetic-canary';let cid,sid;const mid='p2-history-'+globalThis.__p2require('node:crypto').randomUUID();
   try{cid=(await query("INSERT INTO provider_connections(workspace_id,kind,name,api_key_ciphertext)VALUES($1,'openai','P2 actual OS migration',$2)RETURNING id",[owner.workspace_id,SecretStore.encrypt(key)])).rows[0].id;
    await query("INSERT INTO models(id,provider_kind,name,provider_connection_id)VALUES($1,'openai',$1,$2)",[mid,cid]);
    sid=(await query("INSERT INTO sessions(workspace_id,chat_scope,title,model)VALUES($1,'standalone','P2 preserved history',$2)RETURNING id",[owner.workspace_id,mid])).rows[0].id;
    await query("INSERT INTO messages(session_id,role,content)VALUES($1,'user','P2 history canary')",[sid]);
    const result=await CredentialResolver.migrateConnection({query},cid);const resumed=await CredentialResolver.migrateConnection({query},cid);
    const row=(await query('SELECT * FROM provider_connections WHERE id=$1',[cid])).rows[0];const model=await ProviderService.getModelById(mid);
    const history=(await query('SELECT content FROM messages WHERE session_id=$1',[sid])).rows[0];
    return result.success&&resumed.credentialRef===result.credentialRef&&row.api_key_ciphertext===row.credential_ref&&CredentialResolver.resolveCredential(row).apiKey===key&&model.id===mid&&model.resolvedApiKey===key&&history.content==='P2 history canary';
   }finally{if(sid)await query('DELETE FROM sessions WHERE id=$1',[sid]);await query('DELETE FROM models WHERE id=$1',[mid]);if(cid)await query('DELETE FROM provider_connections WHERE id=$1',[cid]);}
 },{paths,id:connectionId});assert.equal(migrated,true);report.checks.push('Real legacy AES -> DPAPI migration verifies before CAS, resumes idempotently, and preserves exact model and conversation/message history');
 if(!liveCredential)throw new Error('REAL_PROVIDER_CREDENTIAL_UNAVAILABLE: authenticated provider criterion requires key re-entry');
 const authenticated=await main(async(_,{paths,credential,id})=>{const {ProviderService}=globalThis.__p2require(paths.service);const {query}=globalThis.__p2require(paths.db);const owner=(await query('SELECT workspace_id FROM provider_connections WHERE id=$1',[id])).rows[0];let connection;
 try{connection=await ProviderService.createProviderConnection({...credential,name:'P2 authenticated OS test',workspaceId:owner.workspace_id});const result=await ProviderService.testProviderConnection(connection.id);return{ok:result.ok===true,kind:credential.kind};}
 catch(error){return{ok:false,code:error.code||'PROVIDER_TEST_FAILED'};}
 finally{if(connection)await query('DELETE FROM provider_connections WHERE id=$1',[connection.id]);}
 },{paths,credential:liveCredential,id:connectionId});report.providerAuthentication=authenticated;assert.equal(authenticated.ok,true,'Real provider authentication through persisted OS reference must succeed');report.checks.push('Existing authenticated provider works through real DPAPI-backed test connection');
 liveCredential=undefined;
 const rotated=await page.evaluate(input=>window.sirona.saveConnection(input),{id:connectionId,kind:'openai',name:'P2 rotated test',apiKey:canary+'-rotated'});assert.notEqual(rotated.credentialRef,connection.credentialRef);report.checks.push('Rotation publishes a new immutable verified reference');
 await main(async(_,{paths})=>{globalThis.__p2require(paths.resolver).CredentialResolver.storeCredential('crash-unpublished-canary');},{paths});
 const child=application.process();assert.ok(child.pid);execFileSync('taskkill.exe',['/PID',String(child.pid),'/T','/F'],{stdio:'pipe',windowsHide:true});application=null;await launch();
 assert.equal(await main(async(_,{paths,id,key})=>{const {query}=globalThis.__p2require(paths.db);return globalThis.__p2require(paths.resolver).CredentialResolver.resolveCredential((await query('SELECT * FROM provider_connections WHERE id=$1',[id])).rows[0]).apiKey===key;},{paths,id:connectionId,key:canary+'-rotated'}),true);report.checks.push('Forced owned Electron process-tree termination after orphan publication preserves the bound credential on restart');
 const lifecycle=await main(async(_,{paths,id,profile})=>{const {ProviderService}=globalThis.__p2require(paths.service);const {DesktopCredentialBroker}=globalThis.__p2require(paths.broker);const {CredentialResolver}=globalThis.__p2require(paths.resolver);const {query}=globalThis.__p2require(paths.db);const workspaceId=(await query('SELECT workspace_id FROM provider_connections WHERE id=$1',[id])).rows[0].workspace_id;
 const temporary=await ProviderService.createProviderConnection({workspaceId,kind:'openai',name:'P2 revoke test',apiKey:'revocation-canary'});let revoked=false;
 try{await ProviderService.updateProviderConnection(temporary.id,{isActive:false});try{await ProviderService.testProviderConnection(temporary.id);}catch(error){revoked=error.code==='CREDENTIAL_REAUTH_REQUIRED';}}finally{await ProviderService.deleteProviderConnection(temporary.id);}
 const broker=new DesktopCredentialBroker(globalThis.__p2require('node:path').join(profile,'delete-test'));const ref=broker.put('deletion-canary');broker.remove(ref);let erased=false;try{broker.get(ref);}catch{erased=true;}
 return revoked&&erased&&await ProviderService.getConnectionById(temporary.id)===null;
 },{paths,id:connectionId,profile});assert.equal(lifecycle,true);report.checks.push('Revoked connection cannot authenticate; connection deletion and explicit OS-record deletion work');
 const security=await main(async(_,{paths,id,profile})=>{
   const {CredentialResolver}=globalThis.__p2require(paths.resolver);const {query}=globalThis.__p2require(paths.db);const {DesktopCredentialBroker}=globalThis.__p2require(paths.broker);const fs=globalThis.__p2require('node:fs');const path=globalThis.__p2require('node:path');
   const row=(await query('SELECT * FROM provider_connections WHERE id=$1',[id])).rows[0];
   const unavailable=new DesktopCredentialBroker(path.join(profile,'unavailable'),{isEncryptionAvailable:()=>false,encryptString:()=>{throw Error();},decryptString:()=>{throw Error();}});let denied=false;try{unavailable.put('canary');}catch{denied=true;}
   const file=path.join(profile,'SironaNext','credentials-v1',row.credential_ref.slice(8)+'.dpapi');fs.writeFileSync(file,Buffer.from('corrupted-ciphertext'));
   const result=CredentialResolver.resolveCredential(row);return{unavailableDenied:denied,corruptDenied:result.status==='requires_reauth'&&result.apiKey===null};
 },{paths,id:connectionId,profile});assert.deepEqual(security,{unavailableDenied:true,corruptDenied:true});report.checks.push('Unavailable OS service and corrupt DPAPI payload fail closed');
 const access=await page.evaluate(async id=>{const s=await window.sirona.bootstrap();const absent=await fetch('/api/v1/provider-connections/'+id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:'{}'});const cross=await fetch('/api/v1/provider-connections',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':s.csrfToken},body:JSON.stringify({kind:'openai',workspaceId:crypto.randomUUID()})});return{csrf:absent.status,cross:cross.status};},connectionId);assert.deepEqual(access,{csrf:403,cross:403});report.checks.push('Real HTTP write CSRF and cross-workspace rejection');
 // Crash-safe publication: a durable orphan after a lost DB acknowledgement cannot replace the bound key.
 const interrupted=await main(async(_,{paths,id})=>{const {CredentialResolver}=globalThis.__p2require(paths.resolver);const {query}=globalThis.__p2require(paths.db);const before=(await query('SELECT * FROM provider_connections WHERE id=$1',[id])).rows[0];CredentialResolver.storeCredential('unpublished-canary');const after=(await query('SELECT * FROM provider_connections WHERE id=$1',[id])).rows[0];return before.credential_ref===after.credential_ref;},{paths,id:connectionId});assert.equal(interrupted,true);report.checks.push('Unpublished OS record leaves existing PostgreSQL binding unchanged');
 report.result='pass';
}catch(error){report.result='fail';report.failure=String(error.message).replaceAll(canary,'[CANARY]');process.exitCode=1;}
finally{if(application)await application.close().catch(()=>{});if(connectionId)await db.query('DELETE FROM provider_connections WHERE id=$1',[connectionId]);await db.end();const relative=path.relative(os.tmpdir(),profile);if(relative.startsWith('..')||!path.basename(profile).startsWith('sirona-p2-'))throw Error('Unsafe cleanup');await fs.rm(profile,{recursive:true,force:true});await fs.writeFile(path.join(evidence,'real-desktop-e2e.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));}
