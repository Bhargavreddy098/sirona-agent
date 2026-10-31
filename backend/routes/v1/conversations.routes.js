import { Router } from 'express';
import { query } from '../../config/db.js';
import { sessionAuth } from '../../middleware/sessionAuth.js';
import { sendProblem } from '../../middleware/problem.js';
import { requireConversation,requireProject,conversationError } from '../../services/conversationAccess.js';
import { coordinateTurn,reconcileTurns } from '../../services/conversationTurnCoordinator.js';
const router=Router();
const reply=(req,res,data,status=200)=>res.status(status).json({data,meta:{requestId:req.requestId}});
const handle=fn=>async(req,res,next)=>{try{await fn(req,res,next);}catch(error){if(error.status)return sendProblem(req,res,error.status,error.message);next(error);}};
router.use(['/conversations/:conversationId','/sessions/:conversationId/lease'],sessionAuth(),handle(async(req,_res,next)=>{
  req.conversation=await requireConversation(req.params.conversationId,req.session);
  const originalPath=req.originalUrl.split('?')[0];
  if(req.method==='DELETE'&&!originalPath.endsWith('/lease')) {
    const lease=await query('SELECT 1 FROM session_turn_leases WHERE session_id=$1 AND released_at IS NULL AND expires_at>NOW()',[req.params.conversationId]);
    if(lease.rows.length) throw conversationError(409,'Stop the active turn before deleting this conversation');
  }
  if(req.method==='GET'&&originalPath.endsWith('/messages')) await reconcileTurns(req.params.conversationId);
  next();
}));
router.use('/projects/:projectId/conversations',sessionAuth(),handle(async(req,_res,next)=>{await requireProject(req.params.projectId,req.session);next();}));
router.get('/conversations',sessionAuth({requireCsrf:false}),handle(async(req,res)=>{
  if(req.query.scope!=='standalone')throw conversationError(400,'Specify scope=standalone');
  const result=await query(`SELECT * FROM sessions WHERE chat_scope='standalone' AND project_id IS NULL AND workspace_id=$1 AND user_id=$2 AND deleted_at IS NULL ORDER BY last_activity_at DESC LIMIT 200`,[req.session.workspaceId,req.session.principalId]);
  reply(req,res,{sessions:result.rows});
}));
router.post('/conversations',sessionAuth(),handle(async(req,res)=>{
  const {title='New chat',modelId,projectId}=req.body||{};
  if(typeof title!=='string'||!title.trim()||title.length>255||typeof modelId!=='string'||!modelId.trim())throw conversationError(400,'A title and registry modelId are required');
  let cwd = null;
  if (projectId) {
    const proj = await query('SELECT primary_path FROM projects WHERE id = $1', [projectId]);
    cwd = proj.rows[0]?.primary_path || null;
  }
  const result=await query(`INSERT INTO sessions(title,model,project_id,user_id,workspace_id,cwd,chat_scope) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,[title.trim(),modelId,projectId||null,req.session.principalId,req.session.workspaceId,cwd,projectId?'project':'standalone']);
  reply(req,res,{conversation:result.rows[0]},201);
}));
router.patch('/conversations/:conversationId',sessionAuth(),handle(async(req,res)=>{
  const {title,modelId}=req.body||{};
  if(title!==undefined&&(typeof title!=='string'||!title.trim()||title.length>255))throw conversationError(400,'Invalid title');
  if(modelId!==undefined&&(typeof modelId!=='string'||!modelId.trim()))throw conversationError(400,'Invalid modelId');
  const result=await query('UPDATE sessions SET title=COALESCE($2,title),model=COALESCE($3,model) WHERE id=$1 RETURNING *',[req.params.conversationId,title?.trim()??null,modelId??null]);
  reply(req,res,{conversation:result.rows[0]});
}));
router.post('/conversations/:conversationId/turns',sessionAuth(),handle(async(req,res,next)=>{
  if(req.body?.coordinateLease!==true)return next();
  await coordinateTurn(req,res);
}));
export default router;
