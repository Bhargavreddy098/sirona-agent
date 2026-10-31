const fs=require('node:fs'),path=require('node:path'),ts=require('../backend/node_modules/typescript');
const backend=path.resolve('backend'),snapshot=path.resolve('.tmp/p5-repair-20261029/backend');
const currentWorker=fs.readFileSync('backend/services/agentWorkerService.js','utf8');
const beforeWorker=currentWorker.replace("    const graphOwner=await import('../dist-workspace/src/orchestration/graphRuntime.js');\n    if(await graphOwner.isGraphRun({query},runId))return graphOwner.workspaceGraphRuntime().execute(runId,options.session);\n",'').replace('"completed" | "failed" | "blocked"','"completed" | "failed"');
const workerBackup=path.join(snapshot,'services/agentWorkerService.js');if(!fs.existsSync(workerBackup))fs.writeFileSync(workerBackup,beforeWorker);
const config=ts.readConfigFile(path.join(backend,'jsconfig.json'),ts.sys.readFile);const parsed=ts.parseJsonConfigFileContent(config.config,ts.sys,backend);
const canonical=p=>path.resolve(p).toLowerCase();const originals=new Map();
function walk(dir){for(const d of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,d.name);if(d.isDirectory())walk(f);else if(f.endsWith('.js'))originals.set(canonical(path.join(backend,path.relative(snapshot,f))),fs.readFileSync(f,'utf8'));}}
walk(snapshot);
function check(baseline){const host=ts.createCompilerHost(parsed.options),read=host.readFile.bind(host);host.readFile=f=>baseline&&originals.has(canonical(f))?originals.get(canonical(f)):read(f);const program=ts.createProgram(parsed.fileNames,parsed.options,host);const result=ts.getPreEmitDiagnostics(program);return result.map(d=>({file:d.file?path.relative(backend,d.file.fileName).replaceAll('\\','/'):'config',code:d.code}));}
const before=check(true),after=check(false),counts=rows=>{const m=new Map();for(const d of rows){const k=d.file+':'+d.code;m.set(k,(m.get(k)||0)+1);}return m;},a=counts(after),b=counts(before);
const added=[...a].filter(([k,v])=>v>(b.get(k)||0)).map(([key,count])=>({key,count:count-(b.get(key)||0)}));
const result={baselineMethod:'Compiler host substitutes saved pre-repair JS bytes; P4 files match accepted hashes; worker reconstructed by reversing only this task additions.',beforeCount:before.length,afterCount:after.length,addedDiagnosticCounts:added,currentDiagnostics:after};
fs.writeFileSync('docs/integration/evidence/workspace-p5-repair/static-baseline-comparison.json',JSON.stringify(result,null,2));console.log(JSON.stringify({before:before.length,after:after.length,added}));
