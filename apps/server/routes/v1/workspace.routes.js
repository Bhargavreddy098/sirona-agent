import {Router} from 'express';
import {sessionAuth} from '../../middleware/sessionAuth.js';
import {sendProblem} from '../../middleware/problem.js';
import {query,transaction} from '../../config/db.js';
import {requireProjectIdentity,requireToolGrants,validate,uuidSchema} from '../../dist-workspace/src/security/executionPolicy.js';
import {registerRoot,qualifyHome,requireRoot,readArtifact} from '../../dist-workspace/src/workspace/homeProfile.js';
import {WorkspaceBroker} from '../../dist-workspace/src/workspace/workspaceBroker.js';
import {applyPreview,reconcilePatch} from '../../dist-workspace/src/workspace/patchService.js';
import {DockerRuntime} from '../../dist-workspace/src/windows/dockerRuntime.js';
import {CanonicalTerminal} from '../../dist-workspace/src/windows/canonicalTerminal.js';
import {z} from 'zod-v4';
import {workspaceReadiness,prepareTerminal,openPreparedTerminal,prepareTerminalInput,closeWorkspaceTerminal,reconcileTerminalTasks} from '../../dist-workspace/src/workspace/frontendController.js';
const router=Router();
const scope=async req=>{const projectId=validate(uuidSchema,req.params.projectId);await transaction(c=>requireProjectIdentity(c,projectId,req.session));const project=(await query('SELECT primary_path FROM projects WHERE id=$1',[projectId])).rows[0];return{projectId,root:project.primary_path};};
const handle=fn=>async(req,res)=>{try{await fn(req,res);}catch(e){const known=Number.isInteger(e?.status)&&e.status>=400&&e.status<=599&&/^[A-Z_]+$/.test(e?.code||'');sendProblem(req,res,known?e.status:503,known?e.code:'WORKSPACE_OPERATION_UNAVAILABLE');}};
router.get('/projects/:projectId/workspace-readiness',sessionAuth({requireCsrf:false}),handle(async(req,res)=>{validate(z.object({}).strict(),req.query);res.json({data:await workspaceReadiness(validate(uuidSchema,req.params.projectId),req.session)});}));
router.post('/projects/:projectId/terminal-preparations',sessionAuth(),handle(async(req,res)=>{res.status(201).json({data:await prepareTerminal(validate(uuidSchema,req.params.projectId),req.session,req.body,req.get('Idempotency-Key')||'')});}));
router.post('/projects/:projectId/terminal-preparations/:preparationId/open',sessionAuth(),handle(async(req,res)=>{validate(z.string().min(1).max(120),req.get('Idempotency-Key')||'');res.status(201).json({data:await openPreparedTerminal(validate(uuidSchema,req.params.projectId),validate(uuidSchema,req.params.preparationId),req.session,req.body)});}));
router.post('/terminals/:terminalId/input-preparations',sessionAuth(),handle(async(req,res)=>{res.status(201).json({data:await prepareTerminalInput(validate(uuidSchema,req.params.terminalId),req.session,req.body,req.get('Idempotency-Key')||'')});}));
router.post('/projects/:projectId/workspace-root',sessionAuth(),handle(async(req,res)=>{validate(z.object({profile:z.literal('trusted-local')}).strict(),req.body);const {projectId}=await scope(req);res.status(201).json({data:await registerRoot(projectId,req.session,req.get('Idempotency-Key')||'')});}));
router.post('/projects/:projectId/isolation/docker-qualification',sessionAuth(),handle(async(req,res)=>{validate(z.object({profile:z.literal('trusted-local')}).strict(),req.body);const {projectId}=await scope(req);res.json({data:await qualifyHome(projectId,req.session)});}));
router.get('/projects/:projectId/docker-workers',sessionAuth({requireCsrf:false}),handle(async(req,res)=>{const {projectId}=await scope(req);const rows=(await query("SELECT id,status,metadata->>'kind' AS kind,metadata->>'runId' AS run_id FROM isolation_workers WHERE metadata->>'projectId'=$1 AND metadata->>'profile'='docker_trusted_local_v1' AND status IN('provisioning','running','unknown') ORDER BY started_at LIMIT 50",[projectId])).rows;res.json({data:{workers:rows.map(row=>({id:row.id,status:row.status,kind:row.kind||'command',runId:row.run_id}))}});}));
const handleFiles = (single) => handle(async(req,res)=>{const {projectId,root}=await scope(req);const rootRef=validate(uuidSchema,req.query.rootRef);await transaction(async c=>{await requireRoot(c,projectId,rootRef,root);await requireToolGrants(c,projectId,['fs_read'],root);});const snapshot=await WorkspaceBroker.createSnapshotFromHost(root);if(single){const name=WorkspaceBroker.sanitizeRelativePath(String(req.query.path||'')),entry=snapshot.entries.get(name);if(!entry)return sendProblem(req,res,404,'File unavailable');if(entry.size>1048576)return sendProblem(req,res,413,'File preview limit');res.json({data:{path:name,content:entry.content.toString('utf8'),digest:entry.sha256,bytes:entry.size}});}else{const input=validate(z.object({offset:z.coerce.number().int().min(0).default(0),limit:z.coerce.number().int().min(1).max(200).default(100)}),req.query);const entries=[...snapshot.entries.values()].sort((a,b)=>a.relativePath.localeCompare(b.relativePath));res.json({data:{files:entries.slice(input.offset,input.offset+input.limit).map(e=>({path:e.relativePath,bytes:e.size,digest:e.sha256})),total:entries.length,nextOffset:input.offset+input.limit<entries.length?input.offset+input.limit:null}});}});
router.get('/projects/:projectId/file', sessionAuth({requireCsrf:false}), handleFiles(true));
router.get('/projects/:projectId/files', sessionAuth({requireCsrf:false}), handleFiles(false));
router.get('/projects/:projectId/patch-previews/:artifactId',sessionAuth({requireCsrf:false}),handle(async(req,res)=>{const {projectId,root}=await scope(req);const value=await transaction(async c=>{const record=await readArtifact(c,validate(uuidSchema,req.params.artifactId),projectId);await requireRoot(c,projectId,record.rootRef,root);return record;});res.json({data:{patchDigest:value.patch.patchDigest,baseDigest:value.baseDigest,rootRef:value.rootRef,runId:value.runId,taskId:value.taskId,patch:value.patch}});}));
router.post('/projects/:projectId/patch-previews/:artifactId/apply',sessionAuth(),handle(async(req,res)=>{const {projectId,root}=await scope(req);const input=validate(z.object({runId:z.uuid(),taskId:z.uuid(),rootRef:z.uuid(),approvalId:z.uuid(),fence:z.unknown()}).strict(),req.body);res.json({data:await applyPreview({...input,projectId,workspaceRoot:root,identity:req.session,previewId:validate(uuidSchema,req.params.artifactId),operationKey:req.get('Idempotency-Key')||''})});}));
router.post('/projects/:projectId/patch-effects/:effectId/reconcile',sessionAuth(),handle(async(req,res)=>{const {projectId}=await scope(req);res.json({data:await reconcilePatch(projectId,validate(uuidSchema,req.params.effectId),req.session)});}));
router.post('/projects/:projectId/docker-workers/recover',sessionAuth(),handle(async(req,res)=>{const {projectId}=await scope(req);const input=validate(z.union([z.object({runId:z.uuid()}).strict(),z.object({qualificationWorkerId:z.uuid()}).strict()]),req.body);const runId=input.runId;if(runId){const run=(await query('SELECT project_id FROM runs WHERE id=$1',[runId])).rows[0];if(run?.project_id!==projectId)return sendProblem(req,res,404,'Run unavailable');}const lock=await import('../../config/db.js').then(x=>x.getClient());let locked=false;try{locked=(await lock.query('SELECT pg_try_advisory_lock(8113,1) AS locked')).rows[0].locked;if(!locked)return sendProblem(req,res,409,'Worker owner is still active');const rows=(await query("SELECT id,metadata FROM isolation_workers WHERE (($1::text IS NOT NULL AND metadata->>'runId'=$1) OR ($3::uuid IS NOT NULL AND id=$3 AND metadata->>'kind'='qualification')) AND metadata->>'projectId'=$2 AND metadata->>'profile'='docker_trusted_local_v1' AND status IN('running','provisioning','unknown')",[runId||null,projectId,input.qualificationWorkerId||null])).rows;let stopped=0;for(const row of rows){if(!row.metadata.binding)continue;await DockerRuntime.recoverBinding(row.metadata.binding);await query("UPDATE isolation_workers SET status='terminated',terminated_at=NOW(),termination_reason='recovered_stopped' WHERE id=$1",[row.id]);stopped++;}const preparationsCancelled=runId?await reconcileTerminalTasks(projectId,runId,req.session,true):0;res.json({data:{stopped,unresolved:rows.length-stopped,effectReplayAllowed:false,preparationsCancelled}});}finally{if(locked)await lock.query('SELECT pg_advisory_unlock(8113,1)');lock.release();}}));
router.post('/projects/:projectId/terminals',sessionAuth(),handle(async(req,res)=>{const {projectId,root}=await scope(req);const input=validate(z.object({runId:z.uuid(),taskId:z.uuid(),rootRef:z.uuid(),approvalId:z.uuid(),fence:z.unknown(),cols:z.number().int().min(1).max(500).default(80),rows:z.number().int().min(1).max(300).default(24)}).strict(),req.body);res.status(201).json({data:await CanonicalTerminal.create({...input,projectId,workspaceRoot:root,identity:req.session,command:['/bin/sh'],capabilities:[],operationKey:req.get('Idempotency-Key')||''},input.cols,input.rows)});}));
router.post('/terminals/:terminalId/ticket',sessionAuth(),handle(async(req,res)=>{validate(z.object({}).strict(),req.body);res.json({data:await CanonicalTerminal.ticket(validate(uuidSchema,req.params.terminalId),req.session)});}));
router.delete('/terminals/:terminalId',sessionAuth(),handle(async(req,res)=>{res.json({data:await closeWorkspaceTerminal(validate(uuidSchema,req.params.terminalId),req.session)});}));
router.get('/fs/directories',sessionAuth({requireCsrf:false}),handle(async(req,res)=>{
  const fs=await import('node:fs');const path=await import('node:path');const os=await import('node:os');
  const homedir=os.homedir();
  const driveLetters=['C','D','E','F'];
  const drives=driveLetters.map(d=>`${d}:\\`).filter(d=>{try{return fs.existsSync(d);}catch{return false;}}).map(d=>({name:`Drive ${d.slice(0,2)}`,path:d}));
  const onedriveDesktop=path.join(homedir,'OneDrive','Desktop');
  const stdDesktop=path.join(homedir,'Desktop');
  const desktop=fs.existsSync(onedriveDesktop)?onedriveDesktop:fs.existsSync(stdDesktop)?stdDesktop:homedir;
  const downloads=path.join(homedir,'Downloads');
  const documents=path.join(homedir,'Documents');
  const quickAccess=[
    {name:'Desktop',path:desktop},
    {name:'Downloads',path:fs.existsSync(downloads)?downloads:homedir},
    {name:'Documents',path:fs.existsSync(documents)?documents:homedir},
    {name:'Home',path:homedir}
  ];
  let targetPath=String(req.query.path||'').trim();
  if(!targetPath)targetPath=desktop;
  targetPath=path.resolve(targetPath);
  if(!fs.existsSync(targetPath)||!fs.statSync(targetPath).isDirectory()){
    return sendProblem(req,res,404,'Directory not found');
  }
  const entries=fs.readdirSync(targetPath,{withFileTypes:true});
  const directories=entries.filter(e=>{
    if(!e.isDirectory())return false;
    if(e.name.startsWith('$')||e.name==='System Volume Information')return false;
    return true;
  }).map(e=>({name:e.name,path:path.join(targetPath,e.name)})).sort((a,b)=>a.name.localeCompare(b.name,undefined,{sensitivity:'base'}));
  const parentPath=path.dirname(targetPath)!==targetPath?path.dirname(targetPath):null;
  res.json({data:{currentPath:targetPath,parentPath,drives,quickAccess,directories}});
}));
export default router;
