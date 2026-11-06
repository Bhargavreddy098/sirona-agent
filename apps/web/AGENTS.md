# Web Frontend Guide (`apps/web`)

`apps/web` is Sirona's user interface. Built with Vite, React 19, TypeScript, and TailwindCSS, it provides the interactive coding workspace, chat canvas, model selector, settings screen, and sidebar.

---

## 1. Responsibilities & Ownership Boundaries

- **Owns**:
  - React application components (`src/components/`): `Sidebar.tsx`, `MainCanvas.tsx`, `ModelSelectorModal.tsx`, `SettingsScreen.tsx`, `Titlebar.tsx`.
  - Frontend typed API client (`src/api/sironaClient.ts`) and React state hooks (`src/api/useSirona.ts`).
  - Application entry point (`src/entry.tsx`, `src/app.tsx`, `src/index.css`).
  - Client-side token streaming listeners and UI feedback.
- **Does Not Own**:
  - Node.js filesystem operations, child process execution, or server logic (owned by `apps/server`).
  - Native OS dialogs or DPAPI encryption (delegated to `apps/desktop` via `window.sironaDesktop`).

---

## 2. Directory Structure

```
apps/web/
├── src/
│   ├── app.tsx              # Root React component (view routing, active state)
│   ├── entry.tsx            # DOM root mounting
│   ├── index.css            # Tailwind & CSS styling
│   ├── api/
│   │   ├── sironaClient.ts  # Typed HTTP / SSE API client connecting to /api/v1
│   │   └── useSirona.ts     # Primary React hook for models, connections, chat turns
│   └── components/
│       ├── Sidebar.tsx             # Folder selector, session history, settings trigger
│       ├── MainCanvas.tsx          # Chat timeline, token streaming, tool call feedback
│       ├── ModelSelectorModal.tsx  # Dynamic model picker grouped by provider
│       ├── SettingsScreen.tsx      # Provider configuration & custom base URL settings
│       ├── Titlebar.tsx            # Electron frameless window controls
│       └── Icons.tsx               # UI icons
├── public/                  # Static assets and icons
└── package.json
```

---

## 3. Relevant Canonical Technical Documentation

- **Frontend Canvas & UI**: [`docs/features/frontend-canvas-and-ui/SPEC.md`](../../docs/features/frontend-canvas-and-ui/SPEC.md)
- **Model Gateway & Routing**: [`docs/features/model-providers-and-gateway/SPEC.md`](../../docs/features/model-providers-and-gateway/SPEC.md) & [`docs/reference/providers/routing.md`](../../docs/reference/providers/routing.md)
- **Agent Runtime & Loop**: [`docs/features/agent-runtime-and-loop/SPEC.md`](../../docs/features/agent-runtime-and-loop/SPEC.md)
- **Workspace Filesystem**: [`docs/features/workspace-and-filesystem/SPEC.md`](../../docs/features/workspace-and-filesystem/SPEC.md)

---

## 4. Frontend Engineering Rules

1. **No Fake Fallbacks / Mock Data**: Do not render dummy lists or simulated responses when the backend is offline. UI components must truthfully reflect network and backend state (loading, error, empty).
2. **Streaming Turn Consumption**: Always use `sironaClient.executeTurnStream()` for prompt submission. Listen to chunk events (`type: "token"`) and update React state progressively.
3. **Desktop Bridge Access**: Access desktop capabilities only through `window.sironaDesktop` (e.g. `pickFolder()`, `saveConnection()`), with proper graceful degradation when running in standalone browser mode.
4. **Preserve Visual Theme**: Respect Sirona's compact light/dark palette and layout. Do not perform broad cosmetic overhauls without explicit instruction.

---

## 5. Build & Verification Commands

```bash
# Typecheck web app
npm --prefix apps/web run check

# Build production bundle
npm --prefix apps/web run build

# Start dev server on http://127.0.0.1:5178
npm --prefix apps/web run dev
```
