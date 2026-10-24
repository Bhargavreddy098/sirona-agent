import React, { useState, useEffect } from 'react'
import {
  Search,
  Plus,
  Terminal,
  GitCompare,
  FolderTree,
  Settings,
  Sparkles,
  X,
  MessageSquare,
} from 'lucide-react'
import { useStore } from '@nanostores/react'
import {
  $commandPaletteOpen,
  toggleCommandPalette,
  toggleTerminalDeck,
  setActiveContextTab,
  toggleSettings,
} from '../../store/layoutStore'
import { $sessions, createNewSession, openSessionInTab } from '../../store/sessionStore'

export const CommandPalette: React.FC = () => {
  const isOpen = useStore($commandPaletteOpen)
  const sessions = useStore($sessions)
  const [query, setQuery] = useState('')

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        toggleCommandPalette()
      } else if (e.key === 'Escape' && isOpen) {
        e.preventDefault()
        toggleCommandPalette()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  if (!isOpen) return null

  const actions = [
    {
      id: 'new-chat',
      title: 'New Chat Session',
      icon: <Plus className="w-4 h-4 text-[#016a71]" />,
      category: 'Actions',
      run: () => {
        createNewSession()
        toggleCommandPalette()
      },
    },
    {
      id: 'terminal',
      title: 'Toggle Terminal Deck',
      icon: <Terminal className="w-4 h-4 text-[#016a71]" />,
      category: 'Views',
      run: () => {
        toggleTerminalDeck()
        toggleCommandPalette()
      },
    },
    {
      id: 'diffs',
      title: 'Review Git Working Tree Diffs',
      icon: <GitCompare className="w-4 h-4 text-[#016a71]" />,
      category: 'Views',
      run: () => {
        setActiveContextTab('review')
        toggleCommandPalette()
      },
    },
    {
      id: 'files',
      title: 'Browse Project Files Explorer',
      icon: <FolderTree className="w-4 h-4 text-[#016a71]" />,
      category: 'Views',
      run: () => {
        setActiveContextTab('files')
        toggleCommandPalette()
      },
    },
    {
      id: 'settings',
      title: 'Open Settings & Model Providers',
      icon: <Settings className="w-4 h-4 text-[#016a71]" />,
      category: 'Settings',
      run: () => {
        toggleSettings()
        toggleCommandPalette()
      },
    },
    {
      id: 'model-gemini',
      title: 'Set Model: Gemini 2.5 Flash',
      icon: <Sparkles className="w-4 h-4 text-[#016a71]" />,
      category: 'Models',
      run: () => {
        toggleCommandPalette()
      },
    },
    {
      id: 'model-claude',
      title: 'Set Model: Claude 3.5 Sonnet',
      icon: <Sparkles className="w-4 h-4 text-[#016a71]" />,
      category: 'Models',
      run: () => {
        toggleCommandPalette()
      },
    },
  ]

  const sessionMatches = sessions.filter((s) =>
    s.title.toLowerCase().includes(query.toLowerCase())
  )

  const actionMatches = actions.filter((a) =>
    a.title.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="fixed inset-0 z-[220] bg-black/40 backdrop-blur-xs flex items-start justify-center pt-20 px-4 animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-[#fdfbfa] border border-[#d1d1cd] rounded-[16px] shadow-[var(--shadow-subtle)] overflow-hidden flex flex-col font-sans select-none">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-[#d1d1cd] bg-[#ffffff]">
          <Search className="w-4 h-4 text-[#72706b] mr-3 shrink-0" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search sessions..."
            className="flex-1 bg-transparent text-[15px] text-[#27251e] placeholder:text-[#72706b] outline-none font-normal"
          />
          <button
            onClick={toggleCommandPalette}
            className="p-1 text-[#72706b] hover:text-[#27251e] rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 flex flex-col gap-1">
          {sessionMatches.length > 0 && (
            <div className="mb-2">
              <div className="px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-[#72706b]">
                Sessions
              </div>
              {sessionMatches.map((s) => (
                <div
                  key={s.id}
                  onClick={() => {
                    openSessionInTab(s.id)
                    toggleCommandPalette()
                  }}
                  className="flex items-center justify-between px-3 py-2 rounded-[8px] hover:bg-[#f5f3ef] cursor-pointer text-[13px] text-[#27251e] transition-colors"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <MessageSquare className="w-4 h-4 text-[#016a71] shrink-0" />
                    <span className="truncate">{s.title || 'Untitled Session'}</span>
                  </div>
                  <span className="text-[11px] text-[#92918b] font-mono">{s.model}</span>
                </div>
              ))}
            </div>
          )}

          {actionMatches.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-[#72706b]">
                Commands
              </div>
              {actionMatches.map((a) => (
                <div
                  key={a.id}
                  onClick={a.run}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-[8px] hover:bg-[#f5f3ef] cursor-pointer text-[13px] text-[#27251e] transition-colors"
                >
                  {a.icon}
                  <span className="flex-1">{a.title}</span>
                  <span className="text-[10px] text-[#92918b] uppercase tracking-wider font-mono">
                    {a.category}
                  </span>
                </div>
              ))}
            </div>
          )}

          {sessionMatches.length === 0 && actionMatches.length === 0 && (
            <div className="py-8 text-center text-[13px] text-[#72706b]">
              No commands or sessions match "{query}"
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-[#faf8f5] border-t border-[#d1d1cd] flex items-center justify-between text-[11px] text-[#72706b]">
          <span>Navigate with arrows, Enter to select</span>
          <kbd className="px-1.5 py-0.5 rounded bg-[#fdfbfa] border border-[#d1d1cd] font-mono text-[10px]">
            ESC to close
          </kbd>
        </div>
      </div>
    </div>
  )
}
