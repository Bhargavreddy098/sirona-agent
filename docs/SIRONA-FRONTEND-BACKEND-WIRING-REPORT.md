# P1–P5 frontend/backend wiring — scoped verification

Updated 2026-10-30. **The owner-approved wiring slice is implemented and verified. This is not production activation, complete P5 real-provider acceptance, or completion of P6–P8.**

Authority: the owner explicitly answered “Approve this scoped backend/frontend wiring” for [the exact proposal](SIRONA-FRONTEND-BACKEND-WIRING-APPROVAL.md). The earlier no-charge instruction remains effective. Tests mutated only `sirona_workspace_p0_test_20261028`. No migration or working-data conversion was performed.

## Delivered surfaces and owners

The existing compact light `frontend/sirona-next` shell now opens a Project workspace with Runs, Planning, Files, Approvals, Terminal and Workers. Concurrent owner/tool font and navigation changes were retained. The obsolete `frontend/sirona` was not restored.

| Surface | Actual integration | Practical boundary |
| --- | --- | --- |
| Runs | Canonical run/task/agent/effect/checkpoint/verification records, durable SSE, decimal-string cursors, pause/current-epoch resume/cancel, explicit execution confirmation | Saved records are displayed as records; no synthetic agents, progress or verification passes. Cancel remains usable during an in-flight execute request. |
| Planning | Existing goals, immutable layered revisions, exact contract/digest approval, real saved snapshots and bounded run preparation | Preparing a run is distinct from executing it. Missing prerequisites and disabled orchestration remain visible. |
| Files | Registered-root/grant checks, paginated actual file enumeration, bounded UTF-8 source and digest | Read-only file viewer; Monaco editing, Git tooling and host save are not claimed. Directory metadata alone grants no authority. |
| Approvals | Existing contract decisions plus new durable prepared graph command/patch and terminal actions; native review dialogs | Server selects the current event/digest. One-time nonce proofs stay in component memory and are not saved, logged or retrieved from lists. Lost proofs require explicit replacement. |
| Terminal | Pinned `@xterm/xterm` 6.0.0 and `@xterm/addon-fit` 0.11.0; actual authenticated WebSocket and Docker/WSL2 PTY; server-owned task fencing/renewal | Fixed guest shell; every input is separately prepared, reviewed, approved and submitted. Receipt proves input submission, not command correctness. No host-shell fallback. |
| Workers/readiness | Existing scoped worker inventory and recovery, read-only flags/qualification/grants; guarded terminal recovery confirmation | A saved running worker after backend death is not presented as a usable PTY. Recovery confirms termination and never replays effects. |
| Provider security | Existing native broker protection metadata exposed in Settings Security | Browser preview truthfully lacks native credential access. No raw credential enters the renderer. This does not requalify the native credential broker. |

New styles are scoped to the workspace. The sidebar toggle received a focused class-name repair: Tailwind's `collapse` utility had hidden the original control. xterm is lazy-loaded. Its clipboard and output hyperlink OSC handlers are disabled; terminal output cannot submit input directly.

## Exact backend slice

New `backend/src/workspace/frontendController.ts` coordinates existing owners; it adds no persistence table, orchestrator or lease framework. It requires an authenticated workspace owner, scoped run/root/grants, current contract/policy/epoch and exact action digest. New routes, all under `/api/v1`:

1. `GET /projects/:projectId/workspace-readiness`
2. `POST /runs/:runId/approval-requests`
3. `POST /projects/:projectId/terminal-preparations`
4. `POST /projects/:projectId/terminal-preparations/:preparationId/open`
5. `POST /terminals/:terminalId/input-preparations`

`backend/routes/v1/{execution,workspace}.routes.js` supplies these adapters and uses the existing close/recovery routes for confirmed cleanup. `backend/foundation/admission.js` adds only their exact approved method/path entries; unknown paths remain denied.

`backend/services/governanceService.js` accepts an optional existing transaction client for the new proof/decision slice, retaining old callers. `backend/services/executionService.js` reserves blocked `ui:terminal:` tasks, excludes them from ordinary worker claims, and keeps cancellation pending while a guest or uncertain effect remains. `backend/src/orchestration/graphRuntime.ts` records version/epoch/root/action metadata on existing approval-required events. `backend/src/orchestration/activityAdapter.ts` passes its already validated project ID into the existing provider parameter, preserving project attribution in model-call records. No provider API or SDK selection contract changed.

Terminal reservations have a five-minute review deadline; approved live terminals retain the existing bounded lifetime and renewal owner. Preparation/proof/input keys cannot be reused for a different source. Plaintext nonce recovery is deliberately unavailable. Uncertain dispatch stays uncertain and is not automatically repeated.

