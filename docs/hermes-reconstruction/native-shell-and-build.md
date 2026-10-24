# Hermes native shell, startup, authentication, recovery, and build reconstruction

Investigation date: 24 October 2026. Target: Windows Electron Desktop, with macOS/Linux differences recorded where proven. This report is documentation only; no target code, installer, runtime, or test was executed. User secrets, live databases, and personal logs were not read.

## Evidence boundary

The citations below refer to the local source tree at **C:/Users/bharg/AppData/Local/hermes/hermes-agent**. A source citation proves what that source implements; it does not prove that the installed executable is running these exact bytes. The installation also contains production artifacts; the parent investigation records ASAR/dist identity and package-manifest drift separately. In particular, do not treat dependency versions in the current source manifest as a verified list of shipped versions. Runtime behavior, actual process ownership on this machine, OS permissions, signing identities, and installer availability remain **UNVERIFIED** unless explicitly identified as static source behavior.

To make the claim ledger readable, source IDs N01–N81 resolve to exact absolute paths, symbols, and starting lines in the final evidence table. Every behavior paragraph and table row cites its source ID. Lines are one-based. The machine-generated IPC inventory in the wider report supplies exhaustive endpoint enumeration; this document explains the lifecycle and sensitive semantic chains.

## 1. Architectural ownership

The desktop shell is an Electron main process, isolated preload, and React renderer. The preload publishes **window.hermesDesktop**, not window.hermes. The main process owns native capabilities and backend routing; the renderer consumes typed methods; Python remains authoritative for execution. The current local launch asks the canonical gateway owner to attach or start. It does not create one independent serve child per profile. Old comments and compatibility helpers still mention the previous serve process model; the production call path in main.ts is decisive. [N01, N02, N03, N04]

The main process installs the Python ticket resolver during module initialization, using the runtime resolver and resolved cwd. Its source is intentionally outside the renderer graph. The current local descriptor contains an endpoint, empty token, native auth mode, and an unminted native-dial placeholder. A fresh dial obtains the private grant later. Credentials are not discovered by scraping the dashboard root page on this path. [N03, N05]

~~~mermaid
flowchart LR
  OS[OS executable / deep link] --> ENTRY[Electron entry.ts]
  ENTRY --> MAIN[Electron main.ts]
  MAIN --> PRE[Isolated preload: hermesDesktop]
  PRE <--> R[React renderer]
  R -->|private native capabilities| PRE
  MAIN -->|bounded CLI gateway ensure --json| CLI[Hermes installation launcher]
  CLI --> G[Canonical gateway owner]
  MAIN -->|private stdin/stdout or control socket| T[One-use ticket mint]
  T --> G
  R -->|WebSocket JSON-RPC / canonical adapter| G
  MAIN --> PTY[node-pty interactive terminal]
  G --> TOOL[Agent runtime and tool processes]
  MAIN --> REMOTE[Optional SSH / URL / Cloud]
~~~

This diagram is the source-derived ownership model [N01–N07, N23]. It is not a live process snapshot. PTY terminals and agent tool commands are separate execution paths; a read-only agent-output terminal is a third renderer presentation described in the broader runtime report.

## 2. Startup sequence from the executable

### 2.1 Entry and pre-ready phase

1. The package main entry is **dist/electron-main.mjs**. The build actually bundles electron/entry.ts into this output. entry.ts may relaunch on Linux to apply WSLg/Wayland/NVIDIA/platform flags before importing main. The launcher parent does not create windows or backend state; it stays alive for the child and forwards SIGINT/SIGTERM. Otherwise it imports main directly. [N08, N09]
2. main.ts chooses userData override/channel suffix before native state is consumed; reads HERMES_DESKTOP_DEV_SERVER and packaged identity; uses dist/electron-preload.js and dist/preview-guest-preload.js. Pre-ready GPU/sandbox recovery and command-line decisions happen before app ready. [N10, N11]
3. Single-instance ownership is acquired before backend machinery is permitted. A lock-losing process hard-exits with app.exit(0), so its asynchronous ready/quit path cannot reap or reconnect the existing instance's runtime. A primary cold start may persist a --profile override; second-instance argv instead routes into the existing window. [N12]
4. The Hermes data home is resolved separately from Electron userData. Explicit HERMES_HOME wins, and a home inside profiles/<name> normalizes to its parent collection home. A desktop userData override without explicit home gets an isolated hermes-home child. On Windows the resolver can read user-environment HERMES_HOME; otherwise LOCALAPPDATA/hermes is preferred, with a legacy ~/.hermes fallback only when the new directory is absent and no suffix isolation is requested. The default on POSIX is ~/.hermes. [N13]
5. main.ts derives ACTIVE_HERMES_ROOT as HERMES_HOME/hermes-agent, venv path, bootstrap marker, and HERMES_HOME/logs/desktop.log. These are source defaults, not assertions that all packaging variants execute their runtime from that mutable checkout. [N14, N30]

### 2.2 Ready phase and first window

app.whenReady consumes pending update relaunch information, warms login-shell PATH resolution, initializes diagnostics/system CA trust, applies basic password-store handling, migrates legacy encrypted secrets once, enables accessibility unless opted out, installs media/download/custom-protocol/remote-header/preview rules, configures fonts and spellcheck, restores awake/tray preferences, starts the main-loop watchdog, sets active profile routing, registers quick-entry/screenshot/HUD actions, resumes managed SSH recovery journals, and installs the menu around first-window creation. Cold-start URLs are delivered after this wiring. [N15]

The window is created before the gateway connection needs to finish: main.ts createWindow constructs a hidden themed BrowserWindow, registers routing/tray/window lifecycle, loads the renderer URL, and the renderer's bridge connection path can call ensureBackend → startHermes. Thus the proper reconstruction is two coordinated readiness branches (native/renderer visible and gateway usable), not a strictly serial assertion that the backend completes before any window exists. [N16, N03]

createWindow restores sanitized geometry and maximization, uses a hidden title bar/native overlay and platform surface options, and stays show:false until themed reveal. The shared chat-window webPreferences are preload, contextIsolation:true, webviewTag:true, sandbox:true, nodeIntegration:false, devTools:true, autoplayPolicy:no-user-gesture-required, focusOnNavigation:false. DevTools capability is enabled even though F12 and CDP exposure have separate policies. [N16, N17]

window-reveal.ts reveals once on the preferred path or falls back **4,000 ms after scheduling**. It can report a failed first paint rather than leave an invisible process/window forever. The HTML performs a prepaint from hermes-boot-background and hermes-boot-color-scheme; transparent HUD/overlay/quick/wake windows intentionally skip opaque background prepainting. [N18, N19]

### 2.3 Backend resolution and attach

The production chain is **preload getConnection/getConnectionFor → hermes:connection / hermes:connection:for → main ensureBackend/registry resolution → startHermes → runPrimaryBackendStartup → resolveHermesBackend/ensureRuntime → runGatewayEnsure → ensureLocalGateway**. Main also provides fresh gateway URL capabilities for subsequent WebSocket dials. Route-specific handlers are catalogued in the separate IPC index. [N01, N03, N20]

startHermes refuses non-primary instances, performs orphan handling once, checks shutdown/start fences and latched failures, reuses an in-flight connection promise, migrates missing active-profile preference, creates an attempt token, and pins one launch-profile decision for both route and argv. Async boundaries validate the attempt before publishing, so a stale success does not overwrite a newer connection choice. Login-shell PATH is merged before runtime resolution; failures retain inherited PATH. [N03]

runPrimaryBackendStartup orders: saved remote first → local update-exclusion gate → reselect registered primary → optional attach hook → prepare local backend → first-run choice → either re-resolve remote, return reset error, or ensure local runtime. **main.ts does not wire the old attachHostBackend hook**; canonical gateway ensure below is attach-or-start. A remote failure never intentionally triggers local bootstrap. [N04, N03]

