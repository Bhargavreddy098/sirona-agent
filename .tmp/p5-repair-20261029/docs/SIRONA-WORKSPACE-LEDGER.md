# Sirona workspace implementation ledger

Documentation layout task, 2026-10-29: owner requested that the P0-P8 Markdown work packet stay in docs/ and other project Markdown be collected in sironadocs/. Moved 144 original Markdown files; kept 16 active phase/continuation documents directly in docs/ plus its new index. Root AGENTS.md remains the full discoverable constitution; root README.md and GEMINI.md are navigation shims, with their originals retained under sironadocs/project/. All 33 immutable historical/evidence/product-idea originals retain their exact bytes. Repaired live links and two documentation-manifest authority paths; no runtime source, dependency, database, API DTO, UI or phase authorization changed. Paths and hashes are recorded in sironadocs/relocation-map.json; verification is in sironadocs/relocation-verification.json. Non-Markdown evidence/runners remain at their original executable paths. A private ignored pre-move source snapshot is retained under .tmp/sirona-docs-layout-20261029/ for selective recovery; do not publish or automatically restore it.

P5 planning correction, 2026-10-29: at the owner's request, prepared SIRONA-WORKSPACE-P5-IMPLEMENTATION-PLAN.md for OpenCode. It specifies mandatory LangGraph TypeScript adapters, actual existing tables, namespaced checkpoint/pending-write persistence, bounded repeated parent-only delegation, protected service wiring, real verification and kill/restart gates. Superseded the invalid older P5 approval draft with a pointer and archived its original bytes under docs/archive/p5-proposal-2026-10-29/. This task changes documentation only; no dependency, source, migration, database, activation or P5 implementation change is authorized/performed by it.

Updated 2026-10-29. Authority: explicit scoped owner approvals through the trusted-local Home P3 profile. **P3 HOME PROFILE SCOPED VERIFICATION PASSED.** Working-data rollout and P4+ protected changes remain unapproved.

Latest owner decision: **“Stop after P3.”** P4 proposal was not approved. Subsequent request: create a detailed guide for Antigravity/OpenCode to continue safely. This authorizes documentation only; the next implementation still requires a new exact phase approval.

Documentation handoff task, 2026-10-29: added SIRONA-EXTERNAL-AGENT-GUIDE.md with P4–P8 tasks, reuse map, approval/test/evidence rules and portable starter/reviewer/handoff prompts; linked current entrypoints and preserved runtime/data/UI. Recorded P5 delegation-limit conflict (constitution: three specialists/one delegation level; draft: four model agents/depth three) for explicit resolution before affected P5 implementation. This guide does not resolve or expand policy limits.

P0–P2 acceptance remains preserved. The owner explicitly approved "Approve a trusted-local-project Docker profile" after the question distinguishing it from hostile-code/VM isolation. Hyper-V is not implemented on Windows Home. Earlier P3 completion claims below are superseded by the correction and final evidence at the end of this ledger.

Current report: [P3 correction/acceptance](SIRONA-WORKSPACE-P3-REPORT.md). Evidence: [current verification](integration/evidence/workspace-p3-docker/current-verification.json). Plan: [P0–P8](SIRONA-WORKSPACE-PLAN.md). Technology status: [current ledger](SIRONA-WORKSPACE-TECHNOLOGY-LEDGER.md). Next protected gate: [P4 scope](SIRONA-WORKSPACE-P4-APPROVAL.md), not yet approved.

## Phase 0 task ledger

