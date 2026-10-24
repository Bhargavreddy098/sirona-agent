import React, { useState } from 'react'
import {
  X,
  Activity,
  Cpu,
  Database,
  Wifi,
  RotateCw,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from 'lucide-react'
import { useStore } from '@nanostores/react'
import {
  $systemStatus,
  $pingLatencyMs,
  $isOnline,
  $diagnosticsOpen,
  $telemetryHistory,
  toggleDiagnostics,
  pingGatewayNow,
  getMetricTier,
} from '../../store/telemetryStore'
import { $connectionState, $reconnectAttempts } from '../../store/connectionStore'
import { gateway } from '../../api/gateway'

function formatUptime(seconds?: number): string {
  if (!seconds || seconds <= 0) return '0s'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export const DiagnosticsModal: React.FC = () => {
  const isOpen = useStore($diagnosticsOpen)
  const status = useStore($systemStatus)
  const latency = useStore($pingLatencyMs)
  const isOnline = useStore($isOnline)
  const connState = useStore($connectionState)
  const reconnectAttempts = useStore($reconnectAttempts)
  const history = useStore($telemetryHistory)
  const [isPinging, setIsPinging] = useState(false)

  if (!isOpen) return null

  const handleManualPing = async () => {
    setIsPinging(true)
    await pingGatewayNow()
    setTimeout(() => setIsPinging(false), 300)
  }

  const handleManualReconnect = () => {
    gateway.connect()
  }

  const cpuTier = getMetricTier(status?.cpu_pct ?? 0)
  const memTier = getMetricTier(status?.mem_pct ?? 0)

  const getTierColor = (tier: 'normal' | 'warning' | 'critical') => {
    if (tier === 'critical') return 'text-[var(--dt-danger)] bg-[var(--dt-danger)]'
    if (tier === 'warning') return 'text-[var(--dt-warning)] bg-[var(--dt-warning)]'
    return 'text-[#1a7f37] bg-[#1a7f37]'
  }

  return (
    <div
      className="fixed inset-0 z-[220] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 font-sans select-none"
      onClick={toggleDiagnostics}
    >
      <div
        className="w-full max-w-2xl bg-[var(--dt-card)] border border-[var(--dt-border)] rounded-[18px] shadow-2xl overflow-hidden flex flex-col select-text text-[var(--dt-foreground)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--dt-border)] bg-[var(--dt-card)] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[10px] bg-[var(--dt-sidebar-accent)] flex items-center justify-center text-[var(--dt-primary)]">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[14px] font-semibold text-[var(--dt-foreground)]">System Diagnostics</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[var(--dt-sidebar-accent)] text-[var(--dt-primary)] font-medium">
                  Core Telemetry
                </span>
              </div>
              <p className="text-[11px] text-[var(--dt-muted-foreground)]">
                Live hardware performance, network latency and gateway health
              </p>
            </div>
          </div>

          <button
            onClick={toggleDiagnostics}
            className="p-1.5 hover:bg-[var(--dt-sidebar-accent)] text-[var(--dt-muted-foreground)] hover:text-[var(--dt-foreground)] rounded-[8px] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 max-h-[500px] bg-[var(--dt-card-subtle)]">
          {/* Card 1: Network & Gateway Status */}
          <div className="p-4 rounded-[14px] bg-[var(--dt-card)] border border-[var(--dt-border)] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-[var(--dt-primary)]" />
                <span className="text-[13px] font-semibold">Gateway & Network Transport</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleManualPing}
                  disabled={isPinging}
                  className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono rounded-[6px] bg-[var(--dt-sidebar)] border border-[var(--dt-border)] hover:bg-[var(--dt-sidebar-accent)] text-[var(--dt-foreground)] transition-colors cursor-pointer"
                  title="Measure roundtrip ping"
                >
                  <Zap className={`w-3 h-3 text-[var(--dt-primary)] ${isPinging ? 'animate-pulse' : ''}`} />
                  <span>Ping</span>
                </button>
                <button
                  onClick={handleManualReconnect}
                  className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono rounded-[6px] bg-[var(--dt-sidebar)] border border-[var(--dt-border)] hover:bg-[var(--dt-sidebar-accent)] text-[var(--dt-foreground)] transition-colors cursor-pointer"
                  title="Reconnect WebSocket"
                >
                  <RotateCw className="w-3 h-3 text-[var(--dt-primary)]" />
                  <span>Reconnect</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-1">
              <div className="p-2.5 rounded-[10px] bg-[var(--dt-sidebar)] border border-[var(--dt-border)]">
                <span className="text-[10px] uppercase font-mono text-[var(--dt-muted-foreground)] block">
                  Gateway State
                </span>
                <div className="flex items-center gap-1.5 mt-1 font-mono text-[12px] font-medium">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      connState === 'open' ? 'bg-[#1a7f37]' : 'bg-[#cf222e]'
                    }`}
                  />
                  <span className="capitalize">{connState}</span>
                  {reconnectAttempts > 0 && (
                    <span className="text-[10px] text-[var(--dt-warning)]">({reconnectAttempts})</span>
                  )}
                </div>
              </div>

              <div className="p-2.5 rounded-[10px] bg-[var(--dt-sidebar)] border border-[var(--dt-border)]">
                <span className="text-[10px] uppercase font-mono text-[var(--dt-muted-foreground)] block">
                  Roundtrip Latency
                </span>
                <div className="flex items-center gap-1.5 mt-1 font-mono text-[12px] font-medium">
                  <span className="text-[var(--dt-primary)]">{latency !== null ? `${latency} ms` : 'N/A'}</span>
                  {latency !== null && (
                    <span className="text-[10px] text-[var(--dt-muted-foreground)] font-normal">
                      {latency < 50 ? '(fast)' : latency < 150 ? '(normal)' : '(slow)'}
                    </span>
                  )}
                </div>
              </div>

              <div className="p-2.5 rounded-[10px] bg-[var(--dt-sidebar)] border border-[var(--dt-border)]">
                <span className="text-[10px] uppercase font-mono text-[var(--dt-muted-foreground)] block">
                  Browser Internet
                </span>
                <div className="flex items-center gap-1.5 mt-1 font-mono text-[12px] font-medium">
                  {isOnline ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#1a7f37]" />
                      <span>Online</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5 text-[#cf222e]" />
                      <span>Offline</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Core Hardware & Host Resources */}
          <div className="p-4 rounded-[14px] bg-[var(--dt-card)] border border-[var(--dt-border)] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[var(--dt-primary)]" />
                <span className="text-[13px] font-semibold">Host System Resources</span>
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px] text-[var(--dt-muted-foreground)]">
                <span>PID: {status?.pid ?? '—'}</span>
                <span>·</span>
                <span>Threads: {status?.threads ?? '—'}</span>
              </div>
            </div>

            {/* CPU Bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-[var(--dt-muted-foreground)]">CPU Utilization</span>
                <span className="font-semibold">{status?.cpu_pct ?? 0}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[var(--dt-sidebar)] overflow-hidden border border-[var(--dt-border)]">
                <div
                  style={{ width: `${Math.min(status?.cpu_pct ?? 0, 100)}%` }}
                  className={`h-full transition-all duration-300 ${getTierColor(cpuTier).split(' ')[1]}`}
                />
              </div>
            </div>

            {/* Memory Bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-[var(--dt-muted-foreground)]">
                  Memory Usage ({status?.mem_available_mb ?? 0} MB available)
                </span>
                <span className="font-semibold">{status?.mem_pct ?? 0}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[var(--dt-sidebar)] overflow-hidden border border-[var(--dt-border)]">
                <div
                  style={{ width: `${Math.min(status?.mem_pct ?? 0, 100)}%` }}
                  className={`h-full transition-all duration-300 ${getTierColor(memTier).split(' ')[1]}`}
                />
              </div>
            </div>
          </div>

          {/* Card 3: Storage, Database & Service Uptime */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-[14px] bg-[var(--dt-card)] border border-[var(--dt-border)] space-y-1.5">
              <div className="flex items-center gap-2 text-[12px] font-semibold">
                <Database className="w-3.5 h-3.5 text-[var(--dt-primary)]" />
                <span>SQLite WAL Database</span>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-[11px]">
                <span className={`w-2 h-2 rounded-full ${status?.db ? 'bg-[#1a7f37]' : 'bg-[#cf222e]'}`} />
                <span>{status?.db ? 'Healthy (65-col parity)' : 'Degraded'}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-[14px] bg-[var(--dt-card)] border border-[var(--dt-border)] space-y-1.5">
              <div className="flex items-center gap-2 text-[12px] font-semibold">
                <Clock className="w-3.5 h-3.5 text-[var(--dt-primary)]" />
                <span>Backend Uptime</span>
              </div>
              <div className="font-mono text-[11px] text-[var(--dt-foreground)]">
                {formatUptime(status?.uptime)}
              </div>
            </div>
          </div>

          {/* Card 4: Rolling Telemetry History */}
          {history.length > 0 && (
            <div className="p-3.5 rounded-[14px] bg-[var(--dt-card)] border border-[var(--dt-border)] space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--dt-muted-foreground)] uppercase font-mono tracking-wider">
                <span>Recent Probe History</span>
                <span>{history.length} samples</span>
              </div>
              <div className="divide-y divide-[var(--dt-border)] max-h-32 overflow-y-auto font-mono text-[10.5px]">
                {history.slice(-5).reverse().map((rec, i) => (
                  <div key={i} className="py-1 flex items-center justify-between">
                    <span className="text-[var(--dt-muted-foreground)]">
                      {new Date(rec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                    <div className="flex items-center gap-3">
                      <span>CPU: {rec.cpu}%</span>
                      <span>Mem: {rec.mem}%</span>
                      <span className="text-[var(--dt-primary)]">{rec.latency}ms</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 bg-[var(--dt-card)] border-t border-[var(--dt-border)] flex items-center justify-between text-[11px] font-mono text-[var(--dt-muted-foreground)]">
          <span>Polling interval: 4.0s</span>
          <button
            onClick={toggleDiagnostics}
            className="px-3 py-1 rounded-[6px] bg-[var(--dt-primary)] text-white hover:bg-[var(--dt-primary-hover)] transition-colors cursor-pointer font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
