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
          <div className="flex items-center gap-1.5 text-[#016a71]">
            <span className="w-2 h-2 rounded-full bg-[#016a71] inline-block shadow-sm" />
            <span>Gateway: Connected</span>
          </div>
        )
      case 'connecting':
        return (
          <div className="flex items-center gap-1.5 text-[#b45309]">
            <span className="w-2 h-2 rounded-full bg-[#f59e0b] inline-block animate-pulse shadow-sm" />
            <span>Gateway: Connecting...</span>
          </div>
        )
      case 'reconnecting':
        return (
          <div className="flex items-center gap-1.5 text-[#b45309]">
            <span className="w-2 h-2 rounded-full bg-[#f59e0b] inline-block animate-pulse shadow-sm" />
            <span>
              Gateway: Reconnecting{reconnectAttempts > 0 ? ` (${reconnectAttempts})` : ''}...
            </span>
          </div>
        )
      case 'error':
      case 'closed':
      default:
        return (
          <div className="flex items-center gap-1.5 text-[#b91c1c]">
            <span className="w-2 h-2 rounded-full bg-[#ef4444] inline-block shadow-sm" />
            <span>Gateway: Offline</span>
          </div>
        )
    }
  }

  return (
    <footer className="h-7 w-full flex items-center justify-between px-4 bg-[#faf8f5] border-t border-[#d1d1cd] text-[11px] text-[#72706b] font-mono select-none z-30">
      <div className="flex items-center gap-4">
        {renderConnectionBadge()}
        {repoStatus?.is_repo && (
          <button
            onClick={() => {
              setActiveContextTab('review')
              if (!$contextPaneOpen.get()) toggleContextPane()
            }}
            className="flex items-center gap-1.5 text-[#27251e] hover:text-[#016a71] transition-colors cursor-pointer"
            title="Open Git Review Tab"
          >
            <GitBranch className="w-3.5 h-3.5 text-[#016a71]" />
            <span>{repoStatus.branch}</span>
            {!repoStatus.is_clean && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" title="Dirty working tree" />
            )}
          </button>
        )}
        <div className="flex items-center gap-1 text-[#72706b]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#016a71]" />
          <span>Security: Supervised</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <Gauge className="w-3.5 h-3.5 text-[#92918b]" />
          <span>Context: 12%</span>
        </div>
        <div className="flex items-center gap-1">
          <Cpu className="w-3.5 h-3.5 text-[#92918b]" />
          <span>
            CPU: {status?.cpu_pct ?? 0}% | Mem: {status?.mem_pct ?? 0}%
          </span>
        </div>
      </div>
    </footer>
  )
}
