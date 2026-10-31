import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import EventEmitter from 'node:events';
import { createRequire } from 'node:module';
import { AiSdkAdapter } from '../src/providers/aiSdkAdapter.js';
import { fixture, legacy } from './typedDatabaseBoundary.test.js';

const backendModules = createRequire(new URL('../../package.json', import.meta.url));
const { loadEnvironment } = backendModules('./server.js');
loadEnvironment();
delete process.env.DATABASE_URL;
process.env.PGDATABASE = 'sirona_workspace_p0_test_20261028';

const { AIService } = backendModules('./services/aiService.js');
const { ProviderService } = backendModules('./services/providerService.js');
const { TurnLease } = backendModules('./model/TurnLease.js');
const { coordinateTurn } = backendModules('./services/conversationTurnCoordinator.js');

test('Provider Parity: AiSdkAdapter capability routing', () => {
  const adapter = new AiSdkAdapter();
  // Supported text models without tools
  assert.equal(adapter.canHandle('google', 'gemini-flash-lite-latest'), true);
  assert.equal(adapter.canHandle('gemini', 'gemini-3.5-flash'), true);
  assert.equal(adapter.canHandle('openai', 'gpt-4o'), false);
  assert.equal(adapter.canHandle('anthropic', 'claude-3-5-sonnet'), false);
  assert.equal(adapter.canHandle('openai_compatible', 'local-model'), false);

  // Unsupported requests (tools, tool history) return false to route to native adapter
  assert.equal(
    adapter.canHandle('google', 'gemini-flash-lite-latest', {
      tools: [{ functionDeclarations: [{ name: 'exec_cmd' }] }],
    }),
    false,
    'Requests with tools must return false from canHandle'
  );
  assert.equal(
    adapter.canHandle('google', 'gemini-flash-lite-latest', {
      messages: [{ role: 'tool', content: 'output' }],
    }),
    false,
    'Requests with tool messages in history must return false from canHandle'
  );
});

test('Provider Parity: unauthenticated requests fail-closed with 401', async () => {
  const adapter = new AiSdkAdapter();
  await assert.rejects(
    async () => {
      await adapter.streamTurn({
        model: 'gemini-flash-lite-latest',
        providerKind: 'google',
        messages: [{ role: 'user', content: 'test' }],
        apiKey: '',
      });
    },
    (err: any) => {
      return err.status === 401 && err.code === 'AUTHENTICATION_REQUIRED';
    }
  );
});

test('Provider Parity: invalid API key triggers upstream error translation', async () => {
  const adapter = new AiSdkAdapter();
  await assert.rejects(
    async () => {
      await adapter.streamTurn({
        model: 'gemini-flash-lite-latest',
        providerKind: 'google',
        messages: [{ role: 'user', content: 'hello' }],
        apiKey: 'invalid-gemini-key-12345',
      });
    },
    (err: any) => {
      return err.status === 401 || err.code === 'INVALID_CREDENTIALS';
    }
  );
});

test('Provider Parity: unsupported tool calling in AiSdkAdapter fails closed', async () => {
  const adapter = new AiSdkAdapter();
  await assert.rejects(
    async () => {
      await adapter.streamTurn({
        model: 'gemini-flash-lite-latest',
        providerKind: 'google',
        messages: [{ role: 'user', content: 'run tool' }],
        apiKey: process.env.GEMINI_API_KEY || 'dummy-key',
        tools: [{ name: 'dummy_tool' }],
      });
    },
    (err: any) => {
      return err.status === 400 && err.code === 'UNSUPPORTED_REQUEST';
    }
  );
});

