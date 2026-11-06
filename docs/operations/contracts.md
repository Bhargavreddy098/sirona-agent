---
title: "Backup, isolated restore and release recovery"
status: "PROPOSED DESIGN"
implementation: "NOT IMPLEMENTED HERE"
verification: "NOT RUN"
feature_id: "F21"
specification: "EDITION 1 PROPOSAL"
updated: "2026-11-05"
---

# Backup, isolated restore and release recovery

## Records and manifest

Inherit [foundation](../architecture/contract-foundation.md). Backup={state:"creating"|"ready"|"failed",manifestDigest:Digest or null,databaseDigest:Digest or null,bytes:Int,createdAt:Time,schemaVersion:Int,eventWatermark:Text(32) or null}. Restore={state:"validating"|"staged"|"failed"|"activated",backupId:Id,stagingIdentity:Text(256),validationDigest:Digest or null,credentialsNeedRebind:boolean,projectsNeedReselect:boolean}. Private managed paths are not returned through generic projections.

Manifest={formatVersion:1,schemaVersion:Int,createdAt:Time,databaseFile:"sirona.db",databaseDigest:Digest,databaseBytes:Int,eventWatermark:Text(32),migrationChecksums:List({version:Int,digest:Digest},100),includes:"database_and_blobs",credentialPortability:"same_os_user_only"}. Backups include the single database, all referenced artifact/evidence blobs and encrypted credential blobs inside it. They do not include arbitrary current project working files unless captured as F11 artifacts. Explain that distinction in the UI before backup.

## Operations

- F21-OP01 operations.backup public mutation {} -> Ack. One active backup per installation, actual SQLite online backup into dataRoot/backups/ID staging.
- F21-OP02 operations.backups public read {limit?:Int,cursor?:Text(1024)} -> Page(Entity(Backup)).
- F21-OP03 operations.stageRestore public mutation {backupId:Id} -> Ack -> Entity(Restore). Fresh isolated staging root only, never current working root.
- F21-OP04 operations.restoreStatus public read {restoreId:Id} -> Entity(Restore).
- F21-OP05 operations.activateRestore native-only mutation {restoreId:Id,approvalId?:Id} -> {restartRequired:true}. Exact destination/backup/validation bound to grant; application must be quiesced.
- F21-OP06 operations.deleteBackup public mutation {backupId:Id,approvalId?:Id} -> {deleted:true}. Explicit user action through the F08 pending-grant protocol; reject active backup/restore reference.
- F21-OP07 operations.releaseStatus public read {} -> {version:Text(80),packageDigest:Digest,updateAvailable:boolean,reason:Text(200) or null}. Updates disabled until a signed release channel is configured.
- F21-OP08 operations.stageUpdate native-only mutation {packageSelectionId:Id} -> {packageDigest:Digest,publisher:Text(256),compatible:boolean}; verified local package selected by native dialog, no arbitrary URL execution.
- F21-OP09 operations.activateUpdate native-only mutation {packageDigest:Digest,approvalId?:Id} -> {restartRequired:true}; exact approved artifact/publisher and recovery evidence required.

## Backup algorithm

Use the driver's actual online-backup API into a new database; do not file-copy the live database without WAL. After copy, read the watermark/migration inventory from the copied database, then run integrity_check and foreign_key_check there. Hash the finished closed destination bytes, create canonical manifest, flush both and atomically publish the managed directory. Default deadline5 minutes; on interruption retain failed staging for inspection and never label it ready. Check free space >=2*source database bytes+100 MiB before starting.

Maximum10 ready backups and aggregate10 GiB; if exceeded, refuse new backup with storage_limit and offer explicit deletion. Never silently delete the only restore-qualified backup. No secret plaintext in manifest. Backup final record itself may be newer than the snapshot; manifest watermark identifies the exact copied state.

## Restore and update boundaries

Validate manifest shape, hash, byte count, migration checksums, schema support and record/blob references before opening staged application services. Reject path traversal/extra executable files; managed backup contains exactly manifest.json and sirona.db. Restore validation opens staged database under isolated root, checks every registered record codec, foreign keys, blob hashes and F07/F09/F15 links. Mark credentials needing rebind if safeStorage decryption unavailable; do not fabricate usable credentials. Re-select project roots and verify root identities before allowing new project effects.

Activation stops admission, cancels/reconciles work, closes all connections and switches a native-owned active-root pointer to the validated staging identity. Preserve the previous root untouched. Unknown active effects block activation. After activation, new writes make reverting the pointer unsafe; rollback requires export/reconciliation of new changes, not merely an old backup. Restore never automatically resumes queued runs, schedules, external targets or paid inference: mark them blocked/paused pending revalidation.

Release package acceptance checks actual Windows publisher signature, package digest, version and supported schema range. Missing publisher/channel configuration is unavailable. Never downgrade across incompatible schema or edit migration checksums. Stage an update only with a restorable backup and actual packaged smoke evidence; activation after user-approved shutdown. Source code updates and data migrations remain distinct effects.

## Acceptance cases

| Case | Requirement / operation | Action | Required result |
|---|---|---|---|
| F21-T10 | R01 / OP01 | Concurrent writes during online backup | Copied database opens with consistent constraints and captured watermark |
| F21-T11 | R02 / OP03 | Corrupt byte/hash, unsupported schema, invalid blob ref | Stage fails; working store untouched |
| F21-T12 | R02 / OP05 | Activate with uncertain effect or changed validation digest | Blocked, no root switch |
| F21-T13 | R03 / restore | Restore under another OS user | Credentials unavailable/rebind; no plaintext fallback |
| F21-T14 | R04 / update | Unsigned package or incompatible downgrade | Refused; current package/data retained |
| F21-T15 | R02 / journey | Open actual staged app after successful restore | Sessions/contracts/artifacts/verdicts agree; automation remains paused |

The online backup mechanism follows [SQLite's backup documentation](https://www.sqlite.org/backup.html); retention, activation and disabled-resume policies are Sirona proposals.
