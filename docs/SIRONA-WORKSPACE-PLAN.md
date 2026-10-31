# Sirona Windows Coding Workspace — approved target and implementation contract

> Latest owner approval, 2026-10-29: **"Approve a trusted-local-project Docker profile"**. The Windows Home P3 target is now explicitly limited to trusted local projects using Docker + WSL2. This supersedes the earlier statement that a reduced Home threat model was unapproved; it does not qualify hostile-code/VM isolation or authorize production migrations, privileged operations, host command fallback or later phases. The amended Home P3 scope now passes its scoped acceptance gates; production activation/release and hostile-code/Hyper-V qualification are not claimed. Read the current P3 Docker plan and latest ledger; older Hyper-V rows describe the original profile only.

> Earlier runtime-selection checkpoint, superseded by the explicit trusted-local Home approval above: Docker Desktop + WSL2 replaced the original Hyper-V-only Home target. Current scoped acceptance is in [the corrected P3 report](SIRONA-WORKSPACE-P3-REPORT.md). Hyper-V-specific details below describe the original profile; production activation and hostile-code/VM qualification remain unavailable through this amendment.

> Owner cleanup update, 2026-10-28: unused `frontend/sirona` was explicitly removed after source backup and tooling-reference repairs. `frontend/sirona-next` is the sole active frontend. Older instructions to retain the scaffold are superseded for that folder only; all other preservation/security/approval rules remain.

Updated 2026-10-28. Owner approved the architecture and Phase 0 implementation only.
P1 source/dependency/SQL authoring is now separately approved and scoped verified; migration 022 was approved/applied only to the isolated DB. P2 completion was explicitly authorized and scoped verified on 2026-10-29; production rollout and P3–P8 remain gated.
The latest owner instruction makes all ten technologies below mandatory final-production
integrations. A package installation, adapter skeleton, fixture, or isolated unit test
does not complete an integration. Later phases remain gated, not implicitly authorized.

## Authority and preservation

- Preserve Node/Express, PostgreSQL, existing APIs/services and directory layout.
- Extend `frontend/sirona-next`, the explicitly selected compact light application.
  The owner explicitly retired `frontend/sirona` on 2026-10-28; do not recreate it. Reconcile historical ownership documents rather
  than replacing a shell, changing icons, or introducing a second design system.
- Existing `/api/v1` contracts, standalone `project_id=NULL` sessions, project
  sessions, provider discovery, exact model IDs, native chat responses, streaming,
  cancellation, retry, usage, ownership, CSRF and leases remain regression gates.
- Existing Stage 17 STOP and protected Stage 07–17 services remain in force.
  Each protected service, migration, privilege, dependency and architectural change
  needs a bounded approval before editing/applying it. Do not edit AGENTS.md to
  manufacture authority. New findings expand the approval request, not the edit scope.
- No automatic commits, pushes, deployment, remote workers or SaaS scope in V1.
- Do not relocate packages or adopt pnpm/Turborepo in this sequence. Keep package-local
  npm scripts and locks. Optional LangChain, Mastra, Redis and BullMQ are not installed
  without a demonstrated separately approved need; no duplicate orchestration engine.
- Use TypeScript for new functionality. Existing JS migrates gradually as domains
  are assigned; do not block features on a rewrite or replace working queries.

## Actual baseline and limits

Evidence: [Phase 0 report](SIRONA-WORKSPACE-P0-REPORT.md), [ledger](SIRONA-WORKSPACE-LEDGER.md),
[source manifest](integration/evidence/workspace-p0/source-baseline.json),
[database lineage](integration/evidence/workspace-p0/database-baseline.json).

Read-only PostgreSQL inspection: 76 application tables; migrations 001–021 applied,
all 21 recorded SHA-256 checksums match current SQL files. Working chat/provider
flows have prior real Google/Electron evidence. Current P0 UI captures are explicitly
synthetic layout/interaction evidence, not proof of successful model inference.

