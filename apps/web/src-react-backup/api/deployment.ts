import { z } from 'zod';
import { request } from './client';

const uuid = z.string().uuid();

export const deploymentPreviewSchema = z.object({
  id: uuid.optional(),
  runId: uuid,
  environment: z.string().optional(),
  targetSummary: z.string().optional(),
  artifacts: z.array(z.record(z.string(), z.unknown())).optional(),
  risks: z.array(z.string()).optional(),
}).passthrough();

export const deploymentSchema = z.object({
  id: uuid,
  runId: uuid,
  environment: z.string(),
  status: z.enum(['pending', 'deploying', 'active', 'failed', 'rolled_back']),
  url: z.string().url().nullish(),
  createdAt: z.string().optional(),
  deployedAt: z.string().nullish(),
}).passthrough();

export const browserQASessionSchema = z.object({
  id: uuid,
  runId: uuid,
  status: z.enum(['running', 'passed', 'failed', 'timed_out']),
  testedUrls: z.array(z.string()).optional(),
  findings: z.array(z.record(z.string(), z.unknown())).optional(),
  createdAt: z.string().optional(),
}).passthrough();

export const deploymentApi = {
  preview: (runId: string, environment = 'staging', operationKey?: string) =>
    request(
      `/runs/${uuid.parse(runId)}/deployment-previews`,
      z.object({ preview: deploymentPreviewSchema }).passthrough(),
      'POST',
      { environment },
      undefined,
      operationKey
    ),

  create: (runId: string, environment = 'staging', config: Record<string, unknown> = {}, operationKey?: string) =>
    request(
      `/runs/${uuid.parse(runId)}/deployments`,
      z.object({ deployment: deploymentSchema }).passthrough(),
      'POST',
      { environment, config },
      undefined,
      operationKey
    ),

  get: (deploymentId: string) =>
    request(`/deployments/${uuid.parse(deploymentId)}`, z.object({ deployment: deploymentSchema }).passthrough()),

  rollbackPreview: (deploymentId: string, operationKey?: string) =>
    request(
      `/deployments/${uuid.parse(deploymentId)}/rollback-previews`,
      z.object({ preview: z.record(z.string(), z.unknown()) }).passthrough(),
      'POST',
      {},
      undefined,
      operationKey
    ),

  rollback: (deploymentId: string, reason?: string, operationKey?: string) =>
    request(
      `/deployments/${uuid.parse(deploymentId)}/rollback`,
      z.object({ rolledBack: z.boolean(), deployment: deploymentSchema.optional() }).passthrough(),
      'POST',
      { reason },
      undefined,
      operationKey
    ),

  createQaSession: (runId: string, targetUrl: string, scenarios: string[] = [], operationKey?: string) =>
    request(
      `/runs/${uuid.parse(runId)}/browser-qa-sessions`,
      z.object({ session: browserQASessionSchema }).passthrough(),
      'POST',
      { targetUrl, scenarios },
      undefined,
      operationKey
    ),

  qaSessions: (runId: string) =>
    request(
      `/runs/${uuid.parse(runId)}/browser-qa-sessions`,
      z.object({ sessions: z.array(browserQASessionSchema) }).passthrough()
    ),
};
