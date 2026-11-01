# React + Vite + TypeScript Frontend Conversion & UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-convert the Sirona frontend to modern React 19 + TypeScript + Vite while executing a complete UI visual overhaul (preserving 100% of the existing UX, workflows, and backend API integration) using design intelligence from `ui-ux-pro-max-skill` and `frontend-design`.

**Architecture:** The desktop web client in `apps/web` will transition from SolidJS back to the canonical Sirona React 19 architecture backed by TypeScript and Vite. It connects directly to the existing Express backend (`apps/server`) via SSE streaming and REST endpoints (`/api/v1/workspace`, `/api/v1/runs`, `/api/v1/projects`). State management is handled by Zustand and TanStack Query, accessible UI primitives by Radix UI, micro-animations by Framer Motion, and icons by Lucide React.

**Tech Stack:**
- Framework: React 19, React DOM 19, TypeScript ~5.7, Vite 6/8
- Styling: Tailwind CSS v4 (`@tailwindcss/vite`), Custom Studio Dark/Light Theme Tokens
- UI Primitives & Animation: `@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-tabs`, `@radix-ui/react-tooltip`, `framer-motion`, `clsx`, `tailwind-merge`
- Developer Tools: `lucide-react`, `@monaco-editor/react`, `monaco-editor`, `@xterm/xterm`, `@xterm/addon-fit`
- State & Network: `zustand`, `@tanstack/react-query`, `zod`

**Spec:** User request specifying complete UI redesign (retaining UX flows), converting frontend to React + TypeScript + Vite, using modern libraries, and incorporating design principles from `ui-ux-pro-max-skill` and `frontend-design`.

---

## Global Constraints

1. **UX Invariance**: Retain 100% of user experience flows: Session navigation, Prompt composer with attachment/model selection, Live streaming assistant responses, Approvals/Diffs review, Terminal drawer, and Multi-tab Settings (Providers, Models, Preferences, About).
2. **Design Quality (Anti-Slop / Studio Polish)**: Apply deep surface layering (`#0a0b0e`, `#12141a`, `#1a1d26`), crisp borders (`border-white/10`), subtle glass blur (`backdrop-blur-xl`), refined typography (Inter / IBM Plex Sans & JetBrains Mono), and purposeful accent highlights (Electric Violet `#6366f1` / Neon Emerald `#10b981`).
3. **No OpenCode Leftovers**: Zero user-facing "OpenCode" strings, window titles, or hardcoded provider labels; all user-facing copy and branding strictly use **Sirona**.
4. **Desktop Electron Compatibility**: Maintain Windows titlebar draggable region (`-webkit-app-region: drag`), frameless window controls, and port 5176 static serving by `apps/desktop/src/server.cjs`.
5. **Real Backend Integration**: Preserve existing typed API client contracts in `api/` talking to real `apps/server` endpoints without fake mock-success regressions.

---

## Review Focus

1. **Model Picker Dialog UX & Accessibility**: Ensure opening the model selector modal provides instant focus on the search input, smooth backdrop blur, keyboard arrow navigation, and clear provider grouping without clipped dropdowns.
2. **Live SSE Stream Rendering**: Ensure assistant responses, streaming markdown tokens, and code block formatting render without layout shifting or infinite re-renders during high-frequency stream events.
3. **Terminal & Monaco Editor Mounting**: Ensure `@xterm/xterm` fit addon and Monaco editor resize correctly when collapsing/expanding the sidebar and toggling the bottom deck.
4. **Theme Toggling (Dark / Light)**: Ensure all text, surface tokens, border colors, and scrollbars adapt cleanly between studio dark mode and clean light mode without illegible low-contrast text.
5. **Electron Window Frame & Dragging**: Verify that custom titlebars do not block window minimizing, maximizing, or closing, and that interactive header buttons remain clickable (`-webkit-app-region: no-drag`).

---

## Tasks

### Task 1: Package Dependencies & Vite Configuration for React 19

**Files:**
- Modify: `apps/web/package.json`
- Modify: `apps/web/vite.config.ts`
- Modify: `apps/web/tsconfig.json`
- Modify: `apps/web/index.html`

