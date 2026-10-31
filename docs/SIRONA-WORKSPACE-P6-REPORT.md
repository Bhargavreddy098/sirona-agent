# P6 implementation report — Gate A, not phase completion

2026-10-30. **P6 IS NOT COMPLETE.** Owner approved Gate A with its stated limits. Docker Desktop is now available. The exact tools-image Gate B remains pending; no candidate image has been built, selected or admitted. P5 real-provider acceptance remains UNVERIFIED under the no-charge instruction.

## Delivered functionality

- Strict tool/context contracts and exact dependency pins for the MCP SDK, portable Tree-sitter, JS/TS grammars, scoped Chokidar invalidation and the guest language-server package. Install scripts remain disabled.
- Actual bounded JS/TS/TSX WASM parsing in worker threads, artifact hashes, symbols/imports, content/line provenance, source snapshot rechecks and watcher shutdown. WASM linear memory has a separate 64 MiB hard maximum; the V8 worker heap cap alone would not provide this. SQL correctly returns `PARSER_ARTIFACT_UNQUALIFIED` until its real artifact is qualified.
- Contract-bound source packs through the existing context owner and existing PostgreSQL context bundles. Current project/principal/session, approved contract, policy, root grant and run/task fence are checked. Same-operation reuse retains the original bundle identity; changed source, revoked grants, stale authority or changed parser/index/chunking code revisions deny dispatch reuse.
- Opt-in consumption by the existing graph/task/provider activity, including pre-dispatch and post-response freshness checks. The provider test uses the real Vercel AI SDK with a controlled local upstream, not paid or real-model inference. Durable replay must not duplicate the model call.
- Canonical authenticated source-context tool invocation and durable receipts through the existing tool owner. Exact tool revision fingerprints are contract-pinned; cached invocation and historical receipt reads cannot bypass revocation. No new route or public DTO.
- Official MCP client over bounded, non-spawning byte transport; schema/manifest drift rejection, nested argument checks, repeated authority checks, output/deadline bounds and termination ownership. The protocol tests use an actual SDK server over local byte streams; they do **not** establish guest qualification.
- Fixed read-only Git and ripgrep argument builders, strict result parsing, and an LSP adapter reusing the existing stream-based client. These are not yet qualified guest integrations.
- Non-TTY Docker protocol primitive within the existing runtime. Buffered stream forwarding prevents early-byte loss; fixed MCP/LSP commands avoid host process selection. Existing P3 image admission stays unchanged, so these programs cannot be advertised as available on its Node-only image.

Production admission of source context and orchestration remains OFF by default. There is no production tool auto-registration, alternate database authority, host server fallback or UI change.

## Verification and exact limits

Evidence directory: `integration/evidence/workspace-p6/`.

| Requirement | Evidence | Current result |
| --- | --- | --- |
| Actual JS/TS/TSX parsers and scoped snapshots | `contextIsolation.test.ts`; `gate-a-tests.txt` | Gate A 14/14 checks PASS, zero failures/skips; final timestamp in `gate-a-verification.json` |
| Private, current-authority source packs | Real isolated PostgreSQL tests plus canonical HTTP journey | PASS within Gate A, including snapshot, operation replay and revocation checks |
| Real source reaches canonical SDK activity without duplicate dispatch | `p6CanonicalJourney.test.ts` controlled upstream | PASS; real-provider inference is not claimed |
| SDK schema/bounds/revocation | `mcpAuthorization.test.ts` | PASS for actual SDK byte protocol, including idle revocation and single termination; guest qualification still required |
| Existing P5 behavior | `../workspace-p5-repair/free-verification.json` | **22/22 PASS**, zero failures/skips, after initial P6 source changes |
| New guest image, SQL, Git/ripgrep/LSP/MCP runtime and crash matrix | Gate B proposal | **NOT QUALIFIED / approval pending** |
| P5 real-provider acceptance | P5 report | **UNVERIFIED; paid calls prohibited** |

Intermediate repeats hit parser and isolated-fixture timeouts; transcripts/summaries are retained as `gate-a-timeout-attempt.*` and `gate-a-fixture-timeout-attempt.*`. Diagnostics showed 24.7s in Windows fixture/root setup and 1.8s in context checks. Setup and behavior now have separate 30s caps under the existing runner limit; parser remains capped at 5s. No functional assertion, security check or production runtime limit was removed. Read the final timestamped verification artifact. The first advisory lookup timed out; its bounded retry completed with **zero known vulnerabilities** for the candidate guest lock (`guest-npm-audit.json`). This is advisory evidence, not guest qualification.

Read-only preservation evidence: `database-preservation.json` confirms working `sirona` has 21 migrations, isolated test database 23, unchanged journals, and orchestration/trusted-local-Docker/P6-context production flags OFF. Final touched-source hashes are recorded in `source-hashes.json`.

## Remaining work and approval boundary

Read `SIRONA-WORKSPACE-P6-GATE-B-APPROVAL.md`. It contains the exact candidate Dockerfile/artifact/package locks, seven review-input hashes, local build commands, admission/qualification files, tests and rollback scope. Building or selecting that image requires the separate approval already specified by the Gate A proposal.

After that approval: build and inspect the pinned candidate, qualify containment on the actual image, pin/test SQL WASM, finish guest lifecycle/canonical tool dispatch, safely export approved Git metadata, run real guest Git/ripgrep/LSP/MCP journeys and failure/recovery tests, then rerun regressions and publish final source hashes. Source/SDK tests alone cannot close these criteria.

No migrations, working-data writes, API charges, privileged operations, production activation, P7/P8, commits, pushes or deployment were performed by this slice. The current premium frontend was not edited.

## Rollback

Private pre-change copies and hashes: `.tmp/workspace-p6-20261030/`. Keep P6 flags/revisions unavailable; restore only reviewed touched source files if necessary. Retain durable evidence/unknown outcomes. No repository reset, data/schema rollback, old-run repinning or broad Docker cleanup.
