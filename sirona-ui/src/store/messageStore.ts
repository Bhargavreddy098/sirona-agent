import { atom } from 'nanostores'
import { api, type MessageRecord } from '../api/client'
import { gateway } from '../api/gateway'

export interface StreamingToolCall {
  toolCallId: string
  toolName: string
  args?: Record<string, any>
  startedAt: number
  durationMs?: number
  result?: string
  status: 'running' | 'completed' | 'denied' | 'error'
}

export interface StreamingState {
  isStreaming: boolean
  turnId: string | null
  sessionId: string | null
  currentTokens: string
  currentReasoning: string
  isReasoningStreaming: boolean
  activeToolName: string | null
  activeToolArgs: any | null
  activeTool: StreamingToolCall | null
  completedTools: StreamingToolCall[]
  startedAt: number | null
  error?: string | null
}

const initialStreamingState: StreamingState = {
  isStreaming: false,
  turnId: null,
  sessionId: null,
  currentTokens: '',
  currentReasoning: '',
  isReasoningStreaming: false,
  activeToolName: null,
  activeToolArgs: null,
  activeTool: null,
  completedTools: [],
  startedAt: null,
  error: null,
}

export const $messages = atom<MessageRecord[]>([])
export const $composerDraft = atom<string>('')
export const $streamingState = atom<StreamingState>(initialStreamingState)

export async function loadMessages(sessionId: string): Promise<void> {
  try {
    const res = await api.getMessages(sessionId)
    $messages.set(res.messages)
  } catch (err) {
    console.error('Failed to load messages', err)
    $messages.set([])
  }
}

export function appendUserMessage(sessionId: string, content: string): MessageRecord {
  const msg: MessageRecord = {
    id: Date.now(),
    session_id: sessionId,
    role: 'user',
    content,
    timestamp: Date.now() / 1000,
  }
  $messages.set([...$messages.get(), msg])
  return msg
}

export function appendAssistantMessage(
  sessionId: string,
  content: string,
  reasoning?: string,
  interrupted?: boolean
): MessageRecord {
  const msg: MessageRecord = {
    id: Date.now(),
    session_id: sessionId,
    role: 'assistant',
    content,
    reasoning,
    interrupted,
    timestamp: Date.now() / 1000,
  }
  $messages.set([...$messages.get(), msg])
  return msg
}

export function appendToolMessage(
  sessionId: string,
  toolName: string,
  toolCallId: string,
  result: string,
  args?: Record<string, any>,
  durationMs?: number
): MessageRecord {
  const msg: MessageRecord = {
    id: Date.now(),
    session_id: sessionId,
    role: 'tool',
    content: result,
    tool_name: toolName,
    tool_call_id: toolCallId,
    tool_args: args,
    duration_ms: durationMs,
    timestamp: Date.now() / 1000,
  }
  $messages.set([...$messages.get(), msg])
  return msg
}

// ---------------------------------------------------------------------------
// Streaming State Mutations
// ---------------------------------------------------------------------------

export function resetStreamingState(): void {
  $streamingState.set({ ...initialStreamingState })
}

export function startStreaming(sessionId: string, turnId?: string): void {
  $streamingState.set({
    ...initialStreamingState,
    isStreaming: true,
    sessionId,
    turnId: turnId || null,
    startedAt: Date.now(),
  })
}

export function appendStreamToken(token: string): void {
  const current = $streamingState.get()
  $streamingState.set({
    ...current,
    isStreaming: true,
    isReasoningStreaming: false,
    currentTokens: current.currentTokens + token,
  })
}

export function appendReasoningToken(delta: string): void {
  const current = $streamingState.get()
  $streamingState.set({
    ...current,
    isStreaming: true,
    isReasoningStreaming: true,
    currentReasoning: current.currentReasoning + delta,
  })
}

export function startToolExecution(callId: string, toolName: string, args?: Record<string, any>): void {
  const current = $streamingState.get()
  const toolCall: StreamingToolCall = {
    toolCallId: callId,
    toolName,
    args,
    startedAt: Date.now(),
    status: 'running',
  }
  $streamingState.set({
    ...current,
    isStreaming: true,
    activeToolName: toolName,
    activeToolArgs: args,
    activeTool: toolCall,
  })
}

