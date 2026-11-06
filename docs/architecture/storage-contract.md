---
title: "Edition 1 SQLite storage contract"
status: "PROPOSED DESIGN"
implementation: "NOT IMPLEMENTED HERE"
verification: "NOT RUN"
updated: "2026-11-05"
---

# Edition 1 SQLite storage contract

F03 owns this proposed fresh-install schema. Domain payloads are closed, versioned JSON records whose exact schemas live in each feature contracts.md. This deliberately uses a small relational envelope around typed documents: cross-domain references, unique keys, revisions, event ordering and operation identity remain database-enforced, while payload codecs remain domain-owned. It is not permission for arbitrary JSON writes. Every writer and reader validates the kind's registered codec. No generic record-write RPC exists.

## Kind registry

These are exact records.kind names. Each maps to the correspondingly named type in its owner contracts.md, with state stored separately as described below. Unknown kinds or body versions fail decoding; no permissive fallback.

| Owner | Kind names and type mappings |
|---|---|
| F01 | retention_floor -> {state:"active",floor:Text(32)} |
| F02 | principal -> Principal; credential -> Credential (private ciphertext projection); security_material -> {state:"active",purpose:"idempotency_hmac",ciphertext:BlobRef} |
| F03 | session -> Session; message -> Message |
| F04 | provider -> Provider; provider_attempt -> Attempt |
| F05 | budget -> Budget; reservation -> Reservation |
| F06 | requirement_set -> RequirementSet |
| F07 | build_contract -> Contract |
| F08 | approval -> Approval |
| F09 | run -> Run; task_run -> TaskRun; effect -> Effect |
| F10 | assignment -> Assignment |
| F11 | project -> Project; artifact -> Artifact; patch -> Patch |
| F12 | execution_profile -> Profile; execution -> Execution |
| F13 | mcp_server -> Server; code_index -> Index |
| F14 | memory -> Memory; skill -> Skill; context -> Context |
| F15 | checker_receipt -> Receipt; verdict -> Verdict |
| F16 | worker_adapter -> Adapter; worker_job -> WorkerJob |
| F17 | schedule -> Schedule; occurrence -> Occurrence; hook -> Hook; delivery -> Delivery |
| F18 | browser_session -> Profile; browser_observation -> Observation |
| F19 | deploy_target -> Target; release -> Release |
| F20 | diagnostic -> Diagnostic; evaluation -> Evaluation |
| F21 | backup -> Backup; restore -> Restore |
| F22–F24 | No independent business records; consume the existing owners |

Private process tokens/handles and launch nonces are not durable records. Domain unique-key tuples appear in their contracts; F03 writes key/reference rows together with the corresponding record changes. For records with mutable state but immutable content, only the allowed lifecycle fields change; historical payloads must not be rewritten.

## Schema 1

The following is proposed DDL, not an applied migration. Use a SQLite build supporting STRICT tables and JSON validation. Pin and qualify the chosen driver/SQLite version during IP00; do not infer a working dependency from this file.

```sql
CREATE TABLE workspaces (
  id TEXT PRIMARY KEY, created_at TEXT NOT NULL
) STRICT;
CREATE TABLE records (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  id TEXT NOT NULL, kind TEXT NOT NULL, revision INTEGER NOT NULL CHECK(revision>=1),
  state TEXT NOT NULL, body_version INTEGER NOT NULL CHECK(body_version=1),
  body TEXT NOT NULL CHECK(json_valid(body)),
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT,
  PRIMARY KEY(workspace_id,id)
) STRICT;
CREATE INDEX records_catalog ON records(workspace_id,kind,created_at,id);
CREATE INDEX records_state ON records(workspace_id,kind,state,updated_at,id);
CREATE TABLE record_keys (
  workspace_id TEXT NOT NULL, namespace TEXT NOT NULL, key TEXT NOT NULL,
  record_id TEXT NOT NULL,
  PRIMARY KEY(workspace_id,namespace,key),
  FOREIGN KEY(workspace_id,record_id) REFERENCES records(workspace_id,id)
) STRICT;
CREATE TABLE record_refs (
  workspace_id TEXT NOT NULL, from_id TEXT NOT NULL, role TEXT NOT NULL, to_id TEXT NOT NULL,
  PRIMARY KEY(workspace_id,from_id,role,to_id),
  FOREIGN KEY(workspace_id,from_id) REFERENCES records(workspace_id,id),
  FOREIGN KEY(workspace_id,to_id) REFERENCES records(workspace_id,id)
) STRICT;
CREATE INDEX refs_target ON record_refs(workspace_id,to_id,role);
CREATE TABLE operations (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id), id TEXT NOT NULL,
  principal_id TEXT NOT NULL, name TEXT NOT NULL, request_key TEXT NOT NULL,
  input_digest TEXT NOT NULL, state TEXT NOT NULL CHECK(state IN
    ('admitted','executing','completed','failed','uncertain')),
  resource_id TEXT, input_json TEXT CHECK(input_json IS NULL OR json_valid(input_json)),
  result_json TEXT CHECK(result_json IS NULL OR json_valid(result_json)),
  error_json TEXT CHECK(error_json IS NULL OR json_valid(error_json)),
  fence INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  PRIMARY KEY(workspace_id,id), UNIQUE(workspace_id,principal_id,name,request_key)
) STRICT;
CREATE TABLE leases (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id), resource TEXT NOT NULL,
  owner_id TEXT NOT NULL, fence INTEGER NOT NULL CHECK(fence>=1),
  expires_at TEXT NOT NULL, PRIMARY KEY(workspace_id,resource)
) STRICT;
CREATE TABLE events (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id), entity_id TEXT NOT NULL,
  operation_id TEXT NOT NULL, type TEXT NOT NULL, version INTEGER NOT NULL CHECK(version=1),
  body TEXT NOT NULL CHECK(json_valid(body)), created_at TEXT NOT NULL,
  FOREIGN KEY(workspace_id,entity_id) REFERENCES records(workspace_id,id),
  FOREIGN KEY(workspace_id,operation_id) REFERENCES operations(workspace_id,id)
) STRICT;
CREATE INDEX events_scope ON events(workspace_id,seq);
CREATE TABLE blobs (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id), digest TEXT NOT NULL,
  bytes INTEGER NOT NULL CHECK(bytes>=0), media_type TEXT NOT NULL,
  content BLOB NOT NULL, PRIMARY KEY(workspace_id,digest), CHECK(length(content)=bytes)
) STRICT;
CREATE TABLE blob_refs (
  workspace_id TEXT NOT NULL, record_id TEXT NOT NULL, digest TEXT NOT NULL,
  role TEXT NOT NULL, PRIMARY KEY(workspace_id,record_id,role,digest),
  FOREIGN KEY(workspace_id,record_id) REFERENCES records(workspace_id,id),
  FOREIGN KEY(workspace_id,digest) REFERENCES blobs(workspace_id,digest)
) STRICT;
CREATE TABLE migrations (
  version INTEGER PRIMARY KEY, checksum TEXT NOT NULL, applied_at TEXT NOT NULL
) STRICT;
```

