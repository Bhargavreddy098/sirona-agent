import crypto from 'node:crypto';
import { query } from '../config/db.js';
import { SessionTurnLeaseRegistry } from './turnLeaseService.js';
import { ProviderService } from './providerService.js';
import { conversationError } from './conversationAccess.js';

export async function reconcileTurns(id) {
  await query(`UPDATE messages m SET status='cancelled',content=CASE WHEN content='' THEN '[Turn interrupted before completion]' ELSE content END
    WHERE m.session_id=$1 AND m.client_turn_id IS NOT NULL AND m.status IN ('pending','streaming')
    AND NOT EXISTS(SELECT 1 FROM session_turn_leases l WHERE l.session_id=$1 AND l.released_at IS NULL AND l.expires_at>NOW())`,[id]);
}

export async function coordinateTurn(req,res) {
  const {prompt,modelId,clientTurnId,retryOf,projectId}=req.body;
  const id=req.params.conversationId;
  if(typeof prompt!=='string'||!prompt.trim()||prompt.length>100000||typeof modelId!=='string'||!modelId.trim()||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clientTurnId??'')) throw conversationError(400,'Prompt, registry modelId and UUID clientTurnId are required');
  const model=await ProviderService.getModelById(modelId);
  if(!model||model.id!==modelId)throw conversationError(400,'Select an exact registered model identifier');
  let token,renewal=Promise.resolve(),timer;
  const ownerId=`desktop:${crypto.randomUUID()}`;
  const controller=new AbortController();
  let completed=false;
  const close=()=>{if(!completed)controller.abort();};
  const emit=data=>{if(!res.destroyed&&!res.writableEnded){res.write(`data: ${JSON.stringify(data)}\n\n`);res.flush?.();}};
  try {
    await reconcileTurns(id);
    // Every request gets a distinct holder; the existing transactional lease is the writer lock.
    // Do not reserve a pool connection for the stream: that can starve concurrent conversations.
    try {token=await SessionTurnLeaseRegistry.acquireLease(id,{ownerId,ttlSeconds:90});}
    catch(error){if(error.code==='23505')throw conversationError(409,'Another turn acquired this conversation.','TURN_LEASE_CONFLICT');throw error;}
    const previous=await query('SELECT role,status,content FROM messages WHERE session_id=$1 AND client_turn_id=$2 ORDER BY id',[id,clientTurnId]);
    if(previous.rows.length) {
      throw conversationError(409,'This request was already recorded. Reopen its saved result or explicitly retry the failed turn.');
    }
    let retryUserMessageId=null;
    if(retryOf!==undefined) {
      const latest=await query('SELECT id,role,status,content FROM messages WHERE session_id=$1 ORDER BY id DESC LIMIT 1',[id]);
      const assistant=latest.rows[0];
      const precedingUser=await query("SELECT id,role,content FROM messages WHERE session_id=$1 AND role='user' ORDER BY id DESC LIMIT 1",[id]);
      const user=precedingUser.rows[0];
      if(!assistant||String(assistant.id)!==String(retryOf)||assistant.role!=='assistant'||!['failed','cancelled'].includes(assistant.status)||user?.role!=='user'||user.content!==prompt.trim())throw conversationError(409,'Only the latest failed or cancelled turn can be retried');
      retryUserMessageId=user.id;
    }
    timer=setInterval(()=>{
      renewal=renewal.then(async()=>{token=await SessionTurnLeaseRegistry.acquireLease(id,{ownerId,ttlSeconds:90});}).catch(()=>controller.abort());
    },20000);
    res.on('close',close);
    if(res.destroyed)controller.abort();
    res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','X-Accel-Buffering':'no'});
    res.flushHeaders();
    const heartbeat=setInterval(()=>{if(!res.destroyed)res.write(': heartbeat\n\n');},10000);
    try {
      await query('UPDATE sessions SET model=$2,project_id=COALESCE($3,project_id),last_activity_at=NOW() WHERE id=$1',[id,modelId,projectId||null]);
      const adapter=process.env.SIRONA_PROVIDER_ADAPTER;
      const result=await ProviderService.executeTurn({conversationId:id,prompt,modelId,actorId:req.session.principalId,leaseOwner:ownerId,clientTurnId,retryUserMessageId,nativeChat:true,signal:controller.signal,onToken:token=>emit({type:'token',token}),adapter,projectId});
      completed=true;emit({type:'done',...result});
    } catch(error) {
      const detail=error.status===503?'The model provider is unavailable (HTTP 503). Retry this turn or choose another configured model.':error.status===429?'The model provider rate limit was reached (HTTP 429). Wait for its reset or choose another model.':error.status===401?'Provider authentication failed (HTTP 401). Update the connection in Model Providers.':error.message;
      emit({type:'error',error:detail,code:error.code??'TURN_FAILED',status:error.status??500});
    } finally {clearInterval(heartbeat);}
  } finally {
    clearInterval(timer);await renewal;
    res.off('close',close);
    if(token)await SessionTurnLeaseRegistry.releaseLease(id,{ownerId,generation:token.generation}).catch(()=>{});
    if(res.headersSent&&!res.destroyed&&!res.writableEnded)res.end();
  }
}