| Resolver rung | Source behavior and consequence |
|---|---|
| Bundled payload | Baked stamp runtime paths under resources/agent-payload; launch commands.hermes; env adds HERMES_RUNTIME_DIR=toolsDir; ticket mint uses payload storePython and PYTHONPATH repoDir + sitePackages. No alternate payload discovery. [N21, N30] |
| Explicit source root | HERMES_DESKTOP_HERMES_ROOT, source validation, selected Python and source backend; no automatic bootstrap for a valid explicit checkout. [N21] |
| Development checkout | Unpackaged source root before mutable installed roots so local Python edits are used. [N21] |
| Explicit CLI override | HERMES_DESKTOP_HERMES; reject desktop executable mistaken for CLI; unwrap Windows launcher when applicable; trust/probe permitted CLI; retain installation root for ticket minting. [N21] |
| Active installation | Resolve and probe canonical installed runtime; a missing/stale bootstrap marker alone does not force reinstall when the runtime is usable. Repair request can bypass it. [N21] |
| Published user launcher | Discover externally located source installation through fixed user launcher; verify it rather than blindly relying on GUI PATH. [N21] |
| Bootstrap-needed sentinel | Return structured bootstrap-needed rather than throwing an unrecoverable missing-payload error; ensureRuntime chooses recovery/install flow. A bundled stamp with missing/damaged runtime refuses bootstrap and requests reinstall. [N21, N22] |

For local launch, backendArgs are **gateway ensure --json**, prepended with **--profile <chosen>** when selected. runGatewayEnsure spawns the resolved launcher with its args, cwd, parent env, HERMES_HOME, and backend.env. The passed desktop spawn overlay sets **GATEWAY_ON_ALL_ADAPTERS_DOWN=stay_alive**. Despite its stale serve-oriented comment, this helper is actively called around the gateway client setup. [N03, N81]

The CLI has its own **60 s** startup protocol deadline; Electron allows **15 s** grace, so default child deadline is **75 s**. It reads at most 65,536 stdout characters and retains the final 4,096 stderr characters. On expiry it kills this bounded client, then attempts SIGKILL/reject after 1 s; it never retains or kills the detached gateway owner. parseGatewayEnsureOutput parses the actual protocol result. ensureLocalGateway validates a usable endpoint or reports the state/reason/detail and suggested gateway status/restart recovery. [N05]

Stale source-owner code can request one restart per owner-profile/gateway-code/client-code tuple per desktop process. The restart tries **--profile P gateway restart --detach**, falls back without --detach only for the exact old-argument refusal, and re-ensures while restart runs, polling at **1 s**. A draining owner in restart_after_turn_wait remains attachable so pending approval/clarify can finish. This is deliberate: awaiting full owner exit first could deadlock the question only this UI can answer. [N05]

~~~mermaid
sequenceDiagram
  participant OS
  participant E as Electron entry/main
  participant W as BrowserWindow/preload
  participant R as Renderer
  participant C as Hermes launcher
  participant G as Canonical gateway owner
  OS->>E: Launch / argv / deep link
  E->>E: Paths, identity, pre-ready flags, instance lock
  E->>W: Create hidden chat window + isolated preload
  W->>R: Load dev URL or dist index
  R->>E: getConnection / routed connection
  E->>E: Remote choice or runtime resolution + first-run gate
  E->>C: [--profile P] gateway ensure --json
  C->>G: Attach or start canonical owner
  C-->>E: Credential-free endpoint verdict
  R->>E: Fresh gateway WebSocket URL
  E->>G: Private one-use ticket mint
  E-->>R: Ephemeral dial URL
  R->>G: WebSocket canonical protocol + ticket subprotocol
  G-->>R: gateway.ready / session snapshots / events
  W->>W: Themed reveal or bounded fallback
~~~

The diagram's renderer, connection and reveal branches may overlap. It intentionally does not assert a fixed gateway port; the descriptor supplies api_origin. [N03, N05, N16–N20, N24]

## 3. Authentication and ticket boundary

### 3.1 Canonical local WebSocket

localGatewayDial resolves the routed endpoint/profile and mints an interactive ticket for that exact home. redialLocalGateway retries **once**, and only after errors classified as stale gateway control (including missing ticket control, invalid response/pointer, noncanonical profile). Unsafe ownership/permission/type failures demand repair rather than an endless ensure loop. [N05]

createLocalGatewayDials reserves a random native_dial nonce with ticket, requesting webContents ID, exact origin/path and **25 s** expiry. Its header modifier consumes that binding and only removes Origin on a matching one-use native dial. Plugin dials can use X-Hermes-Gateway-Ticket. This restriction must survive a fork; removing Origin globally would widen the trust boundary. [N25]

HermesGateway's socketFactory extracts the transient ticket before WebSocket construction and uses **hermes-gateway-v1** plus **hermes-gateway-ticket.<ticket>** subprotocols, so a reservation URL is not the final persistent WebSocket credential carrier. The ordinary shared client delegates construction through this configured socketFactory; it does not itself implement that ticket transformation. The parent protocol report documents the full frame shape. [N24, N26]

### 3.2 REST and profile operations

nativeGatewayHttpHeaders checks descriptor/base URL origin agreement, resolves the profile selector from URL or body, chooses purpose by route and HTTP verb, and mints **X-Hermes-Gateway-Ticket**. Purposes are interactive, native-http, native-profile-create, native-profile-registry. POST /api/profiles and named-profile PATCH/DELETE have dedicated grants. The owner boundary is not safely reproduced by handing all renderer requests a reusable dashboard token. [N27]

### 3.3 Private control transport and Python helper

POSIX privateNode uses lstat, file-type/uid/mode checks; no symlink masquerading as socket/pointer is accepted. Non-home control objects are owner-only; other-writable homes are refused. Group-writable homes are delegated to Python because Node cannot establish ACL/NSS private-group facts. Direct socket mint has a **5,000 ms** deadline, a 65,536-character response bound, protocol 1/id 1/session-ticket request, and validates reply profile/instance/protocol/ticket type. [N28]

Windows mints through the installed runtime's Python control client, which owns pipe PID/SID validation. Electron's TicketBridge executes **python -P -u -c <fixed script>**, exchanges JSON lines over private stdin/stdout, validates canonical home/runtime protocol in Python, imports hermes_cli.gateway_client._session_ticket and gateway_runtime_discovery._private_node, bounds request/output at 65,536 bytes/characters, and has a **10 s** request deadline and **30 s** idle retirement. EOF retires it when desktop exits. If the launcher is not a bare interpreter, --print-runtime-command is resolved under a **30 s** bound. Closing ticket bridges increments a generation and kills helpers. These are helper processes, not ownership of the gateway daemon. [N29]

### 3.4 Remote authentication and local secret policy

URL connections support token mode and OAuth/cookie/native bearer paths; SSH and Cloud are additional source routes. A fresh remote OAuth WebSocket ticket is minted each dial; main.ts explicitly notes ~30 s single-use tickets. Confirmed auth rejection and transient network failure are distinguished. Programmatic SSH uses BatchMode and bounded connect/exec/forward defaults of **15 s / 20 s / 15 s**; remote probe default is **15 s**. [N31, N32]

Native OAuth runNativeLogin opens the system browser after binding **127.0.0.1:0**, builds PKCE/state, accepts callback code/error, verifies state, exchanges code with verifier, returns normalized tokens, and always closes the listener. Overall timeout **5 min**; token POST **15 s**. A browser page contains only completion HTML, never tokens. [N33]

**Encryption is opt-in and OFF by default in this source**, despite older encrypted-store module comments. secure-token-storage.json owns the on/migrated decision; OFF writes encoding plain without safeStorage touches. One legacy safeStorage decrypt→rewrite migration is attempted and recorded; unreadable stale encrypted blobs subsequently classify as absent. ON uses strict encryption with authoritative write failures. This source policy is an important product decision, not a guarantee that local token files are encrypted. [N34, N35, N15]

