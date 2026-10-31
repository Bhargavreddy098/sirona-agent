# Sirona continuation guide for Antigravity and OpenCode

Updated 2026-10-29. Repository: `C:\Users\bharg\OneDrive\Desktop\personal -agent`.

This is a portable operating guide and handoff, not an implementation approval. Paste the starter prompt below into either tool and explicitly direct it to read the repository files. Do not assume a tool automatically loads `AGENTS.md` or that another tool's conversation history is available.

## 1. Current assignment and the next permission boundary

**The owner's latest decision is “Stop after P3.”** The current task authorizes this documentation guide only. Do not start P4, install its SDKs, change provider services or activate execution because this guide describes later phases. The owner must explicitly approve the concrete next scope in a future instruction.

| Phase | Current recorded state | Meaning for the next agent |
| --- | --- | --- |
| P0 | Scoped verified | Preserve baseline, source/data ownership and rollback records |
| P1 | Scoped verified | Reuse typed transaction adapter, validation, effects, fencing and ordered events |
| P2 | Scoped verified | Preserve connected Windows DPAPI credential broker and native provider behavior |
| P3 | Trusted-local Home profile scoped verified | Reuse real Docker command/PTY/patch/recovery services; no hostile-code/VM or Hyper-V qualification claim |
| P4 | Not started; owner stopped after P3 | Inspect and propose only until separately approved |
| P5–P8 | Future, separately gated | Complete preceding phase acceptance before dependent implementation |

Latest recorded P3 verification: 60 workspace tests, 72 existing chat/execution regressions, 46 lifecycle tests, frontend checks/build and five SSE tests passed. These are dated results, not proof that a changed checkout still passes. Working `sirona` had migrations 001–021; the isolated `sirona_workspace_p0_test_20261028` had 001–023. Production profile activation was off, with zero remaining qualified-image containers/active Home workers. Reinspect current reality before relying on these observations.

## 2. Read these sources in order

1. [Root constitution](../AGENTS.md): authority, preservation, STOP, security and approval rules.
2. [Current handoff](SIRONA-AGENT-HANDOFF.md): current status and navigation.
3. [P0–P8 implementation contract](SIRONA-WORKSPACE-PLAN.md): phase sequence and acceptance requirements.
4. [Execution ledger](SIRONA-WORKSPACE-LEDGER.md): dated approvals, failures, corrections and progress.
5. [Corrected P3 report](SIRONA-WORKSPACE-P3-REPORT.md) and [source/test/lineage evidence](integration/evidence/workspace-p3-docker/current-verification.json).
6. [Required technology ledger](SIRONA-WORKSPACE-TECHNOLOGY-LEDGER.md): integration status, not package presence.
7. [Next P4 approval proposal](SIRONA-WORKSPACE-P4-APPROVAL.md): proposed files, exclusions and acceptance; not yet approved.
8. [UI preservation contract](../sironadocs/frontend/UI-FREEZE-CONTRACT.md) and [route/surface ownership](../sironadocs/integration/ROUTE-SURFACE-MATRIX.md).
9. Relevant normative backend specifications before touching that subsystem: [structure](../sironadocs/backend/03-BACKEND-STRUCTURE.md), [database](../sironadocs/backend/04-DATABASE.md), [API](../sironadocs/backend/05-API-CONTRACTS.md), [planning/contracts](../sironadocs/backend/06-INTELLIGENCE-AND-CONTRACTS.md), [recovery](../sironadocs/backend/07-ORCHESTRATION-AND-RECOVERY.md), [security](../sironadocs/backend/08-SECURITY-AND-RUNTIME.md), [providers/memory](../sironadocs/backend/09-PROVIDERS-AND-MEMORY.md), [verification/operations](../sironadocs/backend/10-VERIFICATION-AND-OPERATIONS.md).
10. Actual source, package scripts, tests, scoped local instructions and current changes.

