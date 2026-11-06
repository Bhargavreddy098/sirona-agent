# Verification & Testing: MCP & Code Intelligence

## 1. Acceptance Criteria & Test Matrix

| Test ID | Test Description | Verification Target | Pass Condition |
|---|---|---|---|
| `MCP-01` | Stdio MCP connection | Spawn local MCP server | JSON-RPC handshake succeeds, lists tools correctly |
| `MCP-02` | MCP tool execution | Invoke MCP tool via agent | Formats call, executes over stdio, parses response JSON |
| `MCP-03` | Tree-sitter query | Query function definitions in JS file | Accurately extracts symbol name, start line, and signature |
| `MCP-04` | Ripgrep pattern search | Search codebase for `createApp` | Returns accurate file paths and match line numbers under 200ms |
| `MCP-05` | Process cleanup on disconnect | Disconnect MCP server | Child stdio process is terminated cleanly without zombie PID |

---

## 2. Automated Test Commands

```bash
# Run MCP client protocol tests
pnpm --filter @sirona/server test tests/mcp.test.js

# Run Tree-sitter and ripgrep code intelligence tests
pnpm --filter @sirona/cli test tests/lsp.test.ts
```
