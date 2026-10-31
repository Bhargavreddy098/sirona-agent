import { z } from 'zod';
import { request } from './client';

const uuid = z.string().uuid();
const hash = z.string().regex(/^[a-f0-9]{64}$/);

export const planStepSchema = z.object({
  key: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  dependencies: z.array(z.string()).optional(),
  estimatedCostMicroUsd: z.string().optional(),
}).passthrough();

export const planDetailsSchema = z.object({
  id: uuid,
  goalId: uuid,
  revision: z.number().int(),
  digest: hash.optional(),
  steps: z.array(planStepSchema).optional(),
  layers: z.record(z.string(), z.unknown()).optional(),
  status: z.string().optional(),
  createdAt: z.string().optional(),
}).passthrough();

export const contractDetailsSchema = z.object({
  id: uuid,
  goalId: uuid,
  revision: z.number().int(),
  digest: hash.optional(),
  planRevisionId: uuid.nullish(),
  document: z.record(z.string(), z.unknown()).optional(),
  status: z.string().optional(),
  createdAt: z.string().optional(),
}).passthrough();

export const contractDiffSchema = z.object({
  baseRevisionId: uuid.optional(),
  targetRevisionId: uuid.optional(),
  changes: z.array(z.record(z.string(), z.unknown())).optional(),
  summary: z.string().optional(),
}).passthrough();

export const planningApi = {
  createPlan: (goalId: string, layers?: Record<string, unknown>, operationKey?: string) =>
    request(
      `/goals/${uuid.parse(goalId)}/plans`,
      z.object({ plan: planDetailsSchema }).passthrough(),
      'POST',
      { layers },
      undefined,
      operationKey
    ),

  plans: (goalId: string) =>
    request(
      `/goals/${uuid.parse(goalId)}/plans`,
      z.object({ plans: z.array(planDetailsSchema) }).passthrough()
    ),

  revisePlan: (planId: string, steps: unknown[], layers?: Record<string, unknown>, operationKey?: string) =>
    request(
      `/plans/${uuid.parse(planId)}/revisions`,
      z.object({ revision: planDetailsSchema }).passthrough(),
      'POST',
      { steps, layers },
      undefined,
      operationKey
    ),

  planRevision: (revisionId: string) =>
    request(
      `/plan-revisions/${uuid.parse(revisionId)}`,
      z.object({ revision: planDetailsSchema }).passthrough()
    ),

  createContract: (goalId: string, planRevisionId: string, document: Record<string, unknown>, operationKey?: string) =>
    request(
      `/goals/${uuid.parse(goalId)}/contracts`,
      z.object({ contract: contractDetailsSchema }).passthrough(),
      'POST',
      { planRevisionId, document },
      undefined,
      operationKey
    ),

  reviseContract: (contractId: string, document: Record<string, unknown>, planRevisionId?: string, operationKey?: string) =>
    request(
      `/contracts/${uuid.parse(contractId)}/revisions`,
      z.object({ revision: contractDetailsSchema }).passthrough(),
      'POST',
      { document, planRevisionId },
      undefined,
      operationKey
    ),

  contracts: (contractId: string) =>
    request(
      `/contracts/${uuid.parse(contractId)}/revisions`,
      z.object({ revisions: z.array(contractDetailsSchema) }).passthrough()
    ),

  contractRevision: (revisionId: string) =>
    request(
      `/contract-revisions/${uuid.parse(revisionId)}`,
      z.object({ revision: contractDetailsSchema }).passthrough()
    ),

  contractDiff: (revisionId: string, compareWithId?: string) =>
    request(
      `/contract-revisions/${uuid.parse(revisionId)}/diff${compareWithId ? `?compareWith=${encodeURIComponent(compareWithId)}` : ''}`,
      z.object({ diff: contractDiffSchema }).passthrough()
    ),
};
