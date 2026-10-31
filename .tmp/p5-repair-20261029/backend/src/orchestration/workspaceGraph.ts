import crypto from 'node:crypto';
import { StateGraph, END, START, Annotation } from '@langchain/langgraph';
import {
  GraphState,
  GraphTransition,
  RunLimits,
  BoundedOutput,
  ParentDelegation,
  SpecialistProposal,
  SpecialistJoin,
  HumanApproval,
  Checkpoint,
  LangGraphState,
  AgentAssignment,
} from './graphContracts.js';

// LangGraph integration — defines the StateGraph structure
// and the transition logic for parent→specialist delegation, bounded parallelism,
// checkpoint persistence, and approval/review workflows.

// LangGraph Annotation for state definition
export const WorkspaceGraphAnnotation = Annotation.Root({
  runId: Annotation<string>,
  threadId: Annotation<string>,
  state: Annotation<GraphState>,
  currentTransition: Annotation<GraphTransition>,
  specialistIds: Annotation<string[]>({
    reducer: (curr, update) => update ?? curr ?? [],
    default: () => [],
  }),
  mergedOutput: Annotation<string>({
    reducer: (curr, update) => update ?? curr ?? '',
    default: () => '',
  }),
  counters: Annotation<{ critiqueRounds: number; repairRounds: number; delegatedTasks: number }>({
    reducer: (curr, update) => update ?? curr ?? { critiqueRounds: 0, repairRounds: 0, delegatedTasks: 0 },
    default: () => ({ critiqueRounds: 0, repairRounds: 0, delegatedTasks: 0 }),
  }),
  limits: Annotation<RunLimits>({
    reducer: (curr, update) => update ?? curr ?? {
      maxParallelSpecialists: 3,
      maxTotalDelegatedTasks: 12,
      maxCritiqueRounds: 2,
      maxRepairRounds: 2,
      runDeadlineSeconds: 1800,
      specialistInvocationDeadlineSeconds: 120,
    },
    default: () => ({
      maxParallelSpecialists: 3,
      maxTotalDelegatedTasks: 12,
      maxCritiqueRounds: 2,
      maxRepairRounds: 2,
      runDeadlineSeconds: 1800,
      specialistInvocationDeadlineSeconds: 120,
    }),
  }),
});

/**
 * Builds the compiled LangGraph StateGraph instance.
 */
export function buildWorkspaceGraph() {
  const workflow = new StateGraph(WorkspaceGraphAnnotation)
    .addNode('choose_specialists', async (state) => {
      return { currentTransition: GraphTransition.FANOUT };
    })
    .addNode('fanout', async (state) => {
      return { currentTransition: GraphTransition.VALIDATE };
    })
    .addNode('validate', async (state) => {
      return { currentTransition: GraphTransition.CRITIQUE };
    })
    .addNode('critique', async (state) => {
      const counters = {
        ...state.counters,
        critiqueRounds: (state.counters?.critiqueRounds || 0) + 1,
      };
      return { counters, currentTransition: GraphTransition.APPROVAL };
    })
    .addNode('approval', async (state) => {
      return { currentTransition: GraphTransition.EXECUTE };
    })
    .addNode('execute', async (state) => {
      return { currentTransition: GraphTransition.VERIFY };
    })
    .addNode('verify', async (state) => {
      return { state: GraphState.COMPLETED, currentTransition: GraphTransition.COMPLETED };
    })
    .addEdge(START, 'choose_specialists')
    .addEdge('choose_specialists', 'fanout')
    .addEdge('fanout', 'validate')
    .addEdge('validate', 'critique')
    .addEdge('critique', 'approval')
    .addEdge('approval', 'execute')
    .addEdge('execute', 'verify')
    .addEdge('verify', END);

  return workflow;
}

