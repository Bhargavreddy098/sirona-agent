# API Contracts & Schemas: Agent Runtime & Loop

## 1. REST Endpoints

### 1.1 Start Agent Turn
- **Route**: `POST /api/v1/execution/turns/start`
- **Controller**: [`apps/server/controllers/executionController.js`](file:///apps/server/controllers/executionController.js)
- **Request Body**:
```json
{
  "conversationId": "conv_01HXYZ987654321",
  "prompt": "Fix failing tests in backend/routes/auth.routes.js",
  "modelId": "gemini-2.5-pro",
  "autonomyMode": "supervised",
  "contextFiles": [
    "apps/server/routes/auth.routes.js"
  ]
}
```
- **Response**: `200 OK` (Streams `text/event-stream`)

### 1.2 Cancel Active Turn
- **Route**: `POST /api/v1/execution/turns/:turnId/cancel`
- **Request Body**: `{ "reason": "User requested abort" }`
- **Response**: `200 OK`
```json
{
  "turnId": "turn_01HXYZ1234567890",
  "status": "cancelled",
  "releasedAt": "2026-11-03T11:46:12.000Z"
}
```

---

## 2. Event Payload Schemas

### `step.start`
```json
{
  "turnId": "turn_01HXYZ1234567890",
  "stepIndex": 2,
  "maxSteps": 25,
  "startedAt": "2026-11-03T11:45:10.000Z"
}
```

### `tool.result`
```json
{
  "turnId": "turn_01HXYZ1234567890",
  "callId": "call_abc123",
  "toolName": "read_file",
  "success": true,
  "result": "function authenticate() { ... }",
  "durationMs": 42
}
```

### `approval.requested`
```json
{
  "approvalId": "appr_998877",
  "turnId": "turn_01HXYZ1234567890",
  "toolName": "execute_shell",
  "arguments": {
    "command": "git push origin main"
  },
  "riskLevel": "high",
  "reason": "Remote push operation modifies external repository state."
}
```
