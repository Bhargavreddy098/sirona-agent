# Model Gateway & Provider Engine

**Subsystem:** Model Gateway & Providers  
**Owning Package:** `apps/server` (with adapters in `packages/ai` and desktop vault in `apps/desktop`)  
**Status:** Implemented & Verified in Core Pathways; Vercel AI SDK Adapter Planned/In-Progress  
**Read When:** Working on LLM inference, adding/modifying model providers, token streaming, API key resolution, model discovery, or model settings.

---

## 1. Overview & Architectural Role

The **Model Gateway** is Sirona's unified subsystem for AI model cataloging, credential resolution, streaming inference, and token cost accounting. It decouples higher-level agent loops (`apps/server/services/agentExecutionEngine.js`, `conversationTurnCoordinator.js`) from vendor-specific LLM APIs.

```
┌────────────────────────────────────────────────────────┐
│                   Frontend UI / Chat                   │
│   (apps/web/src/api/sironaClient.ts / useSirona.ts)     │
└───────────────────────────┬────────────────────────────┘
                            │ HTTP POST / SSE
                            ▼
┌────────────────────────────────────────────────────────┐
│               Express Route Handlers                   │
│         apps/server/routes/v1/providers.routes.js      │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                    ProviderService                     │
│         apps/server/services/providerService.js        │
│   - Connection CRUD & Workspace Scoping                │
│   - Model Registry & Dynamic Availability              │
│   - Turn Governance & Turn Lease Coordination          │
└──────────────┬──────────────────────────┬──────────────┘
               │                          │
               ▼                          ▼
┌───────────────────────────────┐ ┌───────────────────────────────┐
│           AIService           │ │      CredentialResolver       │
│  apps/server/services/        │ │  apps/desktop/security/       │
│  aiService.js                 │ │  credentialBroker.ts          │
│  - Multi-provider dispatch    │ │  apps/server/dist-workspace/  │
│  - Streaming normalized turns │ │  credentialResolver.js        │
│  - Tool schema formatting     │ │  - DPAPI/safeStorage vault    │
│  - Raw candidate preservation │ │  - DB / Env fallback          │
└──────────────┬────────────────┘ └───────────────────────────────┘
               │
   ┌───────────┼───────────────┬──────────────────────┐
   ▼           ▼               ▼                      ▼
Google ADK   OpenAI SDK   Anthropic SDK   OpenAI-Compatible
(@google/    (openai)     (@anthropic-    (Local/vLLM/Ollama/
 genai)                    ai/sdk)         OpenRouter)
```

---

## 2. Implementation Ownership & File Map

| Responsibility | Owning File | Interfaces & Primary Exports |
|---|---|---|
| **HTTP Routing & SSE** | `apps/server/routes/v1/providers.routes.js` | Express Router mounted at `/api/v1` in `apps/server/routes/index.js` |
| **Catalog, Connections & Turn Governance** | `apps/server/services/providerService.js` | `ProviderService.getModels()`, `getProviderConnections()`, `executeTurn()`, `getApiKey()` |
| **Low-Level Inference & Streaming** | `apps/server/services/aiService.js` | `AIService.streamTurn()`, `formatToolsForGemini()`, `formatToolsForOpenAI()`, `resolveProvider()` |
| **Turn Lease & Writer Locking** | `apps/server/services/conversationTurnCoordinator.js` | `coordinateTurn()` (SSE writer lock with `turnLeaseService.js`) |
| **Credential Resolution & Storage** | `apps/desktop/src/security/credentialBroker.ts` & `dist-workspace/src/providers/credentialResolver.js` | `DesktopCredentialBroker`, `CredentialResolver.resolveCredential()` |
| **Multi-Protocol Engine (Shared)** | `packages/ai/src/` | Protocol implementations (`protocols/gemini.ts`, `protocols/openai/`, etc.) |
| **Frontend API Client** | `apps/web/src/api/sironaClient.ts` | `sironaClient.getModels()`, `getProviderConnections()`, `executeTurnStream()` |
| **Frontend State & Hooks** | `apps/web/src/api/useSirona.ts` | `useSirona()` (Active model, settings, chat turns) |

---

## 3. Endpoints & API Contract

All routes are mounted at `/api/v1` and protected by `sessionAuth()`:

### Catalog & Options
- `GET /api/v1/providers`: Returns list of supported provider kinds (`google`, `openai`, `anthropic`, `openai_compatible`).
- `GET /api/v1/models`: Returns list of models filtered by availability and workspace provider connections.
- `GET /api/v1/model-settings`: Returns active default model, reasoning level, and temperature settings.
- `PATCH /api/v1/model-settings`: Updates active default model and inference hyperparameters.

