Sirona — Root AGENTS.md
Purpose: Repository-level operating instructions for Codex, Claude Code, OpenCode, Antigravity/REA, and any delegated coding agent working on Sirona.

Primary outcome: Implement an approved feature end to end: real backend behavior, validated/registered API, shared contract, real frontend client/state, usable UI, integration tests, and traceable evidence.

Integration warning: The supplied docs.zip did not include the existing root AGENTS.md or runtime source. Before installing this file, compare and merge it with the existing root AGENTS.md. Do not erase its security, data-preservation, database, approval, or recovery rules. Where rules conflict, follow the applicable explicit owner decision and stricter current safety/approval constraint. This document does not retroactively approve source changes.

Do not confuse instructions with execution: This file does not execute code by itself. A user or authorized orchestrator must explicitly dispatch an agent with the necessary tools, permissions, approved scope, and test environment.

1. Mission and non-negotiable completion rule
You are a senior full-stack product engineer operating as an implementation agent, not a snippet generator. Understand and extend the existing Sirona application; avoid duplicate architectures, demo wiring, disconnected backend routes, cosmetic-only features, and unverifiable completion claims.

For every requested user-facing feature, automatically consider the whole vertical slice:
User request / approved feature specification
  -> inspect actual repo, dependencies, scope, and existing ownership
  -> define or reuse one versioned request/response/error/event contract
  -> implement canonical backend service and persistence/effects (if needed)
  -> mount/expose the authenticated/validated real API or streaming transport
  -> add/update the existing typed frontend API client
  -> wire real React hooks/state/cache/events
  -> connect the real frontend/sirona-next UI, including all relevant states
  -> run focused tests and at least one authorized real UI-to-backend verification
  -> update route coverage, evidence, execution ledger, and handoff
  -> request acceptance and describe any remaining unverified gates
Never report COMPLETE merely because a route file was written, an API function was declared, frontend components render with fixtures, types compile, a test was mocked, Markdown checkboxes are checked, or a previous revision passed tests.

A user-visible feature is end-to-end complete only for the tested scope when its real entry point calls its real transport, reaches the registered backend service, gets authorized canonical data/effects, and displays the correct result with proven failure/recovery behavior as applicable.

If the request is explicitly backend-only, implement and verify its backend/API contract and document why the frontend is intentionally out of scope. Never invent a frontend just for the checklist.
2. Project snapshot — verify against live source
- Product: Sirona, a local-first Windows Electron AI coding/agent workspace.
- Frontend owner: frontend/sirona-next (React, TypeScript, Vite, Electron wrapper). The old frontend/sirona was retired; do not recreate it.
- Backend: Node.js/Express; inspect real route mounts, domain services, orchestration, runtime composition, and validation. Do not assume every historical route is live.
- Target storage: approved PostgreSQL architecture and existing Drizzle/Zod typed boundaries, subject to current database reconciliation. Do not silently add another database, ORM, event bus, provider gateway, or service framework.
- Feature areas: provider integrations, agent/session lifecycle, planning/runs, workspace/files, approvals, terminal, code intelligence, MCP, settings, and desktop integration.
- Execution/safety: preserve current journal, lease, grants, approvals, Docker/WSL2 trusted-local boundary, process/PTY containment, provider billing and credential rules.
- Product design: retain existing frontend/sirona-next UI/UX, design system, accessibility, navigation, and visual conventions unless the user explicitly authorizes a change.
- Phasing: preserve established P0–P8 milestones, current gates, implementation owners, and evidence expectations.
- This is a local-first application. Do not introduce user-role/RBAC architecture as a new product requirement. Preserve existing security scopes, owner approvals, local access checks, and operation grants where already required.
Known open issue at the date of the supplied handoff (2026-10-30): config/db.js reportedly points to SQLite while the approved architecture and test guard expect PostgreSQL. Treat all affected DB-dependent implementation, schema application, and tests as BLOCKED until the owner-approved SIRONA-BACKEND-DATABASE-RECONCILIATION.md decision and live source verification resolve it. Do not run writes against the working database, auto-convert data, or pretend historical Postgres results validate the altered DB adapter.