// Initialize a new opted-in graph run
export function initializeGraphRun(
  runId: string,
  threadId: string,
  initialLimits: RunLimits,
  parentId?: string
): LangGraphState {
  return {
    runId,
    threadId,
    state: GraphState.PENDING,
    currentTransition: GraphTransition.CHOOSE_SPECIALISTS,
    specialists: new Map(),
    parentDelegation: {
      type: 'delegate',
      taskDescription: 'Parent-initiated bounded task delegation',
      specialistRequirements: {
        maxConcurrent: initialLimits.maxParallelSpecialists,
        outputLimits: {
          maxTokens: 8192,
          maxDurationSeconds: initialLimits.specialistInvocationDeadlineSeconds,
          contextOutputCap: 4096,
        },
        justification: 'P5 parent delegation initialization',
      },
      nonce: crypto.randomUUID(),
      approved: false,
    },
    specialistProposals: new Map(),
    counters: {
      critiqueRounds: 0,
      repairRounds: 0,
      delegatedTasks: 0,
    },
    limits: initialLimits,
    createdAt: new Date(),
    lastUpdated: new Date(),
    checkpointId: undefined,
  };
}

// Transition: parent chooses which specialists to engage
export function transitionChooseSpecialists(
  state: LangGraphState,
  specialistIds: string[],
  parentId?: string
): { newState: LangGraphState; valid: boolean; error?: string } {
  if (specialistIds.length > state.limits.maxParallelSpecialists) {
    return {
      newState: state,
      valid: false,
      error: `Cannot exceed ${state.limits.maxParallelSpecialists} parallel specialists`,
    };
  }

  const updatedSpecialists = new Map(state.specialists);
  for (const sid of specialistIds) {
    if (updatedSpecialists.has(sid)) {
      return {
        newState: state,
        valid: false,
        error: `Specialist ${sid} already assigned to this run`,
      };
    }
    updatedSpecialists.set(sid, {
      specialistId: sid,
      role: 'primary',
      assignedAt: new Date(),
      taskScope: 'P5 bounded delegation',
    });
  }

  return {
    newState: {
      ...state,
      state: GraphState.ACTIVE,
      currentTransition: GraphTransition.FANOUT,
      specialists: updatedSpecialists,
    },
    valid: true,
  };
}

// Transition: fanout to specialists (parallel reasoning)
export function transitionFanout(
  state: LangGraphState,
  delegations: Map<string, ParentDelegation>
): { newState: LangGraphState; valid: boolean; error?: string } {
  const activeCount = state.specialists.size;
  const newCount = activeCount + delegations.size;
  if (newCount > state.limits.maxParallelSpecialists) {
    return {
      newState: state,
      valid: false,
      error: `Would exceed ${state.limits.maxParallelSpecialists} parallel specialists`,
    };
  }

  const specialists = new Map(state.specialists);
  const specialistProposals = new Map(state.specialistProposals);

  for (const [specialistId, delegation] of delegations) {
    if (specialists.has(specialistId)) {
      return {
        newState: state,
        valid: false,
        error: `Specialist ${specialistId} already assigned`,
      };
    }
    specialists.set(specialistId, {
      specialistId,
      role: 'primary',
      assignedAt: new Date(),
      taskScope: delegation.taskDescription,
    });
    specialistProposals.set(specialistId, {
      type: 'propose',
      specialistId,
      taskId: crypto.randomUUID(),
      output: '',
      usage: { tokens: 0, costMicroUsd: 0 },
      status: 'pending',
    });
  }

  return {
    newState: {
      ...state,
      state: GraphState.ACTIVE,
      currentTransition: GraphTransition.VALIDATE,
      specialists,
      specialistProposals,
    },
    valid: true,
  };
}

// Transition: validate proposals / detect conflicts
export function transitionValidate(
  state: LangGraphState
): { newState: LangGraphState; valid: boolean; error?: string } {
  for (const [sid, proposal] of state.specialistProposals) {
    if (proposal.status !== 'completed' && proposal.status !== 'failed') {
      return {
        newState: state,
        valid: false,
        error: `Specialist ${sid} proposal not yet finalized`,
      };
    }
  }

  if (state.counters.critiqueRounds >= state.limits.maxCritiqueRounds) {
    return {
      newState: state,
      valid: false,
      error: 'Critique round limit exceeded',
    };
  }

  return {
    newState: {
      ...state,
      state: GraphState.ACTIVE,
      currentTransition: GraphTransition.CRITIQUE,
    },
    valid: true,
  };
}

