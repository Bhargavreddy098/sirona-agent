import { z } from 'zod';
import { request } from './client';

const uuid = z.string().uuid();

export const scheduleSchema = z.object({
  id: uuid,
  projectId: uuid,
  cronExpression: z.string(),
  goalTemplate: z.string().optional(),
  actionSummary: z.string().optional(),
  status: z.enum(['active', 'paused', 'disabled']),
  nextRunAt: z.string().nullish(),
  lastRunAt: z.string().nullish(),
  createdAt: z.string().optional(),
}).passthrough();

export const triggerSchema = z.object({
  id: uuid,
  projectId: uuid,
  kind: z.string(),
  config: z.record(z.string(), z.unknown()).optional(),
  status: z.enum(['active', 'disabled']),
  createdAt: z.string().optional(),
}).passthrough();

export const occurrenceSchema = z.object({
  id: uuid,
  scheduleId: uuid,
  runId: uuid.nullish(),
  status: z.string(),
  triggeredAt: z.string(),
  completedAt: z.string().nullish(),
}).passthrough();

export const notificationSchema = z.object({
  id: uuid,
  title: z.string(),
  message: z.string(),
  read: z.boolean(),
  kind: z.string().optional(),
  createdAt: z.string().optional(),
}).passthrough();

export const activitySchema = z.object({
  id: uuid,
  type: z.string(),
  summary: z.string(),
  timestamp: z.string(),
  actor: z.string().optional(),
  projectId: uuid.nullish(),
}).passthrough();

export const automationApi = {
  schedules: (projectId: string) =>
    request(
      `/projects/${uuid.parse(projectId)}/schedules`,
      z.object({ schedules: z.array(scheduleSchema) }).passthrough()
    ),

  previewSchedule: (cronExpression: string, timezone?: string, operationKey?: string) =>
    request(
      '/projects/preview/schedules/preview',
      z.object({ nextOccurrences: z.array(z.string()) }).passthrough(),
      'POST',
      { cronExpression, timezone },
      undefined,
      operationKey
    ).catch(() => ({ nextOccurrences: [] })),

  createSchedule: (
    projectId: string,
    cronExpression: string,
    goalTemplate: string,
    operationKey?: string
  ) =>
    request(
      `/projects/${uuid.parse(projectId)}/schedules`,
      z.object({ schedule: scheduleSchema }).passthrough(),
      'POST',
      { cronExpression, goalTemplate },
      undefined,
      operationKey
    ),

  updateSchedule: (
    scheduleId: string,
    updates: { cronExpression?: string; goalTemplate?: string },
    operationKey?: string
  ) =>
    request(
      `/schedules/${uuid.parse(scheduleId)}`,
      z.object({ schedule: scheduleSchema }).passthrough(),
      'PATCH',
      updates,
      undefined,
      operationKey
    ),

  pauseSchedule: (scheduleId: string, operationKey?: string) =>
    request(
      `/schedules/${uuid.parse(scheduleId)}/pause`,
      z.object({ paused: z.boolean() }).passthrough(),
      'POST',
      {},
      undefined,
      operationKey
    ),

  resumeSchedule: (scheduleId: string, operationKey?: string) =>
    request(
      `/schedules/${uuid.parse(scheduleId)}/resume`,
      z.object({ resumed: z.boolean() }).passthrough(),
      'POST',
      {},
      undefined,
      operationKey
    ),

  occurrences: (scheduleId: string) =>
    request(
      `/schedules/${uuid.parse(scheduleId)}/occurrences`,
      z.object({ occurrences: z.array(occurrenceSchema) }).passthrough()
    ),

  triggers: (projectId: string) =>
    request(
      `/projects/${uuid.parse(projectId)}/triggers`,
      z.object({ triggers: z.array(triggerSchema) }).passthrough()
    ),

  createTrigger: (
    projectId: string,
    kind: string,
    config: Record<string, unknown> = {},
    operationKey?: string
  ) =>
    request(
      `/projects/${uuid.parse(projectId)}/triggers`,
      z.object({ trigger: triggerSchema }).passthrough(),
      'POST',
      { kind, config },
      undefined,
      operationKey
    ),

  updateTrigger: (
    triggerId: string,
    updates: { status?: 'active' | 'disabled'; config?: Record<string, unknown> },
    operationKey?: string
  ) =>
    request(
      `/triggers/${uuid.parse(triggerId)}`,
      z.object({ trigger: triggerSchema }).passthrough(),
      'PATCH',
      updates,
      undefined,
      operationKey
    ),

  events: (projectId: string) =>
    request(
      `/projects/${uuid.parse(projectId)}/events`,
      z.object({ events: z.array(z.record(z.string(), z.unknown())) }).passthrough()
    ),

  activity: () =>
    request(
      '/activity',
      z.object({ activity: z.array(activitySchema).optional(), items: z.array(activitySchema).optional() }).passthrough()
    ),

  notifications: () =>
    request(
      '/notifications',
      z.object({ notifications: z.array(notificationSchema) }).passthrough()
    ),

  readNotification: (notificationId: string, operationKey?: string) =>
    request(
      `/notifications/${uuid.parse(notificationId)}/read`,
      z.object({ success: z.boolean() }).passthrough(),
      'POST',
      {},
      undefined,
      operationKey
    ),
};