### Provider Connections
- `GET /api/v1/provider-connections`: Lists active provider credentials (redacted, ciphertext references).
- `POST /api/v1/provider-connections`: Registers a new provider connection (with optional custom base URL and API key).
- `PATCH /api/v1/provider-connections/:id`: Updates an existing connection.
- `DELETE /api/v1/provider-connections/:id`: Removes a provider connection and its custom models.
- `POST /api/v1/provider-connections/:id/test`: Sends a test ping to the provider endpoint.
- `POST /api/v1/provider-connections/:id/models/refresh`: Discovers/refreshes models from an OpenAI-compatible endpoint.

### Inference & Turns
- `POST /api/v1/conversations/:conversationId/turns`:
  - Request body: `{ prompt: string, modelId: string, projectId?: string }`
  - Accept header `text/event-stream`: Streams SSE tokens `{ type: "token", token: "..." }` and concludes with `{ type: "done", content: "...", usage: {...} }`.
  - Accept header `application/json`: Returns complete buffered response `{ data: { content, tokens, usage } }`.

---

## 4. Key Lifecycles

### 4.1. Credential Resolution Priority
When an inference request arrives, `ProviderService.getApiKey(providerKind)` resolves credentials in this exact order:
1. **OS Credential Broker (`provider_connections`)**: If running inside Electron, credentials stored in the `provider_connections` table with DPAPI/safeStorage encryption are decrypted via `CredentialResolver`.
2. **PostgreSQL Settings (`desktop_settings`)**: If no active connection entry exists, queries `Setting.getAll()`.
3. **Host Environment Variables**:
   - `google` / `gemini`: `process.env.GEMINI_API_KEY`
   - `openai`: `process.env.OPENAI_API_KEY`
   - `anthropic`: `process.env.ANTHROPIC_API_KEY`
   - `openai_compatible`: `process.env.OPENAI_COMPATIBLE_API_KEY` or `process.env.CUSTOM_API_KEY`
4. **Hard Failure**: If no key is found, throws `ProviderServiceError("API_KEY_REQUIRED", 400)`. Sirona **never** uses mock responses or fake inference in production.

### 4.2. Streaming Turn Execution
1. The route parses `prompt` and `modelId`.
2. `ProviderService.getModelById(modelId)` verifies the model is registered and available.
3. If SSE, writes `text/event-stream` headers immediately.
4. An `AbortController` binds client disconnection (`res.on("close")`) to cancel the upstream model call.
5. `AIService.streamTurn` selects the provider SDK, formats conversation history and tools, and delegates to the vendor stream.
6. Vendor tokens are emitted via `onToken(token)` which translates to `data: {"type":"token","token":"..."}\n\n`.
7. Once streaming ends, final token usage is recorded in `token_usage_events` table (or logged if in standalone mode), and `data: {"type":"done", ...}\n\n` is sent.

---

## 5. How to Add a New Model Provider (Extension Guide)

Follow this exact checklist when adding a new model provider (e.g. `Groq`, `Mistral`, or `Ollama native`):

### Step 1: Update Supported Provider Enums
- In `apps/server/services/providerService.js`:
  - Add the new kind to `getSupportedProviders()` (e.g. `"groq"`).
- In `apps/desktop/src/main.cjs`:
  - Update `inputSchema` Zod enum: `z.enum(['google','openai','anthropic','openai_compatible','groq'])`.

### Step 2: Implement Inference in `AIService`
- Open `apps/server/services/aiService.js`:
  - Add credential getter mapping in `AIService.getApiKey(provider)` (e.g., `process.env.GROQ_API_KEY`).
  - Add model name prefix detection in `AIService.resolveProvider(modelName)`.
  - In `AIService.streamTurn()`, add a handler branch:
    ```js
    if (resolvedProvider === "groq") {
      // Initialize client with getApiKey("groq")
      // Stream chunks and invoke onToken(chunk)
      // Return { content, tool_calls, rawCandidate }
    }
    ```

### Step 3: Register Default Models
- In `apps/server/services/providerService.js`:
  - Add entries to default models SQL seed or `getModels()` query.
  - Set `provider_kind`, `context_window`, `max_output_tokens`, and cost metrics.

### Step 4: Verify Frontend Integration
- Open `apps/web/src/components/ModelSelectorModal.tsx` and `SettingsScreen.tsx`:
  - Verify that the new provider shows up in Provider Settings.
  - Verify that the model picker categorizes the new models properly.

### Step 5: Verification Command
Run focused provider unit and parity tests:
```bash
node scripts/run-test.js --pkg server --filter provider
```

---

## 6. Current Gaps & Unverified Items
- **Vercel AI SDK Integration (Phase P4)**: Proposed in `docs/SIRONA-WORKSPACE-PLAN.md` (`TECH-02`), but current codebase relies on native SDKs (`@google/genai`, `openai`, `@anthropic-ai/sdk`) inside `apps/server/services/aiService.js`.
- **SQLite / PostgreSQL Model Registry**: When `SIRONA_DB_DRIVER=sqlite`, models are queried through `sqliteDb.js`. Ensure migration 006 / 020 tables are present if testing offline.
