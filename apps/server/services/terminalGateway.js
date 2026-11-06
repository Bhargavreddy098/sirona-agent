import {WebSocketServer} from 'ws';
import {z} from 'zod-v4';
import {verifySession} from './identityService.js';
import {CanonicalTerminal} from '../dist-workspace/src/windows/canonicalTerminal.js';
const frame=z.discriminatedUnion('type',[
 z.object({type:z.literal('input'),data:z.string().min(1).max(8192),approvalId:z.uuid(),operationKey:z.string().min(1).max(120)}).strict(),
 z.object({type:z.literal('resize'),cols:z.number().int().min(1).max(500),rows:z.number().int().min(1).max(300)}).strict(),
]);
/** Narrow authenticated transport. Legacy Socket.IO retains its existing deny boundary. */
export function createTerminalGateway(server,{allowedOrigins,accepting=()=>true}){
 const wss=new WebSocketServer({noServer:true,maxPayload:16384,perMessageDeflate:false,closeTimeout:1000});const pending=new Set();let closing=false;
 const reject=(socket,status=403)=>{if(!socket.destroyed)socket.end(`HTTP/1.1 ${status} Rejected\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);};
 const upgrade=(req,socket,head)=>{
  if(req.url?.startsWith('/socket.io/'))return;
  const match=/^\/api\/v1\/terminals\/([0-9a-f-]{36})\/channel\?ticket=([0-9a-f]{64})$/.exec(req.url||'');
  if(!match||closing||!accepting())return reject(socket);
  if(pending.size>=8||wss.clients.size>=2)return reject(socket,429);
  const port=server.address()?.port,remote=req.socket.remoteAddress;
  for(const name of ['host','origin','cookie'])if(req.rawHeaders.filter((value,index)=>index%2===0&&value.toLowerCase()===name).length!==1)return reject(socket);
  if(req.method!=='GET'||!['127.0.0.1','::ffff:127.0.0.1','::1'].includes(remote)||!['127.0.0.1:'+port,'localhost:'+port].includes(req.headers.host)||!allowedOrigins.includes(req.headers.origin))return reject(socket);
  const cookies=(req.headers.cookie||'').split(';').map(x=>x.trim()).filter(x=>x.startsWith('asi_session='));if(cookies.length!==1)return reject(socket);
  const rawSessionToken=cookies[0].slice(12);if(!/^[a-f0-9]{64}$/.test(rawSessionToken))return reject(socket);
  pending.add(socket);const timer=setTimeout(()=>socket.destroy(),5000);socket.once('close',()=>pending.delete(socket));
  void (async()=>{const session=await verifySession(rawSessionToken);if(!session)throw new Error('SESSION_INVALID');const identity={...session,rawSessionToken};const terminal=await CanonicalTerminal.consumeTicket(match[1],identity,match[2]);if(socket.destroyed||closing||!accepting())throw new Error('STOPPING');
   wss.handleUpgrade(req,socket,head,ws=>{
    let queue=Promise.resolve(),queued=0,frames=0;const rate=setInterval(()=>{frames=0;},1000);
    const send=value=>{if(ws.readyState!==1)return;if(ws.bufferedAmount>1048576)return ws.terminate();ws.send(JSON.stringify(value));};
    const data=value=>send({type:'output',data:value});const closed=()=>ws.close(1000,'Terminal stopped');terminal.on('data',data);terminal.once('close',closed);
    ws.on('error',()=>{});ws.once('close',()=>{clearInterval(rate);terminal.off('data',data);terminal.off('close',closed);});
    ws.on('message',(bytes,binary)=>{if(binary||++frames>64||++queued>16)return ws.close(1008,'Input limit');let input;try{input=frame.parse(JSON.parse(bytes.toString('utf8')));}catch{queued--;return send({type:'error',code:'INVALID_INPUT'});}
     queue=queue.then(async()=>{if(input.type==='resize'){await CanonicalTerminal.resize(match[1],identity,input.cols,input.rows);send({type:'resized',cols:input.cols,rows:input.rows});}else{const receipt=await CanonicalTerminal.input(match[1],identity,input.data,input.approvalId,input.operationKey);send({type:'receipt',receipt});}}).catch(error=>send({type:'error',code:/^[A-Z_]+$/.test(error?.code||'')?error.code:'TERMINAL_OPERATION_FAILED'})).finally(()=>{queued--;});
    });send({type:'attached',terminalId:match[1],inputRequiresApproval:true});
   });
  })().catch(()=>reject(socket)).finally(()=>{clearTimeout(timer);pending.delete(socket);});
 };
 server.on('upgrade',upgrade);
 return{async close(){closing=true;server.off('upgrade',upgrade);for(const socket of pending)socket.destroy();for(const ws of wss.clients)ws.terminate();await CanonicalTerminal.shutdown();await new Promise(resolve=>wss.close(()=>resolve()));}};
}
