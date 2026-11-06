const {app,BrowserWindow,ipcMain,session,dialog,clipboard,safeStorage}=require('electron');
const {createServer,request}=require('node:http');
const {readFile,stat,readdir}=require('node:fs/promises');
const {resolve,extname,sep}=require('node:path');
const {pathToFileURL}=require('node:url');
const crypto=require('node:crypto');
const {z}=require('zod');
const {attachTerminalProxy}=require('./terminalProxy.cjs');
let window,renderer,runtime,backend,csrf='',bootstrapPromise;
const backendRoot=resolve(__dirname,'../../server');
const port=5176,origin=`http://127.0.0.1:${port}`;
const inputSchema=z.object({id:z.string().uuid().optional(),kind:z.enum(['google','openai','anthropic','openai_compatible']),name:z.string().trim().min(1).max(100),baseUrl:z.string().url().optional(),apiKey:z.string().max(16000).optional(),isActive:z.boolean().optional()}).strict();
function trusted(event){if(!window||event.sender!==window.webContents||event.senderFrame!==window.webContents.mainFrame||new URL(event.senderFrame.url).origin!==origin)throw new Error('Untrusted desktop frame');}
const { server } = require("./server.cjs");
async function bootstrap(){
  if(!runtime) {
    let alreadyRunning = false;
    try {
      const ping = await fetch('http://127.0.0.1:8000/health/live');
      if (ping.ok) alreadyRunning = true;
    } catch {}
    if (!alreadyRunning) {
      try {runtime=await backend.startBackend(process.env);}
      catch(e) {
        console.error('[Sirona] bootstrap startBackend failed:', e);
        throw new Error('The local backend could not start. Free port 8000 and 5176, then reconnect.');
      }
    }
  }
  const {generateLauncherChallenge}=await import(pathToFileURL(resolve(backendRoot,'services/launcherChallenge.js')).href);
  const pair=generateLauncherChallenge();
  const response=await session.defaultSession.fetch(`${origin}/api/v1/session/bootstrap`,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({challenge:pair.challenge,clientNonce:pair.clientNonce})});
  const result=await response.json();if(!response.ok)throw new Error(result.detail||'Secure desktop sign-in failed');csrf=result.data.csrfToken;return result.data;
}
app.setName('Sirona Next');app.setPath('userData',resolve(app.getPath('appData'),'SironaNext'));
if(!app.requestSingleInstanceLock())app.quit();
else {
  app.on('second-instance', () => {
    if (window) {
      if (window.isMinimized()) window.restore();
      window.focus();
    }
  });
  app.whenReady().then(async()=>{
  try{
    backend=await import(pathToFileURL(resolve(backendRoot,'server.js')).href);backend.loadEnvironment();
    process.env.SIRONA_DB_PATH = resolve(backendRoot, 'data/sirona.db');
    const {DesktopCredentialBroker}=await import(pathToFileURL(resolve(__dirname,'../dist/security/credentialBroker.js')).href);
    const {CredentialResolver}=await import(pathToFileURL(resolve(backendRoot,'dist-workspace/src/providers/credentialResolver.js')).href);
    let credentialReady=false;
    try{CredentialResolver.configureVault(new DesktopCredentialBroker(resolve(app.getPath('userData'),'credentials-v1')));credentialReady=true;}
    catch{console.error(JSON.stringify({event:'credential.broker_unavailable',code:'OS_CREDENTIAL_BROKER_UNAVAILABLE'}));}
    process.env.ALLOWED_ORIGINS=[process.env.ALLOWED_ORIGINS,origin].filter(Boolean).join(',');
    let backendLive = false;
    try {
      const ping = await fetch('http://127.0.0.1:8000/health/live');
      if (ping.ok) backendLive = true;
    } catch {}
    if (!backendLive) {
      try {
        runtime = await backend.startBackend(process.env);
      } catch (err) {
        console.error('[Sirona] Backend startup error:', err?.message || err);
      }
    } else {
      console.log('[Sirona] Attached to canonical backend on port 8000');
    }
    try {
      renderer=server();await new Promise((yes,no)=>{renderer.once('error',no);renderer.listen(port,'127.0.0.1',yes);});
    } catch(err) {
      if (err.code !== 'EADDRINUSE') throw err;
      console.log(`[Sirona] Reusing existing web server on port ${port}`);
    }
    try { await session.defaultSession.clearCache(); } catch {}
    try {
      if (!bootstrapPromise) bootstrapPromise = bootstrap().finally(() => { bootstrapPromise = null; });
      await bootstrapPromise;
      console.log('[Sirona] Desktop authenticated session established');
    } catch (err) {
      console.warn('[Sirona] Initial desktop bootstrap deferred:', err?.message || err);
    }
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
      trusted(event);const input=inputSchema.parse(raw);
      if(!csrf){
        if(!bootstrapPromise)bootstrapPromise=bootstrap().finally(()=>{bootstrapPromise=null;});
        await bootstrapPromise;
      }
      if(!csrf)throw new Error('Sign in before saving credentials');
      if(input.apiKey&&(!credentialReady||!DesktopCredentialBroker.isAvailable()))throw new Error('Windows credential protection is unavailable');
      const {id,...payload}=input;
      let response;
      try{response=await session.defaultSession.fetch(`${origin}/api/v1/provider-connections${id?`/${id}`:''}`,{method:id?'PATCH':'POST',credentials:'include',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf,Origin:origin},body:JSON.stringify(payload)});}
      finally{payload.apiKey=undefined;input.apiKey=undefined;}
      const result=await response.json();if(!response.ok)throw new Error(result.detail||'Could not save connection');return result.data.connection;
    });
    window=new BrowserWindow({
      title:'Sirona',
      width:1440,
      height:1024,
      minWidth:720,
      minHeight:600,
      backgroundColor:'#1c1c1c',
      frame:false,
      titleBarStyle:'hidden',
      titleBarOverlay:{
        color:'#00000000',
        symbolColor:'#888888',
        height:44
      },
      webPreferences:{
        preload:resolve(__dirname,'preload.cjs'),
        sandbox:true,
        contextIsolation:true,
        nodeIntegration:false,
        webSecurity:true
      }
    });
    window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
    window.webContents.on('will-navigate',(event,url)=>{if(new URL(url).origin!==origin)event.preventDefault();});
    window.webContents.on('will-attach-webview',event=>event.preventDefault());
    window.webContents.on('console-message', (event, level, message, line, sourceId) => {
      const msg = typeof event === 'object' && event?.message !== undefined ? event.message : message;
      const lvl = typeof event === 'object' && event?.level !== undefined ? event.level : level;
      const src = typeof event === 'object' && event?.sourceId !== undefined ? event.sourceId : sourceId;
      const ln = typeof event === 'object' && event?.line !== undefined ? event.line : line;
      console.log(`[RENDERER:${lvl}] ${msg} (${src}:${ln})`);
    });
    window.webContents.openDevTools({ mode: 'right' });
    await window.loadURL(origin);
  }catch(err){
    console.error('[Sirona Desktop Error]', err);
    dialog.showErrorBox('Sirona could not start', (err && err.message) ? err.message : 'Free port 8000 and 5176.');
    app.quit();
  }
});
}
app.on('window-all-closed',()=>app.quit());
let closing=false;
app.on('before-quit',event=>{if(closing)return;closing=true;event.preventDefault();void (async()=>{renderer?.closeTerminalChannels();renderer?.closeAllConnections();renderer?.close();await runtime?.stop();app.exit(0);})();});
