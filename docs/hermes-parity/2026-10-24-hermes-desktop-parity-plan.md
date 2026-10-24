# Sirona: complete Hermes desktop migration plan

Prepared 24 October 2026 (Asia/Kolkata). Historical initial migration plan. The workspace now contains fifteen implementation-stage commits. Its current plan/acceptance assessment is [Plan quality and fifteen-stage strength review](../hermes-reconstruction/plan-quality-and-15-stage-strength-review.md); the exhaustive behavioral investigation remains incomplete.

The objective is to replace Sirona's current frontend with the actual Hermes desktop frontend and reproduce its non-bot behavior end to end: routes, components, layouts, native windows, tools, shell execution, questions, approvals, persistence, and recovery. This is a source port, not a visual approximation. Every discovered source item must have an explicit disposition and every retained user action must reach a working implementation.

This plan supersedes the previous parchment-style UI direction and the unverified implementation claims in the existing architecture plan/README wherever they conflict with this investigation. Existing source and user data remain intact during planning.

## 1. Scope and working decisions

| Decision | Plan |
|---|---|
| Reference | The user-selected local Hermes installation and its desktop source/build, not a different application or the browser dashboard/TUI. |
| Destination | The current `personal -agent` workspace; retain the Sirona product identity. |
| Visual target | Preserve Hermes composition, typography, assets, themes, spacing, motion, menus, keyboard interactions, and window behavior. Limit visible changes to Sirona branding and explicit bot exclusions. |
| Bots | Exclude Hermes Bot Mode/persona roster, bot relay/portals, and third-party messaging bots/platform adapters. Keep ordinary local profiles, agents/subagents, delegation, skills, tools, schedules, and non-bot plugins. |
| Messaging routes | Remove messaging management and platform webhook ingress intentionally, with their dependencies and navigation entries. Preserve any independently useful non-bot webhook automation discovered during the deeper contract pass. |
| Backend | Prefer reusing the mature Hermes runtime behind a Sirona-owned contract boundary over recreating it inside the current scaffold. The runtime must be copied/pinned into this project with its dependency closure; the final app must not depend on the mutable original installation. |
| Services | Keep non-bot remote/SSH, cloud, account, provider, billing, model-catalog and updater surfaces in the inventory. Working hosted functions require their real service capabilities/credentials; local source cannot supply a third-party backend. Do not silently cut these or simulate success. |
| Runtime data | Use an independent Sirona data home, databases, profiles, cache, logs, runtime ownership and update configuration. Existing Hermes credentials/conversations are not copied as frontend assets. Any future history import is an explicit migration with validation. |
| Delivery now | Documentation, evidence summary and inventories only. No frontend/backend replacement, installation, or app execution occurred. |

“Exact” applies to the selected reference version and retained features. Removing bots is an intentional difference. Pixel and interaction parity are acceptance targets, not claims established by this static audit.

## 2. Evidence and boundaries

Hermes source root: `C:\Users\bharg\AppData\Local\hermes\hermes-agent`.

Desktop source: `apps/desktop`; shared transport/contracts: `apps/shared`; packaged build inspected: `apps/desktop/dist`. The top-level `C:\Users\bharg\AppData\Local\hermes` is also a live data home, so it must never be copied wholesale into the project.

Local build metadata reports Windows x64, Node 26.7.0 and a build stamp of 18 October 2026. Its reported source hash is `31d2cc3b83e913337618bd0e1f8c1b97cfc48e0eb1a09d414cd35d32bf5bd079`. This is a build-reported identity, not proof the current source tree still matches. Git revision inspection was unavailable under the current filesystem permissions; file hashes provide the planning baseline.

REA parent Evidence: `ev_acfed8efe6602327936be2a37e619312bbbd3460ebab758e8317822829346023`. Summary Evidence: `ev_9877d7a4bf487c0b456e6a476449271d4af861b401d1e226fa91db1838a4fd2b`. Artifact SHA-256: `c481dadb9714859f944a6ae6b31e64d04153973980aba8f07485a004bdaa98e8`. The full returned summary is retained in `rea-summary.json`.