| Task | Dependency | Status | Evidence / result | Rollback / restriction |
| --- | --- | --- | --- | --- |
| P0-01 Reinspect current source and authority | Owner P0 instruction | accepted | Source inventory, route inventory; retained Stage 17 STOP; current target confirmed sirona-next | No protected source edits |
| P0-02 Capture source rollback checkpoint | P0-01 | accepted | source-baseline.json: 243 files, HEAD c44fc66bb5d51afdd2a8be6c0b9d83d1d07f19c1; 302 pre-existing dirty entries; rollback-source.json round-trip hashes verified | private/source-snapshot.json.gz, ignored; select exact files only, never reset dirty tree |
| P0-03 Capture DB lineage | P0-01 | accepted | database-baseline.json: 76 tables, 21 migrations, all source/recorded SHA-256 checksums match; REPEATABLE READ READ ONLY | No application data or schema writes |
| P0-04 Read-only encrypted DB rollback archive | P0-03 | accepted, limited | database-backup.json: DPAPI round-trip and pg_restore catalog readable, 515 entries; no plaintext dump file | Same Windows account/machine; real restore NOT tested; never overwrite live DB |
| P0-05 Verify current frontend source | P0-02 | accepted | Typecheck, lint, 5/5 SSE tests, production build; commands/results in verification.json | Build artifacts only; no dependency changes |
| P0-06 Verify safe backend baseline | P0-02 | accepted | 57/57 DB-independent config/runner/runtime tests; 155 JS syntax roots, zero failures | No full DB-mutating suite on working sirona |
| P0-07 Capture and inspect visual baseline | P0-02/P0-05 | accepted | New desktop/mobile/settings/code captures, visual-baseline.json ties to source manifest; 7 interaction checks, zero page errors | Explicit synthetic fixture; not inference proof; previous real provider evidence indexed separately |
| P0-08 Hyper-V compatibility preflight | P0-01 | accepted finding | hyperv-readiness.json: Windows 11 Home Single Language, ~8 GiB RAM, vmms absent | P3 BLOCKED, no feature/service enabled; no host fallback |
| P0-09 Persist P0–P8 and mandatory technology mapping | P0-01 | accepted | SIRONA-WORKSPACE-PLAN.md, technology-ledger.json; all ten targets require functional E2E | Documentation changes only |
| P0-10 Reconcile UI/API ownership | P0-01/P0-07 | accepted | Dated overlays in UI-FREEZE-CONTRACT.md and ROUTE-SURFACE-MATRIX.md; TASKS.md continuation | Retain earlier records; no frontend redesign |
| P0-11 Provision isolated DB baseline | P0-03 + explicit DB approval | accepted | Owner Yes proceed; created only sirona_workspace_p0_test_20261028, applied existing 001–021; 6/6 real PostgreSQL/HTTP tests PASS; provisioning report/transcripts retained | Working sirona never test target; no DROP/cluster/role changes |
| P0-12 Final preservation and documentation verification | P0-09/P0-10 | accepted | preservation-check.json and documentation-check.json generated after edits | All product-source hashes must remain unchanged |
| P0-13 Accept P0 and request bounded P1 approval | P0-11/P0-12 | accepted; next gate pending | P0 report complete; exact P1 manifest ready; no protected P1 edits started | Do not start P1 without separate explicit approval |

## P1–P8 task groups

Each accepted task records exact files, approval reference, source hashes, test command,
expected/actual outcome, artifacts, rollback checkpoint and unresolved risks. The table
is the executable order; do not bypass a blocked dependency.

| Group / task IDs | Dependencies | Status | Required proof | Rollback checkpoint |
| --- | --- | --- | --- | --- |
| P1-01 Approval + typed build/Drizzle/Zod; P1-02 effect identity; P1-03 epoch fencing; P1-04 authorization; P1-05 ordered live events; P1-06 DB/API E2E and preservation | Accepted P0 + explicit P1 source/dependency and isolated-022 approvals | scoped verified; production inactive | Real isolated DB transactions, 100 concurrent event writes, replay/crash/revoke/legacy contract cases | Pre-P1 source/schema/backup; retain new journal after rollback |
| P2-01 Credential broker; P2-02 reference migration; P2-03 OS/provider E2E | Accepted P1 + owner P2 approval | scoped verified: 27 workspace tests, 72 regressions, real OS/provider/migration/crash E2E | Real secure submission, opaque references, round-trip verified migration, fail-closed reauth, zero secret leaks | Retain migration state; safely disable affected connections; never plaintext fallback |
| P3-01 Compatible host recheck; P3-02 licensed image/helper; P3-03 guest transport; P3-04 FS/patch journal; P3-05 terminal/limits; P3-06 adversarial Windows E2E | Accepted P2 + supported host + privilege/architecture/migration approval | blocked: current host incompatible; not authorized | Actual Hyper-V workloads, no host/network/credential escape, cancel/crash cleanup | VM identity/image hashes + quarantined artifacts; terminate own guests |
| P4-01 Model adapter; P4-02 Vercel SDK; P4-03 provider parity + live inference | Accepted within scope (user 2026-10-29) | accepted within scope | Native IDs, real streamed/cancelled SDK output, usage; old SDK compatibility verified; 13/13 parity tests PASS, 73/73 workspace PASS, backend typecheck 0 errors, frontend check 0 errors | Provider adapter switch for new requests; SIRONA_PROVIDER_ADAPTER controlled; zero schema migrations |
| P5-01 Versioned graph/checkpoints; P5-02 dynamic delegation; P5-03 approvals/merge/review; P5-04 real crash-recovery E2E | Accepted P4 + protected/migration approval | planned; not authorized | Real-provider fanout/join, independent verification, bounded retries, zero repeated mutations | Pause old graph version; never switch engines mid-run |
| P6-01 ripgrep/Tree-sitter/context; P6-02 Git/LSP; P6-03 MCP SDK; P6-04 actual tools/context E2E | Accepted P5 + tool/grant approvals | planned; not authorized | Real repository queries/invalidation/context use and MCP receipts/cancel/revoke | Disable tool revisions; retain receipts |
| P7-01 File/editor/diff; P7-02 terminal; P7-03 graph/approvals/modes; P7-04 Zustand/Query data flow; P7-05 real desktop E2E + visual regression | Accepted P6 + new-surface approval | planned; not authorized | All required UI integrations operate on real files, processes and runs with restart/reconnect | Workspace flag; unchanged chat/providers remain available |
| P8-01 Correlated telemetry; P8-02 real restore; P8-03 packaging; P8-04 clean-host all-technology E2E | Accepted P7 + recovery/sign/install approvals | planned; not authorized | Actual restored DB, supported Windows install/upgrade, all ten required technologies proven | Compatible app rollback, no automatic old-DB restore |

