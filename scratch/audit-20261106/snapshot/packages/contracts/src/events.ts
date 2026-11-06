import { z } from 'zod';
import { uuidSchema, timestampSchema, problemDetailsSchema } from './api.js';
import { decimalStringSchema } from './models.js';

export const runEventTypeSchema = z.enum([
  'RUN_CREATED',
  'RUN_STARTED',
  'RUN_PROGRESS',
  'RUN_PAUSED',
  'RUN_RESUMED',
  'RUN_COMPLETED',
  'RUN_FAILED',
  'RUN_CANCELLED',
  'TASK_STARTED',
  'TASK_COMPLETED',
  'TASK_FAILED',
  'EFFECT_REQUESTED',
  'APPROVAL_REQUIRED',
  'APPROVAL_RESOLVED',
  'TOOL_CALL',
  'TOOL_RESULT',
]);
export type RunEventType = z.infer<typeof runEventTypeSchema>;

export const runEventSchema = z.object({
  id: uuidSchema,
  runId: uuidSchema,
  sequence: decimalStringSchema,
  type: runEventTypeSchema.or(z.string()),
  timestamp: timestampSchema,
  payload: z.record(z.string(), z.unknown()).default({}),
  cursor: z.string().optional(),
});
export type RunEvent = z.infer<typeof runEventSchema>;

export const runStreamParamsSchema = z.object({
  afterSequence: decimalStringSchema.optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(500).default(100),
});
export type RunStreamParams = z.infer<typeof runStreamParamsSchema>;

export const chatStreamChunkTypeSchema = z.enum([
  'token',
  'tool_call',
  'tool_result',
  'thought',
  'done',
  'error',
]);
export type ChatStreamChunkType = z.infer<typeof chatStreamChunkTypeSchema>;

export const chatStreamChunkSchema = z.object({
  conversationId: uuidSchema,
  turnId: z.string().optional(),
  chunkType: chatStreamChunkTypeSchema,
  content: z.string().optional(),
  delta: z.string().optional(),
  toolCall: z.object({
    id: z.string(),
    name: z.string(),
    args: z.string(),
  }).optional(),
  error: problemDetailsSchema.optional(),
});
export type ChatStreamChunk = z.infer<typeof chatStreamChunkSchema>;
