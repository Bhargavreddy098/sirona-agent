---
title: "Implementation Task Backlog"
summary: "Source-grounded F01-F24 implementation planning; no activation approval."
read_when:
  - "Planning or reviewing a bounded implementation task"
owning_subsystem: "Implementation planning"
primary_source_files:
  - "apps/server/routes/index.js"
  - "apps/server/config/sqliteDb.js"
  - "apps/web/src/App.tsx"
design_status: "PROPOSED"
updated: "2026-11-05"
---

# Implementation Task Backlog

Each task is PROPOSED, NOT_STARTED. No application test has run for this package. IDs are stable. A suffix is one independently reviewable task: C contract, B service behavior, U consumer integration, V qualification. Where a service behavior spans multiple operations, implement one operation per review; do not declare the parent complete until every listed operation passes.

Exact task dependencies are defined in the [predecessor register](IMPLEMENTATION-DEPENDENCY-GRAPH.md); they override shorthand phase dependencies below. Approval gates remain additional prerequisites.

## Shared task contract

Every task inherits: preserve /api/v1 and existing design; new logic in TypeScript; no generated-output edits; no migrations or live effects without separate approval. Exact existing owners and data families are in the feature matrix. New test location is proposed `apps/server/tests/ip<phase>-f<feature>-acceptance.test.ts`; UI tests belong in `apps/web/tests/` and native tests in `apps/desktop/tests/`. No runtime dependency is added simply to satisfy a technology checklist.

Definition of Done: requirement-to-contract-to-source-to-test trace; real relevant boundary exercised; negative and recovery cases checked; sanitized evidence with source hash, command, target, environment and limitations; docs synchronized. NOT_RUN/UNKNOWN never count as acceptance.

Rollback for C: additive schema/client changes remain compatible; revert only this task's change. B: stop new admission, preserve journaled state and use previous qualified dispatch only for compatible runs; never erase uncertain effects. U: hide/unregister only new surface, retain server records and existing design. V: stop activation and retain failed evidence; do not weaken tests. Database rollback follows the separate conversion protocol, not destructive down migrations.

## IP02-F01-C — Specify compatible contracts and schema delta

- **Feature / phase:** F01 / IP02.
- **Dependencies:** IP02 prerequisites; IP00-04.
- **Affected existing files:** `apps/server/app.js`, `apps/server/routes/index.js`, `apps/server/middleware/sessionAuth.js`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Specify compatible contracts and schema delta.
- **Interface and data requirement:** auth_sessions, run_events; record existing/proposed changes; no DDL application.
- **Verification:** inspect and extend `apps/server/tests/boundary.test.js`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Every operation has actor/scope, input/output, error, cancellation and idempotency semantics; new SQL is separately reviewable.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP02-F01-B — Reconcile registered routes, session scope and durable SSE replay; keep controllers thin

- **Feature / phase:** F01 / IP02.
- **Dependencies:** IP02-F01-C; IP01-03 for persistent mutations.
- **Affected existing files:** `apps/server/app.js`, `apps/server/routes/index.js`, `apps/server/middleware/sessionAuth.js`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Reconcile registered routes, session scope and durable SSE replay; keep controllers thin.
- **Interface and data requirement:** auth_sessions, run_events; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/boundary.test.js`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Reject forged origins and cross-workspace reads; replay ordered events once after disconnect.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP02-F01-U — Wire the feature consumer to its canonical service and expose truthful unavailable/error states

- **Feature / phase:** F01 / IP02.
- **Dependencies:** IP02-F01-B; IP02-F22-B.
- **Affected existing files:** `apps/server/app.js`, `apps/server/routes/index.js`, `apps/server/middleware/sessionAuth.js`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Wire the feature consumer to its canonical service and expose truthful unavailable/error states.
- **Interface and data requirement:** auth_sessions, run_events; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/boundary.test.js`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Consumer request uses canonical owner; no renderer authority or hardcoded success; disconnect and cancellation remain observable.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP02-F01-V — Qualify the real feature boundary and record acceptance evidence

- **Feature / phase:** F01 / IP02.
- **Dependencies:** IP02-F01-B; IP02-F01-U.
- **Affected existing files:** `apps/server/app.js`, `apps/server/routes/index.js`, `apps/server/middleware/sessionAuth.js`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Qualify the real feature boundary and record acceptance evidence.
- **Interface and data requirement:** auth_sessions, run_events; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/boundary.test.js`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Reject forged origins and cross-workspace reads; replay ordered events once after disconnect.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP02-F02-C — Specify compatible contracts and schema delta

- **Feature / phase:** F02 / IP02.
- **Dependencies:** IP02 prerequisites; IP00-04.
- **Affected existing files:** `apps/server/services/identityService.js`, `apps/desktop/src/security/credentialBroker.ts`, `apps/desktop/src/main.cjs`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Specify compatible contracts and schema delta.
- **Interface and data requirement:** users, workspaces, auth_sessions, provider_connections; record existing/proposed changes; no DDL application.
- **Verification:** inspect and extend `apps/server/tests/credentialBroker.test.js`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Every operation has actor/scope, input/output, error, cancellation and idempotency semantics; new SQL is separately reviewable.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP02-F02-B — Qualify trusted IPC, DPAPI availability, secret references, revocation and backend credential resolution

- **Feature / phase:** F02 / IP02.
- **Dependencies:** IP02-F02-C; IP01-03 for persistent mutations.
- **Affected existing files:** `apps/server/services/identityService.js`, `apps/desktop/src/security/credentialBroker.ts`, `apps/desktop/src/main.cjs`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Qualify trusted IPC, DPAPI availability, secret references, revocation and backend credential resolution.
- **Interface and data requirement:** users, workspaces, auth_sessions, provider_connections; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/credentialBroker.test.js`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Reject untrusted sender and revoked identity; scan renderer/log artifacts for secret canaries.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP02-F02-U — Wire the feature consumer to its canonical service and expose truthful unavailable/error states

- **Feature / phase:** F02 / IP02.
- **Dependencies:** IP02-F02-B; IP02-F22-B.
- **Affected existing files:** `apps/server/services/identityService.js`, `apps/desktop/src/security/credentialBroker.ts`, `apps/desktop/src/main.cjs`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Wire the feature consumer to its canonical service and expose truthful unavailable/error states.
- **Interface and data requirement:** users, workspaces, auth_sessions, provider_connections; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/credentialBroker.test.js`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Consumer request uses canonical owner; no renderer authority or hardcoded success; disconnect and cancellation remain observable.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP02-F02-V — Qualify the real feature boundary and record acceptance evidence

- **Feature / phase:** F02 / IP02.
- **Dependencies:** IP02-F02-B; IP02-F02-U.
- **Affected existing files:** `apps/server/services/identityService.js`, `apps/desktop/src/security/credentialBroker.ts`, `apps/desktop/src/main.cjs`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Qualify the real feature boundary and record acceptance evidence.
- **Interface and data requirement:** users, workspaces, auth_sessions, provider_connections; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/credentialBroker.test.js`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Reject untrusted sender and revoked identity; scan renderer/log artifacts for secret canaries.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP01-F03-C — Specify compatible contracts and schema delta

- **Feature / phase:** F03 / IP01.
- **Dependencies:** IP01 prerequisites; IP00-04.
- **Affected existing files:** `apps/server/config/db.js`, `apps/server/config/sqliteDb.js`, `apps/server/migrations/runMigrations.js`, `apps/server/routes/v1/conversations.routes.js`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Specify compatible contracts and schema delta.
- **Interface and data requirement:** sessions, messages, session_turn_leases; all namespace tables; record existing/proposed changes; no DDL application.
- **Verification:** inspect and extend `apps/server/tests/sqliteMigrations.test.js`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Every operation has actor/scope, input/output, error, cancellation and idempotency semantics; new SQL is separately reviewable.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP01-F03-B — Replace swallowed transaction-control failures; plan single-file conversion and isolated test paths

- **Feature / phase:** F03 / IP01.
- **Dependencies:** IP01-F03-C; IP01-03 for persistent mutations.
- **Affected existing files:** `apps/server/config/db.js`, `apps/server/config/sqliteDb.js`, `apps/server/migrations/runMigrations.js`, `apps/server/routes/v1/conversations.routes.js`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Replace swallowed transaction-control failures; plan single-file conversion and isolated test paths.
- **Interface and data requirement:** sessions, messages, session_turn_leases; all namespace tables; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/sqliteMigrations.test.js`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Fail BEGIN/COMMIT honestly; concurrent writers cannot interleave; conversion interruption leaves originals usable.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP01-F03-U — Wire the feature consumer to its canonical service and expose truthful unavailable/error states

- **Feature / phase:** F03 / IP01.
- **Dependencies:** IP01-F03-B; IP02-F22-B.
- **Affected existing files:** `apps/server/config/db.js`, `apps/server/config/sqliteDb.js`, `apps/server/migrations/runMigrations.js`, `apps/server/routes/v1/conversations.routes.js`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Wire the feature consumer to its canonical service and expose truthful unavailable/error states.
- **Interface and data requirement:** sessions, messages, session_turn_leases; all namespace tables; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/sqliteMigrations.test.js`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Consumer request uses canonical owner; no renderer authority or hardcoded success; disconnect and cancellation remain observable.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP01-F03-V — Qualify the real feature boundary and record acceptance evidence