The bounded static build analysis selected `index.html`, `electron-main.mjs`, `electron-preload.js`, `preview-guest-preload.js`, and `hermes-build.json`. It inventoried 1,008 relevant build files, parsed three JavaScript files without parse failures, and observed static syntax for 11 BrowserWindow constructions, 298 exposed bridge members, and 260 literal IPC channels. These are static counts across all included code, potentially including bot-specific paths, not counts of live windows or validated working APIs. The analysis left 1,003 files unselected and hit semantic node ceilings. Dynamic IPC, renderer lazy chunks and runtime behavior remain incomplete. No app was launched and no runtime screenshot comparison was performed.

Ordinary source inspection supplies the route/layout/backend findings below. It does not imply REA established full application coverage.

Supporting files:

- `source-inventory.csv`: file-level path, size, SHA-256, kind, proposed scope decision, destination/status/verification fields.
- `source-inventory-summary.json`: inventory scope, counts and CSV digest.
- `generate-source-inventory.ps1`: repeatable read-only source inventory generator; it writes only its output reports.
- `route-and-feature-matrix.md`: route, settings, native capability and interaction acceptance map.
- `current-sirona-audit.md`: concrete current-project gaps and source evidence.

The inventory includes desktop source, Electron, public assets, assets, scripts, E2E, packaging, desktop root files, shared source and selected root manifests. It excludes installed dependency contents, generated distribution output and private user state. Python backend dependency closure and third-party dependency licenses are additional implementation-phase inventories, not claimed complete here. A file listing is not a semantic audit of every file.

The recorded inventory contains 4,313 files, including 613 TSX modules and 1,826 test/E2E files. Initial path-based decisions identify 197 Bot Mode files and five messaging-page files for exclusion, and two webhook-page files requiring scope review. These are initial classifications, not a complete dependency-aware bot-removal result.

## 3. Why a frontend-only copy will fail

Hermes has three authorities: Electron owns native capabilities; React owns presentation and window interaction state; the agent backend owns sessions, model calls, tools and durable work. Its renderer imports `@hermes/shared`, uses a substantial typed native bridge and adapts canonical gateway behavior in `src/api/client.ts` plus `canonical-*.ts` siblings.

The initial scaffold audit identified one React shell without equivalent page routing, placeholder providers/MCP, mismatched approvals, blocking prompt processing, unscheduled run acknowledgements and pipe-based terminals. Subsequent stage commits added background scheduling and clarification handling, along with other features. Providers/MCP, true PTY, packaging and several contracts still have gaps. Use the linked current review and stage cross-check for present-tense findings. Existing mock tests do not establish full parity.

Therefore the recommended implementation ports the real desktop and the runtime contracts together. Hand-reimplementing thousands of source modules against the tiny current core would increase the chance of missing behavior and preserving broken seams.

## 4. Target structure and integration strategy

Proposed ownership within this workspace:

```text
sirona-ui/                 actual forked Hermes desktop renderer and Electron shell
sirona-shared/             forked shared contracts/client, with explicit workspace wiring
sirona-core/               Sirona API facade, configuration and migration boundary
vendor/hermes-runtime/     pinned runtime source and required non-bot dependency closure
docs/hermes-parity/        evidence, decisions, inventories, parity results
```

This is a proposed layout, not a set of folders already created. Preserve the existing Sirona implementation in version history or a reversible backup before replacement. Check whether this workspace is version-controlled before relying on rollback. Do not overwrite local changes.

First get an unmodified reference copy building in isolation. Preserve dependency versions, workspace resolution, root lockfile semantics, shared TS configuration, source aliases, build scripts, generated contracts and native rebuild steps. Hermes currently uses React 19.2, TypeScript 6, Vite 8 and Electron 44, whereas Sirona has older tooling; mixing the two lockfiles arbitrarily is not a migration strategy.

