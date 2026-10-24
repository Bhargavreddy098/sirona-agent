import { atom } from 'nanostores'

export type GatewayConnectionState = 'idle' | 'connecting' | 'open' | 'closed' | 'reconnecting' | 'error'

export const $connectionState = atom<GatewayConnectionState>('idle')
export const $gatewayUrl = atom<string>('')
export const $reconnectAttempts = atom<number>(0)
export const $lastHeartbeat = atom<number | null>(null)
export const $latencyMs = atom<number | null>(null)

export function setConnectionState(state: GatewayConnectionState): void {
  $connectionState.set(state)
}

export function recordHeartbeatSuccess(latency?: number): void {
  $lastHeartbeat.set(Date.now())
  if (typeof latency === 'number') {
    $latencyMs.set(latency)
  }
}

export function incrementReconnectAttempts(): number {
  const next = $reconnectAttempts.get() + 1
  $reconnectAttempts.set(next)
  return next
}

export function resetReconnectAttempts(): void {
  $reconnectAttempts.set(0)
}