OAuth cookie partitions are connection-scoped for non-primary registered OAuth remotes. Primary/v1/cloud keep the legacy persist:hermes-remote-oauth jar for compatibility/cascade. Non-primary partition IDs deliberately avoid additional colons/percent escapes because Windows cookie persistence previously failed for those names. A new fork must choose and document its own migration/compatibility policy rather than rename these jars silently. [N36]

## 4. Preload, IPC and renderer privilege

preload.ts imports a limited Electron surface and exposes hermesDesktop. It reads small synchronous native facts (translucency/HUD/feature flags/local skin) before publishing. Methods use ipcRenderer.invoke/send or carefully wrapped subscriptions returning listener-removal functions. The ordinary renderer cannot import Node/Electron directly under the chat window settings; the bridge grants explicit powers, including substantial filesystem/git/terminal access. Therefore context isolation does not make renderer compromise harmless: the security review must evaluate each exposed capability and argument validation. [N01, N17]

| Capability family | Real operation / semantic boundary |
|---|---|
| Backend routes/API | getConnection, connection-for, ws-url-for, api and profile routes reach native authentication/routing; never let a caller's unscoped profile bypass grant selection. [N01, N20, N27] |
| Windows | Session/window/browser popouts and relay need connection/profile identity and native focus policy, not just route strings. [N01, N17] |
| Files | readDir/readText/readDataUrl/save/select/reveal/rename/write/trash; these are explicit native capabilities and must retain path resolver checks. fs-ipc.ts injects resolver/path/open implementations. [N01, N37] |
| Git | Worktrees, branches, repo status/diff, stage/unstage/revert, commit/push and PR use native git/gh resolution, not browser emulation. [N01, N38] |
| Terminal | start/attach/write/resize/cwd/dispose and keyed output/exit subscriptions host real PTYs. [N01, N23] |
| Auth/Cloud | Sign in, logout, discovery, per-source credentials and MCP OAuth callback listeners remain native/service-dependent. [N01, N33, N36] |
| OS | Clipboard, dialogs, notifications, microphone, keep-awake, tray, zoom, shortcut and context menu hooks. [N01, N39, N40] |
| Updates/recovery | Checks, apply, handoffs, boot state and logs are install-shape dependent; they cannot be replaced with a single npm updater call. [N41–N45] |

The exhaustive IPC index should be used for endpoint arguments/results/callers. This semantic report does not assert that every bridge method has been dynamically exercised or that every handler performs equivalent validation.

## 5. Windows, guests, navigation and OS interaction

Session windows are one extra OS window per session registry key; reopening reuses/focuses the existing one. They launch with minimum **420×620** and query flags before the hash (win=secondary, optional watch=1/profile/connectionId); watch spectator views resume lazily. Full instance windows use a different peer marker and ordinary shell; browser/HUD/overlay/quick/wake have specialized presentation. Their native lifecycle cannot be reconstructed as only React tabs. [N17, N16]

createWindowOpenHandler **always returns deny**. The exact Skills Hub origin can delegate an allowed external URL as a side effect through the audited opener; other guest/frame popups do not open OS browsers. Main-frame navigation stays on dev-server prefix or file: in production; other navigation is prevented and audited externally. Hub subframes remain pinned to the picker URL. [N46, N47]

Only the persist:hermes-preview webview partition gets the guest preload; applyPreviewGuestAttachPrefs also disables background throttling for that guest. Guest preload forwards a trusted primary-button click on a target=_blank anchor through sendToHost, and the host admits permitted schemes before native external open. Synthetic clicks cannot forge isTrusted. The full popup and trusted-origin exceptions must be preserved together; broadly calling openExternal from window-open would change the security behavior. [N47, N48, N49]

The native external opener allows http/https/mailto, routes file: and bare local paths through injected audited file resolvers, reports failures once for renderer fallback, and has a WSL→Windows cmd.exe start route. A local missing-file pre-stat error is separately classified so it is not falsely reported as no handler. [N50]

Media permission request/check hooks grant audio/video capture, fullscreen and automatic-fullscreen; absent media metadata is accepted for Windows compatibility, while other permission strings are denied by the predicate. Clipboard sanitized-write is separately limited to Hub origin. OS capture permissions remain separate from Electron grants. This is not an app-level modal for every getUserMedia call. [N51, N47]

hermes-media supports GET/HEAD and an explicit streaming extension list, forwards only accept/conditional/range headers, resolves local streams or remote profile/connection streams, and rejects unsupported methods/types/routes. This avoids forcing large media into data URLs and preserves seeking. [N52]

minimizeToTray registers primary windows with closeToTray:true and persisted preferences; second-instance/dock/tray activation restores minimized/hidden windows then focuses them. Ambient callbacks use a separate non-stealing focus policy. Linux notification implementation is distinct; ordinary Electron Notification support is checked elsewhere. Native notification dedupe is **1 s** by kind + session/tag; actions route to the original renderer, and runtime actions are not redirected to an unrelated fallback window. [N39, N40, N53]

Deep links use hermes in production and hermes-dev in dev (dev accepts both). They arrive via cold argv, second-instance argv, or macOS open-url and can queue until renderer readiness. Installation-shaped deep links require the renderer's explicit confirmation flow; the URL handler itself parses kind/name/params and routes rather than blindly installs. --close-preview is an additional second-instance escape hatch. [N12]

## 6. Terminal/process contract

registerTerminalIpc owns a session map and native PTY lifecycle. Start resolves local or SSH connection, cols/rows/cwd and shell family; output is gated so exit follows buffered output, attach reconnects a consumer, destroyed webContents disposes owned sessions, and app quit kills all PTYs before native environment teardown. [N23]

| Context | Shell and lifetime |
|---|---|
| Windows interactive pane | Explicit HERMES_DESKTOP_SHELL if valid; otherwise pwsh → Windows PowerShell → COMSPEC/cmd. PowerShell args -NoLogo; cmd empty args. [N23] |
| POSIX interactive pane | Explicit override or SHELL; otherwise /bin/zsh → /bin/bash → /bin/sh. bash/zsh use -il, other shells -i. [N23] |
| Windows MSYS override | applyWindowsMsysBashEnvDefaults normalizes defaults for explicit Git Bash/MSYS use. User pane is not inherently the agent's Bash shell. [N23] |
| Agent terminal tool | Python tools/environments/local.py resolves PM-owned bash; actual backend may be local/Docker/SSH/Modal/Daytona/plugin. Persistent cwd/export/tool job management remains backend behavior. [N54] |

terminalShellEnv removes npm config/package residue and NO_COLOR/FORCE_COLOR/COLORFGBG, sets COLORTERM=truecolor, TERM=xterm-256color, TERM_PROGRAM=Hermes, app version, LC_CTYPE, and HERMES_DESKTOP_TERMINAL=1. LC_CTYPE chooses existing value, macOS UTF-8, otherwise LANG or C.UTF-8. live cwd is read via /proc/PID/cwd on Linux or lsof with **2 s** timeout on macOS; Windows returns null/falls back. [N23]

| Process/service | Creator and communication | Lifetime / teardown |
|---|---|---|
| Electron main | OS package/launcher | App lifecycle and instance lock; guarded quit. [N08, N12, N16] |
| Chat/peer/helper renderer | BrowserWindow | Window lifecycle; process may be Chromium shared internally; exact OS process sharing UNVERIFIED. Source installs common crash policy per window. [N17, N55] |
| GPU/Chromium utility | Electron | Failure ladder below; actual live process inventory UNVERIFIED. [N11] |
| Canonical gateway owner | gateway ensure runtime/supervisor | Detached owner survives Desktop close; explicit gateway lifecycle/update operation owns stopping it. [N03, N05, N06] |
| gateway ensure/restart client | Electron resolved installation command | Bounded CLI client, 75 s ensure default / **120 s main restart client**; detached daemon is not its owned-child handle. [N05, N56] |
| Ticket helper | Python TicketBridge | stdin/stdout, 10 s request + 30 s idle; killed during will-quit. [N29] |
| Interactive PTY shell / SSH pane | node-pty | Tab explicit close or owner destruction, app quit; hidden UI must not imply process close. [N23] |
| SSH command/tunnel | SshConnection | Programmatic commands bounded; persistent forwarding owns its tunnel lifecycle. Managed update recovery can outlive app. [N32, N06] |
| Installer | Bootstrap runner PowerShell/Bash | Staged install with progress events, cancellation signal; runtime re-resolved after success. [N22, N57] |
| Detached update/relaunch waiter | Updater strategy | Outside package; captures PID/start time/package identity; waits for swap and reopens. [N44, N45] |
| Agent tools/MCP/browser/virtual desktop | Python execution providers | Backend-owned, not renderer-owned; documented recursively in runtime/tool reports. [N54] |

