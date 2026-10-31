const fs=require('node:fs');
let p='backend/tests/orchestrationWorkflow.test.ts',s=fs.readFileSync(p,'utf8');let start=s.indexOf("test('P5-07: Orchestration Workflow - LangGraph StateGraph compiles");let end=s.indexOf("test('P5-07: Orchestration Workflow - human approval",start);
s=s.slice(0,start)+`test('P5 graph unit: missing canonical activities fail closed', () => {
  assert.throws(() => buildWorkspaceGraph(undefined as any), /GRAPH_ACTIVITY_OWNER_REQUIRED/);
});

`+s.slice(end);fs.writeFileSync(p,s);
p='backend/tests/orchestrationRecovery.test.ts';s=fs.readFileSync(p,'utf8');start=s.indexOf("test('P5-06: Verification - independent verifier");end=s.indexOf("test('P5-06: Recovery - classifies",start);
s=s.slice(0,start)+`test('P5 security: candidate text cannot substitute for independent guest receipts', async () => {
  for (const candidate of ['function test() { return false; }', 'export default function test() { return true; }']) {
    await assert.rejects(verifyArtifact('art-1',candidate,['return true;'],{authenticated:true}), {code:'VERIFIER_RECEIPT_REQUIRED'});
  }
});

`+s.slice(end);fs.writeFileSync(p,s);
p='backend/tests/graphCheckpoint.test.ts';s=fs.readFileSync(p,'utf8').replace("await saver.putWrites(config, [['messages', 'another write']], 'task-lg-1');\n  const writes = await loadPendingWrites(legacy, runId, 5);\n  assert.ok(writes.some(w => w.includes('task-lg-1')));",`await saver.putWrites(putConfig, [['messages', 'another write']], 'task-lg-1');
  const recovered = await new SironaPostgresSaver(legacy).getTuple(putConfig);
  assert.deepEqual(recovered?.pendingWrites, [['task-lg-1','messages','another write']]);
  assert.deepEqual(recovered?.metadata, metadata);
  assert.equal(recovered?.config.configurable?.checkpoint_ns, '5');
  await assert.rejects(saver.getTuple({configurable:{thread_id:crypto.randomUUID(),run_id:runId}}),/GRAPH_THREAD_SCOPE_MISMATCH/);`);
fs.writeFileSync(p,s);
const pkg=JSON.parse(fs.readFileSync('backend/package.json','utf8'));const lock=JSON.parse(fs.readFileSync('backend/package-lock.json','utf8'));
for(const [n,v] of Object.entries({'@langchain/langgraph':'0.2.1','@langchain/langgraph-checkpoint':'0.0.18','@langchain/core':'0.2.36'})){pkg.dependencies[n]=v;lock.packages[''].dependencies[n]=v;}
fs.writeFileSync('backend/package.json',JSON.stringify(pkg,null,2)+'\n');fs.writeFileSync('backend/package-lock.json',JSON.stringify(lock,null,2)+'\n');
