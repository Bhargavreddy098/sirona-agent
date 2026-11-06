# Verification & Testing: Model Providers & Gateway

## 1. Acceptance Criteria & Test Matrix

| Test ID | Test Description | Verification Target | Pass Condition |
|---|---|---|---|
| `MPG-01` | List available models | `GET /api/v1/providers` | Returns 200 OK with registered catalog and configured flags |
| `MPG-02` | Credential storage roundtrip | `POST /api/v1/providers/gemini/credentials` | Key encrypted with DPAPI, stored in DB, decrypted in memory only |
| `MPG-03` | SSE token streaming | `POST /api/v1/execution/turns/start` | Emits `turn.start`, `turn.token` deltas, and `turn.finish` |
| `MPG-04` | Abort cancellation | Client disconnects mid-stream | Upstream stream aborted, turn lease released in DB within 1s |
| `MPG-05` | SSRF prevention | Custom baseUrl set to `169.254.169.254` | Rejected with `400 INVALID_ENDPOINT` / `SSRF_BLOCKED` |
| `MPG-06` | Gemini schema conversion | Call tool with nested properties | Properties converted to valid Gemini `OBJECT` / `STRING` schema |

---

## 2. Automated Test Commands

```bash
# Run provider unit and contract tests
pnpm --filter @sirona/ai test

# Run backend provider route tests
pnpm --filter @sirona/server test tests/providers.test.js

# Verify client-to-backend model streaming without mocks
node apps/web/tests/sse.test.mjs
```
