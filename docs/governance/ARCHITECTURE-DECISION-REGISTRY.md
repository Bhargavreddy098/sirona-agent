# Sirona Architecture Decision Registry (ADR)

> **Authority Level:** CANONICAL GOVERNANCE REGISTRY  
> **Status:** ACTIVE & ENFORCED  
> **Last Synchronized:** 2026-11-03  
> **Compliance:** Mandatory for all AI agents, code generation tools, and human engineers.

---

## 1. Registry Purpose & Disambiguation Governance

This registry is the **single source of truth** for all architectural decisions across Sirona. It resolves historical naming collisions, documents exact approval provenance, and prevents AI coding agents from conflating distinct architectural questions or assuming unauthorized approvals.

### Disambiguation Invariant
Historical phase documents and earlier agent reports used overloaded identifiers (e.g. `DEC-02` was used both for *Live Model Paid Verification* and *LangGraph vs ReAct*; `DEC-03` was used both for *P6 Gate B Docker Image Build* and *DPAPI vs Headless CLI Credentials*). 

Under this registry:
1. Every distinct architectural decision is assigned an immutable canonical identifier (**`ADR-xxx`**).
2. Historical identifiers (**`DEC-xx`**, **`TECH-xx`**) are retained strictly as **read-only historical aliases** with documented provenance.
3. An approval granted for a historical alias applies **only** to the specific scope defined in its original approval record; it **never** transfers to an adjacent proposal or new phase.
4. No decision status may be transitioned to `APPROVED` or `VERIFIED` based on generated documentation, review passes, or synthetic test mocks.

---

## 2. Canonical Architecture Decision Matrix

