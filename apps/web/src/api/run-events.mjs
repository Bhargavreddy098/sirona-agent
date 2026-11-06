/**
 * Durable run events SSE stream reader.
 * Validates cursors, filters duplicates, bounds payloads, and delivers structured graph events.
 */
export async function readRunEvents(response, onEvent, signal, afterCursor = null) {
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
  let lastSeenCursor = afterCursor !== null ? BigInt(afterCursor) : null;
  const maxI64 = 9223372036854775807n;

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
        const frame = buffer.slice(0, boundary);
        const match = buffer.slice(boundary).match(/^\r?\n\r?\n/);
        buffer = buffer.slice(boundary + (match ? match[0].length : 2));

        const lines = frame.split(/\r?\n/);
        let id = null;
        let eventType = 'message';
        let dataStr = '';

        for (const line of lines) {
          if (line.startsWith(':')) continue;
          if (line.startsWith('id:')) {
            const rawId = line.slice(3).trim();
            if (!/^[0-9]{1,19}$/.test(rawId)) {
              throw new Error('invalid event cursor: ' + rawId);
            }
            const b = BigInt(rawId);
            if (b > maxI64) {
              throw new Error('invalid event cursor: out of 64-bit range');
            }
            id = rawId;
          } else if (line.startsWith('event:')) {
            eventType = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            const val = line.slice(5).replace(/^ /, '');
            dataStr = dataStr ? dataStr + '\n' + val : val;
          }
        }

        if (eventType === 'error') {
          throw new Error('Run stream unavailable');
        }

        if (dataStr) {
          if (dataStr.length > 262144) {
            throw new Error('preview limit exceeded');
          }
          let payload;
          try {
            payload = JSON.parse(dataStr);
          } catch {
            payload = { text: dataStr };
          }
          if (payload && payload.code === 'STREAM_UNAVAILABLE') {
            throw new Error('Run stream unavailable');
          }

          if (id !== null) {
            const currentCursor = BigInt(id);
            if (lastSeenCursor !== null && currentCursor <= lastSeenCursor) {
              continue;
            }
            lastSeenCursor = currentCursor;
          }

          await onEvent({ id, type: eventType, payload });
        }
      }
    }

    throw new Error('Run event connection ended');
  } finally {
    signal?.removeEventListener('abort', onAbort);
    try { reader.releaseLock?.(); } catch {}
  }
}
