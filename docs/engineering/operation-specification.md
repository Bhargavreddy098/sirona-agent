---
title: "Operation specification and build readiness"
status: "PROPOSED DESIGN"
implementation: "NOT IMPLEMENTED HERE"
verification: "NOT RUN"
updated: "2026-11-05"
---

# Operation specification and build readiness

An implementer must be able to determine the observable result of valid input, invalid input, duplicate input, concurrent input, cancellation and restart without inventing product behavior. A folder tree, architecture paragraph or C/B/U/V task pattern does not meet that standard.

This is the documentation review standard for all F01–F24 domains. It does not authorize implementation. The [depth audit](documentation-depth-audit.md) identifies current gaps; the [roadmap](roadmap.md) remains the sole phase ordering; [governance](../governance/decisions.md) retains execution authority.

## Keep the specification with its owner

Use the existing feature contracts and mechanism pages. Split a mechanism into subpages when readers need distinct operations, configuration reference or recovery procedures. The feature index links every new subtopic. CLI and UI pages reference the domain contract and specify only their own presentation, transport or interaction behavior.

Give each operation an ID such as `F03-OP01` and link its `F03-Rxx` requirements and `F03-Txx` scenarios. Assign IDs when authoring real operation specifications; do not create empty files to reserve them. A single behavioral rule has one owner. Shared schemas and policy are linked, not independently rewritten by each consumer.

## Required contents for each bounded operation

| Concern | What the author must settle | Insufficient wording |
|---|---|---|
| Purpose and boundary | Trigger, caller, observable success, non-goals, canonical owner, dependencies and affected consumers | "Implement sessions" |
| Authority | Trusted source of principal and scope; required capabilities; approval binding; when revocation is rechecked; rejection before disclosure or effect | "Check permissions" |
| Input | Every field's type, required/optional/null semantics, format, units, bounds, enum, default, normalization and cross-field rules | "Typed input" |
| Output and errors | Success and asynchronous acknowledgement schemas; named error conditions; transport mapping; retryability; safe user message; redaction | "Return actual result" |
| State transitions | Every state, permitted transition, triggering actor, guard, persisted change and terminal condition; illegal transitions and races | "Support cancellation" |
| Storage | Logical records and writer; keys, uniqueness, revisions, indexes and retention; exact DDL/schema version if storage changes; transaction start/commit and failure handling | "Use SQLite" |
| Concurrency and replay | Operation-key scope and lifetime; same key/same input and same key/different input; compare-and-set conditions; lease/fence rules; ordering | "Make it idempotent" |
| Effects and recovery | Intent/dispatch/receipt boundaries; crash before and after each; reconciliation evidence; permitted retries; compensation limits | "Retry on failure" |
| Configuration | Key, type, default, range, precedence, startup versus hot reload, effect on existing work, invalid-value behavior and secret-reference handling | "Configurable timeout" |
| Integration | Exact service/API/IPC/event handoff, version compatibility, producer and consumer responsibilities, dependency failure and acknowledgement semantics | "Wire the UI" |
| Consumer behavior | Loading, empty, denied, unavailable, partial, interrupted, conflicted and terminal views; reconnect behavior; actionable recovery; keyboard/focus behavior where relevant | "Show errors" |
| Acceptance | Requirement-linked fixtures, inputs, actions, observable outputs, forbidden effects and evidence; commands and source ownership for an authorized implementation slice | "Exercise the real domain path" |

Not every operation needs a database table, migration, network endpoint or approval prompt. Mark a concern not applicable with a reason. Do not invent an endpoint for an internal pure function or request approval for an already authorized action.

## Exactness rules

1. Specify numbers and units. "Bounded" must resolve to an explicit limit or a link to the owning configuration field with its default and valid range. If the choice is open, identify the affected operation as not ready.
2. Distinguish proposed values from values confirmed in source. Proposed API paths, schema names, source files and commands must be labeled as proposed. Never describe a command as executable when no package or test harness provides it.
3. Define compatibility per boundary. Unknown fields in a versioned response are a different question from unknown authority fields in a mutation request. An unconditional instruction to ignore unknown fields is not a safe universal contract.
4. Define cancellation separately for observation, queued work, active work and completed effects. Closing an event stream does not itself cancel its run. A cancellation request is not proof that an external effect stopped.
5. For local atomicity, name the transaction and uniqueness constraints. For external effects, define receipts and uncertainty; do not promise exactly-once execution from a database record alone.
6. Bind acceptance to the exact artifact, contract and environment being checked. A previous PASS does not transfer to a changed artifact. Missing evidence stays UNKNOWN.
7. Every requirement needs an observable assertion. Split compound requirements when one scenario cannot establish all their behavior. Add positive, rejection, boundary and recovery cases appropriate to the operation.

## Examples that reveal missing decisions

These are documentation review questions, not new runtime policy or approved schemas.

| Existing statement | Questions the completed specification must answer |
|---|---|
| "Resume the event stream" | Is the cursor exclusive? What is its scope and encoding? What happens for malformed, future and expired cursors? How does replay join live delivery without losing an event? How is revocation enforced during a subscription? |
| "Apply an atomic patch" | Is atomicity per file or across the whole patch? How are encoding, line endings, new files, deletion and rename handled? What is returned after a crash halfway through a multi-file change? How are unrelated edits preserved? |
| "Settle the budget once" | What monetary unit and precision are stored? What distinguishes an attempt from a logical operation? What happens when the provider reports usage after cancellation or reports no usage? When may a reservation be released? |
| "Skip missed schedules" | Which timezone and calendar rules apply? Does a DST fold produce one or two occurrences? Which instant wins after sleep? What happens if the schedule is edited while an occurrence is being admitted? |
| "Verify the build" | Which criterion requires which checker? What environment is pinned? How are missing, contradictory or stale receipts handled? Which changes invalidate which prior receipts? |

## Readiness is an explicit review result

Keep four facts separate: specification status, design approval, implementation status and verification evidence.

| Specification status | Meaning |
|---|---|
| Outline | Scope and invariants exist; operation details are incomplete |
| Specified proposal | Required semantics and examples are written; decisions may still need review |
| Ready for a scoped build | The operation and direct dependency contracts are settled; exact task/source plan and acceptance procedure exist; no behavior-affecting question remains open for that slice |

"Ready" is not execution permission. A ready operation can still be unimplemented and unverified. A design can be reviewed without running inference or deploying anything. Runtime verification remains NOT RUN until actual execution supplies evidence.

An unresolved decision records: question, owning domain, affected operation, available options, proposed choice and reason if known, dependency, and what evidence resolves it. Resolve routine design choices as proposals; route only decisions that genuinely need user authority through the existing governance rules. Keep decision outcomes in the existing governance/domain owner, not a second roadmap.

## Review procedure

1. Follow one user action through its actual proposed owners, including rejection and restart. Check that every handoff refers to the same identity, revision and effect.
2. Walk the valid example and each adversarial example using only the written contract. If two implementations could produce incompatible observable results while both following the text, resolve the ambiguity.
3. Check linked schemas, configuration values, operation IDs and test assertions for disagreement. Update owner, consumers and examples together when a contract changes.
4. Check navigation and relative links, then record semantic gaps separately from mechanical results. Passing a link check does not establish build readiness.
5. For an authorized implementation, compare actual source and acceptance evidence against the reviewed contract. Record deviations explicitly; do not silently rewrite the specification to make a failed implementation appear compliant.
