import type {Readable,Writable} from 'node:stream';
import type {Transport} from '@modelcontextprotocol/sdk/shared/transport.js';
import {JSONRPCMessageSchema,type JSONRPCMessage} from '@modelcontextprotocol/sdk/types.js';
import {P6Error} from './toolContracts.js';

/** Channels are supplied only by the trusted guest owner. This transport never spawns. */
export interface GuestProtocolChannel {stdout:Readable;stdin:Writable;stderr:Readable;terminate:()=>Promise<void>}
export class BoundedGuestTransport implements Transport {
  onmessage?:Transport['onmessage'];onclose?:()=>void;onerror?:(error:Error)=>void;
  private started=false;private closed=false;private bytes=0;private buffer=Buffer.alloc(0);private timer?:NodeJS.Timeout;private guard?:NodeJS.Timeout;private closure?:Promise<void>;
  constructor(private readonly channel:GuestProtocolChannel,private readonly authorize:()=>Promise<void>,private readonly limits={messageBytes:262144,totalBytes:1048576,deadlineMs:30000}){
    if(!Number.isInteger(limits.messageBytes)||limits.messageBytes<1||limits.messageBytes>262144||!Number.isInteger(limits.totalBytes)||limits.totalBytes<1||limits.totalBytes>1048576||!Number.isInteger(limits.deadlineMs)||limits.deadlineMs<1||limits.deadlineMs>120000)throw new P6Error('PROTOCOL_LIMIT_INVALID',400);
  }
  async start(){if(this.started||this.closed)throw new P6Error('PROTOCOL_STATE_INVALID');await this.authorize();if(this.closed)throw new P6Error('PROTOCOL_CLOSED');this.started=true;
    const fail=(code:string)=>{this.onerror?.(new P6Error(code,503));void this.close().catch(()=>this.onerror?.(new P6Error('GUEST_TERMINATION_UNCONFIRMED',503)));};
    this.channel.stdout.on('data',this.receive);this.channel.stderr.on('data',this.stderr);this.channel.stdout.once('end',this.end);this.channel.stdout.once('error',this.error);this.channel.stdin.once('error',this.error);this.channel.stderr.once('error',this.error);
    this.timer=setTimeout(()=>fail('PROTOCOL_TIMEOUT'),this.limits.deadlineMs);
    let checking=false;this.guard=setInterval(()=>{if(checking||this.closed)return;checking=true;void this.authorize().catch(()=>{if(!this.closed)fail('PROTOCOL_AUTHORITY_REVOKED');}).finally(()=>{checking=false;});},1000);
  }
  private account(chunk:Buffer){this.bytes+=chunk.length;if(this.bytes>this.limits.totalBytes)throw new P6Error('PROTOCOL_OUTPUT_LIMIT',413);}
  private receive=(data:Buffer)=>{try{const chunk=Buffer.from(data);this.account(chunk);this.buffer=Buffer.concat([this.buffer,chunk]);let newline:number;
    while((newline=this.buffer.indexOf(10))>=0){if(newline>this.limits.messageBytes)throw new P6Error('PROTOCOL_MESSAGE_LIMIT',413);const line=this.buffer.subarray(0,newline);this.buffer=this.buffer.subarray(newline+1);if(!line.length)continue;this.onmessage?.(JSONRPCMessageSchema.parse(JSON.parse(line.toString('utf8'))));}
    if(this.buffer.length>this.limits.messageBytes)throw new P6Error('PROTOCOL_MESSAGE_LIMIT',413);
  }catch{this.error();}};
  private stderr=(data:Buffer)=>{try{this.account(Buffer.from(data));}catch{this.error();}};
  private end=()=>{if(!this.closed){if(this.buffer.length)this.onerror?.(new P6Error('PROTOCOL_TRUNCATED',503));void this.close().catch(()=>this.onerror?.(new P6Error('GUEST_TERMINATION_UNCONFIRMED',503)));}};
  private error=()=>{this.onerror?.(new P6Error('PROTOCOL_INVALID',503));void this.close().catch(()=>this.onerror?.(new P6Error('GUEST_TERMINATION_UNCONFIRMED',503)));};
  async send(message:JSONRPCMessage){if(!this.started||this.closed)throw new P6Error('PROTOCOL_CLOSED');await this.authorize();if(this.closed)throw new P6Error('PROTOCOL_CLOSED');const line=Buffer.from(JSON.stringify(JSONRPCMessageSchema.parse(message))+'\n');if(line.length>this.limits.messageBytes)throw new P6Error('PROTOCOL_MESSAGE_LIMIT',413);await new Promise<void>((resolve,reject)=>this.channel.stdin.write(line,error=>error?reject(new P6Error('PROTOCOL_WRITE_UNKNOWN',503)):resolve()));}
  async close(){if(this.closure)return this.closure;this.closed=true;clearTimeout(this.timer);clearInterval(this.guard);this.channel.stdout.off('data',this.receive);this.channel.stderr.off('data',this.stderr);this.channel.stdout.off('end',this.end);
    // Termination can race an outstanding write. Retain harmless error sinks on
    // these owned channels so a late stream error cannot crash the control plane.
    for(const stream of [this.channel.stdout,this.channel.stdin,this.channel.stderr]){stream.on('error',()=>{});stream.off('error',this.error);}
    this.buffer=Buffer.alloc(0);this.closure=Promise.resolve().then(()=>this.channel.terminate()).finally(()=>this.onclose?.());return this.closure;}
}