**Interfaces:**
- Consumes: Node.js 24 environment, PNPM workspace configuration
- Produces: Working React 19 + TypeScript + Vite build pipeline with zero build errors

- [ ] **Step 1: Update `apps/web/package.json` with React dependencies**
  - Add `react@^19.3.1`, `react-dom@^19.3.1`, `@types/react@^19.3.0`, `@types/react-dom@^19.3.0`
  - Add `@vitejs/plugin-react@^6.1.2`, `@tailwindcss/vite@^4.2.0`, `tailwindcss@^4.2.0`
  - Add `lucide-react@^1.65.0`, `clsx@^2.1.1`, `tailwind-merge@^3.0.2`
  - Add `@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-tabs`, `@radix-ui/react-tooltip`
  - Add `framer-motion@^12.4.7`, `@tanstack/react-query@^5.66.0`, `zustand@^5.0.3`
  - Add `@monaco-editor/react@^4.7.0`, `monaco-editor@^0.57.0`, `@xterm/xterm@6.0.0`, `@xterm/addon-fit@0.11.0`
  - Remove SolidJS specific packages (`solid-js`, `@solidjs/router`, `@kobalte/core`, etc.).

- [ ] **Step 2: Update `apps/web/vite.config.ts` for React**
  - Replace `solidPlugin()` with `@vitejs/plugin-react` (`react()`)
  - Retain `@tailwindcss/vite` plugin
  - Retain `/api/v1` and `/api` proxy configurations to `http://127.0.0.1:5176`

- [ ] **Step 3: Update `apps/web/tsconfig.json`**
  - Set `"jsx": "react-jsx"`
  - Set `"types": ["vite/client"]`

- [ ] **Step 4: Update `apps/web/index.html`**
  - Point script entry to `/src/main.tsx`
  - Ensure title is `<title>Sirona</title>` and background color matches studio dark theme `#0c0d12`

- [ ] **Step 5: Run `pnpm install` and verify dependencies resolve**
  - Run: `pnpm --filter @sirona/web install`
  - Expected: Clean resolution without peer dependency conflicts.

---

### Task 2: Design Tokens, Utilities & Studio Theme Architecture

**Files:**
- Create: `apps/web/src/lib/utils.ts`
- Modify: `apps/web/src/index.css`
- Create: `apps/web/src/types/theme.ts`

**Interfaces:**
- Consumes: Tailwind CSS v4
- Produces: `cn(...classes: ClassValue[]) -> string`, modern CSS variables for dark/light themes, typography scales, glassmorphism utilities

- [ ] **Step 1: Create `apps/web/src/lib/utils.ts`**
  - Implement `cn(...inputs: ClassValue[])` using `clsx` and `twMerge`

- [ ] **Step 2: Define studio theme design tokens in `apps/web/src/index.css`**
  - Import `@fontsource/ibm-plex-sans`, `@fontsource/ibm-plex-mono`, `@fontsource-variable/inter`
  - Configure root CSS variables for Dark Studio (default):
    - `--bg-canvas: #090a0f`
    - `--bg-surface-1: #111318`
    - `--bg-surface-2: #181b22`
    - `--bg-surface-3: #222631`
    - `--border-subtle: rgba(255, 255, 255, 0.07)`
    - `--border-active: rgba(99, 102, 241, 0.4)`
    - `--accent-primary: #6366f1` (Electric Violet)
    - `--accent-glow: rgba(99, 102, 241, 0.15)`
    - `--text-primary: #f3f4f6`
    - `--text-secondary: #9ca3af`
    - `--text-muted: #6b7280`
  - Add light mode overrides (`[data-theme="light"]`)
  - Configure custom scrollbars and backdrop blur utilities

- [ ] **Step 3: Build verification**
  - Run: `npm --prefix apps/web run build`
  - Expected: CSS compiles cleanly with Tailwind v4.

---

### Task 3: Redesigned Model Picker Dialog (Directly Addressing User Image)

**Files:**
- Create: `apps/web/src/components/ui/ModelPickerModal.tsx`
- Modify: `apps/web/src/components/ui/ModelPicker.tsx`
- Test: `scratch/test-model-picker.mjs`

