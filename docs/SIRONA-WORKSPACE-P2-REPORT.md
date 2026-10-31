# Phase 2 — trusted Windows credential boundary

2026-10-29. **Scoped implementation and acceptance verified. Working-database rollout is not authorized or applied.**
The owner explicitly authorized completing P2 after review identified missing integration. This report supersedes the earlier completion claim, which is retained as historical evidence under integration/evidence/workspace-p2/prior-completion-claim.md.

## Implemented path

The existing sender-checked Electron save IPC calls the canonical authenticated/CSRF provider API. Main configures CredentialResolver with DesktopCredentialBroker before backend startup. The broker writes immutable, random cred:v1 references to a dedicated user-data vault using actual Electron safeStorage (Windows DPAPI). It verifies encryption, durable write, and decryption before publishing a database binding. PostgreSQL business rows store references only for new/explicitly migrated credentials, including in the old api_key_ciphertext column for schema compatibility. No renderer retrieval endpoint exists.

The vault removes inherited directory grants, grants only the current Windows SID and SYSTEM, verifies protected ACLs and rejects unexpected allowed identities and reparse paths. Record identity is included inside the encrypted payload, blocking record swaps. Malformed, missing, corrupt or unavailable records fail closed. An unavailable broker disables credential submission without preventing the existing shell from opening. No project execution authority or privileged install was introduced.

DPAPI protects other Windows identities; it does not protect against malicious code already running as the same logged-in user. The pinned Electron 43 synchronous safeStorage API remains supported; its later deprecation is not a reason for an unapproved SDK upgrade. Official semantics: https://www.electronjs.org/docs/latest/api/safe-storage.

SecretStore is retained only for compatibility reads/migration of operator-key-encrypted legacy envelopes. It rejects plaintext and predictable machine-derived keys in every mode. New provider writes require the OS broker. Revoked/unavailable connection credentials cannot silently switch to another credential. Existing explicitly configured operator provider environment inputs remain compatibility inputs; they are not persisted by the new write path.

Credential migration uses an immutable new vault record, round-trip verification and a PostgreSQL compare-and-swap against the exact old credential/ref. Concurrent replacements cannot be overwritten. Lost acknowledgements resume from the persisted binding. Unknown publication outcomes retain encrypted records for reconciliation; they never trigger blind credential deletion. Old/orphan protected records are retained for recovery, not exposed through the API; automatic vault garbage collection is not enabled. The broker supports explicit record deletion. Connection revocation/deletion removes inference authority; physical reclamation of retained historical records is a separately governed maintenance action.

Provider route writes/tests/refreshes enforce authenticated workspace ownership. The compatibility /models/verify writer binds the session workspace as well. Exact model IDs, existing provider discovery/streaming/cancellation/usage implementations, API routes, and compact light renderer design remain intact.

## Database and production boundary

- Existing migration 023 was inspected and left byte-for-byte unchanged: SHA-256 867db99fbb8b4940b15f23dd6e2698d1c946aa6bd7509793465f63d0ce3aaebd.
- No schema migration was applied during this completion pass. Only temporary test records were created/cleaned in sirona_workspace_p0_test_20261028 (already at 023).
- Working sirona is at 001–021. Read-only actual service calls verified provider listing, model listing and exact model lookup without requiring new columns. Working data and credentials were not migrated.
- Production migration, legacy credential conversion, rotation/deletion of working credentials, and deployment remain separate named-target approval gates. A P2 acceptance result does not authorize those effects or P3.

## Fresh acceptance evidence

| Gate | Result / evidence |
| --- | --- |
| Real Electron preload/IPC/API/DPAPI save, no plaintext vault/DTO | PASS — real-desktop-e2e.json |
| Actual process restart, credential rotation, forced owned-process-tree kill after unpublished vault write, restart reconciliation | PASS — real-desktop-e2e.json |
| Actual legacy AES-to-DPAPI migration, idempotent resume, exact model and persisted message history preserved | PASS — real-desktop-e2e.json |
| Existing Google authentication through an isolated DPAPI-backed connection | PASS — real-desktop-e2e.json; actual provider /models auth, no simulated inference or paid inference claim |
| Real anonymous Windows identity denied vault-file access and CurrentUser DPAPI decryption | PASS — credential-identity.ps1 invoked by desktop journey |
| Corrupt stored file, unavailable OS-service injection, revocation/deletion, CSRF/workspace denial | PASS — desktop journey; OS unavailability is explicit fault injection, not a claim to have disabled Windows cryptography |
| PostgreSQL transactions/HTTP/CAS, concurrent replacement and lost acknowledgement | 27/27 workspace tests PASS — completion-integration-tests.txt (10 P2 + 17 P1). Backend transaction tests use a labelled test vault; they do not qualify OS cryptography |
| Existing chat/execution/config regressions | 72/72 PASS — completion-regression-tests.txt |
| Strict backend TS, Electron TS build, scoped lint, 165-root syntax scan | PASS |
| Frontend typecheck/lint/build, existing SSE tests | PASS; 5/5 SSE tests. Existing 681 KB bundle advisory retained |
| Desktop sender/envelope unit tests | 2/2 PASS; supplementary to the actual OS journey |

Evidence directory: integration/evidence/workspace-p2/. Source/command summaries: completion-verification.json. The full legacy backend static scan is not reclassified as green; existing P1 debt remains outside this acceptance slice.

## Exact files and rollback

Modified: backend/services/{secretStore,providerService}.js; backend/src/providers/credentialResolver.ts; backend/routes/v1/providers.routes.js; backend/tests/credentialMigration.test.ts; frontend/sirona-next/electron/main.cjs; frontend/sirona-next/electron/security/credentialBroker.ts; frontend/sirona-next/package.json; directly affected P2/handoff/ledger/route records.
New focused tests: frontend/sirona-next/tests/{credential-app.cjs,credential-identity.ps1,desktop-credentials-e2e.mjs}. Existing Electron TS configuration is reused; no new dependency, migration, public route, renderer surface or schema was added.

Source checkpoint: ignored integration/evidence/workspace-p2/private/before-completion.json.gz. If rollout fails, stop credential writes, retain DB bindings and encrypted vault records, reconcile exact references, and safely require re-entry for inaccessible legacy credentials. Do not restore plaintext/predictable fallbacks or drop/reset data. The checkpoint is a diff/recovery reference, not permission to reactivate its known insecure paths.

P3 remains blocked on the inspected Windows Home host. Recheck a supported approved Hyper-V host and obtain its protected/privileged scope approval before proceeding.