- **Feature / phase:** F03 / IP01.
- **Dependencies:** IP01-F03-B; IP01-F03-U.
- **Affected existing files:** `apps/server/config/db.js`, `apps/server/config/sqliteDb.js`, `apps/server/migrations/runMigrations.js`, `apps/server/routes/v1/conversations.routes.js`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Qualify the real feature boundary and record acceptance evidence.
- **Interface and data requirement:** sessions, messages, session_turn_leases; all namespace tables; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/sqliteMigrations.test.js`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Fail BEGIN/COMMIT honestly; concurrent writers cannot interleave; conversion interruption leaves originals usable.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP03-F04-C — Specify compatible contracts and schema delta

- **Feature / phase:** F04 / IP03.
- **Dependencies:** IP03 prerequisites; IP00-04.
- **Affected existing files:** `apps/server/services/providerService.js`, `apps/server/services/aiService.js`, `apps/server/src/providers/aiSdkAdapter.ts`, `apps/server/src/providers/modelAdapter.ts`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Specify compatible contracts and schema delta.
- **Interface and data requirement:** provider_connections, models, model_calls; record existing/proposed changes; no DDL application.
- **Verification:** inspect and extend `apps/server/tests/providerParity.test.ts`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Every operation has actor/scope, input/output, error, cancellation and idempotency semantics; new SQL is separately reviewable.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP03-F04-B — Preserve exact IDs, native chat, discovery, provider port, tool compatibility, streaming and cancellation

- **Feature / phase:** F04 / IP03.
- **Dependencies:** IP03-F04-C; IP01-03 for persistent mutations.
- **Affected existing files:** `apps/server/services/providerService.js`, `apps/server/services/aiService.js`, `apps/server/src/providers/aiSdkAdapter.ts`, `apps/server/src/providers/modelAdapter.ts`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Preserve exact IDs, native chat, discovery, provider port, tool compatibility, streaming and cancellation.
- **Interface and data requirement:** provider_connections, models, model_calls; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/providerParity.test.ts`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** 401/429/timeout/interrupted stream normalize correctly; real authorized inference and immediate lease reacquisition.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP03-F04-U — Wire the feature consumer to its canonical service and expose truthful unavailable/error states

- **Feature / phase:** F04 / IP03.
- **Dependencies:** IP03-F04-B; IP02-F22-B.
- **Affected existing files:** `apps/server/services/providerService.js`, `apps/server/services/aiService.js`, `apps/server/src/providers/aiSdkAdapter.ts`, `apps/server/src/providers/modelAdapter.ts`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Wire the feature consumer to its canonical service and expose truthful unavailable/error states.
- **Interface and data requirement:** provider_connections, models, model_calls; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/providerParity.test.ts`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Consumer request uses canonical owner; no renderer authority or hardcoded success; disconnect and cancellation remain observable.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP03-F04-V — Qualify the real feature boundary and record acceptance evidence

- **Feature / phase:** F04 / IP03.
- **Dependencies:** IP03-F04-B; IP03-F04-U.
- **Affected existing files:** `apps/server/services/providerService.js`, `apps/server/services/aiService.js`, `apps/server/src/providers/aiSdkAdapter.ts`, `apps/server/src/providers/modelAdapter.ts`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Qualify the real feature boundary and record acceptance evidence.
- **Interface and data requirement:** provider_connections, models, model_calls; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/providerParity.test.ts`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** 401/429/timeout/interrupted stream normalize correctly; real authorized inference and immediate lease reacquisition.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP03-F05-C — Specify compatible contracts and schema delta

- **Feature / phase:** F05 / IP03.
- **Dependencies:** IP03 prerequisites; IP00-04.
- **Affected existing files:** `apps/server/services/providerService.js`, `apps/server/services/governanceService.js`, `apps/server/src/providers/credentialResolver.ts`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Specify compatible contracts and schema delta.
- **Interface and data requirement:** budget_accounts, budget_reservations, model_calls; record existing/proposed changes; no DDL application.
- **Verification:** inspect and extend `apps/server/tests/providerActivityBounds.test.ts`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Every operation has actor/scope, input/output, error, cancellation and idempotency semantics; new SQL is separately reviewable.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP03-F05-B — Unify capability eligibility and budget reservation/settlement; forbid replay after partial side effects

- **Feature / phase:** F05 / IP03.
- **Dependencies:** IP03-F05-C; IP01-03 for persistent mutations.
- **Affected existing files:** `apps/server/services/providerService.js`, `apps/server/services/governanceService.js`, `apps/server/src/providers/credentialResolver.ts`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Unify capability eligibility and budget reservation/settlement; forbid replay after partial side effects.
- **Interface and data requirement:** budget_accounts, budget_reservations, model_calls; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/providerActivityBounds.test.ts`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Concurrent requests respect limit; cancellation settles once; unsupported tool capability fails explicitly.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP03-F05-U — Wire the feature consumer to its canonical service and expose truthful unavailable/error states

- **Feature / phase:** F05 / IP03.
- **Dependencies:** IP03-F05-B; IP02-F22-B.
- **Affected existing files:** `apps/server/services/providerService.js`, `apps/server/services/governanceService.js`, `apps/server/src/providers/credentialResolver.ts`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Wire the feature consumer to its canonical service and expose truthful unavailable/error states.
- **Interface and data requirement:** budget_accounts, budget_reservations, model_calls; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/providerActivityBounds.test.ts`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Consumer request uses canonical owner; no renderer authority or hardcoded success; disconnect and cancellation remain observable.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP03-F05-V — Qualify the real feature boundary and record acceptance evidence

- **Feature / phase:** F05 / IP03.
- **Dependencies:** IP03-F05-B; IP03-F05-U.
- **Affected existing files:** `apps/server/services/providerService.js`, `apps/server/services/governanceService.js`, `apps/server/src/providers/credentialResolver.ts`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Qualify the real feature boundary and record acceptance evidence.
- **Interface and data requirement:** budget_accounts, budget_reservations, model_calls; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/providerActivityBounds.test.ts`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Concurrent requests respect limit; cancellation settles once; unsupported tool capability fails explicitly.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP05-F06-C — Specify compatible contracts and schema delta

- **Feature / phase:** F06 / IP05.
- **Dependencies:** IP05 prerequisites; IP00-04.
- **Affected existing files:** `apps/server/services/intentRequirementService.js`, `apps/server/migrations/008_intent_research_requirements.sql`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Specify compatible contracts and schema delta.
- **Interface and data requirement:** goals, intent_analyses, clarifications, research_reports, requirement_revisions; record existing/proposed changes; no DDL application.
- **Verification:** inspect and extend `apps/server/tests/intent.test.js`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Every operation has actor/scope, input/output, error, cancellation and idempotency semantics; new SQL is separately reviewable.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP05-F06-B — Replace confirmed empty stub after caller audit; persist clarification/provenance and measurable requirements

- **Feature / phase:** F06 / IP05.
- **Dependencies:** IP05-F06-C; IP01-03 for persistent mutations.
- **Affected existing files:** `apps/server/services/intentRequirementService.js`, `apps/server/migrations/008_intent_research_requirements.sql`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Replace confirmed empty stub after caller audit; persist clarification/provenance and measurable requirements.
- **Interface and data requirement:** goals, intent_analyses, clarifications, research_reports, requirement_revisions; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/intent.test.js`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Ambiguous prompt requests clarification; untrusted research cannot grant permission; revision survives restart.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP05-F06-U — Wire the feature consumer to its canonical service and expose truthful unavailable/error states

- **Feature / phase:** F06 / IP05.
- **Dependencies:** IP05-F06-B; IP02-F22-B.
- **Affected existing files:** `apps/server/services/intentRequirementService.js`, `apps/server/migrations/008_intent_research_requirements.sql`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Wire the feature consumer to its canonical service and expose truthful unavailable/error states.
- **Interface and data requirement:** goals, intent_analyses, clarifications, research_reports, requirement_revisions; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/intent.test.js`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Consumer request uses canonical owner; no renderer authority or hardcoded success; disconnect and cancellation remain observable.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP05-F06-V — Qualify the real feature boundary and record acceptance evidence

- **Feature / phase:** F06 / IP05.
- **Dependencies:** IP05-F06-B; IP05-F06-U.
- **Affected existing files:** `apps/server/services/intentRequirementService.js`, `apps/server/migrations/008_intent_research_requirements.sql`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Qualify the real feature boundary and record acceptance evidence.
- **Interface and data requirement:** goals, intent_analyses, clarifications, research_reports, requirement_revisions; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/intent.test.js`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Ambiguous prompt requests clarification; untrusted research cannot grant permission; revision survives restart.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP05-F07-C — Specify compatible contracts and schema delta

- **Feature / phase:** F07 / IP05.
- **Dependencies:** IP05 prerequisites; IP00-04.
- **Affected existing files:** `apps/server/services/workflowOrchestratorService.js`, `apps/server/services/executionService.js`, `apps/server/migrations/009_planning_contracts.sql`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Specify compatible contracts and schema delta.
- **Interface and data requirement:** plans, plan_revisions, contracts, contract_revisions; record existing/proposed changes; no DDL application.
- **Verification:** inspect and extend `apps/server/tests/planning.test.js`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Every operation has actor/scope, input/output, error, cancellation and idempotency semantics; new SQL is separately reviewable.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP05-F07-B — Bind task DAG, requirement revision, budget, allowed effects and acceptance to immutable approved contract

