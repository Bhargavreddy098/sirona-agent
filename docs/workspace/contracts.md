---
title: "Project roots, artifact snapshots and patch application"
status: "PROPOSED DESIGN"
implementation: "NOT IMPLEMENTED HERE"
verification: "NOT RUN"
feature_id: "F11"
specification: "EDITION 1 PROPOSAL"
updated: "2026-11-05"
---

# Project roots, artifact snapshots and patch application

## Records and path rules

Inherit [foundation](../architecture/contract-foundation.md). Project={state:"open"|"closed"|"blocked",root:Text(4096),rootIdentity:Text(256),label:Text(200)}. Artifact={state:"available"|"unavailable",projectId:Id,manifest:List(FileEntry,10000),digest:Digest}; FileEntry={path:Text(1024),digest:Digest,bytes:Int,mode:"file"}. Snapshot limit 100 MiB total, 16 MiB per file. Patch={state:"previewed"|"applying"|"applied"|"conflicted"|"uncertain",projectId:Id,baseArtifactId:Id,changes:List(Change,100),digest:Digest,resultArtifactId:Id or null}; Change={path:Text(1024),before:Digest or null,after:BlobRef or null}. before=null means create; after=null means delete; both null invalid. Rename is explicit delete+create; binary content is allowed through blobs and never text-reencoded.

Project-relative paths use /, cannot be absolute, contain .., NUL, device names, alternate-data-stream colon, trailing dot/space, or .git internals. Reject duplicate/case-colliding targets on Windows. Resolve root and every component through the native filesystem boundary and record volume/file identity. Reject reparse points/junctions inside writable paths in edition 1. Revalidate at use and open through a containment-checked native handle; a string prefix check alone is insufficient. If the boundary cannot guarantee handle containment, mutation is unavailable. Root selection proves user intent, not absence of later path races.

## Operations

- F11-OP01 workspace.open public mutation {selectionId:Id,label:Text(200)} -> Entity(Project). F22 resolves the single-use native selection. An existing rootIdentity returns its existing project, unique project_root=(rootIdentity).
- F11-OP02 workspace.read public read {projectId:Id,path:Text(1024)} -> {blob:BlobRef,encoding:"utf8"|"binary",text:Text(65536) or null}. Maximum read 16 MiB; text returned only if valid UTF-8 and <=64 KiB. Blob read requires project authorization.
- F11-OP03 workspace.capture public mutation {projectId:Id,paths:List(Text(1024),10000)} -> Entity(Artifact); no empty path list, paths sorted; reject files changing during capture and ask retry, never mix unstable bytes under one digest.
- F11-OP04 workspace.putBlob public mutation {projectId:Id,base64:Text(87384),mediaType:Text(128)} -> BlobRef. Decode strictly; max 64 KiB decoded. Larger files use authenticated PUT /api/v1/projects/ID/blobs/DIGEST raw octets, Content-Length<=16 MiB, no chunked upload, hash verified before publication. Journal by mutation key header; no filesystem extraction from filename.
- F11-OP05 workspace.previewPatch public mutation {projectId:Id,baseArtifactId:Id,changes:List(Change,100)} -> Entity(Patch). Verify all before digests match the named base; all after blobs exist and are authorized; total changed bytes <=32 MiB. Digest is JCS of project rootIdentity, base artifact digest and sorted changes.
- F11-OP06 workspace.applyPatch public mutation {patchId:Id,patchDigest:Digest,approvalId?:Id} -> Ack; expectedRevision required. F08 determines whether grant required. A run's internal dispatch attaches its trusted run context, never caller actor fields.
- F11-OP07 workspace.gitStatus public read {projectId:Id} -> {head:Text(128) or null,entries:List({path:Text(1024),status:Text(2)},10000)}.
- F11-OP08 workspace.gitCommit public mutation {projectId:Id,paths:List(Text(1024),100),message:Text(4096),expectedHead:Text(128) or null,approvalId?:Id} -> Ack.
- F11-OP09 workspace.gitPush public mutation {projectId:Id,remote:Text(200),refspec:Text(512),expectedHead:Text(128),approvalId?:Id} -> Ack. No force flag; resolve exact remote URL before action digest; network authority separate.
- F11-OP11 workspace.tree public read {projectId:Id,path?:Text(1024),limit?:Int,cursor?:Text(1024)} -> Page({path:Text(1024),kind:"file"|"directory",bytes:Int or null}); path defaults project root, lists immediate children sorted by case-folded name then original bytes, refuses reparse points and .git internals. No recursive unbounded walk.
- F11-OP10 workspace.list public read {} -> List(Entity(Project),100); workspace.artifact public read {artifactId:Id} -> Entity(Artifact).

