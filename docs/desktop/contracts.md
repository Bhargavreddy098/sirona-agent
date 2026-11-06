---
title: "Desktop bootstrap, native bridge and shutdown"
status: "PROPOSED DESIGN"
implementation: "NOT IMPLEMENTED HERE"
verification: "NOT RUN"
feature_id: "F22"
specification: "EDITION 1 PROPOSAL"
updated: "2026-11-05"
---

# Desktop bootstrap, native bridge and shutdown

## Process layout and lifecycle

Inherit [foundation](../architecture/contract-foundation.md). Electron main owns native windows, safeStorage and child lifecycle. One backend utility/child process owns F03 and HTTP; it receives an inherited private channel and per-launch 32-byte nonce. Renderer has contextIsolation=true, sandbox=true and nodeIntegration=false. Serve packaged UI under a registered secure sirona://app origin; deny navigation/window-open to other origins and all webview usage. External links require an explicit main-process allowlisted http/https open action, never file/javascript URLs.

Lifecycle is stopped -> starting -> ready; starting -> failed; ready -> recovering on backend death; any state -> stopping -> stopped. Readiness requires F03 schema check, F02 bootstrap and F01 listener identity, not merely a listening port. Startup deadline 30 seconds; restart at 1,2,4 seconds for at most three failures in 60 seconds, then failed with a user Retry action. Restart invalidates tokens and reattaches durable state; unsent drafts remain renderer-local.

## Exact preload surface

These are proposed window.sirona methods; no arbitrary channel-name argument is exposed.

- F22-OP01 getStatus() -> {state:"starting"|"ready"|"recovering"|"failed"|"stopping",message:Text(512) or null,version:Text(64)}.
- F22-OP02 call({v,operation,workspaceId,key?,expectedRevision?,input}) -> shared success/error envelope. Main derives token/principal from the validated sender and proxies only registered public RPCs; no bearer token is returned to renderer.
- F22-OP03 subscribe({after:Text(32),runId?:Id}) -> {subscriptionId:Id}; onEvent(callback) delivers {subscriptionId,event:Json}; unsubscribe({subscriptionId}) -> {closed:true}. Subscriptions belong to the requesting webContents and are cleaned on navigation/destruction.
- F22-OP04 chooseProjectDirectory() -> {selectionId:Id,displayPath:Text(4096)} or null. Selection is a 60-second single-use main-owned reference; F11 resolves it. Renderer cannot mint a path-grant by typing selectionId.
- F22-OP05 manageCredential({action:"store"|"rotate",binding:{kind:"provider"|"hook"|"worker"|"deployment",id:Id},credentialId?:Id,expectedRevision?:Int,key:Id}) -> F02 credential public entity or {cancelled:true}. Main presents native-owned secret input; renderer never receives secret/ciphertext.
- F22-OP06 openExternal({url:Text(2048)}) -> {opened:true}; only a user gesture from the trusted frame, http/https scheme and confirmation showing the exact host; no run/tool invocation through this helper.
- F22-OP07 retryBackend() -> {state:"starting"}; allowed only from failed.
- F22-OP08 manageRecovery(request) -> the F21 result/error. Request is one of {action:"activate_restore",restoreId:Id,key:Id,expectedRevision:Int,approvalId?:Id}, {action:"stage_update",key:Id}, or {action:"activate_update",packageDigest:Digest,key:Id,approvalId?:Id}. stage_update opens a native owned package chooser and supplies its private selection token to F21; cancellation returns {cancelled:true}. No arbitrary path or package URL is accepted from the renderer. Activation uses the exact F08 pending-grant protocol and never bypasses quiescence/validation.

Every invoke verifies sender webContents identity, main-frame identity and exact registered origin. Child frames are denied. Request/result codecs run on both sides; reject body >1 MiB. Maximum 32 outstanding calls per window; destroy/cancel only observation on window close, not completed or admitted project effects. Event callbacks return a cleanup function and cannot receive Electron's IPC event object.

## CLI and headless mode

Named pipe name is Sirona-{SHA256(current SID)[0:16]}, with Windows ACL limited to current user and system. Main authenticates the connecting peer using OS-provided process/token identity, not a claimed SID. F02 issues an 8-hour ephemeral token after this check. Pipe handshake is {v:1,client:"cli"} -> {baseUrl:Text(256),token:Text(64),workspaceId:Id,expiresAt:Time}; never write it to a log/config. Maximum five handshakes/minute per peer. If peer verification cannot be implemented or qualified, CLI connection reports unavailable rather than opening an unauthenticated pipe.

Electron --headless launches the same main/backend ownership without a renderer. It cannot display credential/approval prompts; public operations return approval_required until an already authorized grant exists. A second instance attaches to the existing owned process or exits with unavailable; it never opens a competing writer.

## Shutdown and recovery

Closing the last window asks whether to keep active work in the background; default remains open with the prompt until a user choice. Explicit Quit stops new admission, requests cancellation, allows 10 seconds for owned guest/process cleanup, records uncertainty, closes database connections and exits. Kill only owned PID/process-handle identities, never process-name matches. Unexpected OS termination is handled through F09 on next launch. Installation/update paths use F21; no automatic schema conversion from a renderer event.

## Acceptance cases

| Case | Requirement / operation | Action | Required result |
|---|---|---|---|
| F22-T10 | R01 / bootstrap | Backend port opens before schema check | UI stays starting; calls cannot observe ready |
| F22-T11 | R02 / OP02–05 | Forged origin, child frame, unknown operation, oversized body | Denied before native capability; no secret returned |
| F22-T12 | R04 / recovery | Kill backend during active run three times | Recovering then bounded failed state; no duplicate run admission |
| F22-T13 | R02 / shutdown | Quit with owned child and unrelated process | Owned cleanup attempted; unrelated process survives; uncertain work retained |
| F22-T14 | R03 / CLI | Connect wrong OS peer; connect authorized peer to headless host | Wrong peer denied; valid peer gets scoped ephemeral auth, no automatic approval |

Qualify native behavior on Windows/Electron, including actual IPC and pipe identity checks. [Electron security guidance](https://www.electronjs.org/docs/latest/tutorial/security) informs sender validation and renderer isolation; application tests remain NOT RUN.
