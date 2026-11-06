---
title: "Product journeys and truthful interface state"
status: "PROPOSED DESIGN"
implementation: "NOT IMPLEMENTED HERE"
verification: "NOT RUN"
feature_id: "F23"
specification: "EDITION 1 PROPOSAL"
updated: "2026-11-05"
---

# Product journeys and truthful interface state

## Client ownership and navigation

Inherit [foundation](../architecture/contract-foundation.md) and [desktop bridge](../desktop/contracts.md). React renders canonical entities; Zustand holds drafts/tabs/view preferences, TanStack Query holds scoped server cache. No business entity is authoritative in local storage. Cache key begins workspaceId, then operation/filter/entity revision. Monaco is the text editor, xterm.js presents actual F12 PTY output, React Flow displays F07/F09 task state; none may simulate a successful backend action.

Navigation consists of project sidebar, session list, main chat/workspace area and contextual details panel. A session can open Chat, Files, Plan, Run and Approvals tabs. Settings contains Providers, Execution Profiles, Memory/Skills, Diagnostics and Backup. Automation/Workers/Browser/Deploy show capability state and are disabled with its actual reason until qualified; do not hide unavailable states behind fake demo data.

Draft={sessionId:Id,text:Text(65536),updatedAt:Time}; EditorBuffer={projectId:Id,path:Text(1024),baseDigest:Digest,text:Text(65536),dirty:boolean}; these live only in renderer memory in edition1. Backend reconnect preserves them; application exit explicitly warns about unsent/unsaved content. No claim of crash-persistent drafts. Binary/large files use read-only metadata/download, never a misleading text editor.

## User operations and owner mapping

- F23-OP01 Open project: native chooseProjectDirectory -> workspace.open -> sessions.list/create. Cancellation leaves selection unchanged. No hardcoded project ID.
- F23-OP02 Send message: generate one inputKey and envelope key, sessions.append, then show committed message. Starting execution is a separate Run action tied to an approved contract; sending cannot silently mutate the project.
- F23-OP03 Plan: requirements.create/revise/answer/confirm -> planning.create/revise/requestApproval. Show goal, unresolved questions, sources, task graph, effects, cost ceiling and criteria from actual records.
- F23-OP04 Run: runtime.start -> observe gateway stream -> runtime.get on resync. Stop invokes runtime.cancel and displays cancelling until authoritative terminal/blocked state.
- F23-OP05 Edit: workspace.read sets baseDigest; local edits stay dirty. Save creates blob, captures current base artifact, previews patch and applies through F08. If live digest differs from baseDigest, show a conflict comparison and preserve both versions; never silently rebase/overwrite.
- F23-OP06 Terminal: tools.terminalStart -> actual PTY output; input sequences/resize -> tools operations. Missing guest yields unavailable panel. Closing terminal view asks whether to end the session; merely hiding a tab stops observation only.
- F23-OP07 Approval: approvals.list/get -> exact Action/preview -> approvals.decide with displayed revision. On conflict refresh and require a new user decision.
- F23-OP08 Verify/artifact: verification.get plus workspace.artifact; show PASS/FAIL/UNKNOWN, missing criteria, actual evidence, source/artifact/contract bindings. Model prose cannot replace verdict.
- F23-OP09 Automation: automation.preview/create/edit/setState with explicit timezone; separate run state, delivery state and read status.
- F23-OP10 Settings/recovery: providers and native credentials; qualification actions; diagnostics export; backup/stageRestore with explicit native activation. Sensitive native actions use F22's narrow methods, not generic renderer filesystem access.

These are UI journeys, not extra RPC endpoints. All data shapes and policy remain with the linked domain owners.

## State and interaction specification

Every operation view supports initial loading, empty, ready, pending, denied, unavailable, conflict and failure. Long operations additionally show admitted/running/cancelling/blocked/terminal as returned. Pending buttons disable duplicate submission but keep the request key for response-loss recovery. A second click cannot generate a new key for the same intended action. Success toast only after the owner returns completion; Ack shows queued/running.

Read reconnect is automatic under F01 rules; mutation retry requires operation lookup with its original identity. Render out-of-order events only if entity revision/sequence is newer. On RESYNC_REQUIRED replace server cache, preserve drafts/dirty buffers and reopen the selected entity by ID. If it was archived/removed, show that state rather than selecting another project implicitly.

Editor supports UTF-8 <=64 KiB, preserving original line endings when unchanged; explicit conversion requires preview. Cmd/Ctrl+S invokes governed save, not direct disk write. Cmd/Ctrl+Enter sends composer message; Enter inserts newline unless the user's send-on-enter preference is enabled. Escape closes a dialog without approving. Destructive and approval dialogs have explicit confirm/cancel, initial focus on the title/summary, trap focus and restore it to the invoking control. Every icon action has an accessible name; status changes use a polite live region without announcing each streamed token. All controls are keyboard reachable, and state is not communicated only by color.

Dirty navigation offers Save through preview, Discard local buffer, or Cancel; no automatic discard. Application shutdown prompt distinguishes background runs from unsaved drafts. Display timestamps in selected local timezone with exact UTC on details; money displays rounded USD but details retain integer micro-USD and unknown amounts.

## Acceptance cases

| Case | Requirement / operation | Action | Required result |
|---|---|---|---|
| F23-T10 | R01 / OP01–04 | Real local-plan journey | Actual project/session/contract IDs; no simulated output |
| F23-T11 | R02 / OP05 | User edits file externally while editor dirty | Conflict UI, both versions retained, no silent overwrite |
| F23-T12 | R02 / reconnect | Lose response and stream after Run click | Same operation/run restored; no duplicate start |
| F23-T13 | R03 / OP07 | Approval changes while dialog open | Revision conflict, old click cannot approve new action |
| F23-T14 | R04 / all | Missing backend/guest/provider and keyboard-only interaction | Correct unavailable states, reachable recovery controls, no fake terminal |
| F23-T15 | R02 / OP08 | Remove required evidence receipt | UNKNOWN displayed, no success badge from model text |

Use actual Electron/browser observations for consumer acceptance. Screenshots and mock interfaces alone cannot establish a connected journey.
