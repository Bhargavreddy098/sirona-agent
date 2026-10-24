import {
  JsonRpcGatewayClient,
  type GatewayEvent,
  type GatewayEventName,
  type ServerRequest,
  type ServerRequestHandler,
  reconnectBackoffDelayMs,
  isStableOpen,
  RECONNECT_STABLE_OPEN_MS,
  APPROVAL_RESPOND_TIMEOUT_MS,
  isGatewayWebSocketUrl,
} from '@sirona/shared'
import {
  $connectionState,
  $gatewayUrl,
  setConnectionState,
  recordHeartbeatSuccess,
  incrementReconnectAttempts,
  resetReconnectAttempts,
} from '../store/connectionStore'
import { pushApproval } from '../store/approvalStore'

export function getGatewayWsUrl(): string {
  if (typeof window !== 'undefined' && window.location.protocol.startsWith('http') && window.location.host) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${window.location.host}/ws/gateway`
  }
  return 'ws://127.0.0.1:8000/ws/gateway'
}

export interface PromptSubmitOptions {
  reasoning_effort?: string
  model?: string
  stream?: boolean
  cwd?: string
}

export class SironaGatewayClient {
  private client: JsonRpcGatewayClient | null = null
  private url: string
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private stabilityTimer: ReturnType<typeof setTimeout> | null = null
  private openedAt: number | null = null
  private explicitClose = false
  private customHandlers = new Map<string, Set<(payload: any) => void>>()

  constructor(url?: string) {
    this.url = url || getGatewayWsUrl()
    $gatewayUrl.set(this.url)
  }

  get state() {
    return $connectionState.get()
  }

  get isConnected(): boolean {
    return this.client?.connectionState === 'open'
  }

  async connect(customUrl?: string): Promise<void> {
    if (customUrl) {
      this.url = customUrl
      $gatewayUrl.set(this.url)
    }

    if (!isGatewayWebSocketUrl(this.url)) {
      setConnectionState('error')
      console.warn(`[Sirona Gateway] Invalid WebSocket URL: ${this.url}`)
      return
    }

    if (this.client && (this.client.connectionState === 'open' || this.client.connectionState === 'connecting')) {
      return
    }

    this.explicitClose = false
    this.clearTimers()
    setConnectionState('connecting')

    try {
      this.client = new JsonRpcGatewayClient({
        connectTimeoutMs: 10_000,
        requestTimeoutMs: 60_000,
        notConnectedErrorMessage: 'Sirona gateway is not connected',
        onSocketClose: () => {
          this.handleSocketClose()
        },
      })

      // Wire state synchronization
      this.client.onState((state) => {
        if (state === 'open') {
          this.openedAt = Date.now()
          setConnectionState('open')
          recordHeartbeatSuccess()

          // Reset reconnect attempts after staying stable for RECONNECT_STABLE_OPEN_MS
          this.stabilityTimer = setTimeout(() => {
            if (isStableOpen(this.openedAt)) {
              resetReconnectAttempts()
            }
          }, RECONNECT_STABLE_OPEN_MS)
        } else if (state === 'error' && !this.explicitClose) {
          setConnectionState('error')
          this.scheduleReconnect()
        }
      })

      // Wire server request handlers (approvals, clarifications)
      this.client.onRequest((request: ServerRequest) => {
        return this.handleServerRequest(request)
      })

      // Listen to gateway events for heartbeat and approvals
      this.client.onAny((event: GatewayEvent) => {
        const eventType = String(event.type)
        this.dispatchCustom(eventType, event)
        if (eventType === 'heartbeat' || eventType === 'rpc.heartbeat') {
          recordHeartbeatSuccess()
        }
        if (eventType === 'approval_request' || eventType === 'approval.request') {
          const p = (event as any).payload || event
          pushApproval({
            prompt_id: p.prompt_id || p.request_id || String(Date.now()),
            session_id: event.session_id || '',
            tool_name: p.tool_name || p.tool || 'Unknown Tool',
            tool_args: p.args || p.tool_args || {},
            danger_level: p.danger_level || 'destructive',
            diff: p.diff,
            created_at: Date.now(),
          })
        }
      })

      await this.client.connect(this.url)
    } catch (err) {
      if (!this.explicitClose) {
        setConnectionState('error')
        this.scheduleReconnect()
      }
    }
  }

  private handleServerRequest(request: ServerRequest): boolean {
    if (request.method === 'approval.request' || request.method === 'approval') {
      const p = request.params as Record<string, any>
      pushApproval({
        prompt_id: request.id,
        session_id: p.session_id || '',
        tool_name: p.tool_name || p.tool || 'Unknown Tool',
        tool_args: p.args || p.tool_args || {},
        danger_level: p.danger_level || 'destructive',
        diff: p.diff,
        created_at: Date.now(),
      })
      return true
    }

    if (request.method === 'clarify.request' || request.method === 'clarify') {
      this.dispatchCustom('clarify_request', request.params)
      return true
    }

    return false
  }

  private handleSocketClose(): void {
    this.openedAt = null
    if (this.stabilityTimer) {
      clearTimeout(this.stabilityTimer)
      this.stabilityTimer = null
    }

    if (this.explicitClose) {
      setConnectionState('closed')
    } else {
      setConnectionState('reconnecting')
      this.scheduleReconnect()
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.explicitClose) return

    const attempt = incrementReconnectAttempts()
    const delay = Math.round(reconnectBackoffDelayMs(attempt - 1, { jitter: true, capMs: 15_000 }))

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, delay)
  }

  disconnect(): void {
    this.explicitClose = true
    this.clearTimers()
    this.openedAt = null
    if (this.client) {
      this.client.close()
      this.client = null
    }
    setConnectionState('closed')
  }

  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.stabilityTimer) {
      clearTimeout(this.stabilityTimer)
      this.stabilityTimer = null
    }
  }

  // Raw RPC Request
  async request<T = any>(
    method: string,
    params: Record<string, unknown> = {},
    options: { timeoutMs?: number; signal?: AbortSignal } = {}
  ): Promise<T> {
    if (!this.client || this.client.connectionState !== 'open') {
      throw new Error('Sirona gateway is not connected')
    }
    return this.client.request<T>(method, params, options.timeoutMs, options.signal)
  }

  // Alias for backward compatibility
  call<T = any>(method: string, params: Record<string, any> = {}): Promise<T> {
    return this.request<T>(method, params)
  }

  // Canonical High-level Methods
  async submitPrompt(sessionId: string, prompt: string, options: PromptSubmitOptions = {}): Promise<any> {
    return this.request(
      'prompt.submit',
      {
        session_id: sessionId,
        prompt,
        reasoning_effort: options.reasoning_effort || 'medium',
        model: options.model,
        cwd: options.cwd,
      },
      { timeoutMs: 1_800_000 }
    )
  }

  async interruptSession(sessionId: string): Promise<any> {
    return this.request('session.interrupt', { session_id: sessionId })
  }

  async respondApproval(sessionId: string, requestId: string, choice: 'once' | 'always' | 'deny'): Promise<any> {
    return this.request(
      'approval.respond',
      {
        session_id: sessionId,
        request_id: requestId,
        choice,
      },
      { timeoutMs: APPROVAL_RESPOND_TIMEOUT_MS }
    )
  }

  async respondClarify(sessionId: string, requestId: string, answer: string): Promise<any> {
    return this.request('clarify.respond', {
      session_id: sessionId,
      request_id: requestId,
      answer,
    })
  }

  async listSessions(options: { pinned?: boolean; archived?: boolean } = {}): Promise<any> {
    return this.request('session.list', options)
  }

  async createSession(options: { title?: string; model?: string; cwd?: string } = {}): Promise<any> {
    return this.request('session.create', options)
  }

  async resumeSession(sessionId: string): Promise<any> {
    return this.request('session.resume', { session_id: sessionId })
  }

  // Event dispatching & subscription
  on<K extends GatewayEventName>(type: K, handler: (event: GatewayEvent<K>) => void): () => void
  on(type: string, handler: (payload: any) => void): () => void
  on(type: string, handler: (payload: any) => void): () => void {
    if (!this.customHandlers.has(type)) {
      this.customHandlers.set(type, new Set())
    }
    this.customHandlers.get(type)!.add(handler)

    // Also register on underlying client if it exists
    const clientOff = this.client?.on(type as any, handler)

    return () => {
      this.customHandlers.get(type)?.delete(handler)
      clientOff?.()
    }
  }

  onAny(handler: (event: GatewayEvent) => void): () => void {
    return this.on('*', handler)
  }

  onRequest(handler: ServerRequestHandler): () => void {
    if (!this.client) {
      return () => {}
    }
    return this.client.onRequest(handler)
  }

  private dispatchCustom(type: string, payload: any): void {
    this.customHandlers.get(type)?.forEach((h) => h(payload))
    this.customHandlers.get('*')?.forEach((h) => h(payload))
  }
}

export const gateway = new SironaGatewayClient()
