import React from 'react'
import { X, GitFork, MessageSquare, Play, Sparkles } from 'lucide-react'
import { useStore } from '@nanostores/react'
import { $starmapOpen, toggleStarmap } from '../../store/layoutStore'
import { $sessions, $activeSessionId, openSessionInTab } from '../../store/sessionStore'

export const StarmapModal: React.FC = () => {
  const isOpen = useStore($starmapOpen)
  const sessions = useStore($sessions)
  const activeId = useStore($activeSessionId)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[230] bg-black/40 backdrop-blur-xs flex items-center justify-center p-6 animate-in fade-in duration-150 font-sans select-none">
      <div className="w-full max-w-4xl bg-[#fdfbfa] border border-[#d1d1cd] rounded-[16px] shadow-[var(--shadow-subtle)] overflow-hidden flex flex-col h-[580px]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#d1d1cd] bg-[#faf8f5]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#016a71]" />
            <h3 className="text-[16px] font-medium text-[#27251e]">Sirona Starmap · Session Branch Topology</h3>
          </div>
          <button
            onClick={toggleStarmap}
            className="p-1 text-[#72706b] hover:text-[#27251e] rounded-[6px] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Graph Canvas */}
        <div className="flex-1 overflow-auto p-6 bg-[#faf8f5] flex flex-col justify-center items-center relative">
          <div className="max-w-xl w-full flex flex-col gap-4">
            <div className="p-4 bg-[#fdfbfa] border border-[#d1d1cd] rounded-[12px] shadow-[var(--shadow-subtle)]">
              <div className="text-[12px] text-[#72706b] font-medium uppercase tracking-wider mb-2">
                Root Lineage Node
              </div>
              <div className="flex items-center gap-2 text-[#016a71] font-medium text-[14px]">
                <MessageSquare className="w-4 h-4" />
                <span>Primary Agent Session: Sirona Workspace</span>
              </div>
            </div>

            {/* Tree Branch Lines */}
            <div className="pl-6 border-l-2 border-dashed border-[#d1d1cd] flex flex-col gap-3 my-1">
              {sessions.map((s) => {
                const isActive = s.id === activeId
                return (
                  <div
                    key={s.id}
                    onClick={() => {
                      openSessionInTab(s.id)
                      toggleStarmap()
                    }}
                    className={`flex items-center justify-between p-3 rounded-[10px] border cursor-pointer transition-all ${
                      isActive
                        ? 'bg-[#016a71] text-white border-[#016a71] shadow-[var(--shadow-subtle)]'
                        : 'bg-[#fdfbfa] border-[#d1d1cd] text-[#27251e] hover:border-[#016a71]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <GitFork className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-[#016a71]'}`} />
                      <span className="font-medium text-[13px]">{s.title || 'Branch Session'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className={`font-mono ${isActive ? 'text-white/80' : 'text-[#72706b]'}`}>{s.model}</span>
                      <Play className="w-3 h-3" />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#d1d1cd] bg-[#faf8f5] flex items-center justify-between text-[12px] text-[#72706b]">
          <span>Click any node branch to switch context or fork session</span>
          <button
            onClick={toggleStarmap}
            className="px-3 py-1 rounded-[6px] border border-[#d1d1cd] hover:text-[#27251e] transition-colors cursor-pointer"
          >
            Close Starmap
          </button>
        </div>
      </div>
    </div>
  )
}
