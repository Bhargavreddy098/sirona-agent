const fs=require('node:fs');
const path=require('node:path');
const {_electron}=require('../../apps/web/node_modules/playwright');
const root=__dirname;
const env={};
for(const name of ['SystemRoot','WINDIR','PATH','TEMP','TMP','USERPROFILE','COMSPEC','LOCALAPPDATA'])if(process.env[name])env[name]=process.env[name];
env.APPDATA=path.join(root,'native-profile');
env.NODE_ENV='production';
env.LOG_LEVEL='warn';
env.ALLOWED_ORIGINS='http://127.0.0.1:5176';
env.SIRONA_ORCHESTRATION_ENABLED='false';
env.SIRONA_TRUSTED_LOCAL_DOCKER_ENABLED='false';
env.SIRONA_P6_CONTEXT_ENABLED='false';
fs.mkdirSync(env.APPDATA,{recursive:true});
const report={mode:'Isolated unmodified source snapshot; reused installed dependencies; no configured credentials',pages:[],requests:[],errors:[]};
let app,log='';
(async()=>{
 try{
  app=await _electron.launch({executablePath:require('../../apps/desktop/node_modules/electron'),args:[path.join(root,'electron-entry.cjs')],cwd:root,env,timeout:45000});
  app.process().stdout.on('data',b=>log+=b.toString());
  app.process().stderr.on('data',b=>log+=b.toString());
  app.context().on('response',r=>{if(r.url().includes('/api/')||r.url().includes('/health'))report.requests.push({url:r.url(),status:r.status()});});
  await app.firstWindow({timeout:90000});
  let page;
  for(let tries=0;tries<300;tries++){page=app.context().pages().find(p=>p.url().startsWith('http://127.0.0.1:5176'));if(page)break;await new Promise(r=>setTimeout(r,100));}
  if(!page)throw new Error('Application page not found; DevTools excluded from audit');
  page.on('pageerror',e=>report.errors.push(e.message));
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(3000);
  report.pages.push({url:page.url(),body:await page.locator('body').innerText()});
  report.bridge=await page.evaluate(()=>({methods:Object.keys(window.sirona||{}),hasLegacyBridge:!!window.sironaDesktop}));
  report.readonlyApi=await page.evaluate(async()=>{const result={};for(const route of ['/api/v1/session','/api/v1/conversations?scope=standalone','/api/v1/providers','/api/v1/models','/health/live','/health/ready']){try{const r=await fetch(route);const data=await r.json();result[route]={status:r.status,keys:Object.keys(data),code:data.code,detail:data.detail};}catch(e){result[route]={error:String(e)}}}return result;});
  await page.screenshot({path:path.join(root,'electron-startup.png')});
  const created=page.waitForResponse(r=>r.url().endsWith('/api/v1/conversations')&&r.request().method()==='POST');
  await page.getByRole('button',{name:'New session',exact:true}).click();
  const creation=await created;
  report.newSession={status:creation.status(),body:await creation.json()};
  report.projectCreate=await page.evaluate(async()=>{const auth=await window.sirona.bootstrap();const r=await fetch('/api/v1/projects',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':auth.csrfToken},body:JSON.stringify({name:'Disposable audit project'})});return{status:r.status,body:await r.json()};});
  await page.keyboard.press('Control+,');
  await page.waitForTimeout(500);
  report.settings=await page.locator('body').innerText();
  await page.screenshot({path:path.join(root,'electron-settings.png')});
  await page.getByRole('button',{name:'Worktrees',exact:true}).click();
  await page.waitForTimeout(700);
  report.worktrees=await page.locator('[data-testid="settings-screen"]').innerText();
  await page.screenshot({path:path.join(root,'electron-worktrees.png')});
 }catch(e){report.errors.push(String(e));process.exitCode=1;}
 finally{
  if(app){try{await app.close();}catch(e){report.errors.push('close: '+e.message);}}
  fs.writeFileSync(path.join(root,'electron-audit.json'),JSON.stringify(report,null,2));
  fs.writeFileSync(path.join(root,'electron-log.txt'),log);
  console.log(JSON.stringify({pageCount:report.pages.length,bridge:report.bridge,api:report.readonlyApi,errors:report.errors},null,2));
 }
})();
