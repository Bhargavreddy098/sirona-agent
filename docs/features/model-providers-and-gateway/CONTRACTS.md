# API Contracts & Schemas: Model Providers & Gateway

## 1. REST Endpoints

### 1.1 List Available Providers & Models
- **Route**: `GET /api/v1/providers`
- **Controller**: [`apps/server/controllers/providerController.js`](file:///apps/server/controllers/providerController.js)
- **Response**: `200 OK`
```json
{
  "providers": [
    {
      "id": "gemini",
      "name": "Google Gemini",
      "configured": true,
      "models": [
        {
          "id": "gemini-2.5-pro",
          "name": "Gemini 2.5 Pro",
          "contextWindow": 1048576,
          "supportsTools": true,
          "supportsVision": true
        },
        {
          "id": "gemini-2.5-flash",
          "name": "Gemini 2.5 Flash",
          "contextWindow": 1048576,
          "supportsTools": true,
          "supportsVision": true
        }
      ]
    },
    {
      "id": "openai",
      "name": "OpenAI",
      "configured": true,
      "models": [
        {
          "id": "gpt-4o",
          "name": "GPT-4o",
          "contextWindow": 128000,
          "supportsTools": true,
          "supportsVision": true
        }
      ]
    }
  ]
}
```

### 1.2 Store Provider Credential
- **Route**: `POST /api/v1/providers/:providerId/credentials`
- **Request Body**:
```json
{
  "apiKey": "AIzaSy...",
  "baseUrl": "https://custom.endpoint.com/v1"
}
```
- **Response**: `201 Created`
```json
{
  "providerId": "gemini",
  "status": "configured",
  "fingerprint": "e3b0c442...a98b"
}
```

---

## 2. Server-Sent Events (SSE) Stream Protocol

When initiating turn inference at `POST /api/v1/execution/turns/start`, events are streamed as `text/event-stream`:

### `turn.start`
```json
{
  "turnId": "turn_01HXYZ1234567890",
  "conversationId": "conv_9876543210",
  "model": "gemini-2.5-pro",
  "startedAt": "2026-11-03T11:45:00.000Z"
}
```

### `turn.token`
```json
{
  "turnId": "turn_01HXYZ1234567890",
  "delta": "To solve this issue, let me inspect the controller..."
}
```

### `tool.call`
```json
{
  "turnId": "turn_01HXYZ1234567890",
  "callId": "call_abc123",
  "toolName": "read_file",
  "arguments": {
    "path": "apps/server/routes/v1/execution.routes.js",
    "startLine": 1,
    "endLine": 50
  }
}
```

### `turn.finish`
```json
{
  "turnId": "turn_01HXYZ1234567890",
  "finishReason": "stop",
  "usage": {
    "promptTokens": 1420,
    "completionTokens": 384,
    "totalTokens": 1804
  }
}
```
