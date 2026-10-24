# Current Sirona gap audit

Workspace root: `C:\Users\bharg\OneDrive\Desktop\personal -agent`. These are static code observations from 24 October 2026. No app execution or test run was performed; runtime consequences below are inferred from the inspected call paths. Existing README claims are not verification evidence.

## Existing frontend

`sirona-ui/src/App.tsx` mounts a single shell without the Hermes page router. Existing families include TitlebarChrome, WorkspaceRail, SessionsRail, SessionTabs, MainCanvas, StatusBar; TranscriptCanvas, UserMessageBubble, AssistantMessage, ToolExecutionCard, SuggestionGrid, RunTicker; Composer, DirectiveChips, StatusDrawer; ContextPane, FileTreeExplorer, DiffReviewView, TerminalDeck; CommandPalette, SettingsModal, StarmapModal, CardStack and ApprovalCard. Stores cover sessions/messages/layout/approvals, with a small primitive set.

These can inform migration of Sirona-specific behavior, but their presence does not establish parity with the actual Hermes implementations.

## Blocking gaps

| Finding | Source | Required treatment |
|---|---|---|
| Model adapters do not perform real calls | `sirona-core/sirona/providers/{gemini,openai,anthropic,ollama}.py`; provider selection in `main.py` | Reuse real runtime routing/streaming, native tool history, errors and usage; remove empty/banner completions |
| Direct tools endpoint calls missing interfaces | `api/routes/tools.py` calls `tool_reg.get` and `tool.execute`; `tools/registry.py` provides `get_tool`/function-backed definitions | Unify tool dispatch and policy; file/review UI cannot rely on this endpoint as written |
| Approval event/ID/payload mismatch | `agent/runtime.py` emits `approval.request`; `sirona-ui/src/App.tsx` listens to `approval_request`; `store/approvalStore.ts` sends literal `current_run` | Generate IDs first; use one typed schema with correct run/session/prompt identity and rollback on failure |
| No structured clarification request lifecycle | Run/RPC clarify paths share approval futures; no corresponding question UI/runtime producer | Port actual clarify tool/contracts/stores/components/replay rather than merely relabel approvals |
| Turn processing blocks the control socket | `api/websocket/gateway.py` awaits complete prompt dispatch | Background run tasks with concurrent control processing; approval/stop must remain readable |
| Events broadcast across sessions | `api/websocket/events.py`, runtime event shapes and global frontend streaming state | Owner-scoped subscriptions/event IDs/replay; no foreground-session fallback |
| Completion and error-response mismatch | App expects `turn.complete`, runtime emits `message_complete`; gateway errors use null RPC ID | Contract adapter, terminal event flush, matching error IDs, timeout/disconnect rejection |
| Runs are acknowledged rather than executed | `api/routes/runs.py` returns queued/fixed status and acknowledges stop/steer | Durable run scheduler, actual cancellation/steering and real status/usage |
| Shell uses subprocess buffering, terminal uses pipes | `tools/terminal.py`, `terminal/session.py`, UI TerminalDeck | Port agent Bash/process management and native PTY/xterm as distinct implementations |
| Settings/model controls do not persist changes | SettingsModal, config/model routes and RPC configuration handlers | Wire validated durable config and effective provider/model/session changes |
| MCP is placeholder implementation | `mcp/client.py`, MCP manager | Real initialize, transports, discovery, execution, cancellation and subprocess lifecycle |
| Misleading/canned visual state | Hardcoded project/branch, inactive workspace/schedule buttons, canned diff fallback, synthetic Starmap root, static connection/status labels | Replace with actual reference state/handlers; honest clean/empty/error/unsupported states |
| Compression/history handling is incomplete | `session.compress` calls nonexistent `.compressor`; `compact_messages` contract differs; runtime limits history and reconstructs plain role/content | Reuse mature durable history/tool-call/compression invariants |
| Working directory and tool schemas incomplete | Shell defaults to server cwd; session cwd/attachments not consumed; simplistic schema conversion | Scope runtime/files/terminal per owning session/project; reuse validated schemas |
| Web search and skills integration incomplete | `tools/web.py`, skills discovery/toggles, prompt builder | Real tools and skill content/lifecycle; persistent enablement |
| Fresh serve path omits database initialization | `main.py` imports but does not call `init_db`; CLI paths differ | Startup migration/init and clean-home integration test |
| Electron is tied to development environment | `sirona-ui/electron/main.cjs`, `preload.cjs` | Independent bundled runtime/installer, stable startup, full bridge, state/tray/protocol/update lifecycle |
| Native New Session is disconnected | Main emits `sirona:new-session`; preload/renderer have no matching subscription | Port native menu → preload → renderer action contract |

## Existing API families to reconcile

Health/status; sessions/messages/fork/chat; runs/status/approval/clarify/steer/stop; models/options/set; projects/folders; skills/toggle; MCP servers; capabilities/toolsets/execute; config/schema; `/ws/gateway` and `/ws/terminal`. JSON-RPC names include session create/resume/activate/list/branch/cwd/workspace/model/compress/interrupt/events-since, approval/clarify response, prompt.submit, slash.exec, config.set, complete.slash and tools.list.

These names overlap with portions of Hermes but do not establish compatible payloads, owner identities, fencing, events, replay or lifecycle. Create a method-by-method adapter table before using the imported renderer against this server. Preserve existing API consumers through explicit facade adapters where necessary; avoid two competing authoritative agent engines.

## Test evidence limits

Backend tests use dummy model providers for isolated behavior. No frontend test files were found in the inspected Sirona source inventory. Builds/tests were not executed for this planning task. A passing mock loop would not prove real model calls, native tools, questions/approvals, concurrent sessions, actual PTY or installed desktop behavior.

The migration plan therefore makes real-provider, protocol, native Windows, recovery, visual and standalone-package checks separate exit gates.
