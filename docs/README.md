# Sirona P0-P8 - current work packet

Read [root AGENTS.md](../AGENTS.md), then the [current handoff](SIRONA-AGENT-HANDOFF.md), [master plan](SIRONA-WORKSPACE-PLAN.md), [execution ledger](SIRONA-WORKSPACE-LEDGER.md) and [technology ledger](SIRONA-WORKSPACE-TECHNOLOGY-LEDGER.md). Actual source, exact owner approvals and matching evidence determine current status; document presence is not permission or completion.

## Phase documents

| Phase | Scope | Current documents |
| --- | --- | --- |
| P0 | Baseline and preservation | [Report](SIRONA-WORKSPACE-P0-REPORT.md) |
| P1 | Typed execution reliability | [Scope](SIRONA-WORKSPACE-P1-APPROVAL.md), [report](SIRONA-WORKSPACE-P1-REPORT.md) |
| P2 | Protected provider credentials | [Scope](SIRONA-WORKSPACE-P2-APPROVAL.md), [report](SIRONA-WORKSPACE-P2-REPORT.md) |
| P3 | Trusted-local Docker + WSL2 Home profile | [Profile plan](SIRONA-WORKSPACE-P3-DOCKER-PLAN.md), [corrected report](SIRONA-WORKSPACE-P3-REPORT.md) |
| P4 | Vercel AI SDK | [Scope](SIRONA-WORKSPACE-P4-APPROVAL.md), [report](SIRONA-WORKSPACE-P4-REPORT.md) |
| P5 | LangGraph and bounded specialists | [Implementation plan](SIRONA-WORKSPACE-P5-IMPLEMENTATION-PLAN.md), [approval gates](SIRONA-WORKSPACE-P5-APPROVAL.md) |
| P6 | MCP and code intelligence | P6 section of the [master plan](SIRONA-WORKSPACE-PLAN.md); separate future scope/approval required |
| P7 | Workspace UI integrations | P7 section of the [master plan](SIRONA-WORKSPACE-PLAN.md); separate future scope/approval required |
| P8 | Release/recovery qualification | P8 section of the [master plan](SIRONA-WORKSPACE-PLAN.md); separate future scope/approval required |

The roadmap is named P0-P8: it contains the baseline P0 plus eight implementation phases P1-P8. No missing phase file is manufactured as a completed plan.

## Continuing with another agent

The later owner-approved P1–P5 frontend/backend slice is described in the [wiring approval](SIRONA-FRONTEND-BACKEND-WIRING-APPROVAL.md) and [verified wiring report](SIRONA-FRONTEND-BACKEND-WIRING-REPORT.md). This is a bounded exception for its listed surfaces/APIs, not approval of remaining P6–P8 or production activation.

Use the [external-agent guide](SIRONA-EXTERNAL-AGENT-GUIDE.md). For P5, use the current implementation plan and gates above; the earlier invalid draft is archived. Do not infer implementation authorization from proposed approval text. Keep SQL application and production activation separately gated.

## Supporting rules and dated evidence

[Supporting documentation](../sironadocs/README.md) contains the normative architecture/security/API library as well as clearly separated historical material. Root AGENTS.md still determines which normative documents must be read. Archives are not current assignments.

Non-Markdown evidence, guarded runners, JSON contracts and private rollback material remain in their original folders so their executable paths and accepted proof are preserved. Older embedded paths in immutable evidence resolve through [the relocation map](../sironadocs/relocation-map.json). Never overwrite accepted evidence simply to repair a historical path.
