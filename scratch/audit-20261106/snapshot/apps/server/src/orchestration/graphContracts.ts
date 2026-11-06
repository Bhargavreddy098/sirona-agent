import {z} from 'zod-v4';
/** Wire-safe bounded internal contracts. Credentials and caller-selected permission booleans are excluded. */
export const boundedOutputSchema=z.object({
 maxTokens:z.number().int().min(1).max(8192),
 maxDurationSeconds:z.number().int().min(1).max(120),
 contextOutputCap:z.number().int().min(1).max(32768),
}).strict();
export type BoundedOutput=z.infer<typeof boundedOutputSchema>;
export const runLimitsSchema=z.object({
 maxParallelSpecialists:z.number().int().min(1).max(3),
 maxTotalDelegatedTasks:z.number().int().min(1).max(12),
 maxCritiqueRounds:z.number().int().min(0).max(2),
 maxRepairRounds:z.number().int().min(0).max(2),
 runDeadlineSeconds:z.number().int().min(1).max(1800),
 specialistInvocationDeadlineSeconds:z.number().int().min(1).max(120),
}).strict();
export const graphIdentitySchema=z.object({runId:z.uuid(),graphVersion:z.literal('1.0.0'),engine:z.literal('langgraph')}).strict();
export const specialistAssignmentSchema=z.object({key:z.string().regex(/^[a-zA-Z0-9_-]{1,32}$/),description:z.string().min(1).max(8192)}).strict();
export const commandSchema=z.array(z.string().min(1).max(131072).refine(s=>!s.includes('\0'))).min(1).max(64);
export const orchestrationSettingsSchema=z.object({
 version:z.literal('1.0.0'),rootRef:z.uuid(),parentModelId:z.string().min(1),specialistModelId:z.string().min(1),reviewerModelId:z.string().min(1),
 criteria:z.array(z.object({id:z.string().min(1).max(100),command:commandSchema}).strict()).min(1).max(8),
}).strict().refine(s=>new Set(s.criteria.map(c=>c.id)).size===s.criteria.length,'Criterion IDs must be unique');
