// Audit harness only: preserve app source; isolate native profile and capture fatal dialogs.
const {app,dialog}=require('electron');
const path=require('node:path');
const fs=require('node:fs');
for(const method of ['log','warn','error']){const original=console[method];console[method]=(...args)=>{fs.appendFileSync(path.join(__dirname,'electron-early-log.txt'),args.map(x=>x instanceof Error?x.stack:typeof x==='string'?x:JSON.stringify(x)).join(' ')+'\n');original(...args);};}
console.log('AUDIT_WRAPPER_READY');
const originalFetch=global.fetch;
global.fetch=async(...args)=>{console.log('AUDIT_FETCH_START',String(args[0]));try{const response=await originalFetch(...args);console.log('AUDIT_FETCH_END',response.status);return response;}catch(e){console.log('AUDIT_FETCH_FAILED',e.message);throw e;}};
app.on('ready',()=>console.log('AUDIT_ELECTRON_READY'));
app.on('browser-window-created',()=>console.log('AUDIT_WINDOW_CREATED'));
app.on('before-quit',()=>console.log('AUDIT_BEFORE_QUIT'));
app.setPath('appData',path.join(__dirname,'native-profile'));
dialog.showErrorBox=(title,message)=>console.error('AUDIT_STARTUP_ERROR',JSON.stringify({title,message}));
require('./snapshot/apps/desktop/src/main.cjs');
console.log('AUDIT_MAIN_REQUIRED');
