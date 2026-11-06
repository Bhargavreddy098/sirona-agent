# @sirona/server

Core backend service for Sirona, providing the Express HTTP API, WebSocket/SSE transports, LangGraph workflow orchestration, tool execution runtime, and local-first persistence.

## Architecture

Following the T3 Code modular server architecture, `apps/server` organizes capabilities into domain-specific modules under `src/`:

- `auth/`: Principal identity, authentication sessions, and route security.
- `checkpointing/`: LangGraph graph checkpointing and recovery adapters.
- `git/`: Scoped Git operations, tree inspection, and repository status.
- `guest/`: Sandboxed Docker/WSL2 guest execution and isolation brokers.
- `mcp/`: Model Context Protocol tool execution and client connections.
- `observability/`: Structured audit logging, metrics, and tracing.
- `orchestration-v2/`: Graph runtimes, workflow orchestration, and activity execution.
- `persistence/`: SQLite/PostgreSQL connection pooling, effect journals, and stores.
- `preview/`: Patch preview, diff computation, and conflict detection.
- `process/`: Worker process supervision and container containment.
- `project/`: Project registration, repository snapshot indexing, and file trees.
- `provider/`: Multi-provider LLM integrations (Anthropic, OpenAI, Gemini).
- `review/`: Code review approvals, diff reviews, and governance gates.
- `scheduledTasks/` & `scheduling/`: Background automation and cron triggers.
- `secrets/`: DPAPI credential protection and execution policy fences.
- `terminal/`: Virtual terminal allocation, Socket.IO proxy, and PTY channels.
- `textGeneration/`: Chat sessions, token streaming, and message management.
- `workspace/`: Local workspace brokers, file operations, and path boundaries.
- `utils/`: HTTP boundaries, origins validation, SSRF guards, and problem details.

## Development

```bash
# Check syntax
npm run check

# Check TypeScript
npm run check:workspace

# Run free test suite
npm run test:p6:free
```