test('Provider Parity: AIService selects native adapter for unsupported tool requests', async () => {
  const apiKey = process.env.GEMINI_API_KEY;
  assert.ok(apiKey, 'GEMINI_API_KEY must be configured in environment');

  const streamedTokens: string[] = [];
  // When tools are passed with adapter: 'vercel_ai_sdk', AIService selects the native adapter
  const result = await AIService.streamTurn({
    model: 'gemini-flash-lite-latest',
    providerKind: 'google',
    messages: [{ role: 'user', content: 'Reply with the word: TOOL_FALLBACK' }],
    apiKey,
    tools: [{ name: 'mock_tool', description: 'test', parameters: { type: 'object', properties: {}, required: [] } }],
    onToken: (tok: string) => streamedTokens.push(tok),
    adapter: 'vercel_ai_sdk',
  });

  assert.ok(streamedTokens.length > 0, 'Tokens must be streamed via native adapter');
  assert.ok(result.content.length > 0, 'Content must not be empty');
});

test('Provider Parity: real configured Google streaming inference through AI SDK', async () => {
  const apiKey = process.env.GEMINI_API_KEY;
  assert.ok(apiKey, 'GEMINI_API_KEY must be configured in environment for live verification');

  const adapter = new AiSdkAdapter();
  const tokens: string[] = [];

  const result = await adapter.streamTurn({
    model: 'gemini-flash-lite-latest',
    providerKind: 'google',
    messages: [{ role: 'user', content: 'Reply with the single word: PARITY' }],
    apiKey,
    onToken: (tok) => tokens.push(tok),
  });

  assert.ok(tokens.length > 0, 'Tokens must be streamed via onToken callback');
  assert.ok(result.content.length > 0, 'Result content must not be empty');
  assert.ok(result.tokens > 0, 'Tokens count must be positive');
  assert.ok(result.usage, 'Usage accounting must be returned');
  assert.ok((result.usage?.totalTokens ?? 0) > 0, 'Total tokens must be positive');
  assert.ok((result.usage?.promptTokens ?? 0) > 0, 'Prompt tokens must be reported by SDK');
  assert.ok((result.usage?.completionTokens ?? 0) > 0, 'Completion tokens must be reported by SDK');
});

test('Provider Parity: AIService dispatches through Vercel AI SDK when selected', async () => {
  const apiKey = process.env.GEMINI_API_KEY;
  assert.ok(apiKey, 'GEMINI_API_KEY must be configured in environment for live verification');

  const streamedTokens: string[] = [];
  const result = await AIService.streamTurn({
    model: 'gemini-flash-lite-latest',
    providerKind: 'google',
    messages: [{ role: 'user', content: 'Reply with: HELLO_SIRONA' }],
    apiKey,
    onToken: (tok: string) => streamedTokens.push(tok),
    adapter: 'vercel_ai_sdk',
  });

  assert.ok(streamedTokens.length > 0);
  assert.ok(result.content.length > 0);
  assert.ok(result.tokens > 0);
  assert.ok(result.usage?.promptTokens > 0, 'Reported prompt tokens must be preserved');
});

