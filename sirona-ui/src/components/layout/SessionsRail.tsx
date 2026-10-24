import React, { useState } from 'react'
import {
  Plus,
  Pin,
  Trash2,
  MessageSquare,
  FolderGit2,
  ChevronDown,
  ChevronRight,
  GitBranch,
  Clock,
  SlidersHorizontal,
} from 'lucide-react'
import { useStore } from '@nanostores/react'
import {
  $sessions,
  $activeSessionId,
  createNewSession,
  openSessionInTab,
  togglePinSession,
  deleteSession,
} from '../../store/sessionStore'
import { SearchField } from '../ui/SearchField'

export const SessionsRail: React.FC = () => {
  const sessions = useStore($sessions)
  const activeId = useStore($activeSessionId)
  const [filter, setFilter] = useState('')
  const [projectsOpen, setProjectsOpen] = useState(true)
  const [pinnedOpen, setPinnedOpen] = useState(true)
  const [recentsOpen, setRecentsOpen] = useState(true)
  const [cronOpen, setCronOpen] = useState(false)

  const handleNewChat = () => {
    createNewSession()
  }

  const filtered = sessions.filter((s) =>
    s.title.toLowerCase().includes(filter.toLowerCase())
  )

  const pinnedSessions = filtered.filter((s) => s.pinned === 1)
  const recentSessions = filtered.filter((s) => s.pinned !== 1)

  const formatTimestamp = (ts?: number) => {
    if (!ts) return 'now'
    const diffMin = Math.floor((Date.now() / 1000 - ts) / 60)
    if (diffMin < 1) return 'now'
    if (diffMin < 60) return `${diffMin}m`
    const diffHours = Math.floor(diffMin / 60)
    if (diffHours < 24) return `${diffHours}h`
    return `${Math.floor(diffHours / 24)}d`
  }

  return (
    <nav className="w-64 h-full flex flex-col bg-[#faf8f5] border-r border-[#d1d1cd] select-none z-10 font-sans">
      {/* Top Controls */}
      <div className="p-3 flex flex-col gap-2.5 border-b border-[#f0eee9]">
        <div className="flex items-center gap-2">
          <button
            onClick={handleNewChat}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-[#fdfbfa] hover:bg-[#ffffff] text-[#27251e] border border-[#d1d1cd] hover:border-[#92918b] rounded-[6px] text-[13px] font-medium transition-all shadow-[var(--shadow-subtle)] cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#016a71]" />
            <span>New Chat</span>
          </button>
          <button
            className="p-2 rounded-[6px] text-[#72706b] hover:text-[#27251e] hover:bg-[#f5f3ef] border border-[#d1d1cd] transition-colors cursor-pointer"
            title="Filter Sessions"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
        <SearchField value={filter} onChange={(e) => setFilter(e.target.value)} />
      </div>

      {/* Main Sections Accordion Area */}
      <div className="flex-1 overflow-y-auto px-2 py-2 flex flex-col gap-2">
        {/* 1. PROJECTS SECTION */}
        <div className="flex flex-col">
          <button
            onClick={() => setProjectsOpen(!projectsOpen)}
            className="w-full flex items-center justify-between px-2.5 py-1 text-[11px] font-medium tracking-wider uppercase text-[#72706b] hover:text-[#27251e] transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <FolderGit2 className="w-3.5 h-3.5 text-[#016a71]" />
              Projects
            </span>
            {projectsOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>

          {projectsOpen && (
            <div className="mt-1 px-1 flex flex-col gap-1">
              <div className="flex items-center justify-between px-2.5 py-2 rounded-[10px] bg-[#fdfbfa] border border-[#d1d1cd] text-[13px] text-[#27251e] shadow-[var(--shadow-subtle)]">
                <div className="flex items-center gap-2 truncate">
                  <span className="w-2 h-2 rounded-full bg-[#016a71]" />
                  <span className="truncate font-medium text-[12px]">personal -agent</span>
                </div>
                <span className="flex items-center gap-1 text-[10px] font-mono bg-[#faf8f5] px-1.5 py-0.5 rounded border border-[#d1d1cd] text-[#72706b]">
                  <GitBranch className="w-2.5 h-2.5 text-[#016a71]" />
                  main
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 2. PINNED CHATS SECTION */}
        {pinnedSessions.length > 0 && (
          <div className="flex flex-col">
            <button
              onClick={() => setPinnedOpen(!pinnedOpen)}
              className="w-full flex items-center justify-between px-2.5 py-1 text-[11px] font-medium tracking-wider uppercase text-[#72706b] hover:text-[#27251e] transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <Pin className="w-3.5 h-3.5 text-[#016a71]" />
                Pinned ({pinnedSessions.length})
              </span>
              {pinnedOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>

            {pinnedOpen && (
              <div className="mt-1 flex flex-col gap-0.5">
                {pinnedSessions.map((s) => {
                  const isActive = s.id === activeId
                  return (
                    <div
                      key={s.id}
                      onClick={() => openSessionInTab(s.id)}
                      className={`group flex items-center justify-between px-3 py-1.5 rounded-[10px] text-[13px] cursor-pointer transition-all ${
                        isActive
                          ? 'bg-[#016a71] text-white font-normal shadow-[var(--shadow-subtle)]'
                          : 'text-[#72706b] hover:bg-[#f5f3ef] hover:text-[#27251e]'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-[#72706b]'}`} />
                        <span className="truncate text-[12px]">{s.title || 'Untitled Session'}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            togglePinSession(s.id)
                          }}
                          className="p-0.5 hover:opacity-80"
                          title="Unpin"
                        >
                          <Pin className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* 3. RECENTS SECTION */}
        <div className="flex flex-col">
          <button
            onClick={() => setRecentsOpen(!recentsOpen)}
            className="w-full flex items-center justify-between px-2.5 py-1 text-[11px] font-medium tracking-wider uppercase text-[#72706b] hover:text-[#27251e] transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#72706b]" />
              Recent Chats
            </span>
            {recentsOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>

          {recentsOpen && (
            <div className="mt-1 flex flex-col gap-0.5">
              {recentSessions.map((s) => {
                const isActive = s.id === activeId
                return (
                  <div
                    key={s.id}
                    onClick={() => openSessionInTab(s.id)}
                    className={`group flex items-center justify-between px-3 py-1.5 rounded-[10px] text-[13px] cursor-pointer transition-all ${
                      isActive
                        ? 'bg-[#016a71] text-white font-normal shadow-[var(--shadow-subtle)]'
                        : 'text-[#72706b] hover:bg-[#f5f3ef] hover:text-[#27251e]'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          isActive ? 'bg-white' : 'bg-[#016a71]'
                        }`}
                      />
                      <span className="truncate text-[12px]">{s.title || 'Untitled Session'}</span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 opacity-70 group-hover:opacity-100">
                      <span className={`text-[10px] ${isActive ? 'text-white/80' : 'text-[#92918b]'}`}>
                        {formatTimestamp(s.last_activity_at || s.started_at)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          togglePinSession(s.id)
                        }}
                        className={`hidden group-hover:block p-0.5 cursor-pointer ${
                          isActive ? 'hover:text-white' : 'hover:text-[#27251e]'
                        }`}
                        title="Pin Session"
                      >
                        <Pin className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteSession(s.id)
                        }}
                        className={`hidden group-hover:block p-0.5 cursor-pointer ${
                          isActive ? 'hover:text-red-200' : 'hover:text-[#ef4444]'
                        }`}
                        title="Delete Session"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )
              })}

              {recentSessions.length === 0 && pinnedSessions.length === 0 && (
                <div className="px-3 py-4 text-center text-[12px] text-[#72706b]">
                  No sessions yet
                </div>
              )}
            </div>
          )}
        </div>

        {/* 4. CRON AUTOMATIONS SECTION */}
        <div className="flex flex-col mt-auto pt-2 border-t border-[#f0eee9]">
          <button
            onClick={() => setCronOpen(!cronOpen)}
            className="w-full flex items-center justify-between px-2.5 py-1 text-[11px] font-medium tracking-wider uppercase text-[#72706b] hover:text-[#27251e] transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#016a71]" />
              Scheduled Tasks
            </span>
            {cronOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
          {cronOpen && (
            <div className="p-2 text-[11px] text-[#72706b] bg-[#fdfbfa] rounded-[8px] border border-[#d1d1cd] mt-1">
              No background automations scheduled. Use <code className="text-[#016a71]">/schedule</code> in chat.
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