Import the dependency closure rather than only `src/components`: app/store/api/lib/themes/i18n/contributions/hooks/types, Electron, shared, public/fonts/icons/audio/images, root workspace manifests, native packaging helpers and relevant tests. Keep required third-party notices. The supplied Hermes root license is MIT and requires retaining its notice in copies/substantial portions; dependency/font/asset terms still need their own inventory.

Apply branding through product identity, titles, application ID/protocol, package metadata, config/data directories, installer, logs and update identity. Avoid global string replacement of protocol names, import specifiers, saved-schema fields or provider keys: map compatibility-sensitive names at deliberate boundaries, migrate persisted keys explicitly, and rename internals later with contract tests.

Keep existing Sirona APIs only where they serve actual consumers. Route them through the reused runtime rather than introducing a second independent turn engine/database owner. Declare any required new Sirona behavior separately from reference parity.

## 5. Work packages and exit gates

### Phase 0 — freeze and close the reference inventory

- [ ] Make a stable source/build snapshot and compare current hashes against the recorded inventory before copying; source updates appear to be possible in the live Hermes installation.
- [ ] Resolve source/build drift using `hermes-build.json`, renderer manifest and actual loaded app identity. Select one baseline for visual tests.
- [ ] Expand each inventory item to retained, adapted, shared dependency, test-only, excluded-bot, or service-dependent. An unclassified row blocks final parity sign-off.
- [ ] Extract all route registrations, query parameters, settings schema/manifest fields, slash commands, contribution areas, context menus, shortcuts, bridge members, RPCs, REST calls, events and server requests. Include dynamically registered plugins and lazy-loaded surfaces.
- [ ] Build dependency closure for the runtime and non-bot plugins; label messaging adapters separately from the core gateway transport.
- [ ] Capture reference screenshots and declared interaction scenarios in an isolated test profile: every route/subpage, light/dark themes, all relevant window types, normal/loading/empty/error/offline/waiting states. Use runtime evidence where source cannot establish behavior.

Exit: stable source identity; no undispositioned route/feature; source-to-destination and action-to-handler ledgers exist. This phase resolves current audit unknowns instead of assuming they are absent.

### Phase 1 — reproduce the frontend and desktop build

- [ ] Port the real desktop source, assets and shared packages into the proposed workspace layout; preserve provenance and source hashes.
- [ ] Reproduce reference theme tokens, CSS order, typography, icon packs, font loading, translations, animations, sound and asset resolution.
- [ ] Port HashRouter behavior, reserved route/session-ID parsing, overlay vs workspace-page behavior, query/hash handling, back/forward and restored navigation.
- [ ] Port pane-shell tree, tabs/tiles/splits/docking, drag/drop, sizing persistence, right sidebar, titlebar/statusbar and contribution slots.
- [ ] Port every native window renderer branch, error boundary, bootstrap and connection recovery surface.
- [ ] Remove bot registrations/navigation by dependency-aware changes; keep ordinary profiles, local delegation and non-bot contributions working.
- [ ] Apply Sirona identity without restyling the imported UI.

Exit: reproducible development/production builds; every retained route/window mounts with its assets. Fixtures may support visual development but cannot count as final functional completion.

### Phase 2 — runtime, contracts and durable sessions

