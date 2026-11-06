---
title: "Provider configuration, attempts and normalized streams"
status: "PROPOSED DESIGN"
implementation: "NOT IMPLEMENTED HERE"
verification: "NOT RUN"
feature_id: "F04"
specification: "EDITION 1 PROPOSAL"
updated: "2026-11-05"
---

# Provider configuration, attempts and normalized streams

## Records and adapter port

Inherit [foundation](../architecture/contract-foundation.md). Provider data is {state:"disabled"|"ready"|"unavailable",label:Text(200),adapter:"openai-compatible",baseUrl:Text(2048),credentialId:Id or null,models:List(Model,100),configRevision:Int}. Model is {id:Text(256),contextTokens:Int,maxOutputTokens:Int,tools:boolean,streaming:boolean,pricing:Price}. Price is defined by F05. Exact IDs are case-sensitive and never rewritten. contextTokens is 1024..2000000; maxOutputTokens is 1..131072 and less than contextTokens. Configuration is a declared capability; readiness requires a successful authorized probe.

The [AI SDK compatible-provider documentation](https://ai-sdk.dev/providers/openai-compatible-providers) supplies the adapter integration reference; qualify each configured endpoint/model rather than assuming all optional features. Edition 1 implements an OpenAI-compatible chat-completions adapter behind the provider port; other native provider adapters are explicit later additions, not claimed compatible from their name. The port is discover(signal), generate(request,signal) -> async normalized events, and cancel(attemptId). Use the selected SDK's actual supported adapter behind this port; pin its version at IP00. baseUrl must be HTTPS, no userinfo/query/fragment. Explicit loopback HTTP is allowed only when the configured model is local; reject redirects, private-network remote targets and DNS rebinding to disallowed addresses. No generic user URL fetcher.

Attempt data: {state:"reserved"|"streaming"|"completed"|"failed"|"interrupted"|"uncertain",runId:Id,modelId:Text(256),provider:Ref,reservationId:Id,credentialRevision:Int or null,outputBlob:BlobRef or null,usage:Usage or null,reason:Text(80) or null}. Usage={inputTokens:Int,outputTokens:Int}; counts 0..2000000 each. Secrets and full authorization headers are absent.

## Operations

- F04-OP01 providers.configure public mutation {providerId?:Id,label,baseUrl,models,credentialId:Id or null,enabled:boolean} -> Entity(Provider). Existing ID requires expectedRevision. disabled unless enabled plus credential binding/local policy validate; enable does not itself perform paid inference.
- F04-OP02 providers.list public read {} -> List(Entity(Provider),20). Maximum 20 providers.
- F04-OP03 providers.probe public mutation {providerId:Id} -> Ack. Metadata-only GET model discovery, 5-second deadline; no completion request. Return actual catalog availability; missing discovery leaves declared models visible as unverified.
- F04-OP04 generate internal {runId:Id,provider:Ref,modelId:Text(256),reservationId:Id,messages:List(ChatMessage,200),tools:List(ToolSchema,32),maxOutputTokens:Int} -> Entity(Attempt), then normalized events. ChatMessage={role:"system"|"user"|"assistant"|"tool",text:Text(65536),toolCallId?:Text(128),toolCalls?:List({id:Text(128),name:Text(80),arguments:Json},32)}; assistant messages alone may contain toolCalls; tool messages require toolCallId matching a preceding complete assistant call; other roles forbid both. Empty text is permitted for a tool-call-only assistant message. ToolSchema={name:Text(80),description:Text(1024),inputSchema:Json}. Sum input obeys model/context limits and F14 assembly.
- F04-OP05 cancel internal {attemptId:Id} -> {signalled:boolean}; idempotent abort, never reports that upstream billing stopped.
- F04-OP06 providers.attempt public read {attemptId:Id} -> Entity(Attempt), with authorized transcript blob access separately scoped.

## Event and failure algorithm

Normalized internal events are start {attemptId}, text {delta:Text(16384)}, toolStart {callId:Text(128),name:Text(80)}, toolArguments {callId,delta:Text(16384)}, toolEnd {callId,arguments:Json}, usage {inputTokens,outputTokens}, end {reason:"stop"|"tool_calls"|"length"}, error {reason:"auth"|"rate_limit"|"timeout"|"protocol"|"transport"}. Accumulate tool arguments by callId, cap 64 KiB per call and 32 calls per attempt. A tool becomes dispatchable only after complete JSON decoding, schema validation, and a valid end with tool_calls. A truncated or malformed call executes nothing. Duplicate fragments cannot create a second completed call. Raw provider events never become trusted tool receipts.

Persist attempt admission before connecting. Resolve F02 credential at dispatch, check F05 reservation, then stream. First-byte deadline 30 seconds; idle deadline 30 seconds; total deadline 120 seconds. Flush text at most every 100 ms or 4 KiB into bounded draft output; final output max 1 MiB. Persist final text as blob and F03 transcript message with complete/interrupted state; emit provider.updated with {attemptId,state,reason}. On process death in streaming state mark interrupted, reconcile usage as unknown. Do not silently generate a replacement completion.

401/403 is failed/auth; 429 is failed/rate_limit, with sanitized Retry-After at most 60 seconds; timeout or truncated stream after output is interrupted. If connection outcome makes billing uncertain, F05 keeps its reservation. F04 never selects fallback; F05/F09 decide it before observable output/effects. Cancellation releases execution concurrency after abort/cleanup, but does not release unknown financial reservations.

## Acceptance cases

| Case | Requirement / operation | Action | Required result |
|---|---|---|---|
| F04-T10 | R01 / OP01–03 | Configure exact mixed-case model ID; metadata probe fails | ID unchanged, unverified/unavailable shown, no paid request |
| F04-T11 | R02 / OP04 | Local protocol fixture emits fragmented valid tool arguments then terminal | One validated tool call; no dispatch before terminal |
| F04-T12 | R02 / OP04 | Cut stream mid-tool JSON and after text output | No partial tool execution; output interrupted, usage unknown |
| F04-T13 | R04 / OP05 | Cancel active stream; fixture records transport abort | Cancellation reaches transport; slot freed after cleanup; cost not assumed zero |
| F04-T14 | R01 / OP04 | Authorized real model and approved cap | Actual text/usage or explicit unavailable; fixture-only tests do not qualify this case |

Implementation must validate against the selected provider's current official protocol during adapter qualification; compatibility claims are per tested model/configuration, not all providers.
