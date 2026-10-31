# P4 approval scope — Vercel AI SDK behind existing providers

2026-10-29. Proposal only; P4 has not started. Approval of P3 or the overall roadmap does not authorize these protected provider changes. Stage 17 STOP remains active.

Owner response to this proposal: **“Stop after P3.”** This scope remains unapproved. The [Antigravity/OpenCode continuation guide](SIRONA-EXTERNAL-AGENT-GUIDE.md) describes preparation and future approval; it does not override this decision.

## Exact implementation boundary

Reuse existing provider authentication, OS credential resolver, authenticated discovery, canonical model registry, routing, model-call accounting, conversation coordinator and SSE transport. Introduce the Vercel AI SDK incrementally behind the provider port, starting with one configured Google connection. Preserve OpenAI, Anthropic and compatible-provider behavior through their working adapters. SDK coverage expands only after parity evidence; unsupported features retain the selected native adapter before dispatch. Never switch adapters after emitting output or effects.

Protected files proposed: `backend/services/providerService.js`, `backend/services/aiService.js`, and `backend/services/conversationTurnCoordinator.js` only where necessary for adapter selection, cancellation and usage reconciliation. Preserve `backend/src/providers/credentialResolver.ts` and its trusted OS boundary; any required change there must first be identified and reviewed within this scope.

New TypeScript: `backend/src/providers/modelAdapter.ts`, `backend/src/providers/aiSdkAdapter.ts`; tests `backend/tests/providerParity.test.ts`. Dependency metadata: `backend/package.json` and `backend/package-lock.json` for `ai` and `@ai-sdk/google`, with maintained compatible versions inspected, pinned and locked before installation. No duplicate provider registry, orchestration framework or secret store. Install scripts remain disabled.

Documentation: current plan, ledger, handoff, technology ledger, route ownership and a P4 report with source hashes and controlled evidence.

## Contracts and explicit exclusions

- No public API route, DTO, schema or PostgreSQL migration change.
- No working-data conversion, credential rotation or production adapter activation.
- Exact authenticated model IDs remain unchanged, including slash/colon IDs. Native chat identity and Google `chunk.text` behavior remain covered.
- Existing streaming, cancellation, timeout/throttle errors, usage/cost tracking and privacy constraints remain authoritative.
- No frontend redesign, LangGraph/MCP integration, host execution, commits, pushes or deployment.

## Acceptance and evidence

1. Existing provider/chat/credential regression suites pass.
2. Real configured-provider inference streams through the new SDK with the exact selected model ID, actual usage evidence and native response identity. A mock response cannot satisfy this gate.
3. Real cancellation interrupts the SDK call and releases the existing turn lease. No duplicate assistant/user message or usage reconciliation on reconnect/retry.
4. Controlled upstream failure tests cover rejected authentication, timeout, throttling, unsupported capability and interrupted streams. Label these tests separately from real-provider evidence.
5. Compare native and SDK adapter contracts; do not demand identical nondeterministic generated text. Confirm capability, exact ID, request semantics, streaming events, error/cancel behavior and accounting.
6. Use the guarded isolated database for integration writes; preserve the working database and its current migration lineage. Keep credentials and raw secret payloads out of logs/evidence.

Rollback: disable the per-provider SDK selection before new calls; finish/cancel in-flight calls through the existing owner. Keep native adapters, canonical records, leases and usage receipts. No automatic schema rollback or mid-stream provider fallback.

Requested approval covers the listed protected files, necessary selected SDK dependencies, focused tests and bounded real calls through an already configured connection. New paid accounts, purchases, new secrets, migrations, privileged operations or broader provider rewrites require their own approval.