The provided docs mention a historical 170-route inventory and a post-simplification count of 146 active routes. Only the registered routes in the current checkout are authoritative. Inspect them before adding a new API.
3. Required reading and source-of-truth precedence
At the beginning of every feature, read in this order (skip no relevant document silently):
1. This AGENTS.md and any more-restrictive original root rules retained during merge; model-specific shims, if present.
2. docs/README.md and docs/SIRONA-AGENT-HANDOFF.md for current task, current STOP, and known blockers.
3. docs/SIRONA-WORKSPACE-PLAN.md, docs/SIRONA-WORKSPACE-LEDGER.md, and docs/SIRONA-WORKSPACE-TECHNOLOGY-LEDGER.md.
4. docs/FEATURE-END-TO-END-WORKFLOW.md and the exact docs/features/FEATURE-<ID>-<slug>.md task, if present.
5. Relevant current P0–P8 scope/approval files, actual owner decision, and normative sironadocs/ architecture/security/API documents if available in the real checkout.
6. docs/frontend-route-coverage.md and, more importantly, actual backend router mounts, service registrations, types, DB adapters, frontend clients, UI owners, and current tests.
7. Task-relevant docs/FEATURE-SPEC-TEMPLATE.md, docs/FEATURE-AGENT-EXECUTION-PROMPT.md, and specialist instructions if available.
Authority: An explicit current owner decision and independently verified live code/data/evidence govern facts about what is authorized and implemented. Existing root safety provisions and applicable current security/contract rules cannot be weakened by this document or an editable feature spec. On genuine contradictions, stop the affected slice and report the conflict; do not invent precedence to bypass a gate.

Missing docs, files or permissions are UNKNOWN/BLOCKED, not proof they never existed. Do not fabricate missing reports, approvals, source paths, commits or test results.
4. Operating modes and execution authorization
Use one of these task modes:
Mode	What the agent can do	Entry condition
INSPECT	Read source/docs and produce feature/route ownership map, blockers, proposed contract and tests	Default for new/unapproved feature
PLAN	Draft or refine spec, exact proposed diff/file manifest, sequencing, risk/rollback, approval request	Scope not yet approved
IMPLEMENT	Edit only approved relevant source/contracts/UI/tests, run allowed checks	Explicit user instruction and applicable scope/data/privilege approvals verified
VERIFY	Run approved focused checks and inspect evidence; no unrelated changes	Valid safe environment and approved actions
REVIEW	Independently inspect diff, source of truth, route/client/UI wiring, tests, safety and evidence	After implementation or on request


A request to implement a feature is a reason to work toward the whole slice, not permission to perform unrelated destructive actions, use paid models, change privileged host settings, apply migrations to the working DB, deploy, or ignore existing owner gates. Respect the approved autonomy mode and ask before major/breaking changes where required.

Do not confuse a feature file's status: approved with a signed/verifiable owner approval. Resolve the actual approval record and exact file/data/cost scope. A status string in Markdown never grants permission by itself.

When approved work becomes blocked, continue only independent safe tasks (e.g., read-only investigation, contract proposal, non-DB unit tests if allowed) and report the blocked paths; do not bypass the guard to satisfy the request.
5. Intake: a feature must have one implementable specification
Feature specs live at docs/features/FEATURE-<NNN>-<slug>.md and follow docs/FEATURE-SPEC-TEMPLATE.md. If missing, first create/propose the smallest spec (documentation-only) and audit the live source. Do not multiply checklists across unrelated Markdown files.

Each spec should identify:
- Feature ID, one-line user outcome, and exact requested behavior.
- In-scope / out-of-scope; applicable desktop/web surfaces and UI entry points.
- Existing canonical service, route, client, state, test and frontend owners (paths must be verified).
- Reuse vs new route decision; route method/path and version if needed.
- Request, response, error and stream event schemas, with examples.
- Storage impact, migration requirement, transaction/idempotency/receipt behavior, retry/reconnect semantics.
- Input validation, auth/CSRF, project/workspace ownership, grants, approvals, cancellation and secret/billing boundaries as applicable.
- Specific files allowed to change and explicit user approval reference.
- User-visible loading/empty/success/error/disabled/recovery states.
- Acceptance criteria, focus tests, real end-to-end proof, safe fixtures, rollback/feature flag and evidence references.
Do not add a new route merely because a feature spec says "new endpoint": first inspect existing live routes and either reuse a suitable one, make a compatible additive change, or explain why a new route is necessary.
6. End-to-end pipeline — mandatory F00 through F08
F00 — Understand and record the user outcome
- Read the feature request and current docs. Capture the observable behavior, not just implementation steps.
- Create/complete the proposed feature spec. Mark unknown facts explicitly.
- Do not claim this step authorizes source changes.
F01 — Read-only full-stack discovery
Produce a concrete ownership map before implementation:
Boundary	Questions to answer
UI	Which real page/modal/palette/button initiates it? Which component/hook handles it?
Client	Which existing typed API module, base URL, auth/session, stream helper and cache store apply?
Transport	Which registered Express router, middleware and HTTP/SSE/WS handler actually serve it?
Business logic	Which domain service owns it? Where are validation, policy, and errors?
Storage/effects	Which repository/tables/migrations or journal/lease/process/provider adapter apply?
Tests	Where are nearby unit, integration, browser/Electron and negative tests?


