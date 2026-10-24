# External Integrations

**Analysis Date:** 2026-10-24

## AI & LLM Providers

**Google Gemini:**
- Purpose: High-speed reasoning, multimodal analysis, and large-context turn processing
- SDK/Client: `google-genai` (v1.0+)
- Authentication: `GEMINI_API_KEY` environment variable or UI settings store
- Supported Models: `gemini-2.5-pro`, `gemini-2.5-flash`, `gemini-2.0-flash-thinking`

**Anthropic Claude:**
- Purpose: Complex software architecture, refactoring, and deep agentic coding
- SDK/Client: `anthropic` (v0.40+)
- Authentication: `ANTHROPIC_API_KEY` environment variable or UI settings store
- Supported Models: `claude-3-7-sonnet-20250219` (with extended thinking), `claude-3-5-sonnet`

**OpenAI & Compatible Endpoints:**
- Purpose: General coding, structured outputs, and local open-source inference
- SDK/Client: `openai` (v1.58+)
- Authentication: `OPENAI_API_KEY` environment variable or local Ollama endpoint (`http://localhost:11434/v1`)
- Supported Models: `gpt-4o`, `o3-mini`, `deepseek-r1`, `qwen2.5-coder`

## Data Storage & Local Persistence

**SQLite Local Database:**
- Engine: SQLite 3 accessed via `aiosqlite`
- Connection: Local disk path (`~/.sirona/sirona.db`)
- Performance Modes:
  - `PRAGMA journal_mode=WAL` (Write-Ahead Logging for concurrent non-blocking reads during writes)
  - `PRAGMA synchronous=NORMAL`
  - `PRAGMA foreign_keys=ON`
- Full-Text Search: FTS5 virtual tables (`messages_fts`) with unicode61 tokenizer and `snippet()` extraction for sub-millisecond search across large conversation corpora

## Protocols & Inter-Process Communication

**WebSocket Gateway (JSON-RPC):**
- Purpose: High-frequency real-time bidirectional communication between Desktop UI and Core Engine
- Protocol: JSON-RPC 2.0 over standard WebSocket (`ws://127.0.0.1:8000/ws`)
- Handlers: `session.*`, `turn.*`, `tools.*`, `search.*`

**Electron Native IPC:**
- Purpose: Secure desktop window controls, file dialogs, and native OS shell integration
- Architecture: `contextBridge.exposeInMainWorld("sironaDesktop", ...)` in `electron/preload.cjs` with strict `contextIsolation: true` and `nodeIntegration: false`

**Model Context Protocol (MCP):**
- Purpose: Interoperability with external tool providers, database inspectors, and third-party MCP servers
- Architecture: Pluggable MCP client in `sirona.mcp` conforming to the official Model Context Protocol specification

## Operating System & Execution Environment

**Terminal & Subprocess Engine:**
- Windows: PowerShell (`powershell.exe`) and Command Prompt (`cmd.exe`)
- Unix / macOS: `bash` / `zsh`
- Execution Hooks: Non-blocking async process spawning with stdout/stderr streaming buffers and configurable execution timeouts

---
*Integrations analysis: 2026-10-24*
*Update after adding new external providers or transport layers*