Current owner approvals override historical status prose only within their exact scope. Source establishes what exists; a source file does not authorize using it. Never resolve a material architecture/security conflict merely by picking the newest-looking document.

### Documents that are historical, not executable assignments

- `docs/archive/pre-workspace-2026-10-28/` contains older status and alternate implementation directions.
- Earlier entries inside the execution ledger are chronological history. The final corrected P3 acceptance supersedes the earlier 45-test completion table and old image claim.
- `sironadocs/evidence/workspace-p3-docker/superseded-p3-report.md` and the old `verification.json` must not be cited as current acceptance.
- `gateway-final-tests.txt` was corrupted by PowerShell stream interpretation; the stopped sandbox lifecycle run is not passing evidence. Use the clean corrected transcripts identified in the report.
- Original Hyper-V/Windows-guest details in the plan describe a different profile. This Windows Home machine uses the explicitly approved trusted-local Docker + WSL2 profile.
- Proposed future filenames and SQL numbers in a roadmap are proposals, not evidence that they exist or that a migration is approved.

Do not move or delete normative documents, source, backups or unfamiliar folders as “cleanup.” Link current entrypoints and label superseded records. A separate deletion needs an identified target, reference/data checks and actual owner authorization.

## 3. Preserve this architecture and reuse map

| Concern | Reuse / inspect first | Do not replace it with |
| --- | --- | --- |
| Active desktop/frontend | `frontend/sirona-next`, its existing Electron main/preload, compact light React shell | A rebuilt shell, dark redesign, retired `frontend/sirona`, old Python/UI trees |
| API lifecycle/security | `backend/app.js`, `backend/foundation/`, existing identity/CSRF/Host/Origin and `/api/v1` routes | An alternate Express server, wildcard worker proxy or renderer security bypass |
| PostgreSQL ownership | `backend/config/db.js`, `backend/src/db/`, existing migrations | A second pool/transaction authority, SQLite, new run/session database or ORM takeover |
| Provider integration | `backend/services/{providerService,aiService,conversationTurnCoordinator}.js` | A second discovery/router/accounting stack or direct renderer provider calls |
| Credentials | `backend/src/providers/credentialResolver.ts`, Electron DPAPI broker | Plaintext fallback, machine-name-derived encryption, browser storage or credential-read API |
| Execution authority | `backend/src/security/executionPolicy.ts`, existing governance/approvals/grants, `backend/src/execution/` | Model prompts, selected directory metadata, UI toggles or agent roles as permission |
| Docker dispatch | `backend/src/windows/dockerRuntime.ts`, `dockerWorkerAdapter.ts` | Host `spawn()` execution, raw `wsl.exe` commands, daemon socket/bind mounts or unpinned images |
| Files and patching | `backend/src/workspace/{workspaceBroker,homeProfile,nativePatch,patchService}.ts` | Direct project writes from UI/tools or an unjournaled overwrite helper |
| Terminal | `backend/src/windows/{terminalService,canonicalTerminal}.ts`, `backend/services/terminalGateway.js` | Host Alacritty as a sandbox, host node-pty fallback, fabricated/replayed terminal output |
| Electron terminal transport | `frontend/sirona-next/electron/terminalProxy.cjs`, existing main wiring | A generic TCP/WebSocket proxy or weakened CSP/Origin checks |
| Browser transport | `frontend/sirona-next/src/api/{client,workspace}.ts` | Component-level fetch/auth/CSRF shortcuts or duplicate state authority |

New feature code uses TypeScript. Preserve useful existing JavaScript behind ports; migrate only touched behavior with tests. Keep current package-local npm/lockfiles and engine/install-script protections. The larger proposed stack does not authorize a package-manager/monorepo rewrite.

## 4. Use one writer and an independent review pass

Recommended manual workflow: assign Antigravity one approved implementation slice, then ask OpenCode to review that exact source/evidence without editing. You can reverse these roles. This is a workflow assignment, not a claim that either tool is inherently better.

