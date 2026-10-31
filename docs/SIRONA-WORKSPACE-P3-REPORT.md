# P3 trusted-local Docker + WSL2 Home profile — correction and acceptance

2026-10-29. **Home profile scoped verification PASSED.** This report supersedes the earlier unsupported completion claim, preserved in `sironadocs/evidence/workspace-p3-docker/superseded-p3-report.md` and the private pre-correction checkpoint. Earlier 45-test/image claims are historical, not current qualification.

## Authorized scope and meaning

The owner explicitly approved **"Approve a trusted-local-project Docker profile"** after a question explaining that this does not qualify the original hostile-code/VM boundary. This is the Windows Home P3 profile only. Hyper-V remains unavailable on this host. Native Windows guest workloads, hostile-code isolation and production release qualification are not claimed.

Working PostgreSQL data and /api/v1 chat/provider contracts are preserved. No migration was applied in this correction. New execution requires migration 022 plus `SIRONA_TRUSTED_LOCAL_DOCKER_ENABLED=true`; the new flag defaults off and is enabled only inside the guarded isolated test fixture. A successful qualification record cannot activate the working installation. Production migration/activation, privileged installation, commits/push/deployment and P4+ work remain separately gated.

## Implementation and real workflows

| Task | Implementation / owning files | Acceptance |
| --- | --- | --- |
| D1 fixed worker and containment | `tooling/sirona/docker/worker.Dockerfile`, `backend/src/windows/dockerRuntime.ts` | Actual Node guest, UID 10001, read-only root, capability drop, no-new-privileges/seccomp, no bind mounts/daemon socket/host drive, no network route and failed egress. Kernel tmpfs ENOSPC, PID denial and memory OOM; daemon remains available. |
| D2 snapshot and approved host patch | `backend/src/workspace/{workspaceBroker,nativePatch,patchService,homeProfile}.ts`, `tooling/sirona/native/windows-broker/patch.ps1` | Real HTTP tool invokes Node inside Docker, persists a receipt/preview, leaves host unchanged, then exact separate approval applies through Windows handles. Replay returns stored receipts. Concurrent host edits survive rejection; reconciliation reads hashes and never repeats a mutation. |
| D2 canonical terminal | `backend/src/windows/{terminalService,canonicalTerminal}.ts`, `backend/services/terminalGateway.js` | Durable ownership, bounded live PTY, resize/interrupt, per-input exact approval and submission receipts, one-use 30-second hashed tickets, exact Origin/Host, session/grant/fence rechecks, bounded frames/connections/output/idle/lifetime and confirmed termination. Real WebSocket runs through the Electron proxy. Replayed input is not resent; revoked identity stops the process tree. |
| D3 existing-service integration | `backend/services/{toolRuntimeService,agentWorkerService,sandboxManager,isolationBrokerService,socket}.js`, `backend/foundation/{admission,production}.js`, `backend/routes/{index,v1/workspace.routes}.js` | Existing canonical identity, grants, contract approval, policy, task lease/fence, effect journal and receipts govern dispatch. No host/WSL execution fallback. Legacy Socket.IO remains denied. P5 agent orchestration is not claimed complete. |
| D4 existing persistence | Migration 010 isolation records, existing grants/artifacts/approvals/runs/tasks; P1 migration 022 only on the approved test target | No new tables or DDL. Stable operation keys, exact approval consumption, global Home-worker advisory lock, durable container bindings and quarantined hash-checked artifacts. Qualification workers also persist ownership before probes. Root-registration retries reuse the same grant and cannot revive revocation. |
| D5 independent and recovery checks | `backend/tests/{dockerCanonical,dockerContainment.integration,dockerRecovery,nativePatch,workspaceBroker}.test.ts` | A real killed Node control plane recovers only its PostgreSQL-bound container; an uncertain dispatched effect cannot replay. A fresh separate Node container accepts the exact produced artifact digest and rejects a wrong one. |

The runtime image is pinned to local immutable image ID `sha256:7c9a2b1782ecac683ad7cad209114702d5440f10005d5da74ef6060e739cdd39`; the base is `node@sha256:2a49bdf71e9fd965a58c1703fd9ddd205b34e5782b692a72dd1d248abb0beb43`, actual Node v24.19.0. No tag/fallback image or implicit pull is admitted. Limits: 2 GiB memory with no extra swap, 2 CPUs, 100 PIDs, workspace tmpfs up to 256 MiB, /tmp 64 MiB, combined output 1 MiB. One active Home worker globally; qualification cannot overlap it. Bindings recheck image/manager/project/run/task identity.

Qualification expires after eight hours and binds the current image, runtime/security code and Windows helper digest. Artifacts stay outside project roots under a protected, owner/SYSTEM-only Windows ACL; reparse ancestors and unexpected grants fail closed. Snapshot export excludes credentials and control-plane storage. No provider key or database credential is mounted or inherited by the guest.

