import { z } from 'zod';
import { request } from './client';

const uuid = z.string().uuid();

export const memoryRecordSchema = z.object({
  id: uuid,
  projectId: uuid,
  content: z.string(),
  memoryKind: z.string().optional(),
  scopeKind: z.string().optional(),
  relevanceScore: z.number().optional(),
  version: z.number().int().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
}).passthrough();

export const knowledgeNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  kind: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

export const knowledgeEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  relationship: z.string(),
  weight: z.number().optional(),
}).passthrough();

export const memoryApi = {
  memories: (projectId: string, memoryKind?: string, limit = 50, offset = 0) =>
    request(
      `/projects/${uuid.parse(projectId)}/memories?limit=${limit}&offset=${offset}${memoryKind ? `&memoryKind=${encodeURIComponent(memoryKind)}` : ''}`,
      z.object({ memories: z.array(memoryRecordSchema).optional(), items: z.array(memoryRecordSchema).optional() }).passthrough()
    ),

  memory: (memoryId: string) =>
    request(`/memories/${uuid.parse(memoryId)}`, z.object({ memory: memoryRecordSchema }).passthrough()),

  createMemory: (
    projectId: string,
    content: string,
    memoryKind = 'general',
    scopeKind = 'project',
    metadata: Record<string, unknown> = {},
    operationKey?: string
  ) =>
    request(
      `/projects/${uuid.parse(projectId)}/memories`,
      z.object({ memory: memoryRecordSchema }).passthrough(),
      'POST',
      { content, memoryKind, scopeKind, metadata },
      undefined,
      operationKey
    ),

  reviseMemory: (
    memoryId: string,
    content: string,
    reason?: string,
    operationKey?: string
  ) =>
    request(
      `/memories/${uuid.parse(memoryId)}/revisions`,
      z.object({ memory: memoryRecordSchema }).passthrough(),
      'POST',
      { content, reason },
      undefined,
      operationKey
    ),

  deleteMemory: (memoryId: string, operationKey?: string) =>
    request(
      `/memories/${uuid.parse(memoryId)}`,
      z.object({ deleted: z.boolean() }).passthrough(),
      'DELETE',
      undefined,
      undefined,
      operationKey
    ),

  searchMemories: (projectId: string, query: string, limit = 10, operationKey?: string) =>
    request(
      `/projects/${uuid.parse(projectId)}/memory-search`,
      z.object({ results: z.array(memoryRecordSchema) }).passthrough(),
      'POST',
      { query, limit },
      undefined,
      operationKey
    ),

  indexKnowledge: (projectId: string, operationKey?: string) =>
    request(
      `/projects/${uuid.parse(projectId)}/knowledge-index`,
      z.object({ indexed: z.boolean(), nodeCount: z.number().int().optional() }).passthrough(),
      'POST',
      {},
      undefined,
      operationKey
    ),

  knowledgeNodes: (projectId: string, kind?: string) =>
    request(
      `/projects/${uuid.parse(projectId)}/knowledge/nodes${kind ? `?kind=${encodeURIComponent(kind)}` : ''}`,
      z.object({ nodes: z.array(knowledgeNodeSchema) }).passthrough()
    ),

  knowledgeEdges: (projectId: string) =>
    request(
      `/projects/${uuid.parse(projectId)}/knowledge/edges`,
      z.object({ edges: z.array(knowledgeEdgeSchema) }).passthrough()
    ),
};