- **Feature / phase:** F07 / IP05.
- **Dependencies:** IP05-F07-C; IP01-03 for persistent mutations.
- **Affected existing files:** `apps/server/services/workflowOrchestratorService.js`, `apps/server/services/executionService.js`, `apps/server/migrations/009_planning_contracts.sql`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Bind task DAG, requirement revision, budget, allowed effects and acceptance to immutable approved contract.
- **Interface and data requirement:** plans, plan_revisions, contracts, contract_revisions; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/planning.test.js`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Changing scope invalidates old approval; cyclic plans fail; plan-only produces no project mutation.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP05-F07-U — Wire the feature consumer to its canonical service and expose truthful unavailable/error states

- **Feature / phase:** F07 / IP05.
- **Dependencies:** IP05-F07-B; IP02-F22-B.
- **Affected existing files:** `apps/server/services/workflowOrchestratorService.js`, `apps/server/services/executionService.js`, `apps/server/migrations/009_planning_contracts.sql`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Wire the feature consumer to its canonical service and expose truthful unavailable/error states.
- **Interface and data requirement:** plans, plan_revisions, contracts, contract_revisions; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/planning.test.js`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Consumer request uses canonical owner; no renderer authority or hardcoded success; disconnect and cancellation remain observable.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP05-F07-V — Qualify the real feature boundary and record acceptance evidence

- **Feature / phase:** F07 / IP05.
- **Dependencies:** IP05-F07-B; IP05-F07-U.
- **Affected existing files:** `apps/server/services/workflowOrchestratorService.js`, `apps/server/services/executionService.js`, `apps/server/migrations/009_planning_contracts.sql`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Qualify the real feature boundary and record acceptance evidence.
- **Interface and data requirement:** plans, plan_revisions, contracts, contract_revisions; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/planning.test.js`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Changing scope invalidates old approval; cyclic plans fail; plan-only produces no project mutation.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP04-F08-C — Specify compatible contracts and schema delta

- **Feature / phase:** F08 / IP04.
- **Dependencies:** IP04 prerequisites; IP00-04.
- **Affected existing files:** `apps/server/services/governanceService.js`, `apps/server/routes/v1/governance.routes.js`, `apps/server/src/security/executionPolicy.ts`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Specify compatible contracts and schema delta.
- **Interface and data requirement:** policy_revisions, capability_grants, approvals, audit_events; record existing/proposed changes; no DDL application.
- **Verification:** inspect and extend `apps/server/tests/governance.test.js`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Every operation has actor/scope, input/output, error, cancellation and idempotency semantics; new SQL is separately reviewable.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP04-F08-B — Server-classified risk and exact action proofs; preserve legacy mode wire values with explicit four-mode mapping proposal

- **Feature / phase:** F08 / IP04.
- **Dependencies:** IP04-F08-C; IP01-03 for persistent mutations.
- **Affected existing files:** `apps/server/services/governanceService.js`, `apps/server/routes/v1/governance.routes.js`, `apps/server/src/security/executionPolicy.ts`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Server-classified risk and exact action proofs; preserve legacy mode wire values with explicit four-mode mapping proposal.
- **Interface and data requirement:** policy_revisions, capability_grants, approvals, audit_events; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/governance.test.js`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Spoofed actor/risk, expired/replayed grant and changed action digest are denied before dispatch.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP04-F08-U — Wire the feature consumer to its canonical service and expose truthful unavailable/error states

- **Feature / phase:** F08 / IP04.
- **Dependencies:** IP04-F08-B; IP02-F22-B.
- **Affected existing files:** `apps/server/services/governanceService.js`, `apps/server/routes/v1/governance.routes.js`, `apps/server/src/security/executionPolicy.ts`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Wire the feature consumer to its canonical service and expose truthful unavailable/error states.
- **Interface and data requirement:** policy_revisions, capability_grants, approvals, audit_events; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/governance.test.js`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Consumer request uses canonical owner; no renderer authority or hardcoded success; disconnect and cancellation remain observable.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP04-F08-V — Qualify the real feature boundary and record acceptance evidence

- **Feature / phase:** F08 / IP04.
- **Dependencies:** IP04-F08-B; IP04-F08-U.
- **Affected existing files:** `apps/server/services/governanceService.js`, `apps/server/routes/v1/governance.routes.js`, `apps/server/src/security/executionPolicy.ts`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Qualify the real feature boundary and record acceptance evidence.
- **Interface and data requirement:** policy_revisions, capability_grants, approvals, audit_events; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/governance.test.js`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Spoofed actor/risk, expired/replayed grant and changed action digest are denied before dispatch.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP06-F09-C — Specify compatible contracts and schema delta

- **Feature / phase:** F09 / IP06.
- **Dependencies:** IP06 prerequisites; IP00-04.
- **Affected existing files:** `apps/server/services/conversationTurnCoordinator.js`, `apps/server/services/agentExecutionEngine.js`, `apps/server/services/executionService.js`, `apps/server/src/execution/effectJournal.ts`, `apps/server/src/execution/runEventStore.ts`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Specify compatible contracts and schema delta.
- **Interface and data requirement:** runs, tasks, effects, run_checkpoints, run_events, reconciliation_operations; record existing/proposed changes; no DDL application.
- **Verification:** inspect and extend `apps/server/tests/orchestrationCrash.test.ts`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Every operation has actor/scope, input/output, error, cancellation and idempotency semantics; new SQL is separately reviewable.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP06-F09-B — One run authority; fencing, stable operation keys, cancellation, reconciliation and version-pinned resume

- **Feature / phase:** F09 / IP06.
- **Dependencies:** IP06-F09-C; IP01-03 for persistent mutations.
- **Affected existing files:** `apps/server/services/conversationTurnCoordinator.js`, `apps/server/services/agentExecutionEngine.js`, `apps/server/services/executionService.js`, `apps/server/src/execution/effectJournal.ts`, `apps/server/src/execution/runEventStore.ts`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** One run authority; fencing, stable operation keys, cancellation, reconciliation and version-pinned resume.
- **Interface and data requirement:** runs, tasks, effects, run_checkpoints, run_events, reconciliation_operations; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/orchestrationCrash.test.ts`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Kill before/after each mutation boundary; no duplicate effect; uncertain outcome blocks blind retry.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP06-F09-U — Wire the feature consumer to its canonical service and expose truthful unavailable/error states

- **Feature / phase:** F09 / IP06.
- **Dependencies:** IP06-F09-B; IP02-F22-B.
- **Affected existing files:** `apps/server/services/conversationTurnCoordinator.js`, `apps/server/services/agentExecutionEngine.js`, `apps/server/services/executionService.js`, `apps/server/src/execution/effectJournal.ts`, `apps/server/src/execution/runEventStore.ts`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Wire the feature consumer to its canonical service and expose truthful unavailable/error states.
- **Interface and data requirement:** runs, tasks, effects, run_checkpoints, run_events, reconciliation_operations; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/orchestrationCrash.test.ts`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Consumer request uses canonical owner; no renderer authority or hardcoded success; disconnect and cancellation remain observable.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP06-F09-V — Qualify the real feature boundary and record acceptance evidence

- **Feature / phase:** F09 / IP06.
- **Dependencies:** IP06-F09-B; IP06-F09-U.
- **Affected existing files:** `apps/server/services/conversationTurnCoordinator.js`, `apps/server/services/agentExecutionEngine.js`, `apps/server/services/executionService.js`, `apps/server/src/execution/effectJournal.ts`, `apps/server/src/execution/runEventStore.ts`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Qualify the real feature boundary and record acceptance evidence.
- **Interface and data requirement:** runs, tasks, effects, run_checkpoints, run_events, reconciliation_operations; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/orchestrationCrash.test.ts`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Kill before/after each mutation boundary; no duplicate effect; uncertain outcome blocks blind retry.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP08-F10-C — Specify compatible contracts and schema delta

- **Feature / phase:** F10 / IP08.
- **Dependencies:** IP08 prerequisites; IP00-04.
- **Affected existing files:** `apps/server/src/orchestration/workspaceGraph.ts`, `apps/server/src/orchestration/delegationService.ts`, `apps/server/src/orchestration/activityAdapter.ts`, `apps/server/src/orchestration/graphRuntime.ts`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Specify compatible contracts and schema delta.
- **Interface and data requirement:** agent_sessions, tasks, run_checkpoints, effects; record existing/proposed changes; no DDL application.
- **Verification:** inspect and extend `apps/server/tests/delegationPolicy.test.ts`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Every operation has actor/scope, input/output, error, cancellation and idempotency semantics; new SQL is separately reviewable.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP08-F10-B — Qualify flat parent delegation, max three concurrent specialists, independent artifact review and bounded repair

- **Feature / phase:** F10 / IP08.
- **Dependencies:** IP08-F10-C; IP01-03 for persistent mutations.
- **Affected existing files:** `apps/server/src/orchestration/workspaceGraph.ts`, `apps/server/src/orchestration/delegationService.ts`, `apps/server/src/orchestration/activityAdapter.ts`, `apps/server/src/orchestration/graphRuntime.ts`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Qualify flat parent delegation, max three concurrent specialists, independent artifact review and bounded repair.
- **Interface and data requirement:** agent_sessions, tasks, run_checkpoints, effects; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/delegationPolicy.test.ts`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Fourth concurrent specialist rejected; nested delegation denied; sequential reuse allowed; stale review rejected.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP08-F10-U — Wire the feature consumer to its canonical service and expose truthful unavailable/error states

