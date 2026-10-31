/** Ordered, bounded SSE frames. Decimal IDs must never round through Number. */
export async function readRunEvents(response,onEvent,signal,after='0'){
  if(!response.body)throw new Error('No run event stream was returned');
  const reader=response.body.getReader(),decoder=new TextDecoder();
  let buffer='',data=[],type='message',id='',cursor=BigInt(after),frameBytes=0;
  const line=value=>{
    if(value===''){
      if(data.length){
        if(type==='error')throw new Error('Run stream unavailable. Reconnect after authentication or recovery.');
        if(!/^\d{1,19}$/.test(id)||BigInt(id)>9223372036854775807n)throw new Error('The run stream returned an invalid event cursor');
        const sequence=BigInt(id);
        if(sequence>cursor){const payload=JSON.parse(data.join('\n'));if(!payload||typeof payload!=='object'||Array.isArray(payload))throw new Error('Invalid run event payload');onEvent({id,type,payload});cursor=sequence;}
      }
      data=[];type='message';id='';frameBytes=0;return;
    }
    frameBytes+=value.length;if(frameBytes>262144)throw new Error('Run event exceeded the preview limit');
    if(value.startsWith('data:'))data.push(value.slice(5).replace(/^ /,''));
    else if(value.startsWith('event:'))type=value.slice(6).trim();
    else if(value.startsWith('id:'))id=value.slice(3).trim();
  };
  try{
    for(;;){if(signal.aborted)throw signal.reason;const part=await reader.read();buffer+=decoder.decode(part.value,{stream:!part.done});let match;
      while((match=/\r\n|\n|\r(?!$)/.exec(buffer))){line(buffer.slice(0,match.index));buffer=buffer.slice(match.index+match[0].length);}
      if(buffer.length>262144)throw new Error('Run stream exceeded the preview limit');
      if(part.done)throw new Error('The live run connection ended. Saved state is preserved; reconnect to continue.');
    }
  }finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
}
