# Sirona Unified Backend Architecture Report

**Platform:** Sirona Unified AI Development Platform  
**Architecture Date:** 2026-10-31  
**Status:** Scoped Production-Oriented Implementation & Modular Specification  
**Authority:** Root `AGENTS.md`, Dual SQLite/PostgreSQL Engine, Stage 01–15 Contracts  

---

## 1. Executive Summary & Vision

Sirona unifies three distinct modern AI development paradigms into a single, cohesive, governed platform:

1. **Cursor-Style AI IDE:** Fast, interactive conversational coding assistance with automatic context assembly (active file, open tabs, code selection, AST symbols), real-time streaming, and read-only diagnostic tools.
2. **Codex-Style Autonomous Coding Agent:** Multi-file autonomous software engineering with structured task execution, file patching with SHA-256 integrity, containerized guest isolation (Docker/WSL2 Home Profile), independent verification against real project test runners, and bounded self-repair.
3. **Hermes-Style Autonomous Agent:** Durable long-term memory (episodic, semantic, architectural decisions), official Model Context Protocol (MCP) tool integration, bounded specialist subagents with strict concurrency limits, and scheduled/event-driven background automation.

Crucially, **this is ONE platform**, not three separate runtimes. The same security boundaries, governance policies, tenant isolation, lease registries, and effect journals govern all three modes.

---

## 2. Unified Architecture & Component Interaction

```mermaid
flowchart TD
    subgraph UI ["User / Presentation Layer (Sirona-Next / Electron)"]
        UI_Chat["Unified Chat Canvas"]
        UI_Context["Collapsible Companion (Diffs, Tree, Terminal)"]
        UI_Modes["Mode Selector (Ask | Agent | Plan)"]
    end

    subgraph Gateway ["Gateway & Transport Layer"]
        HTTP["Express HTTP Boundary (Loopback 127.0.0.1)"]
        SSE["SSE Event Stream (/runs/:id/events, /turns)"]
        Auth["Session Auth & CSRF Protection (Single-Use Nonce)"]
        TenantGuard["Tenant Ownership Guard (Workspace Isolation)"]
    end

    subgraph Coordination ["Agent & Conversation Coordination"]
        Coord["Conversation Turn Coordinator"]
        TurnLease["Session Turn Lease Registry (Atomic Row Locks)"]
        Router["Model Router & Provider Port Layer"]
    end

    subgraph Modes ["Interaction Execution Modes"]
        AskMode["ASK MODE (Interactive Chat & Fast Streaming)"]
        PlanMode["PLAN MODE (Architect & Contract Decomposition)"]
        AgentMode["AGENT MODE (Autonomous ReAct & Execution Engine)"]
    end

    subgraph CoreEngine ["Autonomous Execution & Intelligence Engine"]
        ContextEng["Context Assembler (AST, Symbols, Lexical/Vector)"]
        GraphRuntime["Workspace Graph Runtime (LangGraph Engine)"]
        WorkerService["Agent Worker & DAG Execution Engine"]
        ToolRuntime["Tool Runtime & Security Broker (fs, shell, git, lsp)"]
        McpService["MCP Client Adapter (Stdio / SSE Transports)"]
    end

    subgraph Isolation ["Execution Isolation & Containment Boundary"]
        PathResolver["Workspace Path Resolver (Reparse Point & Jail Validation)"]
        DockerGuest["Docker / WSL2 Trusted-Local Guest Worker"]
        PatchService["Multi-File Patch Service (Preimages, Journal, Native Broker)"]
    end

    subgraph Verification ["Independent Verification & Audit"]
        Verifier["Independent Verification Engine (Producer != Verifier)"]
        TestRunner["Detected Real Test Runner (node --test, pytest, cargo)"]
        AuditJournal["Effect Journal & Immutable Audit Logs"]
    end

    subgraph Persistence ["Dual Persistence Layer"]
        DB["PostgreSQL 17 / Embedded SQLite (node:sqlite)"]
        SecStore["Desktop Credential Broker (DPAPI / safeStorage)"]
    end

    UI --> HTTP
    HTTP --> Auth --> TenantGuard
    TenantGuard --> Coord
    Coord --> TurnLease
    Coord --> Modes

    Modes --> AskMode
    Modes --> PlanMode
    Modes --> AgentMode

    AskMode --> Router --> Persistence
    PlanMode --> ContextEng --> Router
    AgentMode --> GraphRuntime & WorkerService

    WorkerService --> ContextEng
    WorkerService --> ToolRuntime
    ToolRuntime --> PathResolver
    ToolRuntime --> DockerGuest
    ToolRuntime --> McpService

    WorkerService --> PatchService
    PatchService --> DockerGuest
    WorkerService --> Verifier --> TestRunner

    WorkerService --> AuditJournal --> Persistence
    Coord --> SSE --> UI_Chat
```

---

