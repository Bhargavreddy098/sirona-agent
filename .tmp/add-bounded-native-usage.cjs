const fs=require('node:fs'),p='backend/services/aiService.js';let s=fs.readFileSync(p,'utf8');
for(const name of ['_streamOpenAI','_streamOpenAICompatible','_streamAnthropic']){
 const start=s.indexOf('  static async '+name+'(');let end=s.indexOf('\n  static ',start+1);if(end<0)end=s.length;
 let body=s.slice(start,end);body=body.replace('let fullContent = "";','let fullContent = "";\n    let reportedUsage;');
 if(name!=='_streamAnthropic'){
  body=body.replace('stream: true,','stream: true,\n        ...(maxTokens===undefined?{}:{stream_options:{include_usage:true}}),');
  body=body.replace('for await (const chunk of stream) {','for await (const chunk of stream) {\n      if(chunk.usage)reportedUsage=chunk.usage;');
 }else body=body.replace('    return {\n      content: fullContent,',"    if(maxTokens!==undefined){const message=await stream.finalMessage();reportedUsage={prompt_tokens:message.usage.input_tokens,completion_tokens:message.usage.output_tokens,total_tokens:message.usage.input_tokens+message.usage.output_tokens};}\n    return {\n      content: fullContent,");
 body=body.replace('tokens: Math.ceil(fullContent.length / 4),','tokens: Math.ceil(fullContent.length / 4),\n      ...(maxTokens!==undefined&&reportedUsage?{usage:{promptTokens:reportedUsage.prompt_tokens,completionTokens:reportedUsage.completion_tokens,totalTokens:reportedUsage.total_tokens}}:{}),');
 s=s.slice(0,start)+body+s.slice(end);
}
fs.writeFileSync(p,s);
