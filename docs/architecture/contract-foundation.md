---
title: "Edition 1 shared contract foundation"
status: "PROPOSED DESIGN"
implementation: "NOT IMPLEMENTED HERE"
verification: "NOT RUN"
updated: "2026-11-05"
---

# Edition 1 shared contract foundation

These are selected Sirona design proposals, not descriptions of existing code. Feature contracts inherit these definitions. A feature may narrow a bound; it must explicitly document any exception. The initial implementation targets a fresh installation. Import of an earlier product requires a separate inventory and conversion specification.

## Types and validation notation

The notation below defines JSON values, not a programming-language library. Every object is closed: reject unknown input fields recursively. All fields are required unless suffixed with ?. Missing and null are different; null is allowed only where written. Do not coerce strings to numbers or booleans. Output readers may ignore additional fields within version 1. Reject unsupported major versions. An operation property written without a type reuses the identically named field of its domain record; “without X” excludes that field. Input types never inherit server-owned state/timestamps implicitly. Individual field/list maxima also obey aggregate body/record limits; exceeding either rejects the whole request before mutation.

| Type | Exact meaning |
|---|---|
| Id | Lowercase canonical UUID v4; created with a cryptographic random generator; never an authority token |
| Digest | 64 lowercase hexadecimal characters; SHA-256 of the specified bytes |
| Time | UTC RFC3339 string with exactly millisecond precision, e.g. 2026-11-05T12:00:00.000Z; timestamps are server-assigned unless a scheduling input says otherwise |
| Int | JSON safe integer from 0 through 9007199254740991; revisions start at 1 |
| Text(n) | Valid Unicode string, no NUL or unpaired surrogate, at most n UTF-8 bytes; minimum 1 unless empty explicitly allowed |
| List(T,n) | JSON array of T, at most n entries; empty allowed unless specified |
| Money | Int micro-USD; all arithmetic uses integer operations; reject overflow; no floating-point billing |
| Json | Finite JSON value, maximum depth 16 and encoded size 64 KiB; no duplicate object keys |
| Entity(T) | {id:Id, workspaceId:Id, kind:Text(80), revision:Int, createdAt:Time, updatedAt:Time, data:T}; kind selects the registered domain codec and data is exactly that schema |
| Page(T) | {items:List(T,100), nextCursor:Text(1024) or null}; default page size 50, allowed 1..100 |
| Ref | {id:Id, revision:Int}; resolves in the authenticated workspace and expected kind |
| Ack | {operationId:Id, state:"admitted", resourceId:Id}; acknowledgement is not completion |
| BlobRef | {digest:Digest, bytes:Int, mediaType:Text(128)}; read requires an authorized owning record |

Strings used as identifiers, model IDs, repository content and prompts preserve case and bytes. Only human titles are trimmed before the 1..200-byte title validation; no implicit Unicode normalization. Canonical digests of objects use UTF-8 JSON Canonicalization Scheme (RFC 8785); exclude only fields explicitly listed by the owning schema. Arrays retain order unless that owner defines a sorting step. File/blob digests use raw bytes. Secrets never enter a public entity, event or digest input that could be returned to a consumer.

## RPC and errors

The sole public JSON entry is POST /api/v1/rpc with Content-Type application/json, an authenticated bearer token, and body {v:1, operation:Text(80), workspaceId:Id, key?:Id, expectedRevision?:Int, input:Json}. Each operation listed as public in a feature contract is a literal allowlist entry with its own stricter input codec. No dynamic import, reflection or arbitrary method dispatch. Internal operations cannot be invoked through RPC. The raw body limit is 1 MiB; individual input limits still apply.

For reads, key and expectedRevision are absent. For mutations, key is mandatory; expectedRevision is mandatory for changes to an existing mutable entity unless its operation specifies an immutable reference instead. Creation omits expectedRevision. The envelope is not itself an execution grant. Principal, service identity, risk, run fence and clock come from trusted context, never client fields.

Success is {v:1, requestId:Id, result:T}. HTTP 200 for reads and synchronous updates; 201 for entity creation; 202 only for Ack. Error is {v:1, requestId:Id, error:{code:Code, message:Text(512), retryable:boolean, details?:Json}}. Details contain only field paths, safe validation reasons, authorized current revisions or operation IDs. No stack traces, headers, secret values or provider response bodies.

| Code / HTTP | Condition | Retry rule |
|---|---|---|
| INVALID_ARGUMENT / 400 | Invalid encoding, fields, bounds, schema or unsupported operation/version | Correct request; false |
| UNAUTHENTICATED / 401 | Missing, expired or revoked token | Authenticate again; false |
| FORBIDDEN / 403 | Known scope but action not permitted | Obtain applicable authority; false |
| NOT_FOUND / 404 | Missing or inaccessible entity; do not reveal another workspace's existence | false |
| CONFLICT / 409 | Revision, digest, idempotency-key content or illegal-state conflict | Read state and make a new decision/key; false |
| APPROVAL_REQUIRED / 409 | Valid action lacks its required grant | Decide the returned authorized approvalId; false |
| RESYNC_REQUIRED / 409 | Event cursor outside retained history | Fetch snapshot then resubscribe; false |
| LIMIT_EXCEEDED / 413 | Payload, context, result or resource limit exceeded | Reduce request; false |
| RATE_LIMITED / 429 | Local admission limit | retryable true; retryAfterMs 100..60000 in details |
| UNAVAILABLE / 503 | Missing/unqualified dependency or storage unavailable | retryable true only for a transient dependency; disabled/unconfigured false |
| DEADLINE_EXCEEDED / 504 | Observation deadline elapsed | Query durable operation before any resubmission; retryable false |
| INTERNAL / 500 | Unexpected defect | retryable false; report requestId |

