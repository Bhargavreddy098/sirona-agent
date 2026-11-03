<!--
Sync Impact Report
==================
Version change: none → 1.0.0 (initial ratification; no prior constitution existed)

Modified principles (template placeholders → ratified principles):
  PRINCIPLE_1_NAME → I. Brownfield Preservation (NON-NEGOTIABLE)
  PRINCIPLE_2_NAME → II. Explicit Approval for Consequential Operations (NON-NEGOTIABLE)
  PRINCIPLE_3_NAME → III. Layered Architecture Boundaries
  PRINCIPLE_4_NAME → IV. Evidence-Based Completion (NON-NEGOTIABLE)
  PRINCIPLE_5_NAME → V. Phase-Gated P0–P8 Delivery
  (added)          → VI. Actual-Stack Fidelity and History Retention

Added sections:
  - Technology and Environment Constraints
  - Development Workflow and Quality Gates
  - Governance (template section, populated)

Removed sections:
  - None

Deferred TODOs:
  - None. RATIFICATION_DATE is recorded as 2026-11-02, the adoption date of this
    initial document; no earlier constitution or ratification record exists in the
    repository.

Notes:
  - This report is temporary review scratch material and MUST be removed before the
    ratified constitution is committed.
-->

# Sirona Engineering Constitution

## Core Principles

### I. Brownfield Preservation (NON-NEGOTIABLE)

Sirona is a working product under active development, not a greenfield build. Every
contributor MUST inspect the real repository before proposing work.

- Existing verified implementations, UX workflows, API contracts and database behavior
  MUST be preserved unless an approved specification explicitly changes them.
- New work MUST extend the current owner of a capability — the existing route, service,
  typed client, schema, or component — rather than create a parallel one.
- Replacing working behavior requires explicit owner approval, documented evidence that
  preservation is not viable, and a rollback path.
- A second ORM, API gateway, provider registry, state system, UI framework, or event bus
  MUST NOT be introduced without an approved architectural justification.
- Deleting or rewriting tracked functionality to make a task easier is prohibited.

**Rationale:** Sirona already carries duplicate API surfaces, a half-migrated frontend
stack, and divergent storage paths. Each added duplicate silently splits authority and
makes security review impossible.

### II. Explicit Approval for Consequential Operations (NON-NEGOTIABLE)

Consequential, irreversible, or externally visible actions require explicit,
scope-specific approval before execution.

Approval MUST be obtained for at least:

- Destructive shell commands and high-risk shell/Bash operations.
- Sensitive filesystem changes, including deletions of tracked files or directories.
- Database mutations, schema migrations, data conversion, truncation or restore.
- Credential creation, rotation, export or migration.
- Privileged host, Windows, WSL, Docker or virtualization configuration changes.
- Paid provider inference, package purchases, and any deployment or release action.
- Removal of OpenSpec history, specifications, accepted ledgers or evidence.

An approval MUST name the target, the exact action or command, the data or files
affected, reversibility, and the rollback procedure. A feature request is never blanket
approval for unrelated destructive work.

When approval is missing or ambiguous, the affected operation stops, read-only work may
continue, and the result MUST be reported as BLOCKED rather than assumed permitted.

**Rationale:** The repository contains live user data, real credentials, and durable
execution state. Undifferentiated approval is the primary path to unrecoverable loss.

### III. Layered Architecture Boundaries

Authority MUST flow through explicit layers, and no layer may perform another layer's
job.

1. **Agent orchestration** plans and delegates. It holds no authorization of its own.
2. **Tools and execution adapters** perform bounded effects. They MUST NOT self-authorize.
3. **Permissions, identity, approvals and grants** are authoritative on the server. Model
   output and repository content never grant authority.
4. **Backend services and persistence** own validation, transactions, ownership scoping
   and durable state.
5. **Frontend presentation** renders and requests. It MUST NOT fabricate results, hold
   authoritative state, or bypass required transport and CSRF handling.

Crossing a layer boundary requires an existing typed contract. Policy MUST live in one
place; duplicating policy in a route, a tool, or a component is prohibited. The server is
authoritative for ownership, validation and effects; the client may cache and reconcile
but MUST NOT invent canonical state.

**Rationale:** Layered separation is the only mechanism that keeps approval gates
enforceable when orchestration, tools and UI evolve at different speeds.

### IV. Evidence-Based Completion (NON-NEGOTIABLE)

