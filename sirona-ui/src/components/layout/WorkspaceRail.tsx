import React from 'react'
import { Plus, Radio } from 'lucide-react'
import { Tip } from '../ui/Tip'

export const WorkspaceRail: React.FC = () => {
  return (
    <aside className="w-12 h-full flex flex-col items-center py-3 bg-[var(--dt-sidebar)] border-r border-[var(--dt-sidebar-border)] select-none z-20">
      {/* Workspace Squircle Icon */}
      <Tip label="Active Workspace: Primary">
        <button className="w-8 h-8 rounded-[10px] bg-[var(--dt-primary)] text-white font-semibold text-xs flex items-center justify-center shadow-sm hover:brightness-110 transition-all cursor-pointer">
          S1
        </button>
      </Tip>

      <div className="w-5 h-[1px] bg-[var(--dt-sidebar-border)] my-3" />

      {/* Secondary Project Squircle */}
      <Tip label="Add Workspace Project">
        <button className="w-8 h-8 rounded-[10px] bg-[var(--dt-card)] hover:bg-[var(--dt-background)] text-[var(--dt-muted-foreground)] hover:text-[var(--dt-foreground)] border border-[var(--dt-sidebar-border)] flex items-center justify-center transition-colors cursor-pointer shadow-[var(--shadow-subtle)]">
          <Plus className="w-4 h-4" />
        </button>
      </Tip>

      <div className="flex-1" />

      {/* Fleet Gateway Dot */}
      <Tip label="Gateway: Local Connected">
        <div className="flex flex-col items-center gap-1 cursor-default">
          <span className="w-2 h-2 rounded-full bg-[#1a7f37] shadow-sm animate-pulse" />
          <Radio className="w-3.5 h-3.5 text-[var(--dt-muted-foreground)]" />
        </div>
      </Tip>
    </aside>
  )
}
