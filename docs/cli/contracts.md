---
title: "CLI grammar, output and headless behavior"
status: "PROPOSED DESIGN"
implementation: "NOT IMPLEMENTED HERE"
verification: "NOT RUN"
feature_id: "F24"
specification: "EDITION 1 PROPOSAL"
updated: "2026-11-05"
---

# CLI grammar, output and headless behavior

## Entry, authentication and conventions

CLI executable name is sirona. Connect through F22's authenticated current-user pipe to the existing desktop or explicitly launched headless host. Do not open SQLite directly. If no host is ready, exit unavailable with the exact start/retry guidance; no automatic guest/provider/deployment activation. Tokens stay in process memory and are never printed or written to config.

Global flags: --json boolean default false, --workspace UUID optional (defaults handshake workspace), --timeout-ms integer1000..600000 default10000 for synchronous observation, --help and --version. Explicit flags override user config; supported config contains workspaceId and outputFormat only. Environment does not supply secrets or silently override workspace. Unknown flags, positional extras and missing required arguments exit2 before network dispatch.

Mutation commands require --key UUID; if omitted interactively, generate once and print operation/key to stderr before dispatch. In --json or noninteractive mode require explicit --key so a supervising process can safely retry. Existing-entity changes require --revision integer. Input JSON comes from --input PATH or stdin with --input -; max64 KiB, strict codec. Native credential prompting is unavailable headless; command explains how to configure it in the desktop.

## Command map

Each command uses the exact owning operation; JSON input uses its input schema, not a second CLI-specific schema.

| Command | Owner operation / behavior |
|---|---|
| sirona status | gateway.status |
| sirona project list | workspace.list |
| sirona project open | Interactive native selection then workspace.open; unavailable without native prompt |
| sirona session create --input FILE | sessions.create |
| sirona session list --input FILE | sessions.list |
| sirona session send --input FILE | sessions.append; records message only |
| sirona session history --input FILE | sessions.messages |
| sirona requirements create/revise/answer/confirm/get --input FILE | Matching requirements operation |
| sirona plan create/revise/approve/get --input FILE | planning.create/revise/requestApproval/get; approve requests review, does not grant it |
| sirona approval list/get/decide --input FILE | Matching approvals operation; decide requires authenticated human context, never synthesized from --yes |
| sirona run start/get/cancel/resume --input FILE | Matching runtime operation |
| sirona run watch RUN_ID --after SEQ | gateway.snapshot/subscribe; no mutation |
| sirona operation get OP_ID | operations.get |
| sirona file read/preview/apply --input FILE | workspace.read/previewPatch/applyPatch |
| sirona tool execute/get/cancel --input FILE | Matching tools operation; qualified guest required |
| sirona automation create/edit/enable/pause/list/runs --input FILE | automation.create/edit/setState/list/occurrences; enable/pause supplies literal state |
| sirona usage --input FILE | observability.usage |
| sirona backup create/list/restore-stage --input FILE | operations.backup/backups/stageRestore |
| sirona capability list | gateway.status capabilities; no activation |

F24-OP01 is parsing/validation; F24-OP02 is authenticated request dispatch; F24-OP03 is watch/reconnect; F24-OP04 is cancellation/interrupt handling; F24-OP05 is serialization/exit mapping. They are CLI responsibilities, not additional RPC names. Other feature operations remain available through the desktop or a future explicitly added command; no arbitrary eval/SQL/shell escape command.

## Output and exits

--json emits exactly one JSON value to stdout for ordinary commands: the shared success/error envelope. Human progress and diagnostics use stderr, never mix with machine output. Watch --json emits NDJSON, one shared event per line; initial snapshot line is {type:"snapshot",cursor,entities}, stream lines {type:"event",event}, terminal observation {type:"watch_end",reason}. Pretty output may summarize but must preserve actual state, unknown cost and operation ID.

Exit0 means the requested synchronous operation succeeded or async operation was durably admitted; an Ack is printed as admitted, not completed. --wait on run start/tool execute/backup create waits for the durable result and exits according to it. Exit2 invalid arguments;3 unauthenticated/forbidden/approval required;4 unavailable/deadline;5 revision/digest/key conflict;6 actual operation failure or FAIL verdict;7 blocked/uncertain/UNKNOWN;130 interrupted observation. For a completed run with F15 FAIL, --wait exits6; UNKNOWN/blocked exits7. Never map HTTP202 to completed success text.

## Interrupts and reconnect

Ctrl+C during read/watch stops observation and exits130 without cancelling the run. Ctrl+C while --wait observing a mutation also stops observation; print the operation ID for later lookup. Explicit run cancel/tool cancel is the only effect cancellation command. This prevents an SSH/terminal disconnect from accidentally cancelling durable work. A second interrupt exits promptly without deleting operation records.

Watch captures snapshot/cursor unless --after supplied, then follows F01 replay/backoff. Expired cursor fetches a fresh snapshot. Authentication expiry reconnects through the trusted pipe once, then fails explicitly if unavailable. No automatic mutation replay after transport loss: query operations.get or operations.lookup by the original operation ID/key; if status unknown, surface it. Noninteractive approval-required exits3 with approvalId and no waiting prompt; no --yes/--force bypass.

## Acceptance cases

| Case | Requirement / operation | Action | Required result |
|---|---|---|---|
| F24-T10 | R01 / OP01 | Unknown flag, bad UUID, missing noninteractive key | Exit2, no request sent |
| F24-T11 | R02 / OP02 | Same session/run operation through CLI and UI | Same owner/state/error semantics |
| F24-T12 | R02 / OP03–04 | Ctrl+C watch then query run | Exit130; run still active |
| F24-T13 | R03 / OP02 | Headless mutation lacks approval | Exit3 with approvalId; no auto-approval |
| F24-T14 | R04 / OP05 | Async Ack then actual failed/unknown result under --wait | admitted shown first, final exit6/7; valid JSON/NDJSON |
| F24-T15 | R02 / reconnect | Lose response after committed mutation | Lookup original identity, no duplicate effect |

Existing [cron command guide](cron.md) links F17 behavior; it must not define a separate scheduling policy.