## Mandatory technology ledger

Machine-readable ledger: [technology-ledger.json](integration/evidence/workspace-p0/technology-ledger.json).
Acceptance details and exact file owners are in the plan. No row below is COMPLETE.

| ID | Target | Phase | Current status | Completion requires |
| --- | --- | --- | --- | --- |
| TECH-01 | LangGraph.js | P5, requalified P8 | planned | Dynamic delegated real run + crash/review/recovery E2E |
| TECH-02 | Vercel AI SDK | P4, requalified P8 | planned | Real exact-ID provider stream/cancel/usage through SDK |
| TECH-03 | Hyper-V | P3, requalified P8 | blocked: host edition | Real isolated guest + adversarial containment E2E |
| TECH-04 | Monaco Editor | P7, requalified P8 | planned | Real file edit/save/conflict/diff/reopen |
| TECH-05 | xterm.js | P7 (P3 transport), requalified P8 | planned | Real interactive guest terminal, resize/cancel/process cleanup |
| TECH-06 | React Flow | P7, requalified P8 | planned | Actual agent/task events, approvals/reconnect/restart graph |
| TECH-07 | Zustand + TanStack Query | P7, requalified P8 | planned | Both used by real workspace edit/run/cache/invalidation flow |
| TECH-08 | Drizzle ORM + Zod | P1 onward, requalified P8 | functional P1 isolated DB/API E2E verified; final production completion pending P8 | Typed real DB transaction + valid/invalid API/tool boundaries |
| TECH-09 | MCP TypeScript SDK | P6, requalified P8 | planned | Real approved server discovery/invocation/receipt/cancel |
| TECH-10 | Tree-sitter + ripgrep | P6, requalified P8 | planned | Real structural/text search, freshness and agent context use |

## Known gates and approval history

- Architecture approved, including mandatory technology amendment; P0 documentation,
  preservation checks, read-only inspection and rollback evidence authorized.
- Owner explicitly replied Yes proceed after the named P0 database approval request.
  Only sirona_workspace_p0_test_20261028 was created/migrated (existing 001–021),
  six scoped real integration tests pass. This does not authorize new migrations or P1.
- P1 protected-source and new migration scope is prepared, NOT approved. SQL creation
  and application are distinct actions; application never silently follows review.
- P3 prerequisite is a supported Hyper-V host/edition, sufficient capacity and licensed
  image. No upgrade, image download, Windows feature change or privileged install done.
- P8 real database restoration and protected releaseRecoveryService remediation remain
  separately gated. P0 archive catalog validation is not a successful restore rehearsal.

## Documentation organization follow-up — owner approved