## 3. The Unified Data & Execution Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as User / Developer
    participant UI as Sirona UI / Companion
    participant Gate as Gateway / Tenant Guard
    participant Coord as Turn Coordinator
    participant Engine as Execution Engine
    participant Isolation as Docker Isolation Guest
    participant Verifier as Independent Verifier
    participant Journal as Effect Journal / DB

    User->>UI: Submits Prompt (Mode: Agent / Plan / Ask)
    UI->>Gate: POST /api/v1/conversations/:id/turns (with session & CSRF)
    Gate->>Gate: Verify Session & Project Workspace Ownership
    Gate->>Coord: coordinateTurn(prompt, mode, context)
    Coord->>Journal: Acquire atomic turn lease (Single-Writer Lock)

    alt Ask Mode
        Coord->>Engine: Fast Context Assembly (Active file + symbols)
        Coord->>UI: Stream response tokens via SSE
    else Plan Mode
        Coord->>Engine: Decompose requirements into DAG steps
        Engine->>Journal: Persist Plan Revision & Build Contract
        Coord->>UI: Stream structured plan review & approval cards
    else Agent Mode
        Coord->>Engine: Initiate Autonomous Execution DAG
        loop Each Step in Plan DAG
            Engine->>Engine: Assemble Context Pack & Select Model
            Engine->>Engine: Model ReAct Loop (Reasoning -> Tool Proposal)
            Engine->>Gate: Evaluate Governance Policy & User Approval
            Gate-->>Engine: Approval Confirmed
            Engine->>Isolation: Execute Tool / Command inside Isolated Guest
            Isolation-->>Engine: Tool Receipt & Preimage Diff
            Engine->>UI: Stream SSE (tool:call, tool:result, file:patch)
        end
        Engine->>Isolation: Generate Multi-File Patch Preview
        Isolation->>Journal: Persist Patch Preview & Host Journal
        User->>UI: Approve Host Patch Apply
        UI->>Isolation: Apply Host Patch via Native Broker
        Engine->>Verifier: Trigger Independent Verification Job
        Verifier->>Isolation: Run Project Real Test Suite
        Isolation-->>Verifier: Exit code, stdout, assertion counts
        alt Tests Fail
            Verifier->>Engine: Feed failure diagnostics (Self-Repair Loop)
            Engine->>Engine: Repair defect (up to max 3 attempts)
        else Tests Pass
            Verifier->>Journal: Persist Verification Report (Outcome: Pass)
            Engine->>UI: Stream run:completed with evidence report
        end
    end
    Coord->>Journal: Release turn lease
```

---

## 4. Architectural Boundaries and Responsibility Separation

| Subsystem | Authority | Constraints |
|---|---|---|
| **API Gateway** | Loopback binding (127.0.0.1), session token authentication, CSRF tokens, strict workspace/tenant authorization. | No unauthenticated routes except initial desktop launcher challenge bootstrap. Drives/roots (`C:\`, `/`) forbidden. |
| **Turn Coordinator** | Atomically serializes conversation turns using transactional leases in SQLite/PostgreSQL. | Prevents concurrent competing writers; cancels and reconciles interrupted turns. |
| **Model Router** | Selects optimal provider/model based on task complexity, context window, and cost budgets. | Never exposes plaintext credentials in prompts, logs, or responses. Resolves keys via OS DPAPI/safeStorage. |
| **Context Assembler** | Combines AST symbols, repository index, open tabs, active selection, and semantic memory. | Enforces token and byte limits; redacts credential patterns (`secretLike`); includes SHA-256 preimages. |
| **Tool Runtime** | Executes validated tools (read, write, search, patch, execute) under strict policy rules. | Enforces absolute filesystem containment via `WorkspacePathResolver`. Rejects directory junctions and escapes. |
| **Docker Worker** | Executes shell commands and test runners in disposable Docker/WSL2 container instances. | Never mounts host roots or credentials. Copies workspace snapshots; imports candidate diffs as patches. |
| **Patch Service** | Applies multi-file diffs atomically with preimages and reversible journals. | Rejects patching protected files (`.env`, `.git`, `.ssh`, `.aws`, Sirona system files). |
| **Independent Verifier** | Verifies artifact delivery against real test runner outputs. | Producer cannot act as verifier. If tests did not run, outcome remains honestly `unknown` (never false pass). |
| **Memory & MCP** | Long-term episodic/semantic storage, AST knowledge graph, and official MCP client transports. | MCP tools execute through the same security broker; memory queries strictly scoped by workspace. |

---

## 5. Summary of Unification

The Sirona backend architecture now operates as an integrated, secure, production-grade engine capable of fulfilling:
- The sub-second responsiveness of Cursor for interactive code queries,
- The rigorous autonomy, verification, and isolation of Codex for hands-off engineering tasks, and
- The persistent memory, extensible MCP tooling, and durable scheduling of Hermes.