Do not let both tools edit the same checkout or run shared database/Docker suites simultaneously. A reviewer can read while the writer works, but its final findings must bind a fixed source revision/hash set. Separate checkouts need explicit coordination; they still share the database, Docker daemon and machine capacity.

Before switching tools, finish or stop owned test processes, save the current ledger entry and record changed paths, evidence paths, unresolved effects and next permitted action. Do not require an automatic commit; never stage unrelated changes, push, or clean the repository to make a handoff look tidy.

An independent model review is useful but does not replace independent runtime verification. A producer's statement, screenshot, green compilation or agreeing second model cannot certify the artifact.

## 5. The repeatable execution cycle

### A. Inspect before implementation

Run read-only inventory from the repository root, using package-local scripts:

```powershell
Get-Location
git status --short
Get-Content AGENTS.md
Get-Content docs/SIRONA-AGENT-HANDOFF.md
Get-Content docs/SIRONA-WORKSPACE-LEDGER.md
Get-Content backend/package.json
Get-Content frontend/sirona-next/package.json
```

Inspect relevant services and their callers/tests with `rg`. Do not print `.env`, vault contents, raw session cookies or private rollback archives. Missing local tools/skills must be reported honestly; do not claim a skill or browser was used if unavailable.

### B. Present an exact slice before protected work

Record: task ID; prerequisite evidence; current owner authorization; exact existing/new files; routes/DTOs; dependencies and versions to qualify; SQL and target database; privilege/external-effect requirements; security controls; test cases; rollback; explicit exclusions. Check the source tree before inventing a filename or migration number.

The next agent may prepare this proposal under the current stop decision. It must wait for a new owner approval before implementing P4. A future approval covers only its stated slice; it does not grant the whole remaining roadmap.

### C. Implement a small complete path

Complete one real workflow, including negative/cancel/recovery paths, rather than installing all packages first. Reuse existing ports and persistence. Keep parsing/HTTP separate from domain behavior. Validate server-side, preserve exact provider IDs and canonical scope, propagate cancellation and bind effects to permanent operation keys.

### D. Verify the exact final source

Compile before tests. Do not edit/rebuild runtime files while a qualification suite is running: source/image digest changes should invalidate old evidence. Run tests serially against shared database/Docker resources. Capture exit codes, stdout/stderr, actual target, source/artifact hashes and environment; redact secrets rather than deleting a failing result.

If a sandbox denies loopback, Docker or PostgreSQL, distinguish an environment failure from an application failure. Obtain the appropriate tool/OS permission without disabling product security. A timeout, skipped test, incomplete transcript or unknown outcome is not a pass.

### E. Close the slice and stop at the next gate

Review the diff and proof against every criterion. Fix scoped failures; propose approval for protected out-of-scope repairs. Update the report, execution ledger, technology ledger, route matrix and current handoff. Report which owner effects remain unapproved. Do not automatically start the next phase.

## 6. P4: Vercel AI SDK implementation sequence

**Permission:** currently not approved. Use [the P4 proposal](SIRONA-WORKSPACE-P4-APPROVAL.md) for the exact next approval.

1. Map native adapter request/response/stream/cancellation/usage behavior and authenticated model discovery. Record capability and error contracts before changing a provider.
2. Review/pin compatible maintained `ai` and `@ai-sdk/google` dependencies with scripts disabled. Consult current official vendor documentation during implementation; this guide does not freeze future SDK APIs.
3. Add `backend/src/providers/modelAdapter.ts` and `aiSdkAdapter.ts` behind the existing service boundary. Start with one configured Google connection, with the native adapter preserved.
4. Choose the adapter before dispatch. Unsupported capability can keep the native adapter; no fallback after output/effects. Keep credentials in the existing resolver and preserve model IDs byte-for-byte.
5. Preserve Google `chunk.text`, native chat identity, SSE framing, turn lease release, cancellation, model-call usage/cost reconciliation and revoked-credential errors.
6. Add `backend/tests/providerParity.test.ts`. Compare semantic contracts rather than identical generated wording.
7. Demonstrate real configured-provider inference through the SDK, streamed output, exact ID, usage and actual cancellation. Clearly separate controlled-upstream failure tests from real-provider evidence.
8. Verify old providers/chat/credentials still work, produce the P4 report, and stop for the P5 approval gate. No schema/API redesign or production SDK activation is included.