test('Provider Parity: ProviderService.executeTurn persists reported usage in PostgreSQL', async (t: TestContext) => {
  await fixture(t);
  const dbCheck = await legacy.query('SELECT current_database() AS db');
  assert.equal(dbCheck.rows[0].db, 'sirona_workspace_p0_test_20261028', 'Must execute against guarded test database');

  const apiKey = process.env.GEMINI_API_KEY;
  assert.ok(apiKey, 'GEMINI_API_KEY must be configured in environment for live verification');

  // 1. Ensure test session exists in database
  const sessionId = crypto.randomUUID();
  const clientTurnId = crypto.randomUUID();
  const leaseOwner = `desktop:${crypto.randomUUID()}`;

  await legacy.query(
    `INSERT INTO sessions (id, title, model) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
    [sessionId, 'Test AI SDK Turn Usage', 'gemini-flash-lite-latest']
  );

  // Acquire single-writer lease
  const lease = await TurnLease.acquire(sessionId, leaseOwner, 60);
  assert.equal(lease.acquired, true, 'Turn lease must be acquired prior to turn');

  const streamedTokens: string[] = [];
  const turnResult = await ProviderService.executeTurn({
    conversationId: sessionId,
    prompt: 'Reply with the single word: PERSISTED_USAGE',
    modelId: 'gemini-flash-lite-latest',
    clientTurnId,
    leaseOwner,
    onToken: (tok: string) => streamedTokens.push(tok),
    adapter: 'vercel_ai_sdk',
  });

  assert.ok(turnResult.assistantMessage, 'Assistant message must be persisted');
  assert.equal(turnResult.assistantMessage.status, 'completed');
  assert.ok(turnResult.usage.promptTokens > 0, 'Reported prompt tokens must be positive');
  assert.ok(turnResult.usage.completionTokens > 0, 'Reported completion tokens must be positive');
  assert.ok(turnResult.usage.totalTokens > 0, 'Reported total tokens must be positive');

  // Verify database record in messages: user message updated with reported input tokens
  const userMsgCheck = await legacy.query('SELECT * FROM messages WHERE session_id = $1 AND role = $2', [sessionId, 'user']);
  assert.ok(userMsgCheck.rows.length >= 1, 'User message row must exist');
  assert.equal(userMsgCheck.rows[0].tokens, turnResult.usage.promptTokens, 'User message tokens must reflect reported prompt tokens');

  // Verify assistant message row in PostgreSQL
  const msgCheck = await legacy.query('SELECT * FROM messages WHERE session_id = $1 AND role = $2', [sessionId, 'assistant']);
  assert.ok(msgCheck.rows.length >= 1, 'Assistant message row must exist in PostgreSQL');
  assert.equal(msgCheck.rows[0].tokens, turnResult.usage.completionTokens, 'Assistant message tokens must reflect reported completion tokens');

  // Verify model_calls record has reported prompt_tokens and total_tokens
  const callCheck = await legacy.query('SELECT * FROM model_calls WHERE session_id = $1', [sessionId]);
  assert.ok(callCheck.rows.length >= 1, 'model_calls accounting record must exist in PostgreSQL');
  assert.equal(callCheck.rows[0].prompt_tokens, turnResult.usage.promptTokens, 'model_calls.prompt_tokens must match reported prompt tokens');
  assert.equal(callCheck.rows[0].completion_tokens, turnResult.usage.completionTokens, 'model_calls.completion_tokens must match reported completion tokens');
  assert.equal(callCheck.rows[0].total_tokens, turnResult.usage.totalTokens, 'model_calls.total_tokens must match reported total tokens');
  assert.equal(callCheck.rows[0].status, 'success');

  // Cleanly release lease
  await TurnLease.release(sessionId, leaseOwner, lease.token.generation);
});

interface ControlledUpstream {
  baseUrl: string;
  requests: number;
  close: () => Promise<void>;
}

/**
 * Starts a real loopback HTTP upstream so controlled-failure tests exercise the
 * actual adapter -> AI SDK -> HTTP transport path instead of throwing locally.
 */
async function startControlledUpstream(
  handler: (req: any, res: any) => void
): Promise<ControlledUpstream> {
  const http = await import('node:http');
  const state = { requests: 0 };
  const server = http.createServer((req, res) => {
    state.requests += 1;
    handler(req, res);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Controlled upstream failed to bind a loopback port');
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    get requests() {
      return state.requests;
    },
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.closeAllConnections();
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

function sseChunk(payload: unknown): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

test('Provider Parity: controlled failure - timeout during an active request maps to 504 INFERENCE_TIMEOUT', async () => {
  const adapter = new AiSdkAdapter();
  const controller = new AbortController();
  let abortAtMs = 0;
  const upstream = await startControlledUpstream((_req, res) => {
    // Accept the request and never respond: the turn must time out mid-flight.
    res.on('close', () => {});
  });

  try {
    const startedAt = Date.now();
    const timer = setTimeout(() => {
      abortAtMs = Date.now() - startedAt;
      const timeoutErr = new Error('Inference deadline exceeded');
      timeoutErr.name = 'TimeoutError';
      controller.abort(timeoutErr);
    }, 150);

    await assert.rejects(
      async () => {
        await adapter.streamTurn({
          model: 'gemini-flash-lite-latest',
          providerKind: 'google',
          messages: [{ role: 'user', content: 'test timeout' }],
          apiKey: 'controlled-timeout-key',
          baseUrl: upstream.baseUrl,
          signal: controller.signal,
        });
      },
      (err: any) => {
        assert.equal(err.status, 504, 'Timeout must map to HTTP 504');
        assert.equal(err.code, 'INFERENCE_TIMEOUT', 'Timeout must map to INFERENCE_TIMEOUT');
        return true;
      }
    );

    clearTimeout(timer);
    assert.equal(upstream.requests, 1, 'Adapter must have issued a real upstream request before timing out');
    assert.ok(abortAtMs >= 100, 'Abort must fire while the request is in flight, not before dispatch');
    assert.equal(controller.signal.aborted, true, 'Signal must be aborted by the timeout, not pre-aborted');
  } finally {
    await upstream.close();
  }
});

test('Provider Parity: controlled failure - rate limiting from a real upstream maps to 429 RATE_LIMIT_EXCEEDED', async () => {
  const adapter = new AiSdkAdapter();
  const upstream = await startControlledUpstream((_req, res) => {
    res.writeHead(429, { 'content-type': 'application/json' });
    res.end(
      JSON.stringify({
        error: {
          code: 429,
          message: 'Quota exceeded for quota metric',
          status: 'RESOURCE_EXHAUSTED',
        },
      })
    );
  });

  try {
    await assert.rejects(
      async () => {
        await adapter.streamTurn({
          model: 'gemini-flash-lite-latest',
          providerKind: 'google',
          messages: [{ role: 'user', content: 'test rate limit' }],
          apiKey: 'controlled-rate-limit-key',
          baseUrl: upstream.baseUrl,
        });
      },
      (err: any) => {
        assert.equal(err.status, 429, 'Throttling must map to HTTP 429');
        assert.equal(err.code, 'RATE_LIMIT_EXCEEDED', 'Throttling must map to RATE_LIMIT_EXCEEDED');
        return true;
      }
    );
    assert.ok(
      upstream.requests >= 1,
      `Adapter must have received the real upstream 429 response (observed ${upstream.requests} attempt(s), including bounded AI SDK retries)`
    );
  } finally {
    await upstream.close();
  }
});

test('Provider Parity: controlled failure - interrupted stream from a real upstream maps to 502 STREAM_INTERRUPTED', async () => {
  const adapter = new AiSdkAdapter();
  const tokens: string[] = [];
  const upstream = await startControlledUpstream((_req, res) => {
    res.writeHead(200, { 'content-type': 'text/event-stream' });
    res.write(
      sseChunk({
        candidates: [{ content: { role: 'model', parts: [{ text: 'PARTIAL' }] } }],
      })
    );
    // Break the socket mid-stream, after a real token has been emitted.
    setTimeout(() => res.destroy(), 25);
  });

  try {
    await assert.rejects(
      async () => {
        await adapter.streamTurn({
          model: 'gemini-flash-lite-latest',
          providerKind: 'google',
          messages: [{ role: 'user', content: 'test interrupted stream' }],
          apiKey: 'controlled-interrupt-key',
          baseUrl: upstream.baseUrl,
          onToken: (token) => tokens.push(token),
        });
      },
      (err: any) => {
        assert.equal(err.status, 502, 'Interrupted stream must map to HTTP 502');
        assert.equal(err.code, 'STREAM_INTERRUPTED', 'Interrupted stream must map to STREAM_INTERRUPTED');
        return true;
      }
    );
    assert.equal(upstream.requests, 1, 'Adapter must have issued a real upstream request');
    assert.ok(tokens.length > 0, 'Interruption must occur after the stream already emitted a token');
    assert.ok(tokens.join('').includes('PARTIAL'), 'Partial output must have been streamed before the break');
  } finally {
    await upstream.close();
  }
});

function createMockSseResponse(onChunk?: (chunk: string, res: any) => void) {
  const res = new EventEmitter() as any;
  res.headersSent = false;
  res.destroyed = false;
  res.writableEnded = false;
  res.written = [];
  res.writeHead = (status: number, headers: any) => {
    res.headersSent = true;
    res.statusCode = status;
    res.headers = headers;
  };
  res.flushHeaders = () => {};
  res.write = (chunk: string) => {
    res.written.push(chunk);
    onChunk?.(chunk, res);
    return true;
  };
  res.end = () => {
    res.writableEnded = true;
    res.emit('finish');
  };
  return res;
}

test('Provider Parity: automatic lease release on client cancellation through real coordinator', async (t: TestContext) => {
  await fixture(t);
  const apiKey = process.env.GEMINI_API_KEY;
  assert.ok(apiKey, 'GEMINI_API_KEY must be configured in environment for live verification');

  process.env.SIRONA_PROVIDER_ADAPTER = 'vercel_ai_sdk';

  const sessionId = crypto.randomUUID();
  const clientTurnId = crypto.randomUUID();

  // Ensure session exists
  await legacy.query(
    `INSERT INTO sessions (id, title, model) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
    [sessionId, 'Test Coordinator Cancellation', 'gemini-flash-lite-latest']
  );

  let tokensStreamed = 0;
  const mockRes = createMockSseResponse((chunk, res) => {
    if (chunk.includes('"type":"token"')) {
      tokensStreamed++;
      if (tokensStreamed >= 1 && !res.destroyed) {
        // Client disconnects / aborts mid-stream
        res.destroyed = true;
        res.emit('close');
      }
    }
  });

  const req = {
    params: { conversationId: sessionId },
    body: {
      prompt: 'Write a detailed 300 word description of a voyage through deep space and orbiting moons.',
      modelId: 'gemini-flash-lite-latest',
      clientTurnId,
    },
    session: { principalId: 'operator' },
  };

  // Run through real coordinator
  await coordinateTurn(req, mockRes);

  assert.ok(tokensStreamed >= 1, 'Cancellation must occur during active streaming of tokens');

  // Verify assistant message status is cancelled
  const assistantCheck = await legacy.query('SELECT * FROM messages WHERE session_id = $1 AND role = $2', [sessionId, 'assistant']);
  assert.ok(assistantCheck.rows.length >= 1, 'Assistant message must exist');
  assert.equal(assistantCheck.rows[0].status, 'cancelled', 'Assistant message status must be cancelled');

  // Verify model_calls record was logged as aborted
  const callCheck = await legacy.query('SELECT * FROM model_calls WHERE session_id = $1', [sessionId]);
  assert.ok(callCheck.rows.length >= 1, 'model_calls record must exist');
  assert.equal(callCheck.rows[0].status, 'aborted', 'model_calls record must be aborted');

  // CRITICAL: Verify automatic lease release WITHOUT ANY MANUAL RELEASE!
  const checkedLease = await TurnLease.getLease(sessionId);
  assert.ok(checkedLease, 'Lease row must exist');
  assert.equal(checkedLease.is_active, false, 'Coordinator must have automatically released turn lease on cancellation');

  // Verify another turn can immediately acquire the lease without conflict
  const nextOwner = `desktop:${crypto.randomUUID()}`;
  const nextLease = await TurnLease.acquire(sessionId, nextOwner, 60);
  assert.equal(nextLease.acquired, true, 'Subsequent turn lease must be acquirable after coordinator release');
  await TurnLease.release(sessionId, nextOwner, nextLease.token.generation);
});

