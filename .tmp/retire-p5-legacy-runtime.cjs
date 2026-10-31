const fs=require('node:fs');let p='backend/src/orchestration/graphRuntime.ts',s=fs.readFileSync(p,'utf8');const start=s.indexOf('// Graph runtime owner: start/resume/pause/cancel/shutdown');const recovery=s.indexOf('export function classifyRecovery(',start);const end=s.indexOf('\nexport default',recovery);s=s.slice(0,start)+s.slice(recovery,end)+'\n';fs.writeFileSync(p,s);
p='backend/tests/orchestrationRecovery.test.ts';s=fs.readFileSync(p,'utf8').replace('  startGraphRun,\n  pauseGraphRun,\n  resumeGraphRun,\n  cancelGraphRun,','  WorkspaceGraphRuntime,');const from=s.indexOf("test('P5-06: Graph Runtime - start, pause, resume, cancel");s=s.slice(0,from)+`test('P5 runtime: default-off gate cannot be bypassed with authenticated=true',async()=>{
  const before=process.env.SIRONA_ORCHESTRATION_ENABLED;delete process.env.SIRONA_ORCHESTRATION_ENABLED;
  try {await assert.rejects(new WorkspaceGraphRuntime(legacy).execute(crypto.randomUUID(),{authenticated:true}),{code:'GRAPH_DISABLED'});}
  finally {if(before===undefined)delete process.env.SIRONA_ORCHESTRATION_ENABLED;else process.env.SIRONA_ORCHESTRATION_ENABLED=before;}
});
`;fs.writeFileSync(p,s);
