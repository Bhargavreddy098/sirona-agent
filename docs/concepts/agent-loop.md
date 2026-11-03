---
title: "Agent Loop & ReAct Orchestration"
summary: "Conceptual architecture of Sirona's model-driven ReAct loop, tool-call handling, and evidence-backed verification."
read_when:
  - "When designing or debugging the multi-turn agent execution cycle"
  - "When modifying tool calling, text streaming, or termination criteria"
owning_subsystem: "Agent Runtime"
primary_source_files:
  - "apps/server/services/agentExecutionEngine.js"
  - "apps/server/services/toolRuntimeService.js"
---

# Agent Loop & ReAct Orchestration

Sirona's autonomous coding capability is governed by a **Reasoning + Acting (ReAct)** execution loop. Rather than generating code blindly in a single prompt, the agent iterates through cycles of inspection, modification, and test verification until the task is proven complete.

```
       ┌────────────────────────────────────────────────────────┐
       │                   1. User Objective                     │
       └───────────────────────────┬────────────────────────────┘
                                   │
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │                  2. Context Packing                     │
       │  (apps/server/services/projectScannerService.js)       │
       │  - Project tree digest, key files, and summary          │
       └───────────────────────────┬────────────────────────────┘
                                   │
                                   ▼
                     ┌───────────────────────────┐
                     │ 3. Agent Execution Engine │ ◄────────────────┐
                     │ (agentExecutionEngine.js) │                  │
                     └─────────────┬─────────────┘                  │
                                   │                                │
                             Stream Turn                            │
                                   │                                │
                                   ▼                                │
                     ┌───────────────────────────┐                  │
                     │    Model Gateway (LLM)    │                  │
                     └─────────────┬─────────────┘                  │
                                   │                                │
                     Emits text or tool_calls                       │
                                   │                                │
                  ┌────────────────┴────────────────┐               │
                  │                                 │               │
            [tool_calls]                         [text]             │
                  │                                 │               │
                  ▼                                 ▼               │
      ┌───────────────────────┐         ┌───────────────────────┐   │
      │   ToolRuntimeService  │         │ Nudge to formalize    │   │
      │  - read_file          │         │ completion or continue│───┤
      │  - write_file         │         └───────────────────────┘   │
      │  - execute_command    │                                     │
      └───────────┬───────────┘                                     │
                  │                                                 │
                  ▼                                                 │
      ┌───────────────────────┐                                     │
      │  Local Filesystem /   │                                     │
      │  Container Shell      │                                     │
      └───────────┬───────────┘                                     │
                  │                                                 │
                  └──────── Return tool output ─────────────────────┘
```

---

## 1. Loop Invariants

1. **Test Verification Required**: The agent prompt explicitly instructs Sirona to run project tests via `execute_command` before declaring success. No task is marked complete without test evidence.
2. **Explicit Completion Signal**: An agent cannot finish merely by stating "I am done" in prose. Completion requires an explicit invocation of the `propose_task_completion` tool with a summary and list of modified files.
3. **Turn Bounding**: The loop is hard-bounded by `maxTurns` (default 12) to prevent runaway costs or infinite cycles. If `maxTurns` is reached without completion, the engine exits with status `Max turns reached without explicit completion`.
4. **Clean Diff Preservation**: Upon loop exit, `AgentExecutionEngine` runs `git diff` against `workspaceRoot` to capture the final changeset as structured evidence.
