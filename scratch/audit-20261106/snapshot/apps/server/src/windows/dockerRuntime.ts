import {spawn,spawnSync} from 'node:child_process';
import crypto from 'node:crypto';
import http from 'node:http';
import {Transform,type Duplex} from 'node:stream';
export interface DockerHealth{available:boolean;version?:string;os?:string;cgroupVersion?:number;seccompEnabled?:boolean;reason?:string}
export interface CreateContainerOptions{runId:string;taskId:string;owner:string;image?:string;memoryLimit?:string;cpuLimit?:string;pidsLimit?:number;diskLimitMb?:number;customEnv?:Record<string,string>}
export interface ExecResult{exitCode:number;stdout:string;stderr:string;durationMs:number}
export interface ExecOptions{timeoutMs?:number;maxOutputBytes?:number;env?:Record<string,string>;stdin?:Buffer|string;workingDir?:string;signal?:AbortSignal}
export interface ManagedContainerInfo{containerId:string;runId:string;taskId:string;owner:string;status:string;created:string;manager?:string}
export class DockerRuntimeError extends Error{constructor(public code:string,public status:number=503,message=code){super(message);this.name='DockerRuntimeError';}}
const pipe='\\\\.\\pipe\\dockerDesktopLinuxEngine';
const endpoint='npipe:////./pipe/dockerDesktopLinuxEngine';
const manager=crypto.randomUUID();
// Ephemeral handles only, not durable execution authority. No implicit adoption after a restart.
const handles=new Map<string,ManagedContainerInfo>();
function fail(code:string,status=503):never{throw new DockerRuntimeError(code,status);}
const integer=(value:number,min:number,max:number)=>{if(!Number.isSafeInteger(value)||value<min||value>max)fail('INVALID_RESOURCE_LIMIT',400);return value;};
function cli(args:string[],timeout=10000){
 const result=spawnSync('docker',['--host',endpoint,...args],{encoding:'utf8',timeout,windowsHide:true,maxBuffer:1024*1024});
 if(result.status!==0||result.error)fail('DOCKER_OPERATION_FAILED');return result.stdout.trim();
}
async function api(method:string,url:string,body?:unknown):Promise<{status:number;body:any}>{
 const data=body===undefined?'':JSON.stringify(body);
 return new Promise((resolve,reject)=>{const req=http.request({socketPath:pipe,path:'/v1.54'+url,method,headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(data)}},res=>{
  const chunks:Buffer[]=[];let bytes=0;res.on('data',chunk=>{bytes+=chunk.length;if(bytes>1024*1024)req.destroy(new Error('ENGINE_RESPONSE_LIMIT'));else chunks.push(chunk);});
  res.on('error',()=>reject(new DockerRuntimeError('DOCKER_OPERATION_FAILED')));res.on('end',()=>{try{const text=Buffer.concat(chunks).toString('utf8');resolve({status:res.statusCode||0,body:text?JSON.parse(text):null});}catch{reject(new DockerRuntimeError('DOCKER_RESPONSE_INVALID'));}});
 });req.setTimeout(10000,()=>req.destroy(new Error('ENGINE_TIMEOUT')));req.on('error',()=>reject(new DockerRuntimeError('DOCKER_OPERATION_FAILED')));req.end(data);});
}
export class DockerRuntime{
 public static readonly DEFAULT_IMAGE='sha256:7c9a2b1782ecac683ad7cad209114702d5440f10005d5da74ef6060e739cdd39';
 public static readonly DEFAULT_USER='10001:10001';public static readonly DEFAULT_MEMORY='2g';public static readonly DEFAULT_CPUS='2';public static readonly DEFAULT_PIDS=100;public static readonly DEFAULT_WORKSPACE_MB=256;
 public static sanitizeEnvironment(env:Record<string,string>={}){
  const result:Record<string,string>={PATH:'/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',LANG:'C.UTF-8',HOME:'/tmp'};
  for(const [key,value] of Object.entries(env)){
   // Positive, deliberately small allowlist. Values cannot forward host secrets under arbitrary names.
   if((key==='TERM'&&value==='xterm-256color')||(['CI','NO_COLOR'].includes(key)&&['true','false','1','0'].includes(value))||(['COLUMNS','LINES'].includes(key)&&/^[1-9][0-9]{0,2}$/.test(value)))result[key]=value;
  }return result;
 }
 public static async checkHealth():Promise<DockerHealth>{try{const info=JSON.parse(cli(['info','--format','{{json .}}'],5000));return{available:info.OSType==='linux'&&String(info.CgroupVersion)==='2'&&info.SecurityOptions?.some((s:string)=>s.includes('seccomp')),version:info.ServerVersion,os:info.OperatingSystem,cgroupVersion:Number(info.CgroupVersion),seccompEnabled:info.SecurityOptions?.some((s:string)=>s.includes('seccomp'))};}catch{return{available:false,reason:'LOCAL_DOCKER_UNAVAILABLE'};}}
 public static async resolveQualifiedImage(preferredImage?:string){
  if(preferredImage&&preferredImage!==this.DEFAULT_IMAGE)fail('IMAGE_NOT_QUALIFIED');
  const id=cli(['image','inspect',this.DEFAULT_IMAGE,'--format','{{.Id}}']);if(id!==this.DEFAULT_IMAGE)fail('IMAGE_DIGEST_MISMATCH');return id;
 }
 private static async owned(id:string,profile=false){
  const handle=handles.get(id);if(!handle||!/^[a-f0-9]{64}$/.test(id))fail('CONTAINER_OWNERSHIP_REQUIRED',403);
  const inspected=await api('GET','/containers/'+id+'/json');if(inspected.status!==200)fail('CONTAINER_STATE_UNKNOWN');
  const config=inspected.body;
  if(config.Config?.Labels?.['sirona.manager']!==(handle.manager||manager)||config.Config?.Labels?.['sirona.run_id']!==handle.runId||config.Config?.Labels?.['sirona.task_id']!==handle.taskId||config.Config?.Labels?.['sirona.owner']!==handle.owner||config.Image!==this.DEFAULT_IMAGE)fail('CONTAINER_IDENTITY_MISMATCH',403);
  if(profile){const h=config.HostConfig;if(!h.ReadonlyRootfs||h.Privileged||h.NetworkMode!=='none'||h.Memory!==2147483648||h.MemorySwap!==2147483648||h.PidsLimit<16||h.PidsLimit>128||config.Config.User!==this.DEFAULT_USER||!h.CapDrop?.includes('ALL')||!h.SecurityOpt?.includes('no-new-privileges')||config.Mounts?.some((mount:any)=>mount.Type==='bind')||Object.keys(config.NetworkSettings?.Networks||{}).some(key=>key!=='none'))fail('CONTAINER_PROFILE_CHANGED',403);}
  return config;
 }
 public static async createContainer(options:CreateContainerOptions){
  if(!/^[a-f0-9-]{36}$/.test(options.runId)||!/^[a-f0-9-]{36}$/.test(options.taskId)||!options.owner||options.owner.length>100)fail('INVALID_CONTAINER_SCOPE',400);
  if(options.memoryLimit&&options.memoryLimit!==this.DEFAULT_MEMORY||options.cpuLimit&&!['1','2','1.0','2.0'].includes(options.cpuLimit))fail('INVALID_RESOURCE_LIMIT',400);
  const workspace=integer(options.diskLimitMb??256,1,256),pids=integer(options.pidsLimit??100,16,128);
  const image=await this.resolveQualifiedImage(options.image);const env=Object.entries(this.sanitizeEnvironment(options.customEnv)).flatMap(([k,v])=>['--env',k+'='+v]);
  const id=cli(['create','--pull=never','--name','sirona-'+crypto.randomUUID(),'--label','sirona.managed=true','--label','sirona.manager='+manager,'--label','sirona.run_id='+options.runId,'--label','sirona.task_id='+options.taskId,'--label','sirona.owner='+options.owner,'--read-only','--security-opt=no-new-privileges','--cap-drop=ALL','--network=none','--ipc=none','--user',this.DEFAULT_USER,'--memory','2g','--memory-swap','2g','--cpus',options.cpuLimit||'2','--pids-limit',String(pids),'--log-driver=none','--tmpfs','/tmp:rw,noexec,nosuid,nodev,size=64m,uid=10001,gid=10001','--tmpfs',`/workspace:rw,nosuid,nodev,size=${workspace}m,uid=10001,gid=10001`,'-w','/workspace',...env,image,'sleep','3600']);
  if(!/^[a-f0-9]{64}$/.test(id))fail('INVALID_CONTAINER_ID');handles.set(id,{containerId:id,runId:options.runId,taskId:options.taskId,owner:options.owner,manager,status:'created',created:new Date().toISOString()});return id;
 }
 public static async startContainer(id:string){await this.owned(id,true);const res=await api('POST','/containers/'+id+'/start');if(![204,304].includes(res.status))fail('CONTAINER_START_FAILED');}
 public static async stopContainer(id:string,_timeout=2){await this.owned(id);const res=await api('POST','/containers/'+id+'/kill?signal=KILL');if(![204,409].includes(res.status))fail('CONTAINER_TERMINATION_UNCONFIRMED');const state=await this.owned(id);if(state.State?.Running)fail('CONTAINER_TERMINATION_UNCONFIRMED');}
 public static async removeContainer(id:string){if(!handles.has(id))fail('CONTAINER_OWNERSHIP_REQUIRED',403);const state=await api('GET','/containers/'+id+'/json');if(state.status===404){handles.delete(id);return;}await this.owned(id);const res=await api('DELETE','/containers/'+id+'?force=true&v=true');if(![204,404].includes(res.status))fail('CONTAINER_REMOVAL_UNCONFIRMED');const after=await api('GET','/containers/'+id+'/json');if(after.status!==404)fail('CONTAINER_REMOVAL_UNCONFIRMED');handles.delete(id);}
 public static async exec(id:string,command:string[],options:ExecOptions={}):Promise<ExecResult>{
  await this.owned(id,true);
  if(!Array.isArray(command)||command.length===0||command.length>100||command.some(x=>typeof x!=='string'||x.includes('\0')||x.length>16384))fail('INVALID_COMMAND',400);
  if(options.workingDir&&options.workingDir!=='/workspace')fail('INVALID_WORKING_DIRECTORY',400);
  const timeout=integer(options.timeoutMs??30000,10,600000),limit=integer(options.maxOutputBytes??1048576,1,1048576);
  if(options.signal?.aborted)fail('EXECUTION_CANCELLED',499);
  const start=Date.now();const args=['--host',endpoint,'exec','-i','-w','/workspace',...Object.entries(this.sanitizeEnvironment(options.env)).flatMap(([k,v])=>['-e',k+'='+v]),id,...command];
  return new Promise((resolve,reject)=>{
   const child=spawn('docker',args,{windowsHide:true,stdio:['pipe','pipe','pipe']});let finished=false,bytes=0;const stdout:Buffer[]=[],stderr:Buffer[]=[];
   const abort=()=>{void terminate('EXECUTION_CANCELLED',499);};
   const clear=()=>{clearTimeout(timer);options.signal?.removeEventListener('abort',abort);};
   const terminate=async(code:string,status:number)=>{if(finished)return;finished=true;clear();try{await this.stopContainer(id);child.kill();reject(new DockerRuntimeError(code,status));}catch{child.kill();reject(new DockerRuntimeError('CONTAINMENT_UNCONFIRMED',503));}};
   const timer=setTimeout(()=>void terminate('EXECUTION_TIMEOUT',408),timeout);options.signal?.addEventListener('abort',abort,{once:true});
   const collect=(list:Buffer[],chunk:Buffer)=>{if(finished)return;bytes+=chunk.length;if(bytes>limit){void terminate('OUTPUT_LIMIT_EXCEEDED',413);return;}list.push(Buffer.from(chunk));};
   child.stdout.on('data',c=>collect(stdout,c));child.stderr.on('data',c=>collect(stderr,c));child.stdin.on('error',()=>{});
   child.on('error',()=>{void terminate('EXECUTION_FAILED',500);});child.on('close',(code,signal)=>{if(finished)return;finished=true;clear();if(code===null||signal)return reject(new DockerRuntimeError('EXECUTION_OUTCOME_UNKNOWN',503));resolve({exitCode:code,stdout:Buffer.concat(stdout).toString('utf8'),stderr:Buffer.concat(stderr).toString('utf8'),durationMs:Date.now()-start});});child.stdin.end(options.stdin);
  });
 }
 public static async writeArchive(id:string,data:Buffer,target='/workspace'){if(target!=='/workspace'||data.length>104857600)fail('ARCHIVE_LIMIT_EXCEEDED',413);const {WorkspaceBroker}=await import('../workspace/workspaceBroker.js');WorkspaceBroker.parseTarToSnapshot(data);const r=await this.exec(id,['tar','-xf','-','-C','/workspace'],{stdin:data,timeoutMs:30000});if(r.exitCode)fail('ARCHIVE_WRITE_FAILED');}
 public static async readArchive(id:string,source='/workspace'):Promise<Buffer>{
  if(source!=='/workspace')fail('INVALID_ARCHIVE_SOURCE',400);await this.owned(id,true);
  return new Promise((resolve,reject)=>{const chunks:Buffer[]=[];let bytes=0,finished=false;
   const child=spawn('docker',['--host',endpoint,'exec',id,'tar','-cf','-','-C','/workspace','.'],{windowsHide:true,stdio:['ignore','pipe','pipe']});
   const end=async(code:string)=>{if(finished)return;finished=true;clearTimeout(timer);try{await this.stopContainer(id);}catch{code='CONTAINMENT_UNCONFIRMED';}child.kill();reject(new DockerRuntimeError(code,503));};
   const timer=setTimeout(()=>void end('ARCHIVE_TIMEOUT'),30000);
   child.stdout.on('data',(chunk:Buffer)=>{bytes+=chunk.length;if(bytes>104857600){void end('ARCHIVE_LIMIT_EXCEEDED');return;}if(!finished)chunks.push(Buffer.from(chunk));});child.stderr.on('data',(chunk:Buffer)=>{bytes+=chunk.length;if(bytes>104857600)void end('ARCHIVE_LIMIT_EXCEEDED');});
   child.on('error',()=>void end('ARCHIVE_READ_FAILED'));child.on('close',code=>{if(finished)return;finished=true;clearTimeout(timer);if(code!==0)reject(new DockerRuntimeError('ARCHIVE_READ_FAILED',503));else resolve(Buffer.concat(chunks));});
  });
 }
 public static binding(id:string){const value=handles.get(id);if(!value)fail('CONTAINER_OWNERSHIP_REQUIRED',403);return{...value};}
 public static async recoverBinding(binding:ManagedContainerInfo){if(!binding||!/^[a-f0-9]{64}$/.test(binding.containerId)||!binding.manager||!/^[a-f0-9-]{36}$/.test(binding.manager))fail('RECOVERY_BINDING_INVALID',400);handles.set(binding.containerId,binding);try{await this.removeContainer(binding.containerId);}catch(error){handles.delete(binding.containerId);throw error;}}
 public static async listManagedContainers():Promise<ManagedContainerInfo[]>{const result:ManagedContainerInfo[]=[];for(const [id,handle] of handles){const row=await api('GET','/containers/'+id+'/json');if(row.status===404)continue;if(row.status!==200)fail('CONTAINER_STATE_UNKNOWN');result.push({...handle,status:row.body.State.Status});}return result;}
 public static async cleanupOrphans(activeRunIds:string[],candidateIds?:string[]){if(!candidateIds)fail('EXPLICIT_CLEANUP_SCOPE_REQUIRED',403);let count=0;for(const id of candidateIds){const handle=handles.get(id);if(!handle)fail('CONTAINER_OWNERSHIP_REQUIRED',403);if(!activeRunIds.includes(handle.runId)){await this.removeContainer(id);count++;}}return count;}
 /** Non-TTY protocol streams for fixed P6 guest programs. No host server or caller-selected command. */
 public static async openProtocol(id:string,kind:'mcp'|'lsp',signal?:AbortSignal){
  await this.owned(id,true);if(kind!=='mcp'&&kind!=='lsp')fail('PROTOCOL_KIND_INVALID',400);if(signal?.aborted)fail('EXECUTION_CANCELLED',499);
  const command=kind==='mcp'?['node','/opt/sirona/mcp/server.mjs']:['node','/opt/sirona/node_modules/typescript-language-server/lib/cli.mjs','--stdio'];
  const child=spawn('docker',['--host',endpoint,'exec','-i','-w','/workspace',id,...command],{windowsHide:true,stdio:['pipe','pipe','pipe']});
  let closure:Promise<void>|undefined,bytes=0;const exited=new Promise<void>(resolve=>child.once('close',()=>resolve()));
  const terminate=()=>closure??=(async()=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);await this.stopContainer(id);child.kill();await Promise.race([exited,new Promise<never>((_,reject)=>{const wait=setTimeout(()=>reject(new DockerRuntimeError('PROTOCOL_CLI_TERMINATION_UNCONFIRMED')),2000);exited.then(()=>clearTimeout(wait));})]);})();
  const failClosed=()=>{void terminate().catch(()=>{child.stdout.destroy();child.stderr.destroy();});},abort=()=>failClosed();
  const timer=setTimeout(failClosed,120000);signal?.addEventListener('abort',abort,{once:true});
  // Pipe through buffered bounded streams: attaching data listeners to the child here
  // would discard early protocol bytes before the SDK attaches its consumer.
  const bounded=()=>new Transform({transform(chunk:Buffer,_encoding,callback){bytes+=chunk.length;if(bytes>1048576){failClosed();callback(new DockerRuntimeError('PROTOCOL_OUTPUT_LIMIT'));}else callback(null,chunk);}});
  const stdout=bounded(),stderr=bounded();stdout.on('error',failClosed);stderr.on('error',failClosed);
  child.stdout.pipe(stdout);child.stderr.pipe(stderr);child.stdout.once('error',failClosed);child.stderr.once('error',failClosed);child.stdin.on('error',failClosed);
  child.once('error',failClosed);child.once('close',()=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);});if(signal?.aborted)abort();
  return{stdout,stdin:child.stdin,stderr,terminate};
 }
 public static async openPty(id:string,cols:number,rows:number):Promise<{socket:Duplex;execId:string}>{
  await this.owned(id,true);integer(cols,1,500);integer(rows,1,300);
  const created=await api('POST','/containers/'+id+'/exec',{AttachStdin:true,AttachStdout:true,AttachStderr:true,Tty:true,User:this.DEFAULT_USER,WorkingDir:'/workspace',Env:['TERM=xterm-256color'],Cmd:['/bin/sh']});
  const execId=created.body?.Id;if(created.status!==201||!/^[a-f0-9]{64}$/.test(execId))fail('PTY_CREATE_FAILED');
  const socket=await new Promise<Duplex>((resolve,reject)=>{const data=JSON.stringify({Detach:false,Tty:true});const req=http.request({socketPath:pipe,path:'/v1.54/exec/'+execId+'/start',method:'POST',headers:{Connection:'Upgrade',Upgrade:'tcp','Content-Type':'application/json','Content-Length':Buffer.byteLength(data)}});
   req.setTimeout(10000,()=>req.destroy(new Error('PTY_TIMEOUT')));req.on('upgrade',(_res,socket,head)=>{socket.setTimeout(0);if(head.length)socket.unshift(head);resolve(socket);});req.on('response',res=>{res.resume();reject(new DockerRuntimeError('PTY_ATTACH_FAILED',503));});req.on('error',()=>reject(new DockerRuntimeError('PTY_ATTACH_FAILED',503)));req.end(data);});
  await this.resizePty(id,execId,cols,rows);return{socket,execId};
 }
 public static async resizePty(id:string,execId:string,cols:number,rows:number){await this.owned(id);integer(cols,1,500);integer(rows,1,300);if(!/^[a-f0-9]{64}$/.test(execId))fail('INVALID_PTY',400);const inspected=await api('GET','/exec/'+execId+'/json');if(inspected.status!==200||inspected.body.ContainerID!==id)fail('PTY_OWNERSHIP_REQUIRED',403);const r=await api('POST',`/exec/${execId}/resize?h=${rows}&w=${cols}`);if(r.status!==201&&r.status!==200)fail('PTY_RESIZE_FAILED');}
}
