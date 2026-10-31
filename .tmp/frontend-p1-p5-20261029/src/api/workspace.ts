import {z} from 'zod';
import {request} from './client';
const id=(value:string)=>z.uuid().parse(value),hash=z.string().regex(/^[a-f0-9]{64}$/);
const key=(value:string)=>z.string().min(1).max(120).parse(value);
const fence=z.object({holder:z.string().min(1).max(100),runEpoch:z.string().regex(/^[1-9][0-9]*$/),leaseEpoch:z.string().regex(/^[1-9][0-9]*$/)});
const terminalInput=z.object({runId:z.uuid(),taskId:z.uuid(),rootRef:z.uuid(),approvalId:z.uuid(),fence,cols:z.number().int().min(1).max(500).optional(),rows:z.number().int().min(1).max(300).optional()}).strict();
const patchInput=terminalInput.omit({cols:true,rows:true});
const patchSchema=z.object({patchDigest:hash,added:z.array(z.object({path:z.string(),sha256:hash,content:z.string()})),modified:z.array(z.object({path:z.string(),oldSha256:hash,newSha256:hash,content:z.string()})),deleted:z.array(z.object({path:z.string(),oldSha256:hash}))});
const terminalResult=z.object({terminalId:z.uuid(),status:z.string(),live:z.boolean(),inputRequiresApproval:z.boolean(),commandsCompleted:z.literal(false),replayed:z.boolean().optional()});
export type TerminalCreation=z.input<typeof terminalInput>;
/** P3 transport; workspace surfaces consume these contracts in P7 without changing chat. */
export const workspaceApi={
 registerRoot:(projectId:string,operationKey:string)=>request(`/projects/${id(projectId)}/workspace-root`,z.object({rootRef:z.uuid(),profile:z.literal('docker_trusted_local_v1'),expiresInSeconds:z.number().int()}),'POST',{profile:'trusted-local'},undefined,key(operationKey)),
 qualify:(projectId:string)=>request(`/projects/${id(projectId)}/isolation/docker-qualification`,z.object({qualificationId:z.uuid(),profile:z.literal('docker_trusted_local_v1'),threatModel:z.literal('trusted_local_projects_only'),imageId:z.string()}),'POST',{profile:'trusted-local'}),
 files:(projectId:string,rootRef:string,offset=0)=>request(`/projects/${id(projectId)}/files?rootRef=${id(rootRef)}&offset=${z.number().int().min(0).parse(offset)}&limit=100`,z.object({files:z.array(z.object({path:z.string(),bytes:z.number().int(),digest:hash})),total:z.number().int(),nextOffset:z.number().int().nullable()})),
 file:(projectId:string,rootRef:string,path:string)=>request(`/projects/${id(projectId)}/file?rootRef=${id(rootRef)}&path=${encodeURIComponent(path)}`,z.object({path:z.string(),content:z.string(),digest:hash,bytes:z.number().int()})),
 createTerminal:(projectId:string,input:TerminalCreation,operationKey:string)=>request(`/projects/${id(projectId)}/terminals`,terminalResult,'POST',terminalInput.parse(input),undefined,key(operationKey)),
 terminalTicket:(terminalId:string)=>request(`/terminals/${id(terminalId)}/ticket`,z.object({ticket:z.string().regex(/^[a-f0-9]{64}$/),expiresInSeconds:z.number().int()}),'POST',{}),
 closeTerminal:(terminalId:string)=>request(`/terminals/${id(terminalId)}`,z.object({status:z.enum(['closed','closing']),patchPreviewId:z.uuid().nullable()}),'DELETE'),
 patchPreview:(projectId:string,previewId:string)=>request(`/projects/${id(projectId)}/patch-previews/${id(previewId)}`,z.object({patchDigest:hash,baseDigest:hash,rootRef:z.uuid(),runId:z.uuid(),taskId:z.uuid(),patch:patchSchema})),
 applyPatch:(projectId:string,previewId:string,input:z.input<typeof patchInput>,operationKey:string)=>request(`/projects/${id(projectId)}/patch-previews/${id(previewId)}/apply`,z.object({effectId:z.uuid(),status:z.literal('completed'),patchDigest:hash}).passthrough(),'POST',patchInput.parse(input),undefined,key(operationKey)),
 recoverWorkers:(projectId:string,runId:string)=>request(`/projects/${id(projectId)}/docker-workers/recover`,z.object({stopped:z.number().int(),unresolved:z.number().int(),effectReplayAllowed:z.literal(false)}),'POST',{runId:id(runId)}),
 workers:(projectId:string)=>request(`/projects/${id(projectId)}/docker-workers`,z.object({workers:z.array(z.object({id:z.uuid(),status:z.enum(['provisioning','running','unknown']),kind:z.enum(['command','terminal','qualification']),runId:z.uuid()}))})),
 recoverQualification:(projectId:string,workerId:string)=>request(`/projects/${id(projectId)}/docker-workers/recover`,z.object({stopped:z.number().int(),unresolved:z.number().int(),effectReplayAllowed:z.literal(false)}),'POST',{qualificationWorkerId:id(workerId)}),
 reconcilePatch:(projectId:string,effectId:string)=>request(`/projects/${id(projectId)}/patch-effects/${id(effectId)}/reconcile`,z.object({status:z.enum(['unknown','completed']),effectId:z.uuid()}).passthrough(),'POST',{}),
};
/** Same-origin, short-lived one-use ticket; no raw session credential reaches JavaScript. */
export async function terminalChannel(terminalId:string){const {ticket}=await workspaceApi.terminalTicket(terminalId);const url=new URL(`/api/v1/terminals/${id(terminalId)}/channel`,window.location.origin);url.protocol=url.protocol==='https:'?'wss:':'ws:';url.searchParams.set('ticket',ticket);return new WebSocket(url);}