**Interfaces:**
- Consumes: `models: Model[]`, `value: string`, `onChange: (id: string) => void`, `disabled?: boolean`
- Produces: Radix Dialog based modern Model Picker with instant fuzzy search, provider tags, capability chips, and smooth Framer Motion entrance

- [ ] **Step 1: Implement `ModelPickerModal.tsx` with Radix UI + Framer Motion**
  - Keyboard accessible modal with `Escape` to close, arrow keys to navigate
  - Search input with search icon, clear button, and autofocus
  - Provider grouping: Sirona Free, Anthropic, Google Gemini, OpenAI, Local / Ollama
  - Provider header showing provider name, badge (e.g. "Default", "Cloud", "Fast")
  - Item row displaying:
    - Model name (`Claude 3.5 Sonnet`, `Gemini 2.5 Pro`, `Beam Free`)
    - Context window tag (`200k`, `1M`, `128k`)
    - Checkmark icon when selected
    - Subtle hover background with smooth transition
  - Replace any "OpenCode" header with "Sirona Models" or "Sirona Free"

- [ ] **Step 2: Wire `ModelPicker` trigger button**
  - Floating pill design with Sparkles icon, current model label, chevron down
  - Glowing ring focus state matching studio theme

- [ ] **Step 3: Verify Model Picker component**
  - Run test in browser to ensure clicking trigger opens modal, typing filters list, and selecting model updates state and closes modal.

---

### Task 4: Redesigned Desktop Shell & Navigation Sidebar

**Files:**
- Create/Update: `apps/web/src/components/layout/Header.tsx`
- Create/Update: `apps/web/src/components/layout/Sidebar.tsx`
- Create/Update: `apps/web/src/app/App.tsx`
- Create/Update: `apps/web/src/main.tsx`

**Interfaces:**
- Consumes: `useWorkspace` hook, current page state (`chat` | `inbox` | `settings` | `automation`)
- Produces: Sleek desktop layout with collapsible sidebar, active indicators, workspace breadcrumbs, and window drag regions

- [ ] **Step 1: Implement `Header.tsx`**
  - Frameless Electron titlebar support with drag region
  - Sirona stylized geometric mark + title
  - Current workspace / branch pill badge with folder icon
  - Quick action buttons: Toggle Sidebar, Command Palette (`Ctrl+K`), Theme Toggle (Dark/Light)

- [ ] **Step 2: Implement `Sidebar.tsx`**
  - Vertical navigation rail with icon + label:
    - `New Session` (`Ctrl+N` / `Ctrl+K`)
    - `Chat / Sessions` (with active session count)
    - `Inbox`
    - `Automation`
    - `Settings` (`Ctrl+,`)
  - Workspace selector dropdown at bottom
  - Active tab pill with smooth Framer Motion spring layout animation
  - Collapsible mode for maximum coding canvas width

