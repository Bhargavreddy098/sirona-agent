import test from 'node:test';
import assert from 'node:assert/strict';
import {
  uuidSchema,
  timestampSchema,
  problemDetailsSchema,
  paginationParamsSchema,
  successEnvelope,
  userSchema,
  workspaceSchema,
  conversationSchema,
  messageSchema,
  projectSchema,
  artifactSchema,
  providerConnectionSchema,
  modelSchema,
  settingsSchema,
  runSchema,
  taskSchema,
  effectSchema,
  approvalSchema,
  grantSchema,
  executionFenceSchema,
  toolExecutionRequestSchema,
  toolExecutionReceiptSchema,
  applyPreviewRequestSchema,
  applyPreviewResponseSchema,
  startRunRequestSchema,
  runActionRequestSchema,
  resolveApprovalRequestSchema,
  runEventSchema,
  runStreamParamsSchema,
  chatStreamChunkSchema,
} from '../dist/index.js';

test('Contracts - API Schemas', async (t) => {
  await t.test('uuidSchema validates UUIDs correctly', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
    assert.equal(uuidSchema.parse(validUuid), validUuid);
    assert.throws(() => uuidSchema.parse('invalid-uuid'));
  });

  await t.test('problemDetailsSchema enforces RFC 7807 structure', () => {
    const parsed = problemDetailsSchema.parse({
      status: 404,
      title: 'Resource Not Found',
      detail: 'The requested conversation does not exist',
      code: 'ERR_NOT_FOUND',
      category: 'client_error',
    });
    assert.equal(parsed.status, 404);
    assert.equal(parsed.title, 'Resource Not Found');
  });

  await t.test('paginationParamsSchema provides safe defaults', () => {
    const defaults = paginationParamsSchema.parse({});
    assert.equal(defaults.limit, 50);
    assert.equal(defaults.offset, 0);

    const custom = paginationParamsSchema.parse({ limit: '20', offset: '40' });
    assert.equal(custom.limit, 20);
    assert.equal(custom.offset, 40);
  });

  await t.test('successEnvelope wraps arbitrary schemas', () => {
    const envelope = successEnvelope(userSchema);
    const result = envelope.parse({
      data: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'dev@sirona.local',
      },
      meta: {
        requestId: 'req-123',
      },
    });
    assert.equal(result.data.email, 'dev@sirona.local');
    assert.equal(result.meta?.requestId, 'req-123');
  });
});

test('Contracts - Core Domain Models', async (t) => {
  await t.test('conversationSchema and messageSchema parse correctly', () => {
    const convId = '123e4567-e89b-12d3-a456-426614174000';
    const conv = conversationSchema.parse({
      id: convId,
      title: 'Monorepo Refactor Session',
      model: 'gemini-2.5-pro',
    });
    assert.equal(conv.id, convId);
    assert.equal(conv.title, 'Monorepo Refactor Session');

    const msg = messageSchema.parse({
      id: 'msg-1',
      sessionId: convId,
      role: 'user',
      content: 'Refactor repository into packages',
    });
    assert.equal(msg.role, 'user');
    assert.equal(msg.content, 'Refactor repository into packages');

    // Handles nullish content gracefully
    const emptyMsg = messageSchema.parse({
      id: 'msg-2',
      role: 'assistant',
      content: null,
    });
    assert.equal(emptyMsg.content, '');
  });

  await t.test('runSchema parses lifecycle run state', () => {
    const runId = '123e4567-e89b-12d3-a456-426614174000';
    const run = runSchema.parse({
      id: runId,
      state: 'running',
      epoch: '1',
      progress: {
        completedTasks: 3,
        totalTasks: 5,
      },
      budget: {
        limit: '1000000',
        reserved: '500000',
        spent: '250000',
      },
    });
    assert.equal(run.id, runId);
    assert.equal(run.progress.completedTasks, 3);
    assert.equal(run.budget.spent, '250000');
  });

  await t.test('approvalSchema validates cost ceiling and digests', () => {
    const approvalId = '123e4567-e89b-12d3-a456-426614174000';
    const approval = approvalSchema.parse({
      id: approvalId,
      state: 'pending',
      input_digest: 'a'.repeat(64),
      expires_at: '2026-12-31T23:59:59Z',
      cost_ceiling_micro_usd: 500000,
    });
    assert.equal(approval.id, approvalId);
    assert.equal(approval.cost_ceiling_micro_usd, '500000');
  });
});