| Canonical ID | Decision Title | Status | Historical Aliases | Provenance / Owner Gate | Blocker / Active STOP |
|---|---|---|---|---|---|
| **`ADR-001`** | **Database Engine Topology** (SQLite vs PostgreSQL) | `APPROVED & IMPLEMENTED (OPTION C)` | `DEC-01`, `R0-R12` | Owner Sign-Off 2026-11-03 (Option C SQLite-Only) | PostgreSQL removed from runtime |
| **`ADR-002`** | **Test Target Isolation & Schema Freeze** | `APPROVED & ENFORCED` | Legacy P1 Scope | Owner Approval 2026-10-28 | Enforced: `sirona` on 021 |
| **`ADR-003`** | **Model Gateway Multi-Vendor Routing & AI SDK** | `APPROVED & VERIFIED` | `TECH-02`, Legacy P4 | Owner Approval P4 (`SIRONA-WORKSPACE-P4-REPORT.md`) | Fully Verified |
| **`ADR-004`** | **Live Model Paid Inference Verification Gate** | `CONDITIONALLY APPROVED (PREP ONLY)` | `DEC-02` (Roadmap) | Owner Sign-Off 2026-11-03 (Option A conditional) | [`STOP-02`](ACTIVE-STOP-RULES.md#stop-02-p5-real-provider-acceptance-gate) (Live call blocked) |
| **`ADR-005`** | **Agent Execution Architecture** (ReAct vs LangGraph) | `APPROVED DESIGN (PARTIAL)` | `TECH-01`, Legacy P5 | P5 Approval 2026-10-30 (Free checks only) | Bounded by ADR-004 |
| **`ADR-006`** | **Windows Sandbox & Trusted-Local Docker Profile** | `APPROVED & VERIFIED` | `TECH-03`, Legacy P3 | Owner Approval P3 (Home Amendment 2026-10-29) | [`STOP-04`](ACTIVE-STOP-RULES.md#stop-04-unrestricted-host-command-execution) |
| **`ADR-007`** | **Containerized Tools Worker Qualification** (P6 Gate B) | `DEFERRED (OPTION B CONFIRMED)` | `DEC-03` (Roadmap) | Owner Sign-Off 2026-11-03 (Option B confirmed) | [`STOP-03`](ACTIVE-STOP-RULES.md#stop-03-p6-gate-b-docker-tools-image-qualification) (Preserve safeguards) |
| **`ADR-008`** | **Workspace Filesystem Containment & Traversal Denial** | `APPROVED & ENFORCED` | System Invariant 1 | Root `AGENTS.md`, P0 Architecture | Enforced: 403 on jailbreak |
| **`ADR-009`** | **Credential Storage & Windows DPAPI Keyring** | `APPROVED & VERIFIED` | Legacy P2 Scope | Owner Approval P2 (`credentialBroker.ts`) | [`STOP-06`](ACTIVE-STOP-RULES.md#stop-06-production-data--secret-protection) |
| **`ADR-010`** | **Frontend Stack Consolidation & UI Design Freeze** | `APPROVED & ENFORCED` | Owner Cleanup 2026-10-28 | Owner Instruction 2026-10-28 (`UI-FREEZE-CONTRACT.md`) | [`STOP-05`](ACTIVE-STOP-RULES.md#stop-05-user-interface-freeze) |
| **`ADR-011`** | **Terminal (xterm.js) & Code Diff (Monaco Editor)** | `APPROVED & VERIFIED` | `TECH-04`, `TECH-05` | Owner Wiring Approval 2026-10-30 | Scoped to approved views |
| **`ADR-012`** | **Frontend State Management & Graph Visualization** | `PROPOSED` | `TECH-06`, `TECH-07` | Roadmap Phase 7 (React Flow / Zustand) | Implementation Blocked |
| **`ADR-013`** | **MCP TypeScript SDK & AST Code Intelligence** | `APPROVED DESIGN (PARTIAL)` | `TECH-09`, `TECH-10` | Owner Approval Gate A 2026-10-30 | Guest tools require Gate B |
| **`ADR-014`** | **Risk-Tiered Governance & Approval Gates** | `APPROVED & ENFORCED` | System Invariant 4 | P1 Architecture (`governanceService.js`) | Enforced: Tier 3/4 gates |

---

## 3. Detailed Architecture Decision Records

### ADR-001: Database Engine Topology (SQLite vs PostgreSQL)
- **Status**: `APPROVED & IMPLEMENTED (OPTION C: SQLITE-ONLY ARCHITECTURE)`
- **Historical Aliases**: `DEC-01` in [`IMPLEMENTATION-ROADMAP.md`](../engineering/IMPLEMENTATION-ROADMAP.md) & [`ACTIVE-STOP-RULES.md`](ACTIVE-STOP-RULES.md); `R0-R12` ledger.
- **Owner Sign-Off History**:
  - *2026-11-03 (Initial)*: Proposed Option A (dual-driver).
  - *2026-11-03 (Final Direction & Approval)*: Owner approved **Option C (SQLite-Only Architecture)**. PostgreSQL is completely removed from runtime, startup, configuration, dependencies, and deployment.
- **Implemented Architecture**:
  - Single canonical database `sirona.db` with domain-organized tables (`ops_*`, `automation_*`, `control_*`, `system_*`, `knowledge_*`).
  - Native Node.js `node:sqlite` (`DatabaseSync`) with `PRAGMA journal_mode = WAL;`, `PRAGMA busy_timeout = 5000;`, and `BEGIN IMMEDIATE` write transaction serialization.
  - Fail-closed migration checksums via `schema_migrations`.
  - Atomic backups via native SQLite `VACUUM INTO`.
  - Zero PostgreSQL package dependencies (`pg` and `@types/pg` removed). Historical PostgreSQL database preserved untouched as read-only cold archive.

### ADR-002: Test Target Database Isolation & Schema Freeze
- **Status**: `APPROVED & ENFORCED`
- **Historical Aliases**: Legacy P1 Scope; Database Target Isolation Decision (2026-10-28).
- **Approved Policy**:
  - Working database `sirona` is strictly frozen at migration `021` with default-off writes.
  - Automated tests and new migrations (`022`, `023`, `024`) are permitted **only** against the isolated test database `sirona_workspace_p0_test_20261028`.
  - Tests must explicitly assert `current_database()` before execution. Destructive SQL (`DROP TABLE`, `TRUNCATE`) is forbidden.

### ADR-003: Model Gateway Multi-Vendor Routing & AI SDK Adapter
- **Status**: `APPROVED & VERIFIED IMPLEMENTATION`
- **Historical Aliases**: `TECH-02` (Vercel AI SDK), Legacy Phase 4.
- **Approved Architecture**:
  - [`apps/server/services/aiService.js`](file:///apps/server/services/aiService.js) and [`packages/ai/src/providers.ts`](file:///packages/ai/src/providers.ts) route inference across Anthropic, OpenAI, Google Gemini, and local OpenAI-compatible endpoints (Ollama, LM Studio).
  - Vercel AI SDK is integrated via `AiSdkAdapter` behind the existing provider port. Native adapters are retained by default with exact model IDs, token streaming, cancellation (`499`), and SSRF protection for local host IPs (`127.0.0.1`).

### ADR-004: Live Model Paid Inference Verification Gate
- **Status**: `CONDITIONALLY APPROVED (PREPARATION ONLY)`
- **Active Constraint**: [`STOP-02`](ACTIVE-STOP-RULES.md#stop-02-p5-real-provider-acceptance-gate) remains actively enforced. No live or billable call may execute.
- **Historical Aliases**: `DEC-02` in [`IMPLEMENTATION-ROADMAP.md`](../engineering/IMPLEMENTATION-ROADMAP.md) & [`ACTIVE-STOP-RULES.md`](ACTIVE-STOP-RULES.md); P5 Real-Provider Acceptance Gate.
- **Owner Sign-Off (2026-11-03)**: Owner confirmed **Option A (Conditional)**:
  - Authorized to **prepare** for one bounded live-provider acceptance test (fixture setup, assertion scaffolding, cost bounds calculation).
- **Mandatory Gate & Blocker**:
  - **No billable inference call is authorized until the owner separately approves the provider, model, and maximum cost.**
  - Live calls to Gemini 2.5 Flash, Claude, or OpenAI remain blocked. Controlled synthetic test mocks continue as the active verification baseline.

### ADR-005: Agent Execution Architecture (ReAct Loop vs LangGraph Specialists)
- **Status**: `APPROVED DESIGN (PARTIALLY IMPLEMENTED)`
- **Historical Aliases**: `TECH-01` (LangGraph.js); mistakenly labelled `DEC-02` in prior assistant report.
- **Approved Architecture**:
  - Primary autonomous execution runtime is the native iterative ReAct engine ([`apps/server/services/agentExecutionEngine.js`](file:///apps/server/services/agentExecutionEngine.js)) with serialized turn leases ([`turnLeaseService.js`](file:///apps/server/services/turnLeaseService.js)) and a 25-step execution limit.
  - LangGraph.js is implemented for bounded specialist workflows ([`workflowOrchestratorService.js`](file:///apps/server/services/workflowOrchestratorService.js)). Synthetic tests pass (22/22), but live multi-agent graph promotion is paused pending ADR-004.
  - Native ReAct loop remains the authoritative production execution engine.

### ADR-006: Windows Execution Sandbox and Trusted-Local Docker Profile
- **Status**: `APPROVED & VERIFIED IMPLEMENTATION`
- **Historical Aliases**: `TECH-03` (Windows isolation), Legacy Phase 3 Docker Plan.
- **Approved Threat Model**:
  - Owner approved the Windows Home Docker + WSL2 `trusted-local` profile ([`apps/cli/docker/tools-worker.Dockerfile`](file:///apps/cli/docker/tools-worker.Dockerfile)).
  - Host command fallback without containerization is prohibited ([`STOP-04`](ACTIVE-STOP-RULES.md#stop-04-unrestricted-host-command-execution)).
  - Hyper-V VM-level hostile-code isolation is explicitly **not** claimed. Protection protects against accidental script escapes and path corruption, not malicious hypervisor breakouts.

### ADR-007: Containerized Tools Worker Qualification (P6 Gate B)
- **Status**: `DEFERRED (OPTION B CONFIRMED)`
- **Active Constraint**: [`STOP-03`](ACTIVE-STOP-RULES.md#stop-03-p6-gate-b-docker-tools-image-qualification) preserved in deferred state.
- **Historical Aliases**: `DEC-03` in [`IMPLEMENTATION-ROADMAP.md`](../engineering/IMPLEMENTATION-ROADMAP.md) & [`ACTIVE-STOP-RULES.md`](ACTIVE-STOP-RULES.md); P6 Gate B Plan.
- **Owner Sign-Off (2026-11-03)**: Owner confirmed **Option B**:
  - Defer Docker Gate B qualification.
- **Enforcement & Preserved Safeguards**:
  - Preserve all existing sandbox safeguards: shell execution remains clamped inside Docker WSL2 (`trusted-local` profile) or clamped Node child processes with timeouts.
  - Mandatory human approval rules for tool execution remain active.
  - Gate B live container tool admission remains unstarted and deferred. Uncontained host fallback is strictly prohibited.

### ADR-008: Workspace Filesystem Containment & Traversal Denial
- **Status**: `APPROVED & ENFORCED`
- **Historical Aliases**: Architectural Invariant 1; P0 Containment.
- **Approved Security Rule**:
  - All agent file operations must be strictly contained within `workspaceRoot` using [`workspacePathResolver.js`](file:///apps/server/services/workspacePathResolver.js).
  - Relative parent navigation (`..`), absolute path injections outside root, and symlink escapes must be rejected with `403 PATH_OUTSIDE_WORKSPACE`.

### ADR-009: Credential Storage and Windows DPAPI Encryption
- **Status**: `APPROVED & VERIFIED IMPLEMENTATION`
- **Historical Aliases**: Legacy Phase 2 Credential Broker; mistakenly labelled `DEC-03` in prior assistant report.
- **Approved Security Rule**:
  - In Desktop mode, all API keys must be encrypted using Windows DPAPI via Electron's `safeStorage` in [`credentialBroker.ts`](file:///apps/desktop/src/security/credentialBroker.ts).
  - Plaintext credentials must never be written to disk, sent to renderer processes, or printed in logs ([`STOP-06`](ACTIVE-STOP-RULES.md#stop-06-production-data--secret-protection)).
  - Headless CLI mode falls back strictly to process environment variables (`process.env`).

### ADR-010: Frontend Stack Consolidation & UI Design Freeze
- **Status**: `APPROVED & ENFORCED`
- **Historical Aliases**: Owner Cleanup Decision (2026-10-28); [`UI-FREEZE-CONTRACT.md`](file:///sironadocs/frontend/UI-FREEZE-CONTRACT.md).
- **Approved Stack**:
  - Legacy scaffold `frontend/sirona` was permanently removed. `apps/web` (React 19 + Vite + TailwindCSS) is the sole active frontend.
  - Compact light/dark palette and layout hierarchy are frozen under [`STOP-05`](ACTIVE-STOP-RULES.md#stop-05-user-interface-freeze). No broad redesigns or token overhauls without approval.

### ADR-011: Terminal (xterm.js) & Code Diff (Monaco Editor) Integration
- **Status**: `APPROVED & VERIFIED IMPLEMENTATION`
- **Historical Aliases**: `TECH-04` (Monaco Editor), `TECH-05` (xterm.js), Wiring Report (2026-10-30).
- **Approved Components**:
  - `@monaco-editor/react` (4.7.0) is approved for read-only viewing and side-by-side patch diffing (`DiffEditor`).
  - `xterm.js` (6.0.0) + `fit` (0.11.0) is approved for interactive terminal sessions with server-owned leases and killed-backend recovery.

### ADR-012: Frontend State Management & Graph Visualization
- **Status**: `PROPOSED` (Roadmap Phase 7)
- **Historical Aliases**: `TECH-06` (React Flow), `TECH-07` (Zustand + TanStack Query).
- **Proposed Architecture**:
  - Use Zustand for client-side multi-tab and draft state.
  - Use TanStack Query for server cache reconciliation and polling fallback.
  - Use React Flow for agent task delegation DAG visualization.
- **Status**: Implementation blocked until Phase 7 authorization. Current UI safely uses standard React state and hooks ([`useSirona.ts`](file:///apps/web/src/api/useSirona.ts)).

### ADR-013: Model Context Protocol (MCP) & AST Semantic Analysis
- **Status**: `APPROVED DESIGN (PARTIALLY IMPLEMENTED - Gate A Verified)`
- **Historical Aliases**: `TECH-09` (MCP TypeScript SDK), `TECH-10` (Tree-sitter + ripgrep), P6 Gate A Approval.
- **Approved Scope**:
  - Official `@modelcontextprotocol/sdk` integrated over stdio/SSE transports with schema validation.
  - Tree-sitter WASM parsers for JS, TS, and TSX.
  - Live guest tool execution remains gated by ADR-007 (Gate B).

### ADR-014: Risk-Tiered Governance & Approval Gates
- **Status**: `APPROVED & ENFORCED`
- **Historical Aliases**: Architectural Invariant 4; Legacy P1 Governance.
- **Approved Tiers**:
  - **Tier 1 (Safe)**: Read-only operations (list files, read file, search symbols) are auto-approved.
  - **Tier 2 (Low Risk)**: Non-destructive localized file edits are logged and auto-approved in autonomous mode.
  - **Tier 3 (High Risk)**: Shell execution, file deletions, git commits, and credential operations require explicit human approval via [`governanceService.js`](file:///apps/server/services/governanceService.js).
  - **Tier 4 (Forbidden)**: Operations attempting workspace escape or credential extraction are blocked unconditionally.

---

## 4. Historical Alias Disambiguation Table

This table maps every legacy identifier directly to its canonical ADR to prevent confusion in agent workflows:

| Historical / Alias ID | Source Document | Legacy Topic | Canonical ADR | Resolution of Prior Conflict |
|---|---|---|---|---|
| `DEC-01` | `IMPLEMENTATION-ROADMAP.md` | Database Adapter Topology (SQLite vs Postgres) | **`ADR-001`** | Kept identical. Governed by STOP-01. |
| `DEC-02` (Roadmap) | `IMPLEMENTATION-ROADMAP.md` | P5 Live Paid Inference Call Authorization | **`ADR-004`** | Disambiguated from execution engine architecture. |
| `DEC-02` (Agent Report) | Prior Consolidation Output | LangGraph.js vs ReAct Execution Engine | **`ADR-005`** | Separated: ReAct vs LangGraph is ADR-005 (`TECH-01`). |
| `DEC-03` (Roadmap) | `IMPLEMENTATION-ROADMAP.md` | P6 Gate B Docker Tools Image Build | **`ADR-007`** | Disambiguated from credential storage. |
| `DEC-03` (Agent Report) | Prior Consolidation Output | DPAPI vs Headless CLI Credential Storage | **`ADR-009`** | Separated: DPAPI credentials is ADR-009 (Legacy P2). |
| `TECH-01` | `TECHNOLOGY-LEDGER.md` | LangGraph.js Orchestration | **`ADR-005`** | Mapped to ADR-005. |
| `TECH-02` | `TECHNOLOGY-LEDGER.md` | Vercel AI SDK Integration | **`ADR-003`** | Mapped to ADR-003. |
| `TECH-03` | `TECHNOLOGY-LEDGER.md` | Windows Home Docker Sandbox | **`ADR-006`** | Mapped to ADR-006. |
| `TECH-04` | `TECHNOLOGY-LEDGER.md` | Monaco Editor File Viewer | **`ADR-011`** | Mapped to ADR-011. |
| `TECH-05` | `TECHNOLOGY-LEDGER.md` | xterm.js PTY Terminal | **`ADR-011`** | Mapped to ADR-011. |
| `TECH-06` | `TECHNOLOGY-LEDGER.md` | React Flow Agent Delegation DAG | **`ADR-012`** | Mapped to ADR-012. |
| `TECH-07` | `TECHNOLOGY-LEDGER.md` | Zustand + TanStack Query | **`ADR-012`** | Mapped to ADR-012. |
| `TECH-08` | `TECHNOLOGY-LEDGER.md` | Drizzle ORM + Zod Validation | **`ADR-001`**, **`ADR-002`** | Mapped to DB ADRs. |
| `TECH-09` | `TECHNOLOGY-LEDGER.md` | MCP TypeScript SDK | **`ADR-013`** | Mapped to ADR-013. |
| `TECH-10` | `TECHNOLOGY-LEDGER.md` | Tree-sitter + ripgrep Context | **`ADR-013`** | Mapped to ADR-013. |

---

## 5. Owner Sign-Off Status & Active Enforcement Summary

The owner reviewed the Architecture Decision Registry on 2026-11-03 and established the following directions:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        RECORDED OWNER ARCHITECTURAL SIGN-OFF                           │
├─────────┬───────────────────────────────┬─────────────────────────┬────────────────────┤
│ ID      │ Recorded Decision             │ Status                  │ Remaining Blocker  │
├─────────┼───────────────────────────────┼─────────────────────────┼────────────────────┤
│ ADR-001 │ Option A: SQLite for local    │ Approved Direction      │ STOP-01 Active:    │
│         │ desktop, PostgreSQL for server│ (Pre-Impl Verification) │ Adapter/schema     │
│         │                               │                         │ audit required     │
├─────────┼───────────────────────────────┼─────────────────────────┼────────────────────┤
│ ADR-004 │ Option A (Conditional):       │ Conditionally Approved  │ STOP-02 Active:    │
│         │ Prepare for 1x bounded test   │ (Preparation Only)      │ Billable call      │
│         │                               │                         │ approval required  │
├─────────┼───────────────────────────────┼─────────────────────────┼────────────────────┤
│ ADR-007 │ Option B: Defer Gate B Docker │ Deferred                │ STOP-03 Active:    │
│         │ qualification                 │ (Safeguards Preserved)  │ Gate B deferred;   │
│         │                               │                         │ sandboxing enforced│
└─────────┴───────────────────────────────┴─────────────────────────┴────────────────────┘
```

### Remaining Blocked Prerequisites
1. **ADR-001 Implementation Prerequisite**: Before modifying `config/db.js` or executing dual-engine migrations, a read-only audit of existing adapters, migrations `001–024`, schema compatibility, and data ownership must be documented and reviewed.
2. **ADR-004 Live Inference Gate**: No network request to upstream paid inference APIs may be executed during test preparation. Provider, model ID, and maximum cost ceiling must be explicitly approved in a separate owner instruction.
3. **ADR-007 Tool Containment Invariant**: Deferral of Gate B does **not** allow host fallback. Shell operations remain clamped to Docker WSL2 (`trusted-local` profile) and timeout-clamped child processes with human approval gates.
