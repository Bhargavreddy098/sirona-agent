import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  $systemStatus,
  $pingLatencyMs,
  $diagnosticsOpen,
  $telemetryHistory,
  getMetricTier,
  toggleDiagnostics,
  fetchTelemetry,
  pingGatewayNow,
} from '../store/telemetryStore'
import {
  $connectionState,
  $reconnectAttempts,
  setConnectionState,
  incrementReconnectAttempts,
  resetReconnectAttempts,
  recordHeartbeatSuccess,
  $latencyMs,
} from '../store/connectionStore'
import { api } from '../api/client'

describe('telemetryStore & Diagnostics System', () => {
  beforeEach(() => {
    $systemStatus.set(null)
    $pingLatencyMs.set(null)
    $diagnosticsOpen.set(false)
    $telemetryHistory.set([])
    setConnectionState('idle')
    resetReconnectAttempts()
    vi.restoreAllMocks()
  })

  it('classifies metric load thresholds into correct tiers', () => {
    expect(getMetricTier(25)).toBe('normal')
    expect(getMetricTier(59)).toBe('normal')
    expect(getMetricTier(60)).toBe('warning')
    expect(getMetricTier(84)).toBe('warning')
    expect(getMetricTier(85)).toBe('critical')
    expect(getMetricTier(99)).toBe('critical')
  })

  it('toggles diagnostics popover state', () => {
    expect($diagnosticsOpen.get()).toBe(false)
    toggleDiagnostics()
    expect($diagnosticsOpen.get()).toBe(true)
    toggleDiagnostics()
    expect($diagnosticsOpen.get()).toBe(false)
  })

  it('fetches system telemetry and updates rolling history', async () => {
    vi.spyOn(api, 'getStatus').mockResolvedValueOnce({
      status: 'ok',
      cpu_pct: 32.5,
      mem_pct: 45.0,
      mem_available_mb: 8192,
      gateway: 'ready',
      db: true,
      pid: 12345,
      threads: 8,
      active_runs: 1,
      uptime: 120.5,
    })

    const result = await fetchTelemetry()
    expect(result).not.toBeNull()
    expect($systemStatus.get()?.cpu_pct).toBe(32.5)
    expect($systemStatus.get()?.db).toBe(true)
    expect($systemStatus.get()?.pid).toBe(12345)
    expect($pingLatencyMs.get()).toBeGreaterThanOrEqual(0)

    const history = $telemetryHistory.get()
    expect(history.length).toBe(1)
    expect(history[0].cpu).toBe(32.5)
    expect(history[0].mem).toBe(45.0)
  })

  it('probes roundtrip ping latency directly', async () => {
    vi.spyOn(api, 'getStatus').mockResolvedValueOnce({
      cpu_pct: 10,
      mem_pct: 20,
      mem_available_mb: 4096,
      gateway: 'ready',
      active_runs: 0,
    })

    const latency = await pingGatewayNow()
    expect(latency).toBeTypeOf('number')
    expect(latency).toBeGreaterThanOrEqual(0)
    expect($pingLatencyMs.get()).toBe(latency)
  })

  it('manages connection state transitions and reconnect attempts', () => {
    setConnectionState('connecting')
    expect($connectionState.get()).toBe('connecting')

    setConnectionState('open')
    expect($connectionState.get()).toBe('open')

    recordHeartbeatSuccess(15)
    expect($latencyMs.get()).toBe(15)

    const attempt1 = incrementReconnectAttempts()
    expect(attempt1).toBe(1)
    expect($reconnectAttempts.get()).toBe(1)

    const attempt2 = incrementReconnectAttempts()
    expect(attempt2).toBe(2)

    resetReconnectAttempts()
    expect($reconnectAttempts.get()).toBe(0)
  })
})