## 7. Shutdown sequence and ownership

The active shutdown comment explicitly states **Closing Desktop never stops the detached gateway**. backendShutdown inventories owned Windows children, aborts/seals the local lifecycle, stops any still-owned primary child, clears pooled route descriptors, and waits at most **7 s**. The Windows last net reaps only stragglers rooted in this package artifact and protects live Hermes runtime trees/shared tool store; it then verifies remaining owned children/locks. A helper named stopAllPoolBackends now only clears backendPool. Preserve behavior rather than infer kill ownership from its name. [N06]

before-quit first honors active-work guard; Keep Running clears quit/app latches without teardown. Once proceeding, it marks appQuitting/quitInProgress, begins tray quit, stops watchdog, joins managed remote updater/recovery operations before sealing SSH bootstrap, decides whether async backend/SSH cleanup needs a held quit, and uses a one-shot teardown coordinator. It resets clean-quit crash markers where appropriate, destroys pet/wake/HUD/quick helper windows, aborts installer, flushes logs, closes preview watchers, disposes **all PTYs before environment teardown**, then invokes backend shutdown. [N07]

will-quit closes ticket helper bridges, timed git children, isolated SSH keepalives, network keepalive agents, native notifications, and arms Windows quit-finalization timeout. The timeout is **10 s**, and only applies after will-quit; quit cancels it. app.exit skips will-quit, so exitAfterBackendShutdown explicitly kills timed git children before exit. [N58, N06]

For actually owned managed children, backend-child.ts uses Windows taskkill tree or POSIX process-group SIGTERM; waitForBackendExit waits **5 s**, escalates SIGKILL, waits another **1 s**, and throws if no confirmed exit rather than dropping ownership. close-stop-kill only processes explicitly passed PIDs, verifies survivors, and clears locks only when no live holder owns them. This compatibility/owned-child policy must not be applied to a canonical daemon merely because the desktop connected to it. [N59, N60]

Windows/Linux quit when last chat closes, even if a hidden helper window exists; macOS normally remains in Dock unless handing off update/uninstall. Tray-absorbed close can prevent the normal close sequence; explicit quit is distinct. [N53, N07]

~~~mermaid
flowchart TD
  Q[Quit / last chat close] --> A{Active work guard?}
  A -->|Keep Running| CONT[Clear quit latches; continue]
  A -->|Proceed| L[Latch app quitting; tray/watchdog stop]
  L --> U[Join managed SSH update/recovery operations]
  U --> S[Seal SSH bootstrap; start one-shot teardown]
  S --> H[Close helper windows; abort installer; flush logs/watchers]
  H --> P[Dispose interactive PTYs]
  P --> O[Abort owned starts; stop owned children; clear pool descriptors]
  O --> B[Bounded 7s wait + Windows owned-child/lock verification]
  B --> W[will-quit: ticket helpers, git children, sockets, notifications]
  W --> E[Electron quit]
  W -->|Windows stalled >10s| X[Hard exit]
  G[Detached canonical gateway] --> G2[Remains running]
~~~

The owned child and detached gateway distinction is explicit source behavior, not an optional cleanup preference. [N06, N07, N58–N60]

## 8. Recovery matrix

| Failure | Detection / state | Automatic behavior and user consequence | Source |
|---|---|---|---|
| Missing source runtime | Resolver returns bootstrap-needed | First-run installer/recovery; re-resolve after completion. | N21, N22, N57 |
| Missing bundled payload | Baked bundled shape, no runtime available | Refuse source bootstrap, report reinstall required. | N22, N30 |
| Local boot failure | latchedBootFailure/start attempt | Latched until recovery rather than repeating multi-minute installs on every API call. Remote transient failures classified separately. | N03 |
| Stale gateway descriptor | Ticket-control error | Forget descriptor and re-ensure once; next failure surfaces. | N05 |
| Stale owner code | code identity mismatch | One restart per tuple, re-ensure/preserve after-turn question access; attach as-is if unmovable. | N05 |
| Unsafe control permissions | lstat uid/type/mode/ACL policy | Explicit repair error; no repeated identical retry. | N28, N29 |
| Renderer crash/OOM/killed | render-process-gone | Reload live window within shared **3 reloads / 60 s** budget; intentional teardown suppressed; exhausted/unrecoverable termination gets visible recovery/error affordance. | N55 |
| Main-frame load failure | did-fail-load; excludes ERR_ABORTED (-3) | Primary opted-in bounded reload; exhausted budget shows error; helper/OAuth log-only unless opted in. | N55 |
| Unresponsive renderer | Electron event | Log only; no forced reload while busy. | N55 |
| Hidden window never painted | Reveal controller | 4 s fallback after load path; failed first paint explicit error path. | N18 |
| Sandbox/GPU boot loop | Versioned sticky marker, crash signatures | Windows/Linux sandbox ladder can append --no-sandbox after repeated boot aborts or recognized signatures; app update reprobes. Separate GPU/SwiftShader/stack-cookie policies exist. **Do not claim always sandboxed.** | N11, N61 |
| Auth code/state/timeout failure | Native login listener/token result | Reject and close listener; no persisted success. | N33 |
| OS keychain unavailable | Secret policy ON | Authoritative save failure; OFF avoids safeStorage after one migration attempt. | N34, N35 |
| Update fails after stop | Packaged handoff catch | Cancel pending relaunch, restore backend if stopped, surface aggregate failures. | N43 |
| Quit child never exits | Owned-child exit verification | Retain ownership/report failure; broader bounded quit/finalization remains. | N59, N60 |
| Power resume/stale network | Main resume listener + shared client | Main registers power resume hooks; shared WebSocket client has connect/replay/heartbeat mechanisms; full reconnect event protocol belongs to protocol report. | N24, N15 |

This table records source decisions. None of these failure paths was triggered against the installed app during this investigation.

## 9. Updates and package ownership

The baked InstallStamp chooses update owner. installShape reads payload kind; it is not guessed from whether a venv file happens to exist. commit-build forces external updates. An explicit updateMechanism other than self is honored; self/missing mechanism dispatches windows-handoff on Windows and posix-handoff elsewhere. The source strategy enum also includes manual and electron-updater. [N30, N41]

| Mechanism | Check / apply sequence | Required outside owner |
|---|---|---|
| app-installer | OS availability via payload Python winrt; unknown remains unknown. Prepare local .appinstaller descriptor; verify pinned feed authority/version when present; stage relaunch; teardown; open descriptor; quit. No registered feed can yield manual reinstall advice. [N42] | Windows App Installer, published compatible signed MSIX/feed. |
| microsoft-store | StoreContext client check → download before stop → relaunch registration → teardown → install confirmation → quit. Failure to register automatic relaunch is explicit failure. [N44] | Partner Center package identity and Store entitlement/distribution. |
| electron-updater (macOS) | Check pinned release, download, verify payload, verify signed install before stopping, then quitAndInstall; single apply guard, progress listener removed in finally. [N45] | Signed/notarized app and configured native feed. |
| external | Check reports unsupported/package-owner message; commit builds explain they receive no updates; apply returns explicit manual/unsupported response. [N41] | Steward/developer/package manager. |
| source checkout handoff | Strategy chosen by OS; detached updater/repo scripts own source swap, not in-place renderer mutation. Exact dirty-tree/channel/DB preflight is a separate updater module family. [N41] | Git/runtime toolchain and own update authority. |

