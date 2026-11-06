# Agent Implementation Guide: Tool Execution & Sandbox

This guide documents the procedures for adding new agent tools, implementing containment checks, and maintaining Docker WSL2 sandboxes.

---

## 1. Relevant Code Files
- Tool Runtime Service: [`apps/server/services/toolRuntimeService.js`](file:///apps/server/services/toolRuntimeService.js)
- Sandbox Manager: [`apps/server/services/sandboxManager.js`](file:///apps/server/services/sandboxManager.js)
- Isolation Broker: [`apps/server/services/isolationBrokerService.js`](file:///apps/server/services/isolationBrokerService.js)
- Path Resolver: [`apps/server/services/workspacePathResolver.js`](file:///apps/server/services/workspacePathResolver.js)
- Docker Definition: [`apps/cli/docker/tools-worker.Dockerfile`](file:///apps/cli/docker/tools-worker.Dockerfile)
- Routes: [`apps/server/routes/v1/tools.routes.js`](file:///apps/server/routes/v1/tools.routes.js), [`apps/server/routes/v1/isolation.routes.js`](file:///apps/server/routes/v1/isolation.routes.js)

---

## 2. Registering a New Agent Tool

1. **Define Schema in `packages/contracts/src/execution.ts`**:
   ```typescript
   export const RunLinterToolSchema = z.object({
     path: z.string().min(1),
     fix: z.boolean().default(false),
   });
   ```
2. **Implement Tool Handler in `apps/server/services/toolRuntimeService.js`**:
   ```javascript
   registerTool({
     name: "run_linter",
     description: "Execute project linter on specified file or directory",
     parameters: RunLinterToolSchema,
     risk: "low",
     handler: async ({ path: targetPath, fix }, context) => {
       const resolved = workspacePathResolver.resolve(context.workspaceRoot, targetPath);
       const cmd = fix ? `npx eslint "${resolved}" --fix` : `npx eslint "${resolved}"`;
       return await sandboxManager.runCommand(cmd, { timeoutMs: 15000 });
     }
   });
   ```
3. **Add Risk Policy in `governanceService.js`**:
   Classify tool risk level (`low`, `medium`, `high`, `critical`) to determine whether human approval is required.

---

## 3. Mandatory Safety Rules
> [!CAUTION] Never bypass `workspacePathResolver.resolve()`. Passing raw strings to `fs.readFileSync` or `fs.writeFileSync` creates high-severity path traversal vulnerabilities.
> [!WARNING] On Windows hosts, ensure command strings passed to child processes are escaped to avoid PowerShell / cmd.exe argument injection.
