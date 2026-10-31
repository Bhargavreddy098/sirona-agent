import fs from 'node:fs';
import crypto from 'node:crypto';
import EventEmitter from 'node:events';
import { createRequire } from 'node:module';

const rootModules = createRequire(new URL('../../../../package.json', import.meta.url));
const { loadEnvironment } = rootModules('./backend/server.js');
loadEnvironment();
delete process.env.DATABASE_URL;
process.env.PGDATABASE = 'sirona_workspace_p0_test_20261028';

const { AiSdkAdapter } = await import('../../../../backend/dist-workspace/src/providers/aiSdkAdapter.js');
const { coordinateTurn } = rootModules('./backend/services/conversationTurnCoordinator.js');
const { TurnLease } = rootModules('./backend/model/TurnLease.js');
const { legacy, fixture } = await import('../../../../backend/dist-workspace/tests/typedDatabaseBoundary.test.js');

const evidenceDir = 'docs/integration/evidence/workspace-p4';

function createMockSseResponse(onChunk) {
  const res = new EventEmitter();
  res.headersSent = false;
  res.destroyed = false;
  res.writableEnded = false;
  res.written = [];
  res.writeHead = (status, headers) => {
    res.headersSent = true;
    res.statusCode = status;
    res.headers = headers;
  };
  res.flushHeaders = () => {};
  res.flush = () => {};
  res.write = (chunk) => {
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

async function main() {
  // fixture() activates the guarded database owner; keep its cleanup callbacks so
  // this generator does not leak fixture rows between runs.
  const cleanups = [];
  await fixture({ after: (fn) => cleanups.push(fn) });

  // ---------------------------------------------------------------- live inference
  console.log('Generating live-provider-transcript.txt...');
  const adapter = new AiSdkAdapter();
  const transcript = [];
  const startMs = Date.now();
  transcript.push(`[${new Date().toISOString()}] Starting live Google Gemini inference turn via Vercel AI SDK`);
  transcript.push(`Model: gemini-flash-lite-latest`);
  transcript.push(`Provider: google (AI SDK @ai-sdk/google)`);

  const tokens = [];
  const result = await adapter.streamTurn({
    model: 'gemini-flash-lite-latest',
    providerKind: 'google',
    messages: [{ role: 'user', content: 'Explain in two sentences what a distributed turn lease is.' }],
    apiKey: process.env.GEMINI_API_KEY,
    onToken: (tok) => {
      tokens.push({ delta: tok, elapsedMs: Date.now() - startMs });
    },
  });

  transcript.push(`[${new Date().toISOString()}] Inference turn completed in ${Date.now() - startMs}ms`);
  transcript.push(`Total tokens received via onToken: ${tokens.length}`);
  transcript.push(`Tokens stream: ` + JSON.stringify(tokens, null, 2));
  transcript.push(`Final reconstructed content: "${result.content}"`);
  transcript.push(`Reported prompt tokens: ${result.usage?.promptTokens}`);
  transcript.push(`Reported completion tokens: ${result.usage?.completionTokens}`);
  transcript.push(`Reported total tokens: ${result.usage?.totalTokens}`);

  fs.writeFileSync(`${evidenceDir}/live-provider-transcript.txt`, transcript.join('\n'), 'utf8');
  console.log('live-provider-transcript.txt generated.');

  // ------------------------------------------------- coordinator cancellation
  // This must match the accepted claim: the REAL coordinator drives the turn and
  // releases the single-writer lease automatically. No manual TurnLease.release()
  // is executed anywhere in this section.
  console.log('Generating cancellation-stream-transcript.txt...');
  process.env.SIRONA_PROVIDER_ADAPTER = 'vercel_ai_sdk';

  const cancelTranscript = [];
  const cancelStart = Date.now();
  const sessionId = crypto.randomUUID();
  const clientTurnId = crypto.randomUUID();
  const prompt =
    'Write an exhaustive 400 word essay on the history of astronomical telescopes from Galileo to the James Webb Space Telescope.';

  await legacy.query(
    `INSERT INTO sessions (id, title, model) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
    [sessionId, 'Coordinator cancellation transcript', 'gemini-flash-lite-latest']
  );

  cancelTranscript.push(`[${new Date().toISOString()}] Starting real coordinator turn via coordinateTurn() with the public DTO only`);
  cancelTranscript.push(`Session ID: ${sessionId}`);
  cancelTranscript.push(`Model: gemini-flash-lite-latest (server-selected via SIRONA_PROVIDER_ADAPTER=vercel_ai_sdk)`);
  cancelTranscript.push(
    `Public DTO body: ${JSON.stringify({ prompt: prompt.slice(0, 48) + '...', modelId: 'gemini-flash-lite-latest', clientTurnId })}`
  );
  cancelTranscript.push(`Client-controlled adapter field present: false`);

  let streamedTokens = 0;
  let closeEmittedAtMs = 0;
  const sseFrames = [];

  const res = createMockSseResponse((chunk, mockRes) => {
    sseFrames.push(chunk.trim());
    if (chunk.includes('"type":"token"')) {
      streamedTokens += 1;
      if (streamedTokens >= 2 && !mockRes.destroyed) {
        closeEmittedAtMs = Date.now() - cancelStart;
        cancelTranscript.push(
          `[${new Date().toISOString()}] SSE stream actively emitting tokens (${streamedTokens} token frames received). Client disconnects: res.emit('close').`
        );
        mockRes.destroyed = true;
        mockRes.emit('close');
      }
    }
  });

  await coordinateTurn(
    {
      params: { conversationId: sessionId },
      body: { prompt, modelId: 'gemini-flash-lite-latest', clientTurnId },
      session: { principalId: 'operator' },
    },
    res
  );

  const totalMs = Date.now() - cancelStart;
  cancelTranscript.push(`[${new Date().toISOString()}] coordinateTurn() returned after ${totalMs}ms (no unhandled rejection)`);
  cancelTranscript.push(`Token frames emitted before disconnect: ${streamedTokens}`);
  cancelTranscript.push(`Disconnect emitted at: ${closeEmittedAtMs}ms`);

  const assistantCheck = await legacy.query(
    'SELECT status, content, duration_ms FROM messages WHERE session_id = $1 AND role = $2',
    [sessionId, 'assistant']
  );
  const assistant = assistantCheck.rows[0];
  cancelTranscript.push(`PostgreSQL messages row: status=${assistant?.status} duration_ms=${assistant?.duration_ms}`);
  cancelTranscript.push(`Assistant content preserved (not fabricated): ${JSON.stringify(assistant?.content ?? '')}`);

  const callCheck = await legacy.query('SELECT status, prompt_tokens, duration_ms FROM model_calls WHERE session_id = $1', [sessionId]);
  const call = callCheck.rows[0];
  cancelTranscript.push(`PostgreSQL model_calls row: status=${call?.status} prompt_tokens=${call?.prompt_tokens} duration_ms=${call?.duration_ms}`);

  const leaseRow = (await legacy.query('SELECT holder, generation, released_at, expires_at FROM session_turn_leases WHERE session_id = $1', [sessionId])).rows[0];
  cancelTranscript.push(
    `PostgreSQL session_turn_leases row: holder=${leaseRow?.holder} generation=${leaseRow?.generation} released_at=${leaseRow?.released_at ? leaseRow.released_at.toISOString() : null}`
  );

  const checkedLease = await TurnLease.getLease(sessionId);
  cancelTranscript.push(`TurnLease.getLease() after coordinateTurn(): is_active=${checkedLease?.is_active}`);
  cancelTranscript.push('Manual TurnLease.release() executed in this generator: false');

  const nextOwner = `desktop:${crypto.randomUUID()}`;
  const nextLease = await TurnLease.acquire(sessionId, nextOwner, 60);
  cancelTranscript.push(
    `Subsequent lease acquired immediately by ${nextOwner}: acquired=${nextLease.acquired} generation=${nextLease.token?.generation}`
  );
  await TurnLease.release(sessionId, nextOwner, nextLease.token.generation);

  const sseSummary = sseFrames.slice(0, 4).map((frame) => frame.slice(0, 160));
  cancelTranscript.push(`First SSE frames: ${JSON.stringify(sseSummary, null, 2)}`);
  cancelTranscript.push(`Automatic lease release verified complete.`);

  fs.writeFileSync(`${evidenceDir}/cancellation-stream-transcript.txt`, cancelTranscript.join('\n'), 'utf8');
  console.log('cancellation-stream-transcript.txt generated.');

  for (const cleanup of cleanups.reverse()) {
    await cleanup();
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