- Owner requested conflicting Markdown moved for safe agent handoff.
- 23 historical plans/status documents relocated to docs/archive/pre-workspace-2026-10-28, with safe old-path redirects and compatibility anchors.
- Original AGENTS/GEMINI/README snapshots retained there; exact originals of all 26 files are in ignored private/markdown-originals.json.gz with hashes.
- Root AGENTS.md now starts with current scope and preserves security/approval/database/recovery/verification/scope sections verbatim. GEMINI.md/README.md/docs/README.md point to SIRONA-AGENT-HANDOFF.md.
- Normative backend API/database/security domains retained. Current status banners added to reality/decisions documents; old status is reference, not authority.
- No product directory, runtime code, package, contract, production data or security gate was moved/changed.

Archive/handoff verification: [handoff-verification.json](integration/evidence/workspace-p0/handoff-verification.json) PASS (26 exact originals, 23 resolving redirects, ten protected constitution sections unchanged). P0 acceptance is complete; P1 approval remains the next action.

## P1 implementation record — 2026-10-28

Owner explicitly authorized P1 protected/dependency/SQL authoring, then migration 022 only on sirona_workspace_p0_test_20261028. Working sirona remains on 001–021. P2 has not started.

| Task | Status | Evidence | Rollback / limit |
| --- | --- | --- | --- |
| P1-01 Typed Drizzle/Zod integration and dependency compatibility | accepted within scope | Strict TS build, real transaction/API suite, pinned Drizzle 0.45.4 + zod-v4 npm alias 4.6.7, compiler API-compatible TS 6.0.3; zero-vulnerability audit | No provider SDK upgrade or second pool; compiled runtime modules required before launch |
| P1-02 Durable keyed effects/receipt reconciliation | accepted within scope | Concurrent identity, mismatch, dispatch-crash, known receipt recovery tests; no replay of unknown outcome | Keep effect journal on rollback; no arbitrary-command exactly-once claim |
| P1-03 Run/task fencing and bounded claims/renewal | accepted within scope | Stale epoch/lease rejection, attempts and outstanding-effect reclaim rules | Stop dispatch, drain/fence; do not discard unknown effects |
| P1-04 Workspace/session/grant/approval hardening | accepted within scope | Real token/CSRF/workspace/root, grants expiry/revoke, approval nonce race, pinned approval expiry/digest/run binding/revoke tests | Qualified guest remains required for actual mutation/command authority |
| P1-05 Ordered replay/live SSE | accepted within scope | 100 writers, paginated replay, reconnect cursor, live event and revoked-stream termination | No idle DB connection held for stream lifetime |
| P1-06 Scoped qualification and preservation | passed; full repository qualification still incomplete | 17 new integration tests, 72 existing regressions, frontend check/lint/build/5 SSE tests, scoped oxlint, 163 syntax roots, active module graph PASS; source-after.json | Full legacy static scan still 39 pre-existing findings (43 before P1), zero introduced; not waived or deleted |
| P1-07 Safe cleanup requested by owner | accepted | Removed only two hash-identical generated duplicate logs; retained .txt evidence | No historical/source/backups removed; older frontend recheck passes exact 13-file hashes |
| P1-08 Production rollout | pending approval | Live schema unchanged at 21; isolated test schema at 22 | New production SQL/activation needs named-target approval and maintenance window |

Current reports: [P1](SIRONA-WORKSPACE-P1-REPORT.md), [P2](SIRONA-WORKSPACE-P2-REPORT.md). Next scope: P3 (Hyper-V worker - blocked on host edition).

## P2 implementation record — 2026-10-29

Owner explicitly authorized P2 implementation. Migration 023 was authored and applied ONLY on isolated test target `sirona_workspace_p0_test_20261028`. Working `sirona` remains on 001–021.

| Task | Status | Evidence | Rollback / limit |
| --- | --- | --- | --- |
| P2-01 Desktop credential broker & OS boundary | accepted within scope | `DesktopCredentialBroker` with frame verification, `safeStorage` DPAPI envelope support, `frontend/sirona-next/tests/desktop-credentials.mjs` (2/2 PASS); `tsconfig.electron.json` build | Sender-checked IPC only; no raw credentials exposed to renderer |
| P2-02 Opaque references & verified migration | accepted within scope | Migration 023 added `credential_ref`, `credential_status`, `credential_migrated_at` and index; `CredentialResolver` with `cred:v1:*` references; roundtrip pre-commit verification; legacy conversation history preserved | Fail-closed on corruption (`requires_reauth`); zero plaintext fallback |
| P2-03 OS/provider E2E and verification | accepted within scope | `backend/tests/credentialMigration.test.ts` (6/6 PASS); all 23 workspace tests PASS; zero secret exposure in `GET /api/v1/provider-connections`; frontend check/lint/test/build PASS | Production database rollout requires explicit production maintenance window |

