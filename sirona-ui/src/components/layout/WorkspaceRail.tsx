import React from 'react'
import { Plus, Radio } from 'lucide-react'
import { Tip } from '../ui/Tip'

export const WorkspaceRail: React.FC = () => {
  return (
    <aside className="w-12 h-full flex flex-col items-center py-3 bg-[#faf8f5] border-r border-[#d1d1cd] select-none z-20">
      {/* Workspace Squircle Icon */}
      <Tip label="Active Workspace: Primary">
        <button className="w-8 h-8 rounded-[12px] bg-[#27251e] text-[#faf8f5] font-medium text-xs flex items-center justify-center shadow-[var(--shadow-subtle)] hover:bg-[#000000] transition-colors cursor-pointer">
          S1
        </button>
      </Tip>

      <div className="w-5 h-[1px] bg-[#d1d1cd] my-3" />

      {/* Secondary Project Squircle */}
      <Tip label="Add Workspace Project">
        <button className="w-8 h-8 rounded-[12px] bg-[#fdfbfa] hover:bg-[#f5f3ef] text-[#72706b] hover:text-[#27251e] border border-[#d1d1cd] flex items-center justify-center transition-colors cursor-pointer shadow-[var(--shadow-subtle)]">
          <Plus className="w-4 h-4" />
        </button>
      </Tip>

      <div className="flex-1" />

      {/* Fleet Gateway Dot */}
      <Tip label="Gateway: Local Connected">
        <div className="flex flex-col items-center gap-1 cursor-default">
          <span className="w-2 h-2 rounded-full bg-[#016a71] shadow-sm" />
          <Radio className="w-3.5 h-3.5 text-[#72706b]" />
        </div>
      </Tip>
    </aside>
  )
}