Partial/insecure execution foundations requiring approved remediation:
WindowsSandboxBackend.execute returns NOT_IMPLEMENTED; host spawn restrictions
are not a guest boundary; effects lack a replay key; parallel event writers use
MAX(sequence)+1; task completion needs lease/epoch fencing; the run SSE route replays
but does not tail new events. Credential encryption retains predictable-key and
legacy plaintext fallbacks. ReleaseRecoveryService records simulated sizes and
restore outcomes; it is not a tested physical backup/restore implementation.

Hyper-V preflight: Windows 11 Home Single Language, SKU 100, build 26300; approximately
8 GiB RAM; vmms absent. HypervisorPresent=true and false CPU capability flags under
the current hypervisor are not a complete firmware diagnosis. The supported managed
Hyper-V host requirement is NOT MET. No feature/service was changed. P3 admission
must remain blocked until the owner supplies an approved supported host/edition,
sufficient capacity and a licensed guest image. Do not substitute unrestricted host
execution, change the selected isolation technology, or use unsupported enablement.

## Mandatory technology acceptance matrix

| ID / required technology | Phase and integration owner | Dependencies | Functional acceptance and completion boundary |
| --- | --- | --- | --- |
| TECH-01 LangGraph.js | P5 graph/delegation/checkpoint adapters over canonical services | P1 durable effects, P3 guest, P4 models | Real-provider project run dynamically delegates, joins parallel work, pauses for approval, survives restart and reaches independent verification without repeating effects. Retest in P8. |
| TECH-02 Vercel AI SDK | P4 provider adapter behind ProviderService/AIService | P2 credentials; preserve registry and adapter compatibility | A real configured provider streams through the SDK with exact selected ID, cancellation and recorded usage; failed/unsupported cases preserve existing behavior. No migration of an adapter without parity evidence. |
| TECH-03 Windows isolation (owner-amended Home profile) | P3 Docker + WSL2 trusted-local profile; original Hyper-V profile remains unavailable on Home | P1 fencing/effects, P2 secret protection, explicit Home threat-model approval | Home runtime/HTTP/PTY/patch/recovery/kernel resource checks pass in the corrected P3 report. No hostile-code/VM or Hyper-V qualification claim. Working activation remains separately gated; P8 release/clean-host retest required. |
| TECH-04 Monaco Editor | P7 editor/diff panes within existing project view | P3 root/file/revision APIs; P6 diagnostics | Open a real file, edit, save through authorized revision-checked broker, handle concurrent changes and reopen persisted bytes. Diff displays actual changed content. |
| TECH-05 xterm.js | P7 terminal UI over scoped P3 Docker Engine PTY and authenticated channel | Accepted Home profile, ownership/grants/approvals and exact WS Origin | P3 real transport/resize/interrupt/close passes; xterm UI remains planned. P7 must demonstrate actual approved input/output/close/reconnect without host fallback or simulated state. |
| TECH-06 React Flow | P7 plan/agent visualization | P1 ordered live events, P5 durable tasks/delegation | Actual run events update graph status, dependencies and agents; approval/reconnect/restart reproduce canonical state; graph cannot grant permissions or invent progress. |
| TECH-07 Zustand + TanStack Query | P7 workspace ephemeral state + server record/cache layer | P3/P5/P6 canonical APIs | Zustand restores scoped tabs/layout/drafts; Query owns new server data, handles invalidation, errors and live-event reconciliation. Real save/run/reconnect flow demonstrates no stale cross-project state or duplicate requests. Do not rewrite working chat merely for adoption. |
| TECH-08 Drizzle ORM + Zod | P1 typed database adapter/schema + execution boundary schemas; extend P3/P5/P6/P7 | Approved P1 deps/build and additive schema | Real PostgreSQL API/effect workflow executes Drizzle queries inside existing transaction ownership; rollback/fencing/concurrency work. Zod rejects invalid request/tool/event inputs without changing valid legacy contracts. Existing frontend Zod usage is baseline, not completion of the new backend requirement. |
| TECH-09 MCP TypeScript SDK | P6 MCP connection/tool adapter inside canonical registry/runtime | P1 grants/effects, P2 credential broker, P3 guest | Real MCP server discovery and approved tool execution produce canonical receipts; cancellation, revoked grants, schema drift and malicious results are contained. Stdio launches only in qualified guest. |
| TECH-10 Tree-sitter + ripgrep | P6 structural index + bounded search feeding context/LSP | P3 root/snapshot broker; existing scanner/context services | Real repository query retrieves matching lines and parsed definitions/imports; changing a file invalidates results; resulting context is used by a real agent task; excluded paths and another project never leak. |