- [ ] Vendor/pin the non-bot runtime closure and its Python/package-management requirements. Preserve the gateway itself: it is transport and ownership infrastructure, not synonymous with messaging bots.
- [ ] Define the Sirona data-home/runtime owner and startup/discovery protocol. Adapt the existing canonical local gateway path to Sirona; do not attach to or stop the user's original Hermes owner.
- [ ] Preserve the rule that closing a viewer disconnects it without implicitly killing the canonical gateway. Stop/restart are explicit lifecycle operations with active-work handling.
- [ ] Preserve the actual desktop adapter in `src/api/client.ts`, canonical protocol behavior, shared JSON-RPC channel and generated contracts; replace endpoints/identity through one adapter.
- [ ] Implement actual provider streaming/model selection, native tool-call history, usage/error propagation, context budgets and information-preserving compression.
- [ ] Schedule runs independently of the WebSocket read loop. Track session/run/turn/tool/prompt identity and durable state; allow approve/answer/stop while a turn waits.
- [ ] Enforce connection + profile + session owner routing, sequence/revision/epoch checks, idempotent submissions, optimistic rollback, reconnect snapshots and event replay.
- [ ] Initialize/migrate storage on clean startup; implement search/FTS, import/export, rename/pin/archive/delete, projects, lineage, branch/rewind and prompt queues.
- [ ] Preserve prompt-cache rules and defer system-prompt-changing skill/config updates to the appropriate next session, matching runtime semantics.

Exit: a real model conversation survives session switches and reconnects; two concurrent sessions cannot consume each other's events; retries do not duplicate messages or tool effects.

### Phase 3 — shell, terminal, filesystem and Git

- [ ] Port native `node-pty` terminal IPC and xterm renderer, with Windows ConPTY, local/SSH backends, attach/write/resize/cwd/dispose, ANSI/Unicode, links, selection/copy/paste and WebGL fallback.
- [ ] Keep the interactive terminal alive while hidden; explicit close disposes the owned PTY and app shutdown cleans owned terminal processes correctly.
- [ ] Port agent terminal execution separately: persistent Bash state, cwd/env, foreground/background execution, process IDs, output polling/streaming, stdin where supported, timeout/stop/kill and completion notifications.
- [ ] Handle Git Bash on Windows through resolver/configuration; interactive PowerShell/cmd selection is separate from the agent's Bash requirement. Report missing shells through a usable setup path.
- [ ] Keep the agent process mirror read-only, keyed by process/session with backlog replay; never accidentally give it the interactive terminal's input channel.
- [ ] Preserve policy/approval checks on every applicable entry point, scoped working directories and profile-safe child environments.
- [ ] Port file tree/watchers/search, open/edit/save/rename/trash/reveal/download, CodeMirror views, artifact previews and external-open behavior.
- [ ] Port repository scanning, branches/worktrees, status/diffs, stage/unstage/revert/commit/push/PR affordances and error/clean states. Use real repository output rather than canned diff samples.

Exit: interactive terminal applications resize and accept keys; agent Bash commands stream and can be stopped; file edits/diffs reflect actual changes; hiding a pane does not restart a job.

### Phase 4 — conversation questions, approvals and sensitive input

- [ ] Port clarification components/stores, batched questions, stable qids, recommended options, single/multi-select, free text/Other, partial locked answers, confirmation and keyboard ownership.
- [ ] Port approval cards with backend-authorized once/session/always/deny choices, command/argument presentation, and edit/write restrictions.
- [ ] Generate and retain prompt IDs before publishing requests. Scope requests by connection/profile/session/run and execution generation; acknowledge exactly once.
- [ ] Adapt canonical `approval.request`/`clarify.request` events to the renderer request registry and fenced response calls, retaining replay and already-resolved outcomes.
- [ ] Persist/replay ordinary pending prompts and settled transcript; restore partial clarification progress after reconnect. Preserve expired, undelivered, skipped, timed-out and cancelled distinctions.
- [ ] Keep pending background questions parked for their session; notify without stealing foreground navigation/focus. Coordinate ownership across windows/popouts.
- [ ] Port sudo, secret, vault unlock, save-login and one-time-code surfaces with masked input. Follow native transient handling rather than journaling secrets with ordinary prompt replay.
- [ ] Handle failed response submission with visible retry/rollback; Stop/turn replacement cancels pending waits and late responses cannot revive a stopped generation.
- [ ] Port window/preview/terminal read/action requests so only the owning window responds; enforce foreground restrictions where required.

