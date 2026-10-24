# Route, component and interaction acceptance matrix

Reference root: `C:\Users\bharg\AppData\Local\hermes\hermes-agent`. Paths below are relative to that root. All implementation statuses are currently **not started**. These matrices define coverage; they are not runtime verification results.

## Built-in routes

The actual registry is `apps/desktop/src/app/routes.ts`. Navigation is hash-based (`src/main.tsx`). Session IDs are encoded single-segment paths, with reserved and contributed paths excluded from session parsing.

| Reference route | Behavior/surface | Sirona disposition | Required proof |
|---|---|---|---|
| `/` | New chat/draft, composer, empty state | Retain | Fresh draft cannot inherit the previous session's identity or send target |
| `/:encodedSessionId` | Stored session, resume, streaming, tools, prompts | Retain | Correct owner, restore/replay, queued/active/waiting/settled/error states |
| `/session-import` | Import overlay | Retain | Format validation, preview/selection where offered, duplicate/error/success and durable import |
| `/settings` | Searchable settings overlay and query-based deep links | Retain | Every section/subpage/field opens, validates, saves and reloads |
| `/command-center` | Commands, maintenance and diagnostics overlay | Retain | Actions invoke real operations with progress/error/recovery |
| `/capabilities` | Skills/plugins/connectors/toolsets workspace page | Retain | Query tabs, scopes, search, list/detail, install/toggle/auth/discovery work |
| `/messaging` | Third-party messaging management | Exclude bot integration | Remove route registration, sidebar/menu/palette entries and bot-only dependencies |
| `/webhooks` | Webhook overlay | Classify by use; exclude messaging ingress | Audit actual call paths; retain non-bot automation if independent, document each removed ingress |
| `/artifacts` | Artifact workspace page | Retain | List/search/open/preview/download and safe embedded content |
| `/cron` | Scheduled work overlay | Retain non-bot scheduling | Real create/edit/run/disable/delete/history/timezone and failure states |
| `/profiles` | Profile overlay | Retain ordinary local/remote profiles | Isolation, create/edit/select/remove and active-work transitions |
| `/agents` | Agents/delegation overlay | Retain local agents | Actual registration/configuration/delegation lifecycle; remove bot-persona dependencies |
| `/starmap` | Conversation topology overlay | Retain | Real lineage/branches, selection/navigation, large graph and empty/error states |

`OVERLAY_VIEWS` in `routes.ts` identifies session-import, agents, command-center, cron, profiles, settings, starmap and webhooks as overlays. Capabilities/messaging/artifacts are workspace pages. Preserve the distinction in focus, fixed titlebar controls, pane reveal, back/close and restoring the underlying conversation.

The registry contains 12 static route entries including `/`; the dynamic session route is additional. This count is not a total of all subpages or plugin routes.

## Contributions, query routes and window variants

| Surface | Evidence | Accounting requirement |
|---|---|---|
| Plugin full pages | `src/app/routes.ts`: `routes` contribution area | Enumerate every registered contribution; reserve paths before session parsing; test late registration/re-click/back/restore |
| Kanban `/kanban` | `src/plugins/kanban/plugin.tsx`, `board.tsx`, `api.ts` | Retain non-bot board UI and matching backend plugin API; classify orchestration dependencies explicitly |
| Radio/other shipped plugins | `src/plugins/radio`, `hello-runtime`, contribution loaders | Inspect registration before claiming route paths; retain applicable non-bot features; examples/test-only code can be classified as such |
| Bot Mode | `src/plugins/hermes-bots` | Exclude plugin registration, roster, canonical Bot Chat plumbing, portals and bot-only chrome |
| Sidebar/titlebar/statusbar/pane contributions | `src/app/contrib`, `src/contrib`, `src/components/pane-shell` | Port contribution wiring and mount/dispose behavior; include plugin-provided menus/fields |
| Capabilities query tabs | `src/app/capabilities/index.tsx` | `skills`, `plugins`, `connectors`, `toolsets`; legacy invalid-tab fallback and embedded/fixed-profile modes |
| Settings deep links | `src/app/settings/{settings-manifest,subpages,use-setting-deep-link}.ts*` | Inventory view/page/field/setting and legacy link parameters; search results land on the actual field |
| Native window renderers | `src/main.tsx`, Electron window modules | Main, secondary session, browser, HUD, overlay, quick entry and wake; inventory actual constructors and platform gates |
| URL/protocol entry | `src/lib/deeplink-routes.ts`, Electron protocol handlers | Validate decode/dispatch and cold/warm app activation; Sirona scheme and identity |

## Complete settings families to carry forward

Static evidence: `src/app/settings/types.ts`, `constants.ts`, `config-subpages.ts`, `appearance-subpages.ts`, `other-subpages.ts`, `settings-manifest.ts`, `index.tsx`. Runtime config schema and plugin metadata add rows beyond this static table. Each generated row also needs a ledger entry.

