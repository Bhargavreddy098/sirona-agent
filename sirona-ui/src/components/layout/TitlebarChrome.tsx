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
    <header className="h-11 w-full flex items-center justify-between px-3.5 bg-[#faf8f5] border-b border-[#d1d1cd] select-none text-[#27251e] z-30 font-sans">
      {/* Left Cluster: Sidebar toggle & Sirona Workspace Selector */}
      <div className="flex items-center gap-2.5">
        <Tip label="Toggle Sidebar" shortcut="Cmd+B">
          <button
            onClick={toggleSidebar}
            className={`p-1.5 rounded-[6px] transition-colors cursor-pointer ${
              sidebarOpen
                ? 'text-[#27251e] bg-[#f5f3ef]'
                : 'text-[#72706b] hover:text-[#27251e] hover:bg-[#f5f3ef]'
            }`}
          >
            <PanelLeft className="w-4 h-4" />
          </button>
        </Tip>

        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#016a71] inline-block shadow-sm" />
          <span className="text-[14px] font-medium tracking-tight text-[#27251e]">
            Sirona
          </span>
        </div>

        {/* Workspace Dropdown Button (like Hermes Desktop) */}
        <button
          onClick={toggleSettings}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[12px] bg-[#fdfbfa] hover:bg-[#ffffff] border border-[#d1d1cd] text-[#27251e] transition-colors cursor-pointer shadow-[var(--shadow-subtle)]"
          title="Switch Workspace Profile"
        >
          <span className="font-medium">Primary Workspace</span>
          <span className="text-[#92918b]">· personal -agent</span>
          <ChevronDown className="w-3 h-3 text-[#72706b]" />
        </button>
      </div>

      {/* Center: Command Palette Search Bar */}
      <div className="flex items-center justify-center max-w-sm w-full mx-4">
        <button
          onClick={toggleCommandPalette}
          className="w-full flex items-center justify-between px-3.5 py-1.5 text-[13px] text-[#72706b] bg-[#fdfbfa] hover:bg-[#ffffff] border border-[#d1d1cd] hover:border-[#92918b] rounded-[12px] transition-all shadow-[var(--shadow-subtle)] cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Command className="w-3.5 h-3.5 text-[#016a71]" />
            <span>Search or jump to...</span>
          </span>
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-[#faf8f5] text-[#72706b] rounded border border-[#d1d1cd]">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right Cluster: Starmap, Terminal, Context Pane, Settings */}
      <div className="flex items-center gap-1">
        <Tip label="Session Starmap">
          <button
            onClick={toggleStarmap}
            className="p-1.5 rounded-[6px] text-[#72706b] hover:text-[#27251e] hover:bg-[#f5f3ef] transition-colors cursor-pointer"
          >
            <GitFork className="w-4 h-4 text-[#016a71]" />
          </button>
        </Tip>

        <Tip label="Toggle Terminal Deck" shortcut="Cmd+`">
          <button
            onClick={toggleTerminalDeck}
            className={`p-1.5 rounded-[6px] transition-colors cursor-pointer ${
              terminalOpen
                ? 'text-[#016a71] bg-[#fdfbfa] shadow-[var(--shadow-subtle)]'
                : 'text-[#72706b] hover:text-[#27251e] hover:bg-[#f5f3ef]'
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
                ? 'text-[#016a71] bg-[#fdfbfa] shadow-[var(--shadow-subtle)]'
                : 'text-[#72706b] hover:text-[#27251e] hover:bg-[#f5f3ef]'
            }`}
          >
            <PanelRight className="w-4 h-4" />
          </button>
        </Tip>

        <div className="w-[1px] h-4 bg-[#d1d1cd] mx-1" />

        <Tip label="Sirona Settings">
          <button
            onClick={toggleSettings}
            className="p-1.5 rounded-[6px] text-[#72706b] hover:text-[#27251e] hover:bg-[#f5f3ef] transition-colors cursor-pointer"
          >
            <Settings className="w-4 h-4" />
          </button>
        </Tip>
      </div>
    </header>
  )
}
