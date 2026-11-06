import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {WorkspaceBroker} from '../workspace/workspaceBroker.js';
import {requireRoot} from '../workspace/homeProfile.js';
import {requireProjectIdentity,requireToolGrants,requireFence,requireRunApproval,identitySchema,fenceSchema,uuidSchema} from '../security/executionPolicy.js';
import type {TransactionClient} from '../db/transactionAdapter.js';
import type {ActivityContext} from '../orchestration/activityAdapter.js';
import {canonicalDigest,publicSourcePath,P6Error,sourceToolFingerprint} from '../tools/toolContracts.js';
import {contextPolicySchema,contextBundleSchema} from './contextContracts.js';
import {indexSnapshot} from './projectIndex.js';
const require=createRequire(import.meta.url),db=()=>require('../../../config/db.js');
// Bind cached packs to actual parser/query/chunking code, not only source bytes.
const indexRevisionDigest=canonicalDigest({version:'p6.1',parser:readFileSync(new URL('./parserWorker.js',import.meta.url),'utf8'),index:readFileSync(new URL('./projectIndex.js',import.meta.url),'utf8'),assembler:readFileSync(new URL('./contextAssembler.js',import.meta.url),'utf8')});
const secretLike=/-----BEGIN [A-Z ]*PRIVATE KEY-----|(?:AKIA|ASIA)[A-Z0-9]{16}|\bsk-(?:proj-|ant-)?[A-Za-z0-9_-]{16,}|\b(?:api[_-]?key|password|secret|access[_-]?token)\s*[:=]\s*["'][^"'\r\n]{8,}["']/i;
async function authority(c:TransactionClient,context:ActivityContext){
  const actor=identitySchema.parse(context.identity);await requireProjectIdentity(c,context.projectId,actor);await requireFence(c,context.runId,context.taskId,context.fence);await requireRunApproval(c,context.runId);await requireRoot(c,context.projectId,context.rootRef,context.workspaceRoot);await requireToolGrants(c,context.projectId,['fs_read'],context.workspaceRoot);
  const run=(await c.query('SELECT r.project_id,r.epoch,r.repository_snapshot_id,cr.document,cr.digest,s.tree_digest FROM runs r JOIN contract_revisions cr ON cr.id=r.contract_revision_id LEFT JOIN repository_snapshots s ON s.id=r.repository_snapshot_id AND s.project_id=r.project_id WHERE r.id=$1 FOR SHARE OF r,cr',[context.runId])).rows[0];
  if(!run||run.project_id!==context.projectId||canonicalDigest(run.document)!==run.digest)throw new P6Error('CONTEXT_CONTRACT_MISMATCH',403);
  const policy=contextPolicySchema.parse(run.document.sourceContext);if(new Set(policy.files).size!==policy.files.length||policy.files.some(file=>!publicSourcePath(file)))throw new P6Error('SOURCE_EXCLUDED',403);
  if(policy.toolRevisionId){const tool=(await c.query("SELECT r.*,r.id AS revision_id FROM tool_revisions r JOIN tools t ON t.id=r.tool_id WHERE r.id=$1 AND t.name='p6_source_context' AND r.availability='available' FOR SHARE OF r",[policy.toolRevisionId])).rows[0];if(!tool||sourceToolFingerprint(tool)!==policy.toolRevisionDigest)throw new P6Error('P6_TOOL_REVISION_CHANGED',403);}
  const revision=(await c.query('SELECT id,digest,rules FROM policy_revisions WHERE active=true ORDER BY revision DESC LIMIT 1 FOR SHARE')).rows[0];if(!revision)throw new P6Error('POLICY_UNAVAILABLE',503);
  const governance=require('../../../services/governanceService.js').GovernanceService,decision=governance.evaluatePolicy(revision,{action:'tool:read_file',highImpact:false});if(!decision.allowed)throw new P6Error('POLICY_DENIED',403);
  return{policy,actor,epoch:String(run.epoch),contractDigest:String(run.digest),policyDigest:canonicalDigest({id:revision.id,digest:revision.digest,rules:revision.rules}),baseDigest:run.tree_digest as string|null};
}
export class ContextAssembler {
  static async authorizeReceipt(bundleId:string,identity:unknown){
    uuidSchema.parse(bundleId);await db().transaction(async(c:TransactionClient)=>{const actor=identitySchema.parse(identity),row=(await c.query('SELECT b.*,p.primary_path FROM knowledge.context_bundles b JOIN projects p ON p.id=b.project_id WHERE b.id=$1',[bundleId])).rows[0];if(!row)throw new P6Error('CONTEXT_NOT_FOUND',404);const data=row.bundle_data;
      await requireProjectIdentity(c,row.project_id,actor);if(data?.version!=='p6.1'||data.principalId!==actor.principalId||data.workspaceId!==actor.workspaceId||data.sessionId!==actor.sessionId)throw new P6Error('CONTEXT_SCOPE_MISMATCH',403);
      await requireRoot(c,row.project_id,data.rootRef,row.primary_path);await requireToolGrants(c,row.project_id,['fs_read'],row.primary_path);await requireRunApproval(c,row.run_id);
      const policy=(await c.query('SELECT id,digest,rules FROM policy_revisions WHERE active=true ORDER BY revision DESC LIMIT 1 FOR SHARE')).rows[0];if(!policy||canonicalDigest({id:policy.id,digest:policy.digest,rules:policy.rules})!==data.payload.policyDigest||canonicalDigest({projectId:row.project_id,runId:row.run_id,taskId:row.task_id,metadata:data})!==row.digest)throw new P6Error('CONTEXT_AUTHORITY_CHANGED',403);
    });
  }
  static async validateForDispatch(context:ActivityContext,bundleId:string){
    if(process.env.SIRONA_P6_CONTEXT_ENABLED!=='true')throw new P6Error('P6_CONTEXT_DISABLED',503);uuidSchema.parse(bundleId);
    const state=await db().transaction(async(c:TransactionClient)=>{const current=await authority(c,context);const row=(await c.query('SELECT * FROM knowledge.context_bundles WHERE id=$1 AND project_id=$2 AND run_id=$3 AND task_id=$4',[bundleId,context.projectId,context.runId,context.taskId])).rows[0];if(!row)throw new P6Error('CONTEXT_SCOPE_MISMATCH',403);
      const data=row.bundle_data;if(data?.version!=='p6.1'||data.principalId!==current.actor.principalId||data.workspaceId!==current.actor.workspaceId||data.sessionId!==current.actor.sessionId||data.contractDigest!==current.contractDigest||data.operationKey!==context.operationKey)throw new P6Error('CONTEXT_AUTHORITY_CHANGED',403);
      if(data.indexRevisionDigest!==indexRevisionDigest)throw new P6Error('CONTEXT_INDEX_REVISION_CHANGED');
      const payload=contextBundleSchema.parse(data.payload);if(payload.policyDigest!==current.policyDigest||canonicalDigest({projectId:context.projectId,runId:context.runId,taskId:context.taskId,metadata:data})!==row.digest)throw new P6Error('CONTEXT_DIGEST_MISMATCH',403);return{payload,digest:String(row.digest)};
    });
    const snapshot=await WorkspaceBroker.createSnapshotFromHost(context.workspaceRoot);if(snapshot.treeDigest!==state.payload.snapshotDigest)throw new P6Error('CONTEXT_SNAPSHOT_STALE');
    await db().transaction((c:TransactionClient)=>authority(c,context));return{id:bundleId,digest:state.digest};
  }
  static async assemble(context:ActivityContext){
    if(process.env.SIRONA_P6_CONTEXT_ENABLED!=='true')throw new P6Error('P6_CONTEXT_DISABLED',503);if(context.signal?.aborted)throw new P6Error('CONTEXT_CANCELLED',499);
    if(!context.operationKey||context.operationKey.length>128)throw new P6Error('CONTEXT_OPERATION_REQUIRED',400);
    const first=await db().transaction((c:TransactionClient)=>authority(c,context));
    const prior=(await db().query("SELECT id,bundle_data FROM knowledge.context_bundles WHERE project_id=$1 AND run_id=$2 AND task_id=$3 AND bundle_data->>'operationKey'=$4 ORDER BY created_at DESC LIMIT 1",[context.projectId,context.runId,context.taskId,context.operationKey])).rows[0];
    if(prior){const verified=await this.validateForDispatch(context,prior.id);const payload=contextBundleSchema.parse(prior.bundle_data.payload);return{id:verified.id,digest:verified.digest,text:payload.text,sources:payload.sources,warnings:payload.warnings,tokenUpperBound:payload.byteLength,snapshotDigest:payload.snapshotDigest};}
    const snapshot=await WorkspaceBroker.createSnapshotFromHost(context.workspaceRoot);
    if(first.policy.snapshotMode==='pinned'&&first.baseDigest!==snapshot.treeDigest)throw new P6Error('CONTEXT_SNAPSHOT_STALE');
    const selected=first.policy.files.slice(0,first.policy.maxFiles),warnings:string[]=[];if(first.policy.files.length>selected.length)warnings.push('FILE_LIMIT');
    for(const file of selected){const entry=snapshot.entries.get(file);if(!entry)throw new P6Error('SOURCE_NOT_IN_SNAPSHOT');if(secretLike.test(entry.content.toString('utf8')))throw new P6Error('SOURCE_SECRET_PATTERN',403);}
    const index=await indexSnapshot(snapshot,selected,context.signal);const sources:{path:string;sha256:string;startLine:number;endLine:number}[]=[];let text='';
    for(const file of selected){const entry=snapshot.entries.get(file)!;const lines=entry.content.toString('utf8').split('\n'),header='\n'+JSON.stringify({path:file,sha256:entry.sha256})+'\n';let content='',endLine=0;
      for(const line of lines){const next=content+line+'\n';if(Buffer.byteLength(text+header+next)>first.policy.maxBytes)break;content=next;endLine++;}
      if(!endLine){warnings.push('BYTE_LIMIT');break;}text+=header+content;sources.push({path:file,sha256:entry.sha256,startLine:1,endLine});if(endLine<lines.length){warnings.push('BYTE_LIMIT');break;}
    }
    for(const file of index.files)for(const warning of file.warnings)warnings.push(warning);
    const payload=contextBundleSchema.parse({version:'p6.1',snapshotDigest:snapshot.treeDigest,policyDigest:first.policyDigest,indexDigest:index.digest,sources,text,byteLength:Buffer.byteLength(text),warnings:[...new Set(warnings)]});
    if(!sources.length)throw new P6Error('CONTEXT_BUDGET_TOO_SMALL',422);if(context.signal?.aborted)throw new P6Error('CONTEXT_CANCELLED',499);
    const fresh=await WorkspaceBroker.createSnapshotFromHost(context.workspaceRoot);if(fresh.treeDigest!==snapshot.treeDigest)throw new P6Error('CONTEXT_SNAPSHOT_CHANGED');
    return db().transaction(async(c:TransactionClient)=>{const current=await authority(c,context);if(current.policyDigest!==first.policyDigest||current.contractDigest!==first.contractDigest||current.epoch!==first.epoch)throw new P6Error('CONTEXT_AUTHORITY_CHANGED',403);
      await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,8118))',[context.runId+':'+context.taskId+':'+context.operationKey]);
      const existing=(await c.query("SELECT id,digest,bundle_data FROM knowledge.context_bundles WHERE project_id=$1 AND run_id=$2 AND task_id=$3 AND bundle_data->>'operationKey'=$4 ORDER BY created_at DESC LIMIT 1",[context.projectId,context.runId,context.taskId,context.operationKey])).rows[0];
      if(existing){const d=existing.bundle_data;if(d.indexRevisionDigest!==indexRevisionDigest||d.principalId!==first.actor.principalId||d.workspaceId!==first.actor.workspaceId||d.sessionId!==first.actor.sessionId||d.contractDigest!==first.contractDigest||canonicalDigest(d.payload)!==canonicalDigest(payload)||canonicalDigest({projectId:context.projectId,runId:context.runId,taskId:context.taskId,metadata:d})!==existing.digest)throw new P6Error('CONTEXT_OPERATION_CONFLICT');return{id:String(existing.id),digest:String(existing.digest),text:payload.text,sources:payload.sources,warnings:payload.warnings,tokenUpperBound:payload.byteLength,snapshotDigest:payload.snapshotDigest};}
      const metadata={version:'p6.1',indexRevisionDigest,rootRef:context.rootRef,operationKey:context.operationKey,principalId:first.actor.principalId,sessionId:first.actor.sessionId,workspaceId:first.actor.workspaceId,runEpoch:first.epoch,leaseEpoch:fenceSchema.parse(context.fence).leaseEpoch.toString(),contractDigest:first.contractDigest,payload};
      const digest=canonicalDigest({projectId:context.projectId,runId:context.runId,taskId:context.taskId,metadata});
      const row=(await c.query('INSERT INTO knowledge.context_bundles(project_id,run_id,task_id,digest,source_revision_refs,token_estimate,bundle_data) VALUES($1,$2,$3,$4,$5::jsonb,$6,$7::jsonb) RETURNING id',[context.projectId,context.runId,context.taskId,digest,JSON.stringify(sources),payload.byteLength,JSON.stringify(metadata)])).rows[0];
      // Byte count is a conservative reservation bound, not a claimed exact tokenizer count.
      return{id:String(row.id),digest,text:payload.text,sources:payload.sources,warnings:payload.warnings,tokenUpperBound:payload.byteLength,snapshotDigest:payload.snapshotDigest};
    });
  }
}
