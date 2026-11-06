# Feature Specification: Tool Execution & Sandbox

> [!TIP]
> **Agent Context Guidance**: Load only this feature directory (`docs/features/tool-execution-and-sandbox/`), [`docs/governance/ACTIVE-STOP-RULES.md`](../../governance/ACTIVE-STOP-RULES.md), and direct cross-feature dependencies explicitly cited below. Do not load unreferenced feature specifications or legacy archives into working context.

## 1. Context & Problem Statement
Autonomous AI agents require capabilities to inspect code, edit files, and run shell commands (tests, builds, linters). However, running arbitrary commands or unconstrained filesystem edits on a developer's machine poses catastrophic security risks (ransomware, accidental recursive deletion, data exfiltration).

Sirona enforces strict execution boundaries:
1. **Filesystem Tools**: Confined strictly inside the authorized `workspaceRoot` by [`workspacePathResolver.js`](file:///apps/server/services/workspacePathResolver.js).
2. **Shell Execution**: Confined to an isolated Docker WSL2 container (`tools-worker.Dockerfile`) or throttled child processes with hard timeouts and resource limits.
3. **PTY Terminal Gateway**: Real-time terminal sessions pass through authenticated WebSocket channels.

---

## 2. Tool Architecture & Sandbox Pipeline

```mermaid
graph TD
    Agent["Agent Execution Engine"] --> ToolRuntime["ToolRuntimeService (apps/server/services)"]
    
    ToolRuntime --> ToolRouter{"Tool Category"}
    
    ToolRouter -->|Filesystem Tool| PathResolver["WorkspacePathResolver"]
    PathResolver -->|Valid Inside Root| DirectFS["Atomic Disk Operation (read/write/edit)"]
    PathResolver -->|Escapes Root| DenyFS["Reject: 403 PATH_OUTSIDE_WORKSPACE"]
    
    ToolRouter -->|Shell Execution| IsolationBroker["IsolationBrokerService"]
    IsolationBroker --> SandboxCheck{"Docker Profile Enabled?"}
    SandboxCheck -->|Yes| DockerWSL2["Docker WSL2 Container (tools-worker)"]
    SandboxCheck -->|No (Trusted Local)| NodeChild["Node.js child_process (Clamped Timeout)"]
    
    DockerWSL2 --> ExecResult["Stdout / Stderr / Exit Code"]
    NodeChild --> ExecResult
    ExecResult --> AuditLog["auditLogger.js"]
```

---

## 3. Tool Catalog & Capabilities

| Tool Name | Operation | Parameters | Risk Level |
|---|---|---|---|
| `read_file` | Read text/file content with line range limits | `path`, `startLine`, `endLine` | Low (Auto) |
| `write_file` | Create or overwrite file with content | `path`, `content`, `overwrite` | Medium (Governance Check) |
| `edit_file` | Exact block search-and-replace | `path`, `target`, `replacement` | Medium (Governance Check) |
| `list_directory` | Enumerate directory tree | `path`, `recursive`, `depth` | Low (Auto) |
| `search_files` | Ripgrep AST/regex pattern search | `query`, `includePatterns`, `maxResults` | Low (Auto) |
| `execute_shell` | Run shell command in sandbox | `command`, `timeoutMs`, `workingDir` | High (Approval Required) |

---

## 4. Containment Constraints
- **Path Confinement**: Directory traversal tokens (`..`), junction escapes, and absolute drive crosses (e.g. `C:\Windows`) are rejected before disk access.
- **Resource Limits in Docker**: Max 2GB RAM, 2 CPU cores, drop all root capabilities (`cap_drop: ALL`), read-only rootfs with tmpfs mounts.
- **Command Timeouts**: Default 30,000ms. Hard kill with `SIGKILL` if process fails to respond within 5,000ms of `SIGTERM`.