export function completeToolExecution(
  callId: string,
  result: string,
  durationMs?: number,
  approved = true
): void {
  const current = $streamingState.get()
  const active = current.activeTool
  const completed: StreamingToolCall = {
    toolCallId: callId,
    toolName: active?.toolCallId === callId ? active.toolName : (current.activeToolName || 'tool'),
    args: active?.toolCallId === callId ? active.args : current.activeToolArgs,
    startedAt: active?.startedAt || Date.now() - (durationMs || 0),
    durationMs: durationMs ?? (active ? Date.now() - active.startedAt : undefined),
    result,
    status: approved ? 'completed' : 'denied',
  }

  $streamingState.set({
    ...current,
    activeToolName: null,
    activeToolArgs: null,
    activeTool: null,
    completedTools: [...current.completedTools, completed],
  })

  // Save to message transcript if session is known
  if (current.sessionId) {
    appendToolMessage(
      current.sessionId,
      completed.toolName,
      completed.toolCallId,
      result,
      completed.args,
      completed.durationMs
    )
  }
}

export function finishStreaming(content?: string): void {
  const current = $streamingState.get()
  if (!current.isStreaming) return

  const finalContent = content ?? current.currentTokens
  if (current.sessionId && (finalContent || current.currentReasoning)) {
    appendAssistantMessage(
      current.sessionId,
      finalContent,
      current.currentReasoning || undefined,
      false
    )
  }
  resetStreamingState()
}

export function interruptStreaming(): void {
  const current = $streamingState.get()
  if (!current.isStreaming) return

  const finalContent = current.currentTokens
    ? `${current.currentTokens}\n\n*[Turn interrupted by user]*`
    : '*[Turn interrupted by user]*'

  if (current.sessionId) {
    appendAssistantMessage(
      current.sessionId,
      finalContent,
      current.currentReasoning || undefined,
      true
    )
  }
  resetStreamingState()
}

// ---------------------------------------------------------------------------
// Stream Event Dispatcher & Listener Wire
// ---------------------------------------------------------------------------

export function handleStreamEvent(event: any): void {
  if (!event || typeof event !== 'object') return

  // Normalize event structure (JSON-RPC params vs flat)
  const type = String(event.type || event.event || (event.params && event.params.type) || '')
  const p = event.params && typeof event.params === 'object' && event.params.type ? event.params : event

  switch (type) {
    case 'message.start':
      startStreaming(p.session_id || '', p.turn_id)
      break

    case 'stream.token':
    case 'message.delta':
    case 'text.delta': {
      const token = p.delta ?? p.token ?? p.content ?? ''
      if (token) appendStreamToken(token)
      break
    }

    case 'stream.reasoning':
    case 'reasoning.delta':
    case 'thinking.delta': {
      const reasoning = p.delta ?? p.token ?? p.content ?? ''
      if (reasoning) appendReasoningToken(reasoning)
      break
    }

    case 'tool.start':
    case 'tool_start':
      startToolExecution(
        p.tool_call_id || p.call_id || `call_${Date.now()}`,
        p.tool_name || p.tool || 'tool',
        p.args || p.tool_args
      )
      break

    case 'tool.complete':
    case 'tool_complete':
      completeToolExecution(
        p.tool_call_id || p.call_id || '',
        String(p.result ?? ''),
        p.duration_ms,
        p.approved !== false
      )
      break

    case 'message.complete':
    case 'message_complete':
    case 'turn.complete':
      finishStreaming(p.content ?? p.response)
      break

    case 'turn.interrupted':
      interruptStreaming()
      break

    case 'turn.error': {
      const current = $streamingState.get()
      if (current.sessionId) {
        appendAssistantMessage(
          current.sessionId,
          `*[Error during execution: ${p.error || 'Unknown error'}]*`,
          current.currentReasoning || undefined,
          true
        )
      }
      resetStreamingState()
      break
    }
  }
}

// Register global stream event routing on gateway
gateway.onAny(handleStreamEvent)
