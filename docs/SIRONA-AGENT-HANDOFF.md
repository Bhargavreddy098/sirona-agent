**Current task (2026-10-30): owner requested the attached unified-backend audit/refactor. Read `SIRONA-BACKEND-REFACTOR-AUDIT.md`, its R0–R12 ledger, and `SIRONA-BACKEND-DATABASE-RECONCILIATION.md`. The current `config/db.js` selects SQLite and ignores PostgreSQL test-target settings; this contradicts the selected architecture. STOP affected DB-dependent tests/changes pending the concrete reconciliation decision. Do not inherit earlier P1–P6 qualification for this altered owner. Normative `sironadocs/` references are also absent. Independent packaging repair passes 2/2 tests; no source/DB deletion or conversion performed.**

**Prior P6 slice:** Gate A was approved and its captured source passed free checks. Actual tools-image Gate B remains pending; P5 real-provider acceptance remains UNVERIFIED. Preserve historical reports; no paid calls, migrations, working-data writes, production activation or P7/P8 were authorized by those approvals. The new refactor request does not silently approve image qualification or data migration.

# Start here — Sirona Windows Coding Workspace

> Owner cleanup update, 2026-10-28: unused `frontend/sirona` was explicitly removed after source backup and tooling-reference repairs. `frontend/sirona-next` is the sole active frontend. Older instructions to retain the scaffold are superseded for that folder only; all other preservation/security/approval rules remain.

Updated 2026-10-29. This file is the current navigation/status entrypoint for a new
agent, not authority to grant itself permissions. Read root AGENTS.md first.

**Latest owner decisions:** repair P5/free tests, the bounded-provider extension, and the exact frontend/backend wiring proposal are approved. The owner answered “Approve this scoped backend/frontend wiring.” Its implementation/free qualification is delivered; read [the wiring report](SIRONA-FRONTEND-BACKEND-WIRING-REPORT.md) and current ledger before continuing. No API charges, migrations, working-data writes, production activation or blanket P6–P8 work is approved. These instructions supersede the older stop only for their exact slices.

**Current wiring handoff, 2026-10-30:** Runs, Planning, Files, Approvals, Terminal and Workers use canonical typed transports and existing owners. New scoped readiness/prepared-action/terminal APIs are Stage-17 allowlisted precisely. Real isolated PostgreSQL/HTTP/Docker/browser checks pass: 4 API/lifecycle tests, 1 browser journey, 22 free P5 regressions and 8 stream tests. A real killed backend cannot be advertised as a reconnectable PTY; explicit recovery stops its worker and clears its task lease without replay. Working `sirona` remains on 021 and default-off; isolated test schema remains 023. The pre-existing running desktop/backend was not forcibly restarted. Do not turn the scoped UI result into P5 real-model, P7-wide or production completion. Evidence/hashes: `integration/evidence/frontend-p1-p5/`.

## Current state

- Latest P6 decision, 2026-10-30: owner approved “Gate A with these limits,” explicitly allowing implementation/free checks while preserving the unresolved P5 real-provider acceptance gate. Actual parser/source-context/HTTP/SDK work is delivered; the Docker engine is available. Exact tools-image/admission/SQL/guest qualification needs the separate [Gate B decision](SIRONA-WORKSPACE-P6-GATE-B-APPROVAL.md). Do not install a host fallback, replace P3's default image, or infer phase completion from protocol tests.

- P0 baseline, ownership and isolated integration verification are complete; final
  evidence is in SIRONA-WORKSPACE-P0-REPORT.md and SIRONA-WORKSPACE-LEDGER.md.
- Owner approved creating only sirona_workspace_p0_test_20261028 and applying existing
  migrations 001–021 there; six real DB/HTTP baseline tests pass. Working sirona was
  not the test target. No product code or new runtime dependencies changed in P0.
- P1 scoped implementation is verified: 17 new integration + 72 existing regression tests, zero introduced static diagnostics. Owner approved 022 ONLY on the test DB; working sirona remains at 21. Read SIRONA-WORKSPACE-P1-REPORT.md, including 39 pre-existing full-static findings and staged rollout limits.
- P2 scoped implementation is verified after correction: actual connected Windows DPAPI broker, restart/rotation/forced-crash/history/provider authentication E2E, 27 workspace + 72 regression tests. Read SIRONA-WORKSPACE-P2-REPORT.md and fresh completion evidence. Working sirona remains on 001–021; no schema/credential migration was applied to it.
- P3 trusted-local Docker + WSL2 Home profile is scoped verified after correction: 60 workspace + 72 chat/execution regression + 46 lifecycle tests; real command/approved patch/PTY/proxy/revocation/restart/resource-limit evidence. Read SIRONA-WORKSPACE-P3-REPORT.md and integration/evidence/workspace-p3-docker/current-verification.json. Owner explicitly approved this trusted-local threat model only; hostile-code/VM isolation and Hyper-V are not claimed. Working sirona remains on 001–021, profile activation defaults OFF, and production rollout remains separately gated.
- P4 Vercel AI SDK integration: accepted within scope (user 2026-10-29). 13/13 parity tests PASS, 73/73 workspace tests PASS, backend typecheck 0 errors, frontend check 0 errors. Live provider transcript and cancellation stream transcript verified (automatic lease release in coordinator finally block). Zero schema migrations; live sirona unchanged at 021. Read SIRONA-WORKSPACE-P4-REPORT.md for full evidence.
- P5: implementation and 22 free checks delivered; real-provider acceptance is UNVERIFIED. Read SIRONA-WORKSPACE-P5-REPORT.md. Controlled upstream responses are not real inference proof.
- P6: Gate A approved and implemented; actual tools-image/guest acceptance remains pending Gate B. Final test status is in `integration/evidence/workspace-p6/gate-a-verification.json`; preserved timeout attempts are not passes. Do not treat this as P5 real-provider acceptance or production authority.

