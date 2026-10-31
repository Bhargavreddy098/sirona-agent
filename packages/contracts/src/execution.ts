import { z } from 'zod';
import { uuidSchema, timestampSchema, problemDetailsSchema } from './api.js';
import { decimalStringSchema, digestSchema } from './models.js';

// Server-owned execution fencing token (never exposed to renderer as a lease authority)
export const executionFenceSchema = z.object({
  holder: z.string().min(1),
  runEpoch: decimalStringSchema,
  leaseEpoch: decimalStringSchema,
  acquiredAt: timestampSchema.optional(),
  expiresAt: timestampSchema.optional(),
});
export type ExecutionFence = z.infer<typeof executionFenceSchema>;

// Tool execution invocation and receipts
export const toolRiskLevelSchema = z.enum(['low', 'medium', 'high', 'critical']);
export type ToolRiskLevel = z.infer<typeof toolRiskLevelSchema>;

export const toolExecutionRequestSchema = z.object({
  toolId: z.string().min(1),
  toolName: z.string().optional(),
  input: z.record(z.string(), z.unknown()),
  riskLevel: toolRiskLevelSchema.default('medium'),
  approvalId: uuidSchema.nullish(),
  idempotencyKey: z.string().optional(),
});
export type ToolExecutionRequest = z.infer<typeof toolExecutionRequestSchema>;

export const toolExecutionStatusSchema = z.enum(['success', 'failure', 'rejected', 'cancelled']);
export type ToolExecutionStatus = z.infer<typeof toolExecutionStatusSchema>;

export const toolExecutionReceiptSchema = z.object({
  effectId: uuidSchema,
  toolId: z.string().min(1),
  status: toolExecutionStatusSchema,
  result: z.unknown().optional(),
  error: problemDetailsSchema.optional(),
  inputDigest: digestSchema,
  outputDigest: digestSchema.optional(),
  executedAt: timestampSchema,
  durationMs: z.number().int().nonnegative().optional(),
});
export type ToolExecutionReceipt = z.infer<typeof toolExecutionReceiptSchema>;

// File patch and diff preview schemas
export const applyPreviewRequestSchema = z.object({
  filePath: z.string().min(1),
  patch: z.string().optional(),
  content: z.string().optional(),
  originalDigest: digestSchema.optional(),
});
export type ApplyPreviewRequest = z.infer<typeof applyPreviewRequestSchema>;

export const applyPreviewResponseSchema = z.object({
  filePath: z.string().min(1),
  diff: z.string(),
  canApply: z.boolean(),
  conflicts: z.array(z.string()).default([]),
  newDigest: digestSchema.optional(),
});
export type ApplyPreviewResponse = z.infer<typeof applyPreviewResponseSchema>;

// Run lifecycle requests
export const autonomyModeSchema = z.enum(['supervised', 'semi-autonomous', 'autonomous']);
export type AutonomyMode = z.infer<typeof autonomyModeSchema>;

export const startRunRequestSchema = z.object({
  conversationId: uuidSchema.optional(),
  projectId: uuidSchema.optional(),
  goalId: uuidSchema.optional(),
  autonomyMode: autonomyModeSchema.default('supervised'),
  parameters: z.record(z.string(), z.unknown()).optional(),
});
export type StartRunRequest = z.infer<typeof startRunRequestSchema>;

export const runActionSchema = z.enum(['pause', 'resume', 'cancel', 'step']);
export type RunAction = z.infer<typeof runActionSchema>;

export const runActionRequestSchema = z.object({
  action: runActionSchema,
  reason: z.string().optional(),
});
export type RunActionRequest = z.infer<typeof runActionRequestSchema>;

export const resolveApprovalDecisionSchema = z.enum(['approved', 'rejected']);
export type ResolveApprovalDecision = z.infer<typeof resolveApprovalDecisionSchema>;

export const resolveApprovalRequestSchema = z.object({
  decision: resolveApprovalDecisionSchema,
  reason: z.string().optional(),
  approverPrincipalId: uuidSchema.optional(),
});
export type ResolveApprovalRequest = z.infer<typeof resolveApprovalRequestSchema>;