## 7. P5: LangGraph over existing durable services

**Dependencies:** accepted P4 plus existing P1/P3; separate protected/API/dependency approval and separate approval for any SQL application.

Proposed source: existing `workflowOrchestratorService`, `agentWorkerService`, `agentExecutionEngine`, `planningContractService`, `verificationService`; new `backend/src/orchestration/{workspaceGraph,delegationService,checkpointAdapter}.ts`; focused recovery/delegation tests. Reconfirm actual filenames and consumers.

Before coding, resolve a recorded plan conflict: root AGENTS section 12 allows at most three parallel specialists, two critique rounds and one delegation level unless reviewed policy changes them; the P5 draft mentions four model agents and depth three. Clarify whether four includes the parent and obtain an explicit decision for any different depth/limit. **Do not silently expand limits.** Stop affected delegation-limit implementation until that material conflict is resolved; other inspection/proposal work can continue.

Implement progressively:

1. Persist graph version and stable run/thread binding through the existing PostgreSQL checkpoint/effect services. Keep existing run/task/agent records authoritative; no competing run store or in-memory recovery fallback.
2. Reuse immutable goal → milestones → DAG → tasks and approved contract revisions. Pin policy, snapshot and approved revisions to a run.
3. Add bounded agent creation/delegation with purpose, parent, scoped context/capabilities, budget, deadline, output schema and termination condition. Models propose; trusted code authorizes.
4. Implement bounded fanout/join and independent review identities. Parallel reasoning does not authorize parallel guest execution: this Home profile admits one executing worker globally.
5. Pause for exact approvals; revalidate session, policy, grants, fencing, base snapshot and approval on resume. Material revisions need reapproval/successor semantics.
6. Kill/restart at dispatch/receipt/checkpoint boundaries. Unknown effects reconcile before retry; do not promise exactly-once arbitrary external execution.
7. Verify real-model delegation, approved parallel limits, reject/revoke/expiry, budget ceilings, conflicting patches, bounded repair and clean independent verification.

The proposed `025_langgraph_delegation.sql` is not a reserved or approved migration. Reinspect actual schema numbering, justify necessity, author additive SQL if approved, and request its exact application target separately. No migrations to working `sirona` are implied.

## 8. P6: MCP, Tree-sitter, ripgrep, Git and context

**Dependencies:** accepted P1–P5; separate protected/dependency/tool-registration approval.

Inspect existing `contextEngineService`, `projectScannerService`, `memoryService`, `toolRuntimeService`, tools/memory routes and guest LSP. Proposed additions are `backend/src/tools/{gitAdapter,mcpAdapter}.ts`, `backend/src/context/{contextAssembler,projectIndex}.ts` and focused isolation/MCP/Git tests.

1. Implement bounded real ripgrep searches and Tree-sitter definitions/imports with pinned parser revisions. Restrict paths/outputs and exclude secret/control-plane files.
2. Bind indexes/context to repository/content digests, provenance and token budgets. Invalidate on changes. A real agent must use the retrieved source; a demo search result is insufficient.
3. Keep Git V1 local and read-only: status/log/diff. Disable hooks, external diff/textconv and unsafe configuration; deny implicit network. Do not enable commits, pushes or deployment.
4. Integrate the MCP TypeScript SDK with the canonical tool registry. Discovery is untrusted metadata, never permission. Validate nested schemas, risk, grants, deadlines, cancellation and immutable receipts.
5. Launch MCP stdio and LSP processes only through the approved guest boundary. The default network policy is none; a networked MCP server or dependency fetch needs a separately approved egress design, not a Docker networking shortcut.
6. Verify a real MCP tool flow, revoke/cancel/schema-drift/malicious-output cases, actual parsed/search context, cross-project denial, index invalidation and read-only Git results.

