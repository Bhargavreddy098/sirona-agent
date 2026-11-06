/**
 * Server-Sent Events (SSE) streaming reader.
 * Bounded streaming transport for progressive LLM token and event dispatch.
 */
export async function readSse(response, onEvent, signal) {
  if (signal?.aborted) {
    const err = new Error('The operation was aborted');
    err.name = 'AbortError';
    throw err;
  }
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Response body is unavailable');
  }

  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let completed = false;

  const onAbort = () => {
    try { reader.cancel(); } catch {}
  };
  signal?.addEventListener('abort', onAbort, { once: true });

  try {
    while (true) {
      if (signal?.aborted) {
        const err = new Error('The operation was aborted');
        err.name = 'AbortError';
        throw err;
      }

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let boundary;
      while ((boundary = buffer.search(/\r?\n\r?\n/)) !== -1) {
        const eventBlock = buffer.slice(0, boundary);
        const match = buffer.slice(boundary).match(/^\r?\n\r?\n/);
        buffer = buffer.slice(boundary + (match ? match[0].length : 2));

        const lines = eventBlock.split(/\r?\n/);
        let dataStr = '';
        for (const line of lines) {
          if (line.startsWith(':')) {
            continue;
          }
          if (line.startsWith('data:')) {
            const val = line.slice(5).replace(/^ /, '');
            dataStr = dataStr ? dataStr + '\n' + val : val;
          }
        }

        if (dataStr) {
          if (dataStr === '[DONE]') {
            completed = true;
            break;
          }
          let parsed;
          try {
            parsed = JSON.parse(dataStr);
          } catch {
            parsed = { text: dataStr };
          }
          if (parsed && typeof parsed === 'object' && parsed.type === 'done') {
            completed = true;
          }
          await onEvent(parsed);
        }
      }
    }

    buffer += decoder.decode();

    if (!completed) {
      throw new Error('Stream ended before the backend confirmed completion');
    }
  } finally {
    signal?.removeEventListener('abort', onAbort);
    try { reader.releaseLock?.(); } catch {}
  }
}