test('Provider Parity: turn retry (retryOf) reuses original user message without duplication and completes', async (t: TestContext) => {
  await fixture(t);
  const apiKey = process.env.GEMINI_API_KEY;
  assert.ok(apiKey, 'GEMINI_API_KEY must be configured in environment for live verification');

  process.env.SIRONA_PROVIDER_ADAPTER = 'vercel_ai_sdk';

  const sessionId = crypto.randomUUID();
  const cancelTurnId = crypto.randomUUID();
  const prompt = 'Repeat the exact code: RETRY_SUCCESSFUL';

  // 1. Ensure test session exists
  await legacy.query(
    `INSERT INTO sessions (id, title, model) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
    [sessionId, 'Test Turn Retry Session', 'gemini-flash-lite-latest']
  );

  // 2. Perform initial turn that gets cancelled mid-stream
  let initialTokens = 0;
  const cancelRes = createMockSseResponse((chunk, res) => {
    if (chunk.includes('"type":"token"')) {
      initialTokens++;
      if (initialTokens >= 1 && !res.destroyed) {
        res.destroyed = true;
        res.emit('close');
      }
    }
  });

  await coordinateTurn({
    params: { conversationId: sessionId },
    body: { prompt, modelId: 'gemini-flash-lite-latest', clientTurnId: cancelTurnId },
    session: { principalId: 'operator' },
  }, cancelRes);

  const initialAssistant = (await legacy.query('SELECT id, status FROM messages WHERE session_id = $1 AND role = $2 ORDER BY id DESC LIMIT 1', [sessionId, 'assistant'])).rows[0];
  assert.ok(initialAssistant, 'Initial assistant message must exist');
  assert.equal(initialAssistant.status, 'cancelled', 'Initial assistant message must be cancelled');

  const userCountBefore = (await legacy.query("SELECT COUNT(*)::int AS cnt FROM messages WHERE session_id = $1 AND role = 'user'", [sessionId])).rows[0].cnt;
  assert.equal(userCountBefore, 1, 'Initial turn must have exactly 1 user message');

  // 3. Retry the cancelled turn using retryOf
  const retryTurnId = crypto.randomUUID();
  let retryTokens = 0;
  let retryDoneReceived = false;

  const retryRes = createMockSseResponse((chunk) => {
    if (chunk.includes('"type":"token"')) {
      retryTokens++;
    }
    if (chunk.includes('"type":"done"')) {
      retryDoneReceived = true;
    }
  });

  await coordinateTurn({
    params: { conversationId: sessionId },
    body: { prompt, modelId: 'gemini-flash-lite-latest', clientTurnId: retryTurnId, retryOf: initialAssistant.id },
    session: { principalId: 'operator' },
  }, retryRes);

  assert.ok(retryTokens > 0, 'Retry turn must stream tokens');
  assert.ok(retryDoneReceived, 'Retry turn must receive done event');

  // 4. Assert user message was REUSED and NOT duplicated
  const userCountAfter = (await legacy.query("SELECT COUNT(*)::int AS cnt FROM messages WHERE session_id = $1 AND role = 'user'", [sessionId])).rows[0].cnt;
  assert.equal(userCountAfter, 1, 'Retry turn must reuse existing user message and NOT create a duplicate user message');

  // 5. Assert retried assistant message is completed
  const retryAssistant = (await legacy.query('SELECT id, status, content FROM messages WHERE session_id = $1 AND role = $2 ORDER BY id DESC LIMIT 1', [sessionId, 'assistant'])).rows[0];
  assert.equal(retryAssistant.status, 'completed', 'Retried assistant message must be completed');
  assert.ok(retryAssistant.content.length > 0, 'Retried assistant message content must not be empty');

  // 6. Assert model_calls record logged success
  const completedCall = (await legacy.query("SELECT status, prompt_tokens, completion_tokens FROM model_calls WHERE session_id = $1 AND status = 'success' ORDER BY id DESC LIMIT 1", [sessionId])).rows[0];
  assert.ok(completedCall, 'model_calls record for completed retry must exist');
  assert.ok(completedCall.prompt_tokens > 0, 'Reported prompt tokens must be positive');
  assert.ok(completedCall.completion_tokens > 0, 'Reported completion tokens must be positive');

  // 7. Verify automatic lease release after retry completion
  const leaseAfterRetry = await TurnLease.getLease(sessionId);
  assert.equal(leaseAfterRetry.is_active, false, 'Turn lease must be automatically released upon retry completion');
});
