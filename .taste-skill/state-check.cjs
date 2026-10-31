const { chromium } = require('C:/Users/bharg/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Users/bharg/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe',headless:true});
 const checks=[];
 try {
  const page=await browser.newPage({viewport:{width:1920,height:1080}});
  await page.routeWebSocket('**/socket.io/**', socket=>socket.close());
  let releaseSave;
  await page.route('**/*',async route=>{
   const path=new URL(route.request().url()).pathname;
   if(path==='/api/settings' && route.request().method()!=='GET') {
    await new Promise(resolve=>{releaseSave=resolve});
    return route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({error:'Settings could not be saved. Try again.'})});
   }
   if(path==='/health'||path.startsWith('/api/')||path.startsWith('/socket.io/')) return route.fulfill({status:503,contentType:'application/json',body:'{"error":"Offline UI fixture"}'});
   return route.continue();
  });
  await page.goto('http://127.0.0.1:4174/');
  await page.getByRole('heading',{name:'Build with Sirona'}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Submit prompt'}).isDisabled(),true);
  await page.screenshot({path:'.taste-skill/wide-1920.png'});
  await page.getByRole('button',{name:/Settings Models/}).click();
  assert.equal(await page.getByRole('button',{name:'Close settings'}).evaluate(el=>el===document.activeElement),true);
  await page.keyboard.press('Shift+Tab');
  assert.equal(await page.getByRole('button',{name:'Save settings',exact:true}).evaluate(el=>el===document.activeElement),true);
  await page.keyboard.press('Tab');
  assert.equal(await page.getByRole('button',{name:'Close settings'}).evaluate(el=>el===document.activeElement),true);
  await page.getByRole('button',{name:'Save settings',exact:true}).click();
  await page.getByRole('button',{name:'Saving settings'}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Saving settings'}).isDisabled(),true);
  await page.screenshot({path:'.taste-skill/settings-loading.png'});
  releaseSave(); await page.getByRole('alert').waitFor();
  await page.screenshot({path:'.taste-skill/settings-error.png'});
  await page.keyboard.press('Escape');
  checks.push('settings focus entry, Tab wrap, disabled/loading save, error alert, Escape');
  await page.setViewportSize({width:360,height:740});
  await page.getByRole('button',{name:'Close sidebar',exact:true}).last().click();
  await page.getByRole('textbox',{name:'Prompt input'}).fill('A deliberately long message '.repeat(100));
  const box=await page.getByRole('button',{name:'Submit prompt'}).boundingBox();
  assert(box.x>=0 && box.x+box.width<=360 && box.y+box.height<=740);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:'.taste-skill/narrow-360.png'});
  await page.getByRole('button',{name:'Open sidebar'}).click();
  await page.getByRole('textbox',{name:'Search conversations'}).fill('no matching conversation');
  await page.getByText('No matching conversations.').waitFor();
  await page.screenshot({path:'.taste-skill/empty-search.png'});
  await page.keyboard.press('Escape');
  checks.push('360px overflow, long input, visible send, empty search, sidebar Escape; 1920px layout');
  console.log(JSON.stringify({checks,liveProviderCalls:false}));
 } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
