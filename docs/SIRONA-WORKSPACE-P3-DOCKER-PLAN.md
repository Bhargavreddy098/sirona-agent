# P3 Docker Desktop + WSL2 Home execution plan

> Current amendment, 2026-10-29: after the explicit question distinguishing this profile from hostile-code/VM isolation, the owner answered **"Approve a trusted-local-project Docker profile"**. This authorizes the reduced Home threat model only. Preserve exact host patch approvals, root grants, resource limits, recovery and fail-closed behavior. No privileged installation, working-database migration/activation, host shell fallback, commits/push/deployment or P4+ work is authorized. References below saying no reduced profile is approved describe the earlier checkpoint and are superseded only for this Home profile. The trusted-local Home P3 scope is now verified; use the corrected report and current-verification.json, not the older status prose below.

Current implementation extends existing services and migration 010 records; no new schema is needed so far. The working database remains on 001–021 and new execution requires 022, so it remains unavailable there. The isolated approved test database is the only integration-write target. The normal-user Windows patch helper is integrity checked and journaled; it is not represented as a signed privileged service. Canonical terminal ownership/authenticated transport, actual Electron proxy and killed-control-plane recovery now have fresh E2E evidence. Production activation stays off; no hostile-code/VM boundary is claimed.

2026-10-29. Owner selected: "use docker and wsl2 because i've already installed docker in local". This supersedes the unselected VirtualBox proposal as the Home runtime direction. P0–P2 remain accepted within their recorded scope. This direction does not waive security criteria, authorize arbitrary host execution, apply migrations, enable privileged features, or qualify production isolation.

## Verified readiness and unresolved boundary

Read-only diagnostics establish Docker Desktop Linux client/server 29.4.3, desktop-linux context, cgroup v2, built-in seccomp and cgroup namespaces, about 3.75 GiB engine memory; WSL 2.6.3.0 with Ubuntu and docker-desktop running in WSL2. Evidence: integration/evidence/workspace-p3-docker/readiness.json. No image was pulled, container started, setting changed or installation performed.

Docker/WSL2 is the selected P3 qualification target for Home. Earlier Hyper-V and Windows-guest implementation details are superseded for this profile; Hyper-V is not marked implemented. Native Windows-specific guest workloads remain unavailable in the Linux profile. All other selected technologies and existing UI/backend/API/data boundaries remain.

Microsoft explicitly says WSL is not a security sandbox for untrusted code. Docker adds namespaces/cgroups/capability/seccomp controls, but its installation and default profile are not proof of the original hostile-code boundary. Do not present successful container startup as qualification. Maintain the current execution deny gates while investigating. If the original required boundary cannot be established, report a blocker; enabling a reduced, trusted-project-only profile would require an explicit owner decision about that changed threat model. The Docker selection alone is not such a waiver.

## Trusted control plane and container contract

Retain Windows Electron, Express, PostgreSQL, P2 DPAPI, approvals/contracts/effects/leases and existing provider integration. Only the trusted backend broker accesses Docker. Renderer, model, project process and MCP server never receive the daemon pipe/socket, Docker CLI credentials, host environment, provider keys, database connection, host home or Windows filesystem mounts.

Each run uses one owned, digest-pinned, reviewed Linux worker image and non-root process. Define capability-dropped, no-new-privileges, read-only-root, default seccomp, isolated PID/IPC, no network/host networking, no published ports, no devices and no privileged profile. Use explicit CPU/memory/swap/PID/output/deadline limits. Begin with one active container globally and a measured 2 GiB/2-vCPU trial; qualify actual capacity on this 8 GiB host rather than changing global WSL settings. Do not stop Ubuntu or Docker Desktop, alter other containers, change context or prune shared resources.

Transfer an authorized snapshot into a dedicated per-run container workspace using bounded broker-controlled archives. No host bind mounts, named pipes, symlink/hardlink/path escapes or unbounded docker cp extraction onto Windows. Validate tar members and sizes before transfer/import. Use a bounded dedicated writable area and tmpfs where feasible. A real disk limit is an acceptance prerequisite: unsupported Docker volume/storage quota options cannot be replaced by a false claim that output limits or periodic monitoring enforce a hard disk cap.