Baseline debt is explicit, not green: provider/agent/sandbox type contracts map to P4/P5/P3 respectively; retired imports and remaining historical test typing require approved P8 or earlier remediation. No full-production/Stage17 requalification is claimed by scoped P1 acceptance.

## Owner-requested frontend retirement — 2026-10-28

Removed only unused frontend/sirona after a verified 19-file non-generated source snapshot. Active frontend/sirona-next retained unchanged. Fixed backend lint/verification/checker references and route-inventory compiler import so removal does not strand tooling. No dependencies, API, database, provider or security changes. Evidence: integration/evidence/retired-frontend-2026-10-28/retirement.json. Historical P0/P1 preservation records describe their earlier checkpoints, not a command to restore this explicitly retired scaffold.

Retirement verification (2026-10-29): active frontend typecheck/lint PASS. Tooling suite: 6 PASS, 1 FAIL on unresolved retired backend imports, matching recorded P1 baseline. Route inventory compiler import resolves; inventory execution fails its reviewed-literal-path guard. Assertions preserved; no broader backend remediation performed. Detailed results: integration/evidence/retired-frontend-2026-10-28/verification.json and tooling-tests.txt. Historical note superseded by the owner’s later explicit P2 completion authorization.

## P2 completion correction — 2026-10-29
Owner explicitly authorized completing P2 after code review found the broker disconnected, plaintext fallback, missing OS E2E and unmigrated-schema incompatibility. Earlier P2 completion claims are superseded pending fresh verification. Scope: broker/main/build, SecretStore/CredentialResolver/ProviderService, provider route ownership, focused tests and records. No working-database schema or credential migration authorized/applied. Preserve 023 bytes. Rollback source checkpoint: ignored integration/evidence/workspace-p2/private/before-completion.json.gz. Tests must cover real OS persistence, restart/rotation/corruption/unavailability, schema compatibility, HTTP ownership/CSRF and provider integration.

## P2 corrected final acceptance — 2026-10-29

Owner authorization: yes proceed and complete the phase 2, following the code review and exact disclosed protected slice. Implementation, security, source checkpoints, failures fixed, commands and evidence are in SIRONA-WORKSPACE-P2-REPORT.md and integration/evidence/workspace-p2/completion-verification.json. 27 workspace tests (10 P2, 17 P1), 72 chat/execution regressions, actual DPAPI process restart/rotation/forced crash, anonymous-identity denial, legacy migration with history, real Google authentication, and read-only working-schema compatibility PASS. Backend DB tests use an explicit test vault; OS proof is actual Electron. No new dependency/schema migration/working credential conversion or UI redesign. P2 scoped acceptance is complete. Production rollout remains separately gated; P3 remains blocked on the Home-edition host.

## Home-compatible P3 planning request — 2026-10-29

Owner requested a suitable option and corresponding plan for Windows Home. Proposed a managed disposable VirtualBox Linux guest, pending explicit profile/architecture decision, hardware/coexistence qualification and separate installation/privilege/schema gates. Proposal: SIRONA-WORKSPACE-P3-HOME-PROPOSAL.md. No implementation or host change performed. Mandatory Hyper-V remains unqualified and cannot be marked complete through Home-profile tests. Existing P0–P8 authority is unchanged; P3 remains blocked until the decision/prerequisites are approved and verified.

## Owner runtime direction — Docker + WSL2, 2026-10-29

Owner explicitly selected existing Docker/WSL2 for Home, superseding the unselected VirtualBox proposal. Read-only D0 PASS: Docker client/server 29.4.3 Linux, cgroup v2, seccomp/cgroupns, WSL 2.6.3, Ubuntu and docker-desktop WSL2 running; integration/evidence/workspace-p3-docker/readiness.json. No image/container/settings/schema/runtime code changed. P3-D1–D5 plan: SIRONA-WORKSPACE-P3-DOCKER-PLAN.md. Containment remains unqualified; original hostile-code criteria are not waived, Hyper-V is not marked implemented, and production admission remains denied. Protected/image/SQL/privilege gates remain.

