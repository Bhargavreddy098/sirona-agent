import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  JsonRpcRequestChannel,
  GatewayEventHub,
  reconnectBackoffDelayMs,
  isStableOpen,
  RECONNECT_STABLE_OPEN_MS,
  DEFAULT_HEARTBEAT_INTERVAL_MS,
  DEFAULT_HEARTBEAT_DEADLINE_MS,
  isGatewayWebSocketUrl,
  type JsonRpcTransport,
  type ServerRequest,
} from '@sirona/shared'

describe('Stage 2: Gateway Wire, JSON-RPC Protocol & Reconnect Engine', () => {
  describe('WebSocket URL Validation', () => {
    it('accepts valid ws and wss endpoints', () => {
      expect(isGatewayWebSocketUrl('ws://127.0.0.1:8000/ws/gateway')).toBe(true)
      expect(isGatewayWebSocketUrl('wss://gateway.sirona.internal/ws')).toBe(true)
      expect(isGatewayWebSocketUrl('ws://localhost:3000')).toBe(true)
    })

    it('rejects non-websocket schemes and malformed strings', () => {
      expect(isGatewayWebSocketUrl('http://127.0.0.1:8000')).toBe(false)
      expect(isGatewayWebSocketUrl('https://sirona.ai')).toBe(false)
      expect(isGatewayWebSocketUrl('ftp://localhost')).toBe(false)
      expect(isGatewayWebSocketUrl('not-a-url')).toBe(false)
      expect(isGatewayWebSocketUrl(null)).toBe(false)
      expect(isGatewayWebSocketUrl(12345)).toBe(false)
    })
  })

  describe('JSON-RPC Request-Response Channel', () => {
    let sentMessages: string[] = []
    let transport: JsonRpcTransport
    let channel: JsonRpcRequestChannel

    beforeEach(() => {
      sentMessages = []
      transport = {
        send: (text: string) => {
          sentMessages.push(text)
        },
      }
      channel = new JsonRpcRequestChannel({
        requestTimeoutMs: 2000,
        createRequestId: (id) => `req_${id}`,
      })
      channel.attach(transport)
    })

    it('formats outbound requests with JSON-RPC 2.0 structure', async () => {
      const requestPromise = channel.request('session.list', { pinned: true })

      expect(sentMessages.length).toBe(1)
      const frame = JSON.parse(sentMessages[0])
      expect(frame.jsonrpc).toBe('2.0')
      expect(frame.id).toBe('req_1')
      expect(frame.method).toBe('session.list')
      expect(frame.params).toEqual({ pinned: true })

      // Simulate matching backend response
      channel.handleFrame(
        JSON.stringify({
          jsonrpc: '2.0',
          id: 'req_1',
          result: { sessions: [{ id: 'sess_1', title: 'Main' }] },
        })
      )

      const result = await requestPromise
      expect(result).toEqual({ sessions: [{ id: 'sess_1', title: 'Main' }] })
    })

    it('rejects pending request on JSON-RPC error response', async () => {
      const requestPromise = channel.request('prompt.submit', { prompt: 'hello' })

      const frame = JSON.parse(sentMessages[0])
      channel.handleFrame(
        JSON.stringify({
          jsonrpc: '2.0',
          id: frame.id,
          error: {
            code: -32600,
            message: 'Session is paused or invalid',
          },
        })
      )

      await expect(requestPromise).rejects.toThrow('Session is paused or invalid')
    })

    it('times out requests when no response arrives within deadline', async () => {
      vi.useFakeTimers()
      const requestPromise = channel.request('slow.method', {}, 500)

      vi.advanceTimersByTime(550)
      await expect(requestPromise).rejects.toThrow()
      vi.useRealTimers()
    })
  })

  describe('Server-Initiated Requests (Bidirectional RPC)', () => {
    let sentMessages: string[] = []
    let transport: JsonRpcTransport
    let channel: JsonRpcRequestChannel

    beforeEach(() => {
      sentMessages = []
      transport = {
        send: (text: string) => {
          sentMessages.push(text)
        },
      }
      channel = new JsonRpcRequestChannel()
      channel.attach(transport)
    })

    it('dispatches inbound server request and routes response back', () => {
      let receivedRequest: ServerRequest | null = null

      channel.onRequest((req) => {
        receivedRequest = req
      })

      // Backend sends approval.request to frontend
      channel.handleFrame(
        JSON.stringify({
          jsonrpc: '2.0',
          id: 'server_req_42',
          method: 'approval.request',
          params: {
            session_id: 'sess_abc',
            tool_name: 'execute_command',
            args: { command: 'npm install' },
          },
        })
      )

      expect(receivedRequest).not.toBeNull()
      const req = receivedRequest as unknown as ServerRequest
      expect(req.id).toBe('server_req_42')
      expect(req.method).toBe('approval.request')
      expect(req.params.session_id).toBe('sess_abc')

      // Frontend user accepts
      req.respond({ choice: 'always' })

      expect(sentMessages.length).toBe(1)
      const responseFrame = JSON.parse(sentMessages[0])
      expect(responseFrame.jsonrpc).toBe('2.0')
      expect(responseFrame.id).toBe('server_req_42')
      expect(responseFrame.result).toEqual({ choice: 'always' })
    })

    it('answers with JSON-RPC error when request handler fails the request', () => {
      channel.onRequest((req) => {
        req.fail(-32000, 'User denied approval')
      })

      channel.handleFrame(
        JSON.stringify({
          jsonrpc: '2.0',
          id: 'server_req_99',
          method: 'approval.request',
          params: { session_id: 's1' },
        })
      )

      expect(sentMessages.length).toBe(1)
      const responseFrame = JSON.parse(sentMessages[0])
      expect(responseFrame.jsonrpc).toBe('2.0')
      expect(responseFrame.id).toBe('server_req_99')
      expect(responseFrame.error).toEqual({
        code: -32000,
        message: 'User denied approval',
      })
    })
  })

  describe('Reconnect Backoff Engine & Stability Watchdog', () => {
    it('calculates deterministic ceiling ladder when jitter is disabled', () => {
      const base = 300
      const cap = 15000

      // attempt 0: 300 * 2^0 = 300
      expect(reconnectBackoffDelayMs(0, { baseDelayMs: base, capMs: cap, jitter: false })).toBe(300)
      // attempt 1: 300 * 2^1 = 600
      expect(reconnectBackoffDelayMs(1, { baseDelayMs: base, capMs: cap, jitter: false })).toBe(600)
      // attempt 2: 300 * 2^2 = 1200
      expect(reconnectBackoffDelayMs(2, { baseDelayMs: base, capMs: cap, jitter: false })).toBe(1200)
      // attempt 3: 300 * 2^3 = 2400
      expect(reconnectBackoffDelayMs(3, { baseDelayMs: base, capMs: cap, jitter: false })).toBe(2400)
      // attempt 6: 300 * 2^6 = 19200 -> capped at 15000
      expect(reconnectBackoffDelayMs(6, { baseDelayMs: base, capMs: cap, jitter: false })).toBe(15000)
    })

    it('produces jittered delays bounded within [0, ceiling]', () => {
      for (let attempt = 0; attempt < 5; attempt++) {
        const delay = reconnectBackoffDelayMs(attempt, { baseDelayMs: 300, capMs: 5000, jitter: true })
        const ceiling = Math.min(5000, 300 * Math.pow(2, attempt))
        expect(delay).toBeGreaterThanOrEqual(0)
        expect(delay).toBeLessThanOrEqual(ceiling)
      }
    })

    it('verifies stable open threshold correctly', () => {
      const now = 100000

      // Opened 2 seconds ago (less than RECONNECT_STABLE_OPEN_MS = 5000) -> not stable
      expect(isStableOpen(now - 2000, now)).toBe(false)

      // Opened 5 seconds ago -> stable
      expect(isStableOpen(now - RECONNECT_STABLE_OPEN_MS, now)).toBe(true)

      // Opened 10 seconds ago -> stable
      expect(isStableOpen(now - 10000, now)).toBe(true)

      // Null openedAt -> not stable
      expect(isStableOpen(null, now)).toBe(false)
    })
  })

  describe('Heartbeat & Liveness Constants', () => {
    it('verifies canonical Hermes heartbeat intervals', () => {
      expect(DEFAULT_HEARTBEAT_INTERVAL_MS).toBe(15_000)
      expect(DEFAULT_HEARTBEAT_DEADLINE_MS).toBe(45_000)
      expect(RECONNECT_STABLE_OPEN_MS).toBe(5_000)
    })
  })

  describe('Gateway Event Hub Multi-Subscription', () => {
    let hub: GatewayEventHub

    beforeEach(() => {
      hub = new GatewayEventHub()
    })

    it('dispatches typed events to registered listeners', () => {
      const deltas: string[] = []
      const unsub = hub.on('message.delta', (event) => {
        deltas.push((event as any).delta || '')
      })

      hub.dispatch({ type: 'message.delta', delta: 'Hello' } as any)
      hub.dispatch({ type: 'message.delta', delta: ' world' } as any)

      expect(deltas).toEqual(['Hello', ' world'])

      unsub()
      hub.dispatch({ type: 'message.delta', delta: '!' } as any)
      expect(deltas).toEqual(['Hello', ' world'])
    })

    it('dispatches all events to wildcard onAny listeners', () => {
      const capturedTypes: string[] = []
      hub.onAny((event) => {
        capturedTypes.push(event.type)
      })

      hub.dispatch({ type: 'stream.token', token: 'a' } as any)
      hub.dispatch({ type: 'tool_start', tool_name: 'read_file' } as any)
      hub.dispatch({ type: 'turn.complete', response: 'done' } as any)

      expect(capturedTypes).toEqual(['stream.token', 'tool_start', 'turn.complete'])
    })
  })
})
