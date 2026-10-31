const { chromium } = require('C:/Users/bharg/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Users/bharg/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe',headless:true});
 const checks=[];const errors=[];
 try{
  const page=await browser.newPage({viewport:{width:1440,height:960},reducedMotion:'reduce'});
  page.on('pageerror',error=>errors.push(error.message));
  await page.routeWebSocket('**/socket.io/**',socket=>socket.close());
  await page.route('**/*',route=>{
   const url=new URL(route.request().url());
   if(url.pathname==='/health'||url.pathname.startsWith('/api/')||url.pathname.startsWith('/socket.io/')) return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Offline for isolated UI verification'})});
   return route.continue();
  });
  await page.goto('http://127.0.0.1:4174/');
  await page.getByRole('heading',{name:/Build with Sirona/}).waitFor();
  await page.getByText('Backend offline',{exact:true}).waitFor();
  assert.match(await page.locator('.studio').getAttribute('class'),/light/);
  assert.equal(await page.locator('.topbar').getByText('New conversation',{exact:true}).count(),0);
  await page.getByRole('button',{name:/Build something/}).click();
  assert.match(await page.getByRole('textbox',{name:'Prompt input'}).inputValue(),/build a new feature/);
  await page.getByRole('textbox',{name:'Prompt input'}).fill('Check the separated components');
  await page.getByRole('button',{name:'Submit prompt'}).click();
  await page.locator('.message-text').getByText('Check the separated components',{exact:true}).waitFor();
  checks.push('light-only shell and extracted composer/message offline flow');
  await page.locator('.history-item').first().dblclick();
  await page.getByRole('textbox',{name:'Conversation name'}).fill('Folder refactor check');
  await page.getByRole('button',{name:'Save',exact:true}).click();
  await page.getByRole('textbox',{name:'Search conversations'}).fill('absent-match');await page.getByText('No matching conversations.').waitFor();
  await page.getByRole('textbox',{name:'Search conversations'}).fill('');checks.push('separate sidebar search and rename form');
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export conversation',exact:true}).click();assert.match((await download).suggestedFilename(),/folder-refactor-check/);checks.push('header export');
  await page.getByRole('button',{name:/Settings Models & preferences/}).click();
  await page.getByRole('button',{name:'Cancel',exact:true}).waitFor(); await page.screenshot({path:'.taste-skill/settings-desktop.png'}); await page.keyboard.press('Escape'); await page.getByRole('dialog').waitFor({state:'hidden'});checks.push('moved provider settings modal');
  await page.screenshot({path:'.taste-skill/conversation-desktop.png'});
  await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Close sidebar',exact:true}).last().click();
  await page.screenshot({path:'.taste-skill/conversation-mobile.png'}); const sendBox=await page.getByRole('button',{name:'Submit prompt'}).boundingBox();assert(sendBox.x>=0&&sendBox.x+sendBox.width<=390,'Send action is clipped');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.getByRole('button',{name:'Open sidebar'}).click();await page.getByRole('textbox',{name:'Search conversations'}).waitFor();checks.push('mobile layout/sidebar');
  await page.getByRole('button',{name:/Settings Models & preferences/}).click();
  await page.screenshot({path:'.taste-skill/settings-mobile.png'});
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Close sidebar',exact:true}).last().click();
  await page.locator('.aic-model-trigger-btn').click();
  await page.screenshot({path:'.taste-skill/models-mobile.png'});
  await page.keyboard.press('Escape');
  checks.push('settings Escape and mobile model menu');

  await page.close();
  const online=await browser.newPage({viewport:{width:1440,height:960}});online.on('pageerror',error=>errors.push(error.message));
  await online.routeWebSocket('**/socket.io/**',socket=>socket.close());
  const session={id:'test-session',title:'Existing conversation',model:'gemini-2.5-flash',last_activity_at:'2026-10-25T00:00:00Z'};
  await online.route('**/*',route=>{
   const p=new URL(route.request().url()).pathname;
   let body;
   if(p==='/health') body={db:true,service:'UI verification'};
   else if(p==='/api/sessions') body={sessions:[session],total:1};
   else if(p==='/api/settings') body={settings:{default_model:'gemini-2.5-flash'}};
   else if(p==='/api/sessions/test-session/messages') body={messages:[{id:'assistant-test',session_id:session.id,role:'assistant',content:'A response loaded from the mocked backend.',reasoning:'A reasoning section loaded from the mocked backend.',created_at:'2026-10-25T00:00:00Z'}],total:1};
   else if(p.startsWith('/socket.io/')) return route.fulfill({status:503,body:'mock socket disabled'});
   if(!body && p.startsWith('/api/')) return route.fulfill({status:404,contentType:'application/json',body:JSON.stringify({message:'Not part of test fixtures'})}); if(body) return route.fulfill({contentType:'application/json',body:JSON.stringify(body)});
   return route.continue();
  });
  await online.goto('http://127.0.0.1:4174/');await online.getByText('A response loaded from the mocked backend.',{exact:true}).waitFor();
  await online.getByRole('button',{name:/Reasoning & Thought Process/}).click();await online.getByText('A reasoning section loaded from the mocked backend.',{exact:true}).waitFor();
  checks.push('backend-loaded message and extracted reasoning block');
  assert.deepEqual(errors,[]);console.log(JSON.stringify({checks,pageErrors:errors,liveProviderCalls:false}));
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});

