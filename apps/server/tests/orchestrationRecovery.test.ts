import {test} from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {legacy} from './typedDatabaseBoundary.test.js';
import {WorkspaceGraphRuntime} from '../src/orchestration/graphRuntime.js';
import {verifyArtifact,executeToolCall} from '../src/orchestration/activityAdapter.js';
test('P5 security: candidate text and authenticated booleans cannot replace trusted evidence/identity',async()=>{
 for(const candidate of ['bad','export default function test(){ return true; }'])
  await assert.rejects(verifyArtifact('fake',candidate,['return true'],{authenticated:true}),{code:'VERIFIER_RECEIPT_REQUIRED'});
 await assert.rejects(executeToolCall('execute_command',{}, {authenticated:true} as any),{code:'GRAPH_AUTHORITY_REQUIRED'});
});
test('P5 runtime: default-off gate cannot be bypassed with authenticated=true',async()=>{
 const before=process.env.SIRONA_ORCHESTRATION_ENABLED;delete process.env.SIRONA_ORCHESTRATION_ENABLED;
 try{await assert.rejects(new WorkspaceGraphRuntime(legacy).execute(crypto.randomUUID(),{authenticated:true}),{code:'GRAPH_DISABLED'});}
 finally{if(before===undefined)delete process.env.SIRONA_ORCHESTRATION_ENABLED;else process.env.SIRONA_ORCHESTRATION_ENABLED=before;}
});
test('P5 local privacy: externally enabled LangChain tracing cannot capture graph content',async()=>{
 const oldFlag=process.env.SIRONA_ORCHESTRATION_ENABLED,oldTrace=process.env.LANGCHAIN_TRACING;
 process.env.SIRONA_ORCHESTRATION_ENABLED='true';process.env.LANGCHAIN_TRACING='true';
 try{await assert.rejects(new WorkspaceGraphRuntime(legacy).execute(crypto.randomUUID(),{authenticated:true}),{code:'EXTERNAL_TRACING_FORBIDDEN'});}
 finally{if(oldFlag===undefined)delete process.env.SIRONA_ORCHESTRATION_ENABLED;else process.env.SIRONA_ORCHESTRATION_ENABLED=oldFlag;if(oldTrace===undefined)delete process.env.LANGCHAIN_TRACING;else process.env.LANGCHAIN_TRACING=oldTrace;}
});
