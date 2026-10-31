# Sirona Hybrid Chat-First AI Agent Workspace Redesign Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## Overview
Transform Sirona from a disjointed multi-page dashboard into a cohesive, chat-first AI agent workspace inspired by Cursor, OpenCode, ChatGPT, and Antigravity. The conversation remains the central canvas while project tools (Files, Terminal, Planning, Runs, Approvals) exist as a toggleable companion panel and contextual inline action cards. Introduces first-class **Ask**, **Plan**, and **Build** interaction modes.

---

## File Structure & Proposed Changes

1. **`frontend/sirona-next/src/app/App.tsx`**
   - Update layout structure: Chat is the core canvas.
   - Add companion view state (`companionOpen: boolean`, `companionTab: 'files' | 'terminal' | 'planning' | 'runs' | 'approvals'`).
   - Allow seamless toggle of companion view without unmounting or resetting chat conversations.

2. **`frontend/sirona-next/src/components/layout/Header.tsx`**
   - Add Mode Badge and Companion View Toggle button (`PanelRightClose` / `PanelRightOpen`).
   - Add quick status pill for attached project and pending approvals count.

3. **`frontend/sirona-next/src/features/chat/Chat.tsx`**
   - Add **Mode Selector** (`Ask` / `Plan` / `Build`) to the composer bar.
   - Add contextual shortcut chips in attached project bar to open specific companion tabs (`Files`, `Terminal`, `Approvals`).
   - Improve empty state with actionable prompts tailored to project context.

4. **`frontend/sirona-next/src/features/workspace/WorkspaceCompanion.tsx`** (New Component)
   - Houses the contextual companion panel (`Files`, `Terminal`, `Planning`, `Runs`, `Approvals`).
   - Header with tab pills, close button, and project selector if multiple projects exist.
   - Responsive: side-by-side flex panel on desktop ($\ge 1024\text{px}$), slide-over sheet on smaller screens.

5. **`frontend/sirona-next/src/features/chat/Message.tsx`**
   - Add inline detection for workspace references (e.g., plan summaries, terminal output, file changes) with quick "Inspect in Companion" action buttons.
   - Refined typography and code styling.

6. **`frontend/sirona-next/src/styles/app.css`**
   - Add companion drawer transitions, mode badge styling, and responsive layout classes.

---

## Tasks & Execution Steps

### Task 1: Create the Workspace Companion Component
- [ ] Create `frontend/sirona-next/src/features/workspace/WorkspaceCompanion.tsx`.
- [ ] Encapsulate `Files`, `Terminal`, `Planning`, `Runs`, and `Approvals` into a tabbed companion layout with a clean header, tab switcher, and close button.
- [ ] Ensure terminal and background operations do not lose state when tabs switch.

### Task 2: Implement Ask / Plan / Build Interaction Modes in Chat
- [ ] Add `mode: 'ask' | 'plan' | 'build'` state in `Chat.tsx` (persisted per session or defaulted to 'ask'/'build').
- [ ] Add mode selector pill bar in the composer with visual icons and tooltips.
- [ ] Format prompt or system context according to active mode (`Ask` = conversational explanation; `Plan` = structured architecture plan; `Build` = concrete execution with tools).

### Task 3: Unify Chat and Companion in `App.tsx` and `Header.tsx`
- [ ] Update `App.tsx` to mount Chat and Companion side-by-side or as an overlay.
- [ ] Update `Header.tsx` to include companion toggle button (`PanelRightOpen` / `PanelRightClose`) and pending approvals indicator.
- [ ] Enable opening specific companion tabs directly from `Chat.tsx` (e.g. clicking "Open Terminal" or "View Files").

### Task 4: Polish Styles, Empty States, and Responsive Microinteractions
- [ ] Refine `Chat.tsx` empty states with starter prompts ("Explore project structure", "Create feature implementation plan", "Run test suite").
- [ ] Update `app.css` with smooth 150ms transitions and responsive styling for the companion view.
- [ ] Verify keyboard navigation and accessibility.

### Task 5: Build Verification & Regression Testing
- [ ] Run `npm --prefix frontend/sirona-next run build` (`tsc -b && vite build`).
- [ ] Run `npm --prefix frontend/sirona-next test` (SSE tests).
- [ ] Run `oxlint src` in frontend.
- [ ] Run backend checks to guarantee zero regressions.