applyPackagedHandoff gives preparation ownership to the strategy: the callback decides when stop becomes safe. If an error follows, cancel the relaunch registration and restore backend after begun teardown; aggregate failures are emitted as stage:error. [N43]

The Windows relaunch waiter script is a shipped resource staged **outside the package**. buildRelaunchWaiterArgs passes -NoProfile -NonInteractive -ExecutionPolicy Bypass -File, old PID, old process start time (PID reuse guard), identity name, ready-file, timeout. Waiter handshake default **10 s**; old-package/version wait default **900 s**; log diagnostic tail **16 KiB**. It uses absolute System32 PowerShell rather than inherited PATH into the package being replaced. [N62]

Managed SSH update transactions have journals and can survive app crash/restart; before-quit joins their operations before shutting down bootstrap, while next-launch recovery resumes captured scopes after the install marker clears. These operations require an actual remote host and cannot be made functional by cloning the visible update page. [N07, N15]

## 10. Build pipeline and outputs

The root is an npm workspace monorepo (apps/*, ui-tui, ui-tui/packages/*, web, tests-js). Desktop depends on file:../shared and root lockfile/tool resolution. Source package engines permit Node ^22.22.0, ^24.11.0 or >=26.0.0. These are current source declarations, not a proof of the installed launcher Node version. [N08, N63]

### Development

Desktop dev runs renderer and Electron concurrently: clean renderer → Vite **127.0.0.1:5174**; Electron TypeScript build → wait-on URL → esbuild main/preloads --dev → Electron with HERMES_DESKTOP_DEV_SERVER and XCURSOR_SIZE=24. Mock server and fake boot modes are separate scripts. CDP is exposed only on dev-server unpackaged runs, default **127.0.0.1:9222**; HERMES_DESKTOP_CDP_PORT can opt out or select 1024–65535. Packaged and non-dev-server dist smoke runs keep it closed regardless of override. [N08, N64]

### Source production compilation

buildSourceDesktop resolves repo, asserts root install, stamps identity **before flavored icons modify assets**, prepares native inputs when receipt incomplete, then invokes scripts/build/desktop.mjs with source/icons/stamp/native-deps/out. Compiler validates target-native node-pty binding and required mac helper, may reuse renderer only with matching input/output receipts, compiles Vite otherwise, bundles main/preloads regardless because stamp is baked there, copies native runtime tree, validates dist and records product receipt. Optional typecheck forces an actual renderer compiler pass. It does not rebuild Python dependencies as part of Vite. [N09, N65]

Vite uses relative base './', React plugin + scoped cached React compiler Babel pass, Tailwind Vite plugin, explicit empty PostCSS plugin config, offline bundled emojibase assets, app-local React/ReactDOM resolution to avoid version mismatches, and workspace realpath fs allow rules. Debug instrumentation aliases out outside dev/perf. [N66]

esbuild emits **electron-main.mjs (ESM)** from entry.ts with createRequire banner; **electron-preload.js (CJS)**; **preview-guest-preload.js (CJS)**. It targets node20 and externalizes electron, node-pty, get-windows, fs. Production bakes install stamp/product identity and environment defaults; dev deliberately leaves environment alone. [N09]

### Packaging

electron-builder.config.cjs is the single passed configuration. files whitelist dist/**, assets/**, public/**, package.json. Hooks include beforeBuild, beforePack, afterExtract, afterPack and mac afterSign. Extra resources include install-stamp.json, optional agent-payload for bundled/store, icon.ico and Windows update-relaunch-waiter.ps1. ASAR unpack patterns include **all dist/**, native *.node and prebuilds. Do not assume the frontend executes from opaque ASAR-only bytes. [N67]

| Artifact | Source → build/package mapping |
|---|---|
| Main | electron/entry.ts + main.ts dependency graph → dist/electron-main.mjs → resources/app.asar(.unpacked)/dist per unpack rules. [N09, N67] |
| Preload | electron/preload.ts → dist/electron-preload.js; absolute PRELOAD_PATH computed from app root. [N09, N10] |
| Preview preload | preview-guest-preload-entry.ts → dist/preview-guest-preload.js; attached only matching partition. [N09, N48] |
| Renderer | src/main.tsx/index.html/styles/imports → Vite dist/index.html/assets tree. [N65, N66] |
| Native PTY | prepared target-platform node-pty → dist/node_modules/native prebuild tree → unpacked native resources. [N65, N68] |
| Bundled Python/runtime | build/agent-payload staged by payload script and copied as extraResource; runtime subpaths come from InstallStamp.runtime, not hardcoded fixed venv layout. [N08, N30, N67] |
| Mutable state | HERMES_HOME and separate Electron userData, independent of immutable package executable location. [N13, N14, N34] |

Windows uses MSIX target. Source config minimum **Windows 11 22H2 (10.0.22621.0)** and maxVersionTested 10.0.26100.0, capabilities unvirtualizedResources, different Store/out-of-store identity/publisher, build-time manifest/extensions, and Azure Trusted Signing hook when configured. Signing credentials were not inspected. macOS minimum source config is **13.0**, dmg/zip, hardened runtime, entitlements and optional notarization hook. Linux config defaults AppImage while scripts also expose AppImage/deb/rpm targets. [N67]

Native staging owns acquisition/helper compilation and target-platform checks. The script deliberately uses libuv-backed copy/delete primitives for non-ASCII Windows path compatibility; main packaging should copy admitted prepared trees rather than reacquire native packages during beforePack. [N68, N65]

## 11. Material dependencies and why they are required

This is a purpose grouping, not an assertion that all source dependencies ship identically. Exact source versions are in package.json/package-lock.json; exact release-manifest versions belong to the parent artifact-identity ledger. [N08, N63]

| Category | Libraries | Purpose established by source usage |
|---|---|---|
| Desktop host | Electron, electron-updater, electron-builder | Native windows/preload/IPC/sessions, signed package updates, OS installers. [N17, N45, N67] |
| Native terminal | node-pty; xterm + Fit/Serialize/Unicode/WebLinks/WebGL addons | Shell pseudo-terminal, terminal display/resize/serialization/copy/link/accelerated rendering. [N23, N08] |
| Renderer/runtime | React/ReactDOM, React Router, Vite, TypeScript, esbuild | Components, hash/window routes, renderer compile and native bundling. [N08, N09, N17, N66] |
| State/server cache | nanostores/@nanostores/react, TanStack Query/Virtual | Feature state, authoritative request cache, large lists/transcripts. [N08, N26] |
| Conversation | assistant-ui, streamdown/math/code, Shiki, KaTeX, Mermaid, remark/unified | Transcript integration and rich response/code/math/diagram rendering. Exact per-consumer inventory in frontend report. [N08] |
| UI/layout | @nous-research/ui, Radix, cmdk, icons, Tailwind, motion, dnd-kit/react-dnd/react-arborist | Shared controls, command palette, pane/sort/tree interactions, styling. [N08] |
| Editors | CodeMirror family/Lezer | In-app source/editable content surfaces; consumer tree in frontend inventory. [N08] |
| Native git | simple-git, argv parser, git and gh binaries | Git IPC and worktrees/review/PR functions. [N38] |
| Transport | ws, proxy-agent/proxy-from-env; Node net/http/https | Native probes, ticket transport, proxied network and helper protocols. [N24, N28, N29, N32] |
| Remote desktop | @novnc/novnc | RFB browser client; full display server/auth chain in bot-screen report. [N08] |
| OS integration | optional get-windows, dbus-native | Native window-under read and Linux notifications; platform availability is explicit. [N08, N39] |
| Tooling/tests | Vitest/jsdom/Testing Library, Playwright, ESLint/Prettier, electron/rebuild, tsx, wait-on, concurrently | Pure native policy tests, UI tests, packaged/Electron E2E, code checks, native ABI rebuild, dev orchestration. [N08] |

## 12. Logging, diagnostics, testing, and minor systems

desktop.log is home-scoped, buffers flush every **120 ms**, and rotation defines **10 MiB** maximum, **3 backups**, active-log reclaim threshold **40 MiB** and **5 min** polling. Renderer lifecycle logging deliberately excludes arbitrary OAuth/portal console capture to avoid leaking sensitive guest console data. No personal log contents were read. [N14, N55, N69]

main-process-lag-watchdog observes late event-loop ticks and logs after recovery; it does not reset tray or windows. Linux Chromium diagnostics explicitly write a local desktop-chromium.log at ERROR severity, request local Crashpad minidumps, and call crashReporter with **uploadToServer:false, compress:false**; failures are best-effort and cannot block startup. This local crash-diagnostic mechanism is separate from the consent-gated shared-metrics crash counter below. [N70, N71, N14]

Validation commands are declared in apps/desktop/package.json: typecheck covers renderer/electron/E2E and config checkJs; lint covers src and electron; Vitest separates ui/electron projects; desktop lifecycle tests cover existing/fresh/install platforms; Playwright E2E/visual scripts build first. Fake boot/mock server/perf/reproduction tools are development-only. None were run because this task asks investigation/plan, not modification/validation of a new build. [N08]

Important existing native policy tests include local-gateway*, primary-backend-startup*, local-gateway-python*, backend-ownership/lifecycle, quit-teardown/finalization, backend-child, close-stop-kill, renderer lifecycle, window reveal, sandbox/stack-cookie fallback, native OAuth/token/partition, external-open/preview guests, node-pty disposal and update strategy/handshake tests. Their presence is source evidence of intended contract coverage, not passing-test evidence.

## 13. Active, compatibility, development-only and unresolved classification

| Classification | Items | Evidence / caution |
|---|---|---|
| Active canonical local | main startHermes gateway ensure/private ticket/descriptor cache | N03, N05–N07 |
| Active shared legacy compatibility | HermesGateway canonical adapter; shared JSON-RPC; remote source routes | N24, N26, N31 |
| Old attachment utility/comments | backend-discovery.ts dashboard token/serve story; optional attachHostBackend API not wired by current main | Do not reimplement as canonical local path; see main:12000 and N04. |
| Retained owned-child teardown | backend-child/local lifecycle/Windows close-stop | Still used for genuinely owned work; not daemon ownership. N06, N59, N60 |
| Runtime TUI-named modules | tui_gateway/contracts and backend request types | Shared Desktop dependency, not TUI presentation. Protocol report owns full inventory. |
| Development-only | Vite server/CDP/fake boot/mock/debug/perf | N08, N64, N66 |
| Production-only | Baked install stamp, signed package identities, staged payload/native resources | N09, N30, N67 |
| Platform-specific | Windows MSIX/PowerShell/pipe; macOS entitlements/AppImage alternatives/Wayland entry | N09, N29, N62, N67 |

An unreachable-looking source file is not classified dead merely because this pass did not trace a caller. Dead/experimental classifications require import/call evidence or packaged graph proof; such modules remain **UNVERIFIED** rather than silently omitted.

## 14. Service-dependent features and reconstruction boundary

A source-preserving desktop fork plus an isolated data home and compatible mature Hermes runtime is a recommended implementation strategy, **not observed behavior of the user's current project**. It retains the difficult runtime ownership/auth/session/tool boundaries. Rewriting only a small local engine beneath the full renderer requires first implementing every contract the renderer exercises, including mutation generations and reconnect semantics. [N03–N07, N24, N26–N29]

The following visible systems require outside products/infrastructure and cannot be made functional solely by copying UI source: Cloud discovery/agent sign-in and browser OAuth (preload cloud surface); native remote OAuth server endpoints; Microsoft Store distribution; OS App Installer signed feed; macOS signed/notarized update feed; published plugin/Skills Hub infrastructure; remote SSH host; model provider accounts/local inference endpoint; remote-screen display/VNC prerequisites; GitHub PR gh authentication. A local clone can provide compatible local alternatives, but equivalence must be defined and tested. These are external dependency boundaries, not reasons to omit their screens from inventory. [N01, N32, N33, N38, N42, N44–N46, N67]

## 15. Native-shell implementation stages for integration into the master plan

| Order | Purpose / modules | Interfaces, tests and definition of done | Do not implement yet |
|---|---|---|---|
| N-A | Freeze identity, source/dist map, own product/application/data roots and dependency lock | Source provenance; immutable release identifier; isolated HERMES_HOME/userData; launch resolver unit tests. Done when user state cannot bleed into production Hermes. | No installer/update action against original home. |
| N-B | Secure Electron shell and typed preload | Context isolation/sandbox/no Node; complete bridge schemas; native window/menu/dialog/clipboard/notification tests. Done when a mock backend drives all windows and route identity. | No generalized raw shell/Node escape hatch. |
| N-C | Canonical runtime attachment and grants | ensure client, descriptor cache, ticket helper, per-window nonce binding, REST purpose routing; malformed/expired/cross-profile/cross-window tests. Done when two isolated profiles reconnect to one surviving owner. | No per-profile serve children. |
| N-D | Actual session/protocol compatibility | Reuse shared + canonical adapter, generation/request identities, replay; lost ACK/stale response/multi-window and question-resume tests. Done when UI never duplicates or loses a durable submission under disconnect. | No independent renderer-owned agent state. |
| N-E | Native tools and guests | PTY IPC, git/files, preview isolation/media, local/SSH scoping; hidden terminal persistence/exit-flush/popup/focus tests. Done when native capabilities match route owner. | No connecting read-only process mirrors to stdin. |
| N-F | Recovery and finalization | Bounded native failure ladder, visible errors, telemetry decision, clean shutdown/installer cancellation/managed SSH journal. Done when induced crashes do not create invisible lock holders or kill detached gateway. | No broad process-name/PID heuristic kills. |
| N-G | Reproducible packaging and owned update service | Prepared native inputs, stamp, bundle outputs, own MSIX identities/feed/signing, waiter/rollback, clean-machine install/update/uninstall tests. Done when produced artifact works without dev server and owns its update authority. | No reuse of Hermes vendor signing/channel identity or inferred compatible upstream feeds. |

These stages are proposed work. Their behavioral contracts come from the source evidence above; acceptance must be demonstrated in the fork's own isolated environment.

## 16. Unverified and deliberately bounded items

- Dynamic production startup timing, actual bind ports, process inventory, renderer crash behavior, installer/UI appearance and accessibility: **UNVERIFIED**; source was inspected without launching target.
- Exact byte-level source↔dist provenance and packaged manifest dependency drift: parent artifact ledger is authoritative; this document cites current source.
- Full SSH managed-update backend/native Windows command chain, source checkout updater dirty-tree/channel/DB backup preflight, CSP effective headers for every renderer/guest, every filesystem IPC argument admission, and all native menu/shortcut accelerator values: partial here; exhaustive source indexes and dedicated security/protocol reports must cover or retain explicit gaps.
- Complete OS-signed artifact verification, mac entitlements effects, Store identity availability, update feeds and permissions on this machine: **UNVERIFIED**; code/config presence is not proof of entitlement or operational service.
- No claim is made that cloning all desktop directories yields a redistributable complete runtime without root shared/Python/native assets and service integration.

## 17. Native crash/update metrics and backend transmission

registerDesktopSharedMetrics wires a once-per-main-process startup latency claim, UpdateRunRecorder and RendererCrashRecorder. Startup latency uses main-process uptime from executable launch to the first renderer attach claim; later windows, reconnects and renderer reloads cannot claim another sample. Main records renderer loss through its common window-lifecycle callback, and update apply/progress flow through the recorder wrappers. [N72, N73]

Renderer crash collection is explicitly **per-window consent**: renderer reports the current profile's collection switch and scope; main hashes that scope to 16 hex SHA-256 characters and records only the bucketed reason crash/oom/killed/other, excluding clean-exit. It stores at most **20** entries in userData/renderer-crash-pending.json. take/ack lets only the appropriate profile/window claim its reasons; a same-window reload may reclaim, a second window cannot steal an outstanding claim, failure retains entries, and opting out deletes only that profile's entries. Raw titles, exit codes, profile names and paths are not stored by this recorder. [N74]

Update-run bookkeeping differs: UpdateRunRecorder persists a local **update-metric-pending.json** before packaged apply starts, because successful handoff may terminate Electron before the promise resolves. This local pending record is not described as consent-gated in its native constructor. Undefined mechanism (source checkout handoff) skips this native record because hermes update owns its own receipt. It records mechanism, start/version/optional commit date and sanitized outcome/stage/duration. An unresolved handed-off record becomes success only when next app version differs, otherwise failed/apply. Pending TTL is **30 days**; take/ack removes only after successful RPC resolution; no error text is sent in UpdateRunReport. Renderer reportPendingUpdateRun forwards **shared_metrics.update_run** and acknowledges only after the request resolves. Backend collection/send policy remains the final authority. [N75, N76]

The shared-metrics backend has separate explicit **telemetry.shared_metrics.enabled** (local collection) and **.send** (upload) flags; neither is inferred from mere use of the app. consent_state returns enabled/send/decided/reask, and set_answer forces send off when collection is off. shared_metrics.set writes/reconciles this answer and purges designated pending onboarding/process receipts on opt-out. Closed schema/counter dimensions, not arbitrary UI text, are the intended exported representation. The renderer's broader feature/day/friction gate is documented in the parent telemetry appendix. [N77, N78]

The local shared store is **<profile-home>/telemetry/shared_metrics/metrics.sqlite3** with outbox sibling; constructor requests 0700 directories and 0600 database, with retention **30 days**. Source schema tables include telemetry_state, counter_aggregates, package_outbox, send_consent_windows and consent_marks. This is a separate metrics database, not conversation history. Exact effective Windows ACLs remain UNVERIFIED. [N79]

Transmission default is **https://telemetry.nousresearch.com/v1/telemetry**, configurable through profile config, deliberately not an inherited endpoint env var. Unsafe non-HTTPS destinations are refused unless localhost HTTP. Sender bounds request timeout **30 s**, **3** in-process attempts per package/pass with full jitter exponential factor 5 from 1 s, maximum **20** packages/pass, **300 s** claim lease, **15 min** failed-pass backoff, **25** cumulative attempts, and gzip for payloads above **4096 bytes**. HTTP 202 marks sent; 400/413 reject permanently; 429 honors clamped Retry-After; network/timeouts/other statuses defer. Consent is rechecked before every claimed package and failures establish no consent. Package period must fit a recorded send-consent window, preventing later opt-in from silently authorizing all earlier collection. Relay's sender worker additionally rechecks that current endpoint is the one the pass was started for. [N80]

The default telemetry destination is a concrete external-service dependency. A fork should retain the consent semantics and select its own explicitly disclosed collection/export destination, or keep sending disabled. Copying upstream metrics code without that product decision would silently retain a vendor-bound service. This is a proposed fork requirement, not an assertion that any metrics were sent from this machine.

## 18. Exact source ledger

All paths below are absolute local source paths. Starting lines identify the cited symbol or contiguous behavior; where a source ID names multiple symbols, the additional anchors are stated.

| ID | Exact file path and symbol/line |
|---|---|
| N01 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/electron/preload.ts:28 — contextBridge.exposeInMainWorld('hermesDesktop'); connection methods :38; native API :339; filesystem/git :470; terminal :508. |
| N02 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/AGENTS.md:13 — authority seams; source engineering guide, corroborated by N03/N17/N26. |
| N03 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/electron/main.ts:11812 — startHermes; profile pin :11878; args :11939; startup helper :11953; ensureLocalGateway :12008; rejection handling :12029. |
| N04 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/electron/primary-backend-startup.ts:97 — runPrimaryBackendStartup; remote/create descriptor :58; current main omits attachHostBackend at main.ts:11953 and comments :12000. |
| N05 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/electron/local-gateway.ts:15 — runGatewayEnsure, constants :11; runGatewayOwnerRestart :87; createStaleGatewayRestarter :102; parser :138; endpoint check :169; ensureLocalGateway :216; redialLocalGateway :270. |
| N06 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/electron/main.ts:11643 — stopAllPoolBackends; reapInstallRootedStragglers :11657; backendShutdown :11689; exitAfterBackendShutdown :11733. |
| N07 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/electron/main.ts:18203 — before-quit; managed update join :18229; teardown tasks :18264; PTY disposal :18340; window-all-closed :18345. |
| N08 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/package.json:1 — source manifest; main/engines/scripts/dependencies/devDependencies. |
| N09 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/scripts/bundle-electron-main.mjs:31 — electronOutputs; bundleElectronMain :36; esbuild common/options :60 onward. |
| N10 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/electron/main.ts:720 — userData override; DEV_SERVER/IS_PACKAGED :728; preload paths :751. |
| N11 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/electron/main.ts:1025 — sandbox/GPU pre-ready recovery; commandLine no-sandbox :1088; runtime crash branches :13904 onward. |
| N12 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/electron/main.ts:1265 — instance lock; protocol scheme/parse :17681; lock losing exit :17829; second-instance :17851; open-url :17883. |
| N13 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/electron/data-paths.mjs:14 — normalizeHermesHomeRoot; platformDefaultHermesHome :26; resolveDesktopUserData :35; resolveDesktopHermesHome :41. |
| N14 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/electron/main.ts:1279 — HERMES_HOME; ACTIVE_HERMES_ROOT :1332; marker :1347; desktop.log/flush :1378; crash diagnostics init :1404. |
| N15 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/electron/main.ts:17888 — app.whenReady startup; migration :17928; services :17941; managed SSH restore :18003; menu :18004; activate :18022. |
| N16 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/electron/main.ts:13653 — createWindow; BrowserWindow setup :13656; reveal :13729; renderer load :14072 onward. |
| N17 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/electron/session-windows.ts:13 — secondary dimensions; chatWindowWebPreferences :49; buildSessionWindowUrl :74; instance URL options :99. |
| N18 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/electron/window-reveal.ts:18 — WINDOW_REVEAL_FALLBACK_MS; createWindowRevealController :20. |
| N19 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/index.html:13 — themed prepaint script / transparent window exclusions. |
| N20 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/electron/main.ts:10599 — ensureBackend; ensureRegistryBackend :10666; fresh ws URL IPC region :15148. |
| N21 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/electron/main.ts:4895 — resolveHermesBackend and complete resolver ladder through :5080. |
| N22 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/electron/main.ts:5102 — ensureRuntime; bundled damaged rejection :5127; bootstrap path :5139 onward. |
| N23 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/electron/terminal-ipc.ts:52 — registerTerminalIpc; shell :93; env :166; cwd :205; start :306; attach/write/resize/cwd/dispose :374–422. |
| N24 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/shared/src/json-rpc-gateway.ts:37 — request/approval/replay/connect constants; JsonRpcGatewayClient :136; native ticket WebSocket handling in connect graph. |
| N25 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/electron/local-gateway.ts:325 — createLocalGatewayDials/reserve/header binding through :371. |
| N26 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/src/api/client.ts:97 — HermesGateway; canonical prompt adapter :39; socketFactory :531; C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/src/api/canonical-protocol.ts:294 wire and :532 prompt response fence. |
| N27 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/electron/local-gateway.ts:479 — GatewayTicketPurpose; nativeGrantPurpose :483; nativeGrantRoute :501; nativeGatewayHttpHeaders :508. |
| N28 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/electron/local-gateway.ts:381 — privateNode; direct socket mint :653; reply validation :668. |
| N29 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/electron/local-gateway-python.ts:17 — TICKET_SCRIPT; TicketBridge :61; request :78; idle :133; closeGatewayTicketBridges :155; launcherRuntimePython :175; ticketRuntimeFor :229. |
| N30 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/electron/install-stamp.ts:23 — PayloadRuntime; InstallStamp :70; installShape :133; payload-backend.ts:12 bundledPayload; payloadTicketRuntime :51. |
| N31 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/electron/main.ts:7665 — fresh per-dial remote ticket; resolveRemoteBackend :10013; remote auth probe :10203. |
| N32 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/electron/ssh-connection.ts:17 — BatchMode design; constants :42; build args :239; runSsh :505; tunnel paths :1070/:1199. |
| N33 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/electron/native-oauth-login.ts:43 — DEFAULT_LOGIN_TIMEOUT_MS; runNativeLogin :78; C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/electron/native-oauth.ts:60 PKCE and :162 callback validation. |
| N34 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/electron/secret-storage-policy.ts:40 — SECRET_STORAGE_POLICY_FILE; readSecretStoragePolicy :54; classifyStoredSecret :89. |
| N35 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/electron/native-token-store.ts:97 — persistNativeTokenSet; authoritative write and normalization (policy is injected, see N34). |
| N36 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/electron/oauth-partition.ts:43 — legacy partition; connection prefix :60; documented registry routing. |
| N37 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/electron/fs-ipc.ts:31 — registerFsIpc. |
| N38 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/electron/git-ipc.ts:39 — registerGitIpc; native binary resolvers injected. |
| N39 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/electron/notification-ipc.ts:15 — registerNativeNotifications; dedupe :20; clicks/actions :53/:76; native delivery :113. |
| N40 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/electron/minimize-to-tray.ts:20 — createMinimizeToTray; main.ts:12314 tray integration. |
| N41 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/electron/updater/index.ts:38 — resolveUpdaterMechanism; external.ts:15 ExternalStrategy. |
| N42 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/electron/updater/app-installer.ts:98 — AppInstallerStrategy; C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/electron/app-updater.ts:70 checkAppInstallerUpdate; :101 triggerAppInstallerUpdate. |
| N43 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/electron/updater/packaged-handoff.ts:16 — applyPackagedHandoff stop/cancel/restore chain. |
| N44 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/electron/updater/store.ts:25 — StoreStrategy; check :30; apply :44. |
| N45 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/electron/updater/mac.ts:19 — MacStrategy; checkRelease :33; apply :56. |
| N46 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/electron/window-open-policy.ts:70 — createWindowOpenHandler; describeDeniedUrl :52. |
| N47 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/electron/main.ts:12180 — window-open; frame navigation :12191; main navigation :12217; guest escape :12236; permissions :6825. |
| N48 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/electron/preview-guest-throttle.ts:2 — PREVIEW_GUEST_PARTITION; applyPreviewGuestAttachPrefs :17; main.ts:12285 wiring. |
| N49 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/electron/preview-guest-preload.ts:35 — installGuestExternalHandoff. |
| N50 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/electron/external-open.ts:41 — reportPreOpenStatFailure; openExternalUrl :83. |
| N51 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/electron/media-capture-permission.ts:75 — isMediaCapturePermission. |
| N52 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/electron/media-protocol.ts:20 — MEDIA_PROTOCOL; createMediaProtocolHandler :113. |
| N53 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/electron/main-window-lifecycle.ts:55 — shouldQuitOnLastChatClosed; activateWindow :81. |
| N54 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/tools/environments/local.py:378 — build_subprocess_env; served_profile_child_env :414; _find_bash :543; terminal_tool.py:175 execution contract. |
| N55 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/electron/window-renderer-lifecycle.ts:133 — reload constants; shouldReloadAfterRendererGone :166; shouldReloadAfterFailedLoad :213; installWindowRendererLifecycle :278. |
| N56 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/electron/main.ts:11574 — GATEWAY_RESTART_CLIENT_TIMEOUT_MS; restartLocalGatewayOwner :11580. |
| N57 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/electron/bootstrap-runner.ts:432 — installerEnv; spawnPowerShell :441; spawnBash :545; fetchManifest :675; runStage :752; runBootstrap :856. |
| N58 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/electron/main.ts:16777 — will-quit; quit :16786; C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/electron/quit-finalization.ts:1 default 10s, createQuitFinalization :29; C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/electron/quit-teardown.ts:63 createQuitTeardownCoordinator. |
| N59 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/electron/backend-child.ts:53 — waitForBackendExit; stopBackendChild :120. |
| N60 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/electron/close-stop-kill.ts:66 — finishWindowsCloseStop; closeStopFailureMessage :119. |
| N61 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/electron/windows-sandbox-fallback.ts:196 — decideWindowsSandboxLaunch; app-version reprobe :231; fallback-marker :275; recognition/ACL/relaunch helpers :308 onward. |
| N62 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/electron/updater/relaunch-waiter.ts:11 — resource; defaults :22; absolute PowerShell :26; args :116. |
| N63 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/package.json:6 — workspaces; scripts :13; source dependency overrides :49. |
| N64 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/electron/dev-cdp.ts:45 — DEFAULT_PORT; resolveDevCdpPort :61. |
| N65 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/scripts/build/desktop.mjs:13 — validateNativeTree; buildDesktop :36; C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/scripts/build.mjs:9 buildSourceDesktop. |
| N66 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/vite.config.ts:10 — compilerPreset; cache :21; React resolution :72; offline emoji :99; defineConfig :135. |
| N67 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/electron-builder.config.cjs:73 — configuration; whitelist/hooks/resources :114 onward; ASAR :140; mac :143; Windows :235; MSIX :245; Linux :281; windowsSigning :340. |
| N68 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/scripts/stage-native-deps.mjs:1 — staging ownership; copyDirSync :57; target-native preparation modules imported :28. |
| N69 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/electron/log-rotation.ts:15 — LOG_MAX_BYTES/backup/discard; ACTIVE_LOG_POLL_MS :27. |
| N70 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/electron/main-process-lag-watchdog.ts:17 — createMainProcessLagWatchdog. |
| N71 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/electron/linux-crash-diagnostics.ts:25 — linuxCrashDiagnostics; enableLinuxCrashDiagnostics :57; main.ts:1397 wires plan before ready. |
| N72 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/electron/desktop-shared-metrics.ts:23 — registerDesktopSharedMetrics; main.ts:3505 registers; :4421 tracks updater; :14056 records main renderer loss. |
| N73 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/electron/startup-latency-ipc.ts:6 — createStartupLatencyClaim; registerStartupLatencyIpc :21. |
| N74 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/electron/renderer-crash-metrics.ts:19 — pending filename/cap; RendererCrashRecorder :55; registerRendererCrashIpc :190. |
| N75 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/electron/updater/update-metrics.ts:17 — pending filename/TTL; UpdateRunRecorder :85; track :101; take :205; ack :222; report :234; registerUpdateMetricsIpc :253. |
| N76 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/src/store/shared-metrics.ts:108 — reportPendingUpdateRun; RPC :121. |
| N77 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/hermes_cli/observability/shared_metrics_consent.py:57 — consent_state; set_answer :80; save_consent :92. |
| N78 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/tui_gateway/methods_shared_metrics.py:44 — shared_metrics.status; :55 shared_metrics.set; :115 shared_metrics.update_run; :132 desktop feature and friction family. |
| N79 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/hermes_cli/observability/shared_metrics.py:35 — schema/retention constants; schema DDL :49 onward; SharedMetricsStore constructor path :192. |
| N80 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/hermes_cli/observability/shared_metrics_send_config.py:15 — DEFAULT_ENDPOINT; resolve_send_config :47; C:/Users/bharg/AppData/Local/hermes/hermes-agent/hermes_cli/observability/shared_metrics_sender.py:30 constants, :129 reconcile_send_consent, :198 CONSENT_GATE_SQL, :410 _send_one, :474 send_pending, :516 _still_consented; C:/Users/bharg/AppData/Local/hermes/hermes-agent/hermes_cli/observability/relay_shared_metrics.py:1282 _run_send_pass. |
| N81 | C:/Users/bharg/AppData/Local/hermes/hermes-agent/apps/desktop/electron/backend-spawn-env.ts:1 — desktopBackendSpawnEnv. |

