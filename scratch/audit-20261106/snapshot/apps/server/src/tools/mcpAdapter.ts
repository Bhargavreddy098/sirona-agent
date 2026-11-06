import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {AjvJsonSchemaValidator} from '@modelcontextprotocol/sdk/validation/ajv-provider.js';
import type {Transport} from '@modelcontextprotocol/sdk/shared/transport.js';
import {canonicalDigest,mcpManifestSchema,P6Error,type McpManifest} from './toolContracts.js';

function boundedJson(value:unknown,limit=262144){const json=JSON.stringify(value);if(json===undefined||Buffer.byteLength(json)>limit)throw new P6Error('MCP_VALUE_LIMIT',413);const pending:[unknown,number][]=[[value,0]];let nodes=0;while(pending.length){const [item,depth]=pending.pop()!;if(++nodes>10000||depth>32)throw new P6Error('MCP_VALUE_LIMIT',413);if(item&&typeof item==='object')for(const entry of Object.values(item))pending.push([entry,depth+1]);}return json;}
/** One canonical invocation owns one SDK connection. Tool discovery is never authorization. */
export class McpAdapter {
  static async invoke(options:{transport:Transport;manifest:McpManifest;manifestDigest:string;toolName:string;arguments:Record<string,unknown>;authorize:()=>Promise<void>;signal?:AbortSignal}){
    const manifest=mcpManifestSchema.parse(options.manifest);if(canonicalDigest(manifest)!==options.manifestDigest)throw new P6Error('MCP_MANIFEST_DIGEST_MISMATCH',403);
    boundedJson(options.arguments,65536);const declared=manifest.tools.find(tool=>tool.name===options.toolName);if(!declared)throw new P6Error('MCP_TOOL_NOT_APPROVED',403);
    // No remote schema loading, sampling, roots, elicitation or server-initiated host tools.
    const validator=new AjvJsonSchemaValidator();let validate:ReturnType<AjvJsonSchemaValidator['getValidator']>;try{validate=validator.getValidator(declared.inputSchema);}catch{throw new P6Error('MCP_SCHEMA_UNSUPPORTED',422);}
    if(!validate(options.arguments).valid)throw new P6Error('MCP_INPUT_INVALID',400);
    const client=new Client({name:'Sirona',version:'p6.1'},{capabilities:{},jsonSchemaValidator:validator});let drift=false;
    const {ToolListChangedNotificationSchema}=await import('@modelcontextprotocol/sdk/types.js');client.setNotificationHandler(ToolListChangedNotificationSchema,()=>{drift=true;});
    const signal=AbortSignal.any([AbortSignal.timeout(30000),...(options.signal?[options.signal]:[])]),request={signal,timeout:30000,maxTotalTimeout:30000};
    try{await options.authorize();if(signal.aborted)throw new P6Error('MCP_CANCELLED',499);await client.connect(options.transport,{timeout:30000,signal});
      const listing=await client.listTools({},request);boundedJson(listing);if(listing.nextCursor)throw new P6Error('MCP_MANIFEST_UNBOUNDED',413);
      let tools:McpManifest['tools'];try{tools=mcpManifestSchema.shape.tools.parse(listing.tools);}catch{throw new P6Error('MCP_DEFINITION_UNSUPPORTED',422);}
      if(canonicalDigest([...tools].sort((a,b)=>a.name.localeCompare(b.name)))!==canonicalDigest([...manifest.tools].sort((a,b)=>a.name.localeCompare(b.name)))||drift)throw new P6Error('MCP_SCHEMA_DRIFT',409);
      await options.authorize();if(drift||signal.aborted)throw new P6Error('MCP_DISPATCH_CANCELLED',499);
      const result=await client.callTool({name:declared.name,arguments:options.arguments},undefined,request);boundedJson(result);await options.authorize();if(drift)throw new P6Error('MCP_RESULT_SCHEMA_DRIFT',409);
      if(result.isError)throw new P6Error('MCP_TOOL_FAILED',422);if(declared.outputSchema){if(!result.structuredContent||!validator.getValidator(declared.outputSchema)(result.structuredContent).valid)throw new P6Error('MCP_OUTPUT_INVALID',422);}
      return{manifestDigest:options.manifestDigest,toolName:declared.name,result};
    }finally{await client.close();}
  }
}
