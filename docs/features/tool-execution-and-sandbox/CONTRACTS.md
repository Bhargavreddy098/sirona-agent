# API Contracts & Schemas: Tool Execution & Sandbox

## 1. REST Endpoints

### 1.1 Execute Tool Directly
- **Route**: `POST /api/v1/tools/execute`
- **Controller**: [`apps/server/controllers/toolsController.js`](file:///apps/server/controllers/toolsController.js)
- **Request Body**:
```json
{
  "toolName": "edit_file",
  "arguments": {
    "path": "apps/web/src/components/Titlebar.tsx",
    "target": "const title = 'Old';",
    "replacement": "const title = 'Sirona';"
  },
  "workspaceRoot": "C:\\Users\\bharg\\OneDrive\\Desktop\\personal -agent"
}
```
- **Response**: `200 OK`
```json
{
  "success": true,
  "toolName": "edit_file",
  "data": {
    "path": "apps/web/src/components/Titlebar.tsx",
    "replacementsMade": 1,
    "diff": "--- a/Titlebar.tsx\n+++ b/Titlebar.tsx\n@@ -1,1 +1,1 @@\n-const title = 'Old';\n+const title = 'Sirona';"
  },
  "durationMs": 14
}
```

### 1.2 Isolation Broker Status
- **Route**: `GET /api/v1/isolation/status`
- **Response**: `200 OK`
```json
{
  "engine": "docker",
  "status": "ready",
  "profile": "trusted-local",
  "containerId": "sirona-worker-7c91a",
  "memoryLimitBytes": 2147483648,
  "cpuQuota": 2.0
}
```

---

## 2. Terminal WebSocket Protocol

Interactive terminal sessions connect to `ws://127.0.0.1:3000/api/v1/terminal/pty/:ticketId`:

### Client Message: Input
```json
{
  "type": "stdin",
  "data": "pnpm test\r"
}
```

### Server Message: Output
```json
{
  "type": "stdout",
  "data": "\u001b[32m PASS \u001b[39m tests/auth.test.ts\r\n"
}
```

### Client Message: Resize
```json
{
  "type": "resize",
  "cols": 120,
  "rows": 32
}
```
