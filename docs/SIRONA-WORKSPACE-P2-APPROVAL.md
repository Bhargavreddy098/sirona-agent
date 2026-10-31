# P2 implementation scope — explicitly authorized 2026-10-29

P1 scoped implementation/evidence: [report](SIRONA-WORKSPACE-P1-REPORT.md).
The owner explicitly authorized completing this protected implementation slice. Working-database migration/credential conversion and privileged operations remain separately gated. Current results: SIRONA-WORKSPACE-P2-REPORT.md.

## Approved protected implementation scope

Implement the OS-backed credential boundary while preserving existing provider
authentication, discovery, exact IDs, native chat streaming/cancel and usage.
Remove plaintext/predictable-key fallback only through an approved recoverable
migration path. Do not rotate/delete inaccessible keys silently.

Existing edit targets:
- frontend/sirona-next/electron/main.cjs and electron/preload.cjs
- frontend/sirona-next/package.json for compiling the new Electron TypeScript module;
  package-lock.json only if an approved demonstrated dependency is needed
- backend/services/secretStore.js and services/providerService.js
- backend/package.json/package-lock.json only if an additional demonstrated dependency
  is needed; no dependency is pre-approved solely by this document.

New planned files:
- frontend/sirona-next/electron/security/credentialBroker.ts
- frontend/sirona-next/tsconfig.electron.json (typed main-process build integration)
- backend/src/providers/credentialResolver.ts
- backend/migrations/023_provider_credential_references.sql (number rechecked first)
- backend/tests/credentialMigration.test.ts
- frontend/sirona-next/tests/desktop-credentials.mjs

Migration authoring proposal: add opaque credential references to existing connection
records, track recoverable per-connection state and retain model/conversation history.
Present exact SQL and data-migration algorithm before applying it to any named target.
P1's test-DB 022 approval does not authorize migration 023 or clearing any live secret.

## Acceptance and rollback

Actual OS protection, one-time trusted submission, authenticated provider test,
restart, rotation, corrupt/unavailable store and interrupted migration all require
real evidence. No plaintext/temp/log/renderer/query-cache leak. Verify new credential
storage and decryption before clearing legacy bytes. Failed recovery requires key
re-entry, not a fabricated replacement or plaintext fallback.

Rollback retains migration state and safely disables affected connections; never
re-enable insecure fallback. Preserve existing UI design and public API contracts.
Privileged helper/OS setup is not part of this credential approval; ask separately
if a demonstrated requirement needs privilege or a major boundary change.