All technology rows remain PLANNED or BLOCKED until their phase E2E criteria pass.
Phase completion does not imply all later technology rows are complete.

## Windows security design (P3 approval target)

Trust chain: isolated renderer → authenticated Express → existing governance/effect
services → constrained signed Windows helper → disposable managed Hyper-V guest.
The minimal native Windows helper exposes fixed management/handle/Job Object RPC;
business logic stays Node/TypeScript. Installation/elevation is separately approved.

- Versioned hash-verified licensed Windows base image, per-run differencing disk,
  unprivileged project account. No project command runs on the host.
- No host workspace/profile/credential/database mounts. Transfer an approved snapshot
  over authenticated, versioned, bounded Hyper-V socket messages without a VM NIC.
- No guest IP network by default. Approved package/document fetches go through a
  typed host fetch broker: destination and redirect/DNS validation, private/loopback/
  link-local/metadata denial, response limits, no generic proxy and no secret forwarding.
- Keys/cookies/SSH agents/operator environment stay outside the guest. Provider
  requests use the trusted credential boundary. Same-account host compromise is not
  defeated by DPAPI and must not be claimed otherwise.
- Untrusted outputs become quarantined hash-addressed artifacts. Apply all patch
  targets through host broker final-handle validation (reparse/junction/UNC/device/ADS
  defenses), per-root locking, exact base hashes and a durable preimage/apply journal.
  A multi-file patch is not one atomic SQL/filesystem transaction; reconcile partial
  application before further writes. Never overwrite user edits on recovery.
- Defaults: one VM/run and one executing VM globally, 2 vCPU, 4 GiB VM memory,
  20 GiB disk cap, 120s command deadline, approved test/build up to 10min, 1 MiB inline
  output, 30min run deadline. Raise limits only under approved policy/capacity.
- Guest Job Objects: suspended process creation, assignment before resume, no
  breakaway, kill-on-close. VM teardown remains the outer containment boundary.
- Heartbeat and generation identity bind run/task/VM. Expiry/cancel stops dispatch
  and destroys owned guest. Reconcile unknown effects; never blindly replay them.
- Independent final verification uses a clean guest and exact final artifact hash.

## Execution modes and immutable boundaries

| UI mode / compatible existing value | Automatic authority | Required approval |
| --- | --- | --- |
| Plan Only / readonly | Authorized inspection, search/context/plans | No project writes, mutation tools or commands |
| Ask Before Every Change / supervised | Authorized reads | Each exact write batch, command, mutation-capable MCP operation |
| Autonomous Coding / guarded | Guest edits and approved tests under accepted task | Initial contract; host patch application; expanded tools/paths/budget and exceptional commands |
| Full Autonomous Build / autonomous | End-to-end local guest work and host patch application explicitly permitted by accepted run contract/grant | Initial run authorization; protected paths; material revision/scope/budget changes; exceptional actions |

Permissions are the intersection of owner policy, project grant, run contract and
tool revision. Child agents only narrow that intersection. Initial terminal creation
does not approve arbitrary later commands. Tightening policy stops dispatch; escalation
needs confirmation. Commits/push/deploy/host execution remain denied in every V1 mode.

## Phase sequence and file manifest

Paths below are repository-relative inventory entries under the existing checkout;
no directory moves are authorized. Existing protected files require their phase gate.
P0→P1→P2→P3→P4→P5→P6→P7→P8 is the acceptance order. Do not skip blocked P3 to
enable dependent features, even where some adapters have fewer technical dependencies.

