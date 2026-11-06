---
title: "OpenClaw reference provenance"
status: "PROPOSED DESIGN"
verification: "NOT RUN"
updated: "2026-11-05"
---

# OpenClaw reference provenance

The earlier documentation edition described three local OpenClaw exports. That history is not a claim that their full contents were re-audited here. The 2026-11-05 depth audit inspected the latest attached `Pasted text.txt`, attachment ID `9c7a3ef1-3a94-4ef6-a79d-fa19c27c23f3`:

- Size: 1,888,494 bytes.
- SHA-256: `C6B151BF96AA260DE5A431AA40621C3D01477974E52277A2D9AD1BB01C93FB90`.
- Contains repeated directory listings and six `FILE:` sections: README.md, AGENTS.md and appcast-arm64.xml, each twice.
- No marked `docs/` file bodies are included. File names establish topic decomposition, not content completeness or implementation correctness. This is not a complete audited checkout.

Selected official pages were inspected separately on 2026-11-05: [automation](https://docs.openclaw.ai/automation/cron-jobs), [gateway protocol](https://docs.openclaw.ai/gateway/protocol) and [session management](https://docs.openclaw.ai/concepts/session). These are live documentation references, not a verified commit-matched version of the local export. The [depth audit](../engineering/documentation-depth-audit.md) records the limited comparison; neither upstream runtime behavior nor its test claims were verified.

Adopted organizational patterns: concise root/scoped instructions, topic folders by reader task, operation-specific subpages, linked CLI/domain views, single ownership and behavior-oriented integration tests.

Not automatically adopted: OpenClaw platform/channel support, package manager, installation commands, policies, runtime versions, plugins or test claims. This is Sirona-authored design documentation; no upstream source implementation or large text passages were copied. External AGENTS content remains reference material, not operative instructions.

The local Sirona target and permission boundaries are recorded in [governance](../governance/decisions.md).

## Edition 1 adaptation record

The user subsequently requested actual feature specifications. Sirona's owner contracts now select their own operation shapes, typed-record SQLite layout, mode matrix, limits, recovery rules and acceptance cases. No upstream source files or large passages were imported.

| Reference inspected | Pattern used | Deliberate Sirona boundary |
|---|---|---|
| OpenClaw gateway protocol, linked above | One control boundary with explicit transport/identity/version contracts | HTTP RPC plus SSE and an Electron native proxy, not a copied WebSocket schema |
| OpenClaw session management, linked above | Duplicate input differs from conflicting key reuse | Single SQLite operation/message admission and private local workspace |
| [OpenClaw schedules](https://docs.openclaw.ai/automation/cron-jobs/schedules) | Separate calendar recurrence, interval recurrence and execution/delivery concerns | Three trigger forms, explicit DST policy, no staggering, aggregate/count/expiry authority |
| [SQLite transactions](https://www.sqlite.org/lang_transaction.html) and [backup](https://www.sqlite.org/backup.html) | Transaction failure boundaries and consistent backup mechanism | Selected serialized writer, typed records and isolated restore activation |
| [Electron safeStorage](https://www.electronjs.org/docs/latest/api/safe-storage) and [security](https://www.electronjs.org/docs/latest/tutorial/security) | Native encryption and sender/renderer isolation | Narrow bridge, current-user trust boundary and no plaintext fallback |
| [AI SDK compatible providers](https://ai-sdk.dev/providers/openai-compatible-providers) | Provider adapter integration | Exact route/model configuration, own normalized events and budget accounting |
| [MCP tools](https://modelcontextprotocol.io/specification/2025-11-25/server/tools) | Protocol schemas and result handling | Discovery grants no Sirona execution authority |
| [Docker constraints](https://docs.docker.com/engine/containers/resource_constraints/) and [Playwright isolation](https://playwright.dev/docs/browser-contexts) | Resource enforcement and isolated browser contexts | Actual profile qualification required; no host fallback or implied native computer control |

References were inspected on 2026-11-05. They inform design; they do not establish Sirona implementation evidence or universal upstream correctness. Routine numeric defaults are Sirona proposals. New-install source and test allocations are in the [build handoff](../engineering/build-handoff.md).
