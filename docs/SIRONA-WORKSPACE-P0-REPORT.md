# Phase 0 verification report — 2026-10-28

> Historical P0 milestone snapshot. Current phase/authority is in the execution ledger
> and agent handoff; P1 has subsequently been implemented and scoped verified. Older
> next-phase statements below describe the P0 checkpoint, not a new approval gate.

Status: **P0 ACCEPTED — P1 protected-scope approval required.**
The authorized documentation, preservation, baseline, rollback, visual and scoped checks
are verified. The owner subsequently approved the named isolated test database and
existing migrations: 21 applied, six real PostgreSQL/HTTP tests passed. P1 has not started.

## Changes delivered

- Persisted [P0–P8 implementation contract](SIRONA-WORKSPACE-PLAN.md) and
  [task ledger](SIRONA-WORKSPACE-LEDGER.md).
- Added mandatory TECH-01–TECH-10 phase/dependency/scope/functional-test/completion
  mapping, including [machine-readable technology ledger](integration/evidence/workspace-p0/technology-ledger.json).
- Reconciled the owner-selected sirona-next visual/route ownership through dated
  overlays; retained historical UI-freeze records and the older frontend.
- Prepared [exact P1 approval scope](SIRONA-WORKSPACE-P1-APPROVAL.md), including
  protected files, Drizzle/Zod adoption, additive SQL proposal, API compatibility,
  actual DB/API tests, security boundaries and rollback.
- Created evidence utilities and new baseline captures under integration/evidence/workspace-p0.
  No product service, route, migration, package manifest/lock, renderer, Electron code,
  root package or Windows feature was modified.

## Preservation and source rollback

Source checkpoint: HEAD `c44fc66bb5d51afdd2a8be6c0b9d83d1d07f19c1`, branch
`cleanup/retire-legacy-backend`; 302 pre-existing dirty entries. Git HEAD alone cannot
restore untracked or modified working code, so 243 current on-disk source/config/docs
files were hashed and archived, excluding .env, dependencies, build output and old
screenshots. [Manifest](integration/evidence/workspace-p0/source-baseline.json).

[Preservation verification](integration/evidence/workspace-p0/preservation-check.json) passed:
only authorized existing documentation/task files changed, including AGENTS.md after
the owner requested historical Markdown organization. Zero unexpected
source changes or new files in the source inventory. Other pre-existing changes were
not reverted. New P0 documentation/evidence lives outside the product-source inventory.

The ignored `integration/evidence/workspace-p0/private/source-snapshot.json.gz` round-trips to
all original file hashes. [Rollback record](integration/evidence/workspace-p0/rollback-source.json).
Restore procedure: verify archive hash, inspect selected paths and concurrent edits,
then restore only specifically approved files. Never reset/clean the checkout or bulk
overwrite the unrelated root package. The private archive is not a Git artifact.

## Database and backup

Readonly REPEATABLE READ transaction verified 76 application tables and all 21 applied
migration checksums (001–021). [Metadata](integration/evidence/workspace-p0/database-baseline.json).
No migration runner, seed script, DB test suite or DDL/DML ran against working sirona.
After explicit approval, only the separate sirona_workspace_p0_test_20261028 database
was created; existing migrations 001–021 and six integration tests ran there.

P0 took a read-only custom-format pg_dump. It was encrypted in memory with Windows
DPAPI CurrentUser; no plaintext dump file was written. Decryption hashes match and
pg_restore --list reads 515 entries. The ignored archive is
`integration/evidence/workspace-p0/private/sirona.pgdump.dpapi`;
[verification metadata](integration/evidence/workspace-p0/database-backup.json) contains its hash.
Recover on the same Windows account/machine. Operator environment secrets were not
backed up. A readable catalog is not an actual restored database or a portable DR test.
Never restore this archive over newer live user data. Any restore test needs approval
for a new target, then content verification; P8 real recovery remains unqualified.

## Checks performed now

| Check | Result |
| --- | --- |
| Frontend npm run check | PASS |
| Frontend npm run lint | PASS |
| Frontend npm test (SSE framing/Unicode/error/cancel) | 5 passed, zero failures |
| Frontend npm run build | PASS; bundle remains about 681 kB, size advisory retained |
| Backend config/runner/runtimeConfig tests | 57 passed, zero failures |
| Backend checkSyntax | 155 JavaScript roots, zero syntax failures |
| Current visual fixture interactions | 7 checks passed, zero page errors; desktop/mobile no horizontal overflow |
| Source snapshot round-trip and final preservation | PASS |
| Migration source/recorded checksums | 21/21 match |
| Encrypted DB dump round-trip/catalog | PASS; actual restore NOT performed |
| Isolated DB integration baseline | PASS: six tests, zero failures, existing migrations 001–021 on approved new target only |

