import React, { useEffect } from 'react'
import { Cpu, ShieldCheck, Gauge, GitBranch, WifiOff } from 'lucide-react'
import { useStore } from '@nanostores/react'
import {
  $systemStatus,
  $pingLatencyMs,
  $isOnline,
  startTelemetryPolling,
  toggleDiagnostics,
  getMetricTier,
} from '../../store/telemetryStore'
import { $connectionState, $reconnectAttempts } from '../../store/connectionStore'
import { $repoStatus, refreshGitStatus } from '../../store/gitStore'
import { $contextPaneOpen, toggleContextPane, setActiveContextTab } from '../../store/layoutStore'
import { gateway } from '../../api/gateway'

export const StatusBar: React.FC = () => {
  const status = useStore($systemStatus)
  const latency = useStore($pingLatencyMs)
  const isOnline = useStore($isOnline)
  const connectionState = useStore($connectionState)
  const reconnectAttempts = useStore($reconnectAttempts)
  const repoStatus = useStore($repoStatus)

  useEffect(() => {
    refreshGitStatus()
    const stopPolling = startTelemetryPolling(4000)
    return () => {
      stopPolling()
    }
  }, [])

  const handleConnectionClick = () => {
    if (connectionState === 'closed' || connectionState === 'error') {
      gateway.connect()
    } else {
      toggleDiagnostics()
    }
  }

  const renderConnectionBadge = () => {
    if (!isOnline) {
      return (
        <button
          onClick={handleConnectionClick}
          className="flex items-center gap-1.5 text-[#cf222e] hover:underline cursor-pointer"
          title="Browser is offline. Click to check diagnostics."
        >
          <WifiOff className="w-3.5 h-3.5" />
          <span>Offline (No Net)</span>
        </button>
      )
    }

    switch (connectionState) {
      case 'open':
        return (
          <button
            onClick={handleConnectionClick}
            className="flex items-center gap-1.5 text-[#1a7f37] hover:underline cursor-pointer"
            title="Gateway Connected. Click for system diagnostics."
          >
            <span className="w-2 h-2 rounded-full bg-[#1a7f37] inline-block shadow-sm" />
            <span>Gateway: Connected</span>
            {latency !== null && (
              <span className="text-[10px] text-[var(--dt-muted-foreground)] font-mono">
                ({latency}ms)
              </span>
            )}
          </button>
        )
      case 'connecting':
        return (
          <button
            onClick={handleConnectionClick}
            className="flex items-center gap-1.5 text-[#bf8700] hover:underline cursor-pointer"
            title="Gateway connecting..."
          >
            <span className="w-2 h-2 rounded-full bg-[#bf8700] inline-block animate-pulse shadow-sm" />
            <span>Gateway: Connecting...</span>
          </button>
        )
      case 'reconnecting':
        return (
          <button
            onClick={handleConnectionClick}
            className="flex items-center gap-1.5 text-[#bf8700] hover:underline cursor-pointer"
            title={`Reconnection attempt ${reconnectAttempts}. Click to retry immediately.`}
          >
            <span className="w-2 h-2 rounded-full bg-[#bf8700] inline-block animate-pulse shadow-sm" />
            <span>
              Gateway: Reconnecting{reconnectAttempts > 0 ? ` (${reconnectAttempts})` : ''}...
            </span>
          </button>
        )
      case 'error':
      case 'closed':
      default:
        return (
          <button
            onClick={handleConnectionClick}
            className="flex items-center gap-1.5 text-[#cf222e] hover:underline cursor-pointer"
            title="Gateway Offline. Click to reconnect."
          >
            <span className="w-2 h-2 rounded-full bg-[#cf222e] inline-block shadow-sm" />
            <span>Gateway: Offline (Click to Reconnect)</span>
          </button>
        )
    }
  }

  const cpuTier = getMetricTier(status?.cpu_pct ?? 0)
  const memTier = getMetricTier(status?.mem_pct ?? 0)

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
        <button
          onClick={toggleDiagnostics}
          className="flex items-center gap-1 hover:text-[var(--dt-foreground)] transition-colors cursor-pointer"
          title="Click to view detailed system diagnostics"
        >
          <Cpu className="w-3.5 h-3.5 text-[var(--dt-muted-foreground)]" />
          <span className={cpuTier === 'critical' ? 'text-[var(--dt-danger)] font-bold' : ''}>
            CPU: {status?.cpu_pct ?? 0}%
          </span>
          <span>|</span>
          <span className={memTier === 'critical' ? 'text-[var(--dt-danger)] font-bold' : ''}>
            Mem: {status?.mem_pct ?? 0}%
          </span>
        </button>
      </div>
    </footer>
  )
}
