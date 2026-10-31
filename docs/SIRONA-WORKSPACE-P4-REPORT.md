# Sirona Workspace P4 Completion Report: Vercel AI SDK Integration

Date: 2026-10-29  
Status: Accepted within scope  
Target: Isolated test database `sirona_workspace_p0_test_20261028` (schema 023). Live database `sirona` unchanged (schema 021).

---

## 1. Executive Summary

Phase 4 (Vercel AI SDK Integration behind existing provider ports) has been fully implemented and verified against all acceptance criteria per [SIRONA-WORKSPACE-P4-APPROVAL.md](SIRONA-WORKSPACE-P4-APPROVAL.md) and the [P0–P8 Workspace Plan](SIRONA-WORKSPACE-PLAN.md).

All blocking findings and review gaps have been comprehensively addressed:
1. **Automatic Lease Release on Cancellation:** Verified through the real API / coordinator (`coordinateTurn`) without manual release. When the client disconnects or aborts mid-stream, `coordinateTurn`'s `finally` block automatically releases the turn lease via `SessionTurnLeaseRegistry.releaseLease`, confirmed by `TurnLease.getLease() === false` and immediate subsequent lease acquisition.
2. **Controlled Failure Modes Covered:**
   - **Timeout:** Aborted signals with `TimeoutError` or timeout deadlines translate to HTTP 504 `INFERENCE_TIMEOUT`.
   - **Throttling:** Upstream rate limits (`RESOURCE_EXHAUSTED` / 429) translate to HTTP 429 `RATE_LIMIT_EXCEEDED`.
   - **Interrupted Streams:** Socket hang-ups and sudden upstream EOF translate to HTTP 502 `STREAM_INTERRUPTED`.
3. **Public DTO Reconciled:** The client-controlled `adapter` parameter was removed from `req.body` in `coordinateTurn`. The public DTO remains strictly `{ prompt, modelId, clientTurnId, retryOf }`. Provider adapter selection is controlled entirely by server-side configuration (`SIRONA_PROVIDER_ADAPTER`).
4. **Retry/Reconnect Without Duplication:** Retrying a cancelled turn via `retryOf` reuses the existing user message without duplicating it in PostgreSQL (`COUNT(role = 'user')` remains exactly 1), completes streaming, records `model_calls`, and automatically releases the lease upon completion.
5. **Tool Compatibility Routing:** `canHandle` and `AIService.streamTurn` detect tool calls or tool history in messages and automatically route to the native Google GenAI adapter for compatibility; `AiSdkAdapter` fails closed with 400 `UNSUPPORTED_REQUEST` if called directly with unsupported tool inputs.
6. **Reported Usage Persistence:** `ProviderService.executeTurn` extracts `promptTokens`, `completionTokens`, and `totalTokens` from the SDK's reported usage, updates the user message in PostgreSQL, persists the exact counts in `model_calls`, and calculates micro-USD costs from reported usage.
7. **Full Verifiable Evidence Package:** Verbatim raw test logs (13/13 parity, 73/73 workspace), live streaming transcripts, cancellation traces, and SHA-256 source hashes are preserved in `docs/integration/evidence/workspace-p4/`.

---

## 2. Implementation Scope & Files

### Dependencies
- Pinned and installed with scripts disabled (`--ignore-scripts`):
  - `ai@7.0.156`
  - `@ai-sdk/google@4.0.107`

### Canonical Modules
1. **`backend/src/providers/modelAdapter.ts`**
   - Canonical interface definition for multi-provider model adapters (`IModelAdapter`, `ChatMessage`, `StreamTurnOptions`, `StreamTurnResult`).
   - Supports `tools?: any[]` in options and capability inspection with options.
2. **`backend/src/providers/aiSdkAdapter.ts`**
   - Implements `IModelAdapter` for Google Gemini models via `@ai-sdk/google` (`createGoogleGenerativeAI`) and `ai` (`streamText`).
   - Checks `canHandle` and rejects tools or tool messages in history.
   - Preserves exact model IDs byte-for-byte.
   - Streams tokens via `onToken` callback while monitoring `AbortSignal` both during iteration and upon completion.
   - Normalizes usage accounting (`promptTokens`, `completionTokens`, `totalTokens`).
   - Translates upstream provider errors:
     - 401 `INVALID_CREDENTIALS`
     - 429 `RATE_LIMIT_EXCEEDED`
     - 404 `MODEL_NOT_FOUND`
     - 499 `TURN_CANCELLED`
     - 504 `INFERENCE_TIMEOUT`
     - 502 `STREAM_INTERRUPTED`
     - 400 `UNSUPPORTED_REQUEST`

