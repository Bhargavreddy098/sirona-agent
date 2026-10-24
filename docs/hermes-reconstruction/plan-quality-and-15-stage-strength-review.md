# Plan quality and strength of the fifteen implemented stages

Reviewed 24 October 2026 against workspace HEAD `24e7737`, the newly supplied attachment, and the local Hermes source/build evidence. No application implementation changes were made.

## Verdict

The architecture direction of the migration plan is sound: preserve the actual desktop source, native bridge, canonical runtime ownership and shared contracts together. The plan is **not yet an exhaustive, implementation-ready specification** under the attachment's requirements. The fifteen implemented stages form a useful development foundation, but **are not strong enough to certify Hermes desktop parity or a standalone production release**.

All fifteen stage commits exist. That proves work was committed, not that its advertised behavior works end to end. The earlier successful frontend build and 85 tests at this same HEAD are valid evidence for those checks only. They were not repeated for this documentation/source review. Backend tests, a packaged clean-machine launch, real-provider execution and pixel parity remain UNVERIFIED.

## Assessment of my previous plan and report

| Part | What holds up | What must change |
|---|---|---|
| Source port strategy | Correctly avoids recreating the UI from screenshots; includes shared/native/runtime dependencies | Resolve the strategy against the actual current code: it is still a custom frontend/runtime, not the completed source port |
| Authority model | Correctly separates Electron, renderer and backend responsibilities | Name the one authority for every field and action; explicitly choose canonical-compatible adapters or vendored runtime, never two independent session engines |
| Feature coverage | Route, bridge, component, schema and settings catalogs supply useful accounting | Lexical inventories are discovery aids. They do not prove every mounted component, dynamic route, handler effect or state transition has been specified |
| Version/provenance | Source and shipped artifact identities are recorded | Freeze one baseline; resolve source/package dependency drift before implementation. Do not rebuild current source and call it exact shipped-version parity |
| Stage ordering | Runtime/contracts before complete integration is appropriate | Require secure owner-scoped transport and durable admission before accepting streaming/approval/recovery stages |
| Acceptance tests | The proposed real-provider, recovery, PTY and installed-app scenarios are appropriate | Turn each into a named test with expected wire frames, state transitions, durable writes, failure result and retained evidence |
| Implementation detail | Domain chapters contain substantial source traces | The requested per-stage modules, schemas, errors, events, DB effects and “not yet” constraints are not closed for every feature. Unknown cells must block acceptance, not disappear into prose |
| Completeness claim | The reconstruction's final audit explicitly admits its limits | Forty headings and large catalogs do not satisfy the “source disappears tomorrow” requirement. My earlier “planning complete” wording was too strong for the expanded task |
| Current status | Historical documents explain the initial scaffold | Statements such as “implementation has not started,” absent clarification, and fully blocking prompt dispatch are stale for the current implementation. Use the newer stage audit |
| Bot scope | Full reconstruction now includes bots, groups and screen; original Sirona port excluded bots | Keep reference discovery complete and product exclusions explicit. Do not count excluded features as implemented or silently expand the product scope |

The old architecture plan contains fourteen numbered implementation tasks, while Git history contains fifteen different stage commits. Their numbers are not interchangeable. The commit-based stage list in `stages-01-15-cross-check.md` is the implementation baseline for this review.

## Current blockers, directly supported by source

