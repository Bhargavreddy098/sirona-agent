# Unified backend refactor execution ledger

2026-10-30. R0–R12 below correspond to the new owner master-refactor request; they do not renumber or replace the existing P0–P8 workspace phases. Root AGENTS.md security/STOP policies and exact infrastructure/data gates remain active.

| Stage | Dependency / scope | Current progress | Acceptance / rollback gate |
| --- | --- | --- | --- |
| R0 audit/baseline | Actual source, integration consumers, manifest, scripts | Automated whole-backend inventory and focused review delivered; baseline failures recorded; full manual review remains open | 261 files/232 sources/1430 edges. Resolve unexpected DB owner and missing normative docs before dependent work |
| R1 security | R0 and canonical persistence | Independent packaging repair verified, 2/2 tests; centralized resource authorization/filesystem repair **not implemented** | Two-workspace/service-boundary/path/CSRF tests; restore only exact changed files, preserve data |
| R2 canonical execution | R1, verified PostgreSQL/effects/guest | Requested; BLOCKED on persistence conflict, prior real-model gate and exact dependent scope | Real run/tool/patch/test/cancel/recovery parity before retiring legacy callers |
| R3 chat/IDE/agent intents | R2, frontend/public-contract review | Proposed three intent modes must remain separate from four permission policies | Small-task UX compatibility without authorization widening; native chat identity preserved |
| R4 coding intelligence | R1/R2; existing P6 Gate B | Existing partial adapters inventoried; no new image or Git mutation | Real guest search/LSP/MCP/context/edit workflow; no host fallback; worktree/commit/PR separately gated |
| R5 verification/repair | R2/R4, artifact identity | Unjustified legacy pass claims confirmed; no verifier rewrite yet | Real build/test/containment evidence; bounded repair and independent re-verification |
| R6 artifacts/snapshots/recovery | R1/R2/R5, approved storage/restore targets | Storage-path download and simulated restore claims confirmed | Actual bytes/digests/ownership/conflicts and real recovery, or honest unavailable status |
| R7 providers/routing | R1/R2; preserve existing provider owners | Fixed legacy defaults identified; existing secure ports retained | Exact registry ID, capabilities, streaming/cancel/usage, bounded failures; no API charges authorized |
| R8 memory/MCP/skills/delegation | R1/R2/R4 | Existing services/partial MCP/delegation retained; no duplicate systems built | Scoped freshness/deletion/provenance, bounded children, actual tool receipts and skill policy enforcement |
| R9 automation | R1/R2/R5/R8 | Occurrence claim service found; production dispatcher integration unverified | Real durable occurrence→authorized run→notification, restart/duplicate/expiry tests |
| R10 removal/tooling | R0 reachability plus replacement parity | 36 manifest candidates reviewed for presence/imports; **zero removed** | Dynamic/registry/script/test consumers and replacements verified before each approved deletion |
| R11 module relocation | Verified coherent module, approved structural change | Target mappings documented only; existing directories preserved | Imports/loaders/source hashes/engine bindings/tests after each move; no bulk reorganization |
| R12 integrated acceptance | All required rows and approved effects | BLOCKED; no inflated readiness scores or all-phase completion | Eight requested real journeys, provider/guest/data/recovery evidence; old green reports cannot substitute |

Audit/report: `SIRONA-BACKEND-REFACTOR-AUDIT.md`. Removal review: `SIRONA-BACKEND-REFACTOR-REMOVALS.md`. Evidence: `integration/evidence/backend-refactor-audit-20261030/`.

Current boundary: no DB-dependent test reruns until the selected owner/test isolation are legitimate. Do not apply migrations, activate production, build/select the P6 candidate image, delete data, rotate credentials, restart the user's app, or turn an archived plan into approval. Continue independent source review/packaging checks within the current request.
