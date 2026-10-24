import React from 'react'
import { Plus, X, Pin, GitFork, Sparkles, MessageSquare } from 'lucide-react'
import { useStore } from '@nanostores/react'
import {
  $sessions,
  $activeSessionId,
  $openSessionTabs,
  openSessionInTab,
  closeSessionTab,
  createNewSession,
} from '../../store/sessionStore'

export const SessionTabs: React.FC = () => {
  const sessions = useStore($sessions)
  const activeId = useStore($activeSessionId)
  const openTabs = useStore($openSessionTabs)

  const activeSession = sessions.find((s) => s.id === activeId)

  const handleNewTab = () => {
    createNewSession('New Session', activeSession?.model || 'gemini-2.5-flash')
  }

  // Fallback to activeId if openTabs is empty
  const displayedTabIds = openTabs.length > 0 ? openTabs : activeId ? [activeId] : []

  return (
    <div className="h-10 px-3 flex items-center justify-between border-b border-[var(--dt-border)] bg-[var(--dt-sidebar)] text-[12.5px] select-none z-10">
      {/* Left: Tab list */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        {displayedTabIds.map((tabId) => {
          const sess = sessions.find((s) => s.id === tabId)
          const isActive = tabId === activeId
          const title = sess?.title || 'New Session'

          return (
            <div
              key={tabId}
              onClick={() => openSessionInTab(tabId)}
              className={`group flex items-center gap-2 px-3 py-1.5 rounded-[8px] text-[12.5px] transition-all cursor-pointer border ${
                isActive
                  ? 'bg-[var(--dt-background)] border-[var(--dt-border)] text-[var(--dt-foreground)] font-medium shadow-[var(--shadow-subtle)]'
                  : 'bg-transparent border-transparent text-[var(--dt-muted-foreground)] hover:bg-[var(--dt-muted)] hover:text-[var(--dt-foreground)]'
              }`}
            >
              <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[var(--dt-primary)]' : 'text-[var(--dt-muted-foreground)]'}`} />
              <span className="truncate max-w-[140px] text-[12px]">{title}</span>
              {sess?.pinned === 1 && <Pin className="w-2.5 h-2.5 text-[var(--dt-primary)] shrink-0" />}
              <button
                type="button"
                onClick={(e) => closeSessionTab(tabId, e)}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[var(--dt-border)]/40 text-[var(--dt-muted-foreground)] hover:text-[var(--dt-foreground)] transition-all cursor-pointer"
                title="Close Tab"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )
        })}

        {/* Plus new tab button */}
        <button
          type="button"
          onClick={handleNewTab}
          className="p-1.5 rounded-[6px] text-[var(--dt-muted-foreground)] hover:text-[var(--dt-foreground)] hover:bg-[var(--dt-card)] transition-colors cursor-pointer"
          title="New Tab"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Right: Active model pill & Session tools */}
      <div className="flex items-center gap-2 shrink-0">
        {activeSession?.model && (
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] bg-[var(--dt-background)] text-[var(--dt-foreground)] border border-[var(--dt-border)] font-mono shadow-[var(--shadow-subtle)]">
            <Sparkles className="w-3 h-3 text-[var(--dt-primary)]" />
            <span>{activeSession.model}</span>
          </span>
        )}

        <button
          type="button"
          onClick={() => {
            if (activeSession) {
              createNewSession(`Fork of ${activeSession.title}`, activeSession.model)
            }
          }}
          className="flex items-center gap-1 px-2.5 py-1 rounded-[6px] text-[12px] text-[var(--dt-muted-foreground)] hover:text-[var(--dt-foreground)] hover:bg-[var(--dt-card)] transition-colors cursor-pointer"
          title="Fork Session Branch"
        >
          <GitFork className="w-3.5 h-3.5 text-[var(--dt-primary)]" />
          <span className="hidden sm:inline">Fork</span>
        </button>
      </div>
    </div>
  )
}