Exit: actual agent → question/approval → user response → resumed execution works; duplicate, stale and disconnected responses are handled correctly; sensitive values do not enter durable transcript/event logs.

### Phase 5 — all retained routes and settings

- [ ] Complete the route and feature matrix, including query-driven tabs and deep-link targets; do not equate the 12 route constants with the total surface count.
- [ ] Deliver Capabilities: skills/hub, plugin install/update/enable/settings, connectors/auth and toolsets/tool schemas/history. Implement real MCP initialize/discover/call/cancel/lifecycle/error handling.
- [ ] Deliver artifacts, session import, command center/maintenance, cron create/edit/run/disable/delete/history, profiles, local agents/delegation and Starmap lineage.
- [ ] Deliver all settings families and schema-generated/plugin fields, persistence, search/deep-link highlighting, validation, profile scope, unsaved drafts and failure states.
- [ ] Deliver composer attachments/drag/drop/paste, model/provider/effort choices, slash/skill/file completions, queued prompts/steering/editing, voice/STT/TTS and media rendering where supported.
- [ ] Enumerate and retain all available non-bot tool families and their real UI consumers: web search/fetch, browser/computer interaction, code/Python REPL, filesystem/Git, memory/session search, todos/planning, image/media tools, hooks, checkpoints and background/delegated work. Preserve tool output renderers, permissions, configuration, cancellation and error presentation. Availability depends on actual installed providers/plugins; a filename or menu alone does not establish support.
- [ ] Include onboarding/setup, tours/tips, HUD, quick entry, wake indicator, screenshot attachment, notifications, pets/companions and non-bot contributed plugins. Feature/platform availability must reflect actual capability.
- [ ] Audit account/cloud/billing/remote model catalog actions individually against real service APIs. Preserve honest sign-in/offline/unavailable/unsupported states. Completion remains open for unavailable retained service capabilities.

Exit: every retained visible action is backed by real data and a valid handler; no placeholder success, fabricated state or dead controls remain.

### Phase 6 — native lifecycle, isolation and packaging

- [ ] Complete bridge member × renderer consumer × Electron handler mapping, including main/secondary/browser/HUD/overlay/quick/wake windows and window relay.
- [ ] Preserve context isolation, renderer sandbox, disabled Node integration, narrow typed IPC and sender validation.
- [ ] Preserve preview/artifact guest boundaries, denied popups, trusted-click external opening, allowed schemes and safe session/profile routing.
- [ ] Port native menus and shortcuts, clipboard/files, drag regions, window restoration, multiple windows, tray, zoom, power/keep-awake, microphone/screenshot and notifications/actions.
- [ ] Package an independent Sirona Python/runtime/dependency environment and native modules; remove assumptions about development `.venv` paths or guessing other Vite ports.
- [ ] Give Sirona its own app ID, protocol, installer, version metadata and release/update feed. Keep upstream update behavior disabled until the Sirona feed is configured so an update cannot replace the fork with Hermes.
- [ ] Implement setup, repair, logs/diagnostics, update rollback, uninstall and active-work quit behavior. Do not reuse personal installed credentials or caches as distributable payload.
- [ ] Verify Windows native module ABI/ConPTY and installer upgrade/uninstall with paths containing spaces/non-ASCII. Test platform-specific features on their supported platforms before claiming those platforms.

Exit: a clean Windows installation opens and performs the required flows without the original Hermes source/install or a developer terminal.

### Phase 7 — parity verification and cutover

- [ ] Compare each retained route/state/window screenshot to the selected reference at identical dimensions, scale, fonts and theme. Mask only agreed branding and genuinely variable content; review differences manually.
- [ ] Reuse/adapt relevant upstream behavioral tests. Run typed contract generation/drift checks, renderer and Electron typechecks/lint, UI/platform tests and real desktop lifecycle tests.
- [ ] Run real-provider smoke flows separately from deterministic fixtures; fixtures must not stand in for provider/tool/MCP integration proof.
- [ ] Test long transcripts, concurrent sessions, rapid resize/drag/typing, heavy PTY output, background questions, reconnect, crash/relaunch, partial writes and storage migration.
- [ ] Traverse keyboard-only flows, focus restoration, screen-reader labels, contrast, localization/RTL and high-DPI Windows layout.
- [ ] Finish component/action/state-to-test mapping; all rows must have destination, implementation disposition and verification evidence.
- [ ] Cut over only after the independent packaged Sirona build passes; retain a recoverable previous build and migration backup.

