import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../../package.json',import.meta.url));
const {AIService}=require('./services/aiService.js');
const {ProviderService}=require('./services/providerService.js');

async function upstream(t:any,respond:(req:http.IncomingMessage,res:http.ServerResponse,body:any)=>void){
  const bodies:any[]=[];
  const server=http.createServer(async(req,res)=>{const chunks=[];for await(const chunk of req)chunks.push(chunk);const body=JSON.parse(Buffer.concat(chunks).toString());bodies.push(body);respond(req,res,body);});
  await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
  t.after(async()=>{server.closeAllConnections();await new Promise<void>((r,j)=>server.close(e=>e?j(e):r()));});
  return {url:`http://127.0.0.1:${(server.address() as any).port}`,bodies};
}
test('P5 bounded providers: invalid internal limits reject before DB/reservation/inference',async()=>{
  const valid={maxTokens:64,deadlineMs:1000,ceilingMicroUsd:'1000',operationKey:'bounded-contract'};
  for(const change of [{maxTokens:0},{maxTokens:1.5},{maxTokens:8193},{deadlineMs:120001},{ceilingMicroUsd:'-1'},{operationKey:''},{unknown:true}]){
    await assert.rejects(ProviderService.executeTurn({conversationId:'not-a-session',prompt:'test',activityLimits:{...valid,...change}}),{code:'INVALID_ACTIVITY_LIMITS'});
  }
  await assert.rejects(AIService.streamTurn({model:'not-a-model',maxTokens:0,apiKey:'dummy'}),{code:'INVALID_ACTIVITY_LIMITS'});
});
test('P5 bounded providers: real AI SDK HTTP request preserves exact ID, output cap, streaming and usage',async t=>{
  const source=await upstream(t,(_req,res)=>{
    res.writeHead(200,{'Content-Type':'text/event-stream'});
    res.end('data: '+JSON.stringify({candidates:[{content:{role:'model',parts:[{text:'bounded'}]},finishReason:'STOP'}],usageMetadata:{promptTokenCount:3,candidatesTokenCount:2,totalTokenCount:5}})+'\n\n');
  });
  const tokens:string[]=[];
  const result=await AIService.streamTurn({providerKind:'google',model:'exact-test-model',messages:[{role:'user',content:'test'}],apiKey:'dummy-key',baseUrl:source.url,adapter:'vercel_ai_sdk',nativeChat:true,maxTokens:64,onToken:(s:string)=>tokens.push(s)});
  assert.equal(source.bodies.length,1);
  assert.equal(source.bodies[0].generationConfig.maxOutputTokens,64);
  assert.equal(tokens.join(''),'bounded');assert.equal(result.content,'bounded');assert.equal(result.usage.totalTokens,5);
});
test('P5 bounded providers: native compatible transport caps output; ordinary calls retain unset limit',async t=>{
  const source=await upstream(t,(_req,res,body)=>{
    assert.equal(body.model,'exact-compatible-model');
    res.writeHead(200,{'Content-Type':'text/event-stream'});
    res.end('data: '+JSON.stringify({id:'chunk',object:'chat.completion.chunk',created:0,model:body.model,choices:[{index:0,delta:{content:'native'},finish_reason:null}]})+'\n\ndata: [DONE]\n\n');
  });
  for(const maxTokens of [32,undefined]){
    const result=await AIService.streamTurn({providerKind:'openai_compatible',model:'exact-compatible-model',messages:[{role:'user',content:'test'}],apiKey:'dummy-key',baseUrl:source.url,nativeChat:true,maxTokens});
    assert.equal(result.content,'native');
  }
  assert.equal(source.bodies[0].max_tokens,32);assert.equal('max_tokens' in source.bodies[1],false);
});
test('P5 bounded providers: native OpenAI transport sends completion cap and preserves reported usage',async t=>{
 const source=await upstream(t,(_req,res,body)=>{
   assert.equal(body.model,'exact-openai-model');res.writeHead(200,{'Content-Type':'text/event-stream'});
   res.end('data: '+JSON.stringify({id:'c',object:'chat.completion.chunk',created:0,model:body.model,choices:[{index:0,delta:{content:'ok'},finish_reason:null}]})+'\n\ndata: '+JSON.stringify({id:'c',object:'chat.completion.chunk',created:0,model:body.model,choices:[],usage:{prompt_tokens:3,completion_tokens:2,total_tokens:5}})+'\n\ndata: [DONE]\n\n');
 });
 const before=process.env.OPENAI_BASE_URL;process.env.OPENAI_BASE_URL=source.url;
 try{
   const result=await AIService.streamTurn({providerKind:'openai',model:'exact-openai-model',messages:[{role:'user',content:'test'}],apiKey:'dummy',nativeChat:true,maxTokens:48});
   assert.equal(source.bodies.length,1);assert.equal(source.bodies[0].max_completion_tokens,48);assert.equal(source.bodies[0].stream_options.include_usage,true);assert.equal(result.usage.totalTokens,5);
 }finally{if(before===undefined)delete process.env.OPENAI_BASE_URL;else process.env.OPENAI_BASE_URL=before;}
});
test('P5 bounded providers: native Anthropic transport sends cap and preserves final reported usage',async t=>{
 const source=await upstream(t,(_req,res,body)=>{
   assert.equal(body.model,'exact-anthropic-model');res.writeHead(200,{'Content-Type':'text/event-stream'});
   const events=[{type:'message_start',message:{id:'m',type:'message',role:'assistant',model:body.model,content:[],stop_reason:null,stop_sequence:null,usage:{input_tokens:3,output_tokens:0}}},{type:'content_block_start',index:0,content_block:{type:'text',text:''}},{type:'content_block_delta',index:0,delta:{type:'text_delta',text:'ok'}},{type:'content_block_stop',index:0},{type:'message_delta',delta:{stop_reason:'end_turn',stop_sequence:null},usage:{output_tokens:2}},{type:'message_stop'}];
   res.end(events.map(e=>'event: '+e.type+'\ndata: '+JSON.stringify(e)+'\n\n').join(''));
 });
 const before=process.env.ANTHROPIC_BASE_URL;process.env.ANTHROPIC_BASE_URL=source.url;
 try{
   const result=await AIService.streamTurn({providerKind:'anthropic',model:'exact-anthropic-model',messages:[{role:'user',content:'test'}],apiKey:'dummy',nativeChat:true,maxTokens:48});
   assert.equal(source.bodies.length,1);assert.equal(source.bodies[0].max_tokens,48);assert.equal(result.usage.totalTokens,5);
 }finally{if(before===undefined)delete process.env.ANTHROPIC_BASE_URL;else process.env.ANTHROPIC_BASE_URL=before;}
});
