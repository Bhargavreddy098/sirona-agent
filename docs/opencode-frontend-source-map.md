# OpenCode Frontend Source Map & Inventory

**Source Repository:** `https://github.com/anomalyco/opencode`  
**Inspected Commit SHA:** `bf544cd419c5f17535c0d5af929f7ecd41188320`  
**Commit Message:** `fix(tui): keep keymap command objects while their data is unchanged (#59294)`  
**Commit Date:** `Sat Oct 31 11:09:49 2026 +0100`  
**License:** MIT  

---

## 1. Package Inventory & Role

| OpenCode Source Path | Package Name | Framework / Tech | Target Sirona Location | Role in Sirona Desktop |
| :--- | :--- | :--- | :--- | :--- |
| `packages/ui` | `@opencode/ui` | SolidJS + Tailwind CSS v4 + Kobalte | `packages/ui` | Base component library (buttons, dialogs, tooltips, dropdowns, icons, scroll views, design tokens, typography). |
| `packages/session-ui` | `@opencode/session-ui` | SolidJS + Pierre Highlights + Trees | `packages/session-ui` | Turn presentation, markdown parsing, code blocks, diff views, and tool output cards. |
| `packages/app` | `@opencode/app` | SolidJS + `@solidjs/router` + `@tanstack/solid-query` | `apps/web` | Full web/desktop client application: Shell (titlebar, tabs, sidebar), Home screen, New Session composer, Settings, Chat timeline. |
| `packages/desktop` | `@opencode/desktop` | Electron 44 + Node.js | `apps/desktop` | Native Windows Electron wrapper, custom frameless window, titlebar IPC, local session state, and secure preload bridge. |
| `packages/client` | `@opencode/client` | TypeScript SDK | `packages/client` / `apps/web/src/api` | API client connecting the SolidJS UI to the backend HTTP & SSE event stream. |
| `packages/schema` | `@opencode/schema` | TypeBox / Zod / TypeScript | `packages/schema` | Common data structures, events, and request/response contracts. |
| `packages/util` | `@opencode/util` | TypeScript | `packages/util` | Platform utilities: path normalization, string helpers, collection utilities. |

---

## 2. Directory & Component Source Mapping

### A. Core Graphical Shell (`packages/app/src/shell`)
- [`shell.tsx`](file:///.tmp/reference-opencode/packages/app/src/shell/shell.tsx): Root layout orchestrator containing the titlebar, collapsible sidebar, notification system, and main content surface.
- [`titlebar/titlebar.tsx`](file:///.tmp/reference-opencode/packages/app/src/shell/titlebar/titlebar.tsx): Windows titlebar with custom window controls (minimize, maximize, close), navigation history, hamburger menu, and vertical/horizontal tab toggles.
- [`sidebar-toggle.tsx`](file:///.tmp/reference-opencode/packages/app/src/shell/sidebar-toggle.tsx): Collapse/expand control for the left navigation panel.
- [`commands/`](file:///.tmp/reference-opencode/packages/app/src/shell/commands/): Command palette (`Ctrl+K` / `Ctrl+Shift+P`), session search, and keybind registry.

### B. New Session & Home (`packages/app/src/new-session` & `home`)
- [`new-session/view.tsx`](file:///.tmp/reference-opencode/packages/app/src/new-session/view.tsx): The exact screen shown in the Windows reference screenshot:
  - Center blocky wordmark (`wordmark.tsx` - adapted to Sirona branding).
  - Floating Composer container (`composer/composer.tsx`) with multi-line prompt input, model selector (`Beam Free` / Sirona provider picker), context tagger (`@`), and command runner (`/`).
  - Project footer displaying working repository name, Git branch badge, and absolute path.
- [`home/route.tsx`](file:///.tmp/reference-opencode/packages/app/src/home/route.tsx): Global dashboard showing recent projects, session cards, and quick actions.

### C. Chat & Session Timeline (`packages/app/src/session`)
- [`session/view.tsx`](file:///.tmp/reference-opencode/packages/app/src/session/view.tsx): Active conversation view displaying message streams, tool executions, approval cards, and turn diffs.
- [`composer/`](file:///.tmp/reference-opencode/packages/app/src/composer/): Persistent input bar with file drag-and-drop dropzones, slash-command autocompletion, and model picker.

### D. Settings & Providers (`packages/app/src/settings` & `providers`)
- [`settings/`](file:///.tmp/reference-opencode/packages/app/src/settings/): General, Appearance (Light/Dark theme selector), Keybinds, Providers, and Notifications.
- [`providers/`](file:///.tmp/reference-opencode/packages/app/src/providers/): Model selector, provider API key configuration, and quota monitoring.

### E. Design System & Theme Engine (`packages/ui/src`)
- `styles/theme.css`: Theme variables (`--v2-background-bg-base`, `--v2-text-text-base`, `--v2-elevation-raised`).
- `styles/colors.css`: Semantic color tokens for light and dark modes.
- `icons/`: Complete SVG icon set including `magnifying-glass`, `home`, `pencil`, `plus`, `arrow-up`, `gear`, `folder`, `git-branch`.

---

## 3. SolidJS Ecosystem Dependencies

The OpenCode frontend is built on **SolidJS**, requiring:
1. `solid-js` (v1.9+)
2. `@solidjs/router` (client-side routing)
3. `@kobalte/core` (accessible UI primitives)
4. `@tanstack/solid-query` (server state management & caching)
5. `tailwindcss` (v4.3.3) & `@tailwindcss/vite`
6. `vite-plugin-solid` (Vite compilation plugin)

This maps cleanly into Sirona's pnpm monorepo structure.