### P0 — baseline, ownership, rollback and approval manifest

Affected: docs/SIRONA-WORKSPACE-PLAN.md (this file),
SIRONA-WORKSPACE-LEDGER.md, SIRONA-WORKSPACE-P0-REPORT.md,
SIRONA-WORKSPACE-P1-APPROVAL.md, ROUTE-SURFACE-MATRIX.md;
sironadocs/frontend/UI-FREEZE-CONTRACT.md; sironadocs/references/frontend/sirona-next/TASKS.md;
docs/integration/evidence/workspace-p0/* (evidence utilities/reports/screenshots;
private backups excluded from Git).

No application, dependency, root-package, route or schema changes. Capture on-disk
source hashes including untracked code, static route inventory, readonly DB schema/
migration checksum lineage, screenshot baselines, regression checks and backup.
The owner subsequently approved the named isolated target; existing 001–021 were
applied only to sirona_workspace_p0_test_20261028 and six baseline integration tests
pass. Working sirona is never a test target. P0 is accepted; P1 has not started. Rollback: select reviewed source/docs from manifest; never reset dirty tree.
Database archive is DPAPI CurrentUser encrypted, decrypt/catalog verified; actual
restore testing is a separate approval-dependent gate, not a disaster recovery claim.

### P1 — durable execution, authorization, Drizzle and Zod

Existing allowed-file target (approval pending):
backend/services/{executionService,agentWorkerService,workflowOrchestratorService,
toolRuntimeService,governanceService}.js;
backend/routes/v1/{execution,tools}.routes.js;
backend/package.json, backend/package-lock.json;
backend/scripts/{checkSyntax,checkStatic,checkModules}.js only if needed for explicit
TS build coverage, not to weaken checks; backend/jsconfig.json only to preserve JS
checking alongside TS. No existing JS service rename.
New: backend/tsconfig.workspace.json;
backend/src/db/{schema,transactionAdapter}.ts;
backend/src/execution/{effectJournal,runEventStore}.ts;
backend/src/security/executionPolicy.ts;
backend/tests/{executionReliability,executionAuthorization,typedDatabaseBoundary}.test.ts;
backend/migrations/022_execution_reliability.sql (create/review separate from apply).

Add Drizzle/Zod and justified package-local TS build/test tooling only after approval.
Reuse existing pg Pool/client transaction ownership. Compile new TS to a separate
ignored output; existing JS uses stable adapters. No ORM auto-sync/migration runner.

Migration: nullable effects.operation_key with partial UNIQUE(run_id,operation_key);
runs.event_sequence BIGINT backfilled from existing max; new writes allocate under
run-row locking in the same transaction as events. Existing effect rows are retained.
Use existing task lease_epoch and run epoch for dispatch/renew/finish fencing; add
no duplicate run/task store. Lock/event write order is consistent across writers.

API: preserve methods, prefixes, success/error envelopes and enum values. Optional
Idempotency-Key on relevant existing effect-dispatch requests; non-HTTP worker calls
carry trusted execution identity, expected run epoch and task lease epoch. Reject
missing identity for new mutating worker path, revoked grants and stale approvals.
No new host execution capability, no guest launch, no frontend switch. Existing
run SSE paginates replay then tails committed events; Last-Event-ID remains compatible.

Tests: real disposable PostgreSQL HTTP/effect path through Drizzle and Zod; valid
legacy requests; invalid payloads/cross-workspace identity; 100 concurrent event
writers; stale worker completion; crashes before/after dispatch and receipt; replay
of completed effects; unknown outcomes stop; revoke/expiry during resume. Preserve
chat/project/provider contracts. Fault injection may test errors, never claim inference.

Accept only with actual typed DB transaction/E2E evidence, no duplicated effects,
ordered live events, unchanged legacy contracts and reviewed rollback record.
Rollback: disable new dispatch, drain/fence workers, reconcile unknown effects;
retain additive columns/journal, revert compatible adapters only when safe. No blind
code downgrade over unresolved effects. See P1 approval document for exact gates.

### P2 — trusted OS credential broker

Depends P1. Existing: frontend/sirona-next/electron/{main,preload}.cjs;
backend/services/{secretStore,providerService}.js. New:
frontend/sirona-next/electron/security/credentialBroker.ts;
backend/src/providers/credentialResolver.ts;
backend/migrations/023_provider_credential_references.sql;
backend/tests/credentialMigration.test.ts; frontend/sirona-next/tests/desktop-credentials.mjs.

Add opaque credential reference to existing provider_connections. OS protection stays
in trusted main/broker, sender-checked one-time submission. Verify each migrated secret
before clearing legacy bytes; unrecoverable connections need re-entry, retain model/
conversation history. Remove plaintext/predictable fallback from enabled production
path. No provider API rewrite. Test restart, rotation, corrupt envelopes, unavailable
OS service, interruption and no renderer/log/export/package disclosure. Rollback:
retain migration state, safely disable affected connections; never plaintext fallback.

### P3 — workspace/terminal broker (Home profile amendment verified; original Hyper-V design below)

The following is the original Hyper-V profile design. For this Windows Home host, the explicitly approved and scoped verified Docker + WSL2 implementation/files/routes are defined by SIRONA-WORKSPACE-P3-DOCKER-PLAN.md and the corrected P3 report. Do not treat the original Windows-guest/signing/migration proposals as implemented or automatically authorized. Production release remains P8.

Depends P1/P2, supported-host preflight, licensed image, protected/privileged approval.
Existing: backend/services/{sandboxManager,isolationBrokerService,toolRuntimeService,
workspacePathResolver}.js; backend/routes/v1/{isolation,tools}.routes.js;
backend/routes/index.js; backend/foundation/{admission,production}.js;
frontend/sirona-next/electron/{main,preload}.cjs.
New: tooling/sirona/native/windows-broker/{main.cpp,CMakeLists.txt,broker.manifest};
tooling/sirona/src/windows/{protocol.ts,guestAgent.ts,guestProvisioning.ps1};
backend/src/workspace/workspaceBroker.ts;
backend/src/windows/{hyperVAdapter,terminalService}.ts;
backend/routes/v1/workspace.routes.ts;
backend/migrations/024_workspace_guest_sessions.sql;
backend/tests/{windowsGuest.integration,workspaceBroker}.test.ts.

Add scoped root references, terminal metadata and guest identity/image/generation to
existing isolation workers; add adapter/profile without changing old semantics.
Keep patches in existing artifacts/effects. No fake project or duplicate authority.
New APIs only after equivalent-route search:
POST /projects/:projectId/workspace-root; GET /projects/:projectId/files;
GET /projects/:projectId/file; POST /projects/:projectId/search;
POST /projects/:projectId/patch-previews;
POST /projects/:projectId/patch-previews/:artifactId/apply;
POST /projects/:projectId/terminals; DELETE /terminals/:terminalId;
WS /terminals/:terminalId/channel (all under /api/v1).
Paths are root-relative, not renderer-selected absolute authority. Require ownership,
CSRF for mutations, bounded tokens and exact Origin for WS, revision/idempotency on writes.
node-pty runs inside guest; xterm frontend follows P7. Test all Windows security rules
above with actual guests, terminal resize/cancel, memory/disk/deadline exhaustion and
helper/guest crash. Accept only live containment evidence. Rollback: deny dispatch,
terminate owned VMs, reconcile effects, retain journals; never host fallback.

### P4 — mandatory Vercel AI SDK adapter

Depends accepted P3 (sequence), P2 secrets. Existing:
backend/services/{providerService,aiService,conversationTurnCoordinator}.js;
backend/{package.json,package-lock.json}. New:
backend/src/providers/{modelAdapter,aiSdkAdapter}.ts;
backend/tests/providerParity.test.ts.

Keep discovery/auth/registry/SSRF/usage authority in current services. Resolve native
ID from exact connection; do not rewrite slash/colon IDs. Choose adapter by capability
before request; preserve installed SDK for unsupported signatures/tools. Preserve
Google chunk.text and tool signatures, SSE framing/cancel/usage, native chat identity.
No fallback after output/effects. No public API/schema change. Accept real configured
provider inference through SDK with exact identity/usage/cancel evidence plus parity
for old adapters. Rollback per-provider flag before new requests, not mid-stream.

### P5 — mandatory LangGraph with dynamic delegation

Depends P1/P3/P4. Existing: backend/services/{workflowOrchestratorService,
agentWorkerService,agentExecutionEngine,planningContractService,verificationService}.js;
backend/routes/v1/{execution,planning}.routes.js. New:
backend/src/orchestration/{workspaceGraph,delegationService,checkpointAdapter}.ts;
backend/migrations/025_langgraph_delegation.sql;
backend/tests/{orchestrationRecovery,delegationPolicy}.test.ts.

Use existing run/task/agent/plan/contract/approval/effect services as authority.
Custom PostgreSQL graph-checkpoint adapter extends existing run_checkpoints metadata
and namespaced pending writes; do not collide with existing public.checkpoints or
create a duplicate run store. Persist graph version and stable run/thread binding.
Add parent/delegation metadata to existing tasks/agent_sessions. Reuse multi-layer
plan normalization: goal → milestones → DAG → subtasks with immutable revisions.
Dynamic Send fanout/join: scoped budgets/deadlines, four model agents, depth three,
at most two repair retries or tighter existing limit. Keep one executing guest until
parallel capacity independently qualified. Isolated patch snapshots merge serially
with base hashes; material plan changes require revision/reapproval. Resume validates
epochs, policy, grants, snapshot and exact approval before effect dispatch. Separate
review identities; clean final verifier cannot self-certify producer work.
Reuse run start/pause/resume/cancel/events routes. New authorized
POST /api/v1/runs/:runId/delegations; optional compatible run policy/mode fields.
Test real-model delegation, parallel joins, approval wait/reject/revoke, budget/depth
limits, conflict patches, bounded repair, graph version mismatch, restart at each
effect boundary and independent verification. Rollback: disable new graph runs;
pause/preserve existing graph instances, never resume with a different engine blindly.

### P6 — mandatory MCP SDK, Tree-sitter/ripgrep and real tools/context

Depends P1–P5. Existing: backend/services/{contextEngineService,projectScannerService,
memoryService,toolRuntimeService}.js; tooling/sirona/src/lsp.ts;
backend/routes/v1/{tools,memory}.routes.js. New:
backend/src/tools/{gitAdapter,mcpAdapter}.ts;
backend/src/context/{contextAssembler,projectIndex}.ts;
backend/tests/{contextIsolation,mcpAuthorization,gitWorkspace}.test.ts.

Real ripgrep bounded search + Tree-sitter definitions/imports with versioned parsers;
Chokidar invalidation, content hashes/token budgets/provenance. Reuse existing memory
and PostgreSQL/optional pgvector; retrieve actual source into an actual agent task.
Existing LSP uses guest-owned servers. Git V1 is status/log/diff only; disable hooks,
external diff/textconv, unsafe config and implicit network. MCP stdio in guest;
remote connections explicitly configured/approved/egress-restricted. Canonical tool
revisions validate schemas, risks, grants, cancellation and immutable receipts;
tool results/repository instructions never grant authority. Reuse existing APIs;
review any new tool registration data migration separately. Accept real MCP and
code-intelligence E2E; rollback by disabling revisions and retaining historical receipts.

### P7 — required editor/terminal/graph/state integrations in current UI

Depends P1–P6. Existing: frontend/sirona-next/src/app/{App.tsx,useWorkspace.ts};
src/api/{client.ts,schemas.ts}; src/features/projects/Projects.tsx; src/styles/app.css;
package.json/package-lock.json. New under frontend/sirona-next/src/features/workspace/:
Workspace.tsx, FileExplorer.tsx, Editor.tsx, Terminal.tsx, GitDiff.tsx, AgentMonitor.tsx,
PlanningPanel.tsx, ToolApprovals.tsx, workspaceState.ts, workspaceQueries.ts;
frontend/sirona-next/tests/{desktop-workspace,desktop-execution-modes}.mjs.

Inside existing project view: lazy Monaco editor/diff, xterm terminal and React Flow
live plan/agent graph; Zustand owns scoped ephemeral layout/drafts, TanStack Query
owns new server records/invalidation. Both must demonstrably participate in real
save/run/reconnect workflows; do not split authority or duplicate chat transport.
Preserve existing UI tokens/primitives/icons; Radix/shadcn only for missing approved
interactions, no reset or global migration. Save uses revision checks, draft≠saved
bytes; reconnect restores actual canonical states, not fake running terminals.
Show all four mode policy summaries and approvals. Accept actual project open/search/
edit/save/diff/terminal/agent/review/verify/restart journey + accessibility and visual
regressions. Rollback workspace feature flag; retain chat/settings and durable data.

### P8 — production release/recovery qualification

Depends P1–P7 acceptance and all TECH rows E2E verified; protected recovery/release gate.
Existing: backend/services/releaseRecoveryService.js; frontend/sirona-next/package.json,
package-lock.json and electron/main.cjs. New:
backend/src/observability/tracing.ts; backend/src/operations/databaseRecovery.ts;
backend/tests/databaseRestore.integration.test.ts; frontend/sirona-next/electron-builder.yml;
frontend/sirona-next/tests/desktop-release.mjs;
docs/SIRONA-WORKSPACE-QUALIFICATION.md.

Pino/OpenTelemetry correlate API/run/task/agent/effect/provider/guest without source,
prompt or secret content by default; remote export opt-in. Approved remediation
replaces simulated backup/restore claims with actual archive + separate DB restore
and measured row/hash/RTO/RPO evidence. Package with electron-builder, signed helper,
native modules/notices; exclude .env/operator keys. Clean supported Windows install/
upgrade/uninstall, owned orphan cleanup and all ten integrations must pass. Signing,
install privileges and image distribution separately approved. Rollback: drain/fence,
reconcile effects, revert compatible application package; retain additive schema and
never restore an old database over newer user data automatically.

## Cross-phase acceptance, task ledger and approvals

Statuses: planned → approved → implementing → verifying → accepted; blocked/failed/
rolled_back are explicit alternatives. Source/test/approval/artifact hashes bind
evidence to the exact run. Fix scoped failures before acceptance; pre-existing
protected failures are blockers requiring a new approval, not permission to edit.

Do not run DB-mutating suites against working sirona. Test DB target is
sirona_workspace_p0_test_20261028: approved/created for existing 001–021 only. Further
migrations and live targets require separate approval.
Refuse any harness target not exactly that database; never drop/recreate existing
databases. Actual restore rehearsals need their own approved new target.

P0 completion requires ownership/plan/ledger, preservation verification, schema
lineage, current visual baselines, successful scoped checks, verified rollback
archive, and isolated test-target provisioning/verification or explicit owner deferral.
P1 cannot start automatically. Before every next phase present exact files, dependencies,
routes, SQL, privileges, checks and rollback. Approval of architecture is not authority
to mutate protected services or data.

Technical references consulted during architecture review:
- https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/host-hardware-requirements
- https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/make-integration-service
- https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects
- https://www.electronjs.org/docs/latest/api/safe-storage
- https://docs.langchain.com/oss/javascript/langgraph/graph-api
- https://docs.langchain.com/oss/javascript/langgraph/interrupts
- https://ai-sdk.dev/docs/ai-sdk-core/provider-management

## Agent handoff and historical Markdown organization

Owner approved relocating confusing older plans/status to docs/archive/pre-workspace-2026-10-28, retaining redirects/original hashes and protected normative rules. Read SIRONA-AGENT-HANDOFF.md before resuming. Current plan/ledger/approval/evidence remain in docs/integration. A different agent can continue at the next approved phase; the handoff never grants itself protected/migration/privilege authority.
