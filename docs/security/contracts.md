---
title: "Local identity and credential lifecycle"
status: "PROPOSED DESIGN"
implementation: "NOT IMPLEMENTED HERE"
verification: "NOT RUN"
feature_id: "F02"
specification: "EDITION 1 PROPOSAL"
updated: "2026-11-05"
---

# Local identity and credential lifecycle

## Records and trust boundary

Inherit [foundation](../architecture/contract-foundation.md) and [storage](../architecture/storage-contract.md). Edition 1 has one local owner principal per installation. F03 bootstrap creates it through a private initialization path before RPC is enabled. Principal record: {state:"active"|"revoked", osUserSid:Text(256), displayName:Text(200), authEpoch:Int}. Workspace membership is local owner only; no client-supplied role.

Credential public data: {state:"active"|"revoked"|"unavailable", label:Text(200), binding:{kind:"provider"|"hook"|"worker"|"deployment",id:Id}, credentialRevision:Int, changedAt:Time}. Private stored fields add ciphertext:BlobRef; never serialize this reference in public projections. The encrypted blob is accessible only to F02; it is not readable through F11. Tokens are 32 cryptographically random bytes, base64url; store only SHA-256(token), principal, authEpoch, issuedAt and expiresAt in an in-memory registry. Lifetime 8 hours, no persistent bearer token; backend restart invalidates all.

## Operations

- F02-OP01 security.connect, internal native call {osUserSid:Text(256), client:"desktop"|"cli"} -> {token:Text(64),expiresAt:Time,principalId:Id,workspaceId:Id}. F22 must authenticate the OS peer/native sender first. This is not a public RPC and a matching string SID alone never authenticates it.
- F02-OP02 security.credentials.list, public read {} -> List(Entity(CredentialPublic),100).
- F02-OP03 credentials.store, native-only mutation {binding:{kind:"provider"|"hook"|"worker"|"deployment",id:Id},label:Text(200),secret:Text(16384)} -> Entity(CredentialPublic). Native trusted prompt accepts input, validates the binding entity ownership, encrypts using Electron main safeStorage and transfers ciphertext to F03. The application renderer gets a reference only; native prompt memory necessarily sees the submitted value and clears it after submission. No public HTTP secret input.
- F02-OP04 credentials.rotate, native-only mutation with expectedRevision {credentialId:Id,secret:Text(16384)} -> Entity(CredentialPublic). Replace ciphertext, increment credentialRevision; retain no plaintext or old cipher after outstanding readers release it.
- F02-OP05 security.credentials.revoke, public mutation with expectedRevision {credentialId:Id} -> Entity(CredentialPublic). Mark revoked, invalidate pending resolution, signal cancellation of active provider attempts using it. Completed costs/effects remain.
- F02-OP06 resolveCredential, internal {credential:Ref,binding:{kind:"provider"|"hook"|"worker"|"deployment",id:Id},operationId:Id} -> ephemeral secret handle. Check current principal, exact binding kind/ID, state and revision immediately before dispatch; resolve in the trusted provider/native channel and never return through RPC.
- F02-OP07 security.logout, public mutation {} -> {revoked:true}. Increment authEpoch atomically and revoke all current tokens; acknowledgement is returned on the initiating authenticated channel before it is closed.

## Transitions and failure

Credential creation starts active only after encryption and durable storage succeed. If safeStorage encryption is unavailable, return UNAVAILABLE reason encryption_unavailable and persist no secret, including no plaintext fallback. Rotation atomically changes the reference; new dispatch requires the new revision. An in-flight attempt may finish with its already-resolved old credential after rotation; revocation instead aborts it best-effort and prevents any subsequent dispatch. This does not revoke a key at the upstream provider; the UI states that explicitly.

Idempotency hashes of secret-input operations use an installation-keyed HMAC over the secret plus nonsecret input, not a public SHA digest of a low-entropy secret. Persist the installation HMAC key only as a safeStorage-encrypted private security_material blob; restore it before comparing secret-input retries. Missing/undecryptable material blocks secret-input replay rather than changing its hash identity. Store no secret in operations.input_json or result_json. On lost response, replaying the same native request key returns the reference without reencrypting. Credential error logs contain operationId/reason only. Private ciphertext is excluded from generic snapshots and diagnostics. Restore on a different OS user/machine may make it undecryptable: mark unavailable and require replacement.

## Native and API integration

F22 validates the main frame and registered application origin for every credential prompt. The main process presents the prompt in an isolated owned window with no remote content, navigation or extension access. The backend requests decryption over its inherited private channel, authenticated by process ownership and a per-launch nonce; no listening network decrypt endpoint exists. Decrypted buffers are released immediately after constructing the upstream request; do not claim JavaScript can guarantee forensic memory erasure.

Read-only capabilities do not imply authority to resolve credentials. Resource ownership, provider match and current F08 policy are checked at dispatch. Repeated connect failures are limited to five per minute per OS peer; caller fields cannot increase that allowance.

## Acceptance cases

| Case | Requirement / operation | Action | Required result |
|---|---|---|---|
| F02-T10 | R01 / OP01 | Forged frame and unauthenticated pipe peer request token | Denied; no issued token or secret |
| F02-T11 | R02 / OP03 | Disable actual encryption before store | encryption_unavailable, zero credential/blob/secret journal records |
| F02-T12 | R02 / OP04–06 | Rotate revision 1 while attempt A is active; start B with revision 1 | A may finish; B fails stale_credential before provider dispatch |
| F02-T13 | R03 / OP05 | Revoke then retry a previously authorized dispatch | Denied; active attempt signalled to abort; no new provider call |
| F02-T14 | R04 / all | Use a canary secret; inspect renderer, SSE, logs, journal and diagnostics | Canary absent except native input memory and trusted provider request |

Use [Electron safeStorage](https://www.electronjs.org/docs/latest/api/safe-storage) for the native mechanism; it does not isolate secrets from a hostile process with equivalent OS-user privileges. This is a Sirona policy, not an imported OpenClaw permission model.