test('Contracts - Execution & Security Fences', async (t) => {
  await t.test('executionFenceSchema requires server-owned fencing token', () => {
    const fence = executionFenceSchema.parse({
      holder: 'sirona-worker-pid-1234',
      runEpoch: '2',
      leaseEpoch: '5',
    });
    assert.equal(fence.holder, 'sirona-worker-pid-1234');
    assert.equal(fence.runEpoch, '2');
    assert.equal(fence.leaseEpoch, '5');
  });

  await t.test('toolExecutionRequest and receipt validation', () => {
    const req = toolExecutionRequestSchema.parse({
      toolId: 'file_writer',
      input: { path: '/tmp/test.txt', content: 'hello' },
      riskLevel: 'high',
    });
    assert.equal(req.toolId, 'file_writer');
    assert.equal(req.riskLevel, 'high');

    const receipt = toolExecutionReceiptSchema.parse({
      effectId: '123e4567-e89b-12d3-a456-426614174000',
      toolId: 'file_writer',
      status: 'success',
      inputDigest: 'b'.repeat(64),
      executedAt: '2026-10-31T12:00:00Z',
      durationMs: 120,
    });
    assert.equal(receipt.status, 'success');
    assert.equal(receipt.durationMs, 120);
  });

  await t.test('applyPreview schemas validate diff preview lifecycle', () => {
    const previewReq = applyPreviewRequestSchema.parse({
      filePath: 'src/index.ts',
      content: 'console.log("preview");',
    });
    assert.equal(previewReq.filePath, 'src/index.ts');

    const previewRes = applyPreviewResponseSchema.parse({
      filePath: 'src/index.ts',
      diff: '@@ -1,1 +1,1 @@\n-old\n+console.log("preview");',
      canApply: true,
      conflicts: [],
    });
    assert.equal(previewRes.canApply, true);
    assert.equal(previewRes.conflicts.length, 0);
  });
});

test('Contracts - Events & SSE Streaming', async (t) => {
  await t.test('runEventSchema parses streaming lifecycle events', () => {
    const event = runEventSchema.parse({
      id: '123e4567-e89b-12d3-a456-426614174000',
      runId: '223e4567-e89b-12d3-a456-426614174000',
      sequence: '42',
      type: 'RUN_PROGRESS',
      timestamp: '2026-10-31T12:00:00Z',
      payload: {
        step: 'Compile TypeScript',
        percentage: 84,
      },
    });
    assert.equal(event.sequence, '42');
    assert.equal(event.type, 'RUN_PROGRESS');
    assert.equal(event.payload.percentage, 84);
  });

  await t.test('chatStreamChunkSchema parses token and tool chunks', () => {
    const tokenChunk = chatStreamChunkSchema.parse({
      conversationId: '123e4567-e89b-12d3-a456-426614174000',
      chunkType: 'token',
      delta: 'Hello, Antigravity!',
    });
    assert.equal(tokenChunk.chunkType, 'token');
    assert.equal(tokenChunk.delta, 'Hello, Antigravity!');

    const toolChunk = chatStreamChunkSchema.parse({
      conversationId: '123e4567-e89b-12d3-a456-426614174000',
      chunkType: 'tool_call',
      toolCall: {
        id: 'call_1',
        name: 'read_file',
        args: '{"path": "package.json"}',
      },
    });
    assert.equal(toolChunk.chunkType, 'tool_call');
    assert.equal(toolChunk.toolCall?.name, 'read_file');
  });
});