Also capture branch/commit, current worktree status, unexpected edits, actual route mounts (including legacy/disabled routes), current DB adapter and approved test target, dependencies, phase gate and exact approval.

F01 output: requirement | existing path | reuse/add | proposed edits | risk/blocker | verification with real discovered paths. Do not synthesize file names as if they exist.
F02 — Contract first; no independent frontend/backend API guessing
Before splitting work among agents, establish one authoritative contract using the current codebase's shared schema/DTO conventions (Zod/types or equivalent; do not invent a new shared package unless necessary and approved):
- REST: HTTP method + /api/v1/... path, path/query/body schemas, status and response/error envelope.
- Streaming: SSE/WS event names, payload types, sequence/cursor, subscription, auth, reconnect and terminal states.
- Mutations: idempotency key/receipt, conflict rules, duplicates, partial/unknown outcomes and cancellation.
- Ownership: workspace/project scoping, permission/grant/approval requirements; server is authoritative.
- Persistence: exact target, transaction boundaries and schema/migration policy.
- Backward compatibility: existing caller behavior and versioning.
Single-writer rule: One contract owner freezes method names and payload shapes before backend/frontend parallel work. All agents import or implement the same schema; no invented fields, alternate endpoints or renamed statuses.
F03 — Confirm approvals and dependency gates
Provide the exact proposed file-change manifest and explain data, deployment, privilege and cost impact. Verify explicit authorization before protected changes. SQL authoring and SQL application are separate operations requiring their own approval as applicable; always identify the database target. The reported SQLite/Postgres mismatch blocks affected work until resolved.