- [ ] **Step 3: Assemble `App.tsx`**
  - Wire global keyboard listeners (`Ctrl+K`, `Ctrl+,`, `Ctrl+B`, `Ctrl+` `)
  - Connect `useWorkspace` context provider
  - Toast notification banner for errors, connection alerts, and save confirmations

---

### Task 5: Redesigned Prompt Composer, Chat Workspace & Execution Deck

**Files:**
- Create/Update: `apps/web/src/features/chat/Composer.tsx`
- Create/Update: `apps/web/src/features/chat/Chat.tsx`
- Create/Update: `apps/web/src/features/chat/Message.tsx`
- Create/Update: `apps/web/src/features/chat/BottomTerminalDeck.tsx`
- Create/Update: `apps/web/src/features/editor/DiffReviewModal.tsx`

**Interfaces:**
- Consumes: Workspace sessions, SSE message streams, terminal socket
- Produces: Floating composer card, streaming response feed with syntax highlighting, diff review, and embedded terminal

- [ ] **Step 1: Implement `Composer.tsx`**
  - Centered floating composer card with subtle glass blur (`backdrop-blur-xl`)
  - Multi-line autosizing textarea with placeholder "Ask Sirona anything, / for commands, @ for files..."
  - Bottom toolbar:
    - Integrated `ModelPicker` trigger pill
    - Attach File button (`@`) with file picker dialog
    - Enhance Prompt / Reasoning toggle button
    - Send button (ArrowUp with pulse animation when generating, Enter to submit, Shift+Enter for newline)
  - Glowing border on focus (`ring-2 ring-indigo-500/30`)

- [ ] **Step 2: Implement `Message.tsx` and `Chat.tsx`**
  - User message bubble with clean typography and timestamp
  - Assistant message stream with markdown formatting (`react-markdown`, `remark-gfm`, `rehype-highlight`)
  - Syntax highlighted code blocks with "Copy Code" button and language badge
  - Collapsible "Thinking / Reasoning" accordions for chain-of-thought models
  - Tool execution pills (e.g. `Read file`, `Run command`) with live status spinners

- [ ] **Step 3: Implement `BottomTerminalDeck.tsx` and `DiffReviewModal.tsx`**
  - Collapsible bottom drawer hosting `@xterm/xterm` connected to backend PTY
  - Diff review modal displaying side-by-side or unified code diffs with "Approve" / "Reject" action buttons

---

### Task 6: Redesigned Settings Console

**Files:**
- Create/Update: `apps/web/src/features/settings/SettingsView.tsx`
- Create/Update: `apps/web/src/features/model-providers/Providers.tsx`
- Create/Update: `apps/web/src/features/model-providers/CredentialStatus.tsx`
- Create/Update: `apps/web/src/features/settings/AboutTab.tsx`

**Interfaces:**
- Consumes: Provider credentials API, Workspace settings, Platform version
- Produces: Polished tabbed settings view with instant search and credential configuration

- [ ] **Step 1: Implement `SettingsView.tsx` tab shell**
  - Left tab list with Lucide icons:
    - `Providers` (Key icon)
    - `Models` (Cpu / Sparkles icon)
    - `Appearance` (Palette icon)
    - `Shortcuts` (Keyboard icon)
    - `About` (Info icon)
  - Search bar to quickly filter settings

- [ ] **Step 2: Implement `Providers.tsx` & `CredentialStatus.tsx`**
  - Provider cards for Anthropic, OpenAI, Google Gemini, and OpenAI-Compatible
  - Secure API key input with show/hide password toggle
  - "Test Connection" button with real-time ping to backend
  - "Connected" green status badge with OS encryption indicator (`safeStorage`)

- [ ] **Step 3: Implement `AboutTab.tsx`**
  - Sirona Logo, Version `0.1.0`
  - "Sirona, local-first AI coding agent workspace"
  - Links to `www.sirona.dev` and documentation
  - System diagnostics info (Node version, Electron version, Backend status)

---

### Task 7: End-to-End Build, Integration & Browser Verification

**Files:**
- Modify: `apps/desktop/src/server.cjs` (if needed for MIME / SPA fallback)
- Create: `scratch/verify-react-redesign.mjs`
- Create: Artifact report `react-vite-ui-redesign-report.md`

**Interfaces:**
- Consumes: Built `apps/web/dist`, running backend on port 8000, running frontend static server on port 5176
- Produces: Live verified UI in Playwright with captured high-resolution screenshots

- [ ] **Step 1: Build the complete React frontend**
  - Run: `npm --prefix apps/web run build`
  - Expected: Zero TypeScript errors, zero Vite bundling warnings, exit code 0.

- [ ] **Step 2: Verify servers and routes**
  - Verify `http://127.0.0.1:5176` serves the new React application
  - Verify `/api/v1` proxies to backend on port 8000

- [ ] **Step 3: Execute Playwright verification script**
  - Test 1: Main screen loads with redesigned sidebar, floating composer, and Sirona branding.
  - Test 2: Clicking model trigger opens redesigned Model Picker Modal (matching user image context with beautiful styling and zero OpenCode references).
  - Test 3: Clicking Settings opens Settings View with active tabs and provider credentials.
  - Test 4: Capture screenshots of all three states to `docs/` and artifact directory.