## Apply algorithm and recovery

Internal F11-OP12 importArtifact accepts {projectId:Id,manifest:List(FileEntry,10000),blobs:List(BlobRef,10000)} and returns Entity(Artifact). Verify each content digest/size from actual stored bytes, reject missing/extra manifest paths and enforce aggregate limits before publication. Workers/guest adapters use this port instead of writing artifact records themselves. Internal F11-OP13 exportArtifact accepts {artifactId:Id,operationId:Id} and returns an opaque native-owned staging handle, not a client-selected path; export only regular manifest files after containment checks. Releasing that handle cleans only its verified owned directory.

Git commit completion result is {commitId:Text(128),head:Text(128),paths:List(Text(1024),100)}; push result is {remote:Text(200),refspec:Text(512),previousRemoteOid:Text(128) or null,newRemoteOid:Text(128),verified:boolean}. verified requires an actual remote-ref observation, not merely a successful process launch.

Serialize project writes. Recheck all live target identities and before hashes before touching any file. Stage replacement files beside their targets, flush them, record the per-file intent and staging identities in a private patch journal. Apply in lexical path order with atomic replacement per file; record each actual resulting hash. Multi-file patch is not globally atomic: observers may see intermediate changes. Block other Sirona writers until reconciliation, and never claim database rollback undoes file writes.

If a precondition changed before application, state conflicted and no target writes. If failure occurs after some replacements, state uncertain; preserve actual completed changes and staged data. Recovery compares each path with before/after: after means completed, before means not applied, any other value means user conflict. It may complete only missing files under unchanged authority, or present a new compensating preview; never overwrite a third value or automatically reset the whole project. Cancellation during apply follows the same reconciliation.

Git operations are executed by a narrowly scoped broker with argument arrays, bounded output (1 MiB), 60-second commit and 120-second push deadlines. Use a sanitized Git environment, disable system/global config and repository hooks, reject configured external diff/clean/smudge/filter programs before broker operations, and forbid repository-controlled credential helpers; commits with hooks are unavailable in edition 1 unless separately guest-qualified. No shell expansion, automatic staging of unrelated files or credential-bearing remote URLs in logs. Git result includes actual commit/ref receipt; unknown push outcome requires remote-ref read before retry.

## Acceptance cases

| Case | Requirement / operation | Action | Required result |
|---|---|---|---|
| F11-T10 | R01 / OP01–06 | Junction/ADS/case-collision path or swapped parent | Denied before write; no escape |
| F11-T11 | R02 / OP05–06 | User edits base after preview | conflicted, user bytes intact |
| F11-T12 | R02 / recovery | Kill after first of two replacements | First recorded/reconciled; second not blindly duplicated; third-party edits preserved |
| F11-T13 | R03 / OP08–09 | Commit/push without exact grant | No Git mutation or network action |
| F11-T14 | R04 / artifact | Capture file while it changes | Conflict, no misleading stable manifest |
| F11-T15 | R02 / bytes | Patch CRLF and binary file | Result hashes match intended raw bytes exactly |

All manifests and patch receipts reference actual observed bytes. The editor/diff UI renders these previews rather than calculating a competing authoritative patch.
