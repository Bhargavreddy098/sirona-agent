import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {z} from 'zod-v4';
import type {GuestProtocolChannel} from './guestTransport.js';
import {P6Error,publicSourcePath} from './toolContracts.js';
const require=createRequire(import.meta.url);
const position=z.object({line:z.number().int().min(0).max(1000000),character:z.number().int().min(0).max(1000000)});
const range=z.object({start:position,end:position});
const symbol:z.ZodType<any>=z.lazy(()=>z.object({name:z.string().max(512),detail:z.string().max(4096).optional(),kind:z.number().int().min(1).max(26),range,selectionRange:range,children:z.array(symbol).max(2000).optional()}));
const info=z.object({name:z.string().max(512),kind:z.number().int().min(1).max(26),location:z.object({uri:z.string().max(2048),range}),containerName:z.string().max(512).optional()});
function bounded(value:unknown){if(Buffer.byteLength(JSON.stringify(value))>1048576)throw new P6Error('LSP_RESULT_LIMIT',413);const pending:[unknown,number][]=[[value,0]];let nodes=0;while(pending.length){const [item,depth]=pending.pop()!;if(++nodes>20000||depth>32)throw new P6Error('LSP_RESULT_LIMIT',413);if(item&&typeof item==='object')for(const child of Object.values(item))pending.push([child,depth+1]);}}
export class LspAdapter {
  static async symbols(options:{channel:GuestProtocolChannel;file:string;text:string;languageId:'javascript'|'typescript';authorize:()=>Promise<void>;signal?:AbortSignal}){
    if(!publicSourcePath(options.file)||Buffer.byteLength(options.text)>1048576)throw new P6Error('LSP_SOURCE_INVALID',400);
    const uri='file:///workspace/'+options.file.split('/').map(encodeURIComponent).join('/');const backend=path.dirname(require.resolve('../../../package.json'));
    // Reuse the qualified existing client, including scoped URI filtering and denied applyEdit/configuration.
    const {LanguageClient}=await import(pathToFileURL(path.join(backend,'../tooling/sirona/dist/lsp.js')).href);
    const client=new LanguageClient(options.channel.stdout,options.channel.stdin,{rootUri:'file:///workspace',documentUris:new Set([uri])},10000);
    let diagnostics:unknown[]|null=null,closed=false,invalid=false,terminationFailed=false;const abort=()=>{client.dispose();void options.channel.terminate().catch(()=>{terminationFailed=true;});};
    const signal=AbortSignal.any([AbortSignal.timeout(30000),...(options.signal?[options.signal]:[])]);signal.addEventListener('abort',abort,{once:true});
    const remove=client.onDiagnostics((target:string,items:unknown[])=>{if(target===uri){try{bounded(items);diagnostics=z.array(z.object({range,message:z.string().max(8192),severity:z.number().int().min(1).max(4).optional()})).max(2000).parse(items);}catch{invalid=true;abort();}}});
    try{await options.authorize();if(signal.aborted)throw new P6Error('LSP_CANCELLED',499);const initialized=await client.initialize();if(!initialized.capabilities.documentSymbolProvider)throw new P6Error('LSP_CAPABILITY_UNAVAILABLE',503);await client.open(uri,options.languageId,options.text);const raw=await client.symbols(uri);bounded(raw);const symbols=z.array(z.union([symbol,info])).max(2000).parse(raw??[]);for(const value of symbols)if('location'in value&&value.location.uri!==uri)throw new P6Error('LSP_SCOPE_MISMATCH',403);await options.authorize();if(signal.aborted)throw new P6Error('LSP_CANCELLED',499);return{uri,symbols,diagnostics,diagnosticsState:diagnostics===null?'not_received':'observed'};
    }finally{remove();signal.removeEventListener('abort',abort);try{await client.shutdown();closed=true;}finally{client.dispose();await options.channel.terminate();}if(invalid)throw new P6Error('LSP_RESPONSE_INVALID',503);if(!closed||terminationFailed)throw new P6Error('LSP_SHUTDOWN_UNCONFIRMED',503);}
  }
}