| Priority | Evidence | Consequence |
|---|---|---|
| Release blocker | `sirona-core/sirona/providers/gemini.py:24` and `providers/openai.py:19` yield empty text after constructing SDK clients | No real provider request/stream is implemented in those paths; store/protocol tests cannot certify a working agent |
| Release blocker | `sirona-core/sirona/main.py:88` supplies `provider_router.gemini` to the runtime | A saved/picked model has not established effective per-session provider routing |
| Release blocker | `sirona-core/sirona/api/websocket/gateway.py:10,43` accepts sockets without an authentication check on these routes; `events.py:16` broadcasts to its full client set | No reference-equivalent authenticated, owner-scoped event/control boundary is established in these handlers |
| Functional blocker | `sirona-core/sirona/api/routes/tools.py:44,49` calls `tool_reg.get` and `tool.execute`; `tools/registry.py` exposes `get_tool` and registry-level `execute` | The generic tools endpoint fails as written; completing a viewer does not repair its backend contract |
| Functional blocker | `sirona-core/sirona/mcp/client.py:13–24` has a pass connect, empty tool discovery and a fabricated result string | MCP is not operational despite capability metadata advertising it |
| Functional blocker | `sirona-core/sirona/terminal/session.py:25,58` uses subprocess pipes; resize only changes Python fields | Stage 10 is not a PTY/ConPTY implementation and cannot meet reference terminal semantics |
| Durability blocker | `sirona-core/sirona/agent/scheduler.py` stores active/queued turns in dictionaries | Background scheduling exists, but accepted work has no equivalent durable admission/receipt/recovery contract |
| Truthfulness blocker | `sirona-core/sirona/api/routes/runs.py:41–47,74` returns fixed completion/usage and acknowledges steering without applying it | Status and controls cannot be trusted as real runtime state |
| Persistence blocker | `sirona-core/sirona/main.py` imports `init_db` but `create_app` does not call it | A clean `serve` path has no established schema initialization in this application factory; verify launch-path ownership explicitly |
| Configuration blocker | `sirona-core/sirona/api/routes/config.py:patch_config` echoes success while separate settings endpoints really write SQLite | Saving settings, applying runtime config and reporting effective config are different contracts; the UI cannot treat them as one successful operation |
| Distribution blocker | `sirona-ui/electron-builder.json:10` packages frontend/Electron/package files; `electron/main.cjs:91–93` looks for a sibling development Python virtualenv | An installer configuration alone does not produce a self-contained backend/runtime |
| Parity blocker | `sirona-ui/src/App.tsx` mounts a custom fixed shell | The reference routes, contribution tree, windows and broad capabilities remain separate migration work |

Reference corroboration: Hermes `apps/desktop/electron/local-gateway.ts` implements bounded canonical discovery and one-use window-bound dial reservations; `electron/terminal-ipc.ts` owns actual PTY sessions. The source-backed domain chapters provide symbols/line ledgers, and the retained REA records identify the shipped artifacts. These comparisons establish architectural differences, not successful runtime execution of either app.

## Strengthened acceptance contract for the existing fifteen stages

Keep their implementation and numbering. Reopen acceptance where necessary; do not discard useful modules or restart development.

| Stage | Required hardening | Mandatory passing gate before calling it complete |
|---|---|---|
| 01 Shell/foundation | Wire the actual retained route/layout/window/contribution tree; preserve Sirona identity and explicit bot exclusions | Navigate every retained route and native window; compare reference layout/state captures; verify focus, resize and hidden-surface lifetime |
| 02 Gateway/protocol | Use one explicit reference-compatible wire adapter; authenticate local control, bind connection/profile/session ownership, negotiate capabilities, reject mismatches | Invalid/missing/expired credentials fail; two concurrent owner scopes cannot receive/answer one another's events; reconnect restores sequence without duplicate delivery |
| 03 Storage | Initialize/migrate clean homes, define transaction boundaries, revisions, identity and schema compatibility; separate user data from install payload | Empty-home launch succeeds; old-schema migration/restart works; conflicting revision is rejected; branch/rewind preserve history; database errors surface without fabricated success |
| 04 Runs/scheduling | Durable admission/input IDs, receipts, FIFO, generation fencing, actual status/steering, defined cancellation and owner restart | Lost submit ACK retries once; restart after acceptance does not lose or blindly duplicate work; uncertain effects become explicit unknown; queued control and stop produce real terminal outcomes |
| 05 Streaming/agent | Implement real provider transport and selected model routing; preserve provider-native tool history, reasoning/usage/errors and event order | Controlled provider transport yields text and a tool round through the actual runtime; real configured-provider smoke run separately verifies SDK integration; final state persists and reconnects correctly |
| 06 Artifacts/preview | Define artifact identity/storage/serving, guest partition/CSP/navigation and renderer/native boundaries | Actual produced artifact survives restart, opens correctly and cannot drive arbitrary native navigation; loading/error/empty behavior matches the selected reference |
| 07 Questions/approvals | Retained IDs, per-session pending state, partial locks, policy-controlled choices, generation/expiry/cancel handling and transient sensitive input | Agent asks → user responds → same run resumes once; disconnect after first answer restores locks; competing/stale responders cannot approve a different request; Stop settles pending cards |
| 08 Files/workspace | Repair real dispatch; bind cwd/path operations to project/session scope; implement actual file lifecycle/watch/error handling | Open/edit/save/rename/reveal/trash observe real disk state; denied/missing/outside-policy paths behave predictably; watcher events cannot leak between workspaces |
| 09 Git/worktrees | Complete actual native Git/worktree operations and typed UI results; retain clean/error/conflict states | Temporary real repository verifies status/diff/stage/unstage/branch/worktree behavior; cancellation/errors preserve repository state; UI does not substitute a sample diff |
| 10 Terminal/shell | Implement real PTY/ConPTY and full terminal emulator; preserve agent Bash execution and read-only process mirror as separate paths | Full-screen terminal app accepts keys/resizes; hide/reopen preserves process and scrollback; Bash cwd/env persist; background jobs stream/stop; closed owned processes are cleaned up |
| 11 Settings/providers | Persist and apply settings under an owner; secret storage/presentation, provider/model selection and effective config must agree | Save/restart/read returns same intended config; failed write rolls back; changing provider changes the real transport; secrets do not enter ordinary transcript/log payloads |
| 12 Lineage/compression | Use real lineage identities, fenced mutations and information-preserving compression; repair dispatcher compressor contract | Branch/resume/rewind/compress/restart retain expected content and point to the live tip; stale/busy mutations are rejected; graph derives from persisted relationships |
| 13 Palette/slash | Discover commands/extensions from actual catalog, route execution through the right owner, preserve keyboard/focus/completions | Every displayed command performs its documented action; skill/quick commands remain discoverable; unavailable commands explain the actual capability rather than pretend success |
| 14 Diagnostics/recovery | Derive metrics/health from real workers and connections; distinguish optional shared telemetry with consent and redact diagnostics | Failure injection shows correct unhealthy/retrying/recovered state; reported run count/latency/usage are measured; consent-off behavior does not transmit shared metrics |
| 15 Packaging/update | Ship Python/runtime/native dependencies, resolve packaged resources, define independent identity/update feed and data-home migrations | Fresh Windows install runs conversation/tools/questions/PTY without checkout/dev Python/original Hermes; upgrade/rollback/uninstall preserve intended user data; supported platform claims have platform evidence |

