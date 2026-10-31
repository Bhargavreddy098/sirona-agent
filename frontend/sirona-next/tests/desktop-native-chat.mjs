import {_electron as electron,chromium} from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const report={result:'running',checks:[]};let app;
try{
  // Restart only the owned, idle desktop so its embedded backend loads the change.
  const [port]=(await fs.readFile(process.env.APPDATA+'/SironaNext/DevToolsActivePort','utf8')).split('\n');
  const browser=await chromium.connectOverCDP('http://127.0.0.1:'+port.trim(),{timeout:3000}).catch(()=>null);
  const existing=browser?.contexts().flatMap(c=>c.pages()).find(p=>p.url().startsWith('http://127.0.0.1:5176'));
  if(existing){assert.equal(await existing.getByRole('button',{name:'Stop generation',exact:true}).count(),0,'Do not interrupt active generation');assert.equal(await existing.locator('textarea').inputValue().catch(()=>''),'','Do not discard a draft');await existing.close();}
  await browser?.close().catch(()=>{});
  await new Promise(resolve=>setTimeout(resolve,1500));
  app=await electron.launch({args:['--force-device-scale-factor=1','.'],executablePath:'node_modules/electron/dist/electron.exe',timeout:30000});
  const page=await app.firstWindow();await page.getByRole('heading',{name:'A little space to think.'}).waitFor();
  await page.getByRole('button',{name:'Reconnect',exact:true}).waitFor({state:'hidden',timeout:30000});
  await page.getByRole('button',{name:'New chat',exact:true}).click();
  if(process.env.NATIVE_CHAT_TEST_MODEL){
    await page.getByRole('button',{name:'Select model',exact:true}).click();
    await page.getByLabel('Search models',{exact:true}).fill(process.env.NATIVE_CHAT_TEST_MODEL);
    await page.locator('.model-results section button').filter({has:page.locator('code').filter({hasText:new RegExp('^'+process.env.NATIVE_CHAT_TEST_MODEL.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$')})}).click();
  }
  const selected=await page.getByRole('button',{name:'Select model',exact:true}).innerText();
  let tokenCount=0;page.on('response',response=>{if(response.url().endsWith('/turns'))void response.text().then(text=>{tokenCount=(text.match(/"type":"token"/g)||[]).length;}).catch(()=>{});});
  await page.getByLabel('Message the selected model',{exact:true}).fill('Which AI model or model family are you? Answer briefly.');
  await page.getByRole('button',{name:'Send message',exact:true}).click();
  await page.getByRole('button',{name:'Stop generation',exact:true}).waitFor();
  await page.getByRole('button',{name:'Stop generation',exact:true}).waitFor({state:'hidden',timeout:90000});
  assert.deepEqual(await page.getByRole('alert').allTextContents(),[]);
  const response=page.getByRole('article',{name:'Assistant response'}).last();
  const content=await response.locator('.prose').innerText();assert.ok(content.length>10);assert.doesNotMatch(content,/sirona|autonomous developer agent/i);
  await response.getByRole('button',{name:'Copy message',exact:true}).waitFor();
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const sizes=await page.evaluate(()=>({message:getComputedStyle(document.querySelector('.message.assistant')).fontSize,composer:getComputedStyle(document.querySelector('textarea')).fontSize,header:getComputedStyle(document.querySelector('.workspace-header')).fontSize,overflow:document.documentElement.scrollWidth>innerWidth}));
  assert.equal(sizes.message,'16px');assert.equal(sizes.composer,'16px');assert.equal(sizes.overflow,false);
  const image=await app.evaluate(async({BrowserWindow})=>(await BrowserWindow.getAllWindows()[0].webContents.capturePage()).toPNG().toString('base64'));
  await fs.writeFile('design/evidence/11-native-chat-compact.png',Buffer.from(image,'base64'));
  report.result='passed';report.selectedModel=selected;report.response=content;report.tokenEvents=tokenCount;report.sizes=sizes;report.checks=['Real provider inference in a fresh conversation','No Sirona identity in provider response','Neutral Assistant transcript label','Compact desktop typography and no overflow'];
}catch(error){report.result='failed';report.failure=error.message;process.exitCode=1;}
finally{await fs.writeFile('design/evidence/desktop-native-chat.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));if(report.result==='passed'&&process.argv.includes('--keep-open'))await new Promise(resolve=>app.once('close',resolve));else await app?.close().catch(()=>{});}