### Service Integrations
1. **`backend/services/aiService.js`**
   - Updated `streamTurn` to inspect request options. If `adapter: "vercel_ai_sdk"` is requested without tools or tool history, dispatches to `AiSdkAdapter`.
   - If tools, function calls, or tool messages in history are detected, automatically selects native Google GenAI adapter for compatibility.
2. **`backend/services/providerService.js`**
   - Extracts reported prompt and completion tokens from `streamResult.usage`.
   - Updates user message token count in PostgreSQL with actual reported prompt tokens.
   - Persists completed assistant message and logs `model_calls` with exact reported input/output/total tokens and settles budget reservations accordingly.
   - Monitors abort signals in `wrappedOnToken` to catch mid-stream client cancellations immediately.
3. **`backend/services/conversationTurnCoordinator.js`**
   - Public DTO preserved strictly (`{ prompt, modelId, clientTurnId, retryOf }`).
   - Resolves adapter from server environment `SIRONA_PROVIDER_ADAPTER`.
   - Ensures automatic single-writer lease release in its `finally` block on completion, cancellation, and error.

---

## 3. Verification & Evidence Package

### Test Suites
- **`backend/tests/providerParity.test.ts` (13/13 PASS):**
  1. `AiSdkAdapter capability routing`: Handles `google` and `gemini` text models; returns `false` when tools or tool messages are present.
  2. `Unauthenticated requests`: Fails closed with HTTP 401 `AUTHENTICATION_REQUIRED`.
  3. `Invalid API key error translation`: Triggers upstream error translation to HTTP 401 `INVALID_CREDENTIALS`.
  4. `Unsupported tool calling in AiSdkAdapter fails closed`: Rejects direct tool invocations with HTTP 400 `UNSUPPORTED_REQUEST`.
  5. `AIService selects native adapter for unsupported tool requests`: Requests with tool declarations automatically select native Google adapter.
  6. `Real configured Google streaming inference`: Live inference streams tokens with exact reported token metrics.
  7. `AIService dispatches through Vercel AI SDK when selected`: Verifies dispatch parity and reported prompt tokens.
  8. `ProviderService.executeTurn persists reported usage in PostgreSQL`: Verifies user message update, assistant message persistence, and `model_calls` matching reported usage.
  9. `Controlled failure - timeout maps to 504 INFERENCE_TIMEOUT`: Verifies timeout abort mapping.
  10. `Controlled failure - rate limiting maps to 429 RATE_LIMIT_EXCEEDED`: Verifies quota/throttle error mapping.
  11. `Controlled failure - interrupted stream maps to 502 STREAM_INTERRUPTED`: Verifies socket/stream break mapping.
  12. `Automatic lease release on client cancellation through real coordinator`: Real coordinator aborts mid-stream and automatically releases lease in `finally` without manual release; subsequent lease acquired immediately.
  13. `Turn retry (retryOf) reuses original user message without duplication and completes`: Reuses user message, completes turn, records `model_calls`, and automatically releases lease.

- **Full Workspace Suite (`npm --prefix backend run test:workspace`):**
  - **73/73 PASS** (0 failures, 0 skipped, duration 103.3s).
- **Tooling Suite (`npm --prefix tooling/sirona run test`):**
  - **6/6 PASS** (0 failures).
- **Static Typechecks:**
  - `npm --prefix backend run check:workspace`: **PASS (0 errors)**.
  - `npm --prefix frontend/sirona-next run check`: **PASS (0 errors)**.

### Evidence Artifacts
All evidence files are located in `docs/integration/evidence/workspace-p4/`:
- `source-hashes.json`: SHA-256 hashes of all implementation, service, and verification files.
- `live-provider-transcript.txt`: Verbatim execution trace of live Google Gemini inference with per-chunk millisecond timing.
- `cancellation-stream-transcript.txt`: Verbatim execution trace of real coordinator active stream cancellation, DB assertions, and automatic single-writer lease release without manual intervention.
- `verified-parity-tests.txt`: Full raw console output of the 13 parity tests passing.
- `verified-workspace-tests.txt`: Full raw console output of the 73 workspace tests passing.
- `verification.json`: Complete machine-readable verification manifest.

---

## 4. Preservations and Non-Interference
- **Zero Schema Migrations:** No new database DDL or migrations were added; live `sirona` remains on 021.
- **Zero Public DTO Changes:** Public API DTO remains `{ prompt, modelId, clientTurnId, retryOf }`.
- **No Secret Disclosure:** Provider credentials remain inside the qualified DPAPI / SecretStore boundary and are never logged or exposed in HTTP responses.
- **No Mid-Stream Fallback:** Adapter selection occurs strictly prior to dispatch; cancellations are handled cleanly without inconsistent states.
- **Clean Rollback Path:** Unsetting `SIRONA_PROVIDER_ADAPTER` immediately restores native Google GenAI SDK dispatch with zero data or configuration mutations.
