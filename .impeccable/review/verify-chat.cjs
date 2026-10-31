const { chromium } = require('C:/Users/bharg/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
(async () => {
 const browser = await chromium.launch({executablePath:'C:/Users/bharg/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe', headless:true, args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
 try {
 const context = await browser.newContext({viewport:{width:1440,height:960},deviceScaleFactor:1,permissions:['microphone'],reducedMotion:'reduce'});
 const page = await context.newPage();const errors=[];const checks=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://127.0.0.1:5174/');
 await page.getByRole('heading',{name:'A little idea. A lot of possibility.'}).waitFor();
 await page.screenshot({path:path.resolve('.impeccable/review/desktop.png')});
 await page.getByRole('button',{name:/Build something/}).click();
 assert.match(await page.getByRole('textbox',{name:'Prompt input'}).inputValue(),/Help me build/); checks.push('suggestions populate composer');
 await page.getByRole('button',{name:'Build',exact:true}).click();
 await page.getByRole('menuitem',{name:'Plan',exact:true}).click();
 await page.getByRole('button',{name:'Fable 5 High',exact:true}).click();
 await page.getByRole('tab',{name:/all/}).click();
 await page.getByPlaceholder('Search models').fill('kimi');
 assert.equal(await page.getByRole('button',{name:'Select Kimi K3',exact:true}).count(),1);
 await page.getByPlaceholder('Search models').fill('');
 await page.getByRole('button',{name:'Select Kimi K3',exact:true}).focus();
 await page.getByRole('button',{name:'Max',exact:true}).click();
 await page.getByRole('button',{name:'Toggle favourite for Kimi K3'}).click(); assert.equal(await page.getByRole('button',{name:'Toggle favourite for Kimi K3'}).getAttribute('aria-pressed'),'true'); await page.getByRole('button',{name:'Select Kimi K3',exact:true}).click(); checks.push('model search, favorites and effort selection');
 await page.getByRole('textbox',{name:'Prompt input'}).fill('Review @');
 await page.getByRole('button',{name:/@docs/}).click();
 assert.equal(await page.getByRole('textbox',{name:'Prompt input'}).inputValue(),'Review @docs ');checks.push('context insertion');
 await page.locator('input[type=file]').setInputFiles({name:'notes.txt',mimeType:'text/plain',buffer:Buffer.from('test notes')});
 await page.getByRole('button',{name:'Remove attachment notes.txt'}).waitFor();
 await page.getByRole('textbox',{name:'Prompt input'}).press('Shift+Enter');
 await page.getByRole('textbox',{name:'Prompt input'}).press('End');
 await page.getByRole('button',{name:'Submit prompt'}).click();
 await page.getByRole('log').getByText('Review @docs',{exact:true}).waitFor();
 assert.match(await page.locator('.message-metadata').textContent(),/Plan.*Kimi K3.*Max/);checks.push('submission preserves mode/model/effort/file metadata');
 await page.reload();await page.getByRole('log').getByText('Review @docs',{exact:true}).waitFor();checks.push('history survives reload');
 await page.screenshot({path:path.resolve('.impeccable/review/conversation.png')});
 await page.locator('.history-item').first().dblclick();
 await page.getByRole('textbox',{name:'Conversation name'}).fill('Composer integration check');
 await page.getByRole('button',{name:'Save',exact:true}).click();
 await page.getByRole('textbox',{name:'Search conversations'}).fill('no match');await page.getByText('No matching conversations.').waitFor();
 await page.getByRole('textbox',{name:'Search conversations'}).fill('');checks.push('rename and history search');
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Export conversation',exact:true}).click();assert.equal((await downloadPromise).suggestedFilename(),'sirona-conversation.json');checks.push('JSON export');
 assert.equal(await page.locator('.aic-root').getAttribute('data-theme'),'light'); assert.equal(await page.getByRole('button',{name:/Switch to .* theme/}).count(),0);
 await page.screenshot({path:path.resolve('.impeccable/review/light.png')});
 await page.getByRole('button',{name:/You.*Personal workspace/}).click();await page.getByRole('heading',{name:'Workspace settings'}).waitFor();
 await page.keyboard.press('Escape');assert.equal(await page.locator('dialog[open]').count(),0);checks.push('theme and settings dialog');
 assert.equal(await page.locator('.topbar').getByText('Personal workspace',{exact:true}).count(),0);
 await page.getByRole('button',{name:'New conversation',exact:true}).click();
 await page.getByRole('button',{name:'Record voice input'}).click();await page.getByRole('button',{name:'Stop voice recording'}).waitFor();
 await page.waitForTimeout(250);await page.getByRole('button',{name:'Stop voice recording'}).click();
 await page.getByRole('button',{name:/Remove attachment voice-/}).waitFor();checks.push('real MediaRecorder audio attachment using fake microphone');
 await page.getByRole('button',{name:/Remove attachment voice-/}).click();
 await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Close sidebar',exact:true}).last().click();
 await page.screenshot({path:path.resolve('.impeccable/review/mobile.png')});
 await page.getByRole('button',{name:'Fable 5 High',exact:true}).click();
 await page.screenshot({path:path.resolve('.impeccable/review/mobile-models.png')});
 const menu=await page.locator('[aria-label="Model selector"]').boundingBox();assert(menu.x>=0&&menu.x+menu.width<=390,`Model menu outside viewport: ${JSON.stringify(menu)}`);
 await page.getByLabel('Reasoning effort for Fable 5').selectOption('Max'); await page.keyboard.press('Escape');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);checks.push('390px mobile overflow and model menu');
 assert.deepEqual(errors,[]);console.log(JSON.stringify({checks,pageErrors:errors}));
 } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1});



