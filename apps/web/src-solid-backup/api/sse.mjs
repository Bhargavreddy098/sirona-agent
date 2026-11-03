/** Streaming UTF-8 SSE parser: frames can cross arbitrary network chunk boundaries. */
export async function readSse(response,onEvent,signal) {
  if(!response.body)throw new Error('The server returned no event stream');
  const reader=response.body.getReader(),decoder=new TextDecoder();
  let buffer='',data=[],done=false;
  const line=value=>{
    if(value==='') {if(data.length){const event=JSON.parse(data.join('\n'));onEvent(event);if(event.type==='done')done=true;data=[];}return;}
    if(value.startsWith('data:'))data.push(value.slice(5).replace(/^ /,''));
  };
  try {
    for(;;){
      if(signal?.aborted)throw new DOMException('Generation cancelled','AbortError');
      const result=await reader.read();buffer+=decoder.decode(result.value,{stream:!result.done});
      let match;while((match=/\r\n|\n|\r(?!$)/.exec(buffer))){line(buffer.slice(0,match.index));buffer=buffer.slice(match.index+match[0].length);}
      if(result.done)break;
    }
    if(!done)throw new Error('Connection ended before the backend confirmed completion. Saved messages will be reconciled.');
  } finally {await reader.cancel().catch(()=>{});reader.releaseLock();}
}
