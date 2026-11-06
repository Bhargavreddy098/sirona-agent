const {request}=require('node:http');
/** Exact terminal upgrade only. Authentication/ticket consumption remain in the backend. */
function attachTerminalProxy(server,{port,origin,backendPort=8000}){
 const sockets=new Set();
 const upgrade=(req,socket,head)=>{
  const count=name=>req.rawHeaders.filter((value,index)=>index%2===0&&value.toLowerCase()===name).length;
  if(req.method!=='GET'||count('host')!==1||count('origin')!==1||count('cookie')!==1||req.headers.host!==`127.0.0.1:${port}`||req.headers.origin!==origin||!/^\/api\/v1\/terminals\/[0-9a-f-]{36}\/channel\?ticket=[0-9a-f]{64}$/.test(req.url||'')){socket.end('HTTP/1.1 403 Rejected\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');return;}
  sockets.add(socket);let peer;
  const upstream=request({hostname:'127.0.0.1',port:backendPort,path:req.url,method:'GET',headers:{host:`127.0.0.1:${backendPort}`,origin,cookie:req.headers.cookie,connection:'Upgrade',upgrade:'websocket','sec-websocket-key':req.headers['sec-websocket-key'],'sec-websocket-version':req.headers['sec-websocket-version']},timeout:5000});
  const cleanup=()=>{sockets.delete(socket);upstream.destroy();peer?.destroy();};socket.once('close',cleanup);socket.on('error',cleanup);
  upstream.on('error',()=>socket.destroy());upstream.on('timeout',()=>upstream.destroy());
  upstream.on('response',res=>{res.resume();socket.end(`HTTP/1.1 ${res.statusCode||502} Rejected\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);});
  upstream.on('upgrade',(res,remote,remaining)=>{peer=remote;remote.setTimeout(0);remote.on('error',()=>socket.destroy());remote.once('close',()=>socket.destroy());
   const headers=['HTTP/1.1 101 Switching Protocols'];for(let i=0;i<res.rawHeaders.length;i+=2)headers.push(res.rawHeaders[i]+': '+res.rawHeaders[i+1]);socket.write(headers.join('\r\n')+'\r\n\r\n');if(remaining.length)socket.write(remaining);if(head.length)remote.write(head);remote.pipe(socket);socket.pipe(remote);
  });upstream.end();
 };
 server.on('upgrade',upgrade);return()=>{server.off('upgrade',upgrade);for(const socket of sockets)socket.destroy();};
}
module.exports={attachTerminalProxy};
