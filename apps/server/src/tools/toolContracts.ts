import crypto from 'node:crypto';
import {z} from 'zod-v4';

export class P6Error extends Error {
  constructor(public code:string,public status=409,message=code){super(message);this.name='P6Error';}
}
export const digestSchema=z.string().regex(/^[a-f0-9]{64}$/);
export const relativePathSchema=z.string().min(1).max(512).refine(value=>!value.includes('\\')&&!/[\x00-\x1f\x7f]/.test(value)&&!value.includes(':')&&!value.startsWith('/')&&value.split('/').every(part=>part!==''&&part!=='.'&&part!=='..'),'Canonical relative path required');
const forbidden=new Set(['.git','.env','.npmrc','.pypirc','.netrc','.ssh','.aws','.azure','.config','.sirona','.codex','.agents','node_modules','dist','dist-workspace','build','coverage','vendor']);
export function publicSourcePath(value:string){const parts=relativePathSchema.parse(value).split('/');return !parts.some(part=>forbidden.has(part.toLowerCase())||/^\.env(?:\.|$)/i.test(part)||/(?:^|[._-])(?:credentials?|secrets?|private[-_]?key|id_rsa|id_ed25519)(?:[._-]|$)/i.test(part)||/\.(?:pem|pfx|p12|key|keystore)$/i.test(part));}
export function canonicalDigest(value:unknown):string{
  const encode=(v:unknown):string=>{if(v===null||typeof v!=='object'){const result=JSON.stringify(v);if(result===undefined)throw new P6Error('INVALID_CANONICAL_VALUE',400);return result;}if(Array.isArray(v))return '['+v.map(encode).join(',')+']';return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+encode((v as Record<string,unknown>)[k])).join(',')+'}';};
  return crypto.createHash('sha256').update(encode(value)).digest('hex');
}
export const searchSchema=z.object({query:z.string().min(1).max(256).refine(v=>!v.includes('\0')),files:z.array(relativePathSchema).min(1).max(100),maxMatches:z.number().int().min(1).max(200).default(50)}).strict();
export const gitSchema=z.discriminatedUnion('operation',[
  z.object({operation:z.literal('status')}).strict(),
  z.object({operation:z.literal('log'),limit:z.number().int().min(1).max(50).default(20)}).strict(),
  z.object({operation:z.literal('diff'),files:z.array(relativePathSchema).min(1).max(100),staged:z.boolean().default(false)}).strict(),
]);
export const mcpManifestSchema=z.object({version:z.literal('p6.1'),serverId:z.string().regex(/^[a-z][a-z0-9-]{0,63}$/),imageDigest:digestSchema,tools:z.array(z.object({name:z.string().regex(/^[A-Za-z0-9_.-]{1,128}$/),description:z.string().max(8192).optional(),inputSchema:z.record(z.string(),z.unknown()),outputSchema:z.record(z.string(),z.unknown()).optional()}).strict()).min(1).max(100)}).strict().superRefine((v,c)=>{if(new Set(v.tools.map(t=>t.name)).size!==v.tools.length)c.addIssue({code:'custom',message:'Duplicate tool names'});if(Buffer.byteLength(JSON.stringify(v))>262144)c.addIssue({code:'custom',message:'Manifest too large'});});
export type McpManifest=z.infer<typeof mcpManifestSchema>;
export function sourceToolFingerprint(tool:Record<string,unknown>){return canonicalDigest({revisionId:tool.revision_id,inputSchema:tool.input_schema,outputSchema:tool.output_schema,capabilities:tool.capabilities,risk:tool.risk_class,profile:tool.sandbox_profile,timeoutMs:tool.timeout_ms,maxOutputBytes:tool.max_output_bytes,idempotency:tool.idempotency,cancellation:tool.cancellation});}
