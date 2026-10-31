import {z} from 'zod';
import {sessionSchema,conversationSchema,messageSchema,modelSchema,connectionSchema,providerSchema,settingsSchema,type ProviderInput} from './schemas';
import {readSse} from './sse.mjs';
export class ApiError extends Error {constructor(public status:number,message:string){super(message)}}
const eventSchema=z.discriminatedUnion('type',[z.object({type:z.literal('token'),token:z.string()}),z.object({type:z.literal('done')}),z.object({type:z.literal('error'),error:z.string(),code:z.string().optional()})]);
let csrf='',bootstrap:Promise<unknown>|null=null;
async function body(response:Response):Promise<unknown>{
  const value=await response.json().catch(()=>null);
  if(!response.ok){if(response.status===401){csrf='';bootstrap=null;window.dispatchEvent(new Event('sirona-session-expired'));}const problem=z.object({detail:z.string().optional(),title:z.string().optional()}).safeParse(value);throw new ApiError(response.status,problem.success?(problem.data.detail||problem.data.title||'Request failed'):'Request failed');}
  return z.object({data:z.unknown()}).parse(value).data;
}
export async function request<T>(path:string,schema:z.ZodType<T>,method='GET',input?:unknown,signal?:AbortSignal,operationKey?:string,timeoutMs=20000):Promise<T>{
  const response=await fetch(`/api/v1${path}`,{method,credentials:'include',headers:{Accept:'application/json',...(input===undefined?{}:{'Content-Type':'application/json'}),...(method==='GET'?{}:{'X-CSRF-Token':csrf}),'X-Request-ID':crypto.randomUUID(),...(operationKey?{'Idempotency-Key':operationKey}:{})},...(method!=='GET'&&input!==undefined?{body:JSON.stringify(input)}:{}),signal:signal?AbortSignal.any([signal,AbortSignal.timeout(timeoutMs)]):AbortSignal.timeout(timeoutMs)});
  if(response.status===204)return schema.parse(undefined);
  return schema.parse(await body(response));
}
/** Read-only durable streams share the session/error boundary with JSON requests. */
export async function eventStream(path:string,signal:AbortSignal,cursor='0'){
  const response=await fetch(`/api/v1${path}`,{credentials:'include',headers:{Accept:'text/event-stream','Last-Event-ID':cursor,'X-Request-ID':crypto.randomUUID()},signal});
  if(!response.ok){await body(response);throw new Error('Run stream unavailable');}
  if(!response.headers.get('Content-Type')?.includes('text/event-stream'))throw new Error('Expected a run event stream');
  return response;
}
export const api={
  async bootstrap(){
    if(!bootstrap)bootstrap=(async()=>{
      if(!window.sirona)throw new Error('Open the Sirona desktop app to sign in securely. Browser preview does not bypass desktop authentication.');
      const session=sessionSchema.parse(await window.sirona.bootstrap());csrf=session.csrfToken??'';if(!csrf)throw new Error('Desktop bootstrap did not return a CSRF token');return session;
    })().catch(error=>{bootstrap=null;throw error;});
    return bootstrap;
  },
  session:()=>request('/session',sessionSchema),
  logout:()=>request('/session',z.object({success:z.boolean().optional()}).passthrough(),'DELETE'),
  capabilities:()=>request('/capabilities',z.object({capabilities:z.record(z.string(),z.unknown())}).passthrough()),
  conversations:()=>request('/conversations?scope=standalone',z.object({sessions:z.array(conversationSchema)})),
  browseDirectories:(path?:string)=>request(`/fs/directories${path?`?path=${encodeURIComponent(path)}`:''}`,z.object({currentPath:z.string(),parentPath:z.string().nullable(),drives:z.array(z.object({name:z.string(),path:z.string()})),quickAccess:z.array(z.object({name:z.string(),path:z.string()})),directories:z.array(z.object({name:z.string(),path:z.string()}))})),
  messages:(id:string,signal?:AbortSignal)=>request(`/conversations/${id}/messages?limit=500`,z.object({messages:z.array(messageSchema),total:z.number()}),'GET',undefined,signal),
  create:(title:string,modelId:string)=>request('/conversations',z.object({conversation:conversationSchema}),'POST',{title,modelId}),
  rename:(id:string,title:string)=>request(`/conversations/${id}`,z.object({conversation:conversationSchema}),'PATCH',{title}),
  updateModel:(id:string,modelId:string)=>request(`/conversations/${id}`,z.object({conversation:conversationSchema}),'PATCH',{modelId}),
  remove:(id:string)=>request(`/conversations/${id}`,z.object({success:z.boolean()}),'DELETE'),
  models:()=>request('/models',z.object({models:z.array(modelSchema)})),
  verifyModel:(modelId:string)=>request('/models/verify',z.object({verified:z.boolean()}).passthrough(),'POST',{modelId}),
  providers:()=>request('/providers',z.object({providers:z.array(providerSchema)})),
  async credentialStatus(){if(!window.sirona?.getCredentialStatus)throw new Error('Credential protection status is available only in the Sirona desktop app.');return z.object({osEncryptionAvailable:z.boolean()}).parse(await window.sirona.getCredentialStatus());},
  connections:()=>request('/provider-connections',z.object({connections:z.array(connectionSchema)})),
  settings:()=>request('/model-settings',settingsSchema),
  saveSettings:(settings:unknown)=>request('/model-settings',settingsSchema,'PATCH',settings),
  async saveConnection(input:ProviderInput){if(!window.sirona)throw new Error('Credential submission requires the Sirona desktop boundary');return connectionSchema.parse(await window.sirona.saveConnection(input));},
  removeConnection:(id:string)=>request(`/provider-connections/${id}`,z.object({id:z.string(),deleted:z.boolean()}),'DELETE'),
  testConnection:(id:string)=>request(`/provider-connections/${id}/test`,z.object({success:z.boolean().optional(),latencyMs:z.number().optional(),message:z.string().optional()}).passthrough(),'POST',{}),
  refreshModels:(id:string)=>request(`/provider-connections/${id}/models/refresh`,z.object({count:z.number().optional()}).passthrough(),'POST',{}),
  async turn(id:string,prompt:string,modelId:string,clientTurnId:string,signal:AbortSignal,onToken:(token:string)=>void,retryOf?:string,projectId?:string){
    const response=await fetch(`/api/v1/conversations/${id}/turns`,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json',Accept:'text/event-stream','X-CSRF-Token':csrf,'X-Request-ID':clientTurnId},body:JSON.stringify({prompt,modelId,clientTurnId,coordinateLease:true,...(retryOf?{retryOf}:{}),...(projectId?{projectId}:{})}),signal});
    if(!response.ok){await body(response);return;}
    if(!response.headers.get('Content-Type')?.includes('text/event-stream'))throw new Error('Expected a streaming response');
    await readSse(response,value=>{const event=eventSchema.parse(value);if(event.type==='token')onToken(event.token);if(event.type==='error')throw new Error(event.error);},signal);
  }
};
