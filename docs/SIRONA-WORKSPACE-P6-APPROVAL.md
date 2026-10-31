# P6 — exact implementation scope and prerequisite decision

2026-10-30. **Gate A approved by the owner: “Approve Gate A with these limits.” P6 implementation/free qualification may use the free-qualified P5 baseline. P5 real-provider acceptance and production rollout remain blocked. Gate B exact tools-image changes, migrations, fees, working-data writes, privileged operations and P7/P8 are not approved.**

## Gate A: prerequisite decision and protected implementation

The master plan says P6 depends on P1–P5 acceptance. The current P5 report records implementation and 22 free checks, but real-provider workflow/repair/crash acceptance remains UNVERIFIED. The owner forbids API charges. AGENTS.md §31 requires stopping affected work when a prerequisite phase is not qualified; §16 requires approval before changing acceptance criteria or protected architecture.

Proposed bounded resolution: permit P6 implementation and free qualification against the existing free-qualified P5 baseline. Keep P5 real-provider acceptance explicitly UNVERIFIED, and block production activation/final integrated release until that criterion is satisfied. This is an explicit exception to implementation sequencing, not a declaration that P5 passed or permission to incur charges. If the owner does not approve this exception, P6 implementation must wait for P5 qualification.

Approve the exact protected paths and new modules below for this P6 slice only. No UI redesign, P7 implementation, working-data writes, migration application, infrastructure enablement, model charges, commits, pushes or deployment are included.

## Inspected source reality

- Existing owners: `backend/services/{contextEngineService,projectScannerService,memoryService,toolRuntimeService}.js`; `backend/src/{security,execution,workspace,windows,orchestration}/`; PostgreSQL context bundles/artifacts/tool revisions/effects; `tooling/sirona/src/lsp.ts`.
- Existing LSP client already accepts broker-owned streams and does not spawn a host server. Retain this separation.
- Existing context/scanner code uses host paths and does not establish the P6 snapshot/grant/provenance boundary. Do not qualify it merely by installing parsers.
- Existing Docker runtime supports bounded commands and a shell PTY. A PTY is not an MCP/LSP stdio transport. Add bounded non-TTY, separated protocol streams within the same guest/lease/effect owner.
- The reviewed worker Dockerfile has Node and the non-root user; it does not provision Git, ripgrep, MCP or language-server tooling. A new tools runtime requires its own exact image/artifact review and qualification, not silent replacement of the existing image.
- Docker's Linux engine was unavailable during the latest review. Actual guest acceptance cannot pass until it is available. No daemon, Windows feature or production flag has been enabled by this task.
- Root package/desktop-launcher problems found in the preceding review remain separate; do not replace those files incidentally during P6.

## Implementation manifest

