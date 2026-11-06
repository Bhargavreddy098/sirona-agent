# Agent Implementation Guide: MCP & Code Intelligence

This guide explains how to connect Model Context Protocol (MCP) servers and execute Tree-sitter code queries in Sirona.

---

## 1. Key Source Files
- Context Engine: [`apps/server/services/contextEngineService.js`](file:///apps/server/services/contextEngineService.js)
- MCP Schemas: [`packages/schema/src/config/mcp.ts`](file:///packages/schema/src/config/mcp.ts), [`packages/schema/src/mcp.ts`](file:///packages/schema/src/mcp.ts)
- CLI LSP / Search: [`apps/cli/src/lsp.ts`](file:///apps/cli/src/lsp.ts)
- Routes: [`apps/server/routes/v1/tools.routes.js`](file:///apps/server/routes/v1/tools.routes.js)

---

## 2. Registering an MCP Client

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export async function connectMcpServer(config) {
  const transport = new StdioClientTransport({
    command: config.command,
    args: config.args,
    env: { ...process.env, ...config.env }
  });

  const client = new Client({ name: "sirona-mcp-client", version: "1.0.0" }, { capabilities: {} });
  await client.connect(transport);
  
  const tools = await client.listTools();
  return { client, tools: tools.tools };
}
```

---

## 3. Mandatory Rules
> [!IMPORTANT] Local MCP server child processes must be shut down gracefully during app shutdown or when disabling the server.
> [!CAUTION] MCP tool calls that modify state must still route through `governanceService` for risk evaluation.
