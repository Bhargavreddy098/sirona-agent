# Agent Runtime & Execution Engine

**Subsystem:** Agent Runtime & Autonomous Execution  
**Owning Package:** `apps/server` (with planning contracts in `packages/contracts`)  
**Status:** Implemented & Verified in Free Tests; LangGraph.js Dynamic Delegation Planned (Phase P5)  
**Read When:** Working on the autonomous ReAct coding loop, multi-turn tool calling, prompt engineering, task decomposition, or test-driven task completion.

---

## 1. Overview & Architectural Role

The **Agent Runtime** is the core orchestration loop that turns a user objective into code changes. It connects LLM reasoning with tool execution, maintaining conversation state and validating outcomes against tests.

```
                      ┌────────────────────────────┐
                      │    Goal / User Request     │
                      └─────────────┬──────────────┘
                                    │
                                    ▼
                      ┌────────────────────────────┐
                      │   AgentExecutionEngine     │
                      │  (services/                │
                      │   agentExecutionEngine.js) │
                      └───────┬───────────▲────────┘
                              │           │
                     1. Stream Turn       4. Tool Result
                              │           │
                              ▼           │
                      ┌────────────────────────────┐
                      │         AIService          │
                      │  (services/aiService.js)   │
                      └───────┬────────────────────┘
                              │
                     2. tool_calls: [name, args]
                              │
                              ▼
                      ┌────────────────────────────┐
                      │    ToolRuntimeService      │
                      │  (services/                │
                      │   toolRuntimeService.js)   │
                      └───────┬────────────────────┘
                              │
                     3. Execute (read/write/cmd)
                              │
                              ▼
                      ┌────────────────────────────┐
                      │      Local Workspace       │
                      │   (Filesystem / Shell)     │
                      └────────────────────────────┘
```

---

## 2. Implementation Ownership & File Map

| Responsibility | Owning File | Interfaces & Primary Exports |
|---|---|---|
| **Autonomous ReAct Loop** | `apps/server/services/agentExecutionEngine.js` | `AgentExecutionEngine.executeAgentTask()` |
| **Worker Dispatch & Queue** | `apps/server/services/agentWorkerService.js` | `AgentWorkerService.dispatchTask()`, `processPendingTasks()` |
| **Workflow Orchestration** | `apps/server/services/workflowOrchestratorService.js` | `WorkflowOrchestratorService.executeWorkflow()` |
| **Durable Execution & Events** | `apps/server/services/executionService.js` | `ExecutionService.createRun()`, `_recordEvent()` |
| **Execution Policy & Fencing** | `apps/server/dist-workspace/src/security/executionPolicy.js` | `requireFence()`, `requireRunApproval()`, `requireProjectIdentity()` |
| **Planning Contracts** | `apps/server/services/planningContractService.js` | `PlanningContractService.createPlan()` |

---

## 3. Autonomous Execution Loop Lifecycle

`AgentExecutionEngine.executeAgentTask` executes the iterative loop:

1. **Prompt Initialization**:
   - Injects the system prompt instructing Sirona to examine files, modify code, and verify using tests.
   - Combines user objective with `contextPack` (file digests and summaries from `projectScannerService.js`).
2. **Turn Iteration (Bounded by `maxTurns`, default 12)**:
   - Invokes `AIService.streamTurn` with conversation history and available tool schemas.
   - **Case A: Model emits `tool_calls`**:
     - If `toolName === "propose_task_completion"`, sets `isComplete = true`, captures summary, and breaks loop.
     - Otherwise, invokes `invoke(toolName, toolArgs)` via `ToolRuntimeService`.
     - Appends tool output to history with role `tool` and `tool_call_id`.
   - **Case B: Model emits text only**:
     - Appends text response to history with role `assistant`.
     - If text claims completion without calling `propose_task_completion`, nudges model to formally invoke completion.
3. **Diff & Verification**:
   - Collects all modified file paths in `filesModifiedSet`.
   - Executes `git diff` via `SandboxManager.execute` to capture the complete patch.
   - Returns `{ completed, summary, filesModified, executionLogs, turns, diff }`.

---

## 4. How to Extend the Agent Loop

To add a new capability to the agent runtime (e.g., automated test retry or code analysis):
1. **Tool Definition**: Ensure the tool is exposed in `ToolRuntimeService.getStandardToolSchemas()` (`apps/server/services/toolRuntimeService.js`).
2. **System Prompt & Rules**: Update `systemPrompt` in `AgentExecutionEngine.executeAgentTask()` to instruct the agent on when to use the capability.
3. **Progress Tracking**: Hook into `onProgress({ turn, action, summary })` for UI feedback.
4. **Testing**: Run `node scripts/run-test.js --pkg server --filter agentExecution` to verify.

---

## 5. Current Gaps & Unverified Items
- **LangGraph Checkpointing (Phase P5)**: Graph checkpointing is designed in `docs/SIRONA-WORKSPACE-PLAN.md` (`TECH-01`), but standard runs currently execute through the linear loop in `AgentExecutionEngine.js`.
- **Worker Concurrency**: Multi-agent task fanning requires PostgreSQL row locking on `runs.event_sequence`.
