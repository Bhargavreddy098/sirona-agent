const fs=require('node:fs'),crypto=require('node:crypto'),path=require('node:path');const hashes=JSON.parse(fs.readFileSync('docs/integration/evidence/workspace-p4/source-hashes.json','utf8').replace(/^\uFEFF/,''));
for(const name of ['aiService','providerService']){
 const file='backend/services/'+name+'.js';let s=fs.readFileSync(file,'utf8');
 if(name==='aiService'){
  s=s.replace('    maxTokens = undefined,\n','').replace(/    if\(maxTokens!==undefined && [^\n]+\n/,'');
  s=s.replaceAll(', maxTokens });',' });').replaceAll(', maxTokens = undefined })',' })');
  s=s.replaceAll(', tools, maxTokens = undefined })',', tools })');
  s=s.replace(/^\s*maxTokens,\n/gm,'').replace(/^\s*\.\.\.\(maxTokens===undefined\?\{\}:\{[^\n]+\n/gm,'');
  s=s.replace('const maxRetries = maxTokens===undefined ? 4 : 0;','const maxRetries = 4;').replace('max_tokens: maxTokens ?? 4096,','max_tokens: 4096,');
  s=s.replace(/    let reportedUsage;\n/g,'').replace(/^\s*if\(chunk\.(usageMetadata|usage)\)reportedUsage=[^\n]+\n/gm,'');
  s=s.replace(/^\s*\.\.\.\(maxTokens!==undefined&&reportedUsage\?[^\n]+\n/gm,'').replace(/^    if\(maxTokens!==undefined\)\{const message=await stream.finalMessage\(\);[^\n]+\n/gm,'');
  s=s.replace('if(maxTokens===undefined)console.error("Gemini ADK error:", err.message);','console.error("Gemini ADK error:", err.message);');
 }else{
  s=s.replace('    activityLimits = null,\n','');const start=s.indexOf('    if(activityLimits!==null){');const end=s.indexOf('    if (!prompt',start);if(start>=0)s=s.slice(0,start)+s.slice(end);
  s=s.replace('operationKey: activityLimits?.operationKey ?? `turn-${conversationId}-${Date.now()}`,','operationKey: `turn-${conversationId}-${Date.now()}`,').replace('ceilingMicroUsd: activityLimits?.ceilingMicroUsd ?? 500000, // Ordinary-chat behavior preserved.','ceilingMicroUsd: 500000, // 0.50 USD headroom hold');
  s=s.replace(/^\s*maxTokens: activityLimits\?\.maxTokens,\n/gm,'').replace(/^\s*if\(activityLimits && [^\n]+\n/gm,'').replace(/^\s*if\(activityLimits\)turnErr=[^\n]+\n/gm,'');
 }
 const hash=crypto.createHash('sha256').update(s).digest('hex');
 const dest=path.join('.tmp/p5-repair-20261029',file);fs.mkdirSync(path.dirname(dest),{recursive:true});
 if(hash===hashes[file]){fs.writeFileSync(dest,s);console.log(file+': original P4 bytes recovered and verified against accepted hash');}
 else {fs.writeFileSync(dest+'.reconstructed-unverified',s);console.log(file+': reconstructed candidate does not match accepted hash; no qualified rollback file claimed');}
}

