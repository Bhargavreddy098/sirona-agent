# Tool Execution & Sandbox Environment

**Subsystem:** Tool Execution, Sandbox & Shell Commands  
**Owning Package:** `apps/server` (with guest tooling in `apps/cli` and `packages/ai`)  
**Status:** Implemented (Local Process & Docker Desktop Profile); Hyper-V Guest Profile Inactive  
**Read When:** Modifying filesystem tools, shell execution, command execution safety, Docker isolation, or tool schema definitions.

---

## 1. Overview & Architectural Role

The **Tool Execution Subsystem** provides the interface through which LLMs inspect and modify files, search codebases, and run commands. It balances developer velocity with containment and security.

```
                      ┌────────────────────────────┐
                      │    Tool Invocations from   │
                      │    AgentExecutionEngine    │
                      └─────────────┬──────────────┘
                                    │
                                    ▼
                      ┌────────────────────────────┐
                      │    ToolRuntimeService      │
                      │  (services/                │
                      │   toolRuntimeService.js)   │
                      │  - Catalog & Schemas       │
                      │  - Input/Output Validation │
                      │  - Risk Class Check        │
                      └───────┬───────────┬────────┘
                              │           │
       Local / Direct Filesystem          │ Shell Execution
                              │           │
                              ▼           ▼
                      ┌───────────────┐ ┌───────────────────────────────┐
                      │ Node.js fs    │ │       SandboxManager          │
                      │ operations    │ │  (services/sandboxManager.js) │
                      │ (Path-scoped) │ │  - Docker WSL2 execution      │
                      └───────────────┘ │  - Local process fallback     │
                                        │  - Process timeouts & kill    │
                                        └───────────────────────────────┘
```

---

## 2. Implementation Ownership & File Map

| Responsibility | Owning File | Interfaces & Primary Exports |
|---|---|---|
| **Tool Registry & Invocation** | `apps/server/services/toolRuntimeService.js` | `ToolRuntimeService.invokeTool()`, `getStandardToolSchemas()` |
| **Sandbox & Process Execution** | `apps/server/services/sandboxManager.js` | `SandboxManager.execute()`, `SandboxManager.executeCommand()` |
| **Workspace Path Resolution** | `apps/server/services/workspacePathResolver.js` | `resolveWorkspacePath()` (Prevents path traversal out of workspace root) |
| **Isolation Broker** | `apps/server/services/isolationBrokerService.js` | `IsolationBrokerService.createWorker()` |
| **HTTP Tool Routes** | `apps/server/routes/v1/tools.routes.js` | `GET /api/v1/tools`, `POST /api/v1/tools/:toolId/invoke` |

---

## 3. Standard Agent Tools

`ToolRuntimeService.getStandardToolSchemas` exposes standard tools:

| Tool Name | Risk Class | Purpose | Parameters |
|---|---|---|---|
| `read_file` | Read | Read text from a file inside the workspace | `path: string` |
| `write_file` | Write (High) | Write complete text content to a file | `path: string, content: string` |
| `list_directory` | Read | List files and folders in a workspace directory | `path: string, recursive?: boolean` |
| `execute_command` | Execute (High)| Run a shell command in the project directory | `command: string, timeoutMs?: number` |
| `apply_patch` | Write (High) | Apply unified diff patch to a target file | `targetPath: string, patch: string` |
| `propose_task_completion`| Admin | Complete the agent turn with final summary | `summary: string, filesModified?: string[]` |

---

## 4. Execution Boundary & Security Guarantees

1. **Path Boundary**: Every file access is checked against `workspaceRoot` using `workspacePathResolver.js`. Reparse points, junctions, and `..` traversals outside the project folder are rejected with `PATH_OUTSIDE_WORKSPACE`.
2. **Process Execution Modes**:
   - **Docker WSL2 (`trusted-local` profile)**: Approved for Windows Home in `docs/SIRONA-WORKSPACE-P3-DOCKER-PLAN.md`. Runs commands in an unprivileged container with workspace mounted.
   - **Local Process Spawner (`cross-spawn`)**: Used when Docker is unavailable or offline. Commands run with standard Node child process limits (timeout enforcement, buffer truncation).
3. **Execution Deadlines**: Default command timeout is 30,000 ms (configurable per call). Hanging processes are killed via `SIGTERM` followed by `SIGKILL`.

---

## 5. How to Add a New Tool

1. **Define Schema**: In `apps/server/services/toolRuntimeService.js`, add the schema to `getStandardToolSchemas()`.
2. **Implement Handler**: In `ToolRuntimeService.invokeTool()`, add a handler case:
   ```js
   case "my_new_tool": {
     const safePath = resolveWorkspacePath(workspaceRoot, input.path);
     // Perform operation
     return { output: result };
   }
   ```
3. **Add Tests**: In `apps/server/tests/tools.test.js`, add positive and path traversal negative test cases.