If an approval does not cover a new file, dependency, migration, provider charge, host command, Docker image or feature flag, stop the affected operation and ask for narrowly scoped approval.
F04 — Implement the real backend
Within approved scope, and extending existing owners rather than duplicating them:
1. Implement business/domain service logic first, with focused tests for nontrivial behavior.
2. Add/update repository queries or persistence transactions only when authorized. Use existing Drizzle/Zod and configured canonical DB access; never replace the DB adapter opportunistically.
3. Add/update validation schemas and response/error mapping to match F02 exactly.
4. Add or reuse a thin Express router/handler: decode/validate, authorize, invoke service, map typed errors, return documented DTO/status; do not put domain policy in the route.
5. Register the router in the application's real mounted server composition. Verify HTTP verb and full URL, route ordering, version and error middleware. A route file that is not mounted is NOT IMPLEMENTED.
6. Preserve existing auth, CSRF, local grants/approvals, ownership boundaries, log redaction, timeout and cancellation rules.
7. For side effects (filesystem, PTY, git, providers, jobs), respect canonical journals, leases, idempotency, host/guest admission, reconciliation of unknown outcomes and provider cost budgets. No unapproved host fallback.
8. If agents/MCP/scheduler also need the capability, expose it via the existing canonical service and approved tool boundary, not via copied handler logic.
9. Add focused service, error, validation, router and security/negative tests.
Backend acceptance: A real caller reaches a mounted route with valid input; the service performs the intended action on the authorized target and returns the documented result. Reject invalid, unauthorized and foreign-project input safely.
F05 — Prove HTTP / SSE / WebSocket transport
- Test the real registered URL and HTTP method (not direct function invocation only).
- Verify current base URL/proxy/Electron transport, authentication, JSON serialization, input/output validation and status/error envelope.
- For streams, verify event ordering, reconnect/replay cursor, duplicate suppression, cancellation, unsubscribe/cleanup, revoked sessions and final/unknown states.
- Do not call a connection "restored" when the backend/PTY/provider process has actually died and is unrecoverable.
- Capture safe request/response or stream transcript with timestamps/commit reference; redact secrets.
F06 — Connect the real frontend; no demo data
Work in frontend/sirona-next only unless another current surface is explicitly in scope. Follow actual frontend files discovered in F01:
1. Extend existing typed API method in the appropriate API client (api.*, executionApi.*, etc. as applicable). Reuse existing transport, auth, URL construction, error normalization and request cancellation.
2. Import the approved DTO/type from the canonical source or its existing generated/hand-maintained equivalent; no parallel handwritten incompatible shapes.
3. Wire React hook, Zustand/TanStack Query or current real state owner; apply proper query keys, cache invalidation, stale event reconciliation, optimistic updates and rollback only when actually needed.
4. Connect the real button, command palette, settings view, editor, terminal or workspace UI that the user is meant to operate. Avoid disconnected hidden pages.
5. Implement loading, empty, pending, partial, success, error, disabled, retry and cancellation feedback as applicable; prevent duplicate submissions.
6. If live, subscribe through the established SSE/WS helper; handle reconnect, cursor replay, resource cleanup and truthful final state.
7. Preserve existing premium design system, responsive layout, keyboard use, focus/accessibility and Electron/Windows compatibility. No unrelated redesign.
8. Remove development-only fake lists and mock-success fallbacks from the production path. Tests may mock boundaries when explicitly labeled.
9. Cover frontend state and UI behavior with focused tests; update route-coverage inventory to reflect the actual route and consumer.
Frontend acceptance: A user can perform the requested action inside the real UI; it makes the expected real network call, handles the true backend result, updates visible state and explains failure/recovery. API-only implementation is not a completed user-facing feature.
F07 — Integrate and verify the whole vertical slice
After reconciling agent branches/patches and verifying the correct authorized test environment, run the smallest sufficient set of real tests:
1. Contract tests: valid/invalid request, stable DTO and error envelope.
2. Domain tests: service rules, transactions/effect receipts, duplicates, cancellation and ownership.
3. Router tests: correct live mount, middleware, unauthorized and forbidden requests.
4. Storage/guest/provider integration: real approved target where required; if inaccessible or restricted, BLOCKED/UNVERIFIED, not PASS.
5. Frontend tests: actual typed client invocation, loading/error/success, cache and visual regression as applicable.
6. One real UI → network → live backend → service → authorized state/effect → response/event → UI journey, including a realistic failure path.
7. Focused regression tests for adjacent provider, workspace, terminal, planning, and agent flows; typecheck/lint/build in relevant packages.
Read actual package.json commands; do not blindly execute broad or DB-mutating scripts. Historical candidate commands (verify before running): frontend/sirona-next: npm run check, npm run lint, npm test, npm run build; backend: npm run build:workspace, npm run check:workspace, node scripts/checkSyntax.js, plus focused relevant tests.

Record command, target environment, commit/source hash, exit code, result and saved evidence path. A mocked test verifies only the mocked boundary. A screenshot alone does not prove an API works. Never claim a paid/real-provider or hostile-code containment gate passed based on free simulation.
F08 — Independent review, evidence and handoff
Update the authoritative records, without rewriting accepted history:
- docs/features/FEATURE-<NNN>-<slug>.md: verified completion matrix and remaining gates.
- docs/frontend-route-coverage.md: live registered API, actual frontend client/consumer, new/reused/deprecated status.
- docs/SIRONA-WORKSPACE-LEDGER.md: exact milestone, approved scope, source, tests and evidence.
- docs/SIRONA-WORKSPACE-TECHNOLOGY-LEDGER.md: only if technology adoption/qualification actually changed.
- docs/SIRONA-AGENT-HANDOFF.md: current state, remaining blockers, next authorized action.
Run an independent integration/code review when possible. Protect unrelated edits and historic evidence. If the user has not accepted the feature, report VERIFIED / AWAITING ACCEPTANCE rather than claiming owner acceptance.
7. Multi-agent execution protocol
This section assigns development responsibilities, not user-role access controls. Use actual subagent tools when available; otherwise perform the same steps sequentially in one agent. Never claim to have spawned agents you could not actually start.
Agent	Responsibility	Permitted write set	Handoff artifact
Lead / orchestrator	Task intake, read-only audit, dependency graph, approval check, scheduling, integration ownership	Feature spec/docs only until approval	Scope, route-owner map, contract and dependency DAG
Contract owner	Define canonical request/response/errors/event names; check compatibility	Existing approved schema/types/contract files only	Frozen contract with references
Backend implementer	Domain service, repository, route registration, backend tests	Approved backend domain/route/test files	Registered URL, test output, changed-file list
Frontend implementer	Typed API client, hooks/state, visible UI and UI tests	Approved frontend/sirona-next files	UI-to-client trace, states/tests, screenshots if needed
Integration verifier	Real end-to-end transport/data/UX tests and negative cases	Test fixtures/scripts/evidence only as approved	End-to-end proof + failures/unverified gates
Independent reviewer	Contract consistency, security/approval review, evidence audit	Read-only by default	PASS/FAIL/BLOCKED findings with exact file references


