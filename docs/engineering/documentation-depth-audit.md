---
title: "Documentation depth audit"
status: "PROPOSED DESIGN"
implementation: "NOT IMPLEMENTED HERE"
verification: "NOT RUN"
updated: "2026-11-05"
---

# Documentation depth audit

Audit date: 2026-11-05, before the Edition 1 expansion. Historical verdict: the library covered all 24 named domains but did not provide complete operation specifications. Automation had more topic pages but was not an implementation-ready exception. The findings below are preserved as the baseline, not a description of the current contract contents.

The subsequent [Edition 1 handoff](build-handoff.md) replaces every feature's contract/implementation/verification outline with selected operations, schemas, transitions, defaults, recovery and concrete acceptance cases. Shared [RPC types](../architecture/contract-foundation.md) and [SQL storage](../architecture/storage-contract.md) provide cross-domain consistency. Refer to the live owner documents for current behavior. External adapter selections/qualification, legacy conversion and actual runtime evidence remain separate; this historical audit certifies no implementation.

This is a coverage and ambiguity audit, not another implementation roadmap. Author missing behavior in the existing domain owners, using the [operation specification standard](operation-specification.md) and the phase order in the [roadmap](roadmap.md). The lists below identify concrete gaps, not an exhaustive inventory of every future operation.

## Evidence and comparison

At audit start, `docs/` contained 245 Markdown files. F17 had 23 pages, F24 had 10, and each of the other 22 feature folders had nine. Every feature had the same eight foundation pages and one mechanism page; automation additionally had 14 topic pages and CLI one additional cron page. These counts establish uneven topic decomposition, not correctness.

All 24 `contracts.md` pages deferred exact wire/schema decisions. Implementation guides used the same C/B/U/V pattern. Verification pages had stable scenario IDs, but generic actions such as "Exercise the real domain path" did not supply fixtures, exact expected results or runnable acceptance procedures. The current gap is therefore semantic as well as structural.

The latest supplied OpenClaw attachment contains repeated directory trees and six `FILE:` markers: two copies each of README.md, AGENTS.md and appcast-arm64.xml. It contains no marked documentation file bodies. The tree supports comparison of organization, not a claim to have audited all upstream documentation or code. See [reference provenance](../reference/openclaw-reference.md) for the attachment fingerprint and inspection limits.

Selected official upstream pages were also inspected on the audit date:

- [Automation](https://docs.openclaw.ai/automation/cron-jobs) separates schedule, execution, management, delivery and troubleshooting questions and provides command examples.
- [Gateway protocol](https://docs.openclaw.ai/gateway/protocol) separates transport, handshake, events, RPCs, versioning and identity, and identifies the schema source.
- [Session management](https://docs.openclaw.ai/concepts/session) specifies concrete duplicate-input, conflicting-input and interrupted-turn behavior, as well as operational limits and failure behavior.

The useful pattern is a connected chain of behavior, contract, examples, recovery and verification. The selected pages show that this pattern extends beyond automation. They do not prove that all OpenClaw documentation is complete or that its implementation satisfies every claim. Live pages are not a commit-pinned copy of the attachment. Sirona retains its own SQLite, Electron and governed-runtime design.

## Why the current library is shallower

The checked-in files demonstrate a broad first pass: the same domain-specific paragraph is reused in architecture, contracts, implementation and the mechanism page. Automation received extra subtopic decomposition, but many of those pages still contain one rule paragraph and one acceptance sentence. The files do not establish why a previous author stopped there; the observable result is that navigation breadth was developed further than operation detail.

For example, [recurrence](../automation/cron-jobs/schedules.md) asks for DST and misfire policies without selecting their behavior. [job management](../automation/cron-jobs/managing-jobs.md) requires revision checks without an exact request/result contract. [webhook protection](../automation/webhooks/authentication-and-replay.md) leaves the signature scheme and limits unselected. Expanding other domains to the same page count would preserve these gaps.

## Accuracy corrections made with this audit

Several feature targets described an existing implementation: a confirmed requirements stub, an internal worker, synthetic browser/deployment results, an active compact-chat UI and a read-only TUI. This checkout supplies no application source that establishes those claims. Targets now describe desired behavior. Earlier multi-file storage and compatibility constraints are conditional integration concerns requiring source evidence, not verified current state.

The blanket contract rule allowing unknown additive fields was also narrowed: compatibility policy must distinguish response extensions from incoming mutation/authority fields. The exact decoder behavior remains an operation-level decision.

## Domain gaps

Each section links the existing behavioral owner. "Required proof" describes future acceptance work, not a test executed during this audit. All domains also need the common schema, configuration, recovery and evidence details in the specification standard; the following gaps are domain-specific.

### F01

Owner: [Gateway and transport](../gateway/index.md), especially [streaming and replay](../gateway/streaming-and-replay.md).

Specify request admission, event subscription, replay-to-live transition and snapshot resynchronization separately. Missing decisions include request/error envelopes, cursor encoding and scope, inclusive/exclusive ordering, retained-history limits, malformed/future/expired cursor behavior, buffer limits and active-subscription revocation. Establish the event writer and the snapshot watermark with F03/F09.

Required proof: disconnect between two durable events, append during replay, reconnect at the last applied cursor, and observe the terminal state without a second mutation. Exercise expired history and a revoked subscriber without leaking events.

### F02

Owner: [Identity security and credentials](../security/index.md), especially [credential lifecycle](../security/credential-lifecycle.md).

Specify credential creation, reference resolution, rotation and revocation. Define authenticated principal establishment, workspace access, IPC request fields, reference ownership, encryption-unavailable behavior, lifetime of decrypted material and in-flight requests during rotation/revocation. Separate security policy from F22's native transport mechanics; identify which process may resolve a secret.

Required proof: a revoked credential cannot start a new provider call; a forged sender cannot store or resolve a secret; known secret canaries never appear in renderer payloads, errors or diagnostic exports.

### F03

Owner: [Sessions and persistence](../sessions/index.md), especially [SQLite transactions](../sessions/sqlite-transactions.md).

Specify database opening, transaction submission, session creation, message append, history pagination and session lifecycle. The current mechanism largely covers transactions, leaving the session half underspecified. Define session/run/message identity relationships, duplicate-message keys, ordering, revision conflicts, retention, cancellation versus archival, schema constraints, lock handling and failed commit outcomes. Treat any legacy conversion as a separate conditional operation.

Required proof: two concurrent submissions and a retry produce the specified number and order of messages; failed BEGIN cannot run the transaction body; failed COMMIT cannot return success; restart reads only committed state from the isolated database.

### F04

Owner: [Model providers](../providers/index.md), especially [streaming and cancellation](../providers/streaming-and-cancellation.md).

Specify model discovery, capability validation, request dispatch, normalized stream events and cancellation. Define exact text/tool/usage/terminal event shapes, fragmented tool arguments, malformed arguments, interrupted output, unknown model behavior, credential resolution and provider error mapping. Assign a provider attempt identity distinct from a logical runtime operation and connect its usage to F05.

Required proof: an interrupted stream preserves partial output without completing the turn; cancellation reaches the adapter; a repeated tool fragment cannot dispatch an effect twice. A selected real model and cost ceiling remain prerequisites for live qualification.

### F05

Owner: [Routing and budgets](../routing/index.md), especially [budget reservations](../routing/budget-reservations.md).

Specify route eligibility, reservation, settlement, reconciliation and fallback. Define currency/precision, estimate versus actual usage, pricing version, budget scope, reservation expiry, partial/late usage and concurrency checks. Decide when a fallback is permitted before and after provider output or tool execution; missing usage must not release authority as if the cost were zero.

Required proof: racing reservations cannot exceed the approved ceiling; duplicate settlement does not double debit; late usage after cancellation is reconciled; an ineligible fallback is never dispatched.

### F06

Owner: [Intent research and requirements](../requirements/index.md), especially [research provenance](../requirements/research-provenance.md).

Specify goal intake, clarification response, research attachment and requirement revision. Define record fields, evidence/source identities, timestamps, conflict handling, non-goals, measurable acceptance and which changes invalidate dependent plans. Distinguish a user decision from an inference or retrieved claim. Define when missing information blocks a specific operation and when an explicit proposed assumption is sufficient.

Required proof: conflicting sources remain attributable, an unanswered consequential question cannot become an approved requirement, and editing a requirement leaves older plan references visibly stale.

### F07

Owner: [Planning and Build Contracts](../planning/index.md), especially [Build Contracts](../planning/build-contracts.md).

Specify task DAG validation, contract revision, approval binding and runtime admission. Define the exact canonical digest input, ordered/unordered collections, requirement references, task dependency semantics, allowed effects, acceptance criteria, budget and invalidation rules. Clarify plan revision during active work and the authority held by already admitted operations.

Required proof: equivalent canonical data produces the same digest; changed effects or acceptance produce a changed revision; cyclic plans are rejected; Plan Only cannot admit a mutation.

### F08

Owner: [Approvals and governance](../approvals/index.md), especially [action approval](../approvals/action-approval.md).

Specify request creation, decision, consumption, expiry and revocation. Define the four product modes as an action-by-action policy matrix, exact action descriptor, principal binding, digest format, expiry clock, consumption transaction and duplicate-decision result. Legacy wire values require an actual source inventory before a mapping can be claimed compatible.

Required proof: two consumers racing one grant cannot authorize two distinct effects; changing the target invalidates the decision; revocation and expiry are rechecked at the defined execution boundary.

### F09

Owner: [Runtime and durable recovery](../runtime/index.md), especially [effect journal](../runtime/effect-journal.md).

Specify run admission, task dispatch, effect recording, cancellation, owner takeover and checkpoint resume. Define state enums, legal transitions, lease/fence rules, atomic writes, receipt schemas, checkpoint compatibility and uncertainty reconciliation. Name which owner prevents stale processes from updating records and how each external adapter handles stale or duplicated dispatch.

Required proof: terminate before dispatch, after dispatch and after receipt; fence the old owner after takeover; confirmed effects are not repeated and uncertain effects remain blocked pending reconciliation.

### F10

Owner: [Specialists and independent review](../specialists/index.md), especially [delegation and review](../specialists/delegation-and-review.md).

Specify specialist admission, assignment, return, cancellation and independent review. Define whether the three-specialist ceiling applies per parent, workspace or installation; how slots survive restart; scope and budget inheritance; allowed artifact writes; review independence; stale-review rejection; and repair limits. A numeric ceiling without its scope and atomic admission rule is incomplete.

Required proof: four concurrent attempts respect the chosen ceiling, a completed slot can be reused, a child cannot delegate, and review of an earlier artifact cannot certify its replacement.

### F11

Owner: [Workspace Git and artifacts](../workspace/index.md), especially [patch application](../workspace/patch-application.md).

Specify workspace opening, bounded read, patch preview/apply, artifact publication and separate Git effects. Define Windows path/case/junction policy, revalidation against path changes, encoding and line endings, binary files, create/delete/rename, multi-file atomicity, base-digest conflicts and recovery after partial application. Pin the preview's target and content to approval and receipt.

Required proof: a junction changed after preview cannot redirect a write; an edited base is preserved on conflict; a crash during a multi-file patch yields an explicit recoverable outcome; commit/push do not occur implicitly.

### F12

Owner: [Tool runtime and sandbox](../tools/index.md), especially [guest execution](../tools/guest-execution.md).

Specify profile qualification, command admission, process lifecycle, artifact export and cleanup. Define exact image/profile identity, command/argument representation, working directory, mounts, network policy, environment allowlist, resource/output limits, timeout and termination escalation. Reconcile the former host-opt-in wording with governance: the current target permits no host fallback.

Required proof: missing Docker blocks dispatch; denied mounts and network targets remain inaccessible; cancellation cleans up owned processes; the receipt records actual exit/output and the qualified profile. Qualification still needs an explicitly selected profile and authorized execution.

### F13

Owner: [MCP and code intelligence](../code-intelligence/index.md), especially [MCP and parsing](../code-intelligence/mcp-and-parsing.md).

Specify server registration/discovery, tool dispatch, search, parsing and index refresh. Define registration trust, transport/version, tool-schema change handling, output bounds, cancellation, file/language eligibility, parser versions, document revision and stale-index behavior. Keep server descriptions and repository content outside authority decisions.

Required proof: a tool changing its schema cannot reuse obsolete authorization; oversized results terminate within the selected limit; search/parser evidence refers to the requested project revision and is marked stale after edits.

### F14

Owner: [Context memory and skills](../context/index.md), especially [context and memory](../context/context-and-memory.md).

Specify context assembly, memory creation/correction/deletion, retrieval and skill loading. Define scope, provenance, ranking/tie breaks, token counting, reserved response budget, truncation, freshness, cache invalidation and deletion propagation into derived summaries/indexes. Define treatment of previously captured context in active runs and retained audit records when memory changes.

Required proof: another project's facts are excluded, deleted content is not retrieved through a stale cache, over-budget assembly records omissions, and a retrieved instruction cannot grant execution authority.

### F15

Owner: [Verification and quality](../verification/index.md), especially [evidence and verdicts](../verification/evidence-and-verdicts.md).

Specify checker registration/dispatch, receipt validation, verdict aggregation and repair invalidation. Define trusted checker identity, criterion IDs, artifact/environment binding, required versus optional checks, PASS/FAIL/UNKNOWN truth table, contradictory receipts and evidence retention. Define which artifact changes invalidate which prior results rather than reusing a broad previous PASS.

Required proof: absent required evidence yields UNKNOWN, a real failed required check prevents PASS, forged producer output is rejected and a changed artifact cannot inherit stale receipts.

### F16

Owner: [External worker adapters](../workers/index.md), especially [worker protocol](../workers/worker-protocol.md).

Specify adapter selection/qualification, handshake, assignment, progress, receipt and reconnect. Define protocol version, authenticated worker identity, capability negotiation, heartbeat/deadline, filesystem access, credential boundary and reconciliation after disconnection. An internal task worker is not evidence of external integration; no external adapter is selected here.

Required proof: reconnect after an uncertain effect does not duplicate it; a late result cannot override a newer fence; the worker cannot widen roots, effects, budget or delegation authority.

### F17

Owner: [Scheduling events notifications](../automation/index.md), including its existing cron, hook, webhook and notification subpages.

Specify schedule CRUD/preview, occurrence admission, runtime handoff, hook ingress and delivery lifecycle. Set recurrence grammar, timezone rules, DST gap/fold choices, overlap behavior, misfire defaults/caps and edit/pause race outcomes. Define uniqueness across schedule revisions so an edit cannot accidentally duplicate a due instant. Complete payload/event schemas, signature algorithm/key rotation, replay window, recursion limits, outbox retention and delivery retry policy. Scope the local inbox to the first automation release, which is later than IP10.

Required proof: concurrent pollers and a crash after admission recover one logical run; DST and machine sleep produce the selected occurrences; a delivery retry never repeats project changes; stale/replayed webhook input cannot dispatch again.

### F18

Owner: [Browser and computer runtime](../browser/index.md), especially [browser sessions](../browser/browser-sessions.md).

Specify adapter qualification, profile lifecycle, observation, navigation, sensitive actions and cleanup. Define profile persistence, origin/target binding, downloads/uploads, file boundaries, permission expiry, observation freshness, timeouts and reconnect. Separate browser permissions from native app/window targeting for computer control. Adapter absence must produce unavailable, with no manufactured observations.

Required proof: a changed navigation target cannot reuse an unrelated grant; a denied upload has no external effect; cleanup touches only owned resources; completion is tied to an actual adapter observation.

### F19

Owner: [Deployment and integrations](../deployment/index.md), especially [health and rollback](../deployment/health-and-rollback.md).

Specify target qualification, preview, deployment admission, health evaluation, reconciliation and rollback. The first target remains a real selection dependency. Define artifact/environment digest, secret references, external release identity, idempotency support, health thresholds/time window, rollout failure and rollback compatibility with new data writes.

Required proof: a changed artifact invalidates approval; a lost deployment response is reconciled before retry; health reflects probes; rollback follows the selected target's measured behavior rather than declaring success from a request acknowledgement.

### F20

Owner: [Observability and evaluations](../observability/index.md), especially [correlation and redaction](../observability/correlation-and-redaction.md).

Specify event/log emission, health probes, usage aggregation, diagnostics export and evaluation runs. Define correlation IDs, event schemas, redaction points, retention, backpressure and diagnostic access. The evaluation half needs dataset/provenance, case IDs, model/configuration pinning, metrics, thresholds, variability handling and an authorized cost budget; it is not supplied by logging alone.

Required proof: secret canaries cannot survive export; absent or stale probes yield unknown; duplicated usage events cannot inflate totals; an evaluation result identifies its exact cases and configuration.

### F21

Owner: [Release backup and recovery](../operations/index.md), especially [backup and restore](../operations/backup-and-restore.md).

Specify consistent backup capture, manifest verification, isolated restore, activation and update recovery. Define database/WAL treatment, artifact inclusion, credential recoverability, checksums, schema compatibility, disk-space checks, interruption, retention and destination containment. Identify when rollback is safe and when later writes require reconciliation. Source conversion is conditional on verified legacy input.

Required proof: a backup made with concurrent activity restores to a consistent isolated state; corrupted or incompatible input cannot overwrite the working store; interruption leaves originals intact; a fresh installation can use the restored state.

### F22

Owner: [Desktop shell and security](../desktop/index.md), especially [IPC contracts](../desktop/ipc-contracts.md).

Specify bootstrap, readiness, bridge calls, window/navigation policy, backend restart and shutdown. Define every proposed `window.sirona` method, request/result schema, allowed sender/frame, timeout and subscription cleanup. Define child-process ownership, port/auth handoff and crash-loop handling. Keep credential policy in F02 and execution policy in domain owners.

Required proof: a forged frame cannot invoke a native operation; backend failure becomes visible without discarding drafts; restart reattaches to durable sessions; shutdown terminates only the app's owned processes.

### F23

Owner: [Frontend product surfaces](../web/index.md), especially [workspace surfaces](../web/workspace-surfaces.md).

Specify chat/session navigation, editor/diff, terminal, planning, approvals and run monitoring as distinct user journeys. Define canonical API mappings, draft versus server state, dirty-buffer conflicts, pending requests, unavailable adapters, empty/error/cancel states, event deduplication, accessibility and reconnect. A compact visual direction does not establish an existing UI or complete interaction specification.

Required proof: each visible action reaches its canonical owner; reconnect does not replay mutations; editor conflicts preserve user work; approval summaries match the executed descriptor; keyboard and focus paths reach all actionable states.

### F24

Owner: [CLI and headless consumers](../cli/index.md), especially [headless commands](../cli/headless-commands.md).

Specify command grammar, authentication, project/session selection, mutation submission, observation and cancellation. Define flag/environment/config precedence, JSON schemas, stdout versus stderr, exit codes, noninteractive missing-authority behavior and interrupt semantics. Distinguish ending a watch from cancelling a run. CLI cron behavior links F17 instead of introducing another scheduler.

Required proof: CLI and UI requests produce the same authoritative outcome; invalid scope fails before disclosure; a reconnect does not resubmit work; noninteractive mode cannot auto-approve; interrupts follow the documented command-specific behavior.

## What counts as closing these gaps

Update the owner contract and mechanism with selected behavior, exact examples and requirement-linked acceptance cases. Resolve cross-domain dependencies at their owner and link the result. Review against the [specification standard](operation-specification.md). Only then update that operation's readiness; do not mark the entire domain ready because one operation is complete. Build and runtime evidence remain separate.

The audit itself identified missing work; the later Edition 1 owner contracts supply the selected baseline specifications. Remaining adapter-specific extensions are explicitly unavailable until specified and qualified. Neither this audit nor the new proposals constitute runtime evidence or guarantee that implementation review will uncover no further edge cases.
