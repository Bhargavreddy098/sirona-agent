import React, { useEffect, useRef } from 'react'
import {
  Search,
  X,
  Slash,
  MessageSquare,
  FileCode,
  GitBranch,
  Layout,
  Settings,
  Sparkles,
  CornerDownLeft,
} from 'lucide-react'
import { useStore } from '@nanostores/react'
import { $commandPaletteOpen, toggleCommandPalette } from '../../store/layoutStore'
import {
  $paletteQuery,
  $selectedIndex,
  $filteredItems,
  setPaletteQuery,
  selectNext,
  selectPrev,
  executeSelected,
  type PaletteItem,
} from '../../store/commandStore'

function renderItemIcon(type: PaletteItem['iconType']) {
  switch (type) {
    case 'slash':
      return <Slash className="w-4 h-4 text-[var(--dt-primary)] shrink-0" />
    case 'session':
      return <MessageSquare className="w-4 h-4 text-[var(--dt-primary)] shrink-0" />
    case 'file':
      return <FileCode className="w-4 h-4 text-[var(--dt-warning)] shrink-0" />
    case 'git':
      return <GitBranch className="w-4 h-4 text-[#10b981] shrink-0" />
    case 'view':
      return <Layout className="w-4 h-4 text-[var(--dt-primary)] shrink-0" />
    case 'settings':
      return <Settings className="w-4 h-4 text-[var(--dt-muted-foreground)] shrink-0" />
    case 'sparkle':
      return <Sparkles className="w-4 h-4 text-[var(--dt-primary)] shrink-0" />
    default:
      return <Search className="w-4 h-4 text-[var(--dt-muted-foreground)] shrink-0" />
  }
}

