import EventEmitter from 'node:events';
import type {Duplex} from 'node:stream';
import {StringDecoder} from 'node:string_decoder';
import {DockerRuntime,DockerRuntimeError} from './dockerRuntime.js';
export interface TerminalSessionOptions{sessionId:string;runId:string;containerId:string;cols?:number;rows?:number;idleTimeoutMs?:number;maxOutputBytes?:number}
/** Transport session only. Creation by product APIs requires durable authorization/qualification. */
export class TerminalSession extends EventEmitter{
 private socket:Duplex|null=null;private execId='';private timer:NodeJS.Timeout|null=null;private closed=false;private closePromise:Promise<void>|undefined;private bytes=0;private decoder=new StringDecoder('utf8');
 public readonly sessionId:string;public readonly runId:string;public readonly containerId:string;
 constructor(private readonly options:TerminalSessionOptions){super();this.sessionId=options.sessionId;this.runId=options.runId;this.containerId=options.containerId;
  if(!Number.isInteger(options.idleTimeoutMs??300000)||(options.idleTimeoutMs??300000)<100||(options.idleTimeoutMs??300000)>300000)throw new DockerRuntimeError('INVALID_TERMINAL_TIMEOUT',400);
 }
 private activity(){if(this.timer)clearTimeout(this.timer);this.timer=setTimeout(()=>{void this.close().catch(error=>this.emit('error',error));},this.options.idleTimeoutMs??300000);}
 public async start(){if(this.closed||this.socket)throw new DockerRuntimeError('TERMINAL_STATE_INVALID',409);
  const info=(await DockerRuntime.listManagedContainers()).find(c=>c.containerId===this.containerId);if(!info||info.runId!==this.runId)throw new DockerRuntimeError('TERMINAL_SCOPE_MISMATCH',403);
  const {socket,execId}=await DockerRuntime.openPty(this.containerId,this.options.cols??80,this.options.rows??24);this.socket=socket;this.execId=execId;this.activity();
  socket.on('data',(chunk:Buffer)=>{this.bytes+=chunk.length;if(this.bytes>(this.options.maxOutputBytes??1048576)){void this.close().catch(error=>this.emit('error',error));this.emit('limit');return;}this.emit('data',this.decoder.write(chunk));});
  socket.on('error',()=>{void this.close().catch(error=>this.emit('error',error));});socket.on('close',()=>{if(!this.closed)void this.close().catch(error=>this.emit('error',error));});
 }
 public write(data:string){if(this.closed||!this.socket?.writable)throw new DockerRuntimeError('TERMINAL_CLOSED',409);if(typeof data!=='string'||Buffer.byteLength(data)>65536)throw new DockerRuntimeError('TERMINAL_INPUT_LIMIT',413);this.activity();return this.socket.write(data);}
 public async resize(cols:number,rows:number){if(this.closed||!this.execId)throw new DockerRuntimeError('TERMINAL_CLOSED',409);await DockerRuntime.resizePty(this.containerId,this.execId,cols,rows);this.emit('resize',{cols,rows});}
 public close(){return this.closePromise??=this.closeOwned();}
 private async closeOwned(){this.closed=true;if(this.timer)clearTimeout(this.timer);this.socket?.destroy();try{await DockerRuntime.stopContainer(this.containerId);this.emit('close',0);}catch(error){this.emit('close',null);throw error;}}
}
export class TerminalService{
 // Live sockets are ephemeral handles, not durable authorization or recovery state.
 private static sessions=new Map<string,TerminalSession>();
 public static async createSession(_options:TerminalSessionOptions):Promise<TerminalSession>{throw new DockerRuntimeError('GUEST_NOT_QUALIFIED',503,'Canonical terminal creation requires qualified containment and durable session authority');}
 public static getSession(id:string){return this.sessions.get(id);}
 public static async closeSession(id:string){const session=this.sessions.get(id);if(session){await session.close();this.sessions.delete(id);}}
 public static async closeAllForRun(id:string){for(const [key,session] of this.sessions)if(session.runId===id){await session.close();this.sessions.delete(key);}}
}