Reuse PostgreSQL/memory services. LangChain, Mastra, Redis and BullMQ remain optional; do not add a second orchestrator or new durable authority.

## 9. P7: workspace features inside the existing light UI

**Dependencies:** accepted P1–P6; explicit UI-feature, dependency and affected-file approval. Existing shell/style preservation remains mandatory.

Inspect `frontend/sirona-next/src/app/{App.tsx,useWorkspace.ts}`, existing Projects/settings/composer, API schemas, styles and Electron security. Proposed workspace files live under `src/features/workspace/`; confirm real layout before creating them.

| Increment | Real user workflow required |
| --- | --- |
| FileExplorer + Monaco | Open a registered project, inspect actual files, edit/draft, review exact diff, approve/apply through broker, handle concurrent edit, reopen persisted bytes |
| xterm.js | Obtain scoped ticket, attach through exact Electron channel, submit approved input, resize/interrupt, distinguish input submission from command completion, close real process tree |
| AgentMonitor + React Flow | Show actual persisted tasks/agents/dependencies; replay/reconnect reflects canonical events, no invented running/completed nodes |
| PlanningPanel + ToolApprovals | Show immutable revisions, consequences and all four modes; approval binds exact action/revision, rejection/revocation changes actual backend admission |
| Zustand + TanStack Query | Zustand owns scoped ephemeral tabs/drafts/layout; Query owns new server cache/invalidation. Demonstrate save/run/reconnect with no cross-project stale state |
| GitDiff + Settings | Show real scoped read-only Git state, exact models/native identity and truthful credential/runtime capability states |

Use the existing typed client, including P3 root/file/patch/terminal/recovery contracts. Add missing transport behavior once in that owner; do not scatter fetch/auth/CSRF implementations through components. No session/provider secrets in renderer persistence.

Lazy-load expensive editor/graph surfaces. Reuse current tokens/primitives/icons and compact light typography. Use installed design/frontend skills if available, inspect their actual instructions, and preserve keyboard/focus/accessibility/responsiveness/reduced-motion behavior. BoardUI Pro source is not licensed by a recreation request; continue custom Sirona equivalents unless the owner supplies appropriate authorization.

Run actual Electron/Playwright project open → search → edit → diff → approved save → terminal → agent/review → verify → restart/reconnect journeys. Record truthful loading/empty/error/running/success states. Backend test seeds and screenshots are not proof that the real UI is connected. A crashed terminal cannot be presented as a resumed PTY; P3 recovery stops/reconciles it.

Execution modes must be enforced by the trusted policy owner, not just displayed:

| Product mode | Required boundary |
| --- | --- |
| Plan Only | Reason/plan/read only within existing grants; no project mutation or command dispatch |
| Ask Before Every Change | Exact approval before each proposed mutating action; rejection/revocation actually blocks dispatch |
| Autonomous Coding | Only reviewed contract/policy capabilities and budgets; sensitive effects retain separate approval |
| Full Autonomous Build | Bounded local build/test/review/repair inside the approved root/guest; no implicit commits, pushes or deployment |

Preserve existing wire contracts and explicitly map any legacy mode names. Current P3 terminal input still requires exact per-input approval. A mode label does not waive that requirement; any change needs its reviewed policy/approval design and negative tests. Standalone chat does not acquire project tool authority merely because the user selects a folder or model.

## 10. P8: release and recovery qualification

**Dependencies:** all preceding phases accepted and every required technology exercised in a real workflow. Explicit release/recovery/privilege/image-distribution approvals remain necessary.