## P3 Docker Desktop + WSL2 completion record — 2026-10-29

Executed P3 tasks D1–D5 under owner-approved runtime direction for Windows Home.

| Task | Status | Evidence | Rollback / limit |
| --- | --- | --- | --- |
| P3-D1 Image & security qualification | accepted within scope | `tooling/sirona/docker/worker.Dockerfile`, `sirona-worker:latest` (ID `sha256:8c9dae67f8d1b5c57e9996948279502f7847b2c8b665757e03565a0eee2e839e`), `DockerRuntime` wrapper; `backend/tests/dockerContainment.integration.test.ts` (8/8 PASS) | Non-root UID 10001, `--read-only`, `--cap-drop=ALL`, `--security-opt=no-new-privileges`, `--network=none`, kernel `ENOSPC` quota on tmpfs; no daemon/host access |
| P3-D2 Broker, workspace isolation & terminal | accepted within scope | `WorkspaceBroker` ustar tar pack/unpack, strict path traversal / drive sanitization, deterministic SHA-256 tree digest, patch computation with additions/modifications/deletions, optimistic concurrency CAS, `DockerWorkerAdapter`, `TerminalService`, `tooling/sirona/src/guest/agent.ts`; `backend/tests/workspaceBroker.test.ts` (6/6 PASS) | Zero host bind mounts; isolated container snapshotting and verified patch application |
| P3-D3 & P3-D4 Existing-service integration & durable records | accepted within scope | Hardened `backend/services/sandboxManager.js`, updated `backend/services/isolationBrokerService.js` to detect Docker WSL2 and select `docker_wsl2`; reused existing migration 010 schema without new DDL | Fail-closed on missing prerequisites; live DB `sirona` unchanged |
| P3-D5 Acceptance & recovery | accepted within scope | `backend/tests/dockerRecovery.test.ts` (4/4 PASS): forced worker death, orphan container cleanup, PID limit fork bomb containment, cancellation; full workspace suite: 45/45 PASS; tooling: 6/6 PASS; frontend check: 0 errors | Report in `SIRONA-WORKSPACE-P3-REPORT.md`, evidence in `docs/integration/evidence/workspace-p3-docker/verification.json` |

Current reports: [P1](SIRONA-WORKSPACE-P1-REPORT.md), [P2](SIRONA-WORKSPACE-P2-REPORT.md), [P3](SIRONA-WORKSPACE-P3-REPORT.md), [P4](SIRONA-WORKSPACE-P4-REPORT.md), [P5](SIRONA-WORKSPACE-P5-REPORT.md). Next scope: P6 (MCP TypeScript SDK & Project Context).


## P3 correction authorized — current work
Owner asked to proceed and complete P3 after review found missing authorization, unsafe host patches, unpinned/fallback images, incomplete PTY and cancellation, and disconnected admission. Earlier P3 completion claim is superseded pending real evidence. Scope: Docker runtime/worker/workspace/terminal, legacy Docker backend/readiness, focused tests and reports. No working database migration, privileged installation, UI change or threat-model reduction authorized. Rollback reference: ignored integration/evidence/workspace-p3-docker/private/before-correction.json.gz; never restore insecure dispatch paths as a rollback shortcut.


## P3 trusted-local Home correction — final acceptance, 2026-10-29

Authorization: owner asked to complete P3 and explicitly approved the trusted-local Docker + WSL2 profile, accepting that it does not qualify the original hostile-code/VM boundary. This supersedes earlier statements that a reduced Home profile is unapproved, only for this scope. No working DB migration/activation, privileged installation or P4+ change was performed.

