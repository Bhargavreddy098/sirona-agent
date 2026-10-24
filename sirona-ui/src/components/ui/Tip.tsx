import React, { useState } from 'react'

export interface TipProps {
  label: string
  shortcut?: string
  children: React.ReactNode
}

export const Tip: React.FC<TipProps> = ({ label, shortcut, children }) => {
  const [visible, setVisible] = useState(false)
  const [timer, setTimer] = useState<any>(null)

  const handleMouseEnter = () => {
    const t = setTimeout(() => setVisible(true), 200)
    setTimer(t)
  }

  const handleMouseLeave = () => {
    if (timer) clearTimeout(timer)
    setVisible(false)
  }

  return (
    <div className="relative inline-flex" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {children}
      {visible && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 text-[11px] font-medium text-[var(--dt-foreground)] bg-[var(--dt-card)] border border-[var(--dt-border)] rounded-[6px] shadow-[var(--shadow-subtle)] whitespace-nowrap z-[200] pointer-events-none flex items-center gap-1.5">
          <span>{label}</span>
          {shortcut && (
            <kbd className="px-1 py-0.5 text-[9px] font-mono bg-[var(--dt-card-subtle)] text-[var(--dt-muted-foreground)] rounded border border-[var(--dt-border)]">
              {shortcut}
            </kbd>
          )}
        </div>
      )}
    </div>
  )
}
