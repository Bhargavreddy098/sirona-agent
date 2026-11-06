# Feature Specification: Agent Runtime & ReAct Loop

> [!TIP]
> **Agent Context Guidance**: Load only this feature directory (`docs/features/agent-runtime-and-loop/`), [`docs/governance/ACTIVE-STOP-RULES.md`](../../governance/ACTIVE-STOP-RULES.md), and direct cross-feature dependencies explicitly cited below. Do not load unreferenced feature specifications or legacy archives into working context.

## 1. Context & Problem Statement
Sirona's autonomous coding assistant operates via an iterative ReAct (Reasoning + Acting) loop. The agent accepts multi-turn instructions, inspects files, edits source, executes shell commands in a sandbox, evaluates output, and iterates until the objective is accomplished or human intervention is required.

### Key Objectives
- Orchestrate autonomous multi-turn agent turns safely.
- Prevent turn race conditions via serialized leases.
- Build prompts dynamically with project AST context, relevant documentation, and message history.
- Enforce strict termination conditions (max iterations, budget limits, manual abort).

---

## 2. Architecture & Flow

```mermaid
graph TD
    Prompt["User Prompt (SSE / Execution API)"] --> LeaseCheck["Acquire Turn Lease (turnLeaseService)"]
    LeaseCheck --> ContextAssembler["Context & History Assembler"]
    ContextAssembler --> ModelCall["Model Inference Stream (packages/ai)"]
    
    ModelCall --> Decision{"Token Stream or Tool Call?"}
    Decision -->|Token Delta| StreamClient["Stream Token to UI (turn.token)"]
    Decision -->|Tool Call| RiskCheck{"Evaluate Risk (governanceService)"}
    
    RiskCheck -->|High Risk| Approval["Hold Turn for Approval (approval.requested)"]
    Approval -->|User Approves| Exec["Execute Tool (toolRuntimeService)"]
    RiskCheck -->|Low Risk (Auto)| Exec
    
    Exec --> Result["Record Tool Result & Append to Context"]
    Result --> DoneCheck{"Objective Complete or Limit Reached?"}
    DoneCheck -->|No| ModelCall
    DoneCheck -->|Yes| Finish["Release Lease & Emit turn.finish"]
```

---

## 3. Invariants & Guardrails
1. **Single-Turn Serialized Concurrency**: Multiple clients or tabs attempting to run concurrent turns on the same conversation receive `409 TURN_LEASE_CONFLICT`.
2. **Deterministic Context Truncation**: Message history exceeding context limits is compacted via summarization while preserving the root system prompt, active files list, and pending approval state.
3. **Execution Safety Circuit Breakers**:
   - `maxStepsPerTurn`: Clamped to 25 steps to prevent runaway loops.
   - `turnTimeoutMs`: Default 300,000ms (5 minutes). If exceeded, the turn is forcibly cancelled and marked `TIMED_OUT`.