- **Feature / phase:** F10 / IP08.
- **Dependencies:** IP08-F10-B; IP02-F22-B.
- **Affected existing files:** `apps/server/src/orchestration/workspaceGraph.ts`, `apps/server/src/orchestration/delegationService.ts`, `apps/server/src/orchestration/activityAdapter.ts`, `apps/server/src/orchestration/graphRuntime.ts`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Wire the feature consumer to its canonical service and expose truthful unavailable/error states.
- **Interface and data requirement:** agent_sessions, tasks, run_checkpoints, effects; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/delegationPolicy.test.ts`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Consumer request uses canonical owner; no renderer authority or hardcoded success; disconnect and cancellation remain observable.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP08-F10-V — Qualify the real feature boundary and record acceptance evidence

- **Feature / phase:** F10 / IP08.
- **Dependencies:** IP08-F10-B; IP08-F10-U.
- **Affected existing files:** `apps/server/src/orchestration/workspaceGraph.ts`, `apps/server/src/orchestration/delegationService.ts`, `apps/server/src/orchestration/activityAdapter.ts`, `apps/server/src/orchestration/graphRuntime.ts`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Qualify the real feature boundary and record acceptance evidence.
- **Interface and data requirement:** agent_sessions, tasks, run_checkpoints, effects; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/delegationPolicy.test.ts`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Fourth concurrent specialist rejected; nested delegation denied; sequential reuse allowed; stale review rejected.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP04-F11-C — Specify compatible contracts and schema delta

- **Feature / phase:** F11 / IP04.
- **Dependencies:** IP04 prerequisites; IP00-04.
- **Affected existing files:** `apps/server/services/workspacePathResolver.js`, `apps/server/src/workspace/workspaceBroker.ts`, `apps/server/src/workspace/patchService.ts`, `apps/server/src/tools/gitAdapter.ts`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Specify compatible contracts and schema delta.
- **Interface and data requirement:** projects, repository_snapshots, artifacts; record existing/proposed changes; no DDL application.
- **Verification:** inspect and extend `apps/server/tests/nativePatch.test.ts`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Every operation has actor/scope, input/output, error, cancellation and idempotency semantics; new SQL is separately reviewable.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP04-F11-B — Canonical roots, bounded reads, digest-bound previews and atomic patches; Git status/diff without auto commit/push

- **Feature / phase:** F11 / IP04.
- **Dependencies:** IP04-F11-C; IP01-03 for persistent mutations.
- **Affected existing files:** `apps/server/services/workspacePathResolver.js`, `apps/server/src/workspace/workspaceBroker.ts`, `apps/server/src/workspace/patchService.ts`, `apps/server/src/tools/gitAdapter.ts`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Canonical roots, bounded reads, digest-bound previews and atomic patches; Git status/diff without auto commit/push.
- **Interface and data requirement:** projects, repository_snapshots, artifacts; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/nativePatch.test.ts`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Junction and cross-drive escapes fail; modified base causes conflict; rollback preserves unrelated edits.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP04-F11-U — Wire the feature consumer to its canonical service and expose truthful unavailable/error states

- **Feature / phase:** F11 / IP04.
- **Dependencies:** IP04-F11-B; IP02-F22-B.
- **Affected existing files:** `apps/server/services/workspacePathResolver.js`, `apps/server/src/workspace/workspaceBroker.ts`, `apps/server/src/workspace/patchService.ts`, `apps/server/src/tools/gitAdapter.ts`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Wire the feature consumer to its canonical service and expose truthful unavailable/error states.
- **Interface and data requirement:** projects, repository_snapshots, artifacts; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/nativePatch.test.ts`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Consumer request uses canonical owner; no renderer authority or hardcoded success; disconnect and cancellation remain observable.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP04-F11-V — Qualify the real feature boundary and record acceptance evidence

- **Feature / phase:** F11 / IP04.
- **Dependencies:** IP04-F11-B; IP04-F11-U.
- **Affected existing files:** `apps/server/services/workspacePathResolver.js`, `apps/server/src/workspace/workspaceBroker.ts`, `apps/server/src/workspace/patchService.ts`, `apps/server/src/tools/gitAdapter.ts`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Qualify the real feature boundary and record acceptance evidence.
- **Interface and data requirement:** projects, repository_snapshots, artifacts; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/nativePatch.test.ts`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Junction and cross-drive escapes fail; modified base causes conflict; rollback preserves unrelated edits.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP04-F12-C — Specify compatible contracts and schema delta

- **Feature / phase:** F12 / IP04.
- **Dependencies:** IP04 prerequisites; IP00-04.
- **Affected existing files:** `apps/server/services/toolRuntimeService.js`, `apps/server/services/sandboxManager.js`, `apps/server/src/windows/dockerRuntime.ts`, `apps/server/src/windows/canonicalTerminal.ts`, `apps/cli/docker/tools-worker.Dockerfile`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Specify compatible contracts and schema delta.
- **Interface and data requirement:** tools, tool_revisions, tool_invocations, tool_receipts, isolation_workers; record existing/proposed changes; no DDL application.
- **Verification:** inspect and extend `apps/server/tests/dockerContainment.integration.test.ts`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Every operation has actor/scope, input/output, error, cancellation and idempotency semantics; new SQL is separately reviewable.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP04-F12-B — Qualify exact trusted-local guest; reconcile explicit host opt-in with policy; enforce receipts, bounds and cleanup

- **Feature / phase:** F12 / IP04.
- **Dependencies:** IP04-F12-C; IP01-03 for persistent mutations.
- **Affected existing files:** `apps/server/services/toolRuntimeService.js`, `apps/server/services/sandboxManager.js`, `apps/server/src/windows/dockerRuntime.ts`, `apps/server/src/windows/canonicalTerminal.ts`, `apps/cli/docker/tools-worker.Dockerfile`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Qualify exact trusted-local guest; reconcile explicit host opt-in with policy; enforce receipts, bounds and cleanup.
- **Interface and data requirement:** tools, tool_revisions, tool_invocations, tool_receipts, isolation_workers; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/dockerContainment.integration.test.ts`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Docker absence never routes project command to host; timeout kills process tree; network/resource policy verified.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP04-F12-U — Wire the feature consumer to its canonical service and expose truthful unavailable/error states

- **Feature / phase:** F12 / IP04.
- **Dependencies:** IP04-F12-B; IP02-F22-B.
- **Affected existing files:** `apps/server/services/toolRuntimeService.js`, `apps/server/services/sandboxManager.js`, `apps/server/src/windows/dockerRuntime.ts`, `apps/server/src/windows/canonicalTerminal.ts`, `apps/cli/docker/tools-worker.Dockerfile`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Wire the feature consumer to its canonical service and expose truthful unavailable/error states.
- **Interface and data requirement:** tools, tool_revisions, tool_invocations, tool_receipts, isolation_workers; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/dockerContainment.integration.test.ts`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Consumer request uses canonical owner; no renderer authority or hardcoded success; disconnect and cancellation remain observable.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP04-F12-V — Qualify the real feature boundary and record acceptance evidence

- **Feature / phase:** F12 / IP04.
- **Dependencies:** IP04-F12-B; IP04-F12-U.
- **Affected existing files:** `apps/server/services/toolRuntimeService.js`, `apps/server/services/sandboxManager.js`, `apps/server/src/windows/dockerRuntime.ts`, `apps/server/src/windows/canonicalTerminal.ts`, `apps/cli/docker/tools-worker.Dockerfile`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Qualify the real feature boundary and record acceptance evidence.
- **Interface and data requirement:** tools, tool_revisions, tool_invocations, tool_receipts, isolation_workers; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/dockerContainment.integration.test.ts`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Docker absence never routes project command to host; timeout kills process tree; network/resource policy verified.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP07-F13-C — Specify compatible contracts and schema delta

- **Feature / phase:** F13 / IP07.
- **Dependencies:** IP07 prerequisites; IP00-04.
- **Affected existing files:** `apps/server/src/tools/mcpAdapter.ts`, `apps/server/src/tools/searchAdapter.ts`, `apps/server/src/tools/lspAdapter.ts`, `apps/server/src/context/parserWorker.ts`, `apps/cli/src/guest/agent.ts`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Specify compatible contracts and schema delta.
- **Interface and data requirement:** developer_connections, tools, tool_revisions, tool_receipts; record existing/proposed changes; no DDL application.
- **Verification:** inspect and extend `apps/server/tests/p6CanonicalJourney.test.ts`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Every operation has actor/scope, input/output, error, cancellation and idempotency semantics; new SQL is separately reviewable.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP07-F13-B — Authorize actual MCP dispatch; qualify guest ripgrep, Tree-sitter and LSP using pinned artifacts