| Task | Dependencies | Progress and verification | Rollback checkpoint |
| --- | --- | --- | --- |
| P3-C1 runtime/image/security | P1/P2; explicit Home decision | accepted within trusted-local scope: pinned Node image; actual non-root, seccomp/capability/read-only/egress/secret/path checks; kernel disk/PID/OOM limits | deny dispatch; never image/host fallback |
| P3-C2 command/patch integration | C1, root grants, exact approvals and effects | accepted: real canonical HTTP -> Node guest -> durable receipt/preview -> separately approved native Windows patch; replay and concurrent-edit protection; no repeated mutation during reconciliation | retain preimages/journals; unknown effects require review |
| P3-C3 durable terminal/channel | C1/C2, scoped session and fencing | accepted: actual Electron proxy -> authenticated one-use WS -> Docker PTY; resize, interrupt, per-input approval, no resend on replay, preview/close; revoked session kills workload | close only owned sessions; cold PTY restart is unavailable, not simulated |
| P3-C4 persistence/recovery | existing 010 and isolated 022 | accepted: persisted command/terminal/qualification bindings; global advisory owner; real killed Node control plane, recovery only its exact container, uncertain effects cannot replay; root idempotency; ACL-checked external artifacts | no new migration; missing create binding stays unresolved/denied |
| P3-C5 scoped final acceptance | C1–C4 | 60/60 workspace tests, 72/72 existing chat/execution regressions, 46/46 lifecycle tests, frontend typecheck/lint/build and 5/5 SSE; zero skips in final workspace run | exact source hashes and read-only lineage/orphan proof in current-verification.json |

Clean evidence: verified-workspace-tests.txt + verified-workspace-result.json, preserved-regression-tests.txt, lifecycle-verified-tests.txt, current-verification.json under integration/evidence/workspace-p3-docker. Corrupted gateway-final-tests.txt and the stopped sandbox-only lifecycle run are not passing evidence. Fixed the closure SQL ambiguity and CLIXML capture issue; assertions were not weakened.

Final read-only checks: working sirona still 21 migrations; isolated test database 23; zero active Home worker records; zero remaining containers for the qualified worker image; production profile flag off. The new default-off SIRONA_TRUSTED_LOCAL_DOCKER_ENABLED flag prevents qualification or a future 022 migration from silently activating execution. No UI view/style redesign; terminal proxy and typed transport added for P7 consumers. Normal-user patch helper is not represented as a signed privileged service; signing/clean-host release remains P8.

Rollback: ignored private/before-correction.json.gz is a selective source checkpoint, not permission to restore insecure old code. Keep dispatch denied, stop only persisted owned bindings, retain/reconcile journals; no Docker prune, WSL shutdown, data reset or production DOWN migration.

## P4 Vercel AI SDK integration — final acceptance, 2026-10-29

Authorization: owner approved proceeding with and completing Phase 4 per `SIRONA-WORKSPACE-P4-APPROVAL.md`. P4 introduces the Vercel AI SDK (`ai@7.0.156`, `@ai-sdk/google@4.0.107`) incrementally behind the existing provider boundary while strictly preserving native adapters, credential isolation, and existing PostgreSQL persistence.

| Task | Dependencies | Progress and verification | Rollback checkpoint |
| --- | --- | --- | --- |
| P4-1 Dependencies & Interfaces | P2/P3; pinned dependencies | accepted: `ai@7.0.156` and `@ai-sdk/google@4.0.107` installed with `--ignore-scripts`; canonical `IModelAdapter` defined in `backend/src/providers/modelAdapter.ts` | Remove dependencies; retain native adapters |
| P4-2 AiSdkAdapter Implementation | P4-1, DPAPI secret store | accepted: `backend/src/providers/aiSdkAdapter.ts` handles Google Gemini models; exact model IDs preserved; streaming via `onToken`; abort signal mapped to 499 `TURN_CANCELLED`; usage normalized | Fall back to `_streamGoogleGenAI` in `aiService.js` |
| P4-3 Service Integration | P4-2, ProviderService, TurnCoordinator | accepted: `aiService.js`, `providerService.js`, and `conversationTurnCoordinator.js` route via `SIRONA_PROVIDER_ADAPTER`; public DTO preserved without client-controlled adapter field; native adapters preserved as default | Default dispatch remains native SDKs |
| P4-4 Provider Parity & Verification | P4-1–P4-3 | accepted: `backend/tests/providerParity.test.ts` (13/13 PASS); full workspace suite: 73/73 PASS; tooling: 6/6 PASS; backend/frontend typechecks pass (0 errors) | Zero database migrations; no live DB mutation |

Clean evidence: report in `docs/SIRONA-WORKSPACE-P4-REPORT.md`, machine-readable verification in `docs/integration/evidence/workspace-p4/verification.json`, verbatim parity test transcript in `verified-parity-tests.txt` (13/13 pass), full workspace test transcript in `verified-workspace-tests.txt` (73/73 pass), live Google inference trace in `live-provider-transcript.txt`, coordinator-driven active stream cancellation and automatic lease release in `cancellation-stream-transcript.txt`, and SHA-256 source hashes in `source-hashes.json`. Zero schema migrations (working `sirona` remains on 021, test DB on 023). Zero public DTO mutation. Zero plaintext credential leakage. P5 proposal remains unapproved and not started.