| Task | Existing files allowed to change | New files | Completion evidence |
| --- | --- | --- | --- |
| P6-00 inspect/manifest | Current P6 ledger/handoff documentation only | This proposal | Actual owners/prerequisites and conflicts identified; no runtime completion claim |
| P6-01 dependencies/contracts | `backend/package.json`, `backend/package-lock.json`, `backend/tsconfig.workspace.json` only if required | `backend/src/tools/toolContracts.ts`, `backend/src/context/contextContracts.ts` | Qualified exact dependency pins, licenses, Windows/Node compatibility, strict nested Zod validation; installation alone is not integration |
| P6-02 code intelligence | `backend/services/projectScannerService.js`, `backend/src/workspace/workspaceBroker.ts` | `backend/src/context/{projectIndex,parserWorker}.ts`, `backend/src/tools/searchAdapter.ts` | Real bounded ripgrep and Tree-sitter JS/TS/SQL definitions/imports; line ranges/content/parser digests, cancellation, malformed input and unsupported syntax warnings |
| P6-03 context consumption | `backend/services/contextEngineService.js`, `backend/src/orchestration/{activityAdapter,graphRuntime}.ts` | `backend/src/context/contextAssembler.ts` | Existing context-bundle persistence reused; real authorized source reaches the canonical task/provider input; snapshot changes, revocation and project/principal/policy changes invalidate reuse |
| P6-04 Git/LSP | `tooling/sirona/src/lsp.ts`, `backend/src/windows/{dockerRuntime,dockerWorkerAdapter}.ts` | `backend/src/tools/{gitAdapter,lspAdapter,guestTransport}.ts` | Actual guest status/log/diff and language-server diagnostics/symbols; bounded non-TTY streams, revocation/cancel/restart and unknown-outcome handling |
| P6-05 MCP | `backend/services/toolRuntimeService.js`, same guest owner above | `backend/src/tools/mcpAdapter.ts` | Official SDK against an actual guest MCP server; frozen schema/manifest hashes, exact approved call, canonical durable receipts; cancelled/revoked/drifting/malicious tool results denied or contained |
| P6-06 canonical HTTP/lifecycle | `backend/routes/v1/{tools,memory}.routes.js`, `backend/foundation/admission.js` only for an exact approved existing route if currently denied; `backend/server.js` only for owned shutdown cleanup | `backend/tests/{contextIsolation,mcpAuthorization,gitWorkspace,p6CanonicalJourney}.test.ts`, `backend/scripts/verifyP6Free.mjs` | Real authenticated HTTP → canonical owner → guest → persisted receipt/context → task; ownership/CSRF/idempotency/fencing/restart tests and regression checks |
| P6-07 acceptance/handoff | Phase/technology ledgers, handoff and route ownership matrix | `docs/SIRONA-WORKSPACE-P6-REPORT.md`, evidence under `docs/integration/evidence/workspace-p6/` | Requirement→implementation→test→artifact matrix, final source hashes, unknowns and rollout gates retained |

Read-only reuse of `memoryService.js`, existing provider services, effect journal, secret broker, grants and verification owners is preferred. No new memory authority, provider router, orchestrator or lease framework. A needed change outside this manifest stops only the affected slice for an exact amendment.

### Dependencies and runtime artifacts

Review and pin the supported MCP TypeScript SDK, Tree-sitter runtime and qualified JS/TS/SQL grammar artifacts; Chokidar for scoped invalidation; and the needed guest language-server package. Prefer qualified portable parser artifacts over blanket native install-script enablement. Reuse existing TypeScript, Zod, JSON-RPC/LSP and snapshot capabilities. Exact versions, integrity hashes and licenses must be recorded before installation; unreviewed transitive scripts stay disabled.

Git and ripgrep execute only in the approved guest, using fixed argument arrays. MCP/LSP servers also run in the guest; the backend SDK speaks through broker-owned non-TTY streams. Never instantiate a host-spawning stdio transport against repository-selected commands. First scope is local guest MCP; remote servers/credentials/egress remain unavailable without a separate exact connection approval.

## Public API and persistence

Reuse existing `/api/v1/tools`, `/tools/invoke`, `/tools/receipts/:receiptId` and existing context-pack routes. Preserve their DTOs and existing tool behavior. Register distinct reviewed P6 revisions rather than modifying an approved revision in place. Discovery does not publish or authorize a tool.

No new public routes are proposed in Gate A. If existing DTOs cannot express exact pinned MCP/context/Git/LSP inputs safely, present the concrete additive DTO/route change for approval before implementing it. Do not create a wildcard proxy or raw command endpoint.

Reuse PostgreSQL context bundles, artifacts, tools/tool revisions, invocations, effects, receipts and run/task metadata. Inspect actual columns before deciding whether JSON metadata is sufficient. No migration is presumed necessary. A required schema change may be authored for review only; its exact checksum and target require separate approval before application. Runtime must not run DDL or auto-seed production tools. Test fixture registration uses only the guarded isolated database, never the working database.

## Gate B: exact guest artifacts and qualification