Store record state in records.state only. A public entity's data.state is synthesized from that column; exclude state from stored body. Lifecycle enums are defined by the domain. IDs/time/digest forms are validated before binding. Records are at most 256 KiB; each blob at most 16 MiB. Larger tool output is truncated or rejected under its owner, not split invisibly. Secret ciphertext is a private F02 blob with no generic read exposure.

record_refs records every non-null reference to another entity, with the schema field path as role, in the same transaction as the body; array roles use the property name without an index. The owner validates referenced kind, access and pinned revision. Revision references remain meaningful through immutable revision records where the domain requires history. Deletion is a tombstone update; referenced historical contracts/artifacts are retained. No cascading delete can erase evidence.

## Writer and commit protocol

One backend process owns one serialized writer connection. Set foreign_keys=ON, journal_mode=WAL, synchronous=FULL, busy_timeout=5000 on opening; reject failure to establish them. Reads use bounded read transactions that do not await external work. The writer queue holds at most 100 pending requests; overflow is RATE_LIMITED. A write callback is synchronous database work only; reject a Promise result. Begin with BEGIN IMMEDIATE, validate current records, reserve unique keys, perform changes, append event, record operation result, COMMIT, then notify observers. Failed BEGIN does not invoke the callback. Failed COMMIT returns no success; rollback if still active, retire connection if rollback fails, reopen and reconcile by operation key before further dispatch.

For a synchronous mutation, operation creation and the entire result commit together. Long work commits an admitted operation/resource first, releases the transaction, then dispatches through its owner. Every state transition checks the current revision and, for run work, the live fence. No HTTP, filesystem, model or guest action runs inside a database transaction. Local atomicity never claims that an external effect can be undone by SQLite rollback.

record_keys is the uniqueness mechanism for session input keys, schedule occurrence instants, budget settlements and other domain keys named in feature contracts. The key is JCS of the owner-defined tuple, never concatenation with ambiguous delimiters. Remove a reservation only when its owner documents reuse as safe. Leases use resource names defined by the owner; takeover increments fence and requires its recovery procedure, not simply timeout expiry.

## Initialization, retention and recovery

Data root is an absolute local NTFS directory chosen by native main: default LOCALAPPDATA/Sirona. Database is dataRoot/sirona.db; WAL/SHM stay beside it. Reject UNC, removable/network roots and existing junction/reparse components for the database root. An explicitly supplied test root must be checked before importing persistence. No fallback to the working profile if it is missing or invalid. File ACL is the current OS user plus required system administrators; this is not protection against that user or administrators.

Fresh initialization creates a staging database, executes schema 1 and bootstrap workspace/principal in a transaction, runs foreign_key_check and integrity_check, then activates only that new installation. Record the SHA-256 of the exact migration SQL bytes; derive the real checksum when creating the implementation artifact, never insert a fabricated checksum here. Existing unknown schema versions fail closed. Legacy conversion is outside this schema and cannot be inferred from it.

Events retain at least seven days and at most 100,000 newest events per workspace, deleting the older prefix beyond either bound; keep a persisted retention-floor record. F01 specifies expired-cursor recovery. Terminal operation payloads retain 30 days then become key/hash tombstones; unresolved operations never expire. Domain records, approvals, receipts and referenced blobs retain until explicit user-authorized archival/removal policy; no silent evidence deletion. Unreferenced blobs may be collected after 24 hours, outside backup/restore admission. Database cap is 5 GiB; below 100 MiB free disk or at the cap, refuse new large writes and show unavailable/storage_full while preserving read and recovery operations.

F21 owns backup/restore. Never copy only a live main database file and assume WAL state is included. Use the driver's actual online-backup facility and qualify it. The [SQLite transaction](https://www.sqlite.org/lang_transaction.html) and [backup](https://www.sqlite.org/backup.html) documentation inform these boundaries; the queue limits and record model are Sirona choices.