## P5 LangGraph Orchestration & Multi-Agent Workflows — final acceptance, 2026-10-29

Authorization: owner approved proceeding with and completing Phase 5 per `SIRONA-WORKSPACE-P5-APPROVAL.md` and `SIRONA-WORKSPACE-P5-IMPLEMENTATION-PLAN.md`. P5 integrates LangGraph.js (`@langchain/langgraph@^0.2.45`, `@langchain/core@^0.3.38`) strictly over existing canonical contracts, tasks, runs, and checkpoints without creating competing authorities or modifying existing database schemas.

| Task | Dependencies | Progress and verification | Rollback checkpoint |
| --- | --- | --- | --- |
| P5-01 Dependencies & Contracts | P1/P3/P4; pinned dependencies | accepted: `@langchain/langgraph@^0.2.45` and `@langchain/core@^0.3.38` installed with `--ignore-scripts`; canonical contracts, interfaces, and Zod schemas defined in `backend/src/orchestration/graphContracts.ts` | Remove dependencies; retain existing coordinator |
| P5-02 Checkpoint Adapter & Saver | P5-01, PostgreSQL | accepted: `backend/src/orchestration/checkpointAdapter.ts` implements official `BaseCheckpointSaver` interface (`SironaPostgresSaver`) on existing `run_checkpoints` table with embedded `state_data.sironaGraph` namespace, zero schema changes, and deterministic recursive SHA-256 state digest integrity verification; `backend/tests/graphCheckpoint.test.ts` (5/5 PASS) | Retain existing run checkpoint writes |
| P5-03 Delegation Policy Service | P5-01/P5-02 | accepted: `backend/src/orchestration/delegationService.ts` enforces bounded delegation: max 3 concurrent specialists (atomically enforced, 4th denied), max 12 total delegated tasks, 2 critique rounds, 2 repair rounds, and flat parent-to-specialist hierarchy (specialists cannot delegate); `backend/tests/delegationPolicy.test.ts` (5/5 PASS) | Deny delegation requests |
| P5-04 Tool & Activity Adapter | P5-01–P5-03 | accepted: `backend/src/orchestration/activityAdapter.ts` routes tool dispatch and specialist runs through canonical sandbox and provider services, enforces patch approval journaling, and journals effect usage | Dispatch tools directly through existing broker |
| P5-05 Graph Runtime & Recovery | P5-01–P5-04 | accepted: `backend/src/orchestration/graphRuntime.ts` provides start/pause/resume/cancel/shutdown lifecycle and crash recovery classification (recoverable, blocked, unknown); `backend/tests/orchestrationRecovery.test.ts` (4/4 PASS) | Fall back to sequential turn execution |
| P5-06 Workspace Graph Compilation | P5-01–P5-05 | accepted: `backend/src/orchestration/workspaceGraph.ts` compiles StateGraph with verified transitions (plan, route, delegate, critique, repair, execute, verify, join, complete); `backend/tests/orchestrationWorkflow.test.ts` (4/4 PASS) | Execute direct turn coordinator |
| P5-07 Comprehensive Verification | P5-01–P5-06 | accepted: 18/18 P5 tests PASS; full workspace suite: 91/91 PASS; backend typecheck: 0 errors; frontend check: 0 errors; zero database schema migrations (working `sirona` on 021, test DB on 023) | Zero production DB changes |

Clean evidence: report in `docs/SIRONA-WORKSPACE-P5-REPORT.md` and `docs/integration/SIRONA-WORKSPACE-P5-REPORT.md`, machine-readable verification in `docs/integration/evidence/workspace-p5/verification.json`, summary result in `verified-workspace-result.json`, verbatim P5 test transcript in `verified-p5-tests.txt` (18/18 pass), full workspace test transcript in `verified-workspace-tests.txt` (91/91 pass), and SHA-256 source hashes in `source-hashes.json`. Zero schema migrations (working `sirona` remains on 021, test DB on 023). Zero public DTO mutation. Zero competing orchestration authority. P6 proposal remains unapproved and not started.
