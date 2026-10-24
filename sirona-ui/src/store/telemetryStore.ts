import { atom } from 'nanostores'
import { api, type SystemStatus } from '../api/client'
import { gateway } from '../api/gateway'

export type MetricTier = 'normal' | 'warning' | 'critical'

export const $systemStatus = atom<SystemStatus | null>(null)
export const $telemetryLoading = atom<boolean>(false)
export const $pingLatencyMs = atom<number | null>(null)
export const $isOnline = atom<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true)
export const $diagnosticsOpen = atom<boolean>(false)
export const $telemetryHistory = atom<Array<{ timestamp: number; cpu: number; mem: number; latency: number }>>([])

let pollingTimer: ReturnType<typeof setInterval> | null = null

export function getMetricTier(pct: number): MetricTier {
  if (pct >= 85) return 'critical'
  if (pct >= 60) return 'warning'
  return 'normal'
}

export function toggleDiagnostics(): void {
  $diagnosticsOpen.set(!$diagnosticsOpen.get())
}

export async function fetchTelemetry(): Promise<SystemStatus | null> {
  const start = performance.now()
  $telemetryLoading.set(true)
  try {
    const status = await api.getStatus()
    const latency = Math.round(performance.now() - start)
    $systemStatus.set(status)
    $pingLatencyMs.set(latency)

    // Append to rolling history (max 30 records)
    const history = $telemetryHistory.get()
    const updated = [
      ...history.slice(-29),
      {
        timestamp: Date.now(),
        cpu: status.cpu_pct,
        mem: status.mem_pct,
        latency,
      },
    ]
    $telemetryHistory.set(updated)

    return status
  } catch (err) {
    // If request fails, record latency as null
    $pingLatencyMs.set(null)
    return null
  } finally {
    $telemetryLoading.set(false)
  }
}

export async function pingGatewayNow(): Promise<number | null> {
  const start = performance.now()
  try {
    await api.getStatus()
    const latency = Math.round(performance.now() - start)
    $pingLatencyMs.set(latency)
    return latency
  } catch {
    $pingLatencyMs.set(null)
    return null
  }
}

export function startTelemetryPolling(intervalMs = 4000): () => void {
  if (pollingTimer) clearInterval(pollingTimer)

  fetchTelemetry()
  pollingTimer = setInterval(() => {
    fetchTelemetry()
  }, intervalMs)

  // Listen to browser network changes
  if (typeof window !== 'undefined') {
    const handleOnline = () => {
      $isOnline.set(true)
      gateway.connect()
      fetchTelemetry()
    }
    const handleOffline = () => {
      $isOnline.set(false)
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
  }

  return () => {
    if (pollingTimer) {
      clearInterval(pollingTimer)
      pollingTimer = null
    }
  }
}

export function stopTelemetryPolling(): void {
  if (pollingTimer) {
    clearInterval(pollingTimer)
    pollingTimer = null
  }
}