export const CommandPalette: React.FC = () => {
  const isOpen = useStore($commandPaletteOpen)
  const query = useStore($paletteQuery)
  const selectedIndex = useStore($selectedIndex)
  const items = useStore($filteredItems)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Focus on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Global shortcut: ⌘K or Ctrl+K to toggle, Esc to close
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

  // Keyboard navigation within the palette
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || (e.ctrlKey && e.key === 'n')) {
      e.preventDefault()
      selectNext()
    } else if (e.key === 'ArrowUp' || (e.ctrlKey && e.key === 'p')) {
      e.preventDefault()
      selectPrev()
    } else if (e.key === 'Enter') {
      e.preventDefault()
      executeSelected()
    } else if (e.key === 'Tab') {
      e.preventDefault()
      const activeItem = items[selectedIndex]
      if (activeItem && activeItem.title.startsWith('/')) {
        setPaletteQuery(activeItem.title + ' ')
      }
    }
  }

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return
    const activeEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`)
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  if (!isOpen) return null

  // Group items by category
  const categories = Array.from(new Set(items.map((i) => i.category)))

  return (
    <div
      className="fixed inset-0 z-[220] bg-black/50 backdrop-blur-xs flex items-start justify-center pt-24 px-4 animate-in fade-in duration-150 font-sans select-none"
      onClick={toggleCommandPalette}
    >
      <div
        className="w-full max-w-xl bg-[var(--dt-card)] border border-[var(--dt-border)] rounded-[16px] shadow-2xl overflow-hidden flex flex-col select-text text-[var(--dt-foreground)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-[var(--dt-border)] bg-[var(--dt-card)]">
          <Search className="w-4 h-4 text-[var(--dt-muted-foreground)] mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setPaletteQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Type a command (/goal, /terminal), search files, or jump to session..."
            className="flex-1 bg-transparent text-[14px] text-[var(--dt-foreground)] placeholder:text-[var(--dt-muted-foreground)] outline-none font-normal"
          />
          {query && (
            <button
              onClick={() => setPaletteQuery('')}
              className="p-1 text-[var(--dt-muted-foreground)] hover:text-[var(--dt-foreground)] rounded transition-colors mr-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd className="px-1.5 py-0.5 rounded bg-[var(--dt-sidebar)] border border-[var(--dt-border)] font-mono text-[10px] text-[var(--dt-muted-foreground)]">
            ESC
          </kbd>
        </div>

        {/* Quick Filter Pill Chips */}
        <div className="px-3 py-1.5 border-b border-[var(--dt-border)] bg-[var(--dt-card-subtle)] flex items-center gap-1.5 overflow-x-auto text-[11px]">
          <button
            onClick={() => setPaletteQuery('')}
            className={`px-2 py-0.5 rounded-full cursor-pointer transition-colors ${
              !query ? 'bg-[var(--dt-primary)] text-white font-medium' : 'text-[var(--dt-muted-foreground)] hover:text-[var(--dt-foreground)]'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setPaletteQuery('/')}
            className={`px-2 py-0.5 rounded-full cursor-pointer transition-colors ${
              query === '/' ? 'bg-[var(--dt-primary)] text-white font-medium' : 'text-[var(--dt-muted-foreground)] hover:text-[var(--dt-foreground)]'
            }`}
          >
            Slash Commands (/)
          </button>
          <button
            onClick={() => setPaletteQuery('git')}
            className={`px-2 py-0.5 rounded-full cursor-pointer transition-colors ${
              query.toLowerCase() === 'git' ? 'bg-[var(--dt-primary)] text-white font-medium' : 'text-[var(--dt-muted-foreground)] hover:text-[var(--dt-foreground)]'
            }`}
          >
            Git
          </button>
        </div>

        {/* Results List */}
        <div ref={listRef} className="max-h-96 overflow-y-auto p-2 flex flex-col gap-1 bg-[var(--dt-card)]">
          {items.length > 0 ? (
            categories.map((cat) => {
              const catItems = items.filter((i) => i.category === cat)
              return (
                <div key={cat} className="mb-2">
                  <div className="px-3 py-1 text-[10.5px] font-semibold uppercase tracking-wider text-[var(--dt-muted-foreground)]">
                    {cat}
                  </div>
                  {catItems.map((item) => {
                    const globalIdx = items.indexOf(item)
                    const isSelected = globalIdx === selectedIndex

                    return (
                      <div
                        key={item.id}
                        data-index={globalIdx}
                        onClick={() => item.action()}
                        className={`flex items-center justify-between px-3 py-2 rounded-[8px] cursor-pointer text-[12.5px] transition-all ${
                          isSelected
                            ? 'bg-[var(--dt-sidebar-accent)] text-[var(--dt-foreground)] ring-1 ring-[var(--dt-primary)]/40 font-medium'
                            : 'hover:bg-[var(--dt-sidebar-accent)] text-[var(--dt-foreground)]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate mr-2">
                          {renderItemIcon(item.iconType)}
                          <div className="flex flex-col truncate">
                            <span className="truncate">{item.title}</span>
                            {item.subtitle && (
                              <span className="text-[10.5px] text-[var(--dt-muted-foreground)] font-mono truncate">
                                {item.subtitle}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {item.shortcut && (
                            <kbd className="px-1.5 py-0.5 rounded bg-[var(--dt-sidebar)] border border-[var(--dt-border)] font-mono text-[9.5px] text-[var(--dt-muted-foreground)]">
                              {item.shortcut}
                            </kbd>
                          )}
                          {isSelected && (
                            <CornerDownLeft className="w-3.5 h-3.5 text-[var(--dt-primary)] shrink-0" />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })
          ) : (
            <div className="py-10 text-center text-[12.5px] text-[var(--dt-muted-foreground)]">
              No commands, sessions or files match "{query}"
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="px-4 py-2 bg-[var(--dt-card-subtle)] border-t border-[var(--dt-border)] flex items-center justify-between text-[11px] text-[var(--dt-muted-foreground)] font-mono">
          <div className="flex items-center gap-2">
            <span>↑↓ to navigate</span>
            <span>·</span>
            <span>↵ to select</span>
            <span>·</span>
            <span>Tab to complete</span>
          </div>
          <span className="text-[10px]">{items.length} results</span>
        </div>
      </div>
    </div>
  )
}
