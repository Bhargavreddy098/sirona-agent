---
title: "MCP dispatch, repository search and syntax evidence"
status: "PROPOSED DESIGN"
implementation: "NOT IMPLEMENTED HERE"
verification: "NOT RUN"
feature_id: "F13"
specification: "EDITION 1 PROPOSAL"
updated: "2026-11-05"
---

# MCP dispatch, repository search and syntax evidence

## Records and supported surfaces

Inherit [foundation](../architecture/contract-foundation.md). Server={state:"disabled"|"ready"|"unavailable",label:Text(200),transport:"stdio-guest"|"https",target:Text(2048),credentialId:Id or null,protocolVersion:Text(40),toolCatalogDigest:Digest or null}. Tool={name:Text(80),description:Text(2048),inputSchema:Json,outputSchema:Json or null,schemaDigest:Digest}. Tool schemas must be supported JSON Schema 2020-12 objects, bounded to 64 KiB/depth16; unsupported references/dialects are unavailable, never silently ignored. No remote $ref fetching.

Index={state:"building"|"ready"|"stale"|"failed",projectId:Id,artifactId:Id,artifactDigest:Digest,parserManifest:List({language:"typescript"|"javascript"|"json",grammarDigest:Digest},3),result:BlobRef or null}. Initial syntax support is those three languages. LSP is advertised unavailable until an actual server/version/protocol and qualification are supplied; do not label Tree-sitter results as type-checker diagnostics.

## Operations

- F13-OP01 intelligence.registerServer public mutation {label,transport,target,credentialId:Id or null} -> Entity(Server), disabled. stdio target identifies a qualified F12 profile/command registration, not arbitrary host shell text; HTTPS follows F04 destination/redirect restrictions.
- F13-OP02 intelligence.discover public mutation {serverId:Id} -> Ack. Perform initialized MCP handshake and catalog fetch, store exact protocol version/catalog digest. Discovery grants no invocation rights.
- F13-OP03 intelligence.tools public read {serverId:Id} -> List(Tool,100). More than 100 tools returns LIMIT_EXCEEDED, requiring a narrower registration.
- F13-OP04 intelligence.invoke public mutation {serverId:Id,toolName:Text(80),schemaDigest:Digest,arguments:Json,approvalId?:Id} -> Ack. F08 treats externally effective tools as exact effects; unclassified tools are denied.
- F13-OP05 intelligence.search public read {projectId:Id,artifactId:Id,query:Text(256),caseSensitive?:boolean,maxResults?:Int} -> {artifactDigest:Digest,matches:List({path:Text(1024),line:Int,column:Int,excerpt:Text(1024)},200),truncated:boolean}. Literal text search only, default caseSensitive=false/maxResults=100, range1..200. Regex is not supported in edition 1.
- F13-OP06 intelligence.parse public mutation {projectId:Id,artifactId:Id,languages:List(Text(40),3)} -> Ack. Parsed AST/symbol evidence uses pinned grammar digests and file hashes.
- F13-OP07 intelligence.index public read {indexId:Id} -> Entity(Index).

## Dispatch and freshness

MCP initialization negotiates only a supported pinned protocol version. Catalog changes invalidate schemaDigest and prior operation approval; existing in-flight requests retain their pinned schema for receipt validation. Invoke rechecks registration, tool catalog and arguments, dispatches once with stable F09 operation identity, validates bounded output schema when declared, and stores {serverId,toolName,schemaDigest,requestId,result:Json,isError:boolean}. Tool isError is a tool failure, not a transport success or verification PASS. Never trust MCP annotations as the final risk classification.

Invoke deadline 30 seconds, cancellation propagation plus 5-second cleanup. Maximum result 1 MiB, text excerpt 64 KiB; oversized output returns LIMIT_EXCEEDED with a retained truncation diagnostic, not silently usable context. A disconnected effectful request with no receipt is uncertain and cannot be automatically retried merely because MCP reconnect succeeded.

Search/parse runs through qualified guest adapters over the immutable F11 artifact. ripgrep is invoked with argument arrays and literal mode, no shell interpolation; cap scanned data to the artifact's 100 MiB. Deadline 10 seconds for search, 60 seconds for parsing. Response line/column are 1-based UTF-8 byte positions. Ignore binary files for text search; report that exclusion. Index key=(artifactDigest,parserManifestDigest); edits mark project-current index stale but old artifact queries remain valid.

## Acceptance cases

| Case | Requirement / operation | Action | Required result |
|---|---|---|---|
| F13-T10 | R01 / OP02–04 | Discover tool then invoke without effect authority | Discovery succeeds, invocation denied |
| F13-T11 | R02 / OP04 | Change schema between preview and dispatch | CONFLICT reason schema_changed, no tool call |
| F13-T12 | R02 / OP04 | Oversized/malformed MCP response | Bounded failure, no trusted context/receipt fabricated |
| F13-T13 | R03 / OP05 | Search fixture with known UTF-8 matches and binary file | Exact positions and pinned artifact digest; no host command |
| F13-T14 | R04 / OP06–07 | Parse then modify project bytes | Old index identified by old digest; current view stale |

Use the official [MCP tool specification](https://modelcontextprotocol.io/specification/2025-11-25/server/tools) for protocol fields, negotiation and result interpretation. Sirona adds its own scoped authority and durability rules.
