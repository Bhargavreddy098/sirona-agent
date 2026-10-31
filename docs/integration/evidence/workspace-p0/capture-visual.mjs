// Synthetic visual/interaction fixture only. Never used as live inference evidence.
import {chromium} from '../../../../frontend/sirona-next/node_modules/playwright/index.mjs';import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1487,height:1058},deviceScaleFactor:1});
const now=new Date('2026-10-28T10:24:00+05:30'),id='e4a9856c-f72a-4c20-b124-86024b0cbfb9';
const conversations=['A fresh perspective','Turn leases explanation','Ideas for notebook app','Sirona product naming','How turn leases work','Draft announcement'].map((title,index)=>({id:index===0?id:`fixture-${index}`,title,model:'auto',project_id:null,last_activity_at:new Date(now-(index<3?index*2400000:86400000+index*2400000)).toISOString()}));
const messages=[{id:'1',role:'user',content:'hii',status:'completed',timestamp:now/1000-120},{id:'2',role:'assistant',content:'Hi! What would you like to explore today?',status:'completed',timestamp:now/1000-120},{id:'3',role:'user',content:'Explain turn leases in one sentence.',status:'completed',timestamp:now/1000-60},{id:'4',role:'assistant',content:'A turn lease gives one client temporary ownership of a conversation so simultaneous requests do not conflict.',status:'completed',timestamp:now/1000}];
const models=[{id:'auto',name:'Auto',provider:'openai_compatible',connectionName:'freellmapi',providerConnectionId:'fixture-connection',hasConfiguredApiKey:true},{id:'vendor/model:tag',name:'Model with exact namespace',provider:'openai_compatible',connectionName:'Local gateway',providerConnectionId:'fixture-local',hasConfiguredApiKey:true},{id:'unconfigured/model',name:'Unconfigured model',provider:'google',hasConfiguredApiKey:false}];
const preferences={primaryModel:'auto',fallbackModel:'vendor/model:tag',auxiliaryModels:{fast:'auto',reasoning:'auto',embedding:'auto'}};
const errors=[];page.on('pageerror',error=>errors.push(error.message));
await page.clock.install({time:now});
await page.addInitScript(()=>{window.sirona={bootstrap:async()=>({principalId:'visual-fixture',workspaceId:'visual-fixture',expiresAt:'2099-01-01',csrfToken:'VISUAL_FIXTURE_ONLY'}),saveConnection:async()=>{throw new Error('No credentials are submitted by this visual test');},copyText:async text=>{window.visualCopiedText=text;}};});
await page.route('**/api/v1/**',async route=>{
  const path=new URL(route.request().url()).pathname;let data;
  if(path==='/api/v1/conversations'&&route.request().method()==='GET')data={sessions:conversations};
  else if(path.endsWith('/messages'))data={messages,total:messages.length};
  else if(path==='/api/v1/projects')data={projects:[{id:'visual-project',name:'Example project'}]};
  else if(path==='/api/v1/models')data={models};
  else if(path==='/api/v1/model-settings')data=preferences;
  else if(path==='/api/v1/providers')data={providers:[{id:'google',name:'Google Gemini'},{id:'openai',name:'OpenAI'},{id:'anthropic',name:'Anthropic'},{id:'openai_compatible',name:'OpenAI-compatible / Local'}]};
  else if(path==='/api/v1/provider-connections')data={connections:[{id:'visual-connection',kind:'openai_compatible',name:'freellmapi',baseUrl:'http://127.0.0.1:31415/v1',isActive:true,hasApiKey:false}]};
  else if(path.endsWith('/conversations'))data={sessions:[]};
  else if(path===`/api/v1/conversations/${id}`&&route.request().method()==='PATCH')data={conversation:conversations[0]};
  else {await route.fulfill({status:404,json:{detail:'Unmapped visual fixture endpoint'}});return;}
  await route.fulfill({json:{data}});
});
try{
  await page.goto('http://127.0.0.1:5178/');await page.getByRole('button',{name:/^A fresh perspective/}).click();await page.getByRole('article',{name:'Assistant response'}).last().waitFor();await page.evaluate(()=>{document.title='Sirona — synthetic visual QA fixture';});
  await fs.mkdir('C:/Users/bharg/OneDrive/Desktop/personal -agent/docs/integration/evidence/workspace-p0',{recursive:true});await page.screenshot({path:'C:/Users/bharg/OneDrive/Desktop/personal -agent/docs/integration/evidence/workspace-p0/visual-desktop.png'});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  messages.push({id:'5',role:'assistant',content:'```unknown-language\nconst greeting = \"hello\";\n```',status:'completed',timestamp:now/1000});await page.reload();await page.getByRole('button',{name:/^A fresh perspective/}).click();await page.getByRole('button',{name:'Copy code',exact:true}).waitFor();await page.getByRole('button',{name:'Copy code',exact:true}).click();await page.getByRole('button',{name:'Copied',exact:true}).waitFor();assert.equal(await page.evaluate(()=>window.visualCopiedText),'const greeting = \"hello\";\n');await page.screenshot({path:'C:/Users/bharg/OneDrive/Desktop/personal -agent/docs/integration/evidence/workspace-p0/visual-code.png'});
  await page.getByRole('button',{name:'Select model',exact:true}).click();await page.getByLabel('Search models',{exact:true}).fill('vendor/model:tag');assert.equal(await page.getByRole('button',{name:/Model with exact namespace/}).count(),1);await page.getByRole('button',{name:/Model with exact namespace/}).click();
  await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('heading',{name:'Model providers',exact:true}).waitFor();await page.screenshot({path:'C:/Users/bharg/OneDrive/Desktop/personal -agent/docs/integration/evidence/workspace-p0/visual-settings.png'});
  await page.getByRole('button',{name:'Add connection',exact:true}).click();assert.equal(await page.getByLabel('API key (optional)',{exact:true}).getAttribute('type'),'password');await page.getByRole('button',{name:'Close dialog',exact:true}).last().click();
  await page.getByRole('button',{name:'Projects',exact:true}).click();await page.getByRole('button',{name:'Example project',exact:true}).click();await page.getByRole('button',{name:'New project chat',exact:true}).waitFor();
  await page.setViewportSize({width:390,height:844});await page.reload();await page.getByRole('heading',{name:'A little space to think.'}).waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:'C:/Users/bharg/OneDrive/Desktop/personal -agent/docs/integration/evidence/workspace-p0/visual-mobile.png'});
  assert.deepEqual(errors,[]);await fs.writeFile('C:/Users/bharg/OneDrive/Desktop/personal -agent/docs/integration/evidence/workspace-p0/visual-qa.json',JSON.stringify({result:'passed',fixture:'Synthetic visual and interaction fixture only; no inference',checks:['desktop layout','unknown-language code fence and Copy code','exact model namespace search','provider settings','password input','separate Projects navigation','390px overflow'],pageErrors:errors},null,2));console.log('Synthetic visual/interaction checks passed; no inference mocked or claimed');
}finally{await browser.close();}
