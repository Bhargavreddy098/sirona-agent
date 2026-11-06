import { z } from 'zod';

export const uuidSchema = z.string().uuid();
export const timestampSchema = z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/));

export const problemDetailsSchema = z.object({
  status: z.number().int().min(100).max(599),
  title: z.string().optional(),
  detail: z.string().optional(),
  code: z.string().optional(),
  category: z.string().optional(),
  requestId: z.string().optional(),
  timestamp: z.string().optional(),
}).passthrough();

export type ProblemDetails = z.infer<typeof problemDetailsSchema>;

export const paginationParamsSchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type PaginationParams = z.infer<typeof paginationParamsSchema>;

export function successEnvelope<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    data: dataSchema,
    meta: z.object({
      requestId: z.string().optional(),
      version: z.number().int().optional(),
    }).passthrough().optional(),
  });
}
