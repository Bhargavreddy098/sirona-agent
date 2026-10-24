# Cross-check of Sirona stages 1–15

Checked 24 October 2026 against HEAD `24e7737`. The Git history contains implementation commits for all fifteen stages. This is an updated audit of the current source; the earlier `docs/hermes-parity/current-sirona-audit.md` describes an older workspace state.

Build verification: `npm run build` in `sirona-ui` succeeded. Frontend verification: `npm test` succeeded, **12 files / 85 tests**. These tests cover isolated stores/protocol helpers and do not establish installed Electron, real model, native PTY or full Hermes parity. No packaged application was launched.

## Stage accounting

| Stage | Commit | What exists now | Cross-check verdict / remaining gate |
|---|---|---|---|
| 01 Desktop foundation | `3d13bec` | Electron shell, shared package, frontend build | Build verified. The renderer remains a custom `src/App.tsx` composition, not the reference contribution-driven tree and route system. Exact UI parity remains open. |
| 02 Gateway/reconnect | `f1f9911` | JSON-RPC client/dispatcher and protocol tests | Partial. Shared contracts are present, but server uses custom `/ws/gateway` framing and broadcasts every event to all connected clients. Canonical authority, private authentication, revision/generation fencing and per-owner replay require comparison. |
| 03 Storage | `afbaefc` | Expanded repositories/migrations, branching/rewind/checkpoints/search | Implemented source exists; backend suite and clean-install migration gate unverified. `main.py` imports `init_db` without calling it in `create_app`; initialization via other launch paths must not be mistaken for fresh serve initialization. |
| 04 Scheduler | `853f78c` | `agent/scheduler.py` starts background tasks and queues turns per session | Real improvement: prompt scheduling is no longer only a blocking turn loop. Queue/active state is in-memory dictionaries; crash durability, deduplication and canonical receipts remain open. Run status still returns fabricated completed status/usage. |
| 05 Streaming | `c9c772b` | Aggregator, reasoning/tool cards and tests | Unit tests pass. Actual provider streaming is blocked by placeholder Gemini/OpenAI adapters; cross-session and reconnect behavior are not established by helper tests. |
| 06 Artifacts | `504efff` | Extraction/store/preview modules and seven frontend tests | Present; full source-backed artifact ownership, serving, CSP/guest navigation and native window behavior still require integration verification. |
| 07 Clarification | `7b42420` | ClarifyManager, runtime ask_question interception, frontend cards and six tests | Present; this corrects the earlier audit's “absent” finding. Full partial-answer replay, cancellation, competing viewers, expiry and generation fencing remain unverified. |
| 08 File workspace | `09d1561` | File APIs/tree/search/viewer and five frontend tests | Present; real filesystem integration and path-policy checks remain. Generic `/api/tools/execute` is still broken (`get` versus `get_tool`, nonexistent `tool.execute`), so consumers of that route cannot work as written. |
| 09 Git/worktrees | `ca40307` | Git modules/review UI and seven frontend tests | Present; verify real Git operations and compare the reference branch/worktree/native IPC surface. No real repository mutation was performed during this review. |
| 10 PTY terminal | `98119fa` | Terminal tabs/history/ANSI parser, WebSocket pipes; six frontend tests | **Completion claim contradicted by source.** `terminal/session.py` launches `cmd.exe`/shell with subprocess PIPEs. `resize` only changes fields. No ConPTY/node-pty/xterm dependencies appear in the UI manifest. This is not reference PTY functionality. |
| 11 Settings/models | `bca082b` | Settings repository/store/UI and six frontend tests | Present; persistence and effective runtime settings must be distinguished. `main.py` still supplies `provider_router.gemini` to one runtime and provider adapters yield placeholders. Selecting a model has not established real provider execution. |
| 12 Lineage/rewind/Starmap | `16ae523` | Repository operations, RPC paths, topology store/UI and five frontend tests | Present; verify actual lineage identity, compression continuation and runtime-safe mutations against the reference. |
| 13 Palette/slash | `799955d` | Palette/fuzzy search/session/slash helpers and five frontend tests | Present; all reference commands, extension discovery, owner-scoped completions and execution dispositions still need mapping. |
| 14 Telemetry/diagnostics | `b44c492` | System metrics/diagnostics/latency UI and five frontend tests | Present; reference opt-in shared telemetry is a distinct system. Verify health/degraded states and actual measurements end to end. |
| 15 Packaging | `8318a03` | electron-builder config and platform targets | **Partial.** `electron-builder.json` includes renderer/Electron/package files but no Python backend payload. `electron/main.cjs:ensureBackendRunning` still searches a sibling development `.venv/Scripts/python.exe`. Standalone installation is not complete; signing/update/install tests were not run. |

All rows distinguish source presence from operational completion. The passing frontend build/tests are real evidence, but do not certify fifteen completed Hermes-equivalent stages.

## Source-proven blockers

1. `sirona-core/sirona/providers/gemini.py:stream_chat` constructs a client then yields empty text; `providers/openai.py:stream_chat` does likewise. Real prompts/tool turns cannot be certified from mocked providers.
2. `sirona-core/sirona/mcp/client.py` still has a `pass` connect, empty tool list and fabricated execution string. Capability reporting currently advertises MCP despite that stub.
3. `sirona-core/sirona/terminal/session.py` is pipes, not a PTY; full-screen terminal applications and actual resize are not implemented there.
4. `sirona-core/sirona/api/routes/runs.py:get_run` returns fixed completed state and token counts; `steer_run` only acknowledges. Scheduler existence does not make these correct.
5. `sirona-core/sirona/api/routes/tools.py:execute_tool` calls missing registry/member interfaces. The registry exposes `get_tool` and registry-level `execute`.
6. `sirona-core/sirona/api/websocket/events.py` has one global client set and sends all events to every socket, without authenticated owner-scoped subscriptions.
7. Desktop packaging lacks a self-contained backend, and `src/App.tsx` does not implement the reference route/contribution system.

## Revised continuation order

Preserve completed modules and commits; do not restart the project or overwrite work. Close the real-provider, startup/storage, tool-dispatch and owner-scoped event gaps first. Finish question/approval integration and actual PTY next. Reconcile the route/component/API matrix against the reference before claiming frontend parity. Bundle the backend and test clean-machine installation last. Treat the stages above as existing implementation work with outstanding acceptance gates.

The backend test attempt using the project virtualenv produced no result and was interrupted after a bounded wait. A system-Python retry likewise produced no result during the bounded verification window and was interrupted; neither is recorded as a passing suite. No application source was edited by this audit.
