import { z } from 'zod';
import { request } from './client';

const uuid = z.string().uuid();

export const goalRecordSchema = z.object({
  id: uuid,
  projectId: uuid,
  intent: z.string(),
  status: z.string(),
  autonomyMode: z.string().optional(),
  activeContractRevisionId: uuid.nullish(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
}).passthrough();

export const clarificationSchema = z.object({
  id: uuid,
  goalId: uuid,
  question: z.string(),
  options: z.array(z.string()).optional(),
  answer: z.string().nullish(),
  status: z.enum(['pending', 'answered', 'skipped']).optional(),
  createdAt: z.string().optional(),
}).passthrough();

export const researchRecordSchema = z.object({
  id: uuid.optional(),
  goalId: uuid,
  findings: z.array(z.record(z.string(), z.unknown())).optional(),
  summary: z.string().optional(),
  status: z.string().optional(),
  createdAt: z.string().optional(),
}).passthrough();

export const requirementRevisionSchema = z.object({
  id: uuid,
  goalId: uuid,
  version: z.number().int(),
  requirements: z.array(z.record(z.string(), z.unknown())),
  status: z.string().optional(),
  createdAt: z.string().optional(),
}).passthrough();

export const decisionRecordSchema = z.object({
  id: uuid,
  goalId: uuid,
  title: z.string(),
  rationale: z.string().optional(),
  status: z.string().optional(),
  createdAt: z.string().optional(),
}).passthrough();

export const intentApi = {
  createGoalFromChat: (
    conversationId: string,
    messageId?: string,
    constraints?: unknown[],
    autonomyMode?: string,
    operationKey?: string
  ) =>
    request(
      `/conversations/${uuid.parse(conversationId)}/goals`,
      z.object({ goal: goalRecordSchema }).passthrough(),
      'POST',
      { messageId, constraints, autonomyMode },
      undefined,
      operationKey
    ),

  goals: (projectId: string, status?: string) =>
    request(
      `/projects/${uuid.parse(projectId)}/goals${status ? `?status=${encodeURIComponent(status)}` : ''}`,
      z.object({ goals: z.array(goalRecordSchema) }).passthrough()
    ),

  goal: (goalId: string) =>
    request(`/goals/${uuid.parse(goalId)}`, z.object({ goal: goalRecordSchema }).passthrough()),

  analyzeIntent: (goalId: string, operationKey?: string) =>
    request(
      `/goals/${uuid.parse(goalId)}/intent-analysis`,
      z.object({ analysis: z.record(z.string(), z.unknown()) }).passthrough(),
      'POST',
      {},
      undefined,
      operationKey
    ),

  clarifications: (goalId: string) =>
    request(
      `/goals/${uuid.parse(goalId)}/clarifications`,
      z.object({ clarifications: z.array(clarificationSchema) }).passthrough()
    ),

  createClarification: (goalId: string, question: string, options?: string[], operationKey?: string) =>
    request(
      `/goals/${uuid.parse(goalId)}/clarifications`,
      z.object({ clarification: clarificationSchema }).passthrough(),
      'POST',
      { question, options },
      undefined,
      operationKey
    ),

  answerClarification: (clarificationId: string, answer: string, operationKey?: string) =>
    request(
      `/clarifications/${uuid.parse(clarificationId)}/answers`,
      z.object({ clarification: clarificationSchema }).passthrough(),
      'POST',
      { answer },
      undefined,
      operationKey
    ),

  startResearch: (goalId: string, scope?: string[], operationKey?: string) =>
    request(
      `/goals/${uuid.parse(goalId)}/research`,
      z.object({ research: researchRecordSchema }).passthrough(),
      'POST',
      { scope },
      undefined,
      operationKey
    ),

  getResearch: (goalId: string) =>
    request(`/goals/${uuid.parse(goalId)}/research`, z.object({ research: researchRecordSchema.optional() }).passthrough()),

  createRequirement: (goalId: string, requirements: unknown[], operationKey?: string) =>
    request(
      `/goals/${uuid.parse(goalId)}/requirement-revisions`,
      z.object({ revision: requirementRevisionSchema }).passthrough(),
      'POST',
      { requirements },
      undefined,
      operationKey
    ),

  requirements: (goalId: string) =>
    request(
      `/goals/${uuid.parse(goalId)}/requirement-revisions`,
      z.object({ revisions: z.array(requirementRevisionSchema) }).passthrough()
    ),

  requirement: (revisionId: string) =>
    request(
      `/requirement-revisions/${uuid.parse(revisionId)}`,
      z.object({ revision: requirementRevisionSchema }).passthrough()
    ),

  decisions: (goalId: string) =>
    request(
      `/goals/${uuid.parse(goalId)}/decisions`,
      z.object({ decisions: z.array(decisionRecordSchema) }).passthrough()
    ),

  recordDecision: (goalId: string, title: string, rationale?: string, operationKey?: string) =>
    request(
      `/goals/${uuid.parse(goalId)}/decisions`,
      z.object({ decision: decisionRecordSchema }).passthrough(),
      'POST',
      { title, rationale },
      undefined,
      operationKey
    ),
};
