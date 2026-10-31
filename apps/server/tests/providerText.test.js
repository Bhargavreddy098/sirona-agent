import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { GenerateContentResponse } from "@google/genai";

test("installed GenAI response text is a getter and the old method assumption throws offline", () => {
  const response = new GenerateContentResponse();
  response.candidates = [{ content: { parts: [{ text: "fixture text" }] } }];
  assert.equal(typeof Object.getOwnPropertyDescriptor(GenerateContentResponse.prototype, "text").get, "function");
  assert.equal(response.text, "fixture text");
  // Reflection deliberately invokes the runtime getter result as the old code did.
  const legacyValue = Object.getOwnPropertyDescriptor(GenerateContentResponse.prototype, "text").get.call(response);
  assert.throws(() => legacyValue(), TypeError);
});

test("existing Google streaming method consumes real SDK text/empty chunks without network or credentials", () => {
  const sdk = new URL("../node_modules/@google/genai/dist/node/index.mjs", import.meta.url).href;
  const service = new URL("../services/aiService.js", import.meta.url).href;
  const fakeModule = `export class GoogleGenAI { constructor() { this.models = { generateContentStream() { return globalThis.fixtureChunks(); } }; } }`;
  const script = `import assert from 'node:assert/strict';
    import {registerHooks} from 'node:module';
    import net from 'node:net';
    const {GenerateContentResponse}=await import(${JSON.stringify(sdk)});
    globalThis.fetch=()=>{throw Error('network forbidden');};
    net.Socket.prototype.connect=()=>{throw Error('network forbidden');};
    globalThis.fixtureChunks=async function*(){
      for(const text of ['first',undefined,' second']){
        const response=new GenerateContentResponse();
        response.candidates=[{content:{parts:text===undefined?[]:[{text}]}}];
        yield response;
      }
    };
    registerHooks({resolve(s,c,n){if(s==='@google/genai')return {url:${JSON.stringify('data:text/javascript,' + encodeURIComponent(fakeModule))},shortCircuit:true};return n(s,c);}});
    const {AIService}=await import(${JSON.stringify(service)});
    const tokens=[];
    const result=await AIService._streamGoogleGenAI({apiKey:undefined,model:'fixture-model',systemPrompt:'fixture',messages:[],onToken:text=>tokens.push(text)});
    assert.equal(result.content,'first second');assert.deepEqual(tokens,['first',' second']);
    assert.deepEqual(result.tool_calls,[]);assert.equal(result.reasoning,'');`;
  const child = spawnSync(process.execPath, ["--input-type=module", "-e", script], {
    encoding: "utf8", timeout: 10000, env: { SystemRoot: process.env.SystemRoot, NODE_ENV: "production" },
  });
  assert.equal(child.status, 0, child.stderr);
  assert.equal(child.stdout + child.stderr, "");
});