1. Integrate Pino/OpenTelemetry IDs for API/run/task/agent/effect/provider/guest without source, prompts, keys or raw tool output in default logs. Remote exporters are opt-in and cannot become workflow authority.
2. Obtain an exact approved recovery-test database target, create a real protected backup and restore into that separate target. Measure row/hash integrity, RTO/RPO and application usability. Never restore an old dump over newer working data automatically.
3. Package with electron-builder, reviewed image distribution, helper/application signing as appropriate, native dependencies and notices. Exclude `.env`, operator credentials and private evidence.
4. Test clean supported Windows install, upgrade, uninstall, offline/dependency failures, owned orphan cleanup, cancellation and recovery.
5. Requalify all ten technologies against the packaged artifact. Linux Docker support on Windows Home does not become Hyper-V/hostile-code isolation or native Windows guest builds through packaging.
6. Request exact production migration/activation approval only after a concrete rollout/backup/compatibility/recovery plan is reviewable. Application rollout and a database migration are distinct effects.

## 11. Verification commands and database guard rules

Read current scripts before executing them. From the repository root, the following build/check commands do not migrate databases:

```powershell
npm.cmd --prefix backend run build:workspace
npm.cmd --prefix backend run check:workspace
node backend/scripts/checkSyntax.js
npm.cmd --prefix frontend/sirona-next run check
npm.cmd --prefix frontend/sirona-next run lint
npm.cmd --prefix frontend/sirona-next test
npm.cmd --prefix frontend/sirona-next run build
```

Do not infer success from the last command's exit code when running a PowerShell batch. Inspect each exit code/output or run commands individually. Full legacy static/module scans have recorded pre-existing failures; do not disable rules or relabel them as new green results.

For DB/worker integration:

- The approved existing test target is exactly `sirona_workspace_p0_test_20261028`. Its current migration lineage must be inspected; new SQL needs separate target-specific approval.
- Reuse the guarded fixture in `backend/tests/typedDatabaseBoundary.test.ts`. It refuses unsafe initial `DATABASE_URL`, loads configuration inside the guard, rewrites the isolated URL and asserts `current_database()` before mutation. New tests must not initialize an unguarded independent pool.
- Setting only `PGDATABASE` is insufficient if a loader later reads a working `DATABASE_URL` from `.env`. Inspect precedence and assert the connected database before writes; never print the URL/password.
- `SIRONA_TRUSTED_LOCAL_DOCKER_ENABLED=true` belongs only inside the explicitly guarded qualification fixture until production rollout is approved. Do not set it persistently in the working `.env` or Windows environment.
- Use only test-owned directories, records and exact persisted Docker bindings. No global Docker prune, WSL shutdown, whole-tree Git reset/clean or database recreation.
- Run suites serially. Do not change runtime code during a run. Use direct Node stream capture and explicit timeout/exit-code recording to avoid PowerShell CLIXML corrupting transcripts.
- The historical runners under `integration/evidence/workspace-p1/` and `integration/evidence/workspace-p3-docker/` are useful guarded examples, but they write to accepted evidence paths. Do not run them unchanged and overwrite baseline proof. Create a current-phase runner/output directory, preserving their guards and correctly resolving paths at its new location.
- Mocks/controlled upstreams may test failure handling. Label them. They do not prove real provider inference, guest containment, native OS credential protection or desktop integration.

Never blindly run `backend npm test`, `npm run migrate`, seed/reset scripts or an arbitrary test glob with the working environment. First inspect every selected suite's setup/cleanup and database target. A reviewer should verify the guard before authorizing effectful tests.

## 12. Required evidence and task ledger format

Use a fresh `docs/integration/evidence/workspace-pN/` location per phase and a distinguishable run identity. Do not overwrite accepted earlier transcripts. Keep sensitive rollback archives ignored and local.

Each task entry must contain:

