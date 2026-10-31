import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PassThrough} from 'node:stream';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {Server} from '@modelcontextprotocol/sdk/server/index.js';
import {ListToolsRequestSchema,CallToolRequestSchema} from '@modelcontextprotocol/sdk/types.js';
import {BoundedGuestTransport} from '../src/tools/guestTransport.js';
import {McpAdapter} from '../src/tools/mcpAdapter.js';
import {canonicalDigest,type McpManifest} from '../src/tools/toolContracts.js';

// Actual SDK over actual byte streams. This does not qualify a guest or pretend to be external inference.
async function sdkFixture(t:any,drift=false){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'sirona-p6-sdk-'));await fs.writeFile(path.join(root,'actual.txt'),'actual SDK filesystem result');
 const a=new PassThrough(),b=new PassThrough(),errA=new PassThrough(),errB=new PassThrough();let calls=0;
 const terminate=async()=>{a.destroy();b.destroy();errA.destroy();errB.destroy();};
 const clientTransport=new BoundedGuestTransport({stdin:a,stdout:b,stderr:errA,terminate},async()=>{});
 const serverTransport=new BoundedGuestTransport({stdin:b,stdout:a,stderr:errB,terminate},async()=>{});
 const tools:McpManifest['tools']=[{name:'read_file',inputSchema:{type:'object',properties:{path:{type:'string',enum:['actual.txt']}},required:['path'],additionalProperties:false}}];
 const manifest:McpManifest={version:'p6.1',serverId:'controlled-sdk-protocol',imageDigest:'a'.repeat(64),tools};
 const server=new Server({name:'P6 actual SDK fixture',version:'1'},{capabilities:{tools:{}}});
 server.setRequestHandler(ListToolsRequestSchema,async()=>({tools:drift?[{...tools[0],description:'unapproved drift'}]:tools}));
 server.setRequestHandler(CallToolRequestSchema,async request=>{calls++;assert.equal(request.params.name,'read_file');assert.deepEqual(request.params.arguments,{path:'actual.txt'});return{content:[{type:'text',text:await fs.readFile(path.join(root,'actual.txt'),'utf8')}]};});
 await server.connect(serverTransport);t.after(async()=>{await server.close();await terminate();await fs.rm(root,{recursive:true,force:true});});
 return{transport:clientTransport,manifest,manifestDigest:canonicalDigest(manifest),toolName:'read_file',arguments:{path:'actual.txt'},authorize:async()=>{},calls:()=>calls};
}
test('P6 real MCP SDK discovers exact schema and calls through bounded byte transport',async t=>{const f=await sdkFixture(t);const result=await McpAdapter.invoke(f);assert.equal(f.calls(),1);assert.ok(Array.isArray(result.result.content));assert.equal(result.result.content[0].text,'actual SDK filesystem result');assert.equal(result.manifestDigest,f.manifestDigest);});
test('P6 SDK rejects schema drift and does not call the tool',async t=>{const f=await sdkFixture(t,true);await assert.rejects(McpAdapter.invoke(f),{code:'MCP_SCHEMA_DRIFT'});assert.equal(f.calls(),0);});
test('P6 validates nested arguments and rechecks authorization before SDK dispatch',async t=>{
 const bad=await sdkFixture(t);await assert.rejects(McpAdapter.invoke({...bad,arguments:{path:'../outside'}}),{code:'MCP_INPUT_INVALID'});assert.equal(bad.calls(),0);
 const f=await sdkFixture(t);let checks=0;await assert.rejects(McpAdapter.invoke({...f,authorize:async()=>{if(++checks===2)throw Object.assign(new Error('revoked'),{code:'REVOKED_GRANT'});}}),{code:'REVOKED_GRANT'});assert.equal(f.calls(),0);
});
test('P6 protocol limits reject invalid data and terminate the owned channel',async()=>{
 const output=new PassThrough(),input=new PassThrough(),errors=new PassThrough();let terminated=0;const transport=new BoundedGuestTransport({stdout:output,stdin:input,stderr:errors,terminate:async()=>{terminated++;output.destroy();input.destroy();errors.destroy();}},async()=>{}, {messageBytes:32,totalBytes:64,deadlineMs:1000});
 const failure=new Promise<void>(resolve=>{transport.onerror=()=>resolve();});await transport.start();output.write(Buffer.alloc(40,65));await failure;await transport.close();assert.equal(terminated,1);
});
test('P6 idle protocol revocation terminates the owned channel once and rejects later writes',async()=>{
 const stdout=new PassThrough(),stdin=new PassThrough(),stderr=new PassThrough();let allowed=true,terminated=0;
 const transport=new BoundedGuestTransport({stdout,stdin,stderr,terminate:async()=>{terminated++;stdout.destroy();stdin.destroy();stderr.destroy();}},async()=>{if(!allowed)throw new Error('revoked');});
 const revoked=new Promise<void>(resolve=>{transport.onerror=error=>{if((error as any).code==='PROTOCOL_AUTHORITY_REVOKED')resolve();};});
 await transport.start();allowed=false;await revoked;await transport.close();await transport.close();assert.equal(terminated,1);
 await assert.rejects(transport.send({jsonrpc:'2.0',method:'notifications/test'}),{code:'PROTOCOL_CLOSED'});
});