Exit: all retained parity criteria pass; every exclusion is explicit; service-dependent or unresolved items remain visibly open rather than being called complete.

## 6. Required end-to-end scenarios

1. Clean install → setup/model selection → new conversation → actual streamed response → quit/relaunch → same transcript restored.
2. Agent writes a file → approval shown with correct arguments → deny leaves the file unchanged; allow executes once → real diff appears.
3. Agent asks a batch of questions → choose first answer and enter free text → disconnect → restore locked picks → complete → execution resumes once.
4. Background conversation asks a question while another streams → foreground stays unchanged → answer in the correct session/window.
5. Stop while tool approval/clarification is arriving → worker stops, card settles, late response is rejected or reported already resolved.
6. Bash command preserves cwd/env, streams stdout/stderr, backgrounds a job, reads later output and cancels it without orphaned owned processes.
7. Interactive PowerShell/Git Bash terminal opens a full-screen application → resize → hide/reopen → process and scrollback survive → close disposes it.
8. Agent process mirror displays the correct backlog and cannot accept terminal input.
9. Lost prompt acknowledgement → retry/reconnect → one durable user message and one execution; stale revisions cannot mutate a different generation.
10. Two profiles with overlapping stored session IDs → independent prompts/settings/events/files; switching a connection does not misroute a response.
11. Project/files/Git workflow handles clean tree, edits, stage/unstage and error states with actual repository evidence.
12. Skills/MCP/plugin installs expose real capabilities and propagate failures/cancellation; settings persist and reload accurately.
13. Cron job runs non-bot local work and records history; Starmap shows actual lineage rather than an invented root.
14. Preview guest content cannot autonomously open native browser windows; legitimate user external links and approved window actions still work.
15. Every retained route/deep link/context menu/native menu/shortcut reaches its corresponding working surface, including plugin routes after late registration.
16. Standalone installed Sirona works when the original Hermes folder is unavailable; updates and data writes target Sirona's identity/home.

## 7. Completion accounting and current status

Use `not-started → ported → wired → behavior-verified → visually-verified → accepted` per retained feature. Use `excluded-bot` only with a dependency rationale; use `blocked-service`/`unknown` for outstanding external or evidence gaps. Do not use file-copy counts as a completion percentage.

| User requirement | Current investigation result | Completion condition |
|---|---|---|
| Recover exact frontend | Source and packaged build located; file inventory created | Source port builds and visual/state comparisons pass |
| Every route | Built-in registry enumerated; plugin/deep-link inventory still needs closure | All retained route and query combinations tested |
| Every component/layout | File-level accounting established; major families mapped | All retained modules have destinations and verified surfaces |
| Electron experience | Large static native surface established; no runtime validation | Bridge matrix, lifecycle and packaged app pass |
| Shell/Bash | Three distinct terminal paths identified | Real execution, PTY, mirror and cleanup scenarios pass |
| Questions during conversation | Actual contracts/state lifecycle identified | Full question/approval/sensitive-input scenario suite passes |
| Everything except bots | Explicit scope and dependency-aware removal planned | No bot registration/ingress remains; local agents continue working |

This document is an initial roadmap, not a closed implementation specification. Fifteen implementation-stage commits now exist; their acceptance remains subject to the current strength review. Exhaustive behavior discovery, contract closure, runtime/visual verification and standalone packaging remain outstanding. Preserve the existing implementation and complete its missing gates toward full retained-feature parity.
