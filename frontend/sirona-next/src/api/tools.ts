import { z } from 'zod';
import { request } from './client';

const uuid = z.string().uuid();

export const toolDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  capability: z.string().optional(),
  availability: z.enum(['available', 'unavailable', 'restricted']).optional(),
  inputSchema: z.record(z.string(), z.unknown()).optional(),
  outputSchema: z.record(z.string(), z.unknown()).optional(),
  riskLevel: z.enum(['read_only', 'guarded', 'high_impact']).optional(),
}).passthrough();

export const toolReceiptSchema = z.object({
  id: uuid,
  toolId: z.string(),
  runId: uuid.optional(),
  inputDigest: z.string().optional(),
  outputDigest: z.string().optional(),
  status: z.enum(['success', 'failure', 'cancelled']),
  executedAt: z.string().optional(),
  durationMs: z.number().optional(),
  result: z.unknown().optional(),
}).passthrough();

export const developerConnectionSchema = z.object({
  id: uuid,
  name: z.string(),
  kind: z.string(),
  status: z.enum(['connected', 'disconnected', 'qualifying', 'failed']),
  endpoint: z.string().optional(),
  qualifiedAt: z.string().nullish(),
  capabilities: z.array(z.string()).optional(),
  createdAt: z.string().optional(),
}).passthrough();

export const toolsApi = {
  tools: (capability?: string, availability = 'available') =>
    request(
      `/tools?limit=100${capability ? `&capability=${encodeURIComponent(capability)}` : ''}&availability=${encodeURIComponent(availability)}`,
      z.object({ catalog: z.array(toolDefinitionSchema).optional(), tools: z.array(toolDefinitionSchema).optional() }).passthrough()
    ),

  tool: (toolId: string) =>
    request(`/tools/${encodeURIComponent(toolId)}`, z.object({ tool: toolDefinitionSchema }).passthrough()),

  invokeTool: (
    toolId: string,
    input: Record<string, unknown>,
    grantId?: string,
    operationKey?: string
  ) =>
    request(
      '/tools/invoke',
      z.object({ receipt: toolReceiptSchema, result: z.unknown().optional() }).passthrough(),
      'POST',
      { toolId, input, grantId },
      undefined,
      operationKey
    ),

  receipt: (receiptId: string) =>
    request(`/tools/receipts/${uuid.parse(receiptId)}`, z.object({ receipt: toolReceiptSchema }).passthrough()),

  connections: () =>
    request('/developer-connections', z.object({ connections: z.array(developerConnectionSchema) }).passthrough()),

  connection: (connectionId: string) =>
    request(
      `/developer-connections/${uuid.parse(connectionId)}`,
      z.object({ connection: developerConnectionSchema }).passthrough()
    ),

  createConnection: (
    name: string,
    kind: string,
    endpoint?: string,
    config?: Record<string, unknown>,
    operationKey?: string
  ) =>
    request(
      '/developer-connections',
      z.object({ connection: developerConnectionSchema }).passthrough(),
      'POST',
      { name, kind, endpoint, config },
      undefined,
      operationKey
    ),

  qualifyConnection: (connectionId: string, operationKey?: string) =>
    request(
      `/developer-connections/${uuid.parse(connectionId)}/qualify`,
      z.object({ qualified: z.boolean(), connection: developerConnectionSchema.optional() }).passthrough(),
      'POST',
      {},
      undefined,
      operationKey
    ),

  disconnectConnection: (connectionId: string, operationKey?: string) =>
    request(
      `/developer-connections/${uuid.parse(connectionId)}/disconnect`,
      z.object({ disconnected: z.boolean() }).passthrough(),
      'POST',
      {},
      undefined,
      operationKey
    ),

  deleteConnection: (connectionId: string, operationKey?: string) =>
    request(
      `/developer-connections/${uuid.parse(connectionId)}`,
      z.object({ deleted: z.boolean() }).passthrough(),
      'DELETE',
      undefined,
      undefined,
      operationKey
    ),
};
