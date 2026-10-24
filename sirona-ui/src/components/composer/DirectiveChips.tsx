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
        return <FileCode className="w-3.5 h-3.5 text-[var(--dt-primary)]" />
      case 'slash':
        return <Slash className="w-3.5 h-3.5 text-[var(--dt-primary)]" />
      case 'shell':
        return <Terminal className="w-3.5 h-3.5 text-[var(--dt-primary)]" />
      default:
        return null
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-4 pt-2">
      {chips.map((chip) => (
        <span
          key={chip.id}
          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[12px] font-mono bg-[var(--dt-card-subtle)] border border-[var(--dt-border)] text-[var(--dt-foreground)] shadow-[var(--shadow-subtle)]"
        >
          {getIcon(chip.type)}
          <span>{chip.label}</span>
          <button
            onClick={() => onRemove(chip.id)}
            className="hover:text-[var(--dt-danger)] text-[var(--dt-muted-foreground)] transition-colors ml-1 cursor-pointer"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
    </div>
  )
}
