# OpenCode-to-Sirona API Compatibility & Adapter Mapping

This document specifies the exact mapping between the OpenCode SolidJS frontend client and Sirona's local Express REST and SSE backend.

---

## 1. Core API Mapping Matrix

| OpenCode Expected Endpoint | OpenCode Function | Sirona Live Registered Route | Adapter Behavior & Mapping |
| :--- | :--- | :--- | :--- |
| `GET /api/session` | List all sessions | `GET /api/v1/conversations` | Maps Sirona conversations to OpenCode session DTO (`id`, `title`, `updatedAt`, `project`). |
| `POST /api/session` | Create new session | `POST /api/v1/conversations` | Creates conversation and returns `{ id, title, createdAt }`. |
| `GET /api/session/{id}` | Get session details | `GET /api/v1/conversations/:id` | Returns conversation state, system instructions, and history. |
| `DELETE /api/session/{id}` | Delete session | `DELETE /api/v1/conversations/:id` | Purges conversation and associated local run files. |
| `PATCH /api/session/{id}` | Update session title | `PATCH /api/v1/conversations/:id` | Updates conversation title or settings. |
| `POST /api/session/{id}/prompt` | Submit user prompt | `POST /api/v1/conversations/:id/messages` & `POST .../turns` | Dispatches user prompt and kicks off LangGraph agent turn. |
| `GET /api/session/{id}/message` | Get session messages | `GET /api/v1/conversations/:id/messages` | Returns turn history with user, assistant, and tool calls. |
| `POST /api/session/{id}/interrupt`| Stop active run | `POST /api/v1/runs/:runId/cancel` | Issues cancellation signal to current executing run. |
| `GET /api/provider` | List providers | `GET /api/v1/providers` | Returns available providers (Anthropic, OpenAI, Gemini). |
| `GET /api/model` | List models | `GET /api/v1/models` | Returns model catalog (Claude 3.5 Sonnet, GPT-4o, Gemini 1.5 Pro). |
| `GET /api/model/default` | Get default model | `GET /api/v1/model-settings` | Reads default selected model. |
| `GET /api/event` | Global event stream | `GET /api/v1/projects/:projectId/events` | Maps Sirona SSE events (`run.step`, `tool.execute`, `token.delta`) to OpenCode event shapes. |
| `GET /api/fs/list` | List project tree | `GET /api/v1/projects/:projectId/files` | Lists directory files with `.gitignore` exclusion. |
| `GET /api/fs/read/*` | Read file content | `GET /api/v1/projects/:projectId/file?path=...` | Reads file text from scoped project root. |
| `GET /api/vcs/status` | Git repository status | `GET /api/v1/projects/:projectId/snapshots` | Returns current branch, dirty file list, and uncommitted changes. |
| `GET /api/vcs/diff` | Turn / working diff | `GET /api/v1/projects/:projectId/patch-previews/:id` | Computes unified diff for Monaco editor / diff viewer. |
| `GET /api/permission/request` | Pending approvals | `GET /api/v1/approvals` | Returns human-in-the-loop pending tool approval requests. |
| `POST .../permission/{id}/reply`| Decision reply | `POST /api/v1/approvals/:id/decisions` | Submits `APPROVE` or `DENY` decision for command/edit. |
| `POST /api/pty` | Create terminal | `POST /api/v1/projects/:projectId/terminals` | Spawns PTY session in local project workspace. |
| `GET /api/info` | Server status | `GET /api/status` & `GET /health/live` | Health probe and daemon version verification. |

---

## 2. Unsupported OpenCode Features & Graceful Degradation

Certain OpenCode-specific endpoints are not part of Sirona's local architecture. The adapter layer handles these transparently:
1. **Remote Device Pairing (`/api/pair`)**: Sirona is local-first on the Windows workstation; pairing UI is hidden or disabled.
2. **Real-time Voice (`/voice`)**: Voice input toggle is disabled in the composer.
3. **Session Revert Staging (`/revert/stage`)**: Sirona uses LangGraph state checkpoint restoration instead of a 3-step staged revert.
4. **Dynamic Plugin GUI (`/plugin/gui`)**: Sirona uses standard MCP tools directly without dynamic iframe GUI injection.
