import React, { useEffect, useState } from 'react'
import { Cpu, ShieldCheck, Gauge, GitBranch } from 'lucide-react'
import { useStore } from '@nanostores/react'
import { api, type SystemStatus } from '../../api/client'
import { $connectionState, $reconnectAttempts } from '../../store/connectionStore'
import { $repoStatus, refreshGitStatus } from '../../store/gitStore'
import { $contextPaneOpen, toggleContextPane, setActiveContextTab } from '../../store/layoutStore'

export const StatusBar: React.FC = () => {
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const connectionState = useStore($connectionState)
  const reconnectAttempts = useStore($reconnectAttempts)
  const repoStatus = useStore($repoStatus)

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await api.getStatus()
        setStatus(res)
      } catch (e) {
        // Fallback
      }
    }
    fetchStatus()
    refreshGitStatus()
    const timer = setInterval(() => {
      fetchStatus()
      refreshGitStatus()
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  const renderConnectionBadge = () => {
    switch (connectionState) {
      case 'open':
        return (
          <div className="flex items-center gap-1.5 text-[#1a7f37]">
            <span className="w-2 h-2 rounded-full bg-[#1a7f37] inline-block shadow-sm" />
            <span>Gateway: Connected</span>
          </div>
        )
      case 'connecting':
        return (
          <div className="flex items-center gap-1.5 text-[#bf8700]">
            <span className="w-2 h-2 rounded-full bg-[#bf8700] inline-block animate-pulse shadow-sm" />
            <span>Gateway: Connecting...</span>
          </div>
        )
      case 'reconnecting':
        return (
          <div className="flex items-center gap-1.5 text-[#bf8700]">
            <span className="w-2 h-2 rounded-full bg-[#bf8700] inline-block animate-pulse shadow-sm" />
            <span>
              Gateway: Reconnecting{reconnectAttempts > 0 ? ` (${reconnectAttempts})` : ''}...
            </span>
          </div>
        )
      case 'error':
      case 'closed':
      default:
        return (
          <div className="flex items-center gap-1.5 text-[#cf222e]">
            <span className="w-2 h-2 rounded-full bg-[#cf222e] inline-block shadow-sm" />
            <span>Gateway: Offline</span>
          </div>
        )
    }
  }

  return (
    <footer className="h-6 w-full flex items-center justify-between px-3 bg-[var(--dt-sidebar)] border-t border-[var(--dt-sidebar-border)] text-[11px] text-[var(--dt-muted-foreground)] font-mono select-none z-30">
      <div className="flex items-center gap-3.5">
        {renderConnectionBadge()}
        {repoStatus?.is_repo && (
          <button
            onClick={() => {
              setActiveContextTab('review')
              if (!$contextPaneOpen.get()) toggleContextPane()
            }}
            className="flex items-center gap-1.5 text-[var(--dt-foreground)] hover:text-[var(--dt-primary)] transition-colors cursor-pointer"
            title="Open Git Review Tab"
          >
            <GitBranch className="w-3.5 h-3.5 text-[var(--dt-primary)]" />
            <span>{repoStatus.branch}</span>
            {!repoStatus.is_clean && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#bf8700]" title="Dirty working tree" />
            )}
          </button>
        )}
        <div className="flex items-center gap-1 text-[var(--dt-muted-foreground)]">
          <ShieldCheck className="w-3.5 h-3.5 text-[var(--dt-primary)]" />
          <span>Supervised</span>
        </div>
      </div>

      <div className="flex items-center gap-3.5">
        <div className="flex items-center gap-1">
          <Gauge className="w-3.5 h-3.5 text-[var(--dt-muted-foreground)]" />
          <span>Context: 12%</span>
        </div>
        <div className="flex items-center gap-1">
          <Cpu className="w-3.5 h-3.5 text-[var(--dt-muted-foreground)]" />
          <span>
            CPU: {status?.cpu_pct ?? 0}% | Mem: {status?.mem_pct ?? 0}%
          </span>
        </div>
      </div>
    </footer>
  )
}