A feature is complete only when its behavior has been demonstrated, not when its files
exist.

Completion requires all of the following for the exact approved scope:

- Focused unit and contract tests for the changed behavior.
- Security and negative checks: invalid input, unauthorized access, foreign ownership,
  cancellation, retry and revoked authority as applicable.
- Integration verification against the real transport and the real registered route.
- File-level evidence: exact paths, command, environment, source revision, exit code and
  preserved artifact path, with secrets redacted.

Code presence, a compiled build, a mocked test, a screenshot, or checked Markdown boxes
are insufficient evidence on their own. A mocked test verifies only the boundary it
mocks. Where a required environment is unavailable, the verdict MUST be BLOCKED or
UNVERIFIED — never PASS.

**Rationale:** Historical phase claims in this repository have outlived the source they
described. Evidence tied to a revision is the only claim that survives refactoring.

### V. Phase-Gated P0–P8 Delivery

`docs/SIRONA-WORKSPACE-PLAN.md` is authoritative for phase definitions, dependencies,
acceptance gates and the mandatory technology matrix.

- Phases MUST be delivered in the documented order: P0 → P1 → P2 → P3 → P4 → P5 → P6 →
  P7 → P8.
- A blocked phase MUST NOT be skipped to unlock a dependent phase, even where an adapter
  has fewer technical dependencies.
- Each phase requires its own approval reference and its own recorded acceptance. A status
  string inside a Markdown file is not approval.
- Scoped phase acceptance never implies production release, hostile-code isolation, or
  real-provider qualification.
- P5 real-provider acceptance, P6 Gate B, P7 UI integration and P8 release/recovery
  qualification remain distinct, separately evidenced gates.

**Rationale:** Phase order encodes dependency and trust assumptions; reordering silently
converts an unverified dependency into a production assumption.

### VI. Actual-Stack Fidelity and History Retention

Engineering decisions MUST be grounded in the code and dependencies that actually exist.

- Contributors MUST verify current paths, packages, scripts and versions in the checkout;
  they MUST NOT infer the stack from plan text, summaries or prior assumptions.
- Documented paths are descriptive. When documentation and live source disagree, the
  contributor reports the discrepancy and follows the verified source.
- New frameworks, libraries, services or build tooling MUST NOT be adopted without
  approval and a written comparison against existing capability.
- OpenSpec change history under `openspec/changes/`, accepted specifications, ledgers and
  integration evidence MUST NOT be deleted, rewritten or reorganized without explicit
  approval.
- Unrelated code, backup trees and working-tree changes belonging to others MUST be left
  untouched.

**Rationale:** Plan documents in this repository reference retired paths, while the live
tree contains deleted and untracked work. Fidelity to the verified source prevents both
phantom implementations and collateral damage.

## Technology and Environment Constraints

The following baseline was verified during the initial audit of 2026-11-02. It is
descriptive, not prescriptive: each task MUST re-verify before relying on it.

- Applications: `apps/server` (Node ESM, Express), `apps/web` (React 19 + Vite, with
  dormant Solid dependencies mid-migration), `apps/desktop` (Electron main, preload and a
  local shim server), `apps/cli`. Shared packages under `packages/*`.
- Storage target: PostgreSQL with Drizzle and Zod boundaries, 24 SQL migrations present.
  `apps/server/config/db.js` also contains an environment-switched SQLite emulation path.
- P1–P6 typed modules compile to `apps/server/dist-workspace`, which runtime JavaScript
  imports. Build order is part of correctness.
- Windows Home is limited to the approved trusted-local Docker + WSL2 profile. Hostile-code
  and Hyper-V isolation are not qualified and MUST NOT be claimed.

Non-negotiable environment constraints:

- **Database reconciliation STOP.** Until the owner resolves the PostgreSQL/SQLite
  divergence, database-dependent implementation, migration application and
  database-dependent tests are BLOCKED. The SQLite emulation MUST NOT be treated as an
  approved substitute, and no command may repoint work to the live working database to
  obtain a green result.
- **Secrets.** Provider keys and operator secrets MUST NOT appear in source, fixtures,
  logs, responses, screenshots, commits or packages. Provider credentials belong in the
  OS credential broker; plaintext fallback MUST NOT be re-enabled.
- **Paid inference.** Real provider calls require explicit cost-scoped approval.
  Simulation and free transport tests never satisfy a real-provider gate.
