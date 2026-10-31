const {app,BrowserWindow,ipcMain,session,dialog,clipboard,safeStorage}=require('electron');
const {createServer,request}=require('node:http');
const {readFile}=require('node:fs/promises');
const {resolve,extname,sep}=require('node:path');
const {pathToFileURL}=require('node:url');
const {z}=require('zod');
const {attachTerminalProxy}=require('./terminalProxy.cjs');
let window,renderer,runtime,backend,csrf='',bootstrapPromise;
const backendRoot=resolve(__dirname,'../../../backend');
const port=5176,origin=`http://127.0.0.1:${port}`;
const inputSchema=z.object({id:z.string().uuid().optional(),kind:z.enum(['google','openai','anthropic','openai_compatible']),name:z.string().trim().min(1).max(100),baseUrl:z.string().url().optional(),apiKey:z.string().max(16000).optional(),isActive:z.boolean().optional()}).strict();
function trusted(event){if(!window||event.sender!==window.webContents||event.senderFrame!==window.webContents.mainFrame||new URL(event.senderFrame.url).origin!==origin)throw new Error('Untrusted desktop frame');}
function server(){const root=resolve(__dirname,'../dist');const listener=createServer(async(req,res)=>{
  if(req.headers.host!==`127.0.0.1:${port}`||(req.headers.origin&&req.headers.origin!==origin)){res.writeHead(403).end();return;}
  if(req.url.startsWith('/api/v1/')){
    const upstream=request({hostname:'127.0.0.1',port:8000,path:req.url,method:req.method,headers:{...req.headers,host:'127.0.0.1:8000'},timeout:180000},reply=>{res.writeHead(reply.statusCode??502,reply.headers);reply.pipe(res);});
    upstream.on('error',()=>{if(!res.headersSent)res.writeHead(503,{'Content-Type':'application/problem+json'});res.end(JSON.stringify({status:503,detail:'The Sirona backend is unavailable.'}));});upstream.on('timeout',()=>upstream.destroy());req.on('aborted',()=>upstream.destroy());res.on('close',()=>upstream.destroy());req.pipe(upstream);return;
  }
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
  try{const pathname=new URL(req.url,origin).pathname;if(pathname!=='/'&&!pathname.startsWith('/assets/')){res.writeHead(404).end();return;}const file=resolve(root,`.${pathname==='/'?'/index.html':decodeURIComponent(pathname)}`);if(!file.startsWith(root+sep)){res.writeHead(403).end();return;}const value=await readFile(file);res.writeHead(200,{'Content-Type':{'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.png':'image/png'}[extname(file)]??'application/octet-stream','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"});res.end(req.method==='HEAD'?undefined:value);}catch{res.writeHead(404).end();}
});listener.closeTerminalChannels=attachTerminalProxy(listener,{port,origin});return listener;}
async function bootstrap(){
  if(!runtime) {
    try {runtime=await backend.startBackend(process.env);}
    catch {throw new Error('The local backend could not start. Free port 8000 and 5176, then reconnect.');}
  }
  const {generateLauncherChallenge}=await import(pathToFileURL(resolve(backendRoot,'services/launcherChallenge.js')).href);
  const pair=generateLauncherChallenge();
  const response=await session.defaultSession.fetch(`${origin}/api/v1/session/bootstrap`,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({challenge:pair.challenge,clientNonce:pair.clientNonce})});
  const result=await response.json();if(!response.ok)throw new Error(result.detail||'Secure desktop sign-in failed');csrf=result.data.csrfToken;return result.data;
}
app.setName('Sirona Next');app.setPath('userData',resolve(app.getPath('appData'),'SironaNext'));
if(!app.requestSingleInstanceLock())app.quit();
else app.whenReady().then(async()=>{
  try{
    backend=await import(pathToFileURL(resolve(backendRoot,'server.js')).href);backend.loadEnvironment();
    const {DesktopCredentialBroker}=await import('../dist-electron/electron/security/credentialBroker.js');
    const {CredentialResolver}=await import(pathToFileURL(resolve(backendRoot,'dist-workspace/src/providers/credentialResolver.js')).href);
    let credentialReady=false;
    try{CredentialResolver.configureVault(new DesktopCredentialBroker(resolve(app.getPath('userData'),'credentials-v1')));credentialReady=true;}
    catch{console.error(JSON.stringify({event:'credential.broker_unavailable',code:'OS_CREDENTIAL_BROKER_UNAVAILABLE'}));}
    process.env.ALLOWED_ORIGINS=[process.env.ALLOWED_ORIGINS,origin].filter(Boolean).join(',');
    try {runtime=await backend.startBackend(process.env);}catch{/* Keep the UI available offline; reconnect retries the trusted backend owner. */}
    renderer=server();await new Promise((yes,no)=>{renderer.once('error',no);renderer.listen(port,'127.0.0.1',yes);});
    session.defaultSession.setPermissionRequestHandler((_contents,_permission,callback)=>callback(false));
    session.defaultSession.setPermissionCheckHandler(()=>false);
    ipcMain.handle('sirona-next:bootstrap',event=>{trusted(event);if(!bootstrapPromise)bootstrapPromise=bootstrap().finally(()=>{bootstrapPromise=null;});return bootstrapPromise;});
    ipcMain.handle('sirona-next:copy-text',(event,text)=>{trusted(event);clipboard.writeText(z.string().max(1000000).parse(text));});
    ipcMain.handle('sirona-next:pick-folder',async(event)=>{
      trusted(event);
      const result=await dialog.showOpenDialog(window,{title:'Select Project Folder',properties:['openDirectory','dontAddToRecent']});
      if(result.canceled||!result.filePaths||!result.filePaths.length)return null;
      return result.filePaths[0];
    });
    ipcMain.handle('sirona-next:credential-status',event=>{trusted(event);return {osEncryptionAvailable:Boolean(credentialReady&&safeStorage?.isEncryptionAvailable())};});
    ipcMain.handle('sirona-next:save-connection',async(event,raw)=>{
      trusted(event);const input=inputSchema.parse(raw);if(!csrf)throw new Error('Sign in before saving credentials');
      if(input.apiKey&&(!credentialReady||!DesktopCredentialBroker.isAvailable()))throw new Error('Windows credential protection is unavailable');
      const {id,...payload}=input;
      let response;
      try{response=await session.defaultSession.fetch(`${origin}/api/v1/provider-connections${id?`/${id}`:''}`,{method:id?'PATCH':'POST',credentials:'include',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf,Origin:origin},body:JSON.stringify(payload)});}
      finally{payload.apiKey=undefined;input.apiKey=undefined;}
      const result=await response.json();if(!response.ok)throw new Error(result.detail||'Could not save connection');return result.data.connection;
    });
    window=new BrowserWindow({title:'Sirona',width:1440,height:1024,minWidth:720,minHeight:600,backgroundColor:'#fdfdfb',webPreferences:{preload:resolve(__dirname,'preload.cjs'),sandbox:true,contextIsolation:true,nodeIntegration:false,webSecurity:true}});
    window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
    window.webContents.on('will-navigate',(event,url)=>{if(new URL(url).origin!==origin)event.preventDefault();});
    window.webContents.on('will-attach-webview',event=>event.preventDefault());
    await window.loadURL(origin);
  }catch{dialog.showErrorBox('Sirona could not start','Free port 8000 and 5176. This desktop app owns its existing backend process so launcher challenges remain single-use and trusted. No authentication bypass was attempted.');app.quit();}
});
app.on('window-all-closed',()=>app.quit());
let closing=false;
app.on('before-quit',event=>{if(closing)return;closing=true;event.preventDefault();void (async()=>{renderer?.closeTerminalChannels();renderer?.closeAllConnections();renderer?.close();await runtime?.stop();app.exit(0);})();});