| Family | Subpages/features |
|---|---|
| Appearance | General/language/splash/resume/tips/tours; themes/skins; typography/UI/chat/terminal fonts and scale; window layout/density/tabs/titlebar/tray/translucency/backdrop/file-browser/composer popout; chat bubbles/direction/timeline/reactions/tool display/code diffs/reasoning/embeds; pets |
| Model | Main provider/model/context/effort/service tier; fallback providers; auxiliary models; delegation/model/profile routing; mixture-of-agents |
| Chat | Behavior/personality/timezone/reasoning display; attachment limits and image-input policy |
| Workspace | Projects/default cwd/repository scan; persistent shell/env passthrough; file/code execution policy |
| Safety | Approval policies/allowlist; privacy/security; checkpoints |
| Browser | Real-profile consent and selection; local/private network policies |
| Memory/context | Persistent provider connections/config; context budgets/compression/auxiliary compression |
| Voice | Conversation mode/recording; transcription providers; speech synthesis/auto-TTS |
| Advanced | Desktop updates/keep awake/devtools/quick entry; runtime limits/retries; tools/enforcement; terminal backends; tool output/checkpoints |
| Gateway/connections | Local/SSH/URL/cloud routing; connection/keychain settings; devices; managed updates; diagnostics |
| Keyboard | Shortcut editing, HUD gesture, screenshot controls; platform ownership/conflicts |
| Notifications | Master/per-kind alerts, sounds/mute/completion; background request behavior |
| Sessions | Archive/auto-archive and default directory; restore/delete behavior |
| Vault/keys/providers | Credentials/sources, provider setup, custom endpoints, local models/hardware/downloads; masked/reveal/clear/error handling |
| Plugins | Install/update/settings/probes/configuration and availability |
| Billing/account | Existing overview/plans/sign-in/free-tier/credits states, gated by actual service capabilities; no local fabricated subscription state |
| About | Versions, updates/channels, repair/uninstall, notices |

For each settings row verify read, edit, validation, save, failure/rollback, reload, scope, keyboard focus, search and deep link. A row that exists only with a plugin/platform/provider must reflect the actual capability and include its unavailable state where the reference does.

## Component and UX families

| Family | Coverage |
|---|---|
| Shell | Native drag/titlebar zones, connection/profile/project/session selectors, app menus, workspace rail, session groups, search/filter, density, pin/archive/unread/activity indicators, bottom statusbar |
| Pane workspace | Tree/splits/zones/tabs/tiles, drag reorder/detach/dock, resize bounds, persistence, active pane keyboard scope, hidden surface lifecycle, popouts |
| Conversation | Virtualized thread, user/assistant/system/tool content, Markdown/code/math/diagrams/media, copy/edit/retry/branch/rewind/reactions, timeline, usage/reasoning, long-output expansion and errors |
| Composer | Draft scope/persistence, attachment upload/paste/drop/remove, file/skill/slash completions, provider/model/effort, queue/steer/cancel, voice, floating/popout composition |
| Requests | Clarify, approval, sudo/secret/vault/login/code, waiting/locked/settled/expired/undelivered/retry; one focused card owns shortcuts |
| Context pane | File tree/editor, Git review/diffs, terminal tabs, agent process output, preview/browser/artifacts and related menus |
| Overlays | Palette, context menus, settings, profiles, agents, cron, command center, import, Starmap; focus trap/restore and escape hierarchy |
| Auxiliary | Setup/onboarding/repair, remote setup, tips/tours, pets/generation/overlay, learning, HUD/quick entry/wake, notifications, update/sign-in/recovery |
| Design primitives | Imported UI library and local primitives, tokens, CSS, typography, icons, theme assets, responsive/RTL behavior, motion and sound |

The file-level CSV is the accounting layer beneath this table. Do not discard a module solely because its name is not present here.

## Native capability matrix

For every member of `window.hermesDesktop` (`electron/preload.ts`, `src/global.d.ts`), record its source handler, calling renderer, transport shape, Sirona replacement, owning window/profile and test.

| Native family | Behaviors to verify |
|---|---|
| Runtime/connection | Canonical owner discovery/ensure, private tickets/API proxy, profile pools, connection test/reconnect/disconnect, SSH/URL/cloud and setup recovery |
| Windows | Create/focus/minimize/maximize/close, session/browser popouts and relay, restore size/layout, active-work quit guard, HUD/quick/wake/overlay lifecycle |
| Files/clipboard | Text/image clipboard and paste, pick/save dialogs, paths/reveal/open/read/write/rename/trash/download, watchers and scope |
| Git | Repository roots/scanning, branches/status/diff, stage/unstage/revert/commit/push/PR, worktree add/list/remove |
| PTY | Create/attach/output/write/resize/cwd/dispose, local/SSH shells, environment sanitization, output-exit ordering, shutdown cleanup |
| OS integration | Menus/shortcuts, tray/notifications/actions, zoom, keep-awake/power, microphone/screenshots, external links and OAuth callback |
| Preview | Session/profile-scoped reads/actions, webview/guest preload, navigation history, popup denial and trusted-click external open |
| Maintenance | Logs/error reports/diagnostics, bootstrap/runtime installs/update/repair, desktop update/rollback/uninstall |

## State matrix for every retained action

Inspect and test applicable states: unavailable capability, first-use/setup, empty, loading, populated, edited/dirty, validation error, pending mutation, optimistic success/rollback, streaming/running, waiting for input, background, disconnected/reconnecting, stale/replayed, timed out, cancelled, failed/retry, completed and restored after restart. Use source/runtime evidence to determine applicability rather than blindly adding extra states.

Track each row as: `feature ID | source | route/window | action | owning scope | request/event | handler | persistence | destination | exclusion rationale | behavior evidence | screenshot evidence | status`.
