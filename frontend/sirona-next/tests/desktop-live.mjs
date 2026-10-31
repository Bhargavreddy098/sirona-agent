// Real Electron + PostgreSQL + configured-provider qualification. No inference mocking.
import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const report={started:new Date().toISOString(),checks:[],streams:[]};
const evidence='design/evidence';await fs.mkdir(evidence,{recursive:true});
const capture=async name=>{try{const png=await Promise.race([app.evaluate(async({BrowserWindow})=>(await BrowserWindow.getAllWindows()[0].webContents.capturePage()).toPNG().toString('base64')),new Promise((_,reject)=>setTimeout(()=>reject(new Error('capture timeout')),7000))]);await fs.writeFile(`${evidence}/${name}`,Buffer.from(png,'base64'));}catch{report.captureWarning='A desktop capture was unavailable; functional checks continued';}};
let app,page,csrf='',conversationTitle=`Standalone live qualification ${Date.now()}`;
const launch=async()=>{
  app=await electron.launch({args:['--force-device-scale-factor=1','.'],executablePath:'node_modules/electron/dist/electron.exe',timeout:30000});
  page=await app.firstWindow();
  page.on('request',request=>{if(request.url().endsWith('/turns'))csrf=request.headers()['x-csrf-token']??csrf;});
  page.on('response',response=>{if(response.url().endsWith('/turns'))void response.text().then(text=>report.streams.push({tokens:(text.match(/"type":"token"/g)||[]).length,done:(text.match(/"type":"done"/g)||[]).length,status:response.status()})).catch(()=>{});});
  await page.getByRole('heading',{name:'A little space to think.'}).waitFor();
  await page.getByRole('button',{name:'Reconnect',exact:true}).waitFor({state:'hidden',timeout:30000});
};
const saved=async()=>page.evaluate(async()=>{const r=await fetch('/api/v1/conversations?scope=standalone',{credentials:'include'});return(await r.json()).data.sessions;});
const api=async(path,method='GET',body)=>page.evaluate(async({path,method,body,csrf})=>{const response=await fetch(`/api/v1${path}`,{method,credentials:'include',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf,'X-Request-ID':crypto.randomUUID()},...(body===undefined?{}:{body:JSON.stringify(body)})});return{status:response.status,value:await response.json()};},{path,method,body,csrf});
async function send(prompt){await page.getByLabel('Message the selected model',{exact:true}).fill(prompt);await page.getByRole('button',{name:'Send message',exact:true}).click();await page.getByRole('button',{name:'Stop generation',exact:true}).waitFor({state:'visible',timeout:15000});await page.getByRole('button',{name:'Stop generation',exact:true}).waitFor({state:'hidden',timeout:90000});const errors=await page.getByRole('alert').allTextContents();assert.deepEqual(errors,[],errors.join(';'));return page.getByRole('article',{name:'Assistant response'}).last().innerText();}
try{
  await launch();report.checks.push('Secure Electron bootstrap');
  const projectsBefore=await api('/projects');assert.equal(projectsBefore.status,200);
  await send('hii');report.checks.push('Real hii streamed and completed');
  const chats=await saved(),conversation=chats[0];assert.ok(conversation);assert.equal(conversation.project_id,null);
  const projectsAfter=await api('/projects');assert.equal(projectsAfter.value.data.projects.length,projectsBefore.value.data.projects.length);report.checks.push('Standalone chat created without hidden project');
  const context=await send('What was the first message I sent in this chat? Reply with only that message.');assert.match(context.toLowerCase(),/hii/);report.checks.push('Real follow-up retained prior context');
  await page.getByRole('button',{name:'Conversation options'}).click();await page.getByRole('button',{name:'Rename conversation',exact:true}).click();await page.getByLabel('Title',{exact:true}).fill(conversationTitle);await page.getByRole('button',{name:'Save title',exact:true}).click();await page.getByRole('dialog',{name:'Rename conversation'}).waitFor({state:'hidden'});
  const cancellationPrompt='Explain SSE and turn leases in twelve concise sentences.';
  await page.getByLabel('Message the selected model',{exact:true}).fill(cancellationPrompt);await page.getByRole('button',{name:'Send message',exact:true}).click();await page.getByRole('button',{name:'Stop generation',exact:true}).waitFor();
  await page.waitForTimeout(500); // Controlled cancellation during the active network request.
  await page.getByRole('button',{name:'Stop generation',exact:true}).click();await page.getByRole('button',{name:'Stop generation',exact:true}).waitFor({state:'hidden',timeout:20000});
  await page.getByRole('button',{name:'Retry this turn',exact:true}).waitFor({timeout:15000});report.checks.push('Cancellation reconciled as a saved cancelled turn');
  await capture('04-electron-cancelled.png');
  await page.getByRole('button',{name:'Retry this turn',exact:true}).click();await page.getByRole('button',{name:'Stop generation',exact:true}).waitFor();await page.getByRole('button',{name:'Stop generation',exact:true}).waitFor({state:'hidden',timeout:90000});
  assert.deepEqual(await page.getByRole('alert').allTextContents(),[]);
  const messages=await api(`/conversations/${conversation.id}/messages?limit=500`);assert.equal(messages.value.data.messages.filter(message=>message.role==='user'&&message.content===cancellationPrompt).length,1);assert.equal(messages.value.data.messages.at(-1).status,'completed');report.checks.push('Cancelled turn retried with one durable user prompt');
  await capture('05-electron-live-context.png');
  // Explicit test project via canonical API; never created as a standalone-chat prerequisite.
  const project=await api('/projects','POST',{name:`Sirona qualification project ${Date.now()}`,primaryPath:'C:\\Sirona-QA-metadata-only'});assert.equal(project.status,201);report.projectId=project.value.data.project.id;report.projectName=project.value.data.project.name;
  await app.close();await launch();report.checks.push('Electron restart and secure reauthentication');
  await page.getByRole('button',{name:new RegExp(`^${conversationTitle}`)}).click();await page.getByRole('article',{name:'Your message'}).first().waitFor();assert.ok((await page.getByRole('article',{name:'Assistant response'}).allTextContents()).some(text=>/hii/i.test(text)));report.checks.push('Persisted standalone conversation and context restored');
  await page.getByRole('button',{name:'Projects',exact:true}).click();await page.getByRole('button',{name:report.projectName,exact:true}).click();await page.getByRole('button',{name:'New project chat',exact:true}).click();
  const projectAnswer=await send('Reply with exactly PROJECT_CHAT_OK.');assert.match(projectAnswer,/PROJECT_CHAT_OK/);report.checks.push('Real project conversation streamed through existing project API');
  const standalone=await saved();assert.ok(!standalone.some(item=>item.project_id===report.projectId));report.checks.push('Project and standalone histories remain separate');
  await capture('06-electron-project-live.png');
  assert.ok(report.streams.some(stream=>stream.tokens>1&&stream.done===1));
  report.result='passed';
}catch(error){report.result='failed';report.failure=error.message;await capture('desktop-live-failure.png');process.exitCode=1;}
finally{await fs.writeFile(`${evidence}/desktop-live.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));await app?.close().catch(()=>{});}
