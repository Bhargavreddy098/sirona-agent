# Sirona — copy/paste prompt for Codex, OpenCode, Antigravity or another coding agent

This prompt should be issued by the user or their orchestrator **when a specific feature is ready for inspection**. Merely adding/editing a Markdown file does not start an agent. Agent execution requires an explicit dispatch mechanism and appropriate permissions.

---

## Initial read-only feature inspection prompt

```text
Act as Sirona's senior full-stack integration engineer and architecture reviewer.

TASK: Inspect proposed feature: docs/features/FEATURE-[NNN]-[slug].md
MODE: READ-ONLY until the exact owner approval and all blocking prerequisites have been verified.

Read in this order:
1. Root AGENTS.md and any model-specific shim/instructions.
2. docs/README.md and docs/SIRONA-AGENT-HANDOFF.md.
3. docs/SIRONA-WORKSPACE-PLAN.md, docs/SIRONA-WORKSPACE-LEDGER.md, and the technology ledger.
4. docs/FEATURE-END-TO-END-WORKFLOW.md and the feature spec.
5. Applicable current accepted scope/phase approvals, normative sironadocs references and architecture/security/UI contracts.
6. Actual source, existing route registrations, schemas, services, clients and tests.

The attached docs were incomplete: root AGENTS.md, normative sironadocs, runtime source and several reports were not present in the supplied docs.zip. Resolve those against the real checkout. Do not guess their contents.

The latest attached handoff/ledger reported config/db.js using SQLite instead of the selected PostgreSQL configuration, invalidating the approved test-target guard. Inspect this first. STOP affected DB-dependent work until the owner has decided reconciliation and real source verifies that resolution. Preserve both databases and all user files.

FIRST OUTPUT, WITHOUT SOURCE CHANGES:
A. What the user feature should do and why it is needed.
B. Current code/route/service/client/UI ownership with actual file paths and line references.
C. Existing API reuse analysis; historical route manifest is 170 entries but post-simplification states 146 active. Verify live registration.
D. One end-to-end trace from real UI action to backend and data/effects and back to UI.
E. Precise proposed request/response/error schemas and any SSE/WS event considerations.
F. Exact files to change/create; dependencies; migrations; security/cost/host/rollback impact.
G. Acceptance criteria with tests and what constitutes actual evidence.
H. Blockers, conflicts, missing approval reference and smallest requested decision.
I. A proposed update to the feature spec using VERIFIED facts; distinguish UNKNOWN.

Do not edit protected code, modify data, run mutating suites, install packages, call paid models, auto-commit, push, deploy, activate flags, weaken auth or bypass existing approval gates. A Markdown plan is not authorization.
```

## Implementation prompt — send **only after exact approval**

```text
Implement docs/features/FEATURE-[NNN]-[slug].md end-to-end, strictly within the explicit owner approval reference [ACTUAL_APPROVAL_REFERENCE].

Read root AGENTS.md, docs/SIRONA-AGENT-HANDOFF.md, docs/FEATURE-END-TO-END-WORKFLOW.md, the approved feature spec, current ledgers and all relevant normative source/architecture files. Reconcile the latest worktree/source/DB state; do not trust historical pass counts for changed code.

Before modifying anything:
- Verify approval covers each exact protected file, SQL author/apply target, dependency, privilege and provider cost.
- Verify known blockers (especially SQLite/Postgres config/db.js conflict) are resolved for the affected slice.
- Save narrow before-change file hashes/rollback plan; preserve unrelated edits, real credentials and current databases.
- Trace existing route/service/client; prefer reusing existing contracts and owners.

Implementation order:
1. Freeze the shared API contract and write contract/behavior tests.
2. Implement domain service and repository changes using existing canonical owners.
3. Add/update thin Express handler and mount in production composition with existing auth, CSRF, project ownership, grant/approval, error and idempotency logic.
4. Prove actual HTTP and SSE/WS transport through the running backend; no orphan route.
5. Update the existing typed frontend client, query/stream state and feature hook.
6. Connect the actual UI in frontend/sirona-next, preserving design and accessible states.
7. Run focused backend, contract, frontend and real end-to-end UI/API checks against ONLY the explicitly approved test environment. Exercise failure, cancellation, duplicate, restart and reconnect as relevant.
8. Reconcile current route manifest and update actual ledger/handoff/evidence references.

For any necessary change outside approval: STOP only the affected slice, explain the file/reason, prepare a minimal amended approval packet; do not silently broaden scope.

At end return a table: requirement, backend source, DTO/client source, UI source, test, evidence, PASS/FAIL/BLOCKED/UNVERIFIED. List commands/exit codes, exact changed files, routes added/reused, DB version/target, approval IDs, rollback action and remaining gates. Never claim 'production complete' based on mocked, paid-unverified, or historical evidence.
```

## Independent reviewer prompt

```text
Review FEATURE-[NNN] against current root AGENTS.md, Sirona phase/approval restrictions, docs/FEATURE-END-TO-END-WORKFLOW.md and the actual source diff. Do not modify source unless separately authorized.

Check that every advertised UI feature calls a real typed client; every client operation maps to a registered real backend route; every handler calls the canonical existing service; every service uses approved persistence/guest/provider owners; and every requirement is supported by actual tests/evidence for the source commit.

Attempt to falsify completion using a foreign-project request, invalid DTO, disconnected UI, stale stream, denied approval/revocation, duplicate operation/retry, killed server/guest, and unapproved DB/paid/host path, as applicable.

Report precise defects by file and line; distinguish historical evidence from current code, and treat missing approval or unresolved SQLite/Postgres guard as BLOCKED rather than PASS. Provide only evidence-backed acceptance recommendations. Do not write 'all done' without tracing the whole live path.
```

## Minimal example message

```text
Inspect and propose implementation for docs/features/FEATURE-017-example.md.
Read root AGENTS.md, docs/FEATURE-END-TO-END-WORKFLOW.md, current handoff and ledgers. First produce the verified API/backend/frontend/DB ownership map and exact approval packet. No source changes until approved.
```

---

**Optional automation design (separate product feature):** your orchestrator can watch an approved task queue or explicit user action, load the feature Markdown, parse its metadata, check real approval references, acquire a write-scope lock, launch the agent with the read-only or implementation prompt, store receipts and tests, then request review/acceptance. Do not treat a changed `status: approved` string as proof of permission; authorization must be an actual owner-approved event/record. Watching files and running arbitrary instructions immediately would create unsafe execution and approval bypasses.
