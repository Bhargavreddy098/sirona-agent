# Agent Implementation Guide: Model Providers & Gateway

This guide provides step-by-step instructions for AI coding agents implementing, maintaining, or extending model providers in Sirona.

---

## 1. Directory & Code Map
- Provider router: [`packages/ai/src/providers.ts`](file:///packages/ai/src/providers.ts)
- Credential Broker: [`apps/desktop/src/security/credentialBroker.ts`](file:///apps/desktop/src/security/credentialBroker.ts)
- Backend Service: [`apps/server/services/aiService.js`](file:///apps/server/services/aiService.js)
- Provider Controller: [`apps/server/controllers/providerController.js`](file:///apps/server/controllers/providerController.js)
- Routes: [`apps/server/routes/v1/providers.routes.js`](file:///apps/server/routes/v1/providers.routes.js)
- Frontend Modal: [`apps/web/src/components/ModelSelectorModal.tsx`](file:///apps/web/src/components/ModelSelectorModal.tsx)

---

## 2. Step-by-Step Implementation Workflow

### Step 1: Define Contracts First
1. Open [`packages/contracts/src/models.ts`](file:///packages/contracts/src/models.ts).
2. Register new provider identifiers in `ProviderId` union:
   ```typescript
   export type ProviderId = 'gemini' | 'openai' | 'anthropic' | 'ollama' | 'openrouter';
   ```
3. Add model catalog entries with capabilities (`contextWindow`, `supportsTools`, `supportsVision`).

### Step 2: Implement Provider Adapter in `packages/ai`
1. Create adapter in `packages/ai/src/providers/<provider-name>/`:
   - Implement `streamChat(request, options)` returning an async iterable stream of tokens and tool calls.
   - Map vendor response tokens to canonical `TurnTokenEvent` and `ToolCallEvent`.
2. Connect to the multi-protocol router in [`packages/ai/src/route/`](file:///packages/ai/src/route/).

### Step 3: Implement Backend Service & Controller
1. In [`apps/server/services/aiService.js`](file:///apps/server/services/aiService.js), add provider resolution:
   - Request decrypted key from `secretStore.getCredential(providerId)`.
   - Pass abort signal from HTTP request context to upstream call.
2. In [`apps/server/routes/v1/providers.routes.js`](file:///apps/server/routes/v1/providers.routes.js), ensure routes are guarded by session authentication and rate limiting.

### Step 4: Frontend UI Wiring
1. In [`apps/web/src/api/sironaClient.ts`](file:///apps/web/src/api/sironaClient.ts), verify `providersApi.list()` and `providersApi.saveCredentials()`.
2. In [`apps/web/src/components/ModelSelectorModal.tsx`](file:///apps/web/src/components/ModelSelectorModal.tsx), render the model option with badge indicating context length and capability tags.

---

## 3. Mandatory Safety Rules
> [!CAUTION] Never print or log decrypted API keys.
> [!WARNING] Always pass `AbortSignal` to provider fetch streams. If a user stops a generation, lingering streams cause billing leaks.
> [!IMPORTANT] Validate all user-supplied `baseUrl` strings through SSRF check before opening HTTP connections.
