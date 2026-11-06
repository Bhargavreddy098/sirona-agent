import { z } from 'zod';
import { uuidSchema, timestampSchema } from './api.js';

export const digestSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const decimalStringSchema = z.string().regex(/^\d+$/);

// 1. Identity & Sessions
export const userSchema = z.object({
  id: uuidSchema,
  email: z.string().email(),
  name: z.string().nullish(),
  avatarUrl: z.string().url().nullish(),
  role: z.string().default('user'),
  createdAt: timestampSchema.optional(),
  updatedAt: timestampSchema.optional(),
});
export type User = z.infer<typeof userSchema>;

export const workspaceSchema = z.object({
  id: uuidSchema,
  name: z.string().min(1).max(100),
  ownerPrincipalId: uuidSchema.nullish(),
  status: z.string().default('active'),
  createdAt: timestampSchema.optional(),
});
export type Workspace = z.infer<typeof workspaceSchema>;

export const authSessionSchema = z.object({
  principalId: uuidSchema,
  workspaceId: uuidSchema,
  expiresAt: timestampSchema,
  csrfToken: z.string().optional(),
});
export type AuthSession = z.infer<typeof authSessionSchema>;

export const conversationSchema = z.object({
  id: uuidSchema,
  title: z.string().default('New Session'),
  model: z.string().default('auto'),
  project_id: uuidSchema.nullish(),
  workspace_id: uuidSchema.nullish(),
  user_id: uuidSchema.nullish(),
  last_activity_at: z.union([timestampSchema, z.number()]).nullish(),
  created_at: timestampSchema.optional(),
});
export type Conversation = z.infer<typeof conversationSchema>;

export const messageSchema = z.object({
  id: z.coerce.string(),
  sessionId: uuidSchema.optional(),
  role: z.enum(['user', 'assistant', 'system', 'tool']),
  content: z.string().nullish().transform((x: string | null | undefined) => x ?? ''),
  toolCallId: z.string().nullish(),
  toolName: z.string().nullish(),
  toolArgs: z.string().nullish(),
  toolResult: z.string().nullish(),
  status: z.string().default('completed'),
  timestamp: z.number().optional(),
  clientTurnId: z.string().optional(),
});
export type Message = z.infer<typeof messageSchema>;

// 2. Projects & Workspace Files
export const projectSchema = z.object({
  id: uuidSchema,
  workspaceId: uuidSchema.nullish(),
  name: z.string().min(1).max(100),
  description: z.string().nullish(),
  primary_path: z.string().min(1),
  archived: z.coerce.number().int().default(0),
  createdAt: timestampSchema.optional(),
  updatedAt: timestampSchema.optional(),
}).passthrough();
export type Project = z.infer<typeof projectSchema>;

export const artifactSchema = z.object({
  id: uuidSchema,
  projectId: uuidSchema.nullish(),
  sessionId: uuidSchema.nullish(),
  name: z.string().min(1),
  mediaType: z.string().default('application/octet-stream'),
  byteSize: z.coerce.number().int().nonnegative().default(0),
  digest: digestSchema,
  storagePath: z.string(),
  createdAt: timestampSchema.optional(),
});
export type Artifact = z.infer<typeof artifactSchema>;

// 3. Providers & Models
export const providerConnectionSchema = z.object({
  id: uuidSchema,
  workspaceId: uuidSchema.nullish(),
  kind: z.enum(['google', 'openai', 'anthropic', 'openai_compatible']),
  name: z.string().min(1).max(100),
  baseUrl: z.string().url().nullish(),
  isActive: z.boolean().default(true),
  hasApiKey: z.boolean().default(false),
});
export type ProviderConnection = z.infer<typeof providerConnectionSchema>;

export const modelSchema = z.object({
  id: z.string(),
  name: z.string(),
  provider: z.string(),
  connectionName: z.string().nullish(),
  providerConnectionId: uuidSchema.nullish(),
  hasConfiguredApiKey: z.boolean(),
  contextWindow: z.number().int().positive().nullish(),
});
export type Model = z.infer<typeof modelSchema>;

export const settingsSchema = z.object({
  primaryModel: z.string().default('auto'),
  fallbackModel: z.string().default('auto'),
  auxiliaryModels: z.record(z.string(), z.string()).optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().positive().optional(),
});
export type Settings = z.infer<typeof settingsSchema>;

// 4. Execution Engine
export const runSchema = z.object({
  id: uuidSchema,
  projectId: uuidSchema.nullish(),
  sessionId: uuidSchema.nullish(),
  goalId: uuidSchema.nullish(),
  contractRevisionId: uuidSchema.nullish(),
  planRevisionId: uuidSchema.nullish(),
  repositorySnapshotId: uuidSchema.nullish(),
  state: z.string().min(1),
  autonomyMode: z.string().default('supervised'),
  epoch: decimalStringSchema,
  progress: z.object({
    completedTasks: z.number().int(),
    totalTasks: z.number().int(),
  }),
  budget: z.object({
    limit: decimalStringSchema,
    reserved: decimalStringSchema,
    spent: decimalStringSchema,
  }),
  verificationReportId: uuidSchema.nullish(),
  blockers: z.array(z.unknown()).default([]),
  currentSequence: decimalStringSchema.default('0'),
  createdAt: timestampSchema.optional(),
  updatedAt: timestampSchema.optional(),
});
export type Run = z.infer<typeof runSchema>;

export const taskSchema = z.object({
  id: uuidSchema,
  runId: uuidSchema,
  stepKey: z.string(),
  state: z.string().min(1),
  attempt: z.number().int().default(1),
  maxAttempts: z.number().int().default(3),
  leaseEpoch: decimalStringSchema.default('1'),
  dependencies: z.array(z.string()).default([]),
  errorMessage: z.string().nullish(),
  artifactIds: z.array(z.string()).default([]),
});
export type Task = z.infer<typeof taskSchema>;

export const effectSchema = z.object({
  id: uuidSchema,
  runId: uuidSchema,
  taskId: uuidSchema.nullish(),
  toolId: z.string(),
  inputDigest: digestSchema,
  targetSummary: z.string().nullish(),
  risk: z.string().default('medium'),
  state: z.string().min(1),
  approvalId: uuidSchema.nullish(),
  receiptRef: uuidSchema.nullish(),
});
export type Effect = z.infer<typeof effectSchema>;

export const approvalSchema = z.object({
  id: uuidSchema,
  project_id: uuidSchema.nullish(),
  session_id: uuidSchema.nullish(),
  kind: z.string().default('effect'),
  state: z.string().min(1),
  input_digest: digestSchema,
  scope_summary: z.string().nullish(),
  consequences: z.string().nullish(),
  expires_at: timestampSchema,
  consumed_at: timestampSchema.nullish(),
  cost_ceiling_micro_usd: z.union([decimalStringSchema, z.number().int().nonnegative()]).transform(String),
});
export type Approval = z.infer<typeof approvalSchema>;

export const grantSchema = z.object({
  id: uuidSchema,
  project_id: uuidSchema.nullish(),
  session_id: uuidSchema.nullish(),
  capability: z.string(),
  resource_scope: z.record(z.string(), z.unknown()),
  expires_at: timestampSchema,
});
export type Grant = z.infer<typeof grantSchema>;