## Required reading order

For the next P5 proposal, use the [corrected OpenCode implementation plan](SIRONA-WORKSPACE-P5-IMPLEMENTATION-PLAN.md) and [approval entrypoint](SIRONA-WORKSPACE-P5-APPROVAL.md). The older P5 draft is archived and must not be executed. Preparing this plan does not approve implementation, migrations or production activation.

1. Root AGENTS.md: current assignment and preserved security/STOP rules.
2. [Approved P0–P8 implementation contract](SIRONA-WORKSPACE-PLAN.md): exact phase
   files/APIs/schema proposals, prerequisites, tests, rollback and mandatory TECH IDs.
3. [Execution ledger](SIRONA-WORKSPACE-LEDGER.md): latest task state, approvals,
   evidence and next blocked prerequisite. Reinspect files; do not repeat accepted work.
4. [Phase 0 report](SIRONA-WORKSPACE-P0-REPORT.md) and
   [P1 scope record](SIRONA-WORKSPACE-P1-APPROVAL.md), [P1 report](SIRONA-WORKSPACE-P1-REPORT.md), and [next P2 scope](SIRONA-WORKSPACE-P2-APPROVAL.md).
5. [Current UI preservation contract](../sironadocs/frontend/UI-FREEZE-CONTRACT.md),
   [route ownership](../sironadocs/integration/ROUTE-SURFACE-MATRIX.md), and relevant normative backend domains.
6. Actual current source and test commands. Historical archive is integration/evidence/reference
   only and must never be treated as a new job or a completed production qualification.

## Implementing remaining phases in another agent/chat

- Follow P1→P2→P3→P4→P5→P6→P7→P8; acceptance, not package installation, advances state.
- Read actual owner approval in the conversation or ledger evidence; request missing
  protected/migration/privilege/architecture approval before editing or applying it.
- If a new agent cannot establish approval, it may inspect and prepare a concrete
  scope, but must not turn this handoff into permission.
- Before editing, record task ID/dependencies/approved paths, current hashes, rollback
  checkpoint and tests. Preserve existing unrelated dirty work; never reset/clean it.
- Use the dedicated approved test target and assert current_database before every
  integration write. Never redirect a suite or migration to working sirona by .env fallback.
- Run required checks and real E2E; record source/command/artifact evidence. Fix scoped
  failures before acceptance. Protected failures expand the approval request, not scope.
- At completion update the ledger, technology ledger, report and this current-state
  entrypoint. Stop at the next unapproved gate, unresolved effect or incompatible host.

## Architecture and mandatory integrations

Node/Express + React/TypeScript/Vite/Electron + PostgreSQL stay in their current paths.
Extend frontend/sirona-next's compact light UI; do not recreate the owner-retired frontend/sirona.
No Python/SQLite backend restoration, directory relocation, duplicate frontend or
orchestrator, UI redesign, package-manager migration or root-package replacement.

- P1: Drizzle ORM + Zod with real existing-pg transaction/API evidence.
- P3: owner-approved trusted-local Docker + WSL2 Home profile; no host command fallback. Hyper-V/hostile-code qualification remains unavailable and is not claimed by this Home profile.
- P4: Vercel AI SDK behind existing authenticated discovery/provider services.
- P5: LangGraph.js over canonical services; dynamic delegated, bounded, recoverable work.
- P6: MCP TypeScript SDK and Tree-sitter + ripgrep with actual tools/context use.
- P7: Monaco, xterm.js, React Flow, Zustand + TanStack Query in actual workspace flows.
- P8: clean supported-host E2E for every technology and real release/recovery checks.

Do not mark any technology complete on install, skeleton, synthetic fixture or unit
test alone. Preserve exact model IDs, native chat behavior, streaming/cancel/usage,
existing API envelopes, workspace ownership, CSRF, grants, approvals and leases.

## Current safe commands and evidence limits

Package-local commands, not the unrelated root package:
- frontend/sirona-next: npm run check, npm run lint, npm test, npm run build.
- backend: npm run build:workspace before a fresh Electron launch; npm run check:workspace; node scripts/checkSyntax.js; existing config/runner/runtimeConfig unit tests. Full legacy static/module scans remain red outside the scoped implementation; see report, do not weaken/exclude/delete to hide them.
- DB suites only against explicitly guarded sirona_workspace_p0_test_20261028.
  Do not blindly run backend npm test or migration scripts with the working .env.

Private source and DPAPI database rollback archives are ignored by Git; do not commit,
upload, print or automatically restore them. Catalog validation is not an actual
database restore rehearsal. Keep pre-existing real-provider evidence separate from
the P0 synthetic UI captures. The archive holds obsolete instructions, not permission.

## Historical documentation

Obsolete status, task and alternate Python/SQLite plans are in
[the dated archive](../sironadocs/archive/pre-workspace-2026-10-28/README.md). Old paths redirect
here or to archived copies. Normative API/database/security/domain contracts are
retained; old assignment/status prose cannot override the approved current slice.
