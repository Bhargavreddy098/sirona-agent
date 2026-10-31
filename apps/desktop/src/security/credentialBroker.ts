import {createRequire} from 'node:module';
import {mkdirSync,lstatSync,readFileSync,openSync,writeSync,fsyncSync,closeSync,unlinkSync} from 'node:fs';
import {join,resolve,parse} from 'node:path';
import {randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import type {IpcMainInvokeEvent} from 'electron';
type Storage = {isEncryptionAvailable():boolean;encryptString(value:string):Buffer;decryptString(value:Buffer):string};
const require=createRequire(import.meta.url);
const refPattern=/^cred:v1:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
function failure(code:string):never{throw Object.assign(new Error(code),{code});}
/** Main-process only. Each immutable reference names a DPAPI-protected record outside PostgreSQL. */
export class DesktopCredentialBroker {
  constructor(private readonly directory:string,private readonly storage:Storage=require('electron').safeStorage){
    if(process.platform!=='win32')failure('WINDOWS_CREDENTIAL_STORE_REQUIRED');
    const target=resolve(directory);if(target===parse(target).root)failure('INVALID_CREDENTIAL_DIRECTORY');
    mkdirSync(target,{recursive:true});
    let current=target;while(current!==parse(current).root){if(lstatSync(current).isSymbolicLink())failure('CREDENTIAL_REPARSE_POINT');current=resolve(current,'..');}
    const sid=execFileSync('whoami.exe',['/user','/fo','csv','/nh'],{encoding:'utf8',windowsHide:true}).match(/S-1-5-[0-9-]+/)?.[0];
    if(!sid)failure('CREDENTIAL_IDENTITY_UNAVAILABLE');
    // Directory is dedicated to this broker; remove inherited grants, allow this identity and SYSTEM.
    execFileSync('icacls.exe',[target,'/inheritance:r','/grant:r',`*${sid}:(OI)(CI)F`,'*S-1-5-18:(OI)(CI)F'],{stdio:'pipe',windowsHide:true});
    const check = "$ErrorActionPreference='Stop'; $a=[IO.Directory]::GetAccessControl($env:SIRONA_VAULT_ACL_PATH); $sid=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value; if(-not $a.AreAccessRulesProtected){exit 2}; foreach($r in $a.Access){if($r.AccessControlType -eq 'Allow' -and $r.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value -notin @($sid,'S-1-5-18')){exit 3}}";
    execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(check,'utf16le').toString('base64')],{stdio:'pipe',windowsHide:true,env:{...process.env,SIRONA_VAULT_ACL_PATH:target}});
    this.directory=target;
  }
  static verifySender(event:IpcMainInvokeEvent,trustedOrigin:string,mainWindow?:{webContents:unknown}):boolean{
    if(!event?.sender||!mainWindow||event.sender!==mainWindow.webContents)return false;
    const contents=mainWindow.webContents as {mainFrame:unknown};
    if(!event.senderFrame||event.senderFrame!==contents.mainFrame)return false;
    try{return new URL(event.senderFrame.url).origin===trustedOrigin;}catch{return false;}
  }
  static isAvailable():boolean{try{return process.platform==='win32'&&Boolean(require('electron').safeStorage.isEncryptionAvailable());}catch{return false;}}
  static encrypt(value:string):string{if(typeof value!=='string')throw new TypeError('Plaintext credential must be a string');if(!value)return '';failure('CREDENTIAL_VAULT_INSTANCE_REQUIRED');}
  static decrypt(value:string):string{if(!value)return '';failure('INVALID_OS_ENVELOPE');}
  private file(ref:string):string{if(!refPattern.test(ref))failure('INVALID_CREDENTIAL_REFERENCE');return join(this.directory,ref.slice(8)+'.dpapi');}
  private available(){if(!this.storage.isEncryptionAvailable())failure('OS_SAFE_STORAGE_UNAVAILABLE');}
  put(secret:string):string{
    this.available();if(typeof secret!=='string'||!secret.trim()||secret.length>16000)failure('INVALID_CREDENTIAL');
    const ref=`cred:v1:${randomUUID()}`;const payload=JSON.stringify({version:1,ref,secret});
    const ciphertext=this.storage.encryptString(payload);if(this.storage.decryptString(ciphertext)!==payload)failure('CREDENTIAL_ROUNDTRIP_FAILED');
    const file=this.file(ref);const fd=openSync(file,'wx',0o600);
    try{writeSync(fd,ciphertext);fsyncSync(fd);}finally{closeSync(fd);}
    if(this.get(ref)!==secret)failure('CREDENTIAL_ROUNDTRIP_FAILED');
    return ref;
  }
  get(ref:string):string{
    this.available();const file=this.file(ref);
    try{const stat=lstatSync(file);if(stat.isSymbolicLink()||!stat.isFile()||stat.size>65536)failure('INVALID_CREDENTIAL_RECORD');
      const value=JSON.parse(this.storage.decryptString(readFileSync(file)));
      if(value.version!==1||value.ref!==ref||typeof value.secret!=='string'||!value.secret)failure('INVALID_CREDENTIAL_RECORD');return value.secret;
    }catch{failure('CREDENTIAL_UNAVAILABLE');}
  }
  remove(ref:string){const file=this.file(ref);if(lstatSync(file).isSymbolicLink())failure('CREDENTIAL_REPARSE_POINT');unlinkSync(file);}
}