The Windows patch helper is an integrity-checked normal-user broker, not a signed privileged service. It holds ancestor/file handles, rejects junctions/hardlinks, checks locked preimages, watches its actual Node parent and journals before effects. Multi-file application is **not atomic**: mixed/uncertain outcomes remain unknown for reconciliation. A running Sirona installation cannot patch itself; use a separate development checkout. Signing/distribution and clean-host production qualification remain P8 gates.

## Routes, clients and frontend preservation

New scoped /api/v1 contracts: POST `/projects/:projectId/workspace-root`; POST `/projects/:projectId/isolation/docker-qualification`; GET `/projects/:projectId/docker-workers`; GET `/projects/:projectId/files` and `/file`; GET `/projects/:projectId/patch-previews/:artifactId`; POST its `/apply`; POST `/projects/:projectId/patch-effects/:effectId/reconcile`; POST `/projects/:projectId/docker-workers/recover`; POST `/projects/:projectId/terminals`; POST `/terminals/:terminalId/ticket`; DELETE `/terminals/:terminalId`; WS `/terminals/:terminalId/channel`.

Root registration, command dispatch, patch application, terminal creation/input have durable replay protection. Qualification is a fresh bounded diagnostic attempt, not a replayed user command; ticket minting replaces a short-lived one-use credential. Recovery never automatically retries an uncertain command or patch. Unknown create acknowledgements without a persisted binding remain unresolved and block new dispatch.

`frontend/sirona-next/src/api/workspace.ts` uses the existing authenticated/CSRF transport in `src/api/client.ts`, adding idempotency headers and validated contracts. `electron/terminalProxy.cjs` and `electron/main.cjs` expose only the exact local terminal channel. Current React views, typography, colors, density and composer are unchanged; built UI asset names/hashes remain unchanged. Workspace panels, xterm.js/Monaco/React Flow and state-store surfaces belong to P7 and are not marked integrated by this P3 transport.

Dependency: existing transitive `ws` is now explicit and pinned at 8.22.0, lockfile updated with scripts disabled; install audit reported zero vulnerabilities. Official transport reference: [ws server/upgrade documentation](https://github.com/websockets/ws/blob/master/doc/ws.md). Existing provider SDKs remain unchanged.

## Verification and failures repaired

- Strict backend workspace build passes.
- Earlier clean full workspace pass: 60/60, zero failures/skips (`qualification-final-tests.txt`). Final source was recaptured directly by Node in `verified-workspace-tests.txt` and `verified-workspace-result.json` to avoid PowerShell interpreting helper progress as CLIXML.
- Existing guarded chat/execution regressions: 72/72 (`preserved-regression-tests.txt`).
- Production/lifecycle owner tests: 46/46 (`lifecycle-verified-tests.txt`). Initial sandboxed listener run did not complete and was stopped; it is not a passing result.
- Frontend typecheck/lint, five SSE tests and production build pass. Existing bundle-size warning remains; it was not suppressed. No new visual redesign or new P7 UI acceptance is claimed.
- Fixed the terminal closure SQL parameter ambiguity; recovered only its identified failed test fixture after confirming the container binding. Added closure replay, missing-ID, cross-workspace and identity-revocation tests. Fixed concurrent close coordination and preserved the same-client advisory-lock owner.
- Suppressed PowerShell first-use progress and explicitly piped helper output after it corrupted an evidence transcript. Corrupted `gateway-final-tests.txt` is retained but excluded from acceptance.

Full legacy static findings remain outside this scope (39 previously recorded issues); this work does not claim a globally green legacy tree. Test data is confined to `sirona_workspace_p0_test_20261028`; fixtures remove only their own rows/directories and known bindings. No working database credential/schema conversion occurred.

## Rollback and next gate

Leave the profile flag false; stop only owned sessions/containers by persisted identity, preserve unknown effects and journals, and reconcile before any new operation. Never globally prune Docker, shut down WSL, reset PostgreSQL, restore insecure old host paths or re-enable fallback execution. Private source checkpoint: `integration/evidence/workspace-p3-docker/private/before-correction.json.gz`; current source hashes are in the verification manifest.

P4 is not started. Its exact provider/dependency/test scope is proposed in `SIRONA-WORKSPACE-P4-APPROVAL.md`; Stage 17 requires separate owner approval. LangGraph, MCP, code intelligence, workspace UI and release work remain P5–P8, with their existing gates.

Final clean capture: 60 passed, zero failures/cancellations/skips, exit 0 (verified-workspace-result.json). Read-only preservation/cleanup: working 21 migrations, isolated 23, zero active Home workers and zero remaining containers for the qualified image, production flag false; 27 source hashes in current-verification.json.

Final clean capture: 60 passed, zero failures/cancellations/skips, exit 0 (verified-workspace-result.json). Read-only preservation/cleanup: working 21 migrations, isolated 23, zero active Home workers and zero remaining containers for the qualified image, production flag false; 27 source hashes in current-verification.json.
