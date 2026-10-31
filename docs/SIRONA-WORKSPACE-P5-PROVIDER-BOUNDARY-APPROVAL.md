# P5 bounded-provider prerequisite — approved implementation scope

> **Approved by the owner in this conversation, 2026-10-29:** “Approve the scoped provider extension; free tests only.” This supersedes the proposal status for the exact files below. No inference spending, migrations or production activation is approved. Current implementation/test status is in SIRONA-WORKSPACE-P5-REPORT.md.

2026-10-29. This is an amendment to the P5 Gate-A source manifest, not production activation or spend authorization.

## Observed blocker

`ProviderService.executeTurn` does not accept/forward a per-activity output-token limit. `AIService.streamTurn` also has no such parameter. Native provider requests omit output caps (Anthropic hardcodes 4096). P5 cannot enforce its selected specialist limits by trimming the completed response: that neither limits generation nor prevents charges. P5 must not claim bounded model execution until this is repaired and tested.

The P5 implementation plan explicitly excludes these P4 provider owners from its normal source slice. This proposal requests their smallest compatible extension. No existing setting, discovered model ID, credential, DTO or ordinary-chat default changes.

## Exact approved change

| File | Proposed delta |
| --- | --- |
| `backend/services/providerService.js` | Add optional internal `activityLimits` with strict max-output-token/deadline/cost bounds. Validate before reservation or messages/inference. Forward output cap and cancellation to the canonical model owner. For bounded activities, use stable caller operation identity and forbid uncontrolled fallback. Reuse reported usage and existing budget owner; do not manufacture zero cost or release uncertain reservations. Ordinary callers without this option retain behavior. |
| `backend/services/aiService.js` | Accept an optional positive bounded `maxTokens` argument, default undefined. Pass it to the existing SDK adapter and native Google/OpenAI/Anthropic/OpenAI-compatible requests via their supported output-limit fields. Preserve Google chunk.text, exact model IDs, credentials, capability routing and cancellation. |
| `backend/tests/providerActivityBounds.test.ts` (new) | Use real adapters against controlled local HTTP endpoints with dummy keys to assert exact IDs, outgoing output limits, pre-dispatch denial of invalid bounds, cancellation, reported usage and unchanged unbounded-call defaults. These are free transport/contract tests, not proof of real-provider inference. |
| P5 adapters/tests and ledgers | Consume the bounded internal port only once qualified. Record real-provider tests as UNVERIFIED until separately approved spend and successful execution. |

No changes to `AiSdkAdapter` are proposed: its existing `maxTokens` port already supports forwarding a cap. If inspection reveals another necessary protected file, report it before extending this scope.

## Tests and preservation

Run the new free HTTP/adapter contract suite, relevant P4 free controlled failures and complete safe workspace/regression checks. Paid inference remains forbidden. No DDL, migrations, working database writes, credential conversion, production flags, frontend/UI changes or P6+ work.

Before editing, preserve exact provider source hashes and bytes alongside the P5 rollback checkpoint. Rollback restores only this amendment's edits after checking for concurrent changes; do not reset unrelated files or convert graph runs to legacy dispatch.

## Approval sought

Approve only the exact provider source/test extension above so P5 can enforce its already selected limits. This does not authorize API charges, working-data mutation, migrations or production activation.
