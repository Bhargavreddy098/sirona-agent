import React from 'react'
import {
  PanelLeft,
  PanelRight,
  Terminal,
  Command,
  Settings,
  GitFork,
  ChevronDown,
} from 'lucide-react'
import { useStore } from '@nanostores/react'
import {
  $sidebarOpen,
  $contextPaneOpen,
  $terminalDeckOpen,
  toggleSidebar,
  toggleContextPane,
  toggleTerminalDeck,
  toggleCommandPalette,
  toggleSettings,
  toggleStarmap,
} from '../../store/layoutStore'
import { Tip } from '../ui/Tip'

export const TitlebarChrome: React.FC = () => {
  const sidebarOpen = useStore($sidebarOpen)
  const contextOpen = useStore($contextPaneOpen)
  const terminalOpen = useStore($terminalDeckOpen)

  return (
    <header className="h-10 w-full flex items-center justify-between px-3 bg-[var(--dt-background)] border-b border-[var(--dt-border)] select-none text-[var(--dt-foreground)] z-30 font-sans">
      {/* Left Cluster: Sidebar toggle & Sirona Workspace Selector */}
      <div className="flex items-center gap-2">
        <Tip label="Toggle Sidebar" shortcut="Cmd+B">
          <button
            onClick={toggleSidebar}
            className={`p-1.5 rounded-[6px] transition-colors cursor-pointer ${
              sidebarOpen
                ? 'text-[var(--dt-foreground)] bg-[var(--dt-card)]'
                : 'text-[var(--dt-muted-foreground)] hover:text-[var(--dt-foreground)] hover:bg-[var(--dt-card)]'
            }`}
          >
            <PanelLeft className="w-4 h-4" />
          </button>
        </Tip>

        <div className="flex items-center gap-2 ml-1">
          <span className="w-2 h-2 rounded-full bg-[var(--dt-primary)] inline-block shadow-sm" />
          <span className="text-[13.5px] font-semibold tracking-tight text-[var(--dt-foreground)]">
            Sirona
          </span>
        </div>

        {/* Workspace Dropdown Button (like Hermes Desktop) */}
        <button
          onClick={toggleSettings}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[12px] bg-[var(--dt-card)] hover:bg-[var(--dt-background)] border border-[var(--dt-border)] text-[var(--dt-foreground)] transition-colors cursor-pointer shadow-[var(--shadow-subtle)]"
          title="Switch Workspace Profile"
        >
          <span className="font-medium">Primary Workspace</span>
          <span className="text-[var(--dt-muted-foreground)]">· personal -agent</span>
          <ChevronDown className="w-3 h-3 text-[var(--dt-muted-foreground)]" />
        </button>
      </div>

      {/* Center: Command Palette Search Bar */}
      <div className="flex items-center justify-center max-w-sm w-full mx-4">
        <button
          onClick={toggleCommandPalette}
          className="w-full flex items-center justify-between px-3.5 py-1.5 text-[12px] text-[var(--dt-muted-foreground)] bg-[var(--dt-card)] hover:bg-[var(--dt-background)] border border-[var(--dt-border)] hover:border-[var(--dt-primary)]/50 rounded-[10px] transition-all shadow-[var(--shadow-subtle)] cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Command className="w-3.5 h-3.5 text-[var(--dt-primary)]" />
            <span>Search or jump to...</span>
          </span>
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-[var(--dt-background)] text-[var(--dt-muted-foreground)] rounded border border-[var(--dt-border)]">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right Cluster: Starmap, Terminal, Context Pane, Settings */}
      <div className="flex items-center gap-1">
        <Tip label="Session Starmap">
          <button
            onClick={toggleStarmap}
            className="p-1.5 rounded-[6px] text-[var(--dt-muted-foreground)] hover:text-[var(--dt-foreground)] hover:bg-[var(--dt-card)] transition-colors cursor-pointer"
          >
            <GitFork className="w-4 h-4 text-[var(--dt-primary)]" />
          </button>
        </Tip>

        <Tip label="Toggle Terminal Deck" shortcut="Cmd+`">
          <button
            onClick={toggleTerminalDeck}
            className={`p-1.5 rounded-[6px] transition-colors cursor-pointer ${
              terminalOpen
                ? 'text-[var(--dt-primary)] bg-[var(--dt-secondary)]'
                : 'text-[var(--dt-muted-foreground)] hover:text-[var(--dt-foreground)] hover:bg-[var(--dt-card)]'
            }`}
          >
            <Terminal className="w-4 h-4" />
          </button>
        </Tip>

        <Tip label="Toggle Right Context Pane" shortcut="Cmd+J">
          <button
            onClick={toggleContextPane}
            className={`p-1.5 rounded-[6px] transition-colors cursor-pointer ${
              contextOpen
                ? 'text-[var(--dt-primary)] bg-[var(--dt-secondary)]'
                : 'text-[var(--dt-muted-foreground)] hover:text-[var(--dt-foreground)] hover:bg-[var(--dt-card)]'
            }`}
          >
            <PanelRight className="w-4 h-4" />
          </button>
        </Tip>

        <div className="w-[1px] h-4 bg-[var(--dt-border)] mx-1" />

        <Tip label="Sirona Settings">
          <button
            onClick={toggleSettings}
            className="p-1.5 rounded-[6px] text-[var(--dt-muted-foreground)] hover:text-[var(--dt-foreground)] hover:bg-[var(--dt-card)] transition-colors cursor-pointer"
          >
            <Settings className="w-4 h-4" />
          </button>
        </Tip>
      </div>
    </header>
  )
}