Commands/results: [verification.json](integration/evidence/workspace-p0/verification.json).
Visual artifacts/source binding: [visual-baseline.json](integration/evidence/workspace-p0/visual-baseline.json).
Desktop visual capture was inspected after creation; compact light UI is retained.
These fixture screenshots exercise real UI source with synthetic data and are not
evidence of inference, agent execution, isolation or live DB integration. Earlier
real Google/Electron reports are indexed with hashes in
[prior-evidence-index.json](integration/evidence/workspace-p0/prior-evidence-index.json), explicitly
distinguished from fresh P0 checks. No provider quota was consumed by P0 verification.

## Host compatibility blocker

Read-only CIM/service observation:
- Windows 11 Home Single Language, version 10.0.26300 / SKU 100.
- RAM 8,426,991,616 bytes (~7.85 GiB).
- HypervisorPresent=true; vmms service absent.
- CPU virtualization flags report false in the current virtualized environment;
  this does not establish a complete firmware/hardware capability diagnosis.

[Observed readiness](integration/evidence/workspace-p0/hyperv-readiness.json).
Managed Hyper-V execution is BLOCKED on this host. The target architecture is not
silently changed. An owner-approved supported Windows host/edition, capacity preflight,
licensed guest and privileged-helper approval are required before P3 implementation/
admission. No Windows edition upgrade, feature enabling or VM creation was attempted.

## Approved isolated test target

Owner answered Yes proceed to the named P0 database request. Created only
sirona_workspace_p0_test_20261028, refused reuse/overwrite, verified current_database,
then applied existing migrations 001–021 and ran standaloneChat.test.js. Six tests
passed: standalone/no hidden project, authentication/CSRF, cross-workspace isolation,
project separation/native model IDs, lease enforcement, and failed-upstream cancellation/
retry without duplicated prompts. No success inference was mocked or claimed.

Evidence: [provisioning report](integration/evidence/workspace-p0/test-database-provisioning.json),
[migration transcript](integration/evidence/workspace-p0/test-database-migrations.txt),
[test transcript](integration/evidence/workspace-p0/test-database-integration.txt). Test data is
separate; no DB was dropped, no existing data/cluster/roles were reset. The dedicated
target is retained for later approved P1 tests. New SQL/live migrations need approval.

## Historical Markdown organization and new-agent handoff

Owner requested confusing documents moved to a separate folder. Relocated 23 old
plans/status records into docs/archive/pre-workspace-2026-10-28 and retained safe
redirects plus old heading anchors. Added historical AGENTS/GEMINI/README snapshots;
all 26 original files are retained exactly in the ignored markdown rollback archive.
Relative links in readable archived copies were adjusted and hashed.

Root AGENTS.md now points to current source/phase/ledger and preserves security,
approval, database, durable recovery, verification, stop-condition and scope sections
verbatim. No security rule was removed or converted into blanket permission. GEMINI.md,
README.md, sironadocs/navigation/previous-docs-README.md and old planning entrypoints point to
[the current handoff](SIRONA-AGENT-HANDOFF.md). Normative backend API/database/security
contracts stay active. Historical instructions are evidence, never a new assignment.
See [archive manifest](integration/evidence/workspace-p0/markdown-archive-manifest.json).

## Next approval gate

P0 acceptance does not start P1. The [exact P1 manifest](SIRONA-WORKSPACE-P1-APPROVAL.md)
requests bounded protected execution/governance edits, Drizzle/Zod typed integration,
replay/fencing/live-event improvements and additive SQL authoring. Request explicit
approval before that work; present exact SQL separately before applying a new migration
to any named target. No privileged/Hyper-V operation is included. All ten mandatory
integrations remain planned/blocked until their real workflow criteria pass.

Final archive validation: [handoff-verification.json](integration/evidence/workspace-p0/handoff-verification.json) verifies all 26 exact originals, 23 safe redirect paths, four current entrypoints and ten unchanged protected constitution sections. Final product-source preservation remains PASS.