For each gate record: **entry action → exact payload → handler → durable effect → event/response → UI state → failure/rollback → test evidence**. A mock at one seam is useful for determinism but does not prove the seams it replaces.

## Scope that the fifteen titles do not cover adequately

The fifteen titles leave substantial retained scope without an explicit owner: profiles/connection routing, Capabilities and plugin/MCP/skill management, cron/history, memory/context, provider discovery/OAuth/local models, auxiliary windows/HUD/quick entry, browser read/act bridges, native dialogs/notifications/clipboard, session import/export and platform update/recovery paths. Assign each to a concrete stage subpackage or add a stage; do not force unrelated work into a vague “polish” bucket.

Bots, relay, groups and noVNC are now documented for the full reference. The original Sirona scope excluded bots. Mark these either intentionally excluded from implementation or retained with their own contracts and acceptance gates. Local agents/delegation must remain independently accounted for.

## Recommended next implementation order

1. Freeze the reference identity and current stage baseline; attach every retained/excluded requirement to a stage and close critical contract/schema unknowns.
2. Repair runtime foundations across stages 02–05 and 11: auth/scoping, fresh storage, real provider routing, real dispatch, durable work/status and effective config.
3. Verify one vertical slice: send → real streamed response → approved file tool → persisted transcript → reconnect. Then add question → answer → resume and failure/stop cases.
4. Complete actual terminal and native filesystem/Git/preview integrations; verify multi-session and restart behavior.
5. Close the remaining route/component/plugin/settings scope against the imported reference, with actual visual/state comparisons.
6. Accept stage 15 only after a clean-machine packaged-app run. Signing/hosted services remain explicit dependencies, not implied by configuration files.

## Evidence and limits

- [Fifteen-stage source/commit audit](stages-01-15-cross-check.md).
- [Native shell/build source reconstruction](native-shell-and-build.md).
- [Gateway/runtime/storage source reconstruction](gateway-runtime-and-storage.md).
- [Frontend/bots/screen source reconstruction](frontend-bots-and-screen.md).
- [Exact protocol schemas and caller references](catalogs/master-rpc-contract.json).
- [Installed database schema observations](installed-database-schemas.md).

No percentages or numerical quality scores are assigned: there is no validated denominator for complete dynamic behavior. The defensible status is **implemented in part, with specific failed or unverified acceptance gates**. This review strengthens the plan; it does not claim to have repaired the application or completed the attachment's remaining exhaustive runtime investigation.
