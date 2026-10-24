type EventHandler = (payload: any) => void

export function getGatewayWsUrl(): string {
  if (typeof window !== 'undefined' && window.location.protocol.startsWith('http') && window.location.host) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${window.location.host}/ws/gateway`
  }
  return 'ws://127.0.0.1:8000/ws/gateway'
}

export class SironaGatewayClient {
  private ws: WebSocket | null = null
  private reqId = 1
  private pendingRequests = new Map<number, { resolve: (val: any) => void; reject: (err: any) => void }>()
  private eventHandlers = new Map<string, Set<EventHandler>>()
  private reconnectTimer: any = null
  private url: string

  constructor(url?: string) {
    this.url = url || getGatewayWsUrl()
  }

  connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return
    }

    try {
      this.ws = new WebSocket(this.url)

      this.ws.onopen = () => {
        this.emit('connected', { timestamp: Date.now() })
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer)
          this.reconnectTimer = null
        }
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.id && this.pendingRequests.has(data.id)) {
            const { resolve, reject } = this.pendingRequests.get(data.id)!
            this.pendingRequests.delete(data.id)
            if (data.error) reject(new Error(data.error.message || 'RPC Error'))
            else resolve(data.result)
          } else if (data.type) {
            this.emit(data.type, data)
          }
        } catch (e) {
          console.error('Failed to parse gateway message', e)
        }
      }

      this.ws.onclose = () => {
        this.emit('disconnected', { timestamp: Date.now() })
        this.scheduleReconnect()
      }

      this.ws.onerror = (err) => {
        console.error('Gateway WS error', err)
        this.ws?.close()
      }
    } catch (err) {
      this.scheduleReconnect()
    }
  }

  private scheduleReconnect(): void {
    if (!this.reconnectTimer) {
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null
        this.connect()
      }, 2500)
    }
  }

  call<T = any>(method: string, params: Record<string, any> = {}): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        return reject(new Error('Gateway is not connected'))
      }
      const id = this.reqId++
      this.pendingRequests.set(id, { resolve, reject })
      this.ws.send(JSON.stringify({ jsonrpc: '2.0', id, method, params }))
    })
  }

  on(event: string, handler: EventHandler): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set())
    }
    this.eventHandlers.get(event)!.add(handler)
    return () => this.eventHandlers.get(event)?.delete(handler)
  }

  private emit(event: string, payload: any): void {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      handlers.forEach((h) => h(payload))
    }
  }
}

export const gateway = new SironaGatewayClient()