```text
Task ID / phase:
Exact owner approval and exclusions:
Dependencies and their verified evidence:
Existing/new files and interfaces reused:
API/DTO/dependency changes:
SQL authoring approval / application target approval (separate):
Security, budgets, lease/cancel/recovery behavior:
Source/artifact hashes and runtime versions:
Tests: command, environment/DB, exit code, counts, transcript:
Required criteria: pass / fail / unknown, with evidence:
Failure fixed or unresolved blocker:
Rollback checkpoint and permitted recovery action:
Next action and next approval gate:
Status: planned / approved / implementing / verifying / accepted / blocked / failed
```

Acceptance packet: requirement-to-test matrix, exact source hashes, test summaries and full safe transcripts, real E2E records, negative/security/recovery results, leftover-resource check, migration lineage, known limitations and rollback. “It builds,” “the UI looks right,” package presence, mocks or model-generated success text cannot close a phase.

## 13. Copy/paste starter prompt for either tool

```text
Work in C:\Users\bharg\OneDrive\Desktop\personal -agent.

Read AGENTS.md and docs/SIRONA-EXTERNAL-AGENT-GUIDE.md, then the current
handoff, P0-P8 plan, execution/technology ledgers, corrected P3 report, current
verification manifest and P4 approval proposal. Inspect actual source and dirty work.

The owner's current instruction is STOP AFTER P3. This message requests a read-only
continuation audit and next-scope proposal; it does not approve P4 implementation.
Do not install dependencies, edit protected services, migrate data, activate the
Docker profile, start P5+, redesign the UI, commit/push or delete files.

Report current source/evidence agreement, relevant interfaces to reuse, discrepancies,
the exact next files/dependencies/routes/SQL/privileges/tests/rollback, and the owner
approval needed. Respect Stage 17 and the trusted-local Home boundary. Preserve
frontend/sirona-next, native providers, DPAPI, PostgreSQL data and /api/v1 contracts.
Do not treat older P3 completion tables or archived plans as current instructions.
Do not silently resolve the P5 agent-count/depth conflict.
```

## 14. Owner's future phase-approval template

This is an example for the owner to review and explicitly send later; its presence in this guide grants nothing:

```text
I approve only Phase [N], tasks [IDs], under [exact scope document/version].
Allowed files/dependencies/API changes: [list].
SQL authoring: [none or exact scope]. SQL application: [none or exact file + database].
Privileged/external operations: [none or exact reviewed actions].
Preserve existing working functionality, APIs, PostgreSQL data, UI and security.
Require real integration/recovery evidence and maintain the ledger.
Do not activate production or start the next phase without separate approval.
Stop and report a material conflict, unknown effect or out-of-scope protected repair.
```

## 15. Copy/paste independent review prompt

```text
Review Phase [N] tasks [IDs] in this checkout. Do not edit or repair anything.
Read AGENTS.md, the approved scope and the implementation/evidence packet.
Verify authority, source hashes, real service wiring, DB guards, leases/fencing,
exact approvals, duplicate-delivery recovery, cancellation, secret handling and UI
preservation. Inspect actual callers and production composition, not only tests.
Distinguish real integrations from mocks, canned responses and disconnected wrappers.
Identify missing/stale/skipped proof and unsafe compatibility changes.
Return requirement -> implementation -> evidence -> pass/fail/unknown, with concrete
file references and severity. State whether each phase criterion is satisfied.
Do not mark completion solely because tests are green. Any effectful test needs the
existing exact test authorization/target; do not mutate working sirona.
```

## 16. Handoff message at the end of every session

```text
Phase/task and status:
Owner approval used / next unapproved gate:
Changed paths and fixed source hash set:
Real behavior implemented and demonstrated:
Tests and evidence paths (including failures/skips):
Working database/activation state and leftover owned resources:
Unknown effects / conflicts / limitations:
Rollback checkpoint:
Next single permitted action:
```

If an agent cannot establish approval or required evidence, it must say so and stop the affected work. Another agent can continue from this packet without rebuilding completed phases, inventing authority or hiding an unfinished integration.
