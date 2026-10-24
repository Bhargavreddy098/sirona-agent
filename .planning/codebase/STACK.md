# Technology Stack

**Analysis Date:** 2026-10-24

## Languages

**Primary:**
- TypeScript 5.7+ / JavaScript ES2023 - All desktop UI, state management, and shared contract models (`sirona-ui`, `sirona-shared`)
- Python 3.11+ / 3.12 - Agent runtime engine, async scheduling, SQLite persistence, and FastAPI server (`sirona-core`)

**Secondary:**
- PowerShell / Windows Batch - Local startup scripts (`start.ps1`, `start.bat`) and system CLI integration

## Runtime

**Environment:**
- Node.js 20.x / 22.x
- Python 3.11+ / 3.12.x Virtual Environment (`.venv`)
- Electron 40.x (Chromium 134 + Node runtime)

**Package Managers:**
- npm 10.x - `package-lock.json` present in `sirona-ui` and root
- pip / Hatchling - `pyproject.toml` in `sirona-core`

## Frameworks

**Core:**
- React 19.0 - UI components, layouts, virtual DOM rendering
- FastAPI 0.115+ - High-throughput async REST and WebSocket API gateway
- Electron 40.10+ - Secure desktop shell, window lifecycle, native context bridge

**State & Reactive Data:**
- Nanostores (`nanostores`, `@nanostores/react`) - Lightweight reactive micro-stores for high-frequency streaming events
- TanStack React Query 5.66+ - Client-side cache, query invalidation, and data synchronization

**Testing:**
- Vitest 3.0+ - Fast frontend unit and component testing (`vitest run`)
- Pytest 8.3+ with `pytest-asyncio` 0.25+ - Comprehensive async backend testing

**Build/Dev:**
- Vite 6.1+ with `@vitejs/plugin-react` and `@tailwindcss/vite`
- Electron-Builder 26.18+ - Production packaging (`win-unpacked`, NSIS installers)
- Hatchling - Python wheel/sdist packaging

## Key Dependencies

**Critical:**
- `aiosqlite` 0.20+ - Async SQLite database access with WAL mode and FTS5 full-text indexing
- `pydantic` 2.10+ & `pydantic-settings` 2.7+ - Data validation, JSON serialization, and environment configuration
- `websockets` 14.0+ - Low-latency bidirectional RPC and real-time streaming between UI and Core
- `lucide-react` 1.16+ - Consistent iconography across the desktop studio
- `clsx` & `tailwind-merge` - Dynamic Tailwind utility class resolution

**Infrastructure:**
- `uvicorn[standard]` 0.32+ - ASGI server runner
- `httpx` 0.28+ - Async HTTP client for external AI providers and remote APIs
- `psutil` 6.1+ - Process monitoring, turn execution lifecycle tracking, and memory profiling

## Configuration

**Environment:**
- Backend configuration managed via `sirona.config.Settings` (Pydantic BaseSettings)
- Local SQLite database: `~/.sirona/sirona.db` or `%APPDATA%/sirona/sirona.db`
- Host/Port: Defaulting to `127.0.0.1:8000`

**Build:**
- `sirona-ui/vite.config.ts` - Vite dev and bundling configuration
- `sirona-ui/electron-builder.json` - Desktop release configuration
- `sirona-core/pyproject.toml` - Python project dependencies and pytest configuration

## Platform Requirements

**Development:**
- Windows 10/11 x64, macOS 12+, or Linux x86_64
- Node.js 20+ and Python 3.11+ installed

**Production:**
- Packaged desktop application via `electron-builder` (`release/win-unpacked/Sirona.exe`)
- Local or headless background daemon running `sirona.cli serve`

---
*Stack analysis: 2026-10-24*
*Update after major dependency changes*
