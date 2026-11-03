import { z } from 'zod';
import { request } from './client';
import { conversationSchema, messageSchema } from './schemas';

const uuid = z.string().uuid();

export const artifactSchema = z.object({
  id: uuid,
  projectId: uuid.optional(),
  name: z.string(),
  kind: z.string().optional(),
  path: z.string().optional(),
  contentDigest: z.string().optional(),
  sizeBytes: z.number().int().optional(),
  createdAt: z.string().optional(),
}).passthrough();

export const snapshotSchema = z.object({
  id: uuid,
  project_id: uuid,
  tree_digest: z.string(),
  status: z.string(),
  created_at: z.string(),
}).passthrough();

export const projectsApi = {
  // Standalone Conversations
  conversation: (conversationId: string) =>
    request(
      `/conversations/${uuid.parse(conversationId)}`,
      z.object({ conversation: conversationSchema })
    ),

  deleteConversation: (conversationId: string) =>
    request(
      `/conversations/${uuid.parse(conversationId)}`,
      z.object({ success: z.boolean() }),
      'DELETE'
    ),

  // Messages
  messages: (conversationId: string, limit = 500) =>
    request(
      `/conversations/${uuid.parse(conversationId)}/messages?limit=${limit}`,
      z.object({ messages: z.array(messageSchema), total: z.number() })
    ),

  postMessage: (conversationId: string, content: string, role = 'user') =>
    request(
      `/conversations/${uuid.parse(conversationId)}/messages`,
      z.object({ message: messageSchema }),
      'POST',
      { content, role }
    ),

  // Snapshots
  createSnapshot: (projectId: string, label?: string) =>
    request(
      `/projects/${uuid.parse(projectId)}/snapshots`,
      z.object({ snapshot: snapshotSchema }).passthrough(),
      'POST',
      { label }
    ),

  snapshots: (projectId: string) =>
    request(
      `/projects/${uuid.parse(projectId)}/snapshots`,
      z.object({ snapshots: z.array(snapshotSchema), total: z.number().int() })
    ),

  // Artifacts
  artifacts: (projectId: string) =>
    request(
      `/projects/${uuid.parse(projectId)}/artifacts`,
      z.object({ artifacts: z.array(artifactSchema) })
    ),

  artifact: (artifactId: string) =>
    request(
      `/artifacts/${uuid.parse(artifactId)}`,
      z.object({ artifact: artifactSchema })
    ),

  artifactContent: (artifactId: string) =>
    request(
      `/artifacts/${uuid.parse(artifactId)}/content`,
      z.object({ content: z.string(), mimeType: z.string().optional() }).passthrough()
    ),

  // Uploads, Scans & Structure
  upload: (projectId: string, fileData: { filename: string; content: string }) =>
    request(
      `/projects/${uuid.parse(projectId)}/uploads`,
      z.object({ uploaded: z.boolean(), artifactId: uuid.optional() }).passthrough(),
      'POST',
      fileData
    ),

  scan: (projectId: string) =>
    request(
      `/projects/${uuid.parse(projectId)}/scan`,
      z.object({ scanned: z.boolean(), fileCount: z.number().int().optional() }).passthrough(),
      'POST',
      {}
    ),

  structure: (projectId: string) =>
    request(
      `/projects/${uuid.parse(projectId)}/structure`,
      z.object({ structure: z.record(z.string(), z.unknown()) }).passthrough()
    ),
};
