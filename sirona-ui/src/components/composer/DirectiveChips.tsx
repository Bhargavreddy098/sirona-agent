import React from 'react'
import { X, FileCode, Terminal, Slash } from 'lucide-react'

export interface DirectiveChipsProps {
  chips: Array<{ id: string; label: string; type: 'file' | 'slash' | 'shell' }>
  onRemove: (id: string) => void
}

export const DirectiveChips: React.FC<DirectiveChipsProps> = ({ chips, onRemove }) => {
  if (chips.length === 0) return null

  const getIcon = (type: string) => {
    switch (type) {
      case 'file':
        return <FileCode className="w-3.5 h-3.5 text-[#016a71]" />
      case 'slash':
        return <Slash className="w-3.5 h-3.5 text-[#016a71]" />
      case 'shell':
        return <Terminal className="w-3.5 h-3.5 text-[#016a71]" />
      default:
        return null
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-4 pt-2">
      {chips.map((chip) => (
        <span
          key={chip.id}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-mono bg-[#fdfbfa] border border-[#d1d1cd] text-[#27251e] shadow-[var(--shadow-subtle)]"
        >
          {getIcon(chip.type)}
          <span>{chip.label}</span>
          <button
            onClick={() => onRemove(chip.id)}
            className="hover:text-[#ef4444] text-[#72706b] transition-colors ml-1 cursor-pointer"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
    </div>
  )
}