- **Feature / phase:** F13 / IP07.
- **Dependencies:** IP07-F13-C; IP01-03 for persistent mutations.
- **Affected existing files:** `apps/server/src/tools/mcpAdapter.ts`, `apps/server/src/tools/searchAdapter.ts`, `apps/server/src/tools/lspAdapter.ts`, `apps/server/src/context/parserWorker.ts`, `apps/cli/src/guest/agent.ts`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Authorize actual MCP dispatch; qualify guest ripgrep, Tree-sitter and LSP using pinned artifacts.
- **Interface and data requirement:** developer_connections, tools, tool_revisions, tool_receipts; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/p6CanonicalJourney.test.ts`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Unauthorized server/tool rejected; parser cancellation works; bounded outputs; real guest search and diagnostics.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP07-F13-U — Wire the feature consumer to its canonical service and expose truthful unavailable/error states

- **Feature / phase:** F13 / IP07.
- **Dependencies:** IP07-F13-B; IP02-F22-B.
- **Affected existing files:** `apps/server/src/tools/mcpAdapter.ts`, `apps/server/src/tools/searchAdapter.ts`, `apps/server/src/tools/lspAdapter.ts`, `apps/server/src/context/parserWorker.ts`, `apps/cli/src/guest/agent.ts`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Wire the feature consumer to its canonical service and expose truthful unavailable/error states.
- **Interface and data requirement:** developer_connections, tools, tool_revisions, tool_receipts; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/p6CanonicalJourney.test.ts`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Consumer request uses canonical owner; no renderer authority or hardcoded success; disconnect and cancellation remain observable.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP07-F13-V — Qualify the real feature boundary and record acceptance evidence

- **Feature / phase:** F13 / IP07.
- **Dependencies:** IP07-F13-B; IP07-F13-U.
- **Affected existing files:** `apps/server/src/tools/mcpAdapter.ts`, `apps/server/src/tools/searchAdapter.ts`, `apps/server/src/tools/lspAdapter.ts`, `apps/server/src/context/parserWorker.ts`, `apps/cli/src/guest/agent.ts`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Qualify the real feature boundary and record acceptance evidence.
- **Interface and data requirement:** developer_connections, tools, tool_revisions, tool_receipts; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/p6CanonicalJourney.test.ts`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Unauthorized server/tool rejected; parser cancellation works; bounded outputs; real guest search and diagnostics.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP07-F14-C — Specify compatible contracts and schema delta

- **Feature / phase:** F14 / IP07.
- **Dependencies:** IP07 prerequisites; IP00-04.
- **Affected existing files:** `apps/server/services/contextEngineService.js`, `apps/server/services/memoryService.js`, `apps/server/src/context/contextAssembler.ts`, `apps/server/src/context/projectIndex.ts`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Specify compatible contracts and schema delta.
- **Interface and data requirement:** knowledge.memories, memory_revisions, memory_chunks, context_bundles; record existing/proposed changes; no DDL application.
- **Verification:** inspect and extend `apps/server/tests/contextIsolation.test.ts`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Every operation has actor/scope, input/output, error, cancellation and idempotency semantics; new SQL is separately reviewable.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP07-F14-B — Scoped retrieval with provenance/freshness/token budget; document skill loading trust before enabling it

- **Feature / phase:** F14 / IP07.
- **Dependencies:** IP07-F14-C; IP01-03 for persistent mutations.
- **Affected existing files:** `apps/server/services/contextEngineService.js`, `apps/server/services/memoryService.js`, `apps/server/src/context/contextAssembler.ts`, `apps/server/src/context/projectIndex.ts`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Scoped retrieval with provenance/freshness/token budget; document skill loading trust before enabling it.
- **Interface and data requirement:** knowledge.memories, memory_revisions, memory_chunks, context_bundles; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/contextIsolation.test.ts`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Cross-project memory excluded; deleted/stale data not reused; untrusted text cannot expand tool grants.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP07-F14-U — Wire the feature consumer to its canonical service and expose truthful unavailable/error states

- **Feature / phase:** F14 / IP07.
- **Dependencies:** IP07-F14-B; IP02-F22-B.
- **Affected existing files:** `apps/server/services/contextEngineService.js`, `apps/server/services/memoryService.js`, `apps/server/src/context/contextAssembler.ts`, `apps/server/src/context/projectIndex.ts`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Wire the feature consumer to its canonical service and expose truthful unavailable/error states.
- **Interface and data requirement:** knowledge.memories, memory_revisions, memory_chunks, context_bundles; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/contextIsolation.test.ts`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Consumer request uses canonical owner; no renderer authority or hardcoded success; disconnect and cancellation remain observable.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP07-F14-V — Qualify the real feature boundary and record acceptance evidence

- **Feature / phase:** F14 / IP07.
- **Dependencies:** IP07-F14-B; IP07-F14-U.
- **Affected existing files:** `apps/server/services/contextEngineService.js`, `apps/server/services/memoryService.js`, `apps/server/src/context/contextAssembler.ts`, `apps/server/src/context/projectIndex.ts`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Qualify the real feature boundary and record acceptance evidence.
- **Interface and data requirement:** knowledge.memories, memory_revisions, memory_chunks, context_bundles; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/contextIsolation.test.ts`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Cross-project memory excluded; deleted/stale data not reused; untrusted text cannot expand tool grants.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP06-F15-C — Specify compatible contracts and schema delta

- **Feature / phase:** F15 / IP06.
- **Dependencies:** IP06 prerequisites; IP00-04.
- **Affected existing files:** `apps/server/services/verificationService.js`, `apps/server/routes/v1/verification.routes.js`, `apps/server/services/agentWorkerService.js`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Specify compatible contracts and schema delta.
- **Interface and data requirement:** verification_jobs, verification_results, verification_reports; record existing/proposed changes; no DDL application.
- **Verification:** inspect and extend `apps/server/tests/verification.test.js`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Every operation has actor/scope, input/output, error, cancellation and idempotency semantics; new SQL is separately reviewable.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP06-F15-B — Remove no-results default pass behavior; obtain trusted checker receipts and bind verdict to artifact/contract

- **Feature / phase:** F15 / IP06.
- **Dependencies:** IP06-F15-C; IP01-03 for persistent mutations.
- **Affected existing files:** `apps/server/services/verificationService.js`, `apps/server/routes/v1/verification.routes.js`, `apps/server/services/agentWorkerService.js`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Remove no-results default pass behavior; obtain trusted checker receipts and bind verdict to artifact/contract.
- **Interface and data requirement:** verification_jobs, verification_results, verification_reports; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/verification.test.js`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Absent checks yield unknown; bad artifact fails; producer-supplied success cannot certify itself.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP06-F15-U — Wire the feature consumer to its canonical service and expose truthful unavailable/error states

- **Feature / phase:** F15 / IP06.
- **Dependencies:** IP06-F15-B; IP02-F22-B.
- **Affected existing files:** `apps/server/services/verificationService.js`, `apps/server/routes/v1/verification.routes.js`, `apps/server/services/agentWorkerService.js`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Wire the feature consumer to its canonical service and expose truthful unavailable/error states.
- **Interface and data requirement:** verification_jobs, verification_results, verification_reports; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/verification.test.js`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Consumer request uses canonical owner; no renderer authority or hardcoded success; disconnect and cancellation remain observable.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP06-F15-V — Qualify the real feature boundary and record acceptance evidence

- **Feature / phase:** F15 / IP06.
- **Dependencies:** IP06-F15-B; IP06-F15-U.
- **Affected existing files:** `apps/server/services/verificationService.js`, `apps/server/routes/v1/verification.routes.js`, `apps/server/services/agentWorkerService.js`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Qualify the real feature boundary and record acceptance evidence.
- **Interface and data requirement:** verification_jobs, verification_results, verification_reports; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/verification.test.js`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Absent checks yield unknown; bad artifact fails; producer-supplied success cannot certify itself.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP12-F16-C — Specify compatible contracts and schema delta

- **Feature / phase:** F16 / IP12.
- **Dependencies:** IP12 prerequisites; IP00-04.
- **Affected existing files:** `apps/server/services/agentWorkerService.js`, `apps/server/routes/v1/tools.routes.js`, `apps/server/src/tools/guestTransport.ts`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Specify compatible contracts and schema delta.
- **Interface and data requirement:** developer_connections, tasks, tool_receipts; record existing/proposed changes; no DDL application.
- **Verification:** inspect and extend `apps/server/tests/runner.test.js`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Every operation has actor/scope, input/output, error, cancellation and idempotency semantics; new SQL is separately reviewable.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP12-F16-B — Existing internal worker is not proof of external IDE integration; qualify one selected adapter later

- **Feature / phase:** F16 / IP12.
- **Dependencies:** IP12-F16-C; IP01-03 for persistent mutations.
- **Affected existing files:** `apps/server/services/agentWorkerService.js`, `apps/server/routes/v1/tools.routes.js`, `apps/server/src/tools/guestTransport.ts`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Existing internal worker is not proof of external IDE integration; qualify one selected adapter later.
- **Interface and data requirement:** developer_connections, tasks, tool_receipts; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/runner.test.js`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Worker cannot broaden grant; disconnect becomes explicit uncertain state; resumed task deduplicates effects.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP12-F16-U — Wire the feature consumer to its canonical service and expose truthful unavailable/error states

- **Feature / phase:** F16 / IP12.
- **Dependencies:** IP12-F16-B; IP02-F22-B.
- **Affected existing files:** `apps/server/services/agentWorkerService.js`, `apps/server/routes/v1/tools.routes.js`, `apps/server/src/tools/guestTransport.ts`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Wire the feature consumer to its canonical service and expose truthful unavailable/error states.
- **Interface and data requirement:** developer_connections, tasks, tool_receipts; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/runner.test.js`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Consumer request uses canonical owner; no renderer authority or hardcoded success; disconnect and cancellation remain observable.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP12-F16-V — Qualify the real feature boundary and record acceptance evidence

- **Feature / phase:** F16 / IP12.
- **Dependencies:** IP12-F16-B; IP12-F16-U.
- **Affected existing files:** `apps/server/services/agentWorkerService.js`, `apps/server/routes/v1/tools.routes.js`, `apps/server/src/tools/guestTransport.ts`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Qualify the real feature boundary and record acceptance evidence.
- **Interface and data requirement:** developer_connections, tasks, tool_receipts; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/runner.test.js`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Worker cannot broaden grant; disconnect becomes explicit uncertain state; resumed task deduplicates effects.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP11-F17-C — Specify compatible contracts and schema delta

