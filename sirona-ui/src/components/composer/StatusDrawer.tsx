import React, { useState } from 'react'
import { ChevronUp, ChevronDown, CheckSquare, Clock } from 'lucide-react'

export const StatusDrawer: React.FC = () => {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-t border-[var(--dt-border)] bg-[var(--dt-sidebar)]">
      {/* Center grip handle */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-center py-1 text-[11px] text-[var(--dt-muted-foreground)] hover:text-[var(--dt-foreground)] transition-colors cursor-pointer"
        title="Toggle Task Status"
      >
        {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
      </button>

      {open && (
        <div className="px-4 py-2 flex items-center justify-between text-[12px] text-[var(--dt-muted-foreground)] border-b border-[var(--dt-border)] bg-[var(--dt-card)]">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-3.5 h-3.5 text-[var(--dt-primary)]" />
            <span>Tasks: 0 pending</span>
          </div>
          <div className="flex items-center gap-2 text-[var(--dt-muted-foreground)]">
            <Clock className="w-3.5 h-3.5" />
            <span>Idle</span>
          </div>
        </div>
      )}
    </div>
  )
}
