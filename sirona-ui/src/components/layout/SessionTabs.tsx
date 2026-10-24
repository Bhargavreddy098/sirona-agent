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
    <div className="h-10 px-3 flex items-center justify-between border-b border-[#d1d1cd] bg-[#faf8f5] text-[13px] select-none z-10">
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
              className={`group flex items-center gap-2 px-3 py-1.5 rounded-[8px] text-[13px] transition-all cursor-pointer border ${
                isActive
                  ? 'bg-[#fdfbfa] border-[#d1d1cd] text-[#27251e] font-medium shadow-[var(--shadow-subtle)]'
                  : 'bg-transparent border-transparent text-[#72706b] hover:bg-[#f5f3ef] hover:text-[#27251e]'
              }`}
            >
              <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#016a71]' : 'text-[#72706b]'}`} />
              <span className="truncate max-w-[140px] text-[12px]">{title}</span>
              {sess?.pinned === 1 && <Pin className="w-2.5 h-2.5 text-[#016a71] shrink-0" />}
              <button
                type="button"
                onClick={(e) => closeSessionTab(tabId, e)}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[#e8e6e1] text-[#72706b] hover:text-[#27251e] transition-all cursor-pointer"
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
          className="p-1.5 rounded-[6px] text-[#72706b] hover:text-[#27251e] hover:bg-[#f5f3ef] transition-colors cursor-pointer"
          title="New Tab"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Right: Active model pill & Session tools */}
      <div className="flex items-center gap-2 shrink-0">
        {activeSession?.model && (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] bg-[#fdfbfa] text-[#27251e] border border-[#d1d1cd] font-mono shadow-[var(--shadow-subtle)]">
            <Sparkles className="w-3 h-3 text-[#016a71]" />
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
          className="flex items-center gap-1 px-2 py-1 rounded-[6px] text-[12px] text-[#72706b] hover:text-[#27251e] hover:bg-[#f5f3ef] transition-colors cursor-pointer"
          title="Fork Session Branch"
        >
          <GitFork className="w-3.5 h-3.5 text-[#016a71]" />
          <span className="hidden sm:inline">Fork</span>
        </button>
      </div>
    </div>
  )
}
