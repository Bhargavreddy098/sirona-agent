import {Server} from '@modelcontextprotocol/sdk/server/index.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {ListToolsRequestSchema,CallToolRequestSchema} from '@modelcontextprotocol/sdk/types.js';
import fs from 'node:fs/promises';
import {constants} from 'node:fs';
import path from 'node:path';

// A real read-only source tool. The trusted caller still owns approval, the
// snapshot, fixed server manifest, authority checks, cancellation and receipts.
const root='/workspace';
const tool={name:'read_source',description:'Read an approved source file from the isolated workspace snapshot.',inputSchema:{type:'object',properties:{path:{type:'string',minLength:1,maxLength:512},maxBytes:{type:'integer',minimum:1,maximum:65536}},required:['path'],additionalProperties:false},outputSchema:{type:'object',properties:{path:{type:'string'},text:{type:'string'},bytes:{type:'integer',minimum:0,maximum:65536}},required:['path','text','bytes'],additionalProperties:false}};
function approvedPath(value){
 if(typeof value!=='string'||value.length<1||value.length>512||/[\\:\x00-\x1f\x7f]/.test(value)||value.startsWith('/'))throw Error('SOURCE_PATH_DENIED');
 const parts=value.split('/');if(parts.some(p=>!p||p==='.'||p==='..'||/^\.(?:git|env|ssh|aws|azure|npmrc|netrc|pypirc)(?:\.|$)/i.test(p)||/(?:^|[._-])(?:credentials?|secrets?|private[-_]?key|id_rsa|id_ed25519)(?:[._-]|$)/i.test(p)||/\.(?:pem|pfx|p12|key|keystore)$/i.test(p)))throw Error('SOURCE_PATH_DENIED');
 return path.posix.join(root,value);
}
async function readSource(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['path','maxBytes'].includes(k)))throw Error('SOURCE_INPUT_INVALID');
 const maximum=input.maxBytes??65536;if(!Number.isSafeInteger(maximum)||maximum<1||maximum>65536)throw Error('SOURCE_INPUT_INVALID');
 const target=approvedPath(input.path),file=await fs.open(target,constants.O_RDONLY|constants.O_NOFOLLOW);
 try{const actual=await fs.realpath('/proc/self/fd/'+file.fd);if(!actual.startsWith(root+'/'))throw Error('SOURCE_PATH_DENIED');const stat=await file.stat();if(!stat.isFile()||stat.size>maximum)throw Error('SOURCE_LIMIT');
  const bytes=Buffer.alloc(maximum+1);let length=0;while(length<bytes.length){const result=await file.read(bytes,length,bytes.length-length,length);if(!result.bytesRead)break;length+=result.bytesRead;}
  if(length>maximum)throw Error('SOURCE_LIMIT');const text=bytes.subarray(0,length).toString('utf8');if(text.includes('\0'))throw Error('SOURCE_BINARY_DENIED');return{path:input.path,text,bytes:length};
 }finally{await file.close();}
}
const server=new Server({name:'sirona-approved-source',version:'p6.1'},{capabilities:{tools:{}}});
server.setRequestHandler(ListToolsRequestSchema,async()=>({tools:[tool]}));
server.setRequestHandler(CallToolRequestSchema,async request=>{try{if(request.params.name!==tool.name)throw Error('SOURCE_TOOL_DENIED');const result=await readSource(request.params.arguments);return{content:[{type:'text',text:JSON.stringify(result)}],structuredContent:result};}catch{return{isError:true,content:[{type:'text',text:'Source read denied or unavailable.'}]};}});
await server.connect(new StdioServerTransport());
