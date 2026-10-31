import { z } from 'zod';

// Graph identity and state
export const graphIdentitySchema = z.object({
  runId: z.string().uuid(),
  graphClass: z.enum(['langgraph', 'legacy']),
  schemaVersion: z.string(),
  createdAt: z.date(),
});

// Agent/specialist assignment
export const agentAssignmentSchema = z.object({
  specialistId: z.string(),
  role: z.enum(['primary', 'secondary', 'reviewer']),
  assignedAt: z.date(),
  taskScope: z.string(),
});

// Bounded output limits
export const boundedOutputSchema = z.object({
  maxTokens: z.number().int().positive(),
  maxDurationSeconds: z.number().int().positive(),
  contextOutputCap: z.number().int().positive(),
});

// Run limits and counters
export const runLimitsSchema = z.object({
  maxParallelSpecialists: z.number().int().positive().default(3),
  maxTotalDelegatedTasks: z.number().int().positive().default(12),
  maxCritiqueRounds: z.number().int().default(2),
  maxRepairRounds: z.number().int().default(2),
  runDeadlineSeconds: z.number().int().positive().default(1800), // 30 minutes
  specialistInvocationDeadlineSeconds: z.number().int().positive().default(120),
});

// State machine states
export const graphStateSchema = z.enum([
  'pending',
  'active',
  'completed',
  'failed',
  'aborted',
  'blocked',
  'repair',
]);

export const GraphState = {
  PENDING: 'pending',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  FAILED: 'failed',
  ABORTED: 'aborted',
  BLOCKED: 'blocked',
  REPAIR: 'repair',
} as const;

export type GraphState = typeof GraphState[keyof typeof GraphState];

// Graph transition states
export enum GraphTransition {
  CHOOSE_SPECIALISTS = 'choose_specialists',
  FANOUT = 'fanout',
  VALIDATE = 'validate',
  CRITIQUE = 'critique',
  APPROVAL = 'approval',
  EXECUTE = 'execute',
  PATCH = 'patch',
  VERIFY = 'verify',
  COMPLETED = 'completed',
  BLOCKED = 'blocked',
  REPAIR = 'repair',
}

// Bounded output limits type
export type BoundedOutput = z.infer<typeof boundedOutputSchema>;

// Parent-initiated task delegation
export type ParentDelegation = {
  type: 'delegate';
  taskDescription: string;
  specialistRequirements: {
    maxConcurrent: number;
    outputLimits: BoundedOutput;
    justification: string;
  };
  nonce: string;
  approved: boolean;
};

// Specialist response (validated proposal)
export type SpecialistProposal = {
  type: 'propose';
  specialistId: string;
  taskId: string;
  output: string;
  usage: {
    tokens: number;
    costMicroUsd: number;
  };
  status: 'pending' | 'completed' | 'failed' | 'blocked';
  approvalDigest?: string | null;
  nonce?: string | null;
  justification?: string | null;
};

// Join/merge of specialist outputs
export type SpecialistJoin = {
  type: 'join';
  taskIds: string[];
  mergedOutput: string;
  consensus: boolean;
  dissentReasons?: string[];
};

// Human approval interrupt
export type HumanApproval = {
  type: 'approve';
  approvalId: string;
  approved: boolean;
  reason?: string;
  nonce: string;
};

// Run configuration (immutable after opt-in)
export const runConfigSchema = runLimitsSchema.extend({
  runId: z.string().uuid(),
  engine: z.enum(['langgraph', 'legacy']),
  threadId: z.string(),
  pinnedContract: z.string(),
  initialLimits: runLimitsSchema,
  initialCounters: z.object({
    delegatedTasks: z.number().int().default(0),
    critiqueRounds: z.number().int().default(0),
    repairRounds: z.number().int().default(0),
  }),
});

export type RunConfig = z.infer<typeof runConfigSchema>;

// Specialist proposal schema (incoming from model/agent)
export const specialistProposalSchema = z.object({
  type: z.literal('propose').default('propose'),
  specialistId: z.string(),
  taskId: z.string().uuid(),
  output: z.string(),
  usage: z.object({
    tokens: z.number().default(0),
    costMicroUsd: z.number().default(0),
  }).default({ tokens: 0, costMicroUsd: 0 }),
  status: z.enum(['pending', 'completed', 'failed', 'blocked']),
  approvalDigest: z.string().nullish(),
  nonce: z.string().nullish(),
  justification: z.string().nullish(),
});

// Graph checkpoint (persisted in run_checkpoints)
export const checkpointSchema = z.object({
  id: z.string().uuid(),
  runId: z.string().uuid(),
  sequence: z.number().int().positive(),
  epoch: z.number().int().positive(),
  stateDigest: z.string().length(64),
  stateData: z.union([z.string(), z.record(z.any())]),
  pendingWrites: z.array(z.string()).optional(),
  createdAt: z.date(),
  status: z.enum(['full', 'pending', 'aborted', 'failed']).optional(),
  specialistId: z.string().optional().nullable(),
  delegationNonce: z.string().optional().nullable(),
  delegatedAt: z.date().optional().nullable(),
});

// Type exports
export type GraphIdentity = z.infer<typeof graphIdentitySchema>;
export type AgentAssignment = z.infer<typeof agentAssignmentSchema>;
export type RunLimits = z.infer<typeof runLimitsSchema>;
export type Checkpoint = z.infer<typeof checkpointSchema>;

// LangGraph state interface
export interface LangGraphState {
  runId: string;
  threadId: string;
  state: GraphState;
  currentTransition: GraphTransition;
  specialists: Map<string, AgentAssignment>;
  parentDelegation?: ParentDelegation;
  specialistProposals: Map<string, SpecialistProposal>;
  specialistJoin?: SpecialistJoin;
  humanApproval?: HumanApproval;
  counters: {
    critiqueRounds: number;
    repairRounds: number;
    delegatedTasks: number;
  };
  limits: RunLimits;
  createdAt: Date;
  lastUpdated: Date;
  checkpointId?: string;
}

// Validate a run config at construction time
export function validateRunConfig(cfg: unknown): cfg is RunConfig {
  return runConfigSchema.safeParse(cfg).success;
}

export default {
  graphIdentitySchema,
  agentAssignmentSchema,
  boundedOutputSchema,
  runLimitsSchema,
  graphStateSchema,
  GraphState,
  GraphTransition,
  checkpointSchema,
  validateRunConfig,
};