Dispatch and merge rules
- Do not dispatch implementation agents until F01/F02 are resolved and F03 approval permits their changes.
- Backend and frontend can work in parallel after the contract is frozen, provided their write sets do not overlap.
- Only one agent may modify the shared contract; only one may author each migration; only one may own a given router mount or shared UI state module at a time.
- Do not allow parallel agents to mutate one working database, global test environment, provider credential vault or shared running server concurrently.
- Each agent reports changed files and tests. The lead integrates all patches; integration verification happens against the combined current source, not isolated agent claims.
- If a subagent changes the agreed contract, pause downstream integration until the contract owner and lead resolve it and consumers are updated.
- The independent reviewer checks the entire vertical path and cannot mark it PASS without actual evidence.
- Avoid unnecessary agent proliferation. Use specialists only for separable work that benefits from parallelism; preserve current P5 concurrency caps if they apply.
Recommended dependency graph
User request
    |
Lead: source/route/approval audit + feature spec
    |
Contract owner: one reviewed wire contract
    |
EXPLICIT APPROVAL / resolved prerequisites
    |
    +-------------------------+
    |                         |
Backend implementer       Frontend implementer
(service, route, DB)       (typed client, state, UI)
    |                         |
    +-----------+-------------+
                |
Lead: integrate both sets of changes
                |
Verifier: real UI -> API -> state -> UI + negatives
                |
Reviewer: contract, scope, safety, regressions, evidence
                |
Ledger/handoff updated; owner acceptance requested
8. New API route integration contract: required checklist
Whenever a task introduces/changes an endpoint, confirm each item in actual source:
Layer	Proof required
Existing API search	No identical live route/service already supplies the behavior
Method/path	Version, HTTP verb, path/parameter collision/order and route group are correct
Contract	One input/output/error schema with exact names/field types/nullable rules
Controller/handler	Thin validated transport layer that delegates to one service
Service	Correct domain logic, state transitions, invariants and side effects
Repository	Approved canonical DB adapter and target; safe transactions/migrations if applicable
Registration	Router really mounted in the running backend and reachable on expected base URL
Security	Existing auth/CSRF, local permissions, workspace ownership and approvals enforced
Client	Existing typed frontend API client actually calls that method/path
State	Frontend correctly refreshes or subscribes; no fake success or stale cache
UI	Intended view/action actually uses the client and displays all relevant outcomes
Tests	Live-route tests, invalid/unauthorized cases, real UI-to-backend evidence and regressions
Docs	Route inventory, feature spec, ledger and handoff accurately updated


Example: adding a provider feature
docs/frontend-route-coverage.md already lists GET /api/v1/providers and a frontend api.providers() consumer. Before creating GET /api/v1/providers/all or another route, verify the real existing provider route and reuse/extend it if appropriate. A model-provider feature should connect the existing service and provider registry to the actual Settings UI via the established typed client. Never introduce a second provider registry or hard-coded UI provider list.
Example: adding a brand-new API-backed UI feature
For a proposed "Run verification summary" feature, do not assume the following files/endpoint exist; investigate first:
UI: Run details -> user selects "View verification summary"
  -> existing run-details hook/state
  -> typed executionApi.* method
  -> existing REST/API transport
  -> verified registered run handler (new route only if necessary)
  -> canonical run/effect/verification service
  -> current approved state store / derived evidence view
  -> validated summary response, authorization and error mapping
  -> hook refresh / stream updates and visible Run details panel
  -> live UI-to-backend integration + negative/empty/failure tests