Domain-specific reasons use error.details.reason, a literal enumerated in the feature contract, while retaining the table's status/retry meaning. Clients never infer successful mutation from a lost response. APPROVAL_REQUIRED may leave a durable admitted operation waiting for its exact grant, as defined by F08; it is not a terminal failed operation result. A valid rejection happens before an external effect; uncertain completion is a durable operation state, not a retryable validation error.

## Idempotency, revisions and observation

F03 owns the durable operation journal. A mutation key is unique over (workspaceId, principalId, operation name, key). Hash the decoded operation name, workspace, expectedRevision and semantic input. Exclude only the optional approvalId proof-lookup hint from that input hash; it is separately validated against the exact operation/action and cannot change effect data. Same key/hash returns the recorded result or current operation status; different hash is CONFLICT with reason key_reused. Validation and authorization occur on every call, including replay; a revoked caller cannot retrieve an old result. Existing operations remain queryable for 30 days after terminal state; thereafter retain a hash/key tombstone for the installation lifetime and return CONFLICT reason result_expired rather than executing again.

Existing-entity writes compare the revision in the same transaction as the update. Successful updates increment it exactly once. A lost response retry uses the original key and revision and receives the committed result. Changing input or revision requires a new key. Read pagination is ascending by (createdAt,id) unless specified otherwise; cursor is an opaque HMAC-authenticated encoding of workspace, kind, filter digest and last tuple. It expires after 15 minutes; invalid/cross-scope cursor is INVALID_ARGUMENT. Pagination is live, not a frozen snapshot; no duplicate tuples, and concurrent insertions may appear on later pages.

Public operations.get input {operationId:Id} returns {operationId:Id, name:Text(80), state:"admitted"|"executing"|"completed"|"failed"|"uncertain", resourceId:Id or null, result:Json or null, error:Json or null}. Public operations.lookup input {operation:Text(80),key:Id} returns that status or null, scoped to the current principal/workspace; this resolves a lost response before an operationId reached the client. Only its principal or the workspace owner can read an operation by ID. Disconnect or client timeout does not cancel admitted work. Cancellation is a separate named mutation. Every long operation returns Ack after durable admission; default synchronous RPC deadline 10 seconds, never an automatic effect retry. Operation result storage/output may use the domain's aggregate 256 KiB record bound rather than the 64 KiB general Json field bound.

## Identity and ownership

The initial product has one local human principal and one default workspace; IDs are persisted at first initialization. Multiple projects and sessions live within it. The schema retains workspace scope so future sharing cannot accidentally merge data. There is no guest/remote-user mode in edition 1. Local OS-user control is the trust boundary; the product does not claim to sandbox a hostile process running as that same OS user.

F02 owns principals, grants and credential policy. F22 owns the authenticated native bridge and backend lifecycle. F03 alone opens SQLite; each domain alone changes its own typed records through F03 transactions. F09 owns run/task/effect authority. Model/tool/worker content cannot create trusted context. Internal calls carry a sealed context with principalId, workspaceId, originatingOperationId and, where relevant, runId/taskId/fence; wrappers derive it from stored admission records.

## Configuration and time

Installation configuration is a validated JSON file under the F03 data root with schemaVersion 1. Precedence is explicit launch option, then configuration, then the defaults documented by the owner. Only dataRoot and headless may be launch overrides; secrets use F02 references. Unknown keys or invalid values stop the affected service with a field-specific error; never silently fall back to a broader permission. Security and resource configuration is snapshotted into admitted operations. Narrowing permissions also blocks new dispatch in existing operations; broadening requires a new admission/approval.

All edition-1 limits documented as fixed require a contract revision to change. Fields with a range are configurable within it. Clock.now supplies UTC for persistence and monotonic elapsed time for active deadlines. Backward wall-clock movement exceeding 5 seconds suspends new timed admission until the clock catches up or the user acknowledges a new clock epoch. Existing external effects are reconciled, never replayed to compensate for clock movement.

## Sources and deliberate differences

OpenClaw's [protocol organization](https://docs.openclaw.ai/gateway/protocol) informs a single control boundary and explicit schemas. Sirona selects HTTP RPC plus SSE, not its WebSocket wire protocol. Its [session retry semantics](https://docs.openclaw.ai/concepts/session) inform duplicate-input handling; Sirona selects one scoped SQLite operation journal. Object digest normalization follows [RFC 8785](https://www.rfc-editor.org/rfc/rfc8785). All numeric defaults here are Sirona proposals, not attributed upstream defaults.
