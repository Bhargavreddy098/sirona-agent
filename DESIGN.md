---
name: Sirona
description: High-performance autonomous developer agent and desktop studio
colors:
  primary: "#1f2328"
  primary-foreground: "#ffffff"
  neutral-bg: "#ffffff"
  neutral-fg: "#1f2328"
  surface-card: "#f6f8fa"
  surface-card-fg: "#1f2328"
  surface-muted: "#656d76"
  surface-border: "#d0d7de"
  accent-bubble: "#f6f8fa"
  accent-bubble-border: "#d0d7de"
  status-danger: "#cf222e"
  status-success: "#1a7f37"
  status-warning: "#9a6700"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.25
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.3
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "13.5px"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "13.5px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "0.02em"
rounded:
  xs: "3px"
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "14px"
  composer: "18px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    padding: "6px 12px"
  button-secondary:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.neutral-fg}"
    rounded: "{rounded.md}"
    padding: "6px 12px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.surface-muted}"
    rounded: "{rounded.md}"
    padding: "6px 12px"
  card:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.neutral-fg}"
    rounded: "{rounded.xl}"
    padding: "16px"
  input-search:
    backgroundColor: "{colors.neutral-bg}"
    textColor: "{colors.neutral-fg}"
    rounded: "{rounded.md}"
    padding: "6px 12px"
---

# Design System: Sirona

## Overview

**Creative North Star: "The Lucid Cockpit"**

Sirona is an autonomous developer agent desktop studio designed around the feeling of a quiet, hyper-focused, unhurried instrument cockpit. Where conventional developer tools overwhelm users with dense terminal logs, erratic font weights, and chaotic layouts, Sirona brings absolute visual clarity: complex agentic workflows—such as multi-turn reasoning chains, tool execution loops, and git diff trees—are structured into legible, transparent visual controls.

The interface prioritizes high-contrast typography, ample tranquil negative space, and disciplined layout rhythm. Built for non-technical power users as well as experienced engineers, the system translates low-level system events into plain-language summaries and intuitive visual affordances.

**Key Characteristics:**
- **Chromatic Rarity**: A stark, intentional monochrome foundation where color is never decorative and is strictly reserved for operational status and safety gates.
- **Layered Ambient Depth**: Elevation achieved through 0.5–1px hairline borders and multi-layer downward ambient diffusion rather than harsh heavy dropshadows.
- **Frosted Glass Focal Point**: A floating, translucent composer pinned to the viewport bottom that commands attention while letting chat history drift cleanly underneath.
- **Precision Squircles**: A unified radius hierarchy ranging from 6px badges to 18px composer shells.
- **Zero-Flicker Streaming**: Smooth Nanostores reactivity rendering tokens and reasoning deltas without jarring layout shifts.

## Colors

The palette is built upon a high-contrast Monochrome Stark philosophy: crisp neutral paper, dense graphite text, and surgical hairline borders. Chromatic color is treated as an urgent signal, not surface ornament.

### Primary
- **Stark Ink** (`#1f2328` in Light, `#e6edf3` in Dark): The authoritative anchor for body text, primary action buttons, active tab indicators, and high-emphasis labels.
- **Pure Canvas** (`#ffffff` in Light, `#0d1117` in Dark): The base window background providing an unblemished, distraction-free reading surface.

### Neutral & Surfaces
- **Muted Mist** (`#f6f8fa` in Light, `#010409` in Dark): Card backgrounds, sidebar containers, secondary action buttons, and user bubble fills.
- **Hairline Stroke** (`#d0d7de` in Light, `#30363d` in Dark): 1px structural dividing lines, panel separations, and container outlines.
- **Graphite Muted** (`#656d76` in Light, `#7d8590` in Dark): Secondary timestamps, shortcut hints, placeholder text, and inactive metadata.

### Status Accents (Signal Only)
- **Destructive Crimson** (`#cf222e` in Light, `#f85149` in Dark): High-risk action approvals, error alerts, failed tool executions, and turn termination buttons.
- **Verified Emerald** (`#1a7f37` in Light, `#2ea043` in Dark): Local gateway connected heartbeat beacon, successful tool executions, and green git diff insertions.
- **Caution Amber** (`#9a6700` in Light, `#d29922` in Dark): Rate-limiting backoff notices, modified file badges, and pending permission requests.

### Named Rules
**The Chromatic Rarity Rule.** Color is never decorative. Chromatic hues appear on ≤3% of any viewport, strictly signaling operational state (danger, success, connection heartbeat). Everything else lives in stark monochrome.

**The Contrast Floor Rule.** All text elements must achieve a minimum 4.5:1 contrast ratio against their immediate background; secondary metadata must not drop below 3.5:1.

## Typography

Sirona utilizes the native OS system font stack for all user interface prose, paired with a modern monospace font for code, tokens, and technical telemetry.