## Verification and evidence

Evidence directory: [frontend-p1-p5](integration/evidence/frontend-p1-p5/). Current source hashes and verification summary are recorded there.

| Check | Observed result | Evidence |
| --- | --- | --- |
| New API/lifecycle integration | **4/4 PASS** | `backend-wiring.txt`: real PostgreSQL, scoped/CSRF/worker/root denial, racing preparations, proof replacement/replay, stale epoch, actual guest input, lease renewal and expiry, cancelling until stopped, real owning-Node SIGKILL and explicit recovery without replay |
| Browser journey | **1/1 PASS** | `browser-integration.txt`, `browser-integration.json`: actual HTTP/SSE, registered bytes/digest, canonical requirement/plan/contract revisions, wrong/correct nonce decisions, actual xterm/WS/guest output, recovery dialog Escape, confirmed close, 390px layout, in-flight cancellation and session revocation; zero page errors |
| P5 regression | **22/22 PASS** | `free-p5-tests.txt`, `free-verification.json`: controlled local upstream, actual SDK/SQL/graph, public prepared approval APIs, guest command, approved host patch, independent verification and real crash/recovery checks |
| Frontend stream tests | **8/8 PASS** | Existing stream and new ordered-run SSE suites; split UTF-8/CRLF, decimal cursors, replay denial, errors and cancellation |
| Static/build checks | **PASS** | Backend `build:workspace`; frontend `check`, `build`, `lint`, `build:electron`; current build follows current source |
| Impeccable detector | **0 findings** | Scoped workspace components/CSS and native security-status surface |
| Database preservation | **PASS** | `database-preservation.json`: read-only checks show working `sirona` remains at 21 migrations, isolated test database at 23, with both working execution flags OFF |
| Preview/runtime read-only checks | **PASS** | `runtime-readonly-checks.json`: preview `/`, legacy fixture URL at 5178 and existing backend `/health` return HTTP 200; zero outstanding Home-profile test workers |

The browser uses a test-only bootstrap bridge with legitimate isolated session cookies and the production Electron terminal proxy. It does not bypass production desktop authentication or prove native packaging/credential E2E. Its pending-execute response is deliberately held locally to test Cancel; that response is not inference evidence. Actual PTY bytes, file reads, approval decisions and cancellation go through the real isolated backend.

The P5 upstream is a controlled transport fixture with dummy credentials, not a real model. No API charges were incurred. **Real-provider P5 workflow/repair/crash qualification remains UNVERIFIED.** Earlier P4 evidence is historical acceptance, not a new paid run.

Failures were corrected rather than hidden: incomplete test contract setup was replaced by canonical immutable revisions; a PostgreSQL text/UUID reconciliation mismatch was repaired; public approval flow exposed missing project attribution, corrected at the existing activity call; a transient Docker availability failure was retained under `diagnostics/` and the unchanged suite rerun after a read-only healthy-engine check. The tested limits and security checks were not weakened.

Screenshots: `01-runs.png`, `02-files.png`, `03-files-mobile.png`, `04-terminal.png`. The terminal screenshot contains actual `BROWSER_PTY` guest output. Older failure captures are diagnostic history, not current acceptance evidence.

## Rollback and remaining gates

Before-change sources are retained privately under `.tmp/frontend-p1-p5-20261029/` and `.tmp/frontend-backend-wiring-approved-20261029/`; the latter includes mirrored backend paths and the activity adapter checkpoint. Restore only reviewed files from this slice if required. Do not reset the checkout or overwrite concurrent shell/provider work. No schema rollback is needed. Existing terminal workers must be explicitly stopped/reconciled before replacing their owner process; unknown effects must not be replayed.

The existing running desktop/backend may need a normal restart to load updated modules. This task did not terminate the user's pre-existing backend or activate its execution flags. Working `sirona` remains on 021: the separately approved execution migration rollout and production activation gates are still prerequisites for using these execution features against working data. Browser preview at 5178 retains desktop-authentication limits.

xterm API integration follows its official [addon guide](https://xtermjs.org/docs/guides/using-addons/) and [terminal options reference](https://xtermjs.org/docs/api/terminal/interfaces/iterminaloptions/). Qualification above comes from the actual tests, not the existence of these references.

Monaco editing, React Flow, Zustand/TanStack Query, MCP/code intelligence and broader P7/P8 qualification retain their existing phase gates. This slice neither marks them complete nor authorizes their implementation. Vite still reports the existing large main-bundle warning; the terminal chunk is separate. Packaged Windows, performance and hostile-code qualification are not claimed by these checks.