- **Feature / phase:** F17 / IP11.
- **Dependencies:** IP11 prerequisites; IP00-04.
- **Affected existing files:** `apps/server/services/automationService.js`, `apps/server/services/notificationDispatcher.js`, `apps/server/routes/v1/automation.routes.js`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Specify compatible contracts and schema delta.
- **Interface and data requirement:** automation.schedules, occurrences, triggers, inbound_events, notifications; record existing/proposed changes; no DDL application.
- **Verification:** inspect and extend `apps/server/tests/schedules.test.js`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Every operation has actor/scope, input/output, error, cancellation and idempotency semantics; new SQL is separately reviewable.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP11-F17-B — Atomic SQLite occurrence admission and real canonical run dispatch; policy checks; local delivery outbox

- **Feature / phase:** F17 / IP11.
- **Dependencies:** IP11-F17-C; IP01-03 for persistent mutations.
- **Affected existing files:** `apps/server/services/automationService.js`, `apps/server/services/notificationDispatcher.js`, `apps/server/routes/v1/automation.routes.js`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Atomic SQLite occurrence admission and real canonical run dispatch; policy checks; local delivery outbox.
- **Interface and data requirement:** automation.schedules, occurrences, triggers, inbound_events, notifications; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/schedules.test.js`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** DST/misfire/overlap tests; duplicate signed event creates one logical run; delivery retry never reruns code.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP11-F17-U — Wire the feature consumer to its canonical service and expose truthful unavailable/error states

- **Feature / phase:** F17 / IP11.
- **Dependencies:** IP11-F17-B; IP02-F22-B.
- **Affected existing files:** `apps/server/services/automationService.js`, `apps/server/services/notificationDispatcher.js`, `apps/server/routes/v1/automation.routes.js`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Wire the feature consumer to its canonical service and expose truthful unavailable/error states.
- **Interface and data requirement:** automation.schedules, occurrences, triggers, inbound_events, notifications; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/schedules.test.js`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Consumer request uses canonical owner; no renderer authority or hardcoded success; disconnect and cancellation remain observable.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP11-F17-V — Qualify the real feature boundary and record acceptance evidence

- **Feature / phase:** F17 / IP11.
- **Dependencies:** IP11-F17-B; IP11-F17-U.
- **Affected existing files:** `apps/server/services/automationService.js`, `apps/server/services/notificationDispatcher.js`, `apps/server/routes/v1/automation.routes.js`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Qualify the real feature boundary and record acceptance evidence.
- **Interface and data requirement:** automation.schedules, occurrences, triggers, inbound_events, notifications; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/schedules.test.js`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** DST/misfire/overlap tests; duplicate signed event creates one logical run; delivery retry never reruns code.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP12-F18-C — Specify compatible contracts and schema delta

- **Feature / phase:** F18 / IP12.
- **Dependencies:** IP12 prerequisites; IP00-04.
- **Affected existing files:** `apps/server/services/deploymentService.js`, `apps/server/routes/v1/deployment.routes.js`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Specify compatible contracts and schema delta.
- **Interface and data requirement:** ops.browser_qa_sessions; record existing/proposed changes; no DDL application.
- **Verification:** inspect and extend `apps/server/tests/deployments.test.js`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Every operation has actor/scope, input/output, error, cancellation and idempotency semantics; new SQL is separately reviewable.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP12-F18-B — Replace synthetic completed browser logs with unavailable state first; later real bounded browser adapter

- **Feature / phase:** F18 / IP12.
- **Dependencies:** IP12-F18-C; IP01-03 for persistent mutations.
- **Affected existing files:** `apps/server/services/deploymentService.js`, `apps/server/routes/v1/deployment.routes.js`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Replace synthetic completed browser logs with unavailable state first; later real bounded browser adapter.
- **Interface and data requirement:** ops.browser_qa_sessions; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/deployments.test.js`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Unconfigured browser never reports success; real navigation evidence, denied sensitive action, cleanup.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP12-F18-U — Wire the feature consumer to its canonical service and expose truthful unavailable/error states

- **Feature / phase:** F18 / IP12.
- **Dependencies:** IP12-F18-B; IP02-F22-B.
- **Affected existing files:** `apps/server/services/deploymentService.js`, `apps/server/routes/v1/deployment.routes.js`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Wire the feature consumer to its canonical service and expose truthful unavailable/error states.
- **Interface and data requirement:** ops.browser_qa_sessions; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/deployments.test.js`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Consumer request uses canonical owner; no renderer authority or hardcoded success; disconnect and cancellation remain observable.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP12-F18-V — Qualify the real feature boundary and record acceptance evidence

- **Feature / phase:** F18 / IP12.
- **Dependencies:** IP12-F18-B; IP12-F18-U.
- **Affected existing files:** `apps/server/services/deploymentService.js`, `apps/server/routes/v1/deployment.routes.js`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Qualify the real feature boundary and record acceptance evidence.
- **Interface and data requirement:** ops.browser_qa_sessions; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/deployments.test.js`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Unconfigured browser never reports success; real navigation evidence, denied sensitive action, cleanup.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP13-F19-C — Specify compatible contracts and schema delta

- **Feature / phase:** F19 / IP13.
- **Dependencies:** IP13 prerequisites; IP00-04.
- **Affected existing files:** `apps/server/services/deploymentService.js`, `apps/server/routes/v1/deployment.routes.js`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Specify compatible contracts and schema delta.
- **Interface and data requirement:** ops.deployment_previews, deployments; record existing/proposed changes; no DDL application.
- **Verification:** inspect and extend `apps/server/tests/deployments.test.js`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Every operation has actor/scope, input/output, error, cancellation and idempotency semantics; new SQL is separately reviewable.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP13-F19-B — Replace synthetic active/healthy result paths with fail-closed availability; qualify one approved target later

- **Feature / phase:** F19 / IP13.
- **Dependencies:** IP13-F19-C; IP01-03 for persistent mutations.
- **Affected existing files:** `apps/server/services/deploymentService.js`, `apps/server/routes/v1/deployment.routes.js`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Replace synthetic active/healthy result paths with fail-closed availability; qualify one approved target later.
- **Interface and data requirement:** ops.deployment_previews, deployments; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/deployments.test.js`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Changed digest invalidates approval; real health evidence required; uncertain external result reconciled.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP13-F19-U — Wire the feature consumer to its canonical service and expose truthful unavailable/error states

- **Feature / phase:** F19 / IP13.
- **Dependencies:** IP13-F19-B; IP02-F22-B.
- **Affected existing files:** `apps/server/services/deploymentService.js`, `apps/server/routes/v1/deployment.routes.js`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Wire the feature consumer to its canonical service and expose truthful unavailable/error states.
- **Interface and data requirement:** ops.deployment_previews, deployments; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/deployments.test.js`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Consumer request uses canonical owner; no renderer authority or hardcoded success; disconnect and cancellation remain observable.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP13-F19-V — Qualify the real feature boundary and record acceptance evidence

- **Feature / phase:** F19 / IP13.
- **Dependencies:** IP13-F19-B; IP13-F19-U.
- **Affected existing files:** `apps/server/services/deploymentService.js`, `apps/server/routes/v1/deployment.routes.js`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Qualify the real feature boundary and record acceptance evidence.
- **Interface and data requirement:** ops.deployment_previews, deployments; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/deployments.test.js`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Changed digest invalidates approval; real health evidence required; uncertain external result reconciled.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP01-F20-C — Specify compatible contracts and schema delta

- **Feature / phase:** F20 / IP01.
- **Dependencies:** IP01 prerequisites; IP00-04.
- **Affected existing files:** `apps/server/foundation/logger.js`, `apps/server/services/auditLogger.js`, `apps/server/services/releaseRecoveryService.js`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Specify compatible contracts and schema delta.
- **Interface and data requirement:** audit_events, model_calls, verification_evaluations, system.operational_quotas; record existing/proposed changes; no DDL application.
- **Verification:** inspect and extend `apps/server/tests/productionHardening.test.js`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Every operation has actor/scope, input/output, error, cancellation and idempotency semantics; new SQL is separately reviewable.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP01-F20-B — Correlate run/effect/model events, redact secrets and replace unconditional health/security claims with measurements

- **Feature / phase:** F20 / IP01.
- **Dependencies:** IP01-F20-C; IP01-03 for persistent mutations.
- **Affected existing files:** `apps/server/foundation/logger.js`, `apps/server/services/auditLogger.js`, `apps/server/services/releaseRecoveryService.js`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Correlate run/effect/model events, redact secrets and replace unconditional health/security claims with measurements.
- **Interface and data requirement:** audit_events, model_calls, verification_evaluations, system.operational_quotas; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/productionHardening.test.js`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Canary secrets absent; costs derived from actual usage; missing probes report unknown rather than healthy.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP01-F20-U — Wire the feature consumer to its canonical service and expose truthful unavailable/error states

