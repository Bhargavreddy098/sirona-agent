import React, { useState } from 'react'
import { ChevronUp, ChevronDown, CheckSquare, Clock } from 'lucide-react'

export const StatusDrawer: React.FC = () => {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-t border-[#d1d1cd] bg-[#faf8f5]">
      {/* Center grip handle */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-center py-1 text-[11px] text-[#72706b] hover:text-[#27251e] transition-colors cursor-pointer"
        title="Toggle Task Status"
      >
        {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
      </button>

      {open && (
        <div className="px-4 py-2 flex items-center justify-between text-[12px] text-[#72706b] border-b border-[#d1d1cd] bg-[#fdfbfa]">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-3.5 h-3.5 text-[#016a71]" />
            <span>Tasks: 0 pending</span>
          </div>
          <div className="flex items-center gap-2 text-[#72706b]">
            <Clock className="w-3.5 h-3.5" />
            <span>Idle</span>
          </div>
        </div>
      )}
    </div>
  )
}