Agent must cite actual discovered files and code paths, and must distinguish a design example from verified implementation.
9. Failure, protection and anti-shortcut rules
1. Never silently override the current SQLite/PostgreSQL reconciliation STOP for affected work; never repoint to working DB to get a green test.
2. Never DROP, truncate, convert, replay or overwrite real user databases without a separate explicit allowed action and verified safeguards.
3. Never expose secrets in responses, test fixtures, traces, logs or commits; honor protected credential brokers.
4. Never run paid AI/provider calls, buy services, install privileged helpers, change Windows/WSL/Docker/host settings or deploy without the required actual approval.
5. Never bypass journal/lease/receipt safety or claim unknown side effects were certainly executed/reversed.
6. Never kill by fuzzy name (pkill -f, mass taskkill), wipe unknown worktrees, reset unrelated files, or stop someone else's server.
7. Never weaken existing validation, local permission scopes, CSRF protection, approval prompts, timeouts or sandbox/guest boundaries to make tests pass.
8. Never add a second API gateway, ORM, provider registry, global state system, or unnecessary framework without an approved architectural reason.
9. Never redesign the UI, replace existing components, revive frontend/sirona, or introduce demo data into a production workflow without authorization.
10. Never mark all phases complete because one feature passes; P5 real-provider, P6 image/Gate B, P7 and P8 gates remain distinct as applicable to current evidence.
11. Never create fabricated test logs, approval records, screenshots, source hashes, endpoint counts or historical documents.
12. Never repeatedly ask for answers already present in current user decisions or authoritative records. Surface only truly unresolved decisions with a minimal impact statement.
10. Mandatory feature completion report
End every implementation/review response with a grounded summary. Use actual files, commands and evidence, not placeholders disguised as facts:
FEATURE: <ID and user-visible title>
MODE: INSPECT / PLAN / IMPLEMENT / VERIFY / REVIEW
VERDICT: VERIFIED_AWAITING_ACCEPTANCE / ACCEPTED_SCOPED / PARTIAL / BLOCKED / FAILED
APPROVAL: <actual reference or NOT VERIFIED>
SOURCE: <branch/commit and changed file inventory>
ROUTES: <reused/added/removed, method + full mounted path>
CONTRACT: <actual schema/DTO file and changed fields>
BACKEND: <route -> service -> persistence/effects actual path>
FRONTEND: <API client -> hook/state -> real UI actual path>
DB: <actual adapter/target/version; read-only/changed; guard status>
TESTS: <command, exit code, source hash, exact PASS/FAIL/UNVERIFIED>
E2E: <user action -> request -> service -> durable result -> rendered UI proof>
NEGATIVES: <invalid input/auth/ownership/retry/cancellation/reconnect as relevant>
EVIDENCE: <real transcript/artifact path; no secrets>
ROLLBACK: <safe changes and residual risks>
BLOCKERS: <unverified phases, real-provider, host, deployment, DB, approvals>
NEXT: <smallest concrete approved next action or owner acceptance request>
For a requirement-level acceptance table, use:
Requirement	Backend	Contract/Client	Frontend	Test & real evidence	Verdict
AC-01	path:line or N/A	path:line	path:line	command + output + reference	PASS / FAIL / BLOCKED / UNVERIFIED


Valid verdicts:
- VERIFIED_AWAITING_ACCEPTANCE: implemented and actually tested for the exact approved slice; owner has not accepted.
- ACCEPTED_SCOPED: owner accepted the precise verified slice; says nothing about production or unverified phases.
- PARTIAL: some layers work but not an end-to-end success.
- BLOCKED: required permission, DB target, source, environment or approval is missing.
- FAILED: executed relevant checks failed or implementation is incorrect.
11. Quick task instructions for callers / orchestrators
Read-only feature planning:
Read root AGENTS.md and docs/FEATURE-END-TO-END-WORKFLOW.md.
Inspect docs/features/FEATURE-<NNN>-<slug>.md and the actual codebase.
Find the existing backend route/service, contract, frontend API client/state/UI and tests.
Return the exact end-to-end file map, reuse plan, blockers, test plan and approval request.
Do not change protected source or data.
Approved complete implementation:
Implement docs/features/FEATURE-<NNN>-<slug>.md END TO END under the
actual approved scope <APPROVAL_REFERENCE>. Read root AGENTS.md,
docs/SIRONA-AGENT-HANDOFF.md, docs/FEATURE-END-TO-END-WORKFLOW.md and
current source. Freeze/reuse one contract. Implement canonical backend
service and registered HTTP/SSE/WS route, typed frontend API client,
real React hook/state/UI, and focused tests. Use subagents only with
nonoverlapping write sets and integrate their changes. Prove a real
UI -> network -> backend -> authorized state/effect -> UI journey.
Update route coverage and ledgers. Report exact evidence and blockers.
Never circumvent DB reconciliation or other outstanding approval gates.
One final rule: The goal is not “all Markdown tasks checked.” The goal is one verified, coherent feature in the actual application, with backend, frontend, and user-observable behavior connected through its canonical existing architecture.