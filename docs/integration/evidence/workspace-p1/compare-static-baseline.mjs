// Diagnose unchanged legacy failures without hiding/excluding them from full checks.
import ts from '../../../../backend/node_modules/typescript/lib/typescript.js';
import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url)),backend=path.resolve(here,'../../../../backend');
const before=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(here,'private/source-before.json.gz'))));
const originals=new Map(before.map(file=>[path.resolve(backend,'..',file.path).toLowerCase(),Buffer.from(file.content,'base64').toString('utf8')]));
const config=ts.readConfigFile(path.join(backend,'jsconfig.json'),ts.sys.readFile);
const parsed=ts.parseJsonConfigFileContent(config.config,ts.sys,backend);
function diagnose(baseline){
 const host=ts.createCompilerHost(parsed.options),read=host.readFile.bind(host);
 if(baseline)host.readFile=file=>originals.get(path.resolve(file).toLowerCase())??read(file);
 const program=ts.createProgram(parsed.fileNames,parsed.options,host);
 return ts.getPreEmitDiagnostics(program).map(d=>({file:d.file?path.relative(backend,d.file.fileName).split(path.sep).join('/'):'configuration',code:d.code}));
}
const baseline=diagnose(true),current=diagnose(false),remaining=[...baseline],introduced=[];
for(const diagnostic of current){const index=remaining.findIndex(old=>old.file===diagnostic.file&&old.code===diagnostic.code);if(index>=0)remaining.splice(index,1);else introduced.push(diagnostic);}
const report={checkedAt:new Date().toISOString(),method:'Same current compiler/config/dependencies; virtual read host substitutes exact pre-P1 file bytes for baseline. Full checks still run independently and remain failing where legacy source is invalid.',baselineCount:baseline.length,currentCount:current.length,introduced,resolved:remaining,baseline,current,result:introduced.length?'failed':'passed',limits:'No waiver of legacy errors or full-production qualification. New TS is separately checked strictly.'};
fs.writeFileSync(path.join(here,'static-baseline-comparison.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({result:report.result,baselineCount:baseline.length,currentCount:current.length,introduced}));if(introduced.length)process.exitCode=1;
