import { z } from 'zod';
import { request } from './client';

const uuid = z.string().uuid();
const decimal = z.string().regex(/^\d+$/);

export const policyRuleSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  action: z.string().optional(),
  resource: z.string().optional(),
  effect: z.enum(['allow', 'deny', 'require_approval']).optional(),
}).passthrough();

export const policyRevisionSchema = z.object({
  id: uuid,
  version: z.number().int(),
  rules: z.array(policyRuleSchema),
  isActive: z.boolean().optional(),
  createdAt: z.string().optional(),
});

export const budgetSchema = z.object({
  id: uuid.optional(),
  projectId: uuid.optional(),
  limitMicroUsd: z.union([decimal, z.number()]).transform(String),
  spentMicroUsd: z.union([decimal, z.number()]).transform(String).optional(),
  reservedMicroUsd: z.union([decimal, z.number()]).transform(String).optional(),
  alertThresholdPercent: z.number().optional(),
}).passthrough();

export const usageRecordSchema = z.object({
  totalPromptTokens: z.number().int().optional(),
  totalCompletionTokens: z.number().int().optional(),
  totalCostMicroUsd: z.union([decimal, z.number()]).transform(String).optional(),
  callsCount: z.number().int().optional(),
}).passthrough();

export const governanceApi = {
  currentPolicy: () =>
    request('/policies/current', z.object({ policy: policyRevisionSchema }).passthrough()),

  createPolicyRevision: (rules: unknown[], operationKey?: string) =>
    request(
      '/policies/revisions',
      z.object({ policy: policyRevisionSchema }).passthrough(),
      'POST',
      { rules },
      undefined,
      operationKey
    ),

  activatePolicy: (revisionId: string, operationKey?: string) =>
    request(
      `/policies/${uuid.parse(revisionId)}/activate`,
      z.object({ success: z.boolean(), policy: policyRevisionSchema.optional() }).passthrough(),
      'POST',
      {},
      undefined,
      operationKey
    ),

  grants: (projectId: string) =>
    request(`/projects/${uuid.parse(projectId)}/grants`, z.object({ grants: z.array(z.record(z.string(), z.unknown())) }).passthrough()),

  createGrant: (
    projectId: string,
    capability: string,
    resourceScope: Record<string, unknown> = {},
    expiresInSeconds = 3600,
    operationKey?: string
  ) =>
    request(
      `/projects/${uuid.parse(projectId)}/grants`,
      z.object({ grant: z.record(z.string(), z.unknown()) }).passthrough(),
      'POST',
      { capability, resourceScope, expiresInSeconds },
      undefined,
      operationKey
    ),

  revokeGrant: (grantId: string, operationKey?: string) =>
    request(
      `/grants/${uuid.parse(grantId)}/revoke`,
      z.object({ revoked: z.boolean() }).passthrough(),
      'POST',
      {},
      undefined,
      operationKey
    ),

  approval: (approvalId: string) =>
    request(`/approvals/${uuid.parse(approvalId)}`, z.object({ approval: z.record(z.string(), z.unknown()) }).passthrough()),

  revokeApproval: (approvalId: string, reason?: string, operationKey?: string) =>
    request(
      `/approvals/${uuid.parse(approvalId)}/revoke`,
      z.object({ revoked: z.boolean(), approval: z.record(z.string(), z.unknown()).optional() }).passthrough(),
      'POST',
      { reason },
      undefined,
      operationKey
    ),

  budgets: (projectId: string) =>
    request(`/projects/${uuid.parse(projectId)}/budgets`, z.object({ budget: budgetSchema.optional() }).passthrough()),

  setBudget: (
    projectId: string,
    limitMicroUsd: string | number,
    alertThresholdPercent = 80,
    operationKey?: string
  ) =>
    request(
      `/projects/${uuid.parse(projectId)}/budgets`,
      z.object({ budget: budgetSchema }).passthrough(),
      'POST',
      { limitMicroUsd: String(limitMicroUsd), alertThresholdPercent },
      undefined,
      operationKey
    ),

  reserveBudget: (accountId: string, amountMicroUsd: string | number, operationKey?: string) =>
    request(
      `/budgets/${uuid.parse(accountId)}/reserve`,
      z.object({ reserved: z.boolean() }).passthrough(),
      'POST',
      { amountMicroUsd: String(amountMicroUsd) },
      undefined,
      operationKey
    ),

  usage: (projectId?: string) =>
    request(`/usage${projectId ? `?projectId=${encodeURIComponent(projectId)}` : ''}`, z.object({ usage: usageRecordSchema }).passthrough()),

  leaseStatus: (sessionId: string) =>
    request(`/sessions/${uuid.parse(sessionId)}/lease`, z.object({ active: z.boolean(), lease: z.record(z.string(), z.unknown()).optional() }).passthrough()),

  acquireLease: (sessionId: string, durationSeconds = 300, operationKey?: string) =>
    request(
      `/sessions/${uuid.parse(sessionId)}/lease`,
      z.object({ acquired: z.boolean(), lease: z.record(z.string(), z.unknown()).optional() }).passthrough(),
      'POST',
      { durationSeconds },
      undefined,
      operationKey
    ),

  releaseLease: (sessionId: string, operationKey?: string) =>
    request(
      `/sessions/${uuid.parse(sessionId)}/lease`,
      z.object({ released: z.boolean() }).passthrough(),
      'DELETE',
      undefined,
      undefined,
      operationKey
    ),
};