- **Feature / phase:** F20 / IP01.
- **Dependencies:** IP01-F20-B; IP02-F22-B.
- **Affected existing files:** `apps/server/foundation/logger.js`, `apps/server/services/auditLogger.js`, `apps/server/services/releaseRecoveryService.js`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Wire the feature consumer to its canonical service and expose truthful unavailable/error states.
- **Interface and data requirement:** audit_events, model_calls, verification_evaluations, system.operational_quotas; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/productionHardening.test.js`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Consumer request uses canonical owner; no renderer authority or hardcoded success; disconnect and cancellation remain observable.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP01-F20-V — Qualify the real feature boundary and record acceptance evidence

- **Feature / phase:** F20 / IP01.
- **Dependencies:** IP01-F20-B; IP01-F20-U.
- **Affected existing files:** `apps/server/foundation/logger.js`, `apps/server/services/auditLogger.js`, `apps/server/services/releaseRecoveryService.js`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Qualify the real feature boundary and record acceptance evidence.
- **Interface and data requirement:** audit_events, model_calls, verification_evaluations, system.operational_quotas; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/productionHardening.test.js`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Canary secrets absent; costs derived from actual usage; missing probes report unknown rather than healthy.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP10-F21-C — Specify compatible contracts and schema delta

- **Feature / phase:** F21 / IP10.
- **Dependencies:** IP10 prerequisites; IP00-04.
- **Affected existing files:** `apps/server/services/releaseRecoveryService.js`, `apps/server/routes/v1/recovery.routes.js`, `apps/desktop/package.json`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Specify compatible contracts and schema delta.
- **Interface and data requirement:** system.release_manifests, recovery_checkpoints, recovery_rehearsals; record existing/proposed changes; no DDL application.
- **Verification:** inspect and extend `apps/server/tests/recoveryUnavailable.test.js`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Every operation has actor/scope, input/output, error, cancellation and idempotency semantics; new SQL is separately reviewable.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP10-F21-B — Backup/restore currently unavailable; implement consistent single-file backup, isolated restore and packaging qualification

- **Feature / phase:** F21 / IP10.
- **Dependencies:** IP10-F21-C; IP01-03 for persistent mutations.
- **Affected existing files:** `apps/server/services/releaseRecoveryService.js`, `apps/server/routes/v1/recovery.routes.js`, `apps/desktop/package.json`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Backup/restore currently unavailable; implement consistent single-file backup, isolated restore and packaging qualification.
- **Interface and data requirement:** system.release_manifests, recovery_checkpoints, recovery_rehearsals; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/recoveryUnavailable.test.js`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Restore validated backup on clean fixture; corrupted backup refused; rollback retains pre-upgrade data.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP10-F21-U — Wire the feature consumer to its canonical service and expose truthful unavailable/error states

- **Feature / phase:** F21 / IP10.
- **Dependencies:** IP10-F21-B; IP02-F22-B.
- **Affected existing files:** `apps/server/services/releaseRecoveryService.js`, `apps/server/routes/v1/recovery.routes.js`, `apps/desktop/package.json`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Wire the feature consumer to its canonical service and expose truthful unavailable/error states.
- **Interface and data requirement:** system.release_manifests, recovery_checkpoints, recovery_rehearsals; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/recoveryUnavailable.test.js`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Consumer request uses canonical owner; no renderer authority or hardcoded success; disconnect and cancellation remain observable.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP10-F21-V — Qualify the real feature boundary and record acceptance evidence

- **Feature / phase:** F21 / IP10.
- **Dependencies:** IP10-F21-B; IP10-F21-U.
- **Affected existing files:** `apps/server/services/releaseRecoveryService.js`, `apps/server/routes/v1/recovery.routes.js`, `apps/desktop/package.json`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Qualify the real feature boundary and record acceptance evidence.
- **Interface and data requirement:** system.release_manifests, recovery_checkpoints, recovery_rehearsals; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/recoveryUnavailable.test.js`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Restore validated backup on clean fixture; corrupted backup refused; rollback retains pre-upgrade data.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP02-F22-C — Specify compatible contracts and schema delta

- **Feature / phase:** F22 / IP02.
- **Dependencies:** IP02 prerequisites; IP00-04.
- **Affected existing files:** `apps/desktop/src/main.cjs`, `apps/desktop/src/preload.cjs`, `apps/desktop/src/server.cjs`, `apps/desktop/src/terminalProxy.cjs`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Specify compatible contracts and schema delta.
- **Interface and data requirement:** desktop_settings, auth_sessions; record existing/proposed changes; no DDL application.
- **Verification:** inspect and extend `apps/server/tests/credentialBroker.test.js`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Every operation has actor/scope, input/output, error, cancellation and idempotency semantics; new SQL is separately reviewable.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP02-F22-B — Preserve window.sirona bridge; qualify readiness, trusted senders, startup/shutdown and restart

- **Feature / phase:** F22 / IP02.
- **Dependencies:** IP02-F22-C; IP01-03 for persistent mutations.
- **Affected existing files:** `apps/desktop/src/main.cjs`, `apps/desktop/src/preload.cjs`, `apps/desktop/src/server.cjs`, `apps/desktop/src/terminalProxy.cjs`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Preserve window.sirona bridge; qualify readiness, trusted senders, startup/shutdown and restart.
- **Interface and data requirement:** desktop_settings, auth_sessions; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/credentialBroker.test.js`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Electron restart restores session; forged IPC rejected; backend crash visible; own child processes cleaned.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP02-F22-U — Wire the feature consumer to its canonical service and expose truthful unavailable/error states

- **Feature / phase:** F22 / IP02.
- **Dependencies:** IP02-F22-B.
- **Affected existing files:** `apps/desktop/src/main.cjs`, `apps/desktop/src/preload.cjs`, `apps/desktop/src/server.cjs`, `apps/desktop/src/terminalProxy.cjs`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Wire the feature consumer to its canonical service and expose truthful unavailable/error states.
- **Interface and data requirement:** desktop_settings, auth_sessions; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/credentialBroker.test.js`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Consumer request uses canonical owner; no renderer authority or hardcoded success; disconnect and cancellation remain observable.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP02-F22-V — Qualify the real feature boundary and record acceptance evidence

- **Feature / phase:** F22 / IP02.
- **Dependencies:** IP02-F22-B; IP02-F22-U.
- **Affected existing files:** `apps/desktop/src/main.cjs`, `apps/desktop/src/preload.cjs`, `apps/desktop/src/server.cjs`, `apps/desktop/src/terminalProxy.cjs`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Qualify the real feature boundary and record acceptance evidence.
- **Interface and data requirement:** desktop_settings, auth_sessions; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/credentialBroker.test.js`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Electron restart restores session; forged IPC rejected; backend crash visible; own child processes cleaned.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP09-F23-C — Specify compatible contracts and schema delta

- **Feature / phase:** F23 / IP09.
- **Dependencies:** IP09 prerequisites; IP00-04.
- **Affected existing files:** `apps/web/src/App.tsx`, `apps/web/src/components/MainCanvas.tsx`, `apps/web/src/components/SettingsScreen.tsx`, `apps/web/src/api/sironaClient.ts`, `apps/web/src/api/useSirona.ts`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Specify compatible contracts and schema delta.
- **Interface and data requirement:** No new UI-owned tables; domain state through API; record existing/proposed changes; no DDL application.
- **Verification:** inspect and extend `apps/server/tests/frontendWorkspace.test.ts`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Every operation has actor/scope, input/output, error, cancellation and idempotency semantics; new SQL is separately reviewable.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP09-F23-B — Active UI is compact chat; client wrappers do not establish IDE views; add editor/terminal/plans/approvals/monitoring within approved design

- **Feature / phase:** F23 / IP09.
- **Dependencies:** IP09-F23-C; IP01-03 for persistent mutations.
- **Affected existing files:** `apps/web/src/App.tsx`, `apps/web/src/components/MainCanvas.tsx`, `apps/web/src/components/SettingsScreen.tsx`, `apps/web/src/api/sironaClient.ts`, `apps/web/src/api/useSirona.ts`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Active UI is compact chat; client wrappers do not establish IDE views; add editor/terminal/plans/approvals/monitoring within approved design.
- **Interface and data requirement:** No new UI-owned tables; domain state through API; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/frontendWorkspace.test.ts`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Every visible action hits canonical API; offline/loading/empty/error/cancel states; no hardcoded workspace/model treated as real.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP09-F23-U — Wire the feature consumer to its canonical service and expose truthful unavailable/error states

- **Feature / phase:** F23 / IP09.
- **Dependencies:** IP09-F23-B; IP02-F22-B.
- **Affected existing files:** `apps/web/src/App.tsx`, `apps/web/src/components/MainCanvas.tsx`, `apps/web/src/components/SettingsScreen.tsx`, `apps/web/src/api/sironaClient.ts`, `apps/web/src/api/useSirona.ts`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Wire the feature consumer to its canonical service and expose truthful unavailable/error states.
- **Interface and data requirement:** No new UI-owned tables; domain state through API; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/frontendWorkspace.test.ts`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Consumer request uses canonical owner; no renderer authority or hardcoded success; disconnect and cancellation remain observable.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP09-F23-V — Qualify the real feature boundary and record acceptance evidence