**Display & Body Font:** `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`  
**Monospace Font:** `"JetBrains Mono", "Cascadia Code", "SF Mono", Consolas, monospace`  

**Character:** Crisp, clean, authoritative system sans-serif delivering native desktop feel and instant legibility across high-DPI displays.

### Hierarchy
- **Display** (Semi-bold 600, 20px, line-height 1.25): Modal titles, setup greetings, and primary dialog headers.
- **Headline** (Semi-bold 600, 16px, line-height 1.3): Major panel titles, settings category headers, and drawer titles.
- **Title** (Semi-bold 600, 13.5px, line-height 1.4): Active session headers, approval prompt titles, and card headers.
- **Body** (Regular 400, 13.5px, line-height 1.55): Chat messages, assistant prose, descriptions, and tool explanations. Maximum line length: 75ch.
- **Label / Caption** (Medium 500, 11px, letter-spacing 0.02em, line-height 1.3): Timestamps, keyboard shortcut badges, category pills, and telemetry metrics.

### Named Rules
**The Monospace Legibility Rule.** Code blocks, token counts, file paths, tool names, execution durations, and timestamps must always render in monospace with explicit tabular numbers (`font-variant-numeric: tabular-nums`).

## Layout

The desktop studio is structured around a multi-tier horizontal split layout with fixed operational rails and a centered, readable canvas.

### Spatial Model & Window Architecture
- **Titlebar Chrome** (Height: 40px): Frameless native window header hosting window controls, sidebar toggle (`Cmd+B`), Sirona status indicator, workspace switcher dropdown, and the centered ⌘K search bar.
- **Workspace Rail** (Width: 48px): Vertical icon rail displaying active workspace squircles (32x32px), new workspace button, and gateway connection status beacon.
- **Sessions Rail** (Width: 256px / 16rem, Collapsible): Search filter field, "New Session" button, collapsible pinned sessions, recent session history grouped by timestamp, and session action menus.
- **Main Canvas** (Flexible Width, Min: 480px): Top session tabs bar, vertically scrolling message transcript, and the bottom floating composer.
- **Context Split Pane** (Width: 320px–480px, Resizable & Collapsible): Tabbed panel providing workspace File Explorer, Diff Review, Terminal Deck, and Live Artifact Preview.

### Density & Margins
- **Transcript Canvas Constraint**: The chat transcript and floating composer are centered and locked to a maximum width of `800px` (`max-w-[800px]`), preventing excessive line lengths and eye fatigue on ultra-wide desktop monitors.
- **Base Grid**: 4px base increment (`4px`, `8px`, `12px`, `16px`, `24px`, `32px`).

### Named Rules
**The Centered Focus Rule.** The primary conversation thread and composer must always stay centered within the available main canvas with an 800px maximum constraint, while side rails dock flush to the window perimeters.

## Elevation & Depth

Sirona avoids harsh, opaque drop shadows. Depth is conveyed through tonal surface layering, 1px hairlines, and soft multi-stop ambient light diffusion.

### Shadow Vocabulary
- **Subtle Surface** (`box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05)`): Applied to resting cards, buttons, and input fields.
- **Floating Ambient (Nous Falloff)** (`box-shadow: 0 2px 4px -2px rgba(0,0,0,0.07), 0 8px 12px -6px rgba(0,0,0,0.06), 0 20px 28px -14px rgba(0,0,0,0.06), 0 36px 48px -28px rgba(0,0,0,0.04)`): Multi-stop downward diffusion for floating cards and menus.
- **Frosted Composer Glass** (`box-shadow: 0 0 0 1px rgba(31, 35, 40, 0.08), 0 8px 24px -4px rgba(0, 0, 0, 0.06), 0 16px 32px -8px rgba(0, 0, 0, 0.08)`): Elevated composer surface featuring `backdrop-filter: blur(12px)`.
- **Modal Overlay** (`box-shadow: 0 24px 48px -12px rgba(0, 0, 0, 0.25)`): Applied to ⌘K Command Palette and Settings modals above a 40% darkened backdrop.

### Named Rules
**The Ambient Separation Rule.** Surfaces separate from the background primarily through a 1px hairline border (`var(--dt-border)`) reinforced by soft ambient falloff. Heavy 3D bevels, colored drop shadows, and high-opacity borders are strictly prohibited.

## Shapes

Forms are characterized by smooth squircles and proportioned corner radii that soften technical interfaces without feeling playful.

### Radius Scale
- **`3px` (`--radius-xs`)**: Inline code spans, micro badges, and fine border indicators.
- **`6px` (`--radius-sm`)**: Tool status badges, DirectiveChips, and titlebar icon buttons.
- **`8px` (`--radius-md`)**: Standard action buttons, command palette item rows, dropdown menus, and search fields.
- **`10px` (`--radius-workspace`)**: Workspace squircles and Titlebar workspace selector.
- **`12px` (`--radius-lg`)**: Action approval cards, text inputs, and secondary panels.
- **`14px` (`--radius-xl`)**: Tool execution accordions, artifact cards, and modal containers.
- **`18px` (`--radius-composer`)**: Floating frosted composer shell.
- **`9999px` (`--radius-full`)**: Pill status tags, avatar icons, and scrollbar thumbs.