Before building or selecting a changed worker image, present its exact Dockerfile/artifact manifest, dependency lock/integrities, changes to image admission/qualification and proposed commands. Approve that exact runtime change separately. Candidate file: `tooling/sirona/docker/tools-worker.Dockerfile`; any changes to `backend/src/workspace/homeProfile.ts` or existing image admission also belong to Gate B, not implicit Gate A permission.

Keep the existing P3 default image and old qualification intact. Do not silently repin existing runs, replace the default image, relax worker limits or treat the Node-only image as a tools-qualified image. Requalify actual files/network/secrets/resources/termination for the selected tools runtime. No privileged Windows install, service elevation, Docker prune, WSL shutdown or host fallback.

## Required security and functional checks

1. Resolve the registered root with current session/workspace/project/run/task identity, approval and fencing. A directory path is not authority. Cross-project/principal results, traversal, junction/symlink escapes, expired grants and changed snapshots must fail closed.
2. Version parser/grammar/query/chunker/config/source digests. Watcher notifications are hints; recheck source bytes before use. Bound files, bytes, matches, parse time/memory and context tokens. Exclude credential/config-secret files and unapproved generated/dependency directories. No new embeddings or database is needed for lexical/structural scope.
3. Git is status/log/diff only. No commits, resets, checkout, fetch, push or deployment. Keep host Git configuration, hooks, credential helpers, external diff/textconv, object alternates and unsafe worktree references out of the guest contract. Copy only explicitly reviewed bounded repository metadata; the existing source snapshot's `.git` exclusion cannot be bypassed by a blanket directory mount.
4. MCP validates discovery and call schemas in trusted code, freezes definition hashes/revisions, caps messages/results/time, and declines server-initiated sampling/elicitation or other unapproved capabilities. Tool output is untrusted data and cannot authorize another action.
5. Reuse existing durable effect identity, leases, cancellation and receipts. A lost response/worker never permits blind resend. Kill the actual owning Node process during tests; reconcile the owned guest before any retry. No production Map fallback.
6. Real tests must run the installed SDK, parser/grammars, Git/ripgrep/language server and actual guest MCP server. Controlled local provider transport can test context delivery without claiming real inference. Any criterion requiring real-provider reasoning remains UNVERIFIED while API charges are forbidden.
7. All test writes assert `current_database() = 'sirona_workspace_p0_test_20261028'`. Working `sirona`, its migration journal, existing user data, UI and default-off execution flags remain unchanged. No migration runner is invoked by the P6 test command.

## Acceptance, rollback and sequencing

Gate A decision → dependency/contract qualification → Gate B exact artifact review → real search/index/invalidation → safe Git/LSP → frozen MCP calls → task context consumption → failure/crash matrix → regressions → source-bound report. Fix failures; do not skip or relax required tests.

Before source changes, checkpoint only the touched files and their hashes under a private `.tmp/workspace-p6-*` directory. Rollback disables admission of new P6 revisions, cancels/drains only owned guests and restores reviewed code files selectively. Retain checkpoints/receipts and unknown outcomes; do not reset the repository, delete user data, revert applied migrations or resume old runs through a different engine.

P6 is not complete until actual end-to-end acceptance passes and the owner accepts the scoped evidence. Production activation, P7/P8, migrations, paid tests and privileged changes remain separately gated.

## Primary technical references

- [Official MCP TypeScript SDK client documentation](https://ts.sdk.modelcontextprotocol.io/client) — SDK/transport boundary; host spawning is not guest isolation.
- [Official MCP stdio transport reference](https://ts.sdk.modelcontextprotocol.io/v2/api/%40modelcontextprotocol/client/client/stdio.html) — stdio transport starts a process; select a guest-owned transport instead.
- [Tree-sitter WASM binding](https://github.com/tree-sitter/tree-sitter/blob/master/lib/binding_web/README.md) — supported runtime and grammar loading; qualify exact artifacts.
- [Git command controls](https://git-scm.com/docs/git) and [diff controls](https://git-scm.com/docs/diff-options) — optional locks and external diff/text conversion controls, supplemented by scoped configuration/metadata isolation.