- **Feature / phase:** F23 / IP09.
- **Dependencies:** IP09-F23-B; IP09-F23-U.
- **Affected existing files:** `apps/web/src/App.tsx`, `apps/web/src/components/MainCanvas.tsx`, `apps/web/src/components/SettingsScreen.tsx`, `apps/web/src/api/sironaClient.ts`, `apps/web/src/api/useSirona.ts`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Qualify the real feature boundary and record acceptance evidence.
- **Interface and data requirement:** No new UI-owned tables; domain state through API; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/frontendWorkspace.test.ts`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Every visible action hits canonical API; offline/loading/empty/error/cancel states; no hardcoded workspace/model treated as real.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP09-F24-C — Specify compatible contracts and schema delta

- **Feature / phase:** F24 / IP09.
- **Dependencies:** IP09 prerequisites; IP00-04.
- **Affected existing files:** `apps/cli/src/cli.ts`, `apps/cli/src/health.ts`, `apps/cli/src/lsp.ts`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Specify compatible contracts and schema delta.
- **Interface and data requirement:** No direct database ownership; record existing/proposed changes; no DDL application.
- **Verification:** inspect and extend `apps/server/tests/cli.test.js`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Every operation has actor/scope, input/output, error, cancellation and idempotency semantics; new SQL is separately reviewable.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP09-F24-B — Current status/read-only TUI only; add authenticated project/session/run commands using same gateway

- **Feature / phase:** F24 / IP09.
- **Dependencies:** IP09-F24-C; IP01-03 for persistent mutations.
- **Affected existing files:** `apps/cli/src/cli.ts`, `apps/cli/src/health.ts`, `apps/cli/src/lsp.ts`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Current status/read-only TUI only; add authenticated project/session/run commands using same gateway.
- **Interface and data requirement:** No direct database ownership; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/cli.test.js`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Noninteractive mutations require explicit authority; stable exit codes; cancellation propagated; no direct DB bypass.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP09-F24-U — Wire the feature consumer to its canonical service and expose truthful unavailable/error states

- **Feature / phase:** F24 / IP09.
- **Dependencies:** IP09-F24-B; IP02-F22-B.
- **Affected existing files:** `apps/cli/src/cli.ts`, `apps/cli/src/health.ts`, `apps/cli/src/lsp.ts`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Wire the feature consumer to its canonical service and expose truthful unavailable/error states.
- **Interface and data requirement:** No direct database ownership; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/cli.test.js`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Consumer request uses canonical owner; no renderer authority or hardcoded success; disconnect and cancellation remain observable.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.

## IP09-F24-V — Qualify the real feature boundary and record acceptance evidence

- **Feature / phase:** F24 / IP09.
- **Dependencies:** IP09-F24-B; IP09-F24-U.
- **Affected existing files:** `apps/cli/src/cli.ts`, `apps/cli/src/health.ts`, `apps/cli/src/lsp.ts`; consumer contract changes go through `packages/contracts/src/` and `apps/web/src/api/sironaClient.ts` only when necessary.
- **Required result:** Qualify the real feature boundary and record acceptance evidence.
- **Interface and data requirement:** No direct database ownership; implement only reviewed C-task delta; persistent writes use one transaction owner; auth from server identity, not caller-supplied authority.
- **Verification:** inspect and extend `apps/server/tests/cli.test.js`; proposed focused acceptance test from feature matrix; C uses contract fixtures, B uses isolated integration, U uses real consumer journey, V exercises real qualified dependencies. Test doubles are explicitly labelled and do not replace V.
- **Acceptance:** Noninteractive mutations require explicit authority; stable exit codes; cancellation propagated; no direct DB bypass.
- **Gate:** scope approval; schema/working-data/guest/live-provider/external effects separately gated when involved.
- **Rollback and Done:** shared task contract above; no effect/data erasure.


# Foundation and safety tasks

## IP00-01 — Enumerate the baseline

Features: all. Dependencies: none. Files: existing root/scoped AGENTS, docs, editable apps/packages source. Result: static route/schema/IPC/test/source manifest with hashes and exclusions. Acceptance: all F01–F24 source paths exist or are explicitly proposed; no source import/database access. Status: DONE_STATIC for this package; runtime baseline NOT_RUN. Rollback: revert only documentation additions.

## IP00-02 — Reconcile contracts and approval history

Features: F01/F02/F03/F08/F22. Depends IP00-01. Files: governance registry/STOP rules and feature contracts (documentation only until approval). Result: decision crosswalk for SQLite, host/guest, modes and actual IPC. Acceptance: no contradictory statement is treated as permission; exact pending gates in audit. Status: planning dispositions documented; changing protected governance is pending A01/A03. Rollback: preserve prior provenance.

## IP00-03 — Trace package and service ownership

Features: all. Depends IP00-01. Files: package manifests, app entrypoints, actual imports, source ownership map. Result: identify one owner per effect/provider/schema; mark imported package/library not in a reachable path as unqualified, not automatically removable. Acceptance: no second orchestration/service owner proposed; active UI entry and bridge explicitly mapped. Status: source ownership map produced; exhaustive semantic call-graph audit not claimed. Follow-on C tasks verify exact callers for changes. Rollback: documentation-only.

## IP00-04 — Approve baseline handoff

Features: all. Depends IP00-01/02/03. Files: this package and index. Result: coverage, path, link and task dependency validation report; owner review of remaining gates. Acceptance: all IDs resolve; required findings have tasks; no runtime pass inferred. Status: documentation validation performed separately; implementation authorization remains absent. Rollback: documentation-only.

## IP01-01 — Isolated SQLite test harness (FIRST CODE TASK AFTER APPROVAL)

Feature F03. Depends IP00-04 and scoped persistence approval. Existing owners: apps/server/config/sqliteDb.js, apps/server/config/db.js, apps/server/tests/sqliteMigrations.test.js; proposed helper apps/server/tests/helpers/sqlite-isolated.ts. Set a private temp root and explicit SIRONA_DB_PATH before any production module import. Validate paths against working APPDATA and repository data directories; isolate every attached file as well as main. Fail if any dependency ignores the override. No production-path fallback. Add child-process failure and writer-concurrency fixtures. Acceptance: file-access tracing demonstrates writes only under disposable root, both intentional failure and normal completion clean only owned fixture files. No migration of working data. Rollback: stop tests and remove only verified disposable fixture paths; retain failure evidence.

## IP01-02 — Exact single-file schema/conversion specification

Feature F03. Depends IP01-01. Existing owners: config/sqliteDb.js, migrations/runMigrations.js, migrations/*.sql, src/db/schema.ts, src/db/transactionAdapter.ts. Proposed artifact is a versioned migration/conversion manifest (filename/checksum selected only after review). Map every declared core/attached table, key, index, trigger and SQL namespace reference; preserve IDs/checksum provenance. Identify tables absent from one source and require explicit reconciliation. Test contract: duplicate-key, null/type conversion, cross-domain references and interrupted copy fixtures. Acceptance: no unmapped declaration, collision or implicit destructive step; exact schema/data transformation reviewable. A02 required before applying. Rollback: spec only until approved.

## IP01-03 — Qualify transaction ownership and conversion on fixtures

Feature F03. Depends IP01-02, IP01-F03-C, A02 for exact isolated artifact. Implement transaction failure propagation and one serialized writer; reject unsupported nesting or use reviewed savepoints. Test disk-full/BEGIN/COMMIT failure, simultaneous callbacks, process death, checksums and field-level preservation. Acceptance: no false commit, partial activation or shared transaction contamination; original fixture stores survive. Source owners as IP01-02. No working cutover. Rollback follows master conversion protocol. IP01-F03-B consumes this result rather than introducing another transaction owner; IP01-03 does not depend on that B task.

## IP04-01 — Resolve project-command host dispatch boundary

Features F08/F12. Depends IP00-02, IP02-F02-B and A03. Existing files: services/sandboxManager.js, services/isolationBrokerService.js, src/windows/dockerRuntime.ts, src/security/executionPolicy.ts. Inventory both host opt-in channels and callers; implement approved server policy so renderer/model/env toggles cannot silently authorize project host execution. Qualify unready Docker as explicit denial; distinguish trusted fixed application maintenance operations from arbitrary project code. Tests exercise both flags, forged inputs and engine outage without running host project commands. Acceptance: no unauthorized escape path and original policy safeguards retained. Rollback disables new command admission; it must not restore an insecure host fallback.

## IP06-01 — Contain synthetic browser/deployment and verifier success

Features F15/F18/F19/F20. Depends IP02 and protected owner scope approval; execute before IP10 even though full F18/F19 are later. Existing files: services/deploymentService.js, services/verificationService.js, services/releaseRecoveryService.js and matching v1 routes. Return explicit unavailable/unknown when no qualified adapter or checker receipt exists; preserve historical rows as unverified. Never emit browser navigation, active deployment or security-health success from hardcoded data. Tests prove zero adapter dispatch when disabled and no success event/report. Acceptance: direct API calls cannot bypass hidden UI to obtain fictitious success. Rollback keeps fail-closed behavior; do not restore fabricated production responses.

## IP10-01 — First local release evidence gate

Features F01–F15/F20–F24 local scope. Depends all mandatory phase exits, IP06-01, live-provider and guest approvals. Files: existing verification suites, proposed desktop journey tests, release planning/evidence only until release approval. Execute eight workflow subset: W01–W06 and W08; W07 remains deferred IP11. Perform clean install, start, restart, cancel/crash matrix, actual workspace edit/test, backup/restore and resource cleanup. Acceptance: every required criterion has actual evidence for the candidate source; no UNKNOWN prerequisite, secret leak, synthetic success or unqualified effect. No deployment/commit/push is part of acceptance. Rollback hold release and preserve failed artifacts.