### Named Rules
**The Radius Hierarchy Rule.** Interactive inner controls must have a smaller radius than their containing parent card (e.g., an 8px button sits inside a 14px card, never vice versa).

## Components

### Buttons
- **Shape**: 8px radius (`rounded-[8px]`).
- **Primary**: Solid Stark Ink background (`bg-[var(--dt-primary)]`), white text (`text-white`), padding `6px 12px`, subtle hover brightness (`hover:brightness-110`).
- **Secondary**: Muted Mist background (`bg-[var(--dt-card)]`), 1px border (`border-[var(--dt-border)]`), ink text, hover canvas tint.
- **Ghost**: Transparent background, muted text (`text-[var(--dt-muted-foreground)]`), hover background (`hover:bg-[var(--dt-card)]`), ink text.
- **Danger**: Destructive crimson background (`bg-[var(--dt-destructive)]`), white text, used strictly for termination or denial actions.

### Composer (Signature Component)
- **Style**: Floating frosted glass shell (`composer-glass-surface`) pinned to the bottom of the transcript. Padded with `12px` internally, `18px` squircle corners, translucent background (`color-mix(in srgb, var(--dt-background) 92%, transparent)`), `backdrop-filter: blur(12px)`.
- **Focus Ring**: `focus-within:border-[var(--dt-primary)] focus-within:ring-2 focus-within:ring-[var(--dt-primary)]/15`.
- **Accessory Bar**: Lower row hosting model selector badge, reasoning effort pill (`low | medium | high`), token budget indicator, and send/stop button.
- **Slash Popover**: Floating autocomplete card positioned directly above the input with keyboard arrow navigation (`Tab` or `Enter` to select).

### Chat Messages
- **User Bubble**: Right-aligned, max width `672px` (`max-w-2xl`), padded `10px 16px`, rounded `16px` (`rounded-2xl`), background `var(--dt-user-bubble)`, subtle border `var(--dt-user-bubble-border)`.
- **Assistant Message**: Left-aligned, full readable width, markdown formatted, accompanied by collapsible reasoning accordion ("Thought for X seconds" with brain icon and word counter), and one-click copy button.

### Tool Execution Cards
- **Container**: 14px rounded card (`rounded-[14px]`), muted background (`bg-[var(--dt-card)]`), 1px border.
- **Header**: Icon corresponding to tool type (Terminal, FileCode, Globe, GitBranch), tool name in monospace, running elapsed ticker (`RunTicker`), and collapse chevron.
- **Details Drawer**: Collapsible section displaying JSON arguments and formatted execution output with scrollable monospace blocks.

### Action Approval CardStack (Signature Component)
- **Position**: Floating fixed modal docked at `bottom-28`, centered horizontally, `z-index: 140`.
- **Stacking Physics**: Top card rendered with full contrast and interactivity (width: `480px`, radius: `12px`). Background pending cards rendered with `scale(0.96)`, `-top-2` offset, and 70% opacity.
- **Keyboard Affordance**: Always binds `Enter` to Approve and `Escape` to Deny with clear visual keycap hints.

### Command Palette (⌘K)
- **Container**: Centered floating modal, width `580px`, radius `14px`, 1px border, backdrop blur overlay.
- **Search Bar**: Autofocused text input with search icon, clear button, and category filters.
- **Results List**: Categorized list (Messages & FTS, Slash Commands, Navigation, Settings), highlighting matching tokens with arrow key selection and `Enter` execution.

## Do's and Don'ts

### Do:
- **Do** wrap every code snippet, file path, command, and timestamp in monospace typography.
- **Do** provide an explicit plain-language summary before displaying tool execution results or code diffs.
- **Do** confine transcript and composer widths to `800px` to maintain optimal line-length legibility.
- **Do** preserve 1px hairline borders (`var(--dt-border)`) between panels and split panes.
- **Do** bind clear keyboard shortcuts (`Enter`, `Esc`, `⌘K`, `⌘B`) to all modals and approval dialogs.
- **Do** respect system reduced-motion preferences (`prefers-reduced-motion`) by collapsing animations to 0.01ms.

### Don't:
- **Don't** use colored backgrounds for message containers or cards; keep surfaces in pure paper or muted mist.
- **Don't** apply bright chromatic accent colors (blues, greens, purples) to non-status UI elements.
- **Don't** use heavy, opaque drop shadows or thick 2px borders.
- **Don't** display raw JSON dumps or terminal exceptions to users without an accompanying friendly explanation.
- **Don't** auto-scroll the conversation transcript when the user has scrolled up to inspect history.
- **Don't** allow long message lines to stretch across the full width of wide displays.
