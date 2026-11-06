---
title: "Model Gateway Routing & End-to-End Execution"
summary: "Detailed end-to-end trace of model requests across frontend, Express routers, services, and vendor adapters."
read_when:
  - "When tracing the full journey of a user prompt to LLM token streaming"
  - "When debugging turn leases, writer locking, or request cancellation"
owning_subsystem: "Model Gateway"
primary_source_files:
  - "apps/server/routes/v1/providers.routes.js"
  - "apps/server/services/providerService.js"
  - "apps/server/services/aiService.js"
  - "apps/server/services/conversationTurnCoordinator.js"
---

# Model Gateway Routing & End-to-End Execution

This document details the exact execution path of a user prompt through Sirona's Model Gateway.

---

## 1. End-to-End Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Web as apps/web (React UI)
    participant Desktop as apps/desktop (Electron)
    participant Route as providers.routes.js
    participant Coord as conversationTurnCoordinator.js
    participant Lease as turnLeaseService.js
    participant Prov as providerService.js
    participant AI as aiService.js
    participant LLM as Provider API (Gemini/OpenAI)

    User->>Web: Type prompt & click Send
    Web->>Route: POST /api/v1/conversations/:id/turns (Accept: text/event-stream)
    Route->>Coord: coordinateTurn(req, res)
    Coord->>Lease: acquireLease(conversationId, { ttl: 90s })
    Note over Coord,Lease: If lease exists, return HTTP 409 TURN_LEASE_CONFLICT
    Coord->>Prov: executeTurn({ conversationId, prompt, modelId, signal })
    Prov->>Desktop: CredentialResolver.resolveCredential()
    Desktop-->>Prov: Returns decrypted API key
    Prov->>AI: streamTurn({ model, systemPrompt, messages, tools })
    AI->>LLM: Vendor API streaming call
    loop Stream Chunks
        LLM-->>AI: Raw chunk
        AI-->>Coord: onToken(token)
        Coord-->>Route: res.write("data: {type:'token', token}...")
        Route-->>Web: SSE Event Received
        Web-->>User: Render token in chat
    end
    LLM-->>AI: Stream completed
    Coord->>Lease: releaseLease(conversationId)
    Coord-->>Route: res.write("data: {type:'done', ...}")
    Route-->>Web: Close stream
```

---

## 2. Request Cancellation & Abort Propagation

If the user clicks "Stop" or navigates away during an active stream:
1. The browser closes the HTTP connection.
2. In `apps/server/routes/v1/providers.routes.js`:
   ```js
   res.on("close", () => {
     if (!completedNormally && !res.writableEnded) {
       abortController.abort(new Error("CLIENT_DISCONNECTED"));
     }
   });
   ```
3. The abort signal propagates through `ProviderService.executeTurn` to the underlying vendor stream in `AIService`, immediately terminating token billing with the upstream LLM provider.
4. `conversationTurnCoordinator.js` `finally` block releases the turn lease so the conversation is not locked.