// Transition: independent critique (bounded)
export function transitionCritique(
  state: LangGraphState
): { newState: LangGraphState; valid: boolean; error?: string } {
  const newCounters = {
    ...state.counters,
    critiqueRounds: state.counters.critiqueRounds + 1,
  };

  if (newCounters.critiqueRounds >= state.limits.maxCritiqueRounds) {
    return {
      newState: {
        ...state,
        state: GraphState.ACTIVE,
        currentTransition: GraphTransition.APPROVAL,
        counters: newCounters,
      },
      valid: true,
    };
  }

  return {
    newState: {
      ...state,
      state: GraphState.ACTIVE,
      currentTransition: GraphTransition.CRITIQUE,
      counters: newCounters,
    },
    valid: true,
  };
}

// Transition: human approval where required
export function transitionApproval(
  state: LangGraphState,
  approval: { approvalId: string; approved: boolean; reason?: string; nonce: string }
): { newState: LangGraphState; valid: boolean; error?: string } {
  if (approval.approved) {
    return {
      newState: {
        ...state,
        state: GraphState.ACTIVE,
        currentTransition: GraphTransition.EXECUTE,
        humanApproval: {
          type: 'approve',
          approvalId: approval.approvalId,
          approved: true,
          reason: approval.reason,
          nonce: approval.nonce,
        },
      },
      valid: true,
    };
  } else {
    return {
      newState: {
        ...state,
        state: GraphState.BLOCKED,
        currentTransition: GraphTransition.COMPLETED,
      },
      valid: true,
    };
  }
}

// Transition: serial execution and output join
export function transitionExecute(
  state: LangGraphState,
  specialistResults: Map<string, SpecialistProposal>
): { newState: LangGraphState; valid: boolean; error?: string } {
  for (const [sid, proposal] of state.specialistProposals) {
    if (proposal.status !== 'completed') {
      return {
        newState: state,
        valid: false,
        error: `Specialist ${sid} result not completed`,
      };
    }
  }

  const mergedOutput = Array.from(specialistResults.values())
    .map(p => p.output)
    .join('\n---\n');

  return {
    newState: {
      ...state,
      state: GraphState.COMPLETED,
      currentTransition: GraphTransition.COMPLETED,
      specialistJoin: {
        type: 'join',
        taskIds: Array.from(state.specialistProposals.keys()),
        mergedOutput,
        consensus: true,
      },
    },
    valid: true,
  };
}

// Transition: repair (bounded rounds)
export function transitionRepair(
  state: LangGraphState,
  repairReason: string
): { newState: LangGraphState; valid: boolean; error?: string } {
  if (state.counters.repairRounds >= state.limits.maxRepairRounds) {
    return {
      newState: state,
      valid: false,
      error: 'Repair round limit exceeded',
    };
  }

  const newCounters = {
    ...state.counters,
    repairRounds: state.counters.repairRounds + 1,
  };

  return {
    newState: {
      ...state,
      state: GraphState.REPAIR,
      counters: newCounters,
    },
    valid: true,
  };
}

// Transition: completed / blocked / failed state finalization
export function transitionFinalize(
  state: LangGraphState,
  status: 'completed' | 'blocked' | 'failed'
): LangGraphState {
  return {
    ...state,
    state: status === 'completed' ? GraphState.COMPLETED : (status === 'blocked' ? GraphState.BLOCKED : GraphState.FAILED),
    currentTransition: GraphTransition.COMPLETED,
    lastUpdated: new Date(),
  };
}

export default {
  buildWorkspaceGraph,
  initializeGraphRun,
  transitionChooseSpecialists,
  transitionFanout,
  transitionValidate,
  transitionCritique,
  transitionApproval,
  transitionExecute,
  transitionRepair,
  transitionFinalize,
};
