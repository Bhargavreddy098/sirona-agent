# Sirona Documentation Index & Knowledge Base

Welcome to the canonical engineering documentation for Sirona. This index maps all authoritative architecture guides, engineering procedures, subsystem technical specifications, and reference manuals to their exact source implementations.

---

## 1. Documentation Operations

- [`docs/AGENTS.md`](AGENTS.md): Documentation ownership, frontmatter standards, linking rules, and verification conventions.

---

## 2. Core Subsystems (Technical Guides)

| Subsystem | Document Path | Summary | Read When |
|---|---|---|---|
| **Model Gateway & Providers** | [`docs/subsystems/model-gateway.md`](subsystems/model-gateway.md) | Multi-provider AI inference, credential resolution, model catalog, and streaming turns. | Modifying LLM providers, API keys, streaming responses, or adding new models. |
| **Agent Runtime & Execution** | [`docs/subsystems/agent-runtime.md`](subsystems/agent-runtime.md) | Autonomous ReAct coding loop, multi-turn tool calling, prompt building, and diff verification. | Working on the agent loop, task decomposition, prompt engineering, or test verification. |
| **Tool Execution & Sandbox** | [`docs/subsystems/tool-execution.md`](subsystems/tool-execution.md) | Filesystem tools, shell commands, process spawning, Docker WSL2 containment, and safety boundaries. | Adding or editing agent tools, executing shell commands, or inspecting isolation. |
| **Workspace Filesystem & Desktop** | [`docs/subsystems/workspace-filesystem.md`](subsystems/workspace-filesystem.md) | Local folder selection, Electron IPC bridges, canonical path traversal checks, and project scanning. | Working on folder chooser, Electron window/IPC, path security, or AST scanning. |
| **Approvals & Governance** | [`docs/subsystems/approvals-and-governance.md`](subsystems/approvals-and-governance.md) | Least-privilege execution, autonomy modes (supervised vs autonomous), and pending approval queues. | Implementing human-in-the-loop approvals, risk classification, or autonomy modes. |
| **Sessions & Persistence** | [`docs/subsystems/sessions-and-persistence.md`](subsystems/sessions-and-persistence.md) | Conversation sessions, turn lease registry, message storage, and PostgreSQL/SQLite adapters. | Modifying database queries, turn concurrency, message persistence, or migrations. |

---

## 3. Concepts & Lifecycles

| Concept | Document Path | Summary | Read When |
|---|---|---|---|
| **Agent Loop & ReAct** | [`docs/concepts/agent-loop.md`](concepts/agent-loop.md) | Iterative ReAct cycle, tool calling mechanics, termination criteria, and verification. | Designing agent turns, test-driven validation, or completion handling. |

---

## 4. Model Providers (Vendor Integrations)

| Provider | Document Path | Summary | Read When |
|---|---|---|---|
| **Google Gemini** | [`docs/providers/gemini.md`](providers/gemini.md) | Google GenAI ADK integration, Gemini 2.5/3.5 models, uppercase schema conversion. | Adding or troubleshooting Google Gemini inference. |
| **OpenAI** | [`docs/providers/openai.md`](providers/openai.md) | Official OpenAI SDK, GPT-4o, o1, o3-mini models, and function calling format. | Adding or troubleshooting OpenAI models. |
| **OpenAI-Compatible / Local** | [`docs/providers/openai-compatible.md`](providers/openai-compatible.md) | Ollama, vLLM, LM Studio, OpenRouter, dynamic model discovery, and SSRF guard. | Connecting local offline models or custom proxy endpoints. |

---

## 5. Model Gateway In-Depth

| Topic | Document Path | Summary | Read When |
|---|---|---|---|
| **End-to-End Routing** | [`docs/model-gateway/routing.md`](model-gateway/routing.md) | Full sequence diagram from React UI through Express to vendor streaming and abort propagation. | Debugging token streams, turn leases, or client disconnects. |

---

## 6. Architecture & Master Plans

| Document | Path | Summary | Read When |
|---|---|---|---|
| **Workspace Plan & Master Gates** | [`docs/SIRONA-WORKSPACE-PLAN.md`](SIRONA-WORKSPACE-PLAN.md) | Authoritative roadmap, P0–P8 milestone definitions, and mandatory technology matrix. | Starting a major architectural change or reviewing phase gate definitions. |
| **Workspace Implementation Ledger** | [`docs/SIRONA-WORKSPACE-LEDGER.md`](SIRONA-WORKSPACE-LEDGER.md) | Current implementation statuses, verified evidence hashes, and open issues. | Checking what is genuinely verified versus blocked in the current checkout. |
| **Technology Qualification Ledger** | [`docs/SIRONA-WORKSPACE-TECHNOLOGY-LEDGER.md`](SIRONA-WORKSPACE-TECHNOLOGY-LEDGER.md) | Deep status of the 10 core technologies (LangGraph, Vercel AI SDK, Docker, Monaco, etc.). | Evaluating technology adoption boundaries and dependencies. |
| **Docker WSL2 Home Profile Plan** | [`docs/SIRONA-WORKSPACE-P3-DOCKER-PLAN.md`](SIRONA-WORKSPACE-P3-DOCKER-PLAN.md) | Approved containerized execution plan for Windows Home hosts. | Reviewing or modifying sandbox container configurations and PTY channels. |

---

## 7. Phase Approval Records (Historical Reference)

These records document the formal owner review gates and test receipts:
- [`docs/SIRONA-WORKSPACE-P1-APPROVAL.md`](SIRONA-WORKSPACE-P1-APPROVAL.md): Durable execution, transactions, Drizzle & Zod authoring.
- [`docs/SIRONA-WORKSPACE-P2-APPROVAL.md`](SIRONA-WORKSPACE-P2-APPROVAL.md): OS credential broker authorization.
- [`docs/SIRONA-WORKSPACE-P4-APPROVAL.md`](SIRONA-WORKSPACE-P4-APPROVAL.md): Vercel AI SDK model gateway review.
- [`docs/SIRONA-WORKSPACE-P5-APPROVAL.md`](SIRONA-WORKSPACE-P5-APPROVAL.md) & [`P5-IMPLEMENTATION-PLAN.md`](SIRONA-WORKSPACE-P5-IMPLEMENTATION-PLAN.md): LangGraph orchestration and delegation gates.
- [`docs/SIRONA-WORKSPACE-P6-APPROVAL.md`](SIRONA-WORKSPACE-P6-APPROVAL.md) & [`P6-GATE-B-APPROVAL.md`](SIRONA-WORKSPACE-P6-GATE-B-APPROVAL.md): MCP SDK, Tree-sitter, ripgrep, and code intelligence.
- [`docs/SIRONA-WORKSPACE-P7-PLAN.md`](SIRONA-WORKSPACE-P7-PLAN.md): Monaco editor, xterm, React Flow, and desktop state.