Commands/terminal PTYs run inside the container through the versioned worker protocol, never raw wsl.exe project commands or host node-pty. Model inference stays in the existing trusted provider service. Project network access is denied by default; any dependency-fetch facility needs the separate typed, policy-checked fetch broker and reviewed artifacts. No generic proxy, daemon mount, host-network shortcut or unrestricted package lifecycle step on Windows.

Ownership labels plus persisted container ID/image digest/run/task/generation bind start/exec/attach/stop/remove. Every operation rechecks grants, contract, lease and fencing. Never execute an arbitrary model-generated Docker command. Cancellation stops dispatch and terminates only owned execution; unknown effects are reconciled before resume. Apply approved changes to the real project only through the canonical host path/patch broker, exact base hashes, preimages and durable journal. Independent verification uses a fresh container and exact artifact digest.

## P3 sequence, files, tests and gates

| Task | Dependencies and exact proposed scope | Required evidence / completion | Rollback / authorization |
| --- | --- | --- | --- |
| P3-D0 Readiness | Existing Docker/WSL; integration/evidence/workspace-p3-docker/readiness.json | COMPLETE for read-only reachability only; installation != security | No host or runtime changes |
| P3-D1 Image/security qualification | New tooling/sirona/docker/worker.Dockerfile; backend/src/windows/dockerRuntime.ts; backend/tests/dockerContainment.integration.test.ts | Real non-root/read-only/capability/network/secret/path/resource tests; digest, quota and protocol qualification | Concrete image/network/runtime operation scope reviewed before effectful tests; no speculative downloads/privileged installs |
| P3-D2 Broker/workspace/terminal | New backend/src/windows/dockerWorkerAdapter.ts, backend/src/workspace/workspaceBroker.ts, backend/src/windows/terminalService.ts, tooling/sirona/src/guest/agent.ts | Real snapshot/read/edit/test/PTY/resize/cancel/patch preview and approved apply; no daemon/host access from worker | Stop dispatch and preserve journals; no host fallback |
| P3-D3 Existing-service integration | Protected backend/services/{sandboxManager,isolationBrokerService,toolRuntimeService,workspacePathResolver,agentWorkerService,workflowOrchestratorService}.js; backend/src/security/executionPolicy.ts; backend/foundation/{admission,production}.js; existing isolation/tools routes; new workspace routes only if absent | Workspace ownership/CSRF/grants, supported profile, image identity, lease fencing, effect receipts, failed prerequisites all enforced | Separate exact protected-file approval before modification; never rename managed_hyperv guards as a bypass |
| P3-D4 Durable metadata | Reuse existing isolation/run/effect records; inspect schema and next migration number; versioned SQL only if necessary | Same-client transactions, scoped references, concurrency/restart, migration/rollback tests | Present exact SQL and named-target approval; no automatic migration of working sirona |
| P3-D5 Acceptance | D1–D4; backend/tests/{dockerRecovery,workspaceBroker}.test.ts; real desktop/worker evidence | Forced worker death, stale owner, duplicate delivery, cancel, full disk/OOM/PID/timeout, artifact quarantine, clean independent verifier; zero unexplained owned orphans | Failure/unknown blocks admission; no production or hostile-code qualification from green unit mocks |

Existing canonical workspace APIs, root-relative paths, scoped terminal WebSocket and project patch contracts remain as specified in the P0–P8 plan. No API contract change or UI redesign is part of runtime selection. P4–P8 still follow accepted P3 in sequence; they cannot activate tools/execution around a failed isolation gate. All modes continue denying commits, pushes and deployment in the first release.

## Current status and next concrete approval

SUPERSEDED CHECKPOINT: this paragraph records the earlier D0-only status; current D1–D5 trusted-local acceptance is in the corrected P3 report. Existing production execution/admission rules unchanged. Next work is an exact image/security qualification manifest, including local images available, reviewed image digest/Dockerfile, resource/storage constraints, concrete create/exec/cleanup operations, affected protected files and test evidence paths. Existing dependencies and runtime remain authoritative; do not add another orchestrator or alter PostgreSQL/UI.

## Official evidence

- Docker Desktop WSL2 behavior: https://docs.docker.com/desktop/features/wsl/
- Docker daemon/container security: https://docs.docker.com/engine/security/
- Microsoft WSL trust boundary: https://github.com/microsoft/WSL/blob/master/doc/docs/technical-documentation/security.md
