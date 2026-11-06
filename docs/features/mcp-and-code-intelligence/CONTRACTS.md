# API Contracts & Schemas: MCP & Code Intelligence

## 1. REST Endpoints

### 1.1 List Configured MCP Servers
- **Route**: `GET /api/v1/tools/mcp/servers`
- **Response**: `200 OK`
```json
{
  "servers": [
    {
      "id": "github-mcp",
      "name": "GitHub Issues & PRs",
      "transport": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "status": "connected",
      "toolsCount": 12
    }
  ]
}
```

### 1.2 Query AST Symbols
- **Route**: `POST /api/v1/workspace/symbols`
- **Request Body**:
```json
{
  "query": "createDatabaseOwner",
  "kind": "function"
}
```
- **Response**: `200 OK`
```json
{
  "symbols": [
    {
      "name": "createDatabaseOwner",
      "kind": "function",
      "file": "apps/server/config/db.js",
      "line": 7,
      "signature": "export function createDatabaseOwner(config, logger, Pool = pg.Pool)"
    }
  ]
}
```