- **Technology adoption.** Adding or changing a required technology updates
  `docs/SIRONA-WORKSPACE-TECHNOLOGY-LEDGER.md` with its qualification status.

## Development Workflow and Quality Gates

Every task operates in one explicit mode: INSPECT (default for unapproved work), PLAN,
IMPLEMENT, VERIFY, or REVIEW. Implementation requires verified approval for its exact
file and data scope.

Mandatory sequence:

1. **Intake.** One implementable specification per feature at
   `docs/features/FEATURE-<NNN>-<slug>.md`. If the specification template or governance
   documents are missing from the checkout, they are restored or rewritten before
   implementation proceeds.
2. **Discovery.** Produce an ownership map with real paths: UI entry point → typed client
   → transport → registered route → domain service → persistence or effect → tests. No
   file path may be asserted without verification.
3. **Contract first.** Freeze one request, response, error and event schema before frontend
   and backend work proceed independently. Field names, statuses and envelopes MUST NOT be
   invented on either side.
4. **Implementation order.** Domain logic and its tests first; then a thin validated and
   authorized route; then a real mounted registration; then the typed client; then the
   connected UI with its loading, empty, success, error, disabled, retry and cancellation
   states.
5. **Verification.** Run the smallest sufficient real test set, using commands read from
   the actual `package.json` files. A route file that is not mounted is NOT implemented.
   Frontend acceptance requires a real user action that produces a real network call, a
   real backend result, and truthful visible state.
6. **Evidence and handoff.** Record command, environment, source revision, exit code and
   artifact path. Update route coverage, the workspace ledger, the technology ledger where
   applicable, and the current handoff.

Additional mandatory rules:

- **UI-only tasks** MUST preserve existing UX behavior, design tokens, navigation,
  keyboard access, accessibility and backend integrations. Redesign, component replacement
  or a design-system migration requires separate approval.
- **Production paths MUST NOT contain fabricated data or mock-success fallbacks.** Test
  doubles are permitted only at explicit, labeled boundaries.
- **Fake running states are prohibited.** A reconnecting or offline state MUST be reported
  as such; a resource whose backend process died MUST NOT be shown as alive.
- **Regression protection.** Changes to shared contracts, routes, schemas or shared UI
  state require focused regression tests for adjacent flows.
- **Independent review.** Non-trivial work is reviewed against this constitution before
  acceptance, and the review cannot pass without evidence.

## Governance

This constitution governs engineering practice for the Sirona repository. It supersedes
ad-hoc convention and informal instruction, with one exception: an explicit, current owner
decision recorded in the repository governs the specific scope it authorizes. Where such a
decision conflicts with this document, the conflict MUST be surfaced and the constitution
amended; it MUST NOT be bypassed silently. This constitution and any editable feature
specification may never weaken an existing security control, approval gate, data
preservation rule, or the database reconciliation STOP.

**Amendment procedure**

1. Propose the amendment with its rationale, affected principles and scope impact.
2. Obtain explicit owner approval for the amendment itself.
3. Apply the change, update the version according to the policy below, and add a temporary
   Sync Impact Report describing the change.
4. Propagate required updates to dependent templates and commands at runtime resolution
   points; versioned template layers are never rewritten in place.
5. Validate that no unexplained placeholders remain, that the version line matches the
   report, and that all dates use ISO `YYYY-MM-DD`.
6. Remove the Sync Impact Report before committing the amended constitution.

**Versioning policy** — semantic versioning:

- **MAJOR**: removal or backward-incompatible redefinition of a principle or governance
  rule.
- **MINOR**: a new principle or section, or materially expanded guidance.
- **PATCH**: clarification, wording correction, or other non-semantic refinement.

**Compliance review**

- Every implementation and review verdict MUST state compliance with each principle.
- Non-compliance blocks acceptance. A time-bounded exception requires recorded owner
  approval, the exact scope, and an expiry or remediation condition.
- The constitution is reviewed at every phase gate and whenever P0–P8 scope is redefined.
- Runtime development guidance lives in `AGENTS.md` and the current handoff document;
  those documents MUST NOT contradict this constitution. Where they do, this document is
  amended or the guidance is corrected — the divergence is never left implicit.

**Version**: 1.0.0 | **Ratified**: 2026-11-02 | **Last Amended**: 2026-11-02
